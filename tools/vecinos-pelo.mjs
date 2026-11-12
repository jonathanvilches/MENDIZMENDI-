// Máscara del pelo de los vecinos de Meshy, para teñirlo de otros colores en el juego (actors/hairColor.js, peloVecino)
// y tener muchos más vecinos distintos con los mismos 21 modelos. La máscara va en el canal alfa de su textura: en la
// versión ligera (src/assets/meshy/lod, 512 px) y en la de cerca (src/assets/meshy/cerca, 1024 px). Así no ocupa memoria
// aparte: los materiales son opacos y el alfa de la textura no se usa para nada más.
// Cómo se encuentra el pelo, sobre el modelo original (src/assets/meshy/vecinos):
//  · la cabeza: lo que queda por encima del cuello, que es la parte más estrecha del cuerpo entre el 55 y el 80 % de su
//    altura (son figuras de cabeza grande: la cabeza es casi un tercio del cuerpo);
//  · la cara se deja fuera: lo que mira hacia delante por debajo de las cejas, en el centro (ojos, pestañas y boca);
//  · y, dentro de la cabeza, el color: se mide el del pelo en la nuca (lo que mira hacia atrás a media altura de la
//    cabeza) y es pelo lo que se le parece en tono (un poco más claro o más oscuro, con sus mechones). La piel, la
//    txapela negra sobre el pelo canoso o un pañuelo de otro color quedan fuera.
// Sale también src/actors/peloVecinos.json: el brillo típico del pelo de cada modelo y su color (en lineal), con los que
// el juego conserva sus luces y sombras al cambiarle el color y toma de otro modelo el color nuevo (el rubio de la joven
// rubia, el pelirrojo de la niña pelirroja…), que así es del mismo estilo que los pintados por Meshy. Con VER=carpeta deja una hoja de prueba por modelo: su textura con
// el pelo marcado en verde.
// Uso: node tools/vecinos-pelo.mjs [modelo…]
import fs from 'fs';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const SRC = 'src/assets/meshy/vecinos', LOD = 'src/assets/meshy/lod', CERCA = 'src/assets/meshy/cerca', JSONF = 'src/actors/peloVecinos.json';
const VER = process.env.VER || null; if (VER) fs.mkdirSync(VER, { recursive: true });
const S = 1024;
const lista = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(SRC).filter(f => f.endsWith('.glb')).map(f => f.replace('.glb', ''));
const refs = fs.existsSync(JSONF) ? JSON.parse(fs.readFileSync(JSONF, 'utf8')) : {};

// sRGB (0-255) → Lab
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
function lab(r, g, b) {
  const R = lin(r), G = lin(g), B = lin(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, Y = R * 0.2126 + G * 0.7152 + B * 0.0722, Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
const mediana = (a) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1] ?? 0; };

// GLB: lee su JSON y su bloque binario y cambia los bytes de la primera imagen, recolocando lo que va detrás (también los
// trozos comprimidos con EXT_meshopt_compression, que apuntan al mismo bloque)
function leeGlb(f) {
  const b = fs.readFileSync(f), jl = b.readUInt32LE(12), j = JSON.parse(b.slice(20, 20 + jl).toString().trim());
  let bin = b.slice(20 + jl + 8, 20 + jl + 8 + b.readUInt32LE(20 + jl));
  const vista = () => j.bufferViews[j.images[0].bufferView];
  return {
    imagen: () => { const v = vista(); return bin.slice(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength); },
    cambiaImagen(nueva) {
      const v = vista(), o = v.byteOffset || 0, viejo = v.byteLength, pad = (x) => (x + 3) & ~3, delta = pad(nueva.length) - pad(viejo);
      bin = Buffer.concat([bin.slice(0, o), nueva, Buffer.alloc(pad(nueva.length) - nueva.length), bin.slice(o + pad(viejo))]);
      for (const w of j.bufferViews) {
        if (w === v) continue;
        if ((w.buffer ?? 0) === 0 && (w.byteOffset || 0) > o) w.byteOffset += delta;
        const m = w.extensions?.EXT_meshopt_compression; if (m && (m.buffer ?? 0) === 0 && (m.byteOffset || 0) > o) m.byteOffset += delta;
      }
      v.byteLength = nueva.length; j.buffers[0].byteLength = bin.length;
    },
    bytes() {
      let js = Buffer.from(JSON.stringify(j)); js = Buffer.concat([js, Buffer.alloc(((js.length + 3) & ~3) - js.length, 0x20)]);
      const h = Buffer.alloc(12), cj = Buffer.alloc(8), cb = Buffer.alloc(8);
      h.writeUInt32LE(0x46546c67, 0); h.writeUInt32LE(2, 4); h.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
      cj.writeUInt32LE(js.length, 0); cj.writeUInt32LE(0x4e4f534a, 4); cb.writeUInt32LE(bin.length, 0); cb.writeUInt32LE(0x004e4942, 4);
      return Buffer.concat([h, cj, js, cb, bin]);
    },
  };
}

