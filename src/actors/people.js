// Vecinos y seres de leyenda: figuras articuladas procedurales con animación propia
import * as THREE from 'three';
import { groundHeight } from '../world/heightfield.js';
import { resolve, addMover } from '../world/colliders.js';
import { damp, dampAngle } from '../util/math.js';
import { buildMinifig, lookToMinifig, MinifigAnimator, setOutlines } from './minifig.js';
import { buildNpc, npcsReady } from './npcGlb.js';
import { makeBlob } from '../util/blob.js';
import { nameFor } from '../data/nombres.js';

const matCache = new Map();
export function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o }));
  return matCache.get(key);
}

// ---- Actor con comportamiento ----
// Detalle por distancia de los personajes, una vez por fotograma (lo usan los pueblos y Salazar):
// - fuera de la cámara no se dibujan (se siguen moviendo y se animan a saltos)
// - solo proyectan sombra cerca, y solo las piezas grandes (cuerpo, cabeza, pelo)
// - la cara con detalle (ojos, cejas, boca) solo de cerca
const _frustum = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sph = new THREE.Sphere();
export function frameFrustum(camera) { camera.updateMatrixWorld(); _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); _frustum.setFromProjectionMatrix(_pm); return _frustum; }
export function cullActor(a, d, max, dt, player, fr = _frustum) {
  const sh = d < 28;
  if (a.shadowOn !== sh) { a.shadowOn = sh; a.obj.traverse(o => { if (o.isMesh && !o.userData.outline) o.castShadow = sh && !o.userData.noShadow; }); }
  _sph.center.set(a.pos.x, a.pos.y + 0.9, a.pos.z); _sph.radius = 2.2;
  a.onScreen = d < max && (d < 5 || fr.intersectsSphere(_sph));
  if (d < max + 15) a.update(dt, player);
  a.obj.visible = a.visible !== false && d < max;
  if (a.glb) { a.glb.root.visible = a.onScreen; a.glb.setFaceVisible?.(d < 18); }
}

export class Actor {
  constructor(def, scene) {
    this.def = def;
    this.id = def.id; this.name = def.name;
    // todos (vecinos, carnaval y seres de leyenda) con el cuerpo de los personajes nuevos; la minifigura solo si aún no han cargado
    const n = npcsReady() ? buildNpc(def.look) : null;
    if (n) { this.obj = n.obj; this.glb = n.char; this.anim = n.anim; this.J = {};
      // el nombre va con el cuerpo: un chico con nombre de chico y una chica con nombre de chica (los seres de leyenda, como son)
      if (!def.look?.myth) this.name = nameFor(def.name, n.obj.userData.sex); }
    else { this.obj = buildMinifig(lookToMinifig(def.look || {})); this.J = this.obj.userData.J; this.anim = new MinifigAnimator(this.obj); }
    scene.add(this.obj);
    this.blob = makeBlob(0.42); if (this.blob) { this.blob.position.y = 0.03; this.obj.add(this.blob); }   // va con el vecino
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
    this.collider = addMover(def.x, def.z, 0.4, { actor: this, ghost: false });
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
          else if (this.wander > 0) { this.target = this.pickWander(); if (this.target) this.state = 'walk'; }
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
    this.moved = 0;
    if (this.speed > 0.01) {
      let nx = this.pos.x + Math.sin(this.heading) * this.speed * dt, nz = this.pos.z + Math.cos(this.heading) * this.speed * dt;
      const r = resolve(nx, nz, this.radius, this.collider);
      // contra una pared o una persona: no se queda andando sin avanzar (antes empujaba 1,5 s y lo volvía a intentar)
      if (r.hit && this.state === 'walk') { this.stuck = (this.stuck || 0) + dt; if (this.stuck > 0.6) { this.state = 'idle'; this.stuck = 0; this.target = null; this.wait = 0.8 + Math.random() * 1.5; } }
      else this.stuck = 0;
      this.moved = Math.hypot(r.x - this.pos.x, r.z - this.pos.z);
      this.pos.x = r.x; this.pos.z = r.z;
      this.phase += this.speed * dt * 4.2;
    }
    // las piernas siguen a lo que avanza de verdad (si algo le frena, no anda en el sitio ni patina)
    this.vSpeed = damp(this.vSpeed || 0, dt > 0 ? this.moved / dt : 0, 10, dt);
    if (this.lookAt && this.speed < 0.3) this.heading = dampAngle(this.heading, Math.atan2(this.lookAt.x - this.pos.x, this.lookAt.z - this.pos.z), 5, dt);
    this.pos.y = groundHeight(this.pos.x, this.pos.z);
    this.collider.x = this.pos.x; this.collider.z = this.pos.z;
    // animación por distancia: fuera de cámara o lejos se anima a saltos (se acumula el tiempo), cerca en cada fotograma
    this.animAcc = (this.animAcc || 0) + dt;
    const every = this.onScreen === false ? 0.3 : dP > 60 ? 0.066 : dP > 40 ? 0.033 : 0;   // a la vista, fluidos hasta 40 m
    if (this.animAcc >= every) { this.animate(this.animAcc); this.animAcc = 0; }
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
    this.anim.update(dt, { speed: this.state === 'walk' ? Math.min(this.speed, this.vSpeed ?? this.speed) : this.speed, grounded: true, talking: this.talking, wave: this.wave, dance: this.dance, lookYaw, bent: this.def.look?.bent || 0, cheer: this.cheer || 0, clap: this.clap || 0 });
    if (this.cheer > 0) this.cheer -= dt;
    if (this.clap > 0) this.clap -= dt;
  }
  say(sec = 3) { this.talking = sec; }
  // un sitio al que pasear: dentro de su zona, sin caer dentro de una casa ni de un muro (y con el camino despejado a
  // medias); si no encuentra ninguno, se queda donde está
  pickWander() {
    for (let k = 0; k < 6; k++) {
      const a = Math.random() * 6.28, r = (0.35 + Math.random() * 0.65) * this.wander;
      const x = this.home.x + Math.cos(a) * r, z = this.home.z + Math.sin(a) * r;
      if (resolve(x, z, 0.45, this.collider).hit) continue;
      if (resolve((x + this.pos.x) / 2, (z + this.pos.z) / 2, 0.4, this.collider).hit) continue;
      return { x, z };
    }
    return null;
  }
  sync() {
    this.obj.position.copy(this.pos);
    this.obj.rotation.y = this.heading;
    this.obj.visible = this.visible;
  }
}
