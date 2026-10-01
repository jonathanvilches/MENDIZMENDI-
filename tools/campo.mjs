// El campo: maquinaria por las parcelas, pastor con su rebaño y ganadera; capturas y una ficha antes/ahora.
// Uso: node tools/campo.mjs <pueblo> <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'artajona', out = 'entrega/campo'] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=mid`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
await p.addStyleTag({ content: '#hud, #controls, #compass, #toast, #prompt { display: none !important; }' });
const shot = async (n) => { await p.screenshot({ path: `${out}/${town}-${n}.png`, timeout: 180000 }); console.log('foto', n); };
console.log(await p.evaluate(() => window.__game.agro.list.map(o => o.kind + (o.move ? '*' : '')).join(' ')));
const look = (o) => p.evaluate((o) => { const G = window.__game, T = window.__THREE, gh = window.__hf.groundHeight; const pos = new T.Vector3(o.x + o.ox, gh(o.x, o.z) + o.oy, o.z + o.oz), lk = new T.Vector3(o.x, gh(o.x, o.z) + 1.2, o.z); G.player.place(o.x + o.ox * 0.6, o.z + o.oz * 0.6, 0); G.follow.cinematic = { pos, look: lk, t: 0, lookCur: lk.clone() }; G.camera.position.copy(pos); G.camera.lookAt(lk); }, o);
const L = await p.evaluate(() => window.__game.agro.list.map(o => ({ x: o.x, z: o.z, kind: o.kind })));
const seen = new Set();
for (const o of L) { if (seen.has(o.kind)) continue; seen.add(o.kind); await look({ ...o, ox: 9, oy: 4, oz: 9 }); await p.waitForTimeout(3500); await shot('maquina-' + o.kind); }
const ps = await p.evaluate(() => { const a = window.__game.walkers.find(w => w.info && w.name === 'Pastor'); return a && { x: a.pos.x, z: a.pos.z }; });
if (ps) { await p.waitForTimeout(6000); const q = await p.evaluate(() => { const a = window.__game.walkers.find(w => w.info && w.name === 'Pastor'); return { x: a.pos.x, z: a.pos.z }; }); await look({ ...q, ox: 10, oy: 4, oz: 6 }); await p.waitForTimeout(4000); await shot('pastor'); }
const v = await p.evaluate(() => { const a = window.__game.walkers.find(w => w.info && w.name === 'Ganadera'); return a && { x: a.pos.x, z: a.pos.z }; });
if (v) { await look({ ...v, ox: -8, oy: 4, oz: 8 }); await p.waitForTimeout(3500); await shot('ganadera'); }
await p.evaluate(() => { const G = window.__game; G.follow.cinematic = null; G.showAgro(G.agro.list[0]); });
await p.waitForTimeout(1500); await shot('ficha');
await browser.close();
