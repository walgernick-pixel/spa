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
// Helpers de rangos de fecha para filtros del listado
const rangoTurnos = (preset, customDesde, customHasta) => {
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const fin23 = (d) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };
  const ini00 = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
  const diaSemISO = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1;
  switch (preset) {
    case 'hoy':
      return { desde: hoy, hasta: fin23(hoy) };
    case 'semana': {
      const ini = new Date(hoy); ini.setDate(hoy.getDate() - diaSemISO);
      const fin = new Date(ini); fin.setDate(ini.getDate() + 6);
      return { desde: ini00(ini), hasta: fin23(fin) };
    }
    case 'semana_pasada': {
      const ini = new Date(hoy); ini.setDate(hoy.getDate() - diaSemISO - 7);
      const fin = new Date(ini); fin.setDate(ini.getDate() + 6);
      return { desde: ini00(ini), hasta: fin23(fin) };
    }
    case 'mes': {
      const ini = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      return { desde: ini00(ini), hasta: fin23(fin) };
    }
    case 'mes_pasado': {
      const ini = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
      return { desde: ini00(ini), hasta: fin23(fin) };
    }
    case 'ult_30': {
      const ini = new Date(hoy); ini.setDate(hoy.getDate() - 29);
      return { desde: ini00(ini), hasta: fin23(hoy) };
    }
    case 'custom':
      return {
        desde: customDesde ? ini00(new Date(customDesde + 'T12:00:00')) : null,
        hasta: customHasta ? fin23(new Date(customHasta + 'T12:00:00')) : null,
      };
    case 'todo':
    default:
      return { desde: null, hasta: null };
  }
};

const PRESETS_RANGO = [
  { id:'hoy',           label:'Hoy' },
  { id:'semana',        label:'Esta semana' },
  { id:'semana_pasada', label:'Semana pasada' },
  { id:'mes',           label:'Este mes' },
  { id:'mes_pasado',    label:'Mes pasado' },
  { id:'ult_30',        label:'Últimos 30 días' },
  { id:'todo',          label:'Todo' },
  { id:'custom',        label:'Personalizado' },
];

const rangoPrevio = (rango) => {
  if (!rango || !rango.desde || !rango.hasta) return null;
  const dur = rango.hasta - rango.desde;
  const desde = new Date(rango.desde.getTime() - dur - 1);
  const hasta = new Date(rango.desde.getTime() - 1);
  desde.setHours(0,0,0,0);
  hasta.setHours(23,59,59,999);
  return { desde, hasta };
};

const inRangoIso = (iso, r) => {
  if (!r) return true;
  if (!r.desde && !r.hasta) return true;
  const f = new Date(iso + 'T12:00:00');
  if (r.desde && f < r.desde) return false;
  if (r.hasta && f > r.hasta) return false;
  return true;
};

// Métricas reactivas al rango filtrado
const useMetricasRango = (turnos, rango) => {
  return React.useMemo(() => {
    const enRango  = turnos.filter(t => inRangoIso(t.fecha, rango));
    const prev     = rangoPrevio(rango);
    const enPrev   = prev ? turnos.filter(t => inRangoIso(t.fecha, prev)) : [];

    const total    = enRango.reduce((a,b)=>a+Number(b.total_mxn||0),0);
    const totalPrev= enPrev.reduce((a,b)=>a+Number(b.total_mxn||0),0);
    const svcs     = enRango.reduce((a,b)=>a+Number(b.n_servicios||0),0);
    const svcsPrev = enPrev.reduce((a,b)=>a+Number(b.n_servicios||0),0);
    const tick     = svcs>0 ? total/svcs : 0;
    const tickPrev = svcsPrev>0 ? totalPrev/svcsPrev : 0;
    const nTurnos  = enRango.length;
    const abiertos = turnos.filter(t => t.estado === 'abierto').length;

    const pct = (a, b) => b>0 ? Math.round((a-b)/b*100) : null;
    return {
      total, totalPrev, svcs, tick, nTurnos, abiertos,
      deltaTotal: prev ? pct(total, totalPrev) : null,
      deltaTick:  prev ? pct(tick, tickPrev)  : null,
      hasPrev: !!prev,
    };
  }, [turnos, rango]);
};

