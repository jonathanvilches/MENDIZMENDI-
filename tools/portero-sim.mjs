// Pruebas del control del portero y del cambio de jugador, sin gráficos: sacar con la mano o en largo con tu
// portero, estirada hacia donde apuntas con un tiro del rival, llevar al portero y volver, cambiar hacia donde apuntas
// y que el cambio automático no quite el control mientras mueves a tu jugador.
// Uso: node tools/portero-sim.mjs
import { FutbolGame } from '../src/futbol/game.js';
import { FIELD as F } from '../src/futbol/rules.js';
let fails = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
function setup(seed = 3) {
  const g = new FutbolGame({ seed, replays: false }); g.start(); g.restart = null; g.phase = 'play'; g.owner = null;
  for (const p of g.players) { p.x = (p.team ? 30 : -30) + (p.id % 11) * 0.5; p.z = -30 + (p.id % 11) * 2; p.vx = p.vz = 0; p.react = 99; }
  g.drain(); return g;
}
const run = (g, s) => { const ev = []; for (let t = 0; t < s; t += 1 / 120) { g.step(1 / 120); ev.push(...g.drain()); } return ev; };
const gx = -F.HL;   // tu portería (el equipo 0 ataca hacia +x)
// tu portero con el balón: espera a que saques tú; PASE con la mano al compañero al que apuntas
{ const g = setup(), k = g.gk(0), q = g.byRole(0, 'LI'); k.x = gx + 3; k.z = 0; q.x = gx + 18; q.z = -12; g.ball.set(k.x + 0.3, 0); g.catchBall(k); k.holdT = 0.2;
  run(g, 2.5); const waited = g.owner === k && k.hands;
  g.setMove(0.8, -0.6, 1, false); g.press('pass'); g.release('pass'); run(g, 0.1);
  ok(waited && g.passTo === q && g.me === q, `portero: espera tu saque (${waited}) y saca con la mano al que apuntas (${g.passTo?.role}), que pasas a llevar`); }
// saque largo: mantener TIRO, más fuerza = más lejos
{ const far = [];
  for (const hold of [0.1, 1.0]) {
    const g = setup(), k = g.gk(0); k.x = gx + 3; k.z = 0; g.ball.set(k.x + 0.3, 0); g.catchBall(k); run(g, 0.3);
    g.setMove(1, 0, 1, false); g.press('shoot'); run(g, hold); g.release('shoot');
    let land = null; for (let t = 0; t < 4 && !land; t += 1 / 120) { g.step(1 / 120); g.drain(); if (g.ball.p.y < 0.2 && t > 0.3) land = g.ball.p.x; }
    far.push((land ?? g.ball.p.x) - k.x);
  }
  ok(far[1] > far[0] + 10 && far[1] > 35, `saque largo: flojo ${far[0].toFixed(0)} m, a tope ${far[1].toFixed(0)} m`); }
// si no sacas en 6 s, saca solo
{ const g = setup(), k = g.gk(0); k.x = gx + 3; k.z = 0; g.ball.set(k.x + 0.3, 0); g.catchBall(k); k.holdT = 0.2; run(g, 7.5);
  ok(!k.hands, 'portero: si no sacas en 6 s, saca solo'); }
// tiro del rival: cualquier botón, tu portero se estira hacia donde apuntas
{ for (const side of [1, -1]) {
    const g = setup(), k = g.gk(0), r = g.byRole(1, 'MCD'); k.x = gx + 1; k.z = 0; r.x = gx + 16; r.z = 0;
    g.lvl = { ...g.lvl, keeperReact: 9 }; g.mates = { ...g.mates, keeperReact: 9 };   // (que no se tire solo antes)
    g.ball.set(gx + 15, 0); g.last = r; g.ball.kick(-22, 1.5, side * 4); g.shotLive = { team: 1, t: g.time }; g.owner = null;
    g.setMove(0, side, 1, false); g.press('pass'); const d = k.dive;
    ok(!!d && Math.sign(d.vz) === side, `estirada: hacia ${side > 0 ? 'un lado' : 'el otro'} al pulsar con un tiro del rival (vz ${d?.vz.toFixed(1)})`);
  } }
// cambiar con el balón cerca de tu área y sin apuntar: llevas al portero; lo mueves; si el balón se aleja, vuelves a un jugador de campo
{ const g = setup(), k = g.gk(0), o = g.byRole(1, 'MCD'); k.x = gx + 2; k.z = 0; o.x = gx + 20; o.z = 4; g.ball.set(o.x - 0.4, 4); g.owner = o; o.react = 99;
  g.setMove(0, 0, 0, false); g.press('switch'); const got = g.me === k;
  const z0 = k.z; g.setMove(0, 1, 1, false); run(g, 0.6); const moved = k.z - z0;
  g.owner = null; g.ball.set(10, 0); g.setMove(0, 0, 0, false); run(g, 0.2);
  ok(got && moved > 1.5 && g.me !== k && g.me.role !== 'POR', `llevar al portero: lo coges (${got}), lo mueves (${moved.toFixed(1)} m) y vuelves a uno de campo (${g.me.role})`); }
