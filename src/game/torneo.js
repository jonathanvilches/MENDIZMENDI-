// Los tres campeonatos de pelota de cada comarca, con el formato de los de los profesionales (más cortos, eso sí):
// - Manomanista: dieciséis pelotaris por eliminatorias, como el de verdad: octavos (a 5 tantos), cuartos (a 6),
//   semifinales (a 7) y final (a 9).
// - Cuatro y Medio: dieciséis pelotaris; primero la liguilla, en cuatro grupos de cuatro (tres jornadas a 5 tantos), y
//   los dos primeros de cada grupo, a cuartos (a 6), semifinales (a 7) y final (a 9).
// - Parejas: ocho parejas de delantero y zaguero en liguilla, todas contra todas (siete jornadas a 5 tantos), como el
//   de verdad; las cuatro primeras, a semifinales (a 7) y final (a 9). Tú, con tu compañero de siempre.
// Las rondas se juegan en el frontón del pueblo (los rivales vienen a tu frontón, no hay que viajar) y la final, en el
// Labrit de Iruña. Los demás partidos se simulan según el nivel de cada pelotari. Quien gana la final se lleva la txapela.
// Los pelotaris son personajes del juego (nombres inventados con su pueblo), no pelotaris reales.
// Se guarda en localStorage ('herrizherri-torneo-v1'): uno de cada campeonato por comarca. (Los de antes, de ocho y tres
// rondas, que ya iban por la mitad, se acaban con su cuadro de siempre; los que no habían empezado, se rehacen.)
import { lgPanel, lgFuera, lgEsc as esc } from '../futbol/liga.js';
import { pelotarisPanel, pelotarisCount } from './pelotaris.js';
import { pelotariStats, temporadas, levelTier, tantosDe, TEXT, RETOS, estrellasReto } from '../pelota/rules.js';
import { openFicha } from '../pelota/ficha.js';
import { tusCualidades, tuPelotari } from './pelotariProgreso.js';
import { pelotariCard, CARTA_ALTO } from '../ui/sportCard.js';
// los pelotaris del autor (src/ui/pelotariFig.js): sus nombres y sus figuras, también en las portadas del menú de pelota
// (las ilustraciones de antes de esas portadas siguen en src/assets/pelota, sin cargarse)
import { pelotariFig, RIVALES } from '../ui/pelotariFig.js';
import { camaraDisponible } from '../ui/camaraAR.js';
import { profile } from './profile.js';
import { LEVELS, esSede } from '../data/levels.js';
import COMARCAS from '../data/comarcas.json';
import { iconSVG } from '../ui/icons.js';
import { enCss } from '../util/tele.js';
import { minstd } from '../util/math.js';
// (el idioma, el que marca la página: en euskera, «eu»)
const isEU = () => typeof document !== 'undefined' && document.documentElement?.lang === 'eu';
/** Las cualidades de un pelotari del torneo y sus golpes preferidos (los de los torneos guardados antes sin golpes se
 *  rehacen: salen del nombre y del nivel, siempre los mismos). */
export const statsOf = (p) => p.st?.style ? p.st : (p.st = pelotariStats(`${p.name} ${p.town}`, p.lv || 2));

const KEY = 'herrizherri-torneo-v1';
// las rondas de cada formato (liga: la jornada de la liguilla; ko8, el cuadro de antes, de ocho)
const LIGA = (n, target) => Array.from({ length: n }, (_, j) => ({ name: `Liguilla · jornada ${j + 1}`, target, liga: j }));
const FORMATS = {
  ko8: [{ name: 'Cuartos de final', target: 5 }, { name: 'Semifinales', target: 5 }, { name: 'Final', target: 7 }],
  ko16: [{ name: 'Octavos de final', target: 5 }, { name: 'Cuartos de final', target: 6 }, { name: 'Semifinales', target: 7 }, { name: 'Final', target: 9 }],
  grupos16: [...LIGA(3, 5), { name: 'Cuartos de final', target: 6 }, { name: 'Semifinales', target: 7 }, { name: 'Final', target: 9 }],
  liga8: [...LIGA(7, 5), { name: 'Semifinales', target: 7 }, { name: 'Final', target: 9 }],
};
const FMT = { mano: 'ko16', cuatro: 'grupos16', parejas: 'liga8' };
// (las reglas de cada campeonato: mano a mano en toda la cancha, hasta el 4½ o por parejas)
export const reglaDe = (kind) => KINDS[kind]?.base || kind;
/** Las rondas del torneo: [{ name, target, liga? }] */
export const planOf = (T) => FORMATS[T.fmt] || FORMATS.ko8;
const NAMES = RIVALES;   // (21 chicos y chicas, cada uno con su figura)
const TOWNS = ['Leitza', 'Lesaka', 'Elizondo', 'Altsasu', 'Lekunberri', 'Aoiz', 'Sangüesa', 'Estella-Lizarra', 'Tafalla', 'Olite', 'Tudela', 'Puente la Reina', 'Viana', 'Lumbier', 'Doneztebe', 'Irurtzun'];
const loadAll = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
const keyOf = (comarca, kind) => kind === 'mano' || !kind ? comarca : comarca + ':' + kind;
/** Los tres campeonatos de pelota de cada comarca, como los de los profesionales: el Manomanista (mano a mano, en toda la
 *  cancha), el de Parejas (delantero y zaguero) y el del Cuatro y Medio (mano a mano hasta la raya del 4 y medio) */
export const KINDS = {
  mano: { name: 'Manomanista', full: 'Campeonato Manomanista', k: 'Individual' },
  parejas: { name: 'Parejas', full: 'Campeonato de Parejas', k: 'Por parejas' },
  cuatro: { name: 'Cuatro y Medio', full: 'Campeonato del Cuatro y Medio', k: 'Hasta el 4½' },
  // los inventados para el juego, con más txapelas que ganar (noviembre de 2026): base, las reglas (mano a mano en toda
  // la cancha o hasta el 4½); fmt, el formato; lv, cuánto más fuertes o flojos son los rivales; global, uno solo para
  // toda Navarra en vez de uno por comarca; como, su «Cómo funciona»
  fiestas: { name: 'Torneo de Fiestas', full: 'Torneo de Fiestas', k: 'Mano a mano · 8', base: 'mano', fmt: 'ko8', lv: 0,
    como: { es: 'ocho pelotaris mano a mano, como en las fiestas del pueblo: cuartos y semifinales a 5 tantos y final a 7. Corto y rápido, para una tarde.', eu: 'zortzi pilotari buruz buru, herriko jaietan bezala: final-laurdenak eta finalerdiak 5 tantora eta finala 7ra. Laburra eta azkarra, arratsalde baterako.' } },
  valles: { name: 'Desafío de los Valles', full: 'Desafío de los Valles', k: 'Liguilla y cuadro', base: 'mano', fmt: 'grupos16', lv: 0.3,
    como: { es: 'dieciséis pelotaris mano a mano, en toda la cancha. Primero, la liguilla: cuatro grupos de cuatro, tres jornadas a 5 tantos. Los dos primeros de cada grupo pasan a cuartos (a 6), semifinales (a 7) y la final, a 9, en el frontón Labrit de Iruña.', eu: 'hamasei pilotari buruz buru, kantxa osoan. Lehenik, ligaxka: lauko lau multzo, hiru jardunaldi 5 tantora. Multzo bakoitzeko lehen biak final-laurdenetara (6ra), finalerdietara (7ra) eta finalera, 9ra, Iruñeko Labrit frontoian.' } },
  invierno: { name: 'Copa de Invierno', full: 'Copa de Invierno del Cuatro y Medio', k: 'Hasta el 4½ · 8', base: 'cuatro', fmt: 'ko8', lv: 0.2,
    como: { es: 'ocho pelotaris mano a mano en el Cuatro y Medio, en los frontones cubiertos del invierno: la pelota no puede botar más allá de la raya del 4 y medio. Cuartos y semifinales a 5 tantos y final a 7.', eu: 'zortzi pilotari buruz buru lau t’erdian, neguko frontoi estalietan: pilotak ezin du lau eta erdiko marratik haratago bote egin. Final-laurdenak eta finalerdiak 5 tantora eta finala 7ra.' } },
  promesas: { name: 'Promesas del 4½', full: 'Torneo de Promesas del Cuatro y Medio', k: 'Para empezar', base: 'cuatro', fmt: 'ko8', lv: -0.9,
    como: { es: 'ocho pelotaris que empiezan, mano a mano en el Cuatro y Medio: la pelota no puede botar más allá de la raya del 4 y medio. Cuartos y semifinales a 5 tantos y final a 7. El mejor para estrenarse.', eu: 'hasten ari diren zortzi pilotari, buruz buru lau t’erdian: pilotak ezin du lau eta erdiko marratik haratago bote egin. Final-laurdenak eta finalerdiak 5 tantora eta finala 7ra. Estreinatzeko onena.' } },
  comarcas: { name: 'Campeonato de Comarcas', full: 'Campeonato de Comarcas', k: 'Por tu comarca', base: 'mano', fmt: 'ko8', lv: 0.6, global: true, comarcas: true,
    como: { es: 'cada pelotari juega por su comarca: tú, por la tuya, contra los campeones de otras siete comarcas de Navarra. Mano a mano: cuartos y semifinales a 5 tantos y la final, a 7, en el frontón Labrit de Iruña.', eu: 'pilotari bakoitzak bere eskualdearen alde jokatzen du: zuk, zurearen alde, Nafarroako beste zazpi eskualdetako txapeldunen aurka. Buruz buru: final-laurdenak eta finalerdiak 5 tantora eta finala, 7ra, Iruñeko Labrit frontoian.' } },
  gran: { name: 'Gran Txapela de Navarra', full: 'Gran Txapela de Navarra', k: 'El acontecimiento del año', base: 'mano', fmt: 'ko16', lv: 1, global: true, evento: true,
    como: { es: 'el acontecimiento del año: los dieciséis mejores pelotaris de toda Navarra, mano a mano por eliminatorias. Octavos a 5 tantos, cuartos a 6, semifinales a 7 y la gran final, a 9, en el frontón Labrit de Iruña lleno hasta arriba. Una sola txapela para todo el viejo reino.', eu: 'urteko gertaera handia: Nafarroa osoko hamasei pilotari onenak, buruz buru kanporaketetan. Final-zortzirenak 5 tantora, final-laurdenak 6ra, finalerdiak 7ra eta final handia, 9ra, Iruñeko Labrit frontoian, beteta. Txapela bakarra erresuma zahar osorako.' } },
};
/** Los campeonatos inventados, en el orden del menú (el acontecimiento del año, el primero) */
export const EXTRA = ['gran', 'comarcas', 'fiestas', 'valles', 'invierno', 'promesas'];
const save = (T) => { try { const all = loadAll(); all[keyOf(T.comarca, T.kind)] = T; localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) { /* sin guardado */ } };
/** Las cualidades de cada uno de una pareja (i = 0 el delantero, 1 el zaguero). */
export const mateStats = (p, i) => (p.mst ||= [])[i]?.style ? p.mst[i] : (p.mst[i] = pelotariStats(`${p.mates[i]} ${p.town}`, p.lv || 2));
const clamp01 = (v) => Math.max(0.1, Math.min(0.9, v));

/** Los torneos guardados, sin crear ninguno (para el resumen del inicio: el menú de pelota crea los dos de la comarca al
 *  abrirse, así que solo cuentan los que ya tienen alguna ronda jugada o alguna txapela). */
export function torneosGuardados() { return Object.values(loadAll()).filter(T => T?.players?.length && (T.past?.length || T.txapelas || T.edition > 1)); }
/** Tus temporadas como pelotari: cada campeonato que se acaba (lo ganes o no) es una más. Con ellas se decide quién viste
 *  de colorado en cada partido: el que debutó antes */
export function tusTemporadas() { return Object.values(loadAll()).reduce((n, T) => n + (T?.players?.length ? Math.max(0, (T.edition || 1) - 1) + (T.done ? 1 : 0) : 0), 0); }
/** Los colores de un partido: de colorado el que debutó antes (más temporadas; por parejas, el más veterano de cada una)
 *  y el otro de azul. rival: su nombre, como va al partido; level: el del partido. { colors: { you, rival }, seasons } */
export function coloresPartido(rival, level, rivalMate = null, partner = null) {
  const lv = levelTier(level), suyas = Math.max(temporadas(rival, lv), rivalMate ? temporadas(rivalMate, lv) : 0);
  const tuyas = Math.max(tusTemporadas(), partner ? temporadas(partner, 2) : 0);
  return { colors: tuyas > suyas ? { you: 'rojo', rival: 'azul' } : { you: 'azul', rival: 'rojo' }, seasons: { you: tuyas, rival: suyas } };
}
/** Txapelas ganadas en cada comarca: { comarca: n } */
export function txapelas() { const all = loadAll(), o = {}; for (const k in all) if (all[k]?.txapelas) { const c = k.split(':')[0]; o[c] = (o[c] || 0) + all[k].txapelas; } return o; }
// (la fuerza de un pelotari o de una pareja: el nivel y las cualidades; con ella se ordena el cuadro y se simulan los
// partidos, en los que el más completo gana más a menudo)
const one = (s) => s.fuerza + s.agilidad + s.velocidad;
const fuerza = (T, p) => p.lv * 4 + (T.kind === 'parejas' ? (one(mateStats(p, 0)) + one(mateStats(p, 1))) / 2 : one(statsOf(p)));
// todos contra todos en un grupo (el método del círculo): las jornadas, con los partidos de cada una
function jornadas(ids) {
  const arr = ids.slice(), out = [];
  for (let j = 0; j < arr.length - 1; j++) { const js = []; for (let i = 0; i < arr.length / 2; i++) js.push([arr[i], arr[arr.length - 1 - i]]); out.push(js); arr.splice(1, 0, arr.pop()); }
  return out;
}
// el cuadro de dieciséis por cabezas de serie, como en los campeonatos: tú, el primero (contra el último), y los dos más
// fuertes, cada uno en una mitad, hasta la final
const SERIE16 = [1, 16, 8, 9, 5, 12, 4, 13, 3, 14, 6, 11, 7, 10, 2, 15], SERIE8 = [1, 8, 4, 5, 3, 6, 2, 7];
/**
 * El torneo de la comarca en curso (o uno nuevo).
 * you: { name, town }; ctx: { comarca, comarcaName, towns: [{ id, name }] } (los pueblos del juego donde se juega:
 * primero los de la comarca y después los de alrededor)
 */
