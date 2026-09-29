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
export function nearby(x, z, r) {
  const out = new Set();
  const i0 = Math.floor((x - r) / CELL), i1 = Math.floor((x + r) / CELL), j0 = Math.floor((z - r) / CELL), j1 = Math.floor((z + r) / CELL);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const l = grid.get(key(i, j)); if (l) for (const c of l) out.add(c); }
  return out;
}

// Empuja un círculo (x,z,r) fuera de los obstáculos. Devuelve {x,z,hit}
export function resolve(x, z, r, ignore) {
  let hit = false;
  for (let it = 0; it < 3; it++) {
    let moved = false;
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
  return { x, z, hit };
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

export function resetColliders() { COLLIDERS.length = 0; grid.clear(); }
