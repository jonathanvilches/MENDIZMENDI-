// Casas pirenaicas del valle de Salazar (piedra, revoco, tejados muy inclinados, balcones de madera)
import * as THREE from 'three';
import { box, gable, archRing, archPanel, colored, M, MM, builderQuality } from './builder.js';
import { addStep } from './heightfield.js';

// (colores vivos: contraventanas verdes, rojo sangre de toro, azules y ocres como las de los pueblos, pero recién
// pintadas; geranios, gitanillas y petunias de todos los colores)
const SHUTTERS = ['#2e8b57', '#b23a2a', '#2b6cb0', '#c9851c', '#c8323e', '#3f9a52', '#1f8a9a'];
const FLOWERS = ['#ff2d55', '#ff5fa2', '#ff7a1a', '#ffffff', '#d23cff', '#ffd23f', '#ff3b30', '#ff8fc7'];

// lama de contraventana: solo las caras que se ven (delante, arriba y abajo). Pegada a la contraventana, sus lados y su
// espalda no se veían nunca y eran casi la mitad de los triángulos de las ventanas de un pueblo
function slat(w, h, d, color) {
  const g = box(w, h, d); g.setIndex(Array.from(g.index.array.subarray(12, 30)));
  return colored(g, color);
}
// Dibuja una ventana en la fachada (plano local z=0 hacia +z)
function windowAt(B, T, x, y, w, h, o) {
  const F = (mx) => MM(T, mx);
  B.add('ashlar', box(w + 0.36, 0.18, 0.28, 1), F(M(x, y - h / 2 - 0.09, 0.1)));      // alféizar
  B.add('ashlar', box(w + 0.3, 0.2, 0.2, 1), F(M(x, y + h / 2 + 0.1, 0.06)));         // dintel
  B.add('ashlar', box(0.16, h, 0.2, 1), F(M(x - w / 2 - 0.08, y, 0.06)));
  B.add('ashlar', box(0.16, h, 0.2, 1), F(M(x + w / 2 + 0.08, y, 0.06)));
  // el cristal queda separado de la fachada (si coincide con la pared, parpadea al mover la cámara)
  B.add('glass', box(w, h, 0.02), F(M(x, y, 0.03)));
  // carpintería
  B.add('paint', colored(box(0.06, h, 0.06), '#e9e4d8'), F(M(x, y, 0.06)));
  B.add('paint', colored(box(w, 0.06, 0.06), '#e9e4d8'), F(M(x, y + h * 0.15, 0.06)));
  if (o.shutter) {
    const sc = o.shutter;
    for (const s of [-1, 1]) {
      const g = colored(box(w / 2 + 0.02, h + 0.05, 0.05), sc);
      // contraventana abierta contra la pared, con lamas
      B.add('paint', g, F(M(x + s * (w / 2 + 0.16 + w / 4), y, 0.1)));
      for (let k = 0; k < 4; k++) B.add('paint', slat(w / 2 - 0.08, 0.035, 0.03, new THREE.Color(sc).multiplyScalar(0.7)), F(M(x + s * (w / 2 + 0.16 + w / 4), y - h * 0.35 + k * h * 0.23, 0.14)));
    }
  }
  if (o.flowers) {
    B.add('wood', box(w + 0.1, 0.24, 0.3, 1), F(M(x, y - h / 2 - 0.02, 0.36)));
    for (let k = 0; k < 5; k++) {
      const fc = o.flowers[k % o.flowers.length];
      const g = new THREE.IcosahedronGeometry(0.13 + (k % 2) * 0.03, 0);
      B.add('paint', colored(g, fc), F(M(x - w / 2 + 0.1 + k * (w - 0.2) / 4, y - h / 2 + 0.2, 0.38, k)));
      B.add('leaf', colored(new THREE.IcosahedronGeometry(0.14, 0), '#3f7a34'), F(M(x - w / 2 + 0.2 + k * (w - 0.4) / 4, y - h / 2 + 0.12, 0.42, k)));
    }
    // y lo que cuelga por delante de la jardinera, como las gitanillas (en calidad baja, no: son muchas piezas pequeñas)
    if (builderQuality() !== 'low') for (let k = 0; k < 3; k++) {
      const px = x - w / 2 + 0.2 + k * (w - 0.4) / 2, py = y - h / 2 - 0.22 - (k % 2) * 0.14;
      B.add('leaf', colored(new THREE.IcosahedronGeometry(0.1, 0), '#4a8a3a'), F(M(px, py, 0.5, k)));
      B.add('paint', colored(new THREE.IcosahedronGeometry(0.08, 0), o.flowers[(k + 1) % o.flowers.length]), F(M(px + 0.06, py - 0.1, 0.53, k)));
    }
  }
}

