// De noche, junto a una farola: node tools/_farola-shot.mjs <salida.png> [pueblo]
import { chromium } from 'playwright-core';
const [,, out, town = 'lesaka'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
const logs = []; page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
await page.addInitScript(() => { try { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'leire', xp: 0, towns: {}, cards: [], species: [], peaks: [], badges: [], seen: { dog: true }, dogBreed: 'aleman', dogOn: true, settings: { music: false, volume: 0.8, quality: 'low', timeSpeed: 1 } })); } catch (e) { } });
await page.goto('http://127.0.0.1:5173/?town=' + town + '&noflora');
await page.waitForFunction(() => window.__game && window.__game.mode === 'play' && window.__game.perro?.dog?.glbA, null, { timeout: 180000 }).catch(() => logs.push('no game'));
await page.waitForTimeout(1500);
const r = await page.evaluate(() => {
  const g = window.__game, rt = g.rt, L = rt.lights.lamps; rt.sky.time = 23; rt.sky.speed = 0;
  const P = g.player.pos, l = L.slice().sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z))[0];
  g.player.place(l.x + 1.3, l.z + 0.6, 0.4); g.follow.snap(g.player); g.follow.yaw = 2.6; g.perro.dog.pos.set(l.x + 2.4, 0, l.z - 0.6);
  document.querySelectorAll('.toast,.whisper').forEach(e => e.remove());
  return { lamps: L.length, lamp: l };
});
await page.waitForTimeout(2500);
const k = await page.evaluate(() => ({ lampK: window.__game.rt.lights.lampK, fill: window.__game.rt.charFill.toArray().map(v => +v.toFixed(3)) }));
console.log(JSON.stringify({ ...r, ...k }));
await page.screenshot({ path: out });
console.log(logs.join('\n'));
await browser.close();
