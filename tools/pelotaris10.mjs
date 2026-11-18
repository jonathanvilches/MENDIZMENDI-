// Los 10 pelotaris de siempre (5 chicos y 5 chicas, pelota/aspectos.js) al juego. Cada uno llega de Blender
// (tools/blender/pelotaris10/esqueleto.py) como una malla de Meshy atada al esqueleto del pelotari de siempre, sin
// animaciones. Aquí se mete esa malla DENTRO del archivo del pelotari de siempre (src/assets/meshy/pelotari.glb): sus
// mismos huesos, su misma piel (las matrices de enlace) y sus mismos clips (Run, Walk, Slash y Fist), sin tocar un
// número. Así el juego lo carga como a él y le valen todos sus movimientos (actors/pelotaMoves.js): solo cambian los
// puntos, la textura y a qué hueso va cada punto.
//  - los puntos se pasan del sitio de enlace del archivo de Blender al del pelotari (los dos en reposo, la misma pose)
//  - cada hueso se busca por su nombre: el orden de los huesos en la piel no es el mismo
//  - la textura a webp (2048 px en el ordenador, 1024 para el móvil y el archivo único) y la malla comprimida
// Uso: node tools/pelotaris10.mjs <carpeta con 01-rizos.glb … 10-rizos.glb>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { textureCompress, prune, dedup, reorder, meshopt, weld, simplify } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { statSync } from 'fs';
const [,, DIR0] = process.argv;
await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
export const LISTA = [['01-rizos', 'pelotari_chico1'], ['02-corto', 'pelotari_chico2'], ['03-punta', 'pelotari_chico3'], ['04-rapado', 'pelotari_chico4'], ['05-melenita', 'pelotari_chico5'],
  ['06-coleta', 'pelotari_chica1'], ['07-trenza', 'pelotari_chica2'], ['08-mono', 'pelotari_chica3'], ['09-melena', 'pelotari_chica4'], ['10-rizos', 'pelotari_chica5']];
