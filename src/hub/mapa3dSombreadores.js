// El mapa 3D del inicio (hub/mapa3d.js), los sombreadores: la baliza de cada pueblo, el borde de las comarcas y el
// color del relieve como en los mapas físicos.
import { CX, CY, S } from './mapa3dFormas.js';

// ---------- la baliza de cada pueblo ----------
// Una baliza holográfica: en el suelo, una mira que se proyecta sobre el terreno (un anillo de trazos que gira, un círculo
// fino, cuatro marcas que giran al revés y una onda que se abre); un hilo de luz que sube; y arriba, flotando y girando, un
// cristal tallado de seis caras que se llena de luz con las misiones hechas, con su halo y una órbita inclinada por la que
// corre un punto de luz (dos, en los sellados). Cian y hueco por descubrir, fucsia y a medias
// empezado, dorado y lleno sellado: de frío a caliente. De lejos, la mira se simplifica (un anillo y su onda) para que no
// titile. Al señalarla, la mira gira más deprisa y todo brilla más; al elegir el pueblo, cuatro
// esquinas se cierran sobre él, como al fijar un blanco. En el pueblo donde estás, dos ondas. Cada pieza, un solo dibujo
// para todos los pueblos (aCol: su color; aInf: su fase, más 10 en el pueblo donde estás, lo lleno, lo señalado y lo elegido)
export const BALIZA = { '': '#4fe0ff', go: '#ff3fd8', ok: '#ffc640' }, CRISTAL_Y = 1.3;
const BAL_VS = 'attribute vec3 aCol; attribute vec4 aInf; varying vec3 vCol; varying vec4 vInf;\n';
export const MIRA_VS = BAL_VS + 'varying vec2 vP; void main() { vCol = aCol; vInf = aInf; vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }';
export const MIRA_FS = `uniform float uT; varying vec3 vCol; varying vec4 vInf; varying vec2 vP;
float aro(float r, float a, float b, float w) { return smoothstep(a - w, a, r) * (1.0 - smoothstep(b, b + w, r)); }
void main() {
  float r = length(vP), w = fwidth(r) * 1.2 + 0.004, aqui = step(9.5, vInf.x), fase = vInf.x - 10.0 * aqui;
  float an = atan(vP.y, vP.x) / 6.2831853 + 0.5, giro = uT * (0.06 + 0.3 * vInf.z) + fase, det = smoothstep(0.03, 0.012, fwidth(r));
  float c = aro(r, 0.66, 0.76, w) * mix(0.55, step(0.32, fract(an * 18.0 + giro * 3.0)), det) + aro(r, 0.42, 0.45, w) * 0.5 * det;
  float m = fract(an * 4.0 - giro * 1.5); c += det * aro(r, 0.84, 0.98, w) * (1.0 - smoothstep(0.04, 0.04 + fwidth(m) * 1.5, abs(m - 0.5)));
  float p = fract(uT * (0.4 + 0.3 * aqui) + fase * 0.37), q = fract(p + 0.5);
  c += aro(r, p - 0.04, p, w) * (1.0 - p) * 0.9 + aqui * aro(r, q - 0.04, q, w) * (1.0 - q) * 0.9 + exp(-r * r * 90.0) * 0.8;
  float s = mix(1.28, 1.02, vInf.w); vec2 a2 = abs(vP); float mx = max(a2.x, a2.y);
  c += step(0.01, vInf.w) * vInf.w * aro(mx, s - 0.06, s, w) * step(s - 0.34, min(a2.x, a2.y));
  if (c < 0.004) discard;
  gl_FragColor = vec4(mix(vCol, vec3(1.0), 0.2 * vInf.z), c * (0.7 + 0.5 * vInf.z));
}`;
export const HILO_VS = BAL_VS + 'varying float vY; void main() { vCol = aCol; vInf = aInf; vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }';
export const HILO_FS = 'uniform float uT; varying vec3 vCol; varying vec4 vInf; varying float vY; void main() { float a = (1.0 - vY * 0.7) * (0.35 + 0.65 * step(0.45, fract(vY * 4.0 - uT * 1.6 + vInf.x))); gl_FragColor = vec4(vCol, a * (0.7 + 0.3 * vInf.z)); }';
export const CRISTAL_VS = BAL_VS + `attribute vec3 bary; varying vec3 vB, vN, vV, vL;
void main() { vCol = aCol; vInf = aInf; vB = bary; vL = position;
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); vV = normalize(cameraPosition - w.xyz);
  gl_Position = projectionMatrix * viewMatrix * w; }`;
