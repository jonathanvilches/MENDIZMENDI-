// Colisiones 2D (cajas orientadas y círculos) con rejilla espacial
const CELL = 8;
const grid = new Map();
export const COLLIDERS = [];

function key(i, j) { return i * 73856093 ^ j * 19349663; }

export function addBox(x, z, w, d, rot = 0, meta = {}) {
  const c = { type: 'box', x, z, hw: w / 2, hd: d / 2, cos: Math.cos(rot), sin: Math.sin(rot), ...meta };
  const r = Math.hypot(c.hw, c.hd);
  insert(c, x, z, r);
  return c;
}
export function addCircle(x, z, r, meta = {}) {
  const c = { type: 'circle', x, z, r, ...meta };
  insert(c, x, z, r);
  return c;
}
function insert(c, x, z, r) {
  c.bound = r;
  COLLIDERS.push(c);
  const i0 = Math.floor((x - r) / CELL), i1 = Math.floor((x + r) / CELL), j0 = Math.floor((z - r) / CELL), j1 = Math.floor((z + r) / CELL);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const k = key(i, j); let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(c);
  }
}
// cuerpos que se mueven (vecinos y animales): fuera de la rejilla fija (se quedarían en la celda donde nacieron y lejos
// de ella se les podía atravesar); se miran todos en cada choque, son pocos
export const MOVERS = [];
export function addMover(x, z, r, meta = {}) { const c = { type: 'circle', x, z, r, mover: true, ...meta }; MOVERS.push(c); return c; }
export function removeMover(c) { const i = MOVERS.indexOf(c); if (i >= 0) MOVERS.splice(i, 1); }
export function nearby(x, z, r) {
  const out = new Set();
  const i0 = Math.floor((x - r) / CELL), i1 = Math.floor((x + r) / CELL), j0 = Math.floor((z - r) / CELL), j1 = Math.floor((z + r) / CELL);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const l = grid.get(key(i, j)); if (l) for (const c of l) out.add(c); }
  return out;
}

const _near = [];
function moversNear(x, z, r) { _near.length = 0; for (const c of MOVERS) if (Math.abs(c.x - x) < c.r + r + 0.5 && Math.abs(c.z - z) < c.r + r + 0.5) _near.push(c); return _near.slice(); }
// Empuja un círculo (x,z,r) fuera de los obstáculos. Devuelve {x,z,hit}
export function resolve(x, z, r, ignore) {
  let hit = false, mover = null;
  for (let it = 0; it < 3; it++) {
    let moved = false;
    for (const c of moversNear(x, z, r)) {
      if (c === ignore || c.ghost) continue;
      const who = c.actor || c.animal; if (who && (!who.obj?.parent || who.visible === false)) continue;   // fuera de la escena u oculto: no estorba
      const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
      if (d < m && d > 1e-5) { x = c.x + dx / d * m; z = c.z + dz / d * m; hit = moved = true; mover = c; }
    }
    for (const c of nearby(x, z, r + 2)) {
      if (c === ignore || c.ghost) continue;
      if (c.type === 'circle') {
        const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
        if (d < m && d > 1e-5) { x = c.x + dx / d * m; z = c.z + dz / d * m; hit = moved = true; }
      } else {
        // a espacio local de la caja
        const dx = x - c.x, dz = z - c.z;
        const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
        const px = Math.max(-c.hw, Math.min(c.hw, lx)), pz = Math.max(-c.hd, Math.min(c.hd, lz));
        let ex = lx - px, ez = lz - pz, d = Math.hypot(ex, ez);
        if (d < r) {
          let nx, nz;
          if (d > 1e-5) { nx = ex / d; nz = ez / d; }
          else { // dentro: salir por el lado más cercano
            const ox = c.hw - Math.abs(lx), oz = c.hd - Math.abs(lz);
            if (ox < oz) { nx = Math.sign(lx) || 1; nz = 0; d = -ox; } else { nx = 0; nz = Math.sign(lz) || 1; d = -oz; }
          }
          const push = r - d;
          const nlx = lx + nx * push, nlz = lz + nz * push;
          x = c.x + nlx * c.cos + nlz * c.sin; z = c.z - nlx * c.sin + nlz * c.cos;
          hit = moved = true;
        }
      }
    }
    if (!moved) break;
  }
  return { x, z, hit, mover };
}

