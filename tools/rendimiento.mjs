// Mide el coste de dibujo (triángulos y llamadas por fotograma, sombras incluidas) y reparte los triángulos
// de la escena por partes: pueblo (por material), hierba, árboles, terreno… Uso: node tools/rendimiento.mjs [pueblos] [calidad]
import { chromium } from 'playwright-core';
const [,, towns = 'lumbier,pamplona', quality = 'high'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const town of towns.split(',')) {
  const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto(`http://127.0.0.1:5173/?town=${town}&quality=${quality}`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
  await p.waitForTimeout(4000);
  const r = await p.evaluate(async () => {
    const G = window.__game, R = window.__renderer, scene = G.scene || window.__rt.scene, cam = G.camera;
    const views = { salida: null, plaza: [window.__layout.PLACES.plaza.x + 30, 40, window.__layout.PLACES.plaza.z + 60] };
    const out = {};
    for (const [k, v] of Object.entries(views)) {
      if (v) { const T = window.__THREE, gh = window.__hf.groundHeight(v[0], v[2]); const pos = new T.Vector3(v[0], gh + 12, v[2]), look = new T.Vector3(window.__layout.PLACES.plaza.x, gh, window.__layout.PLACES.plaza.z); G.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; cam.position.copy(pos); cam.lookAt(look); }
      await new Promise(r => setTimeout(r, 2500));
      out[k] = { tris: R.info.render.triangles, calls: R.info.render.calls };
    }
    // reparto de triángulos en la escena (sin frustum)
    const parts = {};
    scene.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      let vis = true; for (let q = o; q; q = q.parent) if (q.visible === false) vis = false;
      const g = o.geometry, t = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
      let top = o; while (top.parent && top.parent !== scene) top = top.parent;
      const key = (top.name || top.type) + (top.name === 'town' ? ':' + o.name.split('|')[0] + ':' + o.name.split('|')[2] : ':' + o.name) + (vis ? '' : ' (oculto)');
      parts[key] = (parts[key] || 0) + t;
    });
    out.parts = Object.entries(parts).sort((a, b) => b[1] - a[1]).slice(0, 22).map(([k, v]) => `${k}: ${(v / 1000).toFixed(0)}k`);
    return out;
  });
  console.log('==', town, JSON.stringify({ salida: r.salida, plaza: r.plaza }));
  console.log(r.parts.join('\n'));
  await p.close();
}
await browser.close();
