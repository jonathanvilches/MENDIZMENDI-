// Fútbol en el navegador: tiro dirigido (la diana sigue al joystick mientras se carga) y centro desde la banda con remate
// de cabeza (marca del centro, diana del remate y salto del rematador). Capturas en la carpeta indicada.
// Uso: node tools/futbol-centro.mjs [carpeta]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const out = process.argv[2] || 'entrega/futbol-centro'; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pelotari', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); localStorage.setItem('mendimendiz-futbol-v1', JSON.stringify({ v: 1, tutorial: true })); });
await p.goto('http://127.0.0.1:5173/?screen=sports', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
await p.evaluate(() => document.querySelector('[data-sport="futbol"]').click());
await p.waitForFunction(() => document.querySelector('.lg-root .lg-rv'), null, { timeout: 120000 }); await p.evaluate(() => document.querySelector('.lg-root .lg-rv').click());
await p.waitForFunction(() => document.querySelector('.lg-root [data-a="sadar"]'), null, { timeout: 60000 }); await p.evaluate(() => document.querySelector('.lg-root [data-a="sadar"]').click());
await p.waitForFunction(() => window.__futbol && window.__futbol.game && document.body.classList.contains('futbol'), null, { timeout: 600000 });
await p.waitForFunction(() => { const m = window.__futbol; for (let i = 0; i < 30; i++) m.update(1 / 30); return m.live && !(m.intro > 0) && !m.replay; }, null, { timeout: 300000, polling: 500 });
const res = {};
// (el joystick lo pone la prueba: la vista no lo pisa con el de la pantalla, que está suelto)
await p.evaluate(() => { window.__futbol.moveInput = () => {}; });
// 1) tiro dirigido: carga con el joystick hacia un palo y después hacia el otro
for (const [k, lat] of [['diana-izquierda', -1], ['diana-derecha', 1]]) {
  res[k] = await p.evaluate((lat) => { const m = window.__futbol, g = m.game, me = g.me, s = g.dir[0];
    g.restart = null; g.phase = 'play'; me.x = s * (g.goalX(0) * s - 17); me.z = 0; me.vx = me.vz = 0; g.ball.set(me.x + s * 0.5, 0); g.owner = me;
    for (const q of g.team(1)) if (q.role !== 'POR') { q.x = -s * 20; q.react = 99; }
    const ax = s * Math.sqrt(1 - lat * lat * 0.81), az = lat * 0.9;
    g.hold.shoot = -1; g.setMove(ax, az, 1, false); g.press('shoot'); for (let i = 0; i < 14; i++) { g.setMove(ax, az, 1, false); m.update(1 / 30); }
    const sp = g.shotPreview(); return sp && { z: +sp.z.toFixed(2), y: +sp.y.toFixed(2), vis: m.goalAim.visible, quieto: Math.hypot(me.vx, me.vz) < 0.5 }; }, lat);
  await p.screenshot({ path: `${out}/${k}.png` });
  await p.evaluate(() => { const g = window.__futbol.game; g.hold.shoot = -1; g.aim = null; });
}
// 2) centro desde la banda: marca del centro al cargar PASE, el balón por alto y el remate de cabeza
res.centro = await p.evaluate(() => { const m = window.__futbol, g = m.game, s = g.dir[0], F = { HL: Math.abs(g.goalX(0)) };
  g.restart = null; g.phase = 'play';
  const w = g.team(0).find(q => q.role === 'MD' || q.role === 'MI') || g.team(0)[8], st = g.team(0).find(q => q.role === 'DCD') || g.team(0)[10];
  g.setMe(w, 'force'); g.switchCD = 9;
  w.x = s * (F.HL - 15); w.z = 24; w.vx = s * 2; w.vz = 0; w.h = Math.atan2(w.vx, 0); g.ball.set(w.x + s * 0.5, w.z); g.owner = w;
  st.x = s * (F.HL - 9); st.z = 1; st.vx = st.vz = 0; st.react = 0;
  for (const q of g.team(1)) if (q.role !== 'POR') { q.x = -s * 15; q.react = 99; }
  g.team(1).filter(q => q.role !== 'POR').slice(0, 2).forEach((q, i) => { q.x = s * (F.HL - 3); q.z = i ? 30 : -30; });   // (sin fuera de juego)
  for (const q of g.team(0)) if (q !== w && q !== st && q.role !== 'POR') { q.x = -s * 10; q.react = 99; }
  for (let i = 0; i < 18; i++) { g.setMove(0, 0, 0, false); m.update(1 / 30); w.vx = w.vz = 0; }   // (pasa el fundido de la recolocación)
  const dx = st.x - w.x, dz = st.z - w.z, l = Math.hypot(dx, dz);
  g.hold.pass = -1; g.setMove(dx / l, dz / l, 1, false); g.press('pass'); for (let i = 0; i < 8; i++) { g.setMove(dx / l, dz / l, 1, false); m.update(1 / 30); w.vx = w.vz = 0; }
  const pp = g.passPreview(); window.__st = st.id; return pp && { loft: pp.loft, to: pp.to, st: st.id, d: +Math.hypot(pp.x - st.x, pp.z - st.z).toFixed(1) }; });
await p.waitForTimeout(900);   // (el fundido de la recolocación es de CSS, en tiempo real)
await p.screenshot({ path: `${out}/centro-marca.png` });
res.vuelo = await p.evaluate(() => { const m = window.__futbol, g = m.game, st = g.players[window.__st], s = g.dir[0];
  const evs = []; const o = g.emit.bind(g); g.emit = (e) => { evs.push(e.t); o(e); };
  g.release('pass'); for (let i = 0; i < 12; i++) m.update(1 / 30);
  g.setMove(s * 0.45, 0.89, 1, false); g.press('shoot'); for (let i = 0; i < 6; i++) { g.setMove(s * 0.45, 0.89, 1, false); m.update(1 / 30); }
  window.__evs = evs; return { me: g.me.id === st.id, y: +g.ball.p.y.toFixed(2), diana: m.goalAim.visible, evs: evs.slice(0, 6) }; });
await p.screenshot({ path: `${out}/centro-vuelo.png` });
res.remate = await p.evaluate(() => { const m = window.__futbol, g = m.game, s = g.dir[0]; let head = null, jump = 0;
  for (let i = 0; i < 60 && !head; i++) { g.setMove(s * 0.45, 0.89, 1, false); m.update(1 / 30); if (window.__evs.includes('header')) head = i; const ch = m.chars[window.__st]; jump = Math.max(jump, ch.pivot.position.y); }
  for (let i = 0; i < 3; i++) { m.update(1 / 30); const ch = m.chars[window.__st]; jump = Math.max(jump, ch.pivot.position.y); }
  return { head, jump: +jump.toFixed(2), evs: window.__evs.slice(-6) }; });
await p.screenshot({ path: `${out}/remate.png` });
for (let i = 0; i < 4; i++) await p.evaluate(() => { const m = window.__futbol; for (let k = 0; k < 6; k++) m.update(1 / 30); });
await p.screenshot({ path: `${out}/remate-despues.png` });
console.log(JSON.stringify(res), errs.length ? errs.slice(0, 3) : 'sin errores');
await b.close();
