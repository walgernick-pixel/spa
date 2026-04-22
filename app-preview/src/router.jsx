// ──────────────────────────────────────────
// Router simple con hash (#login, #gastos, #config/cuentas, etc.)
// No requiere build, no requiere servidor. Solo HTML + JS.
// ──────────────────────────────────────────

// Parsea el hash actual a {screen, params}
const parseHash = () => {
  const h = (window.location.hash || '#login').replace(/^#\/?/, '');
  const [path, query] = h.split('?');
  const parts = path.split('/').filter(Boolean);
  return { path: parts.join('/') || 'login', parts };
};

// Hook que re-renderiza cuando cambia el hash
const useRoute = () => {
  const [route, setRoute] = React.useState(parseHash());
  React.useEffect(()=>{
    const onChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
};

// Helper para navegar
const navigate = path => { window.location.hash = '#' + path; };

Object.assign(window, { parseHash, useRoute, navigate });
