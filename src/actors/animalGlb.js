// Animales con modelo y animaciones de Quaternius (CC0, «LowPoly Animals»), preparados con tools/animalpack.mjs.
// Cada especie del juego usa uno de esos modelos con los colores de la raza navarra (vaca pirenaica, pottoka,
// perros pastores…), a su tamaño real, y elige su animación según lo que hace: pastar, quieto, andar o galopar.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

const URLS = {};
for (const [p, u] of Object.entries(import.meta.glob('../assets/animals/*.glb', { eager: true, query: '?url', import: 'default' }))) URLS[p.split('/').pop().replace('.glb', '')] = u;
const GLTF = {};
let loading = null;

// especie del juego → modelo, altura total (m) y colores de cada material del modelo
const SPEC = {
  cow: { model: 'Cow', h: 1.55, col: { Main: '#c48a4c', Main_Light: '#ead2a4', Muzzle: '#e8cfae', Horns: '#e6dcc2' } },          // vaca pirenaica
  bull: { model: 'Bull', h: 1.7, col: { Main: '#1b1715', Main_Light: '#2d2622', Muzzle: '#231d1a', Horns: '#ece0c4' } },          // toro bravo
  cabestro: { model: 'Cow', h: 1.7, col: { Main: '#7a4a2a', Main_Light: '#f0e6d4', Muzzle: '#d8c2a2' } },                          // buey manso
  pottoka: { model: 'Horse', h: 1.4, col: { Main: '#3b2418', Main_Dark: '#2a1810', Main_Light: '#5a3b28', Hair: '#140e0b', Muzzle: '#22160f' } },
  corzo: { model: 'Deer', h: 1.05 }, ciervo: { model: 'Stag', h: 2.1 }, zorro: { model: 'Fox', h: 0.55 },
  burro: { model: 'Donkey', h: 1.35 },
  // derivadas en Blender de los modelos de Quaternius (tools/blender/fauna/derivar.py)
  sheep: { model: 'Sheep', h: 1.05 }, goat: { model: 'Goat', h: 1.0 }, pig: { model: 'Pig', h: 0.85 }, jabali: { model: 'Jabali', h: 0.9 },
};
// perros: razas del compañero
const DOG = {
  gorbeia: { model: 'ShibaInu', h: 0.62, col: { Main: '#b8692e', Main_Light: '#dca06a' } },
  iletsua: { model: 'ShibaInu', h: 0.64, col: { Main: '#a9845a', Main_Light: '#d6bf96', Black: '#5a4430' } },
  pachon: { model: 'ShibaInu', h: 0.62, col: { Main: '#7a4a2a', Main_Light: '#f0ebe2' } },
  aleman: { model: 'Husky', h: 0.74, col: { Material: '#b5793a', 'Material.001': '#dcae70', 'Material.006': '#1f1813' } },
  mastin: { model: 'Husky', h: 0.95, col: { Material: '#e8e2d6', 'Material.001': '#f6f2ea', 'Material.006': '#8a8478' } },
};
export function animalSpec(kind, opts = {}) { return kind === 'dog' ? DOG[opts.breed] || DOG.gorbeia : SPEC[kind] || null; }
export const hasGlbAnimal = (kind, opts) => { const s = animalSpec(kind, opts); return !!(s && GLTF[s.model]); };

/** Carga todos los modelos (una vez); se llama durante la pantalla de carga del pueblo. */
export function preloadAnimals() {
  if (loading) return loading;
  const L = new GLTFLoader();
  loading = Promise.all(Object.entries(URLS).map(([n, u]) => L.loadAsync(u).then(g => { GLTF[n] = g; }).catch(e => console.warn('animal', n, e))));
  return loading;
}

const MATS = new Map();
/** Un animal listo para la escena: { root, mixer, actions, height, play(nombre), update(dt, estado) }. */
export function buildAnimal(kind, opts = {}) {
  const S = animalSpec(kind, opts), g = S && GLTF[S.model];
  if (!g) return null;
  const inner = SkeletonUtils.clone(g.scene);
  // colores de la raza (materiales compartidos por especie y raza)
  const key = kind + '|' + (opts.breed || '');
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
  let cur = null;
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
      if (sp > H * 1.9 + 0.8) { a = A.play('Gallop'); a.timeScale = Math.max(0.6, sp / (H * 3.4 + 1.2)); }
      else if (sp > 0.15) { a = A.play('Walk'); a.timeScale = Math.max(0.5, sp / (H * 0.9 + 0.25)); }
      else if (s.graze) { a = A.play(actions.Eating ? 'Eating' : 'Idle_Headlow'); a.timeScale = 1; }
      else { a = A.play(s.alt && actions.Idle_2 ? 'Idle_2' : 'Idle'); a.timeScale = 1; }
      mixer.update(dt);
    },
  };
  A.play('Idle', 0);
  return A;
}
