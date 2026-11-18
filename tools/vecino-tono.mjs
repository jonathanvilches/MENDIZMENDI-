// El tono de la textura de un vecino hecho en Meshy desde una imagen (noviembre de 2026: los queseros). La textura que
// saca Meshy de la imagen queda más pálida que la de los vecinos de siempre: al lado de ellos, la piel y la ropa clara se
// veían blancas (el autor: «salen muy blancos, compáralos con los otros vecinos»). Aquí se oscurece un poco (gamma y
// ganancia) y se le sube algo el color, sobre el modelo de src/assets/meshy/vecinos; después, su versión ligera y su
// textura de cerca se sacan de él como siempre (tools/meshy-lod.mjs, tools/vecinos-cerca.mjs).
// Uso: node tools/vecino-tono.mjs <nombre> [gamma=1.2] [ganancia=0.92] [color=1.1]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
const [,, nombre, g = '1.2', k = '0.92', c = '1.1'] = process.argv;
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const f = `src/assets/meshy/vecinos/${nombre}.glb`, doc = await io.read(f);
for (const t of doc.getRoot().listTextures()) {
  const { data, info } = await sharp(t.getImage()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 3) {
    const r = (data[i] / 255) ** +g * +k, v = (data[i + 1] / 255) ** +g * +k, b = (data[i + 2] / 255) ** +g * +k, l = 0.299 * r + 0.587 * v + 0.114 * b;
    data[i] = Math.max(0, Math.min(255, (l + (r - l) * +c) * 255)); data[i + 1] = Math.max(0, Math.min(255, (l + (v - l) * +c) * 255)); data[i + 2] = Math.max(0, Math.min(255, (l + (b - l) * +c) * 255));
  }
  t.setImage(await sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } }).webp({ quality: 90 }).toBuffer()).setMimeType('image/webp');
}
await io.write(f, doc); console.log(f, 'tono', g, k, c);
