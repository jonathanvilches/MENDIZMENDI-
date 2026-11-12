// Las texturas de los personajes de Meshy, sin motas de otros colores: Meshy reparte la textura en unas dos mil piezas
// muy pequeñas (la mediana, de tres triángulos) y lo que quedaba entre pieza y pieza (restos de otros colores) se colaba
// al alejarse o en los bordes: motas rojizas en el pelo, claras en la camiseta. Sin tocar la malla ni el reparto (las
// chicas, src/actors/chicas.js, se montan sobre los vértices y la textura del chico):
//   1. lo de fuera de las piezas se rellena con el color de su propio borde (hasta «RELLENO» píxeles), así al alejarse
//      cada pieza solo se mezcla con su color;
//   2. se guarda en WebP con el color a resolución completa cerca de los bordes (smartSubsample);
//   3. la misma textura, reducida, en sus versiones de 1024 px (src/assets/meshy-1024) y ligera (lod), solo la imagen.
// (Con ANCHO=5, además, el color de cada lado de una costura se acerca al de en medio de los dos: probado en noviembre
// de 2026, dejaba cortes nuevos dentro de las piezas y no se usa.)
// (los vecinos, cuyos originales están en src/assets/meshy/vecinos: FUENTE=src/assets/meshy/vecinos)
// Uso: node tools/meshy-costuras.mjs [modelo…]   (sin modelos, todos los de src/assets/meshy; reescribe los GLB)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { readdirSync, statSync, existsSync } from 'fs';

const SRC = process.env.FUENTE || 'src/assets/meshy', DST = process.env.OUT || SRC, ANCHO = +(process.env.ANCHO ?? 0), RELLENO = 24;   // (OUT: otra carpeta, para probar)
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const modelos = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(SRC).filter(f => f.endsWith('.glb')).map(f => f.replace('.glb', ''));

