// La maqueta de un pueblo en el mapa del inicio (mapa3d.js): al acercarse mucho a uno de los pueblos con su trazado de
// verdad (src/data/reales: OpenStreetMap y EU-DEM), el relieve de debajo pasa a ser el del pueblo, con un punto cada
// 10 m (20 m en el móvil), y se levantan sus casas con paredes y tejado a dos aguas, la iglesia con su torre, las naves,
// el frontón y los árboles de parques, frutales, cementerios, lindes y orillas (y en los valles del norte, sus bosquetes),
// con la vida del pueblo y del campo: balcones con geranios, leña, muros de piedra, pacas, rebaños y fuentes (coches, no).
// Va en las coordenadas de su comarca: x y z en unidades del mapa (1 = 2.076 m) y la altura del relieve en metros por
// EXA, como la comarca. Las alturas de las casas y los árboles, en cambio, van en unidades del mundo: el relieve se
// exagera más o menos según la distancia (la comarca se escala en y), y las casas no se estiran con él (ver alzado).
// Se hace por pasos (una función generadora): uno por imagen, para que el mapa no se pare mientras se levanta.
import * as THREE from 'three';
import { clamp, smoothstep, mulberry32, segDist, hashStr } from '../util/math.js';

// (alturas de cada clase de edificio cuando OpenStreetMap no la da, en metros)
const ALTO = { house: 8.5, borda: 7, shed: 4.5, industrial: 9, church: 14, townhall: 11, school: 9, tower: 20, fronton: 10 };
// (el color de las paredes según la tierra, en HSL: encaladas en los valles del norte, piedra en el Pirineo, piedra y
// revoco ocre en la Zona Media, ladrillo y ocre en la Ribera)
const PARED = {
  atlantico: [[0.11, 0.2, 0.95], [0.12, 0.16, 0.92], [0.1, 0.14, 0.84]],
  pirineo: [[0.09, 0.12, 0.52], [0.1, 0.1, 0.6], [0.12, 0.14, 0.86]],
  centro: [[0.11, 0.36, 0.8], [0.1, 0.32, 0.73], [0.12, 0.28, 0.88]],
  ribera: [[0.07, 0.38, 0.64], [0.1, 0.3, 0.78], [0.12, 0.2, 0.9]],
};
const ESTILO = { bidasoa: 'atlantico', 'larraun-leitzaldea': 'atlantico', sakana: 'atlantico', pirineo: 'pirineo', prepirineo: 'pirineo', ribera: 'ribera', 'ribera-alta': 'ribera' };
// (los usos del suelo que son campo o están hechos: ahí no crece el bosquete)
// (de los sitios con nombre, solo los monumentos: iglesias, castillos, palacios, puentes, museos…, no tiendas ni oficinas)
const MONUMENTO = /^(iglesia|parroquia|castillo|palacio|bas[ií]lica|monasterio|colegiata|capilla|cripta|ermita|catedral|convento|santuario|puente|la muralla|muralla|torre|torrea|molino|museo|casa museo|ruinas|cruz|silo|cueva|ayuntamiento|mirador|errota)\b|(museoa|gaztelua|eliza|errotazar)\b/i;
const ABIERTO = new Set(['cultivo', 'huerta', 'prado', 'vina', 'deporte', 'plaza', 'cementerio', 'juegos', 'escuela', 'industria', 'cesped']);

const enPoligono = (P, x, z) => { let inn = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inn = !inn; } return inn; };

// (el tejado a cuatro aguas, de la Zona Media y la Ribera: la cumbrera, más corta, y los faldones de los extremos)
function tejado4G() {
  const A = [-0.5, 0, -0.5], B = [0.5, 0, -0.5], C = [0.5, 0, 0.5], D = [-0.5, 0, 0.5], E = [-0.25, 1, 0], F = [0.25, 1, 0];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([A, E, F, A, F, B, D, C, F, D, F, E, A, D, E, B, F, C].flat(), 3));
  g.computeVertexNormals(); return g;
}
// (el tejado a dos aguas: la cumbrera a lo largo de x, de 0 a 1 de alto; sin suelo)
function tejadoG() {
  const A = [-0.5, 0, -0.5], B = [0.5, 0, -0.5], C = [0.5, 0, 0.5], D = [-0.5, 0, 0.5], E = [-0.5, 1, 0], F = [0.5, 1, 0];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([A, E, F, A, F, B, D, C, F, D, F, E, A, D, E, B, F, C].flat(), 3));
  g.computeVertexNormals(); return g;
}

/** Las casas de la maqueta, con los bloques grandes ya partidos en casas y sin las naves de los polígonos: las mismas para
 *  levantarlas y para pintar en el suelo su huella y su sombra (mapa3d.js pintaNucleo). Una vez por pueblo.
 *  (los bloques grandes, una manzana entera o una nave en una sola caja, salían como cajas blancas y lisas de hasta 130 m,
 *  sin tejado ni ventanas, y tapaban las calles; en Tafalla, en pleno centro. En el pueblo se parten en casas de unos
 *  12 × 13 m, cada una con su tejado, su color y su altura, y se dejan huecos, como patios, en la proporción de lo que de
 *  verdad está construido; las naves grandes lejos del centro, las de los polígonos, fuera: es un juego rural) */
