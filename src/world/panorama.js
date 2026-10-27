// Vista desde el mirador con los prismáticos: un paisaje propio donde los montes de verdad están en su dirección real,
// con su forma (pirámide de roca, macizo con cortados, cresta de varias cimas o loma redondeada), su altura aparente y
// sus colores (bosque abajo, pastos, roca en las pendientes, nieve arriba en los altos), con una textura de detalle y
// la bruma de la distancia. Delante, colinas y valles. Pocos montes, pero bien hechos.
import * as THREE from 'three';
import { PolarGrid, polarMaterial, labelTex, montesVisibles, panoBirds, moveBirds } from './miradorReal.js';
import { rel } from '../util/geo.js';
import { mulberry32, smoothstep, hashStr } from '../util/math.js';

// ruido de valor 2D suave y fBm (sumas de octavas); «ridged» para crestas afiladas
function makeNoise(seed) {
  const r = mulberry32(seed), P = new Uint8Array(512), G = new Float32Array(256);
  for (let i = 0; i < 256; i++) { P[i] = i; G[i] = r(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [P[i], P[j]] = [P[j], P[i]]; }
  for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const v = (x, y) => G[P[(P[x & 255] + y) & 255]];
  const n = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
    const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1); return (a + (b - a) * u) * (1 - w) + (c + (d - c) * u) * w; };
  const fbm = (x, y, o = 5) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * n(x * f, y * f); f *= 2.03; a *= 0.5; } return s; };
  const ridged = (x, y, o = 5) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { const k = 1 - Math.abs(n(x * f, y * f) * 2 - 1); s += a * k * k; f *= 2.1; a *= 0.5; } return s; };
  return { n, fbm, ridged };
}

// textura de detalle (gris, se multiplica por el color): grano de roca, estratos y matas
function detailTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), r = mulberry32(5);
  g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 7000; i++) { const v = 175 + r() * 80 | 0; g.fillStyle = `rgba(${v},${v},${v},0.45)`; g.fillRect(r() * 256, r() * 256, 1 + r() * 2.5, 1 + r() * 1.5); }
  g.strokeStyle = 'rgba(110,110,110,0.12)'; g.lineWidth = 1;
  for (let y = 6; y < 256; y += 9 + r() * 10) { g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 256; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + y) * 3 + (r() - 0.5) * 2); g.stroke(); }   // estratos
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace; return t;
}

// el terreno visto con los prismáticos: parcelas de cultivo o de prado (según lo montañoso que sea) con surcos y lindes
// de setos, y el bosque con copas; se calcula en cada píxel, así que no depende de lo fina que sea la malla. Se funde
// con el color de la malla a lo lejos
function groundShader(mat, rough) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uRough = { value: rough };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aFld; varying float vFld; varying vec3 vWP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFld = aFld; vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uRough; varying float vFld; varying vec3 vWP;
float gh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float gn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(gh(i), gh(i + vec2(1, 0)), f.x), mix(gh(i + vec2(0, 1)), gh(i + vec2(1, 1)), f.x), f.y); }
vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec2 P = vWP.xz; float dist = length(vWP - cameraPosition);
  // bloques de parcelas irregulares (celdas de Voronoi de unos 600 m), cada uno con su orientación, y caminos de
  // tierra en sus bordes
  vec2 g0 = floor(P / 600.0), rid = g0; float d1 = 1e9, d2 = 1e9;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = g0 + vec2(x, y), c = (g + 0.15 + 0.7 * vec2(gh(g), gh(g + 9.1))) * 600.0; float d = length(P - c);
    if (d < d1) { d2 = d1; d1 = d; rid = g; } else if (d < d2) d2 = d;
  }
  float reg = gh(rid + 0.5), track = 1.0 - smoothstep(2.5, 5.0, (d2 - d1) * 0.5);
  float an = reg * 3.1416; vec2 q = mat2(cos(an), -sin(an), sin(an), cos(an)) * P;
  vec2 sz = vec2(55.0 + reg * 60.0, 34.0 + gh(rid + 3.0) * 34.0);
  vec2 cid = floor(q / sz), f = fract(q / sz); float hc = gh(cid + reg * 17.0);
  // cultivos en el llano (cereal, verde, barbecho, girasol), prados de distintos verdes en la montaña
  vec3 low = hc < 0.3 ? vec3(0.78, 0.68, 0.38) : hc < 0.52 ? vec3(0.45, 0.58, 0.26) : hc < 0.66 ? vec3(0.56, 0.44, 0.30) : hc < 0.82 ? vec3(0.55, 0.64, 0.32) : vec3(0.70, 0.66, 0.36);
  vec3 mtn = hc < 0.35 ? vec3(0.42, 0.56, 0.26) : hc < 0.6 ? vec3(0.50, 0.62, 0.30) : hc < 0.8 ? vec3(0.36, 0.50, 0.24) : vec3(0.62, 0.66, 0.36);
  vec3 crop = mix(low, mtn, smoothstep(0.35, 0.8, uRough)); crop = lin(mix(crop, vec3(dot(crop, vec3(0.3, 0.59, 0.11))), 0.22));
  float rows = 0.92 + 0.08 * sin((hc > 0.5 ? q.x : q.y) * 2.4);
  float edge = min(min(f.x, 1.0 - f.x) * sz.x, min(f.y, 1.0 - f.y) * sz.y);
  float hedge = (1.0 - smoothstep(1.0, 3.2, edge + gn(P / 3.0) * 1.5)) * step(0.3, gh(cid + 5.0));
  vec3 fc = crop * rows * (0.86 + 0.28 * gn(P / 11.0));
  fc = mix(fc, lin(vec3(0.20, 0.30, 0.14)), hedge * 0.85);
  fc = mix(fc, lin(vec3(0.66, 0.60, 0.48)), track * 0.9);
  float m = clamp(vFld, 0.0, 1.0) * smoothstep(5200.0, 1500.0, dist);
  diffuseColor.rgb = mix(diffuseColor.rgb, fc * 1.05, m * 0.8);
  // bosque: copas de árboles (manchas claras y oscuras de unos metros)
  float can = mix(gn(P / 22.0), gn(P / 6.0) * 0.6 + gn(P / 2.3) * 0.4, smoothstep(2200.0, 700.0, dist));
  diffuseColor.rgb *= mix(1.0, 0.68 + 0.6 * can, (1.0 - clamp(vFld, 0.0, 1.0)) * smoothstep(5000.0, 900.0, dist) * 0.85);
}`);
  };
}

// roca de los montes: en las paredes empinadas, estratos horizontales y grietas verticales según la altura real (la
// textura de detalle se estiraba en los cortados como una cortina)
function rockShader(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWP; varying vec3 vWN;
float rh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float rn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(rh(i), rh(i + vec2(1, 0)), f.x), mix(rh(i + vec2(0, 1)), rh(i + vec2(1, 1)), f.x), f.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec3 c = diffuseColor.rgb; float mx = max(c.r, max(c.g, c.b)), sat = (mx - min(c.r, min(c.g, c.b))) / max(mx, 1e-3);
  float steep = smoothstep(0.35, 0.75, 1.0 - abs(vWN.y)) * (1.0 - smoothstep(0.18, 0.4, sat));   // solo la roca gris empinada
  float along = vWP.x * 0.7 + vWP.z * 0.7, w = rn(vec2(along * 0.02, vWP.y * 0.01)) * 6.0;
  float strata = 0.5 + 0.5 * sin(vWP.y * 0.55 + w);
  float crack = smoothstep(0.72, 0.9, rn(vec2(along * 0.12, vWP.y * 0.012)));
  float k = mix(1.0, (0.8 + 0.28 * strata) * (1.0 - crack * 0.45) * (0.85 + 0.3 * rn(vec2(along * 0.05, vWP.y * 0.08))), steep);
  diffuseColor.rgb *= k;
}`);
  };
}

