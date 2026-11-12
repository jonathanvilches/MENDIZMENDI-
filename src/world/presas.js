// Las presas de los ríos y sus peñas (noviembre de 2026): la de Burgui, en el Esca, 70 m antes del puente medieval, la que
// saltan las almadías en el Día de la Almadía. Un azud de piedra algo oblicuo a la corriente, como los de los molinos: el
// paramento de aguas arriba casi vertical, la coronación de sillería y el glacis que baja hasta el agua de abajo, con el
// portillo, el paso abierto en la presa por donde bajaba la almadía con el agua, entre dos cajeros de sillar. El agua
// baja 1,1 m en la presa (tools/corriente-rio.py --presa) y espumea por el glacis y por el portillo. Y las peñas que
// asoman en el río, que la almadía tiene que esquivar. Todo queda en el pueblo; la bajada (game/almadia.js) lo usa.
//   cadena(real, rio, fuente) · presas(B, group, real, id) → { cadena, presa, peñas } (en real.presas)
import * as THREE from 'three';
import { box, M } from './builder.js';
import { terrainHeight } from './heightfield.js';
import { clamp, mulberry32 } from '../util/math.js';

// peñas: [a qué distancia de la fuente, a qué lado del eje (m), tamaño]
export const PRESAS = {
  'burgui-burgi': { rio: 'Ezka', fuente: [498, -278], x: 51.3, z: 149.8, oblicua: 0.3, portillo: { u: 1.4, ancho: 5.4 },
    peñas: [[150, -3.6, 1.5], [235, 4.2, 1.8], [318, -4.4, 1.6], [372, 1.8, 1.2], [455, 4, 1.9], [528, -3.2, 1.5], [585, 3.8, 1.4], [640, -4.1, 1.7], [722, 4.6, 1.3]] },
};

/** El río en el sentido de la corriente, desde la fuente: sus tramos encadenados, con el nivel y la distancia de cada punto.
 *  at(s) da el punto, la dirección de la corriente, la normal (a la derecha) y el nivel a s metros. */
export function cadena(real, rio, fuente) {
  const tramos = real.rios.filter(R => R.name === rio);
  if (!tramos.length) return null;
  const pts = [], lv = [], half = Math.max(...tramos.map(R => R.half));
  let punta = fuente, quedan = tramos.slice();
  while (quedan.length) {
    let best = null, bd = 1e9, al = false;
    for (const R of quedan) for (const [k, rev] of [[0, false], [R.pts.length - 1, true]]) { const d = Math.hypot(R.pts[k][0] - punta[0], R.pts[k][1] - punta[1]); if (d < bd) { bd = d; best = R; al = rev; } }
    if (bd > 40) break;
    const P = al ? best.pts.slice().reverse() : best.pts, V = al ? best.lv.slice().reverse() : best.lv;
    for (let i = 0; i < P.length; i++) { if (pts.length && Math.hypot(P[i][0] - pts[pts.length - 1][0], P[i][1] - pts[pts.length - 1][1]) < 0.2) continue; pts.push(P[i]); lv.push(V[i]); }
    quedan = quedan.filter(R => R !== best); punta = pts[pts.length - 1];
  }
  const s = [0]; for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = s[s.length - 1];
  const at = (q) => {
    q = clamp(q, 0, total); let i = 1; while (i < s.length - 1 && s[i] < q) i++;
    const a = pts[i - 1], b = pts[i], l = (s[i] - s[i - 1]) || 1, t = (q - s[i - 1]) / l, dx = (b[0] - a[0]) / l, dz = (b[1] - a[1]) / l;
    return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, dx, dz, nx: -dz, nz: dx, nivel: lv[i - 1] + (lv[i] - lv[i - 1]) * t };
  };
  const proyecta = (x, z) => { let best = 0, bd = 1e9; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], vx = b[0] - a[0], vz = b[1] - a[1], l2 = vx * vx + vz * vz || 1, t = clamp(((x - a[0]) * vx + (z - a[1]) * vz) / l2, 0, 1), d = Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t); if (d < bd) { bd = d; best = s[i] + t * Math.sqrt(l2); } } return best; };
  return { pts, lv, s, total, half, at, proyecta };
}

