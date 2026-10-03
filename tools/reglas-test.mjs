// Reglas del partido (fútbol 11 y sala, en la primera y en la segunda parte, cuando se cambia de campo):
// · balón fuera por la banda: saque de banda para el rival del último que la tocó, desde donde salió;
// · por la línea de fondo: córner si la tocó por último el que defiende esa portería; si no, saque de portería;
// · gol solo con el balón entero dentro, entre los postes y por debajo del larguero; gol en propia puerta;
// · no vale gol directo de un saque de banda, de un tiro libre indirecto ni de la mano del portero (si entra en la
//   propia portería, córner); sí vale si antes la toca otro;
// · el portero no puede coger el balón con las manos fuera de su área; saques de centro de cada parte y tras un gol.
import { FutbolGame } from '../src/futbol/game.js';
import { FIELD as F, PHYS as K } from '../src/futbol/rules.js';
let fails = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };

function game(format, half) {
  const g = new FutbolGame({ autoplay: true, seed: 7, replays: false, format }); g.start();
  if (half === 2) { g.half = 2; g.dir = [-g.dir[0], -g.dir[1]]; }
  g.restart = null; g.phase = 'play'; g.owner = null; g.last = null; g.noDirect = null;
  for (const p of g.players) { p.x = (p.team ? 1 : -1) * 2; p.z = -F.HW * 0.6 + (p.id % 11) * 0.3; p.vx = p.vz = 0; p.react = 99; p.cool = 99; }   // nadie se mete
  for (const k of [g.gk(0), g.gk(1)]) { k.x = 0; k.z = F.HW * 0.6; }
  g.keeper = () => {}; g.aiStep = () => {}; g.drain();
  return g;
}
// deja correr el partido hasta que se pita algo (y hasta que se coloca el saque); devuelve lo que ha pasado
function run(g, secs = 4) {
  const ev = [];
  for (let t = 0; t < secs; t += 1 / 120) { g.step(1 / 120); ev.push(...g.drain()); if (g.phase === 'setpiece' || g.phase === 'goal' || g.phase === 'kickoff') break; }
  const out = ev.find(e => e.t === 'out'), goal = ev.find(e => e.t === 'goal'), noGoal = ev.find(e => e.t === 'noGoal');
  return { ev, out, goal, noGoal, r: g.restart };
}
const kickAt = (g, p, tx, tz, v = 18, vy = 0.5) => { const B = g.ball.p, dx = tx - B.x, dz = tz - B.z, d = Math.hypot(dx, dz); g.ball.kick(dx / d * v, vy, dz / d * v); g.last = p; p.cool = 2; };

