// ──────────────────────────────────────────
// Capa offline — Fase 1 + 2
//
// 1) Registro del Service Worker.
// 2) Indicador visual de estado de conexión (banner arriba).
// 3) Cache de catálogos en IndexedDB (colaboradoras, servicios,
//    canales, cuentas, monedas, perfiles) → fn-pv y demás formularios
//    pueden leer aunque no haya internet.
//
// Fase 3 (cola de escritura + sync) en próximo PR.
// ──────────────────────────────────────────

// ── 1) Service Worker
// Babel compila este archivo con delay, así que el evento 'load' del
// window posiblemente ya pasó. Verificamos readyState y registramos
// inmediatamente si el documento ya está cargado.
const _registerSW = () => {
  if (!('serviceWorker' in navigator)) {
    console.warn('[offline] navigator.serviceWorker no disponible');
    return;
  }
  navigator.serviceWorker.register('./sw.js').then(reg => {
    console.log('[offline] SW registrado:', reg.scope);
    if (reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw && nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          nw.postMessage('SKIP_WAITING');
        }
      });
    });
  }).catch(err => console.error('[offline] SW registro falló:', err));
};

if (document.readyState === 'complete') {
  _registerSW();
} else {
  window.addEventListener('load', _registerSW);
}

// ── 2) IndexedDB wrapper minimalista
const DB_NAME = 'cashflow_offline';
const DB_VERSION = 1;
const STORES = ['catalog']; // {key, value, ts}

const _openDB = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, DB_VERSION);
  req.onerror = () => reject(req.error);
  req.onsuccess = () => resolve(req.result);
  req.onupgradeneeded = (e) => {
    const db = e.target.result;
    STORES.forEach(s => { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, {keyPath:'key'}); });
  };
});

const idbPut = async (store, key, value) => {
  const db = await _openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put({key, value, ts: Date.now()});
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
  });
};

const idbGet = async (store, key) => {
  const db = await _openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readonly');
    const r = tx.objectStore(store).get(key);
    r.onsuccess = () => res(r.result?.value ?? null);
    r.onerror = () => rej(r.error);
  });
};

// ── 3) Cache de catálogos
// Tablas + columnas que valen cachear para que la app funcione offline.
// (Solo lectura; los inserts siguen yendo a Supabase con la cola que
//  vendrá en Fase 3.)
// Usamos select('*') para ser robustos ante cambios de schema; los
// catálogos son pequeños (<100 filas típicamente).
const CATALOGOS = [
  {tabla: 'colaboradoras',  where: ['activo', true], order: 'nombre'},
  {tabla: 'servicios',      where: ['activo', true], order: 'orden'},
  {tabla: 'canales_venta',  where: ['activo', true], order: 'orden'},
  {tabla: 'cuentas',        where: ['activo', true], order: 'orden'},
  {tabla: 'monedas'},
  {tabla: 'perfiles',       where: ['activo', true], order: 'nombre_display'},
];

const _runQuery = (c) => {
  let q = window.sb.from(c.tabla).select('*');
  if (c.where) q = q.eq(c.where[0], c.where[1]);
  if (c.order) q = q.order(c.order);
  return q;
};

const refrescarCatalogos = async () => {
  if (!window.sb) return;
  if (!navigator.onLine) return;
  for (const c of CATALOGOS) {
    try {
      const {data, error} = await _runQuery(c);
      if (!error && data) {
        await idbPut('catalog', c.tabla, data);
      } else if (error) {
        console.warn('[offline] refresh catalog falló:', c.tabla, error.message);
      }
    } catch (e) {
      console.warn('[offline] refresh catalog excepción:', c.tabla, e);
    }
  }
  console.log('[offline] catálogos cacheados');
};

// API pública: lee del cache de IndexedDB. Si no hay nada, devuelve [].
const leerCatalogo = async (tabla) => {
  return (await idbGet('catalog', tabla)) || [];
};

// Wrapper "smart": intenta Supabase primero; si falla (offline), cae al cache.
// Devuelve {data, fromCache: bool, error}.
const consultarCatalogo = async (tabla) => {
  if (navigator.onLine && window.sb) {
    const c = CATALOGOS.find(x => x.tabla === tabla);
    if (c) {
      try {
        const {data, error} = await _runQuery(c);
        if (!error && data) {
          idbPut('catalog', tabla, data); // refrescar background
          return {data, fromCache: false, error: null};
        }
      } catch (e) { /* cae al cache */ }
    }
  }
  const cached = await leerCatalogo(tabla);
  return {data: cached, fromCache: true, error: cached.length === 0 ? new Error('Sin datos en cache') : null};
};

// ── 4) Banner de estado de conexión
const _injectBanner = () => {
  if (document.getElementById('offline-banner')) return;
  const el = document.createElement('div');
  el.id = 'offline-banner';
  el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9998;padding:8px 14px;background:#b07228;color:#fff;font:600 12px/1.4 Geist,sans-serif;text-align:center;letter-spacing:.3px;display:none;box-shadow:0 2px 8px rgba(0,0,0,.15);';
  el.textContent = '⚡ Sin conexión — los catálogos están cacheados; las nuevas capturas se encolarán cuando regrese internet.';
  document.body.appendChild(el);
};

const _updateBanner = () => {
  const el = document.getElementById('offline-banner');
  if (el) el.style.display = navigator.onLine ? 'none' : 'block';
};

// Cuando el DOM esté listo, montar banner + listeners
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { _injectBanner(); _updateBanner(); });
} else {
  _injectBanner(); _updateBanner();
}
window.addEventListener('online',  () => { _updateBanner(); refrescarCatalogos(); window.notify && window.notify('Conexión recuperada','ok'); });
window.addEventListener('offline', () => { _updateBanner(); window.notify && window.notify('Sin conexión — modo offline','warn'); });

// Refrescar catálogos al cargar (si hay internet) y cuando se recupere conexión.
// Pequeño delay para no pelearse con el primer render.
setTimeout(() => { refrescarCatalogos(); }, 1500);

// Exponer en window
Object.assign(window, { leerCatalogo, consultarCatalogo, refrescarCatalogos });
