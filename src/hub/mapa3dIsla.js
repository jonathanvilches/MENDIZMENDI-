// La isla flotante: lo que lleva la comarca elegida en el mapa del inicio cuando sube y se separa de Navarra, como en las
// imágenes que pasó el autor el 13 de noviembre de 2026: una tierra que flota en un cielo azul con nubes, con una capa gruesa
// de césped en el canto y debajo una roca caliza clara, con estrías verticales, que se va cerrando hasta una punta roma (con
// poca tierra: el autor la quería menos honda). Debajo, el hueco que deja en Navarra es el cráter de donde se arrancó: paredes
// de tierra y roca oscura y un lago en el fondo, donde cae el agua de los ríos por el borde de la isla y por el del hueco; y
// se desprenden piedras y polvo sin parar. Las texturas de la roca y del césped, de Higgsfield (src/assets/isla). Se hace la
// primera vez que se elige la comarca (mapa3d.js).
import * as THREE from 'three';
import { ruidoV, S, CX, CY } from './mapa3dFormas.js';
import { TONO_ORTO, NUBES } from './mapa3dSombreadores.js';
import CALIZA_T from '../assets/isla/caliza.webp?url';
import CALIZA_N from '../assets/isla/caliza-n.webp?url';
import ESTRATOS_T from '../assets/isla/estratos.webp?url';
import ESTRATOS_N from '../assets/isla/estratos-n.webp?url';
// (el borde: el fleco de hierba y musgo que cuelga, la tierra con raíces de debajo y la hierba vista de arriba; y la caliza
// de la panza. Generadas con Higgsfield con la cuenta del autor el 14 de noviembre de 2026 y hechas repetibles con
// tools/islas/texturas-borde.py)
import COLGANTE_T from '../assets/isla/colgante.webp?url';
import TIERRA_T from '../assets/isla/tierra.webp?url';
import HIERBA_T from '../assets/isla/hierba.webp?url';

const rnd = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const lerp = (a, b, k) => a + (b - a) * k;
const C = (h) => new THREE.Color(h);
const CALIZA = C('#ffffff'), HONDO = C('#9d9fb2');
// (el cielo: azul intenso arriba y claro junto al horizonte, como en las imágenes del autor)
export const CIELO_ARRIBA = C('#1766d8'), CIELO_MEDIO = C('#3b95f0'), CIELO_HORIZONTE = C('#98cdfb');
const LUZ = new THREE.Vector3(-0.6, 0.35, 0.72).normalize();   // (de la izquierda, por delante y algo alta, con contraste)

/** Las texturas de la isla, una vez por mapa: fotos de roca de verdad, repetibles, con su relieve (mapa de normales), de
 *  Poly Haven (CC0): la caliza clara con estrías verticales de la panza («Marble Cliff 04») y la roca en estratos de las
 *  paredes del hueco («Cliff Side»); y la tira de césped con su tierra (con transparencia, de Higgsfield). */
export function texturasIsla(aniso = 4) {
  const L = new THREE.TextureLoader(), t = (u, rep, color = true) => { const x = L.load(u); x.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace; x.wrapS = THREE.RepeatWrapping; x.wrapT = rep ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping; x.anisotropy = aniso; return x; };
  const caliza = t(CALIZA_T, true), calizaN = t(CALIZA_N, true, false), estratos = t(ESTRATOS_T, true), estratosN = t(ESTRATOS_N, true, false);
  const colgante = t(COLGANTE_T, false), tierra = t(TIERRA_T, false), hierba = t(HIERBA_T, true);   // (las tiras, repetidas solo a lo largo del borde)
  const todas = [caliza, calizaN, estratos, estratosN, colgante, tierra, hierba];
  return { caliza, calizaN, estratos, estratosN, colgante, tierra, hierba, dispose() { for (const x of todas) x.dispose(); } };
}

// (la roca con luz de verdad: el color de la foto, su relieve con el mapa de normales y la luz de la isla, un sol de lado y
// la luz del cielo y la que rebota del suelo; los colores de los vértices ponen la sombra de lo hondo. Como la luz va en la
// isla, no le afectan las luces del mapa, que la dejaban negra por debajo)
const ROCA_VS = `varying vec2 vUv; varying vec3 vCol, vW, vN;
#include <fog_pars_vertex>
void main() { vUv = uv; vCol = color; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
  vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`;
