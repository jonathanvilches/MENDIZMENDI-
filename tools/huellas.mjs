// Huellas en la nieve: el jugador camina por un pueblo nevado y se ven sus pasos. Uso: node tools/huellas.mjs [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const out = process.argv[2] || 'entrega/huellas'; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1100, height: 620 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true }, dogOn: false })); });
await p.goto('http://127.0.0.1:5173/?town=lesaka&q=mid&weather=snow&t=11', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
await p.waitForTimeout(2000);
// paseo en curva simulado (pasos reales del jugador)
console.log(await p.evaluate(() => { const G = window.__game, rt = window.__rt, I = G.input, P = G.player;
  for (let i = 0; i < 25 * 30; i++) { I.keys.add('w'); if (i % 60 < 25) I.keys.add('a'); else I.keys.delete('a'); I.update(); P.update(1 / 30, I, rt.follow.yaw); rt.weather.update(1 / 30, rt.camera, rt.sky, null); }
  I.keys.clear(); I.update();
  const pos = P.pos, T = window.__THREE; P.frozen = true; const c = new T.Vector3(pos.x + 3, pos.y + 5, pos.z + 5), l = new T.Vector3(pos.x - 1, pos.y, pos.z - 2); rt.follow.cinematic = { pos: c, look: l, t: 0, lookCur: l.clone() };
  return JSON.stringify({ huellas: rt.weather.prints?.count || 0 }); }));
await p.waitForTimeout(3500); await p.screenshot({ path: `${out}/huellas.png`, timeout: 180000 });
console.log('errores', JSON.stringify(errs)); await b.close();
