// ¿Se queda memoria de un pueblo a otro? Ir y volver entre dos pueblos varias veces (como al jugar, en la misma página)
// y, tras forzar la recogida de basura, apuntar la memoria de JavaScript, las texturas, las geometrías, los programas
// de la gráfica y los lienzos vivos. Si algo sube en cada vuelta, es una fuga (en el iPhone acaba cerrando la página).
// Uso: node tools/fugas.mjs [puebloA] [puebloB] [vueltas]   (URL=http://127.0.0.1:5173 por defecto)
import { chromium } from 'playwright-core';
const URL = process.env.URL || 'http://127.0.0.1:5173';
const [,, A = 'lesaka', B = 'elizondo', N = '4'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--js-flags=--expose-gc'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => {
  try { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true } })); } catch (e) { }
  // lienzos creados (los que siguen vivos tras la recogida de basura se cuentan con una referencia débil)
  const C = window.__canvases = []; const ce = Document.prototype.createElement;
  Document.prototype.createElement = function (t, ...r) { const e = ce.call(this, t, ...r); if (String(t).toLowerCase() === 'canvas') C.push(new WeakRef(e)); return e; };
});
await p.goto(`${URL}/?town=${A}&q=low&weather=clear&skipintro=1`, { timeout: 300000 });
const inTown = (t) => p.waitForFunction((t) => window.__game && window.__game.def?.id === t && window.__game.mode === 'play' && window.__rt?.active, t, { timeout: 400000 });
await inTown(A); await p.waitForTimeout(3000);
const snap = () => p.evaluate(async () => {
  for (let i = 0; i < 3; i++) { window.gc?.(); await new Promise(r => setTimeout(r, 300)); }
  const i = window.__rt.renderer.info, cs = window.__canvases.map(w => w.deref()).filter(Boolean);
  const px = cs.reduce((s, c) => s + c.width * c.height, 0);
  return { heap: Math.round(performance.memory.usedJSHeapSize / 1e6), tex: i.memory.textures, geo: i.memory.geometries, prog: i.programs?.length || 0, lienzos: cs.length, mpx: +(px / 1e6).toFixed(1) };
});
const rows = [[A, await snap()]];
for (let k = 0; k < +N; k++) for (const t of [B, A]) {
  await p.evaluate((t) => window.__game.onPlayTown(t), t);
  await inTown(t); await p.waitForTimeout(3000);
  rows.push([t, await snap()]);
}
for (const [t, r] of rows) console.log(`${t.padEnd(10)} JS ${String(r.heap).padStart(4)} MB · texturas ${r.tex} · geometrías ${r.geo} · programas ${r.prog} · lienzos vivos ${r.lienzos} (${r.mpx} Mpx)`);
const as = rows.filter(r => r[0] === A).map(r => r[1]);
console.log(`vuelta a ${A}: JS ${as.map(r => r.heap).join(' → ')} MB · texturas ${as.map(r => r.tex).join(' → ')} · lienzos ${as.map(r => r.lienzos).join(' → ')}`);
console.log(errs.length ? 'errores: ' + errs.slice(0, 5).join(' | ') : 'sin errores');
await b.close();
