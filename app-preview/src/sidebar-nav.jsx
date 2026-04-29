// ──────────────────────────────────────────
// Sidebar con navegación real (enlaces al router)
// Reemplaza a sidebar.jsx en las pantallas navegables.
//
// Modo colapsado: el sidebar se reduce a sólo iconos (~60px) para dar
// más espacio en tablets. Toggle manual + auto-colapso si viewport
// < 1100px. Preferencia persiste en localStorage.
// ──────────────────────────────────────────

const SIDEBAR_W_OPEN = 248;
const SIDEBAR_W_COLLAPSED = 60;
const COLLAPSE_BREAKPOINT = 1100;

// Hook: estado del sidebar colapsado, con persistencia + auto-colapso responsivo.
// Reglas:
//  - Si el usuario eligió manualmente, su preferencia gana hasta que cambie.
//  - Si nunca eligió y viewport < 1100px, default colapsado.
//  - Si nunca eligió y viewport >= 1100px, default abierto.
const useSidebarCollapsed = () => {
  const stored = (() => { try { return localStorage.getItem('sidebar-collapsed'); } catch(_) { return null; } })();
  const initial = stored !== null
    ? stored === 'true'
    : (typeof window !== 'undefined' && window.innerWidth < COLLAPSE_BREAKPOINT);
  const [collapsed, setCol] = React.useState(initial);
  const setCollapsed = (v) => {
    setCol(v);
    try { localStorage.setItem('sidebar-collapsed', String(v)); } catch(_) {}
  };
  // Auto-toggle on resize, sólo si el usuario no ha forzado preferencia
  React.useEffect(() => {
    if (stored !== null) return; // user already chose
    const onResize = () => setCol(window.innerWidth < COLLAPSE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [stored]);
  return [collapsed, setCollapsed];
};

const SidebarNav = ({active, collapsed, onToggleCollapsed}) => {
  // Usuario real desde auth (fallback a placeholder si no hay sesión)
  const auth = typeof useAuth === 'function' ? useAuth() : null;
  const perfil = auth?.perfil;
  const rolData = auth?.rolData;
  const user = perfil
    ? { name: perfil.nombre_display || perfil.email || 'Sin nombre',
        role: rolData?.nombre || perfil.rol || '—',
        tone: perfil.rol === 'admin' ? 'moss' : 'clay' }
    : { name: 'Sin sesión', role: '—', tone: 'clay' };
  // Items según permisos (gerencia ve dashboard + objetivos)
  const items=[
    {id:'turnos',    label:'Punto de venta',       icon:'receipt', path:'turnos'},
    {id:'gastos',    label:'Gastos',               icon:'wallet',  path:'gastos'},
    ...(window.can && window.can('dashboard_ver') ? [
      {id:'dash',       label:'Dashboard',         icon:'chart',    path:'dashboard'},
    ] : []),
    ...(window.can && window.can('objetivos_ver') ? [
      {id:'objetivos',  label:'Objetivos',         icon:'sparkles', path:'objetivos'},
    ] : []),
  ];
  const cfg=[
    {id:'cuentas',   label:'Cuentas y monedas',    icon:'coins',    path:'config/cuentas'},
    {id:'conceptos', label:'Catálogo de gastos',   icon:'wallet',   path:'config/catalogo'},
    {id:'servicios', label:'Servicios y comisiones',icon:'sparkles',path:'config/servicios'},
    {id:'colab',     label:'Personal',             icon:'users',    path:'config/colaboradoras'},
    {id:'perm',      label:'Perfiles y permisos',  icon:'shield',   path:'config/perfiles'},
    {id:'respaldo',  label:'Respaldo de datos',    icon:'download', path:'config/respaldo'},
  ];
  const W = collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_OPEN;
  return (
    <aside style={{width:W,height:'100%',background:'var(--paper-raised)',borderRight:'1px solid var(--line-1)',display:'flex',flexDirection:'column',fontFamily:'var(--sans)',flexShrink:0,transition:'width .18s ease'}}>
      {/* Logo + toggle */}
      <div style={{padding: collapsed ? '22px 8px 18px' : '22px 20px 18px',borderBottom:'1px solid var(--line-1)',display:'flex',alignItems:'center',gap:10,position:'relative'}}>
        <div onClick={()=>navigate('turnos')} title="Inicio" style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',flex:1,minWidth:0}}>
          <div style={{width:32,height:32,borderRadius:8,background:'#201c16',display:'flex',alignItems:'center',justifyContent:'center',color:'#faf7f1',flexShrink:0,margin: collapsed ? '0 auto' : 0}}>
            <Icon name="flower" size={18} color="#faf7f1" stroke={1.5}/>
          </div>
          {!collapsed && (
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:'var(--serif)',fontSize:17,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.3,lineHeight:1}}>CashFlow</div>
              <div style={{fontSize:10,color:'var(--ink-3)',fontWeight:500,letterSpacing:.4,textTransform:'uppercase',marginTop:3}}>Xcalacoco Spa</div>
            </div>
          )}
        </div>
        {/* Botón colapsar/expandir */}
        <button
          onClick={(e)=>{ e.stopPropagation(); onToggleCollapsed(); }}
          title={collapsed?'Expandir menú':'Colapsar menú'}
          style={{position:'absolute',right:-12,top:24,width:24,height:24,borderRadius:999,background:'var(--paper-raised)',border:'1px solid var(--line-1)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--ink-2)',padding:0,boxShadow:'0 1px 3px rgba(0,0,0,.06)',zIndex:2}}
        >
          <Icon name={collapsed?'chev-right':'arrow-left'} size={12}/>
        </button>
      </div>

      {/* Nav */}
      <nav style={{flex:1,padding:collapsed?'12px 6px':'12px 8px',overflowY:'auto'}}>
        {items.map(it=>(
          <NavItem key={it.id} {...it} active={active===it.id} collapsed={collapsed} onClick={()=>navigate(it.path)}/>
        ))}
        <div style={{height:1,background:'var(--line-1)',margin: collapsed ? '10px 8px' : '10px 12px'}}/>
        {!collapsed && <div style={{fontSize:10,fontWeight:700,color:'var(--ink-3)',letterSpacing:.8,textTransform:'uppercase',padding:'10px 16px 6px'}}>Configuración</div>}
        {cfg.map(it=>(
          <NavItem key={it.id} {...it} active={active===it.id} indent collapsed={collapsed} onClick={()=>navigate(it.path)}/>
        ))}
      </nav>

      {/* Footer usuario */}
      <div style={{padding: collapsed ? '10px 6px' : '12px',borderTop:'1px solid var(--line-1)',display:'flex',flexDirection: collapsed ? 'column' : 'row',alignItems:'center',gap: collapsed ? 6 : 8}}>
        {!collapsed && <Av name={user.name} tone={user.tone} size={36}/>}
        {!collapsed && (
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,color:'var(--ink-0)',lineHeight:1.1}}>{user.name}</div>
            <div style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>{user.role}</div>
          </div>
        )}
        <button
          onClick={()=>(window.reloadApp || (()=>window.location.reload()))()}
          title="Recargar app"
          style={{background:'transparent',border:'none',cursor:'pointer',width:28,height:28,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--ink-3)'}}
        >
          <Icon name="refresh" size={15}/>
        </button>
        <button
          onClick={()=>{ if (typeof logout === 'function') logout(); else navigate('login'); }}
          title="Cerrar sesión"
          style={{background:'transparent',border:'none',cursor:'pointer',width:28,height:28,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--ink-3)'}}
        >
          <Icon name="logout" size={15}/>
        </button>
      </div>
    </aside>
  );
};

