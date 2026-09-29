// Fotos de los monumentos de un pueblo: node tools/landmarks.mjs <base> <pueblo> <carpeta>
import { chromium } from 'playwright-core';
const [,, base, town, dir] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
await page.goto(`${base}?town=${town}`, { timeout: 240000 });
await page.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 180000 });
await page.waitForTimeout(3000);
const n = await page.evaluate(() => window.__game.mapLabels().filter(l => l.icon && !['sheep', 'wheat'].includes(l.icon)).length);
for (let i = 0; i < n; i++) {
  const name = await page.evaluate((i) => {
    const G = window.__game, l = G.mapLabels().filter(l => l.icon && !['sheep', 'wheat'].includes(l.icon))[i];
    const P = __layout.PLACES.plaza, dx = l.x - P.x, dz = l.z - P.z, d = Math.hypot(dx, dz) || 1;
    const s = G.spot({ x: l.x - dx / d * 16, z: l.z - dz / d * 16 }, 4);
    G.player.place(s.x, s.z, Math.atan2(l.x - s.x, l.z - s.z)); G.follow.snap(G.player); G.follow.yaw = Math.atan2(s.x - l.x, s.z - l.z);
    document.querySelector('#hud') && (document.querySelector('#hud').style.display = 'none');
    return l.label;
  }, i);
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${dir}/${town}-${i}.png`, timeout: 180000 });
  console.log(town, i, name);
}
await browser.close();
