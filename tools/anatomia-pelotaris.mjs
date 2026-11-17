// Prueba de anatomía de los movimientos de pelota (actors/pelotaMoves.js) sobre el esqueleto de cada pelotari, sin
// navegador: monta los huesos del GLB, hornea todos los movimientos y mide en cada fotograma de cada uno lo que haría una
// persona: cuánto gira el húmero sobre sí mismo (hacia dentro o hacia fuera), cuánto se dobla el codo y hacia qué lado
// (nunca hacia atrás), cuánto prona o supina el antebrazo y cuánto se dobla la muñeca. Lo que pasa de los límites humanos
// (ANATOMIA) sale como fallo, con el movimiento y el fotograma.
// Uso: node tools/anatomia-pelotaris.mjs [glb…]   (sin nada, los pelotaris nuevos)   SIN_LIMITES=1: como antes de los límites
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import * as THREE from 'three';
import { pelotaMoves, ANATOMIA, _anatomia } from '../src/actors/pelotaMoves.js';

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const LIM = { ...ANATOMIA };
if (process.env.SIN_LIMITES) Object.assign(ANATOMIA, { humeroDentro: 1e9, humeroFuera: 1e9, codoMax: 179.9, pronaMax: 1e9, supinaMax: 1e9, muneca: 1e9 });
const files = process.argv.slice(2).length ? process.argv.slice(2) : ['pelotari_nuevo', 'pelotari_nueva', 'pelotari_nueva2', 'pelotari_nueva3'].map(n => `src/assets/meshy/${n}.glb`);
const G = 180 / Math.PI;

async function esqueleto(f) {
  const d = await io.read(f), root = new THREE.Group(), por = new Map();
  const mk = (n) => { if (por.has(n)) return por.get(n); const b = new THREE.Bone(); b.name = THREE.PropertyBinding.sanitizeNodeName(n.getName()); b.position.fromArray(n.getTranslation()); b.quaternion.fromArray(n.getRotation()); b.scale.fromArray(n.getScale()); por.set(n, b); const p = n.getParentNode(); (p ? mk(p) : root).add(b); return b; };
  for (const n of d.getRoot().listNodes()) if (!n.getMesh()) mk(n);
  root.updateMatrixWorld(true); return root;
}
const huesos = (root) => { const B = {}; root.traverse(o => { if (o.isBone) B[o.name.replace(/^mixamorig:?/, '')] = o; }); return B; };
const P = (b) => new THREE.Vector3().setFromMatrixPosition(b.matrixWorld);
const Q = (b) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().extractRotation(b.matrixWorld));

