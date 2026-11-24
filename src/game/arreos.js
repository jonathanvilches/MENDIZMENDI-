// Los arreos de la montura (24 nov 2026; el autor: «el personaje tiene las manos puestas como si agarrara las riendas
// del caballo, pero no hay nada. Agarra al vacío»): la silla con su manta roja, la cincha, las aciones y los estribos,
// la cabezada con el bocado y las riendas, que van del bocado a los puños del jinete (y, sin jinete, del bocado a la
// perilla de la silla, por encima del cuello). Se hacen a la medida de cada animal: el lomo y el hocico se miden en su
// propio modelo (los vértices de su cuerpo y de su cabeza en la postura de ese momento), y la silla va pegada al hueso
// del lomo y la cabezada al de la cabeza, así que se mueven con él al paso, al trote y al galope.
import * as THREE from 'three';

const CUERO = new THREE.MeshStandardMaterial({ color: '#5a3420', roughness: 0.72 });
const CUERO_OSC = new THREE.MeshStandardMaterial({ color: '#3d2416', roughness: 0.78 });
const MANTA = new THREE.MeshStandardMaterial({ color: '#a51d24', roughness: 0.9, side: THREE.DoubleSide });
const RIBETE = new THREE.MeshStandardMaterial({ color: '#efe4c8', roughness: 0.85, side: THREE.DoubleSide });
const METAL = new THREE.MeshStandardMaterial({ color: '#cfc8b6', roughness: 0.35, metalness: 0.8 });
const RIENDA = new THREE.MeshStandardMaterial({ color: '#4a2b19', roughness: 0.7 });
for (const m of [CUERO, CUERO_OSC]) m.side = THREE.DoubleSide;

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _m = new THREE.Matrix4();

/** Una tira curva que abraza el cuerpo entre los ángulos a0 y a1 (0, arriba; positivo, hacia +x) y de z0 a z1, separada
 *  «off» de la piel: R(z, a) dice a qué distancia del centro (0, yc) está la piel en cada sitio (el perfil medido) */
function manto(z0, z1, a0, a1, R, yc, off, nu = 6, nv = 16) {
  const P = [], I = [];
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
    const z = z0 + (z1 - z0) * i / nu, a = a0 + (a1 - a0) * j / nv, r = R(z, a) + off;
    P.push(Math.sin(a) * r, yc + Math.cos(a) * r, z);
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const k = i * (nv + 1) + j; I.push(k, k + 1, k + nv + 1, k + 1, k + nv + 2, k + nv + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals(); return g;
}
/** El perfil de un cuerpo: para cada rodaja de z, a qué distancia del centro (0, yc) llega la piel en cada ángulo (el
 *  vértice más lejano de cada gajo de 1/64 de vuelta, suavizado); R(z, a) interpola entre rodajas */
function perfil(pts, yc, z0, z1, nz, ancho) {
  const NB = 64, filas = [];
  for (let i = 0; i <= nz; i++) {
    const z = z0 + (z1 - z0) * i / nz, r = new Array(NB).fill(0);
    for (const p of pts) { if (Math.abs(p.z - z) > ancho) continue; const a = Math.atan2(p.x, p.y - yc), k = ((Math.round(a / (Math.PI * 2) * NB) % NB) + NB) % NB, d = Math.hypot(p.x, p.y - yc); if (d > r[k]) r[k] = d; }
    // (los gajos vacíos, del vecino; y dos pasadas de suavizado que no bajan del máximo de cada uno)
    for (let n = 0; n < NB; n++) if (!r[n]) { let a = 1; while (a < NB / 2 && !r[(n + a) % NB] && !r[(n - a + NB) % NB]) a++; r[n] = Math.max(r[(n + a) % NB], r[(n - a + NB) % NB]); }
    for (let pase = 0; pase < 2; pase++) { const c = r.slice(); for (let n = 0; n < NB; n++) r[n] = Math.max(c[n], (c[(n + NB - 1) % NB] + 2 * c[n] + c[(n + 1) % NB]) / 4); }
    filas.push({ z, r });
  }
  return (z, a) => {
    let i = 0; while (i < filas.length - 2 && filas[i + 1].z < z) i++;
    const f0 = filas[i], f1 = filas[Math.min(filas.length - 1, i + 1)], t = f1.z === f0.z ? 0 : Math.min(1, Math.max(0, (z - f0.z) / (f1.z - f0.z)));
    const u = ((a / (Math.PI * 2) * NB) % NB + NB) % NB, k = Math.floor(u), q = u - k, en = (f) => f.r[k % NB] * (1 - q) + f.r[(k + 1) % NB] * q;
    return en(f0) * (1 - t) + en(f1) * t;
  };
}
/** Un palo fino (correa redonda) de a a b */
function correa(a, b, r, mat, seg = 5) {
  const d = _v.subVectors(b, a), L = d.length(), g = new THREE.CylinderGeometry(r, r, L, seg, 1, true), m = new THREE.Mesh(g, mat);
  m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
}

/** Una cuerda que cuelga entre dos puntos (las riendas): un tubo de radio fijo cuyos vértices se recolocan cada fotograma */
class Cuerda {
  constructor(r, mat, n = 18, rad = 5) {
    this.n = n; this.rad = rad; this.r = r; this.pts = Array.from({ length: n + 1 }, () => new THREE.Vector3());
    const pos = new Float32Array((n + 1) * rad * 3), I = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < rad; j++) { const a = i * rad + j, b = i * rad + (j + 1) % rad; I.push(a, a + rad, b, b, a + rad, b + rad); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(I);
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(pos.length), 3));
    this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false; this.mesh.castShadow = true;
  }
  /** De a a b, colgando «cae» metros por el medio */
  pon(a, b, cae) {
    const { n, rad, r, pts } = this, pos = this.mesh.geometry.attributes.position, nor = this.mesh.geometry.attributes.normal;
    for (let i = 0; i <= n; i++) { const t = i / n; pts[i].lerpVectors(a, b, t); pts[i].y -= cae * 4 * t * (1 - t); }
    const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i <= n; i++) {
      T.subVectors(pts[Math.min(n, i + 1)], pts[Math.max(0, i - 1)]).normalize();
      N.crossVectors(T, Math.abs(T.y) > 0.95 ? _w.set(1, 0, 0) : up).normalize(); B.crossVectors(T, N);
      for (let j = 0; j < rad; j++) {
        const a = j / rad * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), k = (i * rad + j) * 3;
        const nx = N.x * c + B.x * s, ny = N.y * c + B.y * s, nz = N.z * c + B.z * s;
        pos.array[k] = pts[i].x + nx * r; pos.array[k + 1] = pts[i].y + ny * r; pos.array[k + 2] = pts[i].z + nz * r;
        nor.array[k] = nx; nor.array[k + 1] = ny; nor.array[k + 2] = nz;
      }
    }
    pos.needsUpdate = true; nor.needsUpdate = true;
  }
}

