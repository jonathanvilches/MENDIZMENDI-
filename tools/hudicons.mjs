// Capturas de los botones del HUD en móvil con cada icono del botón de acción. Uso: node tools/hudicons.mjs <carpeta>
import { chromium } from 'playwright-core';
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto('http://127.0.0.1:5173/?town=ituren', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
await p.evaluate(() => { const g = window.__game; g.updateInteraction = () => {}; g.ui.showBinoButton?.(); });
for (const t of [null, 'Hablar con Guía Ane', 'Saludar a Maite', 'Jugar a pelota', 'Beber agua', 'Examinar', 'Coger el eguzkilore']) {
  await p.evaluate((t) => window.__game.ui.setPrompt(t), t); await p.waitForTimeout(1200);
  const box = await p.evaluate(() => { const r = document.querySelector('#controls').getBoundingClientRect(); return { x: r.x - 12, y: r.y - 12, width: r.width + 24, height: r.height + 24 }; });
  await p.screenshot({ path: `${out}/ic-${(t || 'nada').split(' ')[0]}.png`, clip: box, timeout: 180000 });
}
await p.screenshot({ path: `${out}/ic-full.png`, timeout: 180000 });
await browser.close();
