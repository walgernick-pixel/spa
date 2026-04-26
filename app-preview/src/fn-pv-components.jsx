// ──────────────────────────────────────────
// PV · Componentes auxiliares: bloque de colaboradora + form de venta + firma
// ──────────────────────────────────────────

// ───────────── Modal de firma digital ─────────────
const FirmaModal = ({colab, monedas, onSave, onCancel}) => {
  const canvasRef = React.useRef(null);
  const sigPadRef = React.useRef(null);
  const [saving, setSaving] = React.useState(false);
  const [vacio, setVacio]   = React.useState(true);

  // Inicializar signature_pad al montar
  React.useEffect(() => {
    if (!canvasRef.current || !window.SignaturePad) return;
    // Redimensionar canvas para retina displays
    const canvas = canvasRef.current;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width  = canvas.offsetWidth  * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d').scale(ratio, ratio);
    sigPadRef.current = new window.SignaturePad(canvas, {
      backgroundColor: 'rgba(255,255,255,0)',
      penColor: '#201c16',
      minWidth: 0.8,
      maxWidth: 2.2,
    });
    const onChange = () => setVacio(sigPadRef.current.isEmpty());
    sigPadRef.current.addEventListener('endStroke', onChange);
    return () => sigPadRef.current?.removeEventListener('endStroke', onChange);
  }, []);

  const limpiar = () => { sigPadRef.current?.clear(); setVacio(true); };

  const guardar = async () => {
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) return notify('Firma vacía — dibuja para confirmar','err');
    setSaving(true);
    const dataUrl = sigPadRef.current.toDataURL('image/png');
    await onSave(dataUrl);
    setSaving(false);
  };

  // Resumen de lo que recibe la colab
  const ejec = colab.ventasEjecutadas || [];
  const vend = colab.ventasVendidas || [];
  const porMoneda = {};
  ejec.forEach(v => {
    if (!porMoneda[v.moneda]) porMoneda[v.moneda] = 0;
    porMoneda[v.moneda] += Number(v.comision_monto||0) + Number(v.propina||0);
  });
  vend.forEach(v => {
    if (!porMoneda[v.moneda]) porMoneda[v.moneda] = 0;
    porMoneda[v.moneda] += Number(v.comision_venta_monto||0);
  });

  return (
    <Modal title={`Firma de recibido · ${colab.nombre}`} onClose={onCancel} wide>
      <div style={{padding:'10px 0'}}>
        <div style={{padding:'14px 16px',background:'var(--sand-100)',border:'1px solid #ecd49a',borderRadius:10,marginBottom:14,fontSize:12.5,color:'#7a4e10',lineHeight:1.5}}>
          Al firmar, <strong>{colab.nombre}</strong> confirma haber recibido sus comisiones y propinas del turno. La firma queda guardada con timestamp.
        </div>

        {/* Resumen de pago */}
        <div style={{padding:'12px 16px',background:'var(--paper-sunk)',border:'1px solid var(--line-1)',borderRadius:10,marginBottom:14}}>
          <div style={{fontSize:10.5,fontWeight:700,letterSpacing:.5,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:8}}>Recibe</div>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            {Object.entries(porMoneda).map(([m, total]) => {
              const sym = monedas[m]?.simbolo || '$';
              return (
                <div key={m} style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                  <span style={{color:'var(--ink-2)'}}>{m}</span>
                  <span className="num" style={{fontWeight:700,color:'var(--ink-0)',fontFamily:'var(--serif)'}}>{sym}{total.toLocaleString('es-MX',{minimumFractionDigits:2})}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Canvas de firma */}
        <div style={{marginBottom:10}}>
          <label style={{display:'block',fontSize:11,fontWeight:700,letterSpacing:.4,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:6}}>Firma aquí con tu dedo o el lápiz</label>
          <div style={{position:'relative',background:'#fff',border:'1.5px dashed var(--line-1)',borderRadius:10,height:200,overflow:'hidden',touchAction:'none'}}>
            <canvas ref={canvasRef} style={{width:'100%',height:'100%',display:'block',touchAction:'none'}}/>
            {vacio && (
              <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none',color:'var(--ink-3)',fontSize:13,fontStyle:'italic'}}>
                ✎ Firma aquí
              </div>
            )}
          </div>
          <div style={{fontSize:11,color:'var(--ink-3)',marginTop:5,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span>La firma se guardará como imagen junto al pago.</span>
            <button onClick={limpiar} style={{background:'transparent',border:'none',color:'var(--ink-2)',fontSize:11.5,fontWeight:500,cursor:'pointer',textDecoration:'underline',fontFamily:'inherit'}}>Borrar y empezar de nuevo</button>
          </div>
        </div>

        <div style={{display:'flex',justifyContent:'flex-end',gap:10,paddingTop:12,borderTop:'1px solid var(--line-1)'}}>
          <Btn variant="ghost" size="md" onClick={onCancel} disabled={saving}>Cancelar</Btn>
          <Btn variant="clay" size="md" icon="check" onClick={guardar} disabled={saving || vacio}>{saving?'Guardando…':'Confirmar y firmar'}</Btn>
        </div>
      </div>
    </Modal>
  );
};



const ColabBlockFn = ({c, canales, monedas, cuentas, ventaPagos=[], ocultarMontos=false, turnoAbierto, globalOpen, onTogglePago, onFirmar, onDelVenta, onEditVenta}) => {
  const [open, setOpen] = React.useState(true);
  // Sincroniza con el toggle global (colapsar/expandir todo)
  React.useEffect(() => {
    if (typeof globalOpen === 'boolean') setOpen(globalOpen);
  }, [globalOpen]);
  const tones = ['clay','moss','sand','blue','ink','rose'];
  let h = 0; for (let i=0;i<c.nombre.length;i++) h = (h*31 + c.nombre.charCodeAt(i)) >>> 0;
  const tone = tones[h % tones.length];
  const ejecutadas = c.ventasEjecutadas || c.ventas || [];
  const vendidas   = c.ventasVendidas || [];

  // Mapa venta_id → pagos, y helper de cuenta lookup
  const pagosByVenta = React.useMemo(() => {
    const m = {};
    ventaPagos.forEach(p => { (m[p.venta_id] = m[p.venta_id] || []).push(p); });
    return m;
  }, [ventaPagos]);
  const cuentaById = React.useMemo(() => {
    const m = {};
    cuentas.forEach(x => { m[x.id] = x; });
    return m;
  }, [cuentas]);

  // Agrupar TODO por CUENTA usando venta_pagos (soporta split)
  const porCuenta = {};
  const ensureC = (cuentaId) => {
    const cuenta = cuentaById[cuentaId];
    if (!cuenta) return null;
    if (!porCuenta[cuentaId]) porCuenta[cuentaId] = {
      cuenta_id: cuentaId,
      cuenta: cuenta.label,
      cuenta_tipo: cuenta.tipo,
      moneda: cuenta.moneda,
      ejecutadas: [],
      vendidas: [],
      comisionEjec: 0,
      propina: 0,
      comisionVenta: 0,
      totalVentaEjec: 0,
    };
    return porCuenta[cuentaId];
  };

  ejecutadas.forEach(v => {
    const pagosV = pagosByVenta[v.id] || [];
    const servicios = pagosV.filter(p => p.tipo === 'servicio');
    const propinas  = pagosV.filter(p => p.tipo === 'propina');
    const pct = Number(v.comision_pct || 0);

    if (servicios.length === 0) {
      // Legacy (sin venta_pagos)
      const b = ensureC(v.cuenta_id);
      if (!b) return;
      b.ejecutadas.push(v);
      b.totalVentaEjec += Number(v.precio || 0);
      b.comisionEjec   += Number(v.comision_monto || 0);
      b.propina        += Number(v.propina || 0);
      return;
    }

    // Split: un renglón por cada línea de pago, con montos proporcionales
    const esSplit = servicios.length > 1;
    servicios.forEach((p, i) => {
      const b = ensureC(p.cuenta_id);
      if (!b) return;
      const comisionLinea = Number(p.monto) * pct / 100;
      // Propina de esta misma línea (misma cuenta, mismo orden si existe)
      const propLinea = (propinas.find(pp => pp.cuenta_id === p.cuenta_id && pp.orden === p.orden)
                        || propinas.find(pp => pp.cuenta_id === p.cuenta_id && !pp._used));
      let propMonto = 0;
      if (propLinea) { propMonto = Number(propLinea.monto); propLinea._used = true; }

      b.ejecutadas.push({
        ...v,
        _splitIdx: i,
        _isSplit: esSplit,
        precio: Number(p.monto),
        comision_monto: comisionLinea,
        propina: propMonto,
        moneda: cuentaById[p.cuenta_id]?.moneda,
        cuenta: cuentaById[p.cuenta_id]?.label,
      });
      b.totalVentaEjec += Number(p.monto);
      b.comisionEjec   += comisionLinea;
      b.propina        += propMonto;
    });
    // Propinas huérfanas (sin línea de servicio asociada) — raras, pero por si acaso
    propinas.filter(pp => !pp._used).forEach(pp => {
      const b = ensureC(pp.cuenta_id);
      if (b) b.propina += Number(pp.monto);
    });
  });

  vendidas.forEach(v => {
    const pagosV = pagosByVenta[v.id] || [];
    const servicios = pagosV.filter(p => p.tipo === 'servicio');
    const cvPct = Number(v.comision_venta_pct || 0);
    if (servicios.length === 0) {
      const b = ensureC(v.cuenta_id);
      if (!b) return;
      b.vendidas.push(v);
      b.comisionVenta += Number(v.comision_venta_monto || 0);
      return;
    }
    const esSplitV = servicios.length > 1;
    servicios.forEach((p, i) => {
      const b = ensureC(p.cuenta_id);
      if (!b) return;
      const cvLinea = Number(p.monto) * cvPct / 100;
      b.vendidas.push({
        ...v,
        _splitIdx: i,
        _isSplit: esSplitV,
        precio: Number(p.monto),
        comision_venta_monto: cvLinea,
        moneda: cuentaById[p.cuenta_id]?.moneda,
        cuenta: cuentaById[p.cuenta_id]?.label,
      });
      b.comisionVenta += cvLinea;
    });
  });

  Object.values(porCuenta).forEach(cc => {
    cc.totalRecibir = cc.comisionEjec + cc.propina + cc.comisionVenta;
  });
  // Orden: efectivo primero, después terminal, banco. MXN primero dentro de cada tipo.
  const tipoOrden = {efectivo:0, terminal:1, banco:2};
  const cuentasOrdenadas = Object.values(porCuenta).sort((a,b) => {
    const ot = (tipoOrden[a.cuenta_tipo]??9) - (tipoOrden[b.cuenta_tipo]??9);
    if (ot !== 0) return ot;
    if (a.moneda === 'MXN' && b.moneda !== 'MXN') return -1;
    if (b.moneda === 'MXN' && a.moneda !== 'MXN') return 1;
    return b.totalRecibir - a.totalRecibir;
  });

  return (
    <div style={{background:c.pagado?'var(--paper-sunk)':'var(--paper-raised)',border:`1px solid ${c.pagado?'var(--line-2)':'var(--line-1)'}`,borderRadius:12,overflow:'hidden',filter:c.pagado?'grayscale(.5)':'none',transition:'filter .2s'}}>
      {/* Header bloque */}
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:c.pagado?'rgba(107,125,74,.08)':'var(--paper-sunk)',borderBottom:'1px solid var(--line-1)',cursor:'pointer',opacity:c.pagado?.85:1}} onClick={()=>setOpen(!open)}>
        <Av name={c.alias || c.nombre} tone={tone} size={38}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <span style={{fontSize:14,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.1}}>{c.nombre}</span>
            {!c.pagado && <Chip tone="amber">Pendiente de pago</Chip>}
            {c.pagado && !c.firmaDataUrl && <Chip tone="ocean"><Icon name="check" size={9} stroke={2.4}/>Pagado · sin firmar</Chip>}
            {c.pagado && c.firmaDataUrl && <Chip tone="moss"><Icon name="check" size={9} stroke={2.4}/>Pagado y firmado</Chip>}
          </div>
          <div style={{fontSize:11.5,color:'var(--ink-3)',marginTop:2}}>
            {ejecutadas.length>0 && <span title="Servicios ejecutados">{ejecutadas.length} svc</span>}
            {ejecutadas.length>0 && vendidas.length>0 && ' · '}
            {vendidas.length>0 && <span title="Comisión por venta (vendiste a otra persona)" style={{color:'var(--ink-blue)',fontWeight:500}}>{vendidas.length} cv</span>}
          </div>
        </div>
        <div style={{textAlign:'right',marginRight:10,display:'flex',gap:16,alignItems:'flex-start'}}>
          <div>
            <div style={{fontSize:10,color:'var(--ink-3)',fontWeight:600,letterSpacing:.3,textTransform:'uppercase',marginBottom:2}}>Vendido</div>
            <div className="num" style={{fontSize:13,fontWeight:600,color:'var(--ink-1)',fontFamily:'var(--serif)'}}>
              {ocultarMontos ? <span style={{letterSpacing:2,color:'var(--ink-3)'}}>••••</span> : <>${Math.round(c.totalMxn || 0).toLocaleString('es-MX')}</>}
            </div>
          </div>
          <div>
            <div style={{fontSize:10,color:'var(--ink-3)',fontWeight:600,letterSpacing:.3,textTransform:'uppercase',marginBottom:2}}>A recibir</div>
            <div className="num" style={{fontSize:15,fontWeight:700,color:'var(--clay)',fontFamily:'var(--serif)'}}>
              {ocultarMontos ? <span style={{letterSpacing:2,color:'var(--ink-3)'}}>••••</span> : <>${Math.round(c.comisionMxn + c.propinaMxn).toLocaleString('es-MX')}</>}
            </div>
          </div>
        </div>
        {turnoAbierto && (
          <div style={{display:'flex',alignItems:'center',gap:6}} onClick={e=>e.stopPropagation()}>
            {/* Thumbnail firma si existe */}
            {c.firmaDataUrl && (
              <div style={{width:50,height:30,border:'1px solid var(--line-1)',borderRadius:4,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}} title={c.firmadoAt ? `Firmado ${new Date(c.firmadoAt).toLocaleString('es-MX',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}` : 'Firmado'}>
                <img src={c.firmaDataUrl} alt="firma" style={{maxWidth:'100%',maxHeight:'100%',display:'block'}}/>
              </div>
            )}
            {/* Botón Firmar (solo si pagada y sin firma) */}
            {c.pagado && !c.firmaDataUrl && (
              <button onClick={onFirmar} title="Firmar recibo de pago" style={{background:'var(--clay)',border:'1.5px solid var(--clay)',borderRadius:6,padding:'6px 10px',fontSize:11.5,color:'#fff',cursor:'pointer',fontWeight:600,fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
                <Icon name="edit" size={11} stroke={2} color="#fff"/>
                Firmar
              </button>
            )}
            {/* Botón Marcar pago / Desmarcar */}
            <button onClick={onTogglePago} title={c.pagado?'Desmarcar (borra firma)':'Marcar comisión pagada'} style={{background:c.pagado?'var(--moss)':'var(--paper-raised)',border:`1.5px solid ${c.pagado?'var(--moss)':'var(--line-1)'}`,borderRadius:6,padding:'6px 10px',fontSize:11.5,color:c.pagado?'#fff':'var(--ink-2)',cursor:'pointer',fontWeight:600,fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
              <Icon name="check" size={11} stroke={2} color={c.pagado?'#fff':'var(--ink-3)'}/>
              {c.pagado ? 'Pagado' : 'Marcar pago'}
            </button>
          </div>
        )}
        <Icon name="chev-down" size={14} color="var(--ink-3)" style={{transform:open?'rotate(0)':'rotate(-90deg)',transition:'transform .15s'}}/>
      </div>

      {/* Body: agrupado POR CUENTA (como el arqueo) */}
      {open && (
        <div style={{padding:'12px 14px',display:'flex',flexDirection:'column',gap:10}}>
          {cuentasOrdenadas.map(grupo => {
            const monMeta = monedas[grupo.moneda];
            const sym = monMeta?.simbolo || '$';
            const color = grupo.cuenta_tipo === 'efectivo' ? 'var(--moss)'
                        : grupo.cuenta_tipo === 'terminal' ? 'var(--ink-blue)'
                        : grupo.cuenta_tipo === 'banco'    ? 'var(--clay)'
                        : 'var(--ink-2)';
            const tipoLabel = {efectivo:'Efectivo',terminal:'Terminal',banco:'Banco'}[grupo.cuenta_tipo] || grupo.cuenta_tipo;
            return (
              <div key={grupo.cuenta_id} style={{border:`1px solid ${color}33`,borderRadius:10,overflow:'hidden'}}>
                {/* Header de cuenta: nombre, tipo, moneda, total a recibir */}
                <div style={{padding:'10px 14px',background:`${color}0f`,borderBottom:`1px solid ${color}22`,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                  <span style={{width:10,height:10,borderRadius:3,background:color,flexShrink:0}}/>
                  <span style={{fontSize:13,fontWeight:700,color:'var(--ink-0)',letterSpacing:-.1}}>{grupo.cuenta}</span>
                  <span style={{fontSize:9,fontWeight:700,color:color,background:'#fff',padding:'2px 6px',borderRadius:4,border:`1px solid ${color}55`,textTransform:'uppercase',letterSpacing:.3}}>{tipoLabel}</span>
                  <span style={{fontSize:10,color:'var(--ink-3)',fontFamily:'var(--mono)',letterSpacing:.3}}>{grupo.moneda}</span>
                  <div style={{flex:1}}/>
                  <div style={{textAlign:'right'}}>
                    <span style={{fontSize:10,color:'var(--ink-3)',fontWeight:600,letterSpacing:.5,textTransform:'uppercase',marginRight:8}}>A recibir</span>
                    <span className="num" style={{fontSize:20,fontWeight:700,color:color,fontFamily:'var(--serif)',letterSpacing:-.5}}>{sym}{grupo.totalRecibir.toLocaleString('es-MX',{minimumFractionDigits:grupo.totalRecibir%1?2:0,maximumFractionDigits:2})}</span>
                  </div>
                </div>

                {/* Sub-desglose: comisión ejec + propinas + comisión venta */}
                <div style={{padding:'6px 14px',display:'flex',gap:14,fontSize:10.5,color:'var(--ink-3)',borderBottom:'1px dashed var(--line-2)',flexWrap:'wrap'}}>
                  {grupo.ejecutadas.length > 0 && (
                    <span>Com. <strong className="num" style={{color:'var(--clay)'}}>{sym}{grupo.comisionEjec.toLocaleString('es-MX',{maximumFractionDigits:2})}</strong></span>
                  )}
                  {grupo.propina > 0 && (
                    <span>Propinas <strong className="num" style={{color:'var(--ink-2)'}}>{sym}{grupo.propina.toLocaleString('es-MX',{maximumFractionDigits:2})}</strong></span>
                  )}
                  {grupo.comisionVenta > 0 && (
                    <span>Com. venta <strong className="num" style={{color:'var(--ink-blue)'}}>{sym}{grupo.comisionVenta.toLocaleString('es-MX',{maximumFractionDigits:2})}</strong></span>
                  )}
                  <div style={{flex:1}}/>
                  {grupo.ejecutadas.length > 0 && <span title="Servicios ejecutados">· {grupo.ejecutadas.length} svc</span>}
                  {grupo.vendidas.length > 0 && <span title="Comisión por venta">· {grupo.vendidas.length} cv</span>}
                </div>

                {/* Servicios ejecutados en esta moneda */}
                {grupo.ejecutadas.length > 0 && (
                  <div>
                    {grupo.vendidas.length > 0 && (
                      <div style={{fontSize:9.5,fontWeight:700,letterSpacing:.6,textTransform:'uppercase',color:'var(--ink-3)',padding:'7px 14px 4px',background:'var(--paper-sunk)'}}>Servicios ejecutados</div>
                    )}
                    {grupo.ejecutadas.map((v,idx) => (
                      <div key={`${v.id}-${v._splitIdx ?? 'x'}-e${idx}`} style={{display:'grid',gridTemplateColumns:'1fr 100px 90px 80px 60px',gap:10,alignItems:'center',padding:'8px 14px',fontSize:12.5,borderTop:'1px solid var(--line-2)'}}>
                        <div>
                          <div style={{fontWeight:600,color:'var(--ink-0)'}}>{v.servicio}</div>
                          <div style={{fontSize:10.5,color:'var(--ink-3)',marginTop:2,display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                            {v.canal && <Chip tone={v.canal_tone || 'neutral'} style={{fontSize:9,padding:'1px 5px'}}>{v.canal}</Chip>}
                            {v._isSplit && <span title="Pago dividido en varias cuentas" style={{fontSize:9,fontWeight:700,color:'#fff',background:'var(--ink-blue)',padding:'1px 5px',borderRadius:3,letterSpacing:.3}}>SPLIT</span>}
                            {v.cuenta && <span>· {v.cuenta}</span>}
                            {v.vendedora_nombre && v.vendedora_id !== v.colaboradora_id && <span style={{color:'var(--ink-blue)'}}>· Vendió {v.vendedora_alias || v.vendedora_nombre}</span>}
                            {v.notas && <span>· {v.notas}</span>}
                          </div>
                        </div>
                        <div className="num" style={{textAlign:'right',color:'var(--ink-2)',fontSize:11}}>{sym}{Number(v.precio).toLocaleString('es-MX')}</div>
                        <div className="num" style={{textAlign:'right',color:'var(--clay)',fontSize:11.5,fontWeight:600}}>{v.comision_pct}% · {sym}{Math.round(v.comision_monto).toLocaleString('es-MX')}</div>
                        <div className="num" style={{textAlign:'right',color:'var(--ink-3)',fontSize:11.5}}>{v.propina>0?`${sym}${Math.round(v.propina).toLocaleString('es-MX')}`:'—'}</div>
                        <div style={{display:'flex',gap:2,justifyContent:'flex-end'}}>
                          {turnoAbierto && !c.pagado && <button onClick={()=>onEditVenta(v)} title="Editar" style={{background:'transparent',border:'none',cursor:'pointer',padding:4,color:'var(--ink-3)'}}><Icon name="edit" size={12}/></button>}
                          {turnoAbierto && !c.pagado && <button onClick={()=>onDelVenta(v)} title="Borrar" style={{background:'transparent',border:'none',cursor:'pointer',padding:4,color:'var(--ink-3)'}}><Icon name="trash" size={12}/></button>}
                          {turnoAbierto && c.pagado && <Icon name="lock" size={11} color="var(--ink-3)" style={{padding:'4px'}}/>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comisión por venta (vendió a otra persona) en esta moneda */}
                {grupo.vendidas.length > 0 && (
                  <div style={{background:'rgba(55,138,221,.04)'}}>
                    <div style={{fontSize:9.5,fontWeight:700,letterSpacing:.6,textTransform:'uppercase',color:'var(--ink-blue)',padding:'7px 14px 4px'}}>Comisión por venta</div>
                    {grupo.vendidas.map((v,idx) => (
                      <div key={`${v.id}-${v._splitIdx ?? 'x'}-v${idx}`} style={{display:'grid',gridTemplateColumns:'1fr 100px 110px',gap:10,alignItems:'center',padding:'8px 14px',fontSize:12.5,borderTop:'1px solid var(--line-2)'}}>
                        <div>
                          <div style={{fontWeight:600,color:'var(--ink-0)'}}>{v.servicio}</div>
                          <div style={{fontSize:10.5,color:'var(--ink-3)',marginTop:2,display:'flex',gap:6,alignItems:'center'}}>
                            <span>Ejecutó: <strong>{v.colaboradora_alias || v.colaboradora_nombre}</strong></span>
                            {v.canal && <Chip tone={v.canal_tone || 'neutral'} style={{fontSize:9,padding:'1px 5px'}}>{v.canal}</Chip>}
                            {v._isSplit && <span title="Pago dividido en varias cuentas" style={{fontSize:9,fontWeight:700,color:'#fff',background:'var(--ink-blue)',padding:'1px 5px',borderRadius:3,letterSpacing:.3}}>SPLIT</span>}
                          </div>
                        </div>
                        <div className="num" style={{textAlign:'right',color:'var(--ink-2)',fontSize:11}}>{sym}{Number(v.precio).toLocaleString('es-MX')}</div>
                        <div className="num" style={{textAlign:'right',color:'var(--ink-blue)',fontSize:11.5,fontWeight:600}}>{v.comision_venta_pct}% · {sym}{Math.round(v.comision_venta_monto||0).toLocaleString('es-MX')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ───────────── Formulario de venta ─────────────
const FormVenta = ({venta, turnoId, servicios, canales, colabs, cuentas, monedas, colabsPagadasIds=[], onSave, onCancel}) => {
  const editando = !!venta;
  // Colabs disponibles: todas menos las ya pagadas (si editamos, incluir la actual aunque esté pagada)
  const colabsDisponibles = React.useMemo(()=>{
    const pagadasSet = new Set(colabsPagadasIds);
    return colabs.filter(c => !pagadasSet.has(c.id) || (editando && venta.colaboradora_id === c.id));
  },[colabs, colabsPagadasIds, editando, venta]);
  const [servicioId, setServicio]   = React.useState(venta?.servicio_id || '');
  const [colabId, setColab]         = React.useState(venta?.colaboradora_id || '');
  const [canalId, setCanal]         = React.useState(venta?.canal_id || '');
  const [cuentaId, setCuenta]       = React.useState(venta?.cuenta_id || '');
  const [precio, setPrecio]         = React.useState(venta?.precio || '');
  const [descuento, setDescuento]   = React.useState(venta?.descuento || 0);
  const [duracion, setDuracion]     = React.useState(venta?.duracion_min || '');
  const [comisionPct, setPct]       = React.useState(venta?.comision_pct ?? '');
  const [propina, setPropina]       = React.useState(venta?.propina || 0);
  const [vendedoraId, setVendedora] = React.useState(venta?.vendedora_id || '');
  const [notas, setNotas]           = React.useState(venta?.notas || '');
  const [saving, setSaving]         = React.useState(false);

  // ─── Split de pago del servicio (varias cuentas/monedas) ───
  // Cada línea tiene: cuenta + monto del servicio + propina (opcional) en la misma moneda
  const [splitActivo, setSplitActivo] = React.useState(false);
  const [splitLines, setSplitLines]   = React.useState([
    {cuentaId: '', monto: '', tip: '', dscto: ''},
    {cuentaId: '', monto: '', tip: '', dscto: ''},
  ]);

  // Al editar venta ya guardada, traer sus pagos (si existen) para pre-poblar
  React.useEffect(() => {
    if (!editando || !venta?.id) return;
    (async () => {
      const {data} = await sb.from('venta_pagos').select('cuenta_id, tipo, monto, descuento, orden').eq('venta_id', venta.id).order('orden');
      if (!data || data.length === 0) return;
      const serv = data.filter(x => x.tipo === 'servicio');
      const prop = data.filter(x => x.tipo === 'propina');
      if (serv.length > 1) {
        setSplitActivo(true);
        // Unificar serv+prop por cuenta_id: cada línea cuenta tiene su monto, dscto y tip
        const byCuenta = {};
        serv.forEach(s => { byCuenta[s.cuenta_id] = {cuentaId: s.cuenta_id, monto: String(s.monto), tip: '0', dscto: String(s.descuento || 0), orden: s.orden}; });
        prop.forEach(p => {
          if (!byCuenta[p.cuenta_id]) byCuenta[p.cuenta_id] = {cuentaId: p.cuenta_id, monto: '0', tip: String(p.monto), dscto: '0', orden: p.orden};
          else byCuenta[p.cuenta_id].tip = String(p.monto);
        });
        const arr = Object.values(byCuenta).sort((a,b) => a.orden - b.orden).map(x => ({cuentaId: x.cuentaId, monto: x.monto, tip: x.tip, dscto: x.dscto}));
        setSplitLines(arr);
      }
    })();
    // eslint-disable-next-line
  }, [venta?.id]);

  // Helpers para split lines
  const addSplitLine = () => setSplitLines(l => [...l, {cuentaId: '', monto: '', tip: '', dscto: ''}]);
  const rmSplitLine  = (i) => setSplitLines(l => l.filter((_,j) => j !== i));
  const updSplitLine = (i, field, val) => setSplitLines(l => l.map((x,j) => j===i ? {...x, [field]: val} : x));

  // Cálculos por línea (servicio y tip en MXN)
  const getCuentaTc = (cuentaId) => {
    const c = cuentas.find(x => x.id === cuentaId);
    const m = c ? monedas[c.moneda] : null;
    return m ? Number(m.tc_a_mxn) : 1;
  };
  const lineMxn      = (l) => (parseFloat(l.monto) || 0) * getCuentaTc(l.cuentaId);
  const lineTipMxn   = (l) => (parseFloat(l.tip)   || 0) * getCuentaTc(l.cuentaId);
  const lineDsctoMxn = (l) => (parseFloat(l.dscto) || 0) * getCuentaTc(l.cuentaId);
  const splitTotalMxn     = splitActivo ? splitLines.reduce((s,l) => s + lineMxn(l), 0)      : 0;
  const splitPropTotalMxn = splitActivo ? splitLines.reduce((s,l) => s + lineTipMxn(l), 0)   : 0;
  const splitDsctoTotalMxn= splitActivo ? splitLines.reduce((s,l) => s + lineDsctoMxn(l), 0) : 0;

  // Moneda base (para mostrar resúmenes)
  const monedaBase = React.useMemo(() => {
    const vals = Object.values(monedas);
    return vals.find(m => m.es_base) || vals.find(m => m.codigo === 'MXN') || vals[0];
  }, [monedas]);

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

  // Si split está activo, el "precio" efectivo es la suma de líneas convertidas a MXN
  const precioBaseNum   = parseFloat(precio) || 0;
  const precioNum       = splitActivo ? splitTotalMxn : precioBaseNum;
  const descuentoBaseNum= parseFloat(descuento) || 0;
  const descuentoNum    = splitActivo ? splitDsctoTotalMxn : descuentoBaseNum;
  const pctNum          = parseFloat(comisionPct) || 0;
  const propinaNum      = splitActivo ? splitPropTotalMxn : (parseFloat(propina) || 0);
  const permiteCV       = !!(canal && canal.permite_comision_venta);
  const cvPctNum        = permiteCV ? (parseFloat(canal.comision_venta_pct)||0) : 0;
  const vendedoraSel    = vendedoraId && vendedoraId !== colabId ? colabs.find(c=>c.id===vendedoraId) : null;
  // Comisión siempre sobre precio BRUTO (regla de negocio: el descuento lo asume el spa)
  const comisionMonto   = precioNum * pctNum / 100;
  const comisionVenta   = (permiteCV && vendedoraSel) ? (precioNum * cvPctNum / 100) : 0;
  const spaRecibe       = precioNum - descuentoNum - comisionMonto - comisionVenta;

  // Si el canal NO permite comisión por venta, limpiar vendedora
  React.useEffect(()=>{
    if (!permiteCV && vendedoraId) setVendedora('');
    // eslint-disable-next-line
  },[canalId, permiteCV]);

  const fieldStyle = {width:'100%',padding:'9px 12px',fontSize:13,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontFamily:'inherit',color:'var(--ink-1)',boxSizing:'border-box'};
  const labelStyle = {display:'block',fontSize:11,fontWeight:600,letterSpacing:.4,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:6};

  const guardar = async () => {
    if (!servicioId)  return notify('Selecciona el servicio','err');
    if (!colabId)     return notify('Selecciona a quien ejecuta','err');
    if (!canalId)     return notify('Selecciona el canal','err');
    if (pctNum<0 || pctNum>100) return notify('El % de comisión debe estar entre 0 y 100','err');

    // Validar split o cuenta única
    if (splitActivo) {
      if (splitLines.length < 2) return notify('Agrega al menos 2 líneas de pago o desactiva la división','err');
      for (const l of splitLines) {
        if (!l.cuentaId) return notify('Falta seleccionar cuenta en una línea','err');
        if (!(parseFloat(l.monto) > 0)) return notify('Todas las líneas deben tener monto > 0','err');
        if ((parseFloat(l.dscto) || 0) > (parseFloat(l.monto) || 0)) return notify('El descuento no puede superar el monto de la línea','err');
      }
    } else {
      if (!cuentaId)    return notify('Selecciona la cuenta donde cae el pago','err');
      if (precioBaseNum<=0) return notify('El precio debe ser mayor a 0','err');
      if (descuentoBaseNum > precioBaseNum) return notify('El descuento no puede superar el precio','err');
    }
    // (propinas vienen dentro de cada splitLine como line.tip; no necesitan validación extra)

    setSaving(true);
    // Si hay split: moneda principal = MXN (canonical), tc_momento = 1, cuenta_id = primera línea (referencia)
    const cuentaPrincipal = splitActivo ? cuentas.find(c => c.id === splitLines[0].cuentaId) : cuenta;
    const monedaPrincipal = splitActivo ? 'MXN' : cuenta.moneda;
    const tcPrincipal     = splitActivo ? 1 : tc;

    const payload = {
      turno_id: turnoId,
      servicio_id: servicioId,
      colaboradora_id: colabId,
      canal_id: canalId,
      cuenta_id: cuentaPrincipal?.id || cuentaId,
      precio: precioNum, // en MXN si hay split, o en moneda de cuenta si no
      descuento: descuentoNum,
      duracion_min: parseInt(duracion) || null,
      comision_pct: pctNum,
      comision_monto: comisionMonto,
      propina: propinaNum,
      moneda: monedaPrincipal,
      tc_momento: tcPrincipal,
      notas: notas.trim() || null,
      vendedora_id: vendedoraSel ? vendedoraSel.id : null,
      comision_venta_pct: vendedoraSel ? cvPctNum : null,
      comision_venta_monto: vendedoraSel ? comisionVenta : null,
    };
    let error, ventaId;
    if (editando) {
      ({error} = await sb.from('ventas').update(payload).eq('id', venta.id));
      ventaId = venta.id;
    } else {
      const res = await sb.from('ventas').insert(payload).select('id').single();
      error = res.error; ventaId = res.data?.id;
    }
    if (error) { setSaving(false); return notify('Error: '+error.message,'err'); }

    // Guardar venta_pagos: borrar existentes y reinsertar (más simple y confiable)
    if (ventaId) {
      await sb.from('venta_pagos').delete().eq('venta_id', ventaId);
      const pagoRows = [];
      if (splitActivo) {
        splitLines.forEach((l, i) => {
          pagoRows.push({venta_id: ventaId, cuenta_id: l.cuentaId, tipo: 'servicio', monto: parseFloat(l.monto), descuento: parseFloat(l.dscto) || 0, orden: i});
          const tipNum = parseFloat(l.tip);
          if (tipNum > 0) {
            pagoRows.push({venta_id: ventaId, cuenta_id: l.cuentaId, tipo: 'propina', monto: tipNum, descuento: 0, orden: i});
          }
        });
      } else {
        pagoRows.push({venta_id: ventaId, cuenta_id: cuentaId, tipo: 'servicio', monto: precioBaseNum, descuento: descuentoBaseNum, orden: 0});
        if (propinaNum > 0) pagoRows.push({venta_id: ventaId, cuenta_id: cuentaId, tipo: 'propina', monto: propinaNum, descuento: 0, orden: 0});
      }
      if (pagoRows.length > 0) {
        const {error: pErr} = await sb.from('venta_pagos').insert(pagoRows);
        if (pErr) { setSaving(false); return notify('Error guardando pagos: '+pErr.message,'err'); }
      }
    }

    // Upsert turno_colaboradoras (asegurar que ambas — ejecutor y vendedora — están en el turno)
    const tcRows = [{turno_id: turnoId, colaboradora_id: colabId}];
    if (vendedoraSel) tcRows.push({turno_id: turnoId, colaboradora_id: vendedoraSel.id});
    await sb.from('turno_colaboradoras').upsert(tcRows, {onConflict:'turno_id,colaboradora_id', ignoreDuplicates:true});

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
            {colabs.length === 0 && <li>Al menos una <strong>persona</strong> activa</li>}
            {cuentas.length === 0 && <li>Al menos una <strong>cuenta</strong> activa</li>}
          </ul>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
          <Btn variant="ghost" size="md" onClick={onCancel}>Cerrar</Btn>
        </div>
      </div>
    );
  }

  // Todas las colabs ya pagadas y estamos en modo "nuevo"
  if (!editando && colabsDisponibles.length === 0) {
    return (
      <div style={{padding:'10px 0 0'}}>
        <div style={{padding:'14px 16px',background:'rgba(212,131,74,.1)',border:'1px solid rgba(212,131,74,.4)',borderRadius:10,fontSize:12.5,color:'#8f4e26',lineHeight:1.55,marginBottom:14}}>
          <strong>Todo el personal ya está marcado como pagado.</strong> Para agregar más servicios, desmarca el pago de al menos una (botón <em>Pagado</em> en su bloque).
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
            <option value="">— Selecciona un servicio —</option>
            {servicios.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Ejecuta</label>
          <select value={colabId} onChange={e=>setColab(e.target.value)} style={fieldStyle}>
            <option value="">— Selecciona a quien ejecuta —</option>
            {colabsDisponibles.map(c=><option key={c.id} value={c.id}>{c.alias || `${c.nombre}${c.apellidos?' '+c.apellidos:''}`}</option>)}
          </select>
          {colabsPagadasIds.length > 0 && <div style={{fontSize:10.5,color:'var(--ink-3)',marginTop:4}}>{colabsPagadasIds.length} {colabsPagadasIds.length>1?'personas':'persona'} ya {colabsPagadasIds.length>1?'pagadas':'pagada'} (oculta{colabsPagadasIds.length>1?'s':''}). Desmarca el pago para usarla.</div>}
        </div>
      </div>

      {/* Fila 2: Canal + % (bloqueado, viene del canal) */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 180px',gap:12,marginBottom:14}}>
        <div>
          <label style={labelStyle}>Canal de venta</label>
          <select value={canalId} onChange={e=>cambiarCanal(e.target.value)} style={fieldStyle}>
            <option value="">— Selecciona un canal —</option>
            {canales.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
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

      {/* Vendedora (solo si canal permite) */}
      {permiteCV && (
        <div style={{marginBottom:14,padding:'12px 14px',background:'var(--sand-100)',border:'1px solid #ecd49a',borderRadius:10}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
            <div style={{fontSize:10.5,fontWeight:700,letterSpacing:.6,textTransform:'uppercase',color:'var(--clay)'}}>Comisión por venta</div>
            <div style={{fontSize:11,color:'var(--ink-3)'}}>Este canal permite +{cvPctNum}% para quien vende</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 140px',gap:12,alignItems:'end'}}>
            <div>
              <label style={labelStyle}>Quien vende (opcional)</label>
              <select value={vendedoraId} onChange={e=>setVendedora(e.target.value)} style={fieldStyle}>
                <option value="">— Quien ejecuta también vendió —</option>
                {colabsDisponibles.filter(c=>c.id!==colabId).map(c=><option key={c.id} value={c.id}>{c.alias || `${c.nombre}${c.apellidos?' '+c.apellidos:''}`}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>% comisión</label>
              <div style={{display:'flex',alignItems:'center',gap:6,padding:'9px 12px',fontSize:15,fontWeight:600,fontFamily:'var(--serif)',letterSpacing:-.2,color:vendedoraSel?'var(--ink-1)':'var(--ink-3)',background:'var(--paper-sunk)',border:'1px solid var(--line-2)',borderRadius:8,cursor:'not-allowed',justifyContent:'flex-end'}}>
                <Icon name="lock" size={10} color="var(--ink-3)"/>
                <span className="num">{cvPctNum % 1 === 0 ? cvPctNum.toFixed(0) : cvPctNum.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fila 3: Cuenta(s) + Duración */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 140px',gap:12,marginBottom:14,alignItems:'flex-start'}}>
        <div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
            <label style={{...labelStyle, marginBottom:0}}>{splitActivo ? 'Pagos del servicio · varias cuentas' : 'Cuenta donde cae el pago'}</label>
            <label style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:11,color:'var(--ink-2)',cursor:'pointer',fontWeight:500}}>
              <input type="checkbox" checked={splitActivo} onChange={e=>setSplitActivo(e.target.checked)}/>
              Dividir pago
            </label>
          </div>
          {!splitActivo ? (
            <select value={cuentaId} onChange={e=>setCuenta(e.target.value)} style={fieldStyle}>
              <option value="">— Selecciona una cuenta —</option>
              {cuentas.map(c=><option key={c.id} value={c.id}>{c.label} · {c.moneda}</option>)}
            </select>
          ) : (
            <div style={{border:'1px solid var(--line-2)',borderRadius:8,padding:'10px',background:'var(--paper-sunk)'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 82px 72px 72px 22px',gap:6,marginBottom:4,fontSize:9.5,fontWeight:700,color:'var(--ink-3)',letterSpacing:.5,textTransform:'uppercase'}}>
                <div>Cuenta</div>
                <div style={{textAlign:'right'}}>Monto</div>
                <div style={{textAlign:'right'}}>Dscto</div>
                <div style={{textAlign:'right'}}>Propina</div>
                <div/>
              </div>
              {splitLines.map((l, i) => (
                <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 82px 72px 72px 22px',gap:6,marginBottom:6,alignItems:'center'}}>
                  <select value={l.cuentaId} onChange={e=>updSplitLine(i,'cuentaId',e.target.value)} style={{...fieldStyle,padding:'7px 10px',fontSize:12}}>
                    <option value="">— Selecciona cuenta —</option>
                    {cuentas.map(c=><option key={c.id} value={c.id}>{c.label} · {c.moneda}</option>)}
                  </select>
                  <input type="number" step="0.01" min="0" value={l.monto} onChange={e=>updSplitLine(i,'monto',e.target.value)} placeholder="0" style={{...fieldStyle,padding:'7px 10px',fontSize:12,textAlign:'right'}} className="num"/>
                  <input type="number" step="0.01" min="0" value={l.dscto} onChange={e=>updSplitLine(i,'dscto',e.target.value)} placeholder="0" style={{...fieldStyle,padding:'7px 10px',fontSize:12,textAlign:'right'}} className="num"/>
                  <input type="number" step="0.01" min="0" value={l.tip}   onChange={e=>updSplitLine(i,'tip',e.target.value)}   placeholder="0" style={{...fieldStyle,padding:'7px 10px',fontSize:12,textAlign:'right'}} className="num"/>
                  <button type="button" onClick={()=>rmSplitLine(i)} disabled={splitLines.length<=2}
                    style={{background:'transparent',border:'none',cursor:splitLines.length<=2?'not-allowed':'pointer',color:'var(--ink-3)',opacity:splitLines.length<=2?.3:1,padding:0}}>
                    <Icon name="trash" size={13}/>
                  </button>
                </div>
              ))}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8,paddingTop:8,borderTop:'1px dashed var(--line-1)',fontSize:12,color:'var(--ink-2)'}}>
                <button type="button" onClick={addSplitLine} style={{background:'transparent',border:'none',color:'var(--clay)',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                  + Agregar línea
                </button>
                <span className="num">
                  Servicio: <strong>${splitTotalMxn.toLocaleString('es-MX',{maximumFractionDigits:0})}</strong>
                  {splitDsctoTotalMxn > 0 && <> · Dscto: <strong>${splitDsctoTotalMxn.toLocaleString('es-MX',{maximumFractionDigits:0})}</strong></>}
                  {splitPropTotalMxn > 0 && <> · Tips: <strong>${splitPropTotalMxn.toLocaleString('es-MX',{maximumFractionDigits:0})}</strong></>}
                  {' '}{monedaBase?.codigo || 'MXN'}
                </span>
              </div>
            </div>
          )}
        </div>
        <div>
          <label style={labelStyle}>Duración (min)</label>
          <input type="number" min="0" value={duracion} onChange={e=>setDuracion(e.target.value)} placeholder="—" style={fieldStyle} className="num"/>
        </div>
      </div>

      {/* Fila 4: Precio + Descuento + Propina */}
      <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr 1fr',gap:12,marginBottom:14,padding:'14px',background:'var(--paper-sunk)',borderRadius:10,border:'1px solid var(--line-2)'}}>
        <div>
          <label style={labelStyle}>Precio {splitActivo ? '(suma de líneas, MXN)' : (moneda && `(${moneda.codigo})`)}</label>
          <div style={{position:'relative'}}>
            <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--ink-3)',fontSize:18,fontFamily:'var(--serif)'}}>$</span>
            <input type="number" step="0.01" min="0"
              value={splitActivo ? splitTotalMxn.toFixed(2) : precio}
              onChange={e=>!splitActivo && setPrecio(e.target.value)}
              disabled={splitActivo}
              placeholder="0.00"
              style={{...fieldStyle,paddingLeft:28,fontSize:18,fontWeight:600,fontFamily:'var(--serif)',textAlign:'right',opacity:splitActivo?.6:1,cursor:splitActivo?'not-allowed':'auto'}} className="num"/>
          </div>
          {!splitActivo && moneda && moneda.codigo !== 'MXN' && precioNum>0 && (
            <div style={{fontSize:10.5,color:'var(--ink-3)',marginTop:4,textAlign:'right'}} className="num">≈ ${(precioNum*tc).toLocaleString('es-MX',{maximumFractionDigits:0})} MXN (TC {tc.toFixed(2)})</div>
          )}
        </div>
        <div>
          <label style={labelStyle}>Descuento (opcional)</label>
          {splitActivo ? (
            <div style={{...fieldStyle,padding:'10px 12px',background:'var(--paper-raised)',opacity:.85,display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'default'}}>
              <span style={{fontSize:11,color:'var(--ink-3)'}}>Se llena en cada línea arriba</span>
              <span className="num" style={{fontWeight:700,fontFamily:'var(--serif)',fontSize:16}}>
                ${splitDsctoTotalMxn.toLocaleString('es-MX',{maximumFractionDigits:0})} {monedaBase?.codigo || 'MXN'}
              </span>
            </div>
          ) : (
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--ink-3)',fontSize:14}}>$</span>
              <input type="number" step="0.01" min="0" value={descuento} onChange={e=>setDescuento(e.target.value)} placeholder="0" style={{...fieldStyle,paddingLeft:22,textAlign:'right'}} className="num"/>
            </div>
          )}
          <div style={{fontSize:10,color:'var(--ink-3)',marginTop:4,lineHeight:1.3}}>Lo asume el spa. La comisión se calcula sobre el precio sin descuento.</div>
        </div>
        <div>
          <label style={labelStyle}>Propina (opcional) · 100% al terapeuta</label>
          {splitActivo ? (
            <div style={{...fieldStyle,padding:'10px 12px',background:'var(--paper-raised)',opacity:.85,display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'default'}}>
              <span style={{fontSize:11,color:'var(--ink-3)'}}>Se llena en cada línea arriba</span>
              <span className="num" style={{fontWeight:700,fontFamily:'var(--serif)',fontSize:16}}>
                ${splitPropTotalMxn.toLocaleString('es-MX',{maximumFractionDigits:0})} {monedaBase?.codigo || 'MXN'}
              </span>
            </div>
          ) : (
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--ink-3)',fontSize:14}}>$</span>
              <input type="number" step="0.01" min="0" value={propina} onChange={e=>setPropina(e.target.value)} placeholder="0" style={{...fieldStyle,paddingLeft:22,textAlign:'right'}} className="num"/>
            </div>
          )}
        </div>
      </div>

      {/* Cálculo en vivo */}
      {precioNum > 0 && (
        <div style={{padding:'12px 14px',background:'linear-gradient(135deg, #fef9ef 0%, #fcecd9 100%)',border:'1px solid #ecd49a',borderRadius:10,marginBottom:14}}>
          <div style={{fontSize:10.5,fontWeight:700,letterSpacing:.6,textTransform:'uppercase',color:'var(--clay)',marginBottom:8}}>
            Desglose {splitActivo && <span style={{color:'var(--ink-3)',fontWeight:500,fontSize:9.5}}>· total en {monedaBase?.codigo || 'MXN'}</span>}
          </div>
          <div style={{display:'grid',gridTemplateColumns:`repeat(${vendedoraSel?4:3}, 1fr)`,gap:10,fontSize:12}}>
            <div>
              <div style={{color:'var(--ink-3)',fontSize:10.5,marginBottom:2}}>Al terapeuta</div>
              <div className="num" style={{fontWeight:700,color:'var(--clay)'}}>{(splitActivo?monedaBase?.simbolo:moneda?.simbolo)||'$'}{(comisionMonto+propinaNum).toLocaleString('es-MX',{maximumFractionDigits:2})}</div>
              <div style={{color:'var(--ink-3)',fontSize:9.5,marginTop:1}}>{pctNum}%{propinaNum>0?' + propina':''}</div>
            </div>
            {vendedoraSel && (
              <div>
                <div style={{color:'var(--ink-3)',fontSize:10.5,marginBottom:2}}>Al vendedor</div>
                <div className="num" style={{fontWeight:700,color:'var(--ink-blue)'}}>{(splitActivo?monedaBase?.simbolo:moneda?.simbolo)||'$'}{comisionVenta.toLocaleString('es-MX',{maximumFractionDigits:2})}</div>
                <div style={{color:'var(--ink-3)',fontSize:9.5,marginTop:1}}>{cvPctNum}% · {vendedoraSel.alias || vendedoraSel.nombre}</div>
              </div>
            )}
            <div>
              <div style={{color:'var(--ink-3)',fontSize:10.5,marginBottom:2}}>Al spa</div>
              <div className="num" style={{fontWeight:700,color:spaRecibe<0?'var(--clay)':'var(--moss)'}}>{(splitActivo?monedaBase?.simbolo:moneda?.simbolo)||'$'}{spaRecibe.toLocaleString('es-MX',{maximumFractionDigits:2})}</div>
              <div style={{color:'var(--ink-3)',fontSize:9.5,marginTop:1}}>{(100-pctNum-(vendedoraSel?cvPctNum:0)).toFixed(0)}%</div>
            </div>
            <div>
              <div style={{color:'var(--ink-3)',fontSize:10.5,marginBottom:2}}>Cobrado al cliente</div>
              <div className="num" style={{fontWeight:700,color:'var(--ink-0)'}}>{(splitActivo?monedaBase?.simbolo:moneda?.simbolo)||'$'}{(precioNum-descuentoNum+propinaNum).toLocaleString('es-MX',{maximumFractionDigits:2})}</div>
              <div style={{color:'var(--ink-3)',fontSize:9.5,marginTop:1}}>{descuentoNum>0?`Dscto −${(splitActivo?monedaBase?.simbolo:moneda?.simbolo)||'$'}${descuentoNum.toLocaleString('es-MX',{maximumFractionDigits:0})} · `:''}{splitActivo ? `${splitLines.length} cuentas` : cuenta?.label}</div>
            </div>
          </div>

          {/* Desglose por moneda cuando hay split */}
          {splitActivo && (() => {
            const grupos = {};
            splitLines.forEach(l => {
              const c = cuentas.find(x => x.id === l.cuentaId);
              if (!c) return;
              const g = grupos[c.moneda] = grupos[c.moneda] || {moneda: c.moneda, servicio: 0, tip: 0, dscto: 0, simbolo: monedas[c.moneda]?.simbolo || '$'};
              g.servicio += parseFloat(l.monto) || 0;
              g.tip      += parseFloat(l.tip)   || 0;
              g.dscto    += parseFloat(l.dscto) || 0;
            });
            const filas = Object.values(grupos);
            if (filas.length === 0) return null;
            return (
              <div style={{marginTop:10,paddingTop:10,borderTop:'1px dashed #ecd49a'}}>
                <div style={{fontSize:9.5,fontWeight:700,letterSpacing:.6,textTransform:'uppercase',color:'var(--clay)',marginBottom:6}}>Por moneda</div>
                <div style={{display:'grid',gridTemplateColumns:`60px repeat(${vendedoraSel?4:3}, 1fr)`,gap:8,fontSize:11}}>
                  <div style={{fontSize:9.5,color:'var(--ink-3)',fontWeight:700,letterSpacing:.4}}/>
                  <div style={{fontSize:9.5,color:'var(--ink-3)',fontWeight:700,letterSpacing:.4,textAlign:'right'}}>TERAPEUTA</div>
                  {vendedoraSel && <div style={{fontSize:9.5,color:'var(--ink-3)',fontWeight:700,letterSpacing:.4,textAlign:'right'}}>VENDEDOR</div>}
                  <div style={{fontSize:9.5,color:'var(--ink-3)',fontWeight:700,letterSpacing:.4,textAlign:'right'}}>SPA</div>
                  <div style={{fontSize:9.5,color:'var(--ink-3)',fontWeight:700,letterSpacing:.4,textAlign:'right'}}>COBRADO</div>
                  {filas.map(g => {
                    const terapeuta = g.servicio * pctNum / 100 + g.tip;
                    const vendedor  = vendedoraSel ? g.servicio * cvPctNum / 100 : 0;
                    const spa       = g.servicio - g.dscto - (g.servicio * pctNum / 100) - vendedor;
                    const cobrado   = g.servicio - g.dscto + g.tip;
                    return (
                      <React.Fragment key={g.moneda}>
                        <div style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--ink-1)'}}>{g.moneda}</div>
                        <div className="num" style={{textAlign:'right',color:'var(--clay)',fontWeight:600}}>{g.simbolo}{terapeuta.toLocaleString('es-MX',{maximumFractionDigits:2})}</div>
                        {vendedoraSel && <div className="num" style={{textAlign:'right',color:'var(--ink-blue)',fontWeight:600}}>{g.simbolo}{vendedor.toLocaleString('es-MX',{maximumFractionDigits:2})}</div>}
                        <div className="num" style={{textAlign:'right',color:spa<0?'var(--clay)':'var(--moss)',fontWeight:600}}>{g.simbolo}{spa.toLocaleString('es-MX',{maximumFractionDigits:2})}</div>
                        <div className="num" style={{textAlign:'right',color:'var(--ink-1)',fontWeight:600}}>{g.simbolo}{cobrado.toLocaleString('es-MX',{maximumFractionDigits:2})}</div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })()}
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

Object.assign(window, { ColabBlockFn, FormVenta, FirmaModal });
