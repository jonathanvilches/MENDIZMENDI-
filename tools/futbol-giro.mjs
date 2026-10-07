// Giros bruscos esprintando con el balón: el tuyo no debe pararse (pivota y sale con media velocidad).
import { FutbolGame } from '../src/futbol/game.js';
for (const turn of [90, 135, 180]) {
  const g = new FutbolGame({ seed: 3, replays: false }); g.start(); g.restart = null; g.phase = 'play'; g.owner = null;
  for (const p of g.players) { p.x = (p.team ? 30 : -30) + (p.id % 11) * 0.5; p.z = -30 + (p.id % 11) * 2; p.vx = p.vz = 0; p.react = 99; }
  const me = g.me; me.x = 0; me.z = 0; me.energy = 1; g.ball.set(0.4, 0); g.owner = me;
  for (let t = 0; t < 1.5; t += 1 / 120) { g.setMove(1, 0, 1, true); g.step(1 / 120); g.drain(); }
  const a = turn * Math.PI / 180; let mn = 99, t8 = null;
  for (let t = 0; t < 2; t += 1 / 120) { g.setMove(Math.cos(a), Math.sin(a), 1, true); g.step(1 / 120); g.drain(); const v = Math.hypot(g.me.vx, g.me.vz); mn = Math.min(mn, v); if (t8 === null && t > 0.05 && v > 7) t8 = t; }
  console.log(`giro ${turn}°: mínima ${mn.toFixed(1)} m/s, de nuevo a 7 m/s en ${t8?.toFixed(2)} s, sigue con el balón ${g.owner === me}`);
}
