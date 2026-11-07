// El mapa 3D del inicio (hub/mapa3d.js), los sombreadores: la chincheta de cada pueblo, el borde de las comarcas y el
// color del relieve como en los mapas físicos.
import { CX, CY, S } from './mapa3dFormas.js';

// ---------- la chincheta de cada pueblo ----------
// Cada pueblo, una chincheta quieta: en el suelo, su sombra; un palito oscuro; y arriba, la cabeza, un disco siempre de
// cara a la cámara con el borde oscuro. Antes era una baliza holográfica cian que giraba y se confundía con los ríos, que
// son cian. Al señalarla, crece y brilla; al elegirla, un aro blanco en el suelo y otro en la cabeza; en el pueblo donde
// estás, un pulso rosa en el suelo y el haz de luz. Cada pieza, un solo dibujo para todos los pueblos (aCol: su color;
// aInf: su fase, más 10 en el pueblo donde estás, lo hecho, lo señalado y lo elegido; aTip: si es pueblo, ciudad o zona de
// naturaleza, y su estado)
// (los pueblos del mapa, en chinchetas: por descubrir, blancas; empezadas, magenta; selladas, doradas. Nada de cian, que
// es el color de los ríos y se confundían con ellos)
export const BALIZA = { '': '#ffffff', go: '#ff3fd8', ok: '#ffc640' }, CRISTAL_Y = 1.3;
const BAL_VS = 'attribute vec3 aCol; attribute vec4 aInf; varying vec3 vCol; varying vec4 vInf;\n';
export const MIRA_VS = BAL_VS + 'varying vec2 vP; void main() { vCol = aCol; vInf = aInf; vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }';
export const MIRA_FS = `uniform float uT; varying vec3 vCol; varying vec4 vInf; varying vec2 vP;
float aro(float r, float a, float b, float w) { return smoothstep(a - w, a, r) * (1.0 - smoothstep(b, b + w, r)); }
void main() {
  // (en el suelo, solo la sombra que ancla la chincheta; al señalarla o elegirla, un aro blanco; en el pueblo donde estás,
  // un pulso rosa que se abre despacio. Sin luces de colores sobre el relieve: se confundían con los ríos)
  float r = length(vP), w = fwidth(r) * 1.2 + 0.004, aqui = step(9.5, vInf.x), fase = vInf.x - 10.0 * aqui;
  float sombra = (1.0 - smoothstep(0.0, 0.34, r)) * 0.5;
  float marca = aro(r, 0.5, 0.58, w) * max(vInf.z, vInf.w);
  float p = fract(uT * 0.45 + fase * 0.37), pulso = aqui * aro(r, p * 0.95 - 0.05, p * 0.95, w) * (1.0 - p);
  float a = max(sombra * (1.0 - marca), max(marca, pulso));
  if (a < 0.004) discard;
  vec3 col = mix(vec3(0.05, 0.02, 0.12), vec3(1.0), step(0.001, marca));
  col = mix(col, vec3(1.0, 0.25, 0.85), step(sombra * (1.0 - marca) + marca, pulso));
  gl_FragColor = vec4(col, a);
}`;
// la cabeza de la chincheta: un disco siempre de cara a la cámara, quieto, con su borde oscuro para que se lea sobre
// cualquier color del mapa y del color de su estado. aTip.x: 0 pueblo, 1 ciudad, 2 zona de naturaleza; aTip.y: 0 por
// descubrir (blanca con su punto morado; las ciudades, con diana; las zonas, con el punto verde), 1 empezada (magenta, con
// lo que lleva hecho en un arco blanco alrededor), 2 sellada (dorada con la marca verde, como en todo el juego)
export const PIN_VS = BAL_VS + `attribute vec2 aTip; varying vec2 vP; varying vec2 vTip;
void main() { vCol = aCol; vInf = aInf; vTip = aTip; vP = position.xy * 1.3;
  vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); float s = length(instanceMatrix[0].xyz);
  c.xy += position.xy * s * 1.3; gl_Position = projectionMatrix * c; }`;
