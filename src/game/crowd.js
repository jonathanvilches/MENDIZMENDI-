// Público del frontón: al empezar un partido se acercan vecinos a las gradas, siguen la pelota con la mirada,
// aplauden cada tanto (y saltan de alegría con los tuyos) y, al terminar, se marchan.
import * as THREE from 'three';
import { Actor } from '../actors/people.js';
import { isFree } from '../world/colliders.js';
import { waterLevelAt, terrainHeight } from '../world/heightfield.js';
import { COURT } from '../pelota/rules.js';

const SKINS = ['#f1c7a5', '#eab89a', '#e2b08a', '#d9a57f', '#c98f6b', '#f3d2b8', '#a8755a'];
const HAIRS = ['#2a1a12', '#3b2418', '#6b4a2e', '#a0522d', '#1a1a1a', '#dcd7cf', '#e2c46a'];
const SHIRTS = ['#f2ede3', '#c8222a', '#2f5fb3', '#3e6b48', '#e0b23a', '#7a3b6b', '#f6f3ec', '#4a4f5a'];
const PANTS = ['#2b3a6b', '#3a3530', '#4a4f5a', '#6b5a45', '#1d1d24', '#f6f3ec'];
const NAMES = ['Maite', 'Josu', 'Amaia', 'Patxi', 'Nekane', 'Koldo', 'Itziar', 'Mikel', 'Leire', 'Fermín', 'Ane', 'Iñigo'];