export function torneo(you, ctx, fresh = false, kind = 'mano') {
  // (el torneo terminado se sigue mostrando, con su campeón, hasta que se pide uno nuevo; uno de antes, de ocho, sin
  // ninguna ronda jugada, se rehace con el formato de ahora, en la misma edición)
  // (el acontecimiento del año es uno solo para toda Navarra: con su propia «comarca», y rivales de todas)
  const K = KINDS[kind] || KINDS.mano, suya = { id: ctx.comarca, name: ctx.comarcaName };
  if (K.global) ctx = { ...ctx, comarca: 'navarra', comarcaName: 'Navarra' };
  const key = keyOf(ctx.comarca, kind);
  let T = loadAll()[key];
  // (un torneo guardado con menos sedes que las de ahora, de cuando eran cuatro pueblos: con las de ahora, así cada partido
  // sigue yendo a un frontón distinto; antes repetía el cubierto del mismo pueblo)
  if (T && ctx.towns?.length > (T.venues?.length || 0)) T.venues = ctx.towns;
  const rehacer = !!T && !T.fmt && !T.past?.length && !T.done;
  if (T && ((T.done && fresh) || rehacer)) T = null;
  if (!T) {
    const prev = loadAll()[key];
    const ed = rehacer ? prev.edition || 1 : (prev?.edition || 0) + 1, txapelas = prev?.txapelas || 0, r = minstd(ed * 7919 + ctx.comarca.length * 31 + 13);
    const fmt = K.fmt || FMT[kind] || FMT.mano, N = fmt === 'liga8' || fmt === 'ko8' ? 8 : 16;
    const names = NAMES.filter(n => n !== you.name).sort(() => r() - 0.5);   // (nadie con tu mismo nombre)
    // rivales: de los pueblos del juego de la comarca (y de alrededor) primero; después, de otros pueblos navarros
    let towns = [...ctx.towns.map(t => ({ name: t.name, id: t.id })).filter(t => t.name !== you.town), ...TOWNS.filter(t => t !== you.town && !ctx.towns.some(x => x.name === t)).map(name => ({ name, id: null }))];
    // (por comarcas: cada rival juega por una de las otras comarcas, a suertes en cada edición; tú, por la tuya)
    if (K.comarcas) towns = COMARCAS.filter(c => c.id !== suya.id).map(c => ({ name: c.name, id: null })).sort(() => r() - 0.5);
    const townOf = (i) => towns[i % towns.length];
    // nivel de 1 (flojo) a 3 (fuerte): en cada edición, algo más difíciles
    // (y en los inventados, más o menos según cada uno: K.lv, los de promesas más flojos y los del acontecimiento del año,
    // casi todos de los fuertes)
    const lvOf = () => Math.max(1, Math.min(3, 1 + Math.floor(r() * 2.2 + Math.min(ed - 1, 3) * 0.25 + (K.lv || 0))));
    let players;
    if (kind === 'parejas') {
      // parejas del mismo pueblo: delantero y zaguero; la tuya, con tu compañero (de tu pueblo)
      const pool = names.slice(), partner = pool.pop();   // (14 nombres para las parejas rivales y uno para tu compañero)
      const rivals = Array.from({ length: N - 1 }, (_, i) => { const a = pool[i * 2], b = pool[i * 2 + 1], t = townOf(i); return { id: 'p' + i, name: `${a} · ${b}`, mates: [a, b], town: t.name, townId: t.id, lv: lvOf() }; });
      players = [{ id: 'you', name: `${you.name} · ${partner}`, mates: [you.name, partner], town: you.town, lv: 2, you: true }, ...rivals];
    } else {
      const rivals = Array.from({ length: N - 1 }, (_, i) => { const t = townOf(i); return { id: 'p' + i, name: names[i], town: t.name, townId: t.id, lv: lvOf() }; });
      players = [{ id: 'you', name: you.name, town: K.comarcas ? suya.name || you.town : you.town, lv: 2, you: true }, ...rivals];
    }
    T = { kind, fmt, comarca: ctx.comarca, comarcaName: ctx.comarcaName, venues: ctx.towns, edition: ed, txapelas, players, round: 0, matches: [], past: [], done: false, champion: null };
    // (tú, el primero; los rivales, del más fuerte al más flojo)
    const order = [0, ...players.slice(1).map((p, i) => i + 1).sort((a, b) => fuerza(T, players[b]) - fuerza(T, players[a]))];
    if (fmt === 'ko16' || fmt === 'ko8') {
      // (por eliminatorias, con los cabezas de serie repartidos: el primero y el segundo solo se ven en la final)
      const S = fmt === 'ko8' ? SERIE8 : SERIE16, s = S.map(k => order[k - 1]);
      for (let i = 0; i < S.length; i += 2) T.matches.push({ a: s[i], b: s[i + 1], s: null });
    } else {
      // la liguilla: con dieciséis, cuatro grupos de cuatro con un cabeza de serie en cada uno (tú, en el primero) y los
      // demás de los otros bombos, a suertes; con ocho parejas, todas en el mismo
      if (fmt === 'grupos16') {
        T.groups = [[], [], [], []];
        for (let b = 0; b < 4; b++) { const bombo = order.slice(b * 4, b * 4 + 4); if (b) bombo.sort(() => r() - 0.5); bombo.forEach((p, g) => T.groups[g].push(p)); }
      } else T.groups = [order.slice()];
      const js = T.groups.map(jornadas);
      T.sched = js[0].map((_, j) => js.flatMap(g => g[j]));
      T.matches = T.sched[0].map(([a, b]) => ({ a, b, s: null }));
    }
    save(T);
  }
  return T;
}
/** La clasificación de un grupo de la liguilla: [{ p, j, g, tf, tc }] por partidos ganados, la diferencia de tantos y
 *  los tantos a favor. */
export function clasificacion(T, g = 0) {
  const row = new Map((T.groups?.[g] || []).map(p => [p, { p, j: 0, g: 0, tf: 0, tc: 0 }]));
  for (const P of T.past) if (P.liga) for (const m of P.matches) {
    const A = row.get(m.a), B = row.get(m.b); if (!A || !B || !m.s) continue;
    A.j++; B.j++; A.tf += m.s[0]; A.tc += m.s[1]; B.tf += m.s[1]; B.tc += m.s[0]; (m.s[0] > m.s[1] ? A : B).g++;
  }
  return [...row.values()].sort((x, y) => y.g - x.g || (y.tf - y.tc) - (x.tf - x.tc) || y.tf - x.tf || x.p - y.p);
}
// los cruces de después de la liguilla: con un grupo, el primero contra el cuarto y el segundo contra el tercero; con
// cuatro, el primero de cada grupo contra el segundo de otro (los del mismo grupo, cada uno en una mitad del cuadro)
function cruces(T) {
  const st = T.groups.map((_, g) => clasificacion(T, g).map(x => x.p));
  if (st.length === 1) { const s = st[0]; return [[s[0], s[3]], [s[1], s[2]]]; }
  const [A, B, C, D] = st; return [[A[0], B[1]], [C[0], D[1]], [B[0], A[1]], [D[0], C[1]]];
}
/** Tu partido de la ronda: { rival, target, level, round, ri, liga } (o null si ya estás fuera o ha terminado). */
export function yourMatch(T) {
  if (T.done) return null;
  const m = T.matches.find(x => T.players[x.a].you || T.players[x.b].you); if (!m) return null;
  const rv = T.players[T.players[m.a].you ? m.b : m.a], R = planOf(T)[T.round], level = rv.lv >= 3 ? 'dificil' : rv.lv <= 1 ? 'facil' : 'normal';
  const o = { target: R.target, round: R.name, ri: T.round, liga: R.liga != null, level };
  // (por parejas: el delantero rival juega con su nombre y sus cualidades; con él, su zaguero, y contigo, tu compañero)
  if (T.kind === 'parejas') { const yp = T.players.find(p => p.you); return { rival: rv, pairs: true, stats: mateStats(rv, 0), mate: { name: rv.mates[1], stats: mateStats(rv, 1) }, partner: { name: yp.mates[1], stats: mateStats(yp, 1) }, ...o }; }
  return { rival: rv, stats: statsOf(rv), ...o };
}
/** Apunta tu resultado (o null si ya estás eliminado), simula el resto de la ronda y prepara la siguiente. */
export function playTorneoRound(T, you = null, rival = null) {
  const plan = planOf(T), R = plan[T.round], N = plan[T.round + 1], r = minstd(T.edition * 101 + T.round * 7);
  for (const m of T.matches) {
    const A = T.players[m.a], B = T.players[m.b];
    if ((A.you || B.you) && you != null) m.s = A.you ? [you, rival] : [rival, you];
    else {
      const tt = tantosDe(R.target), pa = clamp01(0.5 + (fuerza(T, A) - fuerza(T, B)) * 0.03), aw = r() < pa, lose = Math.floor(r() * tt * 0.85);
      m.s = aw ? [tt, lose] : [lose, tt];
    }
  }
  T.past.push({ name: R.name, matches: T.matches.map(m => ({ ...m })), ...(R.liga != null ? { liga: true } : {}) });
  if (!N) {
    const m = T.matches[0], w = m.s[0] > m.s[1] ? m.a : m.b;
    T.done = true; T.champion = w;
    if (T.players[w].you) T.txapelas = (T.txapelas || 0) + 1;
  } else {
    // (la jornada siguiente de la liguilla, los cruces al acabarla o, en las eliminatorias, los ganadores de dos en dos)
    const w = T.matches.map(m => m.s[0] > m.s[1] ? m.a : m.b), pares = [];
    for (let i = 0; i < w.length; i += 2) pares.push([w[i], w[i + 1]]);
    T.round++;
    T.matches = (N.liga != null ? T.sched[N.liga] : R.liga != null ? cruces(T) : pares).map(([a, b]) => ({ a, b, s: null }));
  }
  save(T);
  return T;
}
export const youOut = (T) => !T.done && !T.matches.some(m => T.players[m.a].you || T.players[m.b].you);

