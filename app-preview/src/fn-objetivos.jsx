// ──────────────────────────────────────────
// Objetivos · Pantalla principal
// Lista, filtro de periodo, CRUD, cards con progreso en vivo
// ──────────────────────────────────────────

const ObjetivosFn = () => {
  const [filtroPeriodo, setFP]   = React.useState('mes_actual');
  const [verArchivados, setVA]   = React.useState(false);
  const [objetivos, setObjs]     = React.useState([]);
  const [ventas, setVentas]      = React.useState([]);
  const [ventasYoY, setVYoY]     = React.useState([]);
  const [ventasHist, setVH]      = React.useState([]);
  const [colabs, setColabs]      = React.useState([]);
  const [loading, setLoading]    = React.useState(true);
  const [modal, setModal]        = React.useState(null);

  // Determinar el rango del filtro
  const ahora = new Date();
  const rangoFiltro = React.useMemo(() => {
    const y = ahora.getFullYear(), m = ahora.getMonth();
    if (filtroPeriodo === 'mes_actual')   return rangoPeriodoObj('mes', `${y}-${String(m+1).padStart(2,'0')}-01`);
    if (filtroPeriodo === 'mes_anterior') {
      const d = new Date(y, m-1, 1);
      return rangoPeriodoObj('mes', `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`);
    }
    if (filtroPeriodo === 'trim_actual')  return rangoPeriodoObj('trimestre', `${y}-${String(m+1).padStart(2,'0')}-01`);
    if (filtroPeriodo === 'anio_actual')  return rangoPeriodoObj('anio', `${y}-01-01`);
    return rangoPeriodoObj('mes', `${y}-${String(m+1).padStart(2,'0')}-01`);
  }, [filtroPeriodo]);

  // Cargar objetivos + datos
  const cargar = React.useCallback(async () => {
    setLoading(true);
    // Objetivos: traer TODOS los activos (filtro por fecha lo hacemos client-side)
    // o que ESTÉN dentro del rango filtro (su periodo coincida con el periodo del objetivo)
    const objQ = await sb.from('objetivos').select('*').order('periodo_fecha',{ascending:false});
    let objs = objQ.data || [];
    if (!verArchivados) objs = objs.filter(o => o.activo);

    // Filtrar objetivos cuyo periodo overlap con el filtroPeriodo
    objs = objs.filter(o => {
      const r = rangoPeriodoObj(o.periodo, o.periodo_fecha);
      if (!r) return false;
      // overlap si rango filtro y rango objetivo se solapan
      return !(r.hasta < rangoFiltro.desde || r.desde > rangoFiltro.hasta);
    });
    setObjs(objs);

    // Cargar ventas del rango más amplio (objetivos pueden tener distintos periodos)
    // Para simplificar: cargar ventas del año actual
    const yIni = `${ahora.getFullYear()}-01-01`;
    const yFin = `${ahora.getFullYear()}-12-31`;
    const vQ = await sb.from('v_ventas').select('id,fecha,precio_mxn,colaboradora_id,vendedora_id,comision_mxn,comision_venta_mxn').gte('fecha', yIni).lte('fecha', yFin);
    setVentas(vQ.data || []);

    // Cargar ventas año anterior (para YoY)
    const yPrevIni = `${ahora.getFullYear()-1}-01-01`;
    const yPrevFin = `${ahora.getFullYear()-1}-12-31`;
    const vYQ = await sb.from('v_ventas').select('fecha,precio_mxn').gte('fecha', yPrevIni).lte('fecha', yPrevFin);
    setVYoY(vYQ.data || []);

    // Cargar ventas históricas (12 meses atrás desde hoy) para promedio_spa
    const dHist = new Date(ahora); dHist.setMonth(dHist.getMonth() - 12); dHist.setDate(1);
    const histIni = `${dHist.getFullYear()}-${String(dHist.getMonth()+1).padStart(2,'0')}-01`;
    const vHQ = await sb.from('v_ventas').select('fecha,precio_mxn').gte('fecha', histIni);
    setVH(vHQ.data || []);

    // Colaboradoras activas
    const cQ = await sb.from('colaboradoras').select('*').eq('activo', true).order('nombre');
    setColabs(cQ.data || []);
    setLoading(false);
  }, [filtroPeriodo, verArchivados, rangoFiltro]);

  React.useEffect(() => { cargar(); }, [cargar]);

  // Toggle activar/desactivar
  const toggleActivo = async (o) => {
    const {error} = await sb.from('objetivos').update({activo: !o.activo}).eq('id', o.id);
    if (error) return notify('Error: '+error.message,'err');
    cargar();
  };

  const borrar = async (o) => {
    if (!confirmar('¿Borrar este objetivo? Esta acción no se puede deshacer.')) return;
    const {error} = await sb.from('objetivos').delete().eq('id', o.id);
    if (error) return notify('Error: '+error.message,'err');
    notify('Objetivo borrado');
    cargar();
  };

  if (!window.can || !window.can('ver_dashboard')) {
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
          <div style={{fontSize:12,color:'var(--ink-3)',marginTop:4}}>Metas + bonos sugeridos · vista gerencial</div>
        </div>
        <div style={{flex:1}}/>
        <select value={filtroPeriodo} onChange={e=>setFP(e.target.value)} style={{padding:'9px 14px',border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontSize:13,fontFamily:'inherit',cursor:'pointer'}}>
          <option value="mes_actual">Mes actual</option>
          <option value="mes_anterior">Mes anterior</option>
          <option value="trim_actual">Trimestre actual</option>
          <option value="anio_actual">Año actual</option>
        </select>
        <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--ink-2)',cursor:'pointer'}}>
          <input type="checkbox" checked={verArchivados} onChange={e=>setVA(e.target.checked)}/>
          Ver inactivos
        </label>
        <Btn variant="clay" size="md" icon="plus" onClick={()=>setModal({tipo:'nuevo'})}>Nuevo objetivo</Btn>
      </div>

      <div style={{padding:'20px 24px 60px',maxWidth:1100,margin:'0 auto',width:'100%',boxSizing:'border-box'}}>
        {loading ? (
          <div style={{padding:60,textAlign:'center',color:'var(--ink-3)',fontSize:13}}>Cargando objetivos…</div>
        ) : objetivos.length === 0 ? (
          <div style={{background:'var(--paper-raised)',border:'1px dashed var(--line-1)',borderRadius:12,padding:'48px 24px',textAlign:'center'}}>
            <div style={{fontFamily:'var(--serif)',fontSize:20,fontWeight:600,color:'var(--ink-0)',marginBottom:6}}>No hay objetivos para este periodo</div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginBottom:20}}>Crea uno para empezar a medir y motivar al equipo.</div>
            <Btn variant="clay" size="md" icon="plus" onClick={()=>setModal({tipo:'nuevo'})}>Crear primer objetivo</Btn>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {objetivos.map(o => (
              <ObjetivoCard
                key={o.id} obj={o}
                ventas={ventas} ventasYoY={ventasYoY} ventasHist={ventasHist} colabs={colabs}
                onEdit={()=>setModal({tipo:'editar',data:o})}
                onToggle={()=>toggleActivo(o)}
                onBorrar={()=>borrar(o)}
              />
            ))}
          </div>
        )}
      </div>

      {(modal?.tipo==='nuevo' || modal?.tipo==='editar') && (
        <Modal title={modal.tipo==='nuevo' ? 'Nuevo objetivo' : 'Editar objetivo'} onClose={()=>setModal(null)} wide>
          <FormObjetivo obj={modal.data} onSave={()=>{setModal(null); cargar();}} onCancel={()=>setModal(null)}/>
        </Modal>
      )}
    </div>
  );
};

