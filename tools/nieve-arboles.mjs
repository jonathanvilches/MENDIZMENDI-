// Copas de los árboles con nieve: foto de los árboles más cercanos a la plaza en un pueblo nevado.
// Uso: node tools/nieve-arboles.mjs [pueblo] [carpeta]   (URL=http://127.0.0.1:5173 por defecto)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lesaka', out = 'entrega/nieve'] = process.argv; mkdirSync(out, { recursive: true });
const URL = process.env.URL || 'http://127.0.0.1:5173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1100, height: 620 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
await p.goto(`${URL}/?town=${town}&q=high&weather=snow&t=11`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
await p.waitForTimeout(2000);
const info = await p.evaluate(() => {
  const G = window.__game, rt = window.__rt, T = window.__THREE, gh = window.__hf.groundHeight, P = window.__layout.PLACES.plaza;
  if (G.P?.settings) G.P.settings.timeSpeed = 0;
  for (let i = 0; i < 25; i++) rt.weather?.update(1, rt.camera, rt.sky, null);
  // el árbol más cercano a la plaza
  let best = null, bd = 1e9;
  rt.nature.group.traverse(o => { if (!o.isInstancedMesh || !/cerca/.test(o.name) || /cultivos/.test(o.name)) return; const m = new T.Matrix4(), v = new T.Vector3(); for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); v.setFromMatrixPosition(m); const d = Math.hypot(v.x - P.x, v.z - P.z); if (d < bd) { bd = d; best = v.clone(); } } });
  const t = best || new T.Vector3(P.x, gh(P.x, P.z), P.z);
  const pos = new T.Vector3(t.x + 8, t.y + 15, t.z + 8), look = new T.Vector3(t.x, t.y + 3, t.z);
  G.player.place(t.x + 4, t.z + 4, 0); G.follow.snap(G.player);
  G.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; G.camera.position.copy(pos); G.camera.lookAt(look);
  return { tree: best && [best.x.toFixed(1), best.z.toFixed(1)], dist: bd.toFixed(1), snow: window.__rt.weather?.kind };
});
await p.waitForTimeout(3500);
await p.screenshot({ path: `${out}/${town}-arboles.png`, timeout: 180000 });
// la misma copa vista como se juega: cámara detrás del personaje, mirando al árbol
await p.evaluate(() => { const G = window.__game, T = window.__THREE; const c = G.follow.cinematic; G.follow.cinematic = null; const t = c.look; G.player.place(t.x + 7, t.z + 7, Math.atan2(t.x - (t.x + 7), t.z - (t.z + 7))); G.follow.snap(G.player); });
await p.waitForTimeout(2500);
await p.screenshot({ path: `${out}/${town}-arboles-juego.png`, timeout: 180000 });
console.log(town, JSON.stringify(info));
await b.close();
