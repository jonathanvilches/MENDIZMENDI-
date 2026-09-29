// Fauna de Navarra modelada por secciones anatómicas (como se esculpe un animal):
// cada parte es un «loft» — una columna vertebral curva con secciones elípticas de radio variable —,
// así el lomo, la cruz, el vientre recogido, el cuello y el hocico salen en una sola pieza suave.
// Las patas siguen su esqueleto real (codo, rodilla, corvejón hacia atrás, menudillo y pezuña)
// y el pelaje se pinta por vértices con los rasgos de cada especie (escudo blanco del corzo,
// orla clara de la vaca pirenaica, cara negra de la latxa, calcetines negros del zorro…).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const C = (h) => new THREE.Color(h);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function hash(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(hash(ix, iy, iz), hash(ix + 1, iy, iz), u), L(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), u), v),
    L(L(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), u), L(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), u), v), w);
}

// ---------- Material del pelaje ----------
// aTex: 0 piel lisa (hocico, labios), 2 pelo corto, 3 lana, 4 cuerno/pezuña, 6 ojo, 7 pluma
function beastMat(side = THREE.FrontSide) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0, side });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aTex;\nvarying vec3 vOP; varying float vTex;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position; vTex = aTex;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vOP; varying float vTex;
float bh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float bn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(bh(i), bh(i + vec3(1,0,0)), f.x), mix(bh(i + vec3(0,1,0)), bh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(bh(i + vec3(0,0,1)), bh(i + vec3(1,0,1)), f.x), mix(bh(i + vec3(0,1,1)), bh(i + vec3(1,1,1)), f.x), f.y), f.z); }
vec3 bbump(vec3 sp, vec3 n, float h, float k) {
  vec3 sx = dFdx(sp), sy = dFdy(sp), r1 = cross(sy, n), r2 = cross(n, sx);
  float det = dot(sx, r1); vec3 grad = sign(det) * (dFdx(h) * k * r1 + dFdy(h) * k * r2);
  return normalize(abs(det) * n - grad);
}
float bsurf(vec3 p, float t) {
  if (t > 1.5 && t < 2.5) return bn(vec3(p.x * 90.0, p.y * 90.0, p.z * 22.0)) * 0.6 + bn(p * 230.0) * 0.4;   // pelo peinado hacia atrás
  if (t > 2.5 && t < 3.5) { float a = bn(p * 26.0); return a * 0.7 + bn(p * 70.0) * 0.3; }                  // mechones de lana
  if (t > 6.5) return bn(vec3(p.x * 40.0, p.y * 400.0, p.z * 40.0));                                         // barbas de pluma
  return 0.0;
}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      if (vTex > 1.5 && vTex < 3.5 || vTex > 6.5) normal = bbump(-vViewPosition, normal, bsurf(vOP, vTex), vTex < 2.5 ? 0.0014 : vTex < 3.5 ? 0.0045 : 0.001);`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      {
        float t = 1.0;
        if (vTex > 1.5 && vTex < 2.5) t = 0.9 + 0.16 * bn(vec3(vOP.x * 120.0, vOP.y * 120.0, vOP.z * 30.0));
        else if (vTex > 2.5 && vTex < 3.5) { float a = bn(vOP * 24.0); t = 0.78 + 0.3 * smoothstep(0.25, 0.75, a) + 0.06 * bn(vOP * 90.0); }
        else if (vTex > 3.5 && vTex < 4.5) t = 0.9 + 0.14 * bn(vec3(vOP.x * 30.0, vOP.y * 200.0, vOP.z * 30.0));
        else if (vTex > 6.5) t = 0.92 + 0.12 * bn(vec3(vOP.x * 30.0, vOP.y * 260.0, vOP.z * 30.0));
        diffuseColor.rgb *= t;
      }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = vTex < 0.5 ? 0.42 : vTex < 2.5 ? 0.72 : vTex < 3.5 ? 0.97 : vTex < 4.5 ? 0.35 : vTex < 6.5 ? 0.06 : 0.6;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        vec3 nn = normalize(normal), vv = normalize(vViewPosition);
        float fr = pow(1.0 - clamp(dot(nn, vv), 0.0, 1.0), 2.2);
        totalEmissiveRadiance += diffuseColor.rgb * 0.16;                                        // rebote de luz
        if (vTex > 1.5 && vTex < 3.5) totalEmissiveRadiance += mix(diffuseColor.rgb, vec3(1.0, 0.96, 0.9), 0.45) * fr * 0.42; // brillo del pelo al contraluz
        if (vTex > 6.5) totalEmissiveRadiance += mix(diffuseColor.rgb, vec3(1.0), 0.3) * fr * 0.25;
      }`);
  };
  m.customProgramCacheKey = () => 'beast' + side;
  return m;
}
export const BEAST_MAT = beastMat(), BEAST_MAT2 = beastMat(THREE.DoubleSide);

// ---------- Geometría ----------
// Prepara cualquier geometría: sólo posición, normal, color y tipo de superficie; siempre indexada.
function prep(g, color, tex = 2, m) {
  g = g.index ? g.clone() : g.clone();
  if (m) g.applyMatrix4(m);
  for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal') g.deleteAttribute(a);
  if (!g.index) { const n = g.attributes.position.count; g.setIndex([...Array(n).keys()]); }
  const n = g.attributes.position.count, col = new Float32Array(n * 3), c = new THREE.Color(), p = g.attributes.position;
  for (let i = 0; i < n; i++) { if (typeof color === 'function') color(p.getX(i), p.getY(i), p.getZ(i), c); else c.set(color); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aTex', new THREE.BufferAttribute(new Float32Array(n).fill(tex), 1));
  return g;
}
const Mx = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), V(sx, sy, sz));
const ball = (r, color, tex, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, seg = 20) => prep(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), color, tex, Mx(x, y, z, rx, ry, rz, sx, sy, sz));

// Loft: columna (puntos de control) + secciones [ancho, alto por arriba, alto por abajo, (desplazamiento vertical)]
// color(u, th, p) → Color; bump(u, th, p) → empuje radial (lana, cerdas, mechones)
export function loft({ pts, r, seg = 24, ring = 22, e = 2, color = '#888', tex = 2, bump, side0 = V(1, 0, 0), capA = true, capB = true, capK = 0.55 }) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const n = pts.length, R = (u) => {
    const f = u * (n - 1), i = Math.min(n - 2, Math.floor(f)), t = f - i;
    const a = r[Math.max(0, i - 1)], b = r[i], c2 = r[i + 1], d = r[Math.min(n - 1, i + 2)];
    const cr = (k) => { const p0 = a[k] ?? 0, p1 = b[k] ?? 0, p2 = c2[k] ?? 0, p3 = d[k] ?? 0; return Math.max(0, 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)); };
    return [cr(0), cr(1), cr(2), cr(3)];
  };
  const pos = [], col = [], idx = [], cc = new THREE.Color();
  let side = side0.clone(), prevT = null;
  const S = seg * (n - 1);
  const sgn = (v) => v < 0 ? -1 : 1, sup = (v) => sgn(v) * Math.pow(Math.abs(v), 2 / e);
  const frames = [];
  for (let s = 0; s <= S; s++) {
    const u = s / S, P = curve.getPoint(u), T = curve.getTangent(u).normalize();
    if (prevT) { side.sub(T.clone().multiplyScalar(side.dot(T))).normalize(); } else side.sub(T.clone().multiplyScalar(side.dot(T))).normalize();
    prevT = T;
    const up = new THREE.Vector3().crossVectors(T, side).normalize();
    const [rx, ru, rd, yo] = R(u);
    frames.push({ P, T, side: side.clone(), up, rx, ru, rd });
    for (let j = 0; j < ring; j++) {
      const th = j / ring * Math.PI * 2, c = Math.cos(th), sn = Math.sin(th);
      let x = rx * sup(c), y = (sn >= 0 ? ru : rd) * sup(sn) + (yo || 0);
      const p = P.clone().addScaledVector(side, x).addScaledVector(up, y);
      if (bump) { const b = bump(u, th, p); if (b) { const dir = side.clone().multiplyScalar(c).addScaledVector(up, sn).normalize(); p.addScaledVector(dir, b); } }
      pos.push(p.x, p.y, p.z);
      const res = color instanceof Function ? color(u, th, p) : color; cc.set(res); col.push(cc.r, cc.g, cc.b);
    }
  }
  for (let s = 0; s < S; s++) for (let j = 0; j < ring; j++) {
    const a = s * ring + j, b = s * ring + (j + 1) % ring, c2 = a + ring, d = b + ring;
    idx.push(a, b, c2, b, d, c2);
  }
  // tapas redondeadas
  const cap = (f, dir, u, first) => {
    const k = pos.length / 3, r0 = Math.max(f.rx, (f.ru + f.rd) / 2);
    const p = f.P.clone().addScaledVector(f.T, dir * r0 * capK);
    pos.push(p.x, p.y, p.z);
    const res = color instanceof Function ? color(u, -Math.PI / 2, p) : color; cc.set(res); col.push(cc.r, cc.g, cc.b);
    const base = first ? 0 : S * ring;
    for (let j = 0; j < ring; j++) { const a = base + j, b = base + (j + 1) % ring; if (first) idx.push(k, b, a); else idx.push(k, a, b); }
  };
  if (capA) cap(frames[0], -1, 0, true);
  if (capB) cap(frames[S], 1, 1, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  g.setAttribute('aTex', new THREE.BufferAttribute(new Float32Array(pos.length / 3).fill(tex), 1));
  return g;
}
const mergeAll = (list) => mergeGeometries(list.filter(Boolean));

