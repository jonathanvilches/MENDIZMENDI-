// Cámara en tercera persona con órbita, zoom, seguimiento suave y colisión
import * as THREE from 'three';
import { groundHeight } from './world/heightfield.js';
import { nearby } from './world/colliders.js';
import { clamp, damp, dampAngle, angleDiff } from './util/math.js';
import { reducido } from './ui/motion.js';

const _want = new THREE.Vector3(), _dir = new THREE.Vector3(), _p = new THREE.Vector3();   // (sin crear vectores en cada fotograma)
const _l = new THREE.Vector3(), _l2 = new THREE.Vector3(), _box = new THREE.Box3();
// ¿se puede poner la cámara en (x, y, z) sin meterla en una casa? (las mismas cajas que acercan la cámara al jugador)
function libre(x, y, z) {
  for (const c of nearby(x, z, 0.5)) {
    if (c.type !== 'box' || !c.solidView) continue;
    const dx = x - c.x, dz = z - c.z, lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
    if (Math.abs(lx) < c.hw + 0.3 && Math.abs(lz) < c.hd + 0.3 && y < (c.top ?? 99)) return false;
  }
  return true;
}
// ¿está libre la línea de (x0, z0) a (x1, z1) a la altura y? (un punto cada 0,6 m, sin contar los extremos)
function despejado(x0, z0, x1, z1, y) {
  const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.6));
  for (let i = 1; i < n; i++) if (!libre(x0 + (x1 - x0) * i / n, y, z0 + (z1 - z0) * i / n)) return false;
  return true;
}
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
  /** El jugador va a cambiar de sitio de golpe (subir o bajar de la montura): la cámara lo sigue suave s segundos */
  suaviza(s = 0.45) { this.suave = s; }
  /** Charla con un vecino (el autor, 16 de noviembre: «Cuando hablemos con los vecinos la cámara se acerca a los
   *  personajes»; y el 18: «no acerques tanto la cámara»). Plano de dos, desde detrás y a un lado del jugador, a unos
   *  3 m: el explorador de espaldas, casi entero, y el vecino de frente y entero, con la cara en el tercio de arriba, que
   *  abajo va el cuadro de la charla. Por su derecha; si ahí hay una casa, por su izquierda, y si no, algo más cerca. Si
   *  ningún sitio está libre, o el vecino está lejos, o ya hay otro plano de cine, la cámara no cambia.
   *  Varias charlas seguidas con el mismo vecino son un solo plano: finCharla() espera un poco antes de volver */
  charla(a, player) {
    if (this._charla && this._charla.a === a && this.cinematic === this._charla) { this.finPendiente = 0; return; }
    if (this.cinematic || !a?.pos || !a.obj || !player?.pos) return;
    const P = player.pos, A = a.pos; let dx = A.x - P.x, dz = A.z - P.z; const dd = Math.hypot(dx, dz);
    if (dd < 0.3 || dd > 6) return;
    dx /= dd; dz /= dd;
    // la altura del vecino, de su figura (los niños, más bajos; el Basajaun, más alto), una vez
    if (a.altoCharla == null) { _box.setFromObject(a.obj); a.altoCharla = Number.isFinite(_box.max.y) ? _box.max.y - A.y : 1.7; }
    // (a la altura de la cara del vecino: el explorador es más bajo y su cabeza queda abajo, sin tapar)
    const cara = A.y + clamp(a.altoCharla, 0.9, 2.8) * 0.9, y = Math.max(P.y + 1.45, cara);
    let pos = null, lado = 0;
    // (bien abierto a un lado: con la cámara casi detrás de la cabeza del explorador, su pelo tapaba medio vecino)
    // (y LEJOS, desde el 18 de noviembre de 2026; el autor, en el ordenador: «los personajes pierden muchísima calidad
    // cuando se acerca mucho la cámara en una conversación con el explorador. No acerques tanto la cámara». Estaba a
    // 1,5 m del explorador y con el objetivo cerrado al 72 %: su cabeza y su hombro llenaban media pantalla y se veía la
    // malla. Ahora, a 3,2 m en el ordenador (2,6 m en el móvil, que es pequeño) y con el objetivo casi como jugando: el
    // explorador de espaldas, de cuerpo casi entero a un lado, y el vecino de frente y entero. Si ahí hay una casa, del
    // otro lado, y si no algo más cerca, pero nunca a menos de 2 m (1,6 m en el móvil): antes llegaba a 1,1 m)
    const tactil = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches, [AT, LA] = tactil ? [2.1, 1.55] : [2.6, 1.9];   // (más abierto a un lado: con 1,5 m la cabeza del explorador tapaba un hombro del vecino)
    for (const [k, sg] of [[1, 1], [1, -1], [0.8, 1], [0.8, -1], [0.62, 1], [0.62, -1]]) {
      const atras = AT * k, l = LA * k * sg, x = P.x - dx * atras + dz * l, z = P.z - dz * atras - dx * l;
      // (nada en medio: ni entre la cámara y el explorador ni entre la cámara y el vecino)
      if (!libre(x, y, z) || !despejado(x, z, P.x, P.z, y) || !despejado(x, z, A.x, A.z, y)) continue;
      pos = new THREE.Vector3(x, Math.max(y + 0.12, groundHeight(x, z) + 0.45), z); lado = l; break;
    }
    if (!pos) return;
    // mirando entre los dos, más hacia el vecino y a la altura de su pecho: los dos enteros por encima del cuadro de la charla
    const sl = Math.sign(lado) * 0.25, look = new THREE.Vector3(A.x - dx * 0.45 + dz * sl, cara - 0.5, A.z - dz * 0.45 - dx * sl);
    // (el objetivo, apenas más cerrado que jugando: 0,86 en el ordenador y 0,8 en el móvil; antes 0,72)
    const fov0 = this.cam.userData.fov0 || this.cam.fov;
    const c = this._charla = this.cinematic = { pos, look, t: 0, a, p0: P.clone(), fov: fov0 * (tactil ? 0.8 : 0.86) };
    this.finPendiente = 0; this.salida = null; this.fovTocado = true;
    if (reducido()) { this.cam.position.copy(pos); c.lookCur = look.clone(); this.cam.lookAt(look); this.cam.fov = c.fov; this.cam.updateProjectionMatrix(); }   // (sin deslizarse: de corte)
  }
  /** Se acaba la charla: en un cuarto de segundo, si no empieza otra con el mismo vecino, la cámara vuelve, suave */
  finCharla(ahora = false) {
    const c = this._charla;
    if (!c || this.cinematic !== c) { this._charla = null; this.finPendiente = 0; return; }
    if (!ahora) { this.finPendiente = 0.25; return; }
    this._charla = null; this.finPendiente = 0; this.cinematic = null;
    this.salida = reducido() ? null : { pos: this.cam.position.clone(), look: (c.lookCur || c.look).clone(), t: 0, fov: this.cam.fov };
  }
  update(dt, player, input, instant = false) {
    const sens = input.touch ? 0.006 : 0.005;
    if (input.look.dx || input.look.dy) this.idle = 0; else this.idle += dt;
    this.yaw -= input.look.dx * sens;
    // (como mucho 0,95 rad hacia abajo: antes hasta 1,2, casi encima del jugador, y a caballo, con la cámara a nueve metros,
    // se quedaba mirando desde lo alto sin ver por dónde se iba; el vídeo del autor del 11 de noviembre)
    this.pitch = clamp(this.pitch + input.look.dy * sens, -0.15, 0.95);
    if (input.zoom) this.targetDist = clamp(this.targetDist + input.zoom * 0.9, 3, 16);
    // la charla se acaba (un poco después de cerrarse el cuadro) o el jugador se ha ido de allí
    if (this._charla && this.cinematic === this._charla) {
      if (this.finPendiente > 0 && (this.finPendiente -= dt) <= 0) this.finCharla(true);
      else if (Math.hypot(player.pos.x - this._charla.p0.x, player.pos.z - this._charla.p0.z) > 1.2) this.finCharla(true);
    }
    if (instant || this.cinematic) this.salida = null;
    // seguimiento automático suave detrás del jugador cuando se mueve y no se toca la cámara
    const moving = Math.hypot(input.move.x, input.move.y) > 0.1;
    // (solo con la palanca hacia delante: con ella de lado, la cámara se ponía detrás, ese lado pasaba a ser otro y el
    // personaje, y sobre todo el caballo, giraba y giraba sin control hasta soltarla o bajarse; el vídeo del autor del 11
    // de noviembre. Ahora de lado va hacia ese lado y sigue recto, y la cámara le sigue cuando vuelve a ir hacia delante)
    if (moving && this.idle > 1.2 && input.move.y > 0.3) this.yaw = dampAngle(this.yaw, player.heading + Math.PI, 1.2 * input.move.y, dt);
    // (y la altura también vuelve a la de siempre al moverse sin tocar la cámara: si se había ido muy arriba o muy abajo con
    // el dedo, se recoloca sola, sin tirones)
    if (moving && this.idle > 1.2) this.pitch = damp(this.pitch, 0.3, 0.9, dt);
    const want = _want.set(player.pos.x, player.pos.y + 1.45, player.pos.z);
    if (instant) this.focus.copy(want);
    // en horizontal la cámara va pegada al jugador: con un retraso suavizado, ese retraso cambiaba de un fotograma a otro
    // (los fotogramas nunca duran lo mismo) y el personaje temblaba en pantalla aunque el paisaje fuese fluido.
    // En vertical sí se suaviza (escalones, saltos)
    // (salvo justo después de que el jugador cambie de sitio de golpe, al subir o bajar de la montura o del tractor:
    // suave, unas décimas, que la cámara no salte con él. Al subir al caballo saltaba 2 m en un fotograma y parpadeaba)
    else if (this.suave > 0) {
      this.suave -= dt; const k = 1 - Math.exp(-dt / 0.11);
      this.focus.x += (want.x - this.focus.x) * k; this.focus.z += (want.z - this.focus.z) * k; this.focus.y = damp(this.focus.y, want.y, 8, dt);
      if (this.suave <= 0) { this.focus.x = want.x; this.focus.z = want.z; }
    }
    else { this.focus.x = want.x; this.focus.z = want.z; this.focus.y = damp(this.focus.y, want.y, 8, dt); }
    if (this.cinematic) {
      const c = this.cinematic;
      c.t += dt;
      if (c.fly) { c.fly(this.cam, c.t); return; }   // (un vuelo: la cámara va por su camino, c.fly; sin uso desde que se quitaron los vuelos de llegada)
      const k = instant ? 1 : 1 - Math.exp(-2.5 * dt);
      if (c.fov && Math.abs(this.cam.fov - c.fov) > 0.01) { this.cam.fov += (c.fov - this.cam.fov) * k; this.cam.updateProjectionMatrix(); }
      else if (!c.fov && this.fovTocado) { this.fovTocado = false; const f0 = this.cam.userData.fov0; if (f0) { this.cam.fov = f0; this.cam.updateProjectionMatrix(); } }   // (otro plano de cine que corta la charla, con su objetivo de siempre)
      this.cam.position.lerp(c.pos, k);
      const look = c.lookCur || (c.lookCur = this.focus.clone());
      look.lerp(c.look, k);
      this.cam.lookAt(look);
      return;
    }
    // distancia con colisión: el primer punto del camino hacia la cámara que cae en una casa, afinado entre dos pasos (a
    // pasos de 40 cm, la distancia iba a saltos). Se mira por tres caminos, el del centro y dos que se abren hasta medio
    // metro a cada lado junto a la cámara, y por el de donde estará dentro de un cuarto de segundo si se sigue girando:
    // así se acerca antes y sin tirones al doblar una esquina. Antes, a caballo, con la cámara a casi diez metros, al
    // girar junto a las casas se metía de golpe 3,6 m en 0,17 s y volvía a salir: la imagen parpadeaba
    let d = this.targetDist;
    const dir = _dir.set(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    const step = 0.4, F = this.focus;
    const yawV = instant || !(dt > 0) ? 0 : angleDiff(this.prevYaw ?? this.yaw, this.yaw) / dt; this.prevYaw = this.yaw;
    const choca = (t, dx0, dz0, sx, sz) => {
      const k = t / this.targetDist, x = F.x + dx0 * t + sx * k, z = F.z + dz0 * t + sz * k, y = F.y + dir.y * t;
      for (const c of nearby(x, z, 0.5)) {
        if (c.type !== 'box' || !c.solidView) continue;
        const dx = x - c.x, dz = z - c.z;
        const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
        if (Math.abs(lx) < c.hw + 0.3 && Math.abs(lz) < c.hd + 0.3 && y < (c.top ?? 99)) return true;
      }
      return false;
    };
    const cp = Math.cos(this.pitch), lado = 0.5, ya = this.yaw + clamp(yawV * 0.25, -0.6, 0.6);
    const caminos = [[dir.x, dir.z, 0, 0], [dir.x, dir.z, Math.cos(this.yaw) * lado, -Math.sin(this.yaw) * lado], [dir.x, dir.z, -Math.cos(this.yaw) * lado, Math.sin(this.yaw) * lado]];
    if (Math.abs(ya - this.yaw) > 0.02) caminos.push([Math.sin(ya) * cp, Math.cos(ya) * cp, 0, 0]);
    for (const [ux, uz, sx, sz] of caminos) {
      for (let t = 0.6; t < d; t += step) {
        if (!choca(t, ux, uz, sx, sz)) continue;
        let a = t - step, b = t; for (let k = 0; k < 4; k++) { const m = (a + b) / 2; if (choca(m, ux, uz, sx, sz)) b = m; else a = m; }
        d = Math.min(d, Math.max(1.6, b - 0.4)); break;
      }
    }
    // al acercarse por una casa, con un muelle: arranca suave, acelera y frena (antes saltaba de golpe hasta un metro en
    // un fotograma y la imagen daba un tirón); al alejarse, despacio y solo cuando el hueco lleva libre medio segundo
    // (rozando una esquina, el camino quedaba libre y tapado a ratos y la cámara se acercaba y se alejaba sin parar)
    if (instant) { this.curDist = d; this.distV = 0; this.libre = 0; }
    else if (d < this.curDist - 0.02) { [this.curDist, this.distV] = muelle(this.curDist, d, this.distV || 0, clamp(0.1 + (this.targetDist - 6) * 0.03, 0.1, 0.2), dt); this.libre = 0; }   // (con la cámara lejos, como a caballo, el muelle más suave: se empieza antes)
    else if ((this.libre = (this.libre || 0) + dt) > 0.5) { this.curDist = damp(this.curDist, d, 2.2, dt); this.distV = 0; }
    else this.distV = 0;
    const p = _p.copy(this.focus).addScaledVector(dir, this.curDist);
    // sobre el terreno: si la cámara quedaría bajo el suelo se eleva, deprisa pero sin saltos (al bajar de un muro o una
    // cuesta el suelo de detrás cambia de golpe y la imagen daba un tirón)
    const gy = groundHeight(p.x, p.z) + 0.45, needLift = Math.max(0, gy - p.y);
    this.lift = instant ? needLift : damp(this.lift, needLift, needLift > this.lift ? 30 : 6, dt);
    p.y += Math.max(this.lift, needLift - 0.35);
    if (this.shake > 0) { this.shake -= dt; p.x += (Math.random() - 0.5) * this.shake * 0.3; p.y += (Math.random() - 0.5) * this.shake * 0.3; }
    // al acabar una charla, de su plano al de siempre en 0,7 s, con la curva suave de entrada y salida
    if (this.salida) {
      const s = this.salida; s.t += dt; const k = Math.min(1, s.t / 0.7), e = k * k * (3 - 2 * k);
      this.cam.position.lerpVectors(s.pos, p, e);
      this.cam.lookAt(_l2.lerpVectors(s.look, _l.set(this.focus.x, this.focus.y + 0.1, this.focus.z), e));
      const f0 = this.cam.userData.fov0 || s.fov; this.cam.fov = s.fov + (f0 - s.fov) * e; this.cam.updateProjectionMatrix();
      if (k >= 1) { this.salida = null; this.fovTocado = false; }
      return;
    }
    // (si la charla se cortó de otra manera, sin su vuelta, el objetivo vuelve a ser el de siempre)
    if (this.fovTocado) { this.fovTocado = false; const f0 = this.cam.userData.fov0; if (f0 && this.cam.fov !== f0) { this.cam.fov = f0; this.cam.updateProjectionMatrix(); } }
    this.cam.position.copy(p);
    this.cam.lookAt(this.focus.x, this.focus.y + 0.1, this.focus.z);
  }
}
