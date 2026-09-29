// Árboles (hayas, abetos, robles), hierba viva, flores, rocas y helechos
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HALF, CELL, N, PLACES, pathQuery, riverInfo, villageMask, meadowMask, iratiMask, fieldInfo, SPECIAL_TREES, TREE_MIX, TONE } from './layout.js';
import { H, SURF, terrainHeight, surfAt } from './heightfield.js';
import { addCircle, isFree } from './colliders.js';
import { mulberry32, smoothstep, clamp } from '../util/math.js';
import { fbm } from '../util/noise.js';

export const windUniforms = { uTime: { value: 0 }, uWind: { value: 1 } };

// ---------- Geometrías de árboles ----------
function colorize(g, fn) {
  const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { fn(p.getX(i), p.getY(i), p.getZ(i), c); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
function sphericalNormals(g, cx, cy, cz, k = 0.75) {
  g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal, v = new THREE.Vector3(), f = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i) - cx, p.getY(i) - cy, p.getZ(i) - cz).normalize();
    f.set(n.getX(i), n.getY(i), n.getZ(i));
    f.lerp(v, k).normalize();
    n.setXYZ(i, f.x, f.y, f.z);
  }
}
function jitter(g, amt, rnd) {
  const p = g.attributes.position; const map = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!map.has(key)) map.set(key, [(rnd() - 0.5) * amt, (rnd() - 0.5) * amt, (rnd() - 0.5) * amt]);
    const j = map.get(key);
    p.setXYZ(i, p.getX(i) + j[0], p.getY(i) + j[1], p.getZ(i) + j[2]);
  }
}
function trunk(h, r, color, segs = 6) {
  const g = new THREE.CylinderGeometry(r * 0.7, r, h, segs, 2);
  g.translate(0, h / 2, 0);
  g.computeVertexNormals();
  return colorize(g, (x, y, z, c) => c.set(color).multiplyScalar(0.85 + 0.3 * (y / h)));
}
function blobCanopy(rnd, blobs, detail, base, tint, spread, top) {
  const parts = [];
  const cy = top;
  for (const b of blobs) {
    // copa redondeada y mullida: esfera más fina, sombreado suave y bultos pequeños alrededor
    // detail -1: copa sencilla para árboles lejanos y cultivos (muchas copias, se ven de lejos)
    const g = new THREE.IcosahedronGeometry(b[3], Math.max(0, detail + 1));
    jitter(g, b[3] * 0.16, rnd);
    g.translate(b[0], b[1], b[2]);
    const gn = g.toNonIndexed(); sphericalNormals(gn, b[0], b[1], b[2], 0.9); parts.push(gn);
    if (detail > 0) for (let i = 0; i < 3; i++) {
      const a = rnd() * Math.PI * 2, e = (rnd() - 0.2) * 1.2, rr = b[3] * (0.38 + rnd() * 0.12);
      const px = b[0] + Math.cos(a) * Math.cos(e) * b[3] * 0.85, py = b[1] + Math.sin(e) * b[3] * 0.85, pz = b[2] + Math.sin(a) * Math.cos(e) * b[3] * 0.85;
      const sg = new THREE.IcosahedronGeometry(rr, 1); jitter(sg, rr * 0.14, rnd); sg.translate(px, py, pz);
      const sn = sg.toNonIndexed(); sphericalNormals(sn, px, py, pz, 0.9); parts.push(sn);
    }
  }
  const g = mergeGeometries(parts);
  const cA = new THREE.Color(base), cB = new THREE.Color(tint);
  colorize(g, (x, y, z, c) => {
    const t = clamp((y - (cy - spread)) / (spread * 2), 0, 1);
    c.copy(cA).lerp(cB, t * 0.9 + (rnd() - 0.5) * 0.12);
    const occl = 0.75 + 0.25 * clamp(Math.hypot(x, y - cy, z) / spread, 0, 1);
    c.multiplyScalar(occl);
  });
  return g;
}
function makeBeech(rnd, detail) {
  const t = trunk(4.2, 0.32, '#8f8a80');
  // ramas principales
  const br = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.CylinderGeometry(0.07, 0.14, 2.4, 5); g.translate(0, 1.2, 0);
    g.rotateZ(0.6); g.rotateY(i * 2.1 + rnd()); g.translate(0, 3.4, 0);
    br.push(colorize(g.toNonIndexed(), (x, y, z, c) => c.set('#857f75')));
  }
  const blobs = [[0, 6.3, 0, 2.9], [1.8, 5.4, 0.6, 2.1], [-1.6, 5.6, -0.8, 2.2], [0.4, 5.2, -1.8, 2.0], [-0.6, 7.6, 0.5, 2.0], [0.9, 7.1, 1.4, 1.7]];
  const c = blobCanopy(rnd, detail ? blobs : blobs.slice(0, 4), detail ? 1 : -1, '#3f6f2a', '#8fbf4a', 3.4, 6.2);
  return mergeGeometries([t.toNonIndexed(), ...(detail ? br : []), c].map(g => { for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(a)) g.deleteAttribute(a); return g.index ? g.toNonIndexed() : g; }));
}
function makeOak(rnd, detail) {
  const t = trunk(3.2, 0.42, '#6d5a45');
  const blobs = [[0, 5.2, 0, 3.0], [2.3, 4.6, 0.3, 2.3], [-2.2, 4.8, -0.4, 2.4], [0.3, 4.5, 2.1, 2.1], [-0.3, 4.6, -2.2, 2.2], [0.2, 6.6, 0, 2.1]];
  const c = blobCanopy(rnd, detail ? blobs : blobs.slice(0, 4), detail ? 1 : -1, '#3d6526', '#9cbb4d', 3.6, 5.0);
  return mergeGeometries([t.toNonIndexed(), c].map(g => { for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(a)) g.deleteAttribute(a); return g.index ? g.toNonIndexed() : g; }));
}
function makeFir(rnd, detail) {
  const t = trunk(2.2, 0.28, '#5a4636');
  const parts = [t.toNonIndexed()];
  const layers = detail ? 6 : 4;
  for (let i = 0; i < layers; i++) {
    const k = i / (layers - 1);
    const r = 2.9 * (1 - k * 0.78), h = 3.6 - k * 1.2;
    const g = new THREE.ConeGeometry(r, h, detail ? 9 : 7, 1, true);
    jitter(g, 0.25, rnd);
    g.translate(0, 2.2 + k * 8.6 + h / 2, 0);
    const gn = g.toNonIndexed();
    sphericalNormals(gn, 0, 2.2 + k * 8.6 + h * 0.2, 0, 0.45);
    colorize(gn, (x, y, z, c) => { const rr = Math.hypot(x, z) / r; c.set('#1f4a2c').lerp(new THREE.Color('#4f8a45'), clamp(rr * 0.8 + k * 0.3, 0, 1)); });
    parts.push(gn);
  }
  return mergeGeometries(parts.map(g => { for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(a)) g.deleteAttribute(a); return g; }));
}
function makeBush(rnd) {
  // mata central redondeada y dos laterales más sencillas (hay cientos: pocos triángulos)
  return clean([blobCanopy(rnd, [[0, 0.7, 0, 0.9]], 0, '#3a6428', '#7fae45', 1, 0.6), blobCanopy(rnd, [[0.7, 0.5, 0.2, 0.7], [-0.6, 0.55, -0.2, 0.7]], -1, '#3a6428', '#7fae45', 1, 0.6)]);
}

