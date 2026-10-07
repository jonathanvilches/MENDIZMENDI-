// Pelota: mide los golpes desde toda la cancha (joystick, fuerza y golpe pedido) y cuenta cuántos acaban mal: a la
// chapa, altos en el frontis, por encima de la pared izquierda (la chapa de arriba) o fuera; cuántos salen a dos paredes
// con el joystick a la izquierda del todo; a qué altura pega la cortada y a qué velocidad; y lo largo del golpe.
// Sin gráficos. Uso: node tools/pelota-medir.mjs
import { PelotaGame } from '../src/pelota/game.js';
import { COURT } from '../src/pelota/rules.js';
function run(from, aim, req, pow, q = 0.9, seed = 3) {
  const g = new PelotaGame({ seed, level: 'normal' }); g.start?.(); g.phase = 'rally'; g.rally = { striker: 'rival', turn: 'you', front: true, bounces: 1, hits: 1 };
  g.ball.p = { ...from }; g.ball.v = { x: 0, y: 0, z: 0 }; g.players.you.x = from.x + 0.3; g.players.you.z = from.z + 0.4;
  g.strike('you', q, aim, req, pow);
  const v0 = Math.hypot(g.ball.v.x, g.ball.v.y, g.ball.v.z), hit = g.events.find(e => e.type === 'hit'), shot = hit?.shot, sub = hit?.sub; g.events.length = 0;
  let front = null, land = null, left = 0, leftFirst = false, over = false, end = null;
  for (let t = 0; t < 5 && !land && !end; t += 1 / 240) {
    g.players.rival.cool = 99; g.players.rival.z = 60; g.update(1 / 240);
    for (const e of g.events) { if (e.type === 'front' && !front) front = e; if (e.type === 'left') { if (!front) leftFirst = true; left++; if (e.over) over = true; } if (e.type === 'floor' && front && !land) land = e; if (e.type === 'point') end = e; }
    g.events.length = 0;
  }
  return { shot, sub, v0, front, land, left, leftFirst, over, end };
}
const P = [], A = [];
for (const x of [-3.5, -1.5, 0.5, 2.5, 4]) for (const z of [12, 16, 20, 24, 28]) P.push({ x, y: 1, z });
const pows = [0.2, 0.45, 0.7, 0.95];
const stat = (req, aims) => { const s = { n: 0, chapa: 0, alta: 0, over: 0, out: 0, dp: 0, land: [], fy: [], v: [] };
  for (const from of P) for (const aim of aims) for (const pow of pows) { const r = run(from, aim, req, pow); s.n++;
    if (r.end?.reason === 'chapa' || (r.front && r.front.y < COURT.CHAPA)) s.chapa++; else if (r.front && r.front.y > COURT.FRONT_TOP) s.alta++;
    if (r.over) s.over++; if (r.end && !['chapa', 'alta'].includes(r.end.reason) && !r.land) s.out++;
    if (r.shot === 'dosparedes' || (r.sub === 'cortDos' && r.leftFirst)) s.dp++; if (r.land) s.land.push(r.land.z); if (r.front) s.fy.push(r.front.y); s.v.push(r.v0); }
  const avg = a => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : null, mx = a => a.length ? +Math.max(...a).toFixed(1) : null;
  return { n: s.n, chapa: s.chapa, alta: s.alta, encimaPared: s.over, dosParedes: s.dp, boteMedio: avg(s.land), boteMax: mx(s.land), alturaFrontis: avg(s.fy), alturaMin: s.fy.length ? +Math.min(...s.fy).toFixed(2) : null, vel: avg(s.v) };
};
console.log('golpe todo izquierda', JSON.stringify(stat(false, [{ x: -1, y: 0 }, { x: -1, y: -0.5 }])));
console.log('golpe medio izquierda', JSON.stringify(stat(false, [{ x: -0.5, y: 0 }])));
console.log('golpe arriba-izq   ', JSON.stringify(stat(false, [{ x: -0.8, y: 0.8 }, { x: -1, y: 1 }])));
console.log('golpe centro/dcha  ', JSON.stringify(stat(false, [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }])));
console.log('cortada            ', JSON.stringify(stat('cortada', [{ x: 0, y: 0 }, { x: -0.6, y: 0 }, { x: 0.6, y: 0 }])));
console.log('cortada todo izq   ', JSON.stringify(stat('cortada', [{ x: -1, y: 0 }, { x: -1, y: -0.4 }])));
console.log('dejada             ', JSON.stringify(stat('dejada', [{ x: 0, y: 0 }])));
