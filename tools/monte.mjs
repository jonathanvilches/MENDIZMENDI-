// Subida completa: abastecerse (puesto y fuente), señales del monte en los mojones y el perro guía.
// Uso: node tools/monte.mjs <pueblo> <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lumbier', out = 'entrega/monte'] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
let k = 0; const shot = async (n) => { await p.waitForTimeout(900); await p.screenshot({ path: `${out}/${town}-${String(k++).padStart(2, '0')}-${n}.png`, timeout: 180000 }); console.log('foto', n); };
const cards = async (tag) => { for (let i = 0; i < 8; i++) { await p.waitForTimeout(900); const kind = await p.evaluate(() => document.querySelector('.mg-overlay:not(.out) .opts') ? 'choice' : document.querySelector('.mg-overlay:not(.out):not(.bagpanel) button') ? 'card' : ''); if (!kind) return; if (tag && i === 0) await shot(tag); if (kind === 'choice') { await p.evaluate(() => document.querySelector('.opt').click()); await p.waitForTimeout(600); if (tag) await shot(tag + '-resp'); await p.evaluate(() => [...document.querySelectorAll('.opt')].find(b => !b.classList.contains('wrong'))?.click()); await p.waitForTimeout(400); await p.evaluate(() => document.querySelector('.choice .next')?.click()); } else await p.evaluate(() => document.querySelector('.mg-overlay:not(.out):not(.bagpanel) button').click()); } };
await cards();   // presentación de Txuri
await p.evaluate(() => { const G = window.__game; G.P.bag = { agua: 0, food: {} }; G.say = async () => {}; const M = G.missions.find(M => M.type === 'summit'); G.dialog(M, M.host); });
await p.waitForTimeout(1500);
console.log('prep', await p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.type === 'summit'); return M.prep + ' · ' + G.stepText(M); }));
// el puesto
await p.evaluate(() => { const G = window.__game, S = G.stall, T = window.__THREE, gh = window.__hf.groundHeight; G.player.place(S.x + 3, S.z + 3, 0); const pos = new T.Vector3(S.x + 4.5, gh(S.x, S.z) + 2.6, S.z + 4.5), lk = new T.Vector3(S.x, gh(S.x, S.z) + 1, S.z); G.follow.cinematic = { pos, look: lk, t: 0, lookCur: lk.clone() }; G.camera.position.copy(pos); G.camera.lookAt(lk); });
await p.waitForTimeout(2500); await shot('puesto');
await p.evaluate(() => { const G = window.__game; G.follow.cinematic = null; G.buyStall(); });
await cards('producto');
await p.evaluate(() => { window.__game.interact({ kind: 'fountain', x: 0, z: 0 }); }); await cards();
await p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.type === 'summit'); G.dialog(M, M.host); });
await p.waitForTimeout(1500);
console.log('subiendo', await p.evaluate(() => window.__game.missions.find(M => M.type === 'summit').step));
// señales: vista de la piedra con la X y paso por los mojones
await p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.type === 'summit'), o = M.signs[2] || M.signs[0], T = window.__THREE, ry = o.rotation.y; const pos = new T.Vector3(o.position.x + Math.sin(ry) * 2.6, o.position.y + 1.3, o.position.z + Math.cos(ry) * 2.6), lk = o.position.clone().setY(o.position.y + 0.4); G.player.place(o.position.x + 3, o.position.z + 3, 0); G.follow.cinematic = { pos, look: lk, t: 0, lookCur: lk.clone() }; G.camera.position.copy(pos); G.camera.lookAt(lk); });
await p.waitForTimeout(2500); await shot('senal-x');
await p.evaluate(() => { window.__game.follow.cinematic = null; });
for (let i = 0; i < 3; i++) { await p.evaluate((i) => { const G = window.__game, c = G.missions.find(M => M.type === 'summit').cairns[i]; G.player.place(c.x + 1, c.z + 1, 0); }, i); await p.waitForTimeout(1500); await cards('mojon' + (i + 1)); }
// el perro guía hacia el siguiente mojón
await p.evaluate(() => { const G = window.__game, c = G.missions.find(M => M.type === 'summit').cairns[0]; G.player.place(c.x, c.z, 0); G.perro.help(); });
await p.waitForTimeout(2500); await shot('perro-guia');
await browser.close();
