// La ropa tendida de los balcones del pueblo: en uno de cada tres (uno de cada cuatro en el móvil), una cuerda por fuera de
// la barandilla con tres o cuatro prendas (camisas, toallas, trapos y alguna sábana pequeña) de colores de casa, colgadas de
// arriba, que se mecen con el viento; más abajo, más se mueven. Los balcones son los mismos en los que se asoman los
// vecinos (TOWN.balcones: townBuilder.js y townReal.js): la cuerda va medio metro por fuera, para no pisarlos.
// Dos mallas: las cuerdas (una sola geometría) y las prendas (InstancedMesh; el vaivén, en el sombreador). Unas 80 prendas.
//   new Colada(scene, { quality }) · update(t) · dispose()
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TOWN } from './townBuilder.js';
import { mulberry32 } from '../util/math.js';

// (blancos y colores claros de ropa de casa, alguno más vivo)
const COLORES = ['#f4f1ea', '#f4f1ea', '#eeeae0', '#dfe9f2', '#f2d9df', '#f6e7b8', '#d9e8d6', '#e2d8f2', '#c9d6e8', '#e8c9b0', '#c94a3a', '#3f5f8a'];

export class Colada {
  constructor(scene, { quality = 'high' } = {}) {
    this.scene = scene;
    const low = quality === 'low', rnd = mulberry32(4242), cuerdas = [], prendas = [];
    for (const b of TOWN.balcones || []) {
      if (rnd() > (low ? 0.25 : 0.34)) continue;
      const nx = Math.sin(b.ry), nz = Math.cos(b.ry), tx = Math.cos(b.ry), tz = -Math.sin(b.ry), L = 0.8;
      const cx = b.x + nx * 0.62, cy = b.y + 1.0, cz = b.z + nz * 0.62, comba = 0.05;
      // la cuerda, en cuatro tramos con su comba
      const pt = (u) => new THREE.Vector3(cx + tx * u * L, cy - comba * (1 - u * u), cz + tz * u * L);
      for (let k = 0; k < 4; k++) {
        const a = pt(-1 + k / 2), c = pt(-1 + (k + 1) / 2), len = a.distanceTo(c), g = new THREE.BoxGeometry(0.012, 0.012, len);
        g.lookAt(c.clone().sub(a)); g.translate((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2); cuerdas.push(g);
      }
      // las prendas, de un extremo al otro, colgadas de la cuerda
      let u = -0.94;
      while (u < 0.9) {
        const tipo = rnd(), w = tipo < 0.15 ? 0.55 + rnd() * 0.2 : 0.24 + rnd() * 0.22, h = tipo < 0.15 ? 0.6 + rnd() * 0.25 : 0.28 + rnd() * 0.3;
        const m = u + w / L / 2; if (m + w / L / 2 > 0.96) break;
        if (rnd() < 0.85) { const p = pt(m); prendas.push({ x: p.x, y: p.y + 0.01, z: p.z, ry: b.ry, w, h, c: COLORES[Math.floor(rnd() * COLORES.length)] }); }
        u = m + w / L / 2 + 0.06;
      }
    }
    this.n = prendas.length;
    if (!this.n) return;
    const gC = mergeGeometries(cuerdas); cuerdas.forEach(g => g.dispose());
    this.cuerdas = new THREE.Mesh(gC, new THREE.MeshStandardMaterial({ color: '#6a5a48', roughness: 0.9 }));
    this.cuerdas.name = 'colada cuerdas'; this.cuerdas.matrixAutoUpdate = false; scene.add(this.cuerdas);
    // la prenda de 1 × 1, colgada de su lado de arriba (y de 0 a -1); el vaivén, de lado a lado de la fachada y hacia
    // fuera, más cuanto más abajo, cada una a su ritmo (por su sitio)
    const g = new THREE.PlaneGeometry(1, 1, 2, 3); g.translate(0, -0.5, 0);
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, side: THREE.DoubleSide });
    const T = this.T = { value: 0 };
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uT = T;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
{ vec3 ip = vec3(instanceMatrix[3]); float ph = ip.x * 1.7 + ip.z * 1.3, k = -position.y;
  float s = sin(uT * 1.9 + ph + position.x * 1.6) * 0.6 + sin(uT * 3.3 + ph * 1.7) * 0.4;
  transformed.z += s * 0.09 * k * k; transformed.x += s * 0.025 * k; }`);
    };
    mat.customProgramCacheKey = () => 'colada';
    const im = this.prendas = new THREE.InstancedMesh(g, mat, this.n), M = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
    prendas.forEach((p, i) => { im.setMatrixAt(i, M.compose(new THREE.Vector3(p.x, p.y, p.z), q.setFromAxisAngle(Y, p.ry), new THREE.Vector3(p.w, p.h, 1))); im.setColorAt(i, c.set(p.c)); });
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.computeBoundingSphere();
    im.name = 'colada'; im.castShadow = false; im.receiveShadow = true; scene.add(im);
  }
  update(t) { if (this.T) this.T.value = t; }
  dispose() {
    for (const m of [this.cuerdas, this.prendas]) { if (!m) continue; this.scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
    this.cuerdas = this.prendas = null;
  }
}
