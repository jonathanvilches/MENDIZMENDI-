// Público del frontón animado de verdad (18 de noviembre de 2026; el autor: «prefiero que haya menos gente más definida
// y que se vean los movimientos exactos de cómo se levantan y cómo celebran»).
// Antes (crowd3d.js) cada espectador era una de dos figuras fijas, sentado o celebrando, y pasaba de una a otra de golpe.
// Aquí cada figura conserva su esqueleto: la malla lleva en cada vértice sus huesos y sus pesos, y el movimiento va en
// una textura pequeña, una fila por cuadro y tres puntos por hueso (su matriz). El sombreador mezcla dos cuadros, así
// que todos los espectadores de una figura se dibujan en una sola llamada y cada uno va por su cuadro: sentado mirando
// el juego, levantándose, celebrando con el puño, saltando con los brazos en alto o aplaudiendo de pie, aplaudiendo sin
// levantarse y sentándose otra vez. Todos los movimientos se calculan al cargar, hueso a hueso, sobre el reposo del
// personaje: al levantarse, los pies se quedan clavados en el suelo (la pierna, por trigonometría), el cuerpo se echa
// hacia delante, la cadera avanza sobre los pies y sube. Los 16 más cercanos del móvil (60 en el ordenador) van con la
// figura entera; los demás, con una más ligera que conserva la cara y se mueve igual.
// Página de prueba, solo en desarrollo: tools/prueba-publico.html (tiras de cuadros de cada movimiento y una grada).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GlbChar, loadMeshy, MESHY_GAIT, sharpMap } from './glbChar.js';
import { figure, nFigs } from './crowdSprites.js';
import { crowd3d, pixels, conPiel, LUZ_PROPIA } from './crowd3d.js';
import { QUALITY } from '../util/quality.js';

const FPS = 15, FPS_QUIETO = 5;   // cuadros guardados por segundo (entre uno y otro, la mezcla la hace el sombreador)
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _ax = new THREE.Vector3(), _v = new THREE.Vector3(), _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4();
const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const uT = { value: 0 };   // el reloj del público, el mismo para todos sus materiales

// gira un hueso alrededor de un eje del personaje (no del hueso), sobre la postura que tenga en ese momento
function gira(root, bone, eje, ang) {
  if (!bone || !ang) return;
  _qa.identity(); for (let b = bone; b && b !== root; b = b.parent) _qa.premultiply(b.quaternion);
  bone.quaternion.multiply(_qb.setFromAxisAngle(_ax.copy(eje).applyQuaternion(_qa.invert()), ang));
}
// la pierna en su plano: la cadera a «dy» por encima del tobillo y a «dz» por detrás; devuelve el ángulo del muslo
// (0, hacia abajo; π/2, hacia delante) y cuánto se dobla la rodilla, con la rodilla siempre hacia delante
function pierna(dy, dz, L1, L2) {
  const d = Math.min(L1 + L2 - 1e-4, Math.max(Math.abs(L1 - L2) + 1e-4, Math.hypot(dy, dz)));
  const psi = Math.atan2(dz, dy), del = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const gam = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2))));
  return [psi + del, Math.PI - gam];
}

const SKIN_DECL = `
attribute vec4 aHueso; attribute vec4 aPeso; attribute vec3 aAnim;
uniform highp sampler2D uHuesos; uniform float uT; uniform vec3 uQuieto;
mat4 huesoM(float k, float f) {
  int x = int(k + 0.5) * 3, y = int(f + 0.5);
  vec4 a = texelFetch(uHuesos, ivec2(x, y), 0), b = texelFetch(uHuesos, ivec2(x + 1, y), 0), c = texelFetch(uHuesos, ivec2(x + 2, y), 0);
  return mat4(a.x, b.x, c.x, 0.0, a.y, b.y, c.y, 0.0, a.z, b.z, c.z, 0.0, a.w, b.w, c.w, 1.0);
}
mat4 pielM(float f) { return aPeso.x * huesoM(aHueso.x, f) + aPeso.y * huesoM(aHueso.y, f) + aPeso.z * huesoM(aHueso.z, f) + aPeso.w * huesoM(aHueso.w, f); }
`;
// (aAnim: cuadro de antes, cuadro de después y cuánto de cada uno; con el tercero negativo, sentado y tranquilo: el
// cuadro lo pone el reloj, con el desfase de cada uno en el primero, y no hay que mandar nada a la tarjeta)
const SKIN_NORMAL = `#include <beginnormal_vertex>
  float cA = aAnim.x, cB = aAnim.y, cT = aAnim.z;
  if (cT < 0.0) { float cu = mod(uT * uQuieto.z + aAnim.x, uQuieto.y); cA = uQuieto.x + floor(cu); cB = uQuieto.x + mod(floor(cu) + 1.0, uQuieto.y); cT = fract(cu); }
  mat4 skM = pielM(cA) * (1.0 - cT) + pielM(cB) * cT;
  objectNormal = normalize(mat3(skM) * objectNormal);`;
const SKIN_POS = `#include <begin_vertex>
  transformed = (skM * vec4(transformed, 1.0)).xyz;`;
function conEsqueleto(m, tex, quieto, clave, color = false) {
  conPiel(m); const prev = m.onBeforeCompile;
  m.onBeforeCompile = function (sh, r) {
    prev?.call(this, sh, r);
    sh.uniforms.uHuesos = { value: tex }; sh.uniforms.uT = uT; sh.uniforms.uQuieto = { value: quieto };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + SKIN_DECL).replace('#include <beginnormal_vertex>', SKIN_NORMAL).replace('#include <begin_vertex>', SKIN_POS);
    // (los de lejos, sin textura: su color, también como luz propia, como en crowd3d)
    if (color) sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vColor.rgb * ' + LUZ_PROPIA.toFixed(2) + ';');
  };
  m.customProgramCacheKey = () => clave;
  // (para que runtime.subePoco y upload encuentren la textura de los huesos y la suban con las demás)
  m.uniforms = { uHuesos: { value: tex } };
  return m;
}

