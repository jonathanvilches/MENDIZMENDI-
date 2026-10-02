// Piezas 3D comunes de los minijuegos: texturas con relieve (madera, ladrillo, revoco, piedra, paja, tierra), los
// sitios (la cuadra, el taller, el campo) y objetos que salen en varios (cubo de metal, taburete, partículas de
// chispas, vapor, virutas o lana). Todo con curvas: tornos (lathe), tubos y extrusiones redondeadas.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { woodSet, brickSet, plasterSet, ashlarSet } from '../../game/encierroTex.js';

// ------------------------------------------------------------------ texturas (se hacen una vez y se reutilizan)
const SETS = {};
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function canvasSet(n, draw, strength = 3) {
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = n; return c; };
  const cc = mk(), hc = mk(), cg = cc.getContext('2d'), hg = hc.getContext('2d', { willReadFrequently: true });
  draw(cg, hg, n);
  const src = hg.getImageData(0, 0, n, n).data, nc = mk(), ng = nc.getContext('2d'), img = ng.createImageData(n, n), d = img.data;
  const Hh = (x, y) => src[(((y + n) % n) * n + ((x + n) % n)) * 4] / 255;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (Hh(x + 1, y) - Hh(x - 1, y)) * strength, dy = (Hh(x, y + 1) - Hh(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1), i = (y * n + x) * 4;
    d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  ng.putImageData(img, 0, 0);
  const wrap = (c, srgb) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  return { map: wrap(cc, true), normalMap: wrap(nc) };
}
/** Paja del suelo de la cuadra: briznas doradas cruzadas sobre tierra oscura. */
function strawDraw(cg, hg, n) {
  const r = rng(3);
  cg.fillStyle = '#6a5232'; cg.fillRect(0, 0, n, n); hg.fillStyle = '#202020'; hg.fillRect(0, 0, n, n);
  for (let i = 0; i < 2600; i++) {
    const x = r() * n, y = r() * n, a = r() * Math.PI, l = 18 + r() * 46, v = r();
    const c = v < 0.5 ? [222, 184, 96] : v < 0.8 ? [196, 150, 70] : [240, 214, 140];
    for (const [dx, dy] of [[0, 0], [-n, 0], [n, 0], [0, -n], [0, n]]) {
      cg.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.65 + r() * 0.35})`; cg.lineWidth = 1.5 + r() * 2.2;
      cg.beginPath(); cg.moveTo(x + dx, y + dy); cg.quadraticCurveTo(x + dx + Math.cos(a) * l * 0.5 + (r() - 0.5) * 6, y + dy + Math.sin(a) * l * 0.5 + (r() - 0.5) * 6, x + dx + Math.cos(a) * l, y + dy + Math.sin(a) * l); cg.stroke();
      const h = 120 + r() * 135 | 0; hg.strokeStyle = `rgb(${h},${h},${h})`; hg.lineWidth = 2.4; hg.beginPath(); hg.moveTo(x + dx, y + dy); hg.lineTo(x + dx + Math.cos(a) * l, y + dy + Math.sin(a) * l); hg.stroke();
    }
  }
}
/** Tierra de labor con piedrecitas y terrones. */
function soilDraw(cg, hg, n) {
  const r = rng(9);
  cg.fillStyle = '#6e5038'; cg.fillRect(0, 0, n, n); hg.fillStyle = '#606060'; hg.fillRect(0, 0, n, n);
  for (let i = 0; i < 9000; i++) { const v = r(); cg.fillStyle = v < 0.5 ? `rgba(40,26,16,${0.3 * r()})` : `rgba(170,130,90,${0.3 * r()})`; cg.fillRect(r() * n, r() * n, 1 + r() * 3, 1 + r() * 3); }
  for (let i = 0; i < 260; i++) {
    const x = r() * n, y = r() * n, s = 2 + r() * 7, v = 110 + r() * 80 | 0;
    cg.fillStyle = r() < 0.3 ? `rgb(${v},${v - 6},${v - 14})` : `rgb(${v * 0.62 | 0},${v * 0.45 | 0},${v * 0.3 | 0})`; cg.beginPath(); cg.ellipse(x, y, s, s * (0.6 + r() * 0.4), r() * 3, 0, 7); cg.fill();
    const h = 150 + r() * 100 | 0; hg.fillStyle = `rgb(${h},${h},${h})`; hg.beginPath(); hg.ellipse(x, y, s, s * 0.8, 0, 0, 7); hg.fill();
  }
}
/** Corteza: vetas verticales profundas y grietas. */
function barkDraw(cg, hg, n) {
  const r = rng(21);
  cg.fillStyle = '#5a4532'; cg.fillRect(0, 0, n, n); hg.fillStyle = '#808080'; hg.fillRect(0, 0, n, n);
  for (let i = 0; i < 180; i++) {
    const x = r() * n, w = 2 + r() * 7, v = r();
    cg.fillStyle = v < 0.5 ? `rgba(30,20,12,${0.4 + r() * 0.4})` : `rgba(140,112,84,${0.3 + r() * 0.3})`; hg.fillStyle = v < 0.5 ? '#202020' : '#d0d0d0';
    let y = r() * n; const L = 40 + r() * 160;
    for (let k = 0; k < L; k += 4) { const xx = x + Math.sin((y + k) * 0.05 + i) * 4; cg.fillRect(xx, (y + k) % n, w, 4); hg.fillRect(xx, (y + k) % n, w, 4); }
  }
}
/** Trenza de yute o esparto: cordones en diagonal (para la suela y las cuerdas). */
function braidDraw(cg, hg, n) {
  const r = rng(31);
  cg.fillStyle = '#b8945a'; cg.fillRect(0, 0, n, n); hg.fillStyle = '#404040'; hg.fillRect(0, 0, n, n);
  const k = n / 8;
  for (let row = 0; row < 8; row++) for (let i = -1; i < 9; i++) {
    const x = i * k + (row % 2) * k / 2, y = row * k, v = 0.85 + r() * 0.3;
    const g = cg.createLinearGradient(x, y, x + k, y + k); g.addColorStop(0, `rgb(${150 * v | 0},${118 * v | 0},${70 * v | 0})`); g.addColorStop(0.5, `rgb(${222 * v | 0},${190 * v | 0},${128 * v | 0})`); g.addColorStop(1, `rgb(${150 * v | 0},${118 * v | 0},${70 * v | 0})`);
    cg.fillStyle = g; cg.beginPath(); cg.ellipse(x + k / 2, y + k / 2, k * 0.62, k * 0.3, Math.PI / 4 * (row % 2 ? 1 : -1), 0, 7); cg.fill();
    const hgr = hg.createRadialGradient(x + k / 2, y + k / 2, 1, x + k / 2, y + k / 2, k * 0.6); hgr.addColorStop(0, '#e8e8e8'); hgr.addColorStop(1, '#303030');
    hg.fillStyle = hgr; hg.beginPath(); hg.ellipse(x + k / 2, y + k / 2, k * 0.62, k * 0.3, Math.PI / 4 * (row % 2 ? 1 : -1), 0, 7); hg.fill();
    for (let f = 0; f < 6; f++) { cg.strokeStyle = 'rgba(90,64,30,0.35)'; cg.lineWidth = 1; cg.beginPath(); const fx = x + r() * k, fy = y + r() * k; cg.moveTo(fx, fy); cg.lineTo(fx + 6, fy + 6 * (row % 2 ? 1 : -1)); cg.stroke(); }
  }
}
/** Cuero del fuelle: marrón oscuro con arrugas. */
function leatherDraw(cg, hg, n) {
  const r = rng(41);
  cg.fillStyle = '#5a3420'; cg.fillRect(0, 0, n, n); hg.fillStyle = '#808080'; hg.fillRect(0, 0, n, n);
  for (let i = 0; i < 4000; i++) { cg.fillStyle = `rgba(${r() < 0.5 ? '20,10,4' : '140,90,60'},${0.12 * r()})`; cg.fillRect(r() * n, r() * n, 2 + r() * 4, 1 + r() * 2); }
  for (let i = 0; i < 40; i++) { const y = r() * n; cg.strokeStyle = 'rgba(25,12,6,0.35)'; hg.strokeStyle = 'rgba(20,20,20,0.6)'; for (const g of [cg, hg]) { g.lineWidth = 1 + r() * 2; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= n; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + i) * 4); g.stroke(); } }
}
/** Piedra arenisca de cantera (sin juntas): grano fino, manchas y poros. */
function rockDraw(cg, hg, n) {
  const r = rng(51);
  cg.fillStyle = '#b8ab92'; cg.fillRect(0, 0, n, n); hg.fillStyle = '#808080'; hg.fillRect(0, 0, n, n);
  for (let i = 0; i < 700; i++) { const x = r() * n, y = r() * n, s = 8 + r() * 40, v = r(); for (const [dx, dy] of [[0, 0], [-n, 0], [n, 0], [0, -n], [0, n]]) { cg.fillStyle = v < 0.5 ? `rgba(120,104,80,${0.06 * r()})` : `rgba(236,226,204,${0.08 * r()})`; cg.beginPath(); cg.ellipse(x + dx, y + dy, s, s * (0.5 + r() * 0.5), r() * 3, 0, 7); cg.fill(); } }
  for (let i = 0; i < 14000; i++) { const x = r() * n, y = r() * n, v = r(); cg.fillStyle = v < 0.5 ? `rgba(70,60,46,${0.25 * r()})` : `rgba(250,244,228,${0.3 * r()})`; cg.fillRect(x, y, 1 + r() * 1.5, 1 + r() * 1.5); const h = v < 0.5 ? 90 : 170; hg.fillStyle = `rgba(${h},${h},${h},0.5)`; hg.fillRect(x, y, 1.5, 1.5); }
  for (let i = 0; i < 90; i++) { const x = r() * n, y = r() * n, s = 1 + r() * 2.5; cg.fillStyle = 'rgba(60,50,40,0.55)'; cg.beginPath(); cg.arc(x, y, s, 0, 7); cg.fill(); hg.fillStyle = '#202020'; hg.beginPath(); hg.arc(x, y, s, 0, 7); hg.fill(); }
}
/** Hierba corta de prado: briznas de varios verdes. */
function grassDraw(cg, hg, n) {
  const r = rng(61);
  cg.fillStyle = '#4f6e30'; cg.fillRect(0, 0, n, n); hg.fillStyle = '#505050'; hg.fillRect(0, 0, n, n);
  for (let i = 0; i < 9000; i++) {
    const x = r() * n, y = r() * n, a = -Math.PI / 2 + (r() - 0.5) * 1.6, l = 4 + r() * 10, v = r();
    const c = v < 0.4 ? [70, 104, 40] : v < 0.75 ? [98, 136, 52] : v < 0.95 ? [128, 160, 70] : [170, 168, 96];
    cg.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},0.85)`; cg.lineWidth = 1 + r() * 1.2; cg.beginPath(); cg.moveTo(x, y); cg.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); cg.stroke();
    const h = 110 + r() * 140 | 0; hg.strokeStyle = `rgb(${h},${h},${h})`; hg.lineWidth = 1.4; hg.beginPath(); hg.moveTo(x, y); hg.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); hg.stroke();
  }
}
/** Follaje: hojas pequeñas superpuestas en varios verdes, con luces y sombras. */
function leavesDraw(cg, hg, n) {
  const r = rng(71);
  cg.fillStyle = '#2f4a1e'; cg.fillRect(0, 0, n, n); hg.fillStyle = '#303030'; hg.fillRect(0, 0, n, n);
  for (let i = 0; i < 2600; i++) {
    const x = r() * n, y = r() * n, a = r() * Math.PI, l = 5 + r() * 7, v = r();
    const c = v < 0.3 ? [52, 84, 30] : v < 0.65 ? [78, 116, 42] : v < 0.9 ? [104, 146, 58] : [140, 172, 80];
    for (const [dx, dy] of [[0, 0], [-n, 0], [n, 0], [0, -n], [0, n]]) {
      cg.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; cg.beginPath(); cg.ellipse(x + dx, y + dy, l, l * 0.5, a, 0, 7); cg.fill();
      cg.strokeStyle = 'rgba(30,50,16,0.5)'; cg.lineWidth = 0.8; cg.beginPath(); cg.moveTo(x + dx - Math.cos(a) * l, y + dy - Math.sin(a) * l); cg.lineTo(x + dx + Math.cos(a) * l, y + dy + Math.sin(a) * l); cg.stroke();
      const h = 90 + v * 160 | 0; hg.fillStyle = `rgb(${h},${h},${h})`; hg.beginPath(); hg.ellipse(x + dx, y + dy, l, l * 0.5, a, 0, 7); hg.fill();
    }
  }
}
const MAKERS = {
  wood: () => woodSet(), brick: () => brickSet(), plaster: () => plasterSet(), stone: () => ashlarSet(),
  straw: () => canvasSet(512, strawDraw, 4), soil: () => canvasSet(512, soilDraw, 3), bark: () => canvasSet(256, barkDraw, 4),
  braid: () => canvasSet(256, braidDraw, 5), leather: () => canvasSet(256, leatherDraw, 3),
  rock: () => canvasSet(512, rockDraw, 3), grass: () => canvasSet(512, grassDraw, 3), leaves: () => canvasSet(256, leavesDraw, 4),
};
/** Juego de texturas (color y relieve) compartido entre minijuegos. */
export function texSet(name) { return (SETS[name] ||= MAKERS[name]()); }
/** Al acabar un minijuego: se suelta la memoria gráfica de las texturas (los lienzos se quedan y se vuelven a subir
 *  solos si otro minijuego las usa), para que el pueblo no cargue con ellas en el móvil. */
