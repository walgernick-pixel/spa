// ──────────────────────────────────────────
// Turnos · Lista — VERSIÓN FUNCIONAL conectada a Supabase
// Lee de v_turnos_resumen; botón "Abrir turno" crea fila real.
// Sobreescribe window.TurnosList del mock.
// ──────────────────────────────────────────

// ─── Helpers de fecha (día/mes en español) ───
const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const DIAS_FULL = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES_ABR = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

const fechaLabel = (iso) => {
  // iso: "2026-04-20" → { fecha:"Hoy · 20 abr" / "Sáb · 20 abr", dia:"Sábado" }
  const d = new Date(iso + 'T12:00:00');
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const dSinH = new Date(d); dSinH.setHours(0,0,0,0);
  const diff = Math.round((dSinH - hoy)/86400000);

  const dia = DIAS[d.getDay()];
  const diaFull = DIAS_FULL[d.getDay()];
  const fecha_corta = `${d.getDate()} ${MESES_ABR[d.getMonth()]}`;

  let prefijo;
  if (diff === 0) prefijo = 'Hoy';
  else if (diff === -1) prefijo = 'Ayer';
  else prefijo = dia;

  return { label: `${prefijo} · ${fecha_corta}`, dia: diaFull };
};

const hmFromTimestamp = (ts) => {
  if (!ts) return null;
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

// ─── Métricas de la semana ───
const useMetricasSemana = (turnos) => {
  return React.useMemo(() => {
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    // Semana ISO: lunes–domingo. Ajuste para que domingo sea día 7.
    const diaSemana = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1;
    const inicioSemana = new Date(hoy); inicioSemana.setDate(hoy.getDate() - diaSemana);
    const finSemana = new Date(inicioSemana); finSemana.setDate(inicioSemana.getDate() + 6);

    // Semana anterior
    const inicioPrev = new Date(inicioSemana); inicioPrev.setDate(inicioPrev.getDate() - 7);
    const finPrev = new Date(inicioPrev); finPrev.setDate(finPrev.getDate() + 6);

    const inRange = (iso, desde, hasta) => {
      const f = new Date(iso + 'T12:00:00');
      return f >= desde && f <= hasta;
    };

    const semana = turnos.filter(t => inRange(t.fecha, inicioSemana, finSemana));
    const prev   = turnos.filter(t => inRange(t.fecha, inicioPrev, finPrev));

    const totalSem = semana.reduce((a,b)=>a+Number(b.total_mxn||0),0);
    const totalPrev= prev.reduce((a,b)=>a+Number(b.total_mxn||0),0);
    const svcs     = semana.reduce((a,b)=>a+Number(b.n_servicios||0),0);
    const svcsPrev = prev.reduce((a,b)=>a+Number(b.n_servicios||0),0);
    const tick     = svcs>0 ? totalSem/svcs : 0;
    const tickPrev = svcsPrev>0 ? totalPrev/svcsPrev : 0;
    const abiertos = turnos.filter(t => t.estado === 'abierto').length;

    const pct = (now, prev) => prev>0 ? Math.round((now-prev)/prev*100) : null;

    return {
      totalSem, totalPrev, svcs, tick,
      deltaTotal: pct(totalSem, totalPrev),
      deltaTick:  pct(tick, tickPrev),
      abiertos
    };
  }, [turnos]);
};

// ─── Pantalla principal ───
const TurnosListFn = () => {
  const [turnos, setTurnos]       = React.useState([]);
  const [loading, setLoading]     = React.useState(true);
  const [abriendo, setAbriendo]   = React.useState(false);
  const [modalRetro, setModalR]   = React.useState(false);

  const cargar = React.useCallback(async () => {
    setLoading(true);
    const { data, error } = await sb.from('v_turnos_resumen')
      .select('*')
      .order('fecha', { ascending: false })
      .order('hora_inicio', { ascending: false })
      .limit(30);
    if (error) { notify('Error cargando turnos: '+error.message, 'err'); setLoading(false); return; }
    // Cargar arqueos + monedas para computar diferencia total por turno
    const turnoIds = (data||[]).map(t => t.id);
    if (turnoIds.length > 0) {
      const [arqs, mons] = await Promise.all([
        sb.from('arqueos').select('turno_id, moneda, neto_esperado, neto_reportado, diferencia').in('turno_id', turnoIds),
        sb.from('monedas').select('codigo, tc_a_mxn'),
      ]);
      const tcByMoneda = {};
      (mons.data||[]).forEach(m => tcByMoneda[m.codigo] = Number(m.tc_a_mxn) || 1);
      const arqsByTurno = {};
      (arqs.data||[]).forEach(a => {
        if (!arqsByTurno[a.turno_id]) arqsByTurno[a.turno_id] = [];
        arqsByTurno[a.turno_id].push(a);
      });
      data.forEach(t => {
        const arqueos = arqsByTurno[t.id] || [];
        const reportados = arqueos.filter(a => a.neto_reportado !== null);
        if (reportados.length === 0) {
          t.arqueoStatus = arqueos.length > 0 ? 'parcial' : 'pendiente'; // registrados pero sin reportar
          t.arqueoDifMxn = 0;
        } else {
          const dif = reportados.reduce((s,a) => s + (Number(a.diferencia)||0) * (tcByMoneda[a.moneda]||1), 0);
          t.arqueoDifMxn = dif;
          t.arqueoStatus = Math.abs(dif) < 0.5 ? 'cuadra' : (dif > 0 ? 'sobra' : 'falta');
        }
      });
    }
    setTurnos(data || []);
    setLoading(false);
  }, []);

  React.useEffect(() => { cargar(); }, [cargar]);

  const metricas = useMetricasSemana(turnos);

  const abrirTurno = async () => {
    if (abriendo) return;
    // Validar: no puede haber otro turno abierto
    const { data: abiertos } = await sb.from('turnos').select('id,folio').eq('estado','abierto').limit(1);
    if (abiertos && abiertos.length > 0) {
      notify(`Ya hay un turno abierto (${abiertos[0].folio || '#'+abiertos[0].id.slice(0,6)}). Ciérralo antes de abrir otro.`, 'warn');
      return;
    }

    setAbriendo(true);
    const { data: user } = await sb.auth.getUser();
    const ahora = new Date();
    const hoy   = ahora.toISOString().slice(0,10);
    const hora  = `${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`;

    const nuevo = {
      fecha: hoy,
      hora_inicio: hora,
      estado: 'abierto',
      encargada_id: user?.user?.id || null,
    };

    const { data, error } = await sb.from('turnos').insert(nuevo).select().single();
    setAbriendo(false);
    if (error) { notify('No se pudo abrir el turno: '+error.message, 'err'); return; }
    notify('Turno abierto ✓');
    // Ir al PV del turno recién creado
    navigate('turnos/pv/' + data.id);
  };

  const abrirTurnoFila = (t) => {
    // Abierto o cerrado, ambos van al PV. Si está cerrado, el PV se muestra
    // en modo solo-lectura (sin botones de editar/borrar/agregar).
    navigate('turnos/pv/' + t.id);
  };

  // Capturar turno retroactivo (fecha en el pasado)
  const capturarPasado = async ({fecha, horaInicio}) => {
    const { data: user } = await sb.auth.getUser();
    const nuevo = {
      fecha: fecha,
      hora_inicio: horaInicio,
      estado: 'abierto',
      encargada_id: user?.user?.id || null,
    };
    const { data, error } = await sb.from('turnos').insert(nuevo).select().single();
    if (error) { notify('No se pudo capturar: '+error.message, 'err'); return; }
    notify('Turno retroactivo creado — captura los servicios y ciérralo');
    setModalR(false);
    navigate('turnos/pv/' + data.id);
  };

  return (
    <div style={{width:'100%',height:'100%',display:'flex',fontFamily:'var(--sans)',background:'var(--paper)',color:'var(--ink-1)'}}>
      <style>{`
        @media (max-width: 900px) {
          .cf-turno-row {
            grid-template-columns: 1fr auto !important;
            gap: 8px 12px !important;
            padding: 14px 16px !important;
          }
          .cf-turno-row .cf-hide-narrow { display: none !important; }
          .cf-turno-row .cf-tr-fecha   { grid-column: 1 / 2; }
          .cf-turno-row .cf-tr-vcn     { grid-column: 2 / 3; align-self: start; }
          .cf-turno-row .cf-tr-estado  { grid-column: 1 / -1; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
        }
      `}</style>
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        <div style={{padding:'28px 36px 0',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16}}>
          <div>
            <div style={{fontFamily:'var(--serif)',fontSize:34,fontWeight:500,letterSpacing:-.8,color:'var(--ink-0)',lineHeight:1}}>Turnos</div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:6}}>Operación diaria · punto de venta</div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <Btn variant="ghost" size="md" icon="calendar" onClick={()=>setModalR(true)}>Capturar pasado</Btn>
            <Btn variant="clay" icon="plus" size="lg" onClick={abrirTurno} disabled={abriendo}>
              {abriendo ? 'Abriendo…' : 'Abrir turno'}
            </Btn>
          </div>
        </div>

        <div style={{flex:1,overflowY:'auto'}}>
          <div style={{padding:'24px 36px 40px'}}>
            {/* Métricas de la semana */}
            <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr 1fr 1fr',gap:1,background:'var(--line-1)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden',marginBottom:28}}>
              <MetricCell
                lbl="Semana actual"
                value={loading? <Skeleton w={140} h={28}/> : <Money amount={metricas.totalSem} size={28}/>}
                sub={metricas.deltaTotal!==null ? 'vs semana pasada' : 'sin semana previa'}
                delta={metricas.deltaTotal}
              />
              <MetricCell
                lbl="Servicios"
                value={loading? <Skeleton w={60} h={28}/> : <span style={{fontFamily:'var(--serif)',fontSize:28,fontWeight:500,letterSpacing:-.5}} className="num">{metricas.svcs}</span>}
                sub="realizados"
              />
              <MetricCell
                lbl="Ticket promedio"
                value={loading? <Skeleton w={120} h={28}/> : <Money amount={Math.round(metricas.tick)} size={28}/>}
                sub="por servicio"
                delta={metricas.deltaTick}
              />
              <MetricCell
                lbl="Turnos abiertos"
                value={loading? <Skeleton w={30} h={28}/> : <span style={{fontFamily:'var(--serif)',fontSize:28,fontWeight:500,color:metricas.abiertos>0?'var(--clay)':'var(--ink-0)'}} className="num">{metricas.abiertos}</span>}
                sub={metricas.abiertos>0?'pendiente de cerrar':'ninguno abierto'}
              />
            </div>

            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--ink-3)'}}>Últimos turnos</div>
              <div style={{fontSize:11,color:'var(--ink-3)'}}>{turnos.length} {turnos.length===1?'turno':'turnos'}</div>
            </div>

            {/* Lista de turnos */}
            {loading ? (
              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,padding:'48px 24px',textAlign:'center',color:'var(--ink-3)',fontSize:13}}>
                Cargando turnos…
              </div>
            ) : turnos.length === 0 ? (
              <EmptyTurnos onAbrir={abrirTurno} abriendo={abriendo}/>
            ) : (
              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden'}}>
                {turnos.map((t,i)=>(<TurnoRowFn key={t.id} t={t} first={i===0} onClick={()=>abrirTurnoFila(t)}/>))}
              </div>
            )}
          </div>
        </div>
      </div>

      {modalRetro && (
        <Modal title="Capturar turno pasado" onClose={()=>setModalR(false)}>
          <FormRetroactivo onSave={capturarPasado} onCancel={()=>setModalR(false)}/>
        </Modal>
      )}
    </div>
  );
};

