// Partido en El Sadar: 3 contra 3 con porteros en el césped del estadio. El jugador viste la equipación de Osasuna
// (camiseta roja, pantalón azul marino, medias rojas) con su dorsal y juega con controles propios:
//   joystick o WASD para moverse (relativo a la cámara), PASE (J / Espacio), TIRO manteniendo para cargar
//   potencia (K / E), SPRINT (Mayús, gasta resistencia) y CÁMARA (C): televisión, detrás del jugador o aérea.
// Sin balón, PASE se convierte en ENTRADA para robarlo. Gana quien marque 3 goles o vaya por delante a los 3 minutos.
// Ambiente: entrada al campo con cámara aérea, público rojillo que salta, comentarista, cámara lenta en los goles y radar.
import * as THREE from 'three';
import { buildNpc } from '../actors/npcGlb.js';
import { GlbChar, loadMeshy, hasMeshy } from '../actors/glbChar.js';
import { crowd3d } from '../actors/crowd3d.js';
import { TOWN } from '../world/townBuilder.js';
import { groundHeight } from '../world/heightfield.js';
import { infoCard } from '../ui/minigames.js';

const HX = 22.8, HZ = 36, GW = 3.5, GH = 2.44, BR = 0.2;     // medio campo (m), media portería, larguero, radio del balón
const WALLX = 24.6, WALLZ = 37.6;
const TIME = 180, WIN = 3, JOG = 4.6, SPRINT = 7.2;
const FACTS = [
  { title: 'Osasuna', text: 'El Club Atlético Osasuna se fundó en Pamplona en 1920. «Osasuna» significa «salud» y también «fuerza» en euskera. A sus jugadores les llaman «los rojillos» por su camiseta roja.' },
  { title: 'El Sadar', text: 'El estadio se inauguró en 1967 y toma el nombre del río Sadar, que pasa muy cerca. Se renovó entre 2019 y 2021: caben unas 23.500 personas y las gradas están muy pegadas al césped, por eso el ruido de la afición es famoso.' },
  { title: 'Juego limpio', text: 'En el fútbol se gana y se pierde: lo importante es jugar en equipo, pasar el balón y respetar al rival y al árbitro. ¡Y dar la mano al acabar!' },
];
// equipación de casa de Osasuna: camiseta roja, pantalón azul marino y medias rojas; el rival, de blanco y azul
const KIT = {
  home: { shirt: '#c41f2c', vest: '#c41f2c', pants: '#16224a', socks: '#c41f2c', shoes: '#111114', sash: '#16224a', scarf: null },
  away: { shirt: '#f4f4f2', vest: '#f4f4f2', pants: '#2f6fd0', socks: '#f4f4f2', shoes: '#111114', sash: '#2f6fd0', scarf: null },
  keepH: { shirt: '#2fa84f', vest: '#2fa84f', pants: '#111114', socks: '#2fa84f', shoes: '#111114', sash: '#111114', scarf: null },
  keepA: { shirt: '#f2c230', vest: '#f2c230', pants: '#111114', socks: '#f2c230', shoes: '#111114', sash: '#111114', scarf: null },
};
const HAIR = ['#2a1a12', '#5a3a22', '#c9a46a', '#1d1d24', '#7a3a1a', '#3b2a1e', '#8a5a2a'], SKIN = ['#f1c4a0', '#e2b08a', '#c68a5e', '#8d5a3a', '#f3d2b8', '#a8755a'];
const BODIES = ['Knight', 'Ranger', 'Barbarian', 'Rogue', 'Ranger', 'Knight', 'Barbarian', 'Mage'];   // un cuerpo para cada jugador
const CAMS = ['tv', 'detras', 'aerea'], CAM_NAME = { tv: 'Vista de televisión', detras: 'Detrás del jugador', aerea: 'Vista aérea' };
const SAY = {
  steal: ['¡Qué robo!', '¡Balón recuperado!', '¡Buena entrada!'], save: ['¡Paradón!', '¡Qué manos tiene el portero!', '¡La saca con la punta de los dedos!'],
  post: ['¡Al palo!', '¡Uyyy, el poste!'], pass: ['¡Buen pase!', '¡Qué visión de juego!'], miss: ['¡Fuera por poco!', '¡Rozando el palo!'],
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function ballTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#fafafa'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#1a1a1a';
  for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) { const cx = x * 44 + (y % 2) * 22 + 10, cy = y * 34 + 14; g.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 - Math.PI / 2; g.lineTo(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9); } g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// dorsal en la espalda: número con borde
function dorsal(n, color = '#ffffff', edge = '#16224a') {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.font = '900 96px Nunito, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 10; g.strokeStyle = edge; g.strokeText(String(n), 64, 70); g.fillStyle = color; g.fillText(String(n), 64, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
}

export class Futbol {
  constructor(G, lm) { this.G = G; this.cx = lm.x; this.cz = lm.z; }
  W(x, z) { return { x: this.cx + x, z: this.cz + z }; }
  gy(x, z) { const w = this.W(x, z); return groundHeight(w.x, w.z); }

  run() {
    const G = this.G;
    return new Promise(async (res) => {
      this.res = res;
      try {
        await G.ui.fadeOut?.();
        await this.setup();
        G.mode = 'futbol'; G.player.frozen = true;
        await G.ui.fadeIn?.();
        this.intro = 3.2; this.say('¡Bienvenidos a El Sadar! Osasuna contra el equipo visitante…', 3000);
        G.sound.fanfare?.(); G.sound.crowd?.(1.2);
      } catch (e) { console.error('[fútbol]', e); this.cleanup(); res({ win: false, you: 0, cpu: 0, quit: true }); }
    });
  }

