// La equipación que eliges para tu pelotari: el color de las zapatillas, de las muñequeras y de la faja (el autor, 18 de
// noviembre de 2026: «una de las personalizaciones son las zapatillas, las muñequeras y la faja o fajín»). Vale para el
// pelotari con el que juegues, sea el tuyo o uno de los del juego, en todos los partidos; los rivales van como siempre.
// Se guarda en el perfil (settings.pelotaKit) y se pinta sobre el modelo en actors/npcOutfit.js (KIT), sin tocarlo.
// La pantalla de elegirla, con el pelotari en 3D, está en pelota/equipacion.js.
import { profile, saveProfile } from '../game/profile.js';

/** Los colores a elegir (c: el color; es, eu: su nombre) */
export const KIT_COLORES = [
  { id: 'blanco', es: 'Blanco', eu: 'Zuria', c: '#f3f0e8' }, { id: 'negro', es: 'Negro', eu: 'Beltza', c: '#1d1b24' },
  { id: 'rojo', es: 'Rojo', eu: 'Gorria', c: '#d3202b' }, { id: 'azul', es: 'Azul', eu: 'Urdina', c: '#1f4fd6' },
  { id: 'verde', es: 'Verde', eu: 'Berdea', c: '#1e9a52' }, { id: 'amarillo', es: 'Amarillo', eu: 'Horia', c: '#f0c020' },
  { id: 'naranja', es: 'Naranja', eu: 'Laranja', c: '#ee7a1c' }, { id: 'rosa', es: 'Rosa', eu: 'Arrosa', c: '#ec4f9f' },
  { id: 'morado', es: 'Morado', eu: 'Morea', c: '#7a3fd0' },
];
/** Las piezas (sin: se puede ir sin ella; las zapatillas, siempre: de blanco, las del dibujo) */
export const KIT_PIEZAS = [
  { k: 'zap', es: 'Zapatillas', eu: 'Oinetakoak', sin: false },
  { k: 'mun', es: 'Muñequeras', eu: 'Eskumuturrekoak', sin: true },
  { k: 'faja', es: 'Faja', eu: 'Gerrikoa', sin: true },
];
const POR = Object.fromEntries(KIT_COLORES.map(c => [c.id, c]));
/** Lo elegido: { zap, mun, faja }, cada uno el id de un color ('' en muñequeras y faja: sin ellas) */
export function kitTuyo() {
  let k = {}; try { k = profile().settings?.pelotaKit || {}; } catch (e) { /* sin perfil todavía */ }
  return { zap: POR[k.zap] ? k.zap : 'blanco', mun: POR[k.mun] ? k.mun : '', faja: POR[k.faja] ? k.faja : '' };
}
export function ponKit(pieza, id) { const P = profile(); ((P.settings ||= {}).pelotaKit ||= {})[pieza] = POR[id] ? id : ''; saveProfile(); }
/** Los colores para el modelo (actors/npcOutfit.js outfitTint): { shoes, wrist, sash }; null, como viene */
export function kitColores(K = kitTuyo()) {
  return { shoes: K.zap && K.zap !== 'blanco' ? POR[K.zap].c : null, wrist: POR[K.mun]?.c || null, sash: POR[K.faja]?.c || null };
}
/** ¿Lleva algo distinto de lo que trae el dibujo? */
export const hayKit = (K = kitTuyo()) => K.zap !== 'blanco' || !!K.mun || !!K.faja;
