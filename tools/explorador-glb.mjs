// El explorador y la exploradora, el personaje del jugador (Meshy, del autor del juego; se elige chico o chica al
// empezar): junta en un solo GLB su figura y sus animaciones, que Meshy da en un archivo cada una (cada archivo trae otra vez la figura entera y sus texturas, unos
// 19 MB). Lo deja como los demás personajes de Meshy del juego (src/assets/meshy):
//  - el esqueleto con los nombres de Mixamo (mixamorig:Hips…), los que usan los gestos, la montura, el planeo y la
//    conducción; los huesos son los mismos, solo cambia el nombre (Spine02 de Meshy es el Spine de Mixamo, y así);
//  - las animaciones con nombre corto: Walk, Run, Run2, Crouch, Hop, Breathe, TalkP y PickUp las de él; Walk, Run, WalkC,
//    WalkF, Squat, Cheer, Spin, Stomp y Sit las de ella;
//  - solo el color (la textura de 4096 px, a 2048 en WebP), sin el relieve ni el brillo, como los demás: el juego los
//    ilumina a su manera (engine/charLight.js) y así gasta menos memoria gráfica;
//  - con las animaciones aligeradas y la malla comprimida con meshopt, como hace tools/glb-compress.mjs.
// Después: node tools/meshy-costuras.mjs explorador (la textura sin motas), node tools/meshy-textura.mjs (la de 1024),
// node tools/meshy-lod.mjs (la ligera) y node tools/meshy-retratos.mjs explorador (los retratos).
// Uso: node tools/explorador-glb.mjs <carpeta con los GLB de Meshy> [salida=src/assets/meshy/explorador.glb]
// (la de la exploradora: node tools/explorador-glb.mjs <carpeta> src/assets/meshy/exploradora.glb; el nombre del
// archivo de salida da el del material y la textura)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { resample, prune, dedup, meshopt, reorder } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { readdirSync, writeFileSync } from 'fs';
const [,, dir, out = 'src/assets/meshy/explorador.glb'] = process.argv;
const QUIEN = out.split('/').pop().replace('.glb', ''), Quien = QUIEN[0].toUpperCase() + QUIEN.slice(1);
if (!dir) { console.log('Uso: node tools/explorador-glb.mjs <carpeta> [salida]'); process.exit(1); }
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
// (el nombre de cada animación de Meshy en el juego)
const CLIPS = { Walking: 'Walk', Running: 'Run', Run_02: 'Run2', Cautious_Crouch_Walk_Forward: 'Crouch', Jump_Over_Obstacle_2: 'Hop',
  Short_Breathe_and_Look_Around: 'Breathe', Talk_Passionately: 'TalkP', Female_Bend_Over_Pick_Up_Inspect: 'PickUp',
  // (los de la exploradora)
  Casual_Walk: 'WalkC', Walk_Fight_Forward: 'WalkF', Squat_Stance: 'Squat', Cheer_with_One_Hand_Up: 'Cheer', Skill_02: 'Spin', Angry_Stomp: 'Stomp', Chair_Sit_Idle_F: 'Sit' };
// (los huesos de Meshy con su nombre de Mixamo)
const HUESOS = { Hips: 'Hips', Spine02: 'Spine', Spine01: 'Spine1', Spine: 'Spine2', neck: 'Neck', Head: 'Head', head_end: 'HeadTop_End',
  LeftShoulder: 'LeftShoulder', LeftArm: 'LeftArm', LeftForeArm: 'LeftForeArm', LeftHand: 'LeftHand', RightShoulder: 'RightShoulder', RightArm: 'RightArm',
  RightForeArm: 'RightForeArm', RightHand: 'RightHand', LeftUpLeg: 'LeftUpLeg', LeftLeg: 'LeftLeg', LeftFoot: 'LeftFoot', LeftToeBase: 'LeftToeBase',
  RightUpLeg: 'RightUpLeg', RightLeg: 'RightLeg', RightFoot: 'RightFoot', RightToeBase: 'RightToeBase' };
const files = readdirSync(dir).filter(f => f.endsWith('.glb'));   // (el modelo suelto, sin esqueleto ni animaciones, no aporta nada)
const base = files.find(f => /Walking/.test(f)) || files[0];
const doc = await io.read(`${dir}/${base}`), root = doc.getRoot();
const porNombre = new Map(root.listNodes().map(n => [n.getName(), n]));
// las animaciones de los demás archivos, pasadas a los huesos del primero (por su nombre)
for (const f of files) {
  if (f === base) continue;
  const d2 = await io.read(`${dir}/${f}`);
  for (const a of d2.getRoot().listAnimations()) {
    const A = doc.createAnimation(a.getName()), sm = new Map();
    for (const s of a.listSamplers()) {
      const cp = (acc) => doc.createAccessor().setType(acc.getType()).setArray(acc.getArray().slice()).setBuffer(root.listBuffers()[0]);
      const S = doc.createAnimationSampler().setInput(cp(s.getInput())).setOutput(cp(s.getOutput())).setInterpolation(s.getInterpolation());
      sm.set(s, S); A.addSampler(S);
    }
    for (const c of a.listChannels()) {
      const n = porNombre.get(c.getTargetNode()?.getName()); if (!n) continue;
      A.addChannel(doc.createAnimationChannel().setTargetNode(n).setTargetPath(c.getTargetPath()).setSampler(sm.get(c.getSampler())));
    }
  }
}
for (const a of root.listAnimations()) a.setName(CLIPS[a.getName()] || a.getName());
for (const n of root.listNodes()) if (HUESOS[n.getName()]) n.setName('mixamorig:' + HUESOS[n.getName()]);
// solo el color: fuera el relieve, el brillo y las tangentes; la textura de color, a 2048 px en WebP
for (const m of root.listMaterials()) {
  const col = m.getBaseColorTexture();
  m.setNormalTexture(null).setMetallicRoughnessTexture(null).setMetallicFactor(0).setRoughnessFactor(0.85).setName(Quien);
  if (col) {
    const png = await sharp(Buffer.from(col.getImage())).resize(2048, 2048, { fit: 'fill' }).webp({ quality: 92, smartSubsample: true }).toBuffer();
    col.setImage(new Uint8Array(png)).setMimeType('image/webp').setName(QUIEN);
  }
}
for (const p of root.listMeshes().flatMap(m => m.listPrimitives())) p.setAttribute('TANGENT', null);
await doc.transform(resample({ tolerance: 1e-4 }), dedup(), prune({ keepAttributes: false, keepLeaves: true }), reorder({ encoder: MeshoptEncoder }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
const bin = await io.writeBinary(doc); writeFileSync(out, bin);
console.log(out, `${(bin.byteLength / 1024) | 0} KB`, 'animaciones', root.listAnimations().map(a => a.getName()).join(', '));
