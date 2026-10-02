// Detalle de los perros (modelos de Quaternius, CC0, con cuerpo de shiba y de husky). Cada raza:
//  - se pinta vértice a vértice con su capa real: el rojo fuego del Gorbeia con el lomo más oscuro, la manta negra y el
//    hocico negro del pastor alemán, la máscara gris de las orejas y los ojos y las manchas del mastín…
//  - cambia de cuerpo donde hace falta (el mastín, más ancho, con papada y belfos),
//  - lleva un pelaje con mechones en el sombreador (más largos en las razas de pelo largo),
//  - su collar (el mastín, la carlanca de pinchos contra el lobo) con la chapa, y el mastín sus orejas caídas,
//  - y su postura: cola baja (en gancho en el mastín), que menea cuando te acompaña.
import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function hash(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz), L = (a, b, t) => a + (b - a) * t;
  return L(L(L(hash(ix, iy, iz), hash(ix + 1, iy, iz), u), L(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), u), v),
    L(L(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), u), L(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), u), v), w);
}
const K = (h) => new THREE.Color(h);

// trozos del modelo según su material: 0 capa, 1 capa clara, 2 trufa y boca, 3 ojos
const PART = { Main: 0, Main_Light: 1, Black: 2, Material: 0, 'Material.001': 1, 'Material.006': 2 };
export const dogPart = (matName) => PART[matName] ?? 3;

// zona del cuerpo según el hueso que mueve el vértice
function zone(n) {
  if (/^Ear/.test(n)) return 'ear'; if (n === 'Head') return 'head'; if (/^Neck/.test(n)) return 'neck'; if (/^Tail/.test(n)) return 'tail';
  if (/^(FrontUpper|FrontLower|BackUpper|BackLower)/.test(n)) return 'leg';
  if (/^(FrontShoulder|BackShoulder|BackLeg)/.test(n)) return 'upper';
  return 'torso';
}
// posición de cada hueso en el espacio de la malla (en reposo)
function bonesInMesh(skel, bindMatrix) {
  const inv = bindMatrix.clone().invert();
  return skel.bones.map((b, i) => new THREE.Vector3().applyMatrix4(skel.boneInverses[i].clone().invert().premultiply(inv)));
}
// recorre los vértices con su información: posición normalizada (x de -1 a 1, y del suelo a la cabeza, z de la cola
// al hocico), normal, zona, pesos por zona, trozo del modelo y dos ruidos (manchas grandes y moteado)
function each(geo, skel, fn) {
  const p = geo.attributes.position, nr = geo.attributes.normal, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, pt = geo.attributes.part;
  geo.computeBoundingBox(); const b = geo.boundingBox, W = (b.max.x - b.min.x) / 2, H = b.max.y - b.min.y, L = b.max.z - b.min.z;
  const zones = skel.bones.map(o => zone(o.name)), v = { H, W, L, min: b.min, wz: {} };
  for (let i = 0; i < p.count; i++) {
    const wz = v.wz; for (const k of ['torso', 'neck', 'head', 'ear', 'tail', 'leg', 'upper']) wz[k] = 0;
    let bw = -1, best = 0;
    for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w <= 0) continue; const j = si.getComponent(i, k); wz[zones[j]] += w; if (w > bw) { bw = w; best = j; } }
    const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i);
    v.i = i; v.X = X; v.Y = Y; v.Z = Z; v.x = X / W; v.y = (Y - b.min.y) / H; v.z = (Z - b.min.z) / L;
    v.nx = nr ? nr.getX(i) : 0; v.ny = nr ? nr.getY(i) : 0; v.nz = nr ? nr.getZ(i) : 0;
    v.zone = zones[best]; v.part = pt ? pt.getX(i) : 0;
    v.n1 = vnoise(X / H * 9, Y / H * 9, Z / H * 9); v.n2 = vnoise(X / H * 3.2 + 7, Y / H * 3.2, Z / H * 3.2 + 3);
    fn(v);
  }
}

