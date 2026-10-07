// Galería de las fichas de flora: el retrato de cada planta (floraPortrait) y su hoja (leafImage) en una sola imagen,
// para revisar el dibujo de todas las especies. Uso: node tools/flora-galeria.mjs [carpeta]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'fs';
const out = process.argv[2] || 'entrega/fichas'; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://127.0.0.1:5173/', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
const url = await p.evaluate(async () => {
  const { FLORA } = await import('/src/data/flora.js'); const { floraPortrait } = await import('/src/world/flora3d.js'); const { leafImage } = await import('/src/ui/leafArt.js');
  const ids = Object.keys(FLORA), cols = 6, cw = 260, chh = 250, c = document.createElement('canvas'); c.width = cols * cw; c.height = Math.ceil(ids.length / cols) * chh;
  const g = c.getContext('2d'); g.fillStyle = '#222'; g.fillRect(0, 0, c.width, c.height);
  const load = (u) => new Promise(r => { if (!u) return r(null); const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = u; });
  for (let k = 0; k < ids.length; k++) { const id = ids[k], x = (k % cols) * cw, y = Math.floor(k / cols) * chh;
    const im = await load(await floraPortrait(id)); if (im) g.drawImage(im, x + 4, y + 4, 250, 208);
    const lf = await load(leafImage(id)); if (lf) g.drawImage(lf, x + 190, y + 150, 64, 64);
    g.fillStyle = '#fff'; g.font = '700 14px sans-serif'; g.fillText(FLORA[id].name.slice(0, 30), x + 6, y + 232); }
  return c.toDataURL('image/jpeg', 0.85);
});
writeFileSync(`${out}/flora-galeria.jpg`, Buffer.from(url.split(',')[1], 'base64'));
console.log(errs.length ? errs.slice(0, 3) : 'sin errores'); await b.close();
