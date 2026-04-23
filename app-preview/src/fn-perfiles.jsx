// ──────────────────────────────────────────
// Perfiles y permisos — versión funcional
// Solo admin puede ver/gestionar. Crea/edita usuarios vía Edge Function.
// ──────────────────────────────────────────

// Helper: llama a la Edge Function admin-usuarios con el JWT del caller
const invokarAdminUsuarios = async (body) => {
  const {data, error} = await sb.functions.invoke('admin-usuarios', { body });
  if (error) {
    // Supabase envuelve errores HTTP en FunctionsHttpError; extraemos mensaje si existe
    const msg = data?.mensaje || data?.error || error.message || 'Error desconocido';
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.mensaje || data.error);
  return data;
};

const PerfilesPermisosFn = () => {
  const auth = useAuth();
  const esAdmin = auth.rol === 'admin';

  const [lista, setLista]     = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshTick, setRefreshTick] = React.useState(0);
  const refrescar = () => setRefreshTick(t => t + 1);

  // Modales
  const [modalNuevo, setModalNuevo] = React.useState(false);
  const [modalEditar, setModalEditar] = React.useState(null); // perfil o null
  const [modalReset, setModalReset]   = React.useState(null); // perfil o null

  React.useEffect(() => {
    if (!esAdmin) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const {data, error} = await sb.from('perfiles')
        .select('id, username, email, nombre_display, rol, activo, creado')
        .order('creado', {ascending: true});
      if (error) { notify('Error cargando perfiles: ' + error.message, 'err'); setLoading(false); return; }
      setLista(data || []);
      setLoading(false);
    })();
  }, [esAdmin, refreshTick]);

  // Gate: si no es admin, mensaje + volver
  if (!esAdmin) {
    return (
      <div style={{padding:'60px 36px',textAlign:'center'}}>
        <div style={{fontFamily:'var(--serif)',fontSize:22,color:'var(--ink-0)',marginBottom:8}}>Sin acceso</div>
        <div style={{fontSize:13,color:'var(--ink-3)'}}>Solo el administrador puede gestionar perfiles.</div>
      </div>
    );
  }

  const roles = {
    admin:     {label:'Administrador', tone:'#6b5d8a'},
    encargada: {label:'Encargada',     tone:'var(--clay)'},
  };

  return (
    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',fontFamily:'var(--sans)',background:'var(--paper)',color:'var(--ink-1)'}}>
      {/* Header */}
      <div style={{padding:'28px 36px 18px',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16}}>
        <div>
          <div style={{fontSize:11,color:'var(--ink-3)',fontWeight:600,letterSpacing:.5,textTransform:'uppercase',marginBottom:6}}>Configuración</div>
          <div style={{fontFamily:'var(--serif)',fontSize:34,fontWeight:500,letterSpacing:-.8,color:'var(--ink-0)',lineHeight:1}}>Perfiles y permisos</div>
          <div style={{fontSize:13,color:'var(--ink-2)',marginTop:6}}>Usuarios con acceso al sistema. Las encargadas entran con su usuario y contraseña (sin correo).</div>
        </div>
        <Btn variant="clay" size="md" icon="plus" onClick={()=>setModalNuevo(true)}>Nuevo usuario</Btn>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'12px 36px 60px'}}>

        {/* Tabla perfiles */}
        <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden',marginBottom:32}}>
          <div style={{display:'grid',gridTemplateColumns:'44px 1.4fr 1fr 150px 90px 140px',gap:14,padding:'11px 20px',background:'var(--paper-sunk)',borderBottom:'1px solid var(--line-1)'}}>
            {['','Nombre','Usuario','Rol','Estado',''].map((h,i)=>(
              <div key={i} style={{fontSize:10,fontWeight:700,letterSpacing:.6,textTransform:'uppercase',color:'var(--ink-3)'}}>{h}</div>
            ))}
          </div>

          {loading && (
            <div style={{padding:'40px 20px',textAlign:'center',fontSize:13,color:'var(--ink-3)'}}>Cargando…</div>
          )}

          {!loading && lista.length === 0 && (
            <div style={{padding:'40px 20px',textAlign:'center',fontSize:13,color:'var(--ink-3)'}}>
              No hay perfiles todavía.
            </div>
          )}

          {!loading && lista.map((u,i)=>{
            const r = roles[u.rol] || {label:u.rol, tone:'var(--ink-3)'};
            const esYo = auth.perfil?.id === u.id;
            return (
              <div key={u.id} style={{display:'grid',gridTemplateColumns:'44px 1.4fr 1fr 150px 90px 140px',gap:14,alignItems:'center',padding:'12px 20px',borderTop:i===0?'none':'1px solid var(--line-1)',opacity:u.activo?1:.55}}>
                <Av name={u.nombre_display} tone={u.rol==='admin'?'moss':'clay'} size={28}/>
                <div style={{fontSize:14,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {u.nombre_display}
                  {esYo && <span style={{fontSize:10,fontWeight:700,color:'var(--clay)',marginLeft:6,letterSpacing:.4,textTransform:'uppercase'}}>· TÚ</span>}
                </div>
                <div style={{fontSize:12,color:'var(--ink-2)',fontFamily:'var(--mono)'}}>@{u.username}</div>
                <div style={{display:'flex',alignItems:'center',gap:7}}>
                  <div style={{width:7,height:7,borderRadius:999,background:r.tone}}/>
                  <span style={{fontSize:12.5,fontWeight:600,color:'var(--ink-1)'}}>{r.label}</span>
                </div>
                <div><Chip tone={u.activo?'moss':'neutral'}>{u.activo?'Activo':'Inactivo'}</Chip></div>
                <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                  <button title="Editar" onClick={()=>setModalEditar(u)} style={{background:'transparent',border:'1px solid var(--line-1)',cursor:'pointer',padding:'5px 8px',color:'var(--ink-2)',borderRadius:6,fontSize:11}}>
                    <Icon name="edit" size={12}/>
                  </button>
                  <button title="Restablecer contraseña" onClick={()=>setModalReset(u)} style={{background:'transparent',border:'1px solid var(--line-1)',cursor:'pointer',padding:'5px 8px',color:'var(--ink-2)',borderRadius:6,fontSize:11}}>
                    <Icon name="key" size={12}/>
                  </button>
                  <button
                    title={esYo ? 'No puedes eliminarte a ti mismo' : 'Eliminar'}
                    disabled={esYo}
                    onClick={async()=>{
                      if (!confirmar(`¿Eliminar a "${u.nombre_display}" (@${u.username})? Esta acción no se puede deshacer.`)) return;
                      try {
                        await invokarAdminUsuarios({ action:'eliminar', id: u.id });
                        notify('Usuario eliminado');
                        refrescar();
                      } catch(e) { notify('Error: '+e.message, 'err'); }
                    }}
                    style={{background:'transparent',border:'1px solid var(--line-1)',cursor:esYo?'not-allowed':'pointer',padding:'5px 8px',color:esYo?'var(--ink-3)':'#9b3b2a',borderRadius:6,fontSize:11,opacity:esYo?.4:1}}>
                    <Icon name="trash" size={12}/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info de permisos (solo referencia, se edita en código por ahora) */}
        <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,padding:'18px 22px'}}>
          <div style={{fontFamily:'var(--serif)',fontSize:16,color:'var(--ink-0)',marginBottom:6}}>Permisos por rol</div>
          <div style={{fontSize:12.5,color:'var(--ink-3)',lineHeight:1.6}}>
            <strong>Administrador:</strong> acceso total · Dashboard · Objetivos · Fiscal · eliminar/reabrir turnos · gestionar usuarios.<br/>
            <strong>Encargada:</strong> operación diaria · Punto de venta · Gastos · configuración básica. Sin acceso a Dashboard, Objetivos, ni Fiscal.
          </div>
        </div>

      </div>

      {/* Modales */}
      {modalNuevo && <ModalNuevoUsuario onClose={()=>setModalNuevo(false)} onSaved={()=>{setModalNuevo(false); refrescar();}}/>}
      {modalEditar && <ModalEditarUsuario perfil={modalEditar} onClose={()=>setModalEditar(null)} onSaved={()=>{setModalEditar(null); refrescar();}}/>}
      {modalReset && <ModalResetPassword perfil={modalReset} onClose={()=>setModalReset(null)} onSaved={()=>setModalReset(null)}/>}
    </div>
  );
};

// ─── Modal: Nuevo usuario ───────────────────────────────
const ModalNuevoUsuario = ({onClose, onSaved}) => {
  const [username, setUsername] = React.useState('');
  const [nombre, setNombre]     = React.useState('');
  const [rol, setRol]           = React.useState('encargada');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading]   = React.useState(false);
  const [error, setError]       = React.useState('');

  const submit = async (e) => {
    e?.preventDefault?.();
    setError('');
    const u = username.trim().toLowerCase();
    if (!/^[a-z0-9_\.]{3,32}$/.test(u)) return setError('Usuario: 3-32 caracteres, solo letras, números, punto y guion bajo');
    if (!nombre.trim())                 return setError('Falta el nombre');
    if (password.length < 6)            return setError('Contraseña: mínimo 6 caracteres');
    setLoading(true);
    try {
      await invokarAdminUsuarios({ action:'crear', username:u, nombre_display:nombre.trim(), rol, password });
      notify('Usuario creado');
      onSaved();
    } catch(err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <ModalShell title="Nuevo usuario" onClose={onClose}>
      <form onSubmit={submit}>
        <FormField label="Usuario" hint="Solo letras, números, punto y guion bajo · ej: lupita">
          <input type="text" value={username} onChange={e=>setUsername(e.target.value)} autoFocus autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="lupita" style={inputStyle}/>
        </FormField>
        <FormField label="Nombre para mostrar">
          <input type="text" value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Lupita García" style={inputStyle}/>
        </FormField>
        <FormField label="Rol">
          <select value={rol} onChange={e=>setRol(e.target.value)} style={inputStyle}>
            <option value="encargada">Encargada · operación diaria</option>
            <option value="admin">Administrador · acceso total</option>
          </select>
        </FormField>
        <FormField label="Contraseña" hint="Mínimo 6 caracteres · guárdala y compártesela">
          <input type="text" value={password} onChange={e=>setPassword(e.target.value)} placeholder="mínimo 6 caracteres" style={inputStyle}/>
        </FormField>

        {error && <ErrorBox>{error}</ErrorBox>}

        <ModalActions>
          <Btn variant="ghost" onClick={onClose} type="button" disabled={loading}>Cancelar</Btn>
          <Btn variant="clay" type="submit" disabled={loading}>{loading?'Creando…':'Crear usuario'}</Btn>
        </ModalActions>
      </form>
    </ModalShell>
  );
};

// ─── Modal: Editar usuario ──────────────────────────────
const ModalEditarUsuario = ({perfil, onClose, onSaved}) => {
  const [nombre, setNombre] = React.useState(perfil.nombre_display || '');
  const [rol, setRol]       = React.useState(perfil.rol);
  const [activo, setActivo] = React.useState(!!perfil.activo);
  const [loading, setLoading] = React.useState(false);
  const [error, setError]     = React.useState('');

  const submit = async (e) => {
    e?.preventDefault?.();
    setError('');
    if (!nombre.trim()) return setError('Falta el nombre');
    setLoading(true);
    try {
      await invokarAdminUsuarios({ action:'editar', id:perfil.id, nombre_display:nombre.trim(), rol, activo });
      notify('Cambios guardados');
      onSaved();
    } catch(err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <ModalShell title={`Editar @${perfil.username}`} onClose={onClose}>
      <form onSubmit={submit}>
        <FormField label="Usuario">
          <input type="text" value={perfil.username} disabled style={{...inputStyle, opacity:.5, cursor:'not-allowed'}}/>
        </FormField>
        <FormField label="Nombre para mostrar">
          <input type="text" value={nombre} onChange={e=>setNombre(e.target.value)} autoFocus style={inputStyle}/>
        </FormField>
        <FormField label="Rol">
          <select value={rol} onChange={e=>setRol(e.target.value)} style={inputStyle}>
            <option value="encargada">Encargada</option>
            <option value="admin">Administrador</option>
          </select>
        </FormField>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',marginTop:4}}>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:'var(--ink-0)'}}>Activo</div>
            <div style={{fontSize:11.5,color:'var(--ink-3)',marginTop:2}}>Desactivado: no puede iniciar sesión</div>
          </div>
          <TogglePerfil checked={activo} onClick={()=>setActivo(v=>!v)}/>
        </div>

        {error && <ErrorBox>{error}</ErrorBox>}

        <ModalActions>
          <Btn variant="ghost" onClick={onClose} type="button" disabled={loading}>Cancelar</Btn>
          <Btn variant="clay" type="submit" disabled={loading}>{loading?'Guardando…':'Guardar'}</Btn>
        </ModalActions>
      </form>
    </ModalShell>
  );
};

// ─── Modal: Reset password ──────────────────────────────
const ModalResetPassword = ({perfil, onClose, onSaved}) => {
  const [password, setPassword] = React.useState('');
  const [loading, setLoading]   = React.useState(false);
  const [error, setError]       = React.useState('');

  const submit = async (e) => {
    e?.preventDefault?.();
    setError('');
    if (password.length < 6) return setError('Mínimo 6 caracteres');
    setLoading(true);
    try {
      await invokarAdminUsuarios({ action:'reset_password', id:perfil.id, password });
      notify('Contraseña actualizada');
      onSaved();
    } catch(err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <ModalShell title={`Nueva contraseña para @${perfil.username}`} onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{fontSize:12.5,color:'var(--ink-3)',marginBottom:14,lineHeight:1.5}}>
          Esto reemplaza la contraseña actual de <strong>{perfil.nombre_display}</strong>. Anótala y compártesela.
        </div>
        <FormField label="Nueva contraseña">
          <input type="text" value={password} onChange={e=>setPassword(e.target.value)} autoFocus placeholder="mínimo 6 caracteres" style={inputStyle}/>
        </FormField>

        {error && <ErrorBox>{error}</ErrorBox>}

        <ModalActions>
          <Btn variant="ghost" onClick={onClose} type="button" disabled={loading}>Cancelar</Btn>
          <Btn variant="clay" type="submit" disabled={loading}>{loading?'Guardando…':'Cambiar contraseña'}</Btn>
        </ModalActions>
      </form>
    </ModalShell>
  );
};

// ─── Helpers de UI para los modales ─────────────────────
const inputStyle = {
  width:'100%', padding:'11px 14px', fontSize:14,
  border:'1px solid var(--line-1)', borderRadius:8,
  background:'var(--paper)', fontFamily:'inherit', color:'var(--ink-1)', boxSizing:'border-box',
};

const ModalShell = ({title, onClose, children}) => (
  <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(20,16,12,.48)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
    <div onClick={e=>e.stopPropagation()} style={{background:'var(--paper-raised)',borderRadius:14,padding:'24px 26px',width:'100%',maxWidth:460,boxShadow:'0 30px 80px rgba(0,0,0,.2)',fontFamily:'var(--sans)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
        <div style={{fontFamily:'var(--serif)',fontSize:20,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.3}}>{title}</div>
        <button onClick={onClose} style={{background:'transparent',border:'none',cursor:'pointer',padding:4,color:'var(--ink-3)'}}><Icon name="close" size={16}/></button>
      </div>
      {children}
    </div>
  </div>
);

const FormField = ({label, hint, children}) => (
  <div style={{marginBottom:14}}>
    <label style={{display:'block',fontSize:11,fontWeight:600,letterSpacing:.4,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:6}}>{label}</label>
    {children}
    {hint && <div style={{fontSize:11,color:'var(--ink-3)',marginTop:5}}>{hint}</div>}
  </div>
);

const ErrorBox = ({children}) => (
  <div style={{padding:'10px 12px',background:'rgba(183,63,94,.1)',border:'1px solid rgba(183,63,94,.35)',borderRadius:8,fontSize:12.5,color:'#b73f5e',marginBottom:12}}>{children}</div>
);

const ModalActions = ({children}) => (
  <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:18,paddingTop:14,borderTop:'1px solid var(--line-1)'}}>{children}</div>
);

const TogglePerfil = ({checked, onClick}) => (
  <button type="button" onClick={onClick} aria-pressed={checked}
    style={{width:40,height:22,borderRadius:999,background:checked?'var(--moss)':'#d7d1c3',border:'none',padding:2,cursor:'pointer',display:'inline-flex',alignItems:'center',transition:'background .15s'}}>
    <span style={{width:18,height:18,borderRadius:999,background:'#fff',transform:`translateX(${checked?18:0}px)`,transition:'transform .15s',boxShadow:'0 1px 3px rgba(0,0,0,.2)'}}/>
  </button>
);

// Sobreescribir la versión mock
window.PerfilesPermisos = PerfilesPermisosFn;
Object.assign(window, { PerfilesPermisosFn });
