import { snowable } from './weather.js';
// Acumula geometrías por material y las fusiona (pocas llamadas de dibujo)
import * as THREE from 'three';
import { TEX } from './textures.js';
import { HALF, CELL } from './layout.js';

// Altura del suelo para el envejecimiento de las fachadas (la pone la naturaleza al conocer el terreno)
export const groundUniforms = { uGround: { value: new THREE.DataTexture(new Float32Array([0]), 1, 1, THREE.RedFormat, THREE.FloatType) } };
groundUniforms.uGround.value.needsUpdate = true;
// Envejecimiento en coordenadas del mundo (rompe la repetición de la textura):
//  · manchas amplias más claras y más oscuras · humedad y salpicaduras de barro en el primer metro sobre el suelo
//  · musgo verdoso al pie de la piedra · churretes de lluvia que bajan de ventanas y aleros
// k: intensidad (piedra 1, revoco 0,8, madera 0,6)
function weather(m, k = 1, moss = 1) {
  m.onBeforeCompile = (sh) => {
    if (BQ === 'low') sh.defines = { ...(sh.defines || {}), LOWQ: 1 };
    sh.uniforms.tWeather = { value: TEX.detail }; sh.uniforms.uGround = groundUniforms.uGround;
    sh.uniforms.uWK = { value: new THREE.Vector2(k, moss) };   // (en uniforme: piedra, revoco y madera comparten programa)
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWW; uniform sampler2D tWeather; uniform sampler2D uGround; uniform vec2 uWK;')
      .replace('#include <map_fragment>', `#include <map_fragment>
{
  vec3 w = vWW;
  ivec2 gs = textureSize(uGround, 0);
  float gy = gs.x > 1 ? texelFetch(uGround, clamp(ivec2((w.xz + ${HALF.toFixed(1)}) / ${CELL.toFixed(1)} + 0.5), ivec2(0), gs - 1), 0).r : -1e4;
  float up = w.y - gy;
#ifdef LOWQ
  vec4 wt = texture2D(tWeather, (w.xz + w.y * 0.7) / 23.0);   // móvil: una sola lectura (manchas y grano del mismo texel)
  float blot = wt.r, fine = wt.g;
  float base = 1.0 + (blot - 0.5) * 0.28 * ${'${K}'} + (fine - 0.5) * 0.1 * ${'${K}'};
#else
  float blot = texture2D(tWeather, (w.xz + w.y * 0.7) / 23.0).r;
  float fine = texture2D(tWeather, (w.zx - w.y * 0.5) / 4.3 + 0.3).g;
  float streak = texture2D(tWeather, vec2((w.x + w.z) / 3.1, w.y / 26.0)).b;
  float base = 1.0 + (blot - 0.5) * 0.28 * ${'${K}'} + (fine - 0.5) * 0.1 * ${'${K}'};
  base *= 1.0 - smoothstep(0.55, 0.8, streak) * 0.16 * ${'${K}'};
#endif
  float damp = (1.0 - smoothstep(0.0, 1.1 + fine * 0.6, up)) * step(-0.5, up);
  vec3 c = diffuseColor.rgb * base;
  c = mix(c, c * vec3(0.66, 0.62, 0.56), damp * 0.55 * ${'${K}'});
  c = mix(c, vec3(0.24, 0.3, 0.14) * (0.7 + 0.6 * fine), damp * smoothstep(0.45, 0.8, blot) * 0.45 * ${'${M}'});
  diffuseColor.rgb = c;
}`.replace(/\$\{K\}/g, 'uWK.x').replace(/\$\{M\}/g, 'uWK.y'));
  };
  m.customProgramCacheKey = () => 'weather2' + (BQ === 'low' ? '-low' : '');
  return m;
}


