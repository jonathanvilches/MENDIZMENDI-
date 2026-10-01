// Capturas de los packs CC0 de referencia (Quaternius y KayKit) colocados dentro de un pueblo, junto a los modelos
// actuales del juego. Solo pruebas: los packs viven en lab/ref (no se suben ni entran en el juego).
// Uso: node tools/packs.mjs [pueblo] [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lumbier', out = 'entrega/packs'] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=high`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
await p.evaluate(() => { const G = window.__game, P = window.__layout.PLACES; G.player.place(P.plaza.x, P.plaza.z, 0); G.follow.snap(G.player); if (G.P?.settings) G.P.settings.timeSpeed = 0; });
await p.addScriptTag({ type: 'module', url: '/lab/ref/packPreview.js' });
await p.waitForFunction(() => window.__packs, null, { timeout: 60000 });
console.log(await p.evaluate(() => window.__packs));
const cam = async (n, o) => {
  await p.evaluate((o) => { const G = window.__game, T = window.__THREE, P = G.player.pos, h = G.player.heading, gh = window.__hf.groundHeight;
    const at = (f, r, y) => { const x = P.x + Math.sin(h) * f + Math.cos(h) * r, z = P.z + Math.cos(h) * f - Math.sin(h) * r; return new T.Vector3(x, gh(x, z) + y, z); };
    const pos = at(o.f, o.r, o.y), lk = at(o.lf, o.lr, o.ly); G.follow.cinematic = { pos, look: lk, t: 0, lookCur: lk.clone() }; G.camera.position.copy(pos); G.camera.lookAt(lk); }, o);
  await p.waitForTimeout(3500); await p.screenshot({ path: `${out}/${n}.png`, timeout: 180000 }); console.log('foto', n);
};
await cam('personajes', { f: 9, r: 0, y: 1.8, lf: 4, lr: 0, ly: 1.0 });
await cam('animales', { f: -3, r: 2, y: 4.5, lf: 11, lr: 0, ly: 0.8 });
await cam('animales-cerca', { f: 5, r: -5, y: 2.2, lf: 10, lr: -2, ly: 0.9 });
await browser.close();
