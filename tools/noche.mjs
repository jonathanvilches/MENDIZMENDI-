// El avatar y el perro a distintas horas: node tools/_noche-shot.mjs <prefijo> <hora,hora,...> [pueblo] [avatar]
import { chromium } from 'playwright-core';
const [,, out, hours = '12,20,23', town = 'lesaka', avatar = ''] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
const logs = []; page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
await page.addInitScript((avatar) => { try { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: avatar || 'leire', xp: 0, towns: {}, cards: [], species: [], peaks: [], badges: [], seen: { dog: true }, dogBreed: 'mastin', dogOn: true, settings: { music: false, volume: 0.8, quality: 'low', timeSpeed: 1 } })); } catch (e) { } }, avatar);
await page.goto('http://127.0.0.1:5173/?town=' + town + '&noflora');
await page.waitForFunction(() => window.__game && window.__game.mode === 'play' && window.__game.perro?.dog?.glbA, null, { timeout: 180000 }).catch(() => logs.push('no game'));
await page.waitForTimeout(2000);
for (const h of hours.split(',')) {
  await page.evaluate((h) => { const g = window.__game, rt = g.rt; rt.sky.time = +h; rt.sky.speed = 0; const P = g.player; g.follow.yaw = P.heading + 2.4; document.querySelectorAll('.toast,.whisper').forEach(e => e.remove()); }, h);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}-${h}.png` });
}
console.log(logs.join('\n'));
await browser.close();
