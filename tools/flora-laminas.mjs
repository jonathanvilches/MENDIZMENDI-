// Galería de las láminas de flora (floraIllustration, dibujo 2D de naturalista) con su hoja, para revisarlas todas.
// Uso: node tools/flora-laminas.mjs [carpeta]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'fs';
const out = process.argv[2] || 'entrega/fichas'; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 400, height: 300 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto('http://127.0.0.1:5173/', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
const parts = await p.evaluate(async () => {
  const { FLORA } = await import('/src/data/flora.js'); const { floraIllustration } = await import('/src/ui/floraArt.js');
  const ids = Object.keys(FLORA), cols = 6, cw = 300, chh = 280, per = 18, res = [];
  const load = (u) => new Promise(r => { if (!u) return r(null); const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = u; });
  for (let s = 0; s < ids.length; s += per) {
    const sub = ids.slice(s, s + per), c = document.createElement('canvas'); c.width = cols * cw; c.height = Math.ceil(sub.length / cols) * chh;
    const g = c.getContext('2d'); g.fillStyle = '#222'; g.fillRect(0, 0, c.width, c.height);
    for (let k = 0; k < sub.length; k++) { const id = sub[k], x = (k % cols) * cw, y = Math.floor(k / cols) * chh;
      const im = await load(floraIllustration(id)); if (im) g.drawImage(im, x + 4, y + 4, 292, 247);
      g.fillStyle = '#fff'; g.font = '700 14px sans-serif'; g.fillText(id + ' · ' + FLORA[id].name.slice(0, 26), x + 6, y + 270); }
    res.push(c.toDataURL('image/jpeg', 0.85));
  }
  return res;
});
parts.forEach((u, i) => writeFileSync(`${out}/flora-laminas-${i + 1}.jpg`, Buffer.from(u.split(',')[1], 'base64')));
console.log(errs.length ? errs.slice(0, 5) : 'sin errores'); await b.close();