const NavItem = ({label,icon,active,indent,collapsed,onClick})=>(
  <button
    onClick={onClick}
    title={collapsed ? label : undefined}
    style={{width:'100%',display:'flex',alignItems:'center',justifyContent: collapsed ? 'center' : 'flex-start',gap:11,padding: collapsed ? '10px 0' : (indent?'8px 14px 8px 16px':'9px 14px'),fontSize:13,fontWeight:active?600:500,color:active?'var(--ink-0)':'var(--ink-2)',background:active?'var(--paper-sunk)':'transparent',border:'none',borderRadius:8,cursor:'pointer',textAlign:'left',marginBottom:1,fontFamily:'inherit',letterSpacing:-.1}}
  >
    <Icon name={icon} size={collapsed ? 18 : (indent?15:17)} color={active?'var(--clay)':'var(--ink-2)'} stroke={active?1.9:1.6}/>
    {!collapsed && <span style={{flex:1}}>{label}</span>}
  </button>
);

// ── Shell: sidebar + main area (para todas las pantallas post-login)
const AppShell = ({active, children}) => {
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  return (
    <div style={{width:'100%',height:'100vh',display:'flex',fontFamily:'var(--sans)',background:'var(--paper)',color:'var(--ink-1)',overflow:'hidden'}}>
      <SidebarNav active={active} collapsed={collapsed} onToggleCollapsed={()=>setCollapsed(!collapsed)}/>
      <main style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        {children}
      </main>
    </div>
  );
};

// Hacer disponibles globalmente y sobreescribir el Sidebar viejo
// para que las pantallas existentes usen el que navega de verdad.
window.Sidebar = SidebarNav;
Object.assign(window, { SidebarNav, NavItem, AppShell, useSidebarCollapsed });
