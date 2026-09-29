// Capturas de la pantalla de carga, HUD y avisos: node tools/loadshots.mjs <carpeta> (servidor fijo en :5180)
import { chromium } from 'playwright-core';
const [,, out] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [w,h] of [[390,844],[360,640],[844,390],[1280,720]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: w < 1000, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:5180/?town=etxalar');
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 180000 });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/hud-${w}x${h}.png`, timeout: 180000 });
  await p.evaluate(() => { window.__game.ui.toast?.('¡Bienvenido a Etxalar! Habla con Guía Iker'); });
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/toast-${w}x${h}.png`, timeout: 180000 });
  await p.evaluate(() => { const l = document.querySelector('#loading'); l.classList.remove('hidden'); l.style.opacity = 1; window.__game.ui.progress(0.62, 'Plantando la hierba…'); });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/load-${w}x${h}.png`, timeout: 180000 });
  await ctx.close();
}
await b.close();
