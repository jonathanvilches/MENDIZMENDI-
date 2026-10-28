// Lógica del partido (sin gráficos) a paso fijo de 120 Hz, en los dos formatos de rules.js:
//   · fútbol 11: veintidós jugadores, IA 4-4-2, fuera de juego, saque de banda con las manos, córner, saque de meta,
//     faltas y penaltis, el árbitro y sus dos asistentes;
//   · fútbol sala: diez jugadores, IA 1-2-2, saque de banda con el pie (4 s para sacar), saque de portería con la mano
//     del portero, área en D, faltas acumuladas (desde la 6.ª, tiro libre directo sin barrera desde 10 m) y dos árbitros
//     de banda; sin fuera de juego.
// La vista (match.js) le pasa la entrada del jugador (dirección en el mundo y botones) y recibe eventos para dibujar,
// sonar y rotular. Se puede jugar sola (autoplay) para las pruebas, y sin gráficos (node).
import { FIELD as F, PLAYER as PL, LEVELS, FORM, ROLES, NUMBERS, LINE, RULES as RU, useFormat, SISTEMAS, FORMAT } from './rules.js';
import { Ball } from './physics.js';
import { clamp } from '../util/math.js';
import { mezcla } from '../util/mezcla.js';
import { FutbolHumano } from './humano.js';
import { FutbolBalon } from './balon.js';
import { FutbolDefensa } from './defensa.js';
import { FutbolIA } from './ia.js';
import { FutbolArbitro } from './arbitro.js';
import { STEP, N, SC, DEBUG, hyp, angDiff, TAP, FIT, legs } from './comun.js';

