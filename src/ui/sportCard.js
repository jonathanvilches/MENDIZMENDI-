// Cartas de jugador al modo de las de los juegos de fútbol (las de ejemplo que mandó el autor): a la izquierda, en columna,
// la media grande, el puesto, el icono de su arquetipo donde ellas llevan la bandera (rules.js, pelotariArq: Rematador,
// Defensor, Estratega o Zurdo) y el escudo de su pueblo donde el del club; a la derecha, la figura de busto; debajo, el
// nombre y las cualidades en cifras (seis en dos columnas si la carta es grande, tres si no), del color de su categoría
// (bronce, plata, oro y especial, en la gama de morados del juego). Las usan el cuadro del torneo y la colección de
// pelotaris. Las cualidades de los pelotaris van de 1 a 5 (rules.js): en la carta se pasan a la escala de 0 a 99 de esos
// juegos, con un pequeño ajuste que sale del nombre (siempre el mismo para el mismo pelotari) para que no salgan todas
// iguales. El nombre del arquetipo, su mano y su golpe estrella van en la pantalla VS y en su ficha.
import { pelotariFig } from './pelotariFig.js';
import { lgEsc as esc } from '../futbol/liga.js';
import { pelotariRating, arqChips, cartaTier } from '../pelota/rules.js';
import { LEVELS } from '../data/levels.js';
import { armsOfTown } from '../data/armas-navarra.js';
import { armsImg } from './escudoImg.js';

// el escudo del pueblo de cada pelotari, donde esas cartas ponen el del club: del nombre del pueblo (como lo lleva la carta,
// «Leitza» o «Estella-Lizarra») a su id de src/data/levels.js y de ahí a su blasón (src/data/armas-navarra.js), si tiene
// imagen; los pueblos que no la tienen (los parajes, Irurtzun, Doneztebe...) llevan la columna sin escudo
const llano = (t) => String(t || '').split(' /')[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
let PUEBLOS = null;
export function escudoDe(town) {
  PUEBLOS ||= new Map(LEVELS.map(l => [llano(l.name), l.id]));
  const id = PUEBLOS.get(llano(town)), A = id && armsOfTown(id);
  return (A && armsImg(A.id)) || armsImg(llano(town).replace(/\s+/g, '-')) || null;   // (o un pueblo sin nivel, por el id de su blasón)
}

// alto de la carta por cada píxel de ancho (sport.css, .gx-card): quien la encaja en un hueco por su alto lo usa
export const CARTA_ALTO = 1.48;
const STAT_NAMES = { es: ['Vel', 'Pot', 'Man'], eu: ['Abi', 'Ind', 'Esk'] };
const STAT6 = { es: ['Vel', 'Pot', 'Man', 'Rem', 'Def', 'Fon'], eu: ['Abi', 'Ind', 'Esk', 'Err', 'Def', 'Ira'] };
/**
 * HTML de una carta. o = { name, town, stats, side: 'azul'|'rojo', role ('Mano', 'Del', 'Zag'...), fig (el nombre de la
 * figura, si no es el de la carta: las sin descubrir llevan «?»), img (otra imagen), w (ancho en px),
 * lock (sin descubrir), mini (de adorno: solo la media y la figura), bonus, attr (atributos extra del elemento), tag ('div' o 'button'), d (retraso de la animación),
 * yo (la tuya: su arquetipo sale de tus cualidades y eres diestro),
 * pop (con entrada), icono (lo que va en el sitio del arquetipo si no lo tiene: el candado de las de por descubrir), lang }
 */
export function pelotariCard(o) {
  const r = pelotariRating(o.stats, `${o.name} ${o.town || ''}`, o.bonus || 0), N = STAT_NAMES[o.lang] || STAT_NAMES.es, tag = o.tag || 'div';
  // la figura del pelotari de la carta (src/ui/pelotariFig.js): cada uno la suya, de su color
  const A = o.lock || o.mini ? null : arqChips(o.stats || {}, o.name, o.town || '', o.lang || 'es', !!o.yo)[0];
  const img = o.img ? `<img src="${o.img}" alt="" draggable="false">` : pelotariFig(o.fig || o.name, o.side === 'azul' ? 'azul' : 'rojo');
  // (la categoría, por la media: el color de la carta, de lila apagado a la especial con brillo; el equipo, azul o
  // colorado, en la cinta de la corona. Con sitio, las seis cualidades en dos columnas de tres, como en esos juegos)
  // (las seis van siempre; el CSS enseña tres o seis según lo ancha que salga la carta: sport.css, @container)
  const tier = o.lock ? '' : ` t-${cartaTier(r.ovr)}`, N6 = STAT6[o.lang] || STAT6.es;
  const st = !o.lock && !o.mini ? `<span class="gx-st s6">${[r.vel, r.pot, r.man, r.rem, r.def, r.fon].map((v, i) => `<span><b>${v}</b><small>${N6[i]}</small></span>`).join('')}</span>`
    : `<span class="gx-st">${[r.vel, r.pot, r.man].map((v, i) => `<span><b>${o.lock ? '–' : v}</b><small>${N[i]}</small></span>`).join('')}</span>`;
  // la columna de la izquierda, como en esas cartas: la media, el puesto, donde ellas llevan la bandera el arquetipo (o el
  // candado de las de por descubrir, o.icono) y donde el escudo del club, el de su pueblo
  const ico = A ? `<span class="gx-arq ${A.id}" role="img" aria-label="${esc(A.t)}" title="${esc(A.t)}">${A.icon}</span>` : (o.icono || '');
  const escudo = o.lock || o.mini ? null : escudoDe(o.town);
  return `<${tag} class="gx-card ${o.side || 'rojo'}${tier}${o.lock ? ' lock' : ''}${o.pop ? ' pop' : ''}${o.mini ? ' mini' : ''}${escudo ? ' con-escudo' : ''}" style="--w:${o.w || 140}px;--d:${o.d || 0}s" ${o.attr || ''}>
    <span class="gx-face"></span><span class="gx-eq"></span><span class="gx-lin"></span><span class="gx-fig">${img}</span>
    <span class="gx-ovr"><b>${o.lock ? '?' : r.ovr}</b><small>${esc(o.role || 'Mano')}</small>${ico}${escudo ? `<img class="gx-esc" src="${escudo}" alt="" draggable="false" decoding="async">` : ''}</span>
    <span class="gx-pie"><span class="gx-nm">${esc(o.lock ? '?' : o.name)}</span><span class="gx-tw">${esc(o.town || '')}</span>${st}</span></${tag}>`;
}

