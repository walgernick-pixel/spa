// ──────────────────────────────────────────
// Arqueo del turno — captura de efectivo físico por moneda
// Reemplaza Arqueo mock. Lee turno_id del hash (turnos/arqueo/:id).
// ──────────────────────────────────────────

const ArqueoFn = () => {
  // turno_id sale del hash: #turnos/arqueo/<id>
  const parts = (window.location.hash || '').replace(/^#\/?/, '').split('/');
  const turnoId = parts[2] || null;

  const [turno, setTurno]           = React.useState(null);
  const [ventas, setVentas]         = React.useState([]);
  const [ventaPagos, setVentaPagos] = React.useState([]);
  const [cuentas, setCuentas]       = React.useState([]);
  const [monedas, setMonedas]       = React.useState({});
  const [turnoColabs, setTurnoCol]  = React.useState([]);
  const [arqueos, setArqueos]       = React.useState([]); // existentes
  const [reportados, setReportados] = React.useState({}); // {MXN: "2500", USD: "100"}
  const [notas, setNotas]           = React.useState('');
  const [loading, setLoading]       = React.useState(true);
  const [saving, setSaving]         = React.useState(false);
  const [cerrando, setCerrando]     = React.useState(false);

  const cargar = React.useCallback(async () => {
    if (!turnoId) { setLoading(false); return; }
    setLoading(true);
    const [t, v, cu, mo, tc, ar] = await Promise.all([
      sb.from('turnos').select('*').eq('id', turnoId).single(),
      sb.from('v_ventas').select('*').eq('turno_id', turnoId),
      sb.from('cuentas').select('*'),
      sb.from('monedas').select('*'),
      sb.from('turno_colaboradoras').select('*').eq('turno_id', turnoId),
      sb.from('arqueos').select('*').eq('turno_id', turnoId),
    ]);
    if (t.error) { notify('No se encontró el turno: '+t.error.message, 'err'); setLoading(false); return; }

    // Cargar venta_pagos asociados a estas ventas (pueden ser splits)
    const ventaIds = (v.data||[]).map(x => x.id);
    let pagos = [];
    if (ventaIds.length > 0) {
      const pp = await sb.from('venta_pagos').select('*').in('venta_id', ventaIds);
      pagos = pp.data || [];
    }
    setVentaPagos(pagos);

    setTurno(t.data);
    setVentas(v.data || []);
    setCuentas(cu.data || []);
    const monMap = {}; (mo.data||[]).forEach(m => monMap[m.codigo] = m);
    setMonedas(monMap);
    setTurnoCol(tc.data || []);
    setArqueos(ar.data || []);
    // Pre-llenar reportados y notas con lo existente (ahora por cuenta_id)
    const pre = {};
    let notaExistente = '';
    (ar.data||[]).forEach(a => {
      if (a.cuenta_id && a.neto_reportado !== null && a.neto_reportado !== undefined) {
        pre[a.cuenta_id] = String(a.neto_reportado);
      }
      if (a.notas && !notaExistente) notaExistente = a.notas;
    });
    setReportados(pre);
    setNotas(notaExistente);
    setLoading(false);
  },[turnoId]);

  React.useEffect(()=>{ cargar(); },[cargar]);

  // Helpers
  const cuentaTipo = React.useMemo(()=>{
    const m = {};
    cuentas.forEach(c => m[c.id] = c.tipo);
    return m;
  }, [cuentas]);

  const colabPagada = React.useMemo(()=>{
    const m = {};
    turnoColabs.forEach(tc => m[tc.colaboradora_id] = !!tc.comision_pagada_at);
    return m;
  },[turnoColabs]);

  // Cálculo por CUENTA (no solo efectivo): cada cuenta con movimiento se arquea
  const porCuenta = React.useMemo(()=>{
    const map = {};
    const cuentaMap = {};
    cuentas.forEach(c => cuentaMap[c.id] = c);

    // Agrupar venta_pagos por venta_id
    const pagosByVenta = {};
    ventaPagos.forEach(p => {
      (pagosByVenta[p.venta_id] = pagosByVenta[p.venta_id] || []).push(p);
    });

    const ensureBucket = (cuentaId) => {
      const cuenta = cuentaMap[cuentaId];
      if (!cuenta) return null;
      if (!map[cuentaId]) map[cuentaId] = {
        cuenta_id: cuentaId, label: cuenta.label, tipo: cuenta.tipo, moneda: cuenta.moneda,
        ventasTotal: 0, comisionesPagadas: 0, pendientes: 0, nVentas: 0,
      };
      return map[cuentaId];
    };

    ventas.forEach(v => {
      const pagosV = pagosByVenta[v.id] || [];
      const pagosServicio = pagosV.filter(p => p.tipo === 'servicio');
      const pagEjec  = colabPagada[v.colaboradora_id];
      const pagVend  = v.vendedora_id && v.vendedora_id !== v.colaboradora_id ? colabPagada[v.vendedora_id] : null;
      const comPct   = Number(v.comision_pct || 0);
      const cvPct    = Number(v.comision_venta_pct || 0);

      // Fallback legacy: si no hay rows en venta_pagos, usa v.cuenta_id + v.precio - v.descuento
      if (pagosServicio.length === 0) {
        const b = ensureBucket(v.cuenta_id);
        if (!b) return;
        b.ventasTotal += Number(v.precio || 0) - Number(v.descuento || 0);
        b.nVentas += 1;
        const comisionEjec = Number(v.comision_monto || 0);
        if (pagEjec) b.comisionesPagadas += comisionEjec; else b.pendientes += comisionEjec;
        if (pagVend) {
          const comisionVenta = Number(v.comision_venta_monto || 0);
          if (pagVend === true) b.comisionesPagadas += comisionVenta; else b.pendientes += comisionVenta;
        }
        return;
      }

      // Flujo nuevo: suma por cada pago en SU cuenta nativa (proporcional), neto de descuento
      pagosServicio.forEach(p => {
        const b = ensureBucket(p.cuenta_id);
        if (!b) return;
        b.ventasTotal += Number(p.monto) - Number(p.descuento || 0);
        // Comisión se calcula sobre precio BRUTO (el descuento lo asume el spa)
        const comisionEjec = Number(p.monto) * comPct / 100;
        if (pagEjec) b.comisionesPagadas += comisionEjec; else b.pendientes += comisionEjec;
        if (pagVend !== null) {
          const comisionVenta = Number(p.monto) * cvPct / 100;
          if (pagVend) b.comisionesPagadas += comisionVenta; else b.pendientes += comisionVenta;
        }
      });
      // Contamos la venta una vez, en la cuenta de la primera línea de servicio
      if (pagosServicio.length > 0) {
        const b = ensureBucket(pagosServicio[0].cuenta_id);
        if (b) b.nVentas += 1;
      }

      // Propinas: NO entran al arqueo (son independientes de la venta y del corte).
      // Se liquidan al terapeuta en la pestaña de pagos del PV.
    });
    Object.values(map).forEach(b => {
      b.netoEsperado = b.ventasTotal - b.comisionesPagadas;
    });
    // Orden: Efectivo primero, luego terminal, luego banco. Dentro, MXN primero.
    const tipoOrden = {efectivo: 0, terminal: 1, banco: 2};
    return Object.values(map).sort((a,b) => {
      const ot = (tipoOrden[a.tipo] ?? 9) - (tipoOrden[b.tipo] ?? 9);
      if (ot !== 0) return ot;
      if (a.moneda === 'MXN') return -1;
      if (b.moneda === 'MXN') return 1;
      return a.label.localeCompare(b.label);
    });
  },[ventas, cuentas, colabPagada]);

  // Autosave silencioso (debounced 700ms)
  const saveTimerRef  = React.useRef(null);
  const [autoState, setAutoState] = React.useState('idle'); // 'idle' | 'guardando' | 'guardado'

  const doSave = React.useCallback(async (repOverride, notasOverride) => {
    const rep = repOverride || reportados;
    const notasV = notasOverride !== undefined ? notasOverride : notas;
    if (porCuenta.length === 0) return {ok:true, skipped:true};
    setAutoState('guardando');
    const filas = porCuenta.map(b => {
      const v = rep[b.cuenta_id];
      const repNum = v !== '' && v !== undefined && v !== null ? parseFloat(v) : null;
      const dif = repNum !== null && !isNaN(repNum) ? (repNum - b.netoEsperado) : null;
      return {
        turno_id: turnoId,
        cuenta_id: b.cuenta_id,
        moneda: b.moneda, // snapshot
        venta_efectivo: b.ventasTotal,
        comisiones_pagadas: b.comisionesPagadas,
        neto_esperado: b.netoEsperado,
        neto_reportado: repNum,
        diferencia: dif,
        notas: notasV.trim() || null,
      };
    });
    const {error} = await sb.from('arqueos').upsert(filas, {onConflict: 'turno_id,cuenta_id'});
    if (error) { setAutoState('idle'); return {ok:false, error}; }
    setAutoState('guardado');
    setTimeout(()=>setAutoState('idle'), 1500);
    return {ok:true};
  }, [porCuenta, reportados, notas, turnoId]);

  const actualizarReportado = (cuentaId, val) => {
    setReportados(r => {
      const next = {...r, [cuentaId]: val};
      // Debounce autosave
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => doSave(next), 700);
      return next;
    });
  };

  const actualizarNotas = (val) => {
    setNotas(val);
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(undefined, val), 800);
  };

  // Eliminar arqueo (solo gerencia — borra las filas de arqueos para este turno)
  const eliminarArqueo = async () => {
    const pass = window.prompt('⚠️ ELIMINAR ARQUEO\n\nEsto borra todas las filas de arqueo de este turno (todos los montos reportados). El turno queda sin arqueo.\n\nEscribe ELIMINAR para confirmar:');
    if (pass === null) return;
    if (pass.trim().toUpperCase() !== 'ELIMINAR') { notify('Confirmación incorrecta','err'); return; }
    const {error} = await sb.from('arqueos').delete().eq('turno_id', turnoId);
    if (error) return notify('Error: '+error.message,'err');
    notify('Arqueo eliminado');
    setReportados({});
    cargar();
  };

  // Eliminar turno completo (borra turno + ventas + arqueos + colabs)
  const eliminarTurnoCompleto = async () => {
    const pass = window.prompt(`⚠️ ELIMINAR TURNO COMPLETO\n\nEsto BORRA PERMANENTEMENTE:\n  · El turno\n  · ${ventas.length} ventas\n  · Todos los arqueos y firmas\n\nNo se puede recuperar.\n\nEscribe ELIMINAR para confirmar:`);
    if (pass === null) return;
    if (pass.trim().toUpperCase() !== 'ELIMINAR') { notify('Confirmación incorrecta','err'); return; }
    const {error} = await sb.from('turnos').delete().eq('id', turnoId);
    if (error) return notify('Error: '+error.message,'err');
    notify('Turno eliminado');
    navigate('turnos');
  };

  // Reabrir turno cerrado (solo admin — por ahora confirma con texto)
  const reabrirTurno = async () => {
    const pass = window.prompt('⚠️ REABRIR turno cerrado\n\nEsto permitirá agregar, editar o borrar servicios y modificar el arqueo.\nSolo administradores deberían hacer esto.\n\nEscribe REABRIR (mayúsculas) para confirmar:');
    if (pass === null) return;
    if (pass.trim().toUpperCase() !== 'REABRIR') { notify('Confirmación incorrecta','err'); return; }
    const nuevaCuenta = (Number(turno.reaperturas)||0) + 1;
    const {error} = await sb.from('turnos').update({
      estado:'abierto', hora_fin:null, cerrado:null,
      reaperturas: nuevaCuenta, reabierto_at: new Date().toISOString(),
    }).eq('id', turnoId);
    if (error) return notify('Error: '+error.message,'err');
    notify('Turno reabierto');
    cargar();
  };

  // Imprimir recibo: fuerza autosave y dispara diálogo de impresión del navegador
  const imprimirRecibo = async () => {
    // Flush pending autosave para que el PDF refleje lo último capturado
    clearTimeout(saveTimerRef.current);
    if (porCuenta.length > 0) {
      const r = await doSave();
      if (!r.ok && !r.skipped) return notify('Error guardando antes de imprimir: '+r.error.message,'err');
    }
    // Pequeño delay para que el DOM actualice el componente imprimible
    setTimeout(()=>window.print(), 100);
  };

  // Cerrar turno DEFINITIVAMENTE (acción separada)
  const cerrarTurno = async () => {
    // 1) Calcular colabs que intervinieron en el turno (ejecutor o vendedora)
    const idsEnTurno = new Set();
    ventas.forEach(v => {
      idsEnTurno.add(v.colaboradora_id);
      if (v.vendedora_id && v.vendedora_id !== v.colaboradora_id) idsEnTurno.add(v.vendedora_id);
    });
    // 2) Contar cuántas siguen sin comision_pagada_at
    const pendientes = [...idsEnTurno].filter(id => !colabPagada[id]);
    if (pendientes.length > 0) {
      return notify(
        `No puedes cerrar el turno: ${pendientes.length} ${pendientes.length===1?'persona':'personas'} con pago pendiente. Márcalos como pagadas primero (la firma puede quedar pendiente).`,
        'err'
      );
    }
    // 3) Avisar si hay firmas pendientes pero permitir cerrar
    const sinFirma = turnoColabs.filter(tc => tc.comision_pagada_at && !tc.firma_data_url);
    let msg = '¿Cerrar el turno DEFINITIVAMENTE?\n\nDespués de cerrar, este turno DESAPARECE de tu pantalla y no podrás volver a imprimir el recibo (solo un administrador podrá).\n\n⚠️ Asegúrate de haber imprimido el recibo antes de continuar.';
    if (sinFirma.length > 0) msg += `\n\n(Hay ${sinFirma.length} ${sinFirma.length===1?'persona':'personas'} pagada${sinFirma.length===1?'':'s'} sin firmar — podrá firmar después)`;
    if (!confirmar(msg)) return;
    setCerrando(true);
    // Cancelar cualquier autosave pendiente y guardar sincrónicamente
    clearTimeout(saveTimerRef.current);
    const saveResult = await doSave();
    if (!saveResult.ok) { setCerrando(false); return notify('Error guardando arqueo antes de cerrar: '+saveResult.error.message,'err'); }
    const ahora = new Date();
    const horaFin = `${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`;
    const {error} = await sb.from('turnos').update({estado: 'cerrado', hora_fin: horaFin, cerrado: ahora.toISOString()}).eq('id', turnoId);
    setCerrando(false);
    if (error) return notify('Error al cerrar: '+error.message, 'err');
    notify('Turno cerrado ✓');
    navigate('turnos');
  };

  // Totales para el recibo imprimible (MXN equivalente)
  // DEBE ir antes del early return (rules of hooks)
  const totalesRecibo = React.useMemo(() => {
    const tcOf = (m) => Number(monedas[m]?.tc_a_mxn || 1);
    let v=0, d=0, c=0, cv=0, p=0;
    ventas.forEach(vt => {
      const f = tcOf(vt.moneda);
      v  += Number(vt.precio || 0) * f;
      d  += Number(vt.descuento || 0) * f;
      c  += Number(vt.comision_monto || 0) * f;
      cv += Number(vt.comision_venta_monto || 0) * f;
      p  += Number(vt.propina || 0) * f;
    });
    // Neto al spa: ventas brutas − descuentos − comisiones − com. por venta
    // (las propinas van 100% al terapeuta pero no afectan el neto del spa, ya están excluidas)
    return { ventas: v, descuentos: d, comisiones: c, comVenta: cv, propinas: p, neto: v - d - c - cv };
  }, [ventas, monedas]);

  if (loading) return <div style={{padding:60,textAlign:'center',color:'var(--ink-3)',fontSize:13}}>Cargando arqueo…</div>;
  if (!turnoId || !turno) return (
    <div style={{padding:60,textAlign:'center'}}>
      <div style={{fontFamily:'var(--serif)',fontSize:22,color:'var(--ink-1)',marginBottom:10}}>Turno no encontrado</div>
      <Btn variant="secondary" onClick={()=>navigate('turnos')}>← Ir a la lista de turnos</Btn>
    </div>
  );

  const fechaFmt = (() => {
    const d = new Date(turno.fecha + 'T00:00:00');
    return d.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'short',year:'numeric'});
  })();

  const estadoTone = {abierto:'moss', cerrado:'neutral', parcial:'amber'}[turno.estado] || 'neutral';
  const estadoLabel= {abierto:'Abierto', cerrado:'Cerrado', parcial:'Parcial'}[turno.estado] || turno.estado;

  // Totales globales (convertidos a MXN) — usados en UI + recibo imprimible
  const totalVentaMXN = porCuenta.reduce((a,b)=>a+(b.ventasTotal * Number(monedas[b.moneda]?.tc_a_mxn || 1)), 0);
  const totalEsperadoMXN = porCuenta.reduce((a,b)=>a+(b.netoEsperado * Number(monedas[b.moneda]?.tc_a_mxn || 1)), 0);
  const hayArqueoExistente = arqueos.length > 0 && arqueos.some(a => a.neto_reportado !== null);

  return (
    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',fontFamily:'var(--sans)',background:'var(--paper)',overflowY:'auto',WebkitOverflowScrolling:'touch'}}>
      {/* Header sticky */}
      <div style={{position:'sticky',top:0,zIndex:5,padding:'14px 20px',borderBottom:'1px solid var(--line-1)',background:'var(--paper-raised)',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <button onClick={()=>navigate('turnos/pv/'+turnoId)} style={{background:'transparent',border:'none',display:'flex',alignItems:'center',gap:5,color:'var(--ink-2)',fontSize:13,cursor:'pointer',fontWeight:500,fontFamily:'inherit'}}>
          <Icon name="arrow-left" size={15}/> PV del turno
        </button>
        <div style={{width:1,height:22,background:'var(--line-1)'}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'baseline',gap:10,flexWrap:'wrap'}}>
            <div style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:500,letterSpacing:-.4,color:'var(--ink-0)',lineHeight:1,textTransform:'capitalize'}}>Arqueo · {fechaFmt}</div>
            <Chip tone={estadoTone}>{estadoLabel}</Chip>
            {turno.folio && <span style={{fontSize:11,color:'var(--ink-3)',fontFamily:'var(--mono)'}}>#{String(turno.folio).padStart(4,'0')}</span>}
            {Number(turno.reaperturas) > 0 && <Chip tone="amber" title={turno.reabierto_at?`Reabierto ${new Date(turno.reabierto_at).toLocaleDateString('es-MX')}`:''}>Reabierto {turno.reaperturas}×</Chip>}
            {autoState === 'guardando' && <span style={{fontSize:10.5,color:'var(--ink-3)',fontStyle:'italic'}}>Guardando…</span>}
            {autoState === 'guardado'  && <span style={{fontSize:10.5,color:'var(--moss)'}}>✓ Guardado</span>}
          </div>
          <div style={{fontSize:11,color:'var(--ink-3)',marginTop:4}}>Verificación de todas las cuentas (efectivo, tarjeta, banco) al cierre</div>
        </div>
      </div>

      <div>
        <div style={{maxWidth:900,margin:'0 auto',padding:'24px 20px 100px'}}>
          {/* Info banner */}
          <div style={{padding:'14px 18px',background:'var(--sand-100)',border:'1px solid #ecd49a',borderRadius:10,display:'flex',gap:12,alignItems:'flex-start',fontSize:12.5,color:'#7a4e10',lineHeight:1.55,marginBottom:20}}>
            <Icon name="sparkles" size={14} stroke={1.8} style={{marginTop:2,flexShrink:0}}/>
            <div>
              <strong>Se arquean todas las cuentas con ventas.</strong> Las comisiones salen de la misma cuenta donde entró la venta. El sistema descontó las <strong>pagadas</strong> del neto esperado — las pendientes siguen contando como saldo de la cuenta.
            </div>
          </div>

          {porCuenta.length === 0 ? (
            <div style={{background:'var(--paper-raised)',border:'1px dashed var(--line-1)',borderRadius:12,padding:'48px 24px',textAlign:'center'}}>
              <div style={{fontFamily:'var(--serif)',fontSize:20,fontWeight:600,color:'var(--ink-0)',marginBottom:6}}>Sin ventas que arquear</div>
              <div style={{fontSize:13,color:'var(--ink-2)'}}>Este turno no tiene ventas registradas.</div>
              <div style={{marginTop:20}}>
                <Btn variant="secondary" onClick={()=>navigate('turnos/pv/'+turnoId)}>← Volver al PV</Btn>
              </div>
            </div>
          ) : (
            <>
              {/* Cards por CUENTA */}
              <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:18}}>
                {porCuenta.map(b => {
                  const sym = monedas[b.moneda]?.simbolo || '$';
                  const tipoColor = {
                    efectivo: 'var(--moss)',
                    terminal: 'var(--ink-blue)',
                    banco:    'var(--clay)',
                  }[b.tipo] || 'var(--ink-2)';
                  const tipoLabel = {efectivo:'Efectivo',terminal:'Terminal',banco:'Banco'}[b.tipo] || b.tipo;
                  const color = tipoColor;
                  const repStr = reportados[b.cuenta_id];
                  const repNum = repStr !== '' && repStr !== undefined ? parseFloat(repStr) : null;
                  const hasRep = repNum !== null && !isNaN(repNum);
                  const dif = hasRep ? (repNum - b.netoEsperado) : null;
                  const difZero = hasRep && Math.abs(dif) < 0.01;
                  const reportadoLabel = b.tipo==='efectivo' ? 'Neto en gaveta' : (b.tipo==='terminal' ? 'Neto en terminal' : 'Neto en cuenta');

                  return (
                    <div key={b.cuenta_id} style={{background:'var(--paper-raised)',border:`1px solid ${color}33`,borderRadius:12,overflow:'hidden'}}>
                      <div style={{padding:'12px 20px',background:`${color}0d`,borderBottom:`1px solid ${color}22`,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                        <span style={{width:10,height:10,borderRadius:3,background:color}}/>
                        <span style={{fontSize:14,fontWeight:700,color:'var(--ink-0)',letterSpacing:-.1}}>{b.label}</span>
                        <span style={{fontSize:10,fontWeight:700,color:color,background:'#fff',padding:'2px 6px',borderRadius:4,border:`1px solid ${color}55`,textTransform:'uppercase',letterSpacing:.4}}>{tipoLabel}</span>
                        <span style={{fontSize:10.5,color:'var(--ink-3)',fontFamily:'var(--mono)'}}>· {b.moneda}</span>
                        <div style={{flex:1}}/>
                        <span style={{fontSize:10.5,color:'var(--ink-3)'}}>{b.nVentas} {b.nVentas===1?'venta':'ventas'}</span>
                      </div>

                      <div style={{padding:'18px 20px',display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',gap:20}}>
                        {/* Esperado (izq) */}
                        <div>
                          <div style={{fontSize:10.5,fontWeight:700,letterSpacing:.6,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:10}}>Cálculo del sistema</div>
                          <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:12.5}}>
                            <span style={{color:'var(--ink-2)'}}>Ventas</span>
                            <span className="num" style={{fontWeight:600,color:'var(--ink-1)'}}>+ {sym}{b.ventasTotal.toLocaleString('es-MX',{minimumFractionDigits:2})}</span>
                          </div>
                          <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:12.5}}>
                            <span style={{color:'var(--ink-2)'}}>Comisiones pagadas</span>
                            <span className="num" style={{fontWeight:600,color:'var(--clay)'}}>− {sym}{b.comisionesPagadas.toLocaleString('es-MX',{minimumFractionDigits:2})}</span>
                          </div>
                          {b.pendientes > 0 && (
                            <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:11,color:'var(--ink-3)',fontStyle:'italic'}}>
                              <span>(Pendientes sin pagar: no se descuentan)</span>
                              <span className="num">{sym}{b.pendientes.toLocaleString('es-MX',{minimumFractionDigits:2})}</span>
                            </div>
                          )}
                          <div style={{borderTop:'1px solid var(--line-1)',marginTop:8,paddingTop:10,display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                            <span style={{fontSize:11,fontWeight:700,letterSpacing:.4,textTransform:'uppercase',color:'var(--ink-2)'}}>Neto esperado</span>
                            <span className="num" style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:700,color:'var(--ink-0)',letterSpacing:-.5}}>{sym}{b.netoEsperado.toLocaleString('es-MX',{minimumFractionDigits:2})}</span>
                          </div>
                        </div>

                        {/* Reportado (der) */}
                        <div>
                          <div style={{fontSize:10.5,fontWeight:700,letterSpacing:.6,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:10}}>Verificación</div>
                          <div style={{marginBottom:10}}>
                            <label style={{display:'block',fontSize:11,fontWeight:600,letterSpacing:.3,color:'var(--ink-2)',marginBottom:5}}>{reportadoLabel} (reportado)</label>
                            <div style={{position:'relative'}}>
                              <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:20,fontFamily:'var(--serif)',color:'var(--ink-3)',fontWeight:500}}>{sym}</span>
                              <input type="number" step="0.01" min="0" value={repStr||''} onChange={e=>actualizarReportado(b.cuenta_id, e.target.value)} placeholder={turno.estado==='cerrado'?'—':'0.00'} disabled={turno.estado==='cerrado'} className="num"
                                style={{width:'100%',padding:'14px 14px 14px 36px',fontSize:22,fontWeight:600,fontFamily:'var(--serif)',letterSpacing:-.3,border:`1.5px solid ${color}55`,borderRadius:10,background:turno.estado==='cerrado'?'var(--paper-sunk)':'var(--paper-raised)',color:'var(--ink-0)',textAlign:'right',boxSizing:'border-box',cursor:turno.estado==='cerrado'?'not-allowed':'text'}}
                              />
                            </div>
                          </div>
                          {hasRep && (
                            <div style={{padding:'10px 14px',borderRadius:8,background:difZero?'rgba(107,125,74,.1)':(dif>0?'rgba(107,125,74,.05)':'rgba(212,83,126,.1)'),border:`1px solid ${difZero?'var(--moss)':(dif>0?'var(--moss)':'rgba(212,83,126,.5)')}`,display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}>
                              <span style={{fontSize:11,fontWeight:700,letterSpacing:.4,textTransform:'uppercase',color:difZero?'var(--moss)':(dif>0?'var(--moss)':'#b73f5e')}}>
                                {difZero ? '✓ Cuadra' : (dif>0 ? 'Sobrante' : 'Faltante')}
                              </span>
                              <span className="num" style={{fontFamily:'var(--serif)',fontSize:16,fontWeight:700,color:difZero?'var(--moss)':(dif>0?'var(--moss)':'#b73f5e')}}>
                                {difZero ? `${sym}0.00` : `${dif>0?'+':''}${sym}${Math.abs(dif).toLocaleString('es-MX',{minimumFractionDigits:2})}`}
                              </span>
                            </div>
                          )}
                          {!hasRep && (
                            <div style={{fontSize:11,color:'var(--ink-3)',fontStyle:'italic',padding:'8px 0'}}>Captura el monto para ver la diferencia.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Notas */}
              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,padding:'16px 20px',marginBottom:18}}>
                <label style={{display:'block',fontSize:11,fontWeight:700,letterSpacing:.5,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:8}}>Notas del arqueo (opcional)</label>
                <textarea value={notas} onChange={e=>actualizarNotas(e.target.value)} rows={2} placeholder={turno.estado==='cerrado' && !notas ? 'Sin notas' : 'Observaciones sobre faltantes/sobrantes, incidentes del turno, etc.'} disabled={turno.estado==='cerrado'} style={{width:'100%',padding:'10px 12px',fontSize:13,border:'1px solid var(--line-1)',borderRadius:8,background:turno.estado==='cerrado'?'var(--paper-sunk)':'var(--paper)',fontFamily:'inherit',color:'var(--ink-1)',boxSizing:'border-box',resize:'vertical',minHeight:60,cursor:turno.estado==='cerrado'?'not-allowed':'text'}}/>
              </div>

              {/* Resumen global + volver */}
              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,padding:'16px 20px',display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
                <div>
                  <div style={{fontSize:11,color:'var(--ink-3)',fontWeight:600,letterSpacing:.4,textTransform:'uppercase',marginBottom:2}}>Total esperado (MXN equiv)</div>
                  <Money amount={totalEsperadoMXN} size={20} weight={700}/>
                </div>
                <div style={{flex:1}}/>
                <Btn variant="secondary" size="md" onClick={()=>navigate('turnos/pv/'+turnoId)}>← Volver al PV</Btn>
              </div>
            </>
          )}

          {/* Cerrar turno: imprimir recibo + cerrar definitivamente */}
          {turno.estado === 'abierto' && (
            <div style={{marginTop:16,padding:'18px 20px',background:'rgba(107,125,74,.05)',border:'1.5px dashed var(--moss)',borderRadius:12,display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:240}}>
                <div style={{fontSize:13,fontWeight:700,color:'var(--ink-0)',marginBottom:3,letterSpacing:-.1}}>Cierre del turno</div>
                <div style={{fontSize:11.5,color:'var(--ink-2)',lineHeight:1.5}}>
                  <strong>Imprime el recibo primero</strong>, luego cierra definitivamente. Al cerrar, el turno desaparece de tu pantalla.
                </div>
              </div>
              <Btn variant="secondary" size="md" icon="receipt" onClick={imprimirRecibo} disabled={cerrando || saving}>
                Imprimir recibo
              </Btn>
              <Btn variant="moss" size="lg" icon="check" onClick={cerrarTurno} disabled={cerrando || saving}>
                {cerrando ? 'Cerrando…' : 'Cerrar turno'}
              </Btn>
            </div>
          )}

          {/* Estado si ya está cerrado */}
          {turno.estado === 'cerrado' && (
            <div style={{marginTop:16,padding:'14px 18px',background:'var(--paper-sunk)',border:'1px solid var(--line-1)',borderRadius:10,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
              <Icon name="lock" size={14} color="var(--ink-3)"/>
              <div style={{flex:1,fontSize:12.5,color:'var(--ink-2)',minWidth:200}}>
                Turno cerrado{turno.cerrado ? ` el ${new Date(turno.cerrado).toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'})}` : ''}. No se pueden hacer más cambios.
              </div>
              <Btn variant="secondary" size="sm" icon="receipt" onClick={imprimirRecibo}>Imprimir recibo</Btn>
              <Btn variant="ghost" size="sm" onClick={reabrirTurno}>Reabrir turno</Btn>
              {window.can && window.can('arqueo_eliminar') && (
                <Btn variant="ghost" size="sm" icon="trash" onClick={eliminarArqueo} style={{color:'#b73f5e'}}>Borrar arqueo</Btn>
              )}
              {window.can && window.can('turnos_eliminar') && (
                <Btn variant="ghost" size="sm" icon="trash" onClick={eliminarTurnoCompleto} style={{color:'#b73f5e'}}>Eliminar turno</Btn>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recibo imprimible (oculto en pantalla, visible en @media print) */}
      {typeof ReciboPrintable === 'function' && (
        <ReciboPrintable
          turno={turno}
          ventas={ventas}
          ventaPagos={ventaPagos}
          cuentas={cuentas}
          porCuenta={porCuenta}
          turnoColabs={turnoColabs}
          monedas={monedas}
          reportados={reportados}
          notas={notas}
          totales={totalesRecibo}
        />
      )}
    </div>
  );
};

Object.assign(window, { Arqueo: ArqueoFn });

