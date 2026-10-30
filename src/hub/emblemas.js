// Los lugares emblemáticos de Navarra en el mapa del inicio, con su forma de verdad: la Ciudadela de Pamplona, El Sadar,
// el Palacio Real de Olite, el castillo de Javier, los puentes de Burgui y de Puente la Reina y Castildetierra en las
// Bardenas. La planta de cada uno sale de OpenStreetMap (src/data/reales/emblemas.json, tools/emblemas-real.py); lo que
// no está en los datos, de lo que se sabe del sitio: las alturas, los arcos de los puentes (cuatro en Burgui, seis a la
// vista en Puente la Reina), los capuchones negros de las torres de Olite, que le pusieron en la restauración del siglo XX,
// o el remate de arenisca de Castildetierra sobre su cono de arcilla. Nada inventado: si un edificio no se sabe cómo es,
// no se pone.
// La Ciudadela, El Sadar y Castildetierra van sueltos sobre su comarca y se ven ya de lejos (mapa3d.js); los de dentro
// de un pueblo con trazado real se levantan con su maqueta, en lugar de las cajas de los datos (maqueta.js).
// Todo va en una sola malla por sitio, con el color en cada vértice. Las alturas, en metros por MU y por K (lo que se
// exageran de alto, como las casas); aBase es el suelo de cada vértice, y el sombreador las mantiene en su proporción
// aunque el relieve se exagere más o menos (uAlzado); en los puentes, desde el agua.
import * as THREE from 'three';
import DATOS from '../data/reales/emblemas.json';

export const EMB = DATOS.emblemas;
const rad = Math.PI / 180;
const hsl = (h, s, l) => new THREE.Color().setHSL(h, s, l).toArray();
const PIEDRA = hsl(0.09, 0.3, 0.58), PIEDRA_C = hsl(0.1, 0.3, 0.68), CESPED = hsl(0.27, 0.4, 0.38), TEJA = hsl(0.03, 0.5, 0.42);
const ORO = hsl(0.1, 0.42, 0.6), PIZARRA = hsl(0.62, 0.12, 0.14), ROJO = hsl(0.99, 0.82, 0.4), ROJO_O = hsl(0.99, 0.72, 0.28);

/** De un punto (lat, lon) a metros desde otro, como los pueblos reales (x al este, z al sur) */
export function metros(lat, lon, lat0, lon0) { return [(lon - lon0) * 111320 * Math.cos(lat0 * rad), -(lat - lat0) * 110574]; }
const pares = (a) => { const o = []; for (let i = 0; i + 1 < a.length; i += 2) o.push([a[i], a[i + 1]]); return o; };
const enPol = (P, x, z) => { let inn = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inn = !inn; } return inn; };

