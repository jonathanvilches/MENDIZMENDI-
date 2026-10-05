// Memoria durante una partida (lo que puede cerrar Safari en el iPhone mientras se juega, no solo al entrar): se entra
// desde el menú y se juega solo unos minutos en un móvil emulado, por fases, apuntando la memoria en cada una:
//   pasear (con giros de cámara, que suben a la gráfica lo que aún no se había visto) · hablar con los vecinos (retratos)
//   · paneles (libro, mapa, mochila) · flora (fichas con su imagen) · pelota (partido simulado) · fútbol (unos segundos
//   de partido: El Sadar en Pamplona, la pista en los demás) · viajar y volver
// Mide: JavaScript, datos binarios, memoria gráfica real de WebGL (por contexto), contextos a la vez, lienzos 2D y los
// procesos del navegador (con Swiftshader, la gráfica vive en el proceso de la GPU).
// Uso: node tools/memoria-juego.mjs [pueblo] [pueblo para viajar] [calidad]   (URL=http://127.0.0.1:5180/: versión web)
import { chromium } from 'playwright-core';
import { execSync } from 'child_process';
const [,, town = 'pamplona', other = 'lesaka', q = 'low'] = process.argv;
const BASE = (process.env.URL || 'http://127.0.0.1:5180/').replace(/\/?$/, '/');
const chromePids = () => { try { return execSync('ps -eo pid=,args=').toString().split('\n').filter(l => /chrome-linux\/chrome/.test(l) && !/--type=/.test(l)).map(l => +l.trim().split(/\s+/)[0]); } catch (e) { return []; } };
const before = new Set(chromePids());
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const bpid = chromePids().find(x => !before.has(x));
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
const p = await ctx.newPage(), errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
p.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)); });
await p.addInitScript((q) => {
  try { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true }, settings: { quality: q } })); } catch (e) { }
  // memoria gráfica real: cada reserva y cada borrado, por contexto (como en tools/memoria-real.mjs)
  const M = window.__gm = { tex: 0, buf: 0, rb: 0, ctx: 0, made: 0, byCtx: [] };
  const BPP = { 0x1908: 4, 0x1907: 4, 0x1903: 1, 0x8227: 2, 0x1909: 1, 0x190A: 2, 0x1906: 1, 0x1902: 4, 0x84F9: 4 };
  const IBPP = { 0x8058: 4, 0x8C43: 4, 0x8051: 4, 0x8C41: 4, 0x8229: 1, 0x822B: 2, 0x881A: 8, 0x8814: 16, 0x822D: 2, 0x822E: 4, 0x8230: 8, 0x8D62: 2, 0x81A5: 2, 0x81A6: 4, 0x8CAC: 4, 0x88F0: 4, 0x8CAD: 8, 0x8D48: 1, 0x8C3A: 4, 0x8C3D: 4, 0x8059: 4, 0x8056: 2, 0x8057: 2 };
  const st = (gl) => gl.__st || (gl.__st = (() => { const s = { tex: new Map(), buf: new Map(), rb: new Map(), bb: {}, brb: null, unit: 0, units: {}, total: 0 }; M.byCtx.push(s); M.ctx++; M.made++; return s; })());
  const add = (s, kind, d) => { M[kind] += d; s.total += d; };
  for (const P of [window.WebGL2RenderingContext?.prototype, window.WebGLRenderingContext?.prototype].filter(Boolean)) {
    const w = (name, f) => { const o = P[name]; if (!o) return; P[name] = function (...a) { try { f.call(this, st(this), ...a); } catch (e) { } return o.apply(this, a); }; };
    w('activeTexture', function (s, u) { s.unit = u; });
    w('bindTexture', function (s, target, t) { s.units[s.unit + ':' + (target >= 0x8515 && target <= 0x851A ? 0x8513 : target)] = t; });
    const boundTex = (s, target) => s.units[s.unit + ':' + ((target >= 0x8515 && target <= 0x851A) ? 0x8513 : target)];
    const setLevel = (s, t, key, bytes) => { if (!t) return; let m = s.tex.get(t); if (!m) s.tex.set(t, m = new Map()); const old = m.get(key) || 0; m.set(key, bytes); add(s, 'tex', bytes - old); };
    w('texImage2D', function (s, target, level, ifmt, ...r) { let wdt, hgt, fmt; if (r.length >= 6) { [wdt, hgt, , fmt] = r; } else { [fmt] = r; const src = r[2]; wdt = src?.width || 0; hgt = src?.height || 0; } setLevel(s, boundTex(s, target), target + ':' + level, wdt * hgt * (IBPP[ifmt] || BPP[fmt] || 4)); });
    w('texStorage2D', function (s, target, levels, ifmt, wdt, hgt) { let by = 0; for (let l = 0; l < levels; l++) by += Math.max(1, wdt >> l) * Math.max(1, hgt >> l) * (IBPP[ifmt] || 4); setLevel(s, boundTex(s, target), 'storage', by * (target === 0x8513 ? 6 : 1)); });
    w('texStorage3D', function (s, target, levels, ifmt, wdt, hgt, dep) { let by = 0; for (let l = 0; l < levels; l++) by += Math.max(1, wdt >> l) * Math.max(1, hgt >> l) * dep * (IBPP[ifmt] || 4); setLevel(s, boundTex(s, target), 'storage', by); });
    w('generateMipmap', function (s, target) { const t = boundTex(s, target), m = t && s.tex.get(t); if (!m || m.has('storage')) return; setLevel(s, t, target + ':mips', Math.round((m.get(target + ':0') || 0) / 3)); });
    w('deleteTexture', function (s, t) { const m = s.tex.get(t); if (!m) return; let by = 0; for (const v of m.values()) by += v; add(s, 'tex', -by); s.tex.delete(t); });
    w('bindBuffer', function (s, target, buf) { s.bb[target] = buf; });
    w('bufferData', function (s, target, a1) { const buf = s.bb[target]; if (!buf) return; const by = typeof a1 === 'number' ? a1 : (a1?.byteLength || 0); const old = s.buf.get(buf) || 0; s.buf.set(buf, by); add(s, 'buf', by - old); });
    w('deleteBuffer', function (s, buf) { const by = s.buf.get(buf); if (by == null) return; add(s, 'buf', -by); s.buf.delete(buf); });
    w('bindRenderbuffer', function (s, target, rb) { s.brb = rb; });
    w('renderbufferStorage', function (s, target, ifmt, wdt, hgt) { const rb = s.brb; if (!rb) return; const by = wdt * hgt * (IBPP[ifmt] || 4); const old = s.rb.get(rb) || 0; s.rb.set(rb, by); add(s, 'rb', by - old); });
    w('renderbufferStorageMultisample', function (s, target, smp, ifmt, wdt, hgt) { const rb = s.brb; if (!rb) return; const by = wdt * hgt * (IBPP[ifmt] || 4) * Math.max(1, smp); const old = s.rb.get(rb) || 0; s.rb.set(rb, by); add(s, 'rb', by - old); });
    w('deleteRenderbuffer', function (s, rb) { const by = s.rb.get(rb); if (by == null) return; add(s, 'rb', -by); s.rb.delete(rb); });
  }
  const release = (gl) => { const s = gl.__st; if (!s || s.dead) return; s.dead = true; M.tex -= [...s.tex.values()].reduce((a, m) => a + [...m.values()].reduce((x, y) => x + y, 0), 0); M.buf -= [...s.buf.values()].reduce((a, v) => a + v, 0); M.rb -= [...s.rb.values()].reduce((a, v) => a + v, 0); M.ctx--; };
  const gx = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...a) { const c = gx.call(this, type, ...a); if (c && /webgl/.test(type) && !c.__wired) { c.__wired = true; st(c).who = new Error().stack.split('\n').slice(2, 9).map(x => x.trim().replace(/^at /, '').replace(/\(?https?:\/\/[^/]+\/(src\/|assets\/|node_modules\/\.vite\/deps\/)?/, '').replace(/\?[^:)]*/, '').slice(0, 52)).join(' < '); st(c).phase = window.__phase || ''; this.addEventListener('webglcontextlost', () => release(c)); } return c; };
  const C = window.__canvases = []; const ce = Document.prototype.createElement;
  Document.prototype.createElement = function (t, ...r) { const e = ce.call(this, t, ...r); if (String(t).toLowerCase() === 'canvas') C.push(new WeakRef(e)); return e; };
  // lo que se abra durante la partida (diálogos, preguntas, fichas, paneles) se va cerrando solo
  setInterval(() => {
    if (!window.__auto) return;
    const d = document.querySelector('#dialog'); if (d) { d.click(); d.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); }
    for (const sel of ['#reward button', '.mg-overlay .opts button', '.mg-overlay .btn.primary', '.mg-overlay button.btn', '.fc-sec ~ .btn', '.ficha .btn']) { const x = document.querySelector(sel); if (x) { x.click(); break; } }
  }, 450);
}, q);
const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable');
const procs = () => { try { const rows = execSync('ps -eo pid=,ppid=,rss=,args=', { maxBuffer: 1 << 24 }).toString().trim().split('\n').map(l => { const m = l.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/); return m && { pid: +m[1], ppid: +m[2], rss: +m[3], args: m[4] }; }).filter(Boolean);
  const kids = new Set([bpid]); let grew = true; while (grew) { grew = false; for (const r of rows) if (kids.has(r.ppid) && !kids.has(r.pid)) { kids.add(r.pid); grew = true; } }
  const mine = rows.filter(r => kids.has(r.pid)), sum = (re) => Math.round(mine.filter(r => re.test(r.args)).reduce((a, r) => a + r.rss, 0) / 1024);
  return { render: sum(/--type=renderer/), gpu: sum(/--type=gpu-process/) }; } catch (e) { return { render: 0, gpu: 0 }; } };
