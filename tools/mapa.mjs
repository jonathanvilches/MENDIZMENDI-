// Mapa del pueblo en móvil: vista general y muy ampliada, para comprobar que es vectorial y nítido.
// Uso: node tools/mapa.mjs <pueblo> <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'erronkari-roncal', out = 'entrega/mapa'] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
const t0 = Date.now();
await p.waitForTimeout(9000); const t1 = Date.now(); await p.evaluate(() => window.__game.ui.openMap()); await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); console.log('pintado en', Date.now() - t1, 'ms');
await p.waitForTimeout(2500); console.log('abrir mapa', Date.now() - t0, 'ms');
await p.screenshot({ path: `${out}/${town}-general.png`, timeout: 180000 });
for (const [n, z] of [['zoom', 4], ['zoom-max', 3]]) {
  for (let i = 0; i < z; i++) { await p.evaluate(() => document.querySelector('.mapctl [data-z="in"]').click()); await p.waitForTimeout(400); }
  await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/${town}-${n}.png`, timeout: 180000 });
}
await browser.close();
