// La gente de los oficios en los minijuegos 3D: un vecino KayKit (el mismo estilo que los del pueblo) con su ropa de
// trabajo, al que se le coloca el cuerpo cada fotograma: se agacha y se inclina, las manos van a la herramienta
// (cinemática inversa de dos huesos con el codo hacia fuera) y los pies se quedan plantados donde están.
import * as THREE from 'three';
import { buildNpc, preloadNpcs } from '../../actors/npcGlb.js';

const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3(), vE = new THREE.Vector3(), vT = new THREE.Vector3(), vP = new THREE.Vector3(), vD = new THREE.Vector3();
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qc = new THREE.Quaternion();

/** Gira un hueso (en el espacio del mundo) para que la dirección «from» pase a ser «to». */
function aim(bone, from, to) {
  if (from.lengthSq() < 1e-10 || to.lengthSq() < 1e-10) return;
  qa.setFromUnitVectors(from.normalize(), to.normalize());
  bone.getWorldQuaternion(qb); qb.premultiply(qa);
  bone.parent.getWorldQuaternion(qc); bone.quaternion.copy(qc.invert().multiply(qb));
  bone.updateMatrixWorld(true);
}
/** Gira un hueso alrededor de un eje del mundo. */
function spin(bone, axis, ang) {
  if (!ang) return;
  qa.setFromAxisAngle(axis, ang); bone.getWorldQuaternion(qb); qb.premultiply(qa);
  bone.parent.getWorldQuaternion(qc); bone.quaternion.copy(qc.invert().multiply(qb));
  bone.updateMatrixWorld(true);
}
/** Dos huesos (brazo y antebrazo, muslo y pierna) hasta que el extremo llegue a «target»; «pole» marca hacia dónde va el codo. */
function ik2(up, lo, end, target, pole) {
  up.getWorldPosition(vA); lo.getWorldPosition(vB); end.getWorldPosition(vC);
  const a = vA.distanceTo(vB), b = vB.distanceTo(vC);
  vD.subVectors(target, vA); let d = vD.length(); if (d < 1e-5) return;
  vD.divideScalar(d); d = THREE.MathUtils.clamp(d, Math.abs(a - b) + 1e-4, (a + b) * 0.999);
  vP.subVectors(pole, vA); vP.addScaledVector(vD, -vP.dot(vD)); if (vP.lengthSq() < 1e-8) vP.set(0, -1, 0).addScaledVector(vD, vD.y); vP.normalize();
  const x = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x * x));
  vE.copy(vA).addScaledVector(vD, x).addScaledVector(vP, h);
  aim(up, vB.sub(vA), vT.subVectors(vE, vA));
  lo.getWorldPosition(vB); end.getWorldPosition(vC);
  vT.copy(vA).addScaledVector(vD, d);
  aim(lo, vC.sub(vB), vT.sub(vB));
}

/**
 * Crea un trabajador. look: el aspecto del vecino (camisa, faja, pañuelo…). Devuelve null si no hay personajes.
 * W.pose({ crouch, bend, lean, twist, nod, hands: [l, r], elbows: [l, r], grip: [l, r] }) cada fotograma:
 *   crouch: metros que baja la cadera (las rodillas se doblan y los pies no se mueven); bend: inclinación hacia delante
 *   (radianes, repartida entre la espalda y el pecho); lean: hacia un lado; twist: giro del pecho; nod: cabeza abajo;
 *   hands: puntos del mundo para cada mano (null: el brazo se queda como esté); elbows: hacia dónde salen los codos;
 *   grip: hacia dónde apunta cada mano (dirección del mundo, para agarrar los mangos).
 */
