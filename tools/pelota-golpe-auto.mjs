// Golpe automático: con él, el jugador solo se mueve y el golpe sale solo cuando la pelota está a su alcance. Se juegan
// partidos sin tocar ningún botón (el joystick quieto: solo la ayuda del nivel le acerca a la pelota) y se cuentan los
// golpes: sin golpe automático no devuelve ninguna; con él, devuelve y gana tantos, más en los niveles con más ayuda.
// También: el saque sale solo y los golpes pedidos con los botones siguen valiendo. Sin gráficos.
// Uso: node tools/pelota-golpe-auto.mjs
import { PelotaGame } from '../src/pelota/game.js';

let fails = 0;
const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
function play(level, autoHit, k, inp = () => ({})) {
  const g = new PelotaGame({ mode: 'match', target: 5, level, autoHit, seed: 104729 * (k + 71) + 11 });
  g.start(); let t = 0, hits = 0, serves = 0;
  while (g.phase !== 'end' && t < 600) {
    for (const e of g.update(1 / 30, inp(g))) { if (e.type === 'hit' && e.who === 'you') hits++; if (e.type === 'serveRun' && e.who === 'you') serves++; }
    t += 1 / 30;
  }
  return { hits, serves, you: g.score.you, rival: g.score.rival, ended: g.phase === 'end', t };
}
const sum = (a, k) => a.reduce((x, y) => x + y[k], 0);
console.log('1. sin tocar nada y moviéndose hacia la pelota');
// (moverse: el joystick hacia donde llegará la pelota, como haría quien juega; sin botones)
const move = (g) => { const R = g.rally, y = g.players.you; if (g.phase !== 'rally' || R.turn !== 'you') return {}; const c = g.interceptFor('you', 6, 0.1); if (!c) return {}; const dx = c.x - y.x, dz = c.z - y.z, d = Math.hypot(dx, dz); return d > 0.3 ? { mx: dx / d, mz: dz / d } : {}; };
const R = {};
for (const lv of ['iniciacion', 'normal']) for (const [auto, mv] of [[false, false], [true, false], [true, true]]) {
  const r = [0, 1, 2, 3].map(k => play(lv, auto, k, mv ? move : () => ({}))), key = lv + (auto ? 'A' : '') + (mv ? 'M' : '');
  R[key] = r;
  console.log(`   ${lv.padEnd(10)} golpe automático ${auto ? 'sí' : 'no'}${mv ? ', moviéndose' : ', quieto     '}: ${sum(r, 'hits') - sum(r, 'serves')} devoluciones, ${sum(r, 'you')} tantos tuyos y ${sum(r, 'rival')} del rival · acabados ${r.filter(x => x.ended).length}/4`);
}
const ret = (k) => sum(R[k], 'hits') - sum(R[k], 'serves');
ok(ret('iniciacion') === 0 && ret('normal') === 0, 'sin golpe automático y sin tocar nada no se devuelve ninguna (solo el saque, que sale solo al rato)');
ok(ret('iniciacionA') > 5, 'con golpe automático, quieto, algunas se devuelven');
ok(sum(R.iniciacionA, 'you') < sum(R.iniciacionA, 'rival'), 'pero quieto no se gana: colocarse sigue haciendo falta');
ok(sum(R.iniciacionAM, 'you') > sum(R.iniciacionAM, 'rival') && sum(R.iniciacionAM, 'you') > sum(R.iniciacionA, 'you'), 'moviéndose hacia la pelota, en iniciación se gana (y mucho más que quieto)');
ok(sum(R.normalAM, 'you') >= 3, 'y en normal se ganan tantos');
ok(Object.values(R).flat().every(x => x.ended), 'los partidos acaban');
console.log('2. los botones siguen valiendo');
{ const g = new PelotaGame({ mode: 'match', target: 5, level: 'normal', autoHit: true, seed: 7 }); g.phase = 'rally'; g.rally = { striker: 'rival', turn: 'you', front: true, bounces: 1, hits: 2 };
  g.ball.p = { x: 0, y: 0.9, z: 18 }; g.ball.v = { x: 0, y: 0, z: 0 }; Object.assign(g.players.you, { x: 0.3, z: 18.3 }); Object.assign(g.players.rival, { x: 0, z: 30, cool: 1 }); g.driveAI = () => {};
  let shot = null; g.update(1 / 60, { drop: true }); for (const e of g.events) if (e.type === 'hit' && e.who === 'you') shot = e.shot;
  for (let i = 0; i < 6 && !shot; i++) { for (const e of g.update(1 / 60, {})) if (e.type === 'hit' && e.who === 'you') shot = e.shot; }
  console.log('   golpe con DEJADA pulsada:', shot); ok(shot === 'dejada', 'con el golpe automático, pulsar DEJADA hace la dejada'); }
console.log(fails ? `\n${fails} FALLOS` : '\nTodo correcto');
process.exit(fails ? 1 : 0);
