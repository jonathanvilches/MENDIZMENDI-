// Fútbol sala en el navegador: abre la página de prueba (lab/futbol-demo.html), juega con la IA por el jugador y saca
// capturas en escritorio, móvil horizontal y móvil vertical. Comprueba que no hay errores en la consola.
// Uso: node tools/futbol.mjs [personajes: meshy|simple] [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, chars = 'meshy', out = '/tmp/claude-0/futbol'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const views = [['escritorio', 1280, 720, false], ['movil-horizontal', 844, 390, true], ['movil-vertical', 390, 844, true]];
for (const [name, w, h, touch] of views) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(`http://127.0.0.1:5173/lab/futbol-demo.html?go=match&chars=${chars}&notuto&auto&quality=${touch ? 'low' : 'high'}`, { timeout: 300000 });
  await p.waitForFunction(() => window.__futbol && window.__futbol.game && window.__futbol.hud, null, { timeout: 600000 });
  // avanza el partido a mano (el navegador de pruebas dibuja muy despacio)
  const adv = (s) => p.evaluate((s) => { const m = window.__futbol; for (let i = 0; i < s * 30; i++) m.update(1 / 30); return { phase: m.game.phase, score: m.game.score.join('-'), clock: m.game.clock.toFixed(1) }; }, s);
  let st = await adv(4); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/${name}-1.png` });
  st = await adv(12); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/${name}-2.png` });
  // cámara detrás del jugador
  await p.evaluate(() => { window.__futbol.camMode = 'detras'; }); st = await adv(3); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/${name}-3.png` });
  const info = await p.evaluate(() => { const r = window.__futbolRenderer?.info?.render; return { calls: r?.calls, tris: r?.triangles }; });
  console.log(name, JSON.stringify(st), JSON.stringify(info), errs.length ? 'ERRORES ' + errs.slice(0, 4).join(' | ') : 'sin errores');
  await ctx.close();
}
await b.close();
