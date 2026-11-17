// Limpia los pesos de piel de personajes de Meshy (tools/pesos-limpia.mjs) en sus GLB, en su sitio: el peso del brazo y
// de la mano que Meshy deja por la faja, el pantalón o el muslo (y el de la cadera por la mano). Sin esto, al levantar la
// mano en un golpe el pantalón se estiraba en una punta (la pelotari de la melena, noviembre de 2026).
// Uso: node tools/meshy-pesos.mjs archivo.glb [más.glb…]     (SECO=1: solo cuenta lo que cambiaría)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { statSync } from 'fs';
import { limpiaPesos } from './pesos-limpia.mjs';

await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

// (la inversa de una matriz 4 × 4 por columnas: de la de unión de cada hueso sale su posición en la postura de unión)
function inv(m) {
  const o = new Array(16); const [a, b, c, d, e, f, g, h, i, j, k, l, mm, n, oo, p] = m;
  o[0] = f * k * p - f * l * oo - j * g * p + j * h * oo + n * g * l - n * h * k; o[4] = -e * k * p + e * l * oo + i * g * p - i * h * oo - mm * g * l + mm * h * k;
  o[8] = e * j * p - e * l * n - i * f * p + i * h * n + mm * f * l - mm * h * j; o[12] = -e * j * oo + e * k * n + i * f * oo - i * g * n - mm * f * k + mm * g * j;
  o[1] = -b * k * p + b * l * oo + j * c * p - j * d * oo - n * c * l + n * d * k; o[5] = a * k * p - a * l * oo - i * c * p + i * d * oo + mm * c * l - mm * d * k;
  o[9] = -a * j * p + a * l * n + i * b * p - i * d * n - mm * b * l + mm * d * j; o[13] = a * j * oo - a * k * n - i * b * oo + i * c * n + mm * b * k - mm * c * j;
  o[2] = b * g * p - b * h * oo - f * c * p + f * d * oo + n * c * h - n * d * g; o[6] = -a * g * p + a * h * oo + e * c * p - e * d * oo - mm * c * h + mm * d * g;
  o[10] = a * f * p - a * h * n - e * b * p + e * d * n + mm * b * h - mm * d * f; o[14] = -a * f * oo + a * g * n + e * b * oo - e * c * n - mm * b * g + mm * c * f;
  o[3] = -b * g * l + b * h * k + f * c * l - f * d * k - j * c * h + j * d * g; o[7] = a * g * l - a * h * k - e * c * l + e * d * k + i * c * h - i * d * g;
  o[11] = -a * f * l + a * h * j + e * b * l - e * d * j - i * b * h + i * d * f; o[15] = a * f * k - a * g * j - e * b * k + e * c * j + i * b * g - i * c * f;
  const det = a * o[0] + b * o[4] + c * o[8] + d * o[12]; return o.map(x => x / det);
}

for (const f of process.argv.slice(2)) {
  const doc = await io.read(f), root = doc.getRoot(), kb0 = statSync(f).size >> 10;
  let total = { quitados: 0, vertices: 0, rellenos: 0, porHueso: {} };
  for (const nodo of root.listNodes()) {
    const mesh = nodo.getMesh(), skin = nodo.getSkin(); if (!mesh || !skin) continue;
    const joints = skin.listJoints(), nombres = joints.map(j => j.getName().replace(/^mixamorig:?/, ''));
    const ibm = skin.getInverseBindMatrices(), huesos = joints.map((_, i) => inv(Array.from(ibm.getElement(i, []))).slice(12, 15));
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION'), ja = prim.getAttribute('JOINTS_0'), wa = prim.getAttribute('WEIGHTS_0'), ix = prim.getIndices(); if (!pos || !ja || !wa || !ix) continue;
      const n = pos.getCount(), P = new Float32Array(n * 3), J = new Uint16Array(n * 4), W = new Float32Array(n * 4), v = [0, 0, 0], q = [0, 0, 0, 0];
      for (let i = 0; i < n; i++) { pos.getElement(i, v); P.set(v, i * 3); ja.getElement(i, q); J.set(q, i * 4); wa.getElement(i, q); W.set(q, i * 4); }
      const J0 = J.slice(), W0 = W.slice();
      const r = limpiaPesos({ P, I: ix.getArray(), J, W, nombres, huesos });
      for (const k of ['quitados', 'vertices', 'rellenos']) total[k] += r[k];
      for (const [h, c] of Object.entries(r.porHueso)) total.porHueso[h] = (total.porHueso[h] || 0) + c;
      if (process.env.SECO) continue;
      for (let i = 0; i < n; i++) {
        let cambia = false; for (let k = 0; k < 4; k++) if (J[i * 4 + k] !== J0[i * 4 + k] || W[i * 4 + k] !== W0[i * 4 + k]) cambia = true;
        if (!cambia) continue;
        ja.setElement(i, Array.from(J.subarray(i * 4, i * 4 + 4))); wa.setElement(i, Array.from(W.subarray(i * 4, i * 4 + 4)));
      }
    }
  }
  if (!process.env.SECO) await io.write(f, doc);
  console.log(f.split('/').slice(-2).join('/'), `${total.quitados} pesos quitados en ${total.vertices} vértices (${total.rellenos} rellenos)`, JSON.stringify(total.porHueso), process.env.SECO ? '' : `${kb0} → ${statSync(f).size >> 10} KB`);
}