// escalón en coordenadas de la fachada (matriz T) → suelo en el mundo
const _v = new THREE.Vector3();
export function stepFrom(T, x, top, z, hw, hd) {
  _v.set(x, top, z).applyMatrix4(T); const e = T.elements, ry = Math.atan2(e[8], e[10]);
  addStep(_v.x, _v.z, ry, -hw, hw, -hd, hd, _v.y);
}
function doorAt(B, T, x, o) {
  const F = (mx) => MM(T, mx);
  const w = o.w || 1.7, h = o.h || 2.7;
  if (o.arch) {
    const r = w / 2;
    B.add('ashlar', archRing(r, r + 0.42, 0.3, 12), F(M(x, h - r, 0.08)));
    B.add('ashlar', box(0.42, h - r, 0.3, 1), F(M(x - r - 0.21, (h - r) / 2, 0.08)));
    B.add('ashlar', box(0.42, h - r, 0.3, 1), F(M(x + r + 0.21, (h - r) / 2, 0.08)));
    B.add('woodDark', archPanel(w, h, 0.08), F(M(x, 0, 0.01)));
  } else {
    B.add('ashlar', box(w + 0.5, 0.3, 0.26), F(M(x, h + 0.15, 0.07)));
    B.add('ashlar', box(0.25, h, 0.26), F(M(x - w / 2 - 0.125, h / 2, 0.07)));
    B.add('ashlar', box(0.25, h, 0.26), F(M(x + w / 2 + 0.125, h / 2, 0.07)));
    B.add('woodDark', box(w, h, 0.08), F(M(x, h / 2, 0.01)));
  }
  // hoja de tablas: juntas verticales y dos travesaños con clavos (de cerca la puerta deja de ser un rectángulo liso)
  const hb = o.arch ? h - w / 2 - 0.1 : h;   // (en la puerta de arco los travesaños quedan bajo el arranque del arco)
  const nb = Math.max(3, Math.round(w / 0.42));
  for (let k = 1; k < nb; k++) B.add('paint', colored(box(0.02, hb - 0.1, 0.02), '#241910'), F(M(x - w / 2 + k * w / nb, hb / 2, 0.055)));
  for (const yy of [hb * 0.28, hb * 0.72]) {
    B.add('woodDark', box(w - 0.1, 0.16, 0.05), F(M(x, yy, 0.075)));
    for (let k = 0; k < nb; k++) B.add('iron', box(0.035, 0.035, 0.03), F(M(x - w / 2 + (k + 0.5) * w / nb, yy, 0.11)));
  }
  // escalón (también es suelo: quien llega a la puerta se sube a él, no se le hunden los pies)
  B.add('ashlar', box(w + 0.9, 0.2, 0.7), F(M(x, 0.02, 0.35)));
  stepFrom(T, x, 0.12, 0.35, (w + 0.9) / 2, 0.35);
  // aldaba
  B.add('iron', new THREE.TorusGeometry(0.07, 0.015, 5, 10), F(M(x + w * 0.22, h * 0.45, 0.07)));
}

