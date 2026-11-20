// Conducir un tractor con remolque o una cosechadora en las misiones de cosecha del pueblo (townTractor.js). Los modelos
// son los de los campos (world/agro.js), de diseño propio y sin marcas. La palanca o WASD: adelante acelera, atrás frena
// y da marcha atrás, a los lados gira (solo si se mueve, como un vehículo de verdad). La cámara va detrás, más lejos que
// andando. El pelotari va sentado al volante (personajes de Meshy: piernas y brazos doblados encima de la animación; los
// demás, escondidos dentro de la cabina). Suena el motor, que sube con la velocidad, y levanta polvo al correr.
import * as THREE from 'three';
import { tractorModel, combineModel } from '../world/agro.js';
import { groundHeight, waterLevelAt } from '../world/heightfield.js';
import { resolve, addMover, removeMover } from '../world/colliders.js';
import { BOUNDARY } from '../world/layout.js';
import { clamp, damp } from '../util/math.js';

// vmax y atras en m/s; giro, lo que gira a la velocidad de giro plena (rad/s); r, el radio con el que choca; dist, la
// distancia de la cámara; asiento, dónde va el conductor (en el modelo, que mira a +z); alto, a qué altura mira la cámara
// (bici, 20 de noviembre de 2026: para moverse por el pueblo sin motor, con su cesta de mimbre; ancho, de dónde se mira
// la cuesta a los lados para inclinarlo: la bici no se ladea con el suelo, se inclina en las curvas; sin motor ni polvo)
export const VEHICULOS = {
  bici: { vmax: 6.2, atras: 0.9, giro: 1.9, r: 0.55, dist: 6.6, asiento: [0, 0.86, -0.24], alto: 0.55, largo: 0.5, ancho: 0, motor: false, polvo: false, nombre: 'la bici', subir: 'Subir a la bici', bajar: 'Bajar de la bici' },
  tractor: { vmax: 7.5, atras: 3, giro: 1.1, r: 1.5, dist: 11, asiento: [0, 1.4, -0.72], alto: 0.6, largo: 2.2, nombre: 'el tractor', subir: 'Subir al tractor', bajar: 'Bajar del tractor' },
  cosechadora: { vmax: 5, atras: 2.2, giro: 0.75, r: 2.4, dist: 15, asiento: [0, 3.32, 1.55], alto: 1.8, largo: 3.4, nombre: 'la cosechadora', subir: 'Subir a la cosechadora', bajar: 'Bajar de la cosechadora' },
};
const X = new THREE.Vector3(1, 0, 0), _q = new THREE.Quaternion(), _qc = new THREE.Quaternion(), _ax = new THREE.Vector3(), _v = new THREE.Vector3();

