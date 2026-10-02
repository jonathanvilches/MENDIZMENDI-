// Las razas de perro en lab/perros.html: node tools/perros.mjs <salida.png> "parámetros" (b=razas, ry, head=1, anim=Walk…)
import { chromium } from 'playwright-core';
const [,, out, qs = ''] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 520 } });
page.on('pageerror', e => console.log('PAGEERROR', e.message)); page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.type(), m.text()); });
await page.goto('http://127.0.0.1:5173/lab/perros.html?' + qs);
await page.waitForFunction(() => window.__ready, null, { timeout: 90000 });
await page.screenshot({ path: out });
await browser.close();
