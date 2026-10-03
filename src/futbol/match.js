// Vista del partido: une la lógica (game.js), el campo (field.js), los personajes, la cámara, la interfaz (hud.js), el
// sonido (audio.js) y la entrada (teclado y táctil). El anfitrión llama a update(dt) en cada fotograma y dibuja
// scene con camera. run() devuelve una promesa con el resultado cuando el jugador sale.
import * as THREE from 'three';
import { FIELD as F, PHYS as K, TEAMS, TEXT, RETOS, VENUES, RULES as RU, ROLES, useFormat, onFormat, FORMAT } from './rules.js';
import { FutbolGame } from './game.js';
import { buildField, ballTexture, roofShade } from './field.js';
import { FutbolHud } from './hud.js';
import { FutbolAudio } from './audio.js';
import { Reto } from './retos.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let R = K.R;
onFormat(() => { R = K.R; });

// figura por defecto (si el juego no da personajes): cuerpo con la equipación, cabeza y piernas que se mueven
export function defaultCharacter({ team, keeper }) {
  const T = team, shirt = keeper ? T.keeper : T.shirt;
  const obj = new THREE.Group(), mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 4, 10), mat(shirt)); body.position.y = 1.12; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), mat('#e8b896')); head.position.y = 1.58; head.castShadow = true;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#3a2418')); hair.position.y = 1.6;
  const legs = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * 0.1, 0.82, 0); const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.6, 3, 8), mat(T.shorts)); l.position.y = -0.38; l.castShadow = true; const sock = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.28, 3, 8), mat(T.socks)); sock.position.y = -0.62; g.add(l, sock); obj.add(g); return g; });
  obj.add(body, head, hair);
  let ph = 0, v = 0, once = 0;
  return { obj, anim: { setSpeed: (s) => { v = s; }, once: (name, secs = 0.4) => { once = secs; }, update: (dt) => { ph += dt * (2 + v * 1.6); const a = Math.min(0.9, v * 0.14) * Math.sin(ph); legs[0].rotation.x = a; legs[1].rotation.x = -a; if (once > 0) { once -= dt; legs[1].rotation.x = -1.1 * Math.sin(Math.min(1, once * 3) * Math.PI); } } },
    dispose: () => obj.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }) };
}

const CAMS = ['tv', 'detras'], CAM_NAME = { tv: 'Cámara de televisión', detras: 'Detrás del jugador' };
const RESTART_NAME = { throwin: TEXT.throwin, corner: TEXT.corner, goalkick: TEXT.goalkick, free: TEXT.free, penalty: TEXT.penalty, kickoff: TEXT.kickoff };

