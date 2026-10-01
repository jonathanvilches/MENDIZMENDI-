// Vecinos y seres de leyenda: figuras articuladas procedurales con animación propia
import * as THREE from 'three';
import { groundHeight } from '../world/heightfield.js';
import { resolve, addCircle } from '../world/colliders.js';
import { clamp, damp, dampAngle, lerp, mulberry32 } from '../util/math.js';
import { buildMinifig, lookToMinifig, MinifigAnimator, setOutlines } from './minifig.js';
import { buildNpc, npcsReady } from './npcGlb.js';

const matCache = new Map();
export function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o }));
  return matCache.get(key);
}

// ---- Actor con comportamiento ----
export class Actor {
  constructor(def, scene) {
    this.def = def;
    this.id = def.id; this.name = def.name;
    // vecinos: el mismo modelo que el personaje principal; los seres de leyenda y carnaval (mini) siguen con su traje propio
    const L = def.look || {};
    const costume = L.fur || L.horns || L.duck || L.feet === 'duck' || L.crown || L.ribbons || L.bell || L.shaggy || ['mask', 'cone', 'basket'].includes(L.hat);
    if (!def.mini && !costume && npcsReady()) { const n = buildNpc(def.look); this.obj = n.obj; this.glb = n.char; this.anim = n.anim; this.J = {}; }
    else { this.obj = buildMinifig(def.mini || lookToMinifig(def.look)); this.J = this.obj.userData.J; this.anim = new MinifigAnimator(this.obj); }
    scene.add(this.obj);
    this.pos = new THREE.Vector3(def.x, 0, def.z);
    this.home = { x: def.x, z: def.z };
    this.heading = def.heading ?? 0;
    this.speed = 0; this.t = Math.random() * 10; this.phase = 0;
    this.talking = 0; this.state = 'idle'; this.wait = 1 + Math.random() * 3;
    this.target = null;
    this.route = def.route || null; this.routeI = 0;
    this.wander = def.wander ?? 0;
    this.walkSpeed = def.walkSpeed ?? 1.2;
    this.lookAt = null; this.gesture = 0; this.dance = 0; this.wave = 0;
    this.blink = 2;
    this.radius = 0.35;
    this.visible = true;
    this.collider = addCircle(def.x, def.z, 0.4, { actor: this, ghost: false });
    this.pos.y = groundHeight(def.x, def.z);
    this.sync();
  }
  setPos(x, z, heading) { this.pos.set(x, groundHeight(x, z), z); this.home = { x, z }; if (heading != null) this.heading = heading; this.sync(); }
  update(dt, player) {
    this.t += dt;
    const dP = player ? Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z) : 99;
    setOutlines(this.obj, dP < 22);
    // mira al jugador si está cerca
    const near = dP < 4.5 && !this.dance;
    let moving = false;
    if (this.talking > 0 || (near && this.state !== 'walk')) {
      this.lookAt = player.pos;
    } else this.lookAt = null;
    if (this.talking <= 0 && !this.frozen && !this.dance) {
      if (this.state === 'idle') {
        this.wait -= dt;
        if (this.wait <= 0 && !near) {
          if (this.route) { this.target = this.route[this.routeI]; this.routeI = (this.routeI + 1) % this.route.length; this.state = 'walk'; }
          else if (this.wander > 0) { const a = Math.random() * 6.28, r = Math.random() * this.wander; this.target = { x: this.home.x + Math.cos(a) * r, z: this.home.z + Math.sin(a) * r }; this.state = 'walk'; }
          this.wait = 2 + Math.random() * 5;
        }
      } else if (this.state === 'walk' && this.target) {
        const dx = this.target.x - this.pos.x, dz = this.target.z - this.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.4 || (near && !this.ignorePlayer)) { this.state = 'idle'; this.target = d < 0.4 ? null : this.target; }
        else {
          this.heading = dampAngle(this.heading, Math.atan2(dx, dz), 6, dt);
          this.speed = damp(this.speed, this.target.run ? this.walkSpeed * 3 : this.walkSpeed, 5, dt);
          moving = true;
        }
      }
    }
    if (!moving) this.speed = damp(this.speed, 0, 8, dt);
    if (this.speed > 0.01) {
      let nx = this.pos.x + Math.sin(this.heading) * this.speed * dt, nz = this.pos.z + Math.cos(this.heading) * this.speed * dt;
      const r = resolve(nx, nz, this.radius, this.collider);
      if (r.hit && this.state === 'walk') { this.stuck = (this.stuck || 0) + dt; if (this.stuck > 1.5) { this.state = 'idle'; this.stuck = 0; this.target = null; } }
      this.pos.x = r.x; this.pos.z = r.z;
      this.phase += this.speed * dt * 4.2;
    }
    if (this.lookAt && this.speed < 0.3) this.heading = dampAngle(this.heading, Math.atan2(this.lookAt.x - this.pos.x, this.lookAt.z - this.pos.z), 5, dt);
    this.pos.y = groundHeight(this.pos.x, this.pos.z);
    this.collider.x = this.pos.x; this.collider.z = this.pos.z;
    this.animate(dt);
    this.sync();
  }
  animate(dt) {
    if (this.talking > 0) this.talking -= dt;
    if (this.wave > 0) this.wave -= dt;
    let lookYaw = 0;
    if (this.lookAt && this.speed < 0.3) {
      const want = Math.atan2(this.lookAt.x - this.pos.x, this.lookAt.z - this.pos.z);
      lookYaw = Math.max(-0.9, Math.min(0.9, Math.atan2(Math.sin(want - this.heading), Math.cos(want - this.heading))));
    }
    this.anim.update(dt, { speed: this.speed, grounded: true, talking: this.talking, wave: this.wave, dance: this.dance, lookYaw, bent: this.def.look?.bent || 0, cheer: this.cheer || 0, clap: this.clap || 0 });
    if (this.cheer > 0) this.cheer -= dt;
    if (this.clap > 0) this.clap -= dt;
  }
  say(sec = 3) { this.talking = sec; }
  sync() {
    this.obj.position.copy(this.pos);
    this.obj.rotation.y = this.heading;
    this.obj.visible = this.visible;
  }
}
