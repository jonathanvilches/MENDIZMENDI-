// Vecinos nítidos de cerca. Por la calle, los vecinos de Meshy llevan su versión ligera, con la textura a 512 px: con
// muchos vecinos en el pueblo, así caben en la memoria del móvil. A los que están a pocos metros del jugador o hablando
// con él se les pone la textura de cerca, a 1024 px (tools/vecinos-cerca.mjs), y se les quita al alejarse. Como todos los
// vecinos del mismo modelo comparten material, el cambio vale para todos los de ese modelo; como mucho tres modelos a la
// vez (dos en el móvil): unos 5,6 MB de memoria gráfica cada uno.
import * as THREE from 'three';
import { QUALITY } from '../util/quality.js';

const URLS = Object.fromEntries(Object.entries(import.meta.glob('../assets/meshy/cerca/*.webp', { query: '?url', import: 'default', eager: true }))
  .map(([k, v]) => [k.split('/').pop().replace('.webp', ''), v]));
const MAX = QUALITY === 'low' ? 2 : 3, CERCA = 9, LEJOS = 13;
const puestas = new Map(), pedidas = new Set(), loader = new THREE.TextureLoader();
let escena = null;   // (name) → la escena del modelo ligero cargado (actors/npcGlb.js)

/** La forma de encontrar el modelo ligero de cada vecino (npcGlb.js). */
export function fuenteCerca(fn) { escena = fn; }

function pon(name, tex) {
  const sc = escena?.(name); if (!sc) { tex.dispose(); return; }
  const mats = [];
  sc.traverse(o => { if (!o.isMesh) return; for (const m of [].concat(o.material)) { if (!m?.map || mats.some(x => x.m === m)) continue;
    const old = m.map;
    tex.flipY = old.flipY; tex.colorSpace = old.colorSpace; tex.wrapS = old.wrapS; tex.wrapT = old.wrapT; tex.channel = old.channel; tex.anisotropy = 8;
    mats.push({ m, map: old, emi: m.emissiveMap }); m.map = tex; if (m.emissiveMap === old) m.emissiveMap = tex; } });
  tex.needsUpdate = true;
  puestas.set(name, { tex, mats });
}
function quita(name) {
  const p = puestas.get(name); if (!p) return;
  for (const { m, map, emi } of p.mats) { m.map = map; m.emissiveMap = emi; }
  p.tex.dispose(); puestas.delete(name);
}
/** Cada medio segundo: los modelos de los vecinos más cercanos llevan su textura de cerca; los demás, la ligera. */
export function cercaVecinos(actores, P) {
  if (!escena) return;
  const d = new Map();
  for (const a of actores) { const n = a?.obj?.userData?.vecino; if (!n || !URLS[n] || a.obj.visible === false) continue;
    const r = Math.hypot(a.pos.x - P.x, a.pos.z - P.z); if (r < (d.get(n) ?? Infinity)) d.set(n, r); }
  const quiero = [...d].filter(([n, r]) => r < (puestas.has(n) ? LEJOS : CERCA)).sort((a, b) => a[1] - b[1]).slice(0, MAX).map(([n]) => n);
  for (const n of [...puestas.keys()]) if (!quiero.includes(n)) quita(n);
  for (const n of quiero) {
    if (puestas.has(n) || pedidas.has(n)) continue;
    pedidas.add(n);
    loader.load(URLS[n], (t) => { pedidas.delete(n); if (puestas.has(n)) { t.dispose(); return; } pon(n, t); }, undefined, () => pedidas.delete(n));
  }
}
/** Al salir del pueblo: todos con su textura ligera otra vez (los modelos se quedan cargados para el siguiente). */
export function sueltaCerca() { for (const n of [...puestas.keys()]) quita(n); pedidas.clear(); }
