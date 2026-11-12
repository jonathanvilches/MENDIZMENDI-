// Los vecinos de Meshy (modelos del autor del juego, noviembre de 2026): abuelos con txapela, niños y adultos, cada uno
// con su ropa y su pelo. Meshy los da en un solo GLB con el esqueleto de Mixamo y todas sus animaciones; aquí se dejan
// como los demás personajes de Meshy del juego, en src/assets/meshy/vecinos (los originales, que no se publican: el juego
// solo lleva su versión ligera, src/assets/meshy/lod):
//  - las animaciones con nombre corto: Walk, Run, Alert, Chat (de pie charlando), WalkW (andar de mujer), Attack, Sit
//    (dar una cabezada sentado) y WaveH (saludar con la mano). Las de ellas andan con WalkW, si lo traen, en vez de con Walk;
//  - la cadera de cada animación, en el mismo sitio que al andar: la de charlar y la de sentarse empiezan 30 cm a un
//    lado y, al pasar de una a otra, el vecino saltaba de sitio;
//  - solo el color (la textura de 2048 px, en WebP), sin las tangentes; con las animaciones aligeradas y la malla
//    comprimida con meshopt, como tools/explorador-glb.mjs.
//  - las que le faltan de estar de pie (Alert) o de charlar (Chat), de otro vecino de Meshy (--de <glb>): todos llevan
//    el mismo esqueleto de Mixamo, así que se copian sus giros hueso a hueso y la cadera, a la altura de cada uno
//    (los panaderos y los campesinos no traen la de estar de pie, y los adultos no traen la de charlar).
// Después: FUENTE=src/assets/meshy/vecinos SOLO=<nombres> node tools/meshy-lod.mjs (la ligera, la que lleva el juego),
// FUENTE=src/assets/meshy/vecinos node tools/meshy-costuras.mjs <nombres> (sin motas, también en la ligera) y
// CABEZA=1 SOLO=bust CLIP=Idle T=0.05 node tools/meshy-retratos.mjs <nombre> (su retrato para las charlas).
// Uso: node tools/vecinos-glb.mjs <glb de Meshy> <nombre> [ella] [--de <glb>[,<glb>…]]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { resample, prune, dedup, meshopt, reorder } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
const [,, src, nombre, ella] = process.argv;
const DE = process.argv.includes('--de') ? process.argv[process.argv.indexOf('--de') + 1].split(',') : [];
if (!src || !nombre) { console.log('Uso: node tools/vecinos-glb.mjs <glb> <nombre> [ella]'); process.exit(1); }
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const CLIPS = { Walking: 'Walk', Running: 'Run', Alert: 'Alert', Stand_and_Chat: 'Chat', Walking_Woman: 'WalkW', Attack: 'Attack', Dozing_Elderly: 'Sit',
  Casual_Walk: 'WalkC', Chair_Sit_Idle_F: 'SitF', Skill_02: 'Spin', Wave_One_Hand: 'WaveH' };