export class FutbolMatch {
  /**
   * @param {object} o { mode: 'match'|'penalties'|'reto'|'tutorial', level, duration, assist, autoplay, timeScale, venue,
   *   home, away (ids de TEAMS), makeCharacter, crowd, quality, touch, audio {ctx,out}, kicks, reto, tutorial, cup, seed }
   */
  constructor(o) {
    this.o = { venue: 'sadar', home: 'osasuna', away: 'visitante', timeScale: 1, quality: 'high', ...o };
    // (los clubes de los pueblos llegan ya como equipo: homeTeam / awayTeam)
    this.home = this.o.homeTeam || TEAMS[this.o.home] || TEAMS.osasuna; this.away = this.o.awayTeam || TEAMS[this.o.away] || TEAMS.visitante;
    // el formato sale del campo: El Sadar, fútbol 11; la pista del pueblo, fútbol sala
    if (this.o.local) this.home = { ...this.home, ...this.o.local };
    const V = VENUES[this.o.venue] || VENUES.sadar; this.o.format ||= V.format || 'f11'; this.o.surface ||= V.surface || 'hierba';
    useFormat(this.o.format, this.o.surface);
    this.camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.3, 600);
    this.camMode = (innerWidth < innerHeight) ? 'detras' : 'tv';
    this.done = false; this.paused = false; this.t = 0; this.snaps = []; this.replay = null; this.intro = 3; this.introLen = 3; this.live = false;
  }
  /** Crea el campo, los veintidós jugadores, el árbitro y sus asistentes, el balón y la interfaz. */
  async load() {
    const o = this.o;
    this.field = buildField(o.venue, { quality: o.quality, crowd: o.crowd, names: [this.home.short, this.away.short] });
    this.scene = this.field.scene;
    this.game = this.newGame();
    // jugadores: el modelo del juego (con su equipación) o la figura por defecto
    this.chars = [];
    const make = o.makeCharacter || ((d) => defaultCharacter(d));
    await Promise.all(this.game.players.map(async (p) => {
      const d = { team: p.team ? this.away : this.home, teamId: p.team ? o.away : o.home, side: p.team, role: p.role, num: p.num, keeper: p.role === 'POR' };
      let c = null; try { c = await make(d); } catch (e) { console.warn('futbolista', e); }
      if (!c) c = defaultCharacter(d);
      const outer = new THREE.Group(), pivot = new THREE.Group(); pivot.add(c.obj); outer.add(pivot); this.scene.add(outer);
      c.obj.traverse(m => { if (m.isMesh) { m.castShadow = o.quality !== 'low'; m.frustumCulled = false; } });
      this.chars[p.id] = { c, outer, pivot, act: '', pose: 0, celeb: 0 };
    }));
    // el árbitro y los asistentes (con banderín)
    this.refChars = [];
    await Promise.all(this.game.refs.map(async (r, i) => {
      const d = { referee: true, line: r.kind === 'line', team: { shirt: '#17181c', shorts: '#17181c', socks: '#17181c', keeper: '#17181c', text: '#fff' }, side: 2, role: r.kind, num: 0, keeper: false };
      let c = null; try { c = await make(d); } catch (e) { console.warn('árbitro', e); }
      if (!c) c = defaultCharacter(d);
      const outer = new THREE.Group(); outer.add(c.obj); this.scene.add(outer);
      c.obj.traverse(m => { if (m.isMesh) { m.castShadow = o.quality !== 'low'; m.frustumCulled = false; } });
      this.refChars[i] = { c, outer };
    }));
    // bajo la cubierta de El Sadar los jugadores también quedan a la sombra: sus materiales (copiados, para no tocar los
    // de los vecinos del pueblo, que usan los mismos modelos) llevan el cálculo de la sombra de la cubierta
    if (this.field.roof) {
      const copies = new Map(); this.roofMats = [];
      const patch = (m) => { if (!copies.has(m)) { const c2 = m.userData.fbOwn ? m : m.clone(); roofShade(c2, this.field.roof); copies.set(m, c2); this.roofMats.push(c2); } return copies.get(m); };
      for (const ch of [...this.chars, ...this.refChars]) ch.c.obj.traverse(m => { if (m.isMesh && m.material) m.material = Array.isArray(m.material) ? m.material.map(patch) : patch(m.material); });
    }
    // balón (dibujado al 120 %) con su sombra
    this.ballTex = ballTexture();
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(R * K.scale, 24, 16), new THREE.MeshStandardMaterial({ map: this.ballTex, roughness: 0.45 }));
    this.ball.castShadow = true; this.scene.add(this.ball);
    const bs = document.createElement('canvas'); bs.width = bs.height = 64; const g = bs.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    this.blobTex = new THREE.CanvasTexture(bs);
    const blobMat = new THREE.MeshBasicMaterial({ map: this.blobTex, transparent: true, depthWrite: false });
    this.ballShadow = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), blobMat); this.ballShadow.rotation.x = -Math.PI / 2; this.scene.add(this.ballShadow);
    // estela del balón en los pases y tiros: unos puntos blancos que se apagan detrás de él (para seguirlo con la vista)
    const ds = document.createElement('canvas'); ds.width = ds.height = 32; const dg = ds.getContext('2d'), dgr = dg.createRadialGradient(16, 16, 0, 16, 16, 15);
    dgr.addColorStop(0, 'rgba(255,255,255,1)'); dgr.addColorStop(0.5, 'rgba(255,255,255,.55)'); dgr.addColorStop(1, 'rgba(255,255,255,0)'); dg.fillStyle = dgr; dg.fillRect(0, 0, 32, 32);
    this.trailTex = new THREE.CanvasTexture(ds); this.trailHist = [];
    this.trail = Array.from({ length: 7 }, () => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.trailTex, transparent: true, depthWrite: false, opacity: 0 })); sp.visible = false; this.scene.add(sp); return sp; });
    // en calidad baja, sin sombras de verdad: una mancha bajo cada jugador
    if (o.quality === 'low') for (const ch of [...this.chars, ...this.refChars]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), blobMat); m.rotation.x = -Math.PI / 2; m.position.y = 0.015; ch.outer.add(m); }
    // anillo amarillo (con una flecha hacia donde mira) bajo el jugador que controlas
    const ringG = new THREE.RingGeometry(0.46, 0.6, 36), tri = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.17, 0, 0.66), new THREE.Vector3(0.17, 0, 0.66), new THREE.Vector3(0, 0, 0.92)]);
    ringG.rotateX(-Math.PI / 2); tri.computeVertexNormals();
    const ringM = new THREE.MeshBasicMaterial({ color: '#ffe14a', transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide });
    this.ring = new THREE.Group(); this.ring.add(new THREE.Mesh(ringG, ringM), new THREE.Mesh(tri, ringM)); this.ring.position.y = 0.03; this.ring.renderOrder = 2; this.scene.add(this.ring);
    // encima del jugador que llevas, una flecha amarilla que baja y sube (en el móvil el aro del suelo apenas se ve)
    this.pin = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 4).rotateX(Math.PI), new THREE.MeshBasicMaterial({ color: '#ffe14a', depthTest: false, transparent: true }));
    this.pin.renderOrder = 3; this.scene.add(this.pin);
    // a quién va el pase: un aro azul
    this.mark = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.5, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#7ad7ff', transparent: true, opacity: 0.8, depthWrite: false })); this.mark.visible = false; this.scene.add(this.mark);
    this.audio = new FutbolAudio(o.audio || {});
    this.hud = new FutbolHud({ touch: o.touch ?? matchMedia('(pointer:coarse)').matches, home: this.home, away: this.away,
      onPress: (a) => this.press(a), onRelease: (a) => this.release(a), onPause: () => this.pauseMenu(), onCam: () => this.nextCam() });
    if (RU.foulLimit && o.mode === 'match') this.hud.setFouls(0, 0, RU.foulLimit);
    this.keys = new Set();
    this.onKey = (e) => this.key(e, true); this.onKeyUp = (e) => this.key(e, false);
    addEventListener('keydown', this.onKey, true); addEventListener('keyup', this.onKeyUp, true);
    this.onResize = () => { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); };
    addEventListener('resize', this.onResize);
    // al cambiar de aplicación en el móvil, el partido se para
    this.onHide = () => { if (document.hidden && !this.ended && this.intro <= 0) this.pauseMenu(); };
    document.addEventListener('visibilitychange', this.onHide);
    this.onTap = () => { if (this.intro > 0 && !this.paused) this.skipIntro(); }; addEventListener('pointerdown', this.onTap);
    this.confetti = this.makeConfetti(); this.scene.add(this.confetti.mesh);
    this.prepIntro(this.o.mode === 'match');
    this.sync(0); this.cam(1, true);
  }
  // ---------------------------------------------------------------- presentación
  // 0–3 s: llegada aérea al estadio con los dos equipos ya formados en el centro; 3–6 s: la cámara pasa a ras de suelo
  // por delante de los veintidós (y el trío arbitral) entre confeti; 6–8,5 s: plano abierto del campo entero con cada
  // uno corriendo a su puesto del saque inicial (portero bajo palos), y la cámara baja a la de televisión.
  // Tocar la pantalla o pulsar una tecla la salta
  prepIntro(lineup) {
    const g = this.game;
    // los puestos del saque inicial (los mismos que pondrá el saque de verdad al empezar)
    if (g.mode === 'match') { g.kickoff(0); g.restart = null; g.phase = 'intro'; g.events = []; }
    this.slots = g.players.map(p => ({ x: p.x, z: p.z }));
    this.refSlots = g.refs.map(r => ({ x: r.x, z: r.z }));
    this.lineup = lineup && g.mode === 'match';
    this.introLen = this.intro = this.lineup ? 8.5 : this.intro;
    this.introStage = -1;
    if (!this.lineup) return;
    // en fila, de cara a la tribuna principal: los locales a un lado del trío arbitral y los visitantes al otro
    const Z = Math.min(8, F.HW * 0.35);
    this.rows = g.players.map(p => { const i = p.id % 11; return { x: (p.team ? 1 : -1) * (1.7 + i * 1.15), z: Z }; });
    this.refRows = g.refs.map((r, i) => ({ x: (i - 1) * 0.8, z: Z }));
  }
  introStep(dt) {
    const g = this.game, e = this.introLen - this.intro;
    const stage = !this.lineup ? 2 : e < 3 ? 0 : e < 6 ? 1 : 2;
    const enter = stage !== this.introStage; this.introStage = stage;
    if (enter) this.camPos = null;   // corte de plano
    if (enter && stage === 1) this.hud.msg(this.home.name, `${this.away.name} · 11 contra 11`, 2600);
    this.confetti.mesh.visible = this.lineup && e > 2.6;
    if (this.confetti.mesh.visible) this.confetti.update(dt);
    if (stage < 2) {
      g.players.forEach((p, i) => { const r = this.rows[i]; p.x = r.x; p.z = r.z; p.vx = p.vz = 0; p.h = 0; });
      g.refs.forEach((r, i) => { const q = this.refRows[i]; r.x = q.x; r.z = q.z; r.vx = r.vz = 0; r.h = 0; });
      return;
    }
    if (!this.lineup) { g.players.forEach((p, i) => { const t = this.slots[i]; p.x = t.x; p.z = t.z; p.h = Math.atan2(-t.x, -t.z * 0.2); }); return; }
    // tras el corte, ya a medio camino; cada uno llega a su puesto a su paso (el portero, al trote largo)
    const left = Math.max(0.05, this.intro - 0.6);
    const go = (o, from, to) => {
      if (enter) { o.x = from.x + (to.x - from.x) * 0.72; o.z = from.z + (to.z - from.z) * 0.72; }
      const dx = to.x - o.x, dz = to.z - o.z, d = Math.hypot(dx, dz);
      if (d < 0.05) { o.vx = o.vz = 0; o.h = Math.atan2(-o.x, -o.z * 0.2); return; }
      const v = Math.min(d / left, 7.5, d / Math.max(dt, 1e-3)); o.vx = dx / d * v; o.vz = dz / d * v;
      o.x += o.vx * dt; o.z += o.vz * dt; o.h = Math.atan2(dx, dz);
    };
    g.players.forEach((p, i) => go(p, this.rows[i], this.slots[i]));
    g.refs.forEach((r, i) => go(r, this.refRows[i], this.refSlots[i]));
  }
  skipIntro() {
    if (!this.live || this.intro <= 0.3) return;
    const g = this.game;
    g.players.forEach((p, i) => { const t = this.slots[i]; p.x = t.x; p.z = t.z; p.vx = p.vz = 0; });
    g.refs.forEach((r, i) => { const t = this.refSlots[i]; r.x = t.x; r.z = t.z; r.vx = r.vz = 0; });
    this.lineup = false; this.intro = 0.3; this.introStage = -1; this.camPos = null;
  }
  // confeti rojo, blanco, azul marino y dorado sobre el centro del campo
  makeConfetti() {
    const N = this.o.quality === 'low' ? 400 : 1400, geo = new THREE.PlaneGeometry(0.16, 0.1);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), N);
    const cols = ['#d91a2a', '#ffffff', '#16224a', '#e8b73a', '#d91a2a', '#ffffff'].map(c => new THREE.Color(c));
    const P = [], m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
    const r = Math.random;
    for (let i = 0; i < N; i++) {
      const k = Math.max(F.L / 105, 0.5);
      P.push({ x: (r() - 0.5) * 44 * k, y: 1 + r() * 16 * k, z: (-4 + r() * 18) * k, vy: 0.9 + r() * 0.9, a: r() * 6, b: r() * 6, w: 2 + r() * 5, ph: r() * 6 });
      mesh.setColorAt(i, cols[i % cols.length]);
    }
    mesh.frustumCulled = false; mesh.visible = false;
    const update = (dt) => {
      for (let i = 0; i < N; i++) {
        const p = P[i];
        if (p.y > 0.02) { p.ph += dt * 2; p.y -= p.vy * dt; p.x += Math.sin(p.ph) * 0.6 * dt; p.a += p.w * dt; p.b += p.w * 0.7 * dt; }
        else { p.y = 0.015; p.a = Math.PI / 2; }
        q.setFromEuler(e.set(p.a, p.b, 0)); m.compose(v.set(p.x, p.y, p.z), q, one); mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };
    update(0);
    return { mesh, update, dispose: () => { geo.dispose(); mesh.material.dispose(); mesh.dispose(); } };
  }
  newGame() {
    const o = this.o; useFormat(o.format, o.surface);
    const g = new FutbolGame({ format: o.format, surface: o.surface, mode: o.mode === 'penalties' ? 'penalties' : 'match', level: o.level, duration: o.duration, assist: o.assist, autoplay: o.autoplay, cup: o.cup, kicks: o.kicks, seed: o.seed });
    if (o.mode === 'reto') this.reto = new Reto(o.reto, g, this);
    return g;
  }
  run() {
    return new Promise((res) => {
      this.res = res;
      this.live = true;
      const V = this.field.venue;
      this.hud.msg(this.o.venueName || V.name, `${this.home.name} – ${this.away.name}`, 2600);
      this.audio.resume(); this.audio.whistle(1);
    });
  }
  begin() {
    const o = this.o, g = this.game;
    if (this.reto) { this.reto.start(); return; }
    if (o.tutorial && o.mode === 'match') { this.tuto = new Tutorial(g, this); this.tuto.start(); return; }
    g.start();
  }

  // ---------------------------------------------------------------- entrada
  press(a) { if (this.paused || this.replay) return; if (this.intro > 0) { this.skipIntro(); return; } this.audio.resume(); this.game.press(a); if (a === 'pass' || a === 'shoot') this.tuto?.pressed(a); }
  release(a) { if (this.paused) return; this.game.release(a); }
  key(e, down) {
    if (this.done || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
    const k = e.key.toLowerCase();
    const mine = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'j', 'k', 'l', 'c', 'shift', 'escape', ' ', 'e', 'q', 'h'];
    if (!mine.includes(k)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    // J (o espacio) pase / robar · K (o E) tiro / entrada · Mayús sprint · L (o Q) cambiar
    const act = { j: 'pass', ' ': 'pass', k: 'shoot', e: 'shoot' }[k];
    if (down) {
      if (this.keys.has(k)) return; this.keys.add(k);
      if (act) this.press(act);
      if (k === 'l' || k === 'q') this.press('switch'); if (k === 'c') this.nextCam(); if (k === 'escape') this.pauseMenu(); if (k === 'h') this.showControls();
    } else {
      this.keys.delete(k);
      if (act) this.release(act);
    }
  }
  // mando (API de gamepads, distribución estándar): A pase / robar · B o X tiro / entrada · LB o RB cambiar ·
  // RT sprint · Start pausa
  pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : null;
    const gp = pads && Array.from(pads).find(p => p && p.connected && p.buttons?.length >= 10);
    if (!gp) { this.padAx = null; return; }
    if (!this.padOn) { this.padOn = true; this.hud.say('Mando conectado', 1400); }
    const b = gp.buttons.map(x => x.pressed || x.value > 0.5), prev = this.padPrev || [], held = (this.padHeld ||= {});
    const map = { 0: 'pass', 1: 'shoot', 2: 'shoot', 4: 'switch', 5: 'switch' };
    for (let i = 0; i < b.length; i++) {
      if (b[i] && !prev[i]) { if (i === 9) this.pauseMenu(); else if (map[i]) { held[i] = map[i]; this.press(map[i]); } }
      else if (!b[i] && prev[i] && held[i]) { this.release(held[i]); delete held[i]; }
    }
    this.padPrev = b;
    const dz = (v) => Math.abs(v) < 0.15 ? 0 : v;
    this.padAx = [dz(gp.axes[0] || 0), dz(gp.axes[1] || 0)]; this.padSprint = !!b[7];
  }
  async showControls() { if (this.paused || this.done) return; this.paused = true; await this.hud.controls(); this.paused = false; }
  // joystick o teclas → dirección en el suelo según la cámara (arriba en la pantalla = alejarse de la cámara)
  moveInput() {
    const K2 = this.keys, st = this.hud.stick;
    this.pollPad();
    let sx = st.x, sy = st.y;
    if (this.padAx) { sx += this.padAx[0]; sy -= this.padAx[1]; }
    if (K2.has('w') || K2.has('arrowup')) sy += 1; if (K2.has('s') || K2.has('arrowdown')) sy -= 1;
    if (K2.has('a') || K2.has('arrowleft')) sx -= 1; if (K2.has('d') || K2.has('arrowright')) sx += 1;
    // zona muerta del 12 % (el pulgar apoyado no mueve al jugador) y de ahí a tope, sin escalón
    const raw = Math.min(1, Math.hypot(sx, sy)), m = raw < 0.12 ? 0 : (raw - 0.12) / 0.88; if (raw > 1e-3) { const l = Math.hypot(sx, sy); sx /= l; sy /= l; }
    const f = new THREE.Vector3(); this.camera.getWorldDirection(f); f.y = 0; if (f.lengthSq() < 1e-6) f.set(0, 0, -1); f.normalize();
    const rx = -f.z, rz = f.x;
    const wx = rx * sx + f.x * sy, wz = rz * sx + f.z * sy;
    this.game.setMove(wx, wz, m, K2.has('shift') || this.hud.held.sprint || !!this.padSprint);
  }
  nextCam() { this.camMode = CAMS[(CAMS.indexOf(this.camMode) + 1) % CAMS.length]; this.hud.say(CAM_NAME[this.camMode], 1200); }
  async pauseMenu() {
    if (this.paused || this.done) return; this.paused = true;
    const r = await this.hud.pause(); this.paused = false;
    if (r === 'quit') this.exit({ quit: true });
  }

  // ---------------------------------------------------------------- bucle
  update(dt) {
    if (this.done) return;
    dt = Math.min(dt, 0.1); this.t += dt;
    const g = this.game;
    this.audio.update(dt, this.tension());
    if (this.paused) { this.field.tick(dt, this.t, this.camera, 0.2, 0); return; }
    // hasta que run() arranca (el fundido de entrada), solo se dibuja la presentación
    if (!this.live) { this.sync(dt); this.cam(dt); return; }
    if (this.intro > 0) { this.intro -= dt; this.introStep(dt); this.sync(dt); this.cam(dt); if (this.intro <= 0) { this.confetti.mesh.visible = false; this.begin(); this.cam(dt, true); } return; }
    if (this.replay) { this.playReplay(dt); return; }
    this.moveInput();
    this.tuto?.update(dt); this.reto?.update(dt);
    g.update(dt * this.o.timeScale);
    for (const e of g.drain()) this.onEvent(e);
    if (this.done) return;
    this.record();
    this.sync(dt); this.cam(dt); this.drawHud();
  }
  tension() {
    const g = this.game, B = g.ball.p; if (!g) return 0.25;
    if (g.phase !== 'play') return 0.25;
    const near = Math.max(0, 1 - (F.HL - Math.abs(B.x)) / 25);
    return 0.25 + near * 0.35;
  }
  // eventos de la lógica → sonido, mensajes y animaciones
  onEvent(e) {
    const g = this.game, H = this.hud, A = this.audio, P = (id) => g.players[id];
    const name = (p) => p ? `el ${p.num}${p.team === 0 ? '' : ' visitante'}` : '';
    switch (e.t) {
      case 'kick': if (e.kind !== 'throw') A.kick(e.power); this.anim(P(e.p), e.kind === 'throw' ? 'throw' : 'kick');
        if (P(e.p) === g.me && !g.autoplay) try { navigator.vibrate?.(e.kind === 'shot' ? 22 : 12); } catch (err) { /* sin vibración */ }
        break;
      case 'touch': if (P(e.p) === g.me) A.touch(); break;
      case 'post': case 'bar': A.post(); A.ooh(); H.say(e.t === 'post' ? TEXT.post : TEXT.bar); break;
      case 'net': A.net(); this.field.netHit(e.side, g.ball.p.z, g.ball.p.y, g.ball.speed + 6); break;
      case 'netOut': A.net(); this.field.netHit(e.side, g.ball.p.z, g.ball.p.y, 3); break;
      case 'board': A.board(); break;
      case 'whistle': A.whistle(e.n); break;
      case 'save': A.ooh(); H.say(e.catch ? TEXT.catch : TEXT.save); this.anim(P(e.p), 'save'); break;
      case 'miss': A.groan(); if (e.team === 0) H.say('¡Fuera por poco!'); break;
      case 'blocked': H.say('¡Tiro bloqueado!'); break;
      case 'shot': A.bump(0.6, 1.2); break;
      case 'steal': if (P(e.p).team === 0) H.say(e.how === 'entrada' ? '¡Qué entrada!' : TEXT.steal, 1200); else if (P(e.from) === g.me) H.say('¡Te han robado el balón!', 1200); this.tuto?.stole(e); break;
      case 'tackle': this.anim(P(e.p), e.kind === 'slide' ? 'slide' : 'robo'); break;
      case 'foul':
        H.msg(e.penalty ? TEXT.penalty : TEXT.foul, e.penalty ? 'Falta dentro del área' : e.over ? TEXT.fouls6 : RU.foulLimit ? `De ${name(P(e.p))} · ${e.acc}.ª falta` : `De ${name(P(e.p))}`, 1800);
        A.groan(); this.anim(P(e.on), 'fall'); if (RU.foulLimit) H.setFouls?.(g.fouls[0], g.fouls[1], RU.foulLimit); break;
      case 'fourSec': H.say(TEXT.fourSec + ' Saca el otro equipo', 1600); break;
      case 'out': {
        // quién saca: siempre el rival del último que la tocó (en el de banda y el córner) o el que defiende esa portería
        const who = e.team === 0 ? this.home.short : this.away.short;
        H.say(e.type === 'throwin' ? `${TEXT.out} · ${TEXT.throwin.toLowerCase()} para ${who}` : `${e.type === 'corner' ? TEXT.corner : TEXT.goalkick} para ${who}`, 1800);
        break;
      }
      case 'noGoal': H.msg('No vale el gol', e.why === 'throwin' ? 'No se puede marcar directamente de un saque de banda' : e.why === 'indirect' ? 'Tiro libre indirecto: la tiene que tocar otro jugador' : e.why === 'own' ? 'Un saque directo a tu propia portería es córner' : 'El portero no puede marcar lanzando con la mano', 2200); A.groan(); break;
      case 'offside': H.say(`${TEXT.offside}${P(e.p).team === 0 ? ' de ' + name(P(e.p)) : ''}`, 1600); break;
      case 'restart':
        if (e.type === 'penalty') H.msg(TEXT.penalty, e.team === 0 ? 'Apunta con el joystick y mantén TIRO' : 'Para el tiro… ¡tu portero está atento!', 2000);
        else if (this.reto || this.tuto) break;   // (en los retos y el tutorial no hay saques que anunciar)
        else if (e.team === 0 && !g.autoplay && e.type !== 'goalkick') H.say(`${RESTART_NAME[e.type]}: tu saque. Apunta y pulsa ${this.hud.el.pass ? 'PASE' : 'J'}`, 2200);
        else if (e.type !== 'kickoff') H.say(e.noWall ? TEXT.double : RESTART_NAME[e.type], 1300);
        if (e.noWall && e.team === 0 && !g.autoplay) H.say(`${TEXT.double}, sin barrera: mantén ${this.hud.el.pass ? 'TIRO' : 'K'}`, 2200);
        break;
      case 'goal': this.onGoal(e); break;
      case 'replay': this.startReplay(); break;
      case 'half': H.msg(TEXT.half, `${g.score[0]} – ${g.score[1]}`, 2800); A.bump(0.4, 2); break;
      case 'second': H.msg(TEXT.second, RU.foulLimit ? 'Se cambia de campo y las faltas vuelven a cero' : 'Se cambia de campo', 1800); if (RU.foulLimit) H.setFouls?.(0, 0, RU.foulLimit); break;
      case 'toPenalties': H.msg('¡Penaltis!', 'Empate: se decide en la tanda', 2400); break;
      case 'penTurn': this.penTurn(e); break;
      case 'penResult': H.pens(e.log, g.pen.kicks); H.say(e.res === 'goal' ? (e.team === 0 ? '¡Gol!' : 'Gol del rival') : e.res === 'save' ? (e.team === 0 ? 'Lo ha parado el portero' : '¡Lo has parado!') : '¡Fuera!', 1500); if (e.res !== 'goal') (e.team === 1 ? A.roar() : A.groan()); break;
      case 'end': this.onEnd(e.result); break;
      case 'switch': break;
    }
  }
  onGoal(e) {
    const g = this.game, H = this.hud, sc = e.scorer != null ? g.players[e.scorer] : null;
    H.setScore(g.score[0], g.score[1]); this.field.setScore?.(g.score[0], g.score[1]);
    if (e.pen) return;
    const mine = e.team === 0;
    H.msg(TEXT.goal, e.own ? 'En propia puerta' : `${mine ? this.home.name : this.away.name}: ${sc ? 'el ' + sc.num : ''}`, 3000, 'goal');
    this.audio.roar(); this.field.cheer(true); this.cheerT = 3.2;
    this.goalAt = g.time; this.goalTeam = e.team;
  }
  penTurn(e) {
    const H = this.hud, g = this.game;
    H.pens(g.pen.log, g.pen.kicks);
    H.setButtons(e.human === 'keeper' ? 'PARAR' : 'PASE', e.human === 'keeper' ? 'PARAR' : 'TIRO');
    H.tip(e.human === 'keeper' ? 'Te toca parar: elige lado con el joystick y pulsa <b>PARAR</b>' : e.human === 'shooter' ? 'Apunta a un lado de la portería, mantén <b>TIRO</b> y suelta para chutar' : null);
    if (e.sudden && e.n === 1 && e.team === 0) H.msg('Muerte súbita', '', 1600);
  }
  async onEnd(r) {
    if (this.ended) return; this.ended = true;
    const g = this.game, H = this.hud, S = g.stats;
    H.tip(null);
    await new Promise(r2 => setTimeout(r2, 1400));
    const pos = S.poss[0] + S.poss[1] || 1, pct = (t) => Math.round(S.poss[t] / pos * 100) + ' %';
    const rows = g.mode === 'penalties' && !g.cupPens ? [] : [[g.score[0], 'Goles', g.score[1]], [S.shots[0], 'Tiros', S.shots[1]], [S.onTarget[0], 'Tiros a puerta', S.onTarget[1]], [pct(0), 'Posesión', pct(1)], [S.passesOk[0], 'Pases buenos', S.passesOk[1]], [S.steals[0], 'Robos', S.steals[1]], [S.saves[0], 'Paradas', S.saves[1]]];
    const pens = r.pens ? ` (penaltis ${r.pens[0]}-${r.pens[1]})` : '';
    const title = r.win ? '¡Victoria!' : r.draw ? 'Empate' : 'Derrota';
    const score = g.mode === 'penalties' && !g.cupPens ? `${r.pens[0]} – ${r.pens[1]}` : `${g.score[0]} – ${g.score[1]}${pens}`;
    this.result = { ...r, mode: this.o.mode, level: this.o.level };
    this.o.onResult?.(this.result);
    const choice = await H.end({ title, sub: TEXT.end, score, rows, again: 'Revancha', exit: 'Salir' });
    if (choice === 'again') this.restart(); else this.exit(this.result);
  }
  async onRetoEnd(r) {
    if (this.ended) return; this.ended = true;
    this.result = { ...r, mode: 'reto' }; this.o.onResult?.(this.result);
    await new Promise(r2 => setTimeout(r2, 900));
    const choice = await this.hud.end({ title: r.title, sub: RETOS[r.reto].name, score: r.score, rows: r.rows.map(([a, n, b]) => [a, n, b]), again: 'Repetir', exit: 'Salir' });
    if (choice === 'again') { this.reto?.dispose(); this.reto = null; this.restart(); } else this.exit(this.result);
  }
  restart() {
    this.ended = false; this.replay = null; this.snaps = []; this.tuto = null;
    this.hud.setScore(0, 0); this.field.setScore?.(0, 0); this.hud.tip(null); this.hud.el.pen.classList.remove('on');
    this.game = this.newGame(); this.intro = 1.2; this.camPos = null; this.prepIntro(false);
  }
  exit(result) {
    if (this.done) return; this.done = true;
    this.res?.(result || this.result || { quit: true });
  }

  // ---------------------------------------------------------------- personajes
  anim(p, kind) {
    if (!p) return; const ch = this.chars[p.id]; if (!ch) return;
    const a = ch.c.anim;
    if (kind === 'kick') a.once?.('Hit', 0.42, true);
    else if (kind === 'throw') a.once?.('Hit', 0.5, true);
    else if (kind === 'robo') a.once?.('Hit', 0.3, true);
    else if (kind === 'save') a.once?.('Pick', 0.5, true);
    ch.kind = kind; ch.kindT = kind === 'slide' ? 1.0 : kind === 'fall' ? 1.2 : 0.4;
  }
  sync(dt) {
    const g = this.game, B = g.ball;
    for (const p of g.players) {
      const ch = this.chars[p.id]; if (!ch) continue;
      // entre dos pasos de la física (120 Hz) se interpola la posición para que el dibujo vaya suave a cualquier frecuencia
      const al = g.alpha ?? 1, ix = p.px === undefined ? p.x : p.px + (p.x - p.px) * al, iz = p.pz === undefined ? p.z : p.pz + (p.z - p.pz) * al;
      ch.outer.position.set(ix, 0, iz); ch.outer.rotation.y = p.h;
      const sp = Math.hypot(p.vx, p.vz), a = ch.c.anim;
      // poses del cuerpo entero: estirada del portero, entrada en plancha, caída y celebración
      const pv = ch.pivot; let rx = 0, rz = 0, py = 0, pz = 0;
      if (p.dive) {
        // hacia qué lado del cuerpo se lanza (el eje x local del portero en el mundo es (cos h, −sin h))
        const D = p.dive, k = clamp((D.el || 0) / 0.22, 0, 1), ls = Math.sign(-D.side * Math.sin(p.h)) || D.side;
        rz = -ls * 1.35 * k; py = clamp(D.hy - 0.7, 0, 1.0) * Math.sin(k * Math.PI * 0.5) * (D.t > 0.15 ? 1 : D.t / 0.15);
      } else if (p.slide) { const k = clamp((0.62 - p.slide.t) / 0.12, 0, 1); rx = -1.15 * k; py = -0.18 * k; pz = 0.35 * k; }
      else if (p.down > 0) { if (ch.kind === 'fall') { const k = clamp((1.2 - (ch.kindT || 0)) / 0.25, 0, 1); rx = 1.35 * k; py = -0.05; } else if (p.role === 'POR') { rz = (pv.rotation.z || 0) * 0.92; } else rx = -1.1; }
      pv.rotation.x += (rx - pv.rotation.x) * Math.min(1, dt * 14); pv.rotation.z += (rz - pv.rotation.z) * Math.min(1, dt * 12);
      pv.position.y += (py - pv.position.y) * Math.min(1, dt * 12); pv.position.z += (pz - pv.position.z) * Math.min(1, dt * 12);
      if (ch.kindT > 0) ch.kindT -= dt;
      // celebración: brincos y el clip de celebrar
      if (p.act === 'celebrate') { if (ch.celeb <= 0) { a.once?.('Celebrate', 1.4); ch.celeb = 1.4; } ch.celeb -= dt; } else ch.celeb = 0;
      a.setSpeed?.(p.dive || p.slide || p.down > 0 ? 0 : sp);
      a.update?.(dt);
      // brazos arriba: el que saca de banda, con el balón sobre la cabeza
      ch.c.post?.({ arms: g.restart?.type === 'throwin' && RU.throwHands && g.restart.taker === p ? 'up' : null }, dt);
    }
    // árbitro y asistentes (el asistente levanta el banderín en el fuera de juego)
    g.refs.forEach((r, i) => {
      const ch = this.refChars[i]; if (!ch) return;
      ch.outer.visible = !g.noRefs;
      ch.outer.position.set(r.x, 0, r.z); ch.outer.rotation.y = r.h;
      ch.c.anim.setSpeed?.(Math.hypot(r.vx, r.vz)); ch.c.anim.update?.(dt);
      ch.c.post?.({ arms: r.flag > 0 ? 'flag' : null }, dt);
    });
    // balón: rodando con giro coherente con la velocidad; en las manos del portero, con él
    const bp = B.p, bm = this.ball;
    const al = g.alpha ?? 1, P0 = B.prev, ibx = P0.x + (bp.x - P0.x) * al, iby = P0.y + (bp.y - P0.y) * al, ibz = P0.z + (bp.z - P0.z) * al;
    // de lejos el balón se dibuja algo más grande (hasta el doble), para que no se pierda en la pantalla del móvil
    const camD = this.camera.position.distanceTo(bm.position), big = clamp(camD / 24, 1, 2);
    bm.scale.setScalar(big); bm.position.set(ibx, iby + (K.scale * big - 1) * R, ibz);
    const hs = Math.hypot(B.v.x, B.v.z);
    const last = this.trailHist[0]; if (last && Math.hypot(last[0] - ibx, last[2] - ibz) > 3) this.trailHist.length = 0;   // (saque: el balón se ha colocado en otro sitio)
    this.trailHist.unshift([ibx, iby + (K.scale * big - 1) * R, ibz]); if (this.trailHist.length > 14) this.trailHist.length = 14;
    const showTrail = !B.held && !g.owner && B.speed > 7 && !this.replay;
    this.trail.forEach((sp, i) => {
      const h = this.trailHist[(i + 1) * 2]; sp.visible = showTrail && !!h; if (!sp.visible) return;
      sp.position.set(h[0], h[1], h[2]); const k = 1 - (i + 1) / (this.trail.length + 1); sp.scale.setScalar(R * K.scale * big * 2.4 * (0.5 + 0.5 * k)); sp.material.opacity = 0.55 * k * clamp((B.speed - 7) / 5, 0, 1);
    });
    if (hs > 0.05 && !B.held && dt > 0) { const ax = new THREE.Vector3(B.v.z, 0, -B.v.x).normalize(); bm.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(ax, hs / (R * K.scale) * dt)); }
    this.field.follow?.(bp.x, bp.z);
    const sh = clamp(1 - bp.y / 5, 0.25, 1); this.ballShadow.position.set(bp.x, 0.012, bp.z); this.ballShadow.scale.setScalar((0.7 + (1 - sh) * 0.8) * big); this.ballShadow.material.opacity = sh;
    // anillo del jugador y aro del pase
    const me = g.me, showRing = !g.autoplay && g.mode !== 'penalties' || (g.mode === 'penalties' && g.pen?.human === 'shooter');
    this.ring.visible = showRing && !this.replay && !(this.intro > 0); this.ring.position.set(me.x, 0.03, me.z); this.ring.rotation.y = me.h;
    this.ring.children[0].material.color.set(g.defending() ? '#ffb347' : '#ffe14a');
    this.pin.visible = this.ring.visible; this.pin.position.set(me.x, 2.25 + Math.sin(this.t * 6) * 0.12, me.z); this.pin.rotation.y = this.t * 2;
    this.pin.material.color.copy(this.ring.children[0].material.color);
    const q = g.passTo; this.mark.visible = !!q && q.team === 0 && q !== me; if (q) this.mark.position.set(q.x, 0.03, q.z);
    // público: se anima con las ocasiones y celebra los goles
    if (this.cheerT > 0 && (this.cheerT -= dt) <= 0) this.field.cheer(false);
    this.field.tick(dt, this.t, this.camera, this.cheerT > 0 ? 1 : 0.2 + this.tension() * 0.6, bp.z);
  }

  // ---------------------------------------------------------------- repetición del gol
  record() {
    const g = this.game; if (g.phase !== 'play' && g.phase !== 'goal') return;
    if (g.phase === 'goal' && g.phaseT > 0.8) return;
    const b = g.ball.p;
    this.snaps.push({ t: g.time, b: [b.x, b.y, b.z], q: this.ball.quaternion.clone(), p: g.players.map(p => [p.x, p.z, p.h, Math.hypot(p.vx, p.vz), p.act, p.dive ? { ...p.dive } : null, p.slide ? { ...p.slide } : null, p.down]), r: g.refs.map(r => [r.x, r.z, r.h, Math.hypot(r.vx, r.vz)]) });
    while (this.snaps.length && this.snaps[0].t < g.time - 5) this.snaps.shift();
  }
  startReplay() {
    // los últimos 1,2 s antes del gol, en 3 s: a cámara lenta (0,4×), desde detrás de la portería
    const at = this.goalAt ?? this.game.time, from = at - 1.0, to = at + 0.2;
    const frames = this.snaps.filter(s => s.t >= from && s.t <= to);
    if (frames.length < 10) return;
    this.replay = { frames, i: 0, t: 0, len: frames[frames.length - 1].t - frames[0].t, dur: 3.0, side: Math.sign(frames[frames.length - 1].b[0]) || 1 };
    this.hud.say('Repetición', 3000); this.hud.el.msg.classList.remove('on');
  }
  playReplay(dt) {
    const R2 = this.replay; R2.t += dt;
    const k = Math.min(1, R2.t / R2.dur), tt = R2.frames[0].t + k * R2.len;
    while (R2.i < R2.frames.length - 2 && R2.frames[R2.i + 1].t < tt) R2.i++;
    const f = R2.frames[R2.i], g = this.game;
    g.players.forEach((p, j) => {
      const [x, z, h, sp, act, dive, slide, down] = f.p[j], ch = this.chars[p.id];
      ch.outer.position.set(x, 0, z); ch.outer.rotation.y = h;
      if (act === 'kick' && ch.ract !== 'kick') ch.c.anim.once?.('Hit', 0.6, true);
      ch.ract = act; ch.c.anim.setSpeed?.(dive || slide || down > 0 ? 0 : sp * (R2.len / R2.dur)); ch.c.anim.update?.(dt * (R2.len / R2.dur));
      const pv = ch.pivot; pv.rotation.z += ((dive ? -(Math.sign(-dive.side * Math.sin(h)) || dive.side) * 1.3 : 0) - pv.rotation.z) * Math.min(1, dt * 8); pv.rotation.x += ((slide ? -1.1 : 0) - pv.rotation.x) * Math.min(1, dt * 8);
    });
    f.r?.forEach(([x, z, h, sp], i) => { const ch = this.refChars[i]; if (!ch) return; ch.outer.position.set(x, 0, z); ch.outer.rotation.y = h; ch.c.anim.setSpeed?.(sp * (R2.len / R2.dur)); ch.c.anim.update?.(dt * (R2.len / R2.dur)); });
    this.ball.position.set(f.b[0], f.b[1] + (K.scale - 1) * R, f.b[2]); this.ball.quaternion.copy(f.q);
    this.ballShadow.position.set(f.b[0], 0.012, f.b[2]);
    this.ring.visible = false; this.mark.visible = false;
    // cámara: desde detrás de la portería, baja y a un lado
    const s = R2.side, c = this.camera, gz = f.b[2];
    c.fov = 38; c.updateProjectionMatrix();
    const kk = F.areaD ? 0.45 : 1;
    c.position.set(s * (F.HL + 8 * kk), 3.2 * Math.max(kk, 0.7), gz * 0.5 + 6.5 * kk * (gz >= 0 ? -1 : 1)); c.lookAt(f.b[0] * 0.6 + s * F.HL * 0.4, 1.1, f.b[2] * 0.7);
    this.field.tick(dt, this.t, c, 1, f.b[2]);
    if (R2.t >= R2.dur) { this.replay = null; this.camPos = null; this.hud.el.say.classList.remove('on'); this.game.afterGoal(); }
  }

  // ---------------------------------------------------------------- cámara
  cam(dt, snap = false) {
    const g = this.game, c = this.camera, B = g.ball.p;
    let pos, look, fov = 45;
    if (this.intro > 0) {
      // presentación: llega desde fuera, por encima de la cubierta (se ve el estadio entero), y baja hasta el campo
      const t = this.introLen - this.intro, ss = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
      if (this.lineup && t >= 3 && t < 6) {
        // a ras de suelo, recorriendo la fila de jugadores
        const W = 1.7 + ROLES.length * 1.15 + 1, Z = Math.min(8, F.HW * 0.35), e = ss((t - 3) / 3), x = -W + e * 2 * W;
        pos = new THREE.Vector3(x, 1.7, Z + 5.2); look = new THREE.Vector3(x + 2.5, 1.25, Z); fov = 38;
      } else if (this.lineup && t >= 6) {
        // el campo entero desde lo alto (por dentro del hueco de la cubierta), bajando a la cámara de televisión
        const e = ss((t - 6) / 2.2), k = F.L / 105, tv = this.tvCam(true);
        const p0 = new THREE.Vector3(-40 * k, 36 * Math.max(k, 0.5), 16 * k), l0 = new THREE.Vector3(4 * k, 0, -3 * k);
        pos = p0.lerp(tv.pos, e); look = l0.lerp(tv.look, e); fov = 55 + (tv.fov - 55) * e;
      } else {
        // llega desde fuera, por encima de la cubierta (se ve el estadio entero), y baja hacia el centro del campo
        const k = clamp(this.lineup ? t / 3 : 1 - this.intro / this.introLen, 0, 1), e = k * k * (3 - 2 * k), a = -0.75 + e * 0.55;
        const sk = Math.max(F.L / 105, 0.45), r = (205 - e * (this.lineup ? 150 : 165)) * sk, h = (95 - e * (this.lineup ? 60 : 50)) * Math.max(sk, 0.6);
        pos = new THREE.Vector3(Math.sin(a) * r * 1.1, h, Math.cos(a) * r); look = new THREE.Vector3(0, 6 - e * 5, this.lineup ? e * 6 : 0); fov = 46;
      }
    } else if (g.mode === 'penalties' || g.restart?.type === 'penalty' && g.phase !== 'play') {
      // penaltis: detrás del que tira (o detrás de la portería si paras tú)
      const P = g.pen, gx = g.restart?.type === 'penalty' && g.mode !== 'penalties' ? g.goalX(g.restart.team) : F.HL, s = Math.sign(gx);
      if (P?.human === 'keeper') { pos = new THREE.Vector3(gx + s * 4.5, 2.4, 0.01); look = new THREE.Vector3(gx - s * 8, 0.6, 0); fov = 50; }
      else { pos = new THREE.Vector3(gx - s * (F.spot + 5.5), 2.6, 1.2); look = new THREE.Vector3(gx, 1.0, 0); fov = 42; }
    } else if (g.phase === 'goal' && this.goalTeam !== undefined) {
      // tras el gol: cerca de quien celebra
      const sc = g.players.find(p => p.act === 'celebrate' && p === g.last) || g.players.find(p => p.act === 'celebrate');
      const t = sc || { x: B.x, z: B.z }; pos = new THREE.Vector3(t.x - 5, 3.2, t.z + 6); look = new THREE.Vector3(t.x, 1.1, t.z); fov = 40;
    } else if (this.camMode === 'detras' && !this.reto?.fixedCam) {
      const me = g.me, s = g.dir[me.team];
      const k = F.areaD ? 0.7 : 1;
      pos = new THREE.Vector3(me.x - s * 11 * k, 7.5 * k, me.z * 0.88); look = new THREE.Vector3(me.x + s * 8 * k, 0.4, me.z * 0.9 + (B.z - me.z) * 0.25); fov = 52;
    } else {
      ({ pos, look, fov } = this.tvCam(false, dt));
      if (this.reto?.cam) ({ pos, look, fov } = this.reto.cam(pos, look, fov));
    }
    if (Math.abs(c.fov - fov) > 0.01) { c.fov += (fov - c.fov) * Math.min(1, dt * 2.5); if (snap) c.fov = fov; c.updateProjectionMatrix(); }
    if (!this.camPos || snap) { this.camPos = pos.clone(); this.camLook = look.clone(); }
    const k = 1 - Math.exp(-4 * dt);
    this.camPos.lerp(pos, k); this.camLook.lerp(look, k);
    c.position.copy(this.camPos); c.lookAt(this.camLook);
  }
  // retransmisión: como la cámara principal de la tele, en lo alto de la tribuna, siguiendo al balón a lo largo y
  // adelantándose hacia donde va el juego.
  //   · fútbol 11: a 22 m de la banda y 21 m de altura, con el zoom justo para ver unos 21 m de campo alrededor del balón;
  //   · sala: a 18 m de la banda y 14 m de altura, FOV de 45° como mucho y zoom según lo dispersos que estén los jugadores.
  // En el móvil apaisado, más zoom (si no, los jugadores salen diminutos)
  tvCam(still = false, dt = 0) {
    const g = this.game, B = g.ball.p, own = g.owner, sala = !!F.areaD;
    const lead = clamp(g.ball.v.x * 0.35 + (own ? g.dir[own.team] * (sala ? 3 : 4) : 0), sala ? -4 : -9, sala ? 4 : 9);
    if (!still) this.lead = (this.lead ?? 0) + (lead - (this.lead ?? 0)) * Math.min(1, dt * 1.5);
    const ld = still ? 0 : this.lead, phone = innerHeight < 520 && this.camera.aspect >= 1.2;
    const x = sala ? clamp(B.x * 0.8 + ld, -F.HL + 6, F.HL - 6) : clamp(B.x * 0.94 + ld, -F.HL + 10, F.HL - 10);
    const lz = B.z * (sala ? 0.6 : 0.85) - (sala ? 1 : 2), cz = F.HW + (sala ? 18 : 22), cy = sala ? 14 : 21;
    const dist = Math.hypot(cz - lz, cy);
    let span = this.camera.aspect < 1.2 ? 30 : phone ? 15 : 21;
    if (sala) {
      // lo que ocupan los jugadores de campo alrededor del balón (a lo ancho de la pantalla), entre 14 y 26 m
      let lo = B.x, hi = B.x; for (const p of g.players) if (p.role !== 'POR' && Math.abs(p.x - B.x) < 14) { lo = Math.min(lo, p.x); hi = Math.max(hi, p.x); }
      const wide = clamp(hi - lo + 6, 14, 26) / Math.max(1, this.camera.aspect) * 1.25;
      span = clamp(wide, phone ? 8 : 10, this.camera.aspect < 1.2 ? 26 : 18);
    }
    const fov = clamp(2 * Math.atan(span / 2 / dist) * 180 / Math.PI, phone ? 11 : 16, sala ? 45 : 42);
    return { pos: new THREE.Vector3(x, cy, cz), look: new THREE.Vector3(x, 0, lz), fov };
  }
  drawHud() {
    const g = this.game, H = this.hud, me = g.me;
    // reloj como en la tele: de 0 a 45 minutos en la primera parte y de 45 a 90 en la segunda (en sala, 20 y 40); en
    // los retos, la cuenta atrás
    if (this.reto) H.setClock(g.halfLen - g.clock, g.half, this.reto.label());
    else if (g.mode !== 'penalties') H.setClock(Math.floor(((g.half - 1) + Math.min(1, g.clock / g.halfLen)) * (RU.period || 45) * 60), g.half);
    if (g.mode !== 'penalties' && !this.reto) H.setMode(g.owner ? (g.owner.team === g.me.team ? 'atk' : 'def') : 'loose');
    H.bars(me.energy, g.charge);
    // flecha en el borde si tu jugador no se ve
    if (!this.ring.visible) { H.arrow(null); return; }
    const v = new THREE.Vector3(me.x, 1, me.z).project(this.camera);
    if (v.z < 1 && Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.92) { H.arrow(null); return; }
    let x = v.x, y = v.y; if (v.z >= 1) { x = -x; y = -y; }
    const m = Math.max(Math.abs(x) / 0.9, Math.abs(y) / 0.85, 1e-3); x /= m; y /= m;
    H.arrow((x + 1) / 2 * innerWidth, (1 - y) / 2 * innerHeight, Math.atan2(x, y));
  }
  dispose() {
    removeEventListener('keydown', this.onKey, true); removeEventListener('keyup', this.onKeyUp, true); removeEventListener('resize', this.onResize); document.removeEventListener('visibilitychange', this.onHide);
    for (const ch of [...(this.chars || []), ...(this.refChars || [])]) { try { ch.c.dispose?.(); } catch (e) { } }
    for (const m of this.roofMats || []) m.dispose();
    this.reto?.dispose?.(); this.confetti?.dispose(); removeEventListener('pointerdown', this.onTap);
    this.ball?.geometry.dispose(); this.ball?.material.dispose(); this.ballTex?.dispose(); this.blobTex?.dispose(); this.trailTex?.dispose(); this.trail?.forEach(sp => sp.material.dispose());
    this.ballShadow?.geometry.dispose(); this.ballShadow?.material.dispose();
    this.ring?.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); this.mark?.geometry.dispose(); this.mark?.material.dispose();
    this.field?.dispose(); this.hud?.dispose(); this.audio?.dispose();
  }
}

