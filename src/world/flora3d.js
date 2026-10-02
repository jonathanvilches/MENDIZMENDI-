// Modelos 3D de la flora de Navarra (src/data/flora.js), uno por especie y hechos para reconocerla: el porte del árbol
// (copa ovalada del haya, pisos del abeto, columna del chopo, ramas que cuelgan del sauce, tronco anaranjado del pino
// silvestre…), sus colores y, de cerca, su flor o su fruto (el erizo del castaño, las bolitas rojas del acebo, la
// estrella plateada del eguzkilore, las campanas de la digital…). Todo es geometría con el color en cada vértice: una
// sola malla y una llamada de dibujo por ejemplar, sin texturas.
//   floraModel(id, seed) → THREE.Group listo para poner en el mundo (los pies en y = 0)
//   floraPortrait(id) → promesa de la imagen (data URL) del ejemplar para su ficha
import { FILL_DECL, useFill } from '../engine/charLight.js';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FLORA } from '../data/flora.js';
import { offscreen, offscreenCanvas } from '../util/offscreen.js';

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const C = (hex) => new THREE.Color(hex);
const _c = new THREE.Color(), _v = new THREE.Vector3(), _n = new THREE.Vector3();

// pinta cada vértice (fn recibe la posición, la normal y el color a rellenar) y deja la geometría sin índices
function paint(g, fn) {
  g = g.index ? g.toNonIndexed() : g;
  if (!g.attributes.normal) g.computeVertexNormals();
  const P = g.attributes.position, N = g.attributes.normal, col = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) { _v.fromBufferAttribute(P, i); _n.fromBufferAttribute(N, i); fn(_v, _n, _c); col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (g.attributes.uv) g.deleteAttribute('uv');
  return g;
}
const solid = (g, hex, vary = 0, rnd = Math.random) => { const c = C(hex); return paint(g, (p, n, o) => { const k = 1 + (rnd() - 0.5) * vary; o.copy(c).multiplyScalar(k); }); };
// bulto de follaje: icosaedro deformado, más claro arriba y hacia fuera, más oscuro dentro y abajo
function blob(r, x, y, z, c1, c2, rnd, { sy = 1, detail = 1, jit = 0.22, cx = x, cy = y, cz = z, bl = null } = {}) {
  const g = new THREE.IcosahedronGeometry(r, detail), P = g.attributes.position;
  // el mismo desplazamiento para los vértices que coinciden (sin grietas) y la normal casi radial (follaje suave, sin facetas)
  const seen = new Map();
  for (let i = 0; i < P.count; i++) { _v.fromBufferAttribute(P, i); const key = `${_v.x.toFixed(3)},${_v.y.toFixed(3)},${_v.z.toFixed(3)}`; if (!seen.has(key)) seen.set(key, 1 + (rnd() - 0.5) * 2 * jit); const k = seen.get(key); P.setXYZ(i, _v.x * k, _v.y * k * sy, _v.z * k); }
  g.computeVertexNormals();
  const N = g.attributes.normal;
  for (let i = 0; i < P.count; i++) { _v.fromBufferAttribute(P, i); _n.fromBufferAttribute(N, i); _v.y /= sy; _v.normalize().multiplyScalar(0.75).addScaledVector(_n, 0.25).normalize(); N.setXYZ(i, _v.x, _v.y, _v.z); }
  g.translate(x, y, z);
  bl?.push({ r, x, y, z, sy });
  const a = C(c1), b = C(c2);
  return paint(g, (p, n, o) => {
    // luz de cielo: arriba y hacia fuera del centro de la copa, el color claro
    const out = _v.set(p.x - cx, (p.y - cy) * 0.6, p.z - cz).normalize().dot(n);
    const t = THREE.MathUtils.clamp(0.35 + n.y * 0.35 + out * 0.25 + (rnd() - 0.5) * 0.25, 0, 1);
    o.copy(a).lerp(b, t);
  });
}
// tronco: cilindro que se estrecha, opcionalmente torcido y con la corteza de arriba de otro color
function trunkGeo(h, r, bark, rnd, { top = null, twist = 0, lean = 0, x = 0, z = 0, segs = 7 } = {}) {
  const g = new THREE.CylinderGeometry(r * 0.55, r, h, segs, 6, false), P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    _v.fromBufferAttribute(P, i); const t = (_v.y + h / 2) / h;
    const off = twist ? Math.sin(t * 5 + 1) * r * 1.2 * twist : 0;
    P.setXYZ(i, _v.x + off + lean * t * h, _v.y, _v.z + (twist ? Math.cos(t * 4) * r * 0.8 * twist : 0));
  }
  g.translate(x, h / 2, z); g.computeVertexNormals();
  const a = C(bark), b = top ? C(top) : null;
  return paint(g, (p, n, o) => { const t = p.y / h; o.copy(a).multiplyScalar(0.85 + (rnd() - 0.5) * 0.25 + (n.x + n.z) * 0.06); if (b && t > 0.45) o.lerp(b, Math.min(1, (t - 0.45) * 2.2)); });
}
const branch = (x0, y0, z0, x1, y1, z1, r, bark, rnd) => {
  const d = new THREE.Vector3(x1 - x0, y1 - y0, z1 - z0), L = d.length(), g = new THREE.CylinderGeometry(r * 0.5, r, L, 5);
  g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(x0, y0, z0);
  return solid(g, bark, 0.2, rnd);
};
// un punto de la superficie del follaje (de uno de sus bultos, más a menudo de los grandes y de la parte de arriba)
const _sp = new THREE.Vector3(), _sn = new THREE.Vector3();
function surface(bl, rnd, top = 0.4) {
  let tot = 0; for (const b of bl) tot += b.r * b.r; let t = rnd() * tot, b = bl[0];
  for (const q of bl) { t -= q.r * q.r; if (t <= 0) { b = q; break; } }
  _sn.set(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize(); if (_sn.y < 0 && rnd() < top) _sn.y = -_sn.y;
  _sp.set(b.x + _sn.x * b.r * 0.98, b.y + _sn.y * b.r * b.sy * 0.98, b.z + _sn.z * b.r * 0.98);
  return { p: _sp, n: _sn };
}
// frutos, bayas o flores pequeñas sobre el follaje: bolitas o flores de cinco pétalos con su centro
function dots(n, bl, size, hex, rnd, { top = 0.4, shape = 'ball', center = '#f2d860', lift = 0.06 } = {}) {
  const out = [], c = C(hex), parts = [];
  if (!bl?.length) return out;
  for (let i = 0; i < n; i++) {
    const { p, n: nn } = surface(bl, rnd, top);
    p.addScaledVector(nn, lift * (0.5 + rnd()));   // por encima de la capa de hojas
    if (shape === 'flower') {
      const g = new THREE.CircleGeometry(size, 5); g.lookAt(nn); g.translate(p.x + nn.x * 0.01, p.y + nn.y * 0.01, p.z + nn.z * 0.01);
      parts.push(solid(g, '#' + c.clone().multiplyScalar(0.9 + rnd() * 0.2).getHexString(), 0.08, rnd));
      const cg = new THREE.IcosahedronGeometry(size * 0.28, 0); cg.translate(p.x + nn.x * size * 0.2, p.y + nn.y * size * 0.2, p.z + nn.z * size * 0.2); parts.push(solid(cg, center));
    } else { const g = new THREE.IcosahedronGeometry(size, 0); g.translate(p.x, p.y, p.z); parts.push(solid(g, '#' + c.clone().multiplyScalar(0.85 + rnd() * 0.3).getHexString(), 0.1, rnd)); }
  }
  if (parts.length) out.push(mergeGeometries(parts.map(g => g.index ? g.toNonIndexed() : g)));
  return out;
}
// racimos de hojas sobre la copa: rombos pequeños medio tumbados hacia fuera, de varios verdes (la copa deja de ser un
// bulto liso y se ve hecha de hojas)
function leaves(n, bl, size, c1, c2, rnd, { long = 1 } = {}) {
  const pos = [], col = [], a = C(c1), b = C(c2), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 0, 1), v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const { p, n: nn } = surface(bl, rnd, 0.5), s = size * (0.7 + rnd() * 0.6), L = s * long;
    // asomando un poco por fuera del bulto y muy inclinadas: el borde de la copa se ve hecho de hojas
    p.addScaledVector(nn, L * (0.15 + rnd() * 0.45));
    v.copy(nn).multiplyScalar(0.6).add(_v.set(rnd() - 0.5, rnd() - 0.3, rnd() - 0.5).multiplyScalar(1.6)).normalize(); q.setFromUnitVectors(up, v);
    const rot = rnd() * Math.PI, pts = [[0, -L], [s * 0.5, 0], [0, L], [-s * 0.5, 0]].map(([x, y]) => new THREE.Vector3(x * Math.cos(rot) - y * Math.sin(rot), x * Math.sin(rot) + y * Math.cos(rot), 0).applyQuaternion(q).add(p));
    const t = THREE.MathUtils.clamp(0.25 + nn.y * 0.35 + rnd() * 0.5, 0, 1); _c.copy(a).lerp(b, t);
    for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(pts[k].x, pts[k].y, pts[k].z); col.push(_c.r, _c.g, _c.b); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  // la luz de las hojas, como la de la copa (hacia fuera), para que no parpadeen según de qué lado se miren
  const N = g.attributes.normal; for (let i = 0; i < N.count; i++) { _n.fromBufferAttribute(N, i); if (_n.y < 0) N.setXYZ(i, -_n.x, -_n.y, -_n.z); }
  return g;
}

