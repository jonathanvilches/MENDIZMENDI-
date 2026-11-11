// Árboles de verdad: un tronco que se abre en ramas, las ramas en ramillas y, en cada ramilla, sus hojas una a una (cada
// tarjeta es una ramita con sus hojas dibujadas, del atlas de hojas). Sin bolas ni bultos: entre ramilla y ramilla se ve
// el cielo, y por dentro las ramas. Cada especie con su porte: la haya en cúpula, el roble ancho y bajo, el castaño
// redondo, el abeto en cono con pisos de ramas, el pino con la copa arriba, el chopo en columna, el olivo bajo y
// retorcido, el manzano pequeño y redondo.
//   creaArbol(especie, rnd, detalle) → BufferGeometry con dos grupos: 0 la madera (corteza) y 1 las hojas
//   detalle: 2 de cerca (todas las ramas y todas las hojas), 1 a media distancia (tronco y ramas madre, hojas más
//   grandes y menos), 0 de lejos (tronco y racimos grandes). ligero: en el móvil, las de media distancia con menos
//   tarjetas, algo más grandes
// Las tres salen del mismo esqueleto (esqueleto(especie, rnd), que se pasa a las tres): al cambiar de una a otra el árbol
// no cambia de forma. Las texturas: el atlas de hojas (world/hojasCeldas.js, tools/hojas-atlas.mjs) y las cortezas
// (world/texturasArboles.js). La idea de crecer ramas por tramos que se tuercen y se doblan hacia la luz es la de los
// generadores de árboles de siempre (como ez-tree, de Daniel Greenheck, MIT); el código es nuestro.
import * as THREE from 'three';
import { CELDAS } from './hojasCeldas.js';

// (zona del atlas de una celda en UV, con un margen para que no se cuele la de al lado; el atlas va con flipY)
const uvCelda = (k) => { const [i, j] = CELDAS[k], m = 0.004; return [i / 4 + m, 1 - (j + 1) / 4 + m, (i + 1) / 4 - m, 1 - j / 4 - m]; };
const ARRIBA = new THREE.Vector3(0, 1, 0);

