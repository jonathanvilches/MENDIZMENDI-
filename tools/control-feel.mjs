// Sensación de control en el fútbol (sin gráficos): lo que se nota con el mando en la mano.
//  1. respuesta: cuánto tarda el jugador en ir hacia donde apunta el joystick (giro de 90° y media vuelta, con y sin
//     balón, trotando y esprintando) y cuánto se abre la curva
//  2. recepción: de cada 100 pases a un compañero parado o en carrera, cuántos controla y cuántos le rebotan
//  3. aguantar el balón: con un rival de nivel normal encima, cuánto tiempo conservas el balón conduciendo, girando y
//     protegiendo
// Uso: node tools/control-feel.mjs [f11|sala]
import { FutbolGame } from '../src/futbol/game.js';
import { FIELD as F } from '../src/futbol/rules.js';
const formats = process.argv[2] ? [process.argv[2]] : ['f11', 'sala'];
const H = 1 / 120;
function setup(format, seed = 7) {
  const g = new FutbolGame({ seed, replays: false, format }); g.start(); g.restart = null; g.phase = 'play'; g.owner = null;
  for (const p of g.players) { p.x = (p.team ? 1 : -1) * (F.HL - 2); p.z = (p.id % 11) * 0.8 - 4; p.vx = p.vz = 0; p.react = 99; p.think = 99; }
  g.drain(); return g;
}
const ang = (x, z) => Math.atan2(z, x);
const adiff = (a, b) => Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)));
// 1. respuesta: corre hacia +x a la velocidad de crucero, luego el joystick gira a 90° o 180°
function turnTest(format, deg, sprint, ball) {
  const g = setup(format), me = g.me; me.x = -F.HL * 0.5; me.z = 0; me.h = Math.PI / 2;
  if (ball) { g.ball.set(me.x + 0.45, 0); g.owner = me; }
  for (let t = 0; t < 1.5; t += H) { g.setMove(1, 0, 1, sprint); g.step(H); g.drain(); }
  const a = deg * Math.PI / 180, tx = Math.cos(a), tz = Math.sin(a), x0 = me.x, z0 = me.z;
  let t90 = null, lost = false, wide = 0;
  for (let t = 0; t < 1.2; t += H) {   // (1,2 s: sin llegar a la banda)
    g.setMove(tx, tz, 1, sprint); g.step(H); g.drain();
    if (ball && g.owner !== me) lost = true;
    // cuánto se pasa en la dirección vieja (lo que se abre la curva)
    wide = Math.max(wide, me.x - x0);
    const v = Math.hypot(me.vx, me.vz);
    if (t90 === null && v > 1.5 && adiff(ang(me.vx, me.vz), ang(tx, tz)) < 0.26) t90 = t;
  }
  return { t: t90, wide, lost };
}
// 2. recepción: pase de un compañero desde d metros a ti (quieto o corriendo hacia la portería)
function receiveTest(format, d, moving, n = 40) {
  let ok = 0, bounce = 0;
  for (let i = 0; i < n; i++) {
    const g = setup(format, 11 + i), me = g.me, mate = g.team(0).find(q => q !== me && q.role !== 'POR');
    mate.x = -10; mate.z = 0; mate.h = Math.PI / 2; me.x = mate.x + d * Math.cos(i * 0.3); me.z = d * Math.sin(i * 0.3) * 0.6; me.h = -Math.PI / 2;
    if (moving) for (let t = 0; t < 0.6; t += H) { g.setMove(1, 0, 1, false); g.step(H); g.drain(); mate.x = -10; mate.z = 0; mate.vx = mate.vz = 0; }
    g.ball.set(mate.x + 0.45, 0); g.owner = mate; g.passBall(mate, me, false, 0); g.drain();
    let got = false, bnc = false;
    for (let t = 0; t < 4; t += H) { g.setMove(moving ? 1 : 0, 0, moving ? 1 : 0, false); g.step(H); for (const e of g.drain()) { if (e.t === 'control' && e.p === me.id) got = true; if (e.t === 'block' && e.p === me.id) bnc = true; } if (got || bnc) break; }
    if (got && !bnc) ok++; if (bnc) bounce++;
  }
  return { ok: ok / n, bounce: bounce / n };
}
// 3. aguantar: tú conduces hacia la portería; un rival de nivel normal sale a por ti desde 6 m
function keepTest(format, how, n = 30) {
  let total = 0, kept = 0;
  for (let i = 0; i < n; i++) {
    const g = new FutbolGame({ seed: 100 + i, replays: false, format, level: 'normal' }); g.start(); g.restart = null; g.phase = 'play';
    for (const p of g.players) { p.x = (p.team ? 1 : -1) * (F.HL - 2); p.z = (p.id % 11) * 0.8 - 4; p.vx = p.vz = 0; p.react = 99; p.think = 99; }
    const me = g.me, foe = g.team(1).find(q => q.role !== 'POR');
    me.x = 0; me.z = 0; me.h = Math.PI / 2; g.ball.set(0.45, 0); g.owner = me;
    foe.x = 6; foe.z = (i % 5 - 2) * 1.5; foe.react = 0; foe.think = 0;
    // el resto, lejos y quietos
    for (const p of g.players) if (p !== me && p !== foe) { p.x = (p.team ? 1 : -1) * (F.HL - 1); p.react = 99; p.think = 99; }
    let t = 0;
    for (; t < 5; t += H) {
      let x = 1, z = 0;
      if (how === 'zigzag') z = Math.sin(t * 4) > 0 ? 1 : -1;
      if (how === 'escapar') { const dx = me.x - foe.x, dz = me.z - foe.z, l = Math.hypot(dx, dz) || 1; x = dx / l + 0.3; z = dz / l; }
      if (how === 'proteger') { g.input.shield = true; x = 0.3; z = 0; }
      g.setMove(x, z, 1, how === 'esprint'); g.step(H); g.drain();
      // (los demás no intervienen)
      for (const p of g.players) if (p !== me && p !== foe) { p.vx = p.vz = 0; }
      if (g.owner !== me) break;
    }
    total += t; if (t >= 5) kept++;
  }
  return { avg: total / n, kept: kept / n };
}
for (const format of formats) {
  console.log(format === 'f11' ? '== Fútbol 11' : '== Fútbol sala');
  for (const ball of [false, true]) for (const sprint of [false, true]) for (const deg of [90, 180]) {
    const r = turnTest(format, deg, sprint, ball);
    console.log(`  giro ${deg}° ${sprint ? 'esprintando' : 'trotando'}${ball ? ' con balón' : ''}: ${r.t === null ? 'no llega' : r.t.toFixed(2) + ' s'} · curva ${r.wide.toFixed(1)} m${r.lost ? ' · PIERDE EL BALÓN' : ''}`);
  }
  for (const moving of [false, true]) for (const d of [8, 15, 25]) {
    const r = receiveTest(format, d, moving);
    console.log(`  pase de ${d} m ${moving ? 'en carrera' : 'parado'}: controla ${(r.ok * 100).toFixed(0)} %, rebota ${(r.bounce * 100).toFixed(0)} %`);
  }
  for (const how of ['recto', 'esprint', 'zigzag', 'escapar', 'proteger']) {
    const r = keepTest(format, how);
    console.log(`  aguantar (${how}) con un rival normal: ${r.avg.toFixed(1)} s de media, lo conserva 5 s el ${(r.kept * 100).toFixed(0)} %`);
  }
}
