// El nombre del juego en el aro de arriba de los sellos de comarca (src/assets/sellos): borra lo que lleva escrito, con el
// color de la banda a cada lado, y escribe HERRIZHERRI en el mismo arco, con la misma altura de letra y el mismo ancho.
// Los 12 sellos son de la misma plantilla: el centro del aro fino, su radio y dónde va el texto son los mismos en todos.
// Escribe web/ (512 px) y mini/ (176 px, para el archivo único). Uso: node tools/sellos-nombre.mjs [sellos…] (sin nada, los 12)
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import sharp from 'sharp';
const DIR = 'src/assets/sellos';
const ids = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(`${DIR}/web`).filter(f => f.endsWith('.webp')).map(f => f.slice(0, -5));
const font = readFileSync('node_modules/@fontsource/nunito/files/nunito-latin-900-normal.woff2').toString('base64');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage();
await p.setContent('<html><body></body></html>');
for (const id of ids) {
  const src = 'data:image/webp;base64,' + readFileSync(`${DIR}/web/${id}.webp`).toString('base64');
  const res = await p.evaluate(async ({ src, font, texto }) => {
    const ff = new FontFace('N9', `url(data:font/woff2;base64,${font})`, { weight: '900' }); await ff.load(); document.fonts.add(ff);
    const img = new Image(); img.src = src; await img.decode(); const W = img.width, S = W / 512;
    const c = document.createElement('canvas'); c.width = c.height = W; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const D = g.getImageData(0, 0, W, W), d = D.data, O = new Uint8ClampedArray(d);
    const CX = 255.5 * S, CY = 252.4 * S, R1 = 166 * S;
    const at = (x, y) => { x = Math.max(0, Math.min(W - 1.001, x)); y = Math.max(0, Math.min(W - 1.001, y)); const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, r = [0, 0, 0, 0];
      for (const [dx, dy, w] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) { const i = ((y0 + dy) * W + x0 + dx) * 4; for (let k = 0; k < 4; k++) r[k] += O[i + k] * w; } return r; };
    // el color de la banda en su borde de dentro y de fuera, de media en ±1°
    const edge = (a, r) => { const acc = [0, 0, 0, 0]; let n = 0; for (let da = -1; da <= 1; da += 0.25) { const t = (a + da) * Math.PI / 180; const q = at(CX + r * Math.cos(t), CY + r * Math.sin(t)); for (let k = 0; k < 4; k++) acc[k] += q[k]; n++; } return acc.map(v => v / n); };
    // las letras de antes: la plantilla es la misma en los 12 sellos (medida en los de fondo morado, donde se distinguen bien)
    const amin = -125.6, amax = -54.6, rmin = 184.8 * S, rmax = 206.6 * S, ROUT = 210.5 * S, letras = [];
    for (let y = 0; y < W * 0.5; y++) for (let x = 0; x < W; x++) { const r = Math.hypot(x - CX, y - CY), a = Math.atan2(y - CY, x - CX) * 180 / Math.PI; if (a < amin || a > amax || r < rmin || r > rmax) continue;
      const i = (y * W + x) * 4; if (O[i + 2] > 170 && O[i] > 230) letras.push(i); }
    const col = [0, 1, 2].map(k => { const v = letras.map(i => O[i + k]).sort((p, q) => p - q); return v[Math.floor(v.length * 0.7)]; });
    // borrar: la banda entera en el sector de las letras, del color de sus bordes, con 5° de fundido a cada lado
    const sm = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
    const B0 = amin - 3, B1 = amax + 3;
    for (let y = 0; y < W * 0.5; y++) for (let x = 0; x < W; x++) { const r = Math.hypot(x - CX, y - CY), a = Math.atan2(y - CY, x - CX) * 180 / Math.PI; if (a < B0 - 5 || a > B1 + 5) continue; if (r < R1 + 1.5 * S || r > ROUT) continue;
      const w = sm(B0 - 5, B0, a) * (1 - sm(B1, B1 + 5, a)), e = Math.min(1, (r - R1 - 1.5 * S) / (1.5 * S), (ROUT - r) / (1.5 * S)); const k = w * Math.max(0, e); if (k <= 0) continue;
      const i0 = edge(a, R1 + 2 * S), i1 = edge(a, ROUT), tt = (r - R1 - 2 * S) / (ROUT - R1 - 2 * S), i = (y * W + x) * 4;
      for (let q = 0; q < 3; q++) d[i + q] = O[i + q] * (1 - k) + (i0[q] * (1 - tt) + i1[q] * tt) * k; }
    g.putImageData(D, 0, 0);
    // escribir: en el mismo arco, con la misma altura de letra y el mismo ancho, centrado donde iba el de antes
    const cap = rmax - rmin, base = rmin, mid = (amin + amax) / 2, span = amax - amin;
    let fs = cap / 0.70; g.font = `900 ${fs}px N9`; const capReal = g.measureText('H').actualBoundingBoxAscent; fs *= cap / capReal; g.font = `900 ${fs}px N9`;
    const ws = [...texto].map(ch => g.measureText(ch).width), tot = ws.reduce((x, y) => x + y, 0);
    const arcLen = span * Math.PI / 180 * (base + cap / 2);   // (lo que ocupaban, medido a media altura de las letras)
    // (letras algo más anchas, como las de antes, y el mismo aire entre ellas: 2,5 px)
    const track = 2.5 * S, sx = (arcLen - track * (texto.length - 1)) / tot; for (let n = 0; n < ws.length; n++) ws[n] *= sx;
    g.fillStyle = `rgb(${col.join(',')})`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    let s = -arcLen / 2; const rm = base + cap / 2;
    for (let n = 0; n < texto.length; n++) { const wch = ws[n], ang = (mid * Math.PI / 180) + (s + wch / 2) / rm;
      g.save(); g.translate(CX + base * Math.cos(ang), CY + base * Math.sin(ang)); g.rotate(ang + Math.PI / 2);
      g.scale(sx, 1); g.shadowColor = 'rgba(40, 14, 50, .45)'; g.shadowBlur = 2 * S; g.shadowOffsetY = 1 * S; g.fillText(texto[n], 0, 0); g.restore(); s += wch + track; }
    return { png: c.toDataURL('image/png'), info: { amin: amin.toFixed(1), amax: amax.toFixed(1), rmin: rmin.toFixed(1), rmax: rmax.toFixed(1), col, n: letras.length, track: track.toFixed(1), sx: sx.toFixed(2) } };
  }, { src, font, texto: 'HERRIZHERRI' });
  const png = Buffer.from(res.png.split(',')[1], 'base64');
  writeFileSync(`${DIR}/web/${id}.webp`, await sharp(png).webp({ quality: 86, alphaQuality: 90, effort: 6 }).toBuffer());
  writeFileSync(`${DIR}/mini/${id}.webp`, await sharp(png).resize(176).webp({ quality: 74, alphaQuality: 55, effort: 6 }).toBuffer());
  console.log(id, JSON.stringify(res.info));
}
await b.close();
