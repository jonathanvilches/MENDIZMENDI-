// Varias visitas seguidas (menú → pueblo → salir → otro pueblo…) en un móvil emulado, midiendo la memoria de
// JavaScript y la de lienzos 2D vivos. Si crece sin parar, hay una fuga. Uso: node tools/visitas.mjs [pueblos]
import { chromium } from 'playwright-core';
const [,, towns = 'lesaka,pamplona,tudela,ochagavia,estella'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--js-flags=--expose-gc'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 4).join(' | ')));
await p.addInitScript(() => {
  localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true } }));
  // lienzos vivos: se guardan con WeakRef y se suman los que siguen existiendo y tienen tamaño
  const live = window.__canvases = []; const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, ...a) { if (!this.__r) { this.__r = 1; live.push(new WeakRef(this)); } return orig.call(this, t, ...a); };
});
const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable');
const measure = async (label) => {
  await p.evaluate(() => window.gc?.());
  const m = (await cdp.send('Performance.getMetrics')).metrics, heap = (m.find(x => x.name === 'JSHeapUsedSize').value / 1048576).toFixed(0);
  const cv = await p.evaluate(() => { let mb = 0, n = 0; for (const r of window.__canvases) { const c = r.deref(); if (c && c.width > 1) { mb += c.width * c.height * 4 / 1048576; n++; } } return mb.toFixed(0) + ' MB en ' + n; });
  const gl = await p.evaluate(() => window.__rt?.renderer.info.memory ? JSON.stringify(window.__rt.renderer.info.memory) : '');
  console.log(label.padEnd(22), 'JS', heap, 'MB · lienzos vivos', cv, '·', gl);
};
await p.goto('http://127.0.0.1:5173/', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 }); await p.waitForTimeout(4000);
await measure('menú');
for (const town of towns.split(',')) {
  await p.evaluate((id) => { const H = window.__hub; H.play(id); }, town);
  await p.waitForFunction(() => window.__game && ['play', 'cine'].includes(window.__game.mode), null, { timeout: 600000 });
  await p.waitForTimeout(6000);
  await measure('en ' + town);
  await p.evaluate(() => { const G = window.__game; (G.onExit || G.exit || (() => {}))(); });
  await p.waitForTimeout(3000);
  await measure('de vuelta al menú');
}
console.log('errores', JSON.stringify(errs.slice(0, 5)));
await b.close();
