// Monumentos genéricos: iglesias por estilo, castillos, murallas, puentes, cuevas, hórreos, molinos...
import * as THREE from 'three';
import { box, gable, archRing, archPanel, colored, M, MM } from './builder.js';
import { roofHip } from './houses.js';
import { terrainHeight, deckY } from './heightfield.js';
import { addBox, addCircle } from './colliders.js';

const toWorld = (x, z, ry, lx, lz) => ({ x: x + lx * Math.cos(ry) + lz * Math.sin(ry), z: z - lx * Math.sin(ry) + lz * Math.cos(ry) });
function boxCol(x, z, ry, lx, lz, w, d, meta) { const p = toWorld(x, z, ry, lx, lz); return addBox(p.x, p.z, w, d, ry, meta); }
function merlons(B, T, w, d, y, mat = 'ashlar') {
  for (const s of [-1, 1]) {
    for (let i = 0; i < Math.floor(w / 1.2); i++) B.add(mat, box(0.6, 0.7, 0.6), MM(T, M(-w / 2 + 0.6 + i * 1.2, y + 0.35, s * d / 2)));
    for (let i = 0; i < Math.floor(d / 1.2); i++) B.add(mat, box(0.6, 0.7, 0.6), MM(T, M(s * w / 2, y + 0.35, -d / 2 + 0.6 + i * 1.2)));
  }
}
function portal(B, F, r0, n, mat = 'ashlar', h = 3.4) {
  for (let k = 0; k < n; k++) {
    const r = r0 + k * 0.36;
    B.add(k % 2 ? 'ashlar' : 'stone', archRing(r, r + 0.34, 0.6 - k * 0.08, 16), MM(F, M(0, h, 0.25 + k * 0.12)));
    for (const s of [-1, 1]) B.add(mat, box(0.34, h, 0.6), MM(F, M(s * (r + 0.17), h / 2, 0.25 + k * 0.12)));
  }
  B.add('woodDark', archPanel(r0 * 2, h + r0, 0.12), MM(F, M(0, 0, 0.05)));
}
function spireTower(B, T, tw, th, roof, mat, style) {
  B.add(mat, box(tw, th + 2, tw, 2.2), MM(T, M(0, (th + 2) / 2 - 2, 0)));
  for (const y of [th * 0.35, th * 0.68]) B.add('ashlar', box(tw + 0.3, 0.3, tw + 0.3), MM(T, M(0, y, 0)));
  for (let s = 0; s < 4; s++) {
    const R = MM(T, M(0, 0, 0, s * Math.PI / 2));
    B.add('glass', archPanel(tw * 0.25, tw * 0.5, 0.1), MM(R, M(0, th - tw * 0.8, tw / 2 + 0.01)));
    B.add('ashlar', archRing(tw * 0.125, tw * 0.18, 0.3, 8), MM(R, M(0, th - tw * 0.8 + tw * 0.375, tw / 2 + 0.05)));
  }
  B.add('ashlar', box(tw + 0.5, 0.5, tw + 0.5), MM(T, M(0, th + 0.25, 0)));
  if (style === 'fortress') { merlons(B, T, tw + 0.4, tw + 0.4, th + 0.5); return th + 1.2; }
  if (style === 'baroque') {
    B.add(mat, box(tw * 0.75, tw * 0.9, tw * 0.75, 2), MM(T, M(0, th + 0.5 + tw * 0.45, 0)));
    const dome = new THREE.SphereGeometry(tw * 0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    B.add(roof === 'slate' ? 'slate' : 'tile', dome, MM(T, M(0, th + 0.5 + tw * 0.9, 0)));
    B.add('ashlar', new THREE.CylinderGeometry(0.2, 0.3, 1.2, 8), MM(T, M(0, th + 0.9 + tw * 1.3, 0)));
    B.add('iron', box(0.08, 1.4, 0.08), MM(T, M(0, th + 2 + tw * 1.3, 0)));
    return th + tw * 1.4;
  }
  const sp = new THREE.ConeGeometry(tw * 0.74, style === 'romanesque' ? tw * 0.7 : tw * 1.45, 4, 1); sp.rotateY(Math.PI / 4);
  const sh = style === 'romanesque' ? tw * 0.7 : tw * 1.45;
  B.add(roof, sp, MM(T, M(0, th + 0.5 + sh / 2, 0)));
  B.add('iron', box(0.08, 1.6, 0.08), MM(T, M(0, th + 0.5 + sh + 0.7, 0)));
  B.add('iron', box(0.8, 0.08, 0.08), MM(T, M(0, th + 0.5 + sh + 1, 0)));
  return th + sh;
}

// ---------- Iglesia (estilos: romanesque, gothic, baroque, fortress, cathedral) ----------
export function church(B, x, z, ry, style, fam) {
  const y = terrainHeight(x, z) - 0.2;
  const T = M(x, y, z, ry);
  const brick = fam === 'ribera' && style === 'baroque';
  const mat = brick ? 'brick' : 'ashlar';
  const roof = fam === 'pyrenean' || fam === 'atlantic' && style !== 'baroque' ? 'slate' : 'tile';
  const dims = { romanesque: [9, 18, 8], gothic: [12, 26, 13], baroque: [12, 24, 12], fortress: [13, 24, 14], cathedral: [18, 40, 18] }[style] || [12, 24, 12];
  const [W, L, Hh] = dims;
  B.add(mat, box(W, Hh + 2, L, 2.2), MM(T, M(0, (Hh + 2) / 2 - 2, 0)));
  B.add('stoneDark', box(W + 0.4, 1.4, L + 0.4, 2), MM(T, M(0, 0.3, 0)));
  // contrafuertes y ventanas
  const nb = Math.max(3, Math.round(L / 7));
  for (const s of [-1, 1]) for (let i = 0; i < nb; i++) {
    const zz = -L / 2 + 3 + i * (L - 6) / (nb - 1);
    if (style !== 'romanesque') B.add(mat, box(1.3, Hh - 1.5, 1.4, 2), MM(T, M(s * (W / 2 + 0.6), (Hh - 1.5) / 2, zz)));
    if (i < nb - 1) {
      const wz = zz + (L - 6) / (nb - 1) / 2;
      const wh = style === 'gothic' || style === 'cathedral' ? 3.4 : 1.8;
      B.add('glass', archPanel(style === 'romanesque' ? 0.6 : 1.1, wh, 0.1), MM(T, M(s * (W / 2 + 0.02), Hh - 3 - wh, wz, s * Math.PI / 2)));
    }
  }
  if (style === 'fortress') merlons(B, T, W, L, Hh);
  // tejado
  const pitch = style === 'romanesque' ? 0.45 : 0.6;
  const rise = Math.tan(pitch) * W / 2, ov = 0.5;
  for (const s of [-1, 1]) B.add(roof, box(Math.hypot(W / 2, rise) + ov, 0.3, L + 1, 2), MM(T, M(s * (W / 4 + ov / 2 * Math.cos(pitch)), Hh + rise / 2 - Math.sin(pitch) * ov / 2 + 0.1, 0, 0, 0, -s * pitch)));
  B.add(mat, gable(W, rise, 0.6), MM(T, M(0, Hh, L / 2 - 0.3)));
  B.add(mat, gable(W, rise, 0.6), MM(T, M(0, Hh, -L / 2 + 0.3)));
  // ábside
  const apseSeg = style === 'romanesque' ? 14 : 7;
  B.add(mat, new THREE.CylinderGeometry(W / 2 - 0.3, W / 2 - 0.3, Hh - 1, apseSeg, 1, false, Math.PI / 2, Math.PI), MM(T, M(0, (Hh - 1) / 2, -L / 2)));
  B.add(roof, new THREE.ConeGeometry(W / 2 + 0.2, 3.6, apseSeg, 1, false, Math.PI / 2, Math.PI), MM(T, M(0, Hh - 1 + 1.8, -L / 2)));
  const F = MM(T, M(0, 0, L / 2));
  if (style === 'cathedral') {
    // fachada con pórtico de columnas y dos torres
    for (let i = 0; i < 6; i++) B.add('ashlar', new THREE.CylinderGeometry(0.5, 0.55, 9, 12), MM(F, M(-W / 2 + 2 + i * (W - 4) / 5, 4.5, 2.2)));
    B.add('ashlar', box(W, 1.2, 3.6), MM(F, M(0, 9.6, 2)));
    B.add('ashlar', gable(W, 3.4, 3.6), MM(F, M(0, 10.2, 2)));
    portal(B, F, 1.8, 3, mat, 4.4);
    for (const s of [-1, 1]) spireTower(B, MM(F, M(s * (W / 2 - 3), 0, -2)), 6, Hh + 14, 'slate', mat, 'baroque');
    // cimborrio
    B.add(mat, new THREE.CylinderGeometry(5, 5, 6, 8), MM(T, M(0, Hh + 3, -L * 0.2)));
    B.add('slate', new THREE.ConeGeometry(5.6, 6, 8), MM(T, M(0, Hh + 9, -L * 0.2)));
    // claustro
    for (let i = 0; i < 8; i++) B.add('ashlar', new THREE.CylinderGeometry(0.22, 0.22, 3, 8), MM(T, M(W / 2 + 3 + (i % 4) * 3.5, 1.5, -L / 2 + 4 + Math.floor(i / 4) * 12)));
  } else {
    portal(B, F, style === 'romanesque' ? 1.2 : 1.5, style === 'romanesque' ? 4 : 3, mat, 3.4);
    if (style === 'gothic') { B.add('ashlar', new THREE.TorusGeometry(1.25, 0.25, 6, 20), MM(F, M(0, Hh - 4.6, 0.15))); B.add('glass', new THREE.CircleGeometry(1.2, 20), MM(F, M(0, Hh - 4.6, 0.06))); }
    if (style === 'baroque') { for (const s of [-1, 1]) B.add(mat, box(0.7, Hh, 0.5), MM(F, M(s * 3.2, Hh / 2, 0.2))); B.add(mat, box(W, 0.6, 0.6), MM(F, M(0, Hh * 0.62, 0.2))); }
    // torre en un lateral de la cabecera
    const tw = style === 'fortress' ? 7.5 : style === 'romanesque' ? 5 : 6.4;
    const th = style === 'fortress' ? Hh + 14 : style === 'romanesque' ? Hh + 6 : Hh + 13;
    const TT = MM(T, M(style === 'baroque' ? W / 2 + tw / 2 - 0.5 : W / 2 + tw / 2 + 0.3, 0, style === 'baroque' ? L / 2 - tw / 2 : -L / 2 + tw));
    spireTower(B, TT, tw, th, roof, mat, style);
    const tp = toWorld(x, z, ry, style === 'baroque' ? W / 2 + tw / 2 - 0.5 : W / 2 + tw / 2 + 0.3, style === 'baroque' ? L / 2 - tw / 2 : -L / 2 + tw);
    addBox(tp.x, tp.z, tw + 0.4, tw + 0.4, ry, { solidView: true });
  }
  // escalinata
  for (let i = 0; i < 4; i++) B.add('ashlar', box(8 - i * 0.6, 0.3, 1.2), MM(F, M(0, 0.15 - i * 0.3, (style === 'cathedral' ? 4.5 : 1.3) + i * 1.1)));
  addBox(x, z, W + 3, L + 2, ry, { solidView: true });
  if (style === 'cathedral') boxCol(x, z, ry, W / 2 + 7, -L / 2 + 10, 12, 16);
  const door = toWorld(x, z, ry, 0, L / 2 + (style === 'cathedral' ? 8 : 5));
  return { door, x, z, y, W, L };
}

// ---------- Castillo (Olite, Cortes) ----------
export function castle(B, x, z, ry, big) {
  const y = terrainHeight(x, z) - 0.3;
  const T = M(x, y, z, ry);
  const W = big ? 44 : 30, D = big ? 34 : 26, Hh = big ? 12 : 10;
  for (const [lx, lz, w, d] of [[0, -D / 2, W, 2], [0, D / 2, W, 2], [-W / 2, 0, 2, D], [W / 2, 0, 2, D]]) {
    const gate = lz === D / 2;
    if (gate) {
      for (const s of [-1, 1]) { B.add('ashlar', box(W / 2 - 3, Hh, 2, 2.4), MM(T, M(s * (W / 4 + 1.5), Hh / 2, lz))); boxCol(x, z, ry, s * (W / 4 + 1.5), lz, W / 2 - 3, 2.4, { solidView: true }); }
      B.add('ashlar', archRing(3, 3.6, 2.2, 12), MM(T, M(0, Hh - 5, lz)));
      B.add('ashlar', box(7.2, 2.4, 2), MM(T, M(0, Hh - 1.2, lz)));
    } else { B.add('ashlar', box(w, Hh, d, 2.4), MM(T, M(lx, Hh / 2, lz))); boxCol(x, z, ry, lx, lz, w + 0.4, d + 0.4, { solidView: true }); }
    // almenas
    const n = Math.floor(Math.max(w, d) / 1.4);
    for (let i = 0; i < n; i++) B.add('ashlar', box(w > d ? 0.7 : 2.2, 0.8, w > d ? 2.2 : 0.7), MM(T, M(w > d ? lx - w / 2 + 0.7 + i * 1.4 : lx, Hh + 0.4, w > d ? lz : lz - d / 2 + 0.7 + i * 1.4)));
  }
  // torres (Olite: muchas, de alturas distintas, con chapiteles)
  const towers = big ? [[-W / 2, -D / 2, 7, 26, 'sq'], [W / 2, -D / 2, 6, 22, 'oct'], [-W / 2, D / 2, 6, 20, 'sq'], [W / 2, D / 2, 7, 24, 'sq'], [0, -D / 2, 8, 30, 'sq'], [W / 4, 0, 5, 18, 'rd'], [-W / 4, -4, 6, 21, 'oct'], [-W / 2, 0, 5, 17, 'rd']]
    : [[-W / 2, -D / 2, 6, 16, 'sq'], [W / 2, -D / 2, 6, 16, 'sq'], [-W / 2, D / 2, 6, 15, 'rd'], [W / 2, D / 2, 6, 15, 'rd'], [0, -D / 2, 7, 20, 'sq']];
  for (const [lx, lz, tw, th, sh] of towers) {
    const TT = MM(T, M(lx, 0, lz));
    const geo = sh === 'sq' ? box(tw, th + 2, tw, 2.4) : new THREE.CylinderGeometry(tw / 2, tw / 2 + 0.3, th + 2, sh === 'oct' ? 8 : 14);
    B.add('ashlar', geo, MM(TT, M(0, (th + 2) / 2 - 2, 0)));
    for (let k = 0; k < 3; k++) B.add('glass', archPanel(0.7, 1.4, 0.1), MM(TT, M(0, th * (0.4 + k * 0.18), tw / 2 + 0.02)));
    if (sh === 'sq' && tw > 6.5) merlons(B, TT, tw + 0.4, tw + 0.4, th);
    else { const c = new THREE.ConeGeometry(tw * 0.72, tw * 1.3, sh === 'sq' ? 4 : sh === 'oct' ? 8 : 14); if (sh === 'sq') c.rotateY(Math.PI / 4); B.add('slate', c, MM(TT, M(0, th + tw * 0.65, 0))); }
    const p = toWorld(x, z, ry, lx, lz); addBox(p.x, p.z, tw + 0.4, tw + 0.4, ry, { solidView: true });
  }
  // jardín interior con un árbol y pozo
  B.add('stone', new THREE.CylinderGeometry(1, 1, 0.9, 12, 1, true), MM(T, M(4, 0.45, 4)));
  addCircle(...Object.values(toWorld(x, z, ry, 4, 4)), 1.1);
  return { x, z, y, gate: toWorld(x, z, ry, 0, D / 2 + 5) };
}

// ---------- Murallas (cerco con torreones o lienzo de ciudad) ----------
export function wallsRing(B, cx, cz, r, towers = 9, gateAngle = Math.PI / 2) {
  const n = 40;
  for (let i = 0; i < n; i++) {
    const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, am = (a0 + a1) / 2;
    if (Math.abs(Math.atan2(Math.sin(am - gateAngle), Math.cos(am - gateAngle))) < 0.12) continue;
    const x = cx + Math.cos(am) * r, z = cz + Math.sin(am) * r;
    const len = 2 * r * Math.sin(Math.PI / n) + 0.3;
    const y = terrainHeight(x, z);
    B.add('stone', box(1.6, 7 + 2, len, 2.2), M(x, y + 3.5 - 1, z, -am));
    for (let k = 0; k < 2; k++) B.add('stone', box(1.8, 0.8, 0.8), M(x, y + 7.4, z, -am, 0, 0).multiply(M(0, 0, (k - 0.5) * len * 0.5)));
    addBox(x, z, 1.8, len, -am, { solidView: true });
  }
  for (let t = 0; t < towers; t++) {
    const a = gateAngle + Math.PI / towers + t / towers * Math.PI * 2;
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, y = terrainHeight(x, z);
    B.add('stone', box(5, 12, 5, 2.2), M(x, y + 5, z, -a));
    const T = M(x, y, z, -a); merlons(B, T, 5.2, 5.2, 11);
    addBox(x, z, 5.2, 5.2, -a, { solidView: true });
  }
}

// ---------- Puentes (uno o varios arcos) ----------
export function bridge(B, b, riverInfo) {
  const L = b.xb - b.xa, N = 36;
  const r = riverInfo(b.cx, b.z);
  const bed = r.level - 1.6;
  const nArch = b.big ? Math.max(3, Math.round((2 * r.half + 6) / 7)) : r.half > 6 ? 3 : 1;
  const archR = nArch === 1 ? r.half + 1 : (2 * r.half + 6) / nArch / 2 - 0.9;
  const s = new THREE.Shape();
  s.moveTo(-L / 2, bed - 1);
  for (let i = 0; i <= N; i++) { const lx = -L / 2 + L * i / N; s.lineTo(lx, deckY(b, b.cx + lx) - 0.05); }
  s.lineTo(L / 2, bed - 1);
  const holes = [];
  for (let k = nArch - 1; k >= 0; k--) {
    const c = (k - (nArch - 1) / 2) * (2 * archR + 1.8);
    const spring = bed + 0.4, ah = Math.max(1.2, Math.min(archR * (nArch === 1 ? 1.02 : 0.95), Math.min(deckY(b, b.cx + c - archR), deckY(b, b.cx + c), deckY(b, b.cx + c + archR)) - 1.25 - spring));
    s.lineTo(c + archR, bed - 1); s.lineTo(c + archR, spring);
    for (let i = 1; i < 16; i++) { const a = Math.PI * i / 16; s.lineTo(c + Math.cos(a) * archR, spring + Math.sin(a) * ah); }
    s.lineTo(c - archR, spring); s.lineTo(c - archR, bed - 1);
    holes.push({ c, archR, spring, ah });
  }
  s.lineTo(-L / 2, bed - 1);
  const g = new THREE.ExtrudeGeometry(s, { depth: b.w, bevelEnabled: false });
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.2, uv.getY(i) / 2.2);
  B.add('stone', g, M(b.cx, 0, b.z - b.w / 2));
  for (const h of holes) for (const side of [-1, 1]) for (let i = 0; i < 13; i++) {
    const a0 = Math.PI * i / 13, a1 = Math.PI * (i + 1) / 13, am = (a0 + a1) / 2;
    B.add('ashlar', box(0.62, Math.hypot(h.archR * (Math.cos(a1) - Math.cos(a0)), h.ah * (Math.sin(a1) - Math.sin(a0))) + 0.04, 0.25, 1), M(b.cx + h.c + Math.cos(am) * (h.archR + 0.31), h.spring + Math.sin(am) * (h.ah + 0.31), b.z + side * (b.w / 2 + 0.06), 0, 0, Math.atan2(Math.sin(am) * h.archR, Math.cos(am) * h.ah)));
  }
  // tajamares entre arcos
  for (let k = 0; k < holes.length - 1; k++) {
    const c = (holes[k].c + holes[k + 1].c) / 2;
    for (const side of [-1, 1]) B.add('stone', new THREE.CylinderGeometry(0.01, 1.3, 3.2, 3), M(b.cx + c, bed + 1.2, b.z + side * (b.w / 2 + 0.5), side > 0 ? Math.PI / 6 : -Math.PI / 6 + Math.PI));
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 18; i++) {
      const x0 = b.xa + 1 + (L - 2) * i / 18, x1 = b.xa + 1 + (L - 2) * (i + 1) / 18;
      const y0 = deckY(b, x0), y1 = deckY(b, x1);
      const len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0);
      B.add('stone', box(len + 0.04, 0.85, 0.42, 1.6), M((x0 + x1) / 2, (y0 + y1) / 2 + 0.42, b.z + side * (b.w / 2 - 0.21), 0, 0, ang));
      B.add('ashlar', box(len + 0.06, 0.14, 0.55, 1), M((x0 + x1) / 2, (y0 + y1) / 2 + 0.9, b.z + side * (b.w / 2 - 0.21), 0, 0, ang));
    }
    addBox(b.cx, b.z + side * (b.w / 2 - 0.2), L - 2, 0.45, 0);
  }
}

