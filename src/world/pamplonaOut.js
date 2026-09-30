// Pamplona, alrededores del Casco Viejo: plaza de toros (con el callejón del encierro y el busto de Hemingway),
// murallas con el Portal de Francia y el baluarte del Redín, Ciudadela en estrella y estadio de El Sadar.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { box, archRing, archPanel, gable, colored, M, MM } from './builder.js';
import { roofHip } from './houses.js';
import { terrainHeight, addPlatform } from './heightfield.js';
import { addBox, addCircle } from './colliders.js';
import { PLACES } from './layout.js';
import { archedWall, winDoor, plaque, letters, toW, fitText, roundRect, FONT_SERIF, FONT_ROUND } from './civic.js';
import { noGrass } from './pamplona.js';

const gy = terrainHeight;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// barra (cilindro) entre dos puntos en coordenadas locales de T
function beam(B, mat, T, a, b, r) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, 6);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  const m = new THREE.Matrix4().compose(A.clone().add(Bv).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
  B.add(mat, g, MM(T, m));
}

// ---------- Plaza de toros ----------
export function bullring(B, S, cx, cz, TOWN) {
  const end = { x: 204, z: -71 };                          // final de la Estafeta: por aquí entra el encierro
  const ryG = Math.atan2(end.x - cx, end.z - cz);
  const y = gy(cx, cz) - 0.1, T = M(cx, y, cz, ryG), F = (m) => MM(T, m);
  const R = 36, H = 14, RB = 21.6, n = 44;
  const skip = (a, r, nn) => Math.abs(wrap(a)) < 2.9 / r + Math.PI / nn;
  const col = (lx, lz, w, d, rot = 0, meta) => { const p = toW(cx, cz, ryG, lx, lz); addBox(p.x, p.z, w, d, ryG + rot, meta); };
  // ruedo y callejón de arena
  B.add('paint', colored(new THREE.CircleGeometry(23.5, 56).rotateX(-Math.PI / 2), '#d7b27a'), F(M(0, 0.17, 0)));
  noGrass((x, z) => Math.hypot(x - cx, z - cz) < R + 2, cx - R - 3, cz - R - 3, cx + R + 3, cz + R + 3);
  // fachada: muro circular encalado con arcos de ladrillo en dos pisos y ventanas cuadradas arriba
  const segLen = 2 * R * Math.sin(Math.PI / n) + 0.06;
  for (let i = 0; i < n; i++) {
    const a = (i + 0.5) / n * Math.PI * 2;
    if (skip(a, R, n)) continue;
    const P = F(M(Math.sin(a) * R, 0, Math.cos(a) * R, a));
    B.add('plasterCream', box(segLen, H + 2, 0.9, 2.4), MM(P, M(0, H / 2 - 1, 0)));
    B.add('stoneDark', box(segLen + 0.02, 1.3, 1.05, 2), MM(P, M(0, 0.2, 0)));
    for (const [yy, hh] of [[4.9, 0.3], [9.4, 0.3], [H, 0.55]]) B.add('ashlar', box(segLen + 0.04, hh, 1.15, 1.5), MM(P, M(0, yy, 0)));
    B.add('dark', archPanel(1.9, 3.0, 0.1), MM(P, M(0, 1.3, 0.46)));
    B.add('brick', archRing(0.95, 1.22, 0.2, 10), MM(P, M(0, 3.35, 0.5)));
    B.add('dark', archPanel(1.6, 2.7, 0.1), MM(P, M(0, 5.9, 0.46)));
    B.add('brick', archRing(0.8, 1.05, 0.2, 10), MM(P, M(0, 7.8, 0.5)));
    B.add('dark', box(1.0, 1.1, 0.1), MM(P, M(0, 11.6, 0.46)));
    B.add('brick', box(1.35, 0.2, 0.2), MM(P, M(0, 12.25, 0.5)));
    // tejadillo de la andanada (vierte hacia fuera) y columnas de la galería alta
    B.add('tile', box(segLen * 0.98, 0.24, 6.6, 2), MM(P, M(0, H + 1.05, -2.6, 0, 0.17)));
    B.add('ashlar', new THREE.CylinderGeometry(0.17, 0.2, 4.6, 8), F(M(Math.sin(a) * 31.2, 12.3, Math.cos(a) * 31.2)));
    col(Math.sin(a) * R, Math.cos(a) * R, segLen, 1.2, a, { solidView: true });
  }
  // tendidos: gradas escalonadas en un solo torno, con un hueco para el callejón de entrada
  const g0 = 0.128, pts = [[35.6, 10.0], [31.2, 10.0]];
  { let r = 31.2, yy = 10.0; for (let k = 0; k < 14; k++) { yy -= 0.58; pts.push([r, yy]); r -= 0.56; pts.push([r, yy]); } pts.push([r, 0]); }
  const lathe = new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), 72, g0, Math.PI * 2 - 2 * g0).toNonIndexed();
  lathe.computeVertexNormals();
  { const nrm = lathe.attributes.normal, c = new Float32Array(nrm.count * 3), top = new THREE.Color('#d8cfbb'), rise = new THREE.Color('#aa9f88');
    for (let i = 0; i < nrm.count; i++) { const k = nrm.getY(i) > 0.5 ? top : rise; c[i * 3] = k.r; c[i * 3 + 1] = k.g; c[i * 3 + 2] = k.b; }
    lathe.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
  B.add('paint', lathe, F(M(0, 0, 0)));
  for (const s of [-1, 1]) {                                   // mejillas del hueco
    const a = s * g0, rc = 29.5;
    B.add('plasterCream', box(0.5, 10.4, 12.4, 2.4), F(M(Math.sin(a) * rc, 5.0, Math.cos(a) * rc, a)));
  }
  // palco presidencial sobre el callejón de entrada
  B.add('plasterCream', box(7.6, 5.2, 7.2, 2.4), F(M(0, 7.7, 29.3)));
  B.add('ashlar', box(8.2, 0.3, 1.2), F(M(0, 7.1, 25.4)));
  { const rail = new THREE.PlaneGeometry(7.6, 0.95), uv = rail.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 7.6 / 0.9); B.add('railing', rail, F(M(0, 7.72, 24.85, Math.PI))); }
  B.add('paint', colored(new THREE.PlaneGeometry(7.2, 1.2), '#b3202a'), F(M(0, 6.55, 24.82, Math.PI)));
  B.add('paint', colored(new THREE.PlaneGeometry(7.2, 0.18), '#e0b43a'), F(M(0, 6.02, 24.81, Math.PI)));
  B.add('tile', box(8.4, 0.22, 3.4, 2), F(M(0, 10.6, 26.4, 0, -0.35)));
  B.add('dark', box(5.6, 2.3, 0.1), F(M(0, 8.4, 25.7)));
  // callejón de entrada (túnel)
  for (const s of [-1, 1]) { B.add('plasterCream', box(0.6, 5.2, 15.2, 2.4), F(M(s * 2.95, 2.3, 29))); col(s * 2.95, 29, 0.7, 15.2); }
  B.add('ashlar', box(6.5, 0.5, 11, 2), F(M(0, 5.15, 31)));
  // portada exterior con el rótulo
  B.add('plasterCream', archedWall(12, H + 2, 5.0, 6.4, 1.6, false), F(M(0, -1, R + 0.1)));
  B.add('brick', archRing(2.5, 3.0, 1.7, 14), F(M(0, 2.9, R + 0.15)));
  for (const s of [-1, 1]) { B.add('ashlar', box(0.8, H, 0.5), F(M(s * 5.4, H / 2, R + 1.0))); col(s * 4.2, R + 0.1, 3.6, 1.6); }
  B.add('ashlar', box(12.6, 0.6, 1.9), F(M(0, H + 0.3, R + 0.2)));
  B.add('ashlar', gable(8, 2.2, 1.0), F(M(0, H + 0.6, R + 0.4)));
  B.add('shield', new THREE.PlaneGeometry(1.2, 1.45), F(M(0, H + 1.25, R + 0.92)));
  S.add(F(M(0, 8.2, R + 0.97)), 8.6, 1.1, letters('PLAZA DE TOROS', '#8a2a1f', { shadow: null, size: 0.72 }));
  S.add(F(M(0, 7.2, R + 0.97)), 6.4, 0.62, letters('ZEZEN PLAZA', '#8a2a1f', { shadow: null, size: 0.7 }));
  // barrera roja, con burladeros
  const nb = 60, bl = 2 * RB * Math.sin(Math.PI / nb) + 0.03;
  for (let i = 0; i < nb; i++) {
    const a = (i + 0.5) / nb * Math.PI * 2;
    if (skip(a, RB, nb)) continue;
    const P = F(M(Math.sin(a) * RB, 0, Math.cos(a) * RB, a));
    B.add('paint', colored(box(bl, 1.35, 0.14), '#8f2a22'), MM(P, M(0, 0.68, 0)));
    B.add('paint', colored(box(bl, 0.12, 0.26), '#5e1b16'), MM(P, M(0, 1.4, 0)));
    col(Math.sin(a) * RB, Math.cos(a) * RB, bl, 0.4, a);
  }
  for (const a of [Math.PI / 2, Math.PI, Math.PI * 1.5, Math.PI * 0.75, Math.PI * 1.25]) {
    const P = F(M(Math.sin(a) * (RB - 0.9), 0, Math.cos(a) * (RB - 0.9), a));
    B.add('paint', colored(box(1.9, 1.7, 0.12), '#8f2a22'), MM(P, M(0, 0.85, 0)));
    B.add('paint', colored(box(1.9, 0.14, 0.13), '#f2ede3'), MM(P, M(0, 1.3, 0.01)));
    col(Math.sin(a) * (RB - 0.9), Math.cos(a) * (RB - 0.9), 1.9, 0.3, a);
  }
  // busto de Hemingway en su paseo
  const hx = cx - 10, hz = cz + 42, hr = Math.atan2(180 - hx, 0 - hz), HT = M(hx, gy(hx, hz), hz, hr);
  B.add('ashlar', box(1.5, 0.3, 1.3), MM(HT, M(0, 0.15, 0)));
  B.add('ashlar', box(0.95, 1.7, 0.8, 1.2), MM(HT, M(0, 1.15, 0)));
  const bronze = '#5d4631';
  B.add('paint', colored(new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 0.62), bronze), MM(HT, M(0, 2.0, 0)));
  B.add('paint', colored(new THREE.CylinderGeometry(0.12, 0.15, 0.25, 8), bronze), MM(HT, M(0, 2.4, 0)));
  B.add('paint', colored(new THREE.SphereGeometry(0.25, 12, 10), bronze), MM(HT, M(0, 2.7, 0.02)));
  B.add('paint', colored(new THREE.SphereGeometry(0.19, 10, 8).scale(1, 0.8, 0.9), '#4d3a28'), MM(HT, M(0, 2.55, 0.1)));
  S.add(MM(HT, M(0, 1.3, 0.41)), 0.8, 0.3, plaque(['ERNEST HEMINGWAY'], { bg: '#e8dcc0', fg: '#3a2a1c', border: '#6b5a3e' }));
  addCircle(hx, hz, 0.95);
  return toW(cx, cz, ryG, 0, R + 7);
}

