// ¿Qué sistema cuesta más de dibujar? Como coste.mjs pero quitando por turnos los sistemas del motor (terreno cercano,
// montes lejanos, cielo, vegetación, pueblo, agua, fauna, personajes…) en vez de los hijos sueltos de la escena.
// Uso: node tools/coste-sistemas.mjs [pueblo] [calidad] [ancho] [alto]   (URL=http://127.0.0.1:5173/ por defecto)
import { chromium } from 'playwright-core';
const [,, town = 'lesaka', q = 'low', W = 1280, H = 720] = process.argv;
const URL = process.env.URL || 'http://127.0.0.1:5173/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +W, height: +H } }); const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 140)));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); localStorage.setItem('mendimendiz-lang', 'es'); });
await p.goto(`${URL}?town=${town}&q=${q}&weather=clear&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.waitForTimeout(3000);
const r = await p.evaluate(() => {
  const rt = window.__rt, R = rt.renderer, S = rt.scene, C = rt.camera, gl = R.getContext(), px = new Uint8Array(4);
  rt.active = false; R.setPixelRatio(1);
  const N = 8;
  const time = () => {
    R.render(S, C); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const t = performance.now();
    for (let i = 0; i < N; i++) { R.render(S, C); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
    return { ms: +((performance.now() - t) / N).toFixed(0), calls: R.info.render.calls, tris: R.info.render.triangles };
  };
  // cada sistema: los objetos de la escena que le pertenecen
  const own = new Map(), add = (k, o) => { if (o && o.isObject3D) { if (!own.has(k)) own.set(k, new Set()); own.get(k).add(o); } };
  const sys = { terreno: rt.terrain, cielo: rt.sky, agua: rt.water, naturaleza: rt.nature, fauna: rt.fauna, clima: rt.weather, particulas: rt.particles, humo: rt.smoke, luces: rt.lights, baliza: rt.beacon, cascada: rt.waterfall };
  for (const [k, s] of Object.entries(sys)) if (s) for (const v of Object.values(s)) { if (v?.isObject3D && v.parent) add(k, v); if (Array.isArray(v)) for (const x of v) { if (x?.isObject3D && x.parent) add(k, x); if (x?.obj?.isObject3D) add(k, x.obj); if (x?.mesh?.isObject3D) add(k, x.mesh); } }
  for (const o of S.children) if (o.name === 'town') add('pueblo', o); else if (o.name === 'montes-lejos') add('montes lejanos', o);
  const g = window.__game; for (const a of [...(g.actors || []), ...(g.walkers || [])]) add('vecinos', a.obj);
  add('jugador', rt.player?.obj || rt.player?.group); add('perro', g.perro?.obj);
  // terreno: separar el cercano del lejano si se puede
  const out = { todo: time() }, parts = [];
  const claimed = new Set(); for (const s of own.values()) for (const o of s) claimed.add(o);
  const rest = S.children.filter(o => !claimed.has(o) && o.visible);
  own.set('resto (' + rest.map(o => o.name || o.type).slice(0, 8).join(',') + ')', new Set(rest));
  for (const [k, set] of own) {
    const list = [...set].filter(o => o.visible); if (!list.length) continue;
    list.forEach(o => o.visible = false); const t = time(); list.forEach(o => o.visible = true);
    parts.push([out.todo.ms - t.ms, k + ' ×' + list.length, out.todo.calls - t.calls, out.todo.tris - t.tris]);
  }
  parts.sort((a, b) => b[0] - a[0]); rt.active = true;
  return { out, parts };
});
console.log(town, q, W + '×' + H, JSON.stringify(r.out));
for (const [ms, k, c, t] of r.parts) console.log(`  ${String(ms).padStart(6)} ms  ${k}  (${c} llamadas, ${(t / 1000).toFixed(0)} k tri)`);
console.log(errs.length ? 'errores: ' + errs.join(' | ') : 'sin errores');
await b.close();
