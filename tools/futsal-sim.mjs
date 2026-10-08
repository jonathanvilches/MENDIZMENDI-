// Pruebas del fútbol sala sin gráficos (node): física del balón de talla 4, reglas de sala y partidos IA contra IA.
// Uso: node tools/futsal-sim.mjs [partidos por nivel] [minutos por parte]
import { FutbolGame } from '../src/futbol/game.js';
import { FIELD as F, PHYS as K, ROLES, useFormat } from '../src/futbol/rules.js';
import { Ball } from '../src/futbol/physics.js';

useFormat('sala', 'pista');
const [,, N = '3', MIN = '3'] = process.argv;
const R = K.R, HL = F.HL, HW = F.HW, hw = F.goalW / 2;
let fails = 0;
const ok = (cond, msg) => { console.log(`  ${cond ? 'OK ' : 'FALLO'} ${msg}`); if (!cond) fails++; };
const sala = (o = {}) => new FutbolGame({ format: 'sala', surface: 'pista', replays: false, ...o });

// ---------------------------------------------------------------- física
console.log('== Física del balón (talla 4) ==');
ok(F.L === 40 && F.W === 20 && F.goalW === 3 && F.goalH === 2 && R === 0.1 && ROLES.length === 5, 'pista de 40 × 20 m, porterías de 3 × 2 m, balón de 10 cm de radio, 5 por equipo');
// 1) soltado desde 2 m: el primer bote sube entre 55 y 65 cm
{ const b = new Ball(); b.set(0, 0, 2 + R); let peak = 0, bounced = false; const ev = [];
  for (let i = 0; i < 600; i++) { b.step(1 / 120, ev); if (ev.some(e => e.t === 'bounce')) bounced = true; if (bounced) { peak = Math.max(peak, b.p.y - R); if (b.v.y < 0 && peak > 0.1) break; } }
  ok(peak >= 0.55 && peak <= 0.65, `soltado desde 2 m bota ${(peak * 100).toFixed(1)} cm (55–65)`); }
// 2) rodando a 5 m/s en pista lisa: se para a unos 7 m (1,6 m/s² más el aire)
{ const b = new Ball(); b.set(0, 0); b.kick(5, 0, 0); for (let i = 0; i < 1200; i++) b.step(1 / 120);
  ok(b.p.x > 6 && b.p.x < 8, `rodando a 5 m/s se para a ${b.p.x.toFixed(2)} m`); }
// 3) efecto: se desvía hacia ω × v, con 8 m/s² como mucho
{ const b = new Ball(); b.set(-10, 0, 1); b.kick(25, 2, 0, 60); let maxA = 0, vz0 = 0;
  for (let i = 0; i < 60; i++) { vz0 = b.v.z; b.step(1 / 120); maxA = Math.max(maxA, Math.abs(b.v.z - vz0) * 120); }
  ok(b.p.z < -0.3, `giro +60 rad/s hacia +x: se curva hacia −z (${b.p.z.toFixed(2)} m en 0,5 s)`);
  ok(maxA <= 8.05, `aceleración lateral máxima ${maxA.toFixed(2)} m/s² (≤ 8)`); }
// 4) el tiro del jugador va hacia el lado al que apunta el joystick (recto, sin efecto: el joystick mueve la diana)
{ const g = sala({ seed: 3 }); g.start(); g.restart = null; g.phase = 'play';
  for (const p of g.players) { p.x = -15; p.z = -9 + p.id; p.react = 99; }
  const me = g.me; me.x = HL - 11; me.z = 0; me.h = Math.PI / 2; g.ball.set(me.x + 0.5, 0); g.owner = me; g.drain();
  g.setMove(1, 0.45, 1, false); g.humanShot(me, 0.7);
  const vz0 = g.ball.v.z, spin = g.ball.w.y;
  ok(vz0 > 0.3 && Math.abs(spin) < 1e-6, `joystick hacia +z: el tiro sale hacia +z (vz ${vz0.toFixed(2)} m/s) y sin efecto`); }
