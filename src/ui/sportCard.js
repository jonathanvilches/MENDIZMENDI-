// Cartas de jugador al modo de los juegos de fútbol: la media grande arriba, el puesto, la figura, el nombre y tres
// cualidades en cifras. Las usan el cuadro del torneo, la colección de pelotaris, la pantalla VS y el menú. Las
// cualidades de los pelotaris van de 1 a 5 (rules.js): en la carta se pasan a la escala de 0 a 99 de esos juegos, con
// un pequeño ajuste que sale del nombre (siempre el mismo para el mismo pelotari) para que no salgan todas iguales.
import blue from '../assets/meshy/portraits/pelotari_vs.webp?url';
import red from '../assets/meshy/portraits/pelotari_rojo_vs.webp?url';
import { lgEsc as esc } from '../futbol/liga.js';
import { pelotariRating, rate99 } from '../pelota/rules.js';

export const PELOTARI_IMG = { blue, red };
export { rate99 as rate, pelotariRating };
const STAT_NAMES = { es: ['Vel', 'Pot', 'Man'], eu: ['Abi', 'Ind', 'Esk'] };
/**
 * HTML de una carta. o = { name, town, stats, side: 'azul'|'rojo', role ('Mano', 'Del', 'Zag'...), img, w (ancho en px),
 * lock (sin descubrir), mini (de adorno: solo la media y la figura), bonus, attr (atributos extra del elemento), tag ('div' o 'button'), d (retraso de la animación),
 * pop (con entrada), lang }
 */
export function pelotariCard(o) {
  const r = pelotariRating(o.stats, `${o.name} ${o.town || ''}`, o.bonus || 0), N = STAT_NAMES[o.lang] || STAT_NAMES.es, tag = o.tag || 'div';
  const img = o.img || (o.side === 'azul' ? blue : red);
  return `<${tag} class="gx-card ${o.side || 'rojo'}${o.lock ? ' lock' : ''}${o.pop ? ' pop' : ''}${o.mini ? ' mini' : ''}" style="--w:${o.w || 140}px;--d:${o.d || 0}s" ${o.attr || ''}>
    <span class="gx-face"></span><img src="${img}" alt="" draggable="false">
    <span class="gx-ovr"><b>${o.lock ? '?' : r.ovr}</b><small>${esc(o.role || 'Mano')}</small></span>
    <span class="gx-nm">${esc(o.lock ? '?' : o.name)}</span><span class="gx-tw">${esc(o.town || '')}</span>
    <span class="gx-st">${[r.vel, r.pot, r.man].map((v, i) => `<span><b>${o.lock ? '–' : v}</b><small>${N[i]}</small></span>`).join('')}</span></${tag}>`;
}
