// Rueda el mapa del inicio para el tráiler, fotograma a fotograma: el reloj de la página se para (performance.now, Date.now
// y requestAnimationFrame van con un reloj propio) y cada paso lo adelanta 1/24 s, deja que el mapa pinte y guarda su lienzo,
// sin la interfaz encima. Así sale fluido aunque el ordenador pinte despacio.
// Uso: node tools/trailer/rodar-mapa.mjs <carpeta> [prueba]
//   Lo que pasa (GUION, abajo): Navarra entera, la cámara baja despacio; la comarca se rompe, sube como una isla y el dron
//   vuela sobre ella. prueba: unos pocos fotogramas a 960 × 540 para ver el encuadre
//   (URL=http://127.0.0.1:5173/ por defecto: el servidor de pruebas, que deja usar window.__mapa3d)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
const [, , out, modo] = process.argv;
const prueba = modo === 'prueba', URL = process.env.URL || 'http://127.0.0.1:5173/';
const [W, H] = prueba ? [960, 540] : [1920, 1080], FPS = 24;
const COMARCA = process.env.COMARCA || 'pirineo';
// segundos: desde cuándo se elige la comarca y cuánto dura todo
const ELIGE = +(process.env.ELIGE || 5.2), DURA = +(process.env.DURA || 16);
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => {
  localStorage.setItem('herrizherri-lang', 'es');
  localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'explorador', seen: { heroBenat: true, dog: true, comoJugar: true }, dogOn: false, settings: { quality: 'high' } }));
  window.__paseo = true; window.__sinVideoIsla = true;
  // el reloj propio: hasta __congela() va con el de verdad; después solo avanza con __paso
  const ahora = performance.now.bind(performance), fecha = Date.now, raf = window.requestAnimationFrame.bind(window);
  let virt = null, f0 = 0, cola = [];
  performance.now = () => virt == null ? ahora() : virt;
  Date.now = () => virt == null ? fecha() : f0 + virt;
  window.requestAnimationFrame = (cb) => { if (virt == null) return raf(cb); cola.push(cb); return cola.length; };
  window.__congela = () => { virt = ahora(); f0 = fecha() - virt; };
  window.__paso = (dt) => { virt += dt * 1000; const c = cola; cola = []; for (const f of c) { try { f(virt); } catch (e) { console.error('paso', e?.message); } } };
});
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
await p.goto(`${URL}?skipintro=1&q=high`, { timeout: 300000 });
await p.waitForFunction(() => window.__mapa3d?.ren, null, { timeout: 300000 });
// (que se carguen las texturas, el relieve fino y la isla preparada antes de parar el reloj)
await p.waitForFunction(() => window.__mapa3d.calentado(), null, { timeout: 300000 }).catch(() => console.log('sin calentar'));
await p.waitForTimeout(+(process.env.ESPERA || 12000));
await p.evaluate(() => {
  window.__congela();
  const M = window.__mapa3d;
  // la cámara empieza más lejos y más alta y baja despacio hasta la vista de siempre
  M.v.d *= 1.5; M.v.pitch = Math.min(1.45, (M.v.pitch || 1) + 0.12);
});
// (unos pasos sin guardar: el primero aún no tiene nada que pintar y saldría negro)
for (let i = 0; i < 6; i++) await p.evaluate(() => window.__paso(0));
const n = Math.round(DURA * FPS), cuales = prueba ? [0, Math.round(ELIGE * FPS) - 1, Math.round((ELIGE + 1.5) * FPS), Math.round((ELIGE + 3) * FPS), Math.round((ELIGE + 6) * FPS), n - 1] : null;
const t0 = Date.now();
for (let i = 0; i < n; i++) {
  const sale = !cuales || cuales.includes(i);
  const url = await p.evaluate(([i, sale, elige, com, fps]) => {
    if (i === Math.round(elige * fps)) window.__mapa3d.comarca(com);
    window.__paso(1 / fps);
    return sale ? window.__mapa3d.ren.domElement.toDataURL('image/jpeg', 0.93) : null;
  }, [i, sale, ELIGE, COMARCA, FPS]);
  if (url) writeFileSync(`${out}/${String(i).padStart(4, '0')}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
  if (i % 48 === 0) console.log(`${(i / FPS).toFixed(1)} s`, `${Math.round((Date.now() - t0) / 1000)} s pasados`);
  if (prueba && i > cuales[cuales.length - 1]) break;
}
console.log('mapa', `${n} fotogramas`, `${Math.round((Date.now() - t0) / 1000)} s`, errs.length ? 'errores: ' + errs.slice(0, 3).join(' | ') : 'sin errores');
await b.close();
