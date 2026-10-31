// Cosechas con vehículo. Antes, toda cosecha era andar por el campo y recoger ocho brillos: muy sencillo y soso. Ahora
// las de huerta (tomates, pimientos del piquillo, patatas, pochas, espárragos, alcachofas, cardos) se hacen con el
// tractor y su remolque: los temporeros han dejado las cajas llenas en los surcos y hay que pasar junto a cada una con
// el tractor para cargarla (salta al remolque y se va apilando). El trigo, con la cosechadora: se pasa por encima de
// las manchas de trigo y el cabezal las siega; el grano va llenando la tolva. Lleno el remolque o la tolva, se lleva a
// quien encargó la cosecha: al llegar cerca, el pelotari se baja y habla con él. La conducción, en conducir.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Vehiculo } from './conducir.js';
import { CROP } from '../data/campo.js';
import { PLACES } from '../world/layout.js';
import { terrainHeight } from '../world/heightfield.js';
import { paintedPart as part } from '../world/builder.js';

// las cosechas de huerta van en cajas, con el color de lo que llevan; el trigo, con la cosechadora
export const CON_TRACTOR = { tomate: '#d8352a', piquillo: '#c8221c', patata: '#a8794a', pocha: '#efe6c8', esparrago: '#9fbf5a', alcachofa: '#6f9a4a', cardo: '#b9c9a8' };
export const CON_COSECHADORA = { trigo: true };
const MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
const ANILLO = new THREE.RingGeometry(1.15, 1.4, 32).rotateX(-Math.PI / 2);
// las plazas de las cajas en el remolque (en el tractor, que mira a +z: el remolque va detrás, en z = −3,9)
const PLAZAS = [];
for (let capa = 0; capa < 2; capa++) for (const z of [-1.15, -0.4, 0.35, 1.1]) for (const x of [-0.45, 0.45]) PLAZAS.push([x, 1.22 + capa * 0.44, -3.9 + z]);

// una caja de madera con su cosecha encima
function caja(color) {
  const P = [part(new THREE.BoxGeometry(0.8, 0.06, 0.55), '#8a5a32', 0, 0.03, 0)];
  for (const s of [-1, 1]) { P.push(part(new THREE.BoxGeometry(0.8, 0.34, 0.05), '#b07a45', 0, 0.2, s * 0.25)); P.push(part(new THREE.BoxGeometry(0.05, 0.34, 0.55), '#a06c3a', s * 0.38, 0.2, 0)); }
  for (let i = 0; i < 8; i++) P.push(part(new THREE.IcosahedronGeometry(0.1, 0), color, -0.27 + (i % 4) * 0.18, 0.38 + (i % 2) * 0.03, i < 4 ? -0.1 : 0.1));
  const m = new THREE.Mesh(mergeGeometries(P), MAT); m.castShadow = true; return m;
}
// una mancha de trigo maduro: espigas doradas, algo torcidas
function trigal(rnd) {
  const P = [];
  for (let i = 0; i < 46; i++) {
    const x = (rnd() - 0.5) * 2.8, z = (rnd() - 0.5) * 2.8, h = 0.8 + rnd() * 0.25, rx = (rnd() - 0.5) * 0.2, rz = (rnd() - 0.5) * 0.2;
    P.push(part(new THREE.BoxGeometry(0.04, h, 0.04), '#cfa93e', x, h / 2, z, rx, 0, rz));
    P.push(part(new THREE.BoxGeometry(0.08, 0.2, 0.08), '#e2bf55', x + rz * -h, h + 0.05, z + rx * h, rx, 0, rz));
  }
  const m = new THREE.Mesh(mergeGeometries(P), MAT); m.castShadow = true; return m;
}

