// Imágenes grandes en el archivo único. El archivo único lleva las láminas, las ilustraciones, los iconos, los escudos y
// los pelotaris pequeños (las grandes no caben en sus 30 MB), y en la pantalla de un móvil de densidad 3 o de un
// ordenador se veían borrosos. Con conexión, se pide a la web publicada la lista de sus imágenes grandes (hd.json, que
// escribe la compilación web, con los anchos de cada una) y cada imagen que en pantalla se ve más grande de lo que mide
// se cambia por la de la web del tamaño justo (la más pequeña que basta), en cuanto ha llegado: sin parpadeo y, si no
// llega, se queda la de dentro. Solo las que están a la vista (o a punto de estarlo al deslizar): una lista larga de
// tarjetas no descarga ni guarda en memoria las grandes de todas. Sin conexión, o si la web no contesta, todo sigue con
// las de dentro. En la web (y en el servidor de pruebas) la lista no hace falta: las grandes van en la propia web, y
// las que pesan más de la cuenta (las láminas de 2560, para las portadas a pantalla entera) se piden con este mismo
// mecanismo, solo cuando la pantalla las necesita (hdTable con la tabla de las grandes).
// (Solo se descargan la lista y las imágenes que se ven: no se manda nada del jugador.)
// (GitHub Pages publica la carpeta docs en la raíz del sitio: con /docs/ detrás, todo daba 404 y nunca subía nada)
const SITE = 'https://jonathanvilches.github.io/MENDIZMENDI-/';
const TABLES = [];          // [grupo de la lista, { id: url pequeña }]
const REV = new Map();      // url pequeña → [{ w, u }] (de menor a mayor)
let MAP = null, FRESH = false;

/** Cada módulo de imágenes da su tabla (id → url pequeña) con el grupo de su carpeta en la lista de la web; big y w, si
 * la web lleva además una copia más grande de cada una (id → url, de w píxeles de ancho) que solo se pide cuando hace falta. */
export function hdTable(group, table, big = null, w = 0) {
  if (__WEB__ || import.meta.env.DEV) { if (big) for (const [id, u] of Object.entries(table)) { const b = big[id]; if (b && b !== u) addBig(u, w, b); } return; }
  TABLES.push([group, table]); if (MAP) fill(group, table);
}
// (una pequeña puede tener varias grandes, de menor a mayor: la copia de 640 de una lámina sube a la de 1280 o a la de 2560)
const addBig = (u, w, b) => { const L = REV.get(u) || []; if (!L.some(x => x.u === b)) { L.push({ w, u: b }); L.sort((a, b) => a.w - b.w); REV.set(u, L); } };
/** En el archivo único con conexión: la dirección en la web de una imagen que no va dentro (grupo e id de la lista),
 *  en cuanto ha llegado la lista; si no, null (los escudos de las casas y de los oficios). */
export const hdUrl = (group, id) => { const e = MAP?.[group + '/' + id]; return Array.isArray(e) && e.length && typeof e[0]?.[1] === 'string' ? SITE + e[0][1] : null; };
function fill(group, table) {
  for (const [id, u] of Object.entries(table)) {
    const e = MAP[group + '/' + id]; if (!Array.isArray(e) || !u) continue;
    REV.set(u, e.filter(x => Array.isArray(x) && +x[0] > 0 && typeof x[1] === 'string').map(([w, f]) => ({ w: +w, u: SITE + f })));
  }
}

export function startHD() {
  if (__WEB__ || import.meta.env.DEV) { if (REV.size) watch(); return; }   // (las grandes de la propia web)
  // (la lista va ya dentro del archivo, la de la web compilada a la vez, __HDMAP__: hay visores que dejan cargar imágenes
  // de fuera pero no pedir archivos, y sin la lista la portada se quedaba en la pequeña aunque hubiera red. Se pide igual,
  // por si la web publicada es más nueva que el archivo)
  let watching = false;
  const use = (j) => { MAP = j; for (const [g, tb] of TABLES) fill(g, tb); if (REV.size && !watching) { watching = true; watch(); } };
  if (__HDMAP__ && typeof __HDMAP__ === 'object') use(__HDMAP__);
  // (si la lista no llega —sin conexión, una red lenta, un corte—, se vuelve a pedir a los 4 y a los 15 s y al recuperar
  // la conexión: antes se pedía una sola vez, y si fallaba el archivo único se quedaba con las láminas pequeñas)
  let n = 0, busy = false;
  const ask = () => {
    if (FRESH || busy || navigator.onLine === false) return;
    busy = true; n++;
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), 15000);
    fetch(SITE + 'hd.json', { signal: ac.signal, cache: 'no-cache', credentials: 'omit', referrerPolicy: 'no-referrer' })
      .then(r => r.ok ? r.json() : null)
      .then(j => { clearTimeout(t); busy = false; if (!j || typeof j !== 'object') throw 0; FRESH = true; use(j); })
      .catch(() => { clearTimeout(t); busy = false; if (n < 3) setTimeout(ask, n === 1 ? 4000 : 15000); });
  };
  addEventListener('online', ask);
  ask();
}

