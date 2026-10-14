// El borde de arriba de cada ojo (el párpado) de cada personaje de Meshy, para ponerles pestañas (src/actors/peinados.js):
// se recorre la textura de la cabeza píxel a píxel, cada píxel con su punto en el cuerpo en la pose de reposo, y se mira
// la cara de frente: desde la pupila (lo más oscuro), columna a columna hacia arriba, hasta salir de la línea oscura del
// párpado a la piel. Sale una
// línea de puntos por ojo (x, y, z en fracción de la altura; y desde los pies) y una hoja de frente con las líneas dibujadas
// para comprobarlas a ojo. Uso: node tools/pelo/parpados.mjs <carpeta de salida> src/assets/meshy/osasuna.glb [más .glb]
import { NodeIO } from '@gltf-transform/core'; import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer'; import sharp from 'sharp'; import fs from 'node:fs';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const hsv = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return [mx ? (mx - mn) / mx : 0, mx]; };
const med = (a) => { const s = [...a].sort((p, q) => p - q); return s[s.length >> 1]; };
const pct = (a, t) => { const s = [...a].sort((p, q) => p - q); return s[Math.min(s.length - 1, Math.floor(t * (s.length - 1)))]; };
const [,, OUT, ...files] = process.argv; const res = {};
for (const f of files) {
  const name = f.split('/').pop().replace('.glb', '');
  const doc = await io.read(f), prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
  const flat = (A, k) => { const n = A.getCount(), o = new Float32Array(n * k), e = []; for (let i = 0; i < n; i++) { A.getElement(i, e); for (let j = 0; j < k; j++) o[i * k + j] = e[j]; } return o; };
  const P = flat(prim.getAttribute('POSITION'), 3), UV = flat(prim.getAttribute('TEXCOORD_0'), 2), I = prim.getIndices().getArray();
  const { data, info } = await sharp(Buffer.from(prim.getMaterial().getBaseColorTexture().getImage())).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const TW = info.width, S = 1024, sc = TW / S;
  let y0 = 1e9, y1 = -1e9; for (let i = 1; i < P.length; i += 3) { y0 = Math.min(y0, P[i]); y1 = Math.max(y1, P[i]); }
  const H = y1 - y0, N = (X, Y, Z) => [X / H, (Y - y0) / H, Z / H];
  const whites = [], pts = [], seen = new Uint8Array(S * S);
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t], b = I[t + 1], c = I[t + 2];
    if ((P[a * 3 + 1] - y0) / H < 0.7 || P[a * 3 + 2] < 0) continue;
    const u = [UV[a * 2] * S, UV[b * 2] * S, UV[c * 2] * S], v = [UV[a * 2 + 1] * S, UV[b * 2 + 1] * S, UV[c * 2 + 1] * S];
    const den = (v[1] - v[2]) * (u[0] - u[2]) + (u[2] - u[1]) * (v[0] - v[2]); if (Math.abs(den) < 1e-9) continue;
    for (let y = Math.max(0, Math.floor(Math.min(...v))); y <= Math.min(S - 1, Math.ceil(Math.max(...v))); y++) for (let x = Math.max(0, Math.floor(Math.min(...u))); x <= Math.min(S - 1, Math.ceil(Math.max(...u))); x++) {
      const px = x + 0.5, py = y + 0.5, w0 = ((v[1] - v[2]) * (px - u[2]) + (u[2] - u[1]) * (py - v[2])) / den, w1 = ((v[2] - v[0]) * (px - u[2]) + (u[0] - u[2]) * (py - v[2])) / den, w2 = 1 - w0 - w1;
      if (w0 < -1e-4 || w1 < -1e-4 || w2 < -1e-4 || seen[y * S + x]) continue; seen[y * S + x] = 1;
      const p = N(w0 * P[a * 3] + w1 * P[b * 3] + w2 * P[c * 3], w0 * P[a * 3 + 1] + w1 * P[b * 3 + 1] + w2 * P[c * 3 + 1], w0 * P[a * 3 + 2] + w1 * P[b * 3 + 2] + w2 * P[c * 3 + 2]);
      const k = (Math.floor(py * sc) * TW + Math.floor(px * sc)) * 3, r = data[k] / 255, g = data[k + 1] / 255, bb = data[k + 2] / 255, [s, l] = hsv(r, g, bb);
      pts.push([...p, r, g, bb]);
      if (s < 0.18 && l > 0.6 && p[1] > 0.73 && p[1] < 0.86 && Math.abs(p[0]) > 0.012 && Math.abs(p[0]) < 0.12) whites.push(p);
    }
  }
  // la cara de frente, en una rejilla fina (color y profundidad de lo que se ve), para recorrer los ojos como en una foto
  const W = 420, X0 = -0.16, Y0 = 0.68, SP = 0.32, img = Buffer.alloc(W * W * 3, 40), zb = new Float32Array(W * W).fill(-1e9), lum = new Float32Array(W * W).fill(-1), sat = new Float32Array(W * W);
  const at = (x, y) => [Math.floor((x - X0) / SP * (W - 1)), Math.floor((1 - (y - Y0) / SP) * (W - 1))], back = (ix, iy) => [X0 + ix / (W - 1) * SP, Y0 + (1 - iy / (W - 1)) * SP];
  // (cada punto mancha también las casillas de al lado: la textura no da para una casilla cada uno y quedaban huecos)
  for (const p of pts) { const [jx, jy] = at(p[0], p[1]); for (let e = -1; e <= 1; e++) for (let d = -1; d <= 1; d++) { const ix = jx + d, iy = jy + e, k = iy * W + ix; if (ix < 0 || iy < 0 || ix >= W || iy >= W || p[2] < zb[k] - (d || e ? 0.002 : 0)) continue; if (d || e) { if (lum[k] >= 0 && zb[k] > p[2] - 0.002) continue; } zb[k] = p[2]; lum[k] = 0.3 * p[3] + 0.59 * p[4] + 0.11 * p[5]; sat[k] = hsv(p[3], p[4], p[5])[0]; img[k * 3] = p[3] * 255; img[k * 3 + 1] = p[4] * 255; img[k * 3 + 2] = p[5] * 255; } }
  // ¿es del ojo? lo oscuro (pupila, iris, la línea del párpado) y el blanco (poco color y claro); la piel tiene más color
  // (de lado a lado vale un blanco algo rosado; hacia arriba, solo el blanco blanco: en las caras muy claras, la piel
  // entre el ojo y la ceja parecía blanco del ojo)
  const ojoK = (sm, lm) => (ix, iy) => { let si = 0, no = 0; for (let d = -1; d <= 1; d++) for (let e = -1; e <= 1; e++) { const k = (iy + e) * W + ix + d, v = lum[k]; if (v < 0) continue; (v < 0.42 || (sat[k] < sm && v > lm)) ? si++ : no++; } return si > no; };
  const ojo = ojoK(0.13, 0.55), blanco = ojoK(0.07, 0.7);
  const eyes = [-1, 1].map(sd => {
    // la pupila: el centro de lo más oscuro donde están los ojos (entre la nariz y la sien, bajo las cejas)
    let sx = 0, sy = 0, n = 0; const [a0, b0] = at(sd < 0 ? -0.085 : 0.02, 0.81), [a1, b1] = at(sd < 0 ? -0.02 : 0.085, 0.765);
    for (let iy = b0; iy <= b1; iy++) for (let ix = a0; ix <= a1; ix++) { const v = lum[iy * W + ix]; if (v >= 0 && v < 0.09) { sx += ix; sy += iy; n++; } }
    if (n < 20) return null; const cx = Math.round(sx / n), cy = Math.round(sy / n);
    // el iris de lado a lado, por la fila de la pupila
    const dark = ojo;
    let l = cx, r = cx; while (dark(l - 1, cy) && cx - l < 120) l--; while (dark(r + 1, cy) && r - cx < 120) r++;
    const rad = (r - l) / 2, mid = (l + r) / 2, lid = [], low = [];
    // cada columna, de la pupila hacia arriba hasta la piel: ahí acaba la línea del párpado
    for (let i = 0; i <= 12; i++) {
      const ix = Math.round(mid - rad * 1.08 + i / 12 * rad * 2.16); let iy = cy, iy2 = cy;
      while (iy > cy - rad * 1.35 && (blanco(ix, iy - 1) || blanco(ix, iy - 2))) iy--;
      while (iy2 < cy + rad * 1.35 && (blanco(ix, iy2 + 1) || blanco(ix, iy2 + 2))) iy2++;
      const [x, y] = back(ix, iy), [, y2] = back(ix, iy2), z = zb[iy * W + ix] > -1e8 ? zb[iy * W + ix] : zb[cy * W + ix];
      lid.push([x, y, z].map(v => +v.toFixed(4))); low.push([x, y2, zb[iy2 * W + ix] > -1e8 ? zb[iy2 * W + ix] : z].map(v => +v.toFixed(4)));
    }
    // (un arco por los puntos: los que se van, por una piel muy clara que parecía el blanco del ojo, vuelven a él)
    for (const Lc of [lid, low]) for (let pasada = 0; pasada < 2; pasada++) {
      // (el arco, con los puntos del centro: las esquinas son las que se escapan)
      const A = Lc.slice(2, -2).map(q => [q[0], q[1]]), n = A.length; let sx = 0, sx2 = 0, sx3 = 0, sx4 = 0, sy = 0, sxy = 0, sx2y = 0;
      for (const [x, y] of A) { sx += x; sx2 += x * x; sx3 += x ** 3; sx4 += x ** 4; sy += y; sxy += x * y; sx2y += x * x * y; }
      const M = [[sx4, sx3, sx2], [sx3, sx2, sx], [sx2, sx, n]], R = [sx2y, sxy, sy], det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
      const D = det(M), co = [0, 1, 2].map(j => det(M.map((row, i) => row.map((v, k) => (k === j ? R[i] : v)))) / D);
      const res = Lc.map(([x, y]) => y - (co[0] * x * x + co[1] * x + co[2])), tol = Math.max(0.003, med(res.map(Math.abs)) * 2.5);
      Lc.forEach((q, i) => { if (Math.abs(res[i]) > tol) q[1] = +(co[0] * q[0] * q[0] + co[1] * q[0] + co[2]).toFixed(4); });
    }
    const [px, py] = back(cx, cy);
    return { c: [+px.toFixed(4), +py.toFixed(4)], r: +(rad / (W - 1) * SP).toFixed(4), lid, low };
  });
  res[name] = eyes;
  for (const e of eyes) if (e) for (const [Lc, col] of [[e.lid, [0, 255, 255]], [e.low, [255, 220, 0]]]) for (const q of Lc) { const [ix, iy] = at(q[0], q[1]); for (let d = -2; d <= 2; d++) for (const [dx, dy] of [[d, 0], [0, d]]) { const k = ((iy + dy) * W + ix + dx) * 3; if (k >= 0 && k < img.length) img.set(col, k); } }
  await sharp(img, { raw: { width: W, height: W, channels: 3 } }).resize(500, 500).png().toFile(`${OUT}/parpados-${name}.png`);
  console.log(name, eyes.map(e => e ? `ojo en ${e.c} (radio ${e.r})` : 'sin ojo').join(' · '));
}
fs.writeFileSync(`${OUT}/parpados.json`, JSON.stringify(res));