// El porte de cada especie (medidas en metros, ángulos en grados). ramas: un nivel por fila, del tronco a las ramillas.
//   n: cuántas salen de cada rama madre · desde/hasta: entre qué tramo de la madre · ang: lo que se abren de ella ·
//   largo: su largo · r: su grosor, con respecto al de la madre allí · secc/lados: tramos y caras del cilindro ·
//   nudo: lo que se tuerce cada tramo · fuerza: hacia arriba (+) o colgando (−) · copa(t): el largo según de dónde sale
//   hojas: celdas del atlas, tarjetas por ramilla, tamaño y apertura · lejos: el racimo de los de lejos
export const ESPECIES = {
  beech: {
    corteza: 'haya', barkRep: [2, 0.55],
    tronco: { largo: 8.6, r: 0.36, secc: 12, lados: 10, nudo: 0.025, taper: 0.72 },
    ramas: [
      { n: 8, desde: 0.36, hasta: 0.97, ang: 40, angVar: 12, largo: 5.4, r: 0.55, secc: 7, lados: 6, nudo: 0.09, fuerza: 0.06, copa: t => 0.45 + 0.75 * Math.sin(Math.PI * Math.min(1, (1 - t) * 1.25)) },
      { n: 7, desde: 0.22, hasta: 0.98, ang: 44, angVar: 14, largo: 2.6, r: 0.55, secc: 4, lados: 4, nudo: 0.16, fuerza: 0.01, copa: t => 1.1 - t * 0.45 },
      { n: 4, desde: 0.2, hasta: 1, ang: 42, angVar: 15, largo: 1.1, r: 0.6, secc: 2, lados: 3, nudo: 0.2, fuerza: -0.04, copa: t => 1.05 - t * 0.35 },
    ],
    hojas: { celdas: ['hayaA', 'hayaB'], paso: 0.36, tam: 0.85, ang: 48, desde: 0.15, tambien: 0.5 },
    lejos: { celda: 'racimoHaya', tam: 4.2, n: 16 },
  },
  oak: {
    corteza: 'roble', barkRep: [2, 0.6],
    tronco: { largo: 7.2, r: 0.46, secc: 11, lados: 10, nudo: 0.05, taper: 0.7 },
    ramas: [
      { n: 6, desde: 0.32, hasta: 0.95, ang: 55, angVar: 14, largo: 5.8, r: 0.6, secc: 7, lados: 6, nudo: 0.16, fuerza: 0.03, copa: t => 0.6 + 0.6 * Math.sin(Math.PI * Math.min(1, (1 - t) * 1.1)) },
      { n: 7, desde: 0.18, hasta: 0.98, ang: 50, angVar: 16, largo: 2.6, r: 0.55, secc: 4, lados: 4, nudo: 0.24, fuerza: -0.01, copa: t => 1.1 - t * 0.4 },
      { n: 4, desde: 0.25, hasta: 1, ang: 45, angVar: 18, largo: 1.0, r: 0.6, secc: 2, lados: 3, nudo: 0.26, fuerza: -0.03, copa: () => 1 },
    ],
    hojas: { celdas: ['robleA', 'robleB'], paso: 0.36, tam: 0.9, ang: 50, desde: 0.2, tambien: 0.5 },
    lejos: { celda: 'racimoRoble', tam: 4.4, n: 16 },
  },
  chestnut: {
    corteza: 'roble', barkRep: [2, 0.6],
    tronco: { largo: 7.0, r: 0.5, secc: 11, lados: 10, nudo: 0.035, taper: 0.7 },
    ramas: [
      { n: 7, desde: 0.35, hasta: 0.96, ang: 48, angVar: 12, largo: 5.0, r: 0.58, secc: 7, lados: 6, nudo: 0.12, fuerza: 0.04, copa: t => 0.55 + 0.6 * Math.sin(Math.PI * Math.min(1, (1 - t) * 1.15)) },
      { n: 7, desde: 0.2, hasta: 0.98, ang: 46, angVar: 14, largo: 2.4, r: 0.55, secc: 4, lados: 4, nudo: 0.18, fuerza: 0, copa: t => 1.1 - t * 0.4 },
      { n: 4, desde: 0.2, hasta: 1, ang: 42, angVar: 15, largo: 1.0, r: 0.6, secc: 2, lados: 3, nudo: 0.2, fuerza: -0.03, copa: () => 1 },
    ],
    hojas: { celdas: ['castano'], paso: 0.36, tam: 0.95, ang: 48, desde: 0.18, tambien: 0.5 },
    lejos: { celda: 'racimoRoble', tam: 4.3, n: 16 },
  },
  poplar: {
    corteza: 'chopo', barkRep: [2, 0.6],
    tronco: { largo: 12.5, r: 0.3, secc: 12, lados: 9, nudo: 0.015, taper: 0.85 },
    ramas: [
      { n: 16, desde: 0.18, hasta: 0.98, ang: 22, angVar: 8, largo: 3.2, r: 0.45, secc: 5, lados: 5, nudo: 0.07, fuerza: 0.08, copa: t => 0.55 + 0.6 * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.12)) },
      { n: 5, desde: 0.2, hasta: 1, ang: 30, angVar: 10, largo: 1.4, r: 0.55, secc: 3, lados: 3, nudo: 0.12, fuerza: 0.04, copa: () => 1 },
    ],
    hojas: { celdas: ['chopo'], paso: 0.24, tam: 0.8, ang: 40, desde: 0.1, tambien: 0.9 },
    lejos: { celda: 'racimoChopo', tam: 3.2, n: 14 },
  },
  apple: {
    corteza: 'roble', barkRep: [1.5, 0.8],
    tronco: { largo: 2.6, r: 0.18, secc: 7, lados: 8, nudo: 0.08, taper: 0.6 },
    ramas: [
      { n: 5, desde: 0.55, hasta: 0.98, ang: 50, angVar: 14, largo: 2.0, r: 0.6, secc: 5, lados: 5, nudo: 0.2, fuerza: 0.02, copa: () => 1 },
      { n: 8, desde: 0.15, hasta: 1, ang: 46, angVar: 15, largo: 1.1, r: 0.55, secc: 3, lados: 3, nudo: 0.25, fuerza: -0.02, copa: t => 1.1 - t * 0.4 },
    ],
    hojas: { celdas: ['manzano'], paso: 0.15, tam: 0.7, ang: 48, desde: 0.1, tambien: 0.8 },
    lejos: { celda: 'racimoChopo', tam: 2.0, n: 8 },
  },
  olive: {
    corteza: 'olivo', barkRep: [1.5, 0.8],
    tronco: { largo: 2.4, r: 0.3, secc: 8, lados: 9, nudo: 0.16, taper: 0.55, retuerce: 1 },
    ramas: [
      { n: 4, desde: 0.6, hasta: 0.98, ang: 42, angVar: 14, largo: 2.2, r: 0.62, secc: 5, lados: 6, nudo: 0.24, fuerza: 0.03, copa: () => 1 },
      { n: 8, desde: 0.15, hasta: 1, ang: 48, angVar: 15, largo: 1.2, r: 0.55, secc: 3, lados: 3, nudo: 0.25, fuerza: -0.01, copa: t => 1.1 - t * 0.3 },
    ],
    hojas: { celdas: ['olivo'], paso: 0.12, tam: 0.82, ang: 45, desde: 0.05, tambien: 0.9 },
    lejos: { celda: 'racimoOlivo', tam: 2.1, n: 8 },
  },
  // los de aguja: un fuste hasta la punta y, a su alrededor, pisos de ramas que se acortan hacia arriba
  fir: {
    conifera: true, corteza: 'abeto', barkRep: [2, 0.6],
    tronco: { largo: 14, r: 0.34, secc: 14, lados: 9, nudo: 0.012, taper: 0.97 },
    ramas: [
      { n: 52, desde: 0.08, hasta: 0.97, ang: 80, angVar: 8, largo: 3.6, r: 0.3, secc: 4, lados: 4, nudo: 0.05, fuerza: -0.03, copa: t => 0.18 + 0.88 * Math.pow(1 - t, 1.0), pisos: true },
    ],
    hojas: { celdas: ['abetoA', 'abetoB'], paso: 0.36, tam: 1.05, ang: 58, desde: 0.05, plano: true, punta: true },
    lejos: { celda: 'abetoA', tam: 2.6, n: 22, pisos: true },
  },
  pine: {
    conifera: true, corteza: 'pino', barkRep: [2, 0.6],
    tronco: { largo: 11, r: 0.32, secc: 12, lados: 9, nudo: 0.03, taper: 0.88 },
    ramas: [
      { n: 14, desde: 0.5, hasta: 0.97, ang: 62, angVar: 14, largo: 3.0, r: 0.42, secc: 5, lados: 5, nudo: 0.12, fuerza: 0.03, copa: t => 0.4 + 0.8 * Math.sin(Math.PI * Math.min(1, (1 - t) * 1.4 + 0.1)) },
      { n: 8, desde: 0.25, hasta: 1, ang: 42, angVar: 15, largo: 1.1, r: 0.55, secc: 2, lados: 3, nudo: 0.15, fuerza: 0.05, copa: () => 1 },
    ],
    hojas: { celdas: ['pino'], paso: 0.32, tam: 1.15, ang: 35, desde: 0.35, mechon: 4 },
    lejos: { celda: 'pino', tam: 3.0, n: 16 },
  },
  bush: {
    arbusto: true, corteza: 'roble', barkRep: [1, 1],
    tronco: { largo: 0.4, r: 0.05, secc: 2, lados: 4, nudo: 0.1, taper: 0.5 },
    ramas: [
      { n: 7, desde: 0.0, hasta: 1, ang: 55, angVar: 20, largo: 1.0, r: 0.8, secc: 3, lados: 3, nudo: 0.25, fuerza: 0.02, copa: () => 1 },
      { n: 4, desde: 0.3, hasta: 1, ang: 45, angVar: 15, largo: 0.45, r: 0.6, secc: 2, lados: 3, nudo: 0.25, fuerza: 0, copa: () => 1 },
    ],
    hojas: { celdas: ['arbusto'], paso: 0.14, tam: 0.5, ang: 50, desde: 0.05, tambien: 1 },
    lejos: { celda: 'arbusto', tam: 1.1, n: 5 },
  },
};

