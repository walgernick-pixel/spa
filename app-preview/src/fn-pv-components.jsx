// ──────────────────────────────────────────
// PV · Componentes auxiliares: bloque de colaboradora + form de venta
// ──────────────────────────────────────────

const ColabBlockFn = ({c, canales, monedas, cuentas, turnoAbierto, onTogglePago, onDelVenta, onEditVenta}) => {
  const [open, setOpen] = React.useState(true);
  const tones = ['clay','moss','sand','blue','ink','rose'];
  let h = 0; for (let i=0;i<c.nombre.length;i++) h = (h*31 + c.nombre.charCodeAt(i)) >>> 0;
  const tone = tones[h % tones.length];

  // Agrupar ventas por moneda
  const porMoneda = {};
  c.ventas.forEach(v => {
    if (!porMoneda[v.moneda]) porMoneda[v.moneda] = {ventas:[], totalVenta:0, totalComision:0, totalPropina:0};
    porMoneda[v.moneda].ventas.push(v);
    porMoneda[v.moneda].totalVenta    += Number(v.precio || 0);
    porMoneda[v.moneda].totalComision += Number(v.comision_monto || 0);
    porMoneda[v.moneda].totalPropina  += Number(v.propina || 0);
  });

  return (
    <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden'}}>
      {/* Header bloque */}
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:c.pagado?'rgba(107,125,74,.06)':'var(--paper-sunk)',borderBottom:'1px solid var(--line-1)',cursor:'pointer'}} onClick={()=>setOpen(!open)}>
        <Av name={c.alias || c.nombre} tone={tone} size={38}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:14,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.1}}>{c.nombre}</span>
            {c.pagado ? <Chip tone="moss"><Icon name="check" size={9} stroke={2.4}/>Comisión pagada</Chip> : <Chip tone="amber">Pendiente de pago</Chip>}
          </div>
          <div style={{fontSize:11.5,color:'var(--ink-3)',marginTop:2}}>
            {c.ventas.length} {c.ventas.length===1?'servicio':'servicios'} · <span className="num">${Math.round(c.totalMxn).toLocaleString('es-MX')}</span> MXN
          </div>
        </div>
        <div style={{textAlign:'right',marginRight:10}}>
          <div style={{fontSize:10,color:'var(--ink-3)',fontWeight:600,letterSpacing:.3,textTransform:'uppercase',marginBottom:2}}>A recibir</div>
          <div className="num" style={{fontSize:15,fontWeight:700,color:'var(--clay)',fontFamily:'var(--serif)'}}>${Math.round(c.comisionMxn + c.propinaMxn).toLocaleString('es-MX')}</div>
        </div>
        {turnoAbierto && (
          <button onClick={e=>{e.stopPropagation(); onTogglePago();}} title={c.pagado?'Marcar como pendiente':'Marcar comisión pagada'} style={{background:c.pagado?'var(--moss)':'var(--paper-raised)',border:`1.5px solid ${c.pagado?'var(--moss)':'var(--line-1)'}`,borderRadius:6,padding:'6px 10px',fontSize:11.5,color:c.pagado?'#fff':'var(--ink-2)',cursor:'pointer',fontWeight:600,fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
            <Icon name="check" size={11} stroke={2} color={c.pagado?'#fff':'var(--ink-3)'}/>
            {c.pagado ? 'Pagado' : 'Marcar pago'}
          </button>
        )}
        <Icon name="chev-down" size={14} color="var(--ink-3)" style={{transform:open?'rotate(0)':'rotate(-90deg)',transition:'transform .15s'}}/>
      </div>

      {/* Ventas agrupadas por moneda */}
      {open && (
        <div style={{padding:'10px 14px'}}>
          {Object.entries(porMoneda).map(([moneda, bloque]) => {
            const monMeta = monedas[moneda];
            const color = moneda==='MXN'?'var(--ink-blue)':moneda==='USD'?'var(--moss)':'var(--clay)';
            return (
              <div key={moneda} style={{marginBottom:8,border:`1px solid ${color}22`,borderRadius:8,overflow:'hidden'}}>
                <div style={{padding:'6px 12px',background:`${color}0d`,display:'flex',alignItems:'center',gap:10,borderBottom:`1px dashed ${color}33`}}>
                  <span style={{width:8,height:8,borderRadius:2,background:color}}/>
                  <span style={{fontSize:11,fontWeight:700,color:color,fontFamily:'var(--mono)',letterSpacing:.4}}>{moneda}</span>
                  <div style={{flex:1}}/>
                  <span style={{fontSize:10.5,color:'var(--ink-3)'}}>
                    Venta <strong className="num" style={{color:'var(--ink-1)'}}>{monMeta?.simbolo||'$'}{Math.round(bloque.totalVenta).toLocaleString('es-MX')}</strong>
                    {' · '}Com. <strong className="num" style={{color:'var(--clay)'}}>{monMeta?.simbolo||'$'}{Math.round(bloque.totalComision).toLocaleString('es-MX')}</strong>
                    {bloque.totalPropina>0 && <>{' · '}Prop. <strong className="num" style={{color:'var(--ink-2)'}}>{monMeta?.simbolo||'$'}{Math.round(bloque.totalPropina).toLocaleString('es-MX')}</strong></>}
                  </span>
                </div>
                {bloque.ventas.map(v => (
                  <div key={v.id} style={{display:'grid',gridTemplateColumns:'1fr 110px 90px 90px 70px',gap:10,alignItems:'center',padding:'8px 12px',fontSize:12.5,borderTop:'1px solid var(--line-2)'}}>
                    <div>
                      <div style={{fontWeight:600,color:'var(--ink-0)'}}>{v.servicio}</div>
                      <div style={{fontSize:10.5,color:'var(--ink-3)',marginTop:2,display:'flex',gap:6,alignItems:'center'}}>
                        {v.canal && <Chip tone={v.canal_tone || 'neutral'} style={{fontSize:9,padding:'1px 5px'}}>{v.canal}</Chip>}
                        {v.cuenta && <span>· {v.cuenta}</span>}
                        {v.notas && <span>· {v.notas}</span>}
                      </div>
                    </div>
                    <div className="num" style={{textAlign:'right',color:'var(--ink-1)',fontWeight:600}}>{monMeta?.simbolo||'$'}{Number(v.precio).toLocaleString('es-MX',{minimumFractionDigits:2})}</div>
                    <div className="num" style={{textAlign:'right',color:'var(--clay)',fontSize:11.5}}>{v.comision_pct}% · {monMeta?.simbolo||'$'}{Math.round(v.comision_monto).toLocaleString('es-MX')}</div>
                    <div className="num" style={{textAlign:'right',color:'var(--ink-3)',fontSize:11.5}}>{v.propina>0?`${monMeta?.simbolo||'$'}${Math.round(v.propina).toLocaleString('es-MX')}`:'—'}</div>
                    <div style={{display:'flex',gap:2,justifyContent:'flex-end'}}>
                      {turnoAbierto && <button onClick={()=>onEditVenta(v)} title="Editar" style={{background:'transparent',border:'none',cursor:'pointer',padding:4,color:'var(--ink-3)'}}><Icon name="edit" size={12}/></button>}
                      {turnoAbierto && <button onClick={()=>onDelVenta(v)} title="Borrar" style={{background:'transparent',border:'none',cursor:'pointer',padding:4,color:'var(--ink-3)'}}><Icon name="trash" size={12}/></button>}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ───────────── Formulario de venta ─────────────
const FormVenta = ({venta, turnoId, servicios, canales, colabs, cuentas, monedas, onSave, onCancel}) => {
  const editando = !!venta;
  const [servicioId, setServicio]   = React.useState(venta?.servicio_id || servicios[0]?.id || '');
  const [colabId, setColab]         = React.useState(venta?.colaboradora_id || colabs[0]?.id || '');
  const [canalId, setCanal]         = React.useState(venta?.canal_id || canales[0]?.id || '');
  const [cuentaId, setCuenta]       = React.useState(venta?.cuenta_id || cuentas[0]?.id || '');
  const [precio, setPrecio]         = React.useState(venta?.precio || '');
  const [duracion, setDuracion]     = React.useState(venta?.duracion_min || '');
  const [comisionPct, setPct]       = React.useState(venta?.comision_pct ?? '');
  const [propina, setPropina]       = React.useState(venta?.propina || 0);
  const [notas, setNotas]           = React.useState(venta?.notas || '');
  const [saving, setSaving]         = React.useState(false);

  const servicio = servicios.find(s => s.id === servicioId);
  const canal    = canales.find(c => c.id === canalId);
  const cuenta   = cuentas.find(c => c.id === cuentaId);
  const moneda   = cuenta ? monedas[cuenta.moneda] : null;
  const tc       = moneda ? Number(moneda.tc_a_mxn) : 1;

  // Auto-ajustar precio y duración según servicio (solo si no hay precio/duración custom)
  React.useEffect(()=>{
    if (!editando && servicio) {
      if (servicio.precio_base > 0 && !precio) setPrecio(servicio.precio_base);
      if (servicio.duracion_min > 0 && !duracion) setDuracion(servicio.duracion_min);
    }
    // eslint-disable-next-line
  },[servicioId]);

  // Auto-set % según canal (al cambiar canal)
  React.useEffect(()=>{
    if (canal && (comisionPct === '' || comisionPct === null)) {
      setPct(canal.comision_default);
    }
    // eslint-disable-next-line
  },[canalId]);

  // Siempre que cambie canal → actualizar % (incluso si ya tenía valor)
  const cambiarCanal = (id) => {
    setCanal(id);
    const c = canales.find(x => x.id === id);
    if (c) setPct(c.comision_default);
  };

  const precioNum   = parseFloat(precio) || 0;
  const pctNum      = parseFloat(comisionPct) || 0;
  const propinaNum  = parseFloat(propina) || 0;
  const comisionMonto = precioNum * pctNum / 100;
  const spaRecibe   = precioNum - comisionMonto;

  const fieldStyle = {width:'100%',padding:'9px 12px',fontSize:13,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontFamily:'inherit',color:'var(--ink-1)',boxSizing:'border-box'};
  const labelStyle = {display:'block',fontSize:11,fontWeight:600,letterSpacing:.4,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:6};

  const guardar = async () => {
    if (!servicioId)  return notify('Selecciona el servicio','err');
    if (!colabId)     return notify('Selecciona la colaboradora','err');
    if (!canalId)     return notify('Selecciona el canal','err');
    if (!cuentaId)    return notify('Selecciona la cuenta donde cae el pago','err');
    if (precioNum<=0) return notify('El precio debe ser mayor a 0','err');
    if (pctNum<0 || pctNum>100) return notify('El % de comisión debe estar entre 0 y 100','err');

    setSaving(true);
    const payload = {
      turno_id: turnoId,
      servicio_id: servicioId,
      colaboradora_id: colabId,
      canal_id: canalId,
      cuenta_id: cuentaId,
      precio: precioNum,
      duracion_min: parseInt(duracion) || null,
      comision_pct: pctNum,
      comision_monto: comisionMonto,
      propina: propinaNum,
      moneda: cuenta.moneda,
      tc_momento: tc,
      notas: notas.trim() || null,
    };
    let error;
    if (editando) ({error} = await sb.from('ventas').update(payload).eq('id', venta.id));
    else          ({error} = await sb.from('ventas').insert(payload));
    if (error) { setSaving(false); return notify('Error: '+error.message,'err'); }

    // Upsert turno_colaboradoras (asegurar que esta colaboradora está registrada en el turno)
    await sb.from('turno_colaboradoras').upsert({turno_id: turnoId, colaboradora_id: colabId},{onConflict:'turno_id,colaboradora_id',ignoreDuplicates:true});

    setSaving(false);
    notify(editando?'Servicio actualizado':'Servicio registrado');
    onSave();
  };

  if (colabs.length === 0 || cuentas.length === 0 || servicios.length === 0 || canales.length === 0) {
    return (
      <div style={{padding:'10px 0 0'}}>
        <div style={{padding:'14px 16px',background:'var(--sand-100)',border:'1px solid #ecd49a',borderRadius:10,fontSize:12.5,color:'#7a4e10',lineHeight:1.55,marginBottom:14}}>
          <strong>Falta configuración.</strong> No se puede registrar una venta sin:
          <ul style={{margin:'6px 0 0 16px',padding:0,fontSize:12}}>
            {servicios.length === 0 && <li>Al menos un <strong>servicio</strong> activo</li>}
            {canales.length === 0 && <li>Al menos un <strong>canal</strong> activo</li>}
            {colabs.length === 0 && <li>Al menos una <strong>colaboradora</strong> activa</li>}
            {cuentas.length === 0 && <li>Al menos una <strong>cuenta</strong> activa</li>}
          </ul>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
          <Btn variant="ghost" size="md" onClick={onCancel}>Cerrar</Btn>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Fila 1: Servicio + Colaboradora */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
        <div>
          <label style={labelStyle}>Servicio</label>
          <select value={servicioId} onChange={e=>setServicio(e.target.value)} style={fieldStyle}>
            {servicios.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Colaboradora</label>
          <select value={colabId} onChange={e=>setColab(e.target.value)} style={fieldStyle}>
            {colabs.map(c=><option key={c.id} value={c.id}>{c.alias || `${c.nombre}${c.apellidos?' '+c.apellidos:''}`}</option>)}
          </select>
        </div>
      </div>

      {/* Fila 2: Canal + % (bloqueado, viene del canal) */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 180px',gap:12,marginBottom:14}}>
        <div>
          <label style={labelStyle}>Canal de venta</label>
          <select value={canalId} onChange={e=>cambiarCanal(e.target.value)} style={fieldStyle}>
            {canales.map(c=><option key={c.id} value={c.id}>{c.label} · {Number(c.comision_default)}%</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>% terapeuta</label>
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'9px 12px',fontSize:15,fontWeight:600,fontFamily:'var(--serif)',letterSpacing:-.2,color:'var(--ink-1)',background:'var(--paper-sunk)',border:'1px solid var(--line-2)',borderRadius:8,cursor:'not-allowed'}}>
            <Icon name="lock" size={11} color="var(--ink-3)"/>
            <span className="num" style={{flex:1,textAlign:'right'}}>{pctNum % 1 === 0 ? pctNum.toFixed(0) : pctNum.toFixed(2)}%</span>
          </div>
          <div style={{fontSize:10,color:'var(--ink-3)',marginTop:4,lineHeight:1.3}}>Definido por el canal. Para cambiarlo, edita el canal en Configuración.</div>
        </div>
      </div>

      {/* Fila 3: Cuenta + Duración */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 140px',gap:12,marginBottom:14}}>
        <div>
          <label style={labelStyle}>Cuenta donde cae el pago</label>
          <select value={cuentaId} onChange={e=>setCuenta(e.target.value)} style={fieldStyle}>
            {cuentas.map(c=><option key={c.id} value={c.id}>{c.label} · {c.moneda}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Duración (min)</label>
          <input type="number" min="0" value={duracion} onChange={e=>setDuracion(e.target.value)} placeholder="—" style={fieldStyle} className="num"/>
        </div>
      </div>

      {/* Fila 4: Precio + Propina */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14,padding:'14px',background:'var(--paper-sunk)',borderRadius:10,border:'1px solid var(--line-2)'}}>
        <div>
          <label style={labelStyle}>Precio {moneda && `(${moneda.codigo})`}</label>
          <div style={{position:'relative'}}>
            <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--ink-3)',fontSize:18,fontFamily:'var(--serif)'}}>$</span>
            <input type="number" step="0.01" min="0" value={precio} onChange={e=>setPrecio(e.target.value)} placeholder="0.00" style={{...fieldStyle,paddingLeft:28,fontSize:18,fontWeight:600,fontFamily:'var(--serif)',textAlign:'right'}} className="num"/>
          </div>
          {moneda && moneda.codigo !== 'MXN' && precioNum>0 && (
            <div style={{fontSize:10.5,color:'var(--ink-3)',marginTop:4,textAlign:'right'}} className="num">≈ ${(precioNum*tc).toLocaleString('es-MX',{maximumFractionDigits:0})} MXN (TC {tc.toFixed(2)})</div>
          )}
        </div>
        <div>
          <label style={labelStyle}>Propina (opcional) · 100% al terapeuta</label>
          <div style={{position:'relative'}}>
            <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--ink-3)',fontSize:14}}>$</span>
            <input type="number" step="0.01" min="0" value={propina} onChange={e=>setPropina(e.target.value)} placeholder="0" style={{...fieldStyle,paddingLeft:22,textAlign:'right'}} className="num"/>
          </div>
        </div>
      </div>

      {/* Cálculo en vivo */}
      {precioNum > 0 && (
        <div style={{padding:'12px 14px',background:'linear-gradient(135deg, #fef9ef 0%, #fcecd9 100%)',border:'1px solid #ecd49a',borderRadius:10,marginBottom:14}}>
          <div style={{fontSize:10.5,fontWeight:700,letterSpacing:.6,textTransform:'uppercase',color:'var(--clay)',marginBottom:8}}>Desglose</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,fontSize:12}}>
            <div>
              <div style={{color:'var(--ink-3)',fontSize:10.5,marginBottom:2}}>Al terapeuta</div>
              <div className="num" style={{fontWeight:700,color:'var(--clay)'}}>{moneda?.simbolo||'$'}{(comisionMonto+propinaNum).toLocaleString('es-MX',{maximumFractionDigits:2})}</div>
              <div style={{color:'var(--ink-3)',fontSize:9.5,marginTop:1}}>{pctNum}% + propina</div>
            </div>
            <div>
              <div style={{color:'var(--ink-3)',fontSize:10.5,marginBottom:2}}>Al spa</div>
              <div className="num" style={{fontWeight:700,color:'var(--moss)'}}>{moneda?.simbolo||'$'}{spaRecibe.toLocaleString('es-MX',{maximumFractionDigits:2})}</div>
              <div style={{color:'var(--ink-3)',fontSize:9.5,marginTop:1}}>{(100-pctNum).toFixed(0)}%</div>
            </div>
            <div>
              <div style={{color:'var(--ink-3)',fontSize:10.5,marginBottom:2}}>Cobrado al cliente</div>
              <div className="num" style={{fontWeight:700,color:'var(--ink-0)'}}>{moneda?.simbolo||'$'}{(precioNum+propinaNum).toLocaleString('es-MX',{maximumFractionDigits:2})}</div>
              <div style={{color:'var(--ink-3)',fontSize:9.5,marginTop:1}}>{cuenta?.label}</div>
            </div>
          </div>
        </div>
      )}

      {/* Notas */}
      <div style={{marginBottom:14}}>
        <label style={labelStyle}>Notas (opcional)</label>
        <input value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Observaciones, nombre del cliente, etc." style={fieldStyle}/>
      </div>

      <div style={{display:'flex',justifyContent:'flex-end',gap:10,paddingTop:10,borderTop:'1px solid var(--line-1)'}}>
        <Btn variant="ghost" size="md" onClick={onCancel} disabled={saving}>Cancelar</Btn>
        <Btn variant="clay" size="md" icon="check" onClick={guardar} disabled={saving}>{saving?'Guardando…':(editando?'Guardar cambios':'Registrar servicio')}</Btn>
      </div>
    </div>
  );
};

Object.assign(window, { ColabBlockFn, FormVenta });