export const CRISTAL_FS = `uniform float uT; varying vec3 vCol; varying vec4 vInf; varying vec3 vB, vN, vV, vL;
void main() {
  float e = min(vB.x, min(vB.y, vB.z)), borde = 1.0 - smoothstep(0.0, fwidth(e) * 1.5 + 0.03, e);
  vec3 n = normalize(vN); float fres = pow(1.0 - abs(dot(n, normalize(vV))), 2.0), luz = 0.55 + 0.45 * max(0.0, dot(n, normalize(vec3(-0.5, 0.8, -0.35))));
  // (lo lleno, de abajo arriba, con la superficie ondulando como un líquido de luz)
  float medio = step(0.01, vInf.y) * step(vInf.y, 0.99), nivel = -1.0 + 2.0 * vInf.y + medio * 0.07 * sin(vL.x * 7.0 + vL.z * 5.0 + uT * 3.0);
  float lleno = 1.0 - smoothstep(nivel - 0.02, nivel + 0.02, vL.y), sup = medio * (1.0 - smoothstep(0.0, 0.06, abs(vL.y - nivel)));
  vec3 col = vCol * (lleno * luz * 0.85 + fres * 0.6 + borde * 1.1) + vec3(1.0) * (borde * 0.3 + sup * 0.7 + lleno * fres * fres * 0.25);
  gl_FragColor = vec4(col * (1.0 + 0.4 * vInf.z), clamp(max(lleno * 0.95, 0.28 + fres * 0.45) + borde + sup, 0.0, 1.0));
}`;
// (la órbita: un anillo fino a trazos, con uno o dos puntos de luz que corren por él)
export const ORBITA_FS = `uniform float uT; varying vec3 vCol; varying vec4 vInf; varying vec2 vP;
void main() {
  float r = length(vP), w = fwidth(r) * 1.2 + 0.01, an = atan(vP.y, vP.x) / 6.2831853 + 0.5, dos = step(0.999, vInf.y);
  float c = smoothstep(0.84 - w, 0.84, r) * (1.0 - smoothstep(0.9, 0.9 + w, r)) * (0.35 + 0.4 * step(0.5, fract(an * 3.0 + uT * 0.2)));
  float d = abs(fract(an - uT * 0.35 - vInf.x) - 0.5), d2 = abs(fract(an - uT * 0.35 - vInf.x + 0.5) - 0.5);
  c += exp(-pow((r - 0.87) * 9.0, 2.0)) * (exp(-pow((0.5 - d) * 40.0, 2.0)) + dos * exp(-pow((0.5 - d2) * 40.0, 2.0))) * 1.6;
  if (c < 0.004) discard;
  gl_FragColor = vec4(mix(vCol, vec3(1.0), 0.3), c * (0.75 + 0.4 * vInf.z));
}`;
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
  vec2 pr = mat2(cg, -sg, sg, cg) * (sv - zc * 46.0) / t * vec2(1.1, 1.9), fr = fract(pr), aw = fwidth(pr) * 0.9 + 0.006;
  float hp = hash(floor(pr) + t * 7.0 + zc * 13.0), linde = 1.0 - smoothstep(0.0, 1.0, min(min(fr.x, 1.0 - fr.x) / aw.x, min(fr.y, 1.0 - fr.y) / aw.y));
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
  c = c * s + 0.35 * pow(clamp((s - 0.3) / 1.05, 0.0, 1.0), 8.0);
  c = mix(c, texture2D(uDet, (sv - uDetRect.xy) / uDetRect.zw).rgb, uDetK);
  // (el clima en el color: el norte atlántico, más verde y jugoso; la Ribera, seca, de cereal y viña, dorada y ocre)
  float surC = smoothstep(380.0, 600.0, sv.y), norC = 1.0 - smoothstep(120.0, 300.0, sv.y);
  c = mix(c, c * vec3(1.16, 1.02, 0.74) + vec3(0.04, 0.02, 0.0), surC * 0.55);
  c = mix(c, c * vec3(0.88, 1.06, 0.86), norC * 0.5);
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
    if (uCerca > 0.0) c *= 1.0 + (ruido(sv * 18.0) * 0.6 + ruido(sv * 55.0) * 0.4 - 0.5) * 0.14 * uCerca;
  }
  vec4 p = pue(uP0, uPR[0], uPK[0], sv); c = mix(c, p.rgb, p.a);
  p = pue(uP1, uPR[1], uPK[1], sv); c = mix(c, p.rgb, p.a);
  p = pue(uP2, uPR[2], uPK[2], sv); c = mix(c, p.rgb, p.a);
  p = pue(uP3, uPR[3], uPK[3], sv); c = mix(c, p.rgb, p.a);
  c = mix(c, vec3(dot(c, vec3(0.299, 0.587, 0.114))) * vec3(0.95, 0.92, 1.1), uGris);
  c *= 1.0 - 0.3 * nubes(vXZ);
  gl_FragColor = vec4(mix(c, uTinte, uTintK) * uBrillo, 1.0);
#include <fog_fragment>
}`;
// (el relieve de la maqueta de un pueblo: pasa poco a poco de la altura de la comarca, position.y, a la del pueblo, hd)
export const PARCHE_VS = RELIEVE_VS.replace('varying vec2 vXZ;', 'attribute float hd; uniform float uMaqK; varying vec2 vXZ;')
  .replace('vH = position.y;', 'vec3 q = vec3(position.x, mix(position.y, hd, uMaqK), position.z); vH = q.y;').replace('vec4(position, 1.0)', 'vec4(q, 1.0)');
