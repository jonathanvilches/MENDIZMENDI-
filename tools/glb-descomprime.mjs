// Quita la compresión meshopt de un GLB del juego para abrirlo en Blender (que no la lee).
// Uso: node tools/glb-descomprime.mjs entrada.glb salida.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
const [,, ent, sal] = process.argv;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(ent);
for (const e of doc.getRoot().listExtensionsUsed()) if (/meshopt/i.test(e.extensionName)) e.dispose();
await io.write(sal, doc);
console.log('ok', sal);
