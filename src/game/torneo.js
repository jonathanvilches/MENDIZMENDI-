// Torneo de mano (pelota) de cada comarca, por eliminatorias como los campeonatos de los frontones: ocho pelotaris (tú
// y siete de los pueblos de la comarca y de alrededor), cuartos (a 5 tantos), semifinales (a 5) y final (a 7). Todo el
// torneo se juega en el frontón donde lo empiezas (el del pueblo en el que estás o el que eliges en Campeonatos): los
// rivales vienen a tu frontón, no hay que viajar. Los demás partidos se simulan según el nivel de cada pelotari. Quien
// gana la final se lleva la txapela de la comarca.
// También hay torneo por parejas (ocho parejas de delantero y zaguero, tú con tu compañero de siempre), igual de rondas.
// Los pelotaris son personajes del juego (nombres inventados con su pueblo), no pelotaris reales.
// Se guarda en localStorage ('herrizherri-torneo-v1'): uno individual y uno por parejas por comarca.
import { lgPanel, lgEsc as esc } from '../futbol/liga.js';
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
const ROUNDS = [{ name: 'Cuartos de final', target: 5 }, { name: 'Semifinales', target: 5 }, { name: 'Final', target: 7 }];
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
/**
 * El torneo de la comarca en curso (o uno nuevo).
 * you: { name, town }; ctx: { comarca, comarcaName, towns: [{ id, name }] } (los pueblos del juego donde se juega:
 * primero los de la comarca y después los de alrededor)
 */
