// El informe en directo para Claude: lo que pasa en cada partida, para que Claude lo lea mientras se juega en un aparato
// de verdad: el aparato (las filas de Ajustes › Diagnóstico, util/diag.js), la fluidez de cada pantalla cada 15 s, los
// tirones, los errores, las pérdidas de la imagen y por dónde se ha ido pasando.
//  · En el artefacto de claude.ai, en su base de datos: un documento por partida, en «informes»; solo lo leen quien puede
//    editar el artefacto y Claude (la regla va al publicarlo).
//  · Servido desde Vercel, a la función del proyecto (public/api/informe.js), que lo escribe en sus registros, de donde
//    lo lee Claude: cada vez, solo lo nuevo, para que cada línea sea corta.
// En los demás sitios (GitHub Pages, el archivo único) no hace nada.
import { datos } from './diag.js';

const CADA = 15, MAX_MUESTRAS = 120, MAX_ERRORES = 40, MAX_EVENTOS = 80;
const t0 = performance.now(), seg = () => Math.round((performance.now() - t0) / 100) / 10;
let ref = null, doc = null, escribiendo = false, otra = false, pronto = 0;
const vistos = new Map();

/** Dónde se está: el menú y su pantalla, el pueblo y lo que se hace en él, un partido. */
function lugar() {
  if (window.__futbol) return 'fútbol';
  const g = window.__game;
  // (la pelota, por partes: cargando a los pelotaris, preparando el partido o jugando; así se sabe dónde se corta)
  const pel = g?.pelotaMatch ? (g.pelotaMatch.active === false ? 'pelota preparando' : 'pelota') : g?.pelotaLoading ? 'pelota cargando' : '';
  if (g) return [g.def?.id || g.kind || 'pueblo', pel || (g.sportMode ? 'campeonatos' : g.mode)].filter(Boolean).join(' · ');
  const h = document.getElementById('hub');
  return h && !h.classList.contains('hidden') ? `menú · ${h.dataset.screen || 'home'}` : 'cargando';
}
// lo último que se sabe de esta partida, guardado en el aparato: si el móvil cierra la página de golpe (sin memoria), al
// volver a abrir el juego sale en el informe y en Ajustes › Diagnóstico como «La vez anterior» (util/diag.js)
let cerrado = false;
function rastro(m) {
  if (cerrado) return;
  try { const r = JSON.parse(localStorage.getItem('herrizherri-rastro') || '{}'); localStorage.setItem('herrizherri-rastro', JSON.stringify({ ...(r.id === doc?.empieza ? r : {}), ...m, id: doc?.empieza, cuando: new Date().toISOString(), t: seg(), lugar: m.lugar || lugar() })); } catch (e) { /* sin almacenamiento */ }
}
// (los pasos por las pantallas van con la muestra siguiente; lo que avisa de un fallo, enseguida)
function evento(que, ya) {
  if (!doc) return;
  doc.eventos.push({ t: seg(), que }); if (doc.eventos.length > MAX_EVENTOS) doc.eventos.splice(1, 1);
  if (ya) guarda();
}
function error(msg, pila) {
  msg = String(msg || '').slice(0, 300); if (!msg || !doc) return;
  const e = vistos.get(msg);
  if (e) { e.n++; e.ultimo = seg(); return; }
  if (vistos.size >= MAX_ERRORES) return;
  const donde = String(pila || '').split('\n').map(l => l.trim()).find(l => /\.js/.test(l))?.slice(0, 200) || '';
  const n = { msg, donde, lugar: lugar(), t: seg(), ultimo: seg(), n: 1 };
  vistos.set(msg, n); doc.errores.push(n); guarda();
}
// (una escritura cada vez: si llega algo mientras, se escribe otra al acabar)
async function guarda() {
  if (!ref) return;
  if (escribiendo) { otra = true; return; }
  escribiendo = true;
  try { doc.actualizado = new Date().toISOString(); await ref.set(doc); }
  catch (e) { if (e?.code === 'revoked' || e?.code === 'not_granted' || e?.code === 'quota_exceeded' || e?.code === 'invalid_argument') ref = null; }
  escribiendo = false;
  if (otra) { otra = false; guarda(); }
}

