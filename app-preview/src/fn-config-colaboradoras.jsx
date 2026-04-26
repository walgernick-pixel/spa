// ──────────────────────────────────────────
// Config · Colaboradoras — VERSIÓN FUNCIONAL conectada a Supabase
// Reemplaza ConfigColab mock al cargarse después.
// ──────────────────────────────────────────

const FormColab = ({colab, onSave, onCancel}) => {
  const [nombre, setNombre]         = React.useState(colab?.nombre || '');
  const [apellidos, setApellidos]   = React.useState(colab?.apellidos || '');
  const [alias, setAlias]           = React.useState(colab?.alias || '');
  const [rfc, setRfc]               = React.useState(colab?.rfc || '');
  const [telefono, setTel]          = React.useState(colab?.telefono || '');
  const [email, setEmail]           = React.useState(colab?.email || '');
  const [especialidad, setEsp]      = React.useState(colab?.especialidad || '');
  const [fechaIngreso, setFecha]    = React.useState(colab?.fecha_ingreso || '');
  const [activo, setActivo]         = React.useState(colab?.activo ?? true);
  const [notas, setNotas]           = React.useState(colab?.notas || '');
  const [saving, setSaving]         = React.useState(false);
  const editando = !!colab;

  const fieldStyle = {width:'100%',padding:'9px 12px',fontSize:13,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontFamily:'inherit',color:'var(--ink-1)',boxSizing:'border-box'};
  const labelStyle = {display:'block',fontSize:11,fontWeight:600,letterSpacing:.4,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:6};

  const guardar = async () => {
    if (!nombre.trim()) return notify('Falta el nombre','err');
    setSaving(true);
    const payload = {
      nombre: nombre.trim(),
      apellidos: apellidos.trim() || null,
      alias: alias.trim() || null,
      rfc: rfc.trim().toUpperCase() || null,
      telefono: telefono.trim() || null,
      email: email.trim() || null,
      especialidad: especialidad.trim() || null,
      fecha_ingreso: fechaIngreso || null,
      notas: notas.trim() || null,
      activo,
    };
    let error;
    if (editando) ({error} = await sb.from('colaboradoras').update(payload).eq('id', colab.id));
    else          ({error} = await sb.from('colaboradoras').insert(payload));
    setSaving(false);
    if (error) return notify('Error: '+error.message, 'err');
    notify(editando ? 'Datos actualizados' : 'Persona agregada');
    onSave();
  };

  return (
    <>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
        <div>
          <label style={labelStyle}>Nombre(s) *</label>
          <input autoFocus value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="María" style={fieldStyle}/>
        </div>
        <div>
          <label style={labelStyle}>Apellidos</label>
          <input value={apellidos} onChange={e=>setApellidos(e.target.value)} placeholder="García López" style={fieldStyle}/>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
        <div>
          <label style={labelStyle}>Alias / Apodo</label>
          <input value={alias} onChange={e=>setAlias(e.target.value)} placeholder="Mary" style={fieldStyle}/>
          <div style={{fontSize:10.5,color:'var(--ink-3)',marginTop:4}}>Cómo aparece en el PV</div>
        </div>
        <div>
          <label style={labelStyle}>RFC</label>
          <input value={rfc} onChange={e=>setRfc(e.target.value.toUpperCase())} placeholder="GATO900101AAA" maxLength={13} style={{...fieldStyle,fontFamily:'var(--mono)',letterSpacing:.5}}/>
        </div>
      </div>
      <div style={{marginBottom:14}}>
        <label style={labelStyle}>Especialidad</label>
        <input value={especialidad} onChange={e=>setEsp(e.target.value)} placeholder="Masaje sueco, facial…" style={fieldStyle}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
        <div>
          <label style={labelStyle}>Teléfono</label>
          <input value={telefono} onChange={e=>setTel(e.target.value)} placeholder="998 123 4567" style={fieldStyle}/>
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="maria@ejemplo.com" style={fieldStyle}/>
        </div>
      </div>
      <div style={{marginBottom:14}}>
        <label style={labelStyle}>Fecha de ingreso</label>
        <input type="date" value={fechaIngreso} onChange={e=>setFecha(e.target.value)} style={{...fieldStyle,maxWidth:200}}/>
      </div>
      <div style={{marginBottom:14}}>
        <label style={labelStyle}>Notas internas</label>
        <textarea value={notas} onChange={e=>setNotas(e.target.value)} rows={2} placeholder="Información adicional" style={{...fieldStyle,resize:'vertical',minHeight:50}}/>
      </div>
      <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
        <input type="checkbox" checked={activo} onChange={e=>setActivo(e.target.checked)}/>
        <span style={{fontSize:13,color:'var(--ink-1)'}}>Activa (aparece en el PV al cobrar)</span>
      </label>
      <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:22,paddingTop:16,borderTop:'1px solid var(--line-1)'}}>
        <Btn variant="ghost" size="md" onClick={onCancel} disabled={saving}>Cancelar</Btn>
        <Btn variant="clay" size="md" icon="check" onClick={guardar} disabled={saving}>{saving?'Guardando…':(editando?'Guardar cambios':'Crear colaborador')}</Btn>
      </div>
    </>
  );
};

