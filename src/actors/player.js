// Control del jugador: movimiento relativo a cámara, colisiones, agua, pendientes, salto
// Y moverse cuesta: trepar una cuesta muy fuerte o una peña, planear con la capa y nadar gastan la resistencia (el
// anillo que sale junto al personaje, ui/aventuraHud.js). Con lluvia o frío se gasta antes. Si se acaba, se resbala
// cuesta abajo, la capa se cierra o hay que volver a la orilla; descansando en el suelo se recupera sola. Todo va con
// lo que ya había: la palanca o las flechas para moverse y el botón de saltar (en el aire, abre y cierra la capa).
import * as THREE from 'three';
import { groundHeight, waterLevelAt, surfAt, bridgeAt } from '../world/heightfield.js';
import { resolve, addMover } from '../world/colliders.js';
import { BOUNDARY } from '../world/layout.js';
import { clamp, damp, dampAngle, angleDiff } from '../util/math.js';
import { makeBlob, placeBlob } from '../util/blob.js';
import { VIENTO } from '../world/viento.js';

// lo que dura cada cosa con la resistencia llena (segundos) y lo que tarda en volver
export const AGUANTE = { trepa: 9, cuelga: 26, planea: 13, nada: 15, vuelve: 3.2, espera: 0.7 };
const CUESTA = 1.25;   // (pendiente desde la que ya no se sube andando: unos 51 grados)

