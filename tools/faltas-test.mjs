// Faltas, tarjetas, ventaja, penaltis y expulsiones en el fútbol, sin gráficos. Uso: node tools/faltas-test.mjs
import { FutbolGame } from '../src/futbol/game.js';
import { FIELD as F } from '../src/futbol/rules.js';
let fails = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
const mk = (o = {}) => { const g = new FutbolGame({ seed: 7, replays: false, ...o }); g.start(); g.restart = null; g.phase = 'play'; g.owner = null; for (const p of g.players) { p.x = (p.team ? 30 : -30); p.z = -F.HW + 2 + (p.id % 11) * 2; p.vx = p.vz = 0; p.react = 99; } g.drain(); return g; };
const run = (g, s) => { const ev = []; for (let t = 0; t < s; t += 1 / 120) { g.step(1 / 120); ev.push(...g.drain()); } return ev; };
const att = (g) => g.team(0).find(p => p.role.startsWith('DC')), def = (g) => g.team(1).find(p => p.role.startsWith('DFC') || p.role.startsWith('LD') || p.line === 1);
// 1. ocasión clara cortada fuera del área: roja y tiro libre; juega con uno menos
{ const g = mk(), a = att(g), d = def(g), gx = g.goalX(0);
  a.x = gx - 26; a.z = 0; a.vx = 6; g.ball.set(a.x + 0.5, 0); g.owner = a; d.x = a.x - 1; d.z = 0.3;
  for (const r of g.team(1)) if (r !== d && r.role !== 'POR') r.x = a.x - 10;
  g.foul(d, a, { slide: true, behind: true, ball: false }); const ev = g.drain();
  const card = ev.find(e => e.t === 'card');
  ok(card?.color === 'red' && d.off && g.team(1).length === 10 && g.pendingRestart?.type === 'free', `ocasión clara fuera del área: ${card?.color}, expulsado (${d.off}), quedan ${g.team(1).length}, ${g.pendingRestart?.type}`);
  const ev2 = run(g, 12); ok(g.restart?.type === 'free' || ev2.some(e => e.t === 'kick'), `se saca la falta sin el expulsado (${g.restart?.type || 'sacada'})`);
  ok(Math.abs(d.z) > F.HW, `el expulsado se va a la banda (z ${d.z.toFixed(1)})`); }
// 2. ocasión clara dentro del área: penalti y amarilla
{ const g = mk(), a = att(g), d = def(g), gx = g.goalX(0);
  a.x = gx - 10; a.z = 0; a.vx = 6; g.ball.set(a.x + 0.5, 0); g.owner = a; d.x = a.x - 1;
  for (const r of g.team(1)) if (r !== d && r.role !== 'POR') r.x = a.x - 10;
  g.foul(d, a, { slide: true, behind: true, ball: false }); const ev = g.drain(), card = ev.find(e => e.t === 'card');
  ok(card?.color === 'yellow' && g.pendingRestart?.type === 'penalty' && !d.off, `ocasión clara en el área: penalti (${g.pendingRestart?.type}) y ${card?.color}`);
  const ev2 = run(g, 9); const shot = ev2.find(e => e.t === 'shot'), res = ev2.find(e => e.t === 'goal' || e.t === 'save' || e.t === 'miss' || e.t === 'out');
  ok(!!shot && !!res, `el penalti se tira (${!!shot}) y acaba en ${res?.t}`); }
// 3. segunda amarilla: roja
{ const g = mk(), d = def(g); g.book(d, 'yellow'); g.drain(); g.book(d, 'yellow'); const ev = g.drain(), card = ev.find(e => e.t === 'card');
  ok(card?.color === 'red' && card.second && d.off && g.stats.yellow[1] === 2 && g.stats.red[1] === 1, `segunda amarilla: ${card?.color}${card?.second ? ' (por doble amarilla)' : ''}, amarillas ${g.stats.yellow[1]}, rojas ${g.stats.red[1]}`); }
// 4. ventaja: falta en campo rival con un compañero junto al balón
{ const g = mk(), a = att(g), m = g.team(0).find(p => p.role.startsWith('MC') || p.role.startsWith('MI')), d = def(g);
  a.x = 20; a.z = 5; g.ball.set(20.5, 5); g.owner = a; m.x = 21.5; m.z = 6; d.x = 19.4; d.z = 5;
  g.foul(d, a, { behind: true }); const ev = g.drain();
  ok(ev.some(e => e.t === 'advantage') && g.phase === 'play' && !g.pendingRestart, `ventaja: sigue el juego (${g.phase})`); }
// 5. tu jugador expulsado: pasas a llevar a otro
{ const g = mk(), me = g.me; g.book(me, 'red'); g.drain();
  ok(me.off && g.me !== me && !g.me.off, `te expulsan: llevas a otro (${g.me.role})`); }
// 6. saque de centro con un delantero expulsado
{ const g = mk(); const k = g.byRole(0, g.me.role); g.book(k, 'red'); g.drain(); g.kickoff(0); const ev = run(g, 5);
  ok(ev.some(e => e.t === 'kick') && !ev.some(e => e.t === 'kick' && e.p === k.id), `saque de centro sin el expulsado`); }
// 7. sala: el expulsado vuelve a los 2 minutos o al encajar
{ const g = mk({ format: 'sala', surface: 'parquet' }), d = g.team(1).find(p => p.role !== 'POR'); g.book(d, 'red'); g.drain();
  const n0 = g.team(1).length; for (let t = 0; t < 121; t += 1 / 60) { g.phase = 'play'; g.timers(d, 1 / 60); }
  ok(n0 === 4 && !d.off && g.team(1).length === 5, `sala: con uno menos (${n0}) y a los 2 minutos vuelve (${g.team(1).length})`);
  const e = g.team(1).find(p => p.role !== 'POR' && p !== d); g.book(e, 'red'); g.drain(); g.goal(0);
  ok(!e.off && g.team(1).length === 5, `sala: si encaja un gol, vuelve antes (${g.team(1).length})`); }
// 8. partidos enteros con tarjetas: sin errores
{ let cards = 0, reds = 0, errs = 0;
  for (let m = 0; m < 4; m++) { const g = new FutbolGame({ seed: 50 + m, duration: 3, autoplay: true, replays: false, level: 'dificil' }); g.start(); let t = 0;
    try { while (g.phase !== 'end' && t < 1200) { g.update(1 / 20); t += 1 / 20; for (const e of g.drain()) if (e.t === 'card') { cards++; if (e.color === 'red') reds++; } } } catch (e) { errs++; console.log(e.stack.split('\n').slice(0, 3).join(' | ')); }
    if (g.phase !== 'end') errs++; }
  ok(errs === 0, `4 partidos enteros sin errores (${cards} tarjetas, ${reds} rojas)`); }
console.log(fails ? `${fails} fallos` : 'Todo correcto');
