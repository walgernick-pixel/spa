// Screen — Gastos · Lista (historial filtrable) — v2
const GastosList = () => {
  const totalMes = GASTOS_DATA.filter(g=>g.fecha.startsWith('2026-02')).reduce((a,b)=>a+b.totalMXN,0);
  const totalMesAnt = GASTOS_DATA.filter(g=>g.fecha.startsWith('2026-01')).reduce((a,b)=>a+b.totalMXN,0);
  const countMes = GASTOS_DATA.filter(g=>g.fecha.startsWith('2026-02')).length;
  const sinComprobante = GASTOS_DATA.filter(g=>!g.comprobante).length;

  const grupos = {};
  GASTOS_DATA.forEach(g=>{ if(!grupos[g.fecha]) grupos[g.fecha]=[]; grupos[g.fecha].push(g); });
  const fechas = Object.keys(grupos).sort().reverse();

  return (
    <div style={{width:'100%',height:'100%',display:'flex',fontFamily:'var(--sans)',background:'var(--paper)',color:'var(--ink-1)'}}>
      {!window.__EMBEDDED__ && <Sidebar active="gastos"/>}
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        <div style={{padding:'28px 36px 20px',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16}}>
          <div>
            <div style={{fontFamily:'var(--serif)',fontSize:34,fontWeight:500,letterSpacing:-.8,color:'var(--ink-0)',lineHeight:1}}>Gastos</div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:6}}>Egresos del spa · independientes de turnos</div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <Btn variant="secondary" size="md" icon="download">Exportar</Btn>
            <Btn variant="clay" size="lg" icon="plus">Nuevo gasto</Btn>
          </div>
        </div>

        <div style={{padding:'0 36px 18px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr 1fr 1fr',gap:1,background:'var(--line-1)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden'}}>
            <MetricCell lbl="Febrero 2026" value={<Money amount={totalMes} size={28}/>} sub="vs enero" delta={((totalMes-totalMesAnt)/totalMesAnt*100).toFixed(1)*1}/>
            <MetricCell lbl="Registros del mes" value={<span style={{fontFamily:'var(--serif)',fontSize:28,fontWeight:500,letterSpacing:-.5}} className="num">{countMes}</span>} sub="gastos capturados"/>
            <MetricCell lbl="Sin comprobante" value={<span style={{fontFamily:'var(--serif)',fontSize:28,fontWeight:500,color:'var(--amber)'}} className="num">{sinComprobante}</span>} sub="pendientes de adjuntar"/>
            <MetricCell lbl="Mayor categoría" value={<span style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:500,letterSpacing:-.3}}>Variables</span>} sub="58% del mes"/>
          </div>
        </div>

        <div style={{padding:'0 36px 14px',display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{position:'relative',flex:'0 1 320px'}}>
            <Icon name="search" size={14} style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--ink-3)'}}/>
            <input placeholder="Buscar concepto, proveedor o nota..." style={{width:'100%',padding:'9px 12px 9px 32px',fontSize:13,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontFamily:'inherit',color:'var(--ink-1)'}}/>
          </div>
          <FilterPill label="Periodo" value="Últimos 6 meses"/>
          <FilterPill label="Categoría" value="Todas"/>
          <FilterPill label="Cuenta" value="Todas"/>
          <FilterPill label="Proveedor" value="Todos"/>
          <div style={{flex:1}}/>
          <button style={{background:'transparent',border:'none',fontSize:12,color:'var(--ink-3)',cursor:'pointer',fontFamily:'inherit',fontWeight:500,textDecoration:'underline',textUnderlineOffset:3}}>Limpiar filtros</button>
        </div>

        <div style={{padding:'0 36px'}}>
          <div style={{display:'grid',gridTemplateColumns:'92px 1fr 160px 130px 120px 130px 36px',gap:14,padding:'10px 18px',fontSize:10,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--ink-3)',borderBottom:'1px solid var(--line-1)'}}>
            <div>Fecha</div>
            <div>Concepto / Nota</div>
            <div>Proveedor</div>
            <div>Categoría</div>
            <div>Cuenta</div>
            <div style={{textAlign:'right'}}>Monto</div>
            <div/>
          </div>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'0 36px 40px'}}>
          {fechas.map(f=>{
            const subtot = grupos[f].reduce((a,b)=>a+b.totalMXN,0);
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
                  {grupos[f].map((g,i)=>(<GastoRow key={g.id} g={g} first={i===0}/>))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const FilterPill = ({label,value})=>(
  <button style={{display:'inline-flex',alignItems:'center',gap:6,padding:'8px 12px',fontSize:12,fontWeight:500,color:'var(--ink-1)',background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:8,cursor:'pointer',fontFamily:'inherit'}}>
    <span style={{color:'var(--ink-3)'}}>{label}:</span>
    <span style={{fontWeight:600}}>{value}</span>
    <Icon name="chev-down" size={12} color="var(--ink-3)"/>
  </button>
);

const GastoRow = ({g,first})=>{
  const concepto = getConcepto(g.conceptoId);
  const cat = getCat(g.conceptoId);
  const cuenta = getCuenta(g.cuentaId);
  return (
    <div style={{display:'grid',gridTemplateColumns:'92px 1fr 160px 130px 120px 130px 36px',gap:14,alignItems:'center',padding:'12px 18px',borderTop:first?'none':'1px solid var(--line-1)',cursor:'pointer'}}>
      <div className="num" style={{fontSize:12,color:'var(--ink-2)'}}>{formatFecha(g.fecha)}</div>
      <div style={{minWidth:0}}>
        <div style={{fontSize:13.5,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{concepto?.label}</div>
        {g.nota && <div style={{fontSize:11.5,color:'var(--ink-3)',marginTop:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{g.nota}</div>}
      </div>
      <div style={{fontSize:12,color:'var(--ink-2)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{g.provedor}</div>
      <div><Chip tone={cat.tone}>{cat.label}</Chip></div>
      <div style={{fontSize:11.5,color:'var(--ink-2)'}}>
        <div style={{fontWeight:600,color:'var(--ink-1)',display:'flex',alignItems:'center',gap:5}}>
          {cuenta.label}
          {cuenta.moneda!=='MXN' && <span style={{fontSize:9,fontWeight:700,color:'var(--ink-3)',background:'var(--paper-sunk)',padding:'1px 4px',borderRadius:3,letterSpacing:.3}}>{cuenta.moneda}</span>}
        </div>
        <div style={{fontSize:10,color:'var(--ink-3)',marginTop:1}}>{cuenta.tipo}</div>
      </div>
      <div style={{textAlign:'right',display:'flex',alignItems:'center',justifyContent:'flex-end',gap:6}}>
        {!g.comprobante && <span title="Sin comprobante"><Icon name="receipt" size={12} color="var(--amber)" stroke={2}/></span>}
        <div>
          <Money amount={g.monto} currency={cuenta.moneda} size={15} weight={600}/>
          {cuenta.moneda!=='MXN' && <div style={{fontSize:10,color:'var(--ink-3)',marginTop:1}} className="num">≈ ${g.totalMXN.toLocaleString('es-MX',{maximumFractionDigits:0})} MXN</div>}
        </div>
      </div>
      <button style={{background:'transparent',border:'none',cursor:'pointer',width:28,height:28,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--ink-3)'}}>
        <Icon name="chev-right" size={14}/>
      </button>
    </div>
  );
};

const MetricCell = ({lbl,value,sub,delta})=>(
  <div style={{background:'var(--paper-raised)',padding:'16px 20px'}}>
    <div style={{fontSize:10,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:10}}>{lbl}</div>
    <div style={{marginBottom:4}}>{value}</div>
    <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'var(--ink-3)'}}>
      {delta!==undefined && !isNaN(delta) && (
        <span style={{color:delta<=0?'var(--moss-700)':'var(--clay-700)',fontWeight:600,display:'inline-flex',alignItems:'center',gap:2}}>
          <Icon name={delta<=0?'arrow-down':'arrow-up'} size={11} stroke={2}/>
          {Math.abs(delta)}%
        </span>
      )}
      <span>{sub}</span>
    </div>
  </div>
);

Object.assign(window,{GastosList,MetricCell,FilterPill,GastoRow});
