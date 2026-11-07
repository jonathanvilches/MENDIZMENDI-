// Banderines de fiesta en la plaza de cada pueblo: cuerdas de banderitas de colores colgadas de fachada a fachada,
// cruzando la plaza, como en las fiestas patronales. Solo entre casas que dan a la plaza (nunca colgadas del aire) y a
// unos 5 m del suelo, por encima de la gente, los toldos y las farolas. Una sola malla con su color por vértice.
import * as THREE from 'three';
import { TOWN } from './townBuilder.js';
import { PLACES } from './layout.js';
import { groundHeight } from './heightfield.js';

const COLORES = ['#e63946', '#ffffff', '#2a9d8f', '#ffd23f', '#3a86ff', '#ff7f50', '#8338ec', '#06d6a0'];

export function buildFiestas(scene) {
  const P = PLACES?.plaza; if (!P || !TOWN.houses?.length) return null;
  const R = P.r || 14;
  // las fachadas que miran a la plaza: su centro, un palmo por delante
  const A = [];
  for (const h of TOWN.houses) {
    const nx = Math.sin(h.ry), nz = Math.cos(h.ry), fx = h.x + nx * (h.d / 2 + 0.12), fz = h.z + nz * (h.d / 2 + 0.12);
    const dx = P.x - fx, dz = P.z - fz, d = Math.hypot(dx, dz);
    if (d > R + 12 || d < 4 || (nx * dx + nz * dz) / d < 0.35) continue;
    A.push({ x: fx, z: fz, y: groundHeight(fx, fz) + 5.2, a: Math.atan2(fz - P.z, fx - P.x) });
  }
  if (A.length < 2) return null;
  // parejas casi enfrentadas: cada cuerda cruza la plaza cerca de su centro (como mucho cinco, y sin repetir casa)
  const usadas = new Set(), pares = [];
  A.sort((a, b) => a.a - b.a);
  for (let i = 0; i < A.length && pares.length < 5; i++) {
    if (usadas.has(i)) continue;
    let mejor = -1, mv = 1e9;
    for (let j = 0; j < A.length; j++) {
      if (j === i || usadas.has(j)) continue;
      const L = Math.hypot(A[j].x - A[i].x, A[j].z - A[i].z); if (L < 10 || L > 48) continue;
      // (lo cerca que pasa del centro de la plaza)
      const ux = (A[j].x - A[i].x) / L, uz = (A[j].z - A[i].z) / L, t = (P.x - A[i].x) * ux + (P.z - A[i].z) * uz;
      const off = Math.hypot(A[i].x + ux * t - P.x, A[i].z + uz * t - P.z); if (off > R * 0.65) continue;
      const v = off + Math.abs(L - R * 1.6) * 0.2; if (v < mv) { mv = v; mejor = j; }
    }
    if (mejor >= 0) { usadas.add(i); usadas.add(mejor); pares.push([A[i], A[mejor]]); }
  }
  if (!pares.length) return null;
  const pos = [], col = [], c = new THREE.Color();
  let k = 0;
  for (const [a, b] of pares) {
    const L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(6, Math.floor(L / 0.55)), sag = Math.min(0.9, L * 0.03);   // (poco vencidas: las banderitas, siempre por encima de 3,8 m)
    const ux = (b.x - a.x) / L, uz = (b.z - a.z) / L;
    const pt = (t) => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, y: a.y + (b.y - a.y) * t - sag * 4 * t * (1 - t) });
    // la cuerda: una cinta fina
    for (let i = 0; i < n; i++) {
      const p0 = pt(i / n), p1 = pt((i + 1) / n);
      c.set('#3a2e26');
      for (const [p, dy] of [[p0, 0], [p1, 0], [p1, 0.025], [p0, 0], [p1, 0.025], [p0, 0.025]]) { pos.push(p.x, p.y + dy, p.z); col.push(c.r, c.g, c.b); }
    }
    // las banderitas: triángulos colgando, de colores
    for (let i = 1; i < n; i++) {
      const p = pt(i / n), w = 0.17;
      c.set(COLORES[(k++) % COLORES.length]);
      for (const q of [[p.x - ux * w, p.y, p.z - uz * w], [p.x + ux * w, p.y, p.z + uz * w], [p.x, p.y - 0.36, p.z]]) { pos.push(...q); col.push(c.r, c.g, c.b); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals(); g.computeBoundingSphere();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  m.name = 'banderines'; m.matrixAutoUpdate = false;
  scene.add(m);
  return m;
}
