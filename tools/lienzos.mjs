// Cuenta la memoria de lienzos 2D que se crean al entrar en un pueblo (Safari en iPhone tiene un tope total; si se
// pasa, getContext devuelve null y la carga falla). Uso: node tools/lienzos.mjs [pueblo] [calidad]
import { chromium } from 'playwright-core';
const [,, town = 'pamplona', q = 'mid'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.addInitScript(() => {
  localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } }));
  const L = window.__canvasLog = []; const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...a) { if (!this.__logged && type === '2d') { this.__logged = true; L.push({ w: this.width, h: this.height, at: new Error().stack.split('\n')[2]?.trim().replace(/\(?http[^)]*\/src\//, '').slice(0, 90) }); } return orig.call(this, type, ...a); };
});
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=${q}`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 }); await p.waitForTimeout(4000);
console.log(await p.evaluate(() => {
  const L = window.__canvasLog; let tot = 0; const by = {};
  for (const c of L) { const mb = c.w * c.h * 4 / 1048576; tot += mb; const k = c.at; by[k] = by[k] || [0, 0, '']; by[k][0] += mb; by[k][1]++; by[k][2] = c.w + 'x' + c.h; }
  return `lienzos 2D creados: ${L.length}, ${tot.toFixed(0)} MB en total\n` + Object.entries(by).sort((a, b) => b[1][0] - a[1][0]).slice(0, 18).map(([k, [mb, n, s]]) => `${mb.toFixed(1)} MB  ${n}x (último ${s})  ${k}`).join('\n');
}));
await b.close();
