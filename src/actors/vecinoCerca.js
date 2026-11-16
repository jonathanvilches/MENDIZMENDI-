// Vecinos nítidos de cerca. Por la calle, los vecinos de Meshy llevan su versión ligera, con la textura a 512 px: con
// muchos vecinos en el pueblo, así caben en la memoria del móvil. A los que están a pocos metros del jugador o hablando
// con él se les pone la textura de cerca, a 1024 px (tools/vecinos-cerca.mjs), y se les quita al alejarse. Como todos los
// vecinos del mismo modelo comparten material, el cambio vale para todos los de ese modelo; como mucho tres modelos a la
// vez (uno en el móvil): unos 5,6 MB de memoria gráfica cada uno.
import * as THREE from 'three';
import { QUALITY } from '../util/quality.js';
import { loadMeshy, hayVecinoCompleto } from './glbChar.js';

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

// ---------- el que habla contigo, con todos sus triángulos ----------
// En la charla la cámara se acerca a su cara (camera.js charla), y con la versión ligera, un tercio de triángulos, se veía
// de mala calidad: «los personajes tienen muy mala calidad. Me he dado cuenta al ampliar la imagen la cámara en las
// conversaciones», 16 de noviembre de 2026. Mientras habla, su malla ligera se cambia por la completa del mismo modelo
// (src/assets/meshy/vecinos, solo en la web: se baja la primera vez que hablas con uno de ese modelo); su material, su
// textura de cerca y su pelo teñido no cambian. Solo si los huesos son los mismos y en el mismo orden; al acabar, la ligera.
const cambiadas = new Map();
export async function vecinoNitido(a, on) {
  const n = a?.obj?.userData?.vecino; if (!n) return;
  const turno = (a._nitido = (a._nitido || 0) + 1);
  if (!on) { const L = cambiadas.get(a); if (L) { for (const { mesh, geo } of L) mesh.geometry = geo; cambiadas.delete(a); } return; }
  if (cambiadas.has(a) || !hayVecinoCompleto(n)) return;
  let full; try { full = await loadMeshy(n, false, true); } catch (e) { return; }
  if (a._nitido !== turno) return;   // (la charla ya acabó o empezó otra)
  // (su textura no se usa: fuera de la memoria)
  full.scene.traverse(o => { if (!o.isMesh) return; for (const m of [].concat(o.material)) { if (m.map && !m.userData.suelta) { m.userData.suelta = true; m.map.dispose(); } } });
  const porNombre = {}; full.scene.traverse(o => { if (o.isSkinnedMesh) porNombre[o.name] = o; });
  const nuevas = new Map();
  a.obj.traverse(o => { if (!o.isSkinnedMesh || o.userData.outline) return; const f = porNombre[o.name]; if (!f) return;
    const bs = o.skeleton.bones, bf = f.skeleton.bones;
    if (bs.length !== bf.length || bs.some((b, i) => b.name !== bf[i].name)) return;
    nuevas.set(o.geometry, f.geometry); });
  if (!nuevas.size) return;
  const L = []; a.obj.traverse(o => { if (o.isSkinnedMesh && nuevas.has(o.geometry)) { L.push({ mesh: o, geo: o.geometry }); o.geometry = nuevas.get(o.geometry); } });
  cambiadas.set(a, L);
}
