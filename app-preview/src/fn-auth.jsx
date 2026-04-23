// ──────────────────────────────────────────
// Autenticación + roles dinámicos
// - Estado global de sesión (window.__auth)
// - Login por usuario (sin email real)
// - Hook useAuth() para componentes
// - Permisos leídos dinámicamente desde tabla `roles` (ver SQL 19)
// ──────────────────────────────────────────

// Fallback para cuando no hay sesión (acceso temporal antes de adopción)
// Cuando ya todos tengan login, esto se puede poner en false por default
const ANON_COMO_ADMIN = true; // TODO: cambiar a false cuando todos los usuarios tengan cuenta

// Dominio interno — las encargadas no tienen correo real. Escriben "lupita"
// y la app traduce a "lupita@xcalacoco.local" antes de llamar a Supabase Auth.
const DOMINIO_INTERNO = 'xcalacoco.local';
const usernameToEmail = (u) => `${String(u||'').trim().toLowerCase()}@${DOMINIO_INTERNO}`;

// ─── Estado global de auth ───
// Se expone en window.__auth = { session, perfil, rolData, loading, listeners: [] }
window.__auth = window.__auth || {
  session: null,
  perfil: null,
  rolData: null,   // { clave, nombre, permisos: {...} } desde tabla roles
  loading: true,
  listeners: [],
};

const notifyAuthListeners = () => {
  (window.__auth.listeners || []).forEach(l => { try { l(); } catch(e) { console.error(e); } });
};

// Inicializa auth al cargar la página (se llama una sola vez)
const initAuth = async () => {
  if (!window.sb) { window.__auth.loading = false; notifyAuthListeners(); return; }

  const cargarPerfil = async (session) => {
    if (!session?.user) {
      window.__auth.session = null;
      window.__auth.perfil = null;
      window.__auth.rolData = null;
      window.__auth.loading = false;
      notifyAuthListeners();
      return;
    }
    // Cargar perfil
    const {data: perfil} = await sb.from('perfiles').select('*').eq('id', session.user.id).maybeSingle();
    // Cargar rol con permisos (join manual)
    let rolData = null;
    if (perfil?.rol) {
      const {data: rol} = await sb.from('roles').select('clave, nombre, descripcion, protegido, permisos').eq('clave', perfil.rol).maybeSingle();
      rolData = rol || null;
    }
    window.__auth.session = session;
    window.__auth.perfil  = perfil || null;
    window.__auth.rolData = rolData;
    window.__auth.loading = false;
    notifyAuthListeners();
  };

  // Sesión inicial
  const {data: {session}} = await sb.auth.getSession();
  await cargarPerfil(session);

  // Cambios de sesión (login/logout)
  sb.auth.onAuthStateChange((_event, session) => {
    cargarPerfil(session);
  });
};

// Hook React
const useAuth = () => {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const l = () => setTick(t => t+1);
    window.__auth.listeners.push(l);
    return () => {
      window.__auth.listeners = window.__auth.listeners.filter(x => x !== l);
    };
  }, []);
  return {
    session: window.__auth.session,
    perfil:  window.__auth.perfil,
    rolData: window.__auth.rolData,
    loading: window.__auth.loading,
    rol:     window.__auth.perfil?.rol || (ANON_COMO_ADMIN ? 'admin' : null),
  };
};

// Función can() real — la que realmente usan los componentes
// Lee permisos desde el rol cargado de la DB. admin siempre true por seguridad.
const canReal = (permiso) => {
  const perfil = window.__auth?.perfil;
  const rolData = window.__auth?.rolData;
  if (perfil) {
    // admin SIEMPRE tiene todo (respaldo defensivo aunque el seed ya lo dice)
    if (perfil.rol === 'admin') return true;
    if (rolData?.permisos && permiso in rolData.permisos) {
      return !!rolData.permisos[permiso];
    }
    return false;
  }
  // No logueado: fallback
  if (ANON_COMO_ADMIN) return true;
  return false;
};
// Sobreescribir el stub de db.jsx con la implementación real
window.can = canReal;