// ---------------------------------------------------------------- pantalla: el cuadro del torneo
// Como en las retransmisiones: a la izquierda tu próximo partido con las dos cartas (tú de azul, el rival de colorado,
// con su media y sus cualidades; tocar la del rival abre su ficha) y a la derecha el cuadro, con las líneas que unen
// cada eliminatoria con la siguiente y la txapela al final. «Cómo funciona» va detrás del botón «?».
const CSS = `
.lg-card.tq-card{grid-template-columns:minmax(0,.92fr) minmax(0,1.08fr);grid-template-rows:auto minmax(0,1fr) auto;grid-template-areas:"top top" "left right" "bar right";align-items:stretch;gap:12px 16px;width:min(980px,100%)}
/* (la barra de acciones, debajo del partido, en su columna; el cuadro, a la derecha, de la cabecera abajo del todo. Antes la
   barra iba de lado a lado y le quitaba al cuadro el alto que necesitan los dieciséis: se montaba encima de la barra) */
.tq-card>.tq-top{grid-area:top}.tq-card>.tq-left{grid-area:left}.tq-card>.tq-right{grid-area:right}.lg-card.tq-card>.lg-bar{grid-area:bar}
/* (tumbado, la tarjeta a todo el alto: así cada panel sabe cuánto sitio tiene y las cartas se miden con él) */
@media (orientation:landscape){.lg-card.tq-card{height:100%}}
.tq-card>.tq-top{display:flex;align-items:center;gap:12px}.tq-top .lg-head{flex:1;min-width:0}.tq-sitio{flex:none;display:flex}
.lg-card.tq-card>.lg-bar{gap:8px}.tq-card>.lg-bar>.lg-btn{flex:1 1 0;min-width:0;padding-left:12px;padding-right:12px;white-space:nowrap}.tq-card>.lg-bar>.lg-btn.go{flex:1.7 1 0}
.tq-info{flex:none;width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.06);color:#fff;font:400 var(--fs-xl)/1 var(--f-display);cursor:pointer}
.tq-info[aria-expanded=true]{background:var(--cta);border-color:transparent}
.tq-left{display:flex;flex-direction:column;gap:8px;min-width:0}.tq-left>.tq-duel,.tq-left>.tq-banner{flex:1 1 0;min-height:0}
/* (las dos cartas y el VS, con 16 px a cada lado del VS. Sin la banda sesgada azul y rosa que iba detrás de las cartas: en el
   ordenador se veía como dos rectángulos oscuros sin sentido) */
.tq-duel{position:relative;display:flex;align-items:center;justify-content:center;gap:16px;padding:8px 6px}.lg-card.tq-card{overflow-x:hidden}
.tq-duel .gx-card{cursor:pointer}.tq-duel button.gx-card{border:0;padding:0;background:none;font:inherit}
/* (bajo el VS, a cuántos tantos, en dos líneas y sin caja: con su caja de etiqueta era más ancho que el hueco y pisaba el borde
   de las dos cartas) */
.tq-mid{flex:none;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center;min-width:56px}
.tq-mid .tq-a{max-width:5.2em;white-space:normal;text-wrap:balance;font:800 var(--fs-xs)/1.25 var(--f-cond);letter-spacing:.08em;text-transform:uppercase;color:var(--lila)}
.tq-mid b{font:400 var(--fs-4xl)/1 var(--f-display);background:linear-gradient(180deg,#fff,var(--rosa));-webkit-background-clip:text;background-clip:text;color:transparent;animation:gx-pop .5s cubic-bezier(.2,1.5,.4,1) .35s both}
.tq-mid small{font:800 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;color:var(--lila)}.tq-mid small.r{color:#fff;font-size:var(--fs-sm)}
.tq-where{font:600 var(--fs-sm)/1.3 var(--f-cond);letter-spacing:.04em;text-transform:uppercase;color:var(--lila);white-space:nowrap}.tq-where b{color:#fff;font-weight:800}
.tq-left .lg-btns{grid-template-columns:1fr 1.6fr}.tq-left .lg-btns>.lg-btn:only-child{grid-column:1/-1}
/* (Salir y ¡A jugar! siempre en una fila, también de pie en el móvil: antes, ahí, uno encima del otro) */
.tq-left .lg-btns .lg-btn.go{grid-column:auto}
/* (movimiento: las dos cartas flotan despacio, cada una a su ritmo; el VS late; las eliminatorias del cuadro entran columna a
   columna y las losas del menú, una tras otra. Las animaciones comunes, en futbol/liga.js) */
.tq-duel .gx-card.pop{animation:gx-pop .5s cubic-bezier(.2,1.5,.4,1) var(--d,0s) both,lg-flota 4.4s ease-in-out calc(1.2s + var(--d,0s) * 8) infinite}
.tq-mid b{animation:gx-pop .5s cubic-bezier(.2,1.5,.4,1) .35s both,lg-latido 2.6s ease-in-out 1.3s infinite}
.tq-rd .tq-m{animation:lg-sube .4s ease-out backwards}.tq-rd:nth-child(1) .tq-m{animation-delay:.3s}.tq-rd:nth-child(2) .tq-m{animation-delay:.42s}.tq-rd:nth-child(3) .tq-m{animation-delay:.54s}.tq-rd:nth-child(4) .tq-m{animation-delay:.66s}
.tq-vista button{animation:lg-pop .45s cubic-bezier(.2,1.4,.4,1) .35s backwards}.tq-vista button+button{animation-delay:.42s}
.tq-tiles>.tq-tile{animation:lg-sube .5s cubic-bezier(.2,.9,.3,1.1) backwards}.tq-tiles>.tq-tile:nth-child(2){animation-delay:.08s}.tq-tiles>.tq-tile:nth-child(3){animation-delay:.16s}.tq-tiles>.tq-tile:nth-child(4){animation-delay:.24s}.tq-tiles>.tq-tile:nth-child(n+5){animation-delay:.32s}
.tq-banner{display:flex;align-items:center;justify-content:center;gap:16px;padding:8px}.tq-bt{flex:0 1 auto;min-width:0;display:flex;flex-direction:column;gap:4px;text-align:left}.tq-banner:not(:has(.gx-card)) .tq-bt{align-items:center;text-align:center}
.tq-banner small{font:800 var(--fs-sm)/1.15 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;color:var(--rosa)}
.tq-banner b{font:400 var(--fs-3xl)/1 var(--f-display);text-transform:uppercase}.tq-banner p{margin:0;font:600 var(--fs-md)/1.3 var(--f-cond);color:var(--lila)}
.tq-banner .gx-card{margin:0}
.tq-right{position:relative;min-width:0;display:flex;flex-direction:column}
.tq-br{position:relative;flex:1;display:grid;grid-template-columns:repeat(var(--k1,2),minmax(0,1fr)) minmax(0,.9fr);gap:0 24px;min-height:0}
/* (el cuadro de dieciséis: cuatro columnas algo más juntas y los octavos, más finos, para que quepan los ocho partidos) */
.tq-br.k4{gap:0 14px;grid-template-columns:repeat(4,minmax(0,1fr))}.tq-br.k4 .tq-rd:first-child .tq-ms{gap:2px}
/* (las cuatro columnas del mismo ancho y cada casilla sin relleno de sobra: en el iPhone SE y de pie, los nombres de la final
   y «Txapela» se acortaban) */
.tq-br.k4 .tq-m>div{gap:3px}.tq-br.k4 .tq-m b{min-width:0}.tq-br.k4 .tq-cup{letter-spacing:.04em}
.tq-br[hidden],.tq-liga[hidden]{display:none}.tq-rd h4 .tq-c{display:none}
/* las pestañas de la liguilla y el cuadro, y la clasificación de cada grupo (los que pasan, en blanco, con la raya debajo) */
.tq-vista{display:flex;gap:6px;margin:0}
.tq-vista button{min-height:34px;padding:4px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.06);color:#fff;font:700 var(--fs-xs)/1.1 var(--f-cond);letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
.tq-vista button[aria-pressed=true]{background:var(--cta);border-color:transparent;box-shadow:0 0 12px rgba(255,43,214,.4)}
.tq-liga{flex:1;display:flex;flex-direction:column;min-height:0}
.tq-tabs{display:grid;gap:8px 12px;align-content:start}.tq-liga.g4 .tq-tabs{grid-template-columns:1fr 1fr}
/* (las tablas, a todo el alto que queda junto al partido: las filas respiran y abajo no queda un hueco. Con cuatro grupos,
   sin el puesto ni la columna J: el orden ya es el puesto y todos llevan los mismos partidos) */
.tq-liga .tq-tabs{flex:1;grid-auto-rows:minmax(0,1fr)}.tq-liga .tq-tab{height:100%}.tq-liga.g4 .j{display:none}
.tq-mid small{white-space:nowrap}.tq-mid small.r{white-space:normal;text-wrap:balance}.tq-mid small.r.nw{white-space:nowrap}
.tq-tab{width:100%;border-collapse:collapse;table-layout:fixed;background:rgba(18,5,42,.92);border:1px solid rgba(255,255,255,.08);font:600 var(--fs-sm)/1.15 var(--f-cond);text-transform:uppercase}
.tq-tab th{padding:3px 6px;font:800 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.06em;color:var(--lila);text-align:right;white-space:nowrap}
.tq-tab td{padding:3px 6px;text-align:right;color:var(--lila2);border-top:1px solid rgba(255,255,255,.08);font-variant-numeric:tabular-nums;white-space:nowrap}
.tq-tab th.n{width:1.8em}.tq-tab th.c{width:2.2em}.tq-tab th.d{width:2.9em}.tq-tab th:nth-child(2){text-align:left;color:var(--rosa)}.tq-tab td:first-child,.tq-tab td:nth-child(2){text-align:left}
.tq-tab td span{display:block;overflow:hidden;text-overflow:ellipsis}
.tq-tab tr.q td{color:#fff}.tq-tab tr.q td:first-child{color:var(--rosa);font-weight:800}.tq-tab tr.corte td{border-bottom:2px solid rgba(255,43,214,.55)}
.tq-tab tr.you td:nth-child(2){font-weight:800;color:#fff}.tq-tab tr.you td span::before{content:'';display:inline-block;width:6px;height:6px;margin:0 8px 1px 0;border-radius:1px;background:var(--fx);transform:skewX(-20deg)}
.tq-br svg.tq-lines{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.tq-lines path{fill:none;stroke:rgba(201,178,255,.35);stroke-width:2}.tq-lines path.you{stroke:var(--fx);filter:drop-shadow(0 0 4px rgba(255,43,214,.8))}
.tq-lines path{stroke-dasharray:400;stroke-dashoffset:400;animation:tq-draw .7s ease-out .35s forwards}@keyframes tq-draw{to{stroke-dashoffset:0}}
.tq-rd{display:flex;flex-direction:column;min-width:0}
/* (la ronda y, debajo, a cuántos tantos: en una sola línea, «Cuartos de final · a 5» pisaba la columna de al lado) */
.tq-rd h4{margin:0 0 4px;font:800 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.06em;text-transform:uppercase;color:var(--lila);white-space:nowrap}.tq-rd h4 small{display:block;color:var(--lila2);font:inherit;letter-spacing:.04em}
.tq-rd.now h4{color:var(--rosa)}
/* (en los móviles más estrechos, la ronda sin «a 5»: si no, los rótulos de las columnas se pisan; los tantos van en la carta del partido) */
@media (orientation:landscape) and (max-width:760px){.tq-rd h4 small{display:none}}
.lg-match{overflow:hidden}   /* (lo que flota y late no hace desplazar la tarjeta) */
/* (móvil tumbado muy bajo, 320 a 360 px, el iPhone SE de 2016: el cuadro de dieciséis no cabe entero y se desplaza dentro
   de su panel; nunca se monta encima de la barra ni del partido) */
@media (orientation:landscape) and (max-height:360px){.tq-card .lg-ph{min-height:26px}.tq-right{overflow-y:auto;overflow-x:hidden}.tq-card>.lg-bar>.lg-btn{padding-left:8px;padding-right:8px}.tq-card>.lg-bar>.lg-btn.go{flex:1.4 1 0}}
/* (y las rondas del cuadro en una palabra, «Cuartos», «Semis»: «Cuartos de final» ocupaba dos líneas y la última
   eliminatoria se cortaba por abajo) */
@media (orientation:landscape) and (max-width:760px) and (max-height:520px){.tq-rd h4 .tq-l{display:none}.tq-rd h4 .tq-c{display:inline}.lg-card.tq-card{grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr)}.tq-rd h4{white-space:normal;letter-spacing:.02em}.tq-duel{gap:12px}.tq-mid b{font-size:var(--fs-2xl)}
.tq-br.k4{gap:0 10px}.tq-card .tq-br.k4 .tq-m>div{padding:0 6px 0 4px}.tq-br.k4 .tq-m .you span::before{margin-right:4px}}
.tq-ms{flex:1;display:flex;flex-direction:column;justify-content:space-around;gap:4px}
/* (cada eliminatoria, del ancho de su columna: antes la casilla se ensanchaba con el nombre y los tantos quedaban fuera,
   cortados; ahora, si el nombre no cabe, se acorta él y los tantos siempre se ven) */
.tq-m{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1fr);overflow:hidden;background:rgba(18,5,42,.92);border:1px solid rgba(255,255,255,.08);border-radius:6px;}
.tq-m.me{background:linear-gradient(rgba(255,122,200,.24),rgba(255,122,200,.24)),rgba(18,5,42,.92)}
.tq-m>div{display:flex;align-items:center;gap:4px;padding:2px 8px;min-height:22px;font:600 var(--fs-sm)/1.15 var(--f-cond);letter-spacing:0;text-transform:uppercase}
.tq-m>div+div{border-top:1px solid rgba(255,255,255,.08)}
.tq-m span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tq-m small{display:none}
.tq-m b{font:400 var(--fs-md)/1 var(--f-display);min-width:14px;text-align:right}
.tq-m .w{color:#fff;font-weight:800}.tq-m .w b{color:var(--rosa)}.tq-m .l{color:var(--lila2)}.tq-m .you span{color:#fff;font-weight:800}.tq-m .you span::before{content:'';display:inline-block;width:6px;height:6px;margin:0 8px 1px 0;border-radius:1px;background:var(--fx);transform:skewX(-20deg)}
.tq-m.ph>div{color:rgba(201,178,255,.4)}
.tq-fin{justify-content:center}.tq-finm{position:relative}.tq-fin .tq-cup{position:absolute;left:0;right:0;top:100%}
.tq-cup{display:flex;flex-direction:column;align-items:center;gap:4px;margin-top:8px;text-align:center;font:800 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;color:var(--lila)}
.tq-cup .ico{width:64px;height:64px;filter:drop-shadow(0 0 10px rgba(255,43,214,.5));animation:tq-float 3s ease-in-out infinite}@keyframes tq-float{50%{transform:translateY(-4px)}}
.tq-cup b{color:#fff;font:400 var(--fs-md)/1.1 var(--f-display)}
/* «Cómo funciona», al tocar «?»: una ventanita encima de la pantalla, debajo de la cabecera, entera y que se cierra al
   tocarla. Antes iba como una fila más al pie y, con la pantalla llena, se montaba encima de las tablas y los botones */
.lg-how.tq-how{position:absolute;z-index:5;left:16px;right:16px;top:64px;max-height:calc(100% - 76px);overflow-y:auto;margin:0;padding:12px 16px;border-radius:16px;background:#1c0b3a;border:1px solid rgba(255,255,255,.08);box-shadow:0 12px 32px rgba(0,0,0,.55);cursor:pointer}.lg-how.tq-how[hidden]{display:none}
.tq-txa{display:flex;align-items:center;gap:12px}.tq-txa>.ico{width:52px;height:52px;flex:none}
/* menú de pelota: losas grandes como el menú de un juego de deportes, cada una con su figura. Las figuras, del mismo alto
   en todas: la losa de la colección, con tres, algo más ancha y la del partido libre, con una, algo más estrecha; así
   salen lo más grandes posible */
.tq-tiles{display:grid;grid-template-columns:1fr 1.08fr .8fr 1.12fr;gap:12px;min-height:0}.tq-tiles.n3{grid-template-columns:1fr .8fr 1.12fr}.tq-tiles.n5{grid-template-columns:1fr 1.08fr 1fr .78fr 1.05fr}
.tq-tile{position:relative;overflow:hidden;isolation:isolate;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start;gap:2px;min-height:190px;padding:12px calc(16px + 8px);border:1px solid rgba(255,255,255,.08);color:#fff;text-align:left;cursor:pointer;font:inherit;
  background:linear-gradient(160deg,var(--t1,#3b1590),var(--t2,#12052a) 75%);border-radius:8px;transition:transform .15s,border-color .15s}

.tq-tile::after{content:'';position:absolute;top:-10%;bottom:-10%;left:0;width:40%;z-index:2;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);transform:translateX(-160%) skewX(-18deg);animation:gx-sweep 6s ease-in-out var(--d,0s) infinite;pointer-events:none}
.tq-tile:active{transform:scale(.97)}.tq-tile:hover{border-color:var(--rosa)}
/* (la ilustración arriba, centrada y apoyada abajo, y el texto debajo: nunca se pisan) */
.tq-tile .figs{flex:1 1 0;min-height:0;align-self:stretch;display:flex;justify-content:center;align-items:flex-end;margin:0 -8px 8px;pointer-events:none;position:relative}
/* (las figuras, todas del mismo alto en las cuatro losas: --fh, el mayor que cabe en todas, lo pone el menú. Apoyadas
   abajo y, con dos o tres, en fila al mismo paso, un tercio de su alto, con la del centro delante; nunca se salen) */
.tq-tile .figs img.pf{position:absolute;bottom:calc((100% - var(--fh,100%)) / 2);left:50%;height:var(--fh,100%);width:auto;max-width:none;transform:translateX(calc(-50% + var(--o,0) * var(--fh,0px)));transform-origin:50% 100%;filter:drop-shadow(0 6px 14px rgba(0,0,0,.5));transition:translate .3s}
.tq-tile:hover .figs img.pf{translate:0 -3px}
.tq-tile .figs.duo img.pf:first-child{--o:-.16}.tq-tile .figs.duo img.pf:last-child{--o:.16}
.tq-tile .figs.trio img.pf:nth-child(1){--o:-.32}.tq-tile .figs.trio img.pf:nth-child(2){z-index:1}.tq-tile .figs.trio img.pf:nth-child(3){--o:.32}
.tq-tile .k{font:800 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;color:var(--rosa);text-shadow:0 1px 3px rgba(0,0,0,.8);overflow-wrap:anywhere}
.tq-tile b{font:400 var(--fs-2xl)/1 var(--f-display);text-transform:uppercase;text-shadow:0 3px 0 rgba(7,2,15,.55);max-width:100%;overflow-wrap:anywhere}
.tq-tile small{font:600 var(--fs-sm)/1.2 var(--f-cond);letter-spacing:0;color:#ece4ff;text-shadow:0 1px 3px rgba(0,0,0,.9);max-width:100%}
.tq-tile.retos{--t1:#1aa6c2;--t2:#160a3e}.tq-tile.retos .k{color:#ffd166}.tq-tile.r-peloteo{--t1:#7b2ff7;--t2:#160636}.tq-tile.r-diana{--t1:#ff2bd6;--t2:#3a0b6b}.tq-tile.r-dejada{--t1:#1aa6c2;--t2:#160a3e}
/* los retos: su dibujo arriba (el frontis, la pelota y lo que hay que hacer) y sus tres estrellas */
.tq-tile .reto-fig{align-items:center}.tq-tile .reto-fig svg{width:auto;height:100%;max-width:100%;max-height:150px;filter:drop-shadow(0 6px 14px rgba(0,0,0,.45))}
.tq-tile .reto-est{display:flex;gap:4px}.tq-tile .reto-est i{display:block;width:22px;height:22px}.tq-tile .reto-est svg{width:100%;height:100%;fill:none;stroke:#b79cff;stroke-width:1.8}.tq-tile .reto-est i.on svg{fill:#ffd166;stroke:#ffe39a}
.tq-tiles.retos3{--cw:calc((100% - 24px) / 3)}
@media (orientation:portrait){.tq-tiles.retos3{--cw:calc((100% - 12px) / 1.55)}}
.lg-bar .lg-btn.tq-pick{min-width:max-content;padding-inline:14px}.lg-bar .tq-pick~.lg-btn.go{min-width:132px}.tq-tile.main,.tq-tile.mano2{--t1:#ff2bd6;--t2:#3a0b6b}.tq-tile.evento{--t1:#ffb21a;--t2:#4a1405}.tq-tile.evento .k{color:#ffd166}.tq-tile.c45{--t1:#ff7a1a;--t2:#3b0d3a}.tq-tile.c45 .k{color:#ffb26b}.tq-tile.pair{--t1:#7b2ff7;--t2:#160636}.tq-tile.free{--t1:#5b4bff;--t2:#120a40}.tq-tile.col{--t1:#c21cff;--t2:#2a0638}.tq-tile.casa{--t1:#e0a21a;--t2:#2a0b40}.tq-tile.casa .k{color:#ffd166}
.tq-menu-foot{display:flex;justify-content:space-between;align-items:center;gap:12px}
/* el frontón del partido: un botón (el nombre corto del elegido y una flecha) que abre la lista de los frontones con una
   línea de cada uno; en el menú, a la derecha de Salir; en el torneo, junto a tus txapelas. La lista de pueblos, por comarcas */
.tq-sede{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:6px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.06);color:#fff;font:700 var(--fs-sm)/1.1 var(--f-cond);letter-spacing:.04em;text-transform:uppercase;cursor:pointer;white-space:nowrap}
.tq-sede span{font-size:var(--fs-xs);letter-spacing:.1em;color:var(--lila)}.tq-sede::after{content:'';width:7px;height:7px;margin:-4px 0 0 4px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg)}
.tq-sede[aria-expanded=true]{background:var(--cta);border-color:transparent}.tq-sede[aria-expanded=true] span{color:#fff}.tq-menu-foot .tq-sede{margin-left:auto}
.tq-pop{position:fixed;inset:0;z-index:30001}.tq-pop>div{position:fixed;display:flex;flex-direction:column;gap:4px;padding:8px;max-height:calc(100% - 16px);overflow-y:auto;border-radius:16px;border:1px solid rgba(255,255,255,.08);background:#1c0b3a;box-shadow:0 12px 32px rgba(0,0,0,.55)}
.tq-pop button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-height:44px;padding:8px 16px;border:0;border-radius:12px;background:transparent;color:#fff;text-align:left;cursor:pointer}
.tq-pop b{font:700 var(--fs-sm)/1.1 var(--f-cond);letter-spacing:.04em;text-transform:uppercase}.tq-pop small{font:600 var(--fs-xs)/1.3 var(--f-cond);color:#cbbcf0}
.tq-pop button:hover,.tq-pop button:focus-visible{background:rgba(255,255,255,.1)}.tq-pop button.on{background:var(--cta)}.tq-pop button.on small{color:#fff}
.tq-pueblos button{min-height:40px;padding:6px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.06);color:#fff;font:700 var(--fs-sm)/1.1 var(--f-cond);letter-spacing:.04em;text-transform:uppercase;cursor:pointer}
.tq-pueblos button.on{background:var(--cta);border-color:transparent;box-shadow:0 0 12px rgba(255,43,214,.45)}
.tq-pueblos{display:flex;flex-direction:column;gap:12px;min-height:0;overflow-y:auto}.tq-pueblos h3{margin:0 0 6px;font:800 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;color:var(--rosa)}
.tq-pueblos section>div{display:flex;flex-wrap:wrap;gap:6px}
@media (orientation:landscape) and (max-height:520px){
.lg-card.tq-card{gap:4px 16px;padding:8px 16px}.tq-card .lg-pn{padding:4px 10px 6px;gap:4px}.tq-txa>.ico{width:40px;height:40px}.tq-top .lg-head h2{font-size:var(--fs-xl)}
.tq-duel{padding:0 4px}.tq-mid b{font-size:var(--fs-3xl)}.tq-left{gap:4px}.tq-card .lg-bar .lg-btn{min-height:44px}
.tq-m>div{min-height:20px;padding:1px 8px;font-size:var(--fs-xs)}.tq-m b{font-size:var(--fs-sm)}.tq-cup{margin-top:4px}.tq-cup .ico{width:48px;height:48px}
.tq-br.k4 .tq-rd h4 .tq-l{display:none}.tq-br.k4 .tq-rd h4 .tq-c{display:inline}.tq-liga.g4 .j{display:none}.tq-tab th.n{width:1.5em}.tq-tab th.c{width:1.6em}.tq-tab th.d{width:2.3em}.tq-tab td,.tq-tab th{padding-left:3px;padding-right:3px}.tq-liga.g4 .tq-tab td:nth-child(2),.tq-liga.g4 .tq-tab th:nth-child(2){padding-left:6px}.tq-br.k4 .tq-m>div{min-height:16px;padding:0 8px 0 6px}.tq-br.k4 .tq-m b{font-size:var(--fs-xs)}.tq-br.k4 .tq-rd h4{margin-bottom:2px}
.tq-br.k4 .tq-rd:first-child .tq-ms{gap:1px}.tq-br.k4 .tq-m>div{min-height:0;line-height:1.05}.tq-br.k4 .tq-rd h4 small{display:none}
.tq-vista button{min-height:30px;padding:2px 12px}.tq-tab td,.tq-tab th{padding:1px 6px}.tq-tab{font-size:var(--fs-xs)}.tq-tabs{gap:4px 8px}
.tq-tile{min-height:0;height:100%;padding:8px 20px}.tq-tile b{font-size:var(--fs-xl)}.tq-tiles{flex:1}.lg-card.tq-menu-card{grid-template-rows:auto minmax(0,1fr) auto;height:100%}
}
@media (max-width:900px) and (orientation:portrait){
.lg-card.tq-card{grid-template-columns:minmax(0,1fr);grid-template-rows:none;grid-template-areas:"top" "left" "right" "bar"}.tq-left>.tq-duel,.tq-left>.tq-banner{flex:none}.tq-card>.tq-top{flex-wrap:wrap}.tq-sitio{order:3;flex:1 1 100%}.tq-br{grid-template-columns:repeat(var(--k1,2),minmax(0,1fr)) minmax(0,.8fr);min-height:260px}.tq-br.k4{min-height:380px;gap:0 8px}
.tq-tiles,.tq-tiles.n3,.tq-tiles.n5{grid-template-columns:1fr 1fr}.tq-rd h4{white-space:normal}.tq-tile{min-height:150px}.tq-tiles.n3 .tq-tile.main,.tq-tiles.n5 .tq-tile.main{grid-column:1/-1}.tq-tile b{font-size:var(--fs-xl)}
.tq-tile .figs{min-height:110px}
/* (de pie, la losa del torneo a lo ancho solo con tres: con cuatro, dos filas de dos; si no, quedaba un hueco al lado de
   la colección y el pie, con Salir y el frontón, no cabía) */
/* (de pie, las dos losas de cada fila con las mismas filas, como tumbado: las figuras sobre el mismo suelo y los textos
   alineados aunque uno ocupe más líneas) */
.tq-tiles{row-gap:0}.tq-tile{display:grid;grid-row:span 4;grid-template-rows:subgrid;grid-template-columns:minmax(0,1fr);align-content:stretch;justify-items:start;margin-bottom:12px}
.tq-tile .figs{justify-self:stretch;align-self:stretch}.tq-tile>:not(.figs){align-self:end}
}
@media (max-width:460px) and (orientation:portrait){.tq-br.k4 .tq-rd h4 .tq-l{display:none}.tq-br.k4 .tq-rd h4 .tq-c{display:inline}.tq-liga.g4 .j{display:none}.tq-br.k4 .tq-m>div{padding:2px 6px 2px 4px}.tq-br.k4 .tq-m .you span::before{margin-right:4px}}
@media (max-width:360px) and (orientation:portrait){.tq-tile{padding:8px 12px}.tq-tile b{font-size:var(--fs-lg);overflow-wrap:anywhere}.tq-br{gap:0 12px}}
@media (orientation:portrait) and (min-width:600px){.tq-tile .figs{min-height:180px}}
/* tumbado: las cuatro losas en fila con las mismas filas (figura, rótulo, título y texto) para todas, así las figuras
   salen del mismo alto y los textos alineados aunque uno ocupe más líneas */
@media (orientation:landscape){
.tq-tiles{grid-template-rows:minmax(0,1fr) auto auto auto;row-gap:0}
.tq-tile{display:grid;grid-row:span 4;grid-template-rows:subgrid;grid-template-columns:minmax(0,1fr);align-content:stretch;justify-items:start;padding-left:16px;padding-right:16px}   /* (la columna, todo el ancho de la losa: si no, medía lo que su título y las figuras salían a un lado y cortadas) */
.tq-tile .figs{justify-self:stretch;align-self:stretch}.tq-tile>:not(.figs){align-self:end}
.tq-tile .k{letter-spacing:.06em}.tq-tile b{font-size:var(--fs-xl)}
}
/* (si un título no cabe en una línea, se parte en dos y el rótulo sigue pegado encima: el hueco queda debajo, antes del
   texto, y los textos de abajo, alineados en todas. Nunca empuja a las demás losas fuera de la tarjeta) */
@media (orientation:landscape){.tq-tile b{align-self:start}}
/* (en el móvil tumbado, con poco ancho y la muesca del iPhone a los lados, los títulos un punto más pequeños: caben en una
   línea y dejan sitio a las figuras) */
@media (orientation:landscape) and (max-height:520px){.tq-tile b{font-size:var(--fs-lg)}}
/* (en todas: el rótulo en una sola línea y el texto en dos como mucho; así las cinco losas respiran y se leen de un vistazo) */
.tq-tile .k{max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tq-tile small{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
/* (en pantallas altas, como el iPad tumbado, la ilustración con su altura: no se queda diminuta encima del texto) */
@media (min-height:561px) and (orientation:landscape){.tq-tile .figs{min-height:clamp(150px,calc(32vh / var(--z, 1)),300px)}}
/* el menú de pelota, en carrusel: todas las losas del mismo ancho, en fila, y se deslizan de lado con el dedo, la rueda o
   las flechas de los lados (se ven tres y un trozo de la siguiente, para que se note que hay más). Antes se repartían el
   ancho con proporciones distintas y cada una salía de un tamaño */
.tq-carr{position:relative;min-height:0;min-width:0;width:100%;display:flex;flex-direction:column}.tq-carr>.tq-tiles{flex:1 1 auto;min-width:0;width:100%}
.tq-tiles,.tq-tiles.n3,.tq-tiles.n5{--cw:clamp(150px,calc((100% - 36px) / 3.35),300px);display:grid;grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:var(--cw);grid-template-rows:minmax(0,1fr) auto auto auto;row-gap:0;column-gap:12px;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;scrollbar-width:none}
.tq-tiles::-webkit-scrollbar{display:none}
.tq-tile{scroll-snap-align:start;display:grid;grid-row:span 4;grid-template-rows:subgrid;grid-template-columns:minmax(0,1fr);align-content:stretch;justify-items:start;margin-bottom:0}
.tq-tile .figs{justify-self:stretch;align-self:stretch}.tq-tile>:not(.figs){align-self:end}
.tq-tiles.n3 .tq-tile.main,.tq-tiles.n5 .tq-tile.main{grid-column:auto}
@media (orientation:portrait){.tq-tiles,.tq-tiles.n3,.tq-tiles.n5{--cw:calc((100% - 12px) / 1.55)}.tq-tile .figs{min-height:220px}}
.tq-flecha{position:absolute;top:calc(50% - 22px);z-index:3;width:44px;height:44px;padding:0;border-radius:50%;border:1px solid rgba(255,255,255,.08);background:rgba(18,6,40,.85);color:#fff;display:grid;place-items:center;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.5)}
.tq-flecha svg{width:18px;height:18px}.tq-flecha.izq{left:4px}.tq-flecha.der{right:4px}.tq-flecha[hidden]{display:none}.tq-flecha:hover,.tq-flecha:focus-visible{border-color:var(--rosa)}
/* ordenador (pantalla grande): el menú y el cuadro a su tamaño, las figuras grandes y enteras (la losa de la colección,
   con tres pelotaris, ya no se corta) y las cartas del próximo partido más grandes */
@media (min-width:1200px) and (min-height:560px){
.lg-card.tq-card{width:min(1560px,100%);gap:16px 40px}
.lg-card.tq-menu-card{width:min(1640px,100%)}
.tq-tiles{gap:16px}
.tq-tile{padding-left:24px;padding-right:24px}.tq-tile .figs{min-height:0}
/* (el menú, a toda la pantalla: las losas ocupan el alto que queda y las figuras crecen con ellas, sin desplazar) */
.lg-card.tq-menu-card{grid-template-rows:auto minmax(0,1fr) auto;height:100%}.lg-card.tq-menu-card .tq-tiles{min-height:0;height:100%}.lg-card.tq-menu-card .tq-tile{min-height:0;height:100%}
.tq-tile b{font-size:var(--fs-2xl)}.tq-tile small{font-size:var(--fs-md)}.tq-tile .k{font-size:var(--fs-sm)}
.tq-mid b{font-size:var(--fs-5xl)}.tq-mid small.r{font-size:var(--fs-md)}.tq-mid .tq-a{font-size:var(--fs-sm)}
.tq-where{font-size:var(--fs-md)}
.tq-rd h4{font-size:var(--fs-sm)}.tq-m>div{min-height:30px;padding:4px 12px;font-size:var(--fs-md)}.tq-m b{font-size:var(--fs-lg)}.tq-br.k4 .tq-m>div{min-height:24px;padding:2px 10px;font-size:var(--fs-sm)}.tq-br.k4 .tq-m b{font-size:var(--fs-md)}.tq-tab{font-size:var(--fs-md)}.tq-tab td,.tq-tab th{padding:5px 10px}.tq-vista button{min-height:40px;font-size:var(--fs-sm)}
.tq-cup .ico{width:84px;height:84px}.tq-cup b{font-size:var(--fs-lg)}
}
/* las tarjetas de los campeonatos (noviembre de 2026): arriba, la lámina del frontón del juego con el rival de pie en la
   cancha, cada campeonato con su encuadre; abajo, en oscuro, el nombre, la ronda y contra quién, con una raya de su color
   entre las dos partes. Esquinas de 10 px, sin brillo que barre ni neón (eso, solo en las cartas de pelotari) */
.tq-carr>.cp-row{flex:1 1 auto;min-height:0;min-width:0;width:100%}
.cp-row{--cw:clamp(150px,calc((100% - 36px) / 3.35),300px);display:grid;grid-auto-flow:column;grid-auto-columns:var(--cw);gap:12px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none;padding:2px 0}
.cp-row::-webkit-scrollbar{display:none}
.cp-card{--ac:#ff4fd8;position:relative;scroll-snap-align:start;display:flex;flex-direction:column;min-width:0;min-height:0;height:100%;padding:0;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,.08);background:#150b2e;color:#fff;text-align:left;font:inherit;cursor:pointer;box-shadow:0 8px 22px rgba(4,1,12,.35);transition:transform .18s cubic-bezier(.2,.9,.3,1.1),border-color .18s;animation:lg-sube .45s cubic-bezier(.2,.9,.3,1.1) var(--d,0s) backwards}
.cp-card:hover,.cp-card:focus-visible{border-color:color-mix(in srgb,var(--ac) 55%,transparent);transform:translateY(-2px)}
.cp-card:active{transform:scale(.98)}
.cp-card:focus-visible{outline:2px solid #fff;outline-offset:2px}
.cp-mano{--ac:#ff4fd8;--fx:38%}.cp-parejas{--ac:#9b7bff;--fx:34%}.cp-cuatro{--ac:#ff8a3d;--fx:36%}.cp-evento{--ac:#ffc94a;--fx:62%}.cp-libre{--ac:#3ec7e0;--fx:40%}.cp-retos{--ac:#ffd166;--fx:30%}.cp-casa{--ac:#5fdca0;--fx:46%}.cp-col{--ac:#c4a8ff;--fx:40%}
/* (arriba, la foto: el frontón pintado del juego, cada campeonato con su encuadre, y delante el rival de pie en la cancha) */
.cp-foto{position:relative;flex:1 1 0;min-height:0;display:block;overflow:hidden;isolation:isolate;background:#2a1650}
.cp-foto::before{content:'';position:absolute;inset:0;z-index:-2;background:var(--foto,none) var(--fx,30%) 50%/cover no-repeat;transform:scale(var(--fz,1));transform-origin:var(--fx,30%) 72%;transition:transform .5s cubic-bezier(.2,.9,.3,1)}
.cp-foto::after{content:'';position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(14,8,32,.08) 40%,rgba(14,8,32,.38))}
.cp-card:hover .cp-foto::before{transform:scale(calc(var(--fz,1) * 1.05))}
.cp-top{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0}
.cp-foto .cp-top{position:absolute;left:8px;right:8px;top:8px;z-index:3}
.cp-est{padding:3px 6px;border-radius:999px;background:rgba(16,9,34,.8)}
.cp-tag{display:inline-flex;align-items:center;gap:6px;min-width:0;padding:5px 10px 5px 8px;border-radius:999px;background:rgba(16,9,34,.8);font:800 var(--fs-xs)/1.1 var(--f-cond);letter-spacing:.08em;text-transform:uppercase;color:#efe8ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cp-tag::before{content:'';flex:none;width:7px;height:7px;border-radius:50%;background:var(--ac)}
.cp-tx{flex:none;display:inline-flex;align-items:center;gap:4px;padding:3px 9px 3px 5px;border-radius:999px;background:rgba(16,9,34,.8);color:#ffd166;font:800 var(--fs-sm)/1 var(--f-cond)}
.cp-txi,.cp-tx .ico,.cp-total .ico{flex:none;width:18px;height:18px}.cp-txi img,.cp-txi svg{width:100%;height:100%;display:block}
.cp-card .figs{position:absolute;left:0;right:0;top:9%;bottom:5%;display:block;margin:0;pointer-events:none;z-index:2}
.cp-card .figs::after{content:'';position:absolute;left:28%;right:28%;bottom:-3px;height:10px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.5),transparent);z-index:0}
.cp-card .figs img.pf{position:absolute;z-index:1;bottom:0;left:50%;height:var(--fh,100%);width:auto;max-width:none;transform:translateX(calc(-50% + var(--o,0) * var(--fh,0px)));filter:drop-shadow(0 6px 10px rgba(0,0,0,.4));transition:translate .2s}
.cp-card:hover .figs img.pf{translate:0 -3px}
.cp-card .figs.duo img.pf:first-child{--o:-.16}.cp-card .figs.duo img.pf:last-child{--o:.16}
.cp-card .figs.trio img.pf:nth-child(1){--o:-.32}.cp-card .figs.trio img.pf:nth-child(2){z-index:2}.cp-card .figs.trio img.pf:nth-child(3){--o:.32}
.cp-card .figs.reto-fig{display:flex;align-items:center;justify-content:center;top:18%;bottom:8%}.cp-card .figs.reto-fig::after{display:none}.cp-card .figs.reto-fig svg{position:relative;z-index:1;height:100%;width:auto;max-width:86%;padding:6px;border-radius:10px;background:rgba(16,9,34,.78)}
.cp-info{flex:none;display:flex;flex-direction:column;gap:4px;min-width:0;padding:10px 12px 12px;border-top:2px solid var(--ac);background:#150b2e}
.cp-name{font:400 var(--fs-xl)/1 var(--f-display);text-transform:uppercase;letter-spacing:.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cp-fase{font:800 var(--fs-xs)/1.2 var(--f-cond);letter-spacing:.08em;text-transform:uppercase;color:color-mix(in srgb,var(--ac) 80%,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cp-contra{font:600 var(--fs-sm)/1.2 var(--f-cond);color:#d9cff2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cp-ronda{display:flex;gap:4px;margin-top:4px}.cp-ronda i{flex:1 1 0;height:4px;border-radius:2px;background:rgba(255,255,255,.12)}
.cp-ronda i.ok{background:color-mix(in srgb,var(--ac) 55%,transparent)}.cp-ronda i.on{background:var(--ac)}
.cp-total{display:inline-flex;align-items:center;gap:6px;margin-left:auto;padding:6px 14px 6px 10px;border-radius:999px;background:rgba(255,209,102,.1);border:1px solid rgba(255,209,102,.22);color:#ffd166}
.cp-total .cp-txi{width:22px;height:22px}.cp-total b{font:400 var(--fs-xl)/1 var(--f-display)}.cp-total small{font:800 var(--fs-xs)/1 var(--f-cond);letter-spacing:.08em;text-transform:uppercase}
.cp-est{flex:none;display:flex;gap:2px}.cp-est i{display:block;width:18px;height:18px}.cp-est svg{width:100%;height:100%;fill:none;stroke:#b79cff;stroke-width:1.8}.cp-est i.on svg{fill:#ffd166;stroke:#ffe39a}
.cp-row.cp-tres{--cw:calc((100% - 24px) / 3)}.cp-tres .cp-contra{white-space:normal;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;min-height:2.4em}
@media (orientation:portrait){.cp-foto{min-height:220px}}
@media (orientation:portrait){.cp-row.cp-tres{--cw:calc((100% - 12px) / 1.55)}}
@media (orientation:landscape) and (max-height:500px){.cp-info{padding:8px 10px 10px;gap:2px}.cp-name{font-size:var(--fs-lg)}}
@media (min-width:1200px) and (min-height:700px){.cp-info{padding:14px 16px 16px}.cp-foto .cp-top{left:12px;right:12px;top:12px}.cp-name{font-size:var(--fs-2xl)}.cp-contra{font-size:var(--fs-md)}}
@media (prefers-reduced-motion:reduce){.cp-card,.cp-foto::before{animation:none;transition:none}}
`;
const TXAPELA = () => iconSVG('txapela', 64);   // (la txapela de los iconos del autor)
function card(T, p, s, w, l) {
  const P = T.players[p];
  return `<div class="${w ? 'w' : l ? 'l' : ''} ${P.you ? 'you' : ''}"><span>${esc(P.name)}<small> · ${esc(P.town)}</small></span><b>${s == null ? '' : s}</b></div>`;
}
// las eliminatorias del cuadro: las rondas de después de la liguilla (o todas, si no hay liguilla) con su número en el
// torneo (gi)
function koRounds(T) {
  const plan = planOf(T); let k0 = 0; plan.forEach((R, i) => { if (R.liga != null) k0 = i + 1; });
  return plan.slice(k0).map((R, i) => ({ R, gi: k0 + i }));
}
// (en el cuadro de dieciséis estrecho, la ronda en una palabra: si no, «Semifinales» pisaba la columna de la final)
const CORTO = { es: { 'Octavos de final': 'Octavos', 'Cuartos de final': 'Cuartos', Semifinales: 'Semis' }, eu: { 'Octavos de final': 'Zortzirenak', 'Cuartos de final': 'Laurdenak', Semifinales: 'Finalerdiak', Final: 'Finala' } };
const corto = (n) => CORTO[isEU() ? 'eu' : 'es'][n] || n;
function bracketHtml(T, hidden = false) {
  const ko = koRounds(T), K = ko.length, ns = ko.map((_, i) => 2 ** (K - 1 - i));
  const cols = ko.map(({ R, gi }, i) => {
    const ms = gi < T.past.length ? T.past[gi].matches : gi === T.round && !T.done ? T.matches : [], fin = i === K - 1;
    const rows = Array.from({ length: ns[i] }, (_, k) => { const m = ms[k]; if (!m) return '<div class="tq-m ph"><div><span>—</span></div><div><span>—</span></div></div>';
      const aw = m.s && m.s[0] > m.s[1], bw = m.s && m.s[1] > m.s[0], me = T.players[m.a].you || T.players[m.b].you;
      return `<div class="tq-m${me ? ' me' : ''}" data-r="${i}" data-k="${k}">${card(T, m.a, m.s?.[0], aw, bw)}${card(T, m.b, m.s?.[1], bw, aw)}</div>`; }).join('');
    const champ = fin ? `<div class="tq-cup">${TXAPELA()}${T.done ? `<b>${esc(T.players[T.champion].name)}</b>` : 'Txapela'}</div>` : '';
    // (la final, justo a media altura: entre las dos semifinales; la txapela, colgada debajo, sin moverla)
    const body = fin ? `<div class="tq-ms tq-fin"><div class="tq-finm">${rows}${champ}</div></div>` : `<div class="tq-ms">${rows}</div>`;
    return `<div class="tq-rd${gi === T.round && !T.done ? ' now' : ''}"><h4><span class="tq-l">${R.name}</span><span class="tq-c" data-notr>${corto(R.name)}</span><small>A ${tantosDe(R.target)} tantos</small></h4>${body}</div>`;
  }).join('');
  return `<div class="tq-br k${K}${T.kind === 'parejas' ? ' tq-pairs' : ''}" style="--k1:${K - 1}" data-n="${ns.join(',')}"${hidden ? ' hidden' : ''}>${cols}<svg class="tq-lines" aria-hidden="true"></svg></div>`;
}
// la liguilla: la clasificación de cada grupo (los que pasan, en blanco y con la raya debajo del último); ya en su
// idioma, como los frontones: el traductor no sabe de grupos
function ligaHtml(T, hidden = false) {
  if (!T.groups) return '';
  const eu = isEU(), G = T.groups.length, q = G === 1 ? 4 : 2, pairs = T.kind === 'parejas';
  const quien = pairs ? (eu ? 'Bikotea' : 'Pareja') : (eu ? 'Pilotaria' : 'Pelotari');
  const tabla = (g) => `<table class="tq-tab"><thead><tr><th class="n j"></th><th>${G > 1 ? (eu ? `${'ABCD'[g]} multzoa` : `Grupo ${'ABCD'[g]}`) : quien}</th><th class="c j" title="${eu ? 'Jokatuak' : 'Jugados'}">J</th><th class="c" title="${eu ? 'Irabaziak' : 'Ganados'}">${eu ? 'I' : 'G'}</th><th class="d" title="${eu ? 'Tanto aldea' : 'Diferencia de tantos'}">±</th></tr></thead><tbody>${clasificacion(T, g).map((x, i) => {
    const P = T.players[x.p], d = x.tf - x.tc;
    return `<tr class="${i < q ? 'q' : ''}${i === q - 1 ? ' corte' : ''}${P.you ? ' you' : ''}"><td class="n j">${i + 1}</td><td><span>${esc(P.name)}</span></td><td class="j">${x.j}</td><td>${x.g}</td><td>${d > 0 ? '+' + d : d}</td></tr>`; }).join('')}</tbody></table>`;
  // (solo las tablas: la jornada ya va en el VS del partido, la raya fucsia marca los que pasan y la regla y qué es cada
  // columna, en «?». Antes, encima, «Liguilla · jornada 1 de 3» y «Los dos primeros de cada grupo, a cuartos», y debajo
  // la leyenda: demasiado texto apilado)
  return `<div class="tq-liga g${G}" data-notr${hidden ? ' hidden' : ''}><div class="tq-tabs">${T.groups.map((_, g) => tabla(g)).join('')}</div></div>`;
}
// las líneas del cuadro: de cada par de eliminatorias a la siguiente (la de tu camino, en fucsia)
// (medidas en el cuadro sin transformaciones: las cajas entran deslizándose y, medidas con getBoundingClientRect a
// mitad de la entrada, las líneas quedaban corridas y sueltas)
function drawLines(root) {
  const br = root.querySelector('.tq-br'), svg = br?.querySelector('.tq-lines'); if (!svg || br.hidden) return;
  const ns = (br.dataset.n || '4,2,1').split(',').map(Number);
  const box = (r, k) => { const e = br.querySelector(`.tq-rd:nth-child(${r + 1}) .tq-m:nth-child(${k + 1})`); if (!e) return null;
    let x = 0, y = 0; for (let n = e; n && n !== br; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
    return { e, left: x, right: x + e.offsetWidth, mid: y + e.offsetHeight / 2 }; };
  let d = '';
  for (let r = 0; r < ns.length - 1; r++) for (let k = 0; k < ns[r]; k++) {
    const a = box(r, k), b = box(r + 1, k >> 1); if (!a || !b) continue;
    const x0 = a.right, y0 = a.mid, x1 = b.left, y1 = b.mid, xm = (x0 + x1) / 2;
    d += `<path class="${a.e.classList.contains('me') ? 'you' : ''}" d="M${x0.toFixed(1)} ${y0.toFixed(1)}H${xm.toFixed(1)}V${y1.toFixed(1)}H${x1.toFixed(1)}"/>`;
  }
  if (svg.dataset.d !== d) { svg.dataset.d = d; svg.innerHTML = d; }   // (sin volver a empezar su animación si no cambian)
}
// los pelotaris de tu próximo partido, para sus fichas: tú (y tu compañero) y el rival (y el suyo). La carta de cada
// uno abre su ficha entera (cualidades, golpes preferidos, cómo jugarle y sus datos)
function fichaList(T, m) {
  // (las temporadas de cada rival, las mismas con las que coloresPartido decide quién viste de colorado: así el año de
  // debut de su ficha cuadra con los colores del partido)
  const yp = T.players.find(p => p.you), rv = m.rival, lv = levelTier(m.level), tp = (n) => temporadas(`${n} (${rv.town})`, lv);
  if (T.kind === 'parejas') return [{ id: 'you', name: yp.mates[0], town: yp.town, side: 'you', role: 'delantero', you: true, stats: tusStats(T), record: { txapelas: T.txapelas || 0, nivel: tuPelotari().n, partidos: tuPelotari().partidos } },
    { id: 'youMate', name: yp.mates[1], town: yp.town, stats: mateStats(yp, 1), side: 'you', role: 'zaguero', temporadas: temporadas(yp.mates[1], 2) },
    { id: 'rival', name: rv.mates[0], town: rv.town, stats: mateStats(rv, 0), side: 'rival', role: 'delantero', temporadas: tp(rv.mates[0]) },
    { id: 'rivalMate', name: rv.mates[1], town: rv.town, stats: mateStats(rv, 1), side: 'rival', role: 'zaguero', temporadas: temporadas(rv.mates[1], lv) }];
  return [{ id: 'you', name: yp.name, town: yp.town, side: 'you', role: 'mano', you: true, stats: tusStats(T), record: { txapelas: T.txapelas || 0, nivel: tuPelotari().n, partidos: tuPelotari().partidos } }, { id: 'rival', name: rv.name, town: rv.town, stats: statsOf(rv), side: 'rival', role: 'mano', temporadas: tp(rv.name) }];
}
/** La media de un pelotari del torneo en su carta: la tuya sube con cada txapela; la de los rivales, con su nivel */
export const youBonus = (T) => Math.min(20, 2 + (T?.txapelas || 0) * 2);

// ---------------------------------------------------------------- tu pelotari en el campeonato
// Como elegir equipo en el FIFA: antes de la primera ronda se elige con qué pelotari juegas el campeonato entero: el tuyo
// (tu nombre y tus cualidades, que suben con cada partido) o uno de los pelotaris del juego, con su nombre, su figura, su
// pelo, su pueblo y sus cualidades (en el partido sale él o ella, con su nombre a la espalda: game/fronton.js, yo). Se
// guarda en el torneo (T.yo; null, el tuyo) y se puede cambiar hasta jugar la primera ronda. Si el elegido estaba en el
// cuadro, como rival o como tu compañero, su sitio lo ocupa otro pelotari.
const hashN = (s) => [...s].reduce((a, c) => Math.imul(a, 31) + c.charCodeAt(0) | 0, 7) >>> 0;
/** Los pelotaris del juego que se pueden elegir, cada uno con su pueblo y su nivel (de 1 a 3), siempre los mismos */
export const elegibles = () => NAMES.map((name, i) => ({ name, town: TOWNS[(hashN(name) + i) % TOWNS.length], lv: 1 + hashN(name + ' nivel') % 3 }));
/** Las cualidades con que juegas este torneo: las del pelotari elegido o, con el tuyo, las tuyas */
export const tusStats = (T) => T?.yo ? pelotariStats(`${T.yo.name} ${T.yo.town}`, T.yo.lv || 2) : tusCualidades();
/** ¿Aún no se ha jugado nada? Hasta entonces se puede cambiar de pelotari */
export const sinEmpezar = (T) => !!T && !T.done && !T.round && !T.past?.length && !T.matches.some(m => m.s);
/** Juegas el torneo con p ({ name, town, lv }, de elegibles) o, con null, con el tuyo (yo: { name, town }) */
export function ponPelotari(T, p, yo) {
  const Y = T.players.find(q => q.you); if (!Y) return;
  const pareja = !!Y.mates, antes = pareja ? Y.mates[0] : Y.name, nombre = p ? p.name : yo.name;
  const usados = new Set(T.players.flatMap(q => q.mates || [q.name])); usados.add(nombre);
  const libre = NAMES.find(n => !usados.has(n)) || antes;
  for (const q of T.players) {
    if (q === Y) { if (pareja && q.mates[1] === nombre) { q.mates[1] = libre; q.mst = null; } continue; }
    if (q.mates ? q.mates.includes(nombre) : q.name === nombre) {
      if (q.mates) { q.mates = q.mates.map(n => (n === nombre ? libre : n)); q.name = q.mates.join(' · '); q.mst = null; } else { q.name = libre; q.st = null; }
    }
  }
  if (pareja) { Y.mates[0] = nombre; Y.name = Y.mates.join(' · '); Y.mst = null; } else { Y.name = nombre; Y.st = null; }
  if (!KINDS[T.kind]?.comarcas) Y.town = p ? p.town : yo.town;   // (por comarcas, sigues jugando por la tuya)
  Y.lv = p ? p.lv : 2;
  T.yo = p ? { name: p.name, town: p.town, lv: p.lv } : null; T.elegido = true; save(T);
}
const EP_CSS = `
.ep-card{display:flex;flex-direction:column;gap:12px;max-height:100%}
.ep-head small{display:block;color:var(--rosa);font:800 var(--fs-sm)/1.15 var(--f-cond);letter-spacing:.1em;text-transform:uppercase}
.ep-head h2{margin:var(--t-mt) 0 0;font:400 var(--fs-2xl)/1 var(--f-display);text-transform:uppercase}
.ep-head p{margin:6px 0 0;color:var(--lila2);font:500 var(--fs-sm)/1.35 var(--f-body);max-width:60ch}
/* (la fila, sin barra de desplazamiento: en el iPhone se pintaba encima de los pueblos; arriba, sitio para que la elegida
   suba y brille sin cortarse) */
.ep-grid{display:grid;grid-auto-flow:column;grid-auto-columns:max-content;gap:12px;overflow-x:auto;overflow-y:hidden;padding:12px 6px 10px;scroll-snap-type:x proximity;scrollbar-width:none;min-height:0}
.ep-grid::-webkit-scrollbar{display:none}
.ep-it{scroll-snap-align:center;display:flex;flex-direction:column;align-items:center;gap:6px;padding:0 2px;transition:transform var(--d-encima,200ms) var(--ease,ease)}
/* la elegida: sube un poco y su borde se enciende en dorado siguiendo su silueta de escudo (antes, un recuadro de esquinas
   redondas alrededor que no casaba con la carta y se cortaba por abajo); su pueblo, en una pastilla amarilla con la marca
   verde, como los demás checks del juego */
.ep-it.on{transform:translateY(-4px)}
.ep-it.on .gx-card{filter:drop-shadow(0 0 .6px #ffd166) drop-shadow(0 0 1.4px #ffd166) drop-shadow(0 0 8px rgba(255,209,102,.5)) drop-shadow(0 10px 18px rgba(0,0,0,.5))}
.ep-it em{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;font:800 var(--fs-xs)/1.1 var(--f-cond);letter-spacing:.06em;text-transform:uppercase;color:var(--lila2);font-style:normal;white-space:nowrap}
.ep-it.on em{background:#ffd166;color:#2a1450;padding-left:5px}
.ep-it.on em::before{content:'';flex:none;width:11px;height:11px;background:#148a3f;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M4 12.5l5 5L20 6.5' fill='none' stroke='black' stroke-width='3.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M4 12.5l5 5L20 6.5' fill='none' stroke='black' stroke-width='3.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/contain no-repeat}
@media (prefers-reduced-motion:reduce){.ep-it{transition:none}.ep-it.on{transform:none}}
/* (en el móvil tumbado, la explicación en una sola línea: así queda alto para las cartas enteras, con sus cifras) */
@media (orientation:landscape) and (max-height:500px){.ep-head p{max-width:none}}
@media (orientation:portrait){.ep-grid{grid-auto-flow:row;grid-template-columns:repeat(auto-fill,minmax(var(--epw,120px),1fr));overflow-x:hidden;overflow-y:auto;justify-items:center}}
`;
/** La pantalla de elegir pelotari: tu carta y las de los pelotaris del juego, y abajo «Jugar con …». yo: { name, town }.
 *  Devuelve true si se ha elegido (y ya está puesto en el torneo) */
export function eligePelotari(T, yo) {
  if (!document.getElementById('ep-css')) { const st = document.createElement('style'); st.id = 'ep-css'; st.textContent = EP_CSS; document.head.appendChild(st); }
  const eu = isEU(), lang = eu ? 'eu' : 'es', L = elegibles(), pairs = T.kind === 'parejas', role = pairs ? 'Del' : 'Mano';
  let sel = T.yo?.name || '';   // ('' es el tuyo)
  return new Promise(res => {
    // (la carta, del alto que deja la pantalla: tumbado, el de la fila; de pie, unas tres por fila)
    const tumbado = innerWidth > innerHeight; let w = Math.round(tumbado ? Math.max(88, Math.min(176, (innerHeight - 268) / CARTA_ALTO)) : Math.max(96, Math.min(150, (innerWidth - 80) / 3)));
    const it = (name, town, stats, bonus, nota, i, mia = false) => `<div class="ep-it${(mia ? '' : name) === sel ? ' on' : ''}" data-p="${esc(mia ? '' : name)}">${pelotariCard({ name, town, stats, side: 'azul', role, w, bonus, tag: 'button', attr: `data-p="${esc(mia ? '' : name)}" aria-label="${esc(name)}"`, pop: true, d: i * 0.03, lang, yo: mia })}<em>${esc(nota)}</em></div>`;
    const cartas = () => [it(yo.name, yo.town, tusCualidades(), youBonus(T), eu ? 'Zu' : 'Tú', 0, true),
      ...L.map((p, i) => it(p.name, p.town, pelotariStats(`${p.name} ${p.town}`, p.lv), (p.lv - 2) * 3, p.town, i + 1))].join('');
    const nombre = () => sel || (eu ? 'nirea' : 'el mío');
    const r = lgPanel(`<div class="ep-head"><small>${esc((KINDS[T.kind] || KINDS.mano).full)} · ${esc(T.comarcaName || '')}</small><h2>${eu ? 'Aukeratu zure pilotaria' : 'Elige tu pelotari'}</h2>
      <p>${eu ? 'Harekin jokatuko duzu txapelketa osoa. Lehen txandara arte alda dezakezu.' : 'Con él o con ella juegas todo el campeonato. Lo puedes cambiar hasta la primera ronda.'}</p></div>
      <div class="ep-grid" style="--epw:${w + 8}px">${cartas()}</div>
      <div class="lg-bar"><button class="lg-btn" data-a="back">${eu ? 'Itzuli' : 'Volver'}</button><button class="lg-btn go" data-a="ok">${eu ? 'Jokatu: ' : 'Jugar con '}<span class="ep-n">${esc(nombre())}</span></button></div>`);
    r.firstElementChild.classList.add('ep-card');
    // (tumbado, la carta se calcula con el alto de la pantalla, pero lo que de verdad queda para la fila depende del aparato:
    // el notch y la barra de abajo del iPhone, las barras de Safari. Se mide y, si la carta con su pueblo no cabe entera,
    // se vuelven a pintar las cartas un poco más pequeñas: antes la elegida se cortaba por abajo)
    const encaja = () => { const g = r.querySelector('.ep-grid'), e = g?.querySelector('.ep-it'); if (!tumbado || !g || !e) return;
      const cs = getComputedStyle(g), sobra = e.offsetHeight + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) - g.clientHeight;
      // (no por debajo de 86 px: más estrecha, la carta ya no enseña sus cifras, sport.css)
      if (sobra <= 0) return; const w2 = Math.max(86, Math.floor(w - sobra / CARTA_ALTO) - 1); if (w2 >= w) return;
      w = w2; g.style.setProperty('--epw', `${w + 8}px`); g.innerHTML = cartas(); };
    requestAnimationFrame(() => { encaja(); r.querySelector('.ep-it.on')?.scrollIntoView?.({ block: 'nearest', inline: 'center' }); });
    const fin = (ok) => { removeEventListener('keydown', key, true); lgFuera(r); res(ok); };
    const key = (e) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); if (!T.elegido) { T.elegido = true; save(T); } fin(false); } };
    addEventListener('keydown', key, true);
    r.addEventListener('click', (e) => {
      const c = e.target.closest('[data-p]');
      if (c && !e.target.closest('[data-a]')) { sel = c.dataset.p; r.querySelectorAll('.ep-it').forEach(x => x.classList.toggle('on', x.dataset.p === sel)); r.querySelector('.ep-n').textContent = nombre(); return; }
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'ok') { ponPelotari(T, sel ? L.find(p => p.name === sel) : null, yo); return fin(true); }
      if (!T.elegido) { T.elegido = true; save(T); }   // (con «Volver», con el que había; no se vuelve a preguntar solo)
      fin(false);
    });
  });
}
const rivalBonus = (p) => ((p.lv || 2) - 2) * 3;
// el frontón de cada partido, a elegir antes de jugar: el de la plaza del pueblo (cada pueblo tiene el suyo, de su
// comarca), el cubierto del pueblo o el Labrit de Iruña; en Campeonatos, también el de otro pueblo (se va allí)
// (los textos, ya en su idioma: el traductor no sabe poner el nombre del pueblo delante en euskera)
// (fuera: el cubierto de otro pueblo, el del rival o uno de la comarca, o.fuera; solo en el torneo)
const SEDE = { plaza: (h) => h || (isEU() ? 'Herria' : 'Tu pueblo'), cubierto: () => isEU() ? 'Estalia' : 'Cubierto', labrit: () => 'Labrit · Iruña',
  fuera: (h, o) => isEU() ? `${o?.fuera} · estalia` : `Cubierto de ${o?.fuera}`, otro: () => isEU() ? 'Beste herri bat' : 'Otro pueblo' };
