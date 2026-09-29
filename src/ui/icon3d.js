// Iconos 3D: modelos del propio juego (animales, cosechas, productos, herramientas) renderizados
// en estilo dibujo animado con borde de pegatina, para que se lean nítidos a cualquier tamaño.
import * as THREE from 'three';
import { quadruped, SPECIES } from '../actors/animals.js';
import { makeItem } from '../game/items.js';
import { TOON_MAT, OUTLINE_MAT, setOutlines } from '../actors/minifig.js';

let R = null, scene, cam;
const cache = new Map();
const S = 256;
function setup() {
  const c = document.createElement('canvas'); c.width = c.height = S;
  R = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
  R.setPixelRatio(1); R.setSize(S, S, false); R.toneMapping = THREE.ACESFilmicToneMapping; R.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#6a5a4a', 1.2));
  const k = new THREE.DirectionalLight('#fff4e0', 2.0); k.position.set(2, 4, 3); scene.add(k);
  const rim = new THREE.DirectionalLight('#cfe8ff', 1.4); rim.position.set(-3, 2, -3); scene.add(rim);
  cam = new THREE.PerspectiveCamera(22, 1, 0.01, 100);
}
// ---- modelos a medida (productos y herramientas) ----
const mat = (c, o = {}) => new THREE.MeshToonMaterial({ color: c, ...o });
const M = (g, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, o) => { const m = new THREE.Mesh(g, mat(c, o)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m; };
const G = (...ch) => { const g = new THREE.Group(); ch.forEach(c => g.add(c)); return g; };
const CUSTOM = {
  cheese: () => { const w = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 32, 1, false, 0, Math.PI * 1.6); const g = G(M(w, '#f2c94c'), M(new THREE.CylinderGeometry(0.51, 0.51, 0.36, 32, 1, true, 0, Math.PI * 1.6), '#d9a53a')); for (let i = 0; i < 4; i++) g.add(M(new THREE.SphereGeometry(0.05, 10, 8), '#c8962e', Math.cos(i * 1.4) * 0.3, 0.17, Math.sin(i * 1.4) * 0.3)); g.rotation.x = 0.25; return g; },
  bread: () => { const g = G(M(new THREE.SphereGeometry(0.5, 24, 16), '#d9a05a', 0, 0, 0, 0, 0, 0)); g.children[0].scale.set(1.3, 0.55, 0.8); for (let i = -1; i <= 1; i++) { const c = M(new THREE.BoxGeometry(0.06, 0.05, 0.5), '#a86a2a', i * 0.3, 0.25, 0, 0, 0.6); g.add(c); } return g; },
  wine: () => G(M(new THREE.CylinderGeometry(0.18, 0.2, 0.7, 20), '#5a1a2a', 0, 0, 0), M(new THREE.CylinderGeometry(0.07, 0.16, 0.18, 16), '#5a1a2a', 0, 0.44, 0), M(new THREE.CylinderGeometry(0.065, 0.065, 0.2, 12), '#5a1a2a', 0, 0.62, 0), M(new THREE.CylinderGeometry(0.068, 0.068, 0.07, 12), '#c9a24a', 0, 0.72, 0), M(new THREE.CylinderGeometry(0.205, 0.205, 0.26, 20, 1, true), '#f2e6c4', 0, 0.02, 0)),
  honey: () => G(M(new THREE.CylinderGeometry(0.34, 0.3, 0.55, 24), '#f2a51a', 0, 0, 0, 0, 0, 0, { transparent: true, opacity: 0.95 }), M(new THREE.CylinderGeometry(0.36, 0.36, 0.12, 24), '#c9935a', 0, 0.33, 0), M(new THREE.CylinderGeometry(0.345, 0.345, 0.16, 24, 1, true), '#f7eed8', 0, 0, 0)),
  chistorra: () => { const g = new THREE.Group(); const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.6, -0.1, 0), new THREE.Vector3(-0.2, 0.25, 0.1), new THREE.Vector3(0.25, 0.05, -0.1), new THREE.Vector3(0.6, 0.3, 0)]); g.add(M(new THREE.TubeGeometry(curve, 30, 0.1, 12), '#b8402a')); return g; },
  basket: () => G(M(new THREE.CylinderGeometry(0.5, 0.36, 0.42, 20, 1, true), '#b08650', 0, 0, 0, 0, 0, 0, { side: THREE.DoubleSide }), M(new THREE.CircleGeometry(0.36, 20), '#8a6a3a', 0, -0.2, 0, -Math.PI / 2), M(new THREE.TorusGeometry(0.4, 0.035, 8, 24, Math.PI), '#8a6a3a', 0, 0.2, 0), M(new THREE.SphereGeometry(0.16, 12, 10), '#d9412a', -0.15, 0.15, 0.05), M(new THREE.SphereGeometry(0.15, 12, 10), '#6aa84f', 0.15, 0.14, -0.05)),
  axe: () => { const b = new THREE.Shape(); b.moveTo(0, -0.12); b.lineTo(0.38, -0.25); b.quadraticCurveTo(0.46, 0, 0.38, 0.25); b.lineTo(0, 0.12); b.closePath(); const g = G(M(new THREE.CylinderGeometry(0.05, 0.055, 1.3, 12), '#8a5a32', 0, 0, 0), M(new THREE.ExtrudeGeometry(b, { depth: 0.06, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015 }), '#c0c6cc', 0.02, 0.5, -0.03)); g.rotation.z = -0.6; return g; },
  hammer: () => { const g = G(M(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 12), '#8a5a32', 0, 0, 0), M(new THREE.BoxGeometry(0.22, 0.22, 0.5), '#5d6066', 0, 0.5, 0)); g.rotation.z = -0.6; return g; },
  anvil: () => { const g = new THREE.Group(); g.add(M(new THREE.BoxGeometry(0.9, 0.22, 0.34), '#4a4d52', 0, 0.3, 0)); g.add(M(new THREE.ConeGeometry(0.17, 0.4, 16), '#4a4d52', 0.62, 0.3, 0, 0, 0, -Math.PI / 2)); g.add(M(new THREE.BoxGeometry(0.3, 0.3, 0.26), '#3a3d42', 0, 0.05, 0)); g.add(M(new THREE.BoxGeometry(0.6, 0.14, 0.4), '#3a3d42', 0, -0.15, 0)); g.add(M(new THREE.BoxGeometry(0.4, 0.06, 0.1), '#ff7a2a', 0.05, 0.44, 0, 0, 0, 0, { emissive: new THREE.Color('#ff5a1a'), emissiveIntensity: 0.8 })); return g; },
  bell: () => { const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(0.18 + 0.28 * t * t, 0.5 - t)); } return G(M(new THREE.LatheGeometry(pts, 24), '#b8a060', 0, 0, 0, 0, 0, 0, { side: THREE.DoubleSide }), M(new THREE.SphereGeometry(0.1, 12, 10), '#6b5a3a', 0, -0.52, 0), M(new THREE.TorusGeometry(0.1, 0.03, 8, 16), '#6b4a2e', 0, 0.56, 0)); },
  espadrille: () => { const g = new THREE.Group(); const s = M(new THREE.CapsuleGeometry(0.2, 0.55, 6, 14), '#d9c79a', 0, 0, 0, Math.PI / 2); s.scale.set(1, 1, 0.35); g.add(s); const u = M(new THREE.SphereGeometry(0.22, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), '#f7f3ea', 0, 0.02, 0.18); u.scale.set(1, 0.9, 1.3); g.add(u); for (const s2 of [-1, 1]) g.add(M(new THREE.TorusGeometry(0.2, 0.02, 6, 16, Math.PI), '#d42f2f', 0, 0.12, -0.1 + s2 * 0.05, 0, Math.PI / 2 + s2 * 0.3, 0)); g.rotation.y = 0.5; return g; },
  pelota: () => { const g = G(M(new THREE.SphereGeometry(0.45, 28, 20), '#f4efe0')); for (const s of [-1, 1]) { const t = M(new THREE.TorusGeometry(0.45, 0.02, 6, 32, Math.PI), '#d42f2f', 0, 0, 0, 0, s * 0.5, Math.PI / 2); g.add(t); } return g; },
  txapela: () => { const t = M(new THREE.SphereGeometry(0.5, 28, 14), '#1d1d24'); t.scale.set(1, 0.32, 1); return G(t, M(new THREE.CylinderGeometry(0.03, 0.015, 0.12, 8), '#1d1d24', 0, 0.2, 0)); },
  mask: () => { const g = new THREE.Group(); const f = M(new THREE.SphereGeometry(0.5, 24, 18, Math.PI * 0.15, Math.PI * 0.7, 0.2, 2.4), '#f1e7d6', 0, 0, 0, 0, 0, 0, { side: THREE.DoubleSide }); f.scale.set(1, 1.2, 0.8); g.add(f); for (const s of [-1, 1]) { g.add(M(new THREE.SphereGeometry(0.08, 12, 8), '#1a1210', s * 0.17, 0.12, 0.36)); g.add(M(new THREE.ConeGeometry(0.08, 0.35, 10), '#d42f2f', s * 0.3, 0.55, 0.1, 0, 0, -s * 0.5)); } g.add(M(new THREE.TorusGeometry(0.14, 0.03, 6, 16, Math.PI), '#6a2420', 0, -0.15, 0.36, 0, 0, Math.PI)); return g; },
  fish: () => { const g = new THREE.Group(); const b = M(new THREE.SphereGeometry(0.3, 20, 14), '#8aa8b8'); b.scale.set(2, 0.9, 0.55); g.add(b); g.add(M(new THREE.ConeGeometry(0.22, 0.3, 4), '#6a8a9a', -0.72, 0, 0, 0, 0, Math.PI / 2)); for (let i = 0; i < 6; i++) g.add(M(new THREE.SphereGeometry(0.03, 8, 6), '#d06a6a', -0.2 + i * 0.1, 0.05 + (i % 2) * 0.08, 0.16)); g.add(M(new THREE.SphereGeometry(0.06, 10, 8), '#ffffff', 0.42, 0.06, 0.12)); g.add(M(new THREE.SphereGeometry(0.035, 8, 6), '#111111', 0.44, 0.06, 0.16)); g.rotation.y = -0.4; return g; },
};
CUSTOM.trout = CUSTOM.fish;
// nombre del icono → constructor del modelo
const ITEM = { grapes: 'uva', olive: 'olivo', pepper: 'piquillo', asparagus: 'esparrago', artichoke: 'alcachofa', cardo: 'cardo', tomato: 'tomate', wheat: 'trigo', potato: 'patata', apple: 'manzana', almond: 'almendra', beans: 'pocha', corn: 'corn', milk: 'milk', herb: 'herb', herbs: 'herb', litter: 'litter', wool: 'wool', stone: 'stone' };
const ANIMAL = { sheep: 'sheep', latxa: 'sheep', lamb: 'sheep', cow: 'cow', horse: 'pottoka', dog: 'dog', deer: 'corzo', chamois: 'corzo', boar: 'jabali' };
export const has3D = (name) => !!(CUSTOM[name] || ITEM[name] || ANIMAL[name]);

