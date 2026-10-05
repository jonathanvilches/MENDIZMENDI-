// Geografía del valle (trazado adaptado para jugar, inspirado en Otsagabia / Ochagavía).
// Unidades en metros. Norte = -Z, Este = +X.
import { clamp, lerp, smoothstep, segDist } from '../util/math.js';
import { fbm, ridged } from '../util/noise.js';

export const HALF = 500;         // el mundo jugable va de -500 a 500
export const CELL = 2;           // resolución del mapa de alturas
export const N = HALF * 2 / CELL + 1;

// ---------- Ríos ----------
export const rx = z => 7 * Math.sin(z * 0.013) + 20 * Math.sin(z * 0.0042 + 0.8) - 20 * Math.sin(0.8);
const rxd = z => 7 * 0.013 * Math.cos(z * 0.013) + 20 * 0.0042 * Math.cos(z * 0.0042 + 0.8);
export const CONF = { x: rx(72), z: 72 };               // confluencia Anduña + Zatoya
export const zz = x => CONF.z - 0.07 * (x - CONF.x) + 9 * Math.sin((x - CONF.x) * 0.016) ;
const zzd = x => -0.07 + 9 * 0.016 * Math.cos((x - CONF.x) * 0.016);

export const FA = z => -0.018 * z + 24 * smoothstep(-110, -470, z);
export const FZ = x => FA(CONF.z) + 0.02 * Math.max(0, x - CONF.x);
export const riverHalfA = z => (z > CONF.z ? 7 : 5.2) + (z < -200 ? -0.8 : 0);
export const RIVER_HALF_Z = 4.6;

export function riverInfo(x, z) {
  const dA = Math.abs(x - rx(z)) / Math.sqrt(1 + rxd(z) ** 2);
  let dZ = 1e9;
  if (x > CONF.x - 2) dZ = Math.abs(z - zz(x)) / Math.sqrt(1 + zzd(x) ** 2);
  const wA = riverHalfA(z);
  // superficie del agua y fondo
  const levelA = FA(z) - 0.9, levelZ = FZ(x) - 0.9;
  const inA = dA - wA, inZ = dZ - RIVER_HALF_Z;
  if (inA < inZ) return { d: dA, edge: inA, half: wA, level: levelA, river: 'A', dA, dZ };
  return { d: dZ, edge: inZ, half: RIVER_HALF_Z, level: levelZ, river: 'Z', dA, dZ };
}

export function valleyFloor(x, z) {
  const fa = FA(z);
  if (x < CONF.x - 2) return fa;
  const r = riverInfo(x, z);
  const w = smoothstep(0, 1, r.dA / (r.dA + r.dZ + 1e-6));
  return lerp(fa, FZ(x), w);
}

// ---------- Lugares ----------
export const PLACES = {
  crucero: { x: rx(96) - 25, z: 96, name: 'Crucero' },
  bridgeMain: { z: -8 },
  plaza: { x: rx(-8) + 34, z: -8, r: 15 },
  church: { x: -62, z: -34, name: 'San Juan Evangelista' },
  fronton: { x: 47, z: 56 },
  muskilda: { x: 196, z: -52, name: 'Santuario de Muskilda' },
  borda: { x: -236, z: 26, name: 'Borda de Joxemari' },
  pond: { x: 78, z: -345, r: 26, name: 'Balsa de Irati' },
  waterfall: { x: 99, z: -367 },
  irati: { x: 0, z: -300, name: 'Selva de Irati' },
  mirador: { x: -110, z: -150, name: 'Mirador' },
};
PLACES.bridgeMain.x = rx(PLACES.bridgeMain.z);

export const MEADOW = { x: -230, z: 40, rx: 105, rz: 95, level: 0 };
export const CHURCH_PAD = { x: PLACES.church.x, z: PLACES.church.z, r: 22, h: 6.5 };

// ---------- Caminos ----------
// type: street (empedrado), road (tierra ancha), trail (sendero)
const alongA = (z0, z1, off, step = 10) => { const p = []; const s = Math.sign(z1 - z0); for (let z = z0; s > 0 ? z <= z1 : z >= z1; z += step * s) p.push([rx(z) + off, z]); return p; };

