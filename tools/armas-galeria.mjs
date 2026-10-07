// Galería de todos los escudos oficiales (src/data/armas-navarra.js) dibujados por src/world/armas.js, en color y en
// piedra, para revisarlos de un vistazo. Uso: node tools/armas-galeria.mjs [carpeta]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'fs';
const out = process.argv[2] || 'entrega/armas'; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 400, height: 300 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto('http://127.0.0.1:5173/tools/blank.html', { timeout: 120000 }).catch(() => p.goto('http://127.0.0.1:5173/', { timeout: 120000 }));
for (const stone of [false, true]) {
  const url = await p.evaluate(async (stone) => {
    const { ARMAS } = await import('/src/data/armas-navarra.js'); const { drawOfficial } = await import('/src/world/armas.js');
    const cols = 8, cw = 200, chh = 300, rows = Math.ceil(ARMAS.length / cols), c = document.createElement('canvas'); c.width = cols * cw; c.height = rows * chh;
    const g = c.getContext('2d'); g.fillStyle = '#2a2233'; g.fillRect(0, 0, c.width, c.height);
    ARMAS.forEach((A, i) => { const x = (i % cols) * cw, y = Math.floor(i / cols) * chh; try { drawOfficial(g, x + cw / 2, y + 8, 150, A, { stone }); } catch (e) { g.fillStyle = 'red'; g.fillText(String(e), x + 4, y + 120); console.error(A.id, e.message); } g.fillStyle = '#fff'; g.font = '700 13px sans-serif'; g.textAlign = 'center'; g.fillText(A.name.slice(0, 28), x + cw / 2, y + chh - 10); });
    return c.toDataURL('image/png');
  }, stone);
  writeFileSync(`${out}/galeria${stone ? '-piedra' : ''}.png`, Buffer.from(url.split(',')[1], 'base64'));
}
console.log(errs.length ? errs.slice(0, 8) : 'sin errores');
await b.close();
