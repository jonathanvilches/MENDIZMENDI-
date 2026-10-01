// Prepara las frutas y verduras del pack «Food» de Quaternius (CC0) convertidas en Blender (/tmp/claude-0/food/food.glb)
// para el mercado: sin datos repetidos y con atributos cuantizados → src/assets/food/food.glb
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, quantize, weld } from '@gltf-transform/functions';
import { statSync } from 'fs';
const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const doc = await io.read(process.argv[2] || '/tmp/claude-0/food/food.glb');
await doc.transform(dedup(), weld(), prune(), quantize({ quantizePosition: 12, quantizeNormal: 8 }));
await io.write('src/assets/food/food.glb', doc);
console.log('food.glb', (statSync('src/assets/food/food.glb').size / 1024).toFixed(0), 'KB', doc.getRoot().listNodes().map(n => n.getName()).join(','));
