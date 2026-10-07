// ¿Llega el pase y lo controla el compañero? En un partido de verdad (los dos equipos en su sitio), pases tuyos con un
// solo toque al compañero hacia el que apuntas, a varias distancias. Cuenta cuántos controla el compañero, cuántos le
// rebotan, cuántos corta un rival y cuántos se pierden. Uso: node tools/futbol-recepcion.mjs
import { FutbolGame } from '../src/futbol/game.js';
const res = { controla: 0, rebota: 0, corta: 0, otroMio: 0, perdido: 0, n: 0 }, byD = {};
const prep = (seed) => {
  const g = new FutbolGame({ seed, replays: false, level: 'normal', assist: true }); g.start(); g.restart = null; g.phase = 'play';
  for (let k = 0; k < 240; k++) g.step(1 / 120);
  g.restart = null; g.phase = 'play'; g.drain();
  // pasa el que tiene más sitio (ningún rival a menos de 4 m): como en el juego, con el balón en los pies y quieto
  const foes = g.team(1), free = (p) => Math.min(...foes.map(f => Math.hypot(f.x - p.x, f.z - p.z)));
  const me = g.team(0).filter(p => p.role !== 'POR').sort((a, b) => free(b) - free(a))[0];
  g.setMe?.(me, 'ball'); g.me = me; me.vx = me.vz = 0;
  g.ball.set(me.x + 0.5 * g.dir[0], me.z); g.ball.v.x = g.ball.v.z = g.ball.v.y = 0; g.owner = me; g.passTo = null;
  return g;
};
for (let seed = 1; seed <= 40; seed++) {
  const g = prep(seed), me = g.me;
  const mates = g.team(0).filter(p => p !== me && p.role !== 'POR').map(p => [Math.hypot(p.x - me.x, p.z - me.z), p.id]).filter(([d]) => d > 8 && d < 32).sort((a, b) => a[0] - b[0]);
  for (const [d0, qid] of mates.slice(0, 3)) {
    const G2 = prep(seed), m2 = G2.me, q2 = G2.players.find(p => p.id === qid);
    const dx = q2.x - m2.x, dz = q2.z - m2.z, L = Math.hypot(dx, dz);
    G2.setMove(dx / L, dz / L, 1, false); G2.press('pass'); G2.step(1 / 120); G2.release('pass'); G2.setMove(0, 0, 0, false);
    if (!G2.passTo) { res.n++; res.perdido++; continue; }
    const tgt = G2.passTo; let out = 'perdido', blocks = 0, near = 99, nearV = 0, nearY = 0;
    for (let t = 0; t < 4 && out === 'perdido'; t += 1 / 120) {
      G2.step(1 / 120);
      for (const e of G2.drain()) if (e.t === 'block' && e.p === tgt.id) blocks++;
      { const d = Math.hypot(G2.ball.p.x - tgt.x, G2.ball.p.z - tgt.z); if (d < near) { near = d; nearV = G2.ball.speed; nearY = G2.ball.p.y; } }
      if (G2.owner && G2.owner !== m2) out = G2.owner === tgt ? 'controla' : G2.owner.team === m2.team ? 'otroMio' : 'corta';
      if (G2.phase !== 'play') break;
    }
    if (out !== 'controla' && blocks) out = 'rebota';
    res[out]++; res.n++;
    const b = d0 < 15 ? 'corto' : d0 < 24 ? 'medio' : 'largo'; (byD[b] ||= { n: 0, ok: 0 }).n++; if (out === 'controla' || out === 'otroMio') byD[b].ok++;
  }
}
const pc = (x) => Math.round(x / res.n * 100) + ' %';
console.log(`pases ${res.n}: controla ${pc(res.controla)} · otro compañero ${pc(res.otroMio)} · le rebota ${pc(res.rebota)} · corta el rival ${pc(res.corta)} · perdido ${pc(res.perdido)}`);
console.log(Object.entries(byD).map(([k, v]) => `${k}: ${Math.round(v.ok / v.n * 100)} % de ${v.n}`).join(' · '));
const ok = (res.controla + res.otroMio) / res.n >= 0.8 && res.rebota / res.n <= 0.05;
console.log(ok ? 'Todo correcto' : 'Recepción floja');
