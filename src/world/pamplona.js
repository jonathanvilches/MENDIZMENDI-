// Pamplona / Iruña con su disposición real y sus monumentos, modelados a mano para el juego (norte = −z):
// plaza del Castillo con el kiosco y los soportales (Café Iruña, Hotel La Perla), Ayuntamiento, Palacio de Navarra,
// calle Estafeta, catedral de Santa María con su claustro, murallas con el Portal de Francia y el Redín,
// plaza de toros, Ciudadela y estadio de El Sadar.
import * as THREE from 'three';
import { box, gable, archRing, archPanel, colored, M, MM } from './builder.js';
import { roofHip } from './houses.js';
import { terrainHeight, SURF, addPlatform } from './heightfield.js';
import { addBox, addCircle, isFree } from './colliders.js';
import { PATHS, PLACES, HALF, CELL, N } from './layout.js';
import { bench, VILLAGE } from './village.js';
import { Signs, cityBlock, winDoor, pointedPanel, archedWall, balustrade, statue, navarraFlag, plaque, shopSign, letters, toW, fitText, roundRect, FONT_SERIF } from './civic.js';
import { bullring, walls, citadel, stadium } from './pamplonaOut.js';

const gy = terrainHeight;
const PAL = ['plasterOcher', 'plasterCream', 'plasterRose', 'plasterBlue', 'plaster', 'plasterOcher', 'plasterCream', 'plasterRose'];
const SHUT = ['#3e6b48', '#6d5231', '#2f4f6e', '#e9e3d6', '#7b3f2a'];
const SHOPC = ['#5b3a26', '#2f4f6e', '#3e6b48', '#7b2d2d', '#1f2a3a', '#6b5a2e', '#8a6a2a'];
const SHOPS = [['PANADERÍA', '#8a5a2b'], ['ALPARGATAS', '#2f4f6e'], ['RECUERDOS', '#b3202a'], ['PASTELERÍA', '#7a3b6b'], ['BAR TXOKO', '#3e6b48'], ['LIBRERÍA', '#1f2a3a'],
  ['ULTRAMARINOS', '#6b5a2e'], ['FARMACIA', '#2f7d4a'], ['CHOCOLATES', '#5b3a26'], ['PAÑUELOS', '#b3202a'], ['ZAPATERÍA', '#4a4f5a'], ['HELADOS', '#2b7fa8'], ['FRUTERÍA', '#5f7f2a'], ['TABERNA', '#7b2d2d']];

// quita la hierba (antes de sembrarla) donde hay pavimento, arena o césped pintado
export function noGrass(test, x0, z0, x1, z1) {
  const i0 = Math.max(0, Math.floor((x0 + HALF) / CELL)), i1 = Math.min(N - 1, Math.ceil((x1 + HALF) / CELL));
  const j0 = Math.max(0, Math.floor((z0 + HALF) / CELL)), j1 = Math.min(N - 1, Math.ceil((z1 + HALF) / CELL));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (test(-HALF + i * CELL, -HALF + j * CELL)) SURF.grass[j * N + i] = 0;
}
function polyLen(pts) { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return l; }
function polyAt(pts, s) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s <= l || i === pts.length - 1) { const t = Math.max(0, Math.min(1, s / (l || 1))); return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, tx: (b[0] - a[0]) / (l || 1), tz: (b[1] - a[1]) / (l || 1) }; }
    s -= l;
  }
}
const pick = (a, rnd) => a[(rnd() * a.length) | 0];

// Fila continua de edificios de A a E con las fachadas hacia 'face'; gaps: tramos [s0, s1] sin edificios (bocacalles)
function row(B, A, E, face, o, rnd, TOWN, gaps = [], special = () => null) {
  const L = Math.hypot(E.x - A.x, E.z - A.z), tx = (E.x - A.x) / L, tz = (E.z - A.z) / L;
  const ry = Math.atan2(face.x, face.z), out = [];
  let s = 0;
  while (s < L - 2.5) {
    let w = o.wMin + rnd() * (o.wMax - o.wMin);
    const gp = gaps.find(g => s + w > g[0] - 0.01 && s < g[1]);
    if (gp) { if (gp[0] - s >= 4.5) w = gp[0] - s; else { s = gp[1]; continue; } }
    if (L - s - w < 4.5) w = L - s;
    const cx = A.x + tx * (s + w / 2), cz = A.z + tz * (s + w / 2);
    let y = Infinity;
    for (const [a, b] of [[-w / 2, 0], [w / 2, 0], [0, 0], [-w / 2, -o.d], [w / 2, -o.d]]) { const p = toW(cx, cz, ry, a, b); y = Math.min(y, gy(p.x, p.z)); }
    const h = o.hMin + rnd() * (o.hMax - o.hMin);
    const T = M(cx, y - 0.1, cz, ry);
    const blk = { w, d: o.d, h, wall: pick(PAL, rnd), arcade: o.arcade, shutter: rnd() < 0.55 ? pick(SHUT, rnd) : null, longBalcony: rnd() < 0.35,
      shopColor: pick(SHOPC, rnd), attic: rnd() < 0.3, shops: o.shops, ...(special(s, w) || {}) };
    const r = cityBlock(B, T, blk, rnd);
    const hb = blk.h, c = toW(cx, cz, ry, 0, -r.ad - (o.d - r.ad) / 2);
    addBox(c.x, c.z, w + 0.1, o.d - r.ad, ry, { solidView: true });
    if (o.arcade) { const bays = Math.max(1, Math.round(w / 3.4)); for (let i = 0; i <= bays; i++) { const p = toW(cx, cz, ry, -w / 2 + i * w / bays + (i === 0 ? 0.36 : i === bays ? -0.36 : 0), -0.4); addCircle(p.x, p.z, 0.42); } }
    const mid = toW(cx, cz, ry, 0, -o.d / 2);
    TOWN.houses.push({ x: mid.x, z: mid.z, ry, w, d: o.d, top: y + hb + 3, door: toW(cx, cz, ry, 0, 1.4) });
    out.push({ cx, cz, ry, w, h: hb, y, T, s, blk, gh: r.gh });
    s += w;
  }
  return out;
}

// farola de plaza con tres globos
function cityLamp(B, x, z) {
  const y = gy(x, z);
  B.add('iron', new THREE.CylinderGeometry(0.3, 0.38, 0.5, 8), M(x, y + 0.25, z));
  B.add('iron', new THREE.CylinderGeometry(0.08, 0.13, 3.6, 8), M(x, y + 2.2, z));
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2;
    B.add('iron', box(0.05, 0.05, 0.75), M(x + Math.sin(a) * 0.36, y + 3.85, z + Math.cos(a) * 0.36, a));
    B.add('lamp', new THREE.SphereGeometry(0.2, 10, 8), M(x + Math.sin(a) * 0.72, y + 4.12, z + Math.cos(a) * 0.72));
  }
  B.add('lamp', new THREE.SphereGeometry(0.24, 10, 8), M(x, y + 4.35, z));
  B.add('iron', new THREE.ConeGeometry(0.12, 0.35, 6), M(x, y + 4.7, z));
  addCircle(x, z, 0.4);
  VILLAGE.lamps.push({ x, y: y + 4.2, z });
}

