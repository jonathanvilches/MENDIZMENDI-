// el pueblo de cerca, como al tocarlo en el mapa (mapa3d ir) y esperar a que acabe el vuelo: la maqueta con sus casas,
// sus árboles y su suelo, para juzgar los colores. PUEBLO, OUT; D y PITCH, para otra vista después (opcional)
import { chromium } from '/home/user/mendimendiz/node_modules/playwright-core/index.mjs';
const OUT = process.env.OUT, PUEBLO = process.env.PUEBLO || 'etxalar';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 1000, height: 462 }, deviceScaleFactor: +(process.env.DPR || 1) })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
await p.addInitScript(() => { window.__sinVideoIsla = true; window.__sinVistaAlta = true; localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'explorador', seen: { heroBenat: true, dog: true, comoJugar: true, intro: true } })); });
await p.goto('http://127.0.0.1:5173/?skipintro=1&q=high', { timeout: 300000 });
await p.waitForFunction(() => window.__mapa3d && document.querySelectorAll('.m3-chip').length > 3, null, { timeout: 300000 });
await p.waitForFunction(() => { const e = window.__mapa3d.estado(); return !e.vuelo && e.v.d < 150; }, null, { timeout: 300000, polling: 500 });
await p.waitForTimeout(6000);
await p.evaluate((id) => window.__mapa3d.ir(id), PUEBLO).catch(e => errs.push('ir: ' + e.message));
await p.waitForFunction(() => { const s = window.__mapa3d.estado(); return !s.vuelo && s.maq; }, null, { timeout: 400000, polling: 1000 }).catch(() => errs.push('no acaba el vuelo'));
await p.waitForTimeout(+(process.env.ESPERA || 12000));
const e = await p.evaluate(() => { const s = window.__mapa3d.estado(); return { d: +s.v.d.toFixed(2), pitch: +s.v.pitch.toFixed(2), yaw: +s.v.yaw.toFixed(2), maq: s.maq, sel: s.sel }; });
await p.screenshot({ path: `${OUT}-0.jpg`, type: 'jpeg', quality: 92 }); console.log(JSON.stringify(e));
if (process.env.D) { await p.evaluate(([d, pitch]) => { const m = window.__mapa3d; m.goal.d = d; if (pitch) m.goal.pitch = pitch; }, [+process.env.D, +(process.env.PITCH || 0)]); await p.waitForTimeout(12000); await p.screenshot({ path: `${OUT}-1.jpg`, type: 'jpeg', quality: 92 }); }
console.log('errores', errs.length, JSON.stringify(errs.slice(0, 3))); await b.close();