// ---------------------------------------------------------------- árboles
function tree(m, rnd) {
  const parts = [], bl = [], H = m.h, cw = m.cw / 2, ch = m.ch / 2, c1 = m.c1, c2 = m.c2;
  const conifer = m.crown === 'cone' || m.crown === 'tiers' || m.crown === 'column' || m.crown === 'pinecone';
  const crownY = { cone: H * 0.06, pinecone: H * 0.18, tiers: H * 0.1, column: H * 0.1, umbrella: H - m.ch * 0.8, weeping: H * 0.45, willow: H * 0.35, dense: H * 0.3 }[m.crown] ?? (H - m.ch * 0.92);
  const cy = conifer ? crownY + (H - crownY) / 2 : crownY + ch;
  // tronco (o varios, en el avellano)
  const stems = m.stems || 1;
  if (stems > 1) for (let i = 0; i < stems; i++) { const a = i / stems * Math.PI * 2 + rnd(), lean = 0.08 + rnd() * 0.08; parts.push(trunkGeo(H * (0.7 + rnd() * 0.25), m.tr, m.trunk, rnd, { lean: Math.cos(a) * lean, x: Math.cos(a) * 0.15, z: Math.sin(a) * 0.15, segs: 5 })); }
  else parts.push(trunkGeo(conifer ? H * 0.92 : crownY + ch * 0.6, m.tr * 1.25, m.trunk, rnd, { top: m.top, twist: m.twist || 0, segs: 9 }));
  // ramas principales que entran en la copa
  if (!conifer && stems === 1) {
    const n = m.crown === 'umbrella' ? 6 : 5;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rnd() * 0.6, y0 = crownY + ch * 0.1 * rnd() - (m.crown === 'umbrella' ? ch * 0.6 : 0); parts.push(branch(0, y0, 0, Math.cos(a) * cw * 0.6, y0 + ch * (0.6 + rnd() * 0.5), Math.sin(a) * cw * 0.6, m.tr * 0.5, m.trunk, rnd)); }
  }
  const B = (r, x, y, z, o) => parts.push(blob(r, x, y, z, c1, c2, rnd, { cx: 0, cy, cz: 0, bl, ...o }));
  const ring = (t) => C(c1).lerp(C(c2), t);
  switch (m.crown) {
    case 'ovoid': case 'round': case 'dense': case 'airy': case 'irregular': case 'willow': {
      const n = { ovoid: 15, round: 17, dense: 22, airy: 10, irregular: 13, willow: 14 }[m.crown], rr = { ovoid: 0.42, round: 0.42, dense: 0.46, airy: 0.33, irregular: 0.4, willow: 0.4 }[m.crown];
      for (let i = 0; i < n; i++) {
        const u = rnd() * Math.PI * 2, v = Math.acos(1 - 2 * rnd()), s = m.crown === 'dense' ? 0.55 : 0.62, ir = m.crown === 'irregular' ? 1.15 : 1;
        const x = Math.sin(v) * Math.cos(u) * cw * s * ir, y = cy + Math.cos(v) * ch * s * (m.crown === 'round' ? 0.85 : 1), z = Math.sin(v) * Math.sin(u) * cw * s * ir;
        B(Math.min(cw, ch) * rr * (0.75 + rnd() * 0.5) * (m.crown === 'irregular' ? (rnd() < 0.3 ? 0.6 : 1.15) : 1), x, y, z, { detail: 2, jit: m.crown === 'dense' ? 0.1 : 0.16 });
      }
      B(Math.min(cw, ch) * 0.62, 0, cy, 0, { detail: 2, jit: 0.08 });   // núcleo (sin huecos que dejen ver el cielo)
      if (m.crown === 'willow') {
        // ramillas finas que caen por fuera de la copa
        for (let i = 0; i < 30; i++) {
          const a = rnd() * Math.PI * 2, r = cw * (0.8 + rnd() * 0.2), top = cy + (rnd() - 0.2) * ch * 0.6, len = 1.2 + rnd() * 1.8;
          const g = new THREE.PlaneGeometry(0.22, len, 1, 4); g.translate(0, -len / 2, 0);
          const P = g.attributes.position; for (let k = 0; k < P.count; k++) { _v.fromBufferAttribute(P, k); const t = -_v.y / len; P.setZ(k, t * t * 0.5); }
          g.rotateY(-a + Math.PI / 2); g.translate(Math.cos(a) * r, top, Math.sin(a) * r); g.computeVertexNormals();
          parts.push(paint(g, (p, nn, o) => o.copy(ring(0.45 + rnd() * 0.55))));
        }
      }
      break;
    }
    case 'cone': {
      for (let i = 0; i < 6; i++) { const t = i / 6, r = cw * (1 - t * 0.85), y = crownY + (H - crownY) * t * 0.9 + 0.4; const g = new THREE.ConeGeometry(r, (H - crownY) * 0.32, 9, 1, true); g.translate(0, y + (H - crownY) * 0.16, 0); g.computeVertexNormals(); parts.push(paint(g, (p, n, o) => o.copy(ring(THREE.MathUtils.clamp(0.4 + n.y * 0.4 + (rnd() - 0.5) * 0.3, 0, 1))))); }
      break;
    }
    case 'pinecone': {
      // pino negro: copa estrecha hecha de mechones oscuros apiñados, irregular, con el tronco gris a la vista abajo
      const n = 22;
      for (let i = 0; i < n; i++) { const t = i / (n - 1), w = cw * (1 - t * 0.8) * (0.7 + rnd() * 0.5), a = rnd() * Math.PI * 2; B(cw * (0.42 - t * 0.22) + 0.25, Math.cos(a) * w * 0.55, crownY + (H - crownY) * t * 0.95, Math.sin(a) * w * 0.55, { sy: 0.75, detail: 1, jit: 0.25 }); }
      break;
    }
    case 'tiers': {
      // abeto: pisos de ramas planos y bien separados que caen en la punta, cada vez más cortos hacia arriba; por debajo
      // más oscuros (las agujas tienen dos rayas blancas por el envés: a lo lejos el abeto se ve verde azulado)
      const n = 11;
      for (let i = 0; i < n; i++) {
        const t = i / n, r = (cw * (1 - t * 0.9) + 0.2) * (0.9 + rnd() * 0.2), y = crownY + (H - crownY) * t, hh = (H - crownY) / n * 1.15;
        const g = new THREE.ConeGeometry(r, hh, 12, 2, true), P = g.attributes.position;
        for (let k = 0; k < P.count; k++) { _v.fromBufferAttribute(P, k); const d = Math.hypot(_v.x, _v.z) / r, ang = Math.atan2(_v.z, _v.x); P.setXYZ(k, _v.x * (1 + Math.sin(ang * 6) * 0.08), _v.y - d * d * 0.45, _v.z * (1 + Math.sin(ang * 6) * 0.08)); }
        g.translate(0, y + hh * 0.5, 0); g.computeVertexNormals();
        parts.push(paint(g, (p, nn, o) => o.copy(ring(THREE.MathUtils.clamp(0.25 + nn.y * 0.55 + (rnd() - 0.5) * 0.2, 0, 1)))));
      }
      const tip = new THREE.ConeGeometry(0.12, 1.2, 6); tip.translate(0, H + 0.5, 0); parts.push(solid(tip, c1));
      break;
    }
    case 'column': {
      for (let i = 0; i < 16; i++) { const t = i / 15, w = cw * Math.sin(Math.PI * (0.12 + t * 0.8)) * (0.85 + rnd() * 0.3); B(Math.max(0.7, w * 0.8), (rnd() - 0.5) * w * 0.6, crownY + (H - crownY) * t, (rnd() - 0.5) * w * 0.6, { sy: 1.5, detail: 2, jit: 0.15 }); }
      break;
    }
    case 'umbrella': {
      // pinos: la copa arriba, en mechones aplastados, ancha e irregular
      for (let i = 0; i < 11; i++) { const a = rnd() * Math.PI * 2, r = rnd() * cw * 0.75; B(cw * (0.3 + rnd() * 0.15), Math.cos(a) * r, cy + (rnd() - 0.4) * ch * 0.7, Math.sin(a) * r, { sy: 0.6, detail: 1, jit: 0.25 }); }
      break;
    }
    case 'weeping': {
      for (let i = 0; i < 9; i++) { const a = rnd() * Math.PI * 2, r = rnd() * cw * 0.5; B(cw * 0.42, Math.cos(a) * r, cy + ch * 0.3 + rnd() * ch * 0.4, Math.sin(a) * r, { sy: 0.7, detail: 2 }); }
      break;
    }
  }
  // hojas: de las frondosas, rombos; de los pinos, mechones alargados de agujas
  const broad = ['ovoid', 'round', 'dense', 'airy', 'irregular', 'willow', 'weeping'].includes(m.crown);
  if (broad) parts.push(leaves(m.crown === 'airy' ? 700 : 1000, bl, m.leaf || (m.crown === 'dense' ? 0.24 : 0.34), c1, c2, rnd, { long: m.crown === 'willow' ? 2.6 : 1.25 }));
  else if (m.crown === 'umbrella' || m.crown === 'pinecone') parts.push(leaves(700, bl, 0.1, c1, c2, rnd, { long: 3.6 }));
  // frutos: bellotas, erizos, piñas, bolitas
  if (m.fruit) parts.push(...dots(m.crown === 'dense' ? 80 : 55, bl, m.crown === 'round' ? 0.16 : 0.11, m.fruit, rnd, { top: 0.2, lift: 0.18 }));
  return parts;
}

