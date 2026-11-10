// Cartas de jugador al modo de los juegos de fútbol: la media grande arriba, el puesto, la figura, el nombre y las
// cualidades en cifras (seis si la carta es grande, tres si no), del color de su categoría (bronce, plata, oro y
// especial, en la gama de morados del juego). Las usan el cuadro del torneo, la colección de pelotaris, la pantalla VS y el menú. Las
// cualidades de los pelotaris van de 1 a 5 (rules.js): en la carta se pasan a la escala de 0 a 99 de esos juegos, con
// un pequeño ajuste que sale del nombre (siempre el mismo para el mismo pelotari) para que no salgan todas iguales.
// Bajo la media, como la bandera en esas cartas, el icono de su arquetipo (rules.js, pelotariArq: Rematador, Defensor,
// Estratega o Zurdo); el nombre del arquetipo, su mano y su golpe estrella van en la pantalla VS y en su ficha.
import { pelotariFig } from './pelotariFig.js';
import { lgEsc as esc } from '../futbol/liga.js';
import { pelotariRating, arqChips, cartaTier } from '../pelota/rules.js';

// alto de la carta por cada píxel de ancho (sport.css, .gx-card): quien la encaja en un hueco por su alto lo usa
export const CARTA_ALTO = 1.48;
const STAT_NAMES = { es: ['Vel', 'Pot', 'Man'], eu: ['Abi', 'Ind', 'Esk'] };
const STAT6 = { es: ['Vel', 'Pot', 'Man', 'Rem', 'Def', 'Fon'], eu: ['Abi', 'Ind', 'Esk', 'Err', 'Def', 'Ira'] };
/**
 * HTML de una carta. o = { name, town, stats, side: 'azul'|'rojo', role ('Mano', 'Del', 'Zag'...), fig (el nombre de la
 * figura, si no es el de la carta: las sin descubrir llevan «?»), img (otra imagen), w (ancho en px),
 * lock (sin descubrir), mini (de adorno: solo la media y la figura), bonus, attr (atributos extra del elemento), tag ('div' o 'button'), d (retraso de la animación),
 * yo (la tuya: su arquetipo sale de tus cualidades y eres diestro),
 * pop (con entrada), lang }
 */
export function pelotariCard(o) {
  const r = pelotariRating(o.stats, `${o.name} ${o.town || ''}`, o.bonus || 0), N = STAT_NAMES[o.lang] || STAT_NAMES.es, tag = o.tag || 'div';
  // la figura del pelotari de la carta (src/ui/pelotariFig.js): cada uno la suya, de su color
  const A = o.lock || o.mini ? null : arqChips(o.stats || {}, o.name, o.town || '', o.lang || 'es', !!o.yo)[0];
  const img = o.img ? `<img src="${o.img}" alt="" draggable="false">` : pelotariFig(o.fig || o.name, o.side === 'azul' ? 'azul' : 'rojo');
  // (la categoría, por la media: el color de la carta, de lila apagado a la especial con brillo; el equipo, azul o
  // colorado, en la franja de arriba y en el puesto. Con sitio, seis cualidades en dos columnas, como en esos juegos)
  // (las seis van siempre; el CSS enseña tres o seis según lo ancha que salga la carta: sport.css, @container)
  const tier = o.lock ? '' : ` t-${cartaTier(r.ovr)}`, N6 = STAT6[o.lang] || STAT6.es;
  const st = !o.lock && !o.mini ? `<span class="gx-st s6">${[r.vel, r.pot, r.man, r.rem, r.def, r.fon].map((v, i) => `<span><b>${v}</b><small>${N6[i]}</small></span>`).join('')}</span>`
    : `<span class="gx-st">${[r.vel, r.pot, r.man].map((v, i) => `<span><b>${o.lock ? '–' : v}</b><small>${N[i]}</small></span>`).join('')}</span>`;
  return `<${tag} class="gx-card ${o.side || 'rojo'}${tier}${o.lock ? ' lock' : ''}${o.pop ? ' pop' : ''}${o.mini ? ' mini' : ''}" style="--w:${o.w || 140}px;--d:${o.d || 0}s" ${o.attr || ''}>
    <span class="gx-face"></span><span class="gx-eq"></span>${img}
    <span class="gx-ovr"><b>${o.lock ? '?' : r.ovr}</b><small>${esc(o.role || 'Mano')}</small></span>${A ? `<span class="gx-arq ${A.id}" role="img" aria-label="${esc(A.t)}" title="${esc(A.t)}">${A.icon}</span>` : ''}
    <span class="gx-pie"><span class="gx-nm">${esc(o.lock ? '?' : o.name)}</span><span class="gx-tw">${esc(o.town || '')}</span>${st}</span></${tag}>`;
}