// ─── Formulario para turno retroactivo ───
const FormRetroactivo = ({onSave, onCancel}) => {
  // Default: ayer, 09:00
  const ayer = new Date(); ayer.setDate(ayer.getDate()-1);
  const [fecha, setFecha]       = React.useState(ayer.toISOString().slice(0,10));
  const [horaInicio, setHora]   = React.useState('09:00');
  const [saving, setSaving]     = React.useState(false);

  const fieldStyle = {width:'100%',padding:'9px 12px',fontSize:13,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontFamily:'inherit',color:'var(--ink-1)',boxSizing:'border-box'};
  const labelStyle = {display:'block',fontSize:11,fontWeight:600,letterSpacing:.4,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:6};

  const hoyStr = new Date().toISOString().slice(0,10);
  const fechaEnFuturo = fecha > hoyStr;
  const fechaEsHoy    = fecha === hoyStr;

  const guardar = async () => {
    if (!fecha) return notify('Selecciona una fecha','err');
    if (!horaInicio) return notify('Selecciona la hora de apertura','err');
    setSaving(true);
    await onSave({fecha, horaInicio});
    setSaving(false);
  };

  return (
    <>
      <div style={{padding:'12px 14px',background:'var(--sand-100)',border:'1px solid #ecd49a',borderRadius:8,fontSize:12.5,color:'#7a4e10',lineHeight:1.5,marginBottom:16}}>
        <Icon name="calendar" size={13} stroke={1.8} style={{verticalAlign:-2,marginRight:6}}/>
        Esto crea un turno con la <strong>fecha real del servicio</strong>. El sistema guarda aparte la fecha de captura. Úsalo solo si no se pudo registrar el día que pasó (falla de tablet, emergencia, etc.).
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 140px',gap:12,marginBottom:14}}>
        <div>
          <label style={labelStyle}>Fecha del turno (real)</label>
          <input type="date" value={fecha} max={hoyStr} onChange={e=>setFecha(e.target.value)} style={fieldStyle}/>
          {fechaEsHoy && <div style={{fontSize:11,color:'var(--ink-3)',marginTop:5}}>Es la fecha de hoy — igual funciona, pero podrías usar "Abrir turno" normal.</div>}
          {fechaEnFuturo && <div style={{fontSize:11,color:'var(--clay)',marginTop:5}}>⚠️ No se puede elegir fecha futura.</div>}
        </div>
        <div>
          <label style={labelStyle}>Hora de apertura</label>
          <input type="time" value={horaInicio} onChange={e=>setHora(e.target.value)} style={fieldStyle}/>
        </div>
      </div>

      <div style={{fontSize:11.5,color:'var(--ink-3)',lineHeight:1.5,marginBottom:10}}>
        Después podrás agregar los servicios vendidos y cerrar el turno como lo harías con uno normal.
      </div>

      <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:12,paddingTop:14,borderTop:'1px solid var(--line-1)'}}>
        <Btn variant="ghost" size="md" onClick={onCancel} disabled={saving}>Cancelar</Btn>
        <Btn variant="clay" size="md" icon="check" onClick={guardar} disabled={saving || fechaEnFuturo}>{saving?'Creando…':'Crear turno retroactivo'}</Btn>
      </div>
    </>
  );
};