// 5) colisión continua: 400 tiros a 30 m/s contra la portería nunca atraviesan postes, larguero ni red
{ let bad = 0, posts = 0, nets = 0;
  const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  for (let i = 0; i < 400; i++) {
    const b = new Ball(), a = (rnd() - 0.5) * 2.4, d = 6 + rnd() * 8, x0 = HL - Math.cos(a) * d, z0 = Math.sin(a) * d;
    const tz = (rnd() - 0.5) * (2 * hw + 2.2), ty = rnd() * (F.goalH + 0.7), dx = HL - x0, dz = tz - z0, L = Math.hypot(dx, dz), T = L / 30;
    b.set(x0, z0, R); b.kick(dx / L * 30, (ty - R) / T + 0.5 * K.g * T, dz / L * 30);
    const ev = [], D = F.goalD, H = F.goalH, pr = F.postR;
    for (let k = 0; k < 360; k++) {
      const o = { ...b.p }; b.step(1 / 120, ev); const p = b.p;
      const inBox = (q, m = 0) => q.x > HL + m && q.x < HL + D - m && Math.abs(q.z) < hw - m && q.y < H - m;
      // cruza una pared de la red (de dentro a fuera o de fuera a dentro) sin pasar por la boca de la portería
      const enterSide = !inBox(o) && inBox(p, 0.02) && !(o.x <= HL + 0.02 && Math.abs(o.z) < hw && o.y < H);
      const exitBack = inBox(o) && p.x > HL + D + 0.02 && Math.abs(p.z) < hw - 0.05 && p.y < H - 0.05;
      const exitSide = inBox(o) && p.x > HL + 0.05 && p.x < HL + D && Math.abs(p.z) > hw + 0.02 && p.y < H;
      // dentro de un poste o del larguero
      let inPost = false; for (const pz of [-hw - pr, hw + pr]) if (p.y < H && Math.hypot(p.x - HL, p.z - pz) < R + pr - 0.02) inPost = true;
      if (Math.abs(p.z) < hw + pr && Math.hypot(p.x - HL, p.y - (H + pr)) < R + pr - 0.02) inPost = true;
      if (enterSide || exitBack || exitSide || inPost) { bad++; break; }
    }
    if (ev.some(e => e.t === 'post' || e.t === 'bar')) posts++; if (ev.some(e => e.t === 'net')) nets++;
  }
  ok(bad === 0, `400 tiros a 30 m/s: ${bad} atraviesan algo (al poste o larguero ${posts}, a la red ${nets})`); }

// ---------------------------------------------------------------- reglas
console.log('== Reglas de fútbol sala ==');
function scene(setup, secs = 2.5) {
  const g = sala({ autoplay: true, seed: 5 });
  g.start(); g.restart = null; g.phase = 'play'; g.owner = null;
  for (const p of g.players) { p.x = (p.team ? 1 : -1) * 2; p.z = -HW + 0.5 + p.id * 0.4; p.vx = p.vz = 0; p.react = 99; }
  for (const k of [g.gk(0), g.gk(1)]) { k.x = k.team ? 12 : -12; k.z = -HW + 1; k.react = 99; }
  g.keeper = () => {}; g.drain();
  setup(g);
  const ev = [];
  for (let t = 0; t < secs; t += 1 / 120) { g.step(1 / 120); ev.push(...g.drain()); if (g.phase !== 'play') break; }
  return { g, ev, has: (k, f = () => true) => ev.some(e => e.t === k && f(e)) };
}
const att = (g) => g.byRole(0, 'PIV'), foe = (g, r = 'CIE') => g.byRole(1, r);
{ const r = scene(g => { g.ball.set(HL - 4, 0, R); g.ball.kick(16, 1.6, 0.2); g.last = att(g); });
  ok(r.has('goal', e => e.team === 0), 'gol: el balón entero pasa la línea entre los postes y por debajo del larguero'); }
{ const r = scene(g => { g.ball.set(HL - 6, 0, R); g.ball.kick(16, 9, 0); g.last = att(g); });
  ok(!r.has('goal') && r.has('out', e => e.type === 'goalkick'), 'por encima del larguero: saque de portería'); }
{ const r = scene(g => { g.ball.set(HL - 3, hw + F.postR + 0.02, 0.6); g.ball.kick(16, 0.3, 0); g.last = att(g); }, 0.6);
  ok(r.has('post') && !r.has('goal'), 'balón al poste sin gol'); }
{ const r = scene(g => { g.ball.set(HL - 3, 4.5, R); g.ball.kick(10, 0.6, -5.5); g.last = att(g); });
  const inside = Math.abs(r.g.ball.p.z) < hw && r.g.ball.p.x > HL;
  ok(!r.has('goal') && !inside, 'balón que entra por fuera de la red: no es gol'); }
