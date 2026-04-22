// ──────────────────────────────────────────
// Config · Servicios y Canales — VERSIÓN FUNCIONAL conectada a Supabase
// Reemplaza ServiciosComisiones mock al cargarse después.
// Tabs: Servicios (catálogo) · Canales (con % editable)
// ──────────────────────────────────────────

const FormServicio = ({servicio, onSave, onCancel}) => {
  const [label, setLabel]           = React.useState(servicio?.label || '');
  const [codigo, setCodigo]         = React.useState(servicio?.codigo || '');
  const [descripcion, setDesc]      = React.useState(servicio?.descripcion || '');
  const [duracion, setDuracion]     = React.useState(servicio?.duracion_min || 60);
  const [precioBase, setPrecio]     = React.useState(servicio?.precio_base || 0);
  const [activo, setActivo]         = React.useState(servicio?.activo ?? true);
  const [saving, setSaving]         = React.useState(false);
  const editando = !!servicio;

  const fieldStyle  = {width:'100%',padding:'9px 12px',fontSize:13,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontFamily:'inherit',color:'var(--ink-1)',boxSizing:'border-box'};
  const labelStyle  = {display:'block',fontSize:11,fontWeight:600,letterSpacing:.4,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:6};

  const guardar = async () => {
    if (!label.trim()) return notify('Falta el nombre del servicio','err');
    setSaving(true);
    const payload = {
      label: label.trim(),
      codigo: codigo.trim().toUpperCase() || null,
      descripcion: descripcion.trim() || null,
      duracion_min: parseInt(duracion) || 0,
      precio_base: parseFloat(precioBase) || 0,
      activo,
    };
    let error;
    if (editando) ({error} = await sb.from('servicios').update(payload).eq('id', servicio.id));
    else          ({error} = await sb.from('servicios').insert(payload));
    setSaving(false);
    if (error) return notify('Error: '+error.message, 'err');
    notify(editando ? 'Servicio actualizado' : 'Servicio creado');
    onSave();
  };

  return (
    <>
      <div style={{marginBottom:14}}>
        <label style={labelStyle}>Nombre del servicio</label>
        <input autoFocus value={label} onChange={e=>setLabel(e.target.value)} placeholder="Masaje, Trenzas, Fish Spa…" style={fieldStyle}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
        <div>
          <label style={labelStyle}>Código (opcional)</label>
          <input value={codigo} onChange={e=>setCodigo(e.target.value.toUpperCase())} placeholder="MASAJE60" style={{...fieldStyle,fontFamily:'var(--mono)',letterSpacing:.5}}/>
        </div>
        <div>
          <label style={labelStyle}>Duración sugerida (min)</label>
          <input type="number" min="0" value={duracion} onChange={e=>setDuracion(e.target.value)} style={fieldStyle} className="num"/>
        </div>
      </div>
      <div style={{marginBottom:14}}>
        <label style={labelStyle}>Precio base sugerido (MXN)</label>
        <div style={{position:'relative'}}>
          <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--ink-3)',fontSize:13}}>$</span>
          <input type="number" step="0.01" min="0" value={precioBase} onChange={e=>setPrecio(e.target.value)} style={{...fieldStyle,paddingLeft:24}} className="num"/>
        </div>
        <div style={{fontSize:11,color:'var(--ink-3)',marginTop:5,lineHeight:1.4}}>El precio real se captura al momento de la venta — esto solo sugiere un valor.</div>
      </div>
      <div style={{marginBottom:14}}>
        <label style={labelStyle}>Descripción (opcional)</label>
        <textarea value={descripcion} onChange={e=>setDesc(e.target.value)} rows={2} placeholder="Detalles del servicio" style={{...fieldStyle,resize:'vertical',minHeight:50}}/>
      </div>
      <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
        <input type="checkbox" checked={activo} onChange={e=>setActivo(e.target.checked)}/>
        <span style={{fontSize:13,color:'var(--ink-1)'}}>Activo (aparece en el PV al cobrar)</span>
      </label>
      <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:22,paddingTop:16,borderTop:'1px solid var(--line-1)'}}>
        <Btn variant="ghost" size="md" onClick={onCancel} disabled={saving}>Cancelar</Btn>
        <Btn variant="clay" size="md" icon="check" onClick={guardar} disabled={saving}>{saving?'Guardando…':(editando?'Guardar cambios':'Crear servicio')}</Btn>
      </div>
    </>
  );
};

