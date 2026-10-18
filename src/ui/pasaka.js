// La pasaka (data/pasaka.js) en el menú: la portada dibujada de la pantalla «pasaka» (hub.js), el premio al acabar un
// partido (carta de tradiciones, puntos e insignia) y el menú de después de cada partido desde Campeonatos. El partido
// en sí se juega en 3D con los avatares, en el sobreclaustro: game/pasaka3d.js (desde Pamplona con el canónigo del
// claustro o desde el menú, que carga Pamplona en modo campeonato).
import { PISTA } from '../data/pasaka.js';
import { infoCard } from './minigames.js';
import { tr, isEU } from '../i18n.js';
import { profile, addCard, addXP, saveProfile, checkBadges } from '../game/profile.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const { W, L, NETH, CEIL, SAQUE, CHAPA } = PISTA, NETZ = L / 2;
const ROJO = '#d2352f', AZUL = '#2f63c4';
const SKIN = ['#f1cdb0', '#e9bd9c', '#d9a884', '#f4d6bd'], HAIR = ['#2a1a12', '#4a3322', '#8c8c8c', '#1a1a1e', '#6b4a2e'];
const withEU = (who) => (/[aeiouáéíóú]$/i.test(who) ? who + 'rekin' : who + 'ekin');

/** Al acabar un partido (r: { win, g }): la carta de tradiciones si se gana, puntos y la ficha del resultado. Devuelve si la carta es nueva. */
export async function pasakaReward(ui, r, { who = '' } = {}) {
  const p = profile(); p.pasaka = (p.pasaka || 0) + 1; if (r.win) p.pasakaWon = (p.pasakaWon || 0) + 1;
  const isNew = r.win && addCard('pasaka:claustro', 'tradiciones');
  if (r.win) addXP(isNew ? 30 : 6);
  saveProfile();
  const eu = isEU();
  await infoCard(ui, { icon: 'pelota', kicker: who ? (eu ? withEU(who) : `Con ${who}`) : tr('Pasaka'), title: r.win ? tr('¡Has ganado la pasaka!') : tr('Esta vez han ganado ellos'),
    text: `${tr('Juegos')}: ${r.g[0]} - ${r.g[1]}. ${r.win ? tr('Así se jugaba en los claustros antes de que hubiera frontones.') : tr('Muévete antes de que llegue la pelota y usa la dejada cuando los rivales estén lejos de la red.')}`,
    badge: isNew ? tr('Nueva carta en tus tradiciones') : '', button: tr('Seguir') });
  if (isNew && !who) for (const bd of checkBadges()) await infoCard(ui, { icon: bd.icon, kicker: tr('Nueva insignia'), title: bd.name, text: bd.text, button: '¡Bien!' });
  return isNew;
}

/** Entre partido y partido desde Campeonatos: otro partido o volver al menú. Devuelve 'again' o 'exit'. */
export function pasakaMenu(ui) {
  return new Promise(res => {
    ui.sound?.ui?.('card');
    const o = el(`<div class="mg-overlay pasaka-menu"><div class="mg-card"><div class="mg-top"><div><h3>Pasaka</h3><small>${esc(tr('Sobreclaustro de la catedral'))}</small></div></div>
      <p>${esc(tr('¿Otro partido en el claustro?'))}</p>
      <button type="button" class="btn primary" data-k="again">${esc(tr('Otro partido'))}</button><button type="button" class="btn ghost" data-k="exit">${esc(tr('Volver al menú'))}</button></div></div>`);
    document.body.appendChild(o);
    const end = (k) => { ui.sound?.ui?.('click'); o.classList.add('out'); setTimeout(() => o.remove(), 250); res(k); };
    o.querySelectorAll('[data-k]').forEach(b => b.onclick = () => end(b.dataset.k));
  });
}

