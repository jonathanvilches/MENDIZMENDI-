// Las láminas animadas: la misma lámina, con el mismo encuadre, en un vídeo corto sin sonido que se repite sin salto.
// Hechas en Higgsfield (MiniMax H3) a partir de la lámina original, con ella misma de primer y último fotograma, y pasadas
// a 1280 × 720 con el encuadre exacto de la lámina web y medio segundo de fundido en la vuelta (ARQUITECTURA.md, «Láminas
// animadas»). Van en public/videos/<id de la lámina>.mp4, fuera de assets/: no entran en «descargar todo», ni en el
// archivo único ni en el artefacto, y el service worker no las guarda (Safari pide los vídeos por trozos). Sin conexión, en
// el modo sencillo, con «reducir movimiento» o con el ahorro de datos, o si el vídeo falla, queda la lámina fija de siempre.
//   videoDe(id)        → la dirección del vídeo de esa lámina, o '' si no tiene o aquí no se ponen vídeos
//   enMarcha(v, url)   → pone a andar un <video> de lámina; le pone la clase «on» cuando ya se mueve (entra con su fundido)
//   para(v)            → lo para y suelta el archivo
import { sencillo } from '../util/sencillo.js';

// (el arranque, los pueblos y los deportes que ya tienen la suya; el resto, la lámina fija)
export const VIDEOS = new Set([
  'c-pirineos',
  'pamplona', 'tudela', 'estella', 'olite', 'lesaka', 'elizondo', 'otsagabia-ochagavia', 'isaba-izaba', 'erronkari-roncal', 'javier',
  'zugarramurdi', 'sanguesa', 'tafalla', 'ujue', 'orreaga-roncesvalles', 'viana',
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
export const videoDe = (id) => (id && VIDEOS.has(id) && puede() ? `./videos/${id}.mp4` : '');

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
