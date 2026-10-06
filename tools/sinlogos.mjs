// Quita logotipos, escudos, números y letras de patrocinadores de la ropa de los personajes de Meshy.
// Cada punto de la textura se sitúa en el cuerpo del modelo (por sus coordenadas UV) y se agrupa con los de su zona del
// cuerpo (cubos de un décimo de su altura). En cada zona de ropa se miran sus colores de tela (los que ocupan buena parte de la zona) y
// lo que no se parece a ellos (letras, escudos, marcas) se pinta del color de tela más cercano. Las zonas de piel y pelo
// (cara, ojos, manos) no se tocan.
// Uso: node tools/sinlogos.mjs modelo.glb salida.png [url del servidor de desarrollo]
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'fs';
const [,, glb, out, base = 'http://127.0.0.1:5173/', radii = '6', share = '0.3', simd = '60', quitar = '', dist = '70', liso = '0'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage();
p.on('console', m => console.log(m.text()));
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.route(/\/__modelo\.glb$/, (r) => r.fulfill({ body: readFileSync(glb), contentType: 'model/gltf-binary' }));
await p.goto(base + 'lab/glb.html').catch(() => {});
const url = await p.evaluate(async ([base, RADII, SHARE, SIMD, QUITAR, DIST, LISO]) => {
  const T = await import(base + 'node_modules/three/build/three.module.js');
  const { GLTFLoader } = await import(base + 'node_modules/three/examples/jsm/loaders/GLTFLoader.js');
  const { MeshoptDecoder } = await import(base + 'node_modules/three/examples/jsm/libs/meshopt_decoder.module.js');
  const L = new GLTFLoader(); L.setMeshoptDecoder(MeshoptDecoder);
  const g = await L.loadAsync(base + '__modelo.glb'); g.scene.updateMatrixWorld(true);
  let mesh = null; g.scene.traverse(o => { if (o.isMesh && o.material?.map && !mesh) mesh = o; });
  const img = mesh.material.map.image, W = img.width, H = img.height;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
  const data = cx.getImageData(0, 0, W, H), px = data.data;
  const G = mesh.geometry, pos = G.attributes.position, uv = G.attributes.uv, idx = G.index;
  const P = [], v = new T.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld); P.push(v.x, v.y, v.z); }
  const box = new T.Box3().setFromBufferAttribute(pos); box.applyMatrix4(mesh.matrixWorld);
  const Hm = box.max.y - box.min.y, cs = Hm * 0.1, vs = Hm / 160;
  const vox = [Math.ceil((box.max.x - box.min.x) / vs) + 1, Math.ceil(Hm / vs) + 1, Math.ceil((box.max.z - box.min.z) / vs) + 1];
  const vx = new Int16Array(W * H), vy = new Int16Array(W * H), vz = new Int16Array(W * H);
  const cell = new Int32Array(W * H).fill(-1), keyOf = new Map(), low = [];
  const n = idx ? idx.count : pos.count;
  for (let t = 0; t < n; t += 3) {
    const ia = idx ? idx.getX(t) : t, ib = idx ? idx.getX(t + 1) : t + 1, ic = idx ? idx.getX(t + 2) : t + 2;
    const ax = uv.getX(ia) * W, ay = uv.getY(ia) * H, bx = uv.getX(ib) * W, by = uv.getY(ib) * H, cxx = uv.getX(ic) * W, cy = uv.getY(ic) * H;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cxx))), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cxx))), y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)));
    const d = (by - cy) * (ax - cxx) + (cxx - bx) * (ay - cy); if (Math.abs(d) < 1e-9) continue;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const qx = x + 0.5, qy = y + 0.5, w1 = ((by - cy) * (qx - cxx) + (cxx - bx) * (qy - cy)) / d, w2 = ((cy - ay) * (qx - cxx) + (ax - cxx) * (qy - cy)) / d, w3 = 1 - w1 - w2;
      if (w1 < -0.02 || w2 < -0.02 || w3 < -0.02) continue;
      const X = w1 * P[ia * 3] + w2 * P[ib * 3] + w3 * P[ic * 3], Y = w1 * P[ia * 3 + 1] + w2 * P[ib * 3 + 1] + w3 * P[ic * 3 + 1], Z = w1 * P[ia * 3 + 2] + w2 * P[ib * 3 + 2] + w3 * P[ic * 3 + 2];
      const k = Math.floor(X / cs) + ',' + Math.floor(Y / cs) + ',' + Math.floor(Z / cs);
      let id = keyOf.get(k); if (id == null) { id = keyOf.size; keyOf.set(k, id); low.push(Y - box.min.y < Hm * 0.3); }
      cell[y * W + x] = id; vx[y * W + x] = Math.floor((X - box.min.x) / vs); vy[y * W + x] = Math.floor((Y - box.min.y) / vs); vz[y * W + x] = Math.floor((Z - box.min.z) / vs);
    }
  }
  const skinOrHair = (r, gg, bb) => (r > gg + 8 && gg >= bb - 6 && r - bb > 25 && r > 90 && !(r > 140 && gg < 110 && bb < 110)) || (r < 125 && r > gg && gg >= bb && r - bb > 18);
  // colores que se cambian siempre por otro (franjas del diseño del club sobre las que van las letras): «origen>destino»
  for (const [A, B] of QUITAR) for (let t = 0; t < W * H; t++) {
    if (cell[t] < 0 || vy[t] > 160 * 0.71) continue;
    if (Math.abs(px[t * 4] - A[0]) + Math.abs(px[t * 4 + 1] - A[1]) + Math.abs(px[t * 4 + 2] - A[2]) < 50 && !skinOrHair(px[t * 4], px[t * 4 + 1], px[t * 4 + 2])) { px[t * 4] = B[0]; px[t * 4 + 1] = B[1]; px[t * 4 + 2] = B[2]; }
  }
  // paleta: k-medias sobre una muestra de la textura
  let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;   // siempre el mismo resultado
  const K = 20, pal = [];
  for (let k = 0; k < K; k++) { let i; do { i = Math.floor(rnd() * W * H); } while (cell[i] < 0); pal.push([px[i * 4], px[i * 4 + 1], px[i * 4 + 2]]); }
  const near = (r, gg, bb) => { let best = 0, bd = 1e9; for (let k = 0; k < K; k++) { const P2 = pal[k], dd = (P2[0] - r) ** 2 + (P2[1] - gg) ** 2 + (P2[2] - bb) ** 2; if (dd < bd) { bd = dd; best = k; } } return best; };
  for (let it = 0; it < 8; it++) {
    const acc = Array.from({ length: K }, () => [0, 0, 0, 0]);
    for (let i = 0; i < W * H; i += 7) { if (cell[i] < 0) continue; const k = near(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]), A = acc[k]; A[0] += px[i * 4]; A[1] += px[i * 4 + 1]; A[2] += px[i * 4 + 2]; A[3]++; }
    acc.forEach((A, k) => { if (A[3]) pal[k] = [A[0] / A[3], A[1] / A[3], A[2] / A[3]]; });
  }
  const sim = pal.map(A => pal.map((B, j) => Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) < SIMD ? j : -1).filter(j => j >= 0));
  // rejilla de vóxeles con cuentas por color de la paleta (y la suma de los colores) y sumas acumuladas para contar cajas al momento
  const nx = vox[0], ny = vox[1], nz = vox[2], NV = (nx + 1) * (ny + 1) * (nz + 1), S = K * 4;
  const acc = new Float32Array(NV * S), lab = new Uint8Array(W * H), at = (i, j, k) => ((i * (ny + 1) + j) * (nz + 1) + k) * S;
  const build = () => {
    acc.fill(0);
  for (let t = 0; t < W * H; t++) {
    const c = cell[t]; if (c < 0) continue;
    const k = near(px[t * 4], px[t * 4 + 1], px[t * 4 + 2]); lab[t] = k;
    const o = at(vx[t] + 1, vy[t] + 1, vz[t] + 1) + k * 4; acc[o]++; acc[o + 1] += px[t * 4]; acc[o + 2] += px[t * 4 + 1]; acc[o + 3] += px[t * 4 + 2];
  }
  for (let i = 1; i <= nx; i++) for (let j = 0; j <= ny; j++) for (let k = 0; k <= nz; k++) { const a = at(i, j, k), b2 = at(i - 1, j, k); for (let s2 = 0; s2 < S; s2++) acc[a + s2] += acc[b2 + s2]; }
  for (let i = 0; i <= nx; i++) for (let j = 1; j <= ny; j++) for (let k = 0; k <= nz; k++) { const a = at(i, j, k), b2 = at(i, j - 1, k); for (let s2 = 0; s2 < S; s2++) acc[a + s2] += acc[b2 + s2]; }
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) for (let k = 1; k <= nz; k++) { const a = at(i, j, k), b2 = at(i, j, k - 1); for (let s2 = 0; s2 < S; s2++) acc[a + s2] += acc[b2 + s2]; }
  };
  build();
  // piel, pelo y ojos: los colores que tienen buena parte de sus puntos de los hombros para arriba
  const head = new Float64Array(K), all = new Float64Array(K);
  for (let t = 0; t < W * H; t++) { if (cell[t] < 0) continue; all[lab[t]]++; if (vy[t] > 160 * 0.71) head[lab[t]]++; }
  const skin = pal.map((P2, k) => skinOrHair(P2[0], P2[1], P2[2]));
  console.log('paleta', pal.map((P2, k) => P2.map(Math.round).join('/') + (skin[k] ? '*' : '') + ' ' + (all[k] / 1000 | 0) + 'k').join('  '));
  const qb = new Float32Array(S);
  const query = (x, y, z, R) => {
    const x0 = Math.max(0, x - R), x1 = Math.min(nx - 1, x + R) + 1, y0 = Math.max(0, y - R), y1 = Math.min(ny - 1, y + R) + 1, z0 = Math.max(0, z - R), z1 = Math.min(nz - 1, z + R) + 1;
    const c = [[x1, y1, z1, 1], [x0, y1, z1, -1], [x1, y0, z1, -1], [x1, y1, z0, -1], [x0, y0, z1, 1], [x0, y1, z0, 1], [x1, y0, z0, 1], [x0, y0, z0, -1]];
    qb.fill(0); for (const [a, b2, d, sg] of c) { const o = at(a, b2, d); for (let s2 = 0; s2 < S; s2++) qb[s2] += sg * acc[o + s2]; }
    return qb;
  };
  // cada punto de ropa con un color que en su entorno es minoritario (letras, escudos, marcas) toma el color de tela dominante
  let changed = 0;
  for (const [pass, R] of RADII.entries()) {
    if (pass) build();
    for (let t = 0; t < W * H; t++) {
      if (cell[t] < 0 || vy[t] > 160 * 0.71) continue;   // de los hombros para arriba (cara, ojos, pelo) no se toca
      const q = query(vx[t], vy[t], vz[t], R);
      // masa de cada color contando los de la paleta parecidos (un rojo con luz y en sombra son la misma tela)
      let tot = 0, sk = 0; for (let k = 0; k < K; k++) if (!skin[k]) tot += q[k * 4]; else sk += q[k * 4];
      if (skin[lab[t]] && sk > tot) continue;   // piel de verdad (brazos, manos, piernas): no se toca
      let best = -1, bm = -1; for (let k = 0; k < K; k++) { if (skin[k] || !q[k * 4]) continue; let m2 = 0; for (const j of sim[k]) m2 += q[j * 4]; if (m2 > bm) { bm = m2; best = k; } }
      let own = 0; for (const j of sim[lab[t]]) own += q[j * 4];
      if (best < 0) continue;
      if (own >= tot * SHARE) continue;
      const n2 = q[best * 4], r = q[best * 4 + 1] / n2, gg = q[best * 4 + 2] / n2, bb = q[best * 4 + 3] / n2;
      if (Math.abs(r - px[t * 4]) + Math.abs(gg - px[t * 4 + 1]) + Math.abs(bb - px[t * 4 + 2]) < DIST) continue;   // ya es de la tela
      px[t * 4] = r; px[t * 4 + 1] = gg; px[t * 4 + 2] = bb; changed++;
    }
  }
  // tela lisa: cada punto de ropa toma el color medio de su tela alrededor (se va el estampado del club y cualquier resto de letra)
  if (LISO) {
    build();
    const out = new Uint8ClampedArray(px);
    for (let t = 0; t < W * H; t++) {
      if (cell[t] < 0 || vy[t] > 160 * 0.71) continue;
      const q = query(vx[t], vy[t], vz[t], LISO);
      let tot = 0, sk = 0; for (let k = 0; k < K; k++) if (!skin[k]) tot += q[k * 4]; else sk += q[k * 4];
      if (skin[lab[t]] && sk > tot * 0.2) continue;   // borde con la piel: se deja como está (si no, sale en escalera)
      let best = -1, bm = -1; for (let k = 0; k < K; k++) { if (skin[k] || !q[k * 4]) continue; let m2 = 0; for (const j of sim[k]) m2 += q[j * 4]; if (m2 > bm) { bm = m2; best = k; } }
      if (best < 0) continue;
      let own = 0; for (const j of sim[lab[t]]) own += q[j * 4];
      // su propia tela si tiene peso en el entorno (así los bordes entre prendas siguen el dibujo y no salen en escalera)
      const G = (sim[lab[t]].includes(best) || own >= tot * 0.3 ? sim[lab[t]] : sim[best]).filter(j => !skin[j]);
      let n2 = 0, r = 0, gg = 0, bb = 0; for (const j of G) { n2 += q[j * 4]; r += q[j * 4 + 1]; gg += q[j * 4 + 2]; bb += q[j * 4 + 3]; }
      if (!n2) continue;
      out[t * 4] = r / n2; out[t * 4 + 1] = gg / n2; out[t * 4 + 2] = bb / n2;
    }
    px.set(out);
  }
  // bordes de las islas de la textura: los puntos de fuera se rellenan con el de al lado (si no, al alejarse salen rayas del color viejo)
  const done = new Uint8Array(W * H); for (let t = 0; t < W * H; t++) done[t] = cell[t] >= 0 ? 1 : 0;
  for (let it = 0; it < 8; it++) {
    const add = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = y * W + x; if (done[t]) continue;
      const n = x > 0 && done[t - 1] ? t - 1 : x < W - 1 && done[t + 1] ? t + 1 : y > 0 && done[t - W] ? t - W : y < H - 1 && done[t + W] ? t + W : -1;
      if (n >= 0) add.push(t, n);
    }
    for (let i = 0; i < add.length; i += 2) { const t = add[i], n = add[i + 1]; px[t * 4] = px[n * 4]; px[t * 4 + 1] = px[n * 4 + 1]; px[t * 4 + 2] = px[n * 4 + 2]; done[t] = 1; }
  }
  cx.putImageData(data, 0, 0);
  console.log('puntos cambiados', changed);
  return cv.toDataURL('image/png');
}, [base, radii.split(',').map(Number), +share, +simd, quitar ? quitar.split(',').map(c => c.split('>').map(x => x.split('/').map(Number))) : [], +dist, +liso]);
writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
await b.close();