function clean(list) { return mergeGeometries(list.map(g => { g = g.index ? g.toNonIndexed() : g; for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(a)) g.deleteAttribute(a); return g; })); }
function makeOlive(rnd, detail) {
  // tronco retorcido y copa gris verdosa
  const t = trunk(1.6, 0.3, '#6b5a48', 7); jitter(t, 0.12, rnd);
  const blobs = [[0, 2.6, 0, 1.5], [1.1, 2.3, 0.3, 1.1], [-1.0, 2.4, -0.4, 1.1], [0.2, 3.1, 0.8, 1.0]];
  return clean([t, blobCanopy(rnd, detail ? blobs : blobs.slice(0, 2), detail ? 1 : -1, '#5f6f45', '#9fae7c', 1.8, 2.6)]);
}
function makePoplar(rnd, detail) {
  const t = trunk(4, 0.25, '#b9b3a3');
  const blobs = [[0, 5, 0, 1.6], [0, 7, 0, 1.5], [0, 8.8, 0, 1.2], [0.3, 6, 0.3, 1.3]];
  const c = blobCanopy(rnd, detail ? blobs : blobs.slice(0, 3), detail ? 1 : -1, '#557a2c', '#a8c460', 2.6, 6.8);
  c.scale(0.9, 1, 0.9);
  return clean([t, c]);
}
function makePine(rnd, detail) {
  const t = trunk(5.5, 0.3, '#8a5a3a');
  const blobs = [[0, 6.6, 0, 2.2], [1.4, 6.1, 0.4, 1.5], [-1.3, 6.3, -0.3, 1.5], [0.2, 7.4, -0.6, 1.4]];
  const c = blobCanopy(rnd, detail ? blobs : blobs.slice(0, 2), detail ? 1 : -1, '#2f5a2e', '#6f9a4a', 2, 6.6);
  c.scale(1.1, 0.7, 1.1); c.translate(0, 2, 0);
  return clean([t, c]);
}
function makeChestnut(rnd, detail) {
  const t = trunk(3, 0.5, '#5a4636');
  const blobs = [[0, 5, 0, 3.1], [2.2, 4.5, 0.4, 2.3], [-2.1, 4.6, -0.3, 2.4], [0.3, 6.3, 0, 2.2]];
  return clean([t, blobCanopy(rnd, detail ? blobs : blobs.slice(0, 3), detail ? 1 : -1, '#355e22', '#88a83f', 3.4, 5.0)]);
}
function makeApple(rnd, detail) {
  const t = trunk(1.4, 0.18, '#6b5040');
  const blobs = [[0, 2.3, 0, 1.3], [0.8, 2.1, 0.3, 0.9], [-0.8, 2.2, -0.3, 0.9]];
  const parts = [t, blobCanopy(rnd, detail ? blobs : blobs.slice(0, 1), detail ? 1 : -1, '#3f7a2e', '#8dbb4c', 1.4, 2.3)];
  if (detail) for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 1.1 + (i % 3) * 0.15; const f = new THREE.SphereGeometry(0.09, 5, 4); f.translate(Math.cos(a) * r, 1.8 + (i % 4) * 0.3, Math.sin(a) * r); parts.push(colorize(f.toNonIndexed(), (x, y, z, c) => c.set('#d8342c'))); }
  return clean(parts);
}

