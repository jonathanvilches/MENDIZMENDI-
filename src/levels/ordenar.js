// El orden de un pueblo de verdad (src/levels/townReal.js). Los datos de OpenStreetMap traen cada casa como el rectángulo
// mínimo que contiene su planta: en los cascos viejos, con casas en hilera y plantas en L, esos rectángulos se pisan unos
// a otros, se meten en la calle o en el río y algunas puertas dan contra la casa de al lado. Y los puentes son el tramo de
// calle marcado como puente, que a veces se queda corto y acaba dentro del agua, o falta donde una calle cruza una regata.
// Aquí, antes de levantar nada:
//  · las casas junto a una calle se alinean con ella si casi lo están (hasta 20°): la fachada sigue la calle
//  · cada casa se recorta lo justo para dejar libres la calle, el puente, el río y su muro, y la plaza; si casi no queda
//    casa, no se levanta (en los datos, la calle pasaba por debajo: un pasadizo; o era el mercado en mitad de la plaza)
//  · dos casas que se pisan quedan pared con pared: la pequeña se recorta por el lado de la grande, o no se levanta si
//    estaba casi dentro de ella (un patio o un añadido)
//  · la puerta va a la fachada que da a la calle o a la plaza y que tiene sitio delante
//  · los puentes llegan a tierra firme por los dos lados, y donde una calle cruza el agua sin puente se pone uno
// La iglesia, el ayuntamiento, el frontón y las casas de los monumentos no se tocan: las demás se apartan de ellas.
import { segDist, clamp } from '../util/math.js';

const ejes = (h) => { const c = Math.cos(h.ry), s = Math.sin(h.ry); return { ux: c, uz: -s, vx: s, vz: c }; };   // u: a lo ancho (w); v: hacia la puerta (d)
const local = (h, x, z) => { const e = ejes(h), dx = x - h.x, dz = z - h.z; return [dx * e.ux + dz * e.uz, dx * e.vx + dz * e.vz]; };
const dentro = (h, x, z, m = 0) => { const [u, v] = local(h, x, z); return Math.abs(u) < h.w / 2 + m && Math.abs(v) < h.d / 2 + m; };
const radio = (h) => Math.hypot(h.w, h.d) / 2;
const vuelta = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** Lo que hay que recortar de cada lado de la casa para que los puntos del segmento a-b queden a r de sus paredes
 *  (cada punto, del lado que menos cuesta). c: { up, um, vp, vm } (u+, u−, v+, v−), se va acumulando el mayor. */
function recorte(h, a, b, r, c) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 0.5)), hw = h.w / 2, hd = h.d / 2;
  for (let i = 0; i <= n; i++) {
    const [u, v] = local(h, a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n);
    if (Math.abs(u) >= hw + r || Math.abs(v) >= hd + r) continue;
    const k = { up: hw - u + r, um: hw + u + r, vp: hd - v + r, vm: hd + v + r };
    const s = Object.keys(k).reduce((p, q) => (k[q] < k[p] ? q : p));
    c[s] = Math.max(c[s], k[s]);
  }
}
/** Aplica los recortes; false si la casa se queda en nada (menos de 2,6 m de lado o de la mitad de lo que era). */
function recorta(h, c, a0) {
  const w = h.w - c.up - c.um, d = h.d - c.vp - c.vm;
  if (w < 2.6 || d < 2.6 || w * d < a0 * 0.45) return false;
  const e = ejes(h), su = (c.um - c.up) / 2, sv = (c.vm - c.vp) / 2;
  h.x += e.ux * su + e.vx * sv; h.z += e.uz * su + e.vz * sv; h.w = w; h.d = d;
  return true;
}
// separación de dos rectángulos: el eje por el que menos se pisan y cuánto (0 si no se tocan)
function pisan(A, B) {
  let best = null;
  for (const H of [A, B]) {
    const e = ejes(H);
    for (const [ax, az] of [[e.ux, e.uz], [e.vx, e.vz]]) {
      const pr = (R) => { const f = ejes(R), c = R.x * ax + R.z * az, x = R.w / 2 * Math.abs(f.ux * ax + f.uz * az) + R.d / 2 * Math.abs(f.vx * ax + f.vz * az); return [c - x, c + x]; };
      const [a0, a1] = pr(A), [b0, b1] = pr(B), o = Math.min(a1, b1) - Math.max(a0, b0);
      if (o <= 0) return null;
      if (!best || o < best.o) best = { o, ax, az };
    }
  }
  return best;
}

