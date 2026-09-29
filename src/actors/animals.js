// Fauna del valle: ovejas latxas, perro pastor, vacas pirenaicas, pottokas, corzos, ciervos,
// ardillas, pito negro, buitres, truchas, mariposas y luciérnagas
import * as THREE from 'three';
import { groundHeight, terrainHeight, waterLevelAt, surfAt } from '../world/heightfield.js';
import { resolve, isFree } from '../world/colliders.js';
import { PLACES, rx, riverInfo, HALF, iratiMask } from '../world/layout.js';
import { TREES } from '../world/nature.js';
import { clamp, damp, dampAngle, lerp, mulberry32 } from '../util/math.js';
import { setOutlines } from './minifig.js';
import { beast, bird, squirrel, woodpecker, trout, owl } from './beasts.js';

// Los modelos (anatomía por secciones, pelaje y aves) están en beasts.js
const SPECIES = { sheep: 'sheep', dog: 'dog', cow: 'cow', pottoka: 'pottoka', corzo: 'corzo', ciervo: 'ciervo', jabali: 'jabali', zorro: 'zorro', goat: 'goat' };
function quadruped(kind, rnd) { return beast(typeof kind === 'string' ? kind : 'sheep', rnd); }

// ---------- Animal con comportamiento ----------
export class Animal {
  constructor(kind, x, z, opts, rnd, scene) {
    this.kind = kind; this.opts = opts;
    const q = beast(kind, rnd, opts);
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

const buildSquirrel = squirrel, buildWoodpecker = woodpecker, buildFish = trout;
const buildVulture = () => bird('buitre');
// Aves que se ven en el cielo de cada comarca (para los prismáticos)
const SKY = {
  pirineo: ['buitre', 'buitre', 'quebrantahuesos', 'aguila', 'buitre'], prepirineo: ['buitre', 'buitre', 'aguila', 'milano'], sanguesa: ['buitre', 'buitre', 'buitre', 'milano', 'aguila'],
  bidasoa: ['milano', 'buitre', 'milano', 'aguila'], 'larraun-leitzaldea': ['milano', 'buitre', 'aguila'], sakana: ['milano', 'buitre', 'milano'], pamplona: ['milano', 'milano', 'ciguena'],
  'tierra-estella': ['milano', 'buitre', 'milano', 'aguila'], 'valdizarbe-novenera': ['milano', 'ciguena', 'buitre'], 'zona-media': ['milano', 'ciguena', 'ciguena', 'buitre'],
  'ribera-alta': ['ciguena', 'ciguena', 'milano'], ribera: ['ciguena', 'ciguena', 'ciguena', 'milano'],
};
const CRANES = ['zona-media', 'ribera-alta', 'ribera', 'valdizarbe-novenera'];

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
    ['buitre', 'buitre', 'quebrantahuesos', 'buitre', 'aguila', 'milano'].forEach((k, i) => {
      const o = bird(k); scene.add(o);
      this.vultures.push({ obj: o, c: new THREE.Vector3(120 + (i % 2) * 80 - 40, 95 + i * 9, -200 + (i % 3) * 60), r: 30 + rnd() * 30, a: rnd() * 6.28, w: 0.1 + rnd() * 0.08, id: k, pos: o.position, flapK: o.userData.flap });
    });
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
    for (let i = 0; i < 2; i++) { const [x, z] = near(forest, 110); this.wild.push(this.add('zorro', x, z, { id: 'zorro', range: 30, walk: 1.1, run: 6.5, flee: 11, radius: 0.3 })); }
    this.squirrels = []; this.peckers = [];
    const trees = TREES.filter(t => Math.hypot(t.x - forest.x, t.z - forest.z) < 150 && t.type !== 'olive');
    for (let i = 0; i < 6 && trees.length; i++) { const t = trees[Math.floor(rnd() * trees.length)]; const o = buildSquirrel(); scene.add(o); this.squirrels.push({ obj: o, tree: t, state: 'ground', t: rnd() * 5, pos: new THREE.Vector3(t.x + 1, 0, t.z), heading: 0, id: 'ardilla', climb: 0 }); }
    if (fam === 'atlantic' || fam === 'pyrenean') for (let i = 0; i < 2 && trees.length; i++) { const t = trees[Math.floor(rnd() * trees.length)]; const o = buildWoodpecker(); scene.add(o); const a = rnd() * 6.28; o.position.set(t.x + Math.sin(a) * 0.38 * t.s, t.y + 2.4 * t.s, t.z + Math.cos(a) * 0.38 * t.s); o.rotation.y = a + Math.PI; this.peckers.push({ obj: o, t: rnd() * 3, id: 'pito', pos: o.position }); }
    this.vultures = [];
    const gorge = (P.landmarks || []).find(l => l.kind === 'gorge');
    const list = SKY[com] || ['buitre', 'milano'];
    list.forEach((k, i) => {
      const o = bird(k); scene.add(o);
      const low = k === 'ciguena' || k === 'milano';
      const c = gorge && k === 'buitre' ? new THREE.Vector3(gorge.x, 55 + i * 7, gorge.z) : low ? new THREE.Vector3(P.plaza.x + (rnd() - 0.5) * 110, 30 + rnd() * 14, P.plaza.z + (rnd() - 0.5) * 110) : new THREE.Vector3(P.plaza.x + (rnd() - 0.5) * 180, 50 + i * 7, P.plaza.z - 40 + (rnd() - 0.5) * 160);
      // la altura de vuelo se mide sobre el terreno que hay debajo (en los valles del Pirineo el monte sube mucho)
      let gy = 0; for (let a = 0; a < 6.28; a += 0.8) gy = Math.max(gy, terrainHeight(c.x + Math.cos(a) * 40, c.z + Math.sin(a) * 40)); c.y += gy;
      o.scale.setScalar(k === 'ciguena' || k === 'milano' ? 1.25 : 1.4);
      this.vultures.push({ obj: o, c, r: (low ? 18 : 28) + rnd() * 30, a: rnd() * 6.28, w: (low ? 0.16 : 0.1) + rnd() * 0.08, id: k, pos: o.position, flapK: o.userData.flap });
    });
    // grullas en formación de V (paso migratorio por la Laguna de Pitillas y la Ribera)
    this.cranes = null;
    if (CRANES.includes(com)) {
      const g = new THREE.Group(); scene.add(g); const mem = [];
      for (let i = 0; i < 11; i++) { const o = bird('grulla'); const side = i % 2 ? 1 : -1, k = Math.ceil(i / 2); o.position.set(side * k * 2.2, 0, -k * 2.6); g.add(o); mem.push(o); }
      this.cranes = { g, mem, t: rnd() * 60, pos: g.position };
    }
    // lechuzas: sólo aparecen de noche, posadas en ramas bajas
    this.owls = [];
    const perch = TREES.filter(t => t.type !== 'fir' && Math.hypot(t.x - P.plaza.x, t.z - P.plaza.z) < 160);
    for (let i = 0; i < 3 && perch.length; i++) { const t = perch[Math.floor(rnd() * perch.length)]; const o = owl(); o.scale.setScalar(1.6); o.position.set(t.x + 0.6 * t.s, t.y + 3.1 * t.s, t.z); o.rotation.y = rnd() * 6.28; o.visible = false; scene.add(o); this.owls.push({ obj: o, t: rnd() * 8 }); }
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
    for (const v of this.vultures) out.push({ id: v.id, pos: v.obj.position, h: 0, ref: v, far: true, obj: v.obj });
    if (this.cranes) for (const o of this.cranes.mem) out.push({ id: 'grulla', pos: o.getWorldPosition(new THREE.Vector3()), h: 0, far: true, obj: o });
    for (const f of this.fish) if (f.obj.visible) out.push({ id: 'trucha', pos: f.obj.position, h: 0, ref: f });
    for (const o of this.owls || []) if (o.obj.visible) out.push({ id: 'lechuza', pos: o.obj.position, h: 0.4, obj: o.obj });
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
      // planeo con algún aleteo: los buitres casi nunca baten las alas, milanos y cigüeñas algo más
      const k = v.flapK ?? 0.1, burst = Math.max(0, Math.sin(elapsed * 0.35 + v.a * 3)) > 0.85 ? 1 : 0.15;
      const flap = Math.sin(elapsed * (4 + k * 8) + v.a * 5) * k * 3 * burst;
      v.obj.userData.wl.rotation.z = flap; v.obj.userData.wr.rotation.z = -flap;
    }
    if (this.cranes) {
      const C2 = this.cranes; C2.t += dt;
      const L = 700, x = -L / 2 + ((C2.t * 9) % L);
      C2.g.position.set(player.pos.x + x, 58 + Math.sin(C2.t * 0.2) * 3, player.pos.z - 60);
      C2.g.rotation.y = Math.PI / 2;
      C2.mem.forEach((o, i) => { const f = Math.sin(elapsed * 4.2 + i * 0.7) * 0.45; o.userData.wl.rotation.z = f; o.userData.wr.rotation.z = -f; });
    }
    for (const o of this.owls || []) {
      o.obj.visible = night > 0.55; o.t += dt;
      if (o.obj.visible) { o.obj.rotation.y += Math.sin(o.t * 0.7) * dt * 0.8; if (o.t > 9) { o.t = 0; if (Math.hypot(o.obj.position.x - player.pos.x, o.obj.position.z - player.pos.z) < 60) sound?.owl(o.obj.position); } }
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
