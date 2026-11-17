// Mide qué hace la pelota según la carga del golpe (toque, a medias, a tope) desde varias zonas de la cancha: velocidad
// al salir, dónde da en el frontis y dónde bota. Con el motor del partido, sin dibujar (golpe en seco, sin azar).
// Uso: node tools/pelota-fuerza.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 500 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://127.0.0.1:5173/?town=lumbier&q=low&weather=clear&skipintro=1&noflora', { timeout: 300000 });
const r = await p.evaluate(async () => {
  const { PelotaGame } = await import('/src/pelota/game.js').then(m => ({ PelotaGame: m.PelotaGame || m.default || Object.values(m).find(v => typeof v === 'function' && /strike/.test(v.toString().slice(0, 4000) + Object.getOwnPropertyNames(v.prototype || {}).join())) }));
  const M = await import('/src/pelota/game.js'), out = [];
  const Cls = Object.values(M).find(v => typeof v === 'function' && v.prototype && v.prototype.strike);
  if (!Cls) return { err: 'sin clase', keys: Object.keys(M) };
  let g; try { g = new Cls({ mode: 'match' }); } catch (e) { return { err: 'new: ' + e.message, keys: Object.keys(M) }; }
  const { Ball, predict } = await import('/src/pelota/physics.js');
  const firstBounce = (p0, v, spin) => { const b = new Ball(); b.set(p0, v); b.spin = spin || 0; const pr = predict(b, 5, 1 / 120); const f = pr.events.find(e => e.type === 'front'), l = pr.events.find(e => e.type === 'floor' && e.n === 1); return l ? { z: l.z, fy: f ? f.y : null, t: l.t } : null; };
  for (const z of [10, 17, 24]) for (const pow of [0.15, 0.4, 0.575, 0.8, 1]) {
    const s = g.strike('you', 0.85, { x: 0, y: 0 }, false, pow, true, { x: 0.5, y: 1.0, z });
    if (!s?.v) { out.push({ z, pow, nada: true }); continue; }
    const v = Math.hypot(s.v.x, s.v.y, s.v.z), fb = firstBounce(s.p, s.v, s.spin);
    out.push({ desde: z, carga: Math.round((pow - 0.15) / 0.85 * 100) + '%', vel: +v.toFixed(1), kmh: Math.round(v * 3.6), frontis: fb?.fy != null ? +fb.fy.toFixed(1) : null, bota: fb ? +fb.z.toFixed(1) : null, cuadro: fb ? Math.ceil(fb.z / 3.5) : null, llega_s: fb ? +fb.t.toFixed(2) : null, golpe: s.shot });
  }
  return out;
});
console.log(JSON.stringify(r, null, 0).replace(/},{/g, '},\n{'));
console.log(errs.slice(0, 3)); await b.close();
