// Conducir un tractor con remolque o una cosechadora en las misiones de cosecha del pueblo (townTractor.js). Los modelos
// son los de los campos (world/agro.js), de diseño propio y sin marcas. La palanca o WASD: adelante acelera, atrás frena
// y da marcha atrás, a los lados gira (solo si se mueve, como un vehículo de verdad). La cámara va detrás, más lejos que
// andando. El pelotari va sentado al volante (personajes de Meshy: piernas y brazos doblados encima de la animación; los
// demás, escondidos dentro de la cabina). Suena el motor, que sube con la velocidad, y levanta polvo al correr.
import * as THREE from 'three';
import { tractorModel, combineModel } from '../world/agro.js';
import { groundHeight, waterLevelAt } from '../world/heightfield.js';
import { resolve, addMover, removeMover } from '../world/colliders.js';
import { BOUNDARY } from '../world/layout.js';
import { clamp, damp } from '../util/math.js';

// vmax y atras en m/s; giro, lo que gira a la velocidad de giro plena (rad/s); r, el radio con el que choca; dist, la
// distancia de la cámara; asiento, dónde va el conductor (en el modelo, que mira a +z); alto, a qué altura mira la cámara
export const VEHICULOS = {
  tractor: { vmax: 7.5, atras: 3, giro: 1.1, r: 1.5, dist: 11, asiento: [0, 1.4, -0.72], alto: 0.6, largo: 2.2, nombre: 'el tractor', subir: 'Subir al tractor', bajar: 'Bajar del tractor' },
  cosechadora: { vmax: 5, atras: 2.2, giro: 0.75, r: 2.4, dist: 15, asiento: [0, 3.32, 1.55], alto: 1.8, largo: 3.4, nombre: 'la cosechadora', subir: 'Subir a la cosechadora', bajar: 'Bajar de la cosechadora' },
};
const X = new THREE.Vector3(1, 0, 0), _q = new THREE.Quaternion(), _qc = new THREE.Quaternion(), _ax = new THREE.Vector3(), _v = new THREE.Vector3();

