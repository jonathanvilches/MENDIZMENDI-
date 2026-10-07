// Construye una localidad generada: casas por estilo comarcal, iglesia, puentes, monumentos, plaza, granja
import * as THREE from 'three';
import { Builder, box, colored, M, MM } from './builder.js';
import { buildHouse } from './houses.js';
import { church, castle, castleJavier, dig, wallsRing, bridge, landmark } from './monuments.js';
import { bench, lamp, fountain } from './village.js';
import { PATHS, PLACES, BRIDGES, riverInfo, pathQuery, villageMask, plazaMask, rx, MOD } from './layout.js';
import { terrainHeight } from './heightfield.js';
import { addBox, addCircle, isFree, rectFree } from './colliders.js';
import { mulberry32, clamp } from '../util/math.js';

export const TOWN = { houses: [], shields: [], armsSpot: null, lamps: [], benches: [], church: null, fountain: null, landmarks: [], farm: null, pen: null };
if (typeof window !== 'undefined') window.__TOWN = TOWN;   // (para las herramientas de capturas)

function polyLen(pts) { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return l; }
function polyAt(pts, s) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s <= l || i === pts.length - 1) { const t = clamp(s / (l || 1), 0, 1); return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, tx: (b[0] - a[0]) / (l || 1), tz: (b[1] - a[1]) / (l || 1) }; }
    s -= l;
  }
}
function minGround(x, z, w, d, ry) {
  const c = Math.cos(ry), s = Math.sin(ry); let mn = Infinity, mx = -Infinity;
  for (const [a, b] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2], [0, 0], [0, d / 2]]) { const h = terrainHeight(x + a * c + b * s, z - a * s + b * c); mn = Math.min(mn, h); mx = Math.max(mx, h); }
  return { mn, mx };
}
// en las cuestas la casa se apoya casi en lo alto de su planta (el lado de arriba no queda enterrado) y por debajo
// lleva un zócalo de piedra hasta el suelo por el lado de abajo. Devuelve la altura de la planta baja.
// escudo de una fachada: dónde queda en el mundo (para ponerle sus armas y poder leerlo desde la calle)
function shieldAt(x, y, z, ry, [lx, ly, lz], palace) {
  const c = Math.cos(ry), s = Math.sin(ry);
  TOWN.shields.push({ x: x + lx * c + lz * s, y: y + ly, z: z - lx * s + lz * c, ry, palace, read: { x: x + lx * c + (lz + 2.4) * s, z: z - lx * s + (lz + 2.4) * c } });
}
function slopeBase(B, x, z, w, d, ry, g) {
  const y = Math.max(g.mn - 0.1, g.mx - 0.35), drop = y - g.mn;
  if (drop > 0.15) B.add('stone', new THREE.BoxGeometry(w + 0.12, drop + 0.6, d + 0.12), M(x, g.mn - 0.6 + (drop + 0.6) / 2, z, ry));
  return y;
}
function cornersOk(x, z, w, d, ry) {
  const c = Math.cos(ry), s = Math.sin(ry);
  for (const [a, b] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2], [0, 0], [-w / 2, 0], [w / 2, 0], [0, -d / 2]]) {
    const X = x + a * c + b * s, Z = z - a * s + b * c;
    const p = pathQuery(X, Z); if (p.d < p.w + 0.6) return false;
    if (riverInfo(X, Z).edge < 2.5) return false;
    if (Math.hypot(X - PLACES.plaza.x, Z - PLACES.plaza.z) < PLACES.plaza.r + 1 || plazaMask(X, Z) > 0.05) return false;
    if (villageMask(X, Z) < 0.45) return false;
  }
  return true;
}