export function casasMaqueta(D) {
  if (D._maq) return D._maq;
  const rnd = mulberry32(hashStr((D.id || 'pueblo') + ':bloques'));
  const parte = (b) => {
    if (Math.max(b.w, b.d) <= 24 || !['house', 'industrial', 'shed'].includes(b.k)) return [b];
    if (b.k !== 'house' && Math.hypot(b.x, b.z) > 300) return [];
    const lleno = b.a > 0 ? Math.min(1, b.a / (b.w * b.d)) : 0.8, nx = Math.max(1, Math.round(b.w / 12)), nz = Math.max(1, Math.round(b.d / 13));
    const c = Math.cos(b.ry), s = Math.sin(b.ry), out = [];
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      if (lleno < 0.9 && rnd() > lleno) continue;
      const lx = ((i + 0.5) / nx - 0.5) * b.w, lz = ((j + 0.5) / nz - 0.5) * b.d;
      out.push({ ...b, k: 'house', x: b.x + lx * c + lz * s, z: b.z - lx * s + lz * c, w: b.w / nx * 0.96, d: b.d / nz * 0.96, a: 0, h: (b.h || ALTO.house) * (0.8 + 0.4 * rnd()) });
    }
    return out;
  };
  return (D._maq = D.casas.flatMap(parte));
}
/**
 * D: el pueblo (expandido). o: { X0, Z0 (su centro en el mapa), MU (unidades por metro), EXA, GROSOR, R (su radio, m),
 * sobre(X, Z) (la altura de la comarca en ese punto, sin GROSOR), P (el contorno de la comarca), comarca, lento, K (lo que
 * se exageran las casas y los árboles), alzado ({ value }: 1 / la escala en y de la comarca) }.
 * Deja en res: { geo (el relieve: position, la altura de la comarca; hd, la del pueblo), alto(X, Z), casas (un grupo),
 * mat, monumentos: [{ n, X, Z }] }.
 */