export const PATHS = [
  { id: 'west', type: 'street', w: 3.4, pts: alongA(-100, 84, -15, 6) },
  { id: 'east', type: 'street', w: 3.4, pts: alongA(-100, 58, 15, 6) },
  { id: 'bridgeN', type: 'street', w: 2.6, pts: [[rx(-64) - 15, -64], [rx(-64) + 15, -64]] },
  { id: 'bridgeM', type: 'street', w: 3.0, pts: [[rx(-8) - 15, -8], [rx(-8) + 15, -8]] },
  { id: 'bridgeS', type: 'street', w: 2.6, pts: [[rx(36) - 15, 36], [rx(36) + 15, 36]] },
  { id: 'toPlaza', type: 'street', w: 3.4, pts: [[rx(-8) + 15, -8], [PLACES.plaza.x, -8]] },
  { id: 'westBack', type: 'street', w: 2.3, pts: alongA(-88, 70, -39, 6) },
  { id: 'eastBack', type: 'street', w: 2.3, pts: alongA(-92, 46, 39, 6) },
  { id: 'westOuter', type: 'street', w: 2.2, pts: alongA(-76, 58, -64, 6) },
  { id: 'eastOuter', type: 'street', w: 2.2, pts: alongA(-22, 40, 63, 6) },
  { id: 'lnW4', type: 'street', w: 2.0, pts: [[rx(-4) - 39, -4], [rx(-4) - 64, -4]] },
  { id: 'lnW5', type: 'street', w: 2.0, pts: [[rx(44) - 39, 44], [rx(44) - 64, 44]] },
  { id: 'lnE3', type: 'street', w: 2.0, pts: [[rx(10) + 39, 10], [rx(10) + 63, 10]] },
  { id: 'lnW1', type: 'street', w: 2.0, pts: [[rx(-58) - 15, -58], [rx(-58) - 39, -58]] },
  { id: 'lnW2', type: 'street', w: 2.0, pts: [[rx(16) - 15, 16], [rx(16) - 39, 16]] },
  { id: 'lnW3', type: 'street', w: 2.0, pts: [[rx(62) - 15, 62], [rx(62) - 39, 62]] },
  { id: 'lnE1', type: 'street', w: 2.0, pts: [[rx(-72) + 15, -72], [rx(-72) + 39, -72]] },
  { id: 'lnE2', type: 'street', w: 2.0, pts: [[rx(26) + 15, 26], [rx(26) + 39, 26]] },
  { id: 'toFronton', type: 'street', w: 2.4, pts: [[rx(46) + 15, 46], [rx(50) + 18, 52], [PLACES.fronton.x - 17, 56]] },
  { id: 'toChurch', type: 'street', w: 2.8, pts: [[rx(-30) - 15, -30], [-36, -31], [-46, -34], [PLACES.church.x + 13, -34]] },
  { id: 'south', type: 'road', w: 3.2, pts: [...alongA(84, 490, -15, 12)] },
  { id: 'muskilda', type: 'trail', w: 1.7, pts: [[PLACES.plaza.x + 12, -8], [78, -6], [104, 4], [128, -14], [120, -34], [146, -44], [170, -30], [184, -46], [PLACES.muskilda.x - 10, -52]] },
  { id: 'irati', type: 'trail', w: 1.8, pts: [...alongA(-100, -480, -17, 12)] },
  { id: 'iratiBridge', type: 'trail', w: 1.5, pts: [[rx(-300) - 17, -300], [rx(-300) + 16, -300], [40, -318], [PLACES.pond.x - 22, -338]] },
  { id: 'meadow', type: 'trail', w: 1.8, pts: [[PLACES.church.x - 12, -34], [-96, -30], [-128, -12], [-160, 0], [-192, 16], [PLACES.borda.x + 8, 24]] },
  { id: 'mirador', type: 'trail', w: 1.4, pts: [[-96, -30], [-104, -70], [-98, -104], [-112, -138], [PLACES.mirador.x, PLACES.mirador.z]] },
];

