// Objetos recogibles en 3D (cosechas, hierbas, leche, basura…) y aros de carrera
import * as THREE from 'three';

const M = new Map();
const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!M.has(k)) M.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, ...o })); return M.get(k); };
const mesh = (g, c, x = 0, y = 0, z = 0, o) => { const m = new THREE.Mesh(g, mat(c, o)); m.position.set(x, y, z); m.castShadow = true; return m; };

// Crea un objeto recogible; devuelve un grupo con un aro brillante en el suelo
export function makeItem(kind) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const add = (...a) => body.add(mesh(...a));
  switch (kind) {
    case 'uva': case 'grapes': for (let i = 0; i < 14; i++) { const r = Math.floor(i / 4); add(new THREE.SphereGeometry(0.07, 8, 6), '#6a2d7a', (i % 4 - 1.5) * 0.1 * (1 - r * 0.2), 0.45 - r * 0.1, ((i * 7) % 3 - 1) * 0.06); } add(new THREE.CylinderGeometry(0.015, 0.015, 0.15, 5), '#6b4a2e', 0, 0.58, 0); add(new THREE.CircleGeometry(0.12, 5), '#5a8a3a', 0.08, 0.58, 0, { side: THREE.DoubleSide }); break;
    case 'olivo': case 'olive': add(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 5), '#7a6a4a', 0, 0.35, 0).rotation.z = 1.2; for (let i = 0; i < 7; i++) add(new THREE.SphereGeometry(0.05, 8, 6), i % 2 ? '#3b4a1a' : '#5a6a2a', -0.2 + i * 0.07, 0.3 + (i % 3) * 0.04, 0.03); break;
    case 'piquillo': case 'pepper': { const c = mesh(new THREE.ConeGeometry(0.1, 0.36, 10), '#c8241a', 0, 0.35, 0); c.rotation.z = Math.PI; body.add(c); add(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 6), '#3d7a2a', 0, 0.56, 0); break; }
    case 'esparrago': for (let i = 0; i < 5; i++) add(new THREE.CylinderGeometry(0.03, 0.035, 0.45, 8), '#f0ead0', (i - 2) * 0.07, 0.3, 0); add(new THREE.TorusGeometry(0.12, 0.02, 5, 12), '#d42f2f', 0, 0.25, 0).rotation.x = Math.PI / 2; break;
    case 'alcachofa': for (let i = 0; i < 4; i++) add(new THREE.ConeGeometry(0.16 - i * 0.03, 0.14, 8), i % 2 ? '#6a8a4a' : '#557a3a', 0, 0.28 + i * 0.07, 0); add(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6), '#557a3a', 0, 0.12, 0); break;
    case 'cardo': for (let i = 0; i < 6; i++) { const s = mesh(new THREE.BoxGeometry(0.06, 0.55, 0.04), '#dfe8cf', Math.cos(i) * 0.06, 0.35, Math.sin(i) * 0.06); s.rotation.z = (i - 2.5) * 0.06; body.add(s); } break;
    case 'tomate': case 'tomato': add(new THREE.SphereGeometry(0.16, 12, 10), '#d9412a', 0, 0.35, 0); add(new THREE.ConeGeometry(0.08, 0.05, 5), '#3d7a2a', 0, 0.5, 0); break;
    case 'trigo': case 'wheat': add(new THREE.CylinderGeometry(0.12, 0.16, 0.6, 10), '#e2c46a', 0, 0.4, 0); add(new THREE.TorusGeometry(0.13, 0.025, 5, 12), '#a57a45', 0, 0.38, 0).rotation.x = Math.PI / 2; for (let i = 0; i < 8; i++) add(new THREE.SphereGeometry(0.035, 6, 5), '#d9b24a', Math.cos(i) * 0.1, 0.75, Math.sin(i) * 0.1); break;
    case 'patata': case 'potato': for (let i = 0; i < 4; i++) { const p = mesh(new THREE.SphereGeometry(0.09, 8, 6), '#b8905a', (i % 2 - 0.5) * 0.15, 0.25 + Math.floor(i / 2) * 0.1, (i % 3 - 1) * 0.06); p.scale.set(1.2, 0.9, 1); body.add(p); } break;
    case 'manzana': case 'apple': add(new THREE.SphereGeometry(0.15, 12, 10), '#c8301e', 0, 0.35, 0); add(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 5), '#5a3a22', 0, 0.52, 0); break;
    case 'almendra': for (let i = 0; i < 5; i++) { const a = mesh(new THREE.SphereGeometry(0.06, 8, 6), '#b8844a', (i - 2) * 0.08, 0.3, 0); a.scale.set(0.8, 1.3, 0.6); body.add(a); } break;
    case 'pocha': for (let i = 0; i < 3; i++) { const p = mesh(new THREE.CapsuleGeometry(0.04, 0.3, 4, 8), '#a8c07a', (i - 1) * 0.08, 0.35, 0); p.rotation.z = (i - 1) * 0.3; body.add(p); } break;
    case 'corn': case 'maiz': add(new THREE.CylinderGeometry(0.08, 0.06, 0.4, 10), '#f2c94c', 0, 0.35, 0); for (const s of [-1, 1]) { const l = mesh(new THREE.ConeGeometry(0.07, 0.42, 4), '#7ab04a', s * 0.07, 0.3, 0); l.rotation.z = s * 0.25; body.add(l); } break;
    case 'milk': add(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 14), '#c9ced3', 0, 0.3, 0, { metalness: 0.6, roughness: 0.3 }); add(new THREE.CylinderGeometry(0.09, 0.15, 0.12, 14), '#c9ced3', 0, 0.61, 0, { metalness: 0.6, roughness: 0.3 }); add(new THREE.TorusGeometry(0.1, 0.02, 6, 12, Math.PI), '#6b6f75', 0, 0.7, 0); break;
    case 'herb': case 'herbs': for (let i = 0; i < 5; i++) { const l = mesh(new THREE.SphereGeometry(0.08, 6, 5), '#5f9a3a', Math.cos(i * 1.3) * 0.08, 0.25 + i * 0.05, Math.sin(i * 1.3) * 0.08); l.scale.set(0.6, 1.4, 0.4); body.add(l); } add(new THREE.SphereGeometry(0.05, 8, 6), '#f2c230', 0, 0.55, 0); break;
    case 'litter': add(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 10), '#9aa3ab', 0, 0.2, 0, { metalness: 0.5, roughness: 0.4 }); add(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 8), '#6aa0c0', 0.18, 0.18, 0.05, { transparent: true, opacity: 0.8 }).rotation.z = 1.4; break;
    case 'lamb': { add(new THREE.SphereGeometry(0.28, 10, 8), '#fbf8f0', 0, 0.45, 0); add(new THREE.SphereGeometry(0.14, 8, 6), '#f1d7b8', 0, 0.55, 0.28); for (const [x, z] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) add(new THREE.CylinderGeometry(0.035, 0.035, 0.26, 5), '#3b3030', x, 0.14, z); break; }
    case 'stone': add(new THREE.DodecahedronGeometry(0.22, 0), '#9a948a', 0, 0.3, 0); break;
    case 'shard': { const c = mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.12, 9, 1, true, 0, 1.9), '#a8683e', 0, 0.25, 0, { side: THREE.DoubleSide }); c.rotation.x = 0.5; body.add(c); for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(0.015, 0.015, 0.06), '#7a4a2a', Math.cos(i * 0.6) * 0.19, 0.24 + i * 0.03, Math.sin(i * 0.6) * 0.19 + 0.02); break; }
    case 'arrow': { const t = mesh(new THREE.ConeGeometry(0.08, 0.28, 3), '#8a8478', 0, 0.3, 0, { roughness: 0.4, flatShading: true }); t.scale.z = 0.35; body.add(t); add(new THREE.BoxGeometry(0.05, 0.05, 0.03), '#6a645a', 0, 0.15, 0); break; }
    case 'beads': for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; add(new THREE.SphereGeometry(0.035, 8, 6), i % 3 ? '#e8dcc4' : '#6a8a8a', Math.cos(a) * 0.15, 0.3 + Math.sin(a) * 0.15, 0); } break;
    case 'berries': { for (let i = 0; i < 6; i++) { const l = mesh(new THREE.SphereGeometry(0.16, 7, 5), i % 2 ? '#3f6a2a' : '#4f7a32', Math.cos(i) * 0.18, 0.22 + (i % 3) * 0.08, Math.sin(i) * 0.18); l.scale.set(1, 0.7, 1); body.add(l); } for (let i = 0; i < 9; i++) add(new THREE.SphereGeometry(0.035, 6, 5), i % 3 ? '#2a0f30' : '#8a1f3a', Math.cos(i * 2.1) * 0.24, 0.3 + (i % 4) * 0.05, Math.sin(i * 2.1) * 0.24); break; }
    case 'hazelnut': { for (let i = 0; i < 5; i++) { const l = mesh(new THREE.SphereGeometry(0.14, 7, 5), '#5f8a3a', Math.cos(i * 1.3) * 0.14, 0.32 + (i % 2) * 0.1, Math.sin(i * 1.3) * 0.14); l.scale.set(1, 0.6, 1); body.add(l); } for (let i = 0; i < 3; i++) add(new THREE.SphereGeometry(0.05, 8, 6), '#a0682e', (i - 1) * 0.1, 0.2, 0.16); break; }
    case 'wool': add(new THREE.SphereGeometry(0.2, 10, 8), '#f0e8d8', 0, 0.3, 0); break;
    case 'shell': { const s = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12, 0, Math.PI), mat('#f2c94c', { side: THREE.DoubleSide })); s.position.y = 0.3; body.add(s); break; }
    default: add(new THREE.OctahedronGeometry(0.2, 0), '#f5c542', 0, 0.35, 0, { emissive: new THREE.Color('#a07a1a') });
  }
  body.userData.spin = true;
  // aro de brillo en el suelo
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.62, 28), new THREE.MeshBasicMaterial({ color: '#ffe38a', transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; g.add(ring);
  g.userData.body = body; g.userData.ring = ring;
  return g;
}

// Aro de control de carrera
export function makeGate(color = '#f5c542') {
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.14, 8, 32), new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: 0.6, roughness: 0.4 }));
  t.position.y = 2.2; g.add(t);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.3, 8), mat('#6b4a2e')); p.position.set(s * 2.1, 1.1, 0); g.add(p); }
  const f = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })); f.position.set(2.5, 2.4, 0); g.add(f);
  g.userData.torus = t;
  return g;
}