export class Vehiculo {
  constructor(game, tipo, x, z, heading = 0, o = {}) {
    this.g = game; this.tipo = tipo; this.T = VEHICULOS[tipo];
    // (apero: el remolque del tractor de la cosecha; el tractor libre del pueblo va sin él, o: { apero: null })
    this.obj = tipo === 'bici' ? biciModel(o.color) : tipo === 'tractor' ? tractorModel(o.color || '#c8302a', 'apero' in o ? o.apero : 'trailer') : combineModel();
    this.fase = 0; this.lean = 0; this.giroV = 0;
    this.obj.traverse(o => { if (o.isMesh) o.castShadow = true; });
    game.scene.add(this.obj);
    this.x = x; this.z = z; this.heading = heading; this.speed = 0; this.polvo = 0;
    this.collider = addMover(x, z, this.T.r, { vehiculo: this });
    this.place(0);
  }
  /** Coloca el modelo en (x, z), sobre el suelo e inclinado según la cuesta, y gira las ruedas lo recorrido */
  place(dist) {
    const T = this.T, s = Math.sin(this.heading), c = Math.cos(this.heading), L = T.largo, W = T.ancho ?? 1.2;
    const hf = groundHeight(this.x + s * L, this.z + c * L), hb = groundHeight(this.x - s * L, this.z - c * L);
    const hr = W ? groundHeight(this.x - c * W, this.z + s * W) : 0, hl = W ? groundHeight(this.x + c * W, this.z - s * W) : 0;
    this.y = W ? (hf + hb + hr + hl) / 4 : (hf + hb) / 2;
    this.obj.position.set(this.x, this.y, this.z);
    this.obj.rotation.set(Math.atan2(hb - hf, 2 * L) * 0.9, this.heading, W ? Math.atan2(hl - hr, 2 * W) * 0.9 : this.lean, 'YXZ');
    for (const [w, r] of this.obj.userData.wheels || []) w.rotation.x += dist / r;
    // (la bici: los pedales giran con lo recorrido, y el manillar con la rueda de delante, hacia donde se gira)
    const U = this.obj.userData; if (U.biela) { this.fase += dist / 0.31 * 0.5; U.biela.rotation.x = this.fase; for (const pd of U.pedales) pd.rotation.x = -this.fase; }
    if (U.frente) U.frente.rotation.y = this.giroV;
    this.collider.x = this.x; this.collider.z = this.z;
  }
  /** Un punto del modelo (en sus coordenadas, mirando a +z) en el mundo */
  local(x, y, z, out = new THREE.Vector3()) { this.obj.updateMatrixWorld(true); return out.set(x, y, z).applyMatrix4(this.obj.matrixWorld); }
  sube(P) {
    if (this.P) return;
    const g = this.g, F = g.follow;
    this.P = P; P.vehiculo = this; P.speed = 0; this.distAntes = F.targetDist; F.targetDist = this.T.dist; F.yaw = this.heading + Math.PI;   // (la cámara, detrás)
    document.body.classList.add('conduce');   // (sin los botones de correr y saltar)
    if (P.collider) P.collider.ghost = true;
    if (P.blob) P.blob.visible = false;
    this.sienta(P);
    this.motor(true);
    g.sound?.ui?.('click');
  }
  baja() {
    const P = this.P; if (!P) return null;
    const g = this.g, F = g.follow;
    this.motor(false); this.levanta(P);
    P.vehiculo = null; this.P = null; this.speed = 0; F.targetDist = this.distAntes ?? F.targetDist; document.body.classList.remove('conduce');
    // (se baja por la izquierda, junto a la cabina; si ahí no cabe, por la derecha)
    const s = Math.sin(this.heading), c = Math.cos(this.heading);
    for (const k of [1, -1]) {
      const x = this.x + c * (this.T.r + 0.9) * k, z = this.z - s * (this.T.r + 0.9) * k, r = resolve(x, z, P.radius, P.collider);
      if (Math.hypot(r.x - x, r.z - z) < 0.3 || k === -1) { P.place(r.x, r.z, this.heading); break; }
    }
    if (P.collider) P.collider.ghost = false;
    P.obj.visible = true;
    return P;
  }
  // el conductor sentado: con los huesos de Meshy (Mixamo), muslos adelante, rodillas dobladas y brazos al volante,
  // encima de la animación de estar quieto. Sin esos huesos, escondido en la cabina
  sienta(P) {
    const c = P.rig?.char, B = {}; c?.root.traverse(o => { if (o.isBone) B[o.name] = o; });
    const ul = B.mixamorigLeftUpLeg, ur = B.mixamorigRightUpLeg, ll = B.mixamorigLeftLeg, lr = B.mixamorigRightLeg, al = B.mixamorigLeftArm, ar = B.mixamorigRightArm, fl = B.mixamorigLeftForeArm, fr = B.mixamorigRightForeArm, hips = B.mixamorigHips;
    if (!c || !ul || !ur || !ll || !lr || !hips) { P.obj.visible = false; this.sentado = null; return; }
    // (el eje del personaje pasado al espacio de cada hueso, con la pose de este fotograma)
    const turn = (b, a) => { if (!b) return; _qc.identity(); for (let o = b; o && o !== c.root; o = o.parent) _qc.premultiply(o.quaternion); _ax.copy(X).applyQuaternion(_qc.invert()); b.quaternion.multiply(_q.setFromAxisAngle(_ax, a)); };
    this.postAntes = c.post;
    P.obj.position.set(0, 0, 0); P.obj.rotation.set(0, 0, 0); P.obj.updateMatrixWorld(true);
    this.alturaCadera = hips.getWorldPosition(_v).y / Math.max(1e-3, P.obj.scale.y || 1);
    if (this.tipo === 'bici') this.pedalea(P, c, B, turn);
    else c.post = (cc, dt) => { turn(ul, -1.45); turn(ur, -1.45); turn(ll, 1.5); turn(lr, 1.5); turn(al, -0.9); turn(ar, -0.9); turn(fl, -0.5); turn(fr, -0.5); };
    this.sentado = c;
  }
  // en la bici: el cuerpo un poco adelante, las manos al manillar y cada pie en su pedal. Las piernas, con las dos medidas
  // del muslo y de la espinilla del personaje (en reposo) y la posición del pedal en cada momento: el ángulo de la cadera y
  // el de la rodilla salen del triángulo cadera-rodilla-tobillo (la rodilla, siempre hacia delante)
  pedalea(P, c, B, turn) {
    const S = P.obj.scale.y || 1, w = (b) => b.getWorldPosition(new THREE.Vector3()).divideScalar(S);
    const hip = w(B.mixamorigHips), ul = w(B.mixamorigLeftUpLeg), kl = w(B.mixamorigLeftLeg), fl = B.mixamorigLeftFoot ? w(B.mixamorigLeftFoot) : null;
    const L1 = ul.distanceTo(kl), L2 = fl ? kl.distanceTo(fl) : L1 * 1.05, bajaCad = hip.y - ul.y;
    const T = this.T, asY = T.asiento[1], asZ = T.asiento[2], BB = [0.3, -0.05], R = 0.16;
    const pierna = (sup, inf, fase) => {
      // (el tobillo, un poco por encima y por detrás del pedal: el pedal va bajo la planta)
      const py = BB[0] - Math.cos(fase) * R + 0.07, pz = BB[1] + Math.sin(fase) * R - 0.05;
      const hy = asY + 0.12 - bajaCad, hz = asZ;
      const dy = (hy - py) / S, dz = (pz - hz) / S, D = Math.min(L1 + L2 - 1e-3, Math.max(Math.abs(L1 - L2) + 1e-3, Math.hypot(dy, dz)));
      const phi = Math.atan2(dz, dy), a = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D))));
      const k = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2))));
      turn(sup, -(phi + a) - 0.18); turn(inf, Math.PI - k);   // (-0.18: el tronco va inclinado hacia delante; la pierna, un poco menos)
    };
    c.post = () => {
      turn(B.mixamorigSpine, 0.18); turn(B.mixamorigSpine1, 0.06);
      pierna(B.mixamorigLeftUpLeg, B.mixamorigLeftLeg, this.fase); pierna(B.mixamorigRightUpLeg, B.mixamorigRightLeg, this.fase + Math.PI);
      turn(B.mixamorigLeftArm, -1.0); turn(B.mixamorigRightArm, -1.0); turn(B.mixamorigLeftForeArm, -0.45); turn(B.mixamorigRightForeArm, -0.45);
    };
  }
  levanta(P) { if (this.sentado) { this.sentado.post = this.postAntes || null; this.sentado = null; } }
  // el ruido del motor: dos osciladores graves, filtrados, que suben de tono y de fuerza con la velocidad
  motor(on) {
    const S = this.g.sound, ctx = S?.ctx;
    if (this.T.motor === false) return;   // (la bici, sin motor)
    if (!on) { if (this.mot) { const t = ctx.currentTime; this.mot.g.gain.setTargetAtTime(0, t, 0.15); const m = this.mot; setTimeout(() => { try { m.o1.stop(); m.o2.stop(); } catch (e) { } }, 600); this.mot = null; } return; }
    if (!ctx || this.mot) return;
    try {
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o1.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 320; g.gain.value = 0;
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(S.sfx || ctx.destination); o1.start(); o2.start();
      this.mot = { o1, o2, f, g };
    } catch (e) { this.mot = null; }
  }
  update(dt, input, P) {
    const T = this.T, g = this.g;
    input.consume?.(' ');   // (conduciendo no se salta)
    const f = clamp(input.move?.y || 0, -1, 1), s = clamp(input.move?.x || 0, -1, 1);
    const quiere = f >= 0 ? f * T.vmax : f * T.atras;
    this.speed = damp(this.speed, quiere, Math.abs(quiere) > Math.abs(this.speed) ? 1.4 : 2.8, dt);
    if (Math.abs(this.speed) < 0.02 && !f) this.speed = 0;
    // (gira según lo que avanza: parado no gira; marcha atrás, al revés)
    // (la bici, además, gira algo parada: se gira con la mano, y así nunca se queda encajada de cara a una pared)
    const kg = clamp(this.speed / 2.5, -1, 1);
    this.heading -= s * T.giro * (T.ancho === 0 ? Math.sign(kg || 1) * Math.max(Math.abs(kg), 0.45) : kg) * dt;
    // (la bici: el manillar gira hacia el lado y, en marcha, se inclina hacia dentro de la curva)
    if (T.ancho === 0) { this.giroV = damp(this.giroV, -s * 0.45, 8, dt); this.lean = damp(this.lean, s * 0.32 * clamp(this.speed / T.vmax, 0, 1), 5, dt); }
    let nx = this.x + Math.sin(this.heading) * this.speed * dt, nz = this.z + Math.cos(this.heading) * this.speed * dt;
    const r = resolve(nx, nz, T.r, this.collider);
    if (Math.hypot(r.x - nx, r.z - nz) > 0.02) this.speed *= 0.6;   // (choca: frena)
    nx = r.x; nz = r.z;
    const r4 = Math.pow(nx ** 4 + nz ** 4, 0.25); if (r4 > BOUNDARY) { const k = BOUNDARY / r4; nx *= k; nz *= k; this.speed *= 0.5; }
    // (al agua honda o a una cuesta muy fuerte no se mete)
    const gNew = groundHeight(nx, nz), gOld = groundHeight(this.x, this.z), m = Math.hypot(nx - this.x, nz - this.z);
    if (waterLevelAt(nx, nz) - gNew > 0.7 || (m > 1e-4 && (gNew - gOld) / m > 0.9)) { nx = this.x; nz = this.z; this.speed = 0; }
    const dist = Math.hypot(nx - this.x, nz - this.z) * Math.sign(this.speed || 1);
    this.x = nx; this.z = nz; this.place(dist);
    // el jugador va con el vehículo: la cámara le sigue (más alto en la cosechadora) y su figura, en el asiento
    P.pos.set(this.x, this.y + T.alto, this.z); P.heading = this.heading; P.speed = Math.abs(this.speed);
    if (P.collider) { P.collider.x = this.x; P.collider.z = this.z; }
    if (this.sentado) {
      const a = T.asiento; this.local(a[0], a[1], a[2], _v);
      P.obj.position.set(_v.x, _v.y - this.alturaCadera * (P.obj.scale.y || 1) + 0.12, _v.z); P.obj.rotation.set(this.obj.rotation.x, this.heading, this.obj.rotation.z, 'YXZ');
      P.rig.update(dt, 0, true, 0);
    }
    // el motor, según la velocidad y el acelerador
    if (this.mot) { const t = g.sound.ctx.currentTime, k = Math.abs(this.speed) / T.vmax; this.mot.o1.frequency.setTargetAtTime(34 + k * 34 + Math.abs(f) * 6, t, 0.1); this.mot.o2.frequency.setTargetAtTime(17 + k * 17, t, 0.1); this.mot.g.gain.setTargetAtTime(0.05 + k * 0.05 + Math.abs(f) * 0.02, t, 0.1); }
    // polvo detrás, al correr
    if (T.polvo !== false && Math.abs(this.speed) > 2.5 && (this.polvo -= dt) <= 0) {
      this.polvo = 0.12; const b = this.local(0, 0.3, this.tipo === 'tractor' ? -0.9 : -2.8, _v);
      g.particles?.emit({ x: b.x, y: b.y, z: b.z }, { n: 3, color: ['#c9b58c', '#b39d73'], speed: 0.8, size: 0.5, life: 0.9, gravity: -0.3, spread: 1.2 });
    }
  }
  dispose() {
    if (this.P) this.baja();
    this.motor(false); removeMover(this.collider);
    this.obj.parent?.remove(this.obj);   // (sus mallas no se tiran: las comparten las máquinas de los campos, agro.js)
  }
}

