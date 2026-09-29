// Uso: node tools/views.mjs <url> <prefix> '<json [[nombre, px,py,pz, lx,ly,lz], ...]>' — fotos con cámara fija (y relativa al suelo)
import { chromium } from 'playwright-core';
const [,, url, prefix, viewsJson, w = 1280, h = 720, pre = 30000] = process.argv;
const views = JSON.parse(viewsJson);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const logs = [];
page.on('console', m => { const t = m.text(); if (!/toNonIndexed|vite|Canvas2D|CERT|404|AudioContext|NaN/.test(t)) logs.push(m.type() + ': ' + t); });
page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message + '\n' + e.stack));
await page.goto(url);
await page.waitForFunction(() => window.__ready && window.__rt && window.__rt.active, null, { timeout: 200000 }).catch(() => logs.push('timeout active'));
await page.waitForTimeout(+pre);
for (const [name, px, py, pz, lx, ly, lz] of views) {
  await page.evaluate(([px, py, pz, lx, ly, lz]) => {
    const T = __THREE, g = (x, z) => __hf.terrainHeight(x, z);
    __game.player.place(lx, lz, 0);
    const c = __rt.follow.cinematic = { pos: new T.Vector3(px, g(px, pz) + py, pz), look: new T.Vector3(lx, g(lx, lz) + ly, lz), t: 0 }; c.lookCur = c.look.clone(); __rt.camera.position.copy(c.pos);
    document.getElementById('hud') && (document.getElementById('hud').style.display = 'none');
  }, [px, py, pz, lx, ly, lz]);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${prefix}-${name}.png` });
}
console.log(logs.slice(0, 40).join('\n'));
await browser.close();
