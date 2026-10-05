import { snowable } from './weather.js';
import * as THREE from 'three';
import { HALF, CELL, N, finalHeight, riverInfo, meadowMask, valleyFloor, fieldInfo, TONE, skyTan } from './layout.js';
import { ridged } from '../util/noise.js';
import { H, SURF } from './heightfield.js';
import { TEX } from './textures.js';
import { fbm } from '../util/noise.js';
import { lerp, smoothstep } from '../util/math.js';

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
  dry: { grassA: '#6c9840', grassB: '#98a852', grassDry: '#bcae62', meadow: '#7aac46', hay: '#c7b464', cut: '#d6c07a', cut2: '#c9ad62', soil: '#8a6a45', rock: '#a39880', rockDark: '#857a66', forest: '#4f6a30' },
  arid: { grassA: '#8f9a52', grassB: '#b2ac68', grassDry: '#d6c38a', meadow: '#98a353', hay: '#d0bb70', cut: '#decb8c', cut2: '#cfb876', soil: '#9b7a50', rock: '#c2ab82', rockDark: '#a58c66', gravel: '#b7a88a', forest: '#5d6e3a', snow: '#e9d9b8' },
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
  // nieve en lo alto solo en el Pirineo (en la Ribera, «nieve» es el yeso claro de las cimas); en los montes atlánticos y
  // de la Navarra media las cumbres son de pasto y helecho
  const snow = TONE === 'lush' || TONE === 'dry' ? 0 : smoothstep(128, 150, h + n * 14);
  if (snow > 0) out.lerp(PAL.snow, snow);
  else if (TONE === 'lush') out.lerp(PAL.grassDry, smoothstep(128, 150, h + n * 14) * 0.5 * (1 - rock));
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