// ---------------------------------------------------------------- tutorial de la primera vez (60 s)
// moverse → pasar → tirar → robar; los rivales esperan quietos hasta el último paso
class Tutorial {
  constructor(g, view) { this.g = g; this.v = view; this.step = 0; this.t = 0; }
  start() {
    const g = this.g; g.kickoff(0); g.restart = null; g.setPhase('tuto'); g.owner = null;
    for (const p of g.players) { p.react = 99; }
    // (en la pista de sala, todo a escala)
    const k = RU.scale, me = g.byRole(0, RU.kick[0]); g.setMe(me, 'tuto'); me.x = 22 * k; me.z = 0; me.h = Math.PI / 2; me.react = 0;
    g.ball.set(22 * k + 0.6, 0); g.takeBall(me);
    const mate = g.byRole(0, RU.kick[1]); this.mate = mate; mate.x = 32 * k; mate.z = -8 * k; mate.react = 99;
    // los rivales, apartados (menos el portero)
    for (const p of g.team(1)) if (p.role !== 'POR') { const i = p.id % ROLES.length; p.x = (2 + (i % 4) * 5) * k; p.z = (i % 2 ? -1 : 1) * Math.min(18 + (i % 3) * 4, F.HW - 1); }
    this.start0 = { x: me.x, z: me.z }; this.next(0);
  }
  next(i) {
    this.step = i; this.st = 0;
    const tips = [
      this.v.hud.el.pass ? 'Muévete con el <b>joystick</b>: toca y arrastra a la izquierda' : 'Muévete con <b>WASD</b> o las flechas',
      `Pasa a tu compañero: apunta hacia él y suelta <b>${this.v.hud.el.pass ? 'PASE' : 'J'}</b>`,
      `¡A puerta! Mantén <b>${this.v.hud.el.pass ? 'TIRO' : 'K'}</b> para cargar y suelta para chutar`,
      `Acércate al rival y pulsa <b>${this.v.hud.el.pass ? 'ROBAR' : 'J'}</b> pegado a él`,
      '¡Ya sabes jugar! Empieza el partido',
    ];
    this.v.hud.tip(tips[i]);
    if (i === 3) {
      const g = this.g, r = g.byRole(1, ROLES[2]), me = g.me;
      for (const p of g.team(0)) if (p !== me && p.role !== 'POR') { p.react = 99; p.wx = p.wz = 0; }
      g.owner = null; r.x = me.x + 6 * Math.max(RU.scale, 0.7); r.z = me.z; r.react = 0; g.ball.set(r.x - 0.6, r.z); g.takeBall(r);
      r.h = -Math.PI / 2; this.carrier = r;
    }
    if (i === 4) setTimeout(() => { this.v.hud.tip(null); this.v.tuto = null; this.v.o.onTutorialDone?.(); this.g.start(); }, 1800);
  }
  pressed() {}
  stole(e) { if (this.step === 3 && this.g.players[e.p] === this.g.me) { this.v.hud.say('¡Muy bien!', 1000); this.next(4); } }
  update(dt) {
    const g = this.g, me = g.me; this.t += dt; this.st += dt;
    if (this.step >= 4) return;
    if (this.t > 60) { this.next(4); return; }
    // en el entrenamiento el balón que sale vuelve a tus pies (en el partido, saca el rival: se avisa)
    const B = g.ball.p; if (Math.abs(B.x) > F.HL + 0.5 || Math.abs(B.z) > F.HW + 0.5) { g.ball.set(me.x + 0.6, me.z); this.v.hud.say('Fuera. En el partido sacará el rival; ahora, sigue practicando', 1800); }
    if (this.step === 0 && Math.hypot(me.x - this.start0.x, me.z - this.start0.z) > 3) this.next(1);
    if (this.step === 1) { const mate = this.mate; mate.wx = mate.wz = 0; if (g.stats.passesOk[0] > 0) this.next(2); }
    if (this.step === 2) { if (!g.owner && !g.passTo && this.st > 1.5 && g.stats.shots[0] === 0 && Math.hypot(B.x - me.x, B.z - me.z) > 3) { g.ball.set(me.x + 0.6, me.z); g.takeBall(me); } if (g.stats.shots[0] > 0 && this.st > 0.3) this.waitShot = (this.waitShot || 0) + dt; if (this.waitShot > 1.6) this.next(3); }
    if (this.step === 3) {
      const r = this.carrier;
      // el rival conduce despacio hacia tu portería
      if (g.owner === r) { r.react = 0; r.plan = { kind: 'dribble', dx: -1, dz: 0, v: 1, speed: 2.4 }; r.think = 1; }
      if (!g.owner && this.st > 2) { g.owner = null; r.x = me.x + 6; r.z = me.z; g.ball.set(r.x - 0.6, r.z); g.takeBall(r); }
    }
  }
}
