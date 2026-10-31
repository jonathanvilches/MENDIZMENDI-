// Cosecha con tractor o cosechadora (game/townTractor.js): empieza la misión de cosecha del pueblo, sube al vehículo,
// conduce hasta cada caja o cada mancha de trigo (para ir deprisa, lo acerca a unos metros y el resto lo conduce) y lleva
// el remolque o el grano a quien lo encargó, que se pone a hablar. Hace tres capturas.
// Uso: TOWN=estella (piquillo, tractor) | artajona (trigo, cosechadora) node tools/cosecha-vehiculo.mjs [carpeta] (TAM=844x390)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const out = process.argv[2] || 'entrega/cosecha', TOWN = process.env.TOWN || 'estella', pre = TOWN; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
const [W, H] = (process.env.TAM || '844x390').split('x').map(Number);
const p = await b.newPage({ viewport: { width: W, height: H }, isMobile: W < 1000, hasTouch: W < 1000, deviceScaleFactor: 1 }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 160)); });
await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true, comoJugar: true } })); });
await p.goto(`${process.env.URL || 'http://127.0.0.1:5173/'}?town=${TOWN}&q=low&weather=clear&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 }); await p.waitForTimeout(1500);
const info = await p.evaluate(() => { const g = window.__game, M = g.missions.find(M => M.type === 'harvest'); if (!M) return 'sin cosecha';
  g.player.place(M.host.pos.x + 2, M.host.pos.z + 2); g.startTractor(M); return { veh: M.veh?.tipo, need: M.need, cargas: M.cargas.length, v: [M.veh.x, M.veh.z].map(Math.round) }; });
console.log('inicio', JSON.stringify(info));
// sube: el jugador junto al vehículo y la acción de subir
await p.evaluate(() => { const g = window.__game, M = g.missions.find(M => M.veh); g.player.place(M.veh.x + 3, M.veh.z + 1); }); await p.waitForTimeout(800);
console.log('acción', await p.evaluate(() => { const g = window.__game; const l = g.interactables(g.player.pos).filter(i => i.kind === 'subir'); return l.map(i => i.label).join(',') || 'nada'; }));
await p.evaluate(() => { const g = window.__game, M = g.missions.find(M => M.veh); M.veh.sube(g.player); }); await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}/${pre}-1-subido.png` });
// conduce: hacia cada caja, girando con la palanca según el ángulo
const conduce = async (segs, objetivo) => {
  for (let k = 0; k < segs * 4; k++) {
    const st = await p.evaluate((obj) => { const g = window.__game, M = g.missions.find(M => M.veh), V = M.veh; if (!V) return { fin: true };
      let T = obj === 'host' ? { x: M.host.pos.x, z: M.host.pos.z } : M.cargas.find(c => !c.hecho);
      if (!T) return { fin: true, count: M.count, step: M.step };
      const want = Math.atan2(T.x - V.x, T.z - V.z); let d = want - V.heading; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      const I = g.input; I.__fake = { x: Math.max(-1, Math.min(1, -d * 2)), y: Math.abs(d) > 1.8 ? 0.4 : 1 };
      return { count: M.count, step: M.step, dist: Math.round(Math.hypot(T.x - V.x, T.z - V.z)), sp: +V.speed.toFixed(1) }; }, objetivo);
    if (st.fin || (objetivo === 'host' && !(await p.evaluate(() => !!window.__game.player.vehiculo)))) return st;
    if (k % 8 === 0) console.log(objetivo, JSON.stringify(st));
    await p.waitForTimeout(250);
  }
};
// (la palanca falsa: input.move la toma de __fake mientras exista)
await p.evaluate(() => { const I = window.__game.input; const d = Object.getOwnPropertyDescriptor(I, 'move'); const real = I.move; Object.defineProperty(I, 'move', { get() { return I.__fake ? { ...I.__fake } : real; }, configurable: true }); });
await conduce(10, 'caja');
// (para ir deprisa en el navegador de pruebas, que va lento: el vehículo, a unos metros de cada caja que queda, y que llegue conduciendo)
for (let k = 0; k < 14; k++) {
  const st = await p.evaluate(() => { const g = window.__game, M = g.missions.find(M => M.veh), V = M?.veh; if (!V) return { fin: true }; const c = M.cargas.find(c => !c.hecho); if (!c) return { fin: true, count: M.count, step: M.step };
    const a = Math.atan2(V.x - c.x, V.z - c.z); V.x = c.x + Math.sin(a) * 4.5; V.z = c.z + Math.cos(a) * 4.5; V.heading = a + Math.PI; V.place(0); return { count: M.count }; });
  if (st.fin) break; await conduce(8, 'caja');
}
const r1 = await p.evaluate(() => { const M = window.__game.missions.find(M => M.type === 'harvest'); return { count: M.count, step: M.step }; });
console.log('cajas', JSON.stringify(r1));
await p.screenshot({ path: `${out}/${pre}-2-cargado.png` });
await p.evaluate(() => { const g = window.__game, M = g.missions.find(M => M.veh), V = M?.veh; if (!V) return; const a = Math.atan2(V.x - M.host.pos.x, V.z - M.host.pos.z); V.x = M.host.pos.x + Math.sin(a) * 16; V.z = M.host.pos.z + Math.cos(a) * 16; V.heading = a + Math.PI; V.place(0); });
const r2 = await conduce(20, 'host');
await p.evaluate(() => { window.__game.input.__fake = null; }); await p.waitForTimeout(2500);
await p.screenshot({ path: `${out}/${pre}-3-llega.png` });
console.log('fin', JSON.stringify(await p.evaluate(() => { const g = window.__game, M = g.missions.find(M => M.type === 'harvest'); return { step: M.step, done: M.done, count: M.count, driving: !!g.player.vehiculo, dialog: !!g.ui.dialogOpen || !!document.querySelector('#dialog:not([hidden]), .dialog.on') }; })));
console.log(errs.length ? 'errores ' + errs.slice(0, 4).join(' | ') : 'sin errores'); await b.close();
const fin = await Promise.resolve(r1); if (fin.count < (fin.need || 8) && fin.step !== 2) process.exitCode = 1;
