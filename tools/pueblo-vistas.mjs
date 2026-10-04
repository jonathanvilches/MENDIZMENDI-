// Capturas de un pueblo cualquiera para revisar texturas y arquitectura: plaza, casas de cerca, iglesia,
// monte con rocas y vista general. Uso: node tools/pueblo-vistas.mjs <pueblo> <carpeta> <prefijo> [planos]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lesaka', out = 'entrega/pueblo', tag = 'v1', only = ''] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
await p.addInitScript(() => { try { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); } catch (e) { } });
const t0 = Date.now();
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=high&weather=clear&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
console.log('cargado en', ((Date.now() - t0) / 1000).toFixed(0), 's');
await p.addStyleTag({ content: '#hud, #controls, #compass, #toast, #prompt, .whisper { display: none !important; }' });
await p.evaluate(() => { const G = window.__game; G.updateInteraction = () => {}; });
const pl = await p.evaluate(async () => { const L = await import('/src/world/layout.js'); return JSON.parse(JSON.stringify({ plaza: L.PLACES.plaza, church: L.PLACES.church })); });
const cine = (o) => p.evaluate((o) => {
  const G = window.__game, hf = window.__hf, THREE = window.__THREE, gh = (x, z) => hf.groundHeight(x, z);
  const pos = new THREE.Vector3(o.x, gh(o.x, o.z) + o.y, o.z), look = new THREE.Vector3(o.lx, gh(o.lx, o.lz) + o.ly, o.lz);
  G.player.place(o.x + 0.5, o.z + 0.5, 0);
  G.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; G.camera.position.copy(pos); G.camera.lookAt(look);
  if (G.rt?.sky) { G.rt.sky.time = 11; G.rt.sky.speed = 0; }
}, o);
const P = pl.plaza, C = pl.church;
const V = {
  plaza: { x: P.x + 22, y: 9, z: P.z + 22, lx: P.x, ly: 2, lz: P.z },
  casas: { x: P.x + 6, y: 2.2, z: P.z + 4, lx: P.x - 14, ly: 4, lz: P.z - 10 },
  casas2: { x: P.x - 6, y: 2.2, z: P.z + 6, lx: P.x + 14, ly: 4, lz: P.z - 6 },
  iglesia: { x: C.x + 10, y: 3, z: C.z + 26, lx: C.x, ly: 8, lz: C.z },
  roseton: { x: C.x + 2, y: 12, z: C.z + 22, lx: C.x, ly: 12, lz: C.z },
  torre: { x: C.x + 16, y: 14, z: C.z + 24, lx: C.x + 9, ly: 16, lz: C.z - 4 },
  torreE: { x: C.x + 34, y: 14, z: C.z - 12, lx: C.x + 4, ly: 18, lz: C.z - 12 },
  fuente: { x: P.x + 5, y: 2.4, z: P.z + 5, lx: P.x, ly: 1, lz: P.z },
  monte: { x: P.x, y: 30, z: P.z + 60, lx: P.x, ly: 10, lz: P.z - 140 },
  alto: { x: P.x + 90, y: 90, z: P.z + 90, lx: P.x, ly: 0, lz: P.z },
};
for (const [k, o] of Object.entries(V)) {
  if (only && !only.split(',').includes(k)) continue;
  await cine(o); await p.waitForTimeout(3000); await p.screenshot({ path: `${out}/${tag}-${k}.png`, timeout: 180000 }); console.log('ok', k);
}
console.log(errs.join('\n') || 'sin errores');
await browser.close();