// ---------------------------------------------------------------- arbustos
function shrub(m, rnd) {
  const parts = [], bl = [], w = m.w / 2, h = m.h;
  const B = (r, x, y, z, o) => parts.push(blob(r, x, y, z, m.c1, m.c2, rnd, { cx: 0, cy: h * 0.45, cz: 0, bl, ...o }));
  let leafN = 260, leafS = Math.max(0.035, w * 0.09), leafL = 1.2;
  switch (m.form) {
    case 'mound': for (let i = 0; i < 11; i++) { const a = rnd() * 6.28, r = rnd() * w * 0.6; B(w * 0.45, Math.cos(a) * r, h * 0.35 + rnd() * h * 0.2, Math.sin(a) * r, { sy: h / w * 1.1, detail: 2, jit: 0.14 }); } break;
    case 'round': for (let i = 0; i < 12; i++) { const a = rnd() * 6.28, r = rnd() * w * 0.4; B(w * 0.5, Math.cos(a) * r, h * 0.5 + (rnd() - 0.5) * h * 0.3, Math.sin(a) * r, { detail: 2, jit: 0.1 }); } leafS = 0.05; leafN = 420; break;
    case 'cushion': for (let i = 0; i < 14; i++) { const a = rnd() * 6.28, r = rnd() * w * 0.55; B(w * 0.42, Math.cos(a) * r, h * 0.3, Math.sin(a) * r, { sy: h / w * 1.4, detail: 2, jit: 0.1 }); } leafN = 340; leafS = 0.022; leafL = 1.6; break;
    case 'cone': for (let i = 0; i < 12; i++) { const t = i / 11; B(w * (1 - t * 0.75) * 0.75, (rnd() - 0.5) * 0.2, h * (0.15 + t * 0.75), (rnd() - 0.5) * 0.2, { sy: 0.9, detail: 2, jit: 0.14 }); } leafN = 360; break;
    case 'upright': {
      for (let i = 0; i < 5; i++) { const a = i * 1.3; parts.push(branch(0, 0, 0, Math.cos(a) * w * 0.4, h * 0.7, Math.sin(a) * w * 0.4, 0.035, '#5a4632', rnd)); }
      for (let i = 0; i < 13; i++) { const a = rnd() * 6.28, r = rnd() * w * 0.55; B(w * 0.38, Math.cos(a) * r, h * (0.4 + rnd() * 0.45), Math.sin(a) * r, { sy: 1.1, detail: 2, jit: 0.18 }); }
      break;
    }
    case 'spiky': {
      for (let i = 0; i < 10; i++) { const a = rnd() * 6.28, r = rnd() * w * 0.5; B(w * 0.45, Math.cos(a) * r, h * 0.45 + rnd() * h * 0.2, Math.sin(a) * r, { detail: 2, jit: 0.18 }); }
      // pinchos: conos finos que asoman por todas partes
      const sp = []; for (let i = 0; i < 220; i++) { const { p, n } = surface(bl, rnd, 0.3), g = new THREE.ConeGeometry(0.015, 0.14, 3); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n)); g.translate(p.x + n.x * 0.05, p.y + n.y * 0.05, p.z + n.z * 0.05); sp.push(g.toNonIndexed()); }
      parts.push(solid(mergeGeometries(sp), m.c2, 0.2, rnd)); leafN = 0; break;
    }
    case 'feather': {
      // tamariz: ramas finas como plumeros, abiertas en abanico
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2, tilt = 0.35 + rnd() * 0.3, len = h * (0.75 + rnd() * 0.3), d = new THREE.Vector3(Math.cos(a) * Math.sin(tilt), Math.cos(tilt), Math.sin(a) * Math.sin(tilt));
        parts.push(branch(0, 0, 0, d.x * len, d.y * len, d.z * len, 0.03, '#7a5a48', rnd));
        for (let k = 0; k < 4; k++) { const t = 0.45 + k * 0.15; B(0.28, d.x * len * t, d.y * len * t, d.z * len * t, { sy: 1.8, detail: 1, jit: 0.25 }); }
      }
      leafN = 380; leafS = 0.05; leafL = 2.4; break;
    }
    case 'lavender': {
      for (let i = 0; i < 8; i++) { const a = rnd() * 6.28, r = rnd() * w * 0.4; B(w * 0.36, Math.cos(a) * r, h * 0.2, Math.sin(a) * r, { sy: 0.8, detail: 2, jit: 0.12 }); }
      // tallos largos con su espiga de flores en lo alto
      for (let i = 0; i < 44; i++) {
        const a = rnd() * 6.28, r = rnd() * w * 0.5, tx = Math.cos(a) * (r + 0.15), tz = Math.sin(a) * (r + 0.15), ty = h * (0.75 + rnd() * 0.3);
        parts.push(branch(Math.cos(a) * r * 0.5, h * 0.2, Math.sin(a) * r * 0.5, tx, ty, tz, 0.006, '#8a9a6a', rnd));
        const sp = new THREE.CapsuleGeometry(0.022, 0.09, 2, 5); sp.translate(tx, ty + 0.06, tz); parts.push(solid(sp, m.bloom, 0.25, rnd));
      }
      parts.push(leaves(240, bl, 0.03, m.c1, m.c2, rnd, { long: 2.6 }));
      return parts;
    }
  }
  if (leafN) parts.push(leaves(Math.round(leafN * 1.8), bl, leafS * 1.15, m.c1, m.c2, rnd, { long: leafL }));
  // flores: bolitas (brezo, tojo, romero, tomillo…) o flores abiertas de cinco pétalos (espino, jara, rododendro)
  if (m.bloom) parts.push(...dots(m.bloomN || 80, bl, m.bloomS || 0.035, m.bloom, rnd, { top: 0.6, shape: (m.bloomS || 0) >= 0.045 || m.form === 'upright' && m.bloomN > 100 ? 'flower' : 'ball' }));
  if (m.berry) parts.push(...dots(m.berryN || 40, bl, m.berryS || 0.03, m.berry, rnd, { top: 0.25 }));
  return parts;
}

