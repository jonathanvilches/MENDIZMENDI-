// Mete en el juego los escudos de casa y de oficio del paquete del autor: lee su inventario (inventario-completo.json:
// tipo, id, estado, imagen_indice) y copia cada imagen a src/assets/escudos/casas/512/<id>.webp o
// src/assets/escudos/oficios/512/<id>.webp. Los ids de casa son «pueblo-n» (houseArms(pueblo, n - 1) de
// src/data/blasones.js) y los de oficio, los de src/data/oficios.js y de los jornales. Solo entra lo revisado
// (estado localizado_revision_final); con --todos, también lo señalado para corregir. Los escudos municipales ya están
// (src/assets/escudos/heraldica): con --municipales se sobrescriben con los del paquete.
// Las imágenes se buscan en <carpeta>/grande/<archivo> (las originales, de 1254) y, si no, en <carpeta>/revision-512/NNN.webp;
// de las grandes salen también las de 1024 para la ficha.
// Uso: node tools/escudos-importar.mjs <carpeta del paquete> [--todos] [--municipales]
import { readFileSync, mkdirSync, copyFileSync, existsSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
const [,, dir, ...flags] = process.argv; if (!dir) { console.error('falta la carpeta del paquete'); process.exit(1); }
const todos = flags.includes('--todos'), municipales = flags.includes('--municipales');
const inv = JSON.parse(readFileSync(join(dir, 'inventario-completo.json'), 'utf8'));
const DEST = { casa: 'casas', oficio: 'oficios', municipal: 'heraldica' };
let sharp = null; try { sharp = (await import('sharp')).default; } catch (e) { }
const n = { copiados: 0, grandes: 0, saltados: [], vacios: [], sinArchivo: [] };
for (const e of inv) {
  const k = DEST[e.tipo]; if (!k || e.imagen_indice == null || e.imagen_indice === '') continue;
  if (e.tipo === 'municipal' && !municipales) continue;
  if (e.estado !== 'localizado_revision_final' && !todos) { n.saltados.push(e.id); continue; }
  const big = e.archivo && join(dir, 'grande', e.archivo), small = join(dir, 'revision-512', String(e.imagen_indice).padStart(3, '0') + '.webp');
  const src = big && existsSync(big) ? big : existsSync(small) ? small : null;
  if (!src) { n.sinArchivo.push(e.id); continue; }
  if (!statSync(src).size) { n.vacios.push(e.id); continue; }
  const out = (w) => { const d = join('src/assets/escudos', k, String(w)); mkdirSync(d, { recursive: true }); return join(d, e.id + '.webp'); };
  if (src === big && sharp) {
    await sharp(src).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 88, alphaQuality: 90 }).toFile(out(512));
    await sharp(src).resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 86, alphaQuality: 90 }).toFile(out(1024)); n.grandes++;
  } else copyFileSync(src, out(512));
  n.copiados++;
}
for (const k of ['casas', 'oficios']) { const d = join('src/assets/escudos', k, 'none'); mkdirSync(d, { recursive: true }); if (!existsSync(join(d, '.gitkeep'))) writeFileSync(join(d, '.gitkeep'), ''); }   // (el archivo único no los lleva)
console.log(`copiados ${n.copiados} (con grande: ${n.grandes})`);
if (n.saltados.length) console.log(`sin meter por estar señalados para corregir (${n.saltados.length}): ${n.saltados.join(', ')}`);
if (n.vacios.length) console.log(`archivos vacíos en el paquete (${n.vacios.length}): ${n.vacios.join(', ')}`);
if (n.sinArchivo.length) console.log(`sin archivo (${n.sinArchivo.length}): ${n.sinArchivo.join(', ')}`);
