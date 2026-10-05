// Animales con modelo y animaciones de Quaternius (CC0, «LowPoly Animals»), preparados con tools/animalpack.mjs.
// Cada especie del juego usa uno de esos modelos con los colores de la raza navarra (vaca pirenaica, pottoka,
// perros pastores…), a su tamaño real, y elige su animación según lo que hace: pastar, quieto, andar o galopar.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';   // los modelos van comprimidos
import { dogPart, dogShape, dogFur, dogGear, dogDress } from './dogDetail.js';
import { FILL_DECL, useFill } from '../engine/charLight.js';

const URLS = {};
for (const [p, u] of Object.entries(import.meta.glob('../assets/animals/*.glb', { eager: true, query: '?url', import: 'default' }))) URLS[p.split('/').pop().replace('.glb', '')] = u;
const GLTF = {};

// especie del juego → modelo, altura total (m) y colores de cada material del modelo
const SPEC = {
  cow: { model: 'Cow', h: 1.55, col: { Main: '#c48a4c', Main_Light: '#ead2a4', Muzzle: '#e8cfae', Horns: '#e6dcc2' } },          // vaca pirenaica
  bull: { model: 'Bull', h: 1.7, col: { Main: '#1b1715', Main_Light: '#2d2622', Muzzle: '#231d1a', Horns: '#ece0c4' } },          // toro bravo
  cabestro: { model: 'Cow', h: 1.7, col: { Main: '#7a4a2a', Main_Light: '#f0e6d4', Muzzle: '#d8c2a2' } },                          // buey manso
  pottoka: { model: 'Horse', h: 1.4, col: { Main: '#3b2418', Main_Dark: '#2a1810', Main_Light: '#5a3b28', Hair: '#140e0b', Muzzle: '#22160f' } },
  corzo: { model: 'Deer', h: 1.05 }, ciervo: { model: 'Stag', h: 2.1 }, zorro: { model: 'Fox', h: 0.55 },
  burro: { model: 'Donkey', h: 1.35 },
  // derivadas en Blender de los modelos de Quaternius (tools/blender/fauna/derivar.py)
  // oveja latxa: sin cuernos (las hembras del rebaño no los llevan) y con vellón de lana rizada
  sheep: { model: 'Sheep', h: 1.05, col: { Main: '#ece4d2', Main_Light: '#f2ebdc', Main_Dark: '#1f1915', Muzzle: '#1f1915', Hooves: '#1a1512' }, drop: ['MAT_ANI_Sheep_Cuernos'], wool: ['Main', 'Main_Light'] },
  goat: { model: 'Goat', h: 1.0, col: { Main: '#4a3a2e', Main_Light: '#8a6a4a', Main_Dark: '#2a1e18', Hooves: '#15100e' } },                                 // cabra pirenaica
  // cerdo y jabalí con cuerpo propio (tools/blender/fauna/cerdos.py): euskal txerria rosado con cabeza y grupa negras
  pig: { model: 'Pig', h: 0.85, col: { Main: '#efc4b4', Main_Light: '#f6d4c6', Main_Dark: '#2a2422', Muzzle: '#d9a094', Hooves: '#5e4a40' } },
  jabali: { model: 'Jabali', h: 0.95, col: { Main: '#5a4a3c', Main_Light: '#7f6e5b', Main_Dark: '#221c18', Muzzle: '#3b3431', Hooves: '#151210' } },
};
// perros: razas del compañero, a su altura real (hasta la punta de las orejas); el detalle de cada raza (capa, pelo,
// orejas y cola; van sin collar) está en dogDetail.js
const DOG = {
  gorbeia: { model: 'ShibaInu', h: 0.7, col: { Main: '#b8692e', Main_Light: '#dca06a' }, dog: { paint: 'gorbeia', tail: -1.6, tailUncurl: -0.4, hair: 0.0007 } },
  iletsua: { model: 'ShibaInu', h: 0.72, col: { Main: '#a9845a', Main_Light: '#d6bf96', Black: '#2a201a' }, dog: { paint: 'iletsua', tail: -1.6, tailUncurl: -0.4, hair: 0.001, long: true } },
  aleman: { model: 'Husky', h: 0.84, col: {}, dog: { paint: 'aleman', tail: -1.8, tailUncurl: -0.14, hair: 0.0008 } },
  mastin: { model: 'Husky', h: 1.0, col: {}, dog: { paint: 'mastin', tail: -1.6, tailUncurl: -0.05, ears: 'drop', bulk: true, hair: 0.001, long: true } },
};
export function animalSpec(kind, opts = {}) { return kind === 'dog' ? DOG[opts.breed] || DOG.gorbeia : SPEC[kind] || null; }
export const hasGlbAnimal = (kind, opts) => { const s = animalSpec(kind, opts); return !!(s && GLTF[s.model]); };

