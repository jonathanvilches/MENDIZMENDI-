// Mapa en vectores: las capas del terreno (campos, bosque, roca, caminos, calles y agua) se convierten en
// contornos cerrados a partir de las máscaras del mundo (marching squares con interpolación), se simplifican
// y se dibujan como curvas: nítidas a cualquier aumento y ligeras de pintar. Los árboles salen como copas al ampliar.
import { HALF, CELL, N, fieldInfo } from '../world/layout.js';
import { SURF } from '../world/heightfield.js';
import { TREES } from '../world/nature.js';

// suavizado 3×3 dos veces: bordes redondeados en lugar de escalones de 2 m; el borde del mundo queda fuera
function smooth(conv) {
  let a = new Float32Array(N * N), b = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) a[k] = conv(k);
  for (let pass = 0; pass < 2; pass++) {
    for (let j = 0; j < N; j++) for (let i = 1; i < N - 1; i++) { const k = j * N + i; b[k] = (a[k - 1] + 2 * a[k] + a[k + 1]) / 4; }
    for (let j = 1; j < N - 1; j++) for (let i = 0; i < N; i++) { const k = j * N + i; a[k] = (b[k - N] + 2 * b[k] + b[k + N]) / 4; }
  }
  for (let i = 0; i < N; i++) { a[i] = a[(N - 1) * N + i] = a[i * N] = a[i * N + N - 1] = 0; }
  return a;
}