/** Las filas de casas y las manzanas que los datos traen como un solo edificio (en los cascos de la Ribera y la Zona
 *  Media, a menudo una fila de casas adosadas de 100 m es un único contorno, y una manzana con patio, otro): el juego
 *  levantaba ahí una nave de chapa en mitad del pueblo. Se parten en casas de unos 9 m de fachada: una fila estrecha, en
 *  una hilera; una de más de 17 m de fondo, en dos espalda con espalda; una manzana con patio (solo en los cascos de la Zona
 *  Media, la Ribera y las ciudades: en los pueblos de montaña un contorno así es una granja o un colegio), en casas
 *  por los lados que dan a una calle. Solo las que no tienen nombre (un mercado, un colegio o un palacio se quedan como son) y dentro del
 *  casco (a menos de 320 m de la plaza). Devuelve la lista nueva. */
export function partirBloques(casas, { plaza, fijas, urbano, pathQuery }) {
  const out = [];
  const pieza = (b, cx, cz, fx, fz, ancho, fondo) => ({ x: cx, z: cz, w: ancho, d: fondo, ry: Math.atan2(fx, fz), h: b.h, k: 'house', n: null, a: Math.round(ancho * fondo), parte: true });
  // una hilera de n casas a lo largo de (ax, az), con el centro en c y la fachada hacia (fx, fz)
  const hilera = (b, cx, cz, ax, az, largo, fx, fz, fondo) => {
    const n = Math.max(1, Math.round(largo / 9)), a = largo / n;
    for (let i = 0; i < n; i++) { const t = -largo / 2 + a * (i + 0.5); out.push(pieza(b, cx + ax * t, cz + az * t, fx, fz, a - 0.02, fondo)); }
  };
  for (const b of casas) {
    const area = b.w * b.d, largo = Math.max(b.w, b.d), corto = Math.min(b.w, b.d), lleno = (b.a || area) / area;
    if (fijas.has(b) || b.n || !['house', 'industrial', 'school'].includes(b.k) || area < 500 || largo < 26 || Math.hypot(b.x - plaza.x, b.z - plaza.z) > 320) { out.push(b); continue; }
    const e = ejes(b), [Ax, Az, Bx, Bz] = b.w >= b.d ? [e.ux, e.uz, e.vx, e.vz] : [e.vx, e.vz, e.ux, e.uz];   // A: a lo largo; B: de fondo
    // (una fila: alargada, como poco el doble de larga que de fonda; un caserío de 35 × 23 m es una casa sola)
    if (corto <= 32 && lleno >= 0.7 && largo >= Math.max(30, corto * 2)) {
      if (corto <= 17) hilera(b, b.x, b.z, Ax, Az, largo, Bx, Bz, corto);
      else for (const s of [1, -1]) hilera(b, b.x + Bx * s * corto / 4, b.z + Bz * s * corto / 4, Ax, Az, largo, Bx * s, Bz * s, corto / 2 - 0.02);
    } else if (urbano && largo <= 220 && corto > 24 && lleno < 0.8) {
      // (la manzana: casas solo en los lados que dan a una calle; los otros, el fondo de los patios)
      const t = clamp(corto * 0.3, 8, 12), resto = corto - 2 * t, n0 = out.length;
      const calle = (cx, cz, ax, az, l, fx, fz) => { let k = 0, n = 0; for (let u = -l / 2 + 2; u <= l / 2 - 2; u += 4) { n++; const q = pathQuery(cx + ax * u + fx * (t / 2 + 4), cz + az * u + fz * (t / 2 + 4)); if (q.d - q.w < 6) k++; } return n && k / n >= 0.4; };
      for (const s of [1, -1]) { const cx = b.x + Bx * s * (corto / 2 - t / 2), cz = b.z + Bz * s * (corto / 2 - t / 2); if (calle(cx, cz, Ax, Az, largo, Bx * s, Bz * s)) hilera(b, cx, cz, Ax, Az, largo, Bx * s, Bz * s, t); }
      if (resto >= 4) for (const s of [1, -1]) { const cx = b.x + Ax * s * (largo / 2 - t / 2), cz = b.z + Az * s * (largo / 2 - t / 2); if (calle(cx, cz, Bx, Bz, resto, Ax * s, Az * s)) hilera(b, cx, cz, Bx, Bz, resto - 0.04, Ax * s, Az * s, t); }
      if (out.length === n0) out.push(b);   // (sin calle a ningún lado: se queda como está)
    } else out.push(b);
  }
  return out;
}

/** Ordena las casas (las cambia en su sitio y devuelve las que se quedan). o: { calles (con buckets: callesCerca(x, z)),
 *  rios, puentes, riverInfo, pathQuery, plazaMask, fijas (Set de casas que no se tocan) }. */
