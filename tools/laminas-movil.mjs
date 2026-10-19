// Las láminas del archivo ligero (src/assets/laminas/movil/<id>.webp): las mismas que lleva el archivo único
// (src/assets/laminas/mini, de 640 × 360) pero a 1024 × 576, sacadas de los originales del autor de 1672. En el iPhone
// tumbado la portada del inicio y la de la comarca ocupan todo el ancho (unos 2.200 píxeles a densidad 3): la de 640 se
// estiraba 3,4 veces y sin conexión se veía borrosa. El visor del iPhone no lee AVIF, así que van en WebP, más
// comprimidas: las 69 suman unos 2,8 MB más, que caben en el ligero (sus personajes más sencillos dejan sitio) y no en el
// archivo único completo.
// Uso: node tools/laminas-movil.mjs
import { readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const R = 'src/assets/laminas', OUT = join(R, 'movil'); mkdirSync(OUT, { recursive: true });
const ids = readdirSync(join(R, 'mini')).filter(f => f.endsWith('.webp')).map(f => f.slice(0, -5));
let n = 0, bytes = 0;
for (const id of ids) {
  const src = [join(R, 'original', id + '.webp'), join(R, 'grande', id + '.webp')].find(existsSync);
  const b = await sharp(src).resize(1024, 576, { fit: 'cover', kernel: 'lanczos3' }).webp({ quality: 45, effort: 6, smartSubsample: true }).toBuffer();
  writeFileSync(join(OUT, id + '.webp'), b); n++; bytes += b.length;
}
console.log(`${n} láminas de 1024 × 576 · ${bytes} bytes`);
