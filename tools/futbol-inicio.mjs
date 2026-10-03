// El arranque de un partido: fotos de la intro y vista cenital del campo al empezar (cuántos jugadores, porteros, líneas)
// Uso: node tools/futbol-inicio.mjs <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = '/tmp/futbol-inicio'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await b.newPage({ viewport: { width: 1100, height: 620 } });
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('http://127.0.0.1:5173/lab/futbol-demo.html?go=match&notuto&quality=mid', { timeout: 300000 });
await page.waitForFunction(() => window.__futbol, null, { timeout: 300000 });
await page.waitForFunction(() => window.__futbol?.live, null, { timeout: 300000 });
// en SwiftShader va lento: se fotografía según el reloj de la presentación, no el de la pared
for (const t of [1.5, 4, 5.2, 6.5, 8]) { await page.waitForFunction((t) => { const m = window.__futbol; return m.introLen - m.intro >= t || m.intro <= 0; }, t, { timeout: 300000 }); await page.screenshot({ path: `${out}/intro-${t}.png` }); }
await page.waitForFunction(() => window.__futbol.game.phase === 'play' || window.__futbol.game.phase === 'kickoff', null, { timeout: 300000 });
const info = await page.evaluate(() => {
  const m = window.__futbol, g = m.game || m.g;
  const ps = (g?.players || []).map(p => ({ t: p.team, role: p.role, x: +p.x.toFixed(1), z: +p.z.toFixed(1), vis: p.obj ? p.obj.visible : undefined }));
  return { phase: g.phase, mode: g.mode, n: ps.length, keepers: ps.filter(p => /POR|GK|keeper/i.test(p.role)).length, sample: ps.slice(0, 24), keys: Object.keys(m).slice(0, 40) };
});
console.log(JSON.stringify(info));
await page.evaluate(() => { const m = window.__futbol; m.cam = () => {}; const c = m.camera; c.fov = 50; c.position.set(0, 120, 0.01); c.lookAt(0, 0, 0); c.updateProjectionMatrix(); });
await page.waitForTimeout(1500); await page.screenshot({ path: `${out}/cenital.png` });
console.log('errores', JSON.stringify(errs));
await b.close();