for (const m of modelos) {
  const f = `${SRC}/${m}.glb`, kb0 = statSync(f).size >> 10;
  const doc = await io.read(f), p = doc.getRoot().listMeshes()[0].listPrimitives()[0], tex = p.getMaterial().getBaseColorTexture();
  const A = p.getAttribute('POSITION'), U = p.getAttribute('TEXCOORD_0'), I = Uint32Array.from(p.getIndices().getArray()), n = A.getCount(), e = [0, 0, 0];
  const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { A.getElement(i, e); pos.set(e, i * 3); U.getElement(i, e); uv[i * 2] = e[0]; uv[i * 2 + 1] = e[1]; }
  const { data, info } = await sharp(Buffer.from(tex.getImage())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, src = new Float32Array(W * H * 3);
  for (let i = 0; i < W * H; i++) for (let c = 0; c < 3; c++) src[i * 3 + c] = data[i * 4 + c];
  const px = (v) => [uv[v * 2] * W, uv[v * 2 + 1] * H];   // (la V del GLB ya va de arriba abajo, como la imagen)
  const muestra = (x, y, o) => {   // (bilineal, en el lienzo original)
    x = Math.min(W - 1.001, Math.max(0, x - 0.5)); y = Math.min(H - 1.001, Math.max(0, y - 0.5));
    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
    for (let c = 0; c < 3; c++) { const a = src[(y0 * W + x0) * 3 + c], b = src[(y0 * W + x0 + 1) * 3 + c], d = src[((y0 + 1) * W + x0) * 3 + c], g = src[((y0 + 1) * W + x0 + 1) * 3 + c];
      o[c] = (a * (1 - fx) + b * fx) * (1 - fy) + (d * (1 - fx) + g * fx) * fy; }
    return o;
  };
  // ---- las piezas: qué píxeles caen dentro de algún triángulo ----
  const dentro = new Uint8Array(W * H);
  for (let t = 0; t < I.length; t += 3) {
    const [a, b, c] = [px(I[t]), px(I[t + 1]), px(I[t + 2])], d = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]); if (Math.abs(d) < 1e-9) continue;
    const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]) - 1)), x1 = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0], c[0]) + 1));
    const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]) - 1)), y1 = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1], c[1]) + 1));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const qx = x + 0.5, qy = y + 0.5;
      const w0 = ((b[0] - qx) * (c[1] - qy) - (c[0] - qx) * (b[1] - qy)) / d, w1 = ((c[0] - qx) * (a[1] - qy) - (a[0] - qx) * (c[1] - qy)) / d, w2 = 1 - w0 - w1, m = -0.75 / Math.sqrt(Math.abs(d));
      if (w0 >= m && w1 >= m && w2 >= m) dentro[y * W + x] = 1; }
  }
  // ---- las costuras: aristas iguales en la malla (por posición) con distinta UV ----
  const clave = new Int32Array(n), mapa = new Map(); let np = 0;
  for (let i = 0; i < n; i++) { const k = `${Math.round(pos[i * 3] * 1e5)},${Math.round(pos[i * 3 + 1] * 1e5)},${Math.round(pos[i * 3 + 2] * 1e5)}`; let r = mapa.get(k); if (r === undefined) mapa.set(k, r = np++); clave[i] = r; }
  const aristas = new Map();
  for (let t = 0; t < I.length; t += 3) for (let j = 0; j < 3; j++) {
    const a = I[t + j], b = I[t + (j + 1) % 3], c = I[t + (j + 2) % 3], ka = clave[a], kb = clave[b], k = ka < kb ? `${ka}_${kb}` : `${kb}_${ka}`;
    let L = aristas.get(k); if (!L) aristas.set(k, L = []); L.push({ a: ka < kb ? a : b, b: ka < kb ? b : a, c });
  }
  const sum = new Float32Array(W * H * 3), pes = new Float32Array(W * H), cS = [0, 0, 0], cO = [0, 0, 0];
  let costuras = 0;
  for (const L of aristas.values()) {
    if (L.length !== 2 || !ANCHO) continue;
    const [s1, s2] = L, dUV = (v, w) => Math.hypot(uv[v * 2] - uv[w * 2], uv[v * 2 + 1] - uv[w * 2 + 1]);
    if (dUV(s1.a, s2.a) < 1e-4 && dUV(s1.b, s2.b) < 1e-4) continue;   // (no es costura: la misma arista en la textura)
    costuras++;
    for (const [S, O] of [[s1, s2], [s2, s1]]) {
      const P0 = px(S.a), P1 = px(S.b), PC = px(S.c), Q0 = px(O.a), Q1 = px(O.b), QC = px(O.c);
      const ex = P1[0] - P0[0], ey = P1[1] - P0[1], el = Math.hypot(ex, ey); if (el < 0.5) continue;
      const dT = (P1[0] - P0[0]) * (PC[1] - P0[1]) - (PC[0] - P0[0]) * (P1[1] - P0[1]); if (Math.abs(dT) < 1e-9) continue;
      // (hacia dentro de cada triángulo, un píxel: en el borde mismo de la pieza el color ya es dudoso)
      const dentroDe = (A0, A1, C) => { const mx = (A0[0] + A1[0]) / 2, my = (A0[1] + A1[1]) / 2, vx = C[0] - mx, vy = C[1] - my, l = Math.hypot(vx, vy) || 1; return [vx / l, vy / l]; };
      const [nSx, nSy] = dentroDe(P0, P1, PC), [nOx, nOy] = dentroDe(Q0, Q1, QC);
      const x0 = Math.max(0, Math.floor(Math.min(P0[0], P1[0], PC[0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(P0[0], P1[0], PC[0])));
      const y0 = Math.max(0, Math.floor(Math.min(P0[1], P1[1], PC[1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(P0[1], P1[1], PC[1])));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = y * W + x; if (!dentro[i]) continue;
        // (solo los píxeles de este triángulo: cerca de él puede haber trozos de otras piezas, de otro color)
        { const X = x + 0.5, Y = y + 0.5, w0 = ((P1[0] - X) * (PC[1] - Y) - (PC[0] - X) * (P1[1] - Y)) / dT, w1 = ((PC[0] - X) * (P0[1] - Y) - (P0[0] - X) * (PC[1] - Y)) / dT, w2 = 1 - w0 - w1, mg = -0.75 / Math.sqrt(Math.abs(dT));
          if (w0 < mg || w1 < mg || w2 < mg) continue; }
        const qx = x + 0.5 - P0[0], qy = y + 0.5 - P0[1], t = Math.max(0, Math.min(1, (qx * ex + qy * ey) / (el * el)));
        const dist = Math.abs(qx * ey - qy * ex) / el; if (dist > ANCHO) continue;
        muestra(P0[0] + ex * t + nSx, P0[1] + ey * t + nSy, cS);
        muestra(Q0[0] + (Q1[0] - Q0[0]) * t + nOx, Q0[1] + (Q1[1] - Q0[1]) * t + nOy, cO);
        const u = 1 - dist / ANCHO, w = u * u * (3 - 2 * u);
        for (let c = 0; c < 3; c++) sum[i * 3 + c] += ((cS[c] + cO[c]) / 2 - cS[c]) * w;
        pes[i] += w;
      }
    }
  }
  const out = new Float32Array(src);
  for (let i = 0; i < W * H; i++) if (pes[i] > 0) { const k = Math.min(1, pes[i]) / pes[i]; for (let c = 0; c < 3; c++) out[i * 3 + c] += sum[i * 3 + c] * k; }
  // ---- fuera de las piezas, el color de su borde (pasada a pasada, un píxel cada vez) ----
  let lleno = new Uint8Array(dentro);
  for (let pasada = 0; pasada < RELLENO; pasada++) {
    const nuevo = new Uint8Array(lleno); let cambios = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (lleno[i]) continue;
      let r = 0, g = 0, b = 0, k = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; if (!lleno[j]) continue; r += out[j * 3]; g += out[j * 3 + 1]; b += out[j * 3 + 2]; k++; }
      if (k) { out[i * 3] = r / k; out[i * 3 + 1] = g / k; out[i * 3 + 2] = b / k; nuevo[i] = 1; cambios++; }
    }
    lleno = nuevo; if (!cambios) break;
  }
  const buf = Buffer.alloc(W * H * 3); for (let i = 0; i < W * H * 3; i++) buf[i] = Math.max(0, Math.min(255, Math.round(out[i])));
  const webp = await sharp(buf, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 90, smartSubsample: true, effort: 6 }).toBuffer();
  tex.setImage(new Uint8Array(webp)); tex.setMimeType('image/webp');
  await io.write(`${DST}/${m}.glb`, doc);
  console.log(m, `${costuras} costuras`, `${kb0} → ${statSync(`${DST}/${m}.glb`).size >> 10} KB`);
  // (y la misma textura en sus versiones de 1024 px y ligera, cada una a su tamaño: solo la textura, sin tocar la malla,
  // que las chicas casan sus parches con el orden de sus vértices)
  if (!process.env.OUT) for (const v of [`src/assets/meshy-1024/${m}.glb`, `src/assets/meshy/lod/${m}.glb`].filter(v => existsSync(v))) {
    if (!existsSync(v)) continue;
    const dv = await io.read(v), tv = dv.getRoot().listTextures()[0], [w, h] = tv.getSize(), k0 = statSync(v).size >> 10;
    const img = await sharp(buf, { raw: { width: W, height: H, channels: 3 } }).resize(w, h, { kernel: 'lanczos3' }).webp({ quality: 88, smartSubsample: true, effort: 6 }).toBuffer();
    tv.setImage(new Uint8Array(img)); tv.setMimeType('image/webp'); await io.write(v, dv);
    console.log('  ', v, `${w} px`, `${k0} → ${statSync(v).size >> 10} KB`);
  }
}
