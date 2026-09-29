// Triángulos dibujados por objeto en un fotograma (imagen y sombras): node tools/drawprof.mjs <url> [pueblo]
import { chromium } from 'playwright-core';
const [,, base = 'http://127.0.0.1:5182/', town = 'lesaka'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await page.goto(base + '?town=' + town, { timeout: 300000 });
await page.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 300000 });
await page.waitForTimeout(3000);
const r = await page.evaluate(async () => {
  const R = window.__rt.renderer, orig = R.renderBufferDirect.bind(R), acc = {};
  R.renderBufferDirect = (cam, scene, geo, mat, obj, group) => {
    const n = (geo.index ? geo.index.count : geo.attributes.position.count) / 3 * (obj.isInstancedMesh ? obj.count : 1);
    const shadow = mat.isMeshDepthMaterial || mat.isMeshDistanceMaterial;
    let label = obj.name || obj.userData.kind || ''; let p = obj.parent; while (!label && p) { label = p.name || p.userData?.kind || ''; p = p.parent; }
    label = (label || obj.type) + ' ' + (geo.userData?.kind || '') + ' ' + Math.round(n / (obj.isInstancedMesh ? obj.count : 1)) + (obj.isInstancedMesh ? 'x' + obj.count : '') + ' ' + mat.type.replace('Material', '');
    const k = (shadow ? 'SOMBRA ' : '') + label; acc[k] = (acc[k] || 0) + n;
    return orig(cam, scene, geo, mat, obj, group);
  };
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  R.renderBufferDirect = orig;
  const tot = Object.values(acc).reduce((a, b) => a + b, 0);
  return ['TOTAL ' + Math.round(tot / 1000) + 'k'].concat(Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, v]) => Math.round(v / 1000) + 'k  ' + k));
});
console.log(r.join('\n'));
await browser.close();
