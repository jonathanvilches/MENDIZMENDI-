// Fauna del valle: ovejas latxas, perro pastor, vacas pirenaicas, pottokas, corzos, ciervos,
// ardillas, pito negro, buitres, truchas, mariposas y luciérnagas
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { groundHeight, terrainHeight, waterLevelAt, surfAt } from '../world/heightfield.js';
import { resolve, isFree } from '../world/colliders.js';
import { PLACES, rx, riverInfo, HALF, iratiMask } from '../world/layout.js';
import { TREES } from '../world/nature.js';
import { clamp, damp, dampAngle, lerp, mulberry32 } from '../util/math.js';
import { TOON_MAT, OUTLINE_MAT, setOutlines } from './minifig.js';

const VC = TOON_MAT, VCflat = TOON_MAT;

// Parte de un animal con color y tipo de textura (0 piel lisa, 2 pelo, 3 lana, 4 cuerno/pezuña)
function part(geo, color, m, tex = 2) {
  const g = (geo.index ? geo.toNonIndexed() : geo.clone());
  if (m) g.applyMatrix4(m);
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  g.setAttribute('aTex', new THREE.BufferAttribute(new Float32Array(n).fill(tex), 1));
  return g;
}
// Ojos grandes de dibujo: blanco, pupila y brillo (a ambos lados de la cabeza)
function eyes(x, y, z, r, yaw = 0.35, iris = '#2a1a12') {
  const out = [];
  for (const s of [-1, 1]) {
    const ry = s * yaw;
    out.push(part(new THREE.SphereGeometry(r, 12, 10), '#ffffff', T(s * x, y, z, 0, ry, 0, 1, 1.15, 0.6), 0));
    out.push(part(new THREE.SphereGeometry(r * 0.62, 10, 8), iris, T(s * (x + Math.sin(ry) * r * 0.35), y - r * 0.08, z + Math.cos(ry) * r * 0.35, 0, ry, 0, 1, 1.2, 0.5), 0));
    out.push(part(new THREE.SphereGeometry(r * 0.22, 6, 5), '#ffffff', T(s * (x + Math.sin(ry) * r * 0.55) - r * 0.15, y + r * 0.3, z + Math.cos(ry) * r * 0.55, 0, 0, 0, 1, 1, 0.5), 0));
  }
  return out;
}
const S16 = (r) => new THREE.SphereGeometry(r, 16, 12);
const T = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
const merge = (parts) => mergeGeometries(parts);
function woolBlob(rnd, r, n, color) {
  const parts = [];
  for (let i = 0; i < n; i++) {
    const g = new THREE.SphereGeometry(r * (0.55 + rnd() * 0.25), 14, 10);
    const a = rnd() * Math.PI * 2, b = (rnd() - 0.5) * 1.2;
    parts.push(part(g, new THREE.Color(color).multiplyScalar(0.95 + rnd() * 0.08), T(Math.cos(a) * r * 0.45 * 1.6, Math.sin(b) * r * 0.35, Math.sin(a) * r * 0.45), 3));
  }
  return parts;
}

// ---------- Cuadrúpedo genérico ----------
function quadruped(spec, rnd) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const mk = (geo, parent) => { const m = new THREE.Mesh(geo, VC); m.castShadow = true; parent.add(m); const o = new THREE.Mesh(geo, OUTLINE_MAT); o.userData.outline = true; o.visible = false; parent.add(o); return m; };
  mk(merge(spec.body(rnd)), body);
  const headPivot = new THREE.Group(); headPivot.position.set(0, spec.neckY, spec.neckZ); body.add(headPivot);
  mk(merge(spec.head(rnd)), headPivot);
  const legs = [];
  const legGeo = merge(spec.leg(rnd));
  for (const [x, z] of spec.legPos) {
    const p = new THREE.Group(); p.position.set(x, spec.legTop, z); body.add(p);
    mk(legGeo, p);
    legs.push(p);
  }
  let tail = null;
  if (spec.tail) { tail = new THREE.Group(); tail.position.set(0, spec.tailY, spec.tailZ); body.add(tail); mk(merge(spec.tail(rnd)), tail); }
  root.userData.outlineOn = false;
  return { root, body, head: headPivot, legs, tail };
}