/** Como isFree pero sin crear listas (la rejilla de caminos de nav.js lo pregunta cientos de miles de veces). */
export function freeFast(x, z, r) {
  const i0 = Math.floor((x - r - 2) / CELL), i1 = Math.floor((x + r + 2) / CELL), j0 = Math.floor((z - r - 2) / CELL), j1 = Math.floor((z + r + 2) / CELL);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const l = grid.get(key(i, j)); if (!l) continue;
    for (const c of l) {
      if (c.type === 'circle') { const dx = x - c.x, dz = z - c.z, m = c.r + r; if (dx * dx + dz * dz < m * m) return false; continue; }
      const dx = x - c.x, dz = z - c.z, lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
      const ex = Math.abs(lx) - c.hw, ez = Math.abs(lz) - c.hd;
      if (ex < r && ez < r && (ex <= 0 || ez <= 0 || ex * ex + ez * ez < r * r)) return false;
    }
  }
  return true;
}
// ¿Está libre un área circular?
export function isFree(x, z, r) {
  for (const c of nearby(x, z, r + 2)) {
    if (c.type === 'circle') { if (Math.hypot(x - c.x, z - c.z) < c.r + r) return false; }
    else {
      const dx = x - c.x, dz = z - c.z;
      const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
      const px = Math.max(-c.hw, Math.min(c.hw, lx)), pz = Math.max(-c.hd, Math.min(c.hd, lz));
      if (Math.hypot(lx - px, lz - pz) < r) return false;
    }
  }
  return true;
}

/**
 * ¿Está libre un rectángulo girado entero? (x, z) y ry como las tarimas de heightfield.addPlatform; x0..x1 y z0..z1 en
 * coordenadas locales; m: holgura. A diferencia de mirar isFree en una rejilla de puntos, no se le escapan las cosas
 * pequeñas que caen entre punto y punto (la farola que quedó dentro del frontón de Javier).
 */
export function rectFree(x, z, ry, x0, x1, z0, z1, m = 0) {
  const c = Math.cos(ry), s = Math.sin(ry), ax = (x0 + x1) / 2, az = (z0 + z1) / 2, ahw = (x1 - x0) / 2 + m, ahd = (z1 - z0) / 2 + m;
  for (const o of nearby(x + ax * c + az * s, z - ax * s + az * c, Math.hypot(ahw, ahd) + 2)) {
    const dx = o.x - x, dz = o.z - z, lx = dx * c - dz * s, lz = dx * s + dz * c;
    if (o.type === 'circle') {
      const px = Math.max(x0, Math.min(x1, lx)), pz = Math.max(z0, Math.min(z1, lz));
      if (Math.hypot(lx - px, lz - pz) < o.r + m) return false;
      continue;
    }
    // dos rectángulos girados: se tocan si no hay un eje que los separe (los dos del rectángulo y los dos de la caja)
    const cd = Math.abs(c * o.cos + s * o.sin), sd = Math.abs(s * o.cos - c * o.sin), tx = lx - ax, tz = lz - az;
    const ux = c * o.cos + s * o.sin, uz = s * o.cos - c * o.sin;   // eje x de la caja visto desde el rectángulo
    if (Math.abs(tx) > ahw + o.hw * cd + o.hd * sd) continue;
    if (Math.abs(tz) > ahd + o.hw * sd + o.hd * cd) continue;
    if (Math.abs(tx * ux + tz * uz) > o.hw + ahw * cd + ahd * sd) continue;
    if (Math.abs(-tx * uz + tz * ux) > o.hd + ahw * sd + ahd * cd) continue;
    return false;
  }
  return true;
}

// Rayo 2D contra cajas (para línea de visión)
export function segmentBlocked(ax, az, bx, bz) {
  const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / 1.5);
  for (let s = 1; s < steps; s++) {
    const t = s / steps, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
    for (const c of nearby(x, z, 1)) {
      if (c.type !== 'box' || !c.solidView) continue;
      const dx = x - c.x, dz = z - c.z;
      const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
      if (Math.abs(lx) < c.hw && Math.abs(lz) < c.hd) return true;
    }
  }
  return false;
}

/** Quita un obstáculo (por ejemplo, el tronco de un árbol que ha quedado debajo de un frontón). */
export function removeCollider(c) {
  const i = COLLIDERS.indexOf(c); if (i < 0) return; COLLIDERS.splice(i, 1);
  const r = c.bound, i0 = Math.floor((c.x - r) / CELL), i1 = Math.floor((c.x + r) / CELL), j0 = Math.floor((c.z - r) / CELL), j1 = Math.floor((c.z + r) / CELL);
  for (let a = i0; a <= i1; a++) for (let b = j0; b <= j1; b++) { const l = grid.get(key(a, b)); const k = l ? l.indexOf(c) : -1; if (k >= 0) l.splice(k, 1); }
}
export function resetColliders() { COLLIDERS.length = 0; grid.clear(); MOVERS.length = 0; }