// ---------- Murallas: norte con el Portal de Francia, baluarte del Redín y lienzo este ----------
const WALL = [[-116, -254], [186, -254], [230, -282], [212, -232], [212, -150]];
function rampart(B, ax, az, bx, bz, gap, TOWN) {
  const L = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / L, tz = (bz - az) / L, nx = tz, nz = -tx, ry = Math.atan2(nx, nz);
  const np = Math.max(1, Math.round(L / 6)), l = L / np;
  for (let k = 0; k < np; k++) {
    const mx = ax + tx * (k + 0.5) * l, mz = az + tz * (k + 0.5) * l;
    if (gap && Math.abs(mx - gap) < 6) continue;
    const yi = gy(mx - nx * 3, mz - nz * 3), yo = Math.min(gy(mx + nx * 6, mz + nz * 6), gy(mx + nx * 10, mz + nz * 10));
    const bot = Math.min(yo, yi) - 1.6, top = yi + 0.05, T = M(mx, 0, mz, ry);
    B.add('stone', box(l + 0.12, top - bot, 5.4, 2.4), MM(T, M(0, (top + bot) / 2, 1.5, 0, -0.05)));
    B.add('ashlar', box(l + 0.12, 1.0, 0.8, 1.5), MM(T, M(0, yi + 0.5, 2.0)));
    B.add('ashlar', box(l + 0.14, 0.14, 0.95, 1), MM(T, M(0, yi + 1.06, 2.0)));
    if (yi - yo > 3) B.add('ashlar', new THREE.CylinderGeometry(0.28, 0.28, l + 0.12, 8).rotateZ(Math.PI / 2), MM(T, M(0, yi - 0.3, 3.95)));
    const c = toW(mx, mz, ry, 0, 2.9); addBox(c.x, c.z, l + 0.1, 2.9, ry, { solidView: true, top: yi + 1.1 });
  }
}
function garita(B, x, z, nx, nz) {
  const yi = gy(x - nx * 3, z - nz * 3), px = x + nx * 4.2, pz = z + nz * 4.2, T = M(px, yi, pz, Math.atan2(nx, nz));
  B.add('ashlar', new THREE.ConeGeometry(1.05, 1.6, 12).rotateX(Math.PI), MM(T, M(0, -0.5, 0)));
  B.add('ashlar', new THREE.CylinderGeometry(0.95, 0.95, 2.5, 12), MM(T, M(0, 1.5, 0)));
  B.add('ashlar', new THREE.CylinderGeometry(1.08, 1.08, 0.18, 12), MM(T, M(0, 2.8, 0)));
  B.add('ashlar', new THREE.SphereGeometry(1.0, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), MM(T, M(0, 2.85, 0)));
  B.add('ashlar', new THREE.ConeGeometry(0.16, 0.7, 6), MM(T, M(0, 4.1, 0)));
  for (const a of [-0.9, 0, 0.9]) B.add('dark', box(0.13, 0.7, 0.05), MM(T, M(Math.sin(a) * 0.96, 1.7, Math.cos(a) * 0.96, a)));
  addCircle(px, pz, 1.1);
}
export function walls(B, S, TOWN) {
  const GX = 40;
  for (let i = 0; i < WALL.length - 1; i++) rampart(B, ...WALL[i], ...WALL[i + 1], i === 0 ? GX : null, TOWN);
  garita(B, -116, -254, 0, -1); garita(B, -40, -254, 0, -1); garita(B, 110, -254, 0, -1); garita(B, 212, -150, 1, 0);
  garita(B, 230, -282, 0.622, -0.783);
  // Portal de Francia: puerta en arco en un cuerpo macizo, con el escudo del emperador y el puente levadizo
  const yg = gy(GX, -254), T = M(GX, yg - 0.3, -255.5, Math.PI), F = (m) => MM(T, m);
  B.add('stone', archedWall(14.4, 9.6, 4.6, 5.6, 6, false), F(M(0, 0, 0)));
  B.add('ashlar', archRing(2.3, 2.9, 0.5, 14), F(M(0, 3.3, 3.05)));
  B.add('ashlar', box(14.8, 0.5, 6.4), F(M(0, 9.6, 0)));
  for (let i = 0; i < 7; i++) B.add('ashlar', box(1.0, 0.9, 0.8), F(M(-6 + i * 2, 10.3, 2.6)));
  for (const s of [-1, 1]) { B.add('ashlar', box(0.5, 3.6, 0.3), F(M(s * 1.8, 7.0, 3.1))); const c = toW(GX, -255.5, Math.PI, s * 4.7, 0); addBox(c.x, c.z, 4.8, 6, Math.PI, { solidView: true }); }
  B.add('ashlar', box(4.4, 0.4, 0.5), F(M(0, 8.9, 3.15)));
  B.add('ashlar', gable(4.6, 1.0, 0.5), F(M(0, 9.1, 3.15)));
  B.add('shield', new THREE.PlaneGeometry(2.3, 2.8), F(M(0, 6.95, 3.07)));
  B.add('paint', colored(new THREE.CircleGeometry(0.42, 12), '#e0b43a'), F(M(0, 8.6, 3.1)));
  S.add(F(M(-4.3, 2.6, 3.05)), 1.7, 0.7, plaque(['PORTAL DE FRANCIA', 'FRANTZIAKO ATARIA']));
  S.add(F(M(4.3, 2.6, 3.05)), 0.8, 0.8, (g, W, H) => {
    g.fillStyle = '#1f4f9a'; roundRect(g, 0, 0, W, H, 18); g.fill();
    g.save(); g.translate(W / 2, H * 0.58); g.fillStyle = '#f2c230'; g.strokeStyle = '#f2c230'; g.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const a = -Math.PI * 0.9 + i / 8 * Math.PI * 0.8; g.lineWidth = W * 0.04; g.beginPath(); g.moveTo(0, H * 0.24); g.lineTo(Math.cos(a) * W * 0.36, Math.sin(a) * W * 0.36 + H * 0.02); g.stroke(); }
    g.restore();
  });
  // puente levadizo bajado sobre la rampa, con sus cadenas
  const yN = gy(GX, -258.6), yF = gy(GX, -264.8), dz = 6.2;
  const DT = M(GX, 0, -254, Math.PI);
  B.add('wood', box(4.4, 0.25, dz, 1.2), MM(DT, M(0, (yN + yF) / 2 + 0.12 - yg + yg, 4.6 + dz / 2, 0, Math.atan2(yN - yF, dz))));
  for (let k = 0; k < 6; k++) { const t = (k + 0.5) / 6, yy = yN + (yF - yN) * t; B.add('woodDark', box(4.5, 0.08, 0.14), MM(DT, M(0, yy + 0.27, 4.6 + t * dz))); }
  for (const s of [-1, 1]) beam(B, 'iron', DT, [s * 2.05, yF + 0.35, 4.6 + dz - 0.2], [s * 2.05, yg + 7.6, 3.2], 0.05);
  // Redín: cruz del Mercado sobre el baluarte y barandilla del mirador
  const rx = 210, rz = -258, ry0 = gy(rx, rz);
  for (let i = 0; i < 3; i++) B.add('ashlar', box(3.2 - i * 0.8, 0.3, 3.2 - i * 0.8), M(rx, ry0 + 0.15 + i * 0.3, rz));
  B.add('ashlar', new THREE.CylinderGeometry(0.18, 0.24, 3.4, 8), M(rx, ry0 + 2.5, rz));
  B.add('ashlar', box(1.3, 0.24, 0.24), M(rx, ry0 + 3.9, rz)); B.add('ashlar', box(0.24, 0.9, 0.24), M(rx, ry0 + 4.1, rz));
  addCircle(rx, rz, 1.7);
  return { x: GX, z: -246 };
}

