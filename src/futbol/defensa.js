// El partido de fútbol (futbol/game.js), el balón en los pies y la defensa: controlar, regatear, robar, las faltas con
// sus tarjetas y la ley de la ventaja, y las lesiones y los cambios. Son métodos de FutbolGame: game.js los une a su
// clase (util/mezcla.js), con su this.
import { FIELD as F, LINE, PLAYER as PL, RULES as RU } from './rules.js';
import { clamp } from '../util/math.js';
import { SC, hyp, fwd, foot } from './comun.js';

export class FutbolDefensa {
  // ---------------------------------------------------------------- control del balón y regate
  control(h) {
    const b = this.ball, B = b.p;
    let o = this.owner;
    if (o && !o.hands) {
      const f = foot(o), d = hyp(B.x - f.x, B.z - f.z);
      // (el tuyo no pierde el balón por un giro brusco esprintando: antes, haciendo eses a toda velocidad, el balón se
      // quedaba a metro y medio del pie y se soltaba solo, sin ningún rival cerca; un toque largo con un rival encima sí)
      const keep = PL.keep + (this.human(o) && !o.heavy ? 0.5 : 0);
      if (d > keep || B.y > 1.25 || o.stun > 0 || o.down > 0 || o.slide || o.dive) { this.owner = null; o = null; }
    }
    if (o?.hands) return;
    if (!o) {
      // balón suelto: lo controla el que lo tiene a menos de 0,9 m delante de los pies y a menos de 1 m de altura; si
      // llega demasiado fuerte, rebota en él
      let best = null, bd = 1e9;
      for (const p of this.players) {
        if (p.off || p.cool > 0 || p.stun > 0 || p.down > 0 || p.slide || p.dive || p.hands) continue;
        if (this.restart && this.restart.taker !== p) continue;
        const f = foot(p), d = hyp(B.x - f.x, B.z - f.z), body = hyp(B.x - p.x, B.z - p.z);
        // al que va el pase lo controla con más margen (estira la pierna): pasa menos veces de largo
        const mine = this.passTo === p || (this.human(p) && !this.owner), reach = (mine ? PL.reach + 0.45 : PL.reach) + (this.human(p) ? 0.12 : 0);
        if (B.y < PL.ctrlH + (mine ? 0.2 : 0) && (d < reach || body < (mine ? 0.8 : 0.45)) && d - (mine ? 0.3 : 0) < bd) { bd = d - (mine ? 0.3 : 0); best = p; }
      }
      if (best) {
        const keeperHands = best.role === 'POR' && this.inArea(best.team, B.x, B.z);
        if (keeperHands && this.last?.team !== best.team) {
          // el portero de pie: un balón fuerte lo para (o lo rechaza) con las manos y el cuerpo si le llega a su alcance, el
          // mismo que en keeperTouch (lo de los lados lo tiene que sacar estirándose a tiempo); uno flojo lo recoge
          if (b.speed > 9) { this.keeperTouch(best); return; }
          this.catchBall(best); return;
        }
      }
      if (best) {
        const rel = hyp(b.v.x - best.vx, b.v.z - best.vz, b.v.y);
        // (un pase tenso al que va dirigido lo controla; lo que rebota es un balón fuerte que no era para él)
        if (rel > PL.trapMax * (this.passTo === best ? 1.6 : 1) * (this.human(best) ? 1.3 : 1)) this.deflect(best, 0.35);
        else this.takeBall(best);
      }
      // un balón fuerte que pasa por el cuerpo de alguien (más alto que los pies) también rebota
      if (!this.owner && b.speed > 8) for (const p of this.players) {
        if (p === best || p.off || p.cool > 0 || p.dive) continue;
        // (el portero en su área no rebota como un poste: lo bloca o lo despeja con las manos, en keeperTouch)
        if (p.role === 'POR' && this.inArea(p.team, B.x, B.z, 0.3)) { this.keeperTouch(p); if (this.owner) break; continue; }
        if (hyp(B.x - p.x, B.z - p.z) < 0.34 && B.y < 1.75) { this.deflect(p, 0.3); break; }
      }
    }
    o = this.owner;
    if (!o || o.hands) return;
    // el balón va pegado al pie, pero no es invisible: en lo más largo de cada toque se separa y un rival que llega antes
    // con el pie se lo lleva (más fácil cuanto más largo es el toque: esprintando mucho más que conduciendo despacio), y
    // si conduces contra un defensor plantado delante, el balón le choca en las piernas
    const fo = foot(o), dob = hyp(B.x - fo.x, B.z - fo.z), mv = hyp(o.vx, o.vz) || 1;
    for (const p of this.players) {
      if (p.team === o.team || p.off || p.cool > 0 || p.stun > 0 || p.down > 0 || p.slide || p.dive || p.recover > 0 || p.hands) continue;
      const f = foot(p), d = hyp(B.x - f.x, B.z - f.z), body = hyp(B.x - p.x, B.z - p.z);
      const ff = fwd(p), facing = (B.x - p.x) * ff.x + (B.z - p.z) * ff.z > 0;
      const poke = d < 0.62 && d < dob + 0.05 && facing, block = body < 0.62 && ((p.x - o.x) * o.vx + (p.z - o.z) * o.vz) / mv > 0.3;
      if (poke || block) {
        const rate = (this.human(p) ? 6 : 0.6 + this.L(p).tackle * 1.6) * (o.shielding ? 0.25 : 1) * clamp((dob + 0.1) / 0.45, 0.4, 1) * (block && !poke ? 1.6 : 1) * (this.human(o) ? (this.assist ? 0.4 : 0.6) : 1);
        if (this.rnd() < 1 - Math.exp(-rate * h)) { o.stun = 0.3; this.takeBall(p); this.stats.steals[p.team]++; this.emit({ t: 'steal', p: p.id, from: o.id, how: 'pie' }); return; }
      }
    }
    this.dribble(o, h);
  }
  takeBall(p) {
    const b = this.ball, prev = this.owner;
    if (this.offs) { const o = this.offs; this.offs = null; if (o.team === p.team && o.ids.includes(p.id) && this.phase === 'play') return this.offside(p); }
    this.owner = p; this.last = p; p.touchT = 0.1; p.gotT = this.time; this.cross = null;
    // primer toque: el balón se amortigua y queda con el jugador
    const k = 0.25; b.v.x = p.vx + (b.v.x - p.vx) * k; b.v.z = p.vz + (b.v.z - p.vz) * k; if (b.v.y > 0) b.v.y *= 0.3;
    b.w.x = b.w.y = b.w.z = 0;
    if (this.passTo) { if (this.passTo.team === p.team) this.stats.passesOk[p.team]++; this.passTo = null; }
    if (this.shotLive && this.shotLive.team !== p.team) this.shotLive = null;
    if (p.team === this.me.team && p !== this.me && !this.autoplay && p.role !== 'POR') this.setMe(p, 'ball');
    p.plan = null; p.think = this.human(p) ? 0 : (prev && prev.team !== p.team ? this.L(p).react * 0.6 : 0.05);
    this.emit({ t: 'control', p: p.id });
  }
  // el portero rechaza un balón muy fuerte: hacia fuera y a un lado (no de vuelta al punto de penalti)
  parry(p) {
    const b = this.ball, s = -this.dir[p.team], side = Math.sign(b.p.z - p.z || this.rnd() - 0.5);
    b.kick(-s * (2 + this.rnd() * 3), 1.4 + this.rnd() * 2.2, side * (4 + this.rnd() * 4));
    this.last = p; p.cool = 0.3; p.act = 'save'; p.actT = 0.4;
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
  // conducción pegada al pie (como en los juegos de fútbol): el balón va delante de la bota, en la dirección en la que mira el
  // jugador, y le sigue en los giros, el zigzag y las frenadas. Entre toque y toque se separa un poco y vuelve al pie:
  // andando, unos centímetros; trotando, un palmo; esprintando, toques largos de hasta un metro (y entonces un rival
  // que llega antes puede meter el pie)
  dribble(o, h) {
    const b = this.ball, B = b.p, sp = hyp(o.vx, o.vz);
    if (B.y > 0.35) return;   // botando: se espera a que baje
    const f = fwd(o), run = clamp((sp - 1) / (PL.sprint - 1), 0, 1), dash = clamp((sp - PL.run * 0.92) / (PL.sprint - PL.run * 0.92), 0, 1);
    const T = sp < 1 ? 0.6 : PL.touchSlow + (PL.touchFast - PL.touchSlow) * run + dash * 0.12;
    if ((o.touchT -= h) <= 0) {
      o.touchT = T; if (sp > 1) this.emit({ t: 'touch', p: o.id });
      // toque largo: corriendo con un rival encima, a veces el balón se va un metro más (menos a los buenos y al tuyo)
      // (el tuyo, solo con el rival encima de verdad y mucho menos a menudo: más control)
      const hu = this.human(o);
      o.heavy = sp > PL.run * 0.65 && this.nearestFoe(o) < (hu ? 1.6 : 2.5) * Math.max(SC, 0.6) && this.rnd() < (hu ? 0.015 + dash * 0.04 : 0.12 + this.L(o).passErr * 0.08 + dash * 0.08);
    }
    // distancia del centro del jugador al balón: la punta de la bota está a 0,32 m y el balón, justo delante
    const hm = this.human(o) ? 0.7 : 1;   // (el tuyo la lleva más pegada: los toques se separan menos)
    const lead = (o.shielding ? 0.4 : 0.45) + (run * 0.08 + dash * 0.3) * hm, amp = sp < 1 ? 0 : (0.05 + run * 0.1 + dash * 0.3) * hm + (o.heavy ? 0.7 : 0);
    const off = lead + amp * Math.sin(Math.PI * clamp(1 - o.touchT / T, 0, 1));
    // a dónde tiene que ir el balón en el próximo paso y la velocidad para llegar (con un tope, sin teletransportes)
    const tx = o.x + o.vx * h + f.x * off, tz = o.z + o.vz * h + f.z * off;
    let cx = (tx - B.x) * 20, cz = (tz - B.z) * 20; const cl = hyp(cx, cz), cmax = (5 + sp * 0.9) * (this.human(o) ? 1.5 : 1);   // (en los giros el balón sigue a la bota; al tuyo, más pegado)
    if (cl > cmax) { cx *= cmax / cl; cz *= cmax / cl; }
    // recién controlado, el balón se amortigua más despacio (no se queda clavado de golpe)
    const k = clamp((this.time - (o.gotT || 0)) / 0.18, 0.3, 1) * Math.min(1, h * 30);
    b.v.x += (o.vx + cx - b.v.x) * k; b.v.z += (o.vz + cz - b.v.z) * k; b.v.y = 0;
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
    // (contra tu jugador la IA necesita buen momento: un robo de frente al balón pegado al pie sale menos)
    const base = (this.human(p) ? 0.72 : this.L(p).tackle * (this.human(o) ? 0.48 : 1)) * (o.shielding ? 0.35 : 1);
    const chance = clamp(base * (0.55 + 0.45 * clamp(front + 0.6, 0, 1)) + clamp((exposed - 0.2) * 0.7, 0, 0.3), 0.05, 0.95);
    const contact = hyp(p.x - o.x, p.z - o.z) < 0.85;
    if (front < -0.35 && contact && this.rnd() < 0.42) return this.foul(p, o, { behind: true });
    if (this.rnd() < chance) {
      o.stun = 0.45; this.takeBall(p); this.stats.steals[p.team]++;
      this.emit({ t: 'steal', p: p.id, from: o.id, how: 'robo' });
    } else {
      // el robo falla y, si va a destiempo y le toca, es zancadilla: falta (más fácil si el que lleva el balón va lanzado)
      if (contact && this.rnd() < (0.3 + clamp(hyp(o.vx, o.vz) / PL.sprint, 0, 1) * 0.2) * (this.human(p) ? 0.8 : 1)) return this.foul(p, o, { trip: true });
      p.recover = 0.45; this.emit({ t: 'tackleMiss', p: p.id });
    }
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
        if ((!S.ball || behind) && (this.owner === q || this.last === q || hyp(B.x - q.x, B.z - q.z) < 1.6)) { this.foul(p, q, { slide: true, behind, ball: S.ball }); return; }
        q.down = 0.5;   // le ha hecho caer, pero el balón fue primero
      }
    }
    if (S.t <= 0) { p.slide = null; p.down = 0.55; p.vx = p.vz = 0; }
  }
  // how: { slide, behind, ball } (entrada en plancha, por detrás, tocó antes el balón)
  foul(p, q, how = {}) {
    if (this.phase !== 'play') return;
    const x = q.x, z = q.z, pen = this.inArea(p.team, x, z), B = this.ball.p;
    const had = this.owner === q || (this.last === q && hyp(B.x - q.x, B.z - q.z) < 2.5);   // ¿llevaba él el balón?
    q.down = 0.9; q.act = 'fall'; q.actT = 0.9; p.robo = null; if (p.slide) { p.slide = null; p.down = 0.6; }
    // la falta puede lesionar al que la recibe: más una entrada en plancha, y sobre todo por detrás
    { const pr = how.slide ? (how.behind ? 0.3 : 0.14) : how.behind ? 0.08 : 0.04;
      if (this.rnd() < pr) this.hurt(q, how.slide ? 'entrada' : 'golpe', this.rnd() < (how.slide && how.behind ? 0.45 : 0.25) ? 'grave' : 'leve'); }
    this.stats.fouls[p.team]++; this.owner = null; this.fouls[p.team]++; p.fls = (p.fls || 0) + 1;   // (las de cada jugador)
    // sala: desde la sexta falta acumulada de la parte, tiro libre directo sin barrera desde el segundo punto de penalti
    // (o desde donde fue la falta, si está más cerca de la portería)
    const t = q.team, over = RU.foulLimit && this.fouls[p.team] > RU.foulLimit && !pen;
    const card = this.cardFor(p, q, how, pen, had);
    // ventaja: si su equipo sigue con la jugada en campo rival, el árbitro deja seguir (la tarjeta se enseña igual)
    if (!pen && !over && this.advantage(q, p)) {
      this.emit({ t: 'foul', p: p.id, on: q.id, penalty: false, team: p.team, acc: this.fouls[p.team], over, advantage: true });
      this.emit({ t: 'advantage', team: t });
      if (card) this.book(p, card);
      return;
    }
    this.emit({ t: 'foul', p: p.id, on: q.id, penalty: pen, team: p.team, acc: this.fouls[p.team], over });
    if (card) this.book(p, card);
    this.emit({ t: 'whistle', n: pen ? 3 : 2 });
    let free = { type: 'free', team: t, x: clamp(x, -F.HL + 0.6, F.HL - 0.6), z: clamp(z, -F.HW + 0.6, F.HW - 0.6) };
    if (over) { const gx = this.goalX(t), s = this.dir[t], d = hyp(gx - x, z); free = d < F.spot2 && s * x > 0 ? { ...free, noWall: true } : { type: 'free', team: t, x: gx - s * F.spot2, z: 0, noWall: true }; }
    this.pendingRestart = pen ? { type: 'penalty', team: t, x: this.goalX(t) - this.dir[t] * F.spot, z: 0 } : free;
    this.setPhase('foulstop');
  }
  // Tarjetas, como en el reglamento: roja directa por cortar una ocasión manifiesta de gol (el que caía iba solo hacia la
  // portería, sin ningún defensor entre él y ella salvo el portero); si fue dentro del área y el defensor iba a por el
  // balón, penalti y amarilla. Entrada en plancha por detrás sin tocar balón: amarilla (y alguna vez, roja por juego
  // brusco). Parar un contraataque: amarilla casi siempre. Las demás faltas, casi nunca. Al portero, como mucho amarilla
  cardFor(p, q, how, pen, had) {
    const s = this.dir[q.team], gx = this.goalX(q.team), dGoal = hyp(gx - q.x, q.z);
    let cover = 0;
    for (const r of this.team(p.team)) if (r !== p && r.role !== 'POR' && s * r.x > s * q.x - 0.5 && Math.abs(r.z - q.z) < 14 * SC) cover++;
    const dogso = had && cover === 0 && dGoal < 32 * SC && Math.abs(q.z) < F.areaW / 2 + 6 * SC;
    const r = this.rnd();
    const why = (w, c) => { this.cardWhy = w; return c; };
    if (p.role === 'POR') return dogso || (how.slide && how.behind) ? why('portero', 'yellow') : null;
    // al portero no se le toca: con el balón en las manos o dentro de su área, roja directa (juego brusco grave); fuera, amarilla
    if (q.role === 'POR') return had || q.hands || this.inArea(q.team, q.x, q.z) ? why('falta al portero', 'red') : why('falta al portero', 'yellow');
    if (dogso) return pen ? why('ocasión en el área', 'yellow') : why('ocasión manifiesta', 'red');
    if (how.slide && how.behind && !how.ball) return r < 0.12 ? why('juego brusco', 'red') : why('entrada por detrás', 'yellow');
    if (how.slide && !how.ball) return r < 0.4 ? why('entrada temeraria', 'yellow') : null;
    if (had && s * q.x > -10 * SC && hyp(q.vx, q.vz) > PL.run * 0.85) return r < 0.35 ? why('contraataque', 'yellow') : null;   // contraataque
    if (p.fls >= 3 && !this.cards[p.id]) return why('reiterada', 'yellow');   // (a la tercera falta de un mismo jugador)
    return r < (how.trip ? 0.3 : 0.16) ? why('falta táctica', 'yellow') : null;
  }
  // el árbitro se para y enseña la tarjeta; la segunda amarilla es roja y la roja, expulsión
  book(p, color) {
    const second = color === 'yellow' && this.cards[p.id] === 'yellow';
    if (second) color = 'red';
    this.cards[p.id] = color;
    if (color === 'yellow' || second) this.stats.yellow[p.team]++;
    if (color === 'red') this.stats.red[p.team]++;
    const ref = this.refs.find(r => r.kind === 'ref') || this.refs[0]; if (ref) { ref.flag = 2.2; ref.card = color; }
    this.emit({ t: 'card', p: p.id, color, second, team: p.team, why: this.cardWhy }); this.cardWhy = null;
    if (color === 'red') this.sendOff(p);
  }
  // expulsado: deja el campo y su equipo juega con uno menos. En sala, a los 2 minutos (o si su equipo encaja un gol)
  // puede entrar otro jugador
  sendOff(p) {
    p.off = true; p.offT = RU.foulLimit ? 120 : Infinity;
    p.robo = null; p.slide = null; p.hands = false; p.plan = null; p.job = null;
    if (this.owner === p) this.owner = null;
    if (this.passTo === p) this.passTo = null;
    this.teams[p.team] = this.teams[p.team].filter(q => q !== p);
    if (this.me === p) { let best = null, bd = 1e9; for (const q of this.team(p.team)) { if (q.role === 'POR') continue; const d = hyp(q.x - p.x, q.z - p.z); if (d < bd) { bd = d; best = q; } } if (best) this.setMe(best, 'auto'); }
    this.emit({ t: 'sentOff', p: p.id, team: p.team, back: RU.foulLimit ? 120 : 0 });
  }
  backOn(p) {
    p.off = false; p.offT = 0; p.offZ = null; this.resetP(p);
    this.teams[p.team] = this.players.filter(q => q.team === p.team && !q.off);
    p.x = -this.dir[p.team] * 3; p.z = -(F.HW + 0.5); p.vx = p.vz = 0;
    this.emit({ t: 'backOn', p: p.id, team: p.team });
  }
  // el expulsado se va andando a la banda, junto al banquillo, y se queda allí
  offStep(p) {
    if (p.offZ == null) p.offZ = Math.sign(p.z || -1);   // (a la banda más cercana)
    const tx = clamp(p.x, -F.HL + 4, F.HL - 4), tz = p.offZ * (F.HW + 3.2);
    this.seek(p, tx, tz, PL.run * 0.7, false); p.face = null;
  }
  // ventaja: tras la falta su equipo sigue con la jugada en campo rival (un compañero llegará antes que nadie al balón)
  advantage(q, by) {
    const t = q.team, s = this.dir[t], B = this.ball.p;
    if (s * B.x < 0) return false;
    let mine = 1e9, foe = 1e9;
    for (const r of this.team(t)) if (r !== q && r.down <= 0) mine = Math.min(mine, hyp(B.x - r.x, B.z - r.z));
    for (const r of this.team(this.other(t))) if (r !== by && r.down <= 0) foe = Math.min(foe, hyp(B.x - r.x, B.z - r.z));   // (el que hizo la falta, no)
    return mine < 3.5 && mine < foe - 1;
  }
  // ---------------------------------------------------------------- lesiones y cambios
  // lesión: leve (cojea un rato y se le pasa) o grave (cojea, no puede esprintar y hay que cambiarlo)
  hurt(p, why, sev) {
    if (p.off || p.inj?.sev === 'grave') return;
    p.inj = { sev, why, t: sev === 'leve' ? 35 : Infinity };
    if (sev === 'grave') { p.down = Math.max(p.down, 2.2); p.fit = Math.min(p.fit, 0.6); p.energy = Math.min(p.energy, p.fit); }
    this.emit({ t: 'injury', p: p.id, team: p.team, sev, why });
  }
  // ¿se puede cambiar ahora? Con el balón parado (fuera, falta, gol, descanso o un saque aún sin sacar)
  canSub() { const ph = this.phase; return ph === 'dead' || ph === 'foulstop' || ph === 'goal' || ph === 'replay' || ph === 'half' || ph === 'kickoff' || ph === 'setpiece'; }
  /** Cambios que quedan a un equipo (sin contar los ya pedidos). */
  subsAvail(t) { return this.subsLeft[t] - this.subPlan[t].length; }
  /** Pide un cambio: sale el jugador outId y entra el suplente b (su sitio en el banquillo). Se hace en la siguiente
   *  parada (o al momento, si el balón ya está parado). Devuelve si se ha podido pedir. */
  planSub(t, outId, b) {
    const p = this.players[outId], B = this.bench[t]?.[b];
    if (!p || p.team !== t || p.off || !B || B.used || B.planned || this.subsAvail(t) <= 0 || this.subPlan[t].some(x => x.out === outId)) return false;
    B.planned = true; this.subPlan[t].push({ out: outId, b });
    this.emit({ t: 'subPlan', team: t, p: outId, out: p.num, in: B.num, now: this.canSub() });
    if (this.canSub()) this.applySubs(t);
    return true;
  }
  /** Quita un cambio pedido que aún no se ha hecho. */
  cancelSub(t, outId) {
    const i = this.subPlan[t].findIndex(x => x.out === outId); if (i < 0) return false;
    const [x] = this.subPlan[t].splice(i, 1); this.bench[t][x.b].planned = false; return true;
  }
  // el cambio: el que entra ocupa el sitio del que sale (mismo puesto en el sistema), con su forma, sin tarjetas ni
  // lesión (en sala, el que sale se sienta en el banquillo con las suyas y puede volver a entrar)
  applySubs(t) {
    for (const x of this.subPlan[t]) {
      const p = this.players[x.out], B = this.bench[t][x.b]; B.planned = false;
      if (!p || p.off) continue;   // (expulsado mientras esperaba: ya no se puede cambiar)
      const out = { num: p.num, line: LINE[p.role] ?? 2, fit: p.fit, card: this.cards[p.id] || null, inj: p.inj, fls: p.fls || 0 };
      p.num = B.num; p.fit = B.fit; p.energy = B.fit; p.inj = B.inj; p.down = 0; p.stun = 0; p.warn = null; p.fls = B.fls || 0;
      if (B.card) this.cards[p.id] = B.card; else delete this.cards[p.id];
      if (RU.rolling) Object.assign(B, out, { used: false }); else B.used = true;
      this.subsLeft[t]--; this.subsDone[t]++;
      this.emit({ t: 'sub', team: t, p: p.id, out: out.num, in: p.num, inj: !!out.inj });
    }
    this.subPlan[t] = [];
  }
  // el entrenador del rival (y el tuyo si juega la máquina): cambia enseguida al lesionado grave y, pasado algo más de
  // la mitad del partido, al más cansado si está muy tocado (uno por parada), guardando un cambio para una lesión hasta
  // el final
  aiSubs() {
    const prog = ((this.half - 1) * this.halfLen + this.clock) / (2 * this.halfLen);
    for (const t of [0, 1]) {
      if (t === 0 && !this.autoplay && !this.autoSubs) continue;
      const cand = this.team(t).filter(p => p.inj?.sev === 'grave').concat(this.team(t).filter(p => !p.inj && p.role !== 'POR' && prog > 0.55 && p.fit < 0.5).sort((a, b) => a.fit - b.fit).slice(0, 1));
      for (const p of cand) {
        const grave = p.inj?.sev === 'grave';
        if (this.subsAvail(t) <= 0 || (!grave && this.subsAvail(t) < 2 && prog < 0.85)) break;
        const bi = this.benchFor(t, p); if (bi >= 0) this.planSub(t, p.id, bi);
      }
    }
  }
  /** El mejor suplente para el puesto de p: de su misma línea y con más forma (el portero, por otro portero). */
  benchFor(t, p) {
    const want = LINE[p.role] ?? 2; let bi = -1, bs = -1e9;
    this.bench[t].forEach((B, i) => {
      if (B.used || B.planned || B.inj?.sev === 'grave') return;
      const sc = (B.line === want ? 3 : (B.line === 0) !== (want === 0) ? -4 : 2 - Math.abs(B.line - want)) + B.fit;
      if (sc > bs) { bs = sc; bi = i; }
    });
    return bi;
  }
  // avisos a tu equipo (una vez por jugador y motivo): un lesionado grave o uno sin fuerzas
  subWarn() {
    if (this.autoplay) return;
    for (const p of this.team(0)) {
      const why = p.inj?.sev === 'grave' ? 'grave' : p.role !== 'POR' && p.fit < 0.4 ? 'tired' : null;
      if (why && p.warn !== why) { p.warn = why; this.emit({ t: 'needSub', p: p.id, why, left: this.subsAvail(0) }); }
    }
  }
  // en el banquillo (sala), los que han salido descansan y se les pasa la lesión leve
  benchRest(h) {
    if (!RU.rolling) return;
    for (const b of this.bench) for (const B of b) { B.fit = Math.min(1, B.fit + h / (2 * this.halfLen) * 1.2); if (B.inj?.sev === 'leve' && (B.inj.t -= h) <= 0) B.inj = null; }
  }
}
