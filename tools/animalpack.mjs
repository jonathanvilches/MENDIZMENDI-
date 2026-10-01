// Prepara los animales CC0 de Quaternius (lab/ref/packs/quaternius/*.gltf) para el juego: a GLB, solo con los clips que
// usamos (reposo, paso, galope, comer…), sin datos repetidos y con atributos cuantizados → src/assets/animals/<especie>.glb
// Uso: node tools/animalpack.mjs
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, resample, quantize } from '@gltf-transform/functions';
import { mkdirSync, statSync } from 'fs';
const KEEP = new Set(['Idle', 'Idle_2', 'Idle_Headlow', 'Walk', 'Gallop', 'Eating', 'Idle_HitReact1', 'Attack_Headbutt']);
const LIST = ['Cow', 'Bull', 'Horse', 'Donkey', 'Deer', 'Stag', 'Fox', 'Wolf', 'Husky', 'ShibaInu', 'Alpaca'];
// especies derivadas en Blender (tools/blender/fauna/derivar.py → /tmp/fauna_der)
const DER = { Sheep: 'sheep', Goat: 'goat', Pig: 'pig', Jabali: 'jabali' };
const only = process.argv.slice(2);
const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
mkdirSync('src/assets/animals', { recursive: true });
let tot = 0;
for (const n of [...LIST, ...Object.keys(DER)]) {
  if (only.length && !only.includes(n)) continue;
  const src = DER[n] ? `/tmp/fauna_der/${DER[n]}.glb` : `lab/ref/packs/quaternius/${n}.gltf`;
  // primero a GLB tal cual (así dedup y resample trabajan sobre buffers binarios), luego se quitan clips y se optimiza
  const doc = await io.readBinary(await io.writeBinary(await io.read(src)));
  for (const a of doc.getRoot().listAnimations()) if (!KEEP.has(a.getName())) { for (const c of a.listChannels()) c.dispose(); for (const s of a.listSamplers()) s.dispose(); a.dispose(); }
  await doc.transform(resample({ tolerance: 1e-4 }), dedup(), prune({ keepExtras: true, keepLeaves: true, keepAttributes: true }), quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeWeight: 8 }));
  const out = `src/assets/animals/${n}.glb`; (await import('fs')).writeFileSync(out, await io.writeBinary(doc));
  const kb = statSync(out).size / 1024; tot += kb; console.log(n, kb.toFixed(0) + ' KB', doc.getRoot().listAnimations().map(a => a.getName()).join(','));
}
console.log('total', (tot / 1024).toFixed(2), 'MB');
