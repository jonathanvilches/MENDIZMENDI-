// La equipación que eliges para tu pelotari. Desde el 19 de noviembre de 2026 (el autor, 18 de noviembre: «quiero que
// diseñes zapatillas nuevas y fajines y muñequeras, y los tacos también de colores»; y el 19, vistas las pruebas: «con lo
// que tenemos, de momento eliminamos faja y que se pueda personalizar tacos, muñequeras, zapatillas completas y color de
// pelo»): la zapatilla entera de un color, las muñequeras, los tacos de las manos y el pelo. El fajín, fuera hasta que
// los pelotaris se rehagan en Meshy con su equipación (las pruebas, en la rama borrador-equipacion). Vale para el
// pelotari con el que juegues, sea el tuyo o uno de los del juego, en todos los partidos; los rivales van como siempre.
// Se guarda en el perfil (settings.pelotaKit). Todo se pinta sobre el modelo, sin tocarlo: la zapatilla y las muñequeras
// en actors/npcOutfit.js (KIT), los tacos en actors/sinTacos.js y el pelo en actors/hairColor.js. La pantalla de elegirla,
// con el pelotari en 3D, está en pelota/equipacion.js.
import { profile, saveProfile } from '../game/profile.js';
import { HAIR_COLORS } from '../actors/hairColor.js';

/** Los colores a elegir (c: el color; es, eu: su nombre) */
export const KIT_COLORES = [
  { id: 'blanco', es: 'Blanco', eu: 'Zuria', c: '#f3f0e8' }, { id: 'negro', es: 'Negro', eu: 'Beltza', c: '#1d1b24' },
  { id: 'rojo', es: 'Rojo', eu: 'Gorria', c: '#d3202b' }, { id: 'azul', es: 'Azul', eu: 'Urdina', c: '#1f4fd6' },
  { id: 'verde', es: 'Verde', eu: 'Berdea', c: '#1e9a52' }, { id: 'amarillo', es: 'Amarillo', eu: 'Horia', c: '#f0c020' },
  { id: 'naranja', es: 'Naranja', eu: 'Laranja', c: '#ee7a1c' }, { id: 'rosa', es: 'Rosa', eu: 'Arrosa', c: '#ec4f9f' },
  { id: 'morado', es: 'Morado', eu: 'Morea', c: '#7a3fd0' },
];
/** Los colores de pelo (los de actors/hairColor.js, como se ven en el juego) */
export const KIT_PELO = [
  { id: 'negro', es: 'Negro', eu: 'Beltza', c: HAIR_COLORS.negro }, { id: 'castano', es: 'Castaño', eu: 'Gaztainkara', c: HAIR_COLORS.castano },
  { id: 'castanoClaro', es: 'Castaño claro', eu: 'Gaztainkara argia', c: HAIR_COLORS.castanoClaro }, { id: 'cobrizo', es: 'Cobrizo', eu: 'Kobre kolorekoa', c: HAIR_COLORS.cobrizo },
  { id: 'pelirrojo', es: 'Pelirrojo', eu: 'Gorrizta', c: HAIR_COLORS.pelirrojo }, { id: 'rubioOscuro', es: 'Rubio oscuro', eu: 'Ilehori iluna', c: HAIR_COLORS.rubioOscuro },
  { id: 'rubio', es: 'Rubio', eu: 'Ilehoria', c: HAIR_COLORS.rubio }, { id: 'canoso', es: 'Canoso', eu: 'Ile urdina', c: HAIR_COLORS.canoso },
];
/** Las piezas. sin: se puede dejar sin elegir, y qué quiere decir eso (sinEs, sinEu); def: lo que lleva sin tocar nada;
 *  grupo: en qué pestaña de la pantalla va; colores: su paleta (si no, KIT_COLORES) */
export const KIT_PIEZAS = [
  { k: 'zap', grupo: 'mas', es: 'Zapatillas', eu: 'Oinetakoak', sin: false, def: 'blanco' },
  { k: 'mun', grupo: 'mas', es: 'Muñequeras', eu: 'Eskumuturrekoak', sin: true, sinEs: 'Sin', sinEu: 'Gabe', def: '' },
  { k: 'taco', grupo: 'mas', es: 'Tacos', eu: 'Takoak', sin: true, sinEs: 'Como vienen', sinEu: 'Dauden bezala', def: '' },
  { k: 'pelo', grupo: 'pelo', es: 'Pelo', eu: 'Ilea', sin: true, sinEs: 'El suyo', sinEu: 'Berea', def: '', colores: KIT_PELO },
];
/** Las pestañas de la pantalla */
export const KIT_GRUPOS = [{ k: 'mas', es: 'Zapatillas, muñequeras y tacos', eu: 'Oinetakoak, eskumuturrekoak eta takoak' }, { k: 'pelo', es: 'Pelo', eu: 'Ilea' }];
const POR = Object.fromEntries(KIT_COLORES.map(c => [c.id, c])), PELO = Object.fromEntries(KIT_PELO.map(c => [c.id, c]));
const paleta = (p) => p.colores ? PELO : POR;
/** Lo elegido: una pieza por clave (zap, mun, taco, pelo), cada una el id de un color o '' */
export function kitTuyo() {
  let k = {}; try { k = profile().settings?.pelotaKit || {}; } catch (e) { /* sin perfil todavía */ }
  const o = {}; for (const p of KIT_PIEZAS) o[p.k] = paleta(p)[k[p.k]] ? k[p.k] : (p.sin && k[p.k] === '' ? '' : p.def);
  return o;
}
export function ponKit(pieza, id) { const p = KIT_PIEZAS.find(x => x.k === pieza); if (!p) return; const P = profile(); ((P.settings ||= {}).pelotaKit ||= {})[pieza] = paleta(p)[id] ? id : ''; saveProfile(); }
/** ¿Lleva la zapatilla otro color que la del dibujo (blanca)? */
const zapNueva = (K) => K.zap !== 'blanco';
/** Los colores para el modelo (actors/npcOutfit.js outfitTint y actors/sinTacos.js tacosColor): { shoes, wrist, taco,
 *  hair }; null, como viene. La zapatilla, entera de su color (la suela también: «zapatillas completas») */
export function kitColores(K = kitTuyo()) {
  const z = zapNueva(K), c = (id) => POR[id]?.c || null;
  return { shoes: z ? c(K.zap) : null, wrist: c(K.mun), taco: c(K.taco), hair: PELO[K.pelo]?.c || null };
}
/** ¿Lleva algo distinto de lo que trae el dibujo? */
export const hayKit = (K = kitTuyo()) => zapNueva(K) || !!K.mun || !!K.taco || !!K.pelo;