const MB = (x) => Math.round(x / 1048576);
const sample = async () => {
  const m = (await cdp.send('Performance.getMetrics')).metrics, heap = MB(m.find(x => x.name === 'JSHeapUsedSize')?.value || 0);
  const hu = await cdp.send('Runtime.getHeapUsage').catch(() => ({})), ab = MB(hu.backingStorageSize || 0);
  const g = await p.evaluate(() => { const M = window.__gm, cs = window.__canvases.map(w => w.deref()).filter(Boolean); return { gl: M.tex + M.buf + M.rb, tex: M.tex, ctx: M.ctx, made: M.made, lpx: cs.reduce((s, c) => s + (c.width || 0) * (c.height || 0), 0), dom: document.getElementsByTagName('*').length }; }).catch(() => null);
  return { heap, ab, ...(g || {}), ...procs(), t: Date.now() };
};
let phase = 'menú'; const rows = new Map();
const note = (s) => { if (!s) return; const r = rows.get(phase) || { max: {}, end: null }; for (const k of ['render', 'gpu', 'heap', 'ab', 'gl', 'ctx', 'lpx', 'dom']) r.max[k] = Math.max(r.max[k] || 0, s[k] || 0); r.end = s; rows.set(phase, r); };
const timer = setInterval(async () => note(await sample().catch(() => null)), 500);
const playing = (t) => p.waitForFunction((t) => window.__game && window.__game.def?.id === t && window.__game.mode === 'play' && window.__rt?.active, t, { timeout: 900000 });
const wait = (ms) => p.waitForTimeout(ms);
const step = async (name, fn) => { phase = name; await p.evaluate((n) => { window.__phase = n; }, name).catch(() => {}); const t0 = Date.now(); try { await fn(); } catch (e) { errs.push(`${name}: ${e.message.split('\n')[0].slice(0, 120)}`); } note(await sample().catch(() => null)); console.log(`· ${name} (${Math.round((Date.now() - t0) / 1000)} s)`); };

