// La equipación que eliges para tu pelotari. Desde el 19 de noviembre de 2026, nueva entera (el autor, 18 de noviembre:
// «quiero que diseñes zapatillas nuevas y fajines y muñequeras, y los tacos también de colores… que las zapatillas
// tengan algo más de fantasía, que se puedan cambiar los cordones, la suela, la puntera… la faja es muy fina y va más
// abajo»): la zapatilla, con cuatro colores (la zapatilla, la suela, la puntera y los cordones); las muñequeras; el
// fajín, fino, a la altura de la cadera, con su nudo y sus dos puntas colgando a un lado; y los tacos de las manos.
// Vale para el pelotari con el que juegues, sea el tuyo o uno de los del juego, en todos los partidos; los rivales van
// como siempre. Se guarda en el perfil (settings.pelotaKit) y se pinta sobre el modelo en actors/npcOutfit.js (KIT) y,
// los tacos, en actors/sinTacos.js, sin tocar los modelos. La pantalla de elegirla, con el pelotari en 3D, está en
// pelota/equipacion.js.
import { profile, saveProfile } from '../game/profile.js';

/** Los colores a elegir (c: el color; es, eu: su nombre) */
export const KIT_COLORES = [
  { id: 'blanco', es: 'Blanco', eu: 'Zuria', c: '#f3f0e8' }, { id: 'negro', es: 'Negro', eu: 'Beltza', c: '#1d1b24' },
  { id: 'rojo', es: 'Rojo', eu: 'Gorria', c: '#d3202b' }, { id: 'azul', es: 'Azul', eu: 'Urdina', c: '#1f4fd6' },
  { id: 'verde', es: 'Verde', eu: 'Berdea', c: '#1e9a52' }, { id: 'amarillo', es: 'Amarillo', eu: 'Horia', c: '#f0c020' },
  { id: 'naranja', es: 'Naranja', eu: 'Laranja', c: '#ee7a1c' }, { id: 'rosa', es: 'Rosa', eu: 'Arrosa', c: '#ec4f9f' },
  { id: 'morado', es: 'Morado', eu: 'Morea', c: '#7a3fd0' },
];
/** Las piezas. sin: se puede dejar sin elegir, y qué quiere decir eso (sinEs, sinEu); def: lo que lleva sin tocar nada;
 *  grupo: en qué pestaña de la pantalla va (la zapatilla, con sus cuatro colores, en la suya) */
export const KIT_PIEZAS = [
  { k: 'zap', grupo: 'zap', es: 'Zapatilla', eu: 'Oinetakoa', sin: false, def: 'blanco' },
  { k: 'suela', grupo: 'zap', es: 'Suela', eu: 'Zola', sin: false, def: 'blanco' },
  { k: 'punt', grupo: 'zap', es: 'Puntera', eu: 'Muturra', sin: true, sinEs: 'Como la zapatilla', sinEu: 'Oinetakoa bezala', def: '' },
  { k: 'cord', grupo: 'zap', es: 'Cordones', eu: 'Lokarriak', sin: false, def: 'blanco' },
  { k: 'mun', grupo: 'mas', es: 'Muñequeras', eu: 'Eskumuturrekoak', sin: true, sinEs: 'Sin', sinEu: 'Gabe', def: '' },
  { k: 'faja', grupo: 'mas', es: 'Fajín', eu: 'Gerrikoa', sin: true, sinEs: 'Sin', sinEu: 'Gabe', def: '' },
  { k: 'taco', grupo: 'mas', es: 'Tacos', eu: 'Takoak', sin: true, sinEs: 'Como vienen', sinEu: 'Dauden bezala', def: '' },
];
/** Las pestañas de la pantalla */
export const KIT_GRUPOS = [{ k: 'zap', es: 'Zapatillas', eu: 'Oinetakoak' }, { k: 'mas', es: 'Fajín, muñequeras y tacos', eu: 'Gerrikoa, eskumuturrekoak eta takoak' }];
const POR = Object.fromEntries(KIT_COLORES.map(c => [c.id, c]));
/** Lo elegido: una pieza por clave (zap, suela, punt, cord, mun, faja, taco), cada una el id de un color o '' */
export function kitTuyo() {
  let k = {}; try { k = profile().settings?.pelotaKit || {}; } catch (e) { /* sin perfil todavía */ }
  const o = {}; for (const p of KIT_PIEZAS) o[p.k] = POR[k[p.k]] ? k[p.k] : (p.sin && k[p.k] === '' ? '' : p.def);
  return o;
}
export function ponKit(pieza, id) { const P = profile(); ((P.settings ||= {}).pelotaKit ||= {})[pieza] = POR[id] ? id : ''; saveProfile(); }
/** ¿Lleva la zapatilla algo distinto de la del dibujo (blanca entera)? */
const zapNueva = (K) => K.zap !== 'blanco' || K.suela !== 'blanco' || K.cord !== 'blanco' || !!K.punt;
/** Los colores para el modelo (actors/npcOutfit.js outfitTint y actors/sinTacos.js tacosColor): { shoes, sole, toe,
 *  laces, wrist, sash, taco }; null, como viene. La zapatilla se pinta entera en cuanto una de sus cuatro piezas cambia */
export function kitColores(K = kitTuyo()) {
  const z = zapNueva(K), c = (id) => POR[id]?.c || null;
  return { shoes: z ? c(K.zap) : null, sole: z ? c(K.suela) : null, toe: z ? c(K.punt) || c(K.zap) : null, laces: z ? c(K.cord) : null,
    wrist: c(K.mun), sash: c(K.faja), taco: c(K.taco) };
}
/** ¿Lleva algo distinto de lo que trae el dibujo? */
export const hayKit = (K = kitTuyo()) => zapNueva(K) || !!K.mun || !!K.faja || !!K.taco;
