import * as THREE from 'three';
import { HALF, CELL, N, finalHeight, riverInfo, iratiMask, meadowMask, valleyFloor } from './layout.js';
import { ridged } from '../util/noise.js';
import { H, SURF } from './heightfield.js';
import { TEX } from './textures.js';
import { fbm } from '../util/noise.js';
import { clamp, lerp, smoothstep } from '../util/math.js';

const CH = 100;                  // tamaño de trozo en metros
const PER = CH / CELL;           // celdas por trozo

const C = (h) => new THREE.Color(h);
const PAL = {
  grassA: C('#57903a'), grassB: C('#86ab4a'), grassDry: C('#a9a65a'), meadow: C('#78b043'),
  forest: C('#46642b'), litter: C('#6d5230'), gravel: C('#9a917c'), mud: C('#6b6150'),
  rock: C('#8b877c'), rockDark: C('#6a655c'), snow: C('#f1f4f7'), street: C('#ffffff'), dirt: C('#ffffff'),
};

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

export function makeTerrainMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.tDetail = { value: TEX.detail };
    sh.uniforms.tCobble = { value: TEX.cobble.map };
    sh.uniforms.tCobbleN = { value: TEX.cobble.normalMap };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aSurf;\nvarying vec4 vSurf;\nvarying vec3 vWP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvSurf = aSurf;\nvWP = (modelMatrix * vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D tDetail; uniform sampler2D tCobble; uniform sampler2D tCobbleN;
varying vec4 vSurf; varying vec3 vWP;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec3 d1 = texture2D(tDetail, vWP.xz / 11.0).rgb;
  vec3 d2 = texture2D(tDetail, vWP.xz / 2.3).rgb;
  float big = texture2D(tDetail, vWP.xz / 70.0).r;
  diffuseColor.rgb *= 0.78 + 0.44 * d1.r;
  diffuseColor.rgb *= 0.9 + 0.2 * d2.g;
  diffuseColor.rgb *= 0.88 + 0.24 * big;
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
  return m;
}

export class Terrain {
  constructor(scene, quality) {
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
      c.set('#3f6a2e').lerp(new THREE.Color('#2f5227'), n1);
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
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: false }));
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
