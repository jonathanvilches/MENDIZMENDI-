// ¿Qué código reserva más memoria de JavaScript mientras se carga un pueblo? Muestreo de reservas (incluidas las que
// luego se recogen) desde que se abre la página hasta que se puede jugar, sumado por función. Lo que más reserva es lo
// que sube el pico de memoria de la carga (en el iPhone, el pico es lo que hace que Safari cierre la página).
// Uso: node tools/memoria-carga.mjs [pueblo] [calidad]   (URL=http://127.0.0.1:5174/ por defecto: nombres legibles)
import { chromium } from 'playwright-core';
const [,, town = 'pamplona', q = 'low'] = process.argv;
const URL = (process.env.URL || 'http://127.0.0.1:5174/').replace(/\/?$/, '/');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const p = await ctx.newPage(), errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await p.addInitScript((q) => { try { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true }, settings: { quality: q } })); } catch (e) { } }, q);
const cdp = await ctx.newCDPSession(p);
await cdp.send('HeapProfiler.enable');
await cdp.send('HeapProfiler.startSampling', { samplingInterval: 32768, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
await p.goto(`${URL}?town=${town}&q=${q}&weather=clear&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play' && window.__rt?.active, null, { timeout: 900000 });
const { profile } = await cdp.send('HeapProfiler.stopSampling');
// suma por función (propia) y por función con lo que llama (total)
const self = new Map(), total = new Map(); let all = 0;
const name = (cf) => `${cf.functionName || '(anónima)'} ${cf.url.replace(/^https?:\/\/[^/]+\/(src\/|node_modules\/\.vite\/deps\/)?/, '').replace(/\?.*$/, '')}:${cf.lineNumber + 1}`;
const walk = (n, stack) => {
  const k = name(n.callFrame), s = n.selfSize; all += s;
  self.set(k, (self.get(k) || 0) + s);
  const seen = new Set(stack); if (!seen.has(k)) stack = [...stack, k];
  for (const c of n.children) walk(c, stack);
  // total: cada función de la pila suma lo de sus hijos (una vez)
  for (const f of new Set(stack)) total.set(f, (total.get(f) || 0) + s);
};
walk(profile.head, []);
const MB = (x) => (x / 1048576).toFixed(0).padStart(5) + ' MB';
console.log(`${town} ${q}: reservado durante la carga ${MB(all)}`);
console.log('— por función (lo suyo):');
for (const [k, v] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22)) console.log(`  ${MB(v)} ${k}`);
console.log('— por función con lo que llama (código del juego):');
for (const [k, v] of [...total.entries()].filter(([k]) => /^(?!\(root\)|\(anónima\) $)/.test(k) && !/node_modules|three\.module|chunk-|\.vite/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 30)) console.log(`  ${MB(v)} ${k}`);
console.log(errs.length ? 'errores: ' + [...new Set(errs)].slice(0, 6).join(' | ') : 'sin errores');
await b.close();
