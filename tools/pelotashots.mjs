// Capturas del minijuego de pelota en móvil vertical, móvil horizontal y escritorio.
// Uso: node tools/pelotashots.mjs [carpeta] [url base]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = 'entrega/pelota', base = 'http://127.0.0.1:5173/lab/pelota.html'] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const views = { movil: [390, 844, true], horizontal: [844, 390, true], escritorio: [1280, 720, false] };
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
for (const [tag, [w, h, touch]] of Object.entries(views)) {
  if (only && !only.includes(tag)) continue;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  for (const [name, qs] of [['intro', ''], ['saque', 'autostart&fixed&sim=1'], ['peloteo', 'autostart&auto&fixed&sim=9'], ['tanto', 'autostart&auto&fixed&sim=40']]) {
    await page.goto(`${base}?${qs}`);
    await page.waitForFunction(() => window.__ready, null, { timeout: 240000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/${tag}-${name}.png` });
    console.log(tag, name, await page.evaluate(() => { const g = window.__match.game; return JSON.stringify({ phase: g.phase, score: g.score, rally: g.rally && { turn: g.rally.turn, hits: g.rally.hits } }); }));
  }
  await ctx.close();
}
await browser.close();
