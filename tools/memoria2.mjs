// Memoria de un pueblo en móvil: montón de JavaScript, texturas (GPU y lienzos en CPU), geometrías y sombras.
// Uso: node tools/memoria2.mjs [pueblo] [calidad]
import { chromium } from 'playwright-core';
const [,, town = 'pamplona', q = 'mid'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable');
const heap = async () => { const m = (await cdp.send('Performance.getMetrics')).metrics; const g = (n) => m.find(x => x.name === n)?.value || 0; return (g('JSHeapUsedSize') / 1048576).toFixed(0) + ' MB'; };
await p.goto(process.env.URL || 'http://127.0.0.1:5173/', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 }); await p.waitForTimeout(3000);
console.log('menú: montón JS', await heap());
await p.goto((process.env.URL || 'http://127.0.0.1:5173/') + `?town=${town}&q=${q}`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 }); await p.waitForTimeout(5000);
console.log(town, 'montón JS', await heap());
console.log(await p.evaluate(() => {
  const rt = window.__rt, r = rt.renderer, S = rt.scene, texs = new Map(), geos = new Set();
  const addTex = (t, k) => { if (t && !texs.has(t.uuid)) { const im = t.image, w = im?.width || im?.data?.width || 0, h = im?.height || im?.data?.height || 0; texs.set(t.uuid, { w, h, canvas: im instanceof HTMLCanvasElement, k }); } };
  S.traverse(o => { if (o.geometry) geos.add(o.geometry); const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) for (const k of Object.keys(m)) if (m[k]?.isTexture) addTex(m[k], k); });
  let gpu = 0, cpuCanvas = 0; const bySize = {};
  for (const t of texs.values()) { const s = t.w * t.h * 4 * 1.33 / 1048576; gpu += s; if (t.canvas) cpuCanvas += t.w * t.h * 4 / 1048576; const key = `${t.w}x${t.h}${t.canvas ? ' lienzo' : ''}`; bySize[key] = (bySize[key] || 0) + 1; }
  let geoMB = 0; for (const g of geos) for (const a of Object.values(g.attributes)) geoMB += (a.array?.byteLength || 0) / 1048576;
  const sm = rt.sky?.sun?.shadow?.mapSize;
  const can = r.domElement;
  return JSON.stringify({ texturas: texs.size, texGPU_MB: gpu.toFixed(0), lienzosCPU_MB: cpuCanvas.toFixed(0), geometrias: geos.size, geoMB: geoMB.toFixed(0), sombra: sm ? sm.x + 'x' + sm.y : null, lienzo: can.width + 'x' + can.height, aa: r.getContextAttributes().antialias, infoGPU: r.info.memory, tamaños: Object.entries(bySize).sort((a, b) => b[1] - a[1]).slice(0, 12) });
}));
await b.close();
