// Las copias pequeñas de las láminas de la web (src/assets/laminas/web/<id>-s.webp), para tarjetas y miniaturas: de
// 640 × 360, sacadas de la grande de 1280 × 720. Con 480 se veían algo blandas en el iPhone (la tarjeta del pueblo pide
// unos 710 píxeles de ancho a densidad 3); con 640, al tamaño o casi.
// Uso: node tools/laminas-pequenas.mjs
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const D = 'src/assets/laminas/web';
const ids = readdirSync(D).filter(f => /^[a-z0-9][a-z0-9-]*\.webp$/.test(f) && !f.endsWith('-s.webp')).map(f => f.replace('.webp', ''));
let n = 0, bytes = 0;
for (const id of ids) {
  const b = await sharp(join(D, `${id}.webp`)).resize(640, 360, { fit: 'cover', kernel: 'lanczos3' }).webp({ quality: 78, effort: 6, smartSubsample: true }).toBuffer();
  writeFileSync(join(D, `${id}-s.webp`), b); n++; bytes += b.length;
}
console.log(`${n} copias pequeñas de 640 × 360 · ${bytes} bytes`);
