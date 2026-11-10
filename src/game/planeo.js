// La capa de planear: un kapusai, la capa de lana de los pastores de montaña, que el explorador abre sobre la cabeza
// con las dos manos y le deja bajar despacio desde un alto. Diseño propio: lana parda con dos listas crema y una
// cenefa en zigzag en el borde. Va colgada del personaje, solo se ve mientras planea y ondea con el viento del
// pueblo (world/viento.js). Los brazos suben a sujetarla encima de la animación de estar quieto, como al conducir
// (game/conducir.js).
import * as THREE from 'three';
import { VIENTO } from '../world/viento.js';

let TEX = null;
function tela() {
  if (TEX) return TEX;
  const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#7a5a3c'; g.fillRect(0, 0, 128, 128);
  // la trama de la lana: rayitas más claras y más oscuras
  for (let i = 0; i < 900; i++) { g.fillStyle = i % 2 ? 'rgba(255,235,200,.07)' : 'rgba(40,24,12,.08)'; g.fillRect((i * 37) % 128, (i * 53) % 128, 1, 3 + (i % 4)); }
  g.fillStyle = '#efe2c4'; g.fillRect(0, 96, 128, 5); g.fillRect(0, 106, 128, 3);
  g.strokeStyle = '#b3202a'; g.lineWidth = 2.4; g.beginPath(); for (let x = 0; x <= 128; x += 8) g.lineTo(x, 116 + (x / 8 % 2 ? 5 : -1)); g.stroke();
  TEX = new THREE.CanvasTexture(c); TEX.colorSpace = THREE.SRGBColorSpace; TEX.anisotropy = 4;
  return TEX;
}
const X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1), _q = new THREE.Quaternion(), _qc = new THREE.Quaternion(), _ax = new THREE.Vector3();

export class Capa {
  constructor(player) {
    this.P = player; this.k = 0; this.abierta = false;
    const alto = new THREE.Box3().setFromObject(player.obj).getSize(new THREE.Vector3()).y / (player.obj.scale.y || 1) || 1.5;
    // una vela curva: más alta en el centro y caída por detrás y por los lados
    const geo = new THREE.PlaneGeometry(1.9, 1.35, 10, 7), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -0.42 * x * x - 0.16 * (y + 0.675) * (y + 0.675)); }
    geo.rotateX(-Math.PI / 2); geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ map: tela(), side: THREE.DoubleSide });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uT = VIENTO.uT; sh.uniforms.uWind = VIENTO.uWind;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT, uWind;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n{ float b = smoothstep(-0.1, 0.7, position.z) + abs(position.x) * 0.5; transformed.y += (sin(uT * 7.0 + position.x * 4.0 + position.z * 5.0) * 0.045 + sin(uT * 11.0 + position.z * 9.0) * 0.02) * b * (0.6 + 0.4 * uWind); }');
    };
    this.mesh = new THREE.Mesh(geo, mat); this.mesh.castShadow = true; this.mesh.frustumCulled = false; this.mesh.visible = false; this.mesh.name = 'capa';
    this.mesh.position.set(0, alto * 1.16, -0.28); this.mesh.rotation.x = -0.32;
    player.obj.add(this.mesh);
    const c = player.rig?.char; this.B = {}; c?.root?.traverse(o => { if (o.isBone) this.B[o.name] = o; });
  }
  /** Gira un hueso alrededor de un eje del personaje (X: cabecea; Z: se abre a los lados), con la pose de este fotograma. */
  gira(b, eje, a) {
    const raiz = this.P.rig?.char?.root; if (!b || !raiz) return;
    _qc.identity(); for (let o = b; o && o !== raiz; o = o.parent) _qc.premultiply(o.quaternion);
    _ax.copy(eje).applyQuaternion(_qc.invert()); b.quaternion.multiply(_q.setFromAxisAngle(_ax, a));
  }
  abre(on) {
    if (on === this.abierta) return; this.abierta = on;
    const c = this.P.rig?.char;
    if (on) {
      this.mesh.visible = true;
      if (c && this.B.mixamorigLeftArm) { this.postAntes = c.post; c.post = () => { const k = this.k, B = this.B; this.gira(B.mixamorigLeftArm, Z, 2.25 * k); this.gira(B.mixamorigRightArm, Z, -2.25 * k); this.gira(B.mixamorigLeftForeArm, Z, 0.35 * k); this.gira(B.mixamorigRightForeArm, Z, -0.35 * k); this.gira(B.mixamorigLeftUpLeg, X, 0.35 * k); this.gira(B.mixamorigRightUpLeg, X, 0.15 * k); }; this.puesta = c; }
    }
  }
  update(dt) {
    this.k += ((this.abierta ? 1 : 0) - this.k) * Math.min(1, dt * 9);
    this.mesh.scale.setScalar(0.25 + 0.75 * this.k);
    if (!this.abierta && this.k < 0.04 && this.mesh.visible) { this.mesh.visible = false; if (this.puesta) { this.puesta.post = this.postAntes || null; this.puesta = null; } }
  }
  dispose() { if (this.puesta) this.puesta.post = this.postAntes || null; this.mesh.parent?.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}
