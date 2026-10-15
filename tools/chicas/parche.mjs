// Las chicas en el juego: lo que cambia del chico (tools/blender/chicas: cabeza.py, textura.py, pelo.py y exportar.py),
// listo para ponérselo en el juego encima del modelo del chico (src/actors/chicas.js). Por modelo y peinado escribe en
// src/assets/chicas/<resolución>/:
//   <modelo>.parche: los vértices que cambian (posición, normal y UV), los que se añaden (donde una esquina necesita
//     otra UV) y las esquinas de los triángulos que pasan a usarlos; con los índices del GLB de esa resolución (el de
//     1024 px tiene los vértices en otro orden: se casan por posición y UV)
//   <modelo>.webp: la textura repintada (cabeza, frente, cejas, pestañas, labios), solo lo que cambia, con transparencia
//   <modelo>-<peinado>.glb: el pelo, con su esqueleto (los nombres de los huesos casan con los del chico)
// Uso: node tools/chicas/parche.mjs <modelo> <peinado> <carpeta de exportar.py> <textura repintada 2048.png>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt, prune, textureCompress, dedup, weldPrimitive, simplifyPrimitive } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';

const [,, MODELO, PEINADO, EXP, TEX1] = process.argv;
await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const f32 = (p) => { const b = readFileSync(p); return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4); };
const i32 = (p) => { const b = readFileSync(p); return new Int32Array(b.buffer, b.byteOffset, b.byteLength / 4); };

// ---- el modelo de referencia (el de 2048 px, el mismo orden de vértices que en Blender) ----
async function prim(f) {
  const doc = await io.read(f), p = doc.getRoot().listMeshes()[0].listPrimitives()[0];
  const A = (s) => p.getAttribute(s), n = A('POSITION').getCount();
  const get = (s, k) => { const a = A(s), o = new Float32Array(n * k), e = []; for (let i = 0; i < n; i++) { a.getElement(i, e); for (let j = 0; j < k; j++) o[i * k + j] = e[j]; } return o; };
  return { doc, n, pos: get('POSITION', 3), nor: get('NORMAL', 3), uv: get('TEXCOORD_0', 2), idx: Uint32Array.from(p.getIndices().getArray()) };
}
const REF = await prim(`src/assets/meshy/${MODELO}.glb`);
const chico = f32(`${EXP}/${MODELO}-chico-malla.bin`), chica = f32(`${EXP}/${MODELO}-${PEINADO}-malla.bin`), tris = i32(`${EXP}/${MODELO}-chico-tris.bin`);
// (en la chica, algunos triángulos van dados la vuelta para el render de Blender: las mismas tres esquinas en otro orden.
// En el juego no hace falta (las caras del revés no se pintan) y el GLB conserva su orden: cada esquina va por su vértice)
const trisC = i32(`${EXP}/${MODELO}-${PEINADO}-tris.bin`);
const L = chico.length / 8;
if (L !== REF.idx.length) throw new Error(`esquinas: ${L} en Blender y ${REF.idx.length} en el GLB`);
for (let l = 0; l < L; l++) if (tris[l] !== REF.idx[l]) throw new Error(`el orden de los vértices no casa en la esquina ${l}`);