// Banco de trabajo del oficio (yunque, tronco, piedra…)
export function makeWorkbench(kind) {
  const g = new THREE.Group();
  if (kind === 'herrero' || kind === 'cantero') {
    g.add(mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.6, 10), '#6b4a2e', 0, 0.3, 0));
    const a = mesh(new THREE.BoxGeometry(0.9, 0.3, 0.35), '#3a3d42', 0, 0.75, 0, { metalness: 0.7, roughness: 0.35 }); g.add(a);
    { const m_ = mesh(new THREE.ConeGeometry(0.17, 0.4, 4), '#3a3d42', 0.6, 0.78, 0, { metalness: 0.7, roughness: 0.35 }); m_.rotation.z = -Math.PI / 2; g.add(m_); }
    if (kind === 'herrero') { const hot = mesh(new THREE.BoxGeometry(0.4, 0.06, 0.1), '#ff7a2a', 0, 0.94, 0, { emissive: new THREE.Color('#ff5a1a'), emissiveIntensity: 1.2 }); g.add(hot); g.userData.hot = hot; }
    else g.add(mesh(new THREE.BoxGeometry(0.6, 0.4, 0.4), '#c9bda8', 1.2, 0.2, 0.2));
  } else if (kind === 'aizkolari') {
    g.add(mesh(new THREE.CylinderGeometry(0.4, 0.42, 1.2, 14), '#a57a45', 0, 0.6, 0).rotateZ(Math.PI / 2));
    g.add(mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.02, 14), '#e2c48a', 0.61, 0.6, 0).rotateZ(Math.PI / 2));
  } else if (kind === 'harrijasotzaile') {
    const s = mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.55, 12), '#8f8a80', 0, 0.28, 0); g.add(s);
  } else if (kind === 'palomero') {
    for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.06, 0.08, 4, 6), '#6b4a2e', s * 2, 2, 0));
    const net = new THREE.Mesh(new THREE.PlaneGeometry(4, 3.4, 8, 6), new THREE.MeshBasicMaterial({ color: '#8a7a5a', wireframe: true })); net.position.y = 2.2; g.add(net);
  } else if (kind === 'cestero') {
    g.add(mesh(new THREE.CylinderGeometry(0.45, 0.32, 0.45, 12, 1, true), '#b08650', 0, 0.23, 0));
    { const m_ = mesh(new THREE.TorusGeometry(0.45, 0.04, 6, 16), '#8a6a3a', 0, 0.46, 0); m_.rotation.x = Math.PI / 2; g.add(m_); }
    for (let i = 0; i < 7; i++) { const m_ = mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 4), '#a57a45', 0.9, 0.05, -0.3 + i * 0.1); m_.rotation.z = Math.PI / 2; g.add(m_); }
  } else if (kind === 'carbonero') {
    g.add(mesh(new THREE.ConeGeometry(1.3, 1.3, 14), '#4a3a2c', 0, 0.65, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.25, 8), '#2a2420', 0, 1.35, 0));
    for (let i = 0; i < 6; i++) { const m_ = mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 6), '#8a6a45', 1.7, 0.08 + (i % 3) * 0.14, -0.3 + (i >> 1) * 0.25); m_.rotation.z = Math.PI / 2; g.add(m_); }
  } else if (kind === 'hilandera') {
    g.add(mesh(new THREE.BoxGeometry(0.9, 0.08, 0.3), '#8a5a32', 0, 0.45, 0));
    g.add(mesh(new THREE.TorusGeometry(0.35, 0.03, 6, 20), '#6b4a2e', -0.2, 0.9, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5), '#6b4a2e', 0.3, 0.9, 0));
    g.add(mesh(new THREE.SphereGeometry(0.16, 8, 6), '#f0e8d8', 0.3, 1.35, 0));
    for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 5), '#6b4a2e', s * 0.35, 0.22, 0));
  } else if (kind === 'panadero') {
    g.add(mesh(new THREE.BoxGeometry(1.4, 0.8, 1.2), '#b9a58a', 0, 0.4, 0));
    g.add(mesh(new THREE.SphereGeometry(0.62, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#c9b08a', 0, 0.8, 0));
    g.add(mesh(new THREE.BoxGeometry(0.4, 0.3, 0.05), '#2a1a12', 0, 0.95, 0.6));
    g.add(mesh(new THREE.SphereGeometry(0.16, 8, 6), '#d9a05a', 0.5, 0.88, 0.35));
  } else if (kind === 'tonelero') {
    g.add(mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.9, 14), '#8a5a32', 0, 0.45, 0));
    for (const y of [0.12, 0.45, 0.78]) { const m_ = mesh(new THREE.TorusGeometry(0.42, 0.025, 5, 16), '#3a3d42', 0, y, 0); m_.rotation.x = Math.PI / 2; g.add(m_); }
  } else if (kind === 'alpargatero') {
    g.add(mesh(new THREE.BoxGeometry(1.4, 0.8, 0.7), '#8a5a32', 0, 0.4, 0));
    for (let i = 0; i < 3; i++) g.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 12), '#d9c79a', -0.4 + i * 0.4, 0.83, 0));
  }
  return g;
}