// ---------------------------------------------------------------- helecho
function fern(m, rnd) {
  const parts = [], n = 11;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + rnd() * 0.4, len = m.h * (0.8 + rnd() * 0.4), segs = 12, pos = [];
    // fronda: un raquis que se arquea hacia fuera con foliolos a los dos lados, más cortos hacia la punta
    const pt = (t) => new THREE.Vector3(Math.sin(t * 1.3) * len * 0.75, Math.sin(t * Math.PI * 0.62) * len * 0.75, 0);
    for (let k = 0; k < segs; k++) {
      const t0 = k / segs, t1 = (k + 1) / segs, p0 = pt(t0), p1 = pt(t1), wdt = (1 - t0) * 0.28 + 0.03;
      for (const s of [-1, 1]) { pos.push(p0.x, p0.y, 0, p1.x, p1.y, 0, (p0.x + p1.x) / 2 + 0.04, (p0.y + p1.y) / 2 - 0.05, s * wdt); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); g.rotateY(-a); parts.push(paint(g, (p, nn, o) => o.copy(C(m.c1)).lerp(C(m.c2), 0.3 + rnd() * 0.6)));
  }
  return parts;
}

// ---------------------------------------------------------------- flores
// una flor (corola) en el origen mirando hacia +y
function corolla(f, rnd) {
  const out = [], P = C(f.petal), Cc = C(f.center), s = f.size;
  const petal = (len, wid, tilt, a, hex = f.petal, y = 0) => { const g = new THREE.CircleGeometry(1, 8); g.scale(len / 2, wid / 2, 1); g.translate(len / 2, 0, 0); g.rotateX(-Math.PI / 2); g.rotateZ(tilt); g.rotateY(a); g.translate(0, y, 0); return solid(g, hex, 0.12, rnd); };
  switch (f.form) {
    case 'cup': case 'rosette': { const n = f.petals || 5; for (let i = 0; i < n; i++) out.push(petal(s * 1.1, s * (f.petals === 4 ? 1.1 : 0.8), 0.45, i / n * Math.PI * 2)); out.push(solid(new THREE.SphereGeometry(s * 0.28, 8, 6).translate(0, s * 0.12, 0), f.center)); break; }
    case 'daisy': { const n = f.petals || 20; for (let i = 0; i < n; i++) out.push(petal(s * 1.2, s * 0.22, 0.12, i / n * Math.PI * 2)); out.push(solid(new THREE.SphereGeometry(s * 0.4, 10, 6).scale(1, 0.5, 1), f.center)); break; }
    case 'star': { const n = f.petals || 8; for (let i = 0; i < n; i++) { const g = new THREE.ConeGeometry(s * 0.28, s * 1.4, 4); g.rotateZ(-Math.PI / 2); g.translate(s * 0.7, 0, 0); g.scale(1, 0.35, 1); g.rotateY(i / n * Math.PI * 2); out.push(solid(g, f.petal, 0.08, rnd)); } for (let i = 0; i < 7; i++) out.push(solid(new THREE.SphereGeometry(s * 0.14, 6, 4).translate((rnd() - 0.5) * s * 0.4, s * 0.08, (rnd() - 0.5) * s * 0.4), f.center)); break; }
    case 'ground-star': {
      // eguzkilore: corona de brácteas plateadas muy finas alrededor de un disco ancho dorado
      const n = 26; for (let i = 0; i < n; i++) out.push(petal(s * 1.05, s * 0.16, 0.08, i / n * Math.PI * 2, i % 2 ? '#f2f2ec' : '#d8d8cc'));
      out.push(solid(new THREE.CylinderGeometry(s * 0.55, s * 0.6, s * 0.12, 18).translate(0, s * 0.03, 0), f.center, 0.15, rnd));
      for (let i = 0; i < 40; i++) { const a = rnd() * 6.28, r = rnd() * s * 0.5; out.push(solid(new THREE.SphereGeometry(s * 0.035, 4, 3).translate(Math.cos(a) * r, s * 0.1, Math.sin(a) * r), '#8a6a2a')); }
      break;
    }
    case 'trumpet': { for (let i = 0; i < 6; i++) out.push(petal(s * 1.1, s * 0.6, 0.2, i / 6 * Math.PI * 2)); out.push(solid(new THREE.CylinderGeometry(s * 0.42, s * 0.3, s * 1.0, 12, 1, true).translate(0, s * 0.5, 0), f.center)); break; }
    case 'trumpet-big': { const g = new THREE.CylinderGeometry(s * 0.8, s * 0.3, s * 2.2, 10, 1, true); g.translate(0, s * 1.1, 0); out.push(solid(g, f.petal, 0.1, rnd)); for (let i = 0; i < 5; i++) out.push(petal(s * 0.55, s * 0.5, -0.4, i / 5 * Math.PI * 2, f.petal, s * 2.2)); out.push(solid(new THREE.CircleGeometry(s * 0.3, 8).rotateX(-Math.PI / 2).translate(0, s * 1.4, 0), f.center)); break; }
    case 'bell': { const g = new THREE.CylinderGeometry(s * 0.7, s * 0.35, s * 1.3, 10, 1, true); g.rotateX(Math.PI); g.translate(0, -s * 0.65, 0); out.push(solid(g, f.petal, 0.1, rnd)); break; }
  }
  return out;
}
function flower(m, rnd) {
  const parts = [], s = m.size, n = m.n || 6, spread = n > 1 ? 0.12 + Math.sqrt(n) * 0.1 : 0;
  const leafHex = m.leaf || '#4a7a34';
  const leaf = (len, wid, tilt, a, x, z, y = 0.01) => { const g = new THREE.CircleGeometry(1, 8); g.scale(len / 2, wid / 2, 1); g.translate(len / 2, 0, 0); g.rotateX(-Math.PI / 2); g.rotateZ(tilt); g.rotateY(a); g.translate(x, y, z); return solid(g, leafHex, 0.18, rnd); };
  const stemTo = (x, z, h, bend = 0) => parts.push(branch(x, 0, z, x + bend, h, z, 0.006 + s * 0.08, '#5a8a3a', rnd));
  for (let k = 0; k < n; k++) {
    const a = rnd() * 6.28, r = rnd() * spread, x = Math.cos(a) * r, z = Math.sin(a) * r, H = (m.stem || 0.2) * (0.8 + rnd() * 0.4);
    switch (m.form) {
      case 'ground-star': {
        for (let i = 0; i < 9; i++) parts.push(leaf(s * 2.1, s * 0.55, 0.02, i / 9 * 6.28 + rnd() * 0.3, x, z));
        // hojas recortadas y espinosas: dientes en el borde
        for (let i = 0; i < 30; i++) { const aa = rnd() * 6.28, rr = s * (1.2 + rnd() * 0.9), g = new THREE.ConeGeometry(0.012, 0.06, 3); g.rotateZ(-Math.PI / 2); g.rotateY(-aa); g.translate(x + Math.cos(aa) * rr, 0.02, z + Math.sin(aa) * rr); parts.push(solid(g, '#8a9a6a', 0.2, rnd)); }
        for (const g of corolla(m, rnd)) { g.translate(x, 0.04, z); parts.push(g); }
        break;
      }
      case 'rosette': {
        for (let i = 0; i < 7; i++) parts.push(leaf(0.14, 0.06, 0.25, i / 7 * 6.28 + rnd(), x, z));
        for (let j = 0; j < 4; j++) { const aa = rnd() * 6.28, rr = 0.04, fx = x + Math.cos(aa) * rr, fz = z + Math.sin(aa) * rr; stemTo(fx, fz, H); for (const g of corolla({ ...m, form: 'cup', petals: 5 }, rnd)) { g.translate(fx, H, fz); parts.push(g); } }
        break;
      }
      case 'spike-bells': {
        for (let i = 0; i < 6; i++) parts.push(leaf(0.3, 0.1, 0.4, i / 6 * 6.28 + rnd(), x, z, 0.05));
        stemTo(x, z, H);
        // campanas a un lado del tallo, de más grandes abajo a más pequeñas arriba
        const side = rnd() * 6.28;
        for (let i = 0; i < 16; i++) { const t = 0.35 + i / 16 * 0.62, ss = s * (1.4 - t * 0.8); const g = new THREE.CylinderGeometry(ss * 0.55, ss * 0.3, ss * 1.6, 8, 1, true); g.rotateZ(Math.PI / 2.4); g.rotateY(side + (rnd() - 0.5) * 0.9); g.translate(x + Math.cos(side) * ss * 0.6, H * t, z - Math.sin(side) * ss * 0.6); parts.push(solid(g, m.petal, 0.15, rnd)); }
        break;
      }
      case 'bells': {
        stemTo(x, z, H, 0.04); for (let i = 0; i < 4; i++) parts.push(leaf(0.05, 0.02, 0.5, rnd() * 6.28, x, z, H * 0.3 * rnd()));
        for (let j = 0; j < 2; j++) { for (const g of corolla({ ...m, form: 'bell' }, rnd)) { g.translate(x + 0.04 + j * 0.03, H - j * 0.06, z); parts.push(g); } }
        break;
      }
      case 'turban': {
        stemTo(x, z, H); for (let i = 0; i < 14; i++) parts.push(leaf(0.09, 0.025, 0.6, rnd() * 6.28, x, z, H * (0.1 + rnd() * 0.6)));
        for (let j = 0; j < 3; j++) {
          const fy = H - j * 0.07, fx = x + (j - 1) * 0.05;
          for (let i = 0; i < 6; i++) { const g = new THREE.CircleGeometry(1, 8); g.scale(s * 0.6, s * 0.18, 1); g.translate(s * 0.6, 0, 0); g.rotateX(-Math.PI / 2); g.rotateZ(1.2); g.rotateY(i / 6 * 6.28); g.rotateX(Math.PI); g.translate(fx, fy, z); parts.push(solid(g, m.petal, 0.12, rnd)); }
          for (let i = 0; i < 5; i++) parts.push(solid(new THREE.CylinderGeometry(0.002, 0.002, s * 0.9, 3).translate(fx + (rnd() - 0.5) * 0.01, fy - s * 0.45, z + (rnd() - 0.5) * 0.01), m.center));
        }
        break;
      }
      case 'orchid': {
        for (let i = 0; i < 4; i++) parts.push(leaf(0.12, 0.04, 0.3, i / 4 * 6.28, x, z));
        stemTo(x, z, H);
        for (let j = 0; j < 4; j++) {
          const fy = H * (0.6 + j * 0.12), a2 = j * 2.1, fx = x + Math.cos(a2) * 0.02, fz = z + Math.sin(a2) * 0.02;
          for (let i = 0; i < 3; i++) { const g = new THREE.CircleGeometry(1, 8); g.scale(s * 0.6, s * 0.3, 1); g.translate(s * 0.6, 0, 0); g.rotateZ(i * 2.1); g.rotateY(a2); g.translate(fx, fy, fz); parts.push(solid(g, m.petal, 0.12, rnd)); }
          const lip = new THREE.SphereGeometry(s * 0.45, 8, 6); lip.scale(0.8, 1, 0.6); lip.translate(fx + Math.cos(a2) * s * 0.4, fy - s * 0.2, fz - Math.sin(a2) * s * 0.4); parts.push(solid(lip, m.center, 0.15, rnd));
          parts.push(solid(new THREE.SphereGeometry(s * 0.12, 6, 4).translate(fx + Math.cos(a2) * s * 0.55, fy - s * 0.1, fz - Math.sin(a2) * s * 0.55), '#e8c84a'));
        }
        break;
      }
      case 'thistle': {
        // hojas grandes, onduladas y espinosas con venas blancas
        for (let i = 0; i < 6; i++) { const g = new THREE.PlaneGeometry(0.42, 0.14, 6, 2), P = g.attributes.position; for (let q = 0; q < P.count; q++) { _v.fromBufferAttribute(P, q); P.setZ(q, Math.sin(_v.x * 30) * 0.02); } g.translate(0.21, 0, 0); g.rotateX(-Math.PI / 2 + 0.3); g.rotateY(i / 6 * 6.28); g.translate(x, 0.05, z); g.computeVertexNormals(); parts.push(paint(g, (p, nn, o) => { const vein = Math.abs((p.x - x) * Math.sin(i) - (p.z - z) * Math.cos(i)) < 0.012; o.set(vein ? '#eef2e6' : leafHex).multiplyScalar(0.9 + rnd() * 0.2); })); }
        stemTo(x, z, H);
        for (let j = 0; j < 2; j++) {
          const fy = H - j * 0.15, fx = x + j * 0.08;
          const head = new THREE.SphereGeometry(s, 10, 8); head.scale(1, 0.9, 1); head.translate(fx, fy, z); parts.push(solid(head, '#5a8a3a', 0.15, rnd));
          for (let i = 0; i < 24; i++) { const aa = rnd() * 6.28, g = new THREE.ConeGeometry(0.008, s * 0.8, 3); g.rotateZ(-Math.PI / 2 + 0.3); g.rotateY(-aa); g.translate(fx + Math.cos(aa) * s, fy - s * 0.2, z + Math.sin(aa) * s); parts.push(solid(g, '#c8b880', 0.1, rnd)); }
          const brush = new THREE.CylinderGeometry(s * 0.8, s * 0.5, s * 0.7, 12); brush.translate(fx, fy + s * 0.75, z); parts.push(solid(brush, m.petal, 0.15, rnd));
        }
        break;
      }
      default: {
        // tallo con hojas y una flor arriba (amapola, margarita, lino, malva, narciso, genciana, edelweiss, anémona, violeta)
        if (m.form === 'trumpet-big') for (let i = 0; i < 5; i++) parts.push(leaf(0.07, 0.03, 0.15, i / 5 * 6.28, x, z));
        else if (m.heart) for (let i = 0; i < 3; i++) { const g = new THREE.CircleGeometry(0.035, 10); g.rotateX(-Math.PI / 2 + 0.6); g.rotateY(rnd() * 6.28); g.translate(x, 0.04, z); parts.push(solid(g, leafHex, 0.15, rnd)); }
        else for (let i = 0; i < 3; i++) parts.push(leaf(m.form === 'trumpet' ? 0.25 : 0.1, m.form === 'trumpet' ? 0.02 : 0.03, 0.9, rnd() * 6.28, x, z, H * 0.2 * rnd()));
        const bend = (rnd() - 0.5) * H * 0.15;
        stemTo(x, z, H, bend);
        for (const g of corolla(m, rnd)) {
          if (m.form === 'trumpet') { g.rotateX(-1.1); }
          if (m.stripes) { const col = g.attributes.color; for (let q = 0; q < col.count; q += 3) if (rnd() < 0.3) col.setXYZ(q, col.getX(q) * 0.6, col.getY(q) * 0.5, col.getZ(q) * 0.7); }
          if (m.wool) { const col = g.attributes.color; for (let q = 0; q < col.count; q++) col.setXYZ(q, col.getX(q) * (0.92 + rnd() * 0.1), col.getY(q) * (0.92 + rnd() * 0.1), col.getZ(q) * (0.9 + rnd() * 0.1)); }
          g.translate(x + bend, H, z); parts.push(g);
        }
      }
    }
  }
  return parts;
}

