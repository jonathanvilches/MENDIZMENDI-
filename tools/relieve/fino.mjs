// El relieve fino del mapa del inicio (src/assets/relieve/fino.webp): de toda Navarra, cada 0,7 unidades del mapa (unos
// 145 m), cuánto se aparta la altura de verdad de la del relieve grueso del mapa (src/data/mapa-relieve.js, una cada
// 3 unidades, unos 620 m, mezclada entre sus cuatro puntos como hace hacerRelieve). Con eso, al elegir una comarca, su
// losa se rehace con una malla más fina y las sierras toman su forma: crestas, barrancos y cumbres (src/hub/mapa3d.js).
// En gris, un byte por punto: 128 es cero y cada paso, 3 m (de -384 a +381 m). Dentro de los embalses y fuera de los
// datos del relieve grueso, cero.
// Datos: las teselas «terrarium» de nivel 11 (unos 56 m por píxel) de AWS Terrain Tiles, que en Navarra salen de
// Copernicus EU-DEM («Produced using Copernicus data and information funded by the European Union - EU-DEM layers»);
// se comprueba la fuente de cada una en su cabecera (descargar-detalle.sh, con la lista de x 1009 a 1020 e y 749 a 761).
// uso: node tools/relieve/fino.mjs <carpeta de teselas> <salida .webp>
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url), sharp = require('sharp');
const [, , TES, OUT] = process.argv;
if (!TES || !OUT) { console.error('uso: node tools/relieve/fino.mjs <teselas> <salida.webp>'); process.exit(1); }
const Z = 11, X0 = 1009, X1 = 1020, Y0 = 749, Y1 = 761, FUENTES = /^(eudem|srtm|gmted|etopo1)\//i;
// (el relieve grueso del juego, leído del módulo de datos tal cual)
const src = readFileSync(new URL('../../src/data/mapa-relieve.js', import.meta.url), 'utf8');
const R = JSON.parse(src.match(/export const MAPA_RELIEVE = (\{.*\});?\s*$/m)[1]), B64 = src.match(/export const MAPA_ALTURAS = ['"]([^'"]+)['"]/)[1];
const d = Buffer.from(B64, 'base64'), F = R.filas, nx = R.nx, ny = R.ny, ALTS = new Uint8Array(nx * ny), VAL = new Uint8Array(nx * ny);
for (let j = 0, o = 0; j < ny; o += F[j * 2 + 1], j++) { ALTS.set(d.subarray(o, o + F[j * 2 + 1]), j * nx + F[j * 2]); VAL.fill(1, j * nx + F[j * 2], j * nx + F[j * 2] + F[j * 2 + 1]); }
// (como hacerRelieve, en unidades del mapa: la altura gruesa en metros y si sus cuatro puntos tienen datos)
const grueso = (x, y) => {
  const gx = Math.max(0, Math.min(nx - 1.001, (x - R.x0) / R.paso)), gy = Math.max(0, Math.min(ny - 1.001, (y - R.y0) / R.paso));
  const i = gx | 0, j = gy | 0, fx = gx - i, fy = gy - j, k = j * nx + i;
  const h = ((ALTS[k] * (1 - fx) + ALTS[k + 1] * fx) * (1 - fy) + (ALTS[k + nx] * (1 - fx) + ALTS[k + nx + 1] * fx) * fy) * R.u;
  return [h, VAL[k] && VAL[k + 1] && VAL[k + nx] && VAL[k + nx + 1]];
};
// (las teselas, juntas en un mosaico de alturas en metros)
const TW = (X1 - X0 + 1) * 256, TH = (Y1 - Y0 + 1) * 256, H = new Float32Array(TW * TH);
for (let x = X0; x <= X1; x++) for (let y = Y0; y <= Y1; y++) {
  const f = `${TES}/${Z}-${x}-${y}`; if (!existsSync(f + '.png')) { console.error('falta la tesela', x, y); process.exit(1); }
  const hdr = readFileSync(f + '.txt', 'latin1'), srcs = [...hdr.matchAll(/x-amz-meta-x-imagery-sources:\s*(.*)/gi)].flatMap(m => m[1].split(',').map(s => s.trim())).filter(Boolean);
  if (!srcs.length || srcs.some(s => !FUENTES.test(s))) { console.error('tesela', x, y, 'fuentes no previstas', srcs); process.exit(1); }
  const { data } = await sharp(f + '.png').removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) { const p = (j * 256 + i) * 3; H[((y - Y0) * 256 + j) * TW + (x - X0) * 256 + i] = Math.max(0, data[p] * 256 + data[p + 1] + data[p + 2] / 256 - 32768); }
}
const LATLON = (x, y) => [43.325 - (y - 17) / 765 * 1.43, (x - 19) / 709 * 1.80 - 2.52];
const fino = (x, y) => {
  const [lat, lon] = LATLON(x, y), n = 256 * 2 ** Z, la = lat * Math.PI / 180;
  const px = (lon + 180) / 360 * n - X0 * 256 - 0.5, py = (1 - Math.log(Math.tan(la) + 1 / Math.cos(la)) / Math.PI) / 2 * n - Y0 * 256 - 0.5;
  const i = Math.max(0, Math.min(TW - 2, Math.floor(px))), j = Math.max(0, Math.min(TH - 2, Math.floor(py))), fx = Math.min(1, Math.max(0, px - i)), fy = Math.min(1, Math.max(0, py - j)), k = j * TW + i;
  return (H[k] * (1 - fx) + H[k + 1] * fx) * (1 - fy) + (H[k + TW] * (1 - fx) + H[k + TW + 1] * fx) * fy;
};
// (los embalses: dentro, cero, que el agua sigue a su nivel)
const LAGOS = (R.lagos || []).flatMap(l => (l.p || []).map(a => { const P = []; for (let k = 0; k + 1 < a.length; k += 2) P.push([a[k], a[k + 1]]); return P; }));
const dentro = (P, x, y) => { let c = false; for (let a = 0, b = P.length - 1; a < P.length; b = a++) { const [xa, ya] = P[a], [xb, yb] = P[b]; if ((ya > y) !== (yb > y) && x < xa + (xb - xa) * (y - ya) / (yb - ya)) c = !c; } return c; };
const cajas = LAGOS.map(P => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0 - 1, y0 - 1, x1 + 1, y1 + 1]; });
const enLago = (x, y) => LAGOS.some((P, i) => { const b = cajas[i]; return x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3] && dentro(P, x, y); });
// (cada punto, la media de nueve lecturas de su casilla, para que no tiemble; menos la altura gruesa)
const PF = 0.7, w = Math.floor((nx - 1) * R.paso / PF) + 1, h = Math.floor((ny - 1) * R.paso / PF) + 1, out = Buffer.alloc(w * h, 128), hist = [];
let fuera = 0;
for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
  const x = R.x0 + i * PF, y = R.y0 + j * PF, [g, ok] = grueso(x, y); if (!ok || enLago(x, y)) continue;
  let s = 0; for (const dy of [-PF / 3, 0, PF / 3]) for (const dx of [-PF / 3, 0, PF / 3]) s += fino(x + dx, y + dy);
  const dm = s / 9 - g, v = Math.round(dm / 3) + 128; if (v < 0 || v > 255) fuera++;
  out[j * w + i] = Math.max(0, Math.min(255, v)); if ((i + j) % 7 === 0) hist.push(dm);
}
hist.sort((a, b) => a - b);
const pc = (q) => Math.round(hist[Math.floor(q * (hist.length - 1))]);
await sharp(out, { raw: { width: w, height: h, channels: 1 } }).webp({ quality: 92, effort: 6 }).toFile(OUT);
console.log(JSON.stringify({ w, h, paso: PF, x0: R.x0, y0: R.y0, bytes: readFileSync(OUT).length, recortados: fuera, p01: pc(0.01), p50: pc(0.5), p99: pc(0.99) }));
