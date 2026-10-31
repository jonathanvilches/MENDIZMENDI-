// El campo trabajando: tractores (algunos en marcha), cosechadoras, pacas, remolques de uva, según el cultivo
// de cada parcela. Modelos de diseño propio y genérico (sin marcas), con sus piezas: neumáticos de goma redondeada y
// tacos en V, llantas, capó, rejilla, faros, escape, cabina, espejos, guardabarros, enganches (antes eran cajas). Al
// acercarse se puede ver cómo se hacía antes y cómo se hace ahora.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { fieldInfo, PLACES, HALF } from './layout.js';
import { terrainHeight, groundHeight, onPlatform } from './heightfield.js';
import { addBox, isFree } from './colliders.js';
import { TOWN } from './townBuilder.js';
import { paintedPart as part } from './builder.js';

const MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.15 });
const GLASS = new THREE.MeshStandardMaterial({ color: '#3a4a58', roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.55 });
const WHEEL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (r1, r2, h, n = 12) => new THREE.CylinderGeometry(r1, r2, h, n);

// ---- piezas de la maquinaria ----
// caja de esquinas redondeadas (capós, cabinas, depósitos): las aristas vivas eran lo que más delataba los polígonos
// (las piezas menudas, de menos de 9 cm, como cajas normales: el redondeo ni se ve y cuesta triángulos)
const rbox = (w, h, d, r = 0.06, seg = 1) => Math.min(w, h, d) < 0.09 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
// una pieza ya colocada con giros en cualquier orden: geo transformada por fn(geo) y pintada
const pieza = (geo, hex, fn) => { const g = geo.index ? geo.toNonIndexed() : geo; g.deleteAttribute('uv'); fn?.(g); return part(g, hex, 0, 0, 0); };
// un trozo de cilindro hueco, como un guardabarros curvo, con su eje a lo largo de x: de a0 a a1 (0 delante, π/2 arriba)
const arco = (r, w, a0, a1, hex, x, y, z) => pieza(new THREE.CylinderGeometry(r, r, w, 20, 1, true, a0, a1 - a0), hex, g => { g.rotateZ(Math.PI / 2); g.translate(x, y, z); });

// Rueda con neumático de verdad: el perfil redondeado de la goma, tacos en V (como los de los tractores) por la banda de
// rodadura, llanta en forma de plato con su color, buje y tornillos. Gira alrededor de x
function wheel(r, w, rim, lugs = true) {
  const key = `rueda:${r}:${w}:${rim}:${lugs}`; let geo = MALLAS.get(key);
  if (!geo) MALLAS.set(key, geo = mallaRueda(r, w, rim, lugs));
  const m = new THREE.Mesh(geo, WHEEL); m.castShadow = true; return m;
}
function mallaRueda(r, w, rim, lugs) {
  const pr = [[r * 0.64, -w / 2], [r * 0.9, -w / 2], [r * 0.97, -w * 0.42], [r, -w * 0.3], [r, w * 0.3], [r * 0.97, w * 0.42], [r * 0.9, w / 2], [r * 0.64, w / 2]].map(([a, b]) => new THREE.Vector2(a, b));
  const P = [pieza(new THREE.LatheGeometry(pr, 20), '#232326', g => g.rotateZ(Math.PI / 2))];
  if (lugs) {
    const n = Math.round(r * 18);
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      for (const s of [-1, 1]) P.push(pieza(new THREE.BoxGeometry(w * 0.46, 0.07 * r + 0.02, 0.1 * r + 0.03), '#1b1b1e', g => { g.rotateY(s * 0.55); g.translate(s * w * 0.21, r + 0.02, s * 0.04); g.rotateX(a); }));
    }
  }
  // (la llanta: el plato hundido hacia dentro, con un aro y el buje que asoma, y los tornillos alrededor)
  P.push(pieza(new THREE.CylinderGeometry(r * 0.64, r * 0.64, w * 0.84, 16, 1, true), rim, g => g.rotateZ(Math.PI / 2)));
  for (const s of [-1, 1]) {
    P.push(pieza(new THREE.CylinderGeometry(r * 0.63, r * 0.63, 0.02, 16), rim, g => { g.rotateZ(Math.PI / 2); g.translate(s * (w * 0.42 - 0.02), 0, 0); }));
    P.push(pieza(new THREE.CylinderGeometry(r * 0.4, r * 0.4, 0.02, 16), '#3a3a3c', g => { g.rotateZ(Math.PI / 2); g.translate(s * (w * 0.42 - 0.01), 0, 0); }));
    P.push(pieza(new THREE.CylinderGeometry(r * 0.34, r * 0.34, 0.025, 16), rim, g => { g.rotateZ(Math.PI / 2); g.translate(s * (w * 0.42), 0, 0); }));
    P.push(pieza(new THREE.CylinderGeometry(r * 0.2, r * 0.24, 0.1, 10), rim, g => { g.rotateZ(Math.PI / 2); g.translate(s * (w * 0.42 + 0.05), 0, 0); }));
    P.push(pieza(new THREE.CylinderGeometry(r * 0.08, r * 0.08, 0.06, 6), '#5a5a5c', g => { g.rotateZ(Math.PI / 2); g.translate(s * (w * 0.42 + 0.12), 0, 0); }));
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; P.push(pieza(new THREE.BoxGeometry(0.035, 0.035, 0.035), '#d8d8da', g => { g.rotateZ(Math.PI / 2); g.translate(s * (w * 0.42 + 0.1), Math.cos(a) * r * 0.14, Math.sin(a) * r * 0.14); })); }
  }
  return mergeGeometries(P);
}