// ---------- Ciudadela: estrella de cinco baluartes con foso, puerta del Socorro y edificios militares ----------
export function citadel(B, S, TOWN) {
  const C = PLACES.citadel, poly = C.poly; if (!poly) return { x: C.x, z: C.z };
  let area = 0; for (let i = 0; i < poly.length; i++) { const [x0, z0] = poly[i], [x1, z1] = poly[(i + 1) % poly.length]; area += x0 * z1 - x1 * z0; }
  const sgn = area > 0 ? 1 : -1;
  const gate = { x: C.x + C.dir.x * C.R * 0.809, z: C.z + C.dir.z * C.R * 0.809 };
  for (let i = 0; i < poly.length; i++) {
    const [ax, az] = poly[i], [bx, bz] = poly[(i + 1) % poly.length];
    const L = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / L, tz = (bz - az) / L, nx = tz * sgn, nz = -tx * sgn, ry = Math.atan2(nx, nz);
    const np = Math.max(1, Math.round(L / 7)), l = L / np;
    for (let k = 0; k < np; k++) {
      const mx = ax + tx * (k + 0.5) * l, mz = az + tz * (k + 0.5) * l;
      if (Math.hypot(mx - gate.x, mz - gate.z) < 5) continue;
      const yi = gy(mx - nx * 3, mz - nz * 3), yo = Math.min(gy(mx + nx * 7, mz + nz * 7), gy(mx + nx * 12, mz + nz * 12));
      const top = yi + 5.2, bot = Math.min(yo, yi) - 1.2, T = M(mx, 0, mz, ry);
      B.add('stone', box(l + 0.15, top - bot, 5.4, 2.4), MM(T, M(0, (top + bot) / 2, 1.1, 0, -0.07)));
      B.add('ashlar', box(l + 0.16, 0.45, 1.3, 1), MM(T, M(0, top + 0.1, 2.9)));
      B.add('ashlar', new THREE.CylinderGeometry(0.26, 0.26, l + 0.15, 8).rotateZ(Math.PI / 2), MM(T, M(0, top - 0.9, 3.7)));
      B.add('stone', box(l + 0.1, 0.9, 0.7, 2), MM(T, M(0, top + 0.6, 3.0)));
      const c = toW(mx, mz, ry, 0, 1.1); addBox(c.x, c.z, l + 0.1, 5.6, ry, { solidView: true });
    }
  }
  // garitas en las puntas de los baluartes
  for (let i = 0; i < 5; i++) {
    const [px, pz] = poly[i * 5 + 2], d = Math.hypot(px - C.x, pz - C.z), ux = (px - C.x) / d, uz = (pz - C.z) / d;
    const yi = gy(px - ux * 5, pz - uz * 5) + 5.2, T = M(px - ux * 1.2, yi, pz - uz * 1.2, Math.atan2(ux, uz));
    B.add('ashlar', new THREE.ConeGeometry(1.0, 1.5, 12).rotateX(Math.PI), MM(T, M(0, -0.4, 0)));
    B.add('ashlar', new THREE.CylinderGeometry(0.9, 0.9, 2.4, 12), MM(T, M(0, 1.5, 0)));
    B.add('ashlar', new THREE.SphereGeometry(0.98, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), MM(T, M(0, 2.75, 0)));
    B.add('dark', box(0.12, 0.65, 0.05), MM(T, M(0, 1.7, 0.92)));
  }
  // puerta del Socorro: arco con frontón y escudo real, mirando a la ciudad
  const yg = gy(gate.x - C.dir.x * 3, gate.z - C.dir.z * 3), gr = Math.atan2(C.dir.x, C.dir.z);
  const T = M(gate.x, yg - 0.3, gate.z, gr), F = (m) => MM(T, m);
  B.add('ashlar', archedWall(11, 6.4, 4.2, 4.8, 6.2, false), F(M(0, 0, 1.1)));
  for (const s of [-1, 1]) { B.add('ashlar', box(0.8, 5.6, 0.5), F(M(s * 3.2, 2.8, 4.35))); const c = toW(gate.x, gate.z, gr, s * 3.8, 1.1); addBox(c.x, c.z, 3.4, 6.2, gr, { solidView: true }); }
  B.add('ashlar', box(8.2, 0.6, 0.8), F(M(0, 5.7, 4.3)));
  B.add('ashlar', gable(8.6, 2.0, 0.8), F(M(0, 6.0, 4.3)));
  B.add('shield', new THREE.PlaneGeometry(1.3, 1.55), F(M(0, 6.85, 4.72)));
  S.add(F(M(0, 5.1, 4.72)), 3.6, 0.5, letters('CIUDADELA · ZITADELA', '#3a3226', { shadow: null, size: 0.66 }));
  // Sala de Armas y Polvorín
  const bld = (x, z, w, d, h, mat, fn) => {
    const ry = Math.atan2(C.x - x, C.z - z), y0 = Math.min(gy(x, z), gy(x + 5, z), gy(x - 5, z)) - 0.1, BT = M(x, y0, z, ry);
    B.add(mat, box(w, h + 2, d, 2.4), MM(BT, M(0, h / 2 - 1, 0)));
    fn(BT);
    addBox(x, z, w + 0.4, d + 0.4, ry, { solidView: true });
    TOWN.houses.push({ x, z, ry, w, d, top: y0 + h + 4 });
    return BT;
  };
  const sala = bld(C.x - 12, C.z + 10, 24, 10, 8.5, 'ashlar', (BT) => {
    for (let c = 0; c < 7; c++) { const x = -10.3 + c * 3.43; B.add('dark', archPanel(1.5, 2.9, 0.1), MM(BT, M(x, 0, 5.03))); B.add('ashlar', archRing(0.75, 1.0, 0.2, 10), MM(BT, M(x, 2.15, 5.08))); winDoor(B, MM(BT, M(0, 0, 5)), x, 4.8, 0.95, 1.8, null); }
    roofHip(B, BT, 24, 10, 8.5, 3.2, 'tile');
  });
  bld(C.x + 14, C.z + 9, 12, 8, 6, 'stone', (BT) => {
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) B.add('stone', box(0.9, 5, 1.2, 2), MM(BT, M(s * 6.2, 2.4, -2.5 + k * 2.5, Math.PI / 2)));
    const rise = 2.6, a = Math.atan2(rise, 4);
    for (const s of [-1, 1]) B.add('tile', box(13, 0.22, Math.hypot(4, rise) + 0.5, 2), MM(BT, M(0, 6 + rise / 2, s * 2, 0, s * a)));
    for (const s of [-1, 1]) B.add('stone', gable(8, rise, 0.4), MM(BT, M(s * 5.8, 6, 0, Math.PI / 2)));
    B.add('woodDark', archPanel(1.5, 2.4, 0.1), MM(BT, M(0, 0, 4.03)));
  });
  S.add(MM(sala, M(0, 6.2, 5.08)), 3.2, 0.55, letters('SALA DE ARMAS', '#3a3226', { shadow: null }));
  return { x: C.x + C.dir.x * 26, z: C.z + C.dir.z * 26 };
}

