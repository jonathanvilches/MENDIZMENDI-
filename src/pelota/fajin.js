// El fajín del pelotari, en 3D. Hasta el 19 de noviembre de 2026 iba pintado sobre la camiseta (actors/npcOutfit.js); el
// autor pidió entonces: «el fajín más abajo y no intentes hacerlo tú, que lo haga Meshy». El modelo es de Meshy
// (assets/pelota/fajin.glb: un anillo de tela con su nudo y sus dos puntas, sin textura, simplificado a 4.400
// triángulos) y aquí se ajusta al cuerpo de cada pelotari, que no miden lo mismo:
//   - se mide su cadera en la malla, en la pose de reposo: a la altura del fajín, lo ancho y lo hondo del tronco (sin los
//     brazos, que en esa pose caen a esa altura)
//   - el anillo se estira para abrazar esa cadera, algo holgado; la banda, fina (el 3 % del alto del pelotari); y las
//     puntas, más largas que en el modelo, que con la banda fina se quedaban cortas
//   - el nudo, en la cadera izquierda, algo adelantado, como lo llevan los pelotaris
//   - va colgado del hueso de la cadera (Hips): se mueve con ella al correr y golpear
// Lo lleva tu pelotari, con la equipación que elijas (pelota/kit.js); los rivales van como siempre.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadGLB } from '../util/glb.js';

const FAJIN_URL = Object.values(import.meta.glob('../assets/pelota/fajin.glb', { eager: true, query: '?url', import: 'default' }))[0] || '';
/** Dónde y cómo va: ALTO, a qué altura entre donde nacen las piernas (0) y el hueso de la cadera (1); BANDA, lo alto de
 *  la banda, en partes del alto del pelotari; HOLGURA, cuánto más ancho que la cadera; NUDO, a cuántos grados del frente
 *  (hacia la izquierda del pelotari); PUNTAS, cuánto más largas que en el modelo */
export const FAJIN = { ALTO: 0.1, BANDA: 0.03, HOLGURA: 1.07, NUDO: 62, PUNTAS: 1.9 };

// la forma, una vez: el anillo centrado, de radio 1 a lo ancho y a lo hondo, la banda de alto 1 centrada en y = 0 y el
// nudo hacia +z; las puntas, estiradas hacia abajo
let forma = null;
function preparaForma(geo) {
  const g = geo.index ? geo : geo.clone(); g.computeBoundingBox();
  const p = g.attributes.position, n = p.count, bb = g.boundingBox;
  // (la banda, medida por detrás, donde no hay nudo ni puntas: su alto y su hondo)
  const zMed = (bb.min.z + bb.max.z) / 2, dz = bb.max.z - bb.min.z;
  let yA = -Infinity, yB = Infinity, xA = -Infinity, xB = Infinity, zB = Infinity;
  for (let i = 0; i < n; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (z < zMed - dz * 0.2) { yA = Math.max(yA, y); yB = Math.min(yB, y); zB = Math.min(zB, z); }
    if (y > bb.max.y - (bb.max.y - bb.min.y) * 0.3) { xA = Math.max(xA, x); xB = Math.min(xB, x); } }
  // (el centro del anillo: a lo ancho, entre sus dos costados; a lo hondo, donde el anillo es más ancho)
  const cx = (xA + xB) / 2, rx = (xA - xB) / 2, yc = (yA + yB) / 2, hb = Math.max(1e-3, yA - yB);
  let zC = 0, nC = 0; for (let i = 0; i < n; i++) { const x = p.getX(i), y = p.getY(i); if (y > yB && Math.abs(Math.abs(x - cx) - rx) < rx * 0.04) { zC += p.getZ(i); nC++; } }
  const cz = nC ? zC / nC : zMed, rz = Math.max(1e-3, cz - zB);
  const out = g.clone(), q = out.attributes.position;
  for (let i = 0; i < n; i++) {
    let y = (q.getY(i) - yc) / hb; if (y < -0.5) y = -0.5 + (y + 0.5) * FAJIN.PUNTAS;
    q.setXYZ(i, (q.getX(i) - cx) / rx, y, (q.getZ(i) - cz) / rz);
  }
  out.deleteAttribute('normal'); out.computeVertexNormals(); out.computeBoundingSphere();
  return out;
}
async function cargaForma() {
  if (!forma) forma = loadGLB(new GLTFLoader(), FAJIN_URL).then(gl => { let geo = null; gl.scene.traverse(o => { if (!geo && o.isMesh) geo = o.geometry; }); if (!geo) throw new Error('fajín sin malla'); return preparaForma(geo); });
  return forma;
}

