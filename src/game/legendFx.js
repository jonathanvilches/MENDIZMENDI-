// Efectos de las leyendas nocturnas: pistas que brillan en la oscuridad y el halo de las criaturas.
import * as THREE from 'three';

let GLOW = null;
function glowTex() {
  if (GLOW) return GLOW;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.2, 'rgba(255,255,255,0.75)'); r.addColorStop(0.5, 'rgba(255,255,255,0.18)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  GLOW = new THREE.CanvasTexture(c); GLOW.colorSpace = THREE.SRGBColorSpace; return GLOW;
}
const glowSprite = (color, s, o = 1) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); m.scale.setScalar(s); return m; };
const lit = (color, emissive, k = 1.4, o = {}) => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: k, roughness: 0.4, ...o });

// huella enorme de pie descalzo (Basajaun)
function footprint(color) {
  const s = new THREE.Shape(); s.ellipse(0, 0, 0.24, 0.42, 0, Math.PI * 2);
  const g = new THREE.Group();
  const sole = new THREE.Mesh(new THREE.ShapeGeometry(s, 24), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sole.rotation.x = -Math.PI / 2; sole.position.y = 0.03; g.add(sole);
  for (let i = 0; i < 5; i++) { const t = new THREE.Mesh(new THREE.CircleGeometry(0.07 - Math.abs(i - 1) * 0.008, 14), sole.material); t.rotation.x = -Math.PI / 2; t.position.set(-0.17 + i * 0.085, 0.031, 0.5 - Math.abs(i - 1.3) * 0.04); g.add(t); }
  const heel = new THREE.Mesh(new THREE.ShapeGeometry(s, 24), sole.material); heel.rotation.x = -Math.PI / 2; heel.scale.setScalar(0.55); heel.position.set(0.02, 0.032, -0.05); g.add(heel);
  const g2 = g.clone(); g2.position.set(0.7, 0, -1.4); g2.rotation.y = 0.12;
  const out = new THREE.Group(); out.add(g, g2); return out;
}
// peine de oro de lamia
function comb() {
  const g = new THREE.Group(), gold = lit('#ffd24a', '#b88a10', 0.9, { metalness: 0.8, roughness: 0.25 });
  const back = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 24, 1, false, 0, Math.PI), gold); back.rotation.z = Math.PI / 2; back.rotation.y = Math.PI / 2; g.add(back);
  for (let i = 0; i < 11; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.13, 0.03), gold); t.position.set(-0.13 + i * 0.026, -0.065, 0); g.add(t); }
  g.position.y = 0.35; g.rotation.z = 0.25; return g;
}
// eguzkilore y ramillete de hierbas de San Juan
function herb(color) {
  const g = new THREE.Group();
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, p = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.2, 5), lit('#f6f0dc', color, 0.5)); p.position.set(Math.cos(a) * 0.14, 0, Math.sin(a) * 0.14); p.rotation.set(0, -a, -Math.PI / 2); p.rotation.order = 'YXZ'; g.add(p); }
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.05, 20), lit('#e0a93a', '#a86a10', 0.8)); g.add(c);
  g.position.y = 0.1; g.rotation.x = -0.5;
  const out = new THREE.Group(); out.add(g);
  for (let i = 0; i < 5; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.35, 5), lit('#4a8a3a', '#1a4a1a', 0.3)); st.position.set(0.25 + i * 0.03, 0.17, 0.05); st.rotation.z = -0.2 + i * 0.1; out.add(st); const f = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), lit('#ffd23f', '#c89a10', 1)); f.position.set(0.25 + i * 0.03 - Math.sin(-0.2 + i * 0.1) * 0.17, 0.34, 0.05); out.add(f); }
  return out;
}
// pedazo del olifante (cuerno de marfil)
function horn(color) {
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.2, 0, 0), new THREE.Vector3(0, 0.05, 0.03), new THREE.Vector3(0.2, 0.14, 0)]);
  const geo = new THREE.TubeGeometry(curve, 20, 0.05, 12); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 0.4 + (p.getX(i) + 0.2) * 1.8; p.setY(i, p.getY(i) * 1); }
  const m = new THREE.Mesh(geo, lit('#f2ead6', color, 0.6)); m.position.y = 0.3; m.rotation.z = 0.3;
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 8, 20), lit('#d9a93a', '#8a6010', 0.8, { metalness: 0.7 })); band.position.set(0, 0.33, 0.02); band.rotation.y = Math.PI / 2; const g = new THREE.Group(); g.add(m, band); return g;
}
export function makeClue(kind, color = '#b6ff9a') {
  const root = new THREE.Group();
  const item = kind === 'footprint' ? footprint(color) : kind === 'comb' ? comb() : kind === 'horn' ? horn(color) : herb(color);
  root.add(item);
  // halo en el suelo y fuego fatuo que flota encima: se ven desde lejos en la oscuridad
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.1, 32), new THREE.MeshBasicMaterial({ map: glowTex(), color, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.04; root.add(disc);
  const wisp = glowSprite(color, 1.5); wisp.position.y = 1.6; root.add(wisp);
  const core = glowSprite('#ffffff', 1); wisp.add(core); core.scale.setScalar(0.3);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.35, 3.2, 12, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  beam.position.y = 1.6; root.add(beam);
  const motes = [];
  for (let i = 0; i < 6; i++) { const m = glowSprite(color, 0.14, 0.9); root.add(m); motes.push({ m, a: i / 6 * Math.PI * 2, r: 0.5 + (i % 3) * 0.2, h: 0.3 + (i % 2) * 0.5 }); }
  let t = Math.random() * 10;
  root.userData.tick = (dt) => {
    t += dt;
    wisp.position.y = 1.5 + Math.sin(t * 1.7) * 0.2; wisp.material.opacity = 0.7 + Math.sin(t * 3.1) * 0.25;
    disc.material.opacity = 0.4 + Math.sin(t * 2) * 0.15;
    for (const o of motes) { o.a += dt * 0.8; o.m.position.set(Math.cos(o.a) * o.r, o.h + Math.sin(t * 2 + o.a) * 0.2, Math.sin(o.a) * o.r); }
    if (item.children.length && kind !== 'footprint') item.rotation.y += dt * 0.6;
  };
  return root;
}
// Halo de una criatura o de una antorcha: resplandor y motas que giran a su alrededor
export function makeAura(color = '#ffffff', size = 2) {
  const g = new THREE.Group();
  const glow = glowSprite(color, size * 1.6, 0.55); g.add(glow);
  const motes = [];
  for (let i = 0; i < 10; i++) { const m = glowSprite(color, 0.12 * size, 0.9); g.add(m); motes.push({ m, a: i / 10 * Math.PI * 2, r: size * (0.35 + (i % 3) * 0.12), h: (i % 4) * 0.35 - 0.4 }); }
  let t = Math.random() * 10;
  g.userData.tick = (dt) => {
    t += dt; glow.material.opacity = 0.45 + Math.sin(t * 2.3) * 0.12;
    for (const o of motes) { o.a += dt * 0.9; o.m.position.set(Math.cos(o.a) * o.r, o.h + Math.sin(t * 1.5 + o.a) * 0.25, Math.sin(o.a) * o.r); }
  };
  return g;
}
