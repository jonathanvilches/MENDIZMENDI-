import { chromium } from 'playwright-core';
import { readFileSync } from 'fs';
const src = readFileSync('src/ui.js', 'utf8');
const m = src.match(/const ICON = \{([\s\S]*?)\n\};/);
const ICON = eval('({' + m[1] + '})');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage();
await p.setContent('<body></body>');
const res = await p.evaluate((ICON) => {
  const out = {};
  for (const [k, s] of Object.entries(ICON)) {
    const d = document.createElement('div'); d.innerHTML = s; document.body.appendChild(d);
    const svg = d.querySelector('svg'); svg.setAttribute('width', 240); svg.setAttribute('height', 240);
    // raster: count ink pixels via canvas
    out[k] = svg.outerHTML;
    d.remove();
  }
  return out;
}, ICON);
// rasterize each via image
const r2 = await p.evaluate(async (svgs) => {
  const out = {};
  for (const [k, s] of Object.entries(svgs)) {
    const x = s.includes('xmlns') ? s : s.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(x);
    await img.decode();
    const c = document.createElement('canvas'); c.width = c.height = 240; const g = c.getContext('2d'); g.drawImage(img, 0, 0, 240, 240);
    const d = g.getImageData(0, 0, 240, 240).data;
    let x0 = 240, x1 = 0, y0 = 240, y1 = 0, sx = 0, sy = 0, n = 0;
    for (let y = 0; y < 240; y++) for (let xx = 0; xx < 240; xx++) { const a = d[(y * 240 + xx) * 4 + 3]; if (a > 40) { x0 = Math.min(x0, xx); x1 = Math.max(x1, xx); y0 = Math.min(y0, y); y1 = Math.max(y1, y); sx += xx * a; sy += y * a; n += a; } }
    const f = v => (v / 10).toFixed(2);
    out[k] = `bbox x ${f(x0)}–${f(x1 + 1)} y ${f(y0)}–${f(y1 + 1)} centro (${f((x0 + x1 + 1) / 2)}, ${f((y0 + y1 + 1) / 2)}) masa (${f(sx / n)}, ${f(sy / n)})`;
  }
  return out;
}, res);
for (const [k, v] of Object.entries(r2)) console.log(k.padEnd(8), v);
await b.close();
