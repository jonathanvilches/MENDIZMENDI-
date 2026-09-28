// Casas pirenaicas del valle de Salazar (piedra, revoco, tejados muy inclinados, balcones de madera)
import * as THREE from 'three';
import { box, gable, archRing, archPanel, colored, M, MM } from './builder.js';

const SHUTTERS = ['#3e6b48', '#7b3f2a', '#2f4f6e', '#6d5231', '#8a2f2f', '#4a6b3a'];
const FLOWERS = ['#e0304f', '#ff6f91', '#f25c2c', '#ffffff', '#c93a7a'];

// Dibuja una ventana en la fachada (plano local z=0 hacia +z)
function windowAt(B, T, x, y, w, h, o) {
  const F = (mx) => MM(T, mx);
  B.add('ashlar', box(w + 0.36, 0.18, 0.28, 1), F(M(x, y - h / 2 - 0.09, 0.1)));      // alféizar
  B.add('ashlar', box(w + 0.3, 0.2, 0.2, 1), F(M(x, y + h / 2 + 0.1, 0.06)));         // dintel
  B.add('ashlar', box(0.16, h, 0.2, 1), F(M(x - w / 2 - 0.08, y, 0.06)));
  B.add('ashlar', box(0.16, h, 0.2, 1), F(M(x + w / 2 + 0.08, y, 0.06)));
  B.add('glass', box(w, h, 0.04), F(M(x, y, -0.02)));
  // carpintería
  B.add('paint', colored(box(0.06, h, 0.06), '#e9e4d8'), F(M(x, y, 0.02)));
  B.add('paint', colored(box(w, 0.06, 0.06), '#e9e4d8'), F(M(x, y + h * 0.15, 0.02)));
  if (o.shutter) {
    const sc = o.shutter;
    for (const s of [-1, 1]) {
      const g = colored(box(w / 2 + 0.02, h + 0.05, 0.05), sc);
      // contraventana abierta contra la pared, con lamas
      B.add('paint', g, F(M(x + s * (w / 2 + 0.16 + w / 4), y, 0.1)));
      for (let k = 0; k < 4; k++) B.add('paint', colored(box(w / 2 - 0.08, 0.035, 0.03), new THREE.Color(sc).multiplyScalar(0.7)), F(M(x + s * (w / 2 + 0.16 + w / 4), y - h * 0.35 + k * h * 0.23, 0.14)));
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
  }
}

function doorAt(B, T, x, o) {
  const F = (mx) => MM(T, mx);
  const w = o.w || 1.7, h = o.h || 2.7;
  if (o.arch) {
    const r = w / 2;
    B.add('ashlar', archRing(r, r + 0.42, 0.3, 12), F(M(x, h - r, 0.08)));
    B.add('ashlar', box(0.42, h - r, 0.3, 1), F(M(x - r - 0.21, (h - r) / 2, 0.08)));
    B.add('ashlar', box(0.42, h - r, 0.3, 1), F(M(x + r + 0.21, (h - r) / 2, 0.08)));
    B.add('woodDark', archPanel(w, h, 0.08), F(M(x, 0, -0.03)));
  } else {
    B.add('ashlar', box(w + 0.5, 0.3, 0.26), F(M(x, h + 0.15, 0.07)));
    B.add('ashlar', box(0.25, h, 0.26), F(M(x - w / 2 - 0.125, h / 2, 0.07)));
    B.add('ashlar', box(0.25, h, 0.26), F(M(x + w / 2 + 0.125, h / 2, 0.07)));
    B.add('woodDark', box(w, h, 0.08), F(M(x, h / 2, -0.03)));
  }
  // escalón
  B.add('ashlar', box(w + 0.9, 0.2, 0.7), F(M(x, 0.02, 0.35)));
  // aldaba
  B.add('iron', new THREE.TorusGeometry(0.07, 0.015, 5, 10), F(M(x + w * 0.22, h * 0.45, 0.04)));
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
  // macetas colgadas
  if (o.flowers) for (let i = 0; i < Math.floor(w / 0.8); i++) {
    const px = x - w / 2 + 0.45 + i * 0.8;
    B.add('tile', new THREE.CylinderGeometry(0.16, 0.12, 0.24, 7), F(M(px, y + 1.12, dep - 0.02)));
    const fc = o.flowers[i % o.flowers.length];
    for (let k = 0; k < 3; k++) B.add('paint', colored(new THREE.IcosahedronGeometry(0.12, 0), k === 1 ? '#3f7a34' : fc), F(M(px + (k - 1) * 0.1, y + 1.3 - (k === 1 ? 0.18 : 0), dep + 0.06 + (k === 1 ? 0.06 : 0))));
  }
}

// Esquinales de sillar en casas revocadas
function quoins(B, T, w, d, h) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
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

// Tejado a dos aguas con cumbrera paralela a X (aleros delante y detrás)
function roofGableX(B, T, w, d, h, pitch, mat, o = {}) {
  const ov = o.overhang ?? 0.6, t = 0.22;
  const rise = Math.tan(pitch) * d / 2;
  const slope = Math.hypot(d / 2, rise) + ov;
  for (const s of [-1, 1]) {
    const m = MM(T, M(0, h + rise / 2 - Math.sin(pitch) * ov / 2 + t / 2, s * (d / 4 + ov / 2 * Math.cos(pitch)), 0, s * pitch));
    B.add(mat, box(w + ov * 2, t, slope, 2), m);
    // tablas del alero
    B.add('woodDark', box(w + ov * 2, 0.22, 0.08), MM(T, M(0, h - Math.tan(pitch) * ov + 0.02, s * (d / 2 + ov - 0.02))));
  }
  B.add(mat, box(w + ov * 2 + 0.05, 0.2, 0.36, 1), MM(T, M(0, h + rise + 0.12, 0)));
  const gmat = o.gableMat || 'stone';
  for (const s of [-1, 1]) B.add(gmat, gable(d, rise, 0.5), MM(T, M(s * (w / 2 - 0.25), h, 0, Math.PI / 2)));
  // canecillos bajo el alero
  const bl = ov * Math.cos(pitch) - 0.08;
  for (let i = 0; i < Math.floor(w / 0.9); i++) for (const s of [-1, 1]) B.add('woodDark', box(0.12, 0.14, bl), MM(T, M(-w / 2 + 0.5 + i * 0.9, h - 0.14, s * (d / 2 + bl / 2))));
  return rise;
}
// Cumbrera paralela a Z (hastial hacia la calle)
function roofGableZ(B, T, w, d, h, pitch, mat, o = {}) {
  const ov = o.overhang ?? 0.6, t = 0.22;
  const rise = Math.tan(pitch) * w / 2;
  const slope = Math.hypot(w / 2, rise) + ov;
  for (const s of [-1, 1]) {
    B.add(mat, box(slope, t, d + ov * 2, 2), MM(T, M(s * (w / 4 + ov / 2 * Math.cos(pitch)), h + rise / 2 - Math.sin(pitch) * ov / 2 + t / 2, 0, 0, 0, -s * pitch)));
    B.add('woodDark', box(0.08, 0.22, d + ov * 2), MM(T, M(s * (w / 2 + ov - 0.02), h - Math.tan(pitch) * ov + 0.02, 0)));
  }
  B.add(mat, box(0.36, 0.2, d + ov * 2 + 0.05, 1), MM(T, M(0, h + rise + 0.12, 0)));
  const gmat = o.gableMat || 'stone';
  for (const s of [-1, 1]) B.add(gmat, gable(w, rise, 0.5), MM(T, M(0, h, s * (d / 2 - 0.25))));
  // tablas del hastial delantero (típicas)
  for (const s of [-1, 1]) B.add('woodDark', box(Math.hypot(w / 2, rise) + ov, 0.26, 0.1), MM(T, M(s * (w / 4 + ov / 2 * Math.cos(pitch)), h + rise / 2 - Math.sin(pitch) * ov / 2 + 0.05, d / 2 + ov - 0.03, 0, 0, -s * pitch)));
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
  // zócalo de piedra
  B.add('stoneDark', box(w + 0.12, 0.7 + 3, d + 0.12, 2), MM(T, M(0, (0.7 + 3) / 2 - 3, 0)));
  if (wallMat !== 'stone' && wallMat !== 'ashlar') quoins(B, T, w, d, h);
  // imposta entre plantas
  const floors = Math.max(2, Math.round(h / 2.9));
  const fh = h / floors;
  if (o.cornice) B.add('ashlar', box(w + 0.1, 0.16, d + 0.1), MM(T, M(0, fh + 0.05, 0)));
  // puerta
  const doorX = o.doorX ?? (rnd() < 0.5 ? 0 : (rnd() < 0.5 ? -1 : 1) * (w / 2 - 1.6));
  doorAt(B, MM(T, M(0, 0, d / 2)), doorX, { arch: o.arch, w: o.arch ? 1.9 : 1.4, h: o.arch ? 2.9 : 2.4 });
  // ventanas
  const cols = Math.max(1, Math.floor((w - 0.8) / 2.3));
  const shutter = SHUTTERS[Math.floor(rnd() * SHUTTERS.length)];
  const flowers = [FLOWERS[Math.floor(rnd() * FLOWERS.length)], FLOWERS[Math.floor(rnd() * FLOWERS.length)]];
  const front = MM(T, M(0, 0, d / 2));
  for (let f = 0; f < floors; f++) {
    const y = f * fh + fh * 0.58;
    for (let c = 0; c < cols; c++) {
      const x = cols === 1 ? (doorX === 0 ? 0 : -doorX * 0.6) : -w / 2 + (w / cols) * (c + 0.5);
      if (f === 0 && Math.abs(x - doorX) < 1.6) continue;
      if (f === 1 && o.balcony && Math.abs(x) < o.balconyW / 2) {
        // puerta-ventana al balcón
        windowAt(B, front, x, f * fh + 1.15, 0.95, 2.0, { shutter });
        continue;
      }
      const ww = f === 0 ? 0.8 : 0.95, wh = f === floors - 1 ? 1.05 : 1.35;
      windowAt(B, front, x, y, ww, wh, { shutter: rnd() < 0.85 ? shutter : null, flowers: f > 0 && rnd() < 0.45 ? flowers : null });
    }
  }
  if (o.balcony) balconyAt(B, front, 0, fh + 0.02, o.balconyW, { flowers, iron: o.ironBalcony });
  // ventanas traseras y laterales (sencillas)
  const back = MM(T, M(0, 0, -d / 2, Math.PI));
  for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) if (rnd() < 0.7) windowAt(B, back, -w / 2 + (w / cols) * (c + 0.5), f * fh + fh * 0.58, 0.75, 1.1, { shutter });
  for (const s of [-1, 1]) {
    const side = MM(T, M(s * w / 2, 0, 0, s * Math.PI / 2));
    const sc = Math.max(1, Math.floor(d / 3.2));
    for (let f = 1; f < floors; f++) for (let c = 0; c < sc; c++) if (rnd() < 0.55) windowAt(B, side, -d / 2 + (d / sc) * (c + 0.5), f * fh + fh * 0.55, 0.7, 1.0, { shutter });
  }
  // escudo
  if (o.shield) B.add('shield', new THREE.PlaneGeometry(1.1, 1.3), MM(front, M(o.shieldX ?? 0, h * 0.62, 0.09)));
  // tejado
  const pitch = o.pitch ?? (0.9 + rnd() * 0.12);
  const roofMat = o.roof;
  let rise;
  const gableMat = wallMat === 'stone' || wallMat === 'ashlar' ? wallMat : wallMat;
  if (o.roofType === 'hip') rise = roofHip(B, T, w, d, h, o.hipRise ?? w * 0.45, roofMat);
  else if (o.roofType === 'gableZ') rise = roofGableZ(B, T, w, d, h, pitch, roofMat, { gableMat });
  else rise = roofGableX(B, T, w, d, h, pitch, roofMat, { gableMat });
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
