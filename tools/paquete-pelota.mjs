// Prepara las imágenes del paquete del autor «pelota, sellos y fútbol» (el ZIP ya descomprimido en su carpeta):
//  · pelotaris: 22 chicos y chicas, de azul y de rojo. La web lleva los de 512 × 768 del autor tal cual
//    (src/assets/pelotaris/web/{azul,rojo}) y, para la pantalla VS, los de 1024 × 1536 (web/vs/{azul,rojo}); el archivo único, por peso, los de 256 en rojo y, para el azul, solo la
//    camiseta azul del autor, que el juego pone encima del rojo (src/assets/pelotaris/mini/{rojo,camiseta})
//  · sellos de comarca: los 12 de 512 del autor en la web (src/assets/sellos/web) y de 176 en el archivo único
//    (src/assets/sellos/mini)
// Los controles del fútbol son trazos SVG y van escritos en src/futbol/hud.js.
// (en el archivo único, el borde transparente de los rojos y de los sellos va con algo menos de calidad: no se nota y
// ahorra unos 90 KB; el de la camiseta, no, para que no asome un filo rojo)
// Uso: node tools/paquete-pelota.mjs <carpeta del paquete>
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const src = process.argv[2];
if (!src || !existsSync(join(src, 'pelotaris')) || !existsSync(join(src, 'sellos'))) { console.error('Uso: node tools/paquete-pelota.mjs <carpeta del paquete>'); process.exit(1); }
const OUT = 'src/assets';
const ok = (f, ext) => /^[a-z][a-z-]*$/.test(f.replace(ext, '')) && f.endsWith(ext);   // (solo nombres sencillos: nada de rutas)
const webp = (b) => b.length > 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP';
const dir = (d) => { mkdirSync(d, { recursive: true }); return d; };

// la camiseta: lo que en el retrato rojo es rojo vivo y en el azul es azul, crecido 2 px (que no quede un filo rojo) y
// con el borde suavizado; el resto, transparente
async function camiseta(fa, fr, w) {
  const rd = async (f) => sharp(f).resize(w).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const A = await rd(fa), R = await rd(fr), { width, height } = A.info, n = width * height;
  const hsv = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
    if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx / 255]; };
  let m = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4, [h, s, v] = hsv(R.data[o], R.data[o + 1], R.data[o + 2]), [ha, sa] = hsv(A.data[o], A.data[o + 1], A.data[o + 2]);
    m[i] = (h < 18 || h > 335) && s > 0.42 && v > 0.12 && ha > 195 && ha < 265 && sa > 0.3 && R.data[o + 3] > 8 ? 1 : 0;
  }
  for (let k = 0; k < 2; k++) { const t = m.slice(); for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) { const i = y * width + x; if (!t[i]) m[i] = Math.max(t[i - 1], t[i + 1], t[i - width], t[i + width]); } }
  const t = m; m = t.slice(); for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) { const i = y * width + x; m[i] = (t[i] * 4 + t[i - 1] + t[i + 1] + t[i - width] + t[i + width]) / 8; }
  const P = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) { const o = i * 4; P[o] = A.data[o]; P[o + 1] = A.data[o + 1]; P[o + 2] = A.data[o + 2]; P[o + 3] = Math.round(A.data[o + 3] * m[i]); }
  return sharp(P, { raw: { width, height, channels: 4 } }).webp({ quality: 70, alphaQuality: 80, effort: 6 }).toBuffer();
}

let bytes = { web: 0, mini: 0 };
// pelotaris
const ids = readdirSync(join(src, 'pelotaris/png/512/rojo')).filter(f => ok(f, '.png')).map(f => f.replace('.png', ''));
for (const id of ids) {
  for (const c of ['azul', 'rojo']) {
    const b = readFileSync(join(src, `pelotaris/webp/512/${c}/${id}.webp`)); if (!webp(b)) throw new Error(`no es WebP: ${c}/${id}`);
    writeFileSync(join(dir(`${OUT}/pelotaris/web/${c}`), `${id}.webp`), b); bytes.web += b.length;
  }
  // (los de 1024 del autor, solo en la web y solo para la pantalla VS, donde la figura ocupa casi todo el alto)
  for (const c of ['azul', 'rojo']) {
    const b = readFileSync(join(src, `pelotaris/webp/1024/${c}/${id}.webp`)); if (!webp(b)) throw new Error(`no es WebP: 1024 ${c}/${id}`);
    writeFileSync(join(dir(`${OUT}/pelotaris/web/vs/${c}`), `${id}.webp`), b); bytes.web += b.length;
  }
  const fa = join(src, `pelotaris/png/512/azul/${id}.png`), fr = join(src, `pelotaris/png/512/rojo/${id}.png`);
  const r = await sharp(fr).resize(256).webp({ quality: 68, alphaQuality: 55, effort: 6 }).toBuffer(), cm = await camiseta(fa, fr, 256);
  writeFileSync(join(dir(`${OUT}/pelotaris/mini/rojo`), `${id}.webp`), r); writeFileSync(join(dir(`${OUT}/pelotaris/mini/camiseta`), `${id}.webp`), cm);
  bytes.mini += r.length + cm.length;
}
// sellos
const sellos = readdirSync(join(src, 'sellos/png')).filter(f => ok(f, '.png')).map(f => f.replace('.png', ''));
for (const id of sellos) {
  const b = readFileSync(join(src, `sellos/webp/512/${id}.webp`)); if (!webp(b)) throw new Error(`no es WebP: sello ${id}`);
  writeFileSync(join(dir(`${OUT}/sellos/web`), `${id}.webp`), b); bytes.web += b.length;
  const m = await sharp(join(src, `sellos/png/${id}.png`)).resize(176).webp({ quality: 74, alphaQuality: 55, effort: 6 }).toBuffer();
  writeFileSync(join(dir(`${OUT}/sellos/mini`), `${id}.webp`), m); bytes.mini += m.length;
}
console.log(`${ids.length} pelotaris y ${sellos.length} sellos · web ${bytes.web} bytes · archivo único ${bytes.mini} bytes`);
