// Sombra redonda bajo los personajes cuando no hay sombras en tiempo real (calidad baja, móviles): un disco oscuro y
// suave pegado al suelo. Cuesta casi nada y ancla al personaje en el suelo.
import * as THREE from 'three';
import { QUALITY } from './quality.js';

let GEO = null, MAT = null;
function tex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 2, 32, 32, 31); r.addColorStop(0, 'rgba(0,0,0,0.55)'); r.addColorStop(0.6, 'rgba(0,0,0,0.3)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
/** Disco de sombra para un personaje (o null si hay sombras de verdad). Se coloca con placeBlob(). */
export function makeBlob(radius = 0.45) {
  if (QUALITY !== 'low') return null;
  GEO ||= new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  MAT ||= new THREE.MeshBasicMaterial({ map: tex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const m = new THREE.Mesh(GEO, MAT); m.scale.set(radius * 2, 1, radius * 2); m.renderOrder = 1; m.frustumCulled = true; m.userData.noShadow = true;
  return m;
}
/** Pone el disco bajo el personaje (pos: sus pies), en el mundo. */
export function placeBlob(m, pos, visible = true) { if (!m) return; m.position.set(pos.x, pos.y + 0.03, pos.z); m.visible = visible; }
