// Vecinos nítidos de cerca. Por la calle, los vecinos de Meshy llevan su versión ligera, con la textura a 512 px: con
// muchos vecinos en el pueblo, así caben en la memoria del móvil. A los que están a pocos metros del jugador o hablando
// con él se les pone la textura de cerca, a 1024 px (tools/vecinos-cerca.mjs), y se les quita al alejarse. Como todos los
// vecinos del mismo modelo comparten material, el cambio vale para todos los de ese modelo; como mucho tres modelos a la
// vez (uno en el móvil): unos 5,6 MB de memoria gráfica cada uno.
import * as THREE from 'three';
import { QUALITY } from '../util/quality.js';

const URLS = Object.fromEntries(Object.entries(import.meta.glob('../assets/meshy/cerca/*.webp', { query: '?url', import: 'default', eager: true }))
  .map(([k, v]) => [k.split('/').pop().replace('.webp', ''), v]));
// (en el móvil, uno: el del vecino más cercano o con el que hablas. Se mira cada vez: la calidad se decide al arrancar,
// después de cargar este módulo)
const MAX = () => QUALITY === 'low' ? 1 : 3, CERCA = 9, LEJOS = 13;
const puestas = new Map(), pedidas = new Set(), loader = new THREE.TextureLoader();
let mats = null;   // (name) → los materiales de ese modelo: los compartidos y los propios de los que llevan el pelo teñido (npcGlb.js)

/** La forma de encontrar los materiales de cada modelo de vecino (npcGlb.js). */
export function fuenteCerca(fn) { mats = fn; }

function pon(name, tex) {
  const lista = mats?.(name) || [], m0 = lista.find(m => m?.map);
  if (!m0) { tex.dispose(); return; }
  const lod = m0.map;
  tex.flipY = lod.flipY; tex.colorSpace = lod.colorSpace; tex.wrapS = lod.wrapS; tex.wrapT = lod.wrapT; tex.channel = lod.channel; tex.anisotropy = 8; tex.needsUpdate = true;
  for (const m of lista) { if (m?.map !== lod) continue; m.map = tex; if (m.emissiveMap === lod) m.emissiveMap = tex; }
  puestas.set(name, { tex, lod });
}
function quita(name) {
  const p = puestas.get(name); if (!p) return;
  for (const m of mats?.(name) || []) { if (m.map === p.tex) m.map = p.lod; if (m.emissiveMap === p.tex) m.emissiveMap = p.lod; }
  p.tex.dispose(); puestas.delete(name);
}
/** Cada medio segundo: los modelos de los vecinos más cercanos llevan su textura de cerca; los demás, la ligera. */
export function cercaVecinos(actores, P) {
  if (!mats) return;
  const d = new Map();
  for (const a of actores) { const n = a?.obj?.userData?.vecino; if (!n || !URLS[n] || a.obj.visible === false) continue;
    const r = Math.hypot(a.pos.x - P.x, a.pos.z - P.z); if (r < (d.get(n) ?? Infinity)) d.set(n, r); }
  const quiero = [...d].filter(([n, r]) => r < (puestas.has(n) ? LEJOS : CERCA)).sort((a, b) => a[1] - b[1]).slice(0, MAX()).map(([n]) => n);
  for (const n of [...puestas.keys()]) if (!quiero.includes(n)) quita(n);
  for (const n of quiero) {
    if (puestas.has(n) || pedidas.has(n)) continue;
    pedidas.add(n);
    loader.load(URLS[n], (t) => { pedidas.delete(n); if (puestas.has(n)) { t.dispose(); return; } pon(n, t); }, undefined, () => pedidas.delete(n));
  }
}
/** Al salir del pueblo: todos con su textura ligera otra vez (los modelos se quedan cargados para el siguiente). */
export function sueltaCerca() { for (const n of [...puestas.keys()]) quita(n); pedidas.clear(); }
/** (para las pruebas: los modelos que llevan ahora la textura de cerca y los que se están cargando) */
export const estadoCerca = () => ({ puestas: [...puestas.keys()], pedidas: [...pedidas] });