// ---------- Capas de cada raza ----------
// (c llega con el color del material del modelo; se cambia por el de la raza)
const PAINT = {
  // Euskal artzain txakurra Gorbeia: rojo fuego de pelo corto, más oscuro en la línea del lomo y las puntas de las
  // orejas, más claro en el pecho, el vientre y las patas
  gorbeia(v, c) {
    if (v.part >= 2) return;
    const R = K('#b45f29'), Rd = K('#86401a'), Rl = K('#e2a96c');
    const o = (v.part === 1 ? Rl.clone().lerp(R, 0.3) : R.clone());
    if (v.zone !== 'leg') o.lerp(Rd, 0.5 * sm(0.2, 0.9, v.ny));
    else o.lerp(Rl, 0.45 * sm(0.45, 0.1, v.y));
    if (v.zone === 'ear') o.lerp(Rd, 0.75 * sm(0.86, 0.97, v.y));
    if (v.zone === 'head' && v.z > 0.93) o.lerp(Rd, 0.3);
    c.copy(o).multiplyScalar(0.93 + 0.14 * v.n1);
  },
  // Iletsua: el pastor vasco de pelo largo, color arena con el lomo tostado (pelos de punta oscura), hocico y orejas
  // más oscuros
  iletsua(v, c) {
    if (v.part >= 2) return;
    const S = K('#a8825a'), Sd = K('#6c5137'), Sl = K('#dcc8a4'), M = K('#4a3826');
    const o = (v.part === 1 ? Sl.clone().lerp(S, 0.25) : S.clone());
    if (v.zone !== 'leg') o.lerp(Sd, 0.55 * sm(0.0, 0.85, v.ny) * (0.6 + 0.6 * v.n1));
    if (v.zone === 'ear') o.lerp(M, 0.8 * sm(0.84, 0.95, v.y));
    if (v.zone === 'head') o.lerp(M, 0.7 * sm(0.925, 0.96, v.z));
    c.copy(o).multiplyScalar(0.92 + 0.16 * v.n1);
  },
  // Pastor alemán: fuego (canela) con la manta negra del lomo a la grupa, la cola negra por encima, el hocico negro y la
  // sombra oscura de la frente y las orejas
  aleman(v, c) {
    if (v.part === 2) { c.set('#141110'); return; } if (v.part === 3) return;
    const T = K('#c27a35'), Tl = K('#dcaa66'), B = K('#1b1511'), Bd = K('#33261b');
    const o = (v.part === 1 ? Tl : T).clone();
    const body = v.zone === 'torso' || v.zone === 'upper' || v.zone === 'neck' ? 1 : 0;
    const saddle = body * sm(-0.32, 0.1, v.ny + 0.25 * (v.n2 - 0.5)) * sm(0.1, 0.2, v.z) * (1 - sm(0.66, 0.76, v.z));
    o.lerp(B, saddle);
    if (v.zone === 'tail') o.lerp(Bd, 0.6 + 0.4 * sm(-0.4, 0.3, v.ny));
    if (v.zone === 'head') { o.lerp(B, 0.95 * sm(0.905, 0.94, v.z)); o.lerp(Bd, 0.7 * sm(0.35, 0.8, v.ny) * (1 - sm(0.12, 0.3, Math.abs(v.x)))); }
    if (v.zone === 'ear') o.lerp(Bd, 0.85);
    if (v.zone === 'leg') o.lerp(Tl, 0.35 * sm(0.4, 0.1, v.y));
    c.copy(o).multiplyScalar(0.93 + 0.14 * v.n1);
  },
  // Mastín del Pirineo: blanco con la máscara gris de las orejas y alrededor de los ojos (la lista de la frente y el
  // hocico blancos) y unas manchas del mismo color en el lomo y en la base de la cola; trufa negra
  mastin(v, c) {
    if (v.part === 2) { c.set('#171312'); return; } if (v.part === 3) return;
    const Wc = K('#efe9de'), Wl = K('#faf7f1'), M = K('#7d6c58'), Md = K('#54493c');
    const o = (v.part === 1 ? Wl : Wc).clone();
    let patch = 0;
    if (v.zone === 'ear') patch = 1;
    if (v.zone === 'head') patch = sm(0.14, 0.26, Math.abs(v.x)) * sm(0.6, 0.7, v.y) * (1 - sm(0.915, 0.945, v.z));
    for (const S of MASTIN_SPOTS) {
      const d = Math.hypot((v.z - S[0]) / S[3], (v.y - S[1]) / S[3], (v.x - S[2]) / (S[3] * 4));
      patch = Math.max(patch, 1 - sm(0.7, 1.0, d + 0.35 * (v.n2 - 0.5)));
    }
    o.lerp(M.clone().lerp(Md, 0.6 * v.n1), patch);
    if (v.zone === 'leg') o.lerp(Wl, 0.4);
    c.copy(o).multiplyScalar(0.95 + 0.08 * v.n1);
  },
};
// manchas del mastín (z, y, x, tamaño): la grupa con la base de la cola y una en cada costado
const MASTIN_SPOTS = [[0.2, 0.7, 0, 0.11], [0.48, 0.66, 0.9, 0.085], [0.38, 0.66, -0.9, 0.07]];

