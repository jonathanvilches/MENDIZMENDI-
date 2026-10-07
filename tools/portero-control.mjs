// Tu portero manejado por ti: tiros del rival a puerta desde 11 a 22 m a sitios al azar. Se compara el portero solo
// (la IA) con el tuyo cuando pulsas a tiempo (0,2 s después del disparo) con el joystick hacia el lado bueno, cuando
// pulsas sin apuntar (se estira hacia el balón) y al lado contrario (para menos: elegir cuenta) (se estira hacia el balón). Con el joystick bien puesto, el tuyo tiene que parar al menos lo mismo.
// Sin gráficos. Uso: node tools/portero-control.mjs [tiros]
import { FutbolGame } from '../src/futbol/game.js';
import { FIELD as F } from '../src/futbol/rules.js';
const [,, NS = '300'] = process.argv;
let fails = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
const gx = -F.HL, HW = F.goalW / 2 || 3.66;
function trial(mode, i) {
  const g = new FutbolGame({ seed: 900 + i * 13, replays: false }); g.start(); g.restart = null; g.phase = 'play'; g.owner = null;
  for (const p of g.players) { p.x = 30 + (p.id % 11); p.z = -30 + (p.id % 11) * 2; p.vx = p.vz = 0; p.react = 99; }
  const k = g.gk(0), r = g.byRole(1, 'DC'), rnd = g.rnd; k.x = gx + 1.2; k.z = 0; k.react = 0;
  const d = 11 + rnd() * 11, a = (rnd() - 0.5) * 1.0, sx = gx + d * Math.cos(a), sz = d * Math.sin(a);
  r.x = sx + 0.4; r.z = sz; g.ball.set(sx, sz);
  const tz = (rnd() * 2 - 1) * (HW - 0.3), ty = 0.2 + rnd() * 2.0, T = d / (20 + rnd() * 8);
  if (mode !== 'ia') { g.setMe(k, 'gk'); }
  g.autoplay = mode === 'ia';
  // velocidad para llegar a (gx, ty, tz) en T s (balón con poco rozamiento: aproximado)
  g.last = r; g.ball.kick((gx - sx) / T, (ty + 4.9 * T * T) / T, (tz - sz) / T); g.shotLive = { team: 1, t: g.time }; g.drain();
  let res = null, pressed = false;
  for (let t = 0; t < 2.5 && !res; t += 1 / 120) {
    if (mode !== 'ia' && !pressed && t >= 0.2) { pressed = true; if (mode === 'apunta') g.setMove(0, Math.sign(tz - k.z) || 1, 1, false); else if (mode === 'falla') g.setMove(0, -(Math.sign(tz) || 1), 1, false); else g.setMove(0, 0, 0, false); g.press('pass'); }
    g.step(1 / 120);
    for (const e of g.drain()) { if (e.t === 'goal') res = 'gol'; if (e.t === 'save' || e.t === 'catch' || e.t === 'parry') res = 'parada'; }
    if (!res && g.ball.p.x < gx - 0.5) res = Math.abs(g.ball.p.z) < HW && g.ball.p.y < F.goalH ? 'gol' : 'fuera';
    if (!res && (g.owner?.team === 0 || k.hands)) res = 'parada';
  }
  return res || (g.ball.p.x > gx + 3 ? 'parada' : 'otro');
}
const out = {};
for (const mode of ['ia', 'apunta', 'sin', 'falla']) { const c = { gol: 0, parada: 0, fuera: 0, otro: 0 }; for (let i = 0; i < +NS; i++) c[trial(mode, i)]++; out[mode] = { ...c, pct: Math.round(100 * c.parada / Math.max(1, c.parada + c.gol)) }; }
console.log(JSON.stringify(out));
ok(out.apunta.pct >= out.ia.pct - 3, `tu portero apuntando bien para lo mismo o más que el automático (${out.apunta.pct} % frente a ${out.ia.pct} %)`);
ok(out.sin.pct >= out.ia.pct - 12, `sin apuntar, se estira hacia el balón (${out.sin.pct} %)`);
ok(out.falla.pct < out.apunta.pct - 20, `elegir el lado cuenta: al lado contrario para mucho menos (${out.falla.pct} %)`);
console.log(fails ? fails + ' fallos' : 'Todo correcto');
