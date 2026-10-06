// Caminos para los personajes: una rejilla de 1 m sobre el pueblo en la que cada casilla se sabe si se puede pisar
// (sin casas, muros, árboles ni matas; sin agua honda; sin saltos de altura) y lo que cuesta pisarla (las calles y los
// caminos, poco; el prado, más; el campo de cultivo, más aún). Un A* sobre ella da a cada vecino un camino de verdad
// por las calles, en vez de ir en línea recta y chocar con las casas. Las casillas se calculan la primera vez que se
// miran (no hace falta recorrer todo el mapa al cargar).
import { freeFast } from './colliders.js';
import { groundHeight, waterLevelAt } from './heightfield.js';
import { HALF, pathQuery, fieldInfo } from './layout.js';

// (solo el pueblo y sus alrededores: 600 m de lado; fuera, los vecinos no pasean)
const NH = Math.min(HALF, 300), CELL = 1, N = Math.round(NH * 2 / CELL) + 1;
let STATE = null, G = null, STAMP = null, SHUT = null, FROM = null, stampN = 1;
const R = 0.42;   // medio ancho de una persona (con algo de holgura)

/** Se llama al cambiar de pueblo: olvida lo calculado. */
export function resetNav() { STATE = null; QUEUE.length = 0; }
const idx = (i, j) => j * N + i;
const toCell = (v) => Math.round((v + NH) / CELL);
const toWorld = (i) => -NH + i * CELL;
// estado de una casilla: 0 sin mirar, 1 bloqueada, 2..255 coste (2 = calle)
function cell(i, j) {
  if (i < 1 || j < 1 || i >= N - 1 || j >= N - 1) return 1;
  const k = idx(i, j); let s = STATE[k];
  if (s) return s;
  const x = toWorld(i), z = toWorld(j);
  if (!freeFast(x, z, R)) s = 1;
  else {
    const g = groundHeight(x, z);
    if (waterLevelAt(x, z) - g > 0.35) s = 1;
    else {
      // un salto de altura con la casilla de al lado (talud, borde de una tapia, el muro de un puente): no se pasa
      let steep = false;
      for (const [dx, dz] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) if (Math.abs(groundHeight(x + dx, z + dz) - g) > 0.32) { steep = true; break; }
      if (steep) s = 1;
      else {
        const p = pathQuery(x, z);
        if (p.d < p.w) s = 2;                        // calle o camino
        else if (p.d < p.w + 2.5) s = 3;             // el borde
        else { const f = fieldInfo ? fieldInfo(x, z) : null; s = f && f.mask > 0.5 ? 9 : 5; }   // campo de cultivo / prado
      }
    }
  }
  STATE[k] = s; return s;
}
export const walkable = (x, z) => { if (!STATE) STATE = new Uint8Array(N * N); return cell(toCell(x), toCell(z)) > 1; };

// montón binario de casillas por coste estimado
class Heap {
  constructor() { this.k = []; this.f = []; }
  push(k, f) { const a = this.k, b = this.f; a.push(k); b.push(f); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (b[p] <= f) break; a[i] = a[p]; b[i] = b[p]; i = p; } a[i] = k; b[i] = f; }
  pop() { const a = this.k, b = this.f, top = a[0], lk = a.pop(), lf = b.pop(); if (a.length) { let i = 0; const n = a.length; for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && b[c + 1] < b[c]) c++; if (b[c] >= lf) break; a[i] = a[c]; b[i] = b[c]; i = c; } a[i] = lk; b[i] = lf; } return top; }
  get size() { return this.k.length; }
}
const D8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];

// casilla libre más cercana (por si el origen o el destino caen justo en un borde)
function nearestFree(i, j, rmax = 4) {
  if (cell(i, j) > 1) return [i, j];
  for (let r = 1; r <= rmax; r++) for (let a = -r; a <= r; a++) for (const [u, v] of [[i + a, j - r], [i + a, j + r], [i - r, j + a], [i + r, j + a]]) if (cell(u, v) > 1) return [u, v];
  return null;
}
// ¿se puede ir en línea recta de una casilla a otra sin pisar nada bloqueado ni salirse a algo mucho más caro? (las
// casillas solo se miran en su centro: además se prueba el tramo de verdad cada 25 cm, para no rozar la esquina de una
// casa que queda entre dos casillas libres)
function clear(ai, aj, bi, bj, maxCost) {
  const n = Math.ceil(Math.hypot(bi - ai, bj - aj) * 2);
  for (let s = 1; s < n; s++) { const t = s / n, c = cell(Math.round(ai + (bi - ai) * t), Math.round(aj + (bj - aj) * t)); if (c <= 1 || c > maxCost) return false; }
  return segClear(toWorld(ai), toWorld(aj), toWorld(bi), toWorld(bj));
}
/** ¿Cabe una persona por el tramo recto de (ax, az) a (bx, bz)? (solo lo fijo: casas, muros, árboles, matas) */
export function segClear(ax, az, bx, bz, r = R - 0.04) {
  const n = Math.ceil(Math.hypot(bx - ax, bz - az) * 4);
  for (let s = 1; s < n; s++) { const t = s / n; if (!freeFast(ax + (bx - ax) * t, az + (bz - az) * t, r)) return false; }
  return true;
}
/**
 * Búsqueda de camino por partes (A* que se puede pausar): cada llamada a step(n) mira hasta n casillas. Así un camino
 * largo (Iruña) se reparte entre varios fotogramas en vez de congelar el juego. done: true al acabar; path: los puntos
 * {x, z} (sin el de salida), suavizados (tramos rectos donde se puede), o null si no hay camino.
 */
