// Los modelos del juego (.glb: personajes, vecinos, seres de leyenda, animales, objetos) listos para cualquier motor: el
// juego los guarda comprimidos (EXT_meshopt_compression), con sus números cuantizados (KHR_mesh_quantization) y con las
// texturas en WebP dentro (EXT_texture_webp), y Unity con glTFast, Godot o Blender no siempre leen todo eso. Aquí salen
// descomprimidos, con los números normales y las texturas en PNG; el esqueleto y las animaciones, igual. Ver PORTAR.md.
// Uso:  node tools/exportar-modelos.mjs [origen] [destino]     (por defecto src/assets → exportar/modelos)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
const origen = process.argv[2] || 'src/assets', destino = process.argv[3] || 'exportar/modelos';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
// (sin las copias rebajadas que el juego usa en el móvil o de lejos: meshy-1024, texturas a 1024, y meshy/lod, mallas
// simplificadas; son el mismo personaje con menos calidad. Con TODOS=1 salen también)
const REBAJADAS = /(^|\/)(meshy-1024|meshy\/lod)(\/|$)/;
const L = []; const anda = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (process.env.TODOS === '1' || !REBAJADAS.test(path.relative(origen, p))) anda(p); } else if (/\.glb$/i.test(e.name)) L.push(p); } };
anda(origen);
let ok = 0; const mal = [];
for (const f of L) {
  try {
    const doc = await io.read(f), root = doc.getRoot();
    for (const t of root.listTextures()) if (t.getMimeType() === 'image/webp' && t.getImage()) {
      t.setImage(new Uint8Array(await sharp(Buffer.from(t.getImage())).png().toBuffer())).setMimeType('image/png');
      if (t.getURI()) t.setURI(t.getURI().replace(/\.webp$/i, '.png'));
    }
    await doc.transform(dequantize());
    // (las bibliotecas de animaciones, sin malla: un nodo con esqueleto pero sin malla no es glTF válido y glTFast lo rechaza)
    for (const n of root.listNodes()) if (n.getSkin() && !n.getMesh()) n.setSkin(null);
    for (const x of root.listExtensionsUsed()) if (['EXT_meshopt_compression', 'EXT_texture_webp', 'KHR_mesh_quantization'].includes(x.extensionName)) x.dispose();
    const dst = path.join(destino, path.relative(origen, f)); fs.mkdirSync(path.dirname(dst), { recursive: true });
    await io.write(dst, doc); ok++;
  } catch (e) { mal.push(`${f}: ${String(e.message || e).slice(0, 120)}`); }
}
console.log(`${ok} de ${L.length} modelos en ${destino}`); for (const m of mal) console.log('MAL', m);
