// Pruebas del fútbol sin gráficos (node): partidos IA contra IA en los tres niveles y casos de reglas.
// Uso: node tools/futbol-sim.mjs [partidos por nivel] [minutos por parte]
import { FutbolGame } from '../src/futbol/game.js';
import { FIELD as F, PHYS as K, ROLES } from '../src/futbol/rules.js';

const [,, N = '3', MIN = '3'] = process.argv;
const R = K.R, NR = ROLES.length, HL = F.HL;
let fails = 0;
const ok = (cond, msg) => { console.log(`  ${cond ? 'OK ' : 'FALLO'} ${msg}`); if (!cond) fails++; };

// ---------------------------------------------------------------- partidos automáticos
console.log('== Partidos IA contra IA (autoplay) ==');
for (const level of ['facil', 'normal', 'dificil']) {
  const tot = { goals: [0, 0], shots: [0, 0], passes: [0, 0], ok: [0, 0], steals: [0, 0], fouls: [0, 0], outs: {}, stuck: 0, maxStill: 0, errors: 0, saves: [0, 0], wall: 0, pens: 0, poss: [0, 0] };
  for (let m = 0; m < +N; m++) {
    const g = new FutbolGame({ level, duration: +MIN, autoplay: true, seed: 1000 + m * 77 + level.length, replays: false });
    g.start();
    let still = 0, simT = 0; const t0 = Date.now();
    try {
      while (g.phase !== 'end' && simT < (+MIN * 2 * 60) * 3) {
        g.update(1 / 20); simT += 1 / 20;   // timeScale: se simula mucho más rápido que el tiempo real
        for (const e of g.drain()) {
          if (e.t === 'out') tot.outs[e.type] = (tot.outs[e.type] || 0) + 1;
          if (e.t === 'restart' && e.type === 'penalty') tot.pens++;
        }
        const moving = g.ball.speed > 0.05 || g.players.some(p => Math.hypot(p.vx, p.vz) > 0.3);
        if (g.phase === 'play' && g.ball.speed < 0.05 && !g.owner) still += 1 / 20; else still = 0;
        tot.maxStill = Math.max(tot.maxStill, still);
        if (still > 6) { tot.stuck++; still = 0; }
        if (!moving && g.phase === 'play') tot.stuck += 0.001;
      }
    } catch (e) { tot.errors++; console.log('  ERROR', e.stack.split('\n').slice(0, 3).join(' | ')); }
    tot.wall += Date.now() - t0;
    const S = g.stats;
    for (const t of [0, 1]) { tot.goals[t] += g.score[t]; tot.shots[t] += S.shots[t]; tot.passes[t] += S.passes[t]; tot.ok[t] += S.passesOk[t]; tot.steals[t] += S.steals[t]; tot.fouls[t] += S.fouls[t]; tot.saves[t] += S.saves[t]; tot.poss[t] += S.poss[t]; }
    console.log(`  ${level} #${m + 1}: ${g.score[0]}-${g.score[1]}  fase final ${g.phase}  tiros ${S.shots.join('/')}  pases ${S.passesOk.join('/')} de ${S.passes.join('/')}  robos ${S.steals.join('/')}  faltas ${S.fouls.join('/')}  paradas ${S.saves.join('/')}  posesión ${S.poss.map(x => x.toFixed(0)).join('/')} s`);
    ok(g.phase === 'end', `${level} #${m + 1} termina`);
  }
  console.log(`  ${level}: goles ${tot.goals.join('-')}, fueras ${JSON.stringify(tot.outs)}, penaltis ${tot.pens}, balón parado más largo ${tot.maxStill.toFixed(1)} s, ${(tot.wall / +N).toFixed(0)} ms por partido`);
  ok(tot.errors === 0, `${level}: sin errores`);
  ok(tot.goals[0] > 0 && tot.goals[1] > 0, `${level}: goles en los dos sentidos`);
  ok(tot.stuck < 1, `${level}: sin bloqueos del balón`);
}

// ---------------------------------------------------------------- casos de reglas
console.log('== Casos de reglas ==');
// partido detenido en juego con el balón donde se pide; devuelve los eventos de los siguientes segundos
function scene(setup, secs = 2.5) {
  const g = new FutbolGame({ autoplay: true, seed: 5, replays: false });
  g.start(); g.restart = null; g.phase = 'play'; g.owner = null;
  // los jugadores lejos para que no se metan
  for (const p of g.players) { p.x = (p.team ? 1 : -1) * 3; p.z = -20 + p.id * 0.6; p.vx = p.vz = 0; p.react = 99; }
  for (const k of [g.gk(0), g.gk(1)]) { k.x = k.team ? 40 : -40; k.z = -30; k.react = 99; }
  g.keeper = () => {}; g.drain();
  setup(g);
  const ev = [];
  for (let t = 0; t < secs; t += 1 / 120) { g.step(1 / 120); ev.push(...g.drain()); if (g.phase !== 'play') break; }
  return { g, ev, has: (k, f = () => true) => ev.some(e => e.t === k && f(e)) };
}
const shooter = (g) => g.byRole(0, 'DCD');
const foe = (g, i = 2) => g.players[NR + i];
// 1) gol por debajo del larguero (tiro hacia la portería de +x, que ataca el equipo 0 en la primera parte)
{ const r = scene(g => { g.ball.set(HL - 4, 0, R); g.ball.kick(20, 1.8, 0.2); g.last = shooter(g); });
  ok(r.has('goal', e => e.team === 0), 'gol por debajo del larguero'); }
