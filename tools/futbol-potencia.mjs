// Fútbol: la fuerza de la barra se nota. Pase y tiro mantenidos poco, medio y mucho tiempo: el balón tiene que salir
// más rápido y, en el pase, ir más lejos; en el tiro, más fuerte y más alto. Sin gráficos. Uso: node tools/futbol-potencia.mjs
import { FutbolGame } from '../src/futbol/game.js';
import { FIELD as F } from '../src/futbol/rules.js';
let fails = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
function setup(seed = 3) {
  const g = new FutbolGame({ seed, replays: false }); g.start(); g.restart = null; g.phase = 'play'; g.owner = null;
  for (const p of g.players) { p.x = (p.team ? 30 : -30) + (p.id % 11) * 0.5; p.z = -30 + (p.id % 11) * 2; p.vx = p.vz = 0; p.react = 99; }
  g.drain(); return g;
}
function kick(kind, hold) {
  const g = setup(), me = g.me, q = g.byRole(0, 'DCI');
  const x0 = kind === 'shoot' ? F.HL - 20 : 0; me.x = x0; me.z = 0; me.h = Math.PI / 2; q.x = x0 + 14; q.z = -4;
  g.ball.set(x0 + 0.5, 0); g.owner = me; g.setMove(kind === 'shoot' ? 1 : 0, 0, kind === 'shoot' ? 1 : 0, false); g.press(kind);
  for (let t = 0; t < hold; t += 1 / 120) { g.step(1 / 120); me.x = x0; me.z = 0; g.ball.set(x0 + 0.5, 0); g.owner = me; me.vx = me.vz = 0; }
  const ev = []; g.release(kind); g.step(1 / 120); ev.push(...g.drain());
  const v = Math.hypot(g.ball.v.x, g.ball.v.y || 0, g.ball.v.z), vy = g.ball.v.y || 0, pp = ev.find(e => e.t === 'powerPass');
  return { v: +v.toFixed(1), vy: +vy.toFixed(1), d: pp?.d ?? null };
}
const P = [0.3, 0.55, 0.85].map(h => kick('pass', h)), S = [0.15, 0.45, 0.85].map(h => kick('shoot', h));
console.log('pase', JSON.stringify(P)); console.log('tiro', JSON.stringify(S));
ok(P[0].d < P[1].d && P[1].d < P[2].d && P[2].d / P[0].d > 1.3, `pase: más carga, más lejos (${P.map(r => r.d + ' m').join(' → ')})`);
ok(P[0].v < P[2].v, `pase: más carga, más rápido (${P.map(r => r.v + ' m/s').join(' → ')})`);
ok(S[0].v < S[1].v && S[1].v < S[2].v && S[2].v / S[0].v > 1.3, `tiro: más carga, más fuerte (${S.map(r => r.v + ' m/s').join(' → ')})`);
console.log(fails ? fails + ' FALLOS' : 'Todo correcto');
