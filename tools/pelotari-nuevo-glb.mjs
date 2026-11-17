// El GLB de un pelotari nuevo (pelota/estiloPelotari.js) a partir del personaje de Meshy con su esqueleto, andar y correr
// ya juntos (tools/meshy-rig-vecino.mjs). Hace lo que el juego espera de un pelotari:
//  - los clips con los nombres del de siempre: Walk y Run (los suyos, de Meshy) y Slash y Fist (el golpe y el puño en
//    alto del pelotari de siempre, src/assets/meshy/pelotari.glb), que actors/glbChar.js recorta en reposo, golpe,
//    celebración...;
//  - el golpe y el puño se pasan de un esqueleto al otro por cómo gira cada hueso en el mundo respecto a su reposo, no
//    copiando los números: los huesos de los dos esqueletos de Meshy no están orientados igual (el brazo, 40° de
//    diferencia), y copiados tal cual el brazo salía por detrás de la espalda;
//  - la camiseta del otro color (COLOR=rojo pasa el azul a colorado; COLOR=azul, el colorado a azul), cambiando el tono
//    solo en la ropa: la cabeza (cara, labios, pelo) se deja como está;
//  - la textura a webp (2048 px en el ordenador; PX=1024 para el móvil) y la malla comprimida.
// Uso: node tools/pelotari-nuevo-glb.mjs <unido.glb> <salida.glb>   [COLOR=rojo|azul] [PX=2048] [RATIO=1] [REALES=golpes.glb]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, textureCompress, prune, dedup, reorder, meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { statSync } from 'fs';
const [,, ENT, SAL] = process.argv;
if (!ENT || !SAL) { console.log('Uso: node tools/pelotari-nuevo-glb.mjs <unido.glb> <salida.glb>'); process.exit(1); }
const COLOR = process.env.COLOR || '', PX = +(process.env.PX || 2048), RATIO = +(process.env.RATIO || 1);
await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(ENT), R = doc.getRoot(), buf = R.listBuffers()[0];
const src = await io.read('src/assets/meshy/pelotari.glb'), RS = src.getRoot();

// ---- cuaterniones [x, y, z, w]
const mul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const inv = (q) => [-q[0], -q[1], -q[2], q[3]];
const norm = (q) => { const l = Math.hypot(...q) || 1; return q.map(v => v / l); };
const slerp = (a, b, t) => { let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; const s = d < 0 ? -1 : 1; d *= s;
  if (d > 0.9995) return norm(a.map((v, i) => v + (s * b[i] - v) * t)); const th = Math.acos(d), k0 = Math.sin(th * (1 - t)) / Math.sin(th), k1 = Math.sin(th * t) / Math.sin(th);
  return a.map((v, i) => v * k0 + s * b[i] * k1); };
const nombre = (n) => n.getName().replace('mixamorig:', '');
const padre = (root) => { const p = new Map(); for (const n of root.listNodes()) for (const c of n.listChildren()) p.set(c, n); return p; };
const PS = padre(RS), PT = padre(R);
const porNombre = (root) => new Map(root.listNodes().map(n => [nombre(n), n]));
const NS = porNombre(RS), NT = porNombre(R);
// (los nodos de arriba abajo, cada padre antes que sus hijos)
const orden = (root, P) => { const out = [], vis = (n) => { out.push(n); n.listChildren().forEach(vis); }; root.listNodes().filter(n => !P.has(n)).forEach(vis); return out; };
const OS = orden(RS, PS), OT = orden(R, PT);
const mundoReposo = (O, P) => { const W = new Map(); for (const n of O) W.set(n, P.has(n) ? mul(W.get(P.get(n)), n.getRotation()) : n.getRotation()); return W; };
const WS0 = mundoReposo(OS, PS), WT0 = mundoReposo(OT, PT);
const huesosT = new Set(R.listSkins().flatMap(s => s.listJoints()));