const SPECIES = {
  // Oveja latxa: nube de lana, cara oscura, orejas caídas
  sheep: {
    neckY: 0.62, neckZ: 0.4, legTop: 0.4, legPos: [[-0.15, 0.24], [0.15, 0.24], [-0.15, -0.24], [0.15, -0.24]], tailY: 0.62, tailZ: -0.46,
    body: (r) => [...woolBlob(r, 0.4, 11, '#f3ecdc').map(g => g.applyMatrix4(T(0, 0.66, 0, 0, Math.PI / 2, 0, 1, 0.95, 1.25))), part(S16(0.3), '#efe6d2', T(0, 0.66, 0, 0, 0, 0, 1, 0.95, 1.4), 3)],
    head: (r) => [part(S16(0.15), '#3a2e28', T(0, 0.02, 0.12, -0.25, 0, 0, 0.9, 1, 1.25), 0), part(S16(0.09), '#4a3c34', T(0, -0.06, 0.26, 0, 0, 0, 1.1, 0.8, 0.8), 0),
      ...[-1, 1].map(s => part(S16(0.06), '#3a2e28', T(s * 0.16, 0.05, 0.05, 0, 0, s * 0.5, 1.8, 0.55, 1), 0)),
      ...eyes(0.075, 0.07, 0.2, 0.04, 0.4),
      ...woolBlob(r, 0.12, 4, '#f3ecdc').map(g => g.applyMatrix4(T(0, 0.14, 0.02)))],
    leg: () => [part(new THREE.CapsuleGeometry(0.038, 0.3, 4, 8), '#3a2e28', T(0, -0.2, 0), 0), part(S16(0.045), '#1e1814', T(0, -0.39, 0.015, 0, 0, 0, 1, 0.6, 1.2), 4)],
    tail: () => [part(S16(0.08), '#efe6d2', T(0, -0.05, -0.02), 3)],
  },
  // Perro pastor: blanco y negro, orejas dobladas, cola de pluma
  dog: {
    neckY: 0.52, neckZ: 0.3, legTop: 0.34, legPos: [[-0.1, 0.2], [0.1, 0.2], [-0.1, -0.2], [0.1, -0.2]], tailY: 0.5, tailZ: -0.33,
    body: () => [part(new THREE.CapsuleGeometry(0.15, 0.36, 6, 12), '#1d1a18', T(0, 0.48, 0, Math.PI / 2)), part(S16(0.13), '#f4f1ea', T(0, 0.45, 0.2, 0, 0, 0, 1, 1.1, 1)), part(S16(0.12), '#f4f1ea', T(0, 0.58, 0.16, 0, 0, 0, 1.2, 0.8, 1))],
    head: () => [part(S16(0.14), '#1d1a18', T(0, 0.1, 0.06)), part(S16(0.075), '#f4f1ea', T(0, 0.04, 0.18, 0, 0, 0, 1, 0.85, 1.3)), part(new THREE.BoxGeometry(0.03, 0.14, 0.12), '#f4f1ea', T(0, 0.14, 0.14, 0.4)),
      part(S16(0.03), '#111111', T(0, 0.07, 0.28), 0), ...[-1, 1].map(s => part(S16(0.055), '#1d1a18', T(s * 0.1, 0.22, 0.02, 0.6, 0, s * 0.4, 0.8, 1.3, 0.45))),
      ...eyes(0.055, 0.13, 0.15, 0.03, 0.35, '#5a3a1a'), part(S16(0.03), '#e06070', T(0, -0.03, 0.2, 0, 0, 0, 1, 0.5, 1.2), 0)],
    leg: () => [part(new THREE.CapsuleGeometry(0.045, 0.24, 4, 8), '#f4f1ea', T(0, -0.17, 0)), part(S16(0.05), '#f4f1ea', T(0, -0.32, 0.02, 0, 0, 0, 1, 0.6, 1.3))],
    tail: () => [part(new THREE.CapsuleGeometry(0.05, 0.24, 4, 8), '#1d1a18', T(0, 0.02, -0.12, -0.9)), part(S16(0.055), '#f4f1ea', T(0, 0.13, -0.25))],
  },
  // Vaca pirenaica: color trigo, hocico claro, cuernos en lira y cencerro
  cow: {
    neckY: 1.05, neckZ: 0.82, legTop: 0.7, legPos: [[-0.24, 0.52], [0.24, 0.52], [-0.24, -0.52], [0.24, -0.52]], tailY: 1.15, tailZ: -0.85,
    body: () => [part(new THREE.CapsuleGeometry(0.44, 0.9, 6, 16), '#c8935a', T(0, 1.05, 0, Math.PI / 2, 0, 0, 1, 1, 1.05)), part(S16(0.3), '#e2c496', T(0, 0.8, 0.05, 0, 0, 0, 1, 0.6, 1.9)), part(S16(0.34), '#bd8750', T(0, 1.22, 0.62, 0, 0, 0, 1.1, 1, 1))],
    head: () => [part(S16(0.25), '#c8935a', T(0, 0.02, 0.22, 0, 0, 0, 1, 1.05, 1.15)), part(S16(0.19), '#f0dcc0', T(0, -0.12, 0.44, 0, 0, 0, 1.1, 0.8, 0.85), 0),
      ...[-1, 1].map(s => part(S16(0.035), '#6a4a3a', T(s * 0.07, -0.1, 0.6), 0)),
      ...[-1, 1].map(s => { const g = new THREE.ConeGeometry(0.045, 0.36, 10, 4); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const t = p.getY(i) / 0.36 + 0.5; p.setZ(i, p.getZ(i) - t * t * 0.1); p.setX(i, p.getX(i) + t * t * 0.08); } return part(g, '#f1e6cc', T(s * 0.22, 0.22, 0.14, 0, s < 0 ? Math.PI : 0, -s * 1.0), 4); }),
      ...[-1, 1].map(s => part(S16(0.07), '#c8935a', T(s * 0.27, 0.08, 0.1, 0, 0, s * 0.3, 1.5, 0.6, 0.9))),
      ...eyes(0.13, 0.08, 0.36, 0.055, 0.45),
      part(new THREE.CylinderGeometry(0.07, 0.1, 0.14, 12), '#8a7a58', T(0, -0.36, 0.08), 4), part(new THREE.TorusGeometry(0.12, 0.02, 6, 16), '#6b4a2e', T(0, -0.25, 0.1, Math.PI / 2 - 0.3), 4)],
    leg: () => [part(new THREE.CapsuleGeometry(0.085, 0.5, 4, 10), '#b98450', T(0, -0.33, 0)), part(new THREE.CylinderGeometry(0.09, 0.095, 0.1, 12), '#2b2420', T(0, -0.66, 0), 4)],
    tail: () => [part(new THREE.CylinderGeometry(0.022, 0.022, 0.65, 6), '#b98450', T(0, -0.33, -0.05)), part(S16(0.07), '#5a3a22', T(0, -0.7, -0.05, 0, 0, 0, 1, 1.4, 1))],
  },
  // Pottoka: caballito de monte, crin oscura, hocico claro
  pottoka: {
    neckY: 1.02, neckZ: 0.56, legTop: 0.66, legPos: [[-0.17, 0.4], [0.17, 0.4], [-0.17, -0.4], [0.17, -0.4]], tailY: 1.02, tailZ: -0.6,
    body: () => [part(new THREE.CapsuleGeometry(0.32, 0.72, 6, 16), '#5a3826', T(0, 0.98, 0, Math.PI / 2)), part(S16(0.26), '#7a5238', T(0, 0.86, 0, 0, 0, 0, 1, 0.6, 2.2))],
    head: () => [part(new THREE.CapsuleGeometry(0.13, 0.28, 6, 12), '#5a3826', T(0, 0.14, 0.06, 0.5)), part(new THREE.CapsuleGeometry(0.12, 0.24, 6, 12), '#5a3826', T(0, 0.34, 0.26, Math.PI / 2 + 0.45)), part(S16(0.11), '#caa585', T(0, 0.23, 0.42, 0, 0, 0, 1, 0.85, 0.9), 0),
      ...[-1, 1].map(s => part(S16(0.022), '#3a2418', T(s * 0.045, 0.22, 0.52), 0)),
      ...[0, 1, 2, 3, 4, 5].map(i => part(S16(0.075), '#1a1210', T(0, 0.46 - i * 0.085, 0.16 - i * 0.055, 0, 0, 0, 0.5, 1.25, 1))),
      ...[-1, 1].map(s => part(new THREE.ConeGeometry(0.04, 0.13, 8), '#5a3826', T(s * 0.07, 0.5, 0.2, -0.3, 0, -s * 0.2))),
      ...eyes(0.095, 0.4, 0.29, 0.042, 0.75)],
    leg: () => [part(new THREE.CapsuleGeometry(0.06, 0.48, 4, 10), '#4a2e20', T(0, -0.3, 0)), part(new THREE.CylinderGeometry(0.065, 0.075, 0.09, 12), '#1a1210', T(0, -0.63, 0), 4)],
    tail: () => [part(new THREE.CapsuleGeometry(0.08, 0.45, 4, 10), '#1a1210', T(0, -0.28, -0.08, 0.3))],
  },
  // Corzo: esbelto, culera blanca, orejas grandes
  corzo: {
    neckY: 0.85, neckZ: 0.36, legTop: 0.6, legPos: [[-0.1, 0.26], [0.1, 0.26], [-0.1, -0.24], [0.1, -0.24]], tailY: 0.82, tailZ: -0.4,
    body: () => [part(new THREE.CapsuleGeometry(0.18, 0.46, 6, 14), '#a8663a', T(0, 0.82, 0, Math.PI / 2)), part(S16(0.14), '#f3eee4', T(0, 0.84, -0.37, 0, 0, 0, 1, 1, 0.5)), part(S16(0.14), '#d9b890', T(0, 0.72, 0, 0, 0, 0, 1, 0.5, 2))],
    head: () => [part(new THREE.CapsuleGeometry(0.07, 0.24, 4, 10), '#a8663a', T(0, 0.12, 0.08, 0.45)), part(S16(0.1), '#a8663a', T(0, 0.28, 0.16, 0, 0, 0, 0.95, 0.95, 1.2)), part(S16(0.06), '#3a2a20', T(0, 0.25, 0.3, 0, 0, 0, 1, 0.8, 0.8), 0),
      ...[-1, 1].map(s => part(S16(0.06), '#a8663a', T(s * 0.1, 0.38, 0.1, 0, 0, s * 0.6, 0.6, 1.5, 0.35))),
      ...[-1, 1].map(s => part(new THREE.CylinderGeometry(0.01, 0.015, 0.16, 6), '#5a3d25', T(s * 0.035, 0.43, 0.14, 0, 0, -s * 0.15), 4)),
      ...eyes(0.07, 0.31, 0.22, 0.035, 0.6)],
    leg: () => [part(new THREE.CapsuleGeometry(0.042, 0.48, 4, 10), '#8a5230', T(0, -0.3, 0)), part(new THREE.CylinderGeometry(0.04, 0.045, 0.06, 10), '#2a1a12', T(0, -0.58, 0), 4)],
  },
  // Ciervo: cuello con melena y gran cornamenta
  ciervo: {
    neckY: 1.3, neckZ: 0.52, legTop: 0.92, legPos: [[-0.15, 0.4], [0.15, 0.4], [-0.15, -0.38], [0.15, -0.38]], tailY: 1.2, tailZ: -0.6,
    body: () => [part(new THREE.CapsuleGeometry(0.28, 0.75, 6, 16), '#8a5a36', T(0, 1.22, 0, Math.PI / 2)), part(S16(0.2), '#e0cca8', T(0, 1.22, -0.55, 0, 0, 0, 1, 1, 0.5)), part(S16(0.26), '#5b3a24', T(0, 1.32, 0.42, 0, 0, 0, 1, 1.2, 1))],
    head: () => {
      const p = [part(new THREE.CapsuleGeometry(0.12, 0.36, 4, 10), '#7a4e30', T(0, 0.2, 0.12, 0.45)), part(S16(0.14), '#7a4e30', T(0, 0.42, 0.26, 0, 0, 0, 0.95, 0.95, 1.3)), part(S16(0.075), '#3a2a20', T(0, 0.38, 0.44, 0, 0, 0, 1, 0.8, 0.8), 0),
        ...[-1, 1].map(s => part(S16(0.07), '#7a4e30', T(s * 0.13, 0.52, 0.18, 0, 0, s * 0.8, 0.6, 1.4, 0.35))), ...eyes(0.09, 0.47, 0.34, 0.045, 0.6)];
      for (const s of [-1, 1]) {
        p.push(part(new THREE.CylinderGeometry(0.018, 0.03, 0.6, 7), '#e3d3b0', T(s * 0.12, 0.8, 0.15, -0.2, 0, -s * 0.45), 4));
        for (let i = 0; i < 3; i++) p.push(part(new THREE.CylinderGeometry(0.01, 0.018, 0.22, 6), '#e3d3b0', T(s * (0.16 + i * 0.05), 0.68 + i * 0.13, 0.22, 0.7, 0, -s * 0.2), 4));
      }
      return p;
    },
    leg: () => [part(new THREE.CapsuleGeometry(0.058, 0.76, 4, 10), '#6a4428', T(0, -0.46, 0)), part(new THREE.CylinderGeometry(0.055, 0.06, 0.07, 10), '#2a1a12', T(0, -0.89, 0), 4)],
  },
  // Jabalí: redondo, cresta de cerdas, jeta rosada y colmillos
  jabali: {
    neckY: 0.55, neckZ: 0.4, legTop: 0.36, legPos: [[-0.13, 0.26], [0.13, 0.26], [-0.13, -0.26], [0.13, -0.26]], tailY: 0.58, tailZ: -0.48,
    body: () => [part(new THREE.CapsuleGeometry(0.27, 0.48, 6, 14), '#4a3b32', T(0, 0.6, 0, Math.PI / 2, 0, 0, 0.9, 1, 1.1)), ...[0, 1, 2, 3, 4, 5].map(i => part(new THREE.ConeGeometry(0.05, 0.14, 6), '#2a221e', T(0, 0.86 - Math.abs(i - 2) * 0.01, 0.3 - i * 0.12, -0.3)))],
    head: () => [part(S16(0.2), '#4a3b32', T(0, 0.02, 0.14, 0, 0, 0, 0.95, 0.95, 1.2)), part(new THREE.CylinderGeometry(0.075, 0.09, 0.14, 14), '#4a3b32', T(0, -0.04, 0.34, Math.PI / 2)), part(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 14), '#d88a8a', T(0, -0.04, 0.41, Math.PI / 2), 0),
      ...[-1, 1].map(s => part(new THREE.ConeGeometry(0.015, 0.09, 6), '#f4ecd8', T(s * 0.07, 0.0, 0.36, -0.9, 0, s * 0.3), 4)),
      ...[-1, 1].map(s => part(new THREE.ConeGeometry(0.05, 0.1, 8), '#3a2e28', T(s * 0.12, 0.18, 0.08, -0.3, 0, -s * 0.4))),
      ...eyes(0.09, 0.08, 0.26, 0.03, 0.5)],
    leg: () => [part(new THREE.CapsuleGeometry(0.045, 0.24, 4, 8), '#2a221e', T(0, -0.18, 0))],
    tail: () => [part(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 5), '#2a221e', T(0, -0.1, -0.02, 0.4))],
  },
};