// kiosco octogonal de la música: basamento de piedra con escalera, columnas de hierro y tejado de cinc con linterna
function kiosk(B, x, z) {
  const y = gy(x, z) - 0.05, ry = 0, T = M(x, y, z, ry), R = 5.6, ap = R * Math.cos(Math.PI / 8), H = 1.8;
  B.add('ashlar', new THREE.CylinderGeometry(R, R + 0.2, H, 8), MM(T, M(0, H / 2 - 0.1, 0, Math.PI / 8)));
  B.add('ashlar', new THREE.CylinderGeometry(R + 0.3, R + 0.3, 0.16, 8), MM(T, M(0, H, 0, Math.PI / 8)));
  B.add('stoneDark', new THREE.CylinderGeometry(R + 0.25, R + 0.3, 0.3, 8), MM(T, M(0, 0.1, 0, Math.PI / 8)));
  const cols = [];
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + Math.PI / 8, px = Math.sin(a) * (R - 0.25), pz = Math.cos(a) * (R - 0.25);
    cols.push([px, pz]);
    B.add('iron', new THREE.CylinderGeometry(0.09, 0.11, 4.2, 8), MM(T, M(px, H + 2.1, pz)));
    B.add('gold', new THREE.CylinderGeometry(0.2, 0.1, 0.3, 8), MM(T, M(px, H + 4.1, pz)));
    B.add('iron', new THREE.CylinderGeometry(0.18, 0.2, 0.25, 8), MM(T, M(px, H + 0.12, pz)));
    // barandilla entre columnas (menos en el lado de la escalera)
    const b = (i + 0.5) / 8 * Math.PI * 2 + Math.PI / 8;
    if (i === 7) continue;
    const len = 2 * (R - 0.25) * Math.sin(Math.PI / 8) - 0.2, mx = Math.sin(b) * (ap - 0.25), mz = Math.cos(b) * (ap - 0.25);
    const rail = new THREE.PlaneGeometry(len, 0.95); { const uv = rail.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setX(k, uv.getX(k) * len / 0.9); }
    B.add('railing', rail, MM(T, M(mx, H + 0.55, mz, b)));
    B.add('iron', box(len, 0.06, 0.08), MM(T, M(mx, H + 1.03, mz, b)));
  }
  // friso y tejado
  B.add('paint', colored(new THREE.CylinderGeometry(R + 0.1, R + 0.1, 0.6, 8, 1, true), '#f1ece0'), MM(T, M(0, H + 4.5, 0, Math.PI / 8)));
  B.add('paint', colored(new THREE.CylinderGeometry(R + 0.05, R + 0.05, 0.1, 8), '#e9e3d6'), MM(T, M(0, H + 4.2, 0, Math.PI / 8)));
  B.add('zinc', new THREE.ConeGeometry(R + 1.1, 1.9, 8), MM(T, M(0, H + 4.8 + 0.95, 0, Math.PI / 8)));
  B.add('paint', colored(new THREE.CylinderGeometry(1.1, 1.1, 0.9, 8), '#f1ece0'), MM(T, M(0, H + 6.9, 0, Math.PI / 8)));
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; B.add('glass', box(0.5, 0.55, 0.04), MM(T, M(Math.sin(a) * 1.12, H + 6.9, Math.cos(a) * 1.12, a))); }
  B.add('zinc', new THREE.ConeGeometry(1.5, 1.1, 8), MM(T, M(0, H + 7.9, 0, Math.PI / 8)));
  B.add('gold', new THREE.SphereGeometry(0.22, 10, 8), MM(T, M(0, H + 8.55, 0)));
  B.add('gold', new THREE.ConeGeometry(0.05, 0.9, 6), MM(T, M(0, H + 9.1, 0)));
  // escalera (lado sur): peldaños con suelo propio
  const steps = 5, rise = H / steps, run = 0.42, sw = 3.2;
  for (let k = 0; k < steps; k++) {
    const lz0 = ap + (steps - 1 - k) * run, h = (k + 1) * rise;
    B.add('ashlar', box(sw, h, run + 0.02, 1.2), MM(T, M(0, h / 2 - 0.05, lz0 + run / 2)));
    addPlatform(x, z, ry, -sw / 2, sw / 2, lz0, lz0 + run, y + h);
  }
  for (const s of [-1, 1]) { B.add('ashlar', box(0.35, H + 0.25, steps * run, 1), MM(T, M(s * (sw / 2 + 0.17), H / 2 + 0.05, ap + steps * run / 2))); const w = toW(x, z, ry, s * (sw / 2 + 0.17), ap + steps * run / 2); addBox(w.x, w.z, 0.4, steps * run, ry); }
  addPlatform(x, z, ry, -ap, ap, -ap, ap, y + H + 0.08);
  // pie del basamento (cerco sólido salvo la escalera): cajas en los lados del octógono
  for (let i = 0; i < 8; i++) {
    if (i === 7) continue;
    const b = (i + 0.5) / 8 * Math.PI * 2 + Math.PI / 8, len = 2 * R * Math.sin(Math.PI / 8);
    const w = toW(x, z, ry, Math.sin(b) * (ap - 0.1), Math.cos(b) * (ap - 0.1)); addBox(w.x, w.z, len, 0.6, ry + b);
  }
  return { x, z, y };
}

function terrace(B, cx, cz, n, dir) {
  for (let i = 0; i < n; i++) {
    const x = cx + dir.x * (i % 2 ? 4.8 : 2.8), z = cz + (i - (n - 1) / 2) * 2.6, y = gy(x, z);
    B.add('iron', new THREE.CylinderGeometry(0.04, 0.2, 0.74, 6), M(x, y + 0.37, z));
    B.add('plaster', new THREE.CylinderGeometry(0.42, 0.42, 0.05, 14), M(x, y + 0.76, z));
    for (const s of [-1, 1]) {
      const chx = x + s * 0.7, T = M(chx, y, z, s > 0 ? -Math.PI / 2 : Math.PI / 2);
      B.add('paint', colored(box(0.42, 0.05, 0.42), '#3a2a1c'), MM(T, M(0, 0.46, 0)));
      B.add('paint', colored(box(0.42, 0.5, 0.05), '#3a2a1c'), MM(T, M(0, 0.72, -0.2)));
      B.add('iron', box(0.04, 0.45, 0.04), MM(T, M(0, 0.22, 0)));
    }
    addCircle(x, z, 0.9);
  }
}

