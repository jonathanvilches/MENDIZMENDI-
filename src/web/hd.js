// Ilustraciones grandes en el archivo único, cuando se abre en un ordenador. El archivo único lleva las láminas y las demás
// ilustraciones pequeñas (de 640 o de 320 px: las grandes no caben en sus 30 MB) y en la pantalla de un ordenador se veían
// borrosas. Si no es un móvil ni una tableta y hay conexión, se pide a la web publicada la lista de sus ilustraciones
// grandes (hd.json, que escribe la compilación web) y, si llega, cada ilustración que en pantalla se ve más grande de lo
// que mide se cambia por la grande de la web en cuanto esta ha llegado (sin parpadeo; si no llega, se queda la pequeña).
// Sin conexión, o si la web no contesta, todo sigue con las de dentro. En la web y en el servidor de pruebas no se usa:
// ya llevan las grandes. (Solo se descargan la lista y las imágenes que se ven: no se manda nada del jugador.)
const SITE = 'https://jonathanvilches.github.io/MENDIZMENDI-/docs/';
const TABLES = [];          // [prefijo en la lista, { id: url pequeña }]
const REV = new Map();      // url pequeña → url grande
let MAP = null;

/** Cada módulo de ilustraciones da su tabla (id → url pequeña) con el prefijo de su carpeta en la lista de la web. */
export function hdTable(prefix, table) {
  if (__WEB__ || import.meta.env.DEV) return;
  TABLES.push([prefix, table]); if (MAP) fill(prefix, table);
}
function fill(prefix, table) { for (const [id, u] of Object.entries(table)) { const f = MAP[prefix + '/' + id]; if (f && u) REV.set(u, SITE + f); } }

export function startHD() {
  if (__WEB__ || import.meta.env.DEV || navigator.onLine === false || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), 6000);
  fetch(SITE + 'hd.json', { signal: ac.signal, cache: 'no-cache', credentials: 'omit', referrerPolicy: 'no-referrer' })
    .then(r => r.ok ? r.json() : null)
    .then(j => { clearTimeout(t); if (!j || typeof j !== 'object') return; MAP = j; for (const [p, tb] of TABLES) fill(p, tb); if (REV.size) watch(); })
    .catch(() => clearTimeout(t));
}

// ancho de cada imagen pequeña y carga de cada grande (una vez por url)
const memo = (m, f) => (u) => m.get(u) || (m.set(u, f(u)), m.get(u));
const load = (u, k) => new Promise(r => { const i = new Image(); i.onload = () => r(k ? i.naturalWidth : true); i.onerror = () => r(k ? 0 : false); i.src = u; });
const widthOf = memo(new Map(), u => load(u, true));
const fetchBig = memo(new Map(), u => load(u, false));
const DONE = new WeakMap();   // elemento → la pequeña que ya se está cambiando (un mismo fondo cambia de lámina)

// tras cada cambio de pantalla (con un respiro, para no repasar en cada fotograma), las imágenes y los fondos que salen de
// una pequeña con grande
function watch() {
  let pending = 0;
  new MutationObserver(() => { if (!pending) pending = setTimeout(() => { pending = 0; scan(); }, 250); }).observe(document.body, { childList: true, subtree: true });
  scan();
}
function scan() {
  for (const im of document.querySelectorAll('img[src]')) {
    const s = im.getAttribute('src'); if (DONE.get(im) !== s && REV.has(s)) upgrade(im, s, () => { if (im.getAttribute('src') === s) im.src = REV.get(s); });
  }
  for (const el of document.querySelectorAll('[style*="url("]')) {
    for (const s of urlsIn(el.getAttribute('style'))) if (REV.has(s) && DONE.get(el) !== s) { upgrade(el, s, () => { const v = el.getAttribute('style'); if (v && v.includes(s)) el.setAttribute('style', v.split(s).join(REV.get(s))); }); break; }
  }
}
const urlsIn = (st) => [...st.matchAll(/url\((["']?)([^"')]+)\1\)/g)].map(m => m[2]);
// solo si en pantalla se ve más ancha de lo que mide (en las tarjetas pequeñas, la de dentro ya basta)
function upgrade(el, small, apply) {
  widthOf(small).then(w => {
    const r = el.getBoundingClientRect();
    if (!w || !r.width || r.width * devicePixelRatio <= w * 1.15) return;
    DONE.set(el, small);
    fetchBig(REV.get(small)).then(ok => { if (ok) apply(); else DONE.delete(el); });
  });
}
