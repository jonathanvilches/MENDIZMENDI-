// Borda y redil, santuario de Muskilda, mirador, cascada de Irati, carteles, muretes de piedra
import * as THREE from 'three';
import { Builder, box, gable, archRing, archPanel, colored, M, MM } from './builder.js';
import { PLACES, PATHS, MEADOW, rx, pathQuery } from './layout.js';
import { terrainHeight } from './heightfield.js';
import { addBox, addCircle, isFree } from './colliders.js';
import { bench, lamp } from './village.js';
import { mulberry32 } from '../util/math.js';

export const LANDMARKS = {};

export function buildLandmarks(scene, mats) {
  const B = new Builder(mats);
  const rnd = mulberry32(77);
  buildBorda(B, rnd);
  buildMuskilda(B, rnd);
  buildMirador(B);
  buildWaterfall(B, rnd, scene);
  buildFieldWalls(B, rnd);
  buildSigns(B, scene);
  buildHayAndProps(B, rnd);
  buildStall(B);
  buildRangerPost(B);
  const g = new THREE.Group(); B.build(g); scene.add(g);
  return g;
}

function buildBorda(B, rnd) {
  const b = PLACES.borda;
  const y = terrainHeight(b.x, b.z) - 0.2;
  const ry = Math.PI / 2; // la puerta mira al este (hacia el camino)
  const T = M(b.x, y, b.z, ry);
  const w = 9, d = 7, h = 4.2;
  B.add('stone', box(w, h + 2, d, 2.2), MM(T, M(0, (h + 2) / 2 - 2, 0)));
  const pitch = 0.8, rise = Math.tan(pitch) * d / 2;
  for (const s of [-1, 1]) B.add('slate', box(w + 1, 0.22, Math.hypot(d / 2, rise) + 0.6, 2), MM(T, M(0, h + rise / 2 - 0.2, s * (d / 4 + 0.2), 0, s * pitch)));
  for (const s of [-1, 1]) B.add('stone', gable(d, rise, 0.5), MM(T, M(s * (w / 2 - 0.25), h, 0, Math.PI / 2)));
  B.add('slate', box(w + 1.1, 0.2, 0.3), MM(T, M(0, h + rise + 0.1, 0)));
  // puerta grande de madera y ventanuco
  B.add('ashlar', archRing(1.2, 1.55, 0.3, 10), MM(T, M(0, 2.1, d / 2 + 0.05)));
  B.add('woodDark', archPanel(2.4, 3.3, 0.1), MM(T, M(0, 0, d / 2)));
  B.add('woodDark', box(0.6, 0.5, 0.1), MM(T, M(-2.8, 2.8, d / 2 + 0.02)));
  B.add('ashlar', box(0.9, 0.12, 0.3), MM(T, M(-2.8, 2.5, d / 2 + 0.1)));
  addBox(b.x, b.z, w + 0.3, d + 0.3, ry, { solidView: true });
  // redil de madera (corral) al norte de la borda
  const pen = { x: b.x + 4, z: b.z - 20, w: 16, d: 12 };
  const gate = 4;
  const post = (x, z) => { const g = terrainHeight(x, z); B.add('woodDark', new THREE.CylinderGeometry(0.09, 0.11, 1.4, 6), M(x, g + 0.55, z)); };
  const rail = (x0, z0, x1, z1) => {
    const g0 = terrainHeight(x0, z0), g1 = terrainHeight(x1, z1);
    const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
    for (const hh of [0.45, 0.95]) B.add('wood', box(0.08, 0.12, len), M((x0 + x1) / 2, (g0 + g1) / 2 + hh, (z0 + z1) / 2, ang, -Math.atan2(g1 - g0, len)));
    addBox((x0 + x1) / 2, (z0 + z1) / 2, 0.3, len, ang);
  };
  const x0 = pen.x - pen.w / 2, x1 = pen.x + pen.w / 2, z0 = pen.z - pen.d / 2, z1 = pen.z + pen.d / 2;
  const segs = [[x0, z0, x1, z0], [x1, z0, x1, z1], [x0, z1, x0, z0], [x0, z1, pen.x - gate / 2, z1], [pen.x + gate / 2, z1, x1, z1]];
  for (const [a, b2, c, d2] of segs) {
    const n = Math.max(1, Math.round(Math.hypot(c - a, d2 - b2) / 2.5));
    for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n; rail(a + (c - a) * t0, b2 + (d2 - b2) * t0, a + (c - a) * t1, b2 + (d2 - b2) * t1); post(a + (c - a) * t0, b2 + (d2 - b2) * t0); }
    post(c, d2);
  }
  // abrevadero
  const tx = pen.x + 4, tz = pen.z - 3;
  B.add('ashlar', box(2.4, 0.6, 0.8), M(tx, terrainHeight(tx, tz) + 0.3, tz));
  LANDMARKS.pen = pen;
  LANDMARKS.borda = { x: b.x, z: b.z, door: { x: b.x + d / 2 + 1.5, z: b.z } };
}