const mapDe = (o) => [].concat(o.material)[0]?.map || null;
const seVe = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
const PUNTOS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
// el color de la textura bajo cada vértice (para la figura de lejos, que va sin textura)
function colores(o) {
  const g = o.geometry, n = g.attributes.position.count, UV = g.attributes.uv, mat = [].concat(o.material)[0], tx = mat.map, map = tx?.image ? pixels(tx) : null, mc = mat.color || new THREE.Color(1, 1, 1);
  const col = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    if (map && UV) {
      const u = UV.getX(i), v = UV.getY(i), x = Math.min(map.w - 1, Math.max(0, Math.floor((u - Math.floor(u)) * map.w)));
      const yy = map.flipY ? 1 - (v - Math.floor(v)) : v - Math.floor(v), y = Math.min(map.h - 1, Math.max(0, Math.floor(yy * map.h)));
      let r = 0, gg = 0, bb = 0;
      for (const [ox, oy] of PUNTOS) { const q = (Math.min(map.h - 1, Math.max(0, y + oy)) * map.w + Math.min(map.w - 1, Math.max(0, x + ox))) * 4; r += map.d[q]; gg += map.d[q + 1]; bb += map.d[q + 2]; }
      c.setRGB(r / 1275, gg / 1275, bb / 1275, THREE.SRGBColorSpace);
    } else c.setRGB(1, 1, 1);
    c.multiply(mc); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  return col;
}
// la figura de lejos: los vértices que, de pie, caen en la misma celda de «cell» metros se juntan en el más cercano al
// centro de la celda, con sus huesos y sus pesos (así se mueve igual que la entera). La textura se conserva: en cada
// celda queda un vértice por isla de la textura (los trozos unidos por triángulos; en las costuras el mismo punto está
// repetido), todos en el mismo sitio, así no se abren grietas, y cada uno con su punto de la textura
function simplifica(g, posada, cell, fino = null) {
  const P = g.attributes.position.array, N = g.attributes.normal.array, C = g.attributes.color?.array, U = g.attributes.uv.array, H = g.attributes.aHueso.array, W = g.attributes.aPeso.array, I = g.index.array, n = P.length / 3;
  const isla = new Uint32Array(n); for (let i = 0; i < n; i++) isla[i] = i;
  const raiz = (i) => { while (isla[i] !== i) { isla[i] = isla[isla[i]]; i = isla[i]; } return i; };
  for (let t = 0; t < I.length; t += 3) { const a = raiz(I[t]); isla[raiz(I[t + 1])] = a; isla[raiz(I[t + 2])] = a; }
  const cid = new Uint32Array(n), id = new Uint32Array(n), celdas = new Map(), grupos = new Map(), deCelda = []; let nc = 0, m = 0;
  for (let i = 0; i < n; i++) {
    // (fino: la cabeza, con la celda a la mitad; con la gruesa, los ojos y la boca de la textura se deshacían)
    const ce = fino?.[i] ? cell * 0.5 : cell, k = `${fino?.[i] ? 'f' : ''}${Math.floor(posada[i * 3] / ce)},${Math.floor(posada[i * 3 + 1] / ce)},${Math.floor(posada[i * 3 + 2] / ce)}`;
    let c = celdas.get(k); if (c === undefined) celdas.set(k, c = nc++); cid[i] = c;
    const k2 = c + ':' + raiz(i); let r = grupos.get(k2); if (r === undefined) { grupos.set(k2, r = m++); deCelda.push(c); } id[i] = r;
  }
  const cen = new Float32Array(nc * 3), cnt = new Float32Array(nc), repC = new Int32Array(nc).fill(-1), dC = new Float32Array(nc).fill(Infinity);
  for (let i = 0; i < n; i++) { const c = cid[i]; cnt[c]++; for (let a = 0; a < 3; a++) cen[c * 3 + a] += posada[i * 3 + a]; }
  for (let c = 0; c < nc; c++) for (let a = 0; a < 3; a++) cen[c * 3 + a] /= cnt[c];
  const repG = new Int32Array(m).fill(-1), dG = new Float32Array(m).fill(Infinity), col = new Float32Array(m * 3), cg = new Float32Array(m);
  for (let i = 0; i < n; i++) {
    const c = cid[i], r = id[i], d = (posada[i * 3] - cen[c * 3]) ** 2 + (posada[i * 3 + 1] - cen[c * 3 + 1]) ** 2 + (posada[i * 3 + 2] - cen[c * 3 + 2]) ** 2;
    if (d < dC[c]) { dC[c] = d; repC[c] = i; } if (d < dG[r]) { dG[r] = d; repG[r] = i; }
    cg[r]++; if (C) for (let a = 0; a < 3; a++) col[r * 3 + a] += C[i * 3 + a];
  }
  const pos = new Float32Array(m * 3), nor = new Float32Array(m * 3), uv = new Float32Array(m * 2), hu = new Float32Array(m * 4), pe = new Float32Array(m * 4);
  for (let r = 0; r < m; r++) {
    const i = repC[deCelda[r]], j = repG[r];
    pos.set(P.subarray(i * 3, i * 3 + 3), r * 3); nor.set(N.subarray(j * 3, j * 3 + 3), r * 3); hu.set(H.subarray(i * 4, i * 4 + 4), r * 4); pe.set(W.subarray(i * 4, i * 4 + 4), r * 4);
    uv.set(U.subarray(j * 2, j * 2 + 2), r * 2); for (let a = 0; a < 3; a++) col[r * 3 + a] /= cg[r];
  }
  const out = [];
  for (let t = 0; t < I.length; t += 3) { const a = id[I[t]], b = id[I[t + 1]], c = id[I[t + 2]]; if (a !== b && b !== c && a !== c) out.push(a, b, c); }
  const h = new THREE.BufferGeometry();
  h.setAttribute('position', new THREE.BufferAttribute(pos, 3)); h.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); if (C) h.setAttribute('color', new THREE.BufferAttribute(col, 3)); h.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  h.setAttribute('aHueso', new THREE.BufferAttribute(hu, 4)); h.setAttribute('aPeso', new THREE.BufferAttribute(pe, 4));
  h.setIndex(m < 65536 ? new THREE.Uint16BufferAttribute(out, 1) : new THREE.Uint32BufferAttribute(out, 1));
  return h;
}