// ---------- la malla de un sitio: posiciones, colores y el suelo de cada vértice ----------
class Malla {
  constructor(o) { this.o = o; this.p = []; this.c = []; this.b = []; this.i = []; }
  v(X, Y, Z, col, base) { this.p.push(X, Y, Z); this.c.push(col[0], col[1], col[2]); this.b.push(base ?? Y); return this.p.length / 3 - 1; }
  tri(a, b, c) { this.i.push(a, b, c); }
  quad(a, b, c, d) { this.i.push(a, b, c, a, c, d); }
  // (un prisma: el contorno P en metros, desde el suelo hasta una altura fija, la de su esquina más baja más h; con tapa)
  prisma(P, h, col, tapa = col, hund = 1.2) {
    const { W, suelo, MH } = this.o, Q = P.map(([x, z]) => W(x, z)), g = Q.map(([X, Z]) => suelo(X, Z)), y0 = Math.min(...g) - hund * MH, y1 = y0 + (h + hund) * MH;
    if (THREE.ShapeUtils.area(P.map(([x, z]) => new THREE.Vector2(x, z))) > 0) { Q.reverse(); g.reverse(); P = [...P].reverse(); }
    const n = Q.length, base = y0;
    for (let k = 0; k < n; k++) {
      const [X0, Z0] = Q[k], [X1, Z1] = Q[(k + 1) % n], sh = 0.84 + 0.16 * Math.abs(Math.sin(Math.atan2(Z1 - Z0, X1 - X0) + 0.6)), cc = col.map(x => x * sh);
      const a = this.v(X0, y0, Z0, cc, base), b = this.v(X1, y0, Z1, cc, base), c = this.v(X1, y1, Z1, cc, base), d = this.v(X0, y1, Z0, cc, base);
      this.quad(a, b, c, d);
    }
    const t0 = this.p.length / 3; Q.forEach(([X, Z]) => this.v(X, y1, Z, tapa, base));
    for (const t of THREE.ShapeUtils.triangulateShape(P.map(([x, z]) => new THREE.Vector2(x, z)), [])) this.tri(t0 + t[0], t0 + t[2], t0 + t[1]);
    return { y0, y1 };
  }
  // (una caja girada, centrada en x, z, apoyada en y0; para muros, almenas, torres y tribunas)
  caja(x, z, ry, w, d, y0, alto, col, base = y0) {
    const { W } = this.o, c = Math.cos(ry), s = Math.sin(ry), q = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([a, b]) => W(x + a * c - b * s, z + a * s + b * c));
    const y1 = y0 + alto, ix = [];
    for (let k = 0; k < 4; k++) { const [X0, Z0] = q[k], [X1, Z1] = q[(k + 1) % 4], sh = 0.82 + 0.18 * Math.abs(Math.sin(ry + k * Math.PI / 2 + 0.6)), cc = col.map(v => v * sh);
      this.quad(this.v(X0, y0, Z0, cc, base), this.v(X1, y0, Z1, cc, base), this.v(X1, y1, Z1, cc, base), this.v(X0, y1, Z0, cc, base)); }
    for (const [X, Z] of q) ix.push(this.v(X, y1, Z, col.map(v => Math.min(1, v * 1.08)), base));
    this.quad(ix[3], ix[2], ix[1], ix[0]);
  }
  // (un muro a lo largo de una línea, con su grueso; la base, en el suelo de cada tramo)
  muro(L, h, grueso, col, almena = 0) {
    const { suelo, W, MH } = this.o;
    for (let k = 0; k + 1 < L.length; k++) {
      const [x0, z0] = L[k], [x1, z1] = L[k + 1], len = Math.hypot(x1 - x0, z1 - z0); if (len < 0.3) continue;
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, ry = Math.atan2(z1 - z0, x1 - x0), y0 = Math.min(suelo(...W(x0, z0)), suelo(...W(x1, z1))) - 1.2 * MH;
      this.caja(mx, mz, ry, len + grueso * 0.6, grueso, y0, (h + 1.2) * MH, col);
      if (almena) this.almenas([[x0, z0], [x1, z1]], y0 + (h + 1.2) * MH, grueso, col, y0);
    }
  }
  // (las almenas sobre un borde: un merlón cada 3,2 m)
  almenas(L, y, grueso, col, base) {
    const { MH } = this.o;
    for (let k = 0; k + 1 < L.length; k++) {
      const [x0, z0] = L[k], [x1, z1] = L[k + 1], len = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(len / 3.2), ry = Math.atan2(z1 - z0, x1 - x0);
      for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; this.caja(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, ry, 1.5, Math.min(grueso, 1.4), y, 1.5 * MH, col, base); }
    }
  }
  // (un cono o tronco de cono, con su tapa; r(k) puede variar por lado: las cárcavas de la arcilla)
  cono(x, z, r0, r1, y0, y1, n, col, base = y0, tapa = true, r0k = null) {
    const { W } = this.o, a = [], b = [];
    for (let k = 0; k <= n; k++) { const t = k / n * Math.PI * 2, f = r0k ? r0k(k % n) : 1, s = 0.82 + 0.18 * Math.abs(Math.sin(t + 0.6)), cc = col.map(v => v * s);
      a.push(this.v(...W(x + Math.cos(t) * r0 * f, z + Math.sin(t) * r0 * f).flatMap((v, i) => i ? [y0, v] : [v]), cc, base));
      b.push(this.v(...W(x + Math.cos(t) * r1 * f, z + Math.sin(t) * r1 * f).flatMap((v, i) => i ? [y1, v] : [v]), cc, base)); }
    for (let k = 0; k < n; k++) this.quad(a[k], a[k + 1], b[k + 1], b[k]);
    if (tapa && r1 > 0) { const [X, Z] = W(x, z), m = this.v(X, y1, Z, col.map(v => Math.min(1, v * 1.08)), base); for (let k = 0; k < n; k++) this.tri(m, b[k + 1], b[k]); }
  }
  // (un trozo de suelo con el contorno P: sus triángulos, partidos hasta que ningún lado pase de lado m, para que sigan
  // el relieve, algo por encima de él. col2 y raya(x, z): franjas de otro color, como la siega de un campo)
  parche(P, col, lado, sobre, col2 = null, raya = null) {
    const { W, suelo, MH } = this.o, V = P.map(p => [...p]), T = [];
    if (THREE.ShapeUtils.area(P.map(([x, z]) => new THREE.Vector2(x, z))) > 0) V.reverse();
    for (const t of THREE.ShapeUtils.triangulateShape(V.map(([x, z]) => new THREE.Vector2(x, z)), [])) T.push([V[t[0]], V[t[2]], V[t[1]]]);
    const out = [], mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    while (T.length) { const [a, b, c] = T.pop(); if (Math.max(d(a, b), d(b, c), d(c, a)) <= lado || out.length > 20000) { out.push([a, b, c]); continue; }
      const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); T.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]); }
    const ix = new Map(), at = (p) => { const k = p[0].toFixed(2) + ',' + p[1].toFixed(2); if (ix.has(k)) return ix.get(k);
      const [X, Z] = W(p[0], p[1]), c = col2 && raya && Math.floor(raya(p[0], p[1])) % 2 ? col2 : col, id = this.v(X, suelo(X, Z) + sobre * MH, Z, c); ix.set(k, id); return id; };
    for (const [a, b, c] of out) {
      if (col2 && raya) {   // (con franjas, cada triángulo de un solo color: el de su centro)
        const m = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3], cc = Math.floor(raya(m[0], m[1])) % 2 ? col2 : col;
        const ids = [a, b, c].map(p => { const [X, Z] = W(p[0], p[1]); return this.v(X, suelo(X, Z) + sobre * MH, Z, cc); }); this.tri(ids[0], ids[1], ids[2]);
      } else this.tri(at(a), at(b), at(c));
    }
  }
  geometria() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aBase', new THREE.Float32BufferAttribute(this.b, 1)); g.setIndex(this.i); g.computeVertexNormals(); g.computeBoundingSphere();
    return g;
  }
}