/** Carga todos los modelos (una vez); se llama durante la pantalla de carga del pueblo. */
// Cada modelo se descarga una vez y solo cuando hace falta (en la versión web, un archivo por animal): así un pueblo
// baja los animales que tiene y no los diecisiete.
const LOADS = {}; let LOADER = null;
function loadModel(name) {
  if (LOADS[name]) return LOADS[name];
  if (!URLS[name]) return Promise.resolve();
  if (!LOADER) { LOADER = new GLTFLoader(); LOADER.setMeshoptDecoder(MeshoptDecoder); }
  return (LOADS[name] = LOADER.loadAsync(URLS[name]).then(g => { GLTF[name] = g; }).catch(e => console.warn('animal', name, e)));
}
/** Descarga todos los modelos (o los de la lista de especies). */
export function preloadAnimals(kinds) {
  return Promise.all(kinds ? kinds.map(k => ensureAnimal(k)) : Object.keys(URLS).map(loadModel));
}
/** Descarga el modelo de una especie (o raza de perro); se resuelve cuando ya se puede construir. */
export function ensureAnimal(kind, opts) { const s = animalSpec(kind, opts); return s ? loadModel(s.model) : Promise.resolve(); }
/** Espera a que terminen las descargas pedidas hasta ahora (la pantalla de carga no se quita antes). */
export function animalsSettled() { return Promise.all(Object.values(LOADS)); }
/** ¿Está la especie pendiente de descarga (tiene modelo pero aún no ha llegado)? */
export const animalPending = (kind, opts) => { const s = animalSpec(kind, opts); return !!(s && URLS[s.model] && !GLTF[s.model]); };