function build(name) {
  if (CUSTOM[name]) return CUSTOM[name]();
  if (ITEM[name]) { const o = makeItem(ITEM[name]); o.remove(o.userData.ring); return o; }
  if (ANIMAL[name]) {
    let s = 3; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const q = quadruped(SPECIES[ANIMAL[name]], rnd); setOutlines(q.root, true);
    if (name === 'bull') q.root.traverse(o => { if (o.isMesh && !o.userData.outline && o.geometry.attributes.color) { const c = o.geometry.attributes.color.clone(); for (let i = 0; i < c.count; i++) { const r = c.getX(i), g = c.getY(i), b = c.getZ(i); if (r > 0.6 && g > 0.4 && b < 0.5) c.setXYZ(i, 0.16, 0.13, 0.12); } o.geometry = o.geometry.clone(); o.geometry.setAttribute('color', c); } });
    if (name === 'lamb') q.root.scale.setScalar(0.7);
    q.root.rotation.y = 0.9; q.head.rotation.x = -0.15;
    return q.root;
  }
  return null;
}
// Pegatina: silueta blanca y contorno oscuro alrededor del modelo
function sticker(src) {
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const tint = (col) => { const t = document.createElement('canvas'); t.width = t.height = S; const x = t.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, S, S); return t; };
  const dark = tint('#2b1d12'), white = tint('#fffaf0');
  const ring = (img, r) => { for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; g.drawImage(img, Math.cos(a) * r, Math.sin(a) * r); } };
  g.globalAlpha = 0.3; g.drawImage(dark, 0, 12); g.globalAlpha = 1;   // sombra
  ring(dark, 17); ring(white, 11); g.drawImage(src, 0, 0);
  return c.toDataURL('image/png');
}
export function icon3D(name) {
  if (cache.has(name)) return cache.get(name);
  let out = '';
  try {
    const obj = build(name);
    if (obj) {
      if (!R) setup();
      const holder = new THREE.Group(); holder.add(obj); scene.add(holder);
      holder.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
      const rad = (ANIMAL[name] ? Math.max(size.x, size.y) * 0.6 : Math.max(size.x, size.y, size.z) * 0.62);
      const dist = rad / Math.tan(THREE.MathUtils.degToRad(11)) * (ANIMAL[name] ? 1.05 : 1.28);
      cam.position.set(ctr.x + dist * 0.25, ctr.y + dist * 0.32, ctr.z + dist * 0.92); cam.lookAt(ctr);
      R.setClearColor(0, 0); R.render(scene, cam);
      out = sticker(R.domElement);
      scene.remove(holder);
      holder.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }
  } catch (e) { console.warn('icono 3D', name, e); }
  cache.set(name, out);
  return out;
}
