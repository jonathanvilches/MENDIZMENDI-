// Equipo visible sobre el protagonista: mochila con correas, cantimplora en la cadera, prismáticos al pecho,
// makila sujeta a la mochila y farol colgado. Diseño propio. Cada pieza se cuelga de un hueso (Spine2 o Hips)
// calculando su posición en la pose de reposo, así sigue al cuerpo al andar, correr o saltar.
// Coordenadas del modelo: +z hacia delante, +x a la izquierda del personaje, y hacia arriba (metros).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const tint = (g, hex) => { const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const P = (geo, hex, x, y, z, rx = 0, ry = 0, rz = 0) => { const g = geo.index ? geo.toNonIndexed() : geo; g.deleteAttribute('uv'); g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); g.translate(x, y, z); return tint(g, hex); };
const rbox = (w, h, d, r = 0.02) => { const g = new THREE.BoxGeometry(w, h, d, 2, 2, 2); const p = g.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 1 - r * 4; p.setXYZ(i, v.x * (Math.abs(v.x) > w / 2 - 1e-4 && Math.abs(v.y) > h / 2 - 1e-4 ? k + (1 - k) * 0.6 : 1), v.y, v.z * (Math.abs(v.z) > d / 2 - 1e-4 && Math.abs(v.y) > h / 2 - 1e-4 ? k : 1)); } g.computeVertexNormals(); return g; };
const cyl = (r1, r2, h, n = 12) => new THREE.CylinderGeometry(r1, r2, h, n);
const MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
// proporciones de los modelos de Blender (build_protagonista.py: proportions)
export const PROP = { legs: 1.35, hip: 0.55 };

function piece(id) {
  const parts = [];
  switch (id) {
    case 'mochila': {
      parts.push(P(rbox(0.3, 0.32, 0.15, 0.03), '#c8642a', 0, 0.79, -0.245));                  // cuerpo
      parts.push(P(rbox(0.31, 0.11, 0.15, 0.03), '#a84f22', 0, 0.94, -0.235));                // solapa
      parts.push(P(rbox(0.2, 0.13, 0.05, 0.015), '#a84f22', 0, 0.74, -0.31));                 // bolsillo
      parts.push(P(new THREE.BoxGeometry(0.05, 0.025, 0.012), '#f2c230', 0, 0.8, -0.336));     // hebilla
      for (const s of [-1, 1]) {
        parts.push(P(new THREE.BoxGeometry(0.036, 0.016, 0.3), '#5a3a22', s * 0.095, 0.965, -0.03));   // correa por el hombro
        parts.push(P(new THREE.BoxGeometry(0.036, 0.2, 0.014), '#5a3a22', s * 0.1, 0.86, 0.168, -0.08)); // correa delante
        parts.push(P(new THREE.BoxGeometry(0.03, 0.26, 0.02), '#5a3a22', s * 0.13, 0.8, -0.165));      // correa detrás
      }
      parts.push(P(cyl(0.035, 0.035, 0.26, 10), '#3a6a8a', 0, 0.62, -0.25, 0, 0, Math.PI / 2));  // esterilla enrollada
      return { bone: 'Spine2', geo: parts };
    }
    case 'cantimplora': {
      parts.push(P(cyl(0.06, 0.06, 0.045, 16), '#6b8a5a', -0.19, 0.6, 0.02, 0, 0, Math.PI / 2));
      parts.push(P(cyl(0.017, 0.017, 0.035, 8), '#3a3d42', -0.19, 0.675, 0.02));
      parts.push(P(new THREE.BoxGeometry(0.012, 0.1, 0.02), '#5a3a22', -0.172, 0.69, 0.02, 0, 0, 0.2));
      return { bone: 'Hips', geo: parts };
    }
    case 'prismaticos': {
      for (const s of [-1, 1]) { parts.push(P(cyl(0.022, 0.026, 0.07, 10), '#2c2c30', 0.115 + s * 0.026, 0.79, 0.185)); parts.push(P(cyl(0.02, 0.02, 0.006, 10), '#8fc7e8', 0.115 + s * 0.026, 0.752, 0.185)); }
      parts.push(P(new THREE.BoxGeometry(0.03, 0.03, 0.02), '#2c2c30', 0.115, 0.8, 0.185));
      parts.push(P(new THREE.BoxGeometry(0.01, 0.12, 0.01), '#1d1d24', 0.115, 0.88, 0.178, -0.15));
      return { bone: 'Spine2', geo: parts };
    }
    case 'baston': {
      parts.push(P(cyl(0.013, 0.011, 0.74, 8), '#8a5a32', 0.17, 0.76, -0.26, 0.08, 0, -0.06));
      parts.push(P(cyl(0.02, 0.02, 0.09, 8), '#5a3a22', 0.172, 1.08, -0.235, 0.08, 0, -0.06));   // empuñadura de cuero
      parts.push(P(cyl(0.016, 0.016, 0.03, 8), '#d42f2f', 0.165, 0.95, -0.255));               // correa roja
      return { bone: 'Spine2', geo: parts };
    }
    case 'farol': {
      parts.push(P(new THREE.BoxGeometry(0.06, 0.07, 0.06), '#f5c542', -0.18, 0.66, -0.25));
      parts.push(P(new THREE.BoxGeometry(0.075, 0.015, 0.075), '#3a3d42', -0.18, 0.705, -0.25));
      parts.push(P(new THREE.BoxGeometry(0.075, 0.015, 0.075), '#3a3d42', -0.18, 0.62, -0.25));
      parts.push(P(new THREE.TorusGeometry(0.02, 0.004, 4, 10, Math.PI), '#3a3d42', -0.18, 0.715, -0.25));
      return { bone: 'Spine2', geo: parts, glow: true };
    }
  }
  return null;
}

