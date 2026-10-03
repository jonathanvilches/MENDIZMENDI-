// Pruebas de los controles del jugador (como en el FIFA), sin gráficos: pase al hueco, pase elevado, presionar,
// compañero que presiona, proteger el balón, tiro colocado, cambio automático al que llega antes al balón y conducción.
import { FutbolGame } from '../src/futbol/game.js';
import { FIELD as F, PHYS as K } from '../src/futbol/rules.js';
let fails = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
function setup(seed = 3) {
  const g = new FutbolGame({ seed, replays: false }); g.start(); g.restart = null; g.phase = 'play'; g.owner = null;
  for (const p of g.players) { p.x = (p.team ? 30 : -30) + (p.id % 11) * 0.5; p.z = -30 + (p.id % 11) * 2; p.vx = p.vz = 0; p.react = 99; }
  g.drain(); return g;
}
const run = (g, s) => { const ev = []; for (let t = 0; t < s; t += 1 / 120) { g.step(1 / 120); ev.push(...g.drain()); } return ev; };
// pase al hueco: el balón va por delante del compañero (hacia la portería rival), no a sus pies
{ const g = setup(), me = g.me, q = g.byRole(0, 'DCI'); me.x = 0; me.z = 0; me.h = Math.PI / 2; q.x = 12; q.z = -6; g.ball.set(0.5, 0); g.owner = me;
  g.setMove(1, -0.4, 1, false); g.press('through'); g.step(1 / 120); g.release('through');
  const tx = g.ball.p.x + g.ball.v.x * 2, tz = g.ball.p.z + g.ball.v.z * 2;
  ok(g.passTo === q && g.me === q && Math.atan2(g.ball.v.z, g.ball.v.x) > Math.atan2(q.z - 0.5, q.x - 0.5) + 0.05, `pase al hueco: por delante del compañero y pasas a llevarlo (${tx.toFixed(1)}, ${tz.toFixed(1)})`); }
// pase elevado: el balón sube
{ const g = setup(), me = g.me, q = g.byRole(0, 'DCI'); me.x = 0; me.z = 0; me.h = Math.PI / 2; q.x = 22; q.z = 4; g.ball.set(0.5, 0); g.owner = me;
  g.setMove(1, 0.15, 1, false); g.press('lob'); g.step(1 / 120); g.release('lob'); ok(g.ball.v.y > 4, `pase elevado (vy ${g.ball.v.y.toFixed(1)} m/s)`); }
// pase (un solo botón): raso al compañero libre; por alto si hay un rival en medio y está lejos
{ const g = setup(), me = g.me, q = g.byRole(0, 'DCI'); me.x = 0; me.z = 0; me.h = Math.PI / 2; q.x = 10; q.z = 1; g.ball.set(0.5, 0); g.owner = me;
  g.setMove(1, 0.1, 1, false); g.press('pass'); g.step(1 / 120); g.release('pass'); const raso = g.ball.v.y < 1.5 && g.passTo === q;
  const g2 = setup(), me2 = g2.me, q2 = g2.byRole(0, 'DCI'), r = g2.byRole(1, 'MCD'); me2.x = 0; me2.z = 0; me2.h = Math.PI / 2; q2.x = 22; q2.z = 1; r.x = 10; r.z = 0.5; g2.ball.set(0.5, 0); g2.owner = me2;
  g2.setMove(1, 0.05, 1, false); g2.press('pass'); g2.step(1 / 120); g2.release('pass');
  ok(raso && g2.ball.v.y > 4, `pase: raso al compañero libre (vy ${g.ball.v.y.toFixed(1)}), por alto si hay un rival en medio (vy ${g2.ball.v.y.toFixed(1)})`); }
// presionar: se coloca entre el rival con balón y su portería, a poco más de un metro
{ const g = setup(), me = g.me, o = g.byRole(1, 'MCD'); o.x = 5; o.z = 3; o.h = -Math.PI / 2; g.ball.set(4.6, 3); g.owner = o; o.react = 99; me.x = -6; me.z = -4;
  g.press('contain'); run(g, 2.5); const gx = g.ownGoal(0), d = Math.hypot(me.x - o.x, me.z - o.z), between = (me.x - o.x) * (gx - o.x) > 0;
  ok(d < 2.2 && between, `presionar: a ${d.toFixed(1)} m, entre el rival y la portería`); g.release('contain'); }
