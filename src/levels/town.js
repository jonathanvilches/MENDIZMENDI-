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
  // Pamplona: trazado propio con la disposición real del Casco Viejo (norte = −z)
  const PAMP = def.layout === 'pamplona';
  if (PAMP) {
    Object.assign(PLACES.plaza, { x: 40, z: 20, r: 34, rect: { hw: 36, hd: 48 } });
    PLACES.church = { x: 114, z: -190 };                 // catedral, junto a la muralla y el Redín
    PLACES.market = { x: -40, z: -92 };                  // mercado de Santo Domingo, junto al ayuntamiento
    PLACES.farm = { x: 330, z: 70 }; PLACES.fields = { x: 150, z: -330 }; PLACES.forest = { x: -40, z: -345 };
    PLACES.riverSpot = { x: rx(-60) + 14, z: -60 };
    PLACES.edgeN = { x: 60, z: -300 }; PLACES.edgeS = { x: 40, z: 330 }; PLACES.edgeE = { x: 330, z: -40 }; PLACES.edgeW = { x: -120, z: 40 };
    PLACES.spawn = { x: 44, z: 150 };
    PLACES.frontonNear = { x: 212, z: 34 };              // el frontón Labrit, junto a la plaza de toros
    // recorrido del encierro: corrales de Santo Domingo → Ayuntamiento → Mercaderes → Estafeta → plaza de toros
    PLACES.encierro = [{ x: -88, z: -110 }, { x: -50, z: -104 }, { x: -14, z: -99 }, { x: 20, z: -99 }, { x: 60, z: -103 }, { x: 120, z: -103 }, { x: 178, z: -88 }, { x: 204, z: -71 }, { x: 232, z: -56 }];
    PLACES.citadel = { x: -60, z: 250, R: 50 };
    const d = Math.hypot(4 + 60, 60 - 250); PLACES.citadel.dir = { x: (4 + 60) / d, z: (60 - 250) / d };
  }

  // ---------- Calles ----------
  const PATHS = [];
  const addPath = (id, type, w, pts) => { const p = { id, type, w, pts }; PATHS.push(p); return p; };
  const line = (x0, z0, x1, z1, step = 6) => { const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / step)); const p = []; for (let i = 0; i <= n; i++) p.push([x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n]); return p; };
  const BRIDGES = [];
  if (PAMP) {
    // plaza del Castillo → Chapitela → Mercaderes → Estafeta → plaza de Toros (el recorrido del encierro, al revés)
    addPath('chapitela', 'street', 2.8, line(18, -28, 20, -96, 5));
    addPath('mercaderes', 'street', 3, line(-14, -98, 34, -100, 5));
    addPath('estafeta', 'street', 3.8, [[34, -100], [60, -103], [90, -105], [120, -103], [150, -98], [178, -88], [200, -74]]).noHouses = true;
    addPath('santoDomingo', 'street', 3, line(-14, -98, -96, -112, 6));
    addPath('curia', 'street', 2.8, line(34, -100, 64, -190, 6));
    addPath('navarreria', 'street', 2.6, line(58, -174, -10, -160, 6));
    addPath('zapateria', 'street', 2.6, line(4, 10, -92, 12, 6));
    addPath('sanNicolas', 'street', 2.6, line(4, 50, -70, 70, 6));
    addPath('carlos3', 'street', 5, line(40, 68, 40, 170, 6)).noHouses = true;
    addPath('bajadaJavier', 'street', 2.6, line(76, 10, 180, 0, 6));
    addPath('amaya', 'street', 2.6, line(76, 50, 150, 110, 6));
    { const C = PLACES.citadel, g = C.R * 0.81 + 10; addPath('toCitadel', 'road', 4, line(4, 60, C.x + C.dir.x * g, C.z + C.dir.z * g, 8)); addPath('inCitadel', 'trail', 2, line(C.x + C.dir.x * g, C.z + C.dir.z * g, C.x, C.z, 6)); }
    addPath('toSadar', 'road', 4.5, line(40, 170, 196, 286, 8));
    addPath('rondaRedin', 'trail', 2.2, line(-100, -244, 196, -244, 8));
    addPath('carmen', 'street', 2.6, line(26, -166, 40, -236, 6));
    addPath('portalFrancia', 'road', 2.6, line(40, -236, 40, -300, 6));
    // bajada al Arga por Santo Domingo y puente de la Magdalena
    const bz = -112, o = half + 10;
    addPath('toBridge', 'road', 3, line(-96, bz, rx(bz) + o, bz, 8));
    addPath('overRiver', 'road', 3, [[rx(bz) + o, bz], [rx(bz) - o, bz]]);
    BRIDGES.push({ id: 'b0', z: bz, w: 4, arch: 1.8, span: 2 * o, main: true, big: true });
  } else if (riverThrough) {
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
  if (PAMP) {
    addPath('toFarm', 'road', 2.6, line(180, 0, 318, 70, 8));
    addPath('toFields', 'trail', 1.8, line(40, -300, PLACES.fields.x, PLACES.fields.z, 8));
    addPath('toForest', 'trail', 1.8, line(40, -300, PLACES.forest.x, PLACES.forest.z, 8));
    addPath('south', 'road', 3, line(40, 170, 40, 330, 10));
  } else {
  addPath('toFarm', 'road', 2.6, line(PLACES.plaza.x + sideOut * 10, 0, PLACES.farm.x - sideOut * 12, PLACES.farm.z, 8));
  addPath('toFields', 'trail', 1.8, line(PLACES.plaza.x + sideOut * 20, -20, PLACES.fields.x, PLACES.fields.z, 8));
  addPath('toForest', 'trail', 1.8, line(PLACES.plaza.x, -R * 0.9, PLACES.forest.x, PLACES.forest.z, 8));
  addPath('south', 'road', 3, line(PLACES.plaza.x, R * 0.9, PLACES.spawn.x, R + 120, 10));
  }

  // ---------- Relieve ----------
  const vR = R + 30;
  function villageMask(x, z) {
    const e = Math.hypot((x - PLACES.plaza.x) / vR, (z - 0) / vR);
    return 1 - smoothstep(0.7, 1.15, e);
  }
  const meadowMask = (x, z) => 1 - smoothstep(20, 45, Math.hypot(x - PLACES.farm.x, z - PLACES.farm.z));
  const iratiMask = (x, z) => 1 - smoothstep(80, 120, Math.hypot(x - PLACES.forest.x, z - PLACES.forest.z));
  // Montañas con nombre (Dos Hermanas de Irurtzun): dos cumbres de caliza a cada lado del río, con el desfiladero
  // entre ellas. Se suman al relieve; junto al cauce se corta la falda para que pase el río.
  const PEAKS = [];
  if (def.peaks) { const P = def.peaks, cx = rv ? rx(P.z) : PLACES.plaza.x; [-1, 1].forEach((s, i) => PEAKS.push({ x: cx + s * P.dx, z: P.z + (i ? 14 : -10), h: P.h[i], r: P.r, s })); PLACES.peaks = PEAKS; PLACES.pass = { x: cx, z: P.z }; }
  function peakH(x, z) {
    let add = 0;
    for (const P of PEAKS) {
      const dx = x - P.x, dz = (z - P.z) * 1.35, d = Math.hypot(dx, dz);
      if (d >= P.r) continue;
      const k = 1 - d / P.r, crag = 0.82 + 0.3 * ridged(x / 38 + P.s * 3, z / 38, 3);
      add += P.h * Math.pow(k, 1.15) * (3 - 2 * k) * 0.5 * crag;
    }
    if (!add) return 0;
    const dR = rv ? Math.abs(x - rx(z)) : 99;
    return add * smoothstep(9, 34, dR);
  }
  // Horizonte: alrededor no hay una muralla continua de montes. Según la dirección, unos sectores levantan sierra y
  // otros se abren a lomas bajas y a la lejanía; y cuánto monte hay depende de la comarca (Pirineo más, zona media y
  // Ribera menos). Lo usan los bordes del pueblo y el anillo de montes lejanos (terrain.js).
  const MTK = { pyrenean: 0.8, atlantic: 0.6, central: 0.5, city: 0.45, ribera: 0.35 }[def.family] ?? 0.55;
  const hph = (def.id.length * 7.3 + def.id.charCodeAt(0) * 0.37 + def.id.charCodeAt(def.id.length - 1) * 0.11) % 10;
  function horizonK(x, z) {
    const a = Math.atan2(z, x), n = fbm(Math.cos(a) * 1.4 + hph, Math.sin(a) * 1.4 - hph, 2) * 0.5 + 0.5;
    return MTK * (0.3 + 0.7 * smoothstep(0.38, 0.68, n));
  }
  function rawHeight(x, z, detail) {
    const F0 = FA(z);
    const dRiv = rv ? Math.abs(x - rx(z)) : Math.abs(x - PLACES.plaza.x);
    let h = F0;
    const r = Math.hypot(x - PLACES.plaza.x, z);
    if (relief === 'valley') h += F.relief * Math.pow(smoothstep(35, 380, dRiv), 1.35);
    else if (relief === 'hills' || relief === 'hilltop') h += F.relief * 0.6 * (fbm(x / 230 + 3, z / 230, 3) * 0.5 + 0.5) * smoothstep(40, 220, r) + 12 * smoothstep(150, 420, r);
    else h += F.relief * 0.3 * smoothstep(250, 450, r);
    if (hill) h += hillH * Math.exp(-(r * r) / (2 * 120 * 120));
    if (PEAKS.length) h += peakH(x, z);
    // bordes montañosos
    const r4 = Math.pow(x ** 4 + z ** 4, 0.25);
    const mt = smoothstep(360, 540, r4);
    if (def.family === 'ribera') {
      // mesas y cabezos al estilo de las Bardenas
      const m = fbm(x / 140 + 9, z / 140 - 2, 3);
      h += mt * (18 + 30 * smoothstep(0.05, 0.12, m));
    } else h += mt * (F.relief * 1.1 + 60 * ridged(x / 160, z / 160, 4)) * horizonK(x, z);
    const rough = 0.25 + smoothstep(30, 220, dRiv) * 0.8 + mt;
    h += fbm(x / 140 + 3.1, z / 140 - 1.7, 4) * F.noise * rough;
    if (detail) h += fbm(x / 26, z / 26, 3) * 0.7 * (0.3 + rough);
    const vm = villageMask(x, z);
    if (vm > 0) {
      const top = hill ? F0 + hillH * Math.exp(-(r * r) / (2 * 120 * 120)) * 0.92 + 1 : F0 + 1.1 + Math.max(0, dRiv - 24) * (relief === 'valley' ? 0.07 : 0.02);
      h = lerp(h, top + (detail ? fbm(x / 40, z / 40, 2) * 0.25 : 0), vm);
    }
    if (PAMP) h -= bluff(x, z);
    // explanadas
    for (const pad of PADS) {
      const dd = Math.hypot(x - pad.x, z - pad.z) - pad.r;
      const k = 1 - smoothstep(0, pad.blend, dd);
      if (k > 0) h = lerp(h, pad.h, k);
    }
    if (PAMP) h -= moat(x, z);
    const mm = meadowMask(x, z);
    return { h, vm, mm, F: F0 };
  }
  // Pamplona: el Casco Viejo está en un alto; por fuera de la muralla norte y del Redín el terreno cae unos 12 m.
  // Frente al Portal de Francia la caída es una rampa larga, la bajada hacia el río.
  const REDIN = [[186, -254], [230, -282], [212, -232]];          // baluarte en punta (sin caída dentro)
  function triOut(x, z, T) {
    let inside = true, d = 1e9;
    for (let i = 0; i < 3; i++) {
      const [ax, az] = T[i], [bx, bz] = T[(i + 1) % 3];
      if ((bx - ax) * (z - az) - (bz - az) * (x - ax) < 0) inside = false;
      d = Math.min(d, segDist(x, z, ax, az, bx, bz).d);
    }
    return inside ? 0 : d;
  }
  function bluff(x, z) {
    if (!PAMP) return 0;
    const wN = (1 - smoothstep(-110, -140, x)) * (1 - smoothstep(212, 236, x)), wE = smoothstep(-132, -160, z);
    const o = Math.min(Math.max((-254 - z) * wN - (1 - wN) * 9, (x - 212) * wE - (1 - wE) * 9), triOut(x, z, REDIN));
    const ramp = lerp(46, 4.5, smoothstep(5, 13, Math.abs(x - 40)));
    return 12 * smoothstep(1.5, ramp, o);
  }
  // Ciudadela: pentágono con cinco baluartes en punta; alrededor, un foso de hierba con un paso frente a la puerta
  if (PAMP) {
    const C = PLACES.citadel, g = Math.atan2(C.dir.x, C.dir.z), V = [];
    for (let i = 0; i < 5; i++) { const a = g + Math.PI / 5 + i * Math.PI * 2 / 5; V.push([C.x + Math.sin(a) * C.R, C.z + Math.cos(a) * C.R, a]); }
    const poly = [];
    for (let i = 0; i < 5; i++) {
      const [vx, vz, a] = V[i], P0 = V[(i + 4) % 5], P1 = V[(i + 1) % 5];
      const u0 = [(P0[0] - vx) / C.R / 1.1756, (P0[1] - vz) / C.R / 1.1756], u1 = [(P1[0] - vx) / C.R / 1.1756, (P1[1] - vz) / C.R / 1.1756];
      const n0 = [-u0[1], u0[0]], n1 = [u1[1], -u1[0]];
      const E1 = [vx + u0[0] * 12, vz + u0[1] * 12], E2 = [vx + u1[0] * 12, vz + u1[1] * 12];
      const out = (n, p) => ((p[0] + n[0] - C.x) ** 2 + (p[1] + n[1] - C.z) ** 2 > (p[0] - C.x) ** 2 + (p[1] - C.z) ** 2 ? n : [-n[0], -n[1]]);
      const m0 = out(n0, E1), m1 = out(n1, E2);
      poly.push(E1, [E1[0] + m0[0] * 7, E1[1] + m0[1] * 7], [vx + Math.sin(a) * 19, vz + Math.cos(a) * 19], [E2[0] + m1[0] * 7, E2[1] + m1[1] * 7], E2);
    }
    C.poly = poly; C.gateAng = g;
  }
  function polyOut(x, z, poly) {
    let inside = false, d = 1e9;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, zi] = poly[i], [xj, zj] = poly[j];
      if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
      d = Math.min(d, segDist(x, z, xi, zi, xj, zj).d);
    }
    return inside ? -d : d;
  }
  function moat(x, z) {
    const C = PLACES.citadel;
    if (!PAMP || Math.hypot(x - C.x, z - C.z) > C.R + 62) return 0;
    const o = polyOut(x, z, C.poly);
    if (o < 2) return 0;
    const px = x - C.x, pz = z - C.z, along = px * C.dir.x + pz * C.dir.z, lat = Math.abs(px * C.dir.z - pz * C.dir.x);
    const bridge = along > 0 ? smoothstep(4.5, 7.5, lat) : 1;
    return 4.5 * smoothstep(2, 5, o) * (1 - smoothstep(20, 30, o)) * bridge;
  }
  const PADS = [];
  function addPad(x, z, r, blend = 14) { const h = rawHeight(x, z, false).h; PADS.push({ x, z, r, blend, h }); }
  addPad(PLACES.church.x, PLACES.church.z, PAMP ? 40 : 20, PAMP ? 12 : 14);
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
    if (lm.kind === 'pass' && PLACES.pass) pos = { x: PLACES.pass.x + (rv ? 16 : 0), z: PLACES.pass.z + 75 };
    if (lm.x != null) pos = { x: lm.x, z: lm.z };
    const o = { ...lm, x: pos.x, z: pos.z, center: pos.center, ring: pos.ring };
    if (lm.pad) addPad(o.x, o.z, lm.pad, lm.padBlend || 20);
    PLACES.landmarks.push(o);
    if (lm.kind === 'castle') addPad(o.x, o.z, 30, 16);
    else if (lm.kind === 'dig') addPad(o.x, o.z, 14, 14);
    else if (['ruin', 'monolith', 'lookout', 'dolmen', 'cross', 'stone', 'chapel', 'palomeras', 'horreo', 'house', 'palace', 'towerhouse', 'mill'].includes(lm.kind)) addPad(o.x, o.z, 9, 12);
  }
  // Pamplona: murallas al borde del casco
  PLACES.courts = [];
  PLACES.clearings = PLACES.landmarks.map(l => ({ x: l.x, z: l.z, r0: (l.pad || 14) + 12, r1: l.pad || 12 }));
  // la plaza pavimentada llega hasta el fondo de los soportales
  if (PLACES.plaza.rect) PLACES.courts.push({ x: PLACES.plaza.x, z: PLACES.plaza.z, hw: PLACES.plaza.rect.hw + 4, hd: PLACES.plaza.rect.hd + 4 });
  // plaza Consistorial y enlosado alrededor de la catedral (sin tocar el jardín del claustro)
  if (PAMP) PLACES.courts.push({ x: -6, z: -101, hw: 16, hd: 8 }, { x: 112, z: -193, hw: 56, hd: 19 }, { x: 143, z: -159, hw: 25, hd: 15 }, { x: 75, z: -159, hw: 19, hd: 15 },
    { x: 232, z: -56, hw: 48, hd: 48 });   // explanada adoquinada alrededor de la plaza de toros

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
  const plazaMask = PLACES.plaza.rect
    ? (x, z) => { const q = PLACES.plaza, dx = Math.abs(x - q.x) - q.rect.hw, dz = Math.abs(z - q.z) - q.rect.hd; return 1 - smoothstep(-1, 1, Math.max(dx, dz)); }
    : (x, z) => 1 - smoothstep(PLACES.plaza.r - 2, PLACES.plaza.r + 1, Math.hypot(x - PLACES.plaza.x, z - PLACES.plaza.z));

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
    for (const c of PLACES.clearings) if (c.r1 > 20) mask *= smoothstep(c.r1, c.r0 + 8, Math.hypot(x - c.x, z - c.z));
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
  const SPECIAL_TREES = PAMP ? pampTrees() : [[PLACES.plaza.x + PLACES.plaza.r + 4, PLACES.plaza.z - 6, def.family === 'ribera' ? 'poplar' : 'oak', 1.2], [PLACES.plaza.x - PLACES.plaza.r - 4, PLACES.plaza.z + 7, def.family === 'ribera' ? 'poplar' : 'oak', 1.1]];

  // Pamplona: plátanos en la plaza del Castillo y en Carlos III, y arboleda dentro de la Ciudadela
  function pampTrees() {
    const t = [];
    for (let z = 40; z <= 62; z += 7) for (const x of [12, 68]) t.push([x, z, 'oak', 0.9]);
    for (let z = 84; z <= 160; z += 12) for (const x of [31, 49]) t.push([x, z, 'oak', 0.85]);
    // arboleda alrededor de la plaza de toros (sin tapar la entrada del encierro)
    const g = Math.atan2(204 - 232, -71 + 56);
    for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < 0.45) continue; t.push([232 + Math.sin(a) * 46, -56 + Math.cos(a) * 46, 'oak', 1.0]); }
    // El Sadar (centro 232, 318; zócalo de 46 × 59 m de semilado): hileras de árboles en la explanada oeste (sin tapar
    // la entrada), dos en el paseo del este (a los lados de las farolas) y alamedas en el césped del norte y del sur
    for (let z = -60; z <= 60; z += 12) if (Math.abs(z) > 18) for (const x of [-46 - 45, -46 - 33, -46 - 21]) t.push([232 + x, 318 + z, 'oak', x < -80 ? 1.0 : 0.85]);
    for (let z = -60; z <= 60; z += 12) for (const x of [46 + 6, 46 + 22]) t.push([232 + x, 318 + z, 'oak', 0.9]);
    for (const s of [-1, 1]) for (const d of [16, 30, 44]) for (let x = -40; x <= 60; x += 12) t.push([232 + x + (d === 30 ? 6 : 0), 318 + s * (59 + d), 'oak', 0.9]);
    const C = PLACES.citadel;
    for (let i = 0; i < 22; i++) {
      const a = C.gateAng + 0.3 + i / 22 * (Math.PI * 2 - 0.6);
      t.push([C.x + Math.sin(a) * 33, C.z + Math.cos(a) * 33, i % 5 ? 'oak' : 'pine', 0.85 + (i % 3) * 0.1]);
    }
    return t;
  }

  return {
    rx, zz: () => 9999, CONF: { x: 9999, z: 9999 }, FA, FZ: FA, riverHalfA, RIVER_HALF_Z: 0,
    riverInfo, valleyFloor, finalHeight, pathQuery, plazaMask, fieldInfo, villageMask, meadowMask, iratiMask, horizonK,
    PLACES, MEADOW: null, PATHS, BRIDGES, PONDS: [], SPECIAL_TREES, TREE_MIX, R,
    RIVERS: rv ? [{ rx, level: z => FA(z) - 0.9, half }] : [],
    BOUNDARY: 440, def, family: def.family, relief, addPad, PADS, FOREST: F.forest, TONE: F.grass,
  };
}
