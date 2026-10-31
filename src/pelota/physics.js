// Física de la pelota (sin dependencias): vuelo con gravedad y rozamiento, botes en el suelo,
// en el frontis y en la pared izquierda. Devuelve eventos para que el árbitro aplique las reglas.
import { COURT, PHYS } from './rules.js';

const R = COURT.BALL_R;
// cómo es el frontón donde se juega: cuánto sale la pelota del frontis, cuánto bota en el suelo y cuánto corre al botar
// (1 = lo de siempre). Lo pone el partido al empezar (setFeel, con courtFeel de rules.js) y lo quita al acabar; la
// predicción de la IA usa la misma física, así que el rival también juega con el frontón como es
export const FEEL = { front: 1, floor: 1, run: 1, backH: 0, leftH: 0 };
// (backH y leftH: alto del rebote y de la pared izquierda; en el frontón cubierto llegan hasta el techo y la pelota no
// se sale: por encima de la raya sigue siendo mala, pero rebota en la pared)
export function setFeel(f = null) { FEEL.front = f?.front ?? 1; FEEL.floor = f?.floor ?? 1; FEEL.run = f?.run ?? 1; FEEL.backH = f?.backH || 0; FEEL.leftH = f?.leftH || 0; }
export const vec = (x = 0, y = 0, z = 0) => ({ x, y, z });

// (un solo array para los eventos de las simulaciones de los golpes: no crea uno nuevo en cada paso)
const _out = [];
export class Ball {
  constructor() { this.p = vec(0, 1, 10); this.v = vec(); this.spin = 0; }
  set(p, v) { this.p = { ...p }; this.v = { ...v }; this.over = false; }
  clone() { const b = new Ball(); b.set(this.p, this.v); b.spin = this.spin; return b; }
  // avanza dt (tiempo de juego) y devuelve los eventos ocurridos
  step(dt, out = []) {
    const { p, v } = this, { G, DRAG } = PHYS;
    v.y -= G * dt;
    const k = 1 - DRAG * dt; v.x *= k; v.y *= k; v.z *= k;
    p.x += v.x * dt; p.y += v.y * dt; p.z += v.z * dt;
    // frontis
    if (p.z < R && v.z < 0) {
      out.push({ type: 'front', x: p.x, y: p.y, z: 0 });
      // cortada (spin 1): sale del frontis con más fuerza y rasa, casi sin subir ni bajar
      if (this.spin === 1) { p.z = R; v.z = -v.z * PHYS.CUT_E * FEEL.front; v.x *= PHYS.FRONT_FX; v.y = Math.max(0.6, Math.abs(v.y) * 0.25); }
      else { p.z = R; v.z = -v.z * PHYS.FRONT_E * FEEL.front; v.x *= PHYS.FRONT_FX; v.y *= PHYS.FRONT_F; }
    }
    // pared izquierda
    // (por encima de la pared no hay rebote: sale fuera, pero se avisa para el árbitro)
    if (p.x < -COURT.W / 2 + R && v.x < 0 && p.z < COURT.L + 2 && p.y > (FEEL.leftH || COURT.LEFT_H)) { if (!this.over) { this.over = true; out.push({ type: 'left', x: -COURT.W / 2, y: p.y, z: p.z, over: true }); } }
    else if (p.x < -COURT.W / 2 + R && v.x < 0 && p.z < COURT.L + 2) {
      out.push({ type: 'left', x: -COURT.W / 2, y: p.y, z: p.z });
      p.x = -COURT.W / 2 + R; v.x = -v.x * PHYS.WALL_E; v.z *= 0.97;
    }
    // el rebote: la pared de atrás, baja (por encima pasa y se pierde)
    if (p.z > COURT.REBOTE - R && v.z > 0 && p.y < (FEEL.backH || COURT.REBOTE_H) && p.x > -COURT.W / 2 - 0.6 && p.x < COURT.W / 2 + 0.3) {
      out.push({ type: 'back', x: p.x, y: p.y, z: COURT.REBOTE });
      p.z = COURT.REBOTE - R; v.z = -v.z * PHYS.BACK_E; v.x *= 0.9;
    }
    // suelo
    if (p.y < R && v.y < 0) {
      out.push({ type: 'floor', x: p.x, y: 0, z: p.z, vy: v.y });
      p.y = R;
      // rebote: un golpe fuerte (llega a 10 m/s o más) bota lo de siempre; una pelota que llega despacio (la dejada, el
      // segundo bote) rebota algo más en proporción, como el cuero de verdad, y no se queda pegada al suelo
      const soft = this.spin === 1 ? 0 : Math.max(0, Math.min(1, (10 - Math.abs(v.y)) / 5)) * PHYS.FLOOR_SOFT;   // (la cortada, siempre algo más baja)
      if (Math.abs(v.y) < 0.4) v.y = 0; else v.y = -v.y * ((this.spin === 1 ? PHYS.CUT_FLOOR_E : PHYS.FLOOR_E) + soft) * FEEL.floor;
      const f = Math.min(0.95, (this.spin === 1 ? PHYS.CUT_FLOOR_F : PHYS.FLOOR_F) * FEEL.run); v.x *= f; v.z *= f;   // la cortada bota bajo y corre
    }
    return out;
  }
}