// Tractor: capó redondeado con rejilla de lamas, faros y respiraderos; contrapesos delante; escape con su caperuza y
// filtro de aire; cabina con montantes, techo con visera, rotativo naranja, luces de trabajo, espejos en sus brazos,
// asiento, salpicadero y volante; escalones y depósito a un lado; guardabarros curvos; enganche de tres puntos y toma de
// fuerza detrás. Ruedas grandes detrás y pequeñas delante. Mira hacia +z. Sin marcas
// (las mallas se hacen una vez por apero y las comparten todos los tractores del pueblo: con el detalle nuevo, ocho
// máquinas con su propia malla pasaban la memoria del iPhone. Lo pintado del color de cada tractor va en una malla
// aparte, con el color en su material, para que la forma sirva para todos los colores)
const MALLAS = new Map(), PINTURAS = new Map();
const pintura = (hex) => PINTURAS.get(hex) || PINTURAS.set(hex, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.5, metalness: 0.2 })).get(hex);
function tractor(color = '#3f8a3a', implement = null) {
  const key = 'tractor:' + implement; let M = MALLAS.get(key); if (!M) MALLAS.set(key, M = mallasTractor(implement));
  const g = new THREE.Group();
  for (const [geo, mat] of [[M.resto, MAT], [M.pint, pintura(color)], [M.glass, GLASS]]) { const m = new THREE.Mesh(geo, mat); m.castShadow = mat !== GLASS; g.add(m); }
  const wheels = [];
  for (const s of [-1, 1]) { const w = wheel(0.78, 0.46, '#e2b62a'); w.position.set(s * 0.82, 0.78, -0.6); g.add(w); wheels.push([w, 0.78]); }
  for (const s of [-1, 1]) { const w = wheel(0.42, 0.28, '#e2b62a'); w.position.set(s * 0.62, 0.42, 1.25); g.add(w); wheels.push([w, 0.42]); }
  if (implement === 'trailer' || implement === 'grapes') for (const s of [-1, 1]) { const w = wheel(0.45, 0.3, '#a8a8aa', false); w.position.set(s * 1.05, 0.45, implement === 'grapes' ? -3.4 : -3.9); g.add(w); wheels.push([w, 0.45]); }
  g.userData.wheels = wheels;
  return g;
}
function mallasTractor(implement) {
  const P = [], C = [], dk = '#2a2a2e', md = '#404044';
  // bastidor, motor y caja de cambios
  P.push(part(rbox(0.66, 0.46, 2.1, 0.06), dk, 0, 0.82, 0.75));
  P.push(part(rbox(0.86, 0.72, 0.95, 0.1), md, 0, 0.98, -0.52));
  P.push(part(new THREE.BoxGeometry(1.08, 0.12, 0.16), dk, 0, 0.44, 1.25));
  // contrapesos delanteros: placas apiladas en su soporte
  P.push(part(rbox(0.5, 0.2, 0.3, 0.03), dk, 0, 0.78, 1.78));
  for (let i = 0; i < 6; i++) P.push(part(rbox(0.82, 0.32, 0.075, 0.025), i % 2 ? '#38383c' : '#303034', 0, 0.82, 1.9 + i * 0.085));
  P.push(part(new THREE.BoxGeometry(0.1, 0.1, 0.6), '#a8a8aa', 0, 1.02, 2.1));   // (el asa de los contrapesos)
  // capó
  C.push(part(rbox(0.84, 0.64, 1.56, 0.14, 2), '#ffffff', 0, 1.3, 0.86));
  C.push(part(rbox(0.66, 0.06, 1.4, 0.03), '#ffffff', 0, 1.63, 0.82));
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) P.push(part(new THREE.BoxGeometry(0.02, 0.035, 0.46), '#1e1e22', s * 0.42, 1.16 + i * 0.07, 1.02));
  // rejilla delantera con lamas, faros redondos y los intermitentes
  P.push(part(rbox(0.7, 0.5, 0.06, 0.03), '#1c1c20', 0, 1.25, 1.63));
  for (let i = 0; i < 6; i++) P.push(part(new THREE.BoxGeometry(0.62, 0.025, 0.02), '#8a8a8e', 0, 1.06 + i * 0.075, 1.665));
  for (const s of [-1, 1]) {
    P.push(part(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 14), '#fff6c8', s * 0.26, 1.52, 1.66, Math.PI / 2));
    P.push(part(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 14), '#cfcfd2', s * 0.26, 1.52, 1.64, Math.PI / 2));
    P.push(part(rbox(0.07, 0.05, 0.04, 0.012), '#ff9a1a', s * 0.4, 1.5, 1.6));
  }
  // escape con su protector y la caperuza, y el filtro de aire
  P.push(part(new THREE.CylinderGeometry(0.045, 0.05, 1.05, 10), '#262628', 0.3, 2.1, 1.22));
  P.push(part(new THREE.CylinderGeometry(0.075, 0.075, 0.5, 12), '#4a4a4e', 0.3, 1.95, 1.22));
  P.push(pieza(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 10), '#262628', g => { g.rotateX(0.9); g.translate(0.3, 2.66, 1.17); }));
  P.push(part(new THREE.CylinderGeometry(0.055, 0.055, 0.34, 10), md, -0.3, 1.82, 1.3));
  P.push(part(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 12), dk, -0.3, 2.01, 1.3));
  // cabina: suelo, montantes, techo con visera y su borde oscuro, rotativo y luces de trabajo
  P.push(part(rbox(1.16, 0.1, 1.3, 0.03), dk, 0, 1.05, -0.55));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.push(part(rbox(0.07, 1.46, 0.07, 0.02), '#1e1e22', sx * 0.53, 1.8, -0.55 + sz * 0.61));
  C.push(part(rbox(1.34, 0.16, 1.56, 0.07, 2), '#ffffff', 0, 2.58, -0.52));
  P.push(part(rbox(1.24, 0.05, 1.44, 0.02), dk, 0, 2.48, -0.52));
  P.push(part(new THREE.CylinderGeometry(0.06, 0.07, 0.04, 12), dk, -0.42, 2.68, -1.0));
  P.push(part(new THREE.CylinderGeometry(0.055, 0.06, 0.12, 12), '#ffa31a', -0.42, 2.76, -1.0));
  for (let i = 0; i < 4; i++) P.push(part(rbox(0.1, 0.06, 0.05, 0.015), '#fff6c8', -0.42 + i * 0.28, 2.6, 0.27));
  // espejos en sus brazos
  for (const s of [-1, 1]) { P.push(part(new THREE.BoxGeometry(0.3, 0.025, 0.025), dk, s * 0.68, 2.2, 0.06)); P.push(part(rbox(0.035, 0.24, 0.15, 0.015), '#1c1c20', s * 0.84, 2.14, 0.06)); P.push(part(new THREE.BoxGeometry(0.01, 0.2, 0.12), '#a9c4d8', s * 0.86, 2.14, 0.06)); }
  // dentro: asiento con respaldo, salpicadero, columna y volante
  P.push(part(rbox(0.46, 0.1, 0.44, 0.04), '#1a1a1c', 0, 1.36, -0.74));
  P.push(part(rbox(0.46, 0.46, 0.09, 0.04), '#1a1a1c', 0, 1.62, -0.98, -0.12));
  P.push(part(rbox(0.56, 0.26, 0.14, 0.03), '#202024', 0, 1.42, -0.04));
  P.push(part(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 8), '#202024', 0, 1.58, -0.12, -0.6));
  P.push(part(new THREE.TorusGeometry(0.16, 0.018, 6, 20), '#141416', 0, 1.76, -0.22, Math.PI / 2 - 0.6));
  // escalones y asidero a la izquierda; depósito de gasoil debajo de la cabina
  for (const y of [0.52, 0.82]) P.push(part(new THREE.BoxGeometry(0.3, 0.035, 0.22), '#6a6a6e', -0.74, y, -0.15));
  for (const z of [-0.29, -0.01]) P.push(part(new THREE.BoxGeometry(0.03, 0.42, 0.03), dk, -0.74, 0.68, z));
  P.push(part(new THREE.CylinderGeometry(0.018, 0.018, 0.7, 6), '#bcbcbe', -0.6, 1.85, 0.08));
  C.push(part(rbox(0.3, 0.36, 0.62, 0.08), '#ffffff', -0.56, 0.78, 0.2));
  P.push(part(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10), '#141416', -0.56, 0.98, 0.32));
  // guardabarros curvos sobre las ruedas, con su piloto rojo detrás; los delanteros, pequeños, sobre las ruedas chicas
  for (const s of [-1, 1]) {
    C.push(arco(0.88, 0.5, 0.15, Math.PI * 0.82, '#ffffff', s * 0.82, 0.78, -0.6));
    C.push(part(new THREE.BoxGeometry(0.48, 0.035, 0.6), '#ffffff', s * 0.82, 1.67, -0.62));
    P.push(part(rbox(0.12, 0.08, 0.04, 0.015), '#d01e1e', s * 0.9, 1.3, -1.47));
    C.push(arco(0.5, 0.32, 0.35, Math.PI * 0.78, '#ffffff', s * 0.62, 0.42, 1.25));
  }
  // detrás: enganche de tres puntos, toma de fuerza y barra de tiro
  for (const s of [-1, 1]) P.push(part(new THREE.BoxGeometry(0.06, 0.06, 0.62), '#333336', s * 0.3, 0.56, -1.22, 0.2));
  P.push(part(new THREE.BoxGeometry(0.06, 0.06, 0.5), '#333336', 0, 1.0, -1.15, -0.25));
  P.push(part(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 8), '#9a9a9c', 0, 0.68, -1.12, Math.PI / 2));
  P.push(part(new THREE.BoxGeometry(0.14, 0.08, 0.5), dk, 0, 0.46, -1.25));
  if (implement === 'plough') {
    // arado de tres cuerpos: bastidor, rejas y vertederas curvadas, ruedecilla de profundidad
    P.push(part(rbox(0.14, 0.14, 1.9, 0.03), '#5a5a5e', 0.15, 0.78, -2.05, 0, 0.35, 0));
    for (let i = 0; i < 3; i++) {
      const z = -1.75 - i * 0.55, x = -0.35 + i * 0.36;
      // (el brazo, la vertedera de acero inclinada que voltea la tierra y la reja afilada abajo)
      P.push(part(new THREE.BoxGeometry(0.06, 0.5, 0.08), '#4a4a4e', x, 0.5, z));
      P.push(part(rbox(0.05, 0.38, 0.62, 0.02), '#a9a9ad', x + 0.16, 0.3, z - 0.1, 0, 0.75, -0.4));
      P.push(part(new THREE.BoxGeometry(0.035, 0.04, 0.42), '#77777a', x + 0.06, 0.08, z + 0.06, 0, 0.6, 0));
    }
    P.push(part(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 14), '#232326', 0.55, 0.22, -3.0, 0, 0, Math.PI / 2));
  } else if (implement === 'trailer') {
    // remolque: lanza en triángulo, chasis, suelo, laterales de tablones entre postes, frontal alto con rejilla,
    // portón trasero, guardabarros y pilotos
    for (const s of [-1, 1]) P.push(part(new THREE.BoxGeometry(0.08, 0.1, 1.25), dk, s * 0.32, 0.62, -1.85, 0, s * 0.25, 0));
    P.push(part(new THREE.BoxGeometry(0.1, 0.1, 0.2), '#9a9a9c', 0, 0.55, -1.32));
    for (const s of [-1, 1]) P.push(part(new THREE.BoxGeometry(0.12, 0.16, 3.3), dk, s * 0.6, 0.78, -3.9));
    P.push(part(new THREE.BoxGeometry(1.96, 0.08, 3.24), '#6e4a2e', 0, 0.95, -3.9));
    const tabla = '#8a3a2a', poste = '#3a3a3e';
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) P.push(part(new THREE.BoxGeometry(0.05, 0.15, 3.2), i === 1 ? '#7e3426' : tabla, s * 0.96, 1.08 + i * 0.19, -3.9));
      for (let i = 0; i < 5; i++) P.push(part(new THREE.BoxGeometry(0.07, 0.62, 0.07), poste, s * 0.995, 1.3, -5.45 + i * 0.775));
    }
    for (let i = 0; i < 4; i++) P.push(part(new THREE.BoxGeometry(1.94, 0.15, 0.05), tabla, 0, 1.08 + i * 0.19, -2.31));
    for (let i = 0; i < 7; i++) P.push(part(new THREE.BoxGeometry(0.025, 0.4, 0.025), '#58585c', -0.75 + i * 0.25, 1.95, -2.31));
    P.push(part(new THREE.BoxGeometry(1.94, 0.04, 0.04), '#58585c', 0, 2.15, -2.31));
    for (let i = 0; i < 3; i++) P.push(part(new THREE.BoxGeometry(1.94, 0.15, 0.05), tabla, 0, 1.08 + i * 0.19, -5.49));
    for (const s of [-1, 1]) { P.push(arco(0.56, 0.36, 0.25, Math.PI * 0.75, '#2c2c30', s * 1.05, 0.45, -3.9)); P.push(part(rbox(0.14, 0.09, 0.04, 0.015), '#d01e1e', s * 0.8, 0.82, -5.56)); }
  } else if (implement === 'grapes') {
    // remolque bañera de la vendimia: metálico, de bordes redondeados, lleno de racimos
    P.push(part(new THREE.BoxGeometry(0.1, 0.1, 1.1), dk, 0, 0.7, -1.75));
    for (const s of [-1, 1]) P.push(part(new THREE.BoxGeometry(0.12, 0.14, 2.3), dk, s * 0.5, 0.78, -3.4));
    P.push(part(rbox(1.52, 0.74, 2.24, 0.16, 2), '#9aa0a6', 0, 1.22, -3.4));
    P.push(part(rbox(1.42, 0.06, 2.12, 0.03), '#7a8086', 0, 1.6, -3.4));
    for (let i = 0; i < 18; i++) P.push(part(new THREE.IcosahedronGeometry(0.16, 0), i % 3 ? '#4a1f4a' : '#5e2a5e', -0.5 + (i % 6) * 0.2, 1.66 + (i % 2) * 0.04, -4.2 + Math.floor(i / 6) * 0.75));
    for (const s of [-1, 1]) P.push(arco(0.56, 0.34, 0.25, Math.PI * 0.75, '#2c2c30', s * 1.05, 0.45, -3.4));
  }
  // los cristales de la cabina: delante, detrás y a los lados
  const glass = mergeGeometries([part(new THREE.BoxGeometry(1.0, 1.24, 0.02), '#fff', 0, 1.84, 0.06), part(new THREE.BoxGeometry(1.0, 1.2, 0.02), '#fff', 0, 1.86, -1.16), part(new THREE.BoxGeometry(0.02, 1.24, 1.16), '#fff', 0.53, 1.84, -0.55), part(new THREE.BoxGeometry(0.02, 1.24, 1.16), '#fff', -0.53, 1.84, -0.55)]);
  return { resto: mergeGeometries(P), pint: mergeGeometries(C), glass };
}