// cambiar apuntando: al compañero que está hacia ese lado
{ const g = setup(), me = g.me, a = g.byRole(0, 'LI'), b = g.byRole(0, 'LD'), o = g.byRole(1, 'MCD');
  me.x = 0; me.z = 0; a.x = 2; a.z = -15; b.x = 2; b.z = 15; o.x = 8; o.z = 0; g.ball.set(7.6, 0); g.owner = o; o.react = 99;
  g.setMove(0, 1, 1, false); g.press('switch'); const pickB = g.me === b;
  g.setMe(me, 'force'); g.setMove(0, -1, 1, false); g.press('switch'); const pickA = g.me === a;
  ok(pickB && pickA, `cambiar apuntando: a un lado ${pickB ? b.role : '?'}, al otro ${pickA ? a.role : '?'}`); }
// moviendo a tu jugador, el cambio automático no te lo quita aunque otro esté algo más cerca del balón
{ const g = setup(), me = g.me, q = g.byRole(0, 'MCD'), o = g.byRole(1, 'MCD');
  me.x = 0; me.z = 0; q.x = 6; q.z = 3; o.x = 9; o.z = 3; g.ball.set(8.6, 3); g.owner = o; o.react = 99; g.switchCD = 0;
  g.setMove(1, 0.3, 1, false); run(g, 0.5);
  ok(g.me === me, `moviéndote, sigues con tu jugador (${g.me.role})`); }
// pase: un toque al pie; mantenido, al hueco y más lejos cuanto más se mantiene
{ const res = [];
  for (const hold of [0.05, 0.5, 1.1]) {
    const g = setup(), me = g.me, q = g.byRole(0, 'DCI'); me.x = 0; me.z = 0; me.h = Math.PI / 2; q.x = 14; q.z = -4; q.vx = 3; g.ball.set(0.5, 0); g.owner = me;
    g.setMove(0, 0, 0, false); g.press('pass'); run(g, hold); me.x = 0; me.z = 0; g.ball.set(0.5, 0); g.owner = me; q.x = 14; q.z = -4; const ev = []; g.release('pass'); g.step(1 / 120); ev.push(...g.drain());
    const ahead = Math.hypot(g.ball.v.x, g.ball.v.z); res.push({ through: ev.some(e => e.t === 'through'), v: ahead });
  }
  ok(!res[0].through && res[1].through && res[2].through && res[2].v > res[1].v, `pase: toque al pie (${res[0].through ? 'hueco' : 'al pie'}), mantenido al hueco (${res[1].v.toFixed(1)} → ${res[2].v.toFixed(1)} m/s más carga)`); }
// tu portero con el balón en los pies (cesión): pasa con el pie en vez de estirarse
{ const g = setup(), k = g.gk(0), q = g.byRole(0, 'CTI'); k.x = gx + 6; k.z = 0; k.h = Math.PI / 2; q.x = gx + 20; q.z = -6; g.setMe(k, 'gk'); g.ball.set(k.x + 0.5, 0); g.owner = k; k.hands = false;
  g.setMove(1, -0.4, 1, false); g.press('pass'); g.release('pass'); g.step(1 / 120);
  ok(!k.dive && g.passTo === q, `portero con el balón en los pies: pasa al compañero (${g.passTo?.role}) sin estirarse`); }
// apuntando hacia tu portero, CAMBIAR lo coge
{ const g = setup(), me = g.me, k = g.gk(0); me.x = gx + 25; me.z = 0; k.x = gx + 2; k.z = 0; g.ball.set(gx + 26, 1); g.owner = null;
  for (const q of g.team(0)) if (q !== me && q !== k) { q.x = gx + 30; q.z = 25; }
  g.setMove(-1, 0, 1, false); g.press('switch'); ok(g.me === k, `cambiar apuntando a tu portería: llevas al portero (${g.me.role})`); }
// con el balón, al soltar el joystick frenas en seco y no lo pierdes
{ const g = setup(), me = g.me; me.x = 0; me.z = 0; me.h = Math.PI / 2; g.ball.set(0.5, 0); g.owner = me; g.setMove(1, 0, 1, true); run(g, 1.2);
  const v0 = Math.hypot(me.vx, me.vz); g.setMove(0, 0, 0, false); run(g, 0.4); const v1 = Math.hypot(me.vx, me.vz);
  ok(v0 > 6 && v1 < 1 && g.owner === me, `frenar con el balón: de ${v0.toFixed(1)} a ${v1.toFixed(1)} m/s en 0,4 s y sigue tuyo`); }
console.log(fails ? `${fails} FALLOS` : 'Todo correcto'); process.exit(fails ? 1 : 0);
