// Torneo de mano (pelota) de cada comarca, por eliminatorias como los campeonatos de los frontones: ocho pelotaris (tú
// y siete de los pueblos de la comarca y de alrededor), cuartos (a 5 tantos), semifinales (a 5) y final (a 7). Todo el
// torneo se juega en el frontón donde lo empiezas (el del pueblo en el que estás o el que eliges en Campeonatos): los
// rivales vienen a tu frontón, no hay que viajar. Los demás partidos se simulan según el nivel de cada pelotari. Quien
// gana la final se lleva la txapela de la comarca.
// También hay torneo por parejas (ocho parejas de delantero y zaguero, tú con tu compañero de siempre), igual de rondas.
// Los pelotaris son personajes del juego (nombres inventados con su pueblo), no pelotaris reales.
// Se guarda en localStorage ('mendimendiz-torneo-v1'): uno individual y uno por parejas por comarca.
import { lgPanel, lgEsc as esc } from '../futbol/liga.js';
import { pelotariStats, profileHtml } from '../pelota/rules.js';
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
const CSS = `.tq-bracket{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;align-items:center}
.tq-wait{display:none;font-size:var(--fs-xs);color:#a99cc9;text-align:center;padding:2px 0 4px}
@media (max-width:560px){.tq-bracket{grid-template-columns:1fr;gap:10px;align-items:start}.tq-col h4{text-align:left}.tq-m.tq-ph{display:none}.tq-col:has(.tq-wait){display:flex;align-items:baseline;gap:8px}.tq-col:has(.tq-wait) h4{margin:0}.tq-wait{display:block;text-align:left;padding:0}.tq-m{font-size:var(--fs-sm);padding:6px 10px}}
@media (orientation:landscape) and (max-height:520px){.tq-bracket{gap:6px}.tq-m{font-size:var(--fs-xs);padding:3px 6px;gap:0}.tq-m small{display:none}.tq-col{gap:5px}.tq-col h4{font-size:var(--fs-xs);line-height:1.15;letter-spacing:0}.tq-col h4 small{display:block;font-size:var(--fs-xs);opacity:.75;text-transform:none}.tq-col h4 small i{display:none}}
.tq-col{display:grid;gap:8px}.tq-col h4 small{font-size:var(--fs-xs)}.tq-col h4 small i{font-style:normal}.tq-col h4{margin:0;text-align:center;font-size:var(--fs-xs);color:#cbbcf0;text-transform:uppercase;letter-spacing:.04em}
.tq-m{border-radius:12px;background:rgba(255,255,255,.07);padding:5px 8px;font-size:var(--fs-sm);display:grid;gap:2px}
.tq-m div{display:flex;justify-content:space-between;gap:6px}.tq-m b{font-variant-numeric:tabular-nums}.tq-m .w{color:#ffd84a;font-weight:900}.tq-m .you{text-decoration:underline;text-decoration-color:#ffd84a}
.tq-m small{color:#a99cc9;font-size:var(--fs-xs)}
.tq-st{display:flex;flex-wrap:wrap;align-items:center;gap:4px 14px;background:rgba(255,215,0,.08);border:1px solid rgba(255,215,0,.32);border-radius:12px;padding:7px 12px;margin:2px 0 10px;font-size:var(--fs-sm)}
.tq-st b{color:#ffd84a}.tq-st span{white-space:nowrap}.tq-st i{font-style:normal;color:#ffd84a;letter-spacing:1px}.tq-st i u{color:rgba(255,255,255,.22);text-decoration:none}.tq-st p{margin:0;flex:1 1 100%;font-size:var(--fs-sm);color:#d8cff0}.tq-st p em{font-style:normal}
.tq-st2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:6px 14px}.tq-st2 .pf{gap:2px 8px}.tq-st .pf-k{white-space:normal}
.tq-pairs .tq-m{font-size:var(--fs-xs)}.tq-pairs .tq-m small{display:none}
.tq-st>.pf{flex:1 1 100%;display:flex;flex-wrap:wrap;align-items:center;gap:2px 12px}.tq-st .pf>b{flex:1 1 100%}.tq-st .pf-k{color:#fff}.tq-st .pf-sh{flex:1 1 100%;white-space:normal}.tq-st .pf-sh em{font-style:normal;margin-right:10px;white-space:nowrap}.tq-st p strong{color:#ffb9a8}
@media (orientation:landscape) and (max-height:520px){.tq-st{padding:4px 10px;margin:0 0 6px;font-size:var(--fs-xs)}.tq-st p{font-size:var(--fs-xs)}}.tq-txa{display:flex;align-items:center;gap:10px}.tq-txa svg{width:44px;height:30px}`;
const TXAPELA = '<svg viewBox="0 0 64 40"><ellipse cx="32" cy="30" rx="29" ry="7" fill="#1b1b22"/><path d="M6 28c2-14 14-22 26-22s24 8 26 22c-8 4-44 4-52 0z" fill="#22232c"/><path d="M30 6c0-3 4-3 4 0" stroke="#22232c" stroke-width="3" fill="none"/><path d="M8 29c10 3 38 3 48 0" stroke="#c8222a" stroke-width="3" fill="none"/></svg>';
function card(T, p, s, wIdx) {
  const P = T.players[p];
  return `<div class="${wIdx ? 'w' : ''} ${P.you ? 'you' : ''}"><span>${esc(P.name)}<small> · ${esc(P.town)}</small></span><b>${s == null ? '' : s}</b></div>`;
}
function bracketHtml(T) {
  const cols = ROUNDS.map((R, i) => {
    const ms = i < T.past.length ? T.past[i].matches : i === T.round && !T.done ? T.matches : [];
    const n = [4, 2, 1][i];
    const rows = Array.from({ length: n }, (_, k) => { const m = ms[k]; if (!m) return '<div class="tq-m tq-ph"><div><span>—</span></div><div><span>—</span></div></div>';
      const aw = m.s && m.s[0] > m.s[1], bw = m.s && m.s[1] > m.s[0];
      return `<div class="tq-m">${card(T, m.a, m.s?.[0], aw)}${card(T, m.b, m.s?.[1], bw)}</div>`; }).join('');
    // (en el móvil las rondas van una debajo de otra y las que aún no se juegan solo dicen «por jugar»)
    return `<div class="tq-col"><h4>${R.name}<small><i> · </i>a ${R.target}</small></h4>${ms.length ? '' : '<div class="tq-wait">Por jugar</div>'}${rows}</div>`;
  }).join('');
  return `<div class="tq-bracket${T.kind === 'parejas' ? ' tq-pairs' : ''}">${cols}</div>`;
}
// cómo juega tu próximo rival: cómo corre, cuánto pega, sus manos, sus golpes preferidos y de qué tener cuidado
function statsBox(p, T) {
  const lang = isEU() ? 'eu' : 'es';
  if (T?.kind === 'parejas') { const R = lang === 'eu' ? ['aurrelaria', 'atzelaria'] : ['delantero', 'zaguero']; return `<div class="tq-st tq-st2">${[0, 1].map(i => `<div class="pf">${profileHtml(p.mates[i], mateStats(p, i), lang, R[i])}</div>`).join('')}</div>`; }
  return `<div class="tq-st"><div class="pf">${profileHtml(p.name, statsOf(p), lang)}</div></div>`;
}
/** Pantalla del torneo (here: el nombre del pueblo del frontón donde se juega). Devuelve 'play' | 'sim' | 'new' | 'exit'. */
const css = () => { if (!document.getElementById('tq-css')) { const st = document.createElement('style'); st.id = 'tq-css'; st.textContent = CSS; document.head.appendChild(st); } };
export function torneoPanel(T, here = null) {
  css();
  return new Promise(res => {
    const m = yourMatch(T);
    const pairs = T.kind === 'parejas';
    const head = `<div class="lg-head tq-txa">${TXAPELA}<div><small>${pairs ? 'Torneo por parejas' : 'Torneo de mano'} · edición ${T.edition}</small><h2>Txapela de ${esc(T.comarcaName)}</h2><span class="lg-note">${T.txapelas ? `Tus txapelas: ${T.txapelas}` : 'Gana la final y la txapela es tuya'}</span></div></div>`;
    // cómo funciona: solo al empezar (en las rondas siguientes ya se sabe)
    const how = T.round === 0 && !T.past.length && !T.done ? (pairs ? '<p class="lg-how"><b>Cómo funciona:</b> ocho parejas de delantero y zaguero por eliminatorias (cuartos y semifinales a 5 tantos, final a 7). Juegas con tu compañero de siempre; antes de cada partido eliges si vas de delantero o de zaguero. La final, en el frontón Labrit de Iruña.</p>'
      : '<p class="lg-how"><b>Cómo funciona:</b> ocho pelotaris por eliminatorias (cuartos y semifinales a 5 tantos, final a 7). Los cuartos y las semifinales se juegan en este frontón: los rivales vienen aquí. La final, en el frontón Labrit de Iruña. Los demás partidos se simulan.</p>') : '';
    let mid;
    if (T.done) { const C = T.players[T.champion]; mid = `<div class="lg-champ"><small>TXAPELDUN · CAMPEÓN DEL TORNEO</small><br><b>${esc(C.name)}</b><br>${C.you ? '¡La txapela es tuya! Zorionak!' : `${esc(C.town)} se lleva la txapela. ¡A por la próxima!`}</div>`; }
    else if (m) mid = `<div class="lg-next${pairs ? ' tq-pair' : ''}"><div class="lg-t"><b>${esc(T.players[0].name)}</b><em>${esc(T.players[0].town)}</em></div><div class="lg-vs">VS<small>${esc(m.round.toUpperCase())} · A ${m.target} TANTOS</small>${here ? `<small>FRONTÓN DE ${esc(here.toUpperCase())}</small>` : ''}</div><div class="lg-t"><b>${esc(m.rival.name)}</b><em>${esc(m.rival.town)} · ${'★'.repeat(m.rival.lv)}</em></div></div>${statsBox(m.rival, T)}`;
    else mid = `<div class="lg-champ"><small>ELIMINADO</small><br>El torneo sigue sin ti: mira quién se lleva la txapela.</div>`;
    const btns = T.done ? '<button class="lg-btn go" data-a="new">Nuevo torneo</button>' : m ? '<button class="lg-btn go" data-a="play">¡A jugar!</button>' : '<button class="lg-btn go" data-a="sim">Siguiente ronda</button>';
    const r = lgPanel(`${head}${mid}${how}${bracketHtml(T)}<div class="lg-btns">${btns}<button class="lg-btn" data-a="exit">Salir</button></div><p class="lg-note lg-adapt">Pelotaris inventados para el juego.</p>`);
    r.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (!b) return; r.remove(); res(b.dataset.a); });
  });
}
/** Menú del pelotari: torneo individual, torneo por parejas o partido libre (here: el nombre del pueblo del frontón;
 *  T2: el torneo por parejas). Devuelve 'torneo' | 'torneoParejas' | 'libre' | 'exit'. */