export const PIN_FS = `uniform float uT; varying vec3 vCol; varying vec4 vInf; varying vec2 vP; varying vec2 vTip;
float disco(float r, float R, float w) { return 1.0 - smoothstep(R - w, R, r); }
float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }
void main() {
  float r = length(vP), w = fwidth(r) * 1.3 + 0.01, est = vTip.y, tipo = vTip.x;
  vec3 oscuro = vec3(0.07, 0.03, 0.16), morado = vec3(0.30, 0.13, 0.55), verde = vec3(0.08, 0.54, 0.25);
  float borde = disco(r, 1.0, w), relleno = disco(r, 0.8, w);
  vec3 col = mix(oscuro, vCol * (1.0 + 0.15 * vInf.z), relleno);
  if (est < 0.5) {
    float punto = disco(r, tipo > 0.5 && tipo < 1.5 ? 0.42 : 0.3, w);
    col = mix(col, tipo > 1.5 ? verde : morado, punto);
    col = mix(col, vec3(1.0), tipo > 0.5 && tipo < 1.5 ? disco(r, 0.16, w) : 0.0);
  } else if (est < 1.5) {
    col = mix(col, vec3(1.0), disco(r, 0.26, w));
    float an = fract(0.25 - atan(vP.y, vP.x) / 6.2831853);
    col = mix(col, vec3(1.0), step(an, vInf.y) * smoothstep(0.8, 0.84, r) * (1.0 - smoothstep(0.95, 0.99, r)));
  } else {
    float d = min(seg(vP, vec2(-0.36, 0.0), vec2(-0.1, -0.27)), seg(vP, vec2(-0.1, -0.27), vec2(0.38, 0.26)));
    col = mix(col, verde, 1.0 - smoothstep(0.1, 0.1 + w, d));
  }
  // (elegida, un aro blanco por fuera; y una sombra suave debajo, que la despega del relieve)
  float fuera = vInf.w * smoothstep(1.06 - w, 1.06, r) * (1.0 - smoothstep(1.2, 1.2 + w, r));
  float sombra = disco(length(vP - vec2(0.0, -0.1)), 1.12, 0.22) * 0.4;
  col = mix(col, vec3(1.0), fuera);
  float a = max(max(borde, fuera), sombra);
  if (a < 0.004) discard;
  gl_FragColor = vec4(mix(oscuro, col, max(borde, fuera) / a), a);
}`;
export const HILO_VS = BAL_VS + 'varying float vY; void main() { vCol = aCol; vInf = aInf; vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }';
export const HILO_FS = 'varying vec3 vCol; varying vec4 vInf; varying float vY; void main() { gl_FragColor = vec4(0.06, 0.03, 0.14, 0.55 + 0.35 * vY); }';   // (el palito de la chincheta, oscuro)
export const HALO_VS = BAL_VS + 'attribute float aS; uniform float uEsc; void main() { vCol = aCol; vInf = aInf; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aS * uEsc / -mv.z; }';
export const HALO_FS = 'varying vec3 vCol; varying vec4 vInf; void main() { float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard; gl_FragColor = vec4(vCol, (1.0 - r) * (1.0 - r) * (0.3 + 0.25 * vInf.z)); }';
// (el borde de cada comarca, y su panza: una losa limpia, como una pieza de cristal oscuro, del morado del juego con el
// color de la comarca, que se apaga hacia abajo; arriba, un filo fino que brilla con su color y un halo suave debajo. Algo
// de luz propia, para que la panza, a la sombra, no quede negra)
export const BORDE_VS = ['attribute float tope; varying float vProf;\n', '#include <begin_vertex>\nvProf = tope - position.y;'];
export const BORDE_FS = ['uniform float uLuzP; uniform vec3 uFilo; varying float vProf;\n', `#include <color_fragment>
  diffuseColor.rgb *= mix(1.0, 0.42, smoothstep(0.0, 1.6, vProf));`, `#include <emissivemap_fragment>
  totalEmissiveRadiance += uFilo * (1.0 - smoothstep(0.0, 0.05, vProf) + 0.35 * (1.0 - smoothstep(0.0, 0.5, vProf))) + diffuseColor.rgb * uLuzP;`];
