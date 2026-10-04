// Capturas fijas del paisaje y del avatar para comparar antes/después:
// hierba de cerca, montañas, roca, bosque, y el protagonista (cara, andar, giro).
// Uso: node tools/paisaje.mjs <carpeta> <prefijo> [pueblo] ; ONLY=paisaje|avatar
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = 'entrega/paisaje', tag = 'antes', town = 'isaba-izaba'] = process.argv;
mkdirSync(out, { recursive: true });
const only = process.env.ONLY;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
if (process.env.AVATAR) await p.addInitScript((a) => { try { const K = 'mendimendiz-perfil-v1', P = JSON.parse(localStorage.getItem(K) || '{"v":1}'); P.avatar = a; P.seen = Object.assign(P.seen || {}, { heroBenat: true, dog: true }); localStorage.setItem(K, JSON.stringify(P)); } catch (e) { } }, process.env.AVATAR);
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=high&weather=clear`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
// sin HUD, a media mañana, cámara libre para los planos de paisaje
await p.addStyleTag({ content: '#hud, #controls, #compass, #toast, #prompt, .whisper { display: none !important; }' });
await p.evaluate(() => { const G = window.__game; G.updateInteraction = () => {}; if (G.P?.settings) G.P.settings.timeSpeed = 0; G.applySettings?.(); });
const shot = (n) => p.screenshot({ path: `${out}/${tag}-${n}.png`, timeout: 180000 });
// coloca la cámara en modo cine: desde (x,y,z) mirando a (lx,ly,lz) alturas sobre el suelo
const cine = (o) => p.evaluate((o) => {
  const G = window.__game, hf = window.__hf, THREE = window.__THREE;
  const gh = (x, z) => hf.groundHeight(x, z);
  const pos = new THREE.Vector3(o.x, gh(o.x, o.z) + o.y, o.z), look = new THREE.Vector3(o.lx, gh(o.lx, o.lz) + o.ly, o.lz);
  if (o.player) { G.player.place(o.player[0], o.player[1], o.player[2] ?? 0); }
  else G.player.place(o.x + 0.5, o.z + 0.5, 0);
  G.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; G.camera.position.copy(pos); G.camera.lookAt(look);
}, o);
const free = () => p.evaluate(() => { window.__game.follow.cinematic = null; });
// busca sitios: una ladera con roca, un prado y el borde de un bosque
const spots = await p.evaluate(() => {
  const hf = window.__hf, L = window.__layout, P = L.PLACES;
  const N = L.N, C = L.CELL, HALF = L.HALF;
  let rock = null, rv = 0, forest = null, fv = 0, meadow = null, mv = -1;
  const S = hf.SURF;
  for (let j = 20; j < N - 20; j += 3) for (let i = 20; i < N - 20; i += 3) {
    const k = j * N + i, x = -HALF + i * C, z = -HALF + j * C;
    const d = Math.hypot(x - P.plaza.x, z - P.plaza.z);
    if (d > 380) continue;
    let clean = S.dirt[k] < 10 && S.street[k] < 10;
    for (let dj = -4; dj <= 4 && clean; dj += 2) for (let di = -4; di <= 4; di += 2) if (S.dirt[k + dj * N + di] > 10) { clean = false; break; }
    const r = S.rock[k] / 255 - d / 2000, f = S.forest[k] / 255 - d / 1500;
    if (clean && r > rv) { rv = r; rock = { x, z }; }
    if (f > fv && S.forest[k] > 200) { fv = f; forest = { x, z }; }
    const m = (S.grass[k] / 255) - d / 400 - S.forest[k] / 255 - S.rock[k] / 255;
    if (clean && d > 110 && m > mv) { mv = m; meadow = { x, z }; }
  }
  return { plaza: P.plaza, fields: meadow || P.fields || P.plaza, rock, forest };
});
console.log(JSON.stringify(spots));

if (!only || only === 'paisaje' || only === 'hierba') {
  const F = spots.fields;
  // 1) hierba de cerca, a ras de suelo
  await cine({ x: F.x, y: 1.3, z: F.z, lx: F.x + 7, ly: 0.2, lz: F.z + 3, player: [F.x + 4, F.z + 1.8, 1.2] }); await p.waitForTimeout(3000); await shot('1-hierba');
  // 1b) la hierba como la ve quien juega: cámara detrás del avatar
  await cine({ x: F.x - 4, y: 2.6, z: F.z - 3, lx: F.x + 6, ly: 0.6, lz: F.z + 4, player: [F.x + 0.5, F.z + 0.5, 0.9] }); await p.waitForTimeout(3000); await shot('1b-hierba-juego');
  if (only === 'hierba') { await browser.close(); process.exit(0); }
  // 2) prado y montañas: vista amplia desde el pueblo
  const P0 = spots.plaza;
  await cine({ x: P0.x, y: 14, z: P0.z + 30, lx: P0.x, ly: 80, lz: P0.z - 300 }); await p.waitForTimeout(3500); await shot('2-montanas');
  // 3) roca de cerca
  if (spots.rock) { const R = spots.rock; await cine({ x: R.x + 14, y: 6, z: R.z + 14, lx: R.x, ly: 0, lz: R.z }); await p.waitForTimeout(3000); await shot('3-roca'); }
  // 4) borde del bosque
  if (spots.forest) { const T = spots.forest; await cine({ x: T.x + 22, y: 4, z: T.z + 22, lx: T.x, ly: 5, lz: T.z }); await p.waitForTimeout(3500); await shot('4-bosque'); }
  await free();
}
if (!only || only === 'avatar') {
  const F = spots.fields;
  await free();
  const camAt = (dx, dy, dz, ly) => p.evaluate(([dx, dy, dz, ly]) => { const G = window.__game, THREE = window.__THREE, pl = G.player.pos, h = G.player.heading;
    const c = Math.cos(h), s = Math.sin(h);
    // dx a la derecha del personaje, dz delante de él
    const pos = new THREE.Vector3(pl.x + c * dx + s * dz, pl.y + dy, pl.z - s * dx + c * dz), look = new THREE.Vector3(pl.x, pl.y + ly, pl.z);
    G.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; G.camera.position.copy(pos); G.camera.lookAt(look); }, [dx, dy, dz, ly]);
  await p.evaluate((F) => { const G = window.__game; G.player.place(F.x, F.z, 0.6); }, F);
  await camAt(0, 1.3, 1.25, 1.28); await p.waitForTimeout(2500); await shot('5-cara');
  await camAt(0.9, 1.35, 1.0, 1.25); await p.waitForTimeout(1500); await shot('5b-cara-34');
  await camAt(2.2, 1.0, 2.2, 0.8); await p.waitForTimeout(1500); await shot('6-cuerpo');
  // andando: cámara lateral que acompaña, varios fotogramas seguidos
  await free();
  await p.evaluate(() => { const G = window.__game; G.follow.snap(G.player); G.input.keys.add('w'); });
  await p.waitForTimeout(1500);
  for (let k = 0; k < 4; k++) { await camAt(3.2, 1.0, 0.4, 0.8); await p.waitForTimeout(250); await shot('8-andar-' + k); }
  // giro brusco a la derecha mientras anda
  await free();
  await p.evaluate(() => { const G = window.__game; G.follow.snap(G.player); G.input.keys.add('d'); G.input.keys.delete('w'); });
  for (let k = 0; k < 3; k++) { await p.waitForTimeout(220); await shot('7-giro-' + k); }
  await p.evaluate(() => { const G = window.__game; G.input.keys.delete('d'); G.input.keys.add('w'); G.input.runToggle = true; });
  await p.waitForTimeout(1500);
  for (let k = 0; k < 3; k++) { await camAt(3.6, 1.0, 0.6, 0.8); await p.waitForTimeout(200); await shot('9-correr-' + k); }
  await p.evaluate(() => { const G = window.__game; G.input.keys.clear(); G.input.runToggle = false; });
}
await browser.close();