// la cadera de un pelotari, en las unidades de su malla y en la pose de reposo
function cadera(sk) {
  const sk2 = sk.skeleton, bi = new THREE.Matrix4().copy(sk.bindMatrix).invert(), M = new THREE.Matrix4();
  const hueso = (re) => sk2.bones.findIndex(b => re.test(b.name));
  const en = (i) => new THREE.Vector3().setFromMatrixPosition(M.copy(sk2.boneInverses[i]).invert().premultiply(bi));
  const iH = hueso(/Hips$/), iL = hueso(/LeftUpLeg$/); if (iH < 0 || iL < 0) return null;
  const cad = en(iH), mus = en(iL), g = sk.geometry; if (!g.boundingBox) g.computeBoundingBox();
  const H = g.boundingBox.max.y - g.boundingBox.min.y, lado = Math.abs(mus.x - cad.x);
  const y = mus.y + (cad.y - mus.y) * FAJIN.ALTO, banda = H * FAJIN.BANDA;
  // (el tronco a esa altura: los puntos de la malla en la franja de la banda, sin los brazos)
  const p = g.attributes.position; let xA = -Infinity, xB = Infinity, zA = -Infinity, zB = Infinity;
  for (let i = 0; i < p.count; i++) { const py = p.getY(i); if (Math.abs(py - y) > banda * 0.5) continue; const px = p.getX(i) - cad.x; if (Math.abs(px) > lado * 2.1) continue;
    xA = Math.max(xA, px); xB = Math.min(xB, px); const pz = p.getZ(i); zA = Math.max(zA, pz); zB = Math.min(zB, pz); }
  if (!(xA > xB && zA > zB)) return null;
  return { iH, c: new THREE.Vector3(cad.x + (xA + xB) / 2, y, (zA + zB) / 2), rx: (xA - xB) / 2, rz: (zA - zB) / 2, banda, izq: Math.sign(mus.x - cad.x) || 1 };
}

/** Pone (o cambia de color, o quita, con color vacío) el fajín a un pelotari. root: el de su GlbChar. */
export async function ponFajin(root, color) {
  if (!root) return;
  const ya = root.userData.fajin;
  if (!color) { if (ya) { ya.parent?.remove(ya); ya.material.dispose(); root.userData.fajin = null; } return; }
  if (ya) { ya.material.color.set(color); return; }
  const geo = await cargaForma();
  if (root.userData.fajin) { root.userData.fajin.material.color.set(color); return; }   // (otra llamada se adelantó)
  let sk = null; root.traverse(o => { if (o.isSkinnedMesh && o.skeleton && (!sk || o.geometry.attributes.position.count > sk.geometry.attributes.position.count)) sk = o; });
  if (!sk) return;
  const C = cadera(sk); if (!C) return;
  // el anillo de radio 1 → girado con el nudo en la cadera izquierda → estirado a la cadera → en su altura; y, de las
  // unidades de la malla, a las del hueso de la cadera, del que cuelga
  const giro = C.izq * THREE.MathUtils.degToRad(FAJIN.NUDO);
  const enMalla = new THREE.Matrix4().compose(C.c, new THREE.Quaternion(), new THREE.Vector3(C.rx * FAJIN.HOLGURA, C.banda, C.rz * FAJIN.HOLGURA * 1.04))
    .multiply(new THREE.Matrix4().makeRotationY(giro));
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0 }));
  m.name = 'fajin'; m.castShadow = true; m.matrixAutoUpdate = false; m.frustumCulled = false;
  m.matrix.copy(sk.skeleton.boneInverses[C.iH]).multiply(sk.bindMatrix).multiply(enMalla);
  sk.skeleton.bones[C.iH].add(m); root.userData.fajin = m;
}