const SEDE_CORTO = { plaza: (h) => h || (isEU() ? 'Herria' : 'Pueblo'), cubierto: () => isEU() ? 'Estalia' : 'Cubierto', labrit: () => 'Labrit', fuera: (h, o) => o?.fuera || '' };
const SEDE_SUB = { plaza: () => isEU() ? 'Herriko frontoia: elizaren ondoan, udaletxeko plazan edo kalean' : 'El del pueblo: junto a la iglesia, en la plaza del ayuntamiento o en la calle', cubierto: () => isEU() ? 'Harmailak dituen pilotalekua' : 'Pabellón con grada',
  labrit: () => isEU() ? 'Finalen frontoia' : 'El frontón de las finales', fuera: () => isEU() ? 'Beste herri bateko pilotaleku estalia' : 'El pabellón de otro pueblo de la comarca',
  otro: () => isEU() ? 'Jokatu beste herri bateko frontoian' : 'Juega en el frontón de otro pueblo' };
const FRONTON = () => isEU() ? 'Frontoia' : 'Frontón';
const sedeHtml = (o, here) => !o?.sedes?.length ? '' : `<button type="button" class="tq-sede" data-sede aria-haspopup="dialog" aria-expanded="false" data-notr><span>${FRONTON()}</span>${esc(SEDE_CORTO[o.sede](here, o))}</button>`;
// (al tocarlo, la lista; lo elegido se apunta en o.sede; «Otro pueblo» abre la lista de pueblos y devuelve su id)
async function sedeClick(e, r, o, here) {
  const b = e.target.closest('[data-sede]'); if (!b) return false;
  const k = await sedeLista(b, o, here);
  if (k === 'otro') return { otro: await otroPueblo(here) };
  if (k && k !== o.sede) { o.sede = k; o.onSede?.(k); b.lastChild.textContent = SEDE_CORTO[k](here, o); }
  return true;
}
/** La lista de los frontones, junto al botón (encima si cabe): devuelve el elegido, 'otro' o null (tocando fuera o
 *  con Escape, que es «Atrás» en el mando del móvil, que copia sus botones porque es un diálogo). */