// ---- de Blender (mundo, Z arriba) al GLB (local, Y arriba): una transformación afín, ajustada con el chico ----
// (mínimos cuadrados: p_glb = A · [x, y, z, 1])
function ajuste() {
  const AtA = Array.from({ length: 4 }, () => new Float64Array(4)), AtB = Array.from({ length: 4 }, () => new Float64Array(3));
  for (let l = 0; l < L; l++) {
    const v = REF.idx[l], x = [chico[l * 8], chico[l * 8 + 1], chico[l * 8 + 2], 1];
    for (let a = 0; a < 4; a++) { for (let b = 0; b < 4; b++) AtA[a][b] += x[a] * x[b]; for (let c = 0; c < 3; c++) AtB[a][c] += x[a] * REF.pos[v * 3 + c]; }
  }
  // (Gauss-Jordan de 4 × 4 con tres lados derechos)
  const M = AtA.map((r, i) => [...r, ...AtB[i]]);
  for (let i = 0; i < 4; i++) {
    let p = i; for (let r = i + 1; r < 4; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
    [M[i], M[p]] = [M[p], M[i]]; const d = M[i][i];
    for (let c = 0; c < 7; c++) M[i][c] /= d;
    for (let r = 0; r < 4; r++) if (r !== i) { const k = M[r][i]; for (let c = 0; c < 7; c++) M[r][c] -= k * M[i][c]; }
  }
  return [0, 1, 2].map(c => [M[0][4 + c], M[1][4 + c], M[2][4 + c], M[3][4 + c]]);
}
const A = ajuste(), aplica = (x, y, z) => A.map(r => r[0] * x + r[1] * y + r[2] * z + r[3]);
// (normales: la parte lineal sin escala; es una rotación con escala uniforme)
const esc = Math.cbrt(Math.abs(A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0])));
const rota = (x, y, z) => { const r = A.map(f => (f[0] * x + f[1] * y + f[2] * z) / esc), n = Math.hypot(...r) || 1; return r.map(v => v / n); };
let res = 0;
for (let l = 0; l < L; l++) { const v = REF.idx[l], q = aplica(chico[l * 8], chico[l * 8 + 1], chico[l * 8 + 2]); res = Math.max(res, Math.hypot(q[0] - REF.pos[v * 3], q[1] - REF.pos[v * 3 + 1], q[2] - REF.pos[v * 3 + 2])); }
console.log('ajuste Blender → GLB: error máximo', res.toExponential(2), 'escala', esc.toFixed(5));
if (res > 1e-4) throw new Error('la malla de Blender no casa con el GLB');

// ---- la chica, vértice a vértice: lo que cambia y lo que hay que partir (esquinas de un mismo vértice con otra UV) ----
const Q = 1 / 32767, QU = 1 / 65535;   // (paso de la cuantización del GLB: posición y normal en int16, UV en uint16)
const esquina = (l) => { const o = l * 8, p = aplica(chica[o], chica[o + 1], chica[o + 2]), n = rota(chica[o + 3], chica[o + 4], chica[o + 5]); return [...p, ...n, chica[o + 6], 1 - chica[o + 7]]; };
const igual = (a, b, tp, tn, tu) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) <= tp && Math.hypot(a[3] - b[3], a[4] - b[4], a[5] - b[5]) <= tn && Math.abs(a[6] - b[6]) + Math.abs(a[7] - b[7]) <= tu;
const vdata = new Array(REF.n).fill(null), nuevos = [], esquinasNuevas = [];   // nuevos: [vértice de origen, datos]; esquinas: [esquina, nº de nuevo]
const cornerDe = (l) => { const t = (l / 3) | 0, v = trisC[l]; const c = [0, 1, 2].find(c => REF.idx[3 * t + c] === v); if (c === undefined) throw new Error('esquina de la chica sin su vértice'); return 3 * t + c; };
for (let l = 0; l < L; l++) {
  const v = trisC[l], d = esquina(l);
  if (!vdata[v]) { vdata[v] = d; continue; }
  if (igual(vdata[v], d, 2 * Q, 0.02, 3 * QU)) continue;
  // (otra UV u otra normal en este vértice: uno nuevo, o el ya añadido para este vértice con los mismos datos)
  let k = nuevos.findIndex(([s, e]) => s === v && igual(e, d, 2 * Q, 0.02, 3 * QU));
  if (k < 0) { k = nuevos.length; nuevos.push([v, d]); }
  esquinasNuevas.push([cornerDe(l), k]);
}
const orig = (v) => [REF.pos[v * 3], REF.pos[v * 3 + 1], REF.pos[v * 3 + 2], REF.nor[v * 3], REF.nor[v * 3 + 1], REF.nor[v * 3 + 2], REF.uv[v * 2], REF.uv[v * 2 + 1]];
const cambia = []; let cp = 0, cn = 0, cu = 0;
for (let v = 0; v < REF.n; v++) if (vdata[v] && !igual(vdata[v], orig(v), 1.5 * Q, 0.01, 2 * QU)) {
  cambia.push(v); const d = vdata[v], o = orig(v);
  if (!igual(d, o, 1.5 * Q, 9, 9)) cp++; else if (!igual(d, o, 9, 0.01, 9)) cn++; else cu++;
}
console.log('cambian de sitio', cp, 'solo de normal', cn, 'solo de UV', cu);
console.log('vértices', REF.n, 'cambian', cambia.length, 'nuevos', nuevos.length, 'esquinas a los nuevos', esquinasNuevas.length);
// (comprobación: la chica rehecha con el parche, esquina a esquina, contra la de Blender)
{
  const nueva = new Map(esquinasNuevas.map(([e, k]) => [e, k])); let mal = 0, peor = 0;
  for (let l = 0; l < L; l++) {
    const t = (l / 3) | 0, v = trisC[l], c = [0, 1, 2].find(c => REF.idx[3 * t + c] === v), e = 3 * t + c;
    const d = nueva.has(e) ? nuevos[nueva.get(e)][1] : (vdata[v] || orig(v)), g = esquina(l);
    const err = Math.hypot(d[0] - g[0], d[1] - g[1], d[2] - g[2]) + Math.abs(d[6] - g[6]) + Math.abs(d[7] - g[7]);
    if (err > 1e-3) { mal++; if (mal < 4) console.log('  esquina mal', l, 'vértice', v, 'error', err.toFixed(4)); } peor = Math.max(peor, err);
  }
  console.log('comprobación de esquinas:', mal, 'mal; peor', peor.toExponential(2));
}

