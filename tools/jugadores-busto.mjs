// Los bustos de los jugadores de fútbol del autor para la caja del próximo partido de la liga (src/assets/jugadores/web/
// busto): cabeza y pecho de cada uno, de 360 × 480, recortados de la figura entera de 1024 × 1536. La figura ocupa menos
// de la mitad de su lienzo y no siempre está en el centro: el recorte sigue a la cabeza de cada una.
// Uso: node tools/jugadores-busto.mjs   (después de tools/paquete-futbol.mjs)
import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const A = 'src/assets/jugadores/web', B = join(A, 'busto');
mkdirSync(B, { recursive: true });
let n = 0, bytes = 0;
for (const f of readdirSync(A).filter(f => /^[a-z][a-z-]*-(chico|chica)\.webp$/.test(f))) {
  const { data, info } = await sharp(join(A, f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true }), W = info.width, H = info.height;
  const a = (x, y) => data[(y * W + x) * 4 + 3] > 20;
  let y0 = H, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x += 2) if (a(x, y)) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); break; }
  const fh = y1 - y0;
  // (el centro de la cabeza: la media de lo opaco en la quinta parte de arriba de la figura)
  let sx = 0, c = 0; for (let y = y0; y < y0 + fh * 0.2; y++) for (let x = 0; x < W; x++) if (a(x, y)) { sx += x; c++; }
  const cx = sx / c, h = Math.round(fh * 0.56), w = Math.round(h * 0.75), top = Math.max(0, Math.round(y0 - fh * 0.03));
  const left = Math.round(Math.min(W - w, Math.max(0, cx - w / 2)));
  const b = await sharp(join(A, f)).extract({ left, top, width: w, height: Math.min(h, H - top) }).resize(360, 480, { fit: 'contain', position: 'top', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 82, alphaQuality: 90, effort: 6 }).toBuffer();
  writeFileSync(join(B, f), b); n++; bytes += b.length;
}
console.log(`${n} bustos de 360 × 480 · ${bytes} bytes`);