// ---------- Estadio de El Sadar ----------
function canvasTex(w, h, draw, repeat = false) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) t.wrapS = THREE.RepeatWrapping;
  return t;
}
function pitchTexture() {
  return canvasTex(512, 768, (g, W, H) => {
    const sx = W / 52, sz = H / 78, X = (x) => (x + 26) * sx, Y = (z) => (z + 39) * sz;
    for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#3f8a37' : '#4b9a41'; g.fillRect(0, i * H / 13, W, H / 13 + 1); }
    g.strokeStyle = '#f4f6f2'; g.lineWidth = 2.6;
    g.strokeRect(X(-23), Y(-36), 46 * sx, 72 * sz);
    g.beginPath(); g.moveTo(X(-23), Y(0)); g.lineTo(X(23), Y(0)); g.stroke();
    g.beginPath(); g.arc(X(0), Y(0), 9.15 * sx, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#f4f6f2'; g.beginPath(); g.arc(X(0), Y(0), 3, 0, Math.PI * 2); g.fill();
    for (const s of [-1, 1]) {
      g.strokeRect(X(-20.15), s < 0 ? Y(-36) : Y(19.5), 40.3 * sx, 16.5 * sz);
      g.strokeRect(X(-9.15), s < 0 ? Y(-36) : Y(30.5), 18.3 * sx, 5.5 * sz);
      g.beginPath(); g.arc(X(0), Y(s * 25), 3, 0, Math.PI * 2); g.fill();
      g.save(); g.beginPath(); g.rect(0, s < 0 ? Y(-19.5) : 0, W, s < 0 ? H : Y(19.5)); g.clip();
      g.beginPath(); g.arc(X(0), Y(s * 25), 9.15 * sx, 0, Math.PI * 2); g.stroke(); g.restore();
      for (const t of [-1, 1]) { g.beginPath(); g.arc(X(t * 23), Y(s * 36), 1 * sx, 0, Math.PI * 2); g.stroke(); }
    }
  });
}
// fachada: bandas de paneles rojos con aletas blancas y la planta baja acristalada
function facadePaint(g, W, H, ppm, title) {
  const hm = H / ppm;
  g.fillStyle = '#b3202a'; g.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += ppm * 1.2) { g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(x, 0, Math.max(2, ppm * 0.16), H * (1 - 4.8 / hm)); g.fillStyle = 'rgba(80,0,10,.25)'; g.fillRect(x + ppm * 0.16, 0, Math.max(1, ppm * 0.08), H * (1 - 4.8 / hm)); }
  for (const yy of [2.2, 7.5, 12.2]) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, (yy / hm) * H, W, ppm * 0.25); }
  g.fillStyle = '#23303d'; g.fillRect(0, H * (1 - 4.6 / hm), W, H * 4.6 / hm);
  g.fillStyle = '#5d7486'; for (let x = 0; x < W; x += ppm * 2.4) g.fillRect(x, H * (1 - 4.6 / hm), Math.max(2, ppm * 0.12), H * 4.6 / hm);
  g.fillStyle = '#e9ecef'; g.fillRect(0, H * (1 - 4.9 / hm), W, ppm * 0.3);
  if (title) {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(0,0,0,.3)'; fitText(g, title, W / 2 + ppm * 0.25, H * 0.36 + ppm * 0.3, W * 0.5, H * 0.34, FONT_ROUND, '900');
    g.fillStyle = '#ffffff'; fitText(g, title, W / 2, H * 0.36, W * 0.5, H * 0.34, FONT_ROUND, '900');
  }
}
function quad(x0, z0, x1, z1, y0, y1, u0, u1, v0 = 0, v1 = 1) {
  const g = new THREE.BufferGeometry();
  const p = [x0, y0, z0, x1, y0, z1, x1, y1, z1, x0, y0, z0, x1, y1, z1, x0, y1, z0];
  const uv = [u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1];
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
  return g;
}
const FONT5 = {
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'], S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'], U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
};
export function stadium(B, S, group, cx, cz, TOWN) {
  const y = gy(cx, cz) - 0.05, T = M(cx, y, cz, 0), F = (m) => MM(T, m);
  const SX = 27, SZ = 40, OX = 43, OZ = 56, ROWS = 20, run = 0.75, rise = 0.48, HH = 16.5, GAP = 3.2;
  noGrass((x, z) => Math.abs(x - cx) < OX + 2 && Math.abs(z - cz) < OZ + 2, cx - OX - 3, cz - OZ - 3, cx + OX + 3, cz + OZ + 3);
  // césped pintado y pista
  const pm = new THREE.MeshStandardMaterial({ map: pitchTexture(), roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(52, 78).rotateX(-Math.PI / 2), pm);
  pitch.position.set(cx, y + 0.1, cz); pitch.receiveShadow = true; pitch.matrixAutoUpdate = false; pitch.updateMatrix(); group.add(pitch);
  B.add('paint', colored(new THREE.PlaneGeometry(2 * OX, 2 * OZ).rotateX(-Math.PI / 2), '#3d6e3a'), F(M(0, 0.05, 0)));
  // gradas: filas escalonadas; en la grada este, OSASUNA escrito con asientos blancos
  const RED = ['#b8202b', '#a61b26'], WHITE = '#f1f1ef', NAVY = '#1f2d5a';
  const word = 'OSASUNA', px = 1.5, cols = word.length * 6 - 1, zText0 = -cols * px / 2;
  const pixel = (k, z) => {
    if (k < 3 || k > 16) return false;
    const br = 6 - Math.floor((k - 3) / 2), c = Math.floor((z - zText0) / px);
    if (c < 0 || c >= cols || c % 6 === 5) return false;
    return FONT5[word[Math.floor(c / 6)]][br][c % 6] === '#';
  };
  const sideRow = (s, k, z0, z1, text) => {
    const x0 = SX + k * run, dx = OX - x0, h = 1 + (k + 1) * rise;
    let a = z0;
    const put = (b, color) => { if (b - a < 0.01) return; B.add('paint', colored(box(dx, h, b - a, 2), color), F(M(s * (x0 + dx / 2), h / 2 - 0.5, (a + b) / 2))); a = b; };
    if (!text) { put(z1, k >= 18 ? NAVY : RED[k % 2]); return; }
    let cur = pixel(k, z0 + 0.01);
    for (let z = zText0; z <= -zText0 + 0.01; z += px) {
      if (z <= z0) continue;
      const on = pixel(k, z + 0.01);
      if (on !== cur) { put(Math.min(z, z1), cur ? WHITE : RED[k % 2]); cur = on; }
    }
    put(z1, cur ? WHITE : RED[k % 2]);
  };
  for (let k = 0; k < ROWS; k++) {
    sideRow(1, k, -OZ, OZ, true);
    sideRow(-1, k, -OZ, -GAP, false); sideRow(-1, k, GAP, OZ, false);
    for (const s of [-1, 1]) {
      const z0 = SZ + k * run, dz = OZ - z0, h = 1 + (k + 1) * rise;
      B.add('paint', colored(box(2 * SX, h, dz, 2), k >= 18 ? NAVY : RED[k % 2]), F(M(0, h / 2 - 0.5, s * (z0 + dz / 2))));
    }
  }
  // cubierta blanca sobre las cuatro gradas y muro trasero
  for (const s of [-1, 1]) {
    B.add('paint', colored(box(18.4, 0.4, 2 * OZ + 1.4), '#eef1f3'), F(M(s * 34.7, HH + 0.45, 0, 0, 0, s * 0.06)));
    B.add('paint', colored(box(2 * SX - 2, 0.4, 18.4), '#eef1f3'), F(M(0, HH + 0.45, s * 47.7, 0, -s * 0.06, 0)));
    B.add('paint', colored(box(0.5, 1.0, 2 * OZ + 1.4), '#4a5058'), F(M(s * 25.6, HH - 0.05, 0)));
    B.add('paint', colored(box(2 * SX - 2, 1.0, 0.5), '#4a5058'), F(M(0, HH - 0.05, s * 38.6)));
    if (s > 0) B.add('paint', colored(box(0.36, HH + 5.5, 2 * OZ + 0.7), '#3a3f45'), F(M(OX + 0.18, HH / 2 - 2.25, 0)));
    B.add('paint', colored(box(0.36, HH + 5.5, OZ + 0.35 - GAP), '#3a3f45'), F(M(-(OX + 0.18), HH / 2 - 2.25, s * (OZ + 0.35 + GAP) / 2)));
    B.add('paint', colored(box(2 * OX, HH + 5.5, 0.36), '#3a3f45'), F(M(0, HH / 2 - 2.25, s * (OZ + 0.18))));
  }
  // la pared oeste necesita el hueco de la entrada: se tapa con dos paños y un dintel encima (la caja de arriba se sustituye)
  B.add('paint', colored(box(0.36, HH + 0.5 - 5.2, 2 * GAP + 0.2), '#3a3f45'), F(M(-(OX + 0.18), 5.2 + (HH + 0.5 - 5.2) / 2, 0)));
  // fachadas con textura: tres lisas y la oeste con EL SADAR
  const plain = canvasTex(256, 528, (g, W, H) => facadePaint(g, W, H, 32, null), true);
  const west = canvasTex(2048, 302, (g, W, H) => facadePaint(g, W, H, 2048 / 112, 'EL SADAR'));
  const fo = OX + 0.4, fz = OZ + 0.4, y0 = -4.5, y1 = HH + 0.6, T0 = new THREE.Matrix4().makeTranslation(cx, y, cz);
  const plainG = [quad(fo, fz, fo, -fz, y0, y1, 0, 2 * fz / 8), quad(fo, -fz, -fo, -fz, y0, y1, 0, 2 * fo / 8), quad(-fo, fz, fo, fz, y0, y1, 0, 2 * fo / 8)].map(g => g.applyMatrix4(T0));
  const wm = (a, b) => (a + fz) / (2 * fz);
  const vy = (h) => (h - y0) / (y1 - y0);
  const westG = [quad(-fo, -fz, -fo, -GAP, y0, y1, wm(-fz), wm(-GAP)), quad(-fo, GAP, -fo, fz, y0, y1, wm(GAP), wm(fz)), quad(-fo, -GAP, -fo, GAP, 5.2, y1, wm(-GAP), wm(GAP), vy(5.2), 1)].map(g => g.applyMatrix4(T0));
  for (const [geos, map] of [[plainG, plain], [westG, west]]) {
    const m = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ map, roughness: 0.65, metalness: 0.1 }));
    m.castShadow = true; m.receiveShadow = true; m.matrixAutoUpdate = false; group.add(m);
  }
  // porterías con red
  const net = canvasTex(64, 64, (g, W, H) => { g.strokeStyle = '#f4f4f4'; g.lineWidth = 2; for (let i = 0; i <= W; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, H); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(W, i); g.stroke(); } });
  net.wrapS = net.wrapT = THREE.RepeatWrapping;
  const nets = [];
  for (const s of [-1, 1]) {
    const gz = s * 36;
    for (const px2 of [-3.66, 3.66]) { B.add('paint', colored(new THREE.CylinderGeometry(0.07, 0.07, 2.44, 8), '#fafafa'), F(M(px2, 1.22, gz))); addCircle(cx + px2, cz + gz, 0.2); }
    B.add('paint', colored(new THREE.CylinderGeometry(0.07, 0.07, 7.46, 8).rotateZ(Math.PI / 2), '#fafafa'), F(M(0, 2.44, gz)));
    const back = quad(-3.66, gz + s * 2, 3.66, gz + s * 2, 0, 2.2, 0, 7.3, 0, 2.2), top = new THREE.PlaneGeometry(7.32, 2).rotateX(-Math.PI / 2).translate(0, 2.3, gz + s * 1);
    { const uv = top.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 7.3, uv.getY(i) * 2); }
    const sides = [-3.66, 3.66].map(sx => quad(sx, gz, sx, gz + s * 2, 0, 2.44, 0, 2, 0, 2.44));
    for (const g of [back, top, ...sides]) nets.push((g.index ? g.toNonIndexed() : g).applyMatrix4(T0));
  }
  { const m = new THREE.Mesh(mergeGeometries(nets.map(g => { if (!g.attributes.normal) g.computeVertexNormals(); return g; })), new THREE.MeshStandardMaterial({ map: net, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 })); m.matrixAutoUpdate = false; group.add(m); }
  // vallas de publicidad a pie de campo
  const board = canvasTex(1024, 64, (g, W, H) => { g.fillStyle = '#16213a'; g.fillRect(0, 0, W, H); g.textBaseline = 'middle'; g.font = `900 ${H * 0.62}px ${FONT_ROUND}`; const words = ['IRUÑA', 'PAMPLONA', 'OSASUNA', 'NAFARROA']; let x = 16; let i = 0; while (x < W) { const w = words[i % 4]; g.fillStyle = i % 2 ? '#f2c230' : '#ffffff'; g.fillText(w, x, H / 2 + 2); x += g.measureText(w).width + 40; i++; } }, true);
  const bds = [];
  for (const s of [-1, 1]) {
    bds.push(quad(s * 25, -s * 38, s * 25, s * 38, 0, 0.9, 0, 76 / 12));
    bds.push(quad(s * 23, s * 39, -s * 23, s * 39, 0, 0.9, 0, 46 / 12));
  }
  { const m = new THREE.Mesh(mergeGeometries(bds.map(g => g.applyMatrix4(T0))), new THREE.MeshStandardMaterial({ map: board, roughness: 0.6, emissive: new THREE.Color('#ffffff'), emissiveMap: board, emissiveIntensity: 0.25 })); m.matrixAutoUpdate = false; group.add(m); }
  // colisiones: gradas (hasta el muro) y el hueco de entrada al oeste
  addBox(cx + (SX + OX + 0.6) / 2, cz, OX + 0.6 - SX, 2 * OZ + 1, 0, { solidView: true });
  addBox(cx - (SX + OX + 0.6) / 2, cz - (GAP + OZ + 0.6) / 2, OX + 0.6 - SX, OZ + 0.6 - GAP, 0, { solidView: true });
  addBox(cx - (SX + OX + 0.6) / 2, cz + (GAP + OZ + 0.6) / 2, OX + 0.6 - SX, OZ + 0.6 - GAP, 0, { solidView: true });
  for (const s of [-1, 1]) addBox(cx, cz + s * (SZ + OZ + 0.6) / 2, 2 * SX, OZ + 0.6 - SZ, 0, { solidView: true });
  TOWN.houses.push({ x: cx, z: cz, ry: 0, w: 2 * OX, d: 2 * OZ, top: y + HH + 2 });
  return { x: cx - 16, z: cz + 6 };
}