const FormCanal = ({canal, onSave, onCancel}) => {
  const [label, setLabel]           = React.useState(canal?.label || '');
  const [descripcion, setDesc]      = React.useState(canal?.descripcion || '');
  const [comisionDefault, setCom]   = React.useState(canal?.comision_default ?? 50);
  const [activo, setActivo]         = React.useState(canal?.activo ?? true);
  const [saving, setSaving]         = React.useState(false);

  const fieldStyle = {width:'100%',padding:'9px 12px',fontSize:13,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontFamily:'inherit',color:'var(--ink-1)',boxSizing:'border-box'};
  const labelStyle = {display:'block',fontSize:11,fontWeight:600,letterSpacing:.4,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:6};

  const guardar = async () => {
    if (!label.trim()) return notify('Falta el nombre del canal','err');
    const pct = parseFloat(comisionDefault);
    if (isNaN(pct) || pct < 0 || pct > 100) return notify('La comisión debe estar entre 0 y 100','err');
    setSaving(true);
    const payload = {
      label: label.trim(),
      descripcion: descripcion.trim() || null,
      comision_default: pct,
      activo,
    };
    const {error} = await sb.from('canales_venta').update(payload).eq('id', canal.id);
    setSaving(false);
    if (error) return notify('Error: '+error.message, 'err');
    notify('Canal actualizado');
    onSave();
  };

  return (
    <>
      <div style={{marginBottom:14}}>
        <label style={labelStyle}>Nombre del canal</label>
        <input autoFocus value={label} onChange={e=>setLabel(e.target.value)} style={fieldStyle}/>
      </div>
      <div style={{marginBottom:14}}>
        <label style={labelStyle}>Comisión al terapeuta (%)</label>
        <div style={{position:'relative'}}>
          <input type="number" step="0.01" min="0" max="100" value={comisionDefault} onChange={e=>setCom(e.target.value)} style={{...fieldStyle,paddingRight:30,fontSize:18,fontFamily:'var(--serif)',fontWeight:600,letterSpacing:-.3}} className="num"/>
          <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',color:'var(--ink-3)',fontSize:14,fontWeight:600}}>%</span>
        </div>
        <div style={{fontSize:11,color:'var(--ink-3)',marginTop:5}}>El spa se queda con <strong>{(100 - (parseFloat(comisionDefault)||0)).toFixed(2).replace(/\.00$/,'')}%</strong> de las ventas en este canal.</div>
      </div>
      <div style={{marginBottom:14}}>
        <label style={labelStyle}>Descripción (opcional)</label>
        <textarea value={descripcion} onChange={e=>setDesc(e.target.value)} rows={2} style={{...fieldStyle,resize:'vertical',minHeight:50}}/>
      </div>
      <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
        <input type="checkbox" checked={activo} onChange={e=>setActivo(e.target.checked)}/>
        <span style={{fontSize:13,color:'var(--ink-1)'}}>Activo (aparece en el PV al cobrar)</span>
      </label>
      <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:22,paddingTop:16,borderTop:'1px solid var(--line-1)'}}>
        <Btn variant="ghost" size="md" onClick={onCancel} disabled={saving}>Cancelar</Btn>
        <Btn variant="clay" size="md" icon="check" onClick={guardar} disabled={saving}>{saving?'Guardando…':'Guardar cambios'}</Btn>
      </div>
    </>
  );
};