// Cosechadora: cuerpo de esquinas redondeadas con sus paneles y una franja; tolva abierta arriba (el grano se ve
// dentro), con sus alas; cabina alta delante con plataforma y barandilla, escalera, rotativo, fila de luces y espejos;
// canal de alimentación; cabezal con barra de corte y sus dedos, divisores en punta, sinfín y molinete de barras con
// púas; tubo de descarga plegado al costado con su boca; atrás, rejilla del motor, esparcidor de paja, escape y pilotos.
// Mira hacia +z. Sin marcas
function combine(color = '#c8a227') {
  const key = 'combine:' + color; let M = MALLAS.get(key); if (!M) MALLAS.set(key, M = mallasCombine(color));
  const g = new THREE.Group(), body = new THREE.Mesh(M.resto, MAT); body.castShadow = true; g.add(body); g.add(new THREE.Mesh(M.glass, GLASS));
  const wheels = [];
  for (const s of [-1, 1]) { const w = wheel(0.95, 0.62, '#bcbcbe'); w.position.set(s * 1.45, 0.95, 1.1); g.add(w); wheels.push([w, 0.95]); }
  for (const s of [-1, 1]) { const w = wheel(0.6, 0.4, '#bcbcbe'); w.position.set(s * 1.3, 0.6, -2.6); g.add(w); wheels.push([w, 0.6]); }
  g.userData.wheels = wheels;
  return g;
}
function mallasCombine(color) {
  const P = [], dk = '#2a2a2e', md = '#404044', rojo = '#c8302a', acero = '#bdbdc0';
  // cuerpo, bajos oscuros, juntas de los paneles y la franja
  P.push(part(rbox(2.5, 2.1, 5.0, 0.2, 2), color, 0, 2.15, -0.6));
  P.push(part(rbox(2.2, 0.5, 5.2, 0.08), dk, 0, 1.0, -0.6));
  for (const s of [-1, 1]) {
    for (const z of [-2.2, -0.9, 0.4]) P.push(part(new THREE.BoxGeometry(0.02, 1.7, 0.03), '#8a7418', s * 1.255, 2.2, z));
    P.push(part(new THREE.BoxGeometry(0.02, 0.16, 4.6), '#2c2c30', s * 1.255, 2.75, -0.6));
    for (let i = 0; i < 4; i++) P.push(part(new THREE.BoxGeometry(0.02, 0.04, 0.6), '#2c2c30', s * 1.255, 1.55 + i * 0.1, -2.6));
  }
  // tolva abierta: suelo y paredes, con las alas abiertas por encima
  P.push(part(new THREE.BoxGeometry(2.2, 0.08, 2.4), color, 0, 3.24, -1.3));
  for (const s of [-1, 1]) { P.push(part(new THREE.BoxGeometry(0.08, 0.84, 2.5), color, s * 1.12, 3.62, -1.3)); P.push(part(new THREE.BoxGeometry(2.3, 0.84, 0.08), color, 0, 3.62, -1.3 + s * 1.22)); }
  for (const s of [-1, 1]) { P.push(part(new THREE.BoxGeometry(0.05, 0.42, 2.5), '#d8b437', s * 1.24, 4.18, -1.3, 0, 0, s * -0.45)); P.push(part(new THREE.BoxGeometry(2.4, 0.42, 0.05), '#d8b437', 0, 4.18, -1.3 + s * 1.34, s * 0.45, 0, 0)); }
  // cabina: suelo, montantes, techo con visera, rotativo, luces de trabajo, espejos; plataforma con barandilla
  P.push(part(rbox(1.7, 0.12, 1.8, 0.03), dk, 0, 3.25, 1.65));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.push(part(rbox(0.08, 1.32, 0.08, 0.02), '#1e1e22', sx * 0.81, 3.92, 1.65 + sz * 0.83));
  P.push(part(rbox(1.92, 0.16, 2.0, 0.08, 2), color, 0, 4.62, 1.7));
  P.push(part(rbox(1.8, 0.05, 1.86, 0.02), dk, 0, 4.52, 1.7));
  P.push(part(new THREE.CylinderGeometry(0.07, 0.08, 0.14, 12), '#ffa31a', 0.6, 4.78, 1.1));
  for (let i = 0; i < 6; i++) P.push(part(rbox(0.12, 0.07, 0.05, 0.015), '#fff6c8', -0.75 + i * 0.3, 4.62, 2.72));
  for (const s of [-1, 1]) { P.push(part(new THREE.BoxGeometry(0.6, 0.03, 0.03), dk, s * 1.15, 4.2, 2.45)); P.push(part(rbox(0.04, 0.32, 0.2, 0.015), '#1c1c20', s * 1.45, 4.1, 2.45)); }
  P.push(part(new THREE.BoxGeometry(2.2, 0.06, 0.5), '#6a6a6e', 0, 3.2, 2.75));
  for (let i = 0; i < 6; i++) P.push(part(new THREE.BoxGeometry(0.03, 0.55, 0.03), dk, -1.05 + i * 0.42, 3.48, 2.98));
  P.push(part(new THREE.BoxGeometry(2.2, 0.03, 0.03), dk, 0, 3.76, 2.98));
  // dentro: asiento, volante y consola
  P.push(part(rbox(0.5, 0.12, 0.5, 0.04), '#1a1a1c', 0, 3.36, 1.5)); P.push(part(rbox(0.5, 0.5, 0.1, 0.04), '#1a1a1c', 0, 3.64, 1.24, -0.12));
  P.push(part(new THREE.TorusGeometry(0.17, 0.02, 6, 20), '#141416', 0, 3.82, 2.05, Math.PI / 2 - 0.5));
  P.push(part(rbox(0.25, 0.4, 0.5, 0.03), '#202024', 0.45, 3.5, 1.7));
  // escalera a la izquierda, del suelo a la plataforma
  for (const z of [2.25, 2.6]) P.push(part(new THREE.BoxGeometry(0.04, 2.9, 0.04), '#6a6a6e', -1.42, 1.72, z, 0.12));
  for (let i = 0; i < 8; i++) P.push(part(new THREE.BoxGeometry(0.03, 0.03, 0.36), '#8a8a8e', -1.42, 0.45 + i * 0.36, 2.42 + 0.17 - i * 0.043));
  // canal de alimentación y cabezal: pared, suelo, barra de corte con sus dedos, laterales con divisores en punta
  P.push(part(rbox(1.1, 1.0, 1.7, 0.06), dk, 0, 1.45, 2.7, 0.32));
  P.push(part(new THREE.BoxGeometry(5.4, 0.85, 0.08), rojo, 0, 0.88, 3.22));
  P.push(part(new THREE.BoxGeometry(5.4, 0.06, 1.25), '#a8261f', 0, 0.44, 3.84));
  P.push(part(new THREE.BoxGeometry(5.4, 0.05, 0.1), '#8a8a8c', 0, 0.45, 4.48));
  for (let i = 0; i < 30; i++) P.push(part(new THREE.ConeGeometry(0.025, 0.16, 4), acero, -2.62 + i * 0.18, 0.45, 4.6, Math.PI / 2));
  for (const s of [-1, 1]) {
    P.push(part(rbox(0.07, 0.86, 1.36, 0.03), rojo, s * 2.72, 0.85, 3.88));
    P.push(part(new THREE.ConeGeometry(0.12, 0.7, 6), acero, s * 2.72, 0.52, 4.86, Math.PI / 2 + 0.25));
  }
  // sinfín del cabezal con sus espiras, y molinete: eje, estrellas de los extremos, barras y púas
  P.push(part(new THREE.CylinderGeometry(0.17, 0.17, 5.2, 12), acero, 0, 0.72, 3.6, 0, 0, Math.PI / 2));
  for (let i = 0; i < 16; i++) { const x = (i < 8 ? -2.5 + i * 0.27 : 0.6 + (i - 8) * 0.27); P.push(part(new THREE.CylinderGeometry(0.3, 0.3, 0.025, 12), '#cfcfd2', x, 0.72, 3.6, 0, 0, Math.PI / 2 + (i < 8 ? 0.35 : -0.35))); }
  P.push(part(new THREE.CylinderGeometry(0.05, 0.05, 5.3, 8), md, 0, 1.6, 4.3, 0, 0, Math.PI / 2));
  for (const s of [-1, 1]) {
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; P.push(part(new THREE.BoxGeometry(0.04, 0.62, 0.05), rojo, s * 2.5, 1.6 + Math.cos(a) * 0.3, 4.3 + Math.sin(a) * 0.3, a)); }
    P.push(part(new THREE.BoxGeometry(0.1, 0.12, 2.3), rojo, s * 1.875, 1.975, 3.4, 0.29, s * 0.607, 0));   // (el brazo del molinete, del cuerpo a su extremo)
  }
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2, y = 1.6 + Math.cos(a) * 0.6, z = 4.3 + Math.sin(a) * 0.6;
    P.push(part(new THREE.CylinderGeometry(0.03, 0.03, 5.1, 6), '#e8e0c8', 0, y, z, 0, 0, Math.PI / 2));
    for (let k = 0; k < 10; k++) P.push(part(new THREE.BoxGeometry(0.016, 0.26, 0.016), '#9a9a9c', -2.3 + k * 0.51, y - 0.13, z));
  }
  // tubo de descarga plegado a lo largo del costado derecho, con su codo y su boca; y la cuna donde apoya
  P.push(part(new THREE.CylinderGeometry(0.19, 0.19, 3.8, 12), '#5a5a5e', 1.45, 3.78, -1.55, Math.PI / 2 - 0.08));
  P.push(part(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 12), md, 1.45, 3.63, 0.38, Math.PI / 2));
  P.push(part(new THREE.CylinderGeometry(0.16, 0.12, 0.45, 12), md, 1.45, 3.45, 0.55));
  P.push(part(new THREE.BoxGeometry(0.1, 0.6, 0.1), dk, 1.38, 3.35, 0.0));
  for (let i = 0; i < 5; i++) P.push(part(new THREE.TorusGeometry(0.195, 0.025, 4, 12), '#3a3a3e', 1.45, 3.78 + (i - 2) * 0.06, -1.55 + (i - 2) * 0.75));   // (las juntas del tubo)
  // atrás: rejilla del motor, esparcidor de paja, escape, pilotos y la bocina del rotativo trasero
  P.push(part(rbox(1.8, 0.7, 0.08, 0.03), '#1e1e22', 0, 2.65, -3.12));
  for (let i = 0; i < 6; i++) P.push(part(new THREE.BoxGeometry(1.7, 0.03, 0.03), '#5a5a5e', 0, 2.38 + i * 0.1, -3.17));
  P.push(part(rbox(1.7, 0.6, 0.7, 0.08), dk, 0, 1.45, -3.3));
  P.push(part(new THREE.CylinderGeometry(0.07, 0.08, 1.2, 10), '#262628', -0.85, 4.25, -2.55));
  for (const s of [-1, 1]) P.push(part(rbox(0.16, 0.1, 0.04, 0.015), '#d01e1e', s * 1.0, 1.95, -3.12));
  const glass = mergeGeometries([part(new THREE.BoxGeometry(1.62, 1.18, 0.02), '#fff', 0, 3.92, 2.48, -0.08), part(new THREE.BoxGeometry(0.02, 1.18, 1.6), '#fff', 0.81, 3.92, 1.65), part(new THREE.BoxGeometry(0.02, 1.18, 1.6), '#fff', -0.81, 3.92, 1.65), part(new THREE.BoxGeometry(1.62, 1.1, 0.02), '#fff', 0, 3.95, 0.82)]);
  return { resto: mergeGeometries(P), glass };
}