const MAT = new Map();
function materialFor(m) {
  const key = m.gloss ? 'gloss' : 'matte';
  if (!MAT.has(key)) {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: m.gloss ? 0.45 : 0.85, side: THREE.DoubleSide });
    // un poco de su color como luz propia: a contraluz las plantas no se quedan negras
    mat.onBeforeCompile = (sh) => { useFill(sh); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>' + FILL_DECL).replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vColor.rgb * 0.18 * uCharFill;'); };
    mat.customProgramCacheKey = () => 'flora-' + key;
    MAT.set(key, mat);
  }
  return MAT.get(key);
}
const GEO = new Map();
/** Geometría (cacheada por especie y semilla) del ejemplar. */
export function floraGeometry(id, seed = 1) {
  const k = id + ':' + seed;
  if (GEO.has(k)) return GEO.get(k);
  const F = FLORA[id]; if (!F) return null;
  const rnd = mulberry(seed * 7919 + id.length * 104729), m = F.m;
  const parts = m.t === 'tree' ? tree(m, rnd) : m.t === 'shrub' ? shrub(m, rnd) : m.t === 'fern' ? fern(m, rnd) : flower(m, rnd);
  const g = mergeGeometries(parts.map(p => { for (const a of Object.keys(p.attributes)) if (!['position', 'normal', 'color'].includes(a)) p.deleteAttribute(a); return p.index ? p.toNonIndexed() : p; }));
  parts.forEach(p => p.dispose()); g.computeBoundingBox(); g.computeBoundingSphere();
  GEO.set(k, g); return g;
}
/** Ejemplar listo para el mundo: los pies en y = 0, proyecta y recibe sombra. */
export function floraModel(id, seed = 1) {
  const g = floraGeometry(id, seed); if (!g) return null;
  const mesh = new THREE.Mesh(g, materialFor(FLORA[id].m)); mesh.castShadow = true; mesh.receiveShadow = true;
  const o = new THREE.Group(); o.add(mesh); o.userData.flora = id; return o;
}
/** Libera las geometrías guardadas (al salir de un pueblo). */
export function releaseFlora() { for (const g of GEO.values()) g.dispose(); GEO.clear(); }

