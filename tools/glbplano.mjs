// Quita la compresión meshopt y la cuantización de un GLB para abrirlo en Blender (tools/blender/fauna/oveja-meshy.py): node tools/glbplano.mjs entrada salida
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(process.argv[2]);
for (const e of doc.getRoot().listExtensionsUsed()) if (/meshopt|quantization/.test(e.extensionName)) e.dispose();
await doc.transform(dequantize());
await io.write(process.argv[3], doc);
console.log('ok', process.argv[3]);
