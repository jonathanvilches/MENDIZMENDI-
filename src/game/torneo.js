// Torneo de mano (pelota) de cada comarca, por eliminatorias como los campeonatos de los frontones: ocho pelotaris (tú
// y siete de los pueblos de la comarca y de alrededor), cuartos (a 5 tantos), semifinales (a 5) y final (a 7). Todo el
// torneo se juega en el frontón donde lo empiezas (el del pueblo en el que estás o el que eliges en Campeonatos): los
// rivales vienen a tu frontón, no hay que viajar. Los demás partidos se simulan según el nivel de cada pelotari. Quien
// gana la final se lleva la txapela de la comarca.
// También hay torneo por parejas (ocho parejas de delantero y zaguero, tú con tu compañero de siempre), igual de rondas.
// Los pelotaris son personajes del juego (nombres inventados con su pueblo), no pelotaris reales.
// Se guarda en localStorage ('mendimendiz-torneo-v1'): uno individual y uno por parejas por comarca.
import { lgPanel, lgEsc as esc } from '../futbol/liga.js';
import { pelotarisPanel, pelotarisCount } from './pelotaris.js';
import { pelotariStats } from '../pelota/rules.js';
import { openFicha } from '../pelota/ficha.js';
import { pelotariCard, PELOTARI_IMG } from '../ui/sportCard.js';
// (el idioma, el que marca la página: en euskera, «eu»)
const isEU = () => typeof document !== 'undefined' && document.documentElement?.lang === 'eu';
/** Las cualidades de un pelotari del torneo y sus golpes preferidos (los de los torneos guardados antes sin golpes se
 *  rehacen: salen del nombre y del nivel, siempre los mismos). */
export const statsOf = (p) => p.st?.style ? p.st : (p.st = pelotariStats(`${p.name} ${p.town}`, p.lv || 2));

