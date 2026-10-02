// Control del jugador: movimiento relativo a cámara, colisiones, agua, pendientes, salto
import * as THREE from 'three';
import { groundHeight, waterLevelAt, surfAt, bridgeAt } from '../world/heightfield.js';
import { resolve } from '../world/colliders.js';
import { BOUNDARY } from '../world/layout.js';
import { clamp, damp, dampAngle, angleDiff } from '../util/math.js';
import { makeBlob, placeBlob } from '../util/blob.js';

export class Player {
  constructor(rig, scene) {
    this.rig = rig;
    this.obj = rig.obj;
    scene.add(this.obj);
    this.blob = makeBlob(0.48); if (this.blob) scene.add(this.blob);   // sombra redonda en móviles
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.heading = 0;
    this.speed = 0;
    this.vy = 0;
    this.grounded = true;
    this.radius = 0.35;
    this.walkSpeed = rig.speeds?.walk ?? 3.3; this.runSpeed = rig.speeds?.run ?? 6.8;   // cada personaje a su paso
    this.wade = 0;
    this.stepDist = 0;
    this.onStep = null;   // callback(surface)
    this.onSplash = null;
    this.frozen = false;
    this.turnRate = 0;
    this.lastSafe = new THREE.Vector3();
  }
  place(x, z, heading = 0) {
    this.pos.set(x, groundHeight(x, z), z);
    this.heading = heading; this.vy = 0; this.speed = 0;
    this.lastSafe.copy(this.pos);
    this.sync();
  }
  update(dt, input, camYaw) {
    let mx = 0, mz = 0;
    if (!this.frozen) {
      // dirección relativa a la cámara (adelante = alejándose de la cámara)
      const f = input.move.y, s = input.move.x;
      const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
      mx = -sin * f + cos * s;
      mz = -cos * f - sin * s;
    }
    const mag = Math.min(1, Math.hypot(mx, mz));
    const target = mag * (input.run ? this.runSpeed * (this.tired ? 0.75 : 1) : this.walkSpeed) * (1 - this.wade * 0.55);   // cansado corre más despacio
    this.speed = damp(this.speed, target, mag > 0.01 ? 8 : 10, dt);
    const prevHeading = this.heading;
    if (mag > 0.05) this.heading = dampAngle(this.heading, Math.atan2(mx, mz), 12, dt);
    this.turnRate = angleDiff(prevHeading, this.heading) / Math.max(dt, 1e-4);
    const dirx = Math.sin(this.heading), dirz = Math.cos(this.heading);
    let nx = this.pos.x + dirx * this.speed * dt, nz = this.pos.z + dirz * this.speed * dt;
    // colisiones
    const r = resolve(nx, nz, this.radius);
    nx = r.x; nz = r.z;
    // límites del mundo (montañas)
    const r4 = Math.pow(nx ** 4 + nz ** 4, 0.25);
    if (r4 > BOUNDARY) { const k = BOUNDARY / r4; nx *= k; nz *= k; }
    // pendiente máxima y agua profunda
    const gNew = groundHeight(nx, nz), gOld = groundHeight(this.pos.x, this.pos.z);
    const moved = Math.hypot(nx - this.pos.x, nz - this.pos.z);
    const wl = waterLevelAt(nx, nz);
    const depth = wl - gNew;
    const onBridge = bridgeAt(nx, nz);
    const tooSteep = moved > 1e-4 && (gNew - gOld) / moved > 1.25 && this.grounded;
    const tooDeep = !onBridge && depth > 0.95;
    if (tooSteep || tooDeep) {
      // deslizar: probar solo X o solo Z
      let ok = false;
      for (const [tx, tz] of [[nx, this.pos.z], [this.pos.x, nz]]) {
        const g = groundHeight(tx, tz), m = Math.hypot(tx - this.pos.x, tz - this.pos.z);
        const d2 = waterLevelAt(tx, tz) - g;
        if (m > 1e-4 && (g - gOld) / m <= 1.25 && (bridgeAt(tx, tz) || d2 <= 0.95)) { nx = tx; nz = tz; ok = true; break; }
      }
      if (!ok) { nx = this.pos.x; nz = this.pos.z; }
      if (tooDeep && this.onSplash && Math.random() < 0.1) this.onSplash(this.pos, 0.6);
    }
    const realMoved = Math.hypot(nx - this.pos.x, nz - this.pos.z);
    this.pos.x = nx; this.pos.z = nz;
    const g = groundHeight(nx, nz);
    // salto y gravedad
    if (this.grounded && input.consume(' ') && !this.frozen) { this.vy = 6.6; this.grounded = false; this.onJump?.(); }
    if (!this.grounded) {
      this.vy -= 19 * dt;
      this.pos.y += this.vy * dt;
      if (this.pos.y <= g) { this.pos.y = g; this.grounded = true; if (this.vy < -4) this.onLand?.(-this.vy); this.vy = 0; }
    } else {
      // seguir el suelo (bajar pendientes sin despegar)
      if (g < this.pos.y - 0.6) { this.grounded = false; this.vy = 0; }
      else this.pos.y = damp(this.pos.y, g, 30, dt);
    }
    // agua
    const w = waterLevelAt(nx, nz) - g;
    this.wade = clamp(w / 0.9, 0, 1) * (bridgeAt(nx, nz) ? 0 : 1);
    // pasos
    if (this.grounded && realMoved > 0) {
      this.stepDist += realMoved;
      const stride = this.speed > 4.5 ? 1.35 : 0.8;
      if (this.stepDist > stride) {
        this.stepDist = 0;
        let surf = 'grass';
        if (this.wade > 0.05) surf = 'water';
        else if (bridgeAt(nx, nz)) surf = bridgeAt(nx, nz).wood ? 'wood' : 'stone';
        else if (surfAt('street', nx, nz) > 0.5) surf = 'stone';
        else if (surfAt('dirt', nx, nz) > 0.5) surf = 'dirt';
        else if (surfAt('forest', nx, nz) > 0.5) surf = 'leaves';
        this.onStep?.(surf, this.speed, this.pos);
      }
    }
    if (this.grounded && this.wade < 0.3) this.lastSafe.copy(this.pos);
    this.rig.update(dt, this.grounded ? realMoved / Math.max(dt, 1e-4) : this.speed, this.grounded, this.turnRate);
    this.sync();
  }
  sync() {
    this.obj.position.copy(this.pos);
    this.obj.position.y -= this.wade * 0.15;
    this.obj.rotation.y = this.heading;
    if (this.blob) { const g = groundHeight(this.pos.x, this.pos.z); placeBlob(this.blob, { x: this.pos.x, y: Math.min(this.pos.y, g), z: this.pos.z }, this.obj.visible && this.wade < 0.3); const k = Math.max(0.4, 1 - (this.pos.y - g) * 0.4); this.blob.scale.set(0.95 * k, 1, 0.95 * k); }
  }
}