function buildMuskilda(B, rnd) {
  const m = PLACES.muskilda;
  const y = terrainHeight(m.x, m.z) - 0.2;
  const ry = -Math.PI / 2; // portada hacia el oeste (llegada del sendero)
  const T = M(m.x + 4, y, m.z, ry);
  const W = 8.5, L = 17, H = 7.5;
  B.add('stone', box(W, H + 2, L, 2.2), MM(T, M(0, (H + 2) / 2 - 2, 0)));
  // ábside semicircular románico
  B.add('stone', new THREE.CylinderGeometry(W / 2 - 0.2, W / 2 - 0.2, H - 1, 14, 1, false, Math.PI / 2, Math.PI), MM(T, M(0, (H - 1) / 2, -L / 2)));
  B.add('slate', new THREE.ConeGeometry(W / 2 + 0.3, 2.6, 14, 1, false, Math.PI / 2, Math.PI), MM(T, M(0, H - 1 + 1.3, -L / 2)));
  const pitch = 0.55, rise = Math.tan(pitch) * W / 2;
  for (const s of [-1, 1]) B.add('slate', box(Math.hypot(W / 2, rise) + 0.6, 0.25, L + 0.8, 2), MM(T, M(s * (W / 4 + 0.25), H + rise / 2 - 0.15, 0, 0, 0, -s * pitch)));
  B.add('stone', gable(W, rise, 0.5), MM(T, M(0, H, L / 2 - 0.25)));
  // portada románica con arquivoltas
  const F = MM(T, M(0, 0, L / 2));
  for (let k = 0; k < 3; k++) {
    const r = 1.1 + k * 0.3;
    B.add('ashlar', archRing(r, r + 0.28, 0.5, 14), MM(F, M(0, 2.6, 0.2 + k * 0.1)));
    for (const s of [-1, 1]) B.add('ashlar', box(0.28, 2.6, 0.5), MM(F, M(s * (r + 0.14), 1.3, 0.2 + k * 0.1)));
  }
  B.add('woodDark', archPanel(2.2, 3.7, 0.1), MM(F, M(0, 0, 0.05)));
  B.add('glass', new THREE.CircleGeometry(0.5, 12), MM(F, M(0, 5.6, 0.05)));
  B.add('ashlar', new THREE.TorusGeometry(0.55, 0.12, 5, 14), MM(F, M(0, 5.6, 0.1)));
  // pórtico lateral con columnas de madera
  for (let i = 0; i < 6; i++) B.add('woodDark', new THREE.CylinderGeometry(0.14, 0.16, 3.2, 8), MM(T, M(W / 2 + 2.6, 1.6, -L / 2 + 2 + i * (L - 4) / 5)));
  B.add('slate', box(3.6, 0.2, L), MM(T, M(W / 2 + 1.7, 3.5, 0, 0, 0, -0.3)));
  B.add('woodDark', box(0.3, 0.3, L), MM(T, M(W / 2 + 2.6, 3.25, 0)));
  // torre de Muskilda: base cuadrada y cuerpo cilíndrico con chapitel cónico
  const TT = MM(T, M(0, 0, -L / 2 + 3.2));
  B.add('stone', box(4.2, H + 5, 4.2, 2.2), MM(TT, M(0, (H + 5) / 2, 0)));
  B.add('stone', new THREE.CylinderGeometry(2.0, 2.1, 5, 14), MM(TT, M(0, H + 5 + 2.5, 0)));
  for (let s = 0; s < 4; s++) B.add('glass', archPanel(0.8, 1.8, 0.1), MM(TT, M(Math.sin(s * Math.PI / 2) * 2.02, H + 6.8, Math.cos(s * Math.PI / 2) * 2.02, s * Math.PI / 2)));
  B.add('slate', new THREE.ConeGeometry(2.3, 4.5, 14), MM(TT, M(0, H + 10 + 2.25, 0)));
  B.add('iron', box(0.08, 1.2, 0.08), MM(TT, M(0, H + 15, 0)));
  B.add('iron', box(0.6, 0.08, 0.08), MM(TT, M(0, H + 15.2, 0)));
  // explanada: bancos, fuente y muro
  const c = Math.cos(ry), s = Math.sin(ry);
  addBox(m.x + 4, m.z, L + 1, W + 1, ry, { solidView: true });
  addBox(m.x + 4 + (W / 2 + 2.6) * c, m.z - (W / 2 + 2.6) * s, 0.4, L, ry);
  for (let i = 0; i < 4; i++) { const a = Math.PI * 0.6 + i * 0.35; const x = m.x + Math.cos(a) * 14, z = m.z + Math.sin(a) * 14; bench(B, x, terrainHeight(x, z), z, Math.atan2(m.x - x, m.z - z)); }
  LANDMARKS.muskilda = { x: m.x, z: m.z, door: { x: m.x + 4 - (L / 2 + 2) * 1, z: m.z }, dance: { x: m.x - 12, z: m.z + 2 } };
}

