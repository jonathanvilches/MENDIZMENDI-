// Rehace la fauna del archivo único (src/assets/fauna/512) a partir de las de 1280: 512 × 512, WebP calidad 80 y la
// transparencia a 90. A la vista no se distingue de la de antes y pesa un tercio menos (unos 800 KB menos en el archivo
// único, que tiene que caber en 30 MB). La web sigue con las de 1280 y las tarjetas con las de 256.
// Uso: node tools/fauna-512.mjs
import sharp from 'sharp';
import { readdirSync, statSync } from 'node:fs';
const D = new URL('../src/assets/fauna/', import.meta.url).pathname;
let antes = 0, despues = 0;
for (const f of readdirSync(D + '1280').filter(f => f.endsWith('.webp'))) {
  antes += statSync(D + '512/' + f).size;
  await sharp(D + '1280/' + f).resize(512, 512).webp({ quality: 80, alphaQuality: 90, effort: 6 }).toFile(D + '512/' + f);
  despues += statSync(D + '512/' + f).size;
}
console.log(`fauna 512: ${antes} → ${despues} bytes`);
