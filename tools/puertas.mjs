// Puertas y fachadas de cerca: la cámara a 4 m de la puerta de las dos casas más cercanas a la plaza, a la altura de los
// ojos (para revisar puertas, ventanas, revoco y ladrillo). Uso: node tools/puertas.mjs [pueblo] [carpeta]  (URL=…)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lesaka', out = 'entrega/puertas'] = process.argv; mkdirSync(out, { recursive: true });
const URL = process.env.URL || 'http://127.0.0.1:5173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 560 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, dogOn: false })); });
await p.goto(`${URL}/?town=${town}&q=${process.env.Q || 'high'}&weather=clear&t=${process.env.T || 15}`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
await p.addStyleTag({ content: '#hud, #controls, #compass, #toast, #prompt, .whisper { display: none !important; }' });
// (sin importar los módulos desde aquí: con la recarga en caliente se crearía otra instancia vacía del registro)
const n = await p.evaluate(() => { const P = window.__layout.PLACES.plaza; const hs = ((window.__TOWN?.houses?.length ? window.__TOWN.houses : window.__VILLAGE?.houses) || []).slice().sort((a, b) => Math.hypot(a.door.x - P.x, a.door.z - P.z) - Math.hypot(b.door.x - P.x, b.door.z - P.z)); window.__doors = hs.slice(0, 3); return window.__doors.length; });
for (let i = 0; i < n; i++) {
  await p.evaluate((i) => { const G = window.__game, T = window.__THREE, gh = window.__hf.groundHeight, h = window.__doors[i];
    // la puerta mira hacia +z local (ry): se mira desde fuera, a 4,2 m
    const dx = Math.sin(h.ry), dz = Math.cos(h.ry), px = h.door.x + dx * 3, pz = h.door.z + dz * 3, y = gh(h.door.x, h.door.z);
    const pos = new T.Vector3(px + dx * 0.4, y + 1.6, pz + dz * 0.4), look = new T.Vector3(h.door.x - dx * 1.2, y + 1.7, h.door.z - dz * 1.2);
    G.player.place(px + dz * 3, pz - dx * 3, 0); G.follow.snap(G.player);
    G.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; G.camera.position.copy(pos); G.camera.lookAt(look); }, i);
  await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${town}-puerta${i}.png`, timeout: 180000 });
}
console.log(town, 'puertas', n); console.log(errs.join('\n') || 'sin errores');
await b.close();
