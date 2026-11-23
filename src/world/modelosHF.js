// Casas y ovejas modeladas en 3D con Higgsfield (prueba del autor, 23 nov 2026: «generar con Higgsfield en 3D las casas,
// las islas, los animales… para evitar imperfecciones»). Un caserío, una casa de piedra del Pirineo y una borda en un prado
// de las afueras de Otsagabia, cerca del crucero donde se empieza, y tres ovejas latxas paciendo junto a la borda.
// Los modelos salen de Higgsfield (Hunyuan 3D) con 500.000 triángulos y textura de 4096 px; aquí van aligerados a
// 12.000-41.000 triángulos y textura de 1024 px (webp), entre 0,3 y 1 MB cada uno (src/assets/hf3d/).
// Si el autor da el visto bueno, se pasa a más pueblos (MODELOS_HF) y a más modelos.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { loadGLB } from '../util/glb.js';
import { groundHeight, waterLevelAt } from './heightfield.js';
import { addBox, addCircle, isFree, removeCollider } from './colliders.js';
import { PLACES, pathQuery, villageMask, riverInfo } from './layout.js';
import { TOWN } from './townBuilder.js';
import caserioUrl from '../assets/hf3d/caserio.glb?url';
import piedraUrl from '../assets/hf3d/piedra.glb?url';
import bordaUrl from '../assets/hf3d/borda.glb?url';
import ovejaUrl from '../assets/hf3d/oveja.glb?url';

// (por pueblo, qué se pone: de momento solo Otsagabia)
export const MODELOS_HF = { 'otsagabia-ochagavia': true };
// (cada modelo: su largo de verdad en metros, el radio que ocupa y cuánto se aclara su textura, que en la de piedra y la
// borda salía más oscura que las casas del juego; todos miran hacia +z, su fachada)
const CASAS = [
  { url: caserioUrl, largo: 16, r: 10, luz: 1 },
  { url: piedraUrl, largo: 10, r: 7, luz: 1.2 },
  { url: bordaUrl, largo: 8, r: 5.5, luz: 1.15 },
];

/** Las casas y las ovejas de Higgsfield en el pueblo (si le toca). Se cargan sin parar el juego; dispose() las quita. */
export class ModelosHF {
  constructor(scene, def, { sombras = true } = {}) {
    this.scene = scene; this.objs = []; this.cols = []; this.vivo = true; this.sitios = [];
    if (!MODELOS_HF[def?.id] || !(PLACES?.spawn || PLACES?.crucero)) return;
    this.sitios = buscaSitios();
    if (!this.sitios.length) return;
    this.listo = this.carga(sombras).catch(e => console.warn('modelos de Higgsfield', e));
  }

