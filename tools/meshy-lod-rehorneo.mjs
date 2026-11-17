// Versión ligera de los personajes de Meshy de 100.000 triángulos (los del rediseño de noviembre de 2026, con la misma
// identidad que los pelotaris nuevos), con la textura horneada de nuevo. tools/meshy-lod.mjs no los baja de ~18.000
// triángulos sin romper la textura (la de Meshy está en cientos de islas: el 91 % de los vértices está en una costura) y
// en un pueblo salen muchos a la vez. Aquí Blender (tools/blender/lod-rehorneo.py) simplifica la malla, la desenvuelve de
// nuevo y hornea encima el color del modelo de cerca; después, en el original, se cambia la malla por la ligera: los
// huesos, las animaciones y los pesos son los suyos (los pesos, del vértice del original más cercano a cada uno nuevo).
// La textura de cerca de los vecinos (src/assets/meshy/cerca, a 1024 px: actors/vecinoCerca.js la pone en vez de la ligera
// a los que están a pocos metros) sale del mismo horneado: tiene que ir con el reparto de la ligera, no con el del original.
// Uso: SOLO=juez,abuelo node tools/meshy-lod-rehorneo.mjs [triangulos=9000] [px horneado=2048] [px final=512] [px cerca=1024]
//      (FUENTE: carpeta de los modelos de cerca, por defecto src/assets/meshy/vecinos; salen en src/assets/meshy/lod)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { textureCompress, prune, dedup, reorder, meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { readFileSync, mkdirSync, statSync } from 'fs';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';

const [,, tris = '9000', px = '2048', pxFin = '512', pxCerca = '1024'] = process.argv;
const SRC = process.env.FUENTE || 'src/assets/meshy/vecinos', OUT = 'src/assets/meshy/lod', TMP = process.env.TMPDIR_LOD || `${tmpdir()}/lod-rehorneo`;
// (BLENDER_PY: un python con el módulo bpy, o el ejecutable de Blender; por defecto, «blender»)
const PY = process.env.BLENDER_PY || 'blender';
const SOLO = (process.env.SOLO || '').split(',').filter(Boolean);
if (!SOLO.length) { console.log('Uso: SOLO=nombre1,nombre2 node tools/meshy-lod-rehorneo.mjs [triangulos] [px]'); process.exit(1); }
mkdirSync(TMP, { recursive: true }); mkdirSync(OUT, { recursive: true });
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