const KEY = 'mendimendiz-torneo-v1';
const ROUNDS = [{ name: 'Cuartos de final', target: 5 }, { name: 'Semifinales', target: 5 }, { name: 'Final', target: 7 }];
const NAMES = ['Unai', 'Mikel', 'Aitor', 'Iñaki', 'Oihana', 'Garazi', 'Ander', 'Xabier', 'Maialen', 'Jokin', 'Amaia', 'Ekaitz', 'Irati', 'Julen', 'Nahia', 'Asier'];
const TOWNS = ['Leitza', 'Lesaka', 'Elizondo', 'Altsasu', 'Lekunberri', 'Aoiz', 'Sangüesa', 'Estella-Lizarra', 'Tafalla', 'Olite', 'Tudela', 'Puente la Reina', 'Viana', 'Lumbier', 'Doneztebe', 'Irurtzun'];
const loadAll = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
const keyOf = (comarca, kind) => kind === 'parejas' ? comarca + ':parejas' : comarca;
const save = (T) => { try { const all = loadAll(); all[keyOf(T.comarca, T.kind)] = T; localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) { /* sin guardado */ } };
/** Las cualidades de cada uno de una pareja (i = 0 el delantero, 1 el zaguero). */
export const mateStats = (p, i) => (p.mst ||= [])[i]?.style ? p.mst[i] : (p.mst[i] = pelotariStats(`${p.mates[i]} ${p.town}`, p.lv || 2));
const clamp01 = (v) => Math.max(0.1, Math.min(0.9, v));
function rng(seed) { let s = seed | 0 || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

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
    const ed = (prev?.edition || 0) + 1, txapelas = prev?.txapelas || 0, r = rng(ed * 7919 + ctx.comarca.length * 31 + 13);
    const names = NAMES.slice().sort(() => r() - 0.5);
    // rivales: de los pueblos del juego de la comarca (y de alrededor) primero; después, de otros pueblos navarros
    const towns = [...ctx.towns.map(t => ({ name: t.name, id: t.id })).filter(t => t.name !== you.town), ...TOWNS.filter(t => t !== you.town && !ctx.towns.some(x => x.name === t)).map(name => ({ name, id: null }))];
    // nivel de 1 (flojo) a 3 (fuerte): en cada edición, algo más difíciles
    const lvOf = () => Math.min(3, 1 + Math.floor(r() * 2.2 + Math.min(ed - 1, 3) * 0.25));
    let rivals, players;
    if (kind === 'parejas') {
      // parejas del mismo pueblo: delantero y zaguero; la tuya, con tu compañero (de tu pueblo)
      const pool = names.filter(n => n !== you.name), partner = pool.pop();   // (16 nombres: 14 para las parejas rivales y tu compañero)
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
  const R = ROUNDS[T.round], r = rng(T.edition * 101 + T.round * 7);
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
.tq-duel{position:relative;display:flex;align-items:center;justify-content:center;gap:8px;padding:8px 0}
.tq-duel::before{content:'';position:absolute;inset:18% -4px;z-index:-1;background:linear-gradient(90deg,rgba(91,75,255,.35),transparent 45%,transparent 55%,rgba(255,46,136,.35));transform:skewX(-14deg)}
.tq-duel .gx-card{cursor:pointer}.tq-duel button.gx-card{border:0;padding:0;background:none;font:inherit}
.tq-mid{display:flex;flex-direction:column;align-items:center;gap:2px;text-align:center;min-width:72px}
.tq-mid b{font:400 var(--fs-4xl)/1 var(--f-display);background:linear-gradient(180deg,#fff,var(--rosa));-webkit-background-clip:text;background-clip:text;color:transparent;animation:gx-pop .5s cubic-bezier(.2,1.5,.4,1) .35s both}
.tq-mid small{font:800 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;color:var(--lila)}.tq-mid small.r{color:#fff;font-size:var(--fs-sm)}
.tq-ficha{font:600 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.06em;text-transform:uppercase;color:var(--rosa);text-align:center;margin:-4px 0 0}
.tq-where{display:flex;justify-content:center;flex-wrap:wrap;gap:4px 12px;font:600 var(--fs-sm)/1.3 var(--f-cond);letter-spacing:.04em;text-transform:uppercase;color:var(--lila)}.tq-where b{color:#fff;font-weight:800}
.tq-left .lg-btns{grid-template-columns:1fr 1.6fr}.tq-left .lg-btns>.lg-btn:only-child{grid-column:1/-1}
.tq-banner{display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px;text-align:center}
.tq-banner small{font:800 var(--fs-sm)/1.15 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;color:var(--rosa)}
.tq-banner b{font:400 var(--fs-3xl)/1 var(--f-display);text-transform:uppercase}.tq-banner p{margin:0;font:600 var(--fs-md)/1.3 var(--f-cond);color:var(--lila)}
.tq-banner .gx-card{margin:4px 0}
.tq-right{position:relative;min-width:0;display:flex;flex-direction:column}
.tq-br{position:relative;flex:1;display:grid;grid-template-columns:1fr 1fr .9fr;gap:0 22px;min-height:0}
.tq-br svg.tq-lines{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.tq-lines path{fill:none;stroke:rgba(201,178,255,.35);stroke-width:2}.tq-lines path.you{stroke:var(--fx);filter:drop-shadow(0 0 4px rgba(255,43,214,.8))}
.tq-lines path{stroke-dasharray:400;stroke-dashoffset:400;animation:tq-draw .7s ease-out .35s forwards}@keyframes tq-draw{to{stroke-dashoffset:0}}
.tq-rd{display:flex;flex-direction:column;min-width:0}
.tq-rd h4{margin:0 0 4px;font:800 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;color:var(--lila);white-space:nowrap}.tq-rd h4 small{color:var(--lila2);font:inherit;letter-spacing:.04em}
.tq-rd.now h4{color:var(--rosa)}
.tq-ms{flex:1;display:flex;flex-direction:column;justify-content:space-around;gap:4px}
.tq-m{position:relative;z-index:1;display:grid;border-radius:3px;overflow:hidden;background:rgba(18,5,42,.92);border:1px solid rgba(201,178,255,.22);clip-path:polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)}
.tq-m.me{border-color:var(--fx);box-shadow:0 0 14px rgba(255,43,214,.45)}
.tq-m>div{display:flex;align-items:center;gap:4px;padding:2px 8px;min-height:22px;font:600 var(--fs-sm)/1.15 var(--f-cond);letter-spacing:.02em;text-transform:uppercase}
.tq-m>div+div{border-top:1px solid rgba(201,178,255,.12)}
.tq-m span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tq-m small{display:none}
.tq-m b{font:400 var(--fs-md)/1 var(--f-display);min-width:14px;text-align:right}
.tq-m .w{color:#fff;font-weight:800}.tq-m .w b{color:var(--rosa)}.tq-m .l{color:var(--lila2)}.tq-m .you span{color:#fff;font-weight:800}.tq-m .you span::before{content:'';display:inline-block;width:6px;height:6px;margin:0 6px 1px 0;border-radius:1px;background:var(--fx);transform:skewX(-20deg)}
.tq-m.ph>div{color:rgba(201,178,255,.4)}
.tq-cup{display:flex;flex-direction:column;align-items:center;gap:4px;margin-top:8px;text-align:center;font:800 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;color:var(--lila)}
.tq-cup svg{width:64px;height:40px;filter:drop-shadow(0 0 10px rgba(255,43,214,.5));animation:tq-float 3s ease-in-out infinite}@keyframes tq-float{50%{transform:translateY(-4px)}}
.tq-cup b{color:#fff;font:400 var(--fs-md)/1.1 var(--f-display)}
.tq-how{grid-column:1/-1;margin:0}
.tq-txa{display:flex;align-items:center;gap:12px}.tq-txa>svg{width:52px;height:34px;flex:none}
/* menú de pelota: losas grandes como el menú de un juego de deportes, cada una con su figura */
.tq-tiles{display:grid;grid-template-columns:1.25fr 1fr 1fr 1fr;gap:12px;min-height:0}
.tq-tile{position:relative;overflow:hidden;isolation:isolate;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start;gap:2px;min-height:190px;padding:12px 14px;border:1px solid rgba(201,178,255,.25);border-radius:4px;color:#fff;text-align:left;cursor:pointer;font:inherit;
  background:linear-gradient(160deg,var(--t1,#3b1590),var(--t2,#12052a) 75%);clip-path:polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px);transition:transform .15s,border-color .15s}
.tq-tile::before{content:'';position:absolute;inset:0;z-index:-1;background:repeating-linear-gradient(125deg,transparent 0 14px,rgba(255,255,255,.035) 14px 15px)}
.tq-tile::after{content:'';position:absolute;top:-10%;bottom:-10%;left:0;width:40%;z-index:2;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);transform:translateX(-160%) skewX(-18deg);animation:gx-sweep 6s ease-in-out var(--d,0s) infinite;pointer-events:none}
.tq-tile:active{transform:scale(.97)}.tq-tile:hover{border-color:var(--rosa)}
/* (la figura arriba, en su sitio, y el texto debajo: nunca se pisan. Por parejas, los dos pelotaris uno al lado del otro) */
.tq-tile .figs{flex:1 1 0;min-height:0;align-self:stretch;display:flex;justify-content:center;align-items:flex-end;margin:0 -8px 6px;pointer-events:none}
.tq-tile img.fig{display:block;height:100%;width:auto;max-width:100%;min-width:0;object-fit:contain;object-position:50% 100%;filter:drop-shadow(0 6px 14px rgba(0,0,0,.5));transition:transform .3s}.tq-tile:hover img.fig{transform:scale(1.04) translateY(-3px)}
.tq-tile .figs img.fig+img.fig{margin-left:-14%}.tq-tile .figs img.fig:only-child{max-width:100%}.tq-tile.pair img.fig{max-width:58%}
.tq-tile img.flip{transform:scaleX(-1)}.tq-tile:hover img.flip{transform:scaleX(-1) scale(1.04) translateY(-3px)}
.tq-tile .k{font:800 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;color:var(--rosa);text-shadow:0 1px 3px rgba(0,0,0,.8)}
.tq-tile b{font:400 var(--fs-2xl)/1 var(--f-display);text-transform:uppercase;text-shadow:0 3px 0 rgba(7,2,15,.55);max-width:100%}
.tq-tile small{font:600 var(--fs-sm)/1.2 var(--f-cond);letter-spacing:.02em;color:#ece4ff;text-shadow:0 1px 3px rgba(0,0,0,.9);max-width:100%}
.tq-tile.main{--t1:#ff2bd6;--t2:#3a0b6b}.tq-tile.pair{--t1:#7b2ff7;--t2:#160636}.tq-tile.free{--t1:#5b4bff;--t2:#120a40}.tq-tile.col{--t1:#c21cff;--t2:#2a0638}
.tq-tile .fan{position:absolute;z-index:-1;top:10px;right:8px;display:flex}.tq-tile .fan .gx-card{margin-left:-46px;transform:rotate(calc(var(--r) * 1deg));transform-origin:50% 120%}.tq-tile .fan .gx-card:first-child{margin-left:0}
.tq-menu-foot{display:flex;justify-content:space-between;align-items:center;gap:12px}
@media (orientation:landscape) and (max-height:520px){
.lg-card.tq-card{gap:4px 16px;padding:8px 16px 12px}.tq-txa>svg{width:40px;height:26px}.tq-top .lg-head h2{font-size:var(--fs-xl)}
.tq-duel{padding:0}.tq-mid b{font-size:var(--fs-3xl)}.tq-left{gap:4px}.tq-left .lg-btn{min-height:44px}
.tq-m>div{min-height:20px;padding:1px 8px;font-size:var(--fs-xs)}.tq-m b{font-size:var(--fs-sm)}.tq-cup{margin-top:4px}.tq-cup svg{width:48px;height:30px}
.tq-tile{min-height:0;height:100%;padding:8px 12px}.tq-tile b{font-size:var(--fs-xl)}.tq-tiles{flex:1}.lg-card.tq-menu-card{grid-template-rows:auto minmax(0,1fr) auto;height:100%}
}
@media (max-width:620px) and (orientation:portrait){
.lg-card.tq-card{grid-template-columns:1fr;grid-template-rows:none}.tq-br{grid-template-columns:1fr 1fr .8fr;min-height:260px}
.tq-tiles{grid-template-columns:1fr 1fr}.tq-tile{min-height:150px}.tq-tile.main{grid-column:1/-1}
}`;
const TXAPELA = '<svg viewBox="0 0 64 40"><ellipse cx="32" cy="30" rx="29" ry="7" fill="#1b1b22"/><path d="M6 28c2-14 14-22 26-22s24 8 26 22c-8 4-44 4-52 0z" fill="#22232c"/><path d="M30 6c0-3 4-3 4 0" stroke="#22232c" stroke-width="3" fill="none"/><path d="M8 29c10 3 38 3 48 0" stroke="#c8222a" stroke-width="3" fill="none"/></svg>';
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
    const champ = i === 2 ? `<div class="tq-cup">${TXAPELA}${T.done ? `<b>${esc(T.players[T.champion].name)}</b>` : 'Txapela'}</div>` : '';
    return `<div class="tq-rd${i === T.round && !T.done ? ' now' : ''}"><h4>${R.name} <small>· a ${R.target}</small></h4><div class="tq-ms">${rows}${champ}</div></div>`;
  }).join('');
  return `<div class="tq-br${T.kind === 'parejas' ? ' tq-pairs' : ''}">${cols}<svg class="tq-lines" aria-hidden="true"></svg></div>`;
}
// las líneas del cuadro: de cada par de eliminatorias a la siguiente (la de tu camino, en fucsia)
function drawLines(root) {
  const br = root.querySelector('.tq-br'), svg = br?.querySelector('.tq-lines'); if (!svg) return;
  const B = br.getBoundingClientRect(), box = (r, k) => br.querySelector(`.tq-rd:nth-child(${r + 1}) .tq-m:nth-child(${k + 1})`)?.getBoundingClientRect();
  let d = '';
  for (let r = 0; r < 2; r++) for (let k = 0; k < [4, 2][r]; k++) {
    const a = box(r, k), b = box(r + 1, k >> 1); if (!a || !b) continue;
    const x0 = a.right - B.left, y0 = a.top + a.height / 2 - B.top, x1 = b.left - B.left, y1 = b.top + b.height / 2 - B.top, xm = (x0 + x1) / 2;
    const me = br.querySelector(`.tq-rd:nth-child(${r + 1}) .tq-m:nth-child(${k + 1})`).classList.contains('me');
    d += `<path class="${me ? 'you' : ''}" d="M${x0.toFixed(1)} ${y0.toFixed(1)}H${xm.toFixed(1)}V${y1.toFixed(1)}H${x1.toFixed(1)}"/>`;
  }
  svg.innerHTML = d;
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
/** Pantalla del torneo (here: el nombre del pueblo del frontón donde se juega). Devuelve 'play' | 'sim' | 'new' | 'exit'. */
const css = () => { if (!document.getElementById('tq-css')) { const st = document.createElement('style'); st.id = 'tq-css'; st.textContent = CSS; document.head.appendChild(st); } };
export function torneoPanel(T, here = null) {
  css();
  return new Promise(res => {
    const m = yourMatch(T), pairs = T.kind === 'parejas', lang = isEU() ? 'eu' : 'es', yp = T.players.find(p => p.you);
    const head = `<div class="tq-top"><div class="lg-head tq-txa">${TXAPELA}<div><small>${pairs ? 'Torneo por parejas' : 'Torneo de mano'} · edición ${T.edition}</small><h2>Txapela de ${esc(T.comarcaName)}</h2></div></div><button class="tq-info" data-info aria-expanded="false" aria-label="Cómo funciona">?</button></div>`;
    const how = pairs ? '<p class="lg-how tq-how" hidden><b>Cómo funciona:</b> ocho parejas de delantero y zaguero por eliminatorias (cuartos y semifinales a 5 tantos, final a 7). Juegas con tu compañero de siempre. La final, en el frontón Labrit de Iruña.</p>'
      : '<p class="lg-how tq-how" hidden><b>Cómo funciona:</b> ocho pelotaris por eliminatorias (cuartos y semifinales a 5 tantos, final a 7). Los rivales vienen a tu frontón; la final, en el frontón Labrit de Iruña. Los demás partidos se simulan.</p>';
    const youCard = (w) => pelotariCard({ name: pairs ? yp.mates[0] : yp.name, town: yp.town, side: 'azul', role: pairs ? 'Del' : 'Mano', w, bonus: youBonus(T), stats: { fuerza: 3, agilidad: 3, velocidad: 3 }, pop: true, lang });
    let left;
    if (T.done) { const C = T.players[T.champion]; left = `<div class="tq-banner"><small>Txapeldun · campeón del torneo</small>${pelotariCard({ name: C.name, town: C.town, side: C.you ? 'azul' : 'rojo', role: pairs ? 'Par' : 'Mano', w: 110, bonus: C.you ? youBonus(T) : rivalBonus(C), stats: C.you ? {} : pairs ? mateStats(C, 0) : statsOf(C), pop: true, lang })}<p>${C.you ? '¡La txapela es tuya! Zorionak!' : `${esc(C.town)} se lleva la txapela. ¡A por la próxima!`}</p></div>`; }
    else if (m) {
      const rv = m.rival, rvStats = pairs ? mateStats(rv, 0) : statsOf(rv);
      left = `<div class="tq-duel">${youCard(120)}<div class="tq-mid"><b>VS</b><small class="r">${esc(m.round)}</small><small>A ${m.target} tantos</small></div>${pelotariCard({ name: pairs ? rv.mates[0] : rv.name, town: rv.town, side: 'rojo', role: pairs ? 'Del' : 'Mano', w: 120, bonus: rivalBonus(rv), stats: rvStats, tag: 'button', attr: 'data-f="rival" aria-label="Ficha del rival"', d: 0.08, pop: true, lang })}</div>
        <p class="tq-ficha">Toca su carta para ver su ficha</p>
        <div class="tq-where">${here ? `<span>Frontón de <b>${esc(here)}</b></span>` : ''}<span>Tus txapelas <b>${T.txapelas || 0}</b></span></div>`;
    } else left = `<div class="tq-banner"><small>Eliminado</small><b>El torneo sigue</b><p>Mira quién se lleva la txapela.</p></div>`;
    const btns = T.done ? '<button class="lg-btn go" data-a="new">Nuevo torneo</button>' : m ? '<button class="lg-btn go" data-a="play">¡A jugar!</button>' : '<button class="lg-btn go" data-a="sim">Siguiente ronda</button>';
    const r = lgPanel(`${head}<div class="tq-left">${left}<div class="lg-btns lg-foot">${btns}<button class="lg-btn" data-a="exit">Salir</button></div></div><div class="tq-right">${bracketHtml(T)}</div>${how}`);
    const cardEl = r.firstElementChild; cardEl.classList.remove('lg-two'); cardEl.classList.add('tq-card');
    const lines = () => drawLines(r); requestAnimationFrame(lines); setTimeout(lines, 650); addEventListener('resize', lines);   // (y otra vez al acabar las entradas: las cajas ya en su sitio)
    r.addEventListener('click', (e) => {
      const f = e.target.closest('[data-f]'); if (f && m) { const L = fichaList(T, m); openFicha(L, Math.max(0, L.findIndex(p => p.id === f.dataset.f)), lang); return; }   // (la ficha, encima del cuadro)
      const inf = e.target.closest('[data-info]'); if (inf) { const h = r.querySelector('.tq-how'), on = h.hidden; h.hidden = !on; inf.setAttribute('aria-expanded', String(on)); requestAnimationFrame(lines); return; }
      const b = e.target.closest('[data-a]'); if (!b) return; removeEventListener('resize', lines); r.remove(); res(b.dataset.a); });
  });
}
/** Menú del pelotari: torneo individual, torneo por parejas o partido libre (here: el nombre del pueblo del frontón;
 *  T2: el torneo por parejas). Devuelve 'torneo' | 'torneoParejas' | 'libre' | 'exit'. */
export function pelotaMenu(T, here = null, T2 = null) {
  css();   // (antes solo lo ponía el cuadro del torneo: la primera vez, la txapela salía enorme)
  return new Promise(res => {
    const sub = (X) => { const m = yourMatch(X); return X.done ? 'Nueva edición' : m ? `${m.round} · rival: ${esc(m.rival.name)}` : 'Siguiente ronda'; };
    const tx = (T.txapelas || 0) + (T2?.txapelas || 0), C = pelotarisCount(), lang = isEU() ? 'eu' : 'es';
    const fan = [{ n: 'Mikel', st: { fuerza: 4, agilidad: 3, velocidad: 2 }, r: -10 }, { n: 'Garazi', st: { fuerza: 2, agilidad: 4, velocidad: 4 }, r: 0 }, { n: 'Unai', st: { fuerza: 3, agilidad: 5, velocidad: 3 }, r: 10 }]
      .map((q, i) => pelotariCard({ name: q.n, town: '', side: i === 1 ? 'azul' : 'rojo', w: 76, stats: q.st, lock: i > 0 && C.have <= i, mini: true, lang }).replace('style="', `style="--r:${q.r};`)).join('');
    const r = lgPanel(`<div class="lg-head tq-txa">${TXAPELA}<div><small>${here ? `Frontón de ${esc(here)}` : 'Frontón del pueblo'}</small><h2>Pelota a mano</h2></div>${tx ? `<div class="lg-ovr">${tx}<small>TXAPELAS</small></div>` : ''}</div>
      <div class="tq-tiles"><button class="tq-tile main" data-a="torneo" style="--d:.2s"><span class="figs"><img class="fig" src="${PELOTARI_IMG.red}" alt=""></span><span class="k">${T.txapelas ? `${T.txapelas} txapelas` : 'Por la txapela'}</span><b>Torneo individual</b><small>${sub(T)}</small></button>
        ${T2 ? `<button class="tq-tile pair" data-a="torneoParejas" style="--d:.8s"><span class="figs"><img class="fig" src="${PELOTARI_IMG.blue}" alt=""><img class="fig flip" src="${PELOTARI_IMG.red}" alt=""></span><span class="k">Delantero y zaguero</span><b>Torneo por parejas</b><small>${sub(T2)}</small></button>` : ''}
        <button class="tq-tile free" data-a="libre" style="--d:1.4s"><span class="figs"><img class="fig" src="${PELOTARI_IMG.blue}" alt=""></span><span class="k">A 5 tantos</span><b>Partido libre</b><small>Mano a mano o parejas</small></button>
        <button class="tq-tile col" data-a="pelotaris" style="--d:2s"><span class="fan" aria-hidden="true">${fan}</span><span class="k">Tu colección</span><b>Pelotaris</b><small class="pc-n">${C.have}/${C.total} descubiertos</small></button></div>
      <div class="tq-menu-foot"><button class="lg-btn" data-a="exit">Salir</button></div>`);
    r.firstElementChild.classList.add('tq-menu-card');
    // (la colección se abre encima y, al cerrarla, el menú sigue ahí)
    r.addEventListener('click', async (e) => { const b = e.target.closest('[data-a]'); if (!b) return; if (b.dataset.a === 'pelotaris') { await pelotarisPanel(T.comarca); const c = pelotarisCount(); const s2 = b.querySelector('.pc-n'); if (s2) s2.textContent = `${c.have}/${c.total} descubiertos`; return; } r.remove(); res(b.dataset.a); });
  });
}
export { ROUNDS };
