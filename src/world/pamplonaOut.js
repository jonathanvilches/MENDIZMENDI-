// Pamplona, alrededores del Casco Viejo: plaza de toros (con el callejón del encierro y el busto de Hemingway),
// murallas con el Portal de Francia y el baluarte del Redín, Ciudadela en estrella y estadio de El Sadar.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { box, archRing, archPanel, gable, colored, M, MM, DETAIL, builderQuality } from './builder.js';
import { roofHip } from './houses.js';
import { terrainHeight } from './heightfield.js';
import { addBox, addCircle } from './colliders.js';
import { PLACES } from './layout.js';
import { lamp } from './village.js';
import { archedWall, winDoor, plaque, letters, toW, fitText, roundRect, FONT_ROUND } from './civic.js';
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
  // fachada: pilares claros con paños y puertas rojas abajo, dos galerías abiertas encima y el gran anillo de cobre verde
  const segLen = 2 * R * Math.sin(Math.PI / n) + 0.06;
  for (let i = 0; i < n; i++) {
    const a = (i + 0.5) / n * Math.PI * 2;
    if (skip(a, R, n)) continue;
    const P = F(M(Math.sin(a) * R, 0, Math.cos(a) * R, a));
    B.add('paint', colored(box(segLen, H + 2, 0.4), '#7b7264'), MM(P, M(0, H / 2 - 1, -0.5)));                 // fondo de las galerías
    B.add('plasterCream', box(segLen, 5.0, 0.7, 2.4), MM(P, M(0, 1.5, 0)));                   // planta baja
    const door = i % 4 === 0;
    B.add('paint', colored(box(segLen - 1.1, door ? 3.0 : 1.9, 0.08), '#c8372d'), MM(P, M(0, door ? 1.5 : 1.35, 0.37)));
    if (!door) B.add('paint', colored(box(segLen - 1.1, 0.9, 0.08), '#c8372d'), MM(P, M(0, 3.25, 0.37)));
    B.add('stoneDark', box(segLen + 0.02, 0.5, 0.8, 2), MM(P, M(0, 0.1, 0)));
    for (const [yy, hh] of [[4.1, 0.35], [7.6, 0.3], [H - 0.3, 0.4]]) B.add('ashlar', box(segLen + 0.04, hh, 1.0, 1.5), MM(P, M(0, yy, 0.05)));
    B.add('plasterCream', box(segLen, 1.0, 0.5, 2.4), MM(P, M(0, 4.75, 0.1)));                // antepecho galería
    B.add('plasterCream', box(segLen, 0.9, 0.5, 2.4), MM(P, M(0, 8.2, 0.1)));
    // balaustres en las dos galerías y rótulo de tendido sobre las puertas
    for (const yy of [5.25, 8.65]) { const nb = 7; for (let b = 0; b < nb; b++) B.add('plasterCream', new THREE.CylinderGeometry(0.07, 0.1, 0.62, 6), MM(P, M(-segLen / 2 + 0.85 + b * (segLen - 1.7) / (nb - 1), yy + 0.31, 0.3))); B.add('ashlar', box(segLen - 0.7, 0.14, 0.4), MM(P, M(0, yy + 0.68, 0.3))); }
    if (door) { S.add(MM(P, M(0, 3.45, 0.43)), 1.9, 0.42, plaque(['TENDIDO ' + (1 + (i / 4 | 0))], { bg: '#f4eee2', fg: '#8a2a1f', border: '#8a2a1f' })); B.add('iron', box(segLen - 1.3, 0.05, 0.08), MM(P, M(0, 2.0, 0.45))); }
    for (const k of [-1, 1]) {                                                                 // pilares a los lados de cada tramo
      const px = k * (segLen / 2 - 0.36);
      B.add('ashlar', box(0.95, 0.45, 1.1), MM(P, M(px, 0.22, 0.08)));
      for (const yy of [4.35, 7.85]) B.add('ashlar', box(0.92, 0.22, 1.1), MM(P, M(px, yy - 0.3, 0.08)));
      B.add('ashlar', box(0.95, 0.3, 1.15), MM(P, M(px, H - 0.65, 0.08)));
      B.add('plasterCream', box(0.75, H, 0.95, 2.4), MM(P, M(px, H / 2, 0.05)));
      B.add('plasterCream', box(0.14, 2.1, 0.14), MM(P, M(k * (segLen / 2 - 0.9), 10.9, 0.25, 0, 0, k * 0.55)));   // tornapuntas de la andanada
    }
    col(Math.sin(a) * R, Math.cos(a) * R, segLen, 1.2, a, { solidView: true });
  }
  { // anillo de cobre verde (arriba y por debajo), que vuela sobre la fachada
    const top = [[R + 3.2, H + 0.3], [R + 3.2, H + 2.1], [R - 1, H + 2.9], [R - 6.2, H + 3.3], [R - 6.2, H + 2.4]];
    const mk = (pts, color) => { const g = new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), 72).toNonIndexed(); g.computeVertexNormals(); B.add('lit', colored(g, color), F(M(0, 0, 0))); };
    mk([...top].reverse(), '#86b99c');
    mk([[R + 3.2, H + 0.3], [R - 6.2, H + 2.4]], '#7fae94');
    for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * Math.PI * 2; B.add('ashlar', new THREE.CylinderGeometry(0.17, 0.2, 4.6, 8), F(M(Math.sin(a) * 31.2, 12.3, Math.cos(a) * 31.2))); }
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
  for (let i = 0; i < 14; i++) { const a = (i + 0.5) / 14 * Math.PI * 2; if (Math.abs(wrap(a)) < 0.3) continue; const p = toW(cx, cz, ryG, Math.sin(a) * 41, Math.cos(a) * 41); lamp(B, p.x, p.z); }
  // rayas blancas del ruedo (las de los picadores, a 7 y 9 m de la barrera) y la boca del toril enfrente de la entrada
  for (const r of [RB - 7, RB - 9]) B.add('paint', colored(new THREE.RingGeometry(r - 0.06, r + 0.06, 72).rotateX(-Math.PI / 2), '#f4efe4'), F(M(0, 0.19, 0)));
  { const P = F(M(0, 0, -RB + 0.1, 0));
    B.add('paint', colored(box(2.6, 2.2, 0.16), '#6e1d18'), MM(P, M(0, 1.1, 0)));
    B.add('iron', box(2.7, 0.08, 0.2), MM(P, M(0, 0.6, 0.05))); B.add('iron', box(2.7, 0.08, 0.2), MM(P, M(0, 1.7, 0.05)));
    S.add(MM(P, M(0, 2.55, 0.1)), 1.8, 0.42, plaque(['TORIL'], { bg: '#f4eee2', fg: '#8a2a1f', border: '#8a2a1f' })); }
  // banderas de Navarra y de Pamplona sobre el anillo de cobre
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.25) / 8 * Math.PI * 2; if (Math.abs(wrap(a)) < 0.3) continue;
    const rr = R - 2.5, P = F(M(Math.sin(a) * rr, H + 2.9, Math.cos(a) * rr, a + Math.PI / 2));
    B.add('iron', new THREE.CylinderGeometry(0.06, 0.08, 4.2, 6), MM(P, M(0, 2.1, 0)));
    B.add('paint', colored(box(1.9, 1.2, 0.03), i % 2 ? '#c8202a' : '#f2ede3'), MM(P, M(1.0, 3.5, 0)));
    if (i % 2 === 0) B.add('paint', colored(box(0.5, 0.5, 0.04), '#c8202a'), MM(P, M(0.75, 3.5, 0)));     // Pamplona: blanca con el león
    else B.add('gold', box(0.5, 0.42, 0.04), MM(P, M(1.0, 3.5, 0)));                                     // Navarra: roja con las cadenas
  }
  // rótulo de la puerta del encierro y burladeros exteriores del callejón
  S.add(F(M(0, 6.15, R + 0.97)), 5.2, 0.5, letters('PUERTA DEL ENCIERRO', '#3a2a1c', { shadow: null, size: 0.7 }));
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
function quad(x0, z0, x1, z1, y0, y1, u0, u1, v0 = 0, v1 = 1) {
  const g = new THREE.BufferGeometry();
  const p = [x0, y0, z0, x1, y0, z1, x1, y1, z1, x0, y0, z0, x1, y1, z1, x0, y1, z0];
  const uv = [u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1];
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
  return g;
}
// anillo de cubierta entre dos rectángulos redondeados [semiancho, semifondo, radio]; la altura pasa de hA (dentro) a hB (fuera)
function rrect(sh, [hw, hd, r], hole = false) {
  const p = hole ? new THREE.Path() : sh;
  p.moveTo(-hw + r, -hd); p.lineTo(hw - r, -hd); p.absarc(hw - r, -hd + r, r, -Math.PI / 2, 0, false);
  p.lineTo(hw, hd - r); p.absarc(hw - r, hd - r, r, 0, Math.PI / 2, false);
  p.lineTo(-hw + r, hd); p.absarc(-hw + r, hd - r, r, Math.PI / 2, Math.PI, false);
  p.lineTo(-hw, -hd + r); p.absarc(-hw + r, -hd + r, r, Math.PI, Math.PI * 1.5, false);
  return p;
}
function rrSdf(x, z, [hw, hd, r]) { const qx = Math.abs(x) - (hw - r), qz = Math.abs(z) - (hd - r); return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r; }
function ringRoof(B, T, inner, outer, hA, hB, color, under = false, mat = 'paint') {
  const sh = new THREE.Shape(); rrect(sh, outer); sh.holes.push(rrect(null, inner, true));
  const g = new THREE.ShapeGeometry(sh, 6), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getY(i), a = Math.abs(rrSdf(x, z, inner)), b = Math.abs(rrSdf(x, z, outer));
    p.setXYZ(i, x, a < b ? hA : hB, z);
  }
  const idx = g.index.array;
  // la cara buena mira hacia arriba (o hacia abajo si es la parte de debajo)
  const up = !under;
  for (let i = 0; i < idx.length; i += 3) {
    const [a, b, c] = [idx[i], idx[i + 1], idx[i + 2]];
    const ux = p.getX(b) - p.getX(a), uz = p.getZ(b) - p.getZ(a), vx = p.getX(c) - p.getX(a), vz = p.getZ(c) - p.getZ(a);
    const ny = uz * vx - ux * vz;
    if ((ny > 0) !== up) { idx[i + 1] = c; idx[i + 2] = b; }
  }
  const ng = g.toNonIndexed(); ng.computeVertexNormals();
  B.add(mat, colored(ng, color), T);
}
// rectángulo redondeado [semiancho, semifondo, radio] como recorrido cerrado; todos tienen los mismos puntos, así que
// dos recorridos se unen punto a punto (para hacer bandas de cubierta)
function rrLoop([hw, hd, r], n = 10) {
  const P = [[hw, hd - r], [hw, -hd + r]];
  const arc = (ox, oz, a0) => { for (let i = 1; i <= n; i++) { const a = a0 - i / n * Math.PI / 2; P.push([ox + Math.cos(a) * r, oz + Math.sin(a) * r]); } };
  arc(hw - r, -hd + r, 0); P.push([-hw + r, -hd]); arc(-hw + r, -hd + r, -Math.PI / 2); P.push([-hw, hd - r]); arc(-hw + r, hd - r, Math.PI); P.push([hw - r, hd]); arc(hw - r, hd - r, Math.PI / 2);
  return P;
}
// chapa de cubierta vista desde arriba: juntas alzadas cada metro que bajan hacia fuera, paneles de tono algo distinto,
// la junta de solape y manchas de agua (losa de 6 × 6 m que se repite)
function roofSheetTex(base, light, dark) {
  const t = canvasTex(96, 96, (g, W, H) => {
    g.fillStyle = base; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(W / 2, 0, W / 2, H);
    g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(0, 0, W / 6, H);
    for (let x = 0; x < W; x += 16) { g.fillStyle = light; g.fillRect(x, 0, 2, H); g.fillStyle = dark; g.fillRect(x + 2, 0, 1, H); }
    g.fillStyle = dark; g.fillRect(0, H * 0.62, W, 1);
    let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(30,20,20,${0.03 + rnd() * 0.05})`; g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 3, 6 + rnd() * 26); }
  }, true);
  t.wrapT = THREE.RepeatWrapping;
  return t;
}
// banda de cubierta entre dos recorridos (dentro a la altura hA, fuera a hB) con las juntas en la línea de máxima
// pendiente; la cara buena mira hacia arriba
function sheetBand(T, inner, outer, hA, hB, tileM = 6) {
  const A = rrLoop(inner), O = rrLoop(outer), pos = [], uv = [];
  let sa = 0, so = 0;
  for (let i = 0; i < A.length; i++) {
    const j = (i + 1) % A.length, la = Math.hypot(A[j][0] - A[i][0], A[j][1] - A[i][1]), lo = Math.hypot(O[j][0] - O[i][0], O[j][1] - O[i][1]);
    const ri = Math.hypot(O[i][0] - A[i][0], O[i][1] - A[i][1]), rj = Math.hypot(O[j][0] - A[j][0], O[j][1] - A[j][1]);
    const a = [A[i][0], hA, A[i][1]], b = [A[j][0], hA, A[j][1]], c = [O[j][0], hB, O[j][1]], d = [O[i][0], hB, O[i][1]];
    const ta = [sa / tileM, 0], tb = [(sa + la) / tileM, 0], tc = [(so + lo) / tileM, rj / tileM], td = [so / tileM, ri / tileM];
    const up = (b[2] - a[2]) * (d[0] - a[0]) - (b[0] - a[0]) * (d[2] - a[2]) > 0;
    const V = up ? [a, b, c, a, c, d] : [a, c, b, a, d, c], U = up ? [ta, tb, tc, ta, tc, td] : [ta, tc, tb, ta, td, tc];
    for (const v of V) pos.push(...v); for (const t of U) uv.push(...t);
    sa += la; so += lo;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals(); return g.applyMatrix4(T);
}
// alrededores de El Sadar, para verlo desde arriba y a pie de calle (sin calles ni coches, como en el resto del juego):
// acera alrededor del zócalo, la explanada adoquinada de la entrada oeste y un paseo ancho al este, con farolas; al
// norte y al sur, césped. Los árboles (hileras en la explanada, el paseo y el césped) se plantan con los demás árboles
// del pueblo (SPECIAL_TREES, en levels/town.js)
function sadarSurroundings(B, group, cx, cz, FH, FD) {
  const gyL = (x, z) => terrainHeight(cx + x, cz + z);
  // adoquín de losas de 50 cm en tonos de piedra, con una banda de granito oscuro cada 8 m (losa de 8 × 8 m)
  const paveT = canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#a9a398'; g.fillRect(0, 0, W, H);
    let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let y = 0; y < H; y += 16) for (let x = 0; x < W; x += 16) { const k = rnd(); g.fillStyle = `rgb(${160 + k * 30},${153 + k * 28},${142 + k * 26})`; g.fillRect(x + 1, y + 1, 14, 14); }
    g.fillStyle = '#7d786f'; g.fillRect(0, 0, W, 12); g.fillRect(0, 0, 12, H);
    g.fillStyle = 'rgba(255,255,255,.08)'; for (let x = 0; x < W; x += 13) g.fillRect(x, 0, 1, 12);
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(50,45,40,${rnd() * 0.14})`; g.fillRect(rnd() * W, rnd() * H, 1, 1); }
  }, true);
  paveT.wrapT = THREE.RepeatWrapping;
  // trozo de suelo que sigue el terreno (uv en metros / losa)
  const patch = (x0, z0, x1, z1, tileM, lift) => {
    const nx = Math.max(1, Math.ceil((x1 - x0) / 8)), nz = Math.max(1, Math.ceil((z1 - z0) / 8));
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz).rotateX(-Math.PI / 2), p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) + (x0 + x1) / 2, z = p.getZ(i) + (z0 + z1) / 2; p.setXYZ(i, cx + x, gyL(x, z) + lift, cz + z); uv.setXY(i, x / tileM, z / tileM); }
    g.computeVertexNormals(); return g;
  };
  const PW = 28;   // ancho del paseo del este
  const geos = [patch(-FH - 48, -FD - 8, -FH, FD + 8, 8, 0.05), patch(FH, -FD - 8, FH + PW, FD + 8, 8, 0.05), patch(-FH, -FD - 8, FH, -FD, 8, 0.05), patch(-FH, FD, FH, FD + 8, 8, 0.05)];
  const m = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ map: paveT, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  m.receiveShadow = true; m.matrixAutoUpdate = false; group.add(m); geos.forEach(g => g.dispose());
  // farolas a lo largo del paseo
  for (let z = -FD + 2; z <= FD - 2; z += 18) { const p = toW(cx, cz, 0, FH + PW / 2, z); lamp(B, p.x, p.z); }
  // bancos de madera, papeleras y jardineras en el paseo, en la acera y en la explanada (sin tapar las puertas)
  const yL = (x, z) => gyL(x, z) + 0.05;
  const bench = (x, z, ry) => {
    const T = M(cx + x, yL(x, z), cz + z, ry);
    B.add('woodDark', box(1.8, 0.08, 0.5), MM(T, M(0, 0.45, 0))); B.add('woodDark', box(1.8, 0.4, 0.07), MM(T, M(0, 0.72, -0.23)));
    for (const s of [-1, 1]) B.add('iron', box(0.08, 0.45, 0.45), MM(T, M(s * 0.8, 0.22, 0)));
    addBox(cx + x, cz + z, 1.8, 0.6, ry);
  };
  const bin = (x, z) => { B.add('paint', colored(new THREE.CylinderGeometry(0.25, 0.22, 0.85, 10), '#3d5a3a'), M(cx + x, yL(x, z) + 0.42, cz + z)); addCircle(cx + x, cz + z, 0.3); };
  const planter = (x, z, ry) => {
    const T = M(cx + x, yL(x, z), cz + z, ry);
    B.add('stone', box(2.4, 0.55, 1.2), MM(T, M(0, 0.27, 0))); B.add('paint', colored(new THREE.SphereGeometry(0.75, 10, 8).scale(1.4, 0.55, 0.75), '#4a7a34'), MM(T, M(0, 0.72, 0)));
    addBox(cx + x, cz + z, 2.4, 1.2, ry);
  };
  for (let z = -FD + 11; z <= FD - 11; z += 18) { bench(FH + 9, z, -Math.PI / 2); bench(FH + PW - 3, z, Math.PI / 2); bin(FH + PW / 2, z + 4); }
  for (const s of [-1, 1]) for (let x = -FH + 8; x <= FH - 8; x += 16) { (Math.abs(x) % 32 < 16 ? planter : bench)(x, s * (FD + 4.5), s > 0 ? Math.PI : 0); }
  for (let z = -FD + 6; z <= FD - 6; z += 12) if (Math.abs(z) > 22) { const k = Math.round(z / 12) % 2; k ? bench(-FH - 27, z, Math.PI / 2) : planter(-FH - 27, z, Math.PI / 2); bin(-FH - 39, z); }
  noGrass((x, z) => (x > cx - FH - 50 && x < cx + FH + PW + 1 && Math.abs(z - cz) < FD + 9), cx - FH - 52, cz - FD - 10, cx + FH + PW + 2, cz + FD + 10);
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
  // gradas: escalones de hormigón con un asiento rojo con respaldo en cada plaza (en la grada este, OSASUNA escrito
  // con asientos blancos), vomitorios a media altura y barandilla delante; en calidad baja, escalones pintados de rojo
  const RED = ['#b8202b', '#a61b26'], WHITE = '#f1f1ef', NAVY = '#1f2d5a', CON = ['#a3a29c', '#97968f'];
  const seats = builderQuality() !== 'low', SEAT = 0.5;
  const word = 'OSASUNA', px = 1.5, cols = word.length * 6 - 1, zText0 = -cols * px / 2;
  const pixel = (k, z) => {
    if (k < 3 || k > 16) return false;
    const br = 6 - Math.floor((k - 3) / 2), c = Math.floor((z - zText0) / px);
    if (c < 0 || c >= cols || c % 6 === 5) return false;
    return FONT5[word[Math.floor(c / 6)]][br][c % 6] === '#';
  };
  const rowColor = (k) => k >= 18 ? NAVY : RED[k % 2];
  // vomitorios: bocas de acceso a media grada (filas 7 a 9), cada 24 m en los laterales y en el centro de los fondos
  const VOM = [], vomAt = (side, along) => VOM.push({ side, along });
  for (const z of [-36, -12, 12, 36]) { vomAt(1, z); if (Math.abs(z) > GAP + 3) vomAt(-1, z); }
  for (const s of [-1, 1]) vomAt(s * 2, 0);
  const inVom = (side, k, along) => k >= 7 && k <= 9 && VOM.some(v => v.side === side && Math.abs(v.along - along) < 1.5);
  const seatList = [];   // [x, y, z, ry, color]
  const sideRow = (s, k, z0, z1, text) => {
    const x0 = SX + k * run, dx = OX - x0, h = 1 + (k + 1) * rise;
    B.add(seats ? 'paint' : 'seat', colored(box(dx, h, z1 - z0, 2), seats ? CON[k % 2] : rowColor(k)), F(M(s * (x0 + dx / 2), h / 2 - 0.5, (z0 + z1) / 2)));
    for (let z = z0 + SEAT / 2; z < z1; z += SEAT) {
      if (inVom(s, k, z) || Math.abs(((z % 12) + 12) % 12 - 0) < 0.7) continue;   // vomitorios y escaleras (cada 12 m)
      seatList.push([s * (x0 + run * 0.62), h - 0.5, z, s > 0 ? -Math.PI / 2 : Math.PI / 2, text && pixel(k, z) ? WHITE : rowColor(k)]);
    }
  };
  for (let k = 0; k < ROWS; k++) {
    sideRow(1, k, -OZ, OZ, true);
    sideRow(-1, k, -OZ, -GAP, false); sideRow(-1, k, GAP, OZ, false);
    for (const s of [-1, 1]) {
      const z0 = SZ + k * run, dz = OZ - z0, h = 1 + (k + 1) * rise;
      B.add(seats ? 'paint' : 'seat', colored(box(2 * SX, h, dz, 2), seats ? CON[k % 2] : rowColor(k)), F(M(0, h / 2 - 0.5, s * (z0 + dz / 2))));
      for (let x = -SX + SEAT / 2; x < SX; x += SEAT) {
        if (inVom(s * 2, k, x) || Math.abs(((x + 18) % 12 + 12) % 12) < 0.7) continue;
        seatList.push([x, h - 0.5, s * (z0 + run * 0.62), s > 0 ? Math.PI : 0, rowColor(k)]);
      }
    }
  }
  // las plazas, para sentar al público del partido en sus asientos
  TOWN.sadarSeats = seatList.map(([x, yy, z, ry]) => [cx + x, y + yy, cz + z, ry]);
  if (seats) {
    // asiento de plástico: cubeta con respaldo algo inclinado y su pata (unos 30 triángulos)
    const sg = mergeGeometries([
      new THREE.BoxGeometry(0.44, 0.06, 0.36).translate(0, 0.42, 0.02),
      new THREE.BoxGeometry(0.44, 0.4, 0.05).rotateX(-0.12).translate(0, 0.64, -0.17),
      new THREE.BoxGeometry(0.1, 0.4, 0.22).translate(0, 0.2, -0.02),
    ].map(g => g.toNonIndexed()));
    // un grupo por grada, para que cada uno se descarte si no está a la vista y de lejos no se dibuje
    const groups = new Map();
    for (const st of seatList) { const key = Math.abs(st[0]) > SX + 0.1 ? (st[0] > 0 ? 'e' : 'w') : (st[2] > 0 ? 's' : 'n'); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(st); }
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 }), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1), col = new THREE.Color();
    for (const list of groups.values()) {
      const im = new THREE.InstancedMesh(sg, mat, list.length);
      list.forEach(([x, yy, z, ry, c], i) => { im.setMatrixAt(i, m4.compose(v.set(cx + x, y + yy, cz + z), q.setFromEuler(e.set(0, ry, 0)), sc)); im.setColorAt(i, col.set(c)); });
      im.computeBoundingSphere(); im.receiveShadow = true; im.name = 'asientos'; group.add(im);
      DETAIL.push({ m: im, tier: 2, c: im.boundingSphere.center.clone(), r: im.boundingSphere.radius });   // solo de cerca (de lejos no se distinguen)
    }
    // vomitorios: boca oscura con dintel, laterales y barandilla
    for (const vv of VOM) {
      const ends = Math.abs(vv.side) === 2, s = Math.sign(vv.side), k = 7, base0 = SX + k * run, h7 = 1 + (k + 1) * rise - 0.5;
      const g0 = ends ? M(vv.along, h7 + 0.9, s * (SZ + k * run + run * 1.5)) : M(s * (base0 + run * 1.5), h7 + 0.9, vv.along);
      B.add('dark', ends ? box(2.6, 1.9, run * 3) : box(run * 3, 1.9, 2.6), F(g0));
      const lint = ends ? M(vv.along, h7 + 1.95, s * (SZ + k * run + run * 1.5)) : M(s * (base0 + run * 1.5), h7 + 1.95, vv.along);
      B.add('paint', colored(ends ? box(3.0, 0.22, run * 3.1) : box(run * 3.1, 0.22, 3.0), '#d9dcdf'), F(lint));
      for (const t of [-1, 1]) {
        const pos = ends ? M(vv.along + t * 1.4, h7 + 1.0, s * (SZ + k * run + run * 1.5)) : M(s * (base0 + run * 1.5), h7 + 1.0, vv.along + t * 1.4);
        B.add('iron', ends ? box(0.06, 1.0, run * 3) : box(run * 3, 1.0, 0.06), F(pos));
      }
    }
    // barandilla de cristal y tubo sobre el muro de la primera fila
    for (const s of [-1, 1]) {
      B.add('glass', box(0.04, 0.9, 2 * OZ - (s < 0 ? 0 : 0)), F(M(s * (SX + 0.02), 1.45, 0)));
      B.add('iron', box(0.07, 0.07, 2 * OZ), F(M(s * (SX + 0.02), 1.92, 0)));
      B.add('glass', box(2 * SX, 0.9, 0.04), F(M(0, 1.45, s * (SZ + 0.02))));
      B.add('iron', box(2 * SX, 0.07, 0.07), F(M(0, 1.92, s * (SZ + 0.02))));
    }
  }
  // cubierta roja de esquinas redondeadas que baja hacia fuera, con la banda blanca alrededor del hueco
  // (la cubierta acaba justo por dentro del anillo rojo de la fachada)
  const RING = [OX + 5, OZ + 5, 15], RIN = [26, 39, 9], RMID = [30, 43, 12], ROUT = [RING[0] - 0.4, RING[1] - 0.4, RING[2] - 0.4], hIn = HH + 3.6, hOut = HH + 0.4;
  // por arriba, chapa: blanca alrededor del hueco y roja hasta el anillo (con sus juntas y algún panel de otro tono)
  for (const [a, b, ha, hb, tex] of [[RIN, RMID, hIn + 0.1, hIn, roofSheetTex('#efefeb', '#ffffff', '#c9cac6')], [RMID, ROUT, hIn, hOut, roofSheetTex('#c41f2c', '#d9434d', '#8f1620')]]) {
    const m = new THREE.Mesh(sheetBand(T, a, b, ha, hb), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.1 }));
    m.castShadow = true; m.receiveShadow = true; m.matrixAutoUpdate = false; group.add(m);
  }
  ringRoof(B, T, RIN, ROUT, hIn - 0.5, hOut - 0.4, '#b9bec4', true, 'lit');
  for (const s of [-1, 1]) {
    B.add('paint', colored(box(0.5, 1.2, 2 * OZ - 6), '#3a3f45'), F(M(s * 27.6, hIn - 0.9, 0)));
    // OSASUNA pintado en el tejado sobre los dos fondos (como en las fotos aéreas), a lo ancho del estadio
    const fr = 0.5, h = hIn + (hOut - hIn) * fr + 0.12, sl = Math.atan2(hIn - hOut, ROUT[1] - RMID[1]);
    const u = new THREE.Vector3(s, 0, 0), v = new THREE.Vector3(0, Math.sin(sl), -s * Math.cos(sl)), nrm = new THREE.Vector3().crossVectors(u, v);
    const Mx = new THREE.Matrix4().makeBasis(u, v, nrm).setPosition(cx, y + h, cz + s * (RMID[1] + (ROUT[1] - RMID[1]) * fr));
    S.add(Mx, 46, 6.2, letters('OSASUNA', '#ffffff', { font: FONT_ROUND, weight: '900', shadow: null, size: 0.82 }), { ppm: 26 });
    if (s > 0) B.add('lit', colored(box(0.36, HH + 5.5, 2 * OZ + 0.7), '#6a7078'), F(M(OX + 0.18, HH / 2 - 2.25, 0)));
    B.add('lit', colored(box(0.36, HH + 5.5, OZ + 0.35 - GAP), '#6a7078'), F(M(-(OX + 0.18), HH / 2 - 2.25, s * (OZ + 0.35 + GAP) / 2)));
    B.add('lit', colored(box(2 * OX, HH + 5.5, 0.36), '#6a7078'), F(M(0, HH / 2 - 2.25, s * (OZ + 0.18))));
  }
  // la pared oeste necesita el hueco de la entrada: se tapa con dos paños y un dintel encima (la caja de arriba se sustituye)
  B.add('paint', colored(box(0.36, HH + 0.5 - 5.2, 2 * GAP + 0.2), '#3a3f45'), F(M(-(OX + 0.18), 5.2 + (HH + 0.5 - 5.2) / 2, 0)));
  // EL SADAR por fuera (proyecto «Muro Rojo», 2021): dos piezas que se contraponen. Abajo, un zócalo rectangular de
  // esquinas vivas forrado de chapa grecada perforada oscura, opaco de día; de noche, con la luz de dentro, se leen
  // EL SADAR y OSASUNA a través de los agujeros y todo él brilla en rojo. Encima, un anillo ovalado de chapa grecada roja
  // que parece flotar: vuela por delante del zócalo y, en las esquinas, las del zócalo asoman por fuera de sus curvas
  const FH = OX + 3, FD = OZ + 3, y0 = -4.5, yB = 9, yR0 = 9.9, yR1 = hOut + 0.8;
  const T0 = new THREE.Matrix4().makeTranslation(cx, y, cz);
  // recorrido en el sentido que deja las caras mirando hacia fuera: este (hacia −z), norte, oeste y sur
  const rrPath = ([hw, hd, r], n = 10) => {
    const P = [[hw, hd - r], [hw, -hd + r]];
    const arc = (ox, oz, a0) => { for (let i = 1; i <= n; i++) { const a = a0 - i / n * Math.PI / 2; P.push([ox + Math.cos(a) * r, oz + Math.sin(a) * r]); } };
    arc(hw - r, -hd + r, 0); P.push([-hw + r, -hd]); arc(-hw + r, -hd + r, -Math.PI / 2); P.push([-hw, hd - r]); arc(-hw + r, hd - r, Math.PI); P.push([hw - r, hd]); arc(hw - r, hd - r, Math.PI / 2);
    return P;
  };
  const strip = (path, ya, yb, gapAt = null) => {
    const out = []; let u = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const [ax, az] = path[i], [bx, bz] = path[i + 1], l = Math.hypot(bx - ax, bz - az), g = gapAt?.(ax, az, bx, bz);
      out.push(quad(ax, az, bx, bz, g ?? ya, yb, u, u + l, (g ?? ya) - ya, yb - ya).applyMatrix4(T0)); u += l;
    }
    return mergeGeometries(out);
  };
  const night = (m, day, nite) => { m.userData.night = [day, nite]; m.emissiveIntensity = day; (B.mats.nightExtra ||= []).push(m); return m; };
  // chapa grecada perforada: pliegues verticales cada 25 cm y una trama fina de agujeros (losa de 2 × 2 m que se repite)
  const perf = canvasTex(128, 128, (g, W, H) => {
    g.fillStyle = '#656c74'; g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 16) { g.fillStyle = '#7a828b'; g.fillRect(x, 0, 6, H); g.fillStyle = '#454a51'; g.fillRect(x + 6, 0, 2, H); g.fillStyle = '#5a6068'; g.fillRect(x + 14, 0, 2, H); }
    g.fillStyle = 'rgba(16,18,22,.6)'; for (let yy = 1; yy < H; yy += 4) for (let x = (yy >> 2) % 2 * 2; x < W; x += 4) g.fillRect(x, yy, 1, 1);
  }, true);
  perf.wrapT = THREE.RepeatWrapping; perf.repeat.set(0.5, 0.5);
  // luz de dentro a través de la chapa: el rojo de Osasuna y las letras (en las caras largas EL SADAR; en los fondos OSASUNA)
  const glow = (len, word) => {
    const t = canvasTex(1024, 128, (g, W, H) => {
      const hz = yB - y0, vy = (h) => H * (1 - (h - y0) / hz);
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      const gr = g.createLinearGradient(0, vy(yB), 0, vy(0)); gr.addColorStop(0, '#5a0a10'); gr.addColorStop(1, '#2a0408'); g.fillStyle = gr; g.fillRect(0, vy(yB), W, vy(0) - vy(yB));
      // pilares de la estructura de las gradas: franjas en sombra
      for (let m = 4; m < len; m += 8) { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(m / len * W, vy(yB), Math.max(2, 0.8 / len * W), vy(0) - vy(yB)); }
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffd2d2';
      // (el lienzo no tiene los mismos píxeles por metro a lo ancho que a lo alto: se corrige para que no se deformen)
      const k = W * hz / (len * H);
      g.save(); g.scale(k, 1); fitText(g, word, W / 2 / k, (vy(8.2) + vy(4.2)) / 2, W * 0.42 / k, vy(4.2) - vy(8.2), FONT_ROUND, '900'); g.restore();
    });
    t.wrapS = THREE.ClampToEdgeWrapping; t.repeat.set(1 / len, 1 / (yB - y0));
    return t;
  };
  const baseMat = (len, word) => night(new THREE.MeshStandardMaterial({ map: perf, roughness: 0.6, metalness: 0.15, emissive: new THREE.Color('#ffffff'), emissiveMap: glow(len, word) }), 0.06, 1.25);
  const sides = [
    { path: [[FH, FD], [FH, -FD]], len: 2 * FD, word: 'EL SADAR' },
    { path: [[FH, -FD], [-FH, -FD]], len: 2 * FH, word: 'OSASUNA' },
    { path: [[-FH, -FD], [-FH, -GAP], [-FH, GAP], [-FH, FD]], len: 2 * FD, word: 'EL SADAR' },
    { path: [[-FH, FD], [FH, FD]], len: 2 * FH, word: 'OSASUNA' },
  ];
  for (const sd of sides) {
    const g = strip(sd.path, y0, yB, (ax, az, bx, bz) => ax === -FH && Math.abs(az + GAP) < 0.01 && Math.abs(bz - GAP) < 0.01 ? 5.2 : null);   // hueco de la entrada oeste
    const m = new THREE.Mesh(g, baseMat(sd.len, sd.word)); m.castShadow = true; m.receiveShadow = true; m.matrixAutoUpdate = false; group.add(m);
  }
  // remate del zócalo (se ve en las esquinas, por fuera del anillo)
  { const sh = new THREE.Shape(); sh.moveTo(-FH, -FD); sh.lineTo(FH, -FD); sh.lineTo(FH, FD); sh.lineTo(-FH, FD); sh.lineTo(-FH, -FD);
    const hole = new THREE.Path(); hole.moveTo(-OX, -OZ); hole.lineTo(-OX, OZ); hole.lineTo(OX, OZ); hole.lineTo(OX, -OZ); hole.lineTo(-OX, -OZ); sh.holes.push(hole);
    B.add('paint', colored(new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2).translate(0, yB, 0), '#2c3036'), T); }
  // entre el zócalo y el anillo, una franja en sombra: el anillo parece flotar
  for (const s of [-1, 1]) {
    B.add('paint', colored(box(0.3, yR0 - yB + 0.8, 2 * OZ + 1.5), '#1c1f23'), F(M(s * (OX + 0.75), (yB + yR0) / 2, 0)));
    B.add('paint', colored(box(2 * OX + 1.5, yR0 - yB + 0.8, 0.3), '#1c1f23'), F(M(0, (yB + yR0) / 2, s * (OZ + 0.75))));
  }
  // anillo rojo: chapa grecada (pliegues verticales), con su panza por debajo y el canto de arriba
  const red = canvasTex(64, 64, (g, W, H) => {
    g.fillStyle = '#c41f2c'; g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 16) { g.fillStyle = '#d93441'; g.fillRect(x, 0, 5, H); g.fillStyle = '#9c1620'; g.fillRect(x + 9, 0, 3, H); g.fillStyle = '#b01a26'; g.fillRect(x + 12, 0, 4, H); }
  }, true);
  red.repeat.set(1, 1 / (yR1 - yR0));
  { const m = new THREE.Mesh(strip(rrPath(RING), yR0, yR1), night(new THREE.MeshStandardMaterial({ map: red, roughness: 0.55, metalness: 0.05, emissive: new THREE.Color('#c41f2c') }), 0.2, 0.5));   // (algo de luz propia: en sombra sigue leyéndose rojo)
    m.castShadow = true; m.receiveShadow = true; m.matrixAutoUpdate = false; group.add(m); }
  { const sh = new THREE.Shape(); rrect(sh, RING); sh.holes.push(rrect(null, [OX, OZ, 3], true));
    B.add('paint', colored(new THREE.ShapeGeometry(sh, 8).rotateX(Math.PI / 2).translate(0, yR0, 0), '#7a121b'), T); }
  ringRoof(B, T, ROUT, RING, yR1, yR1, '#a8141f');
  // pasillo de entrada entre la fachada y la grada oeste
  for (const s of [-1, 1]) { B.add('paint', colored(box(FH - OX, 5.4, 0.3), '#3a3f45'), F(M(-(OX + FH) / 2, 2.2, s * (GAP + 0.15)))); addBox(cx - (OX + FH) / 2, cz + s * (GAP + 0.15), FH - OX, 0.4, 0); }
  B.add('paint', colored(box(FH - OX, 0.3, 2 * GAP + 0.6), '#3a3f45'), F(M(-(OX + FH) / 2, 5.2, 0)));
  for (const [x0, z0, x1, z1] of [[FH, -FD, FH, FD], [-FH, -FD, FH, -FD], [-FH, FD, FH, FD], [-FH, -FD, -FH, -GAP], [-FH, GAP, -FH, FD]]) {
    const w = Math.abs(x1 - x0) || 0.8, d = Math.abs(z1 - z0) || 0.8; addBox(cx + (x0 + x1) / 2, cz + (z0 + z1) / 2, w, d, 0, { solidView: true });
  }
  // escaleras grises entre sectores, banquillos, videomarcadores y focos bajo la cubierta
  const stairs = (x0, z0, alongX, s, len) => { for (let k = 0; k < ROWS; k++) { const h = 1 + (k + 1) * rise; if (alongX) B.add('paint', colored(box(1.2, 0.06, run), '#9a9fa6'), F(M(x0, h - 0.47, s * (z0 + (k + 0.5) * run)))); else B.add('paint', colored(box(run, 0.06, 1.2), '#9a9fa6'), F(M(s * (x0 + (k + 0.5) * run), h - 0.47, z0))); } };
  for (const s of [-1, 1]) {
    for (let z = -48; z <= 48; z += 12) if (!(s < 0 && Math.abs(z) < GAP + 1)) stairs(SX, z, false, s);
    for (let x = -18; x <= 18; x += 12) stairs(x, SZ, true, s);
    B.add('paint', colored(box(0.1, 1.0, 2 * OZ), '#dfe3e6'), F(M(s * (SX - 0.05), 0.5, 0)));
    B.add('paint', colored(box(2 * SX, 1.0, 0.1), '#dfe3e6'), F(M(0, 0.5, s * (SZ - 0.05))));
    // banquillos al oeste, a los lados del túnel
    const bz = s * 9;
    B.add('paint', colored(box(1.6, 0.5, 7), '#2b2f36'), F(M(-SX + 1.4, 0.25, bz)));
    B.add('paint', colored(box(0.5, 0.9, 7), '#c41f2c'), F(M(-SX + 0.9, 0.75, bz)));
    B.add('glass', box(2.2, 0.06, 7.4), F(M(-SX + 1.3, 2.3, bz, 0, 0, 0.12)));
    B.add('paint', colored(box(0.08, 2.2, 7.4), '#9aa2aa'), F(M(-SX + 2.4, 1.2, bz)));
    addBox(cx - SX + 1.3, cz + bz, 2.4, 7.4, 0);
    // videomarcador colgado en cada fondo
    const vz = s * (RIN[1] + 1.2);
    B.add('paint', colored(box(11, 4.6, 0.8), '#1c2027'), F(M(0, hIn - 3.4, vz)));
    S.add(F(M(0, hIn - 3.4, vz - s * 0.42, s > 0 ? Math.PI : 0)), 10.2, 4.0, (g, W, H) => {
      g.fillStyle = '#05070b'; g.fillRect(0, 0, W, H); g.fillStyle = '#c41f2c'; g.fillRect(0, 0, W, H * 0.3);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; fitText(g, 'EL SADAR · IRUÑA', W / 2, H * 0.16, W * 0.9, H * 0.2, FONT_ROUND, '900');
      g.fillStyle = '#f2c230'; fitText(g, 'OSASUNA  0 - 0', W / 2, H * 0.6, W * 0.9, H * 0.36, FONT_ROUND, '900');
      g.fillStyle = '#9fe0ff'; fitText(g, "45'", W / 2, H * 0.88, W * 0.3, H * 0.16, FONT_ROUND, '900');
    });
    // línea de focos en el borde de la cubierta
    for (let z = -34; z <= 34; z += 4) B.add('lamp', box(0.6, 0.3, 1.2), F(M(s * (RIN[0] + 0.6), hIn - 0.35, z)));
    for (let x = -18; x <= 18; x += 4) B.add('lamp', box(1.2, 0.3, 0.6), F(M(x, hIn - 0.35, s * (RIN[1] + 0.6))));
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
  // exterior: explanada de la entrada oeste con taquillas, puertas de acceso numeradas, la tienda del club,
  // mástiles con banderas y farolas
  {
    const ex = -FH - 0.2;
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
      const z = s * (9 + k * 9), gate = k === 1;
      if (gate) {   // puerta de acceso: hueco oscuro con tornos y su número encima
        B.add('dark', box(0.2, 3.2, 4.2), F(M(ex - 0.1, 1.6, z)));
        for (let t = -1; t <= 1; t++) B.add('iron', box(0.5, 1.0, 0.08), F(M(ex - 0.5, 0.5, z + t * 1.2)));
        S.add(F(M(ex - 0.25, 3.7, z, -Math.PI / 2)), 3.6, 0.7, plaque([`PUERTA ${s < 0 ? 1 : 2} · ${s < 0 ? 1 : 2}. ATEA`], { bg: '#c41f2c', fg: '#ffffff', border: '#ffffff' }));
      } else {      // taquilla
        B.add('paint', colored(box(2.0, 2.7, 2.6), '#f1f1ef'), F(M(ex - 1.2, 1.35, z)));
        B.add('paint', colored(box(2.06, 0.5, 2.66), '#c41f2c'), F(M(ex - 1.2, 2.55, z)));
        B.add('glass', box(0.06, 0.9, 1.6), F(M(ex - 2.23, 1.45, z)));
        S.add(F(M(ex - 2.27, 2.55, z, -Math.PI / 2)), 2.4, 0.42, plaque(['TAQUILLAS · LEIHATILAK'], { bg: '#c41f2c', fg: '#ffffff', border: '#c41f2c' }));
        addBox(cx + ex - 1.2, cz + z, 2.1, 2.7, 0);
      }
    }
    // tienda del club en la esquina suroeste
    const tz = FD - 16;
    B.add('glass', box(0.1, 3.2, 9), F(M(ex - 0.1, 1.6, tz)));
    B.add('paint', colored(box(0.4, 0.9, 9.4), '#c41f2c'), F(M(ex - 0.25, 3.6, tz)));
    S.add(F(M(ex - 0.47, 3.6, tz, -Math.PI / 2)), 7.6, 0.75, letters('DENDA · TIENDA OSASUNA', '#ffffff', { font: FONT_ROUND, weight: '900', shadow: null, size: 0.72 }));
    // mástiles: Osasuna (rojo y azul marino), Pamplona y Navarra
    [['#c41f2c', '#1f2d5a'], ['#f2ede3', '#c8202a'], ['#c8202a', '#e0b43a'], ['#c41f2c', '#1f2d5a']].forEach(([c1, c2], i) => {
      const fx = ex - 14, fz = -12 + i * 8;
      B.add('iron', new THREE.CylinderGeometry(0.08, 0.11, 9, 8), F(M(fx, 4.5, fz)));
      B.add('paint', colored(box(0.04, 1.5, 2.4), c1), F(M(fx, 7.9, fz + 1.25)));
      B.add('paint', colored(box(0.05, 0.5, 2.4), c2), F(M(fx, 7.4, fz + 1.25)));
      addCircle(cx + fx, cz + fz, 0.25);
    });
    // farolas a lo largo de la explanada
    for (let z = -40; z <= 40; z += 13) { const p = toW(cx, cz, 0, ex - 8, z); lamp(B, p.x, p.z); }
  }
  // colisiones: gradas (hasta el muro) y el hueco de entrada al oeste
  addBox(cx + (SX + OX + 0.6) / 2, cz, OX + 0.6 - SX, 2 * OZ + 1, 0, { solidView: true });
  addBox(cx - (SX + OX + 0.6) / 2, cz - (GAP + OZ + 0.6) / 2, OX + 0.6 - SX, OZ + 0.6 - GAP, 0, { solidView: true });
  addBox(cx - (SX + OX + 0.6) / 2, cz + (GAP + OZ + 0.6) / 2, OX + 0.6 - SX, OZ + 0.6 - GAP, 0, { solidView: true });
  for (const s of [-1, 1]) addBox(cx, cz + s * (SZ + OZ + 0.6) / 2, 2 * SX, OZ + 0.6 - SZ, 0, { solidView: true });
  sadarSurroundings(B, group, cx, cz, OX + 3, OZ + 3);
  TOWN.houses.push({ x: cx, z: cz, ry: 0, w: 2 * OX, d: 2 * OZ, top: y + HH + 2 });
  return { x: cx - 16, z: cz + 6 };
}
