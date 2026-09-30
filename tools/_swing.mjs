import { chromium } from 'playwright-core';
import { readFileSync } from 'fs';
const r128 = process.argv[2];
const CDN = { 'three.min.js': `${r128}/build/three.min.js`, 'GLTFLoader.js': `${r128}/examples/js/loaders/GLTFLoader.js`, 'SkeletonUtils.js': `${r128}/examples/js/utils/SkeletonUtils.js` };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } });
await ctx.route(/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/, (route) => { const f = Object.keys(CDN).find(k => route.request().url().endsWith(k)); if (f) route.fulfill({ status: 200, contentType: 'application/javascript', body: readFileSync(CDN[f]) }); else route.abort(); });
await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
const p = await ctx.newPage();
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto('http://127.0.0.1:5191/', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'home', null, { timeout: 300000 });
await p.click('#heroPlay'); await p.waitForTimeout(1500);
await p.evaluate(() => window.__game.startPelota());
await p.waitForSelector('.pel-panel'); await p.evaluate(() => document.querySelector('.pel-go[data-pel-go]').click());
for (const [name, sw, won] of [['reposo', -1, false], ['golpe', 0.5, false], ['celebra', -1, true]]) {
  await p.evaluate(([sw, won]) => {
    const m = window.__game.pelota; m.paused = true;
    const orig = m.__origDraw || (m.__origDraw = m.draw.bind(m));
    m.draw = (dt) => {
      const g = m.game, Y = g.players.you;
      if (sw >= 0) m.lastSwing.you = m.t - sw * 0.4; else m.lastSwing.you = -9;
      if (won) { g.phase = 'point'; Y.act = 'cheer'; } else if (g.phase === 'point') { g.phase = 'serveWait'; Y.act = 'idle'; }
      orig(dt);
      const P = window.__game.player, cam = m.cam;
      const f = { x: Math.sin(P.rotation.y), z: Math.cos(P.rotation.y) };
      cam.position.set(P.position.x + f.x * 3.2 + f.z * 1.2, P.position.y + 1.4, P.position.z + f.z * 3.2 - f.x * 1.2); cam.lookAt(P.position.x, P.position.y + 1.0, P.position.z);
    };
  }, [sw, won]);
  await p.waitForTimeout(2500); await p.screenshot({ path: `entrega/pelota/zip/pose-${name}.png` });
}
await browser.close();
