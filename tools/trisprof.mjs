// Qué objetos aportan más triángulos en un pueblo: node tools/trisprof.mjs <url> [pueblo]
import { chromium } from 'playwright-core';
const [,, base = 'http://127.0.0.1:5182/', town = 'lesaka'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await page.goto(base + '?town=' + town, { timeout: 300000 });
await page.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 300000 });
await page.waitForTimeout(3000);
const r = await page.evaluate(() => {
  const rt = window.__rt, T = window.__THREE, cam = rt.camera, fr = new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  const rows = [], sph = new T.Sphere();
  rt.scene.traverseVisible(o => {
    if (!o.isMesh || !o.geometry) return;
    const g = o.geometry, tri = (g.index ? g.index.count : g.attributes.position.count) / 3, n = o.isInstancedMesh ? o.count : 1;
    let vis = true; if (o.frustumCulled && !o.isInstancedMesh) { if (!g.boundingSphere) g.computeBoundingSphere(); sph.copy(g.boundingSphere).applyMatrix4(o.matrixWorld); vis = fr.intersectsSphere(sph); }
    let name = o.name || o.parent?.name || ''; let p = o; while (!name && p.parent) { p = p.parent; name = p.name || p.userData?.kind || ''; }
    rows.push({ name: (name || o.type) + (o.isInstancedMesh ? ' [inst]' : ''), tri: tri * n, vis, shadow: o.castShadow });
  });
  const inst = []; rt.scene.traverseVisible(o => { if (o.isInstancedMesh) { const g = o.geometry, t = (g.index ? g.index.count : g.attributes.position.count) / 3; let chain = [], p = o.parent; while (p) { if (p.name) chain.push(p.name); p = p.parent; } inst.push(`${Math.round(t * o.count / 1000)}k = ${t} tri x ${o.count} | mat ${o.material.type} ${o.material.color?.getHexString?.() || ''} | shadow ${o.castShadow} | ${chain.join('<')} | ${o.userData.kind || ''}`); } });
  inst.sort((a, b) => parseInt(b) - parseInt(a));
  const agg = {}; for (const x of rows) { const k = x.name; agg[k] ||= { tri: 0, visTri: 0, n: 0, shadow: 0 }; agg[k].tri += x.tri; if (x.vis) agg[k].visTri += x.tri; agg[k].n++; if (x.shadow) agg[k].shadow += x.tri; }
  return inst.slice(0, 20).concat(['---']).concat(Object.entries(agg).sort((a, b) => b[1].visTri - a[1].visTri).slice(0, 25).map(([k, v]) => `${k}: vis ${Math.round(v.visTri / 1000)}k / total ${Math.round(v.tri / 1000)}k, n=${v.n}, shadowTri ${Math.round(v.shadow / 1000)}k`));
});
console.log(r.join('\n'));
await browser.close();
