// Partida en móvil: node tools/gameshots.mjs <url> <prefijo> <ancho> <alto> <pueblo>
import { chromium } from 'playwright-core';
const [,, url, out, w = 390, h = 844, town = 'etxalar'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1.5 });
const page = await ctx.newPage();
const logs = [];
page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
await page.addInitScript(() => { try { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'leire', xp: 0, towns: {}, cards: [], species: [], peaks: [], badges: [], seen: {}, settings: { music: false, volume: 0.8, quality: 'low', timeSpeed: 1 } })); } catch (e) { } });
await page.goto(url + '?town=' + town);
await page.waitForFunction(() => window.__game && window.__game.mode, null, { timeout: 180000 }).catch(() => logs.push('no game'));
await page.waitForTimeout(5000);
const shot = async (n) => { await page.screenshot({ path: `${out}-${n}.png`, timeout: 120000 }); };
await shot('g1');
const cdp = await ctx.newCDPSession(page);
const jx = 80, jy = +h - 90;
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: jx, y: jy }] });
for (let i = 0; i < 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: jx + i * 2, y: jy - i * 6 }] }); await page.waitForTimeout(80); }
await page.waitForTimeout(1500); await shot('g2');
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
// hablar con el guía
await page.evaluate(() => { const g = window.__game, M = g.missions[0]; g.player.place(M.host.pos.x + 1.5, M.host.pos.z + 1.5, 0); g.follow.snap(g.player); });
await page.waitForTimeout(1500); await shot('g3');
await page.evaluate(() => window.__game.input.press('e'));
await page.waitForTimeout(2500); await shot('g4');
console.log(logs.join('\n'));
await browser.close();