export function houseStyle(fam, rnd) {
  const pick = (arr) => { let r = rnd(), acc = 0; for (const [v, p] of arr) { acc += p; if (r < acc) return v; } return arr[arr.length - 1][0]; };
  switch (fam) {
    case 'atlantic': return { wall: pick([['plaster', 0.72], ['stone', 0.28]]), roof: 'tile', roofType: pick([['gableZ', 0.7], ['gableX', 0.3]]), pitch: 0.5 + rnd() * 0.08, overhang: 1.1, timber: rnd() < 0.6, balcony: rnd() < 0.7, h: [7, 9.5] };
    case 'central': return { wall: pick([['ashlar', 0.35], ['plasterOcher', 0.3], ['plasterCream', 0.2], ['stone', 0.15]]), roof: 'tile', roofType: pick([['gableX', 0.75], ['hip', 0.1], ['gableZ', 0.15]]), pitch: 0.42 + rnd() * 0.08, overhang: 0.8, ironBalcony: rnd() < 0.6, balcony: rnd() < 0.55, h: [7, 10.5] };
    case 'city': return { wall: pick([['plasterOcher', 0.25], ['plasterRose', 0.2], ['plasterBlue', 0.15], ['plasterCream', 0.2], ['ashlar', 0.2]]), roof: 'tile', roofType: 'gableX', pitch: 0.4, overhang: 0.7, ironBalcony: true, balcony: true, h: [11, 16], wide: true };
    case 'ribera': { const w = pick([['brick', 0.42], ['plasterOcher', 0.3], ['plasterCream', 0.28]]); return { wall: w, noQuoins: w === 'brick', roof: 'tile', roofType: pick([['gableX', 0.85], ['hip', 0.15]]), pitch: 0.36 + rnd() * 0.06, overhang: 0.7, gallery: rnd() < 0.55, ironBalcony: true, balcony: rnd() < 0.6, h: [7, 10] }; }
    default: return { wall: pick([['plaster', 0.42], ['stone', 0.33], ['plasterCream', 0.25]]), roof: rnd() < 0.55 ? 'tile' : 'slate', roofType: rnd() < 0.55 ? 'gableX' : 'gableZ', h: [6.8, 10] };
  }
}

// Pamplona (trazado propio, catedral, murallas, Ciudadela, plaza de toros, El Sadar) va en su propio trozo de código:
// solo se descarga al ir allí. Hay que esperarlo antes de buildTown.
let buildPamplona = null;
export async function preloadTown(def) { if (def.layout === 'pamplona' && !buildPamplona) buildPamplona = (await import('./pamplona.js')).buildPamplona; }

