// Pelota en el navegador: el saque con carrerilla. Partido libre mano a mano: sacas tú (sales del 7, corres hasta poco
// antes del 4, botas y sacas) y luego saca el rival mientras esperas junto a la pared en el 7. Capturas y posiciones.
// Uso: node tools/pelota-saque-ver.mjs [pueblo] [carpeta] [es|eu] [mano|delantero|zaguero]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'pamplona', out = 'entrega/pelota-saque', lang = 'es', mod = 'mano'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript((lang) => { localStorage.setItem('mendimendiz-lang', lang); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', seen: { heroBenat: true, dog: true } })); }, lang);
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.waitForTimeout(2000);
const click = async (sel, ms = 120000) => { await p.waitForSelector(sel, { timeout: ms }); await p.evaluate((s) => document.querySelector(s).click(), sel); };
await p.evaluate(() => { const G = window.__game, a = G.pelotari; G.player.place(a.pos.x + 1.5, a.pos.z + 1.5, 0); window.__fp = G.talk(a); });
for (let i = 0; i < 12; i++) { await p.waitForTimeout(800); const d = await p.evaluate(() => window.__game.ui.dialogOpen); if (!d) break; await p.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }))); }
await click('[data-a="libre"]');
await click(`.pel-panel [data-pel-mod="${mod}"]`, 240000);
if (mod !== 'mano') await p.waitForFunction(() => window.__game.pelotaMatch?.pairs && !window.__game.pelotaMatch.loadingMates && document.querySelector('.pel-panel .pel-rv2'), null, { timeout: 240000 });
await p.waitForTimeout(600);
await click('.pel-panel [data-pel-go]');
// (el navegador sin tarjeta gráfica pinta muy despacio: la lógica se avanza a mano)
const step = (n, inp) => p.evaluate(({ n, inp }) => { const m = window.__game.pelotaMatch, g = m.game; for (let k = 0; k < n; k++) { if (inp) { const ev = g.update(1 / 30, inp); } else m.update(1 / 30); } }, { n, inp });
const snap = (tag) => p.evaluate((tag) => { const m = window.__game.pelotaMatch, g = m.game, f = (id) => `${id}:${g.players[id].x.toFixed(1)},${g.players[id].z.toFixed(1)}`;
  return { tag, fase: g.phase, carrera: !!g.runUp, saca: g.serverP(), pelotaris: g.ids.map(f).join(' '), pelota: `${g.ball.p.x.toFixed(1)},${g.ball.p.y.toFixed(1)},${g.ball.p.z.toFixed(1)}`, consejo: document.querySelector('.pel-tip')?.innerText || '' }; }, tag);
const shots = [];
// 1. sacas tú
await p.evaluate(() => { const g = window.__game.pelotaMatch.game; if (g.phase === 'intro') g.start(); g.server = 'you'; g.toServe(); });
await step(20); await p.waitForTimeout(400); shots.push(await snap('tu-saque-espera')); await p.screenshot({ path: `${out}/${lang}-${mod}-1-sacas-en-el-7.png` });
await p.evaluate(() => { window.__game.pelotaMatch.game.update(1 / 30, { hit: true }); });
for (let i = 0; i < 40; i++) { await step(3); const z = await p.evaluate(() => window.__game.pelotaMatch.game.players[window.__game.pelotaMatch.game.serverP()].z); if (z < 20) break; }
await p.waitForTimeout(300); shots.push(await snap('tu-carrera')); await p.screenshot({ path: `${out}/${lang}-${mod}-2-carrera.png` });
for (let i = 0; i < 60; i++) { await step(2); const ph = await p.evaluate(() => window.__game.pelotaMatch.game.phase); if (ph === 'servePrep') break; }
await step(6); await p.waitForTimeout(300); shots.push(await snap('tu-bote')); await p.screenshot({ path: `${out}/${lang}-${mod}-3-bote-en-el-4.png` });
// 2. saca el rival: tú, junto a la pared en el 7
await p.evaluate(() => { const g = window.__game.pelotaMatch.game; g.server = 'rival'; g.toServe(); });
await step(12); await p.waitForTimeout(400); shots.push(await snap('rival-espera')); await p.screenshot({ path: `${out}/${lang}-${mod}-4-restas-en-la-pared.png` });
for (let i = 0; i < 40; i++) { await step(3); const z = await p.evaluate(() => window.__game.pelotaMatch.game.players[window.__game.pelotaMatch.game.serverP()].z); if (z < 19) break; }
await p.waitForTimeout(300); shots.push(await snap('rival-carrera')); await p.screenshot({ path: `${out}/${lang}-${mod}-5-rival-corre.png` });
await p.evaluate(() => window.__game.pelotaAbort?.()); await p.waitForTimeout(1200);
console.log(JSON.stringify(shots, null, 1), errs.length ? errs.slice(0, 3) : 'sin errores');
await b.close();
