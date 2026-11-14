// La órbita de la cámara alrededor de la isla: fotos a varios segundos de elegir la comarca y la vista en cada una. ISLA, T, OUT
import { chromium } from '/home/user/mendimendiz/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
const [W, H] = (process.env.TAM || '960x540').split('x').map(Number);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const movil = !!process.env.MOVIL, p = await (await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: +(process.env.DPR || 1), isMobile: movil, hasTouch: movil })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
await p.addInitScript(() => { window.__sinVideoIsla = true; window.__paseo = true; localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'explorador', seen: { heroBenat: true, dog: true, comoJugar: true, intro: true } })); });
await p.goto('http://127.0.0.1:5173/?skipintro=1' + (process.env.Q ? '&q=' + process.env.Q : ''), { timeout: 300000 });
await p.waitForFunction(() => window.__mapa3d && document.querySelectorAll('.m3-chip').length > 3, null, { timeout: 300000 });
await p.waitForFunction(() => { const e = window.__mapa3d.estado(); return !e.vuelo && e.v.d < 150; }, null, { timeout: 300000, polling: 500 });
await p.waitForTimeout(2500);
// (PREVIA: antes de elegir la comarca, una foto de toda Navarra)
if (process.env.PREVIA) await p.screenshot({ path: `${process.env.OUT}-previa.jpg`, type: 'jpeg', quality: 88 });

await p.evaluate((i) => document.querySelectorAll('.m3-chip[data-sel]')[i].click(), +(process.env.ISLA || 0));
const T = (process.env.T || '3,6,9,14,22,32').split(',').map(Number); let t0 = Date.now();
for (let k = 0; k < T.length; k++) { await p.waitForTimeout(Math.max(0, T[k] * 1000 - (Date.now() - t0)));
  const g = await p.evaluate(() => { const m = window.__mapa3d, e = m.estado(); return { pitch: +e.v.pitch.toFixed(2), yaw: +e.v.yaw.toFixed(2), d: +e.v.d.toFixed(1), vuelo: !!e.vuelo }; });
  await p.screenshot({ path: `${process.env.OUT}-${k}.jpg`, type: 'jpeg', quality: 88 }); console.log(T[k], JSON.stringify(g)); }
console.log('errores', errs.length, JSON.stringify(errs.slice(0, 3))); await b.close();
