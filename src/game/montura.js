// Monturas: una pottoka (el caballo pequeño y fuerte de los montes de Navarra) o un burro, atados junto a la entrada
// del pueblo. Con el botón de acción se monta y se baja. Se llevan como se anda: la palanca o las flechas, hacia donde
// se quiere ir, y la montura gira y coge paso sola (al paso con poco, al trote y al galope con la palanca a fondo o
// corriendo). No se meten en agua honda ni suben cuestas fuertes. Es el mismo trato que el tractor (game/conducir.js):
// mientras se va montado, quien mueve al jugador es la montura.
import * as THREE from 'three';
import { Animal } from '../actors/animals.js';
import { groundHeight, waterLevelAt } from '../world/heightfield.js';
import { resolve } from '../world/colliders.js';
import { BOUNDARY } from '../world/layout.js';
import { damp, dampAngle } from '../util/math.js';

// paso y vmax, en m/s; r, el radio con el que choca; dist, la distancia de la cámara; silla, a qué altura va sentado
export const MONTURAS = {
  pottoka: { paso: 2.2, vmax: 9.2, giro: 5, r: 0.7, dist: 8.5, silla: 1.12, nombre: 'la pottoka', subir: 'Montar la pottoka', bajar: 'Bajar de la pottoka' },
  burro: { paso: 1.8, vmax: 5.4, giro: 4, r: 0.65, dist: 7.5, silla: 0.98, nombre: 'el burro', subir: 'Montar el burro', bajar: 'Bajar del burro' },
};
const X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1), _q = new THREE.Quaternion(), _qc = new THREE.Quaternion(), _ax = new THREE.Vector3();

