// Captura de un pase en vuelo con la cámara de televisión (que el balón se vea bien de jugador a jugador).
// Uso: node tools/pase-vista.mjs <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = '/tmp/pase'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await b.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('http://127.0.0.1:5173/lab/futbol-demo.html?go=match&notuto&quality=mid', { timeout: 300000 });
await page.waitForFunction(() => window.__futbol?.live, null, { timeout: 300000 });
await page.evaluate(() => window.__futbol.skipIntro()); await page.waitForTimeout(2500);
for (const [n, tx] of [['raso', 14], ['largo', 26]]) {
  await page.evaluate((tx) => {
    const m = window.__futbol, g = m.game, me = g.me, q = g.byRole(0, 'DCI');
    g.restart = null; g.setPhase('play'); me.x = -12; me.z = 4; q.x = me.x + tx; q.z = 10; g.ball.set(me.x + 0.45, me.z); g.takeBall(me);
    for (const p of g.players) if (p !== me && p !== q) p.x = p.team ? 40 : -45;
    window.__mv = [1, 0.3, 1, false]; m.moveInput = () => g.setMove(...window.__mv);
  }, tx);
  await page.waitForTimeout(800);
  await page.evaluate(() => { const g = window.__futbol.game; g.press('pass'); g.release('pass'); });
  await page.waitForFunction(() => { const g = window.__futbol.game; return !g.owner && g.ball.speed > 8; }, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${out}/${n}.png` });
}
console.log('errores', JSON.stringify(errs));
await b.close();