// Ojo: globo oscuro brillante con párpado del color del pelo y brillo
function eye(x, y, z, r, ry, fur, iris = '#1a120d', pupil = null) {
  const out = [];
  for (const s of [-1, 1]) {
    const m = Mx(s * x, y, z, 0, s * ry, 0);
    out.push(prep(new THREE.SphereGeometry(r, 18, 14), iris, 6, m));
    if (pupil) out.push(prep(new THREE.SphereGeometry(r * 1.005, 16, 12, Math.PI / 2 - 0.5, 1.0, Math.PI / 2 - 0.16, 0.32), pupil, 6, m));
    out.push(prep(new THREE.TorusGeometry(r * 0.98, r * 0.3, 8, 22), fur, 2, m.clone().multiply(Mx(0, 0, r * 0.3, 0, 0, 0, 1, 0.92, 1))));
  }
  return out;
}
// Oreja: hoja alargada con cara interior más clara
function ear(len, w, th, outer, inner, tex = 2) {
  return mergeAll([
    loft({ pts: [V(0, 0, 0), V(0, len * 0.45, -0.005), V(0, len, 0)], r: [[w * 0.45, th, th], [w, th, th * 0.7], [w * 0.08, th * 0.4, th * 0.3]], seg: 8, ring: 14, e: 2.4, color: outer, tex }),
    loft({ pts: [V(0, len * 0.12, th * 0.6), V(0, len * 0.5, th * 0.75), V(0, len * 0.9, th * 0.5)], r: [[w * 0.3, th * 0.4, th * 0.2], [w * 0.7, th * 0.5, th * 0.2], [w * 0.05, th * 0.2, th * 0.1]], seg: 6, ring: 12, color: inner, tex: 0 }),
  ]);
}
// Pata según su esqueleto: lista de articulaciones con radio [lado, delante, detrás]
function leg(joints, col, hoofCol, { hoofH = 0.06, tex = 2, split = false, paw = false } = {}) {
  const ys = joints.map(j => j[0].y), top = ys[0], bot = ys[ys.length - 1];
  const g = loft({
    pts: joints.map(j => j[0]), r: joints.map(j => j[1]), seg: 10, ring: 16, e: 2.2, tex, side0: V(1, 0, 0), capA: false,
    color: (u, th, p) => { const c = typeof col === 'function' ? col(p, (top - p.y) / (top - bot)) : col; return p.y < bot + hoofH ? hoofCol : c; },
  });
  const out = [g];
  const last = joints[joints.length - 1];
  if (paw) out.push(ball(last[1][0] * 1.3, hoofCol, 2, last[0].x, bot + last[1][0] * 0.6, last[0].z + last[1][1] * 0.6, 1, 0.62, 1.4));
  else {
    // pezuña: casco algo abierto hacia abajo, más oscuro y brillante
    const r0 = last[1][0];
    out.push(prep(new THREE.CylinderGeometry(r0 * 1.02, r0 * 1.22, hoofH, 16), hoofCol, 4, Mx(last[0].x, bot + hoofH / 2, last[0].z + r0 * 0.12)));
    if (split) out.push(prep(new THREE.BoxGeometry(r0 * 0.12, hoofH * 0.9, r0 * 1.3), '#0c0908', 4, Mx(last[0].x, bot + hoofH * 0.45, last[0].z + r0 * 0.7)));
  }
  return mergeAll(out);
}
// Cola, crin y mechones: tubo que se afila
const tube = (pts, r0, r1, color, tex = 2, ring = 12) => loft({ pts, r: pts.map((_, i) => { const t = i / (pts.length - 1), rr = r0 + (r1 - r0) * t; return [rr, rr, rr]; }), seg: 8, ring, color, tex });
// Cuerno o asta: tubo curvo con punta, del color de base al de la punta
const horn = (pts, r0, r1, base, tip) => loft({ pts, r: pts.map((_, i) => { const t = i / (pts.length - 1), rr = r0 + (r1 - r0) * Math.pow(t, 0.8); return [rr, rr, rr]; }), seg: 8, ring: 12, color: (u) => C(base).lerp(C(tip), sm(0.55, 1, u)), tex: 4, capK: 0.9 });

