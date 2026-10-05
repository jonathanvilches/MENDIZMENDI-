// Otsagabia: casas, iglesia, palacios, puentes, muros del río, plaza y fuente
import * as THREE from 'three';
import { TOWN } from './townBuilder.js';
import { Builder, box, gable, archRing, archPanel, M, MM, uvFit, cyl } from './builder.js';
import { buildHouse } from './houses.js';
import { belfryBell, towerClock, eaveCorbels } from './monuments.js';
import { PATHS, PLACES, BRIDGES, rx, riverInfo, riverHalfA, pathQuery, villageMask, CONF } from './layout.js';
import { terrainHeight, deckY } from './heightfield.js';
import { addBox, addCircle, isFree } from './colliders.js';
import { mulberry32, clamp } from '../util/math.js';

export const VILLAGE = { palaces: [], lamps: [], benches: [], houses: [], church: null, fountain: null, doors: [] };
if (typeof window !== 'undefined') window.__VILLAGE = VILLAGE;   // (para las herramientas de capturas)
export function resetVillage() { VILLAGE.palaces = []; VILLAGE.lamps = []; VILLAGE.benches = []; VILLAGE.houses = []; VILLAGE.church = null; VILLAGE.fountain = null; VILLAGE.doors = []; }

// en las cuestas la casa se apoya casi en lo alto de su planta y lleva zócalo de piedra hasta el suelo por abajo
function slopeBase(B, x, z, w, d, ry, g) {
  const y = Math.max(g.mn - 0.1, g.mx - 0.35), drop = y - g.mn;
  if (drop > 0.15) B.add('stone', new THREE.BoxGeometry(w + 0.12, drop + 0.6, d + 0.12), M(x, g.mn - 0.6 + (drop + 0.6) / 2, z, ry));
  return y;
}
function minGround(x, z, w, d, ry) {
  const c = Math.cos(ry), s = Math.sin(ry);
  let mn = Infinity, mx = -Infinity;
  for (const [a, b] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2], [0, 0], [0, d / 2]]) {
    const X = x + a * c + b * s, Z = z - a * s + b * c;
    const h = terrainHeight(X, Z); mn = Math.min(mn, h); mx = Math.max(mx, h);
  }
  return { mn, mx };
}

function cornersOk(x, z, w, d, ry, riverside) {
  const c = Math.cos(ry), s = Math.sin(ry);
  for (const [a, b] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2], [0, 0], [-w / 2, 0], [w / 2, 0], [0, -d / 2]]) {
    const X = x + a * c + b * s, Z = z - a * s + b * c;
    const p = pathQuery(X, Z);
    if (p.d < p.w + 0.6) return false;
    const r = riverInfo(X, Z);
    if (r.edge < (riverside ? 0.9 : 2.5)) return false;
    if (Math.hypot(X - PLACES.plaza.x, Z - PLACES.plaza.z) < PLACES.plaza.r + 1) return false;
    if (villageMask(X, Z) < 0.5) return false;
  }
  return true;
}

function polyLen(pts) { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return l; }
function polyAt(pts, s) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s <= l || i === pts.length - 1) { const t = clamp(s / l, 0, 1); return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, tx: (b[0] - a[0]) / l, tz: (b[1] - a[1]) / l }; }
    s -= l;
  }
}

