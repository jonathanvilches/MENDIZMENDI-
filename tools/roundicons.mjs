// Mide el centrado de los iconos dentro de los botones redondos y de control. Uso: node tools/roundicons.mjs <carpeta> [ancho alto]
import { chromium } from 'playwright-core';
const [,, out = 'entrega/iconos', w = 390, h = 844] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto('http://127.0.0.1:5173/?town=lumbier', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
await p.evaluate(() => { const g = window.__game; g.updateInteraction = () => {}; g.ui.showBinoButton?.(); g.ui.setPrompt('Hablar con Ane'); });
await p.waitForTimeout(1500);
const boxes = await p.evaluate(() => [...document.querySelectorAll('.round, .cbtn')].filter(b => b.offsetParent).map(b => { const r = b.getBoundingClientRect(), s = b.querySelector('svg').getBoundingClientRect(); return { id: b.id, x: r.x, y: r.y, w: r.width, h: r.height, sx: s.x - r.x, sy: s.y - r.y, sw: s.width, sh: s.height }; }));
for (const b of boxes) {
  const buf = await p.screenshot({ clip: { x: b.x, y: b.y, width: b.w, height: b.h }, timeout: 180000 });
  console.log(b.id.padEnd(7), `boton ${b.w.toFixed(1)}x${b.h.toFixed(1)} svg en (${b.sx.toFixed(2)}, ${b.sy.toFixed(2)}) ${b.sw.toFixed(1)}x${b.sh.toFixed(1)} · margen dcha ${(b.w - b.sx - b.sw).toFixed(2)} abajo ${(b.h - b.sy - b.sh).toFixed(2)}`);
  await p.screenshot({ path: `${out}/${b.id}.png`, clip: { x: b.x - 4, y: b.y - 4, width: b.w + 8, height: b.h + 8 }, timeout: 180000 });
}
const tr = await p.evaluate(() => { const r = document.querySelector('#topright').getBoundingClientRect(); return { x: r.x - 8, y: r.y - 8, width: r.width + 16, height: r.height + 16 }; });
await p.screenshot({ path: `${out}/topright.png`, clip: tr, timeout: 180000 });
await browser.close();
