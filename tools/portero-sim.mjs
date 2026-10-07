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
    // (se lanza en el momento justo, no al pulsar: se espera a que se tire)
    g.setMove(0, side, 1, false); g.press('pass'); const plan = k.humanDive; let d = null;
    for (let t = 0; t < 1.2 && !d; t += 1 / 120) { g.step(1 / 120); g.drain(); d = k.dive && { vz: k.dive.vz }; }
    ok(!!plan && !!d && Math.sign(d.vz) === side, `estirada: hacia ${side > 0 ? 'un lado' : 'el otro'} al pulsar con un tiro del rival (vz ${d?.vz.toFixed(1)})`);
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
// moviendo a tu jugador, el cambio automático no te lo quita si otro está solo un poco más cerca del balón; si está
// claramente más cerca (de donde va el balón), cambia a él
{ const g = setup(), me = g.me, q = g.byRole(0, 'MCD'), o = g.byRole(1, 'MCD');
  me.x = 4; me.z = 0; q.x = 6; q.z = 3; o.x = 9; o.z = 3; g.ball.set(8.6, 3); g.owner = o; o.react = 99; g.switchCD = 0;
  g.setMove(1, 0.3, 1, false); run(g, 0.3); const kept = g.me === me;
  const g2 = setup(), me2 = g2.me, q2 = g2.byRole(0, 'MCD'), o2 = g2.byRole(1, 'MCD');
  me2.x = -14; me2.z = 0; q2.x = 6; q2.z = 3; o2.x = 9; o2.z = 3; g2.ball.set(8.6, 3); g2.owner = o2; o2.react = 99; g2.switchCD = 0;
  g2.setMove(1, 0.3, 1, false); run(g2, 0.3);
  ok(kept && g2.me === q2, `cambio automático: sigues con el tuyo si está cerca (${kept}); si otro está mucho más cerca, cambia a él (${g2.me.role})`); }
// pase: un toque al pie (fuerza automática); mantenido, la barra pone la fuerza: más tiempo, más lejos y más fuerte
{ const res = [];
  for (const hold of [0.05, 0.3, 0.55, 0.8]) {
    const g = setup(), me = g.me, q = g.byRole(0, 'DCI'); me.x = 0; me.z = 0; me.h = Math.PI / 2; q.x = 14; q.z = -4; q.vx = 3; g.ball.set(0.5, 0); g.owner = me;
    g.setMove(0, 0, 0, false); g.press('pass'); const ch = []; for (let t = 0; t < hold; t += 1 / 120) { g.step(1 / 120); ch.push(g.charge); } me.x = 0; me.z = 0; g.ball.set(0.5, 0); g.owner = me; q.x = 14; q.z = -4; const ev = []; g.release('pass'); g.step(1 / 120); ev.push(...g.drain());
    const pp = ev.find(e => e.t === 'powerPass'); res.push({ power: pp?.power ?? null, d: pp?.d ?? null, v: Math.hypot(g.ball.v.x, g.ball.v.z), bar: Math.max(...ch) });
  }
  ok(res[0].power === null && res[1].d < res[2].d && res[2].d < res[3].d && res[3].bar > 0.9, `pase: toque al pie (${res[0].power === null ? 'automático' : 'con fuerza'}), mantenido con fuerza: ${res.slice(1).map(r => r.d + ' m').join(' → ')} (barra hasta ${(res[3].bar * 100).toFixed(0)}%)`); }
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
