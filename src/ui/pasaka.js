// La pasaka (data/pasaka.js): el minijuego del juego directo de pelota. Se juega en el sobreclaustro de la catedral, visto
// desde detrás de tu pareja: un pasillo largo con el techo de vigas, la arquería a la derecha, el banco de piedra a la
// izquierda, la red por la mitad y las líneas de saque en el suelo. Dos parejas (los rojos, tú y tu pareja; los azules,
// los rivales), la pelota con su física (gravedad, bote, paredes, techo y red), el saque con la mano que tiene que llegar
// al frontis, los quinces (15, 30, 40 y juego) y el partido a tres juegos. Se mueve tocando el suelo (o con las flechas)
// y se devuelve con Golpe (fuerte, al fondo) o Dejada (corta, junto a la red); la pareja y los rivales juegan solos.
// Vale desde el menú (hub.js, pantalla «pasaka») y en Pamplona con el canónigo del claustro (game/townGame.js, pasakaCon).
import { PASAKA, PISTA } from '../data/pasaka.js';
import { infoCard } from './minigames.js';
import { iconSVG } from './icons.js';
import { tr, isEU } from '../i18n.js';
import { profile, addCard, addXP, saveProfile, checkBadges } from '../game/profile.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const { W, L, NETH, CEIL, SAQUE, CHAPA } = PISTA, NETZ = L / 2, G = 9.81, R = 0.034;
const ROJO = '#d2352f', AZUL = '#2f63c4', QN = ['0', '15', '30', '40'];
const SKIN = ['#f1cdb0', '#e9bd9c', '#d9a884', '#f4d6bd'], HAIR = ['#2a1a12', '#4a3322', '#8c8c8c', '#1a1a1e', '#6b4a2e'];
const withEU = (who) => (/[aeiouáéíóú]$/i.test(who) ? who + 'rekin' : who + 'ekin');

/** Jugar y, si se gana, la carta de tradiciones: devuelve { win, g } o { quit }. who: la pareja (el canónigo del claustro). */
export async function jugarPasaka(ui, { who = '', games = 3 } = {}) {
  if (window.__autoWin) { window.__autoSeen?.({ title: PASAKA.name }); return { win: true, g: [games, 0] }; }
  ui.sound?.init?.();
  const r = await pasakaGame(ui, { who, games });
  if (r.quit) return r;
  const p = profile(); p.pasaka = (p.pasaka || 0) + 1; if (r.win) p.pasakaWon = (p.pasakaWon || 0) + 1;
  const isNew = r.win && addCard('pasaka:claustro', 'tradiciones');
  if (r.win) addXP(isNew ? 30 : 6);
  saveProfile();
  const eu = isEU();
  await infoCard(ui, { icon: 'pelota', kicker: who ? (eu ? withEU(who) : `Con ${who}`) : tr('Pasaka'), title: r.win ? tr('¡Has ganado la pasaka!') : tr('Esta vez han ganado ellos'),
    text: `${tr('Juegos')}: ${r.g[0]} - ${r.g[1]}. ${r.win ? tr('Así se jugaba en los claustros antes de que hubiera frontones.') : tr('Muévete antes de que llegue la pelota y usa la dejada cuando los rivales estén lejos de la red.')}`,
    badge: isNew ? tr('Nueva carta en tus tradiciones') : '', button: tr('Seguir') });
  if (isNew && !who) for (const bd of checkBadges()) await infoCard(ui, { icon: bd.icon, kicker: tr('Nueva insignia'), title: bd.name, text: bd.text, button: '¡Bien!' });
  return r;
}

// ---------- el estado del partido ----------
const mkPl = (team, x, z, me, i) => ({ team, x, z, tx: x, tz: z, hx: x, hz: z, me, speed: me ? 5.6 : 4.8 + i * 0.25, reach: me ? 1.7 : 1.35, phase: i * 1.7, swing: 0, moving: false, want: 0, wantT: 0, take: false, miss: false, decided: -1, skin: SKIN[i % 4], hair: HAIR[i % 5] });
function makeState(games) {
  return { t: 0, phase: 'intro', phaseT: 0, g: [0, 0], q: [0, 0], server: 0, faults: 0, games, over: false, auto: false, hitId: 0, msg: '', why: '',
    ball: { x: 0, y: 1, z: 7, vx: 0, vy: 0, vz: 0, last: 0, crossed: false, bounces: 0, dead: false, inPlay: false, serve: false, serveOk: false, serveB: 0, held: -1 },
    pl: [mkPl(0, 1.4, NETZ - 7.5, true, 0), mkPl(0, -2.4, NETZ - 5.5, false, 1), mkPl(1, -1.6, NETZ + 5.5, false, 2), mkPl(1, 2.3, NETZ + 7.5, false, 3)] };
}
const side = z => (z < NETZ ? 0 : 1);
const inReach = (pl, b) => Math.abs(b.x - pl.x) < pl.reach && Math.abs(b.z - pl.z) < pl.reach * 1.15 && b.y < 2.3;
// la pelota en el aire, sin nadie: hasta su primer bote en el campo que la recibe (para saber adónde correr)
function predict(b) {
  const c = { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz }, dt = 1 / 60;
  for (let i = 0; i < 180; i++) {
    c.vy -= G * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
    if (c.x < -W / 2 + R) { c.x = -W / 2 + R; c.vx = Math.abs(c.vx) * 0.7; } if (c.x > W / 2 - R) { c.x = W / 2 - R; c.vx = -Math.abs(c.vx) * 0.7; }
    if (c.z > L - R) { c.z = L - R; c.vz = -Math.abs(c.vz) * 0.72; } if (c.z < R) { c.z = R; c.vz = Math.abs(c.vz) * 0.72; }
    if (c.y > CEIL - R) { c.y = CEIL - R; c.vy = -Math.abs(c.vy) * 0.5; }
    if (c.y < R && c.vy < 0) { if (side(c.z) !== b.last) return { x: c.x, z: c.z, t: i * dt }; c.y = R; c.vy = -c.vy * 0.58; c.vx *= 0.82; c.vz *= 0.82; }
  }
  return { x: c.x, z: c.z, t: 3 };
}

