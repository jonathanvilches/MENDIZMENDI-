// Iconos 3D de la interfaz (navegación, logros, historia): piezas redondeadas con bisel, como juguetes.
import * as THREE from 'three';

const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.42, metalness: 0, ...o });
const GOLD = { metalness: 0.35, roughness: 0.3 }, SOFT = { roughness: 0.7 };
const M = (g, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, o) => { const m = new THREE.Mesh(g, mat(c, o)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m; };
const G = (...ch) => { const g = new THREE.Group(); ch.forEach(c => g.add(c)); return g; };
// extrusión con bisel redondeado
const X = (shape, depth = 0.2, bev = 0.05, seg = 5) => { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: seg, curveSegments: 24 }); g.translate(0, 0, -depth / 2); return g; };
const RB = (w, h, d, r = 0.06) => { const s = new THREE.Shape(); const x = -w / 2 + r, y = -h / 2 + r; s.moveTo(x, y - r + r); s.absarc(w / 2 - r, -h / 2 + r, r, -Math.PI / 2, 0); s.absarc(w / 2 - r, h / 2 - r, r, 0, Math.PI / 2); s.absarc(-w / 2 + r, h / 2 - r, r, Math.PI / 2, Math.PI); s.absarc(-w / 2 + r, -h / 2 + r, r, Math.PI, Math.PI * 1.5); return X(s, Math.max(0.001, d - r * 0.8), r * 0.4, 4); };
const star = (n, R, r) => { const s = new THREE.Shape(); for (let i = 0; i <= n * 2; i++) { const a = Math.PI / 2 + i * Math.PI / n, k = i % 2 ? r : R; const x = Math.cos(a) * k, y = Math.sin(a) * k; i ? s.lineTo(x, y) : s.moveTo(x, y); } return s; };
const circle = (r) => { const s = new THREE.Shape(); s.absarc(0, 0, r, 0, Math.PI * 2); return s; };
const tilt = (g, rx = 0.25, ry = -0.35, rz = 0) => { g.rotation.set(rx, ry, rz); return g; };