export const BRIDGES = [
  { id: 'medieval', z: -8, w: 3.6, arch: 1.9, span: 30, main: true, name: 'Puente medieval' },
  { id: 'norte', z: -64, w: 2.8, arch: 1.2, span: 30 },
  { id: 'sur', z: 36, w: 2.8, arch: 1.2, span: 30 },
  { id: 'irati', z: -300, w: 2.0, arch: 0.8, span: 34, wood: true },
];
for (const b of BRIDGES) { b.cx = rx(b.z); b.xa = b.cx - b.span / 2; b.xb = b.cx + b.span / 2; }

// ---------- Máscaras ----------
export function villageMask(x, z) {
  const e = Math.hypot((x - 10) / 100, (z + 8) / 118);
  return 1 - smoothstep(0.62, 1.2, e);
}
export function meadowMask(x, z) {
  const e = Math.hypot((x - MEADOW.x) / MEADOW.rx, (z - MEADOW.z) / MEADOW.rz);
  return 1 - smoothstep(0.6, 1.0, e);
}
export function iratiMask(x, z) { return smoothstep(-150, -215, z); }

// ---------- Altura analítica ----------
const PADS = [];
let rawHeightNoPads = null;
function rawHeight(x, z, detail) {
  const F = valleyFloor(x, z);
  const r = riverInfo(x, z);
  const d = r.d;
  let h = F + 62 * Math.pow(smoothstep(22, 340, d), 1.35);
  // Muskilda
  const dm = Math.hypot(x - PLACES.muskilda.x, z - PLACES.muskilda.z);
  h += 30 * Math.exp(-(dm * dm) / (2 * 70 * 70));
  // montañas del borde
  const r4 = Math.pow(x ** 4 + z ** 4, 0.25);
  const mt = smoothstep(390, 560, r4);
  h += mt * (95 + 70 * ridged(x / 160, z / 160, 4));
  // relieve
  const rough = 0.25 + smoothstep(30, 220, d) * 0.9 + mt;
  h += fbm(x / 140 + 3.1, z / 140 - 1.7, 4) * 9 * rough;
  if (detail) h += fbm(x / 26, z / 26, 3) * 0.9 * (0.3 + rough);
  // prado de la borda
  const mm = meadowMask(x, z);
  if (mm > 0) h = lerp(h, 27 + fbm(x / 60, z / 60, 3) * 2.2 + (x - MEADOW.x) * -0.03, mm);
  // pueblo
  const vm = villageMask(x, z);
  if (vm > 0) {
    const target = F + 1.1 + Math.max(0, d - 26) * 0.1 + (detail ? fbm(x / 40, z / 40, 2) * 0.25 : 0);
    h = lerp(h, target, vm);
  }
  // plataforma de la iglesia
  const dc = Math.hypot(x - CHURCH_PAD.x, z - CHURCH_PAD.z);
  const cp = smoothstep(CHURCH_PAD.r + 16, CHURCH_PAD.r, dc);
  if (cp > 0) h = lerp(h, Math.max(h, valleyFloor(CHURCH_PAD.x, CHURCH_PAD.z) + 1.1 + CHURCH_PAD.h), cp);
  // explanadas del frontón y la borda
  for (const pad of PADS) {
    const dx = Math.abs(x - pad.x) - pad.hw, dz = Math.abs(z - pad.z) - pad.hd;
    const dd = Math.hypot(Math.max(dx, 0), Math.max(dz, 0));
    const k = 1 - smoothstep(0, pad.blend, dd);
    if (k > 0) { if (pad.h == null) pad.h = rawHeightNoPads(pad.x, pad.z); h = lerp(h, pad.h, k); }
  }
  // Muskilda: explanada
  const mp = smoothstep(26, 14, dm);
  if (mp > 0) h = lerp(h, rawHeightMuskildaTop, mp);
  // balsa de Irati
  const dp = Math.hypot(x - PLACES.pond.x, z - PLACES.pond.z);
  if (dp < PLACES.pond.r + 14) {
    const lvl = pondLevel;
    const bowl = lvl - 1.6 + Math.pow(Math.max(0, dp - PLACES.pond.r + 6) / 20, 1.6) * 3;
    const k = smoothstep(PLACES.pond.r + 14, PLACES.pond.r - 2, dp);
    h = lerp(h, Math.min(h, Math.max(bowl, lvl - 1.6)), k);
    if (dp < PLACES.pond.r + 6) h = Math.min(h, lerp(lvl + 0.8, h, smoothstep(PLACES.pond.r + 1, PLACES.pond.r + 10, dp)));
  }
  return { h, r, d, F, vm, mm };
}
let rawHeightMuskildaTop = 0, pondLevel = 0;
rawHeightNoPads = (x, z) => rawHeight(x, z, false).h;
{
  const pads = [{ x: PLACES.fronton.x + 2, z: PLACES.fronton.z, hw: 19, hd: 9, blend: 24 }, { x: PLACES.borda.x, z: PLACES.borda.z - 6, hw: 12, hd: 18, blend: 16 }];
  for (const p of pads) p.h = rawHeightNoPads(p.x, p.z);
  PADS.push(...pads);
}
{
  // Plataformas calculadas antes
  const m = PLACES.muskilda;
  const F = valleyFloor(m.x, m.z), r = riverInfo(m.x, m.z);
  rawHeightMuskildaTop = F + 62 * Math.pow(smoothstep(22, 340, r.d), 1.35) + 30 + 1.5;
  const p = PLACES.pond;
  const Fp = valleyFloor(p.x, p.z), rp = riverInfo(p.x, p.z);
  pondLevel = Fp + 62 * Math.pow(smoothstep(22, 340, rp.d), 1.35) - 0.5;
  PLACES.pond.level = pondLevel;
}
export const POND_LEVEL = () => pondLevel;