export function releaseTextures() { for (const T of Object.values(SETS)) for (const t of Object.values(T)) if (t?.isTexture) t.dispose(); }
/** Escala las coordenadas de textura de una geometría (la textura se repite sin copiarla). */
export function uvScale(geo, sx, sy = sx) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy); return geo; }
/** Material con un juego de texturas y color (la textura se multiplica por el color). */
export function texMat(S, name, color = '#ffffff', o = {}) { const T = texSet(name); return S.mat(color, { map: T.map, normalMap: T.normalMap, roughness: 0.9, ...o }); }

// ------------------------------------------------------------------ formas
export const lathe = (pts, seg = 32) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
export const rbox = (w, h, d, r = 0.02, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, r);
export const tube = (pts, r, seg = 48, rs = 10, closed = false) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), closed), seg, r, rs, closed);
/** Desplaza los vértices de una esfera con ruido suave (piedras, terrones, masa, copas de árboles). */
export function lumpy(geo, amp, freq = 3, seed = 1) {
  const p = geo.attributes.position, v = new THREE.Vector3(), r = rng(seed), ph = [r() * 9, r() * 9, r() * 9];
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = Math.sin(v.x * freq + ph[0]) * Math.sin(v.y * freq * 1.3 + ph[1]) * Math.sin(v.z * freq * 0.9 + ph[2]); v.multiplyScalar(1 + n * amp); p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals(); return geo;
}