// fuera de banda: saque de banda con el pie (balón en el suelo, en la línea) para el otro equipo
{ const r = scene(g => { g.ball.set(0, HW - 2, R); g.ball.kick(1, 0, 6); g.last = foe(g); });
  ok(r.has('out', e => e.type === 'throwin' && e.team === 0), 'fuera de banda: saque de banda del otro equipo');
  const g = r.g; for (let t = 0; t < 1.2; t += 1 / 120) g.step(1 / 120);
  const onLine = g.restart?.type === 'throwin' && g.ball.p.y < R + 0.02 && Math.abs(Math.abs(g.ball.p.z) - HW) < 0.1;
  let kick = null; for (let t = 0; t < 4 && !kick; t += 1 / 120) { g.step(1 / 120); for (const e of g.drain()) if (e.t === 'kick') kick = e; }
  ok(onLine && kick && kick.kind !== 'throw', `saque de banda con el pie desde la línea (${kick?.kind})`); }
// saque de portería: con la mano del portero, con los rivales fuera del área
{ const r = scene(g => { g.ball.set(HL - 3, 3, R); g.ball.kick(10, 0, 0.5); g.last = att(g); });
  ok(r.has('out', e => e.type === 'goalkick' && e.team === 1), 'fuera de fondo del atacante: saque de portería');
  const g = r.g; for (let t = 0; t < 1.1; t += 1 / 120) g.step(1 / 120);
  const out = g.team(0).every(p => !g.inArea(1, p.x, p.z));
  let kick = null; for (let t = 0; t < 4 && !kick; t += 1 / 120) { g.step(1 / 120); for (const e of g.drain()) if (e.t === 'kick') kick = e; }
  ok(out && kick && g.players[kick.p].role === 'POR' && (kick.kind === 'throw' || kick.kind === 'clear'), `saque de portería del portero (${kick?.kind}) con los rivales fuera del área`); }
// córner tocado por el defensor
{ const r = scene(g => { g.ball.set(HL - 2, 6, R); g.ball.kick(10, 0, 0.5); g.last = foe(g); });
  ok(r.has('out', e => e.type === 'corner' && e.team === 0), 'fuera de fondo tocada por el defensor: córner'); }
// el área en D
{ const g = sala({ seed: 1 }), t = 1;   // el equipo 1 defiende la portería de +x
  ok(g.inArea(t, HL - 5.9, 0) && g.inArea(t, HL - 4, hw + 4) && !g.inArea(t, HL - 5, hw + 3.5) && !g.inArea(t, HL - 6.3, 0) && g.inArea(t, HL - 0.5, hw + 5.9), 'área en D: cuartos de círculo de 6 m desde los postes y la recta entre ellos'); }
