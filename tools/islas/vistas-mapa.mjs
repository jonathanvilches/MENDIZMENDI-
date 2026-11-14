// el mapa del inicio desde varias cámaras: VISTAS='[{"id":"etxalar","d":18,"pitch":0.6,"yaw":0.3,"dx":0,"dz":0}]'
import { chromium } from '/home/user/mendimendiz/node_modules/playwright-core/index.mjs';
const [W, H] = (process.env.TAM || '1100x508').split('x').map(Number), OUT = process.env.OUT;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
await p.addInitScript(() => { window.__sinVideoIsla = true; window.__sinVistaAlta = true; localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'explorador', seen: { heroBenat: true, dog: true, comoJugar: true, intro: true } })); });
await p.goto('http://127.0.0.1:5173/?skipintro=1&q=' + (process.env.Q || 'high'), { timeout: 300000 });
await p.waitForFunction(() => window.__mapa3d && document.querySelectorAll('.m3-chip').length > 3, null, { timeout: 300000 });
await p.waitForFunction(() => { const e = window.__mapa3d.estado(); return !e.vuelo && e.v.d < 150; }, null, { timeout: 300000, polling: 500 });
await p.waitForTimeout(2500);
const V = JSON.parse(process.env.VISTAS);
for (const [k, vi] of V.entries()) {
  const r = await p.evaluate((vi) => { const m = window.__mapa3d, P = m.pueblos(), t = vi.id ? P.find(x => x.id === vi.id) : null;
    const x = (t ? t.X : vi.x || 0) + (vi.dx || 0), z = (t ? t.Z : vi.z || 0) + (vi.dz || 0);
    Object.assign(m.goal, { x, z, d: vi.d, yaw: vi.yaw ?? m.goal.yaw, pitch: vi.pitch ?? m.goal.pitch }); m.fija(); return { x: +x.toFixed(2), z: +z.toFixed(2), ids: P.slice(0, 3).map(q => q.id) }; }, vi);
  await p.waitForTimeout(+(vi.espera || process.env.ESPERA || 9000));
  await p.screenshot({ path: `${OUT}-${k}.jpg`, type: 'jpeg', quality: 90 }); console.log(k, JSON.stringify(r));
}
console.log('errores', errs.length, JSON.stringify(errs.slice(0, 3))); await b.close();
