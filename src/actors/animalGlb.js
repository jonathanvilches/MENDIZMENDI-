// Animales con modelo y animaciones de Quaternius (CC0, «LowPoly Animals»), preparados con tools/animalpack.mjs.
// Cada especie del juego usa uno de esos modelos con los colores de la raza navarra (vaca pirenaica, pottoka,
// perros pastores…), a su tamaño real, y elige su animación según lo que hace: pastar, quieto, andar o galopar.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';   // el pachón (modelo de Meshy) va comprimido

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
  sheep: { model: 'Sheep', h: 1.05, col: { Main: '#ece4d2', Main_Light: '#f2ebdc', Main_Dark: '#1f1915', Muzzle: '#1f1915', Hooves: '#1a1512' } },       // oveja latxa
  goat: { model: 'Goat', h: 1.0, col: { Main: '#4a3a2e', Main_Light: '#8a6a4a', Main_Dark: '#2a1e18', Hooves: '#15100e' } },                                 // cabra pirenaica
  pig: { model: 'Pig', h: 0.85, col: { Main: '#f0b4a2', Main_Light: '#f6c8b8', Muzzle: '#e89a8a', Hooves: '#7a5a4a' } },
  jabali: { model: 'Jabali', h: 0.9, col: { Main: '#3a2e26', Main_Light: '#4e4034', Muzzle: '#2a221e', Hooves: '#1a1512' } },
};
// perros: razas del compañero
const DOG = {
  gorbeia: { model: 'ShibaInu', h: 0.62, col: { Main: '#b8692e', Main_Light: '#dca06a' } },
  iletsua: { model: 'ShibaInu', h: 0.64, col: { Main: '#a9845a', Main_Light: '#d6bf96', Black: '#5a4430' } },
  aleman: { model: 'Husky', h: 0.74, col: { Material: '#b5793a', 'Material.001': '#dcae70', 'Material.006': '#1f1813' } },
  mastin: { model: 'Husky', h: 0.95, col: { Material: '#e8e2d6', 'Material.001': '#f6f2ea', 'Material.006': '#8a8478' } },
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
const BAKED = new Map();
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
    const src = m.geometry, n = src.attributes.position.count, out = new THREE.BufferGeometry();
    const f32 = (name, k) => { const a = src.attributes[name], arr = new Float32Array(n * k); for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) arr[i * k + j] = a.getComponent(i, j); return new THREE.BufferAttribute(arr, k); };
    out.setAttribute('position', f32('position', 3));
    const si = src.attributes.skinIndex, sia = new Uint16Array(n * 4); for (let i = 0; i < n; i++) for (let j = 0; j < 4; j++) sia[i * 4 + j] = si.getComponent(i, j);
    out.setAttribute('skinIndex', new THREE.BufferAttribute(sia, 4)); out.setAttribute('skinWeight', f32('skinWeight', 4));
    const hex = S.col?.[m.material.name]; c.copy(hex ? new THREE.Color(hex) : m.material.color);
    const col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (src.index) out.setIndex(Array.from(src.index.array));
    geos.push(out);
  }
  let merged = mergeGeometries(geos);
  merged = toCreasedNormals(merged, THREE.MathUtils.degToRad(65));
  const mesh = new THREE.SkinnedMesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 }));
  const s0 = skinned[0]; mesh.name = 'body'; mesh.position.copy(s0.position); mesh.quaternion.copy(s0.quaternion); mesh.scale.copy(s0.scale);
  s0.parent.add(mesh); mesh.bind(s0.skeleton, s0.bindMatrix);
  for (const m of skinned) m.removeFromParent();
  BAKED.set(key, sc); return sc;
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
  const root = new THREE.Group(); root.add(inner);
  const mixer = new THREE.AnimationMixer(inner), actions = {};
  for (const c of g.animations) actions[c.name] = mixer.clipAction(c);
  let cur = null, acc = 0;
  const A = {
    root, mixer, actions, height: S.h,
    play(name, fade = 0.3) {
      const a = actions[name] || actions.Idle; if (!a || a === cur) return a;
      a.reset().setEffectiveWeight(1).play(); if (cur) cur.crossFadeTo(a, fade, false); cur = a; return a;
    },
    // speed (m/s), graze (pastando), alert (mira algo); las zancadas siguen a la velocidad real
    update(dt, s) {
      const sp = s.speed || 0, H = S.h;
      let a;
      if (s.sit) { a = A.play(actions.Sit ? 'Sit' : 'Idle'); a.timeScale = 1; }
      else if (sp > H * 1.9 + 0.8) { a = A.play('Gallop'); a.timeScale = Math.max(0.6, sp / (H * 3.4 + 1.2)); }
      else if (sp > 0.15) { a = A.play('Walk'); a.timeScale = Math.max(0.5, sp / (H * 0.9 + 0.25)); }
      else if (s.graze) { a = A.play(actions.Eating ? 'Eating' : 'Idle_Headlow'); a.timeScale = 1; }
      else { a = A.play(s.alt && actions.Idle_2 ? 'Idle_2' : 'Idle'); a.timeScale = 1; }
      // lejos se anima a saltos (cada 0,05–0,12 s): ahorra CPU sin que se note
      acc += dt; if (acc >= (s.lod || 0)) { mixer.update(acc); acc = 0; }
    },
  };
  A.play('Idle', 0);
  return A;
}