// ---- para cada GLB del juego: sus índices, y el parche codificado con meshopt ----
const clave = (p, u, n) => `${Math.round(p[0] / Q)},${Math.round(p[1] / Q)},${Math.round(p[2] / Q)},${Math.round(u[0] / QU / 4)},${Math.round(u[1] / QU / 4)},${Math.round(n[0] * 50)},${Math.round(n[1] * 50)},${Math.round(n[2] * 50)}`;
async function parche(glb, out) {
  const T = glb === `src/assets/meshy/${MODELO}.glb` ? REF : await prim(glb);
  // (vértices y triángulos del GLB a los del de referencia: los del de 1024 px van en otro orden. Se casan los triángulos
  // por la posición, la UV y la normal de sus tres vértices, y de ahí cada vértice: dos vértices iguales en todo, en la
  // costura, no se confunden porque cada uno va con sus triángulos)
  const nt = REF.idx.length / 3, kR = [], kT = [];
  for (let i = 0; i < REF.n; i++) kR.push(clave(REF.pos.subarray(i * 3), REF.uv.subarray(i * 2), REF.nor.subarray(i * 3)));
  for (let i = 0; i < T.n; i++) kT.push(clave(T.pos.subarray(i * 3), T.uv.subarray(i * 2), T.nor.subarray(i * 3)));
  const firma = (I, K, t) => [I[3 * t], I[3 * t + 1], I[3 * t + 2]].map(v => K[v]).sort().join('|');
  const porFirma = new Map(); for (let t = 0; t < nt; t++) { const f = firma(T.idx, kT, t); (porFirma.get(f) || porFirma.set(f, []).get(f)).push(t); }
  const mapa = new Int32Array(REF.n).fill(-1), triT = new Int32Array(nt).fill(-1); let malos = 0;
  for (let t = 0; t < nt; t++) {
    const l = porFirma.get(firma(REF.idx, kR, t)); if (!l || !l.length) { malos++; continue; }
    const t2 = l.shift(); triT[t] = t2;
    for (let c = 0; c < 3; c++) { const v = REF.idx[3 * t + c], c2 = [0, 1, 2].find(k => kT[T.idx[3 * t2 + k]] === kR[v]); if (mapa[v] < 0) mapa[v] = T.idx[3 * t2 + c2]; }
  }
  if (malos || mapa.some(v => v < 0)) throw new Error(`${glb}: ${malos} triángulos sin pareja`);
  const esq = esquinasNuevas.map(([l, k]) => {
    const t = triT[(l / 3) | 0], c = [0, 1, 2].find(c => T.idx[3 * t + c] === mapa[REF.idx[l]]);
    if (c === undefined) throw new Error('esquina sin pareja'); return [3 * t + c, k];
  });
  const n1 = cambia.length, n2 = nuevos.length, n3 = esq.length;
  const conUV = cambia.filter(v => Math.abs(vdata[v][6] - REF.uv[v * 2]) + Math.abs(vdata[v][7] - REF.uv[v * 2 + 1]) > 2 * QU), n4 = conUV.length;
  const idx = new Uint32Array(n1), src = new Uint32Array(n2), uvi = new Uint32Array(n4), pos = new Int16Array((n1 + n2) * 4), nor = new Float32Array((n1 + n2) * 4), uv = new Uint16Array((n4 + n2) * 2), ce = new Uint32Array(n3 * 2);
  const pon = (j, d) => { for (let c = 0; c < 3; c++) { pos[j * 4 + c] = Math.max(-32767, Math.min(32767, Math.round(d[c] / Q))); nor[j * 4 + c] = d[3 + c]; } };
  const ponUV = (j, d) => { uv[j * 2] = Math.round(Math.max(0, Math.min(1, d[6])) * 65535); uv[j * 2 + 1] = Math.round(Math.max(0, Math.min(1, d[7])) * 65535); };
  cambia.forEach((v, j) => { idx[j] = mapa[v]; pon(j, vdata[v]); });
  nuevos.forEach(([v, d], j) => { src[j] = mapa[v]; pon(n1 + j, d); ponUV(n4 + j, d); });
  conUV.forEach((v, j) => { uvi[j] = mapa[v]; ponUV(j, vdata[v]); });
  esq.forEach(([e, k], j) => { ce[j * 2] = e; ce[j * 2 + 1] = k; });
  // (normales en dos bytes: el filtro octaédrico de meshopt, que el juego deshace al descomprimir)
  escribe(out, T.n, [[idx, 4], [src, 4], [uvi, 4], [pos, 8], [MeshoptEncoder.encodeFilterOct(nor, n1 + n2, 4, 8), 4, 'OCTAHEDRAL'], [uv, 4], [ce, 8]], { cambian: n1, nuevos: n2, conUV: n4, esquinas: n3 });
}

