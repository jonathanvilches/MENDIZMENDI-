// Lógica del partido de pelota a mano (sin gráficos): saque, peloteo, árbitro, tanteo y rival.
// La vista (match.js) le pasa la entrada del jugador y recibe eventos para dibujar, sonar y rotular.
import { COURT, LEVELS, SHOTS, kantari } from './rules.js';
import { Ball, predict, solveShot, solveTwoWalls, aimVelocity, vec } from './physics.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const gauss = (rnd) => (rnd() + rnd() + rnd() - 1.5) / 1.5;
// el saque, como en el frontón: el que saca sale del cuadro 7, corre hasta poco antes del 4, bota la pelota y saca; el
// que resta espera junto a la pared izquierda, sobre el 7
const SERVE_FROM = COURT.CUADRO * 7, SERVE_Z = COURT.FALTA + 0.75, SERVE_X = 0.6, RUN_V = 5.8;
const RECV_X = -COURT.W / 2 + 1.3, RECV_Z = COURT.CUADRO * 7;
// por parejas: el delantero coge lo de delante (hasta el cuadro 5) y el zaguero lo de atrás; tu compañero juega como un
// pelotari del nivel normal
const SPLIT = 17.5, MATE_AI = { speed: 5.5, react: 0.25, error: 0.065, smart: 0.6, dash: 1.05 };
// energía (de 0 a 1): cada golpe cansa (más si es fuerte y menos a quien tiene fuerza) y correr a tope también un poco;
// durante el tanto apenas se recupera y entre tanto y tanto, mucho. Por debajo de la mitad se nota: golpes peores, más
// fallos y algo menos de carrera (en un peloteo largo, el que más golpea acaba cansado)
const EN = { hit: 0.045, pow: 0.045, rally: 0.004, run: 0.004, rest: 0.1, low: 0.5 };

// altura a la que pega en el frontis la cortada y la dejada según la fuerza (0 a 1, la carga del botón) y el joystick
// arriba o abajo (−1 a 1). También la usa la marca de puntería que se ve en el frontis mientras se carga
const pow01 = (pow) => clamp((pow - 0.15) / 0.85, 0, 1);
// (la cortada va rápida y tensa, pero sin rozar la chapa: de 1,35 m poco cargada a unos 3 m a tope)
export function cutHeight(pow, ay = 0) { return clamp(COURT.CHAPA + 0.45 + Math.pow(pow01(pow), 1.1) * (COURT.FRONT_H * 0.3 - COURT.CHAPA - 0.45) + ay * 0.35, COURT.CHAPA + 0.35, COURT.FRONT_H * 0.34); }
// el joystick a un lado se exagera: medio lado ya va casi a la pared y del todo, pegada a ella o a dos paredes
export const aimSide = (x) => Math.sign(x) * Math.min(1, Math.pow(Math.abs(x), 0.6) * 1.12);
export function dropHeight(pow, ay = 0) { return clamp(COURT.CHAPA + 0.12 + pow01(pow) * 1.0 + ay * 0.25, COURT.CHAPA + 0.06, 2.3); }
// ¿pasa la pelota por encima de la pared izquierda (o la roza muy alta) antes de botar?
function overLeft(p, v) {
  const b = new Ball(); b.set({ ...p }, { ...v }); const out = [];
  for (let t = 0; t < 3; t += 1 / 120) { out.length = 0; b.step(1 / 120, out); for (const e of out) { if (e.type === 'left' && (e.over || e.y > COURT.LEFT_H - 0.7)) return true; if (e.type === 'floor') return false; } }
  return false;
}
export class PelotaGame {
  /**
   * @param {object} o { mode: 'match'|'rally', target, level: 'facil'|'normal'|'dificil', autoplay, seed,
   *   pairs (partido por parejas), youRole ('delantero'|'zaguero'), youStats, rivalStats, youMateStats, rivalMateStats }
   */
  constructor(o = {}) {
    this.mode = o.mode || 'match';
    this.target = o.target || (this.mode === 'rally' ? 6 : 7);
    this.lvl = LEVELS[o.level] || LEVELS.normal;
    // cualidades (de 1 a 5): tú, un pelotari de los del medio; el rival, las suyas (fuerza, agilidad y velocidad)
    const Q = (s) => ({ fuerza: s?.fuerza ?? 3, agilidad: s?.agilidad ?? 3, velocidad: s?.velocidad ?? 3, style: s?.style || null });
    this.qual = { you: Q(o.youStats), rival: Q(o.rivalStats), youMate: Q(o.youMateStats), rivalMate: Q(o.rivalMateStats) };
    // por parejas: cada lado con un delantero y un zaguero (tú eliges qué juegas; tu compañero, lo otro). El rival del
    // pueblo juega de delantero y saca
    this.pairs = !!o.pairs && this.mode === 'match';
    const yr = o.youRole === 'zaguero' ? 'zaguero' : 'delantero';
    this.role = this.pairs ? { you: yr, youMate: yr === 'delantero' ? 'zaguero' : 'delantero', rival: 'delantero', rivalMate: 'zaguero' } : {};
    this.clock = 0;
    this.tempo = this.lvl.tempo;
    this.autoplay = !!o.autoplay;
    let s = o.seed || (Math.random() * 1e9) | 0;
    this.rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    this.ball = new Ball();
    this.score = { you: 0, rival: 0 };
    this.streak = 0; this.best = 0;
    this.players = {
      you: { id: 'you', x: 1, z: RECV_Z, vx: 0, vz: 0, swing: 0, cool: 0, act: 'idle', actT: 0, face: 0, en: 1 },
      rival: { id: 'rival', x: -1, z: SERVE_Z, vx: 0, vz: 0, swing: 0, cool: 0, act: 'idle', actT: 0, face: 0, react: 0, en: 1 },
    };
    if (this.pairs) for (const id of ['youMate', 'rivalMate']) this.players[id] = { id, x: 0, z: 20, vx: 0, vz: 0, swing: 0, cool: 0, act: 'idle', actT: 0, face: 0, react: 0, en: 1 };
    this.ids = Object.keys(this.players);
    this.server = this.mode === 'rally' ? 'rival' : (o.firstServe || 'you');
    this.phase = 'intro'; this.phaseT = 0;
    this.events = [];
    this.pred = null; this.predT = 0;
    this.stats = { hits: { you: 0, rival: 0 }, rallies: 0, longest: 0, rallyHits: 0, faults: {} };
    this.placeForServe();
  }
  emit(e) { this.events.push(e); }
  other(w) { return w === 'you' ? 'rival' : 'you'; }
  // lado de cada pelotari ('you' o 'rival') y los pelotaris de un lado
  side(id) { return id === 'you' || id === 'youMate' ? 'you' : 'rival'; }
  team(sd) { return this.pairs ? [sd, sd + 'Mate'] : [sd]; }
  // quién saca: en el mano a mano, el del lado que saca; por parejas, su delantero
  serverP() { return this.pairs ? this.team(this.server).find(id => this.role[id] === 'delantero') : this.server; }
  // cansancio: 0 con media energía o más; 1, sin energía
  tired(id) { const p = this.players[id]; return p ? clamp((EN.low - p.en) / EN.low, 0, 1) : 0; }