// ─── Empty state ───
const EmptyTurnos = ({onAbrir, abriendo}) => (
  <div style={{background:'var(--paper-raised)',border:'1px dashed var(--line-1)',borderRadius:12,padding:'64px 24px',textAlign:'center'}}>
    <div style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:600,color:'var(--ink-0)',marginBottom:6}}>Aún no hay turnos</div>
    <div style={{fontSize:13,color:'var(--ink-2)',marginBottom:22,maxWidth:420,margin:'0 auto 22px'}}>
      Abre el primer turno del día para empezar a capturar servicios en el punto de venta.
    </div>
    <Btn variant="clay" size="lg" icon="plus" onClick={onAbrir} disabled={abriendo}>
      {abriendo ? 'Abriendo…' : 'Abrir primer turno'}
    </Btn>
  </div>
);

// ─── Row de turno ───
const TurnoRowFn = ({t, first, onClick}) => {
  const statusMap = {
    abierto:  { tone:'moss',    label:'ABIERTO',  dot:'var(--moss)' },
    cerrado:  { tone:'neutral', label:'Completo', dot:'var(--ink-4)' },
    parcial:  { tone:'amber',   label:'Parcial',  dot:'var(--amber)' },
  };
  const s = statusMap[t.estado] || statusMap.cerrado;
  const { label: fechaTxt } = fechaLabel(t.fecha);
  const horaInicio = t.hora_inicio || '—';
  const horaFin = t.hora_fin || (t.estado === 'abierto' ? 'en curso' : '—');

  // Retroactivo: creado después de la fecha del turno
  const retro = t.creado && t.fecha && (new Date(t.creado).toISOString().slice(0,10) > t.fecha);

  // Row gradient when abierto (destaca visualmente)
  const rowBg = t.estado==='abierto'
    ? 'linear-gradient(90deg, rgba(227,236,210,.5) 0%, transparent 40%)'
    : 'transparent';

  return (
    <div
      onClick={onClick}
      className="cf-turno-row"
      style={{display:'grid',gridTemplateColumns:'auto 1fr auto auto auto auto',alignItems:'center',gap:24,padding:'18px 22px',borderTop:first?'none':'1px solid var(--line-1)',background:rowBg,cursor:'pointer',transition:'background .15s'}}
      onMouseEnter={e=>{ if (t.estado!=='abierto') e.currentTarget.style.background='var(--paper-sunk)'; }}
      onMouseLeave={e=>{ if (t.estado!=='abierto') e.currentTarget.style.background='transparent'; }}
    >
      {/* Status dot + fecha */}
      <div className="cf-tr-fecha" style={{display:'flex',alignItems:'center',gap:12,minWidth:0}}>
        <div style={{width:8,height:8,borderRadius:999,background:s.dot,boxShadow:t.estado==='abierto'?'0 0 0 4px rgba(79,107,58,.18)':'none',flexShrink:0}}/>
        <div style={{minWidth:0}}>
          <div style={{fontSize:14,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.1,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
            {fechaTxt}
            {retro && <span title={`Capturado retroactivo el ${new Date(t.creado).toLocaleDateString('es-MX')}`} style={{fontSize:9,fontWeight:700,letterSpacing:.4,textTransform:'uppercase',color:'var(--amber)',background:'rgba(176,114,40,.12)',padding:'2px 6px',borderRadius:4,border:'1px solid rgba(176,114,40,.3)'}}>Retro</span>}
            {Number(t.reaperturas)>0 && <span title={t.reabierto_at?`Última reapertura: ${new Date(t.reabierto_at).toLocaleDateString('es-MX')}`:'Reabierto'} style={{fontSize:9,fontWeight:700,letterSpacing:.4,textTransform:'uppercase',color:'#b07228',background:'rgba(176,114,40,.08)',padding:'2px 6px',borderRadius:4,border:'1px solid rgba(176,114,40,.25)'}}>Reabierto {t.reaperturas}×</span>}
          </div>
          <div style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>{horaInicio} – {horaFin}{t.encargada_nombre?` · ${t.encargada_nombre.split(' ')[0]}`:''} · {t.n_servicios||0} svc</div>
        </div>
      </div>

      {/* Timeline bar */}
      <div className="cf-hide-narrow" style={{position:'relative',height:6,background:'var(--paper-sunk)',borderRadius:3,overflow:'hidden'}}>
        <TimelineBarFn inicio={t.hora_inicio} fin={t.hora_fin} abierto={t.estado==='abierto'}/>
      </div>

      {/* Encargada (solo desktop) */}
      <div className="cf-hide-narrow" style={{display:'flex',alignItems:'center',gap:7,minWidth:110}}>
        {t.encargada_nombre ? (
          <>
            <Av name={t.encargada_nombre} tone={(t.encargada_nombre||'').charAt(0).toUpperCase()>='L'?'moss':'clay'} size={22}/>
            <span style={{fontSize:12,color:'var(--ink-2)'}}>{t.encargada_nombre.split(' ')[0]}</span>
          </>
        ) : (
          <span style={{fontSize:12,color:'var(--ink-3)',fontStyle:'italic'}}>sin encargado</span>
        )}
      </div>

      {/* Servicios (solo desktop) */}
      <div className="num cf-hide-narrow" style={{fontSize:13,color:'var(--ink-2)',minWidth:70,textAlign:'right'}}>
        <span style={{fontWeight:600,color:'var(--ink-0)'}}>{t.n_servicios||0}</span> svc
      </div>

      {/* Resumen V / C / N */}
      {(() => {
        const v = Number(t.total_mxn || 0);
        const c = Number(t.comisiones_mxn || 0) + Number(t.comisiones_venta_mxn || 0);
        const n = v - c;
        const fmt = (x) => '$' + Math.round(x).toLocaleString('es-MX');
        return (
          <div className="cf-tr-vcn num" style={{minWidth:0,textAlign:'right',fontSize:11.5,lineHeight:1.45}}>
            <div style={{color:'var(--ink-1)',fontWeight:600}}>V = <span style={{fontFamily:'var(--serif)',fontSize:13}}>{fmt(v)}</span></div>
            <div style={{color:'var(--clay)'}}>C = <span style={{fontFamily:'var(--serif)',fontSize:13}}>{fmt(c)}</span></div>
            <div style={{color:'var(--moss)',fontWeight:700}}>N = <span style={{fontFamily:'var(--serif)',fontSize:13}}>{fmt(n)}</span></div>
          </div>
        );
      })()}

      {/* Estado + pendientes + arqueo */}
      <div className="cf-tr-estado" style={{minWidth:0,textAlign:'right'}}>
        <Chip tone={s.tone}>{s.label}</Chip>
        {Number(t.n_pagos_pendientes)>0 && (
          <div style={{fontSize:10,color:'var(--amber)',fontWeight:600,marginTop:4}}>
            {t.n_pagos_pendientes} pago{t.n_pagos_pendientes>1?'s':''} pendiente{t.n_pagos_pendientes>1?'s':''}
          </div>
        )}
        {/* Estado arqueo */}
        {t.arqueoStatus && t.arqueoStatus !== 'pendiente' && (
          <ArqueoChip status={t.arqueoStatus} difMxn={t.arqueoDifMxn || 0}/>
        )}
      </div>
    </div>
  );
};

// ─── Chip de estado de arqueo ───
const ArqueoChip = ({status, difMxn}) => {
  const fmt = (n) => '$' + Math.abs(Math.round(n)).toLocaleString('es-MX');
  if (status === 'cuadra') {
    return <div style={{marginTop:4,display:'inline-flex',alignItems:'center',gap:4,fontSize:10,fontWeight:700,color:'var(--moss)',background:'rgba(107,125,74,.12)',padding:'2px 7px',borderRadius:4,border:'1px solid rgba(107,125,74,.3)'}}>✓ Cuadró</div>;
  }
  if (status === 'sobra') {
    return <div style={{marginTop:4,display:'inline-flex',alignItems:'center',gap:4,fontSize:10,fontWeight:700,color:'var(--moss)',background:'rgba(107,125,74,.08)',padding:'2px 7px',borderRadius:4,border:'1px solid rgba(107,125,74,.25)'}} title="Sobrante">↑ Sobró {fmt(difMxn)}</div>;
  }
  if (status === 'falta') {
    return <div style={{marginTop:4,display:'inline-flex',alignItems:'center',gap:4,fontSize:10,fontWeight:700,color:'#b73f5e',background:'rgba(212,83,126,.1)',padding:'2px 7px',borderRadius:4,border:'1px solid rgba(212,83,126,.3)'}} title="Faltante">↓ Faltó {fmt(difMxn)}</div>;
  }
  if (status === 'parcial') {
    return <div style={{marginTop:4,fontSize:10,color:'var(--ink-3)',fontStyle:'italic'}}>arqueo parcial</div>;
  }
  return null;
};

// ─── Timeline bar ───
const TimelineBarFn = ({inicio, fin, abierto}) => {
  if (!inicio) return null;
  const toMin = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
  const now = new Date();
  const nowMin = now.getHours()*60 + now.getMinutes();
  const open  = toMin(inicio);
  const close = fin ? toMin(fin) : (abierto ? nowMin : toMin('16:30'));
  const dayStart = 8*60, dayEnd = 22*60;
  const left  = Math.max(0, ((open - dayStart) / (dayEnd - dayStart)) * 100);
  const width = Math.max(2, ((close - open) / (dayEnd - dayStart)) * 100);
  return (
    <>
      <div style={{position:'absolute',left:left+'%',width:width+'%',top:0,bottom:0,background:abierto?'var(--moss)':'var(--ink-4)',borderRadius:3}}/>
      {abierto && (
        <div style={{position:'absolute',left:`calc(${left+width}% - 3px)`,top:-2,width:10,height:10,borderRadius:999,background:'var(--moss)',boxShadow:'0 0 0 3px rgba(79,107,58,.25)'}}/>
      )}
    </>
  );
};

// ─── Skeleton ───
const SkeletonT = ({w=80, h=14}) => (
  <div style={{width:w,height:h,background:'var(--line-1)',borderRadius:4,opacity:.5,display:'inline-block'}}/>
);

// Sobreescribe el mock
Object.assign(window, { TurnosList: TurnosListFn, TurnoRowFn, TimelineBarFn });
