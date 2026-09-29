// Caché persistente de imágenes generadas (iconos 3D y fotos de comarcas) en IndexedDB.
// Se lee entera al arrancar (una sola operación asíncrona) y se escribe en segundo plano.
// Cambia VERSION cuando cambien los modelos, para regenerar las imágenes.
const VERSION = 'v8';
const DB = 'mendimendiz-img', ST = 'img';
const mem = new Map();
let db = null;
function open() {
  return new Promise((res) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(ST);
      r.onsuccess = () => res(r.result); r.onerror = () => res(null);
    } catch (e) { res(null); }
  });
}
export async function loadStore() {
  db = await open(); if (!db) return;
  await new Promise((res) => {
    try {
      const tx = db.transaction(ST, 'readonly'), s = tx.objectStore(ST), req = s.openCursor();
      req.onsuccess = () => { const c = req.result; if (!c) return res(); if (String(c.key).startsWith(VERSION + ':')) mem.set(String(c.key).slice(VERSION.length + 1), c.value); c.continue(); };
      req.onerror = () => res();
    } catch (e) { res(); }
  });
}
export const getImg = (k) => mem.get(k);
export function putImg(k, v) {
  mem.set(k, v);
  if (!db || !v) return;
  try { db.transaction(ST, 'readwrite').objectStore(ST).put(v, VERSION + ':' + k); } catch (e) { }
}

// Cola de trabajo en segundo plano: una tarea por hueco libre, sin congelar la pantalla
const queue = [], queued = new Set();
let running = false, mode = 'all';
// 'all': todo · 'light': sólo iconos y retratos (jugando: nada de fotos pesadas) · 'off': en pausa (cargando un pueblo)
export function queueMode(m) { mode = m; if (m !== 'off' && queue.length && !running) { running = true; idle(pump); } }
const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 300 }) : setTimeout(fn, 16));
export function enqueue(key, fn, front = false) {
  if (queued.has(key)) {
    // ya estaba en cola: si ahora corre prisa, se adelanta
    if (front) { const i = queue.findIndex(j => j.key === key); if (i > 0) queue.unshift(queue.splice(i, 1)[0]); }
    return;
  }
  queued.add(key);
  front ? queue.unshift({ key, fn }) : queue.push({ key, fn });
  if (!running) { running = true; idle(pump); }
}
function pump() {
  if (mode === 'off') { running = false; return; }
  const i = mode === 'light' ? queue.findIndex(j => !j.key.startsWith('d:')) : 0;
  const job = i >= 0 ? queue.splice(i, 1)[0] : null;
  if (!job) { running = false; return; }
  try { job.fn(); } catch (e) { console.warn('tarea', job.key, e); }
  queued.delete(job.key);
  setTimeout(() => idle(pump), 0);
}
