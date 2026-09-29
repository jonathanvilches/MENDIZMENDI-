import * as THREE from 'three';
import { HALF, CELL, N, finalHeight, riverInfo, iratiMask, meadowMask, valleyFloor, fieldInfo, TONE } from './layout.js';
import { ridged } from '../util/noise.js';
import { H, SURF } from './heightfield.js';
import { TEX } from './textures.js';
import { fbm } from '../util/noise.js';
import { clamp, lerp, smoothstep } from '../util/math.js';

const CH = 100;                  // tamaño de trozo en metros
const PER = CH / CELL;           // celdas por trozo

const C = (h) => new THREE.Color(h);
const BASE = {
  grassA: '#57903a', grassB: '#86ab4a', grassDry: '#a9a65a', meadow: '#78b043',
  forest: '#46642b', litter: '#6d5230', gravel: '#9a917c', mud: '#6b6150',
  rock: '#8b877c', rockDark: '#6a655c', snow: '#f1f4f7', street: '#ffffff', dirt: '#ffffff',
  hay: '#a4ab58', cut: '#b3b06a', cut2: '#a2a45e', soil: '#7a5b3c', crop: '#5d8a3a', lush: '#4c8a33',
  vine: '#8a6f4c', olive: '#a08a60', huerta: '#5a4330', huertaG: '#4f8a35',
};
const TONES = {
  alpine: {},
  lush: { grassA: '#4f9438', grassB: '#7fb04a', grassDry: '#94a654', meadow: '#6cb543', lush: '#3f8a2f' },
  dry: { grassA: '#7f9a45', grassB: '#b0ad5c', grassDry: '#c9b56a', meadow: '#8fae4a', hay: '#c7b464', cut: '#d6c07a', cut2: '#c9ad62', soil: '#8a6a45', rock: '#a39880', rockDark: '#857a66', forest: '#4f6a30' },
  arid: { grassA: '#a59a5e', grassB: '#c4b073', grassDry: '#d6c38a', meadow: '#98a353', hay: '#d0bb70', cut: '#decb8c', cut2: '#cfb876', soil: '#9b7a50', rock: '#c2ab82', rockDark: '#a58c66', gravel: '#b7a88a', forest: '#5d6e3a', snow: '#e9d9b8' },
};
let PAL = {};
function setPalette(tone) { PAL = {}; const t = { ...BASE, ...(TONES[tone] || {}) }; for (const k in t) PAL[k] = C(t[k]); }
setPalette('alpine');

function vertexColor(i, j, out) {
  const k = j * N + i;
  const x = -HALF + i * CELL, z = -HALF + j * CELL;
  const h = H[k];
  const n = fbm(x / 55, z / 55, 3) * 0.5 + 0.5;
  const n2 = fbm(x / 13 + 5, z / 13, 2) * 0.5 + 0.5;
  out.copy(PAL.grassA).lerp(PAL.grassB, n);
  out.lerp(PAL.grassDry, smoothstep(0.62, 0.9, n2) * 0.35);
  const mm = meadowMask(x, z);
  if (mm > 0) out.lerp(PAL.meadow, mm * 0.5);
  const fi = fieldInfo(x, z);
  if (fi.mask > 0 && fi.edge > 0.8) {
    const t = fi.type, m = fi.mask;
    if (t === 1) out.lerp(PAL.hay, 0.55 * m);
    else if (t === 2) out.lerp(fi.stripe > 0 ? PAL.cut : PAL.cut2, 0.8 * m);
    else if (t === 3) out.lerp(fi.stripe > 0.2 ? PAL.soil : PAL.crop, 0.85 * m);
    else if (t === 4) out.lerp(PAL.lush, 0.6 * m);
    else if (t === 5) out.lerp(PAL.vine, 0.75 * m);
    else if (t === 6) out.lerp(PAL.olive, 0.7 * m);
    else if (t === 7) out.lerp(fi.stripe > 0.3 ? PAL.huertaG : PAL.huerta, 0.85 * m);
    else if (t === 8) out.lerp(PAL.lush, 0.4 * m);
  }
  const forest = SURF.forest[k] / 255;
  if (forest > 0) { out.lerp(PAL.forest, forest * 0.75); out.lerp(PAL.litter, forest * smoothstep(0.3, 0.8, n2) * 0.5); }
  const r = riverInfo(x, z);
  const wet = 1 - smoothstep(-0.5, 2.5, r.edge);
  if (wet > 0) out.lerp(PAL.gravel, wet);
  if (r.edge < -0.2) out.lerp(PAL.mud, 0.6);
  const rock = SURF.rock[k] / 255;
  if (rock > 0) out.lerp(n2 > 0.5 ? PAL.rock : PAL.rockDark, rock);
  const snow = smoothstep(128, 150, h + n * 14);
  if (snow > 0) out.lerp(PAL.snow, snow);
  const s = SURF.street[k] / 255, d = SURF.dirt[k] / 255;
  if (s > 0) out.lerp(PAL.street, s);
  if (d > 0) out.lerp(PAL.dirt, d);
  return out;
}