// ---- matrices 4 × 4 por columnas, como en glTF
const mul = (a, b) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };
function inv(m) {   // (afín: la parte lineal por cofactores y el traslado)
  const [a, b, c, , d, e, f, , g, h, i, , x, y, z] = m, A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C;
  const l = [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
  return [l[0], l[1], l[2], 0, l[3], l[4], l[5], 0, l[6], l[7], l[8], 0, -(l[0] * x + l[3] * y + l[6] * z), -(l[1] * x + l[4] * y + l[7] * z), -(l[2] * x + l[5] * y + l[8] * z), 1];
}
const enlace = (doc) => { const sk = doc.getRoot().listSkins()[0], j = sk.listJoints()[0]; return mul(j.getWorldMatrix(), sk.getInverseBindMatrices().getElement(0, [])); };
// (y, hechos igual y con el mismo esqueleto, los jueces y el público de los partidos: el autor, 18 de noviembre de 2026,
// «hay que generar espectadores y árbitros para el juego. Puedes hacerlo en Meshy directamente». Solo en versión ligera
// —un tercio de los triángulos y textura de 512 px, src/assets/meshy/lod—, que es la que usan la grada (crowd3d.js) y los
// jueces de la contracancha (npcGlb.js). GENTE=<carpeta> con juez.glb, jueza.glb, espectador.glb…)
const GENTE = [['juez', 'juez_hombre'], ['jueza', 'juez_mujer'], ['espectador', 'aficion_hombre'], ['espectadora', 'aficion_mujer'], ['abuelo', 'aficion_abuelo'], ['abuela', 'aficion_abuela']];
const TODO = [...(process.env.SOLO_GENTE ? [] : LISTA.flatMap(([de, a]) => [[DIR0, de, a, 2048, 'src/assets/meshy', 1], [DIR0, de, a, 1024, 'src/assets/meshy-1024', 1]])),
  ...(process.env.GENTE ? GENTE.map(([de, a]) => [process.env.GENTE, de, a, 512, 'src/assets/meshy/lod', 0.34]) : [])];
for (const [DIR, de, a, px, carpeta, ratio] of TODO) {
  const B = await io.read(`${DIR}/${de}.glb`), A = await io.read('src/assets/meshy/pelotari.glb'), RA = A.getRoot(), RB = B.getRoot();
  await B.transform(weld());
  const pa = RA.listMeshes()[0].listPrimitives()[0], pb = RB.listMeshes()[0].listPrimitives()[0], buf = RA.listBuffers()[0];
  const M = mul(inv(enlace(A)), enlace(B)), n = pb.getAttribute('POSITION').getCount();
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), jo = new Uint8Array(n * 4), we = new Float32Array(n * 4), e = [];
  // (cada hueso de la malla nueva, en la piel del pelotari, por su nombre)
  const nomA = RA.listSkins()[0].listJoints().map(j => j.getName()), mapa = RB.listSkins()[0].listJoints().map(j => { const k = nomA.indexOf(j.getName()); if (k < 0) throw new Error('hueso sin pareja: ' + j.getName()); return k; });
  const esc = Math.cbrt(Math.abs(M[0] * (M[5] * M[10] - M[6] * M[9]) - M[4] * (M[1] * M[10] - M[2] * M[9]) + M[8] * (M[1] * M[6] - M[2] * M[5])));
  for (let i = 0; i < n; i++) {
    pb.getAttribute('POSITION').getElement(i, e); const [x, y, z] = e; pos.set([M[0] * x + M[4] * y + M[8] * z + M[12], M[1] * x + M[5] * y + M[9] * z + M[13], M[2] * x + M[6] * y + M[10] * z + M[14]], i * 3);
    pb.getAttribute('NORMAL').getElement(i, e); const [nx, ny, nz] = e, q = [M[0] * nx + M[4] * ny + M[8] * nz, M[1] * nx + M[5] * ny + M[9] * nz, M[2] * nx + M[6] * ny + M[10] * nz], l = Math.hypot(...q) || 1; nor.set(q.map(v => v / l), i * 3);
    pb.getAttribute('TEXCOORD_0').getElement(i, e); uv.set([e[0], e[1]], i * 2);
    const w = pb.getAttribute('WEIGHTS_0').getElement(i, []), j = pb.getAttribute('JOINTS_0').getElement(i, []), s = w.reduce((x, y) => x + y, 0) || 1;
    for (let k = 0; k < 4; k++) { we[i * 4 + k] = w[k] / s; jo[i * 4 + k] = w[k] > 0 ? mapa[j[k]] : 0; }
  }
  const acc = (arr, type) => A.createAccessor().setArray(arr).setType(type).setBuffer(buf);
  for (const s of pa.listSemantics()) pa.setAttribute(s, null);
  pa.setAttribute('POSITION', acc(pos, 'VEC3')).setAttribute('NORMAL', acc(nor, 'VEC3')).setAttribute('TEXCOORD_0', acc(uv, 'VEC2')).setAttribute('JOINTS_0', acc(jo, 'VEC4')).setAttribute('WEIGHTS_0', acc(we, 'VEC4'));
  pa.setIndices(acc(Uint32Array.from(pb.getIndices().getArray()), 'SCALAR'));
  // (la textura nueva en el material del pelotari: conserva su ajuste de brillo y rugosidad)
  const tb = pb.getMaterial().getBaseColorTexture(), ta = pa.getMaterial().getBaseColorTexture();
  ta.setImage(tb.getImage()).setMimeType(tb.getMimeType());
  if (ratio < 1) await A.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.004, lockBorder: false }));
  await A.transform(prune(), dedup(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [px, px], quality: 88 }), reorder({ encoder: MeshoptEncoder }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const out = `${carpeta}/${a}.glb`; await io.write(out, A);
  console.log(out, n, 'puntos', pb.getIndices().getCount() / 3, 'triángulos', (statSync(out).size / 1024).toFixed(0), 'KB', 'escala', esc.toFixed(4));
}