for (const nombre of SOLO) {
  const src = `${SRC}/${nombre}.glb`;
  // (para Blender, sin comprimir)
  const d0 = await io.read(src);
  for (const e of d0.getRoot().listExtensionsUsed()) if (/meshopt|quantiz/i.test(e.extensionName)) e.dispose();
  await io.write(`${TMP}/${nombre}.glb`, d0);
  const args = PY.endsWith('python') ? [new URL('./blender/lod-rehorneo.py', import.meta.url).pathname, '--'] : ['-b', '-P', new URL('./blender/lod-rehorneo.py', import.meta.url).pathname, '--'];
  const log = execFileSync(PY, [...args, `${TMP}/${nombre}.glb`, `${TMP}/${nombre}`, tris, px], { encoding: 'utf8', maxBuffer: 64 << 20 });
  const linea = log.split('\n').find(l => l.startsWith('LIGERA')); if (!linea) { console.log(nombre, 'Blender no ha sacado la malla:\n', log.slice(-2000)); continue; }
  // la malla ligera
  const b = readFileSync(`${TMP}/${nombre}.bin`), nv = b.readUInt32LE(0), ni = b.readUInt32LE(4); let o = 12;
  const cajaB = [0, 1, 2, 3, 4, 5].map(k => b.readFloatLE(12 + k * 4)); o += 24;
  const lee = (n, T) => { const a = new T(n); for (let i = 0; i < n; i++, o += 4) a[i] = T === Uint32Array ? b.readUInt32LE(o) : b.readFloatLE(o); return a; };
  const P = lee(nv * 3, Float32Array), N = lee(nv * 3, Float32Array), UV = lee(nv * 2, Float32Array), I = lee(ni, Uint32Array);
  // en el original: la malla con piel más grande
  const doc = await io.read(src), root = doc.getRoot(), buf = root.listBuffers()[0];
  let prim = null; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) if (p.getAttribute('JOINTS_0') && (!prim || p.getAttribute('POSITION').getCount() > prim.getAttribute('POSITION').getCount())) prim = p;
  const pos = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0'), n0 = pos.getCount();
  // los pesos: del vértice del original más cercano (rejilla de 1/60 del alto)
  const v = [0, 0, 0], mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9], OP = new Float32Array(n0 * 3);
  for (let i = 0; i < n0; i++) { pos.getElement(i, v); for (let k = 0; k < 3; k++) { OP[i * 3 + k] = v[k]; mn[k] = Math.min(mn[k], v[k]); mx[k] = Math.max(mx[k], v[k]); } }
  // (la ligera, del espacio de Blender al del glTF: la caja del de cerca en Blender sobre la del original)
  for (let i = 0; i < nv; i++) for (let k = 0; k < 3; k++) P[i * 3 + k] = mn[k] + (P[i * 3 + k] - cajaB[k]) / (cajaB[k + 3] - cajaB[k]) * (mx[k] - mn[k]);
  const cel = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) / 60, rej = new Map();
  const kc = (x, y, z) => `${Math.floor((x - mn[0]) / cel)},${Math.floor((y - mn[1]) / cel)},${Math.floor((z - mn[2]) / cel)}`;
  for (let i = 0; i < n0; i++) { const k = kc(OP[i * 3], OP[i * 3 + 1], OP[i * 3 + 2]); (rej.get(k) || rej.set(k, []).get(k)).push(i); }
  const JN = new Uint16Array(nv * 4), WN = new Float32Array(nv * 4), jv = [0, 0, 0, 0], wv = [0, 0, 0, 0];
  let lejos = 0;
  for (let i = 0; i < nv; i++) {
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], cx = Math.floor((x - mn[0]) / cel), cy = Math.floor((y - mn[1]) / cel), cz = Math.floor((z - mn[2]) / cel);
    let best = -1, bd = Infinity;
    for (let r = 1; r <= 4 && best < 0; r++) for (let a = -r; a <= r; a++) for (let c = -r; c <= r; c++) for (let e = -r; e <= r; e++) for (const j of rej.get(`${cx + a},${cy + c},${cz + e}`) || []) {
      const dd = (OP[j * 3] - x) ** 2 + (OP[j * 3 + 1] - y) ** 2 + (OP[j * 3 + 2] - z) ** 2; if (dd < bd) { bd = dd; best = j; }
    }
    if (best < 0) { best = 0; lejos++; }
    J.getElement(best, jv); W.getElement(best, wv); const s = wv[0] + wv[1] + wv[2] + wv[3] || 1;
    for (let k = 0; k < 4; k++) { JN[i * 4 + k] = jv[k]; WN[i * 4 + k] = wv[k] / s; }
  }
  const acc = (type, arr) => doc.createAccessor().setType(type).setArray(arr).setBuffer(buf);
  for (const s of prim.listSemantics()) if (!['POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0'].includes(s)) prim.setAttribute(s, null);
  prim.setAttribute('POSITION', acc('VEC3', P)).setAttribute('NORMAL', acc('VEC3', N)).setAttribute('TEXCOORD_0', acc('VEC2', UV))
    .setAttribute('JOINTS_0', acc('VEC4', JN)).setAttribute('WEIGHTS_0', acc('VEC4', WN)).setIndices(acc('SCALAR', I));
  // la textura horneada, sola (sin las de normales ni rugosidad: en la ligera no se ven)
  const mat = prim.getMaterial(), tex = doc.createTexture(nombre).setImage(readFileSync(`${TMP}/${nombre}.png`)).setMimeType('image/png');
  mkdirSync('src/assets/meshy/cerca', { recursive: true });
  await sharp(`${TMP}/${nombre}.png`).resize(+pxCerca, +pxCerca, { kernel: 'lanczos3' }).webp({ quality: 88, smartSubsample: true, effort: 6 }).toFile(`src/assets/meshy/cerca/${nombre}.webp`);
  mat.setBaseColorTexture(tex).setNormalTexture(null).setMetallicRoughnessTexture(null).setOcclusionTexture(null).setEmissiveTexture(null);
  await doc.transform(
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [+pxFin, +pxFin], quality: 88 }),
    dedup(), prune(), reorder({ encoder: MeshoptEncoder }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  await io.write(`${OUT}/${nombre}.glb`, doc);
  console.log(nombre, linea.replace('LIGERA ', ''), `${(statSync(`${OUT}/${nombre}.glb`).size / 1024) | 0} KB`, lejos ? `(${lejos} vértices sin vecino cerca)` : '');
}
