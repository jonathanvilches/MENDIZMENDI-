// Monumentos levantados sobre su planta de verdad (la de OpenStreetMap, por Overture: src/data/reales/plantas.json, que
// escribe tools/plantas-monumentos.py) y con el alzado sacado de fotos. El autor, 24 nov 2026: «lo que quiero es que
// mejores las estructuras que sean iguales a la realidad», con tres fotos del castillo de Javier.
//
// Javier (fotos del autor): arenisca rojiza; la torre de San Miguel (del Homenaje), alta, lisa y almenada, en medio de
// su recinto; alrededor el cuerpo del castillo, de muros altos almenados con ladroneras; al este la torre grande con la
// corona volada sobre canes y garitas en las esquinas; abajo el recinto bajo con la barbacana de la puerta y la explanada
// de los pilares con cadenas; al noroeste, pegada, la basílica (fachada con rosetón, portada de medio punto, pináculos con
// cupulines y tejado de teja clara), y la peña de arenisca a sus pies.
import * as THREE from 'three';
import { box, gable, archRing, archPanel, colored, M, MM, uvHueco } from './builder.js';
import { pointedPanel } from './civic.js';
import { terrainHeight, addPlatform } from './heightfield.js';
import { roofHip } from './houses.js';
import { addBox, addCircle } from './colliders.js';
import { PLACES } from './layout.js';
import PLANTAS from '../data/reales/plantas.json';

export const plantaDe = (id) => PLANTAS[id] || null;
export const dentroPlanta = (P, x, z) => dentro(P, x, z);

// ---------- geometría de la planta ----------
const area = (P) => { let a = 0; for (let i = 0; i < P.length; i++) { const [x0, z0] = P[i], [x1, z1] = P[(i + 1) % P.length]; a += x0 * z1 - x1 * z0; } return a / 2; };
function centro(P) {
  let a = 0, cx = 0, cz = 0;
  for (let i = 0; i < P.length; i++) { const [x0, z0] = P[i], [x1, z1] = P[(i + 1) % P.length], c = x0 * z1 - x1 * z0; a += c; cx += (x0 + x1) * c; cz += (z0 + z1) * c; }
  return { x: cx / (3 * a), z: cz / (3 * a) };
}
function dentro(P, x, z) {
  let s = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) s = !s; }
  return s;
}
// los lados de la planta, cada uno con su dirección, su largo, su giro (para M) y su normal hacia fuera
function lados(P) {
  const out = [];
  for (let i = 0; i < P.length; i++) {
    const [ax, az] = P[i], [bx, bz] = P[(i + 1) % P.length], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
    if (L < 0.05) continue;
    let nx = dz / L, nz = -dx / L;
    if (dentro(P, (ax + bx) / 2 + nx * 0.4, (az + bz) / 2 + nz * 0.4)) { nx = -nx; nz = -nz; }
    out.push({ i, ax, az, bx, bz, dx: dx / L, dz: dz / L, L, ry: Math.atan2(-dz, dx), nx, nz });
  }
  return out;
}
// la planta levantada de y0 a y1 en un solo prisma, con la textura a escala (a lo largo de cada muro)
function prisma(P, y0, y1, uvScale = 2.4) {
  const s = new THREE.Shape(P.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false, UVGenerator: {
    generateTopUV(_, v, a, b, c) { return [a, b, c].map(k => new THREE.Vector2(v[k * 3] / uvScale, v[k * 3 + 1] / uvScale)); },
    generateSideWallUV(_, v, a, b, c, d) {
      const ax = v[a * 3], ay = v[a * 3 + 1], bx = v[b * 3], by = v[b * 3 + 1], L = Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax) / L, uy = (by - ay) / L;
      const u = (k) => (v[k * 3] * ux + v[k * 3 + 1] * uy) / uvScale, w = (k) => v[k * 3 + 2] / uvScale;
      return [a, b, c, d].map(k => new THREE.Vector2(u(k), w(k)));
    } } });
  g.rotateX(-Math.PI / 2); g.translate(0, y0, 0);
  return g;
}
// lo más bajo del terreno bajo la planta (los muros bajan hasta ahí: en cuesta no quedan colgando)
function sueloMin(P) {
  let m = Infinity;
  for (const [x, z] of P) m = Math.min(m, terrainHeight(x, z));
  const c = centro(P); return Math.min(m, terrainHeight(c.x, c.z));
}
// un punto a lo largo de un lado (t metros desde su principio) y a d metros hacia fuera
const sobre = (l, t, d = 0) => [l.ax + l.dx * t + l.nx * d, l.az + l.dz * t + l.nz * d];

// ---------- piezas ----------
// antepecho y almenas por el borde de una planta, a ras de la cara de fuera (paso: de almena a almena)
function almenas(B, mat, P, y, { paso = 2.1, ancho = 1.15, alto = 1.25, grueso = 0.55, pecho = 0.95, vuelo = 0, salta = [] } = {}) {
  for (const l of lados(P)) {
    if (salta.includes(l.i) || l.L < 1.2) continue;
    const off = vuelo - grueso / 2, [cx, cz] = sobre(l, l.L / 2, off);
    B.add(mat, box(l.L + (vuelo > 0 ? vuelo * 2 : 0), pecho, grueso), M(cx, y + pecho / 2, cz, l.ry));
    const n = Math.max(1, Math.round(l.L / paso)), p = l.L / n;
    for (let k = 0; k < n; k++) { const [x, z] = sobre(l, p * (k + 0.5), off); B.add(mat, box(ancho, alto, grueso), M(x, y + pecho + alto / 2, z, l.ry)); }
  }
}
// canes (ménsulas escalonadas) bajo un vuelo, a lo largo de los lados
function canes(B, mat, P, y, { paso = 1.1, vuelo = 0.6, salta = [] } = {}) {
  for (const l of lados(P)) {
    if (salta.includes(l.i)) continue;
    const n = Math.max(1, Math.floor(l.L / paso));
    for (let k = 0; k < n; k++) for (let e = 0; e < 3; e++) {
      const d = vuelo * (e + 1) / 3, [x, z] = sobre(l, (k + 0.5) * l.L / n, d / 2 - 0.02);
      B.add(mat, box(0.42, 0.32, d + 0.04), M(x, y - 0.32 * (2.5 - e), z, l.ry));
    }
  }
}
// ladronera: caja volada sobre tres canes, con su saetera y su almenilla (sobre el lado l, en t, techo a y)
function ladronera(B, mat, l, t, y, w = 2.4) {
  const [x, z] = sobre(l, t, 0.5);
  B.add(mat, box(w, 1.6, 1.0), M(x, y - 0.8, z, l.ry));
  B.add('dark', box(0.16, 0.7, 0.04), MM(M(x, y - 0.9, z, l.ry), M(0, 0, 0.51)));
  for (const s of [-1, 0, 1]) for (let e = 0; e < 3; e++) { const [cx, cz] = sobre(l, t + s * (w / 2 - 0.25), 0.35 * (e + 1) / 3); B.add(mat, box(0.36, 0.3, 0.35 * (e + 1) / 3 * 2 + 0.05), M(cx, y - 1.6 - 0.3 * (e + 0.5), cz, l.ry)); }
  B.add(mat, box(w, 0.8, 0.4), MM(M(x, y + 0.4, z, l.ry), M(0, 0, 0.3)));
}
// ventana con reja (hueco oscuro y barrotes) en la cara de un lado
function ventanaReja(B, l, t, y, w = 1.0, h = 1.4) {
  const [x, z] = sobre(l, t, 0.03), T = M(x, y, z, l.ry);
  B.add('dark', box(w, h, 0.06), T);
  for (let k = 1; k < 4; k++) B.add('iron', box(0.05, h, 0.05), MM(T, M(-w / 2 + k * w / 4, 0, 0.06)));
  for (const v of [-h / 3, h / 3]) B.add('iron', box(w, 0.05, 0.05), MM(T, M(0, v, 0.06)));
  B.add('sandstoneRed', box(w + 0.5, 0.22, 0.25), MM(T, M(0, -h / 2 - 0.11, 0.1)));
}
const saetera = (B, l, t, y, h = 1.3) => { const [x, z] = sobre(l, t, 0.03); B.add('dark', box(0.2, h, 0.06), M(x, y, z, l.ry)); };
// rectángulo (w a lo largo de ry, d de fondo) como planta
const rect = (cx, cz, ry, w, d) => [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([a, b]) => [cx + a * Math.cos(ry) + b * Math.sin(ry), cz - a * Math.sin(ry) + b * Math.cos(ry)]);
function colisionesPlanta(P, meta = { solidView: true }, g = 1.2) {
  for (const l of lados(P)) { const [x, z] = sobre(l, l.L / 2, -g / 2); addBox(x, z, l.L + g, g, l.ry, meta); }
}