function sedeLista(btn, o, here) {
  return new Promise(res => {
    const ks = [...o.sedes, ...(o.otro ? ['otro'] : [])], pop = document.createElement('div');
    pop.className = 'tq-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', FRONTON()); pop.dataset.notr = '';
    pop.innerHTML = `<div>${ks.map(k => `<button type="button" class="${k === o.sede ? 'on' : ''}" aria-pressed="${k === o.sede}" data-k="${k}"><b>${esc(SEDE[k](here, o))}</b><small>${esc(SEDE_SUB[k]())}</small></button>`).join('')}</div>`;
    document.body.appendChild(pop); btn.setAttribute('aria-expanded', 'true');
    // (en píxeles del CSS: en la tele, la interfaz va ampliada y lo que se mide sale en píxeles de la pantalla)
    const L = pop.firstElementChild, q = btn.getBoundingClientRect(), P = L.getBoundingClientRect(), c = enCss, W = c(innerWidth), H = c(innerHeight);
    const bw = c(q.width), w = Math.max(c(P.width), bw), h = c(P.height), arriba = c(q.top) - h - 8;
    L.style.minWidth = bw + 'px'; L.style.left = Math.max(8, Math.min(W - w - 8, c(q.right) - w)) + 'px';
    L.style.top = Math.max(8, arriba >= 8 ? arriba : Math.min(H - h - 8, c(q.bottom) + 8)) + 'px';
    const fin = (k) => { removeEventListener('keydown', tecla, true); pop.remove(); btn.setAttribute('aria-expanded', 'false'); btn.focus?.(); res(k); };
    const tecla = (e) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); fin(null); } };
    addEventListener('keydown', tecla, true);
    pop.addEventListener('click', (e) => { e.stopPropagation(); const b = e.target.closest('[data-k]'); fin(b ? b.dataset.k : null); });
    (L.querySelector('.on') || L.querySelector('button'))?.focus?.();
  });
}
/** La lista de los pueblos, por comarcas, para jugar en el frontón de otro: devuelve su id (o null). */
function otroPueblo(here) {
  return new Promise(res => {
    const grupos = COMARCAS.map(c => [c, LEVELS.filter(l => esSede(l.id) && l.comarca === c.id)]).filter(([, ts]) => ts.length);
    const r = lgPanel(`<div class="lg-head" data-notr><div><small>${isEU() ? 'Esku pilota' : 'Pelota a mano'}</small><h2>${isEU() ? 'Zein frontoitan?' : '¿En qué frontón?'}</h2></div></div>
      <div class="lg-list tq-pueblos">${grupos.map(([c, ts]) => `<section><h3>${esc(c.name)}</h3><div>${ts.map(l => { const n = l.name.split(' /')[0]; return `<button type="button" class="${n === here ? 'on' : ''}" data-pueblo="${l.id}">${esc(n)}</button>`; }).join('')}</div></section>`).join('')}</div>
      <div class="lg-btns"><button class="lg-btn" data-a="no" data-notr>${isEU() ? 'Itzuli' : 'Volver'}</button></div>`);
    r.addEventListener('click', (e) => { const b = e.target.closest('[data-pueblo], [data-a]'); if (!b) return; lgFuera(r); res(b.dataset.pueblo || null); });
  });
}
// «Cómo funciona» de cada campeonato (los de antes, de ocho, con su texto de siempre; los de ahora, ya en su idioma)
function comoFunciona(T) {
  const pairs = T.kind === 'parejas', eu = isEU();
  // (lo que antes iba escrito en la pantalla: tocar la carta del rival y qué es cada columna de la liguilla. Aparte y ya en
  // su idioma: el traductor traduce cada frase de «Cómo funciona» entera)
  const G = T.groups?.length || 0, mas = ` <span data-notr>${T.done || !yourMatch(T) ? '' : eu ? 'Ukitu aurkariaren txartela bere fitxa ikusteko.' : 'Toca la carta del rival para ver su ficha.'}${!G ? ''
    : eu ? ` Ligaxkan, ${G === 1 ? 'J jokatuak, ' : ''}I irabaziak eta ± tanto aldea; marra arrosaren gainekoak igarotzen dira.` : ` En la liguilla, ${G === 1 ? 'J son los partidos jugados, ' : ''}G los ganados y ± la diferencia de tantos; pasan los que quedan encima de la raya fucsia.`}</span>`;
  if (!T.fmt) return (pairs ? '<p class="lg-how tq-how" hidden data-vm="no"><b>Cómo funciona:</b> ocho parejas de delantero y zaguero por eliminatorias (cuartos y semifinales a 5 tantos, final a 7). Juegas con tu compañero de siempre. La final, en el frontón Labrit de Iruña.</p>'
    : T.kind === 'cuatro' ? '<p class="lg-how tq-how" hidden data-vm="no"><b>Cómo funciona:</b> ocho pelotaris mano a mano por eliminatorias (cuartos y semifinales a 5 tantos, final a 7) en el Cuatro y Medio: la pelota no puede botar más allá de la raya del 4 y medio, la del suelo entre el 4 y el 5, y el saque bota entre la raya del 3 y la del 5. Juego corto, de dejadas y ganchos. La final, en el Labrit.</p>'
    : '<p class="lg-how tq-how" hidden data-vm="no"><b>Cómo funciona:</b> ocho pelotaris por eliminatorias (cuartos y semifinales a 5 tantos, final a 7). Los rivales vienen a tu frontón; la final, en el frontón Labrit de Iruña. Los demás partidos se simulan.</p>').replace('</p>', mas + '</p>');
  const txt = eu ? {
    ko16: 'hamasei pilotari kanporaketetan, benetako Buruz Buruko txapelketan bezala: final-zortzirenak 5 tantora, final-laurdenak 6ra, finalerdiak 7ra eta finala 9ra. Aurkariak zure frontoira datoz; finala, Iruñeko Labrit frontoian. Beste partidak simulatu egiten dira.',
    grupos16: "hamasei pilotari buruz buru lau t'erdian: pilotak ezin du lau eta erdiko marratik haratago bote egin (lurreko marra da, 4 eta 5 artean), eta sakeak 3ko eta 5eko marren artean egiten du bote. Lehenik, ligaxka: lauko lau multzo, hiru jardunaldi 5 tantora. Multzo bakoitzeko lehen biak final-laurdenetara (6ra), finalerdietara (7ra) eta finalera (9ra) igarotzen dira. Finala, Labriten.",
    liga8: 'aurrelari eta atzelariko zortzi bikote ligaxkan, denak denen aurka, benetako txapelketan bezala: zazpi jardunaldi 5 tantora. Lehen laurak finalerdietara (7ra) igarotzen dira, eta finala, 9ra, Iruñeko Labrit frontoian jokatzen da. Betiko lagunarekin jokatzen duzu.',
  } : {
    ko16: 'dieciséis pelotaris por eliminatorias, como en el Manomanista de verdad: octavos a 5 tantos, cuartos a 6, semifinales a 7 y final a 9. Los rivales vienen a tu frontón; la final, en el frontón Labrit de Iruña. Los demás partidos se simulan.',
    grupos16: 'dieciséis pelotaris mano a mano en el Cuatro y Medio: la pelota no puede botar más allá de la raya del 4 y medio, la del suelo entre el 4 y el 5, y el saque bota entre la raya del 3 y la del 5. Primero, la liguilla: cuatro grupos de cuatro, tres jornadas a 5 tantos. Los dos primeros de cada grupo pasan a cuartos (a 6), semifinales (a 7) y final (a 9). La final, en el Labrit.',
    liga8: 'ocho parejas de delantero y zaguero en liguilla, todas contra todas, como en el campeonato de verdad: siete jornadas a 5 tantos. Las cuatro primeras pasan a semifinales (a 7) y la final, a 9, se juega en el frontón Labrit de Iruña. Juegas con tu compañero de siempre.',
  };
  const propio = KINDS[T.kind]?.como;   // (los inventados, con el suyo)
  return `<p class="lg-how tq-how" hidden data-notr data-vm="no"><b>${eu ? 'Nola dabil:' : 'Cómo funciona:'}</b> ${propio ? propio[eu ? 'eu' : 'es'] : txt[T.fmt] || txt.ko16}${mas}</p>`;
}
/** Pantalla del torneo (here: el nombre del pueblo del frontón donde se juega; o: los frontones a elegir, ver sedeHtml:
 *  la elección se apunta en T.sede con su ronda). Devuelve 'play' | 'sim' | 'new' | 'exit'. */
