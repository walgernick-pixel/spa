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

// ──────────────────────────────────────────
// Cache offline de credenciales (PBKDF2 + IndexedDB)
// ──────────────────────────────────────────
// Permite a la encargada iniciar sesión sin internet si ya entró antes
// online (mismo dispositivo). Almacena hash PBKDF2-SHA256 de la
// contraseña + perfil + rolData. Hash expira a los 14 días desde el
// último login online exitoso (re-cachea cada vez).

const _cryptoOK = typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined';
const AUTH_CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 días

const _pbkdf2 = async (password, salt, iterations = 100000) => {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {name: 'PBKDF2', salt, iterations, hash: 'SHA-256'},
    baseKey,
    256
  );
  return new Uint8Array(bits);
};

const _arraysEqual = (a, b) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
};

const cacheAuthOffline = async (username, password, perfil, rolData) => {
  if (!_cryptoOK || typeof window.idbPut !== 'function') return;
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await _pbkdf2(password, salt);
    await window.idbPut('catalog', `auth:${username.toLowerCase()}`, {
      username: username.toLowerCase(),
      perfil, rolData,
      salt: Array.from(salt),
      hash: Array.from(hash),
      cachedAt: Date.now(),
    });
  } catch (e) { console.warn('[auth] cache offline falló:', e); }
};

// Verifica credenciales contra cache local. Devuelve {perfil, rolData} si OK.
const verifyOfflineAuth = async (username, password) => {
  if (!_cryptoOK || typeof window.idbGet !== 'function') return null;
  try {
    const cached = await window.idbGet('catalog', `auth:${username.toLowerCase()}`);
    if (!cached) return null;
    if (Date.now() - cached.cachedAt > AUTH_CACHE_TTL_MS) return null; // expirado
    const hash = await _pbkdf2(password, new Uint8Array(cached.salt));
    if (!_arraysEqual(hash, new Uint8Array(cached.hash))) return null;
    return {perfil: cached.perfil, rolData: cached.rolData};
  } catch (e) { console.warn('[auth] verify offline falló:', e); return null; }
};

// Login con fallback offline: intenta server primero, cae al cache si
// no hay red o si el server no responde por net error. Si el server
// dice "credenciales inválidas", NO intenta offline (la contraseña
// realmente está mal).
const loginWithFallback = async (usuario, password) => {
  // 1) Intentar online
  if (navigator.onLine) {
    try {
      const email = usernameToEmail(usuario);
      const {data, error} = await sb.auth.signInWithPassword({email, password});
      if (!error && data?.user) {
        // Cargar perfil + rol y cachear para próxima sesión offline
        const {data: perfil} = await sb.from('perfiles').select('*').eq('id', data.user.id).maybeSingle();
        let rolData = null;
        if (perfil?.rol) {
          const {data: rol} = await sb.from('roles').select('clave, nombre, descripcion, protegido, permisos').eq('clave', perfil.rol).maybeSingle();
          rolData = rol || null;
        }
        await cacheAuthOffline(usuario, password, perfil, rolData);
        return {ok: true, online: true};
      }
      if (error && /invalid login credentials/i.test(error.message || '')) {
        return {ok: false, error: 'Usuario o contraseña incorrectos'};
      }
      // Cualquier otro error (red, server) → caer a offline
    } catch (_) { /* network — caer a offline */ }
  }

  // 2) Fallback al cache offline
  const cached = await verifyOfflineAuth(usuario, password);
  if (cached) {
    window.__auth.session = null; // no hay session real, sólo perfil offline
    window.__auth.perfil  = cached.perfil;
    window.__auth.rolData = cached.rolData;
    window.__auth.offline = true; // bandera para UI
    window.__auth.loading = false;
    notifyAuthListeners();
    return {ok: true, online: false};
  }

  return {
    ok: false,
    error: navigator.onLine
      ? 'Usuario o contraseña incorrectos'
      : 'Sin conexión y este usuario no tiene credenciales guardadas en este dispositivo. Conéctate al menos una vez para habilitar login offline.',
  };
};

// Logout con confirmación. Warning explícito si offline para evitar
// que la encargada se quede afuera por accidente.
const logout = async () => {
  const offline = !navigator.onLine || !!window.__auth?.offline;
  const msg = offline
    ? '⚠️ Estás SIN CONEXIÓN.\n\nSi cierras sesión NO podrás reentrar offline hasta que vuelva internet (a menos que tengas tus credenciales bien recordadas y este dispositivo las tenga cacheadas).\n\n¿Confirmar?'
    : '¿Cerrar sesión?';
  if (!window.confirm(msg)) return;
  try { await sb.auth.signOut(); } catch (_) {}
  window.__auth.session = null;
  window.__auth.perfil = null;
  window.__auth.rolData = null;
  window.__auth.offline = false;
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
    const result = await loginWithFallback(usuario, password);
    setLoading(false);
    if (!result.ok) return setError(result.error);
    notify(result.online ? 'Sesión iniciada' : 'Sesión iniciada (offline · datos locales)');
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
              autoCapitalize="off" autoCorrect="off" spellCheck={false}
              style={{width:'100%',padding:'11px 14px',fontSize:14,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper)',fontFamily:'inherit',color:'var(--ink-1)',boxSizing:'border-box'}}
            />
          </div>
          <div style={{marginBottom:18}}>
            <label style={{display:'block',fontSize:11,fontWeight:600,letterSpacing:.4,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:6}}>Contraseña</label>
            <input
              type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"
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

Object.assign(window, {
  Login: LoginFn, useAuth, initAuth, canReal, logout,
  DOMINIO_INTERNO, usernameToEmail,
  // Offline auth helpers
  cacheAuthOffline, verifyOfflineAuth, loginWithFallback,
});