// ---------- Plaza del Castillo ----------
function plazaCastillo(B, S, rnd, TOWN) {
  const P = PLACES.plaza, x0 = P.x - P.rect.hw, x1 = P.x + P.rect.hw, z0 = P.z - P.rect.hd, z1 = P.z + P.rect.hd;
  const D = 12, opt = { d: D, wMin: 8.5, wMax: 11.5, hMin: 15.5, hMax: 18.5, arcade: true };
  const north = row(B, { x: x0 - D, z: z0 }, { x: x1 + D, z: z0 }, { x: 0, z: 1 }, opt, rnd, TOWN, [[14 - (x0 - D), 23 - (x0 - D)]]);
  row(B, { x: x0, z: z0 }, { x: x0, z: z1 }, { x: 1, z: 0 }, opt, rnd, TOWN, [[6 - z0, 14.5 - z0], [47 - z0, 56.5 - z0]]);
  let iruna = null, perla = null;
  const east = row(B, { x: x1, z: z0 }, { x: x1, z: z1 }, { x: -1, z: 0 }, opt, rnd, TOWN, [[5.5 - z0, 13.5 - z0], [46.5 - z0, 63.5 - z0]],
    (s, w) => s === 0 ? { wall: 'plaster', h: 19, attic: false, tag: 'perla' } : (s < 58 && s + w > 58) ? { wall: 'plasterCream', shopColor: '#2b1e14', h: 17.5, tag: 'iruna', longBalcony: true } : null);
  for (const b of east) { if (b.blk.tag === 'iruna') iruna = b; if (b.blk.tag === 'perla') perla = b; }
  row(B, { x: 46, z: z1 }, { x: x1 + D, z: z1 }, { x: 0, z: -1 }, { ...opt, arcade: false }, rnd, TOWN);
  row(B, { x: x0 - D, z: z1 }, { x: 10, z: z1 }, { x: 0, z: -1 }, { ...opt, arcade: false }, rnd, TOWN);
  // Café Iruña (1888): rótulo sobre los soportales y veladores en la plaza
  if (iruna) {
    const { T, w, gh } = iruna;
    S.add(MM(T, M(0, gh - 0.4, 0.03)), w - 0.8, 0.66, (g, W, H) => {
      g.fillStyle = '#20160f'; roundRect(g, 0, 0, W, H, 10); g.fill();
      g.strokeStyle = '#d9b25a'; g.lineWidth = 4; roundRect(g, 8, 8, W - 16, H - 16, 6); g.stroke();
      g.fillStyle = '#e6c46e'; g.textAlign = 'center'; g.textBaseline = 'middle';
      fitText(g, 'CAFÉ  IRUÑA', W / 2, H / 2 + 2, W * 0.7, H * 0.6, FONT_SERIF);
      g.font = `italic bold ${H * 0.32}px ${FONT_SERIF}`; g.fillText('1888', W * 0.08, H / 2); g.fillText('1888', W * 0.92, H / 2);
    });
    terrace(B, iruna.cx, iruna.cz, 6, { x: -1, z: 0 });
  }
  if (perla) S.add(MM(perla.T, M(0, perla.h - 1.0, 0.07)), perla.w - 1, 0.8, letters('GRAN HOTEL LA PERLA', '#d8b154', { size: 0.66 }));
  // placa de la plaza
  const nb = north.find(b => b.cx < 14 && b.cx + b.w / 2 > 8) || north[0];
  S.add(MM(nb.T, M(nb.w / 2 - 1.2, nb.gh + 1.0, 0.05)), 1.5, 0.62, plaque(['PLAZA DEL CASTILLO', 'GAZTELU PLAZA']));
  const k = kiosk(B, P.x, P.z);
  // bancos mirando al kiosco y farolas alrededor
  for (let i = 0; i < 6; i++) { const a = (i + 0.5) / 6 * Math.PI * 2, bx = P.x + Math.sin(a) * 12, bz = P.z + Math.cos(a) * 12; if (isFree(bx, bz, 1.4)) bench(B, bx, gy(bx, bz), bz, Math.atan2(P.x - bx, P.z - bz)); }
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; cityLamp(B, P.x + Math.sin(a) * 16, P.z + Math.cos(a) * 16); }
  for (const lx of [x0 + 6, x1 - 6]) for (let zz = z0 + 10; zz < z1 - 4; zz += 17) if (isFree(lx, zz, 1)) cityLamp(B, lx, zz);
  for (let i = 0; i < 4; i++) { const bx = x0 + 10 + i * 5, bz = z1 - 12; if (isFree(bx, bz, 1.4)) bench(B, bx, gy(bx, bz), bz, Math.PI); }
  return { x: P.x, z: P.z + 12, kiosk: k };
}

// ---------- Ayuntamiento: fachada barroca de tres órdenes con el balcón del chupinazo ----------
function ayuntamiento(B, S, cx, cz, TOWN) {
  const w = 18, d = 15, fz = cz + d / 2, y = Math.min(gy(cx, fz), gy(cx - w / 2, fz), gy(cx + w / 2, fz)) - 0.1;
  const T = M(cx, y, fz, 0), F = (m) => MM(T, m);
  const top = 15.4, levels = [[0, 5.4], [5.4, 5.2], [10.6, 4.8]];
  B.add('ashlar', box(w, top + 3, d, 2.2), F(M(0, top / 2 - 1.5, -d / 2)));
  B.add('stoneDark', box(w + 0.3, 0.9, d + 0.3, 2), F(M(0, 0.15, -d / 2)));
  const colX = [-8.4, -7.6, -3.1, -2.3, 2.3, 3.1, 7.6, 8.4];
  levels.forEach(([y0, lh], L) => {
    for (const x of colX) {
      B.add('ashlar', box(0.72, 0.36, 0.72, 1), F(M(x, y0 + 0.2, 0.42)));
      B.add('ashlar', new THREE.CylinderGeometry(0.24, 0.29, lh - 1.0, 10), F(M(x, y0 + 0.38 + (lh - 1.0) / 2, 0.42)));
      B.add('ashlar', new THREE.CylinderGeometry(0.42 + L * 0.05, 0.28, 0.34 + L * 0.08, 8), F(M(x, y0 + lh - 0.64, 0.42)));
    }
    B.add('ashlar', box(w + 0.5, 0.5, 1.05), F(M(0, y0 + lh - 0.25, 0.38)));
    B.add('ashlar', box(w + 0.9, 0.17, 1.3), F(M(0, y0 + lh + 0.08, 0.42)));
  });
  // planta baja: tres puertas en arco
  for (const [x, dw, dh] of [[0, 2.6, 4.3], [-5.35, 1.8, 3.7], [5.35, 1.8, 3.7]]) {
    B.add('woodDark', archPanel(dw, dh, 0.1), F(M(x, 0.3, 0.05)));
    B.add('ashlar', archRing(dw / 2, dw / 2 + 0.36, 0.34, 12), F(M(x, 0.3 + dh - dw / 2, 0.12)));
    for (const s of [-1, 1]) B.add('ashlar', box(0.36, dh - dw / 2, 0.3, 1), F(M(x + s * (dw / 2 + 0.18), 0.3 + (dh - dw / 2) / 2, 0.1)));
  }
  // planta noble: balcón corrido del chupinazo y frontones sobre las puertas
  for (const [x, ww, wh] of [[0, 1.6, 3.3], [-5.35, 1.3, 3.0], [5.35, 1.3, 3.0]]) {
    winDoor(B, T, x, 5.75, ww, wh, null);
    B.add('ashlar', gable(ww + 1.1, 0.75, 0.35), F(M(x, 5.75 + wh + 0.28, 0.12)));
  }
  B.add('ashlar', box(w - 0.6, 0.3, 1.45), F(M(0, 5.5, 0.72)));
  { const rail = new THREE.PlaneGeometry(w - 0.8, 1.0), uv = rail.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (w - 0.8) / 0.9); B.add('railing', rail, F(M(0, 6.15, 1.42))); }
  for (const s of [-1, 1]) { const rail = new THREE.PlaneGeometry(1.4, 1.0); B.add('railing', rail, F(M(s * (w / 2 - 0.42), 6.15, 0.75, Math.PI / 2))); }
  B.add('gold', box(w - 0.7, 0.07, 0.1), F(M(0, 6.66, 1.42)));
  for (let i = 0; i < 7; i++) B.add('ashlar', box(0.3, 0.5, 1.2), F(M(-7.5 + i * 2.5, 5.12, 0.6, 0, 0.3)));
  // segunda planta: balcones sueltos
  for (const [x, ww, wh] of [[0, 1.4, 2.8], [-5.35, 1.2, 2.6], [5.35, 1.2, 2.6]]) {
    winDoor(B, T, x, 10.95, ww, wh, null);
    B.add('ashlar', box(ww + 0.7, 0.14, 0.7, 1), F(M(x, 10.9, 0.35)));
    const rail = new THREE.PlaneGeometry(ww + 0.6, 0.9); { const uv = rail.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (ww + 0.6) / 0.9); }
    B.add('railing', rail, F(M(x, 11.42, 0.68)));
  }
  // remate: balaustrada con pináculos, escudo en un frontón curvo, dos estatuas y la Fama con su trompeta
  balustrade(B, F(M(0, top + 0.16, 0.25)), w + 0.4, 1.0);
  for (const x of [-8, -2.7, 2.7, 8]) { B.add('ashlar', box(0.55, 0.9, 0.55), F(M(x, top + 1.6, 0.25))); B.add('ashlar', new THREE.SphereGeometry(0.3, 10, 8), F(M(x, top + 2.35, 0.25))); }
  B.add('ashlar', box(6.2, 3.3, 0.9), F(M(0, top + 1.8, 0.1)));
  B.add('ashlar', archRing(2.7, 3.35, 0.9, 16), F(M(0, top + 3.45, 0.1)));
  B.add('ashlar', box(7.2, 0.3, 1.1), F(M(0, top + 3.5, 0.15)));
  B.add('shield', new THREE.PlaneGeometry(1.9, 2.3), F(M(0, top + 2.2, 0.58)));
  for (const s of [-1, 1]) statue(B, F(M(s * 4.4, top + 1.16, 0.25, -s * 0.3)), 2.3, 'ashlar', s);
  statue(B, F(M(0, top + 6.8, 0.1)), 2.1, 'ashlar', 1);
  B.add('gold', new THREE.ConeGeometry(0.12, 1.2, 8), F(M(0.55, top + 8.4, 0.4, 0, -0.6, -0.9)));
  roofHip(B, F(M(0, 0, -d / 2)), w, d, top + 0.2, 3.2, 'tile');
  navarraFlag(B, F(M(0, top + 3.2, -4.5)), 2.6);
  addBox(cx, cz, w + 0.4, d + 0.4, 0, { solidView: true });
  S.add(F(M(-w / 2 - 0.03, 3.2, -2.2, -Math.PI / 2)), 1.4, 0.58, plaque(['PLAZA CONSISTORIAL', 'UDALETXEKO PLAZA']));
  TOWN.houses.push({ x: cx, z: cz, ry: 0, w, d, top: y + top + 4 });
  return { x: cx, z: fz + 6 };
}