// Simula hacia delante y devuelve muestras y eventos, sin tocar la pelota real
export function predict(ball, T = 3.2, dt = 1 / 120, alreadyFront = false) {
  const b = ball.clone(), samples = [], events = [];
  let bouncesAfterFront = 0, front = alreadyFront;
  for (let t = 0; t < T; t += dt) {
    const ev = b.step(dt, []);
    for (const e of ev) {
      e.t = t;
      if (e.type === 'front') front = true;
      if (e.type === 'floor' && front) { bouncesAfterFront++; e.n = bouncesAfterFront; }
      events.push(e);
    }
    samples.push({ t, x: b.p.x, y: b.p.y, z: b.p.z, front, bounces: bouncesAfterFront, sp: Math.hypot(b.v.x, b.v.y, b.v.z) });
    if (bouncesAfterFront >= 2 && t > 0.2) break;
  }
  return { samples, events };
}

// Velocidad para que la pelota salga de p y dé en el frontis en (tx, ty) tras T segundos
export function aimVelocity(p, tx, ty, T) {
  const G = PHYS.G;
  // compensación aproximada del rozamiento
  const k = 1 + PHYS.DRAG * T * 0.5;
  return vec((tx - p.x) / T * k, ((ty - p.y) + 0.5 * G * T * T) / T * k, (0 - p.z) / T * k);
}

// Velocidad para que la pelota salga de p y pase por el punto t (en el aire) tras T segundos
function aimVelocityTo(p, t, T) {
  const G = PHYS.G, k = 1 + PHYS.DRAG * T * 0.5;
  return vec((t.x - p.x) / T * k, ((t.y - p.y) + 0.5 * G * T * T) / T * k, (t.z - p.z) / T * k);
}

// Golpe a dos paredes: primero a la pared izquierda, luego al frontis (por encima de la chapa) y sale cruzado a la
// cancha (twoWallsTo, más abajo).
// (el recorrido de una dos paredes: pared izquierda, frontis sin botar antes y el bote. Solo lo que hace falta y parando
// en cuanto se sabe: null si toca el frontis antes que la pared, si bota antes del frontis o si no llega a botar)
function twoWallsPath(p, v, spin = 0) {
  const b = new Ball(); b.set(p, v); b.spin = spin; let left = false, front = null;
  for (let t = 0; t < 4; t += 1 / 120) {
    _out.length = 0; b.step(1 / 120, _out);
    for (const e of _out) {
      e.t = t;
      if (e.type === 'left') left = true;
      else if (e.type === 'front') { if (!front) { if (!left) return null; front = e; } }
      else if (e.type === 'floor') { if (!front) return null; e.n = 1; return { front, land: e }; }
    }
  }
  return null;
}
// Primer bote tras el frontis para un golpe dado
// Dónde toca primero el frontis y dónde bota después (y si antes da en el rebote o bota antes del frontis). Es lo que más
// se calcula al golpear (el golpe prueba decenas de trayectorias), así que no guarda el recorrido como predict(): solo
// los eventos que hacen falta, y para en cuanto bota tras el frontis. Mismo resultado, mucho menos trabajo y memoria
// (antes cada golpe costaba de 1 a 12 ms; en el móvil, algún fotograma perdido al golpear)
// (spin: el de la cortada, que sale del frontis de otra manera; left: si entre el frontis y el bote toca la pared izquierda)
export function landingOf(p, v, spin = 0) {
  const b = new Ball(); b.set(p, v); b.spin = spin;
  let front = null, land = null, floorBefore = null, back = null, left = null;
  for (let t = 0; t < 4; t += 1 / 120) {
    _out.length = 0; b.step(1 / 120, _out);
    for (const e of _out) {
      e.t = t;
      if (e.type === 'front') front ||= e;
      else if (e.type === 'floor') { if (front) { if (!land) { e.n = 1; land = e; } } else floorBefore ||= e; }
      else if (e.type === 'back') back ||= e;
      else if (e.type === 'left' && front && !land) left ||= e;
    }
    if (land) break;
  }
  return { front, land, floorBefore, left, back: back && (!land || back.t < land.t) ? back : null };
}