export function buildVillage(scene, mats) {
  const group = new THREE.Group(); group.name = 'village';
  const B = new Builder(mats);
  const rnd = mulberry32(2024);

  buildChurch(B, rnd);
  buildBridges(B);
  buildRiverWalls(B);
  buildPlaza(B, rnd);
  buildCrucero(B);
  buildFronton(B);

  // Palacios con escudo
  const palaceDefs = [
    { id: 'urrutia', name: 'Palacio de Urrutia', path: 'west', s: 150, side: 1 },
    { id: 'iriarte', name: 'Palacio de Iriarte', path: 'east', s: 40, side: -1 },
    { id: 'donamaria', name: 'Palacio de Donamaría', path: 'east', s: 118, side: -1 },
  ];
  for (const p of palaceDefs) {
    const path = PATHS.find(q => q.id === p.path);
    const a = polyAt(path.pts, p.s);
    const nx = -a.tz * p.side, nz = a.tx * p.side;
    const w = 13, d = 11, h = 10.5;
    const x = a.x + nx * (path.w + 2.2 + d / 2), z = a.z + nz * (path.w + 2.2 + d / 2);
    const ry = Math.atan2(-nx, -nz);
    const g = minGround(x, z, w, d, ry);
    const by = slopeBase(B, x, z, w, d, ry, g), T = M(x, by, z, ry);
    buildHouse(B, T, { w, d, h, wall: 'ashlar', roof: 'slate', roofType: 'hip', hipRise: 5.2, arch: true, doorX: 0, balcony: true, balconyW: 5, ironBalcony: true, shield: true, shieldX: 3.8, cornice: true }, rnd);
    addBox(x, z, w + 0.4, d + 0.4, ry, { solidView: true });
    const door = { x: x + Math.sin(ry) * (d / 2 + 1.6), z: z + Math.cos(ry) * (d / 2 + 1.6) };
    VILLAGE.palaces.push({ ...p, x, z, ry, door, y: by });
  }

  // Casas a lo largo de las calles
  const streetSpecs = [
    { id: 'west', side: 1 }, { id: 'east', side: -1 },
    { id: 'westBack', side: -1 }, { id: 'westBack', side: 1 },
    { id: 'eastBack', side: 1 }, { id: 'eastBack', side: -1 },
    { id: 'toChurch', side: 1 }, { id: 'toChurch', side: -1 },
    { id: 'south', side: -1, max: 60 }, { id: 'south', side: 1, max: 40 },
    { id: 'west', side: -1, riverside: true }, { id: 'east', side: 1, riverside: true },
    { id: 'westOuter', side: -1 }, { id: 'westOuter', side: 1 }, { id: 'eastOuter', side: 1 }, { id: 'eastOuter', side: -1 },
    { id: 'lnW4', side: 1 }, { id: 'lnW4', side: -1 }, { id: 'lnW5', side: 1 }, { id: 'lnE3', side: 1 }, { id: 'lnE3', side: -1 },
  ];
  let count = 0;
  for (const spec of streetSpecs) {
    const path = PATHS.find(q => q.id === spec.id);
    const L = Math.min(polyLen(path.pts), spec.max ?? 1e9);
    let s = 2 + rnd() * 4;
    while (s < L - 3) {
      const w = 7 + rnd() * 3.5, d = spec.riverside ? 4.6 + rnd() * 0.8 : 7.5 + rnd() * 3, h = 6.8 + rnd() * 3.2;
      const a = polyAt(path.pts, s + w / 2);
      const nx = -a.tz * spec.side, nz = a.tx * spec.side;
      const off = path.w + (spec.riverside ? 0.6 : 1.2 + rnd() * 1.4) + d / 2;
      const x = a.x + nx * off, z = a.z + nz * off;
      const ry = Math.atan2(-nx, -nz);
      const r = Math.max(w, d) / 2;
      if (isFree(x, z, spec.riverside ? d * 0.45 : r * 0.92) && cornersOk(x, z, w, d, ry, spec.riverside)) {
        const g = minGround(x, z, w, d, ry);
        if (g.mx - g.mn < 2.4) {
          const kind = rnd();
          const wall = kind < 0.42 ? 'plaster' : kind < 0.75 ? 'stone' : 'plasterCream';
          const roof = rnd() < 0.55 ? 'tile' : 'slate';
          const roofType = rnd() < 0.55 ? 'gableX' : 'gableZ';
          buildHouse(B, M(x, slopeBase(B, x, z, w, d, ry, g), z, ry), {
            w, d, h, wall, roof, roofType, arch: wall === 'stone' ? rnd() < 0.6 : rnd() < 0.25,
            balcony: rnd() < 0.5, balconyW: Math.min(w - 2, 3 + rnd() * 2.5), shield: rnd() < 0.12, cornice: rnd() < 0.4,
          }, rnd);
          addBox(x, z, w + 0.3, d + 0.3, ry, { solidView: true });
          VILLAGE.houses.push({ x, z, ry, w, d, door: { x: x + Math.sin(ry) * (d / 2 + 1.2), z: z + Math.cos(ry) * (d / 2 + 1.2) } });
          count++;
          s += w + 1.5 + rnd() * 3;
          continue;
        }
      }
      s += 3;
    }
  }
  console.log('casas', count);
  buildLamps(B, rnd);
  B.build(group);
  scene.add(group);
  return group;
}

