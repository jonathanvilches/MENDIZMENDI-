// Las láminas del juego (src/data/laminas.js): su archivo, las de cada pueblo y comarca, y el visor a pantalla completa.
// En la web, cada lámina tiene además su copia pequeña (<id>-s, 480 × 270) para tarjetas y miniaturas: así el móvil no
// guarda en memoria imágenes grandes que se ven pequeñas. En el archivo único solo está la de 640 × 360.
// En WebP y no en AVIF: los visores de HTML del iPhone no siempre enseñan AVIF, y sin ellas las portadas salían vacías.
import { LAMINAS, COMARCA_LAMINA } from '../data/laminas.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const URLS = Object.fromEntries(Object.entries(import.meta.glob('@laminas/*.webp', { eager: true, query: '?url', import: 'default' })).map(([k, v]) => [k.split('/').pop().replace('.webp', ''), v]));
const BY_ID = Object.fromEntries(LAMINAS.map(l => [l.id, l]));

/** La lámina por su id (o null si no está en esta versión); small: la copia pequeña. */
export const laminaUrl = (id, small = false) => (id && ((small && URLS[id + '-s']) || URLS[id])) || null;
export const laminaById = (id) => BY_ID[id] || null;
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
  let i = Math.max(0, list.indexOf(id));
  const o = document.createElement('div'); o.className = 'lam-view';
  o.innerHTML = `<figure><img alt=""><figcaption><small></small><b></b></figcaption></figure>
    <button class="lv-x" aria-label="Cerrar"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 6l12 12M18 6L6 18" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg></button>
    ${list.length > 1 ? `<button class="lv-a prev" aria-label="Anterior"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M15 4l-8 8 8 8" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button><button class="lv-a next" aria-label="Siguiente"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M9 4l8 8-8 8" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : ''}`;
  const show = () => { const L = laminaById(list[i]); o.querySelector('img').src = laminaUrl(L.id); o.querySelector('b').textContent = L.title; o.querySelector('small').textContent = `${i + 1} / ${list.length}`; };
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