export class FutbolGame {
  /**
   * @param {object} o { mode: 'match'|'penalties'|'reto'|'tutorial', level: 'facil'|'normal'|'dificil', duration (min por
   *   parte, 2–5), assist, autoplay, cup (empate → penaltis), kicks (penaltis por equipo), seed, replays }
   */
  constructor(o = {}) {
    if (o.format) useFormat(o.format, o.surface);
    this.o = o; this.mode = o.mode || 'match'; this.format = o.format || 'f11';
    this.lvl = LEVELS[o.level] || LEVELS.normal; this.mates = LEVELS.normal;
    this.halfLen = clamp(o.duration ?? 3, 2, 5) * 60; this.assist = o.assist !== false; this.autoplay = !!o.autoplay;
    this.cup = !!o.cup; this.replays = o.replays !== false; this.autoSubs = !!o.autoSubs;
    let s = (o.seed || (Math.random() * 1e9)) | 0 || 1;
    this.rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    this.ball = new Ball();
    this.dir = [1, -1];            // hacia dónde ataca cada equipo (en x)
    this.players = [];
    for (const t of [0, 1]) ROLES.forEach((role, i) => this.players.push({ id: t * N + i, team: t, role, line: LINE[role], num: NUMBERS[role], x: 0, z: 0, vx: 0, vz: 0, h: 0, energy: 1,
      act: '', actT: 0, stun: 0, cool: 0, down: 0, recover: 0, touchT: 0, react: 0, think: 0, plan: null, tackleCD: 0, hands: false, holdT: 0, dive: null, slide: null,
      tx: 0, tz: 0, run: false, face: null, robo: null, sprinting: false, fit: 1, inj: null }));
    this.teams = [0, 1].map(t => this.players.filter(p => p.team === t));
    // el sistema de cada equipo (fútbol 11): el tuyo, el que elijas; el rival, el que le toque
    if (FORMAT === 'f11') { this.setSistema(0, o.sistema || '4-4-2'); this.setSistema(1, o.sistemaRival || '4-4-2'); }
    this.team = (t) => this.teams[t];
    this.gk = (t) => this.players[t * N];
    this.me = this.byRole(0, RU.start);     // el delantero centro (el pívot en sala): el que lleva el jugador al empezar
    // fútbol 11: el árbitro (sigue el juego en diagonal) y los dos asistentes (cada uno en su banda, a la altura del
    // penúltimo defensor); sala: dos árbitros, uno por banda, a la altura del balón
    this.refs = (RU.refs === 'sala' ? [{ kind: 'side', side: 1, x: -2, z: F.HW + 0.9 }, { kind: 'side', side: -1, x: 2, z: -F.HW - 0.9 }]
      : [{ kind: 'ref', x: -8, z: 12 }, { kind: 'line', side: 1, x: 20, z: -F.HW - 1.2 }, { kind: 'line', side: -1, x: -20, z: F.HW + 1.2 }])
      .map(r => ({ vx: 0, vz: 0, h: 0, flag: 0, ...r }));
    this.fouls = [0, 0];   // faltas acumuladas en la parte (fútbol sala)
    this.offs = null;   // compañeros en fuera de juego en el último pase
    this.score = [0, 0]; this.half = 1; this.clock = 0; this.time = 0; this.acc = 0;
    this.phase = 'intro'; this.phaseT = 0; this.events = []; this.restart = null; this.kickoffTeam = 0;
    this.owner = null; this.last = null; this.passTo = null; this.passT = 0; this.buffer = null;
    this.input = { x: 0, z: 0, mag: 0, sprint: false, aimX: 0, aimZ: 0 };
    this.hold = { pass: -1, shoot: -1, through: -1, lob: -1 }; this.switchCD = 0;
    this.ts = [{ state: '', t: 0 }, { state: '', t: 0.1 }];
    this.stats = { shots: [0, 0], onTarget: [0, 0], passes: [0, 0], passesOk: [0, 0], poss: [0, 0], steals: [0, 0], fouls: [0, 0], saves: [0, 0], yellow: [0, 0], red: [0, 0] };
    this.cards = {};   // tarjetas de cada jugador (id → 'yellow' | 'red')
    // banquillo: los suplentes de cada equipo (dorsal, línea, su forma, su tarjeta y su lesión) y los cambios que quedan.
    // El que entra ocupa el sitio del que sale (su puesto en el sistema) con la forma entera. En sala son «volantes»: el
    // que sale vuelve al banquillo y puede entrar otra vez
    this.bench = [0, 1].map(() => (RU.bench || []).map(([num, line]) => ({ num, line, fit: 1, card: null, inj: null, used: false })));
    this.subsLeft = [RU.subs ?? 5, RU.subs ?? 5]; this.subPlan = [[], []]; this.subsDone = [0, 0];
    this.pen = null; this.result = null;
  }
  /** Cambia el sistema de un equipo (también a mitad de partido): cada jugador pasa a su nuevo sitio y su nueva línea. */
  setSistema(t, id) {
    const S = SISTEMAS[id]; if (!S || FORMAT !== 'f11') return;
    this.sistema ||= []; this.sistema[t] = id;
    for (const p of this.teams[t]) { const f = S.roles[p.role]; if (!f) continue; p.form = f; p.line = f.line; p.puesto = f.name; }
  }
  form(p) { return p.form || FORM[p.role]; }
  byRole(t, role) { return this.players[t * N + ROLES.indexOf(role)]; }
  emit(e) { this.events.push({ ...e, at: this.time }); if (DEBUG()) console.log('[fútbol]', this.time.toFixed(2), e.t, e); }
  drain() { const e = this.events; this.events = []; return e; }
  other(t) { return 1 - t; }
  ownGoal(t) { return -this.dir[t] * F.HL; }
  goalX(t) { return this.dir[t] * F.HL; }
  /** ¿Está (x, z) en el área de penalti de la portería que defiende t? (16,5 × 40,32 m) */
  inArea(t, x, z, m = 0) {
    const gx = this.ownGoal(t), s = -this.dir[t], d = s * (gx - x);
    // sala: la D, a 6 m como mucho del segmento entre los postes
    if (F.areaD) return d >= -0.2 && hyp(d, Math.max(0, Math.abs(z) - F.goalW / 2)) <= F.area + m;
    return d >= -0.2 && d <= F.area + m && Math.abs(z) <= F.areaW / 2 + m;
  }
  /** Línea del fuera de juego de los que atacan hacia s: la del penúltimo rival (o el medio campo), en coordenada s·x. */
  offLine(t) {
    const s = this.dir[t]; let a = -1e9, b = -1e9;
    for (const q of this.team(this.other(t))) { const u = s * q.x; if (u > a) { b = a; a = u; } else if (u > b) b = u; }
    return Math.max(b, 0);
  }
  defending() { return !!this.owner && this.owner.team !== this.me.team; }
  human(p) { return !this.autoplay && p === this.me; }
  L(p) { return p.team === 1 ? this.lvl : this.mates; }