const css = () => { if (!document.getElementById('tq-css')) { const st = document.createElement('style'); st.id = 'tq-css'; st.textContent = CSS; document.head.appendChild(st); } };
export function torneoPanel(T, here = null, o = null) {
  css();
  return new Promise(res => {
    const m = yourMatch(T), pairs = T.kind === 'parejas', lang = isEU() ? 'eu' : 'es', yp = T.players.find(p => p.you);
    // (el frontón del partido: el elegido para esta ronda o, si no, el que le toca: ver sedeRonda)
    // (y el cubierto de otro pueblo: el del rival o, si no es de un pueblo del juego, uno de la comarca; ver fueraDe)
    const fu = o && m ? fueraDe(T) : null; if (fu && !o.sedes.includes('fuera')) { o.sedes = [...o.sedes, 'fuera']; o.fuera = fu.name; }
    if (o && m) { o.sede = sedeDe(T, m, o.sedes); o.onSede = (k) => { T.sede = { ri: T.round, round: m.round, edition: T.edition, kind: k }; }; }
    const how = comoFunciona(T);
    // (las cartas del duelo, con el color que cada uno viste en el partido)
    const col = m ? coloresPartido(`${pairs ? m.rival.mates[0] : m.rival.name} (${m.rival.town})`, m.level, m.mate?.name, m.partner?.name).colors : { you: 'azul', rival: 'rojo' };
    const youCard = (w) => pelotariCard({ name: pairs ? yp.mates[0] : yp.name, town: yp.town, side: col.you, role: pairs ? 'Del' : 'Mano', w, bonus: youBonus(T), stats: tusStats(T), pop: true, lang, yo: !T.yo });
    // (tres franjas, como en los juegos de deportes: la cabecera; dos paneles con su rótulo, el partido y la clasificación;
    // y abajo, de lado a lado, la barra de acciones con Salir, el frontón y ¡A jugar!. Antes los botones y el frontón iban
    // apilados debajo de las cartas)
    let left, etiqueta = '', sede = '';
    if (T.done) { const C = T.players[T.champion]; left = `<div class="tq-banner">${pelotariCard({ name: C.name, town: C.town, side: C.you ? (T.tuColor || 'azul') : (T.tuColor === 'rojo' ? 'azul' : 'rojo'), role: pairs ? 'Par' : 'Mano', w: 110, bonus: C.you ? youBonus(T) : rivalBonus(C), stats: C.you ? {} : pairs ? mateStats(C, 0) : statsOf(C), pop: true, lang , yo: !!C.you})}<div class="tq-bt"><small>Txapeldun · campeón del torneo</small><p>${C.you ? '¡La txapela es tuya! Zorionak!' : `${esc(C.town)} se lleva la txapela. ¡A por la próxima!`}</p></div></div>`; }
    else if (m) {
      const rv = m.rival, rvStats = pairs ? mateStats(rv, 0) : statsOf(rv);
      etiqueta = m.liga ? `Jornada ${planOf(T)[T.round].liga + 1} de ${planOf(T).filter(R => R.liga != null).length}` : m.round;
      left = `<div class="tq-duel">${youCard(120)}<div class="tq-mid"><b>VS</b><small class="tq-a">A ${tantosDe(m.target)} tantos</small></div>${pelotariCard({ name: pairs ? rv.mates[0] : rv.name, town: rv.town, side: col.rival, role: pairs ? 'Del' : 'Mano', w: 120, bonus: rivalBonus(rv), stats: rvStats, tag: 'button', attr: 'data-f="rival" aria-label="Ficha del rival"', d: 0.08, pop: true, lang })}</div>
`;
      sede = o?.sedes?.length ? sedeHtml(o, here) : here ? `<span class="tq-where">Frontón de <b>${esc(here)}</b></span>` : '';
    } else left = `<div class="tq-banner"><div class="tq-bt"><small>Eliminado</small><b>El torneo sigue</b><p>Mira quién se lleva la txapela.</p></div></div>`;
    // (con liguilla, dos pestañas: la clasificación y el cuadro de las eliminatorias; se abre la de la ronda que toca)
    const v0 = T.groups && !T.done && planOf(T)[T.round]?.liga != null ? 'liga' : 'cuadro';
    const vistas = T.groups ? `<div class="tq-vista" data-notr>${[['liga', isEU() ? 'Ligaxka' : 'Liguilla'], ['cuadro', isEU() ? 'Koadroa' : 'Cuadro']].map(([k, t]) => `<button type="button" data-vista="${k}" aria-pressed="${k === v0}">${t}</button>`).join('')}</div>` : '';
    const btns = T.done ? '<button class="lg-btn go" data-a="new">Nuevo torneo</button>' : m ? '<button class="lg-btn go" data-a="play">¡A jugar!</button>' : '<button class="lg-btn go" data-a="sim">Siguiente ronda</button>';
    const rotulo = m ? 'Próximo partido' : T.done ? 'Final del torneo' : 'Tu torneo';
    const ph = `<div class="lg-ph"><span>${rotulo}</span>${etiqueta ? `<span class="lg-chip">${esc(etiqueta)}</span>` : ''}</div>`;
    // (el cuadro sin rótulo encima cuando no hay pestañas: sus columnas ya dicen cada ronda, y así le queda el alto entero)
    const ph2 = vistas ? `<div class="lg-ph">${vistas}</div>` : '';
    // (el frontón del partido, en la cabecera junto a «?»: antes iba en la barra y no cabía con los botones)
    const head = `<div class="tq-top"><div class="lg-head tq-txa">${TXAPELA()}<div><small>${(KINDS[T.kind] || KINDS.mano).full} · edición ${T.edition}</small><h2>${KINDS[T.kind]?.global ? esc(KINDS[T.kind].name) : `Txapela de ${esc(T.comarcaName)}`}</h2></div></div>${sede ? `<div class="tq-sitio">${sede}</div>` : ''}<button class="tq-info" data-info aria-expanded="false" aria-label="Cómo funciona">?</button></div>`;
    // (hasta jugar la primera ronda, se puede cambiar de pelotari: eligePelotari)
    const bar = `<div class="lg-bar"><button class="lg-btn" data-a="exit">Salir</button>${sinEmpezar(T) ? `<button class="lg-btn tq-pick" data-a="pick">${isEU() ? 'Pilotaria' : 'Pelotari'}</button>` : ''}${btns}</div>`;
    const r = lgPanel(`${head}<div class="tq-left lg-pn">${ph}${left}</div><div class="tq-right lg-pn">${ph2}${ligaHtml(T, v0 !== 'liga')}${bracketHtml(T, v0 === 'liga')}</div>${bar}${how}`);
    const cardEl = r.firstElementChild; cardEl.classList.remove('lg-two'); cardEl.classList.add('tq-card');
    // (y otra vez si cambia el tamaño del cuadro o de sus columnas, por ejemplo al cargar las fuentes)
    // las cartas del partido (o la del campeón), a la medida del sitio que les deja su panel, medido: el ancho que queda
    // junto al VS y, tumbado, el alto (con aire para que floten). Antes salían de fórmulas con el tamaño de la ventana, que
    // no sabían de la muesca del iPhone ni de la barra: se salían del panel y se cortaban
    const cartas = () => {
      const caja = r.querySelector('.tq-duel, .tq-banner'), cs = caja ? [...caja.querySelectorAll('.gx-card')] : []; if (!cs.length) return;
      const st = getComputedStyle(caja), px = (k) => parseFloat(st[k]) || 0, tumbado = innerWidth > innerHeight;
      const grande = matchMedia('(min-width:1200px) and (min-height:560px)').matches;
      let W, H;
      if (caja.classList.contains('tq-duel')) { W = (caja.clientWidth - px('paddingLeft') - px('paddingRight') - (caja.querySelector('.tq-mid')?.offsetWidth || 0) - px('columnGap') * 2) / 2; H = caja.clientHeight - px('paddingTop') - px('paddingBottom') - 12; }
      else { W = caja.clientWidth - px('paddingLeft') - px('paddingRight') - px('columnGap') - 150; H = caja.clientHeight - px('paddingTop') - px('paddingBottom') - 12; }   // (el campeón: junto a su texto, que se queda 150 px)
      const w = Math.floor(Math.max(64, Math.min(W, tumbado ? H / CARTA_ALTO : Infinity, grande ? 220 : caja.classList.contains('tq-duel') ? 160 : 132))) + 'px';
      for (const c of cs) if (c.style.getPropertyValue('--w') !== w) c.style.setProperty('--w', w, 'important');
    };
    cartas();
    const lines = () => drawLines(r); requestAnimationFrame(lines); const ro = new ResizeObserver(() => { cartas(); lines(); }); r.querySelectorAll('.tq-br, .tq-rd, .tq-duel, .tq-banner, .tq-mid').forEach(e => ro.observe(e));
    r.addEventListener('click', async (e) => {
      if (o && await sedeClick(e, r, o, here)) return;
      const f = e.target.closest('[data-f]'); if (f && m) { const L = fichaList(T, m); openFicha(L, Math.max(0, L.findIndex(p => p.id === f.dataset.f)), lang); return; }   // (la ficha, encima del cuadro)
      const vb = e.target.closest('[data-vista]'); if (vb) { const lg = vb.dataset.vista === 'liga'; r.querySelectorAll('[data-vista]').forEach(x => x.setAttribute('aria-pressed', String(x === vb))); r.querySelector('.tq-liga').hidden = !lg; r.querySelector('.tq-br').hidden = lg; requestAnimationFrame(lines); return; }
      // (la ayuda, justo debajo de la cabecera, la mida lo que la mida; tocándola se cierra)
      const inf = e.target.closest('[data-info]'), hw = e.target.closest('.tq-how');
      if (inf || hw) { const h = r.querySelector('.tq-how'), q = r.querySelector('[data-info]'), on = !hw && h.hidden; h.hidden = !on; q.setAttribute('aria-expanded', String(on));
        if (on) { const tp = r.querySelector('.tq-top'), top = tp.offsetTop + tp.offsetHeight + 8; h.style.top = top + 'px'; h.style.maxHeight = Math.max(120, cardEl.clientHeight - top - 12) + 'px'; } return; }
      const b = e.target.closest('[data-a]'); if (!b) return; ro.disconnect(); lgFuera(r); res(b.dataset.a); });
  });
}
/** El frontón de tu partido del torneo: el que elegiste para esta ronda o el que le toca (la final, en el Labrit).
 *  sedes: los frontones que hay (townGame.sedes(): en Iruña, el del pueblo ya es el Labrit). */