// Logout
const logout = async () => {
  await sb.auth.signOut();
  window.__auth.session = null;
  window.__auth.perfil = null;
  notifyAuthListeners();
  navigate('login');
};

// ─── Login Screen Funcional ───
const LoginFn = () => {
  const [usuario, setUsuario]   = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading]   = React.useState(false);
  const [error, setError]       = React.useState('');

  const submit = async (e) => {
    e?.preventDefault?.();
    setError('');
    if (!usuario.trim() || !password) return setError('Faltan datos');
    setLoading(true);
    const email = usernameToEmail(usuario);
    const {error} = await sb.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message === 'Invalid login credentials' ? 'Usuario o contraseña incorrectos' : error.message);
    notify('Sesión iniciada');
    navigate('turnos');
  };

  return (
    <div style={{width:'100vw',height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--paper)',fontFamily:'var(--sans)'}}>
      <div style={{maxWidth:420,width:'100%',padding:'40px 32px',background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,boxShadow:'0 20px 60px rgba(0,0,0,.06)'}}>
        {/* Logo */}
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:28}}>
          <div style={{width:48,height:48,borderRadius:10,background:'#201c16',display:'flex',alignItems:'center',justifyContent:'center',color:'#faf7f1'}}>
            <Icon name="flower" size={24} color="#faf7f1" stroke={1.5}/>
          </div>
          <div>
            <div style={{fontFamily:'var(--serif)',fontSize:24,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.3,lineHeight:1}}>CashFlow</div>
            <div style={{fontSize:11,color:'var(--ink-3)',letterSpacing:.4,textTransform:'uppercase',marginTop:3}}>Xcalacoco Spa</div>
          </div>
        </div>

        <form onSubmit={submit}>
          <div style={{marginBottom:14}}>
            <label style={{display:'block',fontSize:11,fontWeight:600,letterSpacing:.4,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:6}}>Usuario</label>
            <input
              type="text" autoFocus value={usuario} onChange={e=>setUsuario(e.target.value)} autoComplete="username"
              placeholder="lupita"
              autoCapitalize="off" autoCorrect="off" spellCheck={false}
              style={{width:'100%',padding:'11px 14px',fontSize:14,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper)',fontFamily:'inherit',color:'var(--ink-1)',boxSizing:'border-box'}}
            />
          </div>
          <div style={{marginBottom:18}}>
            <label style={{display:'block',fontSize:11,fontWeight:600,letterSpacing:.4,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:6}}>Contraseña</label>
            <input
              type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"
              placeholder="••••••••"
              style={{width:'100%',padding:'11px 14px',fontSize:14,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper)',fontFamily:'inherit',color:'var(--ink-1)',boxSizing:'border-box'}}
            />
          </div>

          {error && (
            <div style={{padding:'10px 12px',background:'rgba(183,63,94,.1)',border:'1px solid rgba(183,63,94,.35)',borderRadius:8,fontSize:12.5,color:'#b73f5e',marginBottom:14}}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{width:'100%',padding:'12px 16px',background:'var(--clay)',color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:loading?'wait':'pointer',fontFamily:'inherit',letterSpacing:-.1}}>
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>

        <div style={{marginTop:20,padding:'12px 14px',background:'var(--sand-100)',border:'1px solid #ecd49a',borderRadius:8,fontSize:11.5,color:'#7a4e10',lineHeight:1.5}}>
          <strong>¿Primera vez?</strong> Pide al administrador que te dé de alta desde <em>Configuración → Perfiles y permisos</em>.
        </div>
      </div>
    </div>
  );
};

// Inicializar auth al cargar (se ejecuta una vez)
if (typeof initAuth === 'function' && !window.__auth_inited) {
  window.__auth_inited = true;
  initAuth();
}

Object.assign(window, { Login: LoginFn, useAuth, initAuth, canReal, logout, DOMINIO_INTERNO, usernameToEmail });
