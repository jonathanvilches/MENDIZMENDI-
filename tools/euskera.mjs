// Prueba del modo «Aprende euskera»: pantalla en euskera, botón ES (castellano unos segundos) y vuelta al euskera.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const out = process.argv[2] || 'entrega/euskera'; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1100, height: 640 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'learn'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', seen: { heroBenat: true, dog: true } })); });
await p.goto('http://127.0.0.1:5173/?town=lumbier&q=low', { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
await p.waitForTimeout(2500);
const txt = () => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 220));
console.log('EU:', await txt()); await p.screenshot({ path: `${out}/euskera.png` });
await p.click('.learn-btn'); await p.waitForTimeout(600);
console.log('ES:', await txt()); await p.screenshot({ path: `${out}/castellano.png` });
await p.waitForTimeout(6500);
console.log('EU de nuevo:', await txt());
console.log('errores', JSON.stringify(errs));
await b.close();