// el paisaje real visto con los prismáticos: parcelas de cultivo en lo llano, copas en el bosque, en las laderas
// lomos y barrancos que bajan (en la luz y en el color), estratos en la roca, sombras de nubes y la bruma con la
// distancia real (más espesa en lo bajo). El relieve menudo es un «bump» en metros, con proyección triplanar (las
// laderas empinadas no se estiran) y se apaga con la distancia antes de hacerse más fino que un píxel
function realShader(mat, haze, snowLine) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uHazeL = { value: 40000 / Math.max(0.3, haze) }; sh.uniforms.uSnow = { value: snowLine };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aAlt, aSlope, aFld, aFor, aWet, aBand; varying float vAlt, vSlope, vFld, vFor, vWet, vBand; varying vec3 vWP, vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlt = aAlt; vSlope = aSlope; vFld = aFld; vFor = aFor; vWet = aWet; vBand = aBand; vWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uHazeL, uSnow; varying float vAlt, vSlope, vFld, vFor, vWet, vBand; varying vec3 vWP, vWN; float gH = 0.0, gG = 0.5;
float gh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float gn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(gh(i), gh(i + vec2(1, 0)), f.x), mix(gh(i + vec2(0, 1)), gh(i + vec2(1, 1)), f.x), f.y); }
// el mismo ruido, que se queda en su media cuando un píxel abarca más de una celda: en lo que se ve muy de canto (una
// ladera medio tapada, el llano lejano) un píxel cubre cientos de metros y el dibujo fino salía en puntitos y rayitas
float aaf(vec2 p){ return 1.0 - smoothstep(0.4, 1.0, length(fwidth(p))); }
float gnf(vec2 p){ return mix(0.5, gn(p), aaf(p)); }
// (cresta redondeada: con la punta afilada, la luz cambiaba de golpe en cada lomo y salían rayas oscuras)
float rdg(vec2 p){ float t = gn(p) * 2.0 - 1.0, k = 1.0 - t * t; return mix(0.55, k * k, aaf(p)); }
// manchas de bosque y prado: de unos 250 m con el borde irregular (dos octavas más finas). Torcidas y giradas: el ruido
// va por una cuadrícula y, en la lejanía (rumbo y ángulo), el borde del bosque salía en rayas verticales rectas
float fpat(vec2 q){ q = mat2(0.8, -0.6, 0.6, 0.8) * q + vec2(gnf(q / 170.0 + 3.7), gnf(q / 170.0 - 5.1)) * 110.0;
  return gnf(q / 260.0) * 0.55 + gnf(mat2(0.8, 0.6, -0.6, 0.8) * q / 70.0) * 0.3 + gnf(q / 22.0 + 1.3) * 0.15; }
// en una ladera: lomos y barrancos (alargados hacia abajo) y menudo; en lo llano, ondulaciones y matas
// (lomos y barrancos con el trazado torcido: rectos parecían rayas; y más suaves lejos, que en una cara entera de monte
// también lo parecían)
float gully(vec2 q){ return rdg(vec2(q.x / 110.0 + (gnf(q / 300.0) - 0.5) * 2.2, q.y / 420.0)); }
float slopeH(vec2 q, float d){ return gully(q) * 34.0 * (1.0 - 0.55 * smoothstep(2000.0, 10000.0, d)) * (1.0 - smoothstep(45000.0, 95000.0, d)) + gnf(q / 38.0) * 7.0 * (1.0 - smoothstep(7000.0, 18000.0, d)) + gnf(q / 9.0) * 1.6 * (1.0 - smoothstep(1500.0, 4000.0, d)); }
float flatH(vec2 q, float d){ return gnf(q / 240.0) * 16.0 * (1.0 - smoothstep(20000.0, 50000.0, d)) + gnf(q / 45.0) * 4.0 * (1.0 - smoothstep(6000.0, 15000.0, d)) + gnf(q / 7.0) * 1.0 * (1.0 - smoothstep(800.0, 2500.0, d)); }
// (la normal, torcida como mucho unos 30°, y nada donde se ve muy de canto: allí las derivadas de un píxel abarcan
// cientos de metros, la normal se disparaba y, con el sol bajo de la tarde, salían rayitas claras sueltas)
vec3 bumpN(vec3 sp, vec3 n, float H){
  vec3 sx = dFdx(sp), sy = dFdy(sp), r1 = cross(sy, n), r2 = cross(n, sx); float det = dot(sx, r1), ad = abs(det);
  vec3 g = sign(det) * (dFdx(H) * r1 + dFdy(H) * r2) * smoothstep(0.08, 0.25, abs(dot(normalize(sp), n)));
  float gl = length(g); if (gl > ad * 0.6) g *= ad * 0.6 / gl;
  return normalize(ad * n - g);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec2 P = vWP.xz; float dist = length(vWP - cameraPosition);
  // coordenadas del relieve menudo: cerca, las del suelo (triplanar: las laderas no se estiran); lejos, las de la vista
  // (rumbo y ángulo, a la escala de su término), que no se aplastan en las laderas vistas de frente
  vec3 w = pow(abs(vWN), vec3(4.0)); w /= (w.x + w.y + w.z);
  float L = max(1.0, length(P)), sa = vWP.x / L, ca = -vWP.z / L, vv = vWP.y / L * vBand, far = smoothstep(900.0, 2200.0, dist);
  vec2 qa = vec2(sa * vBand, vv), qb = vec2(ca * vBand, vv); float wa = ca * ca, wb = sa * sa;
  float hNear = slopeH(vec2(vWP.z, vAlt), dist) * w.x + slopeH(vec2(vWP.x, vAlt), dist) * w.z + flatH(P, dist) * w.y;
  gH = mix(hNear, slopeH(qa, dist) * wa + slopeH(qb, dist) * wb, far);
  gG = mix(rdg(vec2(vWP.z / 110.0, vAlt / 420.0)) * w.x + rdg(vec2(vWP.x / 110.0, vAlt / 420.0)) * w.z + gnf(P / 240.0) * w.y, gully(qa) * wa + gully(qb) * wb, far);   // (0 barranco, 1 lomo)
  // manchas grandes y menudas del suelo (cuando aún son más gruesas que un píxel): verdes y secas en los campos y el brillo
  float p1 = mix(0.5, gnf(P / 1400.0 + 5.0) * 0.7 + gnf(P / 500.0) * 0.3, 1.0 - smoothstep(50000.0, 110000.0, dist)), p2 = mix(0.5, gnf(P / 300.0), 1.0 - smoothstep(15000.0, 40000.0, dist));
  float lowK = 1.0 - smoothstep(1350.0, 1650.0, vAlt);
  diffuseColor.rgb = mix(diffuseColor.rgb, pow(vec3(0.53, 0.57, 0.31), vec3(2.2)), smoothstep(0.42, 0.6, p2) * clamp(vFld * 1.4, 0.0, 1.0) * 0.8);
  diffuseColor.rgb = mix(diffuseColor.rgb, pow(vec3(0.69, 0.61, 0.44), vec3(2.2)), (1.0 - clamp(vWet, 0.0, 1.0)) * smoothstep(0.5, 0.7, p1) * 0.6 * lowK);
  diffuseColor.rgb *= 0.9 + 0.2 * p2;
  // parcelas (bloques de unos 600 m, cada uno con su orientación) con lindes y caminos, cerca
  float fk = clamp(vFld, 0.0, 1.0) * (1.0 - smoothstep(2500.0, 8000.0, dist)) * smoothstep(0.8, 0.93, vWN.y);
  if (fk > 0.01) {
    vec2 g0 = floor(P / 600.0), rid = g0; float d1 = 1e9, d2 = 1e9;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 g = g0 + vec2(x, y), c = (g + 0.15 + 0.7 * vec2(gh(g), gh(g + 9.1))) * 600.0; float d = length(P - c);
      if (d < d1) { d2 = d1; d1 = d; rid = g; } else if (d < d2) d2 = d;
    }
    float reg = gh(rid + 0.5), an = reg * 3.1416; vec2 q = mat2(cos(an), -sin(an), sin(an), cos(an)) * P;
    vec2 sz = vec2(70.0 + reg * 90.0, 45.0 + gh(rid + 3.0) * 50.0), cid = floor(q / sz), f = fract(q / sz); float hc = gh(cid + reg * 17.0);
    vec3 crop = hc < 0.3 ? vec3(0.78, 0.68, 0.40) : hc < 0.55 ? vec3(0.46, 0.57, 0.27) : hc < 0.7 ? vec3(0.58, 0.46, 0.32) : hc < 0.85 ? vec3(0.56, 0.63, 0.33) : vec3(0.70, 0.64, 0.38);
    crop = pow(crop, vec3(2.2)) * (0.9 + 0.2 * gn(P / 13.0));
    float edge = min(min(f.x, 1.0 - f.x) * sz.x, min(f.y, 1.0 - f.y) * sz.y);
    crop = mix(crop, pow(vec3(0.22, 0.31, 0.16), vec3(2.2)), (1.0 - smoothstep(1.5, 4.0, edge)) * step(0.35, gh(cid + 5.0)) * 0.8);
    crop = mix(crop, pow(vec3(0.66, 0.6, 0.5), vec3(2.2)), (1.0 - smoothstep(3.0, 7.0, (d2 - d1) * 0.5)) * 0.8);
    diffuseColor.rgb = mix(diffuseColor.rgb, crop, fk * 0.85);
  }
  // bosque: manchas con su borde (triplanar: también en las laderas), más en los barrancos que en los lomos; robles y
  // encinas abajo, hayas a media altura y pinos en lo alto y seco; copas cerca y umbría lejos
  float tf = mix(fpat(vec2(vWP.z, vAlt)) * w.x + fpat(vec2(vWP.x, vAlt)) * w.z + fpat(P) * w.y, fpat(qa) * wa + fpat(qb) * wb, far);
  float steep = mix(1.0 - w.y, 1.0, far * 0.7), fx = tf + (clamp(vFor, 0.0, 1.0) + (p1 - 0.5) * 0.5 - 0.5) * 0.9 - (gG - 0.5) * 0.3 * steep, ex = fwidth(fx), fo = smoothstep(0.49 - ex, 0.52 + ex, fx) * (1.0 - fk * 0.9);
  vec3 fc = mix(vec3(0.075, 0.1, 0.045), vec3(0.04, 0.075, 0.03), smoothstep(650.0, 1050.0, vAlt));
  fc = mix(fc, vec3(0.035, 0.05, 0.035), (1.0 - clamp(vWet, 0.0, 1.0)) * smoothstep(1000.0, 1400.0, vAlt));
  float cn = mix(gnf(P / 140.0), gnf(P / 11.0) * 0.6 + gnf(P / 4.0) * 0.4, 1.0 - smoothstep(1500.0, 6000.0, dist));
  fc *= 0.7 + 0.6 * mix(0.5, cn, 1.0 - smoothstep(9000.0, 30000.0, dist));
  diffuseColor.rgb = mix(diffuseColor.rgb, fc, fo * 0.92);
  diffuseColor.rgb *= mix(1.0, 0.78 + 0.4 * gG, steep * 0.8 * (1.0 - smoothstep(12000.0, 40000.0, dist) * 0.6));
  // roca: en lo empinado y en los lomos de lo alto, con estratos y alguna grieta
  float rk = max(smoothstep(0.55, 0.95, vSlope + (p2 - 0.5) * 0.3) * (1.0 - fo * 0.7), smoothstep(1550.0, 1900.0, vAlt + (gG - 0.5) * 350.0 + (p1 - 0.5) * 300.0) * (0.45 + 0.55 * gG));
  vec3 rock = pow(vec3(0.6, 0.58, 0.54), vec3(2.2)) * (0.85 + 0.3 * gnf(P / 60.0 + vAlt / 50.0));
  float sv = mix(vAlt, vv, far) * 0.11, strata = 0.82 + 0.26 * (0.5 + 0.5 * sin(sv + gnf(P / 400.0) * 5.0) * (1.0 - smoothstep(0.8, 2.5, fwidth(sv)))), crack = smoothstep(0.7, 0.9, gnf(vec2(mix(P.x + P.y, qa.x, far), mix(vAlt, vv, far) * 2.0) / 35.0));
  rock *= mix(1.0, strata * (1.0 - crack * 0.35), 1.0 - smoothstep(3000.0, 12000.0, dist));
  diffuseColor.rgb = mix(diffuseColor.rgb, rock, rk * 0.75);
  // nieve por encima de su cota, con el borde en manchas y más en los barrancos que en los lomos; no en lo muy empinado,
  // y en el bosque, entre los árboles
  float sx = vAlt + (p1 - 0.5) * 260.0 + (0.5 - gG) * 90.0 * steep, es = fwidth(sx), sn = smoothstep(uSnow - es, uSnow + 180.0 + es, sx) * (1.0 - smoothstep(0.75, 1.1, vSlope + (p2 - 0.5) * 0.2));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.88, 0.9, 0.93) * (0.94 + 0.06 * gG), sn * (0.95 - fo * 0.35));
  // sombras de nubes
  diffuseColor.rgb *= 0.8 + 0.2 * smoothstep(0.32, 0.6, gnf(P / 5200.0 + 3.0));
}`)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
  normal = bumpN(-vViewPosition, normal, gH);`)
      .replace('#include <fog_fragment>', `{
  // bruma: crece con la distancia real; en lo alto el aire está más limpio
  float d = length(vWP - cameraPosition), fd = (1.0 - exp(-d / uHazeL)) * mix(1.0, 0.72, smoothstep(700.0, 2200.0, vAlt));
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, clamp(fd, 0.0, 0.8));
}`);
  };
}