// ─── Pantalla principal ───
const TurnosListFn = () => {
  const [turnos, setTurnos]       = React.useState([]);
  const [perfilesMap, setPfMap]   = React.useState({}); // id → {nombre_display, username}
  const [loading, setLoading]     = React.useState(true);
  const showLoading               = useDelayedLoading(loading);
  const [abriendo, setAbriendo]   = React.useState(false);
  const abriendoRef               = React.useRef(false);
  const [modalRetro, setModalR]   = React.useState(false);
  const [preset, setPreset]       = React.useState('semana');
  const [customDesde, setCustomD] = React.useState('');
  const [customHasta, setCustomH] = React.useState('');
  const [estadoF, setEstadoF]     = React.useState('todos'); // todos | abierto | cerrado
  const [search, setSearch]       = React.useState('');
  const [pendingTurnoIds, setPendingIds] = React.useState(new Set());

  // Refrescar set de turnos con operaciones pendientes en cola.
  // Se usa para mostrar chip "⟳ sync pendiente" en la lista.
  const refreshPending = React.useCallback(async () => {
    if (!window.getPending) return;
    const ops = await window.getPending();
    const ids = new Set();
    ops.forEach(op => {
      // Update/delete directo a la tabla turnos
      if (op.table === 'turnos') {
        if (op.filter?.id) ids.add(op.filter.id);
        if (op.payload?.id) ids.add(op.payload.id);
      }
      // Inserts/upserts/updates relacionados a un turno (ventas, arqueos, etc)
      if (op.payload?.turno_id) ids.add(op.payload.turno_id);
      if (op.filter?.turno_id) ids.add(op.filter.turno_id);
    });
    setPendingIds(ids);
  }, []);

  React.useEffect(() => {
    refreshPending();
    if (!window.onQueueChange) return;
    return window.onQueueChange(refreshPending);
  }, [refreshPending]);

  const cargar = React.useCallback(async () => {
    setLoading(true);

    // Helper: si offline o si la query falla por red, cae a cache de IDB.
    const fallbackToCache = async () => {
      const cached = await window.leerTurnosListCache();
      setTurnos(cached);
      setLoading(false);
    };

    // Si offline desde el inicio, ni intentamos red.
    if (!navigator.onLine) {
      await fallbackToCache();
      return;
    }

    let turnosQ, perfilesQ;
    try {
      [turnosQ, perfilesQ] = await Promise.all([
        sb.from('v_turnos_resumen').select('*').order('fecha',{ascending:false}).order('hora_inicio',{ascending:false}).limit(500),
        sb.from('perfiles').select('id, nombre_display, username'),
      ]);
    } catch (_) { return fallbackToCache(); }

    const { data, error } = turnosQ;
    if (error) {
      // Si es error de red, cae a cache silenciosamente. Si es otro tipo
      // (ej. permisos), mostramos toast.
      if (/network|fetch|failed to fetch|abort|connection/i.test(error.message || '')) {
        return fallbackToCache();
      }
      notify('Error cargando turnos: '+error.message, 'err');
      setLoading(false);
      return;
    }
    const pm = {}; (perfilesQ.data || []).forEach(p => { pm[p.id] = p; });
    setPfMap(pm);
    // Enriquecer cada turno: si la vista no trajo nombres, usar lookup local
    (data || []).forEach(t => {
      if (!t.encargada_nombre && t.encargada_id && pm[t.encargada_id]) {
        t.encargada_nombre = pm[t.encargada_id].nombre_display;
      }
      if (!t.abierto_por_nombre && t.abierto_por && pm[t.abierto_por]) {
        t.abierto_por_nombre = pm[t.abierto_por].nombre_display;
      }
    });
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

    // Cachear lista enriquecida para vista offline. Próxima vez que se
    // abra el módulo sin red, mostramos esto en vez de error vacío.
    if (window.cacheTurnosList) window.cacheTurnosList(data || []);

    // Snapshot proactivo del turno abierto: si la encargada corta la red
    // sin haber entrado al PV todavía, igual podrá abrirlo offline (lee
    // este snapshot). Sólo hay 1 abierto a la vez, costo trivial.
    const abierto = (data || []).find(t => t.estado === 'abierto');
    if (abierto && navigator.onLine) {
      // Fire-and-forget: no bloquea el render
      (async () => {
        try {
          const [tFull, vFull, tcFull, arFull] = await Promise.all([
            sb.from('turnos').select('*').eq('id', abierto.id).single(),
            sb.from('v_ventas').select('*').eq('turno_id', abierto.id).order('creado',{ascending:false}),
            sb.from('turno_colaboradoras').select('*').eq('turno_id', abierto.id),
            sb.from('arqueos').select('*').eq('turno_id', abierto.id),
          ]);
          if (tFull.error || !tFull.data) return;
          const ventas = vFull.data || [];
          const ventaIds = ventas.map(x => x.id);
          let pagos = [];
          if (ventaIds.length > 0) {
            const pp = await sb.from('venta_pagos').select('*').in('venta_id', ventaIds);
            pagos = pp.data || [];
          }
          await window.snapshotTurno(abierto.id, {
            turno: tFull.data,
            ventas,
            ventaPagos: pagos,
            turnoColabs: tcFull.data || [],
            arqueos: arFull.data || [],
          });
        } catch (_) { /* offline o error: skip silently */ }
      })();
    }
  }, []);

  React.useEffect(() => { cargar(); }, [cargar]);

  const rango = React.useMemo(
    () => rangoTurnos(preset, customDesde, customHasta),
    [preset, customDesde, customHasta]
  );

  const turnosFiltrados = React.useMemo(() => {
    const s = search.trim().toLowerCase();
    return turnos.filter(t => {
      if (!inRangoIso(t.fecha, rango)) return false;
      if (estadoF !== 'todos' && t.estado !== estadoF) return false;
      if (s) {
        const enc = (t.encargada_nombre || '').toLowerCase();
        const fol = String(t.folio || '').toLowerCase();
        const fec = (t.fecha || '');
        if (!enc.includes(s) && !fol.includes(s) && !fec.includes(s)) return false;
      }
      return true;
    });
  }, [turnos, rango, estadoF, search]);

  const metricas = useMetricasRango(turnosFiltrados, rango);

  const labelPreset = (PRESETS_RANGO.find(p => p.id === preset) || {}).label || 'Periodo';
  const limpiarFiltros = () => { setPreset('semana'); setCustomD(''); setCustomH(''); setEstadoF('todos'); setSearch(''); };
  const hayFiltros = preset !== 'semana' || estadoF !== 'todos' || search;

  const abrirTurno = async () => {
    // Lock síncrono con ref: bloquea clicks rápidos antes de que el state
    // alcance a propagarse. Sin esto, varios clicks rápidos pasan el guard
    // y llegan al insert en paralelo (race condition que generaba turnos
    // duplicados). El índice único parcial server-side (mig 27) es la red
    // de seguridad si esto fallara.
    if (abriendoRef.current) return;
    abriendoRef.current = true;
    setAbriendo(true);
    try {
      // Validar: no puede haber otro turno abierto. Solo si hay net —
      // offline confiamos en que el usuario sabe lo que hace y que el
      // índice único atrapará el caso al sincronizar.
      if (navigator.onLine) {
        const { data: abiertos } = await sb.from('turnos').select('id,folio').eq('estado','abierto').limit(1);
        if (abiertos && abiertos.length > 0) {
          notify(`Ya hay un turno abierto (${abiertos[0].folio || '#'+abiertos[0].id.slice(0,6)}). Ciérralo antes de abrir otro.`, 'warn');
          return;
        }
      }

      const { data: user } = navigator.onLine ? await sb.auth.getUser() : {data:{user:null}};
      const ahora = new Date();
      const hoy   = localDateISO(ahora);
      const hora  = `${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`;
      // Si offline, usar el perfil cacheado de window.__auth (mig fn-auth)
      const uid   = user?.user?.id || window.__auth?.perfil?.id || null;

      const nuevo = {
        fecha: hoy,
        hora_inicio: hora,
        estado: 'abierto',
        encargada_id: uid,
        abierto_por: uid,
      };

      // sbInsert genera UUID cliente si falta y maneja online/offline.
      const { data, error, fromQueue } = await window.sbInsert('turnos', nuevo, {select:'*', single:true});
      if (error) { notify('No se pudo abrir el turno: '+error.message, 'err'); return; }
      if (fromQueue) notify('Turno abierto (offline · se sincroniza al volver)', 'warn');
      else           notify('Turno abierto ✓');
      // Ir al PV del turno recién creado (data.id existe en ambos casos)
      navigate('turnos/pv/' + data.id);
    } finally {
      abriendoRef.current = false;
      setAbriendo(false);
    }
  };

  const abrirTurnoFila = (t) => {
    // Abierto o cerrado, ambos van al PV. Si está cerrado, el PV se muestra
    // en modo solo-lectura (sin botones de editar/borrar/agregar).
    navigate('turnos/pv/' + t.id);
  };

  // Capturar turno retroactivo (fecha en el pasado)
  const capturarPasado = async ({fecha, horaInicio}) => {
    const { data: user } = await sb.auth.getUser();
    const uid = user?.user?.id || null;
    const nuevo = {
      fecha: fecha,
      hora_inicio: horaInicio,
      estado: 'abierto',
      encargada_id: uid,
      abierto_por: uid,
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
            {/* Filtros: periodo + estado + búsqueda */}
            <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',marginBottom:18}}>
              <div style={{position:'relative',flex:'0 1 280px'}}>
                <Icon name="search" size={14} style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--ink-3)'}}/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar folio, responsable, fecha..." style={{width:'100%',padding:'9px 12px 9px 32px',fontSize:13,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontFamily:'inherit',color:'var(--ink-1)',boxSizing:'border-box'}}/>
              </div>
              <FilterSelect label="Periodo" value={preset} onChange={setPreset} options={PRESETS_RANGO.map(p=>({value:p.id,label:p.label}))}/>
              {preset==='custom' && (
                <>
                  <input type="date" value={customDesde} onChange={e=>setCustomD(e.target.value)} style={{padding:'8px 10px',fontSize:12,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontFamily:'inherit',color:'var(--ink-1)'}}/>
                  <span style={{fontSize:12,color:'var(--ink-3)'}}>→</span>
                  <input type="date" value={customHasta} onChange={e=>setCustomH(e.target.value)} style={{padding:'8px 10px',fontSize:12,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontFamily:'inherit',color:'var(--ink-1)'}}/>
                </>
              )}
              <FilterSelect label="Estado" value={estadoF} onChange={setEstadoF} options={[
                {value:'todos',label:'Todos'},
                {value:'abierto',label:'Abierto'},
                {value:'cerrado',label:'Cerrado'},
              ]}/>
              {hayFiltros && (
                <button onClick={limpiarFiltros} style={{marginLeft:'auto',background:'transparent',border:'none',fontSize:12,color:'var(--ink-3)',cursor:'pointer',fontFamily:'inherit',fontWeight:500,textDecoration:'underline',textUnderlineOffset:3}}>Limpiar filtros</button>
              )}
            </div>

            {/* Métricas reactivas al rango filtrado */}
            <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr 1fr 1fr',gap:1,background:'var(--line-1)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden',marginBottom:28}}>
              <MetricCell
                lbl={`Ventas · ${labelPreset}`}
                value={loading? <Skeleton w={140} h={28}/> : <Money amount={metricas.total} size={28}/>}
                sub={metricas.hasPrev ? (metricas.deltaTotal!==null ? 'vs período anterior' : 'sin período previo') : 'período total'}
                delta={metricas.deltaTotal}
              />
              <MetricCell
                lbl="Servicios"
                value={loading? <Skeleton w={60} h={28}/> : <span style={{fontFamily:'var(--serif)',fontSize:28,fontWeight:500,letterSpacing:-.5}} className="num">{metricas.svcs}</span>}
                sub={`en ${metricas.nTurnos} ${metricas.nTurnos===1?'turno':'turnos'}`}
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
              <div style={{fontSize:11,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--ink-3)'}}>Turnos en {labelPreset.toLowerCase()}</div>
              <div style={{fontSize:11,color:'var(--ink-3)'}}>{turnosFiltrados.length} {turnosFiltrados.length===1?'turno':'turnos'}{turnosFiltrados.length!==turnos.length && ` de ${turnos.length}`}</div>
            </div>

            {/* Lista de turnos */}
            {loading ? (
              showLoading ? (
                <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,padding:'48px 24px',textAlign:'center',color:'var(--ink-3)',fontSize:13}}>
                  Cargando turnos…
                </div>
              ) : null
            ) : turnos.length === 0 ? (
              <EmptyTurnos onAbrir={abrirTurno} abriendo={abriendo}/>
            ) : turnosFiltrados.length === 0 ? (
              <div style={{background:'var(--paper-raised)',border:'1px dashed var(--line-1)',borderRadius:12,padding:'48px 24px',textAlign:'center'}}>
                <div style={{fontFamily:'var(--serif)',fontSize:20,fontWeight:600,color:'var(--ink-0)',marginBottom:6}}>No hay turnos con estos filtros</div>
                <div style={{fontSize:13,color:'var(--ink-2)',marginBottom:16}}>Prueba ampliando el período o cambiando los filtros.</div>
                <Btn variant="ghost" size="md" onClick={limpiarFiltros}>Limpiar filtros</Btn>
              </div>
            ) : (
              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden'}}>
                {turnosFiltrados.map((t,i)=>(<TurnoRowFn key={t.id} t={t} first={i===0} pendingSync={pendingTurnoIds.has(t.id)} onClick={()=>abrirTurnoFila(t)}/>))}
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
  const [fecha, setFecha]       = React.useState(localDateISO(ayer));
  const [horaInicio, setHora]   = React.useState('09:00');
  const [saving, setSaving]     = React.useState(false);

  const fieldStyle = {width:'100%',padding:'9px 12px',fontSize:13,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontFamily:'inherit',color:'var(--ink-1)',boxSizing:'border-box'};
  const labelStyle = {display:'block',fontSize:11,fontWeight:600,letterSpacing:.4,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:6};

  const hoyStr = localDateISO();
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
const TurnoRowFn = ({t, first, pendingSync, onClick}) => {
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
  const retro = t.creado && t.fecha && (localDateISO(new Date(t.creado)) > t.fecha);

  // Row gradient when abierto (destaca visualmente)
  const rowBg = t.estado==='abierto'
    ? 'linear-gradient(90deg, rgba(227,236,210,.5) 0%, transparent 40%)'
    : 'transparent';

  return (
    <div
      onClick={onClick}
      className="cf-turno-row"
      style={{display:'grid',gridTemplateColumns:'auto 1fr auto auto auto',alignItems:'center',gap:24,padding:'18px 22px',borderTop:first?'none':'1px solid var(--line-1)',background:rowBg,cursor:'pointer',transition:'background .15s'}}
      onMouseEnter={e=>{ if (t.estado!=='abierto') e.currentTarget.style.background='var(--paper-sunk)'; }}
      onMouseLeave={e=>{ if (t.estado!=='abierto') e.currentTarget.style.background='transparent'; }}
    >
      {/* Status dot + fecha + horario (sin "X svc" — ya hay columna dedicada) */}
      <div className="cf-tr-fecha" style={{display:'flex',alignItems:'center',gap:12,minWidth:0}}>
        <div style={{width:8,height:8,borderRadius:999,background:s.dot,boxShadow:t.estado==='abierto'?'0 0 0 4px rgba(79,107,58,.18)':'none',flexShrink:0}}/>
        <div style={{minWidth:0}}>
          <div style={{fontSize:14,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.1,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
            {fechaTxt}
            {retro && <span title={`Capturado retroactivo el ${new Date(t.creado).toLocaleDateString('es-MX')}`} style={{fontSize:9,fontWeight:700,letterSpacing:.4,textTransform:'uppercase',color:'var(--amber)',background:'rgba(176,114,40,.12)',padding:'2px 6px',borderRadius:4,border:'1px solid rgba(176,114,40,.3)'}}>Retro</span>}
            {Number(t.reaperturas)>0 && <span title={t.reabierto_at?`Última reapertura: ${new Date(t.reabierto_at).toLocaleDateString('es-MX')}`:'Reabierto'} style={{fontSize:9,fontWeight:700,letterSpacing:.4,textTransform:'uppercase',color:'#b07228',background:'rgba(176,114,40,.08)',padding:'2px 6px',borderRadius:4,border:'1px solid rgba(176,114,40,.25)'}}>Reabierto {t.reaperturas}×</span>}
            {pendingSync && <span title="Hay operaciones de este turno pendientes de sincronizar a la nube" style={{fontSize:9,fontWeight:700,letterSpacing:.4,textTransform:'uppercase',color:'#b07228',background:'rgba(176,114,40,.12)',padding:'2px 6px',borderRadius:4,border:'1px solid rgba(176,114,40,.3)',display:'inline-flex',alignItems:'center',gap:3}}>⟳ Sync pendiente</span>}
          </div>
          <div style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>{horaInicio} – {horaFin}</div>
        </div>
      </div>

      {/* Encargada + quién abrió (si difiere) */}
      <div className="cf-hide-narrow" style={{display:'flex',alignItems:'center',gap:7,minWidth:140}}>
        {t.encargada_nombre ? (
          <>
            <Av name={t.encargada_nombre} tone={(t.encargada_nombre||'').charAt(0).toUpperCase()>='L'?'moss':'clay'} size={22}/>
            <div style={{display:'flex',flexDirection:'column',lineHeight:1.15}}>
              <span style={{fontSize:9,color:'var(--ink-3)',fontWeight:600,letterSpacing:.4,textTransform:'uppercase'}}>Responsable</span>
              <span style={{fontSize:12,color:'var(--ink-1)',fontWeight:600}}>{t.encargada_nombre.split(' ')[0]}</span>
              {t.abierto_por_nombre && t.abierto_por && t.abierto_por !== t.encargada_id && (
                <span style={{fontSize:10,color:'var(--ink-3)',marginTop:1}} title={`Click en abrir turno: ${t.abierto_por_nombre}`}>
                  abrió {t.abierto_por_nombre.split(' ')[0]}
                </span>
              )}
            </div>
          </>
        ) : (
          <span style={{fontSize:12,color:'var(--ink-3)',fontStyle:'italic'}}>sin responsable</span>
        )}
      </div>

      {/* Servicios */}
      <div className="num cf-hide-narrow" style={{fontSize:13,color:'var(--ink-2)',minWidth:60,textAlign:'right'}}>
        <span style={{fontWeight:600,color:'var(--ink-0)'}}>{t.n_servicios||0}</span> svc
      </div>

      {/* Resumen V / C / N */}
      {(() => {
        const v = Number(t.total_mxn || 0);
        const d = Number(t.descuentos_mxn || 0);
        const c = Number(t.comisiones_mxn || 0) + Number(t.comisiones_venta_mxn || 0);
        const n = v - d - c;
        const fmt = (x) => '$' + Math.round(x).toLocaleString('es-MX');
        return (
          <div className="cf-tr-vcn num" style={{minWidth:0,textAlign:'right',fontSize:11.5,lineHeight:1.45}}>
            <div style={{color:'var(--ink-1)',fontWeight:600}}>V = <span style={{fontFamily:'var(--serif)',fontSize:13}}>{fmt(v)}</span></div>
            {d > 0 && <div style={{color:'var(--ink-3)'}} title="Descuentos otorgados">D = <span style={{fontFamily:'var(--serif)',fontSize:13}}>{fmt(d)}</span></div>}
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

// Sobreescribe el mock
Object.assign(window, { TurnosList: TurnosListFn, TurnoRowFn });
