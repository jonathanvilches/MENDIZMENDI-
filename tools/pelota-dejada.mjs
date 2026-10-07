// ¿Llega el rival a la dejada? Desde varios sitios y fuerzas, tu dejada con el rival recolocado al fondo; cuenta en
// cuántas la devuelve (por nivel). Debe llegar a veces, no nunca ni siempre. Uso: node tools/pelota-dejada.mjs
import { PelotaGame } from '../src/pelota/game.js';
function one(level, from, pow, aimX, seed) {
  const g = new PelotaGame({ seed, level }); g.start?.(); g.phase = 'rally'; g.rally = { striker: 'rival', turn: 'you', front: true, bounces: 1, hits: 3 };
  g.ball.p = { ...from }; g.ball.v = { x: 0, y: 0, z: 0 }; Object.assign(g.players.you, { x: from.x + 0.3, z: from.z + 0.4, vx: 0, vz: 0 });
  Object.assign(g.players.rival, { x: -from.x * 0.5, z: 20.5, vx: 0, vz: 0, cool: 0 });
  g.autoplay = false; g.strike('you', 0.85, { x: aimX, y: 0 }, 'dejada', pow); g.events.length = 0;
  for (let t = 0; t < 6; t += 1 / 120) {
    g.update(1 / 120, { mx: 0, mz: 0 });
    for (const e of g.events) { if (e.type === 'hit' && e.who === 'rival') return 'devuelta'; if (e.type === 'point') return 'tanto'; }
    g.events.length = 0;
  }
  return 'nada';
}
let bad = 0, prev = 0;
for (const level of ['facil', 'normal', 'dificil']) {
  let dev = 0, n = 0;
  for (const x of [-3, -1, 1, 3]) for (const z of [12, 15, 18, 22]) for (const pow of [0.15, 0.5, 0.9]) for (const ax of [-0.5, 0, 0.5]) for (const seed of [1, 2]) { n++; if (one(level, { x, y: 1, z }, pow, ax, seed) === 'devuelta') dev++; }
  const pc = Math.round(dev / n * 100); console.log(level.padEnd(8), `devuelve ${dev} de ${n} dejadas (${pc} %)`);
  if (pc < 15 || pc > 75) bad++;
  if (level !== 'facil' && pc < prev) bad++; prev = pc;
}
console.log(bad ? 'Fuera de rango' : 'Todo correcto');