function buildMirador(B) {
  const p = PLACES.mirador;
  const y = terrainHeight(p.x, p.z);
  B.add('wood', box(6, 0.15, 4), M(p.x, y + 0.3, p.z));
  for (const [dx, dz] of [[-2.9, -1.9], [2.9, -1.9], [-2.9, 1.9], [2.9, 1.9]]) B.add('woodDark', new THREE.CylinderGeometry(0.08, 0.08, 1.4, 6), M(p.x + dx, y + 0.9, p.z + dz));
  B.add('wood', box(6, 0.1, 0.1), M(p.x, y + 1.5, p.z - 1.9));
  B.add('wood', box(0.1, 0.1, 4), M(p.x - 2.9, y + 1.5, p.z));
  B.add('wood', box(0.1, 0.1, 4), M(p.x + 2.9, y + 1.5, p.z));
  addBox(p.x, p.z - 2.1, 6, 0.3, 0);
  bench(B, p.x, y + 0.35, p.z + 1, Math.PI);
  // prismáticos fijos del mirador
  B.add('iron', new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), M(p.x + 1.8, y + 0.9, p.z - 1.3));
  B.add('iron', box(0.35, 0.16, 0.4), M(p.x + 1.8, y + 1.55, p.z - 1.3, 0, 0.2));
  LANDMARKS.mirador = { x: p.x, z: p.z, y };
}

