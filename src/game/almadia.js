// La bajada en almadía por el Esca de Burgui (noviembre de 2026): el Día de la Almadía, en el pueblo de verdad. Se sube a
// la almadía río arriba y se baja con la corriente unos 760 m: por el casco, por el portillo de la presa y por debajo del
// ojo grande del puente medieval, hasta la orilla de después del puente. Por el camino se cuenta su historia, en seis
// partes, sin parar la bajada.
// La almadía: tres tramos de nueve troncos de pino de 7 m, atados con ramas de avellano retorcidas y unidos uno detrás
// de otro, de modo que se doblan en las curvas como las de verdad (cada tramo sigue el camino que hizo el de delante); el de
// proa, con los troncos de en medio más largos, en punta; un remo largo en la proa, con el almadiero, y otro en la popa, que
// lleva el jugador (así, con la cámara detrás, se ve toda la almadía por delante y al almadiero en la punta). Diseño propio, a partir de las descripciones de los almadieros: troncos de igual largo atados con
// «cuerdas» de avellano y mimbre, con remos en proa y popa.
// Se maneja con la palanca o las flechas: a los lados, el remo lleva la almadía a un lado u otro del río; adelante, se rema
// para ir algo más deprisa; atrás, se frena. Hay que esquivar las peñas y las pilas del puente, entrar por el portillo de la
// presa y pasar por el ojo grande. Cada golpe se cuenta; al final, una a tres estrellas y lo que se ha aprendido.
//   new Almadia(game, real.presas) · bajada() → Promise<{ fin, golpes, estrellas, salir }>
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Actor } from '../actors/people.js';
import { MOD, riverInfo } from '../world/layout.js';
import { removeMover } from '../world/colliders.js';
import { infoCard } from '../ui/minigames.js';
import { laminaUrl } from '../ui/laminas.js';
import { iconSVG } from '../ui/icons.js';
import { clamp, damp, mulberry32 } from '../util/math.js';

const TRAMO = 7, HUECO = 0.45, ANCHO = 3.4, MEDIO = ANCHO / 2;   // (m)
const PASO = TRAMO + HUECO;

// ---------- la historia, en seis partes, por el camino (a qué distancia de la salida) ----------
export const HISTORIA = [
  { d: 25, k: 'Del monte al río', t: 'En invierno, los del valle cortaban pinos y abetos en el monte y los bajaban hasta la orilla del Esca, donde esperaban a la primavera.' },
  { d: 150, k: 'Atar los troncos', t: 'Los almadieros ataban los troncos en tramos con ramas de avellano retorcidas, y unían unos tramos detrás de otros. Así la almadía se doblaba en las curvas del río.' },
  { d: 300, k: 'Con el deshielo', t: 'Bajaban en primavera, cuando el río venía crecido por la nieve que se derrite. Con un remo largo en la proa y otro en la popa la llevaban por donde hay más agua.' },
  { en: 'presa', d: -110, k: 'Las presas', t: 'Las presas de los molinos tenían un portillo, un paso abierto para las almadías. Había que entrar justo por él. ¡Ahí delante está el de Burgui!' },
  { en: 'puente', d: 6, k: 'Hasta el mar', t: 'Desde aquí seguían por el Aragón y el Ebro hasta Zaragoza, y algunas hasta Tortosa, junto al mar. La madera se vendía y los almadieros volvían a casa andando.' },
  { en: 'fin', d: -10, k: 'Hoy', t: 'La última almadía de trabajo bajó en 1952. Desde entonces, cada primavera, Burgui celebra el Día de la Almadía y las bajan otra vez por el Esca.' },
];
const PARTES = HISTORIA.length;

