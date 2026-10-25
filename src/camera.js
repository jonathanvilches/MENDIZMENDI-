// Cámara en tercera persona con órbita, zoom, seguimiento suave y colisión
import * as THREE from 'three';
import { groundHeight } from './world/heightfield.js';
import { nearby } from './world/colliders.js';
import { clamp, damp, dampAngle } from './util/math.js';

const _want = new THREE.Vector3(), _dir = new THREE.Vector3(), _p = new THREE.Vector3();   // (sin crear vectores en cada fotograma)
// muelle amortiguado (el SmoothDamp de siempre): de x hacia x1 en unos «tiempo» segundos, con la velocidad v que lleva;
// devuelve [posición, velocidad]
function muelle(x, x1, v, tiempo, dt) {
  const w = 2 / tiempo, k = w * dt, e = 1 / (1 + k + 0.48 * k * k + 0.235 * k * k * k), c = x - x1, t = (v + w * c) * dt;
  return [x1 + (c + t) * e, (v - w * t) * e];
}

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
    this.cinematic = null;   // { pos, look, t }
    this.curDist = d0;
    this.lift = 0;
  }
  snap(player) {
    this.yaw = player.heading + Math.PI;
    this.focus.copy(player.pos); this.focus.y += 1.5;
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
    const want = _want.set(player.pos.x, player.pos.y + 1.45, player.pos.z);
    if (instant) this.focus.copy(want);
    // en horizontal la cámara va pegada al jugador: con un retraso suavizado, ese retraso cambiaba de un fotograma a otro
    // (los fotogramas nunca duran lo mismo) y el personaje temblaba en pantalla aunque el paisaje fuese fluido.
    // En vertical sí se suaviza (escalones, saltos)
    else { this.focus.x = want.x; this.focus.z = want.z; this.focus.y = damp(this.focus.y, want.y, 8, dt); }
    if (this.cinematic) {
      const c = this.cinematic;
      c.t += dt;
      if (c.fly) { c.fly(this.cam, c.t); return; }   // (un vuelo: la cámara va por su camino, ui/vuelo.js)
      const k = instant ? 1 : 1 - Math.exp(-2.5 * dt);
      this.cam.position.lerp(c.pos, k);
      const look = c.lookCur || (c.lookCur = this.focus.clone());
      look.lerp(c.look, k);
      this.cam.lookAt(look);
      return;
    }
    // distancia con colisión: el primer punto del camino hacia la cámara que cae en una casa, afinado entre dos pasos (a
    // pasos de 40 cm, la distancia iba a saltos)
    let d = this.targetDist;
    const dir = _dir.set(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    const step = 0.4, F = this.focus;
    const choca = (t) => {
      const x = F.x + dir.x * t, z = F.z + dir.z * t, y = F.y + dir.y * t;
      for (const c of nearby(x, z, 0.5)) {
        if (c.type !== 'box' || !c.solidView) continue;
        const dx = x - c.x, dz = z - c.z;
        const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
        if (Math.abs(lx) < c.hw + 0.3 && Math.abs(lz) < c.hd + 0.3 && y < (c.top ?? 99)) return true;
      }
      return false;
    };
    for (let t = 0.6; t < d; t += step) {
      if (!choca(t)) continue;
      let a = t - step, b = t; for (let k = 0; k < 4; k++) { const m = (a + b) / 2; if (choca(m)) b = m; else a = m; }
      d = Math.max(1.6, b - 0.4); break;
    }
    // al acercarse por una casa, con un muelle: arranca suave, acelera y frena (antes saltaba de golpe hasta un metro en
    // un fotograma y la imagen daba un tirón); al alejarse, despacio
    if (instant) { this.curDist = d; this.distV = 0; }
    else if (d < this.curDist) [this.curDist, this.distV] = muelle(this.curDist, d, this.distV || 0, 0.1, dt);
    else { this.curDist = damp(this.curDist, d, 3, dt); this.distV = 0; }
    const p = _p.copy(this.focus).addScaledVector(dir, this.curDist);
    // sobre el terreno: si la cámara quedaría bajo el suelo se eleva, deprisa pero sin saltos (al bajar de un muro o una
    // cuesta el suelo de detrás cambia de golpe y la imagen daba un tirón)
    const gy = groundHeight(p.x, p.z) + 0.45, needLift = Math.max(0, gy - p.y);
    this.lift = instant ? needLift : damp(this.lift, needLift, needLift > this.lift ? 30 : 6, dt);
    p.y += Math.max(this.lift, needLift - 0.35);
    if (this.shake > 0) { this.shake -= dt; p.x += (Math.random() - 0.5) * this.shake * 0.3; p.y += (Math.random() - 0.5) * this.shake * 0.3; }
    this.cam.position.copy(p);
    this.cam.lookAt(this.focus.x, this.focus.y + 0.1, this.focus.z);
  }
}