export function buildTown(scene, mats, def) {
  for (const k of Object.keys(TOWN)) TOWN[k] = Array.isArray(TOWN[k]) ? [] : null;
  const group = new THREE.Group(); group.name = 'town';
  const B = new Builder(mats);
  const rnd = mulberry32(def.id.length * 977 + 13);
  const fam = def.family;
  // Pamplona: trazado y monumentos propios (plaza del Castillo, Estafeta, catedral, murallas, Ciudadela, El Sadar…)
  const pamp = def.layout === 'pamplona' ? buildPamplona(B, group, def, rnd, TOWN) : null;
  // iglesia mirando a la plaza
  const ch = PLACES.church;
  const ry = Math.atan2(PLACES.plaza.x - ch.x, PLACES.plaza.z - ch.z);
  const c = pamp ? pamp.church : church(B, ch.x, ch.z, ry, def.church?.style || 'gothic', fam, def.church || {});
  TOWN.church = { ...c, name: def.church?.name, text: def.church?.text };
  // puentes
  for (const b of BRIDGES) {
    b.cx = rx(b.z); b.xa = b.cx - b.span / 2; b.xb = b.cx + b.span / 2;
    b.ya = terrainHeight(b.xa, b.z); b.yb = terrainHeight(b.xb, b.z);
    bridge(B, b, riverInfo);
  }
  // muros de encauzamiento del río en el casco urbano
  if (def.river && Math.abs(def.river.x) < 40) {
    const R = MOD.R || 80;
    for (const side of [-1, 1]) for (let z = -R * 0.85; z < R * 0.85; z += 2.5) {
      const zm = z + 1.25;
      if (BRIDGES.some(b => Math.abs(zm - b.z) < b.w / 2 + 1.4)) continue;
      const half = riverInfo(rx(zm), zm).half;
      const x0 = rx(z) + side * (half + 0.55), x1 = rx(z + 2.5) + side * (half + 0.55), xm = (x0 + x1) / 2;
      const top = terrainHeight(rx(zm) + side * (half + 2.4), zm) + 0.7;
      const bot = riverInfo(xm, zm).level - 1.6;
      if (top - bot < 1.2 || top - bot > 9) continue;
      const len = Math.hypot(x1 - x0, 2.5) + 0.05, ang = Math.atan2(x1 - x0, 2.5);
      B.add(fam === 'ribera' ? 'brick' : 'stone', box(0.9, top - bot, len, 2), M(xm, (top + bot) / 2, zm, ang));
      B.add('ashlar', box(1.05, 0.14, len + 0.02, 1), M(xm, top + 0.07, zm, ang));
      addBox(xm, zm, 0.9, len, ang);
    }
  }
  // monumentos
  const ctx = { riverLevel: (x, z) => riverInfo(x, z).level, riverX: rx, half: riverInfo(rx(0), 0).half };
  for (const lm of PLACES.landmarks || []) {
    let spot = null;
    if (pamp?.spots[lm.kind]) spot = pamp.spots[lm.kind];
    else if (lm.kind === 'castle') { const ry = Math.atan2(PLACES.plaza.x - lm.x, PLACES.plaza.z - lm.z), cs = lm.style === 'javier' ? castleJavier(B, lm.x, lm.z, ry) : castle(B, lm.x, lm.z, ry, def.id === 'olite'); spot = cs.gate; }
    else if (lm.kind === 'dig') spot = dig(B, lm.x, lm.z, Math.atan2(PLACES.plaza.x - lm.x, PLACES.plaza.z - lm.z));
    else if (lm.kind === 'walls') {
      if (lm.ring) { wallsRing(B, lm.x, lm.z, 44, 9, Math.atan2(PLACES.plaza.z - lm.z, PLACES.plaza.x - lm.x)); spot = { x: lm.x + (PLACES.plaza.x - lm.x) * 0.55, z: lm.z + (PLACES.plaza.z - lm.z) * 0.55 }; }
      else { const r = MOD.R + 22; wallsRingGates(B, PLACES.plaza.x, 0, r); spot = { x: PLACES.plaza.x, z: -r + 6 }; }
    } else if (lm.kind === 'bridge' || lm.kind === 'plaza') spot = { x: lm.x, z: lm.z };
    else if (lm.kind === 'palace' || lm.kind === 'house') {
      const w = lm.kind === 'palace' ? 13 : 9, d = lm.kind === 'palace' ? 11 : 9, h = lm.kind === 'palace' ? 11 : 9;
      const p = pathQuery(lm.x, lm.z);
      const r2 = Math.atan2(PLACES.plaza.x - lm.x, PLACES.plaza.z - lm.z);
      const g = minGround(lm.x, lm.z, w, d, r2);
      const pb = slopeBase(B, lm.x, lm.z, w, d, r2, g), po = { w, d, h, wall: fam === 'ribera' ? 'brick' : 'ashlar', noQuoins: true, roof: fam === 'pyrenean' ? 'slate' : 'tile', roofType: 'hip', hipRise: 4.6, arch: true, doorX: 0, balcony: true, balconyW: 5, ironBalcony: true, shield: lm.kind === 'palace', cornice: true };
      buildHouse(B, M(lm.x, pb, lm.z, r2), po, rnd);
      if (po.shieldLocal) shieldAt(lm.x, pb, lm.z, r2, po.shieldLocal, true);
      addBox(lm.x, lm.z, w + 0.4, d + 0.4, r2, { solidView: true });
      spot = { x: lm.x + Math.sin(r2) * (d / 2 + 2), z: lm.z + Math.cos(r2) * (d / 2 + 2) };
    } else spot = landmark(B, lm, ctx);
    TOWN.landmarks.push({ ...lm, spot: spot || { x: lm.x, z: lm.z } });
  }
  // plaza: fuente (si no hay kiosco), bancos y árboles
  const P = PLACES.plaza;
  const hasKiosk = pamp || (PLACES.landmarks || []).some(l => l.kind === 'kiosk');
  if (!hasKiosk) {
    const y = terrainHeight(P.x, P.z);
    fountain(B, P.x, y, P.z);
    addCircle(P.x, P.z, 2.7);
    TOWN.fountain = { x: P.x, z: P.z, y };
  }
  for (let i = 0; i < (pamp ? 0 : 6); i++) {
    const a = i / 6 * Math.PI * 2 + 0.3, x = P.x + Math.cos(a) * (P.r - 5), z = P.z + Math.sin(a) * (P.r - 5);
    if (isFree(x, z, 1.4)) bench(B, x, terrainHeight(x, z), z, Math.atan2(P.x - x, P.z - z));
  }
  // granja: cuadra y redil
  buildFarm(B, fam);
  // casas a lo largo de las calles: con la casa entera libre (no solo un círculo en su centro, que dejaba casas metidas
  // entre los muros de un castillo) y fuera del recinto de los castillos (su patio no tiene choques)
  const keep = TOWN.landmarks.filter(l => l.kind === 'castle').map(l => ({ x: l.x, z: l.z, r: l.style === 'javier' ? 24 : def.id === 'olite' ? 36 : 26 }));
  const inKeep = (x, z, r) => keep.some(k => Math.hypot(x - k.x, z - k.z) < k.r + r);
  let count = pamp ? TOWN.houses.length : 0;
  const mid = (p) => p.pts[Math.floor(p.pts.length / 2)];
  const streets = PATHS.filter(p => p.type === 'street' && !p.noHouses).sort((a, b) => { const A = mid(a), Bm = mid(b); return Math.hypot(A[0] - PLACES.plaza.x, A[1] - PLACES.plaza.z) - Math.hypot(Bm[0] - PLACES.plaza.x, Bm[1] - PLACES.plaza.z); });
  const cap = Math.round(def.size * (fam === 'city' || fam === 'ribera' ? 1.7 : fam === 'central' ? 1.5 : 1.25));
  for (const path of streets) for (const side of [-1, 1]) {
    const L = polyLen(path.pts);
    let s = 2 + rnd() * 4;
    while (s < L - 3 && count < cap) {
      const st = houseStyle(fam, rnd);
      const w = (st.wide ? 9 : 7) + rnd() * 3.5, d = 7.5 + rnd() * 3, h = st.h[0] + rnd() * (st.h[1] - st.h[0]);
      const a = polyAt(path.pts, s + w / 2);
      const nx = -a.tz * side, nz = a.tx * side;
      const off = path.w + 1.2 + rnd() * 1.2 + d / 2;
      const x = a.x + nx * off, z = a.z + nz * off;
      const ry = Math.atan2(-nx, -nz);
      if (rectFree(x, z, ry, -w / 2, w / 2, -d / 2, d / 2, 0.4) && !inKeep(x, z, Math.hypot(w, d) / 2) && cornersOk(x, z, w, d, ry)) {
        const g = minGround(x, z, w, d, ry);
        if (g.mx - g.mn < 2.4) {
          // la primera casa que da a la plaza es la casa consistorial: lleva el escudo del pueblo en la fachada
          const hall = !pamp && !TOWN.armsSpot && Math.hypot(x - P.x, z - P.z) < P.r + 16;
          const hb = slopeBase(B, x, z, w, d, ry, g), ho = { arch: st.wall === 'stone' || st.wall === 'ashlar' ? rnd() < 0.5 : rnd() < 0.2, balconyW: Math.min(w - 2, 3 + rnd() * 2.5), shield: rnd() < 0.1, cornice: rnd() < 0.4, ...st, w, d, h };
          if (hall) Object.assign(ho, { shield: true, townhall: true, h: Math.max(h, 8.5), cornice: true, arch: true, doorX: 0, balcony: true, balconyW: Math.min(w - 2, 5), ironBalcony: true });
          buildHouse(B, M(x, hb, z, ry), ho, rnd);
          if (ho.shieldLocal && hall) { const [lx, ly, lz] = ho.shieldLocal, c = Math.cos(ry), sn = Math.sin(ry); TOWN.armsSpot = { x: x + lx * c + lz * sn, y: hb + ly, z: z - lx * sn + lz * c, ry, hall: true, base: hb, plateY: hb + ho.plateY, read: { x: x + lx * c + (lz + 2.6) * sn, z: z - lx * sn + (lz + 2.6) * c } }; }
          else if (ho.shieldLocal) shieldAt(x, hb, z, ry, ho.shieldLocal, false);
          addBox(x, z, w + 0.3, d + 0.3, ry, { solidView: true });
          TOWN.houses.push({ x, z, ry, w, d, door: { x: x + Math.sin(ry) * (d / 2 + 1.2), z: z + Math.cos(ry) * (d / 2 + 1.2) } });
          count++; s += w + 1.2 + rnd() * 2.5; continue;
        }
      }
      s += 3;
    }
  }
  // si ninguna casa da a la plaza, el escudo va en un pilar de sillería a un lado de ella, mirando a su centro
  if (!pamp) for (let i = 0; i < 16 && !TOWN.armsSpot; i++) {
    const a = 1.9 + i / 16 * Math.PI * 2, r = Math.max(5.5, P.r - 2.2), x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r;
    if (!isFree(x, z, 1.7) || Math.abs(terrainHeight(x, z) - terrainHeight(P.x, P.z)) > 1.2) continue;
    const y = terrainHeight(x, z), ry = Math.atan2(P.x - x, P.z - z);
    B.add('ashlar', new THREE.BoxGeometry(1.6, 3.2, 0.42), M(x, y + 1.6 - 0.3, z, ry));
    B.add('ashlar', new THREE.BoxGeometry(1.9, 0.22, 0.6), M(x, y + 2.98, z, ry));
    B.add('stoneDark', new THREE.BoxGeometry(1.9, 0.3, 0.6), M(x, y + 0.0, z, ry));
    addBox(x, z, 1.7, 0.6, ry);
    TOWN.armsSpot = { x: x + Math.sin(ry) * 0.212, y: y + 1.62, z: z + Math.cos(ry) * 0.212, ry, read: { x: x + Math.sin(ry) * 2.3, z: z + Math.cos(ry) * 2.3 } };
  }
  // farolas
  for (const path of streets) {
    const L = polyLen(path.pts);
    for (let s = 6, k = 0; s < L; s += 26, k++) {
      const a = polyAt(path.pts, s); const side = k % 2 ? 1 : -1;
      const x = a.x - a.tz * side * (path.w + 0.4), z = a.z + a.tx * side * (path.w + 0.4);
      if (!isFree(x, z, 0.6)) continue;
      lamp(B, x, z);
    }
  }
  B.build(group);
  scene.add(group);
  // las farolas se registran en VILLAGE.lamps (village.js); copiarlas
  return group;
}