// ---------- Iglesia de San Juan Evangelista ----------
function buildChurch(B, rnd) {
  const c = PLACES.church;
  const y = terrainHeight(c.x, c.z) - 0.2;
  const T = M(c.x, y, c.z, Math.PI / 2); // la fachada (+z local) mira al este
  const W = 12, L = 26, H = 12.5;
  B.add('ashlar', box(W, H + 2, L, 2.2), MM(T, M(0, (H + 2) / 2 - 2, 0)));
  B.add('stoneDark', box(W + 0.4, 1.4, L + 0.4, 2), MM(T, M(0, 0.3, 0)));
  // contrafuertes
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const z = -L / 2 + 3 + i * (L - 6) / 3;
    B.add('ashlar', box(1.3, H - 1.5, 1.4, 2), MM(T, M(s * (W / 2 + 0.6), (H - 1.5) / 2, z)));
    B.add('ashlar', box(1.3, 1.2, 1.4, 2), MM(T, M(s * (W / 2 + 0.3), H - 1.9, z, 0, 0, s * 0.6)));
    // ventanas altas en arco
    if (i < 3) {
      const zz = z + (L - 6) / 6;
      B.add('glass', archPanel(1.0, 2.6, 0.1), MM(T, M(s * (W / 2 + 0.02), H - 5.6, zz, s * Math.PI / 2)));
      B.add('ashlar', archRing(0.5, 0.78, 0.3, 8), MM(T, M(s * (W / 2 + 0.05), H - 5.6 + 2.1, zz, s * Math.PI / 2)));
    }
  }
  // tejado
  const pitch = 0.62;
  const rise = Math.tan(pitch) * W / 2;
  const ov = 0.5;
  for (const s of [-1, 1]) B.add('tile', box(Math.hypot(W / 2, rise) + ov, 0.3, L + 1, 2), MM(T, M(s * (W / 4 + ov / 2 * Math.cos(pitch)), H + rise / 2 - Math.sin(pitch) * ov / 2 + 0.1, 0, 0, 0, -s * pitch)));
  B.add('tile', box(0.4, 0.25, L + 1.1, 1), MM(T, M(0, H + rise + 0.15, 0)));
  B.add('ashlar', gable(W, rise, 0.6), MM(T, M(0, H, L / 2 - 0.3)));
  B.add('ashlar', gable(W, rise, 0.6), MM(T, M(0, H, -L / 2 + 0.3)));
  // cabecera poligonal (ábside)
  const apse = cyl(W / 2 - 0.3, W / 2 - 0.3, H - 1, 7, false, 2.2, Math.PI / 2, Math.PI);
  B.add('ashlar', apse, MM(T, M(0, (H - 1) / 2, -L / 2)));
  eaveCorbels(B, T, W, L, H);
  const apseRoof = uvFit(new THREE.ConeGeometry(W / 2 + 0.2, 3.6, 7, 1, false, Math.PI / 2, Math.PI), W * 0.8 / 2, 2);
  B.add('tile', apseRoof, MM(T, M(0, H - 1 + 1.8, -L / 2)));
  // portada con arquivoltas
  const F = MM(T, M(0, 0, L / 2));
  for (let k = 0; k < 4; k++) {
    const r = 1.5 + k * 0.38;
    B.add(k % 2 ? 'ashlar' : 'stone', archRing(r, r + 0.36, 0.6 - k * 0.1, 16), MM(F, M(0, 3.4, 0.25 + k * 0.12)));
    B.add('ashlar', box(0.36, 3.4, 0.6), MM(F, M(-(r + 0.18), 1.7, 0.25 + k * 0.12)));
    B.add('ashlar', box(0.36, 3.4, 0.6), MM(F, M(r + 0.18, 1.7, 0.25 + k * 0.12)));
  }
  B.add('woodDark', archPanel(3.0, 4.9, 0.12), MM(F, M(0, 0, 0.05)));
  for (let i = 0; i < 6; i++) B.add('iron', box(2.8, 0.06, 0.03), MM(F, M(0, 0.5 + i * 0.7, 0.13)));
  // rosetón
  B.add('ashlar', new THREE.TorusGeometry(1.25, 0.25, 6, 20), MM(F, M(0, 8.4, 0.15)));
  B.add('glass', new THREE.CircleGeometry(1.2, 20), MM(F, M(0, 8.4, 0.06)));
  for (let i = 0; i < 8; i++) B.add('ashlar', box(0.1, 2.3, 0.1), MM(F, M(0, 8.4, 0.14, 0, 0, i * Math.PI / 8)));
  // escalinata
  for (let i = 0; i < 4; i++) B.add('ashlar', box(8 - i * 0.6, 0.3, 1.2), MM(F, M(0, 0.15 - i * 0.3 + 0.0, 1.3 + i * 1.1)));
  // torre
  const tz = -L / 2 + 4, tx = W / 2 + 3.6, TW = 6.4, TH = 25;
  const TT = MM(T, M(tx, 0, tz));
  B.add('ashlar', box(TW, TH + 2, TW, 2.2), MM(TT, M(0, (TH + 2) / 2 - 2, 0)));
  for (const y of [8, 16]) B.add('ashlar', box(TW + 0.3, 0.3, TW + 0.3), MM(TT, M(0, y, 0)));
  // campanario: huecos en arco con campanas
  for (let s = 0; s < 4; s++) {
    const R = MM(TT, M(0, 0, 0, s * Math.PI / 2));
    B.add('glass', archPanel(1.5, 3.2, 0.1), MM(R, M(0, TH - 5, TW / 2 + 0.01)));
    B.add('ashlar', archRing(0.75, 1.05, 0.3, 10), MM(R, M(0, TH - 5 + 2.45, TW / 2 + 0.05)));
    B.add('ashlar', box(2.4, 0.25, 0.4), MM(R, M(0, TH - 5.05, TW / 2 + 0.1)));
    belfryBell(B, R, 1.5, TH - 4.3, TW / 2);
  }
  towerClock(B, MM(TT, M(0, 12, TW / 2)), 1.25);
  B.add('ashlar', box(TW + 0.5, 0.5, TW + 0.5), MM(TT, M(0, TH + 0.25, 0)));
  // chapitel piramidal de pizarra
  const spire = uvFit(new THREE.ConeGeometry(TW * 0.74, 9, 4, 1), TW * 2, 4.5);
  spire.rotateY(Math.PI / 4);
  B.add('slate', spire, MM(TT, M(0, TH + 0.5 + 4.5, 0)));
  B.add('iron', box(0.08, 1.6, 0.08), MM(TT, M(0, TH + 10.3, 0)));
  B.add('iron', box(0.8, 0.08, 0.08), MM(TT, M(0, TH + 10.6, 0)));
  // muro del atrio
  for (let a = 0; a < 26; a++) {
    const ang = a / 26 * Math.PI * 2;
    const X = c.x + Math.cos(ang) * 21, Z = c.z + Math.sin(ang) * 21;
    if (Math.cos(ang) > 0.9) continue; // hueco de entrada al este
    const g = terrainHeight(X, Z);
    B.add('stone', box(5.2, 1.2 + 2, 0.6, 2), M(X, g - 2 + 1.6, Z, -ang + Math.PI / 2));
    addBox(X, Z, 5.2, 0.8, -ang + Math.PI / 2);
  }
  const fx = c.x + Math.sin(Math.PI / 2) * 0, fz = c.z;
  addBox(c.x, c.z, L + 2, W + 3.2, Math.PI / 2, { solidView: true });
  addBox(c.x + Math.sin(Math.PI / 2) * tz + Math.cos(Math.PI / 2) * tx, c.z + Math.cos(Math.PI / 2) * tz - Math.sin(Math.PI / 2) * tx, TW + 0.4, TW + 0.4, Math.PI / 2, { solidView: true });
  VILLAGE.church = { x: c.x, z: c.z, door: { x: c.x + L / 2 + 5.5, z: c.z }, y };
}

