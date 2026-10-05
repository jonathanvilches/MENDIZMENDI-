// Sensación de juego, segunda parte (sin gráficos): tirar, pasar con un rival encima, el pase al hueco y robar.
//  1. tiro: desde la frontal y desde dentro del área, apuntando a un lado, con poca, media y mucha fuerza contra un
//     portero de nivel normal: a puerta, gol, fuera
//  2. pase con presión: un rival a 1–2 m mientras pasas a un compañero a 10–20 m (otro rival cerca de la línea)
//  3. pase al hueco: al delantero que corre a la espalda de la defensa: lo recibe en carrera
//  4. robar: tu jugador sale a por un rival de nivel normal que conduce; cuántas veces se lo quitas en 4 s (robo o
//     presionar y robo) y cuántas faltas haces
// Uso: node tools/control-feel2.mjs [f11|sala]
import { FutbolGame } from '../src/futbol/game.js';
import { FIELD as F } from '../src/futbol/rules.js';
const formats = process.argv[2] ? [process.argv[2]] : ['f11', 'sala'];
const H = 1 / 120;
function fresh(format, seed, level = 'normal') {
  const g = new FutbolGame({ seed, replays: false, format, level }); g.start(); g.restart = null; g.phase = 'play'; g.owner = null;
  for (const p of g.players) { p.x = (p.team ? 1 : -1) * (F.HL - 3); p.z = (p.id % 11) * 1.2 - 6; p.vx = p.vz = 0; p.react = 99; p.think = 99; }
  g.drain(); return g;
}
const freeze = (g, keep) => { for (const p of g.players) if (!keep.includes(p) && p.role !== 'POR') { p.vx = p.vz = 0; p.wx = p.wz = 0; } };
// 1. tiro
function shotTest(format, dist, charge, n = 40) {
  let on = 0, goal = 0, out = 0;
  for (let i = 0; i < n; i++) {
    const g = fresh(format, 300 + i), me = g.me, gk = g.gk(1), s = g.dir[0], gx = s * F.HL;
    const zs = (i % 5 - 2) * (F.areaD ? 1.5 : 3);
    me.x = gx - s * dist; me.z = zs; me.h = s > 0 ? Math.PI / 2 : -Math.PI / 2; g.ball.set(me.x + s * 0.45, zs); g.owner = me;
    gk.x = gx - s * 1.5; gk.z = zs * 0.2; gk.react = 0; gk.think = 0; gk.threat = null;
    // (los demás, lejos: solo tirador contra portero)
    for (const p of g.players) if (p !== me && p !== gk && p !== g.gk(0)) { p.x = -s * 10 + (p.id % 11); p.z = (p.id % 11) * 2 - 10; }
    // apunta al palo contrario del portero: joystick hacia la portería y a un lado
    const side = i % 2 ? 1 : -1, ax = s, az = side * 0.35;
    g.setMove(ax, az, 0.9, false); g.step(H);
    g.press('shoot'); for (let t = 0; t < charge * 0.8; t += H) { g.setMove(ax, az, 0.9, false); g.step(H); } g.release('shoot');
    let res = 'nada';
    for (let t = 0; t < 4 && res === 'nada'; t += H) {
      g.setMove(0, 0, 0, false); g.step(H); freeze(g, [gk]);
      for (const e of g.drain()) { if (e.t === 'goal') res = 'gol'; else if (e.t === 'save') res = 'parada'; else if (e.t === 'out') res = 'fuera'; }
      if (res === 'nada' && (g.owner === gk || (gk.hands))) res = 'parada';
      if (res === 'nada' && g.phase !== 'play') res = 'fuera';
    }
    if (res === 'gol') { goal++; on++; } else if (res === 'parada') on++; else if (res === 'fuera' || res === 'palo') out++;
  }
  return { on: on / n, goal: goal / n, out: out / n };
}
// 2. pase con presión
function pressPassTest(format, d, n = 40) {
  let ok = 0, cut = 0;
  for (let i = 0; i < n; i++) {
    const g = fresh(format, 500 + i), me = g.me, mate = g.team(0).find(q => q !== me && q.role !== 'POR');
    const foe = g.team(1).find(q => q.role !== 'POR'), foe2 = g.team(1).filter(q => q.role !== 'POR')[1];
    me.x = -5; me.z = 0; me.h = Math.PI / 2; g.ball.set(me.x + 0.45, 0); g.owner = me;
    const a = (i % 7 - 3) * 0.25; mate.x = me.x + d * Math.cos(a); mate.z = d * Math.sin(a);
    foe.x = me.x + 1.4; foe.z = (i % 3 - 1) * 1.2; foe.react = 0.3; foe.think = 0;
    foe2.x = (me.x + mate.x) / 2 + 1; foe2.z = (me.z + mate.z) / 2 + (i % 2 ? 3 : -3); foe2.react = 0.3; foe2.think = 0;
    const dx = mate.x - me.x, dz = mate.z - me.z, l = Math.hypot(dx, dz);
    g.setMove(dx / l, dz / l, 0.6, false); g.step(H); g.press('pass'); g.step(H); g.release('pass');
    let res = null;
    for (let t = 0; t < 3.5 && !res; t += H) { g.setMove(0, 0, 0, false); g.step(H); freeze(g, [foe, foe2, mate]); for (const e of g.drain()) if (e.t === 'control' && e.p !== me.id) res = g.players[e.p].team === 0 ? 'ok' : 'cortado'; if (e => 0) {} }
    if (res === 'ok') ok++; else if (res === 'cortado') cut++;
  }
  return { ok: ok / n, cut: cut / n };
}
// 3. pase al hueco: el delantero, a la altura de los dos centrales (separados `gap` metros), arranca hacia la portería
function throughTest(format, gap, n = 20) {
  let ok = 0;
  for (let i = 0; i < n; i++) {
    const g = fresh(format, 700 + i), me = g.me, s = g.dir[0], x0 = F.HL * 0.4;
    const fw = g.team(0).find(q => q !== me && q.role !== 'POR' && q.line >= 2) || g.team(0).find(q => q !== me && q.role !== 'POR');
    const def = g.team(1).filter(q => q.role !== 'POR').slice(0, 2);
    me.x = s * 2; me.z = 0; me.h = Math.PI / 2; g.ball.set(me.x + 0.45, 0); g.owner = me;
    fw.x = s * x0; fw.z = (i % 5 - 2); fw.vx = s * 5; fw.vz = 0;
    def.forEach((q, k) => { q.x = s * x0; q.z = (k ? 1 : -1) * gap / 2 + fw.z * 0.3; q.react = 0; q.think = 0; q.vx = q.vz = 0; });
    g.setMove(s, (fw.z - me.z) / 12, 0.7, false); g.step(H); g.press('through'); g.step(H); g.release('through');
    let res = null;
    for (let t = 0; t < 4 && !res; t += H) {
      g.setMove(s, 0, 1, true); g.step(H); freeze(g, [fw, ...def, g.gk(1)]);
      for (const e of g.drain()) if (['control', 'block', 'catch', 'gkBall', 'save'].includes(e.t)) res = g.players[e.p] === fw ? 'ok' : 'no';
      if (!res && g.phase !== 'play') res = 'no';
    }
    if (res === 'ok') ok++;
  }
  return { ok: ok / n };
}
// 4. robar
function tackleTest(format, how, n = 30) {
  let won = 0, fouls = 0, total = 0;
  for (let i = 0; i < n; i++) {
    const g = fresh(format, 900 + i), foe = g.team(1).find(q => q.role !== 'POR');
    foe.x = 6; foe.z = (i % 5 - 2); foe.h = -Math.PI / 2; g.ball.set(foe.x - 0.45, foe.z); g.owner = foe; foe.react = 0;
    g.me.x = -2; g.me.z = 0; g.noSwitch = true;
    let t = 0, res = null, tried = 0;
    for (; t < 4 && !res; t += H) {
      const me = g.me, b = g.ball.p, dx = b.x - me.x, dz = b.z - me.z, d = Math.hypot(dx, dz) || 1;
      // el rival conduce hacia tu portería y regatea un poco (no pasa ni tira)
      if (g.owner === foe) { foe.react = 0; foe.plan = { kind: 'dribble', dx: -1, dz: Math.sin(t * 2 + i) * 0.5, v: 1, speed: 3.2 }; foe.think = 1; }
      g.input.contain = how === 'presionar' && d < 4;
      g.setMove(dx / d, dz / d, 1, d > 3);
      if (d < 1.3 && g.owner === foe && tried <= 0 && how !== 'presionar') { g.press(how === 'entrada' ? 'shoot' : 'pass'); g.step(H); g.release(how === 'entrada' ? 'shoot' : 'pass'); tried = 0.7; }
      if (how === 'presionar' && d < 1.2 && g.owner === foe && tried <= 0) { g.press('pass'); g.step(H); g.release('pass'); tried = 0.9; }
      tried -= H; g.step(H); freeze(g, [foe]);
      for (const e of g.drain()) { if (e.t === 'foul') res = 'falta'; }
      if (!res && g.owner === g.me) res = 'robo';
      if (!res && g.owner !== foe && how === 'entrada' && t > 0.1) res = 'robo';
      if (!res && g.owner && g.owner !== foe) res = 'otro';
    }
    if (res === 'robo') { won++; total += t; } if (res === 'falta') fouls++;
  }
  return { won: won / n, fouls: fouls / n, t: won ? total / won : 0 };
}
for (const format of formats) {
  console.log(format === 'f11' ? '== Fútbol 11' : '== Fútbol sala');
  fresh(format, 1);   // (carga las medidas del formato)
  for (const dist of F.areaD ? [7, 11] : [11, 18]) for (const c of [0.35, 0.65, 1]) {
    const r = shotTest(format, dist, c);
    console.log(`  tiro desde ${dist} m, fuerza ${Math.round(c * 100)} %: a puerta ${(r.on * 100).toFixed(0)} %, gol ${(r.goal * 100).toFixed(0)} %, fuera ${(r.out * 100).toFixed(0)} %`);
  }
  for (const d of [10, 20]) { const r = pressPassTest(format, d); console.log(`  pase de ${d} m con un rival encima: llega ${(r.ok * 100).toFixed(0)} %, lo cortan ${(r.cut * 100).toFixed(0)} %`); }
  for (const gap of F.areaD ? [6, 9] : [8, 12, 16]) { const r = throughTest(format, gap); console.log(`  pase al hueco entre centrales separados ${gap} m: lo recibe ${(r.ok * 100).toFixed(0)} %`); }
  for (const how of ['robo', 'presionar', 'entrada']) { const r = tackleTest(format, how); console.log(`  defender (${how}) contra un rival normal: robas ${(r.won * 100).toFixed(0)} % (en ${r.t.toFixed(1)} s), faltas ${(r.fouls * 100).toFixed(0)} %`); }
}