// una figura: su malla con huesos y pesos, la de lejos, la textura con todos sus cuadros y dónde empieza cada movimiento
async function cocinaFigura(fig, num = 0) {
  const gl = await loadMeshy(fig.meshy, true);
  const c = new GlbChar(gl, MESHY_GAIT), root = c.root;
  root.scale.setScalar(gl.userData.fit || 1);
  c.update(0.3); root.updateMatrixWorld(true);
  const B = {}, todos = []; root.traverse(o => { if (o.isBone) { B[o.name.replace(/[.:]/g, '').replace(/^mixamorig/, '')] = o; todos.push(o); } });
  const R = todos.map(b => ({ b, p: b.position.clone(), q: b.quaternion.clone(), s: b.scale.clone() }));
  const reposo = () => { for (const r of R) { r.b.position.copy(r.p); r.b.quaternion.copy(r.q); r.b.scale.copy(r.s); } };
  // las mallas, con sus huesos numerados seguidos (una sola en los personajes de hoy)
  const ms = []; root.traverse(o => { if (o.isMesh && !o.userData.outline && !/Pestanas/.test(o.name) && seVe(o)) ms.push(o); });
  const vb = [], vbNombre = [], partes = [], mapas = [];
  for (const o of ms) {
    const g0 = o.geometry, n = g0.attributes.position.count, base = vb.length, hu = new Float32Array(n * 4), pe = new Float32Array(n * 4);
    if (o.isSkinnedMesh) {
      const sk = o.skeleton, SI = g0.attributes.skinIndex, SW = g0.attributes.skinWeight;
      // (como el sombreador de three.js: la malla · bindMatrixInverse · hueso · su inversa de reposo · bindMatrix)
      sk.bones.forEach((b, j) => { vbNombre.push(b.name); vb.push(() => _m.copy(o.matrixWorld).multiply(o.bindMatrixInverse).multiply(_m2.multiplyMatrices(b.matrixWorld, sk.boneInverses[j])).multiply(o.bindMatrix)); });
      for (let i = 0; i < n; i++) { let s = 0; for (let k = 0; k < 4; k++) s += SW.getComponent(i, k); s = s || 1; for (let k = 0; k < 4; k++) { hu[i * 4 + k] = base + SI.getComponent(i, k); pe[i * 4 + k] = SW.getComponent(i, k) / s; } }
    } else { vbNombre.push(o.name || ''); vb.push(() => _m.copy(o.matrixWorld)); for (let i = 0; i < n; i++) { hu[i * 4] = base; pe[i * 4] = 1; } }
    const g = new THREE.BufferGeometry();
    // (en números de verdad: los archivos ligeros traen la posición, la normal y la textura comprimidas en enteros)
    const flota = (at, sz) => { const f = new Float32Array(n * sz); for (let i = 0; i < n; i++) for (let k = 0; k < sz; k++) f[i * sz + k] = at.getComponent(i, k); return new THREE.BufferAttribute(f, sz); };
    g.setAttribute('position', flota(g0.attributes.position, 3));
    g.setAttribute('normal', g0.attributes.normal ? flota(g0.attributes.normal, 3) : new THREE.BufferAttribute(new Float32Array(n * 3).fill(0.577), 3));
    g.setAttribute('uv', g0.attributes.uv ? flota(g0.attributes.uv, 2) : new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    // (el color bajo cada vértice, solo para las figuras de varias piezas o sin textura, que de lejos van sin ella:
    // leer la textura entera de cada figura eran unos 4 MB por figura en el móvil)
    if (ms.length > 1 || !mapDe(o)) g.setAttribute('color', new THREE.BufferAttribute(colores(o), 3));
    g.setAttribute('aHueso', new THREE.BufferAttribute(hu, 4)); g.setAttribute('aPeso', new THREE.BufferAttribute(pe, 4));
    g.setIndex(g0.index ? g0.index.clone() : [...Array(n).keys()]);
    partes.push(g); mapas.push(mapDe(o));
  }
  if (!partes.length) throw new Error('figura sin malla: ' + fig.meshy);
  const geo = partes.length > 1 ? mergeGeometries(partes, true) : partes[0];
  if (partes.length > 1) partes.forEach(p => p.dispose());

  // ── los cuadros ──
  const filas = [], clips = {};
  const toma = () => { root.updateMatrixWorld(true); const f = new Float32Array(vb.length * 12); vb.forEach((fn, k) => { const e = fn().elements; f[k * 12] = e[0]; f[k * 12 + 1] = e[4]; f[k * 12 + 2] = e[8]; f[k * 12 + 3] = e[12]; f[k * 12 + 4] = e[1]; f[k * 12 + 5] = e[5]; f[k * 12 + 6] = e[9]; f[k * 12 + 7] = e[13]; f[k * 12 + 8] = e[2]; f[k * 12 + 9] = e[6]; f[k * 12 + 10] = e[10]; f[k * 12 + 11] = e[14]; }); filas.push(f); };
  const graba = (nombre, n, fn, fps = FPS) => { clips[nombre] = { f0: filas.length, n, fps }; for (let k = 0; k < n; k++) { fn(k); toma(); } };
  // las medidas de las piernas, de pie y en reposo
  const wp = (b) => b.getWorldPosition(new THREE.Vector3());
  const H0 = wp(B.Hips), piernas = ['Left', 'Right'].map((s, i) => {
    const up = B[s + 'UpLeg'], lo = B[s + 'Leg'], pie = B[s + 'Foot'], J = wp(up), K = wp(lo), A = wp(pie);
    const L1 = Math.hypot(K.y - J.y, K.z - J.z), L2 = Math.hypot(A.y - K.y, A.z - K.z), thR = Math.atan2(K.z - J.z, J.y - K.y), kR = thR - Math.atan2(A.z - K.z, K.y - A.y);
    return { up, lo, pie, J, A, L1, L2, thR, kR, thS: Math.PI / 2 - (i ? -0.04 : 0.06), kS: Math.PI / 2 - 0.08 };
  });
  const muslo = (piernas[0].L1 + piernas[1].L1) / 2, BAJA = muslo * 0.95;
  // (sentado, como sitPose de crowdSprites.js: la cadera baja lo que mide el muslo; el tobillo queda donde lo deja esa
  // postura, y de ahí no se mueve hasta estar de pie)
  for (const L of piernas) {
    const Jy = L.J.y - BAJA, Jz = L.J.z, Ky = Jy - L.L1 * Math.cos(L.thS), Kz = Jz + L.L1 * Math.sin(L.thS);
    L.Asy = Ky - L.L2 * Math.cos(L.thS - L.kS); L.Asz = Kz + L.L2 * Math.sin(L.thS - L.kS);
  }
  // (de pie, delante del asiento: lo que avanza la cadera para quedar encima de los pies)
  const AVANZA = (piernas[0].Asz - piernas[0].A.z + piernas[1].Asz - piernas[1].A.z) / 2;
  const padre = B.Hips.parent;
  // ── las manos ──
  // Los personajes no tienen huesos en los dedos: hacia dónde mira la palma y hacia dónde apuntan los dedos se mide en la
  // malla sin mover (los vértices de la mano; con los brazos abiertos, la palma mira al suelo) y se sigue con el hueso de
  // la mano. Así se pide «la palma hacia abajo, sobre el muslo» sin depender del reposo del personaje, que trae los
  // antebrazos levantados y las palmas hacia delante: sentados, todos enseñaban las palmas hacia arriba (el autor, 19 de
  // noviembre: «deben estar con las palmas hacia abajo, o apoyadas en las rodillas»)
  const sinPrefijo = (x) => x.replace(/[.:]/g, '').replace(/^mixamorig/, ''), kH = (nm) => vbNombre.findIndex(x => sinPrefijo(x) === nm);
  const aMalla = (nm) => { const k = kH(nm); return k < 0 || !B[nm] ? null : wp(B[nm]).applyMatrix4(vb[k]().clone().invert()); };   // (un hueso, en la malla sin mover)
  const Pg = geo.attributes.position.array, Hg = geo.attributes.aHueso.array, Wg = geo.attributes.aPeso.array;
  const deHueso = (k, min = 0.6) => { const o = []; for (let i = 0; i < Pg.length / 3; i++) { let w = 0; for (let j = 0; j < 4; j++) if (Hg[i * 4 + j] === k) w += Wg[i * 4 + j]; if (w > min) o.push(i); } return o; };
  const arribaG = (() => { const a = aMalla('Head'), b = aMalla('Hips'); return a && b ? a.sub(b).normalize() : new THREE.Vector3(0, 1, 0); })();
  const MANOS = ['Left', 'Right'].map((s) => {
    const k = kH(s + 'Hand'), mu = aMalla(s + 'Hand'), co = aMalla(s + 'ForeArm'); if (k < 0 || !mu || !co) return null;
    // (solo lo que queda más allá de la muñeca)
    const eje0 = mu.clone().sub(co).normalize(), pts = deHueso(k).map(i => new THREE.Vector3(Pg[i * 3], Pg[i * 3 + 1], Pg[i * 3 + 2])).filter(q => _v.copy(q).sub(mu).dot(eje0) > 0.01); if (pts.length < 8) return null;
    const c = new THREE.Vector3(); for (const q of pts) c.add(q); c.divideScalar(pts.length);
    const f = c.clone().sub(mu).normalize();
    // la palma: de las direcciones perpendiculares a los dedos, aquella en la que la mano es más delgada…
    const u = new THREE.Vector3().crossVectors(f, Math.abs(f.y) < 0.9 ? Y : X).normalize(), w = new THREE.Vector3().crossVectors(f, u);
    let n = null, vmin = Infinity;
    for (let a = 0; a < 180; a += 5) { const d = u.clone().multiplyScalar(Math.cos(a * Math.PI / 180)).addScaledVector(w, Math.sin(a * Math.PI / 180)); let m = 0, m2 = 0; for (const q of pts) { const t = q.dot(d); m += t; m2 += t * t; } const va = m2 / pts.length - (m / pts.length) ** 2; if (va < vmin) { vmin = va; n = d; } }
    // … y del lado del pulgar: la base de la mano abulta hacia la palma (el pulgar y su almohadilla), así que de la base a
    // las puntas se va hacia el dorso (comprobado en pantalla; si la mano es plana, la palma hacia delante)
    const lo = pts.map(q => _v.copy(q).sub(mu).dot(f)), largo = Math.max(...lo), punta = new THREE.Vector3(), base = new THREE.Vector3(); let np = 0, nb = 0;
    pts.forEach((q, j) => { if (lo[j] > largo * 0.7) { punta.add(q); np++; } else if (lo[j] < largo * 0.4) { base.add(q); nb++; } });
    const cur = np && nb ? punta.divideScalar(np).sub(base.divideScalar(nb)).dot(n) : 0;
    if (Math.abs(cur) > largo * 0.02 ? cur > 0 : n.z < 0) n.negate();
    return { k, f, n, largo: largo * vb[k]().getMaxScaleOnAxis() };
  });
  // (lo que abulta el muslo por encima de su hueso: ahí se apoya la mano)
  const GORDO = ['Left', 'Right'].map((s, i) => {
    const k = kH(s + 'UpLeg'), a = aMalla(s + 'UpLeg'), b = aMalla(s + 'Leg'); if (k < 0 || !a || !b) return piernas[i].L1 * 0.2;
    const ab = b.clone().sub(a), L = ab.length(), ds = []; ab.normalize();
    for (const j of deHueso(k)) { _v.set(Pg[j * 3], Pg[j * 3 + 1], Pg[j * 3 + 2]).sub(a); const t = _v.dot(ab) / L; if (t > 0.55 && t < 0.9) ds.push(_v.addScaledVector(ab, -_v.dot(ab)).length()); }
    ds.sort((x, y) => x - y);   // (cerca de la rodilla: más arriba, los vértices del muslo son también los de la cadera y el pantalón)
    return ds.length ? ds[Math.floor(ds.length * 0.5)] * vb[k]().getMaxScaleOnAxis() : piernas[i].L1 * 0.2;
  });
  const HB = ['LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand'].map(nm => B[nm]).filter(Boolean);
  const Q0 = new Map(R.filter(r => HB.includes(r.b)).map(r => [r.b, r.q])), brazosReposo = () => { for (const b of HB) b.quaternion.copy(Q0.get(b)); };
  const _c = new THREE.Vector3(), V = (x, y, z) => new THREE.Vector3(x, y, z);
  // gira un hueso para que lo que apunta a «de» apunte a «a», por el camino más corto (como mucho «max»)
  const apunta = (bone, de, a, max = Math.PI) => { _c.crossVectors(de, a); const s = _c.length(); if (s < 1e-6) return; gira(root, bone, _c.normalize(), Math.min(max, Math.atan2(s, de.dot(a)))); };
  /** Lleva la muñeca del brazo i (0 el izquierdo, 1 el derecho) al punto T: el brazo y el antebrazo, por trigonometría,
   *  con el codo hacia «polo»; la palma, mirando a «palma», y los dedos, hacia «dedos». Todo en las medidas del personaje
   *  de pie y mirando a +z (su izquierda, +x). */
  function manoA(i, T, polo, palma, dedos) {
    const s = i ? 'Right' : 'Left', br = B[s + 'Arm'], an = B[s + 'ForeArm'], ma = B[s + 'Hand'], H = MANOS[i]; if (!br || !an || !ma) return;
    root.updateMatrixWorld(true);
    const S = wp(br), E = wp(an), L1 = S.distanceTo(E), L2 = E.distanceTo(wp(ma));
    const d = T.clone().sub(S), D = Math.min(L1 + L2 - 0.003, Math.max(Math.abs(L1 - L2) + 0.003, d.length())); d.normalize();
    const a = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D))));
    const per = polo.clone().addScaledVector(d, -polo.dot(d)).normalize(), dB = d.clone().multiplyScalar(Math.cos(a)).addScaledVector(per, Math.sin(a));
    apunta(br, E.sub(S).normalize(), dB); root.updateMatrixWorld(true);
    const E2 = wp(an); apunta(an, wp(ma).sub(E2).normalize(), S.clone().addScaledVector(d, D).sub(E2).normalize()); root.updateMatrixWorld(true);
    if (!H) return;
    // la palma: el antebrazo y la mano giran sobre el eje del antebrazo, mitad cada uno (todo en el antebrazo lo retorcía por el codo)
    const eje = wp(ma).sub(wp(an)).normalize(), n = H.n.clone().transformDirection(vb[H.k]()), q = palma.clone();
    n.addScaledVector(eje, -n.dot(eje)); q.addScaledVector(eje, -q.dot(eje));
    if (n.lengthSq() > 1e-6 && q.lengthSq() > 1e-6) { n.normalize(); q.normalize(); const ang = Math.atan2(_c.crossVectors(n, q).dot(eje), n.dot(q)); gira(root, an, eje, ang * 0.5); gira(root, ma, eje, ang * 0.5); root.updateMatrixWorld(true); }
    // y la muñeca: la mano entera, a la orientación pedida (los dedos hacia «dedos» y la palma hacia «palma»). Solo con
    // llevar los dedos por el camino más corto, la palma se iba detrás y acababa mirando arriba o al frente
    if (dedos) {
      const M = vb[H.k](), eje3 = (f, nn) => { const ff = f.clone().normalize(), n2 = nn.clone().addScaledVector(ff, -nn.dot(ff)).normalize(); return new THREE.Matrix4().makeBasis(ff, n2, new THREE.Vector3().crossVectors(ff, n2)); };
      const q4 = new THREE.Quaternion().setFromRotationMatrix(eje3(dedos, palma).multiply(eje3(H.f.clone().transformDirection(M), H.n.clone().transformDirection(M)).transpose()));
      const sn = Math.sqrt(Math.max(0, 1 - q4.w * q4.w)); if (sn > 1e-5) gira(root, ma, _c.set(q4.x, q4.y, q4.z).multiplyScalar((q4.w < 0 ? -1 : 1) / sn), Math.min(1.25, 2 * Math.acos(Math.min(1, Math.abs(q4.w)))));
    }
  }
  // Los brazos de una postura, uno a uno (sg: +1 el izquierdo, −1 el derecho):
  // · sobre el muslo, con la palma hacia abajo y los dedos hacia la rodilla (a: cuánto del muslo, desde la cadera)
  //   (las manos de estos personajes son largas, casi como el antebrazo: la muñeca va cerca de la cadera para que los dedos
  //   acaben en la rodilla; «a» la adelanta o la atrasa, y «dentro» la mete hacia el regazo)
  const mMuslo = (a = 0, dentro = 0) => (i) => {
    const sg = i ? -1 : 1, L = piernas[i], H = MANOS[i], J = wp(L.up), K = wp(L.lo), T = J.clone().lerp(K, Math.min(0.42, Math.max(0.06, (L.L1 - (H ? H.largo : L.L1 * 0.6) * 0.95 - 0.02) / L.L1 + a)));
    T.y += GORDO[i] * 0.8 + 0.012; T.x -= sg * dentro;
    manoA(i, T, V(sg * 0.7, -0.1, -1), V(sg * 0.1, -1, 0.05), K.sub(J).normalize().add(V(-sg * (0.12 + dentro * 4), -0.04, 0)));
  };
  // · colgando junto al cuerpo, con la palma hacia el muslo
  const mCuelga = () => (i) => { const sg = i ? -1 : 1, S = wp(B[(i ? 'Right' : 'Left') + 'Arm']), L = S.distanceTo(wp(B[(i ? 'Right' : 'Left') + 'ForeArm'])) + wp(B[(i ? 'Right' : 'Left') + 'ForeArm']).distanceTo(wp(B[(i ? 'Right' : 'Left') + 'Hand'])); manoA(i, V(S.x + sg * 0.035, S.y - L * 0.965, S.z + L * 0.1), V(sg * 0.5, 0, -1), V(-sg, 0, 0.1), V(0, -1, 0.15)); };
  // · con giros sobre el reposo del personaje: bx hacia delante y arriba (negativo), by hacia dentro, bz hacia fuera, fx el
  //   codo (positivo lo estira), fy el antebrazo hacia dentro
  const mGiros = ({ bx = 0, by = 0, bz = 0, fx = 0, fy = 0 }) => (i) => { const s = i ? 'Right' : 'Left', sg = i ? 1 : -1, br = B[s + 'Arm'], an = B[s + 'ForeArm']; gira(root, br, Z, -sg * bz); gira(root, br, X, bx); gira(root, br, Y, sg * by); gira(root, an, X, fx); gira(root, an, Y, sg * fy); };
  // · aplaudiendo: las manos delante del pecho, palma contra palma, que se abren (ab = 1) y chocan (0); alto: más arriba
  const mPalma = (ab, alto = 0) => (i) => {
    const sg = i ? -1 : 1, S0 = wp(B.LeftArm), S1 = wp(B.RightArm), w = S0.distanceTo(S1) / 2, T = S0.add(S1).multiplyScalar(0.5);
    T.x += sg * w * (0.17 + 0.95 * ab); T.y += w * (-1.3 + 0.45 * alto + sg * 0.04); T.z += w * (1.35 - 0.1 * ab);
    // (los codos, abajo y algo abiertos: los antebrazos suben hacia las manos y los dedos apuntan arriba y adelante, como
    // al aplaudir; con los codos hacia fuera las manos se cruzaban en aspa y no se veía la palmada)
    manoA(i, T, V(sg * 0.55, -1, -0.15), V(-sg, 0.05, 0.25 * ab), V(sg * 0.3 * ab - sg * 0.12, 0.85, 0.5));
  };
  const par = (f0, f1 = f0) => () => { f0(0); f1(1); };
  // (de una postura de brazos a otra, hueso a hueso: sin saltos aunque una se calcule con el punto de la mano y otra con giros)
  const mezcla = (A, Z2, t) => () => { if (t <= 0) return A(); if (t >= 1) return Z2(); A(); const qa = HB.map(b => b.quaternion.clone()); brazosReposo(); Z2(); HB.forEach((b, k) => { const qb = b.quaternion.clone(); b.quaternion.copy(qa[k]).slerp(qb, t); }); };
  /** La postura: u de 0 (sentado) a 1 (de pie); salto y agacha, en metros; brazos: la postura de los brazos (arriba). */
  function postura({ u = 0, salto = 0, agacha = 0, inclina = 0, giro = 0, ladeo = 0, cabeza = 0, cabeceo = 0, brazos = null }) {
    reposo();
    const dz = AVANZA * suave(0, 0.6, u), dy = -BAJA * (1 - suave(0.15, 1, u)) - agacha + salto;
    B.Hips.position.copy(padre.worldToLocal(_v.set(H0.x, H0.y + dy, H0.z + dz)));
    const e = suave(0.3, 1, u), w = agacha ? 0 : suave(0.85, 1, u);
    for (const L of piernas) {
      const Ay = L.Asy + (L.A.y - L.Asy) * e + salto, Az = L.Asz;
      let [th, ka] = pierna(L.J.y + dy - Ay, Az - (L.J.z + dz), L.L1, L.L2);
      th += (L.thR - th) * w; ka += (L.kR - ka) * w;
      gira(root, L.up, X, -(th - L.thR)); gira(root, L.lo, X, ka - L.kR); gira(root, L.pie, X, (th - ka) - (L.thR - L.kR));
    }
    gira(root, B.Spine, X, inclina * 0.6); gira(root, B.Spine1, X, inclina * 0.4); gira(root, B.Spine, Y, giro); gira(root, B.Spine1, Z, ladeo);
    gira(root, B.Neck, X, -inclina * 0.55 + cabeceo); gira(root, B.Head, Y, cabeza);
    if (brazos) { root.updateMatrixWorld(true); brazos(); }
  }
  // (todo calculado, sin el clip de celebrar del personaje: el suyo es el del pelotari, que se dobla hasta la cintura con
  // el puño abajo, y en la grada parecía una reverencia; además no acababa como empezaba y el bucle daba un salto)
  // cómo se sienta cada figura, para que no estén todos igual: las manos en los muslos, más cerca de la rodilla o recogidas
  // hacia dentro, casi juntas en el regazo
  const SENT = [par(mMuslo()), par(mMuslo(-0.04, 0.03), mMuslo(0.05)), par(mMuslo(0.06, 0.05)), par(mMuslo(0.05), mMuslo(-0.04, 0.035))][num % 4];
  // 1. sentado, mirando el juego: la cabeza sigue la pelota de un lado a otro y el cuerpo respira (4 s, en bucle)
  graba('quieto', 20, (k) => { const p = k / 20 * Math.PI * 2; postura({ u: 0, inclina: 0.05 + 0.02 * Math.sin(p * 2), giro: 0.07 * Math.sin(p), cabeza: 0.3 * Math.sin(p), brazos: SENT }); }, FPS_QUIETO);
  // 2. levantarse (0,6 s): el cuerpo se echa hacia delante, la cadera avanza sobre los pies y sube; los brazos van ya
  // hacia la celebración de cada uno, para que el paso de una a otra no dé un salto
  const sube = (nombre, P) => graba(nombre, 10, (k) => { const x = k / 9, u = x * x * (3 - 2 * x), l = Math.sin(Math.PI * Math.pow(u, 0.65)); postura({ u, inclina: 0.05 * (1 - u) + 0.5 * l, brazos: mezcla(SENT, P, suave(0.2, 1, u)) }); });
  // 3. el puño al aire: el brazo derecho arriba, que se encoge y se estira; el otro, colgando (0,53 s, en bucle)
  const puno = (c) => par(mCuelga(), mGiros({ bx: -2.0 - 0.75 * c, fx: -0.5 + 1.2 * c, bz: 0.15 }));
  sube('subeA', puno(0));
  graba('puno', 8, (k) => { const c = 0.5 - 0.5 * Math.cos(k / 8 * Math.PI * 2); postura({ u: 1, agacha: 0.02 * (1 - c) + 1e-4, giro: 0.08 * (c - 0.5), brazos: puno(c) }); });
  // 4. saltando con los brazos en alto, en uve y casi estirados (0,8 s, en bucle)
  const ARR = -2.7, COD = 0.75, ABRE = 0.3, alto = (s) => par(mGiros({ bx: ARR + 0.2 * s, fx: COD - 0.3 * Math.max(0, -s), bz: ABRE }));
  sube('subeB', alto(0));
  graba('salta', 12, (k) => { const s = Math.sin(k / 12 * Math.PI * 2); postura({ u: 1, salto: Math.max(0, s) * 0.12, agacha: Math.max(0, -s) * 0.06 + 1e-4, ladeo: 0.05 * s, brazos: alto(s) }); });
  // 5. aplaudir: las manos delante del pecho, que se abren y chocan palma contra palma (0,4 s cada palmada, en bucle; se
  // abren despacio y se cierran de golpe, como una palmada de verdad)
  const golpe = (k, n) => { const x = k / n; return x < 0.62 ? Math.sin(x / 0.62 * Math.PI / 2) : Math.cos((x - 0.62) / 0.38 * Math.PI / 2); };   // (0 cerradas … 1 abiertas … 0)
  const palmas = (ab, de_pie = 0) => par(mPalma(ab, de_pie));
  // … de pie, con un pequeño vaivén
  sube('subeC', palmas(1, 1));
  graba('aplaudePie', 8, (k) => { const ab = golpe(k, 8); postura({ u: 1, agacha: 0.014 * (1 - ab) + 1e-4, cabeceo: 0.03 * (1 - ab), brazos: palmas(ab, 1) }); }, 20);
  // … y sin levantarse, echado un poco hacia delante
  graba('entraAp', 5, (k) => { const a = suave(0, 1, k / 4); postura({ u: 0, inclina: 0.05 + 0.07 * a, brazos: mezcla(SENT, palmas(1), a) }); });
  graba('aplaude', 8, (k) => { const ab = golpe(k, 8); postura({ u: 0, inclina: 0.12 + 0.015 * (1 - ab), cabeceo: 0.03 * (1 - ab), brazos: palmas(ab) }); }, 20);
  // de pie y en reposo, para la figura de lejos: dónde queda cada vértice
  postura({ u: 1, brazos: par(mCuelga()) }); root.updateMatrixWorld(true);
  const Mr = vb.map(fn => fn().clone()), P = geo.attributes.position.array, Hh = geo.attributes.aHueso.array, Ww = geo.attributes.aPeso.array, posada = new Float32Array(P.length), q = new THREE.Vector3();
  for (let i = 0; i < P.length / 3; i++) {
    let x = 0, y = 0, z = 0;
    for (let k = 0; k < 4; k++) { const w = Ww[i * 4 + k]; if (!w) continue; q.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).applyMatrix4(Mr[Hh[i * 4 + k]]); x += q.x * w; y += q.y * w; z += q.z * w; }
    posada[i * 3] = x; posada[i * 3 + 1] = y; posada[i * 3 + 2] = z;
  }
  // (la cabeza: los vértices que mueve sobre todo el hueso de la cabeza o el del cuello)
  const deCabeza = new Set(); vbNombre.forEach((nm, k) => { if (/Head|Neck|head/.test(nm)) deCabeza.add(k); });
  const fino = new Uint8Array(P.length / 3); for (let i = 0; i < fino.length; i++) { let mk = 0; for (let k = 1; k < 4; k++) if (Ww[i * 4 + k] > Ww[i * 4 + mk]) mk = k; fino[i] = deCabeza.has(Hh[i * 4 + mk]) ? 1 : 0; }
  const lejos = simplifica(geo, posada, QUALITY === 'low' ? 0.075 : QUALITY === 'mid' ? 0.065 : 0.055, fino);
  c.dispose?.();

  const W = vb.length * 3, Hf = filas.length, data = new Float32Array(W * Hf * 4);
  filas.forEach((f, y) => data.set(f, y * W * 4));
  const tex = new THREE.DataTexture(data, W, Hf, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
  const quieto = new THREE.Vector3(clips.quieto.f0, clips.quieto.n, FPS_QUIETO);
  const mats = mapas.map(map => { const m = new THREE.MeshStandardMaterial(map ? { map, roughness: 0.82, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: LUZ_PROPIA } : { vertexColors: true, roughness: 0.82 }); if (map) sharpMap(m); return conEsqueleto(m, tex, quieto, map ? 'publico-anim-tex' : 'publico-anim-col', !map); });
  // (la de lejos, con la misma textura que la entera si la figura es de una pieza: la cara la pinta la textura y no se
  // queda en una mancha, que es lo que pasaba con el color por vértice; no gasta más memoria, es la misma imagen)
  const matLejos = mapas.length === 1 && mapas[0] ? mats[0] : conEsqueleto(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 }), tex, quieto, 'publico-anim-col', true);
  return { nombre: fig.meshy, geo, lejos, mat: mats.length > 1 ? mats : mats[0], matLejos, tex, clips, huesos: vb.length, cuadros: Hf };
}