// ---------- Puentes ----------
function buildBridges(B) {
  for (const b of BRIDGES) {
    if (b.wood) { woodenBridge(B, b); continue; }
    const L = b.xb - b.xa, N = 30;
    const r = riverInfo(b.cx, b.z);
    const bed = r.level - 1.6;
    const archR = b.main ? r.half + 1.2 : r.half + 0.8;
    const s = new THREE.Shape();
    s.moveTo(-L / 2, bed - 1);
    for (let i = 0; i <= N; i++) { const lx = -L / 2 + L * i / N; s.lineTo(lx, deckY(b, b.cx + lx) - 0.05); }
    s.lineTo(L / 2, bed - 1); s.lineTo(archR, bed - 1); s.lineTo(archR, bed + 0.4);
    const spring = bed + 0.4;
    // el arco nunca puede sobrepasar el tablero: si el río es ancho, arco rebajado
    const archH = Math.max(1.2, Math.min(b.main ? archR * 1.05 : archR * 0.9, deckY(b, b.cx) - 1.25 - spring));
    for (let i = 1; i < 20; i++) { const a = Math.PI * i / 20; s.lineTo(Math.cos(a) * archR, spring + Math.sin(a) * archH); }
    s.lineTo(-archR, spring); s.lineTo(-archR, bed - 1); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: b.w, bevelEnabled: false });
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.2, uv.getY(i) / 2.2);
    B.add('stone', g, M(b.cx, 0, b.z - b.w / 2));
    // dovelas del arco (anillo de sillería)
    for (const side of [-1, 1]) {
      for (let i = 0; i < 17; i++) {
        const a0 = Math.PI * i / 17, a1 = Math.PI * (i + 1) / 17, am = (a0 + a1) / 2;
        const X = Math.cos(am) * (archR + 0.33), Y = spring + Math.sin(am) * (archH + 0.33);
        B.add('ashlar', box(0.66, Math.hypot(archR * (Math.cos(a1) - Math.cos(a0)), archH * (Math.sin(a1) - Math.sin(a0))) + 0.04, 0.25, 1), M(b.cx + X, Y, b.z + side * (b.w / 2 + 0.06), 0, 0, Math.atan2(Math.sin(am) * archR, Math.cos(am) * archH)));
      }
    }
    // pretiles con albardilla
    for (const side of [-1, 1]) {
      const segs = 16;
      for (let i = 0; i < segs; i++) {
        const x0 = b.xa + 1 + (L - 2) * i / segs, x1 = b.xa + 1 + (L - 2) * (i + 1) / segs;
        const y0 = deckY(b, x0), y1 = deckY(b, x1);
        const len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0);
        B.add('stone', box(len + 0.04, 0.85, 0.42, 1.6), M((x0 + x1) / 2, (y0 + y1) / 2 + 0.42, b.z + side * (b.w / 2 - 0.21), 0, 0, ang));
        B.add('ashlar', box(len + 0.06, 0.14, 0.55, 1), M((x0 + x1) / 2, (y0 + y1) / 2 + 0.9, b.z + side * (b.w / 2 - 0.21), 0, 0, ang));
      }
      addBox(b.cx, b.z + side * (b.w / 2 - 0.2), L - 2, 0.45, 0);
    }
    // tajamares
    if (b.main) for (const side of [-1, 1]) {
      const cw = new THREE.CylinderGeometry(0.01, 1.6, 3.2, 3, 1);
      B.add('stone', cw, M(b.cx + side * (archR + 1.2), bed + 1.2, b.z - b.w / 2 - 0.6, Math.PI / 6));
    }
  }
}