export function makeMaterials() {
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });
  const withTex = (t, o = {}) => std({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(0.9, 0.9), ...o });
  return {
    stone: weather(withTex(TEX.stoneWall)),
    stoneDark: weather(withTex(TEX.stoneDark)),
    // roca natural sin labrar (losas de dolmen, peñas)
    rock: snowable(weather(std({ normalMap: TEX.rockN, normalScale: new THREE.Vector2(1.4, 1.4), color: '#8e877b', roughness: 0.95 }), 1.3, 1)),
    ashlar: weather(withTex(TEX.ashlar), 0.9),
    // piedra arenisca dorada (catedral de Pamplona, palacios de la Ribera)
    sandstone: weather(withTex(TEX.ashlar, { color: new THREE.Color(1.3, 1.08, 0.76), emissive: new THREE.Color('#3d2f17') }), 1.0, 0.5),
    plaster: weather(withTex(TEX.plasterWhite, { normalScale: new THREE.Vector2(0.8, 0.8) }), 0.8, 0.4),
    plasterCream: weather(withTex(TEX.plasterCream, { normalScale: new THREE.Vector2(0.8, 0.8) }), 0.8, 0.4),
    slate: snowable(withTex(TEX.roofSlate, { roughness: 0.75 })),
    brick: weather(withTex(TEX.brick), 0.8, 0.3),
    plasterOcher: weather(withTex(TEX.plasterOcher, { normalScale: new THREE.Vector2(0.8, 0.8) }), 0.8, 0.4),
    plasterRose: weather(withTex(TEX.plasterRose, { normalScale: new THREE.Vector2(0.8, 0.8) }), 0.8, 0.4),
    plasterBlue: weather(withTex(TEX.plasterBlue, { normalScale: new THREE.Vector2(0.8, 0.8) }), 0.8, 0.4),
    gold: std({ color: '#d9a93a', metalness: 0.7, roughness: 0.35 }),
    zinc: std({ color: '#5d7480', metalness: 0.5, roughness: 0.4 }),
    tile: snowable(withTex(TEX.roofTile, { roughness: 0.8 })),
    wood: weather(withTex(TEX.wood), 0.6, 0.2),
    woodDark: weather(withTex(TEX.woodDark), 0.6, 0.2),
    // cristal mate (Lambert, sin brillo especular): no hace reflejos al girar la cámara; de noche se enciende con el emisivo
    // y con prioridad de profundidad sobre la pared, para que no parpadee de lejos ni en móviles con poca precisión
    glass: new THREE.MeshLambertMaterial({ color: '#3b5166', emissive: new THREE.Color('#ffb85a'), emissiveIntensity: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
    water: std({ color: '#3b7f9c', roughness: 0.05, metalness: 0.3, envMapIntensity: 1.2 }),
    // chorro de las fuentes: agua clara y algo transparente
    jet: std({ color: '#d8edf3', roughness: 0.1, transparent: true, opacity: 0.6, emissive: new THREE.Color('#29434d') }),
    paint: std({ vertexColors: true, roughness: 0.7 }),
    // asientos de estadio: algo de brillo propio para que no se vean negros bajo la cubierta
    // superficies a la sombra de grandes cubiertas (sin luz directa se verían negras)
    lit: std({ vertexColors: true, roughness: 0.8, emissive: new THREE.Color('#34383c') }),
    seat: std({ vertexColors: true, roughness: 0.55, emissive: new THREE.Color('#3a0a0e') }),
    iron: std({ color: '#2a2a2e', roughness: 0.5, metalness: 0.6 }),
    dark: std({ color: '#141216', roughness: 1 }),
    leaf: snowable(std({ vertexColors: true, roughness: 0.85 }), 0.7),
    lamp: std({ color: '#fff3c4', emissive: new THREE.Color('#ffcf73'), emissiveIntensity: 0 }),
    shield: std({ map: shieldTexture(), transparent: true, alphaTest: 0.5, roughness: 0.9 }),
    // barandilla de forja calada (una sola cara con transparencia recortada): balcones, kioscos, barreras
    railing: std({ map: railingTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55, metalness: 0.45 }),
  };
}

// Forja: barrotes, pasamanos y una greca de círculos; el módulo mide 0,9 m y se repite a lo ancho
function railingTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#26262b'; g.strokeStyle = '#26262b';
  g.fillRect(0, 0, 128, 9); g.fillRect(0, 116, 128, 12); g.fillRect(0, 84, 128, 5);
  for (let i = 0; i < 8; i++) g.fillRect(i * 16 + 6, 0, 4, 128);
  g.lineWidth = 4;
  for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(i * 32 + 16, 100, 9, 0, Math.PI * 2); g.stroke(); }
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(i * 32 + 8, 30); g.quadraticCurveTo(i * 32 + 16, 18, i * 32 + 24, 30); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}

function shieldTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 160;
  const g = c.getContext('2d');
  const shape = () => { g.beginPath(); g.moveTo(14, 10); g.lineTo(114, 10); g.lineTo(114, 80); g.quadraticCurveTo(114, 140, 64, 152); g.quadraticCurveTo(14, 140, 14, 80); g.closePath(); };
  g.fillStyle = '#b4a384'; shape(); g.fill();
  g.lineWidth = 7; g.strokeStyle = '#8a7a5e'; g.stroke();
  // cuarteles: cadenas de Navarra y un árbol
  g.strokeStyle = '#6f624b'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(64, 14); g.lineTo(64, 148); g.moveTo(16, 78); g.lineTo(112, 78); g.stroke();
  g.fillStyle = '#7d6f55';
  for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(40, 30 + i * 11, 4, 0, 7); g.fill(); }
  g.beginPath(); g.arc(88, 44, 16, 0, 7); g.fill(); g.fillRect(85, 52, 6, 20);
  g.beginPath(); g.moveTo(26, 120); g.lineTo(54, 90); g.lineTo(54, 120); g.fill();
  g.beginPath(); g.arc(88, 110, 10, 0, 7); g.fill();
  // corona
  g.fillStyle = '#a5957a'; g.fillRect(34, 0, 60, 12);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Caja con UV proporcionales a sus dimensiones (texturas a escala real)
export function box(w, h, d, uvScale = 2.5) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv, n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    let su, sv;
    if (nx > 0.5) { su = d; sv = h; } else if (ny > 0.5) { su = w; sv = d; } else { su = w; sv = h; }
    uv.setXY(i, uv.getX(i) * su / uvScale, uv.getY(i) * sv / uvScale);
  }
  return g;
}

// Reescala las UV de una pieza de revolución (cilindro, cono, torno) para que la textura vaya a escala real:
// su = vueltas de textura alrededor (perímetro / tamaño de la losa), sv = a lo largo (altura / tamaño)
export function uvFit(g, su, sv) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return g;
}
// Cilindro con la textura a escala real (2,5 m por losa, como box)
export function cyl(rt, rb, h, seg = 8, open = false, uvScale = 2.5, t0 = 0, tl = Math.PI * 2) {
  return uvFit(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open, t0, tl), Math.max(rt, rb) * tl / uvScale, h / uvScale);
}

export function colored(g, color) {
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

// Prisma triangular (hastial) de ancho w, altura h, grosor d; base en y=0
export function gable(w, h, d, uvScale = 2.5) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / uvScale, uv.getY(i) / uvScale);
  return g;
}

// Arco (bóveda de portal) : anillo semicircular extruido
export function archRing(rIn, rOut, depth, segs = 12) {
  const s = new THREE.Shape();
  s.absarc(0, 0, rOut, 0, Math.PI, false);
  s.lineTo(-rIn, 0);
  s.absarc(0, 0, rIn, Math.PI, 0, true);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: segs });
  g.translate(0, 0, -depth / 2);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 1.5, uv.getY(i) / 1.5);
  return g;
}

// Hueco en arco (puerta/ventana) como forma plana extruida
export function archPanel(w, h, depth) {
  const s = new THREE.Shape();
  const r = w / 2;
  s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, h - r); s.absarc(0, h - r, r, 0, Math.PI, false); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 10 });
  g.translate(0, 0, -depth / 2);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 1.2, uv.getY(i) / 1.2);
  return g;
}

