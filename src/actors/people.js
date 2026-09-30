// Vecinos y seres de leyenda: figuras articuladas procedurales con animación propia
import * as THREE from 'three';
import { groundHeight } from '../world/heightfield.js';
import { resolve, addCircle } from '../world/colliders.js';
import { clamp, damp, dampAngle, lerp, mulberry32 } from '../util/math.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildMinifig, lookToMinifig, MinifigAnimator, setOutlines } from './minifig.js';

const matCache = new Map();
export function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o }));
  return matCache.get(key);
}
function mesh(geo, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; }
const capsule = (r, l, s = 8) => new THREE.CapsuleGeometry(r, l, 4, s);

function faceTexture(o) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = o.skin; g.fillRect(0, 0, 256, 128);
  // pelo (arriba y detrás)
  if (o.hair) {
    g.fillStyle = o.hair;
    g.fillRect(0, 0, 256, o.bald ? 14 : 38);
    if (!o.bald) { g.fillRect(118, 0, 138, o.longHair ? 118 : 80); g.beginPath(); g.ellipse(64, 34, 64, 14, 0, 0, 7); g.fill(); }
  }
  const fx = 64; // centro de la cara (u = 0,25)
  // mejillas
  g.fillStyle = 'rgba(230,110,100,0.35)'; g.beginPath(); g.ellipse(fx - 22, 78, 9, 6, 0, 0, 7); g.ellipse(fx + 22, 78, 9, 6, 0, 0, 7); g.fill();
  // ojos
  for (const s of [-1, 1]) {
    const ex = fx + s * 14, ey = 62;
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(ex, ey, 7, 8.5, 0, 0, 7); g.fill();
    g.fillStyle = o.eyes || '#5a3a1e'; g.beginPath(); g.ellipse(ex + s * 0.5, ey + 1, 5, 6, 0, 0, 7); g.fill();
    g.fillStyle = '#140c08'; g.beginPath(); g.ellipse(ex + s * 0.5, ey + 1.5, 2.6, 3.2, 0, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ex - 1.5, ey - 1.5, 1.6, 0, 7); g.fill();
    // cejas
    g.strokeStyle = o.brows || o.hair || '#3a2a1a'; g.lineWidth = o.old ? 3 : 3.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(ex - 7 * s, ey - 13); g.quadraticCurveTo(ex, ey - 17 - (o.brow || 0), ex + 7 * s, ey - 12); g.stroke();
    if (o.old) { g.strokeStyle = 'rgba(80,50,40,0.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(ex + s * 9, ey + 3); g.lineTo(ex + s * 13, ey + 1); g.stroke(); }
  }
  // nariz
  g.strokeStyle = 'rgba(120,60,40,0.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(fx - 3, 80); g.quadraticCurveTo(fx, 83, fx + 3, 80); g.stroke();
  // bigote / barba
  if (o.moustache) { g.fillStyle = o.moustache; g.beginPath(); g.ellipse(fx - 7, 88, 8, 3.5, 0.2, 0, 7); g.ellipse(fx + 7, 88, 8, 3.5, -0.2, 0, 7); g.fill(); }
  if (o.beard) { g.fillStyle = o.beard; g.beginPath(); g.ellipse(fx, 108, 30, 22, 0, 0, 7); g.fill(); g.fillRect(fx - 34, 80, 68, 30); g.fillStyle = o.skin; g.beginPath(); g.ellipse(fx, 90, 8, 4, 0, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// ---- Construcción de una figura ----
// Las piezas de cada articulación se fusionan en una sola malla con colores por vértice
const FIG_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
const FIG_MAT2 = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
const FIG_GOLD = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.7 });
const _mtx = new THREE.Matrix4(), _q2 = new THREE.Quaternion(), _e2 = new THREE.Euler(), _v2 = new THREE.Vector3(), _s2 = new THREE.Vector3();
class FigParts {
  constructor() { this.map = new Map(); }
  add(group, geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1], kind = 0) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    _e2.set(rot[0], rot[1], rot[2]); _q2.setFromEuler(_e2);
    g.applyMatrix4(_mtx.compose(_v2.set(pos[0], pos[1], pos[2]), _q2, _s2.set(scl[0], scl[1], scl[2])));
    const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
    const key = group.uuid + ':' + kind;
    if (!this.map.has(key)) this.map.set(key, { group, kind, list: [] });
    this.map.get(key).list.push(g);
  }
  build() {
    for (const { group, kind, list } of this.map.values()) {
      const m = new THREE.Mesh(mergeGeometries(list), kind === 1 ? FIG_MAT2 : kind === 2 ? FIG_GOLD : FIG_MAT);
      m.castShadow = true; m.receiveShadow = true;
      group.add(m);
    }
  }
}