// Recuerdo de un personaje: pedestal de piedra con busto de bronce (figura genérica, sin parecido con nadie)
// o estela, y el objeto que lo identifica. Placa dorada delante.
export function makeMemorial(attr, stele) {
  const g = new THREE.Group(), BR = '#8a6a3c', bronze = { metalness: 0.75, roughness: 0.38 };
  g.add(mesh(new THREE.BoxGeometry(1.5, 0.22, 1.5), '#a8a092', 0, 0.11, 0));
  g.add(mesh(new THREE.BoxGeometry(1.0, 1.25, 1.0), '#c9c0ae', 0, 0.85, 0));
  g.add(mesh(new THREE.BoxGeometry(1.18, 0.14, 1.18), '#b8af9c', 0, 1.53, 0));
  g.add(mesh(new THREE.BoxGeometry(0.62, 0.36, 0.03), '#d9b24a', 0, 0.95, 0.51, { metalness: 0.8, roughness: 0.3 }));
  if (stele) {
    // estela discoidal, como las de los valles
    const d = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.16, 28), BR, 0, 2.25, 0, bronze); d.rotation.x = Math.PI / 2; g.add(d);
    g.add(mesh(new THREE.BoxGeometry(0.4, 0.55, 0.14), BR, 0, 1.85, 0, bronze));
    const r = mesh(new THREE.TorusGeometry(0.38, 0.035, 6, 28), '#a8844c', 0, 2.25, 0.09, bronze); g.add(r);
  } else {
    // busto: hombros, cuello y cabeza lisa
    const sh = mesh(new THREE.SphereGeometry(0.42, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), BR, 0, 1.6, 0, bronze); sh.scale.set(1, 0.7, 0.62); g.add(sh);
    g.add(mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.22, 10), BR, 0, 1.95, 0, bronze));
    const h = mesh(new THREE.SphereGeometry(0.22, 18, 14), BR, 0, 2.2, 0.02, bronze); h.scale.set(0.9, 1.08, 1); g.add(h);
  }
  // el objeto del personaje, apoyado sobre el pedestal, delante
  const A = new THREE.Group(); A.position.set(0.38, 1.62, 0.32); g.add(A);
  const a = (geo, c, x, y, z, o) => { const m_ = mesh(geo, c, x, y, z, o || bronze); A.add(m_); return m_; };
  switch (attr) {
    case 'violin': { const b = a(new THREE.SphereGeometry(0.1, 10, 8), BR, 0, 0.05, 0); b.scale.set(0.75, 0.3, 1.3); a(new THREE.BoxGeometry(0.03, 0.03, 0.22), '#3a2a1a', 0, 0.07, -0.2); break; }
    case 'bike': for (const z of [-0.12, 0.12]) { const w = a(new THREE.TorusGeometry(0.08, 0.012, 5, 14), '#3a3d42', 0, 0.09, z); w.rotation.y = Math.PI / 2; } a(new THREE.BoxGeometry(0.02, 0.02, 0.24), '#c8222a', 0, 0.12, 0, {}); break;
    case 'crown': { a(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 12, 1, true), '#d9b24a', 0, 0.04, 0, { metalness: 0.9, roughness: 0.25, side: THREE.DoubleSide }); for (let i = 0; i < 5; i++) a(new THREE.ConeGeometry(0.02, 0.06, 4), '#d9b24a', Math.cos(i * 1.256) * 0.09, 0.1, Math.sin(i * 1.256) * 0.09, { metalness: 0.9, roughness: 0.25 }); break; }
    case 'chain': for (let i = 0; i < 4; i++) { const l = a(new THREE.TorusGeometry(0.04, 0.012, 5, 10), '#d9b24a', (i - 1.5) * 0.065, 0.02, 0, { metalness: 0.9, roughness: 0.25 }); l.rotation.x = i % 2 ? Math.PI / 2 : 0; } break;
    case 'ship': { a(new THREE.BoxGeometry(0.1, 0.05, 0.26), BR, 0, 0.03, 0); a(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 4), BR, 0, 0.15, 0); a(new THREE.PlaneGeometry(0.14, 0.12), '#efe6cf', 0, 0.16, 0.01, { side: THREE.DoubleSide }); break; }
    case 'espadrille': { const s = a(new THREE.SphereGeometry(0.06, 10, 6), '#efe6cf', 0, 0.03, 0, {}); s.scale.set(0.8, 0.5, 1.8); a(new THREE.BoxGeometry(0.1, 0.012, 0.22), '#c9a27a', 0, 0.005, 0, {}); break; }
    case 'scales': { a(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 5), BR, 0, 0.09, 0); a(new THREE.BoxGeometry(0.22, 0.01, 0.01), BR, 0, 0.18, 0); for (const s of [-1, 1]) a(new THREE.CylinderGeometry(0.04, 0.03, 0.015, 10), BR, s * 0.1, 0.12, 0); break; }
    case 'score': case 'book': default: { const b = a(new THREE.BoxGeometry(0.2, 0.04, 0.15), '#efe6cf', 0, 0.02, 0, {}); b.rotation.y = 0.3; a(new THREE.BoxGeometry(0.21, 0.02, 0.16), attr === 'score' ? '#2a2a2a' : '#7a2f3a', 0, -0.005, 0, {}).rotation.y = 0.3; }
  }
  // aro dorado: se apaga cuando ya se conoce la historia
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.2, 32), new THREE.MeshBasicMaterial({ color: '#ffe38a', transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring); g.userData.ring = ring;
  return g;
}