export function ordenarCasas(casas, o) {
  const { callesCerca, rios, puentes, riverInfo, pathQuery, plazaMask, fijas } = o;
  const libre = (h) => !fijas.has(h);
  const urbana = (c) => c.type !== 'trail' || c.cls === 'footway' || c.cls === 'pedestrian' || c.cls === 'steps';
  const rCalle = (c) => c.cls === 'service' ? Math.max(1.1, c.w * 0.65) : c.type === 'trail' ? Math.max(0.9, c.w * 0.7) : Math.max(1.3, c.w * 0.8);
  const quedan = new Set(casas);
  // 1) la fachada con la calle: si la casa está junto a una calle y casi alineada con ella, del todo
  for (const h of casas) {
    if (!libre(h) || h.k === 'shed' || h.k === 'industrial') continue;
    let best = null, bd = 1e9;
    for (const s of callesCerca(h.x, h.z) || []) {
      if (!urbana(s.L)) continue;
      const r = segDist(h.x, h.z, s.a[0], s.a[1], s.b[0], s.b[1]), d = r.d - Math.min(h.w, h.d) / 2 - s.L.w;
      if (d < bd) { bd = d; best = s; }
    }
    if (!best || bd > 5) continue;
    const t = Math.atan2(best.b[0] - best.a[0], best.b[1] - best.a[1]), q = Math.PI / 2;
    const dlt = vuelta(t - h.ry), dq = dlt - Math.round(dlt / q) * q;
    if (Math.abs(dq) < 0.35) h.ry = vuelta(h.ry + dq);
  }
  // 2) libres la calle, el puente y el río (con su muro)
  for (const h of casas) {
    if (!libre(h)) continue;
    const c = { up: 0, um: 0, vp: 0, vm: 0 }, a0 = h.w * h.d, R = radio(h);
    for (const s of callesCerca(h.x, h.z) || []) {
      if (!urbana(s.L)) continue;
      const r = rCalle(s.L); if (segDist(h.x, h.z, s.a[0], s.a[1], s.b[0], s.b[1]).d > R + r) continue;
      recorte(h, s.a, s.b, r, c);
    }
    for (const P of puentes) {
      if (!P.hecho) continue;
      for (let i = 0; i < P.pts.length - 1; i++) { const a = P.pts[i], b = P.pts[i + 1]; if (segDist(h.x, h.z, a[0], a[1], b[0], b[1]).d < R + P.w + 1.2) recorte(h, a, b, P.w + 1.1, c); }
    }
    for (const L of rios) {
      const bb = L.bb ||= L.pts.reduce((b, [x, z]) => [Math.min(b[0], x), Math.max(b[1], x), Math.min(b[2], z), Math.max(b[3], z)], [1e9, -1e9, 1e9, -1e9]), m = R + L.half + 1.2;
      if (h.x < bb[0] - m || h.x > bb[1] + m || h.z < bb[2] - m || h.z > bb[3] + m) continue;
      for (let i = 0; i < L.pts.length - 1; i++) { if (L.cubierto?.[i] && L.cubierto[i + 1]) continue; const a = L.pts[i], b = L.pts[i + 1], hf = L.hv ? Math.max(L.hv[i], L.hv[i + 1]) : L.half; if (segDist(h.x, h.z, a[0], a[1], b[0], b[1]).d < R + hf + 1.2) recorte(h, a, b, hf + 1.0, c); }
    }
    if ((c.up || c.um || c.vp || c.vm) && !recorta(h, c, a0)) { quedan.delete(h); continue; }
    // la plaza, libre: la casa que tiene el centro dentro no se levanta; la que entra un poco, se recorta por ese lado
    if (plazaMask(h.x, h.z) > 0.5) { quedan.delete(h); continue; }
    const e = ejes(h), p = { up: 0, um: 0, vp: 0, vm: 0 };
    for (const [k, ax, az, mitad, lado] of [['up', e.ux, e.uz, () => h.w / 2, () => h.d / 2], ['um', -e.ux, -e.uz, () => h.w / 2, () => h.d / 2], ['vp', e.vx, e.vz, () => h.d / 2, () => h.w / 2], ['vm', -e.vx, -e.vz, () => h.d / 2, () => h.w / 2]]) {
      const bx = k[0] === 'u' ? e.vx : e.ux, bz = k[0] === 'u' ? e.vz : e.uz;
      const fuera = (m) => [-0.8, 0, 0.8].every(f => plazaMask(h.x + ax * m + bx * lado() * f, h.z + az * m + bz * lado() * f) < 0.5);
      for (let m = mitad(); !fuera(m) && p[k] < mitad(); m -= 0.5) p[k] += 0.5;
    }
    if ((p.up || p.um || p.vp || p.vm) && !recorta(h, p, a0)) quedan.delete(h);
  }
  // 3) pared con pared: la pequeña se recorta por el lado de la grande (dos pasadas, por si al recortar toca otra)
  const lista = () => [...quedan];
  for (let pasada = 0; pasada < 2; pasada++) {
    const L = lista(), CEL = 20, g = new Map();
    for (const h of L) { const k = Math.floor(h.x / CEL) * 4096 + Math.floor(h.z / CEL); let a = g.get(k); if (!a) g.set(k, a = []); a.push(h); }
    for (const A of L) {
      if (!quedan.has(A)) continue;
      const i0 = Math.floor(A.x / CEL), j0 = Math.floor(A.z / CEL);
      for (let i = i0 - 2; i <= i0 + 2; i++) for (let j = j0 - 2; j <= j0 + 2; j++) for (const B of g.get(i * 4096 + j) || []) {
        if (B === A || !quedan.has(B) || !quedan.has(A) || Math.hypot(A.x - B.x, A.z - B.z) > radio(A) + radio(B)) continue;
        const p = pisan(A, B); if (!p || p.o < 0.25) continue;
        // (se recorta la que se puede tocar y, de las dos, la más pequeña)
        let [G, S] = A.w * A.d >= B.w * B.d ? [A, B] : [B, A];
        if (!libre(S)) [G, S] = [S, G];
        if (!libre(S)) continue;
        const e = ejes(S), du = e.ux * p.ax + e.uz * p.az, dv = e.vx * p.ax + e.vz * p.az, porU = Math.abs(du) >= Math.abs(dv);
        const cos = Math.max(0.35, Math.abs(porU ? du : dv)), corte = p.o / cos + 0.05, lado = porU ? S.w : S.d;
        if (corte > lado * 0.55) { quedan.delete(S); continue; }
        const hacia = (G.x - S.x) * (porU ? e.ux : e.vx) + (G.z - S.z) * (porU ? e.uz : e.vz) > 0;
        const c = { up: 0, um: 0, vp: 0, vm: 0 }; c[(porU ? 'u' : 'v') + (hacia ? 'p' : 'm')] = corte;
        if (!recorta(S, c, S.w * S.d)) quedan.delete(S);
      }
    }
  }
  // 4) la puerta, a la fachada con sitio delante que da a la calle o a la plaza (la de los datos, si vale)
  const L = lista(), CEL = 24, rej = new Map();
  for (const o of L) { const k = Math.floor(o.x / CEL) * 4096 + Math.floor(o.z / CEL); let a = rej.get(k); if (!a) rej.set(k, a = []); a.push(o); }
  const vecinas = (x, z) => { const i0 = Math.floor(x / CEL), j0 = Math.floor(z / CEL), out = []; for (let i = i0 - 2; i <= i0 + 2; i++) for (let j = j0 - 2; j <= j0 + 2; j++) { const a = rej.get(i * 4096 + j); if (a) out.push(...a); } return out; };
  const tapa = (x, z, yo) => vecinas(x, z).some(o => o !== yo && Math.abs(o.x - x) < radio(o) + 1 && Math.abs(o.z - z) < radio(o) + 1 && dentro(o, x, z, 0.2))
    || riverInfo(x, z).edge < 0.6 || puentes.some(P => P.hecho && P.pts.some((q, i) => i < P.pts.length - 1 && segDist(x, z, q[0], q[1], P.pts[i + 1][0], P.pts[i + 1][1]).d < P.w + 0.8));
  for (const h of L) {
    if (!libre(h) || h.k === 'shed' || h.k === 'industrial') continue;
    let best = 0, bs = 1e9;
    for (let k = 0; k < 4; k++) {
      const ry = h.ry + k * Math.PI / 2, d = k % 2 ? h.w : h.d, fachada = k % 2 ? h.d : h.w;
      const x = h.x + Math.sin(ry) * (d / 2 + 1.1), z = h.z + Math.cos(ry) * (d / 2 + 1.1);
      const pq = pathQuery(x, z), calle = plazaMask(x, z) > 0.5 ? 0 : clamp(pq.d - pq.w, 0, 30);
      const s = (tapa(x, z, h) ? 100 : 0) + calle + (k ? 0.8 : 0) + (fachada < 3.2 ? 3 : 0);
      if (s < bs) { bs = s; best = k; }
    }
    if (best) { h.ry = vuelta(h.ry + best * Math.PI / 2); if (best % 2) [h.w, h.d] = [h.d, h.w]; }
  }
  return L;
}