// ---------- Palacio de Navarra (Diputación): fachada neoclásica con pórtico de columnas mirando a Carlos III ----------
function palacioNavarra(B, S, fx, cz, TOWN) {
  const ry = Math.PI / 2, w = 28, d = 20, h = 15;
  let y = Infinity; for (const a of [-w / 2, 0, w / 2]) for (const b of [0, -d]) { const p = toW(fx, cz, ry, a, b); y = Math.min(y, gy(p.x, p.z)); }
  y -= 0.1;
  const T = M(fx, y, cz, ry), F = (m) => MM(T, m);
  B.add('ashlar', box(w, h + 3, d, 2.2), F(M(0, h / 2 - 1.5, -d / 2)));
  B.add('stoneDark', box(w + 0.3, 1.2, d + 0.3, 2), F(M(0, 0.3, -d / 2)));
  B.add('ashlar', box(w + 0.4, 0.3, 0.4), F(M(0, 6.0, 0.1)));
  for (let c = 0; c < 9; c++) {
    const x = -w / 2 + 1.6 + c * (w - 3.2) / 8;
    if (Math.abs(x) < 5.8) continue;
    winDoor(B, T, x, 1.6, 1.1, 2.2, null);
    winDoor(B, T, x, 6.9, 1.15, 2.7, null);
    B.add('ashlar', gable(1.9, 0.5, 0.3), F(M(x, 9.85, 0.12)));
    B.add('ashlar', box(1.8, 0.13, 0.6, 1), F(M(x, 6.85, 0.3)));
    const rail = new THREE.PlaneGeometry(1.7, 0.9); { const uv = rail.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 1.7 / 0.9); }
    B.add('railing', rail, F(M(x, 7.35, 0.58)));
    winDoor(B, T, x, 11.6, 1.0, 1.7, null);
  }
  // pórtico
  B.add('ashlar', box(13, 1.0, 4.4), F(M(0, 0.5, 2.2)));
  for (let i = 0; i < 3; i++) B.add('ashlar', box(9 + i * 0.6, 1.0 - i * 0.33, 0.6), F(M(0, (1.0 - i * 0.33) / 2, 4.6 + i * 0.6)));
  for (const x of [-5.4, -1.9, 1.9, 5.4]) {
    B.add('ashlar', box(1.2, 0.4, 1.2), F(M(x, 1.2, 3.1)));
    B.add('ashlar', new THREE.CylinderGeometry(0.46, 0.55, 9.2, 14), F(M(x, 6.0, 3.1)));
    B.add('ashlar', new THREE.CylinderGeometry(0.72, 0.5, 0.75, 10), F(M(x, 10.95, 3.1)));
    const p = toW(fx, cz, ry, x, 3.1); addCircle(p.x, p.z, 0.65);
  }
  B.add('ashlar', box(13.2, 1.1, 4.6), F(M(0, 11.85, 2.2)));
  B.add('ashlar', gable(13.6, 3.0, 4.6), F(M(0, 12.4, 2.2)));
  B.add('shield', new THREE.PlaneGeometry(1.5, 1.8), F(M(0, 13.35, 4.55)));
  B.add('woodDark', box(2.4, 4.2, 0.1), F(M(0, 3.1, 0.05)));
  B.add('ashlar', box(3.2, 0.4, 0.3), F(M(0, 5.4, 0.12)));
  // cornisa y balaustrada
  B.add('ashlar', box(w + 0.8, 0.5, d + 0.8), F(M(0, h + 0.25, -d / 2)));
  balustrade(B, F(M(0, h + 0.5, 0.1)), w, 0.95);
  roofHip(B, F(M(0, 0, -d / 2)), w - 1, d - 1, h + 0.4, 3.2, 'tile');
  navarraFlag(B, F(M(0, h + 2.6, -d / 2)), 2.8);
  const c = toW(fx, cz, ry, 0, -d / 2); addBox(c.x, c.z, w + 0.4, d + 0.4, ry, { solidView: true });
  const st = toW(fx, cz, ry, 0, 2.2); addBox(st.x, st.z, 13.2, 4.6, ry);
  S.add(F(M(-9.5, 3.4, 0.08)), 1.6, 0.66, plaque(['PALACIO DE NAVARRA', 'NAFARROAKO JAUREGIA']));
  TOWN.houses.push({ x: c.x, z: c.z, ry, w, d, top: y + h + 5 });
}

