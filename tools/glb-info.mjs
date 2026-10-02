// Datos de un .glb (mallas, materiales, colores y límites), aunque vaya comprimido: node tools/glb-info.mjs <archivo.glb>…
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f), R = doc.getRoot();
  console.log('==', f);
  for (const m of R.listMeshes()) for (const p of m.listPrimitives()) { const pos = p.getAttribute('POSITION'); const mn = pos.getMin([]), mx = pos.getMax([]); console.log(m.getName(), p.getMaterial()?.getName(), p.getMaterial()?.getBaseColorFactor().map(v => v.toFixed(2)).join(','), pos.getCount(), 'min', mn.map(v => v.toFixed(2)).join(','), 'max', mx.map(v => v.toFixed(2)).join(',')); }
}