const cocinados = new Map();
/** Las figuras de un conjunto, con sus movimientos; se cocinan una vez y se guardan. */
export function cocinaPublico(set = 'aficion') {
  if (!cocinados.has(set)) cocinados.set(set, (async () => {
    const out = [];
    for (let f = 0; f < nFigs(set); f++) { out.push(await cocinaFigura(figure(set, f), f)); await new Promise(r => setTimeout(r)); }   // (sin bloquear la pantalla)
    return out;
  })().catch(e => { cocinados.delete(set); throw e; }));
  return cocinados.get(set);
}
/** Una malla de «cap» espectadores de la figura F (la entera o la de lejos), cada uno con su cuadro (aAnim). */
export function mallaPublico(F, cap, cerca = true) {
  const g0 = cerca ? F.geo : F.lejos, g = new THREE.BufferGeometry();
  for (const k in g0.attributes) g.setAttribute(k, g0.attributes[k]);
  g.setIndex(g0.index); for (const gr of g0.groups) g.addGroup(gr.start, gr.count, gr.materialIndex);
  const anim = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3); anim.setUsage(THREE.DynamicDrawUsage); g.setAttribute('aAnim', anim);
  const im = new THREE.InstancedMesh(g, cerca ? F.mat : F.matLejos, cap);
  im.setColorAt(0, new THREE.Color(1, 1, 1)); im.count = 0; im.visible = false; im.frustumCulled = false; im.userData.anim = anim;
  return im;
}

