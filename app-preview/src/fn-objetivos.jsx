// ──────────────────────────────────────────
// Objetivos · Pantalla principal — 4 slots fijos (sin botón +Nuevo)
// ──────────────────────────────────────────

const TIPOS_OBJETIVOS = [
  {id:'venta_spa',       label:'Venta total del spa',      icon:'chart',    color:'var(--moss)',     desc:'Meta de ventas brutas del negocio'},
  {id:'ticket_spa',      label:'Ticket promedio del spa',  icon:'sparkles', color:'var(--ink-blue)', desc:'Valor promedio por servicio vendido'},
  {id:'bono_individual', label:'Bono individual',          icon:'users',    color:'var(--clay)',     desc:'Bono para terapeutas que cumplan metas'},
  {id:'bono_encargada',  label:'Bono responsable',         icon:'shield',   color:'#b07228',         desc:'% sobre ventas de turnos que abrió'},
];

const ObjetivosFn = () => {
  const [periodoTipo, setPT]     = React.useState('mes');
  const [objetivos, setObjs]     = React.useState([]);
  const [ventas, setVentas]      = React.useState([]);
  const [ventasYoY, setVYoY]     = React.useState([]);
  const [ventasHist, setVH]      = React.useState([]);
  const [turnos, setTurnos]      = React.useState([]);
  const [colabs, setColabs]      = React.useState([]);
  const [perfiles, setPerfiles]  = React.useState([]);
  const [loading, setLoading]    = React.useState(true);
  const [modal, setModal]        = React.useState(null);

  // periodo_fecha del periodo actual según tipo seleccionado
  const periodoFecha = React.useMemo(() => {
    const d = new Date();
    const y = d.getFullYear(), m = d.getMonth();
    if (periodoTipo === 'mes') return `${y}-${String(m+1).padStart(2,'0')}-01`;
    if (periodoTipo === 'trimestre') {
      const qStart = Math.floor(m / 3) * 3;
      return `${y}-${String(qStart+1).padStart(2,'0')}-01`;
    }
    return `${y}-01-01`; // anio
  }, [periodoTipo]);

  const rangoFiltro = React.useMemo(() => rangoPeriodoObj(periodoTipo, periodoFecha), [periodoTipo, periodoFecha]);

  // Cargar todo
  const cargar = React.useCallback(async () => {
    setLoading(true);
    // Todos los objetivos que matchean este periodo + tipo
    const {data: objData} = await sb.from('objetivos')
      .select('*')
      .eq('periodo', periodoTipo)
      .eq('periodo_fecha', periodoFecha);
    setObjs(objData || []);

    const ahora = new Date();
    const yIni = `${ahora.getFullYear()}-01-01`;
    const yFin = `${ahora.getFullYear()}-12-31`;

    // Paginar v_ventas/turnos para evitar el cap server-side de 1000 filas.
    const [vQ, vYQ, cQ, tQ, pQ] = await Promise.all([
      window.fetchAll(() => sb.from('v_ventas').select('id,fecha,turno_id,precio_mxn,colaboradora_id,vendedora_id,comision_mxn,comision_venta_mxn').gte('fecha', yIni).lte('fecha', yFin)),
      window.fetchAll(() => sb.from('v_ventas').select('fecha,precio_mxn').gte('fecha', `${ahora.getFullYear()-1}-01-01`).lte('fecha', `${ahora.getFullYear()-1}-12-31`)),
      sb.from('colaboradoras').select('*').eq('activo', true).order('nombre'),
      window.fetchAll(() => sb.from('turnos').select('id,fecha,estado,encargada_id').gte('fecha', yIni).lte('fecha', yFin)),
      sb.from('perfiles').select('id, nombre_display, username, activo'),
    ]);
    setVentas(vQ.data || []);
    setVYoY(vYQ.data || []);

    // Ventas históricas 12 meses atrás (para promedio_spa)
    const dHist = new Date(ahora); dHist.setMonth(dHist.getMonth() - 12); dHist.setDate(1);
    const histIni = `${dHist.getFullYear()}-${String(dHist.getMonth()+1).padStart(2,'0')}-01`;
    const vH = await window.fetchAll(() => sb.from('v_ventas').select('fecha,precio_mxn').gte('fecha', histIni));
    setVH(vH.data || []);

    setColabs(cQ.data || []);
    setTurnos(tQ.data || []);
    setPerfiles(pQ.data || []);
    setLoading(false);
  }, [periodoTipo, periodoFecha]);

  React.useEffect(() => { cargar(); }, [cargar]);

  // Acciones
  const toggleActivo = async (o) => {
    const {error} = await sb.from('objetivos').update({activo: !o.activo}).eq('id', o.id);
    if (error) return notify('Error: '+error.message,'err');
    cargar();
  };

  const configurar = (tipo) => {
    const existe = objetivos.find(o => o.tipo === tipo);
    setModal({tipo: existe ? 'editar' : 'nuevo', data: existe, tipoForzado: tipo, periodoForzado: periodoTipo, fechaForzada: periodoFecha});
  };

  if (!window.can || !window.can('objetivos_ver')) {
    return (
      <div style={{padding:60,textAlign:'center'}}>
        <div style={{fontFamily:'var(--serif)',fontSize:22,color:'var(--ink-1)',marginBottom:10}}>Sin acceso</div>
        <div style={{fontSize:13,color:'var(--ink-3)'}}>Los objetivos solo están disponibles para gerencia.</div>
      </div>
    );
  }

  return (
    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',fontFamily:'var(--sans)',background:'var(--paper)',overflowY:'auto',WebkitOverflowScrolling:'touch'}}>
      {/* Header */}
      <div style={{position:'sticky',top:0,zIndex:5,padding:'18px 24px',borderBottom:'1px solid var(--line-1)',background:'var(--paper-raised)',display:'flex',alignItems:'flex-end',gap:14,flexWrap:'wrap'}}>
        <div>
          <div style={{fontFamily:'var(--serif)',fontSize:28,fontWeight:500,letterSpacing:-.6,color:'var(--ink-0)',lineHeight:1}}>Objetivos</div>
          <div style={{fontSize:12,color:'var(--ink-3)',marginTop:4,textTransform:'capitalize'}}>{labelPeriodoObj(periodoTipo, periodoFecha)} · {rangoFiltro.desde} → {rangoFiltro.hasta}</div>
        </div>
        <div style={{flex:1}}/>
        <div style={{display:'flex',gap:2,padding:2,background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:8}}>
          {[['mes','Mensual'],['trimestre','Trimestral'],['anio','Anual']].map(([v,l]) => (
            <button key={v} onClick={()=>setPT(v)} style={{padding:'6px 14px',fontSize:12,fontWeight:periodoTipo===v?600:500,border:'none',borderRadius:6,background:periodoTipo===v?'var(--ink-0)':'transparent',color:periodoTipo===v?'#faf7f1':'var(--ink-2)',cursor:'pointer',fontFamily:'inherit'}}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{padding:'20px 24px 60px',maxWidth:1100,margin:'0 auto',width:'100%',boxSizing:'border-box'}}>
        {loading ? (
          <div style={{padding:60,textAlign:'center',color:'var(--ink-3)',fontSize:13}}>Cargando objetivos…</div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(440px, 1fr))',gap:16}}>
            {TIPOS_OBJETIVOS.map(tipo => {
              const obj = objetivos.find(o => o.tipo === tipo.id);
              return (
                <SlotObjetivo
                  key={tipo.id}
                  tipoInfo={tipo}
                  obj={obj}
                  periodoTipo={periodoTipo}
                  periodoFecha={periodoFecha}
                  ventas={ventas} ventasYoY={ventasYoY} ventasHist={ventasHist}
                  turnos={turnos} colabs={colabs} perfiles={perfiles}
                  onConfigurar={()=>configurar(tipo.id)}
                  onToggleActivo={()=>obj && toggleActivo(obj)}
                />
              );
            })}
          </div>
        )}
      </div>

      {(modal?.tipo==='nuevo' || modal?.tipo==='editar') && (
        <Modal title={modal.tipo==='nuevo' ? 'Configurar objetivo' : 'Editar objetivo'} onClose={()=>setModal(null)} wide>
          <FormObjetivo
            obj={modal.data}
            tipoForzado={modal.tipoForzado}
            periodoForzado={modal.periodoForzado}
            fechaForzada={modal.fechaForzada}
            onSave={()=>{setModal(null); cargar();}}
            onCancel={()=>setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
};

// ─── Slot de objetivo (card dedicada por tipo) ───
const SlotObjetivo = ({tipoInfo, obj, periodoTipo, periodoFecha, ventas, ventasYoY, ventasHist, turnos, colabs, perfiles, onConfigurar, onToggleActivo}) => {
  const color = tipoInfo.color;
  const configurado = !!obj;
  const activo = obj?.activo;

  // Filtrar datos al rango del periodo
  const r = rangoPeriodoObj(periodoTipo, periodoFecha);
  const ventasPer = ventas.filter(v => v.fecha >= r.desde && v.fecha <= r.hasta);
  const turnosPer = turnos.filter(t => t.fecha >= r.desde && t.fecha <= r.hasta);

  // Calcular progreso según tipo (solo si configurado y activo)
  let resultado = null;
  if (configurado && activo) {
    if (obj.tipo === 'venta_spa') {
      const ventasYoYper = obj.meta_modalidad === 'pct_yoy'
        ? ventasYoY.filter(v => {
            const yoyR = {desde: periodoYoY(obj.periodo, r.desde), hasta: periodoYoY(obj.periodo, r.hasta)};
            return v.fecha >= yoyR.desde && v.fecha <= yoyR.hasta;
          }) : [];
      resultado = calcVentaSpa(obj, ventasPer, ventasYoYper);
    } else if (obj.tipo === 'ticket_spa') {
      resultado = calcTicketSpa(obj, ventasPer);
    } else if (obj.tipo === 'bono_individual') {
      const ventana = obj.cond_ticket_ventana || ventanaDefaultObj(obj.periodo);
      const vH = obj.cond_ticket_modalidad === 'promedio_spa'
        ? ventasHist.filter(v => v.fecha >= restarMeses(r.desde, ventana) && v.fecha < r.desde) : [];
      resultado = calcBonoIndividual(obj, ventasPer, vH, colabs);
    } else if (obj.tipo === 'bono_encargada') {
      // Pasamos perfiles para que el lookup del nombre del responsable
      // funcione: encargada_id apunta a perfiles, no a colaboradoras.
      resultado = calcBonoEncargada(obj, ventasPer, turnosPer, colabs, perfiles);
    }
  }

  return (
    <div style={{background:'var(--paper-raised)',border:`1px solid ${color}33`,borderRadius:12,overflow:'hidden',opacity:configurado && !activo ? .6 : 1}}>
      {/* Header */}
      <div style={{padding:'12px 16px',background:`${color}0d`,borderBottom:`1px solid ${color}22`,display:'flex',alignItems:'center',gap:10}}>
        <span style={{width:10,height:10,borderRadius:3,background:color,flexShrink:0}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,color:'var(--ink-0)',letterSpacing:-.1}}>{tipoInfo.label}</div>
          <div style={{fontSize:10.5,color:'var(--ink-3)',marginTop:1}}>{tipoInfo.desc}</div>
        </div>
        {configurado && (
          <div style={{display:'flex',alignItems:'center',gap:7,fontSize:11,color: activo ? 'var(--moss)' : 'var(--ink-3)',fontWeight:600}} title={activo?'Desactivar':'Activar'}>
            <Toggle checked={activo} onChange={onToggleActivo} size="sm"/>
            <span>{activo?'Activo':'Inactivo'}</span>
          </div>
        )}
        <button onClick={onConfigurar} title="Configurar" style={{background:'transparent',border:'none',cursor:'pointer',padding:6,color:'var(--ink-2)',borderRadius:6,display:'flex',alignItems:'center'}}>
          <Icon name="edit" size={14}/>
        </button>
      </div>

      {/* Body */}
      <div style={{padding:'16px 18px',minHeight:100}}>
        {!configurado ? (
          <div style={{textAlign:'center',padding:'18px 6px'}}>
            <div style={{fontSize:12,color:'var(--ink-3)',marginBottom:12,fontStyle:'italic'}}>Sin configurar</div>
            <Btn variant="secondary" size="sm" icon="plus" onClick={onConfigurar}>Configurar objetivo</Btn>
          </div>
        ) : !activo ? (
          <div style={{padding:'10px 6px',fontSize:12,color:'var(--ink-3)',textAlign:'center',fontStyle:'italic'}}>Inactivo — activa para ver progreso</div>
        ) : (obj.tipo === 'venta_spa' || obj.tipo === 'ticket_spa') ? (
          <div>
            <div style={{display:'flex',alignItems:'baseline',gap:10,marginBottom:8,flexWrap:'wrap'}}>
              <span style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.4}} className="num">${Math.round(resultado.actual).toLocaleString('es-MX')}</span>
              <span style={{fontSize:12,color:'var(--ink-3)'}}>de</span>
              <span style={{fontFamily:'var(--serif)',fontSize:16,fontWeight:500,color:'var(--ink-2)'}} className="num">${Math.round(resultado.meta).toLocaleString('es-MX')}</span>
              <span style={{marginLeft:'auto',fontSize:13,fontWeight:700,color: resultado.alcanzado ? 'var(--moss)' : (resultado.pct >= 80 ? 'var(--clay)' : 'var(--ink-3)')}}>{Math.round(resultado.pct)}%{resultado.alcanzado ? ' ✓' : ''}</span>
            </div>
            <div style={{height:7,background:'var(--paper-sunk)',borderRadius:4,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${Math.min(resultado.pct, 100)}%`,background: resultado.alcanzado ? 'var(--moss)' : color,transition:'width .3s'}}/>
            </div>
            {resultado.extra && <div style={{fontSize:10.5,color:'var(--ink-3)',marginTop:6}}>{resultado.extra}</div>}
            {obj.tipo === 'ticket_spa' && <div style={{fontSize:10.5,color:'var(--ink-3)',marginTop:6}}>{resultado.nServicios} servicios en el periodo</div>}
          </div>
        ) : (
          // bono_individual o bono_encargada
          <SlotBonoBody obj={obj} resultado={resultado} tipo={obj.tipo}/>
        )}
        {obj?.descripcion && <div style={{marginTop:10,paddingTop:8,borderTop:'1px dashed var(--line-2)',fontSize:10.5,color:'var(--ink-3)',fontStyle:'italic'}}>{obj.descripcion}</div>}
      </div>
    </div>
  );
};

// ─── Body de bono (individual o encargada) ───
const SlotBonoBody = ({obj, resultado, tipo}) => {
  const fmt = (n) => '$' + Math.round(n).toLocaleString('es-MX');
  return (
    <div>
      {/* Resumen de condiciones */}
      <div style={{fontSize:10.5,color:'var(--ink-3)',marginBottom:10,display:'flex',gap:10,flexWrap:'wrap'}}>
        {tipo === 'bono_encargada' && obj.cond_turnos_min != null && <span><strong style={{color:'var(--ink-2)'}}>Turnos ≥</strong> {obj.cond_turnos_min}</span>}
        {obj.cond_ventas_min != null && <span><strong style={{color:'var(--ink-2)'}}>Ventas ≥</strong> {fmt(Number(obj.cond_ventas_min))}</span>}
        {obj.cond_ticket_modalidad === 'monto' && <span><strong style={{color:'var(--ink-2)'}}>Ticket ≥</strong> {fmt(Number(obj.cond_ticket_valor))}</span>}
        {obj.cond_ticket_modalidad === 'promedio_spa' && <span><strong style={{color:'var(--ink-2)'}}>Ticket ≥</strong> prom spa {resultado.avgTicketSpa!=null?`(${fmt(resultado.avgTicketSpa)})`:''}</span>}
        {obj.cond_servicios_min != null && <span><strong style={{color:'var(--ink-2)'}}>Svc ≥</strong> {obj.cond_servicios_min}</span>}
        <span style={{marginLeft:'auto',color:'var(--clay)',fontWeight:600}}>
          Bono: {obj.bono_modalidad === 'monto_fijo' ? `${fmt(Number(obj.bono_monto_fijo))} fijo` : `${obj.bono_pct}% ${obj.bono_base==='total'?'s/total':obj.bono_base==='neta'?'s/neta':'s/exceso'}`}
        </span>
      </div>

      {resultado.ganadoras.length > 0 ? (
        <>
          <div style={{fontSize:10.5,fontWeight:700,letterSpacing:.4,textTransform:'uppercase',color:'var(--moss)',marginBottom:6}}>🏆 {resultado.ganadoras.length} ganadora{resultado.ganadoras.length>1?'s':''}</div>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            {resultado.ganadoras.slice(0, 5).map(g => (
              <div key={g.colab_id} style={{display:'grid',gridTemplateColumns:'1fr auto auto',gap:8,padding:'5px 8px',background:'rgba(107,125,74,.08)',borderRadius:6,fontSize:11.5,alignItems:'center'}}>
                <div style={{color:'var(--ink-0)',fontWeight:600}}>{g.nombre}</div>
                <div className="num" style={{textAlign:'right',color:'var(--ink-3)',fontSize:10}}>
                  {tipo === 'bono_encargada' ? `${g.nTurnos} turnos` : `${g.n} svc`} · {fmt(g.ventas)}
                </div>
                <div className="num" style={{textAlign:'right',color:'var(--moss)',fontWeight:700,fontFamily:'var(--serif)',fontSize:12.5}}>+{fmt(g.bono)}</div>
              </div>
            ))}
            {resultado.ganadoras.length > 5 && <div style={{fontSize:10,color:'var(--ink-3)',textAlign:'center',fontStyle:'italic'}}>+ {resultado.ganadoras.length - 5} más</div>}
          </div>
          <div style={{marginTop:8,padding:'6px 8px',background:'rgba(107,125,74,.05)',borderRadius:6,display:'flex',justifyContent:'space-between',fontSize:11}}>
            <span style={{color:'var(--ink-3)'}}>Bono total sugerido</span>
            <span className="num" style={{fontFamily:'var(--serif)',fontWeight:700,color:'var(--moss)',fontSize:13}}>{fmt(resultado.totalBonoSugerido)}</span>
          </div>
        </>
      ) : (
        <div style={{padding:12,background:'var(--paper-sunk)',borderRadius:6,fontSize:11.5,color:'var(--ink-3)',fontStyle:'italic',textAlign:'center'}}>Aún nadie ha alcanzado la meta.</div>
      )}
    </div>
  );
};

Object.assign(window, { Objetivos: ObjetivosFn, SlotObjetivo, SlotBonoBody, TIPOS_OBJETIVOS });