function buildWaterfall(B, rnd, scene) {
  const w = PLACES.waterfall, p = PLACES.pond;
  const face = Math.atan2(p.x - w.x, p.z - w.z);
  const fx = Math.sin(face), fz = Math.cos(face), sx = Math.cos(face), sz = -Math.sin(face);
  const h = 9, lvl = p.level;
  // pared de roca detrás de la cascada
  B.add('stoneDark', box(16, h + 6, 6, 3), M(w.x - fx * 3.4, lvl + (h + 6) / 2 - 3, w.z - fz * 3.4, face));
  for (let i = 0; i < 16; i++) {
    const side = (i % 2 ? 1 : -1) * (3 + rnd() * 6);
    const back = 1 + rnd() * 3;
    const s = 1.6 + rnd() * 2.2;
    B.add('stoneDark', new THREE.DodecahedronGeometry(s, 0), M(w.x + sx * side - fx * back, lvl - 0.5 + rnd() * (h + 1.5), w.z + sz * side - fz * back, rnd() * 6, rnd(), 0, 1, 1.2, 1));
  }
  for (let i = 0; i < 6; i++) B.add('stoneDark', new THREE.DodecahedronGeometry(0.8 + rnd(), 0), M(w.x + fx * (1.5 + rnd() * 2) + sx * (rnd() - 0.5) * 6, lvl - 0.2, w.z + fz * (1.5 + rnd() * 2) + sz * (rnd() - 0.5) * 6, rnd() * 6));
  addBox(w.x - fx * 3.4, w.z - fz * 3.4, 16, 7, face, { solidView: true });
  LANDMARKS.waterfall = { x: w.x + fx * 0.2, z: w.z + fz * 0.2, top: lvl + h, bottom: lvl, face };
}

function buildFieldWalls(B, rnd) {
  // muretes de piedra seca alrededor de prados
  const loops = [
    [[-170, 70], [-120, 64], [-110, 130], [-175, 140], [-170, 70]],
    [[-300, -20], [-250, -40], [-200, -30]],
    [[110, 60], [170, 50], [200, 100]],
  ];
  for (const L of loops) for (let i = 0; i < L.length - 1; i++) {
    const [x0, z0] = L[i], [x1, z1] = L[i + 1];
    const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 2);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      const p = pathQuery(x, z); if (p.d < p.w + 1) continue;
      const g = terrainHeight(x, z);
      B.add('stone', box(0.7, 1.0, 2.1, 1.2), M(x, g + 0.35, z, Math.atan2(x1 - x0, z1 - z0), 0, (rnd() - 0.5) * 0.06));
      addBox(x, z, 0.8, 2.1, Math.atan2(x1 - x0, z1 - z0));
    }
  }
}

// Carteles de madera con texto
function signTexture(lines) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64 * lines.length;
  const g = c.getContext('2d');
  lines.forEach((l, i) => {
    g.fillStyle = '#8a5a32'; g.fillRect(0, i * 64, 256, 64);
    g.fillStyle = '#6b4424'; g.fillRect(0, i * 64 + 58, 256, 6);
    g.fillStyle = '#fff4dc'; g.font = 'bold 30px "Trebuchet MS", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(l, 128, i * 64 + 32);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function buildSigns(B, scene) {
  const signs = [
    { x: PLACES.plaza.x + 13, z: -12, lines: ['↗ Muskilda', '→ Frontón'] },
    { x: rx(-96) - 19, z: -98, lines: ['↑ Selva de Irati', '← Iglesia'] },
    { x: PLACES.church.x - 14, z: -38, lines: ['← Borda', '↑ Mirador'] },
    { x: PLACES.crucero.x + 5, z: PLACES.crucero.z - 4, lines: ['OTSAGABIA', 'Ochagavía'] },
    { x: rx(-298) - 20, z: -296, lines: ['→ Balsa', '↑ Irati'] },
  ];
  for (const s of signs) {
    const y = terrainHeight(s.x, s.z);
    B.add('woodDark', new THREE.CylinderGeometry(0.08, 0.1, 2.6, 6), M(s.x, y + 1.2, s.z));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4 * s.lines.length), new THREE.MeshStandardMaterial({ map: signTexture(s.lines), side: THREE.DoubleSide, roughness: 0.9 }));
    m.position.set(s.x, y + 2.3 - 0.2 * s.lines.length, s.z);
    m.rotation.y = Math.random() * 0.6 - 0.3 + Math.PI / 4;
    m.castShadow = true;
    scene.add(m);
    addCircle(s.x, s.z, 0.2);
  }
}

