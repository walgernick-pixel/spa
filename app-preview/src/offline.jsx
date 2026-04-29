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
//   stores:
//     catalog → {key:tabla, value:rows[], ts}
//     queue   → {id:uuid, ts, op, table, payload, filter, status, error, retries}
const DB_NAME = 'cashflow_offline';
const DB_VERSION = 2;

const _openDB = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, DB_VERSION);
  req.onerror = () => reject(req.error);
  req.onsuccess = () => resolve(req.result);
  req.onupgradeneeded = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains('catalog')) {
      db.createObjectStore('catalog', {keyPath:'key'});
    }
    if (!db.objectStoreNames.contains('queue')) {
      const q = db.createObjectStore('queue', {keyPath:'id'});
      q.createIndex('ts', 'ts');           // ordenar FIFO
      q.createIndex('status', 'status');   // filtrar por estado
    }
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

// ── 4) Banner de estado + badge de capturas pendientes
const _injectBanner = () => {
  if (document.getElementById('offline-banner')) return;
  const el = document.createElement('div');
  el.id = 'offline-banner';
  el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9998;padding:8px 14px;background:#b07228;color:#fff;font:600 12px/1.4 Geist,sans-serif;text-align:center;letter-spacing:.3px;display:none;box-shadow:0 2px 8px rgba(0,0,0,.15);';
  el.innerHTML = '<span id="offline-banner-text">⚡ Sin conexión — capturas se encolarán</span>';
  document.body.appendChild(el);

  // Badge separado: visible aunque haya internet, si hay cola pendiente
  const badge = document.createElement('div');
  badge.id = 'offline-badge';
  badge.style.cssText = 'position:fixed;top:14px;right:14px;z-index:9997;padding:6px 11px;background:#3a5d3a;color:#faf7f1;font:600 11px/1.3 Geist,sans-serif;letter-spacing:.3px;border-radius:999px;display:none;box-shadow:0 4px 12px rgba(0,0,0,.18);cursor:default;';
  badge.title = 'Operaciones encoladas que se sincronizarán al volver internet';
  document.body.appendChild(badge);
};

// Track cuándo nos pusimos offline para alertar tras 30 min con pendientes
let _offlineSinceTs = null;

const _updateBanner = async () => {
  const el = document.getElementById('offline-banner');
  const txt = document.getElementById('offline-banner-text');
  const badge = document.getElementById('offline-badge');
  const online = navigator.onLine;
  let pending = 0;
  try { pending = await getPendingCount(); } catch (_) {}

  // Tracker de tiempo offline
  if (!online && _offlineSinceTs === null) _offlineSinceTs = Date.now();
  if (online) _offlineSinceTs = null;
  const elapsedMin = _offlineSinceTs ? Math.floor((Date.now() - _offlineSinceTs) / 60000) : 0;

  // Banner offline — escala el aviso si llevas >30 min con pendientes
  if (el) {
    el.style.display = online ? 'none' : 'block';
    // Color: amber por defecto, rojo cuando >30 min con pendientes (riesgo de pérdida)
    el.style.background = (!online && elapsedMin >= 30 && pending > 0) ? '#9b3b2a' : '#b07228';
  }
  if (!online && txt) {
    if (elapsedMin >= 30 && pending > 0) {
      txt.textContent = `⚠️ ${elapsedMin} min sin conexión · ${pending} captura${pending===1?'':'s'} pendiente${pending===1?'':'s'}. Conecta cuando puedas.`;
    } else if (pending > 0) {
      txt.textContent = `⚡ Sin conexión — puedes seguir trabajando · ${pending} pendiente${pending===1?'':'s'} se sincronizan al volver.`;
    } else {
      txt.textContent = '⚡ Sin conexión — puedes seguir trabajando. Sincronizamos al volver.';
    }
  }

  // Badge (online con pendientes pendientes = sincronizando)
  if (badge) {
    if (online && pending > 0) {
      badge.style.display = 'block';
      badge.textContent = `⟳ Sincronizando ${pending}`;
      badge.style.background = '#3a5d3a';
    } else {
      badge.style.display = 'none';
    }
  }
};

// Refrescar banner periódicamente para que el aviso de "30 min" aparezca aunque
// no haya cambios en cola (el counter de minutos avanza con el tiempo).
setInterval(() => { if (!navigator.onLine) _updateBanner(); }, 60000);

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

