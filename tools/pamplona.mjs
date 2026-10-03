// Capturas de Pamplona: plaza del Castillo, kiosco, Café Iruña, Ayuntamiento, Estafeta, catedral y claustro,
// murallas y Portal de Francia, Redín, plaza de toros, Ciudadela y El Sadar.
// Uso: node tools/pamplona.mjs <carpeta> <prefijo> [lista de planos separada por comas]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = 'entrega/pamplona', tag = 'v1', only = ''] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text().slice(0, 200)); });
const t0 = Date.now();
await p.goto('http://127.0.0.1:5173/?town=pamplona&quality=high', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
console.log('cargado en', ((Date.now() - t0) / 1000).toFixed(0), 's');
await p.addStyleTag({ content: '#hud, #controls, #compass, #toast, #prompt, .whisper { display: none !important; }' });
await p.evaluate(() => { const G = window.__game; G.updateInteraction = () => {}; if (G.P?.settings) G.P.settings.timeSpeed = 0; G.applySettings?.(); });
console.log(await p.evaluate(() => { const r = window.__renderer; return JSON.stringify({ tris: r?.info?.render?.triangles, calls: r?.info?.render?.calls }); }));
const shot = (n) => p.screenshot({ path: `${out}/${tag}-${n}.png`, timeout: 180000 });
const cine = (o) => p.evaluate((o) => {
  const G = window.__game, hf = window.__hf, THREE = window.__THREE;
  const gh = (x, z) => hf.groundHeight(x, z);
  const pos = new THREE.Vector3(o.x, (o.abs ? 0 : gh(o.x, o.z)) + o.y, o.z), look = new THREE.Vector3(o.lx, (o.abs ? 0 : gh(o.lx, o.lz)) + o.ly, o.lz);
  G.player.place(o.px ?? o.x + 0.5, o.pz ?? o.z + 0.5, 0);
  G.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; G.camera.position.copy(pos); G.camera.lookAt(look);
  if (G.rt?.sky) { G.rt.sky.time = o.night ? 22.5 : 12; G.rt.sky.speed = 0; }
}, o);
const V = {
  plaza: { x: 40, y: 26, z: 108, lx: 40, ly: 2, lz: 0 },
  kiosco: { x: 52, y: 5, z: 44, lx: 40, ly: 4, lz: 20 },
  iruna: { x: 50, y: 4, z: 30, lx: 76, ly: 6, lz: 30 },
  ayto: { x: -8, y: 5, z: -84, lx: -14, ly: 10, lz: -110 },
  estafeta: { x: 40, y: 3, z: -101, lx: 110, ly: 5, lz: -106 },
  catedral: { x: 50, y: 5, z: -198, lx: 100, ly: 15, lz: -190 },
  torosCalle: { x: 192, y: 3, z: -14, lx: 232, ly: 9, lz: -56 },
  catedralLejos: { x: 30, y: 30, z: -140, lx: 100, ly: 15, lz: -195 },
  fachada: { x: 60, y: 3.5, z: 44, lx: 76, ly: 7, lz: 50 },
  catedralCerca: { x: 64, y: 3, z: -184, lx: 88, ly: 12, lz: -190 },
  sadarGrada: { x: 215, y: 2, z: 300, lx: 262, ly: 8, lz: 330 },
  labrit: { x: 200, y: 26, z: 90, lx: 232, ly: 0, lz: 30 },
  claustro: { x: 96, y: 26, z: -134, lx: 106, ly: 2, lz: -162 },
  portal: { x: 52, y: 5, z: -300, lx: 40, ly: 5, lz: -256 },
  redin: { x: 280, y: 10, z: -320, lx: 214, ly: 8, lz: -260 },
  toros: { x: 170, y: 24, z: -110, lx: 232, ly: 4, lz: -56 },
  torosDentro: { x: 232, y: 30, z: -20, lx: 232, ly: 0, lz: -62 },
  ciudadela: { x: 40, y: 70, z: 170, lx: -60, ly: 0, lz: 250 },
  sadar: { x: 120, y: 50, z: 300, lx: 232, ly: 4, lz: 318 },
  sadarDentro: { x: 208, y: 3, z: 318, lx: 260, ly: 7, lz: 318 },
  sadarEsquina: { x: 150, y: 3, z: 400, lx: 232, ly: 9, lz: 318 },
  sadarOeste: { x: 140, y: 2.5, z: 330, lx: 232, ly: 9, lz: 318 },
  sadarNoche: { x: 150, y: 3, z: 400, lx: 232, ly: 9, lz: 318, night: true },
  sadarAvenida: { x: 296, y: 2.2, z: 250, lx: 290, ly: 4, lz: 330 },
  sadarParking: { x: 200, y: 6, z: 222, lx: 240, ly: 2, lz: 250 },
  ciudad: { x: 40, y: 240, z: 330, lx: 40, ly: 0, lz: -60 },
};
for (const [k, o] of Object.entries(V)) {
  if (only && !only.split(',').includes(k)) continue;
  await cine(o); await p.waitForTimeout(3500); await shot(k); console.log('ok', k);
}
console.log([...new Set(errs)].slice(0, 25).join('\n'));
await browser.close();