// ------------------------------------------------------------------ sitios
/** La cuadra: suelo de paja, pared de tablas con vigas, una ventana con luz cálida y balas de paja. */
export function barn(S, { w = 9, d = 7, h = 3.4 } = {}) {
  const floor = S.mesh(uvScale(new THREE.PlaneGeometry(w, d), w / 1.6, d / 1.6), texMat(S, 'straw', '#ffffff', { roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  S.mesh(uvScale(new THREE.BoxGeometry(w, h, 0.14), w / 2.2, h / 2.2), texMat(S, 'wood', '#a88a64'), 0, h / 2, -d / 2);              // pared del fondo
  S.mesh(uvScale(new THREE.BoxGeometry(0.14, h, d), d / 2.2, h / 2.2), texMat(S, 'wood', '#9c8060'), -w / 2, h / 2, 0);               // pared de un lado
  S.mesh(uvScale(new THREE.BoxGeometry(0.5, 1.1, d), d / 2, 1), texMat(S, 'stone', '#c8bca4'), -w / 2 + 0.2, 0.55, 0);              // zócalo de piedra
  for (const x of [-2.8, 0.4, 3.6]) S.mesh(rbox(0.24, h, 0.24, 0.03), texMat(S, 'wood', '#7a5c3c'), x, h / 2, -d / 2 + 0.18);       // pies derechos
  S.mesh(rbox(w, 0.26, 0.26, 0.03), texMat(S, 'wood', '#6e5236'), 0, h - 0.2, -d / 2 + 0.2);                                          // viga
  // ventana con luz de la mañana
  const win = S.mesh(new THREE.PlaneGeometry(1.3, 0.9), new THREE.MeshBasicMaterial({ color: '#fff1c8' }), 1.9, 2.15, -d / 2 + 0.08); win.castShadow = false;
  S.own(win.material);
  for (const [x, y, ww, hh] of [[1.9, 2.62, 1.5, 0.1], [1.9, 1.68, 1.5, 0.12], [1.17, 2.15, 0.1, 1.0], [2.63, 2.15, 0.1, 1.0], [1.9, 2.15, 0.06, 0.9]]) S.mesh(rbox(ww, hh, 0.1, 0.02), texMat(S, 'wood', '#5a4028'), x, y, -d / 2 + 0.1);
  const L = new THREE.SpotLight('#ffe2b0', 18, 9, 0.5, 0.6, 1.2); L.position.set(1.9, 2.3, -d / 2 + 0.3); L.target.position.set(0.6, 0, 0.6); S.add(L); S.add(L.target);
  // balas de paja al fondo
  for (const [x, y, z, ry] of [[-3.2, 0.3, -2.6, 0.1], [-2.1, 0.3, -2.75, -0.05], [-2.7, 0.88, -2.7, 0.08]]) {
    const b = S.mesh(uvScale(rbox(1.1, 0.58, 0.6, 0.1, 4), 1.2, 0.7), texMat(S, 'straw', '#f2dca0'), x, y, z); b.rotation.y = ry;
    for (const k of [-0.25, 0.25]) { const t = S.mesh(new THREE.TorusGeometry(0.33, 0.01, 6, 24), '#c8a060', x + k, y, z); t.rotation.y = Math.PI / 2 + ry; t.scale.set(1, 0.9, 1.04); }
  }
  return floor;
}
/** El taller: suelo de tablas, pared de revoco con zócalo de piedra y un banco de trabajo. */
export function workshop(S, { w = 8, d = 6, h = 3.2, bench = true, wall = 'plaster' } = {}) {
  const floor = S.mesh(uvScale(new THREE.PlaneGeometry(w, d), w / 2, d / 2), texMat(S, 'wood', '#9a7a58', { roughness: 0.95 })); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  S.mesh(uvScale(new THREE.BoxGeometry(w, h, 0.2), w / 2.4, h / 2.4), texMat(S, wall, wall === 'brick' ? '#d8c8b8' : '#efe6d6'), 0, h / 2, -d / 2);
  S.mesh(uvScale(new THREE.BoxGeometry(w, 0.7, 0.24), w / 2.2, 0.35), texMat(S, 'stone', '#c0b49c'), 0, 0.35, -d / 2 + 0.03);
  S.mesh(uvScale(new THREE.BoxGeometry(0.2, h, d), d / 2.4, h / 2.4), texMat(S, wall, '#e6dcca'), -w / 2, h / 2, 0);
  if (bench) {
    S.mesh(uvScale(rbox(2.4, 0.09, 0.8, 0.02), 4, 1.4), texMat(S, 'wood', '#a0805a'), 0.3, 0.86, -d / 2 + 0.6);
    for (const [x, z] of [[-0.8, -d / 2 + 0.3], [1.4, -d / 2 + 0.3], [-0.8, -d / 2 + 0.9], [1.4, -d / 2 + 0.9]]) S.mesh(rbox(0.09, 0.82, 0.09, 0.015), texMat(S, 'wood', '#7a5c3c'), x, 0.41, z);
  }
  return floor;
}
/** Campo abierto: cielo en degradado, colinas lejanas y el suelo. */
export function outdoors(S, { ground = 'soil', groundColor = '#ffffff', size = 60, hills = '#7a9a5a', sky = ['#7fb2e6', '#e8f0f2'] } = {}) {
  const skyMat = S.own(new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { a: { value: new THREE.Color(sky[0]) }, b: { value: new THREE.Color(sky[1]) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 a, b; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y, 0.0, 1.0); gl_FragColor = vec4(mix(b, a, pow(h, 0.6)), 1.0);\n#include <colorspace_fragment>\n}' }));
  const sk = new THREE.Mesh(S.own(new THREE.SphereGeometry(80, 24, 12)), skyMat); S.add(sk);
  const g = S.mesh(uvScale(new THREE.PlaneGeometry(size, size, 1, 1), size / 2.5, size / 2.5), texMat(S, ground, groundColor, { roughness: 1 })); g.rotation.x = -Math.PI / 2; g.castShadow = false;
  // colinas: un anillo de lomas suaves al fondo
  const hg = new THREE.CylinderGeometry(40, 40, 8, 64, 4, true), p = hg.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(z, x); if (y > 0) p.setY(i, -4 + 2.5 + Math.sin(a * 5) * 1.6 + Math.sin(a * 11 + 1) * 0.8 + Math.sin(a * 3 + 2) * 1.4); }
  hg.computeVertexNormals();
  const hm = S.mesh(hg, S.mat(hills, { side: THREE.BackSide, roughness: 1 }), 0, 2, 0); hm.castShadow = hm.receiveShadow = false;
  return g;
}

/** Árbol de hoja (haya, roble): tronco torneado con raíces y ramas, copa de bultos redondos con textura de hojas. */
export function tree(S, x, z, { h = 5, r = 0.2, crown = 1.6, color = '#ffffff', seed = 1 } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); S.add(g);
  const rr = rng(seed * 977 + 13), bark = texMat(S, 'bark', '#c8bcb0'), leaf = texMat(S, 'leaves', color, { roughness: 0.85 });
  S.mesh(uvScale(lathe([[0.001, 0], [r * 1.9, 0], [r * 1.25, 0.12], [r * 1.05, 0.4], [r, h * 0.4], [r * 0.8, h * 0.7], [r * 0.55, h * 0.86], [0.001, h * 0.9]], 14), 2, 3), bark, 0, 0, 0, g);
  // ramas que salen del tronco hacia la copa
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + rr(), y0 = h * (0.5 + rr() * 0.2), L = crown * (0.6 + rr() * 0.3);
    S.mesh(uvScale(tube([[0, y0, 0], [Math.cos(a) * L * 0.4, y0 + L * 0.35, Math.sin(a) * L * 0.4], [Math.cos(a) * L * 0.8, y0 + L * 0.6, Math.sin(a) * L * 0.8]], r * 0.35, 10, 6), 1, 4), bark, 0, 0, 0, g); }
  // la copa: bultos redondos (sin facetas) que se solapan
  const cy = h * 0.85;
  for (let i = 0; i < 7; i++) {
    const a = rr() * Math.PI * 2, d = i ? crown * (0.35 + rr() * 0.4) : 0, s = crown * (i ? 0.55 + rr() * 0.3 : 0.85);
    const m = S.mesh(uvScale(lumpy(new THREE.IcosahedronGeometry(1, 4), 0.12, 3, seed * 10 + i), 3, 3), leaf, Math.cos(a) * d, cy + (rr() - 0.3) * crown * 0.6, Math.sin(a) * d, g);
    m.scale.set(s, s * 0.8, s);
  }
  return g;
}

// ------------------------------------------------------------------ objetos
/** Cubo de metal galvanizado (con asa); devuelve { group, setLevel(0…1), surfaceY } para la leche o el agua. */
export function bucket(S, { r = 0.15, h = 0.3, liquid = '#fbf8ef' } = {}) {
  const g = new THREE.Group(), metal = S.mat('#c4c9ce', { metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide });
  S.mesh(lathe([[0.001, 0], [r * 0.82, 0], [r * 0.84, 0.01], [r * 0.9, h * 0.35], [r * 0.9 + 0.003, h * 0.37], [r * 0.95, h * 0.7], [r * 0.95 + 0.003, h * 0.72], [r, h * 0.98], [r + 0.008, h], [r * 0.98, h + 0.004]], 40), metal, 0, 0, 0, g);
  for (const s of [-1, 1]) S.mesh(new THREE.SphereGeometry(0.014, 10, 8), metal, s * r * 0.98, h * 0.85, 0, g);
  const hdl = S.mesh(new THREE.TorusGeometry(r * 0.98, 0.0045, 6, 32, Math.PI), S.mat('#8a8f96', { metalness: 0.9, roughness: 0.3 }), 0, h * 0.85, 0, g); hdl.rotation.z = 0.25;
  const surf = S.mesh(new THREE.CircleGeometry(1, 40), S.mat(liquid, { roughness: 0.25 }), 0, 0.02, 0, g); surf.rotation.x = -Math.PI / 2; surf.castShadow = false;
  const foam = S.mesh(new THREE.TorusGeometry(1, 0.06, 6, 40), S.mat('#ffffff', { roughness: 0.6 }), 0, 0.02, 0, g); foam.rotation.x = Math.PI / 2; foam.castShadow = false;
  const B = { group: g, level: 0, surfaceY: 0.02,
    setLevel(k) { this.level = k; const y = 0.012 + k * h * 0.86, rr = (y < h * 0.35 ? r * (0.82 + 0.08 * y / (h * 0.35)) : r * 0.9 + (r * 0.05) * (y - h * 0.35) / (h * 0.35)) - 0.004;
      surf.position.y = foam.position.y = y; surf.scale.setScalar(rr); foam.scale.setScalar(rr); surf.visible = foam.visible = k > 0.005; this.surfaceY = y; } };
  B.setLevel(0); return B;
}
/** Taburete de ordeñar de tres patas. */
export function stool(S) {
  const g = new THREE.Group(), w = texMat(S, 'wood', '#a07a50');
  S.mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.045, 28), w, 0, 0.3, 0, g);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, l = S.mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.33, 10), w, Math.cos(a) * 0.08, 0.15, Math.sin(a) * 0.08, g); l.rotation.set(Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22); }
  return g;
}

