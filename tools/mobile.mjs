// Recorrido en móvil: node tools/mobile.mjs <url> <prefijo> [ancho] [alto] [pueblo]
import { chromium } from 'playwright-core';
const [,, url, out, w = 390, h = 844, town = 'etxalar'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const page = await ctx.newPage();
const logs = [];
page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text().slice(0, 200)); });
await page.goto(url);
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await page.waitForTimeout(2500);
const shot = async (n) => { await page.screenshot({ path: `${out}-${n}.png`, timeout: 120000 }); };
await shot('0-onboarding');
await page.evaluate(() => { const i = document.querySelector('#oName'); if (i) { i.value = 'Ane'; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); } });
await page.waitForTimeout(2500); await shot('1-home');
for (const s of ['map', 'avatars', 'badges', 'nature']) { await page.evaluate((s) => window.__hub.go(s), s); await page.waitForTimeout(1800); await shot('2-' + s); }
await page.evaluate(() => window.__hub.go('comarca', 'bidasoa')); await page.waitForTimeout(1500); await shot('3-comarca');
await page.evaluate((t) => window.__hub.townSheet(t), town); await page.waitForTimeout(1200); await shot('4-sheet');
await page.evaluate((t) => window.__hub.play(t), town);
await page.waitForTimeout(1500); await shot('5-loading');
await page.waitForFunction(() => window.__game && window.__game.mode, null, { timeout: 120000 }).catch(() => logs.push('no game'));
await page.waitForTimeout(4000); await shot('6-game');
const cdp = await ctx.newCDPSession(page);
const jx = 90, jy = +h - 110;
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: jx, y: jy }] });
for (let i = 0; i < 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: jx, y: jy - i * 6 }] }); await page.waitForTimeout(60); }
await page.waitForTimeout(1200); await shot('7-walk');
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await page.waitForTimeout(600);
const info = await page.evaluate(() => ({ mode: window.__game?.mode, pos: [window.__game?.player.pos.x.toFixed(1), window.__game?.player.pos.z.toFixed(1)], fps: window.__fps }));
console.log(JSON.stringify(info)); console.log(logs.slice(0, 40).join('\n'));
await browser.close();