// ─── Card de objetivo (con progreso en vivo) ───
const ObjetivoCard = ({obj, ventas, ventasYoY, ventasHist, colabs, onEdit, onToggle, onBorrar}) => {
  // Filtrar ventas dentro del rango del objetivo
  const r = rangoPeriodoObj(obj.periodo, obj.periodo_fecha);
  const ventasObj = ventas.filter(v => v.fecha >= r.desde && v.fecha <= r.hasta);
  const ventasYoYobj = obj.tipo === 'venta_spa' && obj.meta_modalidad === 'pct_yoy'
    ? ventasYoY.filter(v => {
        const yoyR = {desde: periodoYoY(obj.periodo, r.desde), hasta: periodoYoY(obj.periodo, r.hasta)};
        return v.fecha >= yoyR.desde && v.fecha <= yoyR.hasta;
      })
    : [];
  const ventana = obj.cond_ticket_ventana || ventanaDefaultObj(obj.periodo);
  const ventasHistObj = obj.tipo === 'bono_individual' && obj.cond_ticket_modalidad === 'promedio_spa'
    ? ventasHist.filter(v => v.fecha >= restarMeses(r.desde, ventana) && v.fecha < r.desde)
    : [];

  let resultado;
  if (obj.tipo === 'venta_spa') resultado = calcVentaSpa(obj, ventasObj, ventasYoYobj);
  else if (obj.tipo === 'ticket_spa') resultado = calcTicketSpa(obj, ventasObj);
  else resultado = calcBonoIndividual(obj, ventasObj, ventasHistObj, colabs);

  const tipoLabels = {venta_spa:'Venta total spa', ticket_spa:'Ticket promedio spa', bono_individual:'Bono individual'};
  const tipoColors = {venta_spa:'var(--moss)', ticket_spa:'var(--ink-blue)', bono_individual:'var(--clay)'};
  const color = tipoColors[obj.tipo];

  return (
    <div style={{background:'var(--paper-raised)',border:`1px solid ${color}33`,borderRadius:12,overflow:'hidden',opacity:obj.activo?1:.55}}>
      {/* Header */}
      <div style={{padding:'12px 18px',background:`${color}0d`,borderBottom:`1px solid ${color}22`,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <span style={{width:10,height:10,borderRadius:3,background:color,flexShrink:0}}/>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:'var(--ink-0)',letterSpacing:-.1}}>{tipoLabels[obj.tipo]}</div>
          <div style={{fontSize:11,color:'var(--ink-3)',marginTop:1,textTransform:'capitalize'}}>{labelPeriodoObj(obj.periodo, obj.periodo_fecha)}</div>
        </div>
        {!obj.activo && <Chip tone="neutral">Inactivo</Chip>}
        <div style={{flex:1}}/>
        <button onClick={onToggle} title={obj.activo?'Desactivar':'Activar'} style={{background:'transparent',border:'1px solid var(--line-1)',borderRadius:6,padding:'5px 9px',fontSize:11,color:'var(--ink-2)',cursor:'pointer',fontFamily:'inherit'}}>{obj.activo?'Desactivar':'Activar'}</button>
        <button onClick={onEdit} title="Editar" style={{background:'transparent',border:'none',cursor:'pointer',padding:6,color:'var(--ink-3)'}}><Icon name="edit" size={14}/></button>
        <button onClick={onBorrar} title="Borrar" style={{background:'transparent',border:'none',cursor:'pointer',padding:6,color:'var(--ink-3)'}}><Icon name="trash" size={14}/></button>
      </div>

      {/* Body: progreso */}
      <div style={{padding:'16px 20px'}}>
        {(obj.tipo === 'venta_spa' || obj.tipo === 'ticket_spa') && (
          <div>
            <div style={{display:'flex',alignItems:'baseline',gap:10,marginBottom:8,flexWrap:'wrap'}}>
              <span style={{fontFamily:'var(--serif)',fontSize:24,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.5}} className="num">${Math.round(resultado.actual).toLocaleString('es-MX')}</span>
              <span style={{fontSize:13,color:'var(--ink-3)'}}>de</span>
              <span style={{fontFamily:'var(--serif)',fontSize:18,fontWeight:500,color:'var(--ink-2)'}} className="num">${Math.round(resultado.meta).toLocaleString('es-MX')}</span>
              <span style={{marginLeft:'auto',fontSize:14,fontWeight:700,color: resultado.alcanzado ? 'var(--moss)' : (resultado.pct >= 80 ? 'var(--clay)' : 'var(--ink-3)')}}>{Math.round(resultado.pct)}%{resultado.alcanzado ? ' ✓ Alcanzado' : ''}</span>
            </div>
            <div style={{height:8,background:'var(--paper-sunk)',borderRadius:4,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${Math.min(resultado.pct, 100)}%`,background: resultado.alcanzado ? 'var(--moss)' : color,transition:'width .3s'}}/>
            </div>
            {resultado.extra && <div style={{fontSize:11,color:'var(--ink-3)',marginTop:6}}>{resultado.extra}</div>}
            {obj.tipo === 'ticket_spa' && <div style={{fontSize:11,color:'var(--ink-3)',marginTop:6}}>{resultado.nServicios} servicios en el periodo</div>}
          </div>
        )}

        {obj.tipo === 'bono_individual' && (
          <div>
            {/* Resumen condiciones */}
            <div style={{fontSize:11,color:'var(--ink-3)',marginBottom:12,display:'flex',gap:14,flexWrap:'wrap'}}>
              {obj.cond_ventas_min != null && <span><strong style={{color:'var(--ink-2)'}}>Ventas ≥</strong> ${Number(obj.cond_ventas_min).toLocaleString('es-MX')}</span>}
              {obj.cond_ticket_modalidad === 'monto' && <span><strong style={{color:'var(--ink-2)'}}>Ticket ≥</strong> ${Number(obj.cond_ticket_valor).toLocaleString('es-MX')}</span>}
              {obj.cond_ticket_modalidad === 'promedio_spa' && <span><strong style={{color:'var(--ink-2)'}}>Ticket ≥</strong> promedio spa ({obj.cond_ticket_ventana}m) {resultado.avgTicketSpa!=null?`= $${Math.round(resultado.avgTicketSpa).toLocaleString('es-MX')}`:''}</span>}
              {obj.cond_servicios_min != null && <span><strong style={{color:'var(--ink-2)'}}>Servicios ≥</strong> {obj.cond_servicios_min}</span>}
              <span style={{marginLeft:'auto'}}><strong style={{color:'var(--ink-2)'}}>Bono</strong> {obj.bono_pct}% sobre {obj.bono_base==='total'?'venta total':'exceso'}</span>
            </div>

            {/* Ganadoras */}
            {resultado.ganadoras.length > 0 ? (
              <div style={{marginBottom:resultado.cerca.length>0?14:0}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:.4,textTransform:'uppercase',color:'var(--moss)',marginBottom:8}}>🏆 Alcanzaron meta · {resultado.ganadoras.length}</div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {resultado.ganadoras.map(g => (
                    <div key={g.colab_id} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:10,padding:'8px 12px',background:'rgba(107,125,74,.08)',border:'1px solid rgba(107,125,74,.2)',borderRadius:8,fontSize:12.5,alignItems:'center'}}>
                      <div style={{color:'var(--ink-0)',fontWeight:600}}>{g.nombre}</div>
                      <div className="num" style={{textAlign:'right',color:'var(--ink-2)'}}>${Math.round(g.ventas).toLocaleString('es-MX')}</div>
                      <div className="num" style={{textAlign:'right',color:'var(--ink-3)',fontSize:11}}>tk ${Math.round(g.ticket).toLocaleString('es-MX')} · {g.n} svc</div>
                      <div className="num" style={{textAlign:'right',color:'var(--moss)',fontWeight:700,fontFamily:'var(--serif)',fontSize:14}}>+${Math.round(g.bono).toLocaleString('es-MX')}</div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:10,padding:'8px 12px',background:'rgba(107,125,74,.05)',borderRadius:6,fontSize:12,display:'flex',justifyContent:'space-between'}}>
                  <span style={{color:'var(--ink-3)'}}>Bono total sugerido</span>
                  <span className="num" style={{fontFamily:'var(--serif)',fontWeight:700,color:'var(--moss)',fontSize:15}}>${Math.round(resultado.totalBonoSugerido).toLocaleString('es-MX')}</span>
                </div>
              </div>
            ) : (
              <div style={{padding:14,background:'var(--paper-sunk)',borderRadius:8,fontSize:12.5,color:'var(--ink-3)',fontStyle:'italic',textAlign:'center',marginBottom:resultado.cerca.length>0?14:0}}>Aún nadie ha alcanzado la meta en este periodo.</div>
            )}

            {/* Cerca */}
            {resultado.cerca.length > 0 && (
              <div>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:.4,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:8}}>Cerca · {resultado.cerca.length}</div>
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  {resultado.cerca.map(c => (
                    <div key={c.colab_id} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:10,padding:'6px 12px',fontSize:11.5,color:'var(--ink-3)'}}>
                      <div>{c.nombre}</div>
                      <div className="num" style={{textAlign:'right'}}>${Math.round(c.ventas).toLocaleString('es-MX')} {!c.okVentas && '✗'}</div>
                      <div className="num" style={{textAlign:'right'}}>tk ${Math.round(c.ticket).toLocaleString('es-MX')} {!c.okTicket && '✗'}</div>
                      <div className="num" style={{textAlign:'right'}}>{c.n} svc {!c.okSvc && '✗'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {obj.descripcion && <div style={{marginTop:12,paddingTop:10,borderTop:'1px dashed var(--line-2)',fontSize:11,color:'var(--ink-3)',fontStyle:'italic'}}>{obj.descripcion}</div>}
      </div>
    </div>
  );
};

Object.assign(window, { Objetivos: ObjetivosFn, ObjetivoCard });