// Dos paredes hacia un bote concreto (target {x, z}): el punto de la pared izquierda, la altura y, si hace falta, algo
// menos de velocidad con los que el primer bote cae más cerca de ahí. Busca por toda la pared, de cerca del frontis a la
// altura del pelotari, en dos pasadas: una gruesa y otra fina alrededor de la mejor. Así sale desde cualquier sitio de la
// cancha y se puede dirigir: antes solveTwoWalls miraba solo unos pocos puntos de la pared y, desde la derecha o con el
// joystick a medias, no encontraba ninguno y salía otro golpe; y cuando salía, botaba casi siempre en el ancho
// opts.low: cuánto se premia que pegue bajo en el frontis (la cortada a dos paredes, rasa y cerca de la chapa);
// opts.maxFront: lo más alto que puede pegar en el frontis; opts.spin: el de la cortada (sale del frontis de otra manera)
export function twoWallsTo(p, speed, target, opts = {}) {
  const low = opts.low || 0, maxFront = opts.maxFront ?? COURT.FRONT_TOP - 0.3, xw = -COURT.W / 2 + R, spin = opts.spin || 0;
  let best = null;
  const prueba = (fz, yw, sp) => {
    const zw = Math.max(1.2, p.z * fz), d = Math.hypot(xw - p.x, zw - p.z); if (d < 1 || yw < 0.6) return;
    const v = aimVelocityTo(p, { x: xw, y: yw, z: zw }, Math.max(0.1, d / sp));
    const r = twoWallsPath(p, v, spin); if (!r) return;
    const F = r.front, land = r.land; if (F.y < COURT.CHAPA + 0.35 || F.y > maxFront) return;
    if (land.x > COURT.W / 2 - 0.3 || land.z > COURT.L - 1 || land.z < 4) return;
    const score = -Math.hypot(land.x - target.x, (land.z - target.z) * 0.7) - low * (F.y - COURT.CHAPA) * 0.4;
    if (!best || score > best.score) best = { score, v, land, front: F, wall: { x: xw, y: yw, z: zw }, fz, yw, sp };
  };
  for (const sp of [speed, speed * 0.88, speed * 0.76]) {
    for (let fz = 0.15; fz < 0.95; fz += 0.13) for (let yw = 1; yw <= 6.5; yw += 0.5) prueba(fz, yw, sp);
    if (best) break;
  }
  if (!best) return null;
  const { fz, yw, sp } = best;
  for (let a = -0.06; a < 0.07; a += 0.03) for (let b = -0.25; b < 0.3; b += 0.125) if (Math.abs(a) > 1e-6 || Math.abs(b) > 1e-6) prueba(fz + a, yw + b, sp);
  return best;
}

// Busca la altura en el frontis (ty) para que el primer bote caiga cerca de landZ
export function solveShot(p, tx, landZ, speed, tyMin = COURT.CHAPA + 0.25, tyMax = 8.6) {
  const T = Math.max(0.25, p.z / speed);
  let lo = tyMin, hi = tyMax, best = null;
  for (let i = 0; i < 14; i++) {
    const ty = (lo + hi) / 2, v = aimVelocity(p, tx, ty, T);
    const r = landingOf(p, v);
    // (si da en el rebote, la pared de atrás, antes de botar, es que va demasiado larga: así se busca más bajo en el
    // frontis. Antes los golpes muy rápidos acababan arriba del todo y la pelota pasaba por encima del rebote, fuera)
    const backFirst = r.back;
    const z = r.land && !backFirst ? r.land.z : 99;
    best = { ty, v, land: backFirst ? null : r.land, left: r.left };
    // más alto en el frontis → bote más lejano
    if (z < landZ) lo = ty; else hi = ty;
  }
  return best;
}
