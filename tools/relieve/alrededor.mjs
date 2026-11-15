// El relieve grueso del mapa (src/data/mapa-relieve.js) también alrededor de Navarra: Gipuzkoa, Araba, La Rioja, Aragón
// y Francia, en un margen de MARGEN puntos de la rejilla a cada lado (20, 60 unidades del mapa, unos 12 km). Hasta el 15 de
// noviembre de 2026 solo se guardaba el tramo de cada fila que toca Navarra y lo demás era cero; desde que la isla de una
// comarca crece para que sus montes salgan enteros (src/hub/mapa3dAmplia.js), lo que coge de fuera tiene que ser el monte
// de verdad: «no te dejes ningún monte de los Pirineos nevado; no me importa que coja montes de provincias, localidades o
// países limítrofes» (el autor). Lo que ya había no se toca; lo nuevo se saca igual que en mapa-relieve.py: de las
// teselas «terrarium» de nivel 8 de AWS Terrain Tiles (SRTM y GMTED2010, del USGS, de dominio público; se comprueba la
// fuente de cada una en su cabecera), cada punto la media de nueve lecturas, en decenas de metros.
//
// uso: node tools/relieve/alrededor.mjs <carpeta de teselas de nivel 8, x 125 a 128 e y 93 a 95> [margen]
//      (las teselas: sh tools/relieve/descargar.sh <carpeta>)
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url), sharp = require('sharp');
const [, , TES, MG = '20'] = process.argv;
if (!TES) { console.error('uso: node tools/relieve/alrededor.mjs <teselas> [margen]'); process.exit(1); }
const MARGEN = +MG, Z = 8, X0 = 125, X1 = 128, Y0 = 93, Y1 = 95, FUENTES = /^(srtm|gmted|etopo1)\//i;
const RUTA = new URL('../../src/data/mapa-relieve.js', import.meta.url);
const src = readFileSync(RUTA, 'utf8');
const mR = src.match(/export const MAPA_RELIEVE = (\{.*\});?\s*$/m), mA = src.match(/export const MAPA_ALTURAS = (['"])([^'"]+)\1;?/);
const R = JSON.parse(mR[1]), d = Buffer.from(mA[2], 'base64'), F = R.filas, nx = R.nx, ny = R.ny;
const ALTS = new Uint8Array(nx * ny), VAL = new Uint8Array(nx * ny);
for (let j = 0, o = 0; j < ny; o += F[j * 2 + 1], j++) { ALTS.set(d.subarray(o, o + F[j * 2 + 1]), j * nx + F[j * 2]); VAL.fill(1, j * nx + F[j * 2], j * nx + F[j * 2] + F[j * 2 + 1]); }
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
const elev = (x, y) => {
  const [lat, lon] = LATLON(x, y), n = 256 * 2 ** Z, la = lat * Math.PI / 180;
  const px = (lon + 180) / 360 * n - X0 * 256 - 0.5, py = (1 - Math.log(Math.tan(la) + 1 / Math.cos(la)) / Math.PI) / 2 * n - Y0 * 256 - 0.5;
  const i = Math.max(0, Math.min(TW - 2, Math.floor(px))), j = Math.max(0, Math.min(TH - 2, Math.floor(py))), fx = Math.min(1, Math.max(0, px - i)), fy = Math.min(1, Math.max(0, py - j)), k = j * TW + i;
  return (H[k] * (1 - fx) + H[k + 1] * fx) * (1 - fy) + (H[k + TW] * (1 - fx) + H[k + TW + 1] * fx) * fy;
};
// (la rejilla nueva: la de antes con MARGEN puntos más a cada lado; lo que ya tenía datos, igual)
const P = R.paso, NX = nx + 2 * MARGEN, NY = ny + 2 * MARGEN, x0 = R.x0 - MARGEN * P, y0 = R.y0 - MARGEN * P, A = new Uint8Array(NX * NY);
let nuevos = 0, max = 0, igual = 0, dif = 0;
for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
  const io = i - MARGEN, jo = j - MARGEN, x = x0 + i * P, y = y0 + j * P;
  let s = 0; for (const dy of [-P / 3, 0, P / 3]) for (const dx of [-P / 3, 0, P / 3]) s += elev(x + dx, y + dy);
  const v = Math.max(0, Math.min(255, Math.round(s / 9 / 10)));
  if (io >= 0 && jo >= 0 && io < nx && jo < ny && VAL[jo * nx + io]) { const o = ALTS[jo * nx + io]; A[j * NX + i] = o; if (Math.abs(o - v) <= 1) igual++; else dif++; continue; }
  A[j * NX + i] = v; nuevos++; max = Math.max(max, v);
}
const filas = []; for (let j = 0; j < NY; j++) filas.push(0, NX);
const R2 = { ...R, x0, y0, nx: NX, ny: NY, filas };
let out = src.replace(mR[0], `export const MAPA_RELIEVE = ${JSON.stringify(R2)};`).replace(mA[0], `export const MAPA_ALTURAS = '${Buffer.from(A).toString('base64')}';`);
// (la cabecera: que diga que ahora va entero, con lo de alrededor)
out = out.replace(/de\s*\n?\/\/ cada fila solo el tramo que toca Navarra: filas = \[primer punto, cuántos, …\]\)\./, 'cada fila\n// entera, también alrededor de Navarra, de tools/relieve/alrededor.mjs: filas = [primer punto, cuántos, …]).');
writeFileSync(RUTA, out);
console.log(JSON.stringify({ antes: [nx, ny, R.x0, R.y0], ahora: [NX, NY, x0, y0], nuevos, maxNuevo: max * 10, comprobados: igual, distintos: dif, bytes: out.length }));
