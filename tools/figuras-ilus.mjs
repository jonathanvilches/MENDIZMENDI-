// Las ilustraciones de las figuras de leyenda y de carnaval que entregue el autor (como las láminas: apaisadas, 16:9):
// de una carpeta con <id>.png|jpg|webp (los ids de src/data/figuras.js: lamia, basajaun, sorgina, tartalo, roldan,
// joaldun, momotxorro, cascabobo, zipotero, lagunero, irasko, paloki), las deja en src/assets/figuras/ilus a 1280 × 720
// para la web y a 640 × 360 para el archivo único, en WebP. En cuanto están, ui/figuras.js las usa en vez del render
// del traje. Los archivos de entrada no se tocan.
// Uso: node tools/figuras-ilus.mjs <carpeta de entrada> [--sin-unico]   (sin la copia del archivo único)
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
const [,, src, opcion] = process.argv, sinUnico = opcion === '--sin-unico'; if (!src) { console.error('uso: node tools/figuras-ilus.mjs <carpeta>'); process.exit(1); }
const IDS = ['lamia', 'basajaun', 'sorgina', 'tartalo', 'roldan', 'joaldun', 'momotxorro', 'cascabobo', 'zipotero', 'lagunero', 'irasko', 'paloki'];
mkdirSync('src/assets/figuras/ilus/web', { recursive: true }); mkdirSync('src/assets/figuras/ilus/mini', { recursive: true });
let n = 0;
for (const f of readdirSync(src)) {
  const m = /^([a-z]+)\.(png|jpe?g|webp)$/i.exec(f); if (!m || !IDS.includes(m[1].toLowerCase())) { console.log('se salta', f); continue; }
  const id = m[1].toLowerCase();
  writeFileSync(join('src/assets/figuras/ilus/web', `${id}.webp`), await sharp(join(src, f)).resize(1280, 720, { fit: 'cover', kernel: 'lanczos3' }).webp({ quality: 82, effort: 6, smartSubsample: true }).toBuffer());
  if (!sinUnico) writeFileSync(join('src/assets/figuras/ilus/mini', `${id}.webp`), await sharp(join(src, f)).resize(640, 360, { fit: 'cover', kernel: 'lanczos3' }).webp({ quality: 78, effort: 6, smartSubsample: true }).toBuffer());
  n++; console.log(id);
}
console.log(`${n} ilustraciones · faltan: ${IDS.filter(id => !readdirSync('src/assets/figuras/ilus/web').includes(id + '.webp')).join(', ') || 'ninguna'}`);