  // ---------------------------------------------------------------- saque
  placeForServe() {
    const s = this.players[this.serverP()];
    if (this.pairs) {
      // el delantero que saca, en el 7 (de ahí sale corriendo); su zaguero, atrás a la derecha; los que restan: el
      // zaguero junto a la pared en el 7 y el delantero delante, cerca de la pared (fuera de la carrera del que saca)
      const S = this.server;
      for (const id of this.ids) {
        const p = this.players[id], del = this.role[id] === 'delantero';
        if (this.side(id) === S) { p.x = del ? SERVE_X : 3; p.z = del ? SERVE_FROM : 27; }
        else { p.x = del ? -2.6 : RECV_X; p.z = del ? 12.5 : RECV_Z; }
      }
    } else {
      const r = this.players[this.other(this.server)];
      s.x = SERVE_X; s.z = SERVE_FROM;
      r.x = RECV_X; r.z = RECV_Z;
    }
    for (const id of this.ids) { const p = this.players[id]; p.vx = p.vz = 0; p.swing = 0; p.act = 'idle'; }
    this.ball.set(vec(s.x + 0.35, 1.05, s.z - 0.35), vec()); this.ball.spin = 0;
    this.rally = null; this.serveTries = 0; this.runUp = false;
  }
  start() { if (this.phase === 'intro') this.toServe(); }
  toServe() {
    this.phase = 'serveWait'; this.phaseT = 0; this.placeForServe();
    this.emit({ type: 'serveReady', who: this.server, matchPoint: this.mode === 'match' && Math.max(this.score.you, this.score.rival) === this.target - 1 });
  }
  dropForServe() {
    const s = this.players[this.serverP()];
    this.phase = 'servePrep'; this.phaseT = 0;
    this.ball.set(vec(s.x + 0.35, 1.05, s.z - 0.4), vec(0, 0.6, 0)); this.ball.spin = 0;
    this.prepBounces = 0;
    s.act = 'bounce'; s.actT = 0;
    this.emit({ type: 'drop', who: this.serverP() });
  }