// ---------- Calle Estafeta: casas altas y estrechas, tiendas, balcones de forja ----------
function estafeta(B, S, rnd, TOWN) {
  const p = PATHS.find(q => q.id === 'estafeta'); if (!p) return null;
  const L = polyLen(p.pts);
  let shop = 0, first = [];
  const toros = PLACES.landmarks?.find(l => l.kind === 'bullring');
  for (const side of [-1, 1]) {
    let s = 6;
    while (s < L - 6) {
      const w = 6.4 + rnd() * 2.6, d = 10, h = 12.8 + rnd() * 4.5;
      const a = polyAt(p.pts, s + w / 2), nx = -a.tz * side, nz = a.tx * side;
      const fx = a.x + nx * (p.w - 0.5), fz = a.z + nz * (p.w - 0.5), ry = Math.atan2(-nx, -nz);
      const c = toW(fx, fz, ry, 0, -d / 2);
      if (toros && Math.hypot(c.x - toros.x, c.z - toros.z) < 36 + 12) break;
      if (!isFree(c.x, c.z, Math.min(w, d) / 2 - 0.5)) { s += 1.5; continue; }
      let y = Infinity; for (const [u, v] of [[-w / 2, 0], [w / 2, 0], [0, -d]]) { const q = toW(fx, fz, ry, u, v); y = Math.min(y, gy(q.x, q.z)); }
      const T = M(fx, y - 0.1, fz, ry);
      const blk = { w, d, h, wall: pick(PAL, rnd), shutter: rnd() < 0.6 ? pick(SHUT, rnd) : null, longBalcony: rnd() < 0.3, shopColor: pick(SHOPC, rnd), attic: rnd() < 0.35 };
      const r = cityBlock(B, T, blk, rnd);
      addBox(c.x, c.z, w + 0.1, d, ry, { solidView: true });
      TOWN.houses.push({ x: c.x, z: c.z, ry, w, d, top: y + h + 3, door: toW(fx, fz, ry, 0, 1.4) });
      if (!first[side + 1]) first[side + 1] = { T, w, gh: r.gh };
      // rótulo de banderola sobre la tienda
      if (rnd() < 0.55 && shop < SHOPS.length) {
        const [txt, col] = SHOPS[shop++], bx = w / 2 - 0.9;
        B.add('iron', box(0.05, 0.05, 1.05), MM(T, M(bx, 3.75, 0.52)));
        B.add('iron', box(0.04, 0.5, 0.04), MM(T, M(bx, 3.52, 0.06)));
        S.add(MM(T, M(bx, 3.35, 0.62, Math.PI / 2)), 0.95, 0.5, shopSign(txt, col), { both: true });
      }
      s += w;
    }
  }
  // placas de la calle al principio y al final
  if (first[0]) S.add(MM(first[0].T, M(-first[0].w / 2 + 1.0, first[0].gh + 0.9, 0.05)), 1.3, 0.56, plaque(['CALLE ESTAFETA', 'ESTAFETA KALEA']));
  if (first[2]) S.add(MM(first[2].T, M(first[2].w / 2 - 1.0, first[2].gh + 0.9, 0.05)), 1.3, 0.56, plaque(['CALLE ESTAFETA', 'ESTAFETA KALEA']));
  noGrass((x, z) => { for (let i = 1; i < p.pts.length; i++) { const [ax, az] = p.pts[i - 1], [bx, bz] = p.pts[i], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); if (Math.hypot(x - ax - dx * t, z - az - dz * t) < p.w + 1.5) return true; } return false; }, 20, -125, 215, -60);
  const m = polyAt(p.pts, L / 2);
  return { x: m.x, z: m.z };
}

