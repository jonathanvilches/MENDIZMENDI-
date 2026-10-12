// Los jugadores de fútbol del autor (src/assets/jugadores): un chico y una chica por equipación, de cuerpo entero, de busto
// (la caja del próximo partido de la liga y el menú del club) y juntos, la pareja de cada equipo (la pantalla VS y las
// portadas de equipo de los menús). Cada club sale con el suyo (el chico o la chica,
// alternando de un club al siguiente, como en el catálogo del autor); el visitante con la segunda equipación, con la
// blanca o la azul marino. Solo están en la web: en el archivo único no hay imagen y se queda la camiseta dibujada.
// Las figuras miran a su izquierda: en la pantalla VS se gira solo la del rival, como la de los pelotaris.
const byId = (g) => Object.fromEntries(Object.entries(g).map(([k, v]) => [k.split('/').pop().replace('.webp', ''), v]));
const IMG = byId(import.meta.glob('@jugadores/*.webp', { eager: true, query: '?url', import: 'default' }));
// (y su busto, cabeza y pecho a 360 × 480, para la caja del próximo partido de la liga y el menú del club: tools/jugadores-busto.mjs)
const BUSTO = byId(import.meta.glob('@jugadores/busto/*.webp', { eager: true, query: '?url', import: 'default' }));
// (y la pareja de cada equipación, el chico y la chica juntos, recortada: la de 960 de alto para la pantalla VS y la de
// 480 para las portadas de equipo de los menús; tools/jugadores-duos.mjs)
const DUO = byId(import.meta.glob('@jugadores/duo/*.webp', { eager: true, query: '?url', import: 'default' }));
const DUO_S = byId(import.meta.glob('@jugadores/duo-s/*.webp', { eager: true, query: '?url', import: 'default' }));
// (los equipos sin club: Iruña, el visitante, el del pueblo y los vecinos)
const CHICA = new Set(['baztan', 'leitza', 'pirineo', 'xota', 'ilumberri', 'cantolagua', 'vianes', 'artajones', 'erriberri', 'tudelano', 'visitante', 'vecinos']);

/** El nombre de la imagen del equipo del partido o del club ({ id, club, second, shirt } o el id del club) */
export function jugadorId(t) {
  const club = typeof t === 'string' ? t : t?.club || t?.id;
  if (!club) return null;
  const sexo = CHICA.has(club) ? 'chica' : 'chico';
  if (t?.second) return `alternativa-${String(t.shirt).toLowerCase() === '#f4f4f2' ? 'blanca' : 'marino'}-${sexo}`;
  return `${club}-${sexo}`;
}
/** El nombre de la pareja del equipo (la del club o, si va con la segunda equipación, la blanca o la azul marino) */
export function duoId(t) {
  const club = typeof t === 'string' ? t : t?.club || t?.id;
  if (!club) return null;
  return t?.second ? `alternativa-${String(t.shirt).toLowerCase() === '#f4f4f2' ? 'blanca' : 'marino'}` : club;
}
/** HTML de la pareja del equipo, una sola imagen (big: la de la pantalla VS), o '' si esta versión no la tiene */
export function jugadorDuo(t, cls = '', big = false) {
  const u = (big ? DUO : DUO_S)[duoId(t)];
  return u ? `<img class="pf duo${cls ? ' ' + cls : ''}" src="${u}" alt="" draggable="false">` : '';
}
/** La imagen del jugador (o null si esta versión no la tiene) */
export const jugadorSrc = (t) => IMG[jugadorId(t)] || null;
/** HTML del jugador, una sola imagen (class: «pf jf» y la que se pida), o '' si esta versión no lo tiene */
export function jugadorFig(t, cls = '') {
  const u = jugadorSrc(t);
  return u ? `<img class="pf jf${cls ? ' ' + cls : ''}" src="${u}" alt="" draggable="false">` : '';
}
/** La imagen del busto del jugador (o null si esta versión no la tiene) */
export const bustoSrc = (t) => BUSTO[jugadorId(t)] || null;
/** HTML del busto del jugador (o '' si esta versión no lo tiene) */
export function jugadorBusto(t, cls = '') {
  const u = BUSTO[jugadorId(t)];
  return u ? `<img class="jf${cls ? ' ' + cls : ''}" src="${u}" alt="" draggable="false">` : '';
}
