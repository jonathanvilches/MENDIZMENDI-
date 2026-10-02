// Mastín (u otra raza) junto al jugador: giros, marcha atrás y empujones; mide la distancia mínima perro-jugador.
// node tools/perro-sigue.mjs <prefijo captura> [raza] [pueblo] [url base]
import { chromium } from 'playwright-core';
const [,, out = '/tmp/perro', breed = 'mastin', town = 'lesaka', base = 'http://127.0.0.1:5173/'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
const logs = []; page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
await page.addInitScript((breed) => { try { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'leire', xp: 0, towns: {}, cards: [], species: [], peaks: [], badges: [], seen: { dog: true }, dogBreed: breed, dogOn: true, settings: { music: false, volume: 0.8, quality: 'low', timeSpeed: 1 } })); } catch (e) { } }, breed);
await page.goto(base + '?town=' + town + '&noflora');
await page.waitForFunction(() => window.__game && window.__game.mode === 'play' && window.__game.perro?.dog?.glbA, null, { timeout: 180000 }).catch(() => logs.push('no game/dog'));
await page.waitForTimeout(2500);
const r = await page.evaluate(async () => {
  // simulación paso a paso a 60 Hz (sin depender de lo que tarde en dibujar SwiftShader)
  const g = window.__game, rt = g.rt, D = g.perro.dog, P = g.player, yaw = g.follow.yaw;
  rt.active = false;
  const I = g.input;
  let minC = 9, minH = 9, t = 0, worst = null, phase = 'giros', mins = {};
  const step = () => { const dt = 1 / 60; P.update(dt, I, yaw); g.update(dt); rt.fauna.update(dt, P, rt.elapsed, rt.sky.night, rt.sound); t += dt;
    const d = Math.hypot(D.pos.x - P.pos.x, D.pos.z - P.pos.z), hl = 0.45 * (D.glbA?.height || 0.7);
    let h = 9; for (const k of [1, -0.85]) h = Math.min(h, Math.hypot(D.pos.x + Math.sin(D.heading) * hl * k - P.pos.x, D.pos.z + Math.cos(D.heading) * hl * k - P.pos.z));
    if (t > 0.5) { const m = (mins[phase] ||= { c: 9, h: 9 }); m.c = Math.min(m.c, +d.toFixed(2)); m.h = Math.min(m.h, +h.toFixed(2)); if (d < minC) { minC = d; worst = +t.toFixed(2); } minH = Math.min(minH, h); } };
  const go = (x, y, s, run = false) => { I.move.x = x; I.move.y = y; I.run = run; for (let i = 0; i < s * 60; i++) step(); };
  go(0, 0, 1); go(0, 1, 2); go(0, -1, 2); go(0, 1, 1.5); go(-1, 0, 1.2); go(1, 0, 1.5);
  go(0, 0, 1.2); go(0, -1, 1.8, true); go(0, 1, 1.5, true); go(0, 0, 1.5);
  phase = 'contra el perro';
  for (let k = 0; k < 4; k++) { const a = Math.atan2(D.pos.x - P.pos.x, D.pos.z - P.pos.z); go(Math.sin(a - yaw), -Math.cos(a - yaw), 1.2); go(0, 0, 0.8); }
  phase = 'vueltas cortas';
  for (let k = 0; k < 6; k++) { const a = k * 2.1; go(Math.sin(a), -Math.cos(a), 0.5); }
  go(0, 0, 1.5);
  rt.active = true;
  return { mins, minC: +minC.toFixed(2), minH: +minH.toFixed(2), worst, scale: D.obj.scale.x, radius: D.radius, h: D.glbA?.height };
});
console.log(JSON.stringify(r));
await page.evaluate(() => { const g = window.__game; g.input.move.x = 0; g.input.move.y = 0; });
await page.waitForTimeout(2500);
await page.evaluate(() => { const g = window.__game, P = g.player; g.follow.yaw = P.heading + 2.1; });
await page.waitForTimeout(800);
await page.screenshot({ path: out + '-' + breed + '.png' });
console.log(logs.join('\n'));
await browser.close();