function woodenBridge(B, b) {
  const L = b.xb - b.xa;
  const n = Math.round(L / 0.35);
  for (let i = 0; i < n; i++) {
    const x = b.xa + (i + 0.5) * L / n;
    B.add('wood', box(L / n - 0.04, 0.12, b.w, 1), M(x, deckY(b, x) - 0.06, b.z, 0, 0, 0));
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i <= 10; i++) {
      const x = b.xa + 1 + (L - 2) * i / 10;
      B.add('woodDark', box(0.14, 1.1, 0.14), M(x, deckY(b, x) + 0.5, b.z + side * (b.w / 2 - 0.08)));
    }
    for (let i = 0; i < 10; i++) {
      const x0 = b.xa + 1 + (L - 2) * i / 10, x1 = b.xa + 1 + (L - 2) * (i + 1) / 10;
      const y0 = deckY(b, x0), y1 = deckY(b, x1);
      const len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0);
      B.add('wood', box(len, 0.1, 0.12), M((x0 + x1) / 2, (y0 + y1) / 2 + 1.0, b.z + side * (b.w / 2 - 0.08), 0, 0, ang));
      B.add('wood', box(len, 0.08, 0.1), M((x0 + x1) / 2, (y0 + y1) / 2 + 0.55, b.z + side * (b.w / 2 - 0.08), 0, 0, ang));
    }
    addBox(b.cx, b.z + side * (b.w / 2 - 0.05), L - 2, 0.25, 0);
  }
  // vigas y pilas de troncos
  for (const s of [-1, 1]) B.add('woodDark', box(L, 0.35, 0.3), M(b.cx, deckY(b, b.cx) - 0.35 - b.arch * 0.3, b.z + s * (b.w / 2 - 0.3)));
  const r = riverInfo(b.cx, b.z);
  for (const s of [-0.5, 0.5]) {
    const x = b.cx + s * r.half * 1.3;
    const top = deckY(b, x) - 0.4, bot = r.level - 1.5;
    for (const zz of [-0.6, 0.6]) B.add('woodDark', new THREE.CylinderGeometry(0.18, 0.2, top - bot, 7), M(x, (top + bot) / 2, b.z + zz));
  }
}