// ---------- Castillo de Javier ----------
const S = 'sandstoneRed';
export function castilloJavier(B, P) {
  const C = P.castillo, CU = P.cuerpo, TR = P.torre;
  const c = centro(TR), y = terrainHeight(c.x, c.z), yb = sueloMin(C) - 2.5;
  // la torre de San Miguel, en la parte de dentro (noreste) del recinto de la torre, alineada con su lado largo
  const lt = lados(TR), lk = lt.reduce((a, b) => (b.L > a.L ? b : a)), ryK = lk.ry;
  const K = { x: c.x + 4, z: c.z - 3.3 };
  // 1. recinto bajo: el muro por el contorno de verdad (menos el lado que da a la basílica), con su adarve almenado
  const lc = lados(C), pegado = lc.filter(l => Math.abs(l.L - 31.6) < 1.5).map(l => l.i);
  const hb = 6.5;
  for (const l of lc) {
    if (pegado.includes(l.i)) continue;
    const yl = Math.min(terrainHeight(l.ax, l.az), terrainHeight(l.bx, l.bz)) - 2, [x, z] = sobre(l, l.L / 2, -0.7);
    B.add(S, box(l.L + 1.4, y + hb - yl, 1.4, 2.4), M(x, (y + hb + yl) / 2, z, l.ry));
    if (l.L > 9) saetera(B, l, l.L / 2, y + hb - 2.6);
  }
  almenas(B, S, C, y + hb, { salta: pegado, grueso: 0.5 });
  colisionesPlanta(C);
  // la explanada de dentro del recinto bajo, de grava (se pisa)
  B.add('paint', colored(prisma(C, yb, y + 0.15), '#9c938a'));
  // 2. cuerpo del castillo: muros altos almenados, con ladroneras y ventanas con reja
  const hc = 13.5;
  B.add(S, prisma(CU, yb, y + hc));
  almenas(B, S, CU, y + hc);
  const lcu = lados(CU);
  for (const l of lcu) {
    if (l.L > 8) ladronera(B, S, l, l.L * 0.5, y + hc - 0.2);
    if (l.L > 12) { ventanaReja(B, l, l.L * 0.25, y + hc * 0.5); saetera(B, l, l.L * 0.78, y + hc * 0.62); }
  }
  // 3. recinto de la torre: un escalón más alto, almenado
  const hr = 17.5;
  B.add(S, prisma(TR, y + hc - 1, y + hr));
  almenas(B, S, TR, y + hr);
  for (const l of lt) if (l.L > 9) ladronera(B, S, l, l.L * 0.55, y + hr - 0.2, 2.0);
  // 4. torre de San Miguel: alta y lisa, almenada, con saeteras y una ventana de arco
  const hk = 30, KP = rect(K.x, K.z, ryK, 9.6, 9.0);
  B.add(S, prisma(KP, y + hr - 1, y + hk));
  almenas(B, S, KP, y + hk, { paso: 1.75, ancho: 1.0, alto: 1.35, pecho: 1.0 });
  for (const l of lados(KP)) { saetera(B, l, l.L * 0.5, y + hk - 4.5); saetera(B, l, l.L * 0.3, y + hr + 3.5); }
  { const l = lados(KP)[2], [x, z] = sobre(l, l.L / 2, 0.03); B.add('dark', box(0.9, 1.6, 0.06), M(x, y + hr + 6, z, l.ry)); B.add(S, archRing(0.45, 0.7, 0.3, 8), MM(M(x, y + hr + 6.8, z, l.ry), M(0, 0, 0.1))); }
  // 5. torre grande del este: cuadrada, con la corona volada sobre canes y una garita en cada esquina
  const le = lcu.reduce((a, b) => ((b.ax + b.bx) > (a.ax + a.bx) ? b : a));   // (el lado del cuerpo más al este)
  const tE = sobre(le, le.L * 0.32, -4.6), hE = 24, EP = rect(tE[0], tE[1], le.ry, 10, 8.6);
  B.add(S, prisma(EP, yb, y + hE));
  canes(B, S, EP, y + hE, { vuelo: 0.6 });
  B.add(S, prisma(rect(tE[0], tE[1], le.ry, 11.2, 9.8), y + hE - 0.25, y + hE + 0.05));
  almenas(B, S, rect(tE[0], tE[1], le.ry, 11.2, 9.8), y + hE, { paso: 1.9 });
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const gx = tE[0] + (a * 5.3) * Math.cos(le.ry) + (b * 4.6) * Math.sin(le.ry), gz = tE[1] - (a * 5.3) * Math.sin(le.ry) + (b * 4.6) * Math.cos(le.ry), G = rect(gx, gz, le.ry, 2.7, 2.7);
    B.add(S, prisma(G, y + hE - 2.4, y + hE + 1.9));
    canes(B, S, G, y + hE - 2.4, { paso: 0.9, vuelo: 0.45 });
    almenas(B, S, G, y + hE + 1.9, { paso: 1.3, ancho: 0.8, alto: 1.0, grueso: 0.45, pecho: 0.6 });
  }
  for (const l of lados(EP)) { saetera(B, l, l.L * 0.5, y + 9); saetera(B, l, l.L * 0.5, y + 17); }
  addBox(tE[0], tE[1], 10.4, 9, le.ry, { solidView: true });
  // 6. barbacana de la puerta: el saliente del sureste, con el arco, su ladronera encima y el escudo
  const sal = lc.filter(l => l.az > c.z + 12 && l.bz > c.z + 12 && l.L < 6);
  let gx = 0, gz = 0; for (const l of sal) { gx += l.ax; gz += l.az; } gx /= sal.length || 1; gz /= sal.length || 1;
  const ryG = Math.atan2(gx - c.x, gz - c.z), GP = rect(gx, gz, ryG + Math.PI / 2, 6.4, 6.4);
  B.add(S, prisma(GP, yb, y + 9));
  almenas(B, S, GP, y + 9, { paso: 1.6, ancho: 0.95 });
  // (el umbral, a la altura de la explanada de delante, y + 0,4: antes la puerta arrancaba 40 cm por debajo y quedaba hundida)
  const Fg = M(gx + Math.sin(ryG) * 3.25, y + 0.4, gz + Math.cos(ryG) * 3.25, ryG);
  B.add(S, archRing(1.6, 2.2, 0.7, 14), MM(Fg, M(0, 3.4, 0.1)));
  B.add('puerta', uvHueco(archPanel(3.2, 5.0, 0.12)), MM(Fg, M(0, 0, 0.02)));
  ladronera(B, S, { ax: gx + Math.sin(ryG) * 3.2 - Math.cos(ryG) * 1.2, az: gz + Math.cos(ryG) * 3.2 + Math.sin(ryG) * 1.2, dx: Math.cos(ryG), dz: -Math.sin(ryG), nx: Math.sin(ryG), nz: Math.cos(ryG), ry: ryG, L: 2.4 }, 1.2, y + 8.6, 2.4);
  B.add('paint', colored(new THREE.CircleGeometry(0.55, 14), '#c8222a'), MM(Fg, M(0, 6.2, 0.12)));
  // 7. explanada de la entrada, delante de la puerta: losas, murete y pilares de piedra con cadenas
  const ex = { x: gx + Math.sin(ryG) * 9.5, z: gz + Math.cos(ryG) * 9.5 }, EX = rect(ex.x, ex.z, ryG, 18, 12);
  const yex = y + 0.4;
  B.add('paint', colored(prisma(EX, Math.min(yb, terrainHeight(ex.x, ex.z) - 2), yex), '#a0907f'));
  const ang = (l) => Math.abs(Math.abs(Math.atan2(l.nx, l.nz) - ryG) % (Math.PI * 2) - Math.PI);
  for (const l of lados(EX)) {
    if (ang(l) < 0.3 || ang(l) > Math.PI - 0.3) continue;   // (el lado de la puerta y el de enfrente, por donde sube la rampa, abiertos)
    const [x, z] = sobre(l, l.L / 2, -0.3); B.add(S, box(l.L, 0.7, 0.6), M(x, yex + 0.35, z, l.ry));
    const n = Math.round(l.L / 2.6);
    for (let k = 0; k <= n; k++) {
      const [px, pz] = sobre(l, k * l.L / n, -0.3); B.add('ashlar', box(0.55, 1.2, 0.55), M(px, yex + 1.3, pz, l.ry));
      if (k < n) { const [mx, mz] = sobre(l, (k + 0.5) * l.L / n, -0.3); B.add('iron', box(l.L / n - 0.5, 0.06, 0.06), M(mx, yex + 1.45, mz, l.ry)); }
    }
  }
  addPlatform(ex.x, ex.z, ryG, -9, 9, -6, 6, yex);
  // la rampa que baja de la explanada al suelo, de frente
  const rp = { x: ex.x + Math.sin(ryG) * 11, z: ex.z + Math.cos(ryG) * 11 }, yr0 = terrainHeight(rp.x + Math.sin(ryG) * 5, rp.z + Math.cos(ryG) * 5);
  if (yex - yr0 > 0.2) { const lr = Math.hypot(10, yex - yr0); B.add('paint', colored(box(8, 0.6, lr), '#a0907f'), M(rp.x, (yex + yr0) / 2 - 0.3, rp.z, ryG, Math.atan2(yex - yr0, 10)));
    addPlatform(rp.x, rp.z, ryG, -4, 4, -5, 5, yex, yr0); }
  addBox(gx, gz, 6.6, 6.6, ryG, { solidView: true });
  addBox(ex.x + Math.sin(ryG) * 4, ex.z + Math.cos(ryG) * 4, 22, 26, ryG, { ghost: true });   // (sin casas encima de la explanada ni de la rampa)
  // 8. la peña de arenisca: lajas a los pies del lado del suroeste y del recinto bajo
  const lsw = lc.filter(l => !pegado.includes(l.i)).reduce((a, b) => ((b.nz - b.nx) * b.L > (a.nz - a.nx) * a.L ? b : a));
  // (lajas planas y anchas, en capas, como la arenisca de las fotos)
  for (let k = 0; k < 9; k++) {
    const [x, z] = sobre(lsw, (k + 0.5) * lsw.L / 9, 2.2 + (k % 3) * 1.6);
    B.add('rockRose', new THREE.DodecahedronGeometry(2.4 + (k % 2) * 0.8, 0), M(x, terrainHeight(x, z) - 0.35, z, k * 1.7, 0.08 * (k % 3 - 1), 0.06, 2.0, 0.26, 1.5));
  }
  // (alrededor, prado abierto: sin árboles pegados al castillo, como en la realidad)
  addCircle(c.x + 2, c.z - 2, 34, { ghost: true });
  return { x: K.x, z: K.z, y, gate: { x: ex.x + Math.sin(ryG) * 7, z: ex.z + Math.cos(ryG) * 7 } };
}