// La fluidez, medida aparte del bucle del juego (también vale para el mapa del inicio, que dibuja por su cuenta):
// imágenes por segundo, la peor de cada tramo y cuántas pasan de 50 ms, que es cuando se nota el tirón
// (con la página oculta no se dibuja: el tramo empieza de nuevo al volver)
let fr = 0, peor = 0, tirones = 0, antes = 0, desde = 0, sitio = '';
const deNuevo = () => { fr = 0; peor = 0; tirones = 0; antes = 0; desde = 0; };
function mide(t) {
  requestAnimationFrame(mide);
  if (document.hidden) return deNuevo();
  if (antes) { const d = t - antes; fr++; if (d > peor) peor = d; if (d > 50) tirones++; }
  antes = t; desde ||= t;
  const ahora = lugar();
  if (ahora !== sitio) { sitio = ahora; evento(ahora); rastro({ lugar: ahora }); }
  if (t - desde < CADA * 1000) return;
  const s = (t - desde) / 1000, rt = window.__rt, info = window.__game && rt?.renderer?.info.render, mem = performance.memory;
  doc.calidad ||= rt?.quality || '';
  doc.muestras.push({ t: seg(), lugar: ahora, fps: Math.round(fr / s * 10) / 10, peor: Math.round(peor), tirones,
    ...(info ? { dibujos: info.calls, triangulos: info.triangles, resolucion: Math.round(rt.pixelRatio * 100) / 100, geometrias: rt.renderer.info.memory.geometries, texturas: rt.renderer.info.memory.textures } : {}),
    ...(mem ? { memoria: Math.round(mem.usedJSHeapSize / 1048576) } : {}) });
  rastro(doc.muestras[doc.muestras.length - 1]);
  if (doc.muestras.length > MAX_MUESTRAS) doc.muestras.shift();
  for (const m of (window.__errors || []).slice(-10)) if (!vistos.has(String(m).slice(0, 300))) error(m);
  fr = 0; peor = 0; tirones = 0; desde = t;
  guarda();
}

// (en Vercel: lo que aún no se ha mandado de las muestras, los errores y los pasos, y el aparato la primera vez; si la
// función no está, se deja de mandar)
const mandados = new WeakSet(), nuevos = (l) => l.filter(x => !mandados.has(x) && mandados.add(x));
const aVercel = (id) => async (d) => {
  const parte = { id, t: seg(), lugar: lugar(), calidad: d.calidad, muestras: nuevos(d.muestras), errores: nuevos(d.errores), eventos: nuevos(d.eventos), ...(mandados.has(d) ? {} : (mandados.add(d), { aparato: d.aparato })) };
  const r = await fetch(DESTINO, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(parte), keepalive: true });
  if (r.status === 404) throw { code: 'revoked' };
};
function empieza(db) {
  const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 6)}`;
  try { ref = db ? db.collection('informes').doc(id) : { set: aVercel(id) }; } catch (e) { return; }
  // (el aparato, como filas {k, v}: la base de datos no guarda listas dentro de listas)
  doc = { empieza: new Date().toISOString(), aparato: datos().map(([k, v]) => ({ k, v })), calidad: '', muestras: [], errores: [], eventos: [] };
  // (y lo que no carga: una imagen, un trozo del juego)
  addEventListener('error', (e) => e.error || e.message ? error(e.error?.message || e.message, e.error?.stack) : e.target?.src && error(`no carga ${e.target.src}`), true);
  addEventListener('unhandledrejection', (e) => error(e.reason?.message || e.reason, e.reason?.stack), true);
  addEventListener('webglcontextlost', (e) => { evento(`imagen perdida (${e.target?.id || e.target?.className || 'lienzo'})`, true); rastro({ perdida: true }); }, true);
  addEventListener('pagehide', () => { rastro({ bien: true }); cerrado = true; });
  addEventListener('pageshow', (e) => { if (e.persisted) { cerrado = false; rastro({ bien: false }); } });
  addEventListener('webglcontextrestored', () => evento('imagen recuperada', true), true);
  addEventListener('visibilitychange', () => { deNuevo(); evento(document.hidden ? 'oculta' : 'vuelve', document.hidden); });
  addEventListener('resize', () => { clearTimeout(pronto); pronto = setTimeout(() => evento(`ventana ${innerWidth} × ${innerHeight}`), 800); });
  guarda();
  requestAnimationFrame(mide);
}
// (si el visor pide permiso para guardar, que lo pida al primer toque y no nada más abrir)
async function arranca() {
  const [db, permiso] = await Promise.all([window.claude.use('db'), window.claude.use('permissions')]);
  if (!db) return;
  const st = permiso ? await permiso.state('db') : 'granted';
  if (st === 'granted') return empieza(db);
  if (st === 'prompt') addEventListener('pointerdown', async () => { const r = await permiso.request(['db']); if (r.db === 'granted') empieza(db); }, { once: true, capture: true });
}
// (en Vercel, a su propia función; en GitHub Pages, que no tiene funciones, a la de Vercel)
const DESTINO = /\.vercel\.app$/i.test(location.hostname) ? '/api/informe' : 'https://herrizherri.vercel.app/api/informe';
if (typeof __AF__ !== 'undefined' && __AF__ && typeof window.claude?.use === 'function') arranca().catch(() => { /* sin informe */ });
else if (/\.vercel\.app$|\.github\.io$/i.test(location.hostname)) empieza(null);
