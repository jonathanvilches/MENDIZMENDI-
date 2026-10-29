import { chromium } from 'playwright-core';
const [,, out, f = 'ref/female.glb'] = process.argv;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 500, height: 700 } });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
for (const ry of [0, 1.2, 3.14]) { await page.goto(`http://127.0.0.1:5173/lab/glb.html?f=${f}&ry=${ry}`); await page.waitForFunction(() => window.__ready, null, { timeout: 180000 }); await page.screenshot({ path: `${out}-${ry}.png` }); }
console.log(JSON.stringify(await page.evaluate(() => window.__info)));
await browser.close();
