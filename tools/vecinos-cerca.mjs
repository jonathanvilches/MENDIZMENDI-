// Texturas de cerca de los vecinos de Meshy: la de su modelo original (2048 px) a 1024 px, en webp. El juego lleva la
// versión ligera de cada vecino (textura de 512 px, src/assets/meshy/lod) y, a los que están a pocos metros del jugador o
// hablando con él, les pone esta (actors/vecinoCerca.js), que se ve nítida de cerca y se suelta al alejarse.
// Uso: node tools/vecinos-cerca.mjs [px=1024]
import fs from 'fs';
import sharp from 'sharp';

const px = +(process.argv[2] || 1024), SRC = 'src/assets/meshy/vecinos', OUT = 'src/assets/meshy/cerca';
fs.mkdirSync(OUT, { recursive: true });
const imagen = (f) => { const b = fs.readFileSync(f), n = b.readUInt32LE(12), j = JSON.parse(b.slice(20, 20 + n)), bin = b.slice(20 + n + 8), bv = j.bufferViews[j.images[0].bufferView]; return bin.slice(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength); };
for (const f of fs.readdirSync(SRC).filter(f => f.endsWith('.glb'))) {
  const n = f.replace('.glb', ''), out = `${OUT}/${n}.webp`;
  await sharp(imagen(`${SRC}/${f}`)).resize(px, px, { kernel: 'lanczos3' }).webp({ quality: 86, effort: 6 }).toFile(out);
  console.log(n, (fs.statSync(out).size / 1024) | 0, 'KB');
}
