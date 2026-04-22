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
    setTurno(t.data);
    setVentas(v.data || []);
    setCuentas(cu.data || []);
    const monMap = {}; (mo.data||[]).forEach(m => monMap[m.codigo] = m);
    setMonedas(monMap);
    setTurnoCol(tc.data || []);
    setArqueos(ar.data || []);
    // Pre-llenar reportados y notas con lo existente
    const pre = {};
    let notaExistente = '';
    (ar.data||[]).forEach(a => {
      if (a.neto_reportado !== null && a.neto_reportado !== undefined) pre[a.moneda] = String(a.neto_reportado);
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

  // Cálculo por moneda: solo ventas con cuenta tipo=efectivo
  const porMoneda = React.useMemo(()=>{
    const map = {};
    ventas.forEach(v => {
      if (cuentaTipo[v.cuenta_id] !== 'efectivo') return; // solo efectivo
      if (!map[v.moneda]) map[v.moneda] = {
        moneda: v.moneda,
        ventaEfectivo: 0,
        comisionesPagadas: 0,
        pendientes: 0,
        nVentas: 0,
      };
      const bloque = map[v.moneda];
      bloque.ventaEfectivo += Number(v.precio || 0);
      bloque.nVentas += 1;

      // Comisión ejecutor + propinas
      const pagEjec = colabPagada[v.colaboradora_id];
      const comisionEjec = Number(v.comision_monto || 0) + Number(v.propina || 0);
      if (pagEjec) bloque.comisionesPagadas += comisionEjec;
      else         bloque.pendientes += comisionEjec;

      // Comisión vendedor (si aplica)
      if (v.vendedora_id && v.vendedora_id !== v.colaboradora_id) {
        const pagVend = colabPagada[v.vendedora_id];
        const comisionVenta = Number(v.comision_venta_monto || 0);
        if (pagVend) bloque.comisionesPagadas += comisionVenta;
        else         bloque.pendientes += comisionVenta;
      }
    });
    Object.values(map).forEach(b => {
      b.netoEsperado = b.ventaEfectivo - b.comisionesPagadas;
    });
    // MXN primero, luego resto alfabético
    return Object.values(map).sort((a,b) => {
      if (a.moneda==='MXN') return -1;
      if (b.moneda==='MXN') return 1;
      return a.moneda.localeCompare(b.moneda);
    });
  },[ventas, cuentaTipo, colabPagada]);

  // Ventas no-efectivo (tarjeta/transferencia) solo informativas
  const noEfectivoPorCanal = React.useMemo(()=>{
    const map = {};
    ventas.forEach(v => {
      const tipo = cuentaTipo[v.cuenta_id];
      if (tipo === 'efectivo' || !tipo) return;
      const key = v.cuenta;
      if (!map[key]) map[key] = {cuenta: v.cuenta, tipo, moneda: v.moneda, total: 0, n: 0};
      map[key].total += Number(v.precio || 0);
      map[key].n += 1;
    });
    return Object.values(map).sort((a,b)=>b.total-a.total);
  },[ventas, cuentaTipo]);

  const actualizarReportado = (moneda, val) => {
    setReportados(r => ({...r, [moneda]: val}));
  };

  const guardar = async () => {
    if (porMoneda.length === 0) return notify('No hay ventas en efectivo para arquear','warn');
    setSaving(true);

    const filas = porMoneda.map(b => {
      const rep = reportados[b.moneda];
      const repNum = rep !== '' && rep !== undefined ? parseFloat(rep) : null;
      const dif = repNum !== null ? (repNum - b.netoEsperado) : null;
      return {
        turno_id: turnoId,
        moneda: b.moneda,
        venta_efectivo: b.ventaEfectivo,
        comisiones_pagadas: b.comisionesPagadas,
        neto_esperado: b.netoEsperado,
        neto_reportado: repNum,
        diferencia: dif,
        notas: notas.trim() || null,
      };
    });

    const {error} = await sb.from('arqueos').upsert(filas, {onConflict: 'turno_id,moneda'});
    setSaving(false);
    if (error) return notify('Error al guardar arqueo: '+error.message, 'err');
    notify('Arqueo guardado ✓');
    cargar(); // re-cargar para reflejar estado
  };

  // Cerrar turno DEFINITIVAMENTE (acción separada)
  const cerrarTurno = async () => {
    const pendientes = turnoColabs.filter(tc => !tc.comision_pagada_at).length;
    let msg = '¿Cerrar el turno DEFINITIVAMENTE?\n\nYa no se podrán agregar ni editar servicios.';
    if (pendientes > 0) msg += `\n\nHay ${pendientes} ${pendientes===1?'colaboradora':'colaboradoras'} con comisión pendiente. Quedan como pendientes y podrás marcarlas como pagadas después.`;
    if (!confirmar(msg)) return;
    setCerrando(true);
    const ahora = new Date();
    const horaFin = `${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`;
    const {error} = await sb.from('turnos').update({estado: 'cerrado', hora_fin: horaFin, cerrado: ahora.toISOString()}).eq('id', turnoId);
    setCerrando(false);
    if (error) return notify('Error al cerrar: '+error.message, 'err');
    notify('Turno cerrado ✓');
    navigate('turnos');
  };

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

  // Totales globales (convertidos a MXN)
  const totalVentaMXN = porMoneda.reduce((a,b)=>a+(b.ventaEfectivo * Number(monedas[b.moneda]?.tc_a_mxn || 1)), 0);
  const totalEsperadoMXN = porMoneda.reduce((a,b)=>a+(b.netoEsperado * Number(monedas[b.moneda]?.tc_a_mxn || 1)), 0);
  const hayReportados = porMoneda.some(b => {
    const r = reportados[b.moneda];
    return r !== '' && r !== undefined && !isNaN(parseFloat(r));
  });
  const hayArqueoExistente = arqueos.length > 0 && arqueos.some(a => a.neto_reportado !== null);

  return (
    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',fontFamily:'var(--sans)',background:'var(--paper)',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'16px 32px',borderBottom:'1px solid var(--line-1)',background:'var(--paper-raised)',display:'flex',alignItems:'center',gap:16}}>
        <button onClick={()=>navigate('turnos/pv/'+turnoId)} style={{background:'transparent',border:'none',display:'flex',alignItems:'center',gap:5,color:'var(--ink-2)',fontSize:13,cursor:'pointer',fontWeight:500,fontFamily:'inherit'}}>
          <Icon name="arrow-left" size={15}/> PV del turno
        </button>
        <div style={{width:1,height:22,background:'var(--line-1)'}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'baseline',gap:10,flexWrap:'wrap'}}>
            <div style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:500,letterSpacing:-.4,color:'var(--ink-0)',lineHeight:1,textTransform:'capitalize'}}>Arqueo · {fechaFmt}</div>
            <Chip tone={estadoTone}>{estadoLabel}</Chip>
            {turno.folio && <span style={{fontSize:11,color:'var(--ink-3)',fontFamily:'var(--mono)'}}>#{String(turno.folio).padStart(4,'0')}</span>}
            {hayArqueoExistente && <Chip tone="moss"><Icon name="check" size={9} stroke={2.4}/>Arqueo guardado</Chip>}
          </div>
          <div style={{fontSize:11,color:'var(--ink-3)',marginTop:4}}>Captura de efectivo físico por moneda al cierre</div>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto'}}>
        <div style={{maxWidth:900,margin:'0 auto',padding:'24px 32px 60px'}}>
          {/* Info banner */}
          <div style={{padding:'14px 18px',background:'var(--sand-100)',border:'1px solid #ecd49a',borderRadius:10,display:'flex',gap:12,alignItems:'flex-start',fontSize:12.5,color:'#7a4e10',lineHeight:1.55,marginBottom:20}}>
            <Icon name="sparkles" size={14} stroke={1.8} style={{marginTop:2,flexShrink:0}}/>
            <div>
              <strong>Solo se arquean cuentas en efectivo.</strong> Ventas en tarjeta o transferencia se verifican con el banco. El sistema ya descontó las comisiones <strong>pagadas</strong> del esperado — las pendientes siguen contando como efectivo en gaveta.
            </div>
          </div>

          {porMoneda.length === 0 ? (
            <div style={{background:'var(--paper-raised)',border:'1px dashed var(--line-1)',borderRadius:12,padding:'48px 24px',textAlign:'center'}}>
              <div style={{fontFamily:'var(--serif)',fontSize:20,fontWeight:600,color:'var(--ink-0)',marginBottom:6}}>Sin efectivo que arquear</div>
              <div style={{fontSize:13,color:'var(--ink-2)'}}>Este turno no tiene ventas en cuentas de efectivo.</div>
              {noEfectivoPorCanal.length > 0 && (
                <div style={{marginTop:20,paddingTop:20,borderTop:'1px solid var(--line-1)',fontSize:12,color:'var(--ink-3)',textAlign:'left'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--ink-2)',letterSpacing:.4,textTransform:'uppercase',marginBottom:8}}>Otras cuentas (solo verificar con banco):</div>
                  {noEfectivoPorCanal.map(x => (
                    <div key={x.cuenta} style={{display:'flex',justifyContent:'space-between',padding:'4px 0'}}>
                      <span>{x.cuenta} ({x.tipo}) · {x.n} {x.n===1?'venta':'ventas'}</span>
                      <span className="num" style={{fontWeight:600,color:'var(--ink-1)'}}>{monedas[x.moneda]?.simbolo||'$'}{Number(x.total).toLocaleString('es-MX')}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{marginTop:20}}>
                <Btn variant="secondary" onClick={()=>navigate('turnos/pv/'+turnoId)}>← Volver al PV</Btn>
              </div>
            </div>
          ) : (
            <>
              {/* Cards por moneda */}
              <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:18}}>
                {porMoneda.map(b => {
                  const sym = monedas[b.moneda]?.simbolo || '$';
                  const color = b.moneda==='MXN'?'var(--ink-blue)':b.moneda==='USD'?'var(--moss)':'var(--clay)';
                  const repStr = reportados[b.moneda];
                  const repNum = repStr !== '' && repStr !== undefined ? parseFloat(repStr) : null;
                  const hasRep = repNum !== null && !isNaN(repNum);
                  const dif = hasRep ? (repNum - b.netoEsperado) : null;
                  const difZero = hasRep && Math.abs(dif) < 0.01;

                  return (
                    <div key={b.moneda} style={{background:'var(--paper-raised)',border:`1px solid ${color}33`,borderRadius:12,overflow:'hidden'}}>
                      <div style={{padding:'12px 20px',background:`${color}0d`,borderBottom:`1px solid ${color}22`,display:'flex',alignItems:'center',gap:10}}>
                        <span style={{width:10,height:10,borderRadius:3,background:color}}/>
                        <span style={{fontSize:14,fontWeight:700,color:color,fontFamily:'var(--mono)',letterSpacing:.5}}>{b.moneda}</span>
                        <span style={{fontSize:11,color:'var(--ink-3)'}}>· {monedas[b.moneda]?.label || ''}</span>
                        <div style={{flex:1}}/>
                        <span style={{fontSize:10.5,color:'var(--ink-3)'}}>{b.nVentas} {b.nVentas===1?'venta':'ventas'} en efectivo</span>
                      </div>

                      <div style={{padding:'18px 20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                        {/* Esperado (lado izq) */}
                        <div>
                          <div style={{fontSize:10.5,fontWeight:700,letterSpacing:.6,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:10}}>Cálculo del sistema</div>

                          <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:12.5}}>
                            <span style={{color:'var(--ink-2)'}}>Ventas en efectivo</span>
                            <span className="num" style={{fontWeight:600,color:'var(--ink-1)'}}>+ {sym}{b.ventaEfectivo.toLocaleString('es-MX',{minimumFractionDigits:2})}</span>
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

                        {/* Reportado (lado der) */}
                        <div>
                          <div style={{fontSize:10.5,fontWeight:700,letterSpacing:.6,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:10}}>Captura encargada</div>
                          <div style={{marginBottom:10}}>
                            <label style={{display:'block',fontSize:11,fontWeight:600,letterSpacing:.3,color:'var(--ink-2)',marginBottom:5}}>Neto en gaveta (reportado)</label>
                            <div style={{position:'relative'}}>
                              <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:20,fontFamily:'var(--serif)',color:'var(--ink-3)',fontWeight:500}}>{sym}</span>
                              <input type="number" step="0.01" min="0" value={repStr||''} onChange={e=>actualizarReportado(b.moneda, e.target.value)} placeholder="0.00" className="num"
                                style={{width:'100%',padding:'14px 14px 14px 36px',fontSize:22,fontWeight:600,fontFamily:'var(--serif)',letterSpacing:-.3,border:`1.5px solid ${color}55`,borderRadius:10,background:'var(--paper-raised)',color:'var(--ink-0)',textAlign:'right',boxSizing:'border-box'}}
                              />
                            </div>
                          </div>
                          {/* Diferencia */}
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
                <textarea value={notas} onChange={e=>setNotas(e.target.value)} rows={2} placeholder="Observaciones sobre faltantes/sobrantes, incidentes del turno, etc." style={{width:'100%',padding:'10px 12px',fontSize:13,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper)',fontFamily:'inherit',color:'var(--ink-1)',boxSizing:'border-box',resize:'vertical',minHeight:60}}/>
              </div>

              {/* Resumen global + acciones */}
              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,padding:'16px 20px',display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
                <div>
                  <div style={{fontSize:11,color:'var(--ink-3)',fontWeight:600,letterSpacing:.4,textTransform:'uppercase',marginBottom:2}}>Total esperado (MXN equiv)</div>
                  <Money amount={totalEsperadoMXN} size={20} weight={700}/>
                </div>
                <div style={{flex:1}}/>
                {noEfectivoPorCanal.length > 0 && (
                  <div style={{fontSize:11,color:'var(--ink-3)',maxWidth:280,lineHeight:1.4}}>
                    <strong>No efectivo:</strong> {noEfectivoPorCanal.map(x=>`${x.cuenta} ${monedas[x.moneda]?.simbolo||'$'}${Math.round(x.total).toLocaleString('es-MX')}`).join(', ')}
                  </div>
                )}
                <Btn variant="secondary" size="md" onClick={()=>navigate('turnos/pv/'+turnoId)} disabled={saving}>← Volver al PV</Btn>
                <Btn variant="clay" size="md" icon="check" onClick={guardar} disabled={saving || !hayReportados}>
                  {saving ? 'Guardando…' : (hayArqueoExistente ? 'Actualizar arqueo' : 'Guardar arqueo')}
                </Btn>
              </div>
            </>
          )}

          {/* Cerrar turno definitivamente (siempre visible si abierto) */}
          {turno.estado === 'abierto' && (
            <div style={{marginTop:16,padding:'18px 20px',background:'rgba(107,125,74,.05)',border:'1.5px dashed var(--moss)',borderRadius:12,display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:240}}>
                <div style={{fontSize:13,fontWeight:700,color:'var(--ink-0)',marginBottom:3,letterSpacing:-.1}}>Cerrar turno definitivamente</div>
                <div style={{fontSize:11.5,color:'var(--ink-2)',lineHeight:1.5}}>Una vez cerrado, <strong>no se pueden agregar ni editar servicios</strong>. El arqueo queda guardado. Si te falta revisar algo, puedes volver al PV antes.</div>
              </div>
              <Btn variant="moss" size="lg" icon="check" onClick={cerrarTurno} disabled={cerrando || saving}>
                {cerrando ? 'Cerrando…' : 'Cerrar turno'}
              </Btn>
            </div>
          )}

          {/* Estado si ya está cerrado */}
          {turno.estado === 'cerrado' && (
            <div style={{marginTop:16,padding:'14px 18px',background:'var(--paper-sunk)',border:'1px solid var(--line-1)',borderRadius:10,display:'flex',alignItems:'center',gap:12}}>
              <Icon name="lock" size={14} color="var(--ink-3)"/>
              <div style={{fontSize:12.5,color:'var(--ink-2)'}}>
                Turno cerrado{turno.cerrado ? ` el ${new Date(turno.cerrado).toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'})}` : ''}. No se pueden hacer más cambios.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Arqueo: ArqueoFn });
