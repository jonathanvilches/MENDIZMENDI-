// Carga de un pueblo: llamadas de dibujo, triángulos, geometrías, texturas (MB estimados), memoria JS y objetos.
// Uso: node tools/carga.mjs pamplona,lumbier [q]
import { chromium } from 'playwright-core';
const ids = (process.argv[2] || 'pamplona').split(','), q = process.argv[3] || 'mid';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info'] });
for (const id of ids) {
  const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
  const t0 = Date.now();
  await p.goto(`http://127.0.0.1:5173/?town=${id}&q=${q}`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
  const tl = (Date.now() - t0) / 1000;
  await p.waitForTimeout(4000);
  const r = await p.evaluate(() => {
    const G = window.__game, R = window.__renderer, info = R.info;
    let meshes = 0, skinned = 0, inst = 0, instN = 0, lights = 0, obj = 0, tris = 0; const texs = new Set(), geos = new Set(), mats = new Set();
    G.scene.traverse(o => { obj++; if (o.isLight) lights++; if (o.isMesh) { meshes++; if (o.isSkinnedMesh) skinned++; if (o.isInstancedMesh) { inst++; instN += o.count; } geos.add(o.geometry); const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) { if (!m) continue; mats.add(m); for (const k in m) { const v = m[k]; if (v && v.isTexture) texs.add(v); } } } });
    let tmb = 0; for (const t of texs) { const im = t.image; const w = im?.width || 0, h = im?.height || 0; tmb += w * h * 4 * 1.33 / 1048576; }
    let gmb = 0, cpu = 0; for (const g of geos) for (const k in g.attributes) { const at = g.attributes[k]; gmb += at.count * at.itemSize * (at.array ? at.array.BYTES_PER_ELEMENT : (k === "position" || k === "uv" ? 4 : 1)) / 1048576; if (at.array) cpu += at.array.byteLength / 1048576; }
    return { draw: info.render.calls, tris: info.render.triangles, geomGPU: info.memory.geometries, texGPU: info.memory.textures, programs: info.programs?.length,
      objetos: obj, meshes, skinned, instanced: inst, instancias: instN, luces: lights, materiales: mats.size, texturasMB: +tmb.toFixed(0), geometriaMB: +gmb.toFixed(0), geomCPU_MB: +cpu.toFixed(0),
      heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(0) : null, vecinos: G.npcs?.length ?? G.walkers?.length, animales: G.fauna?.animals?.length, pixelRatio: R.getPixelRatio(), shadow: R.shadowMap.enabled };
  });
  console.log(JSON.stringify({ id, q, cargaSeg: tl, ...r }));
  await p.close();
}
await browser.close();