export function* haceMaqueta(D, o, res) {
  const { X0, Z0, MU, EXA, GROSOR, R, sobre, lento, K } = o, rnd = mulberry32(hashStr(D.id || 'pueblo'));
  const estilo = ESTILO[o.comarca] || 'centro', pizarra = o.comarca === 'pirineo', norte = estilo === 'atlantico' || estilo === 'pirineo';

  // ---------- el relieve del pueblo: EU-DEM a 20 m hasta medio kilómetro y a 60 m más allá, con interpolación cúbica;
  // hacia el borde se mezcla con el de la comarca, y en el borde es el mismo ----------
  const g1 = D.dem, g2 = D.dem2, H1 = Float32Array.from(g1.h, h => h / 10), H2 = g2 ? Float32Array.from(g2.h) : null;
  const half1 = (g1.n - 1) * g1.step / 2, half2 = g2 ? (g2.n - 1) * g2.step / 2 : half1;
  const cub = (p0, p1, p2, p3, t) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
  const muestra = (H, n, step, half, x, z) => {
    const fx = clamp((x + half) / step, 0, n - 1.0001), fz = clamp((z + half) / step, 0, n - 1.0001), i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
    const at = (a, b) => H[clamp(b, 0, n - 1) * n + clamp(a, 0, n - 1)], fila = (b) => cub(at(i - 1, b), at(i, b), at(i + 1, b), at(i + 2, b), tx);
    return cub(fila(j - 1), fila(j), fila(j + 1), fila(j + 2), tz);
  };
  const dem = (x, z) => {
    const a = muestra(H1, g1.n, g1.step, half1, x, z), m = Math.max(Math.abs(x), Math.abs(z));
    if (!H2 || m < half1 - 40) return a;
    return a + (muestra(H2, g2.n, g2.step, half2, x, z) - a) * smoothstep(half1 - 40, half1, m);
  };
  // (x, z en metros desde el centro del pueblo → la altura en unidades de la comarca, sin GROSOR)
  const mezcla = (x, z, X, Z) => { const hc = sobre(X, Z), w = 1 - smoothstep(0.7 * R, 0.95 * R, Math.hypot(x, z)); return w > 0 ? hc + ((D.alt0 + dem(x, z)) * EXA - hc) * w : hc; };
  const alto = (X, Z) => { const x = (X - X0) / MU, z = (Z - Z0) / MU; return GROSOR + (Math.hypot(x, z) < R ? mezcla(x, z, X, Z) : sobre(X, Z)); };
  res.alto = alto;
  // (si el pueblo cae cerca del borde de su comarca, lo que queda fuera no se dibuja)
  const P = o.P; let borde = false;
  for (let i = 0, j = P.length - 1; i < P.length && !borde; j = i++) borde = segDist(X0, Z0, P[j][0], P[j][1], P[i][0], P[i][1]).d < R * MU * 1.05;
  // (y lo que se levanta encima, casas, árboles, detalles y rótulos, tampoco: un punto, en metros desde el centro del pueblo,
  // y lo que mide a su alrededor, r, dentro de la comarca. Antes solo se recortaba el suelo, y en los pueblos de la raya,
  // como Irurtzun, las casas y los árboles quedaban en el aire sobre la comarca de al lado o colgando de la pared)
  const cabe = (x, z, r = 0) => { if (!borde) return true; const X = X0 + x * MU, Z = Z0 + z * MU, d = r * MU;
    return enPoligono(P, X, Z) && (!d || (enPoligono(P, X + d, Z) && enPoligono(P, X - d, Z) && enPoligono(P, X, Z + d) && enPoligono(P, X, Z - d))); };
  const S = lento ? 20 : 10, n = Math.ceil(2 * R / S) + 1, pos = new Float32Array(n * n * 3), hd = new Float32Array(n * n), dentro = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const k = j * n + i, x = -R + i * S, z = -R + j * S, X = X0 + x * MU, Z = Z0 + z * MU;
    pos[k * 3] = X; pos[k * 3 + 1] = GROSOR + sobre(X, Z); pos[k * 3 + 2] = Z;
    if (Math.hypot(x, z) < R + S) { hd[k] = GROSOR + mezcla(x, z, X, Z); dentro[k] = !borde || enPoligono(P, X, Z) ? 1 : 0; } else hd[k] = pos[k * 3 + 1];
    if (i === n - 1 && j % 36 === 35) yield;   // (por tandas de filas)
  }
  const idx = [], r2 = R * R;
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = j * n + i, b = a + 1, c = a + n + 1, d = a + n, cx = -R + (i + 0.5) * S, cz = -R + (j + 0.5) * S;
    if (cx * cx + cz * cz > r2 || !(dentro[a] && dentro[b] && dentro[c] && dentro[d])) continue;
    idx.push(a, c, b, a, d, c);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('hd', new THREE.BufferAttribute(hd, 1));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * n * 3).fill(0.9), 3)); geo.setIndex(idx); geo.computeBoundingSphere();
  res.geo = geo;
  yield;

  // ---------- las casas: paredes, tejado y, en las iglesias, la torre con su chapitel ----------
  // (cada pieza, una instancia: la posición es la de su base en el relieve; el alto, en unidades del mundo, y aOff, lo
  // que queda por debajo: en el tejado, lo que miden las paredes)
  // (las texturas, en el propio sombreador, en metros de verdad: así valen para casas de cualquier tamaño. aVent dice qué es
  // cada pieza: 1-3 casas encaladas con contraventanas pardas, verdes o rojas (11-13, de piedra), 4 iglesia, 5 torre,
  // 6 tejado de teja, 7 de pizarra, 8 árbol de hoja, 9 abeto, 0 nada. En las fachadas: ventanas cada 3,4 m y una planta
  // cada 3 m, puertas abajo, zócalo, sombra del alero, esquinas de sillería en las encaladas, sillares en las de piedra y,
  // en la mitad de las del norte, un balcón corrido de madera; en los tejados, hileras de tejas o losas y la cumbrera.
  // De lejos, el detalle fino se funde en su color medio, para que no titile.
  // Los detalles del pueblo, de 21 en adelante: 21 balcón con su barandilla (y geranios en la mitad), 22 muro o pilar de
  // piedra, 23 leña apilada, 24 paca de hierba, 25 oveja o vaca, 26 pila de fuente con su agua)
  const mat = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0 });
  const hastial = new THREE.Color().setHSL(...PARED[estilo][0]);
  // (el musgo en los tejados: mucho en los valles húmedos del norte, algo en el Pirineo, casi nada en la Ribera)
  const musgo = { atlantico: 1, pirineo: 0.6, centro: 0.25, ribera: 0.1 }[estilo];
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uAlzado: o.alzado, uMetro: { value: 1 / MU }, uK: { value: K }, uHastial: { value: hastial }, uMusgo: { value: musgo } });
    sh.vertexShader = 'attribute float aOff, aVent; uniform float uAlzado; varying vec3 vObj, vEsc, vNo; varying float vVent, vSemilla;\n' + sh.vertexShader
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vObj = position; vNo = normal; vVent = aVent; vEsc = vec3(1.0); vSemilla = 0.5;
#ifdef USE_INSTANCING
vEsc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
vSemilla = fract(sin(dot(instanceMatrix[3].xz * 97.0, vec2(12.9898, 78.233))) * 43758.5453);
#endif`)
      .replace('#include <project_vertex>', `vec4 mvPosition = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition; float b0 = instanceMatrix[3].y; mvPosition.y = b0 + (aOff + mvPosition.y - b0) * uAlzado;
#endif
mvPosition = modelViewMatrix * mvPosition; gl_Position = projectionMatrix * mvPosition;`);
    sh.fragmentShader = `uniform float uMetro, uK, uMusgo; uniform vec3 uHastial; varying vec3 vObj, vEsc, vNo; varying float vVent, vSemilla;
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
` + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
if (vVent > 20.5) {
  // (los detalles: u, a lo largo de la cara; w, la altura, los dos en metros)
  float c = vVent - 20.0, la = vEsc.x * uMetro, al = vEsc.y * uMetro / uK, fo = vEsc.z * uMetro;
  bool lx = abs(vNo.x) > 0.5, arriba = vNo.y > 0.5;
  float u = lx ? (vObj.z + 0.5) * fo : (vObj.x + 0.5) * la, w = vObj.y * al, px = max(fwidth(u), fwidth(w)), fino = 1.0 - smoothstep(0.08, 0.3, px);
  if (c < 1.5) {   // (el balcón: barrotes, pasamanos y suelo; detrás, la sombra)
    if (arriba) diffuseColor.rgb *= 0.72;
    else {
      float m = max(max(step(fract(u / 0.16), 0.42), step(0.86, w)), step(w, 0.14));
      vec3 b = mix(vec3(0.06, 0.05, 0.06), diffuseColor.rgb, m);
      float k = floor(u / 0.3), fl = step(0.5, vSemilla) * step(0.62, w) * step(w, 0.98) * step(0.4, h21(vec2(k, floor(w / 0.12)) + vSemilla * 9.0));
      b = mix(b, mix(vec3(0.86, 0.12, 0.16), vec3(0.95, 0.42, 0.62), step(0.7, h21(vec2(k, 3.0)))), fl);
      b = mix(b, vec3(0.2, 0.42, 0.16), step(0.5, vSemilla) * step(0.58, w) * step(w, 0.66));   // (las hojas de las macetas)
      diffuseColor.rgb = mix(diffuseColor.rgb * 0.7, b, fino);
    }
  } else if (c < 2.5) {   // (la piedra: hiladas de mampuestos y la albardilla encima)
    float fila = floor(w / 0.32), pz = (0.84 + 0.26 * h21(vec2(floor(u / 0.55 + fila * 0.5), fila))) * mix(0.78, 1.0, step(0.1, fract(w / 0.32)));
    diffuseColor.rgb *= arriba ? 1.08 : mix(0.95, pz, fino);
  } else if (c < 3.5) {   // (la leña: las testas de los troncos, por delante)
    if (lx || arriba) diffuseColor.rgb *= 0.78;
    else { vec2 q = fract(vec2(u, w) / 0.2) - 0.5; float r = length(q) + 0.12 * h21(floor(vec2(u, w) / 0.2));
      vec3 t = mix(vec3(0.8, 0.62, 0.4), vec3(0.58, 0.4, 0.22), smoothstep(0.08, 0.34, r));
      diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.12, 0.08, 0.05), t, step(r, 0.44)), fino); }
  } else if (c < 4.5) {   // (la paca: la espiral de la hierba en las caras y las vueltas de la cuerda)
    if (lx) diffuseColor.rgb *= 0.86 + 0.16 * sin(length(vObj.yz - vec2(0.5, 0.0)) * 46.0);
    else diffuseColor.rgb *= 0.92 + 0.1 * step(0.9, fract(vObj.x * 3.0));
  } else if (c < 5.5) diffuseColor.rgb *= mix(0.62, 1.06, vObj.y);   // (los animales, con la tripa en sombra)
  else {   // (la pila de la fuente: piedra por fuera y el agua dentro)
    float r = length(vObj.xz) * 2.0;
    if (arriba) diffuseColor.rgb = r < 0.8 ? vec3(0.3, 0.52, 0.64) * (0.9 + 0.12 * sin(r * 30.0)) : diffuseColor.rgb * 1.08;
    else diffuseColor.rgb *= mix(0.8, 1.0, step(0.12, fract(w / 0.35)));
  }
} else {
  float t = vVent > 9.5 ? vVent - 10.0 : vVent, piedra = vVent > 9.5 || (t > 3.5 && t < 5.5) ? 1.0 : 0.0;
  if (t > 0.5 && t < 5.5 && abs(vNo.y) < 0.5) {
    bool lx = abs(vNo.x) > 0.5; float ancho = (lx ? vEsc.z : vEsc.x) * uMetro, u = ((lx ? vObj.z : vObj.x) + 0.5) * ancho;
    float hM = vEsc.y * uMetro / uK, v = vObj.y * hM - 2.0, px = max(fwidth(u), fwidth(v));
    float nitido = 1.0 - smoothstep(0.45, 1.1, px), fino = 1.0 - smoothstep(0.15, 0.5, px);
    vec3 base = diffuseColor.rgb;
    if (piedra > 0.5) { float fila = floor(v / 0.55); base *= mix(1.0, (0.88 + 0.22 * h21(vec2(floor(u / 1.3 + fila * 0.5), fila))) * mix(0.82, 1.0, step(0.08, fract(v / 0.55))), fino); }
    else {
      base = mix(base, base * vec3(0.84, 0.8, 0.74), (1.0 - step(0.8, u) * step(u, ancho - 0.8)) * step(0.8, v) * nitido);
      base *= mix(1.0, 0.94 + 0.1 * h21(floor(vec2(u, v) / 1.3) + vSemilla * 5.0), fino);   // (el revoco, a manchas)
    }
    float hueco = 0.0, marco = 0.0, chorreo = 0.0, dovela = 0.0, escudo = 0.0, fx = fract(u / 3.4);
    if (t < 3.5) {
      float fy = fract(v / 3.0), alto = step(2.6, v) * step(v, hM - 4.4) * step(0.28, fy) * step(fy, 0.8), pu = fract(u / 7.0), dx = (pu - 0.49) * 7.0;
      marco = (step(0.24, fx) * step(fx, 0.36) + step(0.64, fx) * step(fx, 0.76)) * alto;
      // (la puerta: en las casas de piedra, un portal de arco de medio punto con sus dovelas y, en algunas, el escudo encima)
      float rp = length(vec2(dx, max(v - 1.9, 0.0)));
      float puerta = piedra > 0.5 ? step(rp, 0.62) * step(v, 2.6) : step(v, 2.2) * step(abs(dx), 0.49);
      if (piedra > 0.5) {
        dovela = step(1.9, v) * step(0.62, rp) * step(rp, 0.95) * mix(1.0, step(0.14, fract(atan(v - 1.9, dx) * 2.86)), fino);
        vec2 e = vec2(dx / 0.34, (v - 3.25) / 0.36); float dentro = step(abs(e.x), 1.0) * step(e.y, 1.0) * step(length(vec2(e.x, min(e.y + 0.2, 0.0) / 0.8)), 1.0);
        escudo = step(0.6, vSemilla) * dentro * (0.75 + 0.25 * step(0.8, max(abs(e.x), abs(e.y + 0.1))));
      }
      hueco = max(step(0.36, fx) * step(fx, 0.64) * alto, puerta);
      // (bajo cada ventana, el chorreón del agua que escurre del alféizar)
      chorreo = step(3.0, v) * step(v, hM - 4.4) * step(fy, 0.28) * (fy / 0.28) * step(0.38, fx) * step(fx, 0.62);
    } else if (t < 4.5) { float f6 = fract(u / 6.0); hueco = step(0.44, f6) * step(f6, 0.56) * step(hM * 0.4, v) * step(v, hM * 0.72); }
    else { float f3 = fract(u / 3.0); hueco = step(0.3, f3) * step(f3, 0.7) * step(hM - 8.0, v) * step(v, hM - 4.8); }
    vec3 cont = t < 1.5 ? vec3(0.34, 0.21, 0.12) : t < 2.5 ? vec3(0.12, 0.34, 0.2) : vec3(0.52, 0.12, 0.09);
    vec3 det = mix(mix(mix(base, base * 1.18, max(dovela, escudo)), cont, marco), vec3(0.09, 0.08, 0.1), hueco);
    if (t > 1.5 && t < 3.5 && vSemilla < 0.5) det = mix(det, vec3(0.3, 0.18, 0.1), step(2.6, v) * step(v, 3.15) * step(0.4, u) * step(u, ancho - 0.4));
    det *= (1.0 - 0.13 * chorreo * fino) * mix(0.9, 1.0, smoothstep(0.8, 1.8, v));   // (y la humedad que sube del suelo)
    det *= mix(0.78, 1.0, step(0.8, v)) * mix(1.0, 0.72, smoothstep(hM - 2.7, hM - 2.0, v));
    diffuseColor.rgb = mix(base * (t < 3.5 ? 0.86 : 0.96), det, nitido);
  } else if (t > 5.5 && t < 7.5) {
    if (abs(vNo.y) < 0.2) diffuseColor.rgb = uHastial * mix(0.9, 1.0, vSemilla);   // (el hastial, de pared)
    else {
      float dm = vEsc.z * uMetro, rh = vEsc.y * uMetro / uK, L = length(vec2(0.5 * dm, rh)), sl = (0.5 - abs(vObj.z)) * 2.0 * L, u = vObj.x * vEsc.x * uMetro;
      float px = max(fwidth(u), fwidth(sl)), fino = 1.0 - smoothstep(0.2, 0.6, px), medio = 1.0 - smoothstep(0.6, 1.6, px), paso = t < 6.5 ? 0.42 : 0.32, fila = floor(sl / paso);
      float teja = (0.86 + 0.24 * h21(vec2(floor(u / (t < 6.5 ? 0.5 : 0.7) + fila * 0.5), fila))) * (0.8 + 0.2 * smoothstep(0.0, 0.18, fract(sl / paso)));
      // (de más lejos, en vez de cada teja, sus hileras de tres en tres y las manchas de musgo y de teja nueva)
      float hilera = mix(1.0, 0.86 + 0.14 * smoothstep(0.0, 0.35, fract(sl / (paso * 3.0))), medio * (1.0 - fino));
      diffuseColor.rgb *= mix(0.95, teja, fino) * hilera * (0.86 + 0.2 * h21(floor(vec2(u, sl) / 2.2) + vSemilla * 7.0)) * mix(0.8, 1.0, smoothstep(0.0, 0.4, L - sl));
      // (el musgo y el liquen, a manchas, y la sombra del alero abajo)
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.34, 0.4, 0.2), uMusgo * 0.42 * medio * smoothstep(0.55, 0.85, h21(floor(vec2(u, sl) / 1.4) + vSemilla * 3.0)));
      diffuseColor.rgb *= mix(0.74, 1.0, smoothstep(0.0, 0.5, sl));
    }
  } else if (t > 7.5) diffuseColor.rgb *= mix(0.58, 1.12, vObj.y) * (0.9 + 0.2 * vSemilla);
}`).replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += diffuseColor.rgb * 0.14;   // (las caras en sombra, con su propio color y no del malva del cielo)`);
  };
  mat.customProgramCacheKey = () => 'maqueta';
  res.mat = mat;
  const piezas = { paredes: [], tejados: [], agujas: [], arboles: [], abetos: [], detalles: [], pacas: [], animales: [], pilas: [] };
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), e3 = new THREE.Vector3(), sc = new THREE.Vector3(), M4 = new THREE.Matrix4(), col = new THREE.Color();
  const pon = (lista, X, Z, base, ry, w, h, d, off, hsl, vent = 0) => { M4.compose(e3.set(X, base, Z), q.setFromAxisAngle(up, ry), sc.set(w, h, d)); lista.push([M4.toArray(), off, col.setHSL(...hsl).toArray(), vent]); };
  const varia = (b) => ((b.x * 7 + b.z * 13) % 9 + 9) % 9 / 9;
  const hund = 1.5 * EXA;   // (lo que se hunde cada casa en el suelo, para que en cuesta no quede al aire)
  const pie = (x, z, w, d, ry) => {   // (la base de una pieza: lo más bajo de sus esquinas)
    const c = Math.cos(ry), s = Math.sin(ry); let m = 1e9;
    for (const [a, b] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2], [0, 0]]) m = Math.min(m, alto(X0 + (x + a * c + b * s) * MU, Z0 + (z - a * s + b * c) * MU));
    return m - hund;
  };
  const casas = casasMaqueta(D).filter(b => Math.hypot(b.x, b.z) < R * 0.94 && cabe(b.x, b.z, Math.hypot(b.w, b.d) / 2));
  for (const b of casas) {
    const v = varia(b), k = b.k, X = X0 + b.x * MU, Z = Z0 + b.z * MU, base = pie(b.x, b.z, b.w, b.d, b.ry);
    const hM = clamp(b.h || ALTO[k] || 8, 3, 45), H = (hM + 2) * MU * K, largo = Math.max(b.w, b.d), corto = Math.min(b.w, b.d);
    const nave = k === 'industrial' || k === 'shed', piedra = k === 'church' || k === 'tower' || k === 'borda';
    // (los pajares y las naves pequeñas, de piedra parda y con su tejado de teja: antes, gris claro y lisos, como bloques blancos)
    const pared = nave ? [0.08, 0.14, 0.5 + v * 0.08] : piedra ? [0.1, 0.2, 0.52 + v * 0.08] : k === 'fronton' ? [0.1, 0.12, 0.9] : PARED[estilo][Math.floor(v * 2.99)];
    const teja = nave ? [0.035, 0.32, 0.36 + v * 0.06] : pizarra ? [0.63, 0.1, 0.18 + v * 0.07] : [0.025 + v * 0.02, 0.55, 0.36 + v * 0.07];
    if (k === 'fronton') {   // (el frontis y la pared izquierda; la cancha va pintada en el suelo)
      const rx = b.w >= b.d ? b.ry : b.ry + Math.PI / 2, ax = Math.cos(rx), az = -Math.sin(rx), bx = Math.sin(rx), bz = Math.cos(rx);
      pon(piezas.paredes, X - ax * (largo / 2 - 0.8) * MU, Z - az * (largo / 2 - 0.8) * MU, base, rx, 1.6 * MU, (10 + 2) * MU * K, corto * MU, 0, pared);
      pon(piezas.paredes, X - bx * (corto / 2 - 0.6) * MU, Z - bz * (corto / 2 - 0.6) * MU, base, rx, largo * MU, (8 + 2) * MU * K, 1.2 * MU, 0, pared);
      continue;
    }
    if (k === 'tower') {
      pon(piezas.paredes, X, Z, base, b.ry, b.w * MU, H, b.d * MU, 0, pared, 5);
      pon(piezas.agujas, X, Z, base, b.ry, b.w * 1.05 * MU, corto * 1.2 * MU * K, b.d * 1.05 * MU, H, teja, 6);
      continue;
    }
    // (las contraventanas: rojas y verdes en los valles del norte, verdes y pardas en el Pirineo y la Ribera, pardas en la Zona Media)
    const vent = nave ? 0 : k === 'church' ? 4 : (estilo === 'atlantico' ? (v < 0.5 ? 3 : 2) : estilo === 'centro' ? 1 : v < 0.4 ? 2 : 1) + (piedra || (estilo === 'pirineo' && v < 0.6) || (estilo === 'centro' && v < 0.35) ? 10 : 0);
    pon(piezas.paredes, X, Z, base, b.ry, b.w * MU, H, b.d * MU, 0, pared, vent);
    // (el tejado: la cumbrera a lo largo del lado largo, con alero; poco inclinado en los pajares y las naves; casi plano en los bloques grandes que quedan)
    const rx = b.w >= b.d ? b.ry : b.ry + Math.PI / 2, rh = nave ? Math.min(2.4, corto * 0.16) : corto > 30 ? Math.min(1.2, corto * 0.06) : Math.min(9, corto * 0.36);
    pon(piezas.tejados, X, Z, base, rx, (largo * 1.04 + 0.8) * MU, rh * MU * K, (corto * 1.08 + 0.8) * MU, H, teja, pizarra ? 7 : 6);
    // (una chimenea en la mitad de las casas, junto a la cumbrera)
    if (!nave && k !== 'church' && corto < 30 && v > 0.5) { const ax = Math.cos(rx), az = -Math.sin(rx), f = (v - 0.75) * largo * 0.8;
      pon(piezas.paredes, X + ax * f * MU, Z + az * f * MU, base, rx, 0.9 * MU, (rh * 0.75 + 1.4) * MU * K, 0.9 * MU, H, [pared[0], pared[1], pared[2] * 0.85]); }
    // (el balcón del primer piso, en la fachada larga que da al sur, la solana: de madera en los valles del norte y el
    // Pirineo, de forja en la Zona Media y la Ribera; muchos, con geranios)
    const casa = !nave && !piedra && k !== 'fronton' && k !== 'school' && k !== 'townhall';
    if (casa && corto >= 6 && largo >= 7 && hM >= 6 && rnd() < { atlantico: 0.65, pirineo: 0.4, centro: 0.3, ribera: 0.22 }[estilo]) {
      const enX = b.w >= b.d, nx = enX ? Math.sin(b.ry) : Math.cos(b.ry), nz = enX ? Math.cos(b.ry) : -Math.sin(b.ry), s = nz >= 0 ? 1 : -1, sep = corto / 2 + 0.45;
      pon(piezas.detalles, X + nx * s * sep * MU, Z + nz * s * sep * MU, base, enX ? b.ry : b.ry + Math.PI / 2, clamp(largo * 0.62, 3, 14) * MU, 1.0 * MU * K, 0.9 * MU, 5.6 * MU * K,
        norte ? [0.06, 0.42, 0.24 + v * 0.08] : [0.62, 0.06, 0.15], 21);
    }
    // (y en el norte, la leña apilada contra el hastial)
    if (casa && norte && rnd() < 0.35) {
      const enX = b.w >= b.d, ax = enX ? Math.cos(b.ry) : -Math.sin(b.ry), az = enX ? -Math.sin(b.ry) : -Math.cos(b.ry), s = v < 0.5 ? 1 : -1, sep = largo / 2 + 0.4;
      const lx2 = b.x + ax * s * sep, lz2 = b.z + az * s * sep, LX = X0 + lx2 * MU, LZ = Z0 + lz2 * MU;
      if (cabe(lx2, lz2, 2)) pon(piezas.detalles, LX, LZ, alto(LX, LZ) - hund * 0.2, enX ? b.ry + Math.PI / 2 : b.ry, Math.min(corto * 0.6, 4) * MU, 1.6 * MU * K, 0.7 * MU, 0, [0.07, 0.4, 0.3], 23);
    }
    if (k === 'church' && corto > 6) {   // (la torre, al oeste, que es donde suelen tener la fachada)
      const ax = Math.cos(rx), az = -Math.sin(rx), s = ax > 0 ? -1 : 1, tw = clamp(corto * 0.5, 4, 9), off = (largo / 2 - tw / 2) * s;
      const tx = b.x + ax * off, tz = b.z + az * off, tb = pie(tx, tz, tw, tw, rx), TH = (hM * 2.1 + 2) * MU * K;
      pon(piezas.paredes, X0 + tx * MU, Z0 + tz * MU, tb, rx, tw * MU, TH, tw * MU, 0, pared, 5);
      pon(piezas.agujas, X0 + tx * MU, Z0 + tz * MU, tb, rx, tw * 1.08 * MU, tw * 1.3 * MU * K, tw * 1.08 * MU, TH, teja, 6);
    }
  }
  yield;

  // ---------- los árboles: en las orillas, los parques, los frutales, los cementerios (cipreses), las lindes de huertas
  // y prados y, en los valles del norte y el Pirineo, bosquetes donde no hay casas, calles ni campos ----------
  const TOPE = lento ? 1800 : 5000, verde = estilo === 'ribera' ? [0.2, 0.3, 0.34] : estilo === 'centro' ? [0.24, 0.32, 0.3] : [0.28, 0.38, 0.24];
  const CEL = 16, celda = (x, z) => Math.floor(x / CEL) * 8192 + Math.floor(z / CEL);
  const ocupa = new Map(), meter = (x, z, it) => { const k = celda(x, z); let l = ocupa.get(k); if (!l) ocupa.set(k, l = []); l.push(it); };
  for (const b of casas) meter(b.x, b.z, { c: b, r: Math.hypot(b.w, b.d) / 2 + 3 });
  for (const s of D.calles) for (let i = 0; i + 1 < s.pts.length; i++) { const [ax, az] = s.pts[i], [bx, bz] = s.pts[i + 1], L = Math.hypot(bx - ax, bz - az), m = Math.max(1, Math.ceil(L / CEL));
    for (let t = 0; t <= m; t++) meter(ax + (bx - ax) * t / m, az + (bz - az) * t / m, { a: s.pts[i], b: s.pts[i + 1], r: (s.w || 2) + 2 }); }
  for (const r of D.rios) for (let i = 0; i + 1 < r.pts.length; i++) meter(r.pts[i][0], r.pts[i][1], { a: r.pts[i], b: r.pts[i + 1], r: (r.w || 2) + 1.5 });
  const libre = (x, z) => {
    const cx = Math.floor(x / CEL), cz = Math.floor(z / CEL);
    for (let p = -1; p <= 1; p++) for (let q2 = -1; q2 <= 1; q2++) for (const it of ocupa.get((cx + p) * 8192 + cz + q2) || []) {
      if (it.c ? Math.hypot(x - it.c.x, z - it.c.z) < it.r : segDist(x, z, it.a[0], it.a[1], it.b[0], it.b[1]).d < it.r) return false;
    }
    return Math.hypot(x, z) < R * 0.93 && cabe(x, z, 4);
  };
  const sombras = res.sombras = [];   // (cada árbol, su sombra en el suelo pintado: [x, z, radio], en metros)
  const arbol = (x, z, r, alto2, tono = verde, lista = piezas.arboles) => {
    if (piezas.arboles.length + piezas.abetos.length >= TOPE || !libre(x, z)) return;
    const X = X0 + x * MU, Z = Z0 + z * MU, v = rnd();
    pon(lista, X, Z, alto(X, Z) - hund * 0.5, rnd() * 6.28, r * 2 * MU, alto2 * MU * K, r * 2 * MU, 0, [tono[0] + (v - 0.5) * 0.04, tono[1], tono[2] + (v - 0.5) * 0.08], lista === piezas.abetos ? 9 : 8);
    sombras.push([x, z, r]);
  };
  const abeto = (x, z) => arbol(x, z, 2.4 + rnd(), 14 + rnd() * 7, [0.38, 0.36, 0.17], piezas.abetos);
  // (las orillas)
  for (const rio of D.rios) for (let i = 0; i + 1 < rio.pts.length; i++) {
    const [ax, az] = rio.pts[i], [bx, bz] = rio.pts[i + 1], L = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / L, nz = (bx - ax) / L;
    // (en la Ribera y la Zona Media, chopos altos y estrechos; en el norte, alisos)
    for (let t = 0; t < L; t += 9) for (const s of [-1, 1]) if (rnd() < 0.7) { const o2 = (rio.w || 2) + 3 + rnd() * 4, f = t / L, x = ax + (bx - ax) * f + nx * o2 * s, z = az + (bz - az) * f + nz * o2 * s;
      if (estilo === 'ribera' || estilo === 'centro') arbol(x, z, 1.8 + rnd() * 0.7, 15 + rnd() * 6, [0.22, 0.36, 0.3]); else arbol(x, z, 3 + rnd() * 1.5, 9 + rnd() * 5); }
  }
  // (dentro de un polígono, en rejilla con algo de azar)
  const relleno = (pts, paso, prob, f) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    for (let z = z0 + paso / 2; z < z1; z += paso) for (let x = x0 + paso / 2; x < x1; x += paso) if (rnd() < prob) { const px = x + (rnd() - 0.5) * paso * 0.5, pz = z + (rnd() - 0.5) * paso * 0.5; if (enPoligono(pts, px, pz)) f(px, pz); } };
  const lindes = (pts, paso, prob, f) => { for (let i = 0; i < pts.length; i++) { const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length], L = Math.hypot(bx - ax, bz - az); for (let t = paso / 2; t < L; t += paso) if (rnd() < prob) f(ax + (bx - ax) * t / L, az + (bz - az) * t / L); } };
  for (const u of D.usos || []) {
    if (u.k === 'parque') relleno(u.pts, 13, 0.75, (x, z) => arbol(x, z, 3.5 + rnd() * 2, 9 + rnd() * 6));
    else if (u.k === 'frutales') relleno(u.pts, 7, 0.95, (x, z) => arbol(x, z, 2 + rnd() * 0.6, 4.5 + rnd(), [0.25, 0.4, 0.32]));
    else if (u.k === 'cementerio') lindes(u.pts, 6, 0.9, (x, z) => arbol(x, z, 1.3, 9 + rnd() * 3, [0.36, 0.4, 0.2]));
    else if (u.k === 'huerta' || u.k === 'prado') lindes(u.pts, 12, estilo === 'ribera' ? 0.2 : 0.45, (x, z) => arbol(x, z, 3 + rnd() * 1.5, 7 + rnd() * 5));
    else if (u.k === 'cesped') relleno(u.pts, 20, 0.3, (x, z) => arbol(x, z, 3 + rnd(), 8 + rnd() * 4));
  }
  // (los bosquetes: a manchas, con un ruido de valores de 70 m)
  if (estilo === 'atlantico' || estilo === 'pirineo') {
    const campos = (D.usos || []).filter(u => ABIERTO.has(u.k)).map(u => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of u.pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } return { pts: u.pts, x0, x1, z0, z1 }; });
    const sem = hashStr(D.id || 'b'), h2 = (i, j) => { let h = Math.imul(i * 374761393 + j * 668265263 + sem, 1274126177); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
    const mancha = (x, z) => { const fx = x / 70, fz = z / 70, i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j, sx = tx * tx * (3 - 2 * tx), sz = tz * tz * (3 - 2 * tz);
      return (h2(i, j) * (1 - sx) + h2(i + 1, j) * sx) * (1 - sz) + (h2(i, j + 1) * (1 - sx) + h2(i + 1, j + 1) * sx) * sz; };
    for (let k = 0; k < TOPE * 6 && piezas.arboles.length + piezas.abetos.length < TOPE; k++) {
      if (k % 6000 === 5999) yield;
      const a = rnd() * 6.2832, rr = Math.sqrt(rnd()) * R * 0.93, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (mancha(x, z) < 0.55 || campos.some(c => x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && enPoligono(c.pts, x, z))) continue;
      // (en el Pirineo, sobre todo abetos y pinos; en el norte, hayas y robles con algún pinar)
      if (rnd() < (pizarra ? 0.65 : 0.12)) abeto(x, z); else arbol(x, z, 3.5 + rnd() * 2, 10 + rnd() * 8, pizarra ? [0.3, 0.34, 0.22] : verde);
    }
  }
  yield;

  // ---------- el campo y la vida del pueblo (nada de coches: es un juego de pueblos y de campo): muros de piedra seca en
  // las lindes de prados y huertas del norte, pacas de hierba en prados y rastrojos (en el norte, muchas envueltas en
  // plástico negro o blanco), rebaños de ovejas y, en los valles del norte y el Pirineo, vacas pirenaicas, y las fuentes
  // del pueblo (OpenStreetMap) con su pila y su caño ----------
  const suelo = (lista, x, z, ry, w, h, d, hsl, vent) => { const X = X0 + x * MU, Z = Z0 + z * MU; pon(lista, X, Z, alto(X, Z) - hund * 0.2, ry, w * MU, h * MU * K, d * MU, 0, hsl, vent); };
  const TOPE_D = lento ? 0.4 : 1;
  for (const u of D.usos || []) {
    if (!['prado', 'huerta', 'cultivo', 'vina'].includes(u.k)) continue;
    // (los muros, a tramos a lo largo de la linde, con huecos para pasar)
    if ((norte && u.k !== 'cultivo') || (estilo === 'centro' && u.k === 'vina')) for (let i = 0; i < u.pts.length; i++) {
      const [ax, az] = u.pts[i], [bx, bz] = u.pts[(i + 1) % u.pts.length], L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(-(bz - az), bx - ax);
      for (let t = 0; t + 3 < L && piezas.detalles.length < 1600 * TOPE_D; t += 13) {
        const l = Math.min(10, L - t), f = (t + l / 2) / L, x = ax + (bx - ax) * f, z = az + (bz - az) * f;
        if (rnd() < 0.25 || !libre(x, z) || !libre(ax + (bx - ax) * t / L, az + (bz - az) * t / L)) continue;
        suelo(piezas.detalles, x, z, ry, l, 0.9, 0.6, [0.1, 0.08, 0.46 + rnd() * 0.1], 22);
      }
    }
    const dentro = (f) => relleno(u.pts, u.k === 'prado' ? 34 : 46, 0.16, f);
    // (las pacas, de dos a cuatro juntas)
    if ((u.k === 'prado' || u.k === 'cultivo') && piezas.pacas.length < 500 * TOPE_D) dentro((x, z) => {
      const ry = rnd() * 6.28, n = 2 + Math.floor(rnd() * 3), env = norte && u.k === 'prado' && rnd() < 0.45, tono = env ? (rnd() < 0.7 ? [0, 0, 0.1] : [0, 0, 0.92]) : u.k === 'cultivo' ? [0.12, 0.5, 0.66] : [0.15, 0.38, 0.56];
      for (let i = 0; i < n; i++) { const px = x + Math.cos(ry) * i * 1.9, pz = z - Math.sin(ry) * i * 1.9; if (libre(px, pz) && enPoligono(u.pts, px, pz)) suelo(piezas.pacas, px, pz, ry + Math.PI / 2, 1.2, 1.5, 1.5, tono, 24); }
    });
    // (los rebaños, en los prados: ovejas latxas en todas partes; vacas, en el norte)
    if (u.k === 'prado' && piezas.animales.length < 900 * TOPE_D) dentro((x, z) => {
      if (rnd() < 0.5) return;
      const vacas = norte && rnd() < 0.35, n = vacas ? 3 + Math.floor(rnd() * 4) : 8 + Math.floor(rnd() * 12);
      for (let i = 0; i < n; i++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * (vacas ? 9 : 7), px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
        if (!libre(px, pz) || !enPoligono(u.pts, px, pz)) continue;
        if (vacas) suelo(piezas.animales, px, pz, rnd() * 6.28, 2.3, 1.45, 0.95, [0.08, 0.45, 0.5 + rnd() * 0.1], 25);
        else suelo(piezas.animales, px, pz, rnd() * 6.28, 1.3, 0.85, 0.75, [0.12, 0.25, 0.86 + rnd() * 0.06], 25); }
    });
  }
  for (const f of (D.lugares?.fuentes || []).slice(0, 40)) {
    if (Math.hypot(f.x, f.z) > R * 0.93 || !cabe(f.x, f.z, 2)) continue;
    const ry = rnd() * 6.28; suelo(piezas.pilas, f.x, f.z, ry, 2.6, 0.75, 2.6, [0.1, 0.12, 0.66], 26);
    suelo(piezas.detalles, f.x - Math.sin(ry) * 1.1, f.z - Math.cos(ry) * 1.1, ry, 0.6, 1.7, 0.45, [0.1, 0.12, 0.62], 22);
  }
  yield;

  // ---------- las piezas, una malla con instancias por forma ----------
  const caja = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), aguja = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0);
  const copa = new THREE.IcosahedronGeometry(0.5, lento ? 0 : 1).translate(0, 0.5, 0), cono = new THREE.ConeGeometry(0.5, 1, 7).translate(0, 0.5, 0);
  // (la paca, tumbada: su eje a lo largo de x; la pila de la fuente, de pie)
  const rulo = new THREE.CylinderGeometry(0.5, 0.5, 1, 14).rotateZ(Math.PI / 2).translate(0, 0.5, 0), pila = new THREE.CylinderGeometry(0.5, 0.5, 1, 18).translate(0, 0.5, 0);
  const grupo = new THREE.Group();
  for (const [nombre, g0] of [['paredes', caja], ['tejados', estilo === 'centro' || estilo === 'ribera' ? tejado4G() : tejadoG()], ['agujas', aguja], ['arboles', copa], ['abetos', cono],
    ['detalles', caja.clone()], ['pacas', rulo], ['animales', copa.clone()], ['pilas', pila]]) {
    const L = piezas[nombre]; if (!L.length) { g0.dispose(); continue; }
    const off = new Float32Array(L.length), vent = new Float32Array(L.length); L.forEach((p, i) => { off[i] = p[1]; vent[i] = p[3]; });
    g0.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 1)); g0.setAttribute('aVent', new THREE.InstancedBufferAttribute(vent, 1));
    const m = new THREE.InstancedMesh(g0, mat, L.length);
    L.forEach((p, i) => { M4.fromArray(p[0]); m.setMatrixAt(i, M4); m.setColorAt(i, col.fromArray(p[2])); });
    m.computeBoundingSphere(); m.frustumCulled = false; grupo.add(m);
  }
  res.casas = grupo;
  // (sin repetir: de dos a menos de 60 m, el primero; como mucho seis, los más cerca del centro)
  const mon = [];
  for (const x of (D.monumentos || []).filter(x => x.n && x.n.length <= 44 && !/[\d,]/.test(x.n) && MONUMENTO.test(x.n) && Math.hypot(x.x, x.z) < R * 0.8 && cabe(x.x, x.z)).sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z)))
    if (mon.length < 6 && !mon.some(y => Math.hypot(y.x - x.x, y.z - x.z) < 60)) mon.push(x);
  res.monumentos = mon.map(x => ({ n: x.n, X: X0 + x.x * MU, Z: Z0 + x.z * MU }));
}