// ──────────────────────────────────────────
// Fase 3 — Cola de escritura + sync engine
// ──────────────────────────────────────────

// UUID v4 — usa crypto.randomUUID si existe (todos los browsers modernos),
// fallback a generación manual.
const genUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
};

// Helpers genéricos sobre el store 'queue'
const _queuePut = async (item) => {
  const db = await _openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('queue', 'readwrite');
    tx.objectStore('queue').put(item);
    tx.oncomplete = () => res(item);
    tx.onerror = () => rej(tx.error);
  });
};

const _queueAll = async () => {
  const db = await _openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('queue', 'readonly');
    const r = tx.objectStore('queue').index('ts').getAll();
    r.onsuccess = () => res(r.result || []);
    r.onerror = () => rej(r.error);
  });
};

const _queueDelete = async (id) => {
  const db = await _openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('queue', 'readwrite');
    tx.objectStore('queue').delete(id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
};

// API pública: encolar una operación
//   op:      'insert' | 'update' | 'delete'
//   table:   nombre de la tabla supabase
//   payload: data para insert/update (objeto)
//   filter:  para update/delete, ej {id: 'uuid'} o {col: val}
const enqueue = async ({op, table, payload = null, filter = null}) => {
  const item = {
    id: genUUID(),
    ts: new Date().toISOString(),
    op, table, payload, filter,
    status: 'pending',
    error: null,
    retries: 0,
  };
  await _queuePut(item);
  console.log('[offline] encolado:', op, table, payload?.id || filter);
  _notifyQueueChange();
  return item;
};

// Buscar un registro encolado por (tabla, id). Útil para que el PV
// pueda mostrar un turno recién abierto offline aunque aún no esté
// en Supabase. Solo busca en operaciones 'insert'.
const findQueuedById = async (table, id) => {
  const all = await _queueAll();
  const m = all.find(x => x.op === 'insert' && x.table === table && x.payload && x.payload.id === id);
  return m ? m.payload : null;
};

// Buscar TODOS los registros encolados de una tabla que cumplan un predicate.
// Útil para mostrar ventas/pagos encolados que aún no están en Supabase.
const findQueuedAll = async (table, predicate) => {
  const all = await _queueAll();
  return all
    .filter(x => x.op === 'insert' && x.table === table && x.payload && predicate(x.payload))
    .map(x => x.payload);
};

// API pública: cuántas operaciones pendientes
const getPendingCount = async () => {
  const all = await _queueAll();
  return all.filter(x => x.status !== 'failed').length;
};

const getPending = async () => {
  return (await _queueAll()).filter(x => x.status !== 'failed');
};

const getFailed = async () => {
  return (await _queueAll()).filter(x => x.status === 'failed');
};

// Sincronizar UNA operación. Retorna true si OK, false si falló.
const _syncOne = async (item) => {
  if (!window.sb) return false;
  try {
    item.status = 'syncing';
    await _queuePut(item);
    let res;
    if (item.op === 'insert') {
      res = await window.sb.from(item.table).insert(item.payload);
    } else if (item.op === 'update') {
      let q = window.sb.from(item.table).update(item.payload);
      Object.entries(item.filter || {}).forEach(([k, v]) => { q = q.eq(k, v); });
      res = await q;
    } else if (item.op === 'delete') {
      let q = window.sb.from(item.table).delete();
      Object.entries(item.filter || {}).forEach(([k, v]) => { q = q.eq(k, v); });
      res = await q;
    } else if (item.op === 'upsert') {
      res = await window.sb.from(item.table).upsert(item.payload, item.options || {});
    } else {
      throw new Error('Op desconocida: ' + item.op);
    }
    if (res.error) {
      // 23505 = duplicate key (Postgres). Consideramos éxito porque el
      // registro ya existe — útil para upserts encolados (p.ej.
      // turno_colaboradoras tiene unique constraint y al insertar 2x
      // el mismo colab en el turno tenemos que tolerarlo).
      if (res.error.code === '23505') {
        await _queueDelete(item.id);
        console.log('[offline] sync OK (ya existía, 23505):', item.op, item.table);
        return true;
      }
      throw res.error;
    }
    await _queueDelete(item.id);
    console.log('[offline] sync OK:', item.op, item.table, item.payload?.id || item.filter);
    return true;
  } catch (e) {
    item.retries = (item.retries || 0) + 1;
    item.error = String(e.message || e);
    item.status = item.retries >= 5 ? 'failed' : 'pending';
    await _queuePut(item);
    console.warn('[offline] sync falló:', item.op, item.table, '·', item.error, '(retry', item.retries+')');
    return false;
  }
};

// Drenar la cola en orden FIFO. Si una falla y aún no llega a 5 retries,
// se queda como 'pending' y la siguiente intenta. Si llega a 'failed',
// se SALTA y seguimos con la próxima (para no bloquear todo por una mala).
let _draining = false;
const drainQueue = async () => {
  if (_draining) return;
  if (!navigator.onLine) return;
  _draining = true;
  try {
    const pending = await getPending();
    if (pending.length === 0) return;
    console.log('[offline] drenando cola:', pending.length, 'operaciones');
    for (const item of pending) {
      // Re-leer por si cambió de estado en otro tick
      const fresh = (await _queueAll()).find(x => x.id === item.id);
      if (!fresh || fresh.status === 'failed') continue;
      await _syncOne(fresh);
    }
    _notifyQueueChange();
    const after = await getPending();
    if (after.length === 0) {
      window.notify && window.notify('Sincronizado', 'ok');
    } else {
      const failed = await getFailed();
      if (failed.length > 0) {
        window.notify && window.notify(`${failed.length} operación(es) con error — revisa la cola`, 'err');
      }
    }
  } finally {
    _draining = false;
  }
};

// Listeners de cambios en la cola (para badges/UI)
const _queueListeners = new Set();
const onQueueChange = (cb) => { _queueListeners.add(cb); return () => _queueListeners.delete(cb); };
const _notifyQueueChange = () => {
  _queueListeners.forEach(cb => { try { cb(); } catch(e) { console.error(e); } });
  _updateBanner();  // refrescar badge/banner cuando cambia la cola
};

// Auto-drain cuando se recupere conexión (además del que ya hace refrescarCatalogos)
window.addEventListener('online', () => {
  setTimeout(drainQueue, 800);
});

// Polling defensivo: cada 30s si hay net y cola pendiente, intenta drenar
setInterval(() => {
  if (navigator.onLine) {
    getPendingCount().then(n => { if (n > 0) drainQueue(); });
  }
}, 30000);

// Detecta cualquier sabor de error de red para hacer fallback a la cola.
// Cubre: TypeError NetworkError, "Failed to fetch", "fetch error",
// supabase wrapper errors, FetchError, AbortError, etc.
const _isNetworkError = (e) => {
  if (!e) return false;
  const m = String(e.message || e.toString() || '');
  if (/network|fetch|failed to fetch|abort|offline|err_internet|connection|cors/i.test(m)) return true;
  if (e.name === 'TypeError' && /fetch/i.test(m)) return true;
  return false;
};

// Helper "smart insert": si hay net, hace insert directo. Si no, encola.
// Siempre asegura que payload.id exista (UUID cliente) para que las FK
// referenciadas por inserts posteriores en la misma cola sean estables.
const sbInsert = async (table, payload, options = {}) => {
  if (!payload.id) payload.id = genUUID();
  if (!navigator.onLine || !window.sb) {
    await enqueue({op: 'insert', table, payload});
    return { data: payload, error: null, fromQueue: true };
  }
  try {
    let q = window.sb.from(table).insert(payload);
    if (options.select) q = q.select(options.select);
    if (options.single) q = q.single();
    const res = await q;
    if (res.error) {
      if (_isNetworkError(res.error)) {
        await enqueue({op: 'insert', table, payload});
        return { data: payload, error: null, fromQueue: true };
      }
      return res;
    }
    return res;
  } catch (e) {
    if (_isNetworkError(e)) {
      await enqueue({op: 'insert', table, payload});
      return { data: payload, error: null, fromQueue: true };
    }
    // Otros errores (validation, sintaxis...) los devolvemos para que el caller decida
    return { data: null, error: e, fromQueue: false };
  }
};

// Update offline-aware
const sbUpdate = async (table, payload, filter) => {
  if (!navigator.onLine || !window.sb) {
    await enqueue({op: 'update', table, payload, filter});
    return { data: null, error: null, fromQueue: true };
  }
  try {
    let q = window.sb.from(table).update(payload);
    Object.entries(filter || {}).forEach(([k, v]) => { q = q.eq(k, v); });
    const res = await q;
    if (res.error && _isNetworkError(res.error)) {
      await enqueue({op: 'update', table, payload, filter});
      return { data: null, error: null, fromQueue: true };
    }
    return res;
  } catch (e) {
    if (_isNetworkError(e)) {
      await enqueue({op: 'update', table, payload, filter});
      return { data: null, error: null, fromQueue: true };
    }
    return { data: null, error: e, fromQueue: false };
  }
};

// Delete offline-aware
const sbDelete = async (table, filter) => {
  if (!navigator.onLine || !window.sb) {
    await enqueue({op: 'delete', table, filter});
    return { data: null, error: null, fromQueue: true };
  }
  try {
    let q = window.sb.from(table).delete();
    Object.entries(filter || {}).forEach(([k, v]) => { q = q.eq(k, v); });
    const res = await q;
    if (res.error && _isNetworkError(res.error)) {
      await enqueue({op: 'delete', table, filter});
      return { data: null, error: null, fromQueue: true };
    }
    return res;
  } catch (e) {
    if (_isNetworkError(e)) {
      await enqueue({op: 'delete', table, filter});
      return { data: null, error: null, fromQueue: true };
    }
    return { data: null, error: e, fromQueue: false };
  }
};

// Upsert offline-aware. Encola con op:'upsert' y options (onConflict, ignoreDuplicates).
const sbUpsert = async (table, payload, options = {}) => {
  // Si payload es array, asegura ids; si es objeto, también
  const ensureIds = (p) => {
    if (!p.id) p.id = genUUID();
    return p;
  };
  if (Array.isArray(payload)) payload = payload.map(ensureIds);
  else payload = ensureIds(payload);

  if (!navigator.onLine || !window.sb) {
    await enqueue({op: 'upsert', table, payload, options});
    return { data: payload, error: null, fromQueue: true };
  }
  try {
    let q = window.sb.from(table).upsert(payload, options);
    if (options.select) q = q.select(options.select);
    const res = await q;
    if (res.error && _isNetworkError(res.error)) {
      await enqueue({op: 'upsert', table, payload, options});
      return { data: payload, error: null, fromQueue: true };
    }
    return res;
  } catch (e) {
    if (_isNetworkError(e)) {
      await enqueue({op: 'upsert', table, payload, options});
      return { data: payload, error: null, fromQueue: true };
    }
    return { data: null, error: e, fromQueue: false };
  }
};

// ──────────────────────────────────────────
// Snapshot de turno actual — cache para reabrir offline
// ──────────────────────────────────────────
// Cuando estás online y entras al PV/Arqueo de un turno, guardamos
// {turno, ventas, ventaPagos, turnoColabs, arqueos, ts} en IndexedDB
// bajo la key `turno-snap:<id>`. Al reabrir offline (sin red), se lee
// del snapshot + se mezclan las ventas encoladas para que el flujo de
// captura/firma/pago/arqueo siga funcionando hasta que vuelva la red.

// Merge con snapshot existente: cada pantalla escribe su slice (PV escribe
// ventas/pagos/colabs, Arqueo escribe lo mismo + arqueos). Last-writer-wins
// por clave, así PV no borra los arqueos que Arqueo guardó antes.
const snapshotTurno = async (turnoId, data) => {
  const existing = (await leerSnapshotTurno(turnoId)) || {};
  await idbPut('catalog', `turno-snap:${turnoId}`, {...existing, ...data, ts: Date.now()});
};

const leerSnapshotTurno = async (turnoId) => {
  return await idbGet('catalog', `turno-snap:${turnoId}`);
};

// Reintenta la cola al cargar, una vez los catálogos estén refrescados
setTimeout(() => { drainQueue(); }, 3000);

// Exponer todo en window
Object.assign(window, {
  leerCatalogo, consultarCatalogo, refrescarCatalogos,
  // Queue + sync
  enqueue, drainQueue, getPendingCount, getPending, getFailed,
  findQueuedById, findQueuedAll, onQueueChange,
  sbInsert, sbUpdate, sbDelete, sbUpsert, genUUID,
  // Snapshot de turno
  snapshotTurno, leerSnapshotTurno,
});