// retrato para la ficha: el ejemplar entero, de tres cuartos y con luz de día, sobre fondo claro
const PORTRAIT = new Map();
export function floraPortrait(id, w = 360, h = 300) {
  if (PORTRAIT.has(id)) return PORTRAIT.get(id);
  const p = (async () => {
    const F = FLORA[id]; if (!F) return '';
    const S = new THREE.Scene(), g = floraGeometry(id, 3);
    S.add(new THREE.HemisphereLight('#ffffff', '#6a7a5a', 1.6));
    const sun = new THREE.DirectionalLight('#fff4e0', 2.4); sun.position.set(3, 6, 4); S.add(sun);
    const mesh = new THREE.Mesh(g, materialFor(F.m)); S.add(mesh);
    const box = g.boundingBox, size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    // suelo: un disco de hierba bajo la planta
    const R2 = Math.max(size.x, size.z) * 0.75 + 0.05, ground = new THREE.Mesh(new THREE.CircleGeometry(R2, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#7aa452', roughness: 1 })); ground.position.y = -0.002; S.add(ground);
    const cam = new THREE.PerspectiveCamera(32, w / h, 0.01, 200), dist = Math.max(size.y * 1.15, Math.max(size.x, size.z) * 1.1) / (2 * Math.tan(THREE.MathUtils.degToRad(16)));
    cam.position.set(ctr.x + dist * 0.62, ctr.y + dist * 0.32, ctr.z + dist * 0.78); cam.lookAt(ctr.x, ctr.y * 0.95, ctr.z);
    const R = offscreen(w, h, THREE.NeutralToneMapping); R.setClearColor(0xeef4e6, 1); R.clear(); R.render(S, cam);
    const url = offscreenCanvas().toDataURL('image/jpeg', 0.86);
    ground.geometry.dispose(); ground.material.dispose();
    return url;
  })();
  PORTRAIT.set(id, p); return p;
}