/** Los puentes: los que cruzan agua llegan a tierra firme por los dos lados, y donde una calle cruza el agua sin puente
 *  se pone uno. Devuelve la lista nueva (con hecho: si se levanta) sin tocar la de los datos. */
export function ordenarPuentes(puentes, calles, riverInfo, rios = []) {
  const moja = (x, z) => riverInfo(x, z).edge < 0.5;
  const out = puentes.map(P => ({ ...P, pts: P.pts.map(q => q.slice()) }));
  const mojado = (P) => { for (let i = 0; i < P.pts.length - 1; i++) for (let t = 0; t <= 1; t += 0.125) if (moja(P.pts[i][0] + (P.pts[i + 1][0] - P.pts[i][0]) * t, P.pts[i][1] + (P.pts[i + 1][1] - P.pts[i][1]) * t)) return true; return false; };
  // (un extremo en el agua: se alarga en su dirección, de medio en medio metro, hasta pisar la orilla; como mucho 12 m)
  const alarga = (pts, fin) => {
    const a = fin ? pts[pts.length - 1] : pts[0], b = fin ? pts[pts.length - 2] : pts[1];
    const l = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, dx = (a[0] - b[0]) / l, dz = (a[1] - b[1]) / l;
    if (riverInfo(a[0], a[1]).edge >= 1.2) return;
    for (let s = 0.5; s <= 12; s += 0.5) { const x = a[0] + dx * s, z = a[1] + dz * s; if (riverInfo(x, z).edge >= 1.2) { const q = [x + dx * 0.8, z + dz * 0.8]; if (fin) pts.push(q); else pts.unshift(q); return; } }
  };
  for (const P of out) { P.hecho = mojado(P) || !!P.mision; if (P.hecho && mojado(P) && P.pts.length > 1) { alarga(P.pts, false); alarga(P.pts, true); } }
  // donde una calle o un camino cruza el agua sin puente: uno nuevo, de orilla a orilla, del ancho de la calle
  const cerca = (x, z) => out.some(P => P.hecho && P.pts.some((q, i) => i < P.pts.length - 1 && segDist(x, z, q[0], q[1], P.pts[i + 1][0], P.pts[i + 1][1]).d < P.w + 2));
  for (const c of calles) {
    const S = [];
    for (let i = 0; i < c.pts.length - 1; i++) { const a = c.pts[i], b = c.pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(l)); for (let k = 0; k < n; k++) S.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
    S.push(c.pts[c.pts.length - 1]);
    for (let i = 0; i < S.length; i++) {
      if (riverInfo(S[i][0], S[i][1]).edge >= -0.2 || cerca(S[i][0], S[i][1])) continue;
      let j = i; while (j + 1 < S.length && riverInfo(S[j + 1][0], S[j + 1][1]).edge < 1.2) j++;
      let a = i; while (a > 0 && riverInfo(S[a][0], S[a][1]).edge < 1.2) a--;
      const largo = j - a;
      // (más de 30 m por el agua: el camino va por la orilla, no la cruza)
      if (largo > 30 || a === 0 && riverInfo(S[0][0], S[0][1]).edge < 1.2 || j === S.length - 1 && riverInfo(S[j][0], S[j][1]).edge < 1.2) { i = j; continue; }
      // (y que la cruce: una calle que va a lo largo del río, por la orilla, no lleva puente)
      const m = S[Math.round((a + j) / 2)], e = S[Math.min(S.length - 1, j + 1)], el = Math.hypot(e[0] - S[a][0], e[1] - S[a][1]) || 1;
      let rd = null, bd = 1e9;
      for (const L of rios) for (let k = 0; k < L.pts.length - 1; k++) { const p = L.pts[k], q = L.pts[k + 1], d = segDist(m[0], m[1], p[0], p[1], q[0], q[1]).d; if (d < bd) { bd = d; rd = [q[0] - p[0], q[1] - p[1]]; } }
      if (rd && Math.abs((rd[0] * (e[0] - S[a][0]) + rd[1] * (e[1] - S[a][1])) / (Math.hypot(rd[0], rd[1]) || 1) / el) > 0.8) { i = j; continue; }
      const pts = [S[a], ...(j - a > 2 ? [m] : []), e].map(q => q.slice());
      out.push({ n: c.name || '', w: clamp(c.w, 1.1, 3), pts, hecho: true, nuevo: true });
      i = j;
    }
  }
  return out;
}
