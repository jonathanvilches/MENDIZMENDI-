// Las parejas de cada equipación del autor (un chico y una chica juntos) desde su ZIP descomprimido
// («jugadores-futbol», carpeta duos/webp/1536), recortadas a lo que ocupan (en el lienzo del autor la pareja
// es poco más de la mitad del ancho) y con un margen igual alrededor. Solo para la web:
//  · src/assets/jugadores/web/duo: a su alto completo (unos 1.040 px; como mucho 1.280), para la pantalla VS, donde en
//    un móvil grande tumbado ocupa casi todo el alto: a 960 se veía algo ampliada en los de pantalla de triple densidad
//  · src/assets/jugadores/web/duo-s: de 480 px de alto, para las portadas de equipo de los menús
// Uso: node tools/jugadores-duos.mjs <carpeta del paquete>
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const src = process.argv[2], dir = join(src || '', 'duos/webp/1536');
if (!src || !existsSync(dir)) { console.error('Uso: node tools/jugadores-duos.mjs <carpeta del paquete>'); process.exit(1); }
const A = 'src/assets/jugadores/web/duo', B = 'src/assets/jugadores/web/duo-s';
mkdirSync(A, { recursive: true }); mkdirSync(B, { recursive: true });
const ok = (f) => /^[a-z][a-z-]*\.webp$/.test(f);   // (solo nombres sencillos: nada de rutas)
let n = 0, bytes = 0;
for (const f of readdirSync(dir).filter(ok)) {
  const b = readFileSync(join(dir, f));
  if (!(b.length > 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP')) throw new Error(`no es WebP: ${f}`);
  const { data, info } = await sharp(b).ensureAlpha().raw().toBuffer({ resolveWithObject: true }), W = info.width, H = info.height;
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const pad = Math.round((y1 - y0) * 0.02), left = Math.max(0, x0 - pad), top = Math.max(0, y0 - pad);
  const width = Math.min(W, x1 + pad + 1) - left, height = Math.min(H, y1 + pad + 1) - top;
  const cut = await sharp(b).extract({ left, top, width, height }).toBuffer();
  for (const [d, h, q] of [[A, 1280, 84], [B, 480, 80]]) {
    const o = await sharp(cut).resize({ height: Math.min(h, height), kernel: 'lanczos3' }).webp({ quality: q, alphaQuality: 90, effort: 6 }).toBuffer();
    writeFileSync(join(d, f), o); bytes += o.length;
  }
  n++;
}
console.log(`${n} parejas recortadas · ${bytes} bytes`);
