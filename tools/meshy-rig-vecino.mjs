// Junta en un solo GLB un personaje al que Meshy ha puesto el esqueleto por la API (meshy_rig) y sus animaciones (las
// de andar y correr que trae el esqueleto y las de meshy_animate: estar de pie, charlar...), con los nombres de los vecinos:
//  - los huesos, con los nombres de Mixamo que espera el juego (mixamorig:Hips...): el esqueleto de la API los llama
//    Hips, Spine02, Spine01, Spine, neck, Head, head_end... y los gestos de las charlas y el agarre buscan los de Mixamo;
//  - las animaciones, con los nombres que entiende tools/vecinos-glb.mjs (Walking, Running, Alert, Stand_and_Chat).
// Cada GLB de animación de Meshy trae el personaje entero con su esqueleto y una animación; se toma el primero como base
// y de los demás solo la animación, hueso a hueso por su nombre. Después: node tools/vecinos-glb.mjs <salida> <nombre>.
// Uso: node tools/meshy-rig-vecino.mjs <salida.glb> <anda.glb>:Walking <corre.glb>:Running <quieto.glb>:Alert <charla.glb>:Stand_and_Chat
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { writeFileSync } from 'fs';
const [,, out, ...pares] = process.argv;
if (!out || !pares.length) { console.log('Uso: node tools/meshy-rig-vecino.mjs <salida.glb> <glb>:<clip> ...'); process.exit(1); }
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
// (de abajo arriba: el primer hueso de la espalda de la API, Spine02, es el Spine de Mixamo, y el último, Spine, el Spine2)
const HUESO = { Hips: 'Hips', Spine02: 'Spine', Spine01: 'Spine1', Spine: 'Spine2', neck: 'Neck', Head: 'Head', head_end: 'HeadTop_End' };
for (const l of ['Left', 'Right']) for (const p of ['Shoulder', 'Arm', 'ForeArm', 'Hand', 'UpLeg', 'Leg', 'Foot', 'ToeBase']) HUESO[l + p] = l + p;
const [base, ...resto] = pares.map(s => { const i = s.lastIndexOf(':'); return { f: s.slice(0, i), clip: s.slice(i + 1) }; });
const doc = await io.read(base.f), root = doc.getRoot(), buf = root.listBuffers()[0];
// (comprueba la cadena de la espalda antes de cambiar nombres: Hips → Spine02 → Spine01 → Spine → neck → Head)
const porNombre = new Map(root.listNodes().map(n => [n.getName(), n]));
const hijoDe = (a, b) => porNombre.get(a)?.listChildren().includes(porNombre.get(b));
if (!(hijoDe('Hips', 'Spine02') && hijoDe('Spine02', 'Spine01') && hijoDe('Spine01', 'Spine') && hijoDe('Spine', 'neck'))) { console.log('La espalda no es Hips > Spine02 > Spine01 > Spine > neck: revisa los nombres'); process.exit(1); }
const anims = root.listAnimations(); if (anims.length !== 1) console.log(`  (la base trae ${anims.length} animaciones)`);
anims[0]?.setName(base.clip);
for (const { f, clip } of resto) {
  const R2 = (await io.read(f)).getRoot(), a = R2.listAnimations()[0]; if (!a) { console.log('  sin animación:', f); continue; }
  const A = doc.createAnimation(clip); let n = 0;
  for (const c of a.listChannels()) {
    const t = porNombre.get(c.getTargetNode()?.getName()); if (!t) continue;
    const s0 = c.getSampler(), i0 = s0.getInput(), o0 = s0.getOutput();
    const S = doc.createAnimationSampler().setInterpolation(s0.getInterpolation())
      .setInput(doc.createAccessor().setType(i0.getType()).setArray(i0.getArray().slice()).setBuffer(buf))
      .setOutput(doc.createAccessor().setType(o0.getType()).setArray(o0.getArray().slice()).setBuffer(buf));
    A.addSampler(S); A.addChannel(doc.createAnimationChannel().setTargetNode(t).setTargetPath(c.getTargetPath()).setSampler(S)); n++;
  }
  console.log(`  ${clip}: ${n} canales de ${f.split('/').pop()}`);
}
for (const [de, a] of Object.entries(HUESO)) porNombre.get(de)?.setName('mixamorig:' + a);
writeFileSync(out, await io.writeBinary(doc));
console.log(out, 'animaciones', root.listAnimations().map(a => a.getName()).join(', '));
