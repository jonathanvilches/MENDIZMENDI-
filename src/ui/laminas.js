// Las láminas del juego (src/data/laminas.js): su archivo, las de cada pueblo y comarca, y el visor a pantalla completa.
// En la web, cada lámina tiene además su copia pequeña (<id>-s, 640 × 360) para tarjetas y miniaturas (así el móvil no
// guarda en memoria imágenes grandes que se ven pequeñas) y la grande de 2560 × 1440 (src/assets/laminas/grande, de
// tools/laminas-grandes.mjs) para las portadas a pantalla entera en pantallas densas: la pide src/web/hd.js solo cuando
// la pantalla la necesita. En el archivo único solo está la de 640 × 360.
// En WebP y no en AVIF: los visores de HTML del iPhone no siempre enseñan AVIF, y sin ellas las portadas salían vacías.
import { LAMINAS, COMARCA_LAMINA, CUENTO_LAMINA, PERSONAJE_LAMINA } from '../data/laminas.js';
import { hdTable } from '../web/hd.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const byId = (g) => Object.fromEntries(Object.entries(g).map(([k, v]) => [k.split('/').pop().replace('.webp', ''), v]));
const URLS = byId(import.meta.glob('@laminas/*.webp', { eager: true, query: '?url', import: 'default' }));
const BIG = byId(import.meta.glob('@laminas-big/*.webp', { eager: true, query: '?url', import: 'default' }));
// Las ilustraciones de las leyendas (src/assets/leyendas), una por cuento y con su mismo id, en 16:9. En la web, la de
// 768 para el libro y la de 1536 para el relato y el visor; en el archivo único, una sola de 640 (el alias @leyendas).
const LEY = byId(import.meta.glob('@leyendas/*.webp', { eager: true, query: '?url', import: 'default' }));
const LEY_BIG = byId(import.meta.glob('@leyendas-big/*.webp', { eager: true, query: '?url', import: 'default' }));
// (y, en la web, las de 2560 de tools/laminas-grandes.mjs para cuando se ven a pantalla entera en una pantalla densa; igual en las cimas, los personajes y las tradiciones)
const LEY_HD = byId(import.meta.glob('@leyendas-hd/*.webp', { eager: true, query: '?url', import: 'default' }));
const BY_ID = Object.fromEntries(LAMINAS.map(l => [l.id, l]));
hdTable('laminas', URLS, BIG, 2560); hdTable('leyendas', LEY_BIG, LEY_HD, 2560);   // (en el archivo único, con conexión: los de la web, src/web/hd.js)

/** La lámina por su id (o null si no está en esta versión); small: la copia pequeña. */
export const laminaUrl = (id, small = false) => (id && ((small && URLS[id + '-s']) || URLS[id])) || null;
export const laminaById = (id) => BY_ID[id] || null;
// Las escenas de las cimas de las misiones de montaña (src/assets/cimas), con el id del monte, en 16:9: el explorador en
// la subida. En la web, la de 1024 para las tarjetas y la de 1536 para el buzón de cumbre; en el archivo único, la de 320.
const CIMA = byId(import.meta.glob('@cimas/*.webp', { eager: true, query: '?url', import: 'default' }));
const CIMA_BIG = byId(import.meta.glob('@cimas-big/*.webp', { eager: true, query: '?url', import: 'default' }));
const CIMA_HD = byId(import.meta.glob('@cimas-hd/*.webp', { eager: true, query: '?url', import: 'default' }));
hdTable('cimas', CIMA_BIG, CIMA_HD, 2560);
/** La escena de una cima (o null si no la tiene); big: la grande. */
export const cimaUrl = (id, big = false) => (big && CIMA_BIG[id]) || CIMA[id] || null;
// Los personajes de Navarra (src/assets/personajes), con su id de data/personajes.js, en 16:9: en la web, los de 1536;
// en el archivo único, los de 320. Sancho y las golondrinas llevan una lámina que ya estaba en el juego.
const PERS = byId(import.meta.glob('@personajes/*.webp', { eager: true, query: '?url', import: 'default' }));
const PERS_HD = byId(import.meta.glob('@personajes-hd/*.webp', { eager: true, query: '?url', import: 'default' }));
hdTable('personajes', PERS, PERS_HD, 2560);
/** La ilustración de un personaje de Navarra (o null si no la tiene). */
export const personajeUrl = (id) => PERS[id] || laminaUrl(PERSONAJE_LAMINA[id]) || null;
// Las tradiciones (src/assets/tradiciones), una por misión con su id en el campo «ilus» de data/levels.js, en 16:9: el
// explorador viendo la tradición. En la web, las de 1536; en el archivo único, las de 320.
const TRAD = byId(import.meta.glob('@tradiciones/*.webp', { eager: true, query: '?url', import: 'default' }));
const TRAD_HD = byId(import.meta.glob('@tradiciones-hd/*.webp', { eager: true, query: '?url', import: 'default' }));
hdTable('tradiciones', TRAD, TRAD_HD, 2560);
/** La ilustración de una tradición (o null si no está en esta versión). */
export const tradicionUrl = (id) => (id && TRAD[id]) || null;
/** La ilustración de un cuento (o, si no tiene, la lámina de su pueblo que lo recuerda); big: la grande. */
export const leyendaUrl = (id, big = false) => (big && LEY_BIG[id]) || LEY[id] || laminaUrl(CUENTO_LAMINA[id], !big);
// Las portadas son todas láminas: la de cada pueblo, la de cada comarca y, si un pueblo no tiene, la de su comarca.
// (Las fotos 3D de antes, con el diorama de la comarca y el personaje delante, ya no se usan.)
/** La portada del pueblo (o null si no tiene); small: la copia de las tarjetas. */
export const townCover = (id, small = false) => laminaUrl(id, small);
/** La portada de la comarca. */
export const comarcaCover = (id, small = false) => laminaUrl(COMARCA_LAMINA[id], small);
/** La portada de un pueblo o, si no tiene, la de su comarca. */
export const townImg = (l, small = false) => (l && (townCover(l.id, small) || comarcaCover(l.comarca, small))) || '';
/** Las láminas que hay en esta versión: de un pueblo (la portada primero), de una comarca o de un grupo. */
export const laminasDe = ({ town, comarca, group } = {}) => LAMINAS.filter(l => laminaUrl(l.id) && (town ? l.town === town : comarca ? l.comarca === comarca : l.group === group))
  .sort((a, b) => (b.cover || 0) - (a.cover || 0));