class PathJob {
  constructor(ax, az, bx, bz, maxNodes) {
    if (!STATE) STATE = new Uint8Array(N * N);
    if (!G) { G = new Float32Array(N * N); STAMP = new Uint32Array(N * N); SHUT = new Uint32Array(N * N); FROM = new Int32Array(N * N); }
    this.ax = ax; this.az = az; this.bx = bx; this.bz = bz; this.max = maxNodes; this.n = 0; this.done = false; this.path = null;
    const s = this.s = nearestFree(toCell(ax), toCell(az)), e = this.e = nearestFree(toCell(bx), toCell(bz));
    if (!s || !e) { this.done = true; return; }
    this.st = ++stampN; this.start = idx(s[0], s[1]); this.goal = idx(e[0], e[1]);
    this.open = new Heap(); G[this.start] = 0; STAMP[this.start] = this.st; FROM[this.start] = -1; this.open.push(this.start, this.H(s[0], s[1]));
  }
  // (heurística algo inflada: el camino sale casi igual de bueno y se miran muchas menos casillas)
  H(i, j) { const dx = Math.abs(i - this.e[0]), dz = Math.abs(j - this.e[1]); return 3.2 * (Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz)); }
  step(budget) {
    if (this.done) return true;
    if (this.st !== stampN) { this.done = true; return true; }   // otra búsqueda ha usado la rejilla entretanto
    const open = this.open, st = this.st;
    for (let b = 0; b < budget; b++) {
      if (!open.size || this.n >= this.max) { this.done = true; return true; }
      const k = open.pop();
      // (una casilla ya cerrada no se vuelve a abrir: con la heurística inflada, reabrirlas multiplicaba el trabajo
      // por diez en los mapas grandes sin dar un camino mucho mejor)
      if (SHUT[k] === st) continue;
      SHUT[k] = st; this.n++;
      if (k === this.goal) { this.path = this.build(); this.done = true; return true; }
      const i = k % N, j = (k / N) | 0, gk = G[k];
      for (const [di, dj, w] of D8) {
        const u = i + di, v = j + dj, c = cell(u, v); if (c <= 1) continue;
        if (di && dj && (cell(i + di, j) <= 1 || cell(i, j + dj) <= 1)) continue;   // sin cortar esquinas
        const kk = idx(u, v), g2 = gk + w * c;
        if (SHUT[kk] === st || (STAMP[kk] === st && G[kk] <= g2)) continue;
        STAMP[kk] = st; G[kk] = g2; FROM[kk] = k; open.push(kk, g2 + this.H(u, v));
      }
    }
    return false;
  }
  build() {
    const cells = []; for (let k = this.goal; k !== -1 && k !== this.start; k = FROM[k]) cells.push(k); cells.reverse();
    // suavizado: desde cada punto, el más lejano al que se llega en línea recta sin salirse de la calle
    const pts = []; let ci = this.s[0], cj = this.s[1], last = -1;
    for (let q = 0; q < cells.length;) {
      let far = q;
      const maxCost = Math.max(3, cell(ci, cj));
      for (let r = Math.min(cells.length - 1, q + 40); r > q; r--) { const k = cells[r]; if (clear(ci, cj, k % N, (k / N) | 0, maxCost)) { far = r; break; } }
      const k = cells[far]; ci = k % N; cj = (k / N) | 0; pts.push({ x: toWorld(ci), z: toWorld(cj) }); q = far + 1;
      if (far === last) break; last = far;
    }
    if (pts.length) pts[pts.length - 1] = walkable(this.bx, this.bz) ? { x: this.bx, z: this.bz } : { x: toWorld(this.e[0]), z: toWorld(this.e[1]) };
    // si desde donde está de verdad (pegado a una pared, o fuera de la rejilla) no se ve el primer punto, antes va al
    // centro de su casilla libre: si no, vuelve a empujar contra la misma pared
    const s0 = { x: toWorld(this.s[0]), z: toWorld(this.s[1]) };
    if (pts.length && !segClear(this.ax, this.az, pts[0].x, pts[0].z, R - 0.1)) pts.unshift(s0);
    return pts;
  }
}
/** Camino en el acto (pruebas y caminos cortos). */
export function findPath(ax, az, bx, bz, maxNodes = 60000) { const j = new PathJob(ax, az, bx, bz, maxNodes); j.step(Infinity); return j.path; }

// cola de caminos pedidos por los personajes: se resuelven de uno en uno, unos milisegundos por fotograma
const QUEUE = [];
/** Pide un camino; cb(path | null) cuando esté. Devuelve una función para cancelarlo. */
export function requestPath(ax, az, bx, bz, cb) { const r = { args: [ax, az, bx, bz], cb, job: null, dead: false }; QUEUE.push(r); return () => { r.dead = true; }; }
/** Cada fotograma (TownGame.update): trabaja en la cola hasta ms milisegundos. */
export function navTick(ms = 2) {
  const t0 = performance.now();
  while (QUEUE.length && performance.now() - t0 < ms) {
    const r = QUEUE[0];
    if (r.dead) { QUEUE.shift(); continue; }
    if (!r.job) r.job = new PathJob(...r.args, 60000);
    if (r.job.step(400)) { QUEUE.shift(); if (!r.dead) r.cb(r.job.path); }
  }
}