// ---------- el modelo ----------
function color(geo, c) {
  const g = geo.index ? geo.toNonIndexed() : geo, n = g.attributes.position.count, a = new Float32Array(n * 3), cc = new THREE.Color(c);
  for (let i = 0; i < n; i++) cc.toArray(a, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
  return g;
}
// un tronco de pino descortezado a medias: tono pardo con algo de variación, y los dos cortes, claros
function tronco(L, r, rnd, piezas) {
  const c = new THREE.Color().setHSL(0.075 + rnd() * 0.02, 0.38 + rnd() * 0.1, 0.27 + rnd() * 0.08);
  const g = new THREE.CylinderGeometry(r * 0.92, r, L, 8, 1, true); g.rotateX(Math.PI / 2); piezas.push(color(g, c));
  for (const s of [-1, 1]) { const t = new THREE.CircleGeometry(r * (s > 0 ? 0.92 : 1), 8); t.rotateY(s > 0 ? 0 : Math.PI); t.translate(0, 0, s * L / 2); piezas.push(color(t, '#c9a26a')); }
}
// un tramo: nueve troncos uno junto a otro (z, a lo largo; el de proa, en punta), dos travesaños encima y las ataduras
function tramo(proa, rnd) {
  const P = [], n = 9;
  for (let i = 0; i < n; i++) {
    const r = 0.17 + rnd() * 0.04, x = (i - (n - 1) / 2) * (ANCHO / n), L = proa ? TRAMO - Math.abs(i - (n - 1) / 2) * 0.42 : TRAMO - rnd() * 0.3;
    const g = []; tronco(L, r, rnd, g); const gg = mergeGeometries(g); gg.translate(x, 0, proa ? (L - TRAMO) / 2 : 0); P.push(gg);
  }
  for (const z of [-TRAMO / 2 + 0.7, TRAMO / 2 - 0.7]) {
    const t = new THREE.CylinderGeometry(0.07, 0.08, ANCHO + 0.3, 6); t.rotateZ(Math.PI / 2); t.translate(0, 0.2, z); P.push(color(t, '#6e5235'));
    // (las ataduras de avellano retorcido, verdes y pardas, alrededor de cada tronco)
    for (let i = 0; i < n; i += 2) { const a = new THREE.TorusGeometry(0.2, 0.025, 4, 8); a.rotateY(Math.PI / 2); a.translate((i - (n - 1) / 2) * (ANCHO / n), 0.03, z); P.push(color(a, i % 4 ? '#5b5a2a' : '#4a3a22')); }
  }
  return mergeGeometries(P);
}
// el remo: una pértiga larga con la pala al final, que gira en su horquilla
function remo() {
  const P = [];
  const v = new THREE.CylinderGeometry(0.05, 0.06, 6.2, 6); v.rotateX(Math.PI / 2); v.translate(0, 0, 3.1); P.push(color(v, '#8a6a44'));
  const pala = new THREE.BoxGeometry(0.42, 0.05, 1.3); pala.translate(0, 0, 6.5); P.push(color(pala, '#9a7a50'));
  return mergeGeometries(P);
}
function horquilla() {
  const P = [], post = new THREE.CylinderGeometry(0.07, 0.09, 1.1, 6); post.translate(0, 0.55, 0); P.push(color(post, '#5e4630'));
  for (const s of [-1, 1]) { const d = new THREE.BoxGeometry(0.06, 0.32, 0.08); d.translate(s * 0.1, 1.2, 0); P.push(color(d, '#5e4630')); }
  return mergeGeometries(P);
}

const _v = new THREE.Vector3();

export class Almadia {
  constructor(game, R) {
    this.g = game; this.R = R; this.C = R.cadena;
    this.T = { nombre: 'la almadía', bajar: 'Dejar la almadía' };   // (como los otros vehículos: la acción de bajar)
    const rnd = mulberry32(1952), mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
    this.mat = mat; this.geos = [];
    this.obj = new THREE.Group(); this.obj.name = 'almadía';
    this.tramos = [0, 1, 2].map(k => { const g = tramo(k === 0, rnd); this.geos.push(g); const m = new THREE.Mesh(g, mat); m.castShadow = true; this.obj.add(m); return m; });
    const gr = remo(), gh = horquilla(); this.geos.push(gr, gh);
    this.remos = [0, 2].map(k => { const h = new THREE.Mesh(gh, mat), r = new THREE.Mesh(gr, mat); h.castShadow = r.castShadow = true; this.tramos[k].add(h); h.position.set(0, 0.15, k === 0 ? TRAMO / 2 - 0.9 : -TRAMO / 2 + 0.9); r.position.set(0, 1.2, 0); h.add(r); if (k === 2) h.rotation.y = Math.PI; return r; });
    game.scene.add(this.obj);
    // el camino: de la salida (río arriba) a 45 m después del puente
    const C = this.C, fam = MOD.real?.puentes?.find(P => P.famoso)?.famoso;
    this.fam = fam;
    this.sPuente = fam ? C.proyecta(fam.ojo.x, fam.ojo.z) : R.presa.s + 70;
    this.s0 = 42; this.sFin = Math.min(C.total - 10, this.sPuente + 45);
    this.s = this.s0 + PASO * 3; this.u = 0; this.vu = 0; this.v = 0; this.golpes = 0; this.hechos = new Set(); this.parte = -1;
    this.huella = [];   // (por dónde ha ido la proa: s y desvío, para que los tramos de detrás sigan el mismo camino)
    // (lo que hay que esquivar: las peñas y las pilas del puente que pisan el agua)
    this.obst = [...R.peñas.map(p => ({ ...p, k: 'peña' })), ...(fam?.pilas || []).map(p => ({ ...p, k: 'pila' }))].map(o => ({ ...o, s: C.proyecta(o.x, o.z) }));
    this.salpica = 0; this.golpeT = 0; this.lento = 0; this.t = 0;
    // (dónde sale cada parte de la historia: a tanto de la salida, o antes o después de la presa, del puente o del final)
    this.marcas = HISTORIA.map(h => h.en === 'presa' ? R.presa.s + h.d : h.en === 'puente' ? this.sPuente + h.d : h.en === 'fin' ? this.sFin + h.d : this.s0 + h.d);
  }
  // el desvío de la proa cuando pasó por s (para los tramos de detrás)
  desvioEn(s) {
    const H = this.huella; if (!H.length) return this.u;
    for (let i = H.length - 1; i > 0; i--) if (H[i - 1][0] <= s) { const [s0, u0] = H[i - 1], [s1, u1] = H[i]; return u0 + (u1 - u0) * clamp((s - s0) / ((s1 - s0) || 1), 0, 1); }
    return H[0][1];
  }
  sube(P) {
    const g = this.g, F = g.follow;
    this.P = P; P.vehiculo = this; P.speed = 0; this.distAntes = F.targetDist; this.pitchAntes = F.pitch; F.targetDist = 15; F.pitch = 0.42; F.yaw = this.rumbo() + Math.PI;   // (algo más lejos y más alto: se ve la almadía entera)
    document.body.classList.add('conduce');
    if (P.collider) P.collider.ghost = true;
    for (let k = 0; k < 40; k++) this.huella.push([this.s - PASO * 3 + k * PASO * 3 / 39, 0]);
    // el almadiero, en la popa, con su remo
    const host = this.host;
    try { this.alm = new Actor({ id: 'almadiero-bajada', name: host?.name || 'Almadiero', x: 0, z: 0, heading: 0, look: host?.def?.look || { shirt: '#ffffff', vest: '#2b2630', pants: '#2b2630', txapela: '#1d1d24' }, y: 0, ghost: true }, g.scene); this.alm.frozen = true; } catch (e) { this.alm = null; }
    this.place(0); this.pon(P, 0); F.snap?.(P);
  }
  // (sin sitio: se deja la bajada a medias, con la acción de bajar; quien la empezó deja al jugador en la orilla)
  baja(x, z, heading) {
    if (x == null) { this.cancela?.(); return; }
    const P = this.P; if (!P) return;
    const g = this.g, F = g.follow;
    P.vehiculo = null; this.P = null; F.targetDist = this.distAntes ?? F.targetDist; if (this.pitchAntes != null) F.pitch = this.pitchAntes; document.body.classList.remove('conduce');
    if (P.collider) P.collider.ghost = false;
    P.place(x, z, heading); F.snap?.(P);
  }
  rumbo() { const a = this.C.at(this.s); return Math.atan2(a.dx, a.dz); }
  // cada tramo en su sitio, sobre el agua, siguiendo el camino de la proa, con un leve cabeceo
  place(dt) {
    const C = this.C;
    this.tramos.forEach((m, k) => {
      const sb = this.s - k * PASO, sa = sb - TRAMO, ub = this.desvioEn(sb), ua = this.desvioEn(sa), A = C.at(sa), Bq = C.at(sb);
      const ax = A.x + A.nx * ua, az = A.z + A.nz * ua, bx = Bq.x + Bq.nx * ub, bz = Bq.z + Bq.nz * ub;
      const y = (A.nivel + Bq.nivel) / 2 + 0.08 + Math.sin(this.t * 1.7 + k * 1.3) * 0.035;
      m.position.set((ax + bx) / 2, y, (az + bz) / 2);
      m.rotation.set(Math.atan2(A.nivel - Bq.nivel, TRAMO) + Math.sin(this.t * 1.3 + k) * 0.012, Math.atan2(bx - ax, bz - az), Math.sin(this.t * 1.1 + k * 2) * 0.02, 'YXZ');
      m.updateMatrixWorld(true);
    });
    // los remos: el de proa, a donde se lleva la almadía; el de popa, al contrario, para ayudarla a girar
    const giro = clamp(this.vu / 2.6, -1, 1);
    this.remos[0].rotation.set(0.38, -giro * 0.5, 0);
    this.remos[1].rotation.set(0.38 + Math.sin(this.t * 2.2) * 0.04 * (1 + Math.abs(this.empuje || 0)), giro * 0.55, 0);
  }
  update(dt, input, P) {
    if (this.parado) { this.place(dt); this.pon(P, dt); return; }
    const C = this.C, R = this.R; this.t += dt; input.consume?.(' ');
    const lado = clamp(input.move?.x || 0, -1, 1), f = clamp(input.move?.y || 0, -1, 1); this.empuje = f;
    // la corriente: más viva en la presa y bajo el puente; remando, algo más; frenando, algo menos; tras un golpe, despacio
    // (desde el 14 de noviembre de 2026, casi el doble de deprisa: 6,4 m/s en vez de 3,6, y remando, 8,8: la bajada dura
    // unos dos minutos y no más de tres. El autor: «va muy despacio»)
    const ds = this.s - R.presa.s, rapida = Math.exp(-(ds * ds) / 200) * 2.2 + Math.exp(-((this.s - this.sPuente) ** 2) / 300) * 0.8;
    const quiere = (6.4 + rapida + (f > 0 ? f * 2.4 : f * 2.8)) * (this.lento > 0 ? 0.55 : 1);
    this.v = damp(this.v, quiere, 1.8, dt); this.lento -= dt; this.golpeT -= dt;
    if (Math.abs(lado) > 0.25) this.llevada = (this.llevada || 0) + dt;   // (ya sabe llevarla: se quita el aviso de la palanca)
    this.s += this.v * dt;
    // a un lado o a otro con el remo (con su inercia: es una balsa de 20 m), sin salirse del agua
    // (hacia el lado de la pantalla al que se empuja la palanca. Hasta el 14 de noviembre de 2026 iba al revés: la palanca
    // a la derecha llevaba la almadía a la izquierda, y no había quien la entendiese)
    this.vu = damp(this.vu, lado * 3.9 * this.derecha(), 3.2, dt);
    const lim = this.C.half - MEDIO - 0.6;
    this.u += this.vu * dt;
    if (Math.abs(this.u) > lim) { if (Math.abs(this.vu) > 0.9) this.golpe(null, 'Cuidado con la orilla'); this.u = Math.sign(this.u) * lim; this.vu *= -0.3; }
    this.huella.push([this.s, this.u]); while (this.huella.length > 2 && this.huella[1][0] < this.s - PASO * 3 - 4) this.huella.shift();
    this.place(dt);
    this.choques();
    this.momentos();
    this.pon(P, dt);
    // la cámara, detrás de la almadía
    const F = this.g.follow, quiereYaw = this.tramos[0].rotation.y + Math.PI;
    let d = ((quiereYaw - F.yaw) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI; F.yaw += d * Math.min(1, dt * 2.2);
    // el agua que salta en la proa
    if ((this.salpica -= dt) <= 0) { this.salpica = 0.18; const b = this.tramos[0].localToWorld(_v.set((Math.random() - 0.5) * ANCHO, 0, TRAMO / 2)); this.g.particles?.emit({ x: b.x, y: b.y + 0.1, z: b.z }, { n: 2 + Math.round(rapida * 3), color: ['#ffffff', '#d8eef5'], speed: 1.2 + rapida, size: 0.22, life: 0.6, gravity: 6 }); }
    if (this.s >= this.sFin) this.acaba();
  }
  // el jugador, de pie en la popa junto a su remo; el almadiero, en la proa, mirando río abajo
  pon(P, dt) {
    const m2 = this.tramos[2], p = m2.localToWorld(_v.set(0.25, 0.22, -TRAMO / 2 + 1.7));
    P.pos.copy(p); P.heading = m2.rotation.y; P.wade = 0; P.inclina = 0; P.speed = 0;
    P.rig.update(dt, 0, true, 0); P.sync();
    if (this.alm) { const m0 = this.tramos[0], q = m0.localToWorld(_v.set(-0.25, 0.22, TRAMO / 2 - 1.9)); this.alm.alto = q.y; this.alm.lookAt = null; this.alm.heading = m0.rotation.y; this.alm.update(dt, null); this.alm.pos.set(q.x, q.y, q.z); this.alm.heading = m0.rotation.y; this.alm.sync(); }
  }
  // un golpe: frena, salta agua, suena y se aparta de lo que ha tocado
  golpe(o, txt) {
    if (this.golpeT > 0) return;
    this.golpeT = 1.1; this.golpes++; this.lento = 1.2;
    const b = this.tramos[0].localToWorld(_v.set(0, 0, TRAMO / 2));
    this.g.particles?.emit({ x: b.x, y: b.y + 0.2, z: b.z }, { n: 26, color: ['#ffffff', '#cfe8f0'], speed: 3.5, size: 0.3, life: 0.8, gravity: 7 });
    this.g.sound?.splash?.({ x: b.x, y: b.y, z: b.z }, 0.7); this.g.sound?.noiseBurst && this.g.sound.ctx && this.g.sound.noiseBurst(0.25, 180, 0.8, 0.35, this.g.sound.sfx);
    if (o) this.vu = Math.sign(this.u - o.u || 1) * 2.4;
    this.aviso(txt || 'Cuidado con las peñas', 'warn');
  }
  // contra las peñas y las pilas: cada tramo, un rectángulo; cada cosa, un círculo
  choques() {
    for (const o of this.obst) {
      if (Math.abs(o.s - this.s) > PASO * 3 + 6) continue;
      for (const m of this.tramos) {
        const dx = o.x - m.position.x, dz = o.z - m.position.z, c = Math.cos(m.rotation.y), s = Math.sin(m.rotation.y);
        const lx = dx * c - dz * s, lz = dx * s + dz * c, ex = Math.max(0, Math.abs(lx) - MEDIO), ez = Math.max(0, Math.abs(lz) - TRAMO / 2);
        if (Math.hypot(ex, ez) < o.r) { const q = this.C.at(o.s); o.u = (o.x - q.x) * q.nx + (o.z - q.z) * q.nz; this.golpe(o, o.k === 'pila' ? 'Cuidado con la pila del puente' : 'Cuidado con las peñas'); return; }
      }
    }
  }
  // la presa, el puente y las partes de la historia
  momentos() {
    const R = this.R, C = this.C, d = this.s - this.s0;
    if (this.parte + 1 < PARTES && this.s >= this.marcas[this.parte + 1]) { this.parte++; this.cuento(this.parte); }
    if (!this.hechos.has('presa') && this.s >= R.presa.s) {
      this.hechos.add('presa');
      const q = C.at(R.presa.s), up = (R.presa.portillo.x - q.x) * q.nx + (R.presa.portillo.z - q.z) * q.nz, holgura = R.presa.portillo.ancho / 2 - MEDIO + 0.7;
      if (Math.abs(this.u - up) <= holgura) {
        this.portillo = true; this.aviso('¡Por el portillo de la presa!', 'ok');
        const b = this.tramos[0].localToWorld(_v.set(0, 0, 0)); this.g.particles?.emit({ x: b.x, y: b.y + 0.3, z: b.z }, { n: 60, color: ['#ffffff', '#e2f3f8'], speed: 5, size: 0.35, life: 1.1, gravity: 7, spread: 3 });
        this.g.sound?.splash?.({ x: b.x, y: b.y, z: b.z }, 0.9);
      } else { this.golpeT = 0; this.golpe(null, 'Por el portillo, no por la presa'); }
    }
    if (this.fam && !this.hechos.has('puente') && this.s >= this.sPuente) {
      this.hechos.add('puente');
      const q = C.at(this.sPuente), uo = (this.fam.ojo.x - q.x) * q.nx + (this.fam.ojo.z - q.z) * q.nz;
      if (Math.abs(this.u - uo) < this.fam.ojo.luz / 2 - MEDIO) { this.ojo = true; this.aviso('¡Por el ojo grande del puente!', 'ok'); }
    }
    this.g.ui.setMG(`<b>La almadía</b><span class="alm-barra"><i style="width:${Math.round(clamp((this.s - this.s0) / (this.sFin - this.s0), 0, 1) * 100)}%"></i></span><small>${this.golpes ? `Golpes: ${this.golpes}` : 'Sin golpes'} · Historia ${Math.max(0, this.parte + 1)}/${PARTES}</small>`);
  }
  // una parte de la historia: arriba, sin parar la bajada, unos segundos
  cuento(i) {
    const h = HISTORIA[i]; let el = document.querySelector('.alm-cuento');
    if (!el) { el = document.createElement('div'); el.className = 'alm-cuento'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
    el.innerHTML = `<span class="alm-k">${iconSVG('raft', 16)}<b>La historia de la almadía · ${i + 1}/${PARTES}</b></span><strong>${h.k}</strong><p>${h.t}</p>`;
    el.classList.remove('fuera'); void el.offsetWidth; el.classList.add('dentro');
    clearTimeout(this.tCuento); this.tCuento = setTimeout(() => el.classList.add('fuera'), Math.max(7000, h.t.length * 75));
  }
  aviso(txt, tipo) { this.g.ui.toast?.(txt, tipo === 'ok' ? 'check' : 'raft', 1800); }
  acaba() {
    if (this.parado) return; this.parado = true; this.v = 0;
    const est = 1 + (this.golpes <= 3 ? 1 : 0) + (this.golpes <= 1 && this.portillo ? 1 : 0);
    this.fin?.({ fin: true, golpes: this.golpes, estrellas: est, portillo: !!this.portillo, ojo: !!this.ojo });
  }
  /** La bajada entera: se sube, se baja el río y, al llegar, se desembarca en la orilla. */
  bajada(P) {
    return new Promise(res => {
      this.fin = res; this.sube(P);
      this.cancela = () => res({ salir: true });
    });
  }
  // un sitio en la orilla, junto al final, donde dejar al jugador
  orilla() {
    const C = this.C, q = C.at(this.sFin - 4);
    for (const k of [1, -1]) for (let e = C.half + 2; e < C.half + 14; e += 1) { const x = q.x + q.nx * e * k, z = q.z + q.nz * e * k; if (riverInfo(x, z).edge > 1.5) return { x, z, h: Math.atan2(-q.nx * k, -q.nz * k) }; }
    return { x: q.x + q.nx * (C.half + 4), z: q.z + q.nz * (C.half + 4), h: 0 };
  }
  dispose() {
    if (this.muerta) return; this.muerta = true;
    clearTimeout(this.tCuento); document.querySelector('.alm-cuento')?.remove();
    if (this.alm) { try { this.alm.obj.parent?.remove(this.alm.obj); removeMover(this.alm.collider); } catch (e) { } this.alm = null; }
    this.obj.parent?.remove(this.obj); for (const g of this.geos) g.dispose(); this.mat.dispose();
    this.g.ui.setMG(null);
  }
}

// ---------- la misión: hablar con el almadiero, la bajada y lo aprendido ----------
export async function jugarAlmadia(game, M, say) {
  const R = MOD.real?.presas;
  if (!R) return { error: true };
  css();
  await infoCard(game.ui, { icon: 'raft', lamina: laminaUrl('burgui-almadia'), kicker: 'El Día de la Almadía · Burgui', title: 'La almadía',
    text: 'Una almadía es una balsa de troncos atados. Así bajaba la madera del Pirineo por los ríos, hasta las ciudades. Hoy vas a bajar el Esca en una, como los almadieros.',
    extra: '<ul class="tools"><li><b>A los lados</b><i></i><span>el remo lleva la almadía a un lado u otro del río</span></li><li><b>Adelante</b><i></i><span>remas para ir más deprisa</span></li><li><b>Atrás</b><i></i><span>frenas</span></li></ul><p class="alm-meta">Esquiva las peñas, entra por el portillo de la presa y pasa por el ojo grande del puente.</p>', button: '¡A la almadía!' });
  const A = new Almadia(game, R); A.host = M.host;
  game.almadia = A;
  const P = game.player;
  let r;
  try { r = await A.bajada(P); }
  finally {
    const o = A.orilla(); A.baja(o.x, o.z, o.h); A.dispose(); game.almadia = null;
  }
  if (r.salir) return r;
  const estrellas = '★'.repeat(r.estrellas) + '☆'.repeat(3 - r.estrellas);
  await infoCard(game.ui, { icon: 'raft', lamina: laminaUrl('burgui-almadia'), kicker: `Bajada del Esca · ${estrellas}`, title: r.golpes ? `¡Llegaste con ${r.golpes} ${r.golpes === 1 ? 'golpe' : 'golpes'}!` : '¡Llegaste sin un golpe!',
    text: `${r.portillo ? 'Entraste por el portillo de la presa' : 'La presa se te resistió'}${r.ojo ? ' y pasaste por el ojo grande del puente medieval.' : '.'} Así trabajaban los almadieros del Roncal.`,
    extra: '<div class="antes-ahora"><div><b>Antes</b>La madera de los bosques del Pirineo bajaba por el Esca, el Aragón y el Ebro atada en almadías. Era un oficio duro y peligroso.</div><div><b>Ahora</b>El saber de los almadieros es Patrimonio Cultural Inmaterial de la Humanidad. En Burgui hay un museo de la almadía y cada primavera se bajan otra vez.</div></div>',
    button: '¡Lo he aprendido!' });
  return r;
}

let CSS = false;
function css() {
  if (CSS) return; CSS = true;
  const s = document.createElement('style'); s.id = 'alm-css';
  s.textContent = `
.alm-cuento{position:fixed;left:calc(env(safe-area-inset-left,0px) + 16px);top:calc(env(safe-area-inset-top,0px) + 76px);z-index:40;width:min(400px,40vw);transform:translateY(-8px);opacity:0;padding:12px 16px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(32,20,58,.94),rgba(18,10,36,.94));box-shadow:0 10px 30px rgba(0,0,0,.35);color:#fff;pointer-events:none;transition:opacity .35s,transform .35s}
.alm-cuento.dentro{opacity:1;transform:none}.alm-cuento.fuera{opacity:0;transform:translateY(-8px)}
.alm-cuento .alm-k{display:flex;align-items:center;gap:8px;color:#ffd166;font-size:var(--fs-xs,12px);letter-spacing:.06em;text-transform:uppercase}
.alm-cuento .alm-k svg{flex:none}.alm-cuento strong{display:block;margin-top:6px;font-size:var(--fs-lg,18px);line-height:1.15}
.alm-cuento p{margin:4px 0 0;font-size:var(--fs-sm,14px);line-height:1.45;color:rgba(255,255,255,.88)}
#mg .alm-barra{display:block;width:180px;height:6px;margin:6px auto 4px;border-radius:999px;background:rgba(255,255,255,.15);overflow:hidden}
#mg .alm-barra i{display:block;height:100%;border-radius:999px;background:#ffd166}
.alm-meta{margin:10px 0 0;font-weight:700}
@media (max-width:760px){.alm-cuento{left:16px;right:16px;width:auto;top:calc(env(safe-area-inset-top,0px) + 136px)}}
@media (max-height:500px){.alm-cuento{top:calc(env(safe-area-inset-top,0px) + 70px);width:min(360px,38vw);left:calc(env(safe-area-inset-left,0px) + 16px);right:auto;padding:8px 12px 10px}.alm-cuento strong{font-size:var(--fs-md,16px)}.alm-cuento p{font-size:var(--fs-xs,12px)}}
@media (prefers-reduced-motion:reduce){.alm-cuento{transition:none}}`;
  document.head.appendChild(s);
}