// Una sola malla por animal: los trozos de cada material (cuerpo, hocico, cuernos, pezuñas, ojos…) se funden en
// una geometría con el color de la raza en cada vértice, y las normales se suavizan (sin facetas) salvo en las
// aristas vivas. Así cada animal cuesta una llamada de dibujo en vez de seis, y se ve más orgánico.
const BAKED = new Map(), GEAR = new Map();
function bakedScene(key, S, g) {
  if (BAKED.has(key)) return BAKED.get(key);
  const sc = SkeletonUtils.clone(g.scene), skinned = [];
  sc.traverse(o => { if (o.isSkinnedMesh) skinned.push(o); });
  // solo si todos los trozos comparten esqueleto y matriz de enlace (si no, se deja tal cual)
  // (al clonar, cada trozo recibe su propio objeto esqueleto con los mismos huesos: se comparan los huesos)
  const sameBones = (m) => m.skeleton === skinned[0].skeleton || (m.skeleton.bones.length === skinned[0].skeleton.bones.length && m.skeleton.bones.every((b, i) => b === skinned[0].skeleton.bones[i]));
  if (skinned.length < 2 || skinned.some(m => !sameBones(m) || !m.bindMatrix.equals(skinned[0].bindMatrix) || m.parent !== skinned[0].parent || !m.geometry.attributes.skinIndex)) { BAKED.set(key, sc); return sc; }
  const c = new THREE.Color(), geos = [];
  for (const m of skinned) {
    if (S.drop?.includes(m.material.name)) continue;   // piezas que no van (los cuernos de la oveja)
    const src = m.geometry, n = src.attributes.position.count, out = new THREE.BufferGeometry();
    const f32 = (name, k) => { const a = src.attributes[name], arr = new Float32Array(n * k); for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) arr[i * k + j] = a.getComponent(i, j); return new THREE.BufferAttribute(arr, k); };
    out.setAttribute('position', f32('position', 3));
    const si = src.attributes.skinIndex, sia = new Uint16Array(n * 4); for (let i = 0; i < n; i++) for (let j = 0; j < 4; j++) sia[i * 4 + j] = si.getComponent(i, j);
    out.setAttribute('skinIndex', new THREE.BufferAttribute(sia, 4)); out.setAttribute('skinWeight', f32('skinWeight', 4));
    const hex = S.col?.[m.material.name]; c.copy(hex ? new THREE.Color(hex) : m.material.color);
    // si el modelo trae color por vértice (manchas pintadas en Blender, p. ej. el euskal txerria), lo multiplica
    const vc = src.attributes.color, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const k = vc ? [vc.getX(i), vc.getY(i), vc.getZ(i)] : [1, 1, 1]; col[i * 3] = c.r * k[0]; col[i * 3 + 1] = c.g * k[1]; col[i * 3 + 2] = c.b * k[2]; }
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (S.wool) out.setAttribute('wool', new THREE.BufferAttribute(new Float32Array(n).fill(S.wool.includes(m.material.name) ? 1 : 0), 1));
    if (S.dog) out.setAttribute('part', new THREE.BufferAttribute(new Float32Array(n).fill(dogPart(m.material.name)), 1));
    if (src.index) out.setIndex(Array.from(src.index.array));
    geos.push(out);
  }
  let merged = mergeGeometries(geos);
  const s0 = skinned[0];
  merged = S.dog ? dogShape(merged, S, s0.skeleton, s0.bindMatrix) : toCreasedNormals(merged, THREE.MathUtils.degToRad(65));
  const mesh = new THREE.SkinnedMesh(merged, S.dog ? dogFur(merged, S) : S.wool ? woolMaterial(merged) : hideMaterial(merged, S));
  if (S.dog) GEAR.set(key, dogGear(merged, S, s0.skeleton, s0.bindMatrix));
  mesh.name = 'body'; mesh.position.copy(s0.position); mesh.quaternion.copy(s0.quaternion); mesh.scale.copy(s0.scale);
  s0.parent.add(mesh); mesh.bind(s0.skeleton, s0.bindMatrix);
  for (const m of skinned) m.removeFromParent();
  BAKED.set(key, sc); return sc;
}

