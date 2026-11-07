// El relieve de alrededor de cada pueblo para world/sierras.js: desde la plaza (a la altura de los ojos), una malla polar
// de alturas reales (40 anillos de 1,4 a 48 km, cada grado; cada punto, la media de cinco a su alrededor) y, más allá de
// 48 km, el ángulo más alto y su altitud rumbo a rumbo. Relieve: teselas terrarium de nivel 10 del almacén abierto de AWS
// (EU-DEM en Navarra; SRTM, GMTED2010 y ETOPO1 en los bordes y el mar; se comprueban las fuentes de cada tesela).
// Descarga (x de 502 a 511 e y de 373 a 382, nivel 10), en una carpeta nueva:
//   for x in $(seq 502 511); do for y in $(seq 373 382); do curl -sS -D 10-$x-$y.txt -o 10-$x-$y.png \
//     https://s3.amazonaws.com/elevation-tiles-prod/terrarium/10/$x/$y.png; done; done
// Uso: node tools/relieve/sierras.mjs <carpeta de teselas> <raíz del proyecto>   (escribe src/data/sierras/<pueblo>.js)
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
import { createRequire } from 'node:module';
const [TILES, ROOT] = process.argv.slice(2);
const sharp = createRequire(path.join(path.resolve(ROOT), 'package.json'))('sharp');
const Z = 10, X0 = 502, X1 = 511, Y0 = 373, Y1 = 382, W = (X1 - X0 + 1) * 256, Hh = (Y1 - Y0 + 1) * 256;
const OK = /^(srtm|gmted|etopo1|eudem)\//;
const H = new Float32Array(W * Hh);
for (let x = X0; x <= X1; x++) for (let y = Y0; y <= Y1; y++) {
  const hdr = fs.readFileSync(path.join(TILES, `${Z}-${x}-${y}.txt`), 'latin1');
  const src = [...hdr.matchAll(/x-amz-meta-x-imagery-sources:\s*(.*)/gi)].flatMap(m => m[1].split(',').map(s => s.trim()));
  if (!src.length || src.some(s => !OK.test(s))) throw new Error(`tesela ${x},${y}: fuentes ${src}`);
  const { data, info } = await sharp(path.join(TILES, `${Z}-${x}-${y}.png`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== 256 || info.channels !== 3) throw new Error('formato');
  for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) { const o = (j * 256 + i) * 3; H[((y - Y0) * 256 + j) * W + (x - X0) * 256 + i] = Math.max(0, data[o] * 256 + data[o + 1] + data[o + 2] / 256 - 32768); }
}
const N = 256 * 2 ** Z;
const pix = (lat, lon) => { const la = lat * Math.PI / 180; return [(lon + 180) / 360 * N - X0 * 256 - 0.5, (1 - Math.log(Math.tan(la) + 1 / Math.cos(la)) / Math.PI) / 2 * N - Y0 * 256 - 0.5]; };
function elev(lat, lon) {
  const [px, py] = pix(lat, lon), x0 = Math.max(0, Math.min(W - 2, Math.floor(px))), y0 = Math.max(0, Math.min(Hh - 2, Math.floor(py)));
  const fx = Math.max(0, Math.min(1, px - x0)), fy = Math.max(0, Math.min(1, py - y0));
  const a = H[y0 * W + x0], b = H[y0 * W + x0 + 1], c = H[(y0 + 1) * W + x0], d = H[(y0 + 1) * W + x0 + 1];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}