// dirección del pelo en cada zona (en el espacio de la malla: y arriba, z hacia el hocico)
const HAIR = { torso: [0, -0.35, -1], upper: [0, -0.7, -0.6], neck: [0, -0.4, -1], head: [0, 0.3, -1], ear: [0, 1, 0], leg: [0, -1, 0], tail: [0, -0.5, -1] };

// cuerpo propio de la raza (antes de calcular las normales): el mastín, macizo, de cabeza ancha, papada y belfos
function reshape(geo, S, skel, bindMatrix) {
  const D = S.dog; if (!D.bulk) return;
  const p = geo.attributes.position, hp = bonesInMesh(skel, bindMatrix)[skel.bones.findIndex(b => b.name === 'Head')];
  each(geo, skel, (v) => {
    let { X, Y, Z } = v; const H = v.H, w = v.wz;
    // cabeza grande (crece desde su hueso) y tronco y cráneo más anchos
    if (hp && w.head > 0) { const k = 1 + 0.1 * w.head; X = hp.x + (X - hp.x) * k; Y = hp.y + (Y - hp.y) * k; Z = hp.z + (Z - hp.z) * k; }
    X *= 1 + 0.17 * (w.torso + w.neck + 0.6 * w.upper) + 0.2 * (w.head + w.ear);
    // papada: la piel de la garganta cuelga (por debajo del cuello)
    const throat = w.neck * sm(0.62, 0.5, v.y) * sm(0.7, 0.8, v.z);
    Y -= 0.035 * H * throat;
    // belfos: los labios caen a los lados del hocico
    const lips = w.head * sm(0.9, 0.93, v.z) * (1 - sm(0.975, 1.0, v.z)) * sm(0.15, 0.4, Math.abs(v.x)) * sm(0.8, 0.72, v.y);
    Y -= 0.018 * H * lips;
    // cola más gruesa (pelo largo)
    if (w.tail > 0.5) X *= 1.25;
    p.setXYZ(v.i, X, Y, Z);
  });
  p.needsUpdate = true;
}

/** Forma, normales, capa y dirección del pelo de una raza; devuelve la geometría lista. */
export function dogShape(geo, S, skel, bindMatrix) {
  reshape(geo, S, skel, bindMatrix);
  geo = toCreasedNormals(geo, THREE.MathUtils.degToRad(65));
  const col = geo.attributes.color, paint = PAINT[S.dog.paint], c = new THREE.Color();
  const hair = new Float32Array(geo.attributes.position.count * 3), hv = new THREE.Vector3(), eye = new THREE.Vector3(); let ne = 0;
  each(geo, skel, (v) => {
    if (v.part === 3) { eye.x += Math.abs(v.X); eye.y += v.Y; eye.z += v.Z; ne++; }
    if (paint) { c.setRGB(col.getX(v.i), col.getY(v.i), col.getZ(v.i)); paint(v, c); col.setXYZ(v.i, c.r, c.g, c.b); }
    hv.fromArray(HAIR[v.zone]).normalize().toArray(hair, v.i * 3);
  });
  geo.setAttribute('hair', new THREE.BufferAttribute(hair, 3));
  geo.deleteAttribute('part');
  if (ne) geo.userData.eye = eye.divideScalar(ne);   // centro de los ojos (x: distancia al centro)
  geo.computeBoundingBox();
  return geo;
}