// ---------- Especies ----------
// Cada especie define: cuerpo (tronco), cabeza+cuello (pivota en la base del cuello),
// patas delanteras/traseras (pivotan en la cadera y el hombro) y cola.
const shade = (hex, k) => C(hex).multiplyScalar(k);
export const BEASTS = {
  // Oveja latxa (cara negra): lana basta de mechas largas que cuelgan, cara y patas negras, orejas horizontales
  sheep: (rnd) => {
    const W = '#ece2cc', Wd = '#cdbf9f', F = '#2a221e';
    const wool = (u, th, p) => { const n = vnoise(p.x * 9, p.y * 9, p.z * 9), hang = th < 0 ? Math.pow(-Math.sin(th), 3) : 0; return 0.03 * n + hang * (0.05 + 0.07 * vnoise(p.x * 14, p.z * 14, 3)); };
    const wc = (u, th, p) => C(W).lerp(C(Wd), clamp(0.35 * vnoise(p.x * 8, p.y * 8, p.z * 8) + (th < 0 ? 0.35 : 0) + (p.y < 0.4 ? 0.2 : 0), 0, 1));
    const body = loft({ pts: [V(0, 0.6, -0.5), V(0, 0.62, -0.38), V(0, 0.62, -0.1), V(0, 0.63, 0.18), V(0, 0.64, 0.38), V(0, 0.64, 0.5)],
      r: [[0.12, 0.12, 0.12], [0.26, 0.24, 0.26], [0.3, 0.27, 0.3], [0.3, 0.27, 0.3], [0.26, 0.25, 0.28], [0.14, 0.15, 0.16]], color: wc, tex: 3, bump: wool, ring: 28, seg: 12 });
    const headG = mergeAll([
      loft({ pts: [V(0, -0.05, -0.1), V(0, 0.06, 0.06), V(0, 0.14, 0.16)], r: [[0.16, 0.16, 0.18], [0.13, 0.13, 0.15], [0.1, 0.1, 0.11]], color: wc, tex: 3, bump: (u, th, p) => 0.02 * vnoise(p.x * 10, p.y * 10, p.z * 10), ring: 22 }),
      loft({ pts: [V(0, 0.19, 0.08), V(0, 0.18, 0.17), V(0, 0.12, 0.27), V(0, 0.08, 0.32)], r: [[0.08, 0.085, 0.075], [0.075, 0.075, 0.07], [0.058, 0.055, 0.06], [0.048, 0.042, 0.045]], color: (u, th, p) => u > 0.9 ? '#1a1412' : F, tex: 2, ring: 20 }),
      ball(0.055, wc, 3, 0, 0.255, 0.1, 1.25, 0.6, 1.0),
      ...eye(0.064, 0.205, 0.17, 0.019, 0.9, F, '#b8862e', '#0d0806'),
      ...[-1, 1].map(s => ear(0.11, 0.04, 0.012, F, '#5a4038').applyMatrix4(Mx(s * 0.075, 0.215, 0.09, 0.2, 0, -s * 1.5))),
      ...(rnd() < 0.35 ? [-1, 1].map(s => horn([V(s * 0.06, 0.25, 0.08), V(s * 0.13, 0.3, 0.02), V(s * 0.16, 0.22, -0.04), V(s * 0.13, 0.12, 0.02), V(s * 0.15, 0.1, 0.1)], 0.028, 0.008, '#d8c8a0', '#8a7a5a')) : []),
    ]);
    const fl = (x) => leg([[V(x, 0, 0), [0.06, 0.06, 0.06]], [V(x, -0.2, 0.005), [0.034, 0.032, 0.032]], [V(x, -0.34, 0), [0.025, 0.024, 0.024]], [V(x, -0.44, 0.008), [0.028, 0.028, 0.028]], [V(x, -0.52, 0.015), [0.026, 0.026, 0.026]]], F, '#15100e', { hoofH: 0.04, split: true });
    const hl = (x) => leg([[V(x, 0, 0), [0.08, 0.08, 0.08]], [V(x, -0.18, 0.04), [0.04, 0.04, 0.04]], [V(x, -0.3, -0.04), [0.027, 0.025, 0.03]], [V(x, -0.46, -0.02), [0.026, 0.026, 0.026]], [V(x, -0.54, 0), [0.026, 0.026, 0.026]]], F, '#15100e', { hoofH: 0.04, split: true });
    return { body, head: headG, neck: V(0, 0.72, 0.36), legs: { fl: [0.1, 0.52, 0.3], hl: [0.1, 0.54, -0.3], front: fl, hind: hl },
      tail: mergeAll([tube([V(0, 0, 0), V(0, -0.1, -0.04), V(0, -0.22, -0.05)], 0.05, 0.03, wc, 3)]), tailAt: V(0, 0.64, -0.5) };
  },
  // Vaca pirenaica: rubia trigo, orla clara en ojos y hocico, mucosas rosadas, cuernos en lira, papada y cencerro
  cow: () => {
    const B = '#c48a4c', L = '#e9cf9e', Dk = '#9c6a38';
    const coat = (u, th, p) => { const belly = th < -0.6 ? 0.35 : 0; return C(B).lerp(C(L), belly + 0.08 * vnoise(p.x * 3, p.y * 3, p.z * 3)).lerp(C(Dk), p.y > 1.2 && Math.abs(p.x) < 0.12 ? 0.25 : 0); };
    const body = loft({ pts: [V(0, 1.08, -0.9), V(0, 1.1, -0.72), V(0, 1.05, -0.35), V(0, 1.02, 0.05), V(0, 1.08, 0.45), V(0, 1.1, 0.72), V(0, 1.08, 0.86)],
      r: [[0.18, 0.18, 0.2], [0.4, 0.3, 0.42], [0.44, 0.33, 0.52], [0.47, 0.34, 0.56], [0.43, 0.38, 0.54], [0.34, 0.33, 0.5], [0.16, 0.2, 0.25]], color: coat, ring: 30, seg: 12,
      bump: (u, th, p) => (Math.abs(Math.abs(p.x) - 0.3) < 0.1 && Math.abs(p.z + 0.62) < 0.12 && th > 0.2 ? 0.05 * (1 - Math.abs(p.z + 0.62) / 0.12) : 0) });
    const face = (u, th, p) => { const side = Math.abs(Math.cos(th)); const ring = sm(0.28, 0.36, u) * (1 - sm(0.4, 0.5, u)) * side; return u > 0.86 ? C('#e7c0a4') : C(B).lerp(C('#f0dcb8'), Math.max(ring * 0.85, sm(0.74, 0.86, u) * 0.9)); };
    const headG = mergeAll([
      loft({ pts: [V(0, -0.1, -0.12), V(0, 0.02, 0.12), V(0, 0.1, 0.32)], r: [[0.3, 0.3, 0.44], [0.24, 0.26, 0.38], [0.17, 0.2, 0.24]], color: coat, ring: 24 }),
      loft({ pts: [V(0, 0.2, 0.3), V(0, 0.16, 0.44), V(0, 0.02, 0.6), V(0, -0.14, 0.74), V(0, -0.2, 0.8)], r: [[0.2, 0.16, 0.14], [0.17, 0.14, 0.13], [0.12, 0.1, 0.1], [0.12, 0.09, 0.1], [0.11, 0.07, 0.08]], color: face, ring: 24, e: 2.3 }),
      ...[-1, 1].map(s => ball(0.03, '#9a6a5a', 0, s * 0.055, -0.17, 0.84, 1.2, 0.7, 0.6)),
      ...eye(0.135, 0.16, 0.47, 0.03, 0.9, '#f0dcb8'),
      ...[-1, 1].map(s => ear(0.2, 0.07, 0.02, B, '#e8c9a0').applyMatrix4(Mx(s * 0.16, 0.2, 0.32, 0, 0, -s * 1.5))),
      ...[-1, 1].map(s => horn([V(s * 0.12, 0.27, 0.34), V(s * 0.26, 0.3, 0.37), V(s * 0.33, 0.38, 0.44), V(s * 0.3, 0.46, 0.52)], 0.042, 0.011, '#efe4c6', '#4a3a2a')),
      loft({ pts: [V(0, -0.18, -0.02), V(0, -0.2, 0.12)], r: [[0.2, 0.05, 0.05], [0.18, 0.05, 0.05]], color: '#5a3a22', tex: 4, ring: 16, capA: false, capB: false }),
      prep(new THREE.CylinderGeometry(0.07, 0.1, 0.16, 16), '#8a7650', 4, Mx(0, -0.36, 0.08)), prep(new THREE.SphereGeometry(0.03, 8, 6), '#3a2a1a', 4, Mx(0, -0.45, 0.08)),
    ]);
    const fl = (x) => leg([[V(x, 0, 0), [0.14, 0.14, 0.15]], [V(x, -0.28, 0.02), [0.1, 0.1, 0.1]], [V(x, -0.52, 0), [0.07, 0.07, 0.07]], [V(x, -0.8, 0.01), [0.058, 0.058, 0.058]], [V(x, -0.94, 0.03), [0.065, 0.065, 0.065]], [V(x, -1.02, 0.05), [0.062, 0.062, 0.062]]], (p, t) => C(B).lerp(C(L), sm(0.5, 0.95, t) * 0.4), '#2b2420', { hoofH: 0.07, split: true });
    const hl = (x) => leg([[V(x, 0, 0), [0.17, 0.17, 0.2]], [V(x, -0.3, 0.08), [0.12, 0.12, 0.13]], [V(x, -0.55, -0.12), [0.06, 0.06, 0.08]], [V(x, -0.8, -0.08), [0.055, 0.055, 0.055]], [V(x, -0.96, -0.04), [0.064, 0.064, 0.064]], [V(x, -1.04, -0.02), [0.062, 0.062, 0.062]]], (p, t) => C(B).lerp(C(L), sm(0.5, 0.95, t) * 0.4), '#2b2420', { hoofH: 0.07, split: true });
    return { body, head: headG, neck: V(0, 1.22, 0.72), legs: { fl: [0.24, 1.02, 0.55], hl: [0.26, 1.04, -0.62], front: fl, hind: hl },
      tail: mergeAll([tube([V(0, 0, 0), V(0, -0.1, -0.08), V(0, -0.45, -0.1), V(0, -0.72, -0.08)], 0.04, 0.022, B), ball(0.06, '#6a4424', 2, 0, -0.8, -0.08, 1, 1.8, 1)]), tailAt: V(0, 1.22, -0.9) };
  },
  // Pottoka: poni vasco robusto, castaño oscuro, crin espesa, cabeza de perfil recto, patas cortas
  pottoka: () => {
    const B = '#3b2418', Bl = '#5a3b28', M = '#140e0b';
    const coat = (u, th, p) => C(B).lerp(C(Bl), th < -0.5 ? 0.35 : 0.12 * vnoise(p.x * 4, p.y * 4, p.z * 4));
    const body = loft({ pts: [V(0, 0.9, -0.62), V(0, 0.92, -0.45), V(0, 0.88, -0.1), V(0, 0.88, 0.2), V(0, 0.94, 0.45), V(0, 0.95, 0.6)],
      r: [[0.16, 0.16, 0.18], [0.3, 0.28, 0.32], [0.32, 0.27, 0.35], [0.32, 0.27, 0.35], [0.29, 0.31, 0.34], [0.16, 0.2, 0.22]], color: coat, ring: 28, seg: 12 });
    const neckPts = [V(0, -0.05, -0.08), V(0, 0.16, 0.08), V(0, 0.34, 0.2), V(0, 0.44, 0.28)];
    const headG = mergeAll([
      loft({ pts: neckPts, r: [[0.2, 0.24, 0.28], [0.15, 0.18, 0.2], [0.12, 0.14, 0.15], [0.1, 0.12, 0.12]], color: coat, ring: 22 }),
      loft({ pts: [V(0, 0.5, 0.24), V(0, 0.46, 0.36), V(0, 0.36, 0.52), V(0, 0.28, 0.62)], r: [[0.1, 0.1, 0.13], [0.09, 0.08, 0.1], [0.07, 0.06, 0.075], [0.065, 0.055, 0.06]], color: (u) => u > 0.82 ? C('#2a1a12') : C(B), ring: 22, e: 2.2 }),
      ...[-1, 1].map(s => ball(0.018, '#0a0706', 0, s * 0.035, 0.29, 0.66, 1, 1.3, 0.6)),
      ...eye(0.075, 0.46, 0.38, 0.024, 1.0, B),
      ...[-1, 1].map(s => ear(0.11, 0.035, 0.014, B, '#6a4a38').applyMatrix4(Mx(s * 0.05, 0.54, 0.22, -0.2, 0, -s * 0.25))),
      // crin: cresta gruesa a lo largo del cuello y tupé sobre la frente
      loft({ pts: [V(0, 0.08, -0.14), V(0, 0.28, 0.0), V(0, 0.48, 0.14), V(0, 0.58, 0.22)], r: [[0.03, 0.1, 0.02], [0.035, 0.1, 0.02], [0.03, 0.08, 0.02], [0.02, 0.04, 0.01]], color: M, tex: 2, ring: 12,
        bump: (u, th, p) => 0.035 * vnoise(p.x * 30, p.y * 30, p.z * 30) }),
      tube([V(0, 0.56, 0.22), V(0, 0.52, 0.3), V(0, 0.44, 0.34)], 0.035, 0.015, M),
      ...[-1, 1].map(s => tube([V(s * 0.03, 0.4, 0.1), V(s * 0.1, 0.25, 0.02), V(s * 0.12, 0.1, -0.06)], 0.03, 0.01, M)),
    ]);
    const fl = (x) => leg([[V(x, 0, 0), [0.11, 0.11, 0.12]], [V(x, -0.2, 0.01), [0.075, 0.075, 0.075]], [V(x, -0.44, 0), [0.052, 0.052, 0.05]], [V(x, -0.64, 0.01), [0.042, 0.042, 0.042]], [V(x, -0.76, 0.03), [0.05, 0.05, 0.05]], [V(x, -0.86, 0.05), [0.052, 0.052, 0.052]]], (p, t) => C(B).lerp(C('#24160f'), sm(0.5, 0.8, t)), '#1a1411', { hoofH: 0.07 });
    const hl = (x) => leg([[V(x, 0, 0), [0.14, 0.14, 0.17]], [V(x, -0.24, 0.07), [0.1, 0.1, 0.11]], [V(x, -0.46, -0.1), [0.05, 0.05, 0.07]], [V(x, -0.66, -0.06), [0.044, 0.044, 0.044]], [V(x, -0.8, -0.02), [0.05, 0.05, 0.05]], [V(x, -0.88, 0), [0.052, 0.052, 0.052]]], (p, t) => C(B).lerp(C('#24160f'), sm(0.5, 0.8, t)), '#1a1411', { hoofH: 0.07 });
    return { body, head: headG, neck: V(0, 1.02, 0.5), legs: { fl: [0.16, 0.86, 0.42], hl: [0.17, 0.88, -0.44], front: fl, hind: hl },
      tail: mergeAll([loft({ pts: [V(0, 0, 0), V(0, -0.05, -0.12), V(0, -0.3, -0.18), V(0, -0.6, -0.14)], r: [[0.05, 0.05, 0.05], [0.07, 0.07, 0.07], [0.08, 0.07, 0.07], [0.04, 0.03, 0.03]], color: M, ring: 12, bump: (u, th, p) => 0.02 * vnoise(p.x * 40, p.y * 12, p.z * 40) })]), tailAt: V(0, 0.98, -0.6) };
  },
  // Corzo: pequeño y esbelto, pelaje rojizo de verano, hocico negro con bigotera y barbilla blancas,
  // orejas grandes, escudo anal blanco y cuernos cortos de tres puntas en el macho
  corzo: (rnd, opts = {}) => {
    const R = '#a4552a', Rl = '#c27a48', W = '#f4efe6';
    const coat = (u, th, p) => { let c = C(R).lerp(C(Rl), th < -0.5 ? 0.45 : 0.1 * vnoise(p.x * 6, p.y * 6, p.z * 6)); if (p.z < -0.3 && th > -1.2 && Math.abs(p.x) < 0.14) c.lerp(C(W), sm(-0.3, -0.38, p.z)); return c; };
    const body = loft({ pts: [V(0, 0.64, -0.42), V(0, 0.66, -0.3), V(0, 0.63, -0.05), V(0, 0.64, 0.18), V(0, 0.68, 0.34), V(0, 0.7, 0.42)],
      r: [[0.1, 0.1, 0.1], [0.15, 0.15, 0.17], [0.16, 0.15, 0.19], [0.16, 0.15, 0.2], [0.14, 0.17, 0.19], [0.08, 0.11, 0.11]], color: coat, ring: 24, seg: 12 });
    const face = (u, th, p) => u > 0.86 ? C('#141010') : u > 0.72 && th < -0.3 ? C(W) : C(R).lerp(C('#6a4a38'), sm(0.3, 0.7, u) * 0.4);
    const headG = mergeAll([
      loft({ pts: [V(0, -0.04, -0.06), V(0, 0.14, 0.04), V(0, 0.3, 0.1), V(0, 0.38, 0.13)], r: [[0.1, 0.12, 0.13], [0.075, 0.08, 0.09], [0.06, 0.065, 0.07], [0.055, 0.06, 0.06]], color: coat, ring: 20 }),
      loft({ pts: [V(0, 0.42, 0.09), V(0, 0.42, 0.17), V(0, 0.36, 0.28), V(0, 0.32, 0.33)], r: [[0.07, 0.07, 0.07], [0.065, 0.06, 0.06], [0.04, 0.035, 0.04], [0.03, 0.025, 0.03]], color: face, ring: 20 }),
      ...eye(0.052, 0.415, 0.19, 0.021, 1.0, R),
      ...[-1, 1].map(s => ear(0.13, 0.05, 0.01, (u) => u > 0.85 ? '#2a1a12' : R, '#e8d8c8').applyMatrix4(Mx(s * 0.045, 0.46, 0.1, -0.35, 0, -s * 0.55))),
      ...(opts.male !== false && rnd() < 0.5 ? [-1, 1].flatMap(s => [horn([V(s * 0.03, 0.47, 0.12), V(s * 0.04, 0.58, 0.1), V(s * 0.035, 0.68, 0.08)], 0.013, 0.005, '#6a4a30', '#e8dcc0'),
        horn([V(s * 0.037, 0.57, 0.105), V(s * 0.04, 0.62, 0.15)], 0.008, 0.004, '#6a4a30', '#e8dcc0'), horn([V(s * 0.036, 0.63, 0.09), V(s * 0.037, 0.66, 0.05)], 0.007, 0.003, '#6a4a30', '#e8dcc0')]) : []),
    ]);
    const lc = (p, t) => C(R).lerp(C('#6a3a20'), sm(0.4, 0.9, t));
    const fl = (x) => leg([[V(x, 0, 0), [0.06, 0.06, 0.07]], [V(x, -0.18, 0.01), [0.04, 0.04, 0.04]], [V(x, -0.34, 0), [0.022, 0.022, 0.022]], [V(x, -0.54, 0.01), [0.016, 0.016, 0.016]], [V(x, -0.62, 0.03), [0.018, 0.018, 0.018]]], lc, '#1a1411', { hoofH: 0.035, split: true });
    const hl = (x) => leg([[V(x, 0, 0), [0.08, 0.08, 0.1]], [V(x, -0.16, 0.06), [0.055, 0.055, 0.06]], [V(x, -0.34, -0.1), [0.022, 0.022, 0.03]], [V(x, -0.56, -0.05), [0.017, 0.017, 0.017]], [V(x, -0.64, -0.02), [0.018, 0.018, 0.018]]], lc, '#1a1411', { hoofH: 0.035, split: true });
    return { body, head: headG, neck: V(0, 0.72, 0.34), legs: { fl: [0.08, 0.62, 0.28], hl: [0.09, 0.64, -0.28], front: fl, hind: hl }, tail: null };
  },
  // Ciervo: gran macho pardo-grisáceo, cuello oscuro con melena, escudo claro y cuerna ramificada
  ciervo: () => {
    const B = '#7b5638', Bd = '#4f3524', Lr = '#d8c4a0';
    const coat = (u, th, p) => { let c = C(B).lerp(C('#a88a68'), th < -0.5 ? 0.35 : 0.1 * vnoise(p.x * 4, p.y * 4, p.z * 4)); if (p.z < -0.55 && Math.abs(p.x) < 0.2) c.lerp(C(Lr), sm(-0.55, -0.68, p.z)); return c; };
    const body = loft({ pts: [V(0, 1.12, -0.72), V(0, 1.15, -0.55), V(0, 1.1, -0.15), V(0, 1.12, 0.25), V(0, 1.2, 0.52), V(0, 1.24, 0.66)],
      r: [[0.16, 0.16, 0.16], [0.26, 0.25, 0.3], [0.28, 0.25, 0.33], [0.28, 0.26, 0.34], [0.26, 0.3, 0.34], [0.14, 0.2, 0.2]], color: coat, ring: 28, seg: 12 });
    const neckC = (u, th, p) => C(Bd).lerp(C(B), sm(0.7, 1, u) * 0.5);
    const antler = [];
    for (const s of [-1, 1]) {
      const main = [V(s * 0.06, 0.62, 0.16), V(s * 0.16, 0.8, 0.12), V(s * 0.24, 1.0, 0.02), V(s * 0.26, 1.2, -0.08), V(s * 0.22, 1.36, -0.12)];
      antler.push(horn(main, 0.03, 0.01, '#6a5238', '#efe6d0'));
      for (const [a, b] of [[[0.1, 0.7, 0.14], [0.13, 0.76, 0.34]], [[0.16, 0.82, 0.12], [0.2, 0.9, 0.3]], [[0.24, 1.02, 0.02], [0.34, 1.12, 0.12]], [[0.25, 1.22, -0.08], [0.34, 1.34, -0.02]], [[0.25, 1.22, -0.08], [0.18, 1.38, -0.02]]])
        antler.push(horn([V(s * a[0], a[1], a[2]), V(s * (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.02, (a[2] + b[2]) / 2), V(s * b[0], b[1], b[2])], 0.016, 0.005, '#6a5238', '#efe6d0'));
    }
    const headG = mergeAll([
      loft({ pts: [V(0, -0.06, -0.1), V(0, 0.2, 0.04), V(0, 0.42, 0.14), V(0, 0.54, 0.18)], r: [[0.18, 0.2, 0.26], [0.13, 0.14, 0.2], [0.1, 0.1, 0.13], [0.085, 0.09, 0.1]], color: neckC, ring: 22,
        bump: (u, th, p) => th < -0.4 && u < 0.8 ? 0.04 * vnoise(p.x * 25, p.y * 25, p.z * 25) : 0 }),
      loft({ pts: [V(0, 0.6, 0.12), V(0, 0.6, 0.24), V(0, 0.5, 0.4), V(0, 0.44, 0.48)], r: [[0.1, 0.1, 0.1], [0.09, 0.085, 0.085], [0.06, 0.05, 0.055], [0.045, 0.038, 0.042]], color: (u) => u > 0.86 ? C('#1a1412') : C(B).lerp(C('#5a3e2a'), sm(0.4, 0.8, u) * 0.5), ring: 20 }),
      ...eye(0.075, 0.6, 0.26, 0.026, 1.0, B),
      ...[-1, 1].map(s => ear(0.17, 0.06, 0.012, B, '#d8c8b0').applyMatrix4(Mx(s * 0.07, 0.64, 0.14, -0.2, 0, -s * 0.9))),
      ...antler,
    ]);
    const lc = (p, t) => C(B).lerp(C('#4a3424'), sm(0.4, 0.9, t));
    const fl = (x) => leg([[V(x, 0, 0), [0.1, 0.1, 0.11]], [V(x, -0.3, 0.02), [0.065, 0.065, 0.065]], [V(x, -0.58, 0), [0.036, 0.036, 0.036]], [V(x, -0.9, 0.01), [0.028, 0.028, 0.028]], [V(x, -1.02, 0.04), [0.032, 0.032, 0.032]]], lc, '#1a1411', { hoofH: 0.05, split: true });
    const hl = (x) => leg([[V(x, 0, 0), [0.13, 0.13, 0.16]], [V(x, -0.28, 0.1), [0.09, 0.09, 0.1]], [V(x, -0.56, -0.16), [0.036, 0.036, 0.05]], [V(x, -0.92, -0.08), [0.028, 0.028, 0.028]], [V(x, -1.04, -0.04), [0.032, 0.032, 0.032]]], lc, '#1a1411', { hoofH: 0.05, split: true });
    return { body, head: headG, neck: V(0, 1.24, 0.6), legs: { fl: [0.15, 1.02, 0.46], hl: [0.16, 1.04, -0.5], front: fl, hind: hl },
      tail: tube([V(0, 0, 0), V(0, -0.06, -0.04), V(0, -0.16, -0.05)], 0.035, 0.02, '#3a2a1c'), tailAt: V(0, 1.2, -0.72) };
  },
  // Jabalí: delantera maciza y trasera estrecha, cabeza en cuña, cerdas oscuras con crin dorsal, jeta y colmillos
  jabali: () => {
    const B = '#3a302a', Bl = '#5a4a3e';
    const coat = (u, th, p) => C(B).lerp(C(Bl), 0.25 * vnoise(p.x * 9, p.y * 9, p.z * 9) + (th < -0.6 ? 0.1 : 0));
    const bristle = (u, th, p) => { const top = Math.max(0, Math.sin(th)); return 0.006 * vnoise(p.x * 60, p.y * 60, p.z * 60) + (top > 0.93 ? 0.05 * (top - 0.93) / 0.07 * (0.6 + 0.4 * vnoise(p.x * 80, p.y * 80, p.z * 80)) * sm(0.15, 0.5, u) : 0); };
    const body = loft({ pts: [V(0, 0.55, -0.62), V(0, 0.56, -0.48), V(0, 0.58, -0.15), V(0, 0.62, 0.2), V(0, 0.64, 0.42), V(0, 0.62, 0.52)],
      r: [[0.1, 0.1, 0.12], [0.2, 0.2, 0.24], [0.25, 0.26, 0.3], [0.28, 0.33, 0.32], [0.27, 0.34, 0.3], [0.2, 0.26, 0.24]], color: coat, ring: 28, seg: 12, bump: bristle });
    const headG = mergeAll([
      loft({ pts: [V(0, 0.02, -0.06), V(0, 0.0, 0.1), V(0, -0.08, 0.26), V(0, -0.15, 0.38), V(0, -0.17, 0.43)], r: [[0.22, 0.27, 0.23], [0.17, 0.2, 0.17], [0.11, 0.1, 0.11], [0.075, 0.07, 0.075], [0.07, 0.065, 0.07]], color: (u) => u > 0.93 ? C('#6a544a') : C(B), ring: 24, bump: (u, th, p) => 0.006 * vnoise(p.x * 60, p.y * 60, p.z * 60) }),
      prep(new THREE.CylinderGeometry(0.068, 0.068, 0.02, 20), '#8a6e60', 0, Mx(0, -0.175, 0.455, Math.PI / 2 - 0.35)),
      ...[-1, 1].map(s => ball(0.013, '#1a1210', 0, s * 0.024, -0.17, 0.465)),
      ...[-1, 1].map(s => horn([V(s * 0.055, -0.17, 0.34), V(s * 0.08, -0.12, 0.37), V(s * 0.085, -0.08, 0.35)], 0.013, 0.004, '#f0e6d0', '#fffaf0')),
      ...eye(0.1, 0.06, 0.16, 0.016, 1.1, B),
      ...[-1, 1].map(s => ear(0.1, 0.045, 0.012, B, '#6a5448').applyMatrix4(Mx(s * 0.1, 0.16, 0.04, -0.3, 0, -s * 0.5))),
    ]);
    const fl = (x) => leg([[V(x, 0, 0), [0.09, 0.09, 0.1]], [V(x, -0.16, 0.01), [0.055, 0.055, 0.055]], [V(x, -0.3, 0), [0.032, 0.032, 0.032]], [V(x, -0.42, 0.02), [0.03, 0.03, 0.03]]], B, '#161110', { hoofH: 0.04, split: true });
    const hl = (x) => leg([[V(x, 0, 0), [0.09, 0.09, 0.11]], [V(x, -0.14, 0.05), [0.06, 0.06, 0.06]], [V(x, -0.26, -0.06), [0.03, 0.03, 0.035]], [V(x, -0.4, -0.02), [0.03, 0.03, 0.03]]], B, '#161110', { hoofH: 0.04, split: true });
    return { body, head: headG, neck: V(0, 0.64, 0.46), legs: { fl: [0.13, 0.42, 0.36], hl: [0.12, 0.4, -0.44], front: fl, hind: hl },
      tail: mergeAll([tube([V(0, 0, 0), V(0, -0.12, -0.03), V(0, -0.22, -0.02)], 0.014, 0.01, B), ball(0.025, '#1a1412', 2, 0, -0.24, -0.02, 1, 1.6, 1)]), tailAt: V(0, 0.6, -0.62) };
  },
  // Euskal artzain txakurra (perro pastor vasco, tipo Gorbeia): capa rojiza fuego, orejas semierguidas, cola baja
  dog: () => {
    const R = '#b8692e', Rl = '#dca06a';
    const coat = (u, th, p) => C(R).lerp(C(Rl), th < -0.5 ? 0.5 : 0.1 * vnoise(p.x * 8, p.y * 8, p.z * 8));
    const body = loft({ pts: [V(0, 0.46, -0.34), V(0, 0.47, -0.24), V(0, 0.46, 0.0), V(0, 0.47, 0.2), V(0, 0.5, 0.32)],
      r: [[0.08, 0.09, 0.09], [0.12, 0.12, 0.11], [0.12, 0.12, 0.12], [0.13, 0.13, 0.17], [0.09, 0.12, 0.14]], color: coat, ring: 22, seg: 12,
      bump: (u, th, p) => th < -0.4 ? -0.05 * sm(0.2, 0.55, u) * (1 - sm(0.6, 0.85, u)) : 0.006 * vnoise(p.x * 30, p.y * 30, p.z * 30) });
    const headG = mergeAll([
      loft({ pts: [V(0, -0.04, -0.06), V(0, 0.04, 0.0), V(0, 0.1, 0.04)], r: [[0.1, 0.12, 0.14], [0.08, 0.09, 0.1], [0.07, 0.075, 0.08]], color: coat, ring: 20 }),
      loft({ pts: [V(0, 0.13, -0.04), V(0, 0.16, 0.03), V(0, 0.15, 0.09), V(0, 0.12, 0.16), V(0, 0.11, 0.2)], r: [[0.06, 0.06, 0.06], [0.078, 0.075, 0.07], [0.06, 0.05, 0.06], [0.04, 0.033, 0.04], [0.033, 0.028, 0.034]], color: (u, th) => u > 0.92 ? C('#161212') : u > 0.55 && th < -0.2 ? C(Rl) : C(R).lerp(C('#6a3818'), sm(0.55, 0.85, u) * 0.5), ring: 22 }),
      ball(0.01, '#e0607a', 0, 0, 0.085, 0.17, 1.4, 0.5, 1.6),
      ...eye(0.042, 0.165, 0.085, 0.016, 0.45, R, '#3a2210'),
      ...[-1, 1].map(s => ear(0.085, 0.05, 0.01, (u) => u > 0.62 ? '#8a4a22' : R, '#e6b890').applyMatrix4(Mx(s * 0.05, 0.19, -0.03, -0.2, 0, -s * 0.4))),
    ]);
    const lc = (p, t) => C(R).lerp(C(Rl), sm(0.3, 0.8, t));
    const fl = (x) => leg([[V(x, 0, 0), [0.045, 0.045, 0.05]], [V(x, -0.14, 0.01), [0.032, 0.032, 0.032]], [V(x, -0.3, 0), [0.024, 0.024, 0.024]], [V(x, -0.4, 0.015), [0.024, 0.024, 0.024]]], lc, Rl, { paw: true, hoofH: 0 });
    const hl = (x) => leg([[V(x, 0, 0), [0.06, 0.06, 0.07]], [V(x, -0.14, 0.05), [0.04, 0.04, 0.045]], [V(x, -0.26, -0.06), [0.022, 0.022, 0.026]], [V(x, -0.4, -0.02), [0.024, 0.024, 0.024]]], lc, Rl, { paw: true, hoofH: 0 });
    return { body, head: headG, neck: V(0, 0.54, 0.3), legs: { fl: [0.075, 0.4, 0.24], hl: [0.075, 0.4, -0.26], front: fl, hind: hl },
      tail: loft({ pts: [V(0, 0, 0), V(0, -0.06, -0.08), V(0, -0.2, -0.12), V(0, -0.32, -0.08)], r: [[0.03, 0.03, 0.03], [0.04, 0.04, 0.04], [0.04, 0.035, 0.035], [0.015, 0.012, 0.012]], color: (u) => C(R).lerp(C(Rl), u * 0.6), ring: 12 }), tailAt: V(0, 0.48, -0.34) };
  },
  // Zorro: rojo anaranjado, garganta y punta de la cola blancas, «calcetines» y dorso de orejas negros, cola tupida
  zorro: () => {
    const O = '#c2561f', Ol = '#d98040', W = '#f3ede4', K = '#1c1614';
    const coat = (u, th, p) => th < -0.4 && p.z > 0.05 ? C(W) : C(O).lerp(C(Ol), 0.2 * vnoise(p.x * 9, p.y * 9, p.z * 9));
    const body = loft({ pts: [V(0, 0.34, -0.25), V(0, 0.35, -0.17), V(0, 0.34, 0.0), V(0, 0.36, 0.14), V(0, 0.38, 0.22)],
      r: [[0.07, 0.07, 0.07], [0.1, 0.1, 0.11], [0.105, 0.1, 0.12], [0.1, 0.11, 0.13], [0.06, 0.08, 0.09]], color: coat, ring: 20, seg: 10 });
    const headG = mergeAll([
      loft({ pts: [V(0, -0.03, -0.04), V(0, 0.06, 0.02), V(0, 0.12, 0.05)], r: [[0.07, 0.08, 0.09], [0.06, 0.06, 0.07], [0.055, 0.055, 0.06]], color: (u, th) => th < -0.3 ? C(W) : C(O), ring: 18 }),
      loft({ pts: [V(0, 0.15, -0.02), V(0, 0.16, 0.05), V(0, 0.13, 0.13), V(0, 0.11, 0.2)], r: [[0.07, 0.065, 0.06], [0.07, 0.06, 0.06], [0.035, 0.03, 0.03], [0.015, 0.012, 0.014]], color: (u, th) => u > 0.9 ? C(K) : th < -0.2 && u > 0.3 ? C(W) : C(O), ring: 20 }),
      ...eye(0.04, 0.17, 0.07, 0.013, 0.55, O, '#c8902a', '#0d0806'),
      ...[-1, 1].map(s => ear(0.1, 0.05, 0.008, (u) => u > 0.6 ? K : O, W).applyMatrix4(Mx(s * 0.04, 0.2, 0.0, -0.15, 0, -s * 0.3))),
    ]);
    const lc = (p, t) => t > 0.35 ? C(K) : C(O);
    const fl = (x) => leg([[V(x, 0, 0), [0.035, 0.035, 0.04]], [V(x, -0.12, 0.01), [0.024, 0.024, 0.024]], [V(x, -0.24, 0), [0.018, 0.018, 0.018]], [V(x, -0.3, 0.01), [0.018, 0.018, 0.018]]], lc, K, { paw: true, hoofH: 0 });
    const hl = (x) => leg([[V(x, 0, 0), [0.045, 0.045, 0.05]], [V(x, -0.1, 0.04), [0.03, 0.03, 0.035]], [V(x, -0.2, -0.05), [0.017, 0.017, 0.02]], [V(x, -0.3, -0.02), [0.018, 0.018, 0.018]]], lc, K, { paw: true, hoofH: 0 });
    return { body, head: headG, neck: V(0, 0.4, 0.2), legs: { fl: [0.055, 0.3, 0.15], hl: [0.055, 0.3, -0.16], front: fl, hind: hl },
      tail: loft({ pts: [V(0, 0, 0), V(0, -0.06, -0.1), V(0, -0.12, -0.26), V(0, -0.12, -0.42)], r: [[0.03, 0.03, 0.03], [0.07, 0.07, 0.07], [0.08, 0.075, 0.075], [0.02, 0.02, 0.02]], color: (u) => u > 0.82 ? C(W) : C(O), ring: 16, bump: (u, th, p) => 0.012 * vnoise(p.x * 40, p.y * 40, p.z * 40) }), tailAt: V(0, 0.36, -0.25) };
  },
  // Cabra pirenaica doméstica: pelo largo pardo-negro, barba, cuernos hacia atrás
  goat: () => {
    const B = '#4a3a2e', Bl = '#8a6a4a';
    const coat = (u, th, p) => C(B).lerp(C(Bl), 0.3 * vnoise(p.x * 6, p.y * 6, p.z * 6));
    const body = loft({ pts: [V(0, 0.58, -0.42), V(0, 0.6, -0.3), V(0, 0.58, 0.0), V(0, 0.6, 0.26), V(0, 0.62, 0.38)],
      r: [[0.1, 0.1, 0.1], [0.17, 0.16, 0.2], [0.19, 0.16, 0.24], [0.17, 0.18, 0.22], [0.1, 0.12, 0.13]], color: coat, ring: 22, seg: 12,
      bump: (u, th, p) => th < -0.2 ? 0.05 * Math.pow(-Math.sin(th), 2) * vnoise(p.x * 20, p.z * 20, 1) : 0.01 * vnoise(p.x * 30, p.y * 30, p.z * 30) });
    const headG = mergeAll([
      loft({ pts: [V(0, -0.04, -0.06), V(0, 0.12, 0.04), V(0, 0.24, 0.1)], r: [[0.1, 0.11, 0.13], [0.07, 0.08, 0.09], [0.06, 0.065, 0.07]], color: coat, ring: 18 }),
      loft({ pts: [V(0, 0.3, 0.06), V(0, 0.29, 0.14), V(0, 0.22, 0.26), V(0, 0.19, 0.3)], r: [[0.065, 0.07, 0.065], [0.06, 0.06, 0.06], [0.035, 0.035, 0.035], [0.028, 0.026, 0.028]], color: (u) => u > 0.88 ? C('#1a1412') : C(B), ring: 18 }),
      tube([V(0, 0.18, 0.24), V(0, 0.1, 0.23), V(0, 0.04, 0.2)], 0.025, 0.006, '#2a1e18'),
      ...eye(0.05, 0.3, 0.16, 0.018, 0.75, B, '#c8a040', '#0d0806'),
      ...[-1, 1].map(s => ear(0.1, 0.035, 0.01, B, '#7a5a48').applyMatrix4(Mx(s * 0.055, 0.3, 0.08, 0, 0, -s * 1.4))),
      ...[-1, 1].map(s => horn([V(s * 0.03, 0.36, 0.08), V(s * 0.045, 0.46, 0.02), V(s * 0.06, 0.5, -0.1), V(s * 0.07, 0.46, -0.18)], 0.02, 0.006, '#6a5a48', '#2a2018')),
    ]);
    const fl = (x) => leg([[V(x, 0, 0), [0.05, 0.05, 0.06]], [V(x, -0.2, 0.01), [0.032, 0.032, 0.032]], [V(x, -0.36, 0), [0.022, 0.022, 0.022]], [V(x, -0.48, 0.02), [0.024, 0.024, 0.024]]], B, '#15100e', { hoofH: 0.035, split: true });
    const hl = (x) => leg([[V(x, 0, 0), [0.07, 0.07, 0.08]], [V(x, -0.16, 0.05), [0.04, 0.04, 0.045]], [V(x, -0.3, -0.06), [0.022, 0.022, 0.026]], [V(x, -0.48, -0.02), [0.024, 0.024, 0.024]]], B, '#15100e', { hoofH: 0.035, split: true });
    return { body, head: headG, neck: V(0, 0.66, 0.34), legs: { fl: [0.1, 0.48, 0.26], hl: [0.1, 0.48, -0.28], front: fl, hind: hl },
      tail: tube([V(0, 0, 0), V(0, 0.06, -0.05)], 0.025, 0.012, B), tailAt: V(0, 0.66, -0.42) };
  },
};

// ---------- Montaje: mismo interfaz que el cuadrúpedo antiguo ----------
// { root, body, head (pivote del cuello), legs [delanteras izq/der, traseras izq/der], tail }
export function beast(kind, rnd = Math.random, opts = {}) {
  const S = BEASTS[kind](rnd, opts);
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const mk = (geo, parent) => { const m = new THREE.Mesh(geo, BEAST_MAT); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  mk(S.body, body);
  const head = new THREE.Group(); head.position.copy(S.neck); body.add(head); mk(S.head, head);
  const legs = [];
  const fg = S.legs.front(0), hg = S.legs.hind(0);
  const [fx, fy, fz] = S.legs.fl, [hx, hy, hz] = S.legs.hl;
  for (const [x, y, z, g] of [[-fx, fy, fz, fg], [fx, fy, fz, fg], [-hx, hy, hz, hg], [hx, hy, hz, hg]]) {
    const p = new THREE.Group(); p.position.set(x, y, z); body.add(p); mk(g, p); legs.push(p);
  }
  let tail = null;
  if (S.tail) { tail = new THREE.Group(); tail.position.copy(S.tailAt); body.add(tail); mk(S.tail, tail); }
  root.userData.outlineOn = false;
  return { root, body, head, legs, tail };
}
// invierte el orden de los triángulos tras reflejar (para que las caras sigan mirando afuera)
function flip(g) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 2]; ix[i + 2] = t; } g.index.needsUpdate = true; g.computeVertexNormals(); }