/** El material de los emblemas: color por vértice, la luz del mapa y la altura en su proporción (alzado: { value }) */
export function materialEmblema(alzado) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uAlzado = alzado;
    sh.vertexShader = 'attribute float aBase; uniform float uAlzado;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y = aBase + (transformed.y - aBase) * uAlzado;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * 0.14;');
  };
  m.customProgramCacheKey = () => 'emblema';
  return m;
}

// ---------- cada sitio ----------
// (o: { W(x, z) → [X, Z] del mundo, desde el punto del sitio; suelo(X, Z) → la altura del suelo; MH: un metro de alto })
const SITIOS = {
  // la Ciudadela: el parque que la rodea, los muros de sus baluartes, revellines y fosos, y los edificios de dentro con su
  // tejado de teja. Los dos baluartes que miraban a la ciudad no están: se derribaron con el Primer Ensanche, en 1888
  ciudadela(M, E) {
    M.parche(pares(E.parque), CESPED, 30, 0.6);
    // (OpenStreetMap da casi todos los muros como su huella, un contorno estrecho y cerrado: se levanta entero; los que vienen
    // como una línea, con 4 m de grueso)
    for (const m of E.muros) { const L = pares(m), cerrado = L.length > 3 && Math.hypot(L[0][0] - L[L.length - 1][0], L[0][1] - L[L.length - 1][1]) < 1.5;
      if (cerrado) M.prisma(L.slice(0, -1), 8, PIEDRA, PIEDRA_C); else M.muro(L, 8, 4, PIEDRA); }
    for (const e of E.edificios) {
      const P = pares(e.p), { y1 } = M.prisma(P, e.h, PIEDRA_C, TEJA);
      if (P.length === 4) {   // (las naves de cuatro esquinas, con su tejado a dos aguas)
        const [a, b, , d] = P, la = Math.hypot(b[0] - a[0], b[1] - a[1]), lb = Math.hypot(d[0] - a[0], d[1] - a[1]), cx = P.reduce((s, p) => s + p[0], 0) / 4, cz = P.reduce((s, p) => s + p[1], 0) / 4;
        const ry = la >= lb ? Math.atan2(b[1] - a[1], b[0] - a[0]) : Math.atan2(d[1] - a[1], d[0] - a[0]);
        tejado(M, cx, cz, ry, Math.max(la, lb), Math.min(la, lb), y1, TEJA);
      }
    }
  },
  // El Sadar: el campo con sus franjas de siega y sus rayas, las gradas alrededor, la fachada roja («Muro Rojo», la reforma
  // de 2018 a 2021) y la cubierta encima de las gradas
  sadar(M, E) {
    const { W, suelo, MH } = M.o, R = pares(E.estadio), Cp = pares(E.campo), h = E.h || 30;
    const c = (P) => [P.reduce((s, p) => s + p[0], 0) / P.length, P.reduce((s, p) => s + p[1], 0) / P.length];
    const [cx, cz] = c(R), ax = Math.atan2(R[1][1] - R[0][1], R[1][0] - R[0][0]), ux = [Math.cos(ax), Math.sin(ax)], uz = [-Math.sin(ax), Math.cos(ax)];
    const ext = (P) => { let a = 0, b = 0; for (const [x, z] of P) { a = Math.max(a, Math.abs((x - cx) * ux[0] + (z - cz) * ux[1])); b = Math.max(b, Math.abs((x - cx) * uz[0] + (z - cz) * uz[1])); } return [a, b]; };
    const [A, B] = ext(R), [a0, b0] = ext(Cp), rect = (a, b) => [[-a, -b], [a, -b], [a, b], [-a, b]].map(([u, w]) => [cx + u * ux[0] + w * uz[0], cz + u * ux[1] + w * uz[1]]);
    const g0 = Math.min(...R.map(([x, z]) => suelo(...W(x, z)))) - 0.6 * MH, Y = (m) => g0 + m * MH;
    // (el campo, con franjas de siega cada 6 m a lo largo y las rayas blancas del borde)
    const campo = rect(a0, b0), lu = (x, z) => ((x - cx) * ux[0] + (z - cz) * ux[1] + a0) / 6;
    M.parche(campo, hsl(0.29, 0.5, 0.36), 3, 0.6, hsl(0.29, 0.46, 0.42), lu);
    const BL = hsl(0, 0, 0.92), raya = (p, q) => { const [x0, z0] = p, [x1, z1] = q, ry = Math.atan2(z1 - z0, x1 - x0); M.caja((x0 + x1) / 2, (z0 + z1) / 2, ry, Math.hypot(x1 - x0, z1 - z0), 0.5, Y(0.8), 0.15 * MH, BL); };
    for (let k = 0; k < 4; k++) raya(campo[k], campo[(k + 1) % 4]);
    raya(rect(0, b0)[0], rect(0, b0)[3]);
    // (las gradas: de 3 m sobre el campo junto a él a 24 m arriba, en rojo, el color de sus asientos)
    const ai = rect(a0 + 6, b0 + 6), ae = rect(A - 3, B - 3), q = [];
    for (let k = 0; k < 4; k++) q.push([ai[k], ae[k]]);
    for (let k = 0; k < 4; k++) { const [i0, e0] = q[k], [i1, e1] = q[(k + 1) % 4], cc = ROJO.map(v => v * (0.78 + 0.08 * k));
      M.quad(M.v(...W(...i0).flatMap((v, j) => j ? [Y(3), v] : [v]), cc, g0), M.v(...W(...i1).flatMap((v, j) => j ? [Y(3), v] : [v]), cc, g0),
        M.v(...W(...e1).flatMap((v, j) => j ? [Y(24), v] : [v]), cc, g0), M.v(...W(...e0).flatMap((v, j) => j ? [Y(24), v] : [v]), cc, g0)); }
    // (el frente de las gradas, el muro bajo junto al campo)
    for (let k = 0; k < 4; k++) { const p = ai[k], r = ai[(k + 1) % 4]; M.caja((p[0] + r[0]) / 2, (p[1] + r[1]) / 2, Math.atan2(r[1] - p[1], r[0] - p[0]), Math.hypot(r[0] - p[0], r[1] - p[1]), 0.8, Y(0), 3 * MH, hsl(0, 0, 0.3), g0); }
    // (la fachada: paneles rojos en vertical, uno más claro y otro más oscuro, como sus tubos)
    const fa = rect(A, B);
    for (let k = 0; k < 4; k++) {
      const p = fa[k], r = fa[(k + 1) % 4], len = Math.hypot(r[0] - p[0], r[1] - p[1]), n = Math.max(1, Math.round(len / 4)), ry = Math.atan2(r[1] - p[1], r[0] - p[0]);
      for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; M.caja(p[0] + (r[0] - p[0]) * t, p[1] + (r[1] - p[1]) * t, ry, len / n, 1.2, Y(0), (h - 3) * MH, i % 2 ? ROJO : ROJO.map(v => v * 0.9), g0); }
    }
    // (la cubierta: un anillo de la fachada al borde de las gradas, algo inclinado hacia el campo)
    const ce = rect(A + 1, B + 1), ci = rect(a0 + 7, b0 + 7);
    for (let k = 0; k < 4; k++) { const k1 = (k + 1) % 4, cc = ROJO_O.map(v => v * (0.9 + 0.05 * k));
      M.quad(M.v(...W(...ce[k]).flatMap((v, j) => j ? [Y(h), v] : [v]), cc, g0), M.v(...W(...ce[k1]).flatMap((v, j) => j ? [Y(h), v] : [v]), cc, g0),
        M.v(...W(...ci[k1]).flatMap((v, j) => j ? [Y(h - 2.5), v] : [v]), cc, g0), M.v(...W(...ci[k]).flatMap((v, j) => j ? [Y(h - 2.5), v] : [v]), cc, g0)); }
  },
  // Castildetierra: el cabezo de arcilla y yeso de las Bardenas, con su falda surcada de cárcavas, la chimenea con sus
  // estratos y el remate de arenisca, más duro, que la protege
  castildetierra(M) {
    const { W, suelo, MH } = M.o, g0 = suelo(...W(0, 0)) - 1 * MH, Y = (m) => g0 + m * MH, ARC = hsl(0.08, 0.36, 0.6), ARC2 = hsl(0.075, 0.32, 0.52), ARE = hsl(0.07, 0.28, 0.32);
    const surco = (k) => 0.8 + 0.26 * ((k * 7919) % 11) / 11, grieta = (k) => 0.9 + 0.14 * ((k * 104729) % 7) / 7;
    M.cono(0, 0, 55, 19, Y(0), Y(16), 22, ARC2, g0, false, surco);
    for (let i = 0; i < 6; i++) { const t0 = i / 6, t1 = (i + 1) / 6; M.cono(0, 0, 18 - 12 * t0, 18 - 12 * t1, Y(16 + 24 * t0), Y(16 + 24 * t1), 14, i % 2 ? ARC : ARC2, g0, false, grieta); }
    M.cono(0, 0, 8.5, 8, Y(40), Y(43), 14, ARE, g0, true);
  },
  // el Palacio Real de Olite: su contorno de piedra dorada con las almenas, el Palacio Viejo y la muralla de la villa. Las
  // torres, en las esquinas que más salen del contorno; la del homenaje, de 40 m, la más alta, la de las Tres Coronas,
  // ochavada y en tres cuerpos, y en cuatro, los capuchones negros que le dio la restauración del siglo XX
  olite(M, E) {
    const P = pares(E.palacio), { y0, y1 } = M.prisma(P, 17, ORO, TEJA);
    M.almenas([...P, P[0]], y1, 1.4, ORO, y0);
    const V = pares(E.viejo), r = M.prisma(V, 14, ORO, TEJA); M.almenas([...V, V[0]], r.y1, 1.4, ORO, r.y0);
    for (const m of E.muros) M.muro(pares(m), 8, 2.4, ORO, true);
    const esq = salientes(P, 9, 16), ALTOS = [40, 30, 28, 27, 26, 25, 24, 23, 22], tres = 1;
    esq.forEach(([x, z, ry], i) => {
      const h = ALTOS[i] || 22, lado = i === 0 ? 11 : 8.5;
      if (i === tres) { for (let k = 0; k < 3; k++) M.cono(x, z, (lado * 0.62) * (1 - k * 0.18), (lado * 0.62) * (1 - k * 0.18), y0 + (h * k / 3) * M.o.MH, y0 + (h * (k + 1) / 3) * M.o.MH, 8, ORO, y0, k === 2); return; }
      M.caja(x, z, ry, lado, lado, y0, h * M.o.MH, ORO, y0);
      if (i >= 2 && i <= 5) M.cono(x, z, lado * 0.72, 0, y0 + h * M.o.MH, y0 + (h + 8) * M.o.MH, 4, PIZARRA, y0, false);
      else M.almenas([[x - lado / 2, z - lado / 2], [x + lado / 2, z - lado / 2], [x + lado / 2, z + lado / 2], [x - lado / 2, z + lado / 2], [x - lado / 2, z - lado / 2]], y0 + h * M.o.MH, 1.2, ORO, y0);
    });
  },
  // el castillo de Javier: el castillo, la torre del homenaje en medio, más alta, y su muralla, con almenas
  javier(M, E) {
    const C = pares(E.castillo), r = M.prisma(C, 14, PIEDRA, PIEDRA_C); M.almenas([...C, C[0]], r.y1, 1.4, PIEDRA, r.y0);
    const H = pares(E.homenaje), t = M.prisma(H, 28, PIEDRA_C, PIEDRA_C); M.almenas([...H, H[0]], t.y1, 1.4, PIEDRA_C, t.y0);
    M.prisma(pares(E.muralla), 7, PIEDRA, PIEDRA_C);
  },
  // (los dos, con su lomo: el de Burgui, con su viejo peralte, y el de Puente la Reina, más alto en el arco del medio)
  burgui(M, E) { puente(M, pares(E.puente), E.arcos, 7); },
  'puente-reina'(M, E) { puente(M, pares(E.puente), E.arcos, 10); },
};