// ---------- Muros de encauzamiento del río en el pueblo ----------
function buildRiverWalls(B) {
  const zs = [-100, 84];
  for (const side of [-1, 1]) {
    for (let z = zs[0]; z < zs[1]; z += 2.5) {
      const zm = z + 1.25;
      if (BRIDGES.some(b => Math.abs(zm - b.z) < b.w / 2 + 1.4)) continue;
      if (side > 0 && zm > CONF.z - 8) continue;
      const half = riverHalfA(zm);
      const x0 = rx(z) + side * (half + 0.55), x1 = rx(z + 2.5) + side * (half + 0.55);
      const xm = (x0 + x1) / 2;
      const top = terrainHeight(rx(zm) + side * (half + 2.2), zm) + 0.75;
      const r = riverInfo(xm, zm);
      const bot = r.level - 1.6;
      const len = Math.hypot(x1 - x0, 2.5) + 0.05;
      const ang = Math.atan2(x1 - x0, 2.5);
      B.add('stone', box(0.9, top - bot, len, 2), M(xm, (top + bot) / 2, zm, ang));
      B.add('ashlar', box(1.05, 0.14, len + 0.02, 1), M(xm, top + 0.07, zm, ang));
      addBox(xm, zm, 0.9, len, ang);
    }
  }
}

