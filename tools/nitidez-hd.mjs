// ¿El archivo único cambia sus imágenes pequeñas por las grandes de la web? Abre el HTML compilado como lo abre el
// móvil (file://), sirve la web publicada desde la copia local de docs/ (si no, no se puede probar sin red) y mide la
// nitidez de cada pantalla al llegar y unos segundos después (src/web/hd.js). SIN_RED=1: como el móvil sin conexión.
// Uso: node tools/nitidez-hd.mjs [HERRIZHERRI-jugar.html]   (DPR=3, 844 × 390)
import { chromium } from 'playwright-core';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { medirEnPagina } from './nitidez-medir.mjs';
const file = resolve(process.argv[2] || 'HERRIZHERRI-jugar.html');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
let pedidas = 0, servidas = 0;
await ctx.route('https://jonathanvilches.github.io/MENDIZMENDI-/**', (r) => {
  pedidas++; const f = resolve('docs', new URL(r.request().url()).pathname.replace(/^\/MENDIZMENDI-\//, ''));
  if (process.env.SIN_RED || !existsSync(f)) return r.abort();
  servidas++; const ct = f.endsWith('.json') ? 'application/json' : f.endsWith('.webp') ? 'image/webp' : 'application/octet-stream';
  return r.fulfill({ status: 200, body: readFileSync(f), headers: { 'content-type': ct, 'access-control-allow-origin': '*' } });
});
const p = await ctx.newPage();
await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true }, last: 'altsasu-alsasua', settings: { quality: 'low' } })); });
await p.goto('file://' + file, { timeout: 300000 }); await p.waitForFunction(() => window.__hub?.visible, null, { timeout: 300000 });
const peor = (r) => r.filter(x => x.up > 1.5).map(x => `${x.img} ${x.up}`);
for (const [scr, arg] of [['home'], ['comarca', 'sakana'], ['peaks'], ['sports'], ['profile'], ['nature']]) {
  await p.evaluate(([s, a]) => window.__hub.go(s, a), [scr, arg]); await p.waitForTimeout(800);
  const a = await p.evaluate(medirEnPagina); await p.waitForTimeout(5000); const c = await p.evaluate(medirEnPagina);
  console.log(`== ${scr}: pixeladas al llegar ${a.filter(x => x.up > 1.5).length}, a los 5 s ${c.filter(x => x.up > 1.5).length}`);
  for (const x of peor(c).slice(0, 4)) console.log('   ' + x);
}
console.log(`pedidas a la web ${pedidas}, servidas ${servidas}`);
await b.close();