// ---------- Pelaje ----------
// Mechones finos alargados en la dirección del pelo (ruido estirado sobre la posición de la malla, así van pegados al
// cuerpo), con relieve y variación de color, y el brillo aterciopelado del pelo (sheen) que da la propia luz: de noche
// no brilla.
const NOISE = `
float fh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float fn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(fh(i), fh(i + vec3(1,0,0)), f.x), mix(fh(i + vec3(0,1,0)), fh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(fh(i + vec3(0,0,1)), fh(i + vec3(1,0,1)), f.x), mix(fh(i + vec3(0,1,1)), fh(i + vec3(1,1,1)), f.x), f.y), f.z); }
// mechones: ruido comprimido a lo largo del pelo (rayas finas en esa dirección)
float strands(vec3 p, vec3 d, float k){ vec3 q = p - d * dot(p, d) * 0.86; return fn(q * k) * 0.62 + fn(q * k * 2.3 + 11.0) * 0.38; }`;
const FURS = new Map();
export function dogFur(geo, S) {
  const k = S.model + '|' + S.dog.paint; if (FURS.has(k)) return FURS.get(k);
  const f = (1 / (geo.boundingBox.max.y - geo.boundingBox.min.y)).toExponential(4), hair = S.dog.hair ?? 0.0016;
  const m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.82, sheen: 0.45, sheenRoughness: 0.65, sheenColor: new THREE.Color('#cfc6b8') });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 hair; varying vec3 vOP; varying vec3 vHD;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvOP = position * ${f}; vHD = hair;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP; varying vec3 vHD;' + NOISE + `
