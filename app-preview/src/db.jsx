// ──────────────────────────────────────────
// Cliente Supabase compartido — se carga en todas las páginas
// NOTA: este archivo corre como type="text/babel" porque es .jsx,
// pero no necesita JSX — así evitamos orden de carga problemático.
// ──────────────────────────────────────────

const SUPABASE_URL     = 'https://rbvsbuidvjikchiytyna.supabase.co';
const SUPABASE_ANONKEY = 'sb_publishable__4aQCqiirbrfpQSaeQ8udg_hwLXyd21';

// Guardia: si el CDN de supabase no cargó, no creamos cliente (evita crash).
let sb;
if (window.supabase && typeof window.supabase.createClient === 'function') {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANONKEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'cashflow-spa-auth' }
  });
  console.log('[db] Supabase client created');
} else {
  console.error('[db] window.supabase no disponible — cliente NO creado');
  sb = null;
}

// Helper: toast/notificación rápida (pinta arriba-derecha 2.5s)
const notify = (msg, tone = 'ok') => {
  const el = document.createElement('div');
  const bg = tone === 'err' ? '#9b3b2a' : tone === 'warn' ? '#b07228' : '#3a5d3a';
  el.textContent = msg;
  el.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;background:'+bg+';color:#faf7f1;padding:12px 18px;border-radius:8px;font:500 13px/1.4 Geist,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25);max-width:360px;';
  document.body.appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; }, 2200);
  setTimeout(() => el.remove(), 2600);
};

const confirmar = (msg) => window.confirm(msg);

// Helper: fecha local YYYY-MM-DD (evita el bug de toISOString() que da
// UTC y "adelanta" un día cuando la hora local es de tarde/noche en
// timezones al oeste de UTC, p.ej. CDMX UTC-6).
const localDateISO = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
};

// ──────────────────────────────────────────
// Stub de permisos — se conectará al módulo de auth real después.
// Por ahora TODOS los permisos devuelven true. Cuando agreguemos
// auth + roles, esto consultará al usuario logueado y su rol.
//
// Permisos en uso:
//   'ver_dashboard'        → gerencia
//   'reabrir_turno'        → admin
//   'ver_turnos_cerrados'  → admin + encargada-del-turno
//   'editar_turno_cerrado' → admin
//   'eliminar_turno'       → gerencia (+ password ELIMINAR por ahora)
//   'eliminar_arqueo'      → gerencia (+ password ELIMINAR por ahora)
//   'exportar'             → gerencia + admin
// ──────────────────────────────────────────
const can = (_permiso) => true;

// Helper: trae TODAS las filas paginando en bloques de 1000
// (PostgREST corta a 1000 server-side; .limit() del cliente no lo brinca).
// Recibe una factoría que construye un nuevo query cada llamada.
const fetchAll = async (buildQuery) => {
  const PAGE = 1000;
  let all = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await buildQuery().range(from, from + PAGE - 1);
    if (error) return { data: all, error };
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
  }
  return { data: all, error: null };
};

Object.assign(window, { sb, notify, confirmar, can, localDateISO, fetchAll, SUPABASE_URL, SUPABASE_ANONKEY });