// Lana: el modelo no tiene coordenadas de textura, así que el vellón se dibuja en el sombreador con ruido celular en
// 3D sobre la posición del modelo (antes de la piel, así los rizos van pegados al cuerpo al moverse): rizos redondos
// algo más claros que los huecos entre ellos y un brillo suave en los bordes. Solo donde el atributo wool vale 1.
// Con «cut» (el minijuego de esquilar), además: una lista de cortes (posición y radio en el espacio del modelo) y un
// atributo «shorn» por vértice; donde se ha cortado, el vellón se hunde y asoma la piel con la lana muy corta.
export const MAXCUT = 96;
export function woolMaterial(geo, cut = null) {
  geo.computeBoundingBox(); const size = geo.boundingBox.getSize(new THREE.Vector3()), f = (34 / Math.max(size.x, size.y, size.z)).toFixed(3);
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  m.onBeforeCompile = (sh) => {
    if (cut) Object.assign(sh.uniforms, cut.uniforms);
    useFill(sh);
    const cutDecl = cut ? `\nuniform vec4 uCut[${MAXCUT}]; uniform int uNCut; uniform float uThick; attribute float shorn; attribute vec3 smoothN; varying float vCut; varying vec3 vBP;
float cutAt(vec3 p){ float k = 0.0; for (int i = 0; i < ${MAXCUT}; i++) { if (i >= uNCut) break; vec4 c = uCut[i]; k = max(k, 1.0 - smoothstep(c.w * 0.62, c.w, distance(p, c.xyz))); } return k; }` : '';
    const cutVert = cut ? `\nvBP = position; vCut = max(shorn, cutAt(position)) * wool; transformed -= normalize(smoothN) * uThick * vCut;` : '';
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float wool; varying float vWool; varying vec3 vWP;' + cutDecl)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvWool = wool; vWP = position * ${f};` + cutVert);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>${FILL_DECL}
varying float vWool; varying vec3 vWP;${cut ? `\nuniform vec4 uCut[${MAXCUT}]; uniform int uNCut; uniform vec3 uSkin; varying float vCut; varying vec3 vBP;
float cutAt(vec3 p){ float k = 0.0; for (int i = 0; i < ${MAXCUT}; i++) { if (i >= uNCut) break; vec4 c = uCut[i]; k = max(k, 1.0 - smoothstep(c.w * 0.62, c.w, distance(p, c.xyz))); } return k; }` : ''}
vec3 h3(vec3 p){ p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6))); return fract(sin(p) * 43758.5453); }
float cell(vec3 p){ vec3 i = floor(p), fr = fract(p); float d = 8.0;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) { vec3 o = vec3(float(x), float(y), float(z)); vec3 r = o + h3(i + o) - fr; d = min(d, dot(r, r)); }
  return sqrt(d); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  float wc = cell(vWP), wc2 = cell(vWP * 2.3 + 7.1), wv = clamp(1.0 - wc * 1.15, 0.0, 1.0) * 0.7 + clamp(1.0 - wc2 * 1.2, 0.0, 1.0) * 0.3;
  float crev = smoothstep(0.5, 0.95, wc) * 0.55 + smoothstep(0.55, 0.95, wc2) * 0.45;   // huecos entre rizos
  diffuseColor.rgb *= mix(1.0, (0.9 + 0.14 * wv) * (1.0 - 0.3 * crev), vWool);${cut ? `
  // esquilado: la piel rosada con la lana rapada (un punteado corto), con el borde del corte más blanco
  float sc = max(vCut, cutAt(vBP) * vWool), stub = cell(vWP * 4.0);
  vec3 shornCol = mix(uSkin, vec3(0.9, 0.85, 0.74), 0.2 + 0.3 * smoothstep(0.2, 0.7, stub));
  diffuseColor.rgb = mix(diffuseColor.rgb, shornCol, smoothstep(0.3, 0.75, sc));
  diffuseColor.rgb *= 1.0 - 0.25 * smoothstep(0.25, 0.45, sc) * (1.0 - smoothstep(0.45, 0.75, sc));   // el borde del corte, en sombra` : ''}`)
      // vellón mullido: un poco de su propio color en los bordes (de lado la lana parece más esponjosa y clara)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  totalEmissiveRadiance += uCharFill * vWool * ${cut ? '(1.0 - vCut) *' : ''} diffuseColor.rgb * 0.22 * pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.0);`);
  };
  m.customProgramCacheKey = () => 'lana' + f + (cut ? '-corte' : '');
  return m;
}

// Capa de los animales (vacas, caballos, ciervos, zorros, jabalíes, cerdos…): el modelo no tiene textura, así que el
// pelaje se dibuja en el sombreador sobre la posición del modelo (va pegado al cuerpo al moverse):
//  · manchas amplias más claras y más oscuras (ninguna capa es de un color liso) · el vientre algo más claro y las patas
//    más oscuras y con barro · pelo fino en la dirección del cuerpo, con un poco de relieve, que se funde de lejos
//  · un brillo suave en el contorno (el pelo recoge la luz de lado)
// k.hair: fuerza del pelo (el cerdo casi no tiene; el jabalí, cerdas), k.belly: aclarado del vientre
const COAT = { pig: { hair: 0.25, belly: 0.06, patch: 0.5 }, jabali: { hair: 1.4, belly: 0.04 }, pottoka: { hair: 0.8, belly: 0.1 }, bull: { hair: 0.7, belly: 0.03 },
  zorro: { hair: 1.1, belly: 0.3 }, corzo: { hair: 0.9, belly: 0.3, rump: 1, rumpY: [0.48, 0.74] }, ciervo: { hair: 1.0, belly: 0.22, rump: 0.6, rumpY: [0.36, 0.56] } };
