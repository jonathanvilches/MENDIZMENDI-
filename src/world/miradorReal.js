// El paisaje de los prismáticos con el relieve de detalle del mirador (relieve.js · relievePolar): el terreno con sus
// alturas reales alrededor del ojo, hasta 110 km, en sectores de 15° (solo se dibujan los que caen en el visor). Los
// colores salen de la altitud, la pendiente, la orientación y el clima reales: campos y prados abajo, bosque en las
// laderas (más en las umbrías y en los barrancos), pasto de montaña, roca en los cortados y en lo más alto, canchales al
// pie de la roca y nieve cuando ha nevado. Los lomos se aclaran y los barrancos se oscurecen un poco (como en un mapa
// de relieve), y la bruma crece con la distancia real. Encima, el nombre de los montes conocidos que se ven y aves de la
// comarca volando, que se pueden anotar como en el pueblo.
import * as THREE from 'three';
import { rel } from '../util/geo.js';
import { bird } from '../actors/beasts.js';
import SETTLEMENTS from '../data/settlements.json';

const RT = 6371000, KR = 0.13;
// (radio en metros de los núcleos grandes; los demás, unos 140 a 230 m)
const BIG = [['Pamplona / Iruña', 2300], ['Burlada', 700], ['Villava', 600], ['Huarte', 600], ['Barañáin', 800], ['Ansoáin', 600], ['Berriozar', 600],
  ['Zizur Mayor', 700], ['Mutilva', 600], ['Noáin', 500], ['Tudela', 1400], ['Estella-Lizarra', 900], ['Tafalla', 900], ['Altsasu', 700], ['Olite', 550],
  ['Sangüesa', 550], ['Peralta', 600], ['Corella', 700], ['Cintruénigo', 600], ['San Adrián', 550], ['Lodosa', 550], ['Viana', 500], ['Puente la Reina', 450],
  ['Lumbier', 350], ['Aoiz', 400], ['Elizondo', 400]];
/** Lo que baja el terreno a m metros por la curvatura de la Tierra (con la refracción del aire). */
export const curv = (m) => m * m * (1 - KR) / (2 * RT);
const TAU = Math.PI * 2;
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const CASAS_KM = 10;   // (hasta aquí, las casas de los pueblos con volumen: más lejos, con los prismáticos, no se nota)
// (y desde aquí, en metros: más cerca, con los prismáticos, una casa sin ventanas tapaba medio visor como una caja)
const CASAS_CERCA = 400;
/** La bruma de la distancia real en las casas, la misma que la del terreno (polarMaterial). */
function hazeShader(mat, eyeAlt, { hazeColor, haze = 1 }) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uEyeAlt: { value: eyeAlt }, uHazeL: { value: 60000 / Math.max(0.3, haze) }, uHaze: { value: hazeColor.clone() } });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uEyeAlt; varying vec3 vWP; varying float vAlt;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
{ vec4 wp = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  wp = instanceMatrix * wp;
#endif
  wp = modelMatrix * wp; vWP = wp.xyz; float rr = length(wp.xz); vAlt = uEyeAlt + wp.y + rr * rr * ${((1 - KR) / (2 * RT)).toExponential(6)}; }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uHazeL; uniform vec3 uHaze; varying vec3 vWP; varying float vAlt;')
      .replace('#include <fog_fragment>', `{
  float d = length(vWP - cameraPosition), k = (1.0 - exp(-d / uHazeL)) * mix(1.0, 0.75, smoothstep(800.0, 2400.0, vAlt));
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, clamp(k, 0.0, 0.82));
}`);
  };
}

