// Los pajarillos del pueblo (y las gallinas de las casas de las afueras): gorriones que picotean en el suelo de la plaza, junto a los bancos y a las puertas, y salen
// volando a una farola o a un balcón cuando pasas cerca (y vuelven al rato); palomas que andan cabeceando por la plaza; y
// vencejos que dan vueltas deprisa sobre los tejados. Cada especie es una sola malla repetida (InstancedMesh: una llamada de
// dibujo), y el aleteo y las alas plegadas se hacen en el sombreador. De noche duermen: no se ven.
// Y las bandadas que se cruzan andando (noviembre de 2026): grupos de 8-11 gorriones o jilgueros que comen en el suelo de
// la calle por delante del jugador, a 18-34 m, y salen volando todos a la vez cuando llega cerca, con su aleteo, como una
// nube que se abre y se va por encima de los tejados. La que se ha ido o queda atrás vuelve a posarse más adelante: andando
// por el pueblo siempre hay alguna. Antes solo había las de la plaza y casi nunca se veían salir.
//   new Pajarillos(scene, { quality, sound }) · update(dt, t, player, night, oculto) · onVisto(especie): una bandada que sale
//   volando o una gallina que se aparta al acercarse el jugador (se apunta en la fauna, game/townGame.js)
import * as THREE from 'three';
import { PLACES } from './layout.js';
import { TOWN } from './townBuilder.js';
import { VILLAGE } from './village.js';
import { groundHeight } from './heightfield.js';
import { isFree } from './colliders.js';
import { pathQuery, riverInfo } from './layout.js';
import { mulberry32 } from '../util/math.js';