// ---------- la portada de la pantalla del menú: el sobreclaustro dibujado, con las dos parejas y la pelota en el aire ----------
// (una ilustración en perspectiva: la cámara detrás de nuestro campo mirando al frontis)
function makeView(cv, stage) {
  const ctx = cv.getContext('2d'); let CW = 560, CH = 315, dpr = 1, f = 616, hz = 79, hc = 4.9;
  const D = 9.75, Z0 = -6;
  const P = (x, y, z) => { const s = f / (z + D); return [CW / 2 + x * s, hz + (hc - y) * s, s]; };
  const poly = (c, pts, fill, stroke, lw) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); } };
  const line = (c, a, b, color, lw) => { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.strokeStyle = color; c.lineWidth = lw; c.stroke(); };
  const ell = (c, x, y, rx, ry, fill) => { c.beginPath(); c.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); };
  const CROWD = [], CL = ['#4a4a58', '#7a4b3a', '#39506b', '#8a7a62', '#b0423a', '#2b2b2b', '#5c6b4e', '#a07c5a'];
  let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 14; i++) CROWD.push({ x: W / 2 + 0.7 + rnd() * 0.5, z: 13 + i * 1.05 + rnd() * 0.5, h: 1.5 + rnd() * 0.2, c: CL[i % 8], s: SKIN[i % 4], sit: false });
  for (let i = 0; i < 5; i++) CROWD.push({ x: -W / 2 + 0.3, z: 16.5 + i * 2.3 + rnd(), h: 1.15, c: CL[(i + 3) % 8], s: SKIN[(i + 1) % 4], sit: true });
  const person = (c, x, z, top, col, skin, sit) => {
    const [bx, by, s] = P(x, 0, z), Y = y => by - y * s, sh = top - 0.32;
    poly(c, [[bx - 0.22 * s, Y(sit ? 0.5 : 1.0)], [bx + 0.22 * s, Y(sit ? 0.5 : 1.0)], [bx + 0.2 * s, Y(sh)], [bx - 0.2 * s, Y(sh)]], col);
    ell(c, bx, Y(sh), 0.2 * s, 0.07 * s, col); ell(c, bx, Y(top - 0.12), 0.11 * s, 0.12 * s, skin); ell(c, bx, Y(top - 0.07), 0.115 * s, 0.07 * s, '#2a1a12');
  };
  const drawBg = (c) => {
    c.fillStyle = '#2a1a11'; c.fillRect(0, 0, CW, CH);
    poly(c, [P(-W / 2 - 6, CEIL, Z0), P(W / 2 + 6, CEIL, Z0), P(W / 2, CEIL, L), P(-W / 2, CEIL, L)], '#33201a');
    for (let z = 1; z < L; z += 0.62) { const a = P(-W / 2 - 6, CEIL, z), b = P(W / 2 + 6, CEIL, z); line(c, a, b, '#4e3222', Math.max(1, 0.1 * a[2])); }
    for (const x of [-W / 4, W / 4]) line(c, P(x, CEIL - 0.01, Z0), P(x, CEIL - 0.01, L), '#5a3b28', Math.max(1.5, 0.22 * f / (L + D)));
    const gr = c.createLinearGradient(0, P(0, CEIL, L)[1], 0, P(0, 0, 2)[1]); gr.addColorStop(0, '#e4ebf1'); gr.addColorStop(1, '#cbd0c4');
    poly(c, [P(W / 2, 0, Z0), P(W / 2, CEIL, Z0), P(W / 2, CEIL, L), P(W / 2, 0, L)], gr);
    for (const p of CROWD) if (!p.sit) person(c, p.x, p.z, p.h, p.c, p.s, false);
    for (let z = 2.2; z < L - 1; z += 3.6) {
      poly(c, [P(W / 2, 1.0, z - 0.28), P(W / 2, 1.0, z + 0.28), P(W / 2, 4.4, z + 0.28), P(W / 2, 4.4, z - 0.28)], '#d8ccb2');
      poly(c, [P(W / 2, 4.4, z - 0.4), P(W / 2, 4.4, z + 0.4), P(W / 2, 4.75, z + 0.4), P(W / 2, 4.75, z - 0.4)], '#cdbfa3');
      if (z + 3.6 < L) { const za = z + 0.28, zb = z + 3.6 - 0.28, zm = (za + zb) / 2, arc = (z0, z1) => Array.from({ length: 5 }, (_, i) => { const k = i / 4; return P(W / 2, 3.85 + 0.9 * Math.sin(k * Math.PI / 2), z0 + (z1 - z0) * k); });
        poly(c, [P(W / 2, 4.75, za), P(W / 2, 4.75, zm), ...arc(za, zm).reverse()], '#cdbfa3'); poly(c, [P(W / 2, 4.75, zb), P(W / 2, 4.75, zm), ...arc(zb, zm).reverse()], '#cdbfa3'); }
    }
    poly(c, [P(W / 2, 4.75, Z0), P(W / 2, CEIL, Z0), P(W / 2, CEIL, L), P(W / 2, 4.75, L)], '#c9bca0');
    poly(c, [P(W / 2, 0, Z0), P(W / 2, 1.0, Z0), P(W / 2, 1.0, L), P(W / 2, 0, L)], '#cfc3a8'); line(c, P(W / 2, 1.0, Z0), P(W / 2, 1.0, L), '#e6dcc4', 1.5);
    const gl = c.createLinearGradient(P(-W / 2, 0, 1)[0], 0, P(-W / 2, 0, L)[0], 0); gl.addColorStop(0, '#dccfb3'); gl.addColorStop(1, '#bfb093');
    poly(c, [P(-W / 2, 0, Z0), P(-W / 2, CEIL, Z0), P(-W / 2, CEIL, L), P(-W / 2, 0, L)], gl);
    for (let z = 4; z < L - 2; z += 6.2) poly(c, [P(-W / 2, 2.6, z), P(-W / 2, 2.6, z + 0.7), P(-W / 2, 3.7, z + 0.7), P(-W / 2, 3.9, z + 0.35), P(-W / 2, 3.7, z)], '#5e4e3f');
    for (const p of CROWD) if (p.sit) person(c, p.x, p.z, p.h, p.c, p.s, true);
    poly(c, [P(-W / 2, 0.5, Z0), P(-W / 2 + 0.45, 0.5, Z0), P(-W / 2 + 0.45, 0.5, L), P(-W / 2, 0.5, L)], '#dccfb3');
    poly(c, [P(-W / 2 + 0.45, 0, Z0), P(-W / 2 + 0.45, 0.5, Z0), P(-W / 2 + 0.45, 0.5, L), P(-W / 2 + 0.45, 0, L)], '#b9a788');
    poly(c, [P(-W / 2, 0, L), P(W / 2, 0, L), P(W / 2, CEIL, L), P(-W / 2, CEIL, L)], '#d4c6a8');
    poly(c, [P(-W / 2, 0, L), P(W / 2, 0, L), P(W / 2, CHAPA, L), P(-W / 2, CHAPA, L)], '#7a3b32'); line(c, P(-W / 2, CHAPA, L), P(W / 2, CHAPA, L), '#f3e9d6', 1.5);
    const gf = c.createLinearGradient(0, P(0, 0, L)[1], 0, CH); gf.addColorStop(0, '#a8887a'); gf.addColorStop(1, '#cfab93');
    poly(c, [P(-W / 2, 0, Z0), P(W / 2, 0, Z0), P(W / 2, 0, L), P(-W / 2, 0, L)], gf);
    for (let z = 1; z < L; z += 1) line(c, P(-W / 2, 0, z), P(W / 2, 0, z), 'rgba(80,45,35,.14)', 1);
    for (let x = -W / 2 + 1.16; x < W / 2; x += 1.16) line(c, P(x, 0, Z0), P(x, 0, L), 'rgba(80,45,35,.09)', 1);
    const lw = Math.max(1.2, 0.05 * f / (NETZ + D)), white = 'rgba(255,255,255,.82)';
    for (const x of [-W / 2 + 0.15, W / 2 - 0.15]) line(c, P(x, 0.002, Z0), P(x, 0.002, L), white, lw);
    for (const z of [NETZ - SAQUE, NETZ, NETZ + SAQUE]) line(c, P(-W / 2, 0.002, z), P(W / 2, 0.002, z), white, lw);
    line(c, P(0, 0.002, Z0), P(0, 0.002, L), white, lw);
    poly(c, [P(-W / 2 + 0.45, 0, Z0), P(-W / 2 + 1.0, 0, Z0), P(-W / 2 + 1.0, 0, L), P(-W / 2 + 0.45, 0, L)], 'rgba(40,20,15,.12)');
  };
  const drawPlayer = (c, pl, col) => {
    const [bx, by, s] = P(pl.x, 0, pl.z), front = pl.team === 1, sx = front ? -1 : 1, Y = y => by - y * s;
    ell(c, bx, by, 0.34 * s, 0.11 * s, 'rgba(0,0,0,.28)');
    ell(c, bx - 0.12 * s, Y(0.03), 0.1 * s, 0.05 * s, '#1a1510'); ell(c, bx + 0.12 * s, Y(0.03), 0.1 * s, 0.05 * s, '#1a1510');
    c.beginPath(); c.moveTo(bx - 0.34 * s, Y(0.06)); c.quadraticCurveTo(bx - 0.27 * s, Y(0.8), bx - 0.21 * s, Y(1.45)); c.lineTo(bx + 0.21 * s, Y(1.45)); c.quadraticCurveTo(bx + 0.27 * s, Y(0.8), bx + 0.34 * s, Y(0.06)); c.closePath();
    c.fillStyle = '#17141b'; c.fill(); c.strokeStyle = 'rgba(255,255,255,.09)'; c.lineWidth = Math.max(1, 0.02 * s); c.stroke();
    if (front) for (let i = 0; i < 5; i++) ell(c, bx, Y(0.55 + i * 0.19), 0.016 * s, 0.016 * s, '#3b3542');
    c.fillStyle = col; c.fillRect(bx - 0.25 * s, Y(1.06), 0.5 * s, 0.14 * s); c.fillRect(bx + 0.12 * s * sx, Y(0.92), 0.07 * s, 0.42 * s);
    c.fillStyle = '#f4efe4'; c.fillRect(bx - 0.08 * s, Y(1.47), 0.16 * s, 0.045 * s);
    const a = pl.swing > 0 ? -2.3 + (1 - pl.swing) * 3.2 : -0.3, shx = bx + 0.2 * s * sx, shy = Y(1.38), hx = shx + Math.sin(a) * 0.5 * s * sx, hy = shy + Math.cos(a) * 0.5 * s;
    line(c, [bx - 0.2 * s * sx, shy], [bx - 0.31 * s * sx, Y(0.92)], '#1c1820', Math.max(1.5, 0.09 * s)); ell(c, bx - 0.31 * s * sx, Y(0.9), 0.05 * s, 0.05 * s, pl.skin);
    line(c, [shx, shy], [hx, hy], '#1c1820', Math.max(1.5, 0.09 * s));
    c.save(); c.translate(hx, hy); c.rotate(-a * sx); c.fillStyle = '#8a5a2b'; c.beginPath(); if (c.roundRect) c.roundRect(-0.08 * s, -0.16 * s, 0.16 * s, 0.3 * s, 0.05 * s); else c.rect(-0.08 * s, -0.16 * s, 0.16 * s, 0.3 * s); c.fill(); c.restore();
    ell(c, bx, Y(1.62), 0.12 * s, 0.125 * s, pl.skin);
    if (front) { c.beginPath(); c.ellipse(bx, Y(1.66), 0.125 * s, 0.1 * s, 0, Math.PI, 0); c.fillStyle = pl.hair; c.fill(); } else ell(c, bx, Y(1.64), 0.125 * s, 0.115 * s, pl.hair);
  };
  const drawNet = (c) => {
    const [, , s] = P(0, 0, NETZ); poly(c, [P(-W / 2, 0, NETZ), P(W / 2, 0, NETZ), P(W / 2, NETH, NETZ), P(-W / 2, NETH, NETZ)], 'rgba(255,255,255,.16)');
    for (let x = -W / 2 + 0.5; x < W / 2; x += 0.5) line(c, P(x, 0, NETZ), P(x, NETH, NETZ), 'rgba(255,255,255,.28)', 1);
    for (let y = 0.2; y < NETH; y += 0.2) line(c, P(-W / 2, y, NETZ), P(W / 2, y, NETZ), 'rgba(255,255,255,.28)', 1);
    line(c, P(-W / 2, NETH, NETZ), P(W / 2, NETH, NETZ), 'rgba(255,255,255,.95)', Math.max(2, 0.07 * s));
    for (const x of [-W / 2, W / 2]) line(c, P(x, 0, NETZ), P(x, NETH + 0.15, NETZ), '#5a4a3a', Math.max(2, 0.08 * s));
  };
  const drawBall = (c, b) => {
    const [sx, sy, s] = P(b.x, 0, b.z); ell(c, sx, sy, 0.2 * s / (1 + b.y * 0.4), 0.09 * s / (1 + b.y * 0.4), `rgba(0,0,0,${0.32 / (1 + b.y)})`);
    const [x, y] = P(b.x, b.y, b.z), r = Math.max(2.4, 0.075 * s);
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = '#f1e6d2'; c.fill(); c.strokeStyle = '#6e5b3f'; c.lineWidth = 1; c.stroke(); ell(c, x - r * 0.3, y - r * 0.3, r * 0.3, r * 0.3, 'rgba(255,255,255,.7)');
  };
  const draw = (pls, ball) => {
    const r = stage.getBoundingClientRect(); CW = Math.max(200, Math.round(r.width)); CH = Math.max(120, Math.round(r.height)); dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(CW * dpr); cv.height = Math.round(CH * dpr); f = Math.min(CW * 1.1, 9.5625 * CH / 3.2); hz = CH * 0.25; hc = 9.5625 * CH / f;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); drawBg(ctx);
    const items = pls.map(p => ({ z: p.z, p })); items.push({ z: ball.z, b: ball }); items.sort((a, c) => c.z - a.z);
    let net = false; for (const it of items) { if (!net && it.z < NETZ) { drawNet(ctx); net = true; } if (it.p) drawPlayer(ctx, it.p, it.p.team ? AZUL : ROJO); else drawBall(ctx, it.b); } if (!net) drawNet(ctx);
  };
  return { draw };
}
/** La portada de la pantalla del menú. */
export function pasakaPreview(cv) {
  const pls = [{ team: 0, x: 1.2, z: 6.5, swing: 0.55, skin: SKIN[0], hair: HAIR[0] }, { team: 0, x: -2.3, z: 9.8, swing: 0, skin: SKIN[1], hair: HAIR[1] }, { team: 1, x: -1.4, z: NETZ + 5.5, swing: 0, skin: SKIN[2], hair: HAIR[2] }, { team: 1, x: 2.4, z: NETZ + 8.5, swing: 0, skin: SKIN[3], hair: HAIR[3] }];
  makeView(cv, cv.parentElement || cv).draw(pls, { x: 0.4, y: 1.9, z: 12.2 });
}