// ---- la versión ligera (meshy/lod: simplificada, con sus vértices sacados de los del original): los mismos cambios en
// los vértices que conserva; sin vértices nuevos (sus triángulos ya no son los del original) ----
// (la cuantización: del GLB a su sitio de antes, con el primer hueso en reposo por su matriz inversa de enlace; en
// reposo es la misma para todos los huesos)
function deq(doc) {
  const sk = doc.getRoot().listSkins()[0], j = sk.listJoints()[0], W = j.getWorldMatrix(), I = sk.getInverseBindMatrices().getElement(0, []);
  const M = new Float64Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += W[k * 4 + r] * I[c * 4 + k]; M[c * 4 + r] = s; }
  return M;
}
const inv = (M) => {   // (escala y traslado: la parte lineal es diagonal)
  const lin = [M[0], M[5], M[10]]; if (Math.abs(M[1]) + Math.abs(M[2]) + Math.abs(M[4]) + Math.abs(M[6]) + Math.abs(M[8]) + Math.abs(M[9]) > 1e-6 * lin[0]) throw new Error('cuantización con giro');
  return (p) => [0, 1, 2].map(c => (p[c] - M[12 + c]) / lin[c]);
};
const por = (M) => (p) => [0, 1, 2].map(c => M[c] * p[0] + M[4 + c] * p[1] + M[8 + c] * p[2] + M[12 + c]);
async function parcheLigero(glb, out) {
  // (su cuantización es otra: se pasa a la del original con las matrices de enlace, y se busca el vértice del original
  // más cercano en posición y UV, mirando en una rejilla)
  const T = await prim(glb), C = 2e-3, celda = (x, y, z) => `${Math.floor(x / C)},${Math.floor(y / C)},${Math.floor(z / C)}`, h = new Map();
  const Mr = deq(REF.doc), Ml = deq(T.doc), dR = inv(Mr), dL = inv(Ml), pR = por(Mr), pL = por(Ml), aRef = (p) => dR(pL(p)), aLod = (p) => dL(pR(p));
  for (let i = 0; i < T.n; i++) { const q = aRef([T.pos[i * 3], T.pos[i * 3 + 1], T.pos[i * 3 + 2]]); T.pos[i * 3] = q[0]; T.pos[i * 3 + 1] = q[1]; T.pos[i * 3 + 2] = q[2]; }
  for (let i = 0; i < REF.n; i++) { const k = celda(REF.pos[i * 3], REF.pos[i * 3 + 1], REF.pos[i * 3 + 2]); (h.get(k) || h.set(k, []).get(k)).push(i); }
  const camb = new Set(cambia), lista = []; let sin = 0, peor = 0;
  for (let i = 0; i < T.n; i++) {
    const x = T.pos[i * 3], y = T.pos[i * 3 + 1], z = T.pos[i * 3 + 2]; let best = -1, bd = Infinity;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) for (const v of h.get(celda(x + a * C, y + b * C, z + c * C)) || []) {
      const d = Math.hypot(REF.pos[v * 3] - x, REF.pos[v * 3 + 1] - y, REF.pos[v * 3 + 2] - z) + Math.abs(REF.uv[v * 2] - T.uv[i * 2]) + Math.abs(REF.uv[v * 2 + 1] - T.uv[i * 2 + 1]);
      if (d < bd) { bd = d; best = v; }
    }
    if (best < 0 || bd > 2e-3) { sin++; continue; } peor = Math.max(peor, bd);
    if (camb.has(best)) lista.push([i, best]);
  }
  console.log('  ligero: casados', T.n - sin, 'de', T.n, 'peor distancia', peor.toExponential(2));
  if (sin > T.n * 0.01) throw new Error(`${glb}: ${sin} vértices sin pareja`);
  // (un vértice partido en la chica tiene varias esquinas, cada una con su UV: aquí no se parte, así que toma la que más
  // se parece a la suya. Si no, una esquina llevada a otra pieza de la textura arrastraba a sus vecinas de la cara)
  const variantes = new Map(); for (const [v, d] of nuevos) (variantes.get(v) || variantes.set(v, []).get(v)).push(d);
  // (lo que era pelo de chico —castaño oscuro en su textura— y se ha movido, se hunde un poco bajo la piel: en la frente,
  // el flequillo aplastado coincide con la piel en la completa, pero simplificado de otra manera asomaba a trozos entre
  // ella; más arriba y por detrás, lo tapa el pelo de la chica. La cara —de las cejas para abajo, por delante— no se toca)
  const img = REF.doc.getRoot().listTextures()[0].getImage(), { data: tx, info } = await sharp(Buffer.from(img)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const texel = (u, w) => { const x = Math.min(info.width - 1, Math.max(0, Math.floor(u * info.width))), y = Math.min(info.height - 1, Math.max(0, Math.floor(w * info.height))), k = (y * info.width + x) * 3; return [tx[k] / 255, tx[k + 1] / 255, tx[k + 2] / 255]; };
  const pelo_ = ([r, g, b]) => Math.max(r, g, b) < 0.36 && (r - b) / Math.max(r, 0.004) > 0.25 && b <= g + 0.03;
  // (piel en la textura del chico: la nariz y la cara; las puntas del pelo tenían la textura en el pelo o en otra pieza,
  // como la camiseta roja, y esas sí se llevan a la de la chica)
  const piel_ = ([r, g, b]) => { const mx = Math.max(r, g, b), sat = (mx - Math.min(r, g, b)) / Math.max(mx, 1e-3); return mx > 0.5 && r > b + 0.05 && sat > 0.08 && sat < 0.5 && r >= g; };
  const esPelo = (v) => pelo_(texel(REF.uv[v * 2], REF.uv[v * 2 + 1])), esPiel = (v) => piel_(texel(REF.uv[v * 2], REF.uv[v * 2 + 1]));
  // (solo si tiene otra capa —de piel en el chico— encima o pegada, a menos de CERCA: las cejas del chico, que son de
  // piel con relieve y sin nada encima, no se hunden)
  const HUNDE = 0.008, CERCA = 0.007;   // (en las unidades del GLB, de -1 a 1 de alto: unos 6 y 5 mm)
  const gp = (v) => vdata[v] || [REF.pos[v * 3], REF.pos[v * 3 + 1], REF.pos[v * 3 + 2]], nt = REF.idx.length / 3;
  const pielT = new Uint8Array(nt), G = new Map(), CEL = 0.01, ck = (x, y, z) => `${Math.floor(x / CEL)},${Math.floor(y / CEL)},${Math.floor(z / CEL)}`;
  for (let t = 0; t < nt; t++) {
    const [a, b, c] = [REF.idx[3 * t], REF.idx[3 * t + 1], REF.idx[3 * t + 2]];
    pielT[t] = !esPelo(a) && !esPelo(b) && !esPelo(c) ? 1 : 0; if (!pielT[t]) continue;
    const P3 = [gp(a), gp(b), gp(c)], lo = [0, 1, 2].map(k => Math.min(...P3.map(q => q[k]))), hi = [0, 1, 2].map(k => Math.max(...P3.map(q => q[k])));
    for (let x = Math.floor(lo[0] / CEL); x <= Math.floor(hi[0] / CEL); x++) for (let y = Math.floor(lo[1] / CEL); y <= Math.floor(hi[1] / CEL); y++) for (let z = Math.floor(lo[2] / CEL); z <= Math.floor(hi[2] / CEL); z++) { const k = `${x},${y},${z}`; (G.get(k) || G.set(k, []).get(k)).push(t); }
  }
  // (distancia a lo largo de la normal hasta una cara de piel, por delante o por detrás: Möller-Trumbore)
  const tapada = (v, d) => {
    const o = [d[0], d[1], d[2]], n = [d[3], d[4], d[5]], vistos = new Set();
    for (let s = -CERCA; s <= CERCA + 1e-9; s += CEL / 2) for (const t of G.get(ck(o[0] + n[0] * s, o[1] + n[1] * s, o[2] + n[2] * s)) || []) {
      if (vistos.has(t)) continue; vistos.add(t);
      const [a, b, c] = [REF.idx[3 * t], REF.idx[3 * t + 1], REF.idx[3 * t + 2]]; if (a === v || b === v || c === v) continue;
      const A = gp(a), B = gp(b), C = gp(c), e1 = [0, 1, 2].map(k => B[k] - A[k]), e2 = [0, 1, 2].map(k => C[k] - A[k]);
      const pv = [n[1] * e2[2] - n[2] * e2[1], n[2] * e2[0] - n[0] * e2[2], n[0] * e2[1] - n[1] * e2[0]], det = e1[0] * pv[0] + e1[1] * pv[1] + e1[2] * pv[2]; if (Math.abs(det) < 1e-12) continue;
      const tv = [0, 1, 2].map(k => o[k] - A[k]), u = (tv[0] * pv[0] + tv[1] * pv[1] + tv[2] * pv[2]) / det; if (u < 0 || u > 1) continue;
      const qv = [tv[1] * e1[2] - tv[2] * e1[1], tv[2] * e1[0] - tv[0] * e1[2], tv[0] * e1[1] - tv[1] * e1[0]], w = (n[0] * qv[0] + n[1] * qv[1] + n[2] * qv[2]) / det; if (w < 0 || u + w > 1) continue;
      const dist = (e2[0] * qv[0] + e2[1] * qv[1] + e2[2] * qv[2]) / det; if (dist > -CERCA && dist < CERCA) return true;
    }
    return false;
  };
  const hunde = (v, d) => esPelo(v) && tapada(v, d) ? [d[0] - d[3] * HUNDE, d[1] - d[4] * HUNDE, d[2] - d[5] * HUNDE, ...d.slice(3)] : d;
  let hundidos = 0;
  const n1 = lista.length, idx = new Uint32Array(n1), uvi = [], pos = new Int16Array(n1 * 4), nor = new Float32Array(n1 * 4), uvs = [];
  lista.forEach(([i, v], j) => {
    // (salvo si la suya cae en otra pieza —ni piel ni pelo: la camiseta—: entonces la que se llevó a la cabeza)
    let d = vdata[v]; const ajena = (u, w) => { const c = texel(u, w); return !pelo_(c) && !piel_(c); }, lejos = ajena(T.uv[i * 2], T.uv[i * 2 + 1]);
    const dist = (e) => Math.abs(e[6] - T.uv[i * 2]) + Math.abs(e[7] - T.uv[i * 2 + 1]);
    for (const e of variantes.get(v) || []) if (lejos ? ajena(d[6], d[7]) && !ajena(e[6], e[7]) : dist(e) < dist(d)) d = e;
    const d2 = hunde(v, d); if (d2 !== d) hundidos++;
    const q = aLod(d2); idx[j] = i;
    const DL = process.env.DEPURA_LOD || '';   // (pruebas: pos, solo las posiciones; posnor, sin las UV)
    for (let c = 0; c < 3; c++) { pos[j * 4 + c] = Math.max(-32767, Math.min(32767, Math.round(q[c] / Q))); nor[j * 4 + c] = DL === 'pos' ? T.nor[i * 3 + c] : d[3 + c]; }
    // (un cambio grande de UV —una cara diminuta llevada a otra pieza de la textura en textura.py— no en la piel: en la
    // cara, el vértice lo comparten triángulos ligeros más grandes, y la nariz salía con una cuña de otro color)
    const duv = Math.abs(d[6] - REF.uv[v * 2]) + Math.abs(d[7] - REF.uv[v * 2 + 1]);
    if (!DL && duv > 2 * QU && (duv < 0.01 || !esPiel(v))) { uvi.push(i); uvs.push(Math.round(Math.max(0, Math.min(1, d[6])) * 65535), Math.round(Math.max(0, Math.min(1, d[7])) * 65535)); }
  });
  escribe(out, T.n, [[idx, 4], [new Uint32Array(0), 4], [Uint32Array.from(uvi), 4], [pos, 8], [MeshoptEncoder.encodeFilterOct(nor, n1, 4, 8), 4, 'OCTAHEDRAL'], [Uint16Array.from(uvs), 4], [new Uint32Array(0), 8]], { cambian: n1, nuevos: 0, conUV: uvi.length, esquinas: 0 });
  console.log('  ligero: hundidos bajo la piel', hundidos);
  if (sin) console.log('  (sin pareja', sin, 'vértices: se quedan como en el chico)');
}
function escribe(out, verts, arrays, cuentas) {
  const tiras = arrays.map(([a, s, f]) => { const b = new Uint8Array(a.buffer, a.byteOffset, a.byteLength), n = b.length / s; return [n ? MeshoptEncoder.encodeVertexBufferLevel(b, n, s, 2, 0) : new Uint8Array(0), n, s, f || '']; });
  const cab = new TextEncoder().encode(JSON.stringify({ v: 2, verts, ...cuentas, tiras: tiras.map(([b, n, s, f]) => [b.length, n, s, f]) }));
  const pad = (4 - (8 + cab.length) % 4) % 4, total = 8 + cab.length + pad + tiras.reduce((s, [b]) => s + b.length + ((4 - b.length % 4) % 4), 0);
  const o = new Uint8Array(total), dv = new DataView(o.buffer); dv.setUint32(0, 0x32434843, true); dv.setUint32(4, cab.length + pad, true);
  o.set(cab, 8); for (let i = 0; i < pad; i++) o[8 + cab.length + i] = 32;
  let at = 8 + cab.length + pad; for (const [b] of tiras) { o.set(b, at); at += b.length + ((4 - b.length % 4) % 4); }
  writeFileSync(out, o); console.log(out, o.length, 'bytes', tiras.map(([b]) => b.length).join(' + '));
}