export const UI3D = {
  home: () => {
    const roof = new THREE.Shape(); roof.moveTo(-0.62, 0); roof.lineTo(0, 0.5); roof.lineTo(0.62, 0); roof.lineTo(0.5, -0.06); roof.lineTo(0, 0.36); roof.lineTo(-0.5, -0.06); roof.closePath();
    const g = G(M(RB(0.8, 0.6, 0.62, 0.05), '#fff3dd', 0, -0.2, 0, 0, 0, 0, SOFT), M(X(roof, 0.8, 0.05), '#FF6347', 0, 0.12, 0),
      M(RB(0.2, 0.32, 0.1, 0.04), '#8a4a26', 0.12, -0.34, 0.32), M(RB(0.16, 0.16, 0.08, 0.03), '#00BFFF', -0.2, -0.16, 0.32, 0, 0, 0, { roughness: 0.2 }),
      M(RB(0.12, 0.26, 0.12, 0.03), '#b04a3a', 0.28, 0.48, -0.1));
    return tilt(g, 0.2, -0.45);
  },
  map: () => {
    const g = new THREE.Group(), cols = ['#f4e3b8', '#ead39c', '#f4e3b8'];
    for (let i = 0; i < 3; i++) { const p = M(new THREE.BoxGeometry(0.36, 0.92, 0.04), cols[i], (i - 1) * 0.34, 0, i === 1 ? -0.07 : 0, 0, (i === 1 ? 0.35 : -0.35), 0, SOFT); g.add(p); }
    const path = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.44, -0.3, 0.05), new THREE.Vector3(-0.2, 0.05, 0.0), new THREE.Vector3(0.05, -0.15, 0.0), new THREE.Vector3(0.28, 0.2, 0.05), new THREE.Vector3(0.42, 0.3, 0.07)]);
    g.add(M(new THREE.TubeGeometry(path, 40, 0.028, 8), '#FF6347', 0, 0, 0.03));
    g.add(M(new THREE.SphereGeometry(0.09, 16, 12), '#3aa05a', -0.3, 0.26, 0.06, 0, 0, 0, SOFT), M(new THREE.SphereGeometry(0.07, 16, 12), '#3aa05a', 0.3, -0.25, 0.08, 0, 0, 0, SOFT));
    const pin = UI3D.pin(); pin.scale.setScalar(0.42); pin.position.set(0.42, 0.52, 0.12); pin.rotation.set(0, 0, 0); g.add(pin);
    return tilt(g, 0.15, -0.3);
  },
  pin: () => {
    const s = new THREE.Shape(); s.moveTo(0, -0.6); s.bezierCurveTo(0.12, -0.3, 0.42, -0.1, 0.42, 0.18); s.absarc(0, 0.18, 0.42, 0, Math.PI, false); s.bezierCurveTo(-0.42, -0.1, -0.12, -0.3, 0, -0.6);
    return tilt(G(M(X(s, 0.22, 0.07), '#FF6347'), M(new THREE.CylinderGeometry(0.15, 0.15, 0.4, 24), '#ffffff', 0, 0.18, 0, Math.PI / 2)), 0.1, -0.3);
  },
  church: () => {
    const g = new THREE.Group();
    g.add(M(RB(0.56, 0.5, 0.5, 0.04), '#f1e2c4', -0.12, -0.3, 0, 0, 0, 0, SOFT));
    const r = new THREE.Shape(); r.moveTo(-0.34, 0); r.lineTo(0, 0.26); r.lineTo(0.34, 0); r.closePath(); g.add(M(X(r, 0.5, 0.03), '#c95a42', -0.12, -0.05, 0));
    g.add(M(RB(0.3, 0.9, 0.3, 0.04), '#e6d3ae', 0.3, -0.1, 0, 0, 0, 0, SOFT));
    g.add(M(new THREE.ConeGeometry(0.24, 0.42, 4), '#6f7c8a', 0.3, 0.56, 0, 0, Math.PI / 4, 0, { roughness: 0.4 }));
    g.add(M(new THREE.BoxGeometry(0.035, 0.22, 0.035), '#FFD700', 0.3, 0.86, 0, 0, 0, 0, GOLD), M(new THREE.BoxGeometry(0.14, 0.035, 0.035), '#FFD700', 0.3, 0.9, 0, 0, 0, 0, GOLD));
    const d = new THREE.Shape(); d.moveTo(-0.08, 0); d.lineTo(0.08, 0); d.lineTo(0.08, 0.14); d.absarc(0, 0.14, 0.08, 0, Math.PI); d.closePath(); g.add(M(X(d, 0.04, 0.01), '#7a4424', -0.12, -0.55, 0.26));
    g.add(M(new THREE.TorusGeometry(0.07, 0.02, 8, 20), '#ffffff', 0.3, 0.16, 0.16), M(new THREE.CircleGeometry(0.07, 20), '#00BFFF', 0.3, 0.16, 0.155));
    return tilt(g, 0.12, -0.45);
  },
  person: () => {
    const g = new THREE.Group();
    const body = M(new THREE.SphereGeometry(0.42, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2), '#00BFFF', 0, -0.55, 0); body.scale.set(1, 0.95, 0.75); g.add(body);
    g.add(M(new THREE.SphereGeometry(0.3, 32, 24), '#f3cfae', 0, 0.02, 0, 0, 0, 0, SOFT));
    const hair = M(new THREE.SphereGeometry(0.315, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.48), '#6b3a1e', 0, 0.03, -0.02, -0.35, 0, 0, SOFT); g.add(hair);
    for (const s of [-1, 1]) g.add(M(new THREE.SphereGeometry(0.045, 12, 10), '#2a1a12', s * 0.1, 0.02, 0.27, 0, 0, 0, { roughness: 0.2 }));
    g.add(M(new THREE.TorusGeometry(0.07, 0.018, 8, 16, Math.PI), '#b0413e', 0, -0.07, 0.26, 0, 0, Math.PI));
    g.add(M(new THREE.TorusGeometry(0.2, 0.05, 10, 24), '#FF6347', 0, -0.24, 0.02, Math.PI / 2 + 0.2));
    return tilt(g, 0.05, -0.3);
  },
  peak: () => {
    const m = new THREE.ConeGeometry(0.62, 0.95, 7, 3); const p = m.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 0.4 && y > -0.4) { p.setX(i, p.getX(i) * (1 + Math.sin(i * 7) * 0.08)); p.setZ(i, p.getZ(i) * (1 + Math.cos(i * 5) * 0.08)); } } m.computeVertexNormals();
    const g = G(M(m, '#7a8aa0', 0, 0, 0, 0, 0, 0, { roughness: 0.6, flatShading: true }), M(new THREE.ConeGeometry(0.25, 0.36, 7), '#ffffff', 0, 0.3, 0, 0, 0, 0, { roughness: 0.4, flatShading: true }),
      M(new THREE.ConeGeometry(0.4, 0.6, 6), '#5d6e86', 0.45, -0.18, 0.1, 0, 0.4, 0, { roughness: 0.6, flatShading: true }), M(new THREE.CylinderGeometry(0.72, 0.8, 0.12, 24), '#4aa84f', 0.1, -0.5, 0, 0, 0, 0, SOFT));
    for (const [x, z] of [[-0.4, 0.3], [0.62, 0.28], [0.1, 0.5]]) g.add(M(new THREE.ConeGeometry(0.09, 0.26, 8), '#2e7a3a', x, -0.32, z, 0, 0, 0, SOFT));
    return tilt(g, 0.15, -0.2);
  },
  leaf: () => {
    const s = new THREE.Shape(); s.moveTo(0, -0.55); s.bezierCurveTo(0.5, -0.3, 0.5, 0.3, 0, 0.6); s.bezierCurveTo(-0.5, 0.3, -0.5, -0.3, 0, -0.55);
    const g = G(M(X(s, 0.06, 0.04), '#5bbf4a', 0, 0, 0, 0, 0, 0, { roughness: 0.45 }), M(new THREE.CylinderGeometry(0.018, 0.024, 1.25, 8), '#2f7a2e', 0, -0.05, 0.07), M(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), '#2f7a2e', 0, -0.72, 0, 0, 0, 0.2));
    for (const s2 of [-1, 1]) for (const y of [-0.2, 0.08, 0.32]) g.add(M(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), '#2f7a2e', s2 * 0.1, y, 0.07, 0, 0, -s2 * 0.9));
    return tilt(g, 0.1, -0.4, -0.5);
  },
  star: () => tilt(G(M(X(star(5, 0.6, 0.27), 0.2, 0.08), '#FFD700', 0, 0, 0, 0, 0, 0, GOLD)), 0.2, -0.3),
  sparkle: () => tilt(G(M(X(star(4, 0.62, 0.16), 0.12, 0.06), '#FFD700', 0, 0, 0, 0, 0, 0, GOLD), M(X(star(4, 0.22, 0.06), 0.06, 0.03), '#fff3a0', 0.45, 0.42, 0.05, 0, 0, 0, GOLD)), 0.15, -0.25),
  badge: () => {
    const g = new THREE.Group();
    for (const s of [-1, 1]) { const r = new THREE.Shape(); r.moveTo(-0.12, 0); r.lineTo(0.12, 0); r.lineTo(0.12, -0.5); r.lineTo(0, -0.4); r.lineTo(-0.12, -0.5); r.closePath(); g.add(M(X(r, 0.03, 0.015), s < 0 ? '#8A2BE2' : '#FF69B4', s * 0.16, -0.1, -0.08, 0, 0, s * 0.3, SOFT)); }
    g.add(M(X(circle(0.42), 0.12, 0.06), '#FFD700', 0, 0.12, 0, 0, 0, 0, GOLD), M(X(circle(0.3), 0.08, 0.03), '#f0b400', 0, 0.12, 0.06, 0, 0, 0, GOLD), M(X(star(5, 0.22, 0.1), 0.06, 0.03), '#fff3a0', 0, 0.12, 0.12, 0, 0, 0, GOLD));
    return tilt(g, 0.15, -0.3);
  },
  stamp: () => {
    const g = new THREE.Group();
    g.add(M(new THREE.CylinderGeometry(0.44, 0.44, 0.1, 40), '#FF6347', 0, -0.44, 0), M(new THREE.CylinderGeometry(0.42, 0.44, 0.14, 40), '#8a5a32', 0, -0.32, 0, 0, 0, 0, SOFT));
    g.add(M(new THREE.CylinderGeometry(0.1, 0.16, 0.44, 24), '#a8703e', 0, -0.03, 0, 0, 0, 0, SOFT), M(new THREE.SphereGeometry(0.24, 32, 24), '#8A2BE2', 0, 0.3, 0, 0, 0, 0, { roughness: 0.25 }));
    const ink = M(new THREE.TorusGeometry(0.36, 0.035, 8, 40), '#FF6347', 0, -0.48, 0, Math.PI / 2); g.add(ink);
    return tilt(g, 0.35, -0.3, 0.25);
  },
  gear: () => {
    const s = new THREE.Shape(), n = 8; for (let i = 0; i < n * 4; i++) { const a = i / (n * 4) * Math.PI * 2, r = (i % 4 < 2) ? 0.6 : 0.46; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); } s.closePath();
    const h = new THREE.Path(); h.absarc(0, 0, 0.2, 0, Math.PI * 2, true); s.holes.push(h);
    return tilt(G(M(X(s, 0.2, 0.04), '#b8c2d0', 0, 0, 0, 0, 0, 0, { metalness: 0.6, roughness: 0.3 }), M(new THREE.TorusGeometry(0.33, 0.03, 8, 40), '#8f9aac', 0, 0, 0.15, 0, 0, 0, { metalness: 0.6, roughness: 0.3 })), 0.3, -0.35);
  },
  check: () => {
    const c = new THREE.Shape(); c.moveTo(-0.3, 0.02); c.lineTo(-0.1, -0.18); c.lineTo(0.3, 0.24); c.lineTo(0.22, 0.32); c.lineTo(-0.1, -0.02); c.lineTo(-0.22, 0.1); c.closePath();
    return tilt(G(M(X(circle(0.5), 0.14, 0.07), '#3ac06a'), M(X(c, 0.08, 0.04), '#ffffff', 0, -0.02, 0.14)), 0.15, -0.3);
  },
  exclaim: () => {
    const b = new THREE.Shape(); b.moveTo(-0.1, -0.05); b.lineTo(0.1, -0.05); b.lineTo(0.14, 0.5); b.quadraticCurveTo(0, 0.6, -0.14, 0.5); b.closePath();
    return tilt(G(M(X(b, 0.16, 0.07), '#FFD700', 0, -0.05, 0, 0, 0, 0, { roughness: 0.3 }), M(new THREE.SphereGeometry(0.13, 24, 18), '#FFD700', 0, -0.36, 0, 0, 0, 0, { roughness: 0.3 })), 0.1, -0.35, -0.12);
  },
  book: () => {
    const g = new THREE.Group();
    g.add(M(RB(0.72, 0.9, 0.1, 0.05), '#8A2BE2', 0, 0, -0.14), M(RB(0.72, 0.9, 0.1, 0.05), '#8A2BE2', 0, 0, 0.14));
    g.add(M(new THREE.BoxGeometry(0.66, 0.84, 0.24), '#fff8e8', 0.03, 0, 0, 0, 0, 0, SOFT), M(new THREE.CylinderGeometry(0.15, 0.15, 0.9, 20, 1, false, Math.PI, Math.PI), '#6a1cb8', -0.34, 0, 0));
    g.add(M(X(star(5, 0.16, 0.07), 0.03, 0.015), '#FFD700', 0.04, 0.06, 0.21, 0, 0, 0, GOLD), M(new THREE.BoxGeometry(0.06, 0.4, 0.02), '#FF6347', 0.2, -0.5, 0.05));
    return tilt(g, 0.1, -0.55);
  },
  shield: () => {
    const s = new THREE.Shape(); s.moveTo(-0.46, 0.5); s.lineTo(0.46, 0.5); s.lineTo(0.46, 0.05); s.quadraticCurveTo(0.44, -0.4, 0, -0.6); s.quadraticCurveTo(-0.44, -0.4, -0.46, 0.05); s.closePath();
    const g = G(M(X(s, 0.14, 0.06), '#d42f2f'), M(X(star(8, 0.24, 0.12), 0.05, 0.02), '#FFD700', 0, 0.02, 0.12, 0, 0, 0, GOLD), M(new THREE.TorusGeometry(0.3, 0.025, 8, 40), '#FFD700', 0, 0.02, 0.12, 0, 0, 0, GOLD));
    return tilt(g, 0.12, -0.3);
  },
  lock: () => tilt(G(M(RB(0.7, 0.56, 0.3, 0.08), '#FFD700', 0, -0.2, 0, 0, 0, 0, GOLD), M(new THREE.TorusGeometry(0.22, 0.07, 12, 30, Math.PI), '#aab4c4', 0, 0.08, 0, 0, 0, 0, { metalness: 0.7, roughness: 0.3 }),
    M(new THREE.CylinderGeometry(0.07, 0.07, 0.24, 12), '#aab4c4', -0.22, 0.02, 0, 0, 0, 0, { metalness: 0.7, roughness: 0.3 }), M(new THREE.CylinderGeometry(0.07, 0.07, 0.24, 12), '#aab4c4', 0.22, 0.02, 0, 0, 0, 0, { metalness: 0.7, roughness: 0.3 }),
    M(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16), '#5a3a10', 0, -0.18, 0.16, Math.PI / 2)), 0.15, -0.3),
  binoculars: () => {
    const g = new THREE.Group();
    for (const s of [-1, 1]) { g.add(M(new THREE.CylinderGeometry(0.2, 0.2, 0.56, 28), '#3b3550', s * 0.24, 0, 0, Math.PI / 2, 0, 0, { roughness: 0.4 })); g.add(M(new THREE.CylinderGeometry(0.23, 0.23, 0.14, 28), '#8A2BE2', s * 0.24, 0, 0.26, Math.PI / 2)); g.add(M(new THREE.CircleGeometry(0.17, 28), '#8fdfff', s * 0.24, 0, 0.335, 0, 0, 0, { roughness: 0.05, metalness: 0.3 })); }
    g.add(M(new THREE.BoxGeometry(0.2, 0.14, 0.3), '#2a2540', 0, 0, -0.05));
    return tilt(g, 0.35, -0.45);
  },
  eguzkilore: () => {
    const g = new THREE.Group();
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; const p = M(new THREE.ConeGeometry(0.06, 0.36, 6), i % 2 ? '#f6efe0' : '#e9dfc8', Math.cos(a) * 0.4, Math.sin(a) * 0.4, 0, 0, 0, a - Math.PI / 2, SOFT); g.add(p); }
    g.add(M(new THREE.CylinderGeometry(0.3, 0.32, 0.12, 36), '#e0a93a', 0, 0, 0, Math.PI / 2, 0, 0, { roughness: 0.8 }));
    for (let i = 0; i < 26; i++) { const a = i * 2.4, r = Math.sqrt(i / 26) * 0.26; g.add(M(new THREE.SphereGeometry(0.035, 8, 6), '#c9822a', Math.cos(a) * r, Math.sin(a) * r, 0.07)); }
    return tilt(g, 0.35, -0.3);
  },
  ribbon: () => {
    const g = new THREE.Group();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.add(M(new THREE.SphereGeometry(0.16, 16, 12), i % 2 ? '#FF69B4' : '#ff8fc8', Math.cos(a) * 0.3, Math.sin(a) * 0.3 + 0.12, 0, 0, 0, 0, SOFT)); }
    g.add(M(X(circle(0.24), 0.08, 0.04), '#FFD700', 0, 0.12, 0.08, 0, 0, 0, GOLD));
    for (const s of [-1, 1]) g.add(M(new THREE.BoxGeometry(0.16, 0.5, 0.03), '#FF69B4', s * 0.13, -0.42, -0.05, 0, 0, s * 0.25, SOFT));
    return tilt(g, 0.15, -0.3);
  },

  quiz: () => {
    const b = new THREE.Shape(); b.moveTo(-0.5, -0.2); b.absarc(0, 0.08, 0.5, Math.PI, 0, true); b.lineTo(0.5, 0.08); b.absarc(0, 0.08, 0.5, 0, -Math.PI * 0.35, true); b.lineTo(-0.3, -0.62); b.lineTo(-0.2, -0.35); b.closePath();
    const q = new THREE.Shape(); q.moveTo(-0.16, 0.2); q.quadraticCurveTo(-0.16, 0.42, 0, 0.42); q.quadraticCurveTo(0.18, 0.42, 0.18, 0.24); q.quadraticCurveTo(0.18, 0.12, 0.06, 0.06); q.lineTo(0.06, -0.06); q.lineTo(-0.06, -0.06); q.lineTo(-0.06, 0.12); q.quadraticCurveTo(0.07, 0.18, 0.07, 0.25); q.quadraticCurveTo(0.06, 0.32, 0, 0.32); q.quadraticCurveTo(-0.06, 0.32, -0.06, 0.2); q.closePath();
    return tilt(G(M(X(b, 0.14, 0.06), '#8A2BE2'), M(X(q, 0.05, 0.02), '#ffffff', 0, 0, 0.12), M(new THREE.SphereGeometry(0.06, 16, 12), '#ffffff', 0, -0.16, 0.14)), 0.15, -0.3);
  },
  music: () => {
    const g = new THREE.Group();
    for (const [x, y] of [[-0.3, -0.35], [0.3, -0.22]]) { const h = M(new THREE.SphereGeometry(0.16, 24, 16), '#FFD700', x, y, 0, 0, 0, 0.5, GOLD); h.scale.set(1.25, 0.9, 0.8); g.add(h); g.add(M(new THREE.BoxGeometry(0.06, 0.8, 0.06), '#FFD700', x + 0.16, y + 0.4, 0, 0, 0, 0, GOLD)); }
    g.add(M(new THREE.BoxGeometry(0.66, 0.14, 0.07), '#FFD700', 0.15, 0.62, 0, 0, 0, 0.21, GOLD));
    return tilt(g, 0.1, -0.35);
  },
  legend: () => {
    const m = new THREE.Shape(); m.absarc(0, 0, 0.5, Math.PI * 0.3, Math.PI * 1.7, false); m.absarc(0.22, 0, 0.42, Math.PI * 1.55, Math.PI * 0.45, true);
    return tilt(G(M(X(m, 0.16, 0.06), '#b99cff', 0, 0, 0, 0, 0, 0, { roughness: 0.35, emissive: new THREE.Color('#3a1a7a'), emissiveIntensity: 0.4 }), M(X(star(5, 0.2, 0.09), 0.06, 0.03), '#FFD700', 0.42, 0.36, 0.05, 0, 0, 0, GOLD), M(X(star(4, 0.11, 0.03), 0.04, 0.02), '#fff3a0', 0.5, -0.3, 0.05, 0, 0, 0, GOLD)), 0.1, -0.3);
  },
  running: () => {
    const g = new THREE.Group();
    const shoe = M(new THREE.CapsuleGeometry(0.2, 0.5, 8, 20), '#FF6347', 0, 0, 0, 0, 0, Math.PI / 2, { roughness: 0.4 }); shoe.scale.set(1, 1, 0.9); g.add(shoe);
    g.add(M(new THREE.BoxGeometry(0.82, 0.1, 0.36), '#ffffff', 0, -0.2, 0, 0, 0, 0, { roughness: 0.5 }));
    for (let i = 0; i < 3; i++) g.add(M(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), '#ffffff', -0.05 + i * 0.12, 0.2, 0.12, 0, 0, Math.PI / 2 + 0.3));
    for (let i = 0; i < 3; i++) g.add(M(new THREE.BoxGeometry(0.3 - i * 0.05, 0.06, 0.06), '#00BFFF', -0.66 - i * 0.02, 0.18 - i * 0.18, 0, 0, 0, 0, { roughness: 0.3 }));
    return tilt(g, 0.2, -0.2, 0.15);
  },
  dance: () => {
    const g = new THREE.Group();
    for (const s of [-1, 1]) { const c = M(new THREE.SphereGeometry(0.3, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2), '#8a4a26', s * 0.26, 0, 0, Math.PI / 2 * s * 0.8, 0, s * 0.3, { roughness: 0.3 }); c.scale.set(1, 0.45, 1.1); g.add(c); }
    const cord = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.3, 0.28, 0), new THREE.Vector3(0, 0.55, 0.05), new THREE.Vector3(0.3, 0.28, 0)]);
    g.add(M(new THREE.TubeGeometry(cord, 20, 0.03, 8), '#d42f2f'));
    for (const [c, x] of [['#FF6347', -0.2], ['#FFD700', 0], ['#00BFFF', 0.2]]) { const r = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.55, 0), new THREE.Vector3(x * 1.5, 0.2, 0.2), new THREE.Vector3(x * 2.4, -0.3, 0.1), new THREE.Vector3(x * 2.8, -0.6, 0.25)]); g.add(M(new THREE.TubeGeometry(r, 24, 0.03, 6), c)); }
    return tilt(g, 0.25, -0.3);
  },

  castle: () => {
    const g = new THREE.Group(), st = '#d9c6a2', st2 = '#c4ae88';
    g.add(M(RB(0.9, 0.5, 0.5, 0.03), st, 0, -0.3, 0, 0, 0, 0, SOFT));
    for (const x of [-0.5, 0.5]) { g.add(M(new THREE.CylinderGeometry(0.2, 0.22, 0.95, 20), st2, x, -0.08, 0.05, 0, 0, 0, SOFT)); g.add(M(new THREE.ConeGeometry(0.25, 0.35, 20), '#4a6fb0', x, 0.57, 0.05, 0, 0, 0, { roughness: 0.4 })); }
    g.add(M(RB(0.34, 0.95, 0.34, 0.03), st2, 0, 0.1, -0.08, 0, 0, 0, SOFT));
    for (let i = -1; i <= 1; i++) g.add(M(new THREE.BoxGeometry(0.08, 0.1, 0.08), st2, i * 0.11, 0.62, -0.08));
    g.add(M(new THREE.CylinderGeometry(0.012, 0.012, 0.35, 6), '#3a2a1a', 0, 0.8, -0.08));
    g.add(M(new THREE.BoxGeometry(0.2, 0.12, 0.01), '#d42f2f', 0.1, 0.9, -0.08, 0, 0, 0, SOFT));
    const d = new THREE.Shape(); d.moveTo(-0.1, 0); d.lineTo(0.1, 0); d.lineTo(0.1, 0.15); d.absarc(0, 0.15, 0.1, 0, Math.PI); d.closePath(); g.add(M(X(d, 0.04, 0.01), '#6a4424', 0, -0.55, 0.26));
    return tilt(g, 0.12, -0.4);
  },
  cathedral: () => {
    const g = new THREE.Group(), st = '#e2d2b0';
    g.add(M(RB(0.7, 0.55, 0.6, 0.03), st, 0, -0.3, -0.1, 0, 0, 0, SOFT));
    for (const x of [-0.38, 0.38]) { g.add(M(RB(0.26, 1.05, 0.26, 0.03), '#d4c29c', x, -0.05, 0.12, 0, 0, 0, SOFT)); g.add(M(new THREE.ConeGeometry(0.19, 0.4, 4), '#7a8a9a', x, 0.67, 0.12, 0, Math.PI / 4, 0, { roughness: 0.4 })); }
    const r = new THREE.Shape(); r.moveTo(-0.36, 0); r.lineTo(0, 0.28); r.lineTo(0.36, 0); r.closePath(); g.add(M(X(r, 0.6, 0.02), '#b85a42', 0, -0.03, -0.1));
    g.add(M(new THREE.TorusGeometry(0.1, 0.025, 8, 24), '#f4ead0', 0, -0.05, 0.21), M(new THREE.CircleGeometry(0.1, 24), '#3a8fd6', 0, -0.05, 0.205, 0, 0, 0, { roughness: 0.1 }));
    const d = new THREE.Shape(); d.moveTo(-0.1, 0); d.lineTo(0.1, 0); d.lineTo(0.1, 0.14); d.absarc(0, 0.14, 0.1, 0, Math.PI); d.closePath(); g.add(M(X(d, 0.04, 0.01), '#6a4424', 0, -0.57, 0.21));
    return tilt(g, 0.1, -0.35);
  },
  flag: () => {
    const g = new THREE.Group();
    g.add(M(new THREE.CylinderGeometry(0.03, 0.035, 1.3, 12), '#d8c8a0', -0.35, 0, 0, 0, 0, 0, GOLD), M(new THREE.SphereGeometry(0.06, 16, 12), '#FFD700', -0.35, 0.67, 0, 0, 0, 0, GOLD));
    const f = new THREE.PlaneGeometry(0.8, 0.52, 16, 4); const p = f.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 0.4; p.setZ(i, Math.sin(x * 7) * 0.06 * x); }
    f.computeVertexNormals();
    g.add(M(f, '#d42f2f', 0.07, 0.34, 0, 0, 0, 0, { side: THREE.DoubleSide, roughness: 0.7 }));
    g.add(M(new THREE.TorusGeometry(0.11, 0.022, 8, 24), '#FFD700', 0.07, 0.34, 0.05, 0, 0, 0, GOLD), M(new THREE.SphereGeometry(0.035, 12, 10), '#3aa05a', 0.07, 0.34, 0.06));
    g.add(M(new THREE.CylinderGeometry(0.16, 0.2, 0.08, 20), '#6a4424', -0.35, -0.66, 0));
    return tilt(g, 0.1, -0.3);
  },
  flower: () => {
    const g = new THREE.Group();
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, p = M(new THREE.SphereGeometry(0.17, 20, 14), i % 2 ? '#FF69B4' : '#ff8cc8', Math.cos(a) * 0.2, 0.25 + Math.sin(a) * 0.2, 0, 0, 0, 0, SOFT); p.scale.set(1, 0.62, 0.35); p.rotation.z = a; g.add(p); }
    g.add(M(new THREE.SphereGeometry(0.1, 20, 14), '#FFD700', 0, 0.25, 0.05, 0, 0, 0, { roughness: 0.6 }));
    g.add(M(new THREE.CylinderGeometry(0.025, 0.03, 0.75, 8), '#3a8a3a', 0, -0.2, -0.02));
    for (const s2 of [-1, 1]) { const l = M(new THREE.SphereGeometry(0.12, 16, 10), '#4aaa4a', s2 * 0.12, -0.3, 0, 0, 0, s2 * 0.8, SOFT); l.scale.set(1, 0.4, 0.3); g.add(l); }
    return tilt(g, 0.15, -0.25);
  },
  footprint: () => {
    const g = new THREE.Group(), s = new THREE.Shape(); s.ellipse(0, 0, 0.16, 0.3, 0, Math.PI * 2);
    for (const [x, y, r] of [[-0.2, -0.2, 0.2], [0.2, 0.2, -0.15]]) { const f = new THREE.Group(); f.add(M(X(s, 0.06, 0.03), '#8a5a32')); for (let i = 0; i < 5; i++) f.add(M(new THREE.SphereGeometry(0.045 - Math.abs(i - 1) * 0.004, 12, 10), '#8a5a32', -0.1 + i * 0.05, 0.36 - Math.abs(i - 1.2) * 0.03, 0)); f.position.set(x, y, 0); f.rotation.z = r; g.add(f); }
    return tilt(g, -0.5, -0.2);
  },
  frog: () => {
    const g = new THREE.Group(), G1 = '#4caf50';
    const b = M(new THREE.SphereGeometry(0.4, 28, 20), G1, 0, -0.1, 0, 0, 0, 0, { roughness: 0.3 }); b.scale.set(1.1, 0.7, 1); g.add(b);
    for (const s2 of [-1, 1]) { g.add(M(new THREE.SphereGeometry(0.13, 20, 14), G1, s2 * 0.2, 0.2, 0.18, 0, 0, 0, { roughness: 0.3 })); g.add(M(new THREE.SphereGeometry(0.08, 16, 12), '#ffffff', s2 * 0.2, 0.25, 0.27)); g.add(M(new THREE.SphereGeometry(0.045, 12, 10), '#111111', s2 * 0.2, 0.26, 0.33, 0, 0, 0, { roughness: 0.1 })); const L = M(new THREE.SphereGeometry(0.16, 16, 12), '#3a9a40', s2 * 0.38, -0.3, 0.1); L.scale.set(0.9, 0.5, 1.3); g.add(L); }
    g.add(M(new THREE.TorusGeometry(0.18, 0.02, 8, 24, Math.PI), '#1a4a1a', 0, 0.0, 0.37, 0, 0, Math.PI));
    const belly = M(new THREE.SphereGeometry(0.3, 20, 14), '#d8e8a0', 0, -0.2, 0.15); belly.scale.set(1, 0.55, 0.8); g.add(belly);
    return tilt(g, 0.2, -0.3);
  },
  heron: () => {
    const g = new THREE.Group(), gr = '#a8b0b8';
    const b = M(new THREE.SphereGeometry(0.25, 24, 16), gr, 0, 0.05, 0); b.scale.set(0.8, 0.9, 1.4); b.rotation.x = 0.5; g.add(b);
    const neck = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.2, 0.2), new THREE.Vector3(0, 0.45, 0.15), new THREE.Vector3(0, 0.55, 0.3), new THREE.Vector3(0, 0.62, 0.35)]);
    g.add(M(new THREE.TubeGeometry(neck, 20, 0.05, 10), '#e8ecef'));
    g.add(M(new THREE.SphereGeometry(0.075, 16, 12), '#e8ecef', 0, 0.64, 0.36), M(new THREE.ConeGeometry(0.03, 0.3, 10), '#e8b020', 0, 0.62, 0.55, Math.PI / 2 + 0.1));
    g.add(M(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 6), '#111', 0, 0.68, 0.24, 1.2));
    for (const s2 of [-1, 1]) g.add(M(new THREE.CylinderGeometry(0.018, 0.018, 0.6, 8), '#8a7a50', s2 * 0.07, -0.4, 0));
    return tilt(g, 0.05, -1.1);
  },
  marmot: () => {
    const g = new THREE.Group(), B = '#9a7048';
    const b = M(new THREE.SphereGeometry(0.34, 24, 18), B, 0, -0.15, 0, 0, 0, 0, SOFT); b.scale.set(1, 1.2, 0.9); g.add(b);
    g.add(M(new THREE.SphereGeometry(0.22, 24, 18), B, 0, 0.35, 0.05, 0, 0, 0, SOFT), M(new THREE.SphereGeometry(0.12, 16, 12), '#d8c0a0', 0, 0.28, 0.2, 0, 0, 0, SOFT));
    for (const s2 of [-1, 1]) { g.add(M(new THREE.SphereGeometry(0.035, 12, 10), '#111', s2 * 0.09, 0.4, 0.22, 0, 0, 0, { roughness: 0.1 })); g.add(M(new THREE.SphereGeometry(0.05, 12, 10), B, s2 * 0.15, 0.53, 0)); g.add(M(new THREE.SphereGeometry(0.06, 12, 10), '#6a4a30', s2 * 0.14, 0.02, 0.28)); }
    g.add(M(new THREE.SphereGeometry(0.025, 10, 8), '#3a2a20', 0, 0.33, 0.29));
    return tilt(g, 0.1, -0.3);
  },
  rabbit: () => {
    const g = new THREE.Group(), B = '#b89a78';
    const b = M(new THREE.SphereGeometry(0.3, 24, 18), B, 0, -0.2, -0.05, 0, 0, 0, SOFT); b.scale.set(0.9, 0.9, 1.2); g.add(b);
    g.add(M(new THREE.SphereGeometry(0.19, 24, 18), B, 0, 0.12, 0.2, 0, 0, 0, SOFT));
    for (const s2 of [-1, 1]) { const e = M(new THREE.SphereGeometry(0.08, 16, 12), B, s2 * 0.07, 0.42, 0.12, -0.2, 0, s2 * 0.15, SOFT); e.scale.set(0.7, 2.6, 0.5); g.add(e); g.add(M(new THREE.SphereGeometry(0.03, 10, 8), '#111', s2 * 0.1, 0.17, 0.35, 0, 0, 0, { roughness: 0.1 })); }
    g.add(M(new THREE.SphereGeometry(0.03, 10, 8), '#d88a8a', 0, 0.1, 0.39), M(new THREE.SphereGeometry(0.1, 14, 10), '#f4f0e8', 0, -0.15, -0.36));
    return tilt(g, 0.1, -0.6);
  },
  bustard: () => {
    const g = new THREE.Group();
    const b = M(new THREE.SphereGeometry(0.3, 24, 18), '#b07a44', 0, 0, 0, 0, 0, 0, SOFT); b.scale.set(0.8, 0.8, 1.3); g.add(b);
    const w = M(new THREE.SphereGeometry(0.28, 20, 14), '#f0e8d8', 0, -0.08, -0.05); w.scale.set(0.82, 0.6, 1.2); g.add(w);
    g.add(M(new THREE.CylinderGeometry(0.06, 0.09, 0.35, 12), '#a8a8a8', 0, 0.3, 0.25, 0.4), M(new THREE.SphereGeometry(0.09, 16, 12), '#a8a8a8', 0, 0.46, 0.33), M(new THREE.ConeGeometry(0.025, 0.1, 8), '#6a5a4a', 0, 0.45, 0.44, Math.PI / 2));
    for (const s2 of [-1, 1]) g.add(M(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8), '#7a6a50', s2 * 0.08, -0.4, 0));
    return tilt(g, 0.05, -1.0);
  },
  pine: () => {
    const g = new THREE.Group();
    g.add(M(new THREE.CylinderGeometry(0.06, 0.09, 0.4, 10), '#6a4a30', 0, -0.5, 0));
    for (let i = 0; i < 3; i++) g.add(M(new THREE.ConeGeometry(0.45 - i * 0.1, 0.5, 20), i % 2 ? '#2f7a3a' : '#3a8a44', 0, -0.2 + i * 0.3, 0, 0, i * 0.4, 0, SOFT));
    g.add(M(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 24), '#6aa84f', 0, -0.72, 0, 0, 0, 0, SOFT));
    return tilt(g, 0.15, -0.3);
  },
  tree: () => {
    const g = new THREE.Group();
    g.add(M(new THREE.CylinderGeometry(0.08, 0.12, 0.5, 12), '#7a5230', 0, -0.4, 0));
    for (const [x, y, z, r] of [[0, 0.15, 0, 0.36], [0.25, 0.02, 0.05, 0.25], [-0.26, 0.04, -0.02, 0.26], [0.05, 0.36, -0.05, 0.25], [0.02, 0.05, 0.25, 0.22]]) g.add(M(new THREE.SphereGeometry(r, 20, 14), '#4a9a3e', x, y, z, 0, 0, 0, SOFT));
    for (const [x, y, z] of [[0.2, 0.2, 0.24], [-0.15, 0.3, 0.2], [0.3, -0.05, 0.18]]) g.add(M(new THREE.SphereGeometry(0.05, 12, 10), '#e03030', x, y, z, 0, 0, 0, { roughness: 0.3 }));
    g.add(M(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 24), '#6aa84f', 0, -0.66, 0, 0, 0, 0, SOFT));
    return tilt(g, 0.15, -0.3);
  },
};
