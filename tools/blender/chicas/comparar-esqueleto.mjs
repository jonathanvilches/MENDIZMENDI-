// Compara el esqueleto de dos GLB (por nombre de hueso): la posición, el giro y la escala de cada hueso respecto a su
// padre, y la matriz inversa de reposo. Sirve para saber si un modelo sacado de Blender puede usar las animaciones del
// original tal cual. Uso: node tools/blender/chicas/comparar-esqueleto.mjs <original.glb> <otro.glb>
import { NodeIO } from '@gltf-transform/core'; import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const [,, a, b] = process.argv;
const info = async (f) => { const d = await io.read(f), s = d.getRoot().listSkins()[0], J = s.listJoints(), I = s.getInverseBindMatrices().getArray(), m = {};
  J.forEach((j, k) => { m[j.getName()] = { t: j.getTranslation(), r: j.getRotation(), s: j.getScale(), ibm: Array.from(I.slice(k * 16, k * 16 + 16)), parent: j.getParentNode()?.getName() }; }); return m; };
const A = await info(a), B = await info(b);
let peor = { t: 0, r: 0, ibm: 0 }, faltan = [];
for (const [n, x] of Object.entries(A)) {
  const y = B[n]; if (!y) { faltan.push(n); continue; }
  const dt = Math.max(...x.t.map((v, i) => Math.abs(v - y.t[i]))), dr = Math.min(Math.max(...x.r.map((v, i) => Math.abs(v - y.r[i]))), Math.max(...x.r.map((v, i) => Math.abs(v + y.r[i])))), di = Math.max(...x.ibm.map((v, i) => Math.abs(v - y.ibm[i])));
  if (dt > peor.t) peor.t = dt; if (dr > peor.r) peor.r = dr; if (di > peor.ibm) peor.ibm = di;
  if (dt > 1e-4 || dr > 1e-4) console.log('distinto', n, 'dt', dt.toFixed(5), 'dr', dr.toFixed(5), x.parent, y.parent);
}
console.log('huesos', Object.keys(A).length, Object.keys(B).length, 'faltan', faltan, 'peor', peor);