function windMaterial(opts = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, ...opts });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = windUniforms.uTime; sh.uniforms.uWind = windUniforms.uWind;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      {
        // transparencia punteada cuando la cámara atraviesa la copa
        float dc = distance(vWPos, cameraPosition);
        float a = smoothstep(2.2, 5.5, dc);
        vec2 fc = floor(mod(gl_FragCoord.xy, 4.0));
        float b = (fc.x * 4.0 + fc.y) / 16.0;
        b = fract(b * 7.0 / 16.0 * 16.0 / 7.0 + fc.x * 0.37 + fc.y * 0.61);
        if (a < 0.999 && a < b) discard;
      }`);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uWind;\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', `#include <project_vertex>
      vWPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      {
        vec3 ip = vec3(instanceMatrix[3][0], 0.0, instanceMatrix[3][2]);
        float ph = ip.x * 0.37 + ip.z * 0.23;
        float k = max(transformed.y - 1.5, 0.0) * 0.018 * uWind;
        transformed.x += (sin(uTime * 1.3 + ph) * 0.7 + sin(uTime * 2.9 + ph * 1.7) * 0.25) * k * transformed.y * 0.35;
        transformed.z += cos(uTime * 1.1 + ph) * 0.5 * k * transformed.y * 0.35;
      }`);
  };
  m.customProgramCacheKey = () => 'wind';
  return m;
}

// ---------- Colocación ----------
const CHUNK = 125;
export const TREES = [];

function treeSpots(rnd) {
  const spots = [];
  const step = 6.5;
  for (let z = -HALF + 4; z < HALF - 4; z += step) for (let x = -HALF + 4; x < HALF - 4; x += step) {
    const X = x + (rnd() - 0.5) * step * 0.9, Z = z + (rnd() - 0.5) * step * 0.9;
    const f = surfAt('forest', X, Z);
    if (f < 0.08 || rnd() > f * 1.1) continue;
    const p = pathQuery(X, Z);
    if (p.d < p.w + 2.2) continue;
    const r = riverInfo(X, Z);
    if (r.edge < 2.5) continue;
    if (surfAt('rock', X, Z) > 0.6 && rnd() < 0.7) continue;
    const irati = iratiMask(X, Z);
    const h = terrainHeight(X, Z);
    // especie: Irati = haya + abeto; laderas medias = roble / haya; alto = abeto/pino
    let type;
    const n = fbm(X / 70 + 20, Z / 70, 2);
    if (TREE_MIX) type = TREE_MIX(X, Z, h, n);
    else if (irati > 0.5) type = n > 0.05 ? 'fir' : 'beech';
    else if (h > 70) type = n > -0.2 ? 'fir' : 'beech';
    else type = n > 0.15 ? 'beech' : n > -0.3 ? 'oak' : 'fir';
    spots.push({ x: X, z: Z, y: h, type, s: 0.75 + rnd() * 0.55, rot: rnd() * Math.PI * 2 });
  }
  const special = SPECIAL_TREES || [];
  for (const [x, z, type, s] of special) spots.push({ x, z, y: terrainHeight(x, z), type, s, rot: rnd() * 6, special: true });
  // árboles sueltos en los linderos de los campos
  for (let k = 0; k < 9000; k++) {
    const x = (rnd() - 0.5) * 2 * (HALF - 20), z = (rnd() - 0.5) * 2 * (HALF - 20);
    const fi = fieldInfo(x, z);
    if (fi.mask < 0.6 || fi.edge > 1.2 || rnd() > 0.12) continue;
    const p = pathQuery(x, z); if (p.d < p.w + 2.5) continue;
    const t = TREE_MIX ? TREE_MIX(x, z, 0, fbm(x / 70 + 20, z / 70, 2)) : (rnd() < 0.7 ? 'oak' : 'beech');
    spots.push({ x, z, y: terrainHeight(x, z), type: t === 'fir' ? 'oak' : t, s: 0.8 + rnd() * 0.5, rot: rnd() * 6.28 });
  }
  // plantaciones: olivares y manzanales en cuadrícula
  for (let z = -HALF + 20; z < HALF - 20; z += 7) for (let x = -HALF + 20; x < HALF - 20; x += 7) {
    const fi = fieldInfo(x, z);
    if (fi.mask < 0.7 || fi.edge < 2.5 || (fi.type !== 6 && fi.type !== 8)) continue;
    const p = pathQuery(x, z); if (p.d < p.w + 2) continue;
    spots.push({ x: x + (rnd() - 0.5), z: z + (rnd() - 0.5), y: terrainHeight(x, z), type: fi.type === 6 ? 'olive' : 'apple', s: 0.7 + rnd() * 0.25, rot: rnd() * 6.28, crop: true });
  }
  return spots.filter(s => s.special || (isFree(s.x, s.z, s.crop ? 1 : 1.6) && villageMask(s.x, s.z) < 0.35));
}

export class Nature {
  constructor(scene, quality) {
    this.quality = quality;
    const rnd = mulberry32(99);
    this.matTree = windMaterial();
    this.group = new THREE.Group();
    const geos = {
      beech: [makeBeech(rnd, true), makeBeech(rnd, false)],
      oak: [makeOak(rnd, true), makeOak(rnd, false)],
      fir: [makeFir(rnd, true), makeFir(rnd, false)],
      olive: [makeOlive(rnd, true), makeOlive(rnd, false)],
      poplar: [makePoplar(rnd, true), makePoplar(rnd, false)],
      pine: [makePine(rnd, true), makePine(rnd, false)],
      chestnut: [makeChestnut(rnd, true), makeChestnut(rnd, false)],
      apple: [makeApple(rnd, true), makeApple(rnd, false)],
    };
    TREES.length = 0;
    let spots = treeSpots(rnd);
    const cap = quality === 'low' ? 2200 : quality === 'mid' ? 3600 : 5200;
    if (spots.length > cap) { const crop = spots.filter(s => s.crop || s.special), rest = spots.filter(s => !s.crop && !s.special); rest.sort(() => rnd() - 0.5); spots = crop.slice(0, cap * 0.4).concat(rest.slice(0, cap - Math.min(crop.length, cap * 0.4))); }
    // agrupar por trozo
    const chunks = new Map();
    for (const s of spots) {
      const key = Math.floor((s.x + HALF) / CHUNK) + ',' + Math.floor((s.z + HALF) / CHUNK);
      if (!chunks.has(key)) chunks.set(key, { list: [], cx: 0, cz: 0 });
      chunks.get(key).list.push(s);
      TREES.push(s);
      addCircle(s.x, s.z, 0.45 * s.s + 0.1, { tree: true });
    }
    this.chunks = [];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (const [key, c] of chunks) {
      const [ci, cj] = key.split(',').map(Number);
      const cx = -HALF + (ci + 0.5) * CHUNK, cz = -HALF + (cj + 0.5) * CHUNK;
      const entry = { cx, cz, hi: [], lo: [] };
      for (const type of Object.keys(geos)) {
        const list = c.list.filter(s => s.type === type);
        if (!list.length) continue;
        for (const lod of [0, 1]) {
          const im = new THREE.InstancedMesh(geos[type][lod], this.matTree, list.length);
          list.forEach((s, i) => {
            e.set((rnd() - 0.5) * 0.06, s.rot, (rnd() - 0.5) * 0.06); q.setFromEuler(e);
            m4.compose(new THREE.Vector3(s.x, s.y - 0.25, s.z), q, new THREE.Vector3(s.s, s.s * (0.9 + rnd() * 0.25), s.s));
            im.setMatrixAt(i, m4);
          });
          im.computeBoundingSphere();
          im.castShadow = lod === 0; im.receiveShadow = lod === 0;
          (lod ? entry.lo : entry.hi).push(im);
          this.group.add(im);
        }
      }
      this.chunks.push(entry);
    }
    this.lodDist = quality === 'low' ? 60 : quality === 'mid' ? 80 : 100;
    this.buildRocks(rnd);
    this.buildBushes(rnd);
    this.buildCrops(rnd, quality);
    scene.add(this.group);
    dataTextures(true);
    this.grass = new GrassField(scene, quality);
    this.flowers = new FlowerField(scene, quality);
  }
  buildCrops(rnd, quality) {
    // viñedos (tipo 5) y huertas (tipo 7) en hileras
    const vine = clean([
      colorize(new THREE.CylinderGeometry(0.05, 0.07, 0.8, 5).translate(0, 0.4, 0), (x, y, z, c) => c.set('#5a4030')),
      blobCanopy(rnd, [[0, 0.95, 0, 0.45], [0.35, 0.85, 0, 0.35], [-0.35, 0.85, 0, 0.35]], -1, '#3f6e2a', '#8fb84a', 0.5, 0.9),
    ]);
    const veg = clean([blobCanopy(rnd, [[0, 0.2, 0, 0.28], [0.15, 0.15, 0.1, 0.2]], -1, '#2f6a2a', '#7fbf4a', 0.3, 0.2)]);
    const vines = [], vegs = [];
    const cap = quality === 'low' ? 2500 : 6000;
    for (let z = -380; z < 380 && vines.length + vegs.length < cap * 2; z += 1.6) for (let x = -380; x < 380; x += 1.6) {
      const fi = fieldInfo(x, z);
      if (fi.mask < 0.6 || fi.edge < 2 || (fi.type !== 5 && fi.type !== 7)) continue;
      const sp = fi.type === 5 ? 2.6 : 1.4;
      const f = ((fi.row / sp) % 1 + 1) % 1;
      if (f > 0.25) continue;
      const p = pathQuery(x, z); if (p.d < p.w + 1) continue;
      (fi.type === 5 ? vines : vegs).push({ x, z, s: 0.8 + rnd() * 0.4 });
    }
    const mat = windMaterial();
    const m4 = new THREE.Matrix4();
    for (const [geo, list] of [[vine, vines.slice(0, cap)], [veg, vegs.slice(0, cap)]]) {
      if (!list.length) continue;
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((o, i) => { m4.compose(new THREE.Vector3(o.x, terrainHeight(o.x, o.z) - 0.05, o.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * 6, 0)), new THREE.Vector3(o.s, o.s, o.s)); im.setMatrixAt(i, m4); });
      im.computeBoundingSphere(); im.receiveShadow = true;
      this.group.add(im);
    }
  }
  buildRocks(rnd) {
    const parts = [];
    for (let i = 0; i < 3; i++) {
      const g = new THREE.DodecahedronGeometry(1, 0); jitter(g, 0.5, rnd); g.scale(1, 0.6, 1);
      const gn = g.toNonIndexed(); gn.computeVertexNormals();
      colorize(gn, (x, y, z, c) => c.set('#8a857a').multiplyScalar(0.8 + y * 0.3 + rnd() * 0.08));
      parts.push(gn);
    }
    const spots = [];
    for (let k = 0; k < 2600; k++) {
      const x = (rnd() - 0.5) * 2 * (HALF - 10), z = (rnd() - 0.5) * 2 * (HALF - 10);
      const rock = surfAt('rock', x, z), r = riverInfo(x, z);
      const nearRiver = r.edge > -r.half * 0.7 && r.edge < 3 && villageMask(x, z) < 0.3;
      if (!(rock > 0.3 || nearRiver || (surfAt('forest', x, z) > 0.4 && rnd() < 0.15))) continue;
      const p = pathQuery(x, z); if (p.d < p.w + 1) continue;
      spots.push({ x, z, s: nearRiver ? 0.4 + rnd() * 0.7 : 0.5 + rnd() * 1.6, v: Math.floor(rnd() * 3) });
    }
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
    for (let v = 0; v < 3; v++) {
      const list = spots.filter(s => s.v === v);
      const im = new THREE.InstancedMesh(parts[v], m, list.length);
      const m4 = new THREE.Matrix4();
      list.forEach((s, i) => {
        m4.compose(new THREE.Vector3(s.x, terrainHeight(s.x, s.z) - s.s * 0.15, s.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * 6, 0)), new THREE.Vector3(s.s * (0.8 + rnd() * 0.5), s.s, s.s));
        im.setMatrixAt(i, m4);
        if (s.s > 1.1) addCircle(s.x, s.z, s.s * 0.8);
      });
      im.castShadow = true; im.receiveShadow = true;
      this.group.add(im);
    }
  }
  buildBushes(rnd) {
    const g = makeBush(rnd);
    // helechos: hojas planas en abanico
    const fronds = [];
    for (let i = 0; i < 7; i++) {
      const p = new THREE.PlaneGeometry(0.35, 1.3, 1, 3);
      const pos = p.attributes.position;
      for (let k = 0; k < pos.count; k++) { const y = pos.getY(k) + 0.65; pos.setXYZ(k, pos.getX(k) * (1 - y / 1.5), y, -y * y * 0.35); }
      p.translate(0, 0, 0.1); p.rotateX(-0.5); p.rotateY(i / 7 * Math.PI * 2 + rnd() * 0.3);
      fronds.push(colorize(p.toNonIndexed(), (x, y, z, c) => c.set('#3d7a2e').lerp(new THREE.Color('#8fc255'), y / 1.3)));
    }
    const fern = mergeGeometries(fronds);
    fern.computeVertexNormals();
    { const n = fern.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, n.getX(i) * 0.3, 1, n.getZ(i) * 0.3); }
    const bushSpots = [], fernSpots = [];
    for (let k = 0; k < 14000; k++) {
      const x = (rnd() - 0.5) * 2 * (HALF - 20), z = (rnd() - 0.5) * 2 * (HALF - 20);
      const fi = fieldInfo(x, z);
      if (fi.mask < 0.5 || fi.edge > 0.9 || rnd() > 0.55) continue;
      const p = pathQuery(x, z); if (p.d < p.w + 1) continue;
      if (!isFree(x, z, 0.8)) continue;
      bushSpots.push({ x, z, s: 0.8 + rnd() * 0.7 });
    }
    for (let k = 0; k < 16000; k++) {
      const x = (rnd() - 0.5) * 2 * (HALF - 10), z = (rnd() - 0.5) * 2 * (HALF - 10);
      const f = surfAt('forest', x, z);
      const p = pathQuery(x, z); if (p.d < p.w + 0.8) continue;
      const r = riverInfo(x, z); if (r.edge < 1) continue;
      if (!isFree(x, z, 0.8)) continue;
      if (f > 0.3 && rnd() < 0.5) fernSpots.push({ x, z, s: 0.7 + rnd() * 0.7 });
      else if ((f > 0.1 || (r.edge < 8 && villageMask(x, z) < 0.3)) && rnd() < 0.25) bushSpots.push({ x, z, s: 0.7 + rnd() * 0.9 });
    }
    const matB = windMaterial();
    const matF = windMaterial({ side: THREE.DoubleSide });
    for (const [geo, list, mat] of [[g, bushSpots, matB], [fern, fernSpots.slice(0, 5000), matF]]) {
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      const m4 = new THREE.Matrix4();
      list.forEach((s, i) => { m4.compose(new THREE.Vector3(s.x, terrainHeight(s.x, s.z) - 0.1, s.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * 6, 0)), new THREE.Vector3(s.s, s.s, s.s)); im.setMatrixAt(i, m4); });
      im.castShadow = false; im.receiveShadow = true;   // matas y helechos: su sombra apenas se ve y duplicaba el coste
      this.group.add(im);
    }
  }
  update(camPos, focus, elapsed, player) {
    windUniforms.uTime.value = elapsed;
    for (const c of this.chunks) {
      const d = Math.max(Math.abs(camPos.x - c.cx), Math.abs(camPos.z - c.cz)) - CHUNK / 2;
      const near = d < this.lodDist;
      for (const m of c.hi) m.visible = near;
      for (const m of c.lo) m.visible = !near;
    }
    this.grass.update(focus, elapsed, player);
    this.flowers.update(focus, elapsed, player);
  }
}

// ---------- Texturas de datos para la GPU ----------
let heightTex = null, grassTex = null;
function dataTextures(force) {
  if (heightTex && !force) return;
  heightTex = new THREE.DataTexture(H, N, N, THREE.RedFormat, THREE.FloatType);
  heightTex.minFilter = heightTex.magFilter = THREE.NearestFilter; heightTex.needsUpdate = true;
  const g = new Uint8Array(N * N * 4);
  for (let k = 0; k < N * N; k++) {
    g[k * 4] = SURF.grass[k];
    g[k * 4 + 1] = SURF.forest[k];
    const x = -HALF + (k % N) * CELL, z = -HALF + Math.floor(k / N) * CELL;
    g[k * 4 + 2] = meadowMask(x, z) * 255;
    g[k * 4 + 3] = SURF.street[k];
  }
  grassTex = new THREE.DataTexture(g, N, N, THREE.RGBAFormat);
  grassTex.minFilter = grassTex.magFilter = THREE.LinearFilter; grassTex.needsUpdate = true;
}

const GRASS_COMMON = `
uniform sampler2D uHeight; uniform sampler2D uMask; uniform vec2 uCenter; uniform float uR; uniform float uTime; uniform vec3 uPlayer; uniform vec3 uTint;
float hAt(vec2 w){
  vec2 f = (w + ${HALF.toFixed(1)}) / ${CELL.toFixed(1)};
  vec2 i = floor(f); vec2 t = f - i;
  float a = texelFetch(uHeight, ivec2(i), 0).r, b = texelFetch(uHeight, ivec2(i) + ivec2(1,0), 0).r;
  float c = texelFetch(uHeight, ivec2(i) + ivec2(0,1), 0).r, d = texelFetch(uHeight, ivec2(i) + ivec2(1,1), 0).r;
  return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
}
vec4 maskAt(vec2 w){ return texture2D(uMask, (w + ${HALF.toFixed(1)}) / ${(HALF * 2).toFixed(1)} * ${((N - 1) / N).toFixed(6)} + ${(0.5 / N).toFixed(6)}); }
`;

class GrassField {
  constructor(scene, quality) {
    dataTextures();
    const count = quality === 'low' ? 42000 : quality === 'mid' ? 70000 : 120000;
    const R = quality === 'low' ? 20 : quality === 'mid' ? 26 : 32;
    // hoja: tira con 3 tramos
    const blade = new THREE.BufferGeometry();
    const pos = [], uv = [];
    const segs = 3;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, w = 0.026 * (1 - t * 0.9);
      pos.push(-w, t, 0, w, t, 0); uv.push(0, t, 1, t);
    }
    const idx = [];
    for (let i = 0; i < segs; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    blade.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    blade.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    blade.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => i % 3 === 1 ? 1 : 0), 3));
    blade.setIndex(idx);
    const g = new THREE.InstancedBufferGeometry();
    g.index = blade.index; g.attributes = blade.attributes;
    const rnd = mulberry32(7);
    const off = new Float32Array(count * 2), rr = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      off[i * 2] = (rnd() * 2 - 1) * R; off[i * 2 + 1] = (rnd() * 2 - 1) * R;
      rr[i * 4] = rnd() * Math.PI * 2; rr[i * 4 + 1] = 0.55 + rnd() * 0.7; rr[i * 4 + 2] = rnd(); rr[i * 4 + 3] = rnd();
    }
    g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 2));
    g.setAttribute('aRnd', new THREE.InstancedBufferAttribute(rr, 4));
    g.instanceCount = count;
    this.uniforms = { uHeight: { value: heightTex }, uMask: { value: grassTex }, uCenter: { value: new THREE.Vector2() }, uR: { value: R }, uTime: windUniforms.uTime, uPlayer: { value: new THREE.Vector3() }, uTint: { value: new THREE.Color(({ dry: '#d8c89a', arid: '#e6c98f', lush: '#e6ffe0' })[TONE] || '#ffffff') } };
    const m = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.uniforms);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
attribute vec2 aOff; attribute vec4 aRnd; varying vec3 vGrassCol; ${GRASS_COMMON}`)
        .replace('#include <beginnormal_vertex>', `vec3 objectNormal = vec3(0.0, 1.0, 0.0);
#ifdef USE_TANGENT
vec3 objectTangent = vec3(1.0,0.0,0.0);
#endif`)
        .replace('#include <begin_vertex>', `
vec2 rel = mod(aOff - uCenter + uR, 2.0 * uR) - uR;
vec2 wp = uCenter + rel;
vec4 mk = maskAt(wp);
float dens = mk.r * (1.0 - mk.g * 0.55);
float fade = 1.0 - smoothstep(uR * 0.72, uR, length(rel));
float keep = step(aRnd.z, dens * 1.15);
float hgt = aRnd.y * (0.3 + mk.b * 0.14 + mk.g * 0.14) * (0.6 + 0.4 * dens) * fade * keep;
float c = cos(aRnd.x), s = sin(aRnd.x);
vec3 transformed = vec3(position.x * c, position.y * hgt, position.x * s);
// brizna curvada hacia un lado, como la hierba de verdad
float lean = (0.18 + 0.3 * aRnd.w) * position.y * position.y * hgt;
transformed.x += -s * lean; transformed.z += c * lean;
// viento y empuje del jugador
float wph = uTime * 1.8 + wp.x * 0.35 + wp.y * 0.25;
float bend = (sin(wph) * 0.18 + sin(wph * 2.3 + aRnd.w * 6.0) * 0.07) * position.y * position.y;
vec2 away = wp - uPlayer.xz; float pd = length(away);
vec2 push = pd < 1.3 ? normalize(away + 1e-4) * (1.3 - pd) * 0.7 : vec2(0.0);
transformed.x += (bend + push.x) * hgt; transformed.z += (bend * 0.6 + push.y) * hgt;
transformed.y -= length(push) * position.y * hgt * 0.4;
transformed += vec3(wp.x, hAt(wp) - 0.02, wp.y);
// manchas de color: zonas de puntas secas y zonas de verde intenso; base oscura para dar profundidad
float pn = sin(wp.x * 0.21 + sin(wp.y * 0.17) * 2.0) * sin(wp.y * 0.19 + sin(wp.x * 0.13) * 2.0);
// colores en espacio lineal (el renderizador los pasa a sRGB)
vec3 base = mix(vec3(0.022, 0.084, 0.007), vec3(0.047, 0.133, 0.01), aRnd.w);
vec3 tip = mix(vec3(0.17, 0.42, 0.04), vec3(0.26, 0.48, 0.055), aRnd.z * aRnd.w);
tip = mix(tip, vec3(0.5, 0.45, 0.12), smoothstep(0.3, 0.75, pn) * 0.45 * step(0.55, aRnd.w));
tip = mix(tip, vec3(0.073, 0.26, 0.022), smoothstep(-0.3, -0.7, pn) * 0.6);
tip = mix(tip, vec3(0.147, 0.32, 0.04), mk.g);
tip *= 0.85 + 0.3 * fract(aRnd.x * 3.7);
vGrassCol = mix(base, tip, pow(position.y, 0.75)) * uTint;
`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vGrassCol;')
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = vGrassCol;')
        .replace('#include <normal_fragment_begin>', 'float faceDirection = 1.0;\nvec3 normal = normalize( vNormal );\nvec3 nonPerturbedNormal = normal;');
    };
    m.customProgramCacheKey = () => 'grass';
    this.mesh = new THREE.Mesh(g, m);
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);
  }
  update(focus, elapsed, player) {
    this.uniforms.uCenter.value.set(focus.x, focus.z);
    if (player) this.uniforms.uPlayer.value.copy(player);
  }
}