// ---------- el cuerpo: cuerpo, cabeza, pico, cola y dos alas (aAla: -1 la izquierda, 1 la derecha, 0 lo demás) ----------
// L: largo del cuerpo; o: { lomo, pecho, cabeza, pico, ala, envergadura, cuerda, cola (largo), horquilla }
function cuerpoPajaro(L, o) {
  const parts = [], col = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3), cc = new THREE.Color(c); for (let i = 0; i < n; i++) cc.toArray(a, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const ala = (g, s) => { const n = g.attributes.position.count; g.setAttribute('aAla', new THREE.BufferAttribute(new Float32Array(n).fill(s), 1)); return g; };
  // (el cuerpo: un huevo con el lomo de un color y el pecho de otro)
  const b = new THREE.SphereGeometry(1, 8, 6); b.scale(0.36 * L, 0.34 * L, 0.62 * L);
  { const p = b.attributes.position, a = new Float32Array(p.count * 3), up = new THREE.Color(o.lomo), dn = new THREE.Color(o.pecho), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { c.copy(dn).lerp(up, THREE.MathUtils.smoothstep(p.getY(i) / (0.34 * L), -0.3, 0.5)); c.toArray(a, i * 3); }
    b.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
  parts.push(ala(b, 0));
  // (la cabeza, por defecto la de un pájaro pequeño; la gallina la lleva más alta, adelantada y pequeña, con el cuello)
  const hy = (o.cabezaY ?? 0.26) * L, hz = (o.cabezaZ ?? 0.5) * L, hr = (o.cabezaR ?? 0.24) * L;
  const h = new THREE.SphereGeometry(hr, 7, 5); h.translate(0, hy, hz); parts.push(ala(col(h, o.cabeza), 0));
  if (o.cuello) { const c = new THREE.CylinderGeometry(hr * 0.75, 0.2 * L, hy - 0.05 * L, 6); c.rotateX(-0.35); c.translate(0, hy / 2, hz - 0.08 * L); parts.push(ala(col(c, o.cuello), 0)); }
  const pk = new THREE.ConeGeometry(0.055 * L, 0.2 * L, 4); pk.rotateX(Math.PI / 2); pk.translate(0, hy - 0.03 * L, hz + hr + 0.06 * L); parts.push(ala(col(pk, o.pico), 0));
  // (la gallina: la cresta roja encima de la cabeza, la barbilla bajo el pico y las dos patas amarillas)
  if (o.cresta) {
    const cr = new THREE.SphereGeometry(0.1 * L, 6, 4); cr.scale(0.35, 1, 1.5); cr.translate(0, hy + hr * 0.95, hz); parts.push(ala(col(cr, o.cresta), 0));
    const bb = new THREE.SphereGeometry(0.06 * L, 5, 4); bb.scale(0.5, 1.3, 0.7); bb.translate(0, hy - hr * 0.95, hz + hr * 0.75); parts.push(ala(col(bb, o.cresta), 0));
  }
  if (o.patas) for (const sx of [-1, 1]) { const pt = new THREE.CylinderGeometry(0.022 * L, 0.022 * L, o.patas.l * L, 4); pt.translate(sx * 0.1 * L, -0.3 * L - o.patas.l * L / 2, 0.04 * L); parts.push(ala(col(pt, o.patas.c), 0)); }
  // (la cola: plana, algo levantada; en horquilla, la de los vencejos)
  const cl = new THREE.BufferGeometry(), cw = 0.16 * L, cz = -0.5 * L, ce = cz - o.cola * L, hq = (o.horquilla || 0) * L, cy = (o.colaY || 0) * L;   // (colaY: la punta de la cola, levantada)
  cl.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.04 * L, cz + 0.12 * L, -cw, 0.07 * L + cy, ce - hq, 0, 0.06 * L + cy, ce + hq * 0.6, 0, 0.04 * L, cz + 0.12 * L, 0, 0.06 * L + cy, ce + hq * 0.6, cw, 0.07 * L + cy, ce - hq], 3));
  if (o.colaV) {   // (la gallina: la cola en abanico de pie, hacia arriba y atrás, que se ve de lado; no plana como la de los pájaros)
    const zb = cz + 0.1 * L, yb = 0.05 * L;
    cl.setAttribute('position', new THREE.Float32BufferAttribute([0, yb, zb, 0, yb + 0.5 * L, zb - 0.22 * L, 0, yb + 0.12 * L, ce, 0, yb + 0.5 * L, zb - 0.22 * L, 0, yb + 0.36 * L, ce - 0.04 * L, 0, yb + 0.12 * L, ce], 3));
  }
  cl.computeVertexNormals(); parts.push(ala(col(cl, o.lomo), 0));
  // (las alas: un trapecio desde el hombro, con la punta hacia atrás; de pie se pliegan en el sombreador)
  for (const s of [-1, 1]) {
    const W = o.envergadura * L, C = o.cuerda * L, g = new THREE.BufferGeometry(), x0 = 0.16 * L * s, y0 = 0.12 * L, z0 = 0.18 * L;
    const P = [[x0, y0, z0], [x0, y0, z0 - C], [x0 + s * W, y0 + 0.02 * L, z0 - C * 1.25], [x0 + s * W * 0.55, y0 + 0.01 * L, z0 + 0.02 * L]];
    g.setAttribute('position', new THREE.Float32BufferAttribute([...P[0], ...P[1], ...P[2], ...P[0], ...P[2], ...P[3]], 3));
    g.computeVertexNormals(); parts.push(ala(col(g, o.ala), s));
  }
  const all = parts.map(g => (g.index ? g.toNonIndexed() : g));
  for (const g of all) for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color', 'aAla'].includes(k)) g.deleteAttribute(k);
  const n = all.reduce((a, g) => a + g.attributes.position.count, 0), out = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'color', 'aAla']) {
    const sz = all[0].attributes[k].itemSize, arr = new Float32Array(n * sz); let off = 0;
    for (const g of all) { arr.set(g.attributes[k].array, off); off += g.attributes[k].array.length; }
    out.setAttribute(k, new THREE.BufferAttribute(arr, sz));
  }
  parts.forEach(g => g.dispose());
  return out;
}

// El material: el del pueblo, con las alas que giran alrededor del hombro (z, el largo del cuerpo). aExt: lo extendidas
// (0 plegadas a los lados, 1 abiertas); aAle: lo que aletean; aFase: cada pájaro, a su ritmo
function materialPajaro(hombroX, hombroY, freq) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide });
  const T = { value: 0 };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = T;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute float aAla; attribute float aExt; attribute float aAle; attribute float aFase; uniform float uT;
vec3 alaGira(vec3 p) {
  if (aAla == 0.0) return p;
  vec3 q = p - vec3(aAla * ${hombroX.toFixed(4)}, ${hombroY.toFixed(4)}, 0.0);
  q.x *= mix(0.32, 1.0, aExt); q.z *= mix(0.8, 1.0, aExt);
  float a = (mix(-1.25, 0.15, aExt) + sin(uT * ${freq.toFixed(2)} + aFase) * 0.95 * aAle) * aAla, c = cos(a), s = sin(a);
  q = vec3(q.x * c - q.y * s, q.x * s + q.y * c, q.z);
  return q + vec3(aAla * ${hombroX.toFixed(4)}, ${hombroY.toFixed(4)}, 0.0);
}`).replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
if (aAla != 0.0) { float a = (mix(-1.25, 0.15, aExt) + sin(uT * ${freq.toFixed(2)} + aFase) * 0.95 * aAle) * aAla, c = cos(a), s = sin(a); objectNormal = vec3(objectNormal.x * c - objectNormal.y * s, objectNormal.x * s + objectNormal.y * c, objectNormal.z); }`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = alaGira(transformed);');
  };
  m.customProgramCacheKey = () => 'pajaro' + hombroX.toFixed(3) + freq;
  return { m, T };
}