const C = (h) => new THREE.Color(h);
const PAL = {
  forest: C('#2c4527'), forest2: C('#3a5a2e'), meadow: C('#7d9450'), meadowDry: C('#9a9a5a'),
  rockGrey: C('#7f7b74'), rockLime: C('#a8a294'), rockDark: C('#5e5a55'), snow: C('#f3f5f8'), far: C('#7d8fa6'), field: C('#a3a05c'), field2: C('#6f8a3e'),
};

/** Forma de un monte: la que dice su descripción (muralla caliza, loma herbosa, cima afilada, sierra…) y, si no dice
 * nada, según su altura (siempre la misma para el mismo monte). Muy lejos se ve la cordillera entera. */
function typeOf(m) {
  const h = hashStr(m.id || m.name), t = (m.intro || '').toLowerCase();
  if (m.km > 40 && m.altitude >= 1400) return 'sierra';
  if (/afilad|puntiag|pala final|silueta|rocosa y solitaria/.test(t)) return 'pico';
  if (/muralla|caliza|escarpe|meseta|macizo|proa/.test(t)) return 'macizo';
  if (/loma|redondead|suave|amplia y verde|herbos|cima amplia/.test(t)) return 'loma';
  if (/sierra|línea de cumbre|cresta|peñas/.test(t)) return 'cresta';
  if (m.altitude >= 2000) return 'pico';
  if (m.altitude >= 1250) return ['macizo', 'cresta', 'pico'][h % 3];
  return h % 2 ? 'loma' : 'cresta';
}

