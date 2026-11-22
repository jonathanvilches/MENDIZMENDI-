// Rueda las dos pantallas del juego que salen en el tráiler v4 tal cual son, fotograma a fotograma: «Elige tu pelotari»
// (el carrusel de cartas gira dos veces y se para en una) y la lámina de la ferrería moviéndose («Por dentro»). El reloj de
// la página va parado (page.clock): cada fotograma avanza 1/24 s y se hace la foto, así el carrusel y la lámina se mueven
// a su velocidad de verdad aunque cada foto tarde segundos.
// Uso: node tools/trailer/v4/pantallas.mjs <carpeta> [elige,lamina]   (URL=http://127.0.0.1:5173/ por defecto)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const [, , out, cuales = 'elige,lamina'] = process.argv, URL = process.env.URL || 'http://127.0.0.1:5173/', FPS = 24;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const perfil = () => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Beñat', avatar: 'pastor', seen: { heroBenat: true, dog: true, comoJugar: true }, dogOn: false, settings: { quality: 'high' } })); };
async function rueda(nombre, abre, seg, enFotograma = {}) {
  const dir = `${out}/${nombre}`; mkdirSync(dir, { recursive: true });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(perfil);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.clock.install();
  await abre(p);
  await p.clock.pauseAt(Date.now() + 1500);
  const n = Math.round(seg * FPS), t0 = Date.now();
  for (let i = 0; i < n; i++) {
    if (enFotograma[i]) await enFotograma[i](p);
    await p.clock.runFor(1000 / FPS);
    await p.screenshot({ path: `${dir}/${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 });
  }
  console.log(nombre, `${n} fotogramas`, `${Math.round((Date.now() - t0) / 1000)} s`, errs.length ? 'errores: ' + errs.slice(0, 3).join(' | ') : 'sin errores');
  await ctx.close();
}
const lista = cuales.split(',');
if (lista.includes('elige')) await rueda('v4Elige', async (p) => {
  // (como al jugar: Campeonatos, el Labrit, partido libre y la pantalla de elegir pelotari)
  await p.goto(`${URL}?screen=sports&q=high`, { timeout: 300000 });
  await p.waitForFunction(() => window.__hub && !document.querySelector('#hub.hidden'), null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelector('[data-frpick]')?.click(); document.querySelector('[data-fronton="labrit"]')?.click(); }); await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelector('[data-sport="pelota"]').click());
  await p.waitForFunction(() => document.querySelector('.lg-root [data-a="libre"]'), null, { timeout: 600000 });
  await p.evaluate(() => document.querySelector('.lg-root [data-a="libre"]').click());
  await p.waitForFunction(() => document.querySelector('.ep-pant [data-a="ok"]'), null, { timeout: 120000 });
  await p.waitForTimeout(4000);
}, 2.1, {
  // (dos pasos a la derecha, uno tras otro, y se para en la carta)
  6: (p) => p.evaluate(() => document.querySelector('.ep-pant .c3-flecha.der')?.click()),
  20: (p) => p.evaluate(() => document.querySelector('.ep-pant .c3-flecha.der')?.click()),
});
if (lista.includes('lamina')) await rueda('v4Lamina', async (p) => {
  // (la lámina de la ferrería, en el paso del mazo, como se abre en el juego)
  await p.goto(`${URL}anatomia/ferreria.html?juego&paso=4`, { timeout: 300000 });
  await p.waitForTimeout(3000);
}, 1.9);
await b.close();