// ---- el esqueleto ----
// Una rama: sus tramos (punto, dirección y grosor de cada uno), su nivel y su largo
function rama(p0, d0, L, r0, secc, cfg, rnd, taper = 0.6, extra = {}) {
  const tr = [], p = p0.clone(), d = d0.clone().normalize(), tmp = new THREE.Vector3(), q = new THREE.Quaternion();
  for (let i = 0; i <= secc; i++) {
    const t = i / secc;
    tr.push({ p: p.clone(), d: d.clone(), r: Math.max(0.006, r0 * (1 - taper * t)), t });
    if (i === secc) break;
    // se tuerce un poco en cada tramo (más las finas) y se dobla hacia arriba o hacia abajo
    const nud = cfg.nudo * (1 + (extra.retuerce || 0) * 2);
    tmp.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
    q.setFromAxisAngle(tmp.cross(d).normalize(), (rnd() - 0.5) * 2 * nud * Math.max(1, 0.12 / Math.max(0.02, r0)) ** 0.35);
    d.applyQuaternion(q);
    if (cfg.fuerza) { d.addScaledVector(ARRIBA, cfg.fuerza * (1 + t)).normalize(); }
    p.addScaledVector(d, L / secc);
  }
  return tr;
}
// un punto de la rama a «t» de su largo (posición, dirección y grosor)
function enRama(tr, t) {
  const f = Math.min(tr.length - 1.0001, Math.max(0, t * (tr.length - 1))), i = Math.floor(f), k = f - i, a = tr[i], b = tr[i + 1];
  return { p: a.p.clone().lerp(b.p, k), d: a.d.clone().lerp(b.d, k).normalize(), r: a.r + (b.r - a.r) * k };
}
// una dirección que se abre «ang» de «d» hacia el lado «fi» (alrededor de d)
function abre(d, ang, fi) {
  const a = Math.abs(d.y) < 0.95 ? ARRIBA : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(d, a).normalize(), v = new THREE.Vector3().crossVectors(d, u).normalize();
  const lado = u.multiplyScalar(Math.cos(fi)).addScaledVector(v, Math.sin(fi));
  return d.clone().multiplyScalar(Math.cos(ang)).addScaledVector(lado, Math.sin(ang)).normalize();
}