for (const f of files) {
  const root = await esqueleto(f), B = huesos(root);
  // reposo: dirección del brazo, lado anatómico del codo (delante) y orientación del pecho y la mano respecto al antebrazo
  const rest = {}, qPecho0 = Q(B.Spine2);
  for (const s of ['Left', 'Right']) {
    const up = P(B[s + 'ForeArm']).sub(P(B[s + 'Arm'])).normalize(), lo = P(B[s + 'Hand']).sub(P(B[s + 'ForeArm'])).normalize();
    const delante = new THREE.Vector3(0, 0, 1).addScaledVector(up, -up.z).normalize(), loP = lo.clone().addScaledVector(up, -lo.dot(up));
    const a = loP.length() > 0.12 && loP.clone().normalize().dot(delante) > 0.3 ? loP.normalize() : delante;
    // (el lado de delante del codo, en los ejes del húmero: así se sabe hacia dónde se dobla en cada fotograma)
    const ref = new THREE.Vector3(s === 'Left' ? 0.5 : -0.5, -0.6, 0.6).normalize(), aRef = a.clone().applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, ref)); aRef.addScaledVector(ref, -aRef.dot(ref)).normalize();
    rest[s] = { ref, aRef, up, a, aLocal: a.clone().applyQuaternion(Q(B[s + 'Arm']).invert()), qMano: Q(B[s + 'ForeArm']).invert().multiply(Q(B[s + 'Hand'])) };
  }
  Object.assign(_anatomia, { brazos: 0, corregidos: 0, peor: 0, codo: 0 });
  const clips = pelotaMoves(root, { archivo: true });
  const mixer = new THREE.AnimationMixer(root), fallos = [], max = { dentro: -1e9, fuera: -1e9, codo: 0, atras: 0, prona: -1e9, supina: -1e9 };
  for (const c of clips) {
    mixer.stopAllAction(); const act = mixer.clipAction(c); act.reset().play();
    const n = Math.round(c.duration * 30);
    for (let i = 0; i <= n; i++) {
      mixer.setTime(i / 30); root.updateMatrixWorld(true);
      const qPecho = Q(B.Spine2).multiply(qPecho0.clone().invert()), inv = qPecho.clone().invert();
      for (const s of ['Left', 'Right']) {
        const S = P(B[s + 'Arm']), E = P(B[s + 'ForeArm']), H = P(B[s + 'Hand']), up = E.clone().sub(S).normalize(), lo = H.clone().sub(E).normalize();
        const flex = Math.acos(Math.max(-1, Math.min(1, up.dot(lo)))) * G;
        // lado: el antebrazo, ¿hacia la cara de delante del húmero (la de reposo, girada con él)?
        const delanteAhora = rest[s].aLocal.clone().applyQuaternion(Q(B[s + 'Arm'])), lado = flex > 8 ? lo.clone().addScaledVector(up, -lo.dot(up)).normalize().dot(delanteAhora) : 1;
        // giro del húmero: su cara de delante frente a la de la referencia (abajo, adelante y afuera) llevada por el camino más corto
        const upC = up.clone().applyQuaternion(inv), aC = delanteAhora.clone().applyQuaternion(inv); aC.addScaledVector(upC, -aC.dot(upC)).normalize();
        const a0 = rest[s].aRef.clone().applyQuaternion(new THREE.Quaternion().setFromUnitVectors(rest[s].ref, upC)); a0.addScaledVector(upC, -a0.dot(upC)).normalize();
        let tw = Math.atan2(new THREE.Vector3().crossVectors(a0, aC).dot(upC), a0.dot(aC)) * G; if (s === 'Right') tw = -tw;
        // pronación: giro de la mano respecto al antebrazo sobre el eje del antebrazo, frente al de reposo (positivo, prona)
        const qm = Q(B[s + 'ForeArm']).invert().multiply(Q(B[s + 'Hand'])).multiply(rest[s].qMano.clone().invert());
        const ax = new THREE.Vector3(qm.x, qm.y, qm.z), ang = 2 * Math.atan2(ax.length(), qm.w) * G, eje = B[s + 'Hand'].position.clone().normalize();
        let pr = ax.lengthSq() > 1e-10 ? (ax.normalize().dot(eje) * ang) : 0; if (pr > 180) pr -= 360; if (s === 'Right') pr = -pr;
        max.dentro = Math.max(max.dentro, tw); max.fuera = Math.max(max.fuera, -tw); max.codo = Math.max(max.codo, flex); max.prona = Math.max(max.prona, pr); max.supina = Math.max(max.supina, -pr);
        const malo = [];
        if (tw > LIM.humeroDentro + 2) malo.push(`húmero ${tw.toFixed(0)}° hacia dentro`);
        if (-tw > LIM.humeroFuera + 2) malo.push(`húmero ${(-tw).toFixed(0)}° hacia fuera`);
        if (flex > LIM.codoMax + 2) malo.push(`codo ${flex.toFixed(0)}°`);
        if (lado < -0.2) { malo.push(`codo doblado hacia atrás (${lado.toFixed(2)})`); max.atras++; }
        if (malo.length) fallos.push(`${c.name} f${i} ${s === 'Left' ? 'izq' : 'der'}: ${malo.join(', ')}`);
      }
    }
  }
  const resumen = (arr) => { const m = new Map(); for (const x of arr) { const k = x.replace(/ f\d+ /, ' '); m.set(k.split(':')[0], (m.get(k.split(':')[0]) || 0) + 1); } return [...m].map(([k, v]) => `${k} (${v} fotogramas)`); };
  console.log(`\n${f.split('/').pop()}: ${clips.length} movimientos · húmero hasta ${max.dentro.toFixed(0)}° dentro y ${max.fuera.toFixed(0)}° fuera · codo hasta ${max.codo.toFixed(0)}° · ${max.atras} fotogramas con el codo al revés · polos corregidos ${_anatomia.corregidos}/${_anatomia.brazos} · sin solución ${_anatomia.sinSolucion} (${_anatomia.restoPeor.toFixed(1)}°)`);
  if (process.env.DETALLE) console.log(fallos.slice(0, 40).join("\n"));
  console.log(fallos.length ? `  FALLOS: ${fallos.length}\n  ` + resumen(fallos).slice(0, 30).join('\n  ') : '  sin fallos');
}
