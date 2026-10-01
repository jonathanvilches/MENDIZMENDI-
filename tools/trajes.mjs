// Galería de trajes: node tools/trajes.mjs <trajes separados por comas> <salida.png>
import { chromium } from 'playwright-core';
import { writeFileSync } from 'fs';
const [,, o = 'original,sanfermin', out = 'entrega/trajes/galeria.png', c] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
p.on('console', m => { if (m.type() !== 'log') console.log(m.type(), m.text().slice(0, 200)); });
await p.goto(`http://127.0.0.1:5173/lab/trajes.html?o=${o}${c ? '&c=' + c : ''}`, { timeout: 300000 });
await p.waitForFunction(() => window.__shot, null, { timeout: 600000 });
writeFileSync(out, Buffer.from((await p.evaluate(() => window.__shot)).split(',')[1], 'base64')); console.log('galería', out);
await b.close();
