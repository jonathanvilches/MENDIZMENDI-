// Torneo de mano (pelota) de cada comarca, por eliminatorias como los campeonatos de los frontones: ocho pelotaris (tú
// y siete de los pueblos de la comarca y de alrededor), cuartos (a 5 tantos), semifinales (a 5) y final (a 7). Es parte
// de la misión de la comarca: cada partido tuyo se juega en el frontón de un pueblo distinto (el del rival, si es un
// pueblo del juego); hay que viajar allí y hablar con su pelotari. Los demás partidos se simulan según el nivel de cada
// pelotari. Quien gana la final se lleva la txapela de la comarca.
// Los pelotaris son personajes del juego (nombres inventados con su pueblo), no pelotaris reales.
// Se guarda en localStorage ('mendimendiz-torneo-v1'), uno por comarca.
import { lgPanel, lgEsc as esc } from '../futbol/liga.js';

const KEY = 'mendimendiz-torneo-v1';
const ROUNDS = [{ name: 'Cuartos de final', target: 5 }, { name: 'Semifinales', target: 5 }, { name: 'Final', target: 7 }];
const NAMES = ['Unai', 'Mikel', 'Aitor', 'Iñaki', 'Oihana', 'Garazi', 'Ander', 'Xabier', 'Maialen', 'Jokin', 'Amaia', 'Ekaitz', 'Irati', 'Julen', 'Nahia', 'Asier'];
const TOWNS = ['Leitza', 'Lesaka', 'Elizondo', 'Altsasu', 'Lekunberri', 'Aoiz', 'Sangüesa', 'Estella-Lizarra', 'Tafalla', 'Olite', 'Tudela', 'Puente la Reina', 'Viana', 'Lumbier', 'Doneztebe', 'Irurtzun'];
const loadAll = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
const save = (T) => { try { const all = loadAll(); all[T.comarca] = T; localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) { /* sin guardado */ } };
function rng(seed) { let s = seed | 0 || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

/** Txapelas ganadas en cada comarca: { comarca: n } */
export function txapelas() { const all = loadAll(), o = {}; for (const k in all) if (all[k]?.txapelas) o[k] = all[k].txapelas; return o; }
/**
 * El torneo de la comarca en curso (o uno nuevo).
 * you: { name, town }; ctx: { comarca, comarcaName, towns: [{ id, name }] } (los pueblos del juego donde se juega:
 * primero los de la comarca y después los de alrededor)
 */
export function torneo(you, ctx, fresh = false) {
  // (el torneo terminado se sigue mostrando, con su campeón, hasta que se pide uno nuevo)
  let T = loadAll()[ctx.comarca];
  if (T && T.done && fresh) T = null;
  if (!T) {
    const prev = loadAll()[ctx.comarca];
    const ed = (prev?.edition || 0) + 1, txapelas = prev?.txapelas || 0, r = rng(ed * 7919 + ctx.comarca.length * 31 + 13);
    const names = NAMES.slice().sort(() => r() - 0.5);
    // rivales: de los pueblos del juego de la comarca (y de alrededor) primero; después, de otros pueblos navarros
    const towns = [...ctx.towns.map(t => ({ name: t.name, id: t.id })).filter(t => t.name !== you.town), ...TOWNS.filter(t => t !== you.town && !ctx.towns.some(x => x.name === t)).map(name => ({ name, id: null }))];
    // nivel de 1 (flojo) a 3 (fuerte): en cada edición, algo más difíciles
    const rivals = Array.from({ length: 7 }, (_, i) => ({ id: 'p' + i, name: names[i], town: towns[i].name, townId: towns[i].id, lv: Math.min(3, 1 + Math.floor(r() * 2.2 + Math.min(ed - 1, 3) * 0.25)) }));
    const players = [{ id: 'you', name: you.name, town: you.town, lv: 2, you: true }, ...rivals];
    // cuadro: tú contra el más flojo en cuartos (como cabeza de serie)
    const order = [0, ...rivals.map((p, i) => i + 1).sort((a, b) => players[a].lv - players[b].lv)];
    const seed = [order[0], order[1], order[4], order[5], order[2], order[3], order[6], order[7]];
    T = { comarca: ctx.comarca, comarcaName: ctx.comarcaName, venues: ctx.towns, edition: ed, txapelas, players, round: 0, matches: [[0, 1], [2, 3], [4, 5], [6, 7]].map(([a, b]) => ({ a: seed[a], b: seed[b], s: null })), past: [], done: false, champion: null };
    save(T);
  }
  return T;
}
/** Tu partido de la ronda: { rival, target, level, round } (o null si ya estás fuera o ha terminado). */
export function yourMatch(T) {
  if (T.done) return null;
  const m = T.matches.find(x => T.players[x.a].you || T.players[x.b].you); if (!m) return null;
  const rv = T.players[T.players[m.a].you ? m.b : m.a], R = ROUNDS[T.round];
  // dónde se juega: en el pueblo del rival si es un pueblo del juego y no se ha jugado ya allí; si no, en otro pueblo
  // de la comarca (cada ronda en uno distinto)
  if (!m.venue) {
    const used = new Set((T.used || []));
    const v = rv.townId && !used.has(rv.townId) ? T.venues.find(t => t.id === rv.townId) : null;
    m.venue = v || T.venues.find(t => !used.has(t.id)) || T.venues[T.round % T.venues.length];
    save(T);
  }
  return { rival: rv, target: R.target, round: R.name, level: rv.lv >= 3 ? 'dificil' : rv.lv <= 1 ? 'facil' : 'normal', venue: m.venue };
}
/** Apunta tu resultado (o null si ya estás eliminado), simula el resto de la ronda y prepara la siguiente. */
export function playTorneoRound(T, you = null, rival = null) {
  const R = ROUNDS[T.round], r = rng(T.edition * 101 + T.round * 7);
  for (const m of T.matches) {
    const A = T.players[m.a], B = T.players[m.b];
    if ((A.you || B.you) && you != null) { m.s = A.you ? [you, rival] : [rival, you]; if (m.venue) (T.used ||= []).push(m.venue.id); }
    else {
      const pa = 0.5 + (A.lv - B.lv) * 0.15, aw = r() < pa, lose = Math.floor(r() * R.target * 0.85);
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
.tq-wait{display:none;font-size:12px;color:#a99cc9;text-align:center;padding:2px 0 4px}
@media (max-width:560px){.tq-bracket{grid-template-columns:1fr;gap:10px;align-items:start}.tq-col h4{text-align:left}.tq-m.tq-ph{display:none}.tq-col:has(.tq-wait){display:flex;align-items:baseline;gap:8px}.tq-col:has(.tq-wait) h4{margin:0}.tq-wait{display:block;text-align:left;padding:0}.tq-m{font-size:13.5px;padding:6px 10px}}
@media (orientation:landscape) and (max-height:520px){.tq-bracket{gap:6px}.tq-m{font-size:11.5px;padding:3px 6px;gap:0}.tq-m small{display:none}.tq-col{gap:5px}.tq-col h4{font-size:9.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.tq-col{display:grid;gap:8px}.tq-col h4{margin:0;text-align:center;font-size:11px;color:#cbbcf0;text-transform:uppercase;letter-spacing:.06em}
.tq-m{border-radius:12px;background:rgba(255,255,255,.07);padding:5px 8px;font-size:12.5px;display:grid;gap:2px}
.tq-m div{display:flex;justify-content:space-between;gap:6px}.tq-m b{font-variant-numeric:tabular-nums}.tq-m .w{color:#ffd84a;font-weight:900}.tq-m .you{text-decoration:underline;text-decoration-color:#ffd84a}
.tq-m small{color:#a99cc9;font-size:10px}.tq-txa{display:flex;align-items:center;gap:10px}.tq-txa svg{width:44px;height:30px}`;
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
    return `<div class="tq-col"><h4>${R.name} · a ${R.target}</h4>${ms.length ? '' : '<div class="tq-wait">Por jugar</div>'}${rows}</div>`;
  }).join('');
  return `<div class="tq-bracket">${cols}</div>`;
}
/** Pantalla del torneo. Devuelve 'play' | 'sim' | 'new' | 'exit'. */
export function torneoPanel(T, here = null) {
  if (!document.getElementById('tq-css')) { const st = document.createElement('style'); st.id = 'tq-css'; st.textContent = CSS; document.head.appendChild(st); }
  return new Promise(res => {
    const m = yourMatch(T), out = youOut(T);
    const head = `<div class="lg-head tq-txa">${TXAPELA}<div><small>Torneo de mano · edición ${T.edition}</small><h2>Txapela de ${esc(T.comarcaName)}</h2><span class="lg-note">${T.txapelas ? `Tus txapelas: ${T.txapelas}` : 'Gana la final y la txapela es tuya'}</span></div></div>`;
    // cómo funciona: solo al empezar (en las rondas siguientes ya se sabe)
    const how = T.round === 0 && !T.past.length && !T.done ? '<p class="lg-how"><b>Cómo funciona:</b> ocho pelotaris por eliminatorias (cuartos y semifinales a 5 tantos, final a 7). Cada partido tuyo se juega en el frontón de un pueblo distinto de la comarca: viaja allí y habla con su pelotari. Los demás partidos se simulan. Es parte de la misión de la comarca.</p>' : '';
    let mid;
    if (T.done) { const C = T.players[T.champion]; mid = `<div class="lg-champ"><small>TXAPELDUN · CAMPEÓN DEL TORNEO</small><br><b>${esc(C.name)}</b><br>${C.you ? '¡La txapela es tuya! Zorionak!' : `${esc(C.town)} se lleva la txapela. ¡A por la próxima!`}</div>`; }
    else if (m) mid = `<div class="lg-next"><div class="lg-t"><b>${esc(T.players[0].name)}</b><em>${esc(T.players[0].town)}</em></div><div class="lg-vs">VS<small>${esc(m.round.toUpperCase())} · A ${m.target} TANTOS</small><small>FRONTÓN DE ${esc(m.venue.name.toUpperCase())}</small></div><div class="lg-t"><b>${esc(m.rival.name)}</b><em>${esc(m.rival.town)} · ${'★'.repeat(m.rival.lv)}</em></div></div>`;
    else mid = `<div class="lg-champ"><small>ELIMINADO</small><br>El torneo sigue sin ti: mira quién se lleva la txapela.</div>`;
    const away = m && here && m.venue.id !== here;
    const btns = T.done ? '<button class="lg-btn go" data-a="new">Nuevo torneo</button>' : m ? (away ? `<button class="lg-btn go" data-a="travel">Viajar a ${esc(m.venue.name)}</button>` : '<button class="lg-btn go" data-a="play">¡A jugar!</button>') : '<button class="lg-btn go" data-a="sim">Siguiente ronda</button>';
    const r = lgPanel(`${head}${mid}${how}${bracketHtml(T)}<div class="lg-btns">${btns}<button class="lg-btn" data-a="exit">Salir</button></div>${away && !how ? `<p class="lg-note">Tu partido es en el frontón de ${esc(m.venue.name)}: viaja allí (en el mapa) y habla con su pelotari.</p>` : ''}<p class="lg-note lg-adapt">Pelotaris inventados para el juego.</p>`);
    r.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (!b) return; r.remove(); res(b.dataset.a); });
  });
}
/** Menú del pelotari: partido libre o torneo. */
export function pelotaMenu(T, here = null) {
  return new Promise(res => {
    const m = yourMatch(T), away = m && here && m.venue.id !== here;
    const r = lgPanel(`<div class="lg-head tq-txa">${TXAPELA}<div><small>Frontón del pueblo</small><h2>Pelota a mano</h2><span class="lg-note">${T.txapelas ? `Tus txapelas: ${T.txapelas}` : 'Partido libre o torneo por la txapela'}</span></div></div>
      <div class="lg-btns"><button class="lg-btn go" data-a="torneo">Txapela de ${esc(T.comarcaName)}<br><small style="font:700 11px Nunito,sans-serif;opacity:.8">${T.done ? 'Nueva edición' : m ? `${m.round} contra ${esc(m.rival.name)}${away ? ' · en ' + esc(m.venue.name) : ' · aquí'}` : 'Siguiente ronda'}</small></button><button class="lg-btn" data-a="libre">Partido libre<br><small style="font:700 11px Nunito,sans-serif;opacity:.8">A 5 tantos</small></button><button class="lg-btn" data-a="exit">Salir</button></div>`);
    r.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (!b) return; r.remove(); res(b.dataset.a); });
  });
}
export { ROUNDS };
