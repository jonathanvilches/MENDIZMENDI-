import { chromium } from 'playwright-core';
const [,, url, out, w = 844, h = 390] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const logs = [];
page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
await page.goto(url);
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: out + '-title.png' });
await page.evaluate(() => { document.querySelector('#pname').value = 'Ane'; document.querySelector('#bPlay').click(); });
await page.waitForTimeout(1500);
await page.touchscreen.tap(400, 200); // saltar intro
await page.waitForTimeout(3500);
// simular joystick: pointer events táctiles
const cdp = await ctx.newCDPSession(page);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 120, y: 300 }] });
for (let i = 0; i < 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 120, y: 300 - i * 6 }] }); await page.waitForTimeout(60); }
await page.waitForTimeout(1500);
await page.screenshot({ path: out + '-play.png' });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
const pos = await page.evaluate(() => [window.__game.player.pos.x.toFixed(1), window.__game.player.pos.z.toFixed(1), window.__game.mode]);
console.log(JSON.stringify(pos), logs.join('\n'));
await browser.close();