export class GearProps {
  constructor(rig) {
    this.rig = rig; this.on = {};
    const ch = rig?.char; this.ok = !!(ch && ch.bones?.Spine2 && ch.bones?.Hips);
    this.lampMat = new THREE.MeshStandardMaterial({ color: '#ffe9a0', emissive: '#ffc94a', emissiveIntensity: 0.2, roughness: 0.4 });
  }
  set(owned) {
    if (!this.ok) return;
    for (const id of ['mochila', 'cantimplora', 'prismaticos', 'baston', 'farol']) {
      const want = owned.includes(id);
      if (want && !this.on[id]) this.attach(id);
      if (this.on[id]) this.on[id].visible = want;
    }
  }
  attach(id) {
    const spec = piece(id); if (!spec) return;
    const ch = this.rig.char, root = ch.root, bone = ch.bones[spec.bone];
    const geo = mergeGeometries(spec.geo);
    // las piezas están medidas sobre el cuerpo original: se les aplican las mismas proporciones (piernas más largas)
    { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y <= PROP.hip ? y * PROP.legs : y + PROP.hip * (PROP.legs - 1)); } p.needsUpdate = true; }
    const mesh = new THREE.Mesh(geo, MAT);
    if (spec.glow) { const g = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 0.045), this.lampMat); g.position.set(-0.18, 0.66 + PROP.hip * (PROP.legs - 1), -0.25); mesh.add(g); }
    mesh.castShadow = true;
    // posición en la pose de reposo: se guardan los huesos, se pone la pose de reposo y se mide
    const skinned = []; root.traverse(o => { if (o.isSkinnedMesh) skinned.push(o); });
    const bones = Object.values(ch.bones), saved = bones.map(b => [b.position.clone(), b.quaternion.clone(), b.scale.clone()]);
    skinned[0]?.skeleton.pose();
    root.updateMatrixWorld(true);
    // las piezas están medidas en metros del modelo de Blender (cadera 0,55 · pecho 0,90); el GLB del juego va
    // escalado y desplazado: la escala sale de la distancia cadera-pecho y el origen, de la cadera
    // los pies del modelo (vértices más bajos en la pose de reposo) son el cero de las medidas de las piezas
    if (this.feetY == null) {
      const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), v = new THREE.Vector3(); let mn = 1e9, mx = -1e9;
      for (const sm of skinned) { if (!/^(Boots|Hair|Head|Body|Shirt)/.test(sm.name) && !/^(Boots|Hair|Head|Body|Shirt)/.test(sm.parent?.name || '')) continue; const n = sm.geometry.attributes.position.count; for (let i = 0; i < n; i += 3) { sm.getVertexPosition(i, v); v.applyMatrix4(sm.matrixWorld).applyMatrix4(inv); if (v.y < mn) mn = v.y; if (v.y > mx) mx = v.y; } }
      // altura del modelo de Blender con las proporciones nuevas: 1,678 m
      this.feetY = mn; this.scale = (mx - mn) / 1.678;
      window.__gearFit = { feet: mn, top: mx, scale: this.scale };
    }
    const k = this.scale, fit = new THREE.Matrix4().makeTranslation(0, this.feetY, 0).multiply(new THREE.Matrix4().makeScale(k, k, k));
    const off = new THREE.Matrix4().copy(bone.matrixWorld).invert().multiply(root.matrixWorld).multiply(fit);
    bones.forEach((b, i) => { b.position.copy(saved[i][0]); b.quaternion.copy(saved[i][1]); b.scale.copy(saved[i][2]); });
    root.updateMatrixWorld(true);
    mesh.matrixAutoUpdate = false; mesh.matrix.copy(off);
    bone.add(mesh); this.on[id] = mesh;
  }
  // de noche el farol se enciende
  night(k) { this.lampMat.emissiveIntensity = 0.2 + k * 2.2; }
}