// Pacas: redondas (de hierba, envueltas o de paja) en hilera
function bales(kind, n, rnd) {
  const P = [];
  for (let i = 0; i < n; i++) {
    const x = (i % 3) * 2.6 + (rnd() - 0.5) * 0.6, z = Math.floor(i / 3) * 3 + (rnd() - 0.5) * 0.6;
    if (kind === 'straw') { P.push(part(box(1.2, 0.5, 0.8), '#e0c36a', x, 0.25, z)); P.push(part(box(1.2, 0.5, 0.8), '#d8bb62', x + 0.1, 0.75, z)); }
    else P.push(part(cyl(0.7, 0.7, 1.2, 18), kind === 'wrap' ? (i % 4 ? '#f2f2ee' : '#3f6a3a') : '#d6bd68', x, 0.7, z, 0, rnd() * 0.4, Math.PI / 2));
  }
  const m = new THREE.Mesh(mergeGeometries(P), MAT); m.castShadow = true; return m;
}

// Qué se cuenta de cada máquina: cómo se hacía antes y cómo ahora
const AGRO_INFO = {
  plough: { icon: 'wheat', title: 'El tractor arando', text: 'Arar es dar la vuelta a la tierra para que se airee y la semilla pueda crecer.',
    then: 'Se araba con una pareja de bueyes o de mulas tirando de un arado de madera con reja de hierro. Arar un campo costaba días.', now: 'El tractor tira de un arado de varias rejas. Una sola persona ara en unas horas lo que antes llevaba una semana.' },
  combine: { icon: 'wheat', title: 'La cosechadora', text: 'En verano el trigo y la cebada se cosechan cuando la espiga está seca y dorada.',
    then: 'Se segaba a mano con la hoz, se ataban gavillas y se llevaban a la era. Allí el trillo, tirado por animales, separaba el grano de la paja, y se aventaba al viento.', now: 'La cosechadora corta, trilla y limpia el grano a la vez, y lo guarda en su tolva. La paja sale por detrás y luego se empaca.' },
  bales: { icon: 'wheat', title: 'Las pacas de hierba', text: 'La hierba se siega en primavera y verano, se deja secar al sol y se enrolla en pacas para dar de comer al ganado en invierno.',
    then: 'Se segaba con guadaña y se hacían almiares (metak): montones de hierba seca alrededor de un palo, colocados con la horca.', now: 'Una segadora corta, otra máquina la voltea y la empacadora hace pacas. Algunas se envuelven en plástico para que fermenten (silo).' },
  trailer: { icon: 'wheat', title: 'Tractor con remolque', text: 'El remolque lleva la cosecha, el forraje o el abono del campo a la granja.',
    then: 'Todo se movía en carros de madera con ruedas de radios, tirados por bueyes, mulas o burros.', now: 'Los tractores con remolque llevan muchas toneladas de una vez, por caminos agrícolas.' },
  grapes: { icon: 'grapes', title: 'La vendimia', text: 'En septiembre y octubre se recoge la uva para hacer vino.',
    then: 'Se vendimiaba a mano con navaja o tijera, en cestos que se vaciaban en comportas cargadas a lomos de caballerías.', now: 'Mucha uva se sigue cogiendo a mano, pero también hay máquinas vendimiadoras. El tractor la lleva rápido a la bodega para que no se estropee.' },
};

