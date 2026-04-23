// ──────────────────────────────────────────
// Gastos · Lista — VERSIÓN FUNCIONAL conectada a Supabase
// Reemplaza GastosList mock al cargarse después.
// ──────────────────────────────────────────

// ─── Helpers de fecha ───
const pad2 = n => String(n).padStart(2,'0');
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
};
const primerDiaMes = (year, month) => `${year}-${pad2(month+1)}-01`;
const ultimoDiaMes = (year, month) => {
  const d = new Date(year, month+1, 0);
  return `${year}-${pad2(month+1)}-${pad2(d.getDate())}`;
};

// Rango de periodo preset → {desde, hasta}
const rangoPeriodo = (preset) => {
  const hoy = new Date();
  const y = hoy.getFullYear(), m = hoy.getMonth();
  switch(preset){
    case 'mes_actual':   return {desde: primerDiaMes(y,m), hasta: ultimoDiaMes(y,m)};
    case 'mes_anterior': {
      const d = new Date(y, m-1, 1);
      return {desde: primerDiaMes(d.getFullYear(),d.getMonth()), hasta: ultimoDiaMes(d.getFullYear(),d.getMonth())};
    }
    case 'ult_3m': {
      const d = new Date(y, m-2, 1);
      return {desde: primerDiaMes(d.getFullYear(),d.getMonth()), hasta: ultimoDiaMes(y,m)};
    }
    case 'ult_6m': {
      const d = new Date(y, m-5, 1);
      return {desde: primerDiaMes(d.getFullYear(),d.getMonth()), hasta: ultimoDiaMes(y,m)};
    }
    case 'anio': return {desde: `${y}-01-01`, hasta: `${y}-12-31`};
    case 'todo': return {desde: null, hasta: null};
    default:     return {desde: primerDiaMes(y,m), hasta: ultimoDiaMes(y,m)};
  }
};

const PERIODO_LABELS = {
  mes_actual: 'Mes actual',
  mes_anterior: 'Mes anterior',
  ult_3m: 'Últimos 3 meses',
  ult_6m: 'Últimos 6 meses',
  anio: 'Este año',
  todo: 'Todo',
};

// ─── Métricas del mes actual (desde la DB) ───
const useMetricasMes = () => {
  const [data, setData] = React.useState({totalMes:0, totalPrev:0, count:0, sinComp:0, topCat:null, loading:true});

  React.useEffect(()=>{
    (async () => {
      const hoy = new Date();
      const y = hoy.getFullYear(), m = hoy.getMonth();
      const prevM = new Date(y, m-1, 1);
      const rMes = {desde: primerDiaMes(y,m), hasta: ultimoDiaMes(y,m)};
      const rPrev= {desde: primerDiaMes(prevM.getFullYear(),prevM.getMonth()), hasta: ultimoDiaMes(prevM.getFullYear(),prevM.getMonth())};

      const [qMes, qPrev] = await Promise.all([
        sb.from('v_gastos').select('monto_mxn,comprobante_url,categoria,categoria_tone').gte('fecha',rMes.desde).lte('fecha',rMes.hasta),
        sb.from('v_gastos').select('monto_mxn').gte('fecha',rPrev.desde).lte('fecha',rPrev.hasta),
      ]);
      const rowsMes = qMes.data || [];
      const totalMes = rowsMes.reduce((a,b)=>a+Number(b.monto_mxn||0),0);
      const totalPrev= (qPrev.data||[]).reduce((a,b)=>a+Number(b.monto_mxn||0),0);
      const sinComp  = rowsMes.filter(r=>!r.comprobante_url).length;

      // Top categoría
      const porCat = {};
      rowsMes.forEach(r => {
        const k = r.categoria || '—';
        if (!porCat[k]) porCat[k] = {label:k, tone:r.categoria_tone, total:0};
        porCat[k].total += Number(r.monto_mxn||0);
      });
      const topCat = Object.values(porCat).sort((a,b)=>b.total-a.total)[0] || null;
      const topPct = topCat && totalMes>0 ? Math.round(topCat.total/totalMes*100) : 0;

      setData({totalMes, totalPrev, count:rowsMes.length, sinComp, topCat, topPct, loading:false});
    })();
  },[]);

  return data;
};

