// ──────────────────────────────────────────
// Dashboard / Reportes — VERSIÓN FUNCIONAL
// Solo para gerencia (permission ver_dashboard)
// Filtros de periodo · KPIs · flujo de caja por cuenta · gráficas
// ──────────────────────────────────────────

// ─── Helpers de fecha ───
const _pad2 = n => String(n).padStart(2, '0');
const _ISO = (d) => `${d.getFullYear()}-${_pad2(d.getMonth()+1)}-${_pad2(d.getDate())}`;

const rangoPreset = (preset) => {
  const hoy = new Date();
  const y = hoy.getFullYear(), m = hoy.getMonth(), d = hoy.getDate();
  const H = _ISO(hoy);
  switch(preset) {
    case 'hoy':   return {desde: H, hasta: H, label:'Hoy'};
    case 'ayer':  { const a = new Date(y,m,d-1); return {desde:_ISO(a), hasta:_ISO(a), label:'Ayer'}; }
    case 'semana': {
      // Semana ISO: lunes-domingo
      const dia = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1;
      const lun = new Date(y, m, d - dia);
      const dom = new Date(y, m, d - dia + 6);
      return {desde:_ISO(lun), hasta:_ISO(dom), label:'Esta semana'};
    }
    case 'mes_actual': {
      const ini = new Date(y, m, 1);
      const fin = new Date(y, m+1, 0);
      return {desde:_ISO(ini), hasta:_ISO(fin), label:'Mes actual'};
    }
    case 'mes_anterior': {
      const ini = new Date(y, m-1, 1);
      const fin = new Date(y, m, 0);
      return {desde:_ISO(ini), hasta:_ISO(fin), label:'Mes anterior'};
    }
    case 'ult_3m': {
      const ini = new Date(y, m-2, 1);
      const fin = new Date(y, m+1, 0);
      return {desde:_ISO(ini), hasta:_ISO(fin), label:'Últimos 3 meses'};
    }
    case 'anio':
      return {desde: `${y}-01-01`, hasta: `${y}-12-31`, label:`Año ${y}`};
    default:
      return rangoPreset('mes_actual');
  }
};