  // ---------------------------------------------------------------- golpeo
  // ¿Puede «who» golpear ahora? (le toca, la pelota ya dio en el frontis, no ha botado dos veces, está a su alcance)
  hittable(who) {
    const b = this.ball.p, pl = this.players[who];
    const reach = who === 'you' && !this.autoplay ? this.lvl.reach : 1.25;
    if (this.phase === 'servePrep') {
      if (who !== this.serverP() || this.prepBounces < 1) return false;
    } else if (this.phase === 'rally') {
      const R = this.rally;
      if (R.turn !== this.side(who) || !R.front || R.bounces > 1) return false;
      if (R.serve && R.bounces < 1) return false;           // el saque no se puede devolver de aire
    } else return false;
    const d = Math.hypot(b.x - pl.x, b.z - pl.z);
    return d < reach && b.y > 0.1 && b.y < 2.2;   // (una dejada bota muy baja: se recoge casi a ras de suelo)
  }
  quality(who, swingElapsed) {
    const b = this.ball.p, pl = this.players[who];
    const reach = who === 'you' && !this.autoplay ? this.lvl.reach : 1.25;
    const qh = 1 - clamp(Math.abs(b.y - 0.85) - 0.35, 0, 1.1) / 1.1;
    const qd = 1 - clamp(Math.hypot(b.x - pl.x, b.z - pl.z) - 0.45, 0, reach) / reach;
    const qt = 1 - clamp(Math.abs(swingElapsed - 0.06) / 0.34, 0, 1);
    // (de diestro, lo pegado a la pared izquierda cuesta: el golpe sale peor cuanto más ajustada viene)
    const wall = clamp((1.0 - (b.x + COURT.W / 2)) / 0.7, 0, 1) * (0.2 - this.qual[who].agilidad * 0.025);
    return clamp(0.42 * qh + 0.36 * qd + 0.22 * qt + (who === 'you' && !this.autoplay ? this.lvl.assist * 0.08 : 0) - wall - this.tired(who) * 0.25, 0, 1);   // (cansado, peor)
  }
  // Elige el golpe: aim = {x, y} de −1 a 1 (x: izquierda/derecha, y: arriba = largo, abajo = dejada); req: golpe pedido
  // con su botón ('dejada' o 'cortada'; true es la dejada, como antes); pow: fuerza de 0 a 1 (cuanto más se mantiene
  // pulsado el golpe, más fuerte: más rápido y más largo; a tope cuesta más afinar)
  // at: desde dónde (para la vista previa: el sitio donde se va a golpear); dry: solo calcula el golpe, sin azar y sin
  // tocar la pelota (la marca de puntería de la cancha)
  strike(who, q, aim = { x: 0, y: 0 }, req = false, pow = 0.5, dry = false, at = null) {
    const b = this.ball, p = { ...(at || b.p) }, rnd = dry ? () => 0.5 : this.rnd, serve = this.phase === 'servePrep';
    let shot = 'normal', sub = '', v;
    pow = clamp(pow, 0, 1);
    const rawX = aim.x || 0; if (!serve) aim = { x: aimSide(rawX), y: aim.y || 0 };
    // (a tope cuesta más afinar; menos a quien tiene fuerza, más a quien no)
    const err = (1 - q) + Math.max(0, pow - 0.85) * 0.3 * (1.6 - this.qual[who].fuerza * 0.2), forceDrop = req === true || req === 'dejada';
    if (serve) {
      const tx = clamp(aim.x * 2.5 + gauss(rnd) * err * 1.2, -3.5, 3.5);
      const landZ = 18.3 + pow * 2 + gauss(rnd) * err * 7.5;
      v = solveShot(p, tx, landZ, 17 + q * 3 + pow * 6).v; shot = 'saque';
    } else if (forceDrop) {
      // dejada: la fuerza dice a qué altura pega: suave, justo encima de la chapa (muere enseguida); cargada, más
      // arriba (hasta unos 2 m) y bota algo más lejos
      shot = 'dejada';
      const tx = clamp(p.x * 0.4 + aim.x * 2.2 + gauss(rnd) * err * 1.2, -4.2, 4);
      const ty = dropHeight(pow, aim.y) + err * 0.6 + gauss(rnd) * err * 0.45;
      v = aimVelocity(p, tx, ty, p.z / (12 + q * 3 + pow * 4));
    } else if (req === 'cortada') {
      // cortada: fuerte y raso, muy ajustada a la chapa: vuelve baja y rápida, botando pronto y corriendo. Cuanto peor
      // el golpe, más se arriesga: uno flojo puede dar en la chapa
      // la fuerza dice a qué altura pega en el frontis: poco cargada, justo por encima de la chapa (rasa y peligrosa);
      // cargada del todo, a media altura del frontis (más segura y vuelve más larga). El joystick arriba o abajo
      // afina medio metro
      shot = 'cortada';
      const speed = 27 + q * 5 + pow * 12;
      const tx = clamp(aim.x * 3.4 + gauss(rnd) * err * 1.1, -4.7, 4.6);   // (más a la izquierda, hasta casi la esquina)
      const ty = cutHeight(pow, aim.y) + gauss(rnd) * err * 0.3;
      // a dos paredes: con el joystick bien a la izquierda, pega primero en la pared izquierda y después bajo en el
      // frontis, y sale cruzada hacia la derecha, rasa y rápida (como la dos paredes del golpe, pero cortada)
      // (desde media izquierda ya va a dos paredes: con la cortada no hay golpe «a la pared» con el que confundirla, y antes
      // había que llevar el joystick casi al tope y costaba controlarla. Cuanto más a la izquierda, antes toca la pared y
      // más cruzada sale; arriba, más larga; abajo, más corta)
      if (rawX < -0.45 && !serve) {
        // (cuanto más a la izquierda, antes toca la pared, más cerca del frontis, y más cruzada sale hacia la derecha: con
        // el joystick del todo a la izquierda, bota ya junto a la contracancha)
        const ang = clamp((-rawX - 0.45) / 0.5, 0, 1), fz = clamp(0.78 - ang * 0.36 + gauss(rnd) * err * 0.05, 0.3, 0.85);
        const r = solveTwoWalls(p, speed, clamp(9 + pow * 5 + aim.y * 2.5, 6.5, 16), [fz, fz - 0.06, fz + 0.06, fz + 0.12], { low: 2, maxFront: ty + 1.4, cross: 1 + ang * 5 });
        if (r) { v = r.v; sub = 'cortDos'; }
      }
      if (!v) v = aimVelocity(p, tx, ty, Math.max(0.2, p.z / speed));
    } else {
      // el joystick manda: de lado (x) dónde cae a lo ancho y de arriba abajo (y) lo largo; el error solo depende de lo
      // bien que se golpee (antes cada golpe tenía mucho azar y no se notaba hacia dónde se apuntaba)
      // la fuerza se nota: flojo, lento y corto (bota hacia el cuadro 4); a tope, rápido y largo (hacia el 7)
      const S = this.qual[who].fuerza;   // (la fuerza del pelotari: de 1 a 5)
      let tx, landZ, speed = 17 + q * 4 + pow * 15 + (S - 3) * 1.5;   // (golpe tenso: da en el frontis a 3–5 m, no en globo)
      // dos paredes: joystick en diagonal abajo-izquierda: pared izquierda, frontis y sale cruzada. El ángulo dice dónde
      // pega en la pared (cuanto más a la izquierda, antes la toca y más cruzada sale) y la fuerza, lo larga
      // (antes había que ir a la diagonal exacta abajo-izquierda y casi nunca salía: ahora basta con el joystick bien a la
      // izquierda sin subirlo; arriba-izquierda es la que va pegada a la pared, larga)
      // (a dos paredes con el joystick casi del todo a la izquierda; a medias, pegada a la pared)
      if (rawX < -0.72 && aim.y < 0.3) {
        const ang = clamp((-rawX - 0.72) / 0.22 + Math.max(0, -aim.y) * 0.3, 0, 1), lz = clamp(11.5 + pow * 8 + aim.y * 1.5 + gauss(rnd) * err * 2, 10, 22);
        const fz = clamp(0.62 - ang * 0.45 + gauss(rnd) * err * 0.07, 0.15, 0.8);
        const r = solveTwoWalls(p, speed + 1, lz, [fz, fz - 0.06, fz + 0.06]);   // (más fuerza, más rápida y más larga)
        if (r) {
          shot = 'dosparedes'; v = r.v;
          sub = pow > 0.8 && aim.y < -0.6 ? 'dpPegada' : lz < 12 || pow < 0.3 ? 'dpCorta' : ang < 0.4 ? 'dpCruzada' : lz > 16 ? 'dpLarga' : '';
          if (sub === 'dpPegada') v.y = Math.min(v.y, v.y * 0.85);
        }
      }
      if (!v) {
        // el joystick manda de verdad: a la izquierda va a la izquierda (pegada a la pared del todo) y a la derecha, a
        // la derecha (al ancho del todo), en proporción a lo que se inclina; arriba larga y abajo corta. Se apunta al
        // bote y se corrige el punto del frontis hasta que cae ahí; el error solo depende de lo bien que se golpee
        const depth = clamp(12 + aim.y * 5 + pow * 9, 9, 25);
        let lx = aim.x * (aim.x < 0 ? 4.1 : 4.4);   // (a la izquierda, del todo, a medio metro de la pared: si no, la roza alta)
        // a tope y largo, un pelotari con fuerza la manda al fondo: bota en el último cuadro y llega al rebote (la pared de
        // atrás), que la devuelve; uno flojo no llega
        const rebote = pow > 0.88 && aim.y > 0.3 && q > 0.5 && S >= 2;
        if (rebote) { shot = 'rebote'; landZ = clamp(28.8 + (S - 3) * 0.9 + (pow - 0.88) * 6, 26.5, 30.8); speed += 5 + (S - 3) * 2; }
        else if (aim.y > 0.6) { shot = 'largo'; landZ = Math.max(depth, 19 + pow * 4); speed += 1.5; }
        else landZ = depth;
        if (aim.x < -0.6) shot = 'pared'; else if (aim.x > 0.6) { shot = 'ancho'; landZ -= 1; }
        lx = clamp(lx + gauss(rnd) * err * 1.2, -4.75, 5.6);   // (un golpe malo al ancho puede irse fuera)
        landZ += gauss(rnd) * err * 2.5;
        // alcance de un golpe: un pelotari con mucha fuerza, desde el cuadro 4, la manda de vuelta hasta el cuadro 7;
        // desde más atrás llega algo más lejos (le da más alto en el frontis) y un golpe flojo se queda antes
        if (!rebote) landZ = Math.min(landZ, 15.5 + q * 2 + pow * 8 + clamp(p.z - COURT.FALTA, -4, 8) * 0.18 + (S - 3) * 1.3, COURT.L - 2.5);
        tx = lx * 0.55;
        // se corrige el punto del frontis hasta que el bote cae donde se apunta, quedándose con el mejor (si se apunta muy
        // a la izquierda, una pelota larga puede tocar la pared y volver: más a la izquierda ya no es mejor)
        // (corrección por secante: en los golpes muy largos, mover un poco el punto del frontis mueve mucho el bote y con
        // un paso fijo se pasaba de un lado a otro; cada intento aprende cuánto se mueve)
        let bestD = Infinity, ptx = null, pdx = null, tx0 = tx;
        for (let it = 0; it < 7; it++) {
          const r = solveShot(p, tx, landZ, speed);
          if (!r.land) { v ||= r.v; break; }
          const dx = r.land.x - lx;
          if (Math.abs(dx) < bestD) { bestD = Math.abs(dx); v = r.v; tx0 = tx; }
          if (Math.abs(dx) < 0.12) break;
          const gain = ptx != null && Math.abs(tx - ptx) > 1e-3 ? clamp((dx - pdx) / (tx - ptx), 0.6, 5) : 1 + (landZ / Math.max(4, p.z)) * 0.9;
          ptx = tx; pdx = dx;
          tx = clamp(tx - dx / gain, -4.7, COURT.W / 2 - 0.15);
        }
        tx = tx0;
        // pegada a la izquierda y larga, la pelota puede pasar por encima de la pared izquierda (fuera): se tensa el golpe
        // (más rápido y más bajo en el frontis) hasta que va por debajo de la chapa de arriba con margen
        for (let k = 0; k < 5 && v && overLeft(p, v); k++) { speed += 3; const r = solveShot(p, tx, landZ, speed); if (r?.v) v = r.v; }
      } else if (err > 0.2) { const k = 1 + gauss(rnd) * err * 0.06; v.x *= k; v.y *= 1 + gauss(rnd) * err * 0.05; v.z *= k; }   // a dos paredes, un golpe flojo se desvía un poco
    }
    if (dry) return { p, v, shot, sub, spin: shot === 'cortada' ? 1 : 0 };
    // golpe muy malo: a veces a la chapa o demasiado alto
    if (!serve && q < 0.3 && rnd() < 0.45) {
      const T = p.z / 18;
      v = rnd() < 0.6 ? aimVelocity(p, p.x * 0.5, COURT.CHAPA * (0.3 + rnd() * 0.5), T) : aimVelocity(p, p.x + gauss(rnd) * 3, COURT.FRONT_TOP + 0.6 + rnd(), T);
    }
    b.set(p, v); b.spin = shot === 'cortada' ? 1 : 0;
    const pl = this.players[who], sd = this.side(who); pl.act = 'hit'; pl.actT = 0; pl.swing = 0; pl.cool = 0.3;
    pl.en = Math.max(0, pl.en - (EN.hit + EN.pow * pow) * (1.15 - this.qual[who].fuerza * 0.05));   // (cada golpe cansa)
    this.rally = { striker: sd, by: who, turn: this.other(sd), front: false, bounces: 0, serve, hits: (this.rally?.hits || 0) + 1 };
    this.phase = 'rally'; this.phaseT = 0; this.pred = null;
    this.stats.hits[sd]++;
    const label = q > 0.85 ? 'perfect' : q > 0.6 ? 'good' : q > 0.35 ? 'ok' : 'late';
    this.emit({ type: 'hit', who, side: sd, q, label, shot, sub, pow, x: p.x, y: p.y, z: p.z, en: pl.en });
  }

