// Coste por fotograma dentro de un pueblo: node tools/frameprof.mjs <url> [pueblo] [ancho] [alto]
import { chromium } from 'playwright-core';
const [,, base = 'http://127.0.0.1:5182/', town = 'lesaka', W = 390, H = 844] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: +W, height: +H }, isMobile: +W < 900, hasTouch: +W < 900 });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.goto(base + '?town=' + town + (process.env.QS ? '&' + process.env.QS : ''), { timeout: 300000 });
await page.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 300000 });
await page.waitForTimeout(4000);
const r = await page.evaluate(async () => {
  const rt = window.__rt, acc = {}, wrap = (obj, name, label) => { const f = obj[name].bind(obj); obj[name] = (...a) => { const t = performance.now(); const v = f(...a); acc[label] = (acc[label] || 0) + performance.now() - t; return v; }; };
  wrap(rt.game, 'update', 'game'); wrap(rt.player, 'update', 'player'); wrap(rt.follow, 'update', 'camera'); wrap(rt.terrain, 'update', 'terrain'); wrap(rt.sky, 'update', 'sky');
  wrap(rt.water, 'update', 'water'); wrap(rt.nature, 'update', 'nature'); wrap(rt.fauna, 'update', 'fauna'); wrap(rt.particles, 'update', 'particles'); wrap(rt.smoke, 'update', 'smoke');
  wrap(rt.lights, 'update', 'lights'); wrap(rt.beacon, 'update', 'beacon'); wrap(rt.sound, 'update', 'sound'); wrap(rt.renderer, 'render', 'render');
  const ui = rt.game.ui; if (ui.setClock) wrap(ui, 'setClock', 'clockUI');
  const n0 = rt.frames; let frames = 0; const t0 = performance.now();
  await new Promise(res => { const f = () => { frames++; if (frames < 90) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  const T = performance.now() - t0; const out = {}; for (const k in acc) out[k] = +(acc[k] / frames).toFixed(2);
  const info = rt.renderer.info;
  let meshes = 0, inst = 0; rt.scene.traverse(o => { if (o.isMesh) { meshes++; if (o.isInstancedMesh) inst++; } });
  return { msPerFrame: +(T / frames).toFixed(1), parts: out, calls: info.render.calls, tris: info.render.triangles, programs: info.programs.length, geos: info.memory.geometries, tex: info.memory.textures, meshes, inst, pr: rt.renderer.getPixelRatio() };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
