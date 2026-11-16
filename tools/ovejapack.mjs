// Prepara las ovejas de Meshy ya montadas sobre el esqueleto de la oveja (tools/blender/fauna/oveja-meshy.py) para el
// juego: textura a WebP de 1024 (de cerca basta y en el iPhone cuesta 4 MB en vez de 16), sin datos repetidos,
// atributos cuantizados y malla comprimida con meshopt, como los demás animales.
// Uso: node tools/ovejapack.mjs <entrada.glb> <salida.glb>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, resample, quantize, textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { statSync } from 'fs';
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const [src, out] = process.argv.slice(2);
const doc = await io.read(src);
await doc.transform(
  resample({ tolerance: 1e-4 }), dedup(), prune({ keepExtras: true, keepLeaves: true, keepAttributes: true }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 88 }),
  quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 14, quantizeWeight: 8 }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(out, doc);
console.log(out, (statSync(out).size / 1024).toFixed(0) + ' KB', doc.getRoot().listAnimations().map(a => a.getName()).join(','));