export function torneo(you, ctx, fresh = false, kind = 'mano') {
  // (el torneo terminado se sigue mostrando, con su campeón, hasta que se pide uno nuevo)
  const key = keyOf(ctx.comarca, kind);
  let T = loadAll()[key];
  if (T && T.done && fresh) T = null;
  if (!T) {
    const prev = loadAll()[key];
    const ed = (prev?.edition || 0) + 1, txapelas = prev?.txapelas || 0, r = minstd(ed * 7919 + ctx.comarca.length * 31 + 13);
    const names = NAMES.filter(n => n !== you.name).sort(() => r() - 0.5);   // (nadie con tu mismo nombre)
    // rivales: de los pueblos del juego de la comarca (y de alrededor) primero; después, de otros pueblos navarros
    const towns = [...ctx.towns.map(t => ({ name: t.name, id: t.id })).filter(t => t.name !== you.town), ...TOWNS.filter(t => t !== you.town && !ctx.towns.some(x => x.name === t)).map(name => ({ name, id: null }))];
    // nivel de 1 (flojo) a 3 (fuerte): en cada edición, algo más difíciles
    const lvOf = () => Math.min(3, 1 + Math.floor(r() * 2.2 + Math.min(ed - 1, 3) * 0.25));
    let rivals, players;
    if (kind === 'parejas') {
      // parejas del mismo pueblo: delantero y zaguero; la tuya, con tu compañero (de tu pueblo)
      const pool = names.slice(), partner = pool.pop();   // (14 nombres para las parejas rivales y uno para tu compañero)
      rivals = Array.from({ length: 7 }, (_, i) => { const a = pool[i * 2], b = pool[i * 2 + 1]; return { id: 'p' + i, name: `${a} · ${b}`, mates: [a, b], town: towns[i].name, townId: towns[i].id, lv: lvOf() }; });
      players = [{ id: 'you', name: `${you.name} · ${partner}`, mates: [you.name, partner], town: you.town, lv: 2, you: true }, ...rivals];
    } else {
      rivals = Array.from({ length: 7 }, (_, i) => ({ id: 'p' + i, name: names[i], town: towns[i].name, townId: towns[i].id, lv: lvOf() }));
      players = [{ id: 'you', name: you.name, town: you.town, lv: 2, you: true }, ...rivals];
    }
    // cuadro: tú contra el más flojo en cuartos (como cabeza de serie)
    const order = [0, ...rivals.map((p, i) => i + 1).sort((a, b) => players[a].lv - players[b].lv)];
    const seed = [order[0], order[1], order[4], order[5], order[2], order[3], order[6], order[7]];
    T = { kind, comarca: ctx.comarca, comarcaName: ctx.comarcaName, venues: ctx.towns, edition: ed, txapelas, players, round: 0, matches: [[0, 1], [2, 3], [4, 5], [6, 7]].map(([a, b]) => ({ a: seed[a], b: seed[b], s: null })), past: [], done: false, champion: null };
    save(T);
  }
  return T;
}
/** Tu partido de la ronda: { rival, target, level, round } (o null si ya estás fuera o ha terminado). */
export function yourMatch(T) {
  if (T.done) return null;
  const m = T.matches.find(x => T.players[x.a].you || T.players[x.b].you); if (!m) return null;
  const rv = T.players[T.players[m.a].you ? m.b : m.a], R = ROUNDS[T.round], level = rv.lv >= 3 ? 'dificil' : rv.lv <= 1 ? 'facil' : 'normal';
  // (por parejas: el delantero rival juega con su nombre y sus cualidades; con él, su zaguero, y contigo, tu compañero)
  if (T.kind === 'parejas') { const yp = T.players.find(p => p.you); return { rival: rv, pairs: true, stats: mateStats(rv, 0), mate: { name: rv.mates[1], stats: mateStats(rv, 1) }, partner: { name: yp.mates[1], stats: mateStats(yp, 1) }, target: R.target, round: R.name, level }; }
  return { rival: rv, stats: statsOf(rv), target: R.target, round: R.name, level };
}
/** Apunta tu resultado (o null si ya estás eliminado), simula el resto de la ronda y prepara la siguiente. */
export function playTorneoRound(T, you = null, rival = null) {
  const R = ROUNDS[T.round], r = minstd(T.edition * 101 + T.round * 7);
  for (const m of T.matches) {
    const A = T.players[m.a], B = T.players[m.b];
    if ((A.you || B.you) && you != null) m.s = A.you ? [you, rival] : [rival, you];
    else {
      // (el nivel y las cualidades: el más completo gana más a menudo)
      const one = (s) => s.fuerza + s.agilidad + s.velocidad, sum = (p) => T.kind === 'parejas' ? (one(mateStats(p, 0)) + one(mateStats(p, 1))) / 2 : one(statsOf(p));
      const pa = clamp01(0.5 + (A.lv - B.lv) * 0.12 + (sum(A) - sum(B)) * 0.03), aw = r() < pa, lose = Math.floor(r() * R.target * 0.85);
      m.s = aw ? [R.target, lose] : [lose, R.target];
    }
  }
  T.past.push({ name: R.name, matches: T.matches.map(m => ({ ...m })) });
  const winners = T.matches.map(m => m.s[0] > m.s[1] ? m.a : m.b);
  if (winners.length === 1) {
    T.done = true; T.champion = winners[0];
    if (T.players[winners[0]].you) T.txapelas = (T.txapelas || 0) + 1;
  } else { T.round++; T.matches = []; for (let i = 0; i < winners.length; i += 2) T.matches.push({ a: winners[i], b: winners[i + 1], s: null }); }
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
.tq-br{position:relative;flex:1;display:grid;grid-template-columns:1fr 1fr .9fr;gap:0 24px;min-height:0}
.tq-br svg.tq-lines{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.tq-lines path{fill:none;stroke:rgba(201,178,255,.35);stroke-width:2}.tq-lines path.you{stroke:var(--fx);filter:drop-shadow(0 0 4px rgba(255,43,214,.8))}
.tq-lines path{stroke-dasharray:400;stroke-dashoffset:400;animation:tq-draw .7s ease-out .35s forwards}@keyframes tq-draw{to{stroke-dashoffset:0}}
.tq-rd{display:flex;flex-direction:column;min-width:0}
/* (la ronda y, debajo, a cuántos tantos: en una sola línea, «Cuartos de final · a 5» pisaba la columna de al lado) */
.tq-rd h4{margin:0 0 4px;font:800 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.06em;text-transform:uppercase;color:var(--lila);white-space:nowrap}.tq-rd h4 small{display:block;color:var(--lila2);font:inherit;letter-spacing:.04em}
.tq-rd.now h4{color:var(--rosa)}
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
.tq-tile{min-height:0;height:100%;padding:8px 20px}.tq-tile b{font-size:var(--fs-xl)}.tq-tiles{flex:1}.lg-card.tq-menu-card{grid-template-rows:auto minmax(0,1fr) auto;height:100%}
}
@media (max-width:900px) and (orientation:portrait){
.lg-card.tq-card{grid-template-columns:1fr;grid-template-rows:none}.tq-br{grid-template-columns:1fr 1fr .8fr;min-height:260px}
.tq-tiles,.tq-tiles.n3,.tq-tiles.n5{grid-template-columns:1fr 1fr}.tq-rd h4{white-space:normal}.tq-tile{min-height:150px}.tq-tiles.n3 .tq-tile.main,.tq-tiles.n5 .tq-tile.main{grid-column:1/-1}.tq-tile b{font-size:var(--fs-xl)}
.tq-tile .figs{min-height:110px}
/* (de pie, la losa del torneo a lo ancho solo con tres: con cuatro, dos filas de dos; si no, quedaba un hueco al lado de
   la colección y el pie, con Salir y el frontón, no cabía) */
/* (de pie, las dos losas de cada fila con las mismas filas, como tumbado: las figuras sobre el mismo suelo y los textos
   alineados aunque uno ocupe más líneas) */
.tq-tiles{row-gap:0}.tq-tile{display:grid;grid-row:span 4;grid-template-rows:subgrid;grid-template-columns:minmax(0,1fr);align-content:stretch;justify-items:start;margin-bottom:12px}
.tq-tile .figs{justify-self:stretch;align-self:stretch}.tq-tile>:not(.figs){align-self:end}
}
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
@media (min-width:1200px) and (min-height:700px){
.lg-card.tq-card{width:min(1280px,100%);gap:16px 32px}
.lg-card.tq-menu-card{width:min(1640px,100%)}
.tq-tiles{gap:16px}
.tq-tile{padding-left:24px;padding-right:24px}.tq-tile .figs{min-height:clamp(280px,calc(46vh / var(--z, 1)),560px)}
.tq-tile b{font-size:var(--fs-2xl)}.tq-tile small{font-size:var(--fs-md)}.tq-tile .k{font-size:var(--fs-sm)}
.tq-duel .gx-card{--w:168px!important}.tq-banner .gx-card{--w:168px!important}.tq-mid b{font-size:var(--fs-5xl)}.tq-mid small.r{font-size:var(--fs-md)}
.tq-where{font-size:var(--fs-md)}.tq-ficha{font-size:var(--fs-sm)}
.tq-rd h4{font-size:var(--fs-sm)}.tq-m>div{min-height:30px;padding:4px 12px;font-size:var(--fs-md)}.tq-m b{font-size:var(--fs-lg)}
.tq-cup .ico{width:84px;height:84px}.tq-cup b{font-size:var(--fs-lg)}
}`;
const TXAPELA = () => iconSVG('txapela', 64);   // (la txapela de los iconos del autor)
function card(T, p, s, w, l) {
  const P = T.players[p];
  return `<div class="${w ? 'w' : l ? 'l' : ''} ${P.you ? 'you' : ''}"><span>${esc(P.name)}<small> · ${esc(P.town)}</small></span><b>${s == null ? '' : s}</b></div>`;
}
function bracketHtml(T) {
  const cols = ROUNDS.map((R, i) => {
    const ms = i < T.past.length ? T.past[i].matches : i === T.round && !T.done ? T.matches : [];
    const n = [4, 2, 1][i];
    const rows = Array.from({ length: n }, (_, k) => { const m = ms[k]; if (!m) return '<div class="tq-m ph"><div><span>—</span></div><div><span>—</span></div></div>';
      const aw = m.s && m.s[0] > m.s[1], bw = m.s && m.s[1] > m.s[0], me = T.players[m.a].you || T.players[m.b].you;
      return `<div class="tq-m${me ? ' me' : ''}" data-r="${i}" data-k="${k}">${card(T, m.a, m.s?.[0], aw, bw)}${card(T, m.b, m.s?.[1], bw, aw)}</div>`; }).join('');
    const champ = i === 2 ? `<div class="tq-cup">${TXAPELA()}${T.done ? `<b>${esc(T.players[T.champion].name)}</b>` : 'Txapela'}</div>` : '';
    // (la final, justo a media altura: entre las dos semifinales; la txapela, colgada debajo, sin moverla)
    const body = i === 2 ? `<div class="tq-ms tq-fin"><div class="tq-finm">${rows}${champ}</div></div>` : `<div class="tq-ms">${rows}</div>`;
    return `<div class="tq-rd${i === T.round && !T.done ? ' now' : ''}"><h4>${R.name}<small>A ${R.target} tantos</small></h4>${body}</div>`;
  }).join('');
  return `<div class="tq-br${T.kind === 'parejas' ? ' tq-pairs' : ''}">${cols}<svg class="tq-lines" aria-hidden="true"></svg></div>`;
}
// las líneas del cuadro: de cada par de eliminatorias a la siguiente (la de tu camino, en fucsia)
// (medidas en el cuadro sin transformaciones: las cajas entran deslizándose y, medidas con getBoundingClientRect a
// mitad de la entrada, las líneas quedaban corridas y sueltas)
function drawLines(root) {
  const br = root.querySelector('.tq-br'), svg = br?.querySelector('.tq-lines'); if (!svg) return;
  const box = (r, k) => { const e = br.querySelector(`.tq-rd:nth-child(${r + 1}) .tq-m:nth-child(${k + 1})`); if (!e) return null;
    let x = 0, y = 0; for (let n = e; n && n !== br; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
    return { e, left: x, right: x + e.offsetWidth, mid: y + e.offsetHeight / 2 }; };
  let d = '';
  for (let r = 0; r < 2; r++) for (let k = 0; k < [4, 2][r]; k++) {
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
const SEDE = { plaza: (h) => isEU() ? `Plaza · ${h || 'herria'}` : `Plaza de ${h || 'tu pueblo'}`, cubierto: () => isEU() ? 'Estalia' : 'Cubierto', labrit: () => 'Labrit · Iruña',
  otro: () => isEU() ? 'Beste herri bat' : 'Otro pueblo' };
const SEDE_CORTO = { plaza: () => 'Plaza', cubierto: () => isEU() ? 'Estalia' : 'Cubierto', labrit: () => 'Labrit' };
const SEDE_SUB = { plaza: () => isEU() ? 'Aire zabalean, herrian' : 'Al aire libre, en el pueblo', cubierto: () => isEU() ? 'Harmailak dituen pilotalekua' : 'Pabellón con grada',
  labrit: () => isEU() ? 'Finalen frontoia' : 'El frontón de las finales', otro: () => isEU() ? 'Jokatu beste herri bateko frontoian' : 'Juega en el frontón de otro pueblo' };
const FRONTON = () => isEU() ? 'Frontoia' : 'Frontón';
const sedeHtml = (o, here) => !o?.sedes?.length ? '' : `<button type="button" class="tq-sede" data-sede aria-haspopup="dialog" aria-expanded="false" data-notr><span>${FRONTON()}</span>${esc(SEDE_CORTO[o.sede](here))}</button>`;
// (al tocarlo, la lista; lo elegido se apunta en o.sede; «Otro pueblo» abre la lista de pueblos y devuelve su id)
async function sedeClick(e, r, o, here) {
  const b = e.target.closest('[data-sede]'); if (!b) return false;
  const k = await sedeLista(b, o, here);
  if (k === 'otro') return { otro: await otroPueblo(here) };
  if (k && k !== o.sede) { o.sede = k; o.onSede?.(k); b.lastChild.textContent = SEDE_CORTO[k](here); }
  return true;
}
/** La lista de los frontones, junto al botón (encima si cabe): devuelve el elegido, 'otro' o null (tocando fuera o
 *  con Escape, que es «Atrás» en el mando del móvil, que copia sus botones porque es un diálogo). */
function sedeLista(btn, o, here) {
  return new Promise(res => {
    const ks = [...o.sedes, ...(o.otro ? ['otro'] : [])], pop = document.createElement('div');
    pop.className = 'tq-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', FRONTON()); pop.dataset.notr = '';
    pop.innerHTML = `<div>${ks.map(k => `<button type="button" class="${k === o.sede ? 'on' : ''}" aria-pressed="${k === o.sede}" data-k="${k}"><b>${esc(SEDE[k](here))}</b><small>${esc(SEDE_SUB[k]())}</small></button>`).join('')}</div>`;
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
    const grupos = COMARCAS.map(c => [c, LEVELS.filter(l => !l.special && l.comarca === c.id)]).filter(([, ts]) => ts.length);
    const r = lgPanel(`<div class="lg-head" data-notr><div><small>${isEU() ? 'Esku pilota' : 'Pelota a mano'}</small><h2>${isEU() ? 'Zein frontoitan?' : '¿En qué frontón?'}</h2></div></div>
      <div class="lg-list tq-pueblos">${grupos.map(([c, ts]) => `<section><h3>${esc(c.name)}</h3><div>${ts.map(l => { const n = l.name.split(' /')[0]; return `<button type="button" class="${n === here ? 'on' : ''}" data-pueblo="${l.id}">${esc(n)}</button>`; }).join('')}</div></section>`).join('')}</div>
      <div class="lg-btns"><button class="lg-btn" data-a="no" data-notr>${isEU() ? 'Itzuli' : 'Volver'}</button></div>`);
    r.addEventListener('click', (e) => { const b = e.target.closest('[data-pueblo], [data-a]'); if (!b) return; r.remove(); res(b.dataset.pueblo || null); });
  });
}
/** Pantalla del torneo (here: el nombre del pueblo del frontón donde se juega; o: los frontones a elegir, ver sedeHtml:
 *  la elección se apunta en T.sede con su ronda). Devuelve 'play' | 'sim' | 'new' | 'exit'. */
const css = () => { if (!document.getElementById('tq-css')) { const st = document.createElement('style'); st.id = 'tq-css'; st.textContent = CSS; document.head.appendChild(st); } };
export function torneoPanel(T, here = null, o = null) {
  css();
  return new Promise(res => {
    const m = yourMatch(T), pairs = T.kind === 'parejas', lang = isEU() ? 'eu' : 'es', yp = T.players.find(p => p.you);
    // (el frontón del partido: el elegido para esta ronda o, si no, el de siempre: el cubierto y, la final, el Labrit)
    if (o && m) { o.sede = sedeDe(T, m); o.onSede = (k) => { T.sede = { round: m.round, edition: T.edition, kind: k }; }; }
    const head = `<div class="tq-top"><div class="lg-head tq-txa">${TXAPELA()}<div><small>${(KINDS[T.kind] || KINDS.mano).full} · edición ${T.edition}</small><h2>Txapela de ${esc(T.comarcaName)}</h2></div></div><button class="tq-info" data-info aria-expanded="false" aria-label="Cómo funciona">?</button></div>`;
    const how = pairs ? '<p class="lg-how tq-how" hidden><b>Cómo funciona:</b> ocho parejas de delantero y zaguero por eliminatorias (cuartos y semifinales a 5 tantos, final a 7). Juegas con tu compañero de siempre. La final, en el frontón Labrit de Iruña.</p>'
      : T.kind === 'cuatro' ? '<p class="lg-how tq-how" hidden><b>Cómo funciona:</b> ocho pelotaris mano a mano por eliminatorias (cuartos y semifinales a 5 tantos, final a 7) en el Cuatro y Medio: la pelota no puede botar más allá de la raya del 4 y medio, la del suelo entre el 4 y el 5, y el saque bota entre la raya del 3 y la del 5. Juego corto, de dejadas y ganchos. La final, en el Labrit.</p>'
      : '<p class="lg-how tq-how" hidden><b>Cómo funciona:</b> ocho pelotaris por eliminatorias (cuartos y semifinales a 5 tantos, final a 7). Los rivales vienen a tu frontón; la final, en el frontón Labrit de Iruña. Los demás partidos se simulan.</p>';
    // (las cartas del duelo, con el color que cada uno viste en el partido)
    const col = m ? coloresPartido(`${pairs ? m.rival.mates[0] : m.rival.name} (${m.rival.town})`, m.level, m.mate?.name, m.partner?.name).colors : { you: 'azul', rival: 'rojo' };
    const youCard = (w) => pelotariCard({ name: pairs ? yp.mates[0] : yp.name, town: yp.town, side: col.you, role: pairs ? 'Del' : 'Mano', w, bonus: youBonus(T), stats: { fuerza: 3, agilidad: 3, velocidad: 3 }, pop: true, lang });
    let left;
    if (T.done) { const C = T.players[T.champion]; left = `<div class="tq-banner"><small>Txapeldun · campeón del torneo</small>${pelotariCard({ name: C.name, town: C.town, side: C.you ? (T.tuColor || 'azul') : (T.tuColor === 'rojo' ? 'azul' : 'rojo'), role: pairs ? 'Par' : 'Mano', w: 110, bonus: C.you ? youBonus(T) : rivalBonus(C), stats: C.you ? {} : pairs ? mateStats(C, 0) : statsOf(C), pop: true, lang })}<p>${C.you ? '¡La txapela es tuya! Zorionak!' : `${esc(C.town)} se lleva la txapela. ¡A por la próxima!`}</p></div>`; }
    else if (m) {
      const rv = m.rival, rvStats = pairs ? mateStats(rv, 0) : statsOf(rv);
      left = `<div class="tq-duel">${youCard(120)}<div class="tq-mid"><b>VS</b><small class="r">${esc(m.round)}</small><small>A ${m.target} tantos</small></div>${pelotariCard({ name: pairs ? rv.mates[0] : rv.name, town: rv.town, side: col.rival, role: pairs ? 'Del' : 'Mano', w: 120, bonus: rivalBonus(rv), stats: rvStats, tag: 'button', attr: 'data-f="rival" aria-label="Ficha del rival"', d: 0.08, pop: true, lang })}</div>
        <p class="tq-ficha">Toca su carta para ver su ficha</p>
        <div class="tq-where">${o ? sedeHtml(o, here) : here ? `<span>Frontón de <b>${esc(here)}</b></span>` : ''}<span>Tus txapelas <b>${T.txapelas || 0}</b></span></div>`;
    } else left = `<div class="tq-banner"><small>Eliminado</small><b>El torneo sigue</b><p>Mira quién se lleva la txapela.</p></div>`;
    const btns = T.done ? '<button class="lg-btn go" data-a="new">Nuevo torneo</button>' : m ? '<button class="lg-btn go" data-a="play">¡A jugar!</button>' : '<button class="lg-btn go" data-a="sim">Siguiente ronda</button>';
    const r = lgPanel(`${head}<div class="tq-left">${left}<div class="lg-btns lg-foot">${btns}<button class="lg-btn" data-a="exit">Salir</button></div></div><div class="tq-right">${bracketHtml(T)}</div>${how}`);
    const cardEl = r.firstElementChild; cardEl.classList.remove('lg-two'); cardEl.classList.add('tq-card');
    // (y otra vez si cambia el tamaño del cuadro o de sus columnas, por ejemplo al cargar las fuentes)
    const lines = () => drawLines(r); requestAnimationFrame(lines); const ro = new ResizeObserver(lines); r.querySelectorAll('.tq-br, .tq-rd').forEach(e => ro.observe(e));
    r.addEventListener('click', async (e) => {
      if (o && await sedeClick(e, r, o, here)) return;
      const f = e.target.closest('[data-f]'); if (f && m) { const L = fichaList(T, m); openFicha(L, Math.max(0, L.findIndex(p => p.id === f.dataset.f)), lang); return; }   // (la ficha, encima del cuadro)
      const inf = e.target.closest('[data-info]'); if (inf) { const h = r.querySelector('.tq-how'), on = h.hidden; h.hidden = !on; inf.setAttribute('aria-expanded', String(on)); requestAnimationFrame(lines); return; }
      const b = e.target.closest('[data-a]'); if (!b) return; ro.disconnect(); r.remove(); res(b.dataset.a); });
  });
}
/** El frontón de tu partido del torneo: el que elegiste para esta ronda o el de siempre (la final, en el Labrit). */
export const sedeDe = (T, m) => (T.sede?.round === m.round && T.sede.edition === T.edition ? T.sede.kind : m.round === 'Final' ? 'labrit' : 'cubierto');
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
      const s = o && await sedeClick(e, r, o, here); if (s?.otro) { ro.disconnect(); r.remove(); res('otro:' + s.otro); return; } if (s) return;
      const b = e.target.closest('[data-a]'); if (!b) return; if (b.dataset.a === 'pelotaris') { await pelotarisPanel(T.comarca); const c = pelotarisCount(); const s2 = b.querySelector('.pc-n'); if (s2) s2.textContent = `${c.have}/${c.total} descubiertos`; return; } r.remove(); res(b.dataset.a); });
  });
}
export { ROUNDS };