const ESPECIES = {
  // gorrión común: pardo listado por encima, gris claro por debajo, 15 cm
  gorrion: { L: 0.15, lomo: '#7a5634', pecho: '#c9bfae', cabeza: '#8a6a4a', pico: '#3a3330', ala: '#6e4c2e', envergadura: 1.1, cuerda: 0.42, cola: 0.36, freq: 34 },
  // paloma: gris azulada, más grande y pesada
  paloma: { L: 0.3, lomo: '#8e939c', pecho: '#a3a6ad', cabeza: '#6e7582', pico: '#c9b9a8', ala: '#8a909a', envergadura: 1.25, cuerda: 0.45, cola: 0.42, freq: 18 },
  // jilguero: pardo claro, la cara roja y las alas negras con la banda amarilla (que es lo que se ve al volar), 12 cm
  jilguero: { L: 0.13, lomo: '#a3825a', pecho: '#e9dfcf', cabeza: '#c2302a', pico: '#e0cdb0', ala: '#d2ad2c', envergadura: 1.15, cuerda: 0.42, cola: 0.34, freq: 36 },
  // vencejo: casi negro, alas largas como una hoz y la cola en horquilla
  vencejo: { L: 0.17, lomo: '#2a2a2e', pecho: '#3a3a3e', cabeza: '#2a2a2e', pico: '#1a1a1a', ala: '#232327', envergadura: 2.3, cuerda: 0.32, cola: 0.5, horquilla: 0.22, freq: 26 },
  // gallinas de las casas (las vascas: la «gorria», rojiza, y alguna blanca), con su cresta, sus patas y la cola alta;
  // alto: del suelo al centro del cuerpo, con las patas
  gallina: { L: 0.38, lomo: '#8e4a22', pecho: '#a85c2c', cabeza: '#9a5226', cuello: '#b4692e', pico: '#e2b04a', ala: '#7a3e1c', envergadura: 0.62, cuerda: 0.5, cola: 0.34, colaY: 0.32,
    cabezaY: 0.5, cabezaZ: 0.4, cabezaR: 0.15, cresta: '#d8322a', patas: { l: 0.36, c: '#e0a43a' }, alto: 0.64, freq: 20, colaV: true },
  gallinaB: { L: 0.38, lomo: '#efe9dc', pecho: '#f6f1e6', cabeza: '#f1ebdf', cuello: '#f4efe4', pico: '#e2b04a', ala: '#e4ddcd', envergadura: 0.62, cuerda: 0.5, cola: 0.34, colaY: 0.32,
    cabezaY: 0.5, cabezaZ: 0.4, cabezaR: 0.15, cresta: '#d8322a', patas: { l: 0.36, c: '#e0a43a' }, alto: 0.64, freq: 20, colaV: true },
};

class Especie {
  constructor(scene, id, n) {
    this.id = id;   // (su nombre: el de la fauna, para apuntarla al verla, onVisto)
    const E = ESPECIES[id], g = cuerpoPajaro(E.L, E);
    for (const k of ['aExt', 'aAle', 'aFase']) g.setAttribute(k, new THREE.InstancedBufferAttribute(new Float32Array(n), 1));
    const { m, T } = materialPajaro(0.16 * E.L, 0.12 * E.L, E.freq);
    this.mesh = new THREE.InstancedMesh(g, m, n); this.mesh.frustumCulled = false; this.mesh.castShadow = false; this.mesh.name = 'pajarillos ' + id;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.T = T; this.n = n; this.g = g; this.alto = (E.alto ?? 0.3) * E.L;   // (alto: del suelo al centro del cuerpo)
    for (let i = 0; i < n; i++) g.attributes.aFase.array[i] = i * 2.39;
    scene.add(this.mesh);
  }
  pon(i, x, y, z, yaw, pitch, roll, ext, ale, s = 1) {
    _q.setFromEuler(_e.set(pitch, yaw, roll, 'YXZ')); _m.compose(_p.set(x, y, z), _q, _s.set(s, s, s)); this.mesh.setMatrixAt(i, _m);
    this.g.attributes.aExt.array[i] = ext; this.g.attributes.aAle.array[i] = ale;
  }
  fin(t) { this.mesh.instanceMatrix.needsUpdate = true; this.g.attributes.aExt.needsUpdate = this.g.attributes.aAle.needsUpdate = true; this.T.value = t; }
  dispose(scene) { scene.remove(this.mesh); this.g.dispose(); this.mesh.material.dispose(); }
}
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

