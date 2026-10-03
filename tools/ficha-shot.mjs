// Fotos de una ficha de flora en móvil vertical, móvil horizontal, tableta y escritorio
// Uso: node tools/ficha-shot.mjs <carpeta> [especie]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = '/tmp/ficha', id = 'helecho'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
for (const [name, w, h] of [['movil', 390, 844], ['movil-h', 844, 390], ['tableta', 820, 1180], ['escritorio', 1280, 760]]) {
  const page = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: w < 900 });
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://127.0.0.1:5173/lab/hojas.html', { timeout: 300000 });
  await page.evaluate(async (id) => { await import('/src/style.css'); await import('/src/hub/hub.css'); const { showFicha } = await import('/src/ui/ficha.js'); showFicha('flora:' + id); }, id);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${out}/${name}.png` });
  if (name === 'movil-h') { await page.evaluate(() => { const c = document.querySelector('.ficha .mg-card'); c.scrollTop = c.scrollHeight; }); await page.waitForTimeout(400); await page.screenshot({ path: `${out}/${name}-abajo.png` }); }
  await page.close();
}
console.log('errores', JSON.stringify(errs));
await b.close();
