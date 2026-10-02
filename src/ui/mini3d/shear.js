// Esquilar a mano, en 3D: la oveja latxa en la tabla de esquilar, junto a la borda; se arrastran las tijeras de
// muelle por el vellón y la lana se corta de verdad (se hunde y asoma la piel rapada) y cae al suelo en mechones.
// La cabeza no se toca: la oveja se asusta. Se gana al quitar casi todo el vellón.
import * as THREE from 'three';
import { ensureAnimal, buildAnimal, woolMaterial, MAXCUT } from '../../actors/animalGlb.js';
import { play3d, blip } from './play.js';
import { faceAlong } from './milk.js';
import { outdoors, texMat, uvScale, rbox, lumpy, particles } from './kit.js';

// tijeras de esquilar de muelle: dos hojas de acero en sus brazos, unidas atrás por un muelle en U
function shears(S) {
  const g = new THREE.Group(), steel = S.mat('#d4d8dc', { metalness: 0.9, roughness: 0.25 }), dark = S.mat('#5a5f66', { metalness: 0.7, roughness: 0.4 });
  const blade = new THREE.Shape(); blade.moveTo(0, -0.012); blade.lineTo(0.15, -0.002); blade.quadraticCurveTo(0.16, 0, 0.15, 0.003); blade.lineTo(0, 0.013); blade.closePath();
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); g.add(arm); arms.push(arm);
    const b = S.mesh(new THREE.ExtrudeGeometry(blade, { depth: 0.003, bevelEnabled: true, bevelSize: 0.0012, bevelThickness: 0.001, bevelSegments: 2, curveSegments: 8 }), steel, 0.02, 0, s * 0.006, arm);
    b.rotation.x = Math.PI / 2;
    const h = S.mesh(rbox(0.11, 0.022, 0.012, 0.005), dark, -0.05, 0, s * 0.012, arm); h.rotation.y = -s * 0.08;
  }
  const spring = S.mesh(new THREE.TorusGeometry(0.02, 0.0045, 8, 20, Math.PI), dark, -0.105, 0, 0, g); spring.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  return { g, open(k) { arms[0].rotation.y = 0.16 * k; arms[1].rotation.y = -0.16 * k; } };
}

