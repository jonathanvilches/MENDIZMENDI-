// Pruebas sin gráficos de los cambios, las lesiones y la forma: el cambio pedido con el balón en juego se hace en la
// siguiente parada; el suplente entra con la forma entera y sin tarjetas; en fútbol 11, cinco cambios y el que sale no
// vuelve; en sala, sin límite y el que sale puede volver; el expulsado no se puede cambiar; el rival cambia a su
// lesionado; la lesión grave hace correr menos y avisa a tu equipo; a la tercera falta de un mismo jugador, amarilla.
// Uso: node tools/cambios-sim.mjs
import { FutbolGame } from '../src/futbol/game.js';
import { PLAYER as PL } from '../src/futbol/rules.js';
let fails = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
const run = (g, s) => { const ev = []; for (let t = 0; t < s; t += 1 / 120) { g.step(1 / 120); ev.push(...g.drain()); } return ev; };
function play(o = {}) { const g = new FutbolGame({ seed: 5, replays: false, format: 'f11', ...o }); g.start(); g.restart = null; g.setPhase('play'); g.drain(); return g; }

// pedido con el balón en juego: espera a la parada
{ const g = play(), p = g.byRole(0, 'MCI'), num0 = p.num; p.fit = 0.3; p.energy = 0.3; g.cards[p.id] = 'yellow';
  ok(g.planSub(0, p.id, 2), 'se puede pedir un cambio en pleno juego');
  ok(p.num === num0 && g.subPlan[0].length === 1, `con el balón en juego aún no se hace (sigue el ${p.num})`);
  g.setPhase('dead'); g.pendingRestart = { type: 'throwin', team: 1, x: 0, z: 30 }; const ev = run(g, 0.05);
  ok(ev.some(e => e.t === 'sub') && p.num === 14 && p.fit === 1 && !g.cards[p.id], `en la parada entra el ${p.num}, con la forma entera (${p.fit}) y sin tarjeta`);
  ok(g.subsAvail(0) === 4 && g.bench[0][2].used, `quedan ${g.subsAvail(0)} cambios y el suplente ya ha entrado`); }
// cinco cambios como mucho; el que ha entrado no vuelve a entrar
{ const g = play(); g.setPhase('dead'); g.pendingRestart = { type: 'throwin', team: 1, x: 0, z: 30 };
  const outs = ['LI', 'LD', 'MI', 'MD', 'DCI'].map(r => g.byRole(0, r));
  let n = 0; outs.forEach((p, i) => { if (g.planSub(0, p.id, i)) n++; });
  ok(n === 5 && g.subsAvail(0) === 0, `cinco cambios hechos (${n}), no queda ninguno`);
  ok(!g.planSub(0, g.byRole(0, 'MCD').id, 0), 'el sexto no se puede'); }
// en sala, sin límite: el que sale se sienta y puede volver
{ const g = play({ format: 'sala' }), p = g.byRole(0, 'ALI'), num0 = p.num; g.setPhase('dead'); g.pendingRestart = { type: 'throwin', team: 1, x: 0, z: 9 };
  g.planSub(0, p.id, 2); const back = g.bench[0].findIndex(B => B.num === num0);
  ok(back >= 0 && !g.bench[0][back].used, `sala: el ${num0} se sienta en el banquillo y puede volver`);
  ok(g.planSub(0, p.id, back) && p.num === num0, `y vuelve a entrar (${p.num})`); }
// el expulsado no se puede cambiar
{ const g = play(), p = g.byRole(0, 'CTI'); g.book(p, 'red'); g.drain();
  ok(!g.planSub(0, p.id, 1), 'el expulsado no se puede cambiar'); }
// lesión grave: corre menos, no esprinta, avisa a tu equipo y el rival cambia al suyo en la parada
{ const g = play(), p = g.byRole(0, 'DCI'); p.x = 0; p.z = 0; p.vx = p.vz = 0; p.react = 99;
  g.hurt(p, 'entrada', 'grave'); let ev = g.drain(); p.down = 0;
  p.wx = PL.sprint; p.wz = 0; p.wantSprint = true; for (let i = 0; i < 240; i++) g.integrate(p, 1 / 120);
  const v = Math.hypot(p.vx, p.vz);
  ok(ev.some(e => e.t === 'injury' && e.sev === 'grave') && v < PL.run * 0.75 && !p.sprinting, `lesión grave: corre a ${v.toFixed(1)} m/s y sin esprintar`);
  ev = run(g, 0.6); ok(ev.some(e => e.t === 'needSub' && e.p === p.id), 'a tu equipo se le avisa de que hay que cambiarlo');
  const q = g.byRole(1, 'MCD'), n0 = q.num; g.hurt(q, 'golpe', 'grave'); g.setPhase('dead'); g.pendingRestart = { type: 'throwin', team: 0, x: 0, z: 30 };
  ev = run(g, 0.05); ok(ev.some(e => e.t === 'sub' && e.team === 1) && q.num !== n0 && !q.inj, `el rival cambia a su lesionado en la parada (sale el ${n0}, entra el ${q.num})`); }
// la lesión leve se pasa
{ const g = play(), p = g.byRole(0, 'MD'); g.hurt(p, 'golpe', 'leve'); g.drain(); p.inj.t = 0.2; const ev = run(g, 0.4);
  ok(!p.inj && ev.some(e => e.t === 'healed'), 'la lesión leve se pasa'); }
// la forma baja jugando, más esprintando, y la energía no pasa de ella
{ const g = play(), a = g.byRole(0, 'MI'), b = g.byRole(0, 'MD');
  for (const p of [a, b]) { p.react = 99; p.x = 0; p.z = p === a ? -10 : 10; }
  for (let i = 0; i < 120 * 20; i++) { for (const p of [a, b]) { p.wx = PL.sprint * (i % 240 < 120 ? 1 : -1); p.wz = 0; } a.wantSprint = true; b.wantSprint = false; g.integrate(a, 1 / 120); g.integrate(b, 1 / 120); }
  ok(a.fit < b.fit && b.fit < 1 && a.energy <= a.fit + 1e-9, `forma tras 20 s: esprintando ${a.fit.toFixed(2)}, al trote ${b.fit.toFixed(2)}; energía ${a.energy.toFixed(2)} ≤ forma`); }
// a la tercera falta de un mismo jugador, amarilla
{ const g = play(), p = g.byRole(1, 'MCI'), q = g.byRole(0, 'MCD'); let card = null;
  for (let i = 0; i < 3 && !card; i++) { g.setPhase('play'); q.x = 0; q.z = 0; g.owner = null; g.foul(p, q, { trip: true }); card = g.drain().find(e => e.t === 'card'); p.fls = Math.max(p.fls, i + 1); }
  ok(!!card && g.cards[p.id] === 'yellow', `tres faltas del mismo jugador: amarilla (${card?.why})`); }
console.log(fails ? `\n${fails} fallos` : '\nTodo correcto');
process.exit(fails ? 1 : 0);