// ---- la textura: solo lo que cambia, en una capa con transparencia (<modelo>.webp) ----
// A la resolución de la textura de cada versión del modelo, comparada con la suya (la de 1024 y la ligera, de 768, se
// hicieron reduciendo la grande, y no coinciden del todo con ella en los bordes de las piezas): lo que difiere de la
// repintada reducida, junto a lo cambiado, también va. Si no, en la ligera el borde de cada pieza repintada se quedaba
// con el color del chico y la cara salía cuarteada
// (antes, el castaño de debajo del pelo iba aparte, en una máscara de un color a media resolución; encogida para no
// pasar a las piezas de al lado, dejaba ver el pelo del chico en sus bordes, como grietas. Y en una sola capa ocupa menos)
const crece = (m, w, h, k, dentro) => { let mm = m; for (let it = 0; it < k; it++) { const n = mm.slice(); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; if (!mm[i] && (mm[i - 1] || mm[i + 1] || mm[i - w] || mm[i + w]) && (!dentro || dentro[i])) n[i] = 1; } mm = n; } return mm; };
// (una máscara a otra resolución: con la mitad de ella en cada texel; la de lo cambiado va salpicada por los márgenes de
// toda la textura, y con algo de ella ya era más de la mitad)
const escala = async (m, w, n) => { if (n === w) return m; const r = await sharp(Buffer.from(m.map(v => v * 255)), { raw: { width: w, height: w, channels: 1 } }).resize(n, n, { kernel: 'linear' }).extractChannel(0).raw().toBuffer(); if (r.length !== n * n) throw new Error('máscara: ' + r.length); return Uint8Array.from(r, v => v > 127 ? 1 : 0); };
async function textura(outs) {
  const b = await sharp(TEX1).removeAlpha().raw().toBuffer({ resolveWithObject: true }), W = b.info.width;
  if (W !== 2048) throw new Error('la textura repintada no es de 2048');
  const lee = async (f) => { const r = await sharp(f).removeAlpha().raw().toBuffer(); const m = new Uint8Array(W * W); for (let i = 0; i < W * W; i++) m[i] = r[i * 3] > 127 ? 1 : 0; return m; };
  const todo = await lee(TEX1.replace('.png', '-mascara.png')), liso = await lee(TEX1.replace('.png', '-liso.png'));
  const det = todo.map((v, i) => v && !liso[i] ? 1 : 0);   // (lo cambiado que no es el castaño liso: la cara, la frente, la nuca)
  for (const [glb, out] of outs) {
    const doc = glb === `src/assets/meshy/${MODELO}.glb` ? REF.doc : await io.read(glb), img = doc.getRoot().listTextures()[0].getImage();
    const base = await sharp(Buffer.from(img)).removeAlpha().raw().toBuffer({ resolveWithObject: true }), N = base.info.width;
    const t = N === W ? b.data : await sharp(TEX1).removeAlpha().resize(N, N, { kernel: 'lanczos3' }).raw().toBuffer();
    // (lo cambiado, algo más ancho; más lo que difiere de la de esta versión junto a lo cambiado que no es liso: las
    // texturas de cada versión se comprimieron aparte y en el resto difieren un poco en todas partes)
    const todoN = await escala(todo, W, N), detN = await escala(det, W, N), dif = new Uint8Array(N * N);
    for (let i = 0; i < N * N; i++) dif[i] = Math.abs(t[i * 3] - base.data[i * 3]) + Math.abs(t[i * 3 + 1] - base.data[i * 3 + 1]) + Math.abs(t[i * 3 + 2] - base.data[i * 3 + 2]) > 45 ? 1 : 0;
    const A = crece(todoN, N, N, N === W ? 2 : 1), cerca = crece(detN, N, N, 3), rgba = Buffer.alloc(N * N * 4); let n1 = 0;
    for (let i = 0; i < N * N; i++) {
      if (!(A[i] || (dif[i] && cerca[i]))) continue;
      // (debajo de lo transparente, negro: si no, el webp guarda también el color que no se ve)
      rgba[i * 4] = t[i * 3]; rgba[i * 4 + 1] = t[i * 3 + 1]; rgba[i * 4 + 2] = t[i * 3 + 2]; rgba[i * 4 + 3] = 255; n1++;
    }
    await sharp(rgba, { raw: { width: N, height: N, channels: 4 } }).webp({ quality: 86, alphaQuality: 100, smartSubsample: true }).toFile(out);
    console.log(out, N, 'px, cambia el', `${(100 * n1 / N / N).toFixed(1)} %:`, statSync(out).size, 'bytes');
  }
}