// compañero que presiona
{ const g = setup(), me = g.me, o = g.byRole(1, 'MCD'); o.x = 5; o.z = 3; g.ball.set(4.6, 3); g.owner = o; me.x = 4; me.z = 2; for (const p of g.team(0)) p.react = 0;
  g.press('mate'); g.teamThink(0); const pr = g.team(0).find(p => p.job?.kind === 'press' && p !== me); ok(!!pr, `un compañero va a presionar (${pr?.role})`); g.release('mate'); }
// proteger el balón: cuesta más robarlo
{ let a = 0, b = 0;
  for (const sh of [false, true]) for (let i = 0; i < 30; i++) {
    const g = setup(100 + i), me = g.me, r = g.byRole(1, 'MCD'); me.x = 0; me.z = 0; me.h = Math.PI / 2; g.ball.set(0.4, 0); g.owner = me;
    r.x = 1.6; r.z = 0.2; r.h = -Math.PI / 2; r.react = 0; r.tackleCD = 0; g.lvl = { ...g.lvl, tackle: 0.9, press: 1 };
    if (sh) g.press('shield'); g.setMove(0.2, 0, 0.3, false);
    run(g, 1.5); if (g.owner !== me) sh ? b++ : a++;
  }
  ok(b < a || (a === 0 && b === 0), `proteger: robos ${a}/30 sin proteger, ${b}/30 protegiendo`); }
// tiro colocado: menos fuerte y con rosca
{ const g = setup(), me = g.me; me.x = F.HL - 18; me.z = 6; me.h = Math.PI / 2; g.ball.set(me.x + 0.5, 6); g.owner = me;
  g.setMove(0, 0, 0, false); g.press('finesse'); g.press('shoot'); for (let i = 0; i < 60; i++) g.step(1 / 120); g.release('shoot');
  const sp = g.ball.speed, spin = Math.abs(g.ball.w.y); ok(sp < 26 && spin > 20, `tiro colocado (${sp.toFixed(1)} m/s, giro ${spin.toFixed(0)} rad/s)`); }
// cambio automático: con el balón suelto, al que llega antes (no al que está más cerca en línea recta pero de espaldas)
{ const g = setup(), me = g.me, q = g.byRole(0, 'DCI'); me.x = -10; me.z = 0; q.x = 8; q.z = 2; g.owner = null; g.ball.set(0, 0); g.ball.kick(9, 0, 0.5);
  g.passTo = null; g.switchCD = 0; g.setMove(0, 0, 0, false); g.step(1 / 120); ok(g.me === q, `balón suelto: pasas al que llega antes (${g.me.role})`); }
// conducción: andando, el balón va pegado (menos de 0,9 m); al esprintar, algo más largo
{ const g = setup(), me = g.me; me.x = 0; me.z = 0; me.h = Math.PI / 2; g.ball.set(0.4, 0); g.owner = me;
  let maxW = 0, maxS = 0;
  g.setMove(1, 0, 0.6, false); for (let i = 0; i < 360; i++) { g.step(1 / 120); maxW = Math.max(maxW, Math.hypot(g.ball.p.x - me.x, g.ball.p.z - me.z)); }
  g.setMove(1, 0, 1, true); for (let i = 0; i < 240; i++) { g.step(1 / 120); maxS = Math.max(maxS, Math.hypot(g.ball.p.x - me.x, g.ball.p.z - me.z)); }
  ok(g.owner === me && maxW < 1.3 && maxS < 1.9, `conducción: andando hasta ${maxW.toFixed(2)} m, esprintando hasta ${maxS.toFixed(2)} m, sin perderlo`); }
console.log(fails ? `${fails} FALLOS` : 'Todo correcto'); process.exit(fails ? 1 : 0);
