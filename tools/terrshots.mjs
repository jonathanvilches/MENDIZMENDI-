// Vistas del terreno: node tools/terrshots.mjs <url> <prefijo> <pueblo>
import { chromium } from 'playwright-core';
const [,, url, out, town = 'isaba-izaba', w = 1280, h = 720] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const logs = [];
page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/CERT|favicon|404/.test(m.text())) logs.push('error: ' + m.text().slice(0, 300)); });
await page.addInitScript(() => { try { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'leire', xp: 0, towns: {}, cards: [], species: [], peaks: [], badges: [], seen: {}, settings: { music: false, volume: 0.8, quality: 'high', timeSpeed: 0 } })); } catch (e) { } });
await page.goto(url + '?town=' + town + '&t=11');
await page.waitForFunction(() => window.__game && window.__game.mode, null, { timeout: 180000 }).catch(() => logs.push('no game'));
await page.waitForTimeout(3000);
await page.evaluate(() => { document.querySelector('#hud') && (document.querySelector('#hud').style.display = 'none'); });
const views = [['m1', 0.06, 0, 7], ['m2', 0.1, 2.1, 7], ['m3', 0.02, 4.2, 7], ['grass', 0.55, 1, 3.2]];
for (const [n, pitch, yaw, d] of views) {
  await page.evaluate(([pitch, yaw, d]) => { const f = window.__game.follow; f.pitch = pitch; f.yaw = yaw; f.targetDist = d; f.curDist = d; f.idle = 99; }, [pitch, yaw, d]);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}-${n}.png`, timeout: 120000 });
}
console.log(logs.join('\n'));
await browser.close();