export class Vehiculo {
  constructor(game, tipo, x, z, heading = 0) {
    this.g = game; this.tipo = tipo; this.T = VEHICULOS[tipo];
    this.obj = tipo === 'tractor' ? tractorModel('#c8302a', 'trailer') : combineModel();
    this.obj.traverse(o => { if (o.isMesh) o.castShadow = true; });
    game.scene.add(this.obj);
    this.x = x; this.z = z; this.heading = heading; this.speed = 0; this.polvo = 0;
    this.collider = addMover(x, z, this.T.r, { vehiculo: this });
    this.place(0);
  }
  /** Coloca el modelo en (x, z), sobre el suelo e inclinado según la cuesta, y gira las ruedas lo recorrido */
  place(dist) {
    const T = this.T, s = Math.sin(this.heading), c = Math.cos(this.heading), L = T.largo, W = 1.2;
    const hf = groundHeight(this.x + s * L, this.z + c * L), hb = groundHeight(this.x - s * L, this.z - c * L);
    const hr = groundHeight(this.x - c * W, this.z + s * W), hl = groundHeight(this.x + c * W, this.z - s * W);
    this.y = (hf + hb + hr + hl) / 4;
    this.obj.position.set(this.x, this.y, this.z);
    this.obj.rotation.set(Math.atan2(hb - hf, 2 * L) * 0.9, this.heading, Math.atan2(hl - hr, 2 * W) * 0.9, 'YXZ');
    for (const [w, r] of this.obj.userData.wheels || []) w.rotation.x += dist / r;
    this.collider.x = this.x; this.collider.z = this.z;
  }
  /** Un punto del modelo (en sus coordenadas, mirando a +z) en el mundo */
  local(x, y, z, out = new THREE.Vector3()) { this.obj.updateMatrixWorld(true); return out.set(x, y, z).applyMatrix4(this.obj.matrixWorld); }
  sube(P) {
    if (this.P) return;
    const g = this.g, F = g.follow;
    this.P = P; P.vehiculo = this; P.speed = 0; this.distAntes = F.targetDist; F.targetDist = this.T.dist; F.yaw = this.heading + Math.PI;   // (la cámara, detrás)
    document.body.classList.add('conduce');   // (sin los botones de correr y saltar)
    if (P.collider) P.collider.ghost = true;
    if (P.blob) P.blob.visible = false;
    this.sienta(P);
    this.motor(true);
    g.sound?.ui?.('click');
  }
  baja() {
    const P = this.P; if (!P) return null;
    const g = this.g, F = g.follow;
    this.motor(false); this.levanta(P);
    P.vehiculo = null; this.P = null; this.speed = 0; F.targetDist = this.distAntes ?? F.targetDist; document.body.classList.remove('conduce');
    // (se baja por la izquierda, junto a la cabina; si ahí no cabe, por la derecha)
    const s = Math.sin(this.heading), c = Math.cos(this.heading);
    for (const k of [1, -1]) {
      const x = this.x + c * (this.T.r + 0.9) * k, z = this.z - s * (this.T.r + 0.9) * k, r = resolve(x, z, P.radius, P.collider);
      if (Math.hypot(r.x - x, r.z - z) < 0.3 || k === -1) { P.place(r.x, r.z, this.heading); break; }
    }
    if (P.collider) P.collider.ghost = false;
    P.obj.visible = true;
    return P;
  }
  // el conductor sentado: con los huesos de Meshy (Mixamo), muslos adelante, rodillas dobladas y brazos al volante,
  // encima de la animación de estar quieto. Sin esos huesos, escondido en la cabina
  sienta(P) {
    const c = P.rig?.char, B = {}; c?.root.traverse(o => { if (o.isBone) B[o.name] = o; });
    const ul = B.mixamorigLeftUpLeg, ur = B.mixamorigRightUpLeg, ll = B.mixamorigLeftLeg, lr = B.mixamorigRightLeg, al = B.mixamorigLeftArm, ar = B.mixamorigRightArm, fl = B.mixamorigLeftForeArm, fr = B.mixamorigRightForeArm, hips = B.mixamorigHips;
    if (!c || !ul || !ur || !ll || !lr || !hips) { P.obj.visible = false; this.sentado = null; return; }
    // (el eje del personaje pasado al espacio de cada hueso, con la pose de este fotograma)
    const turn = (b, a) => { if (!b) return; _qc.identity(); for (let o = b; o && o !== c.root; o = o.parent) _qc.premultiply(o.quaternion); _ax.copy(X).applyQuaternion(_qc.invert()); b.quaternion.multiply(_q.setFromAxisAngle(_ax, a)); };
    this.postAntes = c.post;
    c.post = (cc, dt) => { turn(ul, -1.45); turn(ur, -1.45); turn(ll, 1.5); turn(lr, 1.5); turn(al, -0.9); turn(ar, -0.9); turn(fl, -0.5); turn(fr, -0.5); };
    P.obj.position.set(0, 0, 0); P.obj.rotation.set(0, 0, 0); P.obj.updateMatrixWorld(true);
    this.alturaCadera = hips.getWorldPosition(_v).y / Math.max(1e-3, P.obj.scale.y || 1);
    this.sentado = c;
  }
  levanta(P) { if (this.sentado) { this.sentado.post = this.postAntes || null; this.sentado = null; } }
  // el ruido del motor: dos osciladores graves, filtrados, que suben de tono y de fuerza con la velocidad
  motor(on) {
    const S = this.g.sound, ctx = S?.ctx;
    if (!on) { if (this.mot) { const t = ctx.currentTime; this.mot.g.gain.setTargetAtTime(0, t, 0.15); const m = this.mot; setTimeout(() => { try { m.o1.stop(); m.o2.stop(); } catch (e) { } }, 600); this.mot = null; } return; }
    if (!ctx || this.mot) return;
    try {
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o1.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 320; g.gain.value = 0;
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(S.sfx || ctx.destination); o1.start(); o2.start();
      this.mot = { o1, o2, f, g };
    } catch (e) { this.mot = null; }
  }
  update(dt, input, P) {
    const T = this.T, g = this.g;
    input.consume?.(' ');   // (conduciendo no se salta)
    const f = clamp(input.move?.y || 0, -1, 1), s = clamp(input.move?.x || 0, -1, 1);
    const quiere = f >= 0 ? f * T.vmax : f * T.atras;
    this.speed = damp(this.speed, quiere, Math.abs(quiere) > Math.abs(this.speed) ? 1.4 : 2.8, dt);
    if (Math.abs(this.speed) < 0.02 && !f) this.speed = 0;
    // (gira según lo que avanza: parado no gira; marcha atrás, al revés)
    this.heading -= s * T.giro * clamp(this.speed / 2.5, -1, 1) * dt;
    let nx = this.x + Math.sin(this.heading) * this.speed * dt, nz = this.z + Math.cos(this.heading) * this.speed * dt;
    const r = resolve(nx, nz, T.r, this.collider);
    if (Math.hypot(r.x - nx, r.z - nz) > 0.02) this.speed *= 0.6;   // (choca: frena)
    nx = r.x; nz = r.z;
    const r4 = Math.pow(nx ** 4 + nz ** 4, 0.25); if (r4 > BOUNDARY) { const k = BOUNDARY / r4; nx *= k; nz *= k; this.speed *= 0.5; }
    // (al agua honda o a una cuesta muy fuerte no se mete)
    const gNew = groundHeight(nx, nz), gOld = groundHeight(this.x, this.z), m = Math.hypot(nx - this.x, nz - this.z);
    if (waterLevelAt(nx, nz) - gNew > 0.7 || (m > 1e-4 && (gNew - gOld) / m > 0.9)) { nx = this.x; nz = this.z; this.speed = 0; }
    const dist = Math.hypot(nx - this.x, nz - this.z) * Math.sign(this.speed || 1);
    this.x = nx; this.z = nz; this.place(dist);
    // el jugador va con el vehículo: la cámara le sigue (más alto en la cosechadora) y su figura, en el asiento
    P.pos.set(this.x, this.y + T.alto, this.z); P.heading = this.heading; P.speed = Math.abs(this.speed);
    if (P.collider) { P.collider.x = this.x; P.collider.z = this.z; }
    if (this.sentado) {
      const a = T.asiento; this.local(a[0], a[1], a[2], _v);
      P.obj.position.set(_v.x, _v.y - this.alturaCadera * (P.obj.scale.y || 1) + 0.12, _v.z); P.obj.rotation.set(this.obj.rotation.x, this.heading, this.obj.rotation.z, 'YXZ');
      P.rig.update(dt, 0, true, 0);
    }
    // el motor, según la velocidad y el acelerador
    if (this.mot) { const t = g.sound.ctx.currentTime, k = Math.abs(this.speed) / T.vmax; this.mot.o1.frequency.setTargetAtTime(34 + k * 34 + Math.abs(f) * 6, t, 0.1); this.mot.o2.frequency.setTargetAtTime(17 + k * 17, t, 0.1); this.mot.g.gain.setTargetAtTime(0.05 + k * 0.05 + Math.abs(f) * 0.02, t, 0.1); }
    // polvo detrás, al correr
    if (Math.abs(this.speed) > 2.5 && (this.polvo -= dt) <= 0) {
      this.polvo = 0.12; const b = this.local(0, 0.3, this.tipo === 'tractor' ? -0.9 : -2.8, _v);
      g.particles?.emit({ x: b.x, y: b.y, z: b.z }, { n: 3, color: ['#c9b58c', '#b39d73'], speed: 0.8, size: 0.5, life: 0.9, gravity: -0.3, spread: 1.2 });
    }
  }
  dispose() {
    if (this.P) this.baja();
    this.motor(false); removeMover(this.collider);
    this.obj.parent?.remove(this.obj);   // (sus mallas no se tiran: las comparten las máquinas de los campos, agro.js)
  }
}
