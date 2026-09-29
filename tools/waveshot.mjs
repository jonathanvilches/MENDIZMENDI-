import { chromium } from 'playwright-core';
const [,, out, qs = '', pg = 'wave', W = 1200, H = 900] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: +W, height: +H } });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.goto('http://127.0.0.1:5173/lab/' + pg + '.html?' + qs, { timeout: 240000 });
await page.waitForFunction(() => window.__ready, null, { timeout: 240000 });
await page.screenshot({ path: out });
await browser.close();
