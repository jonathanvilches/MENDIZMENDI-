// Deja un GLB del juego listo para abrirlo en Blender: sin compresión meshopt ni cuantización (Blender 4.2 no las lee).
// Uso: node tools/glb-abrir.mjs <entrada.glb> <salida.glb>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';
const [,, inp, out] = process.argv;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(inp);
for (const e of doc.getRoot().listExtensionsUsed()) if (/meshopt|quantization/i.test(e.extensionName)) e.dispose();
await doc.transform(dequantize());
await io.write(out, doc);
console.log('ok', out);