  // ---------------------------------------------------------------- entrada del jugador
  /** Dirección de movimiento en el mundo (x, z), intensidad 0…1 y sprint. */
  setMove(x, z, mag, sprint) { const I = this.input; I.x = x; I.z = z; I.mag = mag; I.sprint = sprint; if (mag > 0.25) { I.aimX = x; I.aimZ = z; } }
  // Controles (cuatro, para jugar sin aprenderse un mando entero): pass, shoot, switch y el sprint (en setMove).
  //   con el balón: pass = pase al compañero hacia donde apuntas (raso, o por alto si hay rivales en medio y está
  //     lejos), shoot = tiro (mantener para cargar la fuerza);
  //   sin el balón: pass = robar, shoot = entrada, switch = cambiar de jugador.
  // (El motor conserva el pase al hueco, el elevado, el tiro colocado, proteger y presionar para la IA, los saques y
  // las pruebas: lob, through, finesse, shield, contain, mate)
  press(a) {
    if (this.autoplay) return;
    if (this.mode === 'penalties' && this.pen?.human === 'keeper') { if (a === 'pass' || a === 'shoot' || a === 'tackle' || a === 'contain') this.humanDive(); return; }
    const I = this.input, live = this.phase === 'play' || this.phase === 'tuto', def = this.defending() && live;
    // tu portero con el balón en las manos: lo sacas tú (PASE con la mano al compañero al que apuntas, TIRO un saque
    // largo con la fuerza que cargues)
    if (this.gkCtl) { if (a === 'pass') this.gkRelease('throw'); else if (a === 'shoot') this.hold.shoot = 0; return; }
    // un tiro del rival hacia tu portería: cualquier botón hace que tu portero se estire hacia donde apuntas
    if (live && this.rivalShot() && (a === 'pass' || a === 'shoot' || a === 'switch')) { this.humanKeeperDive(); return; }
    if (a === 'switch') { this.manualSwitch(); return; }
    // llevando a tu portero: PASE o TIRO = estirarse o salir a por el balón hacia donde apuntas
    if (this.me.role === 'POR' && live && (a === 'pass' || a === 'shoot') && this.owner !== this.me) { this.humanKeeperDive(); return; }
    if (a === 'contain') { I.contain = true; return; }
    if (a === 'mate') { I.mate = true; return; }
    if (a === 'shield') { I.shield = true; return; }
    if (a === 'finesse') { I.finesse = true; return; }
    if (a === 'tackle') { if (live) this.tackle(this.me, 'robo'); return; }
    if (a === 'slide') { if (live) this.tackle(this.me, 'slide'); return; }
    if (a === 'through') { if (def) { I.contain = true; I.mate = true; } else this.hold.through = 0; return; }
    if (a === 'lob') { if (def) this.tackle(this.me, 'robo'); else this.hold.lob = 0; return; }
    if (a === 'pass') { if (def) this.tackle(this.me, 'robo'); else this.hold.pass = 0; }
    if (a === 'shoot') { if (def) this.tackle(this.me, 'slide'); else { this.hold.shoot = 0; this.aim = null; } }
  }
  release(a) {
    if (this.autoplay) return;
    const I = this.input;
    if (a === 'contain') I.contain = false;
    if (a === 'mate') I.mate = false;
    if (a === 'shield') I.shield = false;
    if (a === 'finesse') I.finesse = false;
    if (a === 'through') { I.contain = false; I.mate = false; if (this.hold.through >= 0) { this.hold.through = -1; this.action({ kind: 'through' }); } }
    if (a === 'lob' && this.hold.lob >= 0) { this.hold.lob = -1; this.action({ kind: 'pass', loft: true }); }
    // pase: un toque, al pie del compañero al que apuntas (con la fuerza justa); mantenido, la barra se llena y tú pones
    // la fuerza: flojo se queda corto, a media barra llega al compañero y fuerte va más allá, al hueco o en largo
    if (a === 'pass' && this.hold.pass >= 0) { const t = this.hold.pass; this.hold.pass = -1; this.action(t < TAP || this.defending() ? { kind: 'pass', loft: false } : { kind: 'pass', loft: false, power: Math.min(1, t / PL.charge) }); }
    if (a === 'shoot' && this.hold.shoot >= 0 && this.gkCtl) { const charge = Math.min(1, this.hold.shoot / PL.charge); this.hold.shoot = -1; this.gkRelease('kick', charge); return; }
    if (a === 'shoot' && this.hold.shoot >= 0) { const charge = Math.min(1, this.hold.shoot / PL.charge); this.hold.shoot = -1; this.action({ kind: 'shot', charge, finesse: !!I.finesse }); }
  }
  // la barra de fuerza: la del tiro desde que se pulsa; la del pase en cuanto deja de ser un toque
  get charge() { return this.hold.shoot >= 0 ? Math.min(1, this.hold.shoot / PL.charge) : this.hold.pass >= TAP ? Math.min(1, this.hold.pass / PL.charge) : -1; }
  get chargeKind() { return this.hold.shoot >= 0 ? 'shoot' : this.hold.pass >= TAP ? 'pass' : null; }
  action(a) {
    const me = this.me;
    if (this.mode === 'penalties') { this.buffer = { ...a, t: 60 }; return; }
    if (this.restart && this.restart.taker === me) { if (this.restart.t >= this.restart.prep) this.takeRestart(me, a); else this.buffer = { ...a, t: this.restart.prep - this.restart.t + 0.6 }; return; }   // (se guarda hasta que se pueda sacar)
    if (this.phase !== 'play' && this.phase !== 'tuto') return;
    // (un tiro pedido espera algo más: si recuperas el balón enseguida, sale; con un balón por alto que te llega, como un
    // centro, espera hasta que te llegue a la cabeza)
    const hp = this.owner !== me && !me.hands && (a.kind === 'shot' || a.kind === 'pass') ? this.headPoint(me) : null;
    if (this.owner === me && !me.hands) this.doAction(me, a); else this.buffer = { ...a, t: hp ? Math.min(2.5, hp.t + 0.35) : a.kind === 'shot' ? 0.5 : 0.32 };
      // si el balón llega en ese momento, al primer toque
  }
  doAction(p, a) {
    if (a.kind === 'pass') this.humanPass(p, a.loft, a.power);
    else if (a.kind === 'through') this.humanThrough(p, a.charge ?? 0.5);
    else this.humanShot(p, a.charge, a.finesse);
  }