// ---- el golpe y el puño del pelotari de siempre, pasados al esqueleto nuevo
for (const clip of ['Slash', 'Fist']) {
  const a = RS.listAnimations().find(x => x.getName() === clip); if (!a) { console.log('  sin', clip); continue; }
  const rot = new Map(), tra = new Map();
  for (const c of a.listChannels()) { const s = c.getSampler(), e = { t: s.getInput().getArray(), v: s.getOutput().getArray() };
    if (c.getTargetPath() === 'rotation') rot.set(c.getTargetNode(), e); else if (c.getTargetPath() === 'translation') tra.set(c.getTargetNode(), e); }
  const T = [...rot.values()].reduce((m, e) => (e.t.length > m.length ? e.t : m), []);
  const muestra = (e, t, k) => { const n = e.t.length; if (t <= e.t[0]) return [...e.v.slice(0, k)]; if (t >= e.t[n - 1]) return [...e.v.slice((n - 1) * k, n * k)];
    let i = 0; while (e.t[i + 1] < t) i++; const u = (t - e.t[i]) / (e.t[i + 1] - e.t[i]), A = [...e.v.slice(i * k, i * k + k)], B = [...e.v.slice((i + 1) * k, (i + 1) * k + k)];
    return k === 4 ? slerp(A, B, u) : A.map((v, j) => v + (B[j] - v) * u); };
  const salidaR = new Map(), salidaT = [];
  const caderaS = NS.get('Hips'), caderaT = NT.get('Hips'), k = caderaT.getTranslation()[1] / caderaS.getTranslation()[1];
  for (const t of T) {
    const WS = new Map(); for (const n of OS) { const L = rot.has(n) ? muestra(rot.get(n), t, 4) : n.getRotation(); WS.set(n, PS.has(n) ? mul(WS.get(PS.get(n)), L) : L); }
    const WT = new Map();
    for (const n of OT) {
      const s = NS.get(nombre(n)), wp = PT.has(n) ? WT.get(PT.get(n)) : [0, 0, 0, 1];
      let L = n.getRotation();
      if (huesosT.has(n) && s && rot.has(s)) { const delta = mul(WS.get(s), inv(WS0.get(s))); L = norm(mul(inv(wp), mul(delta, WT0.get(n)))); }
      WT.set(n, mul(wp, L));
      if (huesosT.has(n)) { if (!salidaR.has(n)) salidaR.set(n, []); salidaR.get(n).push(...L); }
    }
    const ts = tra.get(caderaS); if (ts) { const v = muestra(ts, t, 3), r0 = caderaS.getTranslation(), r1 = caderaT.getTranslation(); salidaT.push(...r1.map((x, j) => x + (v[j] - r0[j]) * k)); }
  }
  const A = doc.createAnimation(clip), tiempos = doc.createAccessor().setType('SCALAR').setArray(new Float32Array(T)).setBuffer(buf);
  const canal = (n, path, arr, tipo) => { const s = doc.createAnimationSampler().setInterpolation('LINEAR').setInput(tiempos)
      .setOutput(doc.createAccessor().setType(tipo).setArray(new Float32Array(arr)).setBuffer(buf));
    A.addSampler(s); A.addChannel(doc.createAnimationChannel().setTargetNode(n).setTargetPath(path).setSampler(s)); };
  for (const [n, arr] of salidaR) canal(n, 'rotation', arr, 'VEC4');
  if (salidaT.length) canal(caderaT, 'translation', salidaT, 'VEC3');
  console.log(`  ${clip}: ${T.length} fotogramas, ${salidaR.size} huesos`);
}
// ---- los golpes reales (REALES=archivo.glb, de tools/blender/golpes-al-juego.py): movimientos de pelotaris de verdad
// sacados de vídeo y pasados a este mismo esqueleto (los nodos se buscan por su nombre). actors/glbChar.js los usa en
// vez de los hechos a mano (pelotaMoves.js) para los golpes que traen
if (process.env.REALES) {
  const dr = await io.read(process.env.REALES);
  for (const a of dr.getRoot().listAnimations()) {
    if (!/^Real_/.test(a.getName())) continue;
    const A = doc.createAnimation(a.getName()); let n = 0;
    for (const c of a.listChannels()) {
      const dst = NT.get(nombre(c.getTargetNode())), s = c.getSampler(); if (!dst) continue;
      const inp = doc.createAccessor().setType('SCALAR').setArray(new Float32Array(s.getInput().getArray())).setBuffer(buf);
      const out = doc.createAccessor().setType(s.getOutput().getType()).setArray(new Float32Array(s.getOutput().getArray())).setBuffer(buf);
      const ns = doc.createAnimationSampler().setInterpolation(s.getInterpolation()).setInput(inp).setOutput(out);
      A.addSampler(ns); A.addChannel(doc.createAnimationChannel().setTargetNode(dst).setTargetPath(c.getTargetPath()).setSampler(ns)); n++;
    }
    console.log(`  ${a.getName()}: ${n} canales`);
  }
}
// ---- los nombres de los clips del de siempre
for (const a of R.listAnimations()) { if (a.getName() === 'Walking') a.setName('Walk'); if (a.getName() === 'Running') a.setName('Run'); }

