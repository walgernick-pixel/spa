// ──────────────────────────────────────────
// Perfiles y permisos — versión funcional
// Solo admin puede ver/gestionar. Roles dinámicos desde DB (tabla `roles`).
// ──────────────────────────────────────────

// Catálogo de permisos agrupados por módulo.
// Estos son los permisos que el código reconoce (deben existir en el código).
// Los toggles por rol se guardan en roles.permisos (JSONB) en la DB.
const CATALOGO_PERMISOS = [
  { id:'pv_turnos', label:'Punto de venta y turnos', permisos: [
    {id:'pv_abrir_turno',        label:'Abrir nuevo turno'},
    {id:'pv_cerrar_turno',       label:'Cerrar turno activo'},
    {id:'pv_registrar_venta',    label:'Registrar servicios vendidos'},
    {id:'pv_firmar_cobro',       label:'Firmar digitalmente el cobro'},
    {id:'pv_pagar_comis',        label:'Marcar comisión de terapeuta como pagada'},
    {id:'turnos_ver_cerrados',   label:'Ver historial de turnos cerrados'},
    {id:'turnos_reabrir',        label:'Reabrir un turno cerrado'},
    {id:'turnos_editar_cerrado', label:'Editar turno cerrado'},
    {id:'turnos_eliminar',       label:'Eliminar turno completo'},
    {id:'arqueo_eliminar',       label:'Eliminar arqueo individual'},
  ]},
  { id:'gastos', label:'Gastos', permisos: [
    {id:'gastos_ver',            label:'Ver listado de gastos'},
    {id:'gastos_crear',          label:'Capturar nuevos gastos'},
    {id:'gastos_editar',         label:'Modificar gastos existentes'},
    {id:'gastos_eliminar',       label:'Borrar gastos'},
    {id:'gastos_marcar_pagado',  label:'Marcar gasto como pagado'},
    {id:'gastos_exportar',       label:'Exportar gastos (Excel / PDF)'},
  ]},
  { id:'dashboard', label:'Dashboard', permisos: [
    {id:'dashboard_ver',           label:'Acceso al dashboard'},
    {id:'dashboard_ver_fiscal',    label:'Ver sección fiscal (ISR / IVA)'},
    {id:'dashboard_ver_utilidad',  label:'Ver utilidad neta y rentabilidad'},
    {id:'dashboard_ver_rankings',  label:'Ver rankings y comparativas'},
    {id:'dashboard_exportar',      label:'Exportar reportes del dashboard'},
  ]},
  { id:'objetivos', label:'Objetivos', permisos: [
    {id:'objetivos_ver',      label:'Ver objetivos'},
    {id:'objetivos_crear',    label:'Crear objetivos'},
    {id:'objetivos_editar',   label:'Editar objetivos'},
    {id:'objetivos_eliminar', label:'Eliminar objetivos'},
  ]},
  { id:'fiscal', label:'Fiscal', permisos: [
    {id:'fiscal_ver_config',    label:'Ver configuración fiscal'},
    {id:'fiscal_editar_config', label:'Modificar configuración fiscal (RFC, régimen, etc.)'},
  ]},
  { id:'config', label:'Configuración operativa', permisos: [
    {id:'config_cuentas_ver',       label:'Ver cuentas y monedas'},
    {id:'config_cuentas_editar',    label:'Editar cuentas y monedas'},
    {id:'config_catalogo_ver',      label:'Ver catálogo de gastos'},
    {id:'config_catalogo_editar',   label:'Editar catálogo de gastos'},
    {id:'config_servicios_ver',     label:'Ver servicios y comisiones'},
    {id:'config_servicios_editar',  label:'Editar servicios y comisiones'},
    {id:'config_colab_ver',         label:'Ver colaboradoras'},
    {id:'config_colab_editar',      label:'Editar colaboradoras'},
  ]},
  { id:'usuarios', label:'Usuarios y roles', permisos: [
    {id:'usuarios_ver',       label:'Ver lista de usuarios'},
    {id:'usuarios_gestionar', label:'Crear / editar / resetear / eliminar usuarios'},
    {id:'roles_gestionar',    label:'Crear / editar roles y asignar permisos'},
  ]},
];