  // ---------------------------------------------------------------- arranque y bucle a paso fijo
  start() {
    if (this.mode === 'penalties') return this.startShootout(this.o.kicks || 5);
    this.kickoff(0);
  }
  update(dt) {
    this.acc += Math.min(dt, 0.25);
    let n = 0;
    while (this.acc >= STEP && n < 40) { for (const p of this.players) { p.px = p.x; p.pz = p.z; } this.step(STEP); this.acc -= STEP; n++; }
    if (n >= 40) this.acc = 0;
    this.alpha = this.acc / STEP;   // cuánto falta para el siguiente paso: la vista interpola entre el anterior y este
  }
  step(h) {
    this.time += h; this.phaseT += h;
    if (this.hold.pass >= 0) this.hold.pass += h;
    if (this.hold.shoot >= 0) { this.hold.shoot += h; this.aimStep(h); }
    if (this.hold.through >= 0) this.hold.through += h;
    if (this.hold.lob >= 0) this.hold.lob += h;
    this.switchCD -= h;
    if (this.buffer && (this.buffer.t -= h) <= 0) this.buffer = null;
    const ph = this.phase;
    if (ph === 'intro' || ph === 'end') return;
    if (this.mode === 'penalties' || ph.startsWith('pen')) return this.penStep(h);
    if (this.hook?.step?.(h) === false) return;   // retos y tutorial
    if (ph === 'goal' && this.phaseT > 3.2) { if (this.replays) { this.setPhase('replay'); this.emit({ t: 'replay' }); } else this.afterGoal(); }
    if (ph === 'replay' && this.phaseT > 3.4) this.afterGoal();
    if (ph === 'half' && this.phaseT > 3) this.secondHalf();
    if (ph === 'dead' && this.phaseT > 1.0) { const d = this.pendingRestart; this.pendingRestart = null; this.setPiece(d.type, d.team, d.x, d.z, d.indirect, d.noWall); }
    if (ph === 'foulstop' && this.phaseT > 1.1) { const d = this.pendingRestart; this.pendingRestart = null; this.setPiece(d.type, d.team, d.x, d.z, d.indirect, d.noWall); }
    // cambios: en cada parada, los que estaban pedidos y los del entrenador; con el balón en juego, los avisos
    if (this.mode === 'match' && this.canSub()) {
      if (this.subPlan[0].length) this.applySubs(0);
      if (this.subPlan[1].length) this.applySubs(1);
      if (this.subCheck !== this.stopN) { this.subCheck = this.stopN; this.aiSubs(); }
    }
    if (this.mode === 'match' && ph === 'play' && (this.warnT = (this.warnT || 0) - h) <= 0) { this.warnT = 0.5; this.subWarn(); this.benchRest(0.5); }
    // jugadores
    for (const p of this.players) this.timers(p, h);
    if (ph !== 'play' && ph !== 'tuto') this.gkCtl = null;
    if (ph === 'play' || ph === 'tuto') {
      this.clock += ph === 'play' ? h : 0;
      for (const t of [0, 1]) if ((this.ts[t].t -= h) <= 0) { this.ts[t].t = 0.2; this.teamThink(t); }
      this.gkCtl = !this.autoplay && !this.noSwitch && this.owner?.hands && this.owner.team === this.me.team && this.owner.role === 'POR' ? this.owner : null;
      if (this.gkCtl && this.me !== this.gkCtl) { this.me.wx = this.me.wz = 0; }
      if (!this.autoplay && !this.gkCtl) this.humanStep(h);
      for (const p of this.players) if (!this.human(p) || (this.gkCtl && p === this.me)) this.aiStep(p, h);
    } else if (ph === 'kickoff' || ph === 'setpiece') this.restartStep(h);
    else for (const p of this.players) this.drift(p, ph);
    for (const p of this.players) this.integrate(p, h);
    this.separate();
    if (this.owner?.hands && this.owner.role === 'POR' && (ph === 'play' || ph === 'setpiece')) this.keeperRoom(this.owner, h);
    this.officials(h);
    // balón
    if (ph === 'play' || ph === 'tuto') { this.headers(); this.control(h); }
    const ev = this.ball.step(h, []);
    for (const e of ev) this.ballEvent(e);
    if (this.owner?.hands) this.holdBall(this.owner);
    if (ph === 'play') { this.referee(); if (this.owner) this.stats.poss[this.owner.team] += h; }
    if (ph === 'play' && this.clock >= this.halfLen) this.endHalf();
    if (this.passTo && ((this.passT -= h) <= 0 || this.owner)) this.passTo = null;
  }
  // con el balón en las manos del portero nadie puede presionarle ni ponerse delante para estorbar su saque (Regla 12:
  // impedir que el portero suelte el balón es infracción): los rivales se quedan a 5 m (en sala, a 3) y, si eres tú el
  // que se acerca, te lo dice el árbitro una vez
  keeperRoom(k, h) {
    const R0 = 5 * Math.max(SC, 0.6);
    for (const q of this.team(this.other(k.team))) {
      if (q.off) continue;
      const dx = q.x - k.x, dz = q.z - k.z, d = hyp(dx, dz);
      if (d >= R0) continue;
      const ux = d > 1e-3 ? dx / d : -this.dir[k.team], uz = d > 1e-3 ? dz / d : 0, nd = d + (R0 - d) * Math.min(1, h * 30);
      q.x = k.x + ux * nd; q.z = k.z + uz * nd;
      const vin = q.vx * ux + q.vz * uz; if (vin < 0) { q.vx -= vin * ux; q.vz -= vin * uz; }   // (no sigue hacia él)
      q.robo = null;
      if (this.human(q) && this.gkRoomWarned !== k.holdId) { this.gkRoomWarned = k.holdId; this.emit({ t: 'gkRoom', p: q.id }); }
    }
  }
  setPhase(p) { if (p !== 'play' && this.phase === 'play') this.stopN = (this.stopN || 0) + 1; this.phase = p; this.phaseT = 0; this.emit({ t: 'phase', phase: p }); }
  timers(p, h) {
    // sala: pasados los 2 minutos de la expulsión, entra otro jugador (solo con el balón en juego)
    if (p.off && Number.isFinite(p.offT) && (this.phase === 'play' || this.phase === 'dead') && (p.offT -= h) <= 0) this.backOn(p);
    p.cool = Math.max(0, p.cool - h); p.stun = Math.max(0, p.stun - h); p.down = Math.max(0, p.down - h); p.recover = Math.max(0, p.recover - h);
    if (p.inj && this.phase === 'play' && (p.inj.t -= h) <= 0) { p.inj = null; this.emit({ t: 'healed', p: p.id, team: p.team }); }   // (la leve se pasa)
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
    const sprint = p.wantSprint && p.energy > 0.01 && want > PL.run * 0.8 && p.inj?.sev !== 'grave';
    p.sprinting = sprint;
    // (con el balón en juego baja la forma; la energía se recupera más despacio cuanto más cansado)
    if (this.phase === 'play') {
      p.fit = Math.max(0.2, p.fit - h / (2 * this.halfLen) * (p.role === 'POR' ? FIT.gk : FIT.base + (sprint ? FIT.sprint : 0)));
      // sin fuerzas y esprintando a tope, a veces se resiente un músculo
      if (sprint && p.energy < 0.05 && p.fit < 0.5 && !p.inj && this.rnd() < 0.03 * h) this.hurt(p, 'muscular', 'leve');
    }
    p.energy = clamp(p.energy + (sprint ? -PL.drain : PL.regain * (0.55 + 0.45 * p.fit)) * h, 0, p.fit);
    // el sprint del tuyo se nota: un 15 % más de punta y arrancada más explosiva (se gasta igual)
    const hs = sprint && this.human(p);
    const top = (sprint ? PL.sprint * (hs ? 1.15 : 1) : PL.run) * (p.team === 1 ? this.lvl.speed : 1) * (this.owner === p ? 0.88 : 1) * (p.recover > 0 ? 0.55 : 1) * legs(p);
    if (want > top) { wx *= top / want; wz *= top / want; }
    const wv = Math.min(want, top), v0 = hyp(p.vx, p.vz);
    if (v0 > 0.6 && wv > 0.6) {
      // con agarre (como en los juegos de fútbol): la velocidad gira hacia donde apunta el joystick sin derrapar en una curva abierta
      // (más rápido trotando que esprintando, algo menos con el balón); en un cambio brusco de sentido el jugador
      // planta el pie, frena en seco y sale hacia el otro lado
      const a0 = Math.atan2(p.vx, p.vz), d = angDiff(a0, Math.atan2(wx, wz));
      const omega = (PL.grip || 8.5) * (sprint ? 0.7 : 1) * (this.owner === p ? 0.88 : 1) * (p.recover > 0 ? 0.5 : 1) * (this.human(p) ? 1.7 : 1);   // (el tuyo responde antes al joystick: gira casi al momento, también con el balón)
      if (Math.abs(d) > 2.1 && this.human(p)) {
        // el tuyo, en un cambio brusco de sentido, pivota sobre el pie y sale ya hacia el otro lado con media velocidad:
        // antes frenaba hasta casi pararse y, al girar el joystick hacia atrás, parecía que dejaba de correr
        const a1 = Math.atan2(wx, wz), nv = Math.max(Math.min(v0, wv) * 0.55, Math.min(3, wv)); p.vx = Math.sin(a1) * nv; p.vz = Math.cos(a1) * nv;
      } else if (Math.abs(d) > 2.1) {
        const nv = Math.max(0, v0 - (PL.brake || 26) * 1.15 * h);
        if (nv < 1.2) { const a1 = Math.atan2(wx, wz); p.vx = Math.sin(a1) * nv; p.vz = Math.cos(a1) * nv; }
        else { p.vx *= nv / v0; p.vz *= nv / v0; }
      } else {
        const a = a0 + clamp(d, -omega * h, omega * h);
        // en el giro se pierde algo de velocidad (más cuanto más cerrado), luego se recupera
        const tv = wv * (1 - Math.min(0.35, Math.abs(d) * 0.22)), dv = tv - v0;
        const nv = v0 + clamp(dv, -(PL.brake || 26) * h, PL.acc * (this.human(p) ? 1.25 : 1) * (hs ? 1.5 : 1) * h);
        p.vx = Math.sin(a) * nv; p.vz = Math.cos(a) * nv;
      }
    } else {
      // arrancar o pararse: acelera a 14 m/s² y frena a la frenada del formato
      const braking = wx * p.vx + wz * p.vz < p.vx * p.vx + p.vz * p.vz - 0.01;
      // (el tuyo, al soltar el joystick, frena en seco y deja el balón parado en el pie)
      let dvx = wx - p.vx, dvz = wz - p.vz; const dl = hyp(dvx, dvz), mx = (braking ? (PL.brake || 26) * (this.human(p) && want < 0.1 ? 1.6 : 1) : PL.acc * (hs ? 1.5 : 1)) * (this.human(p) ? 1.25 : 1) * h;
      if (dl > mx) { dvx *= mx / dl; dvz *= mx / dl; }
      p.vx += dvx; p.vz += dvz;
    }
    p.x += p.vx * h; p.z += p.vz * h;
    this.bounds(p);
    // giro suavizado: hacia donde corre, o hacia donde quiere mirar (al balón, a la portería)
    const v = hyp(p.vx, p.vz), turn = (this.owner === p ? PL.turnBall || 9 : PL.turn || 12) * (this.human(p) && !p.shielding ? 1.4 : 1) * h;
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
      const a = P[i], b = P[j]; if (a.dive || b.dive || a.off || b.off) continue;
      const dx = b.x - a.x, dz = b.z - a.z, d = hyp(dx, dz);
      if (d < m && d > 1e-4) { const k = (m - d) / d, wa = this.owner === a ? 0.3 : this.owner === b ? 0.7 : 0.5; a.x -= dx * k * wa; a.z -= dz * k * wa; b.x += dx * k * (1 - wa); b.z += dz * k * (1 - wa); }
    }
  }
  // fuera de juego (balón muerto, gol, descanso): los jugadores andan a su sitio o celebran
  drift(p, ph) {
    p.wantSprint = false;
    if (p.off) return this.offStep(p);
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













}
// (sus métodos por temas, cada uno en su archivo: el jugador que llevas, el balón, la defensa y los cambios, la
// inteligencia de los demás y el árbitro con los saques)
mezcla(FutbolGame, FutbolHumano, FutbolBalon, FutbolDefensa, FutbolIA, FutbolArbitro);