class FlowerField {
  constructor(scene, quality) {
    dataTextures();
    const count = quality === 'low' ? 1800 : quality === 'mid' ? 3000 : 4500;
    const R = quality === 'low' ? 22 : 30;
    // flor: 5 pétalos planos + centro
    const parts = [];
    for (let i = 0; i < 5; i++) {
      const p = new THREE.CircleGeometry(0.055, 5); p.scale(1, 1.8, 1); p.translate(0, 0.07, 0); p.rotateX(-Math.PI / 2); p.rotateY(i / 5 * Math.PI * 2);
      parts.push(colorize(p.toNonIndexed(), (x, y, z, c) => c.setRGB(1, 1, 1)));
    }
    const center = new THREE.CircleGeometry(0.03, 6); center.rotateX(-Math.PI / 2); center.translate(0, 0.004, 0);
    parts.push(colorize(center.toNonIndexed(), (x, y, z, c) => c.setRGB(1.0, 0.8, 0.1)));
    const stem = new THREE.PlaneGeometry(0.015, 0.3); stem.translate(0, -0.15, 0);
    parts.push(colorize(stem.toNonIndexed(), (x, y, z, c) => c.setRGB(0.25, 0.5, 0.15)));
    const flower = mergeGeometries(parts.map(g => { g.deleteAttribute('uv'); return g; }));
    flower.translate(0, 0.3, 0);
    const g = new THREE.InstancedBufferGeometry();
    g.attributes = flower.attributes;
    const rnd = mulberry32(17);
    const off = new Float32Array(count * 2), rr = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) { off[i * 2] = (rnd() * 2 - 1) * R; off[i * 2 + 1] = (rnd() * 2 - 1) * R; rr[i * 4] = rnd() * 6.28; rr[i * 4 + 1] = 0.7 + rnd() * 0.6; rr[i * 4 + 2] = rnd(); rr[i * 4 + 3] = rnd(); }
    g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 2));
    g.setAttribute('aRnd', new THREE.InstancedBufferAttribute(rr, 4));
    g.instanceCount = count;
    this.uniforms = { uHeight: { value: heightTex }, uMask: { value: grassTex }, uCenter: { value: new THREE.Vector2() }, uR: { value: R }, uTime: windUniforms.uTime, uPlayer: { value: new THREE.Vector3() }, uTint: { value: new THREE.Color(({ dry: '#d8c89a', arid: '#e6c98f', lush: '#e6ffe0' })[TONE] || '#ffffff') } };
    const m = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.uniforms);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