/** La malla del relieve: alturas en una rejilla [anillo][rumbo] y las posiciones en la escena (ojo en 0, norte = −z). */
export class PolarGrid {
  constructor(G, low) {
    const NB = this.NB = low ? 720 : 1440; this.low = low;
    // (un anillo al pie del ojo, con el suelo de debajo, y los de los datos)
    const rs = this.rs = Float64Array.from([0.02, ...G.rs]), NR = this.NR = rs.length, H = this.H = new Float32Array(NR * NB);
    for (let j = 0; j < NR; j++) {
      const s = G.rows[Math.max(0, j - 1)], n = s.length, o = j * NB;
      if (n === NB) H.set(s, o);
      else if (n < NB) for (let i = 0; i < NB; i++) { const x = i * n / NB, k = Math.floor(x), f = x - k; H[o + i] = s[k % n] * (1 - f) + s[(k + 1) % n] * f; }
      else { const st = n / NB; for (let i = 0; i < NB; i++) { const k = i * st; H[o + i] = (s[(k - 1 + n) % n] + 2 * s[k] + s[(k + 1) % n]) / 4; } }
    }
    this.alt = G.alt; this.lat = G.lat; this.lon = G.lon;
    // el primer plano, como en un mirador: en los primeros 400 m el suelo cae desde el ojo (si no, en una cima llana o en
    // una ladera, el suelo de al lado tapaba la vista o se veía a ras de suelo, como una pared)
    for (let j = 0; j < NR && rs[j] < 0.6; j++) {
      const lim = this.alt - 10 - rs[j] * 1000 * 0.12, w = rs[j] < 0.35 ? 0 : (rs[j] - 0.35) / 0.25, k = w * w * (3 - 2 * w);
      for (let i = 0; i < NB; i++) { const o = j * NB + i, h = H[o], m = Math.min(h, lim); H[o] = m + (h - m) * k; }
    }
  }
  /** Los pueblos y ciudades de alrededor (settlements.json), cada uno con su radio (km) y si lleva casas con volumen
   *  (casas): los más cercanos, hasta CASAS_KM, mientras quepan en el presupuesto de casas (en el iPhone, la mitad). */
  townsAround() {
    if (this._towns) return this._towns;
    const out = [];
    for (const s of SETTLEMENTS) {
      const { km, bearing } = rel(this.lat, this.lon, s[0], s[1]); if (km > 45 || km < 0.15) continue;
      out.push({ s, km, b: bearing, R: (BIG.find(([n]) => s[2].startsWith(n))?.[1] ?? 140 + (s[2].length * 37 % 90)) / 1000, casas: false });
    }
    out.sort((a, b) => a.km - b.km);
    // (unas 36 casas por hectárea de casco, con calles y patios; en las ciudades, bloques de pisos, unos 11 por hectárea.
    // Una ciudad que no cabe entera lleva volumen solo hasta cl metros del ojo, lo más que quepa: más allá, pintada)
    const total = this.low ? 7000 : 14000; let quedan = total;
    for (const t of out) {
      if (t.km - t.R > CASAS_KM) break;
      t.big = t.R >= 0.45; const dens = t.big ? 0.0011 : 0.0036, n = Math.PI * (t.R * 1000) ** 2 * dens;
      if (n <= quedan) { t.casas = true; t.cl = Infinity; quedan -= n; continue; }
      const cx = Math.sin(t.b * Math.PI / 180) * t.km * 1000, cz = -Math.cos(t.b * Math.PI / 180) * t.km * 1000, Rm = t.R * 1000;
      for (const cl of [2500, 2000, 1600, 1300, 1000, 800]) {
        if (t.km * 1000 - Rm > cl) continue;
        let k = 0; for (let i = 0; i < 40; i++) for (let j = 0; j < 40; j++) { const x = (i + 0.5) / 20 - 1, z = (j + 0.5) / 20 - 1; if (x * x + z * z < 1 && Math.hypot(cx + x * Rm, cz + z * Rm) < cl) k++; }
        const m = k / 1600 * 4 * Rm * Rm * dens;
        if (m <= Math.min(quedan, total * 0.6)) { t.casas = true; t.cl = cl; quedan -= m; break; }   // (y sin quedarse con todo: que queden casas para los pueblos de alrededor)
      }
    }
    return this._towns = out;
  }
  /** Los pueblos y ciudades sobre la malla: cuánto es casco urbano cada punto (V, de 0 a 1) y lo mismo solo en los que
   *  llevan casas con volumen (V3: ahí el suelo es de calles y patios, sin tejados pintados). */
  villages() {
    const { NB, NR, rs } = this, V = new Float32Array(NR * NB), V3 = new Float32Array(NR * NB);
    for (const t of this.townsAround()) {
      const { km, R } = t, bearing = t.b;
      const db = km <= R * 1.05 ? 180 : Math.asin(R / km) * 180 / Math.PI * 1.1;   // (con el ojo dentro del pueblo, todo alrededor)
      for (let j = this.ring(km - R); j < NR && rs[j] <= km + R; j++) {
        for (let i = Math.floor((bearing - db) / 360 * NB); i <= Math.ceil((bearing + db) / 360 * NB); i++) {
          const ii = ((i % NB) + NB) % NB, a = ii * TAU / NB, b = bearing * Math.PI / 180;
          const d = Math.hypot(rs[j] * Math.sin(a) - km * Math.sin(b), rs[j] * Math.cos(a) - km * Math.cos(b)) / R;
          if (d < 1) { const o = j * NB + ii, v = 1 - d * d; V[o] = Math.max(V[o], v); if (t.casas) V3[o] = Math.max(V3[o], v * (1 - smoothstep(t.cl * 0.75, t.cl, rs[j] * 1000)) * smoothstep(CASAS_CERCA * 0.8, CASAS_CERCA * 1.1, rs[j] * 1000)); }
        }
      }
    }
    return { V, V3 };
  }
  /** Altura (m) del terreno a r km en el rumbo b (grados), entre anillos y entre rumbos, como la malla. */
  hAtR(b, r) {
    const j = Math.max(1, this.ring(r)); if (j >= this.NR) return this.hAt(this.NR - 1, b);
    const r0 = this.rs[j - 1], r1 = this.rs[j], f = Math.min(1, Math.max(0, (r - r0) / (r1 - r0)));
    return this.hAt(j - 1, b) * (1 - f) + this.hAt(j, b) * f;
  }
  /**
   * Las casas de los pueblos cercanos, con volumen (townsAround: casas): en cada pueblo, barrios de manzanas con calles y
   * patios, como el dibujo del suelo, y en cada manzana casas de 1 a 3 alturas con su tejado a dos aguas (más altas y
   * apretadas en el centro, más sueltas en las afueras), y en el centro la iglesia con su torre. Tres mallas repetidas
   * (paredes, hastiales y tejados: tres llamadas de dibujo) con la bruma de la distancia real, igual que el terreno.
   * o = { hazeColor, haze }. Devuelve [paredes, hastiales, tejados] o [] si no hay ningún pueblo cerca.
   */
  casas(o) {
    const list = this.townsAround().filter(t => t.casas); if (!list.length) return [];
    const MW = [], MR = [], Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), mx = new THREE.Matrix4(), ps = new THREE.Vector3(), sc = new THREE.Vector3();
    const pared = [], teja = [];
    // (los colores, algo más claros que los de las casas del pueblo: con los prismáticos, de lejos y a la sombra, se apagaban)
    const PAREDES = ['#f6efe2', '#fbf8f2', '#efdfc2', '#e6d2b0', '#ddd0bb', '#f3e8d4'].map(c => new THREE.Color(c).multiplyScalar(1.15));
    const TEJAS = ['#b2603f', '#a4553a', '#93503a', '#b8704e', '#7d7873'].map(c => new THREE.Color(c));
    const hs = (a, b, c = 0) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2246822519); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    // una casa: las paredes (w × H × d, el caballete a lo largo de w) y, encima, el tejado de RH de alto con sus hastiales
    const add = (x, z, w, d, H, RH, rot, k) => {
      const r = Math.hypot(x, z) / 1000, b = (Math.atan2(x, -z) * 180 / Math.PI + 360) % 360, y = this.hAtR(b, r) - this.alt - curv(r * 1000) - 2.5;
      Q.setFromAxisAngle(Y, rot);
      MW.push(mx.compose(ps.set(x, y, z), Q, sc.set(w, H + 2.5, d)).clone());
      MR.push(mx.compose(ps.set(x, y + H + 2.5, z), Q, sc.set(w, RH, d)).clone());
      pared.push(PAREDES[Math.floor(k * 977) % PAREDES.length]); teja.push(TEJAS[Math.floor(k * 613) % TEJAS.length]);
    };
    for (const t of list) {
      const id = t.s[2].length * 131 + Math.round(t.km * 1000), an = hs(id, 1) * Math.PI, ca = Math.cos(an), sa = Math.sin(an);
      // (manzanas, calles y casas; en las ciudades, manzanas grandes de bloques de 3 a 7 pisos)
      const B = t.big ? { bx: 90 + hs(id, 2) * 40, by: 70 + hs(id, 3) * 30, st: 8, cw: 22, ch: 16 } : { bx: 48 + hs(id, 2) * 22, by: 36 + hs(id, 3) * 14, st: 4.5, cw: 11, ch: 9 };
      const c = this.pos(t.b, t.km, 0), Rm = t.R * 1000, bx = B.bx, by = B.by, ox = hs(id, 4) * bx, oy = hs(id, 5) * by, cl = t.cl;
      const toW = (lx, ly) => [c.x + lx * ca - ly * sa, c.z + lx * sa + ly * ca];
      // (la iglesia, en el centro: la nave y la torre, la más alta del pueblo)
      { const [x, z] = toW(0, 0); if (Math.hypot(x, z) > CASAS_CERCA * 1.2 && Math.hypot(x, z) < cl * 0.75) { add(x, z, 30, 13, 13, 5, -an + Math.PI / 2, 0.1); const [tx, tz] = toW(10, 17); add(tx, tz, 7, 7, 25, 7, -an, 0.1); } }
      const nx = Math.ceil(Rm / bx) + 1, ny = Math.ceil(Rm / by) + 1;
      for (let i = -nx; i <= nx; i++) for (let j = -ny; j <= ny; j++) {
        const x0 = i * bx - ox, y0 = j * by - oy, court = hs(id + i, j, 7) > (t.big ? 0.3 : 0.55), iw = bx - 2 * B.st, ih = by - 2 * B.st;
        const cx = Math.max(1, Math.round(iw / B.cw)), cy = Math.max(1, Math.round(ih / B.ch)), cw = iw / cx, ch = ih / cy;
        for (let u = 0; u < cx; u++) for (let v = 0; v < cy; v++) {
          if (court && u > 0 && v > 0 && u < cx - 1 && v < cy - 1) continue;
          const lx = x0 + B.st + (u + 0.5) * cw, ly = y0 + B.st + (v + 0.5) * ch, k = hs(id + i * 31 + u, j * 17 + v, 11);
          const dd = Math.hypot(lx, ly) / Rm, cen = 1 - dd * dd;
          if (cen < 0.12 + k * 0.35 || hs(id + u, i + v, 13) < 0.07) continue;   // (las afueras, a trozos, y algún huerto)
          if (Math.abs(lx) < 22 && Math.abs(ly) < 26) continue;   // (el sitio de la iglesia)
          const [x, z] = toW(lx, ly), de = Math.hypot(x, z); if (de < CASAS_CERCA || (de < CASAS_CERCA * 1.25 && hs(v, u, id + 5) > (de - CASAS_CERCA) / (CASAS_CERCA * 0.25))) continue;   // (nada pegado al ojo)
          if (de > cl * 0.75 && hs(u, v, id + 3) < (de - cl * 0.75) / (cl * 0.25)) continue;   // (el final de una ciudad que no cabe entera, a trozos)
          const pisos = t.big ? 3 + Math.floor(k * 4.99) : 1 + (k > 0.35 ? 1 : 0) + (cen > 0.55 && hs(i, j, id) > 0.4 ? 1 : 0), H = 3 + pisos * 2.9;
          const w = cw - 0.6 - hs(u, v, id) * 1.4, d = ch - 0.6;
          // (el caballete, a lo largo del lado largo; el tejado, de unos 40° en las casas y bajo en los bloques de pisos)
          const RH = Math.min(w, d) * (t.big ? 0.16 : 0.4);
          if (w >= d) add(x, z, w, d, H, RH, -an, k); else add(x, z, d, w, H, RH, -an + Math.PI / 2, k);
        }
      }
    }
    if (!MW.length) return [];
    // la casa de 1 × 1 × 1: las cuatro paredes, sin suelo ni techo; el tejado, de y = 0 a 1, con los hastiales (del color
    // de las paredes) y las dos vertientes, que vuelan un poco
    const q = (a, b, c2, d) => [...a, ...b, ...c2, ...a, ...c2, ...d], geo = (v) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); return g; };
    const gW = geo([...q([-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 1, 0.5], [-0.5, 1, 0.5]), ...q([0.5, 0, -0.5], [-0.5, 0, -0.5], [-0.5, 1, -0.5], [0.5, 1, -0.5]),
      ...q([0.5, 0, 0.5], [0.5, 0, -0.5], [0.5, 1, -0.5], [0.5, 1, 0.5]), ...q([-0.5, 0, -0.5], [-0.5, 0, 0.5], [-0.5, 1, 0.5], [-0.5, 1, -0.5])]);
    const gG = geo([0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 1, 0, -0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 1, 0]);
    const gR = geo([...q([-0.54, -0.08, 0.56], [0.54, -0.08, 0.56], [0.54, 1, 0], [-0.54, 1, 0]), ...q([0.54, -0.08, -0.56], [-0.54, -0.08, -0.56], [-0.54, 1, 0], [0.54, 1, 0])]);
    const mat = (rough) => { const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: rough, metalness: 0 }); hazeShader(m, this.alt, o); return m; };
    const out = [[gW, mat(0.95), MW, pared], [gG, mat(0.95), MR, pared], [gR, mat(0.85), MR, teja]].map(([g, m, Ms, cols]) => {
      const im = new THREE.InstancedMesh(g, m, Ms.length);
      for (let i = 0; i < Ms.length; i++) { im.setMatrixAt(i, Ms[i]); im.setColorAt(i, cols[i]); }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); im.frustumCulled = false;
      return im;
    });
    this.nCasas = MW.length;
    return out;
  }
  /** Altura (m) en el anillo j y el rumbo b (grados), interpolada entre rumbos. */
  hAt(j, b) { const NB = this.NB, x = ((b / 360 * NB) % NB + NB) % NB, i = Math.floor(x), f = x - i; return this.H[j * NB + i] * (1 - f) + this.H[j * NB + (i + 1) % NB] * f; }
  /** Primer anillo a r km o más allá. */
  ring(r) { let lo = 0, hi = this.NR - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (this.rs[m] < r) lo = m + 1; else hi = m; } return lo; }
  /** Posición en la escena de un punto de altura h (m) a r km en el rumbo b (grados). */
  pos(b, r, h, out = new THREE.Vector3()) { const a = b * Math.PI / 180, m = r * 1000; return out.set(Math.sin(a) * m, h - this.alt - curv(m), -Math.cos(a) * m); }
  /** Ángulo de elevación (rad) del terreno a r km en el rumbo b. */
  elev(b, j) { const m = this.rs[j] * 1000; return Math.atan2(this.hAt(j, b) - this.alt - curv(m), m); }
  /** La cumbre de verdad cerca de un punto (lo más alto en unos cientos de metros alrededor): { b, r, h }. */
  summit(b, r) {
    const dr = Math.max(0.25, r * 0.03), db = Math.atan(Math.max(0.3, r * 0.02) / r) * 180 / Math.PI;
    let best = { b, r, h: -1e9 };
    for (let j = this.ring(r - dr); j < this.NR && this.rs[j] <= r + dr; j++)
      for (let k = -8; k <= 8; k++) { const bb = b + k * db / 8, h = this.hAt(j, bb); if (h > best.h) best = { b: bb, r: this.rs[j], h }; }
    return best;
  }
  /** ¿Se ve la cumbre (b, r, h)? Lo de delante no la tapa (con un poco de margen). */
  visible(c) {
    const m = c.r * 1000, th = Math.atan2(c.h - this.alt - curv(m), m), j1 = this.ring(c.r * 0.93);
    for (let j = 1; j < j1; j++) for (const k of [-0.15, 0, 0.15]) if (this.elev(c.b + k, j) > th + 0.0004) return false;
    return true;
  }
  /** Los sectores de la malla (cada uno, su geometría) y el material. */
  meshes(mat, NS = 24) {
    const { NB, NR, H, rs } = this, K = NB / NS, C = K + 1;
    // posiciones, normales (de las vecinas en la rejilla) y lo que sobresale cada punto de su alrededor (lomo o barranco)
    const P = new Float32Array(NR * NB * 3);
    for (let j = 0; j < NR; j++) { const m = rs[j] * 1000, cv = curv(m); for (let i = 0; i < NB; i++) { const a = i * TAU / NB, o = (j * NB + i) * 3; P[o] = Math.sin(a) * m; P[o + 1] = H[j * NB + i] - this.alt - cv; P[o + 2] = -Math.cos(a) * m; } }
    const N = new Float32Array(NR * NB * 3), tr = new THREE.Vector3(), tb = new THREE.Vector3(), n = new THREE.Vector3();
    for (let j = 0; j < NR; j++) {
      const jm = Math.max(0, j - 1), jp = Math.min(NR - 1, j + 1);
      for (let i = 0; i < NB; i++) {
        const im = (i - 1 + NB) % NB, ip = (i + 1) % NB, a = (jp * NB + i) * 3, b = (jm * NB + i) * 3, c = (j * NB + ip) * 3, d = (j * NB + im) * 3;
        tr.set(P[a] - P[b], P[a + 1] - P[b + 1], P[a + 2] - P[b + 2]); tb.set(P[c] - P[d], P[c + 1] - P[d + 1], P[c + 2] - P[d + 2]);
        n.crossVectors(tb, tr).normalize(); if (n.y < 0) n.negate();
        const o = (j * NB + i) * 3; N[o] = n.x; N[o + 1] = n.y; N[o + 2] = n.z;
      }
    }
    const T = new Float32Array(NR * NB), w = 3;
    { const row = new Float32Array(NR * NB);   // (media en ±3 anillos y, a lo ancho, en otros tantos metros: cerca, más rumbos)
      for (let j = 0; j < NR; j++) {
        const dr = (rs[Math.min(NR - 1, j + 1)] - rs[Math.max(0, j - 1)]) * 500, ds = rs[j] * 1000 * TAU / NB, wb = Math.max(1, Math.min(40, Math.round(Math.max(3 * dr, 40) / ds)));
        let s = 0; for (let k = -wb; k <= wb; k++) s += H[j * NB + (k + NB) % NB];
        for (let i = 0; i < NB; i++) { row[j * NB + i] = s / (2 * wb + 1); s += H[j * NB + (i + wb + 1) % NB] - H[j * NB + (i - wb + NB) % NB]; }
      }
      for (let j = 0; j < NR; j++) for (let i = 0; i < NB; i++) { let s = 0, c = 0; for (let k = Math.max(0, j - w); k <= Math.min(NR - 1, j + w); k++) { s += row[k * NB + i]; c++; } T[j * NB + i] = H[j * NB + i] - s / c; } }
    const { V, V3 } = this.villages();
    // los triángulos: los mismos para todos los sectores
    const idx = new Uint16Array((NR - 1) * K * 6); let q = 0;
    for (let j = 0; j < NR - 1; j++) for (let c = 0; c < K; c++) { const a = j * C + c, b = a + 1, d = a + C, e = d + 1; idx[q++] = a; idx[q++] = b; idx[q++] = d; idx[q++] = b; idx[q++] = e; idx[q++] = d; }
    const index = new THREE.BufferAttribute(idx, 1), out = [];
    for (let s = 0; s < NS; s++) {
      const pos = new Float32Array(NR * C * 3), nor = new Int8Array(NR * C * 3), tpi = new Float32Array(NR * C), vil = new Uint8Array(NR * C), v3 = new Uint8Array(NR * C);
      for (let j = 0; j < NR; j++) for (let c = 0; c < C; c++) {
        const i = (s * K + c) % NB, src = j * NB + i, dst = j * C + c;
        pos[dst * 3] = P[src * 3]; pos[dst * 3 + 1] = P[src * 3 + 1]; pos[dst * 3 + 2] = P[src * 3 + 2];
        nor[dst * 3] = Math.round(N[src * 3] * 127); nor[dst * 3 + 1] = Math.round(N[src * 3 + 1] * 127); nor[dst * 3 + 2] = Math.round(N[src * 3 + 2] * 127);
        tpi[dst] = T[src]; vil[dst] = Math.round(V[src] * 255); v3[dst] = Math.round(V3[src] * 255);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3, true)); g.setAttribute('aTpi', new THREE.BufferAttribute(tpi, 1)); g.setAttribute('aVil', new THREE.BufferAttribute(vil, 1, true)); g.setAttribute('aV3', new THREE.BufferAttribute(v3, 1, true));
      g.setIndex(index); g.computeBoundingSphere();
      // (cada sector abarca desde el pie del ojo hasta 110 km: su esfera siempre toca el visor y no se descartaba nunca;
      // se eligen a mano por su rumbo: Panorama.look)
      const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.userData.b = (s + 0.5) * TAU / NS; mesh.userData.hw = Math.PI / NS; out.push(mesh);
    }
    return out;
  }
}

