// Capturas del aspecto del partido de pelota (inicio, juego, resultado y salir) en varios tamaños.
// Uso: node tools/pelota-look.mjs [carpeta] [tamaños ej. 390x844,844x390,1280x720]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = 'entrega/pelota/morado', sizes = '390x844,844x390,1280x720'] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
for (const sz of sizes.split(',')) {
  const [w, h] = sz.split('x').map(Number), mobile = w < 900;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto('http://127.0.0.1:5173/?town=lumbier', { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
  const shot = (n) => p.screenshot({ path: `${out}/${sz}-${n}.png`, timeout: 180000 });
  await p.evaluate(() => { const G = window.__game; G.fronton.play(G, G.pelotari); });
  await p.waitForSelector('.pel-panel', { timeout: 60000 }); await p.waitForTimeout(2000); await shot('1-inicio');
  await p.evaluate(() => document.querySelector('.pel-go[data-pel-go]').click()); await p.waitForTimeout(1500);
  // un tanto para ver el aviso del juez y el marcador
  await p.evaluate(() => { const m = window.__game.pelotaMatch; m.game.autoplay = true; for (let i = 0; i < 30 * 30 && m.active; i++) { m.update(1 / 30); if (document.querySelector('.pel-call.on')) break; } });
  await p.waitForTimeout(1200); await shot('2-partido');
  await p.evaluate(() => document.querySelector('.pel-exit').click()); await p.waitForTimeout(1200); await shot('3-salir');
  await p.evaluate(() => document.querySelector('[data-pel-no]')?.click()); await p.waitForTimeout(800);
  await p.evaluate(() => { const m = window.__game.pelotaMatch; m.game.autoplay = true; for (let i = 0; i < 400 * 30 && m.active; i++) m.update(1 / 30); });
  await p.waitForTimeout(2500); await shot('4-resultado');
  await ctx.close();
  console.log(sz, 'hecho');
}
console.log([...new Set(errs)].slice(0, 10).join('\n'));
await browser.close();
