// Las figuras de leyenda y de carnaval en el menú (data/figuras.js): la imagen de cada una (src/assets/figuras, de
// tools/retratos.mjs: 768 px en la web y 384 en el archivo único, que con conexión pide la grande a la web, src/web/hd.js),
// la tarjeta de la tira del inicio y de la pantalla Personajes, y su ficha (quién es, cómo viste, en el juego).
import { FIGURAS, figuraById } from '../data/figuras.js';
import { infoCard } from './escudo.js';
import { hdTable } from '../web/hd.js';
import { esc } from '../util/html.js';
import { byId } from '../util/glob.js';

// los renders de los trajes (2:3), provisionales; y, si el autor entrega la ilustración de una figura (16:9, como las
// láminas: src/assets/figuras/ilus, tools/figuras-ilus.mjs), esa manda y la tarjeta y la ficha salen apaisadas
const IMG = byId(import.meta.glob('@figuras/*.webp', { eager: true, query: '?url', import: 'default' }));
const ILUS = byId(import.meta.glob('@figuras-ilus/*.webp', { eager: true, query: '?url', import: 'default' }));
hdTable('figuras', IMG); hdTable('figuras-ilus', ILUS);
const KIND = { leyenda: 'Leyenda', carnaval: 'Carnaval' };
/** La ilustración de una figura si la hay; si no, el render de su traje (o '' si no está en esta versión). */
const figuraImg = (id) => ILUS[id] || IMG[id] || '';
/** Si la figura tiene ilustración (apaisada) en vez del render. */
const figuraIlus = (id) => !!ILUS[id];
/** La tarjeta de una figura: su imagen, de qué es y de dónde, y su nombre (abre la ficha al tocarla: data-figura). */
const figuraCard = (f) => `<button type="button" class="fcard${figuraIlus(f.id) ? ' ilus' : ''}" data-figura="${f.id}" aria-label="${esc(f.name)}"><span class="fpic">${figuraImg(f.id) ? `<img src="${figuraImg(f.id)}" alt="" loading="lazy" decoding="async">` : ''}</span><span class="ftx"><small>${esc(KIND[f.kind])} · ${esc(f.where.split(' · ')[0])}</small><b>${esc(f.name)}</b>${f.eu && f.eu !== f.name ? `<i>${esc(f.eu)}</i>` : ''}</span></button>`;
/** Las tarjetas de una lista de figuras (por defecto, todas). */
export const figurasHTML = (list = FIGURAS) => list.map(figuraCard).join('');
/** La ficha de una figura, con pestañas como las de los escudos. */
export function openFigura(ui, id) {
  const f = figuraById(id); if (!f) return Promise.resolve();
  return infoCard(ui, {
    kicker: `${KIND[f.kind]} · ${f.where}`, title: f.name + (f.eu && f.eu !== f.name ? ` · ${f.eu}` : ''), sub: f.who.split('. ')[0] + '.', image: figuraImg(id), wide: figuraIlus(id),
    secs: [['Quién es', esc(f.who)], ['Cómo viste', esc(f.wear)], ['En el juego', `${esc(f.game)}${f.mission ? ` Misión: <b>${esc(f.mission)}</b>.` : ''}`]],
  });
}