/**
 * Partículas sencillas (chispas, gotas, virutas, lana, vapor): instancias con velocidad, gravedad y vida.
 * emit(pos, n, { speed, spread, dir, life, size }) las lanza; se animan solas.
 */
export function particles(S, { geo, color = '#ffffff', max = 120, gravity = -9.8, drag = 0.6, emissive = null, opacity = 1, ground = 0, spinRate = 4, grow = 0 } = {}) {
  const m = S.own(new THREE.MeshStandardMaterial({ color, roughness: 0.7, emissive: emissive || '#000000', emissiveIntensity: emissive ? 1.6 : 0, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }));
  const im = new THREE.InstancedMesh(S.own(geo || new THREE.SphereGeometry(0.01, 6, 4)), m, max); im.count = 0; im.frustumCulled = false; im.castShadow = false; S.add(im);
  const P = [], M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3();
  S.every((dt) => {
    let n = 0;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.age += dt; if (p.age >= p.life) { P.splice(i, 1); continue; }
      p.v.y += gravity * dt; p.v.multiplyScalar(Math.max(0, 1 - drag * dt)); p.x.addScaledVector(p.v, dt);
      if (p.x.y < ground + p.size * 0.5 && gravity < 0) { p.x.y = ground + p.size * 0.5; p.v.set(0, 0, 0); p.rest = true; }
      if (!p.rest) { p.r.x += dt * spinRate * p.w; p.r.z += dt * spinRate * p.w * 0.7; }
    }
    for (const p of P) { const k = p.rest ? 1 : Math.min(1, (p.life - p.age) * 4) * (1 + grow * p.age); sc.setScalar(p.size * k); M4.compose(p.x, q.setFromEuler(e.set(p.r.x, p.r.y, p.r.z)), sc); im.setMatrixAt(n++, M4); }
    im.count = n; im.instanceMatrix.needsUpdate = true;
  });
  return {
    mesh: im, list: P,
    emit(pos, n, { speed = 1, spread = 1, dir = [0, 1, 0], life = 1, size = 1, keep = false } = {}) {
      for (let i = 0; i < n; i++) {
        if (P.length >= max) { const k = P.findIndex(p => p.rest); if (k >= 0) P.splice(k, 1); else P.shift(); }
        const v = new THREE.Vector3(dir[0] + (Math.random() - 0.5) * spread, dir[1] + (Math.random() - 0.5) * spread, dir[2] + (Math.random() - 0.5) * spread).normalize().multiplyScalar(speed * (0.5 + Math.random() * 0.8));
        P.push({ x: new THREE.Vector3(...(pos.isVector3 ? pos.toArray() : pos)), v, age: 0, life: keep ? 1e9 : life * (0.7 + Math.random() * 0.6), size: size * (0.7 + Math.random() * 0.6), r: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6), w: Math.random() - 0.5, rest: false });
      }
    },
  };
}
/** Vapor o humo: bolas blandas que suben, crecen y se desvanecen. */
export function puffs(S, { color = '#f4f4f2', max = 40, rise = 0.6 } = {}) {
  const m = S.own(new THREE.MeshStandardMaterial({ color, roughness: 1, transparent: true, opacity: 0.55, depthWrite: false }));
  const geo = S.own(lumpy(new THREE.IcosahedronGeometry(1, 2), 0.18, 2.5, 7));
  const list = [];
  const pool = Array.from({ length: max }, () => { const o = new THREE.Mesh(geo, m.clone()); S.own(o.material); o.visible = false; o.castShadow = false; S.add(o); return o; });
  S.every((dt) => { for (const p of list) { if (!p.o.visible) continue; p.age += dt; const k = p.age / p.life; if (k >= 1) { p.o.visible = false; continue; } p.o.position.y += rise * dt * (1 - k * 0.5); p.o.position.x += p.dx * dt; p.o.scale.setScalar(p.s * (0.4 + k * 1.6)); p.o.material.opacity = 0.55 * (1 - k) * Math.min(1, k * 8); } });
  return { emit(pos, n = 4, { size = 0.08, life = 1.6, spread = 0.06 } = {}) {
    for (let i = 0; i < n; i++) { const o = pool.find(x => !x.visible) || pool[0]; o.visible = true; o.position.set(pos[0] + (Math.random() - 0.5) * spread, pos[1], pos[2] + (Math.random() - 0.5) * spread); let p = list.find(q => q.o === o); if (!p) { p = { o }; list.push(p); } Object.assign(p, { age: 0, life: life * (0.7 + Math.random() * 0.6), s: size * (0.7 + Math.random() * 0.6), dx: (Math.random() - 0.5) * 0.08 }); o.scale.setScalar(p.s * 0.4); o.material.opacity = 0; }
  } };
}
