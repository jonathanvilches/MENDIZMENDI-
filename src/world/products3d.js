// Productos de Navarra en 3D, con su forma real (para el mercado de la plaza y la tienda):
// queso de oveja (Roncal / Idiazabal) entero y en cuña, txistorra en ristra, pimientos del piquillo, espárragos
// blancos en manojo, alcachofas, pochas en vaina, cuajada en kaiku, miel en tarro, hogaza, manzanas, uvas,
// almendras, nueces, tomates, alubias, talo. Cada producto es un grupo pequeño (~0,1–0,4 m) listo para colocar.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import foodUrl from '../assets/food/food.glb?url';

// frutas y verduras del pack «Food» de Quaternius (CC0), a su tamaño real (m, la medida mayor)
const FOODGLB = {}, REAL = { Apple: 0.08, Apple_Green: 0.08, Bread: 0.26, Carrot: 0.19, Egg_Whole: 0.06, Lettuce_Whole: 0.2, Mushroom: 0.06, Pepper_Red: 0.11, Pepper_Green: 0.11, Pumpkin: 0.34, Tomato: 0.075, Turnip: 0.15, Eggplant: 0.2, Orange: 0.08, Broccoli: 0.15, Jar_Large: 0.11, Banana: 0.18 };
let foodP = null;
// colores reales (sRGB) de los materiales del pack: tomate y manzana rojos, huevo crema, berenjena morada…
const FOODCOL = { DarkRed: '#c0261c', DarkBrown: '#5a3a22', DarkGreen: '#3f7a2c', PaleGreen: '#9cc85a', Brown: '#a8682e', Light: '#e2c08a', Orange: '#e8781e', LightYellow: '#efe2c4',
  LightBrown: '#c8a888', Green: '#3f8a2e', White: '#f2efe8', PalePink2: '#b04a8a', Purple: '#4a2a5a', LightGreen: '#5aa83a', PaleRed: '#c84a3a', Yellow: '#f0c83a' };
/** Carga los modelos de fruta y verdura (una vez). */
export function preloadFood() {
  if (!foodP) foodP = new GLTFLoader().loadAsync(foodUrl).then(g => {
    // cada producto es un nodo del archivo (a veces con varias piezas, una por material): se centra y se escala
    // a su medida real dentro de un grupo que luego se copia
    for (const node of [...g.scene.children]) {
      const name = Object.keys(REAL).find(n => node.name === n || node.name.startsWith(n + '_') && !REAL[node.name]) || node.name;
      if (!REAL[name]) continue;
      const b = new THREE.Box3().setFromObject(node), sz = b.getSize(new THREE.Vector3()), k = REAL[name] / Math.max(sz.x, sz.y, sz.z);
      const holder = new THREE.Group(); node.position.sub(new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y, (b.min.z + b.max.z) / 2)); holder.add(node); holder.scale.setScalar(k);
      // el pack se exportó con alfa 0 y recorte: opacos y de una cara
      node.traverse(o => { if (o.isMesh) { o.castShadow = true; for (const m of [].concat(o.material)) { if (!m.userData.fixed) { m.userData.fixed = true; if (FOODCOL[m.name]) m.color.set(FOODCOL[m.name]); } m.alphaTest = 0; m.opacity = 1; m.transparent = false; m.side = THREE.FrontSide; m.needsUpdate = true; } } });
      FOODGLB[name] = holder;
    }
  }).catch(e => console.warn('fruta y verdura', e));
  return foodP;
}
const fromPack = (name, alt) => () => { const F = FOODGLB[name]; if (!F) return alt ? alt() : new THREE.Group(); const g = new THREE.Group(), m = F.clone(); m.rotation.y = Math.random() * 6.28; g.add(m); return g; };

const M = new Map();
const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!M.has(k)) M.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o })); return M.get(k); };
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; return o; };
const G = () => new THREE.Group();

