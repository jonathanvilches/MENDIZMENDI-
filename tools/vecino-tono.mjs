// El tono de la textura de un vecino hecho en Meshy desde una imagen (noviembre de 2026: los queseros). La textura que
// saca Meshy de la imagen queda más pálida que la de los vecinos de siempre: al lado de ellos, la piel y la ropa clara se
// veían blancas (el autor: «salen muy blancos, compáralos con los otros vecinos»). Aquí se oscurece un poco (gamma y
// ganancia) y se le sube algo el color, sobre el modelo de src/assets/meshy/vecinos; después, su versión ligera y su
// textura de cerca se sacan de él como siempre (tools/meshy-lod.mjs, tools/vecinos-cerca.mjs).
// Además rellena los huecos de la textura: la de Meshy son cientos de trocitos con negro entre ellos, y de lejos, al
// encogerse la textura, el negro y el trozo de al lado (el pelo) se mezclaban con la cara: manchas en la boca. Cada hueco
// toma el color del trozo más cercano (se sabe qué es hueco pintando los triángulos del modelo sobre la textura).
// Uso: node tools/vecino-tono.mjs <nombre> [gamma=1.2] [ganancia=0.92] [color=1.1]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
const [,, nombre, g = '1.2', k = '0.92', c = '1.1'] = process.argv;
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const f = `src/assets/meshy/vecinos/${nombre}.glb`, doc = await io.read(f);
// (qué texels pinta algún triángulo, y el resto, del color de los pintados de alrededor: pirámide de medias, de fino a
// grueso, y de vuelta rellenando solo los huecos)
function rellena(px, W, H) {
  const m = new Uint8Array(W * H), a = [], b = [], c = [];
  for (const mesh of doc.getRoot().listMeshes()) for (const pr of mesh.listPrimitives()) {
    const uv = pr.getAttribute('TEXCOORD_0'), ix = pr.getIndices(); if (!uv) continue;
    const n = ix ? ix.getCount() : uv.getCount(), at = (k, o) => uv.getElement(ix ? ix.getScalar(k) : k, o);
    for (let k = 0; k < n; k += 3) { at(k, a); at(k + 1, b); at(k + 2, c);
      const x0 = a[0] * W, y0 = a[1] * H, x1 = b[0] * W, y1 = b[1] * H, x2 = c[0] * W, y2 = c[1] * H, d = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0); if (!d) continue;
      for (let y = Math.max(0, Math.floor(Math.min(y0, y1, y2)) - 1); y <= Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)) + 1); y++)
        for (let x = Math.max(0, Math.floor(Math.min(x0, x1, x2)) - 1); x <= Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)) + 1); x++) {
          const u = ((x + 0.5 - x0) * (y2 - y0) - (x2 - x0) * (y + 0.5 - y0)) / d, v = ((x1 - x0) * (y + 0.5 - y0) - (x + 0.5 - x0) * (y1 - y0)) / d, e = 0.75 / Math.sqrt(Math.abs(d));
          if (u >= -e && v >= -e && u + v <= 1 + e) m[y * W + x] = 1; } }
  }
  let niv = [{ w: W, h: H, col: Float32Array.from(px), ok: Float32Array.from(m) }];
  while (niv.at(-1).w > 1) { const p = niv.at(-1), w = p.w >> 1, h = p.h >> 1, col = new Float32Array(w * h * 3), ok = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, r = 0, g = 0, bl = 0;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const i = (y * 2 + dy) * p.w + x * 2 + dx; if (p.ok[i]) { s++; r += p.col[i * 3]; g += p.col[i * 3 + 1]; bl += p.col[i * 3 + 2]; } }
      if (s) { const i = y * w + x; ok[i] = 1; col[i * 3] = r / s; col[i * 3 + 1] = g / s; col[i * 3 + 2] = bl / s; } }
    niv.push({ w, h, col, ok }); }
  for (let k = niv.length - 2; k >= 0; k--) { const p = niv[k], q = niv[k + 1];
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) { const i = y * p.w + x; if (p.ok[i]) continue;
      const j = Math.min(q.h - 1, y >> 1) * q.w + Math.min(q.w - 1, x >> 1); p.col[i * 3] = q.col[j * 3]; p.col[i * 3 + 1] = q.col[j * 3 + 1]; p.col[i * 3 + 2] = q.col[j * 3 + 2]; p.ok[i] = 1; } }
  let huecos = 0; for (let i = 0; i < W * H; i++) if (!m[i]) { huecos++; px[i * 3] = niv[0].col[i * 3]; px[i * 3 + 1] = niv[0].col[i * 3 + 1]; px[i * 3 + 2] = niv[0].col[i * 3 + 2]; }
  console.log('  huecos rellenados:', Math.round(100 * huecos / (W * H)) + ' %');
}
for (const t of doc.getRoot().listTextures()) {
  const { data, info } = await sharp(t.getImage()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  rellena(data, info.width, info.height);
  for (let i = 0; i < data.length; i += 3) {
    const r = (data[i] / 255) ** +g * +k, v = (data[i + 1] / 255) ** +g * +k, b = (data[i + 2] / 255) ** +g * +k, l = 0.299 * r + 0.587 * v + 0.114 * b;
    data[i] = Math.max(0, Math.min(255, (l + (r - l) * +c) * 255)); data[i + 1] = Math.max(0, Math.min(255, (l + (v - l) * +c) * 255)); data[i + 2] = Math.max(0, Math.min(255, (l + (b - l) * +c) * 255));
  }
  t.setImage(await sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } }).webp({ quality: 90 }).toBuffer()).setMimeType('image/webp');
}
await io.write(f, doc); console.log(f, 'tono', g, k, c);