// falta: entrada por detrás → tiro libre; dentro del área → penalti desde 6 m
function foulAt(x, prev = 0) {
  const g = sala({ autoplay: true, seed: 9 }); g.start(); g.restart = null; g.phase = 'play';
  for (const p of g.players) { p.x = -12 + p.id * 0.8; p.z = -HW + 1; p.react = 99; }
  g.fouls[1] = prev;
  const a = att(g), d = foe(g); a.x = x; a.z = 0; a.h = Math.PI / 2; a.vx = 3; g.ball.set(x + 0.5, 0); g.owner = a; g.last = a;
  d.x = x - 1.6; d.z = 0; d.h = Math.PI / 2; g.drain(); g.tackle(d, 'slide');
  const ev = []; for (let t = 0; t < 2.6; t += 1 / 120) { g.step(1 / 120); ev.push(...g.drain()); }
  return { g, ev };
}
{ const { ev } = foulAt(0); ok(ev.some(e => e.t === 'foul') && ev.some(e => e.t === 'restart' && e.type === 'free' && !e.noWall), 'entrada por detrás en el centro: tiro libre con barrera'); }
{ const { g, ev } = foulAt(HL - 4); const r = ev.find(e => e.t === 'restart'); ok(r?.type === 'penalty' && Math.abs(g.ball.p.x - (HL - F.spot)) < 0.05, 'falta dentro del área: penalti desde 6 m'); }
// sexta falta acumulada: tiro libre directo sin barrera desde el segundo punto (10 m)
{ const { g, ev } = foulAt(-2, 5); const r = ev.find(e => e.t === 'restart'), f = ev.find(e => e.t === 'foul');
  const wall = g.players.some(p => p.wall);
  ok(f?.acc === 6 && r?.type === 'free' && r.noWall && !wall && Math.abs(g.ball.p.x - (HL - F.spot2)) < 0.05, `6.ª falta: sin barrera desde 10 m (x=${g.ball.p.x.toFixed(1)})`); }
{ const { g, ev } = foulAt(HL - 8.5, 5); const r = ev.find(e => e.t === 'restart');
  ok(r?.noWall && Math.abs(g.ball.p.x - (HL - 7.7)) < 1.2 && g.ball.p.x > HL - F.spot2, '6.ª falta más cerca que el segundo punto: desde donde fue'); }
// los rivales a 5 m en los balones parados
{ const g = sala({ autoplay: true, seed: 4 }); g.start(); g.setPiece('free', 0, -3, 2);
  for (let t = 0; t < 0.9; t += 1 / 120) g.step(1 / 120);
  const near = Math.min(...g.team(1).filter(p => p.role !== 'POR').map(p => Math.hypot(p.x + 3, p.z - 2)));
  ok(near >= 4.9, `rivales a 5 m del balón en el tiro libre (el más cerca a ${near.toFixed(2)} m)`); }
// 4 segundos: si el jugador no saca, saca el otro equipo
{ const g = sala({ seed: 4 }); g.start(); g.restart = null; g.phase = 'play';
  g.setPiece('throwin', 0, 3, HW); const tk = g.restart.taker; g.me = tk; let four = false;
  for (let t = 0; t < 6 && !four; t += 1 / 120) { g.step(1 / 120); for (const e of g.drain()) if (e.t === 'fourSec') four = true; }
  for (let t = 0; t < 1.2; t += 1 / 120) g.step(1 / 120);
  ok(four && g.restart?.team === 1, '4 segundos sin sacar: saca el otro equipo'); }
// sin fuera de juego
{ const g = sala({ seed: 3 }); g.start(); g.restart = null; g.phase = 'play';
  for (const d of g.team(1)) d.x = 8; g.gk(1).x = HL - 1; const q = att(g); q.x = 15; g.ball.set(0, 0);
  ok(!g.isOffside(q), 'sin fuera de juego'); }
// penaltis: tanda con ganador
{ const g = sala({ mode: 'penalties', autoplay: true, seed: 21 }); g.start();
  let t = 0; while (g.phase !== 'end' && t < 300) { g.update(1 / 20); t += 1 / 20; }
  ok(g.phase === 'end' && g.result && g.result.pens[0] !== g.result.pens[1], `tanda de penaltis con ganador (${g.result?.pens?.join('-')})`); }