// corteza del queso: canasto marcado en zigzag (dibujado) y la cara con la marca del molde
let cheeseTex = null;
function cheeseRind() {
  if (cheeseTex) return cheeseTex;
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#c99a52'; g.fillRect(0, 0, 256, 64);
  g.strokeStyle = 'rgba(110,70,30,0.55)'; g.lineWidth = 2;
  for (let x = -64; x < 320; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 32, 64); g.stroke(); g.beginPath(); g.moveTo(x + 32, 0); g.lineTo(x, 64); g.stroke(); }
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(90,60,25,${Math.random() * 0.2})`; g.fillRect(Math.random() * 256, Math.random() * 64, 2, 2); }
  cheeseTex = new THREE.CanvasTexture(c); cheeseTex.colorSpace = THREE.SRGBColorSpace; cheeseTex.wrapS = THREE.RepeatWrapping; return cheeseTex;
}

export const PRODUCTS = {
  // queso de oveja entero: cilindro bajo con los cantos redondeados y corteza marcada
  queso() { const g = G(), side = new THREE.MeshStandardMaterial({ map: cheeseRind(), roughness: 0.8 }), top = mat('#d4a95e', { roughness: 0.85 });
    g.add(mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 24, 1, true), side, 0, 0.05, 0));
    for (const y of [0.1, 0]) { const t = mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.006, 24), top, 0, y, 0); g.add(t); }
    return g; },
  // cuña de queso: se ve el interior blanco marfil con ojos pequeños
  cuna() { const g = G(), sh = new THREE.Shape(); sh.moveTo(0, 0); sh.absarc(0, 0, 0.11, -0.45, 0.45, false); sh.lineTo(0, 0);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.09, bevelEnabled: false, curveSegments: 10 }); geo.rotateX(-Math.PI / 2);
    g.add(mesh(geo, mat('#f1e4c4', { roughness: 0.6 }))); return g; },
  // txistorra: embutido fino, rojo oscuro brillante, en ristra que cuelga en U
  txistorra() { const g = G(), curve = new THREE.CatmullRomCurve3([[-0.14, 0.2, 0], [-0.13, 0.05, 0.01], [-0.06, -0.04, 0], [0.02, 0.03, -0.01], [0.08, -0.05, 0], [0.14, 0.05, 0.01], [0.15, 0.2, 0]].map(p => new THREE.Vector3(...p)));
    g.add(mesh(new THREE.TubeGeometry(curve, 48, 0.012, 8, false), mat('#8a1e14', { roughness: 0.35 }))); g.position.y = 0.05; return g; },
  // pimiento del piquillo: rojo intenso, pequeño, triangular y terminado en pico; con su rabito verde
  piquillo() { const g = G(), pts = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(Math.sin(t * Math.PI * 0.9) * 0.028 * (1 - t * 0.7) + 0.003, t * 0.11)); }
    const b = mesh(new THREE.LatheGeometry(pts, 12), mat('#c8141a', { roughness: 0.3 })); b.rotation.z = Math.PI / 2 + 0.2; b.position.y = 0.025; g.add(b);
    const st = mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.025, 6), mat('#3a6a22'), 0.012, 0.03, 0); st.rotation.z = Math.PI / 2; g.add(st); return g; },
  // espárragos blancos en manojo atado con cinta, puntas cerradas ligeramente moradas
  esparragos() { const g = G();
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, r = i ? 0.018 : 0, x = Math.cos(a) * r, z = Math.sin(a) * r;
      const s = mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.2, 8), mat('#f3ecd8', { roughness: 0.5 }), x, 0.1, z); g.add(s);
      const tip = mesh(new THREE.ConeGeometry(0.009, 0.022, 8), mat('#d8c8b8'), x, 0.21, z); g.add(tip); }
    g.add(mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.02, 14), mat('#c8202a'), 0, 0.07, 0)); return g; },
  // alcachofa: capullo cerrado de brácteas verdes y moradas superpuestas, con el tallo
  alcachofa() { const g = G();
    for (let row = 0; row < 5; row++) for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + row * 0.4, r = 0.032 - row * 0.005, y = 0.025 + row * 0.014;
      const p = mesh(new THREE.SphereGeometry(0.018, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat(row > 2 ? '#6a4a6a' : '#5a7a3a', { roughness: 0.6 }), Math.cos(a) * r, y, Math.sin(a) * r);
      p.scale.set(1, 1.5, 0.5); p.lookAt(0, y + 0.1, 0); g.add(p); }
    g.add(mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.05, 6), mat('#6a8a4a'), 0, 0.0, 0)); g.position.y = 0.02; return g; },
  // pochas: vainas verdes amarillentas y algunas alubias blancas sueltas
  pochas() { const g = G();
    for (let i = 0; i < 4; i++) { const v = mesh(new THREE.CapsuleGeometry(0.012, 0.11, 4, 8), mat('#b8c86a'), (i - 1.5) * 0.026, 0.012, (i % 2) * 0.01); v.rotation.z = Math.PI / 2; v.rotation.y = (i - 1.5) * 0.12; v.scale.z = 0.6; g.add(v); }
    for (let i = 0; i < 6; i++) { const b = mesh(new THREE.SphereGeometry(0.009, 6, 5), mat('#f4efe2'), -0.05 + i * 0.02, 0.008, 0.04); b.scale.set(1.3, 0.8, 0.9); g.add(b); }
    return g; },
  // cuajada en kaiku o cuenco de barro: cuajada blanca con su capa algo tostada
  cuajada() { const g = G(), pts = [[0.03, 0], [0.042, 0.01], [0.05, 0.05], [0.048, 0.065], [0.044, 0.065]].map(p => new THREE.Vector2(...p));
    g.add(mesh(new THREE.LatheGeometry(pts, 16), mat('#a85a32', { roughness: 0.9, side: THREE.DoubleSide })));
    g.add(mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.004, 16), mat('#f3ead6', { roughness: 0.4 }), 0, 0.058, 0)); return g; },
  // tarro de miel: cristal ámbar, tapa de tela de cuadros atada
  miel() { const g = G();
    g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.09, 16), mat('#d8901a', { roughness: 0.15, transparent: true, opacity: 0.9 }), 0, 0.045, 0));
    const cap = mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.02, 16), mat('#c8202a'), 0, 0.098, 0); g.add(cap);
    const cord = mesh(new THREE.TorusGeometry(0.036, 0.003, 4, 16), mat('#f4efe2'), 0, 0.09, 0); cord.rotation.x = Math.PI / 2; g.add(cord); return g; },
  // hogaza de pan: redonda, dorada, con los cortes en cruz
  pan() { const g = G(), b = mesh(new THREE.SphereGeometry(0.09, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#c88a44', { roughness: 0.8 })); b.scale.y = 0.6; g.add(b);
    for (const r of [0, Math.PI / 2]) { const c = mesh(new THREE.BoxGeometry(0.12, 0.006, 0.01), mat('#f0d8a8'), 0, 0.054, 0); c.rotation.y = r; g.add(c); } return g; },
  manzana() { const g = G(), a = mesh(new THREE.SphereGeometry(0.035, 12, 10), mat('#c82a1e', { roughness: 0.4 }), 0, 0.034, 0); a.scale.y = 0.9; g.add(a);
    g.add(mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.018, 4), mat('#4a3020'), 0, 0.072, 0)); return g; },
  // racimo de uvas tintas
  uvas() { const g = G();
    for (let l = 0; l < 5; l++) for (let i = 0; i < 6 - l; i++) { const a = i / (6 - l) * Math.PI * 2 + l, r = 0.03 - l * 0.004; g.add(mesh(new THREE.SphereGeometry(0.012, 8, 6), mat('#4a1e4a', { roughness: 0.3 }), Math.cos(a) * r, 0.11 - l * 0.02, Math.sin(a) * r)); }
    g.add(mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.03, 4), mat('#5a4020'), 0, 0.135, 0)); g.rotation.z = 0.3; return g; },
  almendras() { const g = G(); for (let i = 0; i < 7; i++) { const b = mesh(new THREE.SphereGeometry(0.012, 8, 6), mat('#a87048', { roughness: 0.8 }), (i % 4 - 1.5) * 0.024, 0.008, Math.floor(i / 4) * 0.024); b.scale.set(1, 0.6, 1.7); b.rotation.y = i; g.add(b); } return g; },
  tomate() { const g = G(), t = mesh(new THREE.SphereGeometry(0.04, 12, 10), mat('#d42a1a', { roughness: 0.3 }), 0, 0.034, 0); t.scale.y = 0.8; g.add(t); g.add(mesh(new THREE.ConeGeometry(0.014, 0.008, 5), mat('#3a6a22'), 0, 0.067, 0)); return g; },
  // talo: torta fina y redonda de maíz, con manchas tostadas
  talo() { const g = G(); g.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.008, 20), mat('#e8c47a', { roughness: 0.9 }), 0, 0.004, 0)); for (let i = 0; i < 6; i++) g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.002, 8), mat('#a8743a'), Math.cos(i) * 0.05, 0.009, Math.sin(i * 2) * 0.05)); return g; },
};
// del pack (si está cargado; si no, la versión dibujada a mano)
Object.assign(PRODUCTS, {
  manzana: fromPack('Apple', PRODUCTS.manzana), manzana_verde: fromPack('Apple_Green', PRODUCTS.manzana), tomate: fromPack('Tomato', PRODUCTS.tomate),
  hogaza: fromPack('Bread', PRODUCTS.pan), zanahoria: fromPack('Carrot'), huevos: fromPack('Egg_Whole'), lechuga: fromPack('Lettuce_Whole'), setas: fromPack('Mushroom'),
  pimiento_rojo: fromPack('Pepper_Red'), pimiento_verde: fromPack('Pepper_Green'), calabaza: fromPack('Pumpkin'), nabo: fromPack('Turnip'), berenjena: fromPack('Eggplant'),
  naranja: fromPack('Orange'), brocoli: fromPack('Broccoli'), tarro: fromPack('Jar_Large', PRODUCTS.miel),
});
// equivalencias con la comida del juego
export const FOOD3D = { queso: 'queso', txistorra: 'txistorra', pimientos: 'piquillo', esparragos: 'esparragos', alcachofa: 'alcachofa', pochas: 'pochas', cuajada: 'cuajada', miel: 'miel', pan: 'pan', manzana: 'manzana', uvas: 'uvas', almendras: 'almendras', tomate: 'tomate', talo: 'talo' };

/** Caja de madera con un producto repetido (n piezas colocadas con algo de desorden). */
export function crateOf(kind, n = 6, rnd = Math.random) {
  const g = G(), wood = mat('#8a6238', { roughness: 0.85 });
  g.add(mesh(new THREE.BoxGeometry(0.42, 0.1, 0.32), wood, 0, 0.05, 0));
  for (const z of [-0.155, 0.155]) g.add(mesh(new THREE.BoxGeometry(0.42, 0.13, 0.015), wood, 0, 0.065, z));
  const make = PRODUCTS[kind]; if (!make) return g;
  for (let i = 0; i < n; i++) { const p = make(); p.position.set((i % 3 - 1) * 0.12 + (rnd() - 0.5) * 0.03, 0.1 + Math.floor(i / 6) * 0.04, (Math.floor(i / 3) % 2 - 0.5) * 0.12); p.rotation.y = rnd() * 6.28; g.add(p); }
  return g;
}

/** Junta todas las mallas de un grupo estático en una por material (para que un puesto entero cueste pocas
 *  llamadas de dibujo). Devuelve un grupo nuevo en las mismas coordenadas del mundo. */
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
export function mergeByMaterial(root) {
  root.updateMatrixWorld(true);
  const by = new Map();
  root.traverse(o => {
    if (!o.isMesh || Array.isArray(o.material)) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    // los modelos comprimidos (posiciones en enteros normalizados) se pasan a coma flotante antes de moverlos
    for (const k of Object.keys(g.attributes)) { const a = g.attributes[k]; if (!(a.array instanceof Float32Array) || a.normalized) { const n = a.count, f = new Float32Array(n * a.itemSize); for (let i = 0; i < n; i++) for (let j = 0; j < a.itemSize; j++) f[i * a.itemSize + j] = a.getComponent(i, j); g.setAttribute(k, new THREE.BufferAttribute(f, a.itemSize)); } }
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(o.matrixWorld);
    if (!by.has(o.material)) by.set(o.material, []); by.get(o.material).push(g);
  });
  const out = new THREE.Group();
  for (const [m, list] of by) { const geo = mergeGeometries(list); if (!geo) continue; const me = new THREE.Mesh(geo, m); me.castShadow = me.receiveShadow = true; out.add(me); }
  return out;
}
