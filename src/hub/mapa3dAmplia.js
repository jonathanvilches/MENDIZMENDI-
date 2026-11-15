// La isla con sus montes enteros (15 de noviembre de 2026). El autor: «los montes que no coincidan o que coincidan justo
// en el corte, tú hazlos completos. Todo el borde, si coincide que hay montañas, tú completa las montañas. No pasa nada que
// se repitan o que estén en una comarca o en otra». Hasta entonces la isla era la comarca justa: donde la muga pasaba por
// un monte, la orilla lo bajaba hasta el borde y quedaba medio monte. Ahora, donde el borde cae en monte, la isla crece
// hacia fuera hasta que ese monte baja a su valle: con el relieve de la comarca vecina, que sale en las dos (la del mapa se
// queda como estaba), y fuera de Navarra con el monte de verdad: desde la noche del 15, el relieve del mapa llega unos
// 12 km más allá de la muga (tools/relieve/alrededor.mjs), y el autor: «no te dejes ningún monte de los Pirineos nevado; no
// me importa que coja montes de provincias, localidades o países limítrofes». Hasta entonces, fuera de Navarra no había
// datos y se ponía el lado de dentro en un espejo. La isla crece hasta el fondo del valle de verdad, y solo junto a su
// borde lo añadido baja al pie, para acabar en tierra baja. Donde salen o entran los ríos no crece: sus cascadas siguen
// en su sitio.
import { enPoligono } from './mapa3dFormas.js';

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const PASO = 0.25;   // (un punto del borde cada cuarto de unidad, medio kilómetro)

/** El borde, con un punto cada `paso` a lo largo. */
function muestras(P, paso) {
  const L = [0]; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; L.push(L[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const tot = L[P.length], n = Math.max(24, Math.round(tot / paso)), out = []; let j = 0;
  for (let k = 0; k < n; k++) { const s = tot * k / n; while (L[j + 1] < s) j++; const a = P[j], b = P[(j + 1) % P.length], f = (s - L[j]) / ((L[j + 1] - L[j]) || 1); out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]); }
  return out;
}
/** El primer cruce de dos lados de un contorno (los de al lado no cuentan): [i, j, x, z], o null. */
function cruce(Q) {
  const n = Q.length, cr = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const bx = Q.map((p, i) => { const q = Q[(i + 1) % n]; return [Math.min(p[0], q[0]), Math.max(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[1], q[1])]; });
  for (let i = 0; i < n; i++) { const a = Q[i], b = Q[(i + 1) % n], A = bx[i];
    for (let j = i + 2; j < n; j++) { if (i === 0 && j === n - 1) continue; const B = bx[j]; if (A[1] < B[0] || B[1] < A[0] || A[3] < B[2] || B[3] < A[2]) continue;
      const c = Q[j], d = Q[(j + 1) % n], d1 = cr(a, b, c), d2 = cr(a, b, d), d3 = cr(c, d, a), d4 = cr(c, d, b);
      if (((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0))) { const t = d1 / (d1 - d2); return [i, j, c[0] + (d[0] - c[0]) * t, c[1] + (d[1] - c[1]) * t]; } } }
  return null;
}
/** Sin cruces: donde el borde crecido se cruza consigo mismo (en los rincones hacia dentro, los puntos que salen se
 *  juntan; o dos lóbulos que se tocan al otro lado de una ensenada), se queda la vuelta de fuera, la más larga, y el
 *  lazo de dentro se quita. */
function desenreda(Q) {
  for (let it = 0; it < 400; it++) {
    const x = cruce(Q); if (!x) return Q;
    const [i, j, cx, cz] = x, n = Q.length, dentro = j - i;
    Q = dentro <= n - dentro ? [...Q.slice(0, i + 1), [cx, cz], ...Q.slice(j + 1)] : [[cx, cz], ...Q.slice(i + 1, j + 1)];
    if (Q.length < 8) return null;
  }
  return null;
}

