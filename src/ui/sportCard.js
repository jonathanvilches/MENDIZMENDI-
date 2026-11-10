// Cartas de jugador al modo de los juegos de fútbol: la media grande arriba, el puesto, la figura, el nombre y tres
// cualidades en cifras. Las usan el cuadro del torneo, la colección de pelotaris, la pantalla VS y el menú. Las
// cualidades de los pelotaris van de 1 a 5 (rules.js): en la carta se pasan a la escala de 0 a 99 de esos juegos, con
// un pequeño ajuste que sale del nombre (siempre el mismo para el mismo pelotari) para que no salgan todas iguales.
// Bajo la media, como la bandera en esas cartas, el icono de su arquetipo (rules.js, pelotariArq: Rematador, Defensor,
// Estratega o Zurdo); el nombre del arquetipo, su mano y su golpe estrella van en la pantalla VS y en su ficha.
import { pelotariFig } from './pelotariFig.js';
import { lgEsc as esc } from '../futbol/liga.js';
import { pelotariRating, arqChips } from '../pelota/rules.js';

const STAT_NAMES = { es: ['Vel', 'Pot', 'Man'], eu: ['Abi', 'Ind', 'Esk'] };
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
  return `<${tag} class="gx-card ${o.side || 'rojo'}${o.lock ? ' lock' : ''}${o.pop ? ' pop' : ''}${o.mini ? ' mini' : ''}" style="--w:${o.w || 140}px;--d:${o.d || 0}s" ${o.attr || ''}>
    <span class="gx-face"></span>${img}
    <span class="gx-ovr"><b>${o.lock ? '?' : r.ovr}</b><small>${esc(o.role || 'Mano')}</small></span>${A ? `<span class="gx-arq ${A.id}" role="img" aria-label="${esc(A.t)}" title="${esc(A.t)}">${A.icon}</span>` : ''}
    <span class="gx-nm">${esc(o.lock ? '?' : o.name)}</span><span class="gx-tw">${esc(o.town || '')}</span>
    <span class="gx-st">${[r.vel, r.pot, r.man].map((v, i) => `<span><b>${o.lock ? '–' : v}</b><small>${N[i]}</small></span>`).join('')}</span></${tag}>`;
}