// rump: el escudo claro de la grupa (blanco en el corzo, que lo enseña al huir; crema en el ciervo), en la parte de
// atrás del cuerpo (los modelos miran hacia +z) entre las alturas rumpY (fracción de la altura del modelo)
const HIDES = new Map();
function hideMaterial(geo, S) {
  const key = S.model + '|' + JSON.stringify(S.col || {}); if (HIDES.has(key)) return HIDES.get(key);
  geo.computeBoundingBox();
  const bb = geo.boundingBox, size = bb.getSize(new THREE.Vector3()), f = 1 / size.y;
  const along = size.x > size.z ? 'x' : 'z', kind = Object.keys(SPEC).find(k => SPEC[k] === S), K = { hair: 0.8, belly: 0.14, patch: 1, rump: 0, rumpY: [0, 0], ...(COAT[kind] || {}) };
  // las medidas y la capa de cada especie van en uniformes: todas las especies comparten un solo programa de sombreado
  // (antes cada una compilaba el suyo: más espera al cargar el pueblo)
  const U = {
    uCoatA: { value: new THREE.Vector4(f, bb.min.y, bb.min[along], 1 / size[along]) },
    uCoatK: { value: new THREE.Vector4(K.hair, K.belly, K.patch, K.rump) },
    uCoatR: { value: new THREE.Vector2(K.rumpY[0], K.rumpY[1]) },
    uCoatAx: { value: new THREE.Vector3(along === 'x' ? 1 : 0, 0, along === 'x' ? 0 : 1) },
  };
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  m.onBeforeCompile = (sh) => {
    useFill(sh); Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform vec4 uCoatA; uniform vec3 uCoatAx;\nvarying vec3 vOP; varying float vOY; varying float vBelly; varying float vAl; varying float vAN;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvOP = position * uCoatA.x; vOY = (position.y - uCoatA.y) * uCoatA.x; vBelly = -objectNormal.y; vAl = (dot(position, uCoatAx) - uCoatA.z) * uCoatA.w; vAN = dot(objectNormal, uCoatAx);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>${FILL_DECL}
uniform vec4 uCoatK; uniform vec2 uCoatR; uniform vec3 uCoatAx;
varying vec3 vOP; varying float vOY; varying float vBelly; varying float vAl; varying float vAN;
float hh(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hh(i), hh(i + vec3(1,0,0)), f.x), mix(hh(i + vec3(0,1,0)), hh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hh(i + vec3(0,0,1)), hh(i + vec3(1,0,1)), f.x), mix(hh(i + vec3(0,1,1)), hh(i + vec3(1,1,1)), f.x), f.y), f.z); }
vec3 fbump(vec3 sp, vec3 n, float h, float k) {
  vec3 sx = dFdx(sp), sy = dFdy(sp), r1 = cross(sy, n), r2 = cross(n, sx);
  float det = dot(sx, r1); vec3 grad = sign(det) * (dFdx(h) * k * r1 + dFdy(h) * k * r2);
  return normalize(abs(det) * n - grad);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  float coatP = vn(vOP * 3.0) * 0.65 + vn(vOP * 7.5 + 3.1) * 0.35;
  diffuseColor.rgb *= 1.0 + (coatP - 0.5) * 0.24 * uCoatK.z;
  diffuseColor.rgb = mix(diffuseColor.rgb, min(diffuseColor.rgb * 1.35 + 0.06, vec3(1.0)), smoothstep(0.2, 0.7, vBelly) * uCoatK.y * 2.0);
  float legs = 1.0 - smoothstep(0.08, 0.32, vOY);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.62, 0.56, 0.5), legs * 0.55);
  if (uCoatK.w > 0.0) {
    float rump = (1.0 - smoothstep(0.07, 0.17, vAl + (coatP - 0.5) * 0.04)) * smoothstep(uCoatR.x, uCoatR.x + 0.07, vOY) * (1.0 - smoothstep(uCoatR.y - 0.07, uCoatR.y, vOY)) * smoothstep(0.05, -0.45, vAN);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.94, 0.91, 0.85), rump * uCoatK.w);
  }
  // pelo: rayas finas a lo largo del cuerpo (ruido estirado), fundidas cuando son más finas que un píxel
  vec3 hp = vOP * mix(vec3(160.0), vec3(22.0), uCoatAx);
  float faa = 1.0 - smoothstep(0.25, 1.0, length(fwidth(hp)) * 0.5);
  float hs = mix(0.5, vn(hp) * 0.7 + vn(hp * 2.1 + 5.0) * 0.3, faa);
  diffuseColor.rgb *= 1.0 + (hs - 0.5) * 0.3 * uCoatK.x;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  normal = fbump(-vViewPosition, normal, hs, 0.0012 * uCoatK.x * faa);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  totalEmissiveRadiance += uCharFill * diffuseColor.rgb * 0.12 * min(1.0, uCoatK.x) * pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.5);`);
  };
  m.customProgramCacheKey = () => 'capa2';
  HIDES.set(key, m); return m;
}

const MATS = new Map();
/** Un animal listo para la escena: { root, mixer, actions, height, play(nombre), update(dt, estado) }. */
export function buildAnimal(kind, opts = {}) {
  const S = animalSpec(kind, opts), g = S && GLTF[S.model];
  if (!g) return null;
  // colores de la raza (materiales compartidos por especie y raza)
  const key = kind + '|' + (opts.breed || '');
  const inner = SkeletonUtils.clone(bakedScene(key, S, g));
  inner.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const out = mats.map(m => {
      const c = S.col?.[m.name]; if (!c) return m;
      const k = key + '|' + m.name; if (!MATS.has(k)) { const n = m.clone(); n.color.set(c); MATS.set(k, n); }
      return MATS.get(k);
    });
    o.material = Array.isArray(o.material) ? out : out[0];
  });
  // a su altura real, con los pies en el suelo
  const box = new THREE.Box3().setFromObject(inner), h = box.max.y - box.min.y || 1;
  inner.scale.setScalar(S.h / h); inner.position.y = -box.min.y * (S.h / h);
  // perros: orejas caídas y postura de la raza
  const pose = S.dog ? dogDress(inner, S, GEAR.get(key), opts) : null;
  const root = new THREE.Group(); root.add(inner);
  const mixer = new THREE.AnimationMixer(inner), actions = {};
  for (const c of g.animations) actions[c.name] = mixer.clipAction(c);
  let cur = null, acc = 0;
  // cada animal a su ritmo y empezando en un punto distinto al pastar o estar quieto (si no, el rebaño entero bajaba
  // la cabeza a la vez)
  const rate = 0.85 + Math.random() * 0.3, calm = /^(Idle|Idle_2|Idle_Headlow|Eating|Sit)$/;
  const A = {
    root, mixer, actions, height: S.h, rate,
    play(name, fade = 0.3) {
      const a = actions[name] || actions.Idle; if (!a || a === cur) return a;
      a.reset().setEffectiveWeight(1).play(); if (calm.test(a.getClip().name)) a.time = Math.random() * a.getClip().duration;
      if (cur) cur.crossFadeTo(a, fade, false); cur = a; return a;
    },
    // speed (m/s), graze (pastando), alert (mira algo); las zancadas siguen a la velocidad real
    update(dt, s) {
      const sp = s.speed || 0, H = S.h;
      let a;
      if (s.attack && actions.Attack_Headbutt) { a = A.play('Attack_Headbutt', 0.12); a.timeScale = 1.5; }   // amago de embestida (toros)
      else if (s.sit) { a = A.play(actions.Sit ? 'Sit' : 'Idle'); a.timeScale = rate; }
      else if (sp > H * 1.9 + 0.8) { a = A.play('Gallop'); a.timeScale = Math.max(0.6, sp / (H * 3.4 + 1.2)); }
      else if (sp > 0.15) { a = A.play('Walk'); a.timeScale = Math.max(0.5, sp / (H * 0.9 + 0.25)); }
      else if (s.graze) { a = A.play(actions.Eating ? 'Eating' : 'Idle_Headlow'); a.timeScale = rate; }
      else { a = A.play(s.alt && actions.Idle_2 ? 'Idle_2' : 'Idle'); a.timeScale = rate; }
      // lejos se anima a saltos (cada 0,05–0,12 s): ahorra CPU sin que se note
      acc += dt; if (acc >= (s.lod || 0)) { pose?.before(); mixer.update(acc); pose?.after(acc, s); acc = 0; }
    },
  };
  A.play('Idle', 0);
  return A;
}
