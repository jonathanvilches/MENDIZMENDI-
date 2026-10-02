// Comprime los modelos sin tocar sus texturas: quita fotogramas clave redundantes de las animaciones (resample),
// datos repetidos o sin usar, y codifica geometría y animaciones con meshopt (EXT_meshopt_compression, que el juego
// ya sabe leer). Visualmente igual; los archivos pesan mucho menos.
// Uso: node tools/glb-compress.mjs <carpeta|archivo.glb>… [--dry]   (--dry: solo dice cuánto ahorraría)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { resample, prune, dedup, meshopt, reorder } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { readdirSync, statSync, writeFileSync } from 'fs';
const args = process.argv.slice(2), dry = args.includes('--dry');
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const files = args.filter(a => !a.startsWith('--')).flatMap(a => statSync(a).isDirectory() ? readdirSync(a).filter(f => f.endsWith('.glb')).map(f => `${a}/${f}`) : [a]);
let before = 0, after = 0;
for (const f of files) {
  const doc = await io.read(f), s0 = statSync(f).size;
  if (doc.getRoot().listExtensionsUsed().some(e => e.extensionName === 'EXT_meshopt_compression')) { console.log(f, 'ya comprimido'); continue; }
  await doc.transform(resample({ tolerance: 1e-4 }), dedup(), prune({ keepAttributes: true, keepLeaves: true }), reorder({ encoder: MeshoptEncoder }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const bin = await io.writeBinary(doc); before += s0; after += bin.byteLength;
  console.log(f.padEnd(46), `${(s0 / 1024) | 0} → ${(bin.byteLength / 1024) | 0} KB`);
  if (!dry) writeFileSync(f, bin);
}
console.log(`total ${(before / 1048576).toFixed(2)} → ${(after / 1048576).toFixed(2)} MB`);
