// Acumula geometrías por material y las fusiona (pocas llamadas de dibujo)
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TEX } from './textures.js';

export function makeMaterials() {
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });
  const withTex = (t, o = {}) => std({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(0.9, 0.9), ...o });
  return {
    stone: withTex(TEX.stoneWall),
    stoneDark: withTex(TEX.stoneDark),
    ashlar: withTex(TEX.ashlar),
    plaster: withTex(TEX.plasterWhite, { normalScale: new THREE.Vector2(0.5, 0.5) }),
    plasterCream: withTex(TEX.plasterCream, { normalScale: new THREE.Vector2(0.5, 0.5) }),
    slate: withTex(TEX.roofSlate, { roughness: 0.75 }),
    brick: withTex(TEX.brick),
    plasterOcher: withTex(TEX.plasterOcher, { normalScale: new THREE.Vector2(0.5, 0.5) }),
    plasterRose: withTex(TEX.plasterRose, { normalScale: new THREE.Vector2(0.5, 0.5) }),
    plasterBlue: withTex(TEX.plasterBlue, { normalScale: new THREE.Vector2(0.5, 0.5) }),
    gold: std({ color: '#d9a93a', metalness: 0.7, roughness: 0.35 }),
    zinc: std({ color: '#5d7480', metalness: 0.5, roughness: 0.4 }),
    tile: withTex(TEX.roofTile, { roughness: 0.8 }),
    wood: withTex(TEX.wood),
    woodDark: withTex(TEX.woodDark),
    // cristal mate (Lambert, sin brillo especular): no hace reflejos al girar la cámara; de noche se enciende con el emisivo
    // y con prioridad de profundidad sobre la pared, para que no parpadee de lejos ni en móviles con poca precisión
    glass: new THREE.MeshLambertMaterial({ color: '#2a3c4b', emissive: new THREE.Color('#ffb85a'), emissiveIntensity: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
    water: std({ color: '#3b7f9c', roughness: 0.05, metalness: 0.3, envMapIntensity: 1.2 }),
    paint: std({ vertexColors: true, roughness: 0.7 }),
    iron: std({ color: '#2a2a2e', roughness: 0.5, metalness: 0.6 }),
    dark: std({ color: '#141216', roughness: 1 }),
    leaf: std({ vertexColors: true, roughness: 0.85 }),
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
    const b = g.boundingBox, key = mat + '|' + Math.floor((b.min.x + b.max.x) / 2 / this.cell) + ',' + Math.floor((b.min.z + b.max.z) / 2 / this.cell);
    (this.parts[key] ||= []).push(g);
  }
  build(parent, { shadows = true } = {}) {
    const meshes = [];
    for (const [key, list] of Object.entries(this.parts)) {
      if (!list.length) continue;
      const mat = key.split('|')[0];
      const hasColor = list.some(g => g.attributes.color);
      if (hasColor) for (const g of list) if (!g.attributes.color) colored(g, '#ffffff');
      const merged = mergeGeometries(list, false);
      if (!merged) { console.warn('merge failed', mat); continue; }
      merged.computeBoundingSphere();
      const m = new THREE.Mesh(merged, this.mats[mat]);
      m.castShadow = shadows && !['glass', 'lamp'].includes(mat);
      m.receiveShadow = true;
      m.matrixAutoUpdate = false;
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
