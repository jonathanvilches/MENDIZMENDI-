// El partido de fútbol (futbol/game.js), el jugador que llevas tú: moverlo, cambiar de jugador, el portero cuando es
// tuyo, los pases con su receptor y su fuerza, el pase al hueco y el tiro con su punto de mira. Son métodos de
// FutbolGame: game.js los une a su clase (util/mezcla.js), con su this.
import { FIELD as F, PHYS as K, PLAYER as PL } from './rules.js';
import { clamp } from '../util/math.js';
import { rollAhead } from './physics.js';
import { HW_G, SC, hyp, angDiff, fwd, TAP } from './comun.js';

export class FutbolHumano {
  // ---------------------------------------------------------------- el jugador humano
  humanStep(h) {
    const p = this.me, I = this.input;
    if (p.role === 'POR') return this.humanKeeper(p, h);
    if (p.down > 0 || p.slide || p.dive) return;
    let wx = I.x * I.mag, wz = I.z * I.mag;
    // sin tocar el joystick y con un pase hacia él: va solo a por el balón (ayuda al recibir)
    if (I.mag < 0.1 && this.passTo === p && !this.owner) { const q = this.interceptPoint(p); this.seek(p, q.x, q.z, PL.run); p.face = { x: this.ball.p.x, z: this.ball.p.z }; return; }
    const top = I.sprint ? PL.sprint : PL.run;
    p.wx = wx * top; p.wz = wz * top; p.wantSprint = I.sprint && I.mag > 0.5;
    // cargando el tiro con el balón: el joystick mueve la diana (no al jugador), que sigue su carrera hacia donde iba, algo
    // más despacio; con la carga llena y sin soltar, casi parado (para apuntar sin salirse del campo)
    if (this.hold.shoot >= 0 && this.owner === p && !p.hands) {
      const A = this.aim || (this.aim = { tz: null, run: null });
      if (!A.run) { const v = hyp(p.vx, p.vz), f = fwd(p); A.run = v > 0.8 ? { x: p.vx / v, z: p.vz / v, v: Math.min(v, PL.run * 0.85) } : { x: f.x, z: f.z, v: 0 }; }
      const k = this.hold.shoot > PL.charge + 0.25 ? 0.3 : 1;
      p.wx = A.run.x * A.run.v * k; p.wz = A.run.z * A.run.v * k; p.wantSprint = false;
    }
    // recibiendo un pase con el joystick en la mano: la carrera se corrige sola hacia la línea del balón (lo justo
    // para no pasar de largo; la dirección general la sigue marcando el jugador)
    if (this.passTo === p && !this.owner && I.mag >= 0.1) {
      const b = this.ball, B = b.p, bv = hyp(b.v.x, b.v.z);
      if (bv > 1 && hyp(B.x - p.x, B.z - p.z) < 14) {
        // si siguiendo su carrera se encuentra con el balón más adelante (un pase al hueco), sigue corriendo y solo
        // ajusta la dirección; si no, va al punto donde puede cortarlo (si el pase queda por detrás, frena y vuelve)
        const ws = hyp(p.wx, p.wz); let meet = null;
        if (ws > 1) for (let t = 0.1; t <= 3; t += 0.1) { const q = rollAhead(b, t); if (hyp(q.x - (p.x + p.wx * t), q.z - (p.z + p.wz * t)) < 1.6 + t * 0.4) { meet = q; break; } }
        if (meet) { const ex = meet.x - p.x, ez = meet.z - p.z, el = hyp(ex, ez) || 1; p.wx = ex / el * ws; p.wz = ez / el * ws; }
        else {
          const q = this.interceptPoint(p), ex = q.x - p.x, ez = q.z - p.z, el = hyp(ex, ez);
          const sv = el > 0.15 ? Math.min(top, el * 3 + 0.5) / el : 0;
          p.wx += (ex * sv - p.wx) * 0.6; p.wz += (ez * sv - p.wz) * 0.6;
        }
      }
    }
    p.face = I.mag < 0.1 && !this.owner ? { x: this.ball.p.x, z: this.ball.p.z } : null;
    // un centro hacia ti (o un balón por alto con TIRO o PASE pedido): tu jugador va solo a donde lo cabeceará y el
    // joystick apunta el remate (antes, al apuntar, el jugador se iba corriendo hacia ese lado y no llegaba)
    if (!this.owner && (this.cross?.to === p || this.hold.shoot >= 0 || this.hold.pass >= 0 || this.buffer) && !this.ball.grounded) {
      const hp = this.headPoint(p);
      if (hp) { const d = hyp(hp.x - p.x, hp.z - p.z); this.seek(p, hp.x, hp.z, PL.sprint, d / PL.run > hp.t - 0.15); p.face = { x: this.ball.p.x, z: this.ball.p.z }; }
    }
    // presionar (contener): se pone entre el que lleva el balón y su portería, a 1,3 m, de cara al balón, y le sigue
    const o = this.owner;
    p.shielding = false;
    if (I.contain && o && o.team !== p.team && !p.robo && !p.slide) {
      const gx = this.ownGoal(p.team), dx = gx - o.x, dz = -o.z, d = hyp(dx, dz) || 1, k = Math.min(1.3, d * 0.5);
      this.seek(p, o.x + dx / d * k + o.vx * 0.15, o.z + dz / d * k + o.vz * 0.15, I.sprint ? PL.sprint : PL.run, I.sprint);
      p.face = { x: this.ball.p.x, z: this.ball.p.z };
    }
    // proteger el balón: despacio y de espaldas al rival más cercano (cuesta mucho más robárselo)
    if (I.shield && o === p) {
      let r = null, rd = 1e9; for (const q of this.team(this.other(p.team))) { const d = hyp(q.x - p.x, q.z - p.z); if (d < rd) { rd = d; r = q; } }
      const l = hyp(p.wx, p.wz), cap = 2.4; if (l > cap) { p.wx *= cap / l; p.wz *= cap / l; } p.wantSprint = false;
      if (r && rd < 3) { p.face = { x: p.x + (p.x - r.x), z: p.z + (p.z - r.z) }; p.shielding = true; }
    }
    // acción pedida justo antes de que llegue el balón: al primer toque
    if (this.buffer && this.owner === p && !p.hands) { const a = this.buffer; this.buffer = null; this.doAction(p, a); }
    // defendiendo, el más cercano al balón pasa a ser el tuyo
    // cambio automático (como en los juegos de fútbol): con el balón suelto, al que antes llega a él; defendiendo, al más cercano al
    // balón (nunca mientras se presiona, a mitad de un robo o de una entrada)
    const loose = !this.owner && this.passTo !== p;
    if ((this.defending() || loose) && !p.robo && !p.slide && !I.contain && !this.noAuto) {
      const b = this.ball.p; let best = null;
      // el balón encima de un compañero (a menos de 3 m de él) y el tuyo lejos: a ese, ya, aunque se acabe de cambiar
      // (pasado un momento; tras un cambio que eliges tú, algo más). Es cuando más se nota no poder cogerlo
      const dme0 = hyp(p.x - b.x, p.z - b.z);
      if (dme0 > 3.5 * SC && this.switchCD < 0.2) {
        let bd = Math.min(3 * SC, dme0 - 3 * SC);
        for (const q of this.team(p.team)) if (q.role !== 'POR' && q !== p && q.down <= 0) { const d = hyp(q.x - b.x, q.z - b.z); if (d < bd) { bd = d; best = q; } }
      }
      if (!best && this.switchCD <= 0) {
        // mientras mueves a tu jugador, solo cambia si otro llega claramente antes (no te quita el control a cada momento)
        // (al compañero que llegará antes a donde va el balón, aunque estés moviendo al tuyo: solo se le da medio segundo
        // de ventaja, para que no salte de uno a otro)
        const steering = I.mag > 0.2;
        if (loose) {
          let bt = this.interceptPoint(p).t - (steering ? 0.5 : 0.25);
          for (const q of this.team(p.team)) if (q.role !== 'POR' && q !== p && q.down <= 0) { const t = this.interceptPoint(q).t; if (t < bt) { bt = t; best = q; } }
        } else {
          // defendiendo: el más cercano a donde va el balón (dentro de medio segundo), con unos metros de ventaja para el tuyo
          const bv = this.ball.v || { x: 0, z: 0 }, fx = b.x + (bv.x || 0) * 0.5, fz = b.z + (bv.z || 0) * 0.5;
          const dme = hyp(p.x - fx, p.z - fz);
          let bd = steering ? dme - 5 * SC : dme - 2.5 * SC;
          for (const q of this.team(p.team)) if (q.role !== 'POR' && q !== p && q.down <= 0) { const d = hyp(q.x - fx, q.z - fz); if (d < bd) { bd = d; best = q; } }
        }
      }
      if (best) this.setMe(best, 'auto');
    }
  }
  setMe(q, why = 'manual') {
    if (!q || q === this.me || (q.role === 'POR' && why !== 'gk')) return;
    if (this.noSwitch && why !== 'force') return;   // en los retos siempre llevas al mismo
    // (tras un cambio que eliges tú, el automático espera algo más: no te quita al que acabas de coger. Entre cambios
    // automáticos, poco menos de un segundo, para que no salte de uno a otro)
    const old = this.me; old.wx = old.vx; old.wz = old.vz; this.me = q; this.switchCD = why === 'gk' ? 1.6 : why === 'manual' ? 0.9 : why === 'auto' ? 0.8 : 0.6; q.plan = null;
    if (old.role === 'POR') old.threat = null;
    this.emit({ t: 'switch', p: q.id, why });
  }
  // cambiar: con el joystick apuntando, al compañero que está hacia ese lado (el más cercano en esa dirección); sin
  // apuntar, al más cercano al balón. Con el balón cerca de tu área, sin apuntar, coges al portero (y vuelve a un
  // jugador de campo al pulsar otra vez)
  manualSwitch() {
    const b = this.ball.p, me = this.me, I = this.input; if (this.owner === me) return;
    const gk = this.gk(me.team), nearOwn = hyp(b.x - this.ownGoal(me.team), b.z) < 30 * SC && (this.defending() || !this.owner);
    if (me.role !== 'POR' && nearOwn && I.mag < 0.3 && !this.noSwitch) { this.setMe(gk, 'gk'); this.emit({ t: 'gkCtl', on: true }); return; }
    const c = this.team(me.team).filter(q => q.role !== 'POR' && q !== me);
    if (me.role !== 'POR' && I.mag > 0.3 && !this.noSwitch) c.push(gk);   // apuntando hacia tu portero, también lo coges
    let pick = null;
    if (I.mag > 0.3) {
      let bs = -1e9;
      for (const q of c) { const ex = q.x - me.x, ez = q.z - me.z, d = hyp(ex, ez) || 1, cos = (ex * I.x + ez * I.z) / d; if (cos < 0.5) continue; const sc = cos * 2 - d / (25 * SC) - hyp(q.x - b.x, q.z - b.z) / (40 * SC); if (sc > bs) { bs = sc; pick = q; } }
    }
    if (!pick) pick = c.filter(q => q.role !== 'POR').sort((a, q) => hyp(a.x - b.x, a.z - b.z) - hyp(q.x - b.x, q.z - b.z))[0];
    if (pick) { this.setMe(pick, pick.role === 'POR' ? 'gk' : 'manual'); if (pick.role === 'POR') this.emit({ t: 'gkCtl', on: true }); }
  }
  /** ¿Va un tiro del rival hacia tu portería? */
  rivalShot() {
    const t = this.me.team, b = this.ball, s = -this.dir[t];
    return !this.owner && this.shotLive && this.shotLive.team !== t && b.v.x * s > 3;
  }
  // tu portero se estira (o se tira a por el balón) hacia donde apunta el joystick; sin apuntar, hacia el balón
  humanKeeperDive() {
    const k = this.gk(this.me.team); if (k.dive || k.hands || k.down > 0) return;
    const I = this.input, b = this.ball, B = b.p, s = -this.dir[k.team];
    // un tiro entre los palos: eliges tú el lado (y si va arriba) y se lanza en el momento justo, a la altura del balón
    // (antes se tiraba en cuanto pulsabas: en un tiro de lejos ya estaba en el suelo cuando llegaba el balón)
    if (this.rivalShot() && b.v.x * s > 3) {
      const Tg = (s * F.HL - B.x) / b.v.x, zg = B.z + b.v.z * Tg;
      if (Tg > 0.12 && Math.abs(zg) < HW_G + 0.8) {
        k.humanDive = { side: I.mag > 0.3 && Math.abs(I.z) > 0.25 ? Math.sign(I.z) : 0, high: I.mag > 0.3 && I.x * s < -0.5 };
        k.threat = 0; this.emit({ t: 'gkPlan', p: k.id, side: k.humanDive.side }); return;
      }
    }
    let dx, dz;
    if (I.mag > 0.3) { dx = I.x; dz = I.z; }
    else { const T = Math.abs(b.v.x) > 1 ? clamp((k.x - B.x) / b.v.x, 0, 1.2) : 0; dx = B.x + b.v.x * T - k.x; dz = B.z + b.v.z * T - k.z; }
    const l = hyp(dx, dz) || 1; dx /= l; dz /= l;
    // estirada: sobre todo de lado (a lo largo de la línea); hacia delante, un poco (salir a los pies)
    const side = Math.sign(dz) || 1, high = B.y > 1.3 || (I.mag > 0.3 && dx * s < -0.5);
    const L = this.L(k), v = 5.4 * L.keeperReach;
    k.dive = { t: 0.7, vz: dz * v, vx: dx * v * 0.55, hy: high ? 1.8 : 0.6, side };
    k.act = 'dive'; k.actT = 0.9; k.threat = null; this.emit({ t: 'dive', p: k.id, side, high, human: true });
  }
  // tu portero, manejado por ti: se mueve con el joystick sin salir del área y para con las manos lo que le llegue
  humanKeeper(p, h) {
    const I = this.input, b = this.ball.p, gx = this.ownGoal(p.team);
    if (p.dive) return;
    if (p.down > 0) { p.wx = p.wz = 0; return; }
    // el balón se aleja de tu área (o lo tiene tu equipo): vuelves a un jugador de campo
    if (hyp(b.x - gx, b.z) > 55 * SC || (this.owner && this.owner.team === p.team && this.owner !== p)) {
      const c = this.team(p.team).filter(q => q.role !== 'POR').sort((a, q) => hyp(a.x - b.x, a.z - b.z) - hyp(q.x - b.x, q.z - b.z));
      this.emit({ t: 'gkCtl', on: false }); this.setMe(this.owner?.team === p.team && this.owner.role !== 'POR' ? this.owner : c[0], 'force'); return;
    }
    // sin tocar el joystick (o con la estirada ya pedida), se coloca y para solo, como el automático: llevarlo tú nunca
    // es peor que dejarlo (antes se quedaba quieto donde lo cogías y paraba menos de la mitad)
    if (!p.hands && (I.mag < 0.12 || p.humanDive)) { this.keeper(p, h); if (this.buffer && this.owner === p && !p.hands) { const a = this.buffer; this.buffer = null; this.doAction(p, a); } return; }
    const top = I.sprint ? PL.sprint : PL.run;
    p.wx = I.x * I.mag * top; p.wz = I.z * I.mag * top; p.wantSprint = I.sprint && I.mag > 0.5;
    // puede salir del área (fuera solo juega con los pies), pero no meterse dentro de la portería
    const s = -this.dir[p.team], d = s * (gx - p.x);
    if (d < 0.3 && s * p.wx > 0) p.wx = 0;
    p.face = this.owner === p ? null : { x: b.x, z: b.z };
    if (this.buffer && this.owner === p && !p.hands) { const a = this.buffer; this.buffer = null; this.doAction(p, a); }
    if (this.owner !== p) this.keeperTouch(p);
  }
  // sacar con tu portero: con la mano al compañero al que apuntas, o un saque largo hacia donde apuntas
  gkRelease(kind, charge = 0.6) {
    const p = this.gkCtl; if (!p) return;
    const I = this.input, t = p.team, s = this.dir[t];
    let dx = I.mag > 0.25 ? I.x : s, dz = I.mag > 0.25 ? I.z : 0; const l = hyp(dx, dz) || 1; dx /= l; dz /= l;
    p.hands = false; this.ball.held = null; this.owner = null; this.ball.p.y = 0.9; this.gkCtl = null; p.gkWait = null;
    if (kind === 'throw') {
      const q = this.bestReceiver(p, dx, dz, PL.cone * 1.4);
      this.handThrow = true;
      if (q && hyp(q.x - p.x, q.z - p.z) < 34 * SC) { this.passBall(p, q, hyp(q.x - p.x, q.z - p.z) > 18 * SC, 0.2); p.act = 'throw'; this.setMe(q, 'pass'); }
      else { this.passToPoint(p, clamp(p.x + dx * 16 * SC, -F.HL + 1, F.HL - 1), clamp(p.z + dz * 16 * SC, -F.HW + 1, F.HW - 1), false); p.act = 'throw'; }
    } else {
      // saque largo: de 25 a 60 m (en sala, de 12 a 30) según la fuerza, hacia donde apuntas
      const dist = (12 + charge * 18) * (K.dragK ? 1 : 2), tx = clamp(p.x + dx * dist, -F.HL + 3, F.HL - 3), tz = clamp(p.z + dz * dist, -F.HW + 2, F.HW - 2);
      const q = this.bestReceiver(p, dx, dz, PL.cone);
      this.passToPoint(p, tx, tz, true, q && hyp(q.x - tx, q.z - tz) < 14 * SC ? q : null);
    }
    if (this.restart) { this.restart = null; this.setPhase('play'); }
    this.emit({ t: 'gkCtl', on: false });
  }
  // pase del jugador: al compañero mejor situado dentro de un cono de 35° hacia donde apunta el joystick
  humanPass(p, loft, power = null) {
    const I = this.input, f = fwd(p);
    let dx = I.mag > 0.25 ? I.x : f.x, dz = I.mag > 0.25 ? I.z : f.z; const l = hyp(dx, dz) || 1; dx /= l; dz /= l;
    const { q, cross } = this.passPick(p, dx, dz);
    this.stats.passes[p.team]++;
    // desde la banda, cerca del área rival: centro por alto al compañero del área al que apuntas
    if (cross) return this.crossBall(p, q, power ?? 0.5);
    if (power != null) return this.powerPass(p, dx, dz, power, q);
    // pase inteligente: raso; por alto si hay un rival en la línea del pase y el compañero está lejos (o muy lejos)
    if (q) { const B = this.ball.p, d = hyp(q.x - p.x, q.z - p.z); loft ||= (this.laneOpen(p.team, B.x, B.z, q.x, q.z) < 1.1 && d > 12 * SC) || d > 32 * SC; this.passBall(p, q, loft, 0); this.setMe(q, 'pass'); }
    else { const tx = clamp(p.x + dx * 14, -F.HL, F.HL), tz = clamp(p.z + dz * 14, -F.HW, F.HW); this.passToPoint(p, tx, tz, loft); }
  }
  // pase con fuerza (manteniendo PASE): la barra decide hasta dónde va, de 5 a 45 m (en sala, de 2,5 a 22). Va hacia
  // el compañero al que apuntas, a donde llegará corriendo: con poca fuerza se queda corto, con la justa le llega al pie
  // y con más se va por delante de él, al hueco. Con la ayuda, la fuerza se acerca a la justa (pero no del todo). Muy
  // fuerte y lejos, o con un rival en medio, va por alto
  passTarget(p, dx, dz, power, q) {
    const B = this.ball.p, want = (5 + power * 40) * SC;
    let d0 = want;
    if (q) {
      let tx = q.x, tz = q.z;
      for (let k = 0; k < 3; k++) { const d = hyp(tx - B.x, tz - B.z), T = d / (this.groundV(d) * this.firm(p) * 0.78); tx = q.x + q.vx * T; tz = q.z + q.vz * T; }
      d0 = hyp(tx - B.x, tz - B.z) || 1; dx = (tx - B.x) / d0; dz = (tz - B.z) / d0;
    }
    // con un compañero, la dirección va siempre hacia él (precisa) y la fuerza se nota en la distancia y en la
    // velocidad: poca carga, al pie o algo corto (hasta un 30 % menos); mucha, por delante de él al hueco (hasta casi el
    // 16 m por delante, al hueco), y el balón sale más rápido. Con la ayuda, algo más cerca de lo justo
    const d = Math.max(3 * SC, q ? clamp(d0 + (want - d0) * (this.assist ? 0.65 : 0.8), d0 * 0.7, d0 + 16 * SC) : want);
    const tx = clamp(B.x + dx * d, -F.HL + 0.6, F.HL - 0.6), tz = clamp(B.z + dz * d, -F.HW + 0.6, F.HW - 0.6);
    const lane = q ? this.laneOpen(p.team, B.x, B.z, q.x, q.z) : 9;
    const loft = (power > 0.88 && d > 18 * SC) || (lane < 1.1 && d > 14 * SC) || d > 34 * SC;
    return { x: tx, z: tz, d, loft, to: q && hyp(q.x - tx, q.z - tz) < 10 * SC ? q : null };
  }
  // a quién va tu pase hacia (dx, dz): el compañero del cono de 40° (con la ayuda, si no hay nadie, el de 90°). Desde la
  // banda, si ese compañero está en el área (o no hay nadie en el cono y sí en el área hacia donde apuntas), es un centro
  passPick(p, dx, dz) {
    const I = this.input, cone = (this.assist ? PL.cone * 1.3 : PL.cone) * (I.mag > 0.85 ? 0.8 : 1);   // (con el joystick a tope, más exacto)
    const q0 = this.bestReceiver(p, dx, dz, cone);
    if (this.crossZone(p)) { const c = q0 ? (this.inBox(p.team, q0) ? q0 : null) : this.crossReceiver(p, dx, dz); if (c) return { q: c, cross: true }; }
    return { q: q0 || (this.assist ? this.bestReceiver(p, dx, dz, Math.PI / 2) : null), cross: false };
  }
  /** El compañero que recibiría el pase si pasas ahora (el mismo que elige humanPass), o null. */
  aimReceiver() {
    const p = this.me; if (this.owner !== p || p.hands || this.defending() || this.phase !== 'play') return null;
    const I = this.input, f = fwd(p); let dx = I.mag > 0.25 ? I.x : f.x, dz = I.mag > 0.25 ? I.z : f.z; const l = hyp(dx, dz) || 1; dx /= l; dz /= l;
    return this.passPick(p, dx, dz).q;
  }
  // dónde caerá el pase que se está cargando (la marca en el césped)
  passPreview() {
    const p = this.me; if (this.hold.pass < TAP || this.owner !== p || p.hands || this.defending()) return null;
    const I = this.input, f = fwd(p); let dx = I.mag > 0.25 ? I.x : f.x, dz = I.mag > 0.25 ? I.z : f.z; const l = hyp(dx, dz) || 1; dx /= l; dz /= l;
    const { q, cross } = this.passPick(p, dx, dz);
    // (desde la banda, el centro: la marca va a donde caerá, a la cabeza del compañero del área)
    if (cross) { const C = this.crossTarget(p, q, this.charge); return { x: C.x, z: C.z, loft: true, to: q.id }; }
    const T = this.passTarget(p, dx, dz, this.charge, q); return { x: T.x, z: T.z, loft: T.loft, to: T.to?.id ?? null };
  }
  powerPass(p, dx, dz, power, q) {
    const T = this.passTarget(p, dx, dz, power, q), { d, loft, to } = T, tx = T.x, tz = T.z;
    this.passToPoint(p, tx, tz, loft, to, power);
    if (to) this.setMe(to, 'pass');
    this.emit({ t: 'powerPass', p: p.id, power, d: +d.toFixed(1) });
  }
  // pase al hueco: al compañero mejor situado hacia donde apunta el joystick, pero al espacio por delante de él (hacia la
  // portería rival), para que llegue corriendo; el compañero arranca a por él
  humanThrough(p, charge = 0.5) {
    const I = this.input, f = fwd(p), s = this.dir[p.team];
    let dx = I.mag > 0.25 ? I.x : f.x, dz = I.mag > 0.25 ? I.z : f.z; const l = hyp(dx, dz) || 1; dx /= l; dz /= l;
    const q = this.bestReceiver(p, dx, dz, this.assist ? PL.cone * 1.2 : PL.cone, true);
    this.stats.passes[p.team]++;
    if (!q) { const tx = clamp(p.x + dx * 16 * SC, -F.HL + 1, F.HL - 1), tz = clamp(p.z + dz * 16 * SC, -F.HW + 1, F.HW - 1); return this.passToPoint(p, tx, tz, false); }
    // hacia dónde corre: hacia la portería rival, un poco hacia el centro
    let rx = s, rz = -q.z * 0.02 + (I.mag > 0.25 ? dz * 0.4 : 0); const rl = hyp(rx, rz) || 1; rx /= rl; rz /= rl;
    // a dónde llegará corriendo cuando llegue el balón: el tiempo del balón según la distancia y la carrera del
    // compañero (antes iba a un punto fijo unos metros por delante y, esprintando, el delantero lo pasaba de largo)
    const B = this.ball.p, run = Math.max(hyp(q.vx, q.vz), PL.run * 0.85);
    let lead = (3 + charge * 10 + Math.min(4, hyp(q.x - p.x, q.z - p.z) * 0.12)) * SC;   // (más carga, más por delante)
    for (let k = 0; k < 3; k++) {
      const ax = q.x + rx * lead, az = q.z + rz * lead, d = hyp(ax - B.x, az - B.z), v = this.groundV(d) * this.firm(p), T = d / (v * 0.78);
      lead = Math.max((3 + charge * 9) * SC, run * T * (0.7 + charge * 0.7));
    }
    const tx = clamp(q.x + rx * lead, -F.HL + 1.2, F.HL - 1.2), tz = clamp(q.z + rz * lead, -F.HW + 1, F.HW - 1);
    this.passToPoint(p, tx, tz, false, q); q.react = 0;
    // el pase al hueco pilla a la defensa a contrapié: tardan su tiempo de reacción en ir a por él
    for (const r of this.team(this.other(p.team))) if (r.role !== 'POR') r.react = Math.max(r.react, this.L(r).react * 1.1);
    this.setMe(q, 'pass');
    this.emit({ t: 'through', p: p.id, q: q.id });
  }
  bestReceiver(p, dx, dz, cone, forward = false) {
    let best = null, bs = -1e9;
    for (const q of this.team(p.team)) {
      if (q === p || q.down > 0) continue;
      const ex = q.x - p.x, ez = q.z - p.z, d = hyp(ex, ez); if (d < 1.5 || d > 50) continue;
      const a = Math.acos(clamp((ex * dx + ez * dz) / d, -1, 1)); if (a > cone) continue;
      const lane = this.laneOpen(p.team, p.x, p.z, q.x, q.z);
      const s = 1 - a / cone * 1.35 - Math.abs(d - 14 * SC) / (48 * SC) + Math.min(lane, 2.5) * 0.25 - (q.role === 'POR' ? 0.5 : 0) - (this.isOffside(q) ? 0.6 : 0) + (forward ? this.dir[p.team] * (q.x - p.x) / (20 * SC) : 0);
      if (s > bs) { bs = s; best = q; }
    }
    return best;
  }
  // tiro del jugador: hacia donde apunta el joystick; con la asistencia, a la portería
  // a dónde va el tiro: hacia donde apunta el joystick (cortado con la línea de gol), a la altura que da la fuerza. La
  // misma cuenta la usa la diana que se ve en la portería mientras se carga
  shotAim(p, charge) {
    const s = this.dir[p.team], gx = s * F.HL;
    let tz = this.aim?.tz ?? this.aimTarget(p) ?? this.aimDefault(p);
    if (this.assist) tz = clamp(tz, -HW_G + 0.3, HW_G - 0.3);
    // altura: de raso a casi la escuadra según la fuerza (la portería de sala mide 2 m: a tope iba por encima del larguero)
    return { gx, tz, ty: 0.25 + charge * (F.goalH - 0.55) };
  }
  // la diana (mientras se mantiene TIRO): el joystick la lleva de palo a palo según cuánto lo inclinas hacia un lado de
  // la portería (antes contaba el ángulo de la carrera: un toque mínimo ya iba al palo y apuntar era correr hacia
  // allí). Con el joystick a medias, a medio camino; soltándolo, la diana se queda donde estaba
  aimTarget(p) {
    const I = this.input; if (I.mag <= 0.25) return null;
    const s = this.dir[p.team], gx = s * F.HL, b = this.ball.p, dl = hyp(gx - b.x, b.z) || 1, ux = b.z / dl * s, uz = (gx - b.x) / dl * s;
    const lat = (I.x * ux + I.z * uz) * Math.min(1, I.mag / 0.85);
    return clamp(lat / 0.87, -1, 1) * (HW_G - 0.25);
  }
  // sin apuntar: al palo que tiene más lejos el portero
  aimDefault(p) { const keeper = this.gk(this.other(p.team)), b = this.ball.p; return (keeper.z > b.z * 0.2 ? -1 : 1) * (HW_G - 0.35); }
  // la diana se desliza hacia donde apunta el joystick (en unos 80 ms): se puede afinar sin que dé saltos
  aimStep(h) {
    const p = this.me, A = this.aim || (this.aim = { tz: null, run: null }), t = this.aimTarget(p);
    if (A.tz == null) A.tz = t ?? this.aimDefault(p);
    else if (t != null) A.tz += (t - A.tz) * Math.min(1, h * 12);
  }
  shotPreview() {
    const p = this.me; if (this.hold.shoot < 0 || p.hands || this.mode === 'penalties' || p.role === 'POR') return null;
    // (también con un centro por alto que te llega: a donde irá el remate de cabeza)
    const head = !this.owner && this.cross?.to === p && this.time - this.cross.t < this.cross.T + 0.6;
    if (this.owner !== p && !head) return null;
    const A = this.shotAim(p, this.charge); return { x: A.gx, y: head ? 0.5 : A.ty, z: A.tz };
  }
  humanShot(p, charge, finesse = false) {
    const I = this.input, b = this.ball.p, A = this.shotAim(p, charge), gx = A.gx;
    let tz = A.tz;
    const ax = I.mag > 0.25 ? I.x : fwd(p).x, s = this.dir[p.team];
    this.aim = null;
    // precisión: carga, postura (mirando hacia otro lado), presión de un rival encima y carrera (parado o al trote,
    // más fino que a la carrera)
    const toG = Math.atan2(gx - b.x, tz - b.z), pose = Math.abs(angDiff(p.h, toG)) > 1.1 ? 0.05 : 0;
    const press = this.nearestFoe(p) < 1.4 ? 0.05 : 0, run = clamp((hyp(p.vx, p.vz) - 2) / (PL.sprint - 2), 0, 1) * 0.012;
    const err = 0.008 + charge * charge * 0.03 + pose + press + run + (this.assist ? 0 : 0.02);
    const ty = A.ty;
    if (finesse) {
      // tiro colocado: al palo largo, con rosca hacia dentro, menos fuerte y más preciso
      const far = -Math.sign(b.z || (this.rnd() - 0.5)) * (HW_G - 0.4);
      const tzF = I.mag > 0.25 && ax * s > 0.12 ? clamp(tz, -HW_G + 0.35, HW_G - 0.35) : far;
      const spin = -Math.sign(tzF - b.z) * s * 45;
      return this.shoot(p, tzF - Math.sign(tzF) * 0.6, 0.5 + charge * 1.1, Math.min(0.62, 0.3 + charge * 0.4), err * 0.55, spin);
    }
    // (sin efecto: el joystick ya no curva el balón, lo apunta; va recto a la diana)
    this.shoot(p, tz, ty, charge, err, 0);
  }
  nearestFoe(p) { let m = 1e9; for (const q of this.team(this.other(p.team))) m = Math.min(m, hyp(q.x - p.x, q.z - p.z)); return m; }
}
