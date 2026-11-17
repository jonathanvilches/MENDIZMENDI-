// Versión ligera de los personajes de Meshy para cuando salen muchos a la vez (vecinos, corredores del encierro,
// futbolistas, gente de los minijuegos): la misma figura, esqueleto y animaciones, con ~1/4 de los triángulos y la
// textura a 512 px. Los originales se quedan para el personaje del jugador (que se ve de cerca).
// Uso: node tools/meshy-lod.mjs [ratio=0.26] [px=512] [carpeta=lod]   (más allá de ~0,25 no baja: costuras de la textura;
// con ERR=0.012 se le deja desviarse algo más y sí baja: los de Meshy de 100.000 triángulos, de ~35.000 a ~9.000)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, textureCompress, prune, dedup, reorder, meshopt, compactPrimitive } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { readdirSync, mkdirSync, statSync } from 'fs';

const [,, ratio = '0.26', px = '512', dir = 'lod'] = process.argv;
const SRC = process.env.FUENTE || 'src/assets/meshy', OUT = 'src/assets/meshy/' + dir;   // (FUENTE: los vecinos, src/assets/meshy/vecinos)
mkdirSync(OUT, { recursive: true });
await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const tris = (doc) => doc.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0), 0);
// (PERM=1: simplifica cruzando las costuras de la textura, que es lo que no le deja bajar de ~25 %, pero midiendo cuánto se
// estira la textura al hacerlo (sus coordenadas pesan en el error): los personajes de Meshy de 100.000 triángulos, con
// cientos de islas en su textura, se quedaban en 20.000-30.000 triángulos en la versión ligera y así bajan a ~9.000
// sin que se deformen la cara ni la ropa)
const simplificaCruzando = (ratio, error) => (doc) => {
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) {
    const ix = p.getIndices(), pos = p.getAttribute('POSITION'), uv = p.getAttribute('TEXCOORD_0'); if (!ix || !pos) continue;
    const I = new Uint32Array(ix.getArray()), P = pos.getArray() instanceof Float32Array ? pos.getArray() : new Float32Array(pos.getArray());
    const n = Math.floor(I.length * ratio / 3) * 3;
    const w = +(process.env.UVW || 0), [out] = uv && w ? MeshoptSimplifier.simplifyWithAttributes(I, P, 3, new Float32Array(uv.getArray()), 2, [w, w], null, n, error, ['Permissive'])
      : MeshoptSimplifier.simplify(I, P, 3, n, error, ['Permissive']);
    p.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(out)).setBuffer(ix.getBuffer()));
    compactPrimitive(p);
  }
};
// (SOLO=explorador,pastor: solo esos modelos; sin él, todos)
const SOLO = process.env.SOLO ? process.env.SOLO.split(',') : null;
for (const f of readdirSync(SRC).filter(f => f.endsWith('.glb') && (!SOLO || SOLO.includes(f.replace('.glb', ''))))) {
  const doc = await io.read(`${SRC}/${f}`), t0 = tris(doc);
  await doc.transform(
    weld(),
    process.env.PERM ? simplificaCruzando(+ratio, +(process.env.ERR || 0.01))
      : simplify({ simplifier: MeshoptSimplifier, ratio: +ratio, error: +(process.env.ERR || (+ratio < 0.15 ? 0.02 : 0.004)), lockBorder: false }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [+px, +px], quality: 88 }),
    dedup(), prune(),
    reorder({ encoder: MeshoptEncoder }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  await io.write(`${OUT}/${f}`, doc);
  console.log(f, `${t0 | 0} → ${tris(doc) | 0} triángulos`, `${(statSync(`${SRC}/${f}`).size / 1024) | 0} → ${(statSync(`${OUT}/${f}`).size / 1024) | 0} KB`);
}
