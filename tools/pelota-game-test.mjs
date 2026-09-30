// Prueba del minijuego de pelota dentro del juego: peloteo en Salazar y partido en un pueblo.
// Uso: node tools/pelota-game-test.mjs [url base] ; ONLY=salazar|pueblo
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, base = 'http://127.0.0.1:5173/'] = process.argv;
const out = 'entrega/pelota/juego'; mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
async function open(town, w = 960, h = 540) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('error ' + m.text().slice(0, 200)); });
  await p.goto(base + '?town=' + town, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
  return p;
}
// avanza el partido N segundos de juego sin esperar a los fotogramas
const sim = (p, secs) => p.evaluate((s) => { const m = window.__game.pelotaMatch; if (!m) return 'sin partido'; m.game.autoplay = true; for (let i = 0; i < s * 30 && m.active; i++) m.update(1 / 30); const g = m.game; return JSON.stringify({ phase: g.phase, score: g.score, streak: g.streak, best: g.best }); }, secs);
const only = process.env.ONLY;
if (!only || only === 'salazar') {
  const p = await open('otsagabia-ochagavia');
  await p.evaluate(() => { const G = window.__game; const q = G.q('pelota'); q.state = 'active'; q.step = 1; G.startPelota(); });
  await p.waitForSelector('.pel-panel', { timeout: 60000 }); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/salazar-intro.png` });
  await p.click('.pel-go[data-go]'); await p.waitForTimeout(1500);
  console.log('salazar 1', await sim(p, 3)); await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/salazar-peloteo.png` });
  console.log('salazar 2', await sim(p, 120)); await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/salazar-final.png` });
  const cont = await p.$('.pel-go[data-cont]'); if (cont) { await cont.click(); await p.waitForTimeout(3000); }
  console.log('salazar vuelta', await p.evaluate(() => ({ mode: window.__game.mode, q: window.__game.q('pelota').state, frozen: window.__game.player.frozen })));
  await p.screenshot({ path: `${out}/salazar-despues.png` });
  await p.close();
}
if (!only || only === 'pueblo') {
  const p = await open('lesaka');
  await p.evaluate(() => { const G = window.__game; const M = G.missions.find(m => m.type === 'pelota'); G.target(M); window.__res = null; G.fronton.play(G, M.host).then(r => window.__res = r); });
  await p.waitForSelector('.pel-panel', { timeout: 60000 }); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/pueblo-intro.png` });
  console.log('panel', await p.evaluate(() => { const b = document.querySelector('.pel-go[data-go]'); const r = b.getBoundingClientRect(); const cs = getComputedStyle(b); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return JSON.stringify({ r, vis: cs.visibility, disp: cs.display, op: cs.opacity, top: top && (top.className || top.id || top.tagName) }); }));
  await p.click('.pel-go[data-go]'); await p.waitForTimeout(1500);
  console.log('pueblo 1', await sim(p, 6)); await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/pueblo-partido.png` });
  console.log('pueblo 2', await sim(p, 400)); await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/pueblo-final.png` });
  const cont = await p.$('.pel-go[data-cont]'); if (cont) { await cont.click(); await p.waitForTimeout(3000); }
  console.log('pueblo resultado', await p.evaluate(() => JSON.stringify({ res: window.__res, mode: window.__game.mode })));
  await p.screenshot({ path: `${out}/pueblo-despues.png` });
  await p.close();
}
console.log([...new Set(errs)].slice(0, 15).join('\n'));
await browser.close();