export function esqueleto(esp, rnd) {
  const E = ESPECIES[esp], T = E.tronco;
  const tronco = { nivel: 0, L: T.largo, tr: rama(new THREE.Vector3(), new THREE.Vector3((rnd() - 0.5) * 0.06, 1, (rnd() - 0.5) * 0.06), T.largo, T.r, T.secc, { nudo: T.nudo, fuerza: E.conifera ? 0.02 : 0.01 }, rnd, T.taper, { retuerce: T.retuerce }) };
  const ramas = [tronco];
  let madres = [tronco];
  E.ramas.forEach((cfg, k) => {
    const hijas = [];
    for (const m of madres) {
      const n = Math.max(1, Math.round(cfg.n * (k === 0 ? 1 : Math.min(1.3, 0.55 + m.L / (E.ramas[k - 1].largo * 1.1))) * (0.85 + rnd() * 0.3)));
      let fi = rnd() * 6.283;
      for (let c = 0; c < n; c++) {
        // repartidas a lo largo de la madre (no al azar puro: así no se amontonan) y en espiral (137,5°)
        const t = cfg.desde + (cfg.hasta - cfg.desde) * Math.min(1, (c + 0.25 + rnd() * 0.5) / n);
        const at = enRama(m.tr, cfg.pisos ? Math.round(t * 14) / 14 + (rnd() - 0.5) * 0.012 : t);
        fi += cfg.pisos ? (c % 3 === 0 ? 2.1 : 2.1) + (rnd() - 0.5) * 0.4 : 2.39996 + (rnd() - 0.5) * 0.5;
        let ang = (cfg.ang + (rnd() - 0.5) * 2 * cfg.angVar) * Math.PI / 180;
        let d = abre(at.d, ang, fi);
        // (las ramillas de los abetos, en el plano de su rama, como un abanico; las de hoja ancha, algo hacia la luz)
        if (cfg.plano) { d.y *= 0.35; d.normalize(); }
        const L = cfg.largo * cfg.copa(t) * (0.8 + rnd() * 0.4) * (k > 0 ? Math.min(1.25, 0.6 + m.L / (E.ramas[k - 1].largo * 1.2)) : 1);
        if (L < 0.15) continue;
        const r = Math.max(0.008, cfg.r * at.r);
        const tr = rama(at.p.addScaledVector(d, -at.r * 0.4), d, L, r, cfg.secc, cfg, rnd, 0.62);
        const h = { nivel: k + 1, L, tr, madre: m };
        ramas.push(h); hijas.push(h);
      }
    }
    madres = hijas;
  });
  // el centro y el tamaño de la copa (para la luz de las hojas: más oscuras por dentro)
  const puntas = ramas.filter(b => b.nivel === E.ramas.length).map(b => b.tr[b.tr.length - 1].p);
  const c = new THREE.Vector3(); for (const p of puntas) c.add(p); c.divideScalar(Math.max(1, puntas.length));
  let R = 0.5; for (const p of puntas) R = Math.max(R, p.distanceTo(c));
  return { E, ramas, centro: c, radio: R, nivel: E.ramas.length };
}