function buildHayAndProps(B, rnd) {
  // balas de heno redondas en los prados
  for (let i = 0; i < 10; i++) {
    const x = -150 + rnd() * 50, z = 80 + rnd() * 50;
    if (!isFree(x, z, 1.5)) continue;
    const g = new THREE.CylinderGeometry(0.8, 0.8, 1.2, 14);
    B.add('paint', colored(g, '#d8b865'), M(x, terrainHeight(x, z) + 0.8, z, rnd() * 3, 0, Math.PI / 2));
    addCircle(x, z, 0.9);
  }
  // leña apilada junto a la borda
  const b = PLACES.borda;
  for (let i = 0; i < 12; i++) B.add('woodDark', new THREE.CylinderGeometry(0.12, 0.12, 1.1, 6), M(b.x - 5.2, terrainHeight(b.x - 5, b.z) + 0.15 + Math.floor(i / 4) * 0.23, b.z - 1.5 + (i % 4) * 0.26, 0, 0, Math.PI / 2));
  addBox(b.x - 5.2, b.z - 1.1, 1.2, 1.2, 0);
}

// Puesto de quesos en la plaza
function buildStall(B) {
  const x = PLACES.plaza.x, z = PLACES.plaza.z - 12.3;
  const y = terrainHeight(x, z);
  B.add('wood', box(3.4, 0.12, 1.1), M(x, y + 0.95, z));
  B.add('woodDark', box(3.3, 0.9, 1.0), M(x, y + 0.45, z));
  for (const dx of [-1.6, 1.6]) for (const dz of [-0.9, 0.5]) B.add('woodDark', new THREE.CylinderGeometry(0.05, 0.05, 2.5, 5), M(x + dx, y + 1.25, z + dz));
  // toldo a rayas
  for (let i = 0; i < 6; i++) B.add('paint', colored(box(3.6 / 6, 0.05, 1.8), i % 2 ? '#f4efe6' : '#c0392b'), M(x - 1.5 + i * 0.6, y + 2.45, z - 0.2, 0, -0.18));
  // quesos
  for (let i = 0; i < 5; i++) {
    const g = new THREE.CylinderGeometry(0.2, 0.2, 0.14, 14);
    B.add('paint', colored(g, i % 2 ? '#e9c77b' : '#d9a856'), M(x - 1.2 + i * 0.6, y + 1.08, z + 0.15));
  }
  B.add('paint', colored(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 14), '#e2b86a'), M(x - 0.3, y + 1.22, z + 0.15));
  addBox(x, z, 3.5, 1.2, 0);
  LANDMARKS.stall = { x, z };
}

// Caseta del guarda de Irati
function buildRangerPost(B) {
  const x = rx(-172) - 27, z = -172;
  const y = terrainHeight(x, z) - 0.2;
  const T = M(x, y, z, Math.PI / 2);
  B.add('wood', box(4, 3 + 1, 3.4, 1.5), MM(T, M(0, 1.5, 0)));
  B.add('woodDark', box(4.8, 0.18, 2.4), MM(T, M(0, 3.7, 0.8, 0, 0.5)));
  B.add('woodDark', box(4.8, 0.18, 2.4), MM(T, M(0, 3.7, -0.8, 0, -0.5)));
  B.add('woodDark', box(1, 2, 0.1), MM(T, M(0.8, 1, 1.72)));
  B.add('glass', box(0.8, 0.7, 0.05), MM(T, M(-0.9, 1.8, 1.72)));
  addBox(x, z, 4.2, 3.6, Math.PI / 2, { solidView: true });
}