function normalAt(i, j, out) {
  const i0 = Math.max(0, i - 1), i1 = Math.min(N - 1, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(N - 1, j + 1);
  const dx = (H[j * N + i1] - H[j * N + i0]) / ((i1 - i0) * CELL);
  const dz = (H[j1 * N + i] - H[j0 * N + i]) / ((j1 - j0) * CELL);
  return out.set(-dx, 1, -dz).normalize();
}

function buildChunk(ci, cj, step) {
  const n = PER / step + 1;
  const pos = [], nor = [], col = [], surf = [], idx = [];
  const c = new THREE.Color(), v = new THREE.Vector3();
  const I0 = ci * PER, J0 = cj * PER;
  for (let b = 0; b < n; b++) for (let a = 0; a < n; a++) {
    const i = I0 + a * step, j = J0 + b * step, k = j * N + i;
    pos.push(-HALF + i * CELL, H[k], -HALF + j * CELL);
    normalAt(i, j, v); nor.push(v.x, v.y, v.z);
    vertexColor(i, j, c); col.push(c.r, c.g, c.b);
    surf.push(SURF.street[k] / 255, SURF.dirt[k] / 255, SURF.rock[k] / 255, SURF.forest[k] / 255);
  }
  for (let b = 0; b < n - 1; b++) for (let a = 0; a < n - 1; a++) {
    const A = b * n + a, B = A + 1, Cc = A + n, D = Cc + 1;
    idx.push(A, Cc, B, B, Cc, D);
  }
  // faldones para tapar grietas entre niveles de detalle
  const border = [];
  for (let a = 0; a < n; a++) border.push(a);
  for (let b = 1; b < n; b++) border.push(b * n + n - 1);
  for (let a = n - 2; a >= 0; a--) border.push((n - 1) * n + a);
  for (let b = n - 2; b > 0; b--) border.push(b * n);
  border.push(0);
  const base = pos.length / 3;
  for (let q = 0; q < border.length; q++) {
    const s = border[q];
    pos.push(pos[s * 3], pos[s * 3 + 1] - 3, pos[s * 3 + 2]);
    nor.push(nor[s * 3], nor[s * 3 + 1], nor[s * 3 + 2]);
    col.push(col[s * 3], col[s * 3 + 1], col[s * 3 + 2]);
    surf.push(surf[s * 4], surf[s * 4 + 1], surf[s * 4 + 2], surf[s * 4 + 3]);
  }
  for (let q = 0; q < border.length - 1; q++) {
    const a = border[q], b = border[q + 1], a2 = base + q, b2 = base + q + 1;
    idx.push(a, a2, b, b, a2, b2, a, b, a2, b, b2, a2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aSurf', new THREE.Float32BufferAttribute(surf, 4));
  g.setIndex(idx);
  g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}

export function makeTerrainMaterial({ outer = false } = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  const rockCol = (PAL.rock || C('#8b877c')).clone();
  m.onBeforeCompile = (sh) => {
    sh.uniforms.tDetail = { value: TEX.detail };
    sh.uniforms.tGrass = { value: TEX.grass };
    sh.uniforms.tRock = { value: TEX.rock };
    sh.uniforms.tCobble = { value: TEX.cobble.map };
    sh.uniforms.tCobbleN = { value: TEX.cobble.normalMap };
    sh.uniforms.uRock = { value: rockCol };
    sh.uniforms.uRockSlope = { value: new THREE.Vector2(...(({ alpine: [0.3, 0.44], dry: [0.36, 0.5], arid: [0.33, 0.47] })[TONE] || [0.46, 0.62])) };
    sh.defines = sh.defines || {};
    if (outer) sh.defines.OUTER = 1;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aSurf;\nvarying vec4 vSurf;\nvarying vec3 vWP;\nvarying vec3 vNW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvSurf = aSurf;\nvWP = (modelMatrix * vec4(transformed,1.0)).xyz;\nvNW = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D tDetail; uniform sampler2D tGrass; uniform sampler2D tRock; uniform sampler2D tCobble; uniform sampler2D tCobbleN; uniform vec3 uRock; uniform vec2 uRockSlope;
varying vec4 vSurf; varying vec3 vWP; varying vec3 vNW;
vec4 triRock(vec3 p, vec3 bw, float s) { return texture2D(tRock, p.zy / s) * bw.x + texture2D(tRock, p.xz / s) * bw.y + texture2D(tRock, p.xy / s) * bw.z; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec3 nw = normalize(vNW);
  float slope = 1.0 - nw.y;                       // 0 llano · 0.29 a 45°
  vec3 d1 = texture2D(tDetail, vWP.xz / 11.0).rgb;
  vec3 d2 = texture2D(tDetail, vWP.xz / 2.3).rgb;
  float big = texture2D(tDetail, vWP.xz / 70.0).r;
  float huge = texture2D(tDetail, vWP.xz / 260.0).r;
  vec3 base = diffuseColor.rgb;
  // campos, grava, nieve…: detalle suave como antes
  vec3 soft = base * (0.78 + 0.44 * d1.r) * (0.9 + 0.2 * d2.g) * (0.88 + 0.24 * big);
  // hierba: briznas a dos escalas, manchas de color, tréboles y florecillas
  float grassy = smoothstep(0.04, 0.12, base.g - max(base.r, base.b)) * (1.0 - vSurf.z);
  vec4 g1 = texture2D(tGrass, vWP.xz / 1.8);
  vec4 g2 = texture2D(tGrass, vWP.xz / 0.63 + 0.37);
  float blades = mix(g1.r, g2.r, 0.45);
  vec3 gc = base * (0.5 + 0.72 * blades) * (0.8 + 0.34 * d1.r) * (0.84 + 0.3 * d2.g) * (0.86 + 0.28 * big);
  gc = mix(vec3(dot(gc, vec3(0.3, 0.59, 0.11))), gc, 1.3) * 0.92;
  gc = mix(gc, gc * vec3(0.84, 1.03, 0.92), smoothstep(0.55, 0.78, huge) * 0.7);
  gc *= vec3(0.78, 0.94, 0.7);                                   // suelo algo más oscuro y verde que las briznas
  gc = mix(gc, base * vec3(0.72, 1.02, 0.78), g1.g * 0.5);
  float fl = max(g1.b, g2.b * 0.8) * smoothstep(0.35, 0.65, d1.g) * (1.0 - vSurf.w) * (1.0 - smoothstep(0.12, 0.25, slope));
  vec3 fc = big > 0.62 ? vec3(1.0, 0.97, 0.92) : big > 0.4 ? vec3(1.0, 0.84, 0.22) : vec3(0.86, 0.6, 0.9);
  gc = mix(gc, fc * (0.75 + 0.25 * g1.b), fl * 0.9);
  vec3 col = mix(soft, gc, grassy);
  // roca en las laderas (proyección triplanar: no se estira en los cortados)
  vec3 bw = pow(abs(nw), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
  vec4 rk = triRock(vWP, bw, 9.0);
#ifdef OUTER
  vec4 rk2 = triRock(vWP, bw, 41.0);
#else
  vec4 rk2 = triRock(vWP, bw, 2.6);
#endif
  float rockM = max(vSurf.z, smoothstep(uRockSlope.x, uRockSlope.y, slope + (d1.g - 0.5) * 0.18)) * (1.0 - vSurf.x);
  vec3 rc = uRock * vec3(1.02, 0.98, 0.92) * (0.3 + 0.95 * rk.r) * (0.72 + 0.5 * rk2.r) * (0.85 + 0.3 * big);
  rc = mix(rc, uRock * vec3(0.86, 0.98, 0.68) * 0.85, rk.g * 0.45);
  rc *= 0.5 + 0.5 * rk.b;
  float scree = smoothstep(uRockSlope.x - 0.13, uRockSlope.x, slope) * (1.0 - rockM) * (1.0 - vSurf.x);
  col = mix(col, uRock * (0.62 + 0.45 * d2.b + 0.3 * d2.g), scree * 0.45);
  col = mix(col, rc, rockM);
#ifdef OUTER
  // montañas lejanas: manchas de bosque y prados
  float fo = smoothstep(0.48, 0.6, texture2D(tDetail, vWP.xz / 190.0).r) * (1.0 - rockM) * (1.0 - smoothstep(170.0, 215.0, vWP.y));
  col = mix(col, vec3(0.13, 0.24, 0.1) * (0.8 + 0.4 * d1.r), fo * 0.75);
#endif
  diffuseColor.rgb = col;
  // tierra y senderos
  vec3 dirt = vec3(0.56, 0.44, 0.30) * (0.8 + 0.35 * d2.g) * (0.85 + 0.3 * d1.r);
  dirt = mix(dirt, vec3(0.72, 0.68, 0.6), smoothstep(0.55, 0.8, d2.b) * 0.8);
  float dm = smoothstep(0.1, 0.9, vSurf.y + (d1.g - 0.5) * 0.5);
  diffuseColor.rgb = mix(diffuseColor.rgb, dirt, dm);
  // empedrado
  vec3 cob = texture2D(tCobble, vWP.xz / 2.4).rgb * 1.05;
  float sm = smoothstep(0.15, 0.85, vSurf.x + (d1.g - 0.5) * 0.4);
  diffuseColor.rgb = mix(diffuseColor.rgb, cob, sm);
}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  float sm = smoothstep(0.15, 0.85, vSurf.x);
  if (sm > 0.01) {
    vec3 tn = texture2D(tCobbleN, vWP.xz / 2.4).xyz * 2.0 - 1.0;
    vec3 nw = normalize(vec3(tn.x, tn.z, -tn.y));
    vec3 nv = normalize((viewMatrix * vec4(nw, 0.0)).xyz);
    vec3 up = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
    normal = normalize(mix(normal, normalize(normal + (nv - up) * 0.9), sm));
  }
}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, 0.8, smoothstep(0.2,0.9,vSurf.x));`);
  };
  m.customProgramCacheKey = () => (outer ? 'terrain-outer' : 'terrain');
  return m;
}

export class Terrain {
  constructor(scene, quality) {
    setPalette(TONE);
    this.group = new THREE.Group();
    this.mat = makeTerrainMaterial();
    this.chunks = [];
    const nc = (N - 1) / PER;
    for (let cj = 0; cj < nc; cj++) for (let ci = 0; ci < nc; ci++) {
      const hi = new THREE.Mesh(buildChunk(ci, cj, 1), this.mat);
      const lo = new THREE.Mesh(buildChunk(ci, cj, quality === 'low' ? 5 : 5), this.mat);
      hi.receiveShadow = lo.receiveShadow = true;
      hi.matrixAutoUpdate = lo.matrixAutoUpdate = false;
      const cx = -HALF + (ci + 0.5) * CH, cz = -HALF + (cj + 0.5) * CH;
      this.group.add(hi, lo);
      this.chunks.push({ hi, lo, cx, cz });
    }
    this.lodDist = quality === 'low' ? 110 : quality === 'mid' ? 140 : 170;
    scene.add(this.group);
    this.buildOuter(scene);
  }
  update(camPos) {
    for (const c of this.chunks) {
      const d = Math.max(Math.abs(camPos.x - c.cx), Math.abs(camPos.z - c.cz)) - CH / 2;
      const near = d < this.lodDist;
      c.hi.visible = near; c.lo.visible = !near;
    }
  }
  buildOuter(scene) {
    // Anillo de montañas lejanas fuera del área jugable
    const R = 1500, step = 25, n = Math.round(2 * R / step) + 1;
    const pos = [], col = [], idx = [];
    const c = new THREE.Color();
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = -R + i * step, z = -R + j * step;
      const inside = Math.abs(x) < HALF - 10 && Math.abs(z) < HALF - 10;
      let h = inside ? -30 : outerHeight(x, z);
      const r4 = Math.pow(x ** 4 + z ** 4, 0.25);
      h += smoothstep(600, 1300, r4) * (120 + 160 * (fbm(x / 400, z / 400, 3) * 0.5 + 0.5));
      pos.push(x, h, z);
      const n1 = fbm(x / 90, z / 90, 2) * 0.5 + 0.5;
      c.set('#4d7a36').lerp(new THREE.Color('#35592a'), n1);
      c.lerp(new THREE.Color('#8a8578'), smoothstep(150, 210, h + n1 * 30));
      c.lerp(new THREE.Color('#f4f6f8'), smoothstep(215, 260, h + n1 * 40));
      col.push(c.r, c.g, c.b);
    }
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const x = -R + i * step, z = -R + j * step;
      if (x >= -HALF + 20 && x + step <= HALF - 20 && z >= -HALF + 20 && z + step <= HALF - 20) continue;
      const A = j * n + i, B = A + 1, Cc = A + n, D = Cc + 1;
      idx.push(A, Cc, B, B, Cc, D);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aSurf', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 4), 4));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, makeTerrainMaterial({ outer: true }));
    m.position.y = -0.8; // ligeramente por debajo para evitar parpadeos en la unión
    scene.add(m);
    this.outer = m;
  }
}

// Relieve exterior sin cauces (el río se pierde entre montañas lejanas)
function outerHeight(x, z) {
  const r4 = Math.pow(x ** 4 + z ** 4, 0.25);
  const base = finalHeight(x, z, null).h;
  const fill = valleyFloor(x, z) + 40 + 90 * smoothstep(480, 700, r4) + 60 * ridged(x / 200, z / 200, 3);
  return Math.max(base, lerp(base, fill, smoothstep(470, 560, r4)));
}
