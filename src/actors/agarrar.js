// Coger cualquier cosa con la mano, como coge la pala el pelotari (el autor, 16 de noviembre de 2026: «aplica el agarre a
// todo el juego, a todos los personajes que agarren una herramienta o cualquier cosa»). El objeto va en el puño, con el
// mango por el hueco de la mano cerrada y los dedos cerrados encima (dedos.js): casi recto, como un martillo, lo que se
// lleva de pie o colgando (la postura baston) y en diagonal, como la pala, lo demás (la postura mango).
// Lo que se lleva de pie (un bastón, la horca, la rama, la escoba, la espada, el isipu) se lleva como de verdad: el codo
// doblado, el antebrazo hacia delante y la muñeca girada para que quede derecho; un cesto, colgando del brazo caído con
// el asa cruzando el puño. Un bastón, además, apoyado en el suelo. Solo los personajes con dedos (los de Meshy): a los
// demás se les deja como estaban.
import * as THREE from 'three';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Vector3(), _f = new THREE.Vector3();
const _q = new THREE.Quaternion(), _p = new THREE.Quaternion(), ARRIBA = new THREE.Vector3(0, 1, 0);
const hueso = (ch, s) => Object.values(ch.bones || {}).find(b => new RegExp(s + '$').test(b.name)) || null;
// (gira un hueso en el mundo: q delante de su giro de ahora)
const _g1 = new THREE.Quaternion(), _g2 = new THREE.Quaternion(), _g3 = new THREE.Quaternion();
const giraMundo = (b, q) => { b.getWorldQuaternion(_g1); b.parent.getWorldQuaternion(_g2); b.quaternion.copy(_g2.invert().multiply(_g3.copy(q).multiply(_g1))); b.updateMatrixWorld(true); };

/** Pone obj en el puño de un lado ('R' o 'L') de un personaje (su GlbChar). obj está hecho de pie: el sitio de la mano en
 *  su origen y el mango a lo largo de su Y (lo de arriba sale por el lado del pulgar). opts:
 *  - modo: 'erguido' (de pie, con el codo doblado), 'colgando' (un cesto: el asa a lo largo de su X y el cesto colgando
 *    del brazo caído) o 'suelto' (solo en el puño; el brazo, como lo ponga su animación o quien lo llama)
 *  - escala: lo que mide en el mundo una unidad del objeto (1: está en metros)
 *  - desde: a qué altura de su Y va la mano, en unidades del objeto (0: en el origen)
 *  - pie: con 'erguido', la Y de su punta de abajo, en unidades del objeto, para apoyarla en el suelo (un bastón; null:
 *    no se apoya). Se desliza por el puño lo justo, hasta un cuarto de su largo, que se da en largo
 *  Devuelve true si lo ha cogido; false si el personaje no tiene dedos (quien llama lo pone como antes). */
export function agarrar(ch, lado, obj, { modo = 'erguido', escala = 1, desde = 0, pie = null, largo = 0 } = {}) {
  const D = ch?.dedos?.D?.[lado], recto = modo !== 'suelto' && !!D?.agarreBaston, G = recto ? D.agarreBaston : D?.agarre, h = G && hueso(ch, (lado === 'L' ? 'Left' : 'Right') + 'Hand');
  if (!G || !h) return false;
  ch.root.updateMatrixWorld(true);
  const ws = h.getWorldScale(_a).x || 1, k = escala / ws;
  const Y = new THREE.Vector3().fromArray(G.eje), N = new THREE.Vector3().fromArray(G.n);
  let X, Z;
  if (modo === 'colgando') {   // (el asa, a lo largo del eje del puño; el cesto, hacia la muñeca de abajo: colgando)
    X = Y.clone(); const sube = new THREE.Vector3().fromArray(G.d).negate(); sube.addScaledVector(X, -sube.dot(X)).normalize(); Y.copy(sube); Z = new THREE.Vector3().crossVectors(X, Y);
  } else { Z = N.clone().addScaledVector(Y, -N.dot(Y)).normalize(); X = new THREE.Vector3().crossVectors(Y, Z); }
  obj.removeFromParent(); h.add(obj);
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
  obj.scale.setScalar(k);
  obj.position.fromArray(G.centro).addScaledVector(Y, -desde * k);
  obj.traverse(o => { if (o.isMesh) o.castShadow = o.userData.sombra ?? true; });
  ch.mano(lado, recto ? 'baston' : 'mango');
  if (modo === 'erguido') brazoErguido(ch, lado, new THREE.Vector3().fromArray(G.eje), pie == null ? null : { obj, pie, base: obj.position.clone(), max: 0.25 * largo * k });
  return true;
}

