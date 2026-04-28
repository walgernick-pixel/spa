// ──────────────────────────────────────────
// CashFlow Spa · Service Worker
// Estrategia:
//   · Shell + CDNs: cache-first (con revalidación en background).
//   · Supabase API: network-first (datos frescos cuando hay net,
//     fallback a respuesta de error 503 si no — el cliente la atrapa
//     y, en Fase 3, encolará la operación en IndexedDB).
//   · Fonts de Google: stale-while-revalidate.
//
// Versión: bumpear esto en cada deploy fuerza al SW a actualizar
// y limpiar caches viejos.
// ──────────────────────────────────────────

const VERSION    = 'v1.0.0';
const SHELL_CACHE = `cashflow-shell-${VERSION}`;
const CDN_CACHE   = `cashflow-cdn-${VERSION}`;
const RUNTIME     = `cashflow-runtime-${VERSION}`;

// Recursos del shell (resueltos relativos al SW que vive en /app-preview/sw.js)
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './pwa/icon-192.png',
  './pwa/icon-512.png',
  './pwa/favicon.png',
  './pwa/apple-touch-icon.png',
  // Tokens CSS (vive en mockups, ruta relativa)
  '../mockups/src/tokens.css',
  // JSX del rediseño base
  '../mockups/src/primitives.jsx',
  '../mockups/src/sidebar.jsx',
  '../mockups/src/gastos-data.jsx',
  '../src/screen-turnos.jsx',
  '../src/screen-pv.jsx',
  '../src/screen-arqueo.jsx',
  '../src/screen-dash.jsx',
  '../src/screen-config.jsx',
  '../src/screen-recibo.jsx',
  '../mockups/src/screen-gastos-list.jsx',
  '../mockups/src/screen-gastos-form.jsx',
  '../mockups/src/screen-gastos-detalle.jsx',
  '../mockups/src/screen-gastos-editar.jsx',
  '../mockups/src/screen-gastos-resumen.jsx',
  '../mockups/src/screen-config-combined.jsx',
  '../mockups/src/screen-perfiles.jsx',
  // Funcionales
  './src/db.jsx',
  './src/offline.jsx',
  './src/fn-auth.jsx',
  './src/fn-config-cuentas.jsx',
  './src/fn-config-fiscal.jsx',
  './src/fn-config-catalogo.jsx',
  './src/fn-config-servicios.jsx',
  './src/fn-config-colaboradoras.jsx',
  './src/fn-gastos-list.jsx',
  './src/fn-gastos-form.jsx',
  './src/fn-gastos-detalle.jsx',
  './src/fn-gastos-papelera.jsx',
  './src/fn-turnos-list.jsx',
  './src/fn-pv-components.jsx',
  './src/fn-pv.jsx',
  './src/fn-recibo-print.jsx',
  './src/fn-arqueo.jsx',
  './src/fn-dashboard.jsx',
  './src/fn-objetivos-calc.jsx',
  './src/fn-objetivos-form.jsx',
  './src/fn-objetivos.jsx',
  './src/fn-perfiles.jsx',
  './src/fn-respaldo.jsx',
  './src/router.jsx',
  './src/sidebar-nav.jsx',
  './src/pages-wrappers.jsx',
];

// CDNs — se cachean en otra cache para poder versionarlas aparte
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',
  'https://unpkg.com/react@18.3.1/umd/react.development.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone@7.29.0/babel.min.js',
  'https://cdn.jsdelivr.net/npm/signature_pad@4.1.7/dist/signature_pad.umd.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
];

// ── Install: precache shell + CDNs
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    await shell.addAll(SHELL_ASSETS).catch(err => console.warn('[sw] shell precache parcial:', err));
    const cdn = await caches.open(CDN_CACHE);
    // Los CDNs los cargamos con no-cors fallback porque algunos no permiten CORS estricto
    await Promise.all(CDN_ASSETS.map(url =>
      fetch(url, {mode:'cors'}).then(r => cdn.put(url, r)).catch(() => {})
    ));
    self.skipWaiting();
  })());
});

// ── Activate: limpiar caches viejos
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => ![SHELL_CACHE, CDN_CACHE, RUNTIME].includes(k)).map(k => caches.delete(k))
    );
    self.clients.claim();
  })());
});

// ── Fetch: estrategia según destino
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo manejamos GET. Inserts/updates van directo a la red (y la
  // capa offline en JS los encolará si fallan — Fase 3).
  if (req.method !== 'GET') return;

  // Supabase: network-first
  if (url.host.endsWith('.supabase.co') || url.host.endsWith('.supabase.in')) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Google Fonts: stale-while-revalidate
  if (url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(req, RUNTIME));
    return;
  }

  // CDNs conocidos
  if (CDN_ASSETS.some(u => req.url === u || req.url.startsWith(u.split('@')[0]))) {
    event.respondWith(cacheFirst(req, CDN_CACHE));
    return;
  }

  // Shell propio
  event.respondWith(cacheFirst(req, SHELL_CACHE));
});

// ── Estrategias
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) {
    // Revalidar en background (no bloqueante)
    fetch(req).then(r => { if (r.ok) cache.put(req, r); }).catch(() => {});
    return cached;
  }
  try {
    const r = await fetch(req);
    if (r.ok) cache.put(req, r.clone());
    return r;
  } catch (e) {
    // Sin conexión y sin cache → devolvemos error básico
    return new Response('Offline', {status: 503, statusText: 'Offline'});
  }
}

async function networkFirst(req) {
  try {
    return await fetch(req);
  } catch (e) {
    return new Response(JSON.stringify({error: 'offline', message: 'Sin conexión'}), {
      status: 503, statusText: 'Offline',
      headers: {'Content-Type': 'application/json'}
    });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then(r => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => cached);
  return cached || fetchPromise;
}

// ── Mensajes desde la app (e.g. forzar update)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
