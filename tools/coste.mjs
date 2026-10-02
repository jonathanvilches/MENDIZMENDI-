// ¿Qué cuesta dibujar? Entra en un pueblo como en un ordenador (1280×720, calidad alta), para el bucle y dibuja la
// misma vista muchas veces (esperando a que la tarjeta termine cada una), primero entera y luego quitando cada parte
// de la escena por turnos y las sombras. Da ms por fotograma, llamadas de dibujo y triángulos de cada caso.
// Uso: node tools/coste.mjs [pueblo] [calidad]   (URL=http://127.0.0.1:5173 por defecto)
import { chromium } from 'playwright-core';
const [,, town = 'pamplona', q = 'high'] = process.argv;
const URL = process.env.URL || 'http://127.0.0.1:5173/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 140)));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
await p.goto(`${URL}?town=${town}&q=${q}&weather=clear&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.waitForTimeout(3000);
const r = await p.evaluate(() => {
  const rt = window.__rt, R = rt.renderer, S = rt.scene, C = rt.camera, gl = R.getContext(), px = new Uint8Array(4);
  rt.active = false; R.setPixelRatio(1);
  const N = 6;
  const time = (shadow = true) => {
    R.render(S, C); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const t = performance.now(); let calls = 0, tris = 0;
    for (let i = 0; i < N; i++) { R.shadowMap.needsUpdate = shadow; R.render(S, C); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); calls = R.info.render.calls; tris = R.info.render.triangles; }
    return { ms: +((performance.now() - t) / N).toFixed(1), calls, tris };
  };
  const out = { todo: time(true), sinActualizarSombra: time(false) };
  R.shadowMap.enabled = false; S.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); });
  out.sinSombras = time(false);
  R.shadowMap.enabled = true; S.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); });
  time(true);
  // cada hijo de la escena por separado (los que tienen nombre o tipo), agrupados
  const groups = new Map();
  for (const o of S.children) { const k = o.name || o.type + (o.isInstancedMesh ? 'I' : ''); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(o); }
  const base = time(true).ms;
  const parts = [];
  for (const [k, list] of groups) {
    const vis = list.map(o => o.visible); list.forEach(o => o.visible = false);
    const t = time(true); list.forEach((o, i) => o.visible = vis[i]);
    parts.push([+(base - t.ms).toFixed(1), k + ' ×' + list.length, t.calls, t.tris]);
  }
  parts.sort((a, b) => b[0] - a[0]);
  rt.active = true;
  return { pr: 1, out, base, parts: parts.slice(0, 22) };
});
console.log(town, q, JSON.stringify(r.out));
for (const [ms, k, c, t] of r.parts) console.log(`  −${ms} ms sin ${k}  (quedan ${c} llamadas, ${(t / 1e6).toFixed(2)} M tri)`);
console.log(errs.length ? 'errores: ' + errs.join(' | ') : 'sin errores');
await b.close();