export class PuebloTractor {
  /** ¿Esta cosecha va con vehículo? 'tractor', 'cosechadora' o null */
  conVehiculo(m) { return CON_COSECHADORA[m?.crop] ? 'cosechadora' : CON_TRACTOR[m?.crop] ? 'tractor' : null; }
  startTractor(M) {
    const tipo = this.conVehiculo(M.m), c = PLACES.fields || PLACES.market, nom = CROP[M.m.crop]?.[0] || 'la cosecha', host = M.host.name;
    M.step = 1; M.count = 0; M.cargas = []; M.vuelan = [];
    // (el vehículo, a un lado del campo y mirando hacia él; las cajas o el trigo, en dos hileras de surcos)
    const sv = this.spot({ x: c.x + 12, z: c.z + 10 }, 8, true, 4);
    M.veh = new Vehiculo(this, tipo, sv.x, sv.z, Math.atan2(c.x - sv.x, c.z - sv.z));
    const a0 = this.rnd() * Math.PI, ca = Math.cos(a0), sa = Math.sin(a0), filas = Math.ceil(M.need / 4);
    for (let i = 0; i < M.need; i++) {
      const col = i % 4, row = Math.floor(i / 4), lx = (col - 1.5) * 7 + (row % 2 ? 3.5 : 0), lz = (row - (filas - 1) / 2) * 11;
      const s = this.spot({ x: c.x + lx * ca - lz * sa, z: c.z + lx * sa + lz * ca }, 3, true, 3);
      const obj = tipo === 'tractor' ? caja(CON_TRACTOR[M.m.crop]) : trigal(this.rnd);
      obj.position.set(s.x, terrainHeight(s.x, s.z), s.z); obj.rotation.y = this.rnd() * Math.PI; this.scene.add(obj);
      const ring = new THREE.Mesh(ANILLO, new THREE.MeshBasicMaterial({ color: '#ffe36a', transparent: true, opacity: 0.6, depthWrite: false }));
      ring.position.set(s.x, terrainHeight(s.x, s.z) + 0.06, s.z); this.scene.add(ring);
      M.cargas.push({ x: s.x, z: s.z, obj, ring, hecho: false });
    }
    // (la cosechadora llena su tolva de grano a medida que siega)
    if (tipo === 'cosechadora') { const g = M.grano = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 2.4), new THREE.MeshStandardMaterial({ color: '#d9b44a', roughness: 0.9 })); g.position.set(0, 3.3, -1.3); g.scale.y = 0.05; M.veh.obj.add(g); }   // (en la tolva abierta, sobre su suelo)
    M.steps = () => ['Habla con ' + host, tipo === 'tractor' ? `Sube al tractor y carga las cajas de ${nom} (${M.count}/${M.need})` : `Sube a la cosechadora y siega el trigo (${M.count}/${M.need})`,
      `Lleva ${tipo === 'tractor' ? 'el remolque' : 'el grano'} a ${host}`];
    this.ui.toast(this.stepText(M), M.icon, 3200);
  }
  /** Lo que se puede hacer con el vehículo: subir, si estás cerca; bajar, si vas en él */
  tractorAcciones(list, ok) {
    const P = this.player;
    if (P.vehiculo) { list.push({ kind: 'bajar', x: P.pos.x, z: P.pos.z, r: 99, label: P.vehiculo.T.bajar }); return; }
    for (const M of this.missions) if (M.veh && !M.done && ok(M.veh.x, M.veh.z)) list.push({ kind: 'subir', M, x: M.veh.x, z: M.veh.z, r: M.veh.T.r + 2.6, label: M.veh.T.subir });
  }
  /** Adónde lleva la flecha: al vehículo si aún no vas en él; si vas, a la caja o al trigo más cercano */
  tractorDestino(M) {
    if (!M.veh || M.step !== 1) return null;
    const P = this.player.pos;
    if (this.player.vehiculo !== M.veh) return { x: M.veh.x, z: M.veh.z, h: 3.2 };
    let best = null, bd = 1e9; for (const k of M.cargas) if (!k.hecho) { const d = Math.hypot(k.x - P.x, k.z - P.z); if (d < bd) { bd = d; best = k; } }
    return best ? { x: best.x, z: best.z, h: 1.4 } : null;
  }
  tractorTick(dt) {
    for (const M of this.missions) {
      if (!M.veh || M.done) continue;
      const V = M.veh, yendo = this.player.vehiculo === V, t = this.elapsed;
      for (const k of M.cargas) if (!k.hecho) { k.ring.material.opacity = 0.4 + Math.sin(t * 4 + k.x) * 0.25; if (V.tipo === 'cosechadora') k.obj.rotation.z = Math.sin(t * 1.3 + k.z) * 0.03; }
      if (yendo && M.step === 1) {
        V.obj.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(V.obj.matrixWorld).invert(), q = new THREE.Vector3();
        for (const k of M.cargas) {
          if (k.hecho) continue;
          q.set(k.x, V.y, k.z).applyMatrix4(inv);
          // (el tractor carga lo que tiene junto a él o junto al remolque; la cosechadora siega lo que pasa bajo el cabezal)
          const toca = V.tipo === 'tractor' ? Math.hypot(q.x, q.z - 0.2) < 2.7 || Math.hypot(q.x, q.z + 3.9) < 2.7 : Math.abs(q.x) < 3.1 && Math.abs(q.z - 3.9) < 2.2;
          if (toca) this.tractorCarga(M, k);
        }
      }
      // las cajas que vuelan al remolque: en arco hasta su plaza, que se mueve con el tractor
      for (const f of M.vuelan) {
        f.t += dt / 0.55; const u = Math.min(1, f.t), to = V.local(...PLAZAS[f.plaza % PLAZAS.length]);
        f.k.obj.position.lerpVectors(f.de, to, u); f.k.obj.position.y += Math.sin(u * Math.PI) * 2.2; f.k.obj.rotation.y += dt * 6;
        if (u >= 1) { V.obj.add(f.k.obj); f.k.obj.position.set(...PLAZAS[f.plaza % PLAZAS.length]); f.k.obj.rotation.set(0, 0, 0); f.fin = true; }
      }
      M.vuelan = M.vuelan.filter(f => !f.fin);
      // el trigo segado se queda en rastrojo
      for (const k of M.cargas) if (k.siega != null && k.siega < 1) { k.siega = Math.min(1, k.siega + dt / 0.35); k.obj.scale.y = 1 - k.siega * 0.85; }
      // con el remolque lleno, al llegar cerca de quien lo encargó: se para, te bajas y habláis
      if (yendo && M.step === 2 && Math.hypot(V.x - M.host.pos.x, V.z - M.host.pos.z) < 11) {
        V.speed = 0; V.baja(); this.talk?.(M.host);
      }
    }
  }
  tractorCarga(M, k) {
    const V = M.veh; k.hecho = true; k.ring.parent?.remove(k.ring); k.ring.material.dispose();
    if (V.tipo === 'tractor') {
      M.vuelan.push({ k, t: 0, de: k.obj.position.clone(), plaza: M.count });
      this.particles?.emit({ x: k.x, y: terrainHeight(k.x, k.z) + 0.5, z: k.z }, { n: 16, color: ['#ffe38a', CON_TRACTOR[M.m.crop]], speed: 2, size: 0.25, life: 0.8 });
    } else {
      k.siega = 0;
      this.particles?.emit({ x: k.x, y: terrainHeight(k.x, k.z) + 0.9, z: k.z }, { n: 30, color: ['#e2bf55', '#cfa93e', '#f2e2a0'], speed: 2.6, size: 0.22, life: 1.1, spread: 2 });
    }
    this.sound?.ui?.('coin');
    M.count++;
    if (M.grano) { M.grano.scale.y = Math.max(0.05, M.count / M.need); M.grano.position.y = 3.28 + 0.4 * M.grano.scale.y; }
    this.ui.toast(this.stepText(M), M.icon, 1600);
    if (M.count >= M.need) { M.step = 2; this.sound?.magic?.(); this.ui.toast(V.tipo === 'tractor' ? `¡Remolque lleno! Llévalo a ${M.host.name}` : `¡Tolva llena! Lleva el grano a ${M.host.name}`, 'check', 3600); }
  }
  /** Se acaba la cosecha (o se va del pueblo): fuera el vehículo, las cajas y el trigo */
  quitaTractor(M) {
    if (!M?.veh) return;
    for (const k of M.cargas || []) { k.obj.parent?.remove(k.obj); k.obj.geometry?.dispose(); if (k.ring.parent) { k.ring.parent.remove(k.ring); k.ring.material.dispose(); } }
    if (M.grano) { M.grano.geometry.dispose(); M.grano.material.dispose(); M.grano = null; }
    M.veh.dispose(); M.veh = null; M.cargas = []; M.vuelan = [];
  }
}
