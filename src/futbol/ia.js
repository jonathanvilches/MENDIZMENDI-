// El partido de fútbol (futbol/game.js), lo que piensan los que no llevas tú: el portero (colocarse, tirarse, blocar
// y sacar) y cada equipo (dónde ponerse, a quién pasar, cuándo regatear y cuándo tirar). Son métodos de FutbolGame:
// game.js los une a su clase (util/mezcla.js), con su this.
import { FIELD as F, PHYS as K, PLAYER as PL, RULES as RU } from './rules.js';
import { clamp } from '../util/math.js';
import { rollAhead } from './physics.js';
import { R, HW_G, SC, hyp, angDiff, fwd, foot, segDist, gkReach } from './comun.js';

export class FutbolIA {
  // ---------------------------------------------------------------- portero
  keeper(p, h) {
    const t = p.team, s = -this.dir[t], gx = s * F.HL, b = this.ball, B = b.p, L = this.L(p);
    if (p.hands) return this.distribute(p, h);
    if (p.dive) return;
    if (p.down > 0) { p.wx = p.wz = 0; return; }
    const dB = hyp(B.x - gx, B.z);
    // colocación: en la bisectriz entre el balón y el centro de la portería, de 1 a 3 m de la línea (más fuera cuanto más
    // cerca está el balón); con el balón lejos, adelantado al borde del área para barrer los balones a la espalda
    // (en sala, de 0,8 a 2 m de la línea: más fuera cuanto más cerca está el balón)
    const ux = (B.x - gx) / (dB || 1), uz = B.z / (dB || 1), out = F.areaD ? clamp(0.8 + (16 - dB) * 0.1, 0.8, 2) : dB > 40 ? clamp(4 + (dB - 40) * 0.25, 4, 11) : clamp(1 + (26 - dB) * 0.1, 1, 3);
    let tx = gx + ux * out, tz = clamp(uz * out * 1.4, -HW_G - 0.25, HW_G + 0.25), sprint = false;
    // un tiro (o un balón fuerte) hacia su portería: tras su tiempo de reacción, se estira o se coloca
    // solo un tiro (o un balón fuerte) que va entre los palos: un pase o un despeje que cruza su zona no le hace tirarse
    // Un tiro entre los palos: tras su tiempo de reacción se desplaza de lado hacia donde va el balón y solo se lanza en
    // el último medio segundo (antes se tiraba nada más ver el tiro: en un tiro lejano ya estaba en el suelo cuando
    // llegaba el balón, aunque fuese a sus manos). Si le llega a las manos o a la altura del pecho, no se tira: lo
    // bloca de pie; si va alto y a él, salta; si va lejos o raso a un lado, se estira.
    const toward = !this.owner && b.v.x * s > 3 && ((this.shotLive && this.shotLive.team !== t) || b.speed > 14);
    const Tg = toward ? (gx - B.x) / b.v.x : -1, zg = B.z + b.v.z * Tg, yg = B.y + b.v.y * Tg - 0.5 * K.g * Tg * Tg;
    if (toward && Tg > 0 && Tg < 2.8 && Math.abs(zg) < HW_G + 0.6 && yg < F.goalH + 0.4) {
      // cuándo pasa el balón más cerca de él, entre ahora y la línea de gol: en un tiro cruzado no es al cruzar su línea
      // (por ahí el balón va aún fuera del palo y luego se cuela por detrás de él, hacia el centro: se tiraba hacia fuera
      // y el balón entraba a medio metro), sino en diagonal, más atrás
      const vv = b.v.x * b.v.x + b.v.z * b.v.z, T = clamp(vv > 1e-6 ? ((p.x - B.x) * b.v.x + (p.z - B.z) * b.v.z) / vv : 0, 0.03, Math.max(0.03, Tg));
      const xc = B.x + b.v.x * T, zc = B.z + b.v.z * T, yc = Math.max(R, B.y + b.v.y * T - 0.5 * K.g * T * T);
      if (p.threat == null) p.threat = L.keeperReact;
      p.threat -= h;
      const HD = p.humanDive;
      if ((p.threat <= 0 || HD) && Math.abs(zc) < HW_G + 1.2 && yc < F.goalH + 0.7) {
        // (si tiene que estirarse mucho, se lanza antes: lo que tarda en cubrir esa distancia más el impulso)
        // (la estirada pedida por ti: hacia el lado que elegiste; si es el malo, se lanza igual hacia ese lado)
        const GK = gkReach(); let need = zc - p.z;
        // (si el balón le va al cuerpo, no hace falta tirarse: lo bloca de pie aunque hayas pedido un lado)
        if (HD?.side && Math.sign(need) !== HD.side && Math.abs(need) > 0.6) need = HD.side * Math.max(Math.abs(need), 1.6);
        // (y hacia atrás, si el balón se le cuela por detrás en diagonal: la estirada va hacia ese punto, no solo de lado)
        const needX = HD ? 0 : xc - p.x, dist = hyp(needX, need);
        const lead = Math.max(0.4 + 0.1 * L.keeperReach, (dist - GK.hand) / (GK.v * L.keeperReach) + 0.16);
        const high = yc > 2.05 || (HD?.high && yc > 1.5), low = yc < 0.45 && dist > 0.35;
        if (T <= lead && (dist > 0.5 || high || low)) {
          p.humanDive = null;
          // (el impulso tarda una décima en arrancar: se cuenta para llegar a tiempo)
          // (el cuerpo va medio metro menos: las manos van por delante, hacia donde se lanza)
          const reach = L.keeperReach, dur = Math.max(0.1, T - 0.12), v = clamp(Math.max(0, dist - GK.hand) / dur, 0, GK.v * reach);
          const ux = dist > 1e-3 ? needX / dist : 0, uz = dist > 1e-3 ? need / dist : (Math.sign(need) || 1);
          p.dive = { t: Math.max(0.55, T + 0.3), vz: uz * v, vx: ux * v + (needX * s > 0.3 ? 0 : -s * 0.35), hy: clamp(yc, 0.25, 2.4), side: Math.sign(need) || 1, ux, uz, jump: dist <= 0.5 };
          p.act = 'dive'; p.actT = 0.9; this.emit({ t: 'dive', p: p.id, side: p.dive.side, high: yc > 1.2 });
          return;
        }
        tz = clamp(zc, -HW_G - 0.3, HW_G + 0.3); tx = p.x;
      }
    } else { p.threat = null; if (p.humanDive && !toward) p.humanDive = null; }
    if (p.spread > 0) p.spread -= h;
    // balón suelto en su área y él llega antes que nadie: sale a por él
    if (!this.owner && this.inArea(t, B.x, B.z) && b.hspeed < 9) {
      const mine = hyp(B.x - p.x, B.z - p.z) / 6.5;
      let foe = 1e9; for (const q of this.team(this.other(t))) foe = Math.min(foe, hyp(B.x - q.x, B.z - q.z) / 6.5);
      if (mine < foe - 0.1) { const q = rollAhead(b, mine * 0.7); tx = q.x; tz = q.z; sprint = true; }
    }
    // un pase al hueco hacia su área (rodando o a media altura) que nadie controla: si llega antes que nadie a donde va
    // a estar el balón, sale a cortarlo (antes solo salía cuando el balón ya iba despacio y el delantero llegaba antes)
    else if (!this.owner && !toward && b.v.x * s > 2 && B.y < 1.4 && b.hspeed >= 9 && this.last?.team !== t && !this.human(p)) {
      for (let T = 0.3; T <= 2.4; T += 0.3) {
        const q = rollAhead(b, T); if ((q.y ?? 0) > 1.6 || !this.inArea(t, q.x, q.z, -0.5)) continue;
        const mine = hyp(q.x - p.x, q.z - p.z) / (PL.sprint * 0.95) + 0.2;
        let foe = 1e9; for (const r of this.team(this.other(t))) foe = Math.min(foe, hyp(q.x - r.x, q.z - r.z) / PL.sprint);
        if (mine <= T && mine < foe - 0.15) { tx = q.x; tz = q.z; sprint = true; p.sweep = true; break; }
      }
    }
    // un centro del rival que cae en el área pequeña: sale a por él si llega a tiempo y lo atrapa por encima de las
    // cabezas (headers); antes se quedaba en la línea y el remate a dos metros era gol casi siempre
    const C = this.cross; p.claim = false;
    if (C && C.team !== t && !this.owner && !this.human(p)) {
      const depth = s * (gx - C.x), wz = F.areaD ? HW_G + 1.5 : F.boxW / 2 + 0.5;
      if (depth < (F.areaD ? 3.5 : F.box + 1) && Math.abs(C.z) < wz) {
        const left = C.T - (this.time - C.t), need = hyp(C.x - p.x, C.z - p.z) / (PL.sprint * 0.95);
        if (need < left + 0.25 * L.keeperReach) { tx = C.x; tz = C.z; sprint = true; p.claim = true; }
      }
    }
    // un rival se le planta con el balón: sale a taparle
    const o = this.owner;
    // (cuando está cerca de él, abierto de brazos y piernas: tapa el tiro con el cuerpo)
    if (o && o.team !== t && this.inArea(t, o.x, o.z, 1) && hyp(o.x - gx, o.z) < Math.min(12, F.area + 2.5)) { const gap = F.areaD ? 1.2 : 2; tx = o.x - ux * gap; tz = o.z - uz * gap; sprint = true;   // (en sala, encima: la pista es pequeña)
      if (hyp(o.x - p.x, o.z - p.z) < 3.2) p.spread = 0.5;
      const fo = foot(o), dob = hyp(B.x - fo.x, B.z - fo.z);
      // se tira a los pies: más fácil si el balón va separado del pie del delantero
      if (hyp(B.x - p.x, B.z - p.z) < 0.9 && this.rnd() < 1 - Math.exp(-2.5 * L.keeperReach * clamp((dob + 0.15) / 0.55, 0.5, 1) * h)) { o.stun = 0.3; this.catchBall(p); return; } }
    this.seek(p, tx, tz, sprint ? PL.sprint : PL.run, sprint);   // (de lado, a pasos: al trote, no esprintando)
    p.face = { x: B.x, z: B.z };
    this.keeperTouch(p);
  }
  diveStep(p, h) {
    const D = p.dive; D.t -= h; D.el = (D.el || 0) + h;
    const go = clamp((D.el - 0.06) / 0.1, 0, 1);   // impulso: casi 0,12 s hasta lanzarse del todo
    p.x += D.vx * go * h; p.z += D.vz * go * h; p.vx = D.vx * go; p.vz = D.vz * go; if (go >= 1) { D.vz *= Math.exp(-1.5 * h); if (D.ux) D.vx *= Math.exp(-1.5 * h); }
    this.bounds(p); this.keeperTouch(p);
    if (D.t <= 0) { p.dive = null; p.down = 0.5; p.vx = p.vz = 0; p.threat = null; }
  }
  // ¿llega con las manos? Lo bloca si llega flojo y centrado; si llega fuerte, lo despeja
  keeperTouch(p) {
    if (this.owner || (this.lastKick?.p === p && this.time - this.lastKick.t < 0.4)) return;
    const b = this.ball, B = b.p, t = p.team, s = -this.dir[t];
    if (!this.inArea(t, B.x, B.z, 0.3)) return;   // fuera de su área no puede tocarla con las manos (ni estirándose)
    // cesión de un compañero con el pie o de su saque de banda: con el pie (la mano, solo si se la manda de cabeza)
    if (this.last?.team === t && this.last !== p && this.lastKick?.p === this.last && this.lastKick.kind !== 'head') return;
    // (estirado, las manos van hacia su lado; saltando, por encima de la cabeza; abierto ante un delantero, el cuerpo
    // entero tapa un metro a cada lado hasta la altura del pecho)
    const GK = gkReach(), D = p.dive, spread = !D && p.spread > 0, dj = D && !D.jump, hx = p.x + (D ? -s * 0.1 : 0) + (dj && D.ux ? D.ux * GK.hand : 0), hz = p.z + (dj ? (D.uz ?? D.side) * GK.hand : 0), hy = D ? D.hy : 1.1;
    const dh = hyp(B.x - hx, B.z - hz), r = D ? GK.dive : spread ? GK.spread : GK.stand;
    if (dh > r || B.y > (D ? hy + 0.75 : spread ? 1.6 : 2.25) || B.y < (D ? hy - 0.95 : 0)) return;
    const L = this.L(p), v = b.speed;
    // a la punta de los dedos (o con una pierna, abierto ante el delantero) no siempre llega: se decide una vez por tiro
    const kick = this.lastKick?.t ?? -1;
    if (p.missKick === kick) return;
    // (lo que cuenta es lo cerca que pasará el balón de la mano, no dónde está al entrar en su alcance)
    const rx = B.x - hx, rz = B.z - hz, vx = b.v.x - p.vx, vz = b.v.z - p.vz, vv = vx * vx + vz * vz;
    const tc = vv > 1e-6 ? clamp(-(rx * vx + rz * vz) / vv, 0, 0.2) : 0, dmin = hyp(rx + vx * tc, rz + vz * tc);
    const edge = dmin / r, lim = D ? 0.55 : spread ? 0.5 : 0.7;
    // (más difícil arriba, a la escuadra, y cuanto más fuerte va)
    if (edge > lim && this.rnd() > 1 - (edge - lim) / (1 - lim) * (0.62 + Math.max(0, v - 22) * 0.012 + (D && D.hy > 1.85 && !D.jump ? 0.15 : 0)) * (1.15 - 0.25 * L.keeperReach)) { p.missKick = kick; return; }
    // blocar o despejar: lo que le llega al cuerpo lo bloca aunque vaya fuerte; estirado, lo que le llega a las manos con
    // fuerza media; a la punta de los dedos, a la escuadra o muy fuerte y abierto, lo despeja. Antes solo blocaba los
    // flojos (menos de 14 a 18 m/s, y un tiro va a 23 o 30): despejaba nueve de cada diez y el rechace era gol fácil
    const cuerpo = !D && !spread, alto = D && D.hy > 1.85 && !D.jump;
    const blocaV = L.catchV * (cuerpo ? (edge < 0.5 ? 1.9 : 1.3) : spread ? 1.2 : alto ? 0.9 : edge < 0.35 ? 1.6 : edge < 0.55 ? 1.2 : 0.85);
    if (v < blocaV && this.rnd() < 0.8 + 0.12 * L.keeperReach) { this.catchBall(p); return; }
    // despeje: hacia fuera y a un lado
    const side = Math.sign(B.z || this.rnd() - 0.5);
    b.kick(-s * (3 + this.rnd() * 4), 1.6 + this.rnd() * 2.6, side * (3 + this.rnd() * 4));
    this.last = p; p.cool = 0.3;
    if (this.shotLive && this.shotLive.team !== t) { this.stats.saves[t]++; this.stats.onTarget[this.other(t)]++; this.shotLive = null; }
    this.emit({ t: 'save', p: p.id, catch: false });
  }
  catchBall(p) {
    const b = this.ball; this.offs = null; this.owner = p; this.last = p; p.hands = true; p.holdT = 0.9 + this.rnd() * 0.9; b.held = p; b.stop(); p.holdId = (p.holdId || 0) + 1;
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
    // tu portero: lo sacas tú (andando con el balón por el área y apuntando); si tardas más de 6 s, saca solo
    if (this.gkCtl === p) {
      const I = this.input;
      if (p.gkWait == null) { p.gkWait = 6; this.emit({ t: 'gkCtl', on: true, hands: true }); }
      if (I.mag > 0.2) { p.face = { x: p.x + I.x * 5, z: p.z + I.z * 5 }; if (this.inArea(t, p.x + I.x * 0.4, p.z + I.z * 0.4, -0.5)) { p.wx = I.x * I.mag * 2.2; p.wz = I.z * I.mag * 2.2; } }
      else p.face = { x: p.x - s * 5, z: p.z };
      if ((p.gkWait -= h) > 0) return;
    }
    if ((p.holdT -= h) > 0) return;
    p.gkWait = null;
    let best = null, bs = -1e9;
    for (const q of this.team(t)) {
      if (q === p) continue;
      const d = hyp(q.x - p.x, q.z - p.z) / SC, open = this.openness(q) / SC, lane = this.laneOpen(t, p.x, p.z, q.x, q.z) / SC;
      const sc = Math.min(open, 5) * 0.3 + Math.min(lane, 3) * 0.3 - Math.abs(d - 12) * 0.03 + (this.dir[t] * q.x / SC) * 0.02;
      if (sc > bs) { bs = sc; best = q; }
    }
    p.hands = false; this.ball.held = null; this.owner = null;
    const B = this.ball.p; B.y = 0.9;
    if (best && hyp(best.x - p.x, best.z - p.z) < 28 * SC && bs > 1.4) { this.handThrow = true; this.passBall(p, best, false, 0.3); p.act = 'throw'; }
    else this.clearLong(p);
    if (this.restart) { this.restart = null; this.setPhase('play'); }
  }
  // saque largo con el pie (26–34 m/s, unos 50 m) hacia un delantero o un interior, en el campo rival
  clearLong(p) {
    const t = p.team, B = this.ball.p, ups = this.team(t).filter(q => q.line >= 2);
    const q = ups[(this.rnd() * ups.length) | 0], tx = q ? clamp(q.x + this.dir[t] * 4 * SC, -F.HL + 8 * SC, F.HL - 8 * SC) : this.dir[t] * 10 * SC, tz = q ? q.z * 0.8 : (this.rnd() - 0.5) * F.HW;
    const dx = tx - B.x, dz = tz - B.z, d = hyp(dx, dz) || 1;
    if (K.dragK) {
      // sala: despeje de 18–24 m/s, tenso, hacia el compañero de arriba
      const v = clamp(K.clear[0] + (d - 20) * 0.3 + this.rnd() * 1.5, K.clear[0], K.clear[1]), T = d / (v * 0.85);
      this.kickBall(p, dx / d * v * 0.9, Math.min(0.5 * K.g * T, v * 0.4), dz / d * v * 0.9, 0, 'clear');
    } else { const v = clamp(K.clear[0] + (d - 35) * 0.25 + this.rnd() * 2, K.clear[0], K.clear[1]); this.kickBall(p, dx / d * v * 0.82, v * 0.5, dz / d * v * 0.82, 0, 'clear'); }
    this.passTo = q && hyp(q.x - tx, q.z - tz) < 12 ? q : null; this.passT = 3.4;
  }
  // ---------------------------------------------------------------- IA de equipo (4-4-2)
  /** Posición base de un jugador en ataque o en defensa, desplazada con el balón. */
  spot(p, state) {
    const f = this.form(p); if (!f) return { x: this.ownGoal(p.team) + this.dir[p.team] * 1, z: 0 };
    const [u0, v0] = state === 'atk' ? f.atk : f.def, s = this.dir[p.team], B = this.ball.p;
    const bu = s * B.x / F.HL, bv = B.z / F.HW;
    // el bloque se mueve con el balón a lo largo y se cierra hacia su banda a lo ancho
    let u = u0 + bu * (state === 'atk' ? 0.4 : 0.44), v = s * v0 * (state === 'atk' ? 0.92 : 0.8) + bv * 0.3;
    if (p.line === 1) u = Math.min(u, bu - 0.06);   // la defensa, siempre por detrás del balón
    if (p.line === 1 && state === 'def') u = Math.max(u, -0.86);
    u = clamp(u, -0.9, 0.86); v = clamp(v, -0.92, 0.92);
    // en ataque, nadie se queda en fuera de juego
    const x = s * u * (F.HL - 1);
    if (!RU.offside) return { x, z: v * (F.HW - 1) };
    const off = Math.max(this.offLine(p.team), s * B.x) - 0.6;
    return { x: state === 'atk' && s * x > off && s * x > 0 ? s * Math.max(off, 0.5) : x, z: v * (F.HW - 1) };
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
    // (un balón que pasa por encima de la cabeza no se alcanza: se va a donde baja a la altura de la cabeza o al suelo)
    for (let t = 0; t <= 3; t += 0.1) { const q = rollAhead(b, t); if (q.y > 2.4) continue; if (hyp(q.x - p.x, q.z - p.z) / sp + 0.15 <= t) return { x: q.x, z: q.z, t }; }
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
      // uno solo va a por él: el que recibe el pase (si es de este equipo) o el que antes llega
      const rec = this.passTo && this.passTo.team === t && this.passTo.role !== 'POR' ? this.passTo : null;
      if (rec && !this.human(rec)) { const q = this.interceptPoint(rec); rec.job = { kind: 'chase', x: q.x, z: q.z }; }
      else if (!rec && best && !(humanNear && this.passTo !== best)) best.job = { kind: 'chase', x: best.ip.x, z: best.ip.z };
      const st = this.last?.team === t ? 'atk' : 'def';
      for (const p of field) if (!p.job) { const s = this.spot(p, st); p.job = { kind: 'spot', x: s.x, z: s.z }; }
      return;
    }
    if (state === 'def' && o.hands && o.role === 'POR') {
      // el portero rival tiene el balón en las manos: nadie le presiona; todos a su sitio, fuera de su área
      for (const p of field) { const sp = this.spot(p, 'def'); let x = sp.x; if (this.inArea(o.team, x, sp.z, 1)) x = this.ownGoal(o.team) + this.dir[o.team] * (F.area + 2); p.job = { kind: 'spot', x, z: sp.z }; }
      return;
    }
    if (state === 'def') {
      // presión: el más rápido en llegar al poseedor, por el lado de la portería; el segundo cubre; los demás marcan
      const g = { x: this.ownGoal(t), z: 0 }, ox = o.x, oz = o.z, gd = hyp(g.x - ox, g.z - oz) || 1;
      const press = { x: ox + (g.x - ox) / gd * 0.9 + o.vx * 0.2, z: oz + (g.z - oz) / gd * 0.9 + o.vz * 0.2 };
      const humanPress = !this.autoplay && this.me.team === t && hyp(this.me.x - ox, this.me.z - oz) < 5 && !this.input.mate;
      const order = field.slice().sort((a, b) => hyp(a.x - press.x, a.z - press.z) - hyp(b.x - press.x, b.z - press.z));
      let k = 0;
      if (!humanPress && order[k]) { order[k].job = { kind: 'press', x: press.x, z: press.z }; k++; }
      if (order[k] && (L.coord || gd < 30 * SC || humanPress)) { const c = { x: ox + (g.x - ox) / gd * Math.min(6 * SC, gd * 0.5), z: oz + (g.z - oz) / gd * Math.min(6 * SC, gd * 0.5) }; order[k].job = { kind: 'cover', x: c.x, z: c.z }; k++; }
      // marcas en zona: cada uno se ocupa del atacante libre más cercano a su sitio (si lo tiene a menos de 15 m), del más
      // peligroso (cerca de nuestra portería) al menos; si no, guarda la posición
      const threats = foes.filter(f => f !== o).sort((a, b) => hyp(a.x - g.x, a.z) - hyp(b.x - g.x, b.z));
      const free = order.slice(k);
      for (const p of free) {
        const s = this.spot(p, 'def');
        let m = null, md = 15 * SC; for (const f of threats) { if (f.marked === t) continue; const d = hyp(f.x - s.x, f.z - s.z); if (d < md) { md = d; m = f; } }
        if (m) { m.marked = t; const fd = hyp(g.x - m.x, g.z - m.z) || 1, mx = m.x + (g.x - m.x) / fd * 1.6 * Math.max(SC, 0.7), mz = m.z + (g.z - m.z) / fd * 1.6 * Math.max(SC, 0.7); p.job = { kind: 'mark', x: (mx * 0.65 + s.x * 0.35), z: (mz * 0.65 + s.z * 0.35), m }; }
        else p.job = { kind: 'spot', x: s.x, z: s.z };
      }
      for (const f of threats) f.marked = null;
      return;
    }
    // ataque: un apoyo cerca del poseedor, desmarques a los espacios y los delanteros al límite del fuera de juego
    const s = this.dir[t], off = RU.offside ? Math.max(this.offLine(t), s * B.x) - 0.8 : F.HL - 1.5;
    const others = field.filter(p => p !== o);
    let sup = null, sd = 1e9; for (const p of others) { const d = hyp(p.x - o.x, p.z - o.z); if (d < sd) { sd = d; sup = p; } }
    for (const p of others) {
      if (p.line === 3 && s * o.x > -10 * SC && p !== sup) {
        // desmarque de ruptura: hacia la portería, pegado a la línea del penúltimo defensor; dentro del área, al punto de
        // penalti o al primer palo (el pívot de sala, de espaldas en la frontal del área)
        const deep = Math.min(off, F.HL - 7 * SC), z = clamp(o.z * -0.35 + (p.role === 'DCI' ? -5 : 5) * SC, -12 * SC, 12 * SC);
        p.job = { kind: 'run', x: s * Math.max(deep, s * p.x - 2), z }; continue;
      }
      if (p === sup) {
        // apoyo: a unos 9 m del poseedor, en diagonal hacia atrás, por el lado con menos rivales
        let best = null, bs = -1e9;
        for (const a of [-2.3, -1.6, -0.9, 0.9, 1.6, 2.3]) {
          const x = clamp(o.x + Math.cos(a) * 9 * SC * s * (Math.abs(a) > 1.5 ? -0.6 : 1), -F.HL + 2 * SC, F.HL - 2 * SC), z = clamp(o.z + Math.sin(a) * 9 * SC, -F.HW + 1, F.HW - 1);
          const sc = Math.min(this.openAt(t, x, z), 4 * SC) + Math.min(this.laneOpen(t, o.x, o.z, x, z), 3 * SC) - hyp(x - p.x, z - p.z) * 0.08 / SC;
          if (sc > bs) { bs = sc; best = { x, z }; }
        }
        p.job = { kind: 'support', x: best.x, z: best.z }; continue;
      }
      // desmarque: el mejor hueco cerca de su posición base (lejos de rivales, con línea de pase limpia, sin amontonarse)
      if (!p.free || (p.freeT -= 0.2) <= 0) {
        const b = this.spot(p, 'atk'); let best = b, bs = -1e9;
        for (let k = 0; k < 7; k++) {
          const a = k / 7 * Math.PI * 2, r = k ? 6 * SC : 0, x = clamp(b.x + Math.cos(a) * r, -F.HL + 1.5, F.HL - 1.5), z = clamp(b.z + Math.sin(a) * r, -F.HW + 1, F.HW - 1);
          if (s * x > off) continue;
          let crowd = 0; for (const q of this.team(t)) if (q !== p && hyp(q.x - x, q.z - z) < 7 * SC) crowd++;
          const sc = Math.min(this.openAt(t, x, z), 7 * SC) * 0.45 / SC + Math.min(this.laneOpen(t, o.x, o.z, x, z), 3 * SC) * 0.5 / SC - crowd * 0.8 - r * 0.05 / SC + s * (x - b.x) * 0.04 / SC;
          if (sc > bs) { bs = sc; best = { x, z }; }
        }
        p.free = best; p.freeT = 0.8 + this.rnd() * 0.6;
      }
      p.job = { kind: 'spot', x: p.free.x, z: p.free.z };
    }
  }
  openAt(t, x, z) { let m = 1e9; for (const r of this.team(this.other(t))) if (r.role !== 'POR') m = Math.min(m, hyp(r.x - x, r.z - z)); return m; }
  aiStep(p, h) {
    if (p.off) return this.offStep(p);
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
    const sep = 3.2 * Math.max(SC, 0.6);
    for (const q of this.team(p.team)) { if (q === p) continue; const dx = p.x - q.x, dz = p.z - q.z, d = hyp(dx, dz); if (d < sep && d > 1e-3) { p.wx += dx / d * (sep - d) * 1.4; p.wz += dz / d * (sep - d) * 1.4; } }
    // robo: cerca del balón del rival, mejor con el balón separado del pie
    const o = this.owner;
    if (o && o.team !== p.team && !o.hands && p.tackleCD <= 0 && (j.kind === 'press' || j.kind === 'cover' || hyp(o.x - p.x, o.z - p.z) < 1.6)) {
      const f = foot(p), d = hyp(B.x - f.x, B.z - f.z), fo = foot(o), exposed = hyp(B.x - fo.x, B.z - fo.z) > 0.26;
      if (d < 1.05) {
        const want = (exposed ? 0.85 : 0.45) * L.press;
        if (this.rnd() < want * h * 6 * (this.human(o) ? 0.55 : 1)) { this.tackle(p, 'robo'); p.tackleCD = 2.0 - L.press * 0.6 + (this.human(o) ? 0.6 : 0); }   // (a tu jugador le entran menos veces)
        else if (hyp(o.x - p.x, o.z - p.z) < 2.2 && this.rnd() < (L.coord ? 0.1 : L.press >= 0.8 ? 0.08 : 0.04) * h && Math.abs(angDiff(o.h, Math.atan2(p.x - o.x, p.z - o.z))) < 1.4) { this.tackle(p, 'slide'); p.tackleCD = 2.5; }
      }
    }
  }
  // el poseedor decide cada 0,2 s: tirar, pasar, regatear o proteger el balón
  carrier(p, h) {
    const L = this.L(p);
    if ((p.think -= h) <= 0) { p.think = 0.2; p.plan = this.decide(p, L); }
    const pl = p.plan; if (!pl) return;
    if (pl.kind === 'shoot') { p.plan = null; return this.aiShoot(p, L); }
    if (pl.kind === 'pass') {
      p.plan = null; this.stats.passes[p.team]++;
      if (pl.cross) return this.crossBall(p, pl.q, 0.35 + this.rnd() * 0.3, 0.4 + L.passErr * 0.6);
      return this.passBall(p, pl.q, pl.loft, L.passErr);
    }
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
      const d = hyp(q.x - p.x, q.z - p.z); if (d < 3 * Math.max(SC, 0.7) || d > 45) continue;
      if (this.isOffside(q)) continue;
      const lane = this.laneOpen(t, B.x, B.z, q.x, q.z), open = this.openness(q) / SC, cross = this.crossZone(p) && (this.inBox(t, q) || this.crossRun(t, q)), loft = cross || (lane < 1.1 && d > 12 * SC);
      const prog = s * (q.x - p.x) / (18 * SC);
      let v = 0.35 + prog * 0.55 + Math.min(open, 6) * 0.07 - (!loft && lane < 1.3 ? (1.3 - lane) * 1.1 : 0) - (d > 25 * SC ? (d - 25 * SC) * 0.035 / SC : 0) - (loft && !cross ? 0.22 : 0);
      if (loft && !cross && open < 3) v -= 0.4;
      if (q.role === 'POR') v -= s * p.x > -14 * SC || pressure > 2 ? 2 : 0.3;
      if (s * q.x > F.HL - 20 * SC && open > 2.5 && (lane > 1.3 || loft)) v += 0.3;
      // centro al área desde la banda
      if (cross) v += 0.2 + (open > 1.5 ? 0.15 : 0);
      if (pressure < 1.6) v += 0.15;
      opts.push({ kind: 'pass', q, v, loft, cross });
    }
    // regate: hacia la portería o hacia el hueco
    const toG = Math.atan2(-B.z * 0.6, gx - B.x);
    let bestD = null;
    for (const da of [0, -0.6, 0.6, -1.2, 1.2]) {
      const a = toG + da, dx = Math.cos(a), dz = Math.sin(a);
      const look = 6 * Math.max(SC, 0.7);
      let space = look; for (const r of this.team(this.other(t))) { const rx = r.x - B.x, rz = r.z - B.z, along = rx * dx + rz * dz, lat = Math.abs(-rx * dz + rz * dx); if (along > -0.5 && along < look && lat < 1.6 + along * 0.25) space = Math.min(space, Math.max(0, along)); }
      const ahead = 4 * Math.max(SC, 0.6), zOut = Math.abs(B.z + dz * ahead) > F.HW - 0.8 || Math.abs(B.x + dx * ahead) > F.HL - 0.5 ? 1 : 0;
      const v = 0.32 + Math.min(space, look) * 0.075 * 6 / look + dx * s * 0.17 - Math.abs(da) * 0.05 - zOut;
      if (!bestD || v > bestD.v) bestD = { kind: 'dribble', dx, dz, v, sprint: space > look * 0.66 && p.energy > 0.4 && this.rnd() < L.sprint };
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
    for (const zc of [-(HW_G - 0.7), HW_G - 0.7, -(HW_G - 1.5), HW_G - 1.5]) {
      // por dónde pasa el tiro a la altura del portero, cuánto tiene que moverse y cuánto le da tiempo
      const kd = clamp(s * (k.x - B.x), 0.2, dx), zk = B.z + (zc - B.z) * kd / dx;
      const need = Math.abs(zk - k.z) - 0.95, tk = kd / (v * 0.92), reach = Math.max(0, tk - Lk.keeperReact - 0.12) * 4.5 * Lk.keeperReach;
      let pr = clamp(0.5 + (need - reach) * 1.6, 0, 1);
      // el ángulo: desde muy escorado la portería «se ve» pequeña y el error manda
      const a1 = Math.atan2(-HW_G - B.z, dx), a2 = Math.atan2(HW_G - B.z, dx);
      pr *= clamp(Math.abs(a2 - a1) / (0.42 * (F.areaD ? 0.62 : 1)), 0, 1) * clamp(1.3 - d0 / (24 * Math.max(SC, 0.55)), 0, 1);
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
    const tz = clamp(info.z + (this.rnd() - 0.5) * L.passErr * 0.7, -HW_G - 0.5, HW_G + 0.5);
    // precisión de un tiro real: de 3 a 6° de error según el nivel, más con un rival encima y cuanto más lejos (antes
    // casi todos iban a medio metro del palo y fuertes: imparables desde la frontal; en los partidos de verdad, de los
    // tiros desde fuera del área la mayoría se van fuera o a las manos del portero)
    const charge = 0.5 + this.rnd() * 0.45, ty = 0.3 + this.rnd() * 1.6, d = hyp(this.goalX(p.team) - this.ball.p.x, this.ball.p.z);
    this.shoot(p, tz, ty, charge, 0.05 + L.passErr * 0.025 + (this.nearestFoe(p) < 1.5 ? 0.03 : 0) + Math.max(0, d - 9 * SC) * 0.003 / SC, (this.rnd() - 0.5) * 40);
  }
}
