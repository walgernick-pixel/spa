// ──────────────────────────────────────────
// Gastos · Detalle — VERSIÓN FUNCIONAL conectada a Supabase
// Muestra: gasto + comprobante + splits + historial
// Acciones: Editar · Archivar (soft delete) · Eliminar definitivo
// ──────────────────────────────────────────

const GastosDetalleFn = ({gastoId, onBack, onEdit}) => {
  const [gasto, setGasto]     = React.useState(null);
  const [splits, setSplits]   = React.useState([]);
  const [historial, setHist]  = React.useState([]);
  const [compUrl, setCompUrl] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy]       = React.useState(false);
  const [archivado, setArch]  = React.useState(false);

  const cargar = React.useCallback(async () => {
    setLoading(true);

    // Intentamos desde la vista (solo activos)
    let {data, error} = await sb.from('v_gastos').select('*').eq('id', gastoId).maybeSingle();

    // Si no está en la vista, puede estar archivado → traerlo crudo
    if (!data) {
      const raw = await sb.from('gastos').select(`
        *,
        concepto:conceptos_gasto(label, categoria, cat:categorias_gasto(label, tone)),
        cta:cuentas(label, tipo, moneda)
      `).eq('id', gastoId).single();
      if (raw.error) { setLoading(false); return notify('No se encontró el gasto','err'); }
      const r = raw.data;
      data = {
        ...r,
        concepto: r.concepto?.label,
        categoria: r.concepto?.cat?.label,
        categoria_tone: r.concepto?.cat?.tone,
        categoria_id: r.concepto?.categoria,
        cuenta: r.cta?.label,
        cuenta_tipo: r.cta?.tipo,
      };
      setArch(!!r.eliminado);
    } else {
      setArch(false);
    }

    setGasto(data);

    // Splits
    const {data: sp} = await sb.from('gasto_pagos').select('*, cta:cuentas(label, moneda, tipo)').eq('gasto_id', gastoId).order('orden');
    setSplits(sp || []);

    // Historial
    const {data: h} = await sb.from('gastos_historial').select('*').eq('gasto_id', gastoId).order('creado',{ascending:false});
    setHist(h || []);

    // Comprobante (signed URL · 1h)
    if (data.comprobante_url) {
      const {data: u} = await sb.storage.from('comprobantes').createSignedUrl(data.comprobante_url, 3600);
      setCompUrl(u?.signedUrl || null);
    } else {
      setCompUrl(null);
    }

    setLoading(false);
  },[gastoId]);

  React.useEffect(()=>{ cargar(); },[cargar]);

  // ── Acciones ──
  const archivar = async () => {
    if (!confirmar('¿Archivar este gasto?\n\nQuedará oculto de la lista principal pero podrás restaurarlo desde "Archivados".')) return;
    setBusy(true);
    const {error} = await sb.from('gastos').update({eliminado: new Date().toISOString()}).eq('id', gastoId);
    if (error) { setBusy(false); return notify('Error: '+error.message,'err'); }
    await sb.from('gastos_historial').insert({gasto_id: gastoId, accion:'archivado'});
    setBusy(false);
    notify('Gasto archivado');
    onBack && onBack();
  };

  const restaurar = async () => {
    setBusy(true);
    const {error} = await sb.from('gastos').update({eliminado: null}).eq('id', gastoId);
    if (error) { setBusy(false); return notify('Error: '+error.message,'err'); }
    await sb.from('gastos_historial').insert({gasto_id: gastoId, accion:'restaurado'});
    setBusy(false);
    notify('Gasto restaurado');
    cargar();
  };

  const eliminarDefinitivo = async () => {
    if (!confirmar('⚠️ ¿ELIMINAR DEFINITIVAMENTE?\n\nSe borrará de la base de datos sin posibilidad de recuperarlo.\nEsta acción no se puede deshacer.')) return;
    setBusy(true);
    // Borrar comprobante del storage si existe
    if (gasto.comprobante_url) {
      await sb.storage.from('comprobantes').remove([gasto.comprobante_url]);
    }
    const {error} = await sb.from('gastos').delete().eq('id', gastoId);
    if (error) { setBusy(false); return notify('Error: '+error.message,'err'); }
    setBusy(false);
    notify('Gasto eliminado definitivamente');
    onBack && onBack();
  };

  if (loading) return <div style={{padding:60,textAlign:'center',color:'var(--ink-3)',fontSize:13}}>Cargando…</div>;
  if (!gasto) return <div style={{padding:60,textAlign:'center',color:'var(--ink-3)',fontSize:13}}>Gasto no encontrado</div>;

  const esMXN = gasto.moneda === 'MXN';
  const esImg = compUrl && gasto.comprobante_url && /\.(jpe?g|png|webp|heic|gif)$/i.test(gasto.comprobante_url);
  const esPdf = compUrl && gasto.comprobante_url && /\.pdf$/i.test(gasto.comprobante_url);

  return (
    <div style={{width:'100%',height:'100%',display:'flex',fontFamily:'var(--sans)',background:'var(--paper)',color:'var(--ink-1)'}}>
      {!window.__EMBEDDED__ && <Sidebar active="gastos"/>}
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        {/* Header */}
        <div style={{padding:'18px 36px',borderBottom:'1px solid var(--line-1)',background:'var(--paper-raised)',display:'flex',alignItems:'center',gap:14}}>
          <button onClick={onBack} style={{background:'transparent',border:'none',display:'flex',alignItems:'center',gap:5,color:'var(--ink-2)',fontSize:13,cursor:'pointer',fontWeight:500,fontFamily:'inherit'}}>
            <Icon name="arrow-left" size={15}/> Gastos
          </button>
          <div style={{width:1,height:22,background:'var(--line-1)'}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'baseline',gap:10,flexWrap:'wrap'}}>
              <div style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:500,letterSpacing:-.4,color:'var(--ink-0)',lineHeight:1}}>{gasto.concepto}</div>
              <Chip tone={gasto.categoria_tone || 'neutral'}>{gasto.categoria}</Chip>
              {archivado && <Chip tone="neutral"><Icon name="receipt" size={9} stroke={2}/> Archivado</Chip>}
              {splits.length > 1 && <Chip tone="ocean" style={{background:'var(--ink-blue)',color:'#fff'}}>Split · {splits.length} pagos</Chip>}
            </div>
            <div style={{fontSize:11,color:'var(--ink-3)',marginTop:4}}>Gasto #{String(gasto.folio||'').padStart(4,'0')} · {formatFechaLarga(gasto.fecha)}</div>
          </div>
          {!archivado ? (
            <>
              <Btn variant="ghost" size="md" icon="trash" onClick={archivar} disabled={busy} style={{color:'var(--ink-2)'}}>Archivar</Btn>
              <Btn variant="secondary" size="md" icon="edit" onClick={onEdit} disabled={busy}>Editar</Btn>
            </>
          ) : (
            <>
              <Btn variant="ghost" size="md" icon="trash" onClick={eliminarDefinitivo} disabled={busy} style={{color:'var(--clay)'}}>Eliminar definitivamente</Btn>
              <Btn variant="secondary" size="md" icon="check" onClick={restaurar} disabled={busy}>Restaurar</Btn>
            </>
          )}
        </div>

        <div style={{flex:1,overflowY:'auto'}}>
          <div style={{maxWidth:1100,margin:'0 auto',padding:'32px 40px 80px',display:'grid',gridTemplateColumns:'1fr 340px',gap:24}}>
            <div style={{display:'flex',flexDirection:'column',gap:18}}>

              {/* Monto principal */}
              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:'26px 30px'}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:10}}>Monto del gasto</div>
                <Money amount={Number(gasto.monto)} currency={gasto.moneda} size={52} weight={500}/>
                {!esMXN && <div style={{marginTop:8,fontSize:13,color:'var(--ink-3)'}} className="num">Equivale a ${Number(gasto.monto_mxn).toLocaleString('es-MX',{minimumFractionDigits:2})} MXN · TC {Number(gasto.tc_momento).toFixed(2)}</div>}

                {/* Desglose IVA si aplica */}
                {gasto.iva_pct > 0 && (
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginTop:20,paddingTop:18,borderTop:'1px dashed var(--line-1)'}}>
                    <DataCellFn lbl="Subtotal" val={<span className="num">${Number(gasto.subtotal).toLocaleString('es-MX',{minimumFractionDigits:2})}</span>}/>
                    <DataCellFn lbl={`IVA ${gasto.iva_pct}%`} val={<span className="num">${Number(gasto.iva_importe).toLocaleString('es-MX',{minimumFractionDigits:2})}</span>}/>
                    <DataCellFn lbl="Total" val={<span className="num">${Number(gasto.monto).toLocaleString('es-MX',{minimumFractionDigits:2})}</span>}/>
                  </div>
                )}

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:20,marginTop:22,paddingTop:20,borderTop:'1px solid var(--line-2)'}}>
                  <DataCellFn lbl="Cuenta" val={gasto.cuenta} sub={`${gasto.cuenta_tipo} · ${gasto.moneda}`}/>
                  <DataCellFn lbl="Proveedor" val={gasto.proveedor || '—'}/>
                  <DataCellFn lbl="Fecha" val={formatFecha(gasto.fecha)}/>
                </div>
              </div>

              {/* Splits (solo si hay más de uno) */}
              {splits.length > 1 && (
                <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:'22px 28px'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                    <div style={{fontFamily:'var(--serif)',fontSize:16,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2}}>División del pago</div>
                    <div style={{fontSize:11,color:'var(--ink-3)'}}>{splits.length} cuentas</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {splits.map((s,i)=>(
                      <div key={s.id} style={{display:'grid',gridTemplateColumns:'auto 1fr auto',gap:12,alignItems:'center',padding:'10px 14px',background:'var(--paper-sunk)',borderRadius:8,border:'1px solid var(--line-2)'}}>
                        <div style={{width:24,height:24,borderRadius:999,background:'var(--paper-raised)',border:'1px solid var(--line-1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'var(--ink-3)'}}>{i+1}</div>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:'var(--ink-1)'}}>{s.cta?.label}</div>
                          <div style={{fontSize:10.5,color:'var(--ink-3)'}}>{s.cta?.tipo} · {s.cta?.moneda}</div>
                        </div>
                        <div className="num" style={{fontSize:14,fontWeight:600,color:'var(--ink-0)',fontFamily:'var(--serif)'}}>${Number(s.monto).toLocaleString('es-MX',{minimumFractionDigits:2})}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notas */}
              {gasto.notas && (
                <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:'22px 28px'}}>
                  <div style={{fontFamily:'var(--serif)',fontSize:16,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2,marginBottom:10}}>Notas internas</div>
                  <div style={{fontSize:13.5,color:'var(--ink-1)',lineHeight:1.55,whiteSpace:'pre-wrap'}}>{gasto.notas}</div>
                </div>
              )}

              {/* Historial */}
              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:'22px 28px'}}>
                <div style={{fontFamily:'var(--serif)',fontSize:16,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2,marginBottom:14}}>Historial</div>
                {historial.length === 0 ? (
                  <div style={{fontSize:12,color:'var(--ink-3)',fontStyle:'italic'}}>Sin eventos registrados.</div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    {historial.map(h => <HistRowFn key={h.id} h={h}/>)}
                  </div>
                )}
              </div>
            </div>

            {/* Columna derecha · comprobante */}
            <div>
              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:18,position:'sticky',top:24}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                  <div style={{fontFamily:'var(--serif)',fontSize:15,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2}}>Comprobante</div>
                  {gasto.comprobante_url
                    ? <Chip tone="moss"><Icon name="check" size={9}/>Adjunto</Chip>
                    : <Chip tone="amber">Sin adjuntar</Chip>}
                </div>

                {!gasto.comprobante_url ? (
                  <div style={{border:'1.5px dashed var(--line-1)',borderRadius:10,padding:'30px 14px',textAlign:'center',background:'var(--paper-sunk)',color:'var(--ink-3)',fontSize:12}}>
                    No hay comprobante.<br/>
                    <button onClick={onEdit} style={{marginTop:10,background:'transparent',border:'none',color:'var(--clay)',cursor:'pointer',fontWeight:600,fontSize:12,fontFamily:'inherit',textDecoration:'underline'}}>Editar y adjuntar</button>
                  </div>
                ) : esImg ? (
                  <div style={{borderRadius:10,overflow:'hidden',border:'1px solid var(--line-1)'}}>
                    <a href={compUrl} target="_blank" rel="noopener noreferrer" style={{display:'block'}}>
                      <img src={compUrl} alt="comprobante" style={{width:'100%',display:'block'}}/>
                    </a>
                  </div>
                ) : esPdf ? (
                  <a href={compUrl} target="_blank" rel="noopener noreferrer" style={{display:'block',textDecoration:'none',padding:'24px 16px',border:'1px solid var(--line-1)',borderRadius:10,background:'var(--paper-sunk)',textAlign:'center'}}>
                    <div style={{width:52,height:52,borderRadius:10,background:'var(--paper-raised)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px',color:'var(--ink-blue)'}}>
                      <Icon name="receipt" size={24} stroke={1.6}/>
                    </div>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--ink-1)',marginBottom:4}}>PDF adjunto</div>
                    <div style={{fontSize:11,color:'var(--clay)',fontWeight:600}}>Abrir en nueva pestaña →</div>
                  </a>
                ) : (
                  <a href={compUrl} target="_blank" rel="noopener noreferrer" style={{display:'block',textDecoration:'none',padding:'16px',border:'1px solid var(--line-1)',borderRadius:10,background:'var(--paper-sunk)'}}>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--ink-1)'}}>Ver archivo</div>
                    <div style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>Clic para abrir</div>
                  </a>
                )}

                {gasto.comprobante_url && (
                  <div style={{display:'flex',gap:6,marginTop:12}}>
                    <a href={compUrl} download target="_blank" rel="noopener noreferrer" style={{flex:1,textDecoration:'none'}}>
                      <Btn variant="secondary" size="sm" icon="download" style={{width:'100%',justifyContent:'center'}}>Descargar</Btn>
                    </a>
                    <Btn variant="ghost" size="sm" icon="edit" onClick={onEdit} style={{flex:1,justifyContent:'center'}}>Reemplazar</Btn>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Fila de historial ───
const HistRowFn = ({h}) => {
  const iconos = {
    creado:     {icon:'plus',    color:'var(--moss)'},
    editado:    {icon:'edit',    color:'var(--ink-blue)'},
    archivado:  {icon:'trash',   color:'var(--amber)'},
    restaurado: {icon:'check',   color:'var(--moss)'},
    eliminado:  {icon:'trash',   color:'var(--clay)'},
  };
  const meta = iconos[h.accion] || {icon:'edit', color:'var(--ink-3)'};
  const titulos = {
    creado:     'Gasto creado',
    editado:    'Gasto editado',
    archivado:  'Gasto archivado',
    restaurado: 'Gasto restaurado',
    eliminado:  'Gasto eliminado',
  };
  const fecha = new Date(h.creado);
  const when = fecha.toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'}) + ' · ' + fecha.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'});
  return (
    <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
      <div style={{width:26,height:26,borderRadius:999,background:'var(--paper-sunk)',border:'1px solid var(--line-1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:meta.color}}>
        <Icon name={meta.icon} size={12} stroke={2}/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,color:'var(--ink-0)',fontWeight:600}}>{titulos[h.accion] || h.accion}</div>
        <div style={{fontSize:11.5,color:'var(--ink-3)',marginTop:2}}>{h.usuario_label || 'Sistema'} · {when}</div>
        {h.cambios && <HistCambios cambios={h.cambios}/>}
      </div>
    </div>
  );
};

