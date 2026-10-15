// Retratos de los personajes (busto o cuerpo entero, renderizados en 3D con los personajes nuevos de npcGlb.js: el mismo
// traje que llevan en el juego) para diálogos y fichas. Los avatares traen el suyo ya hecho (tools/retratos.mjs).
import * as THREE from 'three';
import { offscreen, offscreenCanvas } from '../util/offscreen.js';
import { getImg, putImg, enqueue } from '../util/store.js';
import { GLB_AVATARS } from '../actors/glbChar.js';
import { buildNpc, npcsReady, preloadNpcs } from '../actors/npcGlb.js';

let R = null, scene, cam;
function setup() {
  R = offscreen(512, 512);   // (a 512: a 256, en el móvil de densidad 3 los retratos de los diálogos salían borrosos)
  if (scene) return;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#6a5a4a', 1.6));
  const key = new THREE.DirectionalLight('#fff2dc', 2.2); key.position.set(1.5, 2.5, 3); scene.add(key);
  const rim = new THREE.DirectionalLight('#9fd0ff', 1.2); rim.position.set(-2, 1.5, -2); scene.add(rim);
  cam = new THREE.PerspectiveCamera(26, 1, 0.1, 20);
}
// look: aspecto nuevo (minifig) o antiguo; mode: 'bust' (cabeza y hombros) | 'full' (cuerpo entero; 'hero', el grande del
// perfil, solo lo traen hecho los personajes GLB en la web: si no, es como 'full')
// retrato con el cuerpo de los personajes nuevos (el mismo traje que lleva en el juego)
function portraitKK(look, mode) {
  const n = buildNpc(look), obj = n.obj;
  n.char.root.rotation.y = 0.3; n.char.update?.(0.05);
  scene.add(obj); obj.updateMatrixWorld(true);
  const box = new THREE.Box3(), t = new THREE.Box3();
  obj.traverse(o => { if (!o.isMesh || !o.visible) return; if (o.isSkinnedMesh) { o.skeleton.update(); o.computeBoundingBox(); t.copy(o.boundingBox); } else { o.geometry.computeBoundingBox(); t.copy(o.geometry.boundingBox); } box.union(t.applyMatrix4(o.matrixWorld)); });
  const H = box.max.y - box.min.y;
  if (mode === 'bust') { const cy = box.max.y - H * 0.29, d = H * 1.4; cam.position.set(d * 0.08, cy + d * 0.03, d); cam.lookAt(0, cy, 0); }
  else { const midY = (box.max.y + box.min.y) / 2; cam.position.set(0.9 * H / 1.6, midY + 0.2 * H / 1.6, 4.4 * H / 1.6); cam.lookAt(0, midY, 0); }
  R.setClearColor(0x000000, 0); R.render(scene, cam);
  const url = offscreenCanvas().toDataURL('image/png');
  scene.remove(obj);
  // (lo hecho solo para la foto se libera, como en las minifiguras: si no, cada retrato nuevo dejaba sus piezas y su
  // esqueleto en la memoria gráfica, y al ir de pueblo en pueblo se iban sumando)
  obj.traverse(o => { if (o.geometry) o.geometry.dispose(); }); n.char?.dispose?.();
  return url;
}
// (si los personajes nuevos aún no han cargado no hay retrato: portraitImg lo pide en cuanto estén; isMini se admite por
// compatibilidad, ya no hay figuras sencillas)
export function portrait(look, mode = 'bust', isMini = false) {
  if (!npcsReady()) return '';
  const key = 'm3|' + JSON.stringify(look) + mode + isMini;   // (m3: con los personajes nuevos y las texturas nuevas; los retratos guardados antes, algunos vacíos en el iPhone, no valen)
  if (cache.has(key)) return cache.get(key);
  const st = getImg('p:' + key); if (st) { cache.set(key, st); return st; }
  try {
    setup();   // el renderizador oculto puede haberse liberado: se pide cada vez
    const url = portraitKK(look, mode); cache.set(key, url); putImg('p:' + key, url); return url;
  } catch (e) { console.warn('retrato', e); return ''; }
}
// (una silueta en vez de un hueco si un retrato no se ha podido dibujar)
const FALLBACK = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="24" r="12" fill="#f1c7a5"/><path d="M12 60c0-13 9-20 20-20s20 7 20 20z" fill="#c8222a"/><path d="M20 22c0-9 6-14 12-14s12 5 12 14c-3-5-7-7-12-7s-9 2-12 7z" fill="#3b2418"/></svg>');
// los avatares GLB traen su retrato ya renderizado (tools/charportraits.mjs)
const glbPortrait = (id, mode) => GLB_AVATARS[id] && (mode === 'hero' ? GLB_AVATARS[id].hero || GLB_AVATARS[id].full : mode === 'full' ? GLB_AVATARS[id].full : GLB_AVATARS[id].bust);
export const avatarPortrait = (id, mode = 'bust') => glbPortrait(id, mode) || FALLBACK;

// <img> del retrato sin bloquear: si aún no está hecho, se dibuja en segundo plano y aparece luego
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
let PK = 0; const pkeys = new Map();
export function portraitImg(look, mode = 'bust', isMini = false) {
  const key = 'm3|' + JSON.stringify(look) + mode + isMini;   // (la misma clave que portrait)
  const hit = cache.get(key) || getImg('p:' + key);
  if (hit) return `<img src="${hit}" alt="">`;
  let id = pkeys.get(key); if (!id) { id = 'pk' + (++PK); pkeys.set(key, id); }
  // (en cuanto estén los personajes nuevos; si el retrato no se ha podido dibujar, una silueta en vez de un hueco)
  const draw = () => enqueue('p:' + key, () => { const u = portrait(look, mode, isMini) || FALLBACK; for (const i of document.querySelectorAll(`img[data-pk="${id}"]`)) { i.src = u; i.removeAttribute('data-pk'); } }, true);
  if (npcsReady()) draw(); else preloadNpcs().then(draw, draw);
  return `<img src="${BLANK}" data-pk="${id}" alt="">`;
}
export const avatarPortraitImg = (id, mode = 'bust') => `<img src="${glbPortrait(id, mode) || FALLBACK}" alt="">`;
