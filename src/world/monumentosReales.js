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
import { box, gable, archRing, archPanel, colored, M, MM } from './builder.js';
import { terrainHeight, addPlatform } from './heightfield.js';
import { addBox, addCircle } from './colliders.js';
import PLANTAS from '../data/reales/plantas.json';

export const plantaDe = (id) => PLANTAS[id] || null;

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
  const Fg = M(gx + Math.sin(ryG) * 3.25, y, gz + Math.cos(ryG) * 3.25, ryG);
  B.add(S, archRing(1.6, 2.2, 0.7, 14), MM(Fg, M(0, 3.4, 0.1)));
  B.add('woodDark', archPanel(3.2, 5.0, 0.12), MM(Fg, M(0, 0, 0.02)));
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
  B.add(S, gable(W, rise, 0.6), MM(Tn, M(0, 0, -Lt / 2 + 0.3)));
  // contrafuertes con pináculos a los dos lados de la nave
  for (let zz = -4.5; zz > -largo + 3; zz -= 5.2) for (const s of [-1, 1]) {
    B.add(S, box(1.2, hn + 1.2, 1.4), MM(F, M(s * (W / 2 + 0.6), (hn + 1.2) / 2 - 1.5, zz)));
    B.add(S, new THREE.ConeGeometry(0.6, 2.4, 4), MM(F, M(s * (W / 2 + 0.6), hn + 1.4, zz, Math.PI / 4)));
    if (s < 0 && zz < -16) { B.add('dark', box(0.06, 4.2, 1.1), MM(F, M(-W / 2 - 0.03, hn * 0.55, zz + 2.6))); B.add(S, archRing(0.55, 0.8, 0.3, 8), MM(F, M(-W / 2 - 0.05, hn * 0.55 + 2.1, zz + 2.6, Math.PI / 2))); }
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
  B.add('dark', archPanel(4.2, 8.3, 0.1), MM(F, M(0, 0, 0.6)));
  B.add('woodDark', archPanel(3.0, 4.4, 0.12), MM(F, M(0, 0, 0.66)));
  for (const s of [-1, 1]) { B.add('dark', archPanel(1.1, 2.6, 0.08), MM(F, M(s * 4.0, 2.8, 1.12))); B.add(S, box(1.6, 0.25, 0.4), MM(F, M(s * 4.0, 2.7, 1.25))); }
  // el rosetón en su arco
  const yr = 11.6;
  B.add(S, archRing(2.4, 2.9, 0.4, 18), MM(F, M(0, yr, 1.15)));
  B.add(S, new THREE.TorusGeometry(1.75, 0.22, 6, 24), MM(F, M(0, yr, 1.16)));
  B.add('dark', new THREE.CircleGeometry(1.7, 24), MM(F, M(0, yr, 1.1)));
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