  // ---------------------------------------------------------------- árbitro
  point(winner, call) {
    if (this.phase === 'point' || this.phase === 'end') return;
    const R = this.rally;
    this.stats.rallies++; this.stats.longest = Math.max(this.stats.longest, R?.hits || 0);
    this.stats.faults[call] = (this.stats.faults[call] || 0) + 1;
    this.phase = 'point'; this.phaseT = 0;
    if (this.mode === 'rally') {
      if (winner === 'rival' || call === 'bote' && R?.turn === 'you') { this.best = Math.max(this.best, this.streak); this.streak = 0; }
      this.emit({ type: 'call', call, winner, streak: this.streak });
      this.server = 'rival';
      return;
    }
    this.score[winner]++;
    this.server = winner;
    // el último tanto: el partido se decide y el frontón entero aplaude (se deja más tiempo antes del final)
    this.finalPoint = this.score[winner] >= this.target;
    this.emit({ type: 'call', call, winner, score: { ...this.score }, kantari: kantari(this.score.rival, this.score.you), final: this.finalPoint });
    for (const id of this.team(winner)) { const P = this.players[id]; P.act = 'cheer'; P.actT = 0; }
    for (const id of this.team(this.other(winner))) { const L = this.players[id]; L.act = 'sad'; L.actT = 0; }
  }
  onBallEvent(e) {
    const R = this.rally; if (!R || this.phase !== 'rally') return;
    if (e.type !== 'floor' || R.bounces < 1) { R.taker = null; this.predT = 0; }   // (el camino cambia: por parejas, se vuelve a ver quién la coge)
    const striker = R.striker, receiver = R.turn;
    if (e.type === 'front') {
      if (R.front) return;                                    // ya había dado
      if (e.y < COURT.CHAPA) { this.emit({ type: 'front', ...e, chapa: true }); return this.point(receiver, 'chapa'); }
      if (e.y > COURT.FRONT_TOP) { this.emit({ type: 'front', ...e }); return this.point(receiver, 'alta'); }
      if (e.x > COURT.W / 2) { this.emit({ type: 'front', ...e }); return this.point(receiver, 'lado'); }   // fuera de la raya lateral del frontis
      R.front = true; R.bounces = 0;
      this.emit({ type: 'front', ...e });
      if (this.mode === 'rally' && striker === 'you') { this.streak++; this.best = Math.max(this.best, this.streak); this.emit({ type: 'streak', n: this.streak }); if (this.streak >= this.target) this.finish(); }
    } else if (e.type === 'left') {
      this.emit({ type: 'wall', ...e });
      // en la pared izquierda, por encima de su raya roja (o por encima de la pared) es mala, antes o después del frontis
      if (e.y > COURT.LEFT_LINE) return this.point(receiver, 'pared');
    } else if (e.type === 'back') {
      // en el rebote sin haber botado: larga (fuera); tras un bote, vuelve y se sigue jugando
      if (!R.front || R.bounces < 1) { this.emit({ type: 'back', ...e }); return this.point(receiver, 'largo'); }
      this.emit({ type: 'back', ...e, live: true });
    } else if (e.type === 'floor') {
      this.emit({ type: 'floor', ...e });
      if (!R.front) return this.point(receiver, 'corta');
      R.bounces++;
      if (R.bounces === 1) {
        if (e.x > COURT.W / 2) return this.point(receiver, 'fuera');
        if (e.z > COURT.L) return this.point(receiver, 'largo');
        if (R.serve && e.z < COURT.FALTA) return this.point(receiver, 'falta');
        if (R.serve && e.z > COURT.PASA) return this.point(receiver, 'pasa');
      } else if (R.bounces >= 2) return this.point(striker, 'bote');
    }
  }
  finish() {
    this.phase = 'end'; this.phaseT = 0;
    const win = this.mode === 'rally' ? this.streak >= this.target : this.score.you > this.score.rival;
    this.emit({ type: 'end', win, score: { ...this.score }, best: this.best, stats: this.stats });
  }

