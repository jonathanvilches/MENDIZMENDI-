import { snowable } from './weather.js';
// Acumula geometrías por material y las fusiona (pocas llamadas de dibujo)
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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
    plaster: weather(withTex(TEX.plasterWhite, { normalScale: new THREE.Vector2(0.5, 0.5) }), 0.8, 0.4),
    plasterCream: weather(withTex(TEX.plasterCream, { normalScale: new THREE.Vector2(0.5, 0.5) }), 0.8, 0.4),
    slate: snowable(withTex(TEX.roofSlate, { roughness: 0.75 })),
    brick: weather(withTex(TEX.brick), 0.8, 0.3),
    plasterOcher: weather(withTex(TEX.plasterOcher, { normalScale: new THREE.Vector2(0.5, 0.5) }), 0.8, 0.4),
    plasterRose: weather(withTex(TEX.plasterRose, { normalScale: new THREE.Vector2(0.5, 0.5) }), 0.8, 0.4),
    plasterBlue: weather(withTex(TEX.plasterBlue, { normalScale: new THREE.Vector2(0.5, 0.5) }), 0.8, 0.4),
    gold: std({ color: '#d9a93a', metalness: 0.7, roughness: 0.35 }),
    zinc: std({ color: '#5d7480', metalness: 0.5, roughness: 0.4 }),
    tile: snowable(withTex(TEX.roofTile, { roughness: 0.8 })),
    wood: weather(withTex(TEX.wood), 0.6, 0.2),
    woodDark: weather(withTex(TEX.woodDark), 0.6, 0.2),
    // cristal mate (Lambert, sin brillo especular): no hace reflejos al girar la cámara; de noche se enciende con el emisivo
    // y con prioridad de profundidad sobre la pared, para que no parpadee de lejos ni en móviles con poca precisión
    glass: new THREE.MeshLambertMaterial({ color: '#2a3c4b', emissive: new THREE.Color('#ffb85a'), emissiveIntensity: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
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
// Compacta los atributos (color en bytes, normal en bytes con signo) y, una vez subidos a la tarjeta gráfica, libera
// la copia en memoria. Las piezas grandes conservan sus posiciones para comprobar si algo tapa la vista (prismáticos).
function compact(geo, keepPos) {
  const c = geo.attributes.color;
  if (c && c.array instanceof Float32Array) { const a = new Uint8Array(c.array.length); for (let i = 0; i < a.length; i++) a[i] = Math.round(Math.min(1, Math.max(0, c.array[i])) * 255); geo.setAttribute('color', new THREE.BufferAttribute(a, 3, true)); }
  const n = geo.attributes.normal;
  if (n && n.array instanceof Float32Array) { const a = new Int8Array(n.array.length); for (let i = 0; i < a.length; i++) a[i] = Math.round(Math.min(1, Math.max(-1, n.array[i])) * 127); geo.setAttribute('normal', new THREE.BufferAttribute(a, 3, true)); }
  const free = function () { this.array = null; };
  for (const [k, at] of Object.entries(geo.attributes)) if (!(keepPos && k === 'position')) at.onUpload(free);
}
export class Builder {
  // cell: tamaño de las manzanas en que se reparte la geometría; así la cámara (y la sombra) sólo
  // dibujan las que tienen delante en vez de todo el pueblo de una vez
  constructor(mats, cell = 70) { this.mats = mats; this.parts = {}; this.cell = cell; }
  add(mat, geo, matrix) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (matrix) g.applyMatrix4(matrix);
    if (this.mats[mat].vertexColors && !g.attributes.color) colored(g, '#ffffff');
    // Unificar atributos (position, normal, uv[, color])
    for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(a)) g.deleteAttribute(a);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.computeBoundingBox();
    // piezas grandes, medianas y menudas: las pequeñas (marcos, macetas, balaustres…) se agrupan aparte para
    // dejar de dibujarlas de lejos y sin sombra; las grandes, en manzanas mayores (menos llamadas de dibujo)
    const b = g.boundingBox, size = Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z);
    const tier = size < 0.9 ? 2 : size < 3 ? 1 : 0, cell = tier ? this.cell : this.cell * 2;
    if (tier === 2 && !TINY) return;
    const key = mat + '|' + Math.floor((b.min.x + b.max.x) / 2 / cell) + ',' + Math.floor((b.min.z + b.max.z) / 2 / cell) + '|' + tier;
    (this.parts[key] ||= []).push(g);
  }
  build(parent, { shadows = true } = {}) {
    const meshes = [];
    for (const [key, list] of Object.entries(this.parts)) {
      if (!list.length) continue;
      const [mat, , tierS] = key.split('|'), tier = +tierS || 0;
      const hasColor = list.some(g => g.attributes.color);
      if (hasColor) for (const g of list) if (!g.attributes.color) colored(g, '#ffffff');
      const merged = mergeGeometries(list, false);
      if (!merged) { console.warn('merge failed', mat); continue; }
      merged.computeBoundingSphere(); merged.computeBoundingBox();
      compact(merged, tier === 0);
      const m = new THREE.Mesh(merged, this.mats[mat]);
      m.castShadow = shadows && tier === 0 && !['glass', 'lamp', 'jet'].includes(mat);
      if (tier) DETAIL.push({ m, tier, c: merged.boundingSphere.center.clone(), r: merged.boundingSphere.radius });
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