// ---------- Plaza, fuente, bancos ----------
// cara interior de un anillo: invertir los triángulos para que se vea desde dentro
function inside(g) {
  g = g.toNonIndexed(); const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i += 3) for (const a of [p, n, uv]) { if (!a) continue; const k = a.itemSize; for (let c = 0; c < k; c++) { const t = a.array[i * k + c]; a.array[i * k + c] = a.array[(i + 2) * k + c]; a.array[(i + 2) * k + c] = t; } }
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return g;
}
// Fuente octogonal de plaza: pila con agua, columna con taza alta, caños de hierro y remate
export function fountain(B, x, y, z) {
  const T = M(x, y, z, Math.PI / 8);
  // pila de sillares (la textura a escala real: antes se estiraba alrededor y parecía de tablas)
  B.add('ashlar', cyl(2.6, 2.72, 0.82, 8, true, 1.6), MM(T, M(0, 0.41, 0)));
  B.add('ashlar', inside(cyl(2.28, 2.28, 0.82, 8, true, 1.6)), MM(T, M(0, 0.41, 0)));
  const rim = new THREE.RingGeometry(2.24, 2.68, 8, 1); rim.rotateX(-Math.PI / 2); uvFit(rim, 3, 3); B.add('ashlar', rim, MM(T, M(0, 0.84, 0)));
  B.add('ashlar', cyl(2.76, 2.76, 0.12, 8, true, 1.6), MM(T, M(0, 0.84, 0)));
  // bocel del borde y basa algo más ancha, como las pilas talladas
  B.add('ashlar', cyl(2.8, 2.86, 0.18, 8, false, 1.6), MM(T, M(0, 0.09, 0)));
  const floor = new THREE.CircleGeometry(2.3, 8); floor.rotateX(-Math.PI / 2); uvFit(floor, 2, 2); B.add('stoneDark', floor, MM(T, M(0, 0.12, 0)));
  const water = new THREE.CircleGeometry(2.29, 8); water.rotateX(-Math.PI / 2); B.add('water', water, MM(T, M(0, 0.62, 0)));
  // columna torneada con taza
  const prof = [[0.001, 0], [0.62, 0], [0.62, 0.22], [0.42, 0.34], [0.36, 0.5], [0.32, 1.35], [0.4, 1.45], [0.95, 1.6], [1.0, 1.75], [0.9, 1.78]].map(([r, h]) => new THREE.Vector2(r, h));
  B.add('ashlar', uvFit(new THREE.LatheGeometry(prof, 16), 2.4, 1.6), MM(T, M(0, 0.1, 0)));
  const w2 = new THREE.CircleGeometry(0.9, 16); w2.rotateX(-Math.PI / 2); B.add('water', w2, MM(T, M(0, 1.84, 0)));
  const top = [[0.001, 0], [0.22, 0], [0.18, 0.2], [0.24, 0.45], [0.12, 0.62], [0.001, 0.72]].map(([r, h]) => new THREE.Vector2(r, h));
  B.add('ashlar', uvFit(new THREE.LatheGeometry(top, 12), 0.8, 0.6), MM(T, M(0, 1.84, 0)));
  // caños de hierro y su chorro, que cae en arco hasta la pila
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 8, sx = Math.sin(a), sz = Math.cos(a);
    B.add('iron', new THREE.CylinderGeometry(0.045, 0.05, 0.5, 8), M(x + sx * 1.15, y + 1.72, z + sz * 1.15, a, Math.PI / 2 - 0.25));
    const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x + sx * 1.38, y + 1.66, z + sz * 1.38), new THREE.Vector3(x + sx * 1.75, y + 1.62, z + sz * 1.75), new THREE.Vector3(x + sx * 1.9, y + 0.62, z + sz * 1.9));
    B.add('jet', new THREE.TubeGeometry(c, 10, 0.024, 5, false));
  }
}
function buildPlaza(B, rnd) {
  const p = PLACES.plaza;
  const y = terrainHeight(p.x, p.z);
  fountain(B, p.x, y, p.z);
  addCircle(p.x, p.z, 2.7);
  VILLAGE.fountain = { x: p.x, z: p.z, y, spouts: [0, 1, 2, 3].map(i => ({ x: p.x + Math.sin(i * Math.PI / 2) * 0.88, z: p.z + Math.cos(i * Math.PI / 2) * 0.88, y: y + 1.9 })) };
  // bancos alrededor
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + 0.3;
    const x = p.x + Math.cos(a) * 9, z = p.z + Math.sin(a) * 9;
    bench(B, x, terrainHeight(x, z), z, Math.atan2(p.x - x, p.z - z));
  }
}