// ---------- el minijuego ----------
export function pasakaGame(ui, { who = '', games = 3 } = {}) {
  return new Promise(res => {
    const S = ui.sound, eu = isEU(), st = makeState(games), b = st.ball, P0 = st.pl[0];
    const partner = who || PASAKA.canonigo.name, rivals = PASAKA.rivales;
    const T = { rojos: tr('Rojos'), azules: tr('Azules') }, team = t => (t ? T.azules : T.rojos);
    ui.closeModal?.();
    const o = el(`<div class="mg-overlay pasaka"><div class="mg-card pasaka-card">
      <div class="mg-top">${iconSVG('pelota', 48)}<div><h3>Pasaka</h3><small>${esc(tr('Sobreclaustro de la catedral'))} · ${eu ? `${games} ${esc(tr('juegos'))}` : `a ${games} juegos`}</small></div>
        <div class="pk-sb"><span class="pk-t r">${esc(T.rojos)}</span><b class="pk-g">0</b><i class="pk-q">0 · 0</i><b class="pk-g">0</b><span class="pk-t a">${esc(T.azules)}</span></div></div>
      <div class="pk-stage"><canvas class="pk-cv"></canvas><div class="pk-fb"></div><div class="pk-tip"></div></div>
      <div class="pk-ctrl"><div class="pk-names"><small>${esc(tr('Tu pareja'))}: <b>${esc(partner)}</b></small><small>${esc(tr('Rivales'))}: <b>${esc(rivals.join(' · '))}</b></small></div>
        <button type="button" class="pk-btn" data-k="golpe"><b>${esc(tr('Golpe'))}</b><small>${esc(tr('espacio'))}</small></button><button type="button" class="pk-btn ghost" data-k="dejada"><b>${esc(tr('Dejada'))}</b><small>${esc(tr('mayús'))}</small></button></div>
      <p class="pk-hint">${esc(tr('Toca el suelo para moverte (o las flechas). Golpe la devuelve fuerte al fondo; Dejada la deja junto a la red.'))}</p>
      <button type="button" class="x pk-x" aria-label="${esc(tr('Salir'))}">✕</button></div></div>`);
    document.body.appendChild(o); ui.modal = o;
    const stage = o.querySelector('.pk-stage'), cv = o.querySelector('.pk-cv'), fb = o.querySelector('.pk-fb'), tip = o.querySelector('.pk-tip');
    const sbG = o.querySelectorAll('.pk-g'), sbQ = o.querySelector('.pk-q');
    const wasMusic = S?.musicOn; S?.setMusic?.(false);
    const view = makeView(cv, stage);
    let over = false, raf = 0, last = performance.now(), keys = {}, fbT = 0;
    const say = (why, sub = '', cls = '') => { fb.innerHTML = `<b>${esc(why)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`; fb.className = 'pk-fb on ' + cls; fbT = 1.5; };
    const score = () => { sbG[0].textContent = st.g[0]; sbG[1].textContent = st.g[1]; sbQ.textContent = `${QN[st.q[0]] ?? '40'} · ${QN[st.q[1]] ?? '40'}`; };
    const setTip = (s) => { tip.textContent = s; };

    // --- el saque y los quinces
    // (entre quince y quince cada uno vuelve andando a su sitio y el que saca, detrás de su línea)
    const homeAll = () => {
      for (const p of st.pl) { p.take = false; p.want = 0; p.tx = p.hx; p.tz = p.hz; }
      if (st.server === 0) P0.tz = Math.min(P0.z, NETZ - SAQUE - 1); else { st.pl[2].tx = -1.4; st.pl[2].tz = NETZ + SAQUE + 1.2; }
    };
    const setupServe = () => {
      st.phase = 'serve'; st.phaseT = 0; b.inPlay = false; b.dead = false; b.vx = b.vy = b.vz = 0;
      b.held = st.server; setTip(st.server === 0 ? tr('Pulsa Golpe para sacar') : tr('Sacan los azules'));
    };
    const nextPoint = () => { if (st.over) return; st.phase = 'dead'; st.phaseT = 0; homeAll(); };
    const point = (t, why) => {
      if (st.phase === 'dead' || st.over) return;
      st.q[t]++; st.faults = 0; S?.crowd?.(t === 0 ? 0.6 : 0.3);
      if (st.q[t] >= 4) {
        st.g[t]++; st.q = [0, 0]; st.server = 1 - st.server;
        if (st.g[t] >= st.games) { st.over = true; score(); say(tr(t === 0 ? '¡Partido para los rojos!' : 'Partido para los azules'), why, t === 0 ? 'ok' : 'bad'); fbT = 9; if (t === 0) S?.fanfare?.(); setTimeout(() => end(false, t === 0), 1700); return; }
        say(tr(t === 0 ? '¡Juego para los rojos!' : 'Juego para los azules'), why, t === 0 ? 'ok' : 'bad');
      } else say(why, `${QN[st.q[0]]} - ${QN[st.q[1]]}${st.q[0] === 3 && st.q[1] === 3 ? ' · ' + tr('iguales') : ''}`, t === 0 ? 'ok' : 'bad');
      score(); nextPoint();
    };
    const serveFault = () => {
      if (st.phase === 'dead' || st.over) return;
      st.faults++;
      if (st.faults >= 2) { st.faults = 0; return point(1 - st.server, tr('Falta de saque')); }
      say(tr('Falta de saque'), tr('Segundo saque'), 'bad'); nextPoint();
    };
    // el golpe: hacia un punto del otro campo, con el tiempo de vuelo del tipo de golpe; la calidad (altura de la pelota,
    // lo lejos que está, lo rápida que viene) baja la pelota y puede mandarla a la red
    const launch = (pl, kind, aim = 0) => {
      const t = pl.team, dir = t === 0 ? 1 : -1;
      let q = 1; if (b.y < 0.25) q -= 0.35; else if (b.y > 1.9) q -= 0.25;
      q -= Math.max(0, Math.hypot(b.x - pl.x, b.z - pl.z) - 0.6) * 0.3; if (Math.hypot(b.vx, b.vy, b.vz) > 16) q -= 0.15; if (!pl.me) q -= 0.05;
      if (kind === 'saque') q = 0.95; q = clamp(q, 0.2, 1);
      let xt, zt, Tf, yt = 0;
      if (kind === 'saque') { xt = aim * (W / 2 - 1.4); zt = t === 0 ? L - 0.1 : 0.1; yt = 1.4 + Math.random() * 0.5; Tf = 1.0; }
      else if (kind === 'dejada') { xt = aim * (W / 2 - 1.0); zt = NETZ + dir * (1.5 + Math.random() * 0.9); Tf = 0.72; }
      else { xt = aim * (W / 2 - 0.9); zt = t === 0 ? L - 0.6 - Math.random() * 1.6 : 1.8 + Math.random() * 2.4; Tf = 1.0 + Math.random() * 0.12; }
      xt = clamp(xt + (1 - q) * (Math.random() - 0.5) * 3, -W / 2 + 0.3, W / 2 - 0.3);
      b.vx = (xt - b.x) / Tf; b.vz = (zt - b.z) / Tf; b.vy = (yt - b.y) / Tf + 0.5 * G * Tf;
      const tn = (NETZ - b.z) / b.vz, yn = b.y + b.vy * tn - 0.5 * G * tn * tn, need = NETH + 0.14;
      if (tn > 0 && yn < need) b.vy += (need - yn) / tn;
      b.vy -= (1 - q) * (kind === 'dejada' ? 1.4 : 1.1) * Math.random();
      b.last = t; b.crossed = false; b.bounces = 0; b.dead = false; b.serve = kind === 'saque'; b.serveOk = false; b.serveB = 0; b.inPlay = true; b.held = -1; st.hitId++;
      pl.swing = 1; pl.want = 0; S?.pelota?.(kind === 'dejada' ? 0.5 : 0.9);
      if (st.phase === 'serve') { st.phase = 'flight'; setTip(''); }
      assign();
    };
    // quién va a por la pelota: de la pareja que la recibe, el que la tiene más a mano (tú, solo si juegas en automático
    // o la pelota va claramente a tu pareja)
    const assign = () => {
      const pr = predict(b), rec = st.pl.filter(p => p.team !== b.last);
      const cost = p => Math.abs(p.x - pr.x) + 0.35 * Math.abs(p.z - pr.z);
      rec.sort((a, c) => cost(a) - cost(c));
      for (const p of rec) p.take = false;
      let taker = rec[0];
      if (taker.me && !st.auto) { const other = rec[1]; taker = other && cost(other) < cost(taker) + 1.0 ? other : null; }
      if (taker) { taker.take = true; taker.decided = -1; const back = taker.team === 1 ? 0.9 : -0.9; taker.tx = clamp(pr.x, -W / 2 + 0.4, W / 2 - 0.4); taker.tz = pr.z + back; }
      for (const p of rec) if (!p.take && !(p.me && !st.auto)) { p.tx = clamp(-pr.x * 0.4, -W / 2 + 0.6, W / 2 - 0.6); p.tz = p.hz; }
    };
    const aiShot = (pl) => {
      const opp = st.pl.filter(p => p.team !== pl.team), far = opp.every(p => Math.abs(p.z - NETZ) > 6.5);
      const kind = far && Math.random() < 0.4 ? 'dejada' : 'golpe';
      let best = 0, bd = -1; for (const a of [-0.85, -0.3, 0.3, 0.85]) { const d = Math.min(...opp.map(p => Math.abs(p.x - a * (W / 2 - 0.9)))) + Math.random() * 0.8; if (d > bd) { bd = d; best = a; } }
      launch(pl, kind, best);
    };
    const onFloor = () => {
      if (b.dead || !b.inPlay) return;
      S?.pelota?.(0.2);
      if (!b.crossed) { if (side(b.z) === b.last) { b.dead = true; return b.serve ? serveFault() : point(1 - b.last, tr('No pasó la red')); } return; }
      if (b.serve && !b.serveOk) { b.serveB++; if (b.serveB >= 2) { b.dead = true; return serveFault(); } }
      b.bounces++;
      if (b.bounces >= 2) { b.dead = true; point(b.last, tr('Dos botes')); }
    };
    const stepBall = (dt) => {
      if (!b.inPlay) return;
      const pz = b.z, k = 1 - 0.035 * dt;
      b.vy -= G * dt; b.vx *= k; b.vz *= k; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      if ((pz - NETZ) * (b.z - NETZ) < 0) {
        if (b.y < NETH + R && !b.dead) { b.z = pz < NETZ ? NETZ - 0.06 : NETZ + 0.06; b.vz = -b.vz * 0.12; b.vx *= 0.4; b.vy = Math.min(b.vy, 0.4) * 0.3; b.dead = true; S?.noiseBurst?.(0.12, 900, 0.8, 0.25, S.sfx); b.serve ? serveFault() : point(1 - b.last, tr('¡Red!')); }
        else b.crossed = true;
      }
      if (b.y < R) { b.y = R; if (b.vy < 0) { b.vy = -b.vy * 0.58; b.vx *= 0.82; b.vz *= 0.82; onFloor(); if (Math.abs(b.vy) < 0.4) { b.vy = 0; } } }
      if (b.x < -W / 2 + R) { b.x = -W / 2 + R; b.vx = Math.abs(b.vx) * 0.7; } else if (b.x > W / 2 - R) { b.x = W / 2 - R; b.vx = -Math.abs(b.vx) * 0.7; }
      if (b.z > L - R) { b.z = L - R; b.vz = -Math.abs(b.vz) * 0.72; if (b.serve && b.crossed && b.y > CHAPA) b.serveOk = true; S?.pelota?.(0.35); }
      else if (b.z < R) { b.z = R; b.vz = Math.abs(b.vz) * 0.72; if (b.serve && b.crossed && b.y > CHAPA) b.serveOk = true; S?.pelota?.(0.35); }
      if (b.y > CEIL - R) { b.y = CEIL - R; b.vy = -Math.abs(b.vy) * 0.5; }
      // (en el suelo y parada: se da por muerta, por si nadie la juega)
      if (b.dead && b.y <= R + 0.001 && Math.hypot(b.vx, b.vz) < 0.3) b.inPlay = false;
    };
    const movePl = (pl, dt) => {
      const sp = pl.speed, dx = pl.tx - pl.x, dz = pl.tz - pl.z, d = Math.hypot(dx, dz);
      pl.moving = d > 0.05;
      if (pl.moving) { const k = Math.min(1, sp * dt / d); pl.x += dx * k; pl.z += dz * k; pl.phase += dt * 9; }
      const srv = st.phase === 'serve' && b.held === pl.team && (pl.me ? st.server === 0 : pl === st.pl[2]);
      if (pl.team === 0) pl.z = clamp(pl.z, 0.8, srv ? NETZ - SAQUE - 0.2 : NETZ - 0.7); else pl.z = clamp(pl.z, srv ? NETZ + SAQUE + 0.2 : NETZ + 0.7, L - 0.8);
      pl.x = clamp(pl.x, -W / 2 + 0.35, W / 2 - 0.35);
      if (pl.swing > 0) pl.swing = Math.max(0, pl.swing - dt * 3.2);
    };
    const think = (pl, dt) => {
      if (st.phase === 'serve') {
        if (!pl.me && pl === st.pl[2] && st.server === 1 && st.phaseT > 1.3) { b.x = pl.x + 0.3; b.y = 1.05; b.z = pl.z - 0.3; launch(pl, 'saque', (Math.random() - 0.5) * 1.2); }
        if (pl.me && st.auto && st.server === 0 && st.phaseT > 0.8) { b.x = pl.x + 0.3; b.y = 1.05; b.z = pl.z + 0.3; launch(pl, 'saque', (Math.random() - 0.5) * 1.2); }
        return;
      }
      if (st.phase !== 'flight' || !b.inPlay || b.dead || b.last === pl.team) return;
      if (pl.me && !st.auto) return;
      // (el que no iba a por ella también la juega si le llega y el otro anda lejos)
      if (!pl.take) { const tk = st.pl.find(p => p.team === pl.team && p.take); if (!(inReach(pl, b) && (!tk || Math.hypot(tk.x - b.x, tk.z - b.z) > 2.2))) return; }
      // sigue a la pelota de cerca cuando ya está en su campo (por si el bote la desvía)
      if (side(b.z) === pl.team && b.y < 2.5) { pl.tx = clamp(b.x, -W / 2 + 0.4, W / 2 - 0.4); if (Math.abs(b.z - pl.z) > 1.0) pl.tz = clamp(b.z + (pl.team === 1 ? 0.6 : -0.6), pl.team ? NETZ + 0.7 : 0.8, pl.team ? L - 0.8 : NETZ - 0.7); }
      if (!inReach(pl, b) || b.y < 0.2 || b.y > 2.0) return;
      if (pl.decided !== st.hitId) { pl.decided = st.hitId; const run = Math.hypot(pl.tx - pl.hx, pl.tz - pl.hz), fast = Math.hypot(b.vx, b.vz) > 15; const p = clamp(0.9 - 0.035 * run - (fast ? 0.18 : 0) + (pl.me ? 0.08 : 0) - (pl.team === 1 ? 0.06 : 0), 0.35, 0.95); pl.miss = Math.random() > p; }
      if (!pl.miss) aiShot(pl);
    };
    const update = (dt) => {
      st.t += dt; st.phaseT += dt;
      if (st.phase === 'intro') { if (st.phaseT > 1.3) setupServe(); }
      else if (st.phase === 'dead') { if (st.phaseT > 1.6) setupServe(); }
      // tú: con las teclas o hacia donde tocaste
      const kx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), kz = (keys.up ? 1 : 0) - (keys.down ? 1 : 0);
      if ((kx || kz) && !st.auto) { const n = Math.hypot(kx, kz); P0.tx = P0.x + kx / n * P0.speed * dt * 1.01; P0.tz = P0.z + kz / n * P0.speed * dt * 1.01; }
      for (const p of st.pl) { think(p, dt); movePl(p, dt); }
      // la pareja no se te pone encima
      for (const a of st.pl) for (const c of st.pl) if (a !== c && a.team === c.team) { const dx = c.x - a.x, dz = c.z - a.z, d = Math.hypot(dx, dz); if (d < 0.8 && d > 1e-3) { c.x += dx / d * (0.8 - d) * 0.5; c.z += dz / d * (0.8 - d) * 0.5; } }
      if (st.phase === 'serve' && b.held >= 0) { const srv = b.held === 0 ? P0 : st.pl[2]; b.x = srv.x + 0.3; b.y = 1.05; b.z = srv.z + (b.held === 0 ? 0.3 : -0.3); }
      // tu golpe: si lo pediste poco antes de que llegue, se da cuando llega
      if (P0.want && !st.auto) {
        P0.wantT -= dt;
        if (st.phase === 'flight' && b.inPlay && !b.dead && b.last !== 0 && inReach(P0, b)) launch(P0, P0.want, aimOf());
        else if (P0.wantT <= 0) { P0.want = 0; P0.swing = 0.6; }
      }
      for (let i = 0, n = Math.ceil(dt / (1 / 120)); i < n; i++) stepBall(dt / n);
      if (st.phase === 'flight' && !b.inPlay) nextPoint();   // (parada sin resolverse: siguiente saque)
      if (fbT > 0 && (fbT -= dt) <= 0) fb.className = 'pk-fb';
    };
    const aimOf = () => { const kx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0); if (kx) return kx * 0.85; const mv = P0.tx - P0.x; if (Math.abs(mv) > 0.3) return Math.sign(mv) * 0.75; return clamp((b.x - P0.x) / 1.2, -1, 1) * 0.5; };
    const press = (kind) => {
      if (over || st.over) return;
      if (st.phase === 'serve' && st.server === 0 && b.held === 0) { launch(P0, 'saque', aimOf()); return; }
      P0.want = kind; P0.wantT = 0.4;
    };
    const end = (quit = false, win = false) => {
      if (over) return; over = true; cancelAnimationFrame(raf);
      removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKeyUp, true); removeEventListener('resize', view.resize);
      S?.setMusic?.(wasMusic); delete window.__pasaka;
      o.classList.add('out'); setTimeout(() => o.remove(), 250); if (ui.modal === o) ui.modal = null;
      res(quit ? { quit: true, g: st.g } : { win, g: st.g.slice() });
    };
    const tick = (now) => {
      if (over) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      update(dt); view.draw(st);
      raf = requestAnimationFrame(tick);
    };
    // --- mandos
    const KEYMAP = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down' };
    const onKey = (e) => { e.stopImmediatePropagation(); const k = e.key.toLowerCase(); if (k === 'escape') { e.preventDefault(); return end(true); }
      if (KEYMAP[k]) { keys[KEYMAP[k]] = true; e.preventDefault(); } else if (k === ' ' || k === 'j' || k === 'enter' || k === '1') { e.preventDefault(); if (!e.repeat) press('golpe'); } else if (k === 'shift' || k === 'k' || k === '2') { e.preventDefault(); if (!e.repeat) press('dejada'); } };
    const onKeyUp = (e) => { const k = e.key.toLowerCase(); if (KEYMAP[k]) { keys[KEYMAP[k]] = false; e.stopImmediatePropagation(); } };
    addEventListener('keydown', onKey, true); addEventListener('keyup', onKeyUp, true);
    let drag = false;
    const toFloor = (e) => { const r = cv.getBoundingClientRect(), p = view.floorAt(e.clientX - r.left, e.clientY - r.top); if (!p) return; P0.tx = clamp(p.x, -W / 2 + 0.35, W / 2 - 0.35); P0.tz = clamp(p.z, 0.8, NETZ - 0.7); };
    cv.addEventListener('pointerdown', e => { e.preventDefault(); drag = true; cv.setPointerCapture?.(e.pointerId); toFloor(e); });
    cv.addEventListener('pointermove', e => { if (drag) toFloor(e); });
    cv.addEventListener('pointerup', () => { drag = false; }); cv.addEventListener('pointercancel', () => { drag = false; });
    o.querySelectorAll('.pk-btn').forEach(bt => bt.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); bt.classList.add('flash'); setTimeout(() => bt.classList.remove('flash'), 140); press(bt.dataset.k); }));
    o.querySelector('.pk-x').onclick = () => end(true);
    addEventListener('resize', view.resize);
    say(tr('¡Prepárate!'), who ? (eu ? withEU(who) : `Con ${who}`) : tr('Sobreclaustro de la catedral'));
    homeAll(); score(); view.resize(); view.draw(st);
    // (para las pruebas: el estado, golpear, jugar solo y adelantar el partido sin dibujar)
    window.__pasaka = { estado: () => ({ phase: st.phase, g: st.g.slice(), q: st.q.slice(), server: st.server, ball: { x: +b.x.toFixed(2), y: +b.y.toFixed(2), z: +b.z.toFixed(2), inPlay: b.inPlay, last: b.last }, you: { x: +P0.x.toFixed(2), z: +P0.z.toFixed(2) }, over: st.over }),
      golpear: press, ir: (x, z) => { P0.tx = x; P0.tz = z; }, auto: (on) => { st.auto = !!on; }, simular: (sec) => { for (let i = 0; i < sec * 60 && !over; i++) update(1 / 60); view.draw(st); }, fin: () => over };
    raf = requestAnimationFrame(tick);
  });
}

