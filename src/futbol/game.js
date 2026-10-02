// Lógica del partido de fútbol sala (sin gráficos): jugadores, balón, IA 1-2-2, árbitro y estadísticas, a paso fijo de
// 120 Hz. La vista (match.js) le pasa la entrada del jugador (dirección en el mundo y botones) y recibe eventos para
// dibujar, sonar y rotular. Se puede jugar sola (autoplay) para las pruebas.
import { FIELD as F, PHYS as K, PLAYER as PL, LEVELS, FORM, ROLES, NUMBERS, TEXT } from './rules.js';
import { Ball, rollAhead } from './physics.js';

const R = K.R, STEP = 1 / K.hz, HW_G = F.goalW / 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hyp = Math.hypot;
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const fwd = (p) => ({ x: Math.sin(p.h), z: Math.cos(p.h) });
const foot = (p) => ({ x: p.x + Math.sin(p.h) * 0.32, z: p.z + Math.cos(p.h) * 0.32 });
// distancia de un punto al segmento a→b (y en qué parte del segmento cae)
function segDist(px, pz, ax, az, bx, bz) {
  const ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez || 1e-9, t = clamp(((px - ax) * ex + (pz - az) * ez) / l2, 0, 1);
  return { d: hyp(px - ax - ex * t, pz - az - ez * t), t };
}

export class FutbolGame {
  /**
   * @param {object} o { mode: 'match'|'penalties'|'reto'|'tutorial', level: 'facil'|'normal'|'dificil', duration (min por
   *   parte, 2–5), assist, autoplay, cup (empate → penaltis), kicks (penaltis por equipo), seed, replays }
   */
  constructor(o = {}) {
    this.o = o; this.mode = o.mode || 'match';
    this.lvl = LEVELS[o.level] || LEVELS.normal; this.mates = LEVELS.normal;
    this.halfLen = clamp(o.duration ?? 3, 2, 5) * 60; this.assist = o.assist !== false; this.autoplay = !!o.autoplay;
    this.cup = !!o.cup; this.replays = o.replays !== false;
    let s = (o.seed || (Math.random() * 1e9)) | 0 || 1;
    this.rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    this.ball = new Ball();
    this.dir = [1, -1];            // hacia dónde ataca cada equipo (en x)
    this.players = [];
    for (const t of [0, 1]) ROLES.forEach((role, i) => this.players.push({ id: t * 5 + i, team: t, role, num: NUMBERS[role], x: 0, z: 0, vx: 0, vz: 0, h: 0, energy: 1,
      act: '', actT: 0, stun: 0, cool: 0, down: 0, recover: 0, touchT: 0, react: 0, think: 0, plan: null, tackleCD: 0, hands: false, holdT: 0, dive: null, slide: null,
      tx: 0, tz: 0, run: false, face: null, robo: null, sprinting: false }));
    this.team = (t) => this.players.filter(p => p.team === t);
    this.gk = (t) => this.players[t * 5];
    this.me = this.players[4];     // el pívot de casa: el que lleva el jugador al empezar
    this.score = [0, 0]; this.half = 1; this.clock = 0; this.time = 0; this.acc = 0;
    this.phase = 'intro'; this.phaseT = 0; this.events = []; this.restart = null; this.kickoffTeam = 0;
    this.owner = null; this.last = null; this.passTo = null; this.passT = 0; this.buffer = null;
    this.input = { x: 0, z: 0, mag: 0, sprint: false, aimX: 0, aimZ: 0 };
    this.hold = { pass: -1, shoot: -1 }; this.switchCD = 0;
    this.ts = [{ state: '', t: 0 }, { state: '', t: 0.1 }];
    this.stats = { shots: [0, 0], onTarget: [0, 0], passes: [0, 0], passesOk: [0, 0], poss: [0, 0], steals: [0, 0], fouls: [0, 0], saves: [0, 0] };
    this.pen = null; this.result = null;
  }
  emit(e) { this.events.push({ ...e, at: this.time }); }
  drain() { const e = this.events; this.events = []; return e; }
  other(t) { return 1 - t; }
  ownGoal(t) { return -this.dir[t] * F.HL; }
  goalX(t) { return this.dir[t] * F.HL; }
  /** ¿Está (x, z) en el área de penalti de la portería que defiende t? (6 m desde la portería, como en fútbol sala) */
  inArea(t, x, z, m = 0) {
    const gx = this.ownGoal(t), s = -this.dir[t];
    if (s * (x - gx) > 0.2) return false;
    return segDist(x, z, gx, -HW_G, gx, HW_G).d <= F.area + m;
  }
  defending() { return !!this.owner && this.owner.team !== this.me.team; }
  human(p) { return !this.autoplay && p === this.me; }
  L(p) { return p.team === 1 ? this.lvl : this.mates; }

  // ---------------------------------------------------------------- entrada del jugador
  /** Dirección de movimiento en el mundo (x, z), intensidad 0…1 y sprint. */
  setMove(x, z, mag, sprint) { const I = this.input; I.x = x; I.z = z; I.mag = mag; I.sprint = sprint; if (mag > 0.25) { I.aimX = x; I.aimZ = z; } }
  press(a) {
    if (this.autoplay) return;
    if (this.mode === 'penalties' && this.pen?.human === 'keeper') { if (a === 'pass' || a === 'shoot') this.humanDive(); return; }
    if (a === 'switch') { this.manualSwitch(); return; }
    const live = this.phase === 'play' || this.phase === 'tuto';
    if (a === 'pass') { if (this.defending() && live) this.tackle(this.me, 'robo'); else this.hold.pass = 0; }
    if (a === 'shoot') { if (this.defending() && live) this.tackle(this.me, 'slide'); else this.hold.shoot = 0; }
  }
  release(a) {
    if (this.autoplay) return;
    if (a === 'pass' && this.hold.pass >= 0) { const loft = this.hold.pass > PL.loft; this.hold.pass = -1; this.action({ kind: 'pass', loft }); }
    if (a === 'shoot' && this.hold.shoot >= 0) { const charge = Math.min(1, this.hold.shoot / PL.charge); this.hold.shoot = -1; this.action({ kind: 'shot', charge }); }
  }
  get charge() { return this.hold.shoot >= 0 ? Math.min(1, this.hold.shoot / PL.charge) : -1; }
  action(a) {
    const me = this.me;
    if (this.mode === 'penalties') { this.buffer = { ...a, t: 60 }; return; }
    if (this.restart && this.restart.taker === me) { if (this.restart.t >= this.restart.prep) this.takeRestart(me, a); else this.buffer = { ...a, t: 0.6 }; return; }
    if (this.phase !== 'play' && this.phase !== 'tuto') return;
    if (this.owner === me && !me.hands) this.doAction(me, a); else this.buffer = { ...a, t: 0.32 };   // si el balón llega en ese momento, al primer toque
  }
  doAction(p, a) {
    if (a.kind === 'pass') this.humanPass(p, a.loft);
    else this.humanShot(p, a.charge);
  }

  // ---------------------------------------------------------------- arranque y bucle a paso fijo
  start() {
    if (this.mode === 'penalties') return this.startShootout(this.o.kicks || 5);
    this.kickoff(0);
  }
  update(dt) {
    this.acc += Math.min(dt, 0.25);
    let n = 0;
    while (this.acc >= STEP && n < 40) { this.step(STEP); this.acc -= STEP; n++; }
    if (n >= 40) this.acc = 0;
  }
  step(h) {
    this.time += h; this.phaseT += h;
    if (this.hold.pass >= 0) this.hold.pass += h;
    if (this.hold.shoot >= 0) this.hold.shoot += h;
    this.switchCD -= h;
    if (this.buffer && (this.buffer.t -= h) <= 0) this.buffer = null;
    const ph = this.phase;
    if (ph === 'intro' || ph === 'end') return;
    if (this.mode === 'penalties' || ph.startsWith('pen')) return this.penStep(h);
    if (this.hook?.step?.(h) === false) return;   // retos y tutorial
    if (ph === 'goal' && this.phaseT > 3.2) { if (this.replays) { this.setPhase('replay'); this.emit({ t: 'replay' }); } else this.afterGoal(); }
    if (ph === 'replay' && this.phaseT > 3.4) this.afterGoal();
    if (ph === 'half' && this.phaseT > 3) this.secondHalf();
    if (ph === 'dead' && this.phaseT > 1.0) { const d = this.pendingRestart; this.pendingRestart = null; this.setPiece(d.type, d.team, d.x, d.z); }
    if (ph === 'foulstop' && this.phaseT > 1.1) { const d = this.pendingRestart; this.pendingRestart = null; this.setPiece(d.type, d.team, d.x, d.z); }
    // jugadores
    for (const p of this.players) this.timers(p, h);
    if (ph === 'play' || ph === 'tuto') {
      this.clock += ph === 'play' ? h : 0;
      for (const t of [0, 1]) if ((this.ts[t].t -= h) <= 0) { this.ts[t].t = 0.2; this.teamThink(t); }
      if (!this.autoplay) this.humanStep(h);
      for (const p of this.players) if (!this.human(p)) this.aiStep(p, h);
    } else if (ph === 'kickoff' || ph === 'setpiece') this.restartStep(h);
    else for (const p of this.players) this.drift(p, ph);
    for (const p of this.players) this.integrate(p, h);
    this.separate();
    // balón
    if (ph === 'play' || ph === 'tuto') this.control(h);
    const ev = this.ball.step(h, []);
    for (const e of ev) this.ballEvent(e);
    if (this.owner?.hands) this.holdBall(this.owner);
    if (ph === 'play') { this.referee(); if (this.owner) this.stats.poss[this.owner.team] += h; }
    if (ph === 'play' && this.clock >= this.halfLen) this.endHalf();
    if (this.passTo && ((this.passT -= h) <= 0 || this.owner)) this.passTo = null;
  }
  setPhase(p) { this.phase = p; this.phaseT = 0; this.emit({ t: 'phase', phase: p }); }
  timers(p, h) {
    p.cool = Math.max(0, p.cool - h); p.stun = Math.max(0, p.stun - h); p.down = Math.max(0, p.down - h); p.recover = Math.max(0, p.recover - h);
    p.tackleCD = Math.max(0, p.tackleCD - h); p.actT = Math.max(0, p.actT - h); if (p.actT <= 0 && p.act !== 'celebrate') p.act = '';
    if (p.robo) { p.robo.t -= h; this.roboCheck(p); if (p.robo && p.robo.t <= 0) { if (!p.robo.hit) { p.recover = 0.35; this.emit({ t: 'tackleMiss', p: p.id }); } p.robo = null; } }
    if (p.slide) this.slideStep(p, h);
  }