const doc = await io.read(src), root = doc.getRoot();
for (const a of root.listAnimations()) a.setName(CLIPS[a.getName()] || a.getName());
const anims = Object.fromEntries(root.listAnimations().map(a => [a.getName(), a]));
// las que le faltan, de otro vecino: sus giros tal cual y la cadera a la altura de la suya (la de andar, al empezar)
const caderaDe = (a) => a?.listChannels().find(c => c.getTargetPath() === 'translation' && /Hips$/.test(c.getTargetNode()?.getName() || ''));
const porNombre = new Map(root.listNodes().map(n => [n.getName(), n])), buf = root.listBuffers()[0];
for (const f of DE) {
  const d2 = await io.read(f), R2 = d2.getRoot();
  const anda2 = R2.listAnimations().find(a => a.getName() === 'Walking'), anda = root.listAnimations().find(a => a.getName() === 'Walk');
  const k = (caderaDe(anda)?.getSampler().getOutput().getElement(0, [])[1] || 1) / (caderaDe(anda2)?.getSampler().getOutput().getElement(0, [])[1] || 1);
  for (const a of R2.listAnimations()) {
    const quiero = CLIPS[a.getName()]; if (!['Alert', 'Chat'].includes(quiero) || anims[quiero] || root.listAnimations().some(b => b.getName() === quiero)) continue;
    const A = doc.createAnimation(quiero);
    for (const c of a.listChannels()) {
      const n = porNombre.get(c.getTargetNode()?.getName()); if (!n || c.getTargetPath() === 'scale') continue;
      const s0 = c.getSampler(), o = s0.getOutput(), arr = o.getArray().slice();
      if (c.getTargetPath() === 'translation') { if (!/Hips$/.test(n.getName())) continue; for (let i = 0; i < arr.length; i++) arr[i] *= k; }
      const S = doc.createAnimationSampler().setInterpolation(s0.getInterpolation())
        .setInput(doc.createAccessor().setType(s0.getInput().getType()).setArray(s0.getInput().getArray().slice()).setBuffer(buf))
        .setOutput(doc.createAccessor().setType(o.getType()).setArray(arr).setBuffer(buf));
      A.addSampler(S); A.addChannel(doc.createAnimationChannel().setTargetNode(n).setTargetPath(c.getTargetPath()).setSampler(S));
    }
    console.log(`  ${quiero}: de ${f.split('/').pop()} (cadera ×${k.toFixed(2)})`);
  }
}
// (ellas: su andar de mujer es el de andar; el otro se queda como WalkM)
if (ella === 'ella' && anims.WalkW) { anims.Walk?.setName('WalkM'); anims.WalkW.setName('Walk'); }
// la cadera de cada animación, al principio, donde está al andar (solo en el suelo: x y z)
const ref = caderaDe(root.listAnimations().find(a => a.getName() === 'Walk'))?.getSampler().getOutput().getElement(0, []);
for (const a of root.listAnimations()) {
  const ch = caderaDe(a); if (!ch || !ref) continue;
  const out = ch.getSampler().getOutput(), v0 = out.getElement(0, []), dx = ref[0] - v0[0], dz = ref[2] - v0[2];
  if (Math.hypot(dx, dz) < 0.03) continue;
  // (cada animación tiene su propio accesor: se copia antes de moverlo, por si lo comparte con otra)
  const arr = out.getArray().slice(); for (let i = 0; i < arr.length; i += 3) { arr[i] += dx; arr[i + 2] += dz; }
  ch.getSampler().setOutput(doc.createAccessor().setType(out.getType()).setArray(arr).setBuffer(root.listBuffers()[0]));
  console.log(`  ${a.getName()}: cadera movida ${Math.hypot(dx, dz).toFixed(1)} (en las unidades del esqueleto)`);
}
for (const m of root.listMaterials()) {
  const col = m.getBaseColorTexture();
  m.setNormalTexture(null).setMetallicRoughnessTexture(null).setMetallicFactor(0).setRoughnessFactor(0.85).setName(nombre);
  if (col) {
    const webp = await sharp(Buffer.from(col.getImage())).resize(2048, 2048, { fit: 'fill' }).webp({ quality: 92, smartSubsample: true }).toBuffer();
    col.setImage(new Uint8Array(webp)).setMimeType('image/webp').setName(nombre);
  }
}
for (const p of root.listMeshes().flatMap(m => m.listPrimitives())) p.setAttribute('TANGENT', null);
await doc.transform(resample({ tolerance: 1e-4 }), dedup(), prune({ keepAttributes: false, keepLeaves: true }), reorder({ encoder: MeshoptEncoder }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
const out = `src/assets/meshy/vecinos/${nombre}.glb`, bin = await io.writeBinary(doc); mkdirSync('src/assets/meshy/vecinos', { recursive: true }); writeFileSync(out, bin);
console.log(out, `${(bin.byteLength / 1024) | 0} KB`, 'animaciones', root.listAnimations().map(a => a.getName()).join(', '));
