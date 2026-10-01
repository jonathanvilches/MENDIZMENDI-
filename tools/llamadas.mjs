// Llamadas de dibujo por partes de la escena (Pamplona, calidad alta) y grupos con muchas mallas. Uso: node tools/llamadas.mjs
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1100, height: 620 } });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
await p.goto('http://127.0.0.1:5173/?town=pamplona&q=high&weather=clear', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
await p.waitForTimeout(4000);
console.log(await p.evaluate(() => {
  const rt = window.__rt, S = rt.scene || window.__game.scene, cam = rt.camera, T = window.__THREE;
  const fr = new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  const by = new Map(); let tot = 0, shadow = 0;
  const top = (o) => { const ch = []; let n = o; while (n && n !== S) { ch.unshift(n.name || n.type); n = n.parent; } return ch.slice(0, 3).join('/'); };
  S.traverseVisible(o => { if (!(o.isMesh || o.isPoints || o.isLine || o.isSprite)) return; if (o.frustumCulled && o.geometry && !o.isInstancedMesh) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); const s = o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld); if (!fr.intersectsSphere(s)) return; } const k = top(o); by.set(k, (by.get(k) || 0) + 1); tot++; if (o.castShadow) shadow++; });
  const r = rt.renderer.info.render;
  const gm = []; S.children.forEach((c, i) => { if (c.type === 'Group' && !c.name) { let n = 0; c.traverseVisible(o => { if (o.isMesh) n++; }); if (n > 20) { const m = c.children.find(o => o.isMesh); gm.push(i + ' n=' + n + ' geo=' + m?.geometry?.type + ' mat=' + m?.material?.type + ' col=' + m?.material?.color?.getHexString() + ' map=' + !!m?.material?.map + ' ud=' + JSON.stringify(c.userData).slice(0, 80)); } } });
  return gm.join('\n') + '\n' + JSON.stringify({ visibles: tot, conSombra: shadow, info: { calls: r.calls, tris: r.triangles } }) + '\n' + [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(e => e.join(': ')).join('\n');
}));
await b.close();
