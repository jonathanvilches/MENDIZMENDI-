// Los personajes de Navarra en el menú (data/personajes.js): las mujeres de Navarra primero. Cada tarjeta lleva la
// ilustración del autor si la tiene (ui/laminas.js) o su icono, como las tarjetas de las figuras de leyenda, y abre su
// ficha: su historia (las tres páginas que cuenta su guía en el pueblo), su huella hoy y dónde está su recuerdo en el juego.
import { PERSONAJES, FIGURE_TOWNS } from '../data/personajes.js';
import { LEVELS } from '../data/levels.js';
import { personajeUrl } from './laminas.js';
import { infoCard } from './escudo.js';
import { icon3DReady } from './icon3d.js';
import { iconSVG } from './icons.js';
import { isEU, tr } from '../i18n.js';
import { esc } from '../util/html.js';

const TOWN_OF = {}; for (const [t, L] of Object.entries(FIGURE_TOWNS)) for (const id of L) TOWN_OF[id] = t;
const townName = (id) => (LEVELS.find(l => l.id === id)?.name || id || '').split(' /')[0];
/** Las mujeres de Navarra y los demás personajes, en el orden de data/personajes.js. */
export const MUJERES = Object.keys(PERSONAJES).filter(id => PERSONAJES[id].women);
export const HOMBRES = Object.keys(PERSONAJES).filter(id => !PERSONAJES[id].women);
const cat = (F) => F.kicker.split('·').pop().trim();
const pic = (id, F) => { const u = personajeUrl(id); if (u) return `<img src="${u}" alt="" loading="lazy" decoding="async">`; const i = icon3DReady(F.icon); return i ? `<img class="pico" src="${i}" alt="">` : iconSVG(F.icon, 72); };
/** La tarjeta de un personaje (abre la ficha al tocarla: data-personaje). */
const personajeCard = (id) => { const F = PERSONAJES[id]; return `<button type="button" class="fcard pers${personajeUrl(id) ? ' ilus' : ''}" data-personaje="${id}" aria-label="${esc(F.name)}"><span class="fpic">${pic(id, F)}</span><span class="ftx"><small><span>${esc(cat(F))}</span> · <span>${esc(townName(TOWN_OF[id]))}</span></small><b>${esc(isEU() ? (F.eu || F.name) : F.name)}</b><i>${esc(F.years)}</i></span></button>`; };
export const personajesHTML = (list) => list.map(personajeCard).join('');
/** La ficha de un personaje, con pestañas como las de las figuras. */
export function openPersonaje(ui, id) {
  const F = PERSONAJES[id]; if (!F) return Promise.resolve();
  const eu = isEU(), town = townName(TOWN_OF[id]), img = personajeUrl(id);
  const juego = eu ? `Herria: <b>${esc(town)}</b> · Misioa: «${esc(F.eu || F.name)}» · Nor: ${esc(tr(F.host.name))}.` : `En <b>${esc(town)}</b>, misión «${esc(F.name)}»: habla con ${esc(F.host.name)} y lee su recuerdo.`;
  return infoCard(ui, {
    kicker: F.kicker, title: eu ? (F.eu || F.name) : `${F.name}${F.eu ? ' · ' + F.eu : ''}`, sub: F.years,
    image: img || '', media: img ? '' : `<img class="ix-sign pico" src="${icon3DReady(F.icon) || ''}" alt="">`,
    secs: [['Su historia', F.pages.map(p => `<p>${esc(p)}</p>`).join('')], ['Su huella hoy', `<p>${esc(F.today)}</p>`], ['En el juego', `<p>${juego}</p>`]],
    badge: F.women ? 'Mujeres de Navarra' : 'Personajes de Navarra', wide: !!img,
  });
}