export class Montura {
  constructor(game, tipo, x, z, heading = 0) {
    this.g = game; this.tipo = tipo; this.T = MONTURAS[tipo];
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    this.A = new Animal(tipo, x, z, { range: 0, flee: 0, scale: 1, radius: this.T.r }, rnd, game.scene);
    this.A.heading = heading; this.A.state = 'idle'; this.A.sync();
    this.x = x; this.z = z; this.heading = heading; this.speed = 0;
  }
  get collider() { return this.A.collider; }
  sube(P) {
    if (this.P) return;
    const F = this.g.follow;
    this.P = P; P.vehiculo = this; P.speed = 0; P.ponModo?.('pie'); this.distAntes = F.targetDist; F.targetDist = this.T.dist;
    document.body.classList.add('conduce');
    if (P.collider) P.collider.ghost = true;
    if (P.blob) P.blob.visible = false;
    this.sienta(P);
    this.g.sound?.ui?.('click');
  }
  baja() {
    const P = this.P; if (!P) return null;
    const F = this.g.follow;
    if (this.sentado) { this.sentado.post = this.postAntes || null; this.sentado = null; }
    P.vehiculo = null; this.P = null; this.speed = 0; this.A.speed = 0; F.targetDist = this.distAntes ?? F.targetDist; document.body.classList.remove('conduce');
    const s = Math.sin(this.heading), c = Math.cos(this.heading);
    for (const k of [1, -1]) {
      const x = this.x + c * (this.T.r + 0.8) * k, z = this.z - s * (this.T.r + 0.8) * k, r = resolve(x, z, P.radius, P.collider);
      if (Math.hypot(r.x - x, r.z - z) < 0.3 || k === -1) { P.place(r.x, r.z, this.heading); break; }
    }
    if (P.collider) P.collider.ghost = false;
    P.obj.visible = true;
    return P;
  }
  // a horcajadas: muslos abiertos y adelante, rodillas dobladas y manos a las crines, encima de la animación de estar quieto
  sienta(P) {
    const c = P.rig?.char, B = {}; c?.root?.traverse(o => { if (o.isBone) B[o.name] = o; });
    if (!c || !B.mixamorigLeftUpLeg || !B.mixamorigHips) { this.sentado = null; return; }
    const gira = (b, eje, a) => { if (!b) return; _qc.identity(); for (let o = b; o && o !== c.root; o = o.parent) _qc.premultiply(o.quaternion); _ax.copy(eje).applyQuaternion(_qc.invert()); b.quaternion.multiply(_q.setFromAxisAngle(_ax, a)); };
    this.postAntes = c.post;
    c.post = () => { gira(B.mixamorigLeftUpLeg, X, -1.15); gira(B.mixamorigRightUpLeg, X, -1.15); gira(B.mixamorigLeftUpLeg, Z, 0.5); gira(B.mixamorigRightUpLeg, Z, -0.5); gira(B.mixamorigLeftLeg, X, 1.2); gira(B.mixamorigRightLeg, X, 1.2); gira(B.mixamorigLeftArm, X, -0.75); gira(B.mixamorigRightArm, X, -0.75); gira(B.mixamorigLeftForeArm, X, -0.4); gira(B.mixamorigRightForeArm, X, -0.4); };
    P.obj.position.set(0, 0, 0); P.obj.rotation.set(0, 0, 0); P.obj.updateMatrixWorld(true);
    this.alturaCadera = B.mixamorigHips.getWorldPosition(new THREE.Vector3()).y / Math.max(1e-3, P.obj.scale.y || 1);
    this.sentado = c;
  }
  update(dt, input, P, camYaw = this.g.follow?.yaw ?? 0) {
    const T = this.T, A = this.A;
    input.consume?.(' ');
    // como andando: hacia donde apunta la palanca, vista desde la cámara
    const f = input.move?.y || 0, s = input.move?.x || 0, sin = Math.sin(camYaw), cos = Math.cos(camYaw);
    const mx = -sin * f + cos * s, mz = -cos * f - sin * s, mag = Math.min(1, Math.hypot(mx, mz));
    const quiere = mag < 0.08 ? 0 : (input.run || mag > 0.92 ? T.vmax : mag > 0.5 ? T.vmax * 0.5 : T.paso) * (P.tired ? 0.8 : 1);
    this.speed = damp(this.speed, quiere, quiere > this.speed ? 1.6 : 3, dt);
    if (mag > 0.08) this.heading = dampAngle(this.heading, Math.atan2(mx, mz), T.giro / (1 + this.speed * 0.25), dt);
    let nx = this.x + Math.sin(this.heading) * this.speed * dt, nz = this.z + Math.cos(this.heading) * this.speed * dt;
    const r = resolve(nx, nz, T.r, A.collider);
    if (Math.hypot(r.x - nx, r.z - nz) > 0.02) this.speed *= 0.7;
    nx = r.x; nz = r.z;
    const r4 = Math.pow(nx ** 4 + nz ** 4, 0.25); if (r4 > BOUNDARY) { const k = BOUNDARY / r4; nx *= k; nz *= k; this.speed *= 0.5; }
    const gNew = groundHeight(nx, nz), gOld = groundHeight(this.x, this.z), m = Math.hypot(nx - this.x, nz - this.z);
    if (waterLevelAt(nx, nz) - gNew > 0.75 || (m > 1e-4 && (gNew - gOld) / m > 1.0)) { nx = this.x; nz = this.z; this.speed = 0; }
    this.x = nx; this.z = nz;
    A.pos.set(nx, groundHeight(nx, nz), nz); A.heading = this.heading; A.speed = this.speed; A.state = 'walk'; A.t += dt; A.animate(dt); A.sync();
    P.pos.set(nx, A.pos.y + 0.55, nz); P.heading = this.heading; P.speed = this.speed;
    if (P.collider) { P.collider.x = nx; P.collider.z = nz; }
    // el jinete, en su sitio sobre el lomo, con el vaivén del paso
    const bote = Math.abs(Math.sin(A.t * (2 + this.speed * 0.9))) * Math.min(0.07, this.speed * 0.012);
    if (this.sentado) { P.obj.position.set(nx, A.pos.y + T.silla - this.alturaCadera * (P.obj.scale.y || 1) + 0.06 + bote, nz); P.obj.rotation.set(0, this.heading, 0, 'YXZ'); P.rig.update(dt, 0, true, 0); }
    else { P.obj.position.set(nx, A.pos.y + T.silla - 0.7 + bote, nz); P.obj.rotation.set(0, this.heading, 0, 'YXZ'); P.rig.update(dt, 0, true, 0); }
    if (this.speed > 4 && (this.polvo = (this.polvo || 0) - dt) <= 0) { this.polvo = 0.2; this.g.particles?.emit({ x: nx, y: A.pos.y + 0.15, z: nz }, { n: 2, color: ['#c9b58c', '#b39d73'], speed: 0.6, size: 0.4, life: 0.7, gravity: -0.3, spread: 0.9 }); }
  }
  /** Suelta: quieta en su sitio, pastando */
  quieta(dt, player) { if (this.P) return; this.A.speed = 0; this.A.state = 'graze'; this.A.t += dt; this.A.dist = Math.hypot(this.x - player.pos.x, this.z - player.pos.z); this.A.animate(dt); }
  dispose() { if (this.P) this.baja(); this.A.obj.parent?.remove(this.A.obj); const i = this.A.collider; if (i) i.ghost = true; }
}