// ---- la camiseta del otro color (solo fuera de la cabeza)
if (COLOR) {
  const tex = R.listTextures().find(t => R.listMaterials().some(m => m.getBaseColorTexture() === t)) || R.listTextures()[0];
  const { data, info } = await sharp(Buffer.from(tex.getImage())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, cabeza = new Uint8Array(W * H);
  // (lo que en la textura es de la cabeza: los triángulos con los tres vértices por encima del cuello)
  for (const mesh of R.listMeshes()) for (const p of mesh.listPrimitives()) {
    const pos = p.getAttribute('POSITION'), uv = p.getAttribute('TEXCOORD_0'), idx = p.getIndices(); if (!pos || !uv || !idx) continue;
    let ymin = Infinity, ymax = -Infinity; for (let i = 0; i < pos.getCount(); i++) { const y = pos.getElement(i, [])[1]; ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); }
    const corte = ymin + (ymax - ymin) * 0.84;   // (en una persona, el cuello está hacia el 84 % de la altura)
    const ia = idx.getArray(), P3 = [], U = [];
    for (let i = 0; i < ia.length; i += 3) {
      const v = [ia[i], ia[i + 1], ia[i + 2]]; if (!v.every(j => pos.getElement(j, P3)[1] > corte)) continue;
      const q = v.map(j => uv.getElement(j, [])).map(([u, w]) => [u * W, w * H]);
      const x0 = Math.max(0, Math.floor(Math.min(...q.map(a => a[0]))) - 2), x1 = Math.min(W - 1, Math.ceil(Math.max(...q.map(a => a[0]))) + 2);
      const y0 = Math.max(0, Math.floor(Math.min(...q.map(a => a[1]))) - 2), y1 = Math.min(H - 1, Math.ceil(Math.max(...q.map(a => a[1]))) + 2);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cabeza[y * W + x] = 1;
    }
  }
  const destino = COLOR === 'rojo' ? 356 : 226; let n = 0;
  for (let i = 0; i < W * H; i++) {
    if (cabeza[i]) continue;
    const r = data[i * 4] / 255, g = data[i * 4 + 1] / 255, b = data[i * 4 + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (d < 0.18 || mx < 0.12) continue;   // (grises, blancos y negros: el pantalón, las zapatillas, las costuras)
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360;
    const s = d / mx, esAzul = h > 205 && h < 255 && s > 0.35, esRojo = (h > 340 || h < 12) && s > 0.5;
    if (!(COLOR === 'rojo' ? esAzul : esRojo)) continue;
    // (mismo brillo y saturación, otro tono; el colorado, un poco más claro, como la camiseta de la otra pareja)
    const v = COLOR === 'rojo' ? Math.min(1, mx * 1.08) : mx * 0.9, c = v * s, hh = destino / 60, x = c * (1 - Math.abs(hh % 2 - 1)), m0 = v - c;
    const [r1, g1, b1] = hh < 1 ? [c, x, 0] : hh < 2 ? [x, c, 0] : hh < 3 ? [0, c, x] : hh < 4 ? [0, x, c] : hh < 5 ? [x, 0, c] : [c, 0, x];
    data[i * 4] = (r1 + m0) * 255; data[i * 4 + 1] = (g1 + m0) * 255; data[i * 4 + 2] = (b1 + m0) * 255; n++;
  }
  tex.setImage(new Uint8Array(await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer())).setMimeType('image/png');
  console.log(`  camiseta a ${COLOR}: ${(100 * n / (W * H)).toFixed(1)} % de la textura`);
}
const tris = () => R.listMeshes().reduce((a, m) => a + m.listPrimitives().reduce((b, p) => b + (p.getIndices()?.getCount() || 0) / 3, 0), 0);
const t0 = tris();
await doc.transform(
  ...(RATIO < 1 ? [weld(), simplify({ simplifier: MeshoptSimplifier, ratio: RATIO, error: 0.004, lockBorder: false })] : []),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [PX, PX], quality: 90 }),
  dedup(), prune({ keepLeaves: true }), reorder({ encoder: MeshoptEncoder }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
await io.write(SAL, doc);
console.log(SAL, R.listAnimations().map(a => a.getName()).join(', '), `${t0 | 0} → ${tris() | 0} triángulos, ${(statSync(SAL).size / 1024) | 0} KB`);