const _baja = { x: 0, z: 0 };

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
    // la aventura: cómo se mueve ahora (pie, trepa, planea o nada), la resistencia (de 0 a aguanteMax; 1 es un anillo
    // entero) y lo que la gasta de más el tiempo (lluvia y frío: lo pone el juego)
    this.modo = 'pie'; this.aguante = 1; this.aguanteMax = 1; this.gasto = 1; this.agotado = false; this.sinUsar = 9; this.aire = 0; this.llano = 0;
    this.puedeAventura = true;   // (el juego lo quita donde no toca: en un partido, en el encierro, de la mano de una misión)
    this.onModo = null; this.onCaida = null; this.onRescate = null;
    // (los vecinos y los animales chocan con el jugador como con cualquiera; oculto, en un partido o en el encierro, no)
    this.collider = addMover(0, 0, this.radius, { player: this });
  }
  place(x, z, heading = 0) {
    this.pos.set(x, groundHeight(x, z), z);
    this.heading = heading; this.vy = 0; this.speed = 0; this.grounded = true; this.ponModo('pie');
    this.lastSafe.copy(this.pos);
    this.sync();
  }
  ponModo(m) { if (m === this.modo) return; const antes = this.modo; this.modo = m; this.onModo?.(m, antes); }
  /** Gasta resistencia: dura, los segundos que aguanta con el anillo lleno. Devuelve false si se ha acabado. */
  gasta(dt, dura) {
    this.aguante = Math.max(0, this.aguante - dt / dura * this.gasto); this.sinUsar = 0;
    if (this.aguante <= 0) this.agotado = true;
    return this.aguante > 0;
  }
  /** La pendiente del suelo aquí (subida por metro) y hacia dónde baja. */
  cuesta(x, z, out) {
    const e = 0.45, gx = (groundHeight(x + e, z) - groundHeight(x - e, z)) / (2 * e), gz = (groundHeight(x, z + e) - groundHeight(x, z - e)) / (2 * e);
    if (out) { out.x = -gx; out.z = -gz; }
    return Math.hypot(gx, gz);
  }
  update(dt, input, camYaw) {
    // (subido a un tractor, a una cosechadora o a una montura, lo mueve el vehículo: game/conducir.js y game/montura.js)
    if (this.vehiculo) { this.vehiculo.update(dt, input, this); return; }
    const aventura = this.puedeAventura && !this.frozen;
    if (!aventura && this.modo !== 'pie') this.ponModo('pie');
    // la resistencia vuelve sola con los pies en el suelo, al poco de dejar de gastarla
    this.sinUsar += dt;
    if (this.modo === 'pie' && this.grounded && this.sinUsar > AGUANTE.espera) {
      this.aguante = Math.min(this.aguanteMax, this.aguante + dt / AGUANTE.vuelve);
      if (this.agotado && this.aguante >= Math.min(0.3, this.aguanteMax)) this.agotado = false;
    }
    let mx = 0, mz = 0;
    if (!this.frozen) {
      // dirección relativa a la cámara (adelante = alejándose de la cámara)
      const f = input.move.y, s = input.move.x;
      const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
      mx = -sin * f + cos * s;
      mz = -cos * f - sin * s;
    }
    const mag = Math.min(1, Math.hypot(mx, mz));
    let target = mag * (input.run ? this.runSpeed * (this.tired ? 0.75 : 1) : this.walkSpeed) * (1 - this.wade * 0.55);   // cansado corre más despacio
    if (this.modo === 'trepa') target = mag * 1.5;
    else if (this.modo === 'nada') target = mag * (input.run ? 3.1 : 2.3);
    else if (this.modo === 'resbala') target = 0;
    else if (this.modo === 'planea') target = 7.2 + 1.3 * VIENTO.fuerza * (Math.sin(this.heading) * VIENTO.uDir.value.x + Math.cos(this.heading) * VIENTO.uDir.value.y);   // (la capa vuela sola: con el viento a favor, más)
    this.speed = damp(this.speed, target, mag > 0.01 ? 8 : 10, dt);
    const prevHeading = this.heading;
    if (mag > 0.05) this.heading = dampAngle(this.heading, Math.atan2(mx, mz), this.modo === 'planea' ? 2.2 : this.modo === 'nada' ? 5 : 12, dt);   // (planeando y nadando se gira despacio)
    this.turnRate = angleDiff(prevHeading, this.heading) / Math.max(dt, 1e-4);
    const dirx = Math.sin(this.heading), dirz = Math.cos(this.heading);
    let nx = this.pos.x + dirx * this.speed * dt, nz = this.pos.z + dirz * this.speed * dt;
    // colisiones
    const r = resolve(nx, nz, this.radius, this.collider);
    nx = r.x; nz = r.z;
    // límites del mundo (montañas)
    const r4 = Math.pow(nx ** 4 + nz ** 4, 0.25);
    if (r4 > BOUNDARY && !this.frozen) { const k = BOUNDARY / r4; nx *= k; nz *= k; }   // (quieto, fuera de los límites: en el Labrit de la final)
    // pendiente máxima y agua profunda
    const gNew = groundHeight(nx, nz), gOld = groundHeight(this.pos.x, this.pos.z);
    const moved = Math.hypot(nx - this.pos.x, nz - this.pos.z);
    const wl = waterLevelAt(nx, nz);
    const depth = wl - gNew;
    const onBridge = bridgeAt(nx, nz);
    // (un escalón pequeño, como el borde de una tarima o de una rampa, se sube; una pared o un talud, no)
    let tooSteep = moved > 1e-4 && gNew - gOld > 0.36 && (gNew - gOld) / moved > CUESTA && this.grounded;   // (un peldaño de 30 cm se sube)
    let tooDeep = !onBridge && depth > 0.95;
    // trepar: empujando contra una cuesta que andando no se sube, se agarra y sube despacio mientras le quede resistencia
    if (aventura && !this.agotado) {
      if (tooSteep && this.modo === 'pie' && mag > 0.35 && this.wade < 0.3) this.ponModo('trepa');
      if (tooDeep && this.modo !== 'nada' && this.modo !== 'planea') { this.ponModo('nada'); this.onSplash?.(this.pos, 1); }
    }
    const empinado = tooSteep;
    if (this.modo === 'trepa') tooSteep = false;
    if (this.modo === 'nada') tooDeep = false;
    // (nadando no se pasa por debajo de un puente: sus pilas cierran el paso. Antes, al llegar a él, el nadador aparecía arriba)
    if (this.modo === 'nada' && onBridge) { nx = this.pos.x; nz = this.pos.z; }
    if (this.modo === 'planea') { tooSteep = false; tooDeep = false; }
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
    // trepando: pegado a la pared, gasta según se mueva; al llegar a suelo que ya se anda, de pie otra vez; sin
    // resistencia, resbala cuesta abajo hasta donde pueda tenerse en pie
    if (this.modo === 'trepa') {
      const c = this.cuesta(nx, nz, _baja);
      this.gasta(dt, realMoved > 1e-4 ? AGUANTE.trepa : AGUANTE.cuelga);
      this.llano = c < CUESTA * 0.8 && !empinado ? this.llano + dt : 0;
      if (this.llano > 0.22 || this.wade > 0.5) { this.llano = 0; this.ponModo('pie'); }
      else if (this.agotado) { this.llano = 0; this.ponModo('resbala'); }
      if (input.consume(' ')) { this.ponModo('pie'); this.vy = 3.2; this.grounded = false; this.speed = -2.5; }   // (saltar suelta la pared)
    }
    if (this.modo === 'resbala') {
      const c = this.cuesta(this.pos.x, this.pos.z, _baja), l = Math.hypot(_baja.x, _baja.z) || 1;
      if (c < CUESTA * 0.8 || (this.llano += dt) > 4) { this.llano = 0; this.ponModo('pie'); }
      else { const r = resolve(this.pos.x + _baja.x / l * 5.5 * dt, this.pos.z + _baja.z / l * 5.5 * dt, this.radius, this.collider); this.pos.x = r.x; this.pos.z = r.z; this.speed = 0; }
    }
    // nadando: flota con la cabeza fuera; al hacer pie, sale andando; sin resistencia, vuelve a la orilla (el juego)
    if (this.modo === 'nada') {
      const hondo = waterLevelAt(nx, nz) - g;
      this.gasta(dt, AGUANTE.nada * (input.run ? 0.6 : 1));
      if (hondo < 0.8) this.ponModo('pie');
      else if (this.agotado) { this.ponModo('pie'); this.onRescate?.('agua'); return; }
      else { this.pos.y = damp(this.pos.y, waterLevelAt(nx, nz) - 0.42, 8, dt); this.grounded = true; this.vy = 0; input.consume(' '); }
    }
    // salto y gravedad; en el aire, el botón de saltar abre la capa (y la cierra)
    if (this.grounded && this.modo === 'pie' && input.consume(' ') && !this.frozen) { this.vy = 6.6; this.grounded = false; this.onJump?.(); }
    if (!this.grounded) {
      this.aire += dt;
      if (aventura && this.aire > 0.22 && input.consume(' ')) {
        if (this.modo === 'planea') this.ponModo('pie');
        else if (!this.agotado && this.pos.y - g > 1.1) this.ponModo('planea');
      }
      if (this.modo === 'planea') {
        if (!this.gasta(dt, AGUANTE.planea)) this.ponModo('pie');
        this.vy = Math.max(this.vy - 19 * dt, -1.7);   // (baja despacio, colgado de la capa)
      } else this.vy -= 19 * dt;
      this.pos.y += this.vy * dt;
      // (si cae o planea sobre agua honda, se queda nadando en la superficie: no baja hasta el fondo)
      const wl = waterLevelAt(nx, nz);
      if (aventura && wl - g > 0.95 && this.pos.y <= wl - 0.42 && !bridgeAt(nx, nz)) { this.onSplash?.(this.pos, 1.2); this.ponModo(this.agotado ? 'pie' : 'nada'); this.grounded = true; this.vy = 0; this.aire = 0; if (this.agotado) { this.onRescate?.('agua'); return; } }
      else if (this.pos.y <= g) {
        const v = -this.vy; this.pos.y = g; this.grounded = true; this.vy = 0; this.aire = 0;
        if (this.modo === 'planea') this.ponModo('pie');
        if (v > 4) this.onLand?.(v);
        if (v > 13.5 && waterLevelAt(nx, nz) - g < 0.5) this.onCaida?.(v);   // (una caída de más de cinco metros, y no al agua)
      }
    } else if (this.modo === 'nada') {
      // (flotando: la altura ya está puesta)
    } else {
      this.aire = 0;
      // seguir el suelo (bajar pendientes sin despegar)
      if (g < this.pos.y - 0.6) { this.grounded = false; this.vy = 0; }
      else this.pos.y = damp(this.pos.y, g, 30, dt);
    }
    // agua
    const w = waterLevelAt(nx, nz) - g;
    this.wade = clamp(w / 0.9, 0, 1) * (bridgeAt(nx, nz) ? 0 : 1) * (this.modo === 'planea' ? 0 : 1);
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
    if (this.grounded && this.wade < 0.3 && this.modo === 'pie' && this.cuesta(nx, nz) < 0.9) this.lastSafe.copy(this.pos);
    // (nadando y trepando mueve brazos y piernas con la animación de andar, al ritmo de lo que avanza)
    const lento = this.modo === 'nada' || this.modo === 'trepa';
    this.rig.update(dt, this.modo === 'planea' ? 0 : lento ? 1.2 + realMoved / Math.max(dt, 1e-4) * 1.6 : this.grounded ? realMoved / Math.max(dt, 1e-4) : this.speed, this.grounded || this.modo === 'planea', this.turnRate);
    this.inclina = damp(this.inclina || 0, this.modo === 'nada' ? 1.15 : this.modo === 'planea' ? 0.5 : this.modo === 'trepa' ? -0.35 : 0, 7, dt);
    this.sync();
  }
  sync() {
    if (this.collider) { this.collider.x = this.pos.x; this.collider.z = this.pos.z; this.collider.ghost = !this.obj.visible || !this.obj.parent; }
    this.obj.position.copy(this.pos);
    this.obj.position.y -= this.modo === 'nada' ? 0.08 : this.wade * 0.15;
    // (tumbado hacia delante al nadar y al planear; echado hacia la pared al trepar)
    this.obj.rotation.set(this.inclina || 0, this.heading, 0, 'YXZ');
    if (this.blob) { const g = groundHeight(this.pos.x, this.pos.z); placeBlob(this.blob, { x: this.pos.x, y: Math.min(this.pos.y, g), z: this.pos.z }, this.obj.visible && this.wade < 0.3 && this.modo !== 'nada'); const k = Math.max(0.4, 1 - (this.pos.y - g) * 0.4); this.blob.scale.set(0.95 * k, 1, 0.95 * k); }
  }
}
