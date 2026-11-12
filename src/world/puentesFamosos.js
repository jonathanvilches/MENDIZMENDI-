// Los puentes famosos de Navarra, levantados como los de verdad (noviembre de 2026): el de los Peregrinos de Puente la
// Reina y el medieval de Burgui. Cada uno con su número de arcos de medio punto, más grandes en el centro y más pequeños
// hacia las orillas; su lomo de asno; sus pilas gruesas con tajamares contra la corriente (y espolones aguas abajo); los
// ojos de aliviadero que abren las pilas del de Puente la Reina para que pase el agua de las crecidas; y las dovelas de
// cada arco, de sillería. Como arquitecto: el tablero sube desde la calle de cada orilla hasta la clave del arco grande,
// sobre el río, sin pasar de la cuesta que tenía el de verdad; y los arcos se reparten debajo según la altura que queda,
// cada uno del tamaño que le cabe, de dentro afuera, hasta que no cabe ninguno más (desde ahí, estribo macizo). El alto
// del lomo se elige para que salgan los arcos que tiene el puente y el del centro tenga su luz.
//   especFamoso(id, P) · planFamoso(F, perfil) · levantaFamoso(B, F, plan, ctx)
import * as THREE from 'three';
import { box, M } from './builder.js';
import { clamp } from '../util/math.js';
import { rosca } from './puentesFamososPlan.js';
export { especFamoso, planFamoso, FAMOSOS } from './puentesFamososPlan.js';

// ---------- piezas ----------
// (una malla de triángulos sueltos a partir de una lista de puntos [x, y, z], con sus normales y uv en metros)
// (dentro: un punto del interior de la pieza, que es convexa; cada cara se gira para mirar hacia fuera de él, porque
// las caras de dentro no se dibujan)
function malla(tris, dentro, esc = 2) {
  const g = new THREE.BufferGeometry(), pos = new Float32Array(tris.length * 3), uv = new Float32Array(tris.length * 2);
  for (let i = 0; i < tris.length; i += 3) {
    let [a, b, c] = [tris[i], tris[i + 1], tris[i + 2]];
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const mx = (a[0] + b[0] + c[0]) / 3 - dentro[0], my = (a[1] + b[1] + c[1]) / 3 - dentro[1], mz = (a[2] + b[2] + c[2]) / 3 - dentro[2];
    if (nx * mx + ny * my + nz * mz < 0) [b, c] = [c, b];
    const lado = Math.abs(nx) > Math.abs(nz);
    [a, b, c].forEach((p, j) => {
      pos.set(p, (i + j) * 3);
      // (la textura, por la cara: en las verticales, su horizontal y la altura)
      uv[(i + j) * 2] = (lado ? p[2] : p[0]) / esc; uv[(i + j) * 2 + 1] = p[1] / esc;
    });
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.computeVertexNormals();
  return g;
}
// un tajamar triangular: la base en la cara de la pila (de A a B) y la punta C, de y0 a y1, con su sombrerete: dos faldones
// que suben de la arista de la punta a la pila
function tajamarTri(A, B, C, y0, y1, cap) {
  const P = (q, y) => [q[0], y, q[1]], t = [];
  const quad = (a, b, c, d) => t.push(a, b, c, a, c, d);
  quad(P(A, y0), P(C, y0), P(C, y1), P(A, y1)); quad(P(C, y0), P(B, y0), P(B, y1), P(C, y1));
  const Mt = [(A[0] + B[0]) / 2, y1 + cap, (A[1] + B[1]) / 2];
  t.push(P(A, y1), P(C, y1), Mt, P(C, y1), P(B, y1), Mt);
  return malla(t, [(A[0] + B[0] + C[0]) / 3, (y0 + y1) / 2, (A[1] + B[1] + C[1]) / 3]);
}
// un espolón redondo (medio cilindro sobre la cara de la pila) con su remate en medio cono
function tajamarRedondo(O, ux, uz, nx, nz, r, y0, y1, cap) {
  const t = [], n = 8, P = (a, y, k = 1) => [O[0] + (ux * Math.cos(a) + nx * Math.sin(a)) * r * k, y, O[1] + (uz * Math.cos(a) + nz * Math.sin(a)) * r * k];
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI * i / n, a1 = Math.PI * (i + 1) / n;
    t.push(P(a0, y0), P(a1, y0), P(a1, y1), P(a0, y0), P(a1, y1), P(a0, y1));
    t.push(P(a0, y1), P(a1, y1), [O[0], y1 + cap, O[1]]);
  }
  return malla(t, [O[0] + nx * r * 0.4, (y0 + y1) / 2, O[1] + nz * r * 0.4]);
}
// la curva de un arco: de u = −1 (arranque de a) a 1 (arranque de b), la altura sobre el arranque
const curva = (u, half) => Math.sqrt(Math.max(0, 1 - u * u)) * half;