const R = 6371, K = 0.13, EDGES = [1.5, 3, 6, 12, 24, 48, 120], EYE = 2;
// pueblos: los del trazado real (su origen y la altura de su plaza) y los dos sin él
const towns = [];
for (const f of fs.readdirSync(path.join(ROOT, 'src/data/reales'))) {
  if (!f.endsWith('.json') || f === 'emblemas.json') continue;
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/reales', f), 'utf8')); if (d.lat == null) continue;
  towns.push({ id: d.id, lat: d.lat, lon: d.lon, alt: d.alt0 });
}
towns.push({ id: 'pamplona', lat: 42.818761, lon: -1.644008, alt: null }, { id: 'otsagabia-ochagavia', lat: 42.906431, lon: -1.09075, alt: null });
const out = path.join(ROOT, 'src/data/sierras'); fs.mkdirSync(out, { recursive: true });
const J = 40, RJ = Array.from({ length: J }, (_, j) => +(1.4 * Math.pow(48 / 1.4, j / (J - 1))).toFixed(4)), U = 4;
const resumen = [];
for (const T of towns) {
  const h0 = (T.alt ?? elev(T.lat, T.lon)) + EYE, cl = Math.cos(T.lat * Math.PI / 180);
  const P = (r, b) => { const br = b * Math.PI / 180; return elev(T.lat + (r * Math.cos(br) / R) * 180 / Math.PI, T.lon + (r * Math.sin(br) / (R * cl)) * 180 / Math.PI); };
  // (cada punto de la malla, la media de cinco alrededor, a un cuarto del paso: las crestas sin dientes de un píxel)
  const grid = new Int16Array(J * 360);
  for (let j = 0; j < J; j++) for (let b = 0; b < 360; b++) {
    const r = RJ[j], dr = (RJ[Math.min(J - 1, j + 1)] - RJ[Math.max(0, j - 1)]) / 8, db = Math.min(0.25, dr / r * 180 / Math.PI);
    const v = [P(r, b), P(r + dr, b), P(r - dr, b), P(r, b + db), P(r, b - db)];
    grid[j * 360 + b] = Math.round((v[0] * 0.4 + (v[1] + v[2] + v[3] + v[4]) * 0.15) / U);
  }
  // lo de más allá de 48 km: el ángulo más alto y su altitud, rumbo a rumbo
  const fa = new Int16Array(360), fh = new Int16Array(360);
  for (let b = 0; b < 360; b++) { let t0 = -90, a0 = 0; for (let r = 48; r <= 120; r += r * 0.006) { const h = P(r, b), t = Math.atan((h - h0 - r * r * (1 - K) / (2 * R) * 1000) / (r * 1000)) * 180 / Math.PI; if (t > t0) { t0 = t; a0 = h; } } fa[b] = Math.round(t0 * 20); fh[b] = Math.round(a0 / 10); }
  const bytes = [];
  const put = (v) => { let u = v < 0 ? -2 * v - 1 : 2 * v; do { let c = u & 127; u = Math.floor(u / 128); bytes.push(u ? c | 128 : c); } while (u); };
  for (let j = 0; j < J; j++) { let p = 0; for (let b = 0; b < 360; b++) { const v = grid[j * 360 + b] - (j ? grid[(j - 1) * 360 + b] : 0); put(v - p); p = v; } }
  for (const arr of [fa, fh]) { let p = 0; for (let b = 0; b < 360; b++) { put(arr[b] - p); p = arr[b]; } }
  const b64 = zlib.deflateRawSync(Buffer.from(bytes), { level: 9 }).toString('base64');
  fs.writeFileSync(path.join(out, `${T.id}.js`), `// El relieve de alrededor de ${T.id}, de 1,4 a 48 km, y la silueta de lo de más allá (tools/relieve/sierras.mjs).\n// EU-DEM: produced using Copernicus data and information funded by the European Union; SRTM, GMTED2010 y ETOPO1: dominio público\nexport default { v: 2, h0: ${Math.round(h0)}, u: ${U}, r: ${JSON.stringify(RJ)}, d: '${b64}' };\n`);
  resumen.push(`${T.id.padEnd(24)} h0 ${Math.round(h0)}  máx ${Math.max(...grid) * U} m  lejos ${(Math.max(...fa) / 20).toFixed(1)}°  ${b64.length} B`);
}
console.log(resumen.join('\n'));
