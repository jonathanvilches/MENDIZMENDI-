// Fotos fijas del tráiler para inversores: las pantallas del juego (campeonatos de pelota, pasaporte con sellos, ventajas
// en los comercios, láminas) a 1920 × 1080, con un perfil de ejemplo que ya tiene sellos en varios pueblos.
// Uso: node tools/trailer/capturas-menu.mjs <carpeta>   (URL=http://127.0.0.1:5173/ por defecto)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const [, , out] = process.argv, URL = process.env.URL || 'http://127.0.0.1:5173/';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); window.__paseo = true; window.__sinVideoIsla = true; });
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
// (primero el perfil de ejemplo: sellos en los pueblos de varias comarcas)
await p.goto(`${URL}?skipintro=1&q=high`, { timeout: 300000 });
await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
await p.evaluate(async () => {
  const { LEVELS } = await import('/src/data/levels.js');
  const perfil = { v: 1, name: 'Ane', avatar: 'explorador', seen: { heroBenat: true, dog: true, comoJugar: true }, dogOn: false, settings: { quality: 'high' }, towns: {} };
  LEVELS.forEach((l, i) => { if (i % 3 !== 2) perfil.towns[l.id] = { done: {}, stamp: i % 2 === 0 || i < 8, visits: 2 }; });
  localStorage.setItem('herrizherri-perfil-v1', JSON.stringify(perfil));
});
const pantallas = (process.env.PANTALLAS || 'sports,passport,ventajas,album,badges').split(',');
for (const s of pantallas) {
  await p.goto(`${URL}?skipintro=1&q=high&screen=${s}`, { timeout: 300000 });
  await p.waitForFunction(() => window.__hub && !document.querySelector('#hub.hidden'), null, { timeout: 300000 }).catch(() => { });
  await p.waitForTimeout(+(process.env.ESPERA || 9000));
  await p.screenshot({ path: `${out}/menu-${s}.png` });
  console.log(s);
}
console.log(errs.length ? 'errores: ' + errs.slice(0, 3).join(' | ') : 'sin errores');
await b.close();
