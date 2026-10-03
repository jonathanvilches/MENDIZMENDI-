// Retos de entrenamiento: regate entre conos contra reloj, tiro a las dianas de las escuadras y pases a compañeros que se
// mueven. Usan la misma lógica del partido en una fase libre (sin árbitro ni reloj del partido).
import * as THREE from 'three';
import { FIELD as F, PHYS as K, RETOS, RULES as RU, ROLES } from './rules.js';

const hyp = Math.hypot;

export class Reto {
  constructor(id, g, view) { this.id = RETOS[id] ? id : 'conos'; this.D = RETOS[this.id]; this.g = g; this.v = view; this.objs = []; this.t = 0; this.done = false; this.fixedCam = true; }
  add(o) { this.v.scene.add(o); this.objs.push(o); return o; }
  // todos fuera menos los que hacen falta
  clear(keep = []) {
    const g = this.g;
    g.players.forEach((p, i) => { if (keep.includes(p)) return; p.x = -F.HL + 2 + i * 1.6; p.z = -F.HW - 1.2; p.h = 0; p.react = 1e9; p.wx = p.wz = 0; p.vx = p.vz = 0; });
    g.keeper = (p) => { p.wx = p.wz = 0; };   // sin porteros
    g.noRefs = true; g.refs.forEach((r, i) => { r.x = F.HL - 4 - i * 2; r.z = -F.HW - 3; r.vx = r.vz = 0; });   // ni árbitro
  }
  start() {
    const g = this.g, me = g.byRole(0, RU.start);
    g.kickoff(0); g.restart = null; g.setPhase('tuto'); g.owner = null; g.noSwitch = true;
    g.me = me; me.react = 0;
    this.v.hud.say(this.D.name, 2000);
    if (this.id === 'conos') this.setupConos(me);
    else if (this.id === 'dianas') this.setupDianas(me);
    else this.setupPases(me);
  }
  label() { return this.id === 'conos' ? (this.go ? this.time().toFixed(1) + ' s' : 'Conos') : this.id === 'dianas' ? `Tiro ${Math.min(this.D.shots, this.n + 1)}/${this.D.shots}` : `${Math.max(0, Math.ceil(this.D.time - this.t))} s`; }
  time() { return this.t + this.pen; }

