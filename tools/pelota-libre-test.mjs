// Pelota libre dentro del juego: frontón y pelotari en un pueblo sin misión de pelota, y Salazar sin la misión de Kike.
// El jugador es el protagonista (Beñat, GLB de Blender). Capturas en entrega/pelota/juego.
// Uso: node tools/pelota-libre-test.mjs [url base] ; ONLY=pueblo|salazar|movil
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
// avanza el partido sin esperar a los fotogramas (el jugador en automático)
const sim = (p, secs) => p.evaluate((s) => { const m = window.__game.pelotaMatch; if (!m) return 'sin partido'; m.game.autoplay = true; for (let i = 0; i < s * 30 && m.active; i++) m.update(1 / 30); const g = m.game; return JSON.stringify({ phase: g.phase, score: g.score }); }, secs);
// deja el partido justo después de un golpe del jugador, para ver el clip Hit
const toHit = (p) => p.evaluate(() => { const m = window.__game.pelotaMatch; m.game.autoplay = true; for (let i = 0; i < 900 && m.active; i++) { const ev = m.update(1 / 30) || []; const r = window.__game.pelotaRig?.char; if (r && r.currentName === 'Hit') { for (let k = 0; k < 3; k++) m.update(1 / 30); return 'golpe'; } } return 'sin golpe'; });
const walkTo = (p, where) => p.evaluate((w) => { const G = window.__game, f = G.fronton; const e = f.entry; const x = w === 'entrada' ? e.x : G.pelotari.pos.x + 1.2, z = w === 'entrada' ? e.z + 0.5 : G.pelotari.pos.z + 1.2; G.player.place(x, z, 0); G.follow.snap(G.player); });
const only = process.env.ONLY;

if (!only || only === 'pueblo') {
  const p = await open('ituren');
  const info = await p.evaluate(() => { const G = window.__game; return { fronton: !!G.fronton, pelotari: G.pelotari?.name, avatar: G.player.rig.constructor.name, misionPelota: G.missions.some(m => m.type === 'pelota'), marcas: G.mapMarkers().filter(m => m.icon === 'pelota').length }; });
  console.log('pueblo', JSON.stringify(info));
  await walkTo(p, 'pelotari'); await p.waitForTimeout(3000);
  console.log('aviso', await p.evaluate(() => document.querySelector('[data-prompt], .prompt, .hud-prompt')?.textContent || window.__game.interactables().filter(i => Math.hypot(i.x - window.__game.player.pos.x, i.z - window.__game.player.pos.z) < i.r).map(i => i.label).join(' | ')));
  await p.screenshot({ path: `${out}/libre-pelotari.png`, timeout: 180000 });
  await p.evaluate(() => { const G = window.__game; window.__res = null; G.fronton.play(G, G.pelotari).then(r => window.__res = r); });
  await p.waitForSelector('.pel-panel', { timeout: 60000 }); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/libre-intro.png`, timeout: 180000 });
  await p.evaluate(() => document.querySelector('.pel-go[data-pel-go]').click()); await p.waitForTimeout(1500);
  console.log('espera', await sim(p, 2)); await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/libre-espera.png`, timeout: 180000 });
  console.log('golpe', await toHit(p)); await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/libre-golpe.png`, timeout: 180000 });
  console.log('clip', await p.evaluate(() => window.__game.pelotaRig?.char?.currentName));
  console.log('final', await sim(p, 400)); await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/libre-final.png`, timeout: 180000 });
  const cont = await p.$('.pel-go[data-pel-cont]'); if (cont) { await cont.evaluate(b => b.click()); await p.waitForTimeout(3000); }
  console.log('vuelta', await p.evaluate(() => JSON.stringify({ res: window.__res, mode: window.__game.mode, clip: window.__game.player.rig.char?.currentName, stance: window.__game.player.rig.char?.idleName })));
  await p.screenshot({ path: `${out}/libre-despues.png`, timeout: 180000 });
  await p.close();
}
if (!only || only === 'salazar') {
  const p = await open('otsagabia-ochagavia');
  console.log('salazar', await p.evaluate(() => { const G = window.__game; const f = G.interactables().find(i => i.kind === 'fronton'); const q = G.q('pelota'); return JSON.stringify({ frontonLibre: !!f, mision: q.state, paso: q.step }); }));
  await p.evaluate(() => window.__game.startPelota());
  await p.waitForSelector('.pel-panel', { timeout: 60000 }); await p.evaluate(() => document.querySelector('.pel-go[data-pel-go]').click()); await p.waitForTimeout(1500);
  console.log('salazar golpe', await toHit(p)); await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/salazar-libre.png`, timeout: 180000 });
  await p.close();
}
if (!only || only === 'movil') {
  const p = await open('ituren', 390, 844);
  await p.evaluate(() => { const G = window.__game; G.fronton.play(G, G.pelotari); });
  await p.waitForSelector('.pel-panel', { timeout: 60000 }); await p.evaluate(() => document.querySelector('.pel-go[data-pel-go]').click()); await p.waitForTimeout(1500);
  console.log('movil golpe', await toHit(p)); await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/libre-movil.png`, timeout: 180000 });
  await p.close();
}
console.log([...new Set(errs)].slice(0, 15).join('\n'));
await browser.close();
