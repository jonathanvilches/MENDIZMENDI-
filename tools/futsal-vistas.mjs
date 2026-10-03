// Fútbol sala en 3D (página de pruebas): presentación, pista desde arriba, partido con la cámara de televisión en
// escritorio y en móvil apaisado, saque de banda con el pie y saque del portero. Uso: node tools/futsal-vistas.mjs <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = '/tmp/futsal'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
for (const [name, w, h, touch] of [['escritorio', 1100, 620, false], ['movil', 844, 390, true]]) {
  const page = await b.newPage({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch });
  page.on('pageerror', e => errs.push(name + ': ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(name + ': ' + m.text()); });
  await page.goto('http://127.0.0.1:5173/lab/futbol-demo.html?go=match&notuto&campo=pista&quality=mid' + (name === 'escritorio' ? '&auto' : ''), { timeout: 300000 });
  await page.waitForFunction(() => window.__futbol?.live, null, { timeout: 300000 });
  if (name === 'escritorio') {
    for (const t of [1.5, 4.5, 7]) { await page.waitForFunction((t) => { const m = window.__futbol; return m.introLen - m.intro >= t || m.intro <= 0; }, t, { timeout: 300000 }); await page.screenshot({ path: `${out}/${name}-intro-${t}.png` }); }
  } else await page.mouse.click(400, 200);
  await page.waitForFunction(() => window.__futbol.intro <= 0 && window.__futbol.game.phase !== 'intro', null, { timeout: 300000 });
  await page.waitForTimeout(2500); await page.screenshot({ path: `${out}/${name}-saque.png` });
  if (name === 'escritorio') {
    // juego automático un rato más rápido y fotos
    await page.evaluate(() => { window.__futbol.o.timeScale = 2; });
    await page.waitForTimeout(9000); await page.screenshot({ path: `${out}/${name}-juego.png` });
    // saque de banda y saque del portero
    await page.evaluate(() => { const g = window.__futbol.game; g.setPiece('throwin', 1, 4, g.constructor && 10); });
    await page.waitForTimeout(1200); await page.screenshot({ path: `${out}/${name}-banda.png` });
    await page.evaluate(() => { const g = window.__futbol.game; g.setPiece('goalkick', 1, 18.6, 0); });
    await page.waitForTimeout(900); await page.screenshot({ path: `${out}/${name}-portero.png` });
    const info = await page.evaluate(() => { const g = window.__futbol.game; return { n: g.players.length, refs: g.refs.length, score: g.score, fouls: g.fouls, clock: g.clock.toFixed(1), phase: g.phase }; });
    console.log(name, JSON.stringify(info));
    await page.evaluate(() => { const m = window.__futbol; m.cam = () => {}; const c = m.camera; c.fov = 40; c.position.set(0, 46, 0.01); c.lookAt(0, 0, 0); c.updateProjectionMatrix(); });
    await page.waitForTimeout(1200); await page.screenshot({ path: `${out}/${name}-cenital.png` });
  }
  await page.close();
}
console.log('errores', JSON.stringify(errs.slice(0, 6)));
await b.close();
