// Conducción: el balón tiene que ir pegado al pie (como en el FIFA): andando y trotando a menos de medio metro de la
// punta de la bota, al esprintar con toques algo más largos, y al girar o en zigzag sin quedarse atrás ni perderse.
import { FutbolGame } from '../src/futbol/game.js';
import { FIELD as F } from '../src/futbol/rules.js';
let fails = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
function setup(format) {
  const g = new FutbolGame({ seed: 5, replays: false, format }); g.start(); g.restart = null; g.phase = 'play';
  for (const p of g.players) { p.x = (p.team ? 1 : -1) * (F.HL - 2); p.z = (p.id % 11) * 0.8 - 4; p.vx = p.vz = 0; p.react = 99; }
  const me = g.me; me.x = -F.HL * 0.6; me.z = 0; me.h = Math.PI / 2; g.ball.set(me.x + 0.4, 0); g.owner = me; me.touchT = 0;
  g.drain(); return g;
}
// recorre una trayectoria (función del tiempo → dirección del joystick) y mide la distancia del balón a la punta del pie
function drive(format, dirAt, secs, sprint = false, mag = 1) {
  const g = setup(format), me = g.me; let max = 0, sum = 0, n = 0, lost = false, maxSide = 0;
  for (let t = 0; t < secs; t += 1 / 120) {
    const d = dirAt(t); g.setMove(d.x, d.z, mag, sprint); g.step(1 / 120); g.drain();
    if (g.owner !== me) { lost = true; break; }
    if (t < 0.6) continue;   // arranque
    const fx = me.x + Math.sin(me.h) * 0.32, fz = me.z + Math.cos(me.h) * 0.32, B = g.ball.p;
    const dd = Math.hypot(B.x - fx, B.z - fz), side = Math.abs(-(B.x - me.x) * Math.cos(me.h) + (B.z - me.z) * Math.sin(me.h));
    max = Math.max(max, dd); maxSide = Math.max(maxSide, side); sum += dd; n++;
  }
  return { max, avg: n ? sum / n : 0, lost, maxSide, sp: Math.hypot(me.vx, me.vz) };
}
for (const format of ['f11', 'sala']) {
  console.log(format === 'f11' ? 'Fútbol 11' : 'Fútbol sala');
  const st = () => ({ x: 1, z: 0 });
  let r = drive(format, st, 2.5, false, 0.35); ok(!r.lost && r.max < 0.45, `andando (${r.sp.toFixed(1)} m/s): media ${r.avg.toFixed(2)} m, máx. ${r.max.toFixed(2)} m del pie`);
  r = drive(format, st, 2.5, false, 1); ok(!r.lost && r.max < 0.55, `trotando (${r.sp.toFixed(1)} m/s): media ${r.avg.toFixed(2)} m, máx. ${r.max.toFixed(2)} m`);
  r = drive(format, st, 2.2, true, 1); ok(!r.lost && r.max < 1.1, `esprintando (${r.sp.toFixed(1)} m/s): media ${r.avg.toFixed(2)} m, máx. ${r.max.toFixed(2)} m`);
  r = drive(format, (t) => ({ x: 1, z: Math.sin(t * 4) > 0 ? 0.9 : -0.9 }), 3, false, 1); ok(!r.lost && r.max < 0.7 && r.maxSide < 0.45, `zigzag: máx. ${r.max.toFixed(2)} m, de lado ${r.maxSide.toFixed(2)} m`);
  r = drive(format, (t) => t < 1.2 ? { x: 1, z: 0 } : { x: -1, z: 0.05 }, 2.6, false, 1); ok(!r.lost && r.max < 0.8, `media vuelta: máx. ${r.max.toFixed(2)} m, sin perderlo`);
  r = drive(format, (t) => ({ x: Math.cos(t * 1.6), z: Math.sin(t * 1.6) }), 4, false, 1); ok(!r.lost && r.max < 0.6, `en círculo: máx. ${r.max.toFixed(2)} m`);
  r = drive(format, (t) => t < 1.2 ? { x: 1, z: 0 } : { x: 0, z: 0 }, 2.4, false, 1); ok(!r.lost && r.max < 0.55, `frenar en seco: máx. ${r.max.toFixed(2)} m`);
}
console.log(fails ? `${fails} fallos` : "Todo correcto");
process.exit(fails ? 1 : 0);