/** P: el contorno de la comarca; alto(x, z): su relieve (también alrededor de Navarra); navarra(x, z): si un punto cae en
 *  Navarra; evita: puntos [x, z] del borde donde la isla no crece (los ríos que salen y entran).
 *  Devuelve { amplia, P: el contorno de la isla, alto(x, z): su relieve, fuente(x, z) → [x, z, k]: de dónde sale lo
 *  demás de un punto añadido (el bosque) y cuánto queda de ello; fino(x, z), lo mismo para el relieve fino, amp(x, z): 0 en la comarca y 1 donde el
 *  relieve ya no es el del mapa (allí la luz sale de la propia malla) }. */
export function islaAmpliada(P, alto, { navarra = () => true, evita = [] } = {}) {
  const B = muestras(P, PASO), n = B.length;
  let cx = 0, cz = 0; for (const [x, z] of B) { cx += x / n; cz += z / n; }
  let rMed = 0; for (const [x, z] of B) rMed += Math.hypot(x - cx, z - cz) / n;
  // (hasta dónde puede crecer: dos quintos de lo que mide, entre 1,6 y 5 unidades, de 3 a 10 km; el margen del relieve
  // alrededor de Navarra es de 6)
  const M = Math.min(5, Math.max(1.6, rMed * 0.4));
  // (la normal hacia fuera de cada punto, de sus vecinos a dos pasos)
  const NO = B.map((q, i) => { const a = B[(i + n - 2) % n], b = B[(i + 2) % n]; let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; let nx = tz / l, nz = -tx / l;
    if (enPoligono(P, q[0] + nx * 0.06, q[1] + nz * 0.06)) { nx = -nx; nz = -nz; } return [nx, nz]; });
  // (el pie de los montes junto a cada punto: lo bajo de lo que hay alrededor, a tres unidades, el 12 % más bajo, el fondo
  // de los valles; de punto a punto, suave. Con menos, en los macizos del Pirineo el pie quedaba a media ladera y la muga
  // con Francia no crecía)
  const BASE = new Float32Array(n);
  for (let i = 0; i < n; i += 2) { const [qx, qz] = B[i], hs = [];
    for (let dx = -3; dx <= 3.001; dx += 0.4) for (let dz = -3; dz <= 3.001; dz += 0.4) { if (dx * dx + dz * dz > 9) continue; hs.push(alto(qx + dx, qz + dz)); }
    hs.sort((a, b) => a - b); BASE[i] = hs.length ? hs[Math.floor(hs.length * 0.12)] : alto(qx, qz); }
  for (let i = 1; i < n; i += 2) BASE[i] = (BASE[i - 1] + BASE[(i + 1) % n]) / 2;
  const base = Float32Array.from(BASE, (_, i) => { let s = 0; for (let d = -6; d <= 6; d++) s += BASE[(i + d + n) % n]; return s / 13; });
  // (lo alto del monte en el borde: en la muga de Navarra, en el último cuadro de la rejilla los datos ya bajan a cero, y
  // se mira también algo más dentro)
  const HQ = B.map(([x, z], i) => Math.max(alto(x, z), alto(x - NO[i][0] * 0.3, z - NO[i][1] * 0.3)));
  const RELMIN = 0.3;   // (el monte del borde ha de subir al menos unos 90 m sobre su pie)
  // (por cada punto, hacia fuera, sobre el relieve de verdad: mientras el monte siga por encima de su pie, la isla crece,
  // hasta casi el fondo del valle; para antes si vuelve a entrar en la comarca. tapa: si llegó al tope sin bajar)
  const ext0 = new Float32Array(n), tope = new Float32Array(n).fill(M), tapa = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const [qx, qz] = B[i], [nx, nz] = NO[i], rel = HQ[i] - base[i];
    for (let d = 0.2; d <= M + 0.01; d += 0.1) if (enPoligono(P, qx + nx * d, qz + nz * d)) { tope[i] = d * 0.45; break; }
    if (rel < RELMIN) continue;
    let e = 0, baja = false;
    for (let d = 0.1; d <= tope[i] + 0.001; d += 0.1) { if (alto(qx + nx * d, qz + nz * d) - base[i] < (0.15 + 0.2 * d / M) * rel) { baja = true; break; } e = d; }
    ext0[i] = e; tapa[i] = !baja && e >= M - 0.15 ? 1 : 0;
  }
  // (donde salen o entran los ríos, nada)
  const lejosRio = B.map(([x, z]) => { let m = 1e9; for (const [ex, ez] of evita) m = Math.min(m, Math.hypot(ex - x, ez - z)); return ss(0.5, 1.3, m); });
  // (redondeado: cada punto, lo más de sus vecinos cercanos, y luego suave, para que salgan lóbulos y no dientes)
  const dil = Float32Array.from(ext0, (_, i) => { let m = 0; for (let d = -3; d <= 3; d++) m = Math.max(m, ext0[(i + d + n) % n] * lejosRio[(i + d + n) % n]); return m; });
  const W = 8, ext = Float32Array.from(dil, (_, i) => { let s = 0, w = 0; for (let d = -W; d <= W; d++) { const k = W + 1 - Math.abs(d); s += dil[(i + d + n) % n] * k; w += k; } return Math.min(tope[i], s / w * lejosRio[i]); });
  let max = 0; for (const e of ext) max = Math.max(max, e);
  // (lo que crece de verdad junto a cada punto, algo ensanchado: lo añadido baja hasta el pie justo al llegar al borde de la
  // isla. Si bajaba por su cuenta, a veces aún iba alto al acabar la isla y la orilla lo cortaba en un escalón)
  const extL = Float32Array.from(ext, (_, i) => { let m = 0; for (let d = -6; d <= 6; d++) m = Math.max(m, ext[(i + d + n) % n]); return Math.max(0.15, m); });
  const tapaL = Float32Array.from(tapa, (_, i) => { let s = 0; for (let d = -8; d <= 8; d++) s += tapa[(i + d + n) % n]; return s / 17; });
  const nada = { amplia: false, P, alto, fuente: (x, z) => [x, z, 1], amp: () => 0 };
  if (max < 0.25) return nada;
  // (el contorno de la isla: cada punto, hacia fuera lo que crece, sin cruces)
  const Pi = desenreda(B.map(([x, z], i) => [x + NO[i][0] * ext[i], z + NO[i][1] * ext[i]]));
  if (!Pi) return nada;

  // ---------- el relieve de la isla en cualquier punto ----------
  // (dentro de la comarca, el de siempre; fuera, el del punto del borde más cercano, que baja hacia el pie con la distancia.
  // Para ir deprisa: qué cuadros caen dentro, en una rejilla de 0,1, y los puntos del borde, por cubos de media unidad)
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of Pi) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  x0 -= 0.5; z0 -= 0.5; x1 += 0.5; z1 += 0.5;
  const h = 0.1, gw = Math.ceil((x1 - x0) / h) + 1, gh = Math.ceil((z1 - z0) / h) + 1, IN = new Uint8Array(gw * gh), cortes = [];
  for (let j = 0; j < gh; j++) { const z = z0 + (j + 0.5) * h; cortes.length = 0;
    for (let a = 0, b = P.length - 1; a < P.length; b = a++) { const pa = P[a], pb = P[b]; if ((pa[1] > z) !== (pb[1] > z)) cortes.push(pa[0] + (pb[0] - pa[0]) * (z - pa[1]) / (pb[1] - pa[1])); }
    cortes.sort((u, w) => u - w);
    for (let k = 0; k + 1 < cortes.length; k += 2) for (let i = Math.max(0, Math.ceil((cortes[k] - x0) / h - 0.5)), i1 = Math.min(gw - 1, Math.floor((cortes[k + 1] - x0) / h - 0.5)); i <= i1; i++) IN[j * gw + i] = 1; }
  const dentro = (x, z) => {
    const i = Math.floor((x - x0) / h), j = Math.floor((z - z0) / h);
    if (i < 1 || j < 1 || i >= gw - 1 || j >= gh - 1) return enPoligono(P, x, z);
    const k = j * gw + i, v = IN[k];
    if (IN[k - 1] === v && IN[k + 1] === v && IN[k - gw] === v && IN[k + gw] === v && IN[k - gw - 1] === v && IN[k - gw + 1] === v && IN[k + gw - 1] === v && IN[k + gw + 1] === v) return v === 1;
    return enPoligono(P, x, z);
  };
  const CU = 0.5, cw = Math.ceil((x1 - x0) / CU) + 1, ch = Math.ceil((z1 - z0) / CU) + 1, cubo = Array.from({ length: cw * ch }, () => []);
  B.forEach(([x, z], i) => { const a = Math.floor((x - x0) / CU), b = Math.floor((z - z0) / CU); if (a >= 0 && b >= 0 && a < cw && b < ch) cubo[b * cw + a].push(i); });
  // (el punto del lado más cercano del borde: su índice, la distancia y dónde cae a lo largo del lado, para mezclar el pie)
  const cerca = (x, z) => {
    const a0 = Math.floor((x - x0) / CU), b0 = Math.floor((z - z0) / CU); let bi = -1, bd = 1e9;
    for (let r = 0; r < Math.max(cw, ch); r++) {
      if (bi >= 0 && (r - 1) * CU > Math.sqrt(bd)) break;
      for (let b = b0 - r; b <= b0 + r; b++) for (let a = a0 - r; a <= a0 + r; a++) {
        if (Math.max(Math.abs(a - a0), Math.abs(b - b0)) !== r || a < 0 || b < 0 || a >= cw || b >= ch) continue;
        for (const i of cubo[b * cw + a]) { const d = (B[i][0] - x) ** 2 + (B[i][1] - z) ** 2; if (d < bd) { bd = d; bi = i; } }
      }
    }
    // (entre el punto más cercano y el de al lado que esté más cerca: el lado de verdad)
    const i = bi, j1 = (i + 1) % n, j0 = (i + n - 1) % n, j = (B[j1][0] - x) ** 2 + (B[j1][1] - z) ** 2 < (B[j0][0] - x) ** 2 + (B[j0][1] - z) ** 2 ? j1 : j0;
    const ax = B[i][0], az = B[i][1], dx = B[j][0] - ax, dz = B[j][1] - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1e-9)));
    return { i, j, t, d: Math.hypot(ax + dx * t - x, az + dz * t - z) };
  };
  // (lo añadido es el relieve de verdad; solo junto al borde de la isla baja hasta el pie: en el último quinto de lo que
  // crece, o en la mitad si el monte no llegó a bajar antes del tope)
  const fuera = (x, z) => { const c = cerca(x, z), b = base[c.i] * (1 - c.t) + base[c.j] * c.t, e = extL[c.i] * (1 - c.t) + extL[c.j] * c.t, tp = tapaL[c.i] * (1 - c.t) + tapaL[c.j] * c.t;
    return { b, k: 1 - ss(e * (0.8 - 0.3 * tp), e, c.d), nav: navarra(x, z), d: c.d, sx: x, sz: z }; };
  const altoI = (x, z) => { if (dentro(x, z)) return alto(x, z); const f = fuera(x, z); return f.b + (alto(x, z) - f.b) * f.k; };
  const fuente = (x, z) => { if (dentro(x, z)) return [x, z, 1]; const f = fuera(x, z); return [x, z, f.k]; };
  // (la luz de la malla: donde el relieve ha bajado al pie, y fuera de Navarra, donde el sombreado del mapa no llega)
  const ampDe = (f) => f.nav ? ss(0.05, 0.4, 1 - f.k) : ss(0, 0.4, f.d);
  const amp = (x, z) => dentro(x, z) ? 0 : ampDe(fuera(x, z));
  // (el relieve fino de un punto añadido: el suyo, que también llega alrededor de Navarra; se va junto al borde con el
  // grueso y algo antes, que sobre el monte ya bajado sus crestas quedaban como pinchos bajo un velo)
  const fino = (x, z) => { if (dentro(x, z)) return [x, z, 1]; const f = fuera(x, z); return [x, z, f.k * f.k]; };
  let a0 = 0, a1 = 0; for (let i = 0; i < n; i++) { const p = B[i], q = B[(i + 1) % n]; a0 += p[0] * q[1] - q[0] * p[1]; }
  for (let i = 0; i < Pi.length; i++) { const r = Pi[i], s = Pi[(i + 1) % Pi.length]; a1 += r[0] * s[1] - s[0] * r[1]; }
  return { amplia: true, P: Pi, alto: altoI, fuente, fino, amp, M, crece: Math.abs(a1 / a0) - 1, max };
}