function balconyAt(B, T, x, y, w, o) {
  const F = (mx) => MM(T, mx);
  const dep = 0.95;
  B.add(o.iron ? 'ashlar' : 'wood', box(w, 0.16, dep, 1.5), F(M(x, y, dep / 2)));
  const mat = o.iron ? 'iron' : 'wood';
  const n = Math.round(w / 0.2);
  for (let i = 0; i <= n; i++) B.add(mat, box(0.05, 0.95, 0.05), F(M(x - w / 2 + 0.05 + i * (w - 0.1) / n, y + 0.55, dep - 0.04)));
  for (const s of [-1, 1]) for (let i = 1; i < 4; i++) B.add(mat, box(0.05, 0.95, 0.05), F(M(x + s * (w / 2 - 0.05), y + 0.55, i * dep / 4)));
  B.add(mat, box(w + 0.05, 0.08, 0.1), F(M(x, y + 1.05, dep - 0.04)));
  for (const s of [-1, 1]) B.add(mat, box(0.08, 0.08, dep), F(M(x + s * (w / 2 - 0.04), y + 1.05, dep / 2)));
  // ménsulas
  if (!o.iron) for (const s of [-0.4, 0, 0.4]) B.add('woodDark', box(0.14, 0.14, dep * 0.8), F(M(x + s * w, y - 0.14, dep * 0.4, 0, 0.25)));
  // macetas colgadas, muy juntas, y flores que caen por delante de la barandilla (en calidad baja, más separadas y sin lo
  // que cae: las flores pasaban a ser buena parte de las piezas de cada casa)
  const low = builderQuality() === 'low', paso = low ? 0.8 : 0.55;
  if (o.flowers) for (let i = 0; i < Math.floor(w / paso); i++) {
    const px = x - w / 2 + 0.35 + i * paso;
    B.add('tile', new THREE.CylinderGeometry(0.16, 0.12, 0.24, 7), F(M(px, y + 1.12, dep - 0.02)));
    const fc = o.flowers[i % o.flowers.length];
    for (let k = 0; k < 3; k++) B.add('paint', colored(new THREE.IcosahedronGeometry(0.12, 0), k === 1 ? '#3f7a34' : fc), F(M(px + (k - 1) * 0.1, y + 1.3 - (k === 1 ? 0.18 : 0), dep + 0.06 + (k === 1 ? 0.06 : 0))));
    if (i % 2 === 0 && !low) { B.add('leaf', colored(new THREE.IcosahedronGeometry(0.11, 0), '#4a8a3a'), F(M(px, y + 0.82, dep + 0.12, i))); B.add('paint', colored(new THREE.IcosahedronGeometry(0.09, 0), o.flowers[(i + 1) % o.flowers.length]), F(M(px + 0.05, y + 0.66, dep + 0.14, i))); }
  }
}

// Macetas de barro con geranios a los lados de la puerta (en las puntas del escalón)
function doorPots(B, T, x, dw, cols) {
  const F = (mx) => MM(T, mx);
  for (const s of [-1, 1]) {
    const px = x + s * (dw / 2 + 0.22), fc = cols[s > 0 ? 1 : 0];
    B.add('tile', new THREE.CylinderGeometry(0.2, 0.14, 0.36, 8), F(M(px, 0.3, 0.45)));
    B.add('leaf', colored(new THREE.IcosahedronGeometry(0.26, 0), '#3f8a34'), F(M(px, 0.62, 0.45, s)));
    for (let k = 0; k < 4; k++) B.add('paint', colored(new THREE.IcosahedronGeometry(0.11, 0), fc), F(M(px + Math.cos(k * 1.7) * 0.15, 0.72 + (k % 2) * 0.09, 0.45 + Math.sin(k * 1.7) * 0.15, k)));
  }
}
// Planta trepadora por la fachada (t: { kind: 'hiedra' | 'buganvilla' | 'glicinia', x, w, h, r }): tarjetas de hojas
// encima de la pared, más anchas abajo y deshilachadas arriba. La hiedra, verde oscura; la buganvilla, fucsia sobre
// verde; la glicinia, racimos lilas que cuelgan
const _c2 = new THREE.Color();
const TREPA = { hiedra: [['#2c5e22', '#4f8a32']], buganvilla: [['#3a7a2c', '#5c9a3a'], ['#e3127e', '#ff4fa8'], ['#e3127e', '#ff4fa8']], glicinia: [['#3f7a30', '#6aa042'], ['#8a5fd0', '#b998f0']] };
export function climber(B, T, t) {
  const P = [], N = [], U = [], C = [], I = [], cols = TREPA[t.kind] || TREPA.hiedra, r = t.r, c = new THREE.Color();
  const quad = (x, y, z, s, a, col) => {
    const k = P.length / 3, ca = Math.cos(a) * s / 2, sa = Math.sin(a) * s / 2;
    // (las hojas del atlas, el racimo de arriba a la izquierda)
    for (const [dx, dy, u, v] of [[-1, -1, 0, 0.5], [1, -1, 0.5, 0.5], [1, 1, 0.5, 1], [-1, 1, 0, 1]]) {
      P.push(x + dx * ca - dy * sa, y + dx * sa + dy * ca, z); N.push(0, 0, 1); U.push(u, v); C.push(col.r, col.g, col.b);
    }
    I.push(k, k + 1, k + 2, k, k + 2, k + 3);
  };
  for (let y = 0.3; y < t.h; y += 0.42) {
    const hw = t.w / 2 * (1 - 0.45 * y / t.h) * (0.85 + r() * 0.3);
    for (let x = -hw; x <= hw; x += 0.5) {
      if (y > t.h * 0.7 && r() < 0.35) continue;
      const ci = Math.floor(r() * cols.length), [a0, a1] = cols[ci], hang = t.kind === 'glicinia' && ci > 0 ? -0.25 : 0;
      c.set(a0).lerp(_c2.set(a1), r());
      quad(t.x + x + (r() - 0.5) * 0.3, y + hang + (r() - 0.5) * 0.2, 0.1 + r() * 0.08, 0.75 + r() * 0.4, r() * 6.28, c);
    }
  }
  if (!I.length) return;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I);
  B.add('trepa', g, T);
}

