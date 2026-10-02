// Triángulos visibles por partes de la escena (calidad alta): qué pesa más en la tarjeta gráfica.
// Uso: node tools/triangulos.mjs [pueblo]   (URL=http://127.0.0.1:5173 por defecto)
import { chromium } from 'playwright-core';
const [,, town = 'pamplona'] = process.argv;
const URL = process.env.URL || 'http://127.0.0.1:5173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
await p.goto(`${URL}/?town=${town}&q=high&weather=clear&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
await p.waitForTimeout(3000);
console.log(await p.evaluate(() => {
  const rt = window.__rt, S = rt.scene, cam = rt.camera, T = window.__THREE;
  cam.updateMatrixWorld(); const fr = new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  const by = new Map(), sh = new Map(); let tot = 0, totSh = 0;
  const label = (o) => { let n = o, parts = []; while (n && n !== S) { if (n.name) parts.unshift(n.name); n = n.parent; } return (parts.slice(-2).join('/') || (o.type + ':' + (o.material?.type || '') + ':' + (o.material?.name || '') + ':' + (o.geometry?.attributes?.position?.count || 0))) + (o.isInstancedMesh ? ' [inst]' : '') + (o.isSkinnedMesh ? ' [piel]' : ''); };
  S.traverseVisible(o => {
    if (!o.isMesh || !o.geometry) return;
    const g = o.geometry, idx = g.index ? g.index.count : g.attributes.position.count, inst = o.isInstancedMesh ? o.count : 1, t = idx / 3 * inst;
    if (o.frustumCulled !== false && !o.isInstancedMesh) { if (!g.boundingSphere) g.computeBoundingSphere(); const s = g.boundingSphere.clone().applyMatrix4(o.matrixWorld); if (!fr.intersectsSphere(s)) return; }
    const k = label(o); by.set(k, (by.get(k) || 0) + t); tot += t;
    if (o.castShadow) { sh.set(k, (sh.get(k) || 0) + t); totSh += t; }
  });
  const fmt = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18).map(([k, v]) => `${(v / 1000).toFixed(0)}k ${k}`).join('\n');
  return `vista: ${(tot / 1e6).toFixed(2)} M triángulos\n${fmt(by)}\n--- con sombra: ${(totSh / 1e6).toFixed(2)} M\n${fmt(sh)}`;
}));
await b.close();