const ServiciosComisionesFn = () => {
  const [tab, setTab]           = React.useState('servicios');
  const [servicios, setServs]   = React.useState([]);
  const [canales, setCanales]   = React.useState([]);
  const [loading, setLoading]   = React.useState(true);
  const [modal, setModal]       = React.useState(null);

  const cargar = React.useCallback(async () => {
    setLoading(true);
    const [s, c] = await Promise.all([
      sb.from('servicios').select('*').order('orden').order('label'),
      sb.from('canales_venta').select('*').order('orden').order('label'),
    ]);
    if (s.error) notify('Error servicios: '+s.error.message,'err');
    if (c.error) notify('Error canales: '+c.error.message,'err');
    setServs(s.data || []);
    setCanales(c.data || []);
    setLoading(false);
  }, []);

  React.useEffect(()=>{ cargar(); }, [cargar]);

  const borrarServicio = async (s) => {
    if (!confirmar(`¿Borrar el servicio "${s.label}"?\n\nSi tiene ventas asociadas no se podrá borrar; archívalo.`)) return;
    const {error} = await sb.from('servicios').delete().eq('id', s.id);
    if (error) return notify('No se pudo borrar. Tiene ventas asociadas — archívalo en su lugar.','err');
    notify('Servicio borrado');
    cargar();
  };

  const toggleActivoServicio = async (s) => {
    const {error} = await sb.from('servicios').update({activo: !s.activo}).eq('id', s.id);
    if (error) return notify('Error: '+error.message,'err');
    cargar();
  };

  const toneColor = (t) => ({
    clay:'var(--clay)', moss:'var(--moss)', blue:'var(--ink-blue)', sand:'var(--clay)',
    rose:'#d4537e', ocean:'#378add',
  }[t] || 'var(--ink-2)');

  return (
    <div style={{width:'100%',height:'100%',display:'flex',fontFamily:'var(--sans)',background:'var(--paper)',color:'var(--ink-1)'}}>
      {!window.__EMBEDDED__ && <Sidebar active="servicios"/>}
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        <div style={{padding:'28px 36px 18px',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16}}>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',fontWeight:600,letterSpacing:.5,textTransform:'uppercase',marginBottom:6}}>Configuración</div>
            <div style={{fontFamily:'var(--serif)',fontSize:34,fontWeight:500,letterSpacing:-.8,color:'var(--ink-0)',lineHeight:1}}>Servicios y comisiones</div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:6}}>Catálogo de servicios del spa · comisión al terapeuta según canal de venta</div>
          </div>
          {tab==='servicios' && (
            <Btn variant="clay" size="md" icon="plus" onClick={()=>setModal({tipo:'servicio-nuevo'})}>Nuevo servicio</Btn>
          )}
        </div>

        <TabHeader active={tab} onChange={setTab} tabs={[
          {id:'servicios',  label:'Servicios', icon:'sparkles', count:servicios.filter(s=>s.activo).length},
          {id:'comisiones', label:'Canales',   icon:'percent',  count:canales.filter(c=>c.activo).length},
        ]}/>

        <div style={{flex:1,overflowY:'auto',padding:'22px 36px 60px'}}>
          {loading && <div style={{textAlign:'center',padding:40,color:'var(--ink-3)',fontSize:13}}>Cargando…</div>}

          {!loading && tab==='servicios' && (
            <>
              <div style={{marginBottom:18,padding:'14px 18px',background:'var(--sand-100)',border:'1px solid #ecd49a',borderRadius:10,display:'flex',gap:12,alignItems:'flex-start',fontSize:12.5,color:'#7a4e10',lineHeight:1.55}}>
                <Icon name="sparkles" size={14} stroke={1.8} style={{marginTop:2,flexShrink:0}}/>
                <div>
                  <strong>Todo es libre al momento de la venta.</strong> Solo el nombre vive aquí. <span style={{opacity:.7}}>Precio, moneda y duración se capturan en el PV cuando se registra la venta — el "Precio base" es solo sugerido.</span>
                </div>
              </div>

              {servicios.length === 0 ? (
                <div style={{background:'var(--paper-raised)',border:'1px dashed var(--line-1)',borderRadius:12,padding:'48px 24px',textAlign:'center'}}>
                  <div style={{fontFamily:'var(--serif)',fontSize:20,fontWeight:600,color:'var(--ink-0)',marginBottom:6}}>Aún no hay servicios</div>
                  <div style={{fontSize:13,color:'var(--ink-2)',marginBottom:18}}>Crea tu primer servicio para empezar a cobrar en el PV.</div>
                  <Btn variant="clay" size="md" icon="plus" onClick={()=>setModal({tipo:'servicio-nuevo'})}>Crear primer servicio</Btn>
                </div>
              ) : (
                <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden'}}>
                  <div style={{display:'grid',gridTemplateColumns:'56px 1fr 100px 110px 100px 90px',gap:14,padding:'11px 20px',background:'var(--paper-sunk)',borderBottom:'1px solid var(--line-1)',fontSize:10,fontWeight:700,letterSpacing:.6,textTransform:'uppercase',color:'var(--ink-3)'}}>
                    <div></div>
                    <div>Servicio</div>
                    <div>Código</div>
                    <div>Precio base</div>
                    <div>Estado</div>
                    <div></div>
                  </div>
                  {servicios.map((s,i)=>(
                    <div key={s.id} style={{display:'grid',gridTemplateColumns:'56px 1fr 100px 110px 100px 90px',gap:14,alignItems:'center',padding:'14px 20px',borderTop:i===0?'none':'1px solid var(--line-1)',opacity:s.activo?1:.55}}>
                      <div style={{width:36,height:36,borderRadius:8,background:s.activo?'var(--sand-100)':'var(--paper-sunk)',border:`1px solid ${s.activo?'#e6d4a8':'var(--line-1)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--serif)',fontSize:15,fontWeight:600,color:s.activo?'var(--clay)':'var(--ink-3)'}}>{(s.label||'?').charAt(0).toUpperCase()}</div>
                      <div>
                        <div style={{fontSize:15,fontWeight:600,color:'var(--ink-0)',fontFamily:'var(--serif)',letterSpacing:-.2}}>{s.label}</div>
                        {s.descripcion && <div style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>{s.descripcion}</div>}
                      </div>
                      <div style={{fontSize:11,color:'var(--ink-3)',fontFamily:'var(--mono)',letterSpacing:.5}}>{s.codigo || '—'}</div>
                      <div style={{fontSize:13,fontWeight:600,color:'var(--ink-1)'}} className="num">
                        {s.precio_base > 0 ? '$'+Number(s.precio_base).toLocaleString('es-MX') : <span style={{color:'var(--ink-3)',fontWeight:400}}>—</span>}
                        {s.duracion_min > 0 && <div style={{fontSize:10,color:'var(--ink-3)',fontWeight:500,marginTop:2}}>{s.duracion_min} min</div>}
                      </div>
                      <div>
                        <button onClick={()=>toggleActivoServicio(s)} style={{background:'transparent',border:'none',cursor:'pointer',padding:0}}>
                          <Chip tone={s.activo?'moss':'neutral'}>{s.activo?'Activo':'Archivado'}</Chip>
                        </button>
                      </div>
                      <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                        <button onClick={()=>setModal({tipo:'servicio-editar',data:s})} title="Editar" style={{background:'transparent',border:'none',cursor:'pointer',padding:6,color:'var(--ink-3)',borderRadius:6}}><Icon name="edit" size={14}/></button>
                        <button onClick={()=>borrarServicio(s)} title="Borrar" style={{background:'transparent',border:'none',cursor:'pointer',padding:6,color:'var(--ink-3)',borderRadius:6}}><Icon name="trash" size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {!loading && tab==='comisiones' && (
            <>
              {canales.length === 0 ? (
                <div style={{background:'var(--paper-raised)',border:'1px dashed var(--line-1)',borderRadius:12,padding:'48px 24px',textAlign:'center'}}>
                  <div style={{fontFamily:'var(--serif)',fontSize:20,fontWeight:600,color:'var(--ink-0)',marginBottom:6}}>No hay canales configurados</div>
                  <div style={{fontSize:13,color:'var(--ink-2)'}}>Corre el seed inicial: <code style={{fontFamily:'var(--mono)',background:'var(--paper-sunk)',padding:'2px 6px',borderRadius:4,fontSize:11}}>07_seed_pv_inicial.sql</code></div>
                </div>
              ) : (
                <>
                  <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(canales.length,3)}, 1fr)`,gap:14,marginBottom:24}}>
                    {canales.map(c=>{
                      const color = toneColor(c.tone);
                      const pct = Number(c.comision_default);
                      return (
                        <div key={c.id} style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,padding:'22px 22px 18px',position:'relative',overflow:'hidden',opacity:c.activo?1:.55}}>
                          <div style={{position:'absolute',top:0,left:0,right:0,height:4,background:color}}/>
                          <div style={{fontSize:11,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:color,marginBottom:10}}>Canal · {c.label}</div>
                          <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:12}}>
                            <span style={{fontFamily:'var(--serif)',fontSize:56,fontWeight:500,color:'var(--ink-0)',letterSpacing:-1.5,lineHeight:.9}} className="num">{pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2)}</span>
                            <span style={{fontSize:22,color:'var(--ink-2)',fontWeight:500,fontFamily:'var(--serif)'}}>%</span>
                            <span style={{fontSize:10.5,color:'var(--ink-3)',marginLeft:'auto',fontWeight:600,letterSpacing:.4,textTransform:'uppercase'}}>al terapeuta</span>
                          </div>
                          <div style={{fontSize:12,color:'var(--ink-2)',lineHeight:1.5,minHeight:48}}>{c.descripcion || <span style={{fontStyle:'italic',color:'var(--ink-3)'}}>Sin descripción</span>}</div>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:12,paddingTop:12,borderTop:'1px solid var(--line-1)'}}>
                            <span style={{fontSize:11,color:'var(--ink-3)'}}>Spa se queda con <strong style={{color:'var(--ink-1)'}}>{(100-pct).toFixed(2).replace(/\.00$/,'')}%</strong></span>
                            <Btn variant="ghost" size="sm" icon="edit" onClick={()=>setModal({tipo:'canal-editar',data:c})}>Editar</Btn>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Ejemplo de aplicación */}
                  <div style={{background:'linear-gradient(135deg, #fef9ef 0%, #fcecd9 100%)',border:'1px solid #ecd49a',borderRadius:14,padding:'22px 26px'}}>
                    <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:16}}>
                      <div>
                        <div style={{fontSize:10.5,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--clay)',marginBottom:4}}>Ejemplo de aplicación</div>
                        <div style={{fontFamily:'var(--serif)',fontSize:18,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.3}}>Venta de <span style={{color:'var(--clay)'}}>$1,000</span> según canal</div>
                      </div>
                      <div style={{fontSize:11,color:'var(--ink-3)'}}>simulación · datos reales llegan del PV</div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(canales.length,3)}, 1fr)`,gap:14}}>
                      {canales.filter(c=>c.activo).map(c=>{
                        const precio = 1000;
                        const pct = Number(c.comision_default);
                        const ter = precio*pct/100;
                        const spa = precio - ter;
                        const color = toneColor(c.tone);
                        return (
                          <div key={c.id} style={{background:'rgba(254,253,249,.85)',border:`1px solid ${color}`,borderRadius:10,padding:'14px 16px'}}>
                            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                              <div style={{width:8,height:8,borderRadius:999,background:color}}/>
                              <div style={{fontSize:13,fontWeight:700,color:'var(--ink-0)'}}>{c.label}</div>
                              <div style={{marginLeft:'auto',fontSize:10,fontWeight:700,color:color,background:'#fff',padding:'2px 7px',borderRadius:999,border:`1px solid ${color}`,fontFamily:'var(--mono)'}}>{pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2)}%</div>
                            </div>
                            <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:6,fontSize:12}}>
                              <span style={{color:'var(--ink-3)'}}>Terapeuta</span>
                              <span className="num mono" style={{fontWeight:700,color:color}}>${ter.toLocaleString('es-MX',{maximumFractionDigits:0})}</span>
                              <span style={{color:'var(--ink-3)'}}>Spa</span>
                              <span className="num mono" style={{fontWeight:600,color:'var(--ink-2)'}}>${spa.toLocaleString('es-MX',{maximumFractionDigits:0})}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modales */}
      {modal?.tipo==='servicio-nuevo' && (
        <Modal title="Nuevo servicio" onClose={()=>setModal(null)}>
          <FormServicio onSave={()=>{setModal(null);cargar();}} onCancel={()=>setModal(null)}/>
        </Modal>
      )}
      {modal?.tipo==='servicio-editar' && (
        <Modal title="Editar servicio" onClose={()=>setModal(null)}>
          <FormServicio servicio={modal.data} onSave={()=>{setModal(null);cargar();}} onCancel={()=>setModal(null)}/>
        </Modal>
      )}
      {modal?.tipo==='canal-editar' && (
        <Modal title={`Editar canal · ${modal.data.label}`} onClose={()=>setModal(null)}>
          <FormCanal canal={modal.data} onSave={()=>{setModal(null);cargar();}} onCancel={()=>setModal(null)}/>
        </Modal>
      )}
    </div>
  );
};

Object.assign(window, { ServiciosComisiones: ServiciosComisionesFn, FormServicio, FormCanal });