// (el tejado a dos aguas de una nave: dos faldones y los hastiales)
function tejado(M, cx, cz, ry, largo, ancho, y, col) {
  const { W, MH } = M.o, c = Math.cos(ry), s = Math.sin(ry), h = ancho * 0.35 * MH, p = (a, b, yy) => { const [X, Z] = W(cx + a * c - b * s, cz + a * s + b * c); return M.v(X, yy, Z, col, y); };
  const a = largo / 2, b = ancho / 2, A = p(-a, -b, y), B = p(a, -b, y), C = p(a, b, y), D = p(-a, b, y), E = p(-a, 0, y + h), F = p(a, 0, y + h);
  M.quad(A, E, F, B); M.quad(D, C, F, E); M.tri(A, D, E); M.tri(B, F, C);
}
// (las esquinas que más salen de un contorno, separadas al menos sep metros: donde van las torres)
function salientes(P, n, sep) {
  const area = THREE.ShapeUtils.area(P.map(([x, z]) => new THREE.Vector2(x, z))), sg = area > 0 ? 1 : -1, L = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[(i + P.length - 1) % P.length], b = P[i], c = P[(i + 1) % P.length], u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]];
    const giro = Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]) * sg;
    if (giro > 0.5) L.push([b[0], b[1], Math.atan2(v[1], v[0]), giro]);
  }
  L.sort((p, q) => q[3] - p[3]); const out = [];
  for (const p of L) if (out.length < n && !out.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < sep)) out.push(p);
  return out;
}
// (un puente de piedra: su contorno da el eje, el ancho del tablero y los tajamares; los arcos, de medio punto entre las
// pilas, sobre el agua, y el tablero con su lomo, a la altura de las orillas en los extremos y alto en medio; los pretiles,
// a los lados. Su alzado se mide desde el agua: en medio queda tan alto como es, y en los extremos toca las orillas)
function puente(M, P, arcos, alto) {
  const { W, suelo, MH } = M.o, n = P.length, cx = P.reduce((s, p) => s + p[0], 0) / n, cz = P.reduce((s, p) => s + p[1], 0) / n;
  let sxx = 0, szz = 0, sxz = 0; for (const [x, z] of P) { sxx += (x - cx) ** 2; szz += (z - cz) ** 2; sxz += (x - cx) * (z - cz); }
  const ang = 0.5 * Math.atan2(2 * sxz, sxx - szz), ux = [Math.cos(ang), Math.sin(ang)], uz = [-Math.sin(ang), Math.cos(ang)];
  const U = P.map(([x, z]) => [(x - cx) * ux[0] + (z - cz) * ux[1], (x - cx) * uz[0] + (z - cz) * uz[1]]);
  const u0 = Math.min(...U.map(p => p[0])), u1 = Math.max(...U.map(p => p[0])), L = u1 - u0, ab = Math.min(6, L * 0.08);
  // (el ancho: de un borde al otro, sin los tajamares, que salen; los dos bordes, por separado, porque el contorno no
  // tiene por qué quedar centrado en su eje)
  const q = (a, f) => a.length ? a.sort((x, y) => x - y)[Math.floor(a.length * f)] : 1.5;
  const bP = q(U.filter(p => p[1] > 0).map(p => p[1]), 0.3), bN = q(U.filter(p => p[1] < 0).map(p => -p[1]), 0.3), ancho = Math.max(3, bP + bN), mitad = (bP - bN) / 2;
  // (las pilas: donde el contorno sale por los tajamares, lejos de los estribos; si faltan, se parte el vano más largo)
  const tj = U.filter(p => (p[1] > bP + 0.9 || p[1] < -bN - 0.9) && p[0] > u0 + 5 && p[0] < u1 - 5).map(p => p[0]).sort((a, b) => a - b), ps = [];
  for (const t of tj) if (!ps.length || t - ps[ps.length - 1] > 4) ps.push(t); else ps[ps.length - 1] = (ps[ps.length - 1] + t) / 2;
  while (ps.length < arcos - 1) { const b = [u0 + ab * 0.5, ...ps, u1 - ab * 0.5]; let k = 0; for (let i = 1; i + 1 < b.length; i++) if (b[i + 1] - b[i] > b[k + 1] - b[k]) k = i; ps.push((b[k] + b[k + 1]) / 2); ps.sort((a, b) => a - b); }
  const at = (u, w = 0) => W(cx + u * ux[0] + (w + mitad) * uz[0], cz + u * ux[1] + (w + mitad) * uz[1]);
  // (el agua: lo bajo del suelo a lo largo del puente, sin el fondo de algún hoyo suelto)
  const hs = []; for (let u = u0; u <= u1; u += 2) hs.push(suelo(...at(u))); hs.sort((a, b) => a - b); const agua = hs[Math.floor(hs.length * 0.2)];
  const yA = suelo(...at(u0 + 1)), yB = suelo(...at(u1 - 1)), orilla = Math.max(yA, yB) + 0.8 * MH, cima = Math.max(orilla, agua + alto * MH);
  const tablero = (u) => orilla + (cima - orilla) * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, (u - u0) / L))), 0.6);
  // (el alzado del puente en (u, y), con los arcos por huecos; extruido a lo ancho. Todo en unidades del mundo, también
  // a lo largo, para que la triangulación no trabaje con medidas tan distintas)
  const MU = M.o.MU, S = new THREE.Shape(); S.moveTo(u0 * MU, agua - 1.5 * MH);
  S.lineTo(u1 * MU, agua - 1.5 * MH); for (let k = 24; k >= 0; k--) { const u = u0 + L * k / 24; S.lineTo(u * MU, tablero(u)); }
  const bordes = [u0 + ab * 0.5, ...ps, u1 - ab * 0.5];
  for (let i = 0; i + 1 < bordes.length; i++) {
    const a = bordes[i] + 1.4, b = bordes[i + 1] - 1.4, c = (a + b) / 2, rx = (b - a) / 2; if (rx < 1) continue;
    const arr = agua + 0.4 * MH, ry = Math.min(rx * MH, tablero(c) - arr - 1.4 * MH); if (ry < 0.5 * MH) continue;
    const hole = new THREE.Path(); hole.moveTo(a * MU, arr); hole.lineTo(b * MU, arr); hole.absellipse(c * MU, arr, rx * MU, ry, 0, Math.PI, false); hole.lineTo(a * MU, arr); S.holes.push(hole);
  }
  const g = new THREE.ExtrudeGeometry(S, { depth: ancho * MU, bevelEnabled: false, curveSegments: 10 }).toNonIndexed(), pos = g.getAttribute('position');
  const piedra = hsl(0.09, 0.2, 0.6);
  for (let k = 0; k < pos.count; k += 3) {
    const ids = [];
    for (let j = 0; j < 3; j++) { const u = pos.getX(k + j) / MU, y = pos.getY(k + j), w = pos.getZ(k + j) / MU - ancho / 2, [X, Z] = at(u, w); ids.push(M.v(X, y, Z, piedra, agua)); }
    M.tri(ids[0], ids[1], ids[2]);
  }
  g.dispose();
  // (los tajamares, aguas arriba y abajo de cada pila, y los pretiles)
  for (const u of ps) for (const sg of [-1, 1]) {
    const y0 = agua - 1.5 * MH, y1 = agua + 4 * MH, w = ancho / 2, p = (du, dw, y) => { const [X, Z] = at(u + du, sg * (w + dw)); return M.v(X, y, Z, piedra, agua); };
    const a = p(-1.4, 0, y0), b = p(1.4, 0, y0), c = p(0, 2.2, y0), d = p(-1.4, 0, y1), e = p(1.4, 0, y1), f = p(0, 2.2, y1);
    M.quad(a, c, f, d); M.quad(c, b, e, f); M.tri(d, f, e);
  }
  for (const sg of [-1, 1]) for (let k = 0; k < 24; k++) {
    const ua = u0 + L * k / 24, ub = u0 + L * (k + 1) / 24, w = sg * (ancho / 2 - 0.3), p = (u, y) => { const [X, Z] = at(u, w); return M.v(X, y, Z, piedra, agua); };
    const ya = tablero(ua), yb = tablero(ub); M.quad(p(ua, ya), p(ub, yb), p(ub, yb + 1 * MH), p(ua, ya + 1 * MH)); M.quad(p(ub, yb), p(ua, ya), p(ua, ya + 1 * MH), p(ub, yb + 1 * MH));
  }
}