// Piezas de detalle registradas por los constructores: se ocultan cuando la cámara se aleja
export const DETAIL = [];
export function resetDetail() { DETAIL.length = 0; }
const DETAIL_DIST = { low: [45, 110], mid: [60, 140], high: [80, 180] };
export function updateDetail(cam, quality = 'high') {
  const [d2, d1] = DETAIL_DIST[quality] || DETAIL_DIST.high;
  for (const e of DETAIL) {
    const d = Math.hypot(cam.x - e.c.x, cam.z - e.c.z) - e.r;
    e.m.visible = d < (e.tier === 2 ? d2 : d1);
  }
}
// Calidad: en «low» no se crean las piezas menudas (marcos, macetas, lamas…) para ahorrar memoria en móviles
let TINY = true;
let BQ = 'high';
export function setBuilderQuality(q) { TINY = q !== 'low'; BQ = q || 'high'; }
export const builderQuality = () => BQ;
// Un bloque de un material (una manzana de piezas de un tamaño): los vértices de cada pieza se copian aquí en cuanto
// llega, ya colocados y compactos (color en bytes, normal en bytes con signo). Antes cada pieza se guardaba suelta hasta
// el final y luego se unían todas en una copia nueva: en Pamplona eran más de cien mil piezas vivas a la vez y, al unirlas,
// otra copia entera encima; con ese pico de memoria Safari puede cerrar la página en el iPhone.
class Run {
  constructor() { this.n = 0; this.cap = 0; this.ni = 0; this.icap = 0; this.pos = null; this.nrm = null; this.uv = null; this.col = null; this.idx = null; }
  reserve(addV, addI) {
    const grow = (T, old, k, cap, used) => { const a = new T(cap * k); if (old) a.set(old.subarray(0, used * k)); return a; };
    if (this.n + addV > this.cap) {
      let cap = Math.max(512, Math.ceil(this.cap * 1.5)); while (cap < this.n + addV) cap = Math.ceil(cap * 1.5);
      this.pos = grow(Float32Array, this.pos, 3, cap, this.n); this.nrm = grow(Int8Array, this.nrm, 3, cap, this.n); this.uv = grow(Float32Array, this.uv, 2, cap, this.n);
      if (this.col) this.col = grow(Uint8Array, this.col, 3, cap, this.n);
      this.cap = cap;
    }
    if (this.ni + addI > this.icap) {
      let cap = Math.max(768, Math.ceil(this.icap * 1.5)); while (cap < this.ni + addI) cap = Math.ceil(cap * 1.5);
      this.idx = grow(Uint32Array, this.idx, 1, cap, this.ni); this.icap = cap;
    }
  }
  // a partir de la primera pieza con color, el bloque lleva color (las anteriores, blancas)
  withColor() { if (!this.col) { this.col = new Uint8Array(this.cap * 3); this.col.fill(255, 0, this.n * 3); } }
}
// memoria de trabajo reutilizada entre piezas (posiciones y normales ya colocadas de la pieza que llega)
let SP = new Float32Array(3 * 4096), SN = new Float32Array(3 * 4096);
const _nm = new THREE.Matrix3(), _v = new THREE.Vector3();
const to8 = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255), toS8 = (v) => Math.round(Math.min(1, Math.max(-1, v)) * 127);
export class Builder {
  // cell: tamaño de las manzanas en que se reparte la geometría; así la cámara (y la sombra) sólo
  // dibujan las que tienen delante en vez de todo el pueblo de una vez
  constructor(mats, cell = 70) { this.mats = mats; this.parts = {}; this.cell = cell; }
  /** Añade una pieza (con su matriz). La pieza no se modifica: se puede volver a añadir con otra matriz. */
  add(mat, geo, matrix) {
    const pa = geo.attributes.position; if (!pa || !pa.count) return;
    const nv = pa.count, idx = geo.index, cnt = idx ? idx.count : nv;
    if (!cnt) return;
    if (SP.length < nv * 3) { SP = new Float32Array(nv * 3 * 2); SN = new Float32Array(nv * 3 * 2); }
    // 1) vértices colocados y su caja (para saber en qué manzana y de qué tamaño es)
    const e = matrix ? matrix.elements : null, fast = pa.array instanceof Float32Array && !pa.isInterleavedBufferAttribute && pa.itemSize === 3 && !pa.normalized, A = pa.array;
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (let v = 0; v < nv; v++) {
      let x, y, z;
      if (fast) { x = A[v * 3]; y = A[v * 3 + 1]; z = A[v * 3 + 2]; } else { x = pa.getX(v); y = pa.getY(v); z = pa.getZ(v); }
      if (e) { const X = e[0] * x + e[4] * y + e[8] * z + e[12], Y = e[1] * x + e[5] * y + e[9] * z + e[13], Z = e[2] * x + e[6] * y + e[10] * z + e[14]; x = X; y = Y; z = Z; }
      // (la caja, con los valores ya en precisión simple, como quedan guardados: hay piezas de 0,9 m justos, el límite
      // entre mediana y menuda, y así caen en el mismo grupo que antes)
      x = Math.fround(x); y = Math.fround(y); z = Math.fround(z);
      SP[v * 3] = x; SP[v * 3 + 1] = y; SP[v * 3 + 2] = z;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z;
    }
    // piezas grandes, medianas y menudas: las pequeñas (marcos, macetas, balaustres…) se agrupan aparte para
    // dejar de dibujarlas de lejos y sin sombra; las grandes, en manzanas mayores (menos llamadas de dibujo)
    const size = Math.max(x1 - x0, y1 - y0, z1 - z0);
    const tier = size < 0.9 ? 2 : size < 3 ? 1 : 0, cell = tier ? this.cell : this.cell * 2;
    if (tier === 2 && !TINY) return;
    const key = mat + '|' + Math.floor((x0 + x1) / 2 / cell) + ',' + Math.floor((z0 + z1) / 2 / cell) + '|' + tier;
    const run = (this.parts[key] ||= new Run());
    // 2) normales colocadas (con la matriz de normales, como applyMatrix4)
    let na = geo.attributes.normal;
    if (!na) { geo.computeVertexNormals(); na = geo.attributes.normal; }
    if (e) _nm.getNormalMatrix(matrix);
    for (let v = 0; v < nv; v++) {
      _v.set(na.getX(v), na.getY(v), na.getZ(v)); if (e) _v.applyMatrix3(_nm).normalize();
      SN[v * 3] = _v.x; SN[v * 3 + 1] = _v.y; SN[v * 3 + 2] = _v.z;
    }
    // 3) copia al bloque: cada vértice una vez y los triángulos por índices, como en la pieza original (una caja son 24
    //    vértices en vez de 36 repetidos: un tercio menos de memoria en la gráfica)
    const ua = geo.attributes.uv, ca = geo.attributes.color;
    run.reserve(nv, cnt); if (ca || this.mats[mat]?.vertexColors) run.withColor();
    const P = run.pos, N = run.nrm, U = run.uv, C = run.col, I = run.idx, o0 = run.n, i0 = run.ni;
    for (let v = 0; v < nv; v++) {
      const o = o0 + v;
      P[o * 3] = SP[v * 3]; P[o * 3 + 1] = SP[v * 3 + 1]; P[o * 3 + 2] = SP[v * 3 + 2];
      N[o * 3] = toS8(SN[v * 3]); N[o * 3 + 1] = toS8(SN[v * 3 + 1]); N[o * 3 + 2] = toS8(SN[v * 3 + 2]);
      if (ua) { U[o * 2] = ua.getX(v); U[o * 2 + 1] = ua.getY(v); } else { U[o * 2] = 0; U[o * 2 + 1] = 0; }
      if (C) { if (ca) { C[o * 3] = to8(ca.getX(v)); C[o * 3 + 1] = to8(ca.getY(v)); C[o * 3 + 2] = to8(ca.getZ(v)); } else { C[o * 3] = C[o * 3 + 1] = C[o * 3 + 2] = 255; } }
    }
    if (idx) { const IA = idx.array; for (let k = 0; k < cnt; k++) I[i0 + k] = o0 + IA[k]; } else for (let k = 0; k < cnt; k++) I[i0 + k] = o0 + k;
    run.n += nv; run.ni += cnt;
  }
  build(parent, { shadows = true } = {}) {
    const meshes = [];
    // una vez subidos a la tarjeta gráfica, se suelta la copia en memoria. Las piezas grandes conservan sus posiciones
    // para comprobar si algo tapa la vista (prismáticos)
    const free = function () { this.array = null; };
    for (const [key, run] of Object.entries(this.parts)) {
      if (!run.n) continue;
      const [mat, , tierS] = key.split('|'), tier = +tierS || 0, n = run.n, ni = run.ni;
      // (copias del tamaño justo: el bloque de trabajo crece por tramos y le sobra sitio; se suelta enseguida)
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(run.pos.slice(0, n * 3), 3));
      g.setAttribute('normal', new THREE.BufferAttribute(run.nrm.slice(0, n * 3), 3, true));
      g.setAttribute('uv', new THREE.BufferAttribute(run.uv.slice(0, n * 2), 2));
      if (run.col) g.setAttribute('color', new THREE.BufferAttribute(run.col.slice(0, n * 3), 3, true));
      g.setIndex(new THREE.BufferAttribute(n <= 65535 ? Uint16Array.from(run.idx.subarray(0, ni)) : run.idx.slice(0, ni), 1));
      run.pos = run.nrm = run.uv = run.col = run.idx = null;
      g.computeBoundingSphere(); g.computeBoundingBox();
      for (const [k, at] of Object.entries(g.attributes)) if (!(tier === 0 && k === 'position')) at.onUpload(free);
      if (tier !== 0) g.index.onUpload(free);
      const m = new THREE.Mesh(g, this.mats[mat]);
      m.castShadow = shadows && tier === 0 && !['glass', 'lamp', 'jet'].includes(mat);
      if (tier) DETAIL.push({ m, tier, c: g.boundingSphere.center.clone(), r: g.boundingSphere.radius });
      m.receiveShadow = true;
      m.matrixAutoUpdate = false; m.name = key;
      parent.add(m); meshes.push(m);
    }
    this.parts = {};
    return meshes;
  }
}

// Matriz auxiliar: posición, rotación Y (y opcional X/Z), escala
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export function M(x, y, z, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
}
// Composición: parent * local
export function MM(parent, local) { return new THREE.Matrix4().multiplyMatrices(parent, local); }
