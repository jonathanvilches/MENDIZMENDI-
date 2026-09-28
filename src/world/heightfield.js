// Hornea la geografía en rejillas para consultas rápidas (altura, superficie, bosque)
import { HALF, CELL, N, finalHeight, pathQuery, iratiMask, villageMask, meadowMask, plazaMask, BRIDGES, PLACES, riverInfo, POND_LEVEL } from './layout.js';
import { clamp, lerp, smoothstep } from '../util/math.js';
import { fbm } from '../util/noise.js';

export const H = new Float32Array(N * N);
export const SURF = {
  street: new Uint8Array(N * N),  // empedrado
  dirt: new Uint8Array(N * N),    // tierra / sendero
  forest: new Uint8Array(N * N),  // densidad de bosque
  rock: new Uint8Array(N * N),
  grass: new Uint8Array(N * N),   // densidad de hierba alta
  water: new Uint8Array(N * N),   // 1 = agua
};

const idx = (i, j) => j * N + i;

export function bake() {
  const t0 = performance.now();
  for (let j = 0; j < N; j++) {
    const z = -HALF + j * CELL;
    for (let i = 0; i < N; i++) {
      const x = -HALF + i * CELL;
      const p = pathQuery(x, z);
      const f = finalHeight(x, z, p);
      const k = idx(i, j);
      H[k] = f.h;
      const r = f.river;
      const inWater = r.edge < 1.5 && f.h < r.level - 0.05;
      const dp = Math.hypot(x - PLACES.pond.x, z - PLACES.pond.z);
      const inPond = dp < PLACES.pond.r + 4 && f.h < POND_LEVEL() - 0.05;
      SURF.water[k] = inWater || inPond ? 1 : 0;
      let street = 0, dirt = 0;
      if (p.type === 'street') street = 1 - smoothstep(p.w - 0.6, p.w + 0.4, p.d);
      else if (p.type) dirt = 1 - smoothstep(p.w - 0.7, p.w + 0.5, p.d);
      street = Math.max(street, plazaMask(x, z));
      // cancha del frontón
      if (Math.abs(x - (PLACES.fronton.x)) < 16 && Math.abs(z - PLACES.fronton.z) < 6.5) street = 1;
      // Zona de la fuente del pueblo algo más empedrada
      SURF.street[k] = street * 255;
      SURF.dirt[k] = dirt * 255;
      // bosque
      const vm = f.vm, mm = f.mm;
      const n1 = fbm(x / 90 + 11, z / 90 - 4, 3);
      let forest = 0;
      const irati = iratiMask(x, z);
      forest = Math.max(forest, irati * smoothstep(-0.55, -0.2, n1));
      forest = Math.max(forest, smoothstep(0.05, 0.35, n1) * smoothstep(60, 140, r.d));
      const r4 = Math.pow(x ** 4 + z ** 4, 0.25);
      forest *= 1 - smoothstep(470, 520, r4) * 0.8;
      forest *= 1 - vm;
      forest *= 1 - mm * 0.95;
      forest *= 1 - smoothstep(35, 16, Math.hypot(x - PLACES.muskilda.x, z - PLACES.muskilda.z));
      forest *= 1 - smoothstep(PLACES.pond.r + 12, PLACES.pond.r + 2, dp);
      forest *= 1 - smoothstep(16, 8, Math.hypot(x - PLACES.waterfall.x, z - PLACES.waterfall.z));
      forest *= smoothstep(2, 6, p.d - p.w);
      forest *= smoothstep(1, 5, r.edge);
      SURF.forest[k] = clamp(forest, 0, 1) * 255;
      let grass = 1 - Math.max(street, dirt * 0.9);
      grass *= inWater || inPond ? 0 : smoothstep(-0.2, 1.2, r.edge);
      grass *= 1 - vm * 0.55 * (1 - smoothstep(18, 30, r.d));
      SURF.grass[k] = clamp(grass, 0, 1) * 255;
    }
  }
  // roca por pendiente
  for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
    const k = idx(i, j);
    const gx = (H[k + 1] - H[k - 1]) / (2 * CELL), gz = (H[k + N] - H[k - N]) / (2 * CELL);
    const s = Math.hypot(gx, gz);
    const rock = smoothstep(0.75, 1.25, s) + smoothstep(115, 150, H[k]) * 0.5;
    SURF.rock[k] = clamp(rock, 0, 1) * 255;
    if (rock > 0.5) { SURF.grass[k] *= 0.3; SURF.forest[k] *= 0.5; }
  }
  console.log('bake', (performance.now() - t0).toFixed(0), 'ms');
}

function sampleGrid(arr, x, z) {
  const fx = clamp((x + HALF) / CELL, 0, N - 1.001), fz = clamp((z + HALF) / CELL, 0, N - 1.001);
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
  const k = j * N + i;
  // triangulación coherente con la malla (diagonal de i,j+1 a i+1,j)
  if (u + v < 1) return arr[k] + (arr[k + 1] - arr[k]) * u + (arr[k + N] - arr[k]) * v;
  return arr[k + N + 1] + (arr[k + N] - arr[k + N + 1]) * (1 - u) + (arr[k + 1] - arr[k + N + 1]) * (1 - v);
}
export const terrainHeight = (x, z) => sampleGrid(H, x, z);
export const surfAt = (name, x, z) => sampleGrid(SURF[name], x, z) / 255;

// ---------- Puentes ----------
export function deckY(b, x) {
  const t = clamp((x - b.xa) / (b.xb - b.xa), 0, 1);
  const ya = b.ya, yb = b.yb;
  return lerp(ya, yb, t) + b.arch * Math.sin(Math.PI * t) ** 0.9 + 0.05;
}
export function initBridges() {
  for (const b of BRIDGES) {
    b.ya = terrainHeight(b.xa, b.z); b.yb = terrainHeight(b.xb, b.z);
  }
}
export function bridgeAt(x, z) {
  for (const b of BRIDGES) if (Math.abs(z - b.z) < b.w / 2 + 0.1 && x > b.xa && x < b.xb) return b;
  return null;
}

// Altura del suelo caminable (terreno o tablero de puente)
export function groundHeight(x, z) {
  const t = terrainHeight(x, z);
  const b = bridgeAt(x, z);
  if (b) return Math.max(t, deckY(b, x));
  return t;
}

// Nivel de agua en un punto (o -Infinity si no hay agua cerca)
export function waterLevelAt(x, z) {
  const dp = Math.hypot(x - PLACES.pond.x, z - PLACES.pond.z);
  if (dp < PLACES.pond.r + 8) return POND_LEVEL();
  const r = riverInfo(x, z);
  if (r.edge < 3) return r.level;
  return -Infinity;
}