// ---- la geometría ----
// la madera: cada rama como un tubo que sigue sus tramos, con marcos que no se retuercen; el pie del tronco se abre en raíces
function tubo(b, lados, cada, out, E, ao, rnd) {
  const tr = b.tr.filter((_, i) => i % cada === 0 || i === b.tr.length - 1);
  const base = out.pos.length / 3, n0 = new THREE.Vector3(), bb = new THREE.Vector3(), v = new THREE.Vector3();
  let n = new THREE.Vector3().crossVectors(tr[0].d, Math.abs(tr[0].d.y) < 0.9 ? ARRIBA : new THREE.Vector3(1, 0, 0)).normalize();
  const [ru, rv] = E.barkRep, perim = b.nivel === 0 ? ru : Math.max(1, Math.round(ru * 0.5)), vOff = rnd() * 3;
  let largo = 0;
  for (let i = 0; i < tr.length; i++) {
    const s = tr[i];
    if (i) { largo += s.p.distanceTo(tr[i - 1].p); n.addScaledVector(s.d, -n.dot(s.d)).normalize(); }
    bb.crossVectors(s.d, n).normalize();
    for (let j = 0; j <= lados; j++) {
      const a = (j / lados) * Math.PI * 2;
      v.copy(n).multiplyScalar(Math.cos(a)).addScaledVector(bb, Math.sin(a));
      let r = s.r;
      if (b.nivel === 0) { const y = s.p.y, k = Math.max(0, 1 - y / (s.r * 3)); r *= 1 + 0.5 * k * k * (0.6 + 0.4 * Math.cos(a * 3 + 1.3)) + 0.04 * Math.sin(a * 2 + y * 1.7); }
      out.pos.push(s.p.x + v.x * r, s.p.y + v.y * r, s.p.z + v.z * r);
      out.nor.push(v.x, v.y, v.z);
      out.uv.push((j / lados) * perim, largo * rv + vOff);
      const sh = ao(s.p, b.nivel);
      out.col.push(sh, sh, sh);
    }
  }
  for (let i = 0; i < tr.length - 1; i++) for (let j = 0; j < lados; j++) {
    const a = base + i * (lados + 1) + j, c = a + lados + 1;
    out.idx.push(a, c, a + 1, a + 1, c, c + 1);
  }
}
// una tarjeta de hojas: la ramita dibujada sale de «p» hacia «dir», tumbada hacia la luz; las normales, redondeadas hacia
// fuera de la copa (la copa se ilumina como un volumen y no tarjeta a tarjeta)
function tarjeta(p, dir, tam, celda, out, S, rnd, plano = false, giro = null) {
  const [u0, v0, u1, v1] = uvCelda(celda);
  // el lado de la tarjeta: horizontal (las hojas se abren hacia el cielo), con algo de giro
  let lado = new THREE.Vector3().crossVectors(dir, ARRIBA);
  if (lado.lengthSq() < 1e-4) lado.set(1, 0, 0);
  lado.normalize().applyAxisAngle(dir, giro ?? (rnd() - 0.5) * (plano ? 0.5 : 1.2));
  const w = tam * 0.5, base = p.clone().addScaledVector(dir, -tam * 0.04), tip = base.clone().addScaledVector(dir, tam);
  const q = [base.clone().addScaledVector(lado, -w), base.clone().addScaledVector(lado, w), tip.clone().addScaledVector(lado, w), tip.clone().addScaledVector(lado, -w)];
  const uv = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
  const i0 = out.pos.length / 3, fn = new THREE.Vector3().crossVectors(lado, dir).normalize();
  if (fn.y < 0) fn.negate();
  const brillo = 0.86 + rnd() * 0.28;
  for (let k = 0; k < 4; k++) {
    const v = q[k], rn = v.clone().sub(S.centro); const dist = rn.length() / S.radio; rn.normalize();
    const nn = fn.clone().multiplyScalar(0.35).addScaledVector(rn, 0.65).normalize();
    out.pos.push(v.x, v.y, v.z); out.nor.push(nn.x, nn.y, nn.z); out.uv.push(uv[k][0], uv[k][1]);
    // por dentro y por abajo, más oscuras; por fuera y arriba, al sol
    const ao = Math.min(1.12, (0.5 + 0.55 * Math.min(1, dist)) * (0.86 + 0.14 * Math.min(1, Math.max(0, (v.y - S.centro.y + S.radio) / (2 * S.radio))))) * brillo;
    out.col.push(ao, ao, ao * 0.97);
  }
  out.idx.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
}

