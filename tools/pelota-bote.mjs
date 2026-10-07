// Altura del bote: cuánto sube la pelota tras el primer bote (golpe, cortada y dejada) desde varios sitios y fuerzas.
// Tiene que verse botar: ni pegada al suelo ni como una goma. Uso: node tools/pelota-bote.mjs
import { PelotaGame } from '../src/pelota/game.js';
function run(from, aim, req, pow) {
  const g = new PelotaGame({ seed: 3, level: 'normal' }); g.start?.(); g.phase = 'rally'; g.rally = { striker: 'rival', turn: 'you', front: true, bounces: 1, hits: 1 };
  g.ball.p = { ...from }; g.ball.v = { x: 0, y: 0, z: 0 }; g.players.you.x = from.x + 0.3; g.players.you.z = from.z + 0.4;
  g.strike('you', 0.9, aim, req, pow); g.events.length = 0;
  let front = false, n = 0, peak = 0, peak2 = 0, vy = 0;
  for (let t = 0; t < 6; t += 1 / 240) {
    g.players.rival.cool = 99; g.players.rival.z = 60; g.update(1 / 240);
    for (const e of g.events) { if (e.type === 'front') front = true; if (e.type === 'floor' && front) { n++; if (n === 1) vy = e.vy; } }
    g.events.length = 0;
    if (n === 1) peak = Math.max(peak, g.ball.p.y); if (n === 2) peak2 = Math.max(peak2, g.ball.p.y);
    if (n >= 3 || g.phase !== 'rally') break;
  }
  return { peak, peak2, vy };
}
const res = {};
for (const [name, req, aims] of [['golpe', false, [{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }]], ['cortada', 'cortada', [{ x: 0, y: 0 }, { x: -1, y: 0 }]], ['dejada', 'dejada', [{ x: 0, y: 0 }]]]) {
  const P = [], P2 = [], V = [];
  for (const x of [-2, 1, 3]) for (const z of [12, 18, 24]) for (const pow of [0.2, 0.6, 0.95]) for (const aim of aims) { const r = run({ x, y: 1, z }, aim, req, pow); P.push(r.peak); P2.push(r.peak2); V.push(-r.vy); }
  const avg = a => +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(2);
  res[name] = { primerBote: avg(P), min: +Math.min(...P).toFixed(2), segundoBote: avg(P2), velSuelo: avg(V) };
  console.log(name.padEnd(8), JSON.stringify(res[name]));
}
const ok = res.golpe.primerBote > 0.35 && res.cortada.primerBote > 0.3 && res.cortada.primerBote < res.golpe.primerBote && res.dejada.primerBote > 0.3 && res.dejada.min > 0.25;
console.log(ok ? 'Todo correcto' : 'Botes demasiado bajos');
