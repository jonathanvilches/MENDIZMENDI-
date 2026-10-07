// Harrijasotzaile: juega el minijuego de levantar la piedra y fotografía la subida (suelo, muslos, pecho, hombro) y
// mide a qué altura queda la piedra respecto al hombro del levantador. Uso: node tools/piedra-hombro.mjs [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const out = process.argv[2] || 'entrega/piedra'; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
await p.goto('http://127.0.0.1:5173/?town=olite&q=low&weather=clear&skipintro=1&noflora', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.evaluate(() => { (async () => { const G = window.__game, M = await import('/src/ui/mini3d/index.js'); window.__res = await M.mash3d(G.ui, { art: 'lift', title: 'Levantar la piedra', hint: 'Pulsa muy rápido', seconds: 60, goal: 28, verb: '¡Arriba!' }); })(); });
await p.waitForSelector('.mg3d:not(.loading):not(.out)', { timeout: 120000 }); await p.waitForTimeout(1500);
const tap = () => p.evaluate(() => document.querySelector('.mg3d:not(.out) [data-go]')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })));
const shots = { 0: 'suelo', 8: 'muslos', 15: 'tripa', 21: 'pecho', 27: 'hombro' };
for (let n = 0; n <= 27; n++) {
  if (shots[n] !== undefined) { await p.waitForTimeout(900); await p.screenshot({ path: `${out}/piedra-${n}-${shots[n]}.png` }); }
  await tap(); await p.waitForTimeout(70);
}
console.log(errs.length ? errs.slice(0, 3) : 'sin errores'); await b.close();
