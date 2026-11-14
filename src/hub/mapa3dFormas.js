// El mapa 3D del inicio (hub/mapa3d.js), las formas: el contorno de cada comarca, el relieve de verdad y la losa de
// cada comarca con sus paredes y su panza. Sin dibujar nada: solo cuentas y geometrías.
import * as THREE from 'three';
import { MAPA_RELIEVE, MAPA_ALTURAS } from '../data/mapa-relieve.js';
import ENCAJE from '../data/comarcas-encaje.json';
import { CENTROS } from '../data/reales/centros.js';
import { mapaXY } from '../util/geo.js';

// (las coordenadas son las del mapa de comarcas de comarcas.json, viewBox 10 10 725 780: se centran y se pasan a metros
// del mundo 3D, con el norte hacia el fondo)
export const CX = 372, CY = 400, S = 0.1;
export const W = (sx, sy) => [(sx - CX) * S, (sy - CY) * S];

// el contorno de cada comarca viene en escalones (de una rejilla): se simplifica y se suaviza para que el borde en 3D sea limpio
function puntos(path) {
  const n = path.match(/-?\d+(\.\d+)?/g).map(Number), P = [];
  for (let i = 0; i + 1 < n.length; i += 2) P.push([n[i], n[i + 1]]);
  return P;
}
function simplifica(P, eps) {
  if (P.length < 4) return P;
  const d = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-9; return Math.abs(dx * (a[1] - p[1]) - (a[0] - p[0]) * dy) / L; };
  const rec = (a, b, out) => { let m = 0, k = -1; for (let i = a + 1; i < b; i++) { const v = d(P[i], P[a], P[b]); if (v > m) { m = v; k = i; } } if (m > eps) { rec(a, k, out); rec(k, b, out); } else out.push(P[a]); };
  const out = []; rec(0, P.length - 1, out); return out;
}
const chaikin = (P) => P.flatMap((p, i) => { const q = P[(i + 1) % P.length]; return [[p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]]; });
// (el de cada comarca, encajado con sus vecinas: cada borde, una sola línea que comparten las dos, sin raya entre ellas;
// tools/comarcas-encaje.mjs. Una comarca que no esté ahí, con el suyo de siempre, suavizado)
export function contorno(c) {
  let P;
  if (ENCAJE[c.id]) P = organico(c.id);
  else { P = puntos(c.path); if (P.length > 2 && P[0][0] === P.at(-1)[0] && P[0][1] === P.at(-1)[1]) P.pop(); P = chaikin(chaikin(simplifica(P, 1.1))); }
  let cx = 0, cy = 0; for (const [x, y] of P) { cx += x; cy += y; } cx /= P.length; cy /= P.length;
  return { P, cx, cy };
}
// ---------- el relieve ----------
// El de verdad (src/data/mapa-relieve.js: SRTM y GMTED2010, una altura cada 600 m), exagerado unas cinco veces para
// que las sierras se lean desde arriba; el detalle de cada ladera lo pone el sombreado fino (EU-DEM de Copernicus)
export const GROSOR = 0.6, EXA = 0.0033;   // (la exageración del relieve: desde noviembre de 2026, algo más, 0,0026 antes)
let ALTS = null;
// (ruido de valores en JS, con un hash de enteros: el mismo en todos los aparatos; y el paso suave de los sombreadores)
const hashV = (i, j) => { let n = (i * 374761393 + j * 668265263) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967295; };
export const ruidoV = (x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return (hashV(i, j) * (1 - u) + hashV(i + 1, j) * u) * (1 - v) + (hashV(i, j + 1) * (1 - u) + hashV(i + 1, j + 1) * u) * v; };
export const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// ---------- las mugas entre comarcas, orgánicas ----------
// Las líneas por las que se rompe el mapa venían de un mapa administrativo simplificado: tramos largos casi rectos, y una
// comarca arrancada con el canto a escuadra no parece tierra. El autor, el 14 de noviembre de 2026: «no hacer tanto borde
// recto: hace que sea poco orgánico». Ahora cada muga entre dos comarcas se tuerce con un campo de ruido: cada punto se
// corre lo que diga el campo en su sitio (tres ondas, de unos 9 km, 3,5 km y 1,5 km, de hasta 1.000, 700 y 230 m). Como lo
// que se corre un punto solo depende de dónde está, las dos comarcas que comparten una muga la tuercen igual, y los puntos
// donde se juntan tres, también: el encaje sigue siendo exacto, pieza con pieza. Los tramos largos se parten antes (cada
// unos 500 m, a partes iguales contadas desde el mismo extremo, para que las dos saquen los mismos puntos).
// No se toca el borde de fuera, el de Navarra, que es el de verdad y ya es irregular: cerca de él el corrimiento se apaga
// (en 2,5 km), y también cerca del centro de un pueblo (de 1,7 a 3,7 km), para que ninguno cambie de comarca ni se quede
// con la muga cruzando sus casas.
const A_ORG = [[42, 5, 11.3, 5.1, 37.9, 62.4], [17, 3.4, 71.7, 33.3, 8.6, 19.2], [7, 1.1, 5.5, 91.2, 55.1, 3.8]];   // (onda, cuánto, y las semillas de x e y; en unidades del mapa: 1 = 207 m)
const campoOrg = (x, y) => { let dx = 0, dy = 0; for (const [L, A, ax, ay, bx, by] of A_ORG) { dx += (ruidoV(x / L + ax, y / L + ay) - 0.5) * 2 * A; dy += (ruidoV(x / L + bx, y / L + by) - 0.5) * 2 * A; } return [dx, dy]; };
const dSeg = (x, y, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(x - ax - dx * t, y - ay - dy * t); };
let ORG = null;
function organico(id) {
  if (!ORG) {
    // (las aristas de fuera: las que solo tiene una comarca; en una rejilla, para medir deprisa lo lejos que queda un punto)
    const kA = (ax, ay, bx, by) => { const p = ax.toFixed(3) + ',' + ay.toFixed(3), q = bx.toFixed(3) + ',' + by.toFixed(3); return p < q ? p + '|' + q : q + '|' + p; };
    const veces = new Map(), todas = [];
    for (const a of Object.values(ENCAJE)) for (let i = 0; i < a.length; i += 2) { const j = (i + 2) % a.length, k = kA(a[i], a[i + 1], a[j], a[j + 1]); veces.set(k, (veces.get(k) || 0) + 1); todas.push([a[i], a[i + 1], a[j], a[j + 1], k]); }
    const CEL = 16, LEJOS = 12, rej = new Map();
    for (const [ax, ay, bx, by, k] of todas) if (veces.get(k) === 1) for (let i = Math.floor((Math.min(ax, bx) - LEJOS) / CEL); i <= Math.floor((Math.max(ax, bx) + LEJOS) / CEL); i++) for (let j = Math.floor((Math.min(ay, by) - LEJOS) / CEL); j <= Math.floor((Math.max(ay, by) + LEJOS) / CEL); j++) { const c = i + ',' + j; (rej.get(c) || rej.set(c, []).get(c)).push([ax, ay, bx, by]); }
    const aFuera = (x, y) => { let d = LEJOS; for (const [ax, ay, bx, by] of rej.get(Math.floor(x / CEL) + ',' + Math.floor(y / CEL)) || []) d = Math.min(d, dSeg(x, y, ax, ay, bx, by)); return d; };
    const pueblos = Object.values(CENTROS).map(c => mapaXY(...c));
    const mueve = (x, y) => { const k = suave(0, LEJOS, aFuera(x, y)); if (k <= 0) return [x, y]; let dp = 1e9; for (const [px, py] of pueblos) dp = Math.min(dp, Math.hypot(x - px, y - py)); const w = k * suave(8, 18, dp); if (w <= 0) return [x, y]; const [dx, dy] = campoOrg(x, y); return [x + dx * w, y + dy * w]; };
    ORG = { veces, kA, mueve, hechas: new Map() };
  }
  if (ORG.hechas.has(id)) return ORG.hechas.get(id);
  const a = ENCAJE[id], P = [], { veces, kA, mueve } = ORG;
  for (let i = 0; i < a.length; i += 2) {
    const j = (i + 2) % a.length, ax = a[i], ay = a[i + 1], bx = a[j], by = a[j + 1];
    P.push(mueve(ax, ay));
    if (veces.get(kA(ax, ay, bx, by)) !== 2) continue;   // (el borde de Navarra, como viene)
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 2.4); if (n < 2) continue;
    // (los puntos de en medio, contados siempre desde el mismo extremo, el menor, para que a las dos comarcas les salgan iguales)
    const alReves = ax > bx || (ax === bx && ay > by), [x0, y0, x1, y1] = alReves ? [bx, by, ax, ay] : [ax, ay, bx, by];
    for (let k = 1; k < n; k++) { const t = (alReves ? n - k : k) / n; P.push(mueve(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)); }
  }
  ORG.hechas.set(id, P); return P;
}
export function hacerRelieve() {
  const R = MAPA_RELIEVE, nx = R.nx;
  // (de cada fila viene solo el tramo que toca Navarra; lo demás, a cero)
  if (!ALTS) { const d = Uint8Array.from(atob(MAPA_ALTURAS), c => c.charCodeAt(0)), F = R.filas; ALTS = new Uint8Array(nx * R.ny); for (let j = 0, o = 0; j < R.ny; o += F[j * 2 + 1], j++) ALTS.set(d.subarray(o, o + F[j * 2 + 1]), j * nx + F[j * 2]); }
  // (los embalses: junto a su orilla, el relieve no pasa del nivel del agua)
  const L = R.lagos.flatMap(l => l.b.map((tr, n) => { const P = []; for (let k = 0; k + 1 < tr.length; k += 2) P.push(W(tr[k], tr[k + 1]));
    return { P, h: l.h[n] * EXA, x0: Math.min(...P.map(p => p[0])), x1: Math.max(...P.map(p => p[0])), z0: Math.min(...P.map(p => p[1])), z1: Math.max(...P.map(p => p[1])) }; }));
  // (de metros del mundo a la rejilla, y la altura de los cuatro puntos de alrededor, mezclada)
  return (x, z) => {
    const gx = Math.max(0, Math.min(nx - 1.001, (x / S + CX - R.x0) / R.paso)), gz = Math.max(0, Math.min(R.ny - 1.001, (z / S + CY - R.y0) / R.paso));
    const i = gx | 0, j = gz | 0, fx = gx - i, fz = gz - j, k = j * nx + i;
    const h = ((ALTS[k] * (1 - fx) + ALTS[k + 1] * fx) * (1 - fz) + (ALTS[k + nx] * (1 - fx) + ALTS[k + nx + 1] * fx) * fz) * R.u * EXA;
    for (const l of L) if (h > l.h && x >= l.x0 && x <= l.x1 && z >= l.z0 && z <= l.z1 && enPoligono(l.P, x, z)) return l.h;
    return h;
  };
}
// (el trozo del contorno que cae dentro de un cuadrado: recortado lado a lado, Sutherland-Hodgman)
function recorte(P, x0, z0, x1, z1) {
  let R = P;
  for (const [dentro, corta] of [[(p) => p[0] >= x0, (a, b) => [x0, a[1] + (b[1] - a[1]) * (x0 - a[0]) / (b[0] - a[0])]], [(p) => p[0] <= x1, (a, b) => [x1, a[1] + (b[1] - a[1]) * (x1 - a[0]) / (b[0] - a[0])]],
    [(p) => p[1] >= z0, (a, b) => [a[0] + (b[0] - a[0]) * (z0 - a[1]) / (b[1] - a[1]), z0]], [(p) => p[1] <= z1, (a, b) => [a[0] + (b[0] - a[0]) * (z1 - a[1]) / (b[1] - a[1]), z1]]]) {
    const S = R; R = []; if (!S.length) break;
    for (let i = 0; i < S.length; i++) { const a = S[(i + S.length - 1) % S.length], b = S[i], ia = dentro(a), ib = dentro(b);
      if (ib) { if (!ia) R.push(corta(a, b)); R.push(b); } else if (ia) R.push(corta(a, b)); }
  }
  return R;
}
// cada comarca, una losa con su relieve: la cara de arriba, una rejilla de cuadrados (los del borde, recortados por el
// contorno) con la altura de cada punto, que comparten vértices para que la luz caiga suave sobre los montes; y las
// paredes, del suelo a esa altura. Grupos: 0 arriba, 1 paredes
export function losa(P, alto, paso) {
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const nx = Math.ceil((x1 - x0) / paso), nz = Math.ceil((z1 - z0) / paso), fila = nx + 1;
  // (qué esquinas de la rejilla caen dentro del contorno: fila a fila, entre los puntos donde la cortan los lados)
  const inn = new Uint8Array(fila * (nz + 1)), cortes = [];
  for (let j = 0; j <= nz; j++) {
    const z = z0 + j * paso; cortes.length = 0;
    for (let a = 0, b = P.length - 1; a < P.length; b = a++) { const pa = P[a], pb = P[b]; if ((pa[1] > z) !== (pb[1] > z)) cortes.push(pa[0] + (pb[0] - pa[0]) * (z - pa[1]) / (pb[1] - pa[1])); }
    cortes.sort((u, w) => u - w);
    for (let k = 0; k + 1 < cortes.length; k += 2) for (let i = Math.max(0, Math.ceil((cortes[k] - x0) / paso)), i1 = Math.min(nx, Math.floor((cortes[k + 1] - x0) / paso)); i <= i1; i++) inn[j * fila + i] = 1;
  }
  // (los vértices: los de la rejilla, por su número; los del borde recortado, por su sitio; así los comparten los cuadrados)
  const pos = [], nodo = new Int32Array(fila * (nz + 1)).fill(-1), clave = new Map(), idx = [];
  const nuevo = (x, z) => { pos.push(x, 0, z); return pos.length / 3 - 1; };
  const nd = (i, j) => { const k = j * fila + i; return nodo[k] >= 0 ? nodo[k] : (nodo[k] = nuevo(x0 + i * paso, z0 + j * paso)); };
  const vid = ([x, z]) => {
    const fi = (x - x0) / paso, fj = (z - z0) / paso, i = Math.round(fi), j = Math.round(fj);
    if (Math.abs(fi - i) < 1e-6 && Math.abs(fj - j) < 1e-6) return nd(i, j);
    const k = Math.round(x * 512) + ',' + Math.round(z * 512); let v = clave.get(k); if (v == null) clave.set(k, v = nuevo(x, z)); return v;
  };
  // (los cuadrados que tienen algún vértice del contorno dentro: esos se recortan aunque sus esquinas caigan dentro)
  const conBorde = new Set(P.map(([x, z]) => Math.floor((x - x0) / paso) + Math.floor((z - z0) / paso) * fila));
  const tri = (a, b, c) => { const ux = b[0] - a[0], uz = b[1] - a[1], wx = c[0] - a[0], wz = c[1] - a[1], cr = uz * wx - ux * wz; if (Math.abs(cr) < 1e-7) return; cr > 0 ? idx.push(vid(a), vid(b), vid(c)) : idx.push(vid(a), vid(c), vid(b)); };
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const n = j * fila + i, dentro = inn[n] + inn[n + 1] + inn[n + fila + 1] + inn[n + fila], borde = conBorde.has(n);
    if (dentro === 4 && !borde) { const a = nd(i, j), b = nd(i + 1, j), c = nd(i + 1, j + 1), d = nd(i, j + 1); idx.push(a, c, b, a, d, c); continue; }
    if (!dentro && !borde) continue;
    const ax = x0 + i * paso, az = z0 + j * paso, R = recorte(P, ax, az, ax + paso, az + paso); if (R.length < 3) continue;
    for (const t of THREE.ShapeUtils.triangulateShape(R.map(([x, z]) => new THREE.Vector2(x, z)), [])) tri(R[t[0]], R[t[1]], R[t[2]]);
  }
  let hmax = 0; const nV = pos.length / 3;
  for (let v = 0; v < pos.length; v += 3) { const h = alto(pos[v], pos[v + 2]); hmax = Math.max(hmax, h); pos[v + 1] = GROSOR + h; }
  const nTop = idx.length, tope = [];   // (en las paredes, la altura de arriba en cada punto: de ahí sale cuánto se apagan hacia abajo)
  for (let v = 0; v < nV; v++) tope.push(pos[v * 3 + 1]);
  for (let i = 0; i < P.length; i++) {
    const j = (i + 1) % P.length, [ax, az] = P[i], [bx, bz] = P[j], ha = GROSOR + alto(ax, az), hb = GROSOR + alto(bx, bz), k = pos.length / 3;
    pos.push(ax, 0, az, bx, 0, bz, bx, hb, bz, ax, ha, az); tope.push(ha, hb, hb, ha);
    idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('tope', new THREE.Float32BufferAttribute(tope, 1)); g.setIndex(idx);
  g.addGroup(0, nTop, 0); g.addGroup(nTop, idx.length - nTop, 1); g.computeVertexNormals(); g.computeBoundingBox();
  // (la sombra de cada ladera, con una luz del noroeste y la pendiente algo más marcada: la que se ve mientras llega la
  // imagen del sombreado fino, y si no llega)
  const nor = g.attributes.normal.array, col = new Float32Array(pos.length).fill(1);
  for (let v = 0; v < nV; v++) {
    const ny = Math.max(0.05, nor[v * 3 + 1]), dx = -nor[v * 3] / ny * 2.6, dz = -nor[v * 3 + 2] / ny * 2.6, luz = Math.max(0, (0.6 * dx + 0.62 + 0.5 * dz) / Math.hypot(dx, 1, dz));
    col[v * 3] = col[v * 3 + 1] = col[v * 3 + 2] = 0.45 + 0.88 * luz;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return { g, hmax, malla: { x0, z0, paso } };
}
// (la panza de una comarca, que solo se ve en la entrada, al despegarse del mapa: como el borde, se estrecha hacia abajo,
// en anillos cada vez más pequeños y hondos, ondulados para que no sea lisa, hasta una punta)
export function panza(P) {
  let cx = 0, cz = 0, r = 0; for (const [x, z] of P) { cx += x / P.length; cz += z / P.length; }
  for (const [x, z] of P) r = Math.max(r, Math.hypot(x - cx, z - cz));
  const ANI = [[1, 0], [0.94, 0.06], [0.78, 0.16], [0.52, 0.28], [0.22, 0.38]], n = P.length, pos = [];
  ANI.forEach(([e, h], k) => P.forEach(([x, z]) => {
    const a = Math.atan2(z - cz, x - cx), o = k ? 1 + 0.09 * Math.sin(a * 5 + k * 1.7) + 0.05 * Math.sin(a * 13 + k * 2.9) : 1;
    pos.push(cx + (x - cx) * e * o, -h * r * (k ? 1 + 0.22 * Math.sin(a * 7 + k) : 1), cz + (z - cz) * e * o);
  }));
  pos.push(cx, -0.48 * r, cz);
  const idx = [], tip = pos.length / 3 - 1, L = (ANI.length - 1) * n;
  for (let k = 0; k + 1 < ANI.length; k++) for (let i = 0; i < n; i++) { const a = k * n + i, b = k * n + (i + 1) % n; idx.push(a, b, b + n, a, b + n, a + n); }
  for (let i = 0; i < n; i++) idx.push(L + i, L + (i + 1) % n, tip);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('tope', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3).fill(GROSOR), 1)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// (un punto y lo que mide a su alrededor, r, dentro del contorno de una comarca: el centro y cuatro puntos a esa distancia)
export const enComarca = (P, x, z, r = 0) => enPoligono(P, x, z) && (!r || (enPoligono(P, x + r, z) && enPoligono(P, x - r, z) && enPoligono(P, x, z + r) && enPoligono(P, x, z - r)));
export const enPoligono = (P, x, z) => { let inn = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inn = !inn; } return inn; };
