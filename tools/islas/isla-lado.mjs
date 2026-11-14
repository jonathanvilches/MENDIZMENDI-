// La isla, de lado (sin que la cámara suba a la vista alta): captura y dónde quedan las nubes en la pantalla.
import { chromium } from '/home/user/mendimendiz/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
const [W, H] = (process.env.TAM || '960x540').split('x').map(Number);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
await p.addInitScript(() => { window.__sinVideoIsla = true; window.__sinVistaAlta = true; localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'explorador', seen: { heroBenat: true, dog: true, comoJugar: true, intro: true } })); });
await p.goto('http://127.0.0.1:5173/?skipintro=1' + (process.env.Q ? '&q=' + process.env.Q : ''), { timeout: 300000 });
await p.waitForFunction(() => window.__mapa3d && document.querySelectorAll('.m3-chip').length > 3, null, { timeout: 300000 });
await p.waitForFunction(() => { const e = window.__mapa3d.estado(); return !e.vuelo && e.v.d < 150; }, null, { timeout: 300000, polling: 500 });
await p.waitForTimeout(2500);
let k = 0;
for (const i of (process.env.ISLAS || '3').split(',').map(Number)) {
  await p.evaluate((i) => document.querySelectorAll('.m3-chip[data-sel]')[i].click(), i);
  await p.waitForTimeout(+(process.env.ESPERA || 16000));
  if (process.env.YAW) { await p.evaluate((y) => { window.__mapa3d.goal.yaw = y; }, +process.env.YAW); await p.waitForTimeout(9000); }
  const r = await p.evaluate(() => { const m = window.__mapa3d, n = m.scene.getObjectByName('nubes'), a = n.geometry.attributes, c = n.geometry.instanceCount, e = m.estado(), out = []; const V = m.cam.position.clone();
    for (let j = 0; j < c; j += 9) { V.set(a.aPos.array[j * 3], a.aPos.array[j * 3 + 1], a.aPos.array[j * 3 + 2]); const d = V.distanceTo(m.cam.position); V.project(m.cam); if (Math.abs(V.x) < 1.1 && Math.abs(V.y) < 1.1 && V.z < 1) out.push([Math.round((V.x + 1) / 2 * innerWidth), Math.round((1 - V.y) / 2 * innerHeight), Math.round(d), +a.aDat.array[j * 4 + 1].toFixed(2)]); }
    return { sel: e.sel, vp: +e.v.pitch.toFixed(2), d: +e.v.d.toFixed(1), copos: c, far: +m.cam.far.toFixed(0), camY: +m.cam.position.y.toFixed(1), enPantalla: out.slice(0, 24) }; });
  await p.screenshot({ path: `${process.env.OUT}-${k++}.jpg`, type: 'jpeg', quality: 92 }); console.log(JSON.stringify(r));
}
console.log('errores', errs.length, JSON.stringify(errs.slice(0, 3))); await b.close();