export class Panorama {
  /**
   * @param {Array} montes [{ id, name, altitude, km, bearing }]
   * @param {object} o { quality, sun: THREE.Vector3 (dirección), zenith, horizon (THREE.Color), seed, night }
   */
  constructor(montes, o = {}) {
    this.o = o; this.montes = montes;
    const S = this.scene = new THREE.Scene(), low = o.quality === 'low';
    this.camera = new THREE.PerspectiveCamera(10, innerWidth / innerHeight, 1, 14000);
    this.eye = new THREE.Vector3(0, 70, 0);
    this.owned = [];
    // colores del cielo (si llegan casi blancos o vacíos, los de un día claro)
    const ok = (c) => c && (c.r + c.g + c.b) < 2.7;
    const hor = (ok(o.horizon) ? o.horizon : C('#cfe2f2')).clone(), zen = (ok(o.zenith) ? o.zenith : C('#6fa6dc')).clone();
    // cielo: degradado del horizonte al cénit
    const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uHor: { value: hor }, uZen: { value: zen } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 uHor, uZen; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y, 0.0, 1.0); gl_FragColor = vec4(mix(uHor, uZen, pow(h, 0.55)), 1.0);\n#include <colorspace_fragment>\n}' });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(12000, 32, 16), skyMat); S.add(sky); this.owned.push(sky.geometry, skyMat);
    S.fog = new THREE.Fog(hor.clone().lerp(C('#ffffff'), 0.15), 350, 10000);   // perspectiva aérea: lo lejano azulea y se aclara
    S.add(new THREE.HemisphereLight(zen.clone().lerp(C('#ffffff'), 0.5), C('#6a7a50'), 1.5));
    const sun = new THREE.DirectionalLight('#fff1dc', 2.2); sun.position.copy((o.sun || new THREE.Vector3(0.4, 0.7, -0.3)).clone().normalize().multiplyScalar(1000)); S.add(sun);
    this.detail = detailTexture(); this.owned.push(this.detail);
    // con el relieve de detalle del mirador (las alturas reales: miradorReal.js), el paisaje de verdad; si no ha llegado,
    // el de las siluetas del relieve general (src/world/relieve.js) y, si tampoco, los montes hechos a mano
    if (o.polar) { try { this.buildPolar(o.polar, hor, zen); return; } catch (e) { console.warn('relieve de detalle del mirador', e); } }
    if (o.relieve) { try { this.buildReal(o.relieve, hor, zen); return; } catch (e) { console.warn('relieve del mirador', e); } }
    // los montes de verdad
    // relieve general del terreno (antes de los montes, que se asientan sobre él)
    this.gnz = makeNoise(7);
    this.rough = Math.min(1, Math.max(0.25, (montes.reduce((a, m) => a + m.altitude, 0) / Math.max(1, montes.length) - 600) / 1100));
    this.Hm = montes.reduce((a, m) => Math.max(a, this.place(m).H), 80);
    this.peaks = montes.map((m, i) => this.buildPeak(m, i, low ? 96 : 140));
    // el terreno de delante: colinas, bosques y campos, más bajo cerca del mirador (que está en alto)
    this.buildGround(low ? 110 : 150);
  }
  // distancia en la escena (comprimida) y altura aparente: la real, suavizada en los muy cercanos (si no, uno solo
  // llenaría el visor) y un poco realzada en los lejanos para que se lean
  place(m) {
    const ds = Math.min(5200, 900 + m.km * 60), rel = Math.max(260, m.altitude - 480);
    const real = Math.atan(rel / (m.km * 1000)), d3 = 3 * Math.PI / 180;
    const ang = Math.max(2.3 * Math.PI / 180, real < d3 ? real * 1.35 : d3 * 1.35 + (real - d3) * 0.45);   // los muy lejanos, legibles
    const b = m.bearing * Math.PI / 180;
    return { ds, H: ds * Math.tan(ang), x: Math.sin(b) * ds, z: -Math.cos(b) * ds, b };
  }
  // altura a la que se asienta un monte: la media del terreno alrededor de su centro (un poco hundido, para que las
  // colinas de delante tapen el arranque como pasa de verdad)
  seat(pl) {
    let s = 0, n = 0;
    for (let k = 0; k < 9; k++) { const a = k / 8 * Math.PI * 2, r = k ? pl.H * 1.1 : 0, x = pl.x + Math.cos(a) * r, z = pl.z + Math.sin(a) * r; s += this.terrain(x, z, Math.hypot(x, z)); n++; }
    return Math.max(-20, s / n * 0.85);
  }
  // altura (0…1 dentro, negativa fuera de la falda, continua) de cada forma en coordenadas locales u (de lado) y v (de
  // frente): una máscara con la silueta general por un relieve de crestas con el dominio deformado (aristas,
  // antecimas y barrancos)
  shape(type, u, v, nz, sd) {
    const wu = u + 0.22 * (nz.fbm(u * 1.3 + sd, v * 1.3, 3) - 0.5), wv = v + 0.22 * (nz.fbm(u * 1.3, v * 1.3 + sd, 3) - 0.5);
    const D = nz.ridged(wu * 1.9 + sd, wv * 1.9 + 7, 5);   // 0…~0,9: aristas y barrancos
    // la base no es una elipse: lóbulos y entrantes según la dirección
    const th = Math.atan2(wv, wu), lobe = 1 + 0.32 * (nz.fbm(Math.cos(th) * 1.6 + sd, Math.sin(th) * 1.6 + 3, 3) - 0.5);
    // contrafuertes: costillas que bajan de la cima con barrancos entre ellas (más marcados a media ladera)
    const spur = (r) => 1 + 0.28 * (nz.ridged(Math.cos(th) * 2.2 + sd * 0.7, Math.sin(th) * 2.2 + r * 1.4, 3) - 0.45) * Math.sin(Math.PI * Math.min(1, r));
    if (type === 'sierra') {
      // cordillera lejana: una línea larga de cumbres dentadas y la principal destacando en medio
      const L = 0.7, ex = Math.max(0, Math.abs(wu) - L) / (1.05 - L), d = Math.hypot(ex, Math.abs(wv) * 1.6) / lobe;
      if (d >= 1) return -(d - 1) * 0.8;
      const prof = Math.max(Math.exp(-Math.abs(wu) * 4.5) * (0.92 + 0.08 * Math.cos(wu * 40)), (0.3 + 0.4 * nz.ridged(wu * 3.4 + sd, 1.7, 4)) * smoothstep(1.05, 0.5, Math.abs(wu)));
      return Math.pow(1 - d, 1.35) * prof * (0.62 + 0.55 * nz.ridged(wu * 5 + sd, wv * 5 + 2, 4));
    }
    if (type === 'cresta') {
      // cresta: cápsula alargada que se afila en los extremos; perfil con varias cimas
      const L = 0.5, ex = Math.max(0, Math.abs(wu) - L) / (1.05 - L), half = 0.82 - 0.18 * Math.abs(wu);
      const d = Math.hypot(ex, Math.abs(wv) * 1.25 / half) / lobe;
      if (d >= 1) return -(d - 1) * 0.8;
      const prof = 0.62 + 0.38 * Math.max(Math.exp(-((wu - 0.05) ** 2) * 8), 0.82 * Math.exp(-((wu + 0.5) ** 2) * 12), 0.88 * Math.exp(-((wu - 0.55) ** 2) * 11));
      return Math.pow(1 - d, 1.55) * prof * (0.62 + 0.62 * D) * spur(d);
    }
    const r = Math.hypot(wu - (type === 'pico' ? 0.08 : 0), wv * 1.12) / lobe;
    if (r >= 1) return -(r - 1) * 0.9;
    if (type === 'pico') {
      // pirámide de laderas cóncavas (empinada arriba, tendida abajo) con aristas, y la punta
      return Math.pow(1 - r, 1.38) * (0.62 + 0.62 * D) * spur(r) + Math.exp(-r * r * 16) * 0.05;
    }
    if (type === 'macizo') {
      // sierra caliza: falda tendida, una banda de cortados y arriba una meseta ondulada con la cima a un lado
      // los cortados no son un anillo regular: cambian de altura y de sitio alrededor, y en algunos lados no hay
      const ca = nz.fbm(Math.cos(th) * 2.4 + sd + 5, Math.sin(th) * 2.4, 3), c0 = 0.62 + (ca - 0.5) * 0.3;
      const apron = 0.46 * Math.pow(1 - r, 1.3), cliff = (0.25 + 0.5 * smoothstep(0.3, 0.6, ca)) * smoothstep(c0 + 0.13, c0 - 0.06, r), top = Math.exp(-((wu - 0.22) ** 2 + wv * wv) * 10) * 0.18;
      return (apron + cliff * (0.85 + 0.25 * nz.fbm(wu * 3 + sd, wv * 3, 4)) + 0.22 * D * smoothstep(0.2, 0.8, r) + top * smoothstep(1, 0.4, r)) * spur(r);
    }
    // loma: monte redondeado de laderas largas con barrancos y lomos, y alguna cima secundaria
    // (cima redonda, laderas altas convexas y pie cóncavo; la cumbre un poco a un lado y una antecima)
    const rl = Math.hypot(wu - 0.12, wv * 1.12) / lobe, sub = Math.exp(-((wu + 0.42) ** 2 + (wv - 0.15) ** 2) * 10) * 0.3;
    if (rl >= 1) return -(rl - 1) * 0.9;
    return (Math.pow(1 - Math.pow(rl, 1.5), 2) * (0.8 + 0.2 * nz.fbm(wu * 4 + sd, wv * 4, 4) + 0.28 * D * smoothstep(0.1, 0.6, rl)) + sub * (1 - rl)) * (1 + (spur(rl) - 1) * 1.3);
  }
  buildPeak(m, i, N) {
    const type = typeOf(m), sd = (hashStr(m.id || m.name) % 997) / 31, nz = makeNoise(31 + hashStr(m.id || m.name) % 1000), fine = makeNoise(77);
    const pl = this.place(m), base = this.seat(pl), H = pl.H, spread = { pico: 3.0, macizo: 4.6, cresta: 4.4, loma: 5.2, sierra: 9 }[type], W = H * spread, D = W * 0.7;
    const geo = new THREE.PlaneGeometry(W * 1.6, D * 1.6, N, Math.round(N * 0.8)); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, cnt = pos.count, col = new Float32Array(cnt * 3), hs = new Float32Array(cnt);
    const alt = m.altitude, tree = { pico: 0.34, cresta: 0.38, macizo: 0.42, loma: 0.62, sierra: 0.3 }[type] * Math.min(1.3, 1500 / Math.max(900, alt)) + 0.05;
    const snowLine = type === 'sierra' ? (alt >= 2200 ? 0.84 : 9) : alt >= 1950 ? 0.7 : alt >= 1700 ? 0.86 : 9;
    let hmax = 1e-6;
    for (let k = 0; k < cnt; k++) {
      const u = pos.getX(k) / (W / 2), v = pos.getZ(k) / (D / 2);
      let h = this.shape(type, u, v, nz, sd);
      if (h > 0) h += (fine.fbm(u * 9 + i * 7, v * 9, 4) - 0.5) * 0.03 * Math.min(1, h * 6);   // grano fino del relieve
      hs[k] = h; hmax = Math.max(hmax, h);
    }
    for (let k = 0; k < cnt; k++) { if (hs[k] > 0) hs[k] /= hmax; pos.setY(k, hs[k] * H - 12); }
    geo.computeVertexNormals();
    const nor = geo.attributes.normal, c = new THREE.Color(), haze = new THREE.Color().copy(this.scene.fog.color), hk = Math.min(0.22, 0.04 + m.km / 300), far = smoothstep(14, 70, m.km) * 0.45;
    for (let k = 0; k < cnt; k++) {
      const f = hs[k], slope = 1 - nor.getY(k), u = pos.getX(k) / (W / 2), v = pos.getZ(k) / (D / 2), j = nz.fbm(u * 6 + 2, v * 6, 3), q = fine.n(u * 30, v * 30);
      const rock = type === 'macizo' ? PAL.rockLime : j > 0.5 ? PAL.rockGrey : PAL.rockDark;
      // bosque abajo con claros, pastos arriba (más secos cuanto más alto), roca en lo empinado, nieve en lo alto
      const edge = tree + (j - 0.5) * 0.16;
      const glade = smoothstep(0.58, 0.66, nz.fbm(u * 4 + 9, v * 4 + 3, 3)) * smoothstep(0.15, 0.3, f);   // claros y prados entre el bosque
      if (f < edge) c.copy(PAL.forest).lerp(PAL.forest2, q * 0.7 + j * 0.3).lerp(PAL.meadow, Math.max(smoothstep(edge - 0.06, edge, f) * 0.6, glade * 0.75));
      else c.copy(PAL.meadow).lerp(PAL.meadowDry, Math.min(1, (f - edge) * 1.6));
      const steep = smoothstep(0.42, 0.66, slope + (type === 'pico' ? Math.max(0, f - 0.55) * 0.5 : 0) + (j - 0.5) * 0.12);
      c.lerp(rock, steep * (type === 'loma' ? 0.4 : 1));
      if (f > snowLine + (0.5 - j) * 0.14 && slope < 0.7) c.lerp(PAL.snow, smoothstep(snowLine, snowLine + 0.08, f) * (slope < 0.4 ? 1 : 0.65));
      c.multiplyScalar(0.92 + q * 0.16);
      c.lerp(PAL.far, far * 0.42 * (1 - Math.min(1, Math.max(0, f - snowLine + 0.1)) * 0.6));   // la lejanía azulea (menos la nieve)
      c.lerp(haze, hk * (1 - Math.min(1, Math.max(0, f)) * 0.4));   // bruma de la distancia, más en la base
      col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * W * 1.6 / 28, uv.getY(k) * D * 1.6 / 28);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: this.detail, roughness: 1, metalness: 0 }); rockShader(mat);
    const mesh = new THREE.Mesh(geo, mat); mesh.position.set(pl.x, base, pl.z); mesh.rotation.y = Math.atan2(pl.x, pl.z) + Math.PI;   // de cara al mirador
    this.scene.add(mesh); this.owned.push(geo, mat);
    let top = 0; for (let k = 1; k < cnt; k++) if (hs[k] > hs[top]) top = k;
    const sp = new THREE.Vector3(pos.getX(top), pos.getY(top), pos.getZ(top)).applyMatrix4(new THREE.Matrix4().compose(mesh.position, mesh.quaternion, new THREE.Vector3(1, 1, 1)));
    return { m, mesh, summit: sp, H, ds: pl.ds, type, b: pl.b, base, aw: Math.atan(W * 0.5 / pl.ds) };
  }
  // altura del terreno sin los montes: colinas suaves cerca (el mirador está en alto), más relieve lejos y sierras en el
  // horizonte
  terrain(x, z, R) {
    const nz = this.gnz, rough = this.rough;
    let h = (nz.fbm(x / 700, z / 700, 5) - 0.45) * 120 * smoothstep(120, 1600, R) - 20;
    h += nz.ridged(x / 2200 + 4, z / 2200, 5) * this.Hm * 0.55 * rough * smoothstep(1800, 6000, R);
    h += nz.ridged(x / 3400 + 11, z / 3400 + 5, 5) * R * 0.05 * (0.45 + 0.55 * rough) * smoothstep(3500, 8500, R);
    return h;
  }
  // terreno: en anillos alrededor del mirador (fino cerca, grueso lejos); campos y setos cerca, colinas y bosques a
  // media distancia, estribaciones que suben hacia cada monte y una línea de sierras al fondo
  buildGround(N) {
    const RINGS = N, SEG = Math.round(N * 1.8), R0 = 25, R1 = 11000, k = Math.pow(R1 / R0, 1 / (RINGS - 1));
    const pos = new Float32Array(RINGS * SEG * 3), col = new Float32Array(RINGS * SEG * 3), fl = new Float32Array(RINGS * SEG), idx = [];
    const nz = this.gnz, c = new THREE.Color(), peaks = this.peaks, rough = this.rough;
    for (let i = 0; i < RINGS; i++) {
      const R = R0 * Math.pow(k, i);
      for (let j = 0; j < SEG; j++) {
        const a = j / SEG * Math.PI * 2, x = Math.sin(a) * R, z = -Math.cos(a) * R;
        // colinas suaves cerca (el mirador está en alto), más relieve lejos y sierras en el horizonte
        let h = this.terrain(x, z, R);
        // estribaciones: el terreno sube hacia cada monte
        let near = 0;
        for (const p of peaks) { const dx = x - p.mesh.position.x, dz = z - p.mesh.position.z, w = p.H * 3.2, d = Math.hypot(dx, dz) / w; if (d < 1.4) { const f = (1 - d / 1.4) ** 2; h = Math.max(h, p.base + f * p.H * (0.1 + 0.34 * nz.ridged(x / 260 + 3, z / 260, 4)) - 10); near = Math.max(near, f); } }
        h = Math.min(h, 45 + R * 0.04);
        // nada tapa los montes: delante de cada uno el terreno abre un valle (queda por debajo de la línea que va del
        // mirador a su base) y detrás las sierras no asoman por encima de su cumbre
        for (const p of peaks) {
          let da = Math.abs(a - p.b) % (Math.PI * 2); if (da > Math.PI) da = Math.PI * 2 - da;
          const wgt = smoothstep(p.aw * 2.4, p.aw * 1.0, da); if (wgt <= 0) continue;
          const t = R / p.ds, ey = this.eye.y;
          // por encima del límite no se corta en seco: se aplasta (conserva el relieve, más bajo)
          const cap = t < 0.9 ? ey + t * (p.base + p.H * 0.14 - ey) - 4 : t > 1.4 ? ey + t * (p.base + p.H * 0.62 - ey) : Infinity;
          if (h > cap) h = h + (cap + (h - cap) * 0.22 - h) * wgt;
        }
        const v = (i * SEG + j) * 3; pos[v] = x; pos[v + 1] = h; pos[v + 2] = z;
        // colores: campos (verdes y de cereal) con setos cerca, bosques y prados más lejos, más bosque junto a los montes
        const fld = nz.n(x / 90 + 3, z / 90), hedge = Math.abs(Math.sin(x / 47 + nz.n(x / 200, z / 200) * 3)) < 0.06 || Math.abs(Math.sin(z / 53)) < 0.05;
        const j2 = nz.fbm(x / 420 + 9, z / 420, 4) + near * 0.25;
        c.copy(PAL.field2).lerp(PAL.meadow, smoothstep(0.35, 0.5, fld)).lerp(PAL.field, smoothstep(0.6, 0.72, fld));
        if (R < 2500 && hedge) c.lerp(PAL.forest2, 0.6);
        c.lerp(PAL.forest2, smoothstep(0.52, 0.62, j2)).lerp(PAL.forest, smoothstep(0.62, 0.75, j2) * nz.n(x / 60, z / 60));
        c.multiplyScalar(0.94 + nz.n(x / 25, z / 25) * 0.14);
        col[v] = c.r; col[v + 1] = c.g; col[v + 2] = c.b;
        // dónde hay parcelas (campos y prados con lindes): en lo llano, fuera del bosque y lejos de los montes
        fl[i * SEG + j] = (1 - smoothstep(0.5, 0.6, j2)) * (1 - Math.min(1, near * 1.6));
      }
    }
    for (let i = 0; i < RINGS - 1; i++) for (let j = 0; j < SEG; j++) { const a = i * SEG + j, b = i * SEG + (j + 1) % SEG, c2 = (i + 1) * SEG + j, d = (i + 1) * SEG + (j + 1) % SEG; idx.push(a, b, c2, b, d, c2); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx);
    const uv = new Float32Array(RINGS * SEG * 2); for (let q = 0; q < RINGS * SEG; q++) { uv[q * 2] = pos[q * 3] / 40; uv[q * 2 + 1] = pos[q * 3 + 2] / 40; }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.computeVertexNormals();
    geo.setAttribute('aFld', new THREE.BufferAttribute(fl, 1));
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: this.detail, roughness: 1 });
    groundShader(mat, rough);
    const m = new THREE.Mesh(geo, mat); this.scene.add(m); this.owned.push(geo, mat);
  }
  // Paisaje real: el terreno visto desde el mirador, hecho con lo que se ve de verdad en cada dirección (el máximo del
  // ángulo de elevación hasta cada distancia, «término» a término: relieve.js). Cada punto queda en su rumbo, a su
  // distancia y con su ángulo reales (algo realzado en vertical, igual para todo, para que se lean las formas): las
  // sierras se tapan unas a otras como en la realidad. Los colores salen de la altitud y la pendiente reales (campos y
  // pueblos abajo, bosque, pastos, roca y nieve arriba) y la bruma, de la distancia real.
  buildReal(R, hor, zen) {
    const S = this.scene, low = this.o.quality === 'low', E = R.edges, NE = E.length, VX = 1.0;
    // rumbos y anillos (km): siete al pie del mirador y, entre cada dos términos, cuatro o seis hasta unos 15 km (con dos
    // o tres, las laderas cercanas, que llenan el visor, eran dos planos con los colores estirados) y dos o tres más lejos
    const A = low ? 720 : 1440, rings = [0.015, 0.03, 0.05, 0.08, 0.12, 0.18, 0.24];
    for (let k = 0; k < NE - 1; k++) { const sub = E[k] < 10 ? (low ? 4 : 6) : (low ? 2 : 3); for (let q = 0; q < sub; q++) rings.push(E[k] * Math.pow(E[k + 1] / E[k], q / sub)); }
    rings.push(E[NE - 1]);
    const NR = rings.length, D2R = Math.PI / 180;
    // lo más alto que se ve hasta cada término, en cada rumbo de la malla (curva suave entre los grados de los datos)
    const Mk = E.map(() => new Float32Array(A)), cr = (p0, p1, p2, p3, t) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
    for (let k = 0; k < NE; k++) { const m = R.M[k]; for (let i = 0; i < A; i++) { const b = i * 360 / A, j = Math.floor(b), t = b - j; Mk[k][i] = cr(m[(j + 359) % 360], m[j], m[(j + 1) % 360], m[(j + 2) % 360], t); } }
    // la silueta fina de cada monte (con su cumbre a la altitud real), que sustituye a la de los datos generales
    const keep = new Float32Array(A);   // (cuánto hay que respetar la silueta: sin ruido encima)
    for (const m of this.montes) {
      const F = R.montes[m.id]; if (!F) continue;
      const lo = m.bearing - F.n * F.st, span = 2 * F.n * F.st;
      for (let i0 = Math.floor(lo * A / 360), i1 = Math.ceil((lo + span) * A / 360), ii = i0; ii <= i1; ii++) {
        const i = ((ii % A) + A) % A, x = (ii * 360 / A - lo) / F.st; if (x < 0 || x > 2 * F.n) continue;
        const j = Math.min(2 * F.n - 1, Math.floor(x)), t = x - j, v = F.prof[j] * (1 - t) + F.prof[j + 1] * t;
        const u = Math.min(x, 2 * F.n - x) / (2 * F.n), w = smoothstep(0, 0.18, u);   // (se funde con la general en los bordes)
        Mk[F.k][i] += (v - Mk[F.k][i]) * w; keep[i] = Math.max(keep[i], w);
      }
    }
    // las crestas de los datos generales salen redondeadas (un dato por grado): unos metros de rugosidad, siempre la
    // misma en cada sitio
    const rough = makeNoise(23);
    for (let k = 1; k < NE; k++) { const r = E[k] * 1000, amp = Math.atan(30 / r) / D2R * 2; for (let i = 0; i < A; i++) { const a = i * 2 * Math.PI / A; Mk[k][i] += (rough.fbm(Math.sin(a) * r / 380 + k * 3.1, -Math.cos(a) * r / 380, 3) - 0.47) * amp * (1 - keep[i]); } }
    // (en los términos cercanos, un suavizado entre rumbos vecinos: allí los datos van en escalones de casi un grado, unos
    // 5 m de altura entre rumbo y rumbo, y cada columna de la malla subía o bajaba a saltos: rayas verticales en la luz y
    // en los colores. Más ancho cuanto más cerca, salvo en la silueta fina de los montes)
    const SIG = [3, 1.6, 0.8, 0.45, 0.3, 0.2];   // (grados)
    for (let k = 0; k < NE && k < SIG.length; k++) {
      const sg = SIG[k] * A / 360, hw = Math.ceil(sg * 2.5), wk = []; let ws = 0;
      for (let q = -hw; q <= hw; q++) { wk.push(Math.exp(-q * q / (2 * sg * sg))); ws += wk[wk.length - 1]; }
      const m = Mk[k], c = m.slice();
      for (let i = 0; i < A; i++) { let acc = 0; for (let q = -hw; q <= hw; q++) acc += c[(i + q + A) % A] * wk[q + hw]; m[i] = c[i] + (acc / ws - c[i]) * (1 - keep[i]); }
    }
    for (let i = 0; i < A; i++) for (let k = 1; k < NE; k++) if (Mk[k][i] < Mk[k - 1][i]) Mk[k][i] = Mk[k - 1][i];
    // vértices: posición en la escena, altitud y pendiente reales
    const cnt = A * NR, pos = new Float32Array(cnt * 3), alt = new Float32Array(cnt), dist = new Float32Array(cnt), th = new Float32Array(cnt), band = new Float32Array(cnt), rise = new Float32Array(cnt);
    const nz = makeNoise(11), ey = 0, curv = (r) => r * r * 0.87 / (2 * 6371000);
    for (let j = 0; j < NR; j++) {
      const rk = rings[j], r = rk * 1000; let k = 0; while (k < NE - 2 && E[k + 1] < rk) k++;
      const t = rk <= E[0] ? 0 : Math.min(1, Math.log(rk / E[k]) / Math.log(E[k + 1] / E[k]));
      for (let i = 0; i < A; i++) {
        const a = i * 2 * Math.PI / A, v = j * A + i;
        let deg;
        if (rk < E[0]) {
          // al pie del mirador: una ladera suave desde el suelo, unos metros por debajo de los ojos, hasta el primer
          // término, con algún bulto
          const a0 = -14, a1 = E[0] * 1000 * Math.tan(Mk[0][i] * D2R), u = rk / E[0];
          deg = Math.atan((a0 + (a1 - a0) * u + 6 * (nz.n(Math.sin(a) * r / 35 + 7, -Math.cos(a) * r / 35) - 0.5) * Math.sin(Math.PI * u)) / r) / D2R;
        } else deg = Mk[k][i] + (Mk[k + 1][i] - Mk[k][i]) * Math.pow(t, 1.6);   // (la ladera, hacia el fondo del término)
        const x = Math.sin(a) * r, z = -Math.cos(a) * r;
        th[v] = deg; dist[v] = r; band[v] = rk < E[0] ? r : Math.sqrt(E[k] * E[k + 1]) * 1000; rise[v] = rk < E[0] ? 0 : Mk[k + 1][i] - Mk[k][i];
        const tn = Math.tan(deg * D2R);
        alt[v] = R.alt + r * tn + curv(r);
        pos[v * 3] = x; pos[v * 3 + 1] = ey + r * Math.tan(deg * VX * D2R); pos[v * 3 + 2] = z;
      }
    }
    const idx = new Uint32Array((NR - 1) * A * 6); let n = 0;
    for (let j = 0; j < NR - 1; j++) for (let i = 0; i < A; i++) {
      const a = j * A + i, b = j * A + (i + 1) % A, c = (j + 1) * A + i, d = (j + 1) * A + (i + 1) % A;
      idx[n++] = a; idx[n++] = b; idx[n++] = c; idx[n++] = b; idx[n++] = d; idx[n++] = c;
    }
    // pendiente real (a partir de las altitudes de los vecinos, de frente: entre rumbos vecinos lo tapado engaña), suavizada
    // entre rumbos vecinos como las normales
    const col = new Float32Array(cnt * 3), slope = new Float32Array(cnt), fld = new Float32Array(cnt), fo = new Float32Array(cnt), wt = new Float32Array(cnt), c = new THREE.Color(), lat0 = R.lat;
    { const s0 = new Float32Array(cnt), W = [1, 2, 3, 2, 1];
      for (let j = 0; j < NR; j++) for (let i = 0; i < A; i++) {
        const jr = Math.min(NR - 1, j + 1), jl = Math.max(0, j - 1), dr = Math.max(1, dist[jr * A + i] - dist[jl * A + i]);
        s0[j * A + i] = Math.abs((alt[jr * A + i] - alt[jl * A + i]) / dr);
      }
      for (let j = 0; j < NR; j++) for (let i = 0; i < A; i++) { let a = 0; for (let q = -2; q <= 2; q++) a += s0[j * A + (i + q + A) % A] * W[q + 2]; slope[j * A + i] = a / 9; } }
    // los colores de los vértices, solo con lo que cambia despacio (altitud, pendiente, clima): las manchas, el brillo y la
    // nieve, por píxel en el material (en los vértices, con los triángulos tan largos de la lejanía, salían rayas verticales
    // y la nieve en recortes)
    const P = { field: C('#b0a065'), meadow: C('#7a8c4e'), alpine: C('#9c9a64'), rock: C('#9a958c'), lime: C('#bdb6a8') };
    for (let j = 0; j < NR; j++) for (let i = 0; i < A; i++) {
      const v = j * A + i, r = dist[v], s = slope[v];
      const h = alt[v], a = i * 2 * Math.PI / A, x = Math.sin(a) * r, z = -Math.cos(a) * r;
      // clima: más verde al norte (vertiente atlántica) que en el sur (Ribera y Zona Media)
      const lat = lat0 + (-z / 1000) / 111.2, wet = smoothstep(42.55, 43.0, lat + (nz.n(x / 9000, z / 9000) - 0.5) * 0.15);
      // abajo: campos en lo llano, y bosque o pasto en las laderas
      const flat = 1 - smoothstep(0.12, 0.3, s);
      c.copy(P.field).lerp(P.meadow, wet * 0.7);
      // bosque: aquí solo cuánto le va al sitio (más en las laderas, en lo húmedo y a media altura; nada por encima de
      // unos 1.500 m); las manchas de bosque y de prado, con su borde, las pinta el material
      const forestK = Math.min(1, Math.max(0, 0.3 + (1 - flat) * 0.3 + wet * 0.2 + smoothstep(500, 1000, h) * 0.15 - smoothstep(1350, 1650, h) * 1.3));
      // arriba, pasto de montaña; roca en lo empinado y en lo más alto
      c.lerp(P.alpine, smoothstep(1350, 1650, h));
      const rockK = Math.max(smoothstep(0.55, 0.9, s) * smoothstep(400, 900, h), smoothstep(1650, 2000, h) * 0.85);
      c.lerp(h > 1000 && wet < 0.7 ? P.lime : P.rock, rockK);
      col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b; wt[v] = wet;
      // (las parcelas, en el llano de verdad: no en una ladera que sube más de un grado en su término)
      fld[v] = flat * (1 - forestK * 0.6) * (1 - smoothstep(900, 1300, h)) * (1 - smoothstep(0.6, 1.5, rise[v])); fo[v] = forestK;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aAlt', new THREE.BufferAttribute(alt, 1)); geo.setAttribute('aSlope', new THREE.BufferAttribute(slope, 1)); geo.setAttribute('aFld', new THREE.BufferAttribute(fld, 1)); geo.setAttribute('aFor', new THREE.BufferAttribute(fo, 1)); geo.setAttribute('aWet', new THREE.BufferAttribute(wt, 1)); geo.setAttribute('aBand', new THREE.BufferAttribute(band, 1));
    geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.computeVertexNormals();
    // (las normales, suavizadas entre rumbos vecinos: donde una columna sube y la de al lado queda tapada, la luz hacía
    // rayas verticales)
    { const nr = geo.attributes.normal.array, src = nr.slice(), W = [1, 2, 3, 2, 1];
      for (let j = 0; j < NR; j++) for (let i = 0; i < A; i++) { let x = 0, y = 0, z = 0; for (let q = -2; q <= 2; q++) { const o = (j * A + (i + q + A) % A) * 3, w = W[q + 2]; x += src[o] * w; y += src[o + 1] * w; z += src[o + 2] * w; } const l = Math.hypot(x, y, z) || 1, o = (j * A + i) * 3; nr[o] = x / l; nr[o + 1] = y / l; nr[o + 2] = z / l; } }
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    realShader(mat, this.o.haze ?? 1, this.o.snow ? 1100 : 2150);
    // la escena: el cielo más grande que todo el paisaje, la bruma a escala real (la pone el material) y los ojos en 0
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; S.add(mesh); this.owned.push(geo, mat); this.realMesh = mesh;
    this.real = true; this.eye.set(0, 0, 0);
    // (con el sol muy alto el relieve no se lee: como mucho a 35° sobre el horizonte, en su mismo rumbo)
    const sunL = S.children.find(c => c.isDirectionalLight);
    if (sunL) { const d = sunL.position.clone().normalize(), e = Math.sin(35 * D2R); if (d.y > e) { const hz = Math.hypot(d.x, d.z); if (hz < 1e-3) d.set(0, e, Math.cos(35 * D2R)); else d.set(d.x / hz * Math.cos(35 * D2R), e, d.z / hz * Math.cos(35 * D2R)); } sunL.position.copy(d.multiplyScalar(1000)); }
    const cam = this.camera; cam.near = 20; cam.far = 260000; cam.updateProjectionMatrix();
    const sky = S.children.find(c => c.isMesh && c !== mesh); if (sky) sky.scale.setScalar(20);
    S.fog = new THREE.Fog(hor.clone().lerp(zen, 0.3).multiplyScalar(0.93), 1, 2);
    // las cumbres de los montes de la misión: en su rumbo, a su distancia y con su ángulo reales
    this.peaks = this.montes.map((m) => {
      const F = R.montes[m.id], r = m.km * 1000;
      const bd = F ? m.bearing + F.j * F.st : m.bearing, b = bd * D2R, i = Math.round(bd * A / 360 + A) % A;
      const deg = F ? F.prof[F.j + F.n] : Mk[NE - 1][i], below = F ? Mk[Math.max(0, F.k - 1)][i] : Mk[0][i];
      const y = ey + r * Math.tan(deg * VX * D2R);
      const summit = new THREE.Vector3(Math.sin(b) * r, y, -Math.cos(b) * r);
      return { m, mesh, summit, H: r * Math.tan(Math.max(0.4, deg - below) * VX * D2R), ds: r, type: 'real', b, base: 0, aw: Math.atan(3000 / r) };
    });
  }
  // Paisaje con el relieve de detalle (miradorReal.js): el terreno de verdad hasta 110 km, los montes de la misión en su
  // cumbre real, el nombre de los demás montes conocidos que se ven y aves volando delante
  buildPolar(G, hor, zen) {
    const S = this.scene, low = this.o.quality === 'low', grid = this.grid = new PolarGrid(G, low), D2R = Math.PI / 180;
    const mat = polarMaterial({ eyeAlt: grid.alt, lat: grid.lat, haze: this.o.haze ?? 1, snow: this.o.snow ? 1150 : 9000, hazeColor: hor.clone().lerp(zen, 0.25).multiplyScalar(0.95) });
    const meshes = this.sectors = grid.meshes(mat); for (const m of meshes) { S.add(m); this.owned.push(m.geometry); } this.owned.push(mat);
    this.real = true; this.eye.set(0, 0, 0); S.fog = null;
    // la luz: el sol entre unos 12° y 35° sobre el horizonte (muy alto, el relieve no se lee; muy bajo, todo a oscuras), y
    // menos luz del cielo para que los lomos y las laderas en sombra se distingan
    const sunL = S.children.find(c => c.isDirectionalLight), hemi = S.children.find(c => c.isHemisphereLight);
    if (sunL) {
      const d = sunL.position.clone().normalize(), hz = Math.hypot(d.x, d.z) || 1, el = Math.min(35, Math.max(12, Math.asin(Math.max(-1, Math.min(1, d.y))) / D2R)) * D2R;
      d.set(d.x / hz * Math.cos(el), Math.sin(el), d.z / hz * Math.cos(el)); if (Math.hypot(d.x, d.z) < 1e-3) d.set(0, Math.sin(el), Math.cos(el));
      sunL.position.copy(d.multiplyScalar(1000)); sunL.intensity = 2.6;
    }
    if (hemi) hemi.intensity = 1.3;
    const cam = this.camera; cam.near = 20; cam.far = 150000; cam.updateProjectionMatrix();
    const sky = S.children.find(c => c.isMesh && !meshes.includes(c)); if (sky) sky.scale.setScalar(12);
    // los montes de la misión: en su cumbre real (lo más alto del relieve junto a sus coordenadas), vistos desde este ojo
    // (polar.py lo pone donde se ven todos: puede estar algo apartado del de relieve.js)
    const byId = new Map((this.o.conocidos || []).map(m => [m.id, m]));
    this.peaks = this.montes.map((m) => {
      const k = byId.get(m.id), at = k ? rel(grid.lat, grid.lon, k.lat, k.lon) : { bearing: m.bearing, km: m.km }, c = grid.summit(at.bearing, at.km);
      return { m, summit: grid.pos(c.b, c.r, c.h), H: 200, ds: c.r * 1000, type: 'real', b: c.b * D2R };
    });
    // los demás montes conocidos que se ven, con su nombre
    const skip = new Set(this.montes.map(m => m.id));
    this.labels = montesVisibles(grid, this.o.conocidos || [], skip).map((v) => {
      const L = labelTex(v.m.name, v.m.altitude), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: L.tex, depthTest: false, transparent: true, fog: false }));
      sp.center.set(0.5, 0); sp.renderOrder = 15; sp.visible = false; S.add(sp); this.owned.push(L.tex, sp.material);
      return { ...v, sp, w: L.w, h: L.h, at: grid.pos(v.b, v.r, v.h) };
    });
    // aves de la comarca
    this.birds = panoBirds(S, grid, this.o.birds?.length ? this.o.birds : ['buitre', 'milano'], low ? 5 : 8);
  }
  /** Mueve las aves (cada fotograma, con los prismáticos puestos). */
  update(dt) { this.t = (this.t || 0) + dt; if (this.birds) moveBirds(this.birds, dt, this.t); }
  /** Las aves que se pueden anotar con los prismáticos. */
  birdObs() { return (this.birds || []).map(v => ({ id: v.id, pos: v.obj.position, h: 0, far: true, pano: true, obj: v.obj })); }
  /**
   * Coloca los rótulos de los montes: del mismo tamaño en la pantalla, sin pisarse entre ellos ni con las marcas (pins) ni
   * con el anillo del visor; el de una cumbre que entra en el anillo sube por encima de él.
   */
  placeLabels(pins = []) {
    if (!this.labels) return;
    const cam = this.camera, W = innerWidth, H = innerHeight, wpp = 2 * Math.tan(cam.fov * Math.PI / 360) / H, v = new THREE.Vector3();
    const rectOf = (sp) => { v.copy(sp.position).project(cam); const px = wpp * sp.position.length(), w = sp.scale.x / px, h = sp.scale.y / px, sx = (v.x + 1) / 2 * W, sy = (1 - v.y) / 2 * H; return { x: sx - w * sp.center.x, y: sy - h * (1 - sp.center.y), w, h }; };
    const used = [{ x: W / 2 - 48, y: H / 2 - 48, w: 96, h: 96 }, ...pins.filter(p => p.visible !== false).map(rectOf)];
    // (dentro de los círculos del visor: la máscara de ui.js, viewBox 160 × 100 recortado a la pantalla)
    const ms = Math.max(W / 160, H / 100), inside = (x, y) => [58, 102].some(cx => Math.hypot(x - (W / 2 + (cx - 80) * ms), y - H / 2) < 36 * ms - 6);
    const hit = (a) => used.some(r => a.x < r.x + r.w && r.x < a.x + a.w && a.y < r.y + r.h && r.y < a.y + a.h);
    for (const L of this.labels) {
      v.copy(L.at).project(cam);
      if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) { L.sp.visible = false; continue; }
      const sx = (v.x + 1) / 2 * W, sy = (1 - v.y) / 2 * H, dpx = Math.hypot(sx - W / 2, sy - H / 2);
      const hp = 54, wp = hp * L.w / L.h, gap = dpx < 110 ? 50 * (1 - Math.max(0, (dpx - 40) / 70)) : 0;
      const r = { x: sx - wp / 2, y: sy - gap - hp, w: wp, h: hp * 0.66 };   // (la raya de abajo puede cruzar otras cosas)
      if (hit(r) || !inside(r.x, r.y) || !inside(r.x + r.w, r.y) || !inside(r.x, r.y + r.h) || !inside(r.x + r.w, r.y + r.h)) { L.sp.visible = false; continue; }
      used.push(r); L.sp.visible = true;
      const px = wpp * L.at.length(); L.sp.scale.set(wp * px, hp * px, 1); L.sp.position.copy(L.at); L.sp.position.y += gap * px;
    }
  }
  /** Mira con el ángulo de los prismáticos (yaw como en el juego: dirección (sin yaw, cos yaw)). */
  look(yaw, pitch, fov) {
    const c = this.camera, e = this.eye;
    c.fov = fov; c.aspect = innerWidth / innerHeight; c.updateProjectionMatrix();
    c.position.copy(e); c.lookAt(e.x + Math.sin(yaw) * Math.cos(pitch), e.y + Math.sin(pitch), e.z + Math.cos(yaw) * Math.cos(pitch));
    // (del relieve de detalle, solo los sectores que caen en el visor: su rumbo cerca del de la mirada, con el ancho del
    // visor, que se abre al mirar hacia abajo o hacia arriba)
    if (this.sectors) {
      const hv = fov * Math.PI / 360, hw = Math.atan(Math.tan(hv) * c.aspect / Math.max(0.2, Math.cos(Math.min(1.35, Math.abs(pitch) + hv)))), brg = Math.PI - yaw;
      for (const m of this.sectors) { const d = Math.abs(Math.atan2(Math.sin(m.userData.b - brg), Math.cos(m.userData.b - brg))); m.visible = d < hw + m.userData.hw + 0.06; }
    }
  }
  dispose() { for (const o of this.owned) o.dispose(); }
}
