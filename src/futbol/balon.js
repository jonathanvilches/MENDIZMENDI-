// El partido de fútbol (futbol/game.js), el balón: los centros al área y los cabezazos, y cada golpeo (pase raso o
// por alto, saque de banda, tiro) con su velocidad. Son métodos de FutbolGame: game.js los une a su clase
// (util/mezcla.js), con su this.
import { Ball, rollAhead } from './physics.js';
import { FIELD as F, PHYS as K, PLAYER as PL, RULES as RU } from './rules.js';
import { clamp } from '../util/math.js';
import { R, STEP, HW_G, SC, hyp, fwd } from './comun.js';

export class FutbolBalon {
  // ---------------------------------------------------------------- centros al área y remates de cabeza
  /** ¿Está el balón en una banda, cerca del área rival (desde donde se centra)? */
  crossZone(p) {
    const s = this.dir[p.team], B = this.ball.p, u = s * B.x;
    return u > F.HL - 30 * SC && u < F.HL + 0.5 && Math.abs(B.z) > F.areaW / 2 - 4 * SC;
  }
  // el área rival (con un poco de margen: el que entra corriendo también vale)
  inBox(t, q) { return this.inArea(this.other(t), q.x, q.z, F.areaD ? 3 : 2); }
  // (fútbol 11: el delantero de la IA que espera en la línea del fuera de juego, a pocos metros del área, entra al remate;
  // a los de tu equipo se les centra solo dentro del área, como cuando centras tú)
  crossRun(t, q) { return !F.areaD && q.line === 3 && !(q.team === this.me.team && !this.autoplay) && !this.isOffside(q) && this.inArea(this.other(t), q.x, q.z, 7); }
  /** El compañero del área rival al que irá el centro: el mejor situado hacia donde apuntas. */
  crossReceiver(p, dx, dz) {
    let best = null, bs = -1e9;
    for (const q of this.team(p.team)) {
      if (q === p || q.role === 'POR' || q.down > 0 || this.isOffside(q) || !this.inBox(p.team, q)) continue;
      const ex = q.x - p.x, ez = q.z - p.z, d = hyp(ex, ez) || 1, cos = (ex * dx + ez * dz) / d;
      if (cos < 0.5) continue;
      const sc = cos * 1.2 + Math.min(this.openness(q), 4 * SC) * 0.3 / SC;
      if (sc > bs) { bs = sc; best = q; }
    }
    return best;
  }
  // altura del balón (su centro) al llegar a la cabeza del que remata
  get headY() { return F.areaD ? 1.6 : 1.7; }
  /** Velocidad de salida para que el balón pase por (tx, ty, tz) dentro de T s (el aire se corrige simulando el vuelo). */
  aerial(tx, ty, tz, T) {
    const B = this.ball.p, sim = this.simBall || (this.simBall = new Ball()), n = Math.max(1, Math.round(T / STEP));
    let ax = tx, ay = ty, az = tz, v = null;
    for (let k = 0; k < 4; k++) {
      v = { x: (ax - B.x) / T, y: (ay - B.y) / T + 0.5 * K.g * T, z: (az - B.z) / T };
      sim.set(B.x, B.z, Math.max(B.y, R)); sim.kick(v.x, v.y, v.z, 0);
      for (let i = 0; i < n; i++) sim.step(STEP);
      const ex = sim.p.x - tx, ey = sim.p.y - ty, ez = sim.p.z - tz;
      if (hyp(ex, ey, ez) < 0.08) break;
      ax -= ex; ay -= ey; az -= ez;
    }
    return v;
  }
  // centro: por alto, para que el balón llegue a la altura de la cabeza (1,7 m) justo donde estará el compañero cuando
  // llegue. Con PASE mantenido, la fuerza lo alarga (al segundo palo) o lo acorta (al primero)
  crossTarget(p, q, power = 0.5, err = 0) {
    const B = this.ball.p, s = this.dir[p.team];
    let tx = q.x, tz = q.z, T = 1.2;
    // (a tu compañero, casi a donde está: frena y lo espera; a la IA, a donde llegará corriendo)
    const lead = q.team === this.me.team && !this.autoplay ? 0.25 : 0.75;
    for (let k = 0; k < 3; k++) { const d = hyp(tx - B.x, tz - B.z); T = clamp(0.7 + d * (F.areaD ? 0.05 : 0.034), 0.9, 1.75); tx = q.x + q.vx * T * lead; tz = q.z + q.vz * T * lead; }
    // (al que entra desde fuera del área, al hueco del punto de penalti: llega corriendo)
    if (!F.areaD && lead > 0.5 && !this.inBox(p.team, q)) { tx = s * Math.max(s * tx, F.HL - 12); tz = clamp(tz, -F.areaW / 2 + 4, F.areaW / 2 - 4); T = clamp(0.7 + hyp(tx - B.x, tz - B.z) * 0.034, 0.9, 1.75); }
    const ux = tx - B.x, uz = tz - B.z, ul = hyp(ux, uz) || 1, ext = (power - 0.5) * 7 * SC;
    tx += ux / ul * ext + (err ? (this.rnd() - 0.5) * 2 * err : 0); tz += uz / ul * ext + (err ? (this.rnd() - 0.5) * 2 * err : 0);
    return { x: s * Math.min(s * tx, F.HL - 1.2), z: clamp(tz, -F.HW + 1, F.HW - 1), T };
  }
  crossBall(p, q, power = 0.5, err = 0) {
    const { x: tx, z: tz, T } = this.crossTarget(p, q, power, err);
    const v = this.aerial(tx, this.headY, tz, T);
    this.kickBall(p, v.x, v.y, v.z, 0, 'cross');
    if (q.team === this.me.team && !this.autoplay) { q.vx *= 0.35; q.vz *= 0.35; }
    this.passTo = q; this.passT = T + 1; this.passFrom = p; q.plan = null; q.react = 0;
    this.cross = { to: q, team: p.team, t: this.time, T, x: tx, z: tz };
    // los rivales tardan su reacción en ir a por él (como en el pase al hueco)
    if (this.human(p)) for (const r of this.team(this.other(p.team))) if (r.role !== 'POR') r.react = Math.max(r.react, this.L(r).react * 0.7);
    if (q.team === this.me.team && !this.autoplay && q !== this.me) this.setMe(q, 'pass');
    this.emit({ t: 'cross', p: p.id, q: q.id });
  }
  /** Dónde y cuándo puede p rematar de cabeza el balón que viene por alto (o null). */
  headPoint(p) {
    const b = this.ball; if (b.grounded || this.owner) return null;
    // (mejor donde el balón baja a 1,6–2,1 m, a la altura de la frente; si no llega a tiempo, más arriba, saltando)
    const sp = PL.sprint; let hi = null;
    for (let t = 0.05; t <= 2.5; t += 0.05) {
      const q = rollAhead(b, t); if (q.y == null) break;
      if (q.y < 1.15 || q.y > 2.5) continue;
      if (hyp(q.x - p.x, q.z - p.z) / sp + 0.1 <= t) { const r = { x: q.x, z: q.z, y: q.y, t }; if (q.y <= 2.1) return r; hi ||= r; }
    }
    return hi;
  }
  // qué quiere hacer de cabeza cada uno: el tuyo, lo que hayas pedido (TIRO, a portería; PASE, a un compañero); la IA
  // remata en el área rival y despeja en la suya (en el resto del campo, el balón se controla cuando baja)
  headWant(p) {
    if (this.human(p)) {
      if (this.hold.shoot >= 0 || this.buffer?.kind === 'shot') return 'shot';
      if (this.hold.pass >= 0 || this.buffer?.kind === 'pass') return 'pass';
      // con la ayuda, el centro que va a por ti en el área se remata solo
      return this.assist && this.cross?.to === p && this.inBox(p.team, p) ? 'shot' : null;
    }
    if (this.inArea(this.other(p.team), this.ball.p.x, this.ball.p.z, F.areaD ? 3 : 2.5)) return 'shot';
    if (this.inArea(p.team, this.ball.p.x, this.ball.p.z, F.areaD ? 3 : 4)) return 'clear';
    return null;
  }
  // un balón por alto que pasa a la altura de la cabeza (de 1,15 a 2,5 m, saltando) al alcance de alguien
  headers() {
    const b = this.ball, B = b.p;
    if (this.owner || b.held || B.y < 1.15 || B.y > 2.5 || b.hspeed < 2.5) return;
    const kick = this.lastKick?.t ?? -1;
    let best = null, bs = 1e9;
    for (const p of this.players) {
      if (p.off || p.cool > 0 || p.stun > 0 || p.down > 0 || p.slide || p.dive || p.hands || p.role === 'POR' || p.headMiss === kick) continue;
      if (this.restart && this.restart.taker !== p) continue;
      // (alto, a más de 2,15 m, solo llega saltando justo debajo)
      const hu = this.human(p), reach = (hu ? (this.assist ? 1.05 : 0.9) : 0.75) * (B.y > 2.15 ? 0.55 : 1), d = hyp(B.x - p.x, B.z - p.z);
      if (d > reach) {
        // a punto de llegarle (en menos de 0,2 s): salta ya, para llegar arriba a la vez que el balón
        if (d < reach + 4 && p.headPrep !== kick) {
          const rx = B.x - p.x, rz = B.z - p.z, vv = b.v.x * b.v.x + b.v.z * b.v.z, tc = -(rx * b.v.x + rz * b.v.z) / vv;
          if (tc > 0 && tc < 0.2 && hyp(rx + b.v.x * tc, rz + b.v.z * tc) < reach && B.y + b.v.y * tc > 1.1 && this.headWant(p)) { p.headPrep = kick; this.emit({ t: 'headPrep', p: p.id }); }
        }
        continue;
      }
      const want = this.headWant(p); if (!want) continue;
      // la IA no siempre llega bien: una vez por balón decide si lo toca (el que despeja, más a menudo)
      // (al que va el centro, más a menudo que a uno al que le cae un rebote)
      // (y un rechace del portero que sale por alto, a bote pronto, se cabecea mal)
      if (!hu) { const L = this.L(p), aim = this.cross?.to === p, ok = want === 'clear' ? 0.78 : (aim ? 0.68 : this.last?.role === 'POR' ? 0.22 : 0.35) + (1 - L.passErr / 2) * 0.15; if (this.rnd() > ok) { p.headMiss = kick; continue; } }
      const sc = d / reach + (B.y > 2.1 ? 0.2 : 0);
      if (sc < bs) { bs = sc; best = { p, want }; }
    }
    if (!best) return;
    // el portero rival, debajo del balón dentro de su área, llega antes con las manos (saltando, hasta 2,75 m)
    const k = this.gk(this.other(best.p.team));
    if (this.inArea(k.team, B.x, B.z) && hyp(B.x - k.x, B.z - k.z) < (k.claim ? 1.1 : 0.8) && B.y < 2.75 && !k.down && !k.dive && !k.hands && this.last?.team !== k.team) return this.claimCross(k);
    this.header(best.p, best.want);
  }
  // el portero atrapa el centro (o, si viene muy fuerte o se le escapa, lo despeja de puños)
  claimCross(k) {
    const b = this.ball, L = this.L(k), s = -this.dir[k.team];
    if (b.speed < L.catchV + 6 && this.rnd() < 0.6 + L.keeperReach * 0.25) { this.catchBall(k); k.act = 'save'; k.actT = 0.5; this.emit({ t: 'save', p: k.id, catch: true }); }
    else { const side = Math.sign(b.p.z || this.rnd() - 0.5); b.kick(-s * (5 + this.rnd() * 5), 3 + this.rnd() * 2.5, side * (3 + this.rnd() * 4)); this.last = k; k.cool = 0.3; this.emit({ t: 'save', p: k.id, catch: false }); }
    this.cross = null;
  }
  // golpe con la cabeza hacia (tx, ty, tz) con velocidad horizontal v y un error de dirección err (rad)
  headTo(p, tx, ty, tz, v, err) {
    const B = this.ball.p, dx = tx - B.x, dz = tz - B.z, d = hyp(dx, dz) || 1;
    const a = Math.atan2(dz, dx) + (this.rnd() + this.rnd() - 1) * err, T = d / (v * (1 - 0.004 * v));
    let vy = (ty - B.y) / T + 0.5 * K.g * T; vy += (this.rnd() + this.rnd() - 1) * err * v * 0.35;
    this.kickBall(p, Math.cos(a) * v, vy, Math.sin(a) * v, 0, 'head');
  }
  header(p, kind) {
    // (el que estaba en fuera de juego cuando salió el centro no puede rematarlo: como al controlar el balón)
    if (this.offs) { const o = this.offs; this.offs = null; if (o.team === p.team && o.ids.includes(p.id) && this.phase === 'play') return this.offside(p); }
    const b = this.ball, B = b.p, t = p.team, s = this.dir[t], L = this.L(p), hu = this.human(p);
    const charge = hu ? (this.hold.shoot >= 0 ? this.charge : this.buffer?.charge ?? 0.5) : 0.4 + this.rnd() * 0.5;
    if (kind === 'shot' && s * B.x < 0) kind = 'clear';   // (en tu campo, rematar es despejar)
    if (hu) { this.hold.shoot = -1; this.hold.pass = -1; this.buffer = null; }
    const press = (this.nearestFoe(p) < 1.2 ? 0.04 : 0) + (this.last?.role === 'POR' && this.last.team !== t ? 0.07 : 0);
    if (kind === 'shot') {
      // a portería: el tuyo, a la diana (el joystick); la IA, al palo que tiene más lejos el portero. Hacia abajo: el
      // buen remate bota antes de la línea (con más carga, más fuerte y más alto)
      // (el cabezazo pierde fuerza y puntería con la distancia: de lejos, a más de 9 m, casi nunca es gol)
      let tz;
      if (hu) tz = this.shotAim(p, charge).tz;
      else { const k = this.gk(this.other(t)); tz = (k.z > B.z * 0.3 ? -1 : 1) * (HW_G - 1.1) + (this.rnd() - 0.5) * L.passErr * 0.8; }
      const far = Math.max(0, hyp(s * F.HL - B.x, B.z) - 9 * SC) / SC;
      const v = (F.areaD ? 8 : 10) + charge * (F.areaD ? 5 : hu ? 8.5 : 5), ty = hu ? 0.3 + charge * 0.7 + this.rnd() * 0.3 : 0.3 + this.rnd() * 1.6;
      this.headTo(p, s * (F.HL + 0.3), ty, tz, v, (hu ? 0.035 : 0.12 + L.passErr * 0.04) + press * (hu ? 1 : 1.5) + far * 0.012);
      this.aim = null; this.stats.shots[t]++; this.shotLive = { team: t, t: this.time };
      this.emit({ t: 'shot', p: p.id, power: v });
    } else if (kind === 'pass') {
      // de cabeza al compañero hacia donde apuntas (o hacia delante si no hay nadie)
      const I = this.input, f = fwd(p); let dx = I.mag > 0.25 ? I.x : f.x, dz = I.mag > 0.25 ? I.z : f.z; const l = hyp(dx, dz) || 1; dx /= l; dz /= l;
      const q = this.bestReceiver(p, dx, dz, PL.cone * 1.3);
      const tx = q ? q.x + q.vx * 0.6 : B.x + dx * 8 * SC, tz = q ? q.z + q.vz * 0.6 : B.z + dz * 8 * SC, d = hyp(tx - B.x, tz - B.z);
      this.headTo(p, clamp(tx, -F.HL + 0.5, F.HL - 0.5), R, clamp(tz, -F.HW + 0.5, F.HW - 0.5), clamp(4 + d * 0.5, 6, 12), 0.05 + press);
      this.stats.passes[t]++;
      if (q) { this.passTo = q; this.passT = 2; this.passFrom = p; if (hu) this.setMe(q, 'pass'); }
    } else {
      // despeje: lejos de tu portería, hacia la banda más cercana y por alto
      const side = Math.sign(B.z || this.rnd() - 0.5), dx = s * (0.75 + this.rnd() * 0.25), dz = side * (0.35 + this.rnd() * 0.5), l = hyp(dx, dz);
      const v = (F.areaD ? 8 : 11) + this.rnd() * (F.areaD ? 4 : 6);
      this.kickBall(p, dx / l * v, (F.areaD ? 3 : 4.5) + this.rnd() * 2.5, dz / l * v, 0, 'head');
      if (this.shotLive && this.shotLive.team !== t) this.emit({ t: 'blocked', p: p.id });
    }
    p.act = 'head'; p.actT = 0.5; p.cool = 0.3;
    if (this.cross) this.cross = null;
    this.emit({ t: 'header', p: p.id, kind, team: t });
  }
  // ---------------------------------------------------------------- golpeos
  kickBall(p, vx, vy, vz, spin = 0, kind = 'pass') {
    const b = this.ball;
    if (this.handThrow) { kind = 'throw'; this.handThrow = false; }   // el portero saca con la mano
    if (this.owner) this.owner.hands = false;
    b.held = null; this.owner = null;
    if (b.p.y < R) b.p.y = R;
    b.kick(vx, vy, vz, spin);
    p.cool = 0.24; p.act = kind === 'throw' ? 'throw' : 'kick'; p.actT = 0.4; this.last = p; this.cross = null;
    p.h = Math.atan2(vx, vz);
    this.lastKick = { p, kind, t: this.time, x: b.p.x, z: b.p.z };
    // no vale gol directo (hasta que la toque otro): saque de banda (con la mano o, en sala, con el pie), tiro libre
    // indirecto y balón lanzado con la mano por el portero (también el saque de portería de sala)
    const rs = this.restart, nd = kind === 'throw' ? 'throw' : rs?.type === 'throwin' ? 'throwin' : rs?.type === 'free' && rs.indirect ? 'indirect' : null;
    // y de cualquier otro saque (de centro, de meta, córner o falta directa) no vale gol directo en la propia portería
    this.noDirect = nd ? { p, why: rs?.type === 'throwin' ? 'throwin' : nd } : rs && rs.type !== 'penalty' ? { p, why: 'own', ownOnly: true } : null;
    // fuera de juego: los compañeros que están más adelantados que el balón y que el penúltimo rival en el campo contrario
    // en el momento del pase (no cuenta en el saque de banda, el de meta ni el córner)
    const rt = this.restart?.type, free = !RU.offside || rt === 'throwin' || rt === 'goalkick' || rt === 'corner';
    this.offs = free || kind === 'throw' ? null : { team: p.team, ids: this.team(p.team).filter(q => q !== p && this.isOffside(q)).map(q => q.id) };
    this.emit({ t: 'kick', p: p.id, kind, power: hyp(vx, vy, vz) });
    if (this.restart && (this.phase === 'kickoff' || this.phase === 'setpiece')) { this.restart = null; this.setPhase('play'); }
  }
  isOffside(q) { if (!RU.offside) return false; const s = this.dir[q.team], u = s * q.x; return u > 0 && u > s * this.ball.p.x + 0.1 && u > this.offLine(q.team) + 0.1; }
  // tus pases rasos van más tensos (como en los juegos de fútbol): la defensa tiene menos tiempo para cortarlos
  firm(p) { return this.human(p) ? 1.3 : 1; }
  // pase raso: llega al compañero a unos 5,5–10 m/s en fútbol 11 y a 4–6 m/s en sala (rodadura y aire de por medio)
  groundV(d) {
    if (K.dragK) { const va = 4 + Math.min(2, d * 0.14), dec = K.roll + 0.7; return clamp(Math.sqrt(va * va + 2 * dec * d), K.pass[0], K.pass[1]); }
    const va = 5.5 + Math.min(5, d * 0.12); return clamp(Math.sqrt(va * va + 2 * 2.4 * d), K.pass[0], K.pass[1]);
  }
  // balón elevado: tiempo de vuelo según la distancia y velocidad de salida con la resistencia del aire (x = ln(1 + k·v·t)/k)
  loftV(d) { const T = clamp(0.9 + d * 0.042, 1.05, 2.9), vh = (Math.exp(K.drag * d) - 1) / (K.drag * T); return { T, vh, vy: 0.5 * K.g * T * 1.07 }; }
  // pase raso con la potencia según la distancia (o elevado), adelantado a la carrera del compañero
  passBall(p, q, loft, err) {
    const b = this.ball.p;
    let tx = q.x, tz = q.z, v = 10, T = 1;
    for (let k = 0; k < 3; k++) {
      const d = hyp(tx - b.x, tz - b.z); v = loft ? this.loftV(d).vh : this.groundV(d) * this.firm(p);
      T = loft ? this.loftV(d).T : d / (v * 0.78);
      // (al tuyo, el pase va justo a donde llegará corriendo; a la IA, algo corto para que lo busque)
      // (tu pase va casi a los pies del compañero, que frena y sale a por él; antes iba a donde llegaría corriendo, el
      // compañero seguía su carrera por delante del balón y lo cortaba un rival)
      const lead = q.team === this.me.team && !this.autoplay ? (this.human(p) ? 0.25 : 1) : 0.85;
      tx = q.x + q.vx * T * lead; tz = q.z + q.vz * T * lead;
    }
    tx += (this.rnd() - 0.5) * 2 * err; tz += (this.rnd() - 0.5) * 2 * err;
    tx = clamp(tx, -F.HL + 0.4, F.HL - 0.4); tz = clamp(tz, -F.HW + 0.4, F.HW - 0.4);
    this.passToPoint(p, tx, tz, loft, q);
    // el balón va a un compañero tuyo (lo pasa el portero o la IA): pasas a llevar al que lo recibe
    if (q.team === this.me.team && p !== this.me && !this.autoplay) this.setMe(q, 'pass');
  }
  passToPoint(p, tx, tz, loft, q = null, power = null) {
    const b = this.ball.p, dx = tx - b.x, dz = tz - b.z, d = hyp(dx, dz) || 1;
    if (this.restart?.type === 'throwin' && RU.throwHands) return this.throwBall(p, tx, tz, q);
    // (con la barra, la fuerza también se nota en lo rápido que sale el balón: flojo, más lento; a tope, tenso)
    const boost = power == null ? 1 : 0.85 + power * 0.45;
    if (loft) { const L = this.loftV(d); this.kickBall(p, dx / d * L.vh, L.vy, dz / d * L.vh, 0, 'loft'); }
    else { const v = Math.min(K.pass[1], this.groundV(d) * this.firm(p) * boost); this.kickBall(p, dx / d * v, 0, dz / d * v, 0, 'pass'); }
    this.passTo = q; this.passT = 3.2; this.passFrom = p;
    if (q) { q.plan = null; q.react = 0; }
    // tu pase a un compañero: los rivales tardan su tiempo de reacción en ir a por él (como con el pase al hueco). Antes
    // salían al instante y cortaban casi la mitad de los pases de 15 a 25 m
    if (q && this.human(p) && q.team === p.team && hyp(q.x - tx, q.z - tz) < 3 * SC) { q.vx *= 0.35; q.vz *= 0.35; }   // (al pie: frena para recibir; al hueco sigue su carrera)
    if (q && this.human(p) && q.team === p.team) for (const r of this.team(this.other(p.team))) if (r.role !== 'POR') r.react = Math.max(r.react, this.L(r).react * 0.9);
  }
  // saque de banda: con las dos manos desde encima de la cabeza, como mucho a unos 25 m
  throwBall(p, tx, tz, q = null) {
    const B = this.ball.p; let dx = tx - B.x, dz = tz - B.z, d = hyp(dx, dz) || 1;
    if (d > 25) { dx *= 25 / d; dz *= 25 / d; d = 25; }
    const vh = clamp(5 + d * 0.42, K.throw[0], K.throw[1]), T = (Math.exp(K.drag * d) - 1) / (K.drag * vh), vy = (0.4 - B.y + 0.5 * K.g * T * T) / T;
    this.kickBall(p, dx / d * vh, vy, dz / d * vh, 0, 'throw');
    this.passTo = q; this.passT = 3; this.passFrom = p;
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
}