// ─── Pantalla principal ───
const GastosListFn = ({onRowClick, onNew}) => {
  const [gastos, setGastos]         = React.useState([]);
  const [loading, setLoading]       = React.useState(true);
  const [search, setSearch]         = React.useState('');
  const [periodo, setPeriodo]       = React.useState('ult_6m');
  const [catFiltro, setCatFiltro]   = React.useState('todas');
  const [cuentaFiltro, setCuentaF]  = React.useState('todas');
  const [cats, setCats]             = React.useState([]);
  const [cuentas, setCuentas]       = React.useState([]);

  const metricas = useMetricasMes();

  // Cargar filtros (cats y cuentas) una sola vez
  React.useEffect(()=>{
    (async () => {
      const [k,c] = await Promise.all([
        sb.from('categorias_gasto').select('id,label,tone').order('orden'),
        sb.from('cuentas').select('id,label').eq('activo',true).order('orden'),
      ]);
      setCats(k.data || []);
      setCuentas(c.data || []);
    })();
  },[]);

  // Cargar gastos según filtros
  const cargar = React.useCallback(async () => {
    setLoading(true);
    const {desde, hasta} = rangoPeriodo(periodo);
    let q = sb.from('v_gastos').select('*').order('fecha',{ascending:false}).order('creado',{ascending:false});
    if (desde) q = q.gte('fecha', desde);
    if (hasta) q = q.lte('fecha', hasta);
    if (catFiltro !== 'todas')    q = q.eq('categoria_id', catFiltro);
    if (cuentaFiltro !== 'todas') q = q.eq('cuenta_id', cuentaFiltro);

    const {data, error} = await q;
    if (error) notify('Error cargando gastos: '+error.message,'err');

    // Cargar splits para gastos con n_pagos > 1
    const splitIds = (data || []).filter(g => g.n_pagos > 1).map(g => g.id);
    if (splitIds.length > 0) {
      const {data: sp} = await sb.from('gasto_pagos')
        .select('gasto_id, monto, orden, cta:cuentas(label, moneda)')
        .in('gasto_id', splitIds)
        .order('orden');
      const byGasto = {};
      (sp||[]).forEach(s => {
        if (!byGasto[s.gasto_id]) byGasto[s.gasto_id] = [];
        byGasto[s.gasto_id].push(s);
      });
      (data||[]).forEach(g => { if (g.n_pagos > 1) g.splits = byGasto[g.id] || []; });
    }

    setGastos(data || []);
    setLoading(false);
  },[periodo, catFiltro, cuentaFiltro]);

  React.useEffect(()=>{ cargar(); },[cargar]);

  // Filtro por búsqueda (client-side)
  const gastosFiltrados = React.useMemo(()=>{
    if (!search.trim()) return gastos;
    const s = search.toLowerCase();
    return gastos.filter(g =>
      (g.concepto||'').toLowerCase().includes(s) ||
      (g.proveedor||'').toLowerCase().includes(s) ||
      (g.notas||'').toLowerCase().includes(s) ||
      (g.categoria||'').toLowerCase().includes(s) ||
      (g.cuenta||'').toLowerCase().includes(s) ||
      String(g.folio||'').includes(s)
    );
  },[gastos, search]);

  // Agrupar por fecha
  const grupos = {};
  gastosFiltrados.forEach(g=>{
    if(!grupos[g.fecha]) grupos[g.fecha]=[];
    grupos[g.fecha].push(g);
  });
  const fechas = Object.keys(grupos).sort().reverse();

  const limpiarFiltros = () => {
    setSearch(''); setPeriodo('ult_6m'); setCatFiltro('todas'); setCuentaF('todas');
  };
  const hayFiltros = search || periodo!=='ult_6m' || catFiltro!=='todas' || cuentaFiltro!=='todas';

  return (
    <div style={{width:'100%',height:'100%',display:'flex',fontFamily:'var(--sans)',background:'var(--paper)',color:'var(--ink-1)'}}>
      <style>{`
        .cf-show-narrow { display: none; }
        @media (max-width: 900px) {
          .cf-gasto-row {
            grid-template-columns: 1fr auto 36px !important;
            gap: 10px !important;
            padding: 12px 14px !important;
          }
          .cf-gasto-row .cf-hide-narrow { display: none !important; }
          .cf-show-narrow { display: inline !important; }
        }
      `}</style>
      {!window.__EMBEDDED__ && <Sidebar active="gastos"/>}
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        <div style={{padding:'28px 36px 20px',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16}}>
          <div>
            <div style={{fontFamily:'var(--serif)',fontSize:34,fontWeight:500,letterSpacing:-.8,color:'var(--ink-0)',lineHeight:1}}>Gastos</div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:6}}>Egresos del spa · independientes de turnos</div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <Btn variant="secondary" size="md" icon="download" onClick={()=>notify('Exportar — próximamente','info')}>Exportar</Btn>
            <Btn variant="clay" size="lg" icon="plus" onClick={onNew}>Nuevo gasto</Btn>
          </div>
        </div>

        {/* Métricas del mes actual */}
        <div style={{padding:'0 36px 18px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr 1fr 1fr',gap:1,background:'var(--line-1)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden'}}>
            <MetricCell
              lbl={`${mesLabel(new Date())}`}
              value={metricas.loading? <Skeleton w={140} h={28}/> : <Money amount={metricas.totalMes} size={28}/>}
              sub={metricas.totalPrev>0 ? 'vs mes anterior' : 'sin mes previo'}
              delta={metricas.totalPrev>0 ? Math.round((metricas.totalMes-metricas.totalPrev)/metricas.totalPrev*100) : undefined}
            />
            <MetricCell
              lbl="Registros del mes"
              value={metricas.loading? <Skeleton w={60} h={28}/> : <span style={{fontFamily:'var(--serif)',fontSize:28,fontWeight:500,letterSpacing:-.5}} className="num">{metricas.count}</span>}
              sub="gastos capturados"
            />
            <MetricCell
              lbl="Sin comprobante"
              value={metricas.loading? <Skeleton w={60} h={28}/> : <span style={{fontFamily:'var(--serif)',fontSize:28,fontWeight:500,color:metricas.sinComp>0?'var(--amber)':'var(--ink-0)'}} className="num">{metricas.sinComp}</span>}
              sub={metricas.sinComp>0?'pendientes de adjuntar':'todo al día'}
            />
            <MetricCell
              lbl="Mayor categoría"
              value={metricas.loading ? <Skeleton w={100} h={22}/> : (metricas.topCat
                ? <span style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:500,letterSpacing:-.3}}>{metricas.topCat.label}</span>
                : <span style={{fontFamily:'var(--serif)',fontSize:18,fontWeight:400,color:'var(--ink-3)',fontStyle:'italic'}}>sin gastos</span>)}
              sub={metricas.topCat ? `${metricas.topPct}% del mes` : '—'}
            />
          </div>
        </div>

        {/* Filtros */}
        <div style={{padding:'0 36px 14px',display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{position:'relative',flex:'0 1 320px'}}>
            <Icon name="search" size={14} style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--ink-3)'}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar concepto, proveedor, nota..." style={{width:'100%',padding:'9px 12px 9px 32px',fontSize:13,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontFamily:'inherit',color:'var(--ink-1)',boxSizing:'border-box'}}/>
          </div>

          <FilterSelect label="Periodo" value={periodo} onChange={setPeriodo} options={Object.entries(PERIODO_LABELS).map(([v,l])=>({value:v,label:l}))}/>
          <FilterSelect label="Categoría" value={catFiltro} onChange={setCatFiltro} options={[{value:'todas',label:'Todas'},...cats.map(c=>({value:c.id,label:c.label}))]}/>
          <FilterSelect label="Cuenta" value={cuentaFiltro} onChange={setCuentaF} options={[{value:'todas',label:'Todas'},...cuentas.map(c=>({value:c.id,label:c.label}))]}/>

          <div style={{flex:1}}/>
          {hayFiltros && (
            <button onClick={limpiarFiltros} style={{background:'transparent',border:'none',fontSize:12,color:'var(--ink-3)',cursor:'pointer',fontFamily:'inherit',fontWeight:500,textDecoration:'underline',textUnderlineOffset:3}}>Limpiar filtros</button>
          )}
        </div>

        {/* Header tabla */}
        <div style={{padding:'0 36px'}}>
          <div className="cf-gasto-row" style={{display:'grid',gridTemplateColumns:'92px 1fr 160px 130px 140px 130px 36px',gap:14,padding:'10px 18px',fontSize:10,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--ink-3)',borderBottom:'1px solid var(--line-1)'}}>
            <div className="cf-hide-narrow">Fecha</div>
            <div>Concepto / Nota</div>
            <div className="cf-hide-narrow">Proveedor</div>
            <div className="cf-hide-narrow">Categoría</div>
            <div className="cf-hide-narrow">Cuenta</div>
            <div style={{textAlign:'right'}}>Monto</div>
            <div/>
          </div>
        </div>

        {/* Cuerpo lista */}
        <div style={{flex:1,overflowY:'auto',padding:'0 36px 40px'}}>
          {loading ? (
            <div style={{padding:'48px 18px',textAlign:'center',color:'var(--ink-3)',fontSize:13}}>Cargando gastos…</div>
          ) : gastosFiltrados.length === 0 ? (
            <EmptyState search={search} hayFiltros={hayFiltros} onNew={onNew} onLimpiar={limpiarFiltros}/>
          ) : (
            fechas.map(f => {
              const subtot = grupos[f].reduce((a,b)=>a+Number(b.monto_mxn||0),0);
              return (
                <div key={f}>
                  <div style={{display:'flex',alignItems:'center',gap:10,padding:'16px 18px 8px',fontSize:11,color:'var(--ink-3)',fontWeight:600,letterSpacing:.3,textTransform:'uppercase'}}>
                    <span>{formatFecha(f)}</span>
                    <div style={{flex:1,height:1,background:'var(--line-1)'}}/>
                    <span className="num" style={{fontWeight:500,color:'var(--ink-3)',textTransform:'none',letterSpacing:0}}>
                      {grupos[f].length} {grupos[f].length===1?'gasto':'gastos'} · <Money amount={subtot} size={11} weight={600} color="var(--ink-2)"/>
                    </span>
                  </div>
                  <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:10,overflow:'hidden',marginBottom:4}}>
                    {grupos[f].map((g,i)=>(<GastoRowFn key={g.id} g={g} first={i===0} onClick={()=>onRowClick && onRowClick(g.id)}/>))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Empty state ───
const EmptyState = ({search, hayFiltros, onNew, onLimpiar}) => {
  if (hayFiltros) return (
    <div style={{background:'var(--paper-raised)',border:'1px dashed var(--line-1)',borderRadius:12,padding:'48px 24px',textAlign:'center',marginTop:20}}>
      <div style={{fontFamily:'var(--serif)',fontSize:20,fontWeight:600,color:'var(--ink-0)',marginBottom:6}}>No hay gastos con estos filtros</div>
      <div style={{fontSize:13,color:'var(--ink-2)',marginBottom:18}}>Prueba ampliando el periodo o cambiando los filtros.</div>
      <Btn variant="ghost" size="md" onClick={onLimpiar}>Limpiar filtros</Btn>
    </div>
  );
  return (
    <div style={{background:'var(--paper-raised)',border:'1px dashed var(--line-1)',borderRadius:12,padding:'56px 24px',textAlign:'center',marginTop:20}}>
      <div style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:600,color:'var(--ink-0)',marginBottom:6}}>Aún no hay gastos registrados</div>
      <div style={{fontSize:13,color:'var(--ink-2)',marginBottom:22,maxWidth:420,margin:'0 auto 22px'}}>Captura el primero para empezar a llevar el control de egresos del spa.</div>
      <Btn variant="clay" size="lg" icon="plus" onClick={onNew}>Nuevo gasto</Btn>
    </div>
  );
};

// ─── Row de gasto ───
const GastoRowFn = ({g, first, onClick}) => {
  const esMXN = g.moneda === 'MXN';
  return (
    <div onClick={onClick} className="cf-gasto-row" style={{display:'grid',gridTemplateColumns:'92px 1fr 160px 130px 140px 130px 36px',gap:14,alignItems:'center',padding:'12px 18px',borderTop:first?'none':'1px solid var(--line-1)',cursor:onClick?'pointer':'default',transition:'background .12s'}}
      onMouseEnter={e=>onClick && (e.currentTarget.style.background='var(--paper-sunk)')}
      onMouseLeave={e=>onClick && (e.currentTarget.style.background='transparent')}
    >
      <div className="num cf-hide-narrow" style={{fontSize:12,color:'var(--ink-2)'}}>{formatFecha(g.fecha)}</div>
      <div className="cf-gr-concepto" style={{minWidth:0}}>
        <div style={{fontSize:13.5,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',display:'flex',alignItems:'center',gap:6}}>
          <span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{g.concepto}</span>
          {g.es_facturable && <span title="Gasto facturable (IVA acreditable)" style={{fontSize:9,fontWeight:700,letterSpacing:.4,textTransform:'uppercase',color:'#7a4e10',background:'var(--sand-100)',padding:'1px 5px',borderRadius:3,border:'1px solid #ecd49a',flexShrink:0}}>Fact</span>}
        </div>
        <div style={{fontSize:11,color:'var(--ink-3)',marginTop:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
          <span className="cf-show-narrow num">{formatFecha(g.fecha)} · </span>
          {g.proveedor && <>{g.proveedor} · </>}
          <span className="cf-show-narrow">{g.categoria} · {g.cuenta}</span>
          {g.notas && <> · {g.notas}</>}
        </div>
      </div>
      <div className="cf-hide-narrow" style={{fontSize:12,color:'var(--ink-2)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{g.proveedor || <span style={{color:'var(--ink-3)',fontStyle:'italic'}}>—</span>}</div>
      <div className="cf-hide-narrow"><Chip tone={g.categoria_tone || 'neutral'}>{g.categoria}</Chip></div>
      <div className="cf-hide-narrow" style={{fontSize:11.5,color:'var(--ink-2)',minWidth:0}}>
        {g.n_pagos > 1 && g.splits ? (
          <>
            <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:2}}>
              <span style={{fontSize:9,fontWeight:700,color:'#fff',background:'var(--ink-blue)',padding:'1px 5px',borderRadius:3,letterSpacing:.3}}>SPLIT · {g.n_pagos}</span>
            </div>
            <div style={{fontSize:10,color:'var(--ink-3)',lineHeight:1.35,whiteSpace:'normal'}}>
              {g.splits.map((s,i) => (
                <span key={i}>
                  <span style={{color:'var(--ink-2)',fontWeight:500}}>{s.cta?.label || '—'}</span>
                  <span style={{color:'var(--ink-3)'}}> ${Math.round(Number(s.monto)).toLocaleString('es-MX')}</span>
                  {i < g.splits.length - 1 && <span style={{color:'var(--ink-3)'}}> · </span>}
                </span>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{fontWeight:600,color:'var(--ink-1)',display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
              {g.cuenta}
              {!esMXN && <span style={{fontSize:9,fontWeight:700,color:'var(--ink-3)',background:'var(--paper-sunk)',padding:'1px 4px',borderRadius:3,letterSpacing:.3}}>{g.moneda}</span>}
            </div>
            <div style={{fontSize:10,color:'var(--ink-3)',marginTop:1}}>{g.cuenta_tipo}</div>
          </>
        )}
      </div>
      <div className="cf-gr-monto" style={{textAlign:'right',display:'flex',alignItems:'center',justifyContent:'flex-end',gap:6,minWidth:0}}>
        {!g.comprobante_url && <span title="Sin comprobante"><Icon name="receipt" size={12} color="var(--amber)" stroke={2}/></span>}
        <div>
          <Money amount={Number(g.monto)} currency={g.moneda} size={15} weight={600}/>
          {!esMXN && <div style={{fontSize:10,color:'var(--ink-3)',marginTop:1}} className="num">≈ ${Number(g.monto_mxn).toLocaleString('es-MX',{maximumFractionDigits:0})} MXN</div>}
        </div>
      </div>
      <button onClick={e=>{e.stopPropagation(); onClick && onClick();}} style={{background:'transparent',border:'none',cursor:'pointer',width:28,height:28,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--ink-3)'}}>
        <Icon name="chev-right" size={14}/>
      </button>
    </div>
  );
};

// ─── Dropdown de filtro (estilo pill) ───
const FilterSelect = ({label, value, onChange, options}) => {
  const current = options.find(o=>o.value===value);
  return (
    <label style={{position:'relative',display:'inline-flex',alignItems:'center',gap:6,padding:'8px 32px 8px 12px',fontSize:12,fontWeight:500,color:'var(--ink-1)',background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:8,cursor:'pointer',fontFamily:'inherit'}}>
      <span style={{color:'var(--ink-3)'}}>{label}:</span>
      <span style={{fontWeight:600}}>{current?.label || '—'}</span>
      <Icon name="chev-down" size={12} color="var(--ink-3)" style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)'}}/>
      <select value={value} onChange={e=>onChange(e.target.value)} style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',fontFamily:'inherit'}}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
};

// ─── Skeleton ───
const Skeleton = ({w=80, h=14}) => (
  <div style={{width:w,height:h,background:'var(--line-1)',borderRadius:4,opacity:.5,display:'inline-block'}}/>
);

// ─── Util: label "Febrero 2026" ───
const mesLabel = (d) => {
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${meses[d.getMonth()]} ${d.getFullYear()}`;
};

// Sobreescribe el mock
Object.assign(window, { GastosList: GastosListFn, GastoRowFn, FilterSelect });