export function creaArbol(esp, rnd, detalle = 2, S0 = null, { ligero = false } = {}) {
  const S = S0 || esqueleto(esp, rnd), E = S.E, H = E.hojas, nv = S.nivel, kL = ligero && detalle === 1 ? 1.45 : 1;
  const mad = { pos: [], nor: [], uv: [], col: [], idx: [] }, hoj = { pos: [], nor: [], uv: [], col: [], idx: [] };
  const ao = (p, nivel) => { const k = Math.min(1, p.y / (E.tronco.largo * 0.35)); return (0.62 + 0.38 * k) * (nivel >= 2 ? 0.92 : 1); };
  // la madera que se dibuja en cada detalle (de lejos solo el tronco y las ramas madre; las ramillas finas, solo de cerca)
  const maxNivel = detalle === 2 ? nv : detalle === 1 ? Math.min(1, nv - 1) || (E.conifera ? 1 : 0) : (E.conifera && E.lejos.pisos ? 0 : Math.min(1, nv - 1));
  for (const b of S.ramas) {
    if (b.nivel > maxNivel) continue;
    const ladosBase = b.nivel === 0 ? E.tronco.lados : E.ramas[b.nivel - 1].lados;
    const lados = detalle === 2 ? ladosBase : detalle === 1 ? Math.max(3, Math.round(ladosBase * 0.6)) : (b.nivel === 0 ? 4 : 3);
    const cada = detalle === 2 ? (b.nivel === nv && nv > 1 ? b.tr.length - 1 : 1) : detalle === 1 ? (b.tr.length > 4 ? 2 : 1) : b.tr.length - 1;
    tubo(b, lados, cada, mad, E, ao, rnd);
  }
  const elige = () => H.celdas[Math.floor(rnd() * H.celdas.length)];
  if (detalle === 2 || detalle === 1) {
    // de cerca, las tarjetas en las ramillas (el último nivel) y algunas en el tramo de fuera de las ramas de antes; a media
    // distancia, menos y más grandes (y sin las ramillas, en las ramas de antes)
    const nivelH = detalle === 2 || E.conifera ? nv : nv - 1, k = (detalle === 2 ? 1 : E.conifera ? 1.45 : 1.8) * Math.sqrt(kL), paso = H.paso * (detalle === 2 ? 1 : E.conifera ? 1.9 : 2.0) * kL;
    for (const b of S.ramas) {
      const ultimo = b.nivel === nivelH, antes = !E.conifera && b.nivel === nivelH - 1 && b.nivel > 0 && H.tambien;
      if (!ultimo && !antes) continue;
      // (a media distancia, las ramas madre con hojas desde más abajo: si no, se veían desnudas bajo la copa)
      const desde = ultimo ? H.desde : 1 - (H.tambien || 0.5) * (detalle === 1 ? 0.9 : 0.6), n = Math.max(1, Math.round(b.L * (1 - desde) / paso * (ultimo ? 1 : detalle === 1 ? 0.75 : 0.5)));
      for (let i = 0; i < n; i++) {
        const t = desde + (1 - desde) * ((i + 0.3 + rnd() * 0.4) / n), at = enRama(b.tr, t);
        if (H.mechon) { if (detalle === 2) mechon(at.p, at.d, H, k, elige, hoj, S, rnd); continue; }
        let d;
        if (H.plano) { const sd = i % 2 ? 1 : -1; d = abre(at.d, (H.ang + (rnd() - 0.5) * 20) * Math.PI / 180, 0); const lado = new THREE.Vector3().crossVectors(at.d, ARRIBA).normalize().multiplyScalar(sd); d = at.d.clone().multiplyScalar(Math.cos(H.ang * Math.PI / 180)).addScaledVector(lado, Math.sin(H.ang * Math.PI / 180)); d.y = d.y * 0.4 - 0.12; d.normalize(); }
        else { d = abre(at.d, (H.ang + (rnd() - 0.5) * 30) * Math.PI / 180, rnd() * 6.283); d.addScaledVector(ARRIBA, 0.25).normalize(); }
        const tm = H.tam * k * (0.85 + rnd() * 0.3) * (H.plano ? 1.15 - t * 0.35 : 1);
        if (H.plano) { const g0 = 0.5 + rnd() * 0.3; tarjeta(at.p, d, tm, elige(), hoj, S, rnd, true, g0); tarjeta(at.p, d, tm * 0.9, elige(), hoj, S, rnd, true, -g0); }
        else tarjeta(at.p, d, tm, elige(), hoj, S, rnd, H.plano);
      }
      // y una en la punta, siguiendo la rama
      if (ultimo) { const e = b.tr[b.tr.length - 1]; if (H.mechon) mechon(e.p, e.d, H, k * 1.1, elige, hoj, S, rnd); else tarjeta(e.p, e.d.clone().addScaledVector(ARRIBA, H.plano ? -0.05 : 0.15).normalize(), H.tam * k * 0.9, elige(), hoj, S, rnd, H.plano); }
    }
    // (la guía del abeto: la punta del tronco, con sus ramillas)
    if (E.conifera && H.plano) { const tr0 = S.ramas[0].tr, e = tr0[tr0.length - 1]; for (let i = 0; i < 4; i++) tarjeta(e.p.clone().addScaledVector(ARRIBA, -0.5 - i * 0.25), abre(ARRIBA, 0.5, i * 1.57), H.tam * 0.75, elige(), hoj, S, rnd); }
  } else {
    // de lejos: racimos grandes repartidos por la piel de la copa, mirando hacia fuera
    const L = E.lejos, puntas = S.ramas.filter(b => b.nivel === nv).map(b => b.tr[b.tr.length - 1].p);
    if (L.pisos) {
      const rs = S.ramas.filter(b => b.nivel === 1);
      for (let i = 0; i < L.n && rs.length; i++) { const b = rs[Math.floor(i * rs.length / L.n)], at = enRama(b.tr, 0.35 + rnd() * 0.3), d = at.d.clone(); d.y = d.y * 0.4 - 0.1; d.normalize(); const g0 = 0.55 + rnd() * 0.25; tarjeta(b.tr[0].p.clone().lerp(at.p, 0.15), d, b.L * 1.05, L.celda, hoj, S, rnd, true, g0); tarjeta(b.tr[0].p.clone().lerp(at.p, 0.2), d, b.L * 0.95, L.celda, hoj, S, rnd, true, -g0); }
    } else
    for (let i = 0; i < L.n && puntas.length; i++) {
      const p = puntas[Math.floor(rnd() * puntas.length)].clone().lerp(S.centro, 0.25 + rnd() * 0.15);
      const d = p.clone().sub(S.centro).normalize().lerp(new THREE.Vector3(rnd() - 0.5, rnd() - 0.2, rnd() - 0.5).normalize(), 0.5).normalize();
      tarjeta(p.clone().addScaledVector(d, -L.tam * 0.5), d, L.tam * (0.85 + rnd() * 0.3), L.celda, hoj, S, rnd);
    }
  }
  return junta(mad, hoj);
}
function mechon(p, d, H, k, elige, out, S, rnd) {
  const nm = k > 1 ? Math.max(2, H.mechon - 2) : H.mechon;
  for (let j = 0; j < nm; j++) { const dd = abre(d.clone().addScaledVector(ARRIBA, 0.5).normalize(), 0.5, j * 6.283 / nm + rnd()); tarjeta(p, dd, H.tam * k * (0.75 + rnd() * 0.3), elige(), out, S, rnd); }
}
function junta(a, b) {
  const g = new THREE.BufferGeometry(), na = a.pos.length / 3;
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a.pos, ...b.pos], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([...a.nor, ...b.nor], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([...a.uv, ...b.uv], 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute([...a.col, ...b.col], 3));
  g.setIndex([...a.idx, ...b.idx.map(i => i + na)]);
  g.addGroup(0, a.idx.length, 0); g.addGroup(a.idx.length, b.idx.length, 1);
  g.computeBoundingSphere();
  return g;
}
