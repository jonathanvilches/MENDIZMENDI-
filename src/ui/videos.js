// Las láminas animadas: la misma lámina, con el mismo encuadre, en un vídeo corto sin sonido que se repite sin salto.
// Hechas en Higgsfield (MiniMax H3) a partir de la lámina original, con ella misma de primer y último fotograma, y pasadas
// a 1280 × 720 con el encuadre exacto de la lámina web y medio segundo de fundido en la vuelta (ARQUITECTURA.md, «Láminas
// animadas»). Van en public/videos/<id de la lámina>.mp4 y, en pequeño (640 × 360, para las tarjetas), en
// public/videos/s/; fuera de assets/: no entran en «descargar todo», ni en el archivo único ni en el artefacto, y el
// service worker no las guarda (Safari pide los vídeos por trozos). Sin conexión, en el modo sencillo, con «reducir
// movimiento» o con el ahorro de datos, o si el vídeo falla, queda la lámina fija de siempre.
//   videoDe(id, peque)  → la dirección del vídeo de esa lámina (peque: la pequeña), o '' si no tiene o aquí no se ponen
//   enMarcha(v, url)    → pone a andar un <video> de lámina; le pone la clase «on» cuando ya se mueve (entra con su fundido)
//   para(v)             → lo para y suelta el archivo
//   videoTag(url, cls)  → el HTML del <video data-vid> de una lámina, o '' sin vídeo
//   figuraAnimada(id, color) → la figura animada de un pelotari, o '' si no la tiene
//   vigila(raiz)        → los <video data-vid> que haya o vaya habiendo dentro: andan solo mientras se ven, y al quitarlos
//                         se paran y sueltan su archivo
//   revisa()            → vuelve a mirar cuáles se ven, tras abrir o cerrar algo encima
import { sencillo } from '../util/sencillo.js';

// (el arranque, los pueblos, las comarcas y los deportes que ya tienen la suya; el resto, la lámina fija)
export const VIDEOS = new Set([
  'c-pirineos',
  'pamplona', 'tudela', 'estella', 'olite', 'lesaka', 'elizondo', 'otsagabia-ochagavia', 'isaba-izaba', 'erronkari-roncal', 'javier',
  'zugarramurdi', 'sanguesa', 'tafalla', 'ujue', 'orreaga-roncesvalles', 'viana',
  'c-baztan', 'c-aralar', 'c-sakana', 'pamplona-murallas', 'c-prepirineo', 'lumbier', 'c-vendimia', 'c-cereal', 'c-bardenas',
  'puente-la-reina', 'c-pitillas',
  'dep-fronton', 'dep-pelotari', 'dep-futbol',
]);

const WEB = (typeof __WEB__ !== 'undefined' && __WEB__ && !(typeof __AF__ !== 'undefined' && __AF__)) || import.meta.env.DEV;
let SI = null;
function puede() {
  if (SI !== null) return SI;
  try {
    SI = WEB && location.protocol !== 'file:' && !sencillo() && !matchMedia('(prefers-reduced-motion: reduce)').matches && !navigator.connection?.saveData;
  } catch (e) { SI = false; }
  return SI;
}
export const videoDe = (id, peque = false) => (id && VIDEOS.has(id) && puede() ? `./videos/${peque ? 's/' : ''}${id}.mp4` : '');

// las figuras de jugador animadas: la figura del autor moviéndose en su sitio (respira, cambia el peso de pierna,
// parpadea), en WebP animado con transparencia (public/videos/figuras/<color>/<id>.webp, tools/figura-animada.sh). Van
// como una imagen más donde iba la fija, en las cartas; sin ellas, la fija
export const FIGURAS = new Set(['rojo/inigo', 'azul/inigo']);
export const figuraAnimada = (id, color) => (FIGURAS.has(`${color}/${id}`) && puede() ? `./videos/figuras/${color}/${id}.webp` : '');

/** El <video> de una lámina animada para meter en el HTML (lo pone en marcha vigila, cuando se ve), o '' sin vídeo. */
export const videoTag = (url, cls) => (url ? `<video class="${cls}" data-vid="${url}" muted playsinline loop preload="none" disablepictureinpicture disableremoteplayback aria-hidden="true" tabindex="-1"></video>` : '');

export function enMarcha(v, url) {
  if (!v) return;
  v.classList.remove('on');
  if (!url) { para(v); return; }
  // (sin sonido y en línea, también como propiedades: el iPhone solo arranca solo un vídeo así)
  v.muted = true; v.defaultMuted = true; v.playsInline = true; v.loop = true;
  v.onplaying = () => v.classList.add('on');
  v.onerror = () => { v.classList.remove('on'); v.removeAttribute('src'); };
  if (v.getAttribute('src') !== url) v.src = url;
  v.play()?.catch(() => { });
}
export function para(v) {
  if (!v) return;
  v.onplaying = v.onerror = null; v.classList.remove('on');
  try { v.pause(); } catch (e) { }
  if (v.hasAttribute('src')) { v.removeAttribute('src'); try { v.load(); } catch (e) { } }
}

// (los que se ven, andando; los que no, en pausa: en el móvil, varios a la vez debajo de un menú o fuera de la pantalla
// solo gastaban. Un solo observador para todos. «Se ve» es que está en la pantalla y que nada lo tapa: lo que hay en su
// centro es él o algo de su misma tarjeta; si una sección se abre encima, revisa() los para)
let IO = null;
const VISTOS = new Set();
function seVe(v) {
  const r = v.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false;
  const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
  if (r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight) return false;
  const el = document.elementFromPoint(x, y);
  return !!el && (el === v || !!v.parentElement?.contains(el));
}
const toca = (v) => { if (seVe(v)) { if (v.paused || !v.hasAttribute('src')) enMarcha(v, v.dataset.vid); } else if (!v.paused) { try { v.pause(); } catch (x) { } } };
const ve = () => IO || (IO = new IntersectionObserver((es) => {
  for (const e of es) { const v = e.target; if (e.isIntersecting) { VISTOS.add(v); toca(v); } else { VISTOS.delete(v); if (!v.paused) { try { v.pause(); } catch (x) { } } } }
}, { threshold: 0.15 }));
/** Vuelve a mirar qué vídeos de lámina se ven, tras abrir o cerrar algo encima (una sección del menú, una ficha). */
export function revisa() { for (const v of VISTOS) { if (v.isConnected) toca(v); else VISTOS.delete(v); } }
const dentro = (n, sel) => (n.nodeType !== 1 ? [] : n.matches?.(sel) ? [n] : [...n.querySelectorAll(sel)]);
const VIG = new WeakSet();
export function vigila(raiz) {
  if (!raiz || VIG.has(raiz) || typeof IntersectionObserver === 'undefined') return;
  VIG.add(raiz);
  const sel = 'video[data-vid]';
  for (const v of raiz.querySelectorAll(sel)) ve().observe(v);
  let tr = 0;
  new MutationObserver((ms) => {
    // (si se pone o se quita algo encima de todo, como una ficha, se vuelve a mirar qué se ve)
    if (ms.some(m => m.target === raiz)) { clearTimeout(tr); tr = setTimeout(revisa, 350); }
    for (const m of ms) {
      for (const n of m.removedNodes) for (const v of dentro(n, sel)) if (!v.isConnected) { ve().unobserve(v); VISTOS.delete(v); para(v); }
      for (const n of m.addedNodes) for (const v of dentro(n, sel)) ve().observe(v);
    }
  }).observe(raiz, { childList: true, subtree: true });
}