// Esquinales de sillar en casas revocadas
function quoins(B, T, w, d, h, vec = []) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    if (vec[sx > 0 ? 1 : 0] || (sz < 0 && vec[2])) continue;   // (no en las esquinas pegadas a otra casa)
    for (let y = 0.25, k = 0; y < h - 0.2; y += 0.42, k++) {
      const long = k % 2 === 0;
      const lx = long ? 0.62 : 0.36, lz = long ? 0.36 : 0.62;
      B.add('ashlar', box(lx, 0.4, lz, 1), MM(T, M(sx * (w / 2 - lx / 2 + 0.025), y, sz * (d / 2 - lz / 2 + 0.025))));
    }
  }
}

function chimney(B, T, x, y, z) {
  B.add('stone', box(0.8, 1.9, 0.8, 1.5), MM(T, M(x, y, z)));
  B.add('slate', box(1.1, 0.12, 1.1, 1), MM(T, M(x, y + 1.05, z)));
  B.add('stone', box(0.3, 0.3, 0.3, 1), MM(T, M(x, y + 1.25, z)));
}

// Vuelo del tejado por cada lado: el de la casa o, donde la casa está pegada a otra (o.vecinas: [−x, +x, −z]), casi nada:
// en una hilera, el alero de cada casa se metía en la de al lado (hasta 1,1 m en las atlánticas) y los tejados se
// cruzaban, o se pisaban en el mismo plano y parpadeaban
const PEGADO = 0.02;
function vuelos(ov, vec) { return { x0: vec?.[0] ? PEGADO : ov, x1: vec?.[1] ? PEGADO : ov, z0: vec?.[2] ? PEGADO : ov, z1: ov }; }
// Tejado a dos aguas con cumbrera paralela a X (aleros delante y detrás)
function roofGableX(B, T, w, d, h, pitch, mat, o = {}) {
  const V = vuelos(o.overhang ?? 0.6, o.vecinas), t = 0.22;
  const rise = Math.tan(pitch) * d / 2, L = w + V.x0 + V.x1, cx = (V.x1 - V.x0) / 2;
  for (const s of [-1, 1]) {
    const ov = s > 0 ? V.z1 : V.z0, slope = Math.hypot(d / 2, rise) + ov;
    const m = MM(T, M(cx, h + rise / 2 - Math.sin(pitch) * ov / 2 + t / 2, s * (d / 4 + ov / 2 * Math.cos(pitch)), 0, s * pitch));
    B.add(mat, box(L, t, slope, 2), m);
    // tablas del alero
    if (ov > 0.1) B.add('woodDark', box(L, 0.22, 0.08), MM(T, M(cx, h - Math.tan(pitch) * ov + 0.02, s * (d / 2 + ov - 0.02))));
  }
  B.add(mat, box(L + 0.05, 0.2, 0.36, 1), MM(T, M(cx, h + rise + 0.12, 0)));
  const gmat = o.gableMat || 'stone';
  for (const s of [-1, 1]) B.add(gmat, gable(d, rise, 0.5), MM(T, M(s * (w / 2 - 0.25), h, 0, Math.PI / 2)));
  // canecillos bajo el alero
  for (const s of [-1, 1]) {
    const bl = (s > 0 ? V.z1 : V.z0) * Math.cos(pitch) - 0.08; if (bl < 0.1) continue;
    for (let i = 0; i < Math.floor(w / 0.9); i++) B.add('woodDark', box(0.12, 0.14, bl), MM(T, M(-w / 2 + 0.5 + i * 0.9, h - 0.14, s * (d / 2 + bl / 2))));
  }
  return rise;
}
// Cumbrera paralela a Z (hastial hacia la calle)
function roofGableZ(B, T, w, d, h, pitch, mat, o = {}) {
  const V = vuelos(o.overhang ?? 0.6, o.vecinas), t = 0.22;
  const rise = Math.tan(pitch) * w / 2, L = d + V.z0 + V.z1, cz = (V.z1 - V.z0) / 2;
  for (const s of [-1, 1]) {
    const ov = s > 0 ? V.x1 : V.x0, slope = Math.hypot(w / 2, rise) + ov;
    B.add(mat, box(slope, t, L, 2), MM(T, M(s * (w / 4 + ov / 2 * Math.cos(pitch)), h + rise / 2 - Math.sin(pitch) * ov / 2 + t / 2, cz, 0, 0, -s * pitch)));
    if (ov > 0.1) B.add('woodDark', box(0.08, 0.22, L), MM(T, M(s * (w / 2 + ov - 0.02), h - Math.tan(pitch) * ov + 0.02, cz)));
  }
  B.add(mat, box(0.36, 0.2, L + 0.05, 1), MM(T, M(0, h + rise + 0.12, cz)));
  const gmat = o.gableMat || 'stone';
  for (const s of [-1, 1]) B.add(gmat, gable(w, rise, 0.5), MM(T, M(0, h, s * (d / 2 - 0.25))));
  // tablas del hastial delantero (típicas)
  for (const s of [-1, 1]) { const ov = s > 0 ? V.x1 : V.x0; B.add('woodDark', box(Math.hypot(w / 2, rise) + ov, 0.26, 0.1), MM(T, M(s * (w / 4 + ov / 2 * Math.cos(pitch)), h + rise / 2 - Math.sin(pitch) * ov / 2 + 0.05, d / 2 + V.z1 - 0.03, 0, 0, -s * pitch))); }
  return rise;
}
// Tejado a cuatro aguas
export function roofHip(B, T, w, d, h, rise, mat) {
  const ov = 0.7, hw = w / 2 + ov, hd = d / 2 + ov, r = Math.min(hw, hd) * 0.9;
  const drop = rise * ov / (Math.min(w, d) / 2);
  const y0 = h - drop;
  const v = [-hw, y0, -hd, hw, y0, -hd, hw, y0, hd, -hw, y0, hd];
  let top;
  if (hw >= hd) top = [-hw + r, h + rise, 0, hw - r, h + rise, 0];
  else top = [0, h + rise, -hd + r, 0, h + rise, hd - r];
  v.push(...top);
  const P = i => new THREE.Vector3(v[i * 3], v[i * 3 + 1], v[i * 3 + 2]);
  const tris = hw >= hd ? [[0, 4, 1], [1, 4, 5], [1, 5, 2], [2, 5, 3], [3, 5, 4], [3, 4, 0]] : [[0, 4, 1], [1, 4, 2], [2, 4, 5], [2, 5, 3], [3, 5, 0], [0, 5, 4]];
  const pos = [], uv = [];
  for (const [a, b, c] of tris) {
    const A = P(a), Bv = P(b), Cc = P(c);
    const n = new THREE.Vector3().subVectors(Bv, A).cross(new THREE.Vector3().subVectors(Cc, A)).normalize();
    // UV: proyección sobre el plano del faldón
    const up = new THREE.Vector3(0, 1, 0), t1 = new THREE.Vector3().crossVectors(up, n).normalize(), t2 = new THREE.Vector3().crossVectors(n, t1);
    for (const p of [A, Bv, Cc]) { pos.push(p.x, p.y, p.z); uv.push(p.dot(t1) / 2, p.dot(t2) / 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  // la cara inferior
  const under = box(hw * 2, 0.1, hd * 2); B.add('woodDark', under, MM(T, M(0, y0 - 0.05, 0)));
  B.add(mat, g, T);
  return rise;
}

// ---- Casa completa ----
export function buildHouse(B, T, o, rnd) {
  const { w, d, h } = o;
  const wallMat = o.wall;
  // cuerpo (se prolonga hacia abajo para asentarse en pendiente)
  B.add(wallMat, box(w, h + 3, d, 2.6), MM(T, M(0, (h + 3) / 2 - 3, 0)));
  // zócalo de piedra (sin sobresalir por los lados pegados a otra casa: los dos zócalos se pisaban en el mismo plano y
  // la junta parpadeaba)
  const vec = o.vecinas || [], z0 = vec[0] ? 0 : 0.06, z1 = vec[1] ? 0 : 0.06, zb = vec[2] ? 0 : 0.06;
  B.add('stoneDark', box(w + z0 + z1, 0.7 + 3, d + 0.06 + zb, 2), MM(T, M((z1 - z0) / 2, (0.7 + 3) / 2 - 3, (0.06 - zb) / 2)));
  if (wallMat !== 'stone' && wallMat !== 'ashlar' && !o.noQuoins) quoins(B, T, w, d, h, vec);
  // imposta entre plantas
  const floors = Math.max(2, Math.round(h / 2.9));
  const fh = h / floors;
  if (o.cornice) B.add('ashlar', box(w + (vec[0] ? 0 : 0.05) + (vec[1] ? 0 : 0.05), 0.16, d + 0.1), MM(T, M(((vec[1] ? 0 : 0.05) - (vec[0] ? 0 : 0.05)) / 2, fh + 0.05, 0)));
  // puerta
  const doorX = o.doorX ?? (rnd() < 0.5 ? 0 : (rnd() < 0.5 ? -1 : 1) * (w / 2 - 1.6));
  doorAt(B, MM(T, M(0, 0, d / 2)), doorX, { arch: o.arch, w: o.arch ? 1.9 : 1.4, h: o.arch ? 2.9 : 2.4 });
  // ventanas
  const cols = Math.max(1, Math.floor((w - 0.8) / 2.3));
  const shutter = SHUTTERS[Math.floor(rnd() * SHUTTERS.length)];
  const flowers = [FLOWERS[Math.floor(rnd() * FLOWERS.length)], FLOWERS[Math.floor(rnd() * FLOWERS.length)]];
  const front = MM(T, M(0, 0, d / 2));
  // escudo: en el eje de la fachada, ocupando el sitio de una ventana de una planta alta (como en las casas barrocas),
  // nunca tapando ventanas ni el balcón
  let shF = -1, shX = 0;
  if (o.shield) {
    if (floors < 3) { o.gallery = false; o.balcony = false; }
    // (en la casa consistorial, en la planta de arriba, sobre el balcón del ayuntamiento)
    if (o.townhall) o.gallery = false;
    shF = o.townhall && floors >= 3 ? floors - 1 : floors >= 3 ? floors - 2 : 1; shX = o.shieldX ?? 0;
  }
  for (let f = 0; f < floors; f++) {
    const y = f * fh + fh * 0.58;
    if (o.gallery && f === floors - 1 && floors > 1) { gallery(B, front, w, f * fh + 0.3, fh - 0.5); continue; }
    for (let c = 0; c < cols; c++) {
      const x = cols === 1 ? (doorX === 0 ? 0 : -doorX * 0.6) : -w / 2 + (w / cols) * (c + 0.5);
      if (f === 0 && Math.abs(x - doorX) < 1.6) continue;
      if (f === shF && Math.abs(x - shX) < 1.4) continue;
      if (f === 1 && o.balcony && Math.abs(x) < o.balconyW / 2) {
        // puerta-ventana al balcón
        windowAt(B, front, x, f * fh + 1.15, 0.95, 2.0, { shutter });
        continue;
      }
      const ww = f === 0 ? 0.8 : 0.95, wh = f === floors - 1 ? 1.05 : 1.35;
      windowAt(B, front, x, y, ww, wh, { shutter: rnd() < 0.85 ? shutter : null, flowers: f > 0 && rnd() < 0.7 ? flowers : null });
    }
  }
  if (o.balcony) {
    balconyAt(B, front, 0, fh + 0.02, o.balconyW, { flowers, iron: o.ironBalcony });
    // dónde puede asomarse alguien (en las medidas de la casa: a un lado de la puerta-ventana, sobre el suelo del balcón)
    o.balcon = [Math.min(0.9, o.balconyW / 2 - 0.5) * ((w * 7.3 + d * 3.1) % 2 > 1 ? 1 : -1), fh + 0.1, d / 2 + 0.5];
  }
  if (o.timber) timberFrame(B, front, w, h, floors, fh);
  // ventanas traseras y laterales (sencillas; casi siempre, para que no queden paredes lisas a la vista. Con el mismo
  // número de tiradas de rnd que antes, que de él sale también el resto del pueblo)
  const back = MM(T, M(0, 0, -d / 2, Math.PI));
  // (en las paredes pegadas a otra casa, ninguna: son medianeras)
  for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) if (rnd() < 0.88 && !vec[2]) windowAt(B, back, -w / 2 + (w / cols) * (c + 0.5), f * fh + fh * 0.58, 0.75, 1.1, { shutter });
  for (const s of [-1, 1]) {
    const side = MM(T, M(s * w / 2, 0, 0, s * Math.PI / 2));
    const sc = Math.max(1, Math.floor(d / 3.2));
    for (let f = 1; f < floors; f++) for (let c = 0; c < sc; c++) if (rnd() < 0.85 && !vec[s > 0 ? 1 : 0]) windowAt(B, side, -d / 2 + (d / sc) * (c + 0.5), f * fh + fh * 0.55, 0.7, 1.0, { shutter });
  }
  // escudo: una piedra armera en relieve (losa de sillería con su moldura, que sobresale del muro) y el escudo tallado
  // encima; en la casa consistorial, más grande y con cornisa. shieldLocal: el centro de su cara, para pintarlo y leerlo
  if (o.shield) {
    const sy = shF * fh + fh * 0.5, big = !!o.townhall, sw = big ? 1.75 : 1.72, sh = big ? 2.45 : 2.22, dz = big ? 0.18 : 0.14;
    B.add('ashlar', box(sw, sh, dz), MM(front, M(shX, sy + 0.04, dz / 2)));
    B.add('stoneDark', box(sw + 0.16, 0.12, dz + 0.08), MM(front, M(shX, sy + 0.04 - sh / 2 - 0.04, (dz + 0.08) / 2)));
    B.add('ashlar', box(sw + 0.22, 0.14, dz + 0.12), MM(front, M(shX, sy + 0.04 + sh / 2 + 0.05, (dz + 0.12) / 2)));
    o.shieldLocal = [shX, sy, d / 2 + dz + 0.004]; o.plateY = shF * fh - 0.3;   // (la placa del ayuntamiento, bajo el escudo)
  }
  // tejado
  const pitch = o.pitch ?? (0.9 + rnd() * 0.12);
  const roofMat = o.roof;
  let rise;
  const gableMat = wallMat;
  // (una casa pegada a otra no lleva tejado a cuatro aguas: su alero de todo alrededor se metía en la de al lado)
  if (o.roofType === 'hip' && o.vecinas?.some(Boolean)) o.roofType = 'gableX';
  if (o.roofType === 'hip') rise = roofHip(B, T, w, d, h, o.hipRise ?? w * 0.45, roofMat);
  else if (o.roofType === 'gableZ') rise = roofGableZ(B, T, w, d, h, pitch, roofMat, { gableMat, overhang: o.overhang, vecinas: o.vecinas });
  else rise = roofGableX(B, T, w, d, h, pitch, roofMat, { gableMat, overhang: o.overhang, vecinas: o.vecinas });
  if (o.timber && o.roofType === 'gableZ') for (let i = -2; i <= 2; i++) B.add('woodDark', box(0.14, Math.max(0.3, rise * (1 - Math.abs(i) / 2.6) - 0.3), 0.08), MM(front, M(i * w / 6, h + (rise * (1 - Math.abs(i) / 2.6)) / 2, 0.06)));
  // canalones de cinc bajo los aleros y bajantes por la fachada hasta el suelo
  if (o.roofType !== 'hip' && !o.noGutter) gutters(B, T, w, d, h, pitch, vuelos(o.overhang ?? 0.6, o.vecinas), o.roofType === 'gableZ');
  // macetas en la puerta y una trepadora por la fachada (las elige quien levanta la casa, sin gastar rnd)
  if (o.macetas) doorPots(B, front, doorX, o.arch ? 1.9 : 1.4, o.macetas);
  if (o.trepa && w >= 5) { const sd = doorX > 0.1 ? -1 : doorX < -0.1 ? 1 : o.trepa.side || 1; climber(B, front, { ...o.trepa, x: sd * (w / 2 - 0.8), w: Math.min(o.trepa.w, 1.5), h: Math.min(h * 0.92, o.trepa.h) }); }
  // placa del número de la casa junto a la puerta
  { const px = doorX + (doorX > 0 ? -1 : 1) * (o.arch ? 1.75 : 1.4); B.add('paint', colored(box(0.28, 0.21, 0.03), '#2f5b8a'), MM(front, M(px, 2.05, 0.02))); B.add('paint', colored(box(0.22, 0.15, 0.03), '#f2efe6'), MM(front, M(px, 2.05, 0.035))); }
  // chimenea
  chimney(B, T, (rnd() - 0.5) * w * 0.4, h + rise * 0.55, (rnd() - 0.5) * d * 0.3);
  // buhardilla ocasional
  if (o.roofType === 'gableX' && rnd() < 0.3 && w > 8) {
    const dm = MM(T, M(w * 0.2, h + rise * 0.25, d / 4 + 0.2));
    B.add(wallMat, box(1.4, 1.3, 1.6, 2), MM(dm, M(0, 0.65, 0)));
    windowAt(B, MM(dm, M(0, 0, 0.8)), 0, 0.7, 0.7, 0.8, { shutter });
    B.add(roofMat, box(1.9, 0.12, 2.1, 2), MM(dm, M(0, 1.45, 0.1, 0, 0.18)));
  }
  return rise;
}

// Canalón (media caña de cinc) a lo largo de cada alero y una bajante con su codo hasta la pared y el suelo
function gutters(B, T, w, d, h, pitch, V, alongZ) {
  const len = alongZ ? d + V.z0 + V.z1 : w + V.x0 + V.x1, c0 = alongZ ? (V.z1 - V.z0) / 2 : (V.x1 - V.x0) / 2, half = (alongZ ? w : d) / 2;
  for (const s of [-1, 1]) {
    // (sin canalón por el lado pegado a otra casa: ahí no hay alero)
    const ov = alongZ ? (s > 0 ? V.x1 : V.x0) : (s > 0 ? V.z1 : V.z0); if (ov < 0.2) continue;
    const ye = h - Math.tan(pitch) * ov - 0.12, out = half + ov - 0.06;
    const g = new THREE.CylinderGeometry(0.09, 0.09, len, 8, 1, true, alongZ ? -Math.PI / 2 : Math.PI, Math.PI); // media caña abierta arriba
    B.add('zinc', g, MM(T, alongZ ? M(s * out, ye, c0, 0, Math.PI / 2, 0) : M(c0, ye, s * out, 0, 0, Math.PI / 2)));
    // bajante en un extremo (uno por alero, en esquinas opuestas)
    const a = s * ((alongZ ? d : w) / 2 - 0.3), wall = half + 0.07, mid = (out + wall) / 2;
    const P = (along, across, y) => alongZ ? M(s * across, y, along) : M(along, y, s * across);
    B.add('zinc', new THREE.CylinderGeometry(0.05, 0.05, ye + 0.05, 6), MM(T, P(a, wall, ye / 2 - 0.05)));
    const neck = Math.hypot(out - wall, 0.35);
    B.add('zinc', new THREE.CylinderGeometry(0.05, 0.05, neck, 6), MM(T, alongZ ? M(s * mid, ye - 0.17, a, 0, 0, -s * Math.atan2(out - wall, 0.35)) : M(a, ye - 0.17, s * mid, 0, s * Math.atan2(out - wall, 0.35), 0)));
    B.add('zinc', box(0.14, 0.06, 0.14), MM(T, P(a, wall, 1.2)));        // abrazadera
    B.add('zinc', box(0.14, 0.06, 0.14), MM(T, P(a, wall, ye - 1.4)));
  }
}

// Entramado de madera de los caseríos atlánticos (Baztan, Bidasoa)
function timberFrame(B, T, w, h, floors, fh) {
  const mat = 'woodDark';
  for (let f = 1; f <= floors; f++) B.add(mat, box(w + 0.05, 0.22, 0.1), MM(T, M(0, f * fh - 0.05, 0.07)));
  for (const s of [-1, 1]) B.add(mat, box(0.22, h - fh, 0.1), MM(T, M(s * (w / 2 - 0.12), fh + (h - fh) / 2, 0.07)));
  for (let f = 1; f < floors; f++) {
    const y0 = f * fh, y1 = (f + 1) * fh;
    for (const x of [-w / 4, w / 4]) B.add(mat, box(0.16, fh, 0.08), MM(T, M(x, (y0 + y1) / 2, 0.07)));
    const len = Math.hypot(w / 4, fh);
    B.add(mat, box(0.14, len, 0.08), MM(T, M(-w * 3 / 8, (y0 + y1) / 2, 0.075, 0, 0, Math.atan2(w / 4, fh))));
    B.add(mat, box(0.14, len, 0.08), MM(T, M(w * 3 / 8, (y0 + y1) / 2, 0.075, 0, 0, -Math.atan2(w / 4, fh))));
  }
}
// Galería de arquillos (solana) de las casas de la Ribera
function gallery(B, T, w, y, hh) {
  const n = Math.max(3, Math.round(w / 1.4));
  const aw = (w - 0.6) / n;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.3 + aw * (i + 0.5);
    B.add('glass', archPanel(aw * 0.62, hh * 0.8, 0.06), MM(T, M(x, y, 0.02)));
    B.add('brick', archRing(aw * 0.31, aw * 0.44, 0.16, 8), MM(T, M(x, y + hh * 0.8 - aw * 0.31, 0.05)));
  }
  B.add('brick', box(w + 0.1, 0.14, 0.24), MM(T, M(0, y - 0.05, 0.1)));
}
