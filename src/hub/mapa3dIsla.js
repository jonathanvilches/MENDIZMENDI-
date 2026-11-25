// La isla flotante: lo que lleva la comarca elegida en el mapa del inicio cuando sube y se separa de Navarra, como en las
// imágenes que pasó el autor el 13 de noviembre de 2026: una tierra que flota en un cielo azul con nubes, con una capa gruesa
// de césped en el canto y debajo tierra parda con piedras y terrones, que se va cerrando hasta una punta roma (con
// poca tierra: el autor la quería menos honda). Debajo, el hueco que deja en Navarra es el cráter de donde se arrancó: paredes
// de tierra y roca oscura y un lago en el fondo, donde cae el agua de los ríos por el borde de la isla y por el del hueco; y
// se desprenden piedras y polvo sin parar. Las texturas de la roca y del césped, de Higgsfield (src/assets/isla). Se hace la
// primera vez que se elige la comarca (mapa3d.js).
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ruidoV, S, CX, CY } from './mapa3dFormas.js';
import { TONO_ORTO, NUBES, ORTO_FUERA } from './mapa3dSombreadores.js';
// (la panza, desde el 15 de noviembre de 2026: tierra parda con piedras y terrones, raíces y algo de musgo, como la
// segunda referencia del autor, una isla con cascada; generada con Higgsfield con la cuenta del autor, repetible y con sus
// normales sacadas de su propia luz, tools/islas/tierra-roca.py. Antes, una caliza clara con surcos que bajaban, que de
// lejos se leía como rayas verticales estiradas; sigue en la carpeta sin cargarse, como la de Poly Haven)
import CALIZA_T from '../assets/isla/tierra-roca.webp?url';
import CALIZA_N from '../assets/isla/tierra-roca-n.webp?url';
import ESTRATOS_T from '../assets/isla/estratos.webp?url';
import ESTRATOS_N from '../assets/isla/estratos-n.webp?url';
// (el borde: el fleco de hierba y musgo que cuelga, la tierra con raíces de debajo y la hierba vista de arriba; y la caliza
// de la panza. Generadas con Higgsfield con la cuenta del autor el 14 de noviembre de 2026 y hechas repetibles con
// tools/islas/texturas-borde.py)
import COLGANTE_T from '../assets/isla/colgante.webp?url';
import TIERRA_T from '../assets/isla/tierra.webp?url';
import HIERBA_T from '../assets/isla/hierba.webp?url';
// (el musgo de la panza, desde el 15 de noviembre de 2026: cojines de musgo con helechos pequeños, generado con Higgsfield con
// la cuenta del autor a partir de su tercera referencia, una isla con la roca cubierta de musgo; tools/islas/musgo.py)
import MUSGO_T from '../assets/isla/musgo.webp?url';
import MUSGO_N from '../assets/isla/musgo-n.webp?url';

const rnd = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const lerp = (a, b, k) => a + (b - a) * k;
const C = (h) => new THREE.Color(h);
const CALIZA = C('#ffffff'), HONDO = C('#8e8478'), TIERRA_ARRIBA = C('#7a5c42');
// (el cielo: azul intenso arriba y claro junto al horizonte, como en las imágenes del autor)
// (14 de noviembre de 2026, el autor: «el color del cielo sigue estando como nublado, muy claro; que sea más oscuro, más
// azul, más vivo». Un azul hondo arriba, vivo enseguida, y el horizonte también azul, no blanquecino)
export const CIELO_ARRIBA = C('#0a4cc2'), CIELO_MEDIO = C('#1d7ce8'), CIELO_HORIZONTE = C('#5cb0f4');
const LUZ = new THREE.Vector3(-0.6, 0.35, 0.72).normalize();   // (de la izquierda, por delante y algo alta, con contraste)

/** Las texturas de la isla, una vez por mapa: fotos de roca de verdad, repetibles, con su relieve (mapa de normales), de
 *  Poly Haven (CC0): la caliza clara con estrías verticales de la panza («Marble Cliff 04») y la roca en estratos de las
 *  paredes del hueco («Cliff Side»); y la tira de césped con su tierra (con transparencia, de Higgsfield). */
export function texturasIsla(aniso = 4) {
  const L = new THREE.TextureLoader(), t = (u, rep, color = true) => { const x = L.load(u); x.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace; x.wrapS = THREE.RepeatWrapping; x.wrapT = rep ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping; x.anisotropy = aniso; return x; };
  const caliza = t(CALIZA_T, true), calizaN = t(CALIZA_N, true, false), estratos = t(ESTRATOS_T, true), estratosN = t(ESTRATOS_N, true, false);
  const colgante = t(COLGANTE_T, false), tierra = t(TIERRA_T, false), hierba = t(HIERBA_T, true);   // (las tiras, repetidas solo a lo largo del borde)
  const musgo = t(MUSGO_T, true), musgoN = t(MUSGO_N, true, false);
  const todas = [caliza, calizaN, estratos, estratosN, colgante, tierra, hierba, musgo, musgoN];
  return { caliza, calizaN, estratos, estratosN, colgante, tierra, hierba, musgo, musgoN, dispose() { for (const x of todas) x.dispose(); } };
}

// (la roca con luz de verdad: el color de la foto, su relieve con el mapa de normales y la luz de la isla, un sol de lado y
// la luz del cielo y la que rebota del suelo; los colores de los vértices ponen la sombra de lo hondo. Como la luz va en la
// isla, no le afectan las luces del mapa, que la dejaban negra por debajo)
// (aTope: lo que sube la roca de la isla junto al borde para empezar justo bajo el césped, en cada punto del contorno: x,
// con la orilla aún sin bajar; y, ya bajada. uTopeK, lo que se estira el relieve; uTopeI, cuánto ha bajado la orilla;
// uTopeD, hasta qué hondura llega, menguando)
const ROCA_VS = `attribute vec2 aTope; uniform float uTopeK, uTopeI, uTopeD; varying vec2 vUv; varying vec3 vCol, vW, vN;
#ifdef SUELO
attribute vec2 aS; attribute float aH; varying vec2 vS; varying float vH;
#endif
#include <fog_pars_vertex>
void main() { vUv = uv; vCol = color; vec3 p0 = position;
#ifdef SUELO
  vS = aS; vH = aH;
#endif
  if (uTopeK > 0.0) { float f = 1.0 - smoothstep(0.0, uTopeD, -position.y); p0.y += max(0.0, mix(aTope.x, aTope.y, uTopeI)) * uTopeK * f * f; }
  vec4 w = modelMatrix * vec4(p0, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
  vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`;
const ROCA_FS = `uniform sampler2D uMap, uNor, uMusgoT, uMusgoN; uniform vec3 uLuz, uCieloC, uSueloC, uTinte, uMusgoC; uniform float uSol, uAmb, uNorK, uVar, uNiebla, uMusgo, uEscT, uMusgoTK, uHumus;
varying vec2 vUv; varying vec3 vCol, vW, vN;
#include <fog_pars_fragment>
float h1(float p) { return fract(sin(p * 127.1) * 43758.5453); }
float n1(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h1(i), h1(i + 1.0), f); }
float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); float a = h1(i.x + i.y * 57.0), b = h1(i.x + 1.0 + i.y * 57.0), c = h1(i.x + (i.y + 1.0) * 57.0), d = h1(i.x + 1.0 + (i.y + 1.0) * 57.0); return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
#ifdef SUELO
// (el suelo de la comarca, como lo pinta su terreno: la isla, de una sola pieza. Lo de arriba de la panza es el mismo prado
// que dobla sobre el borde y baja; mapa3dSombreadores.js RELIEVE_FS y el labio de antes)
uniform sampler2D uOrto, uOrtoD, uSombra; uniform vec4 uOrtoR, uDetRect, uRect; uniform float uOrtoK, uOrtoDK, uListo, uCerca, uTex, uGrosor, uExa, uHierbaK, uTintK, uGris, uBrillo; uniform vec3 uTinteS;
varying vec2 vS; varying float vH;
${NUBES}${TONO_ORTO}${ORTO_FUERA}
vec3 suelo(vec2 p, float h, float b) {
  vec2 sv = p / ${S.toFixed(1)} + vec2(${CX.toFixed(1)}, ${CY.toFixed(1)});
  vec2 ou = (sv - uOrtoR.xy) / uOrtoR.zw; vec3 o = ortoFuera(texture2D(uOrto, ou, b).rgb, sv, ou);
  if (uOrtoDK > 0.0) { vec2 dq = (sv - uDetRect.xy) / uDetRect.zw; o = mix(o, texture2D(uOrtoD, dq, b).rgb, uOrtoDK * enCuadro(dq, 0.012)); }
  float s = mix(1.0, texture2D(uSombra, (sv - uRect.xy) / uRect.zw, b).r * 1.7, uListo);
  s = s < 1.0 ? 1.0 + (s - 1.0) * 1.25 : 1.0 + (s - 1.0) * 0.62; s += 0.22 * (1.0 - smoothstep(0.0, 0.7, s));
  vec3 c = mix(vec3(0.42, 0.55, 0.3) * s, tonoOrto(o) * (1.0 + (s - 1.0) * 0.7), uOrtoK);
  if (uCerca > 0.0 && uTex > 0.0) c *= 1.0 + (n2(sv * 18.0) * 0.6 + n2(sv * 55.0) * 0.4 - 0.5) * 0.14 * uCerca;
  float m = max(0.0, (h - uGrosor) / uExa), nv = smoothstep(1250.0, 1480.0, m + (n2(sv * 0.35) - 0.5) * 170.0) * 0.72;
  c = mix(c, vec3(0.93, 0.95, 1.0) * clamp(0.5 + 0.48 * s, 0.62, 1.12), nv);
  return acabado(c); }
#endif
vec3 relieve(vec3 n, vec3 p, vec2 uv, vec3 tn) {
  vec3 q0 = dFdx(p), q1 = dFdy(p); vec2 st0 = dFdx(uv), st1 = dFdy(uv);
  vec3 a = cross(q1, n), b = cross(n, q0), T = a * st0.x + b * st1.x, B = a * st0.y + b * st1.y;
  float d = max(dot(T, T), dot(B, B)), s = d == 0.0 ? 0.0 : inversesqrt(d);
  return normalize(T * (tn.x * s) + B * (tn.y * s) + n * tn.z); }
void main() {
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  vec2 tuv = vUv * uEscT;   // (uEscT: la foto, más grande o más pequeña; la roca de la isla, al doble, con formas grandes)
  vec3 tn = texture2D(uNor, tuv).xyz * 2.0 - 1.0; vec3 alb = texture2D(uMap, tuv).rgb;
  // (sin mosaico: con uVar, la misma foto a otra escala y corrida, mezclada a manchas grandes; si no, sus grietas se repetían
  // en fila por toda la panza)
  if (uVar > 0.0) { vec2 q = vUv * 0.13; vec2 i = floor(q), f = fract(q); f = f * f * (3.0 - 2.0 * f);
    float h00 = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5), h10 = fract(sin(dot(i + vec2(1, 0), vec2(127.1, 311.7))) * 43758.5), h01 = fract(sin(dot(i + vec2(0, 1), vec2(127.1, 311.7))) * 43758.5), h11 = fract(sin(dot(i + vec2(1, 1), vec2(127.1, 311.7))) * 43758.5);
    float m = smoothstep(0.3, 0.7, mix(mix(h00, h10, f.x), mix(h01, h11, f.x), f.y)) * uVar; vec2 uv2 = tuv * vec2(0.61, 0.53) + vec2(0.37, 0.71);
    alb = mix(alb, texture2D(uMap, uv2).rgb, m); tn = mix(tn, texture2D(uNor, uv2).xyz * 2.0 - 1.0, m); }
  // (el musgo: el césped de arriba no acaba en una raya, baja por la roca en lenguas desiguales y mechones que cuelgan,
  // como en las islas de la referencia del autor; uMusgo, hasta dónde baja como mucho, en unidades del mapa. vUv va en
  // partes de 2,4 unidades: x, a lo largo del borde; y, lo hondo. Desde el 15 de noviembre de 2026, con la tercera
  // referencia, una isla con la roca cubierta de musgo: más largo, con hebras que cuelgan en las puntas, manchas en las
  // repisas que miran arriba y la foto de musgo en cojines (uMusgoT), más oscuro que el césped del labio y, en muchos
  // sitios, con una franja de tierra a la sombra justo debajo de él: así sigue leyéndose dónde acaba la tierra)
  float m = 0.0, som = 0.0; vec3 mt = vec3(0.0);
  if (uMusgo > 0.0) { float x = vUv.x * 2.4, dep = vUv.y * 2.4;
    float lim = uMusgo * (0.22 + 0.55 * n1(x * 1.1 + 7.0) + 0.5 * pow(n1(x * 4.3 + 2.0), 3.0) + 0.25 * pow(n1(x * 13.0), 4.0));
    float heb = n1(x * 47.0 + 3.0), lim2 = lim * (1.0 + 0.32 * pow(heb, 4.0));
    m = 1.0 - smoothstep(lim * 0.8, lim, dep);
    m = max(m, (1.0 - smoothstep(lim * 0.9, lim2, dep)) * smoothstep(0.45, 0.75, heb));
    m *= max(smoothstep(0.06, 0.3, dep), smoothstep(0.55, 0.75, n1(x * 1.7 + 3.0)));
    // (a matas, con la roca asomando entre ellas, sobre todo hacia abajo: si no, era un faldón verde seguido)
    float mata = n2(vec2(x * 1.9, dep * 1.6)) * 0.55 + n2(vec2(x * 5.3 + 1.7, dep * 4.2)) * 0.45;
    m *= mix(1.0, smoothstep(0.32, 0.52, mata), smoothstep(0.15, 0.6, dep / max(lim, 0.01)));
    m = max(m, 0.7 * smoothstep(0.72, 0.9, n1(x * 2.2 + dep * 1.7) * n1(dep * 2.9 - x * 0.7 + 5.0) * 1.6) * (1.0 - smoothstep(uMusgo * 0.9, uMusgo * 1.8, dep)));
    m = max(m, smoothstep(0.15, 0.55, n.y) * smoothstep(0.35, 0.6, n1(x * 3.1 + dep * 2.3 + 9.0)) * (1.0 - smoothstep(uMusgo * 1.2, uMusgo * 2.2, dep)));
    som = smoothstep(lim * 0.97, lim * 1.05, dep) * (1.0 - smoothstep(lim * 1.05, lim * 1.4, dep));   // (la roca, a la sombra del musgo que asoma)
    if (uMusgoTK > 0.0) { vec2 mu = vUv * 2.6, mu2 = mu * 0.57 + vec2(0.31, 0.77); float mv = smoothstep(0.35, 0.65, n1(x * 0.7 + 1.3) * 0.5 + n1(dep * 0.9 + 4.0) * 0.5);
      mt = mix(texture2D(uMusgoT, mu).rgb, texture2D(uMusgoT, mu2).rgb, mv);
      tn = mix(tn, mix(texture2D(uMusgoN, mu).xyz, texture2D(uMusgoN, mu2).xyz, mv) * 2.0 - 1.0, m * uMusgoTK); } }
  // (la tierra de arriba, desde el 17 de noviembre de 2026: bajo la hierba, una capa de tierra negra con su grano, de
  // grosor desigual, antes de la roca; uHumus, lo que baja de media, en unidades del mapa. Así se lee que la isla es un
  // pedazo de suelo arrancado y no una roca con césped encima)
  float hm = 0.0;
  if (uHumus > 0.0) { float x = vUv.x * 2.4, dep = vUv.y * 2.4;
    float lim = uHumus * (0.5 + 0.65 * n1(x * 1.3 + 11.0) + 0.4 * pow(n1(x * 5.1 + 4.0), 2.0) + 0.25 * pow(n1(x * 17.0 + 1.0), 3.0));
    hm = 1.0 - smoothstep(lim * 0.8, lim * 1.05, dep); tn.xy *= 1.0 + hm * 0.6; }
  tn.xy *= uNorK; n = relieve(n, vW, tuv, tn);
  float lt = dot(alb, vec3(0.3, 0.59, 0.11));
  alb *= vCol * uTinte;
  alb = mix(alb, alb * vec3(0.42, 0.34, 0.27) + vec3(0.012, 0.008, 0.004), hm);
  // (el musgo, más oscuro que el césped del labio, y más en sus huecos)
  if (uMusgo > 0.0) { vec3 mc = mix(uMusgoC * (0.55 + 1.6 * lt), mt * (0.5 + 0.35 * smoothstep(0.0, 0.35, dot(mt, vec3(0.3, 0.59, 0.11)))), uMusgoTK); alb = mix(alb * (1.0 - 0.35 * som), mc, m * 0.96); }
  vec3 luz = mix(uSueloC, uCieloC, n.y * 0.5 + 0.5) * uAmb + vec3(1.0, 0.95, 0.86) * max(0.0, dot(n, uLuz)) * uSol;
  gl_FragColor = linearToOutputTexel(vec4(alb * luz, 1.0));
#ifdef SUELO
  // (el prado de arriba dobla sobre el borde y baja por la panza en lenguas desiguales, con mechones más largos aquí y allá,
  // y se va oscureciendo al meterse bajo el filo; debajo, la tierra (uHumus) y luego la roca. Sin raya entre la hierba y la
  // tierra, y con el color de la ortofoto de ese trozo de borde, el mismo que el terreno de encima)
  { float x = vUv.x * 2.4, dep = vUv.y * 2.4;
    float lim = uHierbaK * (0.3 + 0.75 * n1(x * 1.15 + 3.7) + 0.5 * pow(n1(x * 4.6 + 1.3), 3.0) + 0.3 * pow(n1(x * 14.0 + 8.1), 4.0));
    float heb = n1(x * 52.0 + 2.0), lim2 = lim * (1.0 + 0.45 * pow(heb, 3.0));
    float gk = max(1.0 - smoothstep(lim * 0.72, lim, dep), (1.0 - smoothstep(lim * 0.9, lim2, dep)) * smoothstep(0.55, 0.85, heb));
    gk *= 0.55 + 0.45 * smoothstep(0.25, 0.55, n2(vec2(x * 3.1, dep * 6.0)) * 0.6 + n2(vec2(x * 11.0, dep * 17.0)) * 0.4 + (1.0 - dep / max(lim, 0.01)) * 0.6);
    // (la cara de dentro de la primera franja de la panza, que se mete bajo el filo: desde arriba asomaba por fuera del
    // terreno como una raya parda fina a lo largo de todo el borde; es prado, el mismo que el de encima)
    if (gl_FrontFacing) gk = max(gk, 1.0 - smoothstep(uHierbaK * 0.9, uHierbaK * 1.5, dep));
    if (gk > 0.003) { vec3 ng = normalize(vN); if (!gl_FrontFacing) ng = -ng;
      // (el color, del borde de su columna, pero algo movido a matas y difuminado: tomado tal cual, cada columna bajaba con
      // el color de su punto del borde y la hierba de lado salía a rayas verticales)
      vec2 jit = (vec2(n2(vec2(x * 7.0, dep * 9.0)), n2(vec2(x * 7.0 + 5.3, dep * 9.0 + 2.1))) - 0.5) * uHierbaK * 0.6;
      // (justo bajo el filo, con la luz de arriba, como un hombro redondeado; luego, la de la ladera: con la de la ladera desde
      // el filo, el cambio de luz hacía una raya a lo largo del borde)
      float fd = clamp(dep / max(lim, 0.01), 0.0, 1.0); vec3 sc = suelo(vS + jit, vH, 2.5) * mix(1.06, (0.8 + 0.2 * smoothstep(-0.35, 0.95, ng.y)) * (1.0 - 0.3 * fd * fd), smoothstep(0.0, 0.35, fd));
      sc *= 0.88 + 0.24 * (n2(vec2(x * 38.0, dep * 52.0)) * 0.6 + n2(vec2(x * 90.0, dep * 120.0)) * 0.4);   // (y su grano, a matas)
      sc *= 1.0 - 0.12 * nubes(vS);
      sc = mix(sc, vec3(dot(sc, vec3(0.299, 0.587, 0.114))) * vec3(0.95, 0.92, 1.1), uGris);
      sc = mix(sc, uTinteS, uTintK) * uBrillo;
      gl_FragColor.rgb = mix(gl_FragColor.rgb, sc, clamp(gk, 0.0, 1.0)); } }
#endif
  // (la niebla, como la de three, pero con uNiebla: las paredes del hueco, que están más hondas que el suelo de alrededor,
  // se aclaraban hacia el color del cielo y parecían de cristal; con menos niebla se quedan de tierra a la sombra)
#ifdef USE_FOG
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, smoothstep(fogNear, fogFar, vFogDepth * uNiebla));
#endif
}`;
function materialRoca(map, nor, { tinte = '#ffffff', sol = 1.1, amb = 0.75, cielo = '#d4e2f2', suelo = '#8a7660', norK = 1, fog = true, extra = {} } = {}) {
  return new THREE.ShaderMaterial({ vertexColors: true, side: THREE.DoubleSide, fog, ...extra,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uMap: { value: null }, uNor: { value: null }, uLuz: { value: LUZ.clone() }, uCieloC: { value: C(cielo) }, uSueloC: { value: C(suelo) },
      uTinte: { value: C(tinte) }, uSol: { value: sol }, uAmb: { value: amb }, uNorK: { value: norK }, uVar: { value: 0 }, uNiebla: { value: 1 }, uMusgo: { value: 0 }, uHumus: { value: 0 }, uMusgoC: { value: C('#4a8a2c') }, uMusgoT: { value: null }, uMusgoN: { value: null }, uMusgoTK: { value: 0 }, uEscT: { value: 1 }, uTopeK: { value: 0 }, uTopeI: { value: 0 }, uTopeD: { value: 1 } }]),
    vertexShader: ROCA_VS, fragmentShader: ROCA_FS });
}
const conTex = (m, map, nor) => { m.uniforms.uMap.value = map; m.uniforms.uNor.value = nor; return m; };
const conMusgo = (m, tex) => { if (tex.musgo) { m.uniforms.uMusgoT.value = tex.musgo; m.uniforms.uMusgoN.value = tex.musgoN; m.uniforms.uMusgoTK.value = 1; } return m; };
const ss0 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** El contorno, con N puntos repartidos por igual a lo largo del borde. */
function reparte(P, N) {
  const L = [0]; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; L.push(L[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const tot = L[P.length], out = []; let j = 0;
  for (let k = 0; k < N; k++) { const s = tot * k / N; while (L[j + 1] < s) j++; const a = P[j], b = P[(j + 1) % P.length], f = (s - L[j]) / ((L[j + 1] - L[j]) || 1); out.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f)]); }
  return out;
}
/** La isla de una comarca. P: su contorno (en unidades del mapa); alto(x, z): la altura del relieve sin el grosor;
 *  salen y entran: [x, z, k] donde sus ríos salen de ella o le llegan por el borde (k: 1 río grande, 3 pequeño);
 *  fuera(x, z): la altura del mapa de alrededor en un punto (la de la comarca vecina, o el suelo); tex: texturasIsla();
 *  hueco: el contorno de lo que se arranca del mapa, si no es P (con la isla crecida para que sus montes salgan enteros,
 *  mapa3dAmplia.js, P es el de la isla y hueco el de la comarca);
 *  geos y mats, para soltarlo todo. */