  async setup() {
    const G = this.G, S = G.scene;
    this.root = new THREE.Group(); S.add(this.root);
    // el perro espera sentado junto a la banda, mirando el partido
    this.dog = G.perro?.dog || null; if (this.dog) G.perro.wait({ x: this.cx - 23.5, z: this.cz + 6 }, { x: this.cx, z: this.cz });
    G.player.obj.visible = false;
    this.bf = G.fauna?.bfMesh; if (this.bf) { this.bfWas = this.bf.visible; this.bf.visible = false; }   // sin mariposas sobre el césped
    this.ballTex = ballTex();
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(BR, 20, 14), new THREE.MeshStandardMaterial({ map: this.ballTex, roughness: 0.5 }));
    this.ball.castShadow = true; this.root.add(this.ball);
    this.b = { x: 0, y: BR, z: 0, vx: 0, vy: 0, vz: 0, owner: null, last: null, lastP: null };
    // cada jugador distinto: su cuerpo, su piel, su pelo y su altura
    const npc = (kit, i, look = {}) => { const n = buildNpc({ ...kit, female: false, base: BODIES[i % BODIES.length], hair: HAIR[(i * 3) % HAIR.length], skin: SKIN[(i * 5 + 1) % SKIN.length], height: 1.47 + ((i * 7) % 5) * 0.03, ...look }); this.root.add(n.obj); return n; };
    const num = (n, p, light) => { const d = dorsal(n, light ? '#16224a' : '#ffffff', light ? '#ffffff' : '#16224a'); d.position.set(0, (p.obj.userData.H || 1.5) * 0.66, -0.17); d.rotation.y = Math.PI; p.obj.add(d); };
    // tu futbolista: el jugador de Osasuna (modelo de Meshy, con su camiseta, sus clips y su chut); si no está, uno con la equipación
    let mine = null;
    if (hasMeshy('osasuna')) try { mine = this.meshyPlayer(await loadMeshy('osasuna')); } catch (e) { console.warn('futbolista', e); }
    this.me = { ...(mine || npc(KIT.home, 0, { height: 1.55 })), side: 'home', role: 'field', me: true, x: 0, z: -1.2, speed: JOG, h: 0 };
    // el equipo visitante, con la segunda equipación de Osasuna (modelo de Meshy); cada uno de una altura
    let away = null;
    if (hasMeshy('osasuna_fuera')) try { away = await loadMeshy('osasuna_fuera'); } catch (e) { console.warn('visitantes', e); }
    const visitor = (i) => { if (!away) return npc(KIT.away, i + 3); const p = this.meshyPlayer(away); p.char.root.scale.multiplyScalar([0.97, 1.03, 1.0][i % 3]); return p; };
    if (mine) this.me.n = 7; else num(10, this.me);   // el de Meshy ya lleva su 7 en la espalda
    this.team = [
      { ...npc(KIT.home, 1), side: 'home', role: 'field', post: [-9, -10], speed: 6.0, n: 7 },
      { ...npc(KIT.home, 2), side: 'home', role: 'field', post: [9, -16], speed: 5.8, n: 4 },
      { ...visitor(0), side: 'away', role: 'field', post: [6, 8], speed: 6.8, n: 9 },
      { ...visitor(1), side: 'away', role: 'field', post: [-7, 12], speed: 6.6, n: 11 },
      { ...visitor(2), side: 'away', role: 'field', post: [0, 20], speed: 6.3, n: 5 },
      { ...npc(KIT.keepH, 6), side: 'home', role: 'keeper', speed: 4.4, save: 0.62, n: 1 },
      { ...npc(KIT.keepA, 7), side: 'away', role: 'keeper', speed: 4.6, save: 0.62, n: 1 },
    ];
    for (const p of this.team) { p.vx = 0; p.vz = 0; p.h = p.side === 'home' ? 0 : Math.PI; if (!p.meshy) num(p.n, p, p.side === 'away' && p.role === 'field'); }   // los de Meshy ya llevan su número
    this.all = [this.me, ...this.team];
    // aro amarillo bajo el jugador que controlas
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 28), new THREE.MeshBasicMaterial({ color: '#ffe14a', transparent: true, opacity: 0.85, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = 0.03; this.me.obj.add(this.ring); this.me.n ||= 10;
    this.crowd = this.makeCrowd();
    this.hud();
    this.score = { home: 0, away: 0 }; this.t = TIME; this.pause = 0; this.done = false; this.crowdT = 0;
    this.stamina = 1; this.charge = -1; this.slow = 0; this.camMode = innerWidth < innerHeight ? 'detras' : 'tv'; this.camPos = null; this.camLook = new THREE.Vector3(); this.dash = 0;   // en el móvil en vertical se ve mejor desde detrás
    this.kickoff('home');
  }

  // el futbolista de Meshy con la interfaz de los demás (obj, char, anim)
  meshyPlayer(g) {
    const char = new GlbChar(g, { walkAt: 0.2, runAt: 4.4, gait: (v, n) => n === 'Run' ? Math.pow(Math.max(0.3, v) / 3.4, 0.85) : Math.pow(Math.max(0.2, v) / 1.4, 0.8) });
    char.root.scale.setScalar(g.userData.fit || 1);
    const obj = new THREE.Group(); obj.add(char.root); obj.userData.H = 1.55; this.root.add(obj);
    return { obj, char, meshy: true, anim: { update: (dt, st) => { char.setSpeed(st.speed || 0); char.update(dt); } } };
  }
  // público en las gradas: sentado en sus asientos; de cerca, personajes 3D de verdad (con la camiseta de Osasuna casi
  // todos) y de lejos en lámina; se levantan y celebran los goles
  makeCrowd() {
    const spots = [], SX = 27, SZ = 40, run = 0.75, rise = 0.48, base = this.gy(0, 0) - 0.05;
    for (let k = 1; k < 19; k++) {
      const h = 1 + (k + 1) * rise - 0.5;
      for (let z = -54; z <= 54; z += 0.95) for (const s of [-1, 1]) { if (s < 0 && Math.abs(z) < 4.5) continue; if (Math.random() < 0.85) spots.push([this.cx + s * (SX + k * run + run / 2), base + h, this.cz + z, s > 0 ? -Math.PI / 2 : Math.PI / 2]); }
      for (let x = -25; x <= 25; x += 0.95) for (const s of [-1, 1]) if (Math.random() < 0.85) spots.push([this.cx + x, base + h, this.cz + s * (SZ + k * run + run / 2), s > 0 ? Math.PI : 0]);
    }
    // con los asientos del estadio, cada espectador en su asiento (casi la mitad ocupados)
    const seats = TOWN.sadarSeats;
    if (seats?.length) { spots.length = 0; for (const st of seats) if (Math.random() < 0.46) spots.push([st[0], st[1] + 0.06, st[2], st[3]]); }
    this.crowdSpots = spots; this.crowdBase = base;
    const im = crowd3d(spots, 'futbol', 1.3, { sit: !!seats?.length }); this.root.add(im); return im;
  }

  hud() {
    const h = this.h = document.createElement('div'); h.className = 'fut-hud';
    const t = this.G.input.touch;
    h.innerHTML = `<div class="fut-board"><b class="fut-home">OSASUNA</b><span class="fut-score">0 - 0</span><b class="fut-away">VISITANTE</b><i class="fut-time">3:00</i></div>
      <div class="fut-msg"></div><div class="fut-say"></div>
      <canvas class="fut-radar" width="96" height="140"></canvas>
      <div class="fut-bars"><div class="fut-stam"><i></i></div><div class="fut-pow"><i></i></div></div>
      <div class="fut-btns">
        <button class="fut-b fut-sprint" data-k="sprint">SPRINT</button>
        <button class="fut-b fut-pass" data-k="pass">PASE</button>
        <button class="fut-b fut-shoot" data-k="shoot">TIRO</button>
      </div>
      <button class="fut-cam" data-k="cam" aria-label="Cambiar cámara">CÁMARA</button>
      <button class="fut-swap" data-k="swap" aria-label="Cambiar de jugador">CAMBIAR</button>
      <div class="fut-help">${t ? 'Joystick: moverte · PASE · TIRO (mantén para más fuerza) · SPRINT · CAMBIAR de jugador' : 'WASD moverte · J pase/entrada · K tiro (mantén) · Mayús sprint · Q cambiar de jugador · C cámara'}</div>
      <button class="fut-quit" aria-label="Salir del partido">Salir</button>`;
    document.body.appendChild(h); document.body.classList.add('futbol');
    h.querySelector('.fut-quit').addEventListener('click', () => this.finish(true));
    this.btn = { sprint: false, pass: false, shoot: false };
    for (const b of h.querySelectorAll('[data-k]')) {
      const k = b.dataset.k;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); b.classList.add('on'); if (k === 'cam') this.nextCam(); else if (k === 'swap') this.swapQ = true; else { this.btn[k] = true; if (k === 'pass') this.passQ = true; if (k === 'shoot') this.shootDown = true; } });
      const up = (e) => { b.classList.remove('on'); if (k === 'cam' || k === 'swap') return; if (this.btn[k] && k === 'shoot') this.shootUp = true; this.btn[k] = false; };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    }
    this.radar = h.querySelector('.fut-radar').getContext('2d');
  }
  msg(t, ms = 1800) { const m = this.h?.querySelector('.fut-msg'); if (!m) return; m.textContent = t; m.classList.add('on'); clearTimeout(this.mt); this.mt = setTimeout(() => m.classList.remove('on'), ms); }
  say(t, ms = 1600) { const m = this.h?.querySelector('.fut-say'); if (!m) return; m.textContent = t; m.classList.add('on'); clearTimeout(this.st); this.st = setTimeout(() => m.classList.remove('on'), ms); }
  nextCam() { this.camMode = CAMS[(CAMS.indexOf(this.camMode) + 1) % CAMS.length]; this.say(CAM_NAME[this.camMode], 1000); }

  kickoff(side) {
    Object.assign(this.b, { x: 0, y: BR, z: 0, vx: 0, vy: 0, vz: 0, owner: null, last: null });
    const me = this.me; me.x = side === 'home' ? 0 : -3; me.z = side === 'home' ? -0.9 : -9; me.h = 0; me.vx = me.vz = 0;
    for (const p of this.team) {
      if (p.role === 'keeper') { p.x = 0; p.z = p.side === 'home' ? -HZ + 0.8 : HZ - 0.8; }
      else { [p.x, p.z] = p.post; if (side === 'away' && p.side === 'away' && p.n === 9) { p.x = 0; p.z = 1.0; } }
      p.vx = p.vz = 0; p.h = p.side === 'home' ? 0 : Math.PI;
    }
    this.pause = 1.2;
  }

  // dirección de la cámara en el suelo: el joystick se mueve respecto a lo que se ve
  camAxes() {
    const c = this.G.camera, f = new THREE.Vector3(); c.getWorldDirection(f); f.y = 0; if (f.lengthSq() < 1e-6) f.set(0, 0, 1); f.normalize();
    return { fx: f.x, fz: f.z, rx: -f.z, rz: f.x };
  }

  update(dt) {
    if (this.done) return;
    dt = Math.min(dt, 0.1);
    const G = this.G, inp = G.input, b = this.b;
    G.player.obj.visible = false;
    // teclado
    const K = inp.keys;
    if (inp.consume('c')) this.nextCam();
    if (inp.consume('q') || inp.consume('tab')) this.swapQ = true;
    if (inp.consume('j') || inp.consume(' ')) this.passQ = true;
    const kShoot = K.has('k') || K.has('e');
    if (kShoot && !this.kShootPrev) this.shootDown = true; if (!kShoot && this.kShootPrev) this.shootUp = true; this.kShootPrev = kShoot;
    const sprint = (this.btn.sprint || K.has('shift')) && this.stamina > 0.05;
    // cámara lenta tras un gol
    if (this.slow > 0) { this.slow -= dt; dt *= 0.3; }
    this.dt = dt;
    if (this.intro > 0) { this.intro -= dt; this.place(dt); this.camera(dt, true); return; }
    if (this.pause > 0) { this.pause -= dt; if (this.pause <= 0 && this.nextKick) { const k = this.nextKick; this.nextKick = null; this.kickoff(k); } this.place(dt); this.camera(dt); return; }
    this.t -= dt;
    this.h.querySelector('.fut-time').textContent = `${Math.floor(Math.max(0, this.t) / 60)}:${String(Math.floor(Math.max(0, this.t) % 60)).padStart(2, '0')}`;
    if (this.t <= 0) return this.finish(false);
    // ---- cambio de jugador: al pedirlo, al compañero más cerca del balón; tras un pase, al que lo recibe
    if (this.swapQ) { this.swapQ = false; const mates = this.team.filter(p => p.side === 'home' && p.role === 'field'); mates.sort((a, c) => Math.hypot(a.x - b.x, a.z - b.z) - Math.hypot(c.x - b.x, c.z - b.z)); this.switchTo(mates[0]); }
    if (this.passTo && (b.owner === this.passTo || (this.passT -= dt) <= 0)) { const r = this.passTo; this.passTo = null; this.switchTo(r); }
    // ---- el jugador: movimiento propio relativo a la cámara
    const me = this.me;
    const A = this.camAxes(), mx = inp.move.x, my = inp.move.y, mag = Math.min(1, Math.hypot(mx, my));
    const dx = A.fx * my + A.rx * mx, dz = A.fz * my + A.rz * mx;
    const top = (sprint ? SPRINT : JOG) * (b.owner === me ? 0.9 : 1);
    const wantVx = mag > 0.08 ? dx / Math.hypot(dx, dz) * top * mag : 0, wantVz = mag > 0.08 ? dz / Math.hypot(dx, dz) * top * mag : 0;
    if (this.dash > 0) { this.dash -= dt; } else { me.vx += (wantVx - me.vx) * Math.min(1, dt * 8); me.vz += (wantVz - me.vz) * Math.min(1, dt * 8); }
    me.x = Math.max(-HX - 1, Math.min(HX + 1, me.x + me.vx * dt)); me.z = Math.max(-HZ - 0.5, Math.min(HZ + 0.5, me.z + me.vz * dt));
    const v = Math.hypot(me.vx, me.vz); me.cur = v; if (v > 0.4) me.h = Math.atan2(me.vx, me.vz);
    this.stamina = Math.max(0, Math.min(1, this.stamina + (sprint && v > 1 ? -0.28 : 0.14) * dt));
    // cuerpo a cuerpo: nadie se atraviesa
    for (const p of this.team) { const ex = me.x - p.x, ez = me.z - p.z, d = Math.hypot(ex, ez); if (d < 0.6 && d > 1e-3) { me.x += ex / d * (0.6 - d) * 0.5; me.z += ez / d * (0.6 - d) * 0.5; } }
    // ---- balón con el jugador
    const dMe = Math.hypot(b.x - me.x, b.z - me.z);
    if (dMe < 0.85 && b.y < 0.6 && (b.owner === null || b.owner === me || this.steal(me))) { if (b.owner && b.owner !== me) this.say(pick(SAY.steal)); b.owner = me; }
    if (b.owner === me && dMe > 1.6) b.owner = null;
    // carga del tiro
    if (this.shootDown) { this.shootDown = false; this.charge = 0; }
    if (this.charge >= 0) this.charge = Math.min(1, this.charge + dt * 1.4);
    if (this.shootUp) { this.shootUp = false; if (this.charge >= 0) { if (dMe < 1.8) this.playerShoot(this.charge); this.charge = -1; } }
    if (this.passQ) {
      this.passQ = false;
      if (dMe < 1.8) this.playerPass();
      else { // entrada: estirón rápido hacia el balón
        const ex = b.x - me.x, ez = b.z - me.z, d = Math.hypot(ex, ez) || 1;
        if (d < 4) { me.vx = ex / d * 9; me.vz = ez / d * 9; this.dash = 0.28; me.char.playOnce?.('Hit', 0.35); if (b.owner && b.owner !== me && d < 2.2 && Math.random() < 0.65) { b.owner = me; this.say(pick(SAY.steal)); G.sound.pelota?.(0.5); } }
      }
    }
    if (b.owner === me) { const ahead = 0.55 + Math.min(0.3, v * 0.05); b.x += (me.x + Math.sin(me.h) * ahead - b.x) * Math.min(1, dt * 12); b.z += (me.z + Math.cos(me.h) * ahead - b.z) * Math.min(1, dt * 12); b.vx = me.vx; b.vz = me.vz; b.y = BR; b.last = 'home'; b.lastP = me; }
    // ---- los demás
    for (const p of this.team) p.role === 'keeper' ? this.keeper(p, dt) : this.fieldAI(p, dt);
    if (b.owner === null) this.ballPhysics(dt);
    else if (b.owner !== me) { const o = b.owner, kp = o.role === 'keeper'; b.x = o.x + Math.sin(o.h) * (kp ? 0.35 : 0.6); b.z = o.z + Math.cos(o.h) * (kp ? 0.35 : 0.6); b.y = kp ? 1.0 : BR; b.vx = o.vx; b.vz = o.vz; b.last = o.side; b.lastP = o; }
    if (Math.abs(b.x) < GW && b.y < GH && Math.abs(b.z) > HZ + 0.15) return this.goal(b.z > 0 ? 'home' : 'away');
    this.crowdT -= dt; if (this.crowdT <= 0) { this.crowdT = 1.1; G.sound.crowd?.(0.25 + (Math.abs(b.z) > HZ - 14 ? 0.35 : 0)); }
    this.place(dt); this.camera(dt); this.drawHud();
  }
  // pasar a controlar a otro jugador del equipo: el que se deja vuelve a su puesto y lo lleva la máquina
  switchTo(p) {
    if (!p || p === this.me || p.side !== 'home' || p.role !== 'field') return;
    const old = this.me, i = this.team.indexOf(p); if (i < 0) return;
    old.post = p.post || [old.x, old.z]; old.speed = p.speed || 6; old.n = old.n || 10; old.me = false; old.wait = 0.4;
    this.team[i] = old; p.me = true; p.vx = p.vx || 0; p.vz = p.vz || 0; this.me = p; this.dash = 0;
    this.ring.position.set(0, 0.03, 0); p.obj.add(this.ring);
    this.msg(`Juegas con el ${p.n}`, 900); this.G.sound.ui?.('click');
  }
  // tiro: hacia la portería con la dirección del joystick (o de la carrera); con más carga, más fuerte y más alto
  playerShoot(charge) {
    const b = this.b, me = this.me, G = this.G; b.owner = null; b.last = 'home'; b.lastP = me;
    me.char.playOnce?.('Hit', 0.4); G.sound.pelota?.(0.6 + charge * 0.6);
    const toGoalX = 0 - me.x, toGoalZ = HZ - me.z, L0 = Math.hypot(toGoalX, toGoalZ) || 1;
    const facing = (Math.sin(me.h) * toGoalX + Math.cos(me.h) * toGoalZ) / L0;
    const v = 13 + charge * 15, err = (1 - Math.min(1, charge * 1.3)) * 0.5 + Math.max(0, charge - 0.85) * 2.4;
    if (facing > 0.2 && me.z > -12) {
      const t = (HZ - me.z) / Math.max(0.25, Math.cos(me.h)), tx = Math.max(-GW + 0.3, Math.min(GW - 0.3, me.x + Math.sin(me.h) * t)) + (Math.random() - 0.5) * err * 2;
      const dx = tx - b.x, dz = HZ + 1 - b.z, L = Math.hypot(dx, dz);
      Object.assign(b, { vx: dx / L * v, vz: dz / L * v, vy: 1.2 + charge * 4.2 + (Math.random() - 0.5) * err });
      this.shot = { t: 2, x: tx };
    } else Object.assign(b, { vx: Math.sin(me.h) * v, vz: Math.cos(me.h) * v, vy: 1.5 + charge * 4 });
  }
  // pase al compañero mejor situado en la dirección en la que mira el jugador, adelantado a su carrera
  playerPass() {
    const b = this.b, me = this.me, G = this.G;
    const mates = this.team.filter(p => p.side === 'home' && p.role === 'field');
    let best = null, bs = -9;
    for (const p of mates) { const dx = p.x - me.x, dz = p.z - me.z, d = Math.hypot(dx, dz) || 1; const s = (Math.sin(me.h) * dx + Math.cos(me.h) * dz) / d - d * 0.015; if (s > bs) { bs = s; best = p; } }
    b.owner = null; b.last = 'home'; b.lastP = me; me.char.playOnce?.('Hit', 0.3); G.sound.pelota?.(0.5);
    if (best && bs > -0.2) {
      const lx = best.x + best.vx * 0.5, lz = best.z + best.vz * 0.5, dx = lx - b.x, dz = lz - b.z, L = Math.hypot(dx, dz) || 1, v = Math.min(17, 7 + L * 0.65);
      Object.assign(b, { vx: dx / L * v, vz: dz / L * v, vy: L > 14 ? 3 : 0.4 }); best.wait = 1.2; this.passTo = best; this.passT = Math.min(1.6, L / v + 0.3);
      if (L > 10) this.say(pick(SAY.pass), 1000);
    } else Object.assign(b, { vx: Math.sin(me.h) * 12, vz: Math.cos(me.h) * 12, vy: 0.5 });
  }
  steal(who) { const b = this.b; if (b.owner === null || b.owner === who) return true; if (b.owner.role === 'keeper') return false; const rate = who === this.me ? 2.6 : b.owner === this.me ? 2.3 : 1.1; return Math.random() < 1 - Math.exp(-rate * this.dt); }

  fieldAI(p, dt) {
    const b = this.b, me = this.me, own = b.owner === p, attack = p.side === 'home' ? 1 : -1;
    const ownerSide = b.owner ? b.owner.side : null, mateHas = ownerSide === p.side && !own;
    let tx, tz, sp = p.speed;
    if (p.wait > 0) p.wait -= dt;
    if (own) {
      tx = Math.sin(this.t * 0.7 + p.n) * 4; tz = attack * HZ;
      const foes = this.all.filter(q => q.side !== p.side && q.role !== 'keeper');
      const near = foes.some(q => Math.hypot(q.x - p.x, q.z - p.z) < 1.8);
      if (attack * p.z > HZ - 16 || (near && Math.random() < dt * 1.3)) {
        const shoot = attack * p.z > HZ - 18;
        let ux, uz, v;
        if (shoot) { const gx = (Math.random() - 0.5) * GW * 1.8 - p.x, gz = attack * (HZ + 1) - p.z, L = Math.hypot(gx, gz); ux = gx / L; uz = gz / L; v = p.side === 'away' ? 15 : 17; this.shot = { t: 2 }; }
        else { const mates = this.all.filter(q => q.side === p.side && q.role === 'field' && q !== p); const t = mates[Math.floor(Math.random() * mates.length)]; const gx = t.x - p.x, gz = t.z - p.z, L = Math.hypot(gx, gz) || 1; ux = gx / L; uz = gz / L; v = Math.min(15, 6 + L * 0.7); }
        b.owner = null; b.last = p.side; b.lastP = p; Object.assign(b, { vx: ux * v, vz: uz * v, vy: shoot ? 1.5 + Math.random() * 2 : 0.5 });
        p.char.playOnce?.('Hit', 0.4); this.G.sound.pelota?.(0.6);
      }
      sp *= 0.85;
    } else if (mateHas || (p.wait > 0)) {
      // su equipo lleva el balón: se desmarca hacia delante en su carril
      const o = b.owner || b; tx = Math.max(-HX + 3, Math.min(HX - 3, p.post[0] * 1.2 + (o.x - p.post[0]) * 0.2)); tz = Math.max(-HZ + 6, Math.min(HZ - 6, o.z + attack * (6 + Math.abs(p.post[0]) * 0.4))); sp *= 0.8;
    } else {
      // el más cercano presiona; los demás guardan su zona respecto al balón
      const mates = this.all.filter(q => q.side === p.side && q.role === 'field');
      const dists = mates.map(q => Math.hypot(q.x - b.x, q.z - b.z)), presser = mates[dists.indexOf(Math.min(...dists))];
      const slow = p.side === 'away' && b.owner === me ? 0.9 : 1;
      if (presser === p) { tx = b.x + b.vx * 0.25; tz = b.z + b.vz * 0.25; sp *= slow; }
      else { tx = p.post[0] * 0.8 + b.x * 0.3; tz = p.post[1] * 0.5 + b.z * 0.5 - attack * 4; sp *= 0.75; }
      if (Math.hypot(b.x - p.x, b.z - p.z) < 0.8 && b.y < 0.7 && this.steal(p)) {
        if (b.owner === me) { this.msg('¡Te han robado el balón!', 1100); }
        b.owner = p;
      }
    }
    this.moveTo(p, tx, tz, sp, dt);
  }
  // portero: se coloca cerrando el ángulo, adivina adónde va el tiro y se estira, bloca o despeja, sale a por los
  // balones sueltos cerca del área y, con el balón en las manos, saca rápido hacia un compañero
  keeper(p, dt) {
    const b = this.b, gz = p.side === 'home' ? -HZ + 0.8 : HZ - 0.8, dir = Math.sign(gz);
    p.hold = Math.max(0, (p.hold || 0) - dt);
    // con el balón en las manos: lo saca a un compañero
    if (b.owner === p) {
      p.h = dir > 0 ? Math.PI : 0; this.moveTo(p, p.x, gz - dir * 1.5, 2, dt, true);
      if (p.hold <= 0) {
        const mates = this.all.filter(q => q.side === p.side && q.role === 'field'), mate = mates.sort((a, c) => Math.abs(a.x) - Math.abs(c.x))[Math.floor(Math.random() * mates.length)];
        const dx = mate.x - b.x, dz = mate.z - b.z, L = Math.hypot(dx, dz) || 1, far = L > 18;
        b.owner = null; Object.assign(b, { vx: dx / L * (far ? 18 : 12), vz: dz / L * (far ? 18 : 12), vy: far ? 6 : 1.2, last: p.side, lastP: p });
        p.char.playOnce?.(far ? 'Hit' : 'Wave', 0.4); this.G.sound.pelota?.(0.6);
      }
      return;
    }
    // estirada en curso
    if (p.dive > 0) {
      p.dive -= dt; p.x += p.dvx * dt; p.x = Math.max(-GW - 0.6, Math.min(GW + 0.6, p.x)); p.tilt = Math.sign(p.dvx) * Math.min(1.25, (0.55 - p.dive) * 5);
      this.keeperTouch(p, dir);
      if (p.dive <= 0) { p.tilt = 0; p.cur = 0; }
      return;
    }
    p.tilt = 0;
    // colocación: un poco fuera de la línea según lo cerca que esté el balón, y en la bisectriz del ángulo
    const dBall = Math.hypot(b.x, b.z - gz), out = Math.max(0.3, Math.min(3.2, 6 - dBall * 0.15));
    let tx = Math.max(-GW + 0.4, Math.min(GW - 0.4, b.x * Math.min(1, 5 / Math.max(5, dBall)) * 1.2)), tz = gz - dir * out;
    // balón suelto cerca del área y sin rival encima: sale a por él
    const loose = b.owner === null && Math.abs(b.z - gz) < 9 && Math.abs(b.x) < 9 && Math.hypot(b.vx, b.vz) < 9;
    const rivalNear = this.all.some(q => q.side !== p.side && Math.hypot(q.x - b.x, q.z - b.z) < Math.hypot(p.x - b.x, p.z - b.z) - 0.5);
    if (loose && !rivalNear) { tx = b.x; tz = b.z; }
    this.moveTo(p, tx, tz, loose && !rivalNear ? p.speed * 1.5 : p.speed, dt, true);
    p.h = dir > 0 ? Math.PI : 0;
    // tiro hacia la portería: calcula por dónde cruzará la línea y se lanza
    const towards = b.owner === null && Math.sign(b.vz) === dir && Math.abs(b.vz) > 5;
    if (towards) {
      const t = (p.z - b.z) / b.vz;
      if (t > 0 && t < 0.9) {
        const ix = b.x + b.vx * t, iy = b.y + b.vy * t - 4.9 * t * t;
        if (Math.abs(ix) < GW + 1 && Math.abs(ix - p.x) > 0.5 && !p.tried) {
          p.tried = true;
          // reflejos: no siempre llega (depende de la distancia, la colocación y su habilidad)
          const post = Math.abs(ix) > GW - 0.7 ? 0.55 : 1, react = Math.min(1, t / 0.55);   // a la escuadra o muy rápido, cuesta más
          const reach = (0.5 + p.save * 1.5 + (Math.random() - 0.5) * 0.9) * post * react, need = Math.abs(ix - p.x);
          const go = Math.max(0, Math.min(need, reach)), sgn = Math.sign(ix - p.x);
          p.dive = 0.55; p.dvx = sgn * go / 0.4; p.diveY = Math.max(0.2, Math.min(2.2, iy));
          p.char.playOnce?.('Jump_Start', 0.3);
        }
      }
    }
    this.keeperTouch(p, dir);
    if (Math.abs(b.z - gz) > 6) p.tried = false;
  }
  // ¿toca el balón? manos a la altura del salto: lo bloca si llega flojo, lo despeja si llega fuerte
  keeperTouch(p, dir) {
    const b = this.b; if (b.owner !== null && b.owner !== undefined) return;
    const hy = p.dive > 0 ? (p.diveY || 0.8) : 1.0, dx = b.x - p.x, dz = b.z - p.z, dy = b.y - hy;
    const r = p.dive > 0 ? 0.75 : 0.6;
    if (dx * dx + dz * dz < r * r && Math.abs(dy) < 1.3 && b.last !== p.side) {
      const v = Math.hypot(b.vx, b.vz, b.vy);
      if (v < 14 && Math.random() < 0.6) { b.owner = p; b.vx = b.vz = b.vy = 0; p.hold = 1.1; this.say('¡La blocó el portero!'); }
      else { Object.assign(b, { vz: -dir * Math.abs(b.vz) * 0.35, vx: (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 4), vy: 2.5 + Math.random() * 2, last: p.side, lastP: p }); this.say(pick(SAY.save)); }
      p.char.playOnce?.('Celebrate', 0.6); this.G.sound.crowd?.(0.9); this.G.sound.pelota?.(0.7);
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
    const inMouth = Math.abs(b.x) < GW && b.y < GH;
    if (!inMouth && Math.abs(b.z) > WALLZ) { b.z = Math.sign(b.z) * WALLZ; b.vz *= -0.55; if (this.shot?.t > 0) { this.say(pick(SAY.miss)); this.shot = null; } }
    if (Math.abs(Math.abs(b.z) - HZ) < 0.3 && Math.abs(Math.abs(b.x) - GW) < 0.25 && b.y < GH) { b.vz *= -0.6; b.vx *= -0.4; this.G.sound.pelota?.(0.4); this.say(pick(SAY.post)); }
    if (this.shot) { this.shot.t -= dt; if (this.shot.t <= 0) this.shot = null; }
  }
  goal(side) {
    const G = this.G; this.score[side]++;
    this.h.querySelector('.fut-score').textContent = `${this.score.home} - ${this.score.away}`;
    const w = this.W(this.b.x, this.b.z), y = this.gy(this.b.x, this.b.z) + 1.2;
    this.slow = 1.4; this.goalCam = { t: 2.6, z: Math.sign(this.b.z) };
    if (side === 'home') {
      const who = this.b.lastP === this.me ? `¡GOOOL! ¡Golazo del número ${this.me.n || 10}!` : '¡GOOOL DE OSASUNA!';
      this.msg(who, 2600); G.sound.fanfare?.(); G.sound.crowd?.(1.6);
      G.particles?.confetti?.({ x: w.x, y, z: w.z }, 160); this.cheer = 2.6; this.me.char.playOnce?.('Celebrate', 1.6);
    } else { this.msg('Gol del equipo visitante. ¡Ánimo, a por el empate!', 2200); G.sound.ui?.('error'); }
    for (const p of this.team) if (p.side === side) p.char.playOnce?.('Celebrate', 1.4);
    if (this.score[side] >= WIN) { this.pause = 99; this.nextKick = null; setTimeout(() => this.finish(false), 2400); return; }
    this.b.owner = null; this.b.vx = this.b.vz = this.b.vy = 0; this.pause = 2.6; this.nextKick = side === 'home' ? 'away' : 'home';
  }
  place(dt) {
    const b = this.b, w = this.W(b.x, b.z);
    this.ball.position.set(w.x, this.gy(b.x, b.z) + b.y, w.z);
    const v = Math.hypot(b.vx, b.vz); if (v > 0.05) { this.ball.rotation.x += (b.vz / BR) * dt; this.ball.rotation.z -= (b.vx / BR) * dt; }
    for (const p of this.all) {
      const q = this.W(p.x, p.z), dive = p.tilt || 0; p.obj.position.set(q.x, this.gy(p.x, p.z) + Math.abs(dive) * 0.35, q.z); p.obj.rotation.set(0, p.h, -dive);
      p.anim.update(dt, { speed: p.cur || 0 });
    }
    // el personaje del jugador (oculto) sigue al jugador para que todo lo demás (cámara, sonido, vecinos) esté en su sitio
    const mw = this.W(this.me.x, this.me.z); this.G.player.pos.set(mw.x, this.gy(this.me.x, this.me.z), mw.z); this.G.player.heading = this.me.h;
    this.cheer = Math.max(0, (this.cheer || 0) - dt);
    this.crowd.cheer?.(this.cheer > 0);
    // de pie y saltando en los goles; sentados el resto (los cercanos a la jugada se animan más)
    this.crowd.tick?.(performance.now() / 1000, this.cheer > 0 ? 1 : 0.25, this.W(this.b.x, this.b.z).z, this.G.camera);
  }
  // cámaras: televisión (desde la grada oeste siguiendo el balón), detrás del jugador (mirando a la portería rival) y aérea
  camera(dt, intro = false) {
    const G = this.G, c = G.camera, b = this.b, me = this.me, g0 = this.gy(0, 0);
    let pos, look;
    if (intro) {
      const a = (3.2 - this.intro) * 0.45 - 0.6;
      pos = new THREE.Vector3(this.cx + Math.sin(a) * 22, g0 + 13, this.cz + Math.cos(a) * 30); look = new THREE.Vector3(this.cx, g0, this.cz);
      c.position.copy(pos); c.lookAt(look); this.camPos = null; return;
    }
    if (this.goalCam?.t > 0) {
      this.goalCam.t -= dt; const s = this.goalCam.z;
      pos = new THREE.Vector3(this.cx + 6, g0 + 3.2, this.cz + s * (HZ + 6)); look = new THREE.Vector3(this.cx + b.x * 0.5, g0 + 1, this.cz + s * (HZ - 6));
    } else if (this.camMode === 'tv') {
      const pt = innerWidth < innerHeight; pos = new THREE.Vector3(this.cx - (pt ? 22 : 31), g0 + (pt ? 11 : 14), this.cz + b.z * 0.85); look = new THREE.Vector3(this.cx + b.x * 0.4, g0, this.cz + b.z);
    } else if (this.camMode === 'detras') {
      const mw = this.W(me.x, me.z); pos = new THREE.Vector3(mw.x, g0 + 3.6, mw.z - 7.5); look = new THREE.Vector3(mw.x + (b.x - me.x) * 0.3, g0 + 0.8, mw.z + 6);
    } else {
      pos = new THREE.Vector3(this.cx + b.x * 0.5, g0 + 30, this.cz + b.z - 10); look = new THREE.Vector3(this.cx + b.x * 0.5, g0, this.cz + b.z);
    }
    if (!this.camPos) { this.camPos = pos.clone(); this.camLook.copy(look); }
    const k = 1 - Math.exp(-4 * dt); this.camPos.lerp(pos, k); this.camLook.lerp(look, k);
    c.position.copy(this.camPos); c.lookAt(this.camLook);
  }
  drawHud() {
    const st = this.h.querySelector('.fut-stam i'), pw = this.h.querySelector('.fut-pow i');
    st.style.width = (this.stamina * 100).toFixed(0) + '%'; pw.parentElement.style.opacity = this.charge >= 0 ? 1 : 0; pw.style.width = (Math.max(0, this.charge) * 100).toFixed(0) + '%';
    // radar del campo
    const g = this.radar, W = 96, H = 140, sx = W / (2 * HX + 4), sz = H / (2 * HZ + 4), X = (x) => W / 2 + x * sx, Y = (z) => H / 2 - z * sz;
    g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(30,110,50,.75)'; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1;
    g.strokeRect(X(-HX), Y(HZ), 2 * HX * sx, 2 * HZ * sz); g.beginPath(); g.moveTo(X(-HX), Y(0)); g.lineTo(X(HX), Y(0)); g.stroke();
    for (const p of this.all) { g.fillStyle = p === this.me ? '#ffe14a' : p.side === 'home' ? '#e0303a' : '#f4f4f2'; g.beginPath(); g.arc(X(p.x), Y(p.z), p === this.me ? 4 : 3, 0, 7); g.fill(); }
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(X(this.b.x), Y(this.b.z), 2.2, 0, 7); g.fill(); g.strokeStyle = '#000'; g.stroke();
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
    this.h?.remove(); clearTimeout(this.mt); clearTimeout(this.st); document.body.classList.remove('futbol');
    if (this.root) {
      G.scene.remove(this.root);
      this.ball?.geometry.dispose(); this.ball?.material.dispose(); this.ballTex?.dispose(); this.crowd?.dispose?.();   // la lámina y las figuras del público se guardan para el próximo partido
      for (const p of this.all || []) { p.char?.dispose?.(); p.obj.traverse(o => { if (o.material?.map && o.material.isMeshBasicMaterial) { o.material.map.dispose(); o.material.dispose(); o.geometry.dispose(); } }); }
    }
    if (this.bf) this.bf.visible = this.bfWas;
    G.mode = 'play'; G.player.frozen = false; G.futbol = null; G.player.obj.visible = true;
    const w = this.W(-16.5, 3); G.player.place(w.x, w.z, -Math.PI / 2); G.follow.cinematic = null; G.follow.snap?.(G.player);
    if (this.dog) { this.G.perro?.release(); this.dog.pos.set(w.x - 1.5, groundHeight(w.x - 1.5, w.z + 1), w.z + 1); this.dog.sync?.(); }
  }
}