// 1b) por encima del larguero: no es gol
{ const r = scene(g => { g.ball.set(HL - 8.5, 0, R); g.ball.kick(20, 9, 0); g.last = shooter(g); });
  ok(!r.has('goal') && r.has('out', e => e.type === 'goalkick'), 'por encima del larguero: saque de portería, no gol'); }
// 2) al poste: rebota, no es gol
{ const r = scene(g => { g.ball.set(HL - 4, F.goalW / 2 + F.postR + 0.03, 0.6); g.ball.kick(18, 0.5, 0); g.last = shooter(g); }, 0.6);
  ok(r.has('post') && !r.has('goal'), 'balón al poste sin gol'); }
// 2b) al larguero desde abajo
{ const r = scene(g => { g.ball.set(HL - 3, 0, F.goalH + 0.04); g.ball.v.y = 0; g.ball.kick(16, 1.0, 0); g.last = shooter(g); }, 0.6);
  ok(r.has('bar') || r.has('post'), 'balón al larguero'); }
// 3) entra por fuera de la red (lateral): no es gol
{ const r = scene(g => { g.ball.set(HL - 5.5, 8.5, R); g.ball.kick(14, 0.8, -6.0); g.last = shooter(g); });
  const inside = Math.abs(r.g.ball.p.z) < F.goalW / 2 && r.g.ball.p.x > F.HL;
  ok(!r.has('goal') && !inside, 'balón por fuera de la red lateral: no es gol'); }
// 3b) desde detrás de la portería hacia la red: tampoco
{ const g = new FutbolGame({ seed: 3 }); g.ball.set(HL + F.goalD + 0.6, 0.3, 0.5); g.ball.kick(-8, 1, 0); const ev = [];
  for (let i = 0; i < 120; i++) g.ball.step(1 / 120, ev);
  ok(g.ball.p.x > F.HL + F.goalD, 'la red por detrás no deja entrar el balón'); }
// 3c) la red retiene el balón dentro
{ const g = new FutbolGame({ seed: 3 }); g.ball.set(HL - 2, 0, R); g.ball.kick(28, 2, 0); const ev = [];
  for (let i = 0; i < 360; i++) g.ball.step(1 / 120, ev);
  const P = g.ball.p; ok(P.x > F.HL && P.x < F.HL + F.goalD && Math.abs(P.z) < F.goalW / 2 && ev.some(e => e.t === 'net'), 'la red absorbe y retiene el balón'); }
// 3d) colisión continua: un tiro a 30 m/s contra el poste no lo atraviesa
{ const g = new FutbolGame({ seed: 3 }); const pz = F.goalW / 2 + F.postR; g.ball.set(HL - 10, pz, 1.0); g.ball.v.y = 0; g.ball.kick(30, 0.3, 0); const ev = [];
  for (let i = 0; i < 120; i++) g.ball.step(1 / 120, ev);
  ok(ev.some(e => e.t === 'post') && g.ball.p.x < F.HL, 'tiro a 30 m/s al poste: rebota'); }
// 4) fuera de banda: saque de banda para el otro equipo
{ const r = scene(g => { g.ball.set(0, F.HW - 4, R); g.ball.kick(1, 0, 8); g.last = foe(g); });
  ok(r.has('out', e => e.type === 'throwin' && e.team === 0), 'fuera de banda: saque de banda del otro equipo'); }
// 5) fuera de fondo tocada por el defensor: córner; por el atacante: saque de portería
{ const r = scene(g => { g.ball.set(HL - 3, 12, R); g.ball.kick(12, 0, 1); g.last = foe(g, 1); });
  ok(r.has('out', e => e.type === 'corner' && e.team === 0), 'fuera de fondo tocada por el defensor: córner'); }
{ const r = scene(g => { g.ball.set(HL - 3, 12, R); g.ball.kick(12, 0, 1); g.last = shooter(g); });
  ok(r.has('out', e => e.type === 'goalkick' && e.team === 1), 'fuera de fondo tocada por el atacante: saque de portería'); }
