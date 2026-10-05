// ¿Quién ocupa la memoria binaria de la página (geometría, modelos descargados, imágenes decodificadas)? Apunta cada
// bloque grande (64 KB o más) con el sitio del código que lo crea y, al jugar y tras recoger basura, suma los que
// siguen vivos por sitio. Mejor con el servidor de desarrollo (nombres legibles). En el iPhone esta memoria se suma a la
// de la gráfica: lo que ya está en la gráfica y no hace falta en JavaScript es memoria doble.
// Uso: node tools/memoria-binarios.mjs [pueblo] [calidad]   (URL=http://127.0.0.1:5174/ por defecto)
import { chromium } from 'playwright-core';
const [,, town = 'pamplona', q = 'low'] = process.argv;
const URL = (process.env.URL || 'http://127.0.0.1:5174/').replace(/\/?$/, '/');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--js-flags=--expose-gc'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const p = await ctx.newPage(), errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await p.addInitScript((q) => {
  try { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true }, settings: { quality: q } })); } catch (e) { }
  const MIN = 65536, live = window.__bin = new Map(); let id = 0, peak = 0, now = 0;
  const reg = new FinalizationRegistry((k) => { const r = live.get(k); if (r) { now -= r.by; live.delete(k); } });
  const site = () => new Error().stack.split('\n').slice(3, 7).map(x => x.trim().replace(/^at /, '').replace(/\(?https?:\/\/[^/]+\/(src\/|node_modules\/\.vite\/deps\/|node_modules\/)?/, '').replace(/\?[^:]*/, '').replace(/\)$/, '').slice(0, 64)).join(' < ');
  const note = (o, by, kind) => { if (by < MIN) return; const k = ++id; live.set(k, { by, kind, at: site() }); now += by; if (now > peak) peak = now; window.__binPeak = peak; reg.register(o, k); };
  // matrices tipadas creadas con longitud o copiando (no las vistas sobre un búfer ya existente)
  for (const N of ['Float32Array', 'Uint16Array', 'Uint32Array', 'Uint8Array', 'Int8Array', 'Int16Array', 'Int32Array', 'Uint8ClampedArray', 'Float64Array']) {
    const T = window[N];
    const W = class extends T { constructor(...a) { super(...a); if (!(a[0] instanceof ArrayBuffer) && !(window.SharedArrayBuffer && a[0] instanceof SharedArrayBuffer)) note(this.buffer, this.byteLength, N); } };
    Object.defineProperty(W, 'name', { value: N });
    window[N] = W;
  }
  const AB = window.ArrayBuffer; window.ArrayBuffer = new Proxy(AB, { construct(t, a) { const o = new t(...a); note(o, o.byteLength, 'ArrayBuffer'); return o; } });
  for (const [P, k] of [[Response.prototype, 'Response'], [Blob.prototype, 'Blob']]) { const f = P.arrayBuffer; P.arrayBuffer = async function () { const o = await f.call(this); note(o, o.byteLength, k + '.arrayBuffer'); return o; }; }
  const cib = window.createImageBitmap; window.createImageBitmap = async function (...a) { const o = await cib.apply(this, a); note(o, o.width * o.height * 4, 'ImageBitmap ' + o.width + 'x' + o.height); return o; };
}, q);
await p.goto(`${URL}?town=${town}&q=${q}&weather=clear&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play' && window.__rt?.active, null, { timeout: 900000 });
await p.waitForTimeout(8000);
const r = await p.evaluate(async () => {
  for (let i = 0; i < 4; i++) { window.gc?.(); await new Promise(r => setTimeout(r, 400)); }
  const by = new Map(); let tot = 0;
  for (const v of window.__bin.values()) { tot += v.by; const k = v.kind.replace(/ \d+x\d+$/, '') + ' · ' + v.at; const e = by.get(k) || { by: 0, n: 0 }; e.by += v.by; e.n++; by.set(k, e); }
  return { tot, peak: window.__binPeak, top: [...by.entries()].sort((a, b) => b[1].by - a[1].by).slice(0, 30).map(([k, e]) => `${(e.by / 1048576).toFixed(1).padStart(6)} MB ×${e.n} ${k}`) };
});
console.log(`${town} ${q}: bloques grandes vivos al jugar ${(r.tot / 1048576).toFixed(0)} MB (pico durante la carga ${(r.peak / 1048576).toFixed(0)} MB)`);
console.log(r.top.join('\n'));
console.log(errs.length ? 'errores: ' + [...new Set(errs)].slice(0, 6).join(' | ') : 'sin errores');
await b.close();
