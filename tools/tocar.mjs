// Fachadas envejecidas y cosas para tocar: acariciar animales, la campana de la iglesia y un banco.
// Uso: node tools/tocar.mjs <pueblo> <carpeta> [prefijo]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lumbier', out = 'entrega/tocar', tag = 'v1'] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); } catch (e) { } });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=high`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
await p.evaluate(() => { const G = window.__game; if (G.P?.settings) G.P.settings.timeSpeed = 0; G.applySettings?.(); });
let k = 0; const shot = async (n) => { await p.waitForTimeout(900); await p.screenshot({ path: `${out}/${town}-${tag}-${String(k++).padStart(2, '0')}-${n}.png`, timeout: 180000 }); console.log('foto', n); };
const look = (o) => p.evaluate((o) => { const G = window.__game, T = window.__THREE, gh = window.__hf.groundHeight; G.player.place(o.px ?? o.x, o.pz ?? o.z, 0); const pos = new T.Vector3(o.x + o.ox, gh(o.x, o.z) + o.oy, o.z + o.oz), lk = new T.Vector3(o.x, gh(o.x, o.z) + (o.ly || 1), o.z); G.follow.cinematic = { pos, look: lk, t: 0, lookCur: lk.clone() }; G.camera.position.copy(pos); G.camera.lookAt(lk); }, o);
// fachadas: una casa cerca de la plaza, desde la calle
const plaza = await p.evaluate(() => window.__layout.PLACES.plaza);
await look({ x: plaza.x, z: plaza.z, ox: 14, oy: 3.2, oz: 14, ly: 4 }); await p.waitForTimeout(3000); await shot('fachadas');
await look({ x: plaza.x + 20, z: plaza.z, ox: -6, oy: 1.8, oz: 6, ly: 1.5 }); await p.waitForTimeout(3000); await shot('pie-de-muro');
await p.evaluate(() => { window.__game.follow.cinematic = null; });
// acariciar una vaca u oveja del pastor
const ok = await p.evaluate(() => { const G = window.__game, a = G.fauna.animals.find(a => ['cow', 'sheep'].includes(a.kind) && !a.herd); if (!a) return false; G.player.place(a.pos.x + 1.6, a.pos.z + 1.6, 0); G.interact({ kind: 'pet', a }); return a.kind; });
console.log('animal', ok); await p.waitForTimeout(1500); await shot('acariciar');
await p.evaluate(() => document.querySelector('.mg-overlay:not(.out) button')?.click());
// campana
await p.evaluate(() => { const G = window.__game, it = G.interactables().find(i => i.kind === 'bell'); if (it) { G.player.place(it.x, it.z + 1, 0); G.interact(it); } });
await p.waitForTimeout(2500); await shot('campana');
await p.evaluate(() => document.querySelector('.mg-overlay:not(.out) button')?.click());
await browser.close();