// (el brazo de quien lleva algo de pie: cada imagen, encima de su animación, el antebrazo hacia delante, algo abajo y
// hacia fuera; luego la muñeca gira lo justo para que lo que lleva quede derecho, hasta 40°. Con el agarre recto se
// queda casi derecho del todo. Un bastón (apoyo) baja o sube por el puño hasta tocar el suelo)
function brazoErguido(ch, lado, ejeMano, apoyo = null) {
  const S = lado === 'L' ? 'Left' : 'Right', brazo = hueso(ch, S + 'Arm'), ante = hueso(ch, S + 'ForeArm'), mano = hueso(ch, S + 'Hand'), pecho = hueso(ch, 'Spine2') || hueso(ch, 'Spine1') || hueso(ch, 'Spine');
  if (!brazo || !ante || !mano || !pecho || ch.userData?.brazoErguido?.[lado]) return;
  (ch.userData ||= {}).brazoErguido = { ...(ch.userData.brazoErguido || {}), [lado]: true };
  const prev = ch.post;
  ch.post = (c, dt) => {
    prev?.(c, dt);
    c.root.updateMatrixWorld(true);
    // (hacia delante: a donde mira el personaje, +Z en Mixamo; hacia fuera: del pecho al hombro)
    c.root.getWorldQuaternion(_q); const del = _a.set(0, 0, 1).applyQuaternion(_q); del.y = 0; del.normalize();
    const fuera = _b.copy(brazo.getWorldPosition(_c)).sub(pecho.getWorldPosition(_d)); fuera.y = 0; fuera.normalize();
    const meta = _e.copy(del).multiplyScalar(0.85).addScaledVector(fuera, 0.3).add(_f.set(0, -0.22, 0)).normalize();
    const va = ante.getWorldPosition(_c), vm = mano.getWorldPosition(_d), ahora = vm.sub(va).normalize();
    giraMundo(ante, _p.setFromUnitVectors(ahora, meta));
    // (la muñeca: primero girada sobre el antebrazo y luego doblada, para que el mango quede de pie)
    const e = _c.copy(ejeMano).transformDirection(mano.matrixWorld), eP = e.addScaledVector(meta, -e.dot(meta)), uP = _d.copy(ARRIBA).addScaledVector(meta, -ARRIBA.dot(meta));
    if (eP.lengthSq() > 1e-8 && uP.lengthSq() > 1e-8) { eP.normalize(); uP.normalize(); const ang = Math.atan2(_f.crossVectors(eP, uP).dot(meta), eP.dot(uP)); giraMundo(mano, _q.setFromAxisAngle(meta, ang)); }
    const e2 = _c.copy(ejeMano).transformDirection(mano.matrixWorld), eje = _f.crossVectors(e2, ARRIBA), s = eje.length();
    if (s > 1e-4) giraMundo(mano, _q.setFromAxisAngle(eje.divideScalar(s), Math.min(Math.asin(Math.min(1, s)), 40 * Math.PI / 180) * (e2.dot(ARRIBA) < 0 ? -1 : 1)));
    // (el bastón, con su punta en el suelo: los pies del personaje, el origen de su raíz)
    if (apoyo) {
      const { obj, pie, base, max } = apoyo; obj.position.copy(base); obj.updateMatrixWorld(true);
      const p = obj.localToWorld(_c.set(0, pie, 0)), y = _d.set(0, 1, 0).transformDirection(obj.matrixWorld), suelo = c.root.getWorldPosition(_f).y;
      if (y.y > 0.3) {
        const sube = (p.y - suelo) / y.y, w = obj.parent.getWorldScale(_a).x || 1;   // (lo que baja, en el mundo y en la mano)
        const ax = _b.set(0, 1, 0).applyQuaternion(obj.quaternion), t = Math.max(-max, Math.min(max, sube / w));
        obj.position.addScaledVector(ax, -t); obj.updateMatrixWorld(true);
      }
    }
  };
}
