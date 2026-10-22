// Prepara los jugadores de fútbol del autor desde su ZIP descomprimido («jugadores-futbol»): un chico y una
// chica por equipación (los 21 clubes, Iruña, visitante, pueblo, vecinos y las dos segundas equipaciones), de cuerpo
// entero. Solo van en la web, los de 1024 × 1536 del autor tal cual (src/assets/jugadores/web): en el archivo único no
// caben nítidos y el fútbol sigue con las camisetas dibujadas, que son de trazo y salen nítidas.
// Uso: node tools/paquete-futbol.mjs <carpeta del paquete>
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const src = process.argv[2], dir = join(src || '', 'jugadores/webp/1024');
if (!src || !existsSync(dir)) { console.error('Uso: node tools/paquete-futbol.mjs <carpeta del paquete>'); process.exit(1); }
const OUT = 'src/assets/jugadores/web'; mkdirSync(OUT, { recursive: true });
const ok = (f) => /^[a-z][a-z-]*-(chico|chica)\.webp$/.test(f);   // (solo nombres sencillos: nada de rutas)
let n = 0, bytes = 0;
for (const f of readdirSync(dir).filter(ok)) {
  const b = readFileSync(join(dir, f));
  if (!(b.length > 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP')) throw new Error(`no es WebP: ${f}`);
  writeFileSync(join(OUT, f), b); n++; bytes += b.length;
}
console.log(`${n} jugadores · ${bytes} bytes`);
