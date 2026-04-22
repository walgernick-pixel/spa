// ──────────────────────────────────────────
// Config · Catálogo de Gastos — VERSIÓN FUNCIONAL conectada a Supabase
// Reemplaza CatalogoGastos mock al cargarse después.
// ──────────────────────────────────────────

const CAT_TONE_COLOR = {
  nomina:'var(--clay)', operativos:'var(--moss)', servicios:'var(--ink-blue)',
  mantenimiento:'var(--sand-600)', inversion:'#b06088', administrativo:'var(--ink-2)', otros:'var(--ink-3)'
};

// ─── Form concepto ───
const FormConcepto = ({concepto, categoriaId, categorias, onSave, onCancel}) => {
  const [label,setLabel] = React.useState(concepto?.label || '');
  const [cat,setCat]     = React.useState(concepto?.categoria || categoriaId || categorias[0]?.id);
  const [activo,setActivo] = React.useState(concepto?.activo ?? true);
  const [saving,setSaving] = React.useState(false);
  const editando = !!concepto;

  const fieldStyle = {width:'100%',padding:'9px 12px',fontSize:13,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontFamily:'inherit',color:'var(--ink-1)',boxSizing:'border-box'};
  const labelStyle = {display:'block',fontSize:11,fontWeight:600,letterSpacing:.4,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:6};

  const guardar = async () => {
    if (!label.trim()) return notify('Falta el nombre del concepto','err');
    setSaving(true);
    const payload = {label: label.trim(), categoria: cat, activo};
    let error;
    if (editando) ({error} = await sb.from('conceptos_gasto').update(payload).eq('id', concepto.id));
    else          ({error} = await sb.from('conceptos_gasto').insert(payload));
    setSaving(false);
    if (error) {
      if (error.code === '23505') return notify('Ya existe un concepto con ese nombre en esa categoría','err');
      return notify('Error: '+error.message,'err');
    }
    notify(editando ? 'Concepto actualizado' : 'Concepto creado');
    onSave();
  };

  return (
    <>
      <div style={{marginBottom:16}}>
        <label style={labelStyle}>Nombre del concepto</label>
        <input autoFocus value={label} onChange={e=>setLabel(e.target.value)} placeholder="Lavandería, Sueldo terapeuta, Luz CFE..." style={fieldStyle}/>
      </div>
      <div style={{marginBottom:16}}>
        <label style={labelStyle}>Categoría</label>
        <select value={cat} onChange={e=>setCat(e.target.value)} style={fieldStyle}>
          {categorias.map(k=> <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>
      </div>
      {editando && (
        <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',fontSize:13,color:'var(--ink-1)',marginBottom:8}}>
          <input type="checkbox" checked={activo} onChange={e=>setActivo(e.target.checked)}/>
          Concepto activo (desmarca para desactivar sin borrar)
        </label>
      )}
      <div style={{marginTop:20,display:'flex',justifyContent:'flex-end',gap:10}}>
        <Btn variant="ghost" size="md" onClick={onCancel} disabled={saving}>Cancelar</Btn>
        <Btn variant="clay" size="md" onClick={guardar} disabled={saving}>{saving?'Guardando…':(editando?'Guardar':'Crear concepto')}</Btn>
      </div>
    </>
  );
};

// ─── Form categoría ───
const FormCategoria = ({categoria, onSave, onCancel}) => {
  const [id,setId]         = React.useState(categoria?.id || '');
  const [label,setLabel]   = React.useState(categoria?.label || '');
  const [desc,setDesc]     = React.useState(categoria?.descripcion || '');
  const [tone,setTone]     = React.useState(categoria?.tone || 'neutral');
  const [saving,setSaving] = React.useState(false);
  const editando = !!categoria;

  const fieldStyle = {width:'100%',padding:'9px 12px',fontSize:13,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontFamily:'inherit',color:'var(--ink-1)',boxSizing:'border-box'};
  const labelStyle = {display:'block',fontSize:11,fontWeight:600,letterSpacing:.4,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:6};

  const guardar = async () => {
    if (!label.trim()) return notify('Falta el nombre','err');
    const fid = editando ? categoria.id : (id.trim() || label.trim().toLowerCase().replace(/[^a-z0-9]/g,'_'));
    if (!fid) return notify('Falta el ID','err');
    setSaving(true);
    const payload = {label:label.trim(), descripcion:desc.trim()||null, tone};
    let error;
    if (editando) ({error} = await sb.from('categorias_gasto').update(payload).eq('id', categoria.id));
    else          ({error} = await sb.from('categorias_gasto').insert({...payload, id:fid, sistema:false}));
    setSaving(false);
    if (error) {
      if (error.code === '23505') return notify('Ya existe una categoría con ese ID','err');
      return notify('Error: '+error.message,'err');
    }
    notify(editando ? 'Categoría actualizada' : 'Categoría creada');
    onSave();
  };

  const tones = ['clay','moss','ocean','amber','rose','neutral'];

  return (
    <>
      <div style={{marginBottom:14}}>
        <label style={labelStyle}>Nombre</label>
        <input autoFocus value={label} onChange={e=>setLabel(e.target.value)} placeholder="Marketing, Viáticos..." style={fieldStyle}/>
      </div>
      <div style={{marginBottom:14}}>
        <label style={labelStyle}>Descripción</label>
        <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Qué tipo de gastos van aquí" style={fieldStyle}/>
      </div>
      <div style={{marginBottom:14}}>
        <label style={labelStyle}>Color (chip)</label>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {tones.map(t=>(
            <button key={t} onClick={()=>setTone(t)} style={{padding:'6px 12px',fontSize:12,fontWeight:500,border:tone===t?'2px solid var(--ink-0)':'1px solid var(--line-1)',borderRadius:8,background:`var(--${t==='neutral'?'paper-sunk':t})`,color:t==='neutral'?'var(--ink-2)':'#fff',cursor:'pointer',fontFamily:'inherit',textTransform:'capitalize'}}>{t}</button>
          ))}
        </div>
      </div>
      <div style={{marginTop:20,display:'flex',justifyContent:'flex-end',gap:10}}>
        <Btn variant="ghost" size="md" onClick={onCancel} disabled={saving}>Cancelar</Btn>
        <Btn variant="clay" size="md" onClick={guardar} disabled={saving}>{saving?'Guardando…':(editando?'Guardar':'Crear categoría')}</Btn>
      </div>
    </>
  );
};

// ─── Form tasa de IVA ───
const FormIvaTasa = ({tasa, onSave, onCancel}) => {
  const [label,setLabel] = React.useState(tasa?.label || '');
  const [pct,setPct]     = React.useState(tasa?.porcentaje ?? '');
  const [esDefault,setEsDefault] = React.useState(tasa?.es_default || false);
  const [activo,setActivo] = React.useState(tasa?.activo ?? true);
  const [saving,setSaving] = React.useState(false);
  const editando = !!tasa;

  const fieldStyle = {width:'100%',padding:'9px 12px',fontSize:13,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontFamily:'inherit',color:'var(--ink-1)',boxSizing:'border-box'};
  const labelStyle = {display:'block',fontSize:11,fontWeight:600,letterSpacing:.4,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:6};

  const guardar = async () => {
    if (!label.trim()) return notify('Falta el nombre','err');
    const p = parseFloat(pct);
    if (isNaN(p) || p < 0 || p > 100) return notify('Porcentaje inválido (0-100)','err');
    setSaving(true);
    // Si marcamos esta como default, desmarcar las demás primero
    if (esDefault) {
      await sb.from('iva_tasas').update({es_default:false}).neq('id', tasa?.id || '00000000-0000-0000-0000-000000000000');
    }
    const payload = {label:label.trim(), porcentaje:p, es_default:esDefault, activo};
    let error;
    if (editando) ({error} = await sb.from('iva_tasas').update(payload).eq('id', tasa.id));
    else          ({error} = await sb.from('iva_tasas').insert({...payload, sistema:false}));
    setSaving(false);
    if (error) return notify('Error: '+error.message,'err');
    notify(editando ? 'Tasa actualizada' : 'Tasa creada');
    onSave();
  };

  return (
    <>
      <div style={{marginBottom:14}}>
        <label style={labelStyle}>Nombre</label>
        <input autoFocus value={label} onChange={e=>setLabel(e.target.value)} placeholder="IVA 16%, IVA frontera, Sin IVA..." style={fieldStyle}/>
      </div>
      <div style={{marginBottom:14}}>
        <label style={labelStyle}>Porcentaje</label>
        <div style={{position:'relative'}}>
          <input type="number" step="0.01" min="0" max="100" value={pct} onChange={e=>setPct(e.target.value)} placeholder="16" style={{...fieldStyle,paddingRight:34}}/>
          <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',fontSize:13,color:'var(--ink-3)',fontWeight:500}}>%</span>
        </div>
      </div>
      <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',fontSize:13,color:'var(--ink-1)',marginBottom:10,padding:'10px 12px',background:'var(--paper-sunk)',border:'1px solid var(--line-1)',borderRadius:8}}>
        <input type="checkbox" checked={esDefault} onChange={e=>setEsDefault(e.target.checked)}/>
        <div>
          <div style={{fontWeight:600}}>Marcar como tasa por defecto</div>
          <div style={{fontSize:11.5,color:'var(--ink-3)',marginTop:2}}>Se selecciona automáticamente al capturar un gasto nuevo</div>
        </div>
      </label>
      {editando && !tasa.sistema && (
        <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',fontSize:13,color:'var(--ink-1)',marginBottom:8}}>
          <input type="checkbox" checked={activo} onChange={e=>setActivo(e.target.checked)}/>
          Tasa activa (desmarca para ocultarla sin borrar)
        </label>
      )}
      <div style={{marginTop:20,display:'flex',justifyContent:'flex-end',gap:10}}>
        <Btn variant="ghost" size="md" onClick={onCancel} disabled={saving}>Cancelar</Btn>
        <Btn variant="clay" size="md" onClick={guardar} disabled={saving}>{saving?'Guardando…':(editando?'Guardar':'Crear tasa')}</Btn>
      </div>
    </>
  );
};

// ─── Pantalla principal ───
const CatalogoGastosFn = () => {
  const [tab,setTab] = React.useState('conceptos');
  const [conceptos,setConceptos] = React.useState([]);
  const [categorias,setCategorias] = React.useState([]);
  const [ivaTasas,setIvaTasas] = React.useState([]);
  const [loading,setLoading] = React.useState(true);
  const [collapsed,setCollapsed] = React.useState({});
  const [search,setSearch] = React.useState('');
  const [modal,setModal] = React.useState(null);

  const toggle = (id)=>setCollapsed(s=>({...s,[id]:!s[id]}));

  const cargar = React.useCallback(async () => {
    setLoading(true);
    const [k,c,iv] = await Promise.all([
      sb.from('categorias_gasto').select('*').order('orden'),
      sb.from('conceptos_gasto').select('*').order('orden').order('label'),
      sb.from('iva_tasas').select('*').order('orden'),
    ]);
    if (k.error) notify('Error categorías: '+k.error.message,'err');
    if (c.error) notify('Error conceptos: '+c.error.message,'err');
    if (iv.error) notify('Error IVA: '+iv.error.message,'err');
    setCategorias(k.data || []);
    setConceptos(c.data || []);
    setIvaTasas(iv.data || []);
    setLoading(false);
  }, []);
  React.useEffect(()=>{ cargar(); }, [cargar]);

  const borrarIva = async (t) => {
    if (t.sistema) return notify('Esta tasa es de sistema, no se puede borrar. Desactívala.', 'err');
    if (!confirmar(`¿Borrar la tasa "${t.label}"?`)) return;
    const {error} = await sb.from('iva_tasas').delete().eq('id', t.id);
    if (error) return notify('No se pudo borrar. Puede tener gastos asociados.', 'err');
    notify('Tasa borrada');
    cargar();
  };

  const borrarConcepto = async (c) => {
    if (!confirmar(`¿Borrar el concepto "${c.label}"?\n\nSi tiene gastos asociados no se podrá; desactívalo.`)) return;
    const {error} = await sb.from('conceptos_gasto').delete().eq('id', c.id);
    if (error) return notify('No se pudo borrar. Tiene gastos asociados — desactívalo.','err');
    notify('Concepto borrado');
    cargar();
  };
  const borrarCategoria = async (k) => {
    // Reglas: se puede borrar si NO tiene conceptos asignados, sin importar si es "sistema" o no.
    const conceptosEnCat = conceptos.filter(c => c.categoria === k.id).length;
    if (conceptosEnCat > 0) {
      return notify(`No se puede borrar: tiene ${conceptosEnCat} concepto(s) asignado(s). Muévelos o bórralos primero.`, 'err');
    }
    if (!confirmar(`¿Borrar la categoría "${k.label}"?`)) return;
    const {error} = await sb.from('categorias_gasto').delete().eq('id', k.id);
    if (error) return notify('Error: '+error.message, 'err');
    notify('Categoría borrada');
    cargar();
  };

  const filtered = search.trim()
    ? conceptos.filter(c=>c.label.toLowerCase().includes(search.toLowerCase()))
    : conceptos;

  return (
    <div style={{width:'100%',height:'100%',display:'flex',fontFamily:'var(--sans)',background:'var(--paper)',color:'var(--ink-1)'}}>
      {!window.__EMBEDDED__ && <Sidebar active="conceptos"/>}
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        <div style={{padding:'28px 36px 18px',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16}}>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',fontWeight:600,letterSpacing:.5,textTransform:'uppercase',marginBottom:6}}>Configuración</div>
            <div style={{fontFamily:'var(--serif)',fontSize:34,fontWeight:500,letterSpacing:-.8,color:'var(--ink-0)',lineHeight:1}}>Catálogo de gastos</div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:6}}>Conceptos que se pueden registrar · agrupados por categoría</div>
          </div>
          <Btn variant="clay" size="md" icon="plus" onClick={()=>{
            if (tab==='conceptos') setModal({tipo:'concepto-nuevo'});
            else if (tab==='categorias') setModal({tipo:'cat-nueva'});
            else setModal({tipo:'iva-nueva'});
          }}>
            {tab==='conceptos'?'Nuevo concepto':tab==='categorias'?'Nueva categoría':'Nueva tasa'}
          </Btn>
        </div>

        <TabHeader active={tab} onChange={setTab} tabs={[
          {id:'conceptos', label:'Conceptos', icon:'wallet', count:conceptos.length},
          {id:'categorias', label:'Categorías', icon:'chart', count:categorias.length},
          {id:'iva', label:'IVA', icon:'sparkles', count:ivaTasas.length},
        ]}/>

        <div style={{flex:1,overflowY:'auto',padding:'22px 36px 60px'}}>
          {loading && <div style={{textAlign:'center',padding:40,color:'var(--ink-3)'}}>Cargando…</div>}

          {!loading && tab==='conceptos' && (
            <>
              <div style={{marginBottom:14,display:'flex',gap:10,alignItems:'center'}}>
                <div style={{position:'relative',flex:'0 1 300px'}}>
                  <Icon name="search" size={14} style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--ink-3)'}}/>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar concepto..." style={{width:'100%',padding:'9px 12px 9px 32px',fontSize:13,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontFamily:'inherit',color:'var(--ink-1)'}}/>
                </div>
                <div style={{flex:1}}/>
                <button onClick={()=>setCollapsed({})} style={{background:'transparent',border:'none',fontSize:12,color:'var(--ink-3)',cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>Expandir todo</button>
                <button onClick={()=>{const s={};categorias.forEach(c=>s[c.id]=true);setCollapsed(s);}} style={{background:'transparent',border:'none',fontSize:12,color:'var(--ink-3)',cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>Colapsar todo</button>
              </div>

              {conceptos.length===0 && !search ? (
                <div style={{background:'var(--paper-raised)',border:'1px dashed var(--line-1)',borderRadius:12,padding:'48px 24px',textAlign:'center'}}>
                  <div style={{fontFamily:'var(--serif)',fontSize:20,fontWeight:600,color:'var(--ink-0)',marginBottom:6}}>Aún no hay conceptos</div>
                  <div style={{fontSize:13,color:'var(--ink-2)',marginBottom:18}}>Crea los conceptos que usarás al registrar gastos — lavandería, sueldos, luz, etc.</div>
                  <Btn variant="clay" size="md" icon="plus" onClick={()=>setModal({tipo:'concepto-nuevo'})}>Crear primer concepto</Btn>
                </div>
              ) : (
                categorias.map(kat=>{
                  const items = filtered.filter(c=>c.categoria===kat.id);
                  if (search && items.length===0) return null;
                  const isCollapsed = collapsed[kat.id];
                  return (
                    <div key={kat.id} style={{marginBottom:14,background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden'}}>
                      <div onClick={()=>toggle(kat.id)} role="button" tabIndex={0} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px 20px',background:'var(--paper-sunk)',cursor:'pointer',borderBottom:isCollapsed?'none':'1px solid var(--line-1)',fontFamily:'inherit',textAlign:'left',boxSizing:'border-box'}}>
                        <Icon name={isCollapsed?'chev-right':'chev-down'} size={14} color="var(--ink-2)"/>
                        <span style={{width:10,height:10,borderRadius:2,background:CAT_TONE_COLOR[kat.id]||'var(--ink-3)'}}/>
                        <div style={{fontFamily:'var(--serif)',fontSize:16,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2}}>{kat.label}</div>
                        <div style={{fontSize:11,color:'var(--ink-3)',background:'var(--paper-raised)',padding:'2px 8px',borderRadius:999,border:'1px solid var(--line-1)'}}>{items.length}</div>
                        <div style={{flex:1,fontSize:11.5,color:'var(--ink-3)',fontStyle:'italic',marginLeft:8}}>{kat.descripcion||''}</div>
                        <button onClick={(e)=>{e.stopPropagation();setModal({tipo:'concepto-nuevo',cat:kat.id});}} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'6px 10px',fontSize:11,fontWeight:600,color:'var(--ink-2)',background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:7,cursor:'pointer',fontFamily:'inherit'}}>
                          <Icon name="plus" size={11} stroke={2.2}/> Concepto
                        </button>
                      </div>
                      {!isCollapsed && (
                        <div>
                          {items.length===0 ? (
                            <div style={{padding:'16px 48px',fontSize:12,color:'var(--ink-3)',fontStyle:'italic'}}>Sin conceptos en esta categoría</div>
                          ) : items.map((c,i)=>(
                            <div key={c.id} style={{display:'grid',gridTemplateColumns:'1fr 120px 80px',gap:14,alignItems:'center',padding:'11px 20px 11px 48px',borderTop:i===0?'none':'1px solid var(--line-1)',opacity:c.activo?1:.55}}>
                              <div style={{fontSize:13.5,fontWeight:500,color:'var(--ink-1)'}}>{c.label}</div>
                              <div><Chip tone={c.activo?'moss':'neutral'}>{c.activo?'Activo':'Inactivo'}</Chip></div>
                              <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                                <button onClick={()=>setModal({tipo:'concepto-editar',data:c})} style={{background:'transparent',border:'none',cursor:'pointer',padding:5,color:'var(--ink-3)',borderRadius:6}}><Icon name="edit" size={13}/></button>
                                <button onClick={()=>borrarConcepto(c)} style={{background:'transparent',border:'none',cursor:'pointer',padding:5,color:'var(--ink-3)',borderRadius:6}}><Icon name="trash" size={13}/></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}

          {!loading && tab==='iva' && (
            <>
              {ivaTasas.length===0 ? (
                <div style={{background:'var(--paper-raised)',border:'1px dashed var(--line-1)',borderRadius:12,padding:'48px 24px',textAlign:'center'}}>
                  <div style={{fontFamily:'var(--serif)',fontSize:20,fontWeight:600,color:'var(--ink-0)',marginBottom:6}}>Aún no hay tasas de IVA</div>
                  <div style={{fontSize:13,color:'var(--ink-2)',marginBottom:18}}>Al capturar gastos podrás desglosar el IVA usando alguna de estas tasas.</div>
                  <Btn variant="clay" size="md" icon="plus" onClick={()=>setModal({tipo:'iva-nueva'})}>Crear primera tasa</Btn>
                </div>
              ) : (
                <>
                  <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden'}}>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 120px 140px 100px 80px',gap:14,padding:'12px 22px',fontSize:10,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--ink-3)',borderBottom:'1px solid var(--line-1)',background:'var(--paper-sunk)'}}>
                      <div>Nombre</div>
                      <div style={{textAlign:'right'}}>Porcentaje</div>
                      <div>Default</div>
                      <div>Tipo</div>
                      <div/>
                    </div>
                    {ivaTasas.map((t,i)=>(
                      <div key={t.id} style={{display:'grid',gridTemplateColumns:'1fr 120px 140px 100px 80px',gap:14,alignItems:'center',padding:'14px 22px',borderTop:i===0?'none':'1px solid var(--line-1)',opacity:t.activo?1:.55}}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <span style={{width:10,height:10,borderRadius:2,background:t.porcentaje===0?'var(--ink-3)':'var(--clay)'}}/>
                          <span style={{fontSize:14,fontWeight:600,color:'var(--ink-0)'}}>{t.label}</span>
                          {!t.activo && <Chip tone="neutral">Inactiva</Chip>}
                        </div>
                        <div style={{textAlign:'right',fontFamily:'var(--serif)',fontSize:18,fontWeight:500,color:'var(--ink-0)'}} className="num">{t.porcentaje}%</div>
                        <div>{t.es_default ? <Chip tone="moss">Default</Chip> : <span style={{fontSize:12,color:'var(--ink-3)'}}>—</span>}</div>
                        <div><Chip tone={t.sistema?'neutral':'moss'}>{t.sistema?'Sistema':'Propia'}</Chip></div>
                        <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                          <button onClick={()=>setModal({tipo:'iva-editar',data:t})} style={{background:'transparent',border:'none',cursor:'pointer',padding:6,color:'var(--ink-3)',borderRadius:6}}><Icon name="edit" size={14}/></button>
                          <button onClick={()=>borrarIva(t)} style={{background:'transparent',border:'none',cursor:t.sistema?'not-allowed':'pointer',padding:6,color:t.sistema?'var(--ink-3)':'var(--clay)',borderRadius:6,opacity:t.sistema?.4:1}} title={t.sistema?'Tasa de sistema — desactívala':'Borrar tasa'}><Icon name="trash" size={14}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:14,padding:'12px 16px',background:'var(--sand-100)',border:'1px solid #ecd49a',borderRadius:8,display:'flex',gap:10,alignItems:'flex-start',fontSize:12,color:'#7a4e10',lineHeight:1.5}}>
                    <Icon name="sparkles" size={14} stroke={1.8} style={{marginTop:2}}/>
                    <div>Al capturar un gasto podrás elegir una tasa o escribir un porcentaje libre. La tasa <strong>por defecto</strong> es la que aparece preseleccionada. Solo puede haber una default a la vez.</div>
                  </div>
                </>
              )}
            </>
          )}

          {!loading && tab==='categorias' && (
            <>
              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 2fr 100px 100px 80px',gap:14,padding:'12px 22px',fontSize:10,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--ink-3)',borderBottom:'1px solid var(--line-1)',background:'var(--paper-sunk)'}}>
                  <div>Categoría</div>
                  <div>Descripción</div>
                  <div style={{textAlign:'center'}}>Conceptos</div>
                  <div>Tipo</div>
                  <div/>
                </div>
                {categorias.map((kat,i)=>{
                  const count = conceptos.filter(c=>c.categoria===kat.id).length;
                  return (
                    <div key={kat.id} style={{display:'grid',gridTemplateColumns:'1fr 2fr 100px 100px 80px',gap:14,alignItems:'center',padding:'14px 22px',borderTop:i===0?'none':'1px solid var(--line-1)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <span style={{width:12,height:12,borderRadius:3,background:CAT_TONE_COLOR[kat.id]||'var(--ink-3)'}}/>
                        <span style={{fontSize:14,fontWeight:600,color:'var(--ink-0)'}}>{kat.label}</span>
                      </div>
                      <div style={{fontSize:12,color:'var(--ink-2)'}}>{kat.descripcion||<span style={{fontStyle:'italic',color:'var(--ink-3)'}}>—</span>}</div>
                      <div style={{textAlign:'center',fontSize:13,fontWeight:600,color:'var(--ink-1)'}} className="num">{count}</div>
                      <div><Chip tone={kat.sistema?'neutral':'moss'}>{kat.sistema?'Sistema':'Propia'}</Chip></div><div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                        <button onClick={()=>setModal({tipo:'cat-editar',data:kat})} style={{background:'transparent',border:'none',cursor:'pointer',padding:6,color:'var(--ink-3)',borderRadius:6}}><Icon name="edit" size={14}/></button>
                        <button onClick={()=>borrarCategoria(kat)} style={{background:'transparent',border:'none',cursor:'pointer',padding:6,color:count>0?'var(--ink-3)':'var(--clay)',borderRadius:6,opacity:count>0?.4:1}} title={count>0?`No se puede borrar: ${count} concepto(s)`:'Borrar categoría'}><Icon name="trash" size={14}/></button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{marginTop:14,padding:'12px 16px',background:'var(--sand-100)',border:'1px solid #ecd49a',borderRadius:8,display:'flex',gap:10,alignItems:'flex-start',fontSize:12,color:'#7a4e10',lineHeight:1.5}}>
                <Icon name="sparkles" size={14} stroke={1.8} style={{marginTop:2}}/>
                <div>Las categorías de <strong>sistema</strong> no se pueden borrar. Para ocultarlas basta con no asignarles conceptos.</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modales */}
      {modal?.tipo==='concepto-nuevo' && (
        <Modal title="Nuevo concepto" onClose={()=>setModal(null)}>
          <FormConcepto categorias={categorias} categoriaId={modal.cat} onCancel={()=>setModal(null)} onSave={()=>{setModal(null);cargar();}}/>
        </Modal>
      )}
      {modal?.tipo==='concepto-editar' && (
        <Modal title={`Editar · ${modal.data.label}`} onClose={()=>setModal(null)}>
          <FormConcepto concepto={modal.data} categorias={categorias} onCancel={()=>setModal(null)} onSave={()=>{setModal(null);cargar();}}/>
        </Modal>
      )}
      {modal?.tipo==='cat-nueva' && (
        <Modal title="Nueva categoría" onClose={()=>setModal(null)}>
          <FormCategoria onCancel={()=>setModal(null)} onSave={()=>{setModal(null);cargar();}}/>
        </Modal>
      )}
      {modal?.tipo==='cat-editar' && (
        <Modal title={`Editar · ${modal.data.label}`} onClose={()=>setModal(null)}>
          <FormCategoria categoria={modal.data} onCancel={()=>setModal(null)} onSave={()=>{setModal(null);cargar();}}/>
        </Modal>
      )}
      {modal?.tipo==='iva-nueva' && (
        <Modal title="Nueva tasa de IVA" onClose={()=>setModal(null)}>
          <FormIvaTasa onCancel={()=>setModal(null)} onSave={()=>{setModal(null);cargar();}}/>
        </Modal>
      )}
      {modal?.tipo==='iva-editar' && (
        <Modal title={`Editar · ${modal.data.label}`} onClose={()=>setModal(null)}>
          <FormIvaTasa tasa={modal.data} onCancel={()=>setModal(null)} onSave={()=>{setModal(null);cargar();}}/>
        </Modal>
      )}
    </div>
  );
};

Object.assign(window, { CatalogoGastos: CatalogoGastosFn, FormConcepto, FormCategoria, FormIvaTasa });