export class Arreos {
  /** Los arreos de la montura M, o null si su modelo aún no ha cargado */
  static crea(M) {
    let mesh = null; M.A.obj.traverse(o => { if (!mesh && o.isSkinnedMesh && o.skeleton) mesh = o; });
    if (!mesh) return null;
    try { return new Arreos(M, mesh); } catch (e) { console.warn('arreos', e); return false; }
  }
  constructor(M, mesh) {
    this.M = M; const A = M.A, obj = A.obj, bones = mesh.skeleton.bones;
    const cabeza = bones.find(b => /^head$/i.test(b.name)) || bones.find(b => /head/i.test(b.name));
    if (!cabeza) throw new Error('sin hueso de la cabeza');
    obj.updateMatrixWorld(true);
    const aLocal = new THREE.Matrix4().copy(obj.matrixWorld).invert(), ih = bones.indexOf(cabeza);
    const si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight, n = mesh.geometry.attributes.position.count;
    const todos = [], deCabeza = [];
    for (let i = 0; i < n; i++) {
      mesh.getVertexPosition(i, _v); _v.applyMatrix4(mesh.matrixWorld).applyMatrix4(aLocal); const p = _v.clone(); todos.push(p);
      let w = 0; for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === ih) w += sw.getComponent(i, k);
      if (w >= 0.5) deCabeza.push(p);
    }
    // hacia dónde mira (el lado de z donde está la cabeza) y la sección del cuerpo donde va sentado el jinete (z = 0: el
    // jinete va en el centro del animal)
    const cab = cabeza.getWorldPosition(new THREE.Vector3()).applyMatrix4(aLocal), s = Math.sign(cab.z) || 1;
    const rodaja = todos.filter(p => Math.abs(p.z) < 0.07 * (M.T.escala || 1));
    const yTop = Math.max(...rodaja.map(p => p.y)), yBot = Math.min(...rodaja.map(p => p.y)), w = Math.max(...rodaja.map(p => Math.abs(p.x)));
    const h = (yTop - yBot) / 2, yc = (yTop + yBot) / 2, L = 0.42 * (M.T.escala || 1) * (M.tipo === 'burro' ? 0.85 : 1);
    // (el perfil del lomo y la tripa, de punta a punta de la manta; sin la cabeza ni las patas, que no caen ahí)
    const cuerpo = todos.filter(p => Math.abs(p.z) < L + 0.1 && p.y > yBot - 0.02), R = perfil(cuerpo, yc, -L - 0.02, L + 0.02, 8, 0.05);
    // ---------- la silla ----------
    const silla = new THREE.Group(), add = (g, mat, o = {}) => { const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; Object.assign(m.position, o); silla.add(m); return m; };
    add(manto(-L, L, -1.35, 1.35, R, yc, 0.014, 8, 26), MANTA);                                          // la manta, roja
    for (const sg of [-1, 1]) add(manto(-L, L, sg * 1.31, sg * 1.37, R, yc, 0.018, 8, 2), RIBETE);         // su ribete
    add(manto(-L * 0.62, L * 0.62, -0.78, 0.78, R, yc, 0.045, 6, 12), CUERO);                             // el asiento
    for (const sg of [-1, 1]) add(manto(-L * 0.55, L * 0.5, sg * 0.7, sg * 1.18, R, yc, 0.032, 4, 6), CUERO_OSC);   // los faldones
    // la perilla (delante) y el borrén (detrás), dos arcos de cuero sobre el asiento
    const arco = (z, alto, ancho) => { const g = new THREE.TorusGeometry(ancho, 0.028, 6, 14, Math.PI); const m = add(g, CUERO); m.position.set(0, yTop + 0.03, z); m.scale.set(1, alto / ancho, 1); return m; };
    arco(s * L * 0.58, 0.11, w * 0.42); arco(-s * L * 0.6, 0.14, w * 0.55);
    // la cincha, por debajo de la tripa, de faldón a faldón
    add(manto(-0.045 + s * 0.06, 0.045 + s * 0.06, 1.3, Math.PI * 2 - 1.3, R, yc, 0.012, 1, 24), CUERO_OSC);
    // las aciones y los estribos, a los dos lados, a la altura de los pies del jinete
    for (const sg of [-1, 1]) {
      const ra = R(s * 0.05, sg * 1.0), a = new THREE.Vector3(sg * Math.sin(1.0) * (ra + 0.04), yc + Math.cos(1.0) * (ra + 0.04), s * 0.05), b = new THREE.Vector3(sg * (R(s * 0.05, sg * 1.75) * Math.sin(1.75) + 0.08), yc - h * 0.95, s * 0.08);
      const ac = correa(a, b, 0.012, CUERO_OSC, 4); ac.scale.x = 2.2; silla.add(ac);
      const es = add(new THREE.TorusGeometry(0.06, 0.012, 5, 10), METAL); es.position.copy(b).add(_w.set(0, -0.05, 0)); es.rotation.y = Math.PI / 2;
    }
    this.perilla = new THREE.Vector3(0, yTop + 0.12, s * L * 0.58);
    silla.add(this.perillaObj = new THREE.Object3D()); this.perillaObj.position.copy(this.perilla);
    // pegada al hueso del lomo más cercano al asiento (se mueve con el galope)
    const lomo = bones.filter(b => /torso|spine|back|body/i.test(b.name)).sort((p, q) => Math.abs(p.getWorldPosition(_v).applyMatrix4(aLocal).z) - Math.abs(q.getWorldPosition(_w).applyMatrix4(aLocal).z))[0] || bones[0];
    obj.add(silla); silla.updateMatrixWorld(true); lomo.attach(silla); this.silla = silla;
    // ---------- la cabezada y el bocado ----------
    const nariz = deCabeza.reduce((m, p) => (p.z * s > m.z * s ? p : m), deCabeza[0]);
    const hocico = deCabeza.filter(p => (nariz.z - p.z) * s < 0.2), hw = Math.max(...hocico.map(p => Math.abs(p.x)));
    const hy0 = Math.min(...hocico.map(p => p.y)), hy1 = Math.max(...hocico.map(p => p.y));
    const cab2 = new THREE.Group();
    const zN = nariz.z - s * 0.17, nb = deCabeza.filter(p => Math.abs(p.z - zN) < 0.04);
    const nw = Math.max(0.05, ...nb.map(p => Math.abs(p.x))), ny0 = Math.min(...nb.map(p => p.y)), ny1 = Math.max(...nb.map(p => p.y));
    const nyc = (ny0 + ny1) / 2, Rn = perfil(deCabeza, nyc, zN - 0.03, zN + 0.03, 1, 0.035);
    const muserola = new THREE.Mesh(manto(zN - 0.02, zN + 0.02, 0, Math.PI * 2, Rn, nyc, 0.012, 1, 24), CUERO_OSC); cab2.add(muserola);
    this.bocado = [-1, 1].map(sg => new THREE.Vector3(sg * (hw + 0.02), hy0 + (hy1 - hy0) * 0.3, nariz.z - s * 0.13));
    for (const b of this.bocado) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 5, 12), METAL); r.position.copy(b); r.rotation.y = Math.PI / 2; cab2.add(r); }
    // las carrilleras, de la muserola a la nuca (detrás de las orejas), y la frontalera
    const orejas = bones.filter(b => /^ear1/i.test(b.name)).map(b => b.getWorldPosition(new THREE.Vector3()).applyMatrix4(aLocal));
    const nuca = orejas.length === 2 ? orejas : [-1, 1].map(sg => new THREE.Vector3(sg * nw, ny1 + 0.25, nariz.z - s * 0.45));
    nuca.sort((p, q) => p.x - q.x);
    for (let k = 0; k < 2; k++) {
      const sg = k ? 1 : -1, abajo = new THREE.Vector3(sg * (nw + 0.012), (ny0 + ny1) / 2, zN), arriba = nuca[k].clone().add(_w.set(-sg * 0.01, -0.02, -s * 0.04));
      cab2.add(correa(abajo, arriba, 0.011, CUERO_OSC, 4)); cab2.add(correa(this.bocado[k], abajo, 0.009, CUERO_OSC, 4));
    }
    cab2.add(correa(nuca[0].clone().add(_w.set(0, -0.03, s * 0.05)), nuca[1].clone().add(_w.set(0, -0.03, s * 0.05)), 0.011, CUERO_OSC, 4));   // frontalera
    cab2.add(correa(nuca[0].clone().add(_w.set(0, 0.01, -s * 0.05)), nuca[1].clone().add(_w.set(0, 0.01, -s * 0.05)), 0.011, CUERO_OSC, 4));  // testera
    cab2.traverse(o => { if (o.isMesh) o.castShadow = true; });
    obj.add(cab2); cab2.updateMatrixWorld(true); cabeza.attach(cab2); this.cabezada = cab2;
    this.bocadoObj = this.bocado.map(b => { const o = new THREE.Object3D(); o.position.copy(b); cab2.add(o); cabeza.attach(o); return o; });
    // ---------- las riendas ----------
    this.riendas = [new Cuerda(0.011, RIENDA), new Cuerda(0.011, RIENDA)];
    for (const r of this.riendas) M.g.scene.add(r.mesh);
    this.a = new THREE.Vector3(); this.b = new THREE.Vector3();
  }
  /** Cada fotograma, después de mover al animal y al jinete: las riendas, del bocado a los puños (o a la perilla) */
  update(P) {
    const A = this.M.A, ve = A.obj.visible !== false && (A.inner?.visible ?? true);
    for (const r of this.riendas) r.mesh.visible = ve;
    if (!ve) return;
    const c = P?.rig?.char, manos = c && (this.manos ||= this.buscaManos(c));
    if (manos) P.obj.updateMatrixWorld(true);
    for (let k = 0; k < 2; k++) {
      this.bocadoObj[k].getWorldPosition(this.a);
      if (manos) {
        // (el puño: entre la muñeca y los nudillos)
        manos[k][0].getWorldPosition(this.b); if (manos[k][1]) { manos[k][1].getWorldPosition(_w); this.b.lerp(_w, 0.6); }
        this.riendas[k].pon(this.a, this.b, 0.07);
      } else { this.perillaObj.getWorldPosition(this.b); this.b.x += (k ? 1 : -1) * 0.04; this.riendas[k].pon(this.a, this.b, 0.18); }
    }
  }
  buscaManos(c) {
    const B = {}; c.root?.traverse(o => { if (o.isBone) B[o.name] = o; });
    const L = B.mixamorigLeftHand, R = B.mixamorigRightHand; if (!L || !R) return null;
    // (el bocado de la izquierda, de x negativa en el animal, va a la mano que queda a ese lado del jinete)
    const izq = [L, B.mixamorigLeftHandMiddle1 || B.mixamorigLeftHandIndex1], der = [R, B.mixamorigRightHandMiddle1 || B.mixamorigRightHandIndex1];
    const a = this.bocadoObj[0].getWorldPosition(new THREE.Vector3()), dl = L.getWorldPosition(new THREE.Vector3()).distanceTo(a), dr = R.getWorldPosition(new THREE.Vector3()).distanceTo(a);
    return dl <= dr ? [izq, der] : [der, izq];
  }
  soltar() { this.manos = null; }
  dispose() {
    for (const r of this.riendas) { r.mesh.removeFromParent(); r.mesh.geometry.dispose(); }
    for (const g of [this.silla, this.cabezada]) { g?.removeFromParent(); g?.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); }
  }
}