/**
 * El público sentado del frontón. spots = [[x, y, z, ry], …] (el sitio del sentado, como en crowd3d). Devuelve un grupo
 * con .tick(t, ánimo, zFoco, cámara), .cheer(on, lado, segundos), .listo y .dispose, como crowd3d.
 * kc: cuántos van con la figura entera (los más cercanos a la cámara); el resto, con la de lejos, que se mueve igual.
 */
export function crowdAnim(spots, set = 'aficion', height = 1.24, { kc = null } = {}) {
  const n = spots.length, Q = QUALITY, group = new THREE.Group(), NF = nFigs(set);
  const KC = Math.max(1, kc ?? (Q === 'low' ? 16 : Q === 'mid' ? 40 : 100));
  const figs = new Uint8Array(n), mats = new Float32Array(n * 16), fase = new Float32Array(n), dur = new Float32Array(n), luz = new Float32Array(n);
  const ini = new Float64Array(n).fill(-1), fin = new Float64Array(n).fill(-1), sost = new Float32Array(n), tipo = new Int8Array(n);
  { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s3 = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      figs[i] = Math.floor(Math.random() * NF); fase[i] = Math.random() * 20; dur[i] = 0.75 + Math.random() * 0.5; luz[i] = 0.9 + 0.1 * Math.abs(Math.sin(i * 12.9898));
      const s = spots[i]; m4.compose(v.set(s[0], s[1], s[2]), q.setFromEuler(e.set(0, s[3] + (Math.random() - 0.5) * 0.3, 0)), s3.setScalar((0.92 + Math.random() * 0.16) * height / 1.5));
      m4.toArray(mats, i * 16);
    } }
  let F = null, cerca = null, lejos = null, resp = null, hasta = -1, pend = null, pendTodos = false, sucio = true, pick = 0, nNear = 0;
  const near = new Int32Array(n);
  group.listo = cocinaPublico(set).then(G => {
    F = G; const cuenta = new Array(NF).fill(0); for (let i = 0; i < n; i++) cuenta[figs[i]]++;
    cerca = F.map((f, k) => { const im = mallaPublico(f, Math.max(1, Math.min(cuenta[k], KC)), true); group.add(im); return im; });
    lejos = F.map((f, k) => { const im = mallaPublico(f, Math.max(1, cuenta[k]), false); group.add(im); return im; });
  }).catch(err => {
    // (si no se puede, el público de antes, con sus dos posturas)
    console.warn('público animado', err);
    resp = crowd3d(spots, set, height, { sit: true, all3d: true, figuras: true, kc }); group.add(resp); return resp.listo;
  });
  const cam = new THREE.Vector3(), frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), sph = new THREE.Sphere(new THREE.Vector3(), 1.4);
  // (dónde estaba y adónde miraba la cámara la última vez que se eligió: ver el corte de cámara en tick)
  const camU = new THREE.Vector3(1e9, 0, 0), dirU = new THREE.Vector3(), camV = new THREE.Vector3(), dirV = new THREE.Vector3();
  // los que se ven, del más cercano a la cámara al más lejano: los KC primeros, con la figura entera
  function elige(camera) {
    camera.getWorldPosition(cam); camera.updateMatrixWorld(); camU.copy(cam); camera.getWorldDirection(dirU);
    frustum.setFromProjectionMatrix(pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const cand = [];
    for (let i = 0; i < n; i++) { const s = spots[i]; sph.center.set(s[0], s[1] + 0.7, s[2]); if (frustum.intersectsSphere(sph)) cand.push([(s[0] - cam.x) ** 2 + (s[1] - cam.y) ** 2 * 0.5 + (s[2] - cam.z) ** 2, i]); }
    cand.sort((a, b) => a[0] - b[0]);
    let otros = nNear !== cand.length; nNear = cand.length;
    for (let k = 0; k < nNear; k++) { if (near[k] !== cand[k][1]) otros = true; near[k] = cand[k][1]; }
    return otros;
  }
  // qué hace cada uno al celebrar: 0 el puño, 1 salta con los brazos arriba, 2 aplaude de pie, 3 aplaude sentado
  const TIPOS = [['subeA', 'puno'], ['subeB', 'salta'], ['subeC', 'aplaudePie'], ['entraAp', 'aplaude']], MZ = 0.15, BAJA_V = 0.8;
  const partes = (i) => { const C = F[figs[i]].clips, [e, l] = TIPOS[tipo[i]]; return [C[e], C[l] || C.salta]; };
  function programa(t, len, todos = false) {
    // (cuántos se levantan: en un tanto cualquiera, uno de cada cuatro, y los demás aplauden sentados; en un buen tanto o
    // en la entrega de la txapela, casi toda la grada en pie)
    const p = todos ? 0.92 : Math.min(0.9, Math.max(0.25, 0.1 + len * 0.1));
    for (let i = 0; i < n; i++) {
      const nombre = F[figs[i]].nombre, mayor = /abuel/.test(nombre), peque = /nino/.test(nombre);
      if (ini[i] >= 0 && t < fin[i]) {
        // (ya está celebrando: si aún no ha empezado a sentarse, sigue un poco más)
        const [E, L] = partes(i), t2 = t - ini[i] - MZ - (E.n - 1) / FPS;
        if (t2 < sost[i]) { const lp = L.n / L.fps, mas = Math.max(0, Math.ceil((t2 + len * dur[i] * 0.8 - sost[i]) / lp)) * lp; sost[i] += mas; fin[i] += mas; hasta = Math.max(hasta, fin[i]); }
        continue;
      }
      // (el aplauso, lo primero: de los que se levantan, más de la mitad aplauden de pie y el resto salta o levanta el puño;
      // de los que se quedan sentados, casi todos aplauden. El autor: «casi lo más importante son los aplausos»)
      const r = Math.random(), va = Math.random() < p;
      if (va) tipo[i] = mayor ? (r < 0.85 ? 2 : 0) : peque ? (r < 0.5 ? 1 : r < 0.8 ? 2 : 0) : r < 0.55 ? 2 : r < 0.8 ? 0 : 1;
      else if (Math.random() < 0.92) tipo[i] = 3; else continue;
      if (!F[figs[i]].clips[TIPOS[tipo[i]][1]]) tipo[i] = 1;   // (un personaje sin clip de celebrar)
      const [E, L] = partes(i), lp = L.n / L.fps, e = (E.n - 1) / FPS;
      ini[i] = t + 0.05 + Math.random() * 0.7; sost[i] = Math.max(1, Math.round(len * dur[i] / lp)) * lp;
      fin[i] = ini[i] + MZ + e + sost[i] + e / BAJA_V + MZ; hasta = Math.max(hasta, fin[i]);
    }
  }
  // el cuadro de cada uno en el momento t → (antes, después, mezcla)
  const out = [0, 0, -1];
  function cuadro(i, t) {
    const C = F[figs[i]].clips, Qc = C.quieto;
    if (ini[i] < 0 || t < ini[i] || t >= fin[i]) { if (ini[i] >= 0 && t >= fin[i]) ini[i] = -1; out[0] = fase[i]; out[1] = 0; out[2] = -1; return; }
    const quieto = Qc.f0 + Math.floor((t * FPS_QUIETO + fase[i]) % Qc.n), [E, L] = partes(i), e = (E.n - 1) / FPS;
    let x = t - ini[i];
    if (x < MZ) { out[0] = quieto; out[1] = E.f0; out[2] = x / MZ; return; }
    x -= MZ;
    if (x < e) { const f = x * FPS, k = Math.floor(f); out[0] = E.f0 + k; out[1] = E.f0 + Math.min(E.n - 1, k + 1); out[2] = f - k; return; }
    x -= e;
    if (x < sost[i]) { const f = (x * L.fps) % L.n, k = Math.floor(f); out[0] = L.f0 + k; out[1] = L.f0 + (k + 1) % L.n; out[2] = f - k; return; }
    x -= sost[i];
    if (x < e / BAJA_V) { const f = (1 - x / (e / BAJA_V)) * (E.n - 1), k = Math.min(E.n - 2, Math.floor(f)); out[0] = E.f0 + k; out[1] = E.f0 + k + 1; out[2] = f - k; return; }
    x -= e / BAJA_V;
    out[0] = E.f0; out[1] = quieto; out[2] = Math.min(1, x / MZ);
  }
  const m4 = new THREE.Matrix4(), tc = new THREE.Color();
  group.tick = (t, excite = 1, focus = 0, camera = null) => {
    if (resp) { resp.tick(t, excite, focus, camera); return; }
    uT.value = t;
    if (!F || !camera) return;
    if (pend != null) { programa(t, pend, pendTodos); pend = null; pendTodos = false; }
    // (quiénes se ven se mira cada doce cuadros; pero en un corte de cámara, el plano de dron de la grada, la repetición
    // o los planos del tanto, se mira en ese mismo cuadro: si no, la grada salía vacía hasta que tocaba)
    if (pick > 1 && (camera.getWorldPosition(camV).distanceToSquared(camU) > 2.25 || camera.getWorldDirection(dirV).dot(dirU) < 0.94)) pick = 0;
    let otros = false; if ((pick -= 1) <= 0) { pick = 12; otros = elige(camera); }
    // (todos sentados y tranquilos: su cuadro lo pone el reloj en la tarjeta; no se manda nada)
    const activo = t < hasta + 0.2;
    if (!activo && !otros && !sucio) return;
    sucio = activo;
    for (const im of cerca) im.count = 0; for (const im of lejos) im.count = 0;
    for (let k = 0; k < nNear; k++) {
      const i = near[k], f = figs[i]; let im = k < KC ? cerca[f] : lejos[f];
      if (im.count >= im.instanceMatrix.count) { im = lejos[f]; if (im.count >= im.instanceMatrix.count) continue; }
      cuadro(i, t);
      const a = im.userData.anim.array, j = im.count * 3; a[j] = out[0]; a[j + 1] = out[1]; a[j + 2] = out[2];
      tc.setRGB(luz[i], luz[i], luz[i]); im.setColorAt(im.count, tc);
      m4.fromArray(mats, i * 16); im.setMatrixAt(im.count++, m4);
    }
    for (const capa of [cerca, lejos]) for (const im of capa) { im.visible = im.count > 0; if (im.count) { im.instanceMatrix.needsUpdate = true; im.userData.anim.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; } }
  };
  // (lado no cuenta: la afición va con su ropa de calle, sin camiseta de bando; len: cuánto dura, en segundos)
  // (todos: casi toda la grada en pie, en un buen tanto)
  group.cheer = (on, lado = null, len = 1.6, todos = false) => { if (resp) { resp.cheer(on, lado, len); return; } if (on) { pend = Math.max(pend || 0, len); pendTodos ||= todos; } };
  group.dispose = () => { resp?.dispose(); for (const capa of [cerca, lejos]) if (capa) for (const im of capa) { im.geometry.dispose(); im.dispose(); } };
  return group;
}
