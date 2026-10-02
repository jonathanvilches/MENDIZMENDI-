// Compara la versión de un solo archivo con la versión web (docs/) en un móvil emulado: tiempo hasta jugar, bytes
// descargados y memoria de JavaScript al entrar en un pueblo. Sirve cada versión por HTTP en localhost.
// Uso: node tools/memoria-web.mjs <url> [pueblo]   p. ej. http://localhost:8099/  pamplona
import { chromium } from 'playwright-core';
const [,, url, town = 'pamplona'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
const p = await ctx.newPage(), errs = []; let bytes = 0, reqs = 0;
p.on('pageerror', e => errs.push(e.message.slice(0, 140)));
p.on('response', async r => { reqs++; try { const l = +(r.headers()['content-length'] || 0); bytes += l || (await r.body()).length; } catch (e) { } });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable');
const heap = async () => { await p.evaluate(() => window.gc?.()); const m = (await cdp.send('Performance.getMetrics')).metrics; const g = (n) => (m.find(x => x.name === n)?.value / 1048576).toFixed(0); return `${g('JSHeapUsedSize')}/${g('JSHeapTotalSize')} MB`; };
const t0 = Date.now();
await p.goto(url, { timeout: 300000 });
await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
console.log('menú', ((Date.now() - t0) / 1000).toFixed(1) + 's', (bytes / 1048576).toFixed(1) + ' MB bajados', reqs + ' peticiones', 'memoria JS', await heap());
await p.goto(url + (url.includes('?') ? '&' : '?') + `town=${town}&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.waitForTimeout(2000);
const info = await p.evaluate(() => ({ calidad: window.__rt.quality, pr: window.__rt.renderer.getPixelRatio(), tex: window.__rt.renderer.info.memory.textures, geo: window.__rt.renderer.info.memory.geometries, sw: !!navigator.serviceWorker?.controller }));
console.log(town, ((Date.now() - t0) / 1000).toFixed(1) + 's', (bytes / 1048576).toFixed(1) + ' MB bajados en total', 'memoria JS', await heap(), JSON.stringify(info));
console.log(errs.length ? 'errores: ' + errs.join(' | ') : 'sin errores');
await b.close();
