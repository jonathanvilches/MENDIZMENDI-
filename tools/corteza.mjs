// Corteza y helechos de cerca: foto a la altura de los ojos del tronco más cercano a la plaza (y de cada especie que
// haya cerca) y de la mata de helechos más cercana. Comprueba también que los sombreadores compilan.
// Uso: node tools/corteza.mjs [pueblo] [calidad] [carpeta]   (URL=http://127.0.0.1:5173 por defecto)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lesaka', q = 'high', out = 'entrega/corteza'] = process.argv; mkdirSync(out, { recursive: true });
const URL = process.env.URL || 'http://127.0.0.1:5173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 560 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message.slice(0, 300)));
p.on('console', m => { if (m.type() === 'error') errs.push('ERR ' + m.text().slice(0, 600)); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, dogOn: false })); });
await p.goto(`${URL}/?town=${town}&q=${q}&t=${process.env.T || 11}&weather=clear`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
await p.waitForTimeout(1500);
// lo más cercano a la plaza de cada clase: árboles (por malla, que es por especie) y helechos
const spots = await p.evaluate(() => {
  const G = window.__game, rt = window.__rt, T = window.__THREE, P = window.__layout.PLACES.plaza;
  if (G.P?.settings) G.P.settings.timeSpeed = 0;
  const best = {}, m = new T.Matrix4(), v = new T.Vector3();
  rt.nature.group.traverse(o => {
    if (!o.isInstancedMesh || /cultivos|rocas/.test(o.name)) return;
    const key = o.material.customProgramCacheKey?.() || '', kind = key.includes('windf') ? 'helecho' : key.includes('windb') ? 'arbol' : null;
    if (!kind) return;
    const id = kind === 'helecho' ? 'helecho' : 'arbol-' + o.geometry.uuid.slice(0, 4);
    for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); v.setFromMatrixPosition(m); const d = Math.hypot(v.x - P.x, v.z - P.z); if (d > 12 && (!best[id] || d < best[id].d)) best[id] = { d, x: v.x, y: v.y, z: v.z, kind }; }
  });
  return Object.entries(best).sort((a, b) => a[1].d - b[1].d).slice(0, 5);
});
let n = 0;
for (const [id, s] of spots) {
  await p.evaluate(({ s }) => {
    const G = window.__game, T = window.__THREE, near = s.kind === 'helecho';
    // (a más de 5,5 m: más cerca, las copas y matas se vuelven punteadas para no tapar la cámara)
    const k = near ? 4 : 6.4, pos = new T.Vector3(s.x + k, s.y + (near ? 2.6 : 2), s.z + k), look = new T.Vector3(s.x, s.y + (near ? 0.4 : 2.2), s.z);
    G.player.place(s.x + 9, s.z + 9, 0); G.follow.snap(G.player);
    G.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; G.camera.position.copy(pos); G.camera.lookAt(look);
  }, { s });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/${town}-${q}-${id}.png`, timeout: 180000 }); n++;
}
console.log(town, q, JSON.stringify(spots.map(([id, s]) => id + '@' + s.d.toFixed(0))), 'fotos', n);
console.log(errs.length ? errs.join('\n') : 'sin errores');
await b.close();