/** Levanta el sitio id: o = { ancla(lat, lon) → [X, Z], MU, K, suelo(X, Z) }. Devuelve su geometría */
export function haceEmblema(id, o) {
  const E = EMB[id], [XA, ZA] = o.ancla(E.lat, E.lon), MU = o.MU;
  const M = new Malla({ W: (x, z) => [XA + x * MU, ZA + z * MU], suelo: o.suelo, MH: MU * o.K, MU });
  SITIOS[id](M, E);
  return M.geometria();
}

// los de dentro de un pueblo con trazado real (su maqueta): el sitio y el pueblo
export const DE_PUEBLO = { olite: 'olite', javier: 'javier', burgui: 'burgui-burgi', 'puente-reina': 'puente-la-reina' };
export const SUELTOS = ['ciudadela', 'sadar', 'castildetierra'];
/** Los sitios de un pueblo y, en metros del pueblo, lo que ocupan (para quitar de la maqueta las cajas que caen dentro) */
export function emblemasDe(D) {
  const ids = Object.keys(DE_PUEBLO).filter(k => DE_PUEBLO[k] === D.id);
  return ids.map(id => {
    const E = EMB[id], [dx, dz] = metros(E.lat, E.lon, D.lat, D.lon), mueve = (a) => pares(a).map(([x, z]) => [x + dx, z + dz]);
    const huecos = id === 'olite' ? [mueve(E.palacio), mueve(E.viejo)] : id === 'javier' ? [mueve(E.castillo)] : [];
    return { id, huecos };
  });
}
export const enHueco = (huecos, x, z) => huecos.some(P => enPol(P, x, z));