attribute vec2 aOff; attribute vec4 aRnd; varying vec3 vTint; ${GRASS_COMMON}`)
        .replace('#include <begin_vertex>', `
vec2 rel = mod(aOff - uCenter + uR, 2.0 * uR) - uR;
vec2 wp = uCenter + rel;
vec4 mk = maskAt(wp);
float dens = mk.r * (0.22 + mk.b * 0.45) * (1.0 - mk.g);
float fade = 1.0 - smoothstep(uR * 0.75, uR, length(rel));
float keep = step(aRnd.z, dens * 0.6);
float sc = aRnd.y * fade * keep;
float c = cos(aRnd.x), s = sin(aRnd.x);
vec3 transformed = vec3(position.x * c - position.z * s, position.y, position.x * s + position.z * c) * sc;
float wph = uTime * 1.8 + wp.x * 0.35 + wp.y * 0.25;
transformed.x += sin(wph) * 0.05 * position.y * sc;
transformed += vec3(wp.x, hAt(wp) - 0.02, wp.y);
float k = aRnd.w;
vTint = k < 0.4 ? vec3(1.0, 1.0, 0.97) : k < 0.62 ? vec3(1.0, 0.85, 0.2) : k < 0.8 ? vec3(0.66, 0.45, 0.95) : k < 0.92 ? vec3(0.95, 0.25, 0.25) : vec3(0.45, 0.6, 1.0);
`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vTint;')
        .replace('#include <color_fragment>', '#include <color_fragment>\nif (vColor.r > 0.99 && vColor.g > 0.99) diffuseColor.rgb = vTint;')
        .replace('#include <normal_fragment_begin>', 'float faceDirection = 1.0;\nvec3 normal = normalize( vNormal );\nvec3 nonPerturbedNormal = normal;');
    };
    m.customProgramCacheKey = () => 'flowers';
    this.mesh = new THREE.Mesh(g, m);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }
  update(focus) { this.uniforms.uCenter.value.set(focus.x, focus.z); }
}

// Constructores de árboles para escenas fuera de la partida (inicio, fondos)
export const TREE_MAKERS = { beech: makeBeech, oak: makeOak, fir: makeFir, bush: makeBush, olive: makeOlive, poplar: makePoplar, pine: makePine, chestnut: makeChestnut, apple: makeApple };
// Quita la hierba (y la trama del suelo) de un rectángulo girado: canchas, frontones…
export function clearGrass(cx, cz, w, d, ry) {
  if (!grassTex) return;
  const c = Math.cos(ry), s = Math.sin(ry), data = grassTex.image.data;
  for (let u = -w / 2 - 2; u <= w / 2 + 2; u += CELL / 2) for (let v = -2; v <= d + 2; v += CELL / 2) {
    const x = cx + u * c + v * s, z = cz - u * s + v * c;
    const i = Math.round((x + HALF) / CELL), j = Math.round((z + HALF) / CELL);
    if (i < 0 || j < 0 || i >= N || j >= N) continue;
    const k = j * N + i; data[k * 4] = 0; data[k * 4 + 2] = 0; SURF.grass[k] = 0;
  }
  grassTex.needsUpdate = true;
}