/** Una tira horizontal de láminas: cada una con su título debajo; al tocarla se abre en grande. */
export const laminaRail = (list) => list.length ? `<div class="lam-rail">${list.map(l => `<button class="lam" data-lam="${l.id}"><img src="${laminaUrl(l.id, true)}" alt="" loading="lazy" decoding="async"><span>${esc(l.title)}</span></button>`).join('')}</div>` : '';

/** El visor: la lámina en grande con su título, y flechas para pasar a la anterior y a la siguiente de la tira. */
export function openLamina(id, list = [id], sound) {
  openVisor(list.map(k => ({ src: laminaUrl(k), title: laminaById(k).title })), Math.max(0, list.indexOf(id)), sound);
}
/** El mismo visor para cualquier lista de ilustraciones ({ src, title }), empezando por la i. */
export function openVisor(list, i = 0, sound) {
  const o = document.createElement('div'); o.className = 'lam-view';
  o.innerHTML = `<figure><img alt=""><figcaption><small></small><b></b></figcaption></figure>
    <button class="lv-x" aria-label="Cerrar"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 6l12 12M18 6L6 18" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg></button>
    ${list.length > 1 ? `<button class="lv-a prev" aria-label="Anterior"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M15 4l-8 8 8 8" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button><button class="lv-a next" aria-label="Siguiente"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M9 4l8 8-8 8" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : ''}`;
  const show = () => { const L = list[i]; o.querySelector('img').src = L.src; o.querySelector('b').textContent = L.title; o.querySelector('small').textContent = `${i + 1} / ${list.length}`; };
  const step = (d) => { i = (i + d + list.length) % list.length; sound?.ui?.('click'); show(); };
  const close = () => { removeEventListener('keydown', key, true); o.remove(); };
  const key = (e) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); } else if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1); };
  o.addEventListener('click', (e) => { e.stopPropagation(); if (e.target.closest('.prev')) step(-1); else if (e.target.closest('.next')) step(1); else if (e.target === o || e.target.closest('.lv-x')) close(); });
  addEventListener('keydown', key, true);
  show(); document.body.appendChild(o); sound?.ui?.('open');
}
/** Tras pintar una pantalla: cada lámina de sus tiras abre el visor con las de su misma tira. */
export function bindLaminas(root, sound) {
  root.querySelectorAll('.lam-rail').forEach(r => { const ids = [...r.querySelectorAll('[data-lam]')].map(b => b.dataset.lam);
    r.querySelectorAll('[data-lam]').forEach(b => b.onclick = (e) => { e.stopPropagation(); openLamina(b.dataset.lam, ids, sound); }); });
}