// un prisma con la sección pol ([[q, y]…], q a lo largo de T) estirado a lo largo de W, de a0 a a1, desde O
function estira(B, mat, pol, O, W, T, a0, a1, esc = 2) {
  const pos = [], idx = [], uv = [], n = pol.length;
  const P = (a, q, y) => [O.x + W.x * a + T.x * q, y, O.z + W.z * a + T.z * q];
  for (let i = 0; i < n; i++) {
    const [q0, y0] = pol[i], [q1, y1] = pol[(i + 1) % n], b = pos.length / 3, l = Math.hypot(q1 - q0, y1 - y0);
    pos.push(...P(a0, q0, y0), ...P(a1, q0, y0), ...P(a1, q1, y1), ...P(a0, q1, y1));
    uv.push(a0 / esc, 0, a1 / esc, 0, a1 / esc, l / esc, a0 / esc, l / esc);
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  for (const a of [a0, a1]) { const b = pos.length / 3; for (const [q, y] of pol) { pos.push(...P(a, q, y)); uv.push(q / esc, y / esc); } for (let i = 1; i < n - 1; i++) idx.push(b, b + i, b + i + 1); }
  // (las caras hacia fuera: el centro de la sección queda dentro; se giran las que miran hacia él)
  const cq = pol.reduce((s, p) => s + p[0], 0) / n, cy = pol.reduce((s, p) => s + p[1], 0) / n, am = (a0 + a1) / 2, C = P(am, cq, cy);
  for (let i = 0; i < idx.length; i += 3) {
    const A = idx[i] * 3, Bb = idx[i + 1] * 3, Cc = idx[i + 2] * 3;
    const ux = pos[Bb] - pos[A], uy = pos[Bb + 1] - pos[A + 1], uz = pos[Bb + 2] - pos[A + 2], vx = pos[Cc] - pos[A], vy = pos[Cc + 1] - pos[A + 1], vz = pos[Cc + 2] - pos[A + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const mx = (pos[A] + pos[Bb] + pos[Cc]) / 3 - C[0], my = (pos[A + 1] + pos[Bb + 1] + pos[Cc + 1]) / 3 - C[1], mz = (pos[A + 2] + pos[Bb + 2] + pos[Cc + 2]) / 3 - C[2];
    if (nx * mx + ny * my + nz * mz < 0) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); const gg = g.toNonIndexed(); gg.computeVertexNormals(); g.dispose();
  B.add(mat, gg, null, 1);
}

// la espuma: rayas blancas que corren (una textura pequeña que se desplaza en cada fotograma)
let ESPUMA = null;
function espuma() {
  if (ESPUMA) return ESPUMA;
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d'), r = mulberry32(5);
  g.clearRect(0, 0, 64, 128);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.6})`; const x = r() * 64, y = r() * 128, w = 1 + r() * 3, h = 6 + r() * 22; g.beginPath(); g.ellipse(x, y, w, h, 0, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  ESPUMA = t; return t;
}

/** Levanta la presa y las peñas del pueblo (si tiene) y lo deja en real.presas para la almadía. */
export function presas(B, group, real, id) {
  const F = PRESAS[id]; if (!F || !real) return null;
  const C = cadena(real, F.rio, F.fuente); if (!C) return null;
  // ---- la presa ----
  const sw = C.proyecta(F.x, F.z), O = C.at(sw), up = C.at(sw - 4).nivel, dn = C.at(sw + 5).nivel;
  const o = F.oblicua, W = { x: O.nx * Math.cos(o) + O.dx * Math.sin(o), z: O.nz * Math.cos(o) + O.dz * Math.sin(o) };
  let T = { x: W.z, z: -W.x }; if (T.x * O.dx + T.z * O.dz < 0) T = { x: -T.x, z: -T.z };   // (T, aguas abajo, perpendicular a la presa)
  const half = C.half, lado = half / Math.cos(o) + 3.5, bed = Math.min(terrainHeight(O.x, O.z), dn - 1.2) - 0.6, cresta = up + 0.06;
  const pu = F.portillo, p0 = pu.u - pu.ancho / 2, p1 = pu.u + pu.ancho / 2;
  const perfil = [[-0.75, bed], [3.2, bed], [3.2, dn - 0.4], [0.55, cresta], [-0.75, cresta]];
  estira(B, 'stone', perfil, O, W, T, -lado, p0 - 0.7);
  estira(B, 'stone', perfil, O, W, T, p1 + 0.7, lado);
  // (la coronación de sillería, un palmo más alta, y los cajeros del portillo)
  for (const [a, b] of [[-lado, p0 - 0.7], [p1 + 0.7, lado]]) estira(B, 'ashlar', [[-0.85, cresta - 0.05], [0.65, cresta - 0.05], [0.65, cresta + 0.18], [-0.85, cresta + 0.18]], O, W, T, a, b, 1.2);
  for (const a of [p0 - 0.7, p1]) estira(B, 'ashlar', [[-1.1, bed], [3.4, bed], [3.4, dn + 0.3], [-1.1, cresta + 0.45]], O, W, T, a, a + 0.7, 1.2);
  // (el suelo del portillo: una rampa de losas por donde corre el agua y baja la almadía)
  estira(B, 'ashlar', [[-0.75, bed], [3.2, bed], [3.2, dn - 0.5], [-0.75, up - 0.55]], O, W, T, p0, p1, 1.4);
  // la espuma: por el glacis a todo lo ancho y, más blanca, por el portillo
  const tex = espuma();
  // (fin: lo que queda de espuma en el borde de abajo, que se deshace en el agua sin una raya)
  const lamina = (a0, a1, q0, y0, q1, y1, op, fin = 0.6) => {
    const g = new THREE.BufferGeometry(), P = (a, q, y) => [O.x + W.x * a + T.x * q, y, O.z + W.z * a + T.z * q];
    g.setAttribute('position', new THREE.Float32BufferAttribute([...P(a0, q0, y0), ...P(a1, q0, y0), ...P(a1, q1, y1), ...P(a0, q1, y1)], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([a0 / 3, 0, a1 / 3, 0, a1 / 3, 1, a0 / 3, 1], 2)); g.setIndex([0, 2, 1, 0, 3, 2]); g.computeVertexNormals();
    g.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, fin, 1, 1, 1, fin], 4));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide, color: '#f4fbff', vertexColors: true }));
    m.renderOrder = 4; m.name = 'espuma de la presa'; m.onBeforeRender = () => { tex.offset.y = -(performance.now() / 1000 * 0.9) % 1; };
    group.add(m);
  };
  lamina(-half / Math.cos(o) - 0.5, p0 - 0.7, 0.4, cresta + 0.02, 3.2, dn + 0.04, 0.55);
  lamina(p1 + 0.7, half / Math.cos(o) + 0.5, 0.4, cresta + 0.02, 3.2, dn + 0.04, 0.55);
  lamina(p0, p1, -0.7, up - 0.5, 3.4, dn + 0.06, 0.9);
  lamina(p0 - 0.6, p1 + 0.6, 3.2, dn + 0.05, 8.5, dn + 0.03, 0.4, 0);   // (la espuma que se va río abajo)
  const presa = { s: sw, x: O.x, z: O.z, W, T, portillo: { x: O.x + W.x * pu.u, z: O.z + W.z * pu.u, ancho: pu.ancho }, up, dn };
  // ---- las peñas que asoman ----
  const r = mulberry32(31), peñas = [];
  for (const [d, u, tam] of F.peñas) {
    if (d > C.total - 5) continue;
    const q = C.at(d), x = q.x + q.nx * u, z = q.z + q.nz * u, fondo = Math.min(terrainHeight(x, z), q.nivel - 0.8);
    const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = 0.78 + r() * 0.42; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * (p.getY(i) > 0 ? 0.75 : 1), p.getZ(i) * k); }
    g.computeVertexNormals();
    const alto = q.nivel + 0.25 + tam * 0.22 - fondo;
    B.add('rock', g, M(x, fondo + alto * 0.42, z, r() * 6.28, 0, 0, tam, alto * 0.62, tam * (0.8 + r() * 0.4)), 1);
    peñas.push({ x, z, r: tam * 0.85, s: d });
  }
  return (real.presas = { cadena: C, presa, peñas, rio: F.rio });
}