// (el elegido vale para su ronda: por su número; los guardados antes, por su nombre)
export const sedeDe = (T, m, sedes = ['plaza', 'cubierto', 'labrit']) => { const S = T.sede, suya = S && S.edition === T.edition && (S.ri != null ? S.ri === T.round : S.round === m.round); return suya ? S.kind : sedeRonda(T, T.round, sedes); };
// El que le toca a cada ronda: cambia de ronda en ronda, a suertes, y nunca es el de la ronda anterior: el frontón del
// pueblo, su cubierto o el cubierto de otro pueblo (fueraDe); la final, siempre en el Labrit. A suertes con la edición:
// la misma ronda, el mismo frontón aunque se salga y se vuelva. Antes todas las rondas se jugaban en el frontón del
// pueblo («dos partidos en el mismo frontón»)
// (a suertes, pero siempre lo mismo para el mismo torneo y la misma ronda: un número de 0 a 1 de la comarca, la modalidad,
// la edición y la ronda. Con minstd las ediciones salían con los mismos frontones de dos en dos)
const azar = (T, i, k = 0) => { let h = [...`${T.comarca}${T.kind}`].reduce((a, c) => Math.imul(a, 31) + c.charCodeAt(0) | 0, T.edition * 7919 + k);
  h = Math.imul(h ^ 0x9E3779B9, 0x85EBCA6B) ^ Math.imul(i + 0x632BE5AB, 0xC2B2AE35); h ^= h >>> 16; h = Math.imul(h, 0x7FEB352D); h ^= h >>> 15; h = Math.imul(h, 0x846CA68B); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const rivalEn = (T, ms) => { const x = ms?.find(q => T.players[q.a]?.you || T.players[q.b]?.you); return x ? T.players[T.players[x.a].you ? x.b : x.a] : null; };
/** El pueblo del cubierto de fuera en una ronda: { id, name } del rival si es de un pueblo del juego; si no, uno de la
 *  comarca (o de alrededor) que no sea el tuyo, a suertes. Nunca el de una ronda anterior: cada partido del campeonato,
 *  en un frontón distinto (si ya no queda ninguno sin usar, se repite). null si no hay ninguno. */
export function fueraDe(T, ri = T.round) {
  const rv = rivalEn(T, ri < T.round ? T.past[ri]?.matches : T.matches), yo = T.players.find(q => q.you)?.town;
  const antes = new Set(); for (let j = 0; j < ri; j++) { const f = fueraDe(T, j); if (f) antes.add(f.id); }
  const vs = (T.venues || []).filter(v => v.id && v.name !== yo), a = Math.floor(azar(T, ri, 1) * Math.max(1, vs.length));
  const ops = [...(rv?.townId ? [{ id: rv.townId, name: rv.town }] : []), ...vs.slice(a), ...vs.slice(0, a)];
  return ops.find(v => !antes.has(v.id)) || ops[0] || null;
}
export function sedeRonda(T, ri, sedes = ['plaza', 'cubierto', 'labrit']) {
  // cada partido del campeonato, en un frontón distinto: el del pueblo al aire libre (solo los que tienen su entorno,
  // sedes con 'plaza', levels.js esExterior, y solo en las primeras rondas), su cubierto, el cubierto de otro pueblo (el
  // del rival o el de otra sede de la comarca, cada ronda uno) y la final en el Labrit. Desde las semifinales, siempre
  // en un frontón cerrado, como los profesionales
  const plan = planOf(T), S = T.sede?.edition === T.edition ? T.sede : null, usados = new Set(); let k = null;
  const clave = (x, i) => x === 'fuera' ? 'fuera:' + (fueraDe(T, i)?.id || '') : x;
  for (let i = 0; i <= ri; i++) {
    if (S && S.ri === i && i < ri) k = S.kind;   // (lo elegido para una ronda ya jugada)
    else if (plan[i]?.name === 'Final') k = 'labrit';
    else {
      const cerrado = plan[i]?.name === 'Semifinales', fuera = !!fueraDe(T, i);
      const orden = cerrado ? ['cubierto', 'fuera'] : i === 0 ? ['plaza', 'fuera', 'cubierto'] : ['fuera', 'plaza', 'cubierto'];
      const ops = orden.filter(x => (x === 'fuera' ? fuera : sedes.includes(x)) && !(x === 'plaza' && cerrado));
      k = ops.find(x => !usados.has(clave(x, i))) || (fuera ? 'fuera' : 'cubierto');
    }
    usados.add(clave(k, i));
  }
  return k;
}
// ---------------------------------------------------------------- retos del frontón (rules.js RETOS; pelota/game.js)
const retoT = () => (isEU() ? TEXT.eu : TEXT.es).reto || TEXT.es.reto;
const ESTR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.3l-5.8 3.1 1.2-6.5L2.6 9.4l6.5-.8z" stroke-linejoin="round"/></svg>';
// los dibujos de cada reto, con los colores del juego: el frontis morado con su chapa, la pelota y lo que hay que hacer
const FRONTIS = '<rect x="6" y="8" width="108" height="84" rx="6" fill="#2a1260" stroke="#b79cff" stroke-opacity=".5"/><rect x="6" y="80" width="108" height="12" rx="3" fill="#ff7ac8" fill-opacity=".55"/>';
const BOLA = (x, y) => `<circle cx="${x}" cy="${y}" r="7" fill="#f4efe4"/><path d="M${x - 5} ${y - 3}q5 4 10 0M${x - 5} ${y + 3}q5-4 10 0" stroke="#c9b9a0" stroke-width="1.2" fill="none"/>`;
const RETO_ART = {
  peloteo: `<svg viewBox="0 0 120 112" aria-hidden="true">${FRONTIS}<path d="M20 104 Q42 30 60 52 T100 104" fill="none" stroke="#ffd166" stroke-width="3" stroke-dasharray="6 6" stroke-linecap="round"/><path d="M24 104 Q60 18 96 104" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2" stroke-dasharray="4 7" stroke-linecap="round"/>${BOLA(60, 52)}<text x="98" y="30" fill="#fff" font-size="16" font-weight="800" text-anchor="middle" font-family="sans-serif">×15</text></svg>`,
  diana: `<svg viewBox="0 0 120 112" aria-hidden="true">${FRONTIS}<circle cx="64" cy="42" r="22" fill="#ffd166" fill-opacity=".14" stroke="#ffd166" stroke-width="4"/><circle cx="64" cy="42" r="11" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2"/><circle cx="64" cy="42" r="4.5" fill="#ff2bd6"/><path d="M22 108 Q36 70 56 48" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2.5" stroke-dasharray="5 6" stroke-linecap="round"/>${BOLA(54, 50)}</svg>`,
  dejada: `<svg viewBox="0 0 120 112" aria-hidden="true"><path d="M10 104 L36 60 H84 L110 104 Z" fill="#2a1260" stroke="#b79cff" stroke-opacity=".5"/><rect x="36" y="14" width="48" height="46" rx="4" fill="#3a1a7a" stroke="#b79cff" stroke-opacity=".5"/><rect x="36" y="52" width="48" height="8" fill="#ff7ac8" fill-opacity=".55"/><path d="M28 76 H92" stroke="#ffd166" stroke-width="3"/><text x="98" y="80" fill="#ffd166" font-size="13" font-weight="800" font-family="sans-serif">2</text><path d="M60 40 Q62 64 64 70 Q68 60 74 66" fill="none" stroke="#fff" stroke-opacity=".65" stroke-width="2.5" stroke-dasharray="4 5" stroke-linecap="round"/>${BOLA(64, 70)}</svg>`,
};
// la foto de las tarjetas: un frontón distinto para cada una, pintado con Higgsfield (src/assets/frontones-cartas, 800 px,
// unos 50 KB cada uno): el manomanista en un frontón cubierto con gradas de madera, las parejas en uno de pueblo del Baztan,
// el 4½ en uno moderno con butacas rojas y azules, los acontecimientos en la gran final con guirnaldas y la txapela, el
// partido libre junto a una iglesia del Pirineo, los retos en uno de entrenamiento al anochecer con dianas en la pared, la
// pelota en casa en el patio de un caserío y la colección en la plaza porticada de una villa medieval. Hasta el 12 de
// noviembre de 2026 todas llevaban la misma lámina del frontón del juego, que al autor no le acababa de gustar
const FONDOS = Object.fromEntries(Object.entries(import.meta.glob('../assets/frontones-cartas/*.webp', { eager: true, query: '?url', import: 'default' })).map(([k, u]) => [k.match(/([\w-]+)\.webp$/)[1], u]));
// (los campeonatos que se repiten de tipo, los otros manomanistas y 4½, toman uno de los de más, por orden, para que en la
// fila no se repita ninguno: un frontón de la Ribera, uno junto a un puente medieval, uno nevado del Pirineo, uno cubierto
// con galerías y uno en un claro del hayedo)
const MAS = ['ribera', 'puente', 'nieve', 'galerias', 'hayedo'];
const conFoto = (row, todas = null) => {
  const usadas = new Set(); let e = 0;
  for (const c of row?.querySelectorAll('.cp-card') || []) {
    let k = todas || c.className.match(/\bcp-(mano|parejas|cuatro|evento|libre|retos|casa|col)\b/)?.[1];
    if (!todas && usadas.has(k)) { while (e < MAS.length && !FONDOS[MAS[e]]) e++; if (e < MAS.length) k = MAS[e++]; }
    usadas.add(k); const u = k && FONDOS[k];
    if (u) c.style.setProperty('--foto', `url("${u}")`);
  }
};
/** Tus mejores marcas en los retos (en el perfil): { peloteo: { n, e }, … } */
export const retosMios = () => profile().retos || {};
/** Las estrellas que llevas en los tres retos (de 0 a 9) */
export const retosTotal = () => Object.keys(RETOS).reduce((a, k) => a + estrellasReto(k, retosMios()[k]?.n || 0), 0);
/** Apunta un reto acabado si mejora tu marca. r: el resultado de game.js (kind, n, estrellas). Devuelve si es récord */
export function apuntaReto(r) {
  if (!r?.kind) return false;
  const P = profile(), M = (P.retos ||= {}), m = M[r.kind] || { n: 0, e: 0 }, mejor = r.n > m.n;
  M[r.kind] = { n: Math.max(m.n, r.n), e: Math.max(m.e, r.estrellas || 0) };
  return mejor;
}
/** Los retos del frontón: una losa por reto con su dibujo, sus estrellas y tu mejor marca (o lo que hay que hacer).
 *  Devuelve el elegido ('peloteo' | 'diana' | 'dejada') o null para volver */
export function retosMenu() {
  css();
  return new Promise(res => {
    const R = retoT(), M = retosMios(), eu = isEU();
    // (las mismas tarjetas que los campeonatos: arriba, sus estrellas; en medio, su dibujo; abajo, el nombre y tu marca)
    const COL = { peloteo: 'cp-parejas', diana: 'cp-mano', dejada: 'cp-libre' };
    const tile = (k, i) => { const m = M[k] || {}, e = estrellasReto(k, m.n || 0);
      return `<button class="cp-card ${COL[k] || 'cp-retos'}" data-reto="${k}" style="--d:${(0.05 + i * 0.05).toFixed(2)}s"><span class="cp-foto"><span class="cp-top"><span class="cp-tag">${eu ? 'Erronka' : 'Reto'} ${i + 1}</span><span class="cp-est" role="img" aria-label="${R.estrellas(e)}">${[0, 1, 2].map(j => `<i class="${j < e ? 'on' : ''}">${ESTR}</i>`).join('')}</span></span>`
        + `<span class="figs reto-fig">${RETO_ART[k]}</span></span><span class="cp-info"><b class="cp-name">${R.name[k]}</b><span class="cp-fase">${m.n ? (eu ? 'Zure marka' : 'Tu mejor marca') : (eu ? 'Jokatu gabe' : 'Sin jugar')}</span><span class="cp-contra">${m.n ? R.mejor(m.n) : R.como[k]}</span></span></button>`; };
    const tot = retosTotal();
    const r = lgPanel(`<div class="lg-head tq-txa">${TXAPELA()}<div><small>${eu ? 'Frontoian' : 'En el frontón'}</small><h2>${R.titulo}</h2></div><span class="cp-total cp-total-est"><b>${tot}</b><small>/9 ${eu ? 'izar' : 'estrellas'}</small></span></div>
      <div class="tq-carr"><div class="cp-row cp-tres">${Object.keys(RETOS).map(tile).join('')}</div></div>
      <div class="tq-menu-foot"><button class="lg-btn" data-a="exit">${eu ? 'Itzuli' : 'Volver'}</button></div>`);
    r.firstElementChild.classList.add('tq-menu-card'); conFoto(r.querySelector('.cp-row'), 'retos');
    r.addEventListener('click', (e) => { const b = e.target.closest('[data-reto],[data-a]'); if (!b) return; lgFuera(r); res(b.dataset.reto || null); });
  });
}
/** Menú del pelotari: torneo individual, torneo por parejas o partido libre (here: el nombre del pueblo del frontón;
 *  T2: el torneo por parejas; o: los frontones para el partido libre, ver sedeHtml). Devuelve 'torneo' | 'torneoParejas' |
 *  'libre' | 'exit', u 'otro:<pueblo>' para jugar en el frontón de otro pueblo. */
export function pelotaMenu(T, here = null, T2 = null, o = null, T3 = null, X = []) {
  css();   // (antes solo lo ponía el cuadro del torneo: la primera vez, la txapela salía enorme)
  return new Promise(res => {
    const sub = (X) => { const m = yourMatch(X); return X.done ? 'Nueva edición' : m ? `${m.round} contra ${esc(m.pairs ? m.rival.mates[0] : m.rival.name)}` : 'Siguiente ronda'; };
    const tx = (T.txapelas || 0) + (T2?.txapelas || 0) + (T3?.txapelas || 0) + X.reduce((n, x) => n + (x?.txapelas || 0), 0), C = pelotarisCount();
    // las portadas, con los pelotaris del autor: en el torneo, tu rival de la ronda (o quien ganó); por parejas, la pareja
    // rival; en el partido libre, tú, de azul; en la colección, los tres últimos que has conocido (o tres de la plantilla)
    const who = (X) => yourMatch(X)?.rival || (X.done ? X.players[X.champion] : X.players.find(q => !q.you));
    const figOf = (X, pairs) => { const p = who(X), side = p?.you ? 'azul' : 'rojo'; return pairs ? (p?.mates || [p?.name]).slice(0, 2).map(n => pelotariFig(n, side, 'fig')).join('') : pelotariFig(p?.name, side, 'fig'); };
    const met = Object.values(profile().pelotaris || {}).sort((a, b) => (b.last || 0) - (a.last || 0)).map(c => c.name);
    const trio = [...new Set([...met, 'Oihana', 'Unai', 'Irati'])].slice(0, 3);
    const youName = T.players.find(q => q.you)?.name;
    // las tarjetas de los campeonatos (noviembre de 2026): arriba, el frontón pintado con el rival en la cancha; abajo, en
    // oscuro, el nombre, la ronda, contra quién y cuántas rondas faltan. El color de cada uno, en su etiqueta, en la raya
    // entre foto e información y en la barra de rondas. Antes, oscuras del todo con el rival pequeño en medio de un halo, y
    // antes aún, losas de degradado fuerte de color a color con el antetítulo lejos del título
    const txa = (n) => n ? `<span class="cp-tx" role="img" aria-label="${n} ${n === 1 ? 'txapela' : 'txapelas'}">${iconSVG('txapela', 18, 'cp-txi')}<b>${n}</b></span>` : '';
    const estado = (X) => {
      const m = yourMatch(X), plan = planOf(X), n = plan.length, ri = X.done ? n : Math.min(X.round, n - 1);
      const ronda = `<span class="cp-ronda" role="img" aria-label="${X.done ? 'Terminado' : `Ronda ${ri + 1} de ${n}`}">${plan.map((_, i) => `<i class="${i < ri ? 'ok' : i === ri && !X.done ? 'on' : ''}"></i>`).join('')}</span>`;
      if (X.done) { const c = X.players[X.champion]; return { fase: 'Nueva edición', contra: c?.you ? '¡La última txapela fue tuya!' : `Ganó ${esc(c?.pairs ? c.mates?.[0] : c?.name || '')}`, ronda }; }
      if (!m) return { fase: 'Fuera del cuadro', contra: 'Sigue la siguiente ronda', ronda };
      return { fase: esc(m.round), contra: `contra ${esc(m.pairs ? m.rival.mates[0] : m.rival.name)}`, ronda };
    };
    const carta = ({ a, cls, d, figs, fc = '', tag, tx = 0, name, fase = '', contra = '', ronda = '', extra = '' }) => `<button class="cp-card ${cls}" data-a="${a}" style="--d:${d}s">
      <span class="cp-foto"><span class="cp-top"><span class="cp-tag">${tag}</span>${txa(tx)}</span><span class="figs${fc ? ' ' + fc : ''}">${figs}</span></span>
      <span class="cp-info"><b class="cp-name">${name}</b>${fase ? `<span class="cp-fase">${fase}</span>` : ''}${contra ? `<span class="cp-contra"${extra}>${contra}</span>` : ''}${ronda}</span></button>`;
    const torneoCarta = (X, a, cls, d, pairs = false) => { const K = KINDS[X.kind] || KINDS.mano; return carta({ a, cls, d, figs: figOf(X, pairs), fc: pairs ? 'duo' : '', tag: esc(K.k), tx: X.txapelas || 0, name: esc(K.name), ...estado(X) }); };
    const tarjetas = [
      torneoCarta(T, 'torneo', 'cp-mano', 0.05),
      T2 ? torneoCarta(T2, 'torneoParejas', 'cp-parejas', 0.1, true) : '',
      T3 ? torneoCarta(T3, 'torneoCuatro', 'cp-cuatro', 0.15) : '',
      ...X.map((x, i) => { const K = KINDS[x.kind]; return torneoCarta(x, `t:${x.kind}`, K.evento ? 'cp-evento' : K.base === 'cuatro' ? 'cp-cuatro' : 'cp-mano', +(0.2 + i * 0.05).toFixed(2)); }),
      carta({ a: 'libre', cls: 'cp-libre', d: 0.5, figs: pelotariFig(youName, 'azul', 'fig'), tag: 'Amistoso', name: 'Partido libre', fase: `A ${tantosDe(5)} tantos`, contra: 'Mano, parejas o&nbsp;4½' }),
      carta({ a: 'retos', cls: 'cp-retos', d: 0.55, figs: RETO_ART.diana, fc: 'reto-fig', tag: `${retosTotal()}/9 ${isEU() ? 'izar' : 'estrellas'}`, name: retoT().titulo, fase: isEU() ? 'Hiru erronka' : 'Tres retos', contra: isEU() ? 'Pilotakada, itua eta dejadak' : 'Peloteo, diana y&nbsp;dejadas' }),
      camaraDisponible() ? carta({ a: 'camara', cls: 'cp-casa', d: 0.6, figs: pelotariFig(youName, 'azul', 'fig'), tag: 'Con la cámara', name: 'Pelota en casa', fase: 'En tu salón', contra: 'Tu pelotari hace lo que&nbsp;haces' }) : '',
      carta({ a: 'pelotaris', cls: 'cp-col', d: 0.65, figs: trio.map(n => pelotariFig(n, 'rojo', 'fig')).join(''), fc: 'trio', tag: 'Tu colección', name: 'Pelotaris', fase: 'Descubiertos', contra: `${C.have}/${C.total} pelotaris`, extra: ' data-pc' }),
    ].join('');
    const r = lgPanel(`<div class="lg-head tq-txa">${TXAPELA()}<div><small>${here ? `Frontón de ${esc(here)}` : 'Frontón del pueblo'}</small><h2>Pelota a mano</h2></div>${tx ? `<span class="cp-total">${iconSVG('txapela', 22, 'cp-txi')}<b>${tx}</b><small>${tx === 1 ? 'txapela' : 'txapelas'}</small></span>` : ''}</div>
      <div class="tq-carr"><button class="tq-flecha izq" aria-label="Anteriores" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button><div class="cp-row">${tarjetas}</div><button class="tq-flecha der" aria-label="Siguientes"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button></div>
      <div class="tq-menu-foot"><button class="lg-btn" data-a="exit">Salir</button>${sedeHtml(o, here)}</div>`);
    r.firstElementChild.classList.add('tq-menu-card');
    // las figuras de cada losa, del mayor alto que cabe en ella y en medio de su hueco (antes, todas del alto que cabía en
    // la más apretada, la de los tres de la colección: en el ordenador salían pequeñas y abajo). Las ilustraciones tienen el
    // mismo encuadre (el cuerpo, de ancho, un 36 % de su alto como mucho) y van en fila a un paso del 32 % de su alto
    const tiles = r.querySelector('.cp-row'); conFoto(tiles);
    const iguala = () => {
      if (!r.isConnected) { ro.disconnect(); return; }
      for (const f of tiles.querySelectorAll('.figs')) {
        const n = f.children.length || 1, h = Math.min(f.clientHeight, f.clientWidth * 0.94 / (0.36 + (n - 1) * 0.32));
        if (h > 0) f.style.setProperty('--fh', Math.floor(h) + 'px');
      }
    };
    // (el carrusel: cada flecha solo si hay más losas hacia su lado; y la rueda del ratón lo mueve de lado)
    const fl = r.querySelectorAll('.tq-flecha'), paso = () => (tiles.querySelector('.cp-card')?.offsetWidth || 200) + 12;
    const flechas = () => { const m = tiles.scrollWidth - tiles.clientWidth; fl[0].hidden = tiles.scrollLeft <= 2; fl[1].hidden = tiles.scrollLeft >= m - 2; };
    fl.forEach((b, i) => b.addEventListener('click', (e) => { e.stopPropagation(); tiles.scrollBy({ left: (i ? 1 : -1) * paso(), behavior: 'smooth' }); }));
    tiles.addEventListener('scroll', flechas, { passive: true });
    tiles.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && tiles.scrollWidth > tiles.clientWidth + 2) { tiles.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
    // (el ancho de las losas, el mismo para todas: tumbado se ven tres y media, de pie una y media; así la última asoma
    // lo bastante para que se note que hay más. Con un tope por arriba, en CSS, solo cabían casi cuatro y la cuarta salía
    // cortada por un dedo, como un error)
    const carr = tiles.parentElement, ancho = () => { const W = carr.clientWidth, v = innerWidth > innerHeight ? 3.5 : 1.55, cw = Math.floor((W - 12 * Math.floor(v)) / v) + 'px'; if (W > 0 && tiles.style.getPropertyValue('--cw') !== cw) tiles.style.setProperty('--cw', cw); };
    const ro = new ResizeObserver(() => { ancho(); iguala(); flechas(); }); ancho(); ro.observe(carr); ro.observe(tiles); tiles.querySelectorAll('.figs').forEach(f => ro.observe(f)); iguala(); flechas();
    // (la colección se abre encima y, al cerrarla, el menú sigue ahí)
    r.addEventListener('click', async (e) => {
      const s = o && await sedeClick(e, r, o, here); if (s?.otro) { ro.disconnect(); lgFuera(r); res('otro:' + s.otro); return; } if (s) return;
      const b = e.target.closest('[data-a]'); if (!b) return; if (b.dataset.a === 'pelotaris') { await pelotarisPanel(T.comarca); const c = pelotarisCount(); const s2 = b.querySelector('[data-pc]'); if (s2) s2.textContent = `${c.have}/${c.total} pelotaris`; return; } lgFuera(r); res(b.dataset.a); });
  });
}