// Renderer de cambios (diff)
const HistCambios = ({cambios}) => {
  const entries = Object.entries(cambios || {});
  if (entries.length === 0) return null;
  return (
    <div style={{marginTop:6,padding:'8px 10px',background:'var(--paper-sunk)',border:'1px solid var(--line-2)',borderRadius:6,fontSize:11.5,color:'var(--ink-2)',display:'flex',flexDirection:'column',gap:3}}>
      {entries.map(([k,v])=>(
        <div key={k}>
          <span style={{color:'var(--ink-3)',fontWeight:600,textTransform:'capitalize'}}>{k}:</span>{' '}
          <span style={{textDecoration:'line-through',color:'var(--ink-3)'}}>{String(v.de)}</span>{' → '}
          <span style={{fontWeight:600,color:'var(--ink-0)'}}>{String(v.a)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Celda de dato genérica ───
const DataCellFn = ({lbl, val, sub}) => (
  <div>
    <div style={{fontSize:10,fontWeight:700,letterSpacing:.6,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:5}}>{lbl}</div>
    <div style={{fontSize:14,fontWeight:600,color:'var(--ink-0)'}}>{val}</div>
    {sub && <div style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>{sub}</div>}
  </div>
);

Object.assign(window, { GastosDetalle: GastosDetalleFn, HistRowFn, DataCellFn });
