// Paradas del portero: cientos de tiros contra el portero de la IA desde distintas distancias, ángulos, alturas y
// fuerzas, sin gráficos. Cuenta goles, paradas y fuera, y señala los «fallos de portero»: goles en tiros que debería
// parar (flojos o cerca de donde está, o sin estirarse cuando hacía falta), despejes a su propia portería y balones
// que se le escapan de las manos. Uso: node tools/portero-paradas.mjs [nivel] [f11|sala]
import { FutbolGame } from '../src/futbol/game.js';
import { FIELD as F } from '../src/futbol/rules.js';
const [,, level = 'normal', format = 'f11'] = process.argv;
const res = { goal: 0, save: 0, out: 0, other: 0 }, fails = [], byDist = {};
let seed = 1;
for (const dist of format === 'sala' ? [5, 7, 9, 12] : [8, 12, 16, 20, 25, 30])
for (const z0 of [-10, -4, 0, 4, 10].map(v => format === 'sala' ? v * 0.5 : v))
for (const tzK of [-0.9, -0.5, 0, 0.5, 0.9])
for (const ty of [0.3, 1.2, 2.0].map(v => format === 'sala' ? v * 0.8 : v))
for (const charge of [0.3, 0.65, 0.95]) {
  const g = new FutbolGame({ seed: seed++, replays: false, level, format, surface: format === 'sala' ? 'parquet' : 'hierba' });
  g.mates = g.lvl;   // el portero que se prueba (el del equipo 0), con el nivel pedido
  g.start(); g.restart = null; g.phase = 'play'; g.drain();
  const gx = -F.HL, HW = F.goalW / 2, k = g.gk(0), sh = g.team(1).find(p => p.role.startsWith('DC')) || g.team(1)[g.team(1).length - 1];
  for (const p of g.players) { p.x = 30 + (p.id % 11); p.z = F.HW - 2; p.vx = p.vz = 0; p.react = 99; p.think = 99; }
  k.x = gx + 1; k.z = 0;
  const sx = gx + Math.sqrt(Math.max(1, dist * dist - z0 * z0)), sz = z0; sh.x = sx; sh.z = sz; sh.h = Math.atan2(gx - sx, -sz);
  g.ball.set(sx - 0.4, sz); g.owner = sh; sh.react = 99;
  // el portero se coloca mientras el delantero tiene el balón
  for (let t = 0; t < (+process.env.WAIT || 0.6); t += 1 / 120) { g.ball.set(sx - 0.4, sz); g.owner = sh; for (const p of g.players) if (p !== k) { p.vx = p.vz = 0; } g.step(1 / 120); }
  g.drain(); g.owner = sh; g.ball.set(sx - 0.4, sz);
  const kx = k.x, kz = k.z, tz = tzK * HW;
  g.shoot(sh, tz, ty, charge, 0, 0);
  const v0 = g.ball.speed; let out = 'other', ownGoalClear = false, dived = false, fumble = false;
  const TR = process.env.TRACE === [dist, z0, tzK, ty, charge].join(',');
  for (let t = 0; t < 3.5; t += 1 / 120) {
    for (const p of g.players) if (p !== k) { p.vx = p.vz = 0; p.react = 99; }
    g.step(1 / 120);
    if (TR && g.ball.p.x < gx + 6) console.log(t.toFixed(3), 'b', g.ball.p.x.toFixed(2), g.ball.p.y.toFixed(2), g.ball.p.z.toFixed(2), 'v', g.ball.speed.toFixed(1), 'k', k.x.toFixed(2), k.z.toFixed(2), k.dive ? 'DIVE' + JSON.stringify({ hy: k.dive.hy.toFixed(2), s: k.dive.side, j: k.dive.jump }) : '', 'last', g.last?.id, g.events.map(e => e.t).join(','));
    for (const e of g.drain()) {
      if (e.t === 'dive') dived = true;
      if (e.t === 'goal') { out = e.team === 1 ? 'goal' : 'owngoal'; if (g.last === k) ownGoalClear = true; }
      if (e.t === 'save' && out === 'other') out = 'save';
      if ((e.t === 'out' || e.t === 'miss') && out === 'other') out = 'out';
    }
    if (out === 'goal' || out === 'owngoal') break;
    if (out === 'save' || out === 'out') break;   // (lo que pase después, un córner o un rechace, ya es otra jugada)
  }
  if (out === 'save' && g.owner !== k && g.score[1] > 0) fumble = true;
  const key = out === 'owngoal' ? 'goal' : out; res[key] = (res[key] || 0) + 1;
  const bd = (byDist[dist] ||= { goal: 0, save: 0, out: 0, other: 0, esquina: 0, esquinaGol: 0 }); bd[key]++;
  if (Math.abs(tzK) > 0.8) { bd.esquina++; if (key === 'goal') bd.esquinaGol++; }
  // ¿debía pararla? tiro a portería cerca de donde estaba el portero (a menos de 1,6 m de su mano) o flojo
  const onTarget = Math.abs(tz) < HW && ty < F.goalH, near = Math.abs(tz - kz) < 1.6 * F.goalW / 7.32, soft = v0 < 20;
  if (out === 'goal' && onTarget && kx - gx < 3 && (near || soft)) fails.push({ dist, z0, tz: +tz.toFixed(1), ty, charge, v: +v0.toFixed(1), k: [+(kx - gx).toFixed(1), +kz.toFixed(1)], dived, own: ownGoalClear });
  if (out === 'owngoal' || fumble) fails.push({ why: out === 'owngoal' ? 'gol en propia' : 'se le escapa', dist, z0, tz, ty, charge });
}
const n = Object.values(res).reduce((a, b) => a + b, 0);
console.log(`nivel ${level} · ${format} · ${n} tiros:`, JSON.stringify(res), `· paradas ${(100 * res.save / Math.max(1, res.save + res.goal)).toFixed(0)}% de los que van dentro`);
for (const [d, r] of Object.entries(byDist)) console.log(`  a ${d} m:`, JSON.stringify(r));
console.log(`fallos de portero: ${fails.length}`); const pick = process.env.DIST ? fails.filter(f => f.dist == process.env.DIST) : fails; for (const f of pick.slice(0, 25)) console.log('  ', JSON.stringify(f));