// ---------- Aves en vuelo ----------
// Ala como superficie: planta con el borde de ataque, las primarias separadas en «dedos» y el color
// de coberteras y remeras. Se construye como rejilla (envergadura × cuerda) con leve perfil.
function wing({ span, chord, tipChord = 0.5, fingers = 0, fingerLen = 0.25, sweep = 0, cov = '#8a6a45', flight = '#2e241c', tip = null, bar = null, window = null, dihedral = 0.12 }) {
  const NS = 18, NC = 6, pos = [], col = [], idx = [], c = new THREE.Color();
  const handStart = fingers ? 1 - fingerLen : 1;
  for (let i = 0; i <= NS; i++) {
    const s = i / NS * handStart, x = s * span;
    const ch = chord * (1 - (1 - tipChord) * Math.pow(s, 1.4)), lead = chord * 0.32 + chord * 0.12 * Math.sin(Math.PI * Math.min(1, s * 1.1)) - sweep * s * s * span;
    for (let j = 0; j <= NC; j++) {
      const t = j / NC, z = lead - t * ch * (1 + 0.08 * Math.sin(t * Math.PI) * (1 - s)), y = Math.sin(t * Math.PI) * ch * 0.06 * (1 - s) + s * s * span * dihedral;
      pos.push(x, y, z);
      let cc = C(cov).lerp(C(flight), sm(0.35, 0.65, t));
      if (window && s > window[0] && s < window[1] && t > 0.4) cc = C(window[2]);
      if (bar && t > bar[0] && t < bar[1]) cc = C(bar[2]);
      if (tip && s > tip[0]) cc = C(tip[1]);
      c.copy(cc); col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < NS; i++) for (let j = 0; j < NC; j++) { const a = i * (NC + 1) + j, b = a + NC + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  g.setAttribute('aTex', new THREE.BufferAttribute(new Float32Array(pos.length / 3).fill(7), 1));
  const parts = [g];
  // primarias separadas (los «dedos» de buitres y águilas)
  for (let f = 0; f < fingers; f++) {
    const s0 = handStart, x0 = s0 * span, ch0 = chord * (1 - (1 - tipChord) * Math.pow(s0, 1.4)), lead0 = chord * 0.32 + chord * 0.12 * Math.sin(Math.PI * Math.min(1, s0 * 1.1)) - sweep * s0 * s0 * span;
    const zc = lead0 - (f + 0.5) / fingers * ch0 * 0.9, len = fingerLen * span * (0.75 + 0.35 * Math.sin((f + 0.5) / fingers * Math.PI)) * (f === 0 ? 0.8 : 1);
    const a = (f - (fingers - 1) / 2) * -0.13;
    const fg = loft({ pts: [V(x0 - 0.02, s0 * s0 * span * dihedral, zc), V(x0 + len * 0.5 * Math.cos(a), s0 * s0 * span * dihedral + 0.02, zc + len * 0.5 * Math.sin(a)), V(x0 + len * Math.cos(a), s0 * s0 * span * dihedral + 0.05, zc + len * Math.sin(a))],
      r: [[ch0 / fingers * 0.42, 0.006, 0.006], [ch0 / fingers * 0.5, 0.005, 0.005], [0.01, 0.003, 0.003]], seg: 6, ring: 8, color: flight, tex: 7, side0: V(0, 0, 1) });
    parts.push(fg);
  }
  return mergeAll(parts);
}
export const BIRDS = {
  // Buitre leonado: 2,6 m de envergadura; cuerpo leonado, remeras negras, gorguera blanca, cabeza de plumón claro,
  // cola corta y cuadrada, 7 «dedos»; planea con las alas en ligera V
  buitre: () => ({
    body: mergeAll([
      loft({ pts: [V(0, 0, -0.5), V(0, 0.02, -0.25), V(0, 0.02, 0.05), V(0, 0.03, 0.25), V(0, 0.05, 0.36)], r: [[0.08, 0.02, 0.02], [0.15, 0.1, 0.12], [0.17, 0.12, 0.15], [0.14, 0.11, 0.12], [0.1, 0.1, 0.1]], color: (u, th) => C('#a88252').lerp(C('#7a5a38'), th > 0 ? 0.3 : 0), tex: 7, ring: 18 }),
      loft({ pts: [V(0, 0.06, 0.3), V(0, 0.08, 0.42), V(0, 0.06, 0.54), V(0, 0.04, 0.62)], r: [[0.12, 0.1, 0.1], [0.06, 0.055, 0.055], [0.055, 0.055, 0.05], [0.045, 0.04, 0.04]], color: (u) => u < 0.25 ? C('#f4efe6') : C('#e8dcc4'), tex: 7, ring: 16, bump: (u, th, p) => u < 0.28 ? 0.035 * vnoise(p.x * 40, p.y * 40, p.z * 40) : 0 }),
      loft({ pts: [V(0, 0.04, 0.62), V(0, 0.03, 0.7), V(0, 0.0, 0.74)], r: [[0.028, 0.03, 0.02], [0.02, 0.022, 0.012], [0.006, 0.005, 0.004]], color: '#d8c890', tex: 4, ring: 12 }),
      loft({ pts: [V(0, 0.0, -0.45), V(0, -0.01, -0.62), V(0, -0.02, -0.72)], r: [[0.1, 0.02, 0.02], [0.13, 0.015, 0.015], [0.14, 0.01, 0.01]], color: '#3a2c20', tex: 7, ring: 12, e: 3 }),
    ]),
    wing: wing({ span: 1.25, chord: 0.62, tipChord: 0.75, fingers: 7, fingerLen: 0.28, cov: '#b08a58', flight: '#2e231a', dihedral: 0.1 }),
    root: 0.12, flap: 0.12, speed: 1.5, scale: 1,
  }),
  // Quebrantahuesos: alas largas y estrechas, cola larga en rombo; dorso gris pizarra, pecho y cabeza anaranjados, «barba» negra
  quebrantahuesos: () => ({
    body: mergeAll([
      loft({ pts: [V(0, 0, -0.4), V(0, 0.02, -0.2), V(0, 0.02, 0.1), V(0, 0.04, 0.3), V(0, 0.05, 0.4)], r: [[0.07, 0.02, 0.02], [0.13, 0.09, 0.11], [0.14, 0.1, 0.13], [0.11, 0.09, 0.1], [0.08, 0.08, 0.08]], color: (u, th) => th > 0.3 ? C('#4a4a50') : C('#d9853a'), tex: 7, ring: 18 }),
      loft({ pts: [V(0, 0.05, 0.38), V(0, 0.07, 0.48), V(0, 0.05, 0.56)], r: [[0.075, 0.075, 0.075], [0.065, 0.06, 0.06], [0.04, 0.035, 0.035]], color: (u, th) => u > 0.6 && Math.abs(Math.cos(th)) > 0.6 ? C('#141414') : C('#e8a060'), tex: 7, ring: 16 }),
      loft({ pts: [V(0, 0.03, 0.55), V(0, 0.02, 0.62), V(0, -0.01, 0.65)], r: [[0.024, 0.026, 0.018], [0.016, 0.018, 0.01], [0.005, 0.004, 0.004]], color: '#3a3430', tex: 4, ring: 10 }),
      tube([V(0, -0.01, 0.56), V(0, -0.05, 0.57), V(0, -0.08, 0.56)], 0.018, 0.005, '#141414', 7),
      ...[-1, 1].map(s => ball(0.012, '#d42020', 0, s * 0.045, 0.07, 0.5)),
      // cola en rombo, muy característica
      (() => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.16, -0.25); sh.lineTo(0, -0.62); sh.lineTo(-0.16, -0.25); sh.closePath(); const g = new THREE.ShapeGeometry(sh); g.rotateX(Math.PI / 2); return prep(g, '#3e3e44', 7, Mx(0, 0, -0.34)); })(),
    ]),
    wing: wing({ span: 1.35, chord: 0.44, tipChord: 0.12, fingers: 0, sweep: 0.16, cov: '#4a4a52', flight: '#26262c', dihedral: 0.02 }),
    root: 0.1, flap: 0.1, speed: 1.6, scale: 1,
  }),
  // Milano real: cola rojiza muy ahorquillada, cuerpo castaño, cabeza gris clara, «ventanas» blancas y puntas negras
  milano: () => ({
    body: mergeAll([
      loft({ pts: [V(0, 0, -0.26), V(0, 0.01, -0.12), V(0, 0.02, 0.08), V(0, 0.03, 0.2)], r: [[0.05, 0.015, 0.015], [0.08, 0.06, 0.07], [0.085, 0.065, 0.075], [0.06, 0.055, 0.055]], color: '#a24a22', tex: 7, ring: 16 }),
      loft({ pts: [V(0, 0.03, 0.2), V(0, 0.04, 0.28), V(0, 0.03, 0.33)], r: [[0.055, 0.05, 0.05], [0.045, 0.04, 0.04], [0.02, 0.018, 0.018]], color: '#d8d4cc', tex: 7, ring: 14 }),
      ball(0.012, '#e0b020', 4, 0, 0.02, 0.345, 1, 0.8, 1.6),
      (() => { const sh = new THREE.Shape(); sh.moveTo(-0.06, 0); sh.lineTo(0.06, 0); sh.lineTo(0.14, -0.36); sh.lineTo(0.03, -0.24); sh.lineTo(0, -0.26); sh.lineTo(-0.03, -0.24); sh.lineTo(-0.14, -0.36); sh.closePath(); const g = new THREE.ShapeGeometry(sh); g.rotateX(Math.PI / 2); return prep(g, '#c8602a', 7, Mx(0, 0, -0.22)); })(),
    ]),
    wing: wing({ span: 0.78, chord: 0.3, tipChord: 0.55, fingers: 5, fingerLen: 0.24, sweep: 0.18, cov: '#9a4a24', flight: '#2a2420', window: [0.55, 0.76, '#e8e0d0'], dihedral: -0.06 }),
    root: 0.06, flap: 0.22, speed: 2.2, scale: 1,
  }),
  // Águila real: parda oscura con nuca dorada, alas largas con dedos, cola más larga que el buitre
  aguila: () => ({
    body: mergeAll([
      loft({ pts: [V(0, 0, -0.34), V(0, 0.01, -0.16), V(0, 0.02, 0.1), V(0, 0.03, 0.26)], r: [[0.06, 0.02, 0.02], [0.11, 0.08, 0.1], [0.12, 0.09, 0.11], [0.08, 0.08, 0.08]], color: '#4a3424', tex: 7, ring: 16 }),
      loft({ pts: [V(0, 0.04, 0.26), V(0, 0.05, 0.36), V(0, 0.04, 0.42)], r: [[0.07, 0.07, 0.07], [0.06, 0.055, 0.055], [0.035, 0.03, 0.03]], color: (u, th) => th > 0 ? C('#c89a4a') : C('#5a4030'), tex: 7, ring: 14 }),
      loft({ pts: [V(0, 0.03, 0.42), V(0, 0.02, 0.48), V(0, -0.02, 0.5)], r: [[0.02, 0.022, 0.016], [0.014, 0.015, 0.008], [0.004, 0.004, 0.003]], color: '#e8c040', tex: 4, ring: 10 }),
      loft({ pts: [V(0, 0, -0.3), V(0, -0.01, -0.46), V(0, -0.02, -0.58)], r: [[0.07, 0.015, 0.015], [0.1, 0.012, 0.012], [0.11, 0.01, 0.01]], color: '#3a2a1e', tex: 7, ring: 12, e: 3 }),
    ]),
    wing: wing({ span: 1.0, chord: 0.46, tipChord: 0.7, fingers: 6, fingerLen: 0.3, cov: '#5a4030', flight: '#2a1e16', dihedral: 0.14 }),
    root: 0.09, flap: 0.16, speed: 1.9, scale: 1,
  }),
  // Cigüeña blanca: blanca con remeras negras, cuello estirado, pico y patas rojas que asoman por detrás
  ciguena: () => ({
    body: mergeAll([
      loft({ pts: [V(0, 0, -0.3), V(0, 0.01, -0.12), V(0, 0.02, 0.1), V(0, 0.03, 0.2)], r: [[0.05, 0.015, 0.015], [0.1, 0.08, 0.09], [0.1, 0.08, 0.09], [0.06, 0.05, 0.05]], color: '#f6f4ee', tex: 7, ring: 16 }),
      tube([V(0, 0.03, 0.18), V(0, 0.04, 0.36), V(0, 0.04, 0.5)], 0.045, 0.03, '#f6f4ee', 7),
      ball(0.045, '#f6f4ee', 7, 0, 0.045, 0.52, 1, 0.9, 1.2),
      loft({ pts: [V(0, 0.04, 0.55), V(0, 0.03, 0.7), V(0, 0.01, 0.8)], r: [[0.016, 0.018, 0.014], [0.01, 0.011, 0.008], [0.003, 0.003, 0.003]], color: '#d8302a', tex: 4, ring: 10 }),
      ...[-1, 1].map(s => tube([V(s * 0.03, -0.03, -0.18), V(s * 0.03, -0.04, -0.45), V(s * 0.03, -0.045, -0.62)], 0.012, 0.008, '#d8302a', 4)),
      loft({ pts: [V(0, 0.0, -0.26), V(0, 0.0, -0.38)], r: [[0.07, 0.012, 0.012], [0.09, 0.01, 0.01]], color: '#f6f4ee', tex: 7, ring: 10, e: 3 }),
    ]),
    wing: wing({ span: 1.0, chord: 0.4, tipChord: 0.6, fingers: 5, fingerLen: 0.26, cov: '#f6f4ee', flight: '#161616', dihedral: 0.04 }),
    root: 0.07, flap: 0.3, speed: 1.8, scale: 1,
  }),
  // Grulla común: gris ceniza, cabeza y cuello negros con franja blanca y píleo rojo, cuello y patas estirados
  grulla: () => ({
    body: mergeAll([
      loft({ pts: [V(0, 0, -0.3), V(0, 0.01, -0.12), V(0, 0.02, 0.1), V(0, 0.03, 0.2)], r: [[0.05, 0.015, 0.015], [0.1, 0.08, 0.09], [0.1, 0.08, 0.09], [0.06, 0.05, 0.05]], color: '#9aa0a8', tex: 7, ring: 16 }),
      loft({ pts: [V(0, 0.03, 0.18), V(0, 0.04, 0.36), V(0, 0.04, 0.54)], r: [[0.04, 0.04, 0.04], [0.03, 0.03, 0.03], [0.028, 0.028, 0.028]], color: (u, th) => u > 0.45 && Math.cos(th) > 0.55 && u < 0.95 ? C('#f4f4f0') : C('#1c1c1e'), tex: 7, ring: 14 }),
      ball(0.04, '#1c1c1e', 7, 0, 0.045, 0.57, 1, 0.9, 1.2), ball(0.016, '#d42020', 0, 0, 0.08, 0.57),
      loft({ pts: [V(0, 0.04, 0.6), V(0, 0.03, 0.68), V(0, 0.02, 0.72)], r: [[0.012, 0.013, 0.01], [0.008, 0.009, 0.006], [0.003, 0.003, 0.003]], color: '#6a6a60', tex: 4, ring: 10 }),
      ...[-1, 1].map(s => tube([V(s * 0.03, -0.03, -0.18), V(s * 0.03, -0.04, -0.45), V(s * 0.03, -0.045, -0.62)], 0.011, 0.007, '#2a2a2a', 4)),
      loft({ pts: [V(0, 0.02, -0.2), V(0, 0.0, -0.32), V(0, -0.02, -0.4)], r: [[0.07, 0.03, 0.03], [0.08, 0.035, 0.03], [0.04, 0.02, 0.02]], color: '#3a3a3e', tex: 7, ring: 12, bump: (u, th, p) => 0.02 * vnoise(p.x * 30, p.y * 30, p.z * 30) }),
    ]),
    wing: wing({ span: 0.95, chord: 0.36, tipChord: 0.6, fingers: 5, fingerLen: 0.24, cov: '#a0a6ae', flight: '#1e1e22', dihedral: 0.02 }),
    root: 0.07, flap: 0.35, speed: 2.4, scale: 1,
  }),
};
// Ave completa: cuerpo + dos alas articuladas en el hombro (para el aleteo)
export function bird(kind) {
  const S = BIRDS[kind]();
  const root = new THREE.Group();
  const b = new THREE.Mesh(S.body, BEAST_MAT2); b.castShadow = true; root.add(b);
  for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(s * S.root, 0.03, 0.1); root.add(w);
    let g = S.wing.clone(); if (s < 0) { g.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1)); flip(g); }
    const m = new THREE.Mesh(g, BEAST_MAT2); m.castShadow = true; w.add(m);
    root.userData[s < 0 ? 'wl' : 'wr'] = w;
  }
  root.userData.flap = S.flap; root.userData.speed = S.speed;
  return root;
}