// ---------- Catedral de Santa María: fachada neoclásica de dos torres y pórtico, cuerpo gótico y claustro ----------
function pointedRing(wi, t, depth) {
  const wo = wi + 2 * t, s = new THREE.Shape();
  s.moveTo(-wo / 2, 0);
  s.absarc(wo / 2, 0, wo, Math.PI, Math.PI * 2 / 3, true);
  s.absarc(-wo / 2, 0, wo, Math.PI / 3, 0, true);
  s.lineTo(wi / 2, 0);
  s.absarc(-wi / 2, 0, wi, 0, Math.PI / 3, false);
  s.absarc(wi / 2, 0, wi, Math.PI * 2 / 3, Math.PI, false);
  s.lineTo(-wo / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 5 });
  g.translate(0, 0, -depth / 2); return g;
}
// fuste estriado (acanaladuras hechas desplazando vértices alternos) y capitel corintio con dos coronas de hojas
function fluted(r, h, n = 24) {
  const g = new THREE.CylinderGeometry(r, r * 1.08, h, n * 2, 1, false), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(x, z), k = Math.round(a / (Math.PI / n)); if (Math.abs(k) % 2 === 1) { p.setX(i, x * 0.9); p.setZ(i, z * 0.9); } }
  g.computeVertexNormals(); return g;
}
function corinthian(B, T, r, mat) {
  B.add(mat, new THREE.CylinderGeometry(r * 1.15, r, r * 1.4, 12), MM(T, M(0, r * 0.7, 0)));
  for (let row = 0; row < 2; row++) for (let i = 0; i < 8; i++) {
    const a = (i + row * 0.5) / 8 * Math.PI * 2;
    B.add(mat, new THREE.ConeGeometry(r * 0.28, r * (0.9 - row * 0.2), 4).rotateX(-0.35), MM(T, M(Math.sin(a) * r * 1.0, r * (0.5 + row * 0.5), Math.cos(a) * r * 1.0, a)));
  }
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; B.add(mat, new THREE.TorusGeometry(r * 0.2, r * 0.07, 5, 8), MM(T, M(Math.sin(a) * r * 1.25, r * 1.3, Math.cos(a) * r * 1.25, a))); }
  B.add(mat, box(r * 3, r * 0.3, r * 3), MM(T, M(0, r * 1.55, 0)));
}
function catedral(B, S, cx, cz, TOWN) {
  const ry = -Math.PI / 2, y = gy(cx, cz) - 0.2, T = M(cx, y, cz, ry), F = (m) => MM(T, m);
  const col = (lx, lz, w, d, meta) => { const p = toW(cx, cz, ry, lx, lz); addBox(p.x, p.z, w, d, ry, meta); };
  // --- cuerpo gótico: nave, naves laterales, crucero y cabecera
  B.add('sandstone', box(16, 22, 54, 2.4), F(M(0, 9, -7)));
  B.add('sandstone', box(28, 13, 54, 2.4), F(M(0, 4.5, -7)));
  B.add('sandstone', box(40, 20, 12, 2.4), F(M(0, 8, -14)));
  B.add('stoneDark', box(28.4, 1.2, 54.4, 2), F(M(0, 0.2, -7)));
  const pitch = 0.58, rise = 8 * Math.tan(pitch);
  for (const s of [-1, 1]) B.add('tile', box(Math.hypot(8, rise) + 0.6, 0.3, 55, 2), F(M(s * (4 + 0.25), 20 + rise / 2 + 0.05, -7, 0, 0, -s * pitch)));
  B.add('sandstone', gable(16, rise, 0.6), F(M(0, 20, -33.8)));
  for (const s of [-1, 1]) B.add('tile', box(6.8, 0.25, 54.5, 2), F(M(s * 11.2, 12.2, -7, 0, 0, -s * 0.36)));
  const tr = 6 * Math.tan(pitch);
  for (const s of [-1, 1]) B.add('tile', box(40.6, 0.3, Math.hypot(6, tr) + 0.6, 2), F(M(0, 18 + tr / 2 + 0.05, -14 + s * 3.1, 0, s * pitch)));
  for (const s of [-1, 1]) {
    B.add('sandstone', gable(12, tr, 0.6), F(M(s * 19.7, 18, -14, Math.PI / 2)));
    B.add('sandstone', new THREE.TorusGeometry(2.3, 0.28, 6, 22), F(M(s * 20.05, 12, -14, s * Math.PI / 2)));
    B.add('glass', new THREE.CircleGeometry(2.25, 22), F(M(s * 20.03, 12, -14, s * Math.PI / 2)));
    for (let k = 0; k < 4; k++) B.add('sandstone', box(0.16, 4.4, 0.2), F(M(s * 20.1, 12, -14, s * Math.PI / 2, 0, k * Math.PI / 4)));
    B.add('glass', pointedPanel(2.4, 6, 0.1), F(M(s * 20.03, 2.2, -14, s * Math.PI / 2)));
  }
  // cabecera poligonal con girola
  B.add('sandstone', new THREE.CylinderGeometry(8, 8, 22, 7, 1, false, Math.PI / 2, Math.PI), F(M(0, 9, -34)));
  B.add('tile', new THREE.ConeGeometry(8.6, 5, 7, 1, false, Math.PI / 2, Math.PI), F(M(0, 22.5, -34)));
  B.add('sandstone', new THREE.CylinderGeometry(14, 14, 13, 9, 1, false, Math.PI / 2, Math.PI), F(M(0, 4.5, -34)));
  B.add('tile', new THREE.ConeGeometry(14.6, 3.2, 9, 1, false, Math.PI / 2, Math.PI), F(M(0, 12.6, -34)));
  for (let k = 0; k < 7; k++) {
    const a = Math.PI / 2 + (k + 0.5) / 7 * Math.PI;
    B.add('glass', pointedPanel(1.5, 5, 0.1), F(M(Math.sin(a) * 7.84, 13.5, -34 + Math.cos(a) * 7.84, a)));
  }
  for (let k = 0; k <= 5; k++) { const a = Math.PI / 2 + k / 5 * Math.PI; B.add('sandstone', box(1.3, 12.5, 1.6, 2), F(M(Math.sin(a) * 14.5, 4.25, -34 + Math.cos(a) * 14.5, a))); B.add('sandstone', new THREE.ConeGeometry(0.62, 2.2, 4), F(M(Math.sin(a) * 14.5, 11.6, -34 + Math.cos(a) * 14.5, a + Math.PI / 4))); }
  // contrafuertes, arbotantes y ventanales apuntados
  for (let i = 0; i < 8; i++) {
    const lz = -31 + i * 6.8;
    if (lz > -21 && lz < -7) continue;
    for (const s of [-1, 1]) {
      B.add('sandstone', box(1.4, 12.5, 1.6, 2), F(M(s * 14.6, 4.25, lz)));
      B.add('sandstone', new THREE.ConeGeometry(0.62, 2.4, 4), F(M(s * 14.6, 11.7, lz, Math.PI / 4)));
      B.add('sandstone', box(8.2, 0.6, 0.7), F(M(s * 11.55, 14.25, lz, 0, 0, -s * 0.735)));
      if (i < 7 && !(lz + 3.4 > -21 && lz + 3.4 < -7)) {
        B.add('glass', pointedPanel(1.7, 5.4, 0.1), F(M(s * 14.03, 3.4, lz + 3.4, s * Math.PI / 2)));
        B.add('glass', pointedPanel(2.0, 5.2, 0.1), F(M(s * 8.03, 13.8, lz + 3.4, s * Math.PI / 2)));
        B.add('sandstone', box(0.14, 3.6, 0.16), F(M(s * 14.09, 5.2, lz + 3.4)));
      }
    }
  }
  // --- fachada neoclásica (Ventura Rodríguez): dos torres con reloj y cupulín, cuerpo central y pórtico corintio
  B.add('sandstone', box(16, 22, 6, 2.2), F(M(0, 8, 23)));
  for (const s of [-1, 1]) {
    const tx = s * 12, TT = F(M(tx, 0, 24));
    B.add('sandstone', box(8, 33, 8, 2.2), MM(TT, M(0, 13.5, 0)));
    for (const [yy, hh, ww] of [[15.5, 0.7, 8.7], [22.4, 0.9, 8.9], [30, 0.9, 8.9]]) B.add('sandstone', box(ww, hh, ww), MM(TT, M(0, yy, 0)));
    for (const [px, pz] of [[-3.75, 3.75], [3.75, 3.75], [-3.75, -3.75], [3.75, -3.75]]) B.add('sandstone', box(0.8, 29.5, 0.8, 2), MM(TT, M(px, 15, pz)));
    for (let f = 0; f < 4; f++) {
      const R = MM(TT, M(0, 0, 0, f * Math.PI / 2));
      // piso bajo: ventana con frontón; piso del reloj; campanario con arco entre columnas
      B.add('glass', box(1.2, 2.3, 0.05), MM(R, M(0, 10.2, 4.03)));
      B.add('sandstone', gable(2.0, 0.6, 0.3), MM(R, M(0, 11.5, 4.1)));
      B.add('sandstone', box(1.8, 0.2, 0.3), MM(R, M(0, 9.0, 4.1)));
      B.add('sandstone', new THREE.TorusGeometry(1.25, 0.18, 6, 24), MM(R, M(0, 19.2, 4.12)));
      B.add('paint', colored(new THREE.CircleGeometry(1.22, 24), '#f7f3ea'), MM(R, M(0, 19.2, 4.06)));
      for (let h = 0; h < 12; h++) { const a = h / 12 * Math.PI * 2; B.add('paint', colored(box(0.07, 0.22, 0.02), '#2a2622'), MM(R, M(Math.sin(a) * 1.02, 19.2 + Math.cos(a) * 1.02, 4.08, 0, 0, -a))); }
      B.add('paint', colored(box(0.09, 0.7, 0.03), '#2a2622'), MM(R, M(0.18, 19.45, 4.1, 0, 0, -0.6)));
      B.add('paint', colored(box(0.07, 0.95, 0.03), '#2a2622'), MM(R, M(0, 19.62, 4.11)));
      B.add('dark', archPanel(2.4, 5.2, 0.1), MM(R, M(0, 23.6, 4.03)));
      B.add('sandstone', archRing(1.2, 1.55, 0.4, 12), MM(R, M(0, 23.6 + 5.2 - 1.2, 4.1)));
      for (const c of [-1, 1]) { B.add('sandstone', new THREE.CylinderGeometry(0.22, 0.25, 5.4, 10), MM(R, M(c * 2.05, 25.6, 4.25))); B.add('sandstone', box(0.6, 0.35, 0.6), MM(R, M(c * 2.05, 28.4, 4.25))); }
      B.add('sandstone', box(3.2, 0.3, 0.8), MM(R, M(0, 23.45, 4.2)));
      // remate: urnas en las esquinas
      B.add('sandstone', box(0.55, 0.6, 0.55), MM(R, M(3.6, 30.75, 3.6)));
      B.add('sandstone', new THREE.SphereGeometry(0.34, 10, 8), MM(R, M(3.6, 31.35, 3.6)));
    }
    // cupulín: cuerpo octogonal con ventanas y aletones, cúpula de piedra, linterna y cruz
    B.add('sandstone', box(6.4, 1.0, 6.4), MM(TT, M(0, 30.9, 0)));
    B.add('sandstone', new THREE.CylinderGeometry(2.55, 2.8, 3.6, 8), MM(TT, M(0, 33.2, 0, Math.PI / 8)));
    for (let f = 0; f < 8; f++) {
      const a = f / 8 * Math.PI * 2;
      if (f % 2 === 0) { B.add('dark', archPanel(0.9, 2.0, 0.1), MM(TT, M(Math.sin(a) * 2.62, 32.2, Math.cos(a) * 2.62, a))); B.add('sandstone', new THREE.TorusGeometry(0.6, 0.18, 5, 12, Math.PI), MM(TT, M(Math.sin(a) * 3.0, 31.9, Math.cos(a) * 3.0, a + Math.PI / 2))); }
    }
    B.add('sandstone', new THREE.CylinderGeometry(3.0, 3.0, 0.4, 8), MM(TT, M(0, 35.2, 0, Math.PI / 8)));
    B.add('sandstone', new THREE.SphereGeometry(2.65, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), MM(TT, M(0, 35.4, 0)));
    for (let f = 0; f < 8; f++) { const a = f / 8 * Math.PI * 2 + Math.PI / 8; B.add('sandstone', box(0.2, 0.25, 2.4), MM(TT, M(Math.sin(a) * 1.4, 36.9, Math.cos(a) * 1.4, a, -0.9))); }
    B.add('sandstone', new THREE.CylinderGeometry(0.7, 0.8, 1.6, 8), MM(TT, M(0, 38.6, 0)));
    for (let f = 0; f < 4; f++) { const a = f / 4 * Math.PI * 2; B.add('dark', box(0.35, 0.8, 0.05), MM(TT, M(Math.sin(a) * 0.76, 38.6, Math.cos(a) * 0.76, a))); }
    B.add('sandstone', new THREE.SphereGeometry(0.85, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), MM(TT, M(0, 39.4, 0)));
    B.add('sandstone', new THREE.SphereGeometry(0.28, 8, 6), MM(TT, M(0, 40.5, 0)));
    B.add('iron', box(0.1, 1.5, 0.1), MM(TT, M(0, 41.4, 0))); B.add('iron', box(0.8, 0.1, 0.1), MM(TT, M(0, 41.7, 0)));
    col(tx, 24, 8.4, 8.4, { solidView: true });
  }
  // pórtico: cuatro columnas corintias y dos pilastras, frontón con estatuas y cruz
  B.add('sandstone', box(20.5, 1.2, 5.2), F(M(0, 0.6, 30.6)));
  for (let i = 0; i < 4; i++) { const hh = 1.2 - (i + 1) * 0.3; B.add('sandstone', box(22 + i * 0.8, hh + 0.3, 0.75), F(M(0, (hh + 0.3) / 2, 33.55 + i * 0.75))); addPlatform(cx, cz, ry, -11 - i * 0.4, 11 + i * 0.4, 33.2 + i * 0.75, 33.95 + i * 0.75, y + hh + 0.3); }
  addPlatform(cx, cz, ry, -10.25, 10.25, 26, 33.2, y + 1.2);
  for (const x of [-6.6, -2.3, 2.3, 6.6]) {
    B.add('sandstone', box(1.9, 0.35, 1.9), F(M(x, 1.37, 31.4)));
    B.add('sandstone', new THREE.CylinderGeometry(0.95, 0.98, 0.3, 16), F(M(x, 1.7, 31.4)));
    B.add('sandstone', new THREE.TorusGeometry(0.86, 0.1, 6, 18).rotateX(Math.PI / 2), F(M(x, 1.9, 31.4)));
    B.add('sandstone', fluted(0.72, 11.8), F(M(x, 7.9, 31.4)));
    corinthian(B, F(M(x, 13.8, 31.4)), 0.74, 'sandstone');
    B.add('sandstone', box(1.3, 12.9, 0.5), F(M(x, 7.9, 26.25)));
    B.add('sandstone', box(1.6, 0.9, 0.62), F(M(x, 14.3, 26.3)));
    const p = toW(cx, cz, ry, x, 31.4); addCircle(p.x, p.z, 0.9);
  }
  for (const s of [-1, 1]) { B.add('sandstone', box(1.4, 13.2, 1.4), F(M(s * 9.3, 8.0, 31.0))); const p = toW(cx, cz, ry, s * 9.3, 31); addCircle(p.x, p.z, 0.9); }
  // entablamento: arquitrabe de tres fajas, friso y cornisa con dentellones
  for (let k = 0; k < 3; k++) B.add('sandstone', box(20.0 + k * 0.12, 0.28, 7.0 + k * 0.1), F(M(0, 15.35 + k * 0.28, 29.6 + k * 0.05)));
  B.add('sandstone', box(19.8, 0.9, 6.9), F(M(0, 16.65, 29.55)));
  for (let i = 0; i < 44; i++) B.add('sandstone', box(0.22, 0.24, 0.3), F(M(-9.9 + i * 0.46, 17.0, 33.1)));
  B.add('sandstone', box(20.8, 0.4, 7.7), F(M(0, 17.25, 29.7)));
  B.add('sandstone', gable(15.8, 3.3, 7.2), F(M(0, 17.4, 29.6)));
  for (const s of [-1, 1]) { const len = Math.hypot(8.1, 3.3); B.add('sandstone', box(len, 0.35, 0.7), F(M(s * 4.0, 19.05, 33.15, 0, 0, -s * Math.atan2(3.3, 8.1)))); }
  B.add('sandstone', box(2.6, 1.3, 0.3), F(M(0, 18.35, 33.25)));
  B.add('shield', new THREE.PlaneGeometry(1.0, 1.15), F(M(0, 18.35, 33.42)));
  for (const s of [-1, 1]) { B.add('sandstone', box(1.0, 0.8, 1.0), F(M(s * 7.4, 17.9, 32.4))); statue(B, F(M(s * 7.4, 18.3, 32.4)), 2.2, 'sandstone', s); }
  B.add('sandstone', box(1.0, 0.8, 1.0), F(M(0, 21.0, 31.2)));
  B.add('sandstone', box(0.3, 2.2, 0.3), F(M(0, 22.5, 31.2))); B.add('sandstone', box(1.2, 0.3, 0.3), F(M(0, 23.0, 31.2)));
  // tres puertas bajo el pórtico, con ventanas encima
  B.add('woodDark', box(3.2, 6.2, 0.12), F(M(0, 4.3, 26.06)));
  B.add('sandstone', box(4.4, 0.6, 0.45), F(M(0, 7.8, 26.2)));
  for (const s of [-1, 1]) {
    B.add('sandstone', box(0.45, 6.8, 0.3), F(M(s * 1.85, 4.6, 26.15)));
    B.add('woodDark', box(1.8, 4.4, 0.12), F(M(s * 4.45, 3.4, 26.06)));
    B.add('sandstone', box(2.6, 0.45, 0.4), F(M(s * 4.45, 5.9, 26.18)));
    B.add('glass', box(1.4, 2.3, 0.05), F(M(s * 4.45, 10.2, 26.04)));
    B.add('sandstone', gable(2.2, 0.6, 0.3), F(M(s * 4.45, 11.55, 26.15)));
  }
  B.add('glass', box(1.7, 2.8, 0.05), F(M(0, 10.8, 26.04)));
  balustrade(B, F(M(0, 17.45, 26.6)), 15.6, 0.9);
  for (const s of [-1, 1]) {
    const TT = F(M(s * 12, 0, 24));
    for (let k = 0; k < 9; k++) B.add('sandstone', box(8.12, 0.12, 8.12), MM(TT, M(0, 0.9 + k * 0.9, 0)));
    B.add('sandstone', box(8.3, 0.5, 8.3), MM(TT, M(0, 0.25, 0)));
    // hornacina con estatua en el frente de cada torre
    B.add('stoneDark', archPanel(1.4, 3.2, 0.1), MM(TT, M(0, 4.2, 4.03)));
    B.add('sandstone', archRing(0.7, 0.95, 0.3, 10), MM(TT, M(0, 6.7, 4.1)));
    B.add('sandstone', box(1.5, 0.25, 0.5), MM(TT, M(0, 4.15, 4.2)));
    statue(B, MM(TT, M(0, 4.3, 4.25)), 2.1, 'sandstone', s);
  }
  B.add('sandstone', gable(2.6, 0.7, 0.3), F(M(0, 12.4, 26.15)));
  // claustro gótico (lado sur), con su jardín: se entra por el oeste
  const K = F(M(28, 0, 8)), kc = toW(cx, cz, ry, 28, 8);
  const kcol = (lx, lz, w, d, meta) => { const p = toW(kc.x, kc.z, ry, lx, lz); addBox(p.x, p.z, w, d, ry, meta); };
  for (const [lx, lz, w, d, door] of [[0, -11.6, 24, 0.8], [-11.6, 0, 0.8, 24], [11.6, 0, 0.8, 24], [0, 11.6, 24, 0.8, true]]) {
    if (door) {
      B.add('sandstone', archedWall(24, 9.5, 3.0, 6.7, 0.8, true), MM(K, M(0, -1.5, lz)));
      B.add('sandstone', pointedRing(3.0, 0.4, 1.0), MM(K, M(0, 2.6, lz)));
      for (const s of [-1, 1]) kcol(s * 6.8, lz, 10.4, 0.9, { solidView: true });
    } else { B.add('sandstone', box(w, 9.5, d, 2.2), MM(K, M(lx, 3.25, lz))); kcol(lx, lz, w + 0.1, d + 0.1, { solidView: true }); }
  }
  for (let f = 0; f < 4; f++) {
    const R = MM(K, M(0, 0, 0, f * Math.PI / 2));
    for (let k = 0; k <= 4; k++) {
      const px = -7.4 + k * 3.7;
      B.add('sandstone', box(0.75, 3.1, 0.95, 1.2), MM(R, M(px, 1.55, 7.4)));
      const p = toW(kc.x, kc.z, ry + f * Math.PI / 2, px, 7.4); addCircle(p.x, p.z, 0.5);
      if (k < 4) {
        const ax = px + 1.85;
        B.add('sandstone', pointedRing(2.9, 0.38, 0.8), MM(R, M(ax, 3.0, 7.4)));
        B.add('sandstone', box(0.16, 3.0, 0.22), MM(R, M(ax, 1.5, 7.4)));
        B.add('sandstone', new THREE.TorusGeometry(0.42, 0.08, 5, 12), MM(R, M(ax, 4.35, 7.4)));
        for (const s of [-1, 1]) B.add('sandstone', pointedRing(1.15, 0.1, 0.25), MM(R, M(ax + s * 0.72, 2.95, 7.4)));
      }
    }
    B.add('sandstone', box(15.6, 1.4, 0.95), MM(R, M(0, 6.3, 7.4)));
  }
  // tejados de las pandas: a un agua, del muro exterior (alto) a la arquería (baja)
  for (let f = 0; f < 4; f++) { const R = MM(K, M(0, 0, 0, f * Math.PI / 2)); B.add('tile', box(24, 0.22, 4.9, 2), MM(R, M(0, 7.55, 9.5, 0, -0.3))); }
  B.add('sandstone', new THREE.CylinderGeometry(1.1, 1.3, 0.5, 10), MM(K, M(0, 0.25, 0)));
  B.add('sandstone', box(0.35, 3.2, 0.35), MM(K, M(0, 1.8, 0))); B.add('sandstone', box(1.4, 0.3, 0.3), MM(K, M(0, 2.9, 0)));
  addCircle(kc.x, kc.z, 1.3);
  // colisiones del templo
  col(0, -7, 28.8, 54.4, { solidView: true }); col(0, -14, 40.4, 12.4, { solidView: true }); col(0, 23, 16.4, 6.2, { solidView: true });
  col(0, -38, 28, 10, { solidView: true }); col(0, -44, 18, 6, { solidView: true });
  S.add(F(M(-9.6, 2.2, 26.1)), 1.4, 0.58, plaque(['CATEDRAL DE SANTA MARÍA', 'ANDRE MARIA KATEDRALA']));
  TOWN.houses.push({ x: cx - 0, z: cz, ry, w: 28, d: 70, top: y + 30 });
  return { door: toW(cx, cz, ry, 0, 37.5), x: cx, z: cz, y, W: 28, L: 70 };
}

