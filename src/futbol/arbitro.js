// El partido de fútbol (futbol/game.js), el árbitro y la reanudación: fueras de banda y de fondo, el fuera de juego,
// los goles, el descanso y el final, los saques de cada clase y la tanda de penaltis. Son métodos de FutbolGame:
// game.js los une a su clase (util/mezcla.js), con su this.
import { FIELD as F, KICKERS, PLAYER as PL, RULES as RU } from './rules.js';
import { clamp } from '../util/math.js';
import { R, HW_G, N, SC, hyp, angDiff, fwd } from './comun.js';

export class FutbolArbitro {
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
    if (this.noDirect && this.last !== this.noDirect.p) this.noDirect = null;   // ya la ha tocado otro
    for (const s of [-1, 1]) if (s * B.x > lim && Math.abs(B.z) < HW_G && B.y < F.goalH) {
      const t = this.dir[0] === s ? 0 : 1;
      // directo de un saque de banda, de un indirecto o de la mano del portero: no es gol; si entra en la portería
      // rival, saque de portería; si entra en la propia, córner (y de cualquier saque directo a la propia, córner)
      const nd = this.noDirect;
      if (nd && (!nd.ownOnly || nd.p.team !== t)) { this.emit({ t: 'noGoal', why: nd.why, team: t }); return this.endLine(s, nd.p.team === t ? 'goalkick' : 'corner'); }
      return this.goal(t);
    }
    if (Math.abs(B.x) > lim) {
      // fuera de fondo: córner si la tocó el que defiende esa portería, saque de portería si fue el atacante
      const s = Math.sign(B.x), def = this.dir[0] === -s ? 0 : 1;
      return this.endLine(s, this.last?.team === def ? 'corner' : 'goalkick');
    }
    if (Math.abs(B.z) > F.HW + F.line / 2 + R) {
      const t = this.last ? this.other(this.last.team) : 0;
      return this.out('throwin', t, clamp(B.x, -F.HL + 1, F.HL - 1), Math.sign(B.z) * F.HW);
    }
  }
  // balón fuera por la línea de fondo del lado s: córner para el que ataca esa portería o saque de portería para el que
  // la defiende (en sala, el portero saca con la mano desde su área)
  endLine(s, type) {
    const B = this.ball.p, def = this.dir[0] === -s ? 0 : 1, zs = Math.sign(B.z || 1);
    if (type === 'corner') return this.out('corner', this.other(def), s * (F.HL - 0.4), zs * (F.HW - 0.4));
    return this.out('goalkick', def, s * (F.HL - (F.box || 1.4)), F.box ? zs * (F.boxW / 2 - 3) : 0);
  }
  // fuera de juego: tiro libre indirecto para el otro equipo desde donde estaba el adelantado; el asistente levanta el banderín
  offside(p) {
    const t = this.other(p.team);
    this.owner = null; this.passTo = null; if (this.shotLive) this.shotLive = null;
    const lin = this.refs.find(r => r.kind === 'line' && Math.sign(p.x) === r.side) || this.refs[1]; lin.flag = 2.2;
    this.emit({ t: 'offside', p: p.id, team: t }); this.emit({ t: 'whistle', n: 1 });
    this.pendingRestart = { type: 'free', team: t, x: clamp(p.x, -F.HL + 1, F.HL - 1), z: clamp(p.z, -F.HW + 1, F.HW - 1), indirect: true }; this.setPhase('foulstop');
  }
  // el árbitro corre en diagonal a unos 15 m del balón, sin meterse en medio; los asistentes, por su banda, a la altura
  // del penúltimo defensor de su mitad (o del balón si va más adelantado)
  officials(h) {
    if (this.noRefs) return;   // en los retos de entrenamiento no hay árbitro
    const B = this.ball.p, ph = this.phase;
    for (const r of this.refs) {
      let tx, tz, top = 7;
      if (r.kind === 'side') {
        // sala: cada árbitro por su banda, a la altura del balón (uno un poco por delante y el otro por detrás)
        tx = clamp(B.x + r.side * 3, -F.HL + 1, F.HL - 1); tz = r.side * (F.HW + 0.9); top = 6.5;
      } else if (r.kind === 'ref') {
        // diagonal de esquina a esquina: el punto de la diagonal más cercano al balón, acercado a él pero a 12 m como poco
        const dl = hyp(F.HL - 16, F.HW - 10), Dx = (F.HL - 16) / dl, Dz = (F.HW - 10) / dl, nx = -Dz, nz = Dx;
        const tt = B.x * Dx + B.z * Dz; tx = tt * Dx + (B.x - tt * Dx) * 0.3; tz = tt * Dz + (B.z - tt * Dz) * 0.3;
        if (hyp(tx - B.x, tz - B.z) < 12) { const sd = Math.sign((tx - B.x) * nx + (tz - B.z) * nz) || 1, back = this.owner ? -this.dir[this.owner.team] * 4 : 0; tx = B.x + nx * sd * 11 + back; tz = B.z + nz * sd * 11; }
        if (ph === 'pen_aim' || ph === 'pen_flight' || ph === 'pen_result') { tx = F.HL - F.area - 2; tz = 12; }
        tx = clamp(tx, -F.HL + 6, F.HL - 6); tz = clamp(tz, -F.HW + 3, F.HW - 3);
        for (const p of this.players) { const dx = tx - p.x, dz = tz - p.z, d = hyp(dx, dz); if (d < 2.5 && d > 1e-3) { tx += dx / d * (2.5 - d); tz += dz / d * (2.5 - d); } }
      } else {
        // cada asistente lleva una mitad del campo: la de los que defienden hacia ese lado
        const def = this.dir[0] === r.side ? 1 : 0, sgn = r.side;
        let a = -1e9, b = -1e9; for (const q of this.team(def)) { const u = sgn * q.x; if (u > a) { b = a; a = u; } else if (u > b) b = u; }
        tx = sgn * clamp(Math.max(b, sgn * B.x), 0, F.HL); tz = r.side > 0 ? -(F.HW + 1.2) : F.HW + 1.2;
        top = 7.5;
      }
      if (r.flag > 0) { r.flag -= h; tx = r.x; tz = r.z; }
      const dx = tx - r.x, dz = tz - r.z, d = hyp(dx, dz), sp = d < 0.3 ? 0 : Math.min(top, d * 1.6);
      const wx = d > 1e-4 ? dx / d * sp : 0, wz = d > 1e-4 ? dz / d * sp : 0;
      let ax = wx - r.vx, az = wz - r.vz; const al = hyp(ax, az), mx = 10 * h; if (al > mx) { ax *= mx / al; az *= mx / al; }
      r.vx += ax; r.vz += az; r.x += r.vx * h; r.z += r.vz * h;
      // mira al balón
      const ta = Math.atan2(B.x - r.x, B.z - r.z); r.h += clamp(angDiff(r.h, ta), -8 * h, 8 * h);
    }
  }
  out(type, team, x, z) {
    if (this.shotLive) { this.emit({ t: 'miss', team: this.shotLive.team }); this.shotLive = null; }
    this.owner = null; this.passTo = null;
    this.noDirect = null;
    this.emit({ t: 'out', type, team, by: this.last ? this.last.team : null }); this.emit({ t: 'whistle', n: 1 });
    this.pendingRestart = { type, team, x, z }; this.setPhase('dead');
  }
  goal(team) {
    this.score[team]++; this.stats.onTarget[team]++;
    const scorer = this.last?.team === team ? this.last : null;
    this.owner = null; this.passTo = null; this.shotLive = null;
    for (const p of this.team(team)) if (p.role !== 'POR' && (p === scorer || hyp(p.x - (scorer || p).x, p.z - (scorer || p).z) < 25)) { p.act = 'celebrate'; p.actT = 3.0; }
    this.emit({ t: 'goal', team, scorer: scorer?.id ?? null, own: !scorer, score: this.score.slice() }); this.emit({ t: 'whistle', n: 1 });
    this.setPhase('goal'); this.concede = this.other(team);
    // sala: el equipo con un expulsado que encaja un gol vuelve a ser completo
    const back = this.players.find(p => p.off && p.team === this.concede && Number.isFinite(p.offT)); if (back) this.backOn(back);
  }
  afterGoal() { for (const p of this.players) if (p.act === 'celebrate') { p.act = ''; p.actT = 0; } this.kickoff(this.concede); }
  endHalf() {
    this.emit({ t: 'whistle', n: 3, end: true }); this.owner = null;
    if (this.half === 1) { this.setPhase('half'); this.emit({ t: 'half' }); return; }
    if (this.cup && this.score[0] === this.score[1]) { this.emit({ t: 'toPenalties' }); this.cupPens = true; return this.startShootout(5); }
    this.finish();
  }
  secondHalf() { this.half = 2; this.clock = 0; this.fouls = [0, 0]; this.dir = [this.dir[0] * -1, this.dir[1] * -1]; this.emit({ t: 'second' }); this.kickoff(1); }
  finish() {
    const s = this.score; this.result = { win: s[0] > s[1], draw: s[0] === s[1], you: s[0], cpu: s[1], stats: this.stats, pens: this.pen?.score || null };
    this.setPhase('end'); this.emit({ t: 'end', result: this.result });
  }
  // ---------------------------------------------------------------- saques
  kickoff(team) {
    this.kickoffTeam = team;
    const b = this.ball; b.set(0, 0); b.held = null; this.owner = null; this.last = null; this.passTo = null; this.buffer = null; this.noDirect = null;
    // cada uno en su campo con la formación de defensa; el portero bajo los palos
    for (const p of this.players) {
      if (p.off) { p.z = (p.offZ || -1) * (F.HW + 3.2); p.vx = p.vz = 0; continue; }
      const s = this.dir[p.team], f = p.role === 'POR' ? null : this.form(p).def;
      p.x = p.role === 'POR' ? -s * (F.HL - (F.areaD ? 0.8 : 1.5)) : -s * Math.max(1.5, (-f[0]) * (F.HL - 4 * SC)); p.z = p.role === 'POR' ? 0 : s * f[1] * F.HW * 0.82;
      p.vx = p.vz = 0; p.h = s > 0 ? Math.PI / 2 : -Math.PI / 2; this.resetP(p);
    }
    // sacan los dos delanteros; los rivales fuera del círculo central
    // (si uno de los dos está expulsado, saca otro)
    const pick = (role, not) => { const q = this.byRole(team, role); return q.off || q === not ? this.team(team).find(r => r.role !== 'POR' && r !== not) : q; };
    const k = pick(RU.kick[0]), a = pick(RU.kick[1], k), s = this.dir[team];
    k.x = -s * 0.45; k.z = 0; a.x = -s * 1.2; a.z = -s * 6 * Math.max(SC, 0.6);
    for (const p of this.team(this.other(team))) { const d = hyp(p.x, p.z) || 1; if (p.role !== 'POR' && d < F.circle + 0.8) { p.x *= (F.circle + 0.8) / d; p.z *= (F.circle + 0.8) / d; } }
    if (this.refs[0].kind === 'ref') { this.refs[0].x = -8; this.refs[0].z = 12; }
    if (team === this.me.team && !this.autoplay) this.setMe(k, 'restart');
    this.restart = { type: 'kickoff', team, x: 0, z: 0, taker: k, t: 0, prep: 0.6, wait: 0 };
    this.owner = k; k.h = s > 0 ? Math.PI / 2 : -Math.PI / 2;
    this.setPhase('kickoff'); this.emit({ t: 'restart', type: 'kickoff', team });
    this.emit({ t: 'whistle', n: 1 });
  }
  resetP(p) { p.act = ''; p.actT = 0; p.stun = 0; p.down = 0; p.cool = 0; p.recover = 0; p.robo = null; p.slide = null; p.dive = null; p.hands = false; p.plan = null; p.react = 0; p.job = null; p.wx = p.wz = 0; p.threat = null; p.spread = 0; p.humanDive = null; }
  setPiece(type, team, x, z, indirect = false, noWall = false) {
    const b = this.ball, s = this.dir[team], foe = this.other(team); this.owner = null; this.passTo = null; this.buffer = null; this.offs = null;
    for (const p of this.players) { p.robo = null; p.slide = null; p.dive = null; p.down = Math.min(p.down, 0.2); p.plan = null; p.wall = null; p.hands = false; }
    let taker;
    if (type === 'throwin') z = Math.sign(z) * (F.HW - 0.05);
    b.set(x, z, type === 'throwin' && RU.throwHands ? 2.05 : R); b.held = null;
    if (type === 'goalkick' && RU.goalkickHands) {
      // sala: el portero, con el balón en las manos dentro de su área; los rivales, fuera del área
      taker = this.gk(team); taker.x = x - s * 0.4; taker.z = z; taker.hands = true; b.held = taker;
      for (const p of this.team(foe)) if (this.inArea(team, p.x, p.z, 1)) { const gx = this.ownGoal(team); p.x = gx + s * (F.area + 1.2); }
    } else if (type === 'goalkick') {
      // saque de meta: el portero, con el balón en el suelo en el área de meta; los rivales, fuera del área
      taker = this.gk(team); taker.x = x - s * 1.2; taker.z = z * 0.85;
      for (const p of this.team(foe)) if (p.role !== 'POR' && this.inArea(team, p.x, p.z, 1)) p.x = this.ownGoal(team) + s * (F.area + 2);
    } else if (type === 'penalty') {
      taker = team === this.me.team && !this.autoplay ? this.me : this.byRole(team, KICKERS[0]);
      taker.x = x - s * 1.6; taker.z = -0.4;
      const k = this.gk(foe); k.x = this.goalX(team) - s * 0.25; k.z = 0; k.vx = k.vz = 0; k.dive = null; k.threat = null;
      // todos fuera del área y a 9,15 m del punto, por detrás del balón
      const gx = this.goalX(team);
      const zs = Math.min(4.2, F.HW * 0.32);
      for (const p of this.players) if (p !== taker && !p.off && p.role !== 'POR' && (Math.abs(p.x - gx) < F.area + 1 || hyp(p.x - x, p.z - z) < Math.max(F.arc, F.wall) + 0.5)) { const i = p.id % N; p.x = gx - s * (F.area + 1.5 + (i % 3) * 1.6); p.z = ((i % 6) - 2.5) * zs; }
    } else {
      // el más cercano de su equipo va a sacar (desde fuera del campo en el de banda y el córner)
      taker = this.team(team).filter(p => p.role !== 'POR').sort((a, q) => hyp(a.x - x, a.z - z) - hyp(q.x - x, q.z - z))[0];
      const back = type === 'throwin' ? (RU.throwHands ? { x: 0, z: Math.sign(z) * 0.35 } : { x: 0, z: Math.sign(z) * 0.55 }) : type === 'corner' ? { x: Math.sign(x) * 0.6, z: Math.sign(z) * 0.6 } : { x: -s * 0.6, z: 0 };
      taker.x = x + back.x; taker.z = z + back.z;
      // los rivales a 9,15 m del balón (a 2 m en el saque de banda); en sala, a 5 m en todos
      const m = type === 'throwin' && RU.throwHands ? 2 : F.wall;
      for (const p of this.team(foe)) { const dx = p.x - x, dz = p.z - z, d = hyp(dx, dz); if (d < m && p.role !== 'POR') { const k = (m + 0.3) / (d || 1); p.x = clamp(x + dx * k, -F.HL + 0.5, F.HL - 0.5); p.z = clamp(z + dz * k, -F.HW + 0.5, F.HW - 0.5); } }
      // barrera: en una falta directa a menos de 30 m de la portería, tres o cuatro rivales a 9,15 m en la línea del tiro
      const gx = this.goalX(team), dg = hyp(gx - x, z);
      if (type === 'free' && !indirect && !noWall && dg < 30 * SC && s * x > 0) {
        const n = F.areaD ? 2 : dg < 22 ? 4 : 3, ux = (gx - x) / dg, uz = -z / dg;
        this.team(foe).filter(p => p.role !== 'POR').sort((a, q) => hyp(a.x - x, a.z - z) - hyp(q.x - x, q.z - z)).slice(0, n).forEach((p, i) => {
          const o = (i - (n - 1) / 2) * 0.62 + (z > 0 ? -0.5 : 0.5) * 0.6;
          p.wall = { x: x + ux * F.wall - uz * o, z: z + uz * F.wall + ux * o }; p.x = p.wall.x; p.z = p.wall.z; p.vx = p.vz = 0;
        });
      }
    }
    taker.vx = taker.vz = 0; taker.h = Math.atan2(x - taker.x, z - taker.z);
    if (type === 'throwin') taker.h = Math.atan2(0, -Math.sign(z));
    if (team === this.me.team && !this.autoplay && taker.role !== 'POR') this.setMe(taker, 'restart');
    this.owner = taker; this.last = taker;
    this.restart = { type, team, x, z, taker, t: 0, prep: type === 'penalty' ? 1.2 : type === 'goalkick' ? 1.1 : 0.7, indirect, noWall };
    this.setPhase('setpiece'); this.emit({ t: 'restart', type, team, noWall, hands: type === 'throwin' && RU.throwHands });
  }
  restartStep(h) {
    const r = this.restart; if (!r) return;
    r.t += h;
    const taker = r.taker, b = this.ball.p, gx = this.goalX(r.team), s = this.dir[r.team];
    // los demás se colocan; el que saca espera junto al balón (y apunta con el joystick si es el jugador)
    for (const p of this.players) {
      if (p.off) { this.offStep(p); continue; }
      if (p === taker) { p.wx = p.wz = 0; continue; }
      if (p.role === 'POR') { if (r.type === 'penalty' && p.team !== r.team) { p.wx = p.wz = 0; p.face = { x: b.x, z: b.z }; } else this.keeper(p, h); continue; }
      if (r.type === 'kickoff') { p.wx = p.wz = 0; p.face = { x: 0, z: 0 }; continue; }
      if (p.wall) { this.seek(p, p.wall.x, p.wall.z, 2); p.face = { x: b.x, z: b.z }; continue; }
      const sp = this.spot(p, p.team === r.team ? 'atk' : 'def');
      let tx = sp.x, tz = sp.z;
      if (p.team !== r.team) { const m = r.type === 'throwin' && RU.throwHands ? 2.2 : F.wall + 0.3, dx = tx - r.x, dz = tz - r.z, d = hyp(dx, dz); if (d < m) { tx = r.x + dx / (d || 1) * m; tz = r.z + dz / (d || 1) * m; } }
      if (r.type === 'goalkick' && p.team !== r.team && this.inArea(r.team, tx, tz, 0.5)) tx = this.ownGoal(r.team) + s * (F.area + 1.5);
      if (r.type === 'penalty') { const i = p.id % N; tx = gx - s * (F.area + 1.5 + (i % 3) * 1.6); tz = ((i % 6) - 2.5) * Math.min(4.2, F.HW * 0.32); }
      this.seek(p, tx, tz, PL.run); p.face = { x: b.x, z: b.z };
    }
    // el balón quieto en su sitio (en el saque de banda, en las manos sobre la cabeza)
    if (r.type === 'throwin' && RU.throwHands) this.ball.set(taker.x, Math.sign(r.z) * (F.HW - 0.02), 2.05);
    else if (r.type === 'goalkick' && RU.goalkickHands) { this.ball.held = taker; taker.hands = true; this.holdBall(taker); }
    else this.ball.set(r.x, r.z);
    if (this.human(taker)) {
      // apunta con el joystick
      const I = this.input; if (I.mag > 0.3) taker.h = Math.atan2(I.x, I.z);
      if (this.buffer && r.t >= r.prep) { const a = this.buffer; this.buffer = null; this.takeRestart(taker, a); return; }
      // sala: 4 s para sacar (si no, saca el otro equipo desde el mismo sitio); fútbol 11: se reanuda solo
      if (RU.fourSec && r.t > r.prep + 4 && r.type !== 'kickoff' && r.type !== 'penalty') return this.fourSeconds();
      if (r.t > r.prep + 4) this.aiRestart(taker);
      return;
    }
    if (r.t > r.prep + this.L(taker).react + 0.5) this.aiRestart(taker);
  }
  // sala: no sacó en 4 s → saque para el otro equipo
  fourSeconds() {
    const r = this.restart, t = this.other(r.team), type = r.type === 'free' ? 'free' : r.type === 'goalkick' ? 'free' : r.type;
    const x = r.type === 'goalkick' ? this.ownGoal(r.team) + this.dir[r.team] * (F.area + 0.5) : r.x, z = r.type === 'goalkick' ? 0 : r.z;
    if (r.taker) r.taker.hands = false; this.ball.held = null;
    this.emit({ t: 'fourSec', team: r.team }); this.emit({ t: 'whistle', n: 1 });
    this.restart = null; this.pendingRestart = { type: type === 'corner' ? 'goalkick' : type, team: t, x, z, indirect: true }; this.setPhase('dead');
  }
  takeRestart(p, a) {
    const r = this.restart; if (!r) return;
    // sala, saque de banda con el pie: TIRO = pase largo elevado (no vale gol directo)
    if (a.kind === 'shot' && r.type === 'throwin' && !RU.throwHands) { this.stats.passes[p.team]++; const I = this.input, f = fwd(p), dx = I.mag > 0.25 ? I.x : f.x, dz = I.mag > 0.25 ? I.z : f.z; return this.passToPoint(p, clamp(p.x + dx * 14, -F.HL + 1, F.HL - 1), clamp(p.z + dz * 14, -F.HW + 1, F.HW - 1), true); }
    const I = this.input, f = fwd(p), dx = I.mag > 0.25 ? I.x : f.x, dz = I.mag > 0.25 ? I.z : f.z;
    // TIRO en un saque de banda: saque largo; en un córner: centro al área
    if (a.kind === 'shot' && r.type === 'throwin') { this.stats.passes[p.team]++; return this.throwBall(p, p.x + dx * 24, p.z + dz * 24); }
    if (a.kind === 'shot' && r.type === 'corner') {
      this.stats.passes[p.team]++; const s = this.dir[p.team], c = this.crossReceiver(p, dx, dz) || this.team(p.team).filter(q => q !== p && q.role !== 'POR' && this.inBox(p.team, q)).sort((a, q) => this.openness(q) - this.openness(a))[0];
      if (c) return this.crossBall(p, c, a.charge ?? 0.5);
      return this.passToPoint(p, s * (F.HL - 9), clamp(dz * 9 - Math.sign(r.z) * 2, -9, 9), true);
    }
    if (a.kind === 'shot' && !r.indirect) return this.humanShot(p, a.charge);
    if (a.kind === 'through' && r.type !== 'kickoff') return this.humanThrough(p);
    this.stats.passes[p.team]++;
    const q = this.bestReceiver(p, dx, dz, r.type === 'kickoff' && I.mag < 0.25 ? Math.PI : PL.cone * 1.4);
    if (r.type === 'corner' && q && this.inBox(p.team, q)) return this.crossBall(p, q, a.power ?? 0.5);
    if (a.power != null && r.type !== 'kickoff') return this.powerPass(p, dx, dz, a.power, q);   // (también en los saques: tú pones la fuerza)
    if (q) { this.passBall(p, q, a.loft, 0); this.setMe(q, 'pass'); } else this.passToPoint(p, p.x + dx * 12, p.z + dz * 12, a.loft);
  }
  aiRestart(p) {
    const r = this.restart, L = this.L(p), t = p.team, s = this.dir[t];
    if (r.type === 'penalty') { const side = this.rnd() < 0.5 ? -1 : 1; return this.shoot(p, side * (HW_G - 0.5 - this.rnd() * 1.4), 0.3 + this.rnd() * 1.6, 0.7 + this.rnd() * 0.25, 0.015 + L.passErr * 0.012, 0); }
    if (r.type === 'free' && !r.indirect && (this.shotProb(p) > 0.2 || r.noWall)) return this.aiShoot(p, L);
    // sala: saque de portería con la mano, a un compañero libre (o despeje con el pie si no hay nadie)
    if (r.type === 'goalkick' && RU.goalkickHands) { p.holdT = 0; return this.distribute(p, 0); }
    // córner: centro al compañero mejor situado en el área (o en corto si está solo)
    if (r.type === 'corner') {
      const box = this.team(t).filter(q => q !== p && this.inArea(this.other(t), q.x, q.z)).sort((a, q) => this.openness(q) - this.openness(a));
      this.stats.passes[t]++;
      if (box[0] && this.rnd() < 0.85) return this.crossBall(p, box[0], 0.3 + this.rnd() * 0.4, 0.8 + L.passErr * 0.7);
      return this.passToPoint(p, s * (F.HL - 10), (this.rnd() - 0.5) * 10, true);
    }
    // saque de meta: en corto a un defensa libre o en largo hacia los de arriba
    if (r.type === 'goalkick') {
      const short = this.team(t).filter(q => q.line === 1 && this.openness(q) > 9 * SC && this.laneOpen(t, p.x, p.z, q.x, q.z) > 2.5 * SC);
      this.stats.passes[t]++;
      if (short.length && this.rnd() < 0.6) return this.passBall(p, short[(this.rnd() * short.length) | 0], false, 0.3);
      return this.clearLong(p);
    }
    // el mejor pase (en el saque de centro, hacia atrás o al lado; en el de banda, a uno cercano)
    let best = null, bs = -1e9;
    for (const q of this.team(t)) {
      if (q === p || q.role === 'POR') continue;
      const d = hyp(q.x - p.x, q.z - p.z); if (d < 2 || (r.type === 'throwin' && d > 22 * SC)) continue;
      if (r.type !== 'throwin' && this.isOffside(q)) continue;
      const sc = Math.min(this.laneOpen(t, p.x, p.z, q.x, q.z), 3 * SC) * 0.5 / SC + Math.min(this.openness(q), 6 * SC) * 0.3 / SC - Math.abs(d - (r.type === 'throwin' ? 9 : 14) * SC) * 0.04 / SC + s * (q.x - p.x) * 0.01 / SC;
      if (sc > bs) { bs = sc; best = q; }
    }
    this.stats.passes[t]++;
    if (best) this.passBall(p, best, false, r.type === 'kickoff' ? 0 : L.passErr * 0.5);
    else { const f = fwd(p); this.passToPoint(p, p.x + f.x * 10, p.z + f.z * 10, false); }
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
    const P = this.pen, t = P.turn, gx = F.HL;
    const ks = KICKERS.map(r => this.byRole(t, r)).filter(q => !q.off), shooter = ks[P.n[t] % ks.length] || this.byRole(t, KICKERS[0]), keeper = this.gk(this.other(t));
    // los demás, en el círculo central; el portero que no para, en el borde del área
    for (const p of this.players) { this.resetP(p); p.vx = p.vz = 0; if (p !== shooter && p !== keeper) { const i = p.id % N; p.x = -5 + i * 1.0; p.z = p.team ? -1.5 : 1.5; p.h = Math.PI / 2; if (p.role === 'POR') { p.x = F.HL - F.area - 1; p.z = (p.team ? -1 : 1) * Math.min(14, F.HW - 1.5); } } }
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
    k.dive = { t: 0.7, vz: plan.side * 5.0, vx: 0, hy: plan.high ? 1.9 : 0.7, side: plan.side }; k.act = 'dive'; k.actT = 0.9;
    this.emit({ t: 'dive', p: k.id, side: plan.side, high: plan.high });
  }
  penStep(h) {
    const P = this.pen, ph = this.phase; if (!P) return;
    for (const p of this.players) this.timers(p, h);
    this.officials(h);
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
        if (side) { k.dive = { t: 0.7, vz: side * 4.6 * L.keeperReach, vx: 0, hy: 0.6 + this.rnd() * 1.4, side }; k.act = 'dive'; k.actT = 0.9; this.emit({ t: 'dive', p: k.id, side }); }
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
      tz = ax > 0.1 ? clamp(az / ax * F.spot, -HW_G - 0.5, HW_G + 0.5) : Math.sign(az || 1) * (HW_G - 1.06); if (this.assist) tz = clamp(tz, -HW_G + 0.3, HW_G - 0.3);
      ty = 0.3 + charge * 2.0;
      P.aimSide = Math.sign(tz) || 0;
      this.restart = null; this.shoot(p, tz, ty, Math.min(1, charge * 0.85 + 0.15), 0.01 + charge * charge * 0.035, 0);
    } else {
      const L = this.L(p), side = this.rnd() < 0.5 ? -1 : 1; tz = side * (HW_G * 0.27 + this.rnd() * HW_G * 0.63); ty = 0.25 + this.rnd() * 1.8;
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
