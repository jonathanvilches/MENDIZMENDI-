// La primera fila del público, de cerca: que nadie atraviese su escalón ni lo que tiene delante (ARQUITECTURA.md, «Nada
// atraviesa nada»). Entra en un partido libre del campeonato (frontón elegido con SEDE: plaza, cubierto, labrit) y dibuja
// la escena con una cámara propia delante de la grada: tres capturas. Mide también hasta dónde llega la figura sentada.
// Uso: node tools/grada-ver.mjs pueblo [carpeta]   (BASE: por defecto el servidor de desarrollo, 5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const pueblo = process.argv[2] || 'marcilla', out = process.argv[3] || 'entrega/grada', BASE = process.env.BASE || 'http://127.0.0.1:5173/';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
await p.addInitScript((sede) => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', pelotaSede: sede || undefined, seen: { heroBenat: true, dog: true, comoJugar: true } })); }, process.env.SEDE || '');
await p.goto(BASE + '?q=low', { timeout: 300000 });
await p.waitForFunction(() => window.__hub?.visible && window.__ready, null, { timeout: 300000 });
await p.evaluate((t) => window.__hub.onSport('pelota', t), pueblo);
const espera = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(fn).catch(() => false)) return true; await p.waitForTimeout(700); } return false; };
const clic = (sel) => p.evaluate((s) => document.querySelector(s)?.click(), sel);
if (!(await espera(() => !!document.querySelector('.tq-tile[data-a="libre"]'), 500000))) throw new Error('sin menú');
await p.waitForTimeout(1500); await clic('.tq-tile[data-a="libre"]');
await espera(() => !!document.querySelector('[data-pel-go]'), 300000); await clic('[data-pel-go]');
if (await espera(() => !!document.querySelector('[data-mat-go]'), 30000)) await clic('[data-mat-go]');
if (!(await espera(() => ['serveWait', 'servePrep', 'rally', 'point'].includes(window.__game?.pelotaMatch?.game?.phase), 300000))) throw new Error('sin partido');
await p.waitForTimeout(3000);
// la cámara propia: delante de la primera fila, a la altura de los ojos de alguien en la contracancha
const vistas = await p.evaluate(() => {
  const THREE = window.__THREE || null, G = window.__game, C = G.pelotaMatch?.court || G.pelotaMatch?.o?.court;
  if (!C) return { error: 'sin cancha' };
  const S = C.standSpots || []; if (!S.length) return { error: 'sin asientos' };
  const R = window.__renderer, cam0 = G.camera || window.__rt.camera, cam = cam0.clone(); cam.fov = 50; cam.near = 0.05;
  const orig = R.render.bind(R); window.__vistaCam = null;
  R.render = (s, c) => orig(s, window.__vistaCam || c);
  // (la primera fila: los de más abajo; de ellos, el del medio de la fila más larga)
  const yMin = Math.min(...S.map(s => s[1])), fila = S.filter(s => s[1] < yMin + 0.1).sort((a, b) => a[2] - b[2] || a[0] - b[0]);
  const mid = fila[Math.floor(fila.length / 2)];
  window.__vistas = (k) => { const g = C.group; g.updateMatrixWorld(true); const [x, y, z, ry] = mid, fx = Math.sin(ry), fz = Math.cos(ry), lx = fz, lz = -fx;
    const V = (a, h, b) => g.localToWorld(cam.position.clone().set(x + fx * a + lx * b, y + h, z + fz * a + lz * b)); let from, to;
    if (k === 0) { from = V(2.6, 0.4, -1.2); to = V(0, -0.25, 0.6); }          // la primera fila, de frente y un poco de lado
    else if (k === 1) { from = V(1.2, -0.2, -2.4); to = V(-0.2, -0.4, 1.5); }   // a ras: los pies y lo que tienen delante
    else { from = V(7, 2.5, -6); to = V(-2, 0.5, 4); }                          // la grada
    cam.position.copy(from); cam.lookAt(to); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); window.__vistaCam = cam; };
  return { asientos: S.length, fila: fila.length, mid, hall: !!C.hall, labrit: !!C.labrit, estilo: C.estilo || '' };
});
console.log(JSON.stringify({ pueblo, sede: process.env.SEDE || '', ...vistas }));
// (las figuras sentadas: hasta dónde llegan, en su propio espacio, desde el punto del asiento)
console.log(JSON.stringify(await p.evaluate(() => { const out = []; const S = window.__game.scene; S.traverse(o => { if (o.isInstancedMesh && o.material?.vertexColors && o.count > 0) { const g = o.geometry; g.computeBoundingBox(); const b = g.boundingBox; out.push({ n: o.name, count: o.count, min: b.min.toArray().map(v => +v.toFixed(2)), max: b.max.toArray().map(v => +v.toFixed(2)) }); } }); return out.slice(0, 3).concat((() => { const res = []; S.traverse(o => { if (res.length < 4 && o.isInstancedMesh && o.material?.vertexColors && o.count > 0) { const P = o.geometry.attributes.position, zs = (a, b) => { let lo = 9, hi = -9, n = 0; for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y >= a && y < b) { const z = P.getZ(i); lo = Math.min(lo, z); hi = Math.max(hi, z); n++; } } return [+lo.toFixed(2), +hi.toFixed(2), n]; };
  res.push({ pies: zs(0, 0.12), espinillas: zs(0.15, 0.3), muslos: zs(0.35, 0.55), pecho: zs(0.7, 0.9) }); } }); return res; })()); })));
await p.addStyleTag({ content: 'body > *:not(canvas):not(#game):not(.game){visibility:hidden!important} canvas{visibility:visible!important}' });
if (!process.env.SINFOTOS) for (const k of [0, 1, 2]) { await p.evaluate((k) => window.__vistas(k), k); await p.waitForTimeout(6000); await p.screenshot({ path: `${out}/${pueblo}-${process.env.SEDE || 'def'}-${k}.png`, timeout: 180000 }); }
console.log(JSON.stringify({ errs }));
await b.close();
