// Fotos de los puentes famosos (src/world/puentesFamosos.js): de lado desde aguas abajo y aguas arriba, en tres cuartos
// desde la orilla, de cerca bajo el arco grande y andando por el tablero. Escribe también los arcos que han salido.
// Uso: node tools/puentes-famosos.mjs <pueblo> <carpeta> [ancho alto]   (BASE=http://127.0.0.1:8099/ para la web compilada)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [,, town = 'puente-la-reina', out = '/tmp/x', W = '900', H = '520'] = process.argv;
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true, comoJugar: true } })); });
await p.goto(`${process.env.BASE || 'http://127.0.0.1:5173/'}?town=${town}&q=${process.env.Q || 'low'}&weather=clear&skipintro=1&t=${process.env.T || 11}`, { timeout: 300000 });
await p.waitForFunction(() => window.__game?.mode === 'play' && window.__rt?.active, null, { timeout: 500000 });
await p.waitForTimeout(1500);
const info = await p.evaluate(() => {
  const R = window.__layout.MOD.real, HF = window.__hf, L = window.__layout;
  window.__rt.follow.update = () => {}; window.__game.ui.hudVisible?.(false);
  const P = R.puentes.find(q => q.famoso); if (!P) return null;
  const a = P.pts[0], z = P.pts[P.pts.length - 1], l = Math.hypot(z[0] - a[0], z[1] - a[1]), dx = (z[0] - a[0]) / l, dz = (z[1] - a[1]) / l;
  let s0 = null, s1 = null, lv = -1e9;
  for (let s = 0; s <= l; s += 0.5) { const x = a[0] + dx * s, zz = a[1] + dz * s, r = L.riverInfo(x, zz); if (r.edge < 0) { if (s0 == null) s0 = s; s1 = s; lv = Math.max(lv, r.level); } }
  const sc = s0 != null ? (s0 + s1) / 2 : l / 2;
  return { famoso: P.famoso, a, dx, dz, l, sc, lv, cx: a[0] + dx * sc, cz: a[1] + dz * sc, top: HF.groundHeight(a[0] + dx * sc, a[1] + dz * sc) };
});
console.log(JSON.stringify(info));
if (!info) { await b.close(); process.exit(1); }
const { a, dx, dz, l, cx, cz, lv, top } = info, nx = dz, nz = -dx;
const D = Math.max(30, l * 0.55);
const vistas = {
  abajo: [cx + nx * D, cz + nz * D, lv + 2.2, cx, cz, (lv + top) / 2],
  arriba: [cx - nx * D, cz - nz * D, lv + 2.2, cx, cz, (lv + top) / 2],
  tresCuartos: [cx + nx * D * 0.8 - dx * D * 0.6, cz + nz * D * 0.8 - dz * D * 0.6, lv + 6, cx, cz, (lv + top) / 2],
  cerca: [cx + nx * 12 + dx * 4, cz + nz * 12 + dz * 4, lv + 1.2, cx, cz, top - 3],
  tablero: [a[0] + dx * 6, a[1] + dz * 6, null, cx, cz, top + 1],
};
for (const [k, [x, z, y, tx, tz, ty]] of Object.entries(vistas)) {
  await p.evaluate(([x, z, y, tx, tz, ty]) => { const cam = window.__rt.camera, HF = window.__hf; document.querySelectorAll('.rotulo').forEach(e => e.remove()); window.__game.player.place(x + 400, z + 400, 0); cam.position.set(x, y ?? HF.groundHeight(x, z) + 1.7, z); cam.lookAt(tx, ty, tz); }, [x, z, y, tx, tz, ty]);
  await p.waitForTimeout(1600);
  await p.evaluate(() => document.querySelectorAll('.rotulo').forEach(e => e.remove()));
  await p.screenshot({ path: `${out}/${town}-${k}.png` });
}
if (errs.length) console.log('errores', errs.slice(0, 5));
await b.close();
