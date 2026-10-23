// Mete en el juego las láminas que rehace el autor (entrega/encargo-pendiente-*.md, parte B): de una carpeta con
// <id>.png, con el nombre de una lámina que ya está en el juego, cada una a todas sus copias en WebP:
//  · la original (src/assets/laminas/original), a calidad 90, de la que sale la grande;
//  · las demás, del PNG: la de la web (web/<id>.webp, 1280 × 720, calidad 78) y su copia pequeña (web/<id>-s.webp,
//    640 × 360, calidad 78, sacada de la de 1280, como tools/laminas-pequenas.mjs);
//  · las del archivo único (mini, 640 × 360) y del ligero (movil, 1024 × 576), solo si la lámina ya las tenía y sin pesar
//    más que la que había, porque esos archivos van justos de sitio: la calidad más alta que no la pase (como mucho 78
//    y 45, las de siempre);
//  · la grande de 2560 × 1440, con tools/laminas-grandes.mjs (Real-ESRGAN; PYTHON=… el intérprete que lo tenga).
// Los archivos de entrada no se tocan.
// Uso: node tools/laminas-importar.mjs <carpeta> [--sin-grandes]
import { readdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const [,, src, ...resto] = process.argv; if (!src) { console.error('uso: node tools/laminas-importar.mjs <carpeta> [--sin-grandes]'); process.exit(1); }
const R = 'src/assets/laminas', web = (img, q) => img.webp({ quality: q, effort: 6, smartSubsample: true }).toBuffer();
const a = (f, w, h) => sharp(f).resize(w, h, { fit: 'cover', kernel: 'lanczos3' });
// (la calidad más alta, de qMax para abajo, con la que no pesa más que el archivo que había)
async function sinPesarMas(f, w, h, qMax, out) {
  const tope = statSync(out).size;
  let b; for (let q = qMax; q >= 20; q -= 2) { b = await web(a(f, w, h), q); if (b.length <= tope) break; }
  writeFileSync(out, b); return b.length - tope;
}
const ids = [], fuera = [];
for (const f of readdirSync(src).filter(f => /\.png$/i.test(f))) (existsSync(join(R, 'original', f.replace(/\.png$/i, '.webp'))) ? ids : fuera).push(f.replace(/\.png$/i, ''));
if (fuera.length) console.log('se saltan (no son láminas del juego):', fuera.join(' '));
let dMini = 0, dMovil = 0;
for (const id of ids) {
  const f = join(src, `${id}.png`), o = join(R, 'original', `${id}.webp`);
  writeFileSync(o, await web(sharp(f), 90));
  const w = await web(a(f, 1280, 720), 78); writeFileSync(join(R, 'web', `${id}.webp`), w);
  writeFileSync(join(R, 'web', `${id}-s.webp`), await web(a(w, 640, 360), 78));
  if (existsSync(join(R, 'mini', `${id}.webp`))) dMini += await sinPesarMas(f, 640, 360, 78, join(R, 'mini', `${id}.webp`));
  if (existsSync(join(R, 'movil', `${id}.webp`))) dMovil += await sinPesarMas(f, 1024, 576, 45, join(R, 'movil', `${id}.webp`));
}
console.log(`${ids.length} láminas · archivo único ${dMini} bytes · ligero ${dMovil} bytes`);
if (ids.length && !resto.includes('--sin-grandes')) {
  const r = spawnSync('node', ['tools/laminas-grandes.mjs', 'laminas', ...ids], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(1);
}
