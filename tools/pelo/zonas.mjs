// Zonas de la cabeza de cada personaje de Meshy para el tinte del pelo (src/actors/hairColor.js): se recorre la textura
// de la cabeza píxel a píxel, cada píxel con su punto en el cuerpo en la pose de reposo. Salen dónde están los ojos (sus
// blancos, en fracción de la altura y respecto al centro) y el brillo típico del pelo pintado (la mediana de su luma),
// y un plano de frente de cada cabeza con el centro de los ojos marcado para comprobarlo a ojo.
// Uso: node tools/pelo/zonas.mjs <carpeta de salida> src/assets/meshy/pelotari.glb [más .glb]
import { NodeIO } from '@gltf-transform/core'; import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer'; import sharp from 'sharp'; import fs from 'node:fs';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const hsv = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d > 1e-5) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [((h / 6) % 1 + 1) % 1, mx ? d / mx : 0, mx]; };
const out = {}, hairL = {};
const [,, OUT, ...files] = process.argv;
for (const f of files) {
  const name = f.split('/').pop().replace('.glb', '');
  const doc = await io.read(f), prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
  // (los valores ya desnormalizados: los mismos que ve el sombreador en «position»; la textura, con su v hacia abajo)
  const flat = (A, k) => { const n = A.getCount(), o = new Float32Array(n * k), e = []; for (let i = 0; i < n; i++) { A.getElement(i, e); for (let j = 0; j < k; j++) o[i * k + j] = e[j]; } return o; };
  const P = flat(prim.getAttribute('POSITION'), 3), UV = flat(prim.getAttribute('TEXCOORD_0'), 2), I = prim.getIndices().getArray();
  const tex = prim.getMaterial().getBaseColorTexture();
  const { data, info } = await sharp(Buffer.from(tex.getImage())).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const TW = info.width, S = 1024, sc = TW / S;
  let y0 = 1e9, y1 = -1e9; for (let i = 1; i < P.length; i += 3) { y0 = Math.min(y0, P[i]); y1 = Math.max(y1, P[i]); }
  const ny = (y) => (y - y0) / (y1 - y0);
  const whites = [], pts = [];
  const seen = new Uint8Array(S * S);
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t], b = I[t + 1], c = I[t + 2];
    if (ny(P[a * 3 + 1]) < 0.7 || ny(P[b * 3 + 1]) < 0.7 || ny(P[c * 3 + 1]) < 0.7) continue;
    const u = [UV[a * 2] * S, UV[b * 2] * S, UV[c * 2] * S], v = [UV[a * 2 + 1] * S, UV[b * 2 + 1] * S, UV[c * 2 + 1] * S];
    const minx = Math.max(0, Math.floor(Math.min(...u))), maxx = Math.min(S - 1, Math.ceil(Math.max(...u))), miny = Math.max(0, Math.floor(Math.min(...v))), maxy = Math.min(S - 1, Math.ceil(Math.max(...v)));
    const den = (v[1] - v[2]) * (u[0] - u[2]) + (u[2] - u[1]) * (v[0] - v[2]); if (Math.abs(den) < 1e-9) continue;
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w0 = ((v[1] - v[2]) * (px - u[2]) + (u[2] - u[1]) * (py - v[2])) / den, w1 = ((v[2] - v[0]) * (px - u[2]) + (u[0] - u[2]) * (py - v[2])) / den, w2 = 1 - w0 - w1;
      if (w0 < -1e-4 || w1 < -1e-4 || w2 < -1e-4 || seen[y * S + x]) continue; seen[y * S + x] = 1;
      const X = w0 * P[a * 3] + w1 * P[b * 3] + w2 * P[c * 3], Y = w0 * P[a * 3 + 1] + w1 * P[b * 3 + 1] + w2 * P[c * 3 + 1], Z = w0 * P[a * 3 + 2] + w1 * P[b * 3 + 2] + w2 * P[c * 3 + 2];
      const k = (Math.floor(py * sc) * TW + Math.floor(px * sc)) * 3, r = data[k] / 255, g = data[k + 1] / 255, bb = data[k + 2] / 255, q = hsv(r, g, bb);
      pts.push([X, Y, Z, r, g, bb]);
      { const yn = ny(Y), xn = X / (y1 - y0), zn = Z / (y1 - y0), mx = Math.max(r, g, bb), l = 0.3 * r + 0.59 * g + 0.11 * bb;
        const face = zn > 0.03 && Math.abs(xn) < 0.093 && yn < 0.82;
        if (yn > 0.69 && !face && (r - bb) / Math.max(r, 0.004) > 0.25 && bb <= g + 0.03 && mx < 0.42) (hairL[name] ||= []).push(l); }
      if (q[1] < 0.16 && q[2] > 0.62) whites.push([X, Y, Z]);
    }
  }
  // los dos ojos: los blancos de delante de la cara, a cada lado
  let zMax = -1e9; for (const p of pts) zMax = Math.max(zMax, p[2]);
  const front = whites.filter(w => w[2] > zMax - 0.17 && Math.abs(w[0]) < 0.2 && ny(w[1]) > 0.74 && ny(w[1]) < 0.86);
  const eyes = [-1, 1].map(s => { const E = front.filter(w => Math.sign(w[0]) === s); if (E.length < 20) return null;
    const med = (k) => { const a = E.map(w => w[k]).sort((p, q) => p - q); return a[a.length >> 1]; };
    const c = [med(0), med(1), med(2)], d = E.map(w => Math.hypot(w[0] - c[0], w[1] - c[1])).sort((p, q) => p - q);
    const ext = (k) => { const a = E.map(w => w[k]).sort((p, q) => p - q); return [a[Math.floor(a.length * 0.02)], a[Math.floor(a.length * 0.98)]]; };
    return { n: E.length, c: c.map(v => +v.toFixed(4)), x: ext(0).map(v => +v.toFixed(4)), y: ext(1).map(v => +v.toFixed(4)), r95: +d[Math.floor(d.length * 0.95)].toFixed(4) }; });
  let bx0 = 1e9, bx1 = -1e9, bz0 = 1e9, bz1 = -1e9; for (let i = 0; i < P.length; i += 3) { bx0 = Math.min(bx0, P[i]); bx1 = Math.max(bx1, P[i]); bz0 = Math.min(bz0, P[i + 2]); bz1 = Math.max(bz1, P[i + 2]); }
  const Hh = y1 - y0, cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2, nrm = (x, y, z) => [(x - cx) / Hh, (y - y0) / Hh, (z - cz) / Hh].map(v => +v.toFixed(4));
  out[name] = { eyes, zMax: +zMax.toFixed(4), bb: { cx: +cx.toFixed(4), cz: +cz.toFixed(4), H: +Hh.toFixed(4) }, eyesN: eyes.map(e => e && { x: [(e.x[0] - cx) / Hh, (e.x[1] - cx) / Hh].map(v => +v.toFixed(4)), y: [(e.y[0] - y0) / Hh, (e.y[1] - y0) / Hh].map(v => +v.toFixed(4)), z: +((e.c[2] - cz) / Hh).toFixed(4) }), noseN: nrm(0, 0, zMax)[2] };
  { const L = hairL[name].sort((p, q) => p - q), q = (t) => L[Math.floor(t * (L.length - 1))].toFixed(3); console.log(name, 'pelo texeles', L.length, 'luma p05/p25/p50/p75/p95', [0.05, 0.25, 0.5, 0.75, 0.95].map(q).join(' ')); }
  // un plano de frente de la cabeza (color de cada punto) para comprobar a ojo
  const W = 400, H = 400, img = Buffer.alloc(W * H * 3, 40), zb = new Float32Array(W * H).fill(-1e9);
  let yy0 = 1e9, yy1 = -1e9, xx0 = 1e9, xx1 = -1e9; for (const p of pts) { yy0 = Math.min(yy0, p[1]); yy1 = Math.max(yy1, p[1]); xx0 = Math.min(xx0, p[0]); xx1 = Math.max(xx1, p[0]); } const span = Math.max(yy1 - yy0, xx1 - xx0);
  for (const p of pts) { const ix = Math.floor((p[0] - xx0) / span * (W - 1)), iy = Math.floor((1 - (p[1] - yy0) / span) * (H - 1)); const k = iy * W + ix; if (k < 0 || k >= W * H || p[2] < zb[k]) continue; zb[k] = p[2]; img[k * 3] = p[3] * 255; img[k * 3 + 1] = p[4] * 255; img[k * 3 + 2] = p[5] * 255; }
  for (const e of eyes) if (e) { const ix = Math.floor((e.c[0] - xx0) / span * (W - 1)), iy = Math.floor((1 - (e.c[1] - yy0) / span) * (H - 1)); for (let d = -3; d <= 3; d++) for (const [dx, dy] of [[d, 0], [0, d]]) { const k = ((iy + dy) * W + ix + dx) * 3; img[k] = 0; img[k + 1] = 255; img[k + 2] = 255; } }
  await sharp(img, { raw: { width: W, height: H, channels: 3 } }).png().toFile(`${OUT}/cabeza-${name}.png`);
}
fs.writeFileSync(`${OUT}/ojos.json`, JSON.stringify(out, null, 1));
