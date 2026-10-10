// Los personajes de Meshy con la textura a 1024 px, para el archivo único que se abre en el móvil: la misma figura,
// esqueleto y animaciones que los originales (src/assets/meshy, textura de 2048 px), con un cuarto de los píxeles.
// En la pantalla de un teléfono no se nota, ocupa menos y gasta menos memoria gráfica. La web sigue con los de 2048.
// Uso: node tools/meshy-textura.mjs [px=1024] [carpeta=src/assets/meshy-1024]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { readdirSync, mkdirSync, statSync } from 'fs';

const [,, px = '1024', OUT = 'src/assets/meshy-1024'] = process.argv;
const SRC = 'src/assets/meshy';
mkdirSync(OUT, { recursive: true });
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
for (const f of readdirSync(SRC).filter(f => f.endsWith('.glb'))) {
  const doc = await io.read(`${SRC}/${f}`);
  await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [+px, +px], quality: 86 }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(`${OUT}/${f}`, doc);
  console.log(f, `${(statSync(`${SRC}/${f}`).size / 1024) | 0} → ${(statSync(`${OUT}/${f}`).size / 1024) | 0} KB`);
}
