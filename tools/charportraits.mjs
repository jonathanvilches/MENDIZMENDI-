// Retratos (busto y cuerpo entero, fondo transparente) de un personaje GLB para el selector y los diálogos.
// Uso: node tools/charportraits.mjs [personaje]
import { chromium } from 'playwright-core';
const [,, who = 'protagonista'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [view, size, name] of [['bust', [256, 256], `portrait_${who}`], ['portrait', [256, 384], `portrait_${who}_full`]]) {
  const page = await browser.newPage({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto(`http://127.0.0.1:5173/lab/chars.html?shot&who=${who}&view=${view}&ry=0.3&bg=none&clip=Idle&t=0.4&mouth=Happy`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 240000 });
  await page.screenshot({ path: `src/assets/chars/${name}.png`, omitBackground: true });
  console.log(name);
}
await browser.close();
