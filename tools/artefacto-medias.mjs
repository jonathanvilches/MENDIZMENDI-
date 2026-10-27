// Las copias medianas (768 × 432) de las escenas de las cimas y de las ilustraciones de las tradiciones, solo para el
// artefacto de claude.ai: allí van dentro del código, en su propio bloque cada una (vite.config.js), porque a 1024 y a
// 1536 no cabían en sus límites (511 archivos y 16 MB por archivo). La web y la descarga siguen con las grandes.
// Hace solo las que faltan, de la de 1536. Uso: node tools/artefacto-medias.mjs
import { readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

let n = 0, bytes = 0;
for (const t of ['cimas', 'tradiciones']) {
  const A = `src/assets/${t}/1536`, B = `src/assets/${t}/768`; mkdirSync(B, { recursive: true });
  for (const f of readdirSync(A).filter(f => /^[a-z0-9][a-z0-9_-]*\.webp$/.test(f))) {
    if (existsSync(join(B, f))) continue;
    const b = await sharp(join(A, f)).resize(768, 432, { fit: 'cover', kernel: 'lanczos3' }).webp({ quality: 74, effort: 6, smartSubsample: true }).toBuffer();
    writeFileSync(join(B, f), b); n++; bytes += b.length;
  }
}
console.log(`${n} copias de 768 × 432 · ${(bytes / 1e6).toFixed(1)} MB`);
