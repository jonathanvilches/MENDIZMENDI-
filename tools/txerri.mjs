// Lekunberri: euskal txerri, pottokas, jugar con Haritz e ir con o sin perro.
// Uso: node tools/txerri.mjs <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = 'entrega/txerri'] = process.argv, town = 'lekunberri';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await p.addInitScript(() => { try { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, avatar: 'haritz' })); } catch (e) { } });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=mid`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
let k = 0; const shot = async (n) => { await p.waitForTimeout(900); await p.screenshot({ path: `${out}/${String(k++).padStart(2, '0')}-${n}.png`, timeout: 180000 }); console.log('foto', n); };
const info = await p.evaluate(() => { const G = window.__game, A = G.fauna.animals; const c = {}; A.forEach(a => c[a.kind] = (c[a.kind] || 0) + 1); return { animales: c, misiones: G.missions?.map?.(m => m.type) , perro: !!G.perro.dog }; });
console.log(JSON.stringify(info));
await p.evaluate(() => { document.querySelectorAll('.mg-overlay').forEach(o => o.remove()); const G = window.__game; G.ui.busy = false; G.mode = 'play'; });
await shot('haritz');
// cerdos y pottokas de cerca
const view = async (kind, n) => {
  await p.evaluate((kind) => { const G = window.__game, T = window.__THREE; const L = G.fauna.animals.filter(a => a.kind === kind); const a = L[0]; if (!a) return;
    L.slice(0, 3).forEach((b, i) => { b.pos.set(a.pos.x + (i - 1) * 2.4, b.pos.y, a.pos.z + (i % 2) * 1.2); b.state = 'idle'; b.timer = 999; b.speed = 0; b.heading = 0.6 + i * 0.5; b.range = 0.1; b.home = { x: b.pos.x, z: b.pos.z }; b.fleeDist = 0; });
    G.player.pos.set(a.pos.x + 8, a.pos.y, a.pos.z + 8);
    const pos = new T.Vector3(a.pos.x + 4.5, a.pos.y + 2.2, a.pos.z + 5.5), lk = new T.Vector3(a.pos.x, a.pos.y + 0.5, a.pos.z + 0.4); G.follow.cinematic = { pos, look: lk, t: 0, lookCur: lk.clone() }; G.camera.position.copy(pos); G.camera.lookAt(lk); }, kind);
  await p.waitForTimeout(3000); await shot(n);
};
await view('pig', 'txerri'); if (!process.env.SOLO) await view('pottoka', 'pottoka');
await p.evaluate(() => { window.__game.follow.cinematic = null; });
// mochila: ir sin perro / llamar al perro
await p.evaluate(() => window.__game.mochila?.open?.() ?? window.__game.bag?.open?.());
await p.waitForTimeout(1500); await shot('mochila-con-perro');
await p.evaluate(() => document.querySelector('[data-a="dogoff"]')?.click());
await p.waitForTimeout(1500);
console.log('sin perro', await p.evaluate(() => ({ dog: !!window.__game.perro.dog, on: window.__game.P.dogOn })));
await shot('mochila-sin-perro');
await p.evaluate(() => document.querySelector('[data-a="dogon"]')?.click());
await p.waitForTimeout(1500);
console.log('con perro', await p.evaluate(() => ({ dog: !!window.__game.perro.dog, on: window.__game.P.dogOn })));
await p.evaluate(() => document.querySelector('[data-a="close"]')?.click()); await p.waitForTimeout(800);
if (!process.env.SOLO) { await p.evaluate(() => window.__game.perro.choose()); await p.waitForTimeout(1500); await shot('elegir-perro'); }
await browser.close();
