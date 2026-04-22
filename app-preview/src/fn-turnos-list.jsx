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

  const cargar = React.useCallback(async () => {
    setLoading(true);
    const { data, error } = await sb.from('v_turnos_resumen')
      .select('*')
      .order('fecha', { ascending: false })
      .order('hora_inicio', { ascending: false })
      .limit(30);
    if (error) { notify('Error cargando turnos: '+error.message, 'err'); setLoading(false); return; }
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
    if (t.estado === 'abierto') navigate('turnos/pv/' + t.id);
    else navigate('turnos/recibo/' + t.id);
  };

  return (
    <div style={{width:'100%',height:'100%',display:'flex',fontFamily:'var(--sans)',background:'var(--paper)',color:'var(--ink-1)'}}>
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        <div style={{padding:'28px 36px 0',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16}}>
          <div>
            <div style={{fontFamily:'var(--serif)',fontSize:34,fontWeight:500,letterSpacing:-.8,color:'var(--ink-0)',lineHeight:1}}>Turnos</div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:6}}>Operación diaria · punto de venta</div>
          </div>
          <Btn variant="clay" icon="plus" size="lg" onClick={abrirTurno} disabled={abriendo}>
            {abriendo ? 'Abriendo…' : 'Abrir turno'}
          </Btn>
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
    </div>
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

  // Row gradient when abierto (destaca visualmente)
  const rowBg = t.estado==='abierto'
    ? 'linear-gradient(90deg, rgba(227,236,210,.5) 0%, transparent 40%)'
    : 'transparent';

  return (
    <div
      onClick={onClick}
      style={{display:'grid',gridTemplateColumns:'auto 1fr auto auto auto auto',alignItems:'center',gap:24,padding:'18px 22px',borderTop:first?'none':'1px solid var(--line-1)',background:rowBg,cursor:'pointer',transition:'background .15s'}}
      onMouseEnter={e=>{ if (t.estado!=='abierto') e.currentTarget.style.background='var(--paper-sunk)'; }}
      onMouseLeave={e=>{ if (t.estado!=='abierto') e.currentTarget.style.background='transparent'; }}
    >
      {/* Status dot + fecha */}
      <div style={{display:'flex',alignItems:'center',gap:12,minWidth:160}}>
        <div style={{width:8,height:8,borderRadius:999,background:s.dot,boxShadow:t.estado==='abierto'?'0 0 0 4px rgba(79,107,58,.18)':'none'}}/>
        <div>
          <div style={{fontSize:14,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.1}}>{fechaTxt}</div>
          <div style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>{horaInicio} – {horaFin}</div>
        </div>
      </div>

      {/* Timeline bar */}
      <div style={{position:'relative',height:6,background:'var(--paper-sunk)',borderRadius:3,overflow:'hidden'}}>
        <TimelineBarFn inicio={t.hora_inicio} fin={t.hora_fin} abierto={t.estado==='abierto'}/>
      </div>

      {/* Encargada */}
      <div style={{display:'flex',alignItems:'center',gap:7,minWidth:110}}>
        {t.encargada_nombre ? (
          <>
            <Av name={t.encargada_nombre} tone={(t.encargada_nombre||'').charAt(0).toUpperCase()>='L'?'moss':'clay'} size={22}/>
            <span style={{fontSize:12,color:'var(--ink-2)'}}>{t.encargada_nombre.split(' ')[0]}</span>
          </>
        ) : (
          <span style={{fontSize:12,color:'var(--ink-3)',fontStyle:'italic'}}>sin encargada</span>
        )}
      </div>

      {/* Servicios */}
      <div className="num" style={{fontSize:13,color:'var(--ink-2)',minWidth:70,textAlign:'right'}}>
        <span style={{fontWeight:600,color:'var(--ink-0)'}}>{t.n_servicios||0}</span> svc
      </div>

      {/* Total */}
      <div style={{minWidth:120,textAlign:'right'}}>
        <Money amount={Number(t.total_mxn||0)} size={18} weight={600}/>
      </div>

      {/* Estado + pendientes */}
      <div style={{minWidth:92,textAlign:'right'}}>
        <Chip tone={s.tone}>{s.label}</Chip>
        {Number(t.n_pagos_pendientes)>0 && (
          <div style={{fontSize:10,color:'var(--amber)',fontWeight:600,marginTop:4}}>
            {t.n_pagos_pendientes} pago{t.n_pagos_pendientes>1?'s':''} pendiente{t.n_pagos_pendientes>1?'s':''}
          </div>
        )}
      </div>
    </div>
  );
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
