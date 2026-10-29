// Hoja de prueba del tinte de pelo (src/actors/hairColor.js): una fila por personaje de Meshy y una columna por color,
// la cabeza de cerca. En query: m (modelos), c (colores: orig o #hex, como se quieren ver), w y h (tamaño de cada caja),
// cara=0 (cuerpo entero) y rot (giro en grados). Uso: node tools/pelo/ver.mjs <salida.png> [query]   (servidor en 5173)
import { chromium } from 'playwright-core';
const [,, out, q = ''] = process.argv;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1800, height: 1300 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://127.0.0.1:5173/tools/pelo/hoja.html?' + q, { timeout: 300000 });
await p.waitForFunction(() => window.__done || window.__err, null, { timeout: 400000 });
const err = await p.evaluate(() => window.__err); if (err) console.log('ERR', err);
await (await p.$('canvas')).screenshot({ path: out }); console.log('HECHO', out, errs.slice(0, 3).join(' | '));
await b.close();
