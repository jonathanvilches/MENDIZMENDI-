// volar a un pueblo como al tocarlo (mapa3d ir) y sacar fotos durante la bajada: PUEBLO, OUT
import { chromium } from '/home/user/mendimendiz/node_modules/playwright-core/index.mjs';
const OUT = process.env.OUT, PUEBLO = process.env.PUEBLO || 'etxalar';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 960, height: 444 }, deviceScaleFactor: 1 })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
await p.addInitScript(() => { window.__sinVideoIsla = true; window.__sinVistaAlta = true; localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'explorador', seen: { heroBenat: true, dog: true, comoJugar: true, intro: true } })); });
await p.goto('http://127.0.0.1:5173/?skipintro=1&q=high', { timeout: 300000 });
await p.waitForFunction(() => window.__mapa3d && document.querySelectorAll('.m3-chip').length > 3, null, { timeout: 300000 });
await p.waitForFunction(() => { const e = window.__mapa3d.estado(); return !e.vuelo && e.v.d < 150; }, null, { timeout: 300000, polling: 500 });
await p.waitForTimeout(6000);
await p.evaluate((id) => window.__mapa3d.ir(id), PUEBLO).catch(e => errs.push('ir: ' + e.message));
for (let k = 0; k < 10; k++) { await p.waitForTimeout(2500); const e = await p.evaluate(() => { const s = window.__mapa3d.estado(); return { d: +s.v.d.toFixed(1), maq: s.maq, vuelo: s.vuelo }; }); console.log(k, JSON.stringify(e)); await p.screenshot({ path: `${OUT}-${k}.jpg`, type: 'jpeg', quality: 85 }); }
console.log('errores', errs.length, JSON.stringify(errs.slice(0, 3))); await b.close();