// ---------- Basílica de Javier ----------
// La nave de la planta de verdad con la fachada al suroeste (el lado corto recto) y la cabecera poligonal al noreste;
// la capilla que sale al noroeste, más baja. Fachada de las fotos: portada de medio punto con arquivoltas, rosetón en su
// arco, hastial con remate y cruz, y dos torrecillas en las esquinas con cupulín.
export function basilicaJavier(B, P) {
  const BP = P.basilica, ls = lados(BP);
  // el lado pegado al castillo (el largo) da el eje; la fachada es el lado recto del otro extremo
  const lp = ls.reduce((a, b) => (b.L > a.L ? b : a));
  const u = { x: -lp.dx, z: -lp.dz };   // a lo largo de la nave, de la cabecera a la fachada
  const lf = ls.filter(l => Math.abs(l.dx * u.x + l.dz * u.z) < 0.25 && l.L > 9).reduce((a, b) => {
    const da = (a.ax + a.bx) * u.x + (a.az + a.bz) * u.z, db = (b.ax + b.bx) * u.x + (b.az + b.bz) * u.z; return db > da ? b : a; });
  const fx = (lf.ax + lf.bx) / 2, fz = (lf.az + lf.bz) / 2, W = lf.L, ry = Math.atan2(u.x, u.z);
  const y = terrainHeight(fx + u.x * 2, fz + u.z * 2) + 1.2, yb = sueloMin(BP) - 2;
  const F = M(fx, y, fz, ry);   // (fachada: +z hacia fuera, x a lo ancho)
  // la nave con su cabecera, sin la capilla (lo que sale más allá del ancho de la fachada)
  const loc = (x, z) => { const dx = x - fx, dz = z - fz; return [dx * Math.cos(ry) - dz * Math.sin(ry), dx * Math.sin(ry) + dz * Math.cos(ry)]; };
  const fuera = BP.map(([x, z]) => Math.abs(loc(x, z)[0]) > W / 2 + 0.6), nave = BP.filter((_, k) => !fuera[k]);
  const hn = 15;
  B.add(S, prisma(nave, yb, y + hn));
  colisionesPlanta(BP);
  const largo = Math.max(...nave.map(([x, z]) => -loc(x, z)[1]));
  // capilla del noroeste
  // (los vértices que salen del ancho de la nave y uno a cada lado, seguidos por el contorno)
  const n = BP.length, k0 = fuera.findIndex((f, k) => f && !fuera[(k - 1 + n) % n]);
  if (k0 >= 0) {
    const cap = [BP[(k0 - 1 + n) % n]]; for (let k = k0; fuera[k % n]; k++) cap.push(BP[k % n]); cap.push(BP[(k0 + cap.length - 1) % n]);
    if (cap.length >= 3 && Math.abs(area(cap)) > 8) { B.add(S, prisma(cap, yb, y + 8.5)); almenas(B, S, cap, y + 8.5, { paso: 1.4, ancho: 0.45, alto: 0.5, pecho: 0.5, grueso: 0.4 }); }
  }
  // tejado a dos aguas de teja clara, a lo largo de la nave
  const rise = W * 0.36, Lt = largo - 1.2, Tn = MM(F, M(0, hn, -Lt / 2 - 0.6));
  for (const s of [-1, 1]) B.add('tile', box(Math.hypot(W / 2 + 0.5, rise), 0.28, Lt, 2.4), MM(Tn, M(s * (W / 4 + 0.12), rise / 2, 0, 0, 0, -s * Math.atan2(rise, W / 2 + 0.5))));
  B.add('tile', box(0.6, 0.3, Lt + 0.2, 2), MM(Tn, M(0, rise + 0.2, 0)));   // (la cumbrera)
  B.add(S, gable(W, rise, 0.6), MM(Tn, M(0, 0, -Lt / 2 + 0.3)));
  // contrafuertes con pináculos a los dos lados de la nave
  for (let zz = -4.5; zz > -largo + 3; zz -= 5.2) for (const s of [-1, 1]) {
    B.add(S, box(1.2, hn + 1.2, 1.4), MM(F, M(s * (W / 2 + 0.6), (hn + 1.2) / 2 - 1.5, zz)));
    B.add(S, new THREE.ConeGeometry(0.6, 2.4, 4), MM(F, M(s * (W / 2 + 0.6), hn + 1.4, zz, Math.PI / 4)));
    if (s < 0 && zz < -16) { B.add('vidriera', uvHueco(archPanel(1.1, 4.8, 0.08)), MM(F, M(-W / 2 - 0.22, hn * 0.55 - 2.1, zz + 2.6, -Math.PI / 2))); B.add(S, archRing(0.55, 0.8, 0.3, 8), MM(F, M(-W / 2 - 0.25, hn * 0.55 + 2.1, zz + 2.6, Math.PI / 2))); }
  }
  // fachada: paño algo más ancho que la nave, con la cornisa y el hastial escalonado
  const Wf = W + 1.0, hf = 16.5;
  B.add(S, box(Wf, hf, 1.6, 2.4), MM(F, M(0, hf / 2 - 1.5, 0.3)));
  B.add(S, box(Wf + 0.4, 0.45, 2.0), MM(F, M(0, hf - 1.3, 0.35)));
  B.add(S, gable(Wf - 3.6, 5.2, 1.4), MM(F, M(0, hf - 1.1, 0.3)));
  B.add(S, box(0.4, 2.2, 0.4), MM(F, M(0, hf + 5.2, 0.3))); B.add(S, box(1.4, 0.35, 0.4), MM(F, M(0, hf + 5.6, 0.3)));
  // torrecillas de las esquinas, ochavadas arriba, con cupulín y bola
  for (const s of [-1, 1]) {
    const TT = MM(F, M(s * (Wf / 2 - 0.4), 0, 0.5));
    B.add(S, box(2.2, hf + 1.2, 2.2), MM(TT, M(0, (hf + 1.2) / 2 - 1.5, 0)));
    B.add(S, new THREE.CylinderGeometry(0.95, 0.95, 3.0, 8), MM(TT, M(0, hf + 1.2, 0)));
    for (let k = 0; k < 4; k++) B.add('dark', box(0.3, 1.4, 0.05), MM(TT, MM(M(0, hf + 1.2, 0, k * Math.PI / 2 + Math.PI / 8), M(0, 0, 0.94))));
    B.add(S, new THREE.SphereGeometry(1.05, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), MM(TT, M(0, hf + 2.7, 0)));
    B.add(S, new THREE.SphereGeometry(0.22, 8, 6), MM(TT, M(0, hf + 3.95, 0)));
  }
  // portada de medio punto con arquivoltas, puerta y escalinata
  for (let k = 0; k < 3; k++) B.add(S, archRing(2.1 + k * 0.42, 2.48 + k * 0.42, 0.5, 18), MM(F, M(0, 6.2, 1.12 - k * 0.12)));
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) B.add(S, new THREE.CylinderGeometry(0.2, 0.2, 6.2, 8), MM(F, M(s * (2.3 + k * 0.42), 3.1, 1.22 - k * 0.12)));
  // (delante del paño de la fachada, que llega a z 1,1: a 0,6 quedaban dentro del muro y la portada se veía ciega)
  B.add(S, archPanel(4.2, 8.3, 0.04), MM(F, M(0, 0, 1.12)));   // (el tímpano, de la misma arenisca: en negro parecía un agujero)
  B.add('puerta', uvHueco(archPanel(3.0, 4.4, 0.08)), MM(F, M(0, 0, 1.16)));
  B.add('ashlar', box(6.2, 0.4, 0.5), MM(F, M(0, -0.2, 1.3)));   // (el umbral, hasta el primer peldaño)
  for (const s of [-1, 1]) { B.add('vidriera', uvHueco(archPanel(1.1, 2.6, 0.08)), MM(F, M(s * 4.0, 2.8, 1.12))); B.add(S, box(1.6, 0.25, 0.4), MM(F, M(s * 4.0, 2.7, 1.25))); }
  // el rosetón en su arco
  const yr = 11.6;
  B.add(S, archRing(2.4, 2.9, 0.4, 18), MM(F, M(0, yr, 1.15)));
  B.add(S, new THREE.TorusGeometry(1.75, 0.22, 6, 24), MM(F, M(0, yr, 1.16)));
  B.add('roseton', new THREE.CircleGeometry(1.7, 28), MM(F, M(0, yr, 1.1)));
  for (let k = 0; k < 8; k++) B.add(S, box(0.12, 3.3, 0.12), MM(F, M(0, yr, 1.16, 0, 0, k * Math.PI / 8)));
  B.add(S, new THREE.TorusGeometry(0.45, 0.12, 6, 14), MM(F, M(0, yr, 1.2)));
  B.add(S, box(Wf - 1.2, 0.3, 0.5), MM(F, M(0, 8.9, 1.25)));
  // escalinata delante de la portada, hasta el suelo
  const yg = Math.min(y - 0.2, terrainHeight(fx + u.x * 8, fz + u.z * 8)), nEsc = Math.max(2, Math.round((y - yg) / 0.18)), hs = (y - yg) / nEsc;
  for (let k = 0; k < nEsc; k++) { const top = -(k + 1) * hs, bot = yg - y - 1.2; B.add('ashlar', box(6.2, top - bot, 0.36), MM(F, M(0, (top + bot) / 2, 1.48 + k * 0.36))); }
  addPlatform(fx + u.x * (1.3 + nEsc * 0.18), fz + u.z * (1.3 + nEsc * 0.18), ry, -3.1, 3.1, -nEsc * 0.18, nEsc * 0.18, y, yg);
  // y la peña a los pies de la fachada
  for (let k = 0; k < 4; k++) { const s = k % 2 ? 1 : -1, x = fx + u.x * (3 + k) + Math.cos(ry) * s * (5.5 + k), z = fz + u.z * (3 + k) - Math.sin(ry) * s * (5.5 + k); B.add('rockRose', new THREE.DodecahedronGeometry(2.4 + (k % 2), 0), M(x, terrainHeight(x, z) - 0.35, z, k * 2.1, 0.06, 0, 2.0, 0.26, 1.5)); }
  addCircle(fx + u.x * 6, fz + u.z * 6, 9, { ghost: true });
  const door = { x: fx + u.x * (2.5 + nEsc * 0.36), z: fz + u.z * (2.5 + nEsc * 0.36) };
  return { door, x: fx - u.x * largo / 2, z: fz - u.z * largo / 2, y, W, L: largo };
}