export class Pajarillos {
  constructor(scene, { quality = 'high', sound = null } = {}) {
    this.scene = scene; this.sound = sound; const low = quality === 'low', rnd = this.rnd = mulberry32(7331);
    // (dónde comen: la plaza, junto a la fuente, los bancos y algunas puertas cerca de la plaza; y dónde se posan: las farolas,
    // las barandillas de los balcones y el borde de la fuente)
    const P = PLACES.plaza || { x: 0, z: 0 }, cerca = (q, r) => Math.hypot(q.x - P.x, q.z - P.z) < r;
    const suelos = [{ x: P.x + 3, z: P.z - 2 }];
    for (const b of (TOWN.benches || []).filter(b => cerca(b, 90)).slice(0, 4)) suelos.push({ x: b.x, z: b.z });
    for (const h of (TOWN.houses || []).filter(h => h.door && cerca(h.door, 70)).sort(() => rnd() - 0.5).slice(0, 3)) suelos.push({ x: h.door.x, z: h.door.z });
    this.posaderos = [];
    for (const l of VILLAGE.lamps || []) this.posaderos.push({ x: l.x, y: l.y + 0.56, z: l.z });
    for (const b of TOWN.balcones || []) this.posaderos.push({ x: b.x + Math.sin(b.ry) * 0.45, y: b.y + 1.02, z: b.z + Math.cos(b.ry) * 0.45 });
    const F = VILLAGE.fountain; if (F) for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; this.posaderos.push({ x: F.x + Math.cos(a) * 2.55, y: F.y + 0.9, z: F.z + Math.sin(a) * 2.55 }); }
    // las bandadas del suelo: gorriones en cada sitio y palomas en la plaza
    const nG = low ? 4 : 6, sitios = suelos.slice(0, low ? 3 : 6);
    this.gor = new Especie(scene, 'gorrion', sitios.length * nG);
    this.pal = new Especie(scene, 'paloma', low ? 3 : 6);
    this.ven = new Especie(scene, 'vencejo', low ? 5 : 9);
    this.bandadas = [];
    const banda = (esp, sitio, n, r) => {
      const B = { esp, sitio, r, aves: [], quieta: 0 };
      for (let i = 0; i < n; i++) { const p = this.libre(sitio, r); B.aves.push({ x: p.x, z: p.z, y: groundHeight(p.x, p.z), yaw: rnd() * 6.28, est: 'suelo', t: rnd() * 2, salto: 0, pico: 0 }); }
      this.bandadas.push(B);
    };
    sitios.forEach(s => banda(this.gor, s, nG, 2.2));
    banda(this.pal, { x: P.x - 3, z: P.z + 3 }, this.pal.n, 3.5);
    // las gallinas: unas pocas sueltas delante de las casas de las afueras (lejos de la plaza), picoteando por su cuenta
    const corrales = (TOWN.houses || []).filter(h => h.door && !cerca(h.door, 45)).sort(() => rnd() - 0.5).slice(0, low ? 2 : 3).map(h => ({ x: h.door.x, z: h.door.z }));
    this.gal = new Especie(scene, 'gallina', Math.max(1, corrales.length * 2)); this.galB = new Especie(scene, 'gallinaB', Math.max(1, corrales.length));
    this.gallinas = [];
    corrales.forEach((c, k) => { for (const [E, i] of [[this.gal, k * 2], [this.gal, k * 2 + 1], [this.galB, k]]) { const p = this.libre(c, 3); this.gallinas.push({ E, i, c, x: p.x, z: p.z, tx: p.x, tz: p.z, yaw: rnd() * 6.28, t: rnd() * 2, pica: 0, huye: 0 }); } });
    for (const E of [this.gal, this.galB]) for (let i = 0; i < E.n; i++) E.pon(i, 0, -50, 0, 0, 0, 0, 0, 0);   // (las que sobran, fuera de la vista)
    // los vencejos: vueltas grandes sobre el centro del pueblo, cada uno a su altura y su velocidad
    this.vencejos = Array.from({ length: this.ven.n }, (_, i) => ({ c: { x: P.x + (rnd() - 0.5) * 30, z: P.z + (rnd() - 0.5) * 30 }, r: 9 + rnd() * 14, w: (0.7 + rnd() * 0.5) * (rnd() < 0.5 ? -1 : 1), a: rnd() * 6.28, h: 16 + rnd() * 12, f: rnd() * 6 }));
    this.yP = groundHeight(P.x, P.z);
    // las bandadas que se cruzan andando: la mitad de gorriones y la mitad de jilgueros
    const nV = low ? 6 : 8, porV = low ? 8 : 11;
    this.vGor = new Especie(scene, 'gorrion', Math.ceil(nV / 2) * porV); this.vJil = new Especie(scene, 'jilguero', Math.floor(nV / 2) * porV);
    this.viajeras = Array.from({ length: nV }, (_, i) => ({ E: i % 2 ? this.vJil : this.vGor, base: Math.floor(i / 2) * porV, n: porV, est: 'ido', t: i * 0.7, aves: [] }));
    for (const E of [this.vGor, this.vJil]) for (let i = 0; i < E.n; i++) E.pon(i, 0, -50, 0, 0, 0, 0, 0, 0);
    this.rumbo = { x: 0, z: 1 }; this.ultimo = null;
  }
  // (un sitio para una bandada viajera: en la calle o junto a ella, por delante del jugador, en seco y lejos de las otras)
  sitioDelante(px, pz) {
    const h = Math.atan2(this.rumbo.x, this.rumbo.z);
    for (let k = 0; k < 14; k++) {
      const a = h + (this.rnd() - 0.5) * 1.8, d = 18 + this.rnd() * 16, x = px + Math.sin(a) * d, z = pz + Math.cos(a) * d;
      const q = pathQuery(x, z); if (!(q.d < (q.w || 2) + 3.5)) continue;
      if (!isFree(x, z, 1.4) || riverInfo(x, z).edge < 2) continue;
      if (Math.abs(groundHeight(x + 1.5, z) - groundHeight(x - 1.5, z)) > 0.9) continue;
      if (this.viajeras.some(F => F.est !== 'ido' && Math.hypot(F.x - x, F.z - z) < 12)) continue;
      return { x, z };
    }
    return null;
  }
  posaViajera(F, px, pz) {
    const s = this.sitioDelante(px, pz); if (!s) return false;
    F.x = s.x; F.z = s.z; F.est = 'suelo';
    F.aves = Array.from({ length: F.n }, () => { const p = this.libre(s, 2.6); return { x: p.x, z: p.z, y: groundHeight(p.x, p.z), yaw: this.rnd() * 6.28, t: this.rnd(), salto: 0, pico: 0 }; });
    return true;
  }
  // (sale volando toda: cada pájaro un poco después del anterior, alejándose del jugador con su rumbo y su altura)
  despega(F, px, pz) {
    F.est = 'vuela'; F.t = 0; this.onVisto?.(F.E?.id);
    const ax = F.x - px, az = F.z - pz, l = Math.hypot(ax, az) || 1, base = Math.atan2(ax / l, az / l);
    for (const a of F.aves) {
      const r = base + (this.rnd() - 0.5) * 1.4;
      a.de = { x: a.x, y: a.y, z: a.z }; a.dir = { x: Math.sin(r), z: Math.cos(r) }; a.esp = this.rnd() * 0.35;
      a.v = 7 + this.rnd() * 3; a.sube = 9 + this.rnd() * 7; a.ond = this.rnd() * 6.28;
    }
    this.sound?.aleteo?.({ x: F.x, y: groundHeight(F.x, F.z), z: F.z }, F.n);
    // (y los gorriones, piando al salir: la grabación de una bandada; los jilgueros, solo el aleteo)
    if (F.E?.id === 'gorrion') this.sound?.gorriones?.({ x: F.x, y: groundHeight(F.x, F.z), z: F.z });
  }
  updateViajeras(dt, t, px, pz, corre) {
    for (const F of this.viajeras) {
      const E = F.E;
      if (F.est === 'ido') { F.t -= dt; if (F.t <= 0 && !this.posaViajera(F, px, pz)) F.t = 0.6; continue; }
      const dP = Math.hypot(F.x - px, F.z - pz);
      if (F.est === 'suelo') {
        // (queda atrás: se va a otro sitio de delante sin que se vea)
        if (dP > 55) { F.est = 'ido'; F.t = 0.5; for (let i = 0; i < F.n; i++) E.pon(F.base + i, 0, -50, 0, 0, 0, 0, 0, 0); continue; }
        if (F.aves.some(a => Math.hypot(a.x - px, a.z - pz) < (corre ? 9 : 6.5))) { this.despega(F, px, pz); }
        else F.aves.forEach((a, i) => {
          a.t -= dt;
          if (a.t <= 0) {
            const q = this.rnd();
            if (q < 0.45) { const d = 0.12 + this.rnd() * 0.22, nx = a.x + Math.sin(a.yaw) * d, nz = a.z + Math.cos(a.yaw) * d; if (Math.hypot(nx - F.x, nz - F.z) < 3 && isFree(nx, nz, 0.2)) { a.x = nx; a.z = nz; a.salto = 1; } else a.yaw += 2 + this.rnd(); }
            else if (q < 0.8) a.pico = 1; else a.yaw += (this.rnd() - 0.5) * 2.4;
            a.t = 0.25 + this.rnd() * 1.1;
          }
          a.salto = Math.max(0, a.salto - dt * 6); a.pico = Math.max(0, a.pico - dt * 4); a.y = groundHeight(a.x, a.z);
          E.pon(F.base + i, a.x, a.y + Math.sin(a.salto * Math.PI) * 0.06 + E.alto, a.z, a.yaw, Math.sin(a.pico * Math.PI) * 0.6 - 0.1, 0, 0, 0);
        });
      }
      if (F.est === 'vuela') {
        F.t += dt;
        let fuera = true;
        F.aves.forEach((a, i) => {
          const k = Math.max(0, F.t - a.esp);
          // (arranque fuerte hacia arriba y luego en línea, ondulando un poco, como los pájaros pequeños)
          const sube = a.sube * (1 - Math.exp(-k * 1.4)), d = a.v * k + 1.2 * Math.min(1, k * 2);
          const x = a.de.x + a.dir.x * d + Math.cos(a.ond + k * 3) * 0.4 * Math.min(1, k), z = a.de.z + a.dir.z * d + Math.sin(a.ond + k * 3) * 0.4 * Math.min(1, k);
          const y = a.de.y + E.alto + sube + Math.sin(k * 9 + a.ond) * 0.12 * Math.min(1, k);
          if (k < 4.2) fuera = false;
          const pitch = -Math.atan2(a.sube * 1.4 * Math.exp(-k * 1.4), a.v) * 0.8;
          E.pon(F.base + i, x, k > 0 ? y : a.de.y + E.alto, z, Math.atan2(a.dir.x, a.dir.z), k > 0 ? pitch : -0.1, Math.sin(k * 2 + a.ond) * 0.25, k > 0 ? 1 : 0, k > 0 ? (k < 1.6 ? 1 : 0.6 + 0.4 * Math.max(0, Math.sin(k * 3 + a.ond))) : 0);
        });
        if (fuera) { F.est = 'ido'; F.t = 0.8 + this.rnd() * 1.5; for (let i = 0; i < F.n; i++) E.pon(F.base + i, 0, -50, 0, 0, 0, 0, 0, 0); }
      }
    }
  }
  // (un sitio libre cerca de otro: fuera de las casas)
  libre(s, r) {
    for (let k = 0; k < 12; k++) { const a = this.rnd() * 6.28, d = Math.sqrt(this.rnd()) * r, x = s.x + Math.cos(a) * d, z = s.z + Math.sin(a) * d; if (isFree(x, z, 0.25)) return { x, z }; }
    return { x: s.x, z: s.z };
  }
  // (adónde se va volando: el posadero libre más cercano a menos de 28 m y, si no hay, un punto en lo alto)
  destino(a) {
    let best = null, bd = 28;
    for (const p of this.posaderos) { if (p.ocupado) continue; const d = Math.hypot(p.x - a.x, p.z - a.z); if (d > 3 && d < bd) { bd = d; best = p; } }
    if (best) { best.ocupado = true; return best; }
    const ang = this.rnd() * 6.28; return { x: a.x + Math.cos(ang) * 14, y: a.y + 7, z: a.z + Math.sin(ang) * 14 };
  }
  vuela(a, to, vuelta) {
    a.est = 'vuela'; a.de = { x: a.x, y: a.y, z: a.z }; a.a = to; a.k = 0; a.vuelta = !!vuelta;
    const d = Math.hypot(to.x - a.x, to.y - a.y, to.z - a.z); a.dur = Math.max(0.8, d / (5 + this.rnd() * 2));
  }
  update(dt, t, player, night = 0, oculto = false) {
    const ver = night < 0.5 && !oculto;
    for (const E of this.todas()) E.mesh.visible = ver;
    if (!ver) return;
    const px = player.pos.x, pz = player.pos.z, R = this.rnd;
    // (hacia dónde va el jugador: el rumbo de los últimos metros, para posar las bandadas viajeras por delante)
    if (!this.ultimo) this.ultimo = { x: px, z: pz };
    const mx = px - this.ultimo.x, mz = pz - this.ultimo.z, ml = Math.hypot(mx, mz);
    if (ml > 2) { this.rumbo = { x: mx / ml, z: mz / ml }; this.ultimo = { x: px, z: pz }; }
    else if (ml < 0.01 && player.heading != null) this.rumbo = { x: Math.sin(player.heading), z: Math.cos(player.heading) };
    this.updateViajeras(dt, t, px, pz, (player.speed || 0) > 4.5);
    for (const B of this.bandadas) {
      const E = B.esp, base = this.bandadas.filter(b => b.esp === E).indexOf(B) * B.aves.length;
      // (si pasas cerca de alguna, sale volando toda la bandada; vuelve cuando te has ido)
      const cerca = B.aves.some(a => a.est === 'suelo' && Math.hypot(a.x - px, a.z - pz) < (E === this.pal ? 3 : 4));
      if (cerca) { this.onVisto?.(E?.id); if (E?.id === 'gorrion') { const a0 = B.aves[0]; this.sound?.gorriones?.({ x: a0.x, y: a0.y, z: a0.z }); } for (const a of B.aves) if (a.est === 'suelo') { a.posa = this.destino(a); this.vuela(a, a.posa); } }
      B.aves.forEach((a, i) => {
        a.t -= dt;
        if (a.est === 'suelo') {
          if (a.t <= 0) {
            const q = R();
            if (q < 0.45) { const d = 0.12 + R() * 0.22, nx = a.x + Math.sin(a.yaw) * d, nz = a.z + Math.cos(a.yaw) * d; if (Math.hypot(nx - B.sitio.x, nz - B.sitio.z) < B.r && isFree(nx, nz, 0.2)) { a.x = nx; a.z = nz; a.salto = 1; } else a.yaw += 2 + R(); }
            else if (q < 0.8) a.pico = 1; else a.yaw += (R() - 0.5) * 2.4;
            a.t = E === this.pal ? 0.5 + R() * 0.9 : 0.25 + R() * 1.2;
          }
          a.salto = Math.max(0, a.salto - dt * 6); a.pico = Math.max(0, a.pico - dt * 4);
          a.y = groundHeight(a.x, a.z);
          const hop = Math.sin(a.salto * Math.PI) * (E === this.pal ? 0.02 : 0.06), cab = E === this.pal ? Math.sin(t * 6 + i) * 0.08 : 0;
          E.pon(base + i, a.x, a.y + hop + E.alto, a.z, a.yaw, Math.sin(a.pico * Math.PI) * 0.6 + cab - 0.1, 0, 0, 0);
        } else if (a.est === 'vuela') {
          a.k = Math.min(1, a.k + dt / a.dur);
          const k = a.k, de = a.de, to = a.a, arc = Math.sin(k * Math.PI) * (a.vuelta ? 2 : 3);
          const nx = de.x + (to.x - de.x) * k, nz = de.z + (to.z - de.z) * k, ny = de.y + (to.y - de.y) * (1 - (1 - k) * (1 - k)) + arc;
          const yaw = Math.atan2(to.x - de.x, to.z - de.z), pitch = -Math.atan2((to.y - de.y) * 0.4 + Math.cos(k * Math.PI) * 2, Math.hypot(to.x - de.x, to.z - de.z) + 0.1) * 0.6;
          a.x = nx; a.y = ny; a.z = nz; a.yaw = yaw;
          E.pon(base + i, nx, ny, nz, yaw, pitch, 0, 1, k > 0.92 ? 0.4 : 1);
          if (k >= 1) { if (a.vuelta) { a.est = 'suelo'; a.t = R(); a.y = groundHeight(a.x, a.z); } else { a.est = 'posado'; a.t = 8 + R() * 14; } }
        } else {   // posado: mira a un lado y a otro; al rato, si ya no estás, vuelve a comer
          if (a.t <= 0) {
            if (Math.hypot(B.sitio.x - px, B.sitio.z - pz) > 9) { if (a.posa) a.posa.ocupado = false; const p = this.libre(B.sitio, B.r); this.vuela(a, { x: p.x, y: groundHeight(p.x, p.z), z: p.z }, true); }
            else a.t = 3 + R() * 5;
          }
          E.pon(base + i, a.x, a.y, a.z, a.yaw + Math.sin(t * 0.9 + i * 1.7) * 0.6, 0, 0, 0, 0);
        }
      });
    }
    // los vencejos: vueltas que se ensanchan y se estrechan, inclinados hacia dentro, aleteando a ratos
    this.vencejos.forEach((v, i) => {
      v.a += v.w * dt;
      const r = v.r * (1 + 0.25 * Math.sin(t * 0.3 + v.f)), x = v.c.x + Math.cos(v.a) * r, z = v.c.z + Math.sin(v.a) * r, y = this.yP + v.h + Math.sin(t * 0.7 + v.f) * 2.5;
      const yaw = Math.atan2(-Math.sin(v.a) * v.w, Math.cos(v.a) * v.w), ale = Math.max(0, Math.sin(t * 1.3 + v.f * 2)) ** 2;
      this.ven.pon(i, x, y, z, yaw, 0, -0.5 * Math.sign(v.w), 1, ale);
    });
    // las gallinas: andan despacio de un sitio a otro cerca de su casa, cabeceando, y se paran a picotear; si te acercas,
    // se apartan corriendo con un aleteo (no salen volando)
    for (const a of this.gallinas) {
      const dP = Math.hypot(a.x - px, a.z - pz);
      // (cacarea al apartarse y, de vez en cuando, mientras picotea cerca: cada 8 a 20 s una de las que tienes a menos de 14 m)
      if (dP < 14 && (a.cac = (a.cac ?? 4 + this.rnd() * 10) - dt) <= 0) { a.cac = 8 + this.rnd() * 12; this.sound?.cacareo?.({ x: a.x, y: groundHeight(a.x, a.z), z: a.z }); }
      if (dP < 2.4 && a.huye <= 0) { this.onVisto?.('gallina'); this.sound?.cacareo?.({ x: a.x, y: groundHeight(a.x, a.z), z: a.z }); a.cac = 6 + this.rnd() * 6; const k = 1.9 / Math.max(0.3, dP); const nx = a.x + (a.x - px) * k, nz = a.z + (a.z - pz) * k; if (isFree(nx, nz, 0.25)) { a.tx = nx; a.tz = nz; } a.huye = 1.2; a.pica = 0; }
      a.t -= dt; a.huye = Math.max(0, a.huye - dt);
      const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz), v = a.huye > 0 ? 1.7 : 0.38;
      if (d > 0.05) {
        const st = Math.min(d, v * dt), nx = a.x + dx / d * st, nz = a.z + dz / d * st;
        if (isFree(nx, nz, 0.2)) { a.x = nx; a.z = nz; } else { a.tx = a.x; a.tz = a.z; }
        a.yaw += Math.atan2(Math.sin(Math.atan2(dx, dz) - a.yaw), Math.cos(Math.atan2(dx, dz) - a.yaw)) * Math.min(1, dt * 8);
      } else if (a.t <= 0) {
        if (R() < 0.55) { a.pica = 1.2 + R() * 1.8; a.t = a.pica; }
        else { const p = this.libre(a.c, 3.2); a.tx = p.x; a.tz = p.z; a.t = 1 + R() * 2; }
      }
      a.pica = Math.max(0, a.pica - dt);
      const anda = d > 0.05, cab = anda ? Math.sin(t * (a.huye > 0 ? 18 : 9) + a.i) * 0.12 : 0, pic = a.pica > 0 ? Math.max(0, Math.sin(t * 7 + a.i * 2)) * 0.55 : 0;
      a.E.pon(a.i, a.x, groundHeight(a.x, a.z) + a.E.alto + (anda ? Math.abs(Math.sin(t * 9 + a.i)) * 0.015 : 0), a.z, a.yaw, cab + pic, 0, a.huye > 0 ? 0.35 : 0, a.huye > 0 ? 1 : 0);
    }
    for (const E of this.todas()) E.fin(t);
  }
  todas() { return [this.gor, this.pal, this.ven, this.gal, this.galB, this.vGor, this.vJil].filter(Boolean); }
  dispose() { for (const E of this.todas()) E.dispose(this.scene); }
}
