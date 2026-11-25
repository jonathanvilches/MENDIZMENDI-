// Que las manos no atraviesen la cabeza en ningún gesto (el autor, 25 de noviembre de 2026: «en algunos pelotaris, cuando
// fallan o celebran, siguen pasándose las manos como por detrás de la cabeza o traspasando la cabeza. Y esto queda
// fatal»). El arreglo del 20 de noviembre (actors/pelotaMoves.js, enCabeza) aparta los brazos de la cabeza al preparar
// los golpes, pero las celebraciones, el lamento y el baile son clips aparte que no pasan por ahí. Aquí, en cada fotograma
// y encima de la animación: el mismo volumen de la cabeza con el pelo (un mapa de hasta dónde llega en 24 × 48
// direcciones, medido una vez en la propia figura) y, si el codo, el antebrazo, la muñeca o la mano se meten en él, la
// mano sale hacia la superficie más cercana y el brazo se vuelve a colocar con sus dos huesos, doblándose hacia el mismo
// lado, hasta que nada entra. Con las dos manos por debajo de los hombros no hace nada (casi siempre: no cuesta).
const EL = 24, AZ = 48;

function huesos(obj) {
  const u = obj.userData; if (u.huesosCab !== undefined) return u.huesosCab;
  const B = {}, want = ['Head', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand'];
  obj.traverse(o => { if (!o.isBone) return; for (const k of want) if (!B[k] && new RegExp('(^|[^A-Za-z]|mixamorig)' + k + '$').test(o.name)) B[k] = o; });
  return (u.huesosCab = want.every(k => B[k]) ? B : null);
}

// (el volumen de la cabeza en los ejes de su hueso: los vértices que mueve la cabeza, el pelo incluido)
function volumen(T, obj, head) {
  const u = obj.userData; if (u.cabRT !== undefined) return u.cabRT;
  let cab = null;
  try {
    obj.updateMatrixWorld(true);
    const hInv = new T.Matrix4().copy(head.matrixWorld).invert(), pts = [], v = new T.Vector3(), w4 = new T.Vector4(), j4 = new T.Vector4();
    obj.traverse(o => {
      if (!o.isSkinnedMesh || !o.skeleton) return;
      const deCab = o.skeleton.bones.map(b => { for (let p = b; p; p = p.parent) if (p === head) return true; return false; });
      if (!deCab.some(Boolean)) return;
      const pos = o.geometry.attributes.position, si = o.geometry.attributes.skinIndex, sw = o.geometry.attributes.skinWeight; if (!si || !sw) return;
      for (let i = 0; i < pos.count; i++) {
        j4.fromBufferAttribute(si, i); w4.fromBufferAttribute(sw, i);
        let wc = 0; for (let c = 0; c < 4; c++) if (deCab[j4.getComponent(c)]) wc += w4.getComponent(c);
        if (wc < 0.6) continue;
        v.fromBufferAttribute(pos, i); o.applyBoneTransform(i, v); v.applyMatrix4(o.matrixWorld).applyMatrix4(hInv); pts.push(v.x, v.y, v.z);
      }
    });
    const n = pts.length / 3;
    if (n > 50) {
      const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
      for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) { lo[j] = Math.min(lo[j], pts[i * 3 + j]); hi[j] = Math.max(hi[j], pts[i * 3 + j]); }
      const c = new T.Vector3((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2), R = new Float32Array(EL * AZ);
      for (let i = 0; i < n; i++) {
        const x = pts[i * 3] - c.x, y = pts[i * 3 + 1] - c.y, z = pts[i * 3 + 2] - c.z, d = Math.hypot(x, y, z); if (d < 1e-6) continue;
        const e = Math.min(EL - 1, Math.floor((Math.asin(Math.max(-1, Math.min(1, y / d))) / Math.PI + 0.5) * EL)), az = Math.floor(((Math.atan2(z, x) / (2 * Math.PI)) + 1) % 1 * AZ) % AZ;
        if (d > R[e * AZ + az]) R[e * AZ + az] = d;
      }
      // (las casillas sin vértices, con lo de sus vecinas: sin huecos por los que se cuele la mano)
      for (let pass = 0; pass < 2; pass++) for (let e = 0; e < EL; e++) for (let a = 0; a < AZ; a++) if (!R[e * AZ + a]) {
        let m = 0; for (const [de, da] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const ee = e + de; if (ee < 0 || ee >= EL) continue; m = Math.max(m, R[ee * AZ + (a + da + AZ) % AZ]); } R[e * AZ + a] = m;
      }
      const sc = new T.Vector3(); head.matrixWorld.decompose(new T.Vector3(), new T.Quaternion(), sc);
      cab = { c, R, esc: (sc.x + sc.y + sc.z) / 3 };
    }
  } catch (e) { cab = null; }
  return (u.cabRT = cab);
}
function radio(cab, x, y, z, d) {
  const fe = (Math.asin(Math.max(-1, Math.min(1, y / d))) / Math.PI + 0.5) * EL - 0.5, fa = ((Math.atan2(z, x) / (2 * Math.PI)) + 1) % 1 * AZ - 0.5;
  const e0 = Math.max(0, Math.min(EL - 1, Math.floor(fe))), e1 = Math.min(EL - 1, e0 + 1), te = Math.max(0, Math.min(1, fe - e0));
  const a0 = ((Math.floor(fa) % AZ) + AZ) % AZ, a1 = (a0 + 1) % AZ, ta = fa - Math.floor(fa), R = cab.R;
  const r00 = R[e0 * AZ + a0], r01 = R[e0 * AZ + a1], r10 = R[e1 * AZ + a0], r11 = R[e1 * AZ + a1];
  return Math.max((r00 * (1 - ta) + r01 * ta) * (1 - te) + (r10 * (1 - ta) + r11 * ta) * te, 0.85 * Math.max(r00, r01, r10, r11));
}
// (cuánto se mete un punto en la cabeza, menos de 1: dentro; y el punto de la superficie hacia el que salir)
function dentro(T, cab, hm, hmInv, p, margen, sale, tmp) {
  tmp.copy(p).applyMatrix4(hmInv).sub(cab.c);
  const d = tmp.length(); if (d < 1e-6) return 1;
  const r = radio(cab, tmp.x, tmp.y, tmp.z, d); if (r <= 0) return 1;
  const lim = r + margen / cab.esc, k = d / lim;
  if (k < 1) sale.copy(tmp).multiplyScalar(lim / d).add(cab.c).applyMatrix4(hm);
  return k;
}
function apunta(T, b, c, dir, S) {
  const pa = b.getWorldPosition(S.a), pc = c.getWorldPosition(S.b), d = pc.sub(pa); if (d.lengthSq() < 1e-10) return; d.normalize();
  const q = S.q.setFromUnitVectors(d, dir), wq = b.getWorldQuaternion(S.q2).premultiply(q), pq = b.parent.getWorldQuaternion(S.q3).invert();
  b.quaternion.copy(pq.multiply(wq)); b.updateMatrixWorld(true);
}

/** Aparta de la cabeza los brazos de la figura obj (después de su animación). Devuelve cuántos brazos ha movido. */
export function sinCabeza(T, obj) {
  const B = huesos(obj); if (!B) return 0;
  const S = obj.userData.sinCabS ||= { a: new T.Vector3(), b: new T.Vector3(), q: new T.Quaternion(), q2: new T.Quaternion(), q3: new T.Quaternion(), sh: new T.Vector3(), e: new T.Vector3(), w: new T.Vector3(), t: new T.Vector3(), lo: new T.Vector3(), sale: new T.Vector3(), tmp: new T.Vector3(), q4: new T.Vector3(), hm: new T.Matrix4(), hmInv: new T.Matrix4(), dl: new T.Vector3(), pole: new T.Vector3(), dir: new T.Vector3(), el: new T.Vector3() };
  obj.updateMatrixWorld(true);
  // (con las dos manos por debajo de los hombros, nada que hacer)
  const yA = Math.min(B.LeftArm.getWorldPosition(S.a).y, B.RightArm.getWorldPosition(S.b).y);
  if (B.LeftHand.getWorldPosition(S.a).y < yA - 0.05 && B.RightHand.getWorldPosition(S.b).y < yA - 0.05) return 0;
  const cab = volumen(T, obj, B.Head); if (!cab) return 0;
  const hm = S.hm.copy(B.Head.matrixWorld), hmInv = S.hmInv.copy(hm).invert();
  let movidos = 0;
  for (const [A, F, H] of [[B.LeftArm, B.LeftForeArm, B.LeftHand], [B.RightArm, B.RightForeArm, B.RightHand]]) {
    let movido = false;
    for (let it = 0; it < 8; it++) {
      const Sh = A.getWorldPosition(S.sh), E = F.getWorldPosition(S.e), W = H.getWorldPosition(S.w), lo = S.lo.subVectors(W, E).normalize();
      const L2 = E.distanceTo(W), kM = L2 / 0.26;   // (el grosor y el largo de la mano, a la talla de su antebrazo)
      const pts = [[S.q4.copy(Sh).lerp(E, 0.7), 0.045], [E.clone(), 0.045], [E.clone().lerp(W, 0.5), 0.04], [W.clone(), 0.04], [W.clone().addScaledVector(lo, 0.05 * kM), 0.04], [W.clone().addScaledVector(lo, 0.1 * kM), 0.03]];
      let peor = 1, dl = null;
      for (const [q, mg] of pts) { const kk = dentro(T, cab, hm, hmInv, q, mg * kM, S.sale, S.tmp); if (kk < peor) { peor = kk; dl = S.dl.subVectors(S.sale, q); } }
      if (!dl) break;
      movido = true;
      // (la muñeca, hacia fuera lo que se metía lo más metido; el brazo, con sus dos huesos, doblado hacia el mismo lado)
      const Tg = S.t.copy(W).addScaledVector(dl, 1.15), L1 = Sh.distanceTo(E);
      const dir = S.dir.subVectors(Tg, Sh); let d = dir.length(); if (d < 1e-5) break; dir.divideScalar(d);
      d = Math.max(Math.abs(L1 - L2) + 1e-3, Math.min(L1 + L2 - 1e-3, d));
      const pole = S.pole.subVectors(E, Sh); pole.addScaledVector(dir, -pole.dot(dir)); if (pole.lengthSq() < 1e-8) pole.set(0, -1, 0).addScaledVector(dir, -dir.y); pole.normalize();
      const cosA = Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))), sinA = Math.sqrt(1 - cosA * cosA);
      const el = S.el.copy(Sh).addScaledVector(dir, L1 * cosA).addScaledVector(pole, L1 * sinA);
      apunta(T, A, F, S.a.subVectors(el, Sh).normalize().clone(), S);
      const E2 = F.getWorldPosition(S.e), fin = Tg.clone().copy(Sh).addScaledVector(dir, d);
      apunta(T, F, H, fin.sub(E2).normalize(), S);
    }
    if (movido) movidos++;
  }
  return movidos;
}