for (const n of lista) {
  const doc = await io.read(`${SRC}/${n}.glb`);
  const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
  const P = prim.getAttribute('POSITION'), UV = prim.getAttribute('TEXCOORD_0'), I = prim.getIndices();
  const img = doc.getRoot().listTextures()[0].getImage();
  const rgb = await sharp(Buffer.from(img)).resize(S, S, { kernel: 'lanczos3' }).removeAlpha().raw().toBuffer();
  const N = P.getCount(), pos = new Float32Array(N * 3), uv = new Float32Array(N * 2), v = [], w2 = [];
  let y0 = 1e9, y1 = -1e9, x0 = 1e9, x1 = -1e9;
  for (let i = 0; i < N; i++) { P.getElement(i, v); pos.set(v, i * 3); y0 = Math.min(y0, v[1]); y1 = Math.max(y1, v[1]); x0 = Math.min(x0, v[0]); x1 = Math.max(x1, v[0]); UV.getElement(i, w2); uv[i * 2] = w2[0]; uv[i * 2 + 1] = w2[1]; }
  const H = y1 - y0, cx = (x0 + x1) / 2, yn = (i) => (pos[i * 3 + 1] - y0) / H;
  // el cuello: el tramo más estrecho entre el 55 y el 80 % de la altura
  const anchos = Array.from({ length: 100 }, () => [1e9, -1e9]);
  for (let i = 0; i < N; i++) { const s = Math.min(99, Math.floor(yn(i) * 100)); anchos[s][0] = Math.min(anchos[s][0], pos[i * 3]); anchos[s][1] = Math.max(anchos[s][1], pos[i * 3]); }
  let cuello = 0.66, minW = 1e9; for (let s = 55; s <= 80; s++) { const w = anchos[s][1] - anchos[s][0]; if (w > 0 && w < minW) { minW = w; cuello = (s + 0.5) / 100; } }
  const hh = 1 - cuello, cejas = cuello + 0.56 * hh;
  // medio ancho de la cabeza (a la altura de los ojos)
  let hw = 0; for (let s = Math.floor((cuello + 0.35 * hh) * 100); s <= Math.floor((cuello + 0.6 * hh) * 100); s++) hw = Math.max(hw, (anchos[s][1] - anchos[s][0]) / 2);
  // triángulos: de la cabeza o no; y, de los de la cabeza, cuáles son cara
  const T = I.getCount() / 3, cub = new Uint8Array(S * S), cabeza = new Uint8Array(S * S), nuca = [];
  const idx = (k) => I.getScalar(k);
  const tri = [];
  for (let t = 0; t < T; t++) {
    const a = idx(t * 3), b = idx(t * 3 + 1), c = idx(t * 3 + 2);
    const yc = (yn(a) + yn(b) + yn(c)) / 3;
    const ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2];
    const vx = pos[c * 3] - pos[a * 3], vy = pos[c * 3 + 1] - pos[a * 3 + 1], vz = pos[c * 3 + 2] - pos[a * 3 + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const xc = (pos[a * 3] + pos[b * 3] + pos[c * 3]) / 3 - cx;
    const enCabeza = yc > cuello + 0.015;
    const cara = enCabeza && nz > 0.3 && yc < cejas && Math.abs(xc) < 0.62 * hw;
    const deNuca = enCabeza && nz < -0.55 && yc > cuello + 0.3 * hh && yc < cuello + 0.85 * hh;
    tri.push([a, b, c, enCabeza && !cara, deNuca]);
  }
  // rasteriza en el espacio de la textura
  const raster = (a, b, c, fn) => {
    const ax = uv[a * 2] * S, ay = uv[a * 2 + 1] * S, bx = uv[b * 2] * S, by = uv[b * 2 + 1] * S, cx2 = uv[c * 2] * S, cy = uv[c * 2 + 1] * S;
    const minx = Math.max(0, Math.floor(Math.min(ax, bx, cx2))), maxx = Math.min(S - 1, Math.ceil(Math.max(ax, bx, cx2)));
    const miny = Math.max(0, Math.floor(Math.min(ay, by, cy))), maxy = Math.min(S - 1, Math.ceil(Math.max(ay, by, cy)));
    const d = (bx - ax) * (cy - ay) - (cx2 - ax) * (by - ay); if (Math.abs(d) < 1e-9) return;
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w1 = ((px - ax) * (cy - ay) - (cx2 - ax) * (py - ay)) / d, w2 = ((bx - ax) * (py - ay) - (px - ax) * (by - ay)) / d, w0 = 1 - w1 - w2;
      if (w0 >= -0.02 && w1 >= -0.02 && w2 >= -0.02) fn(y * S + x);
    }
  };
  for (const [a, b, c, h, nu] of tri) raster(a, b, c, (k) => { cub[k] = 1; if (h) cabeza[k] = 1; if (nu) nuca.push(k); });
  // el color del pelo: el de la nuca
  const L = [], A = [], B = [];
  // (los mayores tienen el pelo canoso o blanco: de su nuca solo cuenta lo claro, que la txapela negra la tapa casi entera)
  // (y la quesera y la panadera llevan pañuelo o cofia blanca encima del pelo: de su nuca, lo blanco es la tela)
  const mayor = /^abuel/.test(n), tela = /^(quesera|panadera)$/.test(n);
  for (const k of nuca) { const q = lab(rgb[k * 3], rgb[k * 3 + 1], rgb[k * 3 + 2]); if (mayor && q[0] < 50) continue; if (tela && q[0] > 55) continue; L.push(q[0]); A.push(q[1]); B.push(q[2]); }
  const ref = [mediana(L), mediana(A), mediana(B)];
  // pelo: en la cabeza (sin la cara) y de un tono parecido al de la nuca
  let m = new Float32Array(S * S), lums = [], rs = [], gs = [], bs = [];
  for (let k = 0; k < S * S; k++) {
    if (!cabeza[k]) continue;
    const q = lab(rgb[k * 3], rgb[k * 3 + 1], rgb[k * 3 + 2]), dL = Math.abs(q[0] - ref[0]), dC = Math.hypot(q[1] - ref[1], q[2] - ref[2]);
    const tolC = ref[0] < 30 ? 16 : 13, tolL = 28;
    if (dL < tolL && dC < tolC) { m[k] = 1; const r = lin(rgb[k * 3]), g = lin(rgb[k * 3 + 1]), b = lin(rgb[k * 3 + 2]); lums.push(0.2126 * r + 0.7152 * g + 0.0722 * b); rs.push(r); gs.push(g); bs.push(b); }
  }
  // bordes suaves (3×3) y, hacia los huecos vacíos de la textura (no hacia otras piezas), un poco de margen para que el
  // filtrado de la textura no deje un filo del color de antes
  const suave = new Float32Array(S * S);
  for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) { let s = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) s += m[(y + j) * S + x + i]; suave[y * S + x] = s / 9; }
  m = suave;
  for (let it = 0; it < 4; it++) { const o = m.slice(); for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) { const k = y * S + x; if (cub[k] || o[k] > 0) continue; const mx = Math.max(o[k - 1], o[k + 1], o[k - S], o[k + S]); if (mx > 0) m[k] = mx; } }
  // (el alfa va de 255, sin pelo, a 128, todo pelo: nunca más bajo. El webp con pérdida borra el color de los píxeles con
  // alfa 0, y con alfa muy bajo el navegador pierde precisión al quitarle la premultiplicación)
  const alfa = Buffer.alloc(S * S); for (let k = 0; k < S * S; k++) alfa[k] = 255 - Math.round(Math.min(1, m[k]) * 127);
  const cubierto = lums.length;
  refs[n] = { ref: +mediana(lums).toFixed(4), rgb: [mediana(rs), mediana(gs), mediana(bs)].map(x => +x.toFixed(4)), lab: ref.map(x => +x.toFixed(1)), cuello: +cuello.toFixed(3), texels: cubierto };
  // la textura de cerca (1024) y la ligera (512), con la máscara en el alfa
  const rgba = Buffer.alloc(S * S * 4); for (let k = 0; k < S * S; k++) { rgba[k * 4] = rgb[k * 3]; rgba[k * 4 + 1] = rgb[k * 3 + 1]; rgba[k * 4 + 2] = rgb[k * 3 + 2]; rgba[k * 4 + 3] = alfa[k]; }
  await sharp(rgba, { raw: { width: S, height: S, channels: 4 } }).webp({ quality: 86, alphaQuality: 100, effort: 6 }).toFile(`${CERCA}/${n}.webp`);
  // (la ligera: solo se cambian los bytes de su imagen dentro del GLB. Reescribirlo entero con gltf-transform volvía a
  // comprimir la geometría y le estropeaba las coordenadas de la textura)
  const glb = leeGlb(`${LOD}/${n}.glb`), lrgb = await sharp(glb.imagen()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  // (la máscara, a su tamaño: media de cada bloque. Con sharp, una imagen de un canal salía con tres y se rayaba)
  const lw = lrgb.info.width, f = S / lw, la = Buffer.alloc(lw * lrgb.info.height);
  for (let y = 0; y < lrgb.info.height; y++) for (let x = 0; x < lw; x++) { let t = 0; for (let j = 0; j < f; j++) for (let i = 0; i < f; i++) t += alfa[(y * f + j) * S + x * f + i]; la[y * lw + x] = Math.round(t / (f * f)); }
  const W = lrgb.info.width * lrgb.info.height, l4 = Buffer.alloc(W * 4);
  for (let k = 0; k < W; k++) { l4[k * 4] = lrgb.data[k * 3]; l4[k * 4 + 1] = lrgb.data[k * 3 + 1]; l4[k * 4 + 2] = lrgb.data[k * 3 + 2]; l4[k * 4 + 3] = la[k]; }
  glb.cambiaImagen(await sharp(l4, { raw: { width: lrgb.info.width, height: lrgb.info.height, channels: 4 } }).webp({ quality: 88, alphaQuality: 100, effort: 6 }).toBuffer());
  fs.writeFileSync(`${LOD}/${n}.glb`, glb.bytes());
  if (VER) {
    const ver = Buffer.alloc(S * S * 3); for (let k = 0; k < S * S; k++) { const a = (255 - alfa[k]) / 127; ver[k * 3] = rgb[k * 3] * (1 - a) + 40 * a; ver[k * 3 + 1] = rgb[k * 3 + 1] * (1 - a) + 230 * a; ver[k * 3 + 2] = rgb[k * 3 + 2] * (1 - a) + 60 * a; }
    await sharp(ver, { raw: { width: S, height: S, channels: 3 } }).resize(512, 512).png().toFile(`${VER}/${n}.png`);
  }
  console.log(n, 'cuello', cuello.toFixed(2), 'pelo', ref.map(x => x.toFixed(0)).join('/'), 'texels', cubierto, 'nuca', nuca.length);
}
fs.writeFileSync(JSONF, '{\n' + Object.keys(refs).sort().map(k => ` ${JSON.stringify(k)}: ${JSON.stringify(refs[k])}`).join(',\n') + '\n}\n');
