// Vista del partido: une la lógica (game.js), el campo (field.js), los personajes, la cámara, la interfaz (hud.js), el
// sonido (audio.js) y la entrada (teclado y táctil). El anfitrión llama a update(dt) en cada fotograma y dibuja
// scene con camera. run() devuelve una promesa con el resultado cuando el jugador sale.
import * as THREE from 'three';
import { FIELD as F, PHYS as K, TEAMS, TEXT, RETOS } from './rules.js';
import { FutbolGame } from './game.js';
import { buildField, ballTexture, roofShade } from './field.js';
import { FutbolHud } from './hud.js';
import { FutbolAudio } from './audio.js';
import { Reto } from './retos.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const R = K.R;

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
    this.home = TEAMS[this.o.home] || TEAMS.osasuna; this.away = TEAMS[this.o.away] || TEAMS.visitante;
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
    // en calidad baja, sin sombras de verdad: una mancha bajo cada jugador
    if (o.quality === 'low') for (const ch of [...this.chars, ...this.refChars]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), blobMat); m.rotation.x = -Math.PI / 2; m.position.y = 0.015; ch.outer.add(m); }
    // anillo amarillo (con una flecha hacia donde mira) bajo el jugador que controlas
    const ringG = new THREE.RingGeometry(0.46, 0.6, 36), tri = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.17, 0, 0.66), new THREE.Vector3(0.17, 0, 0.66), new THREE.Vector3(0, 0, 0.92)]);
    ringG.rotateX(-Math.PI / 2); tri.computeVertexNormals();
    const ringM = new THREE.MeshBasicMaterial({ color: '#ffe14a', transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide });
    this.ring = new THREE.Group(); this.ring.add(new THREE.Mesh(ringG, ringM), new THREE.Mesh(tri, ringM)); this.ring.position.y = 0.03; this.ring.renderOrder = 2; this.scene.add(this.ring);
    // a quién va el pase: un aro azul
    this.mark = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.5, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#7ad7ff', transparent: true, opacity: 0.8, depthWrite: false })); this.mark.visible = false; this.scene.add(this.mark);
    this.audio = new FutbolAudio(o.audio || {});
    this.hud = new FutbolHud({ touch: o.touch ?? matchMedia('(pointer:coarse)').matches, home: this.home, away: this.away,
      onPress: (a) => this.press(a), onRelease: (a) => this.release(a), onPause: () => this.pauseMenu(), onCam: () => this.nextCam() });
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
    const Z = 8;
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
      P.push({ x: (r() - 0.5) * 44, y: 1 + r() * 16, z: -4 + r() * 18, vy: 0.9 + r() * 0.9, a: r() * 6, b: r() * 6, w: 2 + r() * 5, ph: r() * 6 });
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
    const o = this.o, g = new FutbolGame({ mode: o.mode === 'penalties' ? 'penalties' : 'match', level: o.level, duration: o.duration, assist: o.assist, autoplay: o.autoplay, cup: o.cup, kicks: o.kicks, seed: o.seed });
    if (o.mode === 'reto') this.reto = new Reto(o.reto, g, this);
    return g;
  }
  run() {
    return new Promise((res) => {
      this.res = res;
      this.live = true;
      const V = this.field.venue;
      this.hud.msg(V.name, `${this.home.name} – ${this.away.name}`, 2600);
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
    const mine = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'j', 'k', 'l', 'c', 'shift', 'escape', ' ', 'e', 'q'];
    if (!mine.includes(k)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (down) {
      if (this.keys.has(k)) return; this.keys.add(k);
      if (k === 'j' || k === ' ') this.press('pass'); if (k === 'k' || k === 'e') this.press('shoot');
      if (k === 'l' || k === 'q') this.press('switch'); if (k === 'c') this.nextCam(); if (k === 'escape') this.pauseMenu();
    } else {
      this.keys.delete(k);
      if (k === 'j' || k === ' ') this.release('pass'); if (k === 'k' || k === 'e') this.release('shoot');
    }
  }
  // joystick o teclas → dirección en el suelo según la cámara (arriba en la pantalla = alejarse de la cámara)
  moveInput() {
    const K2 = this.keys, st = this.hud.stick;
    let sx = st.x, sy = st.y;
    if (K2.has('w') || K2.has('arrowup')) sy += 1; if (K2.has('s') || K2.has('arrowdown')) sy -= 1;
    if (K2.has('a') || K2.has('arrowleft')) sx -= 1; if (K2.has('d') || K2.has('arrowright')) sx += 1;
    const m = Math.min(1, Math.hypot(sx, sy)); if (m > 1e-3) { const l = Math.hypot(sx, sy); sx /= l; sy /= l; }
    const f = new THREE.Vector3(); this.camera.getWorldDirection(f); f.y = 0; if (f.lengthSq() < 1e-6) f.set(0, 0, -1); f.normalize();
    const rx = -f.z, rz = f.x;
    const wx = rx * sx + f.x * sy, wz = rz * sx + f.z * sy;
    this.game.setMove(wx, wz, m, K2.has('shift') || this.hud.held.sprint);
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
      case 'kick': if (e.kind !== 'throw') A.kick(e.power); this.anim(P(e.p), e.kind === 'throw' ? 'throw' : 'kick'); break;
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
      case 'foul': H.msg(e.penalty ? TEXT.penalty : TEXT.foul, e.penalty ? 'Falta dentro del área' : `De ${name(P(e.p))}`, 1800); A.groan(); this.anim(P(e.on), 'fall'); break;
      case 'out': H.say(e.type === 'throwin' ? `${TEXT.out}: ${TEXT.throwin.toLowerCase()}` : e.type === 'corner' ? TEXT.corner : TEXT.goalkick, 1500); break;
      case 'offside': H.say(`${TEXT.offside}${P(e.p).team === 0 ? ' de ' + name(P(e.p)) : ''}`, 1600); break;
      case 'restart':
        if (e.type === 'penalty') H.msg(TEXT.penalty, e.team === 0 ? 'Apunta con el joystick y mantén TIRO' : 'Para el tiro… ¡tu portero está atento!', 2000);
        else if (this.reto || this.tuto) break;   // (en los retos y el tutorial no hay saques que anunciar)
        else if (e.team === 0 && !g.autoplay && e.type !== 'goalkick') H.say(`${RESTART_NAME[e.type]}: tu saque. Apunta y pulsa ${this.hud.el.pass ? 'PASE' : 'J'}`, 2200);
        else if (e.type !== 'kickoff') H.say(RESTART_NAME[e.type], 1300);
        break;
      case 'goal': this.onGoal(e); break;
      case 'replay': this.startReplay(); break;
      case 'half': H.msg(TEXT.half, `${g.score[0]} – ${g.score[1]}`, 2800); A.bump(0.4, 2); break;
      case 'second': H.msg(TEXT.second, 'Se cambia de campo', 1800); break;
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
      ch.outer.position.set(p.x, 0, p.z); ch.outer.rotation.y = p.h;
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
      ch.c.post?.({ arms: g.restart?.type === 'throwin' && g.restart.taker === p ? 'up' : null }, dt);
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
    bm.position.set(bp.x, bp.y + (K.scale - 1) * R, bp.z);
    const hs = Math.hypot(B.v.x, B.v.z);
    if (hs > 0.05 && !B.held && dt > 0) { const ax = new THREE.Vector3(B.v.z, 0, -B.v.x).normalize(); bm.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(ax, hs / (R * K.scale) * dt)); }
    this.field.follow?.(bp.x, bp.z);
    const sh = clamp(1 - bp.y / 5, 0.25, 1); this.ballShadow.position.set(bp.x, 0.012, bp.z); this.ballShadow.scale.setScalar(0.7 + (1 - sh) * 0.8); this.ballShadow.material.opacity = sh;
    // anillo del jugador y aro del pase
    const me = g.me, showRing = !g.autoplay && g.mode !== 'penalties' || (g.mode === 'penalties' && g.pen?.human === 'shooter');
    this.ring.visible = showRing && !this.replay && !(this.intro > 0); this.ring.position.set(me.x, 0.03, me.z); this.ring.rotation.y = me.h;
    this.ring.children[0].material.color.set(g.defending() ? '#ffb347' : '#ffe14a');
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
    const at = this.goalAt ?? this.game.time, from = at - 2.6, to = at + 0.6;
    const frames = this.snaps.filter(s => s.t >= from && s.t <= to);
    if (frames.length < 10) return;
    this.replay = { frames, i: 0, t: 0, len: frames[frames.length - 1].t - frames[0].t, dur: 3.2, side: Math.sign(frames[frames.length - 1].b[0]) || 1 };
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
    c.position.set(s * (F.HL + 8), 3.2, gz * 0.5 + 6.5 * (gz >= 0 ? -1 : 1)); c.lookAt(f.b[0] * 0.6 + s * F.HL * 0.4, 1.1, f.b[2] * 0.7);
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
        const e = ss((t - 3) / 3), x = -17 + e * 34;
        pos = new THREE.Vector3(x, 1.7, 13.2); look = new THREE.Vector3(x + 2.5, 1.25, 8); fov = 38;
      } else if (this.lineup && t >= 6) {
        // el campo entero desde lo alto (por dentro del hueco de la cubierta), bajando a la cámara de televisión
        const e = ss((t - 6) / 2.2);
        pos = new THREE.Vector3(-40 + e * 40, 36 - e * 15, 16 + e * (F.HW + 6)); look = new THREE.Vector3(4 - e * 4, 0, -3 + e); fov = 55 - e * 13;
      } else {
        // llega desde fuera, por encima de la cubierta (se ve el estadio entero), y baja hacia el centro del campo
        const k = clamp(this.lineup ? t / 3 : 1 - this.intro / this.introLen, 0, 1), e = k * k * (3 - 2 * k), a = -0.75 + e * 0.55;
        const r = 205 - e * (this.lineup ? 150 : 165), h = 95 - e * (this.lineup ? 60 : 50);
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
      pos = new THREE.Vector3(me.x - s * 11, 7.5, me.z * 0.88); look = new THREE.Vector3(me.x + s * 8, 0.4, me.z * 0.9 + (B.z - me.z) * 0.25); fov = 52;
    } else {
      // retransmisión: como la cámara principal de la tele, en lo alto de la tribuna (a 22 m de la banda y 21 m de
      // altura), siguiendo al balón a lo largo y con el zoom justo para ver unos 26 m de campo alrededor de él (más
      // abierto en vertical, que en el móvil apaisado la pantalla es baja)
      const own = g.owner, lead = clamp(g.ball.v.x * 0.35 + (own ? g.dir[own.team] * 4 : 0), -9, 9);
      this.lead = (this.lead ?? 0) + (lead - (this.lead ?? 0)) * Math.min(1, dt * 1.5);
      const x = clamp(B.x * 0.94 + this.lead, -F.HL + 10, F.HL - 10), lz = B.z * 0.85 - 2, cz = F.HW + 22, cy = 21;
      pos = new THREE.Vector3(x, cy, cz); look = new THREE.Vector3(x, 0, lz);
      const dist = Math.hypot(cz - lz, cy), span = this.camera.aspect < 1.2 ? 30 : 23;
      fov = clamp(2 * Math.atan(span / 2 / dist) * 180 / Math.PI, 16, 42);
      if (this.reto?.cam) ({ pos, look, fov } = this.reto.cam(pos, look, fov));
    }
    if (Math.abs(c.fov - fov) > 0.01) { c.fov += (fov - c.fov) * Math.min(1, dt * 2.5); if (snap) c.fov = fov; c.updateProjectionMatrix(); }
    if (!this.camPos || snap) { this.camPos = pos.clone(); this.camLook = look.clone(); }
    const k = 1 - Math.exp(-4 * dt);
    this.camPos.lerp(pos, k); this.camLook.lerp(look, k);
    c.position.copy(this.camPos); c.lookAt(this.camLook);
  }
  drawHud() {
    const g = this.game, H = this.hud, me = g.me;
    if (g.mode !== 'penalties') H.setClock(g.halfLen - g.clock, g.half, this.reto ? this.reto.label() : null);
    if (g.mode !== 'penalties' && !this.reto) H.setDefending(g.defending());
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
    this.ball?.geometry.dispose(); this.ball?.material.dispose(); this.ballTex?.dispose(); this.blobTex?.dispose();
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
    const me = g.byRole(0, 'DCD'); g.setMe(me, 'tuto'); me.x = 22; me.z = 0; me.h = Math.PI / 2; me.react = 0;
    g.ball.set(22.6, 0); g.takeBall(me);
    const mate = g.byRole(0, 'DCI'); this.mate = mate; mate.x = 32; mate.z = -8; mate.react = 99;
    // los rivales, apartados (menos el portero)
    for (const p of g.team(1)) if (p.role !== 'POR') { const i = p.id % 11; p.x = 2 + (i % 4) * 5; p.z = (i % 2 ? -1 : 1) * (18 + (i % 3) * 4); }
    this.start0 = { x: me.x, z: me.z }; this.next(0);
  }
  next(i) {
    this.step = i; this.st = 0;
    const tips = [
      this.v.hud.el.pass ? 'Muévete con el <b>joystick</b>: toca y arrastra a la izquierda' : 'Muévete con <b>WASD</b> o las flechas',
      `Pasa a tu compañero: apunta hacia él y suelta <b>${this.v.hud.el.pass ? 'PASE' : 'J'}</b>`,
      `¡A puerta! Mantén <b>${this.v.hud.el.pass ? 'TIRO' : 'K'}</b> para cargar y suelta para chutar`,
      `Acércate al rival y pulsa <b>${this.v.hud.el.pass ? 'ROBO' : 'J'}</b> cuando el balón se le separe del pie`,
      '¡Ya sabes jugar! Empieza el partido',
    ];
    this.v.hud.tip(tips[i]);
    if (i === 3) {
      const g = this.g, r = g.byRole(1, 'MCD'), me = g.me;
      for (const p of g.team(0)) if (p !== me && p.role !== 'POR') { p.react = 99; p.wx = p.wz = 0; }
      g.owner = null; r.x = me.x + 6; r.z = me.z; r.react = 0; g.ball.set(r.x - 0.6, r.z); g.takeBall(r);
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
    // el balón no sale del campo durante el tutorial
    const B = g.ball.p; if (Math.abs(B.x) > F.HL + 0.5 || Math.abs(B.z) > F.HW + 0.5) { g.ball.set(me.x + 0.6, me.z); }
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