// ---------- Animal con comportamiento ----------
export class Animal {
  constructor(kind, x, z, opts, rnd, scene) {
    this.kind = kind; this.opts = opts;
    const q = quadruped(SPECIES[kind], rnd);
    this.obj = q.root; this.q = q;
    const s = opts.scale ?? (0.9 + rnd() * 0.2);
    this.obj.scale.setScalar(s);
    this.pos = new THREE.Vector3(x, groundHeight(x, z), z);
    this.home = { x, z };
    this.heading = rnd() * 6.28; this.speed = 0; this.phase = rnd() * 6;
    this.state = 'graze'; this.timer = rnd() * 4; this.target = null;
    this.t = rnd() * 10;
    this.range = opts.range ?? 15;
    this.fleeDist = opts.flee ?? 0;
    this.walk = opts.walk ?? 0.8;
    this.run = opts.run ?? 4;
    this.radius = opts.radius ?? 0.4;
    this.id = opts.id;
    this.rnd = rnd;
    scene.add(this.obj);
    this.sync();
  }
  update(dt, player, extra) {
    this.t += dt;
    const dxp = this.pos.x - player.pos.x, dzp = this.pos.z - player.pos.z, dp = Math.hypot(dxp, dzp);
    const sneak = player.speed < 2.2;
    const scare = this.fleeDist * (sneak ? 0.55 : 1);
    let want = 0;
    if (this.follow) {
      const f = this.follow;
      const d = Math.hypot(f.pos.x - this.pos.x, f.pos.z - this.pos.z);
      if (d > 2.5) { this.heading = dampAngle(this.heading, Math.atan2(f.pos.x - this.pos.x, f.pos.z - this.pos.z), 6, dt); want = Math.min(this.run, d * 1.4); this.state = 'walk'; }
      else this.state = 'idle';
    } else if (this.fleeDist && dp < scare) {
      this.state = 'flee';
      this.heading = dampAngle(this.heading, Math.atan2(dxp, dzp), 7, dt);
      want = this.run * (this.herd ? clamp((scare - dp) / scare * 1.6 + 0.3, 0.3, 1) : 1);
      this.timer = 1.5 + this.rnd() * 2;
    } else {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.state === 'graze' || this.state === 'flee' || this.state === 'idle') {
          const a = this.rnd() * 6.28, r = this.rnd() * this.range;
          this.target = { x: this.home.x + Math.cos(a) * r, z: this.home.z + Math.sin(a) * r };
          this.state = 'walk'; this.timer = 4 + this.rnd() * 4;
        } else { this.state = 'graze'; this.timer = 3 + this.rnd() * 6; }
      }
      if (this.state === 'walk' && this.target) {
        const dx = this.target.x - this.pos.x, dz = this.target.z - this.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.6) { this.state = 'graze'; this.timer = 3 + this.rnd() * 6; }
        else { this.heading = dampAngle(this.heading, Math.atan2(dx, dz), 3, dt); want = this.walk; }
      }
    }
    this.speed = damp(this.speed, want, 5, dt);
    if (this.speed > 0.02) {
      let nx = this.pos.x + Math.sin(this.heading) * this.speed * dt, nz = this.pos.z + Math.cos(this.heading) * this.speed * dt;
      const r = resolve(nx, nz, this.radius);
      const g = groundHeight(r.x, r.z);
      const deep = waterLevelAt(r.x, r.z) - g > 0.4;
      const r4 = Math.pow(r.x ** 4 + r.z ** 4, 0.25);
      const bounded = this.bounds ? this.bounds(r.x, r.z) : true;
      if (!deep && r4 < 455 && bounded && Math.abs(g - this.pos.y) < 1.2) { this.pos.x = r.x; this.pos.z = r.z; }
      else { this.heading += 1.5 + this.rnd(); this.target = null; }
      this.phase += this.speed * dt * (this.kind === 'cow' ? 2.6 : 5.5);
    }
    this.pos.y = groundHeight(this.pos.x, this.pos.z);
    this.animate(dt);
    this.sync();
  }
  animate(dt) {
    const q = this.q, run = this.speed > 2;
    const a = Math.min(1, this.speed / 1.2);
    const sw = Math.sin(this.phase) * (run ? 0.9 : 0.5) * a;
    q.legs[0].rotation.x = sw; q.legs[3].rotation.x = sw;
    q.legs[1].rotation.x = -sw; q.legs[2].rotation.x = -sw;
    if (run && this.kind !== 'cow') { q.legs[0].rotation.x = q.legs[1].rotation.x = Math.sin(this.phase) * 0.8; q.legs[2].rotation.x = q.legs[3].rotation.x = -Math.sin(this.phase) * 0.8; q.body.rotation.x = Math.cos(this.phase) * 0.08; }
    else q.body.rotation.x = 0;
    q.body.position.y = Math.abs(Math.sin(this.phase)) * (run ? 0.12 : 0.03) * a;
    const graze = this.state === 'graze' ? 1 : 0;
    this.headDown = damp(this.headDown || 0, graze, 3, dt);
    q.head.rotation.x = this.headDown * 0.9 + Math.sin(this.t * 3) * 0.05 * this.headDown;
    q.head.rotation.y = Math.sin(this.t * 0.8) * 0.2 * (1 - this.headDown);
    if (q.tail) q.tail.rotation.z = Math.sin(this.t * (this.kind === 'dog' ? 12 : 3)) * (this.kind === 'dog' ? 0.6 : 0.3);
  }
  sync() { this.obj.position.copy(this.pos); this.obj.rotation.y = this.heading; }
}

