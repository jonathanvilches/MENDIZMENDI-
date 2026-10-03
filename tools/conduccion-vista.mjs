// Capturas de la conducción en un partido (el balón pegado al pie): andando, trotando, esprintando y girando.
// Uso: node tools/conduccion-vista.mjs <carpeta> [venue]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = '/tmp/conduccion', venue = 'sadar'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await b.newPage({ viewport: { width: 1100, height: 620 } });
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto(`http://127.0.0.1:5173/lab/futbol-demo.html?go=match&notuto&quality=mid&venue=${venue}`, { timeout: 300000 });
await page.waitForFunction(() => window.__futbol?.game, null, { timeout: 300000 }).catch(() => errs.push('sin partido'));
await page.waitForTimeout(6000);
await page.evaluate(() => { const m = window.__futbol; m.skipIntro?.(); window.__mv = [0, 0, 0, false]; m.moveInput = () => m.game.setMove(...window.__mv); });
await page.waitForTimeout(1500);
const plan = [['andando', 0.35, false, 1, 0], ['trotando', 1, false, 1, 0], ['esprintando', 1, true, 1, 0], ['girando', 1, false, 0, 1]];
for (const [n, mag, sprint, dx, dz] of plan) {
  const d = await page.evaluate(([mag, sprint, dx, dz]) => {
    const m = window.__futbol, g = m.game, me = g.me;
    g.restart = null; g.setPhase('play'); g.owner = null;
    me.x = -10; me.z = -6; me.vx = me.vz = 0; me.h = Math.PI / 2; g.ball.set(me.x + 0.45, me.z); g.takeBall(me);
    for (const p of g.players) if (p !== me && Math.hypot(p.x - me.x, p.z - me.z) < 12) { p.x += 14; }
    window.__mv = [1, 0, mag, sprint];
    return new Promise(res => setTimeout(() => { window.__mv = [dx, dz, mag, sprint]; setTimeout(() => { const f = { x: me.x + Math.sin(me.h) * 0.32, z: me.z + Math.cos(me.h) * 0.32 }; res({ d: Math.hypot(g.ball.p.x - f.x, g.ball.p.z - f.z).toFixed(2), sp: Math.hypot(me.vx, me.vz).toFixed(1), own: g.owner === me }); }, dz ? 450 : 50); }, 1400));
  }, [mag, sprint, dx, dz]);
  await page.evaluate(() => { const m = window.__futbol, me = m.game.me, c = m.camera; m.cam = () => {}; c.fov = 30; c.position.set(me.x - 3.5, 3.2, me.z + 6.5); c.lookAt(me.x + 0.6, 0.5, me.z); c.updateProjectionMatrix(); });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${out}/${n}.png` });
  await page.evaluate(() => { delete window.__futbol.cam; });
  console.log(n, JSON.stringify(d));
}
console.log('errores', JSON.stringify(errs));
await b.close();
