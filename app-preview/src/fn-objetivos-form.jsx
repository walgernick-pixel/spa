// ──────────────────────────────────────────
// Objetivos · Formulario modal (crear / editar)
// Tipo + periodo + campos dinámicos según tipo
// ──────────────────────────────────────────

const FormObjetivo = ({obj, onSave, onCancel, defaultsHistoricos}) => {
  const editando = !!obj;

  // Campos comunes
  const [tipo, setTipo]     = React.useState(obj?.tipo || 'venta_spa');
  const [periodo, setPer]   = React.useState(obj?.periodo || 'mes');
  const [periodoFecha, setPF] = React.useState(obj?.periodo_fecha || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
  })());
  const [activo, setAct]    = React.useState(obj?.activo ?? true);
  const [descripcion, setDesc] = React.useState(obj?.descripcion || '');

  // venta_spa
  const [metaModalidad, setMM] = React.useState(obj?.meta_modalidad || 'monto');
  const [metaValor, setMV]     = React.useState(obj?.meta_valor || '');

  // bono_individual: condiciones
  const [usaVentas, setUV]   = React.useState(obj ? obj.cond_ventas_min != null : true);
  const [ventasMin, setVMin] = React.useState(obj?.cond_ventas_min || '');

  const [usaTicket, setUT]    = React.useState(obj ? obj.cond_ticket_modalidad != null : false);
  const [ticketMod, setTM]    = React.useState(obj?.cond_ticket_modalidad || 'promedio_spa');
  const [ticketVal, setTV]    = React.useState(obj?.cond_ticket_valor || '');
  const [ticketVent, setTVen] = React.useState(obj?.cond_ticket_ventana || ventanaDefaultObj(periodo));

  const [usaSvc, setUS]   = React.useState(obj ? obj.cond_servicios_min != null : true);
  const [svcMin, setSM]   = React.useState(obj?.cond_servicios_min || 15);

  const [bonoPct, setBP]  = React.useState(obj?.bono_pct || 5);
  const [bonoBase, setBB] = React.useState(obj?.bono_base || 'exceso');

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
      if (!bonoPct || Number(bonoPct) <= 0) return notify('Falta el % del bono','err');
    }

    setSaving(true);
    const payload = {
      tipo, periodo, periodo_fecha: periodoFecha,
      descripcion: descripcion.trim() || null,
      activo,
      // Limpiamos según tipo
      meta_modalidad: tipo === 'venta_spa' ? metaModalidad : null,
      meta_valor: (tipo === 'venta_spa' || tipo === 'ticket_spa') ? Number(metaValor) : null,
      cond_ventas_min: (tipo === 'bono_individual' && usaVentas) ? Number(ventasMin) : null,
      cond_ticket_modalidad: (tipo === 'bono_individual' && usaTicket) ? ticketMod : null,
      cond_ticket_valor: (tipo === 'bono_individual' && usaTicket && ticketMod === 'monto') ? Number(ticketVal) : null,
      cond_ticket_ventana: (tipo === 'bono_individual' && usaTicket && ticketMod === 'promedio_spa') ? Number(ticketVent) : null,
      cond_servicios_min: (tipo === 'bono_individual' && usaSvc) ? Number(svcMin) : null,
      bono_pct: tipo === 'bono_individual' ? Number(bonoPct) : null,
      bono_base: tipo === 'bono_individual' ? bonoBase : null,
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
      {/* Tipo + periodo */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 130px 150px',gap:10,marginBottom:14}}>
        <div>
          <label style={labelStyle}>Tipo de objetivo</label>
          <select value={tipo} onChange={e=>setTipo(e.target.value)} style={fieldStyle} disabled={editando}>
            <option value="venta_spa">Venta total del spa</option>
            <option value="ticket_spa">Ticket promedio del spa</option>
            <option value="bono_individual">Bono individual (condiciones)</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Periodo</label>
          <select value={periodo} onChange={e=>setPer(e.target.value)} style={fieldStyle} disabled={editando}>
            <option value="mes">Mensual</option>
            <option value="trimestre">Trimestral</option>
            <option value="anio">Anual</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Inicio del periodo</label>
          <input type="date" value={periodoFecha} onChange={e=>setPF(e.target.value)} style={fieldStyle}/>
        </div>
      </div>

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

      {/* bono_individual: condiciones */}
      {tipo === 'bono_individual' && (
        <>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:'var(--ink-2)',letterSpacing:.4,textTransform:'uppercase',marginBottom:6}}>Condiciones para ganar el bono</div>
            <div style={{fontSize:11,color:'var(--ink-3)',marginBottom:10}}>Activa las condiciones que apliquen — todas deben cumplirse.</div>

            {/* Cond ventas */}
            <div style={{padding:'10px 14px',background:usaVentas?'var(--paper-sunk)':'transparent',border:'1px solid '+(usaVentas?'var(--line-2)':'var(--line-1)'),borderRadius:8,marginBottom:8}}>
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,fontWeight:600,color:'var(--ink-1)'}}>
                <input type="checkbox" checked={usaVentas} onChange={e=>setUV(e.target.checked)}/>
                Meta de ventas
              </label>
              {usaVentas && (
                <div style={{marginTop:8,display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:13,color:'var(--ink-3)'}}>≥</span>
                  <span style={{fontSize:14,fontFamily:'var(--serif)',color:'var(--ink-3)'}}>$</span>
                  <input type="number" step="0.01" min="0" value={ventasMin} onChange={e=>setVMin(e.target.value)} placeholder="10000" className="num" style={{...fieldStyle,maxWidth:160}}/>
                  <span style={{fontSize:12,color:'var(--ink-3)'}}>MXN en el periodo</span>
                </div>
              )}
            </div>

            {/* Cond ticket */}
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

            {/* Cond servicios mínimos */}
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
          </div>

          {/* Bono */}
          <div style={{marginBottom:14,padding:'14px 16px',background:'var(--sand-100)',border:'1px solid #ecd49a',borderRadius:10}}>
            <div style={{fontSize:11,fontWeight:700,color:'#7a4e10',letterSpacing:.4,textTransform:'uppercase',marginBottom:10}}>Bono (si cumple TODAS las condiciones)</div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
              <span style={{fontSize:13,color:'var(--ink-2)'}}>%:</span>
              <input type="number" step="0.01" min="0" max="100" value={bonoPct} onChange={e=>setBP(e.target.value)} className="num" style={{...fieldStyle,maxWidth:100,fontSize:18,fontFamily:'var(--serif)',fontWeight:600}}/>
              <span style={{fontSize:13,color:'var(--ink-3)'}}>%</span>
            </div>
            <div style={{display:'flex',gap:14,fontSize:12.5}}>
              <label style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer'}}>
                <input type="radio" name="bb" value="exceso" checked={bonoBase==='exceso'} onChange={e=>setBB(e.target.value)}/>
                Sobre exceso (lo que pasó del mínimo de ventas)
              </label>
              <label style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer'}}>
                <input type="radio" name="bb" value="total" checked={bonoBase==='total'} onChange={e=>setBB(e.target.value)}/>
                Sobre venta total
              </label>
            </div>
          </div>
        </>
      )}

      {/* Descripción + activo */}
      <div style={{marginBottom:14}}>
        <label style={labelStyle}>Descripción (opcional)</label>
        <textarea value={descripcion} onChange={e=>setDesc(e.target.value)} rows={2} placeholder="Notas internas sobre este objetivo" style={{...fieldStyle,resize:'vertical',minHeight:50}}/>
      </div>
      <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',marginBottom:6}}>
        <input type="checkbox" checked={activo} onChange={e=>setAct(e.target.checked)}/>
        <span style={{fontSize:13,color:'var(--ink-1)'}}>Activo (se calcula y muestra en dashboard)</span>
      </label>

      <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:18,paddingTop:14,borderTop:'1px solid var(--line-1)'}}>
        <Btn variant="ghost" size="md" onClick={onCancel} disabled={saving}>Cancelar</Btn>
        <Btn variant="clay" size="md" icon="check" onClick={guardar} disabled={saving}>{saving?'Guardando…':(editando?'Guardar cambios':'Crear objetivo')}</Btn>
      </div>
    </div>
  );
};

Object.assign(window, { FormObjetivo });