// ─── Componente del dashboard ───
const DashboardFn = () => {
  const [preset, setPreset]     = React.useState('mes_actual');
  const [customDesde, setCD]    = React.useState('');
  const [customHasta, setCH]    = React.useState('');
  const [loading, setLoading]   = React.useState(true);
  const [data, setData]         = React.useState(null);

  // Determinar rango efectivo
  const rango = React.useMemo(() => {
    if (preset === 'custom' && customDesde && customHasta) {
      return {desde: customDesde, hasta: customHasta, label: `Del ${customDesde} al ${customHasta}`};
    }
    return rangoPreset(preset);
  }, [preset, customDesde, customHasta]);

  // Cargar todos los datos del periodo
  React.useEffect(() => {
    let vivo = true;
    (async () => {
      setLoading(true);
      const {desde, hasta} = rango;
      const [ventasQ, gastosQ, turnosQ, cuentasQ, monedasQ] = await Promise.all([
        sb.from('v_ventas').select('*').gte('fecha', desde).lte('fecha', hasta),
        sb.from('v_gastos').select('*').gte('fecha', desde).lte('fecha', hasta),
        sb.from('v_turnos_resumen').select('*').gte('fecha', desde).lte('fecha', hasta),
        sb.from('cuentas').select('*').order('orden'),
        sb.from('monedas').select('*'),
      ]);
      if (!vivo) return;
      // Arqueos del periodo (de los turnos que caen en el rango)
      const turnoIds = (turnosQ.data||[]).map(t => t.id);
      let arqueos = [];
      if (turnoIds.length > 0) {
        const ar = await sb.from('arqueos').select('*').in('turno_id', turnoIds);
        arqueos = ar.data || [];
      }
      const monedasMap = {};
      (monedasQ.data||[]).forEach(m => monedasMap[m.codigo] = m);
      setData({
        ventas:  ventasQ.data || [],
        gastos:  gastosQ.data || [],
        turnos:  turnosQ.data || [],
        cuentas: cuentasQ.data || [],
        monedas: monedasMap,
        arqueos,
      });
      setLoading(false);
    })();
    return () => { vivo = false; };
  }, [rango]);

  // Cálculos derivados
  const derivado = React.useMemo(() => {
    if (!data) return null;
    const {ventas, gastos, turnos, cuentas, monedas, arqueos} = data;

    // KPIs (todo en MXN equivalente)
    const totalVentas   = ventas.reduce((a,v) => a + Number(v.precio_mxn || 0), 0);
    const totalComis    = ventas.reduce((a,v) => a + Number(v.comision_mxn || 0) + Number(v.comision_venta_mxn || 0), 0);
    const totalPropinas = ventas.reduce((a,v) => a + Number(v.propina_mxn || 0), 0);
    const totalGastos   = gastos.reduce((a,g) => a + Number(g.monto_mxn || 0), 0);
    // Neto spa = Ventas - Comisiones - Gastos (propinas no son del spa)
    const netoSpa       = totalVentas - totalComis - totalGastos;
    const nTurnos       = turnos.length;
    const nServicios    = ventas.length;
    const tickProm      = nServicios > 0 ? totalVentas / nServicios : 0;
    // Diferencia arqueos (suma de dif en MXN)
    const difArqueos = arqueos.reduce((a,x) => {
      if (x.diferencia === null || x.diferencia === undefined) return a;
      const tc = Number(monedas[x.moneda]?.tc_a_mxn || 1);
      return a + (Number(x.diferencia) * tc);
    }, 0);

    // Flujo de caja por cuenta
    const cuentaMap = {};
    cuentas.forEach(c => cuentaMap[c.id] = {
      id: c.id, label: c.label, tipo: c.tipo, moneda: c.moneda,
      ingresos: 0, comisiones: 0, gastos: 0, n_ventas: 0, n_gastos: 0,
    });
    ventas.forEach(v => {
      if (!cuentaMap[v.cuenta_id]) return;
      cuentaMap[v.cuenta_id].ingresos += Number(v.precio || 0);
      cuentaMap[v.cuenta_id].n_ventas += 1;
      // Comisiones solo salen de cuentas efectivo
      if (cuentaMap[v.cuenta_id].tipo === 'efectivo') {
        cuentaMap[v.cuenta_id].comisiones += Number(v.comision_monto || 0) + Number(v.propina || 0) + Number(v.comision_venta_monto || 0);
      }
    });
    gastos.forEach(g => {
      // Nota: gastos con n_pagos>1 tendrían split. Por simplicidad aquí lo cargamos al cuenta_id
      // principal. TODO: considerar splits en PR-2.
      if (!cuentaMap[g.cuenta_id]) return;
      cuentaMap[g.cuenta_id].gastos += Number(g.monto || 0);
      cuentaMap[g.cuenta_id].n_gastos += 1;
    });
    const flujoPorCuenta = Object.values(cuentaMap)
      .map(c => ({...c, balance: c.ingresos - c.comisiones - c.gastos}))
      .filter(c => c.ingresos > 0 || c.gastos > 0)
      .sort((a,b) => {
        // Efectivo MXN primero, luego tipo alfabético, luego moneda
        if (a.tipo === 'efectivo' && b.tipo !== 'efectivo') return -1;
        if (b.tipo === 'efectivo' && a.tipo !== 'efectivo') return 1;
        if (a.moneda === 'MXN' && b.moneda !== 'MXN') return -1;
        if (b.moneda === 'MXN' && a.moneda !== 'MXN') return 1;
        return a.label.localeCompare(b.label);
      });

    // Serie diaria: ventas vs gastos
    const serieDiaria = {};
    ventas.forEach(v => {
      if (!serieDiaria[v.fecha]) serieDiaria[v.fecha] = {ventas:0, gastos:0};
      serieDiaria[v.fecha].ventas += Number(v.precio_mxn || 0);
    });
    gastos.forEach(g => {
      if (!serieDiaria[g.fecha]) serieDiaria[g.fecha] = {ventas:0, gastos:0};
      serieDiaria[g.fecha].gastos += Number(g.monto_mxn || 0);
    });
    const fechasOrdenadas = Object.keys(serieDiaria).sort();
    const serieChart = {
      labels: fechasOrdenadas,
      ventas: fechasOrdenadas.map(f => serieDiaria[f].ventas),
      gastos: fechasOrdenadas.map(f => serieDiaria[f].gastos),
    };

    // Top canales
    const porCanal = {};
    ventas.forEach(v => {
      const k = v.canal || '—';
      if (!porCanal[k]) porCanal[k] = {label: k, tone: v.canal_tone, total: 0, n: 0};
      porCanal[k].total += Number(v.precio_mxn || 0);
      porCanal[k].n += 1;
    });
    const canalesOrd = Object.values(porCanal).sort((a,b) => b.total - a.total);

    // Top categorías de gasto
    const porCategoria = {};
    gastos.forEach(g => {
      const k = g.categoria || '—';
      if (!porCategoria[k]) porCategoria[k] = {label: k, tone: g.categoria_tone, total: 0, n: 0};
      porCategoria[k].total += Number(g.monto_mxn || 0);
      porCategoria[k].n += 1;
    });
    const categoriasOrd = Object.values(porCategoria).sort((a,b) => b.total - a.total);

    return {
      totalVentas, totalComis, totalPropinas, totalGastos, netoSpa,
      nTurnos, nServicios, tickProm, difArqueos,
      flujoPorCuenta, serieChart, canalesOrd, categoriasOrd,
    };
  }, [data]);

  if (!window.can || !window.can('ver_dashboard')) {
    return (
      <div style={{padding:60,textAlign:'center'}}>
        <div style={{fontFamily:'var(--serif)',fontSize:22,color:'var(--ink-1)',marginBottom:10}}>Sin acceso</div>
        <div style={{fontSize:13,color:'var(--ink-3)'}}>El dashboard solo está disponible para gerencia.</div>
      </div>
    );
  }

  return (
    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',fontFamily:'var(--sans)',background:'var(--paper)',overflowY:'auto',WebkitOverflowScrolling:'touch'}}>
      {/* Header */}
      <div style={{position:'sticky',top:0,zIndex:5,padding:'18px 24px',borderBottom:'1px solid var(--line-1)',background:'var(--paper-raised)',display:'flex',alignItems:'flex-end',gap:16,flexWrap:'wrap'}}>
        <div>
          <div style={{fontFamily:'var(--serif)',fontSize:28,fontWeight:500,letterSpacing:-.6,color:'var(--ink-0)',lineHeight:1}}>Dashboard</div>
          <div style={{fontSize:12,color:'var(--ink-3)',marginTop:4}}>{rango.label} · {rango.desde} → {rango.hasta}</div>
        </div>
        <div style={{flex:1}}/>
        {/* Filtro */}
        <select value={preset} onChange={e=>setPreset(e.target.value)} style={{padding:'9px 32px 9px 14px',border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontSize:13,fontFamily:'inherit',color:'var(--ink-1)',cursor:'pointer'}}>
          <option value="hoy">Hoy</option>
          <option value="ayer">Ayer</option>
          <option value="semana">Esta semana</option>
          <option value="mes_actual">Mes actual</option>
          <option value="mes_anterior">Mes anterior</option>
          <option value="ult_3m">Últimos 3 meses</option>
          <option value="anio">Año actual</option>
          <option value="custom">Rango personalizado…</option>
        </select>
        {preset === 'custom' && (
          <>
            <input type="date" value={customDesde} onChange={e=>setCD(e.target.value)} style={{padding:'9px 12px',border:'1px solid var(--line-1)',borderRadius:8,fontSize:13,fontFamily:'inherit'}}/>
            <span style={{color:'var(--ink-3)'}}>→</span>
            <input type="date" value={customHasta} onChange={e=>setCH(e.target.value)} style={{padding:'9px 12px',border:'1px solid var(--line-1)',borderRadius:8,fontSize:13,fontFamily:'inherit'}}/>
          </>
        )}
      </div>

      <div style={{padding:'20px 24px 60px',maxWidth:1200,margin:'0 auto',width:'100%',boxSizing:'border-box'}}>
        {loading && <div style={{padding:60,textAlign:'center',color:'var(--ink-3)',fontSize:13}}>Cargando datos…</div>}

        {!loading && derivado && (
          <>
            {/* KPIs */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:12,marginBottom:20}}>
              <KpiCard label="Ventas" value={derivado.totalVentas} color="var(--ink-0)" sub={`${derivado.nServicios} servicios`}/>
              <KpiCard label="Comisiones" value={derivado.totalComis} color="var(--clay)" sub="a terapeutas"/>
              <KpiCard label="Gastos" value={derivado.totalGastos} color="#b73f5e" sub={`${derivado.gastos?.length || ''}`.replace(/\d+$/, m=>`${m} gastos`) || ''}/>
              <KpiCard label="Neto al spa" value={derivado.netoSpa} color={derivado.netoSpa >= 0 ? 'var(--moss)' : '#b73f5e'} sub="ventas − com. − gastos" big/>
              <KpiCard label="Ticket promedio" value={derivado.tickProm} color="var(--ink-0)" sub={`${derivado.nTurnos} turnos`}/>
              <KpiCard label="Dif. arqueos" value={derivado.difArqueos} color={Math.abs(derivado.difArqueos) < 1 ? 'var(--moss)' : (derivado.difArqueos > 0 ? 'var(--moss)' : '#b73f5e')} sub={Math.abs(derivado.difArqueos) < 1 ? 'cuadra' : (derivado.difArqueos > 0 ? 'sobrante' : 'faltante')} signed/>
            </div>

            {/* Chart: Ventas vs Gastos */}
            <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:20,marginBottom:20}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <div>
                  <div style={{fontFamily:'var(--serif)',fontSize:17,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2}}>Ventas vs Gastos</div>
                  <div style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>Día por día · MXN equivalente</div>
                </div>
              </div>
              {derivado.serieChart.labels.length > 0 ? (
                <div style={{height:280,position:'relative'}}>
                  <ChartDaily serie={derivado.serieChart}/>
                </div>
              ) : (
                <div style={{padding:40,textAlign:'center',color:'var(--ink-3)',fontSize:12}}>Sin datos en este periodo</div>
              )}
            </div>

            {/* Flujo de caja por cuenta */}
            <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:20,marginBottom:20}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <div>
                  <div style={{fontFamily:'var(--serif)',fontSize:17,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2}}>Flujo de caja por cuenta</div>
                  <div style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>Ingresos − comisiones efectivo − gastos = balance</div>
                </div>
              </div>
              <FlujoCuentaTable cuentas={derivado.flujoPorCuenta} monedas={data.monedas}/>
            </div>

            {/* Breakdowns lado a lado */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))',gap:16}}>
              <BreakdownCard titulo="Ventas por canal" items={derivado.canalesOrd} total={derivado.totalVentas} variant="canal"/>
              <BreakdownCard titulo="Gastos por categoría" items={derivado.categoriasOrd} total={derivado.totalGastos} variant="cat"/>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── KPI card ───
