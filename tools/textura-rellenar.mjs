// Rellena el fondo de la textura de un personaje de Meshy con el color de la pieza más cercana (dilatación desde las
// zonas que tocan los triángulos). El fondo gris claro se colaba en los bordes del pelo oscuro al alejarse (mipmaps):
// motas y líneas blancas. Uso: node dilate.mjs entrada.glb salida.glb [pasadas]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
const [,, inp, out, P = '40'] = process.argv;
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(inp), root = doc.getRoot();
for (const tex of root.listTextures()) {
  const img = sharp(Buffer.from(tex.getImage())), meta = await img.metadata(), W = meta.width, H = meta.height;
  const raw = await img.removeAlpha().raw().toBuffer(), px = new Uint8Array(raw);
  const mask = new Uint8Array(W * H);
  let tris = 0;
  for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives()) {
    const mat = prim.getMaterial(); if (!mat || mat.getBaseColorTexture() !== tex) continue;
    const info = mat.getBaseColorTextureInfo(), tt = info.getExtension('KHR_texture_transform');
    const off = tt ? tt.getOffset() : [0, 0], sc = tt ? tt.getScale() : [1, 1];
    const uv = prim.getAttribute('TEXCOORD_' + info.getTexCoord()), idx = prim.getIndices(), e = [0, 0];
    const n = idx ? idx.getCount() : uv.getCount(), U = (i) => { uv.getElement(i, e); return [(e[0] * sc[0] + off[0]) * W, (e[1] * sc[1] + off[1]) * H]; };
    for (let t = 0; t < n; t += 3) {
      const a = U(idx ? idx.getScalar(t) : t), b = U(idx ? idx.getScalar(t + 1) : t + 1), c = U(idx ? idx.getScalar(t + 2) : t + 2); tris++;
      const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])) - 1), x1 = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0], c[0])) + 1);
      const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])) - 1), y1 = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1], c[1])) + 1);
      const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]); if (Math.abs(d) < 1e-9) { const x = Math.round(a[0]), y = Math.round(a[1]); if (x >= 0 && y >= 0 && x < W && y < H) mask[y * W + x] = 1; continue; }
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        // el texel cuenta si su centro (con medio texel de margen) cae dentro del triángulo
        const X = x + 0.5, Y = y + 0.5, l1 = ((b[1] - c[1]) * (X - c[0]) + (c[0] - b[0]) * (Y - c[1])) / d, l2 = ((c[1] - a[1]) * (X - c[0]) + (a[0] - c[0]) * (Y - c[1])) / d, l3 = 1 - l1 - l2;
        const m = 0.75 / Math.sqrt(Math.abs(d));   // margen de ~1 texel en coordenadas baricéntricas
        if (l1 > -m && l2 > -m && l3 > -m) mask[y * W + x] = 1;
      }
    }
  }
  // los bordes de cada pieza traen píxeles mezclados con el fondo (rayas claras en el pelo): se quitan ERODE texeles
  // del borde y se vuelven a rellenar desde dentro de la pieza
  const ERODE = +(process.env.ERODE ?? 2);
  for (let k = 0; k < ERODE; k++) { const kill = []; for (let i = 0; i < W * H; i++) if (mask[i]) { const x = i % W, y = (i / W) | 0; if ((x > 0 && !mask[i - 1]) || (x < W - 1 && !mask[i + 1]) || (y > 0 && !mask[i - W]) || (y < H - 1 && !mask[i + W])) kill.push(i); } for (const i of kill) mask[i] = 0; }
  const covered0 = mask.reduce((s, v) => s + v, 0);
  // dilatación por frentes: cada pasada pinta los texeles vacíos que tocan alguno pintado con la media de sus vecinos
  let front = [];
  for (let i = 0; i < W * H; i++) if (!mask[i]) { const x = i % W, y = (i / W) | 0; if ((x > 0 && mask[i - 1]) || (x < W - 1 && mask[i + 1]) || (y > 0 && mask[i - W]) || (y < H - 1 && mask[i + W])) front.push(i); }
  let passes = 0;
  for (; passes < +P && front.length; passes++) {
    const set = [];
    for (const i of front) { if (mask[i]) continue; const x = i % W, y = (i / W) | 0; let r = 0, g = 0, b2 = 0, k = 0;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1, x > 0 && y > 0 ? i - W - 1 : -1, x < W - 1 && y > 0 ? i - W + 1 : -1, x > 0 && y < H - 1 ? i + W - 1 : -1, x < W - 1 && y < H - 1 ? i + W + 1 : -1])
        if (j >= 0 && mask[j] === 1) { r += px[j * 3]; g += px[j * 3 + 1]; b2 += px[j * 3 + 2]; k++; }
      if (k) { px[i * 3] = r / k; px[i * 3 + 1] = g / k; px[i * 3 + 2] = b2 / k; set.push(i); } }
    for (const i of set) mask[i] = 1;
    const nf = new Set(); for (const i of set) { const x = i % W, y = (i / W) | 0; for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (j >= 0 && !mask[j]) nf.add(j); }
    front = [...nf];
  }
  const outImg = await sharp(Buffer.from(px.buffer), { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 90 }).toBuffer();
  tex.setImage(new Uint8Array(outImg)); tex.setMimeType('image/webp');
  console.log(inp.split('/').pop(), `${W}x${H}`, tris, 'triángulos', `cubierto ${(covered0 / (W * H) * 100).toFixed(1)} %`, passes, 'pasadas', (outImg.length / 1024).toFixed(0), 'KB');
}
await io.write(out, doc);
