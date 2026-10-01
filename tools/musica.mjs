// Prueba de la música por ambientes: recorre explorar, noche, misterio, tensión, juego y fiesta sin errores.
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 900, height: 500 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
await p.goto('http://127.0.0.1:5173/?town=lumbier&q=low', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
for (const m of ['explore', 'night', 'mystery', 'tension', 'game', 'fiesta']) {
  const r = await p.evaluate(async (m) => { const S = window.__rt.sound; S.init(); S.moodOf = null; window.__rt.moodOf = () => m; S.setMood(m); await new Promise(r => setTimeout(r, 2500)); return { mood: S.mood, t: S.ctx?.currentTime?.toFixed(1), state: S.ctx?.state }; }, m);
  console.log(JSON.stringify(r));
}
console.log('auto', await p.evaluate(() => { delete window.__rt.moodOf; return window.__rt.moodOf(window.__game); }));
console.log('errores', JSON.stringify(errs));
await b.close();