// look: { skin, hair, height, build, shirt, pants, skirt, vest, shoes, sash, txapela, scarf, apron, hat, staff, basket, fur, feet }
export function buildFigure(look) {
  const H = look.height || 1.72;
  const k = H / 1.72;
  const F = new FigParts();
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const hips = new THREE.Group(); hips.position.y = 0.92 * k; body.add(hips);
  const B = look.build || 1;
  const J = {};
  const shirt = look.shirt || '#e8e0cc';
  // torso
  const torso = new THREE.Group(); hips.add(torso); J.torso = torso;
  F.add(torso, capsule(0.17 * k * B, 0.32 * k), shirt, [0, 0.26 * k, 0]);
  if (look.vest) F.add(torso, capsule(0.182 * k * B, 0.26 * k), look.vest, [0, 0.27 * k, 0], [0, 0, 0], [1, 1, 0.95]);
  if (look.apron) F.add(hips, new THREE.BoxGeometry(0.3 * k, 0.55 * k, 0.02), look.apron, [0, -0.02 * k, 0.17 * k * B]);
  if (look.sash) F.add(torso, new THREE.CylinderGeometry(0.185 * k * B, 0.185 * k * B, 0.1 * k, 12), look.sash, [0, 0.03 * k, 0]);
  if (look.fur) for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2;
    F.add(torso, new THREE.ConeGeometry(0.09 * k, 0.35 * k, 5), look.fur, [Math.sin(a) * 0.17 * k * B, 0.05 * k + (i % 3) * 0.14 * k, Math.cos(a) * 0.17 * k * B], [Math.PI - Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3]);
  }
  // cuello y cabeza
  const neck = new THREE.Group(); neck.position.y = 0.52 * k; torso.add(neck);
  F.add(neck, new THREE.CylinderGeometry(0.055 * k, 0.065 * k, 0.1 * k, 8), look.skin, [0, 0.03 * k, 0]);
  const head = new THREE.Group(); head.position.y = 0.17 * k; neck.add(head); J.head = head;
  const headR = 0.135 * k * (look.headScale || 1);
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTexture(look), roughness: 0.75 });
  const hd = mesh(new THREE.SphereGeometry(headR, 22, 14), faceMat); hd.scale.set(0.92, 1.08, 0.98); head.add(hd);
  for (const s of [-1, 1]) F.add(head, new THREE.SphereGeometry(0.03 * k, 8, 6), look.skin, [s * headR * 0.92, 0, 0]);
  F.add(head, new THREE.SphereGeometry(0.024 * k, 8, 6), look.skin, [0, -0.01 * k, headR * 0.98]);
  const mouth = mesh(new THREE.SphereGeometry(0.018 * k, 8, 6), mat('#6b2a24'), 0, -0.058 * k, headR * 0.93); mouth.scale.set(1.5, 0.35, 0.5); mouth.castShadow = false; head.add(mouth); J.mouth = mouth;
  const lids = new THREE.Group(); head.add(lids); J.lids = lids;
  for (const s of [-1, 1]) F.add(lids, new THREE.SphereGeometry(0.03 * k, 8, 6), look.skin, [s * 0.052 * k, 0.018 * k, headR * 0.9], [0, 0, 0], [1.1, 1, 0.5]);
  lids.visible = false;
  if (look.hair && !look.bald) {
    const hc = look.hair;
    F.add(head, new THREE.SphereGeometry(headR * 1.05, 16, 9, 0, Math.PI * 2, 0, Math.PI * 0.52), hc, [0, 0.012 * k, -0.01 * k], [0, 0, 0], [0.95, 1.05, 1.02]);
    if (look.bun) F.add(head, new THREE.SphereGeometry(0.065 * k, 10, 8), hc, [0, 0.09 * k, -0.12 * k]);
    if (look.braids) for (const s of [-1, 1]) F.add(head, capsule(0.028 * k, 0.22 * k), hc, [s * 0.11 * k, -0.16 * k, -0.05 * k]);
    if (look.longHair) F.add(head, capsule(headR * 0.9, 0.2 * k), hc, [0, -0.12 * k, -0.05 * k], [0, 0, 0], [1, 1, 0.6]);
    if (look.messy) for (let i = 0; i < 7; i++) { const a = i * 0.9; F.add(head, new THREE.ConeGeometry(0.03 * k, 0.08 * k, 5), hc, [Math.sin(a) * 0.07 * k, headR * 0.95, Math.cos(a) * 0.07 * k], [Math.cos(a) * 0.6, 0, -Math.sin(a) * 0.6]); }
  }
  if (look.txapela) {
    F.add(head, new THREE.CylinderGeometry(headR * 1.25, headR * 1.12, 0.05 * k, 20), look.txapela, [0, headR * 0.82, -0.01 * k], [0, 0, 0.12]);
    F.add(head, new THREE.CylinderGeometry(0.006, 0.006, 0.03 * k, 5), look.txapela, [0, headR * 0.82 + 0.035 * k, 0]);
  }
  if (look.hat === 'mask') {
    F.add(head, new THREE.SphereGeometry(headR * 1.02, 16, 12, -Math.PI * 0.35, Math.PI * 0.7, Math.PI * 0.2, Math.PI * 0.6), '#f1e7d6', [0, 0, 0], [0, 0, 0], [1, 1, 1], 1);
    for (const s of [-1, 1]) F.add(head, new THREE.SphereGeometry(0.022 * k, 8, 6), '#1a1410', [s * 0.05 * k, 0.02 * k, headR * 1.0]);
    F.add(head, new THREE.ConeGeometry(headR * 1.1, 0.42 * k, 10), look.hatColor || '#c23b3b', [0, headR + 0.14 * k, 0]);
    for (let i = 0; i < 6; i++) F.add(head, new THREE.BoxGeometry(0.02, 0.35 * k, 0.005), ['#e03c3c', '#f2c230', '#3a8fd6', '#3ca05a'][i % 4], [Math.sin(i) * 0.06, headR + 0.15 * k, Math.cos(i) * 0.06 - 0.04], [0.3, 0, 0]);
  }
  if (look.scarf) {
    F.add(torso, new THREE.TorusGeometry(0.075 * k, 0.03 * k, 6, 12), look.scarf, [0, 0.5 * k, 0], [Math.PI / 2, 0, 0]);
    F.add(torso, new THREE.ConeGeometry(0.05 * k, 0.1 * k, 4), look.scarf, [0, 0.44 * k, 0.09 * k], [Math.PI, 0, 0]);
  }
  if (look.crown) F.add(head, new THREE.TorusGeometry(headR * 0.9, 0.012, 5, 16), '#e8c34a', [0, headR * 0.7, 0], [Math.PI / 2, 0, 0], [1, 1, 1], 2);
  // brazos
  const armC = look.sleeves || shirt, skinC = look.skin;
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.21 * k * B, 0.44 * k, 0); torso.add(sh);
    F.add(sh, capsule(0.052 * k * B, 0.2 * k), armC, [0, -0.13 * k, 0]);
    const el = new THREE.Group(); el.position.y = -0.27 * k; sh.add(el);
    F.add(el, capsule(0.045 * k * B, 0.18 * k), look.shortSleeves ? skinC : armC, [0, -0.11 * k, 0]);
    F.add(el, new THREE.SphereGeometry(0.05 * k, 8, 6), look.gloves || skinC, [0, -0.25 * k, 0]);
    sh.rotation.z = s * 0.08;
    J[s < 0 ? 'armL' : 'armR'] = sh; J[s < 0 ? 'elbowL' : 'elbowR'] = el;
    if (look.fur) for (let i = 0; i < 3; i++) F.add(sh, new THREE.ConeGeometry(0.05 * k, 0.2 * k, 5), look.fur, [0, -0.05 * k - i * 0.09 * k, 0.04 * k], [Math.PI - 0.5, 0, 0]);
  }
  // piernas
  const legC = look.pants || '#3b3a40';
  for (const s of [-1, 1]) {
    const hp = new THREE.Group(); hp.position.set(s * 0.09 * k * B, 0, 0); hips.add(hp);
    F.add(hp, capsule(0.07 * k * B, 0.28 * k), legC, [0, -0.2 * k, 0]);
    const kn = new THREE.Group(); kn.position.y = -0.42 * k; hp.add(kn);
    F.add(kn, capsule(0.058 * k * B, 0.28 * k), look.socks || legC, [0, -0.2 * k, 0]);
    if (look.feet === 'duck') F.add(kn, new THREE.ConeGeometry(0.09 * k, 0.24 * k, 3), '#e8a23a', [0, -0.44 * k, 0.07 * k], [Math.PI / 2, 0, 0], [1.3, 1, 0.3]);
    else F.add(kn, new THREE.BoxGeometry(0.1 * k, 0.07 * k, 0.22 * k), look.shoes || '#4a2f1c', [0, -0.46 * k, 0.04 * k]);
    J[s < 0 ? 'legL' : 'legR'] = hp; J[s < 0 ? 'kneeL' : 'kneeR'] = kn;
  }
  F.add(hips, capsule(0.16 * k * B, 0.06 * k), legC, [0, 0, 0]);
  if (look.skirt) F.add(hips, new THREE.CylinderGeometry(0.17 * k * B, 0.3 * k * B, 0.52 * k, 14, 1, true), look.skirt, [0, -0.2 * k, 0], [0, 0, 0], [1, 1, 1], 1);
  // accesorios
  if (look.staff) { F.add(J.elbowR, new THREE.CylinderGeometry(0.018, 0.022, 1.4 * k, 6), '#6b4a2a', [0, -0.3 * k, 0.05]); J.staff = true; }
  if (look.basket) F.add(J.elbowL, new THREE.CylinderGeometry(0.14, 0.1, 0.16, 10, 1, true), '#a57a45', [0, -0.36 * k, 0.05], [0, 0, 0], [1, 1, 1], 1);
  if (look.comb) F.add(J.elbowR, new THREE.BoxGeometry(0.12, 0.05, 0.01), '#ffd24a', [0, -0.3 * k, 0.03], [0, 0, 0], [1, 1, 1], 2);
  if (look.bell) { const bl = new THREE.Group(); bl.position.set(0, -0.05 * k, -0.2 * k); hips.add(bl); F.add(bl, new THREE.CylinderGeometry(0.06, 0.1, 0.18, 8), '#6f6552', [0, 0, 0], [0, 0, 0], [1, 1, 1], 2); J.bell = bl; }
  if (look.ribbons) for (let i = 0; i < 5; i++) F.add(torso, new THREE.BoxGeometry(0.03, 0.4 * k, 0.005), ['#e03c3c', '#f2c230', '#3a8fd6', '#3ca05a', '#b34fc4'][i], [(i - 2) * 0.05, 0.05 * k, 0.18 * k], [0, 0, (i - 2) * 0.1]);
  if (look.castanets) for (const s of ['elbowL', 'elbowR']) F.add(J[s], new THREE.SphereGeometry(0.04, 8, 6), '#5a3a1e', [0, -0.3 * k, 0.03]);
  F.build();
  root.userData.J = J; root.userData.H = H;
  return root;
}

