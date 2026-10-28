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
import { pelotariStats, temporadas, levelTier } from '../pelota/rules.js';
import { openFicha } from '../pelota/ficha.js';
import { pelotariCard } from '../ui/sportCard.js';
// los pelotaris del autor (src/ui/pelotariFig.js): sus nombres y sus figuras, también en las portadas del menú de pelota
// (las ilustraciones de antes de esas portadas siguen en src/assets/pelota, sin cargarse)
import { pelotariFig, RIVALES } from '../ui/pelotariFig.js';
import { profile } from './profile.js';
import { LEVELS } from '../data/levels.js';
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
/** Las rondas del torneo: [{ name, target, liga? }] */
export const planOf = (T) => FORMATS[T.fmt] || FORMATS.ko8;
const NAMES = RIVALES;   // (21 chicos y chicas, cada uno con su figura)
const TOWNS = ['Leitza', 'Lesaka', 'Elizondo', 'Altsasu', 'Lekunberri', 'Aoiz', 'Sangüesa', 'Estella-Lizarra', 'Tafalla', 'Olite', 'Tudela', 'Puente la Reina', 'Viana', 'Lumbier', 'Doneztebe', 'Irurtzun'];
const loadAll = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
const keyOf = (comarca, kind) => kind === 'parejas' ? comarca + ':parejas' : kind === 'cuatro' ? comarca + ':cuatro' : comarca;
/** Los tres campeonatos de pelota de cada comarca, como los de los profesionales: el Manomanista (mano a mano, en toda la
 *  cancha), el de Parejas (delantero y zaguero) y el del Cuatro y Medio (mano a mano hasta la raya del 4 y medio) */
export const KINDS = {
  mano: { name: 'Manomanista', full: 'Campeonato Manomanista', k: 'Individual' },
  parejas: { name: 'Parejas', full: 'Campeonato de Parejas', k: 'Por parejas' },
  cuatro: { name: 'Cuatro y Medio', full: 'Campeonato del Cuatro y Medio', k: 'Hasta el 4½' },
};
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
const SERIE16 = [1, 16, 8, 9, 5, 12, 4, 13, 3, 14, 6, 11, 7, 10, 2, 15];
/**
 * El torneo de la comarca en curso (o uno nuevo).
 * you: { name, town }; ctx: { comarca, comarcaName, towns: [{ id, name }] } (los pueblos del juego donde se juega:
 * primero los de la comarca y después los de alrededor)
 */