// ---------- Palacio Real de Olite ----------
// La planta de verdad (75 vértices) levantada como cuerpo almenado de arenisca dorada, y encima las torres que describe
// la Wikipedia (es) en los sitios que marca el propio contorno: la de las Tres Coronas u Ochavada, octogonal y de tres
// alturas cada vez más estrechas, en el octógono del lado norte; la redonda pequeña en el bulto redondo de al lado, y
// junto a ella la de la Atalaya o del Vigía (cuadrada, con otra redonda más pequeña sobre su terraza almenada); la del
// Homenaje, la más alta (40 m), rectangular y con cuatro torretas redondas en las esquinas de la terraza, en el saliente
// cuadrado del noreste; la de los Cuatro Vientos, cuadrada sobre sus grandes ventanales, con otra más alta y estrecha al
// lado, en la punta del este; la Gran Torre en medio con la Galería del Rey; las cinco torres redondas de cono de pizarra del frente sur; y el jardín colgante de la
// Reina, sobre la sala de los Arcos, en el ala del este. (Las torres no tienen el sitio exacto: la Cátedra de Patrimonio
// de la Universidad de Navarra no se abre desde aquí; el contorno sí es el de OpenStreetMap.)
const SO = 'sandstone';
const OLITE = {
  coronas: { x: -78.7, z: -194.2, r: 4.7 },
  cilindro: { x: -68.2, z: -187.2, r: 2.4 },
  atalaya: { x: -64.4, z: -178.4, ry: 0.64, w: 6, d: 6 },
  homenaje: { x: -52.6, z: -177.2, ry: 0.905, w: 8.4, d: 7.8 },
  vientos: { x: -17.1, z: -152.3, ry: -0.79, w: 8, d: 8 },
  gran: { x: -80, z: -167.5, ry: -0.111, w: 28, d: 16 },
  sur: [{ x: -110.4, z: -146.9, r: 3.2, h: 18 }, { x: -94.4, z: -152.6, r: 2.6, h: 16.5 }, { x: -87.2, z: -146.9, r: 3.3, h: 19 }, { x: -71.4, z: -153.1, r: 2.6, h: 16.5 }, { x: -63.1, z: -145.6, r: 3.1, h: 18 }],
  puerta: { a: [-87.2, -144.6], b: [-71.4, -151.8] },
  jardin: [[-46.1, -155.9], [-37.1, -148.2], [-37.8, -144.1], [-40.4, -143.8], [-39.9, -135.5], [-33.8, -136.2], [-32.4, -132.5], [-10, -150.9], [-18.6, -159.4], [-24.4, -162.9], [-37.8, -151], [-43.5, -156.1]],
};
// torre cuadrada (o rectangular) almenada, con canes bajo la corona si se pide, saeteras y una ventana gótica
function torreCuadrada(B, mat, t, y0, y, h, { canesCorona = false, ventana = true } = {}) {
  const P = rect(t.x, t.z, t.ry || 0, t.w, t.d || t.w);
  B.add(mat, prisma(P, y0, y + h));
  if (canesCorona) { canes(B, mat, P, y + h, { vuelo: 0.55 }); const P2 = rect(t.x, t.z, t.ry || 0, t.w + 1.1, (t.d || t.w) + 1.1); B.add(mat, prisma(P2, y + h - 0.25, y + h + 0.05)); almenas(B, mat, P2, y + h, { paso: 1.8 }); }
  else almenas(B, mat, P, y + h, { paso: 1.8 });
  for (const l of lados(P)) { saetera(B, l, l.L * 0.5, y + h * 0.45); if (ventana && l.L > 5) ventanaGotica(B, l, l.L * 0.5, y + h * 0.72); }
  addBox(t.x, t.z, t.w + 0.3, (t.d || t.w) + 0.3, t.ry || 0, { solidView: true });
  return P;
}
// ventana gótica de castillo o palacio: hueco oscuro de arco apuntado con su parteluz, su marco de sillar y el alféizar
// (con la vidriera de colores de las iglesias, el castillo parecía una iglesia)
function ventanaGotica(B, l, t, y, w = 1.2, h = 2.4) {
  const [x, z] = sobre(l, t, 0.03), T = M(x, y, z, l.ry), hs = h - w * 0.166, b = -h / 2;
  B.add('glass', pointedPanel(w, h + w * 0.7, 0.06), MM(T, M(0, b, 0)));
  B.add(SO, box(0.12, h, 0.12), MM(T, M(0, 0, 0.06)));
  B.add(SO, anilloApuntado(w, 0.18, 0.16), MM(T, M(0, b + hs, 0.05)));
  for (const k of [-1, 1]) B.add(SO, box(0.18, hs, 0.16), MM(T, M(k * (w / 2 + 0.09), b + hs / 2, 0.05)));
  B.add(SO, box(w + 0.55, 0.16, 0.3), MM(T, M(0, b - 0.08, 0.1)));
}
// el arco apuntado del marco: de ancho wi por dentro y t de grueso, con la línea de arranque en y = 0
function anilloApuntado(wi, t, depth) {
  const wo = wi + 2 * t, s = new THREE.Shape();
  s.moveTo(-wo / 2, 0); s.absarc(wo / 2, 0, wo, Math.PI, Math.PI * 2 / 3, true); s.absarc(-wo / 2, 0, wo, Math.PI / 3, 0, true);
  s.lineTo(wi / 2, 0); s.absarc(-wi / 2, 0, wi, 0, Math.PI / 3, false); s.absarc(wi / 2, 0, wi, Math.PI * 2 / 3, Math.PI, false); s.lineTo(-wo / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 5 }); g.translate(0, 0, -depth / 2); return g;
}
// torre redonda u ochavada (lados: 8 para la ochavada), almenada por su borde
function torreRedonda(B, mat, x, z, r, y0, y1, lados8 = 14) {
  const P = []; for (let k = 0; k < lados8; k++) { const a = (k + 0.5) / lados8 * Math.PI * 2; P.push([x + Math.cos(a) * r, z + Math.sin(a) * r]); }
  B.add(mat, prisma(P, y0, y1));
  almenas(B, mat, P, y1, { paso: Math.max(1.3, Math.PI * 2 * r / lados8), ancho: Math.min(1.0, Math.PI * 2 * r / lados8 * 0.55), grueso: 0.45 });
  return P;
}
const redondo = (x, z, r, n) => { const P = []; for (let k = 0; k < n; k++) { const a = (k + 0.5) / n * Math.PI * 2; P.push([x + Math.cos(a) * r, z + Math.sin(a) * r]); } return P; };
// corona volada de una torre redonda u ochavada: canes escalonados alrededor, el antepecho que vuela y sus almenas
function coronaRedonda(B, mat, x, z, r, y, n = 12) {
  const seg = Math.max(n, Math.round(r * 3));
  for (let k = 0; k < seg; k++) { const a = (k + 0.5) / seg * Math.PI * 2; for (let e = 0; e < 3; e++) { const d = 0.55 * (e + 1) / 3; B.add(mat, box(0.42, 0.3, d + 0.05), M(x + Math.cos(a) * (r + d / 2 - 0.02), y - 0.3 * (2.5 - e), z + Math.sin(a) * (r + d / 2 - 0.02), Math.PI / 2 - a)); } }
  const P = redondo(x, z, r + 0.55, n);
  B.add(mat, prisma(P, y - 0.2, y + 0.1));
  almenas(B, mat, P, y, { paso: Math.max(1.2, Math.PI * 2 * (r + 0.55) / n), ancho: Math.min(1.0, Math.PI * 2 * (r + 0.55) / n * 0.55), grueso: 0.45 });
}
// cono de pizarra con su remate de hierro (torres redondas y la ochavada, como en las fotos)
function conoPizarra(B, x, z, r, y, h, n = 12) {
  B.add('slate', new THREE.ConeGeometry(r, h, n), M(x, y + h / 2, z, Math.PI / n));
  B.add(SO, box(r * 2 + 0.3, 0.3, r * 2 + 0.3), M(x, y + 0.1, z));
  B.add('iron', box(0.1, 1.5, 0.1), M(x, y + h + 0.7, z)); B.add('iron', new THREE.SphereGeometry(0.16, 6, 4), M(x, y + h + 0.4, z));
  B.add('iron', box(0.62, 0.34, 0.03), M(x + 0.3, y + h + 1.2, z));   // (la veleta)
}
// hiedra trepando por un muro (tarjetas de hojas pegadas a la cara de fuera; el Palacio Viejo, hoy parador, está cubierto)
function hiedra(B, l, y0, y1, cubre = 0.7, semilla = 1) {
  let s = semilla * 9301 + 49297; const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const P = [], N = [], U = [], C = [], I = [], c = new THREE.Color(), cols = ['#4f7f33', '#5d8c3a', '#6b9a41', '#447330'];
  for (let t = 0.3; t < l.L - 0.3; t += 0.62) for (let yy = y0 + 0.3; yy < y1 - 0.2; yy += 0.55) {
    if (r() > cubre * (1 - 0.5 * Math.max(0, (yy - y0) / (y1 - y0) - 0.6))) continue;
    const [x, z] = sobre(l, t + (r() - 0.5) * 0.3, 0.06 + r() * 0.06), w = 0.42 + r() * 0.2, k = P.length / 3;
    c.set(cols[Math.floor(r() * cols.length)]);
    for (const [a, b, u, v] of [[-1, -1, 0, 0.5], [1, -1, 0.5, 0.5], [1, 1, 0.5, 1], [-1, 1, 0, 1]]) { const ca = Math.cos(r() * 0), q = r() * 6.28, rx = a * Math.cos(q) - b * Math.sin(q), ry2 = a * Math.sin(q) + b * Math.cos(q); P.push(x + l.dx * rx * w * ca, yy + ry2 * w, z + l.dz * rx * w * ca); N.push(l.nx, 0, l.nz); U.push(u, v); C.push(c.r, c.g, c.b); }
    I.push(k, k + 1, k + 2, k, k + 2, k + 3);
  }
  if (!I.length) return;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I);
  B.add('trepa', g, new THREE.Matrix4());
}
export function palacioOlite(B, P) {
  const PA = P.palacio, c = centro(PA), y = terrainHeight(c.x, c.z), yb = sueloMin(PA) - 2.5;
  // cuerpo: el contorno de verdad, almenado, con ventanas góticas y alguna ladronera
  const hc = 15;
  B.add(SO, prisma(PA, yb, y + hc));
  almenas(B, SO, PA, y + hc);
  colisionesPlanta(PA);
  for (const l of lados(PA)) if (l.L > 9) { ventanaGotica(B, l, l.L * 0.3, y + 9.5); ventanaGotica(B, l, l.L * 0.7, y + 9.5); if (l.L > 15) ladronera(B, SO, l, l.L * 0.5, y + hc - 0.2); }
  // la Gran Torre, en medio, más alta, con la torre Nueva a su lado sur
  torreCuadrada(B, SO, OLITE.gran, y + hc - 1, y, 22, { canesCorona: true, ventana: false });
  { const g = OLITE.gran, tn = { x: g.x + Math.sin(g.ry) * 0 + 6, z: g.z + 9.5, ry: g.ry, w: 7, d: 6 }; torreCuadrada(B, SO, tn, y + hc - 1, y, 25.5); }
  // (el frente sur, el que da a la plaza: la muralla almenada con cinco torres redondas de cono de pizarra, foto aérea del autor)
  for (const t of OLITE.sur) {
    B.add(SO, prisma(redondo(t.x, t.z, t.r, 16), yb, y + t.h)); conoPizarra(B, t.x, t.z, t.r + 0.45, y + t.h, t.r * 2.5, 16);
    for (const l of lados(redondo(t.x, t.z, t.r, 16))) if (l.nz > 0.6) saetera(B, l, l.L / 2, y + t.h * 0.55);
    addBox(t.x, t.z, t.r * 2, t.r * 2, 0, { solidView: true });
  }
  // la Galería del Rey: arcos apuntados calados con columnillas, bajo un tejadillo de pizarra, asomando por encima del
  // frente sur desde la cara de la Gran Torre
  { const g = OLITE.gran, n = 9, Lg = g.w * 0.62, F = MM(M(g.x, y + hc - 0.5, g.z, g.ry), M(0, 0, g.d / 2 + 0.75));
    B.add(SO, box(Lg + 0.6, 0.5, 1.6), MM(F, M(0, 0.25, 0)));
    for (let k = 0; k <= n; k++) B.add(SO, box(0.26, 4.2, 0.26), MM(F, M(-Lg / 2 + k * Lg / n, 2.6, 0.6)));
    for (let k = 0; k < n; k++) { const x = -Lg / 2 + (k + 0.5) * Lg / n; B.add('dark', box(Lg / n - 0.3, 3.3, 0.05), MM(F, M(x, 2.2, -0.6))); B.add(SO, new THREE.TorusGeometry(Lg / n / 2 - 0.12, 0.09, 4, 8, Math.PI), MM(F, M(x, 4.0, 0.62))); }
    B.add(SO, box(Lg + 0.6, 0.35, 1.7), MM(F, M(0, 4.8, 0.05)));
    B.add('slate', box(Lg + 1.2, 0.22, 2.4), MM(F, M(0, 5.4, 0.1, 0, -0.38))); }
  // la de las Tres Coronas u Ochavada: octogonal, tres alturas que se estrechan
  // (fotos del autor: cada altura con su corona volada sobre canes, y arriba un cuerpo pequeño con el cono de pizarra)
  { const t = OLITE.coronas, r2 = t.r * 0.8, r3 = t.r * 0.58;
    B.add(SO, prisma(redondo(t.x, t.z, t.r, 8), yb, y + 18)); coronaRedonda(B, SO, t.x, t.z, t.r, y + 18, 8);
    B.add(SO, prisma(redondo(t.x, t.z, r2, 8), y + 18, y + 25.5)); coronaRedonda(B, SO, t.x, t.z, r2, y + 25.5, 8);
    B.add(SO, prisma(redondo(t.x, t.z, r3, 8), y + 25.5, y + 28.6));
    conoPizarra(B, t.x, t.z, r3 + 0.45, y + 28.6, 7.5, 8);
    for (const l of lados(redondo(t.x, t.z, t.r, 8))) { saetera(B, l, l.L / 2, y + 8); if (l.nz < 0) ventanaGotica(B, l, l.L / 2, y + 13, 1.0, 2.0); }
    for (const l of lados(redondo(t.x, t.z, r2, 8))) if (l.nz < 0.3) ventanaGotica(B, l, l.L / 2, y + 21.5, 0.8, 1.6);
    addBox(t.x, t.z, t.r * 2, t.r * 2, 0, { solidView: true });
    // el nevero de delante, en el jardín: la cúpula de piedra en forma de cáscara de huevo (en los datos, «Nevero del castillo»)
    const nx = -86.7, nz = -191.1, ny = terrainHeight(nx, nz);
    B.add('stone', new THREE.SphereGeometry(2.7, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(nx, ny - 0.2, nz, 0, 0, 0, 1, 1.45, 1));
    B.add('dark', archPanel(0.9, 1.6, 0.1), M(nx, ny - 0.2, nz + 2.62, 0));
    addBox(nx, nz, 5, 5, 0, { solidView: true }); }
  // la redonda pequeña y, junto a ella, la de la Atalaya con su torrecilla redonda arriba
  { const t = OLITE.cilindro; B.add(SO, prisma(redondo(t.x, t.z, t.r, 14), yb, y + 24)); conoPizarra(B, t.x, t.z, t.r + 0.4, y + 24, 6.5, 14); }
  { const t = OLITE.atalaya; torreCuadrada(B, SO, t, y + hc - 1, y, 34, { canesCorona: true }); torreRedonda(B, SO, t.x, t.z, 1.35, y + 34, y + 38.2, 10); }
  // la del Homenaje: la más alta, con cuatro torretas redondas en las esquinas de la terraza
  { const t = OLITE.homenaje; torreCuadrada(B, SO, t, yb, y, 40, { canesCorona: true });
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const ox = a * (t.w / 2 + 0.3), oz = b * (t.d / 2 + 0.3), x = t.x + ox * Math.cos(t.ry) + oz * Math.sin(t.ry), z = t.z - ox * Math.sin(t.ry) + oz * Math.cos(t.ry); B.add(SO, new THREE.ConeGeometry(1.2, 2.2, 10), M(x, y + 36.4, z, 0, Math.PI)); torreRedonda(B, SO, x, z, 1.2, y + 37.5, y + 42.6, 10); }
    for (const l of lados(rect(t.x, t.z, t.ry, t.w, t.d))) ladronera(B, SO, l, l.L / 2, y + 30, 2.2); }
  // la de los Cuatro Vientos: cuadrada, con los tres grandes ventanales abiertos arriba y tejado a cuatro aguas; al lado,
  // otra cuadrada más estrecha y más alta
  { const t = OLITE.vientos, VP = rect(t.x, t.z, t.ry, t.w, t.d);
    B.add(SO, prisma(VP, yb, y + 22));
    for (const l of lados(VP)) for (let k = 0; k < 3; k++) {
      const [x, z] = sobre(l, l.L * (k + 1) / 4, 0.03), T = M(x, y + 24.4, z, l.ry);
      B.add('dark', box(1.4, 3.6, 0.06), T); B.add('dark', new THREE.ConeGeometry(0.75, 1.0, 3, 1), MM(T, M(0, 2.3, 0, 0, Math.PI / 2, 0, 1, 1, 0.08)));
      B.add(SO, box(1.9, 0.25, 0.7), MM(T, M(0, -1.9, 0.3)));   // (el balcón)
    }
    B.add(SO, prisma(VP, y + 22, y + 27.6));
    canes(B, SO, VP, y + 27.6, { vuelo: 0.4 });
    { const P2 = rect(t.x, t.z, t.ry, t.w + 0.9, t.d + 0.9); B.add(SO, prisma(P2, y + 27.4, y + 27.7)); almenas(B, SO, P2, y + 27.6, { paso: 1.3, ancho: 0.55, alto: 0.7, pecho: 0.6, grueso: 0.35 }); }
    B.add('slate', new THREE.ConeGeometry(t.w * 0.66, 7.5, 4, 1), M(t.x, y + 27.7 + 3.75, t.z, t.ry + Math.PI / 4));
    for (const l of lados(VP)) { const [x, z] = sobre(l, l.L / 2, -0.9), T = M(x, y + 29.3, z, l.ry); B.add(SO, box(1.3, 1.6, 0.9), T); B.add('dark', box(0.6, 0.9, 0.05), MM(T, M(0, -0.1, 0.46))); B.add('slate', gable(1.7, 1.0, 1.1), MM(T, M(0, 0.8, 0))); }
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const ox = a * (t.w / 2 + 0.1), oz = b * (t.d / 2 + 0.1), x = t.x + ox * Math.cos(t.ry) + oz * Math.sin(t.ry), z = t.z - ox * Math.sin(t.ry) + oz * Math.cos(t.ry);
      B.add(SO, box(0.8, 2.4, 0.8), M(x, y + 28.9, z, t.ry)); B.add(SO, new THREE.ConeGeometry(0.55, 1.4, 4), M(x, y + 30.8, z, t.ry + Math.PI / 4)); }
    B.add('iron', box(0.1, 1.8, 0.1), M(t.x, y + 36.1, t.z));
    addBox(t.x, t.z, t.w + 0.3, t.d + 0.3, t.ry, { solidView: true });
    torreCuadrada(B, SO, { x: t.x - Math.cos(t.ry) * 6, z: t.z + Math.sin(t.ry) * 6, ry: t.ry, w: 4.2, d: 4.2 }, y + 10, y, 31.5, { ventana: false }); }
  // dos templetes ochavados con cupulín de pizarra sobre el cuerpo del oeste, una torre redonda con cono de pizarra en la
  // esquina del ala del este y un tejado de teja a cuatro aguas sobre el cuerpo del norte, junto a la ochavada (fotos)
  for (const [x, z] of [[-97.5, -159.5], [-104.5, -156.5]]) {
    const TP = redondo(x, z, 1.35, 8); B.add(SO, prisma(TP, y + hc - 0.5, y + hc + 3.2));
    for (const l of lados(TP)) { const [wx, wz] = sobre(l, l.L / 2, 0.02); B.add('dark', box(0.5, 1.5, 0.05), M(wx, y + hc + 1.6, wz, l.ry)); }
    conoPizarra(B, x, z, 1.6, y + hc + 3.2, 2.4, 8);
  }
  B.add(SO, prisma(redondo(-33.8, -135.6, 3, 16), yb, y + 17)); conoPizarra(B, -33.8, -135.6, 3.45, y + 17, 7.5, 16); addBox(-33.8, -135.6, 6, 6, 0, { solidView: true });
  roofHip(B, M(-91, y + hc, -178.5, -0.111), 12, 10, 0.2, 3.2, 'tile');
  // el jardín colgante de la Reina, sobre la sala de los Arcos: el ala del este más baja, con arcos apuntados en su cara
  // de fuera y el jardín arriba, con su antepecho, setos y naranjos en macetones
  { const J = OLITE.jardin, hj = 11;
    B.add('paint', colored(prisma(J, y + hj - 0.1, y + hj + 0.25), '#5f7d3c'));
    almenas(B, SO, J, y + hj + 0.25, { paso: 1.7, ancho: 0.5, alto: 0.6, pecho: 0.9, grueso: 0.4 });
    const lj = lados(J).reduce((a, b) => (b.L > a.L ? b : a));
    for (let k = 0; k < 6; k++) { const [x, z] = sobre(lj, lj.L * (k + 0.5) / 6, 0.05), T = M(x, y, z, lj.ry); B.add('dark', box(2.6, 6.2, 0.06), MM(T, M(0, 3.1, 0))); B.add('dark', new THREE.ConeGeometry(1.4, 1.8, 3, 1), MM(T, M(0, 6.2 + 0.6, 0, 0, Math.PI / 2, 0, 1, 1, 0.08))); B.add(SO, box(0.7, 7.6, 0.5), MM(T, M(lj.L / 12, 3.8, 0.2))); }
    const cj = centro(J);
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, x = cj.x + Math.cos(a) * 6.5, z = cj.z + Math.sin(a) * 4.5; if (!dentro(J, x, z)) continue;
      B.add('stone', box(0.9, 0.7, 0.9), M(x, y + hj + 0.6, z)); B.add('paint', colored(new THREE.IcosahedronGeometry(0.85, 0), k % 2 ? '#3f6a2a' : '#4e7a31'), M(x, y + hj + 1.7, z)); } }
  // la puerta: el arco de medio punto que da al patio de los Naranjos, en la cara que mira al pueblo
  const pa = OLITE.puerta, pl = lados([pa.a, pa.b, [c.x, c.z]])[0], [gx, gz] = sobre(pl, pl.L / 2, 0.05), G = M(gx, y, gz, pl.ry);
  B.add('puerta', uvHueco(archPanel(3.4, 5.4, 0.12)), G);
  for (let k = 0; k < 2; k++) B.add(SO, archRing(1.7 + k * 0.35, 2.05 + k * 0.35, 0.5, 14), MM(G, M(0, 3.7, 0.15 - k * 0.1)));
  B.add('paint', colored(new THREE.CircleGeometry(0.7, 14), '#c8222a'), MM(G, M(0, 7, 0.2)));
  const gate = { x: gx + pl.nx * 7, z: gz + pl.nz * 7 };
  return { x: c.x, z: c.z, y, gate };
}
// el Palacio Viejo (el de los Teobaldos, hoy parador): su planta, almenada, con dos torres
export function palacioViejoOlite(B, P) {
  const PV = P.viejo, y = terrainHeight(centro(PV).x, centro(PV).z), yb = sueloMin(PV) - 2.5;
  B.add(SO, prisma(PV, yb, y + 14));
  almenas(B, SO, PV, y + 14);
  colisionesPlanta(PV);
  for (const l of lados(PV)) if (l.L > 9) { ventanaGotica(B, l, l.L * 0.33, y + 8.5); ventanaGotica(B, l, l.L * 0.66, y + 8.5); }
  // (su portada, en el muro que mira a la plaza, a ras del suelo de delante: era un bloque sin entrada)
  { const cv = centro(PV), pz = PLACES.plaza || cv;
    const l = lados(PV).filter(q => q.L > 6).reduce((a, b) => ((b.nx * (pz.x - cv.x) + b.nz * (pz.z - cv.z)) > (a.nx * (pz.x - cv.x) + a.nz * (pz.z - cv.z)) ? b : a));
    // (a lo largo de ese muro, donde no la tape una de las dos torres)
    const torres = [[-141.6, -226.4], [-122.8, -203.2]], libre = (t) => { const [qx, qz] = sobre(l, t, 0); return Math.min(...torres.map(([tx, tz]) => Math.hypot(qx - tx, qz - tz))); };
    const tp = [0.5, 0.35, 0.65, 0.25, 0.75, 0.15, 0.85].map(f => f * l.L).reduce((a, b) => (libre(a) >= 6.5 ? a : libre(b) > libre(a) ? b : a));
    const [px, pz2] = sobre(l, tp, 0.04), yd = terrainHeight(px + l.nx * 1.5, pz2 + l.nz * 1.5) - 0.05, G = M(px, yd, pz2, Math.atan2(l.nx, l.nz));
    B.add('puerta', uvHueco(archPanel(2.6, 4.2, 0.12)), G);
    for (let k = 0; k < 2; k++) B.add(SO, archRing(1.3 + k * 0.3, 1.6 + k * 0.3, 0.4, 12), MM(G, M(0, 4.2 - 1.3, 0.12 - k * 0.08))); }
  const T1 = torreCuadrada(B, SO, { x: -141.6, z: -226.4, ry: 0.72, w: 7, d: 7 }, yb, y, 21, { canesCorona: true });
  const T2 = torreCuadrada(B, SO, { x: -122.8, z: -203.2, ry: 0.72, w: 6.4, d: 6.4 }, yb, y, 19);
  // (cubierto de hiedra, como el parador de las fotos: por los muros largos y las dos torres)
  let k = 0;
  for (const l of lados(PV)) if (l.L > 6) hiedra(B, l, Math.min(terrainHeight(l.ax, l.az), terrainHeight(l.bx, l.bz)) - 0.3, y + 14, 0.75, ++k);
  for (const T of [T1, T2]) for (const l of lados(T)) hiedra(B, l, y + 4, y + 18, 0.65, ++k);
}
// la iglesia de al lado, en Olite: Santa María la Real, de la misma arenisca dorada y con la torre gótica de ventanas
// geminadas acabada en terraza, sin chapitel (fotos del autor)
export const iglesiaOpciones = (id) => (id === 'olite' ? { piedra: 'sandstone', remate: 'terraza' } : null);
// (para que la iglesia de al lado, que se levanta antes, no se meta en el palacio: sus muros como cajas finas)
export function evitaPlanta(P, g = 1.6) { return lados(P).map(l => { const [x, z] = sobre(l, l.L / 2, -g / 2); return { x, z, ry: l.ry, hw: l.L / 2, hd: g / 2 }; }); }
