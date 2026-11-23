// Islotes flotantes hechos en 3D con Higgsfield (prueba del autor, 23 nov 2026: «generar las islas flotantes con
// Higgsfield en 3D»). La comarca que sube es una pieza calculada sobre su contorno real (mapa3dIsla.js) y una roca fija no
// encaja en ese contorno; el modelo de Higgsfield, que es una isla entera (prado, roca en bloques, musgo y raíces), va
// suelto: tres islotes pequeños que flotan alrededor de la comarca cuando ya está arriba, meciéndose despacio.
// De momento, solo con el Pirineo (ISLOTES_HF). El modelo: src/assets/hf3d/islote.glb (25.000 triángulos, 480 KB).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { loadGLB } from '../util/glb.js';
import isloteUrl from '../assets/hf3d/islote.glb?url';

export const ISLOTES_HF = { pirineo: true };
// (cada islote: ángulo alrededor de la comarca, distancia en radios máximos, altura en partes de lo que cuelga la roca
// desde donde empieza, tamaño en radios medios y su ritmo; a los lados de la isla y uno detrás, por encima, contra el cielo)
const SITIOS = [[0.55, 0.98, -0.2, 0.3, 0.0], [2.85, 1.0, 0.0, 0.27, 1.7], [-1.9, 1.0, 0.45, 0.2, 3.1]];
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export class IslotesHF {
  constructor(scene) {
    this.g = new THREE.Group(); this.g.name = 'islotes-hf'; this.g.visible = false; scene.add(this.g); this.piezas = [];
    loadGLB(new GLTFLoader().setMeshoptDecoder(MeshoptDecoder), isloteUrl).then(gl => {
      const m = gl.scene, b = new THREE.Box3().setFromObject(m), s = b.getSize(new THREE.Vector3()), k = 1 / Math.max(s.x, s.z);
      // (de ancho 1, con el centro de su prado en el origen: así se escala con el radio de la comarca)
      m.position.set(-(b.min.x + b.max.x) / 2 * k, -b.max.y * k + 0.08 * s.y * k, -(b.min.z + b.max.z) / 2 * k); m.scale.setScalar(k);
      for (const [a, , , , f] of SITIOS) { const h = new THREE.Group(), c = this.piezas.length ? m.clone(true) : m; h.add(c); h.rotation.y = a * 1.7 + f; this.g.add(h); this.piezas.push(h); }
    }).catch(e => console.warn('islotes de Higgsfield', e));
  }
  /** isla: la de mapa3dIsla.js; py: la altura de la comarca; k: cuánto ha subido (0 a 1); t: el tiempo */
  update(isla, py, k, t) {
    const v = ss(0.55, 1, k); this.g.visible = v > 0.01 && this.piezas.length > 0;
    if (!this.g.visible) return;
    this.piezas.forEach((h, i) => {
      const [a, r, y, s, f] = SITIOS[i], sc = isla.rMed * s * (0.4 + 0.6 * v);
      h.scale.setScalar(sc);
      h.position.set(isla.cx + Math.cos(a) * isla.rMax * r, py + y * isla.D + Math.sin(t * 0.5 + f) * 0.025 * isla.rMed - (1 - v) * 0.4 * isla.D, isla.cz + Math.sin(a) * isla.rMax * r);
      h.rotation.y += 0.0008;
    });
  }
}