export class Crowd {
  constructor(G, fronton, n = 9) {
    this.G = G; this.f = fronton; this.people = []; this.t = 0; this.leaving = false;
    const W = COURT.W, L = COURT.L, CONTRA = 2.6, rnd = Math.random;
    // asientos en los tres escalones de la grada (lado de la contracancha), separados entre sí
    const seats = [];
    for (let tries = 0; seats.length < n && tries < 200; tries++) {
      const i = (rnd() * 3) | 0, z = L * 0.16 + rnd() * L * 0.72;
      if (seats.some(s => s.i === i && Math.abs(s.z - z) < 1.3)) continue;
      seats.push({ i, z, x: W / 2 + CONTRA + 0.55 + i * 1.1, y: 0.42 * (i + 1) });
    }
    const ry = fronton.spot.ry;
    seats.forEach((s, k) => {
      const seat = fronton.toWorld(s.x, s.z); seat.y = fronton.spot.y + s.y;
      const near = fronton.toWorld(W / 2 + CONTRA + 3.3 + 1.1, s.z);
      // llegan desde el pueblo, a unos 15–30 m de la grada
      let start = null;
      for (let q = 0; q < 12 && !start; q++) {
        const p = fronton.toWorld(W / 2 + CONTRA + 12 + rnd() * 18, s.z + (rnd() - 0.5) * 30);
        if (isFree(p.x, p.z, 0.6) && waterLevelAt(p.x, p.z) < terrainHeight(p.x, p.z) - 0.2) start = p;
      }
      start = start || near;
      const female = rnd() < 0.5, old = rnd() < 0.25, kid = !old && rnd() < 0.3;
      const pick = (a) => a[(rnd() * a.length) | 0];
      const look = { skin: pick(SKINS), hair: old ? '#dcd7cf' : pick(HAIRS), shirt: pick(SHIRTS), pants: pick(PANTS), old, female,
        height: kid ? 1.25 : undefined, ponytail: female && rnd() < 0.4, longHair: female && rnd() < 0.3,
        scarf: rnd() < 0.3 ? pick(['#c8222a', '#2f5fb3']) : undefined, txapela: !female && old && rnd() < 0.7 ? '#1d1d24' : undefined };
      const a = new Actor({ id: 'pub' + k, name: NAMES[k % NAMES.length], x: start.x, z: start.z, look, walkSpeed: 1.5 + rnd() * 0.5, heading: Math.atan2(near.x - start.x, near.z - start.z) }, G.scene);
      a.collider.ghost = true; a.ignorePlayer = true;
      a.target = { x: near.x, z: near.z }; a.state = 'walk'; a.wait = 99;
      this.people.push({ a, seat, near, start, phase: 'walk', t: 0, delay: k * 0.35 + rnd() * 0.6, face: ry - Math.PI / 2 });
    });
  }
  // la pelota (en coordenadas del mundo) para que la sigan con la mirada
  ballWorld() { const b = this.f.court.ball; if (!b.visible) return null; const v = b.position.clone(); this.f.court.group.localToWorld(v); return v; }
  update(dt) {
    this.t += dt;
    const ball = this.ballWorld(), P = this.G.player;
    for (const p of this.people) {
      const a = p.a; p.t += dt;
      if (p.phase === 'walk') {
        if (p.t < p.delay) { a.animate(dt); a.sync(); continue; }
        a.state = 'walk'; a.target = { x: p.near.x, z: p.near.z };
        a.update(dt, P);
        const d = Math.hypot(a.pos.x - p.near.x, a.pos.z - p.near.z);
        if (d < 0.6 || p.t > 14) { p.phase = 'climb'; p.t = 0; p.from = a.pos.clone(); }
      } else if (p.phase === 'climb') {
        // sube a su escalón de un par de pasos
        const k = Math.min(1, p.t / 0.8);
        a.pos.lerpVectors(p.from, p.seat, k); a.pos.y += Math.sin(k * Math.PI) * 0.25;
        a.heading = Math.atan2(p.seat.x - p.from.x, p.seat.z - p.from.z);
        a.speed = 1.2 * (1 - k); a.animate(dt); a.sync();
        if (k >= 1) { p.phase = 'watch'; a.speed = 0; }
      } else if (p.phase === 'watch') {
        // de cara a la cancha, girando la cabeza (y un poco el cuerpo) hacia la pelota
        a.pos.copy(p.seat);
        let want = p.face;
        if (ball) want = p.face + Math.max(-0.5, Math.min(0.5, Math.atan2(ball.x - a.pos.x, ball.z - a.pos.z) - p.face)) * 0.5;
        a.heading += (want - a.heading) * Math.min(1, dt * 3);
        a.lookAt = ball || null;
        a.animate(dt); a.sync();
      } else if (p.phase === 'leave') {
        if (p.t < p.delay) { a.pos.copy(p.seat); a.animate(dt); a.sync(); continue; }
        if (!p.down) { p.down = true; a.pos.set(p.near.x, terrainHeight(p.near.x, p.near.z), p.near.z); }
        a.state = 'walk'; a.target = { x: p.start.x, z: p.start.z };
        a.update(dt, P);
        if (Math.hypot(a.pos.x - p.start.x, a.pos.z - p.start.z) < 0.8 || p.t > 16) { p.phase = 'gone'; a.visible = false; a.sync(); }
      }
    }
    if (this.leaving && this.people.every(p => p.phase === 'gone')) this.dispose();
  }
  // tanto: aplauden todos; si es tuyo, algunos saltan de alegría
  point(yours) {
    for (const p of this.people) {
      if (p.phase !== 'watch') continue;
      if (yours && Math.random() < 0.45) p.a.cheer = 1.4 + Math.random() * 0.6;
      else p.a.clap = 1.4 + Math.random() * 0.8;
    }
  }
  end(win) {
    for (const p of this.people) { if (p.phase === 'watch') { if (win) p.a.cheer = 2; else p.a.clap = 1.6; } }
    this.leaving = true;
    this.people.forEach((p, k) => { if (p.phase === 'gone') return; p.phase = 'leave'; p.t = 0; p.down = false; p.delay = 2.2 + k * 0.4 + Math.random(); });
  }
  dispose() {
    if (this.disposed) return; this.disposed = true;
    for (const p of this.people) { this.G.scene.remove(p.a.obj); p.a.collider.x = p.a.collider.z = 1e6; }
    this.people = [];
  }
}