// Calcula la altura final (con caminos y cauce). pathD: distancia a camino, pathTarget: altura suavizada
export function finalHeight(x, z, pathInfo) {
  const a = rawHeight(x, z, true);
  let h = a.h;
  if (pathInfo && pathInfo.d < pathInfo.w + 4) {
    const s = rawHeight(x, z, false).h;
    const k = 1 - smoothstep(pathInfo.w * 0.6, pathInfo.w + 4, pathInfo.d);
    h = lerp(h, s, k * 0.85);
  }
  // cauce del río (se desvanece al llegar a las montañas del borde)
  const r = a.r;
  const r4c = Math.pow(x ** 4 + z ** 4, 0.25);
  if (r4c > 470) return { h, river: r, vm: a.vm, mm: a.mm };
  const inVillage = a.vm > 0.5;
  const bankW = inVillage ? 1.2 : 4.5;
  const hNo = h;
  if (r.edge < bankW) {
    const bed = r.level - 1.25 - 0.35 * clamp(1 - r.d / r.half, 0, 1);
    const k = smoothstep(inVillage ? -0.4 : -2.2, bankW, r.edge);
    h = Math.min(h, lerp(bed, Math.max(h, r.level + 1.2), k));
    if (r.edge < -0.5) h = Math.min(h, bed + (inVillage ? 0 : 0.6 * smoothstep(-r.half, 0, r.edge)));
    h = lerp(h, hNo, smoothstep(430, 470, r4c));
  }
  return { h, river: r, vm: a.vm, mm: a.mm };
}