const ROCA_FS = `uniform sampler2D uMap, uNor; uniform vec3 uLuz, uCieloC, uSueloC, uTinte; uniform float uSol, uAmb, uNorK, uVar, uNiebla;
varying vec2 vUv; varying vec3 vCol, vW, vN;
#include <fog_pars_fragment>
vec3 relieve(vec3 n, vec3 p, vec2 uv, vec3 tn) {
  vec3 q0 = dFdx(p), q1 = dFdy(p); vec2 st0 = dFdx(uv), st1 = dFdy(uv);
  vec3 a = cross(q1, n), b = cross(n, q0), T = a * st0.x + b * st1.x, B = a * st0.y + b * st1.y;
  float d = max(dot(T, T), dot(B, B)), s = d == 0.0 ? 0.0 : inversesqrt(d);
  return normalize(T * (tn.x * s) + B * (tn.y * s) + n * tn.z); }
void main() {
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  vec3 tn = texture2D(uNor, vUv).xyz * 2.0 - 1.0; vec3 alb = texture2D(uMap, vUv).rgb;
  // (sin mosaico: con uVar, la misma foto a otra escala y corrida, mezclada a manchas grandes; si no, sus grietas se repetían
  // en fila por toda la panza)
  if (uVar > 0.0) { vec2 q = vUv * 0.13; vec2 i = floor(q), f = fract(q); f = f * f * (3.0 - 2.0 * f);
    float h00 = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5), h10 = fract(sin(dot(i + vec2(1, 0), vec2(127.1, 311.7))) * 43758.5), h01 = fract(sin(dot(i + vec2(0, 1), vec2(127.1, 311.7))) * 43758.5), h11 = fract(sin(dot(i + vec2(1, 1), vec2(127.1, 311.7))) * 43758.5);
    float m = smoothstep(0.3, 0.7, mix(mix(h00, h10, f.x), mix(h01, h11, f.x), f.y)) * uVar; vec2 uv2 = vUv * vec2(0.61, 0.53) + vec2(0.37, 0.71);
    alb = mix(alb, texture2D(uMap, uv2).rgb, m); tn = mix(tn, texture2D(uNor, uv2).xyz * 2.0 - 1.0, m); }
  tn.xy *= uNorK; n = relieve(n, vW, vUv, tn);
  alb *= vCol * uTinte;
  vec3 luz = mix(uSueloC, uCieloC, n.y * 0.5 + 0.5) * uAmb + vec3(1.0, 0.95, 0.86) * max(0.0, dot(n, uLuz)) * uSol;
  gl_FragColor = linearToOutputTexel(vec4(alb * luz, 1.0));
  // (la niebla, como la de three, pero con uNiebla: las paredes del hueco, que están más hondas que el suelo de alrededor,
  // se aclaraban hacia el color del cielo y parecían de cristal; con menos niebla se quedan de tierra a la sombra)
#ifdef USE_FOG
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, smoothstep(fogNear, fogFar, vFogDepth * uNiebla));
#endif
}`;
function materialRoca(map, nor, { tinte = '#ffffff', sol = 1.1, amb = 0.75, cielo = '#d4e2f2', suelo = '#8a7660', norK = 1, fog = true, extra = {} } = {}) {
  return new THREE.ShaderMaterial({ vertexColors: true, side: THREE.DoubleSide, fog, ...extra,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uMap: { value: null }, uNor: { value: null }, uLuz: { value: LUZ.clone() }, uCieloC: { value: C(cielo) }, uSueloC: { value: C(suelo) },
      uTinte: { value: C(tinte) }, uSol: { value: sol }, uAmb: { value: amb }, uNorK: { value: norK }, uVar: { value: 0 }, uNiebla: { value: 1 } }]),
    vertexShader: ROCA_VS, fragmentShader: ROCA_FS });
}
const conTex = (m, map, nor) => { m.uniforms.uMap.value = map; m.uniforms.uNor.value = nor; return m; };

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
 *  geos y mats, para soltarlo todo. */
