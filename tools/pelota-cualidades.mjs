// Cualidades de los pelotaris (fuerza, agilidad, velocidad) y lo que se nota en el juego:
//  1. el rebote: a tope y largo, ¿llega la pelota a la pared de atrás? (según tu fuerza)
//  2. pegada a la pared izquierda: ¿falla más el rival? (según su agilidad)
//  3. la dejada: ¿la alcanza un rival lento y uno rápido?
//  4. un rival fuerte pega más largo
// Uso: node tools/pelota-cualidades.mjs
import { PelotaGame } from '../src/pelota/game.js';
const S = (f, a, v) => ({ fuerza: f, agilidad: a, velocidad: v });
let bad = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'MAL'} ${m}`); if (!c) bad++; };
// 1. rebote
console.log('1. al rebote (a tope, joystick arriba)');
const reb = {};
for (const f of [1, 3, 5]) {
  let back = 0, largo = 0, n = 0;
  for (const z of [16, 19, 22]) for (const x of [-2, 0, 2]) for (const seed of [104729, 209459, 314189]) {
    const g = new PelotaGame({ seed, youStats: S(f, 3, 3) }); g.phase = 'rally'; g.rally = { striker: 'rival', turn: 'you', front: true, bounces: 1, hits: 2 };
    g.ball.p = { x, y: 1, z }; g.ball.v = { x: 0, y: 0, z: 0 }; Object.assign(g.players.rival, { x: 0, z: 14, cool: 1 });
    g.driveAI = () => {};   // (el rival, quieto: solo se mira adónde llega la pelota)
    g.strike('you', 0.85, { x: 0, y: 1 }, false, 1); g.events.length = 0; n++;
    let r = 'nada';
    for (let t = 0; t < 6 && r === 'nada'; t += 1 / 120) { g.players.rival.cool = 1; g.update(1 / 120, {}); for (const e of g.events) { if (e.type === 'back' && e.live) r = 'rebote'; if (e.type === 'call') { r = r === 'nada' ? e.call : r; } } g.events.length = 0; }
    if (r === 'rebote') back++; if (r === 'largo') largo++;
  }
  reb[f] = back / n; console.log(`  fuerza ${f}: llega al rebote ${back} de ${n}, larga (fuera) ${largo}`);
}
ok(reb[5] >= reb[3] && reb[3] > reb[1] && reb[3] >= 0.5, 'cuanta más fuerza, más llega al rebote (y con fuerza media, la mayoría)');
// 2. pegada a la pared
console.log('2. pegada a la pared izquierda: errores del rival');
function rivalReturn(ag, ballX, seed) {
  const g = new PelotaGame({ seed, rivalStats: S(3, ag, 3) }); g.phase = 'rally'; g.rally = { striker: 'you', turn: 'rival', front: true, bounces: 1, hits: 2 };
  g.ball.p = { x: ballX, y: 0.9, z: 20 }; g.ball.v = { x: 0, y: 0.2, z: 1 }; Object.assign(g.players.rival, { x: ballX + 0.3, z: 20.2, cool: 0, vx: 0, vz: 0 });
  for (let t = 0; t < 4; t += 1 / 120) { g.update(1 / 120, {}); for (const e of g.events) if (e.type === 'hit' && e.who === 'rival') return e.q < 0.35 ? 'mal' : 'bien'; g.events.length = 0; }
  return 'nada';
}
const err = {};
for (const ag of [1, 3, 5]) for (const [k, x] of [['centro', 0], ['pared', -4.6]]) {
  let m = 0, n = 0; for (let k = 1; k <= 60; k++) { const r = rivalReturn(ag, x, 104729 * k + 7); if (r !== 'nada') { n++; if (r === 'mal') m++; } }
  err[ag + k] = m / Math.max(1, n); console.log(`  agilidad ${ag}, ${k}: golpes malos ${m} de ${n}`);
}
ok(err['1pared'] > err['1centro'] + 0.15 && err['3pared'] > err['3centro'], 'pegada a la pared, el rival falla más (sobre todo si es poco ágil)');
ok(err['1pared'] > err['5pared'], 'el ágil la devuelve mejor que el torpe');
// 3. dejada contra lento y rápido
console.log('3. dejada: rival lento y rápido');
function drop(vel, from, pow, seed) {
  const g = new PelotaGame({ seed, rivalStats: S(3, 3, vel) }); g.phase = 'rally'; g.rally = { striker: 'rival', turn: 'you', front: true, bounces: 1, hits: 3 };
  g.ball.p = { ...from }; g.ball.v = { x: 0, y: 0, z: 0 }; Object.assign(g.players.you, { x: from.x + 0.3, z: from.z + 0.4 });
  Object.assign(g.players.rival, { x: -from.x * 0.5, z: 21.5, vx: 0, vz: 0, cool: 0 });
  g.strike('you', 0.85, { x: 0, y: 0 }, 'dejada', pow); g.events.length = 0;
  for (let t = 0; t < 6; t += 1 / 120) { g.update(1 / 120, { mx: 0, mz: 0 }); for (const e of g.events) { if (e.type === 'hit' && e.who === 'rival') return 1; if (e.type === 'call') return 0; } g.events.length = 0; }
  return 0;
}
const dj = {};
for (const vel of [1, 3, 5]) { let d = 0, n = 0; for (const x of [-3, 0, 3]) for (const z of [12, 16, 20]) for (const pow of [0.15, 0.5]) for (const seed of [104729, 209459, 314189]) { n++; d += drop(vel, { x, y: 1, z }, pow, seed); } dj[vel] = d / n; console.log(`  velocidad ${vel}: devuelve ${d} de ${n} dejadas`); }
ok(dj[1] < dj[3] && dj[3] <= dj[5], 'al lento le pillan más las dejadas');
// 4. fuerza del rival: lo largo de sus golpes
console.log('4. fuerza del rival: dónde botan sus golpes');
const lz = {};
for (const f of [1, 5]) { let s = 0, n = 0; for (let k = 1; k <= 40; k++) {
  const g = new PelotaGame({ seed: 104729 * k + 3, rivalStats: S(f, 3, 3) }); g.phase = 'rally'; g.rally = { striker: 'you', turn: 'rival', front: true, bounces: 1, hits: 2 };
  g.ball.p = { x: 0, y: 0.9, z: 18 }; g.ball.v = { x: 0, y: 0.2, z: 1 }; Object.assign(g.players.rival, { x: 0.3, z: 18.2, cool: 0 }); Object.assign(g.players.you, { x: 2, z: 26 });
  let hit = false;
  for (let t = 0; t < 5; t += 1 / 120) { g.update(1 / 120, {}); for (const e of g.events) { if (e.type === 'hit' && e.who === 'rival') hit = true; if (hit && e.type === 'floor' && !e.dead) { s += e.z; n++; t = 99; break; } } g.events.length = 0; }
} lz[f] = s / Math.max(1, n); console.log(`  fuerza ${f}: bote medio en z ${lz[f].toFixed(1)} (${n} golpes)`); }
ok(lz[5] > lz[1] + 1.5, 'el rival fuerte pega más largo');
console.log(bad ? 'Hay fallos' : 'Todo correcto');