// ---------- Distancia a caminos (con cubos espaciales) ----------
const SEGS = [];
for (const p of PATHS) for (let i = 0; i < p.pts.length - 1; i++) SEGS.push({ a: p.pts[i], b: p.pts[i + 1], path: p });
const BUCKET = 25, bucketMap = new Map();
for (const s of SEGS) {
  const x0 = Math.floor((Math.min(s.a[0], s.b[0]) - 10) / BUCKET), x1 = Math.floor((Math.max(s.a[0], s.b[0]) + 10) / BUCKET);
  const z0 = Math.floor((Math.min(s.a[1], s.b[1]) - 10) / BUCKET), z1 = Math.floor((Math.max(s.a[1], s.b[1]) + 10) / BUCKET);
  for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) { const k = i + ',' + j; if (!bucketMap.has(k)) bucketMap.set(k, []); bucketMap.get(k).push(s); }
}
export function pathQuery(x, z) {
  const list = bucketMap.get(Math.floor(x / BUCKET) + ',' + Math.floor(z / BUCKET));
  let best = { d: 1e9, w: 0, type: null, id: null };
  if (!list) return best;
  for (const s of list) {
    const r = segDist(x, z, s.a[0], s.a[1], s.b[0], s.b[1]);
    const e = r.d - s.path.w;
    if (e < best.d - best.w) best = { d: r.d, w: s.path.w, type: s.path.type, id: s.path.id };
  }
  return best;
}

export function plazaMask(x, z) {
  return 1 - smoothstep(PLACES.plaza.r - 2, PLACES.plaza.r + 1, Math.hypot(x - PLACES.plaza.x, z - PLACES.plaza.z));
}

// ---------- Campos de cultivo en el fondo del valle ----------
// Devuelve { mask, type, edge }: mask 0..1 (dónde hay parcelas), tipo de parcela y distancia al lindero
function hash2(i, j) { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); }
export function fieldInfo(x, z) {
  const r = riverInfo(x, z);
  let mask = (1 - smoothstep(120, 190, r.d)) * smoothstep(8, 16, r.edge);
  mask *= 1 - villageMask(x, z);
  mask *= smoothstep(-150, -110, z);
  mask *= 1 - meadowMask(x, z) * 0.6;
  if (mask <= 0.01) return { mask: 0, type: 0, edge: 99 };
  const a = 0.35, c = Math.cos(a), s = Math.sin(a);
  const wx = x + fbm(x / 90, z / 90, 2) * 14, wz = z + fbm(x / 90 + 7, z / 90 - 3, 2) * 14;
  const u = wx * c + wz * s, v = -wx * s + wz * c;
  const cu = 42, cv = 28;
  const i = Math.floor(u / cu), j = Math.floor(v / cv);
  const fu = u / cu - i, fv = v / cv - j;
  const edge = Math.min(fu, 1 - fu) * cu < Math.min(fv, 1 - fv) * cv ? Math.min(fu, 1 - fu) * cu : Math.min(fv, 1 - fv) * cv;
  const h = hash2(i, j);
  const type = h < 0.42 ? 0 : h < 0.62 ? 1 : h < 0.78 ? 2 : h < 0.9 ? 3 : 4;
  return { mask, type, edge, stripe: Math.sin(v * 1.6) };
}

// Datos para los módulos genéricos del motor
export const PONDS = [PLACES.pond];
PLACES.courts = [{ x: PLACES.fronton.x, z: PLACES.fronton.z, hw: 16, hd: 6.5 }];
PLACES.clearings = [{ x: PLACES.muskilda.x, z: PLACES.muskilda.z, r0: 35, r1: 16 }, { x: PLACES.waterfall.x, z: PLACES.waterfall.z, r0: 16, r1: 8 }];
// (true: si alguno no cabe donde se puso, busca un hueco cerca en vez de quitarse)
export const SPECIAL_TREES = [
  [PLACES.plaza.x + 11, PLACES.plaza.z - 7, 'oak', 1.25, true], [PLACES.plaza.x - 11, PLACES.plaza.z + 8, 'oak', 1.15, true],
  [PLACES.church.x + 14, PLACES.church.z + 14, 'oak', 1.1, true], [PLACES.crucero.x - 13, PLACES.crucero.z - 7, 'oak', 1.3, true],
  [PLACES.muskilda.x - 16, PLACES.muskilda.z + 12, 'oak', 1.5, true], [PLACES.muskilda.x + 14, PLACES.muskilda.z + 16, 'beech', 1.2, true],
  [PLACES.borda.x + 14, PLACES.borda.z - 10, 'oak', 1.35, true], [PLACES.mirador.x - 5, PLACES.mirador.z - 6, 'fir', 1.1, true],
];