// ---- Actor con comportamiento ----
export class Actor {
  constructor(def, scene) {
    this.def = def;
    this.id = def.id; this.name = def.name;
    this.obj = buildMinifig(def.mini || lookToMinifig(def.look));
    this.J = this.obj.userData.J;
    this.anim = new MinifigAnimator(this.obj);
    scene.add(this.obj);
    this.pos = new THREE.Vector3(def.x, 0, def.z);
    this.home = { x: def.x, z: def.z };
    this.heading = def.heading ?? 0;
    this.speed = 0; this.t = Math.random() * 10; this.phase = 0;
    this.talking = 0; this.state = 'idle'; this.wait = 1 + Math.random() * 3;
    this.target = null;
    this.route = def.route || null; this.routeI = 0;
    this.wander = def.wander ?? 0;
    this.walkSpeed = def.walkSpeed ?? 1.2;
    this.lookAt = null; this.gesture = 0; this.dance = 0; this.wave = 0;
    this.blink = 2;
    this.radius = 0.35;
    this.visible = true;
    this.collider = addCircle(def.x, def.z, 0.4, { actor: this, ghost: false });
    this.pos.y = groundHeight(def.x, def.z);
    this.sync();
  }
  setPos(x, z, heading) { this.pos.set(x, groundHeight(x, z), z); this.home = { x, z }; if (heading != null) this.heading = heading; this.sync(); }
  update(dt, player) {
    this.t += dt;
    const dP = player ? Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z) : 99;
    setOutlines(this.obj, dP < 22);
    // mira al jugador si está cerca
    const near = dP < 4.5 && !this.dance;
    let moving = false;
    if (this.talking > 0 || (near && this.state !== 'walk')) {
      this.lookAt = player.pos;
    } else this.lookAt = null;
    if (this.talking <= 0 && !this.frozen && !this.dance) {
      if (this.state === 'idle') {
        this.wait -= dt;
        if (this.wait <= 0 && !near) {
          if (this.route) { this.target = this.route[this.routeI]; this.routeI = (this.routeI + 1) % this.route.length; this.state = 'walk'; }
          else if (this.wander > 0) { const a = Math.random() * 6.28, r = Math.random() * this.wander; this.target = { x: this.home.x + Math.cos(a) * r, z: this.home.z + Math.sin(a) * r }; this.state = 'walk'; }
          this.wait = 2 + Math.random() * 5;
        }
      } else if (this.state === 'walk' && this.target) {
        const dx = this.target.x - this.pos.x, dz = this.target.z - this.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.4 || (near && !this.ignorePlayer)) { this.state = 'idle'; this.target = d < 0.4 ? null : this.target; }
        else {
          this.heading = dampAngle(this.heading, Math.atan2(dx, dz), 6, dt);
          this.speed = damp(this.speed, this.target.run ? this.walkSpeed * 3 : this.walkSpeed, 5, dt);
          moving = true;
        }
      }
    }
    if (!moving) this.speed = damp(this.speed, 0, 8, dt);
    if (this.speed > 0.01) {
      let nx = this.pos.x + Math.sin(this.heading) * this.speed * dt, nz = this.pos.z + Math.cos(this.heading) * this.speed * dt;
      const r = resolve(nx, nz, this.radius, this.collider);
      if (r.hit && this.state === 'walk') { this.stuck = (this.stuck || 0) + dt; if (this.stuck > 1.5) { this.state = 'idle'; this.stuck = 0; this.target = null; } }
      this.pos.x = r.x; this.pos.z = r.z;
      this.phase += this.speed * dt * 4.2;
    }
    if (this.lookAt && this.speed < 0.3) this.heading = dampAngle(this.heading, Math.atan2(this.lookAt.x - this.pos.x, this.lookAt.z - this.pos.z), 5, dt);
    this.pos.y = groundHeight(this.pos.x, this.pos.z);
    this.collider.x = this.pos.x; this.collider.z = this.pos.z;
    this.animate(dt);
    this.sync();
  }
  animate(dt) {
    if (this.talking > 0) this.talking -= dt;
    if (this.wave > 0) this.wave -= dt;
    let lookYaw = 0;
    if (this.lookAt && this.speed < 0.3) {
      const want = Math.atan2(this.lookAt.x - this.pos.x, this.lookAt.z - this.pos.z);
      lookYaw = Math.max(-0.9, Math.min(0.9, Math.atan2(Math.sin(want - this.heading), Math.cos(want - this.heading))));
    }
    this.anim.update(dt, { speed: this.speed, grounded: true, talking: this.talking, wave: this.wave, dance: this.dance, lookYaw, bent: this.def.look?.bent || 0, cheer: this.cheer || 0, clap: this.clap || 0 });
    if (this.cheer > 0) this.cheer -= dt;
    if (this.clap > 0) this.clap -= dt;
  }
  say(sec = 3) { this.talking = sec; }
  sync() {
    this.obj.position.copy(this.pos);
    this.obj.rotation.y = this.heading;
    this.obj.visible = this.visible;
  }
}
