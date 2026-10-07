// Fútbol: puntería visible mientras se carga. Con el balón cerca del área, mantener TIRO: la diana de la portería sube
// con la fuerza y se mueve con el joystick. Mantener PASE: la marca del césped se aleja con la fuerza.
// Uso: node tools/futbol-punteria.mjs [carpeta]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const out = process.argv[2] || 'entrega/futbol-punteria'; mkdirSync(out, { recursive: true });
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
for (const [k, hold, mx, mz] of [["tiro-flojo", 6, 1, 0.15], ["tiro-fuerte", 22, 1, -0.2], ["tiro-recto", 14, 1, 0], ["tiro-cruzado", 14, 1, 0.5]]) {
  res[k] = await p.evaluate(([hold, mx, mz]) => { const m = window.__futbol, g = m.game, me = g.me, gx = g.goalX(0);
    g.restart = null; g.phase = 'play'; me.x = gx - 18 * Math.sign(gx); me.z = 2; g.ball.set(me.x + Math.sign(gx) * 0.5, 2); g.owner = me; for (const q of g.team(1)) if (q.role !== 'POR') { q.x = -gx * 0.5; q.react = 99; }
    g.setMove(mx * Math.sign(gx), mz, 1, false); g.hold.shoot = -1; g.press('shoot'); for (let i = 0; i < hold; i++) { m.update(1 / 30); me.vx = me.vz = 0; g.setMove(mx * Math.sign(gx), mz, 1, false); }
    const sp = g.shotPreview(); return sp && { y: +sp.y.toFixed(2), z: +sp.z.toFixed(2), vis: m.goalAim.visible }; }, [hold, mx, mz]);
  await p.screenshot({ path: `${out}/${k}.png` });
  await p.evaluate(() => { const g = window.__futbol.game; g.hold.shoot = -1; });
}
for (const [k, hold] of [['pase-corto', 8], ['pase-largo', 24]]) {
  res[k] = await p.evaluate((hold) => { const m = window.__futbol, g = m.game, me = g.me;
    g.restart = null; g.phase = 'play'; me.x = 0; me.z = 0; g.ball.set(0.5 * g.dir[0], 0); g.owner = me;
    g.setMove(g.dir[0], 0.3, 1, false); g.hold.pass = -1; g.press('pass'); for (let i = 0; i < hold; i++) { m.update(1 / 30); me.vx = me.vz = 0; g.setMove(g.dir[0], 0.3, 1, false); }
    const pp = g.passPreview(); return pp && { d: +Math.hypot(pp.x - me.x, pp.z - me.z).toFixed(1), loft: pp.loft, vis: m.passAim.visible, carga: +(g.charge || 0).toFixed(2), to: pp.to }; }, hold);
  await p.screenshot({ path: `${out}/${k}.png` });
  await p.evaluate(() => { const g = window.__futbol.game; g.hold.pass = -1; });
}
console.log(JSON.stringify(res), errs.length ? errs.slice(0, 3) : 'sin errores');
await b.close();