/**
 * Levanta lo que va debajo del tablero (los muros de los costados con sus arcos y sus ojos, las bóvedas, las dovelas, las
 * pilas con sus tajamares) y la cornisa. ctx: { eje, deck, L, Wd, off, prisma, rios, terrainHeight, riverInfo, yBot }.
 */
export function levantaFamoso(B, F, plan, ctx) {
  const { eje, deck, L, Wd, off, prisma, rios, terrainHeight, riverInfo } = ctx;
  const piedra = F.piedra, sillar = F.sillar, yBot = ctx.yBot;
  // de qué lado viene el agua: el río más cercano al centro del arco grande, en el sentido en que baja su nivel
  const g = plan.arcos.find(a => a.grande), eg = eje(g.c);
  let fx = 0, fz = 0, bd = 1e9;
  for (const R of rios) for (let i = 0; i < R.pts.length - 1; i++) {
    const a = R.pts[i], b = R.pts[i + 1], vx = b[0] - a[0], vz = b[1] - a[1], l2 = vx * vx + vz * vz || 1, t = clamp(((eg.x - a[0]) * vx + (eg.z - a[1]) * vz) / l2, 0, 1), d = Math.hypot(eg.x - a[0] - vx * t, eg.z - a[1] - vz * t);
    if (d < bd) { bd = d; const sg = (R.lv[i] ?? 0) >= (R.lv[i + 1] ?? 0) ? 1 : -1; fx = vx * sg; fz = vz * sg; }
  }
  const arriba = fx * eg.nx + fz * eg.nz > 0 ? -1 : 1;   // (el lado de la normal por donde llega la corriente)
  // ojos de aliviadero en las pilas (los del de Puente la Reina): sobre el tajamar, donde cabe uno con aire por encima
  const ojos = [];
  for (const p of plan.pilas) {
    p.top = p.ys + Math.max(0.6, p.alza * 0.42);
    if (!F.aliviaderos) continue;
    const aw = clamp(p.p * 0.5, 1.2, 2.4), y0 = p.top + 0.55, ya = y0 + aw * 0.55, yt = ya + aw / 2;
    if (yt + 0.6 + 0.55 < deck(p.s) && aw < p.p - 1) ojos.push({ s: p.s, h0: p.s - aw / 2, h1: p.s + aw / 2, aw, y0, ya, yt });
  }
  // los muros de los costados (tímpanos): de los cimientos al tablero, con cada arco y cada ojo abiertos; por encima del ojo,
  // el borde de abajo del muro sigue su arquillo, y por debajo, la pila hasta el antepecho del ojo
  const WS = [], W0 = [], push = (s, y) => { WS.push(s); W0.push(y); };
  const tramo = (a, b) => { const n = Math.max(1, Math.ceil((b - a) / 1)); for (let i = 0; i <= n; i++) push(a + (b - a) * i / n, yBot); };
  let s = 0;
  const huecos = [...plan.arcos.map(A => ({ ...A, tipo: 'arco' })), ...ojos.map(o => ({ a: o.h0, b: o.h1, tipo: 'ojo', o }))].sort((x, y) => x.a - y.a);
  for (const h of huecos) {
    if (h.a > s) tramo(s, h.a);
    const ys = h.tipo === 'arco' ? h.ys : h.o.ya, half = (h.b - h.a) / 2, c = (h.a + h.b) / 2, base = h.tipo === 'arco' ? h.ys : h.o.y0;
    push(h.a, yBot); push(h.a, base); if (h.tipo === 'ojo') push(h.a, ys);
    const q = h.tipo === 'arco' ? 24 : 10;
    for (let i = 1; i < q; i++) { const u = -Math.cos(Math.PI * i / q); push(c + u * half, ys + curva(u, half)); }
    if (h.tipo === 'ojo') push(h.b, ys);
    push(h.b, base); push(h.b, yBot);
    s = h.b;
  }
  if (s < L) tramo(s, L);
  const W1 = WS.map(v => deck(v) - 0.05);   // (hasta el pretil: tapan el canto del empedrado)
  for (const side of [-1, 1]) prisma(B, piedra, WS, W0, W1, side * off - 0.25, side * off + 0.25, 2.2, eje);
  // (bajo cada ojo, la pila maciza hasta el antepecho, por los dos lados)
  for (const o of ojos) for (const side of [-1, 1]) prisma(B, piedra, [o.h0, o.h1], [yBot, yBot], [o.y0, o.y0], side * off - 0.25, side * off + 0.25, 2.2, eje);
  // (y las puntas, cerradas entre muro y muro)
  for (const sp of [0.2, L - 0.2]) { const e = eje(sp), top = deck(sp) - 0.55, h = top - yBot; if (h > 0.2) B.add(piedra, box(Wd - 1.0, h, 0.4, 2), M(e.x, yBot + h / 2, e.z, Math.atan2(e.dx, e.dz))); }
  // la bóveda de cada arco y de cada ojo, por dentro (se ve al pasar por debajo o al mirar por el ojo)
  const boveda = (c, half, ys, ancho, q) => {
    for (let i = 0; i < q; i++) {
      const u0 = -Math.cos(Math.PI * i / q), u1 = -Math.cos(Math.PI * (i + 1) / q), s0 = c + u0 * half, s1 = c + u1 * half, y0 = ys + curva(u0, half), y1 = ys + curva(u1, half);
      const e = eje((s0 + s1) / 2), l = Math.hypot(s1 - s0, y1 - y0);
      B.add(sillar, box(ancho, 0.3, l + 0.06, 2), M(e.x, (y0 + y1) / 2 + 0.15, e.z, Math.atan2(e.dx, e.dz), -Math.atan2(y1 - y0, s1 - s0)), 1);
    }
  };
  for (const A of plan.arcos) boveda(A.c, A.sp / 2, A.ys, Wd - 0.7, 16);
  for (const o of ojos) {
    boveda(o.s, o.aw / 2, o.ya, Wd - 0.7, 8);
    const e = eje(o.s), ry = Math.atan2(e.dx, e.dz);
    B.add(sillar, box(Wd - 0.6, 0.25, o.aw + 0.1, 2), M(e.x, o.y0 - 0.12, e.z, ry), 1);   // (el antepecho)
    for (const sj of [o.h0, o.h1]) { const ej = eje(sj); B.add(piedra, box(Wd - 0.7, o.ya - o.y0, 0.3, 2), M(ej.x, (o.y0 + o.ya) / 2, ej.z, ry), 1); }
  }
  // las dovelas: la rosca de cada arco por las dos caras, de sillería, un dedo más afuera que el muro
  const dovelas = (c, half, ys, t, dmin) => {
    const n = Math.max(7, Math.round(Math.PI * (half + t / 2) / dmin)) | 1;
    for (const side of [-1, 1]) for (let i = 0; i < n; i++) {
      const th = Math.PI * (i + 0.5) / n, r = half + t / 2, sd = c - Math.cos(th) * r, y = ys + Math.sin(th) * r;
      const e = eje(sd), o = side * (off + 0.27), len = Math.PI * r / n - 0.035, tt = t * (i % 2 ? 1 : 0.86);
      B.add(sillar, box(0.1, tt, len, 1.2), M(e.x + e.nx * o, y, e.z + e.nz * o, Math.atan2(e.dx, e.dz), Math.atan2(-Math.cos(th), Math.sin(th))), 1);
    }
  };
  for (const A of plan.arcos) dovelas(A.c, A.sp / 2, A.ys, rosca(A.sp), 0.62);
  for (const o of ojos) dovelas(o.s, o.aw / 2, o.ya, 0.42, 0.45);
  // la cornisa: una imposta corrida por las dos caras, a la altura del tablero, que vuela un poco
  const S = []; for (let k = 0; k <= Math.ceil(L); k++) S.push(Math.min(L, k));
  const D0 = S.map(v => deck(v) - 0.36), D1 = S.map(v => deck(v) - 0.16);
  for (const side of [-1, 1]) prisma(B, sillar, S, D0, D1, side > 0 ? off + 0.2 : -off - 0.36, side > 0 ? off + 0.36 : -off - 0.2, 1.2, eje);
  // las pilas: tajamar contra la corriente y espolón aguas abajo, de los cimientos a un tercio del arco, con su sombrerete
  for (const p of plan.pilas) {
    const e = eje(p.s), bed = Math.min(terrainHeight(e.x, e.z), riverInfo(e.x, e.z).edge < 0 ? riverInfo(e.x, e.z).level - 0.8 : Infinity) - 0.5;
    const suelo = Math.max(terrainHeight(e.x + e.nx * (Wd / 2 + 1), e.z + e.nz * (Wd / 2 + 1)), terrainHeight(e.x - e.nx * (Wd / 2 + 1), e.z - e.nz * (Wd / 2 + 1)));
    if (p.top < suelo + 0.4) continue;   // (enterrada en la orilla: no asoma)
    for (const lado of [arriba, -arriba]) {
      const forma = lado === arriba ? F.tajamar.arriba : F.tajamar.abajo, o = lado * (off + 0.25), half = p.p / 2 - 0.05;
      const A = [e.x - e.dx * half + e.nx * o, e.z - e.dz * half + e.nz * o], Bp = [e.x + e.dx * half + e.nx * o, e.z + e.dz * half + e.nz * o];
      const top = lado === arriba ? p.top : p.top - 0.5;
      if (forma === 'redondo') B.add(piedra, tajamarRedondo([e.x + e.nx * o, e.z + e.nz * o], e.dx, e.dz, e.nx * lado, e.nz * lado, half, bed, top, half * 0.7), null, 1);
      else { const v = p.p * F.tajamar.vuelo * (lado === arriba ? 1 : 0.7), C = [e.x + e.nx * (o + lado * v), e.z + e.nz * (o + lado * v)]; B.add(piedra, tajamarTri(A, Bp, C, bed, top, Math.min(1.6, v * 0.75)), null, 1); }
    }
  }
}