  // ---------------------------------------------------------------- conos
  setupConos(me) {
    this.clear([me]);
    // (en la pista de sala, los conos más juntos: 6 conos entre −11·k y 11·k)
    const k = Math.max(RU.scale, 0.6); this.k = k;
    me.x = -16 * k; me.z = 0; me.h = Math.PI / 2; this.g.ball.set(-16 * k + 0.6, 0); this.g.takeBall(me);
    const cone = new THREE.ConeGeometry(0.22, 0.6, 16), mat = new THREE.MeshStandardMaterial({ color: '#ff7a1a', roughness: 0.6 });
    const gate = new THREE.CircleGeometry(0.32, 20).rotateX(-Math.PI / 2), gm = new THREE.MeshBasicMaterial({ color: '#56c8f0', transparent: true, opacity: 0.75, depthWrite: false });
    this.cones = [];
    for (let i = 0; i < 6; i++) {
      const x = (-11 + i * 4.4) * k, side = i % 2 ? 1 : -1;
      const c = this.add(new THREE.Mesh(cone, mat)); c.position.set(x, 0.3, 0); c.castShadow = true;
      const m = this.add(new THREE.Mesh(gate, gm)); m.position.set(x, 0.02, side * 1.3);   // por este lado se pasa
      this.cones.push({ x, side, done: false });
    }
    const fin = this.add(new THREE.Mesh(new THREE.PlaneGeometry(0.3, 8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffd700' }))); fin.position.set(14 * k, 0.02, 0);
    this.pen = 0; this.go = false; this.prevX = this.g.ball.p.x;
    this.v.hud.tip('Zigzag: pasa cada cono por el lado del <b>círculo azul</b> y cruza la línea amarilla');
  }
  // ---------------------------------------------------------------- dianas
  setupDianas(me) {
    this.clear([me]);
    this.n = 0; this.hits = 0; this.wait = 0;
    const tor = new THREE.TorusGeometry(0.42, 0.06, 10, 32), tm = new THREE.MeshStandardMaterial({ color: '#ffd700', emissive: '#ffb000', emissiveIntensity: 0.6 });
    this.targets = [-1, 1].map(s => { const m = this.add(new THREE.Mesh(tor, tm.clone())); m.position.set(F.HL - 0.02, F.goalH - 0.5, s * (F.goalW / 2 - 0.5)); m.rotation.y = Math.PI / 2; return { m, y: F.goalH - 0.5, z: s * (F.goalW / 2 - 0.5) }; });
    this.place(me);
    this.v.hud.tip('Apunta a una <b>diana</b> y mantén <b>TIRO</b> para cargar (arriba, más fuerza)');
  }
  place(me) {
    // desde la frontal del área (a 17–21 m de la línea de meta)
    // (en sala, desde 9–12 m: la mitad de lejos y más cerrado)
    const g = this.g, k = F.areaD ? 0.55 : 1, spots = [[18, 0], [19, -4], [19, 4], [20, -7], [20, 7], [21, 0], [17, -2], [17, 2]], [d0, z0] = spots[this.n % spots.length], d = d0 * k, z = z0 * k;
    me.x = F.HL - d - 0.7; me.z = z; me.h = Math.atan2(F.HL - me.x, -me.z * 0.3); me.vx = me.vz = 0;
    g.owner = null; g.ball.set(F.HL - d, z); g.takeBall(me); this.shot = null;
  }
  // ---------------------------------------------------------------- pases
  setupPases(me) {
    const g = this.g, mates = ROLES.length > 5 ? [g.byRole(0, 'MCI'), g.byRole(0, 'MI'), g.byRole(0, 'MD')] : g.team(0).filter(p => p.role !== 'POR' && p.role !== RU.start).slice(0, 3);
    this.clear([me, ...mates]);
    me.x = -4; me.z = 0; me.h = Math.PI / 2; g.ball.set(-3.4, 0); g.takeBall(me);
    const k = F.areaD ? 0.62 : 1;
    this.mates = mates.map((p, i) => { const c = [[5, -7], [13, 3], [3, 9]][i].map(v => v * k); p.x = c[0]; p.z = c[1]; return { p, cx: c[0], cz: c[1], a: i * 2, r: (3 + i) * k, w: 0.5 + i * 0.12 }; });
    this.n = 0; this.back = 0;
    this.v.hud.tip('Pasa al hueco: apunta a un compañero y suelta <b>PASE</b>. Te la devuelven');
  }

  update(dt) {
    if (this.done) return;
    const g = this.g, me = g.me, B = g.ball.p;
    // el balón no se va: vuelve contigo
    if ((Math.abs(B.x) > F.HL + 1.5 || Math.abs(B.z) > F.HW + 1.5) && this.id !== 'dianas') { g.owner = null; g.ball.set(me.x + 0.6, me.z); }
    if (this.id === 'conos') {
      if (!this.go && (hyp(me.vx, me.vz) > 0.5)) { this.go = true; this.t = 0; }
      if (this.go) this.t += dt;
      for (const c of this.cones) if (!c.done && this.prevX < c.x && B.x >= c.x) {
        c.done = true; const ok = Math.sign(B.z - 0) === c.side;
        if (!ok) { this.pen += 2; this.v.hud.say('Cono saltado: +2 s', 1200); } else this.v.audio.touch();
      }
      this.prevX = B.x;
      if (B.x >= 14 * this.k && g.owner === me) this.finish(this.time() <= this.D.target, `${this.time().toFixed(1)} s`, [['', 'Tiempo', this.time().toFixed(1) + ' s'], ['', 'Penalización', this.pen + ' s'], ['', 'Objetivo', this.D.target + ' s']], 'conos', this.time());
    } else if (this.id === 'dianas') {
      if (!this.shot && g.lastKick?.kind === 'shot' && g.lastKick.t > (this.kickT || -1)) { this.shot = { t: 0 }; this.kickT = g.lastKick.t; }
      if (this.shot) {
        this.shot.t += dt;
        const pl = F.HL - 0.05, P0 = g.ball.prev;
        if (!this.shot.res && P0.x < pl && B.x >= pl) {
          const hit = this.targets.find(T => hyp(B.y - T.y, B.z - T.z) < 0.58);
          this.shot.res = hit ? 'hit' : (Math.abs(B.z) < F.goalW / 2 && B.y < F.goalH ? 'goal' : 'miss');
          if (hit) { this.hits++; this.v.hud.msg('¡Diana!', `${this.hits} de ${this.D.shots}`, 1200); this.v.audio.roar(); hit.m.material.emissiveIntensity = 2; setTimeout(() => { hit.m.material.emissiveIntensity = 0.6; }, 600); }
          else this.v.hud.say(this.shot.res === 'goal' ? 'Gol, pero lejos de la diana' : 'Fuera', 1100);
        }
        if (this.shot.t > 2.6 || (this.shot.t > 0.9 && g.ball.speed < 0.3)) {
          this.n++;
          if (this.n >= this.D.shots) return this.finish(this.hits >= this.D.target, `${this.hits} dianas`, [['', 'Dianas', `${this.hits} de ${this.D.shots}`], ['', 'Objetivo', `${this.D.target}`]], 'dianas', this.hits);
          this.place(me);
        }
      }
    } else {
      this.t += dt;
      for (const m of this.mates) {
        m.a += dt * m.w; const tx = m.cx + Math.cos(m.a) * m.r, tz = m.cz + Math.sin(m.a) * m.r * 0.7;
        if (g.owner !== m.p) { const dx = tx - m.p.x, dz = tz - m.p.z, d = hyp(dx, dz) || 1, v = Math.min(4.5, d * 2); m.p.wx = dx / d * v; m.p.wz = dz / d * v; m.p.face = { x: B.x, z: B.z }; }
        else { m.p.wx = m.p.wz = 0; }
        // con un pase en camino, el compañero va a por el balón
        if (g.passTo === m.p) { const q = g.interceptPoint(m.p); const dx = q.x - m.p.x, dz = q.z - m.p.z, d = hyp(dx, dz) || 1; m.p.wx = dx / d * Math.min(5, d * 3); m.p.wz = dz / d * Math.min(5, d * 3); }
      }
      if (g.owner && g.owner !== me && this.mates.some(m => m.p === g.owner)) {
        if (!this.got) { this.got = g.owner; this.n++; this.back = 0.7; this.v.hud.say(`¡Buen pase! ${this.n}`, 900); this.v.audio.touch(); }
        if ((this.back -= dt) <= 0) { g.passBall(g.owner, me, false, 0); this.got = null; }
      }
      if (this.t >= this.D.time) this.finish(this.n >= this.D.target, `${this.n} pases`, [['', 'Pases buenos', `${this.n}`], ['', 'Objetivo', `${this.D.target}`]], 'pases', this.n);
    }
  }
  finish(win, score, rows, id, value) {
    if (this.done) return; this.done = true; this.v.hud.tip(null);
    this.v.audio.whistle(3); if (win) this.v.audio.roar();
    this.g.result = { win, reto: id, value, score };
    this.g.setPhase('end');
    this.v.onRetoEnd({ win, reto: id, value, title: win ? '¡Reto superado!' : 'Casi…', score, rows });
  }
  cam(pos, look, fov) {
    const g = this.g, B = g.ball.p;
    if (this.id === 'dianas') { const k = F.areaD ? 0.55 : 1; return { pos: new THREE.Vector3(F.HL - 27 * k, 4.8 * Math.max(k, 0.7), B.z * 0.4 + 0.01), look: new THREE.Vector3(F.HL, 1.3, 0), fov: 36 }; }
    return { pos, look, fov };
  }
  dispose() { for (const o of this.objs) { this.v.scene?.remove(o); o.geometry?.dispose(); o.material?.dispose?.(); } }
}
