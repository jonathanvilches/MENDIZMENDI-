// Pueblo con su trazado de verdad (src/data/reales/<id>.json, de tools/pueblo-real-juego.py): el relieve del modelo
// digital EU-DEM, los ríos y regatas por donde van, las calles y caminos, las plazas, los puentes y las casas donde están
// (los datos de OpenStreetMap, ODbL). Da lo mismo que createTownLevel (town.js): terreno, río, calles, plaza, lugares para
// las misiones, campos y máscaras; así el resto del juego (misiones, vecinos, mapa, árboles, frontón) funciona igual.
// Norte = −z, como en todo el juego: el plano no se gira. Sin río de norte a sur, rx devuelve 9999 (el «sin río» de
// siempre) y el agua va por sus polilíneas (RIVERS con pts, src/world/water.js).
import { clamp, lerp, smoothstep, segDist, mulberry32 } from '../util/math.js';
import { fbm } from '../util/noise.js';
import { skylineFor } from '../data/horizonte.js';

const FAMILY = {
  atlantic: { forest: 0.55, grass: 'lush', crops: [0, 0, 4, 4, 1, 8] },
  pyrenean: { forest: 0.6, grass: 'alpine', crops: [0, 4, 4, 1, 2] },
  central: { forest: 0.22, grass: 'dry', crops: [2, 2, 1, 5, 5, 6, 3] },
  city: { forest: 0.15, grass: 'dry', crops: [2, 1, 5, 3] },
  ribera: { forest: 0.08, grass: 'arid', crops: [7, 7, 7, 5, 6, 3, 2] },
};
const BASE = 20;   // (altura del suelo de la plaza, como el «base» de los pueblos generados)
// el núcleo, donde se juega: el círculo de NUCLEO_PLAZA metros alrededor de la plaza y la envolvente de los lugares de
// las misiones del casco con NUCLEO_MARGEN metros de margen (ver «El núcleo», abajo). Si así quedan menos de NUCLEO_MIN
// casas (o del 40 % de las del mapa, en las aldeas), el círculo crece de 20 en 20 m hasta 300
const NUCLEO_PLAZA = 140, NUCLEO_MARGEN = 40, NUCLEO_MIN = 80;

// rejilla de cubos para preguntar rápido por los segmentos de una lista de polilíneas
function buckets(lines, size = 25, margin = 12) {
  const map = new Map();
  for (const L of lines) for (let i = 0; i < L.pts.length - 1; i++) {
    const a = L.pts[i], b = L.pts[i + 1], s = { a, b, L, i };
    const x0 = Math.floor((Math.min(a[0], b[0]) - margin) / size), x1 = Math.floor((Math.max(a[0], b[0]) + margin) / size);
    const z0 = Math.floor((Math.min(a[1], b[1]) - margin) / size), z1 = Math.floor((Math.max(a[1], b[1]) + margin) / size);
    for (let p = x0; p <= x1; p++) for (let q = z0; q <= z1; q++) { const k = p * 4096 + q; let l = map.get(k); if (!l) map.set(k, l = []); l.push(s); }
  }
  return (x, z) => map.get(Math.floor(x / size) * 4096 + Math.floor(z / size));
}
// punto en polígono y distancia a su borde (negativa dentro)
function polyDist(x, z, P) {
  let inside = false, d = 1e9;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, zi] = P[i], [xj, zj] = P[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
    d = Math.min(d, segDist(x, z, xi, zi, xj, zj).d);
  }
  return inside ? -d : d;
}
// envolvente convexa de unos puntos {x, z}, como polígono [[x, z], …] (con uno o dos puntos, esos mismos: polyDist da
// entonces la distancia al punto o al segmento)
function envolvente(A) {
  const P = A.slice().sort((a, b) => a.x - b.x || a.z - b.z);
  if (P.length < 3) return P.map(p => [p.x, p.z]);
  const cr = (o, a, b) => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x), lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1)).map(p => [p.x, p.z]);
}
const bbox = (P) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } return { x0, x1, z0, z1 }; };