const KpiCard = ({label, value, color, sub, big, signed}) => {
  const fmt = (n) => {
    const abs = Math.abs(n);
    const prefix = signed && n < 0 ? '−' : (signed && n > 0 ? '+' : '');
    return `${prefix}$${Math.round(abs).toLocaleString('es-MX')}`;
  };
  return (
    <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,padding:'14px 16px',gridColumn:big?'span 1':undefined}}>
      <div style={{fontSize:10.5,fontWeight:700,letterSpacing:.5,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:6}}>{label}</div>
      <div className="num" style={{fontFamily:'var(--serif)',fontSize:big?26:22,fontWeight:600,color,letterSpacing:-.4,lineHeight:1.1}}>
        {fmt(value)}
      </div>
      {sub && <div style={{fontSize:10.5,color:'var(--ink-3)',marginTop:4}}>{sub}</div>}
    </div>
  );
};

// ─── Tabla flujo de caja por cuenta ───
const FlujoCuentaTable = ({cuentas, monedas}) => {
  if (cuentas.length === 0) return <div style={{padding:20,textAlign:'center',color:'var(--ink-3)',fontSize:12}}>Sin movimientos en este periodo</div>;
  const symOf = (m) => monedas[m]?.simbolo || '$';
  return (
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      <div style={{display:'grid',gridTemplateColumns:'1.5fr 80px 1fr 1fr 1fr 1fr',gap:10,padding:'6px 10px',fontSize:10,fontWeight:700,color:'var(--ink-3)',letterSpacing:.4,textTransform:'uppercase',borderBottom:'1px solid var(--line-2)'}}>
        <div>Cuenta</div><div>Mon</div><div className="num" style={{textAlign:'right'}}>Ingresos</div><div className="num" style={{textAlign:'right'}}>Comisiones</div><div className="num" style={{textAlign:'right'}}>Gastos</div><div className="num" style={{textAlign:'right'}}>Balance</div>
      </div>
      {cuentas.map(c => {
        const sym = symOf(c.moneda);
        const fmt = (n) => sym + Math.round(Math.abs(n)).toLocaleString('es-MX');
        return (
          <div key={c.id} style={{display:'grid',gridTemplateColumns:'1.5fr 80px 1fr 1fr 1fr 1fr',gap:10,padding:'8px 10px',fontSize:12,alignItems:'center',borderRadius:6,background:'var(--paper)'}}>
            <div>
              <div style={{fontWeight:600,color:'var(--ink-0)'}}>{c.label}</div>
              <div style={{fontSize:10,color:'var(--ink-3)',textTransform:'capitalize'}}>{c.tipo}</div>
            </div>
            <div style={{fontSize:10,fontFamily:'var(--mono)',color:'var(--ink-3)',letterSpacing:.3}}>{c.moneda}</div>
            <div className="num" style={{textAlign:'right',color:'var(--ink-1)',fontWeight:600}}>+{fmt(c.ingresos)}</div>
            <div className="num" style={{textAlign:'right',color:c.comisiones > 0 ? 'var(--clay)' : 'var(--ink-3)'}}>{c.comisiones > 0 ? '−' + fmt(c.comisiones) : '—'}</div>
            <div className="num" style={{textAlign:'right',color:c.gastos > 0 ? '#b73f5e' : 'var(--ink-3)'}}>{c.gastos > 0 ? '−' + fmt(c.gastos) : '—'}</div>
            <div className="num" style={{textAlign:'right',fontWeight:700,color:c.balance >= 0 ? 'var(--moss)' : '#b73f5e',fontFamily:'var(--serif)',fontSize:13}}>{c.balance >= 0 ? '' : '−'}{fmt(c.balance)}</div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Breakdown card con barras horizontales ───
const BreakdownCard = ({titulo, items, total, variant}) => {
  const COLORS = {
    canal: ['#d4834a','#6b7d4a','#378add','#d4537e','#534ab7','#b07228'],
    cat:   ['#d4537e','#d4834a','#b07228','#6b7d4a','#534ab7','#378add'],
  };
  const colors = COLORS[variant] || COLORS.canal;
  return (
    <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:18}}>
      <div style={{fontFamily:'var(--serif)',fontSize:15,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2,marginBottom:12}}>{titulo}</div>
      {items.length === 0 ? (
        <div style={{padding:20,textAlign:'center',color:'var(--ink-3)',fontSize:12}}>Sin datos en este periodo</div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {items.slice(0,6).map((it, i) => {
            const pct = total > 0 ? (it.total / total) * 100 : 0;
            const color = colors[i % colors.length];
            return (
              <div key={it.label}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:3,fontSize:11.5}}>
                  <span style={{color:'var(--ink-1)',fontWeight:500}}>{it.label}</span>
                  <span className="num" style={{color:'var(--ink-2)'}}>
                    <strong style={{color:'var(--ink-0)'}}>${Math.round(it.total).toLocaleString('es-MX')}</strong>
                    <span style={{color:'var(--ink-3)',fontSize:10.5,marginLeft:6}}>{pct.toFixed(1)}%</span>
                  </span>
                </div>
                <div style={{height:6,background:'var(--paper-sunk)',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${pct}%`,background:color,transition:'width .3s'}}/>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Chart: Ventas vs Gastos diarios ───
const ChartDaily = ({serie}) => {
  const canvasRef = React.useRef(null);
  const chartRef  = React.useRef(null);

  React.useEffect(() => {
    if (!window.Chart || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    // Destruir chart previo
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: serie.labels.map(f => {
          const d = new Date(f + 'T00:00:00');
          return d.toLocaleDateString('es-MX',{day:'numeric',month:'short'});
        }),
        datasets: [
          {label:'Ventas', data: serie.ventas, backgroundColor:'rgba(107, 125, 74, .85)', borderRadius:4},
          {label:'Gastos', data: serie.gastos, backgroundColor:'rgba(183, 63, 94, .85)', borderRadius:4},
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {position:'top',align:'end',labels:{font:{family:'Geist',size:11},boxWidth:12,boxHeight:12,usePointStyle:true,pointStyle:'rectRounded'}},
          tooltip: {callbacks:{label:(ctx)=>`${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString('es-MX',{maximumFractionDigits:0})}`}},
        },
        scales: {
          x: {grid:{display:false},ticks:{font:{family:'Geist',size:10},color:'#8a857e'}},
          y: {grid:{color:'#ece7df'},ticks:{font:{family:'Geist',size:10},color:'#8a857e',callback:v=>'$'+Number(v).toLocaleString('es-MX',{maximumFractionDigits:0})}},
        },
      },
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [serie]);

  return <canvas ref={canvasRef}/>;
};

Object.assign(window, { Dashboard: DashboardFn, KpiCard, FlujoCuentaTable, BreakdownCard, ChartDaily });
