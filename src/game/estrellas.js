// Los pelotaris estrella (data/estrellas.js): si ya son tuyos, cómo se consiguen y con qué cualidades juegan. Se consiguen
// jugando, con su logro (nivel, txapelas, campeón de un campeonato, puesto 1 del ranking, campeonatos jugados), o, más
// adelante, comprándolos (profile().estrellas[id], que apuntará la tienda)
import { ESTRELLAS } from '../data/estrellas.js';
import { profile, levelOf } from './profile.js';
import { rankingPelota } from './rankingPelota.js';
const lee = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || {}; } catch (e) { return {}; } };
const NOMBRE_KIND = { mano: 'el Manomanista', cuatro: 'el Cuatro y Medio', parejas: 'el de Parejas', gran: 'la Gran Txapela', trinquete: 'el de Trinquete' };
/** ¿Has ganado alguna vez la txapela de ese campeonato? (los guardados de torneo.js: la clave lleva la modalidad, salvo el de mano) */
function campeonDe(kind) {
  for (const [k, T] of Object.entries(lee('herrizherri-torneo-v1'))) {
    const kk = k.includes(':') ? k.split(':')[1] : 'mano';
    if (kk === kind && (T?.txapelas || 0) > 0) return true;
  }
  return false;
}
/** ¿Es tuya? */
export function estrellaConseguida(E) {
  const P = profile(), L = E?.logro || {};
  if (!E) return false;
  if (P.estrellas?.[E.id]) return true;   // (comprada)
  if (L.tipo === 'nivel') return levelOf(P.xp || 0).lv >= L.n;
  if (L.tipo === 'txapelas') return (P.txapelas || 0) >= L.n;
  if (L.tipo === 'campeon') return campeonDe(L.kind);
  const R = L.tipo === 'ranking' || L.tipo === 'campeonatos' ? rankingPelota(P.name || 'Tú') : null;
  if (L.tipo === 'ranking') return R.pos > 0 && R.pos <= L.n && R.lista.length >= 8;
  if (L.tipo === 'campeonatos') return R.campeonatos >= L.n;
  return false;
}
/** Cómo se consigue, en una línea («Llega al nivel 30») */
export function logroTxt(E, eu = false) {
  const L = E?.logro || {};
  if (L.tipo === 'nivel') return eu ? `${L.n}. mailara iritsi` : `Llega al nivel ${L.n}`;
  if (L.tipo === 'txapelas') return eu ? `${L.n} txapela irabazi` : `Gana ${L.n} txapelas`;
  if (L.tipo === 'campeon') return eu ? 'Txapelketa irabazi' : `Gana ${NOMBRE_KIND[L.kind] || 'el campeonato'}`;
  if (L.tipo === 'ranking') return eu ? 'Rankingeko lehena izan' : 'Sé el número 1 del ranking';
  if (L.tipo === 'campeonatos') return eu ? `${L.n} txapelketa jokatu` : `Juega ${L.n} campeonatos`;
  return '';
}
/** Sus cualidades para jugar: las suyas, con su golpe estrella como preferido (rules.js pelotariStyle) */
export function statsEstrella(E) {
  const style = { cortada: 1, largo: 1, dosparedes: 1, gancho: 1, dejada: 1 };
  if (E.golpe in style) style[E.golpe] = 3; else if (E.golpe === 'rebote') style.largo = 3;
  return { ...E.stats, style };
}
export const estrellasTuyas = () => ESTRELLAS.filter(estrellaConseguida);