  // ---------------------------------------------------------------- rival (y piloto automático)
  prediction() {
    if (!this.pred || this.predT <= 0) { this.pred = predict(this.ball, 3.4, 1 / 60, !!this.rally?.front); this.predT = 0.12; }
    return this.pred;
  }
  // Dónde conviene estar para golpear: la primera muestra golpeable a la que se llega a tiempo
  interceptFor(who, speed, react) {
    const R = this.rally; if (!R || R.turn !== this.side(who)) return null;
    const pl = this.players[who], pr = this.prediction();
    // ¿va al fondo? (el primer bote en el último cuadro: un cañonazo que se deja botar y, si llega, se juega del rebote)
    const deep = this.deepShot();
    let fallback = null;
    for (const s of pr.samples) {
      if (!s.front && !R.front) continue;
      const bounces = R.front ? R.bounces + s.bounces : s.bounces;
      if (bounces > 1) break;
      if (R.serve && bounces < 1) continue;
      // un cañonazo hacia el fondo no se coge de aire corriendo hacia atrás: se deja botar (y, si llega, se juega del rebote)
      if (deep && bounces < 1 && s.z > 22) continue;
      // (tras el bote de una dejada la pelota apenas sube un palmo: antes se pedían 35 cm y no había dónde ir a por ella)
      if (s.y < 0.14 || s.y > 1.5 || s.x > COURT.W / 2 + 1.5 || s.z > COURT.REBOTE - 0.35 || s.z < 1.5) continue;   // (hasta el rebote: lo que vuelve de la pared de atrás también se juega)
      const need = Math.hypot(s.x - pl.x, s.z - pl.z) / speed + react, have = s.t / this.tempo;
      const c = { x: s.x, z: s.z + 0.25, t: have };
      if (need <= have) return c;
      fallback = fallback || c;
    }
    return fallback;
  }
  // la pelota en juego va a botar en el último cuadro (tras dar en el frontis): para dejarla botar e ir al rebote
  deepShot() {
    const R = this.rally; if (!R || R.bounces > 0) return false;
    const land = this.prediction().events.find(e => e.type === 'floor' && (e.n === 1 || (R.front && !e.n)));
    return !!land && land.z > 27.5;
  }
  /** Vista previa del golpe apuntado (el botón mantenido): desde donde se va a golpear (el sitio al que llega la
   *  pelota, o la mano en el saque), el golpe sin azar y su camino hasta el primer bote. null si aún no hay golpe. */
  previewShot(aim, req, pow) {
    const you = this.players.you; let at = null;
    if (this.phase === 'servePrep' && this.serverP() === 'you') at = { ...this.ball.p };
    else if (this.phase === 'rally' && this.rally?.turn === 'you') { const c = this.interceptFor('you', 6.2, 0.1); if (c) at = { x: c.x, y: 1.0, z: c.z - 0.25 }; }
    if (!at) return null;
    const key = [Math.round(aim.x * 12), Math.round(aim.y * 12), req || '', Math.round(pow * 10), Math.round(at.x * 3), Math.round(at.z * 3)].join();
    if (this._pv?.key === key) return this._pv;
    const r = this.strike('you', 1, aim, req, pow, true, at); if (!r?.v) return null;
    const b = new Ball(); b.set(r.p, r.v); b.spin = r.spin;
    const pr = predict(b, 4, 1 / 60), pts = [], step = Math.max(1, Math.ceil(pr.samples.length / 90));
    const front = pr.events.find(e => e.type === 'front'), wall = pr.events.find(e => e.type === 'left' && (!front || e.t < front.t));
    const land = pr.events.find(e => e.type === 'floor' && e.n === 1);
    for (let i = 0; i < pr.samples.length; i += step) { const q = pr.samples[i]; pts.push(q); if (land && q.t >= land.t) break; }
    this._pv = { key, pts, land, wall, front, shot: r.shot, at: you && at };
    return this._pv;
  }
  aiShot(who) {
    const me = this.players[who], sd = this.side(who), rnd = this.rnd;
    const lv = this.lvl.rival, smart = sd === 'rival' ? lv.smart : who === 'youMate' ? MATE_AI.smart : 0.5, S = this.qual[who].fuerza;
    if (this.phase === 'servePrep') return { aim: { x: gauss(rnd) * 0.5, y: 0 }, drop: false };
    const fav = this.mode === 'rally' ? null : this.styleShot(who, me); if (fav) return fav;   // (sus golpes preferidos)
    if (this.pairs) return this.aiShotPairs(who, me, smart, S);
    const op = this.players[this.other(sd)];
    if (this.mode === 'rally' && who === 'rival') return { aim: { x: (op.x - me.x) * 0.15, y: 0 }, drop: false };  // en el peloteo, pelotas fáciles
    // un pelotari fuerte, con el rival adelantado, la manda al rebote
    if (S >= 4 && op.z < 23 && me.z > 13 && rnd() < 0.18 + (S - 4) * 0.12) return { aim: { x: gauss(rnd) * 0.3, y: 1 }, drop: false, pow: 1 };
    if (rnd() < smart) {
      if (op.z > 21 && me.z < 20 && rnd() < 0.55) return { aim: { x: 0, y: -1 }, drop: true };
      if (op.z < 16 && rnd() < 0.4) return { aim: { x: op.x > 0 ? -0.6 : 0.6, y: 0 }, drop: 'cortada' };   // rival adelantado: cortada que le pase
      if (op.x > 1) return { aim: me.x > -2 && rnd() < smart ? { x: -0.85, y: -0.55 } : { x: -0.9, y: 0 } };   // rival a la derecha: a dos paredes o a la pared
      if (op.x < -1.2) return { aim: { x: 1, y: 0 } };
      if (op.z < 15) return { aim: { x: 0, y: 1 } };
    }
    return { aim: { x: gauss(rnd) * 0.6, y: rnd() < 0.2 ? 1 : 0 }, drop: false };
  }
  // sus golpes preferidos (los de su ficha): los busca a menudo, más cuantos más tiene
  styleShot(who, me) {
    const S = this.qual[who].style; if (!S) return null;
    const tot = SHOTS.reduce((a, k) => a + (S[k] || 0), 0); if (!tot || this.rnd() > Math.min(0.42, tot * 0.06)) return null;
    let x = this.rnd() * tot, k = SHOTS[0]; for (const s of SHOTS) { x -= S[s] || 0; if (x <= 0) { k = s; break; } }
    const g = gauss(this.rnd);
    if (k === 'cortada') return { aim: { x: this.rnd() < 0.5 ? -0.55 : 0.5, y: g * 0.3 }, drop: 'cortada' };
    if (k === 'dosparedes') return me.x > -3.6 ? { aim: { x: -0.85, y: -0.5 } } : null;
    if (k === 'gancho') return { aim: { x: -0.92, y: 0.35 } };   // pegada a la pared izquierda
    if (k === 'dejada') return me.z < 21 ? { aim: { x: g * 0.3, y: -1 }, drop: true } : null;
    return { aim: { x: g * 0.3, y: 1 }, pow: 0.9 + this.rnd() * 0.1 };   // largo, al rebote
  }
  // por parejas se juega al hueco: dejada si los dos están atrás, larga si los dos están delante, a la pared o al ancho
  // si se han ido a un lado, y si no, lejos del zaguero
  aiShotPairs(who, me, smart, S) {
    const rnd = this.rnd, ops = this.team(this.other(this.side(who))).map(id => this.players[id]);
    const front = ops[0].z < ops[1].z ? ops[0] : ops[1], back = front === ops[0] ? ops[1] : ops[0];
    // si uno de los dos está mucho más cansado, se le busca a él: corta si es el de delante, larga si es el de atrás
    if (Math.abs(front.en - back.en) > 0.2 && rnd() < smart * 0.5) return front.en < back.en ? { aim: { x: front.x > 0 ? 0.4 : -0.4, y: -0.6 }, drop: rnd() < 0.3 } : { aim: { x: back.x > 0 ? 0.35 : -0.35, y: 0.9 } };
    if (S >= 4 && back.z < 23 && me.z > 13 && rnd() < 0.18 + (S - 4) * 0.12) return { aim: { x: gauss(rnd) * 0.3, y: 1 }, drop: false, pow: 1 };
    if (rnd() < smart) {
      if (front.z > 17 && me.z < 20 && rnd() < 0.55) return { aim: { x: 0, y: -1 }, drop: true };
      if (back.z < 20 && rnd() < 0.5) return { aim: { x: gauss(rnd) * 0.3, y: 1 } };
      if (front.x > 0.5 && back.x > 0.5) return { aim: me.x > -2 && rnd() < smart ? { x: -0.85, y: -0.55 } : { x: -0.9, y: 0 } };
      if (front.x < -1 && back.x < -1) return { aim: { x: 1, y: 0 } };
      if (front.z < 14 && rnd() < 0.35) return { aim: { x: front.x > 0 ? -0.6 : 0.6, y: 0 }, drop: 'cortada' };
      return { aim: { x: back.x > 0 ? -0.75 : 0.75, y: rnd() < 0.5 ? 0.6 : 0 } };
    }
    return { aim: { x: gauss(rnd) * 0.6, y: rnd() < 0.25 ? 1 : 0 }, drop: false };
  }
  // por parejas, quién del lado sd va a por la pelota: el que antes llega, con ventaja para el de esa zona (el delantero,
  // lo de delante del cuadro 5; el zaguero, lo de atrás). Se mira cada cuarto de segundo y no se cambia por poco
  takerOf(sd) {
    if (!this.pairs) return sd;
    const R = this.rally; if (!R || this.phase !== 'rally' || R.turn !== sd) return null;
    if (R.claim && sd === 'you') return 'you';   // (la has pedido tú: «¡mía!»)
    if (R.taker && this.clock - R.takerAt < 0.25) return R.taker;
    let best = null, bc = Infinity, cur = Infinity;
    for (const id of this.team(sd)) {
      const pl = this.players[id], c = this.interceptFor(id, 6, 0.15); if (!c) continue;
      const del = this.role[id] === 'delantero', zone = (c.z < SPLIT) === del ? 0 : 0.45;
      const cost = Math.hypot(c.x - pl.x, c.z - pl.z) / 6 - c.t + zone + this.tired(id) * 1.4;   // (el cansado deja más pelotas a su compañero)
      if (id === R.taker) cur = cost;
      if (cost < bc) { bc = cost; best = id; }
    }
    if (R.taker && best !== R.taker && bc > cur - 0.3) best = R.taker;
    R.taker = best || R.taker || this.team(sd).find(id => this.role[id] === 'zaguero'); R.takerAt = this.clock;
    return R.taker;
  }
  // por parejas, el sitio de cada uno mientras no va a por la pelota: el delantero por delante del cuadro 4, el
  // zaguero hacia el 6 y medio; los dos se corren un poco hacia donde está la pelota
  // (si el compañero está cansado, se acerca al centro para cubrir más cancha y que él descanse)
  basePos(who) {
    const b = this.ball.p, del = this.role[who] === 'delantero', mt = this.tired(this.team(this.side(who)).find(id => id !== who));
    const p = del ? { x: clamp(b.x * 0.3 + 1.2, -2.5, 3), z: 12.5 + mt * 4 } : { x: clamp(b.x * 0.3 - 0.3, -3, 3), z: 23.5 - mt * 3.5 };
    // (el de la otra pareja que juega en su misma zona quiere el mismo sitio: no se planta hombro con hombro con él, se
    // queda a 2 m a un lado, hacia donde haya más cancha)
    const o = this.players[this.team(this.other(this.side(who))).find(id => this.role[id] === this.role[who])];
    if (o && Math.hypot(p.x - o.x, p.z - o.z) < 2) { const s = o.x > 0.5 ? -1 : o.x < -0.5 ? 1 : p.x >= o.x ? 1 : -1; p.x = clamp(o.x + s * 2, -COURT.W / 2 + 0.9, COURT.W / 2 - 0.9); }
    return p;
  }
  driveAI(who, dt) {
    const pl = this.players[who], sd = this.side(who), base = sd === 'rival' ? this.lvl.rival : who === 'youMate' ? MATE_AI : { speed: 5.4, react: 0.25, error: 0.12 }, Q = this.qual[who];
    // velocidad: lo que corre y la arrancada a las cortas (a uno lento le pillan las dejadas); agilidad: los reflejos
    const tir = this.tired(who);   // (cansado, corre algo menos y falla más)
    const lv = { ...base, speed: base.speed * (0.85 + Q.velocidad * 0.05) * (1 - tir * 0.15), dash: (base.dash ?? 1) * (0.94 + Q.velocidad * 0.02), react: base.react * (1.25 - Q.agilidad * 0.083) };
    let tx = pl.x, tz = pl.z, sprint = 1;
    if (this.phase === 'rally' && this.rally.turn === sd && this.pairs && this.takerOf(sd) !== who) {
      // la coge el compañero: a su sitio
      const p = this.basePos(who); tx = p.x; tz = p.z;
    } else if (this.phase === 'rally' && this.rally.turn === sd) {
      // a una pelota corta (la dejada) se sale en arrancada, como un pelotari de verdad: más rápido que en el peloteo
      const dash = lv.dash, c = this.interceptFor(who, lv.speed * dash, lv.react);
      if (c) { const w = this.detour(pl, c.x, c.z); tx = w.x; tz = w.z; if (c.z < 8) sprint = dash; }
      const cannon = this.rally.bounces < 1 && this.ball.p.z > 22 && this.deepShot();   // (ese cañonazo al fondo, no de aire)
      if (this.hittable(who) && !cannon) {
        // los diestros fallan más lo pegado a la pared izquierda (y lo muy bajo): menos cuanto más ágiles
        const b = this.ball.p, rally = this.mode === 'rally' && sd === 'rival';
        // (y lo que llega al fondo, junto al rebote, cuesta devolverlo bien)
        const near = clamp((1.1 - (b.x + COURT.W / 2)) / 0.8, 0, 1), deep = clamp((b.z - 28.5) / 4, 0, 1);
        const wallErr = rally ? 0 : near * (0.55 - Q.agilidad * 0.09) + (b.y < 0.3 ? 0.2 - Q.agilidad * 0.04 : 0) + deep * (0.4 - Q.agilidad * 0.05);
        const bad = this.rnd() < (rally ? 0.03 : lv.error) + Math.max(0, wallErr) + (rally ? 0 : tir * 0.3);
        const q = bad ? 0.1 + this.rnd() * 0.2 : 0.55 + this.rnd() * 0.4 - tir * 0.2;
        const s = this.aiShot(who);
        // fuerza: cuanto más fuerte, más cargados los golpes
        return this.strike(who, q, s.aim, s.drop, s.pow ?? clamp(0.18 + Q.fuerza * 0.1 + this.rnd() * 0.5, 0.15, 1));
      }
    } else if (this.phase === 'rally' && this.pairs) {
      const p = this.basePos(who); tx = p.x; tz = p.z;
    } else if (this.phase === 'rally') {
      // se recoloca: centro-fondo, algo al lado contrario del rival
      const op = this.players[this.other(sd)];
      tx = clamp(-op.x * 0.5, -2.5, 2.5); tz = 20.5;
    } else if (this.phase === 'servePrep' && this.serverP() === who) {
      if (this.hittable(who) && this.ball.v.y < 0.4 && this.ball.p.y < 1.1) {
        const s = this.aiShot(who); return this.strike(who, 0.6 + this.rnd() * 0.35, s.aim, false);
      }
    }
    this.moveTo(pl, tx, tz, lv.speed * sprint, dt);
  }
  moveTo(pl, tx, tz, speed, dt) {
    const dx = tx - pl.x, dz = tz - pl.z, d = Math.hypot(dx, dz);
    const want = d > 0.08 ? Math.min(speed, d * 4) : 0;
    const vx = d > 0 ? dx / d * want : 0, vz = d > 0 ? dz / d * want : 0;
    const a = 1 - Math.exp(-10 * dt);
    pl.vx += (vx - pl.vx) * a; pl.vz += (vz - pl.vz) * a;
  }

