// Mete en el juego los escudos generados que manda el autor en carpetas sueltas, sin inventario: <carpeta>/casas/<id>.webp
// (escudos de casa, «pueblo-n» = houseArms(pueblo, n - 1) de src/data/blasones.js) y <carpeta>/correcciones/<id>.webp
// (rehechos: una casa, un escudo municipal de src/assets/escudos/heraldica o un oficio, según dónde esté ya ese id).
// Cada original (1254 px) da las copias de siempre: 512 y 1024 (web) y 192 (ligero) en las casas y los oficios; 512, 1024 y
// 256 en los municipales. La de 96 (archivo único) va más comprimida: con todas las casas no cabría en el límite.
// Con --sin id,id,… se dejan fuera los que no casan con su blasón (se ven en la ficha junto al texto: un lobo donde el
// blasón dice león enseña mal). Con --rehacer-96, también se rehacen desde su 1024 las de 96 de las casas que ya estaban.
// Uso: node tools/escudos-generados.mjs <carpeta> [<carpeta>…] [--sin a,b] [--rehacer-96]
import { readdirSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

const dirs = [], sin = new Set(); let rehacer = false;
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--sin') for (const id of (process.argv[++i] || '').split(',')) { if (id) sin.add(id); }
  else if (a === '--rehacer-96') rehacer = true;
  else dirs.push(a);
}
if (!dirs.length) { console.error('falta la carpeta'); process.exit(1); }
const E = 'src/assets/escudos', box = { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } };
const T96 = { quality: 65, alphaQuality: 70, effort: 6 };
const TALLAS = { casas: [[512, 88], [1024, 86], [192, 80], [96, T96]], oficios: [[512, 88], [1024, 86], [192, 80], [96, T96]], heraldica: [[512, 88], [1024, 86], [256, 82]] };
const tiene = (k, id) => existsSync(join(E, k, '512', id + '.webp'));
async function copias(src, k, id) {
  for (const [w, q] of TALLAS[k]) {
    const d = join(E, k, String(w)); mkdirSync(d, { recursive: true });
    await sharp(src).resize(w, w, box).webp(typeof q === 'object' ? q : { quality: q, alphaQuality: 90 }).toFile(join(d, id + '.webp'));
  }
}
const n = { nuevas: [], corregidas: [], fuera: [], sinSitio: [] };
for (const dir of dirs) {
  const casas = join(dir, 'casas'), corr = join(dir, 'correcciones');
  if (existsSync(casas)) for (const f of readdirSync(casas).filter(f => f.endsWith('.webp')).sort()) {
    const id = f.slice(0, -5); if (sin.has(id)) { n.fuera.push(id); continue; }
    await copias(join(casas, f), 'casas', id); n.nuevas.push(id);
  }
  if (existsSync(corr)) for (const f of readdirSync(corr).filter(f => f.endsWith('.webp')).sort()) {
    const id = f.slice(0, -5); if (sin.has(id)) { n.fuera.push(id); continue; }
    const k = ['casas', 'heraldica', 'oficios'].find(k => tiene(k, id));
    if (!k) { n.sinSitio.push(id); continue; }
    await copias(join(corr, f), k, id); n.corregidas.push(`${id} (${k})`);
  }
}
if (rehacer) {
  const hechas = new Set(n.nuevas);
  for (const k of ['casas', 'oficios']) for (const f of readdirSync(join(E, k, '1024')).filter(f => f.endsWith('.webp'))) {
    if (k === 'casas' && hechas.has(f.slice(0, -5))) continue;
    await sharp(join(E, k, '1024', f)).resize(96, 96, box).webp(T96).toFile(join(E, k, '96', f));
  }
}
console.log(`nuevas ${n.nuevas.length} · corregidas ${n.corregidas.length}: ${n.corregidas.join(', ')}`);
if (n.fuera.length) console.log(`fuera por no casar con su blasón (${n.fuera.length}): ${n.fuera.join(', ')}`);
if (n.sinSitio.length) console.log(`correcciones sin escudo al que sustituir (${n.sinSitio.length}): ${n.sinSitio.join(', ')}`);