export async function worker(S, look = {}, { height = 1.72, clip = 'Idle', at = 0 } = {}) {
  await preloadNpcs();
  const npc = buildNpc({ height, ...look });
  if (!npc) return null;
  const { obj, char } = npc;
  obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  S.add(obj); S.own({ dispose: () => char.dispose?.() });   // su mezclador de animaciones se suelta al acabar
  const act = char.actions[clip] || char.actions.Idle;
  for (const a of Object.values(char.actions)) if (a !== act) a.stop();
  act.reset().play(); act.paused = true; act.setEffectiveWeight(1);
  const B = {}; obj.traverse(o => { if (o.isBone) B[o.name.replace(/\./g, '')] = o; });
  // el extremo del brazo es el hueco de la mano donde se agarran las cosas (la mano queda como en la pose de base)
  const arms = ['l', 'r'].map(s => ({ up: B['upperarm' + s], lo: B['lowerarm' + s], end: B['handslot' + s] || B['wrist' + s], wrist: B['wrist' + s], hand: B['hand' + s] }));
  const legs = ['l', 'r'].map(s => ({ up: B['upperleg' + s], lo: B['lowerleg' + s], end: B['foot' + s] }));
  // pose de base cada fotograma: primero la de reposo de todos los huesos (los que el clip no mueve no acumulan giros)
  // y encima el instante elegido del clip
  const bones = Object.values(B), q0 = bones.map(b => b.quaternion.clone()), p0 = bones.map(b => b.position.clone());
  const rest = () => { bones.forEach((b, i) => { b.quaternion.copy(q0[i]); b.position.copy(p0[i]); }); act.time = at; char.mixer.update(0); obj.updateMatrixWorld(true); };
  // dónde quedan los pies con la pose de base (se plantan ahí)
  const feet = () => legs.map(L => L.end.getWorldPosition(new THREE.Vector3()));
  const X = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(), knee = new THREE.Vector3(), elb = new THREE.Vector3(), tmp = new THREE.Vector3();
  const W = {
    obj, char, B, arms, legs, planted: null,
    /** Fija los pies donde están ahora (o en los puntos dados). */
    plant(pts) { rest(); this.planted = pts || feet(); return this.planted; },
    pose({ crouch = 0, bend = 0, lean = 0, twist = 0, nod = 0, hands = null, elbows = null, grip = null, spread = 0 } = {}) {
      rest();
      // ejes del personaje en el mundo (mira hacia +Z de su grupo)
      obj.getWorldQuaternion(qa); X.set(1, 0, 0).applyQuaternion(qa); Z.set(0, 0, 1).applyQuaternion(qa);
      if (!this.planted) this.planted = feet();
      if (B.hips && crouch) { B.hips.getWorldPosition(tmp); tmp.y -= crouch; B.hips.position.copy(B.hips.parent.worldToLocal(tmp)); B.hips.updateMatrixWorld(true); }
      if (spread) legs.forEach((L, i) => spin(L.up, Z, (i ? -1 : 1) * spread));
      // piernas: los pies vuelven a su sitio con las rodillas hacia delante
      legs.forEach((L, i) => { if (!L.up) return; L.up.getWorldPosition(knee).addScaledVector(Z, 0.6).addScaledVector(X, (i ? -1 : 1) * 0.1); ik2(L.up, L.lo, L.end, this.planted[i], knee); });
      if (B.spine) spin(B.spine, X, bend * 0.55);
      if (B.chest) { spin(B.chest, X, bend * 0.45); spin(B.chest, Z, -lean); spin(B.chest, Y, twist); }
      if (B.head && nod) spin(B.head, X, nod);
      if (hands) arms.forEach((A, i) => {
        const T = hands[i]; if (!T || !A.up) return;
        // el codo, hacia fuera y algo hacia atrás y abajo si no se dice otra cosa
        if (elbows?.[i]) elb.copy(elbows[i]); else A.up.getWorldPosition(elb).addScaledVector(X, (i ? -1 : 1) * 0.5).addScaledVector(Y, -0.4).addScaledVector(Z, -0.2);
        ik2(A.up, A.lo, A.end, T, elb);
        if (grip?.[i] && A.wrist) { A.end.getWorldPosition(tmp); A.wrist.getWorldPosition(vC); aim(A.wrist, tmp.sub(vC), vT.copy(grip[i])); }
      });
    },
    /** Punto del mundo de una mano (para colgar o comprobar herramientas). */
    handAt(i, out = new THREE.Vector3()) { return arms[i].end.getWorldPosition(out); },
  };
  rest();
  return W;
}
export { ik2, aim, spin };