  // ---------------------------------------------------------------- bucle
  /**
   * @param {number} dt segundos reales
   * @param {object} inp entrada del jugador: { mx, mz (en coordenadas de la cancha), hit, drop, aimX, aimY }
   */
  update(dt, inp = {}) {
    this.events = [];
    dt = Math.min(dt, 0.05);
    this.phaseT += dt; this.predT -= dt; this.clock += dt;
    // energía: durante el tanto apenas se recupera (y correr a tope cansa); entre tanto y tanto, mucho
    const live = this.phase === 'rally' || this.phase === 'servePrep';
    for (const id of this.ids) { const p = this.players[id]; p.en = clamp(p.en + (live ? EN.rally - EN.run * Math.max(0, (p.speed || 0) - 3) / 3 : EN.rest) * dt, 0, 1); }
    for (const id of this.ids) { const p = this.players[id]; p.actT += dt; if (p.cool > 0) p.cool -= dt; if ((p.act === 'hit' || p.act === 'swing') && p.actT > 0.45) p.act = 'idle'; }   // (un golpe al aire también acaba: antes se quedaba en «swing» y el gesto se repetía sin parar)

    if (this.phase === 'intro' || this.phase === 'end') return this.events;
    if (this.phase === 'point') {
      if (this.phaseT > (this.finalPoint ? 4.6 : 2.1)) {
        if (this.mode === 'match' && (this.score.you >= this.target || this.score.rival >= this.target)) this.finish();
        else this.toServe();
      }
      this.stepBall(dt, false);
      this.movePlayers(dt, inp, false);
      return this.events;
    }
    // saque: el que saca sale corriendo desde el 7 (tú, al pulsar GOLPE) con la pelota en la mano y, poco antes del 4,
    // la bota
    if (this.phase === 'serveWait') {
      const s = this.players[this.serverP()];
      const humanServes = this.serverP() === 'you' && !this.autoplay;
      if (!this.runUp && (humanServes ? (inp.hit || this.phaseT > 9) : this.phaseT > 0.8)) { this.runUp = true; this.emit({ type: 'serveRun', who: this.serverP() }); }
      this.movePlayers(dt, { ...inp, hit: false, drop: false }, true);
      this.ball.set(vec(s.x + 0.35, 1.05, s.z - 0.35), vec()); this.ball.spin = 0;
      if (this.runUp && s.z < SERVE_Z + 0.3) this.dropForServe();
      return this.events;
    }
    if (this.phase === 'servePrep') {
      this.stepBall(dt, true);
      if (this.prepBounces >= 2) {               // se le ha escapado: se repite el saque
        this.serveTries++; this.emit({ type: 'serveRetry' });
        if (this.serverP() === 'you' && this.serveTries >= 2 && !this.autoplay) { this.strike('you', 0.7, { x: 0, y: 0 }); }
        else this.dropForServe();
        return this.events;
      }
    } else this.stepBall(dt, false);
    this.movePlayers(dt, inp, false);
    return this.events;
  }
  stepBall(dt, prep) {
    const gdt = dt * this.tempo, n = Math.max(1, Math.ceil(gdt / (1 / 240))), h = gdt / n;
    for (let i = 0; i < n; i++) {
      const ev = this.ball.step(h, []);
      for (const e of ev) {
        if (prep) { if (e.type === 'floor') { this.prepBounces++; if (this.prepBounces === 1) this.ball.v.y = Math.max(this.ball.v.y, 2.9); this.emit({ type: 'floor', ...e, soft: true }); } continue; }   // al sacar, el pelotari bota la pelota con fuerza para que suba a la mano
        if (this.phase === 'rally') this.onBallEvent(e);
        else if (e.type === 'floor' || e.type === 'front' || e.type === 'left') this.emit({ type: e.type === 'left' ? 'wall' : e.type, ...e, dead: true });
      }
    }
    // pelota perdida lejos (por si acaso)
    const b = this.ball.p;
    if (this.phase === 'rally' && (b.z > COURT.L + 12 || b.x > COURT.W / 2 + 12)) this.point(this.rally.front ? this.rally.striker : this.rally.turn, 'fuera');
  }
  movePlayers(dt, inp, frozenServer) {
    const you = this.players.you;
    // jugador humano (o piloto automático)
    if (this.autoplay) this.driveAI('you', dt);
    else {
      const spd = 6.2 * (1 - this.tired('you') * 0.12), mx = clamp(inp.mx || 0, -1, 1), mz = clamp(inp.mz || 0, -1, 1);
      // por parejas, mantener el golpe con la pelota de tu compañero en el aire es pedirla («¡mía!»): si llegas, es tuya
      // y él se aparta (para que descanse si está cansado)
      if (this.pairs && inp.aiming && this.phase === 'rally' && this.rally.turn === 'you' && !this.rally.claim && this.takerOf('you') !== 'you') {
        const c = this.interceptFor('you', spd, 0.1);
        if (c && Math.hypot(c.x - you.x, c.z - you.z) / spd + 0.1 <= c.t + 0.15) { this.rally.claim = true; this.rally.taker = 'you'; this.emit({ type: 'claim' }); }
      }
      let vx = mx * spd, vz = mz * spd;
      // ayuda: se acerca solo al sitio donde llegará la pelota (apuntando, con el botón mantenido, va solo del todo)
      const help = inp.aiming ? Math.max(this.lvl.assist, 5.4) : this.lvl.assist;
      if (help > 0 && this.phase === 'rally' && this.rally.turn === 'you' && this.takerOf('you') === 'you') {   // (por parejas, solo si es tuya)
        const c = this.interceptFor('you', 6.2, 0.1);
        if (c) { const dx = c.x - you.x, dz = c.z - you.z, d = Math.hypot(dx, dz); if (d > 0.25) { const k = Math.min(help, d * 2.5); vx += dx / d * k; vz += dz / d * k; } }
      }
      const a = 1 - Math.exp(-12 * dt);
      // (si sacas, la carrera hasta el 4 la haces solo: el joystick no cuenta hasta que golpeas)
      if (!((this.phase === 'serveWait' || this.phase === 'servePrep') && this.serverP() === 'you')) { you.vx += (vx - you.vx) * a; you.vz += (vz - you.vz) * a; }
      // golpe
      if ((inp.hit || inp.drop || inp.cut) && you.cool <= 0) {
        if (this.phase === 'servePrep' || this.phase === 'rally') { you.swing = 0.3; you.swingT = 0; you.dropReq = inp.drop ? 'dejada' : inp.cut ? 'cortada' : false; you.pow = inp.power ?? 0.5; you.aim = { x: inp.aimX || 0, y: inp.aimY || 0 }; you.act = 'swing'; you.actT = 0; you.cool = 0.32; }
      }
      if (you.swing > 0) {
        you.swingT += dt; you.swing -= dt;
        if (this.hittable('you')) {
          const q = this.quality('you', you.swingT);
          this.strike('you', q, you.aim || { x: inp.aimX || 0, y: inp.aimY || 0 }, you.dropReq, you.pow ?? 0.5);
        } else if (you.swing <= 0) this.emit({ type: 'whiff' });
      }
    }
    // los demás (el rival y, por parejas, los compañeros), con la cabeza; el que saca espera quieto a botar la pelota
    for (const id of this.ids) if (id !== 'you' && !(this.phase === 'serveWait' && this.serverP() === id)) this.driveAI(id, dt);
    if (this.phase === 'serveWait' || this.phase === 'servePrep') {
      const s = this.players[this.serverP()];
      if (this.phase === 'serveWait' && this.runUp) this.moveTo(s, SERVE_X, SERVE_Z, RUN_V, dt);
      else { s.vx = s.vz = 0; }
    }
    this.giveWay(dt, inp);
    const all = this.ids.map(id => this.players[id]);
    for (const p of all) {
      p.x = clamp(p.x + p.vx * dt, -COURT.W / 2 + 0.45, COURT.W / 2 + 2.5);
      p.z = clamp(p.z + p.vz * dt, 2, COURT.L + 3);
      const sp = Math.hypot(p.vx, p.vz); p.speed = sp;
      if (sp > 0.3) p.face = Math.atan2(p.vx, p.vz);
    }
    // no se atraviesan
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const a = all[i], c = all[j], dx = a.x - c.x, dz = a.z - c.z, d = Math.hypot(dx, dz);
      if (d < 0.9 && d > 1e-4) { const k = (0.9 - d) / 2; a.x += dx / d * k; a.z += dz / d * k; c.x -= dx / d * k; c.z -= dz / d * k; }
    }
  }

  // Nadie estorba al que va a golpear: los demás se apartan de su carrera hacia la pelota y, sobre todo, del sitio donde
  // la golpeará (el que acaba de golpear se retira, como en los partidos de verdad). Tú, si no mueves el joystick, también
  // das un paso a un lado. (El que va a por ella, además, rodea a quien tenga delante: en driveAI)
  giveWay(dt, inp = {}) {
    if (this.phase !== 'rally') return;
    const tk = this.pairs ? this.takerOf(this.rally.turn) : this.rally.turn; if (!tk) return;
    const T = this.players[tk], c = this.interceptFor(tk, 6, 0.1); if (!c) return;
    const ax = T.x, az = T.z, dx = c.x - ax, dz = c.z - az, l2 = dx * dx + dz * dz, k = Math.min(1, dt * 10);
    for (const id of this.ids) {
      if (id === tk) continue;
      const q = this.players[id], human = id === 'you' && !this.autoplay;
      if (human && (Math.hypot(inp.mx || 0, inp.mz || 0) > 0.1 || inp.aiming)) continue;   // (tú mandas: solo si estás quieto)
      const u = l2 > 1e-4 ? clamp(((q.x - ax) * dx + (q.z - az) * dz) / l2, 0, 1) : 1, px = ax + dx * u, pz = az + dz * u;
      let nx = q.x - px, nz = q.z - pz; const d = Math.hypot(nx, nz), R = u > 0.9 ? 2.3 : 1.6;
      if (d >= R) continue;
      if (d < 0.05) { nx = -dz; nz = dx; } const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
      // (hacia dentro de la cancha si la pared izquierda no deja: no se aparta contra la pared)
      if (q.x < -COURT.W / 2 + 1.2 && nx < 0) { nx = 0.6; nz = Math.sign(nz || 1) * 0.8; }
      const want = (R - d) / R * (human ? 2.5 : 5.5), vn = q.vx * nx + q.vz * nz;
      if (vn < want) { q.vx += (want - vn) * nx * k; q.vz += (want - vn) * nz * k; }
    }
  }
  // el que va a por la pelota no atraviesa a nadie: si alguien está en su carrera, apunta a un lado de él
  detour(pl, tx, tz) {
    const dx = tx - pl.x, dz = tz - pl.z, l2 = dx * dx + dz * dz; if (l2 < 0.5) return { x: tx, z: tz };
    for (const id of this.ids) {
      const q = this.players[id]; if (q === pl) continue;
      const u = ((q.x - pl.x) * dx + (q.z - pl.z) * dz) / l2; if (u < 0.05 || u > 0.92) continue;
      const px = pl.x + dx * u, pz = pl.z + dz * u, d = Math.hypot(q.x - px, q.z - pz); if (d > 1.1) continue;
      const L = Math.sqrt(l2); let sx = -dz / L, sz = dx / L; if ((q.x - px) * sx + (q.z - pz) * sz > 0) { sx = -sx; sz = -sz; }
      return { x: q.x + sx * 1.4, z: q.z + sz * 1.4 };
    }
    return { x: tx, z: tz };
  }
  // ayudas para la vista: dónde botará y dónde conviene ponerse
  hints() {
    if (this.phase !== 'rally') return null;
    const R = this.rally, pr = this.prediction();
    let land = null;
    for (const e of pr.events) if (e.type === 'floor' && e.n === 1) { land = e; break; }
    // (por parejas, «te toca» solo si la pelota es tuya; si es de tu compañero, él va a por ella)
    const mine = R.turn === 'you' && this.takerOf('you') === 'you';
    const spot = mine ? this.interceptFor('you', 6.2, 0.1) : null;
    return { land, spot, yourTurn: mine, mate: R.turn === 'you' && !mine, hittable: this.hittable('you'), tired: this.tired('you'), mateTired: this.pairs ? this.tired('youMate') : 0 };
  }
}