export function bench(B, x, y, z, ry) {
  const T = M(x, y, z, ry);
  B.add('ashlar', box(0.4, 0.45, 0.5), MM(T, M(-0.8, 0.22, 0)));
  B.add('ashlar', box(0.4, 0.45, 0.5), MM(T, M(0.8, 0.22, 0)));
  B.add('wood', box(2.2, 0.1, 0.55, 1), MM(T, M(0, 0.5, 0)));
  B.add('wood', box(2.2, 0.35, 0.08, 1), MM(T, M(0, 0.8, -0.28, 0, -0.15)));
  addBox(x, z, 2.2, 0.6, ry);
  TOWN.benches.push({ x: x + Math.sin(ry) * 0.7, z: z + Math.cos(ry) * 0.7, ry });
  VILLAGE.benches.push({ x, z, ry, y });
}

// ---------- Crucero ----------
function buildCrucero(B) {
  const c = PLACES.crucero;
  const y = terrainHeight(c.x, c.z);
  for (let i = 0; i < 3; i++) B.add('ashlar', cyl(2.2 - i * 0.6, 2.2 - i * 0.6, 0.35, 8, false, 1.6), M(c.x, y + 0.1 + i * 0.35, c.z));
  B.add('ashlar', cyl(0.22, 0.28, 3.6, 8, false, 1.6), M(c.x, y + 1.05 + 1.8, c.z));
  B.add('ashlar', box(0.6, 0.4, 0.6), M(c.x, y + 4.8, c.z));
  B.add('ashlar', box(0.22, 1.5, 0.2), M(c.x, y + 5.7, c.z));
  B.add('ashlar', box(1.0, 0.2, 0.2), M(c.x, y + 5.95, c.z));
  addCircle(c.x, c.z, 2.3);
  c.y = y;
}

// ---------- Frontón ----------
// El frontón (cancha, paredes y colisiones) lo pone el juego con el motor de pelota (src/pelota); aquí solo su altura.
function buildFronton(B) {
  const f = PLACES.fronton;
  f.y = terrainHeight(f.x, f.z);
}

// ---------- Farolas ----------
function buildLamps(B, rnd) {
  for (const id of ['west', 'east', 'toChurch', 'toPlaza', 'westBack', 'eastBack']) {
    const path = PATHS.find(p => p.id === id);
    const L = polyLen(path.pts);
    for (let s = 6, k = 0; s < L; s += 24, k++) {
      const a = polyAt(path.pts, s);
      const side = k % 2 ? 1 : -1;
      const x = a.x - a.tz * side * (path.w + 0.4), z = a.z + a.tx * side * (path.w + 0.4);
      if (!isFree(x, z, 0.6)) continue;
      lamp(B, x, z);
    }
  }
}
export function lamp(B, x, z) {
  const y = terrainHeight(x, z);
  B.add('iron', new THREE.CylinderGeometry(0.07, 0.11, 3.4, 6), M(x, y + 1.7, z));
  B.add('iron', new THREE.CylinderGeometry(0.2, 0.28, 0.3, 6), M(x, y + 0.15, z));
  B.add('iron', new THREE.ConeGeometry(0.34, 0.3, 4), M(x, y + 3.95, z, Math.PI / 4));
  B.add('lamp', box(0.36, 0.45, 0.36), M(x, y + 3.6, z));
  B.add('iron', box(0.42, 0.06, 0.42), M(x, y + 3.36, z));
  addCircle(x, z, 0.25);
  VILLAGE.lamps.push({ x, y: y + 3.6, z });
}