await step('menú', async () => { await p.goto(BASE, { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 }); await wait(5000); });
await step('entrar', async () => { await p.evaluate((t) => window.__hub.play(t), town); await playing(town); await wait(4000); });
// (la presentación con vuelo de cámara sobre el pueblo, si la hay: con el navegador automatizado no sale sola)
await step('vuelo de llegada', async () => { await p.evaluate(() => window.__game.introFly?.()); await wait(1500); });
await p.evaluate(() => { window.__auto = true; });
await step('pasear y girar', async () => {
  // por los alrededores del pueblo: a cada punto, una vuelta completa de la cámara
  const pts = await p.evaluate(() => { const G = window.__game, out = [], A = (G.actors || []).map(a => { const o = a.root || a.group || a.obj; return o?.position ? { x: o.position.x, z: o.position.z } : null; }).filter(Boolean); for (let i = 0; i < 24; i++) { const a = A[i % A.length] || { x: 0, z: 0 }; out.push({ x: a.x + (Math.random() - 0.5) * 30, z: a.z + (Math.random() - 0.5) * 30 }); } return out; });
  for (const pt of pts) {
    await p.evaluate((pt) => { const G = window.__game, pl = window.__rt.player; pl.place(pt.x, pt.z, Math.random() * 6.28); window.__rt.follow.snap(pl); }, pt);
    for (let k = 0; k < 4; k++) { await p.evaluate((k) => { const pl = window.__rt.player; pl.place(pl.pos.x, pl.pos.z, k * Math.PI / 2); window.__rt.follow.snap(pl); }, k); await wait(350); }
  }
});
await step('hablar con los vecinos', async () => {
  const n = await p.evaluate(() => (window.__game.actors || []).length);
  for (let i = 0; i < Math.min(n, 30); i++) { await p.evaluate((i) => { const G = window.__game, a = G.actors[i]; if (a && !document.querySelector('#dialog')) G.say(a, ['Kaixo!', '¿Qué tal?']); }, i); await wait(1400); }
});
await step('paneles', async () => {
  for (const f of ['openBook', 'openMap']) { await p.evaluate((f) => window.__game.ui[f](), f); await wait(2500); await p.evaluate(() => window.__game.ui.closeModal()); await wait(600); }
  await p.evaluate(() => window.__game.mochila?.open?.()); await wait(2500); await p.evaluate(() => { document.querySelector('.bp-card')?.closest('.mg-overlay, .screen, div[id]')?.remove(); window.__game.ui.closeModal?.(); }); await wait(600);
});
await step('flora', async () => {
  const n = await p.evaluate(() => window.__game.flora?.list?.length || 0);
  for (let i = 0; i < n; i++) { await p.evaluate((i) => { const G = window.__game, s = G.flora.list[i]; G.flora.interact(s); }, i); await wait(5000); }
});
await step('pelota', async () => {
  const ok = await p.evaluate(() => { const G = window.__game; if (!G.fronton) return false; window.__pres = null; G.fronton.play(G, G.pelotari || G.actors[0]).then(r => window.__pres = r); return true; });
  if (!ok) return;
  await p.waitForSelector('.pel-panel', { timeout: 60000 }); await wait(1000);
  await p.click('.pel-go[data-pel-go]').catch(() => {}); await wait(1500);
  await p.evaluate(() => { const m = window.__game.pelotaMatch; if (!m) return; m.game.autoplay = true; for (let i = 0; i < 90 * 30 && m.active; i++) m.update(1 / 30); });
  await wait(2500);
  await p.click('.pel-go[data-pel-cont]').catch(() => {}); await wait(3000);
});
await step('fútbol', async () => {
  // en Pamplona, el partido en El Sadar; en los demás, fútbol sala en la pista. Unos segundos de partido y fuera
  // (tras la pelota puede quedar abierto su panel: se cierra y se espera a estar jugando)
  await p.evaluate(() => { document.querySelector('.pel-go[data-pel-cont]')?.click(); window.__game.ui.closeModal?.(); });
  await p.waitForFunction(() => window.__game.mode === 'play', null, { timeout: 60000 }).catch(() => {});
  const kind = await p.evaluate(() => { const G = window.__game; return G.coach && G.sadar ? 'sadar' : G.futsalCoach && G.pista ? 'sala' : null; });
  if (!kind) return;
  await p.evaluate(() => { const G = window.__game; G.ui.dialog = async () => 0; let t = 0;
    window.__fsA = setInterval(() => { const m = window.__futbol; if (m && m.live && !m.done && m.intro <= 0) { if (!t) t = Date.now(); else if (Date.now() - t > 15000) m.exit({ win: true, you: 1, cpu: 0 }); } }, 500);
    window.__fsB = setInterval(() => { const b = document.querySelector('.fb-panel .fb-alt'); if (b) b.click(); const c = document.querySelector('.lg-root [data-a="sala"]'); if (c) c.click(); }, 700); });
  await Promise.race([p.evaluate((k) => k === 'sadar' ? window.__game.playFutbol() : window.__game.playFutsal(), kind), wait(240000)]);
  await p.evaluate(() => { clearInterval(window.__fsA); clearInterval(window.__fsB); });
  await wait(2000);
});
await step('viajar y volver', async () => {
  await p.evaluate((t) => window.__game.onPlayTown(t), other); await playing(other); await wait(3000);
  await p.evaluate((t) => window.__game.onPlayTown(t), town); await playing(town); await wait(4000);
});
clearInterval(timer);
await p.evaluate(() => window.gc?.()); await wait(1000); phase = 'final (tras recoger basura)'; note(await sample());
const alive = await p.evaluate(() => window.__gm.byCtx.filter(s => !s.dead).map(s => `${Math.round(s.total / 1048576)} MB · ${s.who}`));
console.log(`\n${town} (${q}) · fase: máximo de la página / GPU / JS / binarios / gráfica WebGL / contextos a la vez / lienzos / nodos`);
for (const [k, r] of rows) console.log(`  ${k.padEnd(28)} página ${String(r.max.render).padStart(4)} MB · GPU ${String(r.max.gpu).padStart(4)} MB · JS ${String(r.max.heap).padStart(4)} · binarios ${String(r.max.ab).padStart(4)} · gráfica ${String(MB(r.max.gl)).padStart(4)} · contextos ${r.max.ctx} · lienzos ${MB(r.max.lpx * 4)} MB · nodos ${r.max.dom}`);
const made = rows.get('final (tras recoger basura)')?.end?.made;
console.log(`contextos WebGL creados en toda la partida: ${made}; vivos al final:\n  ${alive.join('\n  ')}`);
if (process.env.QUIEN) console.log('quién crea cada contexto:\n  ' + (await p.evaluate(() => window.__gm.byCtx.map(s => `[${s.phase}] ${s.who}`))).join('\n  '));
console.log(errs.length ? 'errores: ' + [...new Set(errs)].slice(0, 8).join(' | ') : 'sin errores');
await b.close();