export function pelotaMenu(T, here = null, T2 = null) {
  css();   // (antes solo lo ponía el cuadro del torneo: la primera vez, la txapela salía enorme)
  return new Promise(res => {
    const sub = (X) => { const m = yourMatch(X); return X.done ? 'Nueva edición' : m ? `${m.round} contra ${esc(m.rival.name)} · aquí` : 'Siguiente ronda'; };
    const small = (t) => `<br><small style="font:700 var(--fs-xs) Nunito,sans-serif;opacity:.8">${t}</small>`, tx = (T.txapelas || 0) + (T2?.txapelas || 0);
    const r = lgPanel(`<div class="lg-head tq-txa">${TXAPELA}<div><small>${here ? `Frontón de ${esc(here)}` : 'Frontón del pueblo'}</small><h2>Pelota a mano</h2><span class="lg-note">${tx ? `Tus txapelas: ${tx}` : 'Partido libre o torneo por la txapela'}</span></div></div>
      <div class="lg-btns tq-menu"><button class="lg-btn go" data-a="torneo">Torneo individual${small(sub(T))}</button>${T2 ? `<button class="lg-btn go" data-a="torneoParejas">Torneo por parejas${small(sub(T2))}</button>` : ''}<button class="lg-btn" data-a="libre">Partido libre${small('Mano a mano o parejas · a 5 tantos')}</button><button class="lg-btn" data-a="exit">Salir</button></div>`);
    r.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (!b) return; r.remove(); res(b.dataset.a); });
  });
}
export { ROUNDS };