export function hazIsla(o) { const it = hazIslaPasos(o); let r; while (!(r = it.next()).done); return r.value; }
// (hazIslaPasos: la misma, por pasos: un generador que cede entre trozo y trozo, para repartirla entre varias imágenes. Lo que
// crea no entra en la escena ni en geos y mats hasta el final: si se deja a medias, no queda nada colgado. 25 de noviembre
// de 2026: en el vídeo del iPhone del autor, la roca de la isla paraba la imagen de 0,12 a 0,16 s al tocar una comarca)
export function* hazIslaPasos({ id, P, hueco = null, grosor, alto, salen = [], entran = [], fuera = () => 0, orto = null, tex, geos: geosF, mats: matsF, scene: escena }) {
  const pon = [], geos = [], mats = [], scene = { add: (...x) => { pon.push(...x); return scene; }, remove: (...x) => { escena.remove(...x); return scene; } };
  let seed = 7; for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  // (un punto del borde cada cuarto de unidad, entre 300 y 560: con 300 fijos, en las comarcas grandes el canto iba a
  // tramos rectos de media unidad, y de cerca se veían)
  let perim = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; perim += Math.hypot(b[0] - a[0], b[1] - a[1]); }
  const R = rnd(seed), N = Math.max(300, Math.min(560, Math.round(perim / 0.25))), Q = reparte(P, N), N1 = N + 1;
  let cx = 0, cz = 0; for (const [x, z] of Q) { cx += x / N; cz += z / N; }
  let rMed = 0, rMax = 0; for (const [x, z] of Q) { const r = Math.hypot(x - cx, z - cz); rMed += r / N; rMax = Math.max(rMax, r); }
  // (lo largo del borde hasta cada punto: la textura va por metros de borde, y las estrías, también)
  const LQ = [0]; for (let i = 1; i <= N; i++) LQ.push(LQ[i - 1] + Math.hypot(Q[i % N][0] - Q[i - 1][0], Q[i % N][1] - Q[i - 1][1]));
  const TEX = 2.4;   // (lo que mide la textura de la roca en el mapa)
  // (cuánto se mete el contorno de verdad hacia dentro de cada tramo recto del borde, punto a punto: el terreno de arriba se
  // corta justo por el contorno, P, y la panza va de un punto del borde al siguiente en línea recta; donde el contorno
  // quedaba por dentro de esa recta, entre el filo del terreno y la panza había una rendija, y por ella se veía el interior
  // de la roca, una raya parda fina a lo largo del borde. El primer anillo de la panza se mete eso y un poco más, bajo el
  // filo: el terreno lo tapa siempre, y lo que se asoma por fuera del filo es la cara de fuera de la panza)
  const SAL = new Float32Array(N); {
    const Ls = [0]; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; Ls.push(Ls[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    let ar = 0; for (let i = 0; i < N; i++) { const a = Q[i], b = Q[(i + 1) % N]; ar += a[0] * b[1] - b[0] * a[1]; }
    const paso = perim / N, seg = new Float32Array(N);
    for (let j = 0; j < P.length; j++) { const i = Math.min(N - 1, Math.floor(Ls[j] / paso)), a = Q[i], b = Q[(i + 1) % N], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
      const nx = (ar > 0 ? dz : -dz) / l, nz = (ar > 0 ? -dx : dx) / l, d = (P[j][0] - a[0]) * nx + (P[j][1] - a[1]) * nz; if (-d > seg[i]) seg[i] = -d; }
    for (let i = 0; i < N; i++) SAL[i] = Math.min(0.2, Math.max(seg[i], seg[(i + N - 1) % N]) * 1.2 + 0.012); }
  const dentroDe = (QQ) => (x, z) => { let s = false; for (let i = 0, j = N - 1; i < N; j = i++) { const a = QQ[i], b = QQ[j]; if ((a[1] > z) !== (b[1] > z) && x < a[0] + (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1])) s = !s; } return s; };
  const dentro = dentroDe(Q);
  // (lo mismo, por filas: los cruces del contorno con una fila z, ordenados, una sola vez; con la x que va creciendo, dentro
  // es que quedan impares a su derecha. Da lo mismo que dentroDe punto a punto, que con cada punto recorría todo el contorno:
  // al elegir una comarca, la isla tardaba en hacerse de 0,1 a 0,4 s y la cámara daba un tirón. 16 de noviembre de 2026)
  const crucesDe = (QQ, z) => { const xs = []; for (let i = 0, j = N - 1; i < N; j = i++) { const a = QQ[i], b = QQ[j]; if ((a[1] > z) !== (b[1] > z)) xs.push(a[0] + (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1])); } return xs.sort((p, q) => p - q); };
  // (el hueco: con la isla crecida, el contorno de la comarca, que es lo que se arranca del mapa, con los mismos N puntos;
  // si no, el de la isla. Lo suyo, con h: Qh, LQh, el centro, cuánto mide, sus normales y su altura)
  const amplia = !!hueco && hueco !== P, Qh = amplia ? reparte(hueco, N) : Q, dentroH = amplia ? dentroDe(Qh) : dentro;
  const LQh = amplia ? [0] : LQ; if (amplia) for (let i = 1; i <= N; i++) LQh.push(LQh[i - 1] + Math.hypot(Qh[i % N][0] - Qh[i - 1][0], Qh[i % N][1] - Qh[i - 1][1]));
  let cxh = cx, czh = cz, rMedH = rMed; if (amplia) { cxh = 0; czh = 0; rMedH = 0; for (const [x, z] of Qh) { cxh += x / N; czh += z / N; } for (const [x, z] of Qh) rMedH += Math.hypot(x - cxh, z - czh) / N; }
  // (cuánta tierra se arranca, por lógica: las montañas tienen raíz, la corteza es más gruesa bajo las sierras (isostasia),
  // así que la pieza es más honda cuanto más relieve tiene, lo que va del valle a las cumbres (sin el 2 % más bajo ni el más
  // alto). Desde el 14 de noviembre de 2026 es una montaña del revés, como en la imagen de referencia del autor: de 0,62 a
  // 0,9 veces su radio (antes era una losa, de 0,22 a 0,5, y de lado apenas se veía roca). El Pirineo arranca la raíz más
  // honda; la Ribera, la más corta)
  const hs = []; { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of Q) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const paso = Math.max(0.15, rMed / 30), XS = [], ZS = []; for (let x = x0; x <= x1; x += paso) XS.push(x); for (let z = z0; z <= z1; z += paso) ZS.push(z);
    for (const z of ZS) { const xs = crucesDe(Q, z); let k = 0; for (const x of XS) { while (k < xs.length && xs[k] <= x) k++; if ((xs.length - k) & 1) hs.push(alto(x, z)); } }
    hs.sort((a, b) => a - b); }
  const relieve = hs.length > 10 ? hs[Math.floor(hs.length * 0.98)] - hs[Math.floor(hs.length * 0.02)] : rMed * 0.3;
  const D = Math.min(0.9 * rMed, Math.max(0.62 * rMed, 2.4 * relieve));
  yield;
  // (unas pocas puntas: la roca cuelga más donde caen, y la de abajo del todo no queda en el centro sino corrida a un lado)
  const puntas = Array.from({ length: 3 + ((R() * 2) | 0) }, () => ({ a: R() * Math.PI * 2, w: 0.3 + R() * 0.35, h: 0.1 + R() * 0.2 }));
  const ladoA = R() * Math.PI * 2, ladoD = rMed * (0.06 + R() * 0.1), ladoX = Math.cos(ladoA) * ladoD, ladoZ = Math.sin(ladoA) * ladoD;
  const cuelga = (a) => puntas.reduce((s, p) => { const d = Math.atan2(Math.sin(a - p.a), Math.cos(a - p.a)); return s + p.h * Math.exp(-(d * d) / (2 * p.w * p.w)); }, 0);
  // los anillos de la roca, como la de la imagen de referencia: un escalón casi recto bajo el césped, hombros anchos y
  // luego se cierra, cada vez más deprisa, hasta la punta: una montaña del revés, con cuerpo (en cono recto se veía un
  // tallo fino bajo una losa). [lo que se estrecha, lo hondo (en parte de D), cuánto se redondea hacia un círculo]
  // (desde el 14 de noviembre de 2026, sin cara plana bajo el césped: el autor seguía viendo «un corte transversal» en el
  // perímetro, la roca bajaba recta desde el borde con su mismo contorno, como una tajada. Ahora, justo bajo el labio, se
  // abomba hacia fuera y luego se cierra, como las islas de su referencia)
  // (y desde la noche del 14, sin abombarse: esa panza de fuera asomaba más que la hierba y, de lado y desde arriba, se veía
  // una repisa de roca alrededor de toda la isla, el «contorno» y los «cortes verticales» que el autor seguía viendo. Ahora
  // la roca nace justo bajo el filo de la hierba y se mete hacia dentro desde el primer anillo, por la normal de cada punto
  // del borde (y no hacia el centro, que en las bahías la sacaba fuera); las estrías y los bultos, solo más abajo)
  const ANI = [[1, 0, 0], [0.997, 0.012, 0], [0.99, 0.035, 0.01], [0.98, 0.065, 0.02], [0.962, 0.105, 0.04], [0.935, 0.16, 0.07], [0.89, 0.23, 0.11], [0.83, 0.31, 0.16],
    [0.75, 0.4, 0.24], [0.66, 0.51, 0.34], [0.55, 0.62, 0.45], [0.44, 0.72, 0.56], [0.33, 0.81, 0.67], [0.22, 0.89, 0.77], [0.12, 0.95, 0.86], [0.04, 0.99, 0.92]];
  // (los bultos: la roca no baja lisa, tiene panzas y entrantes grandes, y repisas a lo largo, como estratos que asoman)
  const bulto = (a, h) => { const u = Math.cos(a) * 1.6 + seed % 17, w = Math.sin(a) * 1.6 + 3.3;
    return ((ruidoV(u + h * 1.3, w + h * 2.9) - 0.5) * 0.2 + (ruidoV(u * 2.7 + 9.1, w * 2.7 + h * 6.5) - 0.5) * 0.085 + 0.02 * Math.sin(h * 21 + 4 * ruidoV(u, w))) * rMed * Math.sin(Math.PI * Math.min(1, h * 1.08)) ** 0.7; };
  const terron = (a, h) => { const u = Math.cos(a) * 5.2 + seed % 11, w = Math.sin(a) * 5.2 + 7.7; return ((ruidoV(u + h * 9.3, w + h * 6.1) - 0.5) * 0.07 + (ruidoV(u * 2.3 + 2.2, w * 2.3 + h * 15) - 0.5) * 0.035) * rMed * Math.sin(Math.PI * Math.min(1, h * 1.05)); };
  // (las estrías: surcos verticales cada medio metro largo del mapa, que se tuercen un poco al bajar, y bultos más grandes)
  const estria = (s, k) => { const ss = s + 0.12 * Math.sin(k * 1.7 + s * 0.6), g = 0.5 + 0.5 * Math.sin(ss * 13.4 + 1.3 * Math.sin(ss * 0.9)); return 0.09 * g * g + 0.14 * Math.sin(s * 2.7 + k * 0.45 + seed); };
  // (los anillos para un contorno: el de la isla, la panza; y el del hueco, su molde)
  function* anillos(Q, LQ, cx, cz, rMed, dentro, sal = null) {   // (por pasos: cede cada cuatro anillos)
  const pos = [], col = [], uv = [], c = new THREE.Color();
  const NIN = Q.map((q, i) => { const a2 = Q[(i + N - 3) % N], b2 = Q[(i + 3) % N]; let tx = b2[0] - a2[0], tz = b2[1] - a2[1]; const l = Math.hypot(tx, tz) || 1; let nx = -tz / l, nz = tx / l; if (!dentro(q[0] + nx * 0.08, q[1] + nz * 0.08)) { nx = -nx; nz = -nz; } return [nx, nz]; });   // (hacia dentro)
  const ssI = (a0, b0, x) => { const t = Math.min(1, Math.max(0, (x - a0) / (b0 - a0))); return t * t * (3 - 2 * t); };
  for (let k = 0; k < ANI.length; k++) { const [e, h, m] = ANI[k]; if (k && k % 4 === 0) yield; for (let i = 0; i <= N; i++) {
    const [x, z] = Q[i % N], dx = x - cx, dz = z - cz, r = Math.hypot(dx, dz) || 1, a = Math.atan2(dz, dx);
    const bx = lerp(dx, dx / r * rMed, m) * e + ladoX * h ** 1.6, bz = lerp(dz, dz / r * rMed, m) * e + ladoZ * h ** 1.6;
    const fe = ssI(0.06, 0.22, h);   // (las estrías y los bultos empiezan algo más abajo: arriba la roca sigue el filo de la hierba)
    // (desde el 15 de noviembre de 2026, apenas estrías: la panza es de tierra con piedras, no de caliza rayada. Los
    // terrones, bultos pequeños que no siguen una dirección, le dan la silueta de pedazo de tierra de la referencia)
    const ex = k ? (estria(LQ[i], k) * 0.22 * (1 - h) ** 1.3 * Math.min(1, rMed / 7) + (k > 1 ? bulto(a, h) + terron(a, h) : 0)) * fe : 0;
    const y = k ? -D * (h * (1 + cuelga(a) * h ** 1.4) + 0.03 * h * Math.max(0, 1 - h * 1.25) * Math.sin(LQ[i] * 3.1 + k)) : 0;   // (el fondo, liso: si ondula, la orilla del lago sale a dientes)
    // (arriba, el punto del borde metido hacia dentro por su normal, como una ladera que se esconde bajo el césped: un
    // cuarto de lo que baja; más abajo pasa a la forma de montaña del revés)
    const [ix, iz] = NIN[i % N], hd = -y * 0.28, w = ssI(0.08, 0.3, h), px0 = x + ix * hd, pz0 = z + iz * hd, px1 = cx + bx + dx / r * ex, pz1 = cz + bz + dz / r * ex;
    // (y el primer anillo, metido bajo el filo lo que se mete el contorno en su tramo; los dos siguientes, menguando)
    const so = sal ? sal[i % N] * (1 - ssI(0.0, 0.04, h)) : 0;
    pos.push(lerp(px0, px1, w) + ix * so, y, lerp(pz0, pz1, w) + iz * so); uv.push(LQ[i] / TEX, -y / TEX);
    // (la caliza pone su color la foto; algo más oscura hacia la punta, adonde llega menos luz)
    const f = -y / D;
    c.copy(CALIZA).lerp(HONDO, Math.min(1, Math.max(0, (f - 0.3) / 0.65))); c.lerp(TIERRA_ARRIBA, (1 - ssI(0.0, 0.07, h)) * 0.7); c.multiplyScalar(0.94 + R() * 0.08); col.push(c.r, c.g, c.b);   // (justo bajo la hierba, la tierra, en la misma pieza: antes era una franja aparte)
  } }
  yield;
  const base = pos.length / 3; { let yb = 0; for (let i = 0; i < N; i++) yb = Math.min(yb, pos[((ANI.length - 1) * N1 + i) * 3 + 1]); pos.push(cx + ladoX, yb - D * 0.012, cz + ladoZ); } uv.push(0, D / TEX); c.copy(HONDO); col.push(c.r, c.g, c.b);
  const idx = [], L = (ANI.length - 1) * N1;
  for (let k = 0; k + 1 < ANI.length; k++) for (let i = 0; i < N; i++) { const a = k * N1 + i, b = a + 1; idx.push(a, b + N1, b, a, a + N1, b + N1); }
  for (let i = 0; i < N; i++) idx.push(L + i, base, L + i + 1);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals(); geos.push(g);
  return { pos, g }; }
  const { pos, g } = yield* anillos(Q, LQ, cx, cz, rMed, dentro, SAL); yield;
  const MH = amplia ? yield* anillos(Qh, LQh, cxh, czh, rMedH, dentroH) : { pos, g }, posH = MH.pos, gH = MH.g; yield;
  // (roca cálida, ocre y parda, como la de las islas de referencia)
  const sc0 = Math.min(1.3, Math.max(0.6, rMed / 7));
  const rocaM = conTex(materialRoca(null, null, { sol: 1.12, amb: 0.84, cielo: '#cfe0ff', suelo: '#7386c4', tinte: '#fff2e2' }), tex.caliza, tex.calizaN); rocaM.uniforms.uVar.value = 1; rocaM.uniforms.uEscT.value = 0.5; rocaM.uniforms.uMusgo.value = 0; rocaM.uniforms.uHumus.value = 0.6 * sc0; conMusgo(rocaM, tex); mats.push(rocaM);   // (desde el 17 de noviembre de 2026, nada de musgo pintado en la roca: el autor lo seguía viendo «apegado», «no es 3D»; el verde que cuelga es de matas y terrones con volumen)   // (desde el 16 de noviembre de 2026, casi sin musgo pintado: el autor lo veía «apegado», no 3D; el musgo, en matas que cuelgan del borde)   // (desde la tercera referencia, 15 de noviembre de 2026, más largo y con la foto de musgo; menos en el sur seco, la Ribera)   // (desde el 15 de noviembre de 2026, el musgo de la panza en manchas cortas bajo el borde: en lenguas largas se juntaba con la hierba de arriba y no se leía dónde acababa la tierra)   // (la sombra, azulada: le llega la luz del lago y del cielo, como en la imagen de referencia; antes, parda)
  const grupo = new THREE.Group(); grupo.name = 'isla-' + id; grupo.visible = false; scene.add(grupo);
  grupo.add(new THREE.Mesh(g, rocaM));
  // (la misma panza, dentro del hueco: mientras la isla sale de él, se ve por la boca delante de las paredes)
  const rocaAM = conTex(materialRoca(null, null, { sol: 0.5, amb: 0.7, cielo: '#cfe0ff', suelo: '#7386c4', tinte: '#d6cfc6', extra: { transparent: true, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp } }), tex.caliza, tex.calizaN); rocaAM.uniforms.uVar.value = 1; rocaAM.uniforms.uEscT.value = 0.5; rocaAM.uniforms.uNiebla.value = 0.5; mats.push(rocaAM);
  const panzaA = new THREE.Mesh(g, rocaAM); panzaA.renderOrder = -0.7; panzaA.visible = false; scene.add(panzaA);
  // (las raíces, desde el 14 de noviembre de 2026, son las de la foto de la tierra del canto: las de antes eran rayas oscuras
  // de un píxel que colgaban muy por debajo del borde, como alambres)

  // ---------- el canto: el césped que asoma sobre el borde, su tierra y la caliza, tapando la pared de la comarca ----------
  const NOR = Q.map((q, i) => { const a = Q[(i + N - 2) % N], b = Q[(i + 2) % N]; let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    let nx = tz, nz = -tx; if (dentro(q[0] + nx * 0.08, q[1] + nz * 0.08)) { nx = -nx; nz = -nz; } return [nx, nz, tx, tz]; });
  const H0 = Q.map(([x, z]) => grosor + alto(x, z));
  const NORh = amplia ? Qh.map((q, i) => { const a = Qh[(i + N - 2) % N], b = Qh[(i + 2) % N]; let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    let nx = tz, nz = -tx; if (dentroH(q[0] + nx * 0.08, q[1] + nz * 0.08)) { nx = -nx; nz = -nz; } return [nx, nz, tx, tz]; }) : NOR;
  const H0h = amplia ? Qh.map(([x, z]) => grosor + alto(x, z)) : H0;
  // (la hierba del canto no cuelga igual en todo el borde: en unos sitios apenas asoma y en otros cae en mechones, como en
  // la imagen de referencia del autor, del 14 de noviembre de 2026; con dos ondas de ruido a lo largo del borde)
  const CUELGA = Q.map(([x, z]) => 0.45 + 1.75 * (0.62 * ruidoV(x * 0.6 + 3.1, z * 0.6 + 7.7) + 0.38 * ruidoV(x * 1.9 + 21.4, z * 1.9 + 4.2)));
  // (la panza no empieza en la base de la comarca sino algo por debajo de lo más bajo de su orilla: la pared de debajo, que con
  // la exageración del relieve era muy alta, se queda en el canto de césped y algo de roca; la de la comarca se esconde)
  const B = Math.min(...H0, ...(amplia ? H0h : [])) - grosor * 0.15;

  // ---------- la orilla: los montes no se cortan en el borde ----------
  // (14 de noviembre de 2026, el autor: «sigue habiendo cortes transversales. Quiero que todo termine, como en las
  // referencias, que todos los montes terminen, no que tengan un corte perimetral». El borde de la isla seguía la altura del
  // terreno: donde un monte tocaba la muga, la isla lo cortaba y debajo del césped quedaba su perfil en roca. Ahora, con la
  // isla en el aire, el terreno de su orilla baja poco a poco hasta un borde bajo (RIM), algo por encima de donde empieza la
  // roca, como el prado de las islas de su referencia, y la ladera es más larga cuanto más alto era el monte (WI). Fuera,
  // alrededor del hueco, el terreno de las vecinas baja igual hasta la boca (B, WO): el hueco se abre como una hondonada, sin
  // paredes cortadas. Todo sale de un campo en una imagen pequeña (r, cuánto baja dentro: 1 en el borde y 0 pasada la
  // ladera; g, lo mismo fuera; b, la altura del borde en doceavos), que leen el relieve, los árboles, los ríos, las paredes y
  // la falda (mapa3dSombreadores.js ORILLA), y en las cuentas, orillaEn)
  const ss = (a, b2, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b2 - a))); return t * t * (3 - 2 * t); };
  const HS = H0.map((_, i) => { let s2 = 0; for (let d = -8; d <= 8; d++) s2 += H0[(i + d + N) % N]; return s2 / 17; });
  // (el borde, bajo y casi llano en todo el contorno: el corte cae siempre en tierra llana y los montes no se parten, bajan
  // hasta él, como pidió el autor el 14 de noviembre de 2026: «intenta que el corte coincida en territorios llanos»)
  // (con la isla crecida, su borde ya cae al pie de los montes, en el fondo de los valles: allí la orilla solo baja hasta
  // ese fondo, lo más bajo del borde cerca. Bajándola hasta lo más bajo de toda la isla, alrededor quedaba una repisa llana
  // y, dentro, un escalón)
  const VAL = amplia ? H0.map((_, i) => { let m = 1e9; for (let d = -12; d <= 12; d++) m = Math.min(m, H0[(i + d + N) % N]); return m; }) : null;
  const RIM = H0.map((h, i) => Math.min(h, Math.max(B + grosor * 0.35 + 0.03 * Math.max(0, HS[i] - B), amplia ? VAL[i] - grosor * 0.15 : 0)));
  const WI = H0.map((h, i) => Math.min(rMed * 0.7, Math.max(0.5, 0.4 + (h - RIM[i]) * 1.5)));   // (larga: con una ladera corta, en el Pirineo quedaban paredes)
  const WO = H0h.map((h) => Math.min(rMedH * 0.3, Math.max(0.45, 0.3 + (h - B) * 0.85)));   // (la de fuera, alrededor del hueco)
  const orT = yield* (function* () {
    let WM = 0; for (let i = 0; i < N; i++) WM = Math.max(WM, WI[i], WO[i]); WM += 0.3;
    let qx0 = 1e9, qx1 = -1e9, qz0 = 1e9, qz1 = -1e9; for (const [x, z] of [...Q, ...(amplia ? Qh : [])]) { qx0 = Math.min(qx0, x); qx1 = Math.max(qx1, x); qz0 = Math.min(qz0, z); qz1 = Math.max(qz1, z); }
    const ox = qx0 - WM, oz = qz0 - WM, ow = qx1 - qx0 + 2 * WM, oh = qz1 - qz0 + 2 * WM, ppu = 168 / Math.max(ow, oh), tw = Math.ceil(ow * ppu) + 2, th = Math.ceil(oh * ppu) + 2, px = Math.max(ow / tw, oh / th);
    // (en coma flotante de 16 bits, desde el 20 de noviembre de 2026: con 8 bits, la altura del filo iba a saltos de 5 cm del
    // mapa, y donde el terreno se quedaba por encima del primer anillo de la panza, por la rendija se veía su interior, una
    // raya parda fina a lo largo de todo el borde)
    const OD = new Uint16Array(tw * th * 4), OF = new Float32Array(tw * th * 3), hf = THREE.DataUtils.toHalfFloat;
    // (el punto del borde más cercano a cada píxel, buscado por casillas y en anillos que se abren hasta que ya no puede haber
    // otro más cerca; con empate, el de menor número, como al recorrerlos todos. Antes se recorrían los N puntos, dos veces, en
    // cada píxel: era casi la mitad de lo que tardaba la isla en hacerse)
    const CS = Math.max(ow, oh) / 24, GW = Math.ceil(ow / CS) + 1, GH = Math.ceil(oh / CS) + 1;
    const casillas = (QQ) => { const G = Array.from({ length: GW * GH }, () => []); QQ.forEach(([x, z], q) => { const a = Math.min(GW - 1, Math.max(0, Math.floor((x - ox) / CS))), b2 = Math.min(GH - 1, Math.max(0, Math.floor((z - oz) / CS))); G[b2 * GW + a].push(q); }); return G; };
    const GQ = casillas(Q), GQh = amplia ? casillas(Qh) : GQ, cerca = { m2: 0, k: 0 };
    const masCerca = (QQ, G, x, z) => { const ci = Math.min(GW - 1, Math.max(0, Math.floor((x - ox) / CS))), cj = Math.min(GH - 1, Math.max(0, Math.floor((z - oz) / CS))); let m2 = 1e9, k = 0;
      for (let r = 0; r < GW + GH; r++) {
        for (let b2 = cj - r; b2 <= cj + r; b2++) { if (b2 < 0 || b2 >= GH) continue; const salta = b2 !== cj - r && b2 !== cj + r;
          for (let a = ci - r; a <= ci + r; a += salta ? 2 * r || 1 : 1) { if (a < 0 || a >= GW) continue;
            for (const q of G[b2 * GW + a]) { const dx = QQ[q][0] - x, dz = QQ[q][1] - z, d2 = dx * dx + dz * dz; if (d2 < m2 || (d2 === m2 && q < k)) { m2 = d2; k = q; } } } }
        if (m2 < 1e9 && Math.sqrt(m2) < r * CS) break; }
      cerca.m2 = m2; cerca.k = k; };
    for (let j = 1; j < th - 1; j++) { if (j % 10 === 0) yield;
      const z = oz + (j + 0.5) * oh / th, xs = crucesDe(Q, z), xsH = amplia ? crucesDe(Qh, z) : xs; let p = 0, pH = 0;
      for (let i = 1; i < tw - 1; i++) {
      const x = ox + (i + 0.5) * ow / tw; masCerca(Q, GQ, x, z); const m2 = cerca.m2, k = cerca.k; let m2h = m2, kh = k;
      if (amplia) { masCerca(Qh, GQh, x, z); m2h = cerca.m2; kh = cerca.k; }
      while (p < xs.length && xs[p] <= x) p++; while (pH < xsH.length && xsH[pH] <= x) pH++;
      const d = Math.sqrt(m2), dh = Math.sqrt(m2h); if (d > WM && dh > WM) continue;
      // (cada lado se pasa un poco al otro: los puntos que caen justo en el borde, el de la isla y el de sus vecinas, bajan
      // del todo. Con el corte limpio en la muga, la imagen los mezclaba a medias y quedaban de pie, como pinchos)
      const den = !!((xs.length - p) & 1), denH = amplia ? !!((xsH.length - pH) & 1) : den, cruza = 1 - ss(px * 1.2, px * 2.6, d), cruzaH = 1 - ss(px * 1.2, px * 2.6, dh);
      // (dentro, el terreno sigue bajando hasta el mismo borde, redondeado como la loma que se asoma a un cortado: con la curva
      // en S de antes, llegaba al borde ya llano y alrededor de toda la isla quedaba una repisa verde lisa, del mismo ancho y
      // color, que se leía como una pieza añadida. El autor, el 20 de noviembre de 2026: «se construye lo que es todo el labio
      // del borde, que se nota que es un añadido, que no es parte orgánico de la tierra». Ahora baja más deprisa cerca del
      // borde y se junta sin escalón con el terreno de dentro)
      const r = d > WM ? 0 : den ? (1 - Math.min(1, d / WI[k])) ** 2 : cruza, g = dh > WM ? 0 : denH ? cruzaH : 1 - ss(0, WO[kh], dh), o = (j * tw + i);
      OD[o * 4] = hf(r); OD[o * 4 + 1] = hf(g); OD[o * 4 + 2] = hf(RIM[k] / 12); OD[o * 4 + 3] = hf(1);
      OF[o * 3] = r; OF[o * 3 + 1] = g; OF[o * 3 + 2] = RIM[k];
    } }
    const t = new THREE.DataTexture(OD, tw, th, THREE.RGBAFormat, THREE.HalfFloatType); t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true; mats.push(t);
    return { tex: t, rect: new THREE.Vector4(ox, oz, ow, oh), OF, ox, oz, ow, oh, tw, th };
  })();
  /** la altura y (sin estirar) de un punto, con la orilla bajada: ki, cuánto dentro de la isla; ko, cuánto fuera */
  const orillaEn = (x, z, y, ki, ko) => {
    if (ki + ko <= 0) return y; const { OF, ox, oz, ow, oh, tw, th } = orT, u = (x - ox) / ow * tw - 0.5, v = (z - oz) / oh * th - 0.5;
    if (!(u >= 0 && v >= 0 && u <= tw - 1 && v <= th - 1)) return y;
    const i = Math.min(tw - 2, u | 0), j = Math.min(th - 2, v | 0), fx = u - i, fz = v - j, L = (c2) => (OF[(j * tw + i) * 3 + c2] * (1 - fx) + OF[(j * tw + i + 1) * 3 + c2] * fx) * (1 - fz) + (OF[((j + 1) * tw + i) * 3 + c2] * (1 - fx) + OF[((j + 1) * tw + i + 1) * 3 + c2] * fx) * fz;
    return y - L(0) * ki * Math.max(0, y - L(2)) - L(1) * ko * Math.max(0, y - B); };
  // (la altura a la que de verdad se queda el terreno en cada punto del borde con la orilla ya bajada, la misma cuenta que
  // hace ORILLA en la tarjeta gráfica: no llega del todo a RIM en el filo, se queda algo por encima. La panza, las raíces,
  // los terrones y las cascadas empiezan ahí; con RIM, entre el terreno y la panza quedaba una rendija, y por ella se veía
  // el interior de la panza, una raya parda fina a lo largo de todo el borde; 20 de noviembre de 2026)
  const YB = Q.map(([x, z], q) => orillaEn(x, z, H0[q], 1, 0));
  // (y entre punto y punto del borde, lo que el filo de verdad, el del contorno P, sube por encima de la recta de la panza:
  // en cada tramo asomaba por ahí el interior, un punteado oscuro a lo largo del borde. El primer anillo sube eso)
  { const Ls = [0]; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; Ls.push(Ls[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const paso = perim / N, sube = new Float32Array(N);
    // (por todo el contorno, cada 4 cm del mapa, no solo en sus vértices: el terreno pone vértices también donde la
    // rejilla corta el contorno, cada uno con su altura)
    for (let j = 0; j < P.length; j++) { const a = P[j], b = P[(j + 1) % P.length], L = Ls[j + 1] - Ls[j], n = Math.max(1, Math.ceil(L / 0.04));
      for (let m = 0; m < n; m++) { const u = m / n, x = a[0] + (b[0] - a[0]) * u, z = a[1] + (b[1] - a[1]) * u, f = (Ls[j] + L * u) / paso, i = Math.min(N - 1, Math.floor(f)), t = f - i;
        const d = orillaEn(x, z, grosor + alto(x, z), 1, 0) - (YB[i] * (1 - t) + YB[(i + 1) % N] * t); if (d > sube[i]) sube[i] = d; } }
    for (let i = 0; i < N; i++) YB[i] += Math.max(sube[i], sube[(i + N - 1) % N]) + 0.004; }
  yield;
  let KI = 0;   // (cuánto ha bajado ya la orilla: con la isla en el aire, todo)
  // (la roca empieza justo bajo el césped en cada punto del borde, no en la altura más baja de toda la orilla: en el monte
  // alto quedaba entre los dos una pared lisa, el «corte transversal» que veía el autor. ROCA_VS la sube, menguando hacia
  // abajo, lo que va del borde a donde empezaba)
  { const at = new Float32Array(g.attributes.position.count * 2);
    // (ya bajada, YB: la altura de verdad del filo)
    for (let k = 0; k < ANI.length; k++) for (let i = 0; i <= N; i++) { const v = k * N1 + i, q = i % N; at[v * 2] = H0[q] - B; at[v * 2 + 1] = YB[q] - B; }
    g.setAttribute('aTope', new THREE.BufferAttribute(at, 2)); rocaM.uniforms.uTopeD.value = D * 0.4;
    // (de dónde toma la panza el color del prado que dobla sobre el borde: el punto del borde de su columna, algo metido hacia
    // dentro, que es suelo de la comarca; y la altura del filo, para la nieve)
    const sa = new Float32Array(g.attributes.position.count * 2), ha = new Float32Array(g.attributes.position.count);
    for (let k = 0; k < ANI.length; k++) for (let i = 0; i <= N; i++) { const v = k * N1 + i, q = i % N, [nx, nz] = NOR[q]; sa[v * 2] = Q[q][0] - nx * 0.08; sa[v * 2 + 1] = Q[q][1] - nz * 0.08; ha[v] = YB[q]; }
    { const v = ANI.length * N1; sa[v * 2] = cx; sa[v * 2 + 1] = cz; ha[v] = B; }
    g.setAttribute('aS', new THREE.BufferAttribute(sa, 2)); g.setAttribute('aH', new THREE.BufferAttribute(ha, 1)); }
  // El canto es un labio de hierba, no una tira: el prado de arriba dobla sobre el borde, redondeado, cuelga en un fleco de
  // hierba y musgo sobre una franja de tierra con raíces metida hacia dentro, y debajo sigue la caliza hasta la roca. Lo pidió el autor el
  // 14 de noviembre de 2026, con una foto de la isla muy de cerca: «los bordes de los mapas no están bien integrados. No
  // tienen bordes». Hasta entonces era una cinta plana de 5 filas con una foto de césped estirada, que asomaba por encima
  // del terreno como una valla oscura, con una raya blanca entre las dos.
  // · Por dentro empieza transparente, un poco antes del borde y algo por encima, en lenguas desiguales; y su color es el
  //   del terreno, la misma ortofoto con el mismo tono, que hacia fuera va cubriendo la hierba: sin raya ni cambio de color.
  // · Hacia fuera sobresale más o menos según el sitio (ANCHO), con dos ondas de ruido: la silueta de la isla, de cerca,
  //   es de bultos, no de tramos rectos. En los entrantes cerrados sobresale menos (ENC), para que no se pliegue.
  // · El fleco, la tierra con raíces y el grano de la hierba son fotos generadas con Higgsfield, con su transparencia; el
  //   fleco sube algo por encima del filo del labio, y sus matas le dan una silueta de bultos. Todo con la niebla del mapa.
  // [lo que sale del borde (× ANCHO desde la tercera), lo que sube o baja, lo que cuelga (× CUELGA), zona, v, alfa, luz]
  // zona: 0 hierba del labio, 1 briznas, 2 tierra, 3 caliza
  // (desde el 15 de noviembre de 2026, el labio con más vuelo, un cojín de hierba que sobresale y se dobla, y el fleco
  // colgando más en mechones: de lado, el filo era una línea recta y fina, «no me gusta cómo están los bordes»)
  // (y desde la noche del 14, solo la hierba del propio prado que dobla sobre el filo y se mete bajo él, hasta la roca: sin
  // el fleco que colgaba ni las franjas de tierra y de caliza, que se leían como un borde añadido alrededor. «El labio que
  // estás creando en el borde tiene que ser orgánico con el resto. No puede ser un añadido»)
  // (la luz, algo por debajo de la del prado de al lado, que lleva la sombra del relieve: con la misma, el labio salía como
  // una cinta más clara alrededor)
  // (y desde el 16 de noviembre de 2026, mucho más fino y desigual: «en el ordenador los labios de contorno de las islas
  // flotantes se nota que están pegados y que no son orgánicos». Era un cojín de hasta 600 m que sobresalía y colgaba igual
  // en todo el contorno, liso y más claro que el prado: de cerca, un tubo hinchable alrededor. Ahora sobresale y cuelga
  // menos de la mitad; su grosor va de casi nada, donde asoma la tierra, a matas que cuelgan, con bultos pequeños entre
  // medias; tiene la luz del prado, sin aclararse del lado del sol; y el filo de abajo se deshilacha, como la hierba)
  const FILAS = [[-0.2, 0.025, 0, 0, 0, 0, 0.86], [-0.02, 0.03, 0, 0, 0.3, 1, 0.84], [0.035, 0.02, 0, 0, 0.55, 1, 0.8], [0.06, -0.015, 0, 0, 0.75, 1, 0.72], [0.06, -0.05, 0, 0, 0.9, 1, 0.6],
    [0.03, -0.09, 0, 0, 1, 1, 0.48], [-0.04, -0.13, 0, 0, 1, 1, 0.38]];
  const ANCHO = Q.map((_, i) => 0.15 + 1.6 * Math.pow(ruidoV(LQ[i] * 1.05 + seed % 13, 3.3), 1.6) + 0.35 * ruidoV(LQ[i] * 3.6 + 5.1, 9.1) + 0.25 * ruidoV(LQ[i] * 11 + 2.3, 4.4));
  // (las normales, suavizadas: la media de cinco; y cuánto se cierra el borde en cada punto, comparando lo que se separan
  // dos puntos vecinos del borde con lo que se separarían corridos hacia fuera)
  const NS = Q.map((_, i) => { let x = 0, z = 0; for (let k = -2; k <= 2; k++) { const n = NOR[(i + k + N) % N]; x += n[0]; z += n[1]; } const l = Math.hypot(x, z) || 1; return [x / l, z / l]; });
  const ENC0 = Q.map((_, i) => { const a = (i - 3 + N) % N, b = (i + 3) % N, qa = Q[a], qb = Q[b], o = 0.32, d0 = Math.hypot(qb[0] - qa[0], qb[1] - qa[1]) || 1e-6;
    return Math.min(1, Math.max(0.12, Math.hypot(qb[0] + NS[b][0] * o - qa[0] - NS[a][0] * o, qb[1] + NS[b][1] * o - qa[1] - NS[a][1] * o) / d0)); });
  const ENC = ENC0.map((_, i) => { let m = 1; for (let k = -2; k <= 2; k++) m = Math.min(m, ENC0[(i + k + N) % N]); return m * m; });
  const NF = FILAS.length, cantoPos = new Float32Array(NF * N1 * 3), cantoUv = [], cantoZ = [], cantoLuz = [], cantoA = [], cantoS = [], cantoH = [], cantoIx = [];
  FILAS.forEach(([o, , , zona, v, alfa, luz], f) => { for (let i = 0; i <= N; i++) { const k = i % N, [nx, nz] = NS[k], lado = 0.62 + 0.55 * Math.max(0, nx * LUZ.x + nz * LUZ.z);
    cantoUv.push(LQ[i], v); cantoZ.push(zona); cantoA.push(alfa); cantoLuz.push(zona === 0 ? luz * (0.84 + 0.16 * Math.min(1, lado)) : zona < 3 ? luz * (0.86 + 0.24 * (lado - 0.62) / 0.55) : luz * lado);
    // (de dónde toma su color cada punto: del suelo de la comarca justo dentro del borde, nunca de lo de fuera, que es de la
    // vecina; y a qué altura, para la nieve de las cumbres)
    // (lo que sale del borde toma el color en espejo, hacia dentro: si todos los puntos de una columna lo tomaban del mismo
    // sitio, el labio salía rayado, con el color estirado)
    const oe = f >= 2 && f <= 7 ? o * ANCHO[k] * ENC[k] : o, os = oe < -0.02 ? oe : -0.02 - Math.max(0, oe) * 0.7; cantoS.push(Q[k][0] + nx * os, Q[k][1] + nz * os); cantoH.push(RIM[k]); } });   // (la altura, la del filo ya bajado: con la de la cumbre, en el Pirineo el labio salía nevado, un saliente blanco)
  for (const f of [0, 1, 2, 3, 4, 5]) for (let i = 0; i < N; i++) { const a = f * N1 + i, b = a + 1; cantoIx.push(a, a + N1, b, b, a + N1, b + N1); }
  const cantoG = new THREE.BufferGeometry(); cantoG.setAttribute('position', new THREE.BufferAttribute(cantoPos, 3)); cantoG.setAttribute('uv', new THREE.Float32BufferAttribute(cantoUv, 2));
  cantoG.setAttribute('aZona', new THREE.Float32BufferAttribute(cantoZ, 1)); cantoG.setAttribute('aLuz', new THREE.Float32BufferAttribute(cantoLuz, 1)); cantoG.setAttribute('aA', new THREE.Float32BufferAttribute(cantoA, 1));
  cantoG.setAttribute('aS', new THREE.Float32BufferAttribute(cantoS, 2)); cantoG.setAttribute('aH', new THREE.Float32BufferAttribute(cantoH, 1)); cantoG.setIndex(cantoIx); geos.push(cantoG);
  // El color del canto es el del suelo de su comarca, con las mismas cuentas que el terreno (mapa3dSombreadores.js
  // RELIEVE_FS): la ortofoto con su tono, la luz del relieve, el grano de cerca, la nieve, el acabado, la sombra de las nubes
  // y el velo de la comarca. Ni el labio ni el fleco llevan un verde suyo: el 14 de noviembre de 2026 el autor vio que «ese
  // labio que has puesto en el contorno no tiene nada que ver con el verde del césped» y pidió que no hubiera «cambios de
  // colores bruscos que se note que son elementos pegados». De las fotos del fleco y de la tierra solo se toma la luz (sus
  // hojas, sus sombras, su transparencia); el color lo pone el suelo de encima.
  yield;
  const cantoM = new THREE.ShaderMaterial({ side: THREE.DoubleSide, transparent: true, fog: true, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uRoca: { value: null }, uColg: { value: null }, uTierra: { value: null }, uHierba: { value: null } }]),
    vertexShader: `attribute float aZona, aLuz, aA, aH; attribute vec2 aS; varying vec2 vUv, vS; varying float vZ, vL, vA, vRv, vH;
#include <fog_pars_vertex>
void main() { vUv = uv; vZ = aZona; vL = aLuz; vA = aA; vRv = position.y; vS = aS; vH = aH; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`,
    fragmentShader: `uniform sampler2D uRoca, uColg, uTierra, uHierba, uOrto, uOrtoD, uSombra; uniform vec4 uOrtoR, uDetRect, uRect; uniform float uOrtoK, uOrtoDK, uTintK, uGris, uListo, uCerca, uTex, uGrosor, uExa, uBrillo; uniform vec3 uTinte;
varying vec2 vUv, vS; varying float vZ, vL, vA, vRv, vH;
#include <fog_pars_fragment>
${NUBES}${TONO_ORTO}${ORTO_FUERA}float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
// (el color del suelo de la comarca en un punto, como lo pinta el terreno; b, cuánto se suaviza: el fleco lo toma algo
// borroso, que no titile)
vec3 suelo(vec2 p, float h, float b) {
  vec2 sv = p / ${S.toFixed(1)} + vec2(${CX.toFixed(1)}, ${CY.toFixed(1)});
  vec2 ou = (sv - uOrtoR.xy) / uOrtoR.zw; vec3 o = ortoFuera(texture2D(uOrto, ou, b).rgb, sv, ou);
  if (uOrtoDK > 0.0) { vec2 dq = (sv - uDetRect.xy) / uDetRect.zw; o = mix(o, texture2D(uOrtoD, dq, b).rgb, uOrtoDK * enCuadro(dq, 0.012)); }
  float s = mix(1.0, texture2D(uSombra, (sv - uRect.xy) / uRect.zw, b).r * 1.7, uListo);
  s = s < 1.0 ? 1.0 + (s - 1.0) * 1.25 : 1.0 + (s - 1.0) * 0.62; s += 0.22 * (1.0 - smoothstep(0.0, 0.7, s));
  vec3 c = mix(vec3(0.42, 0.55, 0.3) * s, tonoOrto(o) * (1.0 + (s - 1.0) * 0.7), uOrtoK);
  if (uCerca > 0.0 && uTex > 0.0) c *= 1.0 + (n2(sv * 18.0) * 0.6 + n2(sv * 55.0) * 0.4 - 0.5) * 0.14 * uCerca;
  float m = max(0.0, (h - uGrosor) / uExa), nv = smoothstep(1250.0, 1480.0, m + (n2(sv * 0.35) - 0.5) * 170.0) * 0.72;
  c = mix(c, vec3(0.93, 0.95, 1.0) * clamp(0.5 + 0.48 * s, 0.62, 1.12), nv);
  return acabado(c); }
void main() {
  vec3 c; float a = 1.0;   // (los colores, en valores de pantalla, como los del relieve de arriba)
  if (vZ < 0.5) {
    // (el labio: el mismo suelo; por dentro se funde con el terreno en lenguas desiguales, no en una raya, y hacia el filo
    // asoma el grano de la hierba, solo en la luz)
    float lengua = n2(vec2(vUv.x * 5.5, 3.0)) * 0.6 + n2(vec2(vUv.x * 19.0, 9.0)) * 0.4; a = smoothstep(lengua * 0.7, lengua * 0.7 + 0.3, vA);
    // (el filo de abajo, deshilachado: mechones de hierba de distinto largo en vez de una línea lisa)
    float mecha = n2(vec2(vUv.x * 90.0, 1.7)) * 0.55 + n2(vec2(vUv.x * 260.0, 5.3)) * 0.45;
    a *= 1.0 - smoothstep(0.8 + 0.18 * mecha, 0.86 + 0.18 * mecha, vUv.y);
    float fib = clamp(dot(texture2D(uHierba, vS * 2.6).rgb, vec3(0.3, 0.59, 0.11)) / 0.155, 0.55, 1.45);
    c = suelo(vS, vH, 0.0) * mix(1.0, 0.82 + 0.18 * fib, smoothstep(0.2, 0.8, vUv.y)); }
  else if (vZ < 2.5) {
    // (el fleco que cuelga y, detrás, la tierra con raíces: de sus fotos, la transparencia y la luz de cada hoja; lo casi
    // transparente se descarta, para que la tierra de detrás no se tape con su halo)
    vec4 t = vZ < 1.5 ? texture2D(uColg, vec2(vUv.x / 1.25, 1.0 - vUv.y)) : texture2D(uTierra, vec2(vUv.x / 1.4 + 0.37, 1.0 - vUv.y));   // (la imagen, con su arriba arriba)
    if (t.a < 0.42) discard; a = smoothstep(0.42, 0.62, t.a);
    float luz = pow(clamp(dot(t.rgb, vec3(0.299, 0.587, 0.114)) / 0.09, 0.05, 3.0), 0.45);
    // (el 14 de noviembre de 2026, de cerca, el autor: «estos cortes hay que corregir». El fleco salía mucho más oscuro que
    // el césped de encima y la tierra, casi negra: de lado se leían como dos rayas a lo largo del borde. Ahora el fleco
    // lleva la luz de sus hojas a medias, sin bajar de casi el tono del suelo, y la tierra es parda y clara)
    if (vZ < 1.5) c = suelo(vS, vH, 2.5) * mix(1.0, clamp(luz, 0.62, 1.1), 0.55) * (1.0 - 0.1 * vUv.y);
    // (y desde el 15, la tierra, parda de verdad y algo más gruesa: tomaba casi la mitad del verde del suelo y se leía como
    // más hierba, sin capa de tierra entre el césped y la roca; parda media, no negra, para que no vuelva a ser una raya)
    else c = mix(linearToOutputTexel(vec4(t.rgb, 1.0)).rgb * 1.3, vec3(0.5, 0.37, 0.25) * clamp(luz, 0.7, 1.15), 0.5) * (1.0 - 0.12 * vUv.y); }
  else { vec3 r = linearToOutputTexel(vec4(texture2D(uRoca, vec2(vUv.x / 2.4, -vRv / 2.4)).rgb * vec3(0.72, 0.71, 0.72), 1.0)).rgb;   // (la caliza de debajo, con la luz de la panza)
    // (y musgo: del labio a la roca, sin raya; la roca asoma más abajo, con el musgo de la panza)
    // (desde el 15, roca con algo de musgo, no musgo con algo de roca: con el 82 % de verde, bajo la tierra seguía una banda
    // verde y el borde no se leía)
    c = mix(r, suelo(vS, vH, 3.0) * (0.5 + 0.9 * dot(r, vec3(0.3, 0.59, 0.11))), 0.3 * (1.0 - vUv.y)); }
  if (a < 0.01) discard;
  c *= vL; c = mix(c, vec3(dot(c, vec3(0.299, 0.587, 0.114))) * vec3(0.95, 0.92, 1.1), uGris);
  c *= 1.0 - 0.12 * nubes(vS);
  gl_FragColor = vec4(mix(c, uTinte, uTintK) * uBrillo, a);   // (con el mismo velo de color que el terreno de su comarca)
#ifdef USE_FOG
  gl_FragColor.rgb = mix(gl_FragColor.rgb, linearToOutputTexel(vec4(fogColor, 1.0)).rgb, smoothstep(fogNear, fogFar, vFogDepth));
#endif
}` }); Object.assign(cantoM.uniforms, { uRoca: { value: tex.caliza }, uColg: { value: tex.colgante }, uTierra: { value: tex.tierra }, uHierba: { value: tex.hierba } }); mats.push(cantoM);
  // (los mismos uniformes que el terreno de su comarca, que cambian con él: la ortofoto, la luz del relieve, el tiempo de las
  // nubes, el velo)
  const DEF = { uTinte: () => new THREE.Color(), uOrtoR: () => new THREE.Vector4(0, 0, 1, 1), uDetRect: () => new THREE.Vector4(0, 0, 1, 1), uRect: () => new THREE.Vector4(0, 0, 1, 1), uBrillo: () => 1, uExa: () => 1, uOrto: () => null, uOrtoD: () => null, uSombra: () => null };
  for (const k of ['uOrto', 'uOrtoD', 'uOrtoR', 'uEnt', 'uEntK', 'uDetRect', 'uOrtoK', 'uOrtoDK', 'uTinte', 'uTintK', 'uGris', 'uSombra', 'uRect', 'uListo', 'uT', 'uCerca', 'uTex', 'uGrosor', 'uExa', 'uBrillo']) cantoM.uniforms[k] = orto?.[k] || { value: DEF[k] ? DEF[k]() : 0 };
  // (la isla, de una sola pieza: la panza lleva arriba el mismo prado que el terreno, con sus mismos uniformes, y el labio
  // de antes, la cinta de hierba que se montaba sobre el borde al despegar, ya no se pinta. El autor, 20 de noviembre de
  // 2026: «se construye lo que es todo el labio del borde, que se nota que es un añadido» y «diseñar todas las comarcas,
  // todas las islas flotantes de una sola pieza». Lo que cuelga (raíces, matas, terrones), sí: tiene volumen)
  rocaM.defines = { ...(rocaM.defines || {}), SUELO: '' };
  for (const k of ['uOrto', 'uOrtoD', 'uOrtoR', 'uEnt', 'uEntK', 'uDetRect', 'uOrtoK', 'uOrtoDK', 'uTintK', 'uGris', 'uSombra', 'uRect', 'uListo', 'uT', 'uCerca', 'uTex', 'uGrosor', 'uExa', 'uBrillo']) rocaM.uniforms[k] = orto?.[k] || { value: DEF[k] ? DEF[k]() : 0 };
  rocaM.uniforms.uTinteS = orto?.uTinte || { value: new THREE.Color() };
  rocaM.uniforms.uHierbaK = { value: 0.5 * sc0 };
  rocaM.needsUpdate = true; cantoM.visible = false;
  const canto = new THREE.Mesh(cantoG, cantoM); canto.name = 'canto-' + id; canto.frustumCulled = false; canto.visible = false; canto.renderOrder = 1; scene.add(canto);
  let cantoSy = -1;
  // (el canto va a la altura del borde, la de la orilla ya bajada)
  const ponCanto = (sy) => { cantoSy = sy;
    FILAS.forEach(([o, dy, cu, , , ], f) => { for (let i = 0; i <= N; i++) { const k = i % N, q = Q[k], [nx, nz] = NS[k], v = (f * N1 + i) * 3, oo = f >= 2 && f <= 7 ? o * ANCHO[k] * ENC[k] : o, hk = H0[k] - KI * (H0[k] - RIM[k]);
      cantoPos[v] = q[0] + nx * oo; cantoPos[v + 1] = dy == null ? B * sy - 0.04 : Math.max(B * sy, hk * sy + dy - cu * CUELGA[k]); cantoPos[v + 2] = q[1] + nz * oo; } });
    cantoG.attributes.position.needsUpdate = true; ponColgantes(sy); };

  yield;
  // ---------- lo que cuelga del borde: raíces y matas de musgo, en 3D, que se mecen con el aire ----------
  // (16 de noviembre de 2026, el autor: «en la parte de la tierra que has puesto como una especie de musgo, se nota que está
  // apegado, se nota que no es 3D. No cuelgan raíces tampoco con movimiento». El musgo de la panza era una foto pintada sobre
  // la roca; ahora casi no queda, y bajo el filo de la hierba asoman matas de musgo de verdad, con volumen, y raíces que
  // cuelgan más o menos largas, algunas hasta medio cuerpo de la isla. Cada una con su largo, su grosor y su ritmo; el
  // vértice baja la punta más que la base y la mece con el viento)
  const TCOLG = { value: 0 };   // (el tiempo del viento: TIEMPO se crea más abajo)
  // (aC: hacia dónde se tuerce cada una al bajar, en el plano; desde el 17 de noviembre de 2026 ninguna cuelga recta)
  const colgV = `attribute float aFase, aL; attribute vec2 aN, aC; uniform float uT, uOnda, uSale; varying float vD, vF; varying vec3 vNw;
#include <fog_pars_vertex>
void main() { float d = -position.y; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
  float sw = sin(uT * 0.85 + aFase * 6.283 + d * 2.3) * 0.6 + sin(uT * 1.6 + aFase * 11.0 + d) * 0.4, d2 = d * d;
  w.xz += aN * aL * uSale * sin(d * 1.9) + vec2(aN.y, -aN.x) * sw * aL * uOnda * d2 + aN * sw * aL * uOnda * 0.5 * d2 + aC * aL * d2 * 0.55;
  vD = d; vF = aFase; vNw = normalize(mat3(modelMatrix * instanceMatrix) * normal);
  vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`;
  const colgF = (base, punta) => `uniform vec3 uLuz; varying float vD, vF; varying vec3 vNw;
#include <fog_pars_fragment>
void main() { vec3 n = normalize(vNw); if (!gl_FrontFacing) n = -n;
  vec3 c = mix(${base}, ${punta}, smoothstep(0.0, 1.0, vD)) * (0.82 + 0.36 * fract(vF * 7.31));
  float l = 0.5 + 0.55 * max(0.0, dot(n, uLuz)) + 0.12 * n.y; c = pow(c, vec3(2.2)) * l * mix(0.62, 1.0, smoothstep(0.0, 0.5, vD));   // (arriba, a la sombra del labio)
  // (con la luz en valores lineales y pasada a la pantalla como la roca: antes la luz se aplicaba al color de pantalla y las
  // raíces salían casi negras al lado de la tierra, como estacas; 17 de noviembre de 2026)
  gl_FragColor = linearToOutputTexel(vec4(c, 1.0));
#ifdef USE_FOG
  gl_FragColor.rgb = mix(gl_FragColor.rgb, linearToOutputTexel(vec4(fogColor, 1.0)).rgb, smoothstep(fogNear, fogFar, vFogDepth));
#endif
}`;
  const colgM = (base, punta, onda, sale) => { const m = new THREE.ShaderMaterial({ side: THREE.DoubleSide, fog: true, vertexShader: colgV, fragmentShader: colgF(base, punta),
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uLuz: { value: LUZ.clone() }, uOnda: { value: onda }, uSale: { value: sale } }]) }); m.uniforms.uT = TCOLG; mats.push(m); return m; };
  // la raíz: un tubo que se afina, de la base (y 0) a la punta (y -1); la raicilla, igual pero de tres caras; la mata:
  // briznas planas en estrella, que se afinan
  const raizG = new THREE.CylinderGeometry(1, 0.1, 1, 5, 9, true); raizG.translate(0, -0.5, 0); geos.push(raizG);
  const peloG = new THREE.CylinderGeometry(1, 0.15, 1, 3, 4, true); peloG.translate(0, -0.5, 0); geos.push(peloG);
  // (desde el 17 de noviembre de 2026, una mata de hierba que cuelga y no una estrella de cinco hojas anchas, que de lado se
  // leían como colmillos verdes: once briznas finas, cada una salida de un punto distinto de la mata, que se abren hacia fuera
  // al colgar, de largos distintos y que acaban en punta)
  const mataG = (() => { const pos = [], ix = []; const NB = 11, SG = 4, hb = (b, k) => { const x = Math.sin(b * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
    for (let b = 0; b < NB; b++) { const ar = hb(b, 1) * Math.PI * 2, rb = 0.12 + 0.3 * hb(b, 2), bx = Math.cos(ar) * rb, bz = Math.sin(ar) * rb, a = ar + Math.PI / 2 + (hb(b, 3) - 0.5) * 0.8, ca = Math.cos(a), sa = Math.sin(a), o = pos.length / 3;
      const ln = 0.55 + 0.45 * hb(b, 4), ab = 0.25 + 0.55 * hb(b, 5);
      for (let k = 0; k <= SG; k++) { const t = k / SG, w = 0.075 * (1 - 0.9 * t), cx = bx + Math.cos(ar) * ab * t * t, cz = bz + Math.sin(ar) * ab * t * t, y = -t * ln;
        pos.push(cx - w * ca, y, cz - w * sa, cx + w * ca, y, cz + w * sa); }
      for (let k = 0; k < SG; k++) { const v = o + k * 2; ix.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); } }
    const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g2.setIndex(ix); g2.computeVertexNormals(); geos.push(g2); return g2; })();
  // (cuántas y dónde, desde el 17 de noviembre de 2026: en mechones, no una en cada punto del borde. El autor: «no cuelgan
  // raíces tampoco con movimiento», «hay que darle muchísimo más realismo», y de lado se veía un peine de palos oscuros
  // iguales, uno cada cuarto de unidad. Las raíces de verdad salen a grupos donde la tierra se ha desgarrado, con huecos
  // entre medias: casi todas cortas, unas pocas largas, cada una torcida a su manera, finas y del color de la tierra, con
  // raicillas alrededor. Las matas de musgo, más claras, donde no hay raíces; y terrones que asoman rotos bajo la hierba)
  const sc = Math.min(1.3, Math.max(0.6, rMed / 7));
  const grupoDe = (i) => { const [x, z] = Q[i]; return 0.65 * ruidoV(x * 0.55 + seed % 13, z * 0.55 + 4.4) + 0.35 * ruidoV(x * 1.7 + 8.8, z * 1.7 + seed % 7); };
  const RAIZ = [], PELO = [], MATA = [], TERRON = [];
  for (let i = 0; i < N; i++) {
    const g0 = grupoDe(i), c = ss0(0.42, 0.7, g0), tan = () => (R() - 0.5) * 0.25;
    if (R() < 0.03 + c * 1.05) { const largo = R() < 0.08 + c * 0.14;
      RAIZ.push({ k: i, t: tan(), off: -0.03 + R() * 0.05, L: (largo ? 0.55 + R() * 0.75 : 0.1 + R() ** 2 * 0.45) * sc, r: largo ? 0.014 + R() * 0.01 : 0.008 + R() * 0.008, f: R(), cx: (R() - 0.5) * 1.6, cz: 0.2 + R() * 0.9 }); }
    if (c > 0.15) for (let n = (R() * 3.2 * c) | 0; n-- > 0;) PELO.push({ k: i, t: tan(), off: -0.02 + R() * 0.04, L: (0.05 + R() * 0.2) * sc, r: 0.005 + R() * 0.004, f: R(), cx: (R() - 0.5) * 2.2, cz: R() * 1.4 });
    if (R() < 0.12 + 0.55 * ss0(0.32, 0.6, 1 - g0)) MATA.push({ k: i, t: tan(), off: R() * 0.05, L: (0.05 + R() * 0.13) * sc, r: 0.1 + R() * 0.08, f: R(), cx: 0, cz: 0 });
    if (R() < 0.02 + c * 0.14) TERRON.push({ k: i, t: tan(), off: R() * 0.03, s: (0.05 + R() ** 1.6 * 0.11) * sc, f: R(), baja: R() ** 3, rx: R() * 6.28, ry: R() * 6.28, sx: 0.9 + R() * 0.6, sy: 0.55 + R() * 0.3, sz: 0.8 + R() * 0.5 });
  }
  const colgantes = (L, g2, m) => { const im = new THREE.InstancedMesh(g2, m, Math.max(1, L.length)); im.count = L.length; im.frustumCulled = false; im.raycast = () => {};
    const aF = new Float32Array(L.length), aLl = new Float32Array(L.length), aNn = new Float32Array(L.length * 2), aCc = new Float32Array(L.length * 2);
    L.forEach((o, n) => { const [nx, nz] = NS[o.k]; aF[n] = o.f; aLl[n] = o.L; aNn[n * 2] = nx; aNn[n * 2 + 1] = nz; aCc[n * 2] = nx * o.cz - nz * o.cx; aCc[n * 2 + 1] = nz * o.cz + nx * o.cx; });
    im.geometry = g2.clone(); geos.push(im.geometry);
    im.geometry.setAttribute('aFase', new THREE.InstancedBufferAttribute(aF, 1)); im.geometry.setAttribute('aL', new THREE.InstancedBufferAttribute(aLl, 1));
    im.geometry.setAttribute('aN', new THREE.InstancedBufferAttribute(aNn, 2)); im.geometry.setAttribute('aC', new THREE.InstancedBufferAttribute(aCc, 2));
    canto.add(im); return im; };
  const raices = colgantes(RAIZ, raizG, colgM('vec3(0.45, 0.36, 0.26)', 'vec3(0.72, 0.63, 0.5)', 0.09, 0.1));
  const pelos = colgantes(PELO, peloG, colgM('vec3(0.5, 0.41, 0.3)', 'vec3(0.78, 0.7, 0.57)', 0.14, 0.12));
  const matas = colgantes(MATA, mataG, colgM('vec3(0.23, 0.32, 0.12)', 'vec3(0.44, 0.53, 0.22)', 0.14, 0.16));
  // (los terrones: pedazos de tierra con su hierba encima, medio salidos del canto, como si el borde se hubiera roto al
  // arrancar la isla y no hubiera terminado de caer; bolas de veinte caras deformadas con ruido, sin aristas)
  const terronG = (() => { const g1 = new THREE.IcosahedronGeometry(1, 2); g1.deleteAttribute('uv'); g1.deleteAttribute('normal'); const g2 = mergeVertices(g1), p2 = g2.attributes.position; g1.dispose();
    for (let v = 0; v < p2.count; v++) { const x = p2.getX(v), y = p2.getY(v), z = p2.getZ(v), k = 0.62 + 0.6 * ruidoV(x * 1.3 + y * 0.7 + 5.1, z * 1.3 - y * 0.9 + 2.7) + 0.3 * ruidoV(x * 3.7 + 1.7, z * 3.7 + y * 2.9) + 0.12 * ruidoV(x * 9.1 - y * 4.1, z * 9.1 + 3.3);
      p2.setXYZ(v, x * k, y > 0 ? 0.25 + y * 0.35 * k : y * k * (1.1 + 0.5 * ruidoV(x * 2.1 + 9.0, z * 2.1)), z * k); }
    g2.computeVertexNormals(); geos.push(g2); return g2; })();
  const terronM = new THREE.ShaderMaterial({ fog: true, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uLuz: { value: LUZ.clone() } }]),
    vertexShader: `attribute float aFase; varying vec3 vNw, vPw; varying float vF;
#include <fog_pars_vertex>
void main() { vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vPw = w.xyz; vF = aFase; vNw = normalize(mat3(modelMatrix * instanceMatrix) * normal);
  vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`, fragmentShader: `uniform vec3 uLuz; varying vec3 vNw, vPw; varying float vF;
#include <fog_pars_fragment>
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
void main() { vec3 n = normalize(vNw);
  float gr = vn(vPw.xz * 9.0 + vPw.y * 7.0) * 0.6 + vn(vPw.xz * 31.0 - vPw.y * 23.0) * 0.4;
  float mi = vn(vPw.xz * 61.0 + vPw.y * 47.0);
  vec3 tierra = mix(vec3(0.19, 0.14, 0.095), vec3(0.36, 0.27, 0.19), gr) * (0.7 + 0.45 * mi) * (0.88 + 0.24 * fract(vF * 5.7));
  vec3 piedra = mix(vec3(0.5, 0.47, 0.41), vec3(0.68, 0.64, 0.57), gr);
  vec3 c = mix(tierra, piedra, step(0.86, vn(vPw.xz * 17.0 + vPw.y * 9.0 + 3.0)) * 0.75);
  float hi = smoothstep(0.25, 0.65, n.y + (gr - 0.5) * 0.35);
  c = mix(c, mix(vec3(0.3, 0.47, 0.12), vec3(0.45, 0.63, 0.19), gr) * (0.85 + 0.3 * mi), hi);
  float l = 0.55 + 0.6 * max(0.0, dot(n, uLuz)) + 0.12 * n.y; gl_FragColor = vec4(c * l, 1.0);
#ifdef USE_FOG
  gl_FragColor.rgb = mix(gl_FragColor.rgb, linearToOutputTexel(vec4(fogColor, 1.0)).rgb, smoothstep(fogNear, fogFar, vFogDepth));
#endif
}` }); mats.push(terronM);
  const terrones = new THREE.InstancedMesh(terronG, terronM, Math.max(1, TERRON.length)); terrones.count = TERRON.length; terrones.frustumCulled = false; terrones.raycast = () => {};
  terrones.geometry = terronG.clone(); geos.push(terrones.geometry); terrones.geometry.setAttribute('aFase', new THREE.InstancedBufferAttribute(new Float32Array(TERRON.map(o => o.f)), 1)); canto.add(terrones);
  const m4c = new THREE.Matrix4(), q0 = new THREE.Quaternion(), qy = new THREE.Quaternion(), ejeY = new THREE.Vector3(0, 1, 0), v3c = new THREE.Vector3(), s3c = new THREE.Vector3(), eul = new THREE.Euler();
  function ponColgantes(sy) {
    const pon = (L, im, bajo, plano) => { L.forEach((o, n) => { const q = Q[o.k], [nx, nz] = NS[o.k], hk = H0[o.k] - KI * (H0[o.k] - YB[o.k]), tx = -nz * o.t, tz = nx * o.t;
      if (plano) qy.setFromAxisAngle(ejeY, Math.atan2(nx, nz) + o.f * 2.4); else qy.copy(q0);
      m4c.compose(v3c.set(q[0] + nx * o.off + tx, Math.max(B * sy, hk * sy - bajo), q[1] + nz * o.off + tz), qy, s3c.set(o.r, o.L, o.r)); im.setMatrixAt(n, m4c); });
      im.instanceMatrix.needsUpdate = true; };
    // (sin el canto, las raíces salen de la tierra que asoma bajo las lenguas de hierba de la panza, no del filo: desde el
    // filo, sus cabezas oscuras hacían una raya a lo largo del borde)
    pon(RAIZ, raices, 0.3 * sc, false); pon(PELO, pelos, 0.26 * sc, false); pon(MATA, matas, 0.07, true);
    TERRON.forEach((o, n) => { const q = Q[o.k], [nx, nz] = NS[o.k], hk = H0[o.k] - KI * (H0[o.k] - YB[o.k]), out = o.off + o.s * o.sx * 0.08;
      qy.setFromEuler(eul.set((o.rx - 3.14) * 0.06, o.ry, (o.f - 0.5) * 0.25));
      // (la cara de arriba, con hierba, a ras del canto y algo más abajo si el terrón ya se ha soltado un poco)
      m4c.compose(v3c.set(q[0] + nx * out - nz * o.t, Math.max(B * sy, hk * sy - 0.03 - o.s * o.sy * 0.55 - o.baja * 0.2 * sc), q[1] + nz * out + nx * o.t), qy, s3c.set(o.s * o.sx, o.s * o.sy, o.s * o.sz)); terrones.setMatrixAt(n, m4c); });
    terrones.instanceMatrix.needsUpdate = true;
  }

  yield;
  // ---------- el hueco: el molde de la tierra arrancada ----------
  // La tierra que sube es la que falta: el hueco tiene justo la forma de la panza (las mismas posiciones: molde y pieza, el
  // mismo volumen), y empieza bajo lo más bajo de la comarca (CORTE), donde empieza la panza. Al principio la isla está
  // dentro y sale de él al subir. Debajo no hay cielo («es tierra más oscura; pon lógica geográfica», pidió el autor): las
  // paredes son roca en estratos, a la sombra y húmeda, más oscura cuanto más honda, y en el fondo se junta el agua de los
  // ríos que caen por el borde. Se ve solo por la boca (el búfer de plantilla, stencil): primero se marca la boca donde se ve
  // (lo de delante, la isla o una comarca vecina, la tapa); luego, en la boca, se borra la profundidad y lo de dentro (las
  // paredes, el lago, la panza mientras sale, el agua y las piedras que caen) se pinta con la suya.
  const TIEMPO = { value: 0 }, CORTE = { value: 0 }, LAGO = -D * 0.5;   // (el agua llena medio hueco: un lago ancho y azul bajo la isla, como en la imagen de referencia; antes, un charco oscuro en lo más hondo)
  const PLANT = { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp };
  const PH = hueco || P;
  const boca = (() => { const pos2 = [], ix = []; for (const [x, z] of PH) pos2.push(x, 0.003, z);
    for (const t of THREE.ShapeUtils.triangulateShape(PH.map(([x, z]) => new THREE.Vector2(x, z)), [])) ix.push(t[0], t[2], t[1]);
    const gb = new THREE.BufferGeometry(); gb.setAttribute('position', new THREE.Float32BufferAttribute(pos2, 3)); gb.setIndex(ix); geos.push(gb); return gb; })();
  const marcaM = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, transparent: true, side: THREE.DoubleSide, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp }); mats.push(marcaM);
  const borraM = new THREE.ShaderMaterial({ colorWrite: false, depthWrite: true, depthFunc: THREE.AlwaysDepth, transparent: true, side: THREE.DoubleSide, ...PLANT,
    vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w * 0.99999; }', fragmentShader: 'void main() { gl_FragColor = vec4(0.0); }' }); mats.push(borraM);
  const marca = new THREE.Mesh(boca, marcaM), borra = new THREE.Mesh(boca, borraM); marca.renderOrder = -0.95; borra.renderOrder = -0.9;
  const sima = new THREE.Group(); sima.name = 'sima-' + id; sima.visible = false; scene.add(sima);
  const molde = new THREE.Group(); sima.add(molde); molde.add(marca, borra);   // (molde: a la altura del CORTE; el agua y las piedras, en el mundo)
  // (las paredes: la geometría de la panza, con la roca en estratos; arriba algo de tierra, y abajo, a la sombra, oscura)
  { const cc = [], c2 = new THREE.Color(), SUELO = C('#54402f'), ARRIBA = C('#a3865f'), ABAJO = C('#3d3226');   // (tierra y roca a la sombra, oscuras: el autor las veía claras)
    for (let v = 0; v < posH.length / 3; v++) { const f = Math.min(1, -posH[v * 3 + 1] / D);
      if (f < 0.05) c2.copy(SUELO); else c2.copy(ARRIBA).lerp(ABAJO, Math.min(1, (f - 0.05) / 0.85) ** 0.75);
      c2.multiplyScalar(0.9 + R() * 0.12); cc.push(c2.r, c2.g, c2.b); }
    const gp = new THREE.BufferGeometry(); for (const k of ['position', 'normal', 'uv']) gp.setAttribute(k, gH.attributes[k]); gp.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3)); gp.setIndex(gH.index); geos.push(gp);
    const pm = conTex(materialRoca(null, null, { sol: 0.6, amb: 0.8, cielo: '#b6c4d2', suelo: '#4a3c30', norK: 1.5, extra: { transparent: true, ...PLANT } }), tex.estratos, tex.estratosN); pm.uniforms.uNiebla.value = 0.5; pm.uniforms.uMusgo.value = Math.min(0.9, Math.max(0.35, D * 0.12)); pm.uniforms.uHumus.value = 0.3 * sc0; pm.uniforms.uMusgoC.value = C('#56702f'); conMusgo(pm, tex); mats.push(pm);
    // (el hueco, el molde de la panza: la misma tierra rota, con la franja de tierra negra bajo la hierba y solo un fleco de
    // hierba en el borde. Desde el 17 de noviembre de 2026; antes, una hondonada con hierba por casi toda la pared, un embudo
    // verde con rayas pardas que no casaba con la panza de tierra que acababa de salir de él)
    const pared = new THREE.Mesh(gp, pm); pared.renderOrder = -0.8; molde.add(pared); }
  // (por dónde baja el agua por la pared del molde, en el punto i del borde: el anillo a esa hondura, algo hacia dentro)
  const porPared = (i, yl) => { for (let k = 0; k + 1 < ANI.length; k++) { const a = (k * N1 + i) * 3, b = ((k + 1) * N1 + i) * 3, ya = posH[a + 1], yb = posH[b + 1];
      if (yl <= ya && yl >= yb) { const f = (ya - yl) / ((ya - yb) || 1); return [lerp(posH[a], posH[b], f), lerp(posH[a + 2], posH[b + 2], f)]; } }
    const a = ((ANI.length - 1) * N1 + i) * 3; return [posH[a], posH[a + 2]]; };
  // (el lago del hueco, donde cae el agua: azul, con ondas suaves y el cielo reflejado de lado, turquesa en la orilla; su contorno, el
  // del anillo de encima, para que llegue a las paredes, que tapan lo que sobra)
  { const p3 = [cxh, LAGO, czh], o3 = [0], i3 = [];
    const RL = Array.from({ length: N }, (_, i) => { const [x, z] = porPared(i, LAGO); return [x - cxh, z - czh]; });
    for (let i = 0; i < N; i++) { let x = 0, z = 0; for (let j = -4; j <= 4; j++) { const q2 = RL[(i + j + N) % N]; x += q2[0] / 9; z += q2[1] / 9; }   // (la orilla, suave)
      p3.push(cxh + x * 1.03, LAGO, czh + z * 1.03); o3.push(1); i3.push(0, 1 + (i + 1) % N, 1 + i); }
    const gl = new THREE.BufferGeometry(); gl.setAttribute('position', new THREE.Float32BufferAttribute(p3, 3)); gl.setAttribute('aO', new THREE.Float32BufferAttribute(o3, 1)); gl.setIndex(i3); geos.push(gl);
    const lm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, ...PLANT, uniforms: { uT: TIEMPO },
      vertexShader: 'attribute float aO; varying vec2 vP; varying vec3 vW; varying float vO; void main() { vP = position.xz; vO = aO; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uT; varying vec2 vP; varying vec3 vW; varying float vO;
        float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        void main() {
          // (ondas sin dibujo que se repita: ruido que se mueve en dos sentidos; de lado refleja el cielo, de frente se ve el fondo)
          float w = n(vP * 2.3 + vec2(uT * 0.22, uT * 0.13)) * 0.6 + n(vP * 5.1 - vec2(uT * 0.31, -uT * 0.18)) * 0.4;
          float f = pow(1.0 - clamp(normalize(cameraPosition - vW).y, 0.0, 1.0), 3.0);
          vec3 c = mix(vec3(0.05, 0.3, 0.6), vec3(0.13, 0.47, 0.78), w);
          c = mix(c, vec3(0.62, 0.83, 0.98), f * 0.5 + 0.12 * smoothstep(0.62, 0.8, w));
          // (la orilla: el agua, poco honda, deja ver la roca mojada, y una raya de espuma donde toca la pared)
          float o = smoothstep(0.55, 1.0, vO); c = mix(c, vec3(0.3, 0.68, 0.76), o * 0.6) + vec3(0.42) * smoothstep(0.94, 1.0, vO) * 0.45;
          gl_FragColor = vec4(c, 0.96); }` }); mats.push(lm);
    const lago = new THREE.Mesh(gl, lm); lago.renderOrder = -0.78; molde.add(lago); }


  yield;
  // ---------- el agua que cae al vacío ----------
  // Donde un río sale de la comarca, cae por el borde de la isla; donde un río de Navarra entraba en ella, ahora se tira por
  // el borde del hueco al cielo de abajo. Columnas de agua (un corte de ocho lados, para que se vean desde cualquier lado, y
  // que de canto se desvanecen) que se abren al caer y se deshacen en bruma antes de las nubes. Si no le sale ningún río, un
  // manantial en lo más bajo de su orilla.
  const cerca = ([x, z], QQ = Q) => { let b = 0, bd = 1e9; for (let i = 0; i < N; i++) { const d = (QQ[i][0] - x) ** 2 + (QQ[i][1] - z) ** 2; if (d < bd) { bd = d; b = i; } } return b; };
  const elige = (L2, max, QQ = Q) => { const out = []; for (const s of [...L2].sort((a, b) => a[2] - b[2])) { if (out.length >= max) break; const i = cerca(s, QQ); if (out.every(o => Math.hypot(QQ[o.i][0] - QQ[i][0], QQ[o.i][1] - QQ[i][1]) > rMed * 0.32)) out.push({ i, k: s[2] }); } return out; };
  const caidas = [];
  const anchoDe = (k) => (k === 1 ? 0.8 : k === 2 ? 0.58 : 0.42) * Math.max(1, rMed / 9);
  for (const s of elige(salen, 4)) caidas.push({ ...s, isla: true, w: anchoDe(s.k) });
  // (el manantial, en lo más bajo de la orilla que no haya crecido: el agua, al pasar el corte, sigue por la pared del hueco)
  const junto = (i) => !amplia || Math.hypot(Q[i][0] - Qh[cerca(Q[i], Qh)][0], Q[i][1] - Qh[cerca(Q[i], Qh)][1]) < 0.2;
  if (!caidas.length) { let b = -1, bh = 1e9; for (let i = 0; i < N; i++) { const h = alto(Q[i][0], Q[i][1]); if (h < bh && junto(i)) { bh = h; b = i; } } if (b < 0) b = 0; caidas.push({ i: b, k: 2, isla: true, w: anchoDe(2) }); }
  for (const s of elige(entran, 4, Qh)) caidas.push({ ...s, isla: false, w: anchoDe(s.k) * 0.85 });
  caidas.forEach((c3, n) => { const QQ = c3.isla ? Q : Qh, [x, z] = QQ[c3.i], [nx, nz, tx, tz] = (c3.isla ? NOR : NORh)[c3.i];
    Object.assign(c3, { x, z, nx, nz, tx, tz, h0: (c3.isla ? H0 : H0h)[c3.i], ip: c3.isla && amplia ? cerca([x, z], Qh) : c3.i, fase: n * 1.7 + R() * 3, xo: x + nx * 0.3, zo: z + nz * 0.3 }); });
  const SEG = 30, LAD = 8, VC = (SEG + 1) * (LAD + 1);
  const aguaG = new THREE.BufferGeometry();
  const aPos = new Float32Array(caidas.length * VC * 3), aF = new Float32Array(caidas.length * VC * 4), aN = new Float32Array(caidas.length * VC * 2), aIx = [];
  caidas.forEach((_, n) => { const b = n * VC; for (let s = 0; s < SEG; s++) for (let j = 0; j < LAD; j++) { const a = b + s * (LAD + 1) + j, c4 = a + LAD + 1; aIx.push(a, c4, a + 1, a + 1, c4, c4 + 1); } });
  aguaG.setAttribute('position', new THREE.BufferAttribute(aPos, 3).setUsage(THREE.DynamicDrawUsage)); aguaG.setAttribute('aF', new THREE.BufferAttribute(aF, 4).setUsage(THREE.DynamicDrawUsage)); aguaG.setAttribute('aN', new THREE.BufferAttribute(aN, 2).setUsage(THREE.DynamicDrawUsage)); aguaG.setIndex(aIx); geos.push(aguaG);
  const AGUA = { uT: TIEMPO, uKI: { value: 0 }, uKB: { value: 0 }, uCorte: CORTE };
  const aguaVS = 'attribute vec4 aF; attribute vec2 aN; varying vec4 vF; varying vec3 vW, vN; varying float vY; void main() { vF = aF; vN = vec3(aN.x, 0.0, aN.y); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vY = w.y; gl_Position = projectionMatrix * viewMatrix * w; }';
  const aguaFS = (abajo) => `uniform float uT, uKI, uKB, uCorte; varying vec4 vF; varying vec3 vW, vN; varying float vY;
    float h(float x) { return fract(sin(x * 127.1) * 43758.5453); }
    void main() {
      if (${abajo ? 'vY > uCorte' : 'vY < uCorte'}) discard;
      float u = vF.x, fall = vF.y, f = fall / max(vF.z, 0.001), col = floor(u * 32.0);
      float s1 = fract(fall * 0.5 - uT * 1.7 + h(col) * 3.0), s2 = fract(fall * 1.3 - uT * 2.6 + h(col + 7.0) * 5.0);
      float hilo = 0.62 + 0.38 * sin(u * 6.2832 * 9.0 + h(col) * 6.0);
      float a = (0.36 + 0.38 * smoothstep(0.6, 1.0, s1) + 0.24 * smoothstep(0.78, 1.0, s2)) * hilo;
      a = max(a, (1.0 - smoothstep(0.0, 0.18, fall)) * 0.8);
      vec3 V = normalize(cameraPosition - vW), Vh = normalize(vec3(V.x, 0.0, V.z) + 1e-4);
      a *= smoothstep(0.08, 0.75, abs(dot(normalize(vN + 1e-4), Vh)));
      a *= 1.0 - smoothstep(0.5, 1.0, f);
      vec3 c = mix(vec3(0.5, 0.78, 1.0), vec3(1.0), smoothstep(0.5, 1.0, max(s1, s2)) * 0.9);
      gl_FragColor = vec4(c, a * (vF.w > 0.5 ? uKB : uKI));
    }`;
  const aguaM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: AGUA, vertexShader: aguaVS, fragmentShader: aguaFS(false) }); mats.push(aguaM);
  const aguaAM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: AGUA, vertexShader: aguaVS, fragmentShader: aguaFS(true), ...PLANT }); mats.push(aguaAM);
  const agua = new THREE.Mesh(aguaG, aguaM), aguaA = new THREE.Mesh(aguaG, aguaAM); agua.renderOrder = 3; aguaA.renderOrder = -0.65; agua.frustumCulled = aguaA.frustumCulled = false;
  scene.add(agua); sima.add(aguaA); agua.visible = false;

  // ---------- rocío, bruma y polvo: puntos blandos (dos pasadas, como el agua: en el aire y dentro del hueco) ----------
  const NR = 26, NB2 = 6, NP = 480, NT = caidas.length * (NR + NB2) + NP;
  const pPos = new Float32Array(NT * 3), pS = new Float32Array(NT), pC = new Float32Array(NT * 4);
  const ptoG = new THREE.BufferGeometry(); ptoG.setAttribute('position', new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage)); ptoG.setAttribute('aS', new THREE.BufferAttribute(pS, 1).setUsage(THREE.DynamicDrawUsage)); ptoG.setAttribute('aC', new THREE.BufferAttribute(pC, 4).setUsage(THREE.DynamicDrawUsage)); geos.push(ptoG);
  const PTO = { uEsc: { value: 600 }, uCorte: CORTE };
  const ptoVS = 'attribute float aS; attribute vec4 aC; uniform float uEsc; varying vec4 vC; varying float vY; void main() { vC = aC; vec4 w = modelMatrix * vec4(position, 1.0); vY = w.y; vec4 mv = viewMatrix * w; gl_Position = projectionMatrix * mv; gl_PointSize = aC.a > 0.003 ? clamp(aS * uEsc / max(0.1, -mv.z), 1.0, 256.0) : 0.0; }';
  const ptoFS = (abajo) => `uniform float uCorte; varying vec4 vC; varying float vY; void main() { if (${abajo ? 'vY > uCorte' : 'vY < uCorte'}) discard; float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, d) * vC.a; if (a < 0.004) discard; gl_FragColor = vec4(vC.rgb, a); }`;
  const ptoM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: PTO, vertexShader: ptoVS, fragmentShader: ptoFS(false) }), ptoAM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: PTO, vertexShader: ptoVS, fragmentShader: ptoFS(true), ...PLANT }); mats.push(ptoM, ptoAM);
  const pto = new THREE.Points(ptoG, ptoM), ptoA = new THREE.Points(ptoG, ptoAM); pto.renderOrder = 4; ptoA.renderOrder = -0.6; pto.frustumCulled = ptoA.frustumCulled = false; scene.add(pto); sima.add(ptoA); pto.visible = false;
  const fasesR = Float32Array.from({ length: caidas.length * NR }, () => R()), ladoR = Float32Array.from({ length: caidas.length * NR * 2 }, () => R() - 0.5);
  const polvo = Array.from({ length: NP }, () => ({ t: 9, x: 0, y: 0, z: 0, s: 0.3, vy: 0 }));
  let polvoN = 0, humo = 0; const VIDA_POLVO = 4.2;
  const echaPolvo = (x, y, z, s) => { const p = polvo[polvoN++ % NP]; Object.assign(p, { t: 0, x, y, z, s, vy: 0.15 + R() * 0.25 }); };

  yield;
  // ---------- piedras: las que flotan alrededor y las que se desprenden, de la isla y del borde del hueco ----------
  // (cada piedra, un canto roto de verdad y no un dodecaedro de doce caras planas: una bola de 80 caras con los vértices
  // compartidos, deformada con ruido en tres tamaños y con una cara más llana, de caliza clara con vetas y tierra pegada por
  // un lado. Desde el 17 de noviembre de 2026; antes eran poliedros grises que brillaban, «polígonos rectos»)
  const piedraG = (() => { const g1 = new THREE.IcosahedronGeometry(1, 1); g1.deleteAttribute('uv'); g1.deleteAttribute('normal'); const g2 = mergeVertices(g1), p2 = g2.attributes.position; g1.dispose();
    const col = new Float32Array(p2.count * 3), cal = C('#b9ae9b'), cal2 = C('#8f8676'), tie = C('#6a5541'), cc = new THREE.Color();
    for (let v = 0; v < p2.count; v++) { const x = p2.getX(v), y = p2.getY(v), z = p2.getZ(v), k = 0.7 + 0.42 * ruidoV(x * 1.4 + 3.3, z * 1.4 + y * 1.1) + 0.18 * ruidoV(x * 3.9 - y * 2.2, z * 3.9 + 1.9);
      p2.setXYZ(v, x * k * 1.15, Math.max(y * k * 0.8, -0.45), z * k);
      const n = ruidoV(x * 2.7 + y * 3.1, z * 2.7 - 4.1), sucio = Math.min(1, Math.max(0, (-y + 0.1 + (n - 0.5) * 0.6) * 1.6));
      cc.copy(cal).lerp(cal2, Math.min(1, Math.max(0, n * 1.4 - 0.3))).lerp(tie, sucio * 0.85); col[v * 3] = cc.r; col[v * 3 + 1] = cc.g; col[v * 3 + 2] = cc.b; }
    g2.setAttribute('color', new THREE.BufferAttribute(col, 3)); g2.computeVertexNormals(); return g2; })(); geos.push(piedraG);
  const flota = Array.from({ length: 12 }, () => ({ a: R() * Math.PI * 2, r: rMed * (0.8 + R() * 0.5), y: -D * (0.1 + R() * 0.7), s: 0.08 + R() * 0.2, w: (R() < 0.5 ? -1 : 1) * (0.05 + R() * 0.08), ph: R() * 6, rot: R() * 6 }));
  const NC = 140, caen = Array.from({ length: NC }, () => ({ vivo: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 0.1, rx: 0, ry: 0, wr: 1 }));
  let caeN = 0;
  const suelta = (x, y, z, vx, vy, vz, s) => { const p = caen[caeN++ % NC]; Object.assign(p, { vivo: true, x, y, z, vx, vy, vz, s, rx: R() * 6, ry: R() * 6, wr: 1 + R() * 3 }); };
  const piedraM = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#2e2820' }); mats.push(piedraM);   // (caliza, como la roca, y tierra)
  const piedraAM = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#2e2820', transparent: true, ...PLANT }); mats.push(piedraAM);
  const piedras = new THREE.InstancedMesh(piedraG, piedraM, flota.length + NC), piedrasA = new THREE.InstancedMesh(piedraG, piedraAM, NC);
  piedras.frustumCulled = piedrasA.frustumCulled = false; piedras.visible = false; piedrasA.renderOrder = -0.75; scene.add(piedras); sima.add(piedrasA);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  // (de dónde se desprende una piedra: de la panza de la isla, de un anillo cualquiera, o del borde del hueco, por dentro)
  const deLaIsla = (py, k) => { const kk = 2 + ((R() * 6) | 0), i = (R() * N) | 0, v = (kk * N1 + i) * 3; return [pos[v], py + pos[v + 1], pos[v + 2], NOR[i]]; };
  let antes = 0, reloj = 0;
  for (const x of pon) escena.add(x); geosF.push(...geos); matsF.push(...mats);

  return {
    /** si un punto cae dentro del cuerpo de la isla: x, z en el mapa; h, lo que queda por debajo de la base, en partes de
     *  D (negativo: por encima, en la comarca). Para no pintar encima de la roca los rótulos de lo que queda detrás */
    cuerpo(x, z, h) { if (h <= 0) return dentro(x, z); const f = 1 - Math.min(1, h) ** 1.6; return f > 0.03 && dentro(cx + (x - cx - ladoX * h ** 1.6) / f, cz + (z - cz - ladoZ * h ** 1.6) / f); },
    D, rMed, rMax, cx, cz, alto: Math.max(0.62 * rMed, D + 0.26 * rMed) + 0.9, base: B,
    /** la orilla (ver arriba): su campo, para los sombreadores, y la cuenta en JS; ki, cuánto ha bajado ya */
    orilla: { tex: orT.tex, rect: orT.rect, B, en: orillaEn }, get ki() { return KI; },   // (lo que sube: lo que mide la roca y algo más, para que la punta salga del hueco y se vea el lago debajo)
    /** py: la altura de la comarca; sy: lo que se estira su relieve; k: cuánto está fuera, de 0 a 1; t, dt: el tiempo;
     *  esc: los píxeles que ocupa una unidad a una unidad de la cámara (para el tamaño del rocío y el polvo); cam: la cámara */
    update(py, sy, k, t, dt, esc = 600, cam = null, hundidas = 0) {
      const on = k > 0.004; grupo.visible = piedras.visible = sima.visible = agua.visible = pto.visible = canto.visible = panzaA.visible = on;
      if (!on) { antes = k; KI = 0; for (const p of caen) p.vivo = false; for (const p of polvo) p.t = 9; return; }   // (p.t 9: apagada)
      const py0 = py; py = py + B * sy;   // (de aquí abajo, py es donde empieza la panza; py0, la base de la comarca)
      TIEMPO.value = t; TCOLG.value = t; PTO.uEsc.value = esc;
      // (la orilla baja nada más despegarse la isla: a un 30 % del camino ya está entera)
      const ki = ss(0.004, 0.16, k); if (Math.abs(ki - KI) > 0.002 || (ki === 0) !== (KI === 0)) { KI = ki; ponCanto(sy); }   // (17 de noviembre de 2026: la grieta se abre al despegar, casi a ras, y luego sube de una pieza; antes la orilla seguía bajando a media subida)   // (enseguida: si no, mientras sube se veía el monte cortado, con su roca alta)
      if (Math.abs(sy - cantoSy) > 0.002) ponCanto(sy);
      canto.position.y = py0; rocaM.uniforms.uTopeK.value = sy; rocaM.uniforms.uTopeI.value = KI;
      // (al soltarse: un derrumbe por todo el borde, de la isla y del hueco, con su polvo. Desde el 16 de noviembre de 2026,
      // se rompe de verdad: el doble de piedras, algunas grandes, y una nube de polvo, como humo, que sale de toda la grieta y
      // sube despacio. El autor: «cuando se despega de la tierra, debería romperse y salir un poco más de humo, como polvo»)
      // (y desde el 23 de noviembre de 2026, el polvo sale en cuanto la isla se mueve y sigue saliendo de la grieta mientras
      // sube, más espeso y más grande: tapa el canto mientras se forma. El autor: «lo que no me gusta es cómo suben las
      // comarcas… todo el labio se genera. Podrías añadir como humo para tapar esos errores»)
      if (k > 0.004 && antes <= 0.004) for (let n = 0; n < 150; n++) { const i = Math.floor((n + R() * 0.8) / 150 * N) % N;
        if (n % 2) { const [x, z] = Q[i], [nx, nz] = NOR[i]; echaPolvo(x + nx * (0.1 + R() * 0.35), py - 0.15 + R() * 0.25, z + nz * (0.1 + R() * 0.35), 2.4 + R() * 2.6); }
        else { const [x, z] = Qh[i], [nx, nz] = NORh[i], y0 = fuera(x + nx * 0.3, z + nz * 0.3); echaPolvo(x - nx * 0.1, y0 - 0.1, z - nz * 0.1, 2.2 + R() * 2.4); } }
      if (k > 0.004 && k < 0.5) { humo -= dt; while (humo <= 0) { humo += 0.04;
        for (let n = 0; n < 4; n++) { const i = (R() * N) | 0;
          if (n % 2) { const [x, z] = Qh[i], [nx, nz] = NORh[i], y0 = fuera(x + nx * 0.3, z + nz * 0.3); echaPolvo(x - nx * 0.1, y0 - 0.1, z - nz * 0.1, 1.8 + R() * 2.0); }
          else { const [x, z] = Q[i], [nx, nz] = NOR[i]; echaPolvo(x + nx * (0.1 + R() * 0.3), py - 0.25 - R() * 0.4, z + nz * (0.1 + R() * 0.3), 1.9 + R() * 2.2); } } } }
      if (k > 0.03 && antes <= 0.03) {
        for (let n = 0; n < 90; n++) {
          const i = (R() * N) | 0, [x, z] = (n % 2 ? Q : Qh)[i], [nx, nz] = (n % 2 ? NOR : NORh)[i], s = 0.05 + R() * (n < 16 ? 0.32 : 0.14);
          if (n % 2) suelta(x + nx * 0.05, py - 0.05, z + nz * 0.05, nx * (0.3 + R() * 0.8), 0.3 + R() * 0.7, nz * (0.3 + R() * 0.8), s);
          else { const y0 = fuera(x + nx * 0.3, z + nz * 0.3); suelta(x - nx * 0.08, y0, z - nz * 0.08, -nx * (0.05 + R() * 0.3), R() * 0.35, -nz * (0.05 + R() * 0.3), s); }
        }
        // (la nube: repartida a lo largo de toda la grieta, por fuera de la isla y por dentro del hueco)
        for (let n = 0; n < 72; n++) { const i = Math.floor((n + R() * 0.8) / 72 * N) % N;
          if (n % 2) { const [x, z] = Q[i], [nx, nz] = NOR[i]; echaPolvo(x + nx * 0.15, py - 0.1 - R() * 0.3, z + nz * 0.15, 1.1 + R() * 1.3); }
          else { const [x, z] = Qh[i], [nx, nz] = NORh[i], y0 = fuera(x + nx * 0.3, z + nz * 0.3); echaPolvo(x - nx * 0.1, y0 - 0.15, z - nz * 0.1, 1.0 + R() * 1.2); } }
      }
      antes = k;
      // (y luego, sin parar, unas pocas cada segundo; de vez en cuando, con polvo)
      reloj -= dt;
      if (k > 0.35 && reloj <= 0) { reloj = 0.12 + R() * 0.35;
        if (R() < 0.6) { const [x, y, z, [nx, nz]] = deLaIsla(py, k); suelta(x, y, z, nx * R() * 0.25, -R() * 0.2, nz * R() * 0.25, 0.04 + R() * 0.12); if (R() < 0.18) echaPolvo(x, y, z, 0.5 + R() * 0.6); }
        else { const i = (R() * N) | 0, [x, z] = Qh[i], [nx, nz] = NORh[i], y0 = fuera(x + nx * 0.3, z + nz * 0.3); suelta(x - nx * 0.06, y0 - 0.05, z - nz * 0.06, -nx * R() * 0.15, 0, -nz * R() * 0.15, 0.03 + R() * 0.1); if (R() < 0.12) echaPolvo(x, y0 - 0.1, z, 0.5 + R() * 0.5); }
      }
      // (la isla es una pieza: sale entera del hueco, que se queda a la altura del corte. La boca baja lo que se hunden las
      // comarcas vecinas al quedar de fondo: si quedaba por encima de su borde, entre las dos se veía una cuña de la base
      // oscura del mapa, sin hueco ni lago, 14 de noviembre de 2026)
      const corte = B * sy - hundidas; CORTE.value = corte; molde.position.y = corte;
      grupo.position.y = py; panzaA.position.y = py; panzaA.visible = true;
      // el agua
      AGUA.uKI.value = Math.min(1, Math.max(0, (k - 0.55) / 0.35)); AGUA.uKB.value = Math.min(1, Math.max(0, (k - 0.2) / 0.4));
      const fondo = corte + LAGO;
      caidas.forEach((c3, n) => {
        const top = c3.isla ? py0 + (c3.h0 - KI * (c3.h0 - YB[c3.i])) * sy : fuera(c3.xo, c3.zo), L2 = Math.max(0.5, top - fondo); c3.top = top; c3.L = L2;
        const b = n * VC;
        for (let s = 0; s <= SEG; s++) {
          const f = (s / SEG) ** 1.15, y = top - L2 * f, cae = top - y;
          // (lo que se aparta del borde: la de la isla, por fuera del canto y luego bajo la panza, que se mete; la del hueco,
          // del canto de la vecina hacia dentro)
          const off = c3.isla ? 0.1 - 0.25 * Math.min(1, Math.max(0, (py - y) / (D * k * 0.14 + 0.05))) : 0.12 - 0.24 * Math.min(1, cae / 0.2);
          const ww = c3.w * (c3.isla ? 1 + 0.9 * f ** 0.7 : 0.9 + 0.7 * f ** 0.8), mece = Math.sin(t * 0.7 + f * 3 + c3.fase) * 0.05 * f;
          // (bajo la orilla, por la pared del cráter, que se va cerrando, hasta el lago)
          let ox = c3.x + c3.nx * off + c3.tx * mece, oz = c3.z + c3.nz * off + c3.tz * mece;
          if (y < corte) { const [wx, wz] = porPared(c3.ip, y - corte), rx = wx - cxh, rz = wz - czh, rr = Math.hypot(rx, rz) || 1; ox = wx - rx / rr * 0.16 + c3.tx * mece; oz = wz - rz / rr * 0.16 + c3.tz * mece; }
          for (let j = 0; j <= LAD; j++) { const th = j / LAD * Math.PI * 2, ct = Math.cos(th) * ww / 2, st = Math.sin(th) * ww * 0.26, vi = b + s * (LAD + 1) + j;
            aPos[vi * 3] = ox + c3.tx * ct + c3.nx * st; aPos[vi * 3 + 1] = y; aPos[vi * 3 + 2] = oz + c3.tz * ct + c3.nz * st;
            aF[vi * 4] = j / LAD; aF[vi * 4 + 1] = cae; aF[vi * 4 + 2] = L2; aF[vi * 4 + 3] = c3.isla ? 0 : 1;
            aN[vi * 2] = c3.tx * Math.cos(th) + c3.nx * Math.sin(th); aN[vi * 2 + 1] = c3.tz * Math.cos(th) + c3.nz * Math.sin(th); }
        }
      });
      aguaG.attributes.position.needsUpdate = aguaG.attributes.aF.needsUpdate = aguaG.attributes.aN.needsUpdate = true;
      // el rocío que baja con cada columna y la bruma de abajo, que se junta con las nubes
      let pi = 0;
      caidas.forEach((c3, n) => {
        const kk = c3.isla ? AGUA.uKI.value : AGUA.uKB.value;
        for (let r = 0; r < NR; r++) { const id2 = n * NR + r, u = (t * (0.11 + fasesR[id2] * 0.07) + fasesR[id2]) % 1, y = c3.top - c3.L * u * 0.92;
          const ab = c3.w * (0.4 + u * 1.6), sx = ladoR[id2 * 2] * ab, sz2 = ladoR[id2 * 2 + 1] * ab * 0.6 + u * 0.35, de = c3.isla ? 0 : -0.1;
          pPos[pi * 3] = c3.x + c3.tx * sx + c3.nx * (sz2 + de); pPos[pi * 3 + 1] = y; pPos[pi * 3 + 2] = c3.z + c3.tz * sx + c3.nz * (sz2 + de);
          pS[pi] = c3.w * (0.5 + u * 2.4); pC[pi * 4] = 0.92; pC[pi * 4 + 1] = 0.96; pC[pi * 4 + 2] = 1; pC[pi * 4 + 3] = kk * 0.32 * Math.sin(Math.PI * Math.min(1, u * 1.25)) * (1 - u * 0.5); pi++; }
        for (let r = 0; r < NB2; r++) { const a = r / NB2 * Math.PI * 2 + t * 0.05 + c3.fase, rr = c3.w * 1.6;
          pPos[pi * 3] = c3.x - c3.nx * 0.4 + Math.cos(a) * rr; pPos[pi * 3 + 1] = corte + LAGO + 0.25 + Math.sin(t * 0.4 + r) * 0.08; pPos[pi * 3 + 2] = c3.z - c3.nz * 0.4 + Math.sin(a) * rr;
          pS[pi] = c3.w * 6; pC[pi * 4] = 0.95; pC[pi * 4 + 1] = 0.97; pC[pi * 4 + 2] = 1; pC[pi * 4 + 3] = kk * 0.35; pi++; }
      });
      // (cada bocanada de polvo se abre, sube despacio y se deshace en algo más de 4 s)
      for (const p of polvo) {
        if (p.t < VIDA_POLVO) { p.t += dt; p.y += p.vy * dt * (1 - p.t / (VIDA_POLVO + 0.8)); }
        const f = Math.min(1, p.t / VIDA_POLVO); pPos[pi * 3] = p.x; pPos[pi * 3 + 1] = p.y; pPos[pi * 3 + 2] = p.z;
        pS[pi] = p.s * (0.6 + f * 2.4); pC[pi * 4] = 0.86; pC[pi * 4 + 1] = 0.82; pC[pi * 4 + 2] = 0.75; pC[pi * 4 + 3] = p.t < VIDA_POLVO ? 0.7 * (1 - f) ** 1.3 * Math.min(1, p.t * 5) : 0; pi++;
      }
      ptoG.attributes.position.needsUpdate = ptoG.attributes.aS.needsUpdate = ptoG.attributes.aC.needsUpdate = true;
      // las piedras
      let n = 0, na = 0;
      for (const p of flota) {
        const a = p.a + t * p.w, y = py + p.y * k + Math.sin(t * 0.9 + p.ph) * 0.12, sc = p.s * Math.min(1, k * 1.4);
        e.set(p.rot + t * 0.2, p.rot * 2 + t * 0.13, 0); q.setFromEuler(e);
        piedras.setMatrixAt(n++, m4.compose(v3.set(cx + Math.cos(a) * p.r, y, cz + Math.sin(a) * p.r), q, s3.set(sc, sc * 0.8, sc)));
      }
      for (const p of caen) {
        if (!p.vivo) continue;
        p.vy -= 5.5 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= 1 - dt * 0.3; p.vz *= 1 - dt * 0.3;
        if (p.y < corte + LAGO + 0.08) { p.vivo = false; if (dentroH(p.x, p.z) && p.s > 0.07) echaPolvo(p.x, corte + LAGO + 0.15, p.z, 0.35 + p.s * 2); continue; }   // (llegan al fondo del hueco: salpican)
        const enHueco = dentroH(p.x, p.z);
        if (!enHueco && p.y < fuera(p.x, p.z)) { p.vivo = false; continue; }   // (fuera del hueco, al llegar al suelo, se queda)
        const sc = p.s;
        e.set(p.rx + t * p.wr, p.ry + t * p.wr * 0.7, 0); q.setFromEuler(e); m4.compose(v3.set(p.x, p.y, p.z), q, s3.set(sc, sc * 0.8, sc));
        if (p.y > corte + 0.02 || !enHueco) piedras.setMatrixAt(n++, m4); else piedrasA.setMatrixAt(na++, m4);
      }
      piedras.count = n; piedrasA.count = na;
      piedras.instanceMatrix.needsUpdate = true; piedrasA.instanceMatrix.needsUpdate = true;
    },
    dispose() { scene.remove(grupo, piedras, sima, agua, pto, canto, panzaA); },
  };
}

/** El cielo azul con nubes pequeñas, como el de las imágenes del autor: una esfera alrededor de la cámara (BackSide) con su
 *  degradado (azul intenso lejos del horizonte, claro junto a él) y cúmulos blancos sueltos. uK: cuánto se ve sobre uFondo
 *  (el color de siempre del mapa). Lo usan la isla, por el hueco, y el mapa, de fondo mientras hay una isla en el aire. */
export function cieloShader() {
  return {
    uniforms: { uK: { value: 0 }, uT: { value: 0 }, uFondo: { value: C('#101626') }, uArriba: { value: CIELO_ARRIBA }, uHorizonte: { value: CIELO_HORIZONTE }, uMedio: { value: CIELO_MEDIO }, uBruma: { value: CIELO_HORIZONTE.clone() } },
    vertexShader: 'varying vec3 vD; void main() { vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uK, uT; uniform vec3 uFondo, uArriba, uHorizonte, uMedio, uBruma; varying vec3 vD;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        // (por debajo del horizonte, y justo encima, la bruma de lo lejano, la misma en la que se pierde la tierra: donde
        // el mapa se acaba no hay raya ni franja de otro azul, el suelo se deshace en el cielo)
        // (azul de verdad en cuanto se levanta la vista del horizonte: claro abajo, vivo a media altura y hondo arriba. Las
        // nubes ya no se pintan aquí, que salían planas: son las de mapa3dNubes.js, con su volumen)
        vec3 d = normalize(vD); float e = max(d.y, 0.0);
        vec3 cs = mix(mix(uHorizonte, uMedio, smoothstep(0.0, 0.045, e)), uArriba, smoothstep(0.035, 0.27, e));
        vec3 c = mix(uBruma, cs, smoothstep(0.0, 0.06, d.y));
        gl_FragColor = linearToOutputTexel(vec4(mix(uFondo, c, uK), 1.0));
      }` };
}
