// Generador de localidades: terreno, río, calles, plaza y huecos para monumentos a partir de una ficha
import { clamp, lerp, smoothstep, segDist, mulberry32 } from '../util/math.js';
import { fbm, ridged } from '../util/noise.js';

const FAMILY = {
  atlantic: { relief: 62, noise: 10, grass: 'lush', forest: 0.55 },
  pyrenean: { relief: 92, noise: 12, grass: 'alpine', forest: 0.6 },
  central: { relief: 34, noise: 8, grass: 'dry', forest: 0.22 },
  city: { relief: 26, noise: 5, grass: 'dry', forest: 0.15 },
  ribera: { relief: 10, noise: 3, grass: 'arid', forest: 0.08 },
};

export function createTownLevel(def) {
  const rnd = mulberry32(def.id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0);
  const F = FAMILY[def.family] || FAMILY.central;
  const relief = def.relief || 'valley';
  const R = def.size >= 110 ? 175 : def.size >= 70 ? 140 : def.size >= 45 ? 118 : 96;   // radio del casco
  const rv = def.river;
  const ph = rnd() * 6.28;

  // ---------- Río (fluye de norte a sur, como en Salazar) ----------
  const rx = rv ? (z => rv.x + (rv.amp || 6) * Math.sin(z * 0.011 + ph) + (rv.amp || 6) * 0.45 * Math.sin(z * 0.029 + ph * 2) - ((rv.amp || 6) * Math.sin(ph) + (rv.amp || 6) * 0.45 * Math.sin(ph * 2))) : (z => 9999);
  const rxd = rv ? (z => (rv.amp || 6) * 0.011 * Math.cos(z * 0.011 + ph) + (rv.amp || 6) * 0.45 * 0.029 * Math.cos(z * 0.029 + ph * 2)) : (() => 0);
  const slope = relief === 'plain' ? 0.004 : 0.012;
  const base = 20;
  const FA = z => base - slope * z;
  const half = rv ? rv.w : 0;
  const riverHalfA = () => half;
  function riverInfo(x, z) {
    if (!rv) return { d: 1e4, edge: 1e4, half: 0, level: -Infinity, river: 'A', dA: 1e4, dZ: 1e9 };
    const dA = Math.abs(x - rx(z)) / Math.sqrt(1 + rxd(z) ** 2);
    return { d: dA, edge: dA - half, half, level: FA(z) - 0.9, river: 'A', dA, dZ: 1e9 };
  }
  const valleyFloor = (x, z) => FA(z);

  // ---------- Lugares clave ----------
  const hill = relief === 'hilltop';
  const hillH = hill ? 34 : 0;
  const riverThrough = rv && Math.abs(rv.x) < 40;
  const PLACES = { center: { x: 0, z: 0 }, plaza: { x: riverThrough ? rx(0) - 30 * Math.sign(rv.x || 1) : 0, z: 0, r: def.family === 'city' ? 24 : 16 } };
  const P = PLACES.plaza;
  const mainX = P.x;
  PLACES.church = hill ? { x: P.x + 4, z: P.z - 34 } : { x: P.x, z: P.z - 36 };
  // granja, campos y puntos fuera del casco
  const sideOut = rv && rv.x > 0 ? -1 : 1;               // lado opuesto al río
  PLACES.farm = { x: mainX + sideOut * (R + 55), z: 40 };
  PLACES.fields = { x: mainX + sideOut * (R + 40), z: -90 };
  PLACES.forest = { x: mainX + sideOut * 40, z: -R - 130 };
  PLACES.market = { x: P.x + 10, z: P.z + 10 };
  PLACES.riverSpot = rv ? { x: rx(R * 0.7) + (half + 5) * -Math.sign(rv.x || 1), z: R * 0.7 } : { x: mainX + 60, z: 60 };
  PLACES.edgeN = { x: mainX + sideOut * 30, z: -R - 40 };
  PLACES.edgeS = { x: mainX - sideOut * 20, z: R + 45 };
  PLACES.edgeE = { x: mainX + (R + 45) * -sideOut, z: -30 };
  PLACES.edgeW = { x: mainX + (R + 30) * sideOut, z: -60 };
  PLACES.spawn = { x: mainX + 4, z: R + 30 };

  // ---------- Calles ----------
  const PATHS = [];
  const addPath = (id, type, w, pts) => PATHS.push({ id, type, w, pts });
  const line = (x0, z0, x1, z1, step = 6) => { const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / step)); const p = []; for (let i = 0; i <= n; i++) p.push([x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n]); return p; };
  const BRIDGES = [];
  if (riverThrough) {
    // dos calles paralelas al río, como en los pueblos pirenaicos
    const along = (off, z0, z1) => { const p = []; for (let z = z0; z <= z1; z += 6) p.push([rx(z) + off, z]); return p; };
    const o = half + 10;
    addPath('bankW', 'street', 3.2, along(-o, -R, R));
    addPath('bankE', 'street', 3.2, along(o, -R, R));
    addPath('backW', 'street', 2.4, along(-o - 26, -R * 0.8, R * 0.8));
    addPath('backE', 'street', 2.4, along(o + 26, -R * 0.8, R * 0.8));
    for (const bz of [0, -R * 0.55, R * 0.5]) {
      addPath('br' + bz, 'street', 3, [[rx(bz) - o, bz], [rx(bz) + o, bz]]);
      BRIDGES.push({ id: 'b' + bz, z: bz, w: bz === 0 ? 4 : 3, arch: 1.6, span: 2 * o, main: bz === 0, big: rv.bigBridge && bz === 0 });
      addPath('lnW' + bz, 'street', 2.2, [[rx(bz) - o, bz + 6], [rx(bz) - o - 26, bz + 6]]);
      addPath('lnE' + bz, 'street', 2.2, [[rx(bz) + o, bz - 6], [rx(bz) + o + 26, bz - 6]]);
    }
    PLACES.plaza.x = rx(0) - o - 30; PLACES.plaza.z = 8;
    addPath('toPlaza', 'street', 3, [[rx(8) - o, 8], [PLACES.plaza.x, 8]]);
    PLACES.church = { x: PLACES.plaza.x - 8, z: PLACES.plaza.z - 36 };
    addPath('toChurch', 'street', 2.6, [[PLACES.plaza.x, PLACES.plaza.z], [PLACES.church.x + 2, PLACES.church.z + 14]]);
  } else {
    const cx = P.x, sp = 34;
    addPath('main', 'street', 3.4, line(cx, -R, cx, R));
    addPath('cross', 'street', 3.2, line(cx - R, 0, cx + R, 0));
    const par = def.size >= 55 ? [-sp, sp] : [-sp];
    if (def.size >= 100) par.push(-2 * sp, 2 * sp);
    for (const dx of par) addPath('par' + dx, 'street', 2.6, line(cx + dx, -R * 0.8, cx + dx, R * 0.8));
    for (const z of [-R * 0.55, R * 0.5]) addPath('x' + z, 'street', 2.4, line(cx - R * 0.8, z, cx + R * 0.8, z));
    if (def.size >= 100) for (const z of [-R * 0.27, R * 0.25]) addPath('xx' + z, 'street', 2.2, line(cx - R * 0.8, z, cx + R * 0.8, z));
    addPath('toChurch', 'street', 2.8, line(cx, -8, PLACES.church.x, PLACES.church.z + 14));
    // río lejano: camino y puente
    if (rv) {
      const bz = 20;
      const o = half + 10;
      const xb = rx(bz);
      const dir = Math.sign(xb - cx);
      addPath('toRiver', 'road', 2.8, line(cx + dir * R, 0, xb - dir * o, bz, 8));
      addPath('overRiver', 'road', 2.8, [[xb - o, bz], [xb + o, bz]]);
      BRIDGES.push({ id: 'b0', z: bz, w: 4, arch: 1.8, span: 2 * o, main: true, big: rv.bigBridge });
    }
  }
  // caminos a las afueras
  addPath('toFarm', 'road', 2.6, line(PLACES.plaza.x + sideOut * 10, 0, PLACES.farm.x - sideOut * 12, PLACES.farm.z, 8));
  addPath('toFields', 'trail', 1.8, line(PLACES.plaza.x + sideOut * 20, -20, PLACES.fields.x, PLACES.fields.z, 8));
  addPath('toForest', 'trail', 1.8, line(PLACES.plaza.x, -R * 0.9, PLACES.forest.x, PLACES.forest.z, 8));
  addPath('south', 'road', 3, line(PLACES.plaza.x, R * 0.9, PLACES.spawn.x, R + 120, 10));

  // ---------- Relieve ----------
  const vR = R + 30;
  function villageMask(x, z) {
    const e = Math.hypot((x - PLACES.plaza.x) / vR, (z - 0) / vR);
    return 1 - smoothstep(0.7, 1.15, e);
  }
  const meadowMask = (x, z) => 1 - smoothstep(20, 45, Math.hypot(x - PLACES.farm.x, z - PLACES.farm.z));
  const iratiMask = (x, z) => 1 - smoothstep(80, 120, Math.hypot(x - PLACES.forest.x, z - PLACES.forest.z));
  function rawHeight(x, z, detail) {
    const F0 = FA(z);
    const dRiv = rv ? Math.abs(x - rx(z)) : Math.abs(x - PLACES.plaza.x);
    let h = F0;
    const r = Math.hypot(x - PLACES.plaza.x, z);
    if (relief === 'valley') h += F.relief * Math.pow(smoothstep(35, 380, dRiv), 1.35);
    else if (relief === 'hills' || relief === 'hilltop') h += F.relief * 0.6 * (fbm(x / 230 + 3, z / 230, 3) * 0.5 + 0.5) * smoothstep(40, 220, r) + 12 * smoothstep(150, 420, r);
    else h += F.relief * 0.3 * smoothstep(250, 450, r);
    if (hill) h += hillH * Math.exp(-(r * r) / (2 * 120 * 120));
    // bordes montañosos
    const r4 = Math.pow(x ** 4 + z ** 4, 0.25);
    const mt = smoothstep(360, 540, r4);
    if (def.family === 'ribera') {
      // mesas y cabezos al estilo de las Bardenas
      const m = fbm(x / 140 + 9, z / 140 - 2, 3);
      h += mt * (18 + 30 * smoothstep(0.05, 0.12, m));
    } else h += mt * (F.relief * 1.1 + 60 * ridged(x / 160, z / 160, 4));
    const rough = 0.25 + smoothstep(30, 220, dRiv) * 0.8 + mt;
    h += fbm(x / 140 + 3.1, z / 140 - 1.7, 4) * F.noise * rough;
    if (detail) h += fbm(x / 26, z / 26, 3) * 0.7 * (0.3 + rough);
    const vm = villageMask(x, z);
    if (vm > 0) {
      const top = hill ? F0 + hillH * Math.exp(-(r * r) / (2 * 120 * 120)) * 0.92 + 1 : F0 + 1.1 + Math.max(0, dRiv - 24) * (relief === 'valley' ? 0.07 : 0.02);
      h = lerp(h, top + (detail ? fbm(x / 40, z / 40, 2) * 0.25 : 0), vm);
    }
    // explanadas
    for (const pad of PADS) {
      const dd = Math.hypot(x - pad.x, z - pad.z) - pad.r;
      const k = 1 - smoothstep(0, pad.blend, dd);
      if (k > 0) h = lerp(h, pad.h, k);
    }
    const mm = meadowMask(x, z);
    return { h, vm, mm, F: F0 };
  }
  const PADS = [];
  function addPad(x, z, r, blend = 14) { const h = rawHeight(x, z, false).h; PADS.push({ x, z, r, blend, h }); }
  addPad(PLACES.church.x, PLACES.church.z, 20);
  addPad(PLACES.farm.x, PLACES.farm.z, 16, 18);
  // ---------- Monumentos: cada tipo busca su sitio ----------
  const pl = PLACES.plaza;
  const out = sideOut;
  const slots = {
    big: [{ x: pl.x - out * 58, z: pl.z - 8 }, { x: pl.x + out * 58, z: pl.z + 30 }],
    street: [{ x: pl.x + out * 22, z: pl.z + 26 }, { x: pl.x - out * 22, z: pl.z - 22 }, { x: pl.x + out * 24, z: pl.z - 50 }],
    edge: [{ x: pl.x + out * (R + 25), z: -R * 0.6 }, { x: pl.x - out * 30, z: -R - 60 }, { x: pl.x + out * 70, z: R + 55 }, { x: pl.x - out * (R + 40), z: R * 0.4 }],
    river: rv ? [{ x: rx(-R * 0.6) + (half + 7) * (rv.x > 0 ? -1 : 1), z: -R * 0.6 }, { x: rx(R * 0.9) - (half + 7) * (rv.x > 0 ? -1 : 1), z: R * 0.9 }] : [],
  };
  const cat = { castle: 'big', walls: 'big', palace: 'street', house: 'street', towerhouse: rv ? 'river' : 'street', arch: 'street', townhall: 'plaza', kiosk: 'plaza', fountain: 'plaza', plaza: 'plaza',
    mill: rv ? 'river' : 'edge', raft: rv ? 'river' : 'edge', gorge: 'gorge', bridge: 'bridge', stelae: 'church', chapel: 'church' };
  PLACES.landmarks = [];
  for (const lm of def.landmarks || []) {
    const c = cat[lm.kind] || 'edge';
    let pos;
    if (c === 'bridge') { const b = BRIDGES.find(b => b.main) || BRIDGES[0]; pos = b ? { x: rx(b.z), z: b.z + 4 } : { x: pl.x + 10, z: pl.z + 30 }; }
    else if (c === 'plaza') pos = { x: pl.x + (lm.kind === 'townhall' ? 0 : 0), z: pl.z + (lm.kind === 'townhall' ? -pl.r - 7 : 0), center: lm.kind !== 'townhall' };
    else if (c === 'church') pos = { x: PLACES.church.x + 18, z: PLACES.church.z + 6 };
    else if (c === 'gorge') pos = rv ? { x: rx(R + 150), z: R + 150 } : slots.edge.shift();
    else pos = (slots[c] && slots[c].shift()) || slots.edge.shift() || { x: pl.x + 90, z: -120 };
    if (lm.kind === 'walls' && (def.family !== 'city')) pos = { x: PLACES.church.x, z: PLACES.church.z, ring: true };
    const o = { ...lm, x: pos.x, z: pos.z, center: pos.center, ring: pos.ring };
    PLACES.landmarks.push(o);
    if (lm.kind === 'castle') addPad(o.x, o.z, 30, 16);
    else if (['ruin', 'monolith', 'lookout', 'dolmen', 'cross', 'stone', 'chapel', 'palomeras', 'horreo', 'house', 'palace', 'towerhouse', 'mill'].includes(lm.kind)) addPad(o.x, o.z, 9, 12);
  }
  // Pamplona: murallas al borde del casco
  PLACES.courts = [];
  PLACES.clearings = PLACES.landmarks.map(l => ({ x: l.x, z: l.z, r0: 26, r1: 12 }));

  // caminos (cubos espaciales)
  const SEGS = [];
  for (const p of PATHS) for (let i = 0; i < p.pts.length - 1; i++) SEGS.push({ a: p.pts[i], b: p.pts[i + 1], path: p });
  const BUCKET = 25, bucketMap = new Map();
  for (const s of SEGS) {
    const x0 = Math.floor((Math.min(s.a[0], s.b[0]) - 10) / BUCKET), x1 = Math.floor((Math.max(s.a[0], s.b[0]) + 10) / BUCKET);
    const z0 = Math.floor((Math.min(s.a[1], s.b[1]) - 10) / BUCKET), z1 = Math.floor((Math.max(s.a[1], s.b[1]) + 10) / BUCKET);
    for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) { const k = i + ',' + j; if (!bucketMap.has(k)) bucketMap.set(k, []); bucketMap.get(k).push(s); }
  }
  function pathQuery(x, z) {
    const list = bucketMap.get(Math.floor(x / BUCKET) + ',' + Math.floor(z / BUCKET));
    let best = { d: 1e9, w: 0, type: null, id: null };
    if (!list) return best;
    for (const s of list) {
      const r = segDist(x, z, s.a[0], s.a[1], s.b[0], s.b[1]);
      if (r.d - s.path.w < best.d - best.w) best = { d: r.d, w: s.path.w, type: s.path.type, id: s.path.id };
    }
    return best;
  }
  function finalHeight(x, z, pathInfo) {
    const a = rawHeight(x, z, true);
    let h = a.h;
    if (pathInfo && pathInfo.d < pathInfo.w + 4) {
      const s = rawHeight(x, z, false).h;
      const k = 1 - smoothstep(pathInfo.w * 0.6, pathInfo.w + 4, pathInfo.d);
      h = lerp(h, s, k * 0.85);
    }
    if (rv) {
      const r = riverInfo(x, z);
      const r4c = Math.pow(x ** 4 + z ** 4, 0.25);
      const inVillage = a.vm > 0.5;
      const bankW = inVillage ? 1.2 : 5;
      const hNo = h;
      if (r.edge < bankW && r4c < 480) {
        const bed = r.level - 1.25 - 0.35 * clamp(1 - r.d / r.half, 0, 1);
        const k = smoothstep(inVillage ? -0.4 : -2.5, bankW, r.edge);
        h = Math.min(h, lerp(bed, Math.max(h, r.level + 1.2), k));
        if (r.edge < -0.5) h = Math.min(h, bed + (inVillage ? 0 : 0.6 * smoothstep(-r.half, 0, r.edge)));
        h = lerp(h, hNo, smoothstep(440, 475, r4c));
      }
    }
    return { h, river: riverInfo(x, z), vm: a.vm, mm: a.mm };
  }
  const plazaMask = (x, z) => 1 - smoothstep(PLACES.plaza.r - 2, PLACES.plaza.r + 1, Math.hypot(x - PLACES.plaza.x, z - PLACES.plaza.z));

  // ---------- Campos de cultivo según la comarca ----------
  const cropKinds = {
    atlantic: [0, 0, 4, 4, 1, 8],      // prados, pasto verde, manzanos
    pyrenean: [0, 4, 4, 1, 2],
    central: [2, 2, 1, 5, 5, 6, 3],     // cereal, viñedo, olivar, tierra
    city: [2, 1, 5, 3],
    ribera: [7, 7, 7, 5, 6, 3, 2],      // huerta, viñedo, olivar
  }[def.family] || [0];
  function hash2(i, j) { const s = Math.sin(i * 127.1 + j * 311.7 + ph) * 43758.5453; return s - Math.floor(s); }
  function fieldInfo(x, z) {
    let mask = 1 - villageMask(x, z) * 1.2;
    const rr = riverInfo(x, z);
    mask *= smoothstep(6, 14, rr.edge);
    const r4 = Math.pow(x ** 4 + z ** 4, 0.25);
    mask *= 1 - smoothstep(300, 380, r4);
    mask *= 1 - meadowMask(x, z);
    const dfor = Math.hypot(x - PLACES.forest.x, z - PLACES.forest.z);
    mask *= smoothstep(80, 120, dfor);
    if (relief === 'valley') mask *= 1 - smoothstep(60, 170, rv ? Math.abs(x - rx(z)) : Math.abs(x));
    mask = clamp(mask, 0, 1);
    if (mask <= 0.01) return { mask: 0, type: 0, edge: 99 };
    const a = 0.2 + ph * 0.05, c = Math.cos(a), s = Math.sin(a);
    const wx = x + fbm(x / 90, z / 90, 2) * 12, wz = z + fbm(x / 90 + 7, z / 90 - 3, 2) * 12;
    const u = wx * c + wz * s, v = -wx * s + wz * c;
    const cu = 46, cv = 30;
    const i = Math.floor(u / cu), j = Math.floor(v / cv);
    const fu = u / cu - i, fv = v / cv - j;
    const eu = Math.min(fu, 1 - fu) * cu, ev = Math.min(fv, 1 - fv) * cv;
    const edge = Math.min(eu, ev);
    const type = cropKinds[Math.floor(hash2(i, j) * cropKinds.length)];
    return { mask, type, edge, stripe: Math.sin(v * 1.6), row: v, cell: i * 1000 + j };
  }

  // ---------- Árboles según la familia ----------
  function TREE_MIX(x, z, h, n) {
    const f = def.family;
    if (f === 'pyrenean') return h > 60 || n > 0 ? 'fir' : 'beech';
    if (f === 'atlantic') return n > 0.25 ? 'beech' : n > -0.2 ? 'oak' : 'chestnut';
    if (f === 'ribera') return riverInfo(x, z).edge < 30 ? 'poplar' : n > 0 ? 'pine' : 'olive';
    return n > 0.2 ? 'pine' : n > -0.3 ? 'oak' : 'olive';
  }
  const SPECIAL_TREES = [[PLACES.plaza.x + PLACES.plaza.r + 4, PLACES.plaza.z - 6, def.family === 'ribera' ? 'poplar' : 'oak', 1.2], [PLACES.plaza.x - PLACES.plaza.r - 4, PLACES.plaza.z + 7, def.family === 'ribera' ? 'poplar' : 'oak', 1.1]];

  return {
    rx, zz: () => 9999, CONF: { x: 9999, z: 9999 }, FA, FZ: FA, riverHalfA, RIVER_HALF_Z: 0,
    riverInfo, valleyFloor, finalHeight, pathQuery, plazaMask, fieldInfo, villageMask, meadowMask, iratiMask,
    PLACES, MEADOW: null, PATHS, BRIDGES, PONDS: [], SPECIAL_TREES, TREE_MIX, R,
    RIVERS: rv ? [{ rx, level: z => FA(z) - 0.9, half }] : [],
    BOUNDARY: 440, def, family: def.family, relief, addPad, PADS, FOREST: F.forest, TONE: F.grass,
  };
}