// ---- el pelo: comprimido como los modelos del juego, con su textura en webp pequeña; y el ligero, simplificado ----
async function pelo(out, ligero) {
  const doc = await io.read(`${EXP}/${MODELO}-${PEINADO}-pelo.glb`);
  const pasos = [dedup(), prune(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [256, 512], quality: 86 })];
  // (en el ligero se simplifica el pelo; las pestañas y la goma no: simplificadas, las pestañas eran pinchos sueltos)
  if (ligero) for (const m of doc.getRoot().listMeshes()) if (!/Pestanas|Lazo/.test(m.getName())) for (const pr of m.listPrimitives()) { weldPrimitive(pr); simplifyPrimitive(pr, { simplifier: MeshoptSimplifier, ratio: 0.35, error: 0.01 }); }
  await doc.transform(...pasos, meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(out, doc); console.log(out, statSync(out).size, 'bytes');
}

for (const r of ['web', '1024', 'lod', 'pelo']) mkdirSync(`src/assets/chicas/${r}`, { recursive: true });
await parche(`src/assets/meshy/${MODELO}.glb`, `src/assets/chicas/web/${MODELO}.parche`);
await parche(`src/assets/meshy-1024/${MODELO}.glb`, `src/assets/chicas/1024/${MODELO}.parche`);
await parcheLigero(`src/assets/meshy/lod/${MODELO}.glb`, `src/assets/chicas/lod/${MODELO}.parche`);
await textura([[`src/assets/meshy/${MODELO}.glb`, `src/assets/chicas/web/${MODELO}.webp`], [`src/assets/meshy-1024/${MODELO}.glb`, `src/assets/chicas/1024/${MODELO}.webp`], [`src/assets/meshy/lod/${MODELO}.glb`, `src/assets/chicas/lod/${MODELO}.webp`]]);
await pelo(`src/assets/chicas/pelo/${MODELO}-${PEINADO}.glb`, false);
await pelo(`src/assets/chicas/pelo/${MODELO}-${PEINADO}-lod.glb`, true);