// ---------- la vista: el sobreclaustro en perspectiva ----------
// cámara detrás de tu campo, a la altura de una galería, mirando al frontis; el fondo (techo, paredes, suelo, público) se
// pinta una vez por tamaño y encima van los jugadores, la red y la pelota en orden de lejanía
function makeView(cv, stage) {
  const ctx = cv.getContext('2d'); let CW = 560, CH = 315, dpr = 1, f = 616, hz = 79, hc = 4.9, bg = null;
  const D = 9.75, Z0 = -6;   // (la cámara está en z = -D; los planos empiezan detrás de ella y llegan a los bordes)
  const P = (x, y, z) => { const s = f / (z + D); return [CW / 2 + x * s, hz + (hc - y) * s, s]; };
  const poly = (c, pts, fill, stroke, lw) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); } };
  const line = (c, a, b, color, lw) => { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.strokeStyle = color; c.lineWidth = lw; c.stroke(); };
  const ell = (c, x, y, rx, ry, fill) => { c.beginPath(); c.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); };
  // (público fijo: en la arquería de la derecha y en el banco de la izquierda, siempre los mismos)
  const CROWD = [], CL = ['#4a4a58', '#7a4b3a', '#39506b', '#8a7a62', '#b0423a', '#2b2b2b', '#5c6b4e', '#a07c5a'];
  let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 14; i++) CROWD.push({ x: W / 2 + 0.7 + rnd() * 0.5, z: 13 + i * 1.05 + rnd() * 0.5, h: 1.5 + rnd() * 0.2, c: CL[i % 8], s: SKIN[i % 4], sit: false });
  for (let i = 0; i < 5; i++) CROWD.push({ x: -W / 2 + 0.3, z: 16.5 + i * 2.3 + rnd(), h: 1.15, c: CL[(i + 3) % 8], s: SKIN[(i + 1) % 4], sit: true });
  const person = (c, x, z, hTop, col, skin, sit) => {
    const [bx, by, s] = P(x, 0, z), Y = y => by - y * s;
    const top = hTop, sh = top - 0.32;
    poly(c, [[bx - 0.22 * s, Y(sit ? 0.5 : 1.0)], [bx + 0.22 * s, Y(sit ? 0.5 : 1.0)], [bx + 0.2 * s, Y(sh)], [bx - 0.2 * s, Y(sh)]], col);
    ell(c, bx, Y(sh), 0.2 * s, 0.07 * s, col);
    ell(c, bx, Y(top - 0.12), 0.11 * s, 0.12 * s, skin);
    ell(c, bx, Y(top - 0.07), 0.115 * s, 0.07 * s, '#2a1a12');
  };
  const drawBg = () => {
    bg = document.createElement('canvas'); bg.width = cv.width; bg.height = cv.height;
    const c = bg.getContext('2d'); c.scale(dpr, dpr);
    c.fillStyle = '#2a1a11'; c.fillRect(0, 0, CW, CH);
    // techo de vigas
    poly(c, [P(-W / 2 - 6, CEIL, Z0), P(W / 2 + 6, CEIL, Z0), P(W / 2, CEIL, L), P(-W / 2, CEIL, L)], '#33201a');
    for (let z = 1; z < L; z += 0.62) { const a = P(-W / 2 - 6, CEIL, z), b = P(W / 2 + 6, CEIL, z); line(c, a, b, '#4e3222', Math.max(1, 0.1 * a[2])); }
    for (const x of [-W / 4, W / 4]) line(c, P(x, CEIL - 0.01, Z0), P(x, CEIL - 0.01, L), '#5a3b28', Math.max(1.5, 0.22 * f / (L + D)));
    // derecha: la arquería sobre el patio (luz) con sus columnas y, detrás, el público de pie
    const gr = c.createLinearGradient(0, P(0, CEIL, L)[1], 0, P(0, 0, 2)[1]); gr.addColorStop(0, '#e4ebf1'); gr.addColorStop(1, '#cbd0c4');
    poly(c, [P(W / 2, 0, Z0), P(W / 2, CEIL, Z0), P(W / 2, CEIL, L), P(W / 2, 0, L)], gr);
    for (const p of CROWD) if (!p.sit) person(c, p.x, p.z, p.h, p.c, p.s, false);
    for (let z = 2.2; z < L - 1; z += 3.6) {
      poly(c, [P(W / 2, 1.0, z - 0.28), P(W / 2, 1.0, z + 0.28), P(W / 2, 4.4, z + 0.28), P(W / 2, 4.4, z - 0.28)], '#d8ccb2');
      poly(c, [P(W / 2, 4.4, z - 0.4), P(W / 2, 4.4, z + 0.4), P(W / 2, 4.75, z + 0.4), P(W / 2, 4.75, z - 0.4)], '#cdbfa3');
      // (arco apuntado entre columna y columna: las dos enjutas, con el arco a tramos)
      if (z + 3.6 < L) { const za = z + 0.28, zb = z + 3.6 - 0.28, zm = (za + zb) / 2, arc = (z0, z1) => Array.from({ length: 5 }, (_, i) => { const k = i / 4; return P(W / 2, 3.85 + 0.9 * Math.sin(k * Math.PI / 2), z0 + (z1 - z0) * k); });
        poly(c, [P(W / 2, 4.75, za), P(W / 2, 4.75, zm), ...arc(za, zm).reverse()], '#cdbfa3'); poly(c, [P(W / 2, 4.75, zb), P(W / 2, 4.75, zm), ...arc(zb, zm).reverse()], '#cdbfa3'); }
    }
    poly(c, [P(W / 2, 4.75, Z0), P(W / 2, CEIL, Z0), P(W / 2, CEIL, L), P(W / 2, 4.75, L)], '#c9bca0');
    poly(c, [P(W / 2, 0, Z0), P(W / 2, 1.0, Z0), P(W / 2, 1.0, L), P(W / 2, 0, L)], '#cfc3a8'); line(c, P(W / 2, 1.0, Z0), P(W / 2, 1.0, L), '#e6dcc4', 1.5);
    // izquierda: muro de piedra con ventanas altas y el banco corrido
    const gl = c.createLinearGradient(P(-W / 2, 0, 1)[0], 0, P(-W / 2, 0, L)[0], 0); gl.addColorStop(0, '#dccfb3'); gl.addColorStop(1, '#bfb093');
    poly(c, [P(-W / 2, 0, Z0), P(-W / 2, CEIL, Z0), P(-W / 2, CEIL, L), P(-W / 2, 0, L)], gl);
    for (let z = 4; z < L - 2; z += 6.2) poly(c, [P(-W / 2, 2.6, z), P(-W / 2, 2.6, z + 0.7), P(-W / 2, 3.7, z + 0.7), P(-W / 2, 3.9, z + 0.35), P(-W / 2, 3.7, z)], '#5e4e3f');
    for (const p of CROWD) if (p.sit) person(c, p.x, p.z, p.h, p.c, p.s, true);
    poly(c, [P(-W / 2, 0.5, Z0), P(-W / 2 + 0.45, 0.5, Z0), P(-W / 2 + 0.45, 0.5, L), P(-W / 2, 0.5, L)], '#dccfb3');
    poly(c, [P(-W / 2 + 0.45, 0, Z0), P(-W / 2 + 0.45, 0.5, Z0), P(-W / 2 + 0.45, 0.5, L), P(-W / 2 + 0.45, 0, L)], '#b9a788');
    // frontis con su chapa
    poly(c, [P(-W / 2, 0, L), P(W / 2, 0, L), P(W / 2, CEIL, L), P(-W / 2, CEIL, L)], '#d4c6a8');
    poly(c, [P(-W / 2, 0, L), P(W / 2, 0, L), P(W / 2, CHAPA, L), P(-W / 2, CHAPA, L)], '#7a3b32'); line(c, P(-W / 2, CHAPA, L), P(W / 2, CHAPA, L), '#f3e9d6', 1.5);
    // suelo de losas con las líneas
    const gf = c.createLinearGradient(0, P(0, 0, L)[1], 0, CH); gf.addColorStop(0, '#a8887a'); gf.addColorStop(1, '#cfab93');
    poly(c, [P(-W / 2, 0, Z0), P(W / 2, 0, Z0), P(W / 2, 0, L), P(-W / 2, 0, L)], gf);
    for (let z = 1; z < L; z += 1) { const a = P(-W / 2, 0, z); line(c, a, P(W / 2, 0, z), 'rgba(80,45,35,.14)', 1); }
    for (let x = -W / 2 + 1.16; x < W / 2; x += 1.16) line(c, P(x, 0, Z0), P(x, 0, L), 'rgba(80,45,35,.09)', 1);
    const lw = Math.max(1.2, 0.05 * f / (NETZ + D)), white = 'rgba(255,255,255,.82)';
    for (const x of [-W / 2 + 0.15, W / 2 - 0.15]) line(c, P(x, 0.002, Z0), P(x, 0.002, L), white, lw);
    for (const z of [NETZ - SAQUE, NETZ, NETZ + SAQUE]) line(c, P(-W / 2, 0.002, z), P(W / 2, 0.002, z), white, lw);
    line(c, P(0, 0.002, Z0), P(0, 0.002, L), white, lw);
    // sombra del banco y del arranque de las paredes
    poly(c, [P(-W / 2 + 0.45, 0, Z0), P(-W / 2 + 1.0, 0, Z0), P(-W / 2 + 1.0, 0, L), P(-W / 2 + 0.45, 0, L)], 'rgba(40,20,15,.12)');
  };
  const resize = () => {
    const r = stage.getBoundingClientRect(); CW = Math.max(200, Math.round(r.width)); CH = Math.max(120, Math.round(r.height)); dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(CW * dpr); cv.height = Math.round(CH * dpr);
    f = Math.min(CW * 1.1, 9.5625 * CH / 3.2); hz = CH * 0.25; hc = 9.5625 * CH / f; drawBg();
  };
  // de un punto de la pantalla al suelo (para correr hacia donde se toca)
  const floorAt = (sx, sy) => { if (sy <= hz + 1) return null; const dz = hc * f / (sy - hz), z = dz - D; return { x: (sx - CW / 2) * dz / f, z }; };
  const drawPlayer = (c, pl, col) => {
    const [bx, by, s] = P(pl.x, 0, pl.z), front = pl.team === 1, sx = front ? -1 : 1;
    const bob = pl.moving ? Math.abs(Math.sin(pl.phase)) * 0.03 : 0, Y = y => by - (y + bob) * s;
    ell(c, bx, by, 0.34 * s, 0.11 * s, 'rgba(0,0,0,.28)');
    const stp = pl.moving ? Math.sin(pl.phase) * 0.12 : 0;
    ell(c, bx - 0.12 * s, Y(0.03) - stp * s * 0.4, 0.1 * s, 0.05 * s, '#1a1510'); ell(c, bx + 0.12 * s, Y(0.03) + stp * s * 0.4, 0.1 * s, 0.05 * s, '#1a1510');
    // la sotana
    c.beginPath(); c.moveTo(bx - 0.34 * s, Y(0.06)); c.quadraticCurveTo(bx - 0.27 * s, Y(0.8), bx - 0.21 * s, Y(1.45)); c.lineTo(bx + 0.21 * s, Y(1.45)); c.quadraticCurveTo(bx + 0.27 * s, Y(0.8), bx + 0.34 * s, Y(0.06)); c.closePath();
    c.fillStyle = '#17141b'; c.fill(); c.strokeStyle = 'rgba(255,255,255,.09)'; c.lineWidth = Math.max(1, 0.02 * s); c.stroke();
    if (front) for (let i = 0; i < 5; i++) ell(c, bx, Y(0.55 + i * 0.19), 0.016 * s, 0.016 * s, '#3b3542');
    // la faja del equipo y el alzacuello
    c.fillStyle = col; c.fillRect(bx - 0.25 * s, Y(1.06), 0.5 * s, 0.14 * s); c.fillRect(bx + 0.12 * s * sx, Y(0.92), 0.07 * s, 0.42 * s);
    c.fillStyle = '#f4efe4'; c.fillRect(bx - 0.08 * s, Y(1.47), 0.16 * s, 0.045 * s);
    // brazos: el del guante (el derecho) se echa atrás y golpea
    const a = pl.swing > 0 ? -2.3 + (1 - pl.swing) * 3.2 : pl.moving ? -0.5 + Math.sin(pl.phase) * 0.45 : -0.3;
    const shx = bx + 0.2 * s * sx, shy = Y(1.38), hx = shx + Math.sin(a) * 0.5 * s * sx, hy = shy + Math.cos(a) * 0.5 * s;
    line(c, [bx - 0.2 * s * sx, shy], [bx - 0.31 * s * sx, Y(0.92)], '#1c1820', Math.max(1.5, 0.09 * s)); ell(c, bx - 0.31 * s * sx, Y(0.9), 0.05 * s, 0.05 * s, pl.skin);
    line(c, [shx, shy], [hx, hy], '#1c1820', Math.max(1.5, 0.09 * s));
    c.save(); c.translate(hx, hy); c.rotate(-a * sx); c.fillStyle = '#8a5a2b'; c.beginPath(); c.roundRect?.(-0.08 * s, -0.16 * s, 0.16 * s, 0.3 * s, 0.05 * s); if (!c.roundRect) c.rect(-0.08 * s, -0.16 * s, 0.16 * s, 0.3 * s); c.fill(); c.restore();
    // cabeza
    ell(c, bx, Y(1.62), 0.12 * s, 0.125 * s, pl.skin);
    if (front) { c.beginPath(); c.ellipse(bx, Y(1.66), 0.125 * s, 0.1 * s, 0, Math.PI, 0); c.fillStyle = pl.hair; c.fill(); }
    else ell(c, bx, Y(1.64), 0.125 * s, 0.115 * s, pl.hair);
    if (pl.me) { const y = Y(1.95); poly(c, [[bx - 0.12 * s, y - 0.16 * s], [bx + 0.12 * s, y - 0.16 * s], [bx, y]], '#ffd166', '#3a2a0a', 1); }
  };
  const drawNet = (c) => {
    const [, , s] = P(0, 0, NETZ), q = [P(-W / 2, 0, NETZ), P(W / 2, 0, NETZ), P(W / 2, NETH, NETZ), P(-W / 2, NETH, NETZ)];
    poly(c, q, 'rgba(255,255,255,.16)');
    c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 1;
    for (let x = -W / 2 + 0.5; x < W / 2; x += 0.5) line(c, P(x, 0, NETZ), P(x, NETH, NETZ), 'rgba(255,255,255,.28)', 1);
    for (let y = 0.2; y < NETH; y += 0.2) line(c, P(-W / 2, y, NETZ), P(W / 2, y, NETZ), 'rgba(255,255,255,.28)', 1);
    line(c, P(-W / 2, NETH, NETZ), P(W / 2, NETH, NETZ), 'rgba(255,255,255,.95)', Math.max(2, 0.07 * s));
    for (const x of [-W / 2, W / 2]) line(c, P(x, 0, NETZ), P(x, NETH + 0.15, NETZ), '#5a4a3a', Math.max(2, 0.08 * s));
  };
  const drawBall = (c, b) => {
    const [sx, sy, s] = P(b.x, 0, b.z); ell(c, sx, sy, 0.2 * s / (1 + b.y * 0.4), 0.09 * s / (1 + b.y * 0.4), `rgba(0,0,0,${0.32 / (1 + b.y)})`);
    const [x, y] = P(b.x, b.y, b.z), r = Math.max(2.4, 0.075 * s);
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = '#f1e6d2'; c.fill(); c.strokeStyle = '#6e5b3f'; c.lineWidth = 1; c.stroke();
    ell(c, x - r * 0.3, y - r * 0.3, r * 0.3, r * 0.3, 'rgba(255,255,255,.7)');
  };
  const draw = (st) => {
    if (!bg) resize();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.drawImage(bg, 0, 0, CW, CH);
    const items = st.pl.map(p => ({ z: p.z, p })); if (st.ball.inPlay || st.ball.held >= 0) items.push({ z: st.ball.z, b: st.ball });
    items.sort((a, c) => c.z - a.z);
    let net = false;
    for (const it of items) {
      if (!net && it.z < NETZ) { drawNet(ctx); net = true; }
      if (it.p) drawPlayer(ctx, it.p, it.p.team ? AZUL : ROJO); else drawBall(ctx, it.b);
    }
    if (!net) drawNet(ctx);
  };
  return { resize, draw, floorAt };
}

/** La portada de la pantalla del menú: el sobreclaustro con las dos parejas y la pelota en el aire. */
export function pasakaPreview(cv) {
  const st = makeState(3), b = st.ball;
  st.pl[0].x = 1.2; st.pl[0].z = 6.5; st.pl[1].x = -2.3; st.pl[1].z = 9.8; st.pl[2].x = -1.4; st.pl[2].z = NETZ + 5.5; st.pl[3].x = 2.4; st.pl[3].z = NETZ + 8.5;
  st.pl[0].swing = 0.55; st.pl[2].moving = true; st.pl[2].phase = 1.2;
  b.inPlay = true; b.x = 0.4; b.y = 1.9; b.z = 12.2;
  const v = makeView(cv, cv.parentElement || cv); v.resize(); v.draw(st);
  return v;
}