for (const format of ['f11', 'sala']) for (const half of [1, 2]) {
  console.log(`== ${format === 'f11' ? 'Fútbol 11' : 'Fútbol sala'}, ${half}.ª parte ==`);
  const name = (t) => t === 0 ? 'tu equipo' : 'el rival';
  // banda: el que conduce se la lleva fuera → saca el otro equipo, desde donde salió
  for (const t of [0, 1]) {
    const g = game(format, half), p = g.byRole(t, format === 'f11' ? 'MCD' : 'ALD'), x = 3.5 * (t ? -1 : 1);
    p.x = x; p.z = F.HW - 1.5; p.h = 0; g.ball.set(x, F.HW - 1.05); g.owner = p; g.last = p; p.touchT = 0;
    g.setMove = null; p.wx = 0; p.wz = 4; g.human = () => false;
    const step0 = g.step.bind(g); g.step = (h) => { if (g.owner === p) { p.wx = 0; p.wz = 4; } step0(h); };
    const { out, r } = run(g, 4);
    ok(out?.type === 'throwin' && out.team === 1 - t && r?.team === 1 - t && r.taker.team === 1 - t && Math.abs(r.x - x) < 2.5 && Math.abs(Math.abs(r.z) - F.HW) < 0.2,
      `${name(t)} se la lleva fuera por la banda: saque de banda del otro equipo (${out?.type}, saca ${r ? name(r.team) : '—'} en x=${r?.x.toFixed(1)})`);
  }
  // banda: un pase que se va fuera
  for (const t of [0, 1]) {
    const g = game(format, half), p = g.byRole(t, format === 'f11' ? 'DCD' : 'PIV'); p.x = -4; p.z = -F.HW + 7; g.ball.set(-4, -F.HW + 7.5);
    kickAt(g, p, 2, -F.HW - 5, 14, 0.2); const { out, r } = run(g);
    ok(out?.type === 'throwin' && r?.team === 1 - t && r?.z < 0, `pase de ${name(t)} fuera por la banda: saca ${r ? name(r.team) : '—'}, en la banda por la que salió`);
  }
  // banda: balón por el aire fuera del campo (aunque vuelva a caer dentro, ya salió)
  { const g = game(format, half), p = g.byRole(0, format === 'f11' ? 'DCD' : 'PIV'); p.x = 0; p.z = F.HW - 2; g.ball.set(0, F.HW - 2, 0.5);
    g.ball.kick(0, 6, 2.6); g.last = p; p.cool = 2; const { out } = run(g); ok(out?.type === 'throwin' && out.team === 1, 'balón por el aire por fuera de la banda: fuera'); }
  // balón sobre la línea (sin haberla pasado entero): sigue en juego
  { const g = game(format, half); g.ball.set(5, F.HW + F.line / 2 + K.R - 0.02); g.last = g.byRole(0, format === 'f11' ? 'DCD' : 'PIV'); const { out } = run(g, 0.5); ok(!out, 'balón pisando la línea: sigue en juego'); }
  // línea de fondo: de cada equipo hacia cada portería
  for (const t of [0, 1]) {
    const s = g0dir(format, half, t), gx = s * F.HL, foe = 1 - t;
    // tiro desviado del que ataca → saque de portería del que defiende
    { const g = game(format, half), p = g.byRole(t, format === 'f11' ? 'DCD' : 'PIV'); g.ball.set(gx - s * 12, 0); kickAt(g, p, gx + s * 2, F.goalW, 20, 1);
      const { out, r } = run(g); ok(out?.type === 'goalkick' && r?.team === foe && Math.sign(r.x) === s, `tiro fuera de ${name(t)}: saque de portería de ${name(foe)}`); }
    // la toca por último un defensor → córner del que ataca, en la esquina por la que salió
    { const g = game(format, half), d = g.byRole(foe, format === 'f11' ? 'CTD' : 'CIE'); g.ball.set(gx - s * 6, -F.goalW * 1.2); kickAt(g, d, gx + s * 2, -F.goalW * 2, 12, 0.3);
      const { out, r } = run(g); ok(out?.type === 'corner' && r?.team === t && Math.sign(r.x) === s && r.z < 0, `despeje de ${name(foe)} por su línea de fondo: córner para ${name(t)} en su esquina`); }
    // gol
    { const g = game(format, half), p = g.byRole(t, format === 'f11' ? 'DCD' : 'PIV'); g.ball.set(gx - s * 8, 0); kickAt(g, p, gx + s, 0.3, 20, 0.6);
      const { goal } = run(g); ok(goal?.team === t, `gol de ${name(t)} en la portería que ataca`); }
    // gol en propia puerta
    { const g = game(format, half), d = g.byRole(foe, format === 'f11' ? 'CTD' : 'CIE'); g.ball.set(gx - s * 5, 1); kickAt(g, d, gx + s, 0, 14, 0.4);
      const { goal } = run(g); ok(goal?.team === t, `gol en propia puerta de ${name(foe)}: sube al marcador de ${name(t)}`); }
    // por encima del larguero: no es gol
    { const g = game(format, half), p = g.byRole(t, format === 'f11' ? 'DCD' : 'PIV'); g.ball.set(gx - s * 10, 0, 0.5); g.ball.kick(s * 16, 9, 0); g.last = p; p.cool = 2;
      const { goal, out } = run(g); ok(!goal && out?.type === 'goalkick', 'por encima del larguero: saque de portería'); }
  }
  // no vale gol directo de un saque de banda, de un indirecto ni de la mano del portero
  for (const why of ['throwin', 'indirect', 'throw']) {
    const g = game(format, half), t = 0, s = g.dir[t], gx = s * F.HL, p = why === 'throw' ? g.gk(t) : g.byRole(t, format === 'f11' ? 'DCD' : 'PIV');
    g.ball.set(gx - s * 7, why === 'throwin' ? F.HW - 0.05 : 2);
    if (why !== 'throw') g.restart = { type: why === 'throwin' ? 'throwin' : 'free', team: t, indirect: why === 'indirect', taker: p, x: g.ball.p.x, z: g.ball.p.z };
    const B = g.ball.p, dx = gx + s * 0.5 - B.x, dz = 0 - B.z, d = Math.hypot(dx, dz);
    const v = Math.min(28, 9 + d * 0.7); g.kickBall(p, dx / d * v, 1.2, dz / d * v, 0, why === 'throw' ? 'throw' : 'pass');
    const { goal, noGoal, out } = run(g);
    ok(!goal && noGoal && out?.type === 'goalkick' && out.team === 1, `directo a portería desde ${why === 'throwin' ? 'un saque de banda' : why === 'indirect' ? 'un tiro libre indirecto' : 'la mano del portero'}: no vale, saque de portería`);
  }
  // indirecto que toca otro antes de entrar: sí vale
  { const g = game(format, half), s = g.dir[0], gx = s * F.HL, p = g.byRole(0, format === 'f11' ? 'DCD' : 'PIV'), q = g.byRole(0, format === 'f11' ? 'DCI' : 'ALI');
    g.ball.set(gx - s * 7, 2); g.restart = { type: 'free', team: 0, indirect: true, taker: p, x: g.ball.p.x, z: 2 };
    g.kickBall(p, s * 16, 1.2, -2 * 16 / 7, 0, 'pass'); g.step(1 / 120); g.last = q;   // la desvía un compañero
    const { goal } = run(g); ok(goal?.team === 0, 'indirecto desviado por un compañero: gol'); }
  // saque de banda directo a la propia portería: córner para el rival
  { const g = game(format, half), s = g.dir[0], own = -s * F.HL, p = g.byRole(0, format === 'f11' ? 'CTD' : 'CIE');
    g.ball.set(own + s * 5, F.HW - 0.05); g.restart = { type: 'throwin', team: 0, taker: p, x: g.ball.p.x, z: g.ball.p.z };
    g.ball.set(own + s * 2, F.HW - 0.05); const B = g.ball.p, dx = own - s - B.x, dz = -B.z, d = Math.hypot(dx, dz), v = Math.min(28, 9 + d * 0.7); g.kickBall(p, dx / d * v, 1, dz / d * v, 0, 'pass');
    const { goal, out } = run(g); ok(!goal && out?.type === 'corner' && out.team === 1, 'saque de banda directo a la propia portería: córner para el rival'); }
  // falta directa a la propia portería: córner para el rival; saque de centro directo a la portería rival: gol
  { const g = game(format, half), s = g.dir[0], own = -s * F.HL, p = g.byRole(0, format === 'f11' ? 'CTD' : 'CIE');
    g.ball.set(own + s * 8, 1); g.restart = { type: 'free', team: 0, taker: p, x: g.ball.p.x, z: 1 };
    g.kickBall(p, -s * 18, 0.8, -1.5, 0, 'pass'); const { goal, out } = run(g); ok(!goal && out?.type === 'corner' && out.team === 1, 'falta directa a la propia portería: córner para el rival'); }
  { const g = game(format, half), s = g.dir[0], gx = s * F.HL, p = g.byRole(0, format === 'f11' ? 'DCD' : 'PIV');
    g.ball.set(gx - s * 9, 0.5); g.restart = { type: 'kickoff', team: 0, taker: p, x: g.ball.p.x, z: 0.5 };
    g.kickBall(p, s * 20, 0.8, -0.3, 0, 'shot'); const { goal } = run(g); ok(goal?.team === 0, 'saque directo a la portería rival: gol (sí vale)'); }
  // el portero fuera de su área no la coge con las manos (ni estirándose)
  { const g = game(format, half), k = g.gk(0), s = -g.dir[0], gx = s * F.HL; delete g.keeper; g.keeper = FutbolGame.prototype.keeper.bind(g);
    k.x = gx - s * (F.area + 2.5); k.z = 0; k.dive = { t: 0.5, vz: 0, vx: 0, hy: 0.5, side: 1 }; g.ball.set(k.x, 0.5, 0.5); g.ball.v.x = g.ball.v.z = 0; g.last = g.byRole(1, format === 'f11' ? 'DCD' : 'PIV');
    g.keeperTouch(k); ok(!k.hands && g.owner !== k, 'portero fuera del área: no puede cogerla con las manos'); }
  // cesión: un compañero se la pasa con el pie y el portero no puede cogerla con las manos (sí la juega con el pie)
  { const g = game(format, half), k = g.gk(0), s = -g.dir[0], gx = s * F.HL; g.keeper = FutbolGame.prototype.keeper.bind(g); k.cool = 0;
    const d = g.byRole(0, format === 'f11' ? 'CTD' : 'CIE'); k.x = gx - s * 2; k.z = 0; g.ball.set(gx - s * 9, 0); g.kickBall(d, s * 9, 0, 0, 0, 'pass'); d.cool = 99;
    let hands = false; for (let i = 0; i < 240; i++) { g.step(1 / 120); g.drain(); if (k.hands) hands = true; }
    ok(!hands && g.owner === k, 'cesión de un compañero: el portero la juega con el pie, sin cogerla con las manos'); }
}
// saques de centro: la 1.ª parte la saca tu equipo, la 2.ª el rival; tras un gol, el que lo ha encajado
{ const g = new FutbolGame({ autoplay: true, seed: 3, replays: false }); g.start(); const a = g.restart?.team; g.secondHalf(); const b = g.restart?.team;
  g.phase = 'play'; g.restart = null; g.goal(0); g.afterGoal(); const c = g.restart?.team;
  ok(a === 0 && b === 1 && c === 1, `saque de centro: 1.ª parte ${a}, 2.ª parte ${b}, tras gol de tu equipo saca ${c}`); }
// en los saques, los rivales a la distancia: 9,15 m (sala, 5 m) en faltas y córners
for (const format of ['f11', 'sala']) {
  const g = game(format, 1); g.setPiece('free', 0, 0, 0); for (let i = 0; i < 240; i++) g.step(1 / 120);
  const near = Math.min(...g.team(1).filter(p => p.role !== 'POR').map(p => Math.hypot(p.x, p.z)));
  ok(near >= F.wall - 0.4, `${format}: en un tiro libre los rivales a ${near.toFixed(1)} m (mínimo ${F.wall} m)`);
}
function g0dir(format, half, t) { const g = game(format, half); return g.dir[t]; }
console.log(fails ? `${fails} fallos` : 'Todo correcto');
process.exit(fails ? 1 : 0);
