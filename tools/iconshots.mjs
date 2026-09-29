// Hoja de iconos: node tools/iconshots.mjs <salida.png>
import { chromium } from 'playwright-core';
const [,, out, page0 = 'icons.html'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.goto('http://127.0.0.1:5173/lab/' + page0 + '');
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: out, fullPage: true });
console.log(await page.evaluate(() => document.querySelectorAll('div').length));
await browser.close();
