// Prueba de la versión del zip (Otsagabia, three.js r128 por CDN, servido aquí desde npm) con la pelota.
// Uso: node tools/zip-pelota-test.mjs <url de la carpeta servida> <carpeta de three r128>
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync } from 'fs';
const [,, base = 'http://127.0.0.1:5191/', r128 = '/tmp/r128/package'] = process.argv;
const out = 'entrega/pelota/zip'; mkdirSync(out, { recursive: true });
const CDN = {
  'three.min.js': `${r128}/build/three.min.js`,
  'GLTFLoader.js': `${r128}/examples/js/loaders/GLTFLoader.js`,
  'SkeletonUtils.js': `${r128}/examples/js/utils/SkeletonUtils.js`,
};
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
for (const [tag, w, h, touch] of [['escritorio', 1280, 720, false], ['movil', 390, 844, true]]) {
  if (process.env.ONLY && process.env.ONLY !== tag) continue;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch });
  await ctx.route(/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/, (route) => {
    const f = Object.keys(CDN).find(k => route.request().url().endsWith(k));
    if (f) route.fulfill({ status: 200, contentType: 'application/javascript', body: readFileSync(CDN[f]) }); else route.abort();
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(tag + ' PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(tag + ' ' + m.type() + ' ' + m.text().slice(0, 160)); });
  await p.goto(base + (process.env.FILE || ''), { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'home', null, { timeout: 300000 });
  console.log(tag, 'three', await p.evaluate(() => THREE.REVISION), 'glb', await p.evaluate(() => window.__game.glb), 'Pelota', await p.evaluate(() => !!window.Pelota));
  await p.click('#heroPlay'); await p.waitForTimeout(2000);
  // al frontón: coloca al jugador en la entrada y abre el partido
  await p.evaluate(() => { const G = window.__game; G.P.x = G.FRONTON.entry.x; G.P.z = G.FRONTON.entry.z; });
  await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${tag}-entrada.png` });
  await p.evaluate(() => window.__game.startPelota());
  await p.waitForSelector('.pel-panel', { timeout: 60000 }); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/${tag}-intro.png` });
  await p.evaluate(() => document.querySelector('.pel-go[data-pel-go]').click()); await p.waitForTimeout(1500);
  const sim = (s) => p.evaluate((s) => { const m = window.__game.pelota; if (!m) return 'sin partido'; m.game.autoplay = true; for (let i = 0; i < s * 30 && m.active; i++) m.update(1 / 30); const g = m.game; return JSON.stringify({ phase: g.phase, score: g.score }); }, s);
  console.log(tag, 'partido', await sim(5)); await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${tag}-partido.png` });
  await p.evaluate(() => { const m = window.__game.pelota; m.game.autoplay = false; m.paused = true; m.lastSwing.you = m.t - 0.2; m.lastSwing.rival = m.t - 0.2; m.draw(0.0001); });
  await p.waitForTimeout(2000); await p.screenshot({ path: `${out}/${tag}-golpe.png` });
  await p.evaluate(() => { const m = window.__game.pelota; m.paused = false; });
  console.log(tag, 'partido', await sim(1200)); await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${tag}-final.png` });
  await p.evaluate(() => document.querySelector('.pel-go[data-pel-cont]')?.click()); await p.waitForTimeout(3000);
  console.log(tag, 'vuelta', await p.evaluate(() => JSON.stringify({ mode: window.__game.mode, pel: window.__game.S.pelota, cards: window.__game.S.cards })));
  await p.screenshot({ path: `${out}/${tag}-despues.png` });
  await ctx.close();
}
console.log([...new Set(errs)].slice(0, 20).join('\n'));
await browser.close();