export function makeTerrainMaterial({ outer = false, quality = 'high' } = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  queueMicrotask(() => snowable(m, 0.85));   // nieve en el suelo (después del sombreador del terreno)
  const rockCol = (PAL.rock || C('#8b877c')).clone();
  m.onBeforeCompile = (sh) => {
    sh.uniforms.tDetail = { value: TEX.detail };
    sh.uniforms.tGrass = { value: TEX.grass };
    sh.uniforms.tRock = { value: TEX.rock };
    sh.uniforms.tRockN = { value: TEX.rockN };
    sh.uniforms.tCobble = { value: TEX.cobble.map };
    sh.uniforms.tCobbleN = { value: TEX.cobble.normalMap };
    sh.uniforms.uRock = { value: rockCol };
    sh.uniforms.uSnowY = { value: TONE === 'alpine' ? 212 : 1e5 };   // cota de la nieve perpetua (solo en el Pirineo)
    sh.uniforms.uRockSlope = { value: new THREE.Vector2(...(({ alpine: [0.3, 0.44], dry: [0.36, 0.5], arid: [0.33, 0.47] })[TONE] || [0.46, 0.62])) };
    sh.defines = sh.defines || {};
    if (outer) sh.defines.OUTER = 1;
    if (quality === 'low') sh.defines.LOWQ = 1;   // móvil: menos lecturas de textura por píxel
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aSurf;\nvarying vec4 vSurf;\nvarying vec3 vWP;\nvarying vec3 vNW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvSurf = aSurf;\nvWP = (modelMatrix * vec4(transformed,1.0)).xyz;\nvNW = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D tDetail; uniform sampler2D tGrass; uniform sampler2D tRock; uniform sampler2D tRockN; uniform sampler2D tCobble; uniform sampler2D tCobbleN; uniform vec3 uRock; uniform vec2 uRockSlope; uniform float uSnowY;
varying vec4 vSurf; varying vec3 vWP; varying vec3 vNW;
vec4 triRock(vec3 p, vec3 bw, float s) { return texture2D(tRock, p.zy / s) * bw.x + texture2D(tRock, p.xz / s) * bw.y + texture2D(tRock, p.xy / s) * bw.z; }
#ifdef OUTER
#define ROCK_S1 26.0
#define ROCK_S2 8.0
#else
#define ROCK_S1 9.0
#define ROCK_S2 2.6
#endif`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec3 nw = normalize(vNW);
  float slope = 1.0 - nw.y;                       // 0 llano · 0.29 a 45°
  vec3 d1 = texture2D(tDetail, vWP.xz / 11.0).rgb;
  vec3 d2 = texture2D(tDetail, vWP.xz / 2.3).rgb;
#ifdef LOWQ
  // móvil: las manchas grandes y las enormes salen del mismo texel (otro canal): una lectura menos por píxel
  vec2 bh = texture2D(tDetail, vWP.xz / 70.0).rb;
  float big = bh.x, huge = bh.y;
#else
  float big = texture2D(tDetail, vWP.xz / 70.0).r;
  float huge = texture2D(tDetail, vWP.xz / 260.0).r;
#endif
  vec3 base = diffuseColor.rgb;
  // campos, grava, nieve…: detalle suave como antes
  vec3 soft = base * (0.78 + 0.44 * d1.r) * (0.9 + 0.2 * d2.g) * (0.88 + 0.24 * big);
  // hierba: briznas a dos escalas, manchas de color, tréboles y florecillas
  float grassy = smoothstep(0.015, 0.07, base.g - max(base.r, base.b)) * (1.0 - vSurf.z);
  vec4 g1 = texture2D(tGrass, vWP.xz / 1.3);
#ifdef LOWQ
  // móvil: la escala más fina de briznas y las matas salen de lecturas que ya están hechas (dos lecturas menos por píxel)
  vec4 g2 = vec4(g1.rg, 0.0, 1.0);
  float blades = g1.r;
  float clump = d2.r;
#else
  vec4 g2 = texture2D(tGrass, vWP.xz / 0.47 + 0.37);
  float blades = mix(g1.r, g2.r, 0.45);
  float clump = texture2D(tDetail, vWP.xz / 4.1 + 0.3).r;        // matas a escala de un par de metros
#endif
  vec3 gc = base * (0.56 + 0.62 * blades) * (0.82 + 0.3 * d1.r) * (0.86 + 0.26 * d2.g) * (0.84 + 0.3 * big);
  gc = mix(vec3(dot(gc, vec3(0.3, 0.59, 0.11))), gc, 0.9) * 0.93;   // verde natural, no lima
  gc = mix(gc, gc * vec3(1.1, 1.0, 0.7), smoothstep(0.56, 0.82, huge) * 0.55);   // rodales secos, amarillentos
  gc = mix(gc, gc * vec3(0.76, 0.94, 0.88), smoothstep(0.44, 0.18, huge) * 0.5);  // hondonadas más frescas
  gc = mix(gc, gc * vec3(1.06, 1.02, 0.8), smoothstep(0.62, 0.85, d1.g) * 0.3);
  gc *= 0.84 + 0.26 * smoothstep(0.25, 0.75, clump);
  gc *= vec3(0.8, 0.93, 0.74);                                   // suelo algo más oscuro y verde que las briznas
  gc = mix(gc, base * vec3(0.66, 0.95, 0.72), g1.g * 0.45);
  float fl = max(g1.b, g2.b * 0.8) * smoothstep(0.35, 0.65, d1.g) * (1.0 - vSurf.w) * (1.0 - smoothstep(0.12, 0.25, slope));
  vec3 fc = big > 0.62 ? vec3(1.0, 0.97, 0.92) : big > 0.4 ? vec3(1.0, 0.84, 0.22) : vec3(0.86, 0.6, 0.9);
  gc = mix(gc, fc * (0.75 + 0.25 * g1.b), fl * 0.9);
  // bajo la hierba en 3D el suelo es la sombra de las matas: verde oliva oscuro como el pie de las briznas
  vec3 col = mix(soft, gc, grassy);
  // roca en las laderas (proyección triplanar: no se estira en los cortados). Solo donde la hay: en los prados y las
  // calles se salta entera (eran seis lecturas de textura por píxel aunque no se viera roca)
  float rockM = max(vSurf.z, smoothstep(uRockSlope.x, uRockSlope.y, slope + (d1.g - 0.5) * 0.18)) * (1.0 - vSurf.x);
  float scree = smoothstep(uRockSlope.x - 0.13, uRockSlope.x, slope) * (1.0 - rockM) * (1.0 - vSurf.x);
  col = mix(col, uRock * (0.62 + 0.45 * d2.b + 0.3 * d2.g), scree * 0.45);
  vec4 rk2 = vec4(0.5);
  if (rockM > 0.002) {
    vec3 bw = pow(abs(nw), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
#ifdef LOWQ
    // móvil: una sola proyección (la de la cara que más mira) y una escala
    vec2 rq = bw.y > max(bw.x, bw.z) ? vWP.xz : bw.x > bw.z ? vWP.zy : vWP.xy;
    vec4 rk = texture2D(tRock, rq / ROCK_S1); rk2 = rk.gbar;
#else
    vec4 rk = triRock(vWP, bw, ROCK_S1);
    rk2 = triRock(vWP, bw, ROCK_S2);
#endif
    // tono de la roca: gris frío o cálido por zonas, estratos por altura y regueros oscuros en las paredes
    vec3 rbase = uRock * mix(vec3(0.84, 0.88, 0.95), vec3(1.0, 0.95, 0.84), smoothstep(0.4, 0.75, huge)) * 0.86;
    float strata = sin(vWP.y * 0.85 + big * 7.0) * 0.5 + 0.5, strata2 = sin(vWP.y * 2.6 + d1.r * 5.0) * 0.5 + 0.5;
    float streak = texture2D(tDetail, vec2(vWP.x + vWP.z, vWP.y * 0.1) / 7.0).g;
    vec3 rc = rbase * (0.2 + 1.05 * rk.r) * (0.7 + 0.5 * rk2.r) * (0.84 + 0.16 * strata) * (0.92 + 0.08 * strata2) * (0.88 + 0.24 * big);
    rc *= mix(1.0, 0.7, smoothstep(0.55, 0.82, streak) * smoothstep(0.3, 0.55, slope));
    rc *= 0.42 + 0.58 * rk.b;                                           // juntas y grietas en sombra
    rc = mix(rc, vec3(0.6, 0.6, 0.38) * (0.78 + 0.3 * rk2.r), smoothstep(0.5, 0.9, rk.g) * 0.38);   // líquenes gris verdosos
    rc = mix(rc, vec3(0.78, 0.5, 0.2), smoothstep(0.86, 0.98, rk2.g) * 0.45);                       // manchas de liquen naranja
    // de lejos la roca no debe verse moteada: el detalle fino se funde en tonos amplios con estratos y canales
    float farR = smoothstep(55.0, 200.0, length(vWP - cameraPosition));
    vec3 rfar = rbase * (0.62 + 0.3 * big + 0.12 * huge) * (0.8 + 0.2 * strata) * mix(1.0, 0.72, smoothstep(0.5, 0.8, streak) * smoothstep(0.3, 0.55, slope));
    rc = mix(rc, rfar, farR * 0.7);
    float ledge = smoothstep(0.6, 0.86, nw.y) * smoothstep(0.35, 0.7, d1.g);
    rc = mix(rc, vec3(0.2, 0.29, 0.1) * (0.7 + 0.5 * blades), ledge * 0.55);                          // musgo y hierba en las repisas
    col = mix(col, rc, rockM);
  }
#ifdef OUTER
  // hondonadas y canales más oscuros (oclusión), crestas algo más claras
  { vec2 q = vWP.xz; float oh = texture2D(tDetail, q / 140.0).r + texture2D(tDetail, q / 41.0 + 0.2).g * 0.55; col *= 0.8 + 0.3 * smoothstep(0.35, 1.25, oh); }
  // montañas lejanas: manchas de bosque y prados
  float fo = smoothstep(0.48, 0.6, texture2D(tDetail, vWP.xz / 190.0).r) * (1.0 - rockM) * (1.0 - smoothstep(170.0, 215.0, vWP.y));
  col = mix(col, vec3(0.13, 0.24, 0.1) * (0.8 + 0.4 * d1.r), fo * 0.75);
  // bosque con copas: donde el color es de bosque (verde oscuro) se dibujan copas a dos escalas, con su sombra
  float lum = dot(base, vec3(0.3, 0.59, 0.11));
  float isF = max(fo, smoothstep(0.075, 0.04, lum) * step(base.r, base.g)) * (1.0 - rockM);
#ifdef LOWQ
  vec2 cc = texture2D(tDetail, vWP.xz / 6.5).rg; float c1 = cc.r, c2 = cc.g;
#else
  float c1 = texture2D(tDetail, vWP.xz / 6.5).r, c2 = texture2D(tDetail, vWP.xz / 2.9 + 0.4).g;
#endif
  float crowns = smoothstep(0.38, 0.72, c1 * 0.65 + c2 * 0.35);
  col = mix(col, col * mix(0.45, 1.45, crowns) * mix(vec3(0.9, 1.0, 0.85), vec3(1.08, 1.04, 0.86), smoothstep(0.55, 0.85, c2)), isF);
  // prados altos: manchas de pasto seco y de hierba fresca
  float mead = (1.0 - isF) * (1.0 - rockM);
  col = mix(col, col * mix(vec3(0.86, 0.95, 0.82), vec3(1.12, 1.05, 0.82), big) * (0.88 + 0.24 * d1.g), mead * 0.8);
  // nieve dibujada por píxel: borde irregular, solo donde se sostiene, con sombra azulada en las caras en sombra
  float snowA = smoothstep(uSnowY, uSnowY + 34.0, vWP.y + (big - 0.5) * 70.0 + (d1.r - 0.5) * 26.0) * (1.0 - smoothstep(0.3, 0.5, slope + (d2.g - 0.5) * 0.12));
  vec3 snowC = mix(vec3(0.78, 0.84, 0.95), vec3(0.97, 0.98, 1.0), clamp(nw.y * 1.2 - 0.1 + (rk2.r - 0.5) * 0.3, 0.0, 1.0));
  col = mix(col, snowC, snowA);
#endif
  diffuseColor.rgb = col;
  // tierra y senderos
  // tierra: grano fino, piedrecitas y huellas de rodadas (sin remolinos)
  // tierra y empedrado, solo donde los hay (en el prado no se leen sus texturas)
  float dm = smoothstep(0.1, 0.9, vSurf.y + (d1.g - 0.5) * 0.5 + (clump - 0.5) * 0.35);
  if (dm > 0.002) {
#ifdef LOWQ
    float grit = g1.r;
#else
    float grit = texture2D(tGrass, vWP.xz / 0.35).r;
#endif
    vec3 dirt = mix(vec3(0.5, 0.39, 0.27), vec3(0.6, 0.5, 0.36), big) * (0.82 + 0.28 * grit) * (0.9 + 0.16 * g1.r);
    dirt = mix(dirt, dirt * vec3(0.78, 0.76, 0.74), smoothstep(0.5, 0.75, d1.r) * 0.5);          // manchas húmedas
    float peb = texture2D(tDetail, vWP.xz / 6.0 + 0.5).b;                                          // guijarros de 2 a 8 cm
    dirt *= 1.0 - smoothstep(0.15, 0.4, peb) * (1.0 - smoothstep(0.4, 0.6, peb)) * 0.3;           // su sombra alrededor
    dirt = mix(dirt, vec3(0.63, 0.59, 0.53) * (0.78 + 0.34 * d2.r), smoothstep(0.5, 0.75, peb) * 0.7);
    dirt = mix(dirt, dirt * 0.84, smoothstep(0.45, 0.7, g2.g) * 0.4);
    diffuseColor.rgb = mix(diffuseColor.rgb, dirt, dm);
  }
  // empedrado
  float sm = smoothstep(0.15, 0.85, vSurf.x + (d1.g - 0.5) * 0.4);
  if (sm > 0.002) { vec3 cob = texture2D(tCobble, vWP.xz / 2.4).rgb * 1.05; diffuseColor.rgb = mix(diffuseColor.rgb, cob, sm); }
}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  // montañas lejanas: lomos, canales y cárcavas dibujados con la luz (relieve de un campo de alturas a dos escalas);
  // así no se ven las facetas de la malla gruesa. En el valle jugable, solo de lejos y en las laderas
  vec2 p = vWP.xz; float e = 5.0;
#ifdef LOWQ
  #define OH(q) (texture2D(tDetail, (q) / 140.0).r + texture2D(tDetail, (q) / 41.0 + 0.2).g * 0.55)
#else
  #define OH(q) (texture2D(tDetail, (q) / 140.0).r + texture2D(tDetail, (q) / 41.0 + 0.2).g * 0.55 + texture2D(tDetail, (q) / 13.0 + 0.6).r * 0.18)
#endif
  float dcam = length(vWP - cameraPosition);
  vec3 nw0 = normalize(vNW);
#ifdef OUTER
  float fade = 1.0 - smoothstep(900.0, 2400.0, dcam) * 0.6;
#elif defined(LOWQ)
  float fade = 0.0;   // móvil: solo en las montañas lejanas
#else
  float fade = smoothstep(90.0, 260.0, dcam) * smoothstep(0.12, 0.3, 1.0 - nw0.y) * 0.8;
#endif
  if (fade > 0.01) {
    float h0 = OH(p), hx = OH(p + vec2(e, 0.0)), hz = OH(p + vec2(0.0, e));
    vec3 wn = normalize(nw0 + vec3(-(hx - h0), 0.0, -(hz - h0)) / e * 26.0 * fade);
    normal = normalize(mix(normal, (viewMatrix * vec4(wn, 0.0)).xyz, fade > 0.5 ? 1.0 : fade * 2.0));
  }
}
{
  // relieve de la roca: mapa de normales en proyección triplanar, sin estirarse en los cortados
  vec3 nw = normalize(vNW);
  float rs = 1.0 - nw.y;
  float rn = max(vSurf.z, smoothstep(uRockSlope.x - 0.06, uRockSlope.y, rs)) * (1.0 - vSurf.x) * (1.0 - smoothstep(0.1, 0.9, vSurf.y));
#ifdef LOWQ
  rn = 0.0;   // móvil: sin mapa de normales de la roca (cinco lecturas menos; el color ya marca grietas y estratos)
#endif
  if (rn > 0.01) {
    vec3 bw = pow(abs(nw), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
    vec3 tx = texture2D(tRockN, vWP.zy / ROCK_S1).xyz * 2.0 - 1.0;
    vec3 ty = texture2D(tRockN, vWP.xz / ROCK_S1).xyz * 2.0 - 1.0;
    vec3 tz = texture2D(tRockN, vWP.xy / ROCK_S1).xyz * 2.0 - 1.0;
    vec3 tx2 = texture2D(tRockN, vWP.zy / ROCK_S2 + 0.31).xyz * 2.0 - 1.0;
    vec3 tz2 = texture2D(tRockN, vWP.xy / ROCK_S2 + 0.31).xyz * 2.0 - 1.0;
    tx.xy += tx2.xy * 0.6; tz.xy += tz2.xy * 0.6;
    tx = vec3(tx.xy + nw.zy, abs(tx.z) * nw.x);
    ty = vec3(ty.xy + nw.xz, abs(ty.z) * nw.y);
    tz = vec3(tz.xy + nw.xy, abs(tz.z) * nw.z);
    vec3 wn = normalize(tx.zyx * bw.x + ty.xzy * bw.y + tz.xyz * bw.z);
    vec3 vn = normalize((viewMatrix * vec4(wn, 0.0)).xyz);
    normal = normalize(mix(normal, vn, rn * 0.9));
  }
}
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
  m.customProgramCacheKey = () => (outer ? 'terrain-outer' : 'terrain') + (quality === 'low' ? '-low' : '');
  return m;
}

export class Terrain {
  constructor(scene, quality) {
    setPalette(TONE);
    this.group = new THREE.Group();
    this.quality = quality;
    this.mat = makeTerrainMaterial({ quality });
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
    const R = 1500, step = 12.5, n = Math.round(2 * R / step) + 1;
    const pos = [], col = [], idx = [];
    const c = new THREE.Color();
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = -R + i * step, z = -R + j * step;
      const inside = Math.abs(x) < HALF - 10 && Math.abs(z) < HALF - 10;
      let h = inside ? -30 : outerHeight(x, z);
      const r4 = Math.pow(x ** 4 + z ** 4, 0.25);
      // (con horizonte real, el relieve del pueblo ya sube con la distancia al ángulo de las sierras de verdad)
      if (!skyTan) h += smoothstep(600, 1300, r4) * (120 + 160 * (fbm(x / 400, z / 400, 3) * 0.5 + 0.5));
      // crestas y canchales: relieve fino que sólo aparece en lo alto
      if (!inside) h += (ridged(x / 75, z / 75, 3) - 0.35) * 22 * smoothstep(90, 190, h) + fbm(x / 28, z / 28, 2) * 4 * smoothstep(60, 140, h);
      pos.push(x, h, z);
    }
    // índices por baldosas de TILE×TILE celdas: cada una es una malla con su esfera, así la cámara no dibuja las que
    // quedan detrás o a los lados (antes el anillo entero, unos 50 000 triángulos, se dibujaba en cada fotograma)
    const TILE = 40, tiles = new Map();
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const x = -R + i * step, z = -R + j * step;
      if (x >= -HALF + 20 && x + step <= HALF - 20 && z >= -HALF + 20 && z + step <= HALF - 20) continue;
      const A = j * n + i, B = A + 1, Cc = A + n, D = Cc + 1;
      idx.push(A, Cc, B, B, Cc, D);
      const k = Math.floor(i / TILE) + ',' + Math.floor(j / TILE);
      if (!tiles.has(k)) tiles.set(k, []);
      tiles.get(k).push(A, Cc, B, B, Cc, D);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aSurf', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 4), 4));
    g.setIndex(idx); g.computeVertexNormals();
    const nrm = g.attributes.normal;
    const meadowC = new THREE.Color('#5a8238'), meadowD = new THREE.Color('#7d8f45'), forestC = new THREE.Color('#2c4a22'), forestD = new THREE.Color('#3b5a2a');
    const rockC = new THREE.Color('#7b7367'), rockD = new THREE.Color('#5f5a52'), screeC = new THREE.Color('#9a9282'), snowC = new THREE.Color('#eef2f6');
    for (let v = 0; v < pos.length / 3; v++) {
      const x = pos[v * 3], h = pos[v * 3 + 1], z = pos[v * 3 + 2], sl = 1 - nrm.getY(v);
      const n1 = fbm(x / 90, z / 90, 2) * 0.5 + 0.5, n2 = fbm(x / 23 + 7, z / 23, 2) * 0.5 + 0.5;
      // prados abajo, bosque en las laderas medias (a manchas), pastos altos y luego roca
      c.copy(meadowC).lerp(meadowD, n2 * 0.6);
      const forestBelt = smoothstep(20, 60, h) * (1 - smoothstep(150, 185, h + n1 * 25)) * smoothstep(0.42, 0.62, n1 + (1 - sl) * 0.15);
      c.lerp(n2 > 0.5 ? forestC : forestD, forestBelt * 0.92);
      c.lerp(new THREE.Color('#8a9150'), smoothstep(150, 190, h + n1 * 30) * (1 - forestBelt) * 0.6);
      // en los montes atlánticos (Bidasoa, Baztan) las cimas son lomas de pasto y helecho, no roca pelada
      const lush = TONE === 'lush';
      if (lush) c.lerp(n2 > 0.5 ? new THREE.Color('#7f8248') : new THREE.Color('#6d7a3e'), smoothstep(165, 215, h + n1 * 30) * (1 - forestBelt) * 0.8);
      const rockAmt = Math.max(smoothstep(0.28, 0.46, sl + (n2 - 0.5) * 0.12), lush ? 0 : smoothstep(175, 225, h + n1 * 35));
      c.lerp(n2 > 0.55 ? rockC : rockD, rockAmt);
      c.lerp(screeC, smoothstep(0.2, 0.3, sl) * (1 - smoothstep(0.3, 0.4, sl)) * smoothstep(140, 190, h) * 0.5);
      // nieve en lo alto, sólo donde se sostiene (repisas y canales poco inclinados)
      // (solo en el Pirineo: en el resto de Navarra los montes no guardan nieve fuera del invierno)
      if (TONE === 'alpine') c.lerp(snowC, smoothstep(215, 250, h + n1 * 40) * (1 - smoothstep(0.32, 0.5, sl)));
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const mat = makeTerrainMaterial({ outer: true, quality: this.quality }), grp = new THREE.Group();
    grp.position.y = -0.8; // ligeramente por debajo para evitar parpadeos en la unión
    const v = new THREE.Vector3(), box = new THREE.Box3();
    for (const list of tiles.values()) {
      const tg = new THREE.BufferGeometry();
      for (const [k, a] of Object.entries(g.attributes)) tg.setAttribute(k, a);   // los vértices se comparten (una sola copia)
      tg.setIndex(list);
      box.makeEmpty(); for (const id of list) box.expandByPoint(v.fromBufferAttribute(g.attributes.position, id));
      tg.boundingBox = box.clone(); tg.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
      const m = new THREE.Mesh(tg, mat); m.matrixAutoUpdate = false; m.name = 'montes-lejos';
      grp.add(m);
    }
    grp.updateMatrixWorld(true);
    scene.add(grp);
    this.outer = grp;
  }
}

// Relieve exterior sin cauces (el río se pierde entre montañas lejanas)
function outerHeight(x, z) {
  const r4 = Math.pow(x ** 4 + z ** 4, 0.25);
  const base = finalHeight(x, z, null).h;
  if (skyTan) return base;
  const fill = valleyFloor(x, z) + 40 + 90 * smoothstep(480, 700, r4) + 60 * ridged(x / 200, z / 200, 3);
  return Math.max(base, lerp(base, fill, smoothstep(470, 560, r4)));
}
