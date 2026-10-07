// Fútbol: control del jugador medido como lo vive quien juega. Un «jugador humano» de prueba usa solo el joystick y los
// botones (setMove, press, release) contra la IA y se anota lo que se notaría como un fallo:
//   escapa: el balón se va del pie sin rival cerca ni golpeo; sordo: pulsas pase o tiro con el balón y no sale nada;
//   lejos: el balón se separa más de 1,2 m del pie conduciendo; giro: lo que tarda en darse la vuelta con el balón;
//   pases buenos del humano; portero: paradas del portero llevado por el humano en tiros a puerta.
// Sin gráficos. Uso: node tools/futbol-control.mjs [partidos] [f11|sala]
import { FutbolGame } from '../src/futbol/game.js';
const [,, NM = '3', FMT = 'f11'] = process.argv;
const hyp = Math.hypot;
let fails = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
const tot = { min: 0, escapa: 0, sordo: 0, pulsa: 0, lejos: 0, pases: 0, pasesOk: 0, goles: [0, 0], tiros: 0, giros: [], ejemplos: [] };
for (let m = 0; m < +NM; m++) {
  const g = new FutbolGame({ level: 'normal', duration: 2, seed: 4242 + m * 31, replays: false, format: FMT, surface: FMT === 'sala' ? 'pista' : 'hierba' });
  g.start();
  let t = 0, pending = null, holdT = 0, holding = null, wasMine = false, zig = 0, turnTest = null;
  const s = () => g.dir[0];
  while (g.phase !== 'end' && t < 2 * 2 * 60 * 2.5) {
    const me = g.me, B = g.ball.p, live = g.phase === 'play';
    // ---- el «humano»
    if (g.owner === me && live) {
      const gx = g.goalX(0), dGoal = hyp(gx - me.x, me.z);
      // prueba de giro: de vez en cuando, media vuelta con el balón
      if (!turnTest && g.rnd() < 0.004) turnTest = { t0: t, dir: [-Math.sign(me.vx || s()), 0] };
      let mx, mz;
      if (turnTest) { [mx, mz] = turnTest.dir; const v = hyp(me.vx, me.vz); if (v > 1.5 && (me.vx * mx) / v > 0.86) { tot.giros.push(t - turnTest.t0); turnTest = null; } else if (t - turnTest.t0 > 2.5) { tot.giros.push(2.5); turnTest = null; } }
      else { zig += 1 / 30; mx = s(); mz = clamp(-me.z / 15, -0.6, 0.6) + Math.sin(zig * 2) * 0.5; }
      const l = hyp(mx, mz) || 1; g.setMove(mx / l, mz / l, 1, !turnTest && g.rnd() < 0.5);
      if (!holding && !pending && !turnTest) {
        const foe = g.nearestFoe(me);
        if (dGoal < 22 * (FMT === 'sala' ? 0.5 : 1)) { g.press('shoot'); holding = 'shoot'; holdT = 0.25 + g.rnd() * 0.35; }
        else if (foe < 2.2 && g.rnd() < 0.08) { g.press('pass'); holding = 'pass'; holdT = 0.05; }
      }
    } else if (live) {
      turnTest = null;   // (sin el balón, la prueba de giro no cuenta)
      // sin balón: ir a por él y robar cerca del rival
      const o = g.owner, tx = o ? o.x : B.x, tz = o ? o.z : B.z, dx = tx - me.x, dz = tz - me.z, d = hyp(dx, dz) || 1;
      g.setMove(dx / d, dz / d, d > 0.6 ? 1 : 0.2, d > 6);
      if (o && o.team === 1 && d < 1.4 && g.rnd() < 0.05) { g.press('pass'); g.release('pass'); }
    } else g.setMove(0, 0, 0, false);
    if (holding) { holdT -= 1 / 30; if (holdT <= 0) { tot.pulsa++; pending = { t, kind: holding, by: me, why: [g.hold.shoot.toFixed(2), g.owner === me, g.phase, !!g.gkCtl].join('|') }; g.release(holding); holding = null; } }
    // ---- un paso y lo que pasa
    const ownerBefore = g.owner, footD = ownerBefore ? hyp(B.x - (ownerBefore.x + Math.sin(ownerBefore.h) * 0.32), B.z - (ownerBefore.z + Math.cos(ownerBefore.h) * 0.32)) : 0;
    if (ownerBefore === g.me && live && footD > 1.2) tot.lejos++;
    g.update(1 / 30); t += 1 / 30;
    let kicked = false;
    for (const e of g.drain()) {
      if (e.t === 'kick' && g.players[e.p].team === 0) { kicked = true; if (pending && e.p === pending.by.id) pending = null; if (e.kind !== 'shot' && g.players[e.p] === ownerBefore && ownerBefore === g.players[e.p] && !g.autoplay) tot.pases++; if (e.kind === 'shot') tot.tiros++; }
      if (e.t === 'control' && g.players[e.p].team === 0 && wasMine) tot.pasesOk++;
      if (e.t === 'goal') tot.goles[e.team]++;
    }
    if (pending && t - pending.t > 0.7) { if (g.owner === pending.by && g.phase === 'play') { tot.sordo++; if (tot.ejemplos.length < 6) tot.ejemplos.push(['sordo', pending.kind, +t.toFixed(1), g.me.role, g.restart?.type || '', JSON.stringify(g.buffer), g.hold.shoot, pending.why || '']); } pending = null; }
    // balón que se escapa solo: era mío, ya no es de nadie, sin golpeo ni rival a menos de 2 m
    if (ownerBefore === g.me && !g.owner && !kicked && g.phase === 'play' && g.nearestFoe(ownerBefore) > 2) { tot.escapa++; if (tot.ejemplos.length < 6) tot.ejemplos.push(['escapa', +t.toFixed(1), +footD.toFixed(2), +hyp(ownerBefore.vx, ownerBefore.vz).toFixed(1)]); }
    wasMine = g.passTo ? g.passTo.team === 0 && (wasMine || kicked) : kicked ? true : wasMine && !!g.passTo;
  }
  tot.min += t / 60;
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
const per = (n) => +(n / tot.min).toFixed(2), gm = tot.giros.length ? +(tot.giros.reduce((a, b) => a + b, 0) / tot.giros.length).toFixed(2) : null;
console.log(JSON.stringify({ minutos: +tot.min.toFixed(1), escapa: tot.escapa, sordo: tot.sordo, pulsaciones: tot.pulsa, lejos: tot.lejos, tiros: tot.tiros, goles: tot.goles, giroMedio: gm, giroMax: Math.max(0, ...tot.giros).toFixed(2), ejemplos: tot.ejemplos }));
ok(per(tot.escapa) < 0.5, `el balón no se escapa solo del pie (${per(tot.escapa)} por minuto)`);
ok(tot.sordo <= tot.pulsa * 0.03, `pulsar con el balón siempre hace algo (${tot.sordo} de ${tot.pulsa} sin respuesta)`);
ok(tot.lejos < tot.min * 30 * 2, `conduciendo, el balón no se separa más de 1,2 m (${tot.lejos} fotogramas)`);
ok(gm !== null && gm < 0.9, `media vuelta con el balón en ${gm} s de media`);
console.log(fails ? fails + ' fallos' : 'Todo correcto');
