// Cámara en tercera persona con órbita, zoom, seguimiento suave y colisión
import * as THREE from 'three';
import { groundHeight } from './world/heightfield.js';
import { nearby } from './world/colliders.js';
import { clamp, damp, dampAngle, lerp } from './util/math.js';

export class FollowCamera {
  constructor(camera) {
    this.cam = camera;
    // más cerca en pantallas pequeñas: el personaje se ve mejor en el móvil
    const d0 = innerWidth < innerHeight ? 5.6 : innerHeight < 560 ? 6 : 6.6;
    this.yaw = Math.PI; this.pitch = 0.3; this.dist = d0;
    this.targetDist = d0;
    this.focus = new THREE.Vector3();
    this.idle = 0;
    this.shake = 0;
    this.cinematic = null; // {pos, look, t}
    this.curDist = d0;
  }
  snap(player) {
    this.yaw = player.heading + Math.PI;
    this.focus.copy(player.pos).add(new THREE.Vector3(0, 1.5, 0));
    this.update(0.1, player, { look: { dx: 0, dy: 0 }, zoom: 0, move: { x: 0, y: 0 } }, true);
  }
  update(dt, player, input, instant = false) {
    const sens = input.touch ? 0.006 : 0.005;
    if (input.look.dx || input.look.dy) this.idle = 0; else this.idle += dt;
    this.yaw -= input.look.dx * sens;
    this.pitch = clamp(this.pitch + input.look.dy * sens, -0.15, 1.2);
    if (input.zoom) this.targetDist = clamp(this.targetDist + input.zoom * 0.9, 3, 16);
    // seguimiento automático suave detrás del jugador cuando se mueve y no se toca la cámara
    const moving = Math.hypot(input.move.x, input.move.y) > 0.1;
    if (moving && this.idle > 1.2 && input.move.y > -0.3) this.yaw = dampAngle(this.yaw, player.heading + Math.PI, 1.2 * Math.abs(input.move.y) + 0.3 * Math.abs(input.move.x), dt);
    const want = new THREE.Vector3(player.pos.x, player.pos.y + 1.45, player.pos.z);
    if (instant) this.focus.copy(want);
    else { this.focus.x = damp(this.focus.x, want.x, 14, dt); this.focus.z = damp(this.focus.z, want.z, 14, dt); this.focus.y = damp(this.focus.y, want.y, 8, dt); }
    if (this.cinematic) {
      const c = this.cinematic;
      c.t += dt;
      const k = instant ? 1 : 1 - Math.exp(-2.5 * dt);
      this.cam.position.lerp(c.pos, k);
      const look = c.lookCur || (c.lookCur = this.focus.clone());
      look.lerp(c.look, k);
      this.cam.lookAt(look);
      return;
    }
    // distancia con colisión
    let d = this.targetDist;
    const dir = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    const step = 0.4;
    for (let t = 0.6; t < d; t += step) {
      const x = this.focus.x + dir.x * t, z = this.focus.z + dir.z * t, y = this.focus.y + dir.y * t;
      let hit = false;
      for (const c of nearby(x, z, 0.5)) {
        if (c.type !== 'box' || !c.solidView) continue;
        const dx = x - c.x, dz = z - c.z;
        const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
        if (Math.abs(lx) < c.hw + 0.3 && Math.abs(lz) < c.hd + 0.3 && y < (c.top ?? 99)) { hit = true; break; }
      }
      if (hit) { d = Math.max(1.6, t - 0.4); break; }
    }
    this.curDist = instant ? d : (d < this.curDist ? damp(this.curDist, d, 20, dt) : damp(this.curDist, d, 3, dt));
    const p = this.focus.clone().addScaledVector(dir, this.curDist);
    const gy = groundHeight(p.x, p.z) + 0.45;
    if (p.y < gy) p.y = gy;
    if (this.shake > 0) { this.shake -= dt; p.x += (Math.random() - 0.5) * this.shake * 0.3; p.y += (Math.random() - 0.5) * this.shake * 0.3; }
    this.cam.position.copy(p);
    this.cam.lookAt(this.focus.x, this.focus.y + 0.1, this.focus.z);
  }
  // yaw de la cámara para mover al jugador (dirección de "adelante")
  moveYaw() { return this.yaw + Math.PI; }
}