/** El material del terreno (texturas por píxel; ver el comentario de arriba). */
export function polarMaterial({ eyeAlt, lat, haze = 1, snow = 9000, hazeColor }) {
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uEyeAlt: { value: eyeAlt }, uLat: { value: lat }, uHazeL: { value: 60000 / Math.max(0.3, haze) }, uSnow: { value: snow }, uHaze: { value: hazeColor.clone() } });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aTpi, aVil, aV3; uniform float uEyeAlt; varying float vTpi, vAlt, vVil, vV3; varying vec3 vWP, vWN;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vTpi = aTpi; vVil = aVil; vV3 = aV3; vWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);
float rr = length(vWP.xz); vAlt = uEyeAlt + vWP.y + rr * rr * ${((1 - KR) / (2 * RT)).toExponential(6)};`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uLat, uHazeL, uSnow; uniform vec3 uHaze; varying float vTpi, vAlt, vVil, vV3; varying vec3 vWP, vWN; float gH = 0.0;
float gh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float gn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(gh(i), gh(i + vec2(1, 0)), f.x), mix(gh(i + vec2(0, 1)), gh(i + vec2(1, 1)), f.x), f.y); }
// (el ruido se queda en su media cuando un píxel abarca más de una celda: sin puntitos ni rayitas en lo que se ve de canto)
float aaf(vec2 p){ return 1.0 - smoothstep(0.4, 1.0, length(fwidth(p))); }
float gnf(vec2 p){ return mix(0.5, gn(p), aaf(p)); }
float fbm(vec2 p){ return gnf(p) * 0.5 + gnf(p * 2.03 + 7.1) * 0.3 + gnf(p * 4.1 - 3.7) * 0.2; }
vec3 L(vec3 c){ return pow(c, vec3(2.2)); }
// (relieve menudo de cerca: la normal, torcida como mucho unos 30° y nada donde se ve muy de canto)
vec3 bumpN(vec3 sp, vec3 n, float H){
  vec3 sx = dFdx(sp), sy = dFdy(sp), r1 = cross(sy, n), r2 = cross(n, sx); float det = dot(sx, r1), ad = abs(det);
  vec3 g = sign(det) * (dFdx(H) * r1 + dFdy(H) * r2) * smoothstep(0.08, 0.25, abs(dot(normalize(sp), n)));
  float gl = length(g); if (gl > ad * 0.6) g *= ad * 0.6 / gl;
  return normalize(ad * n - g);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec2 P = vWP.xz; float dist = length(vWP - cameraPosition);
  vec3 N = normalize(vWN); float ang = degrees(acos(clamp(N.y, 0.0, 1.0))), north = -N.z;
  vec2 Q = mat2(0.8, -0.6, 0.6, 0.8) * P;
  float n0 = fbm(Q / 2600.0), n1 = fbm(Q / 700.0 + 3.1), n2 = gnf(P / 160.0), n3 = gnf(P / 45.0 + 5.3), n4 = gnf(P / 12.0 + 1.7);
  float wet = smoothstep(42.55, 43.0, uLat - vWP.z / 111200.0 + (n0 - 0.5) * 0.15);   // (más verde al norte, en la vertiente atlántica)
  float alt = vAlt + (n0 - 0.5) * 160.0, lowK = 1.0 - smoothstep(800.0, 1100.0, alt), flatK = 1.0 - smoothstep(4.0, 10.0, ang);
  // abajo, prados (verdes en lo húmedo, pajizos en lo seco) y campos de cereal en lo llano; arriba, pasto de montaña
  vec3 meadow = mix(L(vec3(0.62, 0.60, 0.36)), L(vec3(0.44, 0.55, 0.25)), wet);
  vec3 cereal = mix(L(vec3(0.76, 0.67, 0.42)), L(vec3(0.55, 0.59, 0.30)), smoothstep(0.35, 0.65, n2));
  vec3 col = mix(meadow, cereal, (1.0 - wet * 0.75) * flatK * lowK * smoothstep(0.42, 0.58, n1 + 0.08));
  col = mix(col, L(vec3(0.66, 0.64, 0.42)), smoothstep(1350.0, 1700.0, alt));
  // (matas, helechales y calvas en el pasto)
  col = mix(col, col * vec3(0.78, 0.86, 0.7), smoothstep(0.55, 0.75, n2) * 0.6);
  col = mix(col, L(vec3(0.62, 0.55, 0.42)), smoothstep(0.7, 0.85, n3) * 0.35 * (1.0 - lowK * flatK));
  col *= 0.86 + 0.28 * (n2 * 0.5 + n3 * 0.3 + n4 * 0.2);
  // parcelas con sus lindes, cerca y en lo llano (solo donde las hay: es lo que más cuesta)
  float fk = flatK * lowK * (1.0 - wet * 0.5) * (1.0 - smoothstep(3000.0, 9000.0, dist)) * smoothstep(250.0, 600.0, dist), fwP = length(fwidth(P));
  if (fk > 0.001) {
  vec2 g0 = floor(P / 520.0), rid = g0; float d1 = 1e9, d2 = 1e9;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = g0 + vec2(x, y), c = (g + 0.15 + 0.7 * vec2(gh(g), gh(g + 9.1))) * 520.0; float d = length(P - c);
    if (d < d1) { d2 = d1; d1 = d; rid = g; } else if (d < d2) d2 = d;
  }
  float reg = gh(rid + 0.5), an = reg * 3.1416; vec2 qq = mat2(cos(an), -sin(an), sin(an), cos(an)) * P;
  vec2 sz = vec2(70.0 + reg * 90.0, 40.0 + gh(rid + 3.0) * 50.0), cid = floor(qq / sz); float hc = gh(cid + reg * 17.0);
  vec3 crop = hc < 0.3 ? L(vec3(0.80, 0.70, 0.43)) : hc < 0.55 ? L(vec3(0.46, 0.57, 0.27)) : hc < 0.7 ? L(vec3(0.58, 0.46, 0.32)) : hc < 0.85 ? L(vec3(0.56, 0.63, 0.33)) : L(vec3(0.70, 0.64, 0.38));
  float lind = 1.0 - smoothstep(1.5, 4.0, (d2 - d1) * 0.5);
  crop = mix(crop, L(vec3(0.60, 0.56, 0.46)), lind * 0.45 * (1.0 - smoothstep(0.6, 1.2, fwP / 4.0)));
  col = mix(col, crop * (0.92 + 0.16 * n4), fk * 0.85);
  }
  // bosque: hasta unos 1.650 m (más arriba en las umbrías), en las laderas, en lo húmedo y en los barrancos; nada en los
  // cortados ni casi en lo llano cultivado de abajo. Hayas, pinos arriba y en lo seco, encinas y quejigos abajo en el sur
  float tl = 1650.0 + north * 120.0 + (n0 - 0.5) * 300.0;
  float fx = 0.5 * (1.0 - smoothstep(tl - 150.0, tl + 60.0, vAlt)) * smoothstep(250.0, 550.0, vAlt + wet * 300.0)
    + 0.22 * smoothstep(6.0, 18.0, ang) - 0.6 * smoothstep(34.0, 46.0, ang) + 0.18 * clamp(north * 3.0, -1.0, 1.0) * smoothstep(3.0, 12.0, ang)
    + wet * 0.2 - 0.3 * lowK * flatK - clamp(vTpi / 120.0, -0.12, 0.12) + (fbm(Q / 420.0 + 11.0) - 0.5) * 0.75;
  // (copas: cerca, árbol a árbol, de unos 8 m; el borde del bosque, con árboles sueltos)
  vec2 tc = P / 8.0, ti = floor(tc), tf2 = fract(tc) - 0.5 - (vec2(gh(ti), gh(ti + 3.3)) - 0.5) * 0.6;
  float tree = (1.0 - smoothstep(0.15, 0.5, length(tf2))) * aaf(tc * 2.0), crowns = mix(n3 * 0.6 + n2 * 0.4, tree * 0.8 + n4 * 0.2, aaf(tc * 2.0));
  float ex = fwidth(fx), fo = smoothstep(0.45 - ex, 0.51 + ex, fx + (tree - 0.4) * 0.12 * aaf(tc * 2.0));
  vec3 fc = mix(L(vec3(0.19, 0.29, 0.12)), L(vec3(0.12, 0.19, 0.11)), smoothstep(1150.0, 1450.0, vAlt) * (1.0 - wet * 0.4));
  fc = mix(fc, L(vec3(0.25, 0.27, 0.14)), (1.0 - wet) * (1.0 - smoothstep(650.0, 950.0, vAlt)));
  fc *= 0.62 + 0.7 * crowns;
  col = mix(col, fc, fo);
  // roca en los cortados (más de unos 38°) y en lo más alto, con estratos y grietas; canchales al pie
  float rk = max(smoothstep(31.0, 47.0, ang + (n2 - 0.5) * 22.0), smoothstep(1900.0, 2250.0, alt + (n1 - 0.5) * 220.0) * (0.55 + 0.45 * clamp(vTpi / 30.0, 0.0, 1.0)));
  vec3 rock = mix(L(vec3(0.50, 0.48, 0.45)), L(vec3(0.74, 0.72, 0.67)), smoothstep(0.35, 0.65, gnf(Q / 6000.0 + 2.0) + wet * 0.2));
  // (en la pared, a lo largo y en altura: las dos proyecciones verticales mezcladas según hacia dónde mira; sin saltos)
  float wx = N.x * N.x / max(1e-4, N.x * N.x + N.z * N.z), wz = 1.0 - wx;
  float streak = (gnf(vec2(P.y / 9.0, vAlt / 70.0)) * 0.6 + gnf(vec2(P.y / 3.5, vAlt / 30.0)) * 0.4) * wx
    + (gnf(vec2(P.x / 9.0, vAlt / 70.0)) * 0.6 + gnf(vec2(P.x / 3.5, vAlt / 30.0)) * 0.4) * wz;   // chorreras
  float block = gnf(vec2(P.y / 28.0, vAlt / 14.0)) * wx + gnf(vec2(P.x / 28.0, vAlt / 14.0)) * wz;
  float band = 1.0 + 0.08 * sin(vAlt * 0.11 + n1 * 5.0) * (1.0 - smoothstep(0.8, 2.5, fwidth(vAlt * 0.11)));
  rock *= (0.78 + 0.34 * streak) * (0.88 + 0.24 * block) * band;
  float sc = smoothstep(24.0, 31.0, ang) * (1.0 - rk) * smoothstep(1100.0, 1500.0, vAlt) * (1.0 - fo);
  col = mix(col, L(vec3(0.56, 0.54, 0.50)) * (0.85 + 0.3 * n4), sc * 0.75);
  col = mix(col, rock, rk * (1.0 - fo * 0.6));
  // nieve: por encima de su cota (más baja en las umbrías y en los barrancos), no en lo muy empinado
  float sx = vAlt - (uSnow - north * 250.0 + (n1 - 0.5) * 220.0 - clamp(vTpi, -60.0, 0.0) * 1.5), es = fwidth(sx);
  float sn = smoothstep(-es, 120.0 + es, sx) * (1.0 - smoothstep(42.0, 55.0, ang));
  col = mix(col, L(vec3(0.93, 0.95, 0.98)) * (0.92 + 0.08 * n3), sn * (1.0 - fo * 0.4));
  // pueblos y ciudades: tejados (teja rojiza, alguna gris), fachadas claras y calles; de lejos, una mancha de su color
  float vk = smoothstep(0.08, 0.45, vVil) * (1.0 - smoothstep(30.0, 42.0, ang));
  if (vk > 0.001) {
    // (barrios con su orientación; en cada uno, manzanas de 35 a 70 m con calles y patios; en cada manzana, casas de 9 a
    // 13 m con su tejado a dos aguas: una vertiente más clara que la otra)
    float an = gh(floor(P / 700.0) + 2.0) * 3.1416; vec2 q2 = mat2(cos(an), -sin(an), sin(an), cos(an)) * P;
    vec2 bs = vec2(48.0, 36.0) + gh(floor(P / 700.0)) * vec2(22.0, 14.0), bl = q2 / bs, bi = floor(bl), bf = fract(bl);
    float street = step(4.5 / bs.x, bf.x) * step(bf.x, 1.0 - 4.5 / bs.x) * step(4.5 / bs.y, bf.y) * step(bf.y, 1.0 - 4.5 / bs.y);
    vec2 lc = (bf * bs) / vec2(11.0, 9.0) + gh(bi) * 3.0, li = floor(lc), lf = fract(lc); float hb = gh(li + bi * 7.0);
    float court = step(0.25, min(min(bf.x, 1.0 - bf.x), min(bf.y, 1.0 - bf.y))) * step(0.55, gh(bi + 1.7));   // (patio en medio de la manzana)
    vec3 roof = hb < 0.6 ? L(vec3(0.68, 0.37, 0.27)) : hb < 0.78 ? L(vec3(0.56, 0.31, 0.23)) : hb < 0.9 ? L(vec3(0.47, 0.45, 0.43)) : L(vec3(0.84, 0.82, 0.77));
    roof *= mix(0.78, 1.04, step(0.5, lf.y)) * mix(0.82, 1.0, step(0.06, min(lf.x, 1.0 - lf.x)));
    vec3 town = mix(L(vec3(0.50, 0.50, 0.50)), mix(roof, L(vec3(0.40, 0.46, 0.30)), court), street);
    town = mix(L(vec3(0.60, 0.47, 0.40)), town, 1.0 - smoothstep(0.4, 1.0, fwP * 0.12));   // (de lejos, la mezcla de tejados y calles)
    // (en los pueblos con casas de verdad encima, el suelo es solo de calles, plazas y patios con algo de verde)
    vec3 suelo = mix(L(vec3(0.56, 0.54, 0.50)), L(vec3(0.42, 0.47, 0.31)), step(0.62, gh(floor(P / 13.0) + 4.0)) * 0.8);
    town = mix(town, suelo * (0.92 + 0.12 * n4), smoothstep(0.04, 0.25, vV3));
    col = mix(col, town, vk);
  }
  // los lomos, algo más claros, y los barrancos, más oscuros: se leen las formas del monte
  col *= 1.0 + clamp(vTpi / 35.0, -1.0, 1.0) * 0.15;
  // sombras de nubes
  col *= 0.82 + 0.18 * smoothstep(0.3, 0.62, gnf(P / 5200.0 + 3.0));
  diffuseColor.rgb = col;
  gH = (n3 * 6.0 + n2 * 10.0 + rk * block * 4.0 + fo * tree * 4.0) * (1.0 - smoothstep(2000.0, 6000.0, dist));
}`)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
  normal = bumpN(-vViewPosition, normal, gH);`)
      .replace('#include <fog_fragment>', `{
  // bruma: crece con la distancia real; en lo alto el aire está más limpio
  float d = length(vWP - cameraPosition), k = (1.0 - exp(-d / uHazeL)) * mix(1.0, 0.75, smoothstep(800.0, 2400.0, vAlt));
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, clamp(k, 0.0, 0.82));
}`);
  };
  return mat;
}

/** Rótulo de un monte: el nombre y la altitud, con una raya hasta la cumbre (el punto de anclaje es su pie). */
export function labelTex(name, altitude) {
  const c = document.createElement('canvas'), g = c.getContext('2d'), F = 'Nunito, sans-serif';
  g.font = `800 34px ${F}`; const w1 = g.measureText(name).width; g.font = `700 26px ${F}`; const w2 = g.measureText(`${altitude} m`).width;
  c.width = Math.ceil(Math.max(w1, w2) + 28); c.height = 120;
  g.textAlign = 'center'; g.lineJoin = 'round'; g.strokeStyle = 'rgba(12,16,28,0.85)'; g.fillStyle = '#ffffff';
  g.font = `800 34px ${F}`; g.lineWidth = 7; g.strokeText(name, c.width / 2, 34); g.fillText(name, c.width / 2, 34);
  g.font = `700 26px ${F}`; g.fillStyle = '#ffe6a8'; g.lineWidth = 6; g.strokeText(`${altitude.toLocaleString('es')} m`, c.width / 2, 66); g.fillText(`${altitude.toLocaleString('es')} m`, c.width / 2, 66);
  g.strokeStyle = 'rgba(12,16,28,0.7)'; g.lineWidth = 5; g.beginPath(); g.moveTo(c.width / 2, 78); g.lineTo(c.width / 2, 118); g.stroke();
  g.strokeStyle = '#ffffff'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(c.width / 2, 78); g.lineTo(c.width / 2, 118); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return { tex: t, w: c.width, h: c.height };
}

/** Los montes conocidos que se ven desde el mirador (sin los de la misión): [{ m, b, r, h }], de más a menos vistosos. */
export function montesVisibles(grid, conocidos, skip) {
  const out = [];
  for (const m of conocidos) {
    if (skip.has(m.id) || !m.lat) continue;
    const { km, bearing } = rel(grid.lat, grid.lon, m.lat, m.lon);
    if (km < 2 || km > (m.altitude > 2000 ? 105 : 70)) continue;
    const c = grid.summit(bearing, km);
    if (grid.visible(c)) out.push({ m, ...c, pri: m.altitude / Math.sqrt(km) });
  }
  return out.sort((a, b) => b.pri - a.pri).slice(0, 40);
}

/** Aves de la comarca volando delante del mirador: [{ id, obj, … }] (update las mueve). */
export function panoBirds(scene, grid, kinds, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const id = kinds[i % kinds.length], o = bird(id), low = id === 'milano' || id === 'ciguena';
    // (más grandes que en la realidad, para que con los prismáticos se vean bien sus colores y su silueta)
    o.scale.setScalar(id === 'ciguena' || id === 'milano' ? 2.6 : 3); scene.add(o);
    // alrededor del mirador, entre 100 y 450 m, sobre lo que haya debajo (los buitres, más arriba)
    const b = (i * 137.5 + 20) % 360, r = 0.1 + ((i * 0.37) % 1) * 0.35, j = grid.ring(r);
    // (por encima del ojo, entre 18° y 39°: desde abajo se ve la silueta con las alas abiertas, como en la realidad)
    const gy = grid.hAt(j, b) - grid.alt - curv(r * 1000), c = grid.pos(b, r, 0); c.y = Math.max(gy + (low ? 40 : 90), r * 1000 * Math.tan((18 + (i % 4) * 7) * Math.PI / 180));
    out.push({ id, obj: o, c, r: (low ? 30 : 40) + (i % 5) * 10, a: i * 1.7, w: (low ? 0.24 : 0.17) * (i % 2 ? 1 : -1), flapK: o.userData.flap, pos: o.position });
  }
  return out;
}
export function moveBirds(list, dt, t) {
  for (const v of list) {
    v.a += v.w * dt;
    v.obj.position.set(v.c.x + Math.cos(v.a) * v.r, v.c.y + Math.sin(v.a * 2) * 4, v.c.z + Math.sin(v.a) * v.r);
    v.obj.rotation.set(0, v.w > 0 ? -v.a : -v.a + Math.PI, v.w > 0 ? 0.35 : -0.35);
    const k = v.flapK ?? 0.1, burst = Math.max(0, Math.sin(t * 0.35 + v.a * 3)) > 0.85 ? 1 : 0.15, f = Math.sin(t * (4 + k * 8) + v.a * 5) * k * 3 * burst;
    v.obj.userData.wl.rotation.z = f; v.obj.userData.wr.rotation.z = -f;
  }
}
