// ──────────────────────────────────────────
// Objetivos · Formulario modal (crear / editar)
// Tipo + periodo + campos dinámicos según tipo
// ──────────────────────────────────────────

const FormObjetivo = ({obj, tipoForzado, periodoForzado, fechaForzada, onSave, onCancel}) => {
  const editando = !!obj;

  // Campos comunes (pueden venir forzados desde el slot)
  const [tipo, setTipo]     = React.useState(obj?.tipo || tipoForzado || 'venta_spa');
  const [periodo, setPer]   = React.useState(obj?.periodo || periodoForzado || 'mes');
  const [periodoFecha, setPF] = React.useState(obj?.periodo_fecha || fechaForzada || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
  })());
  const [activo, setAct]    = React.useState(obj?.activo ?? true);
  const [descripcion, setDesc] = React.useState(obj?.descripcion || '');

  // venta_spa
  const [metaModalidad, setMM] = React.useState(obj?.meta_modalidad || 'monto');
  const [metaValor, setMV]     = React.useState(obj?.meta_valor || '');

  // bono_individual / bono_encargada: condiciones
  const [usaVentas, setUV]   = React.useState(obj ? obj.cond_ventas_min != null : true);
  const [ventasMin, setVMin] = React.useState(obj?.cond_ventas_min || '');

  const [usaTicket, setUT]    = React.useState(obj ? obj.cond_ticket_modalidad != null : false);
  const [ticketMod, setTM]    = React.useState(obj?.cond_ticket_modalidad || 'promedio_spa');
  const [ticketVal, setTV]    = React.useState(obj?.cond_ticket_valor || '');
  const [ticketVent, setTVen] = React.useState(obj?.cond_ticket_ventana || ventanaDefaultObj(periodo));

  const [usaSvc, setUS]   = React.useState(obj ? obj.cond_servicios_min != null : true);
  const [svcMin, setSM]   = React.useState(obj?.cond_servicios_min || 15);

  // Solo bono_encargada: mín turnos abiertos
  const [usaTurnos, setUTu]   = React.useState(obj ? obj.cond_turnos_min != null : true);
  const [turnosMin, setTuMin] = React.useState(obj?.cond_turnos_min || 10);

  // Bono: modalidad (porcentaje o monto fijo)
  const [bonoModalidad, setBMod]  = React.useState(obj?.bono_modalidad || 'porcentaje');
  const [bonoPct, setBP]          = React.useState(obj?.bono_pct || 5);
  const [bonoBase, setBB]         = React.useState(obj?.bono_base || 'exceso');
  const [bonoMontoFijo, setBMF]   = React.useState(obj?.bono_monto_fijo || '');

  const [saving, setSaving] = React.useState(false);

  // Cuando cambia periodo, ajustar ventana default
  React.useEffect(() => {
    if (!editando) setTVen(ventanaDefaultObj(periodo));
  }, [periodo, editando]);

  const fieldStyle = {width:'100%',padding:'9px 12px',fontSize:13,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontFamily:'inherit',color:'var(--ink-1)',boxSizing:'border-box'};
  const labelStyle = {display:'block',fontSize:11,fontWeight:600,letterSpacing:.4,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:6};

  const guardar = async () => {
    if (tipo === 'venta_spa') {
      if (!metaValor || Number(metaValor) <= 0) return notify('Falta el valor de la meta','err');
    } else if (tipo === 'ticket_spa') {
      if (!metaValor || Number(metaValor) <= 0) return notify('Falta el ticket promedio meta','err');
    } else if (tipo === 'bono_individual') {
      if (!usaVentas && !usaTicket && !usaSvc) return notify('Activa al menos una condición','err');
      if (usaVentas && (!ventasMin || Number(ventasMin) <= 0)) return notify('Falta el mínimo de ventas','err');
      if (usaTicket && ticketMod === 'monto' && (!ticketVal || Number(ticketVal) <= 0)) return notify('Falta el valor del ticket','err');
      if (usaSvc && (!svcMin || Number(svcMin) <= 0)) return notify('Falta el mínimo de servicios','err');
    } else if (tipo === 'bono_encargada') {
      if (!usaTurnos && !usaVentas) return notify('Activa al menos una condición','err');
      if (usaTurnos && (!turnosMin || Number(turnosMin) <= 0)) return notify('Falta el mínimo de turnos','err');
      if (usaVentas && (!ventasMin || Number(ventasMin) <= 0)) return notify('Falta el mínimo de ventas','err');
    }
    // Validar bono (aplica a individual y encargada)
    if (tipo === 'bono_individual' || tipo === 'bono_encargada') {
      if (bonoModalidad === 'porcentaje') {
        if (!bonoPct || Number(bonoPct) <= 0) return notify('Falta el % del bono','err');
      } else {
        if (!bonoMontoFijo || Number(bonoMontoFijo) <= 0) return notify('Falta el monto fijo del bono','err');
      }
    }

    setSaving(true);
    const esIndividual = tipo === 'bono_individual';
    const esEncargada  = tipo === 'bono_encargada';
    const esBono       = esIndividual || esEncargada;
    const payload = {
      tipo, periodo, periodo_fecha: periodoFecha,
      descripcion: descripcion.trim() || null,
      activo,
      meta_modalidad: tipo === 'venta_spa' ? metaModalidad : null,
      meta_valor: (tipo === 'venta_spa' || tipo === 'ticket_spa') ? Number(metaValor) : null,
      // cond_ventas: individual + encargada
      cond_ventas_min: (esBono && usaVentas) ? Number(ventasMin) : null,
      // cond_ticket: solo individual
      cond_ticket_modalidad: (esIndividual && usaTicket) ? ticketMod : null,
      cond_ticket_valor: (esIndividual && usaTicket && ticketMod === 'monto') ? Number(ticketVal) : null,
      cond_ticket_ventana: (esIndividual && usaTicket && ticketMod === 'promedio_spa') ? Number(ticketVent) : null,
      // cond_servicios: solo individual
      cond_servicios_min: (esIndividual && usaSvc) ? Number(svcMin) : null,
      // cond_turnos: solo encargada
      cond_turnos_min: (esEncargada && usaTurnos) ? Number(turnosMin) : null,
      // Bono: individual + encargada
      bono_modalidad: esBono ? bonoModalidad : null,
      bono_pct: (esBono && bonoModalidad === 'porcentaje') ? Number(bonoPct) : null,
      bono_base: (esBono && bonoModalidad === 'porcentaje') ? bonoBase : null,
      bono_monto_fijo: (esBono && bonoModalidad === 'monto_fijo') ? Number(bonoMontoFijo) : null,
    };

    let error;
    if (editando) ({error} = await sb.from('objetivos').update(payload).eq('id', obj.id));
    else          ({error} = await sb.from('objetivos').insert(payload));
    setSaving(false);
    if (error) {
      if (String(error.message).includes('duplicate') || String(error.message).includes('unique')) {
        return notify('Ya existe un objetivo de este tipo para este periodo','err');
      }
      return notify('Error: '+error.message, 'err');
    }
    notify(editando ? 'Objetivo actualizado' : 'Objetivo creado');
    onSave();
  };

  return (
    <div style={{padding:'10px 0'}}>
      {/* Breadcrumb cuando el tipo viene forzado desde un slot */}
      {(tipoForzado || periodoForzado) && (
        <div style={{padding:'10px 14px',background:'var(--paper-sunk)',border:'1px solid var(--line-2)',borderRadius:8,marginBottom:14,fontSize:12,color:'var(--ink-2)'}}>
          Configurando <strong style={{color:'var(--ink-0)'}}>
            {tipo === 'venta_spa' && 'Venta total del spa'}
            {tipo === 'ticket_spa' && 'Ticket promedio del spa'}
            {tipo === 'bono_individual' && 'Bono individual'}
            {tipo === 'bono_encargada' && 'Bono responsable'}
          </strong> · <span style={{textTransform:'capitalize'}}>{labelPeriodoObj(periodo, periodoFecha)}</span>
        </div>
      )}

      {/* Selectors: solo si NO viene forzado (creación libre) */}
      {!(tipoForzado && periodoForzado && fechaForzada) && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 130px 150px',gap:10,marginBottom:14}}>
          {!tipoForzado && (
            <div>
              <label style={labelStyle}>Tipo de objetivo</label>
              <select value={tipo} onChange={e=>setTipo(e.target.value)} style={fieldStyle} disabled={editando}>
                <option value="venta_spa">Venta total del spa</option>
                <option value="ticket_spa">Ticket promedio del spa</option>
                <option value="bono_individual">Bono individual (terapeutas)</option>
                <option value="bono_encargada">Bono responsable (% sobre turnos que abrió)</option>
              </select>
            </div>
          )}
          {!periodoForzado && (
            <div>
              <label style={labelStyle}>Periodo</label>
              <select value={periodo} onChange={e=>setPer(e.target.value)} style={fieldStyle} disabled={editando}>
                <option value="mes">Mensual</option>
                <option value="trimestre">Trimestral</option>
                <option value="anio">Anual</option>
              </select>
            </div>
          )}
          {!fechaForzada && (
            <div>
              <label style={labelStyle}>Inicio del periodo</label>
              <input type="date" value={periodoFecha} onChange={e=>setPF(e.target.value)} style={fieldStyle} disabled={editando}/>
            </div>
          )}
        </div>
      )}

      {/* venta_spa */}
      {tipo === 'venta_spa' && (
        <div style={{marginBottom:14,padding:'14px 16px',background:'var(--paper-sunk)',border:'1px solid var(--line-2)',borderRadius:10}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--ink-2)',letterSpacing:.4,textTransform:'uppercase',marginBottom:10}}>Meta de venta total</div>
          <div style={{display:'flex',gap:14,marginBottom:10,fontSize:12.5}}>
            <label style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer'}}>
              <input type="radio" name="mm" value="monto" checked={metaModalidad==='monto'} onChange={e=>setMM(e.target.value)}/>
              Monto fijo (MXN)
            </label>
            <label style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer'}}>
              <input type="radio" name="mm" value="pct_yoy" checked={metaModalidad==='pct_yoy'} onChange={e=>setMM(e.target.value)}/>
              % vs mismo periodo año anterior
            </label>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:18,fontFamily:'var(--serif)',color:'var(--ink-3)'}}>{metaModalidad==='monto'?'$':'+'}</span>
            <input type="number" step="0.01" min="0" value={metaValor} onChange={e=>setMV(e.target.value)} placeholder={metaModalidad==='monto'?'400000':'10'} className="num" style={{...fieldStyle,fontSize:18,fontFamily:'var(--serif)',fontWeight:600}}/>
            <span style={{fontSize:14,color:'var(--ink-3)',fontWeight:600}}>{metaModalidad==='pct_yoy'?'%':'MXN'}</span>
          </div>
        </div>
      )}

      {/* ticket_spa */}
      {tipo === 'ticket_spa' && (
        <div style={{marginBottom:14,padding:'14px 16px',background:'var(--paper-sunk)',border:'1px solid var(--line-2)',borderRadius:10}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--ink-2)',letterSpacing:.4,textTransform:'uppercase',marginBottom:10}}>Ticket promedio mínimo del spa</div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:18,fontFamily:'var(--serif)',color:'var(--ink-3)'}}>$</span>
            <input type="number" step="0.01" min="0" value={metaValor} onChange={e=>setMV(e.target.value)} placeholder="800" className="num" style={{...fieldStyle,fontSize:18,fontFamily:'var(--serif)',fontWeight:600}}/>
            <span style={{fontSize:14,color:'var(--ink-3)',fontWeight:600}}>MXN</span>
          </div>
          <div style={{fontSize:11,color:'var(--ink-3)',marginTop:6}}>Calculado como: total ventas ÷ número de servicios del periodo</div>
        </div>
      )}

      {/* bono_individual + bono_encargada: condiciones */}
      {(tipo === 'bono_individual' || tipo === 'bono_encargada') && (
        <>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:'var(--ink-2)',letterSpacing:.4,textTransform:'uppercase',marginBottom:6}}>Condiciones para ganar el bono</div>
            <div style={{fontSize:11,color:'var(--ink-3)',marginBottom:10}}>Activa las condiciones que apliquen — todas deben cumplirse.</div>

            {/* Cond turnos (solo bono_encargada) */}
            {tipo === 'bono_encargada' && (
              <div style={{padding:'10px 14px',background:usaTurnos?'var(--paper-sunk)':'transparent',border:'1px solid '+(usaTurnos?'var(--line-2)':'var(--line-1)'),borderRadius:8,marginBottom:8}}>
                <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,fontWeight:600,color:'var(--ink-1)'}}>
                  <input type="checkbox" checked={usaTurnos} onChange={e=>setUTu(e.target.checked)}/>
                  Mínimo de turnos abiertos
                </label>
                {usaTurnos && (
                  <div style={{marginTop:8,display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:13,color:'var(--ink-3)'}}>≥</span>
                    <input type="number" min="1" value={turnosMin} onChange={e=>setTuMin(e.target.value)} className="num" style={{...fieldStyle,maxWidth:100}}/>
                    <span style={{fontSize:12,color:'var(--ink-3)'}}>turnos abiertos en el periodo</span>
                  </div>
                )}
              </div>
            )}

            {/* Cond ventas (individual + encargada) */}
            <div style={{padding:'10px 14px',background:usaVentas?'var(--paper-sunk)':'transparent',border:'1px solid '+(usaVentas?'var(--line-2)':'var(--line-1)'),borderRadius:8,marginBottom:8}}>
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,fontWeight:600,color:'var(--ink-1)'}}>
                <input type="checkbox" checked={usaVentas} onChange={e=>setUV(e.target.checked)}/>
                {tipo === 'bono_encargada' ? 'Mínimo de ventas en sus turnos' : 'Meta de ventas'}
              </label>
              {usaVentas && (
                <div style={{marginTop:8,display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:13,color:'var(--ink-3)'}}>≥</span>
                  <span style={{fontSize:14,fontFamily:'var(--serif)',color:'var(--ink-3)'}}>$</span>
                  <input type="number" step="0.01" min="0" value={ventasMin} onChange={e=>setVMin(e.target.value)} placeholder={tipo === 'bono_encargada' ? '100000' : '10000'} className="num" style={{...fieldStyle,maxWidth:160}}/>
                  <span style={{fontSize:12,color:'var(--ink-3)'}}>MXN en el periodo</span>
                </div>
              )}
            </div>

            {/* Cond ticket (solo individual) */}
            {tipo === 'bono_individual' && (
            <div style={{padding:'10px 14px',background:usaTicket?'var(--paper-sunk)':'transparent',border:'1px solid '+(usaTicket?'var(--line-2)':'var(--line-1)'),borderRadius:8,marginBottom:8}}>
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,fontWeight:600,color:'var(--ink-1)'}}>
                <input type="checkbox" checked={usaTicket} onChange={e=>setUT(e.target.checked)}/>
                Meta de ticket promedio
              </label>
              {usaTicket && (
                <div style={{marginTop:8}}>
                  <div style={{display:'flex',gap:14,marginBottom:8,fontSize:12.5}}>
                    <label style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer'}}>
                      <input type="radio" name="tm" value="monto" checked={ticketMod==='monto'} onChange={e=>setTM(e.target.value)}/>
                      Monto fijo
                    </label>
                    <label style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer'}}>
                      <input type="radio" name="tm" value="promedio_spa" checked={ticketMod==='promedio_spa'} onChange={e=>setTM(e.target.value)}/>
                      Promedio del spa
                    </label>
                  </div>
                  {ticketMod === 'monto' ? (
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:13,color:'var(--ink-3)'}}>≥</span>
                      <span style={{fontSize:14,fontFamily:'var(--serif)',color:'var(--ink-3)'}}>$</span>
                      <input type="number" step="0.01" min="0" value={ticketVal} onChange={e=>setTV(e.target.value)} placeholder="800" className="num" style={{...fieldStyle,maxWidth:140}}/>
                      <span style={{fontSize:12,color:'var(--ink-3)'}}>MXN por servicio</span>
                    </div>
                  ) : (
                    <div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--ink-2)'}}>
                      <span>Ventana histórica:</span>
                      <input type="number" min="1" max="24" value={ticketVent} onChange={e=>setTVen(e.target.value)} className="num" style={{...fieldStyle,maxWidth:70}}/>
                      <span style={{color:'var(--ink-3)'}}>meses · auto-recalculado en vivo</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            )}

            {/* Cond servicios mínimos (solo individual) */}
            {tipo === 'bono_individual' && (
            <div style={{padding:'10px 14px',background:usaSvc?'var(--paper-sunk)':'transparent',border:'1px solid '+(usaSvc?'var(--line-2)':'var(--line-1)'),borderRadius:8}}>
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,fontWeight:600,color:'var(--ink-1)'}}>
                <input type="checkbox" checked={usaSvc} onChange={e=>setUS(e.target.checked)}/>
                Mínimo de servicios (consistencia)
              </label>
              {usaSvc && (
                <div style={{marginTop:8,display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:13,color:'var(--ink-3)'}}>≥</span>
                  <input type="number" min="1" value={svcMin} onChange={e=>setSM(e.target.value)} className="num" style={{...fieldStyle,maxWidth:100}}/>
                  <span style={{fontSize:12,color:'var(--ink-3)'}}>servicios en el periodo</span>
                </div>
              )}
            </div>
            )}
          </div>

          {/* Bono: modalidad % o monto fijo */}
          <div style={{marginBottom:14,padding:'14px 16px',background:'var(--sand-100)',border:'1px solid #ecd49a',borderRadius:10}}>
            <div style={{fontSize:11,fontWeight:700,color:'#7a4e10',letterSpacing:.4,textTransform:'uppercase',marginBottom:10}}>Bono (si cumple TODAS las condiciones)</div>
            <div style={{display:'flex',gap:14,marginBottom:12,fontSize:12.5}}>
              <label style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer'}}>
                <input type="radio" name="bmod" value="porcentaje" checked={bonoModalidad==='porcentaje'} onChange={e=>setBMod(e.target.value)}/>
                Porcentaje
              </label>
              <label style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer'}}>
                <input type="radio" name="bmod" value="monto_fijo" checked={bonoModalidad==='monto_fijo'} onChange={e=>setBMod(e.target.value)}/>
                Monto fijo
              </label>
            </div>
            {bonoModalidad === 'porcentaje' ? (
              <>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                  <span style={{fontSize:13,color:'var(--ink-2)'}}>%:</span>
                  <input type="number" step="0.01" min="0" max="100" value={bonoPct} onChange={e=>setBP(e.target.value)} className="num" style={{...fieldStyle,maxWidth:100,fontSize:18,fontFamily:'var(--serif)',fontWeight:600}}/>
                  <span style={{fontSize:13,color:'var(--ink-3)'}}>%</span>
                </div>
                <div style={{display:'flex',gap:14,fontSize:12.5,flexWrap:'wrap'}}>
                  <label style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer'}}>
                    <input type="radio" name="bb" value="exceso" checked={bonoBase==='exceso'} onChange={e=>setBB(e.target.value)}/>
                    Sobre exceso (pasó del mínimo de ventas)
                  </label>
                  <label style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer'}}>
                    <input type="radio" name="bb" value="total" checked={bonoBase==='total'} onChange={e=>setBB(e.target.value)}/>
                    Sobre venta total
                  </label>
                  <label style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer'}}>
                    <input type="radio" name="bb" value="neta" checked={bonoBase==='neta'} onChange={e=>setBB(e.target.value)}/>
                    Sobre venta neta (ventas − comisiones)
                  </label>
                </div>
              </>
            ) : (
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:13,color:'var(--ink-2)'}}>Monto:</span>
                <span style={{fontSize:18,fontFamily:'var(--serif)',color:'var(--ink-3)'}}>$</span>
                <input type="number" step="0.01" min="0" value={bonoMontoFijo} onChange={e=>setBMF(e.target.value)} placeholder="500" className="num" style={{...fieldStyle,maxWidth:160,fontSize:18,fontFamily:'var(--serif)',fontWeight:600}}/>
                <span style={{fontSize:13,color:'var(--ink-3)'}}>MXN al cumplir condiciones</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Descripción + activo */}
      <div style={{marginBottom:14}}>
        <label style={labelStyle}>Descripción (opcional)</label>
        <textarea value={descripcion} onChange={e=>setDesc(e.target.value)} rows={2} placeholder="Notas internas sobre este objetivo" style={{...fieldStyle,resize:'vertical',minHeight:50}}/>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
        <Toggle checked={activo} onChange={setAct}/>
        <span style={{fontSize:13,color:'var(--ink-1)'}}>{activo ? 'Activo' : 'Inactivo'} — se calcula y muestra en la pantalla</span>
      </div>

      <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:18,paddingTop:14,borderTop:'1px solid var(--line-1)'}}>
        <Btn variant="ghost" size="md" onClick={onCancel} disabled={saving}>Cancelar</Btn>
        <Btn variant="clay" size="md" icon="check" onClick={guardar} disabled={saving}>{saving?'Guardando…':(editando?'Guardar cambios':'Crear objetivo')}</Btn>
      </div>
    </div>
  );
};

Object.assign(window, { FormObjetivo });
