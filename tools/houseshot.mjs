// Primer plano de fachadas: node tools/houseshot.mjs <url> <salida> <pueblo> [calidad]
import { chromium } from 'playwright-core';
const [,, url, out, town = 'etxalar', q = 'high'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.addInitScript(() => { try { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'leire', xp: 0, towns: {}, cards: [], species: [], peaks: [], badges: [], seen: {}, settings: { music: false, volume: 0.8, timeSpeed: 0 } })); } catch (e) { } });
await page.goto(url + '?town=' + town + '&t=10.5&q=' + q);
await page.waitForFunction(() => window.__game && window.__game.mode, null, { timeout: 180000 });
await page.waitForTimeout(2500);
await page.evaluate(() => { document.querySelector('#hud').style.display = 'none'; const g = window.__game, P = window.__layout.PLACES; g.player.place(P.plaza.x + 6, P.plaza.z + 10, Math.PI * 0.8); const f = g.follow; f.snap(g.player); f.pitch = 0.05; f.targetDist = f.curDist = 4; f.idle = 99; });
await page.waitForTimeout(2500);
await page.screenshot({ path: out + '-a.png', timeout: 120000 });
await page.evaluate(() => { const f = window.__game.follow; f.yaw += 1.6; });
await page.waitForTimeout(2500);
await page.screenshot({ path: out + '-b.png', timeout: 120000 });
await browser.close();
