// Retratos de los personajes (busto de la minifigura renderizado en 3D) para diálogos y fichas
import * as THREE from 'three';
import { buildMinifig, lookToMinifig, COSTUMES } from '../actors/minifig.js';
import { offscreen, offscreenCanvas } from '../util/offscreen.js';
import { getImg, putImg, enqueue } from '../util/store.js';
import { GLB_AVATARS } from '../actors/glbChar.js';
import { buildNpc, npcsReady } from '../actors/npcGlb.js';

let R = null, scene, cam;
const cache = new Map();
function setup() {
  R = offscreen(256, 256);
  if (scene) return;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#6a5a4a', 1.6));
  const key = new THREE.DirectionalLight('#fff2dc', 2.2); key.position.set(1.5, 2.5, 3); scene.add(key);
  const rim = new THREE.DirectionalLight('#9fd0ff', 1.2); rim.position.set(-2, 1.5, -2); scene.add(rim);
  cam = new THREE.PerspectiveCamera(26, 1, 0.1, 20);
}
// look: aspecto nuevo (minifig) o antiguo; mode: 'bust' (cabeza y hombros) | 'full'
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
  return url;
}
export function portrait(look, mode = 'bust', isMini = false) {
  const kk = npcsReady();
  const key = (kk ? 'kk|' : '') + JSON.stringify(look) + mode + isMini;
  if (cache.has(key)) return cache.get(key);
  const st = getImg('p:' + key); if (st) { cache.set(key, st); return st; }
  try {
    setup();   // el renderizador oculto puede haberse liberado: se pide cada vez
    if (kk) { const url = portraitKK(look, mode); cache.set(key, url); putImg('p:' + key, url); return url; }
    const fig = buildMinifig(isMini ? look : lookToMinifig(look));
    const J = fig.userData.J;
    J.armL.rotation.z = -0.1; J.armR.rotation.z = 0.1;
    J.head.rotation.y = 0.25; J.torso.rotation.y = 0.12;
    scene.add(fig);
    fig.updateMatrixWorld(true);
    const H = fig.userData.H;
    const box = new THREE.Box3().setFromObject(fig);
    if (mode === 'bust') {
      const hp = new THREE.Vector3(); J.head.getWorldPosition(hp);
      const R = fig.userData.headR || 0.25, cy = hp.y + (fig.userData.headCy || R) - R * 0.15;
      const dist = R * 7.2 + (fig.userData.look?.hat ? R * 1.2 : 0);
      cam.position.set(R * 1.3, cy + R * 0.25, dist); cam.lookAt(0, cy + (fig.userData.look?.hat ? R * 0.35 : 0), 0);
    } else {
      const midY = (box.max.y + box.min.y) / 2;
      cam.position.set(0.9, midY + 0.3, 4.6 * Math.max(1, (box.max.y - box.min.y) / 1.9)); cam.lookAt(0, midY, 0);
    }
    R.setClearColor(0x000000, 0);
    R.render(scene, cam);
    const url = offscreenCanvas().toDataURL('image/png');
    scene.remove(fig);
    fig.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    cache.set(key, url); putImg('p:' + key, url);
    return url;
  } catch (e) { console.warn('retrato', e); return ''; }
}
// los avatares GLB traen su retrato ya renderizado (tools/charportraits.mjs)
const glbPortrait = (id, mode) => GLB_AVATARS[id] && (mode === 'full' ? GLB_AVATARS[id].full : GLB_AVATARS[id].bust);
export const avatarPortrait = (id, mode = 'bust') => glbPortrait(id, mode) || portrait(COSTUMES[id] || COSTUMES.leire, mode, true);

// <img> del retrato sin bloquear: si aún no está hecho, se dibuja en segundo plano y aparece luego
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
let PK = 0; const pkeys = new Map();
export function portraitImg(look, mode = 'bust', isMini = false) {
  const key = (npcsReady() ? 'kk|' : '') + JSON.stringify(look) + mode + isMini;
  const hit = cache.get(key) || getImg('p:' + key);
  if (hit) return `<img src="${hit}" alt="">`;
  let id = pkeys.get(key); if (!id) { id = 'pk' + (++PK); pkeys.set(key, id); }
  enqueue('p:' + key, () => { const u = portrait(look, mode, isMini); for (const i of document.querySelectorAll(`img[data-pk="${id}"]`)) { i.src = u; i.removeAttribute('data-pk'); } }, true);
  return `<img src="${BLANK}" data-pk="${id}" alt="">`;
}
export const avatarPortraitImg = (id, mode = 'bust') => { const g = glbPortrait(id, mode); return g ? `<img src="${g}" alt="">` : portraitImg(COSTUMES[id] || COSTUMES.leire, mode, true); };