// ---------- Criaturas pequeñas y voladoras ----------
function buildSquirrel() {
  const g = merge([
    part(new THREE.CapsuleGeometry(0.06, 0.1, 4, 6), '#b4532a', T(0, 0.1, 0, 0.5)),
    part(new THREE.SphereGeometry(0.055, 8, 6), '#b4532a', T(0, 0.2, 0.07)),
    part(new THREE.ConeGeometry(0.02, 0.05, 4), '#b4532a', T(-0.03, 0.26, 0.06)), part(new THREE.ConeGeometry(0.02, 0.05, 4), '#b4532a', T(0.03, 0.26, 0.06)),
    part(new THREE.SphereGeometry(0.012, 4, 3), '#111', T(-0.03, 0.21, 0.12)), part(new THREE.SphereGeometry(0.012, 4, 3), '#111', T(0.03, 0.21, 0.12)),
    part(new THREE.SphereGeometry(0.04, 6, 5), '#f2e3cc', T(0, 0.11, 0.05, 0, 0, 0, 1, 1.2, 0.6)),
  ]);
  const tail = merge([part(new THREE.CapsuleGeometry(0.05, 0.2, 4, 6), '#c0602f', T(0, 0.15, -0.02, -0.3))]);
  const root = new THREE.Group(); const b = new THREE.Mesh(g, VC); b.castShadow = true; root.add(b);
  const tp = new THREE.Group(); tp.position.set(0, 0.06, -0.07); tp.add(new THREE.Mesh(tail, VC)); root.add(tp);
  root.userData.tail = tp;
  return root;
}
function buildWoodpecker() {
  const g = merge([
    part(new THREE.CapsuleGeometry(0.07, 0.2, 4, 6), '#141414', T(0, 0, 0)),
    part(new THREE.SphereGeometry(0.07, 8, 6), '#141414', T(0, 0.17, 0.02)),
    part(new THREE.SphereGeometry(0.05, 6, 5), '#d42323', T(0, 0.23, 0.0, 0, 0, 0, 0.8, 1.2, 1.3)),
    part(new THREE.ConeGeometry(0.02, 0.1, 4), '#e8e0c8', T(0, 0.17, 0.11, Math.PI / 2)),
    part(new THREE.SphereGeometry(0.014, 4, 3), '#f5f5f5', T(-0.04, 0.19, 0.06)), part(new THREE.SphereGeometry(0.014, 4, 3), '#f5f5f5', T(0.04, 0.19, 0.06)),
    part(new THREE.ConeGeometry(0.04, 0.15, 4), '#141414', T(0, -0.2, -0.02, Math.PI)),
  ]);
  const root = new THREE.Group(); const b = new THREE.Mesh(g, VC); b.castShadow = true; root.add(b); root.userData.body = b;
  return root;
}
function buildVulture() {
  const root = new THREE.Group();
  const body = merge([
    part(new THREE.CapsuleGeometry(0.22, 0.6, 4, 8), '#8d6a45', T(0, 0, 0, Math.PI / 2)),
    part(new THREE.SphereGeometry(0.13, 8, 6), '#e9dcc3', T(0, 0.08, 0.5)),
    part(new THREE.ConeGeometry(0.05, 0.14, 5), '#e2c89a', T(0, 0.06, 0.66, Math.PI / 2)),
    part(new THREE.ConeGeometry(0.2, 0.4, 5), '#5a4330', T(0, 0, -0.5, -Math.PI / 2, 0, 0, 1, 1, 0.4)),
  ]);
  root.add(new THREE.Mesh(body, VC));
  const wingGeo = merge([part(new THREE.BoxGeometry(1.4, 0.04, 0.55), '#7a5a3a', T(0.7, 0, 0)), part(new THREE.BoxGeometry(0.5, 0.03, 0.45), '#2a221c', T(1.55, 0, -0.02))]);
  for (const s of [-1, 1]) { const w = new THREE.Group(); w.scale.x = s; const m = new THREE.Mesh(wingGeo, VC); w.add(m); w.position.x = s * 0.15; root.add(w); root.userData[s < 0 ? 'wl' : 'wr'] = w; }
  return root;
}
function buildFish() {
  const g = merge([part(new THREE.SphereGeometry(0.1, 8, 6), '#8a8f6a', T(0, 0, 0, 0, 0, 0, 0.6, 0.8, 2)), part(new THREE.ConeGeometry(0.08, 0.14, 4), '#6f7458', T(0, 0, -0.25, -Math.PI / 2, 0, 0, 0.3, 1, 1))]);
  return new THREE.Mesh(g, VC);
}