// ---------- Todo Pamplona ----------
export function buildPamplona(B, group, def, rnd, TOWN) {
  const S = new Signs();
  const spots = {};
  spots.plaza = plazaCastillo(B, S, rnd, TOWN);
  const th = def.landmarks.find(l => l.kind === 'townhall');
  spots.townhall = ayuntamiento(B, S, th?.x ?? -14, th?.z ?? -116, TOWN);
  palacioNavarra(B, S, 31, 84, TOWN);
  spots.estafeta = estafeta(B, S, rnd, TOWN);
  const ch = PLACES.church, church = catedral(B, S, ch.x, ch.z, TOWN);
  const lm = (k) => def.landmarks.find(l => l.kind === k) || {};
  spots.bullring = bullring(B, S, lm('bullring').x ?? 232, lm('bullring').z ?? -56, TOWN);
  spots.walls = walls(B, S, TOWN);
  spots.citadel = citadel(B, S, TOWN);
  spots.stadium = stadium(B, S, group, lm('stadium').x ?? 232, lm('stadium').z ?? 318, TOWN);
  // pavimentos y arenas: sin hierba encima
  const P = PLACES.plaza;
  noGrass((x, z) => Math.abs(x - P.x) < P.rect.hw + 5 && Math.abs(z - P.z) < P.rect.hd + 5, P.x - P.rect.hw - 6, P.z - P.rect.hd - 6, P.x + P.rect.hw + 6, P.z + P.rect.hd + 6);
  for (const c of PLACES.courts) noGrass((x, z) => Math.abs(x - c.x) < c.hw + 1 && Math.abs(z - c.z) < c.hd + 1, c.x - c.hw - 2, c.z - c.hd - 2, c.x + c.hw + 2, c.z + c.hd + 2);
  S.build(group);
  return { spots, church };
}
