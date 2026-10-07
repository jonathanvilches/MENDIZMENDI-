// Entrar andando en el castillo de un pueblo: alturas del suelo por el eje de la puerta, paseo hacia dentro y foto.
// Uso: node tools/castillo-entrar.mjs <pueblo> <foto.jpg>
import { chromium } from 'playwright-core';
const [,, town = 'javier', out = 'castillo-entrar.jpg'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1100, height: 620 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.addInitScript(() => { try { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); } catch (e) { } });
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=mid`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
await p.waitForTimeout(6000);
const lmInfo = () => { const P = window.__layout.PLACES, lm = P.landmarks.find(l => l.kind === 'castle'), ry = Math.atan2(P.plaza.x - lm.x, P.plaza.z - lm.z); return { lm, ry, dx: Math.sin(ry), dz: Math.cos(ry) }; };
console.log(await p.evaluate((f) => { const { lm, dx, dz } = eval(f)(), gh = window.__hf.groundHeight, th = window.__hf.terrainHeight, y0 = th(lm.x, lm.z), out = [];
  for (let d = 26; d >= -4; d -= 2) out.push(d + ':' + (gh(lm.x + dx * d, lm.z + dz * d) - y0).toFixed(2)); return 'suelo ' + out.join(' '); }, lmInfo.toString()));
await p.evaluate((f) => { const { lm, ry, dx, dz } = eval(f)(), G = window.__game; document.querySelectorAll('.mg-overlay').forEach(o => o.remove()); G.player.place(lm.x + dx * 20, lm.z + dz * 20, ry + Math.PI); G.input.enabled = true; G.ui.busy = false; }, lmInfo.toString());
// el personaje camina hacia el castillo con su propio movimiento (choques y suelo incluidos), a 20 pasos por segundo
console.log(await p.evaluate((f) => { const { lm, ry, dx, dz } = eval(f)(), G = window.__game, P = G.player, th = window.__hf.terrainHeight, y0 = th(lm.x, lm.z);
  const inp = { move: { x: 0, y: 1 }, run: false, jump: false, pressed: new Set(), keys: new Set(), consume: () => false, update() {} };
  const at = () => { const q = P.pos; const rx = q.x - lm.x, rz = q.z - lm.z; return { d: rx * dx + rz * dz, s: rx * dz - rz * dx, y: q.y - y0 }; };
  // dirección de la cámara que lleva hacia el castillo
  let best = 0, bd = 1e9; for (let k = 0; k < 16; k++) { const yaw = k / 16 * Math.PI * 2; P.place(lm.x + dx * 20, lm.z + dz * 20, ry + Math.PI); for (let t = 0; t < 10; t++) P.update(0.05, inp, yaw); const d = at().d; if (d < bd) { bd = d; best = yaw; } }
  P.place(lm.x + dx * 20, lm.z + dz * 20, ry + Math.PI); const log = [];
  for (let t = 0; t < 400; t++) { P.update(0.05, inp, best); if (t % 20 === 0) { const a = at(); log.push(`d=${a.d.toFixed(1)} lado=${a.s.toFixed(1)} y=${a.y.toFixed(2)}`); } }
  G.follow.yaw = best; return log.join('\n'); }, lmInfo.toString()));
await p.waitForTimeout(1500);
await p.screenshot({ path: out, quality: 70 });
await b.close();
