// Retratos de los personajes (busto de la minifigura renderizado en 3D) para diálogos y fichas
import * as THREE from 'three';
import { buildMinifig, lookToMinifig, COSTUMES } from '../actors/minifig.js';

let R = null, scene, cam;
const cache = new Map();
function setup() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  R.setPixelRatio(1); R.setSize(256, 256, false);
  R.toneMapping = THREE.ACESFilmicToneMapping; R.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#6a5a4a', 1.6));
  const key = new THREE.DirectionalLight('#fff2dc', 2.2); key.position.set(1.5, 2.5, 3); scene.add(key);
  const rim = new THREE.DirectionalLight('#9fd0ff', 1.2); rim.position.set(-2, 1.5, -2); scene.add(rim);
  cam = new THREE.PerspectiveCamera(26, 1, 0.1, 20);
}
// look: aspecto nuevo (minifig) o antiguo; mode: 'bust' (cabeza y hombros) | 'full'
export function portrait(look, mode = 'bust', isMini = false) {
  const key = JSON.stringify(look) + mode + isMini;
  if (cache.has(key)) return cache.get(key);
  try {
    if (!R) setup();
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
    const url = R.domElement.toDataURL('image/png');
    scene.remove(fig);
    fig.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    cache.set(key, url);
    return url;
  } catch (e) { console.warn('retrato', e); return ''; }
}
export const avatarPortrait = (id, mode = 'bust') => portrait(COSTUMES[id] || COSTUMES.leire, mode, true);
