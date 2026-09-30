// Aligera un GLB de personaje sin Draco: quita claves de animación redundantes, une datos repetidos
// y cuantiza los atributos (KHR_mesh_quantization, que three.js lee sin decodificador).
// Uso: node tools/chars/optimize.mjs <entrada.glb> [salida.glb]
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, resample, quantize } from '@gltf-transform/functions';
import { statSync, writeFileSync } from 'fs';
const [,, inp, out = inp] = process.argv;
const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const doc = await io.read(inp);
const before = statSync(inp).size;
await doc.transform(
  resample({ tolerance: 1e-4 }),
  dedup(),
  prune({ keepExtras: true, keepLeaves: true, keepAttributes: true }),
  quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeWeight: 8 }),
);
writeFileSync(out, await io.writeBinary(doc));
console.log(`${inp}: ${(before / 1e6).toFixed(2)} MB → ${(statSync(out).size / 1e6).toFixed(2)} MB`);
