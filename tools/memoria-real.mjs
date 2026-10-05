// Memoria real al entrar en un pueblo en un móvil emulado, a lo largo de la carga (el pico es lo que hace que Safari
// cierre la página en el iPhone) y al final:
//  · gráfica: lo que se reserva de verdad en WebGL (texturas, búferes y renderbúferes), contando cada contexto vivo
//  · JavaScript: memoria usada del montón
//  · lienzos 2D vivos (Safari tiene un tope para todos juntos)
//  · procesos del navegador (con Swiftshader la gráfica vive en la RAM del proceso de la GPU)
// Uso: node tools/memoria-real.mjs [pueblo] [desde: url|hub|viaje] [calidad]   (URL=http://127.0.0.1:5180/: versión web)
//   url: se abre el pueblo directamente · hub: se entra desde el menú, como al jugar · viaje: desde Lesaka, viajando
import { chromium } from 'playwright-core';
import { execSync } from 'child_process';
const [,, town = 'pamplona', from = 'url', q = 'low'] = process.argv;
const URL = (process.env.URL || 'http://127.0.0.1:5180/').replace(/\/?$/, '/');
const chromePids = () => { try { return execSync('ps -eo pid=,args=').toString().split('\n').filter(l => /chrome-linux\/chrome/.test(l) && !/--type=/.test(l)).map(l => +l.trim().split(/\s+/)[0]); } catch (e) { return []; } };
const before = new Set(chromePids());
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
const p = await ctx.newPage(), errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
p.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)); });
await p.addInitScript((q) => {
  try { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true }, settings: { quality: q } })); } catch (e) { }
  // ---- memoria de la gráfica: cada reserva y cada borrado, por contexto
  const M = window.__gm = { tex: 0, buf: 0, rb: 0, peak: 0, ctx: 0, ctxPeak: 0, lost: 0, byCtx: [] };
  const BPP = { 0x1908: 4, 0x1907: 4, 0x1903: 1, 0x8227: 2, 0x1909: 1, 0x190A: 2, 0x1906: 1, 0x1902: 4, 0x84F9: 4 };   // RGBA, RGB(4), RED, RG, LUMINANCE, LUM_ALPHA, ALPHA, DEPTH, DEPTH_STENCIL
  const IBPP = { 0x8058: 4, 0x8C43: 4, 0x8051: 4, 0x8C41: 4, 0x8229: 1, 0x822B: 2, 0x881A: 8, 0x8814: 16, 0x822D: 2, 0x822E: 4, 0x8230: 8, 0x8D62: 2, 0x81A5: 2, 0x81A6: 4, 0x8CAC: 4, 0x88F0: 4, 0x8CAD: 8, 0x8D48: 1, 0x8C3A: 4, 0x8C3D: 4, 0x8059: 4, 0x8056: 2, 0x8057: 2 };
  const typeMul = (t) => t === 0x1406 ? 4 : (t === 0x140B || t === 0x8D61) ? 2 : 1;   // FLOAT ×4, HALF_FLOAT ×2
  const st = (gl) => gl.__st || (gl.__st = (() => { const s = { tex: new Map(), buf: new Map(), rb: new Map(), bt: {}, bb: {}, brb: null, unit: 0, units: {}, total: 0 }; M.byCtx.push(s); M.ctx++; M.ctxPeak = Math.max(M.ctxPeak, M.ctx); return s; })());
  const upd = () => { const t = M.tex + M.buf + M.rb; if (t > M.peak) M.peak = t; };
  const add = (s, kind, d) => { M[kind] += d; s.total += d; upd(); };
  for (const P of [window.WebGL2RenderingContext?.prototype, window.WebGLRenderingContext?.prototype].filter(Boolean)) {
    const w = (name, f) => { const o = P[name]; if (!o) return; P[name] = function (...a) { try { f.call(this, st(this), ...a); } catch (e) { } return o.apply(this, a); }; };
    w('activeTexture', function (s, u) { s.unit = u; });
    w('bindTexture', function (s, target, t) { s.units[s.unit + ':' + (target === 0x8513 || (target >= 0x8515 && target <= 0x851A) ? 0x8513 : target)] = t; });
    const boundTex = (s, target) => s.units[s.unit + ':' + ((target >= 0x8515 && target <= 0x851A) ? 0x8513 : target)];
    const setLevel = (s, t, key, bytes) => { if (!t) return; let m = s.tex.get(t); if (!m) s.tex.set(t, m = new Map()); const old = m.get(key) || 0; m.set(key, bytes); add(s, 'tex', bytes - old); };
    w('texImage2D', function (s, target, level, ifmt, ...r) {
      let wdt, hgt, fmt, type;
      if (r.length >= 6) { [wdt, hgt, , fmt, type] = r; } else { [fmt, type] = r; const src = r[2]; wdt = src?.width || src?.videoWidth || 0; hgt = src?.height || src?.videoHeight || 0; }
      setLevel(s, boundTex(s, target), target + ':' + level, wdt * hgt * (IBPP[ifmt] || BPP[fmt] || 4) * (IBPP[ifmt] ? 1 : typeMul(type)));
    });
    w('texImage3D', function (s, target, level, ifmt, wdt, hgt, dep, border, fmt, type) { setLevel(s, boundTex(s, target), target + ':' + level, wdt * hgt * dep * (IBPP[ifmt] || 4)); });
    w('texStorage2D', function (s, target, levels, ifmt, wdt, hgt) { let by = 0; for (let l = 0; l < levels; l++) by += Math.max(1, wdt >> l) * Math.max(1, hgt >> l) * (IBPP[ifmt] || 4); setLevel(s, boundTex(s, target), 'storage', by * (target === 0x8513 ? 6 : 1)); });
    w('texStorage3D', function (s, target, levels, ifmt, wdt, hgt, dep) { let by = 0; for (let l = 0; l < levels; l++) by += Math.max(1, wdt >> l) * Math.max(1, hgt >> l) * dep * (IBPP[ifmt] || 4); setLevel(s, boundTex(s, target), 'storage', by); });
    w('compressedTexImage2D', function (s, target, level, ifmt, wdt, hgt, border, data) { setLevel(s, boundTex(s, target), target + ':' + level, data?.byteLength || 0); });
    w('generateMipmap', function (s, target) { const t = boundTex(s, target), m = t && s.tex.get(t); if (!m || m.has('storage')) return; const base = m.get(target + ':0') || 0; setLevel(s, t, target + ':mips', Math.round(base / 3)); });
    w('deleteTexture', function (s, t) { const m = s.tex.get(t); if (!m) return; let by = 0; for (const v of m.values()) by += v; add(s, 'tex', -by); s.tex.delete(t); });
    w('bindBuffer', function (s, target, buf) { s.bb[target] = buf; });
    w('bufferData', function (s, target, a1) { const buf = s.bb[target]; if (!buf) return; const by = typeof a1 === 'number' ? a1 : (a1?.byteLength || 0); const old = s.buf.get(buf) || 0; s.buf.set(buf, by); add(s, 'buf', by - old); });
    w('deleteBuffer', function (s, buf) { const by = s.buf.get(buf); if (by == null) return; add(s, 'buf', -by); s.buf.delete(buf); });
    w('bindRenderbuffer', function (s, target, rb) { s.brb = rb; });
    w('renderbufferStorage', function (s, target, ifmt, wdt, hgt) { const rb = s.brb; if (!rb) return; const by = wdt * hgt * (IBPP[ifmt] || 4); const old = s.rb.get(rb) || 0; s.rb.set(rb, by); add(s, 'rb', by - old); });
    w('renderbufferStorageMultisample', function (s, target, samples, ifmt, wdt, hgt) { const rb = s.brb; if (!rb) return; const by = wdt * hgt * (IBPP[ifmt] || 4) * Math.max(1, samples); const old = s.rb.get(rb) || 0; s.rb.set(rb, by); add(s, 'rb', by - old); });
    w('deleteRenderbuffer', function (s, rb) { const by = s.rb.get(rb); if (by == null) return; add(s, 'rb', -by); s.rb.delete(rb); });
  }
  // un contexto perdido o soltado (loseContext) libera todo lo suyo
  const lc = window.WEBGL_lose_context?.prototype;
  const release = (gl) => { const s = gl.__st; if (!s || s.dead) return; s.dead = true; M.tex -= [...s.tex.values()].reduce((a, m) => a + [...m.values()].reduce((x, y) => x + y, 0), 0); M.buf -= [...s.buf.values()].reduce((a, v) => a + v, 0); M.rb -= [...s.rb.values()].reduce((a, v) => a + v, 0); M.ctx--; M.lost++; };
  const gx = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...a) {
    const c = gx.call(this, type, ...a);
    if (c && /webgl/.test(type) && !c.__wired) { c.__wired = true; st(c).who = (new Error().stack.split('\n').slice(2, 6).map(x => x.trim().replace(/^at /, '').replace(/\(?https?:[^)]*\/(assets|src)\//, '').slice(0, 70)).join(' < ')); st(c).canvas = this; this.addEventListener('webglcontextlost', () => release(c)); }
    return c;
  };
  // lienzos 2D vivos
  const C = window.__canvases = []; const ce = Document.prototype.createElement;
  Document.prototype.createElement = function (t, ...r) { const e = ce.call(this, t, ...r); if (String(t).toLowerCase() === 'canvas') C.push(new WeakRef(e)); return e; };
  if (window.OffscreenCanvas) { const O = window.OffscreenCanvas; window.OffscreenCanvas = function (w, h) { const o = new O(w, h); C.push(new WeakRef(o)); return o; }; window.OffscreenCanvas.prototype = O.prototype; }
}, q);
const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable');
// procesos de este navegador (renderizador y GPU): RSS en MB
const bpid = chromePids().find(x => !before.has(x));   // el proceso principal de este navegador (el recién abierto)
const procs = () => { try { const rows = execSync('ps -eo pid=,ppid=,rss=,args=', { maxBuffer: 1 << 24 }).toString().trim().split('\n').map(l => { const m = l.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/); return m && { pid: +m[1], ppid: +m[2], rss: +m[3], args: m[4] }; }).filter(Boolean);
  const kids = new Set([bpid]); let grew = true; while (grew) { grew = false; for (const r of rows) if (kids.has(r.ppid) && !kids.has(r.pid)) { kids.add(r.pid); grew = true; } }
  const mine = rows.filter(r => kids.has(r.pid)), sum = (re) => Math.round(mine.filter(r => re.test(r.args)).reduce((a, r) => a + r.rss, 0) / 1024);
  return { render: sum(/--type=renderer/), gpu: sum(/--type=gpu-process/) }; } catch (e) { return { render: 0, gpu: 0 }; } };
const MB = (x) => Math.round(x / 1048576);
const sample = async () => {
  const m = (await cdp.send('Performance.getMetrics')).metrics, heap = MB(m.find(x => x.name === 'JSHeapUsedSize')?.value || 0);
  const hu = await cdp.send('Runtime.getHeapUsage').catch(() => ({})), ab = MB(hu.backingStorageSize || 0);   // búferes binarios (ArrayBuffer): geometría, modelos, imágenes decodificadas en JS
  const g = await p.evaluate(() => { const M = window.__gm, cs = window.__canvases.map(w => w.deref()).filter(Boolean); return { tex: M.tex, buf: M.buf, rb: M.rb, peak: M.peak, ctx: M.ctx, ctxPeak: M.ctxPeak, lienzos: cs.length, lpx: cs.reduce((s, c) => s + (c.width || 0) * (c.height || 0), 0), fase: (document.querySelector('.ld-pc')?.textContent || '') + ' ' + (document.querySelector('.ld-pc')?.closest('div[class]')?.parentElement?.querySelector('.msg')?.textContent || document.querySelector('.msg')?.textContent || '').slice(0, 34) }; }).catch(() => null);
  return { heap, ab, ...(g || {}), ...procs() };
};
const peaks = { heap: 0, ab: 0, gpuGL: 0, render: 0, gpu: 0, lienzosMB: 0, ctx: 0 };
let timer = null; const series = [];
const watch = () => { timer = setInterval(async () => { const s = await sample().catch(() => null); if (!s) return; s.t = Date.now(); series.push(s); peaks.heap = Math.max(peaks.heap, s.heap); peaks.ab = Math.max(peaks.ab, s.ab); peaks.gpuGL = Math.max(peaks.gpuGL, MB(s.peak || 0)); peaks.render = Math.max(peaks.render, s.render); peaks.gpu = Math.max(peaks.gpu, s.gpu); peaks.lienzosMB = Math.max(peaks.lienzosMB, MB((s.lpx || 0) * 4)); peaks.ctx = Math.max(peaks.ctx, s.ctxPeak || 0); }, 400); };
const line = (t, s) => console.log(`${t.padEnd(26)} JS ${String(s.heap).padStart(4)} MB · binarios ${String(s.ab).padStart(4)} MB · gráfica ${String(MB(s.tex + s.buf + s.rb)).padStart(4)} MB (texturas ${MB(s.tex)}, búferes ${MB(s.buf)}, render ${MB(s.rb)}) · contextos ${s.ctx} · lienzos ${s.lienzos} (${MB(s.lpx * 4)} MB) · procesos: página ${s.render} MB, GPU ${s.gpu} MB`);
const dumpCtx = async () => console.log('contextos vivos:\n  ' + (await p.evaluate(() => window.__gm.byCtx.filter(s => !s.dead).map(s => `${Math.round(s.total / 1048576)} MB (búferes ${Math.round([...s.buf.values()].reduce((a, v) => a + v, 0) / 1048576)}) · lienzo ${s.canvas ? (s.canvas.id || s.canvas.className || 'sin nombre') + ' ' + s.canvas.width + 'x' + s.canvas.height + (s.canvas.isConnected ? '' : ' (fuera de la página)') : '?'} · ${s.who || ''}`))).join('\n  '));
const t0 = Date.now();
const inTown = (t) => p.waitForFunction((t) => window.__game && window.__game.def?.id === t && window.__game.mode === 'play' && window.__rt?.active, t, { timeout: 900000 });
if (from === 'hub') {
  await p.goto(URL, { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 }); await p.waitForTimeout(4000);
  line('menú', await sample()); await dumpCtx();
  watch();
  await p.evaluate((t) => window.__hub.play(t), town);   // como al tocar el pueblo en el mapa
} else if (from === 'viaje') {
  await p.goto(`${URL}?town=lesaka&q=${q}&weather=clear&skipintro=1`, { timeout: 300000 }); await inTown('lesaka'); await p.waitForTimeout(4000);
  line('Lesaka', await sample());
  watch();
  await p.evaluate((t) => window.__game.onPlayTown(t), town);
} else {
  watch();
  await p.goto(`${URL}?town=${town}&q=${q}&weather=clear&skipintro=1`, { timeout: 300000 });
}
await inTown(town);
const tPlay = ((Date.now() - t0) / 1000).toFixed(0);
await p.waitForTimeout(8000);   // los primeros segundos de juego (retratos, sombras, programas)
clearInterval(timer);
const end = await sample();
line(`${town} al jugar (${tPlay} s)`, end);
await p.evaluate(() => window.gc?.()); await p.waitForTimeout(800);
line(`${town} tras recoger basura`, await sample());
await dumpCtx();
console.log(`PICO durante la carga: JS ${peaks.heap} MB · binarios ${peaks.ab} MB · gráfica ${peaks.gpuGL} MB · contextos a la vez ${peaks.ctx} · lienzos ${peaks.lienzosMB} MB · procesos: página ${peaks.render} MB, GPU ${peaks.gpu} MB`);
if (process.env.TIMELINE) { const t0s = series[0]?.t || 0; console.log('— a lo largo de la carga (cada ~2 s):'); let last = -9; for (const s of series) { if (s.t - last < 2000) continue; last = s.t; console.log(`  ${((s.t - t0s) / 1000).toFixed(0).padStart(3)} s · página ${String(s.render).padStart(4)} MB · JS ${String(s.heap).padStart(4)} · binarios ${String(s.ab).padStart(4)} · gráfica ${String(MB(s.tex + s.buf + s.rb)).padStart(4)} · ${s.fase || ''}`); } }
console.log(errs.length ? 'errores: ' + [...new Set(errs)].slice(0, 6).join(' | ') : 'sin errores');
await b.close();
