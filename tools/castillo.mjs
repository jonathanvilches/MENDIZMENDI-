// Misiones de castillo (partes con banderas) o de excavación (Irulegi): vista general, recorrido y final; capturas.
// Uso: node tools/castillo.mjs <pueblo> <castle|dolmen> <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'javier', type = 'castle', out = 'entrega/castillos'] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); } catch (e) { } });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=mid`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
let k = 0; const shot = async (n) => { await p.waitForTimeout(900); await p.screenshot({ path: `${out}/${town}-${String(k++).padStart(2, '0')}-${n}.png`, timeout: 180000 }); console.log('foto', n); };
const cards = async (tag) => { for (let i = 0; i < 10; i++) { await p.waitForTimeout(900); const kind = await p.evaluate(() => document.querySelector('.mg-overlay.seq:not(.choice):not(.out)') ? 'order' : document.querySelector('.mg-overlay.choice:not(.out)') ? 'choice' : document.querySelector('.mg-overlay:not(.out) button') ? 'card' : ''); if (!kind) return; if (tag) await shot(tag + i);
  if (kind === 'order') { const n = await p.evaluate(() => document.querySelectorAll('.opt').length); for (let j = 0; j < n; j++) await p.evaluate((j) => document.querySelector(`.opt[data-i="${j}"]`).click(), j); await p.waitForTimeout(1500); }
  else if (kind === 'choice') { await p.evaluate(() => { for (const b of document.querySelectorAll('.opt')) b.click(); }); await p.waitForTimeout(1200); await p.evaluate(() => document.querySelector('.mg-overlay:not(.out) .next')?.click()); }
  else await p.evaluate(() => document.querySelector('.mg-overlay:not(.out) button').click()); } };
// vista general del monumento
await p.evaluate((type) => { const G = window.__game, T = window.__THREE, gh = window.__hf.groundHeight; document.querySelectorAll('.mg-overlay').forEach(o => o.remove()); G.ui.busy = false; G.mode = 'play';
  const lm = window.__game.constructor && G.scene && (window.__TOWN_LM = null);
  const M = G.missions.find(M => M.type === type), t = G.target ? null : null; const c = G.missionSpot ? G.missionSpot(M) : null;
}, type);
const L = await p.evaluate((type) => { const G = window.__game; const M = G.missions.find(M => M.type === type); const lms = window.__LANDMARKS; return { host: { x: M.host.pos.x, z: M.host.pos.z } }; }, type);
await p.evaluate((type) => { const G = window.__game, M = G.missions.find(M => M.type === type); G.say = async () => {}; G.dialog(M, M.host); }, type);
await cards('intro');
const items = await p.evaluate((type) => { const G = window.__game, M = G.missions.find(M => M.type === type); return G.items.filter(i => i.M === M).map(i => ({ x: i.x, z: i.z })); }, type);
console.log('puntos', items.length, JSON.stringify(items));
// vista general: centro de los puntos, desde arriba y en diagonal
await p.evaluate((items) => { const G = window.__game, T = window.__THREE, gh = window.__hf.groundHeight; const cx = items.reduce((a, b) => a + b.x, 0) / items.length, cz = items.reduce((a, b) => a + b.z, 0) / items.length; const y = gh(cx, cz);
  G.player.place(cx + 30, cz + 30, 0); const pos = new T.Vector3(cx + 34, y + 22, cz + 34), lk = new T.Vector3(cx, y + 6, cz); G.follow.cinematic = { pos, look: lk, t: 0, lookCur: lk.clone() }; G.camera.position.copy(pos); G.camera.lookAt(lk); }, items);
await p.waitForTimeout(4000); await shot('vista');
await p.evaluate((items) => { const G = window.__game, T = window.__THREE, gh = window.__hf.groundHeight; const cx = items.reduce((a, b) => a + b.x, 0) / items.length, cz = items.reduce((a, b) => a + b.z, 0) / items.length; const y = gh(cx, cz);
  const pos = new T.Vector3(cx - 30, y + 8, cz + 22), lk = new T.Vector3(cx, y + 8, cz); G.follow.cinematic = { pos, look: lk, t: 0, lookCur: lk.clone() }; G.camera.position.copy(pos); G.camera.lookAt(lk); }, items);
await p.waitForTimeout(3500); await shot('lado');
await p.evaluate(() => { window.__game.follow.cinematic = null; });
for (let i = 0; i < items.length; i++) { await p.evaluate((type) => { const G = window.__game, M = G.missions.find(M => M.type === type), it = G.items.find(i => i.M === M); if (it) { G.player.place(it.x + 1.5, it.z + 1.5, 0); G.pick(it); } }, type); await cards(i === items.length - 1 ? 'parte' : ''); }
await p.evaluate((type) => { const G = window.__game, M = G.missions.find(M => M.type === type); G.dialog(M, M.host); }, type);
await cards('final');
console.log('hecha', await p.evaluate((type) => window.__game.missions.find(M => M.type === type).done, type), 'errores', await p.evaluate(() => JSON.stringify(window.__errors || [])));
await browser.close();