function wallsRingGates(B, cx, cz, r) {
  // lienzo de muralla con baluartes y puertas en los cuatro caminos
  const n = 64, gates = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  for (let i = 0; i < n; i++) {
    const am = (i + 0.5) / n * Math.PI * 2;
    if (gates.some(g => Math.abs(Math.atan2(Math.sin(am - g), Math.cos(am - g))) < 0.09)) continue;
    const x = cx + Math.cos(am) * r, z = cz + Math.sin(am) * r;
    const len = 2 * r * Math.sin(Math.PI / n) + 0.3, y = terrainHeight(x, z);
    B.add('stone', box(2.5, 9, len, 2.2), M(x, y + 3.5, z, -am));
    addBox(x, z, 2.6, len, -am, { solidView: true });
  }
  for (let t = 0; t < 8; t++) {
    const a = t / 8 * Math.PI * 2 + Math.PI / 8, x = cx + Math.cos(a) * (r + 3), z = cz + Math.sin(a) * (r + 3);
    const g = new THREE.CylinderGeometry(5, 6, 10, 5); B.add('stone', g, M(x, terrainHeight(x, z) + 4, z, -a));
    addCircle(x, z, 5.5);
  }
}

function buildFarm(B, fam) {
  const f = PLACES.farm; if (!f) return;
  const y = terrainHeight(f.x, f.z) - 0.2;
  const ry = Math.atan2(PLACES.plaza.x - f.x, PLACES.plaza.z - f.z);
  // cuadra
  const T = M(f.x, y, f.z, ry);
  const wallMat = fam === 'ribera' ? 'brick' : fam === 'central' || fam === 'city' ? 'plasterOcher' : 'stone';
  B.add(wallMat, box(10, 6, 7, 2.2), MM(T, M(0, 2, 0)));
  for (const s of [-1, 1]) B.add(fam === 'pyrenean' ? 'slate' : 'tile', box(11, 0.22, 4.6), MM(T, M(0, 4.9, s * 1.9, 0, s * 0.55)));
  B.add('woodDark', box(3, 3, 0.1), MM(T, M(0, 1.5, 3.52)));
  addBox(f.x, f.z, 10.4, 7.4, ry, { solidView: true });
  // redil al lado
  const dir = { x: Math.cos(ry), z: -Math.sin(ry) };
  const pen = { x: f.x + dir.x * 16, z: f.z + dir.z * 16, w: 14, d: 11 };
  const x0 = pen.x - pen.w / 2, x1 = pen.x + pen.w / 2, z0 = pen.z - pen.d / 2, z1 = pen.z + pen.d / 2, gate = 4;
  const rail = (ax, az, bx, bz) => {
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 2.5));
    for (let i = 0; i < n; i++) {
      const xa = ax + (bx - ax) * i / n, za = az + (bz - az) * i / n, xb = ax + (bx - ax) * (i + 1) / n, zb = az + (bz - az) * (i + 1) / n;
      const ga = terrainHeight(xa, za), gb = terrainHeight(xb, zb), len = Math.hypot(xb - xa, zb - za), ang = Math.atan2(xb - xa, zb - za);
      for (const hh of [0.45, 0.95]) B.add('wood', box(0.08, 0.12, len), M((xa + xb) / 2, (ga + gb) / 2 + hh, (za + zb) / 2, ang));
      B.add('woodDark', new THREE.CylinderGeometry(0.09, 0.11, 1.4, 6), M(xa, ga + 0.55, za));
      addBox((xa + xb) / 2, (za + zb) / 2, 0.3, len, ang);
    }
  };
  rail(x0, z0, x1, z0); rail(x1, z0, x1, z1); rail(x0, z1, x0, z0); rail(x0, z1, pen.x - gate / 2, z1); rail(pen.x + gate / 2, z1, x1, z1);
  TOWN.pen = pen;
  TOWN.farm = { x: f.x, z: f.z, door: { x: f.x + Math.sin(ry) * 5.5, z: f.z + Math.cos(ry) * 5.5 } };
  for (let i = 0; i < 4; i++) { const x = f.x - dir.x * (10 + i * 3), z = f.z - dir.z * (10 + i * 3) + 4; if (isFree(x, z, 1.2)) { B.add('paint', colored(new THREE.CylinderGeometry(0.8, 0.8, 1.2, 14), '#d8b865'), M(x, terrainHeight(x, z) + 0.8, z, 0, 0, Math.PI / 2)); addCircle(x, z, 0.9); } }
}
