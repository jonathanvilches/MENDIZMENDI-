// Perfil de CPU mientras se juega (no durante la carga): entra en un pueblo como un móvil, camina unos segundos y
// lista las funciones que más tiempo propio gastan (y por archivo). Uso: node tools/playprof.mjs [url] [pueblo] [segundos]
import { chromium } from 'playwright-core';
const [,, base = 'http://127.0.0.1:5173/', town = 'lesaka', secs = '10'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); localStorage.setItem('mendimendiz-lang', 'es'); });
await p.goto(`${base}?town=${town}&weather=clear&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.waitForTimeout(5000);
// la cámara gira despacio y el jugador anda (así el HUD, la brújula y el minimapa cambian como al jugar)
await p.evaluate(() => { const rt = window.__rt; window.__walk = setInterval(() => { rt.follow.yaw += 0.01; }, 16); rt.input.keys?.add?.('w'); });
const cdp = await p.context().newCDPSession(p);
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start');
await p.evaluate(() => { window.__nf = 0; const f = () => { window.__nf++; requestAnimationFrame(f); }; requestAnimationFrame(f); });
await p.waitForTimeout(+secs * 1000);
const { profile } = await cdp.send('Profiler.stop');
const nf = await p.evaluate(() => window.__nf);
const self = new Map(); const dts = profile.timeDeltas; const byId = new Map(profile.nodes.map(n => [n.id, n]));
profile.samples.forEach((id, i) => self.set(id, (self.get(id) || 0) + (dts[i] || 0)));
const fn = new Map(), file = new Map(); let total = 0;
for (const [id, t] of self) { const n = byId.get(id), cf = n.callFrame; total += t;
  const f = (cf.url.split('/').pop().split('?')[0] || '(' + cf.functionName + ')'); const k = `${cf.functionName || '(anon)'} ${f}:${cf.lineNumber + 1}`;
  fn.set(k, (fn.get(k) || 0) + t); file.set(f, (file.get(f) || 0) + t); }
const top = (m, n) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${(v / 1000).toFixed(0).padStart(6)} ms ${(100 * v / total).toFixed(1).padStart(5)}%  ${k}`).join('\n');
const busy = total - (file.get('(idle)') || 0) - (file.get('(program)') || 0);
console.log(`${nf} fotogramas en ${secs} s · CPU ocupada ${(busy / 1000).toFixed(0)} ms → ${(busy / 1000 / Math.max(1, nf)).toFixed(1)} ms por fotograma`);
console.log('--- por archivo\n' + top(file, 18)); console.log('--- por función\n' + top(fn, 30));
await b.close();