export function torneo(you, ctx, fresh = false, kind = 'mano') {
  // (el torneo terminado se sigue mostrando, con su campeón, hasta que se pide uno nuevo; uno de antes, de ocho, sin
  // ninguna ronda jugada, se rehace con el formato de ahora, en la misma edición)
  const key = keyOf(ctx.comarca, kind);
  let T = loadAll()[key];
  const rehacer = !!T && !T.fmt && !T.past?.length && !T.done;
  if (T && ((T.done && fresh) || rehacer)) T = null;
  if (!T) {
    const prev = loadAll()[key];
    const ed = rehacer ? prev.edition || 1 : (prev?.edition || 0) + 1, txapelas = prev?.txapelas || 0, r = minstd(ed * 7919 + ctx.comarca.length * 31 + 13);
    const fmt = FMT[kind] || FMT.mano, N = fmt === 'liga8' ? 8 : 16;
    const names = NAMES.filter(n => n !== you.name).sort(() => r() - 0.5);   // (nadie con tu mismo nombre)
    // rivales: de los pueblos del juego de la comarca (y de alrededor) primero; después, de otros pueblos navarros
    const towns = [...ctx.towns.map(t => ({ name: t.name, id: t.id })).filter(t => t.name !== you.town), ...TOWNS.filter(t => t !== you.town && !ctx.towns.some(x => x.name === t)).map(name => ({ name, id: null }))];
    const townOf = (i) => towns[i % towns.length];
    // nivel de 1 (flojo) a 3 (fuerte): en cada edición, algo más difíciles
    const lvOf = () => Math.min(3, 1 + Math.floor(r() * 2.2 + Math.min(ed - 1, 3) * 0.25));
    let players;
    if (kind === 'parejas') {
      // parejas del mismo pueblo: delantero y zaguero; la tuya, con tu compañero (de tu pueblo)
      const pool = names.slice(), partner = pool.pop();   // (14 nombres para las parejas rivales y uno para tu compañero)
      const rivals = Array.from({ length: N - 1 }, (_, i) => { const a = pool[i * 2], b = pool[i * 2 + 1], t = townOf(i); return { id: 'p' + i, name: `${a} · ${b}`, mates: [a, b], town: t.name, townId: t.id, lv: lvOf() }; });
      players = [{ id: 'you', name: `${you.name} · ${partner}`, mates: [you.name, partner], town: you.town, lv: 2, you: true }, ...rivals];
    } else {
      const rivals = Array.from({ length: N - 1 }, (_, i) => { const t = townOf(i); return { id: 'p' + i, name: names[i], town: t.name, townId: t.id, lv: lvOf() }; });
      players = [{ id: 'you', name: you.name, town: you.town, lv: 2, you: true }, ...rivals];
    }
    T = { kind, fmt, comarca: ctx.comarca, comarcaName: ctx.comarcaName, venues: ctx.towns, edition: ed, txapelas, players, round: 0, matches: [], past: [], done: false, champion: null };
    // (tú, el primero; los rivales, del más fuerte al más flojo)
    const order = [0, ...players.slice(1).map((p, i) => i + 1).sort((a, b) => fuerza(T, players[b]) - fuerza(T, players[a]))];
    if (fmt === 'ko16') {
      const s = SERIE16.map(k => order[k - 1]);
      for (let i = 0; i < 16; i += 2) T.matches.push({ a: s[i], b: s[i + 1], s: null });
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
      const pa = clamp01(0.5 + (fuerza(T, A) - fuerza(T, B)) * 0.03), aw = r() < pa, lose = Math.floor(r() * R.target * 0.85);
      m.s = aw ? [R.target, lose] : [lose, R.target];
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
.lg-card.tq-card{grid-template-columns:minmax(0,.92fr) minmax(0,1.08fr);grid-template-rows:auto minmax(0,1fr);align-items:stretch;gap:12px 20px;width:min(980px,100%)}
.tq-card>.tq-top{grid-column:1/-1;display:flex;align-items:center;gap:12px}.tq-top .lg-head{flex:1;min-width:0}
.tq-info{flex:none;width:44px;height:44px;border-radius:50%;border:1px solid rgba(201,178,255,.4);background:rgba(255,255,255,.06);color:#fff;font:400 var(--fs-xl)/1 var(--f-display);cursor:pointer}
.tq-info[aria-expanded=true]{background:var(--cta);border-color:transparent}
.tq-left{display:flex;flex-direction:column;gap:8px;min-width:0;justify-content:space-between}
.tq-duel{position:relative;display:flex;align-items:center;justify-content:center;gap:8px;padding:8px 0}.lg-card.tq-card{overflow-x:hidden}
.tq-duel::before{content:'';position:absolute;inset:18% -4px;z-index:-1;background:linear-gradient(90deg,rgba(91,75,255,.35),transparent 45%,transparent 55%,rgba(255,46,136,.35));transform:skewX(-14deg)}
.tq-duel .gx-card{cursor:pointer}.tq-duel button.gx-card{border:0;padding:0;background:none;font:inherit}
.tq-mid{display:flex;flex-direction:column;align-items:center;gap:2px;text-align:center;min-width:72px}
.tq-mid b{font:400 var(--fs-4xl)/1 var(--f-display);background:linear-gradient(180deg,#fff,var(--rosa));-webkit-background-clip:text;background-clip:text;color:transparent;animation:gx-pop .5s cubic-bezier(.2,1.5,.4,1) .35s both}
.tq-mid small{font:800 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;color:var(--lila)}.tq-mid small.r{color:#fff;font-size:var(--fs-sm)}
.tq-ficha{font:600 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.04em;text-transform:uppercase;color:var(--rosa);text-align:center;margin:-4px 0 0}
.tq-where{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:4px 12px;font:600 var(--fs-sm)/1.3 var(--f-cond);letter-spacing:.04em;text-transform:uppercase;color:var(--lila)}.tq-where b{color:#fff;font-weight:800}
.tq-left .lg-btns{grid-template-columns:1fr 1.6fr}.tq-left .lg-btns>.lg-btn:only-child{grid-column:1/-1}
.tq-banner{display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px;text-align:center}
.tq-banner small{font:800 var(--fs-sm)/1.15 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;color:var(--rosa)}
.tq-banner b{font:400 var(--fs-3xl)/1 var(--f-display);text-transform:uppercase}.tq-banner p{margin:0;font:600 var(--fs-md)/1.3 var(--f-cond);color:var(--lila)}
.tq-banner .gx-card{margin:4px 0}
.tq-right{position:relative;min-width:0;display:flex;flex-direction:column}
.tq-br{position:relative;flex:1;display:grid;grid-template-columns:repeat(var(--k1,2),minmax(0,1fr)) minmax(0,.9fr);gap:0 24px;min-height:0}
/* (el cuadro de dieciséis: cuatro columnas algo más juntas y los octavos, más finos, para que quepan los ocho partidos) */
.tq-br.k4{gap:0 14px}.tq-br.k4 .tq-rd:first-child .tq-ms{gap:2px}
.tq-br[hidden],.tq-liga[hidden]{display:none}.tq-rd h4 .tq-c{display:none}
/* las pestañas de la liguilla y el cuadro, y la clasificación de cada grupo (los que pasan, en blanco, con la raya debajo) */
.tq-vista{display:flex;gap:6px;margin:0 0 8px}
.tq-vista button{min-height:34px;padding:4px 16px;border-radius:999px;border:1px solid rgba(201,178,255,.35);background:rgba(255,255,255,.06);color:#fff;font:700 var(--fs-xs)/1.1 var(--f-cond);letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
.tq-vista button[aria-pressed=true]{background:var(--cta);border-color:transparent;box-shadow:0 0 12px rgba(255,43,214,.4)}
.tq-liga{flex:1;display:flex;flex-direction:column;min-height:0}
.tq-tabs{display:grid;gap:8px 12px;align-content:start}.tq-liga.g4 .tq-tabs{grid-template-columns:1fr 1fr}
.tq-tab{width:100%;border-collapse:collapse;table-layout:fixed;background:rgba(18,5,42,.92);border:1px solid rgba(201,178,255,.22);font:600 var(--fs-sm)/1.15 var(--f-cond);text-transform:uppercase}
.tq-tab th{padding:3px 6px;font:800 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.06em;color:var(--lila);text-align:right;white-space:nowrap}
.tq-tab td{padding:3px 6px;text-align:right;color:var(--lila2);border-top:1px solid rgba(201,178,255,.12);font-variant-numeric:tabular-nums;white-space:nowrap}
.tq-tab th.n{width:1.8em}.tq-tab th.c{width:2.2em}.tq-tab th.d{width:2.9em}.tq-tab th:nth-child(2){text-align:left;color:var(--rosa)}.tq-tab td:first-child,.tq-tab td:nth-child(2){text-align:left}
.tq-tab td span{display:block;overflow:hidden;text-overflow:ellipsis}
.tq-tab tr.q td{color:#fff}.tq-tab tr.q td:first-child{color:var(--rosa);font-weight:800}.tq-tab tr.corte td{border-bottom:2px solid rgba(255,43,214,.55)}
.tq-tab tr.you td:nth-child(2){font-weight:800;color:#fff}.tq-tab tr.you td span::before{content:'';display:inline-block;width:6px;height:6px;margin:0 8px 1px 0;border-radius:1px;background:var(--fx);transform:skewX(-20deg)}
.tq-ley{margin:6px 0 0;font:600 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.04em;color:var(--lila2)}
.tq-br svg.tq-lines{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.tq-lines path{fill:none;stroke:rgba(201,178,255,.35);stroke-width:2}.tq-lines path.you{stroke:var(--fx);filter:drop-shadow(0 0 4px rgba(255,43,214,.8))}
.tq-lines path{stroke-dasharray:400;stroke-dashoffset:400;animation:tq-draw .7s ease-out .35s forwards}@keyframes tq-draw{to{stroke-dashoffset:0}}
.tq-rd{display:flex;flex-direction:column;min-width:0}
/* (la ronda y, debajo, a cuántos tantos: en una sola línea, «Cuartos de final · a 5» pisaba la columna de al lado) */
.tq-rd h4,.tq-liga h4{margin:0 0 4px;font:800 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.06em;text-transform:uppercase;color:var(--lila);white-space:nowrap}.tq-rd h4 small{display:block;color:var(--lila2);font:inherit;letter-spacing:.04em}
.tq-rd.now h4,.tq-liga h4{color:var(--rosa)}.tq-liga h4 small{display:block;color:var(--lila2);font:inherit;letter-spacing:.04em}
/* (en los móviles más estrechos, la ronda sin «a 5»: si no, los rótulos de las columnas se pisan; los tantos van en la carta del partido) */
@media (orientation:landscape) and (max-width:760px){.tq-rd h4 small{display:none}}
/* (móvil tumbado pequeño: las dos cartas del partido, a la medida de su columna, que gana algo de ancho al cuadro; a 568 px
   de ancho se salían por la izquierda y tapaban el cuadro) */
@media (orientation:landscape) and (max-width:760px) and (max-height:520px){.lg-card.tq-card{grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr)}.tq-rd h4{white-space:normal;letter-spacing:.02em}.tq-duel{gap:4px}.tq-duel .gx-card{--w:min(120px,calc(18.3vw / var(--z, 1)))!important}.tq-mid{min-width:56px}.tq-mid b{font-size:var(--fs-2xl)}}
.tq-ms{flex:1;display:flex;flex-direction:column;justify-content:space-around;gap:4px}
.tq-m{position:relative;z-index:1;display:grid;border-radius:3px;overflow:hidden;background:rgba(18,5,42,.92);border:1px solid rgba(201,178,255,.22);clip-path:polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)}
.tq-m.me{border-color:var(--fx);box-shadow:0 0 14px rgba(255,43,214,.45)}
.tq-m>div{display:flex;align-items:center;gap:4px;padding:2px 8px;min-height:22px;font:600 var(--fs-sm)/1.15 var(--f-cond);letter-spacing:0;text-transform:uppercase}
.tq-m>div+div{border-top:1px solid rgba(201,178,255,.12)}
.tq-m span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tq-m small{display:none}
.tq-m b{font:400 var(--fs-md)/1 var(--f-display);min-width:14px;text-align:right}
.tq-m .w{color:#fff;font-weight:800}.tq-m .w b{color:var(--rosa)}.tq-m .l{color:var(--lila2)}.tq-m .you span{color:#fff;font-weight:800}.tq-m .you span::before{content:'';display:inline-block;width:6px;height:6px;margin:0 8px 1px 0;border-radius:1px;background:var(--fx);transform:skewX(-20deg)}
.tq-m.ph>div{color:rgba(201,178,255,.4)}
.tq-fin{justify-content:center}.tq-finm{position:relative}.tq-fin .tq-cup{position:absolute;left:0;right:0;top:100%}
.tq-cup{display:flex;flex-direction:column;align-items:center;gap:4px;margin-top:8px;text-align:center;font:800 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;color:var(--lila)}
.tq-cup .ico{width:64px;height:64px;filter:drop-shadow(0 0 10px rgba(255,43,214,.5));animation:tq-float 3s ease-in-out infinite}@keyframes tq-float{50%{transform:translateY(-4px)}}
.tq-cup b{color:#fff;font:400 var(--fs-md)/1.1 var(--f-display)}
.tq-how{grid-column:1/-1;margin:0}
.tq-txa{display:flex;align-items:center;gap:12px}.tq-txa>.ico{width:52px;height:52px;flex:none}
/* menú de pelota: losas grandes como el menú de un juego de deportes, cada una con su figura. Las figuras, del mismo alto
   en todas: la losa de la colección, con tres, algo más ancha y la del partido libre, con una, algo más estrecha; así
   salen lo más grandes posible */
.tq-tiles{display:grid;grid-template-columns:1fr 1.08fr .8fr 1.12fr;gap:12px;min-height:0}.tq-tiles.n3{grid-template-columns:1fr .8fr 1.12fr}.tq-tiles.n5{grid-template-columns:1fr 1.08fr 1fr .78fr 1.05fr}
.tq-tile{position:relative;overflow:hidden;isolation:isolate;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start;gap:2px;min-height:190px;padding:12px calc(16px + 8px);border:1px solid rgba(201,178,255,.25);border-radius:4px;color:#fff;text-align:left;cursor:pointer;font:inherit;
  background:linear-gradient(160deg,var(--t1,#3b1590),var(--t2,#12052a) 75%);clip-path:polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px);transition:transform .15s,border-color .15s}
.tq-tile::before{content:'';position:absolute;inset:0;z-index:-1;background:repeating-linear-gradient(125deg,transparent 0 14px,rgba(255,255,255,.035) 14px 15px)}
.tq-tile::after{content:'';position:absolute;top:-10%;bottom:-10%;left:0;width:40%;z-index:2;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);transform:translateX(-160%) skewX(-18deg);animation:gx-sweep 6s ease-in-out var(--d,0s) infinite;pointer-events:none}
.tq-tile:active{transform:scale(.97)}.tq-tile:hover{border-color:var(--rosa)}
/* (la ilustración arriba, centrada y apoyada abajo, y el texto debajo: nunca se pisan) */
.tq-tile .figs{flex:1 1 0;min-height:0;align-self:stretch;display:flex;justify-content:center;align-items:flex-end;margin:0 -8px 8px;pointer-events:none;position:relative}
/* (las figuras, todas del mismo alto en las cuatro losas: --fh, el mayor que cabe en todas, lo pone el menú. Apoyadas
   abajo y, con dos o tres, en fila al mismo paso, un tercio de su alto, con la del centro delante; nunca se salen) */
.tq-tile .figs img.pf{position:absolute;bottom:0;left:50%;height:var(--fh,100%);width:auto;max-width:none;transform:translateX(calc(-50% + var(--o,0) * var(--fh,0px)));transform-origin:50% 100%;filter:drop-shadow(0 6px 14px rgba(0,0,0,.5));transition:translate .3s}
.tq-tile:hover .figs img.pf{translate:0 -3px}
.tq-tile .figs.duo img.pf:first-child{--o:-.16}.tq-tile .figs.duo img.pf:last-child{--o:.16}
.tq-tile .figs.trio img.pf:nth-child(1){--o:-.32}.tq-tile .figs.trio img.pf:nth-child(2){z-index:1}.tq-tile .figs.trio img.pf:nth-child(3){--o:.32}
.tq-tile .k{font:800 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;color:var(--rosa);text-shadow:0 1px 3px rgba(0,0,0,.8);overflow-wrap:anywhere}
.tq-tile b{font:400 var(--fs-2xl)/1 var(--f-display);text-transform:uppercase;text-shadow:0 3px 0 rgba(7,2,15,.55);max-width:100%;overflow-wrap:anywhere}
.tq-tile small{font:600 var(--fs-sm)/1.2 var(--f-cond);letter-spacing:0;color:#ece4ff;text-shadow:0 1px 3px rgba(0,0,0,.9);max-width:100%}
.tq-tile.main{--t1:#ff2bd6;--t2:#3a0b6b}.tq-tile.c45{--t1:#ff7a1a;--t2:#3b0d3a}.tq-tile.c45 .k{color:#ffb26b}.tq-tile.pair{--t1:#7b2ff7;--t2:#160636}.tq-tile.free{--t1:#5b4bff;--t2:#120a40}.tq-tile.col{--t1:#c21cff;--t2:#2a0638}
.tq-menu-foot{display:flex;justify-content:space-between;align-items:center;gap:12px}
/* el frontón del partido: un botón (el nombre corto del elegido y una flecha) que abre la lista de los frontones con una
   línea de cada uno; en el menú, a la derecha de Salir; en el torneo, junto a tus txapelas. La lista de pueblos, por comarcas */
.tq-sede{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:6px 16px;border-radius:999px;border:1px solid rgba(201,178,255,.35);background:rgba(255,255,255,.06);color:#fff;font:700 var(--fs-sm)/1.1 var(--f-cond);letter-spacing:.04em;text-transform:uppercase;cursor:pointer;white-space:nowrap}
.tq-sede span{font-size:var(--fs-xs);letter-spacing:.1em;color:var(--lila)}.tq-sede::after{content:'';width:7px;height:7px;margin:-4px 0 0 4px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg)}
.tq-sede[aria-expanded=true]{background:var(--cta);border-color:transparent}.tq-sede[aria-expanded=true] span{color:#fff}.tq-menu-foot .tq-sede{margin-left:auto}
.tq-pop{position:fixed;inset:0;z-index:30001}.tq-pop>div{position:fixed;display:flex;flex-direction:column;gap:4px;padding:8px;max-height:calc(100% - 16px);overflow-y:auto;border-radius:16px;border:1px solid rgba(201,178,255,.35);background:#1c0b3a;box-shadow:0 12px 32px rgba(0,0,0,.55)}
.tq-pop button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-height:44px;padding:8px 16px;border:0;border-radius:12px;background:transparent;color:#fff;text-align:left;cursor:pointer}
.tq-pop b{font:700 var(--fs-sm)/1.1 var(--f-cond);letter-spacing:.04em;text-transform:uppercase}.tq-pop small{font:600 var(--fs-xs)/1.3 var(--f-cond);color:#cbbcf0}
.tq-pop button:hover,.tq-pop button:focus-visible{background:rgba(255,255,255,.1)}.tq-pop button.on{background:var(--cta)}.tq-pop button.on small{color:#fff}
.tq-pueblos button{min-height:40px;padding:6px 14px;border-radius:999px;border:1px solid rgba(201,178,255,.35);background:rgba(255,255,255,.06);color:#fff;font:700 var(--fs-sm)/1.1 var(--f-cond);letter-spacing:.04em;text-transform:uppercase;cursor:pointer}
.tq-pueblos button.on{background:var(--cta);border-color:transparent;box-shadow:0 0 12px rgba(255,43,214,.45)}
.tq-pueblos{display:flex;flex-direction:column;gap:12px;min-height:0;overflow-y:auto}.tq-pueblos h3{margin:0 0 6px;font:800 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;color:var(--rosa)}
.tq-pueblos section>div{display:flex;flex-wrap:wrap;gap:6px}
@media (orientation:landscape) and (max-height:520px){
.lg-card.tq-card{gap:4px 16px;padding:8px 16px 12px}.tq-txa>.ico{width:40px;height:40px}.tq-top .lg-head h2{font-size:var(--fs-xl)}
.tq-duel{padding:0}.tq-mid b{font-size:var(--fs-3xl)}.tq-left{gap:4px}.tq-left .lg-btn{min-height:44px}
.tq-m>div{min-height:20px;padding:1px 8px;font-size:var(--fs-xs)}.tq-m b{font-size:var(--fs-sm)}.tq-cup{margin-top:4px}.tq-cup .ico{width:48px;height:48px}
.tq-br.k4 .tq-rd h4 .tq-l{display:none}.tq-br.k4 .tq-rd h4 .tq-c{display:inline}.tq-liga.g4 .j{display:none}.tq-tab th.n{width:1.5em}.tq-tab th.c{width:1.6em}.tq-tab th.d{width:2.3em}.tq-tab td,.tq-tab th{padding-left:3px;padding-right:3px}.tq-liga.g4 .tq-tab td:nth-child(2),.tq-liga.g4 .tq-tab th:nth-child(2){padding-left:6px}.tq-br.k4 .tq-m>div{min-height:16px;padding:0 6px}.tq-br.k4 .tq-m b{font-size:var(--fs-xs)}.tq-br.k4 .tq-rd h4{margin-bottom:2px}
.tq-vista{margin-bottom:4px}.tq-vista button{min-height:30px;padding:2px 12px}.tq-tab td,.tq-tab th{padding:1px 6px}.tq-tab{font-size:var(--fs-xs)}.tq-tabs{gap:4px 8px}.tq-ley{margin-top:2px}
.tq-tile{min-height:0;height:100%;padding:8px 20px}.tq-tile b{font-size:var(--fs-xl)}.tq-tiles{flex:1}.lg-card.tq-menu-card{grid-template-rows:auto minmax(0,1fr) auto;height:100%}
}
@media (max-width:900px) and (orientation:portrait){
.lg-card.tq-card{grid-template-columns:1fr;grid-template-rows:none}.tq-br{grid-template-columns:repeat(var(--k1,2),minmax(0,1fr)) minmax(0,.8fr);min-height:260px}.tq-br.k4{min-height:380px;gap:0 8px}
.tq-tiles,.tq-tiles.n3,.tq-tiles.n5{grid-template-columns:1fr 1fr}.tq-rd h4{white-space:normal}.tq-tile{min-height:150px}.tq-tiles.n3 .tq-tile.main,.tq-tiles.n5 .tq-tile.main{grid-column:1/-1}.tq-tile b{font-size:var(--fs-xl)}
.tq-tile .figs{min-height:110px}
/* (de pie, la losa del torneo a lo ancho solo con tres: con cuatro, dos filas de dos; si no, quedaba un hueco al lado de
   la colección y el pie, con Salir y el frontón, no cabía) */
/* (de pie, las dos losas de cada fila con las mismas filas, como tumbado: las figuras sobre el mismo suelo y los textos
   alineados aunque uno ocupe más líneas) */
.tq-tiles{row-gap:0}.tq-tile{display:grid;grid-row:span 4;grid-template-rows:subgrid;grid-template-columns:minmax(0,1fr);align-content:stretch;justify-items:start;margin-bottom:12px}
.tq-tile .figs{justify-self:stretch;align-self:stretch}.tq-tile>:not(.figs){align-self:end}
}
@media (max-width:460px) and (orientation:portrait){.tq-br.k4 .tq-rd h4 .tq-l{display:none}.tq-br.k4 .tq-rd h4 .tq-c{display:inline}.tq-liga.g4 .j{display:none}}
@media (max-width:360px) and (orientation:portrait){.tq-tile{padding:8px 12px}.tq-tile b{font-size:var(--fs-lg);overflow-wrap:anywhere}.tq-duel{flex-wrap:wrap}.tq-duel>.tq-mid{order:-1;flex:1 1 100%}.tq-duel .gx-card{--w:108px!important}.tq-br{gap:0 12px}}
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
.tq-duel .gx-card{--w:168px!important}.tq-banner .gx-card{--w:168px!important}.tq-mid b{font-size:var(--fs-5xl)}.tq-mid small.r{font-size:var(--fs-md)}
.tq-where{font-size:var(--fs-md)}.tq-ficha{font-size:var(--fs-sm)}
.tq-rd h4{font-size:var(--fs-sm)}.tq-m>div{min-height:30px;padding:4px 12px;font-size:var(--fs-md)}.tq-m b{font-size:var(--fs-lg)}.tq-br.k4 .tq-m>div{min-height:24px;padding:2px 10px;font-size:var(--fs-sm)}.tq-br.k4 .tq-m b{font-size:var(--fs-md)}.tq-tab{font-size:var(--fs-md)}.tq-tab td,.tq-tab th{padding:5px 10px}.tq-vista button{min-height:40px;font-size:var(--fs-sm)}
.tq-cup .ico{width:84px;height:84px}.tq-cup b{font-size:var(--fs-lg)}
}`;
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
    return `<div class="tq-rd${gi === T.round && !T.done ? ' now' : ''}"><h4><span class="tq-l">${R.name}</span><span class="tq-c" data-notr>${corto(R.name)}</span><small>A ${R.target} tantos</small></h4>${body}</div>`;
  }).join('');
  return `<div class="tq-br k${K}${T.kind === 'parejas' ? ' tq-pairs' : ''}" style="--k1:${K - 1}" data-n="${ns.join(',')}"${hidden ? ' hidden' : ''}>${cols}<svg class="tq-lines" aria-hidden="true"></svg></div>`;
}
// la liguilla: la clasificación de cada grupo (los que pasan, en blanco y con la raya debajo del último); ya en su
// idioma, como los frontones: el traductor no sabe de grupos
function ligaHtml(T, hidden = false) {
  if (!T.groups) return '';
  const eu = isEU(), plan = planOf(T), jor = plan.filter(R => R.liga != null).length, hechas = T.past.filter(P => P.liga).length;
  const G = T.groups.length, q = G === 1 ? 4 : 2, pairs = T.kind === 'parejas';
  const quien = pairs ? (eu ? 'Bikotea' : 'Pareja') : (eu ? 'Pilotaria' : 'Pelotari');
  const tabla = (g) => `<table class="tq-tab"><thead><tr><th class="n j"></th><th>${G > 1 ? (eu ? `${'ABCD'[g]} multzoa` : `Grupo ${'ABCD'[g]}`) : quien}</th><th class="c j">J</th><th class="c">${eu ? 'I' : 'G'}</th><th class="d">±</th></tr></thead><tbody>${clasificacion(T, g).map((x, i) => {
    const P = T.players[x.p], d = x.tf - x.tc;
    return `<tr class="${i < q ? 'q' : ''}${i === q - 1 ? ' corte' : ''}${P.you ? ' you' : ''}"><td class="n j">${i + 1}</td><td><span>${esc(P.name)}</span></td><td class="j">${x.j}</td><td>${x.g}</td><td>${d > 0 ? '+' + d : d}</td></tr>`; }).join('')}</tbody></table>`;
  const head = hechas < jor ? (eu ? `Ligaxka · ${hechas + 1}/${jor} jardunaldia` : `Liguilla · jornada ${hechas + 1} de ${jor}`) : (eu ? 'Ligaxka · amaituta' : 'Liguilla · terminada');
  const sub = G === 1 ? (eu ? 'Lehen laurak, finalerdietara' : 'Las cuatro primeras, a semifinales') : (eu ? 'Multzo bakoitzeko lehen biak, final-laurdenetara' : 'Los dos primeros de cada grupo, a cuartos');
  const leyenda = eu ? '<span class="j">J jokatuak · </span>I irabaziak · ± tanto aldea' : '<span class="j">J jugados · </span>G ganados · ± diferencia de tantos';
  return `<div class="tq-liga g${G}" data-notr${hidden ? ' hidden' : ''}><h4>${head}<small>${sub}</small></h4><div class="tq-tabs">${T.groups.map((_, g) => tabla(g)).join('')}</div><p class="tq-ley">${leyenda}</p></div>`;
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
  const yp = T.players.find(p => p.you), rv = m.rival;
  if (T.kind === 'parejas') return [{ id: 'you', name: yp.mates[0], town: yp.town, side: 'you', role: 'delantero', you: true, record: { txapelas: T.txapelas || 0 } },
    { id: 'youMate', name: yp.mates[1], town: yp.town, stats: mateStats(yp, 1), side: 'you', role: 'zaguero' },
    { id: 'rival', name: rv.mates[0], town: rv.town, stats: mateStats(rv, 0), side: 'rival', role: 'delantero' },
    { id: 'rivalMate', name: rv.mates[1], town: rv.town, stats: mateStats(rv, 1), side: 'rival', role: 'zaguero' }];
  return [{ id: 'you', name: yp.name, town: yp.town, side: 'you', role: 'mano', you: true, record: { txapelas: T.txapelas || 0 } }, { id: 'rival', name: rv.name, town: rv.town, stats: statsOf(rv), side: 'rival', role: 'mano' }];
}
/** La media de un pelotari del torneo en su carta: la tuya sube con cada txapela; la de los rivales, con su nivel */
export const youBonus = (T) => Math.min(20, 2 + (T?.txapelas || 0) * 2);
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
    const grupos = COMARCAS.map(c => [c, LEVELS.filter(l => !l.special && !l.bosque && l.comarca === c.id)]).filter(([, ts]) => ts.length);
    const r = lgPanel(`<div class="lg-head" data-notr><div><small>${isEU() ? 'Esku pilota' : 'Pelota a mano'}</small><h2>${isEU() ? 'Zein frontoitan?' : '¿En qué frontón?'}</h2></div></div>
      <div class="lg-list tq-pueblos">${grupos.map(([c, ts]) => `<section><h3>${esc(c.name)}</h3><div>${ts.map(l => { const n = l.name.split(' /')[0]; return `<button type="button" class="${n === here ? 'on' : ''}" data-pueblo="${l.id}">${esc(n)}</button>`; }).join('')}</div></section>`).join('')}</div>
      <div class="lg-btns"><button class="lg-btn" data-a="no" data-notr>${isEU() ? 'Itzuli' : 'Volver'}</button></div>`);
    r.addEventListener('click', (e) => { const b = e.target.closest('[data-pueblo], [data-a]'); if (!b) return; lgFuera(r); res(b.dataset.pueblo || null); });
  });
}
// «Cómo funciona» de cada campeonato (los de antes, de ocho, con su texto de siempre; los de ahora, ya en su idioma)
function comoFunciona(T) {
  const pairs = T.kind === 'parejas';
  if (!T.fmt) return pairs ? '<p class="lg-how tq-how" hidden><b>Cómo funciona:</b> ocho parejas de delantero y zaguero por eliminatorias (cuartos y semifinales a 5 tantos, final a 7). Juegas con tu compañero de siempre. La final, en el frontón Labrit de Iruña.</p>'
    : T.kind === 'cuatro' ? '<p class="lg-how tq-how" hidden><b>Cómo funciona:</b> ocho pelotaris mano a mano por eliminatorias (cuartos y semifinales a 5 tantos, final a 7) en el Cuatro y Medio: la pelota no puede botar más allá de la raya del 4 y medio, la del suelo entre el 4 y el 5, y el saque bota entre la raya del 3 y la del 5. Juego corto, de dejadas y ganchos. La final, en el Labrit.</p>'
    : '<p class="lg-how tq-how" hidden><b>Cómo funciona:</b> ocho pelotaris por eliminatorias (cuartos y semifinales a 5 tantos, final a 7). Los rivales vienen a tu frontón; la final, en el frontón Labrit de Iruña. Los demás partidos se simulan.</p>';
  const eu = isEU(), txt = eu ? {
    ko16: 'hamasei pilotari kanporaketetan, benetako Buruz Buruko txapelketan bezala: final-zortzirenak 5 tantora, final-laurdenak 6ra, finalerdiak 7ra eta finala 9ra. Aurkariak zure frontoira datoz; finala, Iruñeko Labrit frontoian. Beste partidak simulatu egiten dira.',
    grupos16: "hamasei pilotari buruz buru lau t'erdian: pilotak ezin du lau eta erdiko marratik haratago bote egin (lurreko marra da, 4 eta 5 artean), eta sakeak 3ko eta 5eko marren artean egiten du bote. Lehenik, ligaxka: lauko lau multzo, hiru jardunaldi 5 tantora. Multzo bakoitzeko lehen biak final-laurdenetara (6ra), finalerdietara (7ra) eta finalera (9ra) igarotzen dira. Finala, Labriten.",
    liga8: 'aurrelari eta atzelariko zortzi bikote ligaxkan, denak denen aurka, benetako txapelketan bezala: zazpi jardunaldi 5 tantora. Lehen laurak finalerdietara (7ra) igarotzen dira, eta finala, 9ra, Iruñeko Labrit frontoian jokatzen da. Betiko lagunarekin jokatzen duzu.',
  } : {
    ko16: 'dieciséis pelotaris por eliminatorias, como en el Manomanista de verdad: octavos a 5 tantos, cuartos a 6, semifinales a 7 y final a 9. Los rivales vienen a tu frontón; la final, en el frontón Labrit de Iruña. Los demás partidos se simulan.',
    grupos16: 'dieciséis pelotaris mano a mano en el Cuatro y Medio: la pelota no puede botar más allá de la raya del 4 y medio, la del suelo entre el 4 y el 5, y el saque bota entre la raya del 3 y la del 5. Primero, la liguilla: cuatro grupos de cuatro, tres jornadas a 5 tantos. Los dos primeros de cada grupo pasan a cuartos (a 6), semifinales (a 7) y final (a 9). La final, en el Labrit.',
    liga8: 'ocho parejas de delantero y zaguero en liguilla, todas contra todas, como en el campeonato de verdad: siete jornadas a 5 tantos. Las cuatro primeras pasan a semifinales (a 7) y la final, a 9, se juega en el frontón Labrit de Iruña. Juegas con tu compañero de siempre.',
  };
  return `<p class="lg-how tq-how" hidden data-notr><b>${eu ? 'Nola dabil:' : 'Cómo funciona:'}</b> ${txt[T.fmt] || txt.ko16}</p>`;
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
    const head = `<div class="tq-top"><div class="lg-head tq-txa">${TXAPELA()}<div><small>${(KINDS[T.kind] || KINDS.mano).full} · edición ${T.edition}</small><h2>Txapela de ${esc(T.comarcaName)}</h2></div></div><button class="tq-info" data-info aria-expanded="false" aria-label="Cómo funciona">?</button></div>`;
    const how = comoFunciona(T);
    // (las cartas del duelo, con el color que cada uno viste en el partido)
    const col = m ? coloresPartido(`${pairs ? m.rival.mates[0] : m.rival.name} (${m.rival.town})`, m.level, m.mate?.name, m.partner?.name).colors : { you: 'azul', rival: 'rojo' };
    const youCard = (w) => pelotariCard({ name: pairs ? yp.mates[0] : yp.name, town: yp.town, side: col.you, role: pairs ? 'Del' : 'Mano', w, bonus: youBonus(T), stats: { fuerza: 3, agilidad: 3, velocidad: 3 }, pop: true, lang });
    let left;
    if (T.done) { const C = T.players[T.champion]; left = `<div class="tq-banner"><small>Txapeldun · campeón del torneo</small>${pelotariCard({ name: C.name, town: C.town, side: C.you ? (T.tuColor || 'azul') : (T.tuColor === 'rojo' ? 'azul' : 'rojo'), role: pairs ? 'Par' : 'Mano', w: 110, bonus: C.you ? youBonus(T) : rivalBonus(C), stats: C.you ? {} : pairs ? mateStats(C, 0) : statsOf(C), pop: true, lang })}<p>${C.you ? '¡La txapela es tuya! Zorionak!' : `${esc(C.town)} se lleva la txapela. ¡A por la próxima!`}</p></div>`; }
    else if (m) {
      const rv = m.rival, rvStats = pairs ? mateStats(rv, 0) : statsOf(rv);
      left = `<div class="tq-duel">${youCard(120)}<div class="tq-mid"><b>VS</b><small class="r">${esc(m.liga ? `Jornada ${planOf(T)[T.round].liga + 1} de ${planOf(T).filter(R => R.liga != null).length}` : m.round)}</small><small>A ${m.target} tantos</small></div>${pelotariCard({ name: pairs ? rv.mates[0] : rv.name, town: rv.town, side: col.rival, role: pairs ? 'Del' : 'Mano', w: 120, bonus: rivalBonus(rv), stats: rvStats, tag: 'button', attr: 'data-f="rival" aria-label="Ficha del rival"', d: 0.08, pop: true, lang })}</div>
        <p class="tq-ficha">Toca su carta para ver su ficha</p>
        <div class="tq-where">${o ? sedeHtml(o, here) : here ? `<span>Frontón de <b>${esc(here)}</b></span>` : ''}<span>Tus txapelas <b>${T.txapelas || 0}</b></span></div>`;
    } else left = `<div class="tq-banner"><small>Eliminado</small><b>El torneo sigue</b><p>Mira quién se lleva la txapela.</p></div>`;
    // (con liguilla, dos pestañas: la clasificación y el cuadro de las eliminatorias; se abre la de la ronda que toca)
    const v0 = T.groups && !T.done && planOf(T)[T.round]?.liga != null ? 'liga' : 'cuadro';
    const vistas = T.groups ? `<div class="tq-vista" data-notr>${[['liga', isEU() ? 'Ligaxka' : 'Liguilla'], ['cuadro', isEU() ? 'Koadroa' : 'Cuadro']].map(([k, t]) => `<button type="button" data-vista="${k}" aria-pressed="${k === v0}">${t}</button>`).join('')}</div>` : '';
    const btns = T.done ? '<button class="lg-btn go" data-a="new">Nuevo torneo</button>' : m ? '<button class="lg-btn go" data-a="play">¡A jugar!</button>' : '<button class="lg-btn go" data-a="sim">Siguiente ronda</button>';
    const r = lgPanel(`${head}<div class="tq-left">${left}<div class="lg-btns lg-foot">${btns}<button class="lg-btn" data-a="exit">Salir</button></div></div><div class="tq-right">${vistas}${ligaHtml(T, v0 !== 'liga')}${bracketHtml(T, v0 === 'liga')}</div>${how}`);
    const cardEl = r.firstElementChild; cardEl.classList.remove('lg-two'); cardEl.classList.add('tq-card');
    // (y otra vez si cambia el tamaño del cuadro o de sus columnas, por ejemplo al cargar las fuentes)
    const lines = () => drawLines(r); requestAnimationFrame(lines); const ro = new ResizeObserver(lines); r.querySelectorAll('.tq-br, .tq-rd').forEach(e => ro.observe(e));
    r.addEventListener('click', async (e) => {
      if (o && await sedeClick(e, r, o, here)) return;
      const f = e.target.closest('[data-f]'); if (f && m) { const L = fichaList(T, m); openFicha(L, Math.max(0, L.findIndex(p => p.id === f.dataset.f)), lang); return; }   // (la ficha, encima del cuadro)
      const vb = e.target.closest('[data-vista]'); if (vb) { const lg = vb.dataset.vista === 'liga'; r.querySelectorAll('[data-vista]').forEach(x => x.setAttribute('aria-pressed', String(x === vb))); r.querySelector('.tq-liga').hidden = !lg; r.querySelector('.tq-br').hidden = lg; requestAnimationFrame(lines); return; }
      const inf = e.target.closest('[data-info]'); if (inf) { const h = r.querySelector('.tq-how'), on = h.hidden; h.hidden = !on; inf.setAttribute('aria-expanded', String(on)); requestAnimationFrame(lines); return; }
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
 *  comarca (o de alrededor) que no sea el tuyo, a suertes. null si no hay ninguno. */
export function fueraDe(T, ri = T.round) {
  const rv = rivalEn(T, ri < T.round ? T.past[ri]?.matches : T.matches), yo = T.players.find(q => q.you)?.town;
  if (rv?.townId) return { id: rv.townId, name: rv.town };
  const vs = (T.venues || []).filter(v => v.id && v.name !== yo); if (!vs.length) return null;
  return vs[Math.floor(azar(T, ri, 1) * vs.length)];
}
export function sedeRonda(T, ri, sedes = ['plaza', 'cubierto', 'labrit']) {
  const plan = planOf(T), S = T.sede?.edition === T.edition ? T.sede : null; let k = null, k2 = null;
  for (let i = 0; i <= ri; i++) {
    const prev = k, dosCubiertos = !!prev && !!k2 && prev !== 'plaza' && k2 !== 'plaza'; k2 = prev;
    if (S && S.ri === i && i < ri) { k = S.kind; continue; }   // (lo elegido para una ronda ya jugada, para no repetirlo en la siguiente)
    if (plan[i]?.name === 'Final') { k = 'labrit'; continue; }
    // (tras un cubierto, mejor el del pueblo, al aire libre, que es el que más se nota: cuenta por dos)
    const ops = [...sedes.filter(x => x !== 'labrit' && x !== 'fuera'), ...(fueraDe(T, i) ? ['fuera'] : [])], libres = ops.filter(x => x !== prev).flatMap(x => x === 'plaza' && prev ? [x, x] : [x]), L = libres.length ? libres : ops;
    k = dosCubiertos && L.includes('plaza') ? 'plaza' : L[Math.floor(azar(T, i) * L.length)] || 'plaza';   // (y tras dos cubiertos seguidos, el del pueblo)
  }
  return k;
}
/** Menú del pelotari: torneo individual, torneo por parejas o partido libre (here: el nombre del pueblo del frontón;
 *  T2: el torneo por parejas; o: los frontones para el partido libre, ver sedeHtml). Devuelve 'torneo' | 'torneoParejas' |
 *  'libre' | 'exit', u 'otro:<pueblo>' para jugar en el frontón de otro pueblo. */
export function pelotaMenu(T, here = null, T2 = null, o = null, T3 = null) {
  css();   // (antes solo lo ponía el cuadro del torneo: la primera vez, la txapela salía enorme)
  return new Promise(res => {
    const sub = (X) => { const m = yourMatch(X); return X.done ? 'Nueva edición' : m ? `${m.round} contra ${esc(m.pairs ? m.rival.mates[0] : m.rival.name)}` : 'Siguiente ronda'; };
    const tx = (T.txapelas || 0) + (T2?.txapelas || 0) + (T3?.txapelas || 0), C = pelotarisCount();
    // las portadas, con los pelotaris del autor: en el torneo, tu rival de la ronda (o quien ganó); por parejas, la pareja
    // rival; en el partido libre, tú, de azul; en la colección, los tres últimos que has conocido (o tres de la plantilla)
    const who = (X) => yourMatch(X)?.rival || (X.done ? X.players[X.champion] : X.players.find(q => !q.you));
    const figOf = (X, pairs) => { const p = who(X), side = p?.you ? 'azul' : 'rojo'; return pairs ? (p?.mates || [p?.name]).slice(0, 2).map(n => pelotariFig(n, side, 'fig')).join('') : pelotariFig(p?.name, side, 'fig'); };
    const met = Object.values(profile().pelotaris || {}).sort((a, b) => (b.last || 0) - (a.last || 0)).map(c => c.name);
    const trio = [...new Set([...met, 'Oihana', 'Unai', 'Irati'])].slice(0, 3);
    const youName = T.players.find(q => q.you)?.name;
    const r = lgPanel(`<div class="lg-head tq-txa">${TXAPELA()}<div><small>${here ? `Frontón de ${esc(here)}` : 'Frontón del pueblo'}</small><h2>Pelota a mano</h2></div>${tx ? `<div class="lg-ovr">${tx}<small>TXAPELAS</small></div>` : ''}</div>
      <div class="tq-tiles${T2 ? T3 ? ' n5' : '' : ' n3'}"><button class="tq-tile main" data-a="torneo" style="--d:.2s"><span class="figs">${figOf(T)}</span><span class="k">${T.txapelas ? `${T.txapelas} ${T.txapelas === 1 ? 'txapela' : 'txapelas'}` : KINDS.mano.k}</span><b>${KINDS.mano.name}</b><small>${sub(T)}</small></button>
        ${T2 ? `<button class="tq-tile pair" data-a="torneoParejas" style="--d:.8s"><span class="figs duo">${figOf(T2, true)}</span><span class="k">${KINDS.parejas.k}</span><b>${KINDS.parejas.name}</b><small>${sub(T2)}</small></button>` : ''}
        ${T3 ? `<button class="tq-tile c45" data-a="torneoCuatro" style="--d:1.1s"><span class="figs">${figOf(T3)}</span><span class="k">${T3.txapelas ? `${T3.txapelas} ${T3.txapelas === 1 ? 'txapela' : 'txapelas'}` : KINDS.cuatro.k}</span><b>${KINDS.cuatro.name}</b><small>${sub(T3)}</small></button>` : ''}
        <button class="tq-tile free" data-a="libre" style="--d:1.4s"><span class="figs">${pelotariFig(youName, 'azul', 'fig')}</span><span class="k">A 5 tantos</span><b>Partido libre</b><small>Mano, parejas o&nbsp;4½</small></button>
        <button class="tq-tile col" data-a="pelotaris" style="--d:2s"><span class="figs trio">${trio.map(n => pelotariFig(n, 'rojo', 'fig')).join('')}</span><span class="k">Tu colección</span><b>Pelotaris</b><small class="pc-n">${C.have}/${C.total} descubiertos</small></button></div>
      <div class="tq-menu-foot"><button class="lg-btn" data-a="exit">Salir</button>${sedeHtml(o, here)}</div>`);
    r.firstElementChild.classList.add('tq-menu-card');
    // las figuras de las cuatro losas, del mismo alto: el mayor que cabe en todas. Las ilustraciones tienen el mismo
    // encuadre (el cuerpo, de ancho, un 36 % de su alto como mucho) y van en fila a un paso del 32 % de su alto
    const tiles = r.querySelector('.tq-tiles');
    const iguala = () => {
      if (!r.isConnected) { ro.disconnect(); return; }
      let h = Infinity;
      for (const f of tiles.querySelectorAll('.figs')) { const n = f.children.length || 1; h = Math.min(h, f.clientHeight, f.clientWidth * 0.94 / (0.36 + (n - 1) * 0.32)); }
      if (h > 0 && h < Infinity) tiles.style.setProperty('--fh', Math.floor(h) + 'px');
    };
    const ro = new ResizeObserver(iguala); ro.observe(tiles); tiles.querySelectorAll('.figs').forEach(f => ro.observe(f)); iguala();
    // (la colección se abre encima y, al cerrarla, el menú sigue ahí)
    r.addEventListener('click', async (e) => {
      const s = o && await sedeClick(e, r, o, here); if (s?.otro) { ro.disconnect(); lgFuera(r); res('otro:' + s.otro); return; } if (s) return;
      const b = e.target.closest('[data-a]'); if (!b) return; if (b.dataset.a === 'pelotaris') { await pelotarisPanel(T.comarca); const c = pelotarisCount(); const s2 = b.querySelector('.pc-n'); if (s2) s2.textContent = `${c.have}/${c.total} descubiertos`; return; } lgFuera(r); res(b.dataset.a); });
  });
}

