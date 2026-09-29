// Iconos 3D: modelos del propio juego (animales, cosechas, productos, herramientas) renderizados
// con sombreado suave, al doble de resolución y reducidos, con borde de pegatina para que se lean
// nítidos a cualquier tamaño.
import * as THREE from 'three';
import { quadruped, SPECIES } from '../actors/animals.js';
import { makeItem } from '../game/items.js';
import { UI3D } from './icon3d-ui.js';
import { getImg, putImg } from '../util/store.js';
import { offscreen, offscreenCanvas } from '../util/offscreen.js';
import { BIRDS, bird, squirrel, woodpecker, owl, trout } from '../actors/beasts.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

let R = null, scene, cam;
const cache = new Map();
const S = 256, SS = 512;                         // tamaño final y de render (supermuestreo)
function setup() {
  R = offscreen(SS, SS, THREE.NeutralToneMapping);
  scene = new THREE.Scene();
  // luz de estudio: reflejos suaves del entorno, luz principal cálida y contraluz para dar volumen
  const pm = new THREE.PMREMGenerator(R); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04, 0.1, 100, { size: 128 }).texture; scene.environmentIntensity = 0.55;
  scene.add(new THREE.HemisphereLight('#ffffff', '#6a5a8a', 0.9));
  const key = new THREE.DirectionalLight('#fff4e4', 2.4); key.position.set(-2.5, 4, 3); scene.add(key);
  const rim = new THREE.DirectionalLight('#cfe6ff', 1.6); rim.position.set(3, 2, -3); scene.add(rim);
  cam = new THREE.PerspectiveCamera(22, 1, 0.01, 100);
}
// ---- modelos a medida (productos y herramientas) ----
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0, ...o });
const METAL = { metalness: 0.75, roughness: 0.28 }, GLOSS = { roughness: 0.3 }, CLOTH = { roughness: 0.92 };
const M = (g, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, o) => { const m = new THREE.Mesh(g, mat(c, o)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m; };
const G = (...ch) => { const g = new THREE.Group(); ch.forEach(c => g.add(c)); return g; };
const lathe = (prof, seg = 28) => new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg);
// color por vértice según una función de la posición
function paint(geo, fn) {
  const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { fn(p.getX(i), p.getY(i), p.getZ(i), c); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); return geo;
}
function bellIcon() { const g = CUSTOM._bell(); g.rotation.set(-0.45, 0.5, 0.2); return g; }
const CUSTOM = {
  cheese: () => {
    const w = new THREE.CylinderGeometry(0.5, 0.5, 0.36, 40, 1, false, 0, Math.PI * 1.65);
    const g = G(M(w, '#f4d273', 0, 0, 0, 0, 0, 0, { roughness: 0.75 }), M(new THREE.CylinderGeometry(0.515, 0.515, 0.372, 40, 1, true, 0, Math.PI * 1.65), '#c98a3a', 0, 0, 0, 0, 0, 0, { roughness: 0.85, side: THREE.DoubleSide }));
    for (let i = 0; i < 6; i++) g.add(M(new THREE.SphereGeometry(0.04 + (i % 2) * 0.02, 12, 8), '#d9b050', Math.cos(i * 1.1) * (0.18 + (i % 3) * 0.1), 0.185, Math.sin(i * 1.1) * (0.18 + (i % 3) * 0.1)));
    for (let i = 0; i < 12; i++) g.add(M(new THREE.TorusGeometry(0.515, 0.008, 4, 40, 0.12), '#a86a2a', 0, -0.15 + (i % 4) * 0.1, 0, Math.PI / 2, 0, i * 0.45));
    g.rotation.set(0.35, -0.5, 0); return g;
  },
  bread: () => { const b = M(new THREE.SphereGeometry(0.5, 32, 20), '#d99a50', 0, 0, 0, 0, 0, 0, { roughness: 0.7 }); b.scale.set(1.35, 0.55, 0.8); const g = G(b); for (let i = -1; i <= 1; i++) { const c = M(new THREE.CapsuleGeometry(0.04, 0.34, 4, 8), '#f0d09a', i * 0.3, 0.26, 0, Math.PI / 2, 0.6, 0); c.scale.set(1, 1, 0.5); g.add(c); } g.rotation.set(0.3, 0.3, 0); return g; },
  wine: () => G(M(lathe([[0.001, -0.42], [0.19, -0.42], [0.2, -0.38], [0.2, 0.14], [0.17, 0.26], [0.075, 0.38], [0.068, 0.62], [0.001, 0.62]]), '#4a1422', 0, 0, 0, 0, 0, 0, { roughness: 0.12, metalness: 0.1 }), M(new THREE.CylinderGeometry(0.075, 0.075, 0.1, 16), '#c9a24a', 0, 0.62, 0, 0, 0, 0, METAL), M(new THREE.CylinderGeometry(0.205, 0.205, 0.28, 28, 1, true), '#f2e6c4', 0, -0.12, 0, 0, 0, 0, CLOTH), M(new THREE.CylinderGeometry(0.207, 0.207, 0.05, 28, 1, true), '#8a1a2a', 0, -0.2, 0, 0, 0, 0, CLOTH)),
  honey: () => G(M(lathe([[0.001, -0.3], [0.3, -0.3], [0.34, -0.2], [0.34, 0.18], [0.28, 0.26], [0.001, 0.26]]), '#f2a51a', 0, 0, 0, 0, 0, 0, { roughness: 0.15, transparent: true, opacity: 0.94 }), M(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 28), '#d9a060', 0, 0.31, 0, 0, 0, 0, CLOTH), M(new THREE.TorusGeometry(0.3, 0.02, 6, 28), '#d42f2f', 0, 0.28, 0, Math.PI / 2), M(new THREE.CylinderGeometry(0.345, 0.345, 0.2, 28, 1, true), '#f7eed8', 0, -0.05, 0, 0, 0, 0, CLOTH)),
  chistorra: () => { const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.6, -0.1, 0), new THREE.Vector3(-0.2, 0.25, 0.1), new THREE.Vector3(0.25, 0.05, -0.1), new THREE.Vector3(0.6, 0.3, 0)]); return G(M(new THREE.TubeGeometry(curve, 40, 0.1, 16), '#b8402a', 0, 0, 0, 0, 0, 0, GLOSS)); },
  basket: () => G(M(new THREE.CylinderGeometry(0.5, 0.36, 0.42, 28, 1, true), '#b08650', 0, 0, 0, 0, 0, 0, { side: THREE.DoubleSide, roughness: 0.9 }), M(new THREE.CircleGeometry(0.36, 24), '#8a6a3a', 0, -0.2, 0, -Math.PI / 2), ...[-0.12, 0, 0.12].map(y => M(new THREE.TorusGeometry(0.43 + y * 0.35, 0.018, 6, 32), '#8a6030', 0, y, 0, Math.PI / 2)), M(new THREE.TorusGeometry(0.4, 0.035, 8, 24, Math.PI), '#8a6a3a', 0, 0.2, 0), M(new THREE.SphereGeometry(0.16, 16, 12), '#d9412a', -0.15, 0.15, 0.05, 0, 0, 0, GLOSS), M(new THREE.SphereGeometry(0.15, 16, 12), '#6aa84f', 0.15, 0.14, -0.05, 0, 0, 0, GLOSS)),
  axe: () => { const b = new THREE.Shape(); b.moveTo(0, -0.12); b.lineTo(0.38, -0.25); b.quadraticCurveTo(0.48, 0, 0.38, 0.25); b.lineTo(0, 0.12); b.closePath(); const g = G(M(new THREE.CylinderGeometry(0.05, 0.058, 1.3, 16), '#9a6a3a', 0, 0, 0, 0, 0, 0, { roughness: 0.5 }), M(new THREE.ExtrudeGeometry(b, { depth: 0.06, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015 }), '#c0c6cc', 0.02, 0.5, -0.03, 0, 0, 0, METAL)); g.rotation.z = -0.6; return g; },
  hammer: () => { const g = G(M(new THREE.CylinderGeometry(0.05, 0.055, 1.0, 16), '#9a6a3a', 0, 0, 0), M(new THREE.BoxGeometry(0.22, 0.22, 0.5), '#6d7076', 0, 0.5, 0, 0, 0, 0, METAL)); g.rotation.z = -0.6; return g; },
  anvil: () => { const g = new THREE.Group(); g.add(M(new THREE.BoxGeometry(0.9, 0.22, 0.34), '#55595f', 0, 0.3, 0, 0, 0, 0, METAL)); g.add(M(new THREE.ConeGeometry(0.17, 0.4, 20), '#55595f', 0.62, 0.3, 0, 0, 0, -Math.PI / 2, METAL)); g.add(M(new THREE.BoxGeometry(0.3, 0.3, 0.26), '#44484e', 0, 0.05, 0, 0, 0, 0, METAL)); g.add(M(new THREE.BoxGeometry(0.6, 0.14, 0.4), '#44484e', 0, -0.15, 0, 0, 0, 0, METAL)); g.add(M(new THREE.BoxGeometry(0.4, 0.06, 0.1), '#ff7a2a', 0.05, 0.44, 0, 0, 0, 0, { emissive: new THREE.Color('#ff5a1a'), emissiveIntensity: 1.2 })); g.rotation.y = -0.3; return g; },
  // cencerro: cuerpo trapezoidal de bronce, badajo y correa de cuero
  bell: () => bellIcon(),
  _bell: () => {
    const sh = new THREE.Shape(); sh.moveTo(-0.22, 0.45); sh.lineTo(0.22, 0.45); sh.quadraticCurveTo(0.34, -0.1, 0.36, -0.45); sh.lineTo(-0.36, -0.45); sh.quadraticCurveTo(-0.34, -0.1, -0.22, 0.45);
    const body = new THREE.ExtrudeGeometry(sh, { depth: 0.36, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 4, curveSegments: 12 }); body.translate(0, 0, -0.18);
    return G(M(body, '#b07a34', 0, 0, 0, 0, 0, 0, { metalness: 0.65, roughness: 0.35 }), M(new THREE.BoxGeometry(0.66, 0.04, 0.4), '#2a1c10', 0, -0.47, 0), M(new THREE.SphereGeometry(0.08, 14, 10), '#5a4a3a', 0.05, -0.5, 0.05, 0, 0, 0, METAL),
      M(new THREE.TorusGeometry(0.2, 0.05, 10, 20, Math.PI), '#6b3f24', 0, 0.48, 0, 0, 0, 0, { roughness: 0.55 }), M(new THREE.BoxGeometry(0.46, 0.035, 0.035), '#e2b060', 0, 0.2, 0.235, 0, 0, 0, METAL));
    // (se inclina al usarlo como icono)
  },
  // alpargata: suela de yute trenzado, lona blanca y cintas rojas
  espadrille: () => {
    const g = new THREE.Group();
    const sole = M(new THREE.CapsuleGeometry(0.22, 0.62, 8, 20), '#d8bf8a', 0, 0, 0, Math.PI / 2, 0, 0, { roughness: 0.95 }); sole.scale.set(1, 1, 0.3); g.add(sole);
    for (let i = 0; i < 5; i++) { const t = M(new THREE.TorusGeometry(0.2 - i * 0.03, 0.012, 5, 30), '#b89a62', 0, -0.06 + 0.001 * i, 0, Math.PI / 2, 0, 0); t.scale.set(1, 2.3 - i * 0.2, 1); g.add(t); }
    const up = M(new THREE.SphereGeometry(0.24, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), '#f7f3ea', 0, 0.05, 0.2, 0, 0, 0, CLOTH); up.scale.set(0.95, 0.8, 1.35); g.add(up);
    const heel = M(new THREE.CylinderGeometry(0.21, 0.21, 0.16, 24, 1, true, Math.PI * 0.6, Math.PI * 0.8), '#f7f3ea', 0, 0.12, -0.3, 0, 0, 0, { ...CLOTH, side: THREE.DoubleSide }); g.add(heel);
    for (const s of [-1, 1]) { g.add(M(new THREE.TorusGeometry(0.19, 0.022, 8, 20, Math.PI * 0.9), '#d42f2f', s * 0.02, 0.2, -0.05 + s * 0.08, 0, Math.PI / 2, s * 0.3, GLOSS)); }
    g.add(M(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), '#d42f2f', 0.1, 0.42, -0.2, 0.2, 0, -0.5, GLOSS));
    g.rotation.set(0.25, Math.PI / 2 + 0.35, 0); g.userData.el = 0.4; return g;
  },
  pelota: () => { const g = G(M(new THREE.SphereGeometry(0.45, 36, 24), '#f4efe0', 0, 0, 0, 0, 0, 0, { roughness: 0.55 })); for (const s of [-1, 1]) g.add(M(new THREE.TorusGeometry(0.452, 0.018, 8, 40, Math.PI), '#8a1a1a', 0, 0, 0, 0, s * 0.5, Math.PI / 2)); g.rotation.set(0.3, 0.4, 0); return g; },
  // txapela: boina ladeada con el txertoa (rabito) y el ribete de cuero
  txapela: () => {
    const top = M(new THREE.SphereGeometry(0.52, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2), '#3a4260', 0, 0, 0, 0, 0, 0, { roughness: 0.75 }); top.scale.set(1, 0.34, 1);
    const under = M(new THREE.SphereGeometry(0.52, 36, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 5), '#1a1d26', 0, 0, 0, 0, 0, 0, CLOTH); under.scale.set(1, 0.3, 1);
    const band = M(new THREE.TorusGeometry(0.4, 0.035, 8, 36), '#5a3a22', 0, -0.1, 0, Math.PI / 2, 0, 0, { roughness: 0.5 });
    const stem = M(new THREE.CylinderGeometry(0.018, 0.03, 0.12, 8), '#262a36', 0.02, 0.2, 0, 0, 0, -0.3, CLOTH);
    const g = G(top, under, band, stem); g.rotation.set(0.12, 0, -0.22); g.userData.el = 0.08; return g;
  },
  mask: () => { const g = new THREE.Group(); const f = M(new THREE.SphereGeometry(0.5, 32, 24, Math.PI * 0.15, Math.PI * 0.7, 0.2, 2.4), '#f1e7d6', 0, 0, 0, 0, 0, 0, { side: THREE.DoubleSide, roughness: 0.5 }); f.scale.set(1, 1.2, 0.8); g.add(f); for (const s of [-1, 1]) { g.add(M(new THREE.SphereGeometry(0.08, 14, 10), '#1a1210', s * 0.17, 0.12, 0.36)); g.add(M(new THREE.ConeGeometry(0.08, 0.35, 14), '#d42f2f', s * 0.3, 0.55, 0.1, 0, 0, -s * 0.5, GLOSS)); g.add(M(new THREE.SphereGeometry(0.07, 10, 8), '#f09a8a', s * 0.26, -0.04, 0.33)); } g.add(M(new THREE.TorusGeometry(0.14, 0.03, 8, 16, Math.PI), '#6a2420', 0, -0.15, 0.36, 0, 0, Math.PI)); return g; },
  // trucha: lomo verde oliva con motas, vientre plateado y banda rosada
  fish: () => {
    const body = paint(lathe([[0.001, -0.62], [0.08, -0.52], [0.2, -0.3], [0.26, -0.05], [0.24, 0.2], [0.15, 0.45], [0.05, 0.58], [0.001, 0.62]], 32), (x, y, z, c) => {
      const up = z; c.set('#eef0e8'); if (up > -0.02) c.lerp(new THREE.Color('#e89a9a'), 0.7); if (up > 0.08) c.set('#6f7a3e');
      if (up > 0.02 && (Math.sin(x * 60) * Math.sin(y * 50) > 0.8)) c.set('#2a2a1a'); if (up > -0.02 && up < 0.06 && Math.sin(y * 70) > 0.85) c.set('#d44a4a');
    });
    const g = new THREE.Group(); const b = new THREE.Mesh(body, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.15 })); b.rotation.set(Math.PI / 2, 0, Math.PI / 2); b.scale.set(1, 1, 0.62); g.add(b);
    const tail = new THREE.Shape(); tail.moveTo(0, 0); tail.lineTo(-0.3, 0.22); tail.quadraticCurveTo(-0.24, 0, -0.3, -0.22); tail.closePath();
    g.add(M(new THREE.ExtrudeGeometry(tail, { depth: 0.02, bevelEnabled: false }), '#7a8a4a', -0.58, 0, -0.01));
    g.add(M(new THREE.ConeGeometry(0.1, 0.2, 3), '#7a8a4a', -0.05, 0.25, 0, 0, 0, 0.3));
    g.add(M(new THREE.SphereGeometry(0.055, 14, 10), '#ffffff', 0.44, 0.05, 0.1, 0, 0, 0, GLOSS)); g.add(M(new THREE.SphereGeometry(0.032, 10, 8), '#111111', 0.465, 0.05, 0.13, 0, 0, 0, GLOSS));
    g.rotation.set(0.2, -0.35, 0.1); return g;
  },
  // leche: botella de cristal con leche y tapón azul
  milk: () => {
    const glass = M(lathe([[0.001, -0.45], [0.22, -0.45], [0.24, -0.4], [0.24, 0.12], [0.12, 0.3], [0.1, 0.46], [0.001, 0.46]]), '#dff2ff', 0, 0, 0, 0, 0, 0, { roughness: 0.05, transparent: true, opacity: 0.35 });
    const milk = M(lathe([[0.001, -0.43], [0.21, -0.43], [0.225, -0.38], [0.225, 0.1], [0.11, 0.26], [0.001, 0.26]]), '#fbfaf5', 0, 0, 0, 0, 0, 0, { roughness: 0.35 });
    return G(milk, glass, M(new THREE.CylinderGeometry(0.115, 0.115, 0.08, 24), '#3a8fd6', 0, 0.5, 0, 0, 0, 0, GLOSS), M(new THREE.CylinderGeometry(0.245, 0.245, 0.2, 28, 1, true), '#3a8fd6', 0, -0.15, 0, 0, 0, 0, { roughness: 0.6 }), M(new THREE.CylinderGeometry(0.247, 0.247, 0.07, 28, 1, true), '#ffffff', 0, -0.15, 0, 0, 0, 0, { roughness: 0.6 }));
  },
  // gavilla de trigo atada
  wheat: () => {
    const g = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const a = (i - 3) * 0.14, ear = new THREE.Group(); ear.rotation.z = a; g.add(ear);
      ear.add(M(new THREE.CylinderGeometry(0.012, 0.016, 0.9, 6), '#d9b24a', 0, -0.1, 0));
      for (let k = 0; k < 7; k++) for (const s of [-1, 1]) { const gr = M(new THREE.SphereGeometry(0.035, 10, 8), k % 2 ? '#e8c060' : '#d9a840', s * 0.03, 0.38 + k * 0.045, 0, 0, 0, s * 0.5); gr.scale.set(0.8, 1.5, 0.8); ear.add(gr); }
      for (let k = 0; k < 4; k++) ear.add(M(new THREE.CylinderGeometry(0.003, 0.003, 0.2, 3), '#e8c878', (k - 1.5) * 0.02, 0.75, 0, 0, 0, (k - 1.5) * 0.15));
    }
    g.add(M(new THREE.TorusGeometry(0.07, 0.025, 8, 16), '#a0302a', 0, -0.05, 0, Math.PI / 2 + 0.1));
    g.rotation.set(0.1, 0.3, -0.25); return g;
  },
  // cardo rojo de Corella: pencas blancas atadas con hojas verdes arriba
  cardo: () => {
    const g = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2, st = new THREE.Group(); st.position.set(Math.cos(a) * 0.08, 0, Math.sin(a) * 0.08); st.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12); g.add(st);
      const p = M(new THREE.CylinderGeometry(0.06, 0.075, 0.95, 10, 1, false, 0, Math.PI * 1.4), i % 2 ? '#eef0dc' : '#e2e6cc', 0, 0, 0, 0, a, 0, { roughness: 0.55, side: THREE.DoubleSide }); st.add(p);
      st.add(M(new THREE.CylinderGeometry(0.063, 0.078, 0.2, 10, 1, true, 0, Math.PI * 1.4), '#b04a5a', 0, -0.38, 0, 0, a, 0, { roughness: 0.6, side: THREE.DoubleSide }));
      const leaf = M(new THREE.SphereGeometry(0.12, 12, 8), '#6a9a4a', 0, 0.55, 0, 0, a, 0, { roughness: 0.8 }); leaf.scale.set(0.8, 1.6, 0.35); st.add(leaf);
    }
    g.add(M(new THREE.TorusGeometry(0.17, 0.02, 6, 20), '#c9a24a', 0, -0.1, 0, Math.PI / 2));
    g.rotation.set(0.15, 0, -0.35); return g;
  },
};
// alcachofa de Tudela: capas de brácteas verdes con puntas moradas
CUSTOM.artichoke = () => {
  const g = new THREE.Group();
  for (let ring = 0; ring < 4; ring++) {
    const n = 6 + ring, y = -0.22 + ring * 0.15, rad = 0.26 - ring * 0.06;
    for (let i = 0; i < n; i++) {
      const a = (i + ring * 0.5) / n * Math.PI * 2, b = M(new THREE.SphereGeometry(0.2, 18, 14), ring % 2 ? '#7aa04e' : '#8ab25a', Math.cos(a) * rad, y, Math.sin(a) * rad, 0, 0, 0, { roughness: 0.6 });
      b.scale.set(1.0, 1.3, 0.38); b.lookAt(Math.cos(a) * rad * 4, y - 0.5, Math.sin(a) * rad * 4); b.rotateX(-0.5); g.add(b);
    }
  }
  g.add(M(new THREE.SphereGeometry(0.1, 12, 10), '#9ac06a', 0, 0.36, 0));
  g.add(M(new THREE.CylinderGeometry(0.07, 0.09, 0.3, 12), '#5a7a36', 0, -0.48, 0));
  g.rotation.set(0.3, 0, 0.1); return g;
};
// ovillo de lana con las vueltas del hilo
CUSTOM.wool = () => { const g = G(M(new THREE.SphereGeometry(0.45, 32, 24), '#f2ead8', 0, 0, 0, 0, 0, 0, { roughness: 0.95 })); for (let i = 0; i < 9; i++) g.add(M(new THREE.TorusGeometry(0.45, 0.025, 6, 40), i % 2 ? '#e2d6bc' : '#fbf5e6', 0, 0, 0, i * 0.35, i * 0.7, 0)); g.add(M(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.35, -0.3, 0.2), new THREE.Vector3(0.6, -0.45, 0.25), new THREE.Vector3(0.75, -0.3, 0.1)]), 12, 0.025, 6), '#e2d6bc')); return g; };
CUSTOM.trout = CUSTOM.fish;
// nombre del icono → constructor del modelo
const ITEM = { grapes: 'uva', olive: 'olivo', pepper: 'piquillo', asparagus: 'esparrago', tomato: 'tomate', potato: 'patata', apple: 'manzana', almond: 'almendra', beans: 'pocha', corn: 'corn', herb: 'herb', herbs: 'herb', litter: 'litter', stone: 'stone' };
const ANIMAL = { sheep: 'sheep', latxa: 'sheep', lamb: 'sheep', cow: 'cow', horse: 'pottoka', pottoka: 'pottoka', dog: 'dog', deer: 'corzo', corzo: 'corzo', ciervo: 'ciervo', chamois: 'goat', goat: 'goat', boar: 'jabali', jabali: 'jabali', fox: 'zorro', zorro: 'zorro' };
const SMALL = { ardilla: squirrel, squirrel, pito: woodpecker, woodpecker, lechuza: owl, owl, trucha: trout };
const FLY = { vulture: 'buitre', eagle: 'aguila', stork: 'ciguena' };
export const has3D = (name) => !!(UI3D[name] || CUSTOM[name] || ITEM[name] || ANIMAL[name] || SMALL[name] || BIRDS[name] || FLY[name]);

