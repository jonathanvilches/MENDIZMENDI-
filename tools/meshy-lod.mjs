// Versión ligera de los personajes de Meshy para cuando salen muchos a la vez (vecinos, corredores del encierro,
// futbolistas, gente de los minijuegos): la misma figura, esqueleto y animaciones, con ~1/4 de los triángulos y la
// textura a 512 px. Los originales se quedan para el personaje del jugador (que se ve de cerca).
// Uso: node tools/meshy-lod.mjs [ratio=0.26] [px=512] [carpeta=lod]   (más allá de ~0,25 no baja: costuras de la textura)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, textureCompress, prune, dedup, reorder, meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { readdirSync, mkdirSync, statSync } from 'fs';

const [,, ratio = '0.26', px = '512', dir = 'lod'] = process.argv;
const SRC = 'src/assets/meshy', OUT = SRC + '/' + dir;
mkdirSync(OUT, { recursive: true });
await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const tris = (doc) => doc.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0), 0);
for (const f of readdirSync(SRC).filter(f => f.endsWith('.glb'))) {
  const doc = await io.read(`${SRC}/${f}`), t0 = tris(doc);
  await doc.transform(
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: +ratio, error: +ratio < 0.15 ? 0.02 : 0.004, lockBorder: false }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [+px, +px], quality: 88 }),
    dedup(), prune(),
    reorder({ encoder: MeshoptEncoder }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  await io.write(`${OUT}/${f}`, doc);
  console.log(f, `${t0 | 0} → ${tris(doc) | 0} triángulos`, `${(statSync(`${SRC}/${f}`).size / 1024) | 0} → ${(statSync(`${OUT}/${f}`).size / 1024) | 0} KB`);
}
