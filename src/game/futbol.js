// Partido en El Sadar: el jugador (con la camiseta de Osasuna) y un compañero contra dos rivales, cada equipo con su
// portero. Se juega en el césped de verdad del estadio, con el control normal: al acercarte al balón lo conduces y
// con ACCIÓN chutas (hacia la portería si miras hacia ella) o pasas. Gana quien marque 3 goles o vaya por delante
// cuando acabe el tiempo (2 minutos). Las gradas se llenan de público rojillo.
import * as THREE from 'three';
import { buildNpc } from '../actors/npcGlb.js';
import { groundHeight } from '../world/heightfield.js';
import { infoCard } from '../ui/minigames.js';

const HX = 22.8, HZ = 36, GW = 3.5, GH = 2.44, BR = 0.2;     // medio campo (m), media portería, altura del larguero, radio del balón
const WALLX = 24.6, WALLZ = 37.6;                              // vallas de publicidad: el balón rebota en ellas
const TIME = 120, WIN = 3;
const FACTS = [
  { title: 'Osasuna', text: 'El Club Atlético Osasuna se fundó en Pamplona en 1920. «Osasuna» significa «salud» y también «fuerza» en euskera. A sus jugadores les llaman «los rojillos» por su camiseta roja.' },
  { title: 'El Sadar', text: 'El estadio se inauguró en 1967 y toma el nombre del río Sadar, que pasa muy cerca. Se renovó entre 2019 y 2021: caben unas 23.500 personas y las gradas están muy pegadas al césped, por eso el ruido de la afición es famoso.' },
  { title: 'Juego limpio', text: 'En el fútbol se gana y se pierde: lo importante es jugar en equipo, pasar el balón y respetar al rival y al árbitro. ¡Y dar la mano al acabar!' },
];
const KIT = {
  home: { shirt: '#c41f2c', pants: '#1f2d5a', socks: '#c41f2c', shoes: '#1d1d1f' },
  away: { shirt: '#f4f4f2', pants: '#2f6fd0', socks: '#f4f4f2', shoes: '#1d1d1f' },
  keepH: { shirt: '#2fa84f', pants: '#1d1d1f', socks: '#2fa84f', shoes: '#1d1d1f' },
  keepA: { shirt: '#f2c230', pants: '#1d1d1f', socks: '#f2c230', shoes: '#1d1d1f' },
};
const HAIR = ['#2a1a12', '#5a3a22', '#c9a46a', '#1d1d24', '#7a3a1a'], SKIN = ['#f1c4a0', '#e2b08a', '#c68a5e', '#8d5a3a'];

function ballTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#fafafa'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#1a1a1a';
  for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) { const cx = x * 44 + (y % 2) * 22 + 10, cy = y * 34 + 14; g.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 - Math.PI / 2; g.lineTo(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9); } g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class Futbol {
  constructor(G, lm) { this.G = G; this.cx = lm.x; this.cz = lm.z; }
  // del campo (x a lo ancho, z a lo largo; atacamos hacia +z) al mundo
  W(x, z) { return { x: this.cx + x, z: this.cz + z }; }
  gy(x, z) { const w = this.W(x, z); return groundHeight(w.x, w.z); }

  run() {
    const G = this.G;
    return new Promise(async (res) => {
      this.res = res;
      try {
        await G.ui.fadeOut?.();
        this.setup();
        G.mode = 'futbol'; G.player.frozen = false;
        await G.ui.fadeIn?.();
        this.msg('¡Saque inicial! Acércate al balón para llevarlo y pulsa ACCIÓN para chutar.', 3200);
        G.sound.fanfare?.();
      } catch (e) { console.error('[fútbol]', e); this.cleanup(); res({ win: false, you: 0, cpu: 0, quit: true }); }
    });
  }

  setup() {
    const G = this.G, S = G.scene;
    this.root = new THREE.Group(); S.add(this.root);
    // balón
    this.ballTex = ballTex();
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(BR, 20, 14), new THREE.MeshStandardMaterial({ map: this.ballTex, roughness: 0.5 }));
    this.ball.castShadow = true; this.root.add(this.ball);
    this.b = { x: 0, y: BR, z: 0, vx: 0, vy: 0, vz: 0, owner: null, last: null };
    // jugadores: el compañero, dos rivales y los porteros
    const npc = (kit, i, female) => { const n = buildNpc({ ...kit, female, ponytail: female, hair: HAIR[i % HAIR.length], skin: SKIN[i % SKIN.length], height: 1.45 + (i % 3) * 0.06 }); this.root.add(n.obj); return n; };
    const R = Math.random;
    this.team = [
      { ...npc(KIT.home, 1, R() < 0.4), side: 'home', role: 'field', name: 'Compañero', x: -6, z: -8, speed: 6.0 },
      { ...npc(KIT.away, 2, R() < 0.4), side: 'away', role: 'field', name: 'Rival', x: 5, z: 8, speed: 6.3 },
      { ...npc(KIT.away, 3, R() < 0.4), side: 'away', role: 'field', name: 'Rival', x: -5, z: 14, speed: 5.8 },
      { ...npc(KIT.keepH, 4, false), side: 'home', role: 'keeper', x: 0, z: -HZ + 0.8, speed: 4.2, save: 0.6 },
      { ...npc(KIT.keepA, 0, false), side: 'away', role: 'keeper', x: 0, z: HZ - 0.8, speed: 4.0, save: 0.52 },
    ];
    for (const p of this.team) { p.vx = 0; p.vz = 0; p.h = p.side === 'home' ? 0 : Math.PI; p.kickT = 0; }
    this.crowd = this.makeCrowd();
    this.hud();
    this.score = { home: 0, away: 0 }; this.t = TIME; this.pause = 0; this.done = false; this.crowdT = 0;
    this.kickoff('home');
    // cámara un poco más alta para ver el campo
    this.camPrev = { dist: G.follow.dist };
    if (G.follow.dist != null) G.follow.dist = Math.max(G.follow.dist, 7.5);
  }

  // público en las gradas: figuras sencillas rojas y blancas (una sola llamada de dibujo)
  makeCrowd() {
    const col = (geo, c, m) => { const g = geo.toNonIndexed(); if (m) g.applyMatrix4(m); const k = new THREE.Color(c), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) k.toArray(a, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); return g; };
    const parts = [col(new THREE.CylinderGeometry(0.2, 0.22, 0.6, 7), '#ffffff', new THREE.Matrix4().makeTranslation(0, 0.3, 0)), col(new THREE.SphereGeometry(0.15, 8, 6), '#e2b08a', new THREE.Matrix4().makeTranslation(0, 0.75, 0))];
    const geo = new THREE.BufferGeometry();
    { const pos = [], c = []; for (const p of parts) { pos.push(...p.attributes.position.array); c.push(...p.attributes.color.array); } geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); geo.computeVertexNormals(); }
    const spots = [], SX = 27, SZ = 40, run = 0.75, rise = 0.48;
    for (let k = 1; k < 18; k += 2) {
      const h = 1 + (k + 1) * rise - 0.5;
      for (let z = -54; z <= 54; z += 1.4) for (const s of [-1, 1]) { if (s < 0 && Math.abs(z) < 4.5) continue; if (Math.random() < 0.75) spots.push([s * (SX + k * run + run / 2), h, z, s > 0 ? -Math.PI / 2 : Math.PI / 2]); }
      for (let x = -25; x <= 25; x += 1.4) for (const s of [-1, 1]) if (Math.random() < 0.75) spots.push([x, h, s * (SZ + k * run + run / 2), s > 0 ? Math.PI : 0]);
    }
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    const im = new THREE.InstancedMesh(geo, mat, spots.length), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), shirt = new THREE.Color();
    const base = this.gy(0, 0) - 0.05;
    spots.forEach(([x, y, z, ry], i) => {
      im.setMatrixAt(i, m.compose(new THREE.Vector3(this.cx + x, base + y, this.cz + z), q.setFromEuler(e.set(0, ry, 0)), one));
      im.setColorAt(i, shirt.set(Math.random() < 0.7 ? '#c41f2c' : Math.random() < 0.5 ? '#ffffff' : '#1f2d5a'));
    });
    im.frustumCulled = false; this.root.add(im); this.crowdY = 0; return im;
  }

  hud() {
    const h = this.h = document.createElement('div'); h.className = 'fut-hud';
    h.innerHTML = `<div class="fut-board"><b class="fut-home">OSASUNA</b><span class="fut-score">0 - 0</span><b class="fut-away">VISITANTE</b><i class="fut-time">2:00</i></div><div class="fut-msg"></div>
      <div class="fut-help">${this.G.input.touch ? 'Mueve el dedo para correr · ACCIÓN para chutar' : 'WASD para correr · E o Espacio para chutar'}</div><button class="fut-quit" aria-label="Salir del partido">Salir</button>`;
    document.body.appendChild(h); document.body.classList.add('futbol');
    h.querySelector('.fut-quit').addEventListener('click', () => this.finish(true));
  }
  msg(t, ms = 1800) { const m = this.h?.querySelector('.fut-msg'); if (!m) return; m.textContent = t; m.classList.add('on'); clearTimeout(this.mt); this.mt = setTimeout(() => m.classList.remove('on'), ms); }

  // saque desde el centro: todos a su campo
  kickoff(side) {
    const G = this.G, P = G.player;
    Object.assign(this.b, { x: 0, y: BR, z: 0, vx: 0, vy: 0, vz: 0, owner: null, last: null });
    const w = this.W(0, side === 'home' ? -1.2 : -9); P.place(w.x, w.z, 0); G.follow.snap?.(P);
    const pos = { home: [[-7, -9]], away: side === 'away' ? [[0, 1.2], [-6, 9]] : [[5, 9], [-5, 14]] };
    if (side === 'away') pos.home = [[-7, -9]];
    let ih = 0, ia = 0;
    for (const p of this.team) {
      if (p.role === 'keeper') { p.x = 0; p.z = p.side === 'home' ? -HZ + 0.8 : HZ - 0.8; }
      else if (p.side === 'home') { [p.x, p.z] = pos.home[ih++]; }
      else { [p.x, p.z] = pos.away[ia++]; }
      p.vx = p.vz = 0; p.h = p.side === 'home' ? 0 : Math.PI;
    }
    this.pause = 1.2;
  }

  // posición del jugador en coordenadas del campo
  me() { const P = this.G.player.pos; return { x: P.x - this.cx, z: P.z - this.cz }; }

  update(dt) {
    if (this.done) return;
    dt = Math.min(dt, 0.1); this.dt = dt;
    const G = this.G, P = G.player, b = this.b;
    // el jugador no sale del césped
    P.pos.x = Math.max(this.cx - HX - 1, Math.min(this.cx + HX + 1, P.pos.x)); P.pos.z = Math.max(this.cz - HZ - 0.5, Math.min(this.cz + HZ + 0.5, P.pos.z));
    const me = this.me(), mh = P.heading;
    G.ui.setPrompt?.(Math.hypot(b.x - me.x, b.z - me.z) < 1.8 ? (this.facingGoal(me, mh) ? 'Chutar' : 'Pasar') : null);
    if (this.pause > 0) { this.pause -= dt; if (this.pause <= 0 && this.nextKick) { const k = this.nextKick; this.nextKick = null; this.kickoff(k); } this.place(dt); return; }
    this.t -= dt;
    this.h.querySelector('.fut-time').textContent = `${Math.floor(Math.max(0, this.t) / 60)}:${String(Math.floor(Math.max(0, this.t) % 60)).padStart(2, '0')}`;
    if (this.t <= 0) return this.finish(false);
    // ---- el jugador: conduce el balón al tocarlo y chuta con ACCIÓN
    const dMe = Math.hypot(b.x - me.x, b.z - me.z);
    const kick = G.input.consume('e') || G.input.consume(' ');
    if (kick && dMe < 1.8) this.playerKick(me, mh);
    else if (dMe < 0.85 && b.y < 0.6 && (b.owner === null || b.owner === 'me' || this.steal('me'))) b.owner = 'me';
    if (b.owner === 'me') {
      if (dMe > 1.6) b.owner = null;
      else { const sp = P.speed ?? Math.hypot(P.vel?.x || 0, P.vel?.z || 0); const ahead = 0.55 + Math.min(0.25, sp * 0.04); b.x += (me.x + Math.sin(mh) * ahead - b.x) * Math.min(1, dt * 12); b.z += (me.z + Math.cos(mh) * ahead - b.z) * Math.min(1, dt * 12); b.vx = Math.sin(mh) * sp; b.vz = Math.cos(mh) * sp; b.last = 'home'; }
    }
    // ---- los demás
    for (const p of this.team) p.role === 'keeper' ? this.keeper(p, dt) : this.fieldAI(p, dt, me);
    // ---- balón libre: física sencilla
    if (b.owner === null) this.ballPhysics(dt);
    else if (b.owner !== 'me') { const o = b.owner; b.x = o.x + Math.sin(o.h) * 0.6; b.z = o.z + Math.cos(o.h) * 0.6; b.y = BR; b.vx = Math.sin(o.h) * o.speed * 0.8; b.vz = Math.cos(o.h) * o.speed * 0.8; }
    // ---- gol
    if (Math.abs(b.x) < GW && b.y < GH && Math.abs(b.z) > HZ + 0.15) return this.goal(b.z > 0 ? 'home' : 'away');
    // ---- ambiente: murmullo del público y cámara
    this.crowdT -= dt; if (this.crowdT <= 0) { this.crowdT = 1.1; G.sound.crowd?.(0.25 + (Math.abs(b.z) > HZ - 14 ? 0.3 : 0)); }
    this.place(dt);
  }
  facingGoal(me, h) { const gx = 0 - me.x, gz = HZ - me.z, L = Math.hypot(gx, gz) || 1; return (Math.sin(h) * gx + Math.cos(h) * gz) / L > 0.35 && me.z > -6; }
  playerKick(me, h) {
    const b = this.b, G = this.G; b.owner = null; b.last = 'home';
    G.player.rig.doAct?.('hit', 0.4); G.sound.pelota?.(0.8);
    if (this.facingGoal(me, h)) {
      // a puerta: apunta al punto de la línea de gol hacia el que mira, sin salirse de los postes (casi)
      const t = (HZ - me.z) / Math.max(0.2, Math.cos(h)), tx = Math.max(-GW + 0.4, Math.min(GW - 0.4, me.x + Math.sin(h) * t + (Math.random() - 0.5) * 1.2));
      const dx = tx - b.x, dz = HZ + 1 - b.z, L = Math.hypot(dx, dz), v = 19;
      Object.assign(b, { vx: dx / L * v, vz: dz / L * v, vy: 2.2 + Math.random() * 2.2 });
    } else {
      // pase: si el compañero está por delante, al compañero; si no, hacia donde mira
      const mate = this.team.find(p => p.side === 'home' && p.role === 'field'), dx = mate.x - b.x, dz = mate.z - b.z, L = Math.hypot(dx, dz) || 1;
      const toMate = (Math.sin(h) * dx + Math.cos(h) * dz) / L > 0.5;
      const [ux, uz] = toMate ? [dx / L, dz / L] : [Math.sin(h), Math.cos(h)], v = toMate ? Math.min(15, 6 + L * 0.7) : 13;
      Object.assign(b, { vx: ux * v, vz: uz * v, vy: 0.6 });
    }
  }
  // robar el balón al que lo lleva: más fácil para los rivales cuanto más rato lo tenga el niño (pero nunca de golpe)
  steal(who) { const b = this.b; if (b.owner === null || b.owner === who) return true; const rate = who === 'me' ? 4 : b.owner === 'me' ? 1.6 : 1.2; return Math.random() < 1 - Math.exp(-rate * this.dt); }

  fieldAI(p, dt, me) {
    const b = this.b, own = b.owner === p, mateHas = (b.owner === 'me' && p.side === 'home') || (b.owner && b.owner !== 'me' && b.owner.side === p.side && b.owner !== p);
    let tx, tz, sp = p.speed;
    const attack = p.side === 'home' ? 1 : -1;
    if (own) {
      // lleva el balón hacia la portería contraria y chuta al acercarse (o pasa si tiene a alguien encima)
      tx = (p.side === 'home' ? 0 : 0) + Math.sin(this.t + p.x) * 3; tz = attack * HZ;
      const near = (p.side === 'home' ? this.team.filter(q => q.side === 'away') : [{ x: me.x, z: me.z }, ...this.team.filter(q => q.side === 'home' && q.role === 'field')]).some(q => Math.hypot(q.x - p.x, q.z - p.z) < 1.6);
      if ((attack * p.z > HZ - 15) || (near && Math.random() < dt * 1.2)) {
        const shoot = attack * p.z > HZ - 18;
        let ux, uz, v;
        if (shoot) { const gx = (Math.random() - 0.5) * GW * 1.8 - p.x, gz = attack * (HZ + 1) - p.z, L = Math.hypot(gx, gz); ux = gx / L; uz = gz / L; v = p.side === 'away' ? 15 : 17; }
        else { const t = p.side === 'home' ? me : this.team.find(q => q.side === p.side && q.role === 'field' && q !== p); const gx = t.x - p.x, gz = t.z - p.z, L = Math.hypot(gx, gz) || 1; ux = gx / L; uz = gz / L; v = Math.min(14, 6 + L * 0.7); }
        b.owner = null; b.last = p.side; Object.assign(b, { vx: ux * v, vz: uz * v, vy: shoot ? 1.5 + Math.random() * 2 : 0.5 });
        p.kickT = 0.4; p.char.playOnce?.('Hit', 0.4); this.G.sound.pelota?.(0.6);
      }
      sp *= 0.85;
    } else if (mateHas) {
      // su equipo tiene el balón: se desmarca por delante, a un lado
      const o = b.owner === 'me' ? me : b.owner; tx = Math.max(-HX + 3, Math.min(HX - 3, o.x + (o.x > 0 ? -9 : 9))); tz = Math.max(-HZ + 6, Math.min(HZ - 6, o.z + attack * 9)); sp *= 0.75;
    } else {
      // a por el balón: el más cercano de cada equipo presiona; el otro se queda entre el balón y su portería
      const mates = this.team.filter(q => q.side === p.side && q.role === 'field');
      const dists = mates.map(q => Math.hypot(q.x - b.x, q.z - b.z)), presser = mates[dists.indexOf(Math.min(...dists))];
      const slow = p.side === 'away' && b.owner === 'me' ? 0.92 : 1;     // al niño no le persiguen a toda velocidad
      if (presser === p || p.side === 'home') { tx = b.x + b.vx * 0.25; tz = b.z + b.vz * 0.25; sp *= slow; }
      else { tx = b.x * 0.5; tz = (b.z - attack * HZ) * 0.5 - attack * HZ * 0.5 + attack * 4; sp *= 0.7; }
      if (Math.hypot(b.x - p.x, b.z - p.z) < 0.8 && b.y < 0.7 && this.steal(p)) { b.owner = p; if (b.last !== p.side) this.msg(p.side === 'home' ? '¡Tu compañero tiene el balón!' : '¡Te han robado el balón!', 1200); }
    }
    this.moveTo(p, tx, tz, sp, dt);
  }
  keeper(p, dt) {
    const b = this.b, gz = p.side === 'home' ? -HZ + 0.8 : HZ - 0.8, dir = Math.sign(gz);
    const tx = Math.max(-GW + 0.5, Math.min(GW - 0.5, b.x * 0.55));
    this.moveTo(p, tx, gz, p.speed, dt, true);
    p.h = dir > 0 ? Math.PI : 0;
    // parada: el balón va hacia su portería y pasa cerca
    const coming = Math.sign(b.vz) === dir && Math.abs(b.z - gz) < 1.4 && b.owner === null && Math.abs(b.x) < GW + 0.3;
    if (coming && !p.tried) {
      p.tried = true;
      if (Math.abs(b.x - p.x) < 1.9 && b.y < 2.2 && Math.random() < p.save) {
        Object.assign(b, { vz: -b.vz * 0.35, vx: (Math.random() - 0.5) * 6, vy: 2.5, last: p.side });
        p.char.playOnce?.('Celebrate', 0.6); this.msg(p.side === 'away' ? '¡Paradón del portero!' : '¡Ha parado tu portero!', 1400);
      }
    }
    if (Math.abs(b.z - gz) > 4) p.tried = false;
    // si el balón se queda parado en el área, lo saca
    if (b.owner === null && Math.hypot(b.x - p.x, b.z - p.z) < 0.9 && Math.hypot(b.vx, b.vz) < 3) {
      const mate = this.team.find(q => q.side === p.side && q.role === 'field'), dx = mate.x - b.x, dz = mate.z - b.z, L = Math.hypot(dx, dz) || 1;
      Object.assign(b, { vx: dx / L * 14, vz: dz / L * 14, vy: 4, last: p.side }); p.char.playOnce?.('Hit', 0.4);
    }
  }
  moveTo(p, tx, tz, sp, dt, side = false) {
    const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    const want = d < 0.3 ? 0 : Math.min(sp, d * 3);
    const ux = d > 1e-3 ? dx / d : 0, uz = d > 1e-3 ? dz / d : 0;
    p.vx += (ux * want - p.vx) * Math.min(1, dt * 5); p.vz += (uz * want - p.vz) * Math.min(1, dt * 5);
    p.x = Math.max(-HX - 0.5, Math.min(HX + 0.5, p.x + p.vx * dt)); p.z = Math.max(-HZ - 0.3, Math.min(HZ + 0.3, p.z + p.vz * dt));
    const v = Math.hypot(p.vx, p.vz); if (!side && v > 0.3) p.h = Math.atan2(p.vx, p.vz);
    p.cur = v;
  }
  ballPhysics(dt) {
    const b = this.b;
    b.vy -= 9.8 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.y < BR) { b.y = BR; if (b.vy < -1.2) b.vy = -b.vy * 0.45; else b.vy = 0; }
    if (b.y <= BR + 0.01) { const f = Math.exp(-1.1 * dt); b.vx *= f; b.vz *= f; }
    if (Math.abs(b.x) > WALLX) { b.x = Math.sign(b.x) * WALLX; b.vx *= -0.55; }
    // fondo: rebota en la valla salvo por la boca de la portería; postes y larguero
    const inMouth = Math.abs(b.x) < GW && b.y < GH;
    if (!inMouth && Math.abs(b.z) > WALLZ) { b.z = Math.sign(b.z) * WALLZ; b.vz *= -0.55; }
    if (Math.abs(Math.abs(b.z) - HZ) < 0.3 && Math.abs(Math.abs(b.x) - GW) < 0.25 && b.y < GH) { b.vz *= -0.6; b.vx *= -0.4; this.G.sound.pelota?.(0.4); }
  }
  goal(side) {
    const G = this.G; this.score[side]++;
    this.h.querySelector('.fut-score').textContent = `${this.score.home} - ${this.score.away}`;
    const w = this.W(this.b.x, this.b.z), y = this.gy(this.b.x, this.b.z) + 1.2;
    if (side === 'home') {
      this.msg(this.b.last === 'home' ? '¡GOOOL! ¡Gol de Osasuna!' : '¡Gol!', 2200); G.sound.fanfare?.(); G.sound.crowd?.(1.4);
      G.particles?.confetti?.({ x: w.x, y, z: w.z }, 120); G.player.rig.doCheer?.(); this.cheer = 2;
    } else { this.msg('Gol del equipo visitante. ¡Ánimo, a por el empate!', 2200); G.sound.ui?.('error'); }
    for (const p of this.team) if (p.side === side) p.char.playOnce?.('Celebrate', 1.4);
    if (this.score[side] >= WIN) { this.pause = 99; this.nextKick = null; setTimeout(() => this.finish(false), 1800); return; }
    // celebración y, al acabar la pausa (en tiempo de juego), saque del equipo que ha encajado
    this.b.owner = null; this.b.vx = this.b.vz = this.b.vy = 0; this.pause = 2.2; this.nextKick = side === 'home' ? 'away' : 'home';
  }
  place(dt) {
    const b = this.b, w = this.W(b.x, b.z);
    this.ball.position.set(w.x, this.gy(b.x, b.z) + b.y, w.z);
    const v = Math.hypot(b.vx, b.vz); if (v > 0.05) { this.ball.rotation.x += (b.vz / BR) * dt; this.ball.rotation.z -= (b.vx / BR) * dt; }
    for (const p of this.team) {
      const q = this.W(p.x, p.z); p.obj.position.set(q.x, this.gy(p.x, p.z), q.z); p.obj.rotation.y = p.h;
      p.anim.update(dt, { speed: p.cur || 0 });
    }
    // el público salta con los goles
    this.cheer = Math.max(0, (this.cheer || 0) - dt);
    this.crowd.position.y = this.cheer > 0 ? Math.abs(Math.sin(this.cheer * 9)) * 0.25 : 0;
  }

  async finish(quit) {
    if (this.done) return; this.done = true;
    const G = this.G, s = this.score, win = !quit && s.home > s.away;
    G.ui.setPrompt?.(null);
    if (!quit) { this.msg(win ? '¡Victoria rojilla!' : s.home === s.away ? '¡Empate!' : 'Esta vez ha ganado el visitante', 2400); if (win) G.sound.fanfare?.(); await new Promise(r => setTimeout(r, 1800)); }
    if (this.h) this.h.style.display = 'none';
    try { if (!quit) for (const f of (win ? FACTS : FACTS.slice(-1))) await infoCard(G.ui, { icon: 'star', kicker: 'El Sadar', title: f.title, text: f.text, button: 'Seguir' }); }
    finally { await G.ui.fadeOut?.(); this.cleanup(); await G.ui.fadeIn?.(); this.res({ win, you: s.home, cpu: s.away, quit }); }
  }
  cleanup() {
    const G = this.G;
    this.h?.remove(); clearTimeout(this.mt); document.body.classList.remove('futbol');
    if (this.root) {
      G.scene.remove(this.root);
      this.ball?.geometry.dispose(); this.ball?.material.dispose(); this.crowd?.geometry.dispose(); this.ballTex?.dispose(); this.crowd?.material.dispose(); this.crowd?.dispose?.();
      for (const p of this.team || []) p.char?.dispose?.();
    }
    if (this.camPrev && G.follow.dist != null) G.follow.dist = this.camPrev.dist;
    G.mode = 'play'; G.player.frozen = false; G.futbol = null;
    // el jugador sale por el túnel, junto al entrenador
    const w = this.W(-16.5, 3); G.player.place(w.x, w.z, -Math.PI / 2); G.follow.snap?.(G.player);
  }
}