export function createRealTownLevel(def, D) {
  const rnd = mulberry32(def.id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0);
  const F = FAMILY[def.family] || FAMILY.central;

  // ---------- Relieve: EU-DEM (rejilla de 20 m en el pueblo, de 60 m hasta 1,5 km), con interpolación cúbica ----------
  const g1 = D.dem, g2 = D.dem2, H1 = Float32Array.from(g1.h, v => v / 10), H2 = g2 ? Float32Array.from(g2.h) : null;
  const half1 = (g1.n - 1) * g1.step / 2, half2 = g2 ? (g2.n - 1) * g2.step / 2 : half1;
  const cub = (p0, p1, p2, p3, t) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
  function sampleG(H, n, step, half, x, z) {
    const fx = clamp((x + half) / step, 0, n - 1.0001), fz = clamp((z + half) / step, 0, n - 1.0001);
    const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
    const at = (a, b) => H[clamp(b, 0, n - 1) * n + clamp(a, 0, n - 1)];
    const row = (b) => cub(at(i - 1, b), at(i, b), at(i + 1, b), at(i + 2, b), tx);
    return cub(row(j - 1), row(j), row(j + 1), row(j + 2), tz);
  }
  const inner = (x, z) => Math.max(Math.abs(x), Math.abs(z)) < half1 - 20;
  function dem(x, z) {
    const a = sampleG(H1, g1.n, g1.step, half1, x, z);
    if (!H2) return a;
    const m = Math.max(Math.abs(x), Math.abs(z));
    if (m < half1 - 40) return a;
    const b = sampleG(H2, g2.n, g2.step, half2, x, z);
    return lerp(a, b, smoothstep(half1 - 40, half1, m));
  }

  // ---------- Ríos: polilíneas con el nivel del agua (bajando con la corriente) ----------
  const RV = (D.rios || []).filter(r => r.pts.length > 1).map((r, k) => ({ id: 'r' + k, name: r.n, half: r.w, pts: r.pts, lv: r.lv.map(v => BASE + v - 1.6) }));
  const riverAt = buckets(RV, 20, 14);
  const NONE = { d: 1e4, edge: 1e4, half: 0, level: -Infinity, river: 'A', dA: 1e4, dZ: 1e9 };
  function riverInfo(x, z) {
    const L = riverAt(x, z); if (!L) return NONE;
    let best = null, bd = 1e9;
    for (const s of L) { const r = segDist(x, z, s.a[0], s.a[1], s.b[0], s.b[1]), e = r.d - s.L.half; if (e < bd) { bd = e; best = { s, r }; } }
    if (!best) return NONE;
    const { s, r } = best, lv = lerp(s.L.lv[s.i], s.L.lv[s.i + 1], r.t);
    return { d: r.d, edge: r.d - s.L.half, half: s.L.half, level: lv, river: 'A', dA: r.d, dZ: 1e9, id: s.L.id };
  }
  // el punto del río más cercano (para las truchas que saltan junto al jugador)
  function riverPointNear(x, z) {
    let best = null, bd = 1e9;
    for (const L of RV) for (let i = 0; i < L.pts.length - 1; i++) {
      const a = L.pts[i], b = L.pts[i + 1], r = segDist(x, z, a[0], a[1], b[0], b[1]);
      if (r.d < bd) { bd = r.d; best = { x: a[0] + (b[0] - a[0]) * r.t, z: a[1] + (b[1] - a[1]) * r.t }; }
    }
    return best || { x: 9999, z };
  }
  const rx = () => 9999;

  // ---------- Calles y caminos ----------
  // (todas para colocar los lugares; las del casco que quedan fuera del núcleo se quitan después, en «El núcleo»)
  const PATHS = (D.calles || []).map((c, k) => ({ id: (c.n || c.c || 'calle') + '#' + k, name: c.n, type: c.t, w: c.w, pts: c.pts, cls: c.c }));
  let pathAt = buckets(PATHS, 25, 10);
  function pathQuery(x, z) {
    const list = pathAt(x, z);
    let best = { d: 1e9, w: 0, type: null, id: null };
    if (!list) return best;
    for (const s of list) {
      const r = segDist(x, z, s.a[0], s.a[1], s.b[0], s.b[1]);
      if (r.d - s.L.w < best.d - best.w) best = { d: r.d, w: s.L.w, type: s.L.type, id: s.L.id };
    }
    return best;
  }

  // ---------- Casas: dónde hay pueblo (para no poner árboles ni campos dentro) ----------
  // (todas para colocar los lugares; después solo las del núcleo, «El núcleo», y la máscara se rehace con ellas)
  const CASAS = (D.casas || []).filter(b => Math.max(Math.abs(b.x), Math.abs(b.z)) < half1 - 8);
  const VC = 8, VN = Math.ceil(2 * half1 / VC) + 1, VD = new Float32Array(VN * VN), DENS = new Uint8Array(VN * VN);
  function marcarCasas() {
    VD.fill(99); DENS.fill(0);
    for (const b of CASAS) {
      const r = Math.hypot(b.w, b.d) / 2, i0 = Math.floor((b.x - r - 40 + half1) / VC), i1 = Math.ceil((b.x + r + 40 + half1) / VC);
      const j0 = Math.floor((b.z - r - 40 + half1) / VC), j1 = Math.ceil((b.z + r + 40 + half1) / VC);
      // (las casas sueltas en el monte, bordas y caseríos, no hacen pueblo: solo cuentan las que tienen vecinas)
      for (let j = Math.max(0, j0); j <= Math.min(VN - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(VN - 1, i1); i++) {
        const d = Math.max(0, Math.hypot(-half1 + i * VC - b.x, -half1 + j * VC - b.z) - r);
        if (d < VD[j * VN + i]) VD[j * VN + i] = d;
      }
    }
    for (const b of CASAS) { const i = Math.round((b.x + half1) / VC), j = Math.round((b.z + half1) / VC); for (let q = -3; q <= 3; q++) for (let p = -3; p <= 3; p++) { const k = (j + q) * VN + (i + p); if (k >= 0 && k < DENS.length) DENS[k] = Math.min(255, DENS[k] + 1); } }
  }
  marcarCasas();
  const vgrid = (G, x, z) => { const fx = clamp((x + half1) / VC, 0, VN - 1.001), fz = clamp((z + half1) / VC, 0, VN - 1.001), i = Math.floor(fx), j = Math.floor(fz), a = fx - i, c = fz - j; return G[j * VN + i] * (1 - a) * (1 - c) + G[j * VN + i + 1] * a * (1 - c) + G[(j + 1) * VN + i] * (1 - a) * c + G[(j + 1) * VN + i + 1] * a * c; };
  function villageMask(x, z) {
    if (!inner(x, z)) return 0;
    const near = 1 - smoothstep(14, 34, vgrid(VD, x, z));
    return near * smoothstep(2.5, 6, vgrid(DENS, x, z));
  }

  // ---------- Plazas ----------
  const LG = D.lugares || {};
  const PL = LG.plaza || { x: 0, z: 0, r: 14, pts: null };
  const PLAZAS = (LG.plazas || []).map(p => ({ ...p, bb: bbox(p.pts) }));
  function plazaMask(x, z) {
    let m = 0;
    for (const p of PLAZAS) {
      if (x < p.bb.x0 - 2 || x > p.bb.x1 + 2 || z < p.bb.z0 - 2 || z > p.bb.z1 + 2) continue;
      m = Math.max(m, 1 - smoothstep(-0.6, 0.8, polyDist(x, z, p.pts)));
    }
    if (!PLAZAS.length) m = 1 - smoothstep(PL.r - 2, PL.r + 1, Math.hypot(x - PL.x, z - PL.z));
    return m;
  }

  // ---------- Usos del suelo: prados, huertas y frutales de verdad ----------
  const USOS = (D.usos || []).filter(u => ['prado', 'cesped', 'cultivo', 'frutales', 'huerta', 'vina'].includes(u.k)).map((u, k) => ({ ...u, i: k, bb: bbox(u.pts) }));
  const usoAt = buckets(USOS.map(u => ({ pts: [...u.pts, u.pts[0]], u })), 30, 0);
  function usoInfo(x, z) {
    const L = usoAt(x, z); if (!L) return null;
    const seen = new Set();
    for (const s of L) {
      const u = s.L.u; if (seen.has(u)) continue; seen.add(u);
      if (x < u.bb.x0 || x > u.bb.x1 || z < u.bb.z0 || z > u.bb.z1) continue;
      const d = polyDist(x, z, u.pts); if (d < 0) return { u, edge: -d };
    }
    return null;
  }

  // ---------- Lugares para las misiones ----------
  const occupied = (x, z, m = 3) => CASAS.some(b => { const c = Math.cos(b.ry), s = Math.sin(b.ry), dx = x - b.x, dz = z - b.z; return Math.abs(dx * c - dz * s) < b.w / 2 + m && Math.abs(dx * s + dz * c) < b.d / 2 + m; });
  const slopeAt = (x, z) => Math.hypot(dem(x + 3, z) - dem(x - 3, z), dem(x, z + 3) - dem(x, z - 3)) / 6;
  const okSpot = (x, z, m = 4, maxSlope = 0.22) => inner(x, z) && !occupied(x, z, m) && riverInfo(x, z).edge > 4 && slopeAt(x, z) < maxSlope && pathQuery(x, z).d > pathQuery(x, z).w + 1;
  // busca alrededor de (x, z) en anillos el primer sitio que cumpla ok
  function near(x, z, ok, r1 = 60, step = 4) {
    if (ok(x, z)) return { x, z };
    for (let r = step; r <= r1; r += step) for (let a = 0; a < Math.PI * 2; a += step / r) { const X = x + Math.cos(a) * r, Z = z + Math.sin(a) * r; if (ok(X, Z)) return { x: X, z: Z }; }
    return null;
  }
  const PLACES = { center: { x: 0, z: 0 }, plaza: { x: PL.x, z: PL.z, r: clamp(PL.r || 14, 9, 22), name: PL.n } };
  const ch = LG.iglesia;
  PLACES.church = ch ? { x: ch.x, z: ch.z, real: ch } : near(30, -30, (x, z) => okSpot(x, z, 12)) || { x: 30, z: -30 };
  if (LG.ayuntamiento) PLACES.townhall = { x: LG.ayuntamiento.x, z: LG.ayuntamiento.z, real: LG.ayuntamiento };
  // radio del casco: hasta donde llegan tres de cada cuatro casas con vecinas
  const ds = CASAS.filter(b => villageMask(b.x, b.z) > 0.5).map(b => Math.hypot(b.x, b.z)).sort((a, b) => a - b);
  const R = clamp(ds.length ? ds[Math.floor(ds.length * 0.75)] : 120, 90, 230);
  // la granja: un prado llano y libre fuera del casco, junto a un camino
  const meadows = USOS.filter(u => u.k === 'prado' || u.k === 'cesped');
  const ring = (r0, r1, ok) => { for (let r = r0; r <= r1; r += 10) for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2 + r * 0.01, x = Math.cos(a) * r, z = Math.sin(a) * r; if (ok(x, z)) return { x, z }; } return null; };
  const freeFarm = (x, z) => okSpot(x, z, 22, 0.16) && villageMask(x, z) < 0.05 && pathQuery(x, z).d < 40;
  PLACES.farm = meadows.map(u => { const c = u.pts.reduce((a, p) => [a[0] + p[0] / u.pts.length, a[1] + p[1] / u.pts.length], [0, 0]); return near(c[0], c[1], freeFarm, 40); }).find(Boolean) || ring(R + 30, 380, freeFarm) || { x: R + 60, z: 40 };
  PLACES.fields = ring(R + 20, 360, (x, z) => okSpot(x, z, 20, 0.2) && villageMask(x, z) < 0.05 && Math.hypot(x - PLACES.farm.x, z - PLACES.farm.z) > 60) || { x: -(R + 40), z: -90 };
  PLACES.forest = ring(Math.max(R + 120, 260), 420, (x, z) => okSpot(x, z, 40, 0.5) && villageMask(x, z) < 0.01 && Math.hypot(x - PLACES.farm.x, z - PLACES.farm.z) > 120) || { x: 0, z: -R - 130 };
  PLACES.market = near(PL.x + 10, PL.z + 10, (x, z) => okSpot(x, z, 3, 0.3), 50) || { x: PL.x + 6, z: PL.z + 6 };
  // junto al río, en la orilla, cerca de la plaza
  {
    let best = null, bd = 1e9;
    for (const L of RV) for (let i = 0; i < L.pts.length; i++) {
      const [x, z] = L.pts[i], d = Math.hypot(x - PL.x, z - PL.z);
      if (d < 25 || d > 260 || d > bd) continue;
      const nx = i < L.pts.length - 1 ? L.pts[i + 1][1] - z : z - L.pts[i - 1][1], nz = i < L.pts.length - 1 ? -(L.pts[i + 1][0] - x) : -(x - L.pts[i - 1][0]), nl = Math.hypot(nx, nz) || 1;
      for (const s of [1, -1]) { const X = x + s * nx / nl * (L.half + 5), Z = z + s * nz / nl * (L.half + 5); if (inner(X, Z) && !occupied(X, Z, 1.5)) { best = { x: X, z: Z }; bd = d; break; } }
    }
    PLACES.riverSpot = best || { x: PL.x + 60, z: PL.z + 60 };
  }
  // las cuatro salidas del pueblo y el sitio donde se llega: en calles, a la distancia del borde del casco
  const onStreet = (dirx, dirz, r0, r1) => {
    let best = null, bs = -1e9;
    for (const p of PATHS) for (const [x, z] of p.pts) {
      const d = Math.hypot(x, z); if (d < r0 || d > r1 || !inner(x, z)) continue;
      const s = (x * dirx + z * dirz) / d - (p.type === 'trail' ? 0.3 : 0) + (p.type === 'road' ? 0.15 : 0);
      if (s > bs && riverInfo(x, z).edge > 3 && !occupied(x, z, 1)) { bs = s; best = { x, z }; }
    }
    return best;
  };
  PLACES.edgeN = onStreet(0, -1, R + 20, R + 120) || { x: 0, z: -R - 40 };
  PLACES.edgeS = onStreet(0, 1, R + 20, R + 120) || { x: 0, z: R + 45 };
  PLACES.edgeE = onStreet(1, 0, R + 20, R + 120) || { x: R + 45, z: 0 };
  PLACES.edgeW = onStreet(-1, 0, R + 20, R + 120) || { x: -R - 30, z: 0 };
  {
    // la llegada: por la carretera principal, a unos 110 m de la plaza, en llano
    let best = null, bs = 1e9;
    for (const p of PATHS) {
      if (p.type === 'trail') continue;
      for (const [x, z] of p.pts) {
        const d = Math.hypot(x - PL.x, z - PL.z); if (d < 70 || d > 190 || !inner(x, z)) continue;
        const s = Math.abs(d - 110) * 0.05 + slopeAt(x, z) * 40 + (p.type === 'road' ? 0 : 1.5) + (riverInfo(x, z).edge < 4 ? 50 : 0) + (occupied(x, z, 1) ? 50 : 0);
        if (s < bs) { bs = s; best = { x, z }; }
      }
    }
    PLACES.spawn = best || { x: PL.x + 4, z: PL.z + R * 0.6 };
  }
  if (LG.fronton) { PLACES.frontonNear = { x: LG.fronton.x, z: LG.fronton.z, ry: LG.fronton.ry ?? null }; PLACES.frontonReal = true; }

  // ---------- Monumentos de la ficha: en su sitio de verdad si lo hay; si no, en un hueco libre ----------
  // (el castillo o el palacio sobre su edificio de los datos, buscado por su nombre; la muralla alrededor de la iglesia;
  // la almadía y el molino en la orilla del río; los miradores, las ruinas y los monolitos en lo más alto; el resto, en
  // un hueco libre cerca de la plaza o fuera del casco. Las casas de los datos que caen dentro del monumento no se levantan)
  const TAKEN = new Set();
  const nrm = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const townWords = new Set(nrm(def.name).split(/[\s/-]+/));
  const GENERIC = new Set(['casa', 'torre', 'palacio', 'iglesia', 'ermita', 'puente', 'castillo', 'mirador', 'plaza', 'fuente', 'molino', 'dolmen', 'ruinas',
    'sobre', 'medieval', 'romanico', 'museo', 'reyes', 'navarra', 'principe', 'galerias', 'medievales', 'piedra', 'tumba', 'entrada', 'cueva', 'sierra', 'verde']);
  const keysOf = (name) => nrm(name).split(/[\s,()'-]+/).filter(w => w.length > 4 && !GENERIC.has(w) && !townWords.has(w));
  // (nunca un polideportivo, un colegio o un hotel que lleve el nombre del personaje; si la ficha tiene palabras propias
  // —Zabaleta, Gayarre, Príncipe de Viana— han de estar en el nombre, y si no, basta con que sea del tipo: «castillo»)
  const NOTSITE = /polideportivo|kirol|colegio|ikastetxe|escuela|eskola|pabell|frontoi|hotel|hostal|restaurante|jatetxe|apartament|\bbar\b|camping|aparcamiento|parking/;
  let LMW = [];
  const rank = (n, keys, re) => { const k = keys.filter(w => n.includes(w)).length, r = !!(re && re.test(n)); return { ok: keys.length ? k > 0 : r, k, r: r ? 1 : 0, x: LMW.filter(w => n.includes(w)).length }; };
  const better = (a, b) => a.k - b.k || a.r - b.r || a.x - b.x;
  const byName = (keys, re) => {
    let best = null, bs = null;
    for (const c of CASAS) {
      if (!c.n || TAKEN.has(c)) continue;
      const n = nrm(c.n); if (NOTSITE.test(n)) continue;
      const sc = rank(n, keys, re); if (!sc.ok) continue;
      if (!best || better(sc, bs) > 0 || (better(sc, bs) === 0 && c.a > best.a)) { best = c; bs = sc; }
    }
    return best;
  };
  const mainRiver = RV.slice().sort((a, b) => b.half - a.half || b.pts.length - a.pts.length)[0] || null;
  const onBank = (d0, d1, m = 3) => {
    if (!mainRiver) return null;
    let best = null, bs = 1e9;
    for (let i = 0; i < mainRiver.pts.length - 1; i++) {
      const [x, z] = mainRiver.pts[i], d = Math.hypot(x - PL.x, z - PL.z); if (d < d0 || d > d1) continue;
      const [x1, z1] = mainRiver.pts[i + 1], l = Math.hypot(x1 - x, z1 - z) || 1, nx = (z1 - z) / l, nz = -(x1 - x) / l;
      for (const sd of [1, -1]) { const X = x + sd * nx * (mainRiver.half + 6), Z = z + sd * nz * (mainRiver.half + 6); if (inner(X, Z) && !occupied(X, Z, m) && slopeAt(X, Z) < 0.3) { const sc = Math.abs(d - (d0 + d1) / 2); if (sc < bs) { bs = sc; best = { x: X, z: Z }; } } }
    }
    return best;
  };
  const highest = (r0, r1, m) => { let best = null, bh = -1e9; for (let r = r0; r <= r1; r += 15) for (let k = 0; k < 36; k++) { const a = k / 36 * Math.PI * 2, x = PL.x + Math.cos(a) * r, z = PL.z + Math.sin(a) * r; if (!okSpot(x, z, m, 0.35) || PLACES.landmarks.some(l => Math.hypot(l.x - x, l.z - z) < 40)) continue; const h = dem(x, z) - r * 0.02; if (h > bh) { bh = h; best = { x, z }; } } return best; };
  const freeNear = (x0, z0, r0, r1, m) => ring(r0, r1, (x, z) => okSpot(x + x0, z + z0, m, 0.25) && !PLACES.landmarks.some(l => Math.hypot(l.x - x - x0, l.z - z - z0) < 30));
  // (los lugares con nombre de monumento de los datos: el castillo, el cerco o la cueva donde están aunque su edificio
  // no tenga nombre; cuenta cada palabra del nombre de la ficha que coincide y el tipo de sitio que es)
  const NOMS = (D.monumentos || []).filter(p => inner(p.x, p.z)), USED = new Set();
  const KIND_RE = { castle: /castillo|gaztelu|palacio real|errege jauregi/, palace: /palacio|jauregi/, towerhouse: /dorre|torre/, chapel: /ermita|baseliza|kapera|capilla|silo/,
    walls: /cerco|muralla|harresi/, cave: /cueva|kobazulo|leize/, dolmen: /dolmen|trikuharri/, mill: /molino|errota/, horreo: /horreo|garaixea/, lookout: /mirador|begiratoki/,
    ruin: /ruina/, stone: /tumba|piedra/, stelae: /estela|hilarri/, palomeras: /palomer|usategi/, tunnel: /via verde|plazaola|tunel/, dig: /poblado|yacimiento/ };
  const NATURAL = new Set(['cave', 'dolmen', 'lookout', 'pass', 'gorge', 'dig', 'monolith']);
  const placeByName = (keys, re, natural) => {
    let best = null, bs = null;
    for (const p of NOMS) {
      if (USED.has(p)) continue;
      const n = nrm(p.n); if (NOTSITE.test(n)) continue;
      // (con tipo, el lugar ha de ser de ese tipo; los sitios naturales, fuera del casco: el punto de la cueva de las
      // brujas que trae el dato está en la taquilla del pueblo, no en la cueva)
      const sc = rank(n, keys, re); if (!(re ? sc.r : sc.k)) continue;
      if (natural && villageMask(p.x, p.z) > 0.3) continue;
      const d = Math.hypot(p.x - PL.x, p.z - PL.z);
      if (!best || better(sc, bs) > 0 || (better(sc, bs) === 0 && d < Math.hypot(best.x - PL.x, best.z - PL.z))) { best = p; bs = sc; }
    }
    return best;
  };
  const nearHouse = (x, z, r) => CASAS.filter(c => !TAKEN.has(c) && c.k !== 'church' && Math.hypot(c.x - x, c.z - z) < r).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0] || null;
  PLACES.landmarks = [];
  const pads = [];
  for (const lm of def.landmarks || []) {
    let pos = null, b = null, clearR = 0, placeName = null;
    const keys = keysOf(lm.name), k = lm.kind; LMW = nrm(lm.name).split(/[^a-z0-9ñ]+/).filter(w => w.length > 3);
    if (k === 'castle') { b = byName(keys, /castillo|gaztelu|palacio real|errege jauregi|jauregi/); clearR = 30; }
    else if (k === 'palace') { b = byName(keys, /palacio|jauregi/); }
    else if (k === 'towerhouse') { b = byName(keys, /dorre|torre/) || CASAS.filter(c => c.k === 'tower' && !TAKEN.has(c)).sort((p, q) => Math.hypot(p.x, p.z) - Math.hypot(q.x, q.z))[0] || null; }
    else if (k === 'house') { b = byName(keys, null); }
    else if (k === 'chapel') { b = byName(keys, /ermita|baseliza|kapera|capilla/); }
    if (!b && !['bridge', 'townhall', 'kiosk', 'fountain', 'plaza'].includes(k)) {
      const pl = placeByName(keys, KIND_RE[k] || null, NATURAL.has(k));
      if (pl) {
        USED.add(pl); placeName = pl.n;
        if (['castle', 'palace', 'towerhouse', 'house', 'chapel', 'mill', 'horreo'].includes(k)) b = nearHouse(pl.x, pl.z, 25);
        if (!b) pos = { x: pl.x, z: pl.z, ring: k === 'walls' || undefined };
      }
    }
    if (pos) { /* ya en su sitio por el lugar con nombre */ }
    else if (b) { TAKEN.add(b); pos = { x: b.x, z: b.z }; }
    else if (k === 'bridge' && D.puentes?.length) {
      const named = D.puentes.find(p => p.n && keys.some(w => nrm(p.n).includes(w)));
      const mid = (p) => p.pts[Math.floor(p.pts.length / 2)], wet = (p) => { const [x, z] = mid(p); return riverInfo(x, z).edge < 2 ? riverInfo(x, z).half : 0; };
      const P0 = named || D.puentes.slice().sort((p, q) => (wet(q) - wet(p)) * 40 + Math.hypot(mid(p)[0] - PL.x, mid(p)[1] - PL.z) - Math.hypot(mid(q)[0] - PL.x, mid(q)[1] - PL.z))[0];
      const m = P0.pts[Math.floor(P0.pts.length / 2)]; pos = { x: m[0], z: m[1] }; P0.mision = true;   // (este se levanta aunque no cruce agua: src/world/townReal.js)
    }
    else if (['townhall', 'kiosk', 'fountain', 'plaza'].includes(k)) pos = { x: PL.x, z: PL.z + (k === 'townhall' ? -PL.r - 7 : 0), center: k !== 'townhall' };
    else if (k === 'walls' && def.family !== 'city') pos = { x: PLACES.church.x, z: PLACES.church.z, ring: true };
    else if (k === 'stelae' || k === 'chapel' || (k === 'stone' && /tumba/.test(nrm(lm.name)))) pos = freeNear(PLACES.church.x, PLACES.church.z, 14, 60, 4) || { x: PLACES.church.x + 18, z: PLACES.church.z + 6 };
    else if (k === 'raft') pos = onBank(30, 200, 4);
    else if (k === 'mill') pos = onBank(60, 320, 7);
    else if (k === 'gorge') pos = onBank(260, 440, 6);
    else if (['lookout', 'pass', 'ruin', 'monolith', 'dig'].includes(k)) pos = highest(120, 420, k === 'dig' ? 14 : 8);
    else if (k === 'arch') pos = onStreet(1, 0, R * 0.5, R + 30) && freeNear(0, 0, R * 0.6, R + 40, 3);
    if (!pos) {
      const big = ['castle', 'walls', 'dig', 'ruin', 'monolith', 'dolmen', 'lookout', 'cave', 'palomeras', 'tunnel', 'stone', 'pass', 'gorge'].includes(k), m = big ? 16 : 7;
      pos = ring(big ? R + 20 : 40, big ? 400 : 260, (x, z) => okSpot(x, z, m, 0.25) && !PLACES.landmarks.some(l => Math.hypot(l.x - x, l.z - z) < 40)) || { x: PL.x + 60, z: PL.z - 60 };
    }
    if (lm.x != null) pos = { x: lm.x, z: lm.z };
    const o = { ...lm, x: pos.x, z: pos.z, center: pos.center, ring: pos.ring, realBuilding: b || null, realPlace: placeName };
    PLACES.landmarks.push(o);
    // (las casas que pisaría el monumento no se levantan: el castillo ocupa su recinto; los demás, unos metros)
    const rr = clearR || (k === 'walls' && pos.ring ? 0 : ['bridge', 'plaza', 'kiosk', 'fountain', 'townhall'].includes(k) || b ? 0 : 8);
    if (rr) for (const c of CASAS) if (Math.hypot(c.x - o.x, c.z - o.z) < rr + Math.max(c.w, c.d) / 2) TAKEN.add(c);
    if (k === 'walls' && pos.ring) for (const c of CASAS) if (Math.abs(Math.hypot(c.x - o.x, c.z - o.z) - 44) < Math.max(c.w, c.d) / 2 + 3) TAKEN.add(c);
    if (!b && !['bridge', 'plaza', 'kiosk', 'fountain', 'townhall'].includes(k) && !pos.ring) pads.push({ x: o.x, z: o.z, r: k === 'castle' ? 30 : 9, blend: 12 });
    if (b && k === 'castle') pads.push({ x: o.x, z: o.z, r: 30, blend: 16 });
  }
  // ---------- El núcleo: donde se juega ----------
  // El pueblo se levanta solo donde están las misiones: el círculo alrededor de la plaza y la envolvente de los lugares de
  // las misiones del casco (iglesia, ayuntamiento, frontón, mercado, llegada, orilla del río y los monumentos que tienen
  // casas alrededor), con un margen. Dentro, todas las casas de los datos en su sitio, sin quitar ninguna: la misma
  // estructura del pueblo; fuera, campo. Con un círculo fijo de 300 m, en Estella quedaban fuera el palacio y el puente de
  // la misión y en Tudela se levantaban casi mil casas que no pisaba ninguna misión. Los miradores, dólmenes, cuevas y
  // demás lugares del monte no cuentan: están en el campo
  const MONTE = new Set(['lookout', 'pass', 'dig', 'monolith', 'dolmen', 'gorge', 'cave', 'tunnel']);
  const conCasas = (p) => CASAS.some(b => Math.hypot(b.x - p.x, b.z - p.z) < 35);
  const ANCLAS = [PLACES.plaza, PLACES.church, PLACES.townhall, PLACES.frontonReal && PLACES.frontonNear, PLACES.market, PLACES.spawn,
    riverInfo(PLACES.riverSpot.x, PLACES.riverSpot.z).edge < 12 && PLACES.riverSpot,
    ...PLACES.landmarks.filter(l => !MONTE.has(l.kind) && Math.hypot(l.x - PL.x, l.z - PL.z) < 460 && conCasas(l))].filter(Boolean).map(p => ({ x: p.x, z: p.z }));
  const HULL = envolvente(ANCLAS);
  // (en los pueblos con pocas casas en los datos alrededor de la plaza, como Tafalla o Viana, el círculo crece hasta que
  // el núcleo parece un pueblo)
  const objetivo = Math.min(NUCLEO_MIN, Math.round(CASAS.length * 0.4));
  const dHull = CASAS.map(b => polyDist(b.x, b.z, HULL) - NUCLEO_MARGEN), dPlaza = CASAS.map(b => Math.hypot(b.x - PL.x, b.z - PL.z));
  let rPlaza = NUCLEO_PLAZA;
  while (rPlaza < 300 && CASAS.filter((b, i) => dHull[i] <= 0 || dPlaza[i] <= rPlaza).length < objetivo) rPlaza += 20;
  // (negativo o cero dentro del núcleo; fuera, los metros que faltan para llegar a él)
  const nucleoD = (x, z) => Math.min(Math.hypot(x - PL.x, z - PL.z) - rPlaza, polyDist(x, z, HULL) - NUCLEO_MARGEN);
  { const dentro = CASAS.filter(b => nucleoD(b.x, b.z) <= 0); CASAS.length = 0; CASAS.push(...dentro); }
  marcarCasas();
  // (las calles del casco que quedan enteras fuera, sin casas a los lados, parecían una urbanización a medio hacer en
  // mitad del campo: fuera. Las carreteras y los caminos se quedan)
  {
    const urbana = (c) => c.type === 'street' || c.cls === 'footway' || c.cls === 'pedestrian';
    const quedan = PATHS.filter(c => !(urbana(c) && c.pts.every(([x, z]) => nucleoD(x, z) > 35)));
    PATHS.length = 0; PATHS.push(...quedan); pathAt = buckets(PATHS, 25, 10);
  }
  // (las salidas del pueblo, otra vez, en las calles y caminos que quedan)
  PLACES.edgeN = onStreet(0, -1, R + 20, R + 120) || PLACES.edgeN; PLACES.edgeS = onStreet(0, 1, R + 20, R + 120) || PLACES.edgeS;
  PLACES.edgeE = onStreet(1, 0, R + 20, R + 120) || PLACES.edgeE; PLACES.edgeW = onStreet(-1, 0, R + 20, R + 120) || PLACES.edgeW;
  PLACES.courts = [];
  PLACES.clearings = PLACES.landmarks.map(l => ({ x: l.x, z: l.z, r0: (l.pad || 14) + 12, r1: l.pad || 12 }));
  pads.push({ x: PLACES.farm.x, z: PLACES.farm.z, r: 16, blend: 18 });
  // (el sitio del frontón de verdad: llano y sin árboles ni lindes de campo encima)
  if (PLACES.frontonReal) { const f = PLACES.frontonNear; PLACES.clearings.push({ x: f.x, z: f.z, r0: 36, r1: 26 }); pads.push({ x: f.x, z: f.z, r: 20, blend: 10 }); }

  // ---------- Altura final ----------
  const SKY = skylineFor(def);
  function skyTan(x, z) {
    if (!SKY) return 0.12;
    const b = (Math.atan2(x, -z) * 180 / Math.PI + 360) % 360, i = Math.floor(b), f = b - i;
    return SKY[i] * (1 - f) + SKY[(i + 1) % 360] * f;
  }
  for (const p of pads) p.h = BASE + dem(p.x, p.z);
  const meadowMask = (x, z) => 1 - smoothstep(20, 45, Math.hypot(x - PLACES.farm.x, z - PLACES.farm.z));
  const iratiMask = (x, z) => 1 - smoothstep(80, 120, Math.hypot(x - PLACES.forest.x, z - PLACES.forest.z));
  function rawHeight(x, z, detail) {
    let h = BASE + dem(x, z);
    // (más allá de lo que da la rejilla lejana, el anillo de sierras sube al ángulo del horizonte de verdad)
    const r4 = Math.pow(x ** 4 + z ** 4, 0.25);
    if (r4 > half2 * 0.8) h = Math.max(h, BASE + skyTan(x, z) * r4 * smoothstep(half2 * 0.8, half2 * 1.2, r4));
    const vm = villageMask(x, z);
    // el modelo del terreno va cada 20 m: algo de relieve fino fuera del casco para que no se vea liso
    h += fbm(x / 70 + 3.1, z / 70 - 1.7, 3) * 1.6 * (1 - vm);
    if (detail) h += fbm(x / 26, z / 26, 3) * 0.5 * (0.3 + (1 - vm));
    for (const pad of pads) {
      const dd = Math.hypot(x - pad.x, z - pad.z) - pad.r;
      const k = 1 - smoothstep(0, pad.blend, dd);
      if (k > 0) h = lerp(h, pad.h, k);
    }
    return { h, vm, mm: meadowMask(x, z) };
  }
  function finalHeight(x, z, pathInfo) {
    const a = rawHeight(x, z, true);
    let h = a.h;
    if (pathInfo && pathInfo.d < pathInfo.w + 4) {
      const s = rawHeight(x, z, false).h;
      const k = 1 - smoothstep(pathInfo.w * 0.6, pathInfo.w + 4, pathInfo.d);
      h = lerp(h, s, k * 0.9);
    }
    // las plazas, llanas (al nivel de su centro: en los pueblos de ladera la plaza es un rellano)
    const pm = plazaMask(x, z);
    if (pm > 0) h = lerp(h, BASE + dem(PL.x, PL.z), pm * 0.7);
    // el cauce: el agua a su nivel y la orilla un metro y pico por encima; en el casco, con muro (el escalón es recto)
    const r = riverInfo(x, z);
    if (r.edge < 7) {
      const inVillage = a.vm > 0.5, bankW = inVillage ? 1.0 : 4.5;
      const bed = r.level - 1.0 - 0.4 * clamp(1 - r.d / Math.max(r.half, 0.1), 0, 1);
      const k = smoothstep(inVillage ? -0.3 : -2.0, bankW, r.edge);
      h = Math.min(h, lerp(bed, Math.max(h, r.level + 1.4), k));
      if (r.edge < -0.4) h = Math.min(h, bed);
    }
    return { h, river: r, vm: a.vm, mm: a.mm };
  }
  const valleyFloor = (x, z) => BASE + dem(x, z);

  // ---------- Campos: los de verdad y, fuera de ellos, parcelas donde la ladera lo permite ----------
  const ph = rnd() * 6.28;
  function hash2(i, j) { const s = Math.sin(i * 127.1 + j * 311.7 + ph) * 43758.5453; return s - Math.floor(s); }
  const KIND_CROP = { prado: 0, cesped: 4, cultivo: null, frutales: 8, huerta: 7, vina: 5 };
  function fieldInfo(x, z) {
    let mask = 1 - villageMask(x, z) * 1.2;
    mask *= smoothstep(6, 14, riverInfo(x, z).edge);
    const r4 = Math.pow(x ** 4 + z ** 4, 0.25);
    mask *= 1 - smoothstep(320, 400, r4);
    mask *= 1 - meadowMask(x, z);
    mask *= smoothstep(80, 120, Math.hypot(x - PLACES.forest.x, z - PLACES.forest.z));
    for (const c of PLACES.clearings) mask *= smoothstep(c.r1, c.r0 + 8, Math.hypot(x - c.x, z - c.z));
    mask = clamp(mask, 0, 1);
    if (mask <= 0.01) return { mask: 0, type: 0, edge: 99 };
    const U = usoInfo(x, z);
    if (U) {
      const t = KIND_CROP[U.u.k] ?? F.crops[Math.floor(hash2(U.u.i, 7) * F.crops.length)];
      const a = U.u.i * 0.7, c = Math.cos(a), s = Math.sin(a), v = -x * s + z * c;
      return { mask, type: t, edge: U.edge, stripe: Math.sin(v * 1.6), row: v, cell: 100000 + U.u.i };
    }
    // (sin dato: parcelas solo donde la ladera es suave; en las cuestas, prado o monte)
    mask *= 1 - smoothstep(0.12, 0.22, slopeAt(x, z));
    if (mask <= 0.01) return { mask: 0, type: 0, edge: 99 };
    const a = 0.2 + ph * 0.05, c = Math.cos(a), s = Math.sin(a);
    const wx = x + fbm(x / 90, z / 90, 2) * 12, wz = z + fbm(x / 90 + 7, z / 90 - 3, 2) * 12;
    const u = wx * c + wz * s, v = -wx * s + wz * c, cu = 46, cv = 30;
    const i = Math.floor(u / cu), j = Math.floor(v / cv), fu = u / cu - i, fv = v / cv - j;
    const edge = Math.min(Math.min(fu, 1 - fu) * cu, Math.min(fv, 1 - fv) * cv);
    return { mask, type: F.crops[Math.floor(hash2(i, j) * F.crops.length)], edge, stripe: Math.sin(v * 1.6), row: v, cell: i * 1000 + j };
  }
  function TREE_MIX(x, z, h, n) {
    const f = def.family;
    if (f === 'pyrenean') return h > 60 || n > 0 ? 'fir' : 'beech';
    if (f === 'atlantic') return n > 0.25 ? 'beech' : n > -0.2 ? 'oak' : 'chestnut';
    if (f === 'ribera') return riverInfo(x, z).edge < 30 ? 'poplar' : n > 0 ? 'pine' : 'olive';
    return n > 0.2 ? 'pine' : n > -0.3 ? 'oak' : 'olive';
  }
  const RIVERS = RV.map(L => ({ pts: L.pts, levels: L.lv, half: L.half, name: L.name }));
  const real = { data: D, casas: CASAS, anclas: ANCLAS, taken: TAKEN, puentes: D.puentes || [], rios: RV, plazas: PLAZAS, piscinas: D.piscinas || [], atribucion: D.atribucion };
  return {
    rx, zz: () => 9999, CONF: { x: 9999, z: 9999 }, FA: () => BASE, FZ: () => BASE, riverHalfA: () => 0, RIVER_HALF_Z: 0,
    riverInfo, riverPointNear, valleyFloor, finalHeight, pathQuery, plazaMask, fieldInfo, villageMask, meadowMask, iratiMask, skyTan,
    PLACES, MEADOW: null, PATHS, BRIDGES: [], PONDS: [], SPECIAL_TREES: [], TREE_MIX, R,
    RIVERS, BOUNDARY: 440, def, family: def.family, relief: 'real', addPad: (x, z, r, blend = 14) => pads.push({ x, z, r, blend, h: BASE + dem(x, z) }), PADS: pads,
    FOREST: F.forest, TONE: F.grass, real,
  };
}