// ---------- la bici ----------
// De diseño propio: cuadro de paseo (barra baja), ruedas de radios, sillín, manillar con puños y una cesta de mimbre
// delante. Mira a +z; las ruedas, en userData.wheels como las del tractor (place las gira con lo recorrido); la biela con
// los pedales, en userData.biela, y lo que gira con el manillar (horquilla, rueda de delante, manillar y cesta), en
// userData.frente. Las piezas son de todos: se hacen una vez y se comparten
let BICI = null;
function piezasBici() {
  if (BICI) return BICI;
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.2, ...o });
  BICI = {
    cubierta: new THREE.TorusGeometry(0.29, 0.024, 8, 28), llanta: new THREE.TorusGeometry(0.27, 0.01, 6, 28), radio: new THREE.CylinderGeometry(0.0035, 0.0035, 0.54, 4),
    buje: new THREE.CylinderGeometry(0.022, 0.022, 0.1, 10), tubo: new THREE.CylinderGeometry(1, 1, 1, 8), caja: new THREE.BoxGeometry(1, 1, 1),
    goma: M('#1e1c1b', { roughness: 0.9, metalness: 0 }), cromo: M('#c9ccd1', { roughness: 0.3, metalness: 0.8 }), negro: M('#2a2725', { roughness: 0.7 }),
    mimbre: M('#b88a4e', { roughness: 0.95, metalness: 0 }), cadena: M('#4a4642', { roughness: 0.5, metalness: 0.6 }),
    luzRoja: M('#c41a12', { emissive: '#ff2a1a', emissiveIntensity: 0.9 }), luzFaro: M('#fff6d8', { emissive: '#fff1c4', emissiveIntensity: 0.8 }),
    pinon: new THREE.TorusGeometry(0.045, 0.008, 6, 16), plato: new THREE.TorusGeometry(0.09, 0.008, 6, 20), faro: new THREE.CylinderGeometry(0.03, 0.026, 0.05, 12),
    cuadro: new Map(),
  };
  return BICI;
}
export function biciModel(color = '#2f7d6b') {
  const K = piezasBici(), g = new THREE.Group(), R = 0.31;
  const mat = K.cuadro.get(color) || (K.cuadro.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.35 })), K.cuadro.get(color));
  const tubo = (a, b, r, m = mat, padre = g) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), t = new THREE.Mesh(K.tubo, m), d = B.clone().sub(A);
    t.scale.set(r, d.length(), r); t.position.copy(A).addScaledVector(d, 0.5); t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); padre.add(t); return t; };
  const caja = (p, s, m, padre = g) => { const b = new THREE.Mesh(K.caja, m); b.position.set(...p); b.scale.set(...s); padre.add(b); return b; };
  const rueda = (z, padre) => {
    const w = new THREE.Group(); w.position.set(0, R, z); padre.add(w);
    const t = new THREE.Mesh(K.cubierta, K.goma); t.rotation.y = Math.PI / 2; w.add(t);
    const l = new THREE.Mesh(K.llanta, K.cromo); l.rotation.y = Math.PI / 2; w.add(l);
    for (let i = 0; i < 8; i++) { const rd = new THREE.Mesh(K.radio, K.cromo); rd.rotation.x = i * Math.PI / 8; w.add(rd); }
    const b = new THREE.Mesh(K.buje, K.cromo); b.rotation.z = Math.PI / 2; w.add(b);
    return w;
  };
  const wheels = [[rueda(-0.5, g), R]];
  // el cuadro (barra baja, de paseo): tubo del sillín, tubo bajo, vainas y tirantes hasta el eje de atrás. (El tubo de la
  // dirección, más alto que antes: abajo tocaba la rueda; la horquilla deja ahora 4 cm sobre la cubierta)
  const BB = [0, 0.3, -0.05], ST = [0, 0.8, -0.2], HB = [0, 0.66, 0.37], HT = [0, 0.88, 0.32];
  tubo(BB, ST, 0.02); tubo(BB, HB, 0.022); tubo([0, 0.42, -0.1], [0, 0.78, 0.35], 0.017);
  caja(BB, [0.09, 0.05, 0.05], mat);   // (la caja del pedalier, donde se juntan los tubos)
  for (const x of [-0.045, 0.045]) { tubo([x, 0.3, -0.05], [x, R, -0.5], 0.012); tubo([x, 0.74, -0.19], [x, R, -0.5], 0.011); }
  tubo(ST, [0, 0.86, -0.23], 0.013, K.cromo);
  caja([0, 0.875, -0.25], [0.12, 0.045, 0.24], K.negro);   // el sillín
  // los guardabarros, curvos sobre las ruedas (un trozo de aro ancho y plano), y la luz roja de atrás
  const guarda = (desde, arco, padre, z) => { const q = new THREE.TorusGeometry(R + 0.04, 0.011, 4, 22, arco); q.rotateZ(desde);
    const m = new THREE.Mesh(q, mat); m.rotation.y = Math.PI / 2; m.scale.z = 2.3; m.position.set(0, R, z); padre.add(m); return m; };
  guarda(-0.3, 2.2, g, -0.5);
  caja([0, R + 0.35 * Math.sin(0.28), -0.5 - 0.35 * Math.cos(0.28)], [0.05, 0.035, 0.02], K.luzRoja);
  // la cadena, por la derecha: del plato al piñón de la rueda de atrás, por arriba y por abajo
  const pin = new THREE.Mesh(K.pinon, K.cromo); pin.rotation.y = Math.PI / 2; pin.position.set(0.06, R, -0.5); g.add(pin);
  tubo([0.06, 0.39, -0.05], [0.06, R + 0.045, -0.5], 0.005, K.cadena); tubo([0.06, 0.21, -0.05], [0.06, R - 0.045, -0.5], 0.005, K.cadena);
  // lo de delante, que gira con el manillar: tubo de la dirección, horquilla, rueda, potencia, manillar con sus puños y
  // manetas, guardabarros, faro y la cesta con sus varillas. (Antes, el tubo, la horquilla, la potencia y la barra del
  // manillar se colgaban del cuadro y no de este grupo: se dibujaban 36 cm más atrás y la rueda de delante quedaba suelta)
  const F = new THREE.Group(); F.position.set(0, 0, 0.36); g.add(F);
  const f = (p) => [p[0], p[1], p[2] - 0.36];
  tubo(f(HB), f(HT), 0.024, mat, F);
  caja(f([0, 0.66, 0.37]), [0.11, 0.03, 0.05], K.cromo, F);   // (la corona de la horquilla)
  for (const x of [-0.045, 0.045]) tubo(f([x, 0.66, 0.37]), f([x, R, 0.5]), 0.012, K.cromo, F);
  wheels.push([rueda(0.14, F), R]);
  guarda(1.25, 2.0, F, 0.14);
  tubo(f(HT), f([0, 0.95, 0.3]), 0.014, K.cromo, F);
  tubo(f([-0.26, 0.96, 0.27]), f([0.26, 0.96, 0.27]), 0.012, K.cromo, F);
  for (const x of [-0.235, 0.235]) caja(f([x, 0.96, 0.27]), [0.1, 0.032, 0.032], K.negro, F);   // (los puños, a lo largo de la barra)
  for (const x of [-0.19, 0.19]) caja(f([x, 0.955, 0.31]), [0.012, 0.012, 0.08], K.cromo, F).rotation.x = 0.35;   // (las manetas del freno)
  // el faro, bajo la cesta
  const faro = new THREE.Mesh(K.faro, K.cromo); faro.rotation.x = Math.PI / 2; faro.position.set(...f([0, 0.7, 0.45])); F.add(faro);
  const luz = caja(f([0, 0.7, 0.475]), [0.045, 0.045, 0.006], K.luzFaro, F); void luz;
  // la cesta de mimbre, en el manillar, con dos varillas hasta el eje de delante
  const C = caja(f([0, 0.84, 0.52]), [0.3, 0.18, 0.22], K.mimbre, F);
  caja([0, 0.5, 0], [1.06, 0.12, 1.06], K.mimbre, C);
  for (const x of [-0.11, 0.11]) tubo(f([x, 0.75, 0.55]), f([x * 0.45, R, 0.5]), 0.006, K.cromo, F);
  // la biela y los pedales (giran con lo recorrido; los pedales, al revés, para quedarse planos)
  const bi = new THREE.Group(); bi.position.set(...BB); g.add(bi); const pedales = [];
  for (const s of [-1, 1]) {
    const brazo = caja([s * 0.07, -s * 0.08, 0], [0.018, 0.16, 0.025], K.cromo, bi);
    const pd = new THREE.Group(); pd.position.set(s * 0.1, -s * 0.16, 0); bi.add(pd); caja([0, 0, 0], [0.09, 0.02, 0.06], K.negro, pd); pedales.push(pd);
    void brazo;
  }
  const plato = new THREE.Mesh(K.plato, K.cromo); plato.rotation.y = Math.PI / 2; plato.position.x = 0.06; bi.add(plato);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  g.userData.wheels = wheels; g.userData.biela = bi; g.userData.pedales = pedales; g.userData.frente = F;
  return g;
}
