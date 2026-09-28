import { NodeIO } from '@gltf-transform/core';
import { prune, dedup, quantize } from '@gltf-transform/functions';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read('tools/protagonista-original.glb');
const root = doc.getRoot();
for (const n of root.listNodes()) {
  const nm = n.getName();
  if (['Cool fill','Key softbox','Portrait camera','Rim','Studio_Ground'].includes(nm)) n.dispose();
}
for (const t of root.listTextures()) console.log(t.getName(), t.getMimeType(), t.getSize(), t.getImage().byteLength);
for (const e of root.listExtensionsUsed()) if (e.extensionName === 'KHR_lights_punctual') e.dispose();
await doc.transform(prune(), dedup(), quantize());
await io.write('assets/hero.glb', doc);
