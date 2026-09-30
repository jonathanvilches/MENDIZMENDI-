// Vista normal de juego (Salazar y un pueblo) y portada del hub, para revisar el conjunto
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = 'entrega/paisaje', tag = 'v'] = process.argv;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
for (const [town, name] of [['otsagabia-ochagavia', 'salazar'], ['ituren', 'ituren']]) {
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:5173/?town=${town}`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
  await p.waitForTimeout(4000);
  await p.screenshot({ path: `${out}/${tag}-juego-${name}.png`, timeout: 180000 });
  await p.close();
}
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
p.on('pageerror', e => errs.push(e.message));
await p.goto('http://127.0.0.1:5173/', { timeout: 300000 });
await p.waitForFunction(() => window.__hub, null, { timeout: 300000 }); await p.waitForTimeout(9000);
await p.screenshot({ path: `${out}/${tag}-portada.png`, timeout: 180000 });
console.log(errs.join('\n') || 'sin errores');
await b.close();