// ---------------------------------------------------------------- partidos automáticos
console.log('== Partidos IA contra IA (autoplay) ==');
for (const level of ['facil', 'normal', 'dificil']) {
  const tot = { goals: [0, 0], shots: [0, 0], ok: [0, 0], passes: [0, 0], outs: {}, stuck: 0, maxStill: 0, errors: 0, throws: 0, fouls: 0, over: 0, wall: 0, chase: 0, clockStop: 0 };
  for (let m = 0; m < +N; m++) {
    const g = sala({ level, duration: +MIN, autoplay: true, seed: 2000 + m * 31 + level.length });
    g.start();
    let still = 0, simT = 0, dead = 0; const t0 = Date.now();
    try {
      while (g.phase !== 'end' && simT < (+MIN * 2 * 60) * 3) {
        const c0 = g.clock;
        g.update(1 / 20); simT += 1 / 20;
        if (g.phase !== 'play' && g.phase !== 'end' && g.half === 1 && g.clock === c0) dead += 1 / 20;
        for (const e of g.drain()) {
          if (e.t === 'out') tot.outs[e.type] = (tot.outs[e.type] || 0) + 1;
          if (e.t === 'kick' && e.kind === 'throw' && g.players[e.p].role === 'POR') tot.throws++;
          if (e.t === 'foul') { tot.fouls++; if (e.over) tot.over++; }
        }
        // nunca dos del mismo equipo persiguiendo el balón
        for (const t of [0, 1]) if (g.team(t).filter(p => p.job?.kind === 'chase').length > 1) tot.chase++;
        if (g.phase === 'play' && g.ball.speed < 0.05 && !g.owner) still += 1 / 20; else still = 0;
        tot.maxStill = Math.max(tot.maxStill, still);
        if (still > 6) { tot.stuck++; still = 0; }
      }
    } catch (e) { tot.errors++; console.log('  ERROR', e.stack.split('\n').slice(0, 3).join(' | ')); }
    tot.wall += Date.now() - t0; tot.clockStop += dead;
    const S = g.stats;
    for (const t of [0, 1]) { tot.goals[t] += g.score[t]; tot.shots[t] += S.shots[t]; tot.ok[t] += S.passesOk[t]; tot.passes[t] += S.passes[t]; }
    console.log(`  ${level} #${m + 1}: ${g.score[0]}-${g.score[1]}  ${g.phase}  tiros ${S.shots.join('/')}  pases ${S.passesOk.join('/')} de ${S.passes.join('/')}  robos ${S.steals.join('/')}  faltas ${S.fouls.join('/')}  paradas ${S.saves.join('/')}  posesión ${S.poss.map(x => x.toFixed(0)).join('/')} s`);
    ok(g.phase === 'end', `${level} #${m + 1} termina`);
  }
  console.log(`  ${level}: goles ${tot.goals.join('-')}, fueras ${JSON.stringify(tot.outs)}, saques del portero con la mano ${tot.throws}, faltas ${tot.fouls} (${tot.over} desde la 6.ª), reloj parado ${tot.clockStop.toFixed(0)} s, balón quieto más largo ${tot.maxStill.toFixed(1)} s, ${(tot.wall / +N).toFixed(0)} ms por partido`);
  ok(tot.errors === 0, `${level}: sin errores`);
  ok(tot.goals[0] + tot.goals[1] >= +N, `${level}: hay goles`);
  ok(tot.stuck < 1, `${level}: sin bloqueos del balón`);
  ok(tot.chase === 0, `${level}: nunca dos del mismo equipo a por el balón suelto`);
  ok(tot.throws > 0, `${level}: el portero saca con la mano`);
  ok(tot.clockStop > 0, `${level}: el reloj se para con el balón fuera`);
}
console.log(fails ? `\n${fails} FALLOS` : '\nTodo correcto');
process.exit(fails ? 1 : 0);
