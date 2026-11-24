// La isla flotante del mapa del inicio, comarca a comarca: el autor (24 nov 2026), «donde más fallos he visto es en la
// elección de cada comarca. Cuando levanta la isla flotante, de comarca a comarca… y en la cámara de dron da bastantes
// errores y va muy lento a veces y se entrecorta».
// Elige las comarcas de la fila de abajo una tras otra (sin volver a Navarra entre medias, como hace un niño) y en cada una
// mide, desde el toque hasta que acaba el vuelo de dron: los errores y avisos de la consola, el tiempo de cada imagen, el
// trabajo de cada imagen en el hilo principal (lo que tarda el código del juego en prepararla: ahí están los tirones que no
// dependen de la tarjeta gráfica) y las tareas largas. Con PERFIL=1 graba además dónde se va el tiempo (las funciones).
// Con el servidor de desarrollo en marcha (5173):
//   OUT=<carpeta> TAM=844x390 MOVIL=1 DPR=1 SEG=26 [SOLO=0,3,5] [PERFIL=1] node tools/auditoria-islas.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const out = process.env.OUT || 'entrega/auditoria-islas'; fs.mkdirSync(out, { recursive: true });
const [W, H] = (process.env.TAM || '844x390').split('x').map(Number), MOVIL = process.env.MOVIL === '1', SEG = +(process.env.SEG || 26);
const URL = process.env.URL || 'http://127.0.0.1:5173/', SOLO = process.env.SOLO ? process.env.SOLO.split(',').map(Number) : null;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: +(process.env.DPR || 1), isMobile: MOVIL, hasTouch: MOVIL });
const p = await ctx.newPage();
const log = []; let fase = 'carga';
p.on('pageerror', e => log.push({ fase, tipo: 'error', m: String(e.message || e).slice(0, 240) }));
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') log.push({ fase, tipo: m.type(), m: m.text().slice(0, 240) }); });
p.on('requestfailed', r => log.push({ fase, tipo: 'descarga', m: r.url().replace(URL, '') + ' ' + (r.failure()?.errorText || '') }));
await p.addInitScript(() => {
  localStorage.setItem('herrizherri-lang', 'es');
  localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'explorador', seen: { heroBenat: true, dog: true, comoJugar: true, intro: true } }));
  // (cada imagen: cuándo empieza y cuánto trabaja el hilo principal en sus requestAnimationFrame)
  // (varias llamadas en la misma imagen comparten su marca de tiempo: se suman en una)
  const W = window, raf = W.requestAnimationFrame.bind(W); W.__img = [];
  W.requestAnimationFrame = (f) => raf((t) => { const a = performance.now();
    try { f(t); } finally { const d = performance.now() - a, u = W.__img.at(-1); if (u && u[0] === t) u[1] += d; else W.__img.push([t, d]); } });
  // (los programas de la tarjeta gráfica: cuántos se enlazan y cuánto se espera al preguntar por ellos; la espera es el hilo
  // principal parado)
  W.__prog = [];
  for (const C of [W.WebGL2RenderingContext, W.WebGLRenderingContext]) { if (!C) continue; const gp = C.prototype.getProgramParameter, lk = C.prototype.linkProgram;
    C.prototype.linkProgram = function (pr) { W.__prog.push(['enlaza', performance.now(), 0]); return lk.call(this, pr); };
    C.prototype.getProgramParameter = function (pr, q) { const a = performance.now(), r = gp.call(this, pr, q), d = performance.now() - a; if (d > 4) W.__prog.push(['espera', a, d]); return r; }; }
  W.__largas = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) W.__largas.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true }); } catch (e) { }
});
await p.goto(URL + '?skipintro=1' + (MOVIL ? '&q=low' : ''), { timeout: 300000 });
await p.waitForFunction(() => window.__mapa3d && document.querySelectorAll('.m3-chip[data-sel]').length > 3, null, { timeout: 300000 });
await p.waitForTimeout(6000);
const nombres = await p.evaluate(() => [...document.querySelectorAll('.m3-chip[data-sel]')].map(e => e.dataset.sel));
const cdp = process.env.PERFIL === '1' ? await ctx.newCDPSession(p) : null;
if (cdp) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); }
const res = [];
const pct = (a, q) => a.length ? a[Math.min(a.length - 1, Math.floor(a.length * q))] : 0;
for (let i = 0; i < nombres.length; i++) {
  if (SOLO && !SOLO.includes(i)) continue;
  fase = nombres[i];
  if (cdp) await cdp.send('Profiler.start');
  const t0 = await p.evaluate((i) => { window.__img.length = 0; window.__largas.length = 0; window.__prog.length = 0; const t = performance.now();
    document.querySelectorAll('.m3-chip[data-sel]')[i].click(); return t; }, i);
  const estados = [];
  for (let s = 0; s < SEG; s++) {
    await p.waitForTimeout(1000);
    estados.push(await p.evaluate(() => { const e = window.__mapa3d.estado(), d = window.__mapa3d.islaDron(); return { vuelo: e.vuelo, dron: d ? +d.t.toFixed(2) : null, subida: +e.subida.toFixed(2) }; }));
    if ([2, 6, 12, 20].includes(s)) await p.screenshot({ path: `${out}/${String(i).padStart(2, '0')}-${fase}-${s}s.png` }).catch(() => {});
  }
  const { img, largas, prog } = await p.evaluate(() => ({ img: window.__img.slice(), largas: window.__largas.slice(), prog: window.__prog.slice() }));
  if (cdp) { const { profile } = await cdp.send('Profiler.stop'); fs.writeFileSync(`${out}/${String(i).padStart(2, '0')}-${fase}.cpuprofile`, JSON.stringify(profile)); }
  const dt = [], tr = img.map(x => x[1]).sort((a, b) => a - b), peores = [];
  for (let k = 1; k < img.length; k++) { const d = img[k][0] - img[k - 1][0]; dt.push(d); if (d > 120) peores.push([+((img[k - 1][0] - t0) / 1000).toFixed(1), Math.round(d), Math.round(img[k - 1][1])]); }
  const dts = dt.slice().sort((a, b) => a - b);
  const r = { i, comarca: fase, imagenes: img.length, fps: +(img.length / SEG).toFixed(1), msMediana: Math.round(pct(dts, 0.5)), ms95: Math.round(pct(dts, 0.95)), msMax: Math.round(dts.at(-1) || 0),
    trabajoMediana: +pct(tr, 0.5).toFixed(1), trabajo95: +pct(tr, 0.95).toFixed(1), trabajoMax: Math.round(tr.at(-1) || 0),
    tirones: dt.filter(d => d > 120).length, largas: largas.length, largaMax: Math.round(Math.max(0, ...largas.map(x => x[1]))),
    peores: peores.sort((a, b) => b[1] - a[1]).slice(0, 6), programas: prog.filter(x => x[0] === 'enlaza').length, esperaProg: Math.round(prog.filter(x => x[0] === 'espera').reduce((n, x) => n + x[2], 0)), esperaProgMax: Math.round(Math.max(0, ...prog.filter(x => x[0] === 'espera').map(x => x[2]))),
    cuandoProg: prog.filter(x => x[0] === 'enlaza').map(x => +((x[1] - t0) / 1000).toFixed(1)).join(' '), errores: log.filter(l => l.fase === fase).length, estados: estados.map(e => (e.vuelo ? 'V' : '') + (e.dron != null ? 'D' + e.dron : '') || '·').join(' ') };
  res.push(r); console.log(JSON.stringify(r));
}
const obras = await p.evaluate(() => window.__mapa3d.obras?.() || []); for (const o of obras) console.log('pasos', o.id, o.ms.join(' + '), 'ms');
fs.writeFileSync(`${out}/resultado.json`, JSON.stringify({ tam: `${W}x${H}`, movil: MOVIL, res, log }, null, 1));
const tipos = {}; for (const l of log) { const k = l.tipo + ' · ' + l.m.slice(0, 120); tipos[k] = (tipos[k] || 0) + 1; }
console.log('mensajes:', Object.keys(tipos).length ? '' : 'ninguno'); for (const [k, n] of Object.entries(tipos).sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(String(n).padStart(4), k);
await b.close();