  // ---------------------------------------------------------------- movimiento
  /** Movimiento hacia la velocidad deseada (want) con aceleración de 14 m/s², energía del sprint y giro suave. */
  integrate(p, h) {
    if (p.dive) { this.diveStep(p, h); return; }
    if (p.slide) { p.x += p.vx * h; p.z += p.vz * h; this.bounds(p); return; }
    let wx = p.wx || 0, wz = p.wz || 0;
    if (p.down > 0 || p.stun > 0.15) { wx = 0; wz = 0; }
    if (this.restart?.taker === p) { wx = 0; wz = 0; }
    const want = hyp(wx, wz);
    // sprint: gasta energía (se agota en 4 s) y se recupera en 6 s sin correr a tope
    const sprint = p.wantSprint && p.energy > 0.01 && want > PL.run * 0.8;
    p.sprinting = sprint;
    p.energy = clamp(p.energy + (sprint ? -PL.drain : PL.regain) * h, 0, 1);
    const top = (sprint ? PL.sprint : PL.run) * (p.team === 1 ? this.lvl.speed : 1) * (this.owner === p ? 0.93 : 1) * (p.recover > 0 ? 0.55 : 1);
    if (want > top) { wx *= top / want; wz *= top / want; }
    let dvx = wx - p.vx, dvz = wz - p.vz; const dl = hyp(dvx, dvz), mx = PL.acc * h;
    if (dl > mx) { dvx *= mx / dl; dvz *= mx / dl; }
    p.vx += dvx; p.vz += dvz;
    p.x += p.vx * h; p.z += p.vz * h;
    this.bounds(p);
    // giro suavizado: hacia donde corre, o hacia donde quiere mirar (al balón, a la portería)
    const v = hyp(p.vx, p.vz), turn = (this.owner === p ? 9 : 12) * h;
    let ta = null;
    if (p.face) ta = Math.atan2(p.face.x - p.x, p.face.z - p.z);
    if (v > 0.6 && !(p.face && v < 2.5)) ta = Math.atan2(p.vx, p.vz);
    if (ta !== null) { const d = angDiff(p.h, ta); p.h += clamp(d, -turn, turn); }
  }
  bounds(p) { p.x = clamp(p.x, -F.HL - 1.6, F.HL + 1.6); p.z = clamp(p.z, -F.HW - 1.6, F.HW + 1.6); }
  // nadie se atraviesa: separación de los cuerpos (el que lleva el balón empuja un poco más)
  separate() {
    const P = this.players, m = 0.62;
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const a = P[i], b = P[j]; if (a.dive || b.dive) continue;
      const dx = b.x - a.x, dz = b.z - a.z, d = hyp(dx, dz);
      if (d < m && d > 1e-4) { const k = (m - d) / d, wa = this.owner === a ? 0.3 : this.owner === b ? 0.7 : 0.5; a.x -= dx * k * wa; a.z -= dz * k * wa; b.x += dx * k * (1 - wa); b.z += dz * k * (1 - wa); }
    }
  }
  // fuera de juego (balón muerto, gol, descanso): los jugadores andan a su sitio o celebran
  drift(p, ph) {
    p.wantSprint = false;
    if (ph === 'goal' || ph === 'replay') { if (p.act === 'celebrate') { p.wx = p.wz = 0; return; } }
    const t = this.spot(p, 'def');
    this.seek(p, t.x, t.z, 2.2);
    p.face = { x: this.ball.p.x, z: this.ball.p.z };
  }
  seek(p, tx, tz, speed, sprint = false) {
    const dx = tx - p.x, dz = tz - p.z, d = hyp(dx, dz);
    // llegar despacio (arrive): frena al acercarse
    const s = d < 0.25 ? 0 : Math.min(speed, d * 2.4);
    p.wx = d > 1e-4 ? dx / d * s : 0; p.wz = d > 1e-4 ? dz / d * s : 0; p.wantSprint = sprint && d > 3;
  }

  // ---------------------------------------------------------------- el jugador humano
  humanStep(h) {
    const p = this.me, I = this.input;
    if (p.down > 0 || p.slide || p.dive) return;
    let wx = I.x * I.mag, wz = I.z * I.mag;
    // sin tocar el joystick y con un pase hacia él: va solo a por el balón (ayuda al recibir)
    if (I.mag < 0.1 && this.passTo === p && !this.owner) { const q = this.interceptPoint(p); this.seek(p, q.x, q.z, PL.run); p.face = { x: this.ball.p.x, z: this.ball.p.z }; return; }
    const top = I.sprint ? PL.sprint : PL.run;
    p.wx = wx * top; p.wz = wz * top; p.wantSprint = I.sprint && I.mag > 0.5;
    p.face = I.mag < 0.1 && !this.owner ? { x: this.ball.p.x, z: this.ball.p.z } : null;
    // acción pedida justo antes de que llegue el balón: al primer toque
    if (this.buffer && this.owner === p && !p.hands) { const a = this.buffer; this.buffer = null; this.doAction(p, a); }
    // defendiendo, el más cercano al balón pasa a ser el tuyo
    const loose = !this.owner && this.passTo !== p;
    if ((this.defending() || loose) && this.switchCD <= 0 && !p.robo && !p.slide) {
      const b = this.ball.p, mine = hyp(p.x - b.x, p.z - b.z);
      let best = null, bd = mine - (loose ? 4 : 2.5);
      for (const q of this.team(p.team)) if (q.role !== 'POR' && q !== p && q.down <= 0) { const d = hyp(q.x - b.x, q.z - b.z); if (d < bd) { bd = d; best = q; } }
      if (best) this.setMe(best, 'auto');
    }
  }
  setMe(q, why = 'manual') {
    if (!q || q === this.me || q.role === 'POR') return;
    if (this.noSwitch && why !== 'force') return;   // en los retos siempre llevas al mismo
    const old = this.me; old.wx = old.vx; old.wz = old.vz; this.me = q; this.switchCD = 0.9; q.plan = null;
    this.emit({ t: 'switch', p: q.id, why });
  }
  manualSwitch() {
    const b = this.ball.p, me = this.me; if (this.owner === me) return;
    const c = this.team(me.team).filter(q => q.role !== 'POR' && q !== me).sort((a, q) => hyp(a.x - b.x, a.z - b.z) - hyp(q.x - b.x, q.z - b.z));
    if (c[0]) this.setMe(c[0], 'manual');
  }
  // pase del jugador: al compañero mejor situado dentro de un cono de 35° hacia donde apunta el joystick
  humanPass(p, loft) {
    const I = this.input, f = fwd(p);
    let dx = I.mag > 0.25 ? I.x : f.x, dz = I.mag > 0.25 ? I.z : f.z; const l = hyp(dx, dz) || 1; dx /= l; dz /= l;
    const q = this.bestReceiver(p, dx, dz, this.assist ? PL.cone : PL.cone * 0.7);
    this.stats.passes[p.team]++;
    if (q) { this.passBall(p, q, loft, 0); this.setMe(q, 'pass'); }
    else { const tx = clamp(p.x + dx * 10, -F.HL, F.HL), tz = clamp(p.z + dz * 10, -F.HW, F.HW); this.passToPoint(p, tx, tz, loft); }
  }
  bestReceiver(p, dx, dz, cone) {
    let best = null, bs = -1e9;
    for (const q of this.team(p.team)) {
      if (q === p || q.down > 0) continue;
      const ex = q.x - p.x, ez = q.z - p.z, d = hyp(ex, ez); if (d < 1.5 || d > 32) continue;
      const a = Math.acos(clamp((ex * dx + ez * dz) / d, -1, 1)); if (a > cone) continue;
      const lane = this.laneOpen(p.team, p.x, p.z, q.x, q.z);
      const s = 1 - a / cone * 0.7 - Math.abs(d - 9) / 25 + Math.min(lane, 2.5) * 0.25 - (q.role === 'POR' ? 0.5 : 0);
      if (s > bs) { bs = s; best = q; }
    }
    return best;
  }
  // tiro del jugador: hacia donde apunta el joystick; con la asistencia, a la portería
  humanShot(p, charge) {
    const I = this.input, s = this.dir[p.team], gx = s * F.HL, b = this.ball.p;
    const keeper = this.gk(this.other(p.team));
    let tz;
    const ax = I.mag > 0.25 ? I.x : fwd(p).x, az = I.mag > 0.25 ? I.z : fwd(p).z;
    if (ax * s > 0.12) { tz = b.z + az / ax * (gx - b.x); }
    else tz = (keeper.z > b.z * 0.2 ? -1 : 1) * (HW_G - 0.35);
    if (this.assist) tz = clamp(tz, -HW_G + 0.3, HW_G - 0.3);
    // efecto: el joystick de lado respecto al tiro al soltar
    const curl = clamp(-(I.x * (tz - b.z) - I.z * (gx - b.x)) / (hyp(gx - b.x, tz - b.z) || 1), -1, 1) * (I.mag > 0.5 ? 1 : 0);
    // precisión: carga, postura (mirando hacia otro lado) y presión de un rival encima
    const f = fwd(p), toG = Math.atan2(gx - b.x, tz - b.z), pose = Math.abs(angDiff(p.h, toG)) > 1.1 ? 0.05 : 0;
    const press = this.nearestFoe(p) < 1.4 ? 0.05 : 0;
    const err = 0.012 + charge * charge * 0.04 + pose + press + (this.assist ? 0 : 0.02);
    const ty = 0.25 + charge * 1.45 + (charge >= 1 && this.hold.over ? 0.6 : 0);
    this.shoot(p, tz, ty, charge, err, curl * 70);
  }
  nearestFoe(p) { let m = 1e9; for (const q of this.team(this.other(p.team))) m = Math.min(m, hyp(q.x - p.x, q.z - p.z)); return m; }

  // ---------------------------------------------------------------- golpeos
  kickBall(p, vx, vy, vz, spin = 0, kind = 'pass') {
    const b = this.ball;
    if (this.owner) this.owner.hands = false;
    b.held = null; this.owner = null;
    if (b.p.y < R) b.p.y = R;
    b.kick(vx, vy, vz, spin);
    p.cool = 0.24; p.act = kind === 'throw' ? 'throw' : 'kick'; p.actT = 0.4; this.last = p;
    p.h = Math.atan2(vx, vz);
    this.lastKick = { p, kind, t: this.time, x: b.p.x, z: b.p.z };
    this.emit({ t: 'kick', p: p.id, kind, power: hyp(vx, vy, vz) });
    if (this.restart && (this.phase === 'kickoff' || this.phase === 'setpiece')) { this.restart = null; this.setPhase('play'); }
  }
  groundV(d) { const va = 5.5 + Math.min(4, d * 0.12); return clamp(Math.sqrt(va * va + 2 * 2.6 * d), K.pass[0], K.pass[1]); }
  // pase raso con la potencia según la distancia (o elevado), adelantado a la carrera del compañero
  passBall(p, q, loft, err) {
    const b = this.ball.p;
    let tx = q.x, tz = q.z, v = 10, T = 1;
    for (let k = 0; k < 3; k++) {
      const d = hyp(tx - b.x, tz - b.z); v = loft ? clamp(9 + d * 0.32, 10, 17) : this.groundV(d);
      T = loft ? d / v * 1.1 : d / (v * 0.78);
      tx = q.x + q.vx * T * 0.85; tz = q.z + q.vz * T * 0.85;
    }
    tx += (this.rnd() - 0.5) * 2 * err; tz += (this.rnd() - 0.5) * 2 * err;
    tx = clamp(tx, -F.HL + 0.4, F.HL - 0.4); tz = clamp(tz, -F.HW + 0.4, F.HW - 0.4);
    this.passToPoint(p, tx, tz, loft, q);
  }
  passToPoint(p, tx, tz, loft, q = null) {
    const b = this.ball.p, dx = tx - b.x, dz = tz - b.z, d = hyp(dx, dz) || 1;
    if (loft) { const vh = clamp(9 + d * 0.32, 10, 17), T = d / vh * 1.1; this.kickBall(p, dx / d * vh, 0.5 * K.g * T, dz / d * vh, 0, 'loft'); }
    else { const v = this.groundV(d); this.kickBall(p, dx / d * v, 0, dz / d * v, 0, 'pass'); }
    this.passTo = q; this.passT = 2.6; this.passFrom = p;
    if (q) { q.plan = null; q.react = 0; }
  }
  shoot(p, tz, ty, charge, err, spin = 0) {
    const s = this.dir[p.team], gx = s * F.HL, b = this.ball.p;
    const v = K.shot[0] + charge * (K.shot[1] - K.shot[0]);
    const dx0 = gx + s * 0.3 - b.x, dz0 = tz - b.z, d = hyp(dx0, dz0) || 1;
    const a = Math.atan2(dz0, dx0) + (this.rnd() + this.rnd() - 1) * err;
    const vh = v * 0.985, T = d / (vh * (1 - 0.006 * v));
    let vy = (ty - b.y) / T + 0.5 * K.g * T; vy += (this.rnd() + this.rnd() - 1) * err * v * 0.4;
    this.kickBall(p, Math.cos(a) * vh, vy, Math.sin(a) * vh, spin, 'shot');
    this.stats.shots[p.team]++; this.shotLive = { team: p.team, t: this.time };
    this.emit({ t: 'shot', p: p.id, power: v });
  }

  // ---------------------------------------------------------------- control del balón y regate
  control(h) {
    const b = this.ball, B = b.p;
    let o = this.owner;
    if (o && !o.hands) {
      const f = foot(o), d = hyp(B.x - f.x, B.z - f.z);
      if (d > PL.keep || B.y > 1.25 || o.stun > 0 || o.down > 0 || o.slide || o.dive) { this.owner = null; o = null; }
    }
    if (o?.hands) return;
    if (!o) {
      // balón suelto: lo controla el que lo tiene a menos de 0,9 m delante de los pies y a menos de 1 m de altura; si
      // llega demasiado fuerte, rebota en él
      let best = null, bd = 1e9;
      for (const p of this.players) {
        if (p.cool > 0 || p.stun > 0 || p.down > 0 || p.slide || p.dive || p.hands) continue;
        if (this.restart && this.restart.taker !== p) continue;
        const f = foot(p), d = hyp(B.x - f.x, B.z - f.z), body = hyp(B.x - p.x, B.z - p.z);
        if (B.y < PL.ctrlH && (d < PL.reach || body < 0.45) && d < bd) { bd = d; best = p; }
      }
      if (best) {
        const rel = hyp(b.v.x - best.vx, b.v.z - best.vz, b.v.y);
        const keeperHands = best.role === 'POR' && this.inArea(best.team, B.x, B.z);
        if (keeperHands && this.last?.team !== best.team) { this.catchBall(best); return; }
        if (rel > PL.trapMax) this.deflect(best, 0.35);
        else this.takeBall(best);
      }
      // un balón fuerte que pasa por el cuerpo de alguien (más alto que los pies) también rebota
      if (!this.owner && b.speed > 8) for (const p of this.players) {
        if (p === best || p.cool > 0 || p.dive) continue;
        if (hyp(B.x - p.x, B.z - p.z) < 0.34 && B.y < 1.75) { this.deflect(p, 0.3); break; }
      }
    }
    o = this.owner;
    if (!o || o.hands) return;
    // el balón entre toque y toque está suelto: un rival que llega antes con el pie se lo lleva
    const fo = foot(o), dob = hyp(B.x - fo.x, B.z - fo.z);
    if (dob > 0.5) for (const p of this.players) {
      if (p.team === o.team || p.cool > 0 || p.stun > 0 || p.down > 0 || p.slide || p.dive || p.recover > 0) continue;
      const f = foot(p), d = hyp(B.x - f.x, B.z - f.z);
      const ff = fwd(p), facing = (B.x - p.x) * ff.x + (B.z - p.z) * ff.z > 0;
      if (d < 0.62 && d < dob && facing) {
        const rate = this.human(p) ? 6 : 1 + this.L(p).tackle * 2.5;
        if (this.rnd() < 1 - Math.exp(-rate * h)) { o.stun = 0.3; this.takeBall(p); this.stats.steals[p.team]++; this.emit({ t: 'steal', p: p.id, from: o.id, how: 'pie' }); return; }
      }
    }
    this.dribble(o, h);
  }
  takeBall(p) {
    const b = this.ball, prev = this.owner;
    this.owner = p; this.last = p; p.touchT = 0.1; p.gotT = this.time;
    // primer toque: el balón se amortigua y queda con el jugador
    const k = 0.25; b.v.x = p.vx + (b.v.x - p.vx) * k; b.v.z = p.vz + (b.v.z - p.vz) * k; if (b.v.y > 0) b.v.y *= 0.3;
    b.w.x = b.w.y = b.w.z = 0;
    if (this.passTo) { if (this.passTo.team === p.team) this.stats.passesOk[p.team]++; this.passTo = null; }
    if (this.shotLive && this.shotLive.team !== p.team) this.shotLive = null;
    if (p.team === this.me.team && p !== this.me && !this.autoplay && p.role !== 'POR') this.setMe(p, 'ball');
    p.plan = null; p.think = this.human(p) ? 0 : (prev && prev.team !== p.team ? this.L(p).react * 0.6 : 0.05);
    this.emit({ t: 'control', p: p.id });
  }
  deflect(p, k) {
    const b = this.ball, B = b.p, nx = B.x - p.x, nz = B.z - p.z, d = hyp(nx, nz) || 1, ux = nx / d, uz = nz / d;
    const vn = b.v.x * ux + b.v.z * uz;
    if (vn < 0) { b.v.x -= (1 + k) * vn * ux; b.v.z -= (1 + k) * vn * uz; }
    b.v.x *= 0.6; b.v.z *= 0.6; b.v.y = Math.abs(b.v.y) * 0.4 + 0.6;
    b.v.x += (this.rnd() - 0.5) * 2; b.v.z += (this.rnd() - 0.5) * 2;
    p.cool = 0.15; this.last = p; this.emit({ t: 'block', p: p.id });
    if (this.shotLive && this.shotLive.team !== p.team) this.emit({ t: 'blocked', p: p.id });
  }
  // conducción: toques cada 0,35–0,5 s según la velocidad, para que el balón vaya un poco por delante (no pegado al pie)
  dribble(o, h) {
    const b = this.ball, B = b.p, sp = hyp(o.vx, o.vz);
    if (B.y > 0.35) return;   // botando: se espera a que baje
    const rx = B.x - o.x, rz = B.z - o.z, f = fwd(o), ahead = rx * f.x + rz * f.z;
    o.touchT -= h;
    if (sp < 1.0) {
      // parado o casi: el balón bajo la suela, un poco por delante
      const tx = o.x + f.x * 0.42, tz = o.z + f.z * 0.42;
      b.v.x = clamp((tx - B.x) * 7, -3, 3) + o.vx * 0.5; b.v.z = clamp((tz - B.z) * 7, -3, 3) + o.vz * 0.5; return;
    }
    const mx = o.vx / sp, mz = o.vz / sp, along = rx * mx + rz * mz, side = -rx * mz + rz * mx;
    const T = PL.touchSlow + (PL.touchFast - PL.touchSlow) * clamp((sp - 1) / 6, 0, 1), lead = 0.62 + sp * 0.05;
    const behind = along < 0.15;   // ha girado: el balón se ha quedado atrás o a un lado
    if (o.touchT <= 0 || (behind && o.touchT < T * 0.6)) {
      // velocidad relativa para que, al próximo toque, el balón vuelva a quedar a «lead» por delante
      const dcc = 2.4 + 0.012 * sp * sp, a0 = Math.max(-0.2, along);
      const vrel = clamp((lead - a0 + 0.5 * dcc * T * T) / T, 0.2, 3.2);
      const vs = -side / T * 0.8;
      b.v.x = mx * (sp + vrel) - mz * vs; b.v.z = mz * (sp + vrel) + mx * vs; b.v.y = 0;
      o.touchT = T; this.emit({ t: 'touch', p: o.id });
    }
  }

  // ---------------------------------------------------------------- defensa: robo y entrada
  /** Robo (ventana de 0,25 s) o entrada en plancha (con riesgo de falta). */
  tackle(p, kind) {
    if (p.down > 0 || p.slide || p.dive || p.robo || p.recover > 0 || p.hands) return;
    if (kind === 'robo') {
      p.robo = { t: PL.tackleWin + 0.1, win: PL.tackleWin, hit: false }; p.act = 'robo'; p.actT = 0.35;
      // un paso rápido hacia el balón
      const b = this.ball.p, dx = b.x - p.x, dz = b.z - p.z, d = hyp(dx, dz) || 1;
      if (d < 2.5) { p.vx += dx / d * 2.5; p.vz += dz / d * 2.5; p.h = Math.atan2(dx, dz); }
      this.emit({ t: 'tackle', p: p.id, kind });
    } else {
      const b = this.ball.p, f = fwd(p);
      let dx = f.x, dz = f.z;
      if (this.assist || !this.human(p)) { const ex = b.x - p.x, ez = b.z - p.z, d = hyp(ex, ez); if (d < 4 && d > 0.1) { dx = ex / d; dz = ez / d; } }
      p.slide = { t: 0.62, dx, dz, ball: false, foul: false }; p.h = Math.atan2(dx, dz); p.vx = dx * 8.4; p.vz = dz * 8.4; p.act = 'slide'; p.actT = 1.1;
      this.emit({ t: 'tackle', p: p.id, kind });
    }
  }
  roboCheck(p) {
    const r = p.robo; if (r.hit || r.t < 0.1) return;   // ventana activa: los primeros 0,25 s
    const b = this.ball, B = b.p, f = foot(p), d = hyp(B.x - f.x, B.z - f.z);
    if (d > 1.15 || B.y > 0.8) return;
    r.hit = true;
    const o = this.owner;
    if (!o || o.team === p.team) { if (!o) this.takeBall(p); return; }
    if (o.hands) return;
    // éxito según el ángulo (de frente mejor que por detrás) y el momento (con el balón separado del pie, más fácil)
    const ax = p.x - o.x, az = p.z - o.z, al = hyp(ax, az) || 1, of = fwd(o), front = (ax * of.x + az * of.z) / al;
    const fo = foot(o), exposed = hyp(B.x - fo.x, B.z - fo.z);
    const base = this.human(p) ? 0.72 : this.L(p).tackle;
    const chance = clamp(base * (0.55 + 0.45 * clamp(front + 0.6, 0, 1)) + clamp((exposed - 0.3) * 0.7, 0, 0.3), 0.05, 0.95);
    const contact = hyp(p.x - o.x, p.z - o.z) < 0.85;
    if (front < -0.35 && contact && this.rnd() < 0.42) return this.foul(p, o);
    if (this.rnd() < chance) {
      o.stun = 0.45; this.takeBall(p); this.stats.steals[p.team]++;
      this.emit({ t: 'steal', p: p.id, from: o.id, how: 'robo' });
    } else { p.recover = 0.45; this.emit({ t: 'tackleMiss', p: p.id }); }
  }
  slideStep(p, h) {
    const S = p.slide; S.t -= h;
    const k = Math.max(0, S.t / 0.62); p.vx = S.dx * (2 + 6.4 * k); p.vz = S.dz * (2 + 6.4 * k);
    const B = this.ball.p, fx = p.x + S.dx * 0.7, fz = p.z + S.dz * 0.7;
    // toca balón: lo saca lejos hacia donde va la plancha
    if (!S.ball && B.y < 0.5 && hyp(B.x - fx, B.z - fz) < 0.55) {
      S.ball = true; const o = this.owner; this.owner = null; if (o) o.stun = 0.35;
      this.ball.kick(S.dx * 6.5 + (this.rnd() - 0.5) * 3, 0.6, S.dz * 6.5 + (this.rnd() - 0.5) * 3); this.last = p;
      if (o && o.team !== p.team) { this.stats.steals[p.team]++; this.emit({ t: 'steal', p: p.id, from: o.id, how: 'entrada' }); }
    }
    // toca al rival antes que al balón (o por detrás): falta
    if (!S.foul) for (const q of this.team(this.other(p.team))) {
      if (q.down > 0 || q.dive) continue;
      if (hyp(q.x - fx, q.z - fz) < 0.6 || hyp(q.x - p.x, q.z - p.z) < 0.55) {
        const qf = fwd(q), behind = (S.dx * qf.x + S.dz * qf.z) > 0.55;
        S.foul = true;
        if ((!S.ball || behind) && (this.owner === q || this.last === q || hyp(B.x - q.x, B.z - q.z) < 1.6)) { this.foul(p, q); return; }
        q.down = 0.5;   // le ha hecho caer, pero el balón fue primero
      }
    }
    if (S.t <= 0) { p.slide = null; p.down = 0.55; p.vx = p.vz = 0; }
  }
  foul(p, q) {
    if (this.phase !== 'play') return;
    const x = q.x, z = q.z, pen = this.inArea(p.team, x, z);
    q.down = 0.9; q.act = 'fall'; q.actT = 0.9; p.robo = null; if (p.slide) { p.slide = null; p.down = 0.6; }
    this.stats.fouls[p.team]++; this.owner = null;
    this.emit({ t: 'foul', p: p.id, on: q.id, penalty: pen });
    this.emit({ t: 'whistle', n: pen ? 3 : 2 });
    const t = q.team;
    this.pendingRestart = pen ? { type: 'penalty', team: t, x: this.goalX(t) - this.dir[t] * F.spot, z: 0 } : { type: 'free', team: t, x: clamp(x, -F.HL + 0.6, F.HL - 0.6), z: clamp(z, -F.HW + 0.6, F.HW - 0.6) };
    this.setPhase('foulstop');
  }

  // ---------------------------------------------------------------- portero
  keeper(p, h) {
    const t = p.team, s = -this.dir[t], gx = s * F.HL, b = this.ball, B = b.p, L = this.L(p);
    if (p.hands) return this.distribute(p, h);
    if (p.down > 0) { p.wx = p.wz = 0; return; }
    const dB = hyp(B.x - gx, B.z);
    // colocación: en la bisectriz entre el balón y el centro de la portería, a 1–2 m de la línea
    const ux = (B.x - gx) / (dB || 1), uz = B.z / (dB || 1), out = clamp(1 + (15 - dB) * 0.08, 1, 2);
    let tx = gx + ux * out, tz = clamp(uz * out * 1.4, -HW_G - 0.25, HW_G + 0.25), sprint = false;
    // un tiro (o un balón fuerte) hacia su portería: tras su tiempo de reacción, se estira o se coloca
    const toward = !this.owner && b.v.x * s > 3;
    if (toward) {
      const T = (p.x - B.x) / b.v.x;
      if (T > 0 && T < 1.4) {
        const zc = B.z + b.v.z * T, yc = Math.max(R, B.y + b.v.y * T - 0.5 * K.g * T * T);
        if (Math.abs(zc) < HW_G + 0.9 && yc < F.goalH + 0.7) {
          if (p.threat === undefined || p.threat === null) p.threat = L.keeperReact;
          p.threat -= h;
          if (p.threat <= 0) {
            const need = zc - p.z;
            if (Math.abs(need) > 0.55 || yc > 1.75) {
              const reach = L.keeperReach, dur = Math.max(0.15, T - 0.08), v = clamp(Math.abs(need) / dur, 1.5, 4.6 * reach);
              p.dive = { t: 0.62, vz: Math.sign(need) * v, vx: -s * 0.6, hy: clamp(yc, 0.25, 2.25), side: Math.sign(need) || 1 };
              p.act = 'dive'; p.actT = 0.9; this.emit({ t: 'dive', p: p.id, side: p.dive.side, high: yc > 1.2 });
              return;
            }
            tz = zc; tx = p.x;
          }
        }
      }
    } else p.threat = null;
    // balón suelto en su área y él llega antes que nadie: sale a por él
    if (!this.owner && this.inArea(t, B.x, B.z) && b.hspeed < 9) {
      const mine = hyp(B.x - p.x, B.z - p.z) / 6.5;
      let foe = 1e9; for (const q of this.team(this.other(t))) foe = Math.min(foe, hyp(B.x - q.x, B.z - q.z) / 6.5);
      if (mine < foe - 0.1) { const q = rollAhead(b, mine * 0.7); tx = q.x; tz = q.z; sprint = true; }
    }
    // un rival se le planta con el balón: sale a taparle
    const o = this.owner;
    if (o && o.team !== t && this.inArea(t, o.x, o.z, 1) && hyp(o.x - gx, o.z) < 7) { tx = o.x - ux * 1.4; tz = o.z - uz * 1.4; sprint = true;
      const fo = foot(o), dob = hyp(B.x - fo.x, B.z - fo.z);
      if (hyp(B.x - p.x, B.z - p.z) < 0.85 && dob > 0.4 && this.rnd() < 1 - Math.exp(-2.5 * L.keeperReach * h)) { o.stun = 0.3; this.catchBall(p); return; } }
    this.seek(p, tx, tz, sprint ? PL.sprint : PL.run, sprint);
    p.face = { x: B.x, z: B.z };
    this.keeperTouch(p);
  }
  diveStep(p, h) {
    const D = p.dive; D.t -= h; D.el = (D.el || 0) + h;
    const go = clamp((D.el - 0.06) / 0.1, 0, 1);   // impulso: casi 0,12 s hasta lanzarse del todo
    p.x += D.vx * go * h; p.z += D.vz * go * h; p.vx = D.vx * go; p.vz = D.vz * go; if (go >= 1) D.vz *= Math.exp(-1.5 * h);
    this.bounds(p); this.keeperTouch(p);
    if (D.t <= 0) { p.dive = null; p.down = 0.5; p.vx = p.vz = 0; p.threat = null; }
  }
  // ¿llega con las manos? Lo bloca si llega flojo y centrado; si llega fuerte, lo despeja
  keeperTouch(p) {
    if (this.owner || (this.lastKick?.p === p && this.time - this.lastKick.t < 0.4)) return;
    const b = this.ball, B = b.p, t = p.team, s = -this.dir[t];
    if (!this.inArea(t, B.x, B.z, 0.3) && !p.dive) return;
    const D = p.dive, hx = p.x + (D ? -s * 0.1 : 0), hz = p.z + (D ? D.side * 0.5 : 0), hy = D ? D.hy : 1.1;
    const dh = hyp(B.x - hx, B.z - hz), r = D ? 0.55 : 0.55;
    if (dh > r || B.y > (D ? hy + 0.75 : 2.25) || B.y < (D ? hy - 0.95 : 0)) return;
    const L = this.L(p), v = b.speed;
    if (v < L.catchV * (D ? 0.8 : 1) && this.rnd() < 0.9) { this.catchBall(p); return; }
    // despeje: hacia fuera y a un lado
    const side = Math.sign(B.z || this.rnd() - 0.5);
    b.kick(-s * (3 + this.rnd() * 4), 1.6 + this.rnd() * 2.6, side * (3 + this.rnd() * 4));
    this.last = p; p.cool = 0.3;
    if (this.shotLive && this.shotLive.team !== t) { this.stats.saves[t]++; this.stats.onTarget[this.other(t)]++; this.shotLive = null; }
    this.emit({ t: 'save', p: p.id, catch: false });
  }
  catchBall(p) {
    const b = this.ball; this.owner = p; this.last = p; p.hands = true; p.holdT = 0.9 + this.rnd() * 0.9; b.held = p; b.stop();
    if (this.shotLive && this.shotLive.team !== p.team) { this.stats.saves[p.team]++; this.stats.onTarget[this.other(p.team)]++; this.shotLive = null; this.emit({ t: 'save', p: p.id, catch: true }); }
    else this.emit({ t: 'gkBall', p: p.id });
    if (this.passTo) this.passTo = null;
    p.dive = null; p.threat = null;
  }
  holdBall(p) { const f = fwd(p), B = this.ball.p; B.x = p.x + f.x * 0.28; B.z = p.z + f.z * 0.28; B.y = 1.0; this.ball.stop(); }
  // con el balón en las manos: lo saca rápido con la mano a un compañero libre, o con el pie lejos
  distribute(p, h) {
    p.wx = p.wz = 0; const t = p.team, s = -this.dir[t];
    p.face = { x: 0, z: 0 };
    if (this.phase !== 'play' && this.phase !== 'setpiece') return;
    if ((p.holdT -= h) > 0) return;
    let best = null, bs = -1e9;
    for (const q of this.team(t)) {
      if (q === p) continue;
      const d = hyp(q.x - p.x, q.z - p.z), open = this.openness(q), lane = this.laneOpen(t, p.x, p.z, q.x, q.z);
      const sc = Math.min(open, 5) * 0.3 + Math.min(lane, 3) * 0.3 - Math.abs(d - 12) * 0.03 + (this.dir[t] * q.x) * 0.02;
      if (sc > bs) { bs = sc; best = q; }
    }
    p.hands = false; this.ball.held = null; this.owner = null;
    const B = this.ball.p; B.y = 0.9;
    if (best && hyp(best.x - p.x, best.z - p.z) < 18) { this.passBall(p, best, false, 0.3); this.lastKick.kind = 'throw'; p.act = 'throw'; }
    else {
      // saque largo con el pie: 18–24 m/s hacia el campo rival
      const tx = this.dir[t] * 6, tz = (this.rnd() - 0.5) * 10, dx = tx - B.x, dz = tz - B.z, d = hyp(dx, dz), v = K.clear[0] + this.rnd() * (K.clear[1] - K.clear[0]);
      this.kickBall(p, dx / d * v * 0.8, v * 0.42, dz / d * v * 0.8, 0, 'clear');
    }
    if (this.restart) { this.restart = null; this.setPhase('play'); }
  }

  // ---------------------------------------------------------------- IA de equipo (1-2-2)
  /** Posición base de un jugador en ataque o en defensa, desplazada con el balón. */
  spot(p, state) {
    const f = FORM[p.role]; if (!f) return { x: this.ownGoal(p.team) + this.dir[p.team] * 1, z: 0 };
    const [u0, v0] = state === 'atk' ? f.atk : f.def, s = this.dir[p.team], B = this.ball.p;
    const bu = s * B.x / F.HL, bv = B.z / F.HW;
    let u = u0 + bu * (state === 'atk' ? 0.38 : 0.42), v = v0 * 0.9 + bv * 0.32;
    if (p.role === 'CIE') u = Math.min(u, bu - 0.12);   // el cierre, siempre por detrás del balón
    u = clamp(u, -0.9, 0.85); v = clamp(v, -0.9, 0.9);
    return { x: s * u * (F.HL - 1), z: v * (F.HW - 1) };
  }
  openness(q) { let m = 1e9; for (const r of this.team(this.other(q.team))) if (r.role !== 'POR') m = Math.min(m, hyp(r.x - q.x, r.z - q.z)); return m; }
  laneOpen(t, ax, az, bx, bz) {
    let m = 1e9;
    for (const r of this.team(this.other(t))) { const sd = segDist(r.x, r.z, ax, az, bx, bz); if (sd.t > 0.04 && sd.t < 0.97) m = Math.min(m, sd.d + sd.t * 0.3); }
    return m;
  }
  // punto en el que un jugador puede alcanzar el balón suelto (y en cuánto tiempo)
  interceptPoint(p) {
    const b = this.ball, sp = PL.run * 1.05;
    for (let t = 0; t <= 3; t += 0.1) { const q = rollAhead(b, t); if (hyp(q.x - p.x, q.z - p.z) / sp + 0.15 <= t) return { x: q.x, z: q.z, t }; }
    const q = rollAhead(b, 3); return { x: q.x, z: q.z, t: 3 + hyp(q.x - p.x, q.z - p.z) / sp };
  }
  teamThink(t) {
    const ts = this.ts[t], o = this.owner, B = this.ball.p, L = t === 1 ? this.lvl : this.mates;
    const state = o ? (o.team === t ? 'atk' : 'def') : 'loose';
    if (state !== ts.state) { const was = ts.state; ts.state = state; if (was) for (const p of this.team(t)) if (!this.human(p) && p.role !== 'POR') p.react = L.react * (0.75 + this.rnd() * 0.5); }
    const field = this.team(t).filter(p => p.role !== 'POR' && !this.human(p));
    const foes = this.team(this.other(t)).filter(p => p.role !== 'POR');
    for (const p of field) p.job = null;
    if (state === 'loose') {
      // transición: el que antes llega va a por el balón; los demás, a su sitio
      let best = null, bt = 1e9;
      for (const p of field) { const q = this.interceptPoint(p); if (q.t < bt) { bt = q.t; best = p; best.ip = q; } }
      const humanNear = !this.autoplay && this.me.team === t && this.interceptPoint(this.me).t < bt - 0.2;
      if (best && !(humanNear && this.passTo !== best)) best.job = { kind: 'chase', x: best.ip.x, z: best.ip.z };
      if (this.passTo && this.passTo.team === t && !this.human(this.passTo)) { const q = this.interceptPoint(this.passTo); this.passTo.job = { kind: 'chase', x: q.x, z: q.z }; }
      const st = this.last?.team === t ? 'atk' : 'def';
      for (const p of field) if (!p.job) { const s = this.spot(p, st); p.job = { kind: 'spot', x: s.x, z: s.z }; }
      return;
    }
    if (state === 'def') {
      // presión: el más rápido en llegar al poseedor, por el lado de la portería; el segundo cubre; los demás marcan
      const g = { x: this.ownGoal(t), z: 0 }, ox = o.x, oz = o.z, gd = hyp(g.x - ox, g.z - oz) || 1;
      const press = { x: ox + (g.x - ox) / gd * 0.9 + o.vx * 0.2, z: oz + (g.z - oz) / gd * 0.9 + o.vz * 0.2 };
      const humanPress = !this.autoplay && this.me.team === t && hyp(this.me.x - ox, this.me.z - oz) < 5;
      const order = field.slice().sort((a, b) => hyp(a.x - press.x, a.z - press.z) - hyp(b.x - press.x, b.z - press.z));
      let k = 0;
      if (!humanPress && order[k]) { order[k].job = { kind: 'press', x: press.x, z: press.z }; k++; }
      if (order[k] && (L.coord || gd < 16 || humanPress)) { const c = { x: ox + (g.x - ox) / gd * Math.min(4.5, gd * 0.5), z: oz + (g.z - oz) / gd * Math.min(4.5, gd * 0.5) }; order[k].job = { kind: 'cover', x: c.x, z: c.z }; k++; }
      // marcas: cada atacante libre, del más peligroso (cerca de nuestra portería) al menos
      const threats = foes.filter(f => f !== o).sort((a, b) => hyp(a.x - g.x, a.z) - hyp(b.x - g.x, b.z));
      const free = order.slice(k);
      for (const p of free) {
        let m = null, md = 1e9; for (const f of threats) { if (f.marked === t) continue; const d = hyp(f.x - p.x, f.z - p.z); if (d < md) { md = d; m = f; } }
        const s = this.spot(p, 'def');
        if (m) { m.marked = t; const fd = hyp(g.x - m.x, g.z - m.z) || 1, mx = m.x + (g.x - m.x) / fd * 1.5, mz = m.z + (g.z - m.z) / fd * 1.5; p.job = { kind: 'mark', x: (mx * 0.65 + s.x * 0.35), z: (mz * 0.65 + s.z * 0.35), m }; }
        else p.job = { kind: 'spot', x: s.x, z: s.z };
      }
      for (const f of threats) f.marked = null;
      return;
    }
    // ataque: un apoyo cerca del poseedor, desmarques a los espacios y el pívot arriba
    const s = this.dir[t];
    const others = field.filter(p => p !== o);
    let sup = null, sd = 1e9; for (const p of others) { const d = hyp(p.x - o.x, p.z - o.z); if (d < sd) { sd = d; sup = p; } }
    for (const p of others) {
      if (p.role === 'PIV' && s * o.x > -6) { const z = clamp(o.z * -0.4 + (p.z > 0 ? 2 : -2), -4, 4); p.job = { kind: 'run', x: s * (F.HL - 7.5), z }; continue; }
      if (p === sup) {
        // apoyo: a unos 6 m del poseedor, en diagonal hacia atrás, por el lado con menos rivales
        let best = null, bs = -1e9;
        for (const a of [-2.3, -1.6, -0.9, 0.9, 1.6, 2.3]) {
          const x = clamp(o.x + Math.cos(a) * 6 * s * (Math.abs(a) > 1.5 ? -0.6 : 1), -F.HL + 2, F.HL - 2), z = clamp(o.z + Math.sin(a) * 6, -F.HW + 1, F.HW - 1);
          const sc = Math.min(this.openAt(t, x, z), 4) + Math.min(this.laneOpen(t, o.x, o.z, x, z), 3) - hyp(x - p.x, z - p.z) * 0.08;
          if (sc > bs) { bs = sc; best = { x, z }; }
        }
        p.job = { kind: 'support', x: best.x, z: best.z }; continue;
      }
      // desmarque: el mejor hueco cerca de su posición base (lejos de rivales, con línea de pase limpia, sin amontonarse)
      if (!p.free || (p.freeT -= 0.2) <= 0) {
        const b = this.spot(p, 'atk'); let best = b, bs = -1e9;
        for (let k = 0; k < 7; k++) {
          const a = k / 7 * Math.PI * 2, r = k ? 3.5 : 0, x = clamp(b.x + Math.cos(a) * r, -F.HL + 1.5, F.HL - 1.5), z = clamp(b.z + Math.sin(a) * r, -F.HW + 1, F.HW - 1);
          let crowd = 0; for (const q of this.team(t)) if (q !== p && hyp(q.x - x, q.z - z) < 4) crowd++;
          const sc = Math.min(this.openAt(t, x, z), 5) * 0.6 + Math.min(this.laneOpen(t, o.x, o.z, x, z), 3) * 0.5 - crowd * 0.8 - r * 0.08 + s * (x - b.x) * 0.05;
          if (sc > bs) { bs = sc; best = { x, z }; }
        }
        p.free = best; p.freeT = 0.8 + this.rnd() * 0.6;
      }
      p.job = { kind: 'spot', x: p.free.x, z: p.free.z };
    }
  }
  openAt(t, x, z) { let m = 1e9; for (const r of this.team(this.other(t))) if (r.role !== 'POR') m = Math.min(m, hyp(r.x - x, r.z - z)); return m; }

  aiStep(p, h) {
    if (p.role === 'POR') return this.keeper(p, h);
    if (p.down > 0 || p.slide || p.dive) { p.wx = p.wz = 0; return; }
    const L = this.L(p);
    if (p.react > 0) { p.react -= h; return; }   // reacción: aún no se ha dado cuenta del cambio
    if (this.owner === p) return this.carrier(p, h);
    const j = p.job, B = this.ball.p;
    if (!j) return;
    const sprint = (j.kind === 'chase' || j.kind === 'press' || j.kind === 'run') && this.rnd() < L.sprint + 0.3 && p.energy > 0.3;
    this.seek(p, j.x, j.z, sprint ? PL.sprint : PL.run, sprint);
    p.face = { x: B.x, z: B.z };
    // separación: no amontonarse con los compañeros
    for (const q of this.team(p.team)) { if (q === p) continue; const dx = p.x - q.x, dz = p.z - q.z, d = hyp(dx, dz); if (d < 2.2 && d > 1e-3) { p.wx += dx / d * (2.2 - d) * 1.6; p.wz += dz / d * (2.2 - d) * 1.6; } }
    // robo: cerca del balón del rival, mejor con el balón separado del pie
    const o = this.owner;
    if (o && o.team !== p.team && !o.hands && p.tackleCD <= 0 && (j.kind === 'press' || j.kind === 'cover' || hyp(o.x - p.x, o.z - p.z) < 1.6)) {
      const f = foot(p), d = hyp(B.x - f.x, B.z - f.z), fo = foot(o), exposed = hyp(B.x - fo.x, B.z - fo.z) > 0.45;
      if (d < 1.05) {
        const want = (exposed ? 0.85 : 0.3) * L.press;
        if (this.rnd() < want * h * 6) { this.tackle(p, 'robo'); p.tackleCD = 1.4 - L.press * 0.6; }
        else if (L.coord && hyp(o.x - p.x, o.z - p.z) < 2.2 && this.rnd() < 0.08 * h && Math.abs(angDiff(o.h, Math.atan2(p.x - o.x, p.z - o.z))) < 1.4) { this.tackle(p, 'slide'); p.tackleCD = 2.5; }
      }
    }
  }
  // el poseedor decide cada 0,2 s: tirar, pasar, regatear o proteger el balón
  carrier(p, h) {
    const L = this.L(p);
    if ((p.think -= h) <= 0) { p.think = 0.2; p.plan = this.decide(p, L); }
    const pl = p.plan; if (!pl) return;
    if (pl.kind === 'shoot') { p.plan = null; return this.aiShoot(p, L); }
    if (pl.kind === 'pass') { p.plan = null; this.stats.passes[p.team]++; return this.passBall(p, pl.q, pl.loft, L.passErr); }
    if (pl.kind === 'dribble') { this.seek(p, p.x + pl.dx * 6, p.z + pl.dz * 6, pl.speed || (pl.sprint ? PL.sprint : PL.run), pl.sprint); p.face = null; return; }
    // proteger: de espaldas al rival, despacio
    const r = pl.from; const ax = p.x - r.x, az = p.z - r.z, al = hyp(ax, az) || 1;
    this.seek(p, p.x + ax / al * 2, p.z + az / al * 2, 1.6); p.face = { x: p.x + ax, z: p.z + az };
  }
  decide(p, L) {
    const t = p.team, s = this.dir[t], gx = s * F.HL, B = this.ball.p;
    const opts = [];
    // tiro
    const pg = this.shotProb(p);
    if (pg > L.shootThr) opts.push({ kind: 'shoot', v: 1 + pg });
    // pases
    const pressure = this.nearestFoe(p);
    for (const q of this.team(t)) {
      if (q === p || q.down > 0) continue;
      const d = hyp(q.x - p.x, q.z - p.z); if (d < 3 || d > 26) continue;
      const lane = this.laneOpen(t, B.x, B.z, q.x, q.z), open = this.openness(q);
      const prog = s * (q.x - p.x) / 12;
      let v = 0.35 + prog * 0.55 + Math.min(open, 4) * 0.1 - (lane < 1.3 ? (1.3 - lane) * 1.1 : 0) - (d > 16 ? (d - 16) * 0.04 : 0);
      if (q.role === 'POR') v -= s * p.x > -8 || pressure > 2 ? 2 : 0.3;
      if (s * q.x > F.HL - 11 && open > 2.2 && lane > 1.3) v += 0.3;
      if (pressure < 1.6) v += 0.15;
      opts.push({ kind: 'pass', q, v, loft: lane < 0.9 && d > 9 });
    }
    // regate: hacia la portería o hacia el hueco
    const toG = Math.atan2(-B.z * 0.6, gx - B.x);
    let bestD = null;
    for (const da of [0, -0.6, 0.6, -1.2, 1.2]) {
      const a = toG + da, dx = Math.cos(a), dz = Math.sin(a);
      let space = 6; for (const r of this.team(this.other(t))) { const rx = r.x - B.x, rz = r.z - B.z, along = rx * dx + rz * dz, lat = Math.abs(-rx * dz + rz * dx); if (along > -0.5 && along < 6 && lat < 1.6 + along * 0.25) space = Math.min(space, Math.max(0, along)); }
      const zOut = Math.abs(B.z + dz * 4) > F.HW - 0.8 || Math.abs(B.x + dx * 4) > F.HL - 0.5 ? 1 : 0;
      const v = 0.3 + Math.min(space, 6) * 0.07 + dx * s * 0.15 - Math.abs(da) * 0.05 - zOut;
      if (!bestD || v > bestD.v) bestD = { kind: 'dribble', dx, dz, v, sprint: space > 4 && p.energy > 0.4 && this.rnd() < L.sprint };
    }
    opts.push(bestD);
    if (pressure < 1.4) { let r = null, rd = 1e9; for (const q of this.team(this.other(t))) { const d = hyp(q.x - p.x, q.z - p.z); if (d < rd) { rd = d; r = q; } } opts.push({ kind: 'protect', from: r, v: 0.28 }); }
    // un poco de variedad (y de error) según el nivel
    for (const o of opts) o.v += (this.rnd() - 0.5) * 0.12;
    // no pasar en cuanto se recibe: un instante para levantar la cabeza
    if (this.time - (p.gotT || 0) < 0.25) for (const o of opts) if (o.kind === 'pass') o.v -= 0.3;
    opts.sort((a, b) => b.v - a.v);
    return opts[0];
  }
  /** Probabilidad de gol de un tiro desde donde está el balón: ¿llega el portero a tiempo a la mejor escuadra? */
  shotProb(p, info = null) {
    const t = p.team, s = this.dir[t], gx = s * F.HL, B = this.ball.p, dx = s * (gx - B.x);
    if (dx < 0.8) return 0;
    const k = this.gk(this.other(t)), Lk = this.L(k), v = 23, d0 = hyp(dx, B.z);
    let best = 0, bz = 0;
    for (const zc of [-(HW_G - 0.3), HW_G - 0.3, -(HW_G - 0.75), HW_G - 0.75]) {
      // por dónde pasa el tiro a la altura del portero, cuánto tiene que moverse y cuánto le da tiempo
      const kd = clamp(s * (k.x - B.x), 0.2, dx), zk = B.z + (zc - B.z) * kd / dx;
      const need = Math.abs(zk - k.z) - 0.95, tk = kd / (v * 0.92), reach = Math.max(0, tk - Lk.keeperReact - 0.12) * 4.5 * Lk.keeperReach;
      let pr = clamp(0.5 + (need - reach) * 1.6, 0, 1);
      // el ángulo: desde muy escorado la portería «se ve» pequeña y el error manda
      const a1 = Math.atan2(-HW_G - B.z, dx), a2 = Math.atan2(HW_G - B.z, dx);
      pr *= clamp(Math.abs(a2 - a1) / 0.32, 0, 1) * clamp(1.25 - d0 / 16, 0, 1);
      for (const r of this.team(this.other(t))) {
        if (r.role === 'POR') continue;
        const sd = segDist(r.x, r.z, B.x, B.z, gx, zc); if (sd.t > 0.04 && sd.t < 0.95 && sd.d < 0.55 + sd.t * 0.4) pr *= 0.35;
      }
      if (pr > best) { best = pr; bz = zc; }
    }
    if (info) info.z = bz;
    return best;
  }
  aiShoot(p, L) {
    const info = {}; this.shotProb(p, info);
    const tz = clamp(info.z + (this.rnd() - 0.5) * L.passErr * 0.5, -HW_G - 0.4, HW_G + 0.4);
    const charge = 0.55 + this.rnd() * 0.4, ty = 0.3 + this.rnd() * 1.3;
    this.shoot(p, tz, ty, charge, 0.02 + L.passErr * 0.012, (this.rnd() - 0.5) * 40);
  }

  // ---------------------------------------------------------------- árbitro
  ballEvent(e) {
    if (e.t === 'post' || e.t === 'bar') this.emit({ t: e.t, s: e.s });
    else if (e.t === 'net' || e.t === 'netOut') this.emit(e);
    else if (e.t === 'bounce' && e.s > 2.5) this.emit({ t: 'bounce', s: e.s });
    else if (e.t === 'board') this.emit({ t: 'board', s: e.s });
  }
  referee() {
    const B = this.ball.p, lim = F.HL + F.line / 2 + R;
    // gol: el balón entero pasa la línea entre los postes y por debajo del larguero
    for (const s of [-1, 1]) if (s * B.x > lim && Math.abs(B.z) < HW_G && B.y < F.goalH) { const t = this.dir[0] === s ? 0 : 1; return this.goal(t); }
    if (Math.abs(B.x) > lim) {
      // fuera de fondo: córner si la tocó el que defiende esa portería, saque de portería si fue el atacante
      const s = Math.sign(B.x), def = this.dir[0] === -s ? 0 : 1, att = this.other(def);
      if (this.last?.team === def) return this.out('corner', att, s * (F.HL - 0.25), Math.sign(B.z || 1) * (F.HW - 0.25));
      return this.out('goalkick', def, s * (F.HL - 1.5), 0);
    }
    if (Math.abs(B.z) > F.HW + F.line / 2 + R) {
      const t = this.last ? this.other(this.last.team) : 0;
      return this.out('kickin', t, clamp(B.x, -F.HL + 0.4, F.HL - 0.4), Math.sign(B.z) * F.HW);
    }
  }
  out(type, team, x, z) {
    if (this.shotLive) { this.emit({ t: 'miss', team: this.shotLive.team }); this.shotLive = null; }
    this.owner = null; this.passTo = null;
    this.emit({ t: 'out', type, team }); this.emit({ t: 'whistle', n: 1 });
    this.pendingRestart = { type, team, x, z }; this.setPhase('dead');
  }
  goal(team) {
    this.score[team]++; this.stats.onTarget[team]++;
    const scorer = this.last?.team === team ? this.last : null;
    this.owner = null; this.passTo = null; this.shotLive = null;
    for (const p of this.team(team)) if (p.role !== 'POR') { p.act = 'celebrate'; p.actT = 3.0; }
    this.emit({ t: 'goal', team, scorer: scorer?.id ?? null, own: !scorer, score: this.score.slice() }); this.emit({ t: 'whistle', n: 1 });
    this.setPhase('goal'); this.concede = this.other(team);
  }
  afterGoal() { for (const p of this.players) if (p.act === 'celebrate') { p.act = ''; p.actT = 0; } this.kickoff(this.concede); }
  endHalf() {
    this.emit({ t: 'whistle', n: 3 }); this.owner = null;
    if (this.half === 1) { this.setPhase('half'); this.emit({ t: 'half' }); return; }
    if (this.cup && this.score[0] === this.score[1]) { this.emit({ t: 'toPenalties' }); this.cupPens = true; return this.startShootout(5); }
    this.finish();
  }
  secondHalf() { this.half = 2; this.clock = 0; this.dir = [this.dir[0] * -1, this.dir[1] * -1]; this.emit({ t: 'second' }); this.kickoff(1); }
  finish() {
    const s = this.score; this.result = { win: s[0] > s[1], draw: s[0] === s[1], you: s[0], cpu: s[1], stats: this.stats, pens: this.pen?.score || null };
    this.setPhase('end'); this.emit({ t: 'end', result: this.result });
  }

  // ---------------------------------------------------------------- saques
  kickoff(team) {
    this.kickoffTeam = team;
    const b = this.ball; b.set(0, 0); b.held = null; this.owner = null; this.last = null; this.passTo = null; this.buffer = null;
    for (const p of this.players) {
      const s = this.dir[p.team], f = p.role === 'POR' ? null : FORM[p.role].def;
      p.x = p.role === 'POR' ? -s * (F.HL - 0.9) : -s * Math.max(1.5, (-f[0]) * (F.HL - 3) + 2); p.z = p.role === 'POR' ? 0 : f[1] * (F.HW - 2);
      if (p.role === 'CIE') p.x = -s * 11;
      p.vx = p.vz = 0; p.h = s > 0 ? Math.PI / 2 : -Math.PI / 2; this.resetP(p);
    }
    // saca el pívot, con el ala a su lado; los rivales fuera del círculo central
    const k = this.team(team)[4], a = this.team(team)[2], s = this.dir[team];
    k.x = -s * 0.45; k.z = 0; a.x = -s * 3.5; a.z = -2.5;
    for (const p of this.team(this.other(team))) if (p.role !== 'POR' && hyp(p.x, p.z) < F.circle + 0.6) { p.x = this.dir[p.team] * -(F.circle + 0.8); }
    if (team === this.me.team && !this.autoplay) this.setMe(k, 'restart');
    this.restart = { type: 'kickoff', team, x: 0, z: 0, taker: k, t: 0, prep: 0.6, wait: 0 };
    this.owner = k; k.h = s > 0 ? Math.PI / 2 : -Math.PI / 2;
    this.setPhase('kickoff'); this.emit({ t: 'restart', type: 'kickoff', team });
    this.emit({ t: 'whistle', n: 1 });
  }
  resetP(p) { p.act = ''; p.actT = 0; p.stun = 0; p.down = 0; p.cool = 0; p.recover = 0; p.robo = null; p.slide = null; p.dive = null; p.hands = false; p.plan = null; p.react = 0; p.job = null; p.wx = p.wz = 0; p.threat = null; }
  setPiece(type, team, x, z) {
    const b = this.ball; this.owner = null; this.passTo = null; this.buffer = null;
    for (const p of this.players) { p.robo = null; p.slide = null; p.dive = null; p.down = Math.min(p.down, 0.2); p.plan = null; }
    let taker;
    if (type === 'goalkick') {
      // saque de portería: el portero con el balón en las manos dentro del área
      taker = this.gk(team); const s = -this.dir[team]; taker.x = s * (F.HL - 1.6); taker.z = clamp(z, -2, 2); taker.vx = taker.vz = 0;
      b.set(taker.x, taker.z, 1); this.catchBall(taker); taker.holdT = 1.4;
      this.restart = { type, team, x: taker.x, z: taker.z, taker, t: 0, prep: 0.8 };
      this.setPhase('setpiece'); this.emit({ t: 'restart', type, team }); return;
    }
    b.set(x, z); b.held = null;
    if (type === 'penalty') {
      taker = team === this.me.team && !this.autoplay ? this.me : this.team(team)[4];
      const s = this.dir[team];
      taker.x = x - s * 1.4; taker.z = 0;
      const k = this.gk(this.other(team)); k.x = this.goalX(team) - s * 0.2; k.z = 0; k.vx = k.vz = 0; k.dive = null; k.threat = null;
      for (const p of this.players) if (p !== taker && p.role !== 'POR') { const dx = p.x - x; if (Math.abs(p.x - this.goalX(team)) < F.area + 1.5 || hyp(dx, p.z) < 5) { p.x = x - s * (6 + (p.id % 3) * 1.5); p.z = ((p.id % 4) - 1.5) * 3; } }
    } else {
      // el más cercano de su equipo va a sacar
      taker = this.team(team).filter(p => p.role !== 'POR').sort((a, q) => hyp(a.x - x, a.z - z) - hyp(q.x - x, q.z - z))[0];
      const s = this.dir[team], back = type === 'kickin' ? { x: 0, z: Math.sign(z) * 0.5 } : type === 'corner' ? { x: Math.sign(x) * 0.4, z: Math.sign(z) * 0.4 } : { x: -s * 0.5, z: 0 };
      taker.x = x + back.x; taker.z = z + back.z;
      // los rivales a 5 m del balón
      for (const p of this.team(this.other(team))) { const dx = p.x - x, dz = p.z - z, d = hyp(dx, dz); if (d < 5 && p.role !== 'POR') { const k = 5.2 / (d || 1); p.x = clamp(x + dx * k, -F.HL + 0.5, F.HL - 0.5); p.z = clamp(z + dz * k, -F.HW + 0.5, F.HW - 0.5); } }
    }
    taker.vx = taker.vz = 0; taker.h = Math.atan2(x - taker.x, z - taker.z);
    if (team === this.me.team && !this.autoplay) this.setMe(taker, 'restart');
    this.owner = taker; this.last = taker;
    this.restart = { type, team, x, z, taker, t: 0, prep: type === 'penalty' ? 1.2 : 0.7 };
    this.setPhase('setpiece'); this.emit({ t: 'restart', type, team });
  }
  restartStep(h) {
    const r = this.restart; if (!r) return;
    r.t += h;
    const taker = r.taker, b = this.ball.p;
    // los demás se colocan; el que saca espera junto al balón (y apunta con el joystick si es el jugador)
    for (const p of this.players) {
      if (p === taker) { p.wx = p.wz = 0; continue; }
      if (p.role === 'POR') { if (r.type === 'penalty' && p.team !== r.team) { p.wx = p.wz = 0; p.face = { x: b.x, z: b.z }; } else this.keeper(p, h); continue; }
      if (r.type === 'kickoff') { p.wx = p.wz = 0; p.face = { x: 0, z: 0 }; continue; }
      const s = this.spot(p, p.team === r.team ? 'atk' : 'def');
      let tx = s.x, tz = s.z;
      if (p.team !== r.team) { const dx = tx - r.x, dz = tz - r.z, d = hyp(dx, dz); if (d < 5.2) { tx = r.x + dx / (d || 1) * 5.2; tz = r.z + dz / (d || 1) * 5.2; } }
      if (r.type === 'penalty') { tx = r.x - this.dir[r.team] * 6; tz = ((p.id % 4) - 1.5) * 3; }
      this.seek(p, tx, tz, PL.run); p.face = { x: b.x, z: b.z };
    }
    if (r.type !== 'goalkick') { this.ball.set(r.x, r.z); }
    if (this.human(taker)) {
      // apunta con el joystick
      const I = this.input; if (I.mag > 0.3) taker.h = Math.atan2(I.x, I.z);
      if (this.buffer && r.t >= r.prep) { const a = this.buffer; this.buffer = null; this.takeRestart(taker, a); return; }
      // si nadie saca en 4 s, se reanuda solo
      if (r.t > r.prep + 4) this.aiRestart(taker);
      return;
    }
    if (r.type === 'goalkick') return this.distribute(taker, h);
    if (r.t > r.prep + this.L(taker).react + 0.5) this.aiRestart(taker);
  }
  takeRestart(p, a) {
    const r = this.restart; if (!r) return;
    if (r.type === 'goalkick') return;
    if (a.kind === 'shot') return this.humanShot(p, a.charge);
    this.stats.passes[p.team]++;
    const I = this.input, f = fwd(p), dx = I.mag > 0.25 ? I.x : f.x, dz = I.mag > 0.25 ? I.z : f.z;
    const q = this.bestReceiver(p, dx, dz, r.type === 'kickoff' && I.mag < 0.25 ? Math.PI : PL.cone * 1.4);
    if (q) { this.passBall(p, q, a.loft, 0); this.setMe(q, 'pass'); } else this.passToPoint(p, p.x + dx * 8, p.z + dz * 8, a.loft);
  }
  aiRestart(p) {
    const r = this.restart, L = this.L(p);
    if (r.type === 'penalty') { const k = this.gk(this.other(p.team)), side = this.rnd() < 0.5 ? -1 : 1; return this.shoot(p, side * (HW_G - 0.4 - this.rnd() * 0.5), 0.3 + this.rnd() * 1.2, 0.7 + this.rnd() * 0.25, 0.02 + L.passErr * 0.015, 0); }
    if (r.type === 'free' && this.shotProb(p) > 0.25) return this.aiShoot(p, L);
    // el mejor pase (en el saque de centro, hacia atrás o al lado)
    let best = null, bs = -1e9;
    for (const q of this.team(p.team)) {
      if (q === p || q.role === 'POR') continue;
      const d = hyp(q.x - p.x, q.z - p.z); if (d < 2) continue;
      const sc = Math.min(this.laneOpen(p.team, p.x, p.z, q.x, q.z), 3) * 0.5 + Math.min(this.openness(q), 5) * 0.3 - Math.abs(d - 8) * 0.05 + (r.type === 'corner' ? this.dir[p.team] * q.x * 0.05 : 0);
      if (sc > bs) { bs = sc; best = q; }
    }
    this.stats.passes[p.team]++;
    if (best) this.passBall(p, best, false, r.type === 'kickoff' ? 0 : L.passErr * 0.5);
    else { const f = fwd(p); this.passToPoint(p, p.x + f.x * 8, p.z + f.z * 8, false); }
  }

  // ---------------------------------------------------------------- tanda de penaltis
  // 5 tiros por equipo (o los que se pidan) y después muerte súbita. El jugador tira y también para.
  startShootout(kicks = 5) {
    this.mode = 'penalties';
    this.pen = { kicks, n: [0, 0], score: [0, 0], log: [[], []], turn: 0, sudden: false, human: null, t: 0, dive: null };
    this.dir = [1, 1];
    this.nextPenalty();
  }
  nextPenalty() {
    const P = this.pen, t = P.turn, s = 1, gx = F.HL;
    const shooter = this.team(t)[[4, 2, 3, 1, 4][P.n[t] % 5]], keeper = this.gk(this.other(t));
    for (const p of this.players) { this.resetP(p); p.vx = p.vz = 0; if (p !== shooter && p !== keeper) { p.x = -2 + (p.id % 5) * 0.9; p.z = p.team ? -1.5 : 1.5; p.h = Math.PI / 2; } }
    this.dir[t] = 1; this.dir[this.other(t)] = -1;
    const bx = gx - F.spot; this.ball.set(bx, 0); this.ball.held = null; this.owner = shooter; this.last = shooter;
    shooter.x = bx - 1.6; shooter.z = -0.4; shooter.h = Math.PI / 2;
    keeper.x = gx - 0.25; keeper.z = 0; keeper.h = -Math.PI / 2;
    P.shooter = shooter; P.keeper = keeper; P.t = 0; P.kicked = false; P.human = this.autoplay ? null : t === 0 ? 'shooter' : 'keeper'; P.plan = null; P.guess = false; this.buffer = null;
    this.restart = { type: 'penalty', team: t, x: bx, z: 0, taker: shooter, t: 0, prep: 0.8 };
    if (t === 0 && !this.autoplay) this.me = shooter;
    this.setPhase('pen_aim'); this.emit({ t: 'penTurn', team: t, n: P.n[t] + 1, sudden: P.sudden, human: P.human });
  }
  // el jugador de portero: elige lado con el joystick (o quedarse en el centro) y se lanza cuando el rival chuta
  humanDive() {
    const P = this.pen; if (!P || P.human !== 'keeper' || P.plan) return;
    const I = this.input, side = I.mag > 0.3 && Math.abs(I.z) > 0.35 ? Math.sign(I.z) : 0;
    P.plan = { side, high: I.mag > 0.3 && I.x < -0.45 };
    this.emit({ t: 'divePlan', side });
    if (this.phase === 'pen_flight') this.keeperGo(P.keeper, P.plan);
  }
  keeperGo(k, plan) {
    if (k.dive || !plan.side) return;
    k.dive = { t: 0.62, vz: plan.side * 4.8, vx: 0, hy: plan.high ? 1.6 : 0.7, side: plan.side }; k.act = 'dive'; k.actT = 0.9;
    this.emit({ t: 'dive', p: k.id, side: plan.side, high: plan.high });
  }
  penStep(h) {
    const P = this.pen, ph = this.phase; if (!P) return;
    for (const p of this.players) this.timers(p, h);
    const sh = P.shooter, k = P.keeper, B = this.ball.p;
    if (k.dive) this.diveStep(k, h);
    if (ph === 'pen_aim') {
      this.restart.t += h; P.t += h;
      this.ball.set(this.restart.x, 0);
      if (P.human === 'shooter') {
        const I = this.input; if (I.mag > 0.3) sh.h = Math.atan2(I.x, I.z);
        if (this.buffer && P.t > 0.8) { const a = this.buffer; this.buffer = null; this.penKick(sh, a.kind === 'shot' ? a.charge : 0.5); }
        if (P.t > 9) this.penKick(sh, 0.6);
      } else if (P.t > 1.6 + this.rnd() * 0.02) this.penKick(sh, 0.6 + this.rnd() * 0.35);
    } else if (ph === 'pen_flight') {
      P.t += h;
      // el portero de la máquina: se tira tras su reacción (adivina un lado o espera); el del jugador, al lado que eligió
      if (P.human === 'keeper' && P.plan && !k.dive && P.t > 0.04) this.keeperGo(k, P.plan);
      if (P.human !== 'keeper' && !k.dive && !P.guess) {
        P.guess = true; const L = this.L(k);
        const side = this.rnd() < 0.18 ? 0 : (this.rnd() < 0.5 + (P.aimSide * 0.22 * (L.keeperReach - 0.6)) ? P.aimSide : -P.aimSide);
        if (side) { k.dive = { t: 0.62, vz: side * 4.4 * L.keeperReach, vx: 0, hy: 0.6 + this.rnd() * 1.1, side }; k.act = 'dive'; k.actT = 0.9; this.emit({ t: 'dive', p: k.id, side }); }
      }
      if (!k.dive) this.keeperTouch(k);
      const ev = this.ball.step(h, []); for (const e of ev) this.ballEvent(e);
      if (this.owner === k) this.holdBall(k);
      const lim = F.HL + F.line / 2 + R;
      let res = null;
      if (B.x > lim && Math.abs(B.z) < HW_G && B.y < F.goalH) res = 'goal';
      else if (this.owner === k || (P.t > 0.5 && this.ball.speed < 0.6) || B.x > lim || Math.abs(B.z) > F.HW || P.t > 2.6 || (this.ball.v.x < -0.5 && B.x < F.HL - 1)) res = this.owner === k || this.last === k ? 'save' : 'miss';
      if (res) this.penResult(res);
    } else if (ph === 'pen_result') {
      if (this.phaseT > 1.6) this.penAdvance();
    }
    for (const p of this.players) if (p !== k || !k.dive) { p.wx = p.wz = 0; if (p !== sh && p !== k) p.face = { x: B.x, z: B.z }; }
    for (const p of this.players) if (!p.dive) this.integrate(p, h);
  }
  penKick(p, charge) {
    const P = this.pen, I = this.input;
    let tz, ty;
    if (P.human === 'shooter') {
      const ax = I.mag > 0.25 ? I.x : 1, az = I.mag > 0.25 ? I.z : 0;
      tz = ax > 0.1 ? clamp(az / ax * F.spot, -2.2, 2.2) : Math.sign(az || 1) * 1.4; if (this.assist) tz = clamp(tz, -HW_G + 0.25, HW_G - 0.25);
      ty = 0.3 + charge * 1.5;
      P.aimSide = Math.sign(tz) || 0;
      this.restart = null; this.shoot(p, tz, ty, Math.min(1, charge * 0.85 + 0.15), 0.01 + charge * charge * 0.035, 0);
    } else {
      const L = this.L(p), side = this.rnd() < 0.5 ? -1 : 1; tz = side * (0.55 + this.rnd() * 0.85); ty = 0.25 + this.rnd() * 1.35;
      P.aimSide = side;
      this.restart = null; this.shoot(p, tz, ty, 0.65 + this.rnd() * 0.3, 0.015 + L.passErr * 0.012, 0);
    }
    P.kicked = true; P.t = 0; P.guess = false; this.setPhase('pen_flight');
  }
  penResult(res) {
    const P = this.pen, t = P.turn;
    P.n[t]++; P.log[t].push(res === 'goal'); if (res === 'goal') P.score[t]++;
    this.emit({ t: 'penResult', team: t, res, score: P.score.slice(), log: P.log.map(l => l.slice()) });
    if (res === 'goal') this.emit({ t: 'goal', team: t, pen: true, score: P.score.slice() });
    this.setPhase('pen_result');
  }
  penAdvance() {
    const P = this.pen, [a, b] = P.score, [na, nb] = P.n, K5 = P.kicks;
    let done = false;
    if (!P.sudden) {
      // ¿ya no le da tiempo a remontar?
      if (a + (K5 - na) < b || b + (K5 - nb) < a) done = true;
      else if (na >= K5 && nb >= K5) { if (a !== b) done = true; else P.sudden = true; }
    } else if (na === nb && a !== b) done = true;
    if (done) {
      this.result = { win: a > b, draw: false, you: this.mode === 'penalties' && !this.cupPens ? a : this.score[0], cpu: this.mode === 'penalties' && !this.cupPens ? b : this.score[1], pens: [a, b], stats: this.stats };
      this.result.win = a > b; this.setPhase('end'); this.emit({ t: 'end', result: this.result }); return;
    }
    P.turn = this.other(P.turn); this.nextPenalty();
  }
}
