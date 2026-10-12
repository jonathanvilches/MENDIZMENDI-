// Las escenas de las cimas para las tarjetas de la web (src/assets/cimas/1024): de 1024 × 576, sacadas de las de 1536
// del autor. La tarjeta pide unos 980 píxeles de ancho en el iPhone (densidad 3); con las de 768 se veían algo blandas.
// Uso: node tools/cimas-tarjetas.mjs
import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const A = 'src/assets/cimas/1536', B = 'src/assets/cimas/1024';
mkdirSync(B, { recursive: true });
let n = 0, bytes = 0;
for (const f of readdirSync(A).filter(f => /^[a-z0-9][a-z0-9-]*\.webp$/.test(f))) {
  const b = await sharp(join(A, f)).resize(1024, 576, { fit: 'cover', kernel: 'lanczos3' }).webp({ quality: 80, effort: 6, smartSubsample: true }).toBuffer();
  writeFileSync(join(B, f), b); n++; bytes += b.length;
}
console.log(`${n} escenas de 1024 × 576 · ${bytes} bytes`);
