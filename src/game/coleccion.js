// Las colecciones del menú (naturaleza, personajes, escudos y leyendas), jugando: lo que aún no te ha salido en pantalla
// va bloqueado, con su sitio de pista, y se abre al verlo en el juego (el animal que observas, la planta que reconoces, el
// escudo que lees en la fachada del ayuntamiento, la leyenda que te cuentan, el personaje cuyo guía te habla, la criatura
// que se te aparece de noche, las figuras del carnaval). Así hay ganas de recorrer las comarcas y los pueblos para
// descubrirlo todo. En el material didáctico, todo abierto.
import { isDidactico } from '../util/modo.js';
import { FIGURAS } from '../data/figuras.js';
import { PERSONAJES } from '../data/personajes.js';

/** ¿Has descubierto ya esto? key: «fauna:id», «flora:id», «armas:id», «cuento:id», «personaje:id» o «figura:id». */
export function visto(p, key) {
  if (isDidactico()) return true;
  const C = p?.cards || []; if (C.includes(key)) return true;
  const [t, id] = key.split(':');
  // (los animales que salen en las misiones de observar, apuntados aparte)
  if (t === 'fauna') return (p.species || []).includes(id);
  // (lo descubierto antes de que hubiera estas cartas: la misión que lo enseñaba, hecha; su carta lleva el nombre)
  if (t === 'personaje') { const F = PERSONAJES[id]; return !!F && C.some(c => c.endsWith(':' + F.name)); }
  if (t === 'figura') { const F = FIGURAS.find(f => f.id === id); return !!F && C.some(c => c.endsWith(':' + F.name) || (F.mission && c.endsWith(':' + F.mission))); }
  return false;
}
/** Cuántos de una lista de claves has descubierto. */
export const vistos = (p, keys) => keys.filter(k => visto(p, k)).length;
