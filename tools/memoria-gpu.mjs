// Memoria de gráficos estimada de un pueblo (texturas y geometrías de la escena) en un móvil emulado.
// Uso: node tools/memoria-gpu.mjs [pueblo] [calidad]   (URL=http://localhost:8099/ por defecto: la versión web)
import { chromium } from 'playwright-core';
const [,, town = 'pamplona', q = 'low'] = process.argv;
const URL = process.env.URL || 'http://localhost:8099/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 140)));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
await p.goto(`${URL}?town=${town}&q=${q}&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
const r = await p.evaluate(() => {
  const rt = window.__rt, tex = new Map(), geo = new Set(), owner = new Map(), gown = new Map(); let tris = 0;
  const path = (o) => { const a = []; for (let x = o; x && a.length < 4; x = x.parent) a.push(x.name || x.type); return a.join('<'); };
  rt.scene.traverse(o => {
    if (o.geometry) { geo.add(o.geometry); if (!gown.has(o.geometry)) gown.set(o.geometry, path(o) + (o.isInstancedMesh ? ' x' + o.count : '')); }
    for (const m of [].concat(o.material || [])) for (const k in m) { const t = m[k]; if (t && t.isTexture) { tex.set(t.uuid, t); if (!owner.has(t.uuid)) owner.set(t.uuid, k + ' ' + (m.name || m.type) + ' ' + path(o)); } }
    if (o.material?.uniforms) for (const u of Object.values(o.material.uniforms)) if (u.value?.isTexture) tex.set(u.value.uuid, u.value);
  });
  let tb = 0; const big = [];
  for (const t of tex.values()) { const i = t.image, w = i?.width || i?.data?.width || 0, h = i?.height || i?.data?.height || 0, d = i?.depth || 1, by = w * h * d * 4 * (t.generateMipmaps !== false ? 1.33 : 1); tb += by; big.push([by, w + 'x' + h + (d > 1 ? 'x' + d : ''), (t.name || t.constructor.name) + ' ' + (owner.get(t.uuid) || '')]); }
  let gb = 0; const gl = [];
  for (const g of geo) { let b = 0; for (const a of Object.values(g.attributes)) b += a.array.byteLength; if (g.index) b += g.index.array.byteLength; gb += b; gl.push([b, gown.get(g)]); }
  gl.sort((a, b) => b[0] - a[0]);
  big.sort((a, b) => b[0] - a[0]);
  return { texturas: tex.size, texMB: (tb / 1048576).toFixed(0), geoMB: (gb / 1048576).toFixed(0), geometrias: geo.size, sombras: rt.renderer.shadowMap.enabled, pr: rt.renderer.getPixelRatio(), top: big.slice(0, 14).map(([by, s, n]) => `${(by / 1048576).toFixed(1)}MB ${s} ${n}`), gtop: gl.slice(0, 25).map(([b, n]) => `${(b / 1048576).toFixed(1)}MB ${n}`) };
});
console.log(town, q, JSON.stringify({ ...r, top: undefined, gtop: undefined })); console.log('  ' + r.top.join('\n  ')); console.log('geometría:\n  ' + r.gtop.join('\n  '));
console.log(errs.length ? 'errores: ' + errs.join(' | ') : 'sin errores');
await b.close();
