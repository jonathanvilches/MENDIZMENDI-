// Vistas fijas de El Sadar durante un partido (fuera, calle, grada, tras la portería, a ras de césped)
// Uso: node tools/sadar-vistas.mjs <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = '/tmp/sadar'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await b.newPage({ viewport: { width: 1100, height: 620 } });
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('http://127.0.0.1:5173/lab/futbol-demo.html?go=match&auto&notuto&quality=mid', { timeout: 300000 });
await page.waitForFunction(() => window.__futbol, null, { timeout: 300000 }).catch(() => errs.push('sin partido')); await page.waitForTimeout(8000);
await page.evaluate(() => { const m = window.__futbol; m.cam = () => {}; });
const V = {
  'aereo': [[-140, 120, 150], [0, 0, 0]],
  'calle': [[-40, 4, 125], [0, 15, 0]],
  'grada': [[0, 14, 52], [0, 0, 0]],
  'fondo': [[70, 9, 0], [0, 0, 0]],
  'cesped-porteria': [[40, 1.6, 6], [52.5, 1.2, 0]],
  'lateral-bajo': [[0, 1.7, 30], [0, 4, -40]],
};
for (const [n, [p, l]] of Object.entries(V)) {
  await page.evaluate(([p, l]) => { const c = window.__futbol.camera; c.fov = 50; c.position.set(...p); c.lookAt(...l); c.updateProjectionMatrix(); }, [p, l]);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/${n}.png` });
}
console.log('errores', JSON.stringify(errs));
await b.close();