export function hazIsla({ id, P, grosor, alto, salen = [], entran = [], fuera = () => 0, orto = null, tex, geos, mats, scene }) {
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
  const dentro = (x, z) => { let s = false; for (let i = 0, j = N - 1; i < N; j = i++) { const a = Q[i], b = Q[j]; if ((a[1] > z) !== (b[1] > z) && x < a[0] + (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1])) s = !s; } return s; };
  // (cuánta tierra se arranca, por lógica: las montañas tienen raíz, la corteza es más gruesa bajo las sierras (isostasia),
  // así que la pieza es más honda cuanto más relieve tiene, lo que va del valle a las cumbres (sin el 2 % más bajo ni el más
  // alto). Desde el 14 de noviembre de 2026 es una montaña del revés, como en la imagen de referencia del autor: de 0,62 a
  // 0,9 veces su radio (antes era una losa, de 0,22 a 0,5, y de lado apenas se veía roca). El Pirineo arranca la raíz más
  // honda; la Ribera, la más corta)
  const hs = []; { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of Q) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const paso = Math.max(0.15, rMed / 30); for (let x = x0; x <= x1; x += paso) for (let z = z0; z <= z1; z += paso) if (dentro(x, z)) hs.push(alto(x, z)); hs.sort((a, b) => a - b); }
  const relieve = hs.length > 10 ? hs[Math.floor(hs.length * 0.98)] - hs[Math.floor(hs.length * 0.02)] : rMed * 0.3;
  const D = Math.min(0.9 * rMed, Math.max(0.62 * rMed, 2.4 * relieve));
  // (unas pocas puntas: la roca cuelga más donde caen, y la de abajo del todo no queda en el centro sino corrida a un lado)
  const puntas = Array.from({ length: 3 + ((R() * 2) | 0) }, () => ({ a: R() * Math.PI * 2, w: 0.3 + R() * 0.35, h: 0.1 + R() * 0.2 }));
  const ladoA = R() * Math.PI * 2, ladoD = rMed * (0.06 + R() * 0.1), ladoX = Math.cos(ladoA) * ladoD, ladoZ = Math.sin(ladoA) * ladoD;
  const cuelga = (a) => puntas.reduce((s, p) => { const d = Math.atan2(Math.sin(a - p.a), Math.cos(a - p.a)); return s + p.h * Math.exp(-(d * d) / (2 * p.w * p.w)); }, 0);
  // los anillos de la roca, como la de la imagen de referencia: un escalón casi recto bajo el césped, hombros anchos y
  // luego se cierra, cada vez más deprisa, hasta la punta: una montaña del revés, con cuerpo (en cono recto se veía un
  // tallo fino bajo una losa). [lo que se estrecha, lo hondo (en parte de D), cuánto se redondea hacia un círculo]
  const ANI = [[1, 0, 0], [1, 0.03, 0], [0.97, 0.1, 0.03], [0.92, 0.19, 0.08], [0.85, 0.29, 0.15], [0.76, 0.4, 0.24], [0.66, 0.51, 0.34], [0.55, 0.62, 0.45], [0.44, 0.72, 0.56], [0.33, 0.81, 0.67], [0.22, 0.89, 0.77], [0.12, 0.95, 0.86], [0.04, 0.99, 0.92]];
  // (los bultos: la roca no baja lisa, tiene panzas y entrantes grandes, y repisas a lo largo, como estratos que asoman)
  const bulto = (a, h) => { const u = Math.cos(a) * 1.6 + seed % 17, w = Math.sin(a) * 1.6 + 3.3;
    return ((ruidoV(u + h * 1.3, w + h * 2.9) - 0.5) * 0.2 + (ruidoV(u * 2.7 + 9.1, w * 2.7 + h * 6.5) - 0.5) * 0.085 + 0.02 * Math.sin(h * 21 + 4 * ruidoV(u, w))) * rMed * Math.sin(Math.PI * Math.min(1, h * 1.08)) ** 0.7; };
  // (las estrías: surcos verticales cada medio metro largo del mapa, que se tuercen un poco al bajar, y bultos más grandes)
  const estria = (s, k) => { const ss = s + 0.12 * Math.sin(k * 1.7 + s * 0.6), g = 0.5 + 0.5 * Math.sin(ss * 13.4 + 1.3 * Math.sin(ss * 0.9)); return 0.09 * g * g + 0.14 * Math.sin(s * 2.7 + k * 0.45 + seed); };
  const pos = [], col = [], uv = [], c = new THREE.Color();
  ANI.forEach(([e, h, m], k) => { for (let i = 0; i <= N; i++) {
    const [x, z] = Q[i % N], dx = x - cx, dz = z - cz, r = Math.hypot(dx, dz) || 1, a = Math.atan2(dz, dx);
    const bx = lerp(dx, dx / r * rMed, m) * e + ladoX * h ** 1.6, bz = lerp(dz, dz / r * rMed, m) * e + ladoZ * h ** 1.6;
    const ex = k ? estria(LQ[i], k) * (1 - h) ** 1.3 * Math.min(1, rMed / 7) + (k > 1 ? bulto(a, h) : 0) : 0;   // (las estrías se pierden hacia la punta)
    const y = k ? -D * (h * (1 + cuelga(a) * h ** 1.4) + 0.03 * h * Math.max(0, 1 - h * 1.25) * Math.sin(LQ[i] * 3.1 + k)) : 0;   // (el fondo, liso: si ondula, la orilla del lago sale a dientes)
    pos.push(cx + bx + dx / r * ex, y, cz + bz + dz / r * ex); uv.push(LQ[i] / TEX, -y / TEX);
    // (la caliza pone su color la foto; algo más oscura hacia la punta, adonde llega menos luz)
    const f = -y / D;
    c.copy(CALIZA).lerp(HONDO, Math.min(1, Math.max(0, (f - 0.3) / 0.65))); c.multiplyScalar(0.94 + R() * 0.08); col.push(c.r, c.g, c.b);
  } });
  const base = pos.length / 3; { let yb = 0; for (let i = 0; i < N; i++) yb = Math.min(yb, pos[((ANI.length - 1) * N1 + i) * 3 + 1]); pos.push(cx + ladoX, yb - D * 0.012, cz + ladoZ); } uv.push(0, D / TEX); c.copy(HONDO); col.push(c.r, c.g, c.b);
  const idx = [], L = (ANI.length - 1) * N1;
  for (let k = 0; k + 1 < ANI.length; k++) for (let i = 0; i < N; i++) { const a = k * N1 + i, b = a + 1; idx.push(a, b + N1, b, a, a + N1, b + N1); }
  for (let i = 0; i < N; i++) idx.push(L + i, base, L + i + 1);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals(); geos.push(g);
  const rocaM = conTex(materialRoca(null, null, { sol: 1.12, amb: 0.84, cielo: '#cfe0ff', suelo: '#7386c4', tinte: '#d6cfc6' }), tex.caliza, tex.calizaN); rocaM.uniforms.uVar.value = 1; mats.push(rocaM);   // (la sombra, azulada: le llega la luz del lago y del cielo, como en la imagen de referencia; antes, parda)
  const grupo = new THREE.Group(); grupo.name = 'isla-' + id; grupo.visible = false; scene.add(grupo);
  grupo.add(new THREE.Mesh(g, rocaM));
  // (la misma panza, dentro del hueco: mientras la isla sale de él, se ve por la boca delante de las paredes)
  const rocaAM = conTex(materialRoca(null, null, { sol: 0.5, amb: 0.7, cielo: '#cfe0ff', suelo: '#7386c4', tinte: '#d6cfc6', extra: { transparent: true, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp } }), tex.caliza, tex.calizaN); rocaAM.uniforms.uVar.value = 1; rocaAM.uniforms.uNiebla.value = 0.5; mats.push(rocaAM);
  const panzaA = new THREE.Mesh(g, rocaAM); panzaA.renderOrder = -0.7; panzaA.visible = false; scene.add(panzaA);
  // (las raíces, desde el 14 de noviembre de 2026, son las de la foto de la tierra del canto: las de antes eran rayas oscuras
  // de un píxel que colgaban muy por debajo del borde, como alambres)

  // ---------- el canto: el césped que asoma sobre el borde, su tierra y la caliza, tapando la pared de la comarca ----------
  const NOR = Q.map((q, i) => { const a = Q[(i + N - 2) % N], b = Q[(i + 2) % N]; let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    let nx = tz, nz = -tx; if (dentro(q[0] + nx * 0.08, q[1] + nz * 0.08)) { nx = -nx; nz = -nz; } return [nx, nz, tx, tz]; });
  const H0 = Q.map(([x, z]) => grosor + alto(x, z));
  // (la hierba del canto no cuelga igual en todo el borde: en unos sitios apenas asoma y en otros cae en mechones, como en
  // la imagen de referencia del autor, del 14 de noviembre de 2026; con dos ondas de ruido a lo largo del borde)
  const CUELGA = Q.map(([x, z]) => 0.45 + 1.75 * (0.62 * ruidoV(x * 0.6 + 3.1, z * 0.6 + 7.7) + 0.38 * ruidoV(x * 1.9 + 21.4, z * 1.9 + 4.2)));
  // (la panza no empieza en la base de la comarca sino algo por debajo de lo más bajo de su orilla: la pared de debajo, que con
  // la exageración del relieve era muy alta, se queda en el canto de césped y algo de roca; la de la comarca se esconde)
  const B = Math.min(...H0) - grosor * 0.15;
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
  const FILAS = [[-0.2, 0.03, 0, 0, 0, 0, 1], [-0.02, 0.035, 0, 0, 0.3, 1, 1], [0.06, 0.03, 0, 0, 0.55, 1, 1], [0.12, -0.015, 0, 0, 0.8, 1, 0.95], [0.15, -0.09, 0, 0, 1, 1, 0.86],
    [0.165, -0.015, 0, 1, 0, 1, 1.02], [0.155, -0.06, 0.5, 1, 1, 1, 0.92], [0.1, -0.1, 0, 2, 0, 1, 0.78], [0.06, -0.15, 0.3, 2, 1, 1, 0.78], [0.03, -0.11, 0.12, 3, 0, 1, 1], [0.03, null, 0, 3, 1, 1, 1]];
  const ANCHO = Q.map((_, i) => 0.65 + 0.95 * ruidoV(LQ[i] * 1.05 + seed % 13, 3.3) + 0.4 * ruidoV(LQ[i] * 3.6 + 5.1, 9.1));
  // (las normales, suavizadas: la media de cinco; y cuánto se cierra el borde en cada punto, comparando lo que se separan
  // dos puntos vecinos del borde con lo que se separarían corridos hacia fuera)
  const NS = Q.map((_, i) => { let x = 0, z = 0; for (let k = -2; k <= 2; k++) { const n = NOR[(i + k + N) % N]; x += n[0]; z += n[1]; } const l = Math.hypot(x, z) || 1; return [x / l, z / l]; });
  const ENC0 = Q.map((_, i) => { const a = (i - 3 + N) % N, b = (i + 3) % N, qa = Q[a], qb = Q[b], o = 0.32, d0 = Math.hypot(qb[0] - qa[0], qb[1] - qa[1]) || 1e-6;
    return Math.min(1, Math.max(0.12, Math.hypot(qb[0] + NS[b][0] * o - qa[0] - NS[a][0] * o, qb[1] + NS[b][1] * o - qa[1] - NS[a][1] * o) / d0)); });
  const ENC = ENC0.map((_, i) => { let m = 1; for (let k = -2; k <= 2; k++) m = Math.min(m, ENC0[(i + k + N) % N]); return m * m; });
  const NF = FILAS.length, cantoPos = new Float32Array(NF * N1 * 3), cantoUv = [], cantoZ = [], cantoLuz = [], cantoA = [], cantoS = [], cantoH = [], cantoIx = [];
  FILAS.forEach(([o, , , zona, v, alfa, luz], f) => { for (let i = 0; i <= N; i++) { const k = i % N, [nx, nz] = NS[k], lado = 0.62 + 0.55 * Math.max(0, nx * LUZ.x + nz * LUZ.z);
    cantoUv.push(LQ[i], v); cantoZ.push(zona); cantoA.push(alfa); cantoLuz.push(zona === 0 ? luz * (0.75 + 0.25 * Math.min(1, lado + 0.38 * (1 - v))) : luz * lado);
    // (de dónde toma su color cada punto: del suelo de la comarca justo dentro del borde, nunca de lo de fuera, que es de la
    // vecina; y a qué altura, para la nieve de las cumbres)
    // (lo que sale del borde toma el color en espejo, hacia dentro: si todos los puntos de una columna lo tomaban del mismo
    // sitio, el labio salía rayado, con el color estirado)
    const oe = f >= 2 && f <= 7 ? o * ANCHO[k] * ENC[k] : o, os = oe < -0.02 ? oe : -0.02 - Math.max(0, oe) * 0.7; cantoS.push(Q[k][0] + nx * os, Q[k][1] + nz * os); cantoH.push(H0[k]); } });
  for (const f of [9, 7, 0, 1, 2, 3, 5]) for (let i = 0; i < N; i++) { const a = f * N1 + i, b = a + 1; cantoIx.push(a, a + N1, b, b, a + N1, b + N1); }
  const cantoG = new THREE.BufferGeometry(); cantoG.setAttribute('position', new THREE.BufferAttribute(cantoPos, 3)); cantoG.setAttribute('uv', new THREE.Float32BufferAttribute(cantoUv, 2));
  cantoG.setAttribute('aZona', new THREE.Float32BufferAttribute(cantoZ, 1)); cantoG.setAttribute('aLuz', new THREE.Float32BufferAttribute(cantoLuz, 1)); cantoG.setAttribute('aA', new THREE.Float32BufferAttribute(cantoA, 1));
  cantoG.setAttribute('aS', new THREE.Float32BufferAttribute(cantoS, 2)); cantoG.setAttribute('aH', new THREE.Float32BufferAttribute(cantoH, 1)); cantoG.setIndex(cantoIx); geos.push(cantoG);
  // El color del canto es el del suelo de su comarca, con las mismas cuentas que el terreno (mapa3dSombreadores.js
  // RELIEVE_FS): la ortofoto con su tono, la luz del relieve, el grano de cerca, la nieve, el acabado, la sombra de las nubes
  // y el velo de la comarca. Ni el labio ni el fleco llevan un verde suyo: el 14 de noviembre de 2026 el autor vio que «ese
  // labio que has puesto en el contorno no tiene nada que ver con el verde del césped» y pidió que no hubiera «cambios de
  // colores bruscos que se note que son elementos pegados». De las fotos del fleco y de la tierra solo se toma la luz (sus
  // hojas, sus sombras, su transparencia); el color lo pone el suelo de encima.
  const cantoM = new THREE.ShaderMaterial({ side: THREE.DoubleSide, transparent: true, fog: true, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uRoca: { value: null }, uColg: { value: null }, uTierra: { value: null }, uHierba: { value: null } }]),
    vertexShader: `attribute float aZona, aLuz, aA, aH; attribute vec2 aS; varying vec2 vUv, vS; varying float vZ, vL, vA, vRv, vH;
#include <fog_pars_vertex>
void main() { vUv = uv; vZ = aZona; vL = aLuz; vA = aA; vRv = position.y; vS = aS; vH = aH; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`,
    fragmentShader: `uniform sampler2D uRoca, uColg, uTierra, uHierba, uOrto, uOrtoD, uSombra; uniform vec4 uOrtoR, uDetRect, uRect; uniform float uOrtoK, uOrtoDK, uTintK, uGris, uListo, uCerca, uTex, uGrosor, uExa, uBrillo; uniform vec3 uTinte;
varying vec2 vUv, vS; varying float vZ, vL, vA, vRv, vH;
#include <fog_pars_fragment>
${NUBES}${TONO_ORTO}float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
// (el color del suelo de la comarca en un punto, como lo pinta el terreno; b, cuánto se suaviza: el fleco lo toma algo
// borroso, que no titile)
vec3 suelo(vec2 p, float h, float b) {
  vec2 sv = p / ${S.toFixed(1)} + vec2(${CX.toFixed(1)}, ${CY.toFixed(1)});
  vec3 o = texture2D(uOrto, (sv - uOrtoR.xy) / uOrtoR.zw, b).rgb;
  if (uOrtoDK > 0.0) o = mix(o, texture2D(uOrtoD, (sv - uDetRect.xy) / uDetRect.zw, b).rgb, uOrtoDK);
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
    float fib = clamp(dot(texture2D(uHierba, vS * 2.6).rgb, vec3(0.3, 0.59, 0.11)) / 0.155, 0.6, 1.4);
    c = suelo(vS, vH, 0.0) * mix(1.0, 0.9 + 0.1 * fib, smoothstep(0.3, 0.85, vUv.y)); }
  else if (vZ < 2.5) {
    // (el fleco que cuelga y, detrás, la tierra con raíces: de sus fotos, la transparencia y la luz de cada hoja; lo casi
    // transparente se descarta, para que la tierra de detrás no se tape con su halo)
    vec4 t = vZ < 1.5 ? texture2D(uColg, vec2(vUv.x / 1.25, 1.0 - vUv.y)) : texture2D(uTierra, vec2(vUv.x / 1.4 + 0.37, 1.0 - vUv.y));   // (la imagen, con su arriba arriba)
    if (t.a < 0.42) discard; a = smoothstep(0.42, 0.62, t.a);
    float luz = pow(clamp(dot(t.rgb, vec3(0.299, 0.587, 0.114)) / 0.09, 0.05, 3.0), 0.45);
    if (vZ < 1.5) c = suelo(vS, vH, 2.5) * clamp(luz, 0.32, 1.12) * (1.0 - 0.25 * vUv.y);
    else c = mix(linearToOutputTexel(vec4(t.rgb, 1.0)).rgb, suelo(vS, vH, 3.0) * 0.5 * clamp(luz, 0.4, 1.3), 0.35) * (1.0 - 0.2 * vUv.y); }
  else c = linearToOutputTexel(vec4(texture2D(uRoca, vec2(vUv.x / 2.4, -vRv / 2.4)).rgb * vec3(0.72, 0.71, 0.72), 1.0)).rgb;   // (la caliza de debajo, con la luz de la panza)
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
  for (const k of ['uOrto', 'uOrtoD', 'uOrtoR', 'uDetRect', 'uOrtoK', 'uOrtoDK', 'uTinte', 'uTintK', 'uGris', 'uSombra', 'uRect', 'uListo', 'uT', 'uCerca', 'uTex', 'uGrosor', 'uExa', 'uBrillo']) cantoM.uniforms[k] = orto?.[k] || { value: DEF[k] ? DEF[k]() : 0 };
  const canto = new THREE.Mesh(cantoG, cantoM); canto.name = 'canto-' + id; canto.frustumCulled = false; canto.visible = false; canto.renderOrder = 1; scene.add(canto);
  let cantoSy = -1;
  const ponCanto = (sy) => { cantoSy = sy;
    FILAS.forEach(([o, dy, cu, , , ], f) => { for (let i = 0; i <= N; i++) { const k = i % N, q = Q[k], [nx, nz] = NS[k], v = (f * N1 + i) * 3, oo = f >= 2 && f <= 7 ? o * ANCHO[k] * ENC[k] : o;
      cantoPos[v] = q[0] + nx * oo; cantoPos[v + 1] = dy == null ? B * sy - 0.04 : Math.max(B * sy, H0[k] * sy + dy - cu * CUELGA[k]); cantoPos[v + 2] = q[1] + nz * oo; } });
    cantoG.attributes.position.needsUpdate = true; };

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
  const boca = (() => { const pos2 = [], ix = []; for (const [x, z] of P) pos2.push(x, 0.003, z);
    for (const t of THREE.ShapeUtils.triangulateShape(P.map(([x, z]) => new THREE.Vector2(x, z)), [])) ix.push(t[0], t[2], t[1]);
    const gb = new THREE.BufferGeometry(); gb.setAttribute('position', new THREE.Float32BufferAttribute(pos2, 3)); gb.setIndex(ix); geos.push(gb); return gb; })();
  const marcaM = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, transparent: true, side: THREE.DoubleSide, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp }); mats.push(marcaM);
  const borraM = new THREE.ShaderMaterial({ colorWrite: false, depthWrite: true, depthFunc: THREE.AlwaysDepth, transparent: true, side: THREE.DoubleSide, ...PLANT,
    vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w * 0.99999; }', fragmentShader: 'void main() { gl_FragColor = vec4(0.0); }' }); mats.push(borraM);
  const marca = new THREE.Mesh(boca, marcaM), borra = new THREE.Mesh(boca, borraM); marca.renderOrder = -0.95; borra.renderOrder = -0.9;
  const sima = new THREE.Group(); sima.name = 'sima-' + id; sima.visible = false; scene.add(sima);
  const molde = new THREE.Group(); sima.add(molde); molde.add(marca, borra);   // (molde: a la altura del CORTE; el agua y las piedras, en el mundo)
  // (las paredes: la geometría de la panza, con la roca en estratos; arriba algo de tierra, y abajo, a la sombra, oscura)
  { const cc = [], c2 = new THREE.Color(), SUELO = C('#54402f'), ARRIBA = C('#948068'), ABAJO = C('#2e251c');   // (tierra y roca a la sombra, oscuras: el autor las veía claras)
    for (let v = 0; v < pos.length / 3; v++) { const f = Math.min(1, -pos[v * 3 + 1] / D);
      if (f < 0.05) c2.copy(SUELO); else c2.copy(ARRIBA).lerp(ABAJO, Math.min(1, (f - 0.05) / 0.85) ** 0.75);
      c2.multiplyScalar(0.9 + R() * 0.12); cc.push(c2.r, c2.g, c2.b); }
    const gp = new THREE.BufferGeometry(); for (const k of ['position', 'normal', 'uv']) gp.setAttribute(k, g.attributes[k]); gp.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3)); gp.setIndex(g.index); geos.push(gp);
    const pm = conTex(materialRoca(null, null, { sol: 0.6, amb: 0.8, cielo: '#b6c4d2', suelo: '#4a3c30', norK: 1.5, extra: { transparent: true, ...PLANT } }), tex.estratos, tex.estratosN); pm.uniforms.uNiebla.value = 0.5; mats.push(pm);
    const pared = new THREE.Mesh(gp, pm); pared.renderOrder = -0.8; molde.add(pared); }
  // (por dónde baja el agua por la pared del molde, en el punto i del borde: el anillo a esa hondura, algo hacia dentro)
  const porPared = (i, yl) => { for (let k = 0; k + 1 < ANI.length; k++) { const a = (k * N1 + i) * 3, b = ((k + 1) * N1 + i) * 3, ya = pos[a + 1], yb = pos[b + 1];
      if (yl <= ya && yl >= yb) { const f = (ya - yl) / ((ya - yb) || 1); return [lerp(pos[a], pos[b], f), lerp(pos[a + 2], pos[b + 2], f)]; } }
    const a = ((ANI.length - 1) * N1 + i) * 3; return [pos[a], pos[a + 2]]; };
  // (el lago del hueco, donde cae el agua: azul, con ondas suaves y el cielo reflejado de lado, turquesa en la orilla; su contorno, el
  // del anillo de encima, para que llegue a las paredes, que tapan lo que sobra)
  { const p3 = [cx, LAGO, cz], o3 = [0], i3 = [];
    const RL = Array.from({ length: N }, (_, i) => { const [x, z] = porPared(i, LAGO); return [x - cx, z - cz]; });
    for (let i = 0; i < N; i++) { let x = 0, z = 0; for (let j = -4; j <= 4; j++) { const q2 = RL[(i + j + N) % N]; x += q2[0] / 9; z += q2[1] / 9; }   // (la orilla, suave)
      p3.push(cx + x * 1.03, LAGO, cz + z * 1.03); o3.push(1); i3.push(0, 1 + (i + 1) % N, 1 + i); }
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


  // ---------- el agua que cae al vacío ----------
  // Donde un río sale de la comarca, cae por el borde de la isla; donde un río de Navarra entraba en ella, ahora se tira por
  // el borde del hueco al cielo de abajo. Columnas de agua (un corte de ocho lados, para que se vean desde cualquier lado, y
  // que de canto se desvanecen) que se abren al caer y se deshacen en bruma antes de las nubes. Si no le sale ningún río, un
  // manantial en lo más bajo de su orilla.
  const cerca = ([x, z]) => { let b = 0, bd = 1e9; for (let i = 0; i < N; i++) { const d = (Q[i][0] - x) ** 2 + (Q[i][1] - z) ** 2; if (d < bd) { bd = d; b = i; } } return b; };
  const elige = (L2, max) => { const out = []; for (const s of [...L2].sort((a, b) => a[2] - b[2])) { if (out.length >= max) break; const i = cerca(s); if (out.every(o => Math.hypot(Q[o.i][0] - Q[i][0], Q[o.i][1] - Q[i][1]) > rMed * 0.32)) out.push({ i, k: s[2] }); } return out; };
  const caidas = [];
  const anchoDe = (k) => (k === 1 ? 0.8 : k === 2 ? 0.58 : 0.42) * Math.max(1, rMed / 9);
  for (const s of elige(salen, 4)) caidas.push({ ...s, isla: true, w: anchoDe(s.k) });
  if (!caidas.length) { let b = 0, bh = 1e9; for (let i = 0; i < N; i++) { const h = alto(Q[i][0], Q[i][1]); if (h < bh) { bh = h; b = i; } } caidas.push({ i: b, k: 2, isla: true, w: anchoDe(2) }); }
  for (const s of elige(entran, 4)) caidas.push({ ...s, isla: false, w: anchoDe(s.k) * 0.85 });
  caidas.forEach((c3, n) => { const [x, z] = Q[c3.i], [nx, nz, tx, tz] = NOR[c3.i]; Object.assign(c3, { x, z, nx, nz, tx, tz, h0: H0[c3.i], fase: n * 1.7 + R() * 3, xo: x + nx * 0.3, zo: z + nz * 0.3 }); });
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
  const NR = 26, NB2 = 6, NP = 44, NT = caidas.length * (NR + NB2) + NP;
  const pPos = new Float32Array(NT * 3), pS = new Float32Array(NT), pC = new Float32Array(NT * 4);
  const ptoG = new THREE.BufferGeometry(); ptoG.setAttribute('position', new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage)); ptoG.setAttribute('aS', new THREE.BufferAttribute(pS, 1).setUsage(THREE.DynamicDrawUsage)); ptoG.setAttribute('aC', new THREE.BufferAttribute(pC, 4).setUsage(THREE.DynamicDrawUsage)); geos.push(ptoG);
  const PTO = { uEsc: { value: 600 }, uCorte: CORTE };
  const ptoVS = 'attribute float aS; attribute vec4 aC; uniform float uEsc; varying vec4 vC; varying float vY; void main() { vC = aC; vec4 w = modelMatrix * vec4(position, 1.0); vY = w.y; vec4 mv = viewMatrix * w; gl_Position = projectionMatrix * mv; gl_PointSize = aC.a > 0.003 ? clamp(aS * uEsc / max(0.1, -mv.z), 1.0, 256.0) : 0.0; }';
  const ptoFS = (abajo) => `uniform float uCorte; varying vec4 vC; varying float vY; void main() { if (${abajo ? 'vY > uCorte' : 'vY < uCorte'}) discard; float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, d) * vC.a; if (a < 0.004) discard; gl_FragColor = vec4(vC.rgb, a); }`;
  const ptoM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: PTO, vertexShader: ptoVS, fragmentShader: ptoFS(false) }), ptoAM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: PTO, vertexShader: ptoVS, fragmentShader: ptoFS(true), ...PLANT }); mats.push(ptoM, ptoAM);
  const pto = new THREE.Points(ptoG, ptoM), ptoA = new THREE.Points(ptoG, ptoAM); pto.renderOrder = 4; ptoA.renderOrder = -0.6; pto.frustumCulled = ptoA.frustumCulled = false; scene.add(pto); sima.add(ptoA); pto.visible = false;
  const fasesR = Float32Array.from({ length: caidas.length * NR }, () => R()), ladoR = Float32Array.from({ length: caidas.length * NR * 2 }, () => R() - 0.5);
  const polvo = Array.from({ length: NP }, () => ({ t: 9, x: 0, y: 0, z: 0, s: 0.3, vy: 0 }));
  let polvoN = 0;
  const echaPolvo = (x, y, z, s) => { const p = polvo[polvoN++ % NP]; Object.assign(p, { t: 0, x, y, z, s, vy: 0.15 + R() * 0.25 }); };

  // ---------- piedras: las que flotan alrededor y las que se desprenden, de la isla y del borde del hueco ----------
  const piedraG = new THREE.DodecahedronGeometry(1, 0); geos.push(piedraG);
  const flota = Array.from({ length: 12 }, () => ({ a: R() * Math.PI * 2, r: rMed * (0.8 + R() * 0.5), y: -D * (0.1 + R() * 0.7), s: 0.08 + R() * 0.2, w: (R() < 0.5 ? -1 : 1) * (0.05 + R() * 0.08), ph: R() * 6, rot: R() * 6 }));
  const NC = 90, caen = Array.from({ length: NC }, () => ({ vivo: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 0.1, rx: 0, ry: 0, wr: 1 }));
  let caeN = 0;
  const suelta = (x, y, z, vx, vy, vz, s) => { const p = caen[caeN++ % NC]; Object.assign(p, { vivo: true, x, y, z, vx, vy, vz, s, rx: R() * 6, ry: R() * 6, wr: 1 + R() * 3 }); };
  const piedraM = new THREE.MeshLambertMaterial({ color: '#c9bfae', emissive: '#6b6052', flatShading: true }); mats.push(piedraM);   // (caliza, como la roca)
  const piedraAM = new THREE.MeshLambertMaterial({ color: '#c9bfae', emissive: '#6b6052', flatShading: true, transparent: true, ...PLANT }); mats.push(piedraAM);
  const piedras = new THREE.InstancedMesh(piedraG, piedraM, flota.length + NC), piedrasA = new THREE.InstancedMesh(piedraG, piedraAM, NC);
  piedras.frustumCulled = piedrasA.frustumCulled = false; piedras.visible = false; piedrasA.renderOrder = -0.75; scene.add(piedras); sima.add(piedrasA);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  // (de dónde se desprende una piedra: de la panza de la isla, de un anillo cualquiera, o del borde del hueco, por dentro)
  const deLaIsla = (py, k) => { const kk = 2 + ((R() * 6) | 0), i = (R() * N) | 0, v = (kk * N1 + i) * 3; return [pos[v], py + pos[v + 1], pos[v + 2], NOR[i]]; };
  let antes = 0, reloj = 0;

  return {
    /** si un punto cae dentro del cuerpo de la isla: x, z en el mapa; h, lo que queda por debajo de la base, en partes de
     *  D (negativo: por encima, en la comarca). Para no pintar encima de la roca los rótulos de lo que queda detrás */
    cuerpo(x, z, h) { if (h <= 0) return dentro(x, z); const f = 1 - Math.min(1, h) ** 1.6; return f > 0.03 && dentro(cx + (x - cx - ladoX * h ** 1.6) / f, cz + (z - cz - ladoZ * h ** 1.6) / f); },
    D, rMed, rMax, cx, cz, alto: Math.max(0.62 * rMed, D + 0.26 * rMed) + 0.9, base: B,   // (lo que sube: lo que mide la roca y algo más, para que la punta salga del hueco y se vea el lago debajo)
    /** py: la altura de la comarca; sy: lo que se estira su relieve; k: cuánto está fuera, de 0 a 1; t, dt: el tiempo;
     *  esc: los píxeles que ocupa una unidad a una unidad de la cámara (para el tamaño del rocío y el polvo); cam: la cámara */
    update(py, sy, k, t, dt, esc = 600, cam = null, hundidas = 0) {
      const on = k > 0.004; grupo.visible = piedras.visible = sima.visible = agua.visible = pto.visible = canto.visible = panzaA.visible = on;
      if (!on) { antes = k; for (const p of caen) p.vivo = false; for (const p of polvo) p.t = 9; return; }
      const py0 = py; py = py + B * sy;   // (de aquí abajo, py es donde empieza la panza; py0, la base de la comarca)
      TIEMPO.value = t; PTO.uEsc.value = esc;
      if (Math.abs(sy - cantoSy) > 0.002) ponCanto(sy);
      canto.position.y = py0;
      // (al soltarse: un derrumbe por todo el borde, de la isla y del hueco, con su polvo)
      if (k > 0.03 && antes <= 0.03) for (let n = 0; n < 46; n++) {
        const i = (R() * N) | 0, [x, z] = Q[i], [nx, nz] = NOR[i], s = 0.05 + R() * (n < 8 ? 0.28 : 0.13);
        if (n % 2) suelta(x + nx * 0.05, py - 0.05, z + nz * 0.05, nx * (0.3 + R() * 0.7), 0.3 + R() * 0.6, nz * (0.3 + R() * 0.7), s);
        else { const y0 = fuera(x + nx * 0.3, z + nz * 0.3); suelta(x - nx * 0.08, y0, z - nz * 0.08, -nx * (0.05 + R() * 0.25), R() * 0.3, -nz * (0.05 + R() * 0.25), s); if (n % 6 === 0) echaPolvo(x, y0 - 0.2, z, 0.9 + R() * 0.8); }
        if (n % 5 === 0) echaPolvo(x, py - 0.2, z, 0.8 + R() * 0.9);
      }
      antes = k;
      // (y luego, sin parar, unas pocas cada segundo; de vez en cuando, con polvo)
      reloj -= dt;
      if (k > 0.35 && reloj <= 0) { reloj = 0.12 + R() * 0.35;
        if (R() < 0.6) { const [x, y, z, [nx, nz]] = deLaIsla(py, k); suelta(x, y, z, nx * R() * 0.25, -R() * 0.2, nz * R() * 0.25, 0.04 + R() * 0.12); if (R() < 0.18) echaPolvo(x, y, z, 0.5 + R() * 0.6); }
        else { const i = (R() * N) | 0, [x, z] = Q[i], [nx, nz] = NOR[i], y0 = fuera(x + nx * 0.3, z + nz * 0.3); suelta(x - nx * 0.06, y0 - 0.05, z - nz * 0.06, -nx * R() * 0.15, 0, -nz * R() * 0.15, 0.03 + R() * 0.1); if (R() < 0.12) echaPolvo(x, y0 - 0.1, z, 0.5 + R() * 0.5); }
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
        const top = c3.isla ? py0 + c3.h0 * sy : fuera(c3.xo, c3.zo), L2 = Math.max(0.5, top - fondo); c3.top = top; c3.L = L2;
        const b = n * VC;
        for (let s = 0; s <= SEG; s++) {
          const f = (s / SEG) ** 1.15, y = top - L2 * f, cae = top - y;
          // (lo que se aparta del borde: la de la isla, por fuera del canto y luego bajo la panza, que se mete; la del hueco,
          // del canto de la vecina hacia dentro)
          const off = c3.isla ? 0.1 - 0.25 * Math.min(1, Math.max(0, (py - y) / (D * k * 0.14 + 0.05))) : 0.12 - 0.24 * Math.min(1, cae / 0.2);
          const ww = c3.w * (c3.isla ? 1 + 0.9 * f ** 0.7 : 0.9 + 0.7 * f ** 0.8), mece = Math.sin(t * 0.7 + f * 3 + c3.fase) * 0.05 * f;
          // (bajo la orilla, por la pared del cráter, que se va cerrando, hasta el lago)
          let ox = c3.x + c3.nx * off + c3.tx * mece, oz = c3.z + c3.nz * off + c3.tz * mece;
          if (y < corte) { const [wx, wz] = porPared(c3.i, y - corte), rx = wx - cx, rz = wz - cz, rr = Math.hypot(rx, rz) || 1; ox = wx - rx / rr * 0.16 + c3.tx * mece; oz = wz - rz / rr * 0.16 + c3.tz * mece; }
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
      for (const p of polvo) {
        if (p.t < 2.2) { p.t += dt; p.y += p.vy * dt; }
        const f = Math.min(1, p.t / 2.2); pPos[pi * 3] = p.x; pPos[pi * 3 + 1] = p.y; pPos[pi * 3 + 2] = p.z;
        pS[pi] = p.s * (0.6 + f * 1.8); pC[pi * 4] = 0.86; pC[pi * 4 + 1] = 0.82; pC[pi * 4 + 2] = 0.74; pC[pi * 4 + 3] = p.t < 2.2 ? 0.42 * (1 - f) * Math.min(1, p.t * 6) : 0; pi++;
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
        if (p.y < corte + LAGO + 0.08) { p.vivo = false; if (dentro(p.x, p.z) && p.s > 0.07) echaPolvo(p.x, corte + LAGO + 0.15, p.z, 0.35 + p.s * 2); continue; }   // (llegan al fondo del hueco: salpican)
        const enHueco = dentro(p.x, p.z);
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
        vec3 cs = mix(mix(uHorizonte, uMedio, smoothstep(0.0, 0.085, e)), uArriba, smoothstep(0.07, 0.36, e));
        vec3 c = mix(uBruma, cs, smoothstep(0.0, 0.06, d.y));
        gl_FragColor = linearToOutputTexel(vec4(mix(uFondo, c, uK), 1.0));
      }` };
}