// ---------- el color del relieve, como en los mapas físicos ----------
// La altura da el color (verde en los valles, ocre y pardo en las sierras, gris y blanco en las cumbres) y la imagen del
// sombreado fino (tools/relieve/mapa-relieve.py: cada ladera según su pendiente, con luz del noroeste) le pone la luz y
// las sombras de cada barranco. Las cuentas van en sRGB, como en un mapa impreso. Las comarcas por descubrir, algo
// apagadas y hacia el malva; uBrillo, lo que se aclara al pasar por encima o al elegirla. De cerca, encima, el relieve
// fino de la comarca (uDet, unos 28 m, ya pintado igual), que entra poco a poco (uDetK).
export const PALETA = [[0, '#3e8c3a'], [250, '#5ca03e'], [450, '#80ac4e'], [650, '#aab266'], [850, '#b8a070'], [1100, '#a07e5a'], [1400, '#846852'], [1700, '#8c8078'], [2000, '#cdc8c6'], [2400, '#f5f4f4']];
export const RELIEVE_VS = `varying vec2 vXZ; varying float vH, vSom;
#include <fog_pars_vertex>
void main() { vXZ = position.xz; vH = position.y; vSom = color.r; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`;
// (la sombra de las nubes que pasan despacio por encima de Navarra y de lo que la rodea, en unidades del mundo: manchas
// grandes y blandas, de unos diez kilómetros, que van hacia el este con el viento del oeste)
export const NUBES = `uniform float uT;
float hashN(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.743); }
float ruidoN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hashN(i), hashN(i + vec2(1, 0)), f.x), mix(hashN(i + vec2(0, 1)), hashN(i + vec2(1, 1)), f.x), f.y); }
float nubes(vec2 p) { vec2 q = p * 0.075 + vec2(uT * 0.03, uT * 0.008); float n = ruidoN(q) * 0.62 + ruidoN(q * 2.3 + 4.1) * 0.28 + ruidoN(q * 5.3 + 9.7) * 0.1; return smoothstep(0.48, 0.7, n); }
`;
export const RELIEVE_FS = `uniform sampler2D uSombra, uDet, uP0, uP1, uP2, uP3, uBosque; uniform vec4 uRect, uDetRect, uPR[4], uHueco, uBosqueR; uniform float uPK[4], uCerca, uTex, uDetK, uListo, uGrosor, uExa, uGris, uTintK, uBrillo; uniform vec3 uTinte, uPal[${PALETA.length}]; uniform float uCota[${PALETA.length}];
varying vec2 vXZ; varying float vH, vSom;
${NUBES}
#include <fog_pars_fragment>
// (un pueblo pintado encima, si el punto cae en su recuadro)
vec4 pue(sampler2D t, vec4 r, float k, vec2 sv) { vec2 u = (sv - r.xy) / r.zw; if (k <= 0.0 || u.x < 0.0 || u.y < 0.0 || u.x > 1.0 || u.y > 1.0) return vec4(0.0); vec4 p = texture2D(t, u); return vec4(p.rgb, p.a * k); }
// (el grano fino de cerca: ruido de valores en dos octavas, en unidades del mapa)
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ruido(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
// (una parcela de cultivo, en una rejilla girada de casillas de t de lado: su color, trigo, verde, barbecho, viña u olivo o
// arado, y lo cerca que está de su linde; en el sur, las viñas en hileras, si se ven)
vec4 parcela(vec2 sv, float t) {
  vec2 zc = floor(sv / 46.0);   // (cada zona, con su rumbo: girar toda la rejilla en torno a un punto hacía círculos)
  float ga = hash(zc + 3.7) * 3.1416, cg = cos(ga), sg = sin(ga);
  vec2 pr = mat2(cg, -sg, sg, cg) * (sv - zc * 46.0) / t * vec2(1.1, 1.9);
  // (sin rejilla de tablero: cada hilera de parcelas, corrida al azar, y cada parcela partida en una, dos o tres tiras, como
  // los campos de verdad; antes eran cuadros iguales en diagonal)
  pr.x += hash(vec2(floor(pr.y), 5.1) + zc * 3.0);
  float tiras = 1.0 + floor(hash(floor(pr) + zc * 13.0 + 1.7) * 2.99);
  vec2 q = vec2(pr.x * tiras, pr.y), fr = fract(q), aw = fwidth(q) * 0.9 + 0.006;
  float hp = hash(floor(q) + t * 7.0 + zc * 13.0), linde = 1.0 - smoothstep(0.0, 1.0, min(min(fr.x, 1.0 - fr.x) / aw.x, min(fr.y, 1.0 - fr.y) / aw.y));
  vec3 tono = hp < 0.24 ? vec3(0.88, 0.76, 0.42) : hp < 0.44 ? vec3(0.46, 0.62, 0.3) : hp < 0.58 ? vec3(0.7, 0.6, 0.42) : hp < 0.76 ? vec3(0.56, 0.6, 0.34) : vec3(0.58, 0.44, 0.32);
  float h9 = fract(pr.x * 9.0), vina = step(0.58, hp) * step(hp, 0.76) * smoothstep(430.0, 560.0, sv.y) * (1.0 - smoothstep(0.25, 0.6, fwidth(pr.x * 9.0)));
  return vec4(tono * (1.0 - vina * 0.3 * smoothstep(0.35, 0.65, abs(h9 - 0.5) * 2.0)), linde);
}
void main() {
  if (uHueco.w > 0.5 && distance(vXZ, uHueco.xy) < uHueco.z) discard;   // (donde está la maqueta de un pueblo)
  float m = max(0.0, (vH - uGrosor) / uExa);
  vec3 c = uPal[0];
  for (int i = 1; i < ${PALETA.length}; i++) c = mix(c, uPal[i], clamp((m - uCota[i - 1]) / (uCota[i] - uCota[i - 1]), 0.0, 1.0));
  vec2 sv = vXZ / ${S.toFixed(1)} + vec2(${CX.toFixed(1)}, ${CY.toFixed(1)});
  float s = mix(vSom * 0.95, texture2D(uSombra, (sv - uRect.xy) / uRect.zw).r * 1.7, uListo);
  // (las laderas en sombra, sin llegar al negro: en los valles cerrados del norte se perdía el dibujo del monte)
  s += 0.22 * (1.0 - smoothstep(0.0, 0.7, s));
  c = c * s + 0.35 * pow(clamp((s - 0.3) / 1.05, 0.0, 1.0), 8.0);
  // (el relieve fino, más nítido: de cerca, cuando cada punto de su imagen ocupa más de un píxel, se le resta lo borroso
  // de alrededor y se marcan crestas y barrancos; de lejos no, que titilaría)
  { vec2 du = (sv - uDetRect.xy) / uDetRect.zw; vec3 d0 = texture2D(uDet, du).rgb;
#ifndef LIGERO
    vec2 px = 1.0 / vec2(textureSize(uDet, 0));
    float ppt = px.x / max(1e-7, fwidth(du.x)), nit = smoothstep(0.7, 2.2, ppt) * 0.9 * uDetK;
    if (nit > 0.01) { vec3 bl = (texture2D(uDet, du + vec2(px.x, 0.0)).rgb + texture2D(uDet, du - vec2(px.x, 0.0)).rgb + texture2D(uDet, du + vec2(0.0, px.y)).rgb + texture2D(uDet, du - vec2(0.0, px.y)).rgb) * 0.25;
      d0 = clamp(d0 + (d0 - bl) * nit, 0.0, 1.0); }
#endif
    c = mix(c, d0, uDetK); }
  // (el clima en el color: el norte atlántico, más verde y jugoso; la Ribera, seca, de cereal y viña, dorada y ocre)
  float surC = smoothstep(380.0, 600.0, sv.y), norC = 1.0 - smoothstep(120.0, 300.0, sv.y);
  c = mix(c, c * vec3(1.16, 1.02, 0.74) + vec3(0.04, 0.02, 0.0), surC * 0.55);
  c = mix(c, c * vec3(0.88, 1.06, 0.86), norC * 0.5);
  // (de lejos, en la vista de toda Navarra: manchas grandes de tono, unas tierras más claras y otras más oscuras, unas
  // más doradas y otras más verdes, como los campos, los pastos y los montes vistos desde un avión)
  float mk = ruido(sv * 0.09) * 0.6 + ruido(sv * 0.31) * 0.4 - 0.5, mh = ruido(sv * 0.17 + 7.3) - 0.5;
  c *= 1.0 + mk * 0.34 * uTex;
  c = mix(c, c * vec3(1.1, 1.0, 0.82), clamp(mh * 1.8, 0.0, 1.0) * 0.55 * uTex);
  c = mix(c, c * vec3(0.88, 1.07, 0.88), clamp(-mh * 1.8, 0.0, 1.0) * 0.55 * uTex);
  // (las texturas del terreno, desde la vista de una comarca: en el llano, parcelas de cultivo de colores, con sus lindes, en
  // una rejilla que cambia de rumbo por zonas y de tamaño con la distancia, para que nunca tiemble; en el sur, viñas en
  // hileras; en el monte del norte, el moteado de las copas del bosque; en las cumbres y en lo muy pendiente, roca; y de
  // muy cerca, el grano fino)
  if (uTex > 0.0) {
    float pend = fwidth(vH) / (length(fwidth(vXZ)) + 1e-6), sur = smoothstep(430.0, 560.0, sv.y), lum = dot(c, vec3(0.3, 0.59, 0.11));
    float llano = (1.0 - smoothstep(0.18, 0.55, pend)) * (1.0 - smoothstep(750.0, 1050.0, m));
    float bosque = texture2D(uBosque, (sv - uBosqueR.xy) / uBosqueR.zw).r;   // (donde están los árboles: la misma máscara)
    float lv = log2(max(length(fwidth(sv)) * 30.0, 0.9)), l0 = floor(lv), fl = smoothstep(0.38, 0.62, fract(lv));
    vec4 pa = mix(parcela(sv, exp2(l0)), parcela(sv, exp2(l0 + 1.0)), fl);
    vec3 tono = pa.rgb;
    c = mix(c, tono * (lum / dot(tono, vec3(0.3, 0.59, 0.11))) * (1.0 - 0.2 * pa.a), llano * (1.0 - bosque) * 0.62 * uTex);
    float ko = exp2(-l0) * 2.4, copas = ruido(sv * ko) * 0.6 + ruido(sv * ko * 2.7) * 0.4;
    c = mix(c, vec3(0.2, 0.36, 0.16) * (lum * 1.9) * (0.72 + 0.56 * copas), bosque * 0.55 * uTex);
    float roca = clamp(smoothstep(1450.0, 1750.0, m) + smoothstep(0.9, 1.7, pend) * 0.6, 0.0, 1.0);
    c = mix(c, vec3(dot(c, vec3(0.34))) * vec3(1.02, 1.0, 0.98) * (0.84 + 0.32 * ruido(sv * ko * 4.0)), roca * 0.4 * uTex);
#ifndef LIGERO
    if (uCerca > 0.0) c *= 1.0 + (ruido(sv * 18.0) * 0.6 + ruido(sv * 55.0) * 0.4 - 0.5) * 0.14 * uCerca;
#endif
  }
  // (el color, más vivo y más limpio: los verdes y ocres apagados, con algo más de color; las sombras, sin llegar al negro,
  // hacia un azul malva, como en los mapas de relieve dibujados (de cerca, en los valles entre montes, se veían negras); y
  // las luces, algo más cálidas, de sol de tarde)
  { float l = dot(c, vec3(0.299, 0.587, 0.114)), sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
    c = max(vec3(0.0), mix(vec3(l), c, 1.0 + 0.55 * (1.0 - smoothstep(0.05, 0.32, sat))));
    c = mix(c, vec3(0.3, 0.31, 0.47) * (0.45 + l * 1.45), (1.0 - smoothstep(0.05, 0.42, l)) * 0.6);
    c *= mix(vec3(1.0), vec3(1.06, 1.03, 0.9), smoothstep(0.42, 0.85, l)); }
  vec4 p = pue(uP0, uPR[0], uPK[0], sv); c = mix(c, p.rgb, p.a);
  p = pue(uP1, uPR[1], uPK[1], sv); c = mix(c, p.rgb, p.a);
  p = pue(uP2, uPR[2], uPK[2], sv); c = mix(c, p.rgb, p.a);
  p = pue(uP3, uPR[3], uPK[3], sv); c = mix(c, p.rgb, p.a);
  // (el agua pintada en el suelo de los pueblos, ríos, balsas y piscinas, se mueve: ondas de unos 7 m que se cruzan y
  // destellos; en metros desde el centro de la maqueta, y solo donde se distinguen, para que de lejos no titile)
  float ag = smoothstep(0.14, 0.05, abs(c.b - 0.91)) * smoothstep(0.25, 0.4, c.b - c.r);
  if (ag > 0.01) {
    vec2 pm = (vXZ - uHueco.xy * step(0.5, uHueco.w)) * 2076.0;
    float w = sin(pm.x * 0.9 + pm.y * 0.4 - uT * 2.2 + sin(pm.y * 0.35 + uT * 0.7) * 1.8) * 0.55 + sin(pm.y * 1.1 - pm.x * 0.5 - uT * 1.7 + sin(pm.x * 0.3 - uT * 0.5) * 1.6) * 0.45;
    float fino = 1.0 - smoothstep(1.5, 4.0, length(fwidth(pm)));
    c = mix(c, c * (0.92 + 0.08 * w) + vec3(0.24, 0.22, 0.18) * smoothstep(0.66, 0.98, w), ag * fino);
  }
  c = mix(c, vec3(dot(c, vec3(0.299, 0.587, 0.114))) * vec3(0.95, 0.92, 1.1), uGris);
#ifndef LIGERO
  c *= 1.0 - 0.3 * nubes(vXZ);   // (en el ordenador de calidad baja, LIGERO, sin la sombra de las nubes ni el grano fino)
#endif
  gl_FragColor = vec4(mix(c, uTinte, uTintK) * uBrillo, 1.0);
#include <fog_fragment>
}`;
// (el relieve de la maqueta de un pueblo: pasa poco a poco de la altura de la comarca, position.y, a la del pueblo, hd)
export const PARCHE_VS = RELIEVE_VS.replace('varying vec2 vXZ;', 'attribute float hd; uniform float uMaqK; varying vec2 vXZ;')
  .replace('vH = position.y;', 'vec3 q = vec3(position.x, mix(position.y, hd, uMaqK), position.z); vH = q.y;').replace('vec4(position, 1.0)', 'vec4(q, 1.0)');