  async carga(sombras) {
    const L = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const pon = (g, largo, x, z, ry, luz) => {
      g.traverse(o => { if (o.isMesh) { o.castShadow = sombras; o.receiveShadow = true; if (luz !== 1) o.material.color.setScalar(luz); } });
      const b = new THREE.Box3().setFromObject(g), s = b.getSize(new THREE.Vector3()), k = largo / Math.max(s.x, s.z);
      // (centrada y apoyada en lo más bajo de su planta, algo hundida, para que no flote en la cuesta)
      const hold = new THREE.Group(); g.position.set(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2); hold.add(g);
      hold.scale.setScalar(k); hold.rotation.y = ry;
      const hw = s.x * k / 2, hd = s.z * k / 2;
      let y = groundHeight(x, z);
      for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) y = Math.min(y, groundHeight(x + dx * hw * 0.9, z + dz * hd * 0.9));
      hold.position.set(x, y - 0.15, z);
      this.scene.add(hold); this.objs.push(hold);
      return { hw, hd };
    };
    const casas = await Promise.all(CASAS.map(c => loadGLB(L, c.url)));
    if (!this.vivo) return;
    this.sitios.forEach((st, i) => {
      const c = CASAS[i], { hw, hd } = pon(casas[i].scene, c.largo, st.x, st.z, st.ry, c.luz);
      this.cols.push(addBox(st.x, st.z, hw * 2 + 0.3, hd * 2 + 0.3, st.ry, { solidView: true }));
    });
    // las ovejas, delante de la borda (la última casa), paciendo cada una a su aire
    const B = this.sitios[this.sitios.length - 1];
    if (B.kind !== 2) return;
    const oveja = await loadGLB(L, ovejaUrl);
    if (!this.vivo) return;
    const fx = Math.sin(B.ry), fz = Math.cos(B.ry), rx = Math.cos(B.ry), rz = -Math.sin(B.ry);
    [[7, -3, 0.4], [9, 1.5, 2.6], [6.5, 4, 4.4]].forEach(([a, l, giro], i) => {
      const x = B.x + fx * a + rx * l, z = B.z + fz * a + rz * l;
      if (!isFree(x, z, 0.6) || waterLevelAt(x, z) > groundHeight(x, z) - 0.3) return;
      const g = i ? oveja.scene.clone(true) : oveja.scene;
      pon(g, 1.35 * (0.94 + i * 0.05), x, z, B.ry + giro, 1);
      this.cols.push(addCircle(x, z, 0.55));
    });
  }

  dispose() {
    this.vivo = false;
    for (const o of this.objs) { o.parent?.remove(o); o.traverse(m => { if (m.isMesh) { m.geometry.dispose(); m.material.map?.dispose(); m.material.dispose(); } }); }
    for (const c of this.cols) removeCollider(c);
    this.objs = []; this.cols = [];
  }
}

// los sitios: en prado abierto a las afueras (fuera del casco, sin casas, árboles ni muros), llano, lejos del río y junto
// a un camino, lo más cerca posible de la entrada por la que se llega; las casas, separadas entre sí y con la fachada
// hacia el camino
function buscaSitios() {
  const S = PLACES.spawn || PLACES.crucero, out = [];
  const casasDe = TOWN.houses || [];
  for (let kind = 0; kind < CASAS.length; kind++) {
    const R = CASAS[kind].r;
    let mejor = null;
    for (let d = 26; d <= 150 && !mejor; d += 8) for (let k = 0; k < 36; k++) {
      const a = k / 36 * Math.PI * 2, x = S.x + Math.sin(a) * d, z = S.z + Math.cos(a) * d;
      if (Math.pow(x ** 4 + z ** 4, 0.25) > 380) continue;
      if ((villageMask?.(x, z) ?? 0) > 0.08) continue;
      const q = pathQuery?.(x, z); if (!q || q.d < q.w + R * 0.75 || q.d > q.w + R + 14) continue;
      if ((riverInfo?.(x, z)?.edge ?? 99) < R + 4 || waterLevelAt(x, z) > -1e8) continue;
      const h = groundHeight(x, z); let pend = 0;
      for (const [dx, dz] of [[R, 0], [-R, 0], [0, R], [0, -R]]) pend = Math.max(pend, Math.abs(groundHeight(x + dx, z + dz) - h));
      if (pend > R * 0.16) continue;
      if (!isFree(x, z, R)) continue;
      if (casasDe.some(c => Math.hypot(c.x - x, c.z - z) < R + Math.max(c.w, c.d) / 2 + 3)) continue;
      if (out.some(o => Math.hypot(o.x - x, o.z - z) < o.r + R + 8)) continue;
      // (la fachada, hacia el camino: hacia donde baja la distancia a él)
      const e = 2, gx = pathQuery(x + e, z).d - pathQuery(x - e, z).d, gz = pathQuery(x, z + e).d - pathQuery(x, z - e).d;
      mejor = { x, z, r: R, kind, ry: Math.atan2(-gx, -gz) };
      break;
    }
    if (mejor) out.push(mejor); else break;
  }
  return out;
}