// ---------- Pequeños ----------
// Ardilla roja: pelaje rojizo, vientre blanco, pinceles en las orejas, cola enorme en S
export function squirrel() {
  const R = '#a8481f', W = '#f3e8d8';
  const g = mergeAll([
    loft({ pts: [V(0, 0.05, -0.06), V(0, 0.1, 0.0), V(0, 0.15, 0.04)], r: [[0.055, 0.055, 0.06], [0.05, 0.05, 0.055], [0.04, 0.04, 0.045]], color: (u, th) => th < -0.3 ? C(W) : C(R), ring: 16 }),
    loft({ pts: [V(0, 0.18, 0.03), V(0, 0.19, 0.08), V(0, 0.17, 0.12)], r: [[0.038, 0.04, 0.035], [0.034, 0.034, 0.03], [0.014, 0.012, 0.012]], color: (u) => u > 0.9 ? C('#2a1a14') : C(R), ring: 16 }),
    ...eye(0.028, 0.2, 0.08, 0.009, 0.9, R),
    ...[-1, 1].map(s => ear(0.035, 0.018, 0.004, R, '#e8c8b0').applyMatrix4(Mx(s * 0.02, 0.22, 0.05, -0.2, 0, -s * 0.25))),
    ...[-1, 1].map(s => tube([V(s * 0.02, 0.25, 0.05), V(s * 0.022, 0.28, 0.04)], 0.006, 0.002, '#6a2a12')),
    ...[-1, 1].map(s => ball(0.025, R, 2, s * 0.03, 0.04, -0.03, 1, 0.8, 1.3)),
    ...[-1, 1].map(s => tube([V(s * 0.02, 0.1, 0.05), V(s * 0.022, 0.05, 0.07), V(s * 0.02, 0.02, 0.08)], 0.01, 0.006, R)),
  ]);
  const tail = loft({ pts: [V(0, 0.0, 0), V(0, 0.06, -0.06), V(0, 0.16, -0.06), V(0, 0.24, -0.02), V(0, 0.26, 0.04)], r: [[0.02, 0.02, 0.02], [0.05, 0.05, 0.05], [0.055, 0.055, 0.055], [0.05, 0.05, 0.05], [0.02, 0.02, 0.02]], color: '#b8552a', ring: 14, bump: (u, th, p) => 0.012 * vnoise(p.x * 50, p.y * 50, p.z * 50) });
  const root = new THREE.Group(); const b = new THREE.Mesh(g, BEAST_MAT); b.castShadow = true; root.add(b);
  const tp = new THREE.Group(); tp.position.set(0, 0.05, -0.07); tp.add(new THREE.Mesh(tail, BEAST_MAT)); root.add(tp);
  root.userData.tail = tp;
  return root;
}
// Pito negro: todo negro, píleo rojo, pico marfil y ojo claro; se agarra al tronco apoyado en la cola
export function woodpecker() {
  const K = '#141414';
  const g = mergeAll([
    loft({ pts: [V(0, -0.14, -0.03), V(0, -0.04, 0.0), V(0, 0.06, 0.02), V(0, 0.12, 0.03)], r: [[0.03, 0.02, 0.02], [0.06, 0.055, 0.06], [0.06, 0.055, 0.06], [0.04, 0.04, 0.04]], color: K, tex: 7, ring: 16, side0: V(1, 0, 0) }),
    ball(0.05, K, 7, 0, 0.16, 0.035, 0.9, 1, 1.05),
    ball(0.045, '#d41f1f', 7, 0, 0.19, 0.02, 0.85, 0.8, 1.2),
    loft({ pts: [V(0, 0.16, 0.07), V(0, 0.155, 0.12), V(0, 0.15, 0.15)], r: [[0.016, 0.014, 0.012], [0.01, 0.009, 0.008], [0.003, 0.003, 0.003]], color: '#e8e0c8', tex: 4, ring: 10 }),
    ...eye(0.03, 0.175, 0.06, 0.009, 0.8, K, '#f0f0e0', '#101010'),
    loft({ pts: [V(0, -0.12, -0.03), V(0, -0.2, -0.05), V(0, -0.26, -0.05)], r: [[0.03, 0.01, 0.01], [0.035, 0.008, 0.008], [0.02, 0.006, 0.006]], color: K, tex: 7, ring: 10, e: 3 }),
  ]);
  const root = new THREE.Group(); const b = new THREE.Mesh(g, BEAST_MAT); b.castShadow = true; root.add(b); root.userData.body = b;
  return root;
}
// Trucha común: lomo pardo verdoso con motas negras y rojas con halo claro, vientre amarillento
export function trout() {
  const g = mergeAll([
    loft({ pts: [V(0, 0, -0.16), V(0, 0.005, -0.08), V(0, 0.005, 0.04), V(0, 0, 0.12), V(0, -0.005, 0.16)], r: [[0.008, 0.012, 0.012], [0.028, 0.045, 0.04], [0.032, 0.05, 0.045], [0.025, 0.035, 0.032], [0.008, 0.01, 0.01]],
      color: (u, th, p) => { let c = th > 0 ? C('#6a6a3a') : th > -0.6 ? C('#b8a060') : C('#f2e8c8'); const n = vnoise(p.x * 200, p.y * 200, p.z * 200); if (th > -0.6 && n > 0.78) c = C(n > 0.9 && th < 0.3 ? '#c83020' : '#1c1810'); return c; }, tex: 0, ring: 18, e: 2.4 }),
    (() => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.05, 0.06); sh.lineTo(0.04, 0); sh.lineTo(0.05, -0.06); sh.closePath(); const gg = new THREE.ShapeGeometry(sh); gg.rotateY(Math.PI / 2); return prep(gg, '#6a6040', 0, Mx(0, 0, -0.2)); })(),
    ...eye(0.018, 0.012, 0.11, 0.007, 1.2, '#6a6a3a', '#c8a030', '#101010'),
  ]);
  return new THREE.Mesh(g, BEAST_MAT2);
}
// Lechuza común (de noche): disco facial blanco en forma de corazón, dorso dorado moteado
export function owl() {
  const g = mergeAll([
    loft({ pts: [V(0, 0, 0), V(0, 0.1, 0.01), V(0, 0.2, 0.0)], r: [[0.06, 0.05, 0.06], [0.08, 0.07, 0.08], [0.07, 0.07, 0.07]], color: (u, th) => th < -0.2 ? C('#f6efe0') : C('#d4a456'), tex: 7, ring: 16, side0: V(1, 0, 0) }),
    ball(0.085, '#d4a456', 7, 0, 0.27, 0.0, 1, 0.95, 0.9),
    ball(0.07, '#fbf6ec', 7, 0, 0.27, 0.035, 1.1, 1.05, 0.5),
    ...[-1, 1].map(s => ball(0.018, '#0c0a08', 6, s * 0.03, 0.28, 0.07)),
    ball(0.01, '#e8c8a8', 4, 0, 0.26, 0.075, 1, 1.5, 1),
  ]);
  const root = new THREE.Group(); const b = new THREE.Mesh(g, BEAST_MAT); root.add(b); return root;
}
