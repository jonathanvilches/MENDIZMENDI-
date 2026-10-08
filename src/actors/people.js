// Vecinos y seres de leyenda: figuras articuladas procedurales con animación propia
import * as THREE from 'three';
import { groundHeight } from '../world/heightfield.js';
import { resolve, addMover, MOVERS } from '../world/colliders.js';
import { requestPath, walkable, segClear } from '../world/nav.js';
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
    // al empezar, si ha quedado dentro de algo que se puso después (un puesto, la tienda), sale a un lado
    if (!this.settled) { this.settled = true; if (!this.frozen) { const r = resolve(this.pos.x, this.pos.z, this.radius, this.collider); if (r.hit && !r.mover) { this.pos.x = r.x; this.pos.z = r.z; this.home = { x: r.x, z: r.z }; } } }
    const dP = player ? Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z) : 99;
    setOutlines(this.obj, dP < 22);
    // mira al jugador si está cerca; los que pasean solo se paran si se les pone delante (antes se quedaban
    // clavados en mitad de la calle en cuanto el jugador se acercaba)
    const walker = !!(this.route || this.wander > 0);
    const near = dP < 4.5 && !this.dance, blocking = walker ? dP < 2.2 && !this.dance : near;
    let moving = false;
    if (this.chatWith && this.talking > 0) this.lookAt = this.chatWith.pos;
    else if (this.talkTo && this.talking > 0) this.lookAt = this.talkTo;   // (en su tarea: hablando con quien atiende en la tienda, por ejemplo)
    else if (this.talking > 0 || (near && this.state !== 'walk')) { this.lookAt = player.pos; this.chatWith = null; this.talkTo = null; }
    else { this.lookAt = null; this.chatWith = null; }
    if (this.talking <= 0 && !this.frozen && !this.dance) {
      if (this.state === 'idle') {
        this.wait -= dt;
        if (this.wait <= 0 && !blocking) {
          // seguir hacia donde iba (si se paró por el jugador) o elegir otro destino
          let goal = this.goal && !this.arrived ? this.goal : null;
          if (!goal && this.route) { goal = this.route[this.routeI]; this.routeI = (this.routeI + 1) % this.route.length; }
          else if (!goal && this.wander > 0) goal = this.pickWander();
          if (goal) this.goTo(goal);
          this.wait = 2 + Math.random() * 5;
        } else if (this.arrived && !this.lookAt && walker) {
          // en su destino: mira a un lado y a otro de vez en cuando (no se queda como una estatua)
          if ((this.lookT = (this.lookT ?? 1.5) - dt) <= 0) { this.lookT = 1.5 + Math.random() * 3; this.lookHeading = this.heading + (Math.random() - 0.5) * 1.6; }
          if (this.lookHeading != null) this.heading = dampAngle(this.heading, this.lookHeading, 2.5, dt);
        }
      } else if (this.state === 'walk' && this.target) {
        const dx = this.target.x - this.pos.x, dz = this.target.z - this.pos.z, d = Math.hypot(dx, dz);
        const last = !this.path || !this.path.length;
        if (blocking && !this.ignorePlayer) { this.state = 'idle'; this.wait = 1 + Math.random(); }
        // (un punto intermedio se da por alcanzado a 0,9 m solo si desde ahí se ve el siguiente; si no, al llegar: en
        // una esquina, cortarla de lejos le llevaba contra la pared)
        else if (d < (last ? 0.45 : 0.3) || (!last && d < 0.9 && segClear(this.pos.x, this.pos.z, this.path[0].x, this.path[0].z, this.radius))) {
          if (!last) this.target = this.path.shift();
          else this.arrive();
        } else {
          // esquivar a quien se le cruza: se aparta un poco hacia un lado mientras pasa
          let want = Math.atan2(dx, dz);
          if (this.dodge > 0) { this.dodge -= dt; want += this.dodgeSide * 0.85; }
          this.heading = dampAngle(this.heading, want, 6, dt);
          const run = this.goal?.run || this.target.run;
          this.speed = damp(this.speed, run ? this.walkSpeed * 3 : this.walkSpeed, 5, dt);
          moving = true;
        }
      }
    }
    if (!moving) this.speed = damp(this.speed, 0, 8, dt);
    this.moved = 0;
    if (this.speed > 0.01) {
      const want = this.speed * dt;
      let nx = this.pos.x + Math.sin(this.heading) * want, nz = this.pos.z + Math.cos(this.heading) * want;
      const r = resolve(nx, nz, this.radius, this.collider);
      this.moved = Math.hypot(r.x - this.pos.x, r.z - this.pos.z);
      if (this.state === 'walk') {
        if (r.mover && !(this.dodge > 0)) { this.dodge = 0.7; this.dodgeSide = Math.sign((r.x - r.mover.x) * Math.cos(this.heading) - (r.z - r.mover.z) * Math.sin(this.heading)) || 1; }
        // atascado (algo fijo delante o un corrillo): vuelve a buscar camino desde donde está; si sigue, lo deja
        if (this.moved < want * 0.3) { this.stuck = (this.stuck || 0) + dt; if (this.stuck > 1) { this.stuck = 0; this.stuckN = (this.stuckN || 0) + 1;
          if ((this.repaths = (this.repaths || 0) + 1) <= 2 && this.goal) this.goTo(this.goal, true);
          else { this.state = 'idle'; this.target = null; this.goal = null; this.wait = 0.8 + Math.random() * 1.5; } } }
        else this.stuck = Math.max(0, (this.stuck || 0) - dt);
      }
      this.pos.x = r.x; this.pos.z = r.z;
      this.phase += this.speed * dt * 4.2;
    }
    // las piernas siguen a lo que avanza de verdad (si algo le frena, no anda en el sitio ni patina)
    this.vSpeed = damp(this.vSpeed || 0, dt > 0 ? this.moved / dt : 0, 10, dt);
    if (this.lookAt && this.speed < 0.3) this.heading = dampAngle(this.heading, Math.atan2(this.lookAt.x - this.pos.x, this.lookAt.z - this.pos.z), 5, dt);
    // la altura sube y baja con el suelo poco a poco (un escalón se sube, no se salta de golpe)
    const g = groundHeight(this.pos.x, this.pos.z);
    this.pos.y = this.moved > 0 ? damp(this.pos.y, g, 16, dt) : g;
    this.collider.x = this.pos.x; this.collider.z = this.pos.z;
    // animación por distancia: fuera de cámara o lejos se anima a saltos (se acumula el tiempo), cerca en cada fotograma
    this.animAcc = (this.animAcc || 0) + dt;
    const every = this.onScreen === false ? 0.3 : dP > 60 ? 0.066 : dP > 40 ? 0.033 : 0;   // a la vista, fluidos hasta 40 m
    if (this.animAcc >= every) { this.animate(this.animAcc); this.animAcc = 0; }
    this.sync();
  }
  /** Ir a un sitio por las calles (camino de nav.js, que se busca en unos fotogramas: mientras, espera donde está). Sin
   *  camino, se queda donde está y la próxima vez prueba otro destino. */
  goTo(goal, again = false) {
    this.cancelPath?.(); this.goal = goal; this.state = 'plan'; this.target = null; this.path = null; this.arrived = false; this.lookHeading = null;
    if (!again) this.repaths = 0;
    this.cancelPath = requestPath(this.pos.x, this.pos.z, goal.x, goal.z, (p) => {
      this.cancelPath = null; if (this.state !== 'plan' || this.goal !== goal) return;
      if (!p || !p.length) { this.state = 'idle'; this.goal = null; this.wait = 1 + Math.random() * 2; return; }
      this.path = p; this.target = p.shift(); this.state = 'walk';
    });
    return true;
  }
  // al llegar: se queda un rato; si hay otro vecino parado al lado, se ponen a charlar
  arrive() {
    const st = this.goal;
    this.state = 'idle'; this.target = null; this.path = null; this.arrived = true; this.goal = null; this.wait = 3 + Math.random() * 6;
    if (!this.route && !(this.wander > 0)) return;
    // una parada de su tarea (rutinas.js): lo que se queda, hacia dónde mira y lo que hace (charlar, mirar, celebrar)
    if (st?.wait != null) {
      this.wait = st.wait * (0.85 + Math.random() * 0.3); this.talkTo = null;
      if (st.face != null) this.lookHeading = st.face;
      if (st.act === 'talk') { this.talking = this.wait; this.wait = 0.4; if (st.face != null) this.talkTo = { x: this.pos.x + Math.sin(st.face) * 2, z: this.pos.z + Math.cos(st.face) * 2 }; }
      else if (st.act === 'cheer') this.cheer = 1.2;
    }
    for (const c of MOVERS) {
      const o = c.actor; if (!o || o === this || o.state !== 'idle' || o.talking > 0 || o.frozen || o.dance) continue;
      if (Math.hypot(o.pos.x - this.pos.x, o.pos.z - this.pos.z) > 3.5) continue;
      const t = 3 + Math.random() * 3; this.talking = t; o.talking = t; this.chatWith = o; o.chatWith = this; this.wait = Math.max(this.wait, t + 0.5); o.wait = Math.max(o.wait || 0, t + 0.5);
      break;
    }
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
  // un sitio al que pasear dentro de su zona, en una casilla que se pueda pisar (el camino lo busca goTo); si no
  // encuentra ninguno, se queda donde está
  pickWander() {
    for (let k = 0; k < 8; k++) {
      const a = Math.random() * 6.28, r = (0.35 + Math.random() * 0.65) * this.wander;
      const x = this.home.x + Math.cos(a) * r, z = this.home.z + Math.sin(a) * r;
      if (walkable(x, z)) return { x, z };
    }
    return null;
  }
  sync() {
    this.obj.position.copy(this.pos);
    this.obj.rotation.y = this.heading;
    this.obj.visible = this.visible;
  }
}
