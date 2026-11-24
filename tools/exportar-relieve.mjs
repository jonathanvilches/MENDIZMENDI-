// Las alturas de verdad de Navarra y alrededores, para el terreno de Unity (Terrain) u otro motor. El juego las guarda en dos
// partes: la gruesa (src/data/mapa-relieve.js: cada 3 unidades del mapa, unos 620 m, en decenas de metros) y lo que se aparta
// de ella la fina (src/assets/relieve/fino.webp: cada 0,7 unidades, unos 145 m, en pasos de 3 m). Aquí salen juntas, en metros:
//   navarra-alturas.png     16 bits, la rejilla fina tal cual (1196 × 1278), cada punto en decímetros (0–65535 = 0–6553,5 m)
//   navarra-alturas.raw     16 bits sin cabecera, 2049 × 2049, de 0 a «alturaMax» metros: lo que pide Unity (Terrain →
//                           Import Raw, Depth 16 bit, Byte Order Windows); el ancho y el largo de verdad, en el .json
//   navarra-alturas.json    dónde cae cada borde en el mapa del juego y en metros, la altura máxima y cómo importarlo
// Fuentes: SRTM y GMTED2010 (USGS, dominio público) y Copernicus EU-DEM (ver tools/relieve). Para más detalle (25 m o 5 m),
// el MDT del IGN o el LiDAR de Navarra (IDENA). Uso:  node tools/exportar-relieve.mjs [carpeta]   (por defecto exportar/relieve)
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { MAPA_RELIEVE as R, MAPA_ALTURAS } from '../src/data/mapa-relieve.js';
const out = process.argv[2] || 'exportar/relieve'; fs.mkdirSync(out, { recursive: true });
const KM_U = 0.207;   // (km por unidad del mapa de comarcas: tools/relieve/mapa-relieve.py)
// la gruesa: filas = [primer punto, cuántos] por fila; fuera de las filas, nada (0)
const nx = R.nx, ny = R.ny, A = new Uint8Array(nx * ny), d = Buffer.from(MAPA_ALTURAS, 'base64');
for (let j = 0, o = 0; j < ny; o += R.filas[j * 2 + 1], j++) A.set(d.subarray(o, o + R.filas[j * 2 + 1]), j * nx + R.filas[j * 2]);
const gruesa = (x, y) => {   // (en metros, en unidades del mapa)
  const gx = Math.max(0, Math.min(nx - 1.001, (x - R.x0) / R.paso)), gy = Math.max(0, Math.min(ny - 1.001, (y - R.y0) / R.paso));
  const i = gx | 0, j = gy | 0, fx = gx - i, fy = gy - j, k = j * nx + i;
  return ((A[k] * (1 - fx) + A[k + 1] * fx) * (1 - fy) + (A[k + nx] * (1 - fx) + A[k + nx + 1] * fx) * fy) * R.u;
};
// la fina (src/hub/mapa3d.js, FINO_R): el canal rojo, 128 = sin cambio, cada paso 3 m
const F = { x0: -45, y0: -48, paso: 0.7 };
const { data: fd, info } = await sharp('src/assets/relieve/fino.webp').extractChannel(0).raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, M = new Float32Array(W * H);
let hMax = 0;
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i, h = Math.max(0, gruesa(F.x0 + i * F.paso, F.y0 + j * F.paso) + (fd[k] - 128) * 3); M[k] = h; if (h > hMax) hMax = h; }
// 1) la rejilla tal cual, en decímetros (PNG de 16 bits: sharp escribe 16 bits desde un búfer de Uint16 en orden de la máquina)
const dm = new Uint16Array(W * H); for (let k = 0; k < dm.length; k++) dm[k] = Math.min(65535, Math.round(M[k] * 10));
await sharp(dm, { raw: { width: W, height: H, channels: 1, premultiplied: false } }).toColourspace('grey16').png({ compressionLevel: 9 }).toFile(path.join(out, 'navarra-alturas.png'));
// 2) para Unity: cuadrada de 2049 (2^n + 1), de 0 a hMax, fila 0 = sur (Unity lee el RAW de abajo arriba), little-endian
const N = 2049, alturaMax = Math.ceil(hMax / 10) * 10, raw = Buffer.alloc(N * N * 2);
const en = (gx, gy) => { gx = Math.max(0, Math.min(W - 1.001, gx)); gy = Math.max(0, Math.min(H - 1.001, gy)); const i = gx | 0, j = gy | 0, fx = gx - i, fy = gy - j, k = j * W + i;
  return (M[k] * (1 - fx) + M[k + 1] * fx) * (1 - fy) + (M[k + W] * (1 - fx) + M[k + W + 1] * fx) * fy; };
for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) raw.writeUInt16LE(Math.round(en(c / (N - 1) * (W - 1), (1 - r / (N - 1)) * (H - 1)) / alturaMax * 65535), (r * N + c) * 2);
fs.writeFileSync(path.join(out, 'navarra-alturas.raw'), raw);
const anchoM = Math.round((W - 1) * F.paso * KM_U * 1000), largoM = Math.round((H - 1) * F.paso * KM_U * 1000);
fs.writeFileSync(path.join(out, 'navarra-alturas.json'), JSON.stringify({
  fuente: 'src/data/mapa-relieve.js (gruesa) + src/assets/relieve/fino.webp (fina); SRTM, GMTED2010 (USGS) y Copernicus EU-DEM',
  mapa: { x0: F.x0, y0: F.y0, x1: +(F.x0 + (W - 1) * F.paso).toFixed(2), y1: +(F.y0 + (H - 1) * F.paso).toFixed(2), nota: 'unidades del mapa de comarcas (src/data/comarcas.json, src/util/geo.js mapaXY): x hacia el este, y hacia el sur; 1 unidad ≈ 207 m' },
  png: { archivo: 'navarra-alturas.png', ancho: W, alto: H, valor: 'decímetros (16 bits)', fila0: 'norte' },
  raw: { archivo: 'navarra-alturas.raw', resolucion: N, bits: 16, orden: 'little-endian (Windows)', fila0: 'sur', valor: `0–65535 = 0–${alturaMax} m` },
  unity: { terreno: { ancho_m: anchoM, largo_m: largoM, alto_m: alturaMax }, importar: 'Terrain → Terrain Settings → Import Raw: Depth 16 bit, Width/Height 2049, Byte Order Windows, Terrain Size = ancho_m × alto_m × largo_m' },
  alturaMax_m: Math.round(hMax),
}, null, 1));
console.log(`relieve: ${W}×${H} (cada ${Math.round(F.paso * KM_U * 1000)} m) y ${N}×${N} para Unity; ${anchoM / 1000} × ${largoM / 1000} km, hasta ${Math.round(hMax)} m → ${out}`);