export function shearGame(ui, { title = 'Esquilar a mano', icon = 'wool', seconds = 26 } = {}) {
  return play3d(ui, { title, icon, hint: 'Arrastra las tijeras por el vellón: la lana sale entera, como un abrigo. No acerques las tijeras a la cabeza.',
    stage: { bg: '#a8c8e8', hemi: ['#f4f8ff', '#6a7a4a', 1.1], sun: { color: '#fff4dc', intensity: 2.4, pos: [3, 6, 4], extent: 2 } } }, async (S, H, end, isOver) => {
    await ensureAnimal('sheep');
    outdoors(S, { ground: 'soil', groundColor: '#9a8a6a', hills: '#6f8f4f' });
    // la tabla de esquilar (tablones) y la valla de la borda detrás
    for (let i = 0; i < 7; i++) S.mesh(uvScale(rbox(2.6, 0.06, 0.28, 0.015), 1.3, 0.2), texMat(S, 'wood', ['#b89a72', '#a8885e', '#c0a27a'][i % 3]), 0, 0.03, -0.9 + i * 0.3);
    for (const x of [-1.6, 0, 1.6]) S.mesh(rbox(0.12, 1.1, 0.12, 0.02), texMat(S, 'wood', '#7a5c3c'), x, 0.55, -1.4);
    for (const y of [0.45, 0.85]) S.mesh(uvScale(rbox(3.4, 0.1, 0.05, 0.015), 2, 0.1), texMat(S, 'wood', '#8a6a48'), 0, y, -1.38);
    S.mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.7, 20), texMat(S, 'braid', '#d8c8a0'), -1.25, 0.35, -0.6);   // saco de lana
    const A = buildAnimal('sheep'); if (!A) throw new Error('sin oveja');
    S.add(A.root);
    const { fwd, side } = faceAlong(A, [-1, 0, 0]);
    A.play('Idle', 0);
    // su malla: copia de la geometría (con «shorn», por vértice) y el material de lana con los cortes
    let body = null; A.root.traverse(o => { if (o.isSkinnedMesh) body = body || o; });
    const geo = body.geometry = S.own(body.geometry.clone()), P = geo.attributes.position, WO = geo.attributes.wool;
    const shornA = new THREE.BufferAttribute(new Float32Array(P.count), 1); geo.setAttribute('shorn', shornA);
    // normales suavizadas (la malla tiene aristas vivas con vértices repetidos): al hundirse la lana, la piel no se rasga
    { const N = geo.attributes.normal, acc = new Map(), key = (i) => `${P.getX(i).toFixed(4)},${P.getY(i).toFixed(4)},${P.getZ(i).toFixed(4)}`, sn = new Float32Array(P.count * 3);
      for (let i = 0; i < P.count; i++) { const k = key(i), a = acc.get(k) || [0, 0, 0]; a[0] += N.getX(i); a[1] += N.getY(i); a[2] += N.getZ(i); acc.set(k, a); }
      for (let i = 0; i < P.count; i++) { const a = acc.get(key(i)), l = Math.hypot(...a) || 1; sn[i * 3] = a[0] / l; sn[i * 3 + 1] = a[1] / l; sn[i * 3 + 2] = a[2] / l; }
      geo.setAttribute('smoothN', new THREE.BufferAttribute(sn, 3)); }
    const cuts = Array.from({ length: MAXCUT }, () => new THREE.Vector4(0, 0, 0, 0));
    geo.computeBoundingBox(); const size = geo.boundingBox.getSize(new THREE.Vector3()).length();
    const uniforms = { uCut: { value: cuts }, uNCut: { value: 0 }, uThick: { value: size * 0.03 }, uSkin: { value: new THREE.Color('#e3ab98') } };
    body.material = S.own(woolMaterial(geo, { uniforms }));
    const R = size * 0.075;
    // la cabeza: los vértices que mueve el hueso de la cabeza (o el último del cuello) no se cortan
    const bones = body.skeleton.bones, headIdx = new Set(bones.map((b, i) => (/Head|Ear|Neck3/.test(b.name) ? i : -1)).filter(i => i >= 0));
    const SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight;
    const isHead = (i) => { let w = 0; for (let k = 0; k < 4; k++) if (headIdx.has(SI.getComponent(i, k))) w += SW.getComponent(i, k); return w > 0.45; };
    // muestras del vellón para medir lo que queda (sin la cabeza)
    let samples = []; for (let i = 0; i < P.count; i++) if (WO.getX(i) > 0.5 && !isHead(i)) samples.push({ i, p: new THREE.Vector3().fromBufferAttribute(P, i), cut: false });
    let total = samples.length;
    let nCut = 0, done = 0, warn = 0, react = 0, t = 0;
    const v = new THREE.Vector3();
    const cv = new THREE.Vector3(), bake = (c) => { cv.set(c.x, c.y, c.z); for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); const d = v.distanceTo(cv), k = 1 - THREE.MathUtils.smoothstep(d, c.w * 0.62, c.w); if (k > shornA.getX(i)) shornA.setX(i, k); } shornA.needsUpdate = true; };
    const addCut = (bp) => {
      // si cae encima de uno reciente, no hace falta otro; si la lista está llena, el más antiguo se queda grabado en la malla
      for (let k = 0; k < nCut; k++) if (v.set(cuts[k].x, cuts[k].y, cuts[k].z).distanceTo(bp) < R * 0.35) return 0;
      if (nCut >= MAXCUT) { bake(cuts[0]); cuts.push(cuts.shift()); nCut--; }
      cuts[nCut].set(bp.x, bp.y, bp.z, R); nCut++; uniforms.uNCut.value = nCut;
      let n = 0; for (const s of samples) if (!s.cut && s.p.distanceTo(bp) < R * 0.8) { s.cut = true; n++; }
      done += n; return n;
    };
    // mechones que caen al suelo y se quedan
    // mechones: rizos aplastados e irregulares (no bolas) que caen y se quedan en la tabla
    const fleece = particles(S, { geo: lumpy(lumpy(new THREE.IcosahedronGeometry(0.04, 3), 0.3, 120, 3), 0.18, 300, 8).scale(1.4, 0.55, 1), color: '#eadfc6', max: 160, gravity: -7, drag: 0.6, ground: 0.065, spinRate: 1.5 });
    const T = shears(S); S.add(T.g); T.g.visible = false; T.g.scale.setScalar(1.7);
    const sheepC = new THREE.Box3().setFromObject(A.root).getCenter(new THREE.Vector3());
    S.frame([sheepC.x, sheepC.y * 0.85, sheepC.z], 0.68, [side.x - fwd.x * 0.25, 0.55, side.z - fwd.z * 0.25], 38);
    // solo cuenta la lana del costado que se ve (el otro no se puede esquilar desde aquí): la normal de cada muestra,
    // girada como la gira el hueso que más pesa en ella, tiene que mirar hacia la cámara
    { A.root.updateMatrixWorld(true); const SN = geo.attributes.smoothN, wp = new THREE.Vector3(), wn = new THREE.Vector3(), tc = new THREE.Vector3(), M = new THREE.Matrix4(), nm = new THREE.Matrix3();
      samples = samples.filter(sm => {
        let bi = 0, bw = -1; for (let k = 0; k < 4; k++) { const wt = SW.getComponent(sm.i, k); if (wt > bw) { bw = wt; bi = SI.getComponent(sm.i, k); } }
        M.multiplyMatrices(body.matrixWorld, body.bindMatrixInverse).multiply(bones[bi].matrixWorld).multiply(body.skeleton.boneInverses[bi]).multiply(body.bindMatrix);
        wn.fromBufferAttribute(SN, sm.i).applyMatrix3(nm.getNormalMatrix(M)).normalize();
        body.getVertexPosition(sm.i, wp); wp.applyMatrix4(body.matrixWorld);
        return wn.dot(tc.subVectors(S.camera.position, wp).normalize()) > 0.3;   // (sin los cantos, que casi no se ven)
      });
      total = Math.max(1, samples.length); }
    // de la pantalla al vellón: rayo contra la oveja; el punto en el espacio del modelo (para el sombreador)
    const hitAt = (e) => {
      const h = S.pick(e, [body], false)[0]; if (!h) return null;
      const f = h.face, bc = h.barycoord;
      const a = new THREE.Vector3().fromBufferAttribute(P, f.a), b = new THREE.Vector3().fromBufferAttribute(P, f.b), c = new THREE.Vector3().fromBufferAttribute(P, f.c);
      const bp = bc ? a.multiplyScalar(bc.x).add(b.multiplyScalar(bc.y)).add(c.multiplyScalar(bc.z)) : a.add(b).add(c).multiplyScalar(1 / 3);
      return { bp, point: h.point, normal: h.face.normal.clone().transformDirection(body.matrixWorld), head: isHead(f.a) || isHead(f.b) || isHead(f.c), wool: WO.getX(f.a) > 0.5 };
    };
    let down = false, lastBP = null, snip = 0;
    const shear = (e) => {
      if (isOver()) return;
      const h = hitAt(e); if (!h) { lastBP = null; return; }
      T.g.visible = true; T.g.position.copy(h.point).addScaledVector(h.normal, 0.03); T.g.lookAt(h.point.clone().addScaledVector(h.normal, 1)); T.g.rotateX(Math.PI / 2);
      if (!down) return;
      if (h.head) { if (warn <= 0) { warn = 1.4; H.fb.textContent = '¡Cuidado con la cabeza! Las tijeras, por el lomo'; ui.sound?.ui?.('error'); A.play('Idle_HitReact1', 0.1); react = 0.9; } return; }
      if (!h.wool) return;
      // entre el punto anterior y este, cortes seguidos (sin huecos al arrastrar deprisa)
      let n = 0; const steps = lastBP ? Math.min(6, Math.ceil(lastBP.distanceTo(h.bp) / (R * 0.6))) : 1;
      for (let k = 1; k <= steps; k++) n += addCut(lastBP ? lastBP.clone().lerp(h.bp, k / steps) : h.bp);
      lastBP = h.bp.clone();
      if (n) {
        snip = 1; blip(ui, 900 + Math.random() * 200, 0.03, 0.05, 'square'); ui.onMiniHit?.(true);
        if (Math.random() < 0.6) fleece.emit(h.point.clone().addScaledVector(h.normal, 0.04), 1 + (n > 6 ? 1 : 0), { speed: 0.5, spread: 1.0, dir: [h.normal.x, h.normal.y * 0.5, h.normal.z], keep: true, size: 1 });
        const k = done / total; H.fb.textContent = k < 0.5 ? '¡Bien, sigue por todo el lomo!' : k < 0.85 ? 'Ya va saliendo el vellón…' : '¡Casi esquilada!';
        if (k >= 0.9) end({ win: true }, '¡Esquilada! Un vellón entero de lana latxa');
      }
    };
    H.cap.addEventListener('pointerdown', e => { down = true; lastBP = null; shear(e); });
    H.cap.addEventListener('pointermove', e => shear(e));
    const up = () => { down = false; lastBP = null; }; addEventListener('pointerup', up); addEventListener('pointercancel', up);
    S.own({ dispose: () => { removeEventListener('pointerup', up); removeEventListener('pointercancel', up); } });
    // con teclado: un punto que se mueve por la pantalla con las flechas y corta solo
    const kb = { clientX: innerWidth / 2, clientY: innerHeight / 2 };
    H.keys((e) => { const k = e.key.toLowerCase(), s = 26; if (k === 'arrowleft' || k === 'a') kb.clientX -= s; if (k === 'arrowright' || k === 'd') kb.clientX += s; if (k === 'arrowup' || k === 'w') kb.clientY -= s; if (k === 'arrowdown' || k === 's') kb.clientY += s; down = true; shear(kb); down = false; });
    S.every((dt) => {
      A.mixer.update(dt); if (react > 0 && (react -= dt) <= 0) A.play('Idle', 0.3);
      warn -= dt; snip = Math.max(0, snip - dt * 6); T.open(0.3 + 0.7 * (1 - snip));
      if (!isOver()) { t += dt; H.time(seconds - t); if (t >= seconds) { const k = done / total; end({ win: k >= 0.7 }, k >= 0.7 ? 'Bien esquilada, aunque con algún mechón' : 'Se acabó el tiempo: queda mucha lana'); } }
      H.prog(done / total / 0.9);
    });
    H.time(seconds);
    // para las pruebas automáticas: dónde queda lana (en la pantalla)
    const w = new THREE.Vector3();
    H.o.state = () => ({ cut: done / total, left: samples.filter(s => !s.cut).slice(0, 400).filter((_, i) => i % 8 === 0).map(s => { body.getVertexPosition(s.i, w); w.applyMatrix4(body.matrixWorld); return S.toScreen(w); }).filter(p => p.front) });
  });
}
