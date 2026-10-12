// Los jugadores de fútbol del autor (src/assets/jugadores): un chico y una chica por equipación, de cuerpo entero para
// la pantalla VS del partido y de busto para la caja del próximo partido de la liga. Cada club sale con el suyo (el chico o la chica,
// alternando de un club al siguiente, como en el catálogo del autor); el visitante con la segunda equipación, con la
// blanca o la azul marino. Solo están en la web: en el archivo único no hay imagen y se queda la camiseta dibujada.
// Las figuras miran a su izquierda: en la pantalla VS se gira solo la del rival, como la de los pelotaris.
const byId = (g) => Object.fromEntries(Object.entries(g).map(([k, v]) => [k.split('/').pop().replace('.webp', ''), v]));
const IMG = byId(import.meta.glob('@jugadores/*.webp', { eager: true, query: '?url', import: 'default' }));
// (y su busto, cabeza y pecho a 240 × 320, para la caja del próximo partido de la liga: tools/jugadores-busto.mjs)
const BUSTO = byId(import.meta.glob('@jugadores/busto/*.webp', { eager: true, query: '?url', import: 'default' }));
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
/** La imagen del jugador (o null si esta versión no la tiene) */
export const jugadorSrc = (t) => IMG[jugadorId(t)] || null;
/** HTML del jugador, una sola imagen (class: «pf jf» y la que se pida), o '' si esta versión no lo tiene */
export function jugadorFig(t, cls = '') {
  const u = jugadorSrc(t);
  return u ? `<img class="pf jf${cls ? ' ' + cls : ''}" src="${u}" alt="" draggable="false">` : '';
}
/** HTML del busto del jugador (o '' si esta versión no lo tiene) */
export function jugadorBusto(t, cls = '') {
  const u = BUSTO[jugadorId(t)];
  return u ? `<img class="jf${cls ? ' ' + cls : ''}" src="${u}" alt="" draggable="false">` : '';
}