// 6) falta: entrada por detrás en el centro del campo → tiro libre; dentro del área → penalti
for (const [x, want] of [[0, 'free'], [HL - 7, 'penalty']]) {
  const g = new FutbolGame({ autoplay: true, seed: 9, replays: false }); g.start(); g.restart = null; g.phase = 'play';
  for (const p of g.players) { p.x = -30 + p.id * 1.4; p.z = -25; p.react = 99; }
  const att = shooter(g), def = foe(g, 3); att.x = x; att.z = 0; att.h = Math.PI / 2; att.vx = 3; att.react = 99; g.ball.set(x + 0.5, 0); g.owner = att; g.last = att;
  def.x = x - 1.6; def.z = 0; def.h = Math.PI / 2; def.react = 99; g.drain();
  g.tackle(def, 'slide');
  const ev = []; for (let t = 0; t < 2.6; t += 1 / 120) { g.step(1 / 120); ev.push(...g.drain()); }
  ok(ev.some(e => e.t === 'foul') && ev.some(e => e.t === 'restart' && e.type === want), `entrada por detrás en x=${x}: ${want === 'free' ? 'tiro libre' : 'penalti'}`);
}
// 7) robo de frente con el balón separado del pie: se gana casi siempre
{ let won = 0;
  for (let i = 0; i < 40; i++) {
    const g = new FutbolGame({ seed: 100 + i, replays: false }); g.start(); g.restart = null; g.phase = 'play';
    for (const p of g.players) { p.x = -30 + p.id * 1.4; p.z = -25; p.react = 99; }
    const att = foe(g, 9), me = shooter(g); g.me = me;
    att.x = 0; att.z = 0; att.h = -Math.PI / 2; att.vx = -4; g.ball.set(-0.7, 0); g.ball.kick(-5, 0, 0); g.owner = att; g.last = att;
    me.x = -1.9; me.z = 0.1; me.h = Math.PI / 2;
    g.step(1 / 120); g.press('pass');
    for (let t = 0; t < 0.6; t += 1 / 120) g.step(1 / 120);
    if (g.owner === me) won++;
  }
  console.log(`  robos de frente ganados: ${won}/40`); ok(won >= 24, 'robar el balón funciona (de frente, con el balón separado del pie)'); }
// 8) tanda de penaltis: termina con ganador
{ const g = new FutbolGame({ mode: 'penalties', autoplay: true, seed: 21, level: 'normal' }); g.start();
  let t = 0; while (g.phase !== 'end' && t < 300) { g.update(1 / 20); t += 1 / 20; }
  ok(g.phase === 'end' && g.result && g.result.pens[0] !== g.result.pens[1], `tanda de penaltis con ganador (${g.result?.pens?.join('-')})`); }

// 9) fuera de juego: pase a un compañero por detrás de los defensas → tiro libre indirecto para el rival
{ const r = scene(g => {
    const p = shooter(g), q = g.byRole(0, 'DCI');
    for (const d of g.team(1)) { const i = d.id % NR; d.x = 20; d.z = (i % 2 ? 1 : -1) * (8 + i * 2); }
    g.gk(1).x = HL - 1; g.gk(1).z = 0;
    p.x = 5; p.z = 0; p.react = 99; q.x = 30; q.z = 2; q.react = 99; g.ball.set(5.5, 0); g.owner = p; g.last = p;
    g.passBall(p, q, false, 0); q.react = 0; g.keeper = () => {};
  }, 5);
  ok(r.has('offside', e => e.team === 1) && r.g.pendingRestart?.indirect && r.g.pendingRestart.team === 1, 'pase al que está en fuera de juego: tiro libre indirecto'); }
// 9b) en línea con el penúltimo defensor no es fuera de juego
{ const g = new FutbolGame({ seed: 3 }); g.start(); g.restart = null; g.phase = 'play';
  for (const d of g.team(1)) { d.x = 20; d.z = -20 + (d.id % NR) * 3; } g.gk(1).x = HL - 1;
  const q = g.byRole(0, 'DCI'); q.x = 20; g.ball.set(5, 0);
  ok(!g.isOffside(q), 'en línea con el penúltimo: no es fuera de juego'); q.x = 21; ok(g.isOffside(q), 'un metro por delante: fuera de juego'); g.ball.set(25, 0); ok(!g.isOffside(q), 'por detrás del balón: no es fuera de juego'); }
// 10) saque de banda: con las manos desde la línea y el balón vuelve al campo
{ const g = new FutbolGame({ autoplay: true, seed: 4, replays: false }); g.start(); g.setPiece('throwin', 0, 10, F.HW);
  const tk = g.restart.taker; let thrown = null, t = 0;
  while (t < 4 && !thrown) { g.step(1 / 120); t += 1 / 120; for (const e of g.drain()) if (e.t === 'kick') thrown = e; }
  ok(thrown?.kind === 'throw' && g.phase === 'play' && Math.abs(g.ball.p.z) < F.HW, `saque de banda con las manos (${thrown?.kind}, ${g.phase})`); }
// 11) saque de meta: desde el suelo en el área de meta, con los rivales fuera del área
{ const g = new FutbolGame({ autoplay: true, seed: 4, replays: false }); g.start(); g.setPiece('goalkick', 1, HL - F.box, 4);
  const out = g.team(0).every(p => !g.inArea(1, p.x, p.z));
  let kicked = null, t = 0; while (t < 4 && !kicked) { g.step(1 / 120); t += 1 / 120; for (const e of g.drain()) if (e.t === 'kick') kicked = e; }
  ok(out && kicked && g.players[kicked.p].role === 'POR', 'saque de meta del portero con los rivales fuera del área'); }
console.log(fails ? `\n${fails} FALLOS` : '\nTodo correcto');
process.exit(fails ? 1 : 0);