// ---------- Otros elementos ----------
export function landmark(B, lm, ctx) {
  const { x, z } = lm;
  const y = terrainHeight(x, z);
  const T = M(x, y, z, lm.ry || 0);
  const col = (w, d, meta) => addBox(x, z, w, d, lm.ry || 0, meta);
  switch (lm.kind) {
    case 'towerhouse': {
      B.add('stone', box(8, 16, 8, 2.2), MM(T, M(0, 7, 0)));
      for (let i = 0; i < 3; i++) B.add('glass', archPanel(0.8, 1.6, 0.1), MM(T, M(0, 4 + i * 4, 4.02)));
      roofHip(B, T, 8, 8, 15, 3, 'tile');
      col(8.4, 8.4, { solidView: true }); return { x, z: z + 6 };
    }
    case 'palace': case 'house': return null; // se hacen como casas especiales
    case 'arch': {
      for (const s of [-1, 1]) B.add('ashlar', box(1.6, 6, 2), MM(T, M(s * 3, 3, 0)));
      B.add('ashlar', archRing(2.2, 3.4, 2, 12), MM(T, M(0, 4, 0)));
      B.add('ashlar', box(8, 1.2, 2), MM(T, M(0, 7.2, 0)));
      for (const s of [-1, 1]) addBox(x + s * 3, z, 1.8, 2.2, 0); return { x, z: z + 3 };
    }
    case 'stelae': {
      for (let i = 0; i < 5; i++) { const lx = -4 + i * 2; B.add('ashlar', box(0.25, 0.7, 0.4), MM(T, M(lx, 0.35, 0))); B.add('ashlar', new THREE.CylinderGeometry(0.45, 0.45, 0.2, 16).rotateX(Math.PI / 2), MM(T, M(lx, 1.1, 0))); }
      return { x, z: z + 2 };
    }
    case 'palomeras': {
      for (let i = 0; i < 3; i++) { B.add('woodDark', new THREE.CylinderGeometry(0.15, 0.18, 11, 6), MM(T, M(-6 + i * 6, 5.5, 0))); }
      const net = new THREE.PlaneGeometry(12, 8, 12, 8); B.add('paint', colored(net, '#d9d2bf'), MM(T, M(0, 5.5, 0)));
      B.add('woodDark', box(3, 2.6, 2.4), MM(T, M(0, 1.3, 6))); B.add('tile', box(3.6, 0.2, 3), MM(T, M(0, 2.8, 6, 0, 0.2)));
      B.add('woodDark', new THREE.CylinderGeometry(0.1, 0.1, 5, 5), MM(T, M(9, 2.5, 3))); B.add('woodDark', box(3, 0.2, 3), MM(T, M(9, 5, 3)));
      col(13, 1); return { x, z: z + 4 };
    }
    case 'cave': {
      // gran roca con una boca en arco
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI, rr = 9 + (i % 3); B.add('stoneDark', new THREE.DodecahedronGeometry(3.4 + (i % 4) * 0.6, 0), MM(T, M(Math.cos(a) * rr, Math.sin(a) * 8 - 1, -2 - (i % 2) * 3, i, i * 0.5, 0))); }
      B.add('stoneDark', box(26, 16, 10, 4), MM(T, M(0, 6, -9)));
      B.add('dark', archPanel(9, 9, 0.5), MM(T, M(0, -0.5, -4)));
      addBox(x, z - 9, 26, 10, 0, { solidView: true }); for (const s of [-1, 1]) addBox(x + s * 9.5, z - 3, 5, 6, 0);
      return { x, z: z + 3 };
    }
    case 'monolith': {
      B.add('ashlar', box(1.4, 6, 1.4), MM(T, M(0, 3, 0))); B.add('ashlar', box(3, 0.6, 3), MM(T, M(0, 0.3, 0)));
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; B.add('stone', box(2.5, 1.2 + (i % 3) * 0.6, 1), MM(T, M(Math.cos(a) * 8, 0.5, Math.sin(a) * 8, -a))); }
      col(3, 3); return { x, z: z + 3 };
    }
    case 'ruin': {
      for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; const hh = 2 + ((i * 37) % 5); B.add('stone', box(4, hh, 1.2, 2), MM(T, M(Math.cos(a) * 7, hh / 2 - 0.5, Math.sin(a) * 7, -a + Math.PI / 2))); }
      B.add('stone', box(5, 9, 5, 2), MM(T, M(-3, 4, -3)));
      col(5, 5); return { x, z: z + 9 };
    }
    case 'mill': {
      B.add('stone', box(9, 8, 7, 2.2), MM(T, M(0, 3, 0))); roofHip(B, T, 9, 7, 7, 2.6, 'tile');
      const wheel = new THREE.CylinderGeometry(3, 3, 0.6, 16, 1, true); wheel.rotateZ(Math.PI / 2);
      B.add('woodDark', wheel, MM(T, M(5, 2.4, 0)));
      for (let i = 0; i < 8; i++) B.add('wood', box(0.3, 6, 0.4), MM(T, M(5, 2.4, 0, 0, i * Math.PI / 8)));
      B.add('woodDark', box(0.4, 0.4, 3), MM(T, M(5, 2.4, 0)));
      col(9.5, 7.5, { solidView: true }); return { x: x - 6, z };
    }
    case 'horreo': {
      for (const [lx, lz] of [[-2, -1.5], [2, -1.5], [-2, 1.5], [2, 1.5], [0, -1.5], [0, 1.5]]) { B.add('ashlar', new THREE.CylinderGeometry(0.25, 0.35, 1.8, 8), MM(T, M(lx, 0.9, lz))); B.add('ashlar', new THREE.CylinderGeometry(0.55, 0.55, 0.15, 10), MM(T, M(lx, 1.85, lz))); }
      B.add('wood', box(5.6, 2.4, 4, 1.2), MM(T, M(0, 3.1, 0)));
      roofHip(B, MM(T, M(0, 4.3, 0)), 5.6, 4, 0, 1.8, 'slate');
      col(5.8, 4.2); return { x, z: z + 4 };
    }
    case 'chapel': {
      B.add('stone', box(6, 5, 9, 2.2), MM(T, M(0, 2, 0)));
      for (const s of [-1, 1]) B.add('slate', box(4.2, 0.2, 9.6), MM(T, M(s * 1.6, 5.2, 0, 0, 0, -s * 0.5)));
      B.add('stone', gable(6, 1.9, 0.4), MM(T, M(0, 4.5, 4.3)));
      B.add('woodDark', archPanel(1.6, 2.6, 0.1), MM(T, M(0, 0, 4.55)));
      B.add('stone', box(1, 2.2, 0.5), MM(T, M(0, 7, 4.3))); B.add('iron', box(0.1, 1, 0.1), MM(T, M(0, 8.5, 4.3)));
      col(6.4, 9.4, { solidView: true }); return { x, z: z + 7 };
    }
    case 'cross': case 'stone': {
      if (lm.kind === 'cross') { for (let i = 0; i < 3; i++) B.add('ashlar', new THREE.CylinderGeometry(1.8 - i * 0.5, 1.8 - i * 0.5, 0.3, 8), MM(T, M(0, 0.15 + i * 0.3, 0))); B.add('ashlar', box(0.3, 4, 0.3), MM(T, M(0, 2.8, 0))); B.add('ashlar', box(1.4, 0.3, 0.3), MM(T, M(0, 4.2, 0))); }
      else { B.add('ashlar', box(1.2, 1.4, 0.6), MM(T, M(0, 0.7, 0))); B.add('ashlar', box(1.1, 0.12, 0.55), MM(T, M(0, 1.45, 0))); }
      addCircle(x, z, 1.5); return { x, z: z + 3 };
    }
    case 'dolmen': {
      // losas en bruto (sin labrar, con bordes irregulares), cámara abierta por delante, gran losa de cubierta
      // inclinada y restos del túmulo: un anillo bajo de tierra y piedras alrededor
      const slab = (w, h, d, seed) => { const g = new THREE.BoxGeometry(w, h, d, 4, 4, 2), p = g.attributes.position; let r = seed; const rn = () => ((r = (r * 9301 + 49297) % 233280) / 233280 - 0.5);
        for (let i = 0; i < p.count; i++) { const e = Math.abs(p.getX(i)) > w / 2 - 1e-3 || Math.abs(p.getY(i)) > h / 2 - 1e-3; p.setXYZ(i, p.getX(i) * (1 + rn() * 0.18), p.getY(i) * (1 + (e ? rn() * 0.2 : 0)), p.getZ(i) * (1 + rn() * 0.35)); }
        g.computeVertexNormals(); return g; };
      B.add('rock', slab(0.45, 2.1, 2.2, 11), MM(T, M(-1.3, 0.95, -0.2, 0, 0.08, 0.05)));
      B.add('rock', slab(0.45, 1.9, 2.0, 23), MM(T, M(1.35, 0.85, -0.1, 0, -0.06, -0.06)));
      B.add('rock', slab(0.45, 2.0, 2.6, 37), MM(T, M(0, 0.9, -1.35, 0, Math.PI / 2, 0.04)));
      B.add('rock', slab(3.8, 0.55, 3.2, 51), MM(T, M(0.05, 2.05, -0.35, 0.06, 0.12, 0.04)));
      // túmulo: anillo de tierra con hierba y piedras sueltas
      const mound = new THREE.TorusGeometry(4.6, 1.3, 6, 22); mound.rotateX(Math.PI / 2); mound.scale(1, 0.35, 1);
      B.add('paint', colored(mound, '#7a8a4a'), MM(T, M(0, -0.1, -0.3)));
      for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28 + (i % 3) * 0.1; B.add('stone', new THREE.DodecahedronGeometry(0.28 + (i % 4) * 0.08, 0), MM(T, M(Math.cos(a) * (4.2 + (i % 2) * 0.8), 0.25, Math.sin(a) * (4.2 + (i % 2) * 0.8) - 0.3, i, i * 0.7, 0))); }
      col(3.6, 3); return { x, z: z + 4 };
    }
    case 'rocks': {
      for (const s of [-1, 1]) { B.add('stoneDark', new THREE.CylinderGeometry(3, 5, 26, 7), MM(T, M(s * 9, 12, 0))); B.add('stoneDark', new THREE.DodecahedronGeometry(4, 0), MM(T, M(s * 9, 25, 0))); addCircle(x + s * 9, z, 5); }
      return { x, z: z + 7 };
    }
    case 'pass':
    case 'lookout': {
      B.add('wood', box(6, 0.15, 4), MM(T, M(0, 0.3, 0)));
      B.add('wood', box(6, 0.1, 0.1), MM(T, M(0, 1.5, -1.9)));
      for (const s of [-1, 1]) B.add('woodDark', new THREE.CylinderGeometry(0.08, 0.08, 1.4, 6), MM(T, M(s * 2.9, 0.9, -1.9)));
      B.add('iron', new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), MM(T, M(1.8, 0.9, -1.3))); B.add('iron', box(0.35, 0.16, 0.4), MM(T, M(1.8, 1.55, -1.3)));
      addBox(x, z - 2.1, 6, 0.3, 0); return { x, z: z + 2 };
    }
    case 'tunnel': {
      B.add('stoneDark', box(20, 10, 12, 3), MM(T, M(0, 4, -6)));
      B.add('ashlar', archRing(3, 3.8, 1, 12), MM(T, M(0, 3, 0.2)));
      for (const s of [-1, 1]) B.add('ashlar', box(0.8, 3, 1), MM(T, M(s * 3.4, 1.5, 0.2)));
      B.add('dark', archPanel(6, 6, 0.3), MM(T, M(0, 0, 0)));
      addBox(x, z - 6, 20, 12, 0, { solidView: true }); return { x, z: z + 4 };
    }
    case 'raft': {
      const wy = ctx.riverLevel(x, z);
      for (let i = 0; i < 7; i++) B.add('woodDark', new THREE.CylinderGeometry(0.28, 0.3, 9, 8).rotateX(Math.PI / 2), M(x + (i - 3) * 0.6, Math.max(wy, y) + 0.25, z));
      B.add('wood', box(4.4, 0.15, 0.3), M(x, Math.max(wy, y) + 0.55, z - 3.5)); B.add('wood', box(4.4, 0.15, 0.3), M(x, Math.max(wy, y) + 0.55, z + 3.5));
      B.add('wood', box(0.15, 0.15, 5), M(x + 1, Math.max(wy, y) + 0.8, z + 5, 0, 0.3));
      return { x: x + 4, z };
    }
    case 'kiosk': {
      B.add('ashlar', new THREE.CylinderGeometry(5, 5.2, 1.4, 8), MM(T, M(0, 0.7, 0)));
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; B.add('iron', new THREE.CylinderGeometry(0.08, 0.08, 3.4, 6), MM(T, M(Math.cos(a) * 4.5, 3.1, Math.sin(a) * 4.5))); }
      B.add('zinc', new THREE.ConeGeometry(5.8, 2.4, 8), MM(T, M(0, 5.9, 0)));
      B.add('gold', new THREE.SphereGeometry(0.3, 8, 6), MM(T, M(0, 7.3, 0)));
      addCircle(x, z, 5.3); return { x, z: z + 7 };
    }
    case 'townhall': {
      const w = 18, d = 10, h = 14;
      B.add('ashlar', box(w, h + 2, d, 2.2), MM(T, M(0, h / 2 - 1, 0)));
      for (let f = 0; f < 3; f++) for (let c = 0; c < 5; c++) B.add('glass', box(1.2, 2, 0.1), MM(T, M(-w / 2 + 1.8 + c * (w - 3.6) / 4, 2 + f * 4.2, d / 2 + 0.02)));
      B.add('iron', box(w * 0.6, 0.1, 1.2), MM(T, M(0, 5.3, d / 2 + 0.6))); for (let i = 0; i < 16; i++) B.add('iron', box(0.05, 1, 0.05), MM(T, M(-w * 0.3 + i * w * 0.6 / 15, 5.8, d / 2 + 1.15)));
      B.add('ashlar', gable(w * 0.5, 3.4, 0.8), MM(T, M(0, h, d / 2 - 0.3)));
      B.add('paint', colored(new THREE.CircleGeometry(1, 16), '#f4efe0'), MM(T, M(0, h + 1.3, d / 2 + 0.12)));
      roofHip(B, T, w, d, h, 3, 'tile');
      col(w + 0.4, d + 0.4, { solidView: true }); return { x: x + 0, z: z + d / 2 + 4 };
    }
    case 'fountain': {
      B.add('ashlar', new THREE.CylinderGeometry(2.4, 2.5, 0.8, 10, 1, true), MM(T, M(0, 0.4, 0)));
      B.add('ashlar', box(1, 3.2, 1), MM(T, M(0, 1.6, -1.8))); B.add('gold', new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6).rotateX(Math.PI / 2), MM(T, M(0, 2.2, -1.1)));
      addCircle(x, z, 2.6); return { x, z: z + 4 };
    }
    case 'plaza': return { x, z: z + 4 };
    case 'gorge': {
      for (let i = 0; i < 16; i++) for (const s of [-1, 1]) {
        const zz = z - 40 + i * 5, xx = ctx.riverX(zz) + s * (ctx.half + 5 + (i % 3));
        B.add('stoneDark', box(8, 24 + (i % 4) * 4, 6, 4), M(xx + s * 4, terrainHeight(xx, zz) + 9, zz, 0, 0, s * 0.08));
        addBox(xx + s * 4, zz, 8, 6, 0, { solidView: true });
      }
      return { x: ctx.riverX(z - 50) - ctx.half - 8, z: z - 50 };
    }
    default: {
      B.add('ashlar', box(1.2, 1.2, 1.2), MM(T, M(0, 0.6, 0))); addCircle(x, z, 1); return { x, z: z + 3 };
    }
  }
}
