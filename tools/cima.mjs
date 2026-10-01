// Recorre una subida al monte: animales en el ascenso, mojones, cima, rapaz y panorámica de Navarra.
// Uso: node tools/cima.mjs <pueblo> <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'tafalla', out = 'entrega/cimas'] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
let k = 0;
const shot = async (n) => { await p.screenshot({ path: `${out}/${town}-${String(k++).padStart(2, '0')}-${n}.png`, timeout: 180000 }); console.log('foto', n); };
const card = () => p.evaluate(() => !!document.querySelector('.mg-overlay:not(.out) button'));
const next = () => p.evaluate(() => document.querySelector('.mg-overlay:not(.out) button')?.click());
await p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.type === 'summit'); G.say = async () => {}; G.dialog(M, M.host); });
await p.waitForTimeout(1500);
const W = await p.evaluate(() => window.__game.missions.find(M => M.type === 'summit').wild.length);
for (let i = 0; i < W; i++) {
  await p.evaluate((i) => { const G = window.__game, M = G.missions.find(M => M.type === 'summit'), a = M.wild[i].a; a.fleeDist = 0; G.player.place(a.pos.x + 6, a.pos.z + 6, 0); }, i);
  for (let j = 0; j < 20 && !(await card()); j++) await p.waitForTimeout(500);
  await p.waitForTimeout(600); if (i === 0) await shot('animal'); await next(); await p.waitForTimeout(800);
  if (i === 0) { await p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.type === 'summit'), a = M.wild[0].a, T = window.__THREE; G.follow.cinematic = { pos: new T.Vector3(a.pos.x + 4, a.pos.y + 1.6, a.pos.z + 4), look: a.pos.clone().setY(a.pos.y + 0.6), t: 0 }; }); await p.waitForTimeout(2500); await shot('animal-3d'); await p.evaluate(() => { window.__game.follow.cinematic = null; }); }
}
console.log('descubiertos', await p.evaluate(() => window.__game.missions.find(M => M.type === 'summit').wild.map(w => w.id + ':' + w.found).join(' ')));
const n = await p.evaluate(() => window.__game.missions.find(M => M.type === 'summit').cairns.length);
for (let i = 0; i < n; i++) { await p.evaluate((i) => { const G = window.__game, c = G.missions.find(M => M.type === 'summit').cairns[i]; G.player.place(c.x + 1, c.z + 1, 0); }, i); await p.waitForTimeout(1200); }
let fotos = 0;
for (let j = 0; j < 60; j++) {
  await p.waitForTimeout(700);
  if (await card()) { await p.waitForTimeout(900); await shot('cima-card'); await next(); continue; }
  const wh = await p.evaluate(() => [...document.querySelectorAll('#whisper')].map(e => e.textContent).join(' '));
  if (/Al (norte|sur|este|oeste|noreste|noroeste|sureste|suroeste)/.test(wh) && fotos < 2 && !(await card())) { fotos++; await shot('mirar'); }
  if (await p.evaluate(() => window.__game.missions.find(M => M.type === 'summit').done)) break;
}
console.log('cima hecha', await p.evaluate(() => window.__game.missions.find(M => M.type === 'summit').done));
await browser.close();