// ---------- Gestor de fauna ----------
export class Fauna {
  constructor(scene, quality, spec) {
    this.scene = scene;
    const rnd = this.rnd = mulberry32(555);
    this.animals = [];
    this.extraObservables = [];
    if (spec) return this.buildGeneric(scene, quality, spec);
    // Vacas pirenaicas en los prados altos del oeste
    for (let i = 0; i < 6; i++) this.add('cow', -150 + rnd() * 50, 90 + rnd() * 40, { range: 25, walk: 0.6, radius: 0.8, flee: 0 });
    // Pottokas en la ladera de Muskilda
    for (let i = 0; i < 4; i++) this.add('pottoka', 150 + rnd() * 40, 40 + rnd() * 30, { range: 30, walk: 1.0, run: 5, radius: 0.6, flee: 5 });
    // Rebaño de la borda (ambientación)
    this.flock = [];
    for (let i = 0; i < 14; i++) { const a = this.add('sheep', PLACES.borda.x + 30 + rnd() * 30, PLACES.borda.z + 20 + rnd() * 30, { range: 16, walk: 0.5, run: 2.8, flee: 3.5, radius: 0.45 }); this.flock.push(a); }
    // Fauna salvaje observable
    this.wild = [];
    const corzoSpots = [[-60, -190], [120, -150], [-150, -230], [60, -250]];
    corzoSpots.forEach(([x, z], i) => this.wild.push(this.add('corzo', x, z, { id: 'corzo', range: 20, walk: 0.9, run: 7, flee: 13, radius: 0.35 })));
    [[-40, -380], [140, -330], [-120, -330]].forEach(([x, z]) => this.wild.push(this.add('ciervo', x, z, { id: 'ciervo', range: 25, walk: 1.0, run: 7.5, flee: 16, radius: 0.5 })));
    [[180, -220], [-200, -120]].forEach(([x, z]) => this.wild.push(this.add('jabali', x, z, { id: 'jabali', range: 25, walk: 0.8, run: 5, flee: 9, radius: 0.45 })));
    // Ardillas en los árboles
    this.squirrels = [];
    const trees = TREES.filter(t => t.type !== 'fir' && t.z < -120 && Math.abs(t.x - rx(t.z)) < 80);
    for (let i = 0; i < 8 && trees.length; i++) {
      const t = trees[Math.floor(rnd() * trees.length)];
      const o = buildSquirrel(); scene.add(o);
      this.squirrels.push({ obj: o, tree: t, state: 'ground', t: rnd() * 5, pos: new THREE.Vector3(t.x + 1, 0, t.z), heading: 0, id: 'ardilla', climb: 0 });
    }
    // Pito negro en troncos de haya
    this.peckers = [];
    const beech = TREES.filter(t => t.type === 'beech' && t.z < -200);
    for (let i = 0; i < 3 && beech.length; i++) {
      const t = beech[Math.floor(rnd() * beech.length)];
      const o = buildWoodpecker(); scene.add(o);
      const a = rnd() * 6.28;
      o.position.set(t.x + Math.sin(a) * 0.38 * t.s, t.y + 2.4 * t.s, t.z + Math.cos(a) * 0.38 * t.s); o.rotation.y = a + Math.PI;
      this.peckers.push({ obj: o, t: rnd() * 3, id: 'pito', pos: o.position, drum: 0 });
    }
    // Buitres leonados planeando
    this.vultures = [];
    for (let i = 0; i < 6; i++) {
      const o = buildVulture(); scene.add(o);
      this.vultures.push({ obj: o, c: new THREE.Vector3(120 + (i % 2) * 80 - 40, 95 + i * 9, -200 + (i % 3) * 60), r: 30 + rnd() * 30, a: rnd() * 6.28, w: 0.1 + rnd() * 0.08, id: 'buitre', pos: o.position });
    }
    // Truchas que saltan
    this.fish = [];
    for (let i = 0; i < 5; i++) { const o = buildFish(); o.visible = false; scene.add(o); this.fish.push({ obj: o, t: rnd() * 8, id: 'trucha', pos: o.position, jump: -1 }); }
    // Perro del pastor
    this.dog = this.add('dog', PLACES.borda.x + 5, PLACES.borda.z + 5, { range: 6, walk: 1.2, run: 6, radius: 0.3 });
    this.buildButterflies(scene, quality);
    this.buildFireflies(scene, quality);
    this.buildBirds(scene);
    this.visDist = quality === 'low' ? 60 : quality === 'mid' ? 80 : 100;
  }
  buildGeneric(scene, quality, spec) {
    const rnd = this.rnd, P = spec.places, fam = spec.def.family, com = spec.def.comarca;
    const near = (p, r) => [p.x + (rnd() - 0.5) * r, p.z + (rnd() - 0.5) * r];
    const farm = P.farm || { x: 150, z: 40 };
    this.flock = [];
    const sheepN = fam === 'ribera' ? 6 : 10;
    for (let i = 0; i < sheepN; i++) { const [x, z] = near({ x: farm.x + (P.farm.x > 0 ? 25 : -25), z: farm.z + 30 }, 30); this.flock.push(this.add('sheep', x, z, { range: 14, walk: 0.5, run: 2.8, flee: 3.5, radius: 0.45 })); }
    if (fam === 'atlantic' || fam === 'pyrenean') for (let i = 0; i < 5; i++) { const [x, z] = near({ x: farm.x, z: farm.z - 45 }, 40); this.add('cow', x, z, { range: 25, walk: 0.6, radius: 0.8, flee: 0 }); }
    if (['bidasoa', 'larraun-leitzaldea', 'sakana'].includes(com)) for (let i = 0; i < 4; i++) { const [x, z] = near(P.edgeN || P.forest, 60); this.add('pottoka', x, z, { range: 30, walk: 1, run: 5, radius: 0.6, flee: 5 }); }
    this.wild = [];
    const forest = P.forest || { x: 0, z: -300 };
    for (let i = 0; i < 4; i++) { const [x, z] = near(forest, 120); this.wild.push(this.add('corzo', x, z, { id: 'corzo', range: 20, walk: 0.9, run: 7, flee: 13, radius: 0.35 })); }
    if (fam !== 'ribera') for (let i = 0; i < 2; i++) { const [x, z] = near(forest, 140); this.wild.push(this.add('ciervo', x, z, { id: 'ciervo', range: 25, walk: 1, run: 7.5, flee: 16, radius: 0.5 })); }
    for (let i = 0; i < 2; i++) { const [x, z] = near(forest, 160); this.wild.push(this.add('jabali', x, z, { id: 'jabali', range: 25, walk: 0.8, run: 5, flee: 9, radius: 0.45 })); }
    this.squirrels = []; this.peckers = [];
    const trees = TREES.filter(t => Math.hypot(t.x - forest.x, t.z - forest.z) < 150 && t.type !== 'olive');
    for (let i = 0; i < 6 && trees.length; i++) { const t = trees[Math.floor(rnd() * trees.length)]; const o = buildSquirrel(); scene.add(o); this.squirrels.push({ obj: o, tree: t, state: 'ground', t: rnd() * 5, pos: new THREE.Vector3(t.x + 1, 0, t.z), heading: 0, id: 'ardilla', climb: 0 }); }
    if (fam === 'atlantic' || fam === 'pyrenean') for (let i = 0; i < 2 && trees.length; i++) { const t = trees[Math.floor(rnd() * trees.length)]; const o = buildWoodpecker(); scene.add(o); const a = rnd() * 6.28; o.position.set(t.x + Math.sin(a) * 0.38 * t.s, t.y + 2.4 * t.s, t.z + Math.cos(a) * 0.38 * t.s); o.rotation.y = a + Math.PI; this.peckers.push({ obj: o, t: rnd() * 3, id: 'pito', pos: o.position }); }
    this.vultures = [];
    const vN = fam === 'ribera' ? 3 : 5;
    const gorge = (P.landmarks || []).find(l => l.kind === 'gorge');
    for (let i = 0; i < vN; i++) { const o = buildVulture(); scene.add(o); const c = gorge ? new THREE.Vector3(gorge.x, 60 + i * 8, gorge.z) : new THREE.Vector3((rnd() - 0.5) * 300, 90 + i * 10, -150 + (rnd() - 0.5) * 200); this.vultures.push({ obj: o, c, r: 25 + rnd() * 35, a: rnd() * 6.28, w: 0.1 + rnd() * 0.08, id: 'buitre', pos: o.position }); }
    this.fish = [];
    if (spec.def.river) for (let i = 0; i < 4; i++) { const o = buildFish(); o.visible = false; scene.add(o); this.fish.push({ obj: o, t: rnd() * 8, id: 'trucha', pos: o.position, jump: -1 }); }
    this.dog = this.add('dog', farm.x + 6, farm.z + 6, { range: 6, walk: 1.2, run: 6, radius: 0.3 });
    this.buildButterflies(scene, quality);
    this.buildFireflies(scene, quality);
    this.buildBirds(scene);
    this.visDist = quality === 'low' ? 60 : quality === 'mid' ? 80 : 100;
  }
  add(kind, x, z, opts) {
    for (let k = 0; k < 20 && !isFree(x, z, 0.8); k++) { x += (this.rnd() - 0.5) * 6; z += (this.rnd() - 0.5) * 6; }
    const a = new Animal(kind, x, z, opts, this.rnd, this.scene);
    this.animals.push(a); return a;
  }
  buildButterflies(scene, quality) {
    const n = quality === 'low' ? 25 : 50;
    const wing = new THREE.CircleGeometry(0.07, 6); wing.translate(0.06, 0, 0);
    this.bfMesh = new THREE.InstancedMesh(wing, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), n * 2);
    this.bfMesh.frustumCulled = false;
    const cols = ['#ffd23f', '#ffffff', '#ff8c42', '#7ec8e3', '#c77dff'].map(c => new THREE.Color(c));
    this.butterflies = [];
    for (let i = 0; i < n; i++) {
      this.bfMesh.setColorAt(i * 2, cols[i % cols.length]); this.bfMesh.setColorAt(i * 2 + 1, cols[i % cols.length]);
      this.butterflies.push({ t: this.rnd() * 10, c: new THREE.Vector3(), phase: this.rnd() * 6 });
    }
    scene.add(this.bfMesh);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1);
  }
  buildFireflies(scene, quality) {
    const n = quality === 'low' ? 80 : 200;
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(n * 3); this.ffBase = [];
    for (let i = 0; i < n; i++) this.ffBase.push({ x: (this.rnd() - 0.5) * 60, y: 0.5 + this.rnd() * 2.5, z: (this.rnd() - 0.5) * 60, ph: this.rnd() * 6.28 });
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const tex = glowTexture();
    this.ffMat = new THREE.PointsMaterial({ size: 0.35, map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#d6ff7a', opacity: 0 });
    this.fireflies = new THREE.Points(g, this.ffMat); this.fireflies.frustumCulled = false;
    scene.add(this.fireflies);
  }
  buildBirds(scene) {
    this.birds = [];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.25, 0, 0, 0, 0, 0.06, 0.25, 0, 0, 0, 0.02, -0.08], 3));
    g.setIndex([0, 1, 3, 1, 2, 3]); g.computeVertexNormals();
    this.birdMesh = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: '#2b2b30', side: THREE.DoubleSide }), 27);
    this.birdMesh.frustumCulled = false; scene.add(this.birdMesh);
    for (let f = 0; f < 3; f++) {
      const flock = { c: new THREE.Vector3((this.rnd() - 0.5) * 400, 40 + this.rnd() * 30, (this.rnd() - 0.5) * 400), v: new THREE.Vector3(this.rnd() - 0.5, 0, this.rnd() - 0.5).normalize().multiplyScalar(9), members: [] };
      for (let i = 0; i < 9; i++) flock.members.push({ off: new THREE.Vector3((this.rnd() - 0.5) * 8, (this.rnd() - 0.5) * 3, (this.rnd() - 0.5) * 8), ph: this.rnd() * 6 });
      this.birds.push(flock);
    }
  }
  // Lista de criaturas observables (para los prismáticos)
  observables() {
    const out = [];
    this.extraObservables = this.extraObservables || [];
    for (const a of this.wild) out.push({ id: a.id, pos: a.pos, h: 0.8, ref: a });
    for (const s of this.squirrels) out.push({ id: 'ardilla', pos: s.obj.position, h: 0.15, ref: s });
    for (const p of this.peckers) out.push({ id: 'pito', pos: p.obj.position, h: 0.1, ref: p });
    for (const v of this.vultures) out.push({ id: 'buitre', pos: v.obj.position, h: 0, ref: v, far: true });
    for (const f of this.fish) if (f.obj.visible) out.push({ id: 'trucha', pos: f.obj.position, h: 0, ref: f });
    out.push(...this.extraObservables);
    return out;
  }
  update(dt, player, elapsed, night, sound) {
    this.extraObservables = [];
    const vd = this.visDist;
    for (const a of this.animals) {
      const d = Math.hypot(a.pos.x - player.pos.x, a.pos.z - player.pos.z);
      a.obj.visible = d < vd;
      const sh = d < 35;
      if (a.shadowOn !== sh) { a.shadowOn = sh; a.obj.traverse(o => { if (o.isMesh && !o.userData.outline) o.castShadow = sh; }); }
      setOutlines(a.obj, d < 26);
      if (d < vd + 30 || a.alwaysUpdate) a.update(dt, player);
    }
    // ardillas: bajan al suelo, corren, suben al tronco si te acercas
    for (const s of this.squirrels) {
      s.t += dt;
      const t = s.tree; const dp = Math.hypot(player.pos.x - t.x, player.pos.z - t.z);
      if (dp < 6 && s.state !== 'up') s.state = 'up';
      else if (dp > 14 && s.state === 'up' && s.t > 6) { s.state = 'ground'; s.t = 0; }
      const trunkR = 0.36 * t.s;
      if (s.state === 'up') {
        s.climb = Math.min(3.2 * t.s, s.climb + dt * 3);
        const a = s.t * 0.4;
        s.obj.position.set(t.x + Math.sin(a) * trunkR, t.y + s.climb, t.z + Math.cos(a) * trunkR);
        s.obj.rotation.set(-Math.PI / 2, a + Math.PI, 0, 'YXZ');
      } else {
        s.climb = Math.max(0, s.climb - dt * 3);
        const a = s.t * 0.7;
        const r = 1.2 + Math.sin(s.t * 0.9) * 0.8;
        const x = t.x + Math.sin(a) * r, z = t.z + Math.cos(a) * r;
        const hop = Math.abs(Math.sin(s.t * 9)) * 0.08;
        s.obj.position.set(x, s.climb > 0 ? t.y + s.climb : terrainHeight(x, z) + hop, z);
        s.obj.rotation.set(0, a + Math.PI / 2, 0);
      }
      s.obj.userData.tail.rotation.x = Math.sin(s.t * 6) * 0.3;
    }
    for (const p of this.peckers) {
      p.t += dt;
      const peck = (p.t % 4) < 1.2 ? Math.abs(Math.sin(p.t * 25)) : 0;
      p.obj.userData.body.rotation.x = peck * 0.35;
      if (peck && (p.t % 4) < 0.05 && sound) sound.woodpecker(p.obj.position);
    }
    for (const v of this.vultures) {
      v.a += v.w * dt;
      v.obj.position.set(v.c.x + Math.cos(v.a) * v.r, v.c.y + Math.sin(v.a * 2) * 3, v.c.z + Math.sin(v.a) * v.r);
      v.obj.rotation.set(0, -v.a, 0.35);
      const flap = Math.sin(elapsed * 1.5 + v.a * 5) * 0.08;
      v.obj.userData.wl.rotation.z = flap; v.obj.userData.wr.rotation.z = -flap;
    }
    // truchas: saltan cerca del jugador si está junto al río
    for (const f of this.fish) {
      f.t -= dt;
      if (f.jump < 0 && f.t < 0) {
        const r = riverInfo(player.pos.x, player.pos.z);
        if (r.d < 25) {
          const z = player.pos.z + (this.rnd() - 0.5) * 24;
          const x = rx(z) + (this.rnd() - 0.5) * 4;
          if (Math.hypot(x - player.pos.x, z - player.pos.z) > 3 && waterLevelAt(x, z) > -1e8) { f.jump = 0; f.x = x; f.z = z; f.y0 = waterLevelAt(x, z); f.dir = this.rnd() * 6.28; sound?.splash(new THREE.Vector3(x, f.y0, z), 0.3); }
        }
        f.t = 2 + this.rnd() * 5;
      }
      if (f.jump >= 0) {
        f.jump += dt;
        const k = f.jump / 0.8;
        f.obj.visible = k < 1;
        f.obj.position.set(f.x + Math.sin(f.dir) * k * 1.2, f.y0 + Math.sin(k * Math.PI) * 0.9, f.z + Math.cos(f.dir) * k * 1.2);
        f.obj.rotation.set(-Math.cos(k * Math.PI) * 1.1, f.dir, 0, 'YXZ');
        if (k >= 1) { f.jump = -1; sound?.splash(f.obj.position, 0.25); }
      }
    }
    // mariposas de día
    const M4 = this._m, Q = this._q, E = this._e, Pp = this._p, S = this._s;
    this.butterflies.forEach((b, i) => {
      b.t += dt;
      if (b.c.distanceTo(player.pos) > 30 || b.t > 25) { const a = this.rnd() * 6.28, r = 6 + this.rnd() * 20; b.c.set(player.pos.x + Math.cos(a) * r, 0, player.pos.z + Math.sin(a) * r); b.c.y = terrainHeight(b.c.x, b.c.z); b.t = 0; }
      const x = b.c.x + Math.sin(b.t * 0.7 + b.phase) * 2.5, z = b.c.z + Math.cos(b.t * 0.5 + b.phase) * 2.5;
      const y = terrainHeight(x, z) + 0.6 + Math.sin(b.t * 2) * 0.3;
      const yaw = b.t * 0.6 + b.phase, f = Math.sin(b.t * 22) * 1.1;
      const sc = night < 0.5 ? 1 : 0;
      for (const [k, s2] of [[0, 1], [1, -1]]) {
        E.set(0, yaw + s2 * f, 0, 'YXZ'); Q.setFromEuler(E);
        S.set(s2 * sc, sc, sc);
        M4.compose(Pp.set(x, y, z), Q, S);
        this.bfMesh.setMatrixAt(i * 2 + k, M4);
      }
    });
    this.bfMesh.instanceMatrix.needsUpdate = true;
    // luciérnagas de noche
    this.ffMat.opacity = clamp((night - 0.4) * 2, 0, 1);
    if (this.ffMat.opacity > 0) {
      const p = this.fireflies.geometry.attributes.position;
      for (let i = 0; i < this.ffBase.length; i++) {
        const b = this.ffBase[i];
        const x = Math.round(player.pos.x / 60) * 60 + b.x + Math.sin(elapsed * 0.4 + b.ph) * 2, z = Math.round(player.pos.z / 60) * 60 + b.z + Math.cos(elapsed * 0.3 + b.ph) * 2;
        const blink = Math.sin(elapsed * 2 + b.ph * 3) > 0.2 ? 1 : 0;
        p.setXYZ(i, x, terrainHeight(x, z) + b.y + Math.sin(elapsed + b.ph) * 0.3 - (blink ? 0 : 100), z);
      }
      p.needsUpdate = true;
    }
    this.fireflies.visible = this.ffMat.opacity > 0;
    // bandadas
    let bi = 0;
    for (const f of this.birds) {
      f.c.addScaledVector(f.v, dt);
      if (Math.abs(f.c.x - player.pos.x) > 250 || Math.abs(f.c.z - player.pos.z) > 250) { f.c.set(player.pos.x - f.v.x * 20, 35 + this.rnd() * 30, player.pos.z - f.v.z * 20); }
      const yaw = Math.atan2(f.v.x, f.v.z);
      for (const m of f.members) {
        Pp.copy(f.c).add(m.off); Pp.y += Math.sin(elapsed * 1.3 + m.ph) * 0.6;
        E.set(0, yaw, 0); Q.setFromEuler(E);
        const vis = night < 0.6 ? 1.6 : 0;
        S.set(vis, vis * (1 + Math.sin(elapsed * 12 + m.ph) * 0.75), vis);
        M4.compose(Pp, Q, S); this.birdMesh.setMatrixAt(bi++, M4);
      }
    }
    this.birdMesh.instanceMatrix.needsUpdate = true;
  }
}

export function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,0.6)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
export { quadruped, SPECIES };