function build(name) {
  if (UI3D[name]) return UI3D[name]();
  if (BIRDS[name] || FLY[name]) { const b = bird(BIRDS[name] ? name : FLY[name]); b.rotation.set(0.9, 0.5, 0.15); b.userData.el = 0.5; return b; }
  if (SMALL[name]) { const o = SMALL[name](); if (o.isMesh) { const g = new THREE.Group(); g.add(o); g.rotation.y = 1.2; return g; } o.rotation.y = 0.7; return o; }
  if (CUSTOM[name]) return CUSTOM[name]();
  if (ITEM[name]) {
    const o = makeItem(ITEM[name]); o.remove(o.userData.ring);
    // materiales suaves y con algo de brillo, como el resto de iconos
    o.traverse(m => { if (m.isMesh && m.material && !m.material.isMeshStandardMaterial) { const c = m.material.color?.clone() || new THREE.Color('#ffffff'); m.material = mat(c, { roughness: 0.45, vertexColors: !!m.geometry.attributes.color }); } });
    o.rotation.y = 0.5; return o;
  }
  if (ANIMAL[name]) {
    let s = 3; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const q = quadruped(SPECIES[ANIMAL[name]], rnd);
    if (name === 'lamb') q.root.scale.setScalar(0.7);
    q.root.rotation.y = 0.9; q.head.rotation.x = -0.15; q.root.userData.el = 0.22;
    return q.root;
  }
  return null;
}
// Contorno: silueta oscura uniforme alrededor del modelo (mismo trazo que los iconos dibujados)
function sticker(src) {
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
  const small = document.createElement('canvas'); small.width = small.height = S; small.getContext('2d').drawImage(src, 0, 0, S, S);
  const t = document.createElement('canvas'); t.width = t.height = S; const x = t.getContext('2d'); x.drawImage(small, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#1f1a26'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; g.drawImage(t, Math.cos(a) * 5, Math.sin(a) * 5); }
  g.drawImage(small, 0, 0);
  return c.toDataURL('image/png');
}
// Materiales suaves con algo de brillo (volumen real en lugar de tintas planas)
function soften(root) {
  root.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const m = o.material;
    if (m.isMeshStandardMaterial) { m.roughness = Math.min(m.roughness ?? 0.5, 0.75); m.envMapIntensity = 1; }
    else { const c = m.color ? m.color.clone() : new THREE.Color('#fff'); o.material = new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, vertexColors: !!m.vertexColors, map: m.map || null, transparent: m.transparent, opacity: m.opacity ?? 1, side: m.side }); }
  });
}
export const icon3DReady = (name) => cache.get(name) || getImg('i:' + name) || null;
export function icon3D(name) {
  if (cache.has(name)) return cache.get(name);
  const st = getImg('i:' + name); if (st) { cache.set(name, st); return st; }
  let out = '';
  try {
    const obj = build(name);
    if (obj) {
      if (!R) setup(); else offscreen(SS, SS, THREE.NeutralToneMapping);
      soften(obj);
      const holder = new THREE.Group(); holder.add(obj); scene.add(holder);
      holder.updateMatrixWorld(true);
      // caja de lo que se ve (sin contornos ocultos ni ayudas invisibles)
      const box = new THREE.Box3(), tmp = new THREE.Box3();
      obj.traverseVisible(o => { if (o.isMesh && !o.userData.outline) { o.geometry.computeBoundingBox(); tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); box.union(tmp); } });
      const ctr = box.getCenter(new THREE.Vector3());
      const sph = box.getBoundingSphere(new THREE.Sphere());
      const el = obj.userData.el ?? 0.3;
      // encuadre: la esfera envolvente ocupa casi todo el marco (deja sitio a la pegatina)
      let dist = sph.radius / Math.sin(THREE.MathUtils.degToRad(11)) * 0.9;
      const dir = new THREE.Vector3(0.22, el, 0.95).normalize(), look = ctr.clone();
      const corners = []; for (let i = 0; i < 8; i++) corners.push(new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z));
      for (let it = 0; it < 3; it++) {
        cam.position.copy(look).addScaledVector(dir, dist); cam.lookAt(look); cam.updateMatrixWorld();
        let x0 = 1, x1 = -1, y0 = 1, y1 = -1; for (const p of corners) { const q = p.clone().project(cam); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
        const ext = Math.max(x1 - x0, y1 - y0) / 2, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
        const half = Math.tan(THREE.MathUtils.degToRad(11)) * dist;
        look.addScaledVector(right, cx * half).addScaledVector(up, cy * half);
        dist *= ext / 0.8;
      }
      cam.position.copy(look).addScaledVector(dir, dist); cam.lookAt(look);
      R.setClearColor(0, 0); R.render(scene, cam);
      // reencuadre fino según los píxeles realmente dibujados
      {
        const N = 96, t = document.createElement('canvas'); t.width = t.height = N; const tg = t.getContext('2d', { willReadFrequently: true }); tg.drawImage(R.domElement, 0, 0, SS, SS, 0, 0, N, N);
        const d = tg.getImageData(0, 0, N, N).data; let x0 = N, x1 = -1, y0 = N, y1 = -1;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (d[(y * N + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        if (x1 > x0) {
          const nx0 = x0 / N * 2 - 1, nx1 = (x1 + 1) / N * 2 - 1, ny0 = 1 - (y1 + 1) / N * 2, ny1 = 1 - y0 / N * 2;
          const ext = Math.max(nx1 - nx0, ny1 - ny0) / 2, cx = (nx0 + nx1) / 2, cy = (ny0 + ny1) / 2;
          cam.updateMatrixWorld();
          const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1), half = Math.tan(THREE.MathUtils.degToRad(11)) * dist;
          look.addScaledVector(right, cx * half).addScaledVector(up, cy * half); dist *= ext / 0.84;
          cam.position.copy(look).addScaledVector(dir, dist); cam.lookAt(look);
          R.render(scene, cam);
        }
      }
      out = sticker(offscreenCanvas());
      scene.remove(holder);
      holder.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }
  } catch (e) { console.warn('icono 3D', name, e); }
  cache.set(name, out); if (out) putImg('i:' + name, out);
  return out;
}
