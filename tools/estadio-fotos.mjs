// Capturas de cerca del estadio (portería, grada, público) con el partido en pausa. Uso:
// node tools/estadio-fotos.mjs [sadar|sala] [carpeta] [calidad low|high]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, venue = 'sadar', out = 'entrega/estadio', q = 'low'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript((q) => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pelotari', seen: { heroBenat: true, dog: true }, settings: { quality: q } })); localStorage.setItem('mendimendiz-futbol-v1', JSON.stringify({ v: 1, tutorial: true })); }, q);
await p.goto('http://127.0.0.1:5173/?screen=sports', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
await p.evaluate(() => document.querySelector('[data-sport="futbol"]').click());
await p.waitForFunction(() => document.querySelector('.lg-root .lg-rv'), null, { timeout: 120000 }); await p.evaluate(() => document.querySelector('.lg-root .lg-rv').click());
const sel = venue === 'sadar' ? '[data-a="sadar"]' : '[data-a="sala"]';
await p.waitForFunction((s) => document.querySelector('.lg-root ' + s), sel, { timeout: 60000 }); await p.evaluate((s) => document.querySelector('.lg-root ' + s).click(), sel);
await p.waitForFunction(() => window.__futbol && window.__futbol.game && document.body.classList.contains('futbol'), null, { timeout: 600000 });
await p.waitForFunction(() => { const m = window.__futbol; for (let i = 0; i < 30; i++) m.update(1 / 30); return m.live && !(m.intro > 0); }, null, { timeout: 300000, polling: 500 });
await p.addStyleTag({ content: '.fb-root{display:none!important}' });
const shots = venue === 'sadar'
  ? { porteria: [[-44, 2.2, 9], [-52.5, 1.2, 0]], porteria2: [[-60, 3, -6], [-50, 1, 1]], grada: [[20, 6, 20], [10, 12, 48]], publico: [[0, 4, 27], [0, 7, 38]], estadio: [[0, 30, -10], [0, 5, 40]] }
  : { porteria: [[-14, 1.6, 4], [-20, 0.9, 0]], grada: [[0, 3, 4], [0, 3, 14]], estadio: [[0, 14, -14], [0, 1, 4]] };
for (const [k, [pos, look]] of Object.entries(shots)) {
  await p.evaluate(([pos, look]) => { const m = window.__futbol; m.paused = true; m.camera.position.set(...pos); m.camera.lookAt(...look); m.camera.fov = 50; m.camera.updateProjectionMatrix(); }, [pos, look]);
  await p.waitForTimeout(900); await p.screenshot({ path: `${out}/${venue}-${k}.png` });
}
console.log(errs.length ? errs.slice(0, 3) : 'sin errores');
await b.close();