const ConfigColabFn = () => {
  const [colabs, setColabs]     = React.useState([]);
  const [loading, setLoading]   = React.useState(true);
  const [filtro, setFiltro]     = React.useState('activa'); // activa | archivada
  const [search, setSearch]     = React.useState('');
  const [modal, setModal]       = React.useState(null);

  const cargar = React.useCallback(async () => {
    setLoading(true);
    const {data, error} = await sb.from('colaboradoras').select('*').order('nombre');
    if (error) notify('Error: '+error.message,'err');
    setColabs(data || []);
    setLoading(false);
  }, []);

  React.useEffect(()=>{ cargar(); }, [cargar]);

  const borrar = async (c) => {
    if (!confirmar(`¿Borrar a "${c.nombre}"?\n\nSi tiene ventas asociadas no se podrá borrar; archívala.`)) return;
    const {error} = await sb.from('colaboradoras').delete().eq('id', c.id);
    if (error) return notify('No se pudo borrar. Tiene ventas asociadas — archívalo en su lugar.','err');
    notify('Persona eliminada');
    cargar();
  };

  const toggleActivo = async (c) => {
    const {error} = await sb.from('colaboradoras').update({activo: !c.activo}).eq('id', c.id);
    if (error) return notify('Error: '+error.message,'err');
    cargar();
  };

  const activas    = colabs.filter(c=>c.activo);
  const archivadas = colabs.filter(c=>!c.activo);

  const filtrados = (filtro==='activa' ? activas : archivadas).filter(c => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (c.nombre||'').toLowerCase().includes(s)
        || (c.apellidos||'').toLowerCase().includes(s)
        || (c.alias||'').toLowerCase().includes(s)
        || (c.especialidad||'').toLowerCase().includes(s)
        || (c.telefono||'').includes(s);
  });

  const fmtFecha = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${meses[d.getMonth()]} ${d.getFullYear()}`;
  };

  // Tone deterministico por nombre (para el avatar)
  const tones = ['clay','moss','sand','blue','ink','rose'];
  const toneFor = (name) => {
    let h = 0;
    for (let i=0;i<name.length;i++) h = (h*31 + name.charCodeAt(i)) >>> 0;
    return tones[h % tones.length];
  };

  return (
    <div style={{width:'100%',height:'100%',display:'flex',fontFamily:'var(--sans)',background:'var(--paper)',color:'var(--ink-1)'}}>
      {!window.__EMBEDDED__ && <Sidebar active="colab"/>}
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        <div style={{padding:'28px 36px 18px',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16}}>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',fontWeight:600,letterSpacing:.5,textTransform:'uppercase',marginBottom:6}}>Configuración</div>
            <div style={{fontFamily:'var(--serif)',fontSize:34,fontWeight:500,letterSpacing:-.8,color:'var(--ink-0)',lineHeight:1}}>Personal</div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:6}}>{activas.length} activos · {archivadas.length} archivados</div>
          </div>
          <Btn variant="clay" size="md" icon="plus" onClick={()=>setModal({tipo:'nueva'})}>Agregar colaborador</Btn>
        </div>

        <div style={{padding:'4px 36px 14px',display:'flex',gap:10,alignItems:'center'}}>
          <div style={{display:'flex',gap:2,padding:2,background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:8}}>
            <button onClick={()=>setFiltro('activa')} style={{padding:'6px 14px',fontSize:12,fontWeight:filtro==='activa'?600:500,border:'none',borderRadius:6,background:filtro==='activa'?'var(--ink-0)':'transparent',color:filtro==='activa'?'#faf7f1':'var(--ink-2)',cursor:'pointer',fontFamily:'inherit'}}>Activos · {activas.length}</button>
            <button onClick={()=>setFiltro('archivada')} style={{padding:'6px 14px',fontSize:12,fontWeight:filtro==='archivada'?600:500,border:'none',borderRadius:6,background:filtro==='archivada'?'var(--ink-0)':'transparent',color:filtro==='archivada'?'#faf7f1':'var(--ink-2)',cursor:'pointer',fontFamily:'inherit'}}>Archivados · {archivadas.length}</button>
          </div>
          <div style={{flex:1,display:'flex',alignItems:'center',gap:8,padding:'7px 12px',border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)'}}>
            <Icon name="search" size={14} color="var(--ink-3)"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar…" style={{flex:1,border:'none',outline:'none',fontSize:13,background:'transparent',fontFamily:'inherit'}}/>
          </div>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'4px 36px 60px'}}>
          {loading && <div style={{textAlign:'center',padding:40,color:'var(--ink-3)',fontSize:13}}>Cargando…</div>}

          {!loading && filtrados.length===0 && (
            <div style={{background:'var(--paper-raised)',border:'1px dashed var(--line-1)',borderRadius:12,padding:'48px 24px',textAlign:'center',marginTop:10}}>
              {colabs.length===0 ? (
                <>
                  <div style={{fontFamily:'var(--serif)',fontSize:20,fontWeight:600,color:'var(--ink-0)',marginBottom:6}}>Aún no hay colaboradores</div>
                  <div style={{fontSize:13,color:'var(--ink-2)',marginBottom:18}}>Da de alta a tu equipo para empezar a registrar ventas en el PV.</div>
                  <Btn variant="clay" size="md" icon="plus" onClick={()=>setModal({tipo:'nueva'})}>Agregar el primero</Btn>
                </>
              ) : (
                <div style={{fontSize:13,color:'var(--ink-2)'}}>No hay coincidencias para los filtros actuales.</div>
              )}
            </div>
          )}

          {!loading && filtrados.length > 0 && (
            <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'1.5fr 1.2fr 130px 100px 90px',gap:16,padding:'10px 20px',borderBottom:'1px solid var(--line-1)',background:'var(--paper-sunk)'}}>
                {['Nombre','Especialidad · contacto','Desde','Estado',''].map(h=>(
                  <div key={h} style={{fontSize:10,fontWeight:700,letterSpacing:.6,textTransform:'uppercase',color:'var(--ink-3)'}}>{h}</div>
                ))}
              </div>
              {filtrados.map((c,i)=>(
                <div key={c.id} style={{display:'grid',gridTemplateColumns:'1.5fr 1.2fr 130px 100px 90px',gap:16,padding:'14px 20px',alignItems:'center',borderTop:i===0?'none':'1px solid var(--line-1)',opacity:c.activo?1:.6}}>
                  <div style={{display:'flex',alignItems:'center',gap:11}}>
                    <Av name={c.alias || c.nombre} tone={toneFor(c.nombre || 'X')} size={34}/>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:'var(--ink-0)'}}>
                        {c.nombre} {c.apellidos || ''}
                        {c.alias && <span style={{fontWeight:400,color:'var(--ink-3)',marginLeft:6}}>· {c.alias}</span>}
                      </div>
                      {c.email && <div style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>{c.email}</div>}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:12,color:'var(--ink-1)',fontWeight:500}}>{c.especialidad || <span style={{color:'var(--ink-3)',fontStyle:'italic'}}>Sin especialidad</span>}</div>
                    {c.telefono && <div className="num mono" style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>{c.telefono}</div>}
                  </div>
                  <div style={{fontSize:12,color:'var(--ink-2)'}}>{fmtFecha(c.fecha_ingreso)}</div>
                  <div>
                    <button onClick={()=>toggleActivo(c)} style={{background:'transparent',border:'none',cursor:'pointer',padding:0}}>
                      <Chip tone={c.activo?'moss':'neutral'}>{c.activo?'Activa':'Archivada'}</Chip>
                    </button>
                  </div>
                  <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                    <button onClick={()=>setModal({tipo:'editar',data:c})} title="Editar" style={{background:'transparent',border:'none',cursor:'pointer',padding:6,color:'var(--ink-3)',borderRadius:6}}><Icon name="edit" size={14}/></button>
                    <button onClick={()=>borrar(c)} title="Borrar" style={{background:'transparent',border:'none',cursor:'pointer',padding:6,color:'var(--ink-3)',borderRadius:6}}><Icon name="trash" size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modal?.tipo==='nueva' && (
        <Modal title="Agregar colaborador" onClose={()=>setModal(null)} wide>
          <FormColab onSave={()=>{setModal(null);cargar();}} onCancel={()=>setModal(null)}/>
        </Modal>
      )}
      {modal?.tipo==='editar' && (
        <Modal title={`Editar · ${modal.data.nombre}`} onClose={()=>setModal(null)} wide>
          <FormColab colab={modal.data} onSave={()=>{setModal(null);cargar();}} onCancel={()=>setModal(null)}/>
        </Modal>
      )}
    </div>
  );
};

Object.assign(window, { ConfigColab: ConfigColabFn, FormColab });