const CLAVES_PERMISOS = CATALOGO_PERMISOS.flatMap(g => g.permisos.map(p => p.id));
const totalPermisos = CLAVES_PERMISOS.length;

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
  const [roles, setRoles]     = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshTick, setRefreshTick] = React.useState(0);
  const refrescar = () => setRefreshTick(t => t + 1);

  // Modales
  const [modalNuevo, setModalNuevo] = React.useState(false);
  const [modalEditar, setModalEditar] = React.useState(null); // perfil o null
  const [modalReset, setModalReset]   = React.useState(null); // perfil o null
  const [modalNuevoRol, setModalNuevoRol] = React.useState(false);

  // Rol abierto en acordeón
  const [rolAbierto, setRolAbierto] = React.useState(null);

  // Pestaña activa: 'usuarios' | 'roles'
  const [tab, setTab] = React.useState('usuarios');

  React.useEffect(() => {
    if (!esAdmin) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const [perf, rls] = await Promise.all([
        sb.from('perfiles').select('id, username, email, nombre_display, rol, activo, creado').order('creado', {ascending: true}),
        sb.from('roles').select('clave, nombre, descripcion, protegido, permisos').order('protegido', {ascending:false}).order('clave'),
      ]);
      if (perf.error) notify('Error cargando perfiles: ' + perf.error.message, 'err');
      if (rls.error)  notify('Error cargando roles: '  + rls.error.message,  'err');
      setLista(perf.data || []);
      setRoles(rls.data  || []);
      setLoading(false);
    })();
  }, [esAdmin, refreshTick]);

  const toggleRolAbierto = (clave) => setRolAbierto(prev => prev === clave ? null : clave);

  // Guarda un permiso toggleado en la DB (y refresca local)
  const togglearPermiso = async (rol, permisoId) => {
    if (rol.protegido) return; // admin no se toca
    const nuevo = { ...rol.permisos, [permisoId]: !rol.permisos?.[permisoId] };
    const {error} = await sb.from('roles').update({permisos: nuevo}).eq('clave', rol.clave);
    if (error) { notify('Error: ' + error.message, 'err'); return; }
    // Optimistic local update
    setRoles(prev => prev.map(r => r.clave === rol.clave ? {...r, permisos: nuevo} : r));
  };

  const eliminarRol = async (rol) => {
    if (rol.protegido) return;
    const usados = lista.filter(u => u.rol === rol.clave).length;
    if (usados > 0) {
      notify(`No se puede borrar: ${usados} usuario(s) lo tienen asignado`, 'err');
      return;
    }
    if (!confirmar(`¿Eliminar el rol "${rol.nombre}"?`)) return;
    const {error} = await sb.from('roles').delete().eq('clave', rol.clave);
    if (error) { notify('Error: ' + error.message, 'err'); return; }
    notify('Rol eliminado');
    refrescar();
  };

  // Gate: si no es admin, mensaje + volver
  if (!esAdmin) {
    return (
      <div style={{padding:'60px 36px',textAlign:'center'}}>
        <div style={{fontFamily:'var(--serif)',fontSize:22,color:'var(--ink-0)',marginBottom:8}}>Sin acceso</div>
        <div style={{fontSize:13,color:'var(--ink-3)'}}>Solo el administrador puede gestionar perfiles.</div>
      </div>
    );
  }

  // Lookup visual por clave de rol (cae a default si no está)
  const rolesById = Object.fromEntries(roles.map(r => [r.clave, r]));
  const rolTone = (clave) => clave === 'admin' ? '#6b5d8a' : 'var(--clay)';

  return (
    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',fontFamily:'var(--sans)',background:'var(--paper)',color:'var(--ink-1)'}}>
      {/* Header */}
      <div style={{padding:'28px 36px 18px',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16}}>
        <div>
          <div style={{fontSize:11,color:'var(--ink-3)',fontWeight:600,letterSpacing:.5,textTransform:'uppercase',marginBottom:6}}>Configuración</div>
          <div style={{fontFamily:'var(--serif)',fontSize:34,fontWeight:500,letterSpacing:-.8,color:'var(--ink-0)',lineHeight:1}}>Perfiles y permisos</div>
          <div style={{fontSize:13,color:'var(--ink-2)',marginTop:6}}>Usuarios con acceso al sistema. Las encargadas entran con su usuario y contraseña (sin correo).</div>
        </div>
        {tab === 'usuarios'
          ? <Btn variant="clay" size="md" icon="plus" onClick={()=>setModalNuevo(true)}>Nuevo usuario</Btn>
          : <Btn variant="clay" size="md" icon="plus" onClick={()=>setModalNuevoRol(true)}>Nuevo rol</Btn>}
      </div>

      {/* Pestañas */}
      <div style={{padding:'0 36px',borderBottom:'1px solid var(--line-1)',display:'flex',gap:4}}>
        {[
          {id:'usuarios', label:'Usuarios', count: lista.length},
          {id:'roles',    label:'Roles y permisos', count: roles.length},
        ].map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{
              background:'transparent',border:'none',padding:'14px 18px',cursor:'pointer',
              fontFamily:'inherit',fontSize:14,
              fontWeight: tab===t.id ? 700 : 500,
              color: tab===t.id ? 'var(--ink-0)' : 'var(--ink-3)',
              borderBottom: tab===t.id ? '2px solid var(--clay)' : '2px solid transparent',
              marginBottom:-1,letterSpacing:-.1,
            }}>
            {t.label}
            <span style={{fontSize:11,marginLeft:8,fontWeight:600,color:'var(--ink-3)',background:'var(--paper-sunk)',padding:'2px 7px',borderRadius:999}}>{t.count}</span>
          </button>
        ))}
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'24px 36px 60px'}}>

        {/* ═══ Tab Usuarios ═══ */}
        {tab === 'usuarios' && (
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
            const r = rolesById[u.rol];
            const rolLabel = r?.nombre || u.rol;
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
                  <div style={{width:7,height:7,borderRadius:999,background:rolTone(u.rol)}}/>
                  <span style={{fontSize:12.5,fontWeight:600,color:'var(--ink-1)'}}>{rolLabel}</span>
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
        )}

        {/* ═══ Tab Roles y permisos ═══ */}
        {tab === 'roles' && (
        <div>
          <div style={{fontSize:12.5,color:'var(--ink-3)',marginBottom:14,lineHeight:1.5}}>
            Expande un rol para ver y togglear sus permisos. El rol <strong>Administrador</strong> está protegido — siempre tiene todos los permisos.
          </div>

        {roles.map(rol => {
          const abierto = rolAbierto === rol.clave;
          const activos = CLAVES_PERMISOS.reduce((n,k) => n + (rol.permisos?.[k] ? 1 : 0), 0);
          const usados  = lista.filter(u => u.rol === rol.clave).length;
          return (
            <div key={rol.clave} style={{marginBottom:10,background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden'}}>
              {/* Encabezado del rol */}
              <button onClick={()=>toggleRolAbierto(rol.clave)}
                style={{width:'100%',display:'flex',alignItems:'center',gap:14,padding:'14px 22px',background:abierto?'var(--paper-sunk)':'transparent',borderBottom:abierto?'1px solid var(--line-1)':'none',border:'none',cursor:'pointer',textAlign:'left',fontFamily:'inherit',color:'inherit'}}>
                <div style={{width:34,height:34,borderRadius:999,background:rolTone(rol.clave),color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--serif)',fontSize:15,fontWeight:600,flexShrink:0}}>
                  {rol.nombre?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:15,fontWeight:700,color:'var(--ink-0)',letterSpacing:-.2,lineHeight:1.1}}>{rol.nombre}</div>
                  <div style={{fontSize:12,color:'var(--ink-3)',marginTop:3}}>{rol.descripcion || <em>Sin descripción</em>}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:14,fontSize:12,color:'var(--ink-3)'}}>
                  <span><span style={{fontWeight:700,color:'var(--ink-1)'}}>{activos}</span> / {totalPermisos} permisos</span>
                  <span><span style={{fontWeight:700,color:'var(--ink-1)'}}>{usados}</span> usuarios</span>
                  {rol.protegido && <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11}}><Icon name="lock" size={11} stroke={1.8}/> protegido</span>}
                  <Icon name={abierto?'chev-down':'chev-right'} size={15} color="var(--ink-3)" stroke={1.8}/>
                </div>
              </button>

              {abierto && (
                <div>
                  {CATALOGO_PERMISOS.map((g,gi)=>(
                    <div key={g.id}>
                      <div style={{padding:'10px 22px 6px',fontSize:10.5,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--ink-3)',background:'var(--paper)',borderTop:gi===0?'none':'1px solid var(--line-1)'}}>
                        {g.label}
                      </div>
                      {g.permisos.map(p => {
                        const activo = !!rol.permisos?.[p.id];
                        const disabled = rol.protegido;
                        return (
                          <div key={p.id} style={{display:'flex',alignItems:'center',gap:14,padding:'11px 22px',borderTop:'1px solid var(--line-1)',background:'var(--paper-raised)'}}>
                            <div style={{flex:1}}>
                              <div style={{fontSize:13.5,color:'var(--ink-1)',letterSpacing:-.1}}>{p.label}</div>
                              <div style={{fontSize:10.5,color:'var(--ink-3)',fontFamily:'var(--mono)',marginTop:2}}>{p.id}</div>
                            </div>
                            <TogglePerfil checked={activo} disabled={disabled} onClick={()=>togglearPermiso(rol, p.id)}/>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {!rol.protegido && (
                    <div style={{padding:'14px 22px',borderTop:'1px solid var(--line-1)',background:'var(--paper-sunk)',display:'flex',justifyContent:'flex-end'}}>
                      <button onClick={()=>eliminarRol(rol)} style={{background:'transparent',border:'1px solid rgba(183,63,94,.3)',color:'#9b3b2a',padding:'7px 12px',borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'inherit'}}>
                        Eliminar rol
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        </div>
        )}

      </div>

      {/* Modales */}
      {modalNuevo && <ModalNuevoUsuario rolesList={roles} onClose={()=>setModalNuevo(false)} onSaved={()=>{setModalNuevo(false); refrescar();}}/>}
      {modalEditar && <ModalEditarUsuario perfil={modalEditar} rolesList={roles} onClose={()=>setModalEditar(null)} onSaved={()=>{setModalEditar(null); refrescar();}}/>}
      {modalReset && <ModalResetPassword perfil={modalReset} onClose={()=>setModalReset(null)} onSaved={()=>setModalReset(null)}/>}
      {modalNuevoRol && <ModalNuevoRol onClose={()=>setModalNuevoRol(false)} onSaved={()=>{setModalNuevoRol(false); refrescar();}}/>}
    </div>
  );
};

// ─── Modal: Nuevo usuario ───────────────────────────────
const ModalNuevoUsuario = ({rolesList=[], onClose, onSaved}) => {
  const defaultRol = rolesList.find(r => r.clave === 'encargada')?.clave || rolesList[0]?.clave || 'encargada';
  const [username, setUsername] = React.useState('');
  const [nombre, setNombre]     = React.useState('');
  const [rol, setRol]           = React.useState(defaultRol);
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
    if (!rol)                           return setError('Selecciona un rol');
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
            {rolesList.map(r => (
              <option key={r.clave} value={r.clave}>
                {r.nombre}{r.descripcion ? ' · ' + r.descripcion : ''}
              </option>
            ))}
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
const ModalEditarUsuario = ({perfil, rolesList=[], onClose, onSaved}) => {
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
            {rolesList.map(r => (
              <option key={r.clave} value={r.clave}>{r.nombre}</option>
            ))}
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

// ─── Modal: Nuevo rol ───────────────────────────────────
const ModalNuevoRol = ({onClose, onSaved}) => {
  const [clave, setClave]       = React.useState('');
  const [nombre, setNombre]     = React.useState('');
  const [descripcion, setDesc]  = React.useState('');
  const [loading, setLoading]   = React.useState(false);
  const [error, setError]       = React.useState('');

  const submit = async (e) => {
    e?.preventDefault?.();
    setError('');
    const c = clave.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_]{1,23}$/.test(c)) return setError('Clave: 2-24 caracteres, minúsculas, letras/números/guion_bajo, empieza con letra');
    if (!nombre.trim())                    return setError('Falta el nombre');

    // Permisos arrancan todos en false (el admin va y los enciende)
    const permisos = Object.fromEntries(CLAVES_PERMISOS.map(k => [k, false]));

    setLoading(true);
    try {
      const {error} = await sb.from('roles').insert({
        clave: c, nombre: nombre.trim(), descripcion: descripcion.trim() || null,
        protegido: false, permisos,
      });
      if (error) throw error;
      notify('Rol creado');
      onSaved();
    } catch(err) {
      setError(err.message.includes('duplicate') ? 'Ya existe un rol con esa clave' : err.message);
    } finally { setLoading(false); }
  };

  return (
    <ModalShell title="Nuevo rol" onClose={onClose}>
      <form onSubmit={submit}>
        <FormField label="Clave" hint="Identificador corto · ej: gerente, contador · minúsculas, sin espacios">
          <input type="text" value={clave} onChange={e=>setClave(e.target.value)} autoFocus autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="gerente" style={inputStyle}/>
        </FormField>
        <FormField label="Nombre para mostrar">
          <input type="text" value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Gerente" style={inputStyle}/>
        </FormField>
        <FormField label="Descripción" hint="Opcional · explicación corta del rol">
          <input type="text" value={descripcion} onChange={e=>setDesc(e.target.value)} placeholder="Supervisión y reportes, sin manejo de caja" style={inputStyle}/>
        </FormField>

        <div style={{padding:'10px 12px',background:'var(--paper-sunk)',border:'1px solid var(--line-1)',borderRadius:8,fontSize:12,color:'var(--ink-3)',lineHeight:1.5,marginBottom:10}}>
          El rol se crea sin permisos. Después de crearlo, lo expandes en la lista y activas los que necesites.
        </div>

        {error && <ErrorBox>{error}</ErrorBox>}

        <ModalActions>
          <Btn variant="ghost" onClick={onClose} type="button" disabled={loading}>Cancelar</Btn>
          <Btn variant="clay" type="submit" disabled={loading}>{loading?'Creando…':'Crear rol'}</Btn>
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
