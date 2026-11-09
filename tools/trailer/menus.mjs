// Fotos fijas del juego para el montaje del tráiler, a 1920 × 1080 por 2: pantallas del menú (personajes, mujeres, naturaleza,
// instrumentos, elegir personaje) y los dioramas 3D de los oficios y del deporte rural (aizkolari, harrijasotzaile,
// fragua…), sin los mandos encima. Uso: node tools/trailer/menus.mjs <carpeta> [qué,qué…]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const [, , out, solo] = process.argv; mkdirSync(out, { recursive: true });
const URL = process.env.URL || 'http://127.0.0.1:5173/';
// (a 2: la foto sale de 3840 × 2160 y el montaje la puede acercar sin agrandarla)
const DPR = +process.env.DPR || 2;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const init = () => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Beñat', avatar: 'pastor', seen: { heroBenat: true, dog: true, comoJugar: true }, settings: { quality: 'high' } })); };
const quiere = (k) => !solo || solo.split(',').includes(k);
// pantallas del menú
for (const sc of ['personajes', 'avatars', 'nature', 'instrumentos']) {
  if (!quiere(sc)) continue;
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: DPR }); await p.addInitScript(init);
  await p.goto(`${URL}?screen=${sc}`, { timeout: 300000 });
  await p.waitForFunction(() => window.__hub && !document.querySelector('#hub.hidden'), null, { timeout: 300000 });
  await p.evaluate((sc) => window.__hub.go?.(sc), sc).catch(() => { });
  await p.waitForTimeout(9000);
  await p.screenshot({ path: `${out}/menu-${sc}.png` });
  await p.close();
}
// dioramas de los oficios (lab/oficios.html: el escenario 3D con su luz), sin la interfaz del minijuego
const DIO = { aizkora: ['timingGame', { art: 'chop', title: 'Aizkolari', verb: '¡Golpe!' }], harri: ['mashGame', { art: 'lift', title: 'Levantar la piedra', verb: '¡Arriba!' }], fragua: ['timingGame', { art: 'anvil', title: 'La fragua', verb: '¡Golpe!' }] };
for (const [k, [fn, o]] of Object.entries(DIO)) {
  if (!quiere(k)) continue;
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: DPR }); await p.addInitScript(init); const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.goto(`${URL}lab/oficios.html`, { timeout: 300000 });
  await p.waitForFunction(() => window.__ready, null, { timeout: 120000 });
  await p.evaluate(([fn, o]) => window.__mg(fn, o, true), [fn, o]);
  await p.waitForTimeout(12000);
  // (fuera lo que va encima del lienzo 3D: rótulos, barras y botones del minijuego)
  await p.addStyleTag({ content: 'body *:not(canvas){visibility:hidden!important} canvas{visibility:visible!important}' });
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/dio-${k}.png` });
  console.log(k, errs.slice(0, 2));
  await p.close();
}
await b.close();