// Coloca la maquinaria por las parcelas del pueblo según su cultivo
// (los mismos tractor y cosechadora, para conducirlos en las misiones de cosecha: game/conducir.js)
export { tractor as tractorModel, combine as combineModel };
export function buildAgro(scene, def, rnd) {
  const out = [], movers = [];
  const nearHouse = (x, z) => TOWN.houses.some(h => Math.abs(h.x - x) < 26 && Math.abs(h.z - z) < 26) || Math.hypot(x - PLACES.plaza.x, z - PLACES.plaza.z) < 60;
  const cand = [];
  for (let z = -HALF + 40; z < HALF - 40; z += 13) for (let x = -HALF + 40; x < HALF - 40; x += 13) {
    const fi = fieldInfo(x, z);
    if (fi.mask < 0.95 || fi.edge < 9 || nearHouse(x, z) || !isFree(x, z, 4.5) || onPlatform(x, z, 6)) continue;   // (ni encima de la pista ni del frontón)
    const h0 = terrainHeight(x, z), slope = Math.abs(terrainHeight(x + 4, z) - h0) + Math.abs(terrainHeight(x, z + 4) - h0);
    if (slope > 1.2) continue;
    cand.push({ x, z, fi });
  }
  // mezcla y una máquina por parcela como mucho
  for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
  const usedCell = new Set(), max = def.family === 'city' ? 4 : 8;
  const COL = ['#3f8a3a', '#c8302a', '#2f5fb3', '#3f8a3a', '#d9822a'];
  for (const c of cand) {
    if (out.length >= max) break;
    const t = c.fi.type; if (usedCell.has(c.fi.cell) || ![0, 1, 2, 3, 4, 5, 7].includes(t)) continue;
    if (out.some(o => Math.hypot(o.x - c.x, o.z - c.z) < 45)) continue;
    usedCell.add(c.fi.cell);
    // dirección de los surcos: la de las filas del campo (se mide hacia dónde cambia menos la fila)
    const r0 = c.fi.row, ru = fieldInfo(c.x + 2, c.z).row - r0, rv = fieldInfo(c.x, c.z + 2).row - r0;
    const ang = Math.atan2(rv, -ru);   // a lo largo de la fila
    let obj, kind;
    if (t === 2) { obj = combine(); kind = 'combine'; }
    else if (t === 3) { obj = tractor(COL[out.length % COL.length], 'plough'); kind = 'plough'; }
    else if (t === 5) { obj = tractor(COL[(out.length + 1) % COL.length], 'grapes'); kind = 'grapes'; }
    else if (t === 0 || t === 4 || t === 1) { obj = rnd() < 0.5 ? bales(t === 1 ? 'straw' : rnd() < 0.5 ? 'wrap' : 'hay', 6 + Math.floor(rnd() * 4), rnd) : tractor(COL[out.length % COL.length], 'trailer'); kind = obj.userData.wheels ? 'trailer' : 'bales'; }
    else { obj = tractor(COL[out.length % COL.length], 'trailer'); kind = 'trailer'; }
    obj.position.set(c.x, groundHeight(c.x, c.z), c.z); obj.rotation.y = ang;
    scene.add(obj);
    const o = { kind, x: c.x, z: c.z, obj, info: AGRO_INFO[kind] };
    // algunos trabajan: van y vienen por el surco (si está libre de punta a punta)
    const L = 26, free = [0, 0.25, 0.5, 0.75, 1].every(t => { const x = c.x + Math.sin(ang) * L * t, z = c.z + Math.cos(ang) * L * t; return isFree(x, z, 3.5) && !onPlatform(x, z, 5); });
    if ((kind === 'plough' || kind === 'combine') && movers.length < 2 && free) {
      o.move = { x0: c.x, z0: c.z, dx: Math.sin(ang), dz: Math.cos(ang), L, s: 0, dir: 1, speed: kind === 'combine' ? 1.6 : 2.0, turn: 0 };
      movers.push(o);
    } else addBox(c.x, c.z, kind === 'combine' ? 5.6 : 2.4, kind === 'combine' ? 7 : kind === 'bales' ? 8 : 5.5, ang);
    out.push(o);
  }
  // las máquinas paradas, juntas: cada pieza (la misma malla con el mismo material) en una sola malla repetida para todas.
  // Una llamada de dibujo por pieza en vez de una por pieza y por máquina: con las máquinas de piezas, cinco tractores a
  // la vista costaban casi cien llamadas. Sin memoria de más (las mallas son las mismas); las que trabajan, aparte
  const quietas = out.filter(o => !o.move && o.obj.userData.wheels);
  if (quietas.length > 1) {
    const piezas = new Map();
    for (const o of quietas) {
      o.obj.updateMatrixWorld(true);
      o.obj.traverse(m => {
        if (!m.isMesh || m.isInstancedMesh) return;
        const k = m.geometry.uuid + '|' + (Array.isArray(m.material) ? m.material.map(x => x.uuid).join(',') : m.material.uuid);
        let P = piezas.get(k); if (!P) piezas.set(k, P = { geo: m.geometry, mat: m.material, cast: m.castShadow, rec: m.receiveShadow, mx: [] });
        P.mx.push(m.matrixWorld.clone());
      });
      scene.remove(o.obj);
    }
    for (const P of piezas.values()) {
      const im = new THREE.InstancedMesh(P.geo, P.mat, P.mx.length); im.name = 'maquinas-quietas';
      P.mx.forEach((mx, i) => im.setMatrixAt(i, mx)); im.instanceMatrix.needsUpdate = true;
      im.castShadow = P.cast; im.receiveShadow = P.rec; im.computeBoundingSphere(); scene.add(im);
    }
  }
  return {
    list: out,
    update(dt, player, particles) {
      for (const o of movers) {
        const m = o.move, obj = o.obj;
        if (Math.abs(player.pos.x - obj.position.x) + Math.abs(player.pos.z - obj.position.z) > 260) continue;
        // se para si el jugador está delante
        const ahead = Math.hypot(player.pos.x - (obj.position.x + m.dx * m.dir * 4), player.pos.z - (obj.position.z + m.dz * m.dir * 4)) < 4.5;
        if (m.turn > 0) { m.turn -= dt; obj.rotation.y += dt * Math.PI / 2.5; if (m.turn <= 0) { m.dir *= -1; obj.rotation.y = Math.atan2(m.dx * m.dir, m.dz * m.dir); } continue; }
        if (ahead) continue;
        m.s += m.dir * m.speed * dt;
        if (m.s > m.L || m.s < 0) { m.s = Math.max(0, Math.min(m.L, m.s)); m.turn = 2.5; continue; }
        const x = m.x0 + m.dx * m.s, z = m.z0 + m.dz * m.s;
        obj.position.set(x, groundHeight(x, z), z); o.x = x; o.z = z;
        for (const [w, r] of obj.userData.wheels) w.rotation.x += m.dir * m.speed * dt / r;
        if (particles && Math.random() < dt * 6) particles.emit({ x: x - m.dx * m.dir * 2.6, y: obj.position.y + 0.3, z: z - m.dz * m.dir * 2.6 }, { n: 3, color: o.kind === 'combine' ? ['#d9c27a', '#bba25a'] : ['#8a6a45', '#a5865a'], speed: 0.8, size: 0.5, life: 1.2 });
      }
    },
  };
}