// Douglas-Peucker sobre un anillo cerrado: se parte en dos por el punto más lejano del inicio
function simplifyRing(pts, tol) {
  let f = 0, fd = -1; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > fd) { fd = d; f = i; } }
  if (f <= 0) return pts;
  const a = simplify(pts.slice(0, f + 1), tol), b = simplify(pts.slice(f), tol);
  return a.concat(b.slice(1));
}
function simplify(pts, tol) {
  if (pts.length < 8) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); const A = pts[a], B = pts[b], dx = B[0] - A[0], dz = B[1] - A[1], L = Math.hypot(dx, dz) || 1e-6;
    let m = -1, md = tol;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((pts[i][0] - A[0]) * dz - (pts[i][1] - A[1]) * dx) / L; if (d > md) { md = d; m = i; } }
    if (m > 0) { keep[m] = 1; st.push([a, m], [m, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

// contornos cerrados del nivel t: los cortes de cada celda se enlazan por la arista de la rejilla que comparten
function contour(f, t) {
  const pos = new Map(), adj = new Map();
  const X = (i) => -HALF + i * CELL, Z = (j) => -HALF + j * CELL;
  const cut = (id, A, B, a, b) => { if (!pos.has(id)) { const s = (t - a) / (b - a); pos.set(id, [A[0] + (B[0] - A[0]) * s, A[1] + (B[1] - A[1]) * s]); } return id; };
  const link = (p, q) => { (adj.get(p) || adj.set(p, []).get(p)).push(q); (adj.get(q) || adj.set(q, []).get(q)).push(p); };
  for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
    const k = j * N + i, v0 = f[k], v1 = f[k + 1], v2 = f[k + N + 1], v3 = f[k + N];
    const n = (v0 >= t) + (v1 >= t) + (v2 >= t) + (v3 >= t); if (n === 0 || n === 4) continue;
    const c0 = [X(i), Z(j)], c1 = [X(i + 1), Z(j)], c2 = [X(i + 1), Z(j + 1)], c3 = [X(i), Z(j + 1)];
    const e = [];
    if ((v0 >= t) !== (v1 >= t)) e.push(cut(k * 2, c0, c1, v0, v1));
    if ((v1 >= t) !== (v2 >= t)) e.push(cut((k + 1) * 2 + 1, c1, c2, v1, v2));
    if ((v2 >= t) !== (v3 >= t)) e.push(cut((k + N) * 2, c3, c2, v3, v2));
    if ((v3 >= t) !== (v0 >= t)) e.push(cut(k * 2 + 1, c0, c3, v0, v3));
    for (let q = 0; q + 1 < e.length; q += 2) link(e[q], e[q + 1]);
  }
  const p = new Path2D(), seen = new Set(); let verts = 0;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const ring = []; let prev = -1, cur = start;
    while (cur !== undefined && !seen.has(cur)) { seen.add(cur); ring.push(pos.get(cur)); const nb = adj.get(cur); const nx = nb[0] !== prev ? nb[0] : nb[1]; prev = cur; cur = nx; }
    if (ring.length < 4) continue;
    ring.push(ring[0]);
    const r = simplifyRing(ring, 0.35); verts += r.length;
    if (r.length < 4) continue;
    // curva suave: pasa por los puntos medios de cada tramo
    let m = mid(r[0], r[1]); p.moveTo(m[0], m[1]);
    for (let q = 1; q < r.length - 1; q++) { const n2 = mid(r[q], r[q + 1]); p.quadraticCurveTo(r[q][0], r[q][1], n2[0], n2[1]); }
    p.quadraticCurveTo(r[0][0], r[0][1], m[0], m[1]); p.closePath();
  }
  return { p, verts };
}

const FIELD = ['#93c05e', '#d0bd6c', '#e2c870', '#a8835c', '#74b04c', '#8f9c4c', '#9aa86a', '#7fae4c', '#6d9c44'];

// trabajos del mapa, uno por capa (para repartirlos en ratos libres)
function jobs() {
  const J = [], ft = new Int8Array(N * N).fill(-1);
  J.push(() => {
    // los campos se miden cada 4 m y se rellenan las celdas vecinas
    if (fieldInfo) for (let j = 0; j < N; j += 2) for (let i = 0; i < N; i += 2) {
      const fi = fieldInfo(-HALF + i * CELL, -HALF + j * CELL); if (!fi || fi.mask <= 0.5) continue;
      for (let b = 0; b < 2 && j + b < N; b++) for (let a = 0; a < 2 && i + a < N; a++) ft[(j + b) * N + i + a] = fi.type;
    }
    return null;
  });
  for (let t = 0; t < FIELD.length; t++) J.push(() => { let any = false; for (let k = 0; k < N * N; k += 7) if (ft[k] === t) { any = true; break; } return any ? { ...contour(smooth((k) => (ft[k] === t ? 1 : 0)), 0.5), fill: FIELD[t], stroke: 'rgba(90,70,40,.3)', lw: 0.8 } : null; });
  const L = (arr, t, fill, stroke, lw, bin) => J.push(() => ({ ...contour(smooth(bin ? (k) => (arr[k] ? 1 : 0) : (k) => arr[k] / 255), t), fill, stroke, lw }));
  L(SURF.forest, 0.5, '#4f8a3e', 'rgba(30,60,25,.4)', 1);
  L(SURF.rock, 0.5, '#b0aa9e', 'rgba(80,74,64,.4)', 1);
  L(SURF.dirt, 0.42, '#d2ad74', 'rgba(120,88,50,.5)', 0.8);
  L(SURF.street, 0.42, '#e3d8c0', 'rgba(110,96,74,.6)', 0.9);
  L(SURF.water, 0.5, '#57aedc', '#2f7fb0', 1.2, true);
  return J;
}
export function buildMapVectors() { const layers = []; for (const j of jobs()) { const l = j(); if (l) layers.push(l); } return { layers }; }
// en segundo plano: una capa en cada rato libre; done(vec) al terminar. finishNow() acaba lo que falte.
export function buildMapVectorsIdle(done) {
  const J = jobs(), layers = []; let i = 0, over = false;
  const fin = () => { if (!over) { over = true; done({ layers }); } };
  const step = (dl) => { if (over) return; do { const l = J[i++](); if (l) layers.push(l); } while (i < J.length && dl && dl.timeRemaining && dl.timeRemaining() > 8); if (i < J.length) schedule(); else fin(); };
  const schedule = () => window.requestIdleCallback ? requestIdleCallback(step, { timeout: 4000 }) : setTimeout(step, 60);
  schedule();
  return { finishNow: () => { while (i < J.length) { const l = J[i++](); if (l) layers.push(l); } fin(); } };
}

// Pintar trazados grandes cuesta: se pintan en una imagen de caché (la vista y un margen alrededor) y solo se
// repintan al cambiar el aumento o salir de la zona guardada. Durante un gesto se usa la caché escalada y,
// al parar, se repinta nítida (later() pide ese repintado).
export function drawMapVectors(g, vec, v, W, H, dpr, later) {
  if (!vec) return;
  const C = vec.cache ||= { c: document.createElement('canvas') }, now = performance.now();
  // se está ampliando si el aumento cambió desde el último dibujo
  if (C.lastS !== undefined && Math.abs(C.lastS - v.s) > 1e-6) C.lastZoom = now;
  C.lastS = v.s;
  const inside = C.s !== undefined && v.cx - W / 2 / v.s >= C.x0 && v.cx + W / 2 / v.s <= C.x1 && v.cz - H / 2 / v.s >= C.z0 && v.cz + H / 2 / v.s <= C.z1;
  const settled = !C.lastZoom || now - C.lastZoom > 160;
  if (!(C.s === v.s && inside) && (settled || C.s === undefined)) {
    // nueva caché: la vista y medio ancho más a cada lado (limitada a 4096 px)
    const k = Math.min(2, 4096 / (W * dpr), 4096 / (H * dpr)), cw = Math.round(W * dpr * k), ch = Math.round(H * dpr * k);
    C.c.width = cw; C.c.height = ch; C.s = v.s; C.dpr = dpr;
    C.x0 = v.cx - W * k / 2 / v.s; C.x1 = v.cx + W * k / 2 / v.s; C.z0 = v.cz - H * k / 2 / v.s; C.z1 = v.cz + H * k / 2 / v.s;
    const cg = C.c.getContext('2d');
    paintVectors(cg, vec, v.s * dpr, -C.x0 * v.s * dpr, -C.z0 * v.s * dpr, { x0: C.x0, x1: C.x1, z0: C.z0, z1: C.z1 }, dpr);
  } else if (!settled && later) later(170);
  // copia de la caché a pantalla (con escala si se está ampliando)
  const sx = (C.x0 - v.cx) * v.s + W / 2, sz = (C.z0 - v.cz) * v.s + H / 2, sc = v.s / C.s;
  g.save(); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.imageSmoothingEnabled = true;
  g.drawImage(C.c, sx, sz, C.c.width / C.dpr * sc, C.c.height / C.dpr * sc);
  g.restore();
}

function paintVectors(g, vec, s, tx, tz, view, px) {
  g.save();
  g.setTransform(s, 0, 0, s, tx, tz);
  g.lineJoin = 'round';
  for (const l of vec.layers) {
    g.fillStyle = l.fill; g.fill(l.p, 'evenodd');
    if (l.stroke) { g.strokeStyle = l.stroke; g.lineWidth = l.lw * px / s; g.stroke(l.p); }
  }
  // copas de los árboles al ampliar (solo las que se ven)
  if (s > 1.6 * px && TREES?.length) {
    const x0 = view.x0 - 6, x1 = view.x1 + 6, z0 = view.z0 - 6, z1 = view.z1 + 6;
    const dark = new Path2D(), lite = new Path2D();
    for (const t of TREES) {
      if (t.x < x0 || t.x > x1 || t.z < z0 || t.z > z1) continue;
      const r = (t.type === 'fir' || t.type === 'pine' ? 1.6 : 2.4) * (t.s || 1);
      dark.moveTo(t.x + r, t.z); dark.arc(t.x, t.z, r, 0, 6.2832);
      lite.moveTo(t.x - r * 0.25 + r * 0.45, t.z - r * 0.3); lite.arc(t.x - r * 0.25, t.z - r * 0.3, r * 0.45, 0, 6.2832);
    }
    g.fillStyle = '#2f6a2c'; g.fill(dark); g.strokeStyle = 'rgba(20,45,18,.6)'; g.lineWidth = 0.9 * px / s; g.stroke(dark);
    g.fillStyle = 'rgba(140,200,100,.45)'; g.fill(lite);
  }
  g.restore();
}
