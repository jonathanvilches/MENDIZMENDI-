// Persecución de las criaturas de la noche (Basajaun, Lamia, momotxorros…).
// Huyen más rápido que el jugador corriendo, eligen escondites tras casas y árboles y aprovechan
// el terreno. Antes de cada cambio de rumbo avisan (se agachan, brillan, suena su llamada y una
// flecha de luz marca hacia dónde van), así que el reto es difícil pero justo: hay que cortarles
// el paso, acorralarlas contra muros, agua o los límites de su territorio, o alcanzarlas cuando
// se cansan.
import * as THREE from 'three';
import { groundHeight, waterLevelAt } from '../world/heightfield.js';
import { resolve, isFree, segmentBlocked } from '../world/colliders.js';
import { dampAngle, damp } from '../util/math.js';

let GLOW = null;
function glowTex() {
  if (GLOW) return GLOW;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  GLOW = new THREE.CanvasTexture(c); GLOW.colorSpace = THREE.SRGBColorSpace; return GLOW;
}
const sprite = (color, s, o, add = true) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity: o, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false })); m.scale.setScalar(s); return m; };
const isWater = (x, z) => waterLevelAt(x, z) > groundHeight(x, z) - 0.15;

export const PLAYER_RUN = 6.8;

export class Chase {
  // opts: { color, lair:{x,z}, water (le gusta el agua), light (PointLight compartida), sound(kind), onWarn, onTired }
  constructor(actor, player, scene, opts = {}) {
    this.a = actor; this.player = player; this.scene = scene; this.o = opts;
    this.state = 'watch'; this.t = 0; this.stamina = 1; this.goal = null; this.stuck = 0; this.caught = false;
    this.fast = PLAYER_RUN * (opts.speedMul || 1.2); this.slow = PLAYER_RUN * 0.45;
    this.scale = actor.obj.scale.x || 1;
    this.catchR = 1.4 + 0.5 * this.scale;
    const color = opts.color || '#9fe0ff';
    // flecha de aviso en el suelo: indica hacia dónde va a salir
    const sh = new THREE.Shape(); sh.moveTo(0, 1.6); sh.lineTo(0.7, 0.2); sh.lineTo(0.25, 0.35); sh.lineTo(0.25, -0.6); sh.lineTo(-0.25, -0.6); sh.lineTo(-0.25, 0.35); sh.lineTo(-0.7, 0.2); sh.closePath();
    this.arrow = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    this.arrow.rotation.x = -Math.PI / 2; this.arrow.renderOrder = 3; scene.add(this.arrow);
    // niebla baja que se arrastra a su alrededor
    this.fog = [];
    for (let i = 0; i < 6; i++) { const s = sprite('#b9c6d8', 3.2 + (i % 3) * 1.2, 0.2, false); scene.add(s); this.fog.push({ s, a: i / 6 * Math.PI * 2, r: 1.2 + (i % 2) * 0.8, sp: 0.25 + (i % 3) * 0.1 }); }
    // ojos que brillan en la oscuridad
    const F = actor.obj.userData.face, head = actor.J.head;
    this.eyes = [];
    if (F && head) for (const sd of [-1, 1]) { const e = sprite(opts.eyeColor || '#fff2b0', F.R * 0.55, 0.95); e.position.set(sd * F.R * 0.3, F.R * 1.0, F.R * 0.98); head.add(e); this.eyes.push(e); }
    this.light = opts.light || null;
    this.callT = 2;
  }
  // elige el siguiente escondite: lejos del jugador, detrás de algo que tape la vista y sin
  // volver hacia él; dentro de su territorio. Si no encuentra salida, queda acorralada.
  plan() {
    const A = this.a.pos, P = this.player.pos, lair = this.o.lair || A, R = this.o.range || 55;
    const toP = Math.atan2(P.x - A.x, P.z - A.z);
    let best = null, bs = -1e9;
    for (let i = 0; i < 22; i++) {
      const ang = toP + Math.PI + (Math.random() - 0.5) * Math.PI * 1.7, r = 18 + Math.random() * 18;
      const x = A.x + Math.sin(ang) * r, z = A.z + Math.cos(ang) * r;
      if (Math.abs(x) > 440 || Math.abs(z) > 440 || Math.hypot(x - lair.x, z - lair.z) > R) continue;
      if (!isFree(x, z, 0.7) || (!this.o.water && isWater(x, z))) continue;
      const dP = Math.hypot(x - P.x, z - P.z), dA = Math.hypot(x - A.x, z - A.z);
      const toward = Math.cos(ang - toP);                            // >0: pasaría cerca del jugador
      let sc = dP * 1.2 - dA * 0.15 - Math.max(0, toward) * 18;
      if (segmentBlocked(P.x, P.z, x, z)) sc += 9;                  // escondite: algo tapa la vista
      if (this.o.water) sc += isWater(x + 3, z) || isWater(x - 3, z) || isWater(x, z + 3) || isWater(x, z - 3) ? 8 : 0;
      if (sc > bs) { bs = sc; best = { x, z }; }
    }
    this.goal = best;
    return !!best && bs > 4;
  }
  warn(dur = 0.6) {
    this.state = 'warn'; this.t = dur;
    this.o.sound?.('call', this.a.pos);
    this.o.onWarn?.();
  }
  update(dt) {
    const a = this.a, A = a.pos, P = this.player.pos;
    const dP = Math.hypot(P.x - A.x, P.z - A.z);
    if (!this.caught && dP < this.catchR) { this.caught = true; this.state = 'caught'; this.clearFx(); this.o.onCaught?.(); return; }
    let speed = 0, want = null;
    this.t -= dt;
    switch (this.state) {
      case 'watch': case 'hide':
        this.stamina = Math.min(1, this.stamina + dt * 0.28);
        want = Math.atan2(P.x - A.x, P.z - A.z);
        if (dP < (this.state === 'watch' ? 15 : 16)) { if (this.plan()) this.warn(this.state === 'watch' ? 0.8 : dP < 8 ? 0.3 : 0.45); else this.corner(); }
        break;
      case 'warn': {
        want = this.goal ? Math.atan2(this.goal.x - A.x, this.goal.z - A.z) : a.heading;
        if (this.t <= 0) { this.state = 'flee'; this.fleeT = 0; }
        break;
      }
      case 'flee': case 'tired': {
        if (!this.goal) { this.state = 'hide'; break; }
        const dx = this.goal.x - A.x, dz = this.goal.z - A.z, dG = Math.hypot(dx, dz);
        want = Math.atan2(dx, dz);
        speed = this.state === 'tired' ? this.slow : this.fast * (dP < 6 ? 1.05 : 1);
        if (this.state === 'flee') { this.stamina -= dt * 0.1; if (this.stamina <= 0) { this.stamina = 0; this.state = 'tired'; this.t = 2.6; this.o.onTired?.(); } }
        else if (this.t <= 0) { this.stamina = 0.35; if (this.plan()) this.warn(0.5); else this.corner(); break; }
        if (dG < 1.5) { if (dP < 16 && this.plan()) this.warn(0.3); else { this.state = 'hide'; this.t = 0; } break; }
        // el jugador le corta el paso: se para en seco, avisa y busca otra salida
        const pG = Math.hypot(this.goal.x - P.x, this.goal.z - P.z);
        this.fleeT = (this.fleeT || 0) + dt;
        if (this.state === 'flee' && this.fleeT > 1 && pG < dG * 0.8 && dP < 9) { if (this.plan()) this.warn(0.35); else this.corner(); }
        break;
      }
      case 'cornered':
        want = Math.atan2(P.x - A.x, P.z - A.z); speed = 0;
        if (this.t <= 0) { if (this.plan()) this.warn(0.5); else this.t = 1; }
        break;
    }
    // movimiento con rodeo de obstáculos
    if (want != null) a.heading = dampAngle(a.heading, want, speed > 0 ? 7 : 5, dt);
    a.speed = damp(a.speed, speed, 6, dt);
    if (a.speed > 0.05) {
      let h = a.heading;
      for (const off of [0, 0.5, -0.5, 1.0, -1.0, 1.5, -1.5]) {
        const hh = a.heading + off, nx = A.x + Math.sin(hh) * 1.4, nz = A.z + Math.cos(hh) * 1.4;
        if (isFree(nx, nz, 0.5) && (this.o.water || !isWater(nx, nz))) { h = hh; break; }
      }
      const r = resolve(A.x + Math.sin(h) * a.speed * dt, A.z + Math.cos(h) * a.speed * dt, 0.5, a.collider);
      // atascada de verdad (apenas avanza): busca otra salida, sin quedarse avisando sin parar
      const moved = Math.hypot(r.x - A.x, r.z - A.z);
      this.stuck = moved < a.speed * dt * 0.25 ? this.stuck + dt : Math.max(0, this.stuck - dt);
      if (this.stuck > 0.9 && this.state === 'flee') { this.stuck = 0; if (this.plan()) this.warn(0.4); else this.corner(); }
      A.x = r.x; A.z = r.z; a.phase += a.speed * dt * 4.2;
    }
    A.y = groundHeight(A.x, A.z);
    a.collider.x = A.x; a.collider.z = A.z;
    a.lookAt = this.state === 'flee' ? null : P;
    a.animate(dt); a.sync();
    this.fx(dt, dP);
  }
  corner() { this.state = 'cornered'; this.t = 1.6; this.o.onCornered?.(); }
  fx(dt, dP) {
    const A = this.a.pos, T = (this.ft = (this.ft || 0) + dt);
    // flecha de aviso
    const m = this.arrow.material;
    if (this.state === 'warn' && this.goal) {
      const h = Math.atan2(this.goal.x - A.x, this.goal.z - A.z);
      this.arrow.position.set(A.x + Math.sin(h) * 2.4, groundHeight(A.x, A.z) + 0.12, A.z + Math.cos(h) * 2.4);
      this.arrow.rotation.z = -h + Math.PI; m.opacity = 0.55 + Math.sin(T * 20) * 0.3;
    } else m.opacity = Math.max(0, m.opacity - dt * 3);
    // niebla que se arrastra
    for (const f of this.fog) { f.a += dt * f.sp; f.s.position.set(A.x + Math.cos(f.a) * f.r, A.y + 0.35 + Math.sin(T + f.a) * 0.1, A.z + Math.sin(f.a) * f.r); }
    // ojos más intensos al avisar y al estar acorralada
    for (const e of this.eyes) e.material.opacity = this.state === 'warn' || this.state === 'cornered' ? 1 : 0.7 + Math.sin(T * 3) * 0.15;
    // luz propia que tiñe el entorno cercano
    if (this.light) { this.light.position.set(A.x, A.y + 1.8 * this.scale, A.z); this.light.intensity = (this.state === 'warn' ? 16 : 10) + Math.sin(T * 5) * 2; }
    // su sonido, cada poco (más a menudo cuanto más cerca)
    if ((this.callT -= dt) <= 0) { this.callT = 2 + Math.min(4, dP / 8); this.o.sound?.('ambient', A); }
  }
  clearFx() {
    this.arrow.material.opacity = 0;
    for (const f of this.fog) f.s.visible = false;
    if (this.light) this.light.intensity = 0;
  }
  dispose() {
    this.scene.remove(this.arrow);
    for (const f of this.fog) this.scene.remove(f.s);
    for (const e of this.eyes) e.parent?.remove(e);
    if (this.light) this.light.intensity = 0;
  }
}