vec3 fbump(vec3 sp, vec3 n, float h, float k) {
  vec3 sx = dFdx(sp), sy = dFdy(sp), r1 = cross(sy, n), r2 = cross(n, sx);
  float det = dot(sx, r1); vec3 grad = sign(det) * (dFdx(h) * k * r1 + dFdy(h) * k * r2);
  return normalize(abs(det) * n - grad);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  // los mechones se funden cuando son más finos que un píxel (lejos no centellean)
  float faa = 1.0 - smoothstep(0.3, 1.1, length(fwidth(vOP)) * ${(S.dog.long ? 110 : 150)}.0);
  float fs = mix(0.5, strands(vOP, normalize(vHD), ${(S.dog.long ? 110 : 150)}.0), faa), fm = fn(vOP * 14.0);
  diffuseColor.rgb *= (0.86 + 0.22 * fs) * (0.95 + 0.1 * fm);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  normal = fbump(-vViewPosition, normal, fs, ${hair.toFixed(5)} * faa);`);
  };
  m.customProgramCacheKey = () => 'pelo-perro' + f + hair + (S.dog.long ? 'l' : '');
  FURS.set(k, m); return m;
}
// ---------- Collar ----------
// Se ajusta a la sección real del cuello (los vértices a la altura del collar) y va colgado del hueso del cuello.
// Collar de cuero con hebilla y chapa; el mastín, la carlanca: cuero ancho con pinchos de hierro.
export function dogGear(geo, S, skel, bindMatrix) {
  const D = S.dog, out = [];
  const c = D.collar && collar(geo, S, skel, bindMatrix); if (c) out.push(c);
  const e = D.ears === 'drop' && dropEars(geo, S, skel, bindMatrix); if (e) out.push(e);
  return out;
}
function collar(geo, S, skel, bindMatrix) {
  const D = S.dog;
  const names = skel.bones.map(b => b.name), B = bonesInMesh(skel, bindMatrix), i1 = names.indexOf('Neck1'), i2 = names.indexOf('Neck2');
  if (i1 < 0 || i2 < 0) return null;
  const H = geo.boundingBox.max.y - geo.boundingBox.min.y, u = H / S.h;   // unidades de la malla por metro
  const a = B[i2].clone().sub(B[i1]).normalize(), c0 = B[i1].clone().lerp(B[i2], D.collarAt ?? 0.55);
  const ex = new THREE.Vector3(1, 0, 0), ey = new THREE.Vector3().crossVectors(a, ex).normalize();
  // sección del cuello a esa altura
  const p = geo.attributes.position, sw = geo.attributes.skinWeight, si = geo.attributes.skinIndex, t = new THREE.Vector3();
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, n = 0;
  for (let i = 0; i < p.count; i++) {
    t.set(p.getX(i), p.getY(i), p.getZ(i)).sub(c0);
    if (Math.abs(t.dot(a)) > 0.012 * u || t.length() > 0.3 * u) continue;
    let neck = 0; for (let k = 0; k < 4; k++) if (/^(Neck|Torso3)/.test(names[si.getComponent(i, k)])) neck += sw.getComponent(i, k);
    if (neck < 0.5) continue;
    const lx = t.dot(ex), ly = t.dot(ey); x0 = Math.min(x0, lx); x1 = Math.max(x1, lx); y0 = Math.min(y0, ly); y1 = Math.max(y1, ly); n++;
  }
  if (n < 6) return null;
  const rx = (x1 - x0) / 2 + 0.003 * u, ry = (y1 - y0) / 2 + 0.003 * u;   // justo por encima del pelo
  const cc = c0.clone().addScaledVector(ex, (x0 + x1) / 2).addScaledVector(ey, (y0 + y1) / 2);
  const w = (D.carlanca ? 0.05 : 0.026) * u, th = (D.carlanca ? 0.007 : 0.005) * u, N = 36;
  const E = (q, out = new THREE.Vector3()) => out.copy(cc).addScaledVector(ex, Math.cos(q) * rx).addScaledVector(ey, Math.sin(q) * ry);
  const Nn = (q) => ex.clone().multiplyScalar(Math.cos(q) / rx).addScaledVector(ey, Math.sin(q) / ry).normalize();
  // banda: cuatro anillos (dentro abajo, fuera abajo, fuera arriba, dentro arriba)
  const pos = [], idx = [];
  for (let s = 0; s <= N; s++) {
    const q = s / N * Math.PI * 2, e = E(q), nn = Nn(q);
    for (const [o, h] of [[0, -0.5], [1, -0.42], [1, 0.42], [0, 0.5]]) { const v = e.clone().addScaledVector(nn, o * th).addScaledVector(a, h * w); pos.push(v.x, v.y, v.z); }
  }
  for (let s = 0; s < N; s++) for (let r = 0; r < 4; r++) { const A = s * 4 + r, Bq = s * 4 + (r + 1) % 4, C = A + 4, Dq = Bq + 4; idx.push(A, C, Bq, Bq, C, Dq); }
  const band = new THREE.BufferGeometry(); band.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); band.setIndex(idx); band.computeVertexNormals();
  // el punto más bajo del collar (la garganta): ahí cuelga la chapa; la hebilla, arriba en la nuca
  let qLow = 0, yLow = 1e9, qTop = 0, yTop = -1e9; for (let s = 0; s < 72; s++) { const q = s / 72 * Math.PI * 2, y = E(q).y; if (y < yLow) { yLow = y; qLow = q; } if (y > yTop) { yTop = y; qTop = q; } }
  const metal = [];
  const place = (g, at, dir, up = a) => { const m = new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(up, dir).normalize(), up, dir).setPosition(at); g.applyMatrix4(m); return g; };
  if (D.carlanca) {
    // pinchos de hierro alrededor (no en la garganta, donde va la hebilla de abajo)
    for (let s = 0; s < 14; s++) {
      const q = qLow + (s + 0.5) / 14 * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(q - qLow), Math.cos(q - qLow))) < 0.5) continue;
      for (const h of [-0.22, 0.22]) {
        const nn = Nn(q), at = E(q).addScaledVector(nn, th).addScaledVector(a, h * w);
        const cone = new THREE.ConeGeometry(0.0055 * u, 0.026 * u, 7); cone.translate(0, 0.013 * u, 0);
        cone.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), nn))); cone.translate(at.x, at.y, at.z);
        metal.push(cone.toNonIndexed());
      }
    }
  }
  // hebilla (en la nuca) y chapa con su anilla (en la garganta)
  { const nn = Nn(qTop), at = E(qTop).addScaledVector(nn, th * 0.9); metal.push(place(new THREE.BoxGeometry(0.03 * u, w * 0.9, 0.004 * u), at, nn).toNonIndexed()); }
  if (!D.carlanca) {
    const nn = Nn(qLow), at = E(qLow).addScaledVector(nn, th + 0.004 * u);
    const ring = new THREE.TorusGeometry(0.006 * u, 0.0014 * u, 6, 14); ring.rotateY(Math.PI / 2); ring.translate(0, -0.004 * u, 0);
    const tag = new THREE.CylinderGeometry(0.013 * u, 0.013 * u, 0.0025 * u, 18); tag.rotateX(Math.PI / 2); tag.translate(0, -0.021 * u, 0.002 * u);
    // la chapa cuelga hacia abajo (mundo), por delante de la garganta
    const down = new THREE.Vector3(0, -1, 0), fwd = nn.clone().setY(0).normalize(), m = new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(down.clone().negate(), fwd).normalize(), down.clone().negate(), fwd).setPosition(at);
    ring.applyMatrix4(m); tag.applyMatrix4(m); metal.push(ring.toNonIndexed(), tag.toNonIndexed());
  }
  const strip = (g) => { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g; };
  const metalG = metal.length ? mergeAll(metal.map(strip)) : null;
  // los dos cuelgan del hueso Neck1: matriz del hueso a la malla
  const L = skel.boneInverses[i1].clone().multiply(bindMatrix);
  return { bone: names[i1], matrix: L, parts: [[band, 'cuero'], metalG && [metalG, D.carlanca ? 'hierro' : 'laton']].filter(Boolean), leather: D.collar };
}
// Orejas caídas (mastín): dos solapas de piel con pelo, triangulares de punta redondeada, que nacen a los lados del
// cráneo un poco por encima y por detrás de los ojos y caen pegadas a la mejilla. Cuelgan del hueso de la cabeza.
function dropEars(geo, S, skel, bindMatrix) {
  const names = skel.bones.map(b => b.name), ih = names.indexOf('Head'), E = geo.userData.eye;
  if (ih < 0 || !E) return null;
  const H = geo.boundingBox.max.y - geo.boundingBox.min.y, u = H / S.h;
  const y0 = E.y + 0.03 * u, z0 = E.z - 0.075 * u;
  // anchura del cráneo a esa altura (los vértices de la cabeza alrededor del arranque)
  const p = geo.attributes.position, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight; let xs = 0;
  for (let i = 0; i < p.count; i++) {
    if (Math.abs(p.getY(i) - y0) > 0.03 * u || Math.abs(p.getZ(i) - z0) > 0.03 * u) continue;
    let hw = 0; for (let k = 0; k < 4; k++) if (names[si.getComponent(i, k)] === 'Head') hw += sw.getComponent(i, k);
    if (hw > 0.5) xs = Math.max(xs, Math.abs(p.getX(i)));
  }
  if (!xs) xs = E.x * 1.3;
  const len = 0.14 * u, wid = 0.095 * u, th = 0.012 * u, NU = 10, NV = 8, M = K('#7d6c58'), Md = K('#54493c'), col = new THREE.Color();
  const parts = [];
  for (const s of [1, -1]) {
    const pos = [], cols = [], hair = [], idx = [];
    for (const side of [1, -1]) {        // cara de fuera y cara de dentro (se juntan en el borde)
      const base = pos.length / 3;
      for (let a = 0; a <= NU; a++) for (let b = 0; b <= NV; b++) {
        const t = a / NU, v = b / NV * 2 - 1, w = wid * 0.5 * Math.pow(Math.cos(t * Math.PI / 2), 0.75) * (1 - 0.15 * t);
        const bulge = (0.01 * Math.sin(Math.PI * Math.min(1, t * 1.1)) - 0.004) * u;   // se separa un poco de la mejilla y vuelve
        const thick = th * 0.5 * Math.sqrt(Math.max(0, 1 - v * v)) * Math.pow(1 - t, 0.4);
        const x = s * (xs * 0.94 + bulge + side * thick), y = y0 - t * len, z = z0 + v * w + 0.025 * u * t;
        pos.push(x, y, z);
        col.copy(M).lerp(Md, 0.35 * t + 0.25 * vnoise(x / u * 30, y / u * 30, z / u * 30)); cols.push(col.r, col.g, col.b);
        hair.push(0, -1, 0.15);
      }
      for (let a = 0; a < NU; a++) for (let b = 0; b < NV; b++) {
        const A = base + a * (NV + 1) + b, B2 = A + 1, C = A + NV + 1, D2 = C + 1;
        if (side * s > 0) idx.push(A, C, B2, B2, C, D2); else idx.push(A, B2, C, B2, D2, C);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.setAttribute('hair', new THREE.Float32BufferAttribute(hair, 3)); g.setIndex(idx); g.computeVertexNormals();
    parts.push([g, 'piel']);
  }
  return { bone: names[ih], matrix: skel.boneInverses[ih].clone().multiply(bindMatrix), parts };
}
function mergeAll(gs) {
  let n = 0; for (const g of gs) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  for (const g of gs) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return g;
}
const GEAR_MATS = new Map();
const gearMat = (k, make) => GEAR_MATS.get(k) || GEAR_MATS.set(k, make()).get(k);

/** Viste al perro ya clonado: collar, orejas caídas y postura de la raza. Devuelve pose(dt, estado) para
 *  después de cada paso de la animación (orejas caídas, cola baja y meneo). */
export function dogDress(inner, S, gear, opts = {}) {
  const D = S.dog; let body = null; inner.traverse(o => { if (o.isSkinnedMesh && o.name === 'body') body = o; });
  if (!body) return null;
  for (const it of gear || []) {
    const bone = inner.getObjectByName(it.bone); if (!bone) continue;
    const g = new THREE.Group(); g.matrixAutoUpdate = false; g.matrix.copy(it.matrix); bone.add(g);
    for (const [geo, kind] of it.parts) {
      const mat = kind === 'piel' ? body.material
        : kind === 'cuero' ? gearMat('cuero' + it.leather, () => new THREE.MeshStandardMaterial({ color: it.leather, roughness: 0.62 }))
        : kind === 'hierro' ? gearMat('hierro', () => new THREE.MeshStandardMaterial({ color: '#8d8a86', metalness: 0.85, roughness: 0.38 }))
        : gearMat('laton', () => new THREE.MeshStandardMaterial({ color: '#d8b25a', metalness: 0.9, roughness: 0.3 }));
      const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = kind === 'piel'; m.frustumCulled = false; g.add(m);
    }
  }
  // postura: giros sobre ejes de la malla expresados en el hueso padre de cada uno
  inner.updateMatrixWorld(true);
  const qm = body.getWorldQuaternion(new THREE.Quaternion());
  const axisIn = (bone, ax) => new THREE.Vector3(...ax).applyQuaternion(qm).applyQuaternion(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize();
  const tw = [];
  // giro (y opcionalmente desplazamiento en metros y escala) de un hueso, sobre su pose de la animación
  const add = (name, rots, move = null, scale = 1) => {
    const b = inner.getObjectByName(name); if (!b) return;
    const q = new THREE.Quaternion(); for (const [ax, ang] of rots) q.premultiply(new THREE.Quaternion().setFromAxisAngle(axisIn(b, ax), ang));
    let off = null;
    if (move) { const p0 = b.getWorldPosition(new THREE.Vector3()), p1 = p0.clone().add(new THREE.Vector3(...move).applyQuaternion(qm)); off = b.parent.worldToLocal(p1).sub(b.parent.worldToLocal(p0.clone())); }
    tw.push({ b, q, q0: b.quaternion.clone(), off, p0: b.position.clone(), scale, s0: b.scale.clone() });
  };
  if (D.tail) add('Tail1', [[[1, 0, 0], D.tail]]);
  if (D.tailUncurl) for (const [i, n] of [[2, 1], [3, 0.9], [4, 0.8], [5, 0.6], [6, 0.5]]) add('Tail' + i, [[[1, 0, 0], D.tailUncurl * n]]);
  // orejas caídas: las tiesas del modelo se recogen dentro del cráneo (las caídas van aparte, colgadas de la cabeza)
  if (D.ears === 'drop') for (const side of ['L', 'R']) add('Ear1' + side, [], null, 0.02);
  const tail = tw.find(t => t.b.name === 'Tail1'), wagAx = tail ? axisIn(tail.b, [0, 1, 0]) : null, wq = new THREE.Quaternion();
  let t = Math.random() * 10, wag = 0;
  return {
    before() { for (const k of tw) { k.b.quaternion.copy(k.q0); if (k.off) k.b.position.copy(k.p0); if (k.scale !== 1) k.b.scale.copy(k.s0); } },
    after(dt, st) {
      t += dt;
      // menea la cola cuando te acompaña y está contento (más cuanto más despacio va)
      wag += ((opts.companion && !st.sit ? 1 - Math.min(1, (st.speed || 0) / 5) * 0.75 : 0.15) - wag) * Math.min(1, dt * 3);
      for (const k of tw) {
        k.q0.copy(k.b.quaternion); k.b.quaternion.premultiply(k.q);
        if (k.off) { k.p0.copy(k.b.position); k.b.position.add(k.off); }
        if (k.scale !== 1) { k.s0.copy(k.b.scale); k.b.scale.multiplyScalar(k.scale); }
        if (k === tail && wag > 0.01) k.b.quaternion.premultiply(wq.setFromAxisAngle(wagAx, Math.sin(t * 11) * 0.42 * wag));
      }
    },
  };
}
