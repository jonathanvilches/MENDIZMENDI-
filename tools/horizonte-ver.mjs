// El horizonte del pueblo (los montes del borde, que siguen el horizonte real de src/data/relieve.js): cuatro capturas
// desde la plaza, al norte, al este, al sur y al oeste, con la cámara un poco hacia arriba.
// Uso: node tools/horizonte-ver.mjs [pueblo] [carpeta]   (URL=http://127.0.0.1:5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:5173';
const [,, town = 'isaba-izaba', out = 'entrega/horizonte'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); });
await p.goto(`${URL}/?town=${town}&q=low&weather=clear&skipintro=1&t=12`, { timeout: 600000 });
await p.waitForFunction(() => window.__game && window.__rt?.active && window.__rt.elapsed > 2, null, { timeout: 900000 });
const frames = (n) => p.evaluate((n) => new Promise(r => { const f0 = window.__rt.frameNo; const k = () => window.__rt.frameNo - f0 >= n ? r() : setTimeout(k, 50); k(); }), n);
await p.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.visibility = 'hidden'; });
for (const [name, deg] of [['norte', 0], ['este', 90], ['sur', 180], ['oeste', 270]]) {
  // (la cámara mira al revés que su yaw: yaw = rumbo + 180°)
  await p.evaluate((deg) => { const F = window.__rt.follow || window.__game.follow; F.yaw = Math.PI - deg * Math.PI / 180 + Math.PI; F.pitch = 0.08; }, deg);
  await frames(25); await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/${town}-${name}.png` });
}
console.log(errs.length ? 'ERRORES ' + errs.slice(0, 3).join(' | ') : 'sin errores');
await b.close();
