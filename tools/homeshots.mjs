// Capturas de la portada (inicio del hub) en varios tamaños y con varios personajes.
// Uso: node tools/homeshots.mjs <carpeta> [personajes separados por comas]
import { chromium } from 'playwright-core';
const [,, out = 'entrega/portada', who = 'benat,leire'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const av of who.split(',')) for (const [w, h] of [[390, 844], [360, 640], [1280, 720]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1000, isMobile: w < 1000 });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.addInitScript((av) => localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', avatar: av, last: 'tafalla', seen: { heroBenat: true } })), av);
  await p.goto('http://127.0.0.1:5173/?screen=home', { timeout: 300000 });
  await p.waitForFunction(() => window.__ready, null, { timeout: 300000 });
  await p.waitForTimeout(9000);
  await p.screenshot({ path: `${out}/portada-${av}-${w}x${h}.png`, timeout: 180000 });
  console.log(av, w, h, JSON.stringify(await p.evaluate(() => { const s = window.__hub?.stage; return s ? { band: s.band, H: s.H, lookY: s.lookY } : null; })));
  await ctx.close();
}
await browser.close();
