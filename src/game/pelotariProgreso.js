// Tu pelotari crece partido a partido: cada partido acabado da experiencia (más si ganas) y entrena sus cuatro cualidades
// según lo que has hecho en la cancha. La fuerza, con los golpes cargados; la velocidad, con las pelotas a las que
// llegas; la agilidad, con las voleas, los ganchos y los tantos largos; la precisión, con los golpes en su momento y los
// tantos que haces. Todas empiezan en 3, la media de siempre, y suben poco a poco hasta 5: cada vez cuesta más subir.
// Se guarda en el perfil (profile.pelotari); el partido lo pide con youStats y la ficha y las cartas lo enseñan.
import { profile, saveProfile } from './profile.js';

export const CUALIDADES = ['fuerza', 'velocidad', 'agilidad', 'precision'];
const BASE = 3, TOPE = 5, K = 600;   // (cada partido, casi una décima; con unos 20 partidos, cerca de 4,1; con 60, cerca de 4,9)
const sube = (pts) => (TOPE - BASE) * (1 - Math.exp(-Math.max(0, pts) / K));

/** Lo que cuesta pasar del nivel n al siguiente (el 1 al 2, 100; cada uno, 30 más). */
const cuesta = (n) => 100 + (n - 1) * 30;
/** El nivel de una experiencia: { n, en (lo que llevas de este nivel), falta (lo que cuesta entero) }. */
export function nivelDe(xp = 0) {
  let n = 1, x = Math.max(0, Math.round(xp));
  while (x >= cuesta(n) && n < 99) { x -= cuesta(n); n++; }
  return { n, en: x, falta: cuesta(n) };
}

function datos() {
  const P = profile(), d = P.pelotari ||= {};
  d.xp ||= 0; d.partidos ||= 0; d.ganados ||= 0; d.pts ||= {};
  for (const k of CUALIDADES) d.pts[k] ||= 0;
  return d;
}

/** Tus cualidades de ahora (de 3 a 5, con decimales), como las del rival: { fuerza, velocidad, agilidad, precision }. */
export function tusCualidades() {
  const d = datos(), q = {};
  for (const k of CUALIDADES) q[k] = Math.round((BASE + sube(d.pts[k])) * 100) / 100;
  return q;
}

/** Tu pelotari: nivel, experiencia, partidos y ganados (para la ficha y las cartas). */
export function tuPelotari() { const d = datos(); return { ...nivelDe(d.xp), xp: d.xp, partidos: d.partidos, ganados: d.ganados }; }

/** Suma un partido acabado. r: { win, score: { you, rival } }; st: lo que se ha hecho en la cancha (game.stats);
 *  modo: 'match' o 'rally' (pelotear, que cuenta menos). Devuelve lo ganado: { xp, antes, ahora, subidas }. */
export function sumaPartido(r, st = {}, modo = 'match') {
  const d = datos(), antes = nivelDe(d.xp), q0 = tusCualidades();
  const yo = r?.score?.you || 0, golpes = st.hits?.you || 0, rally = modo === 'rally';
  const xp = rally ? Math.round(10 + Math.min(30, golpes)) : Math.round(30 + yo * 4 + (r?.win ? 40 : 0) + Math.min(20, (st.perfect || 0) * 2));
  const k = (r?.win ? 1.3 : 1) * (rally ? 0.4 : 1);
  const gana = {
    fuerza: 6 + (st.fuertes || 0) * 2,
    velocidad: 6 + golpes * 0.8,
    agilidad: 6 + ((st.voleas || 0) + (st.ganchos || 0)) * 3 + (st.longest || 0) * 0.5,
    precision: 6 + (st.perfect || 0) * 3 + yo * 1.5,
  };
  for (const c of CUALIDADES) d.pts[c] += gana[c] * k;
  d.xp += xp; if (!rally) { d.partidos++; if (r?.win) d.ganados++; }
  saveProfile();
  const q1 = tusCualidades(), subidas = {};
  for (const c of CUALIDADES) subidas[c] = Math.round((q1[c] - q0[c]) * 100) / 100;
  return { xp, antes, ahora: nivelDe(d.xp), subidas, cualidades: q1 };
}
