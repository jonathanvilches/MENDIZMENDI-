// Misión del dolmen: excavar (tres hallazgos), ordenar cómo se levantaba y antes/ahora; capturas.
// Uso: node tools/dolmen.mjs <pueblo> <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'artajona', out = 'entrega/dolmen'] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); } catch (e) { } });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=mid`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
let k = 0; const shot = async (n) => { await p.waitForTimeout(900); await p.screenshot({ path: `${out}/${town}-${String(k++).padStart(2, '0')}-${n}.png`, timeout: 180000 }); console.log('foto', n); };
const cards = async (tag) => { for (let i = 0; i < 8; i++) { await p.waitForTimeout(900); const kind = await p.evaluate(() => document.querySelector('.mg-overlay:not(.out) .opt[data-i]') && document.querySelector('.mg-overlay.seq:not(.choice)') ? 'order' : document.querySelector('.mg-overlay:not(.out) button') ? 'card' : ''); if (!kind) return; if (tag) await shot(tag + i); if (kind === 'order') { const n = await p.evaluate(() => document.querySelectorAll('.opt').length); for (let j = 0; j < n; j++) await p.evaluate((j) => document.querySelector(`.opt[data-i="${j}"]`).click(), j); await p.waitForTimeout(1500); } else await p.evaluate(() => document.querySelector('.mg-overlay:not(.out) button').click()); } };
await p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.type === 'dolmen'); G.say = async () => {}; G.dialog(M, M.host); });
await cards('quees');
const D = await p.evaluate(() => { const d = window.__game.missions.find(M => M.type === 'dolmen'), it = window.__game.items.filter(i => i.M === d); return it.map(i => ({ x: i.x, z: i.z })); });
console.log('hallazgos', D.length);
await p.evaluate(() => { const G = window.__game, T = window.__THREE, gh = window.__hf.groundHeight, it = G.items.find(i => i.find != null), x = it.x, z = it.z; G.player.place(x + 2, z + 2, 0); const pos = new T.Vector3(x + 8, gh(x, z) + 4.5, z + 8), lk = new T.Vector3(x - 4, gh(x, z) + 1.2, z - 4); G.follow.cinematic = { pos, look: lk, t: 0, lookCur: lk.clone() }; G.camera.position.copy(pos); G.camera.lookAt(lk); });
await p.waitForTimeout(3500); await shot('dolmen');
await p.evaluate(() => { window.__game.follow.cinematic = null; });
for (let i = 0; i < 3; i++) { await p.evaluate(() => { const G = window.__game, it = G.items.find(i => i.find != null); if (it) G.pick(it); }); await cards(i === 0 ? 'hallazgo' : ''); }
await p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.type === 'dolmen'); G.dialog(M, M.host); });
await cards('final');
console.log('hecha', await p.evaluate(() => window.__game.missions.find(M => M.type === 'dolmen').done));
await browser.close();