// ancho de cada imagen pequeña y carga de cada grande (una vez por url)
const memo = (m, f) => (u) => m.get(u) || (m.set(u, f(u)), m.get(u));
const load = (u, k) => new Promise(r => { const i = new Image(); i.onload = () => r(k ? [i.naturalWidth, i.naturalHeight] : true); i.onerror = () => r(k ? [0, 0] : false); i.src = u; });
const sizeOf = memo(new Map(), u => load(u, true));
const fetchBig = memo(new Map(), u => load(u, false));
const NONE = new WeakMap();   // elemento → su estilo, ya mirado y sin imágenes que cambiar
const DONE = new WeakMap();   // elemento → la pequeña que ya se está cambiando (un mismo fondo cambia de lámina)

// tras cada cambio de pantalla o al deslizar (con un respiro, para no repasar en cada fotograma), las imágenes y los
// fondos que salen de una pequeña con grande
function watch() {
  let pending = 0;
  const later = () => { if (!pending) pending = setTimeout(() => { pending = 0; scan(); }, 250); };
  new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
  addEventListener('scroll', later, { capture: true, passive: true }); addEventListener('resize', later);
  scan();
}
function scan() {
  for (const im of document.querySelectorAll('img[src]')) {
    const s = im.getAttribute('src'); if (DONE.get(im) !== s && REV.has(s)) upgrade(im, s, (u) => { if (im.getAttribute('src') === s) im.src = u; });
  }
  for (const el of document.querySelectorAll('[style*="url("]')) {
    const st = el.getAttribute('style'); if (NONE.get(el) === st) continue;
    let any = false;
    for (const s of urlsIn(st)) if (REV.has(s)) { any = true; if (DONE.get(el) !== s) { upgrade(el, s, (u) => { const v = el.getAttribute('style'); if (v && v.includes(s)) el.setAttribute('style', v.split(s).join(u)); }); break; } }
    if (!any) NONE.set(el, st);   // (sin ninguna que cambiar: no se vuelve a mirar mientras no cambie su estilo)
  }
}
const urlsIn = (st) => [...st.matchAll(/url\((["']?)([^"')]+)\1\)/g)].map(m => m[2]);
// solo si se ve más ancha de lo que mide (en las tarjetas pequeñas, la de dentro ya basta) y está a la vista. El ancho
// que pide en pantalla según cómo se encaja: «cover» la estira hasta cubrir la caja, «contain» la mete entera y si no,
// ocupa el ancho de la caja
function upgrade(el, small, apply) {
  sizeOf(small).then(([w, h]) => {
    const r = el.getBoundingClientRect(); if (!w || !h || !r.width || !r.height) return;
    const c0 = getComputedStyle(el), fit = (el.tagName === 'IMG' ? c0.objectFit : c0.backgroundSize).split(',')[0].trim();
    if (/blur\(/.test(c0.filter)) return;   // (los fondos desenfocados no ganan nada)
    const need = (fit === 'cover' ? Math.max(r.width, r.height * w / h) : fit === 'contain' || fit === 'scale-down' ? Math.min(r.width, r.height * w / h) : r.width) * devicePixelRatio;
    if (need <= w * 1.02) return;   // (antes se dejaba estirar un 20 %, y en un escritorio se notaba: la portada de 1280 a 1438)
    if (r.bottom < -innerHeight * 0.5 || r.top > innerHeight * 1.5 || r.right < 0 || r.left > innerWidth) return;
    const list = REV.get(small), c = list.find(x => x.w >= need * 0.98) || list[list.length - 1];
    if (!c || c.w <= w) return;
    DONE.set(el, small);
    fetchBig(c.u).then(ok => { if (ok) apply(c.u); else DONE.delete(el); });
  });
}
