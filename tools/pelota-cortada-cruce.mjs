// Cortada a la izquierda: cuanto más se lleva el joystick a la izquierda, más cruzada sale del frontis hacia la derecha
// (x del primer bote: positivo = a la derecha). Uso: node tools/pelota-cortada-cruce.mjs
import { PelotaGame } from '../src/pelota/game.js';
import { landingOf } from '../src/pelota/physics.js';
const res = [];
for (const ax of [-0.3, -0.5, -0.7, -0.85, -1]) { let sx = 0, n = 0, dos = 0;
  for (const x of [-2, 0, 2, 3.5]) for (const z of [12, 16, 20]) for (const pow of [0.3, 0.7]) for (const seed of [1, 2, 3]) {
    const g = new PelotaGame({ seed }); g.start?.(); g.phase = 'rally'; g.rally = { striker: 'rival', turn: 'you', front: true, bounces: 1, hits: 3 };
    g.ball.p = { x, y: 1, z }; g.ball.v = { x: 0, y: 0, z: 0 };
    const r = g.strike('you', 0.85, { x: ax, y: 0 }, 'cortada', pow, true); if (!r?.v) continue;
    const L = landingOf(r.p, r.v); if (!L?.land) continue; sx += L.land.x; n++; if (r.sub === 'cortDos') dos++; }
  res.push(`joystick ${ax}: bote medio en x ${(sx / n).toFixed(1)} m, a dos paredes ${dos}/${n}`); }
console.log(res.join('\n'));
