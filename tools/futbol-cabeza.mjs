// Fútbol: tiro dirigido (la diana se mueve con el joystick y el balón va a donde está) y centros al área con remate de
// cabeza (el tuyo y la IA). Sin gráficos.
// Uso: node tools/futbol-cabeza.mjs [intentos]
import { FutbolGame } from '../src/futbol/game.js';
import { FIELD as F, PLAYER as PL } from '../src/futbol/rules.js';

const [,, N = '40'] = process.argv;
let fails = 0;
const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
const HW = F.goalW / 2;
const mk = (k, o = {}) => { const g = new FutbolGame({ level: 'normal', replays: false, seed: 104729 * k + 17, ...o }); g.start(); g.restart = null; g.phase = 'play'; g.drain(); return g; };
// todos lejos y quietos salvo los que se colocan
// (dos defensas rivales se quedan atrás, lejos por las bandas, para que no haya fuera de juego)
const clear = (g, keep = []) => {
  for (const p of g.players) if (!keep.includes(p) && p.role !== 'POR') { p.x = -F.HL * 0.6; p.z = (p.id - 10) * 2.5; p.vx = p.vz = 0; p.react = 99; }
  const s = g.dir[0]; g.team(1).filter(p => p.role !== 'POR' && !keep.includes(p)).slice(0, 2).forEach((p, i) => { p.x = s * (F.HL - 3); p.z = (i ? 1 : -1) * (F.HW - 2); });
};
// dónde cruza el balón la línea de gol (o null si no llega)
function crossLine(g, s, max = 3) {
  for (let i = 0; i < max * 120; i++) { g.step(1 / 120); g.drain(); const B = g.ball.p; if (s * B.x >= F.HL) return { z: B.z, y: B.y }; if (g.phase !== 'play') return null; }
  return null;
}

console.log('== Tiro dirigido ==');
{
  // con el joystick hacia un lado de la portería, la diana va de palo a palo según cuánto se inclina
  const res = [];
  for (const lat of [-1, -0.5, 0, 0.5, 1]) {
    const zs = [];
    for (let k = 0; k < +N / 4; k++) {
      const g = mk(k + 1), me = g.me, s = g.dir[0]; clear(g, [me]); g.gk(1).react = 99;
      me.x = s * (F.HL - 17); me.z = 0; me.h = s > 0 ? Math.PI / 2 : -Math.PI / 2; me.vx = me.vz = 0; g.ball.set(me.x + s * 0.5, 0); g.owner = me;
      // joystick: hacia la portería y hacia un lado (lat de −1 a 1 = el seno del ángulo)
      const ax = s * Math.sqrt(1 - lat * lat), az = lat; g.setMove(ax, az, 1, false); g.press('shoot');
      for (let i = 0; i < 40; i++) { g.step(1 / 120); g.setMove(ax, az, 1, false); }
      const aim = g.shotPreview(); const k1 = g.gk(1); k1.x = s * (F.HL - 3); k1.z = 30; k1.down = 99; k1.dive = null; g.release('shoot');   // (sin portero: se mide la puntería)
      const c = crossLine(g, s); if (c) zs.push({ z: c.z, aim: aim.z });
    }
    const m = zs.reduce((a, b) => a + b.z, 0) / Math.max(1, zs.length), dev = zs.reduce((a, b) => a + Math.abs(b.z - b.aim), 0) / Math.max(1, zs.length);
    res.push({ lat, z: +m.toFixed(2), dev: +dev.toFixed(2), n: zs.length, aim: +(zs[0]?.aim ?? 0).toFixed(2) });
  }
  console.log('  ', JSON.stringify(res));
  ok(res.every(r => r.n >= +N / 4 - 1), 'todos los tiros llegan a la línea de gol');
  ok(Math.abs(res[2].z) < 0.5, `joystick recto: al centro (${res[2].z} m)`);
  ok(res[4].z > HW - 1.2 && res[4].z < HW + 0.4 && res[0].z < -HW + 1.2 && res[0].z > -HW - 0.4, `joystick a un lado: junto al palo (${res[0].z} y ${res[4].z} m; palo a ${HW.toFixed(2)})`);
  ok(res[3].z > 0.8 && res[3].z < HW - 0.6 && res[1].z < -0.8, `a medias: a medio camino (${res[1].z} y ${res[3].z} m)`);
  ok(res.every(r => r.dev < 0.9), `el balón va a la diana (desvío medio ${res.map(r => r.dev).join(', ')} m)`);
}
{
  // cargando el tiro, el joystick apunta y el jugador sigue su carrera (no se va hacia un lado)
  const g = mk(7), me = g.me, s = g.dir[0]; clear(g, [me]);
  me.x = s * (F.HL - 25); me.z = 0; me.vx = s * 5; me.vz = 0; me.h = Math.atan2(me.vx, 0); g.ball.set(me.x + s * 0.5, 0); g.owner = me;
  g.setMove(s, 0, 1, false); for (let i = 0; i < 20; i++) g.step(1 / 120);
  g.press('shoot'); const z0 = me.z;
  for (let i = 0; i < 70; i++) { g.setMove(0, 1, 1, false); g.step(1 / 120); }
  const tz = g.shotPreview()?.z ?? 0;
  ok(Math.abs(me.z - z0) < 0.4 && s * me.vx > 2, `con el joystick de lado mientras carga, sigue recto (se desvía ${(me.z - z0).toFixed(2)} m, va a ${(s * me.vx).toFixed(1)} m/s)`);
  ok(tz > HW - 0.8, `y la diana se ha ido al palo (${tz.toFixed(2)} m)`);
  // la diana se desliza: a los 30 ms aún no ha llegado al otro palo
  g.setMove(s * 0.1, -1, 1, false); g.step(1 / 120); g.step(1 / 120); g.step(1 / 120); g.step(1 / 120);
  const mid = g.shotPreview()?.z ?? 0;
  ok(mid > -HW + 1 && mid < tz, `la diana se desliza hacia el otro palo sin saltar (${mid.toFixed(2)} m a los 33 ms)`);
  g.release('shoot');
}

console.log('== Centro y remate de cabeza (el tuyo) ==');
{
  let crosses = 0, heads = 0, onGoal = 0, goals = 0, low = 0;
  const hy = [];
  for (let k = 0; k < +N; k++) {
    const g = mk(100 + k), s = g.dir[0], me = g.me; clear(g);
    // extremo en la banda, cerca del área; el delantero, en el área esperando
    const w = g.players.find(p => p.team === 0 && p.role !== 'POR' && p !== me) || me;
    const st = g.players.find(p => p.team === 0 && p.role !== 'POR' && p !== w);
    g.setMe(w, 'force'); g.switchCD = 9;
    w.x = s * (F.HL - 14 - (k % 4) * 3); w.z = (k % 2 ? 1 : -1) * (F.areaW / 2 + 2 + (k % 3) * 2); w.vx = s * 3; w.vz = 0; w.h = Math.atan2(w.vx, 0); g.ball.set(w.x + s * 0.5, w.z); g.owner = w;
    st.x = s * (F.HL - 8 - (k % 3) * 2); st.z = -Math.sign(w.z) * (k % 5) * 0.8; st.vx = st.vz = 0; st.react = 0;
    // pase hacia el delantero: es un centro
    const dx = st.x - w.x, dz = st.z - w.z, l = Math.hypot(dx, dz); g.setMove(dx / l, dz / l, 1, false); g.press('pass'); g.release('pass');
    const ev = g.drain(); if (!ev.some(e => e.t === 'cross')) continue; crosses++;
    // ya llevas al delantero: mantén TIRO apuntando a un palo
    const side = k % 2 ? 1 : -1; g.setMove(s * 0.45, side * 0.89, 1, false); g.press('shoot');
    let headed = false;
    for (let i = 0; i < 400 && g.phase === 'play'; i++) {
      g.setMove(s * 0.45, side * 0.89, 1, false);
      const y = g.ball.p.y; g.step(1 / 120);
      for (const e of g.drain()) {
        if (e.t === 'header' && e.p === st.id && e.kind === 'shot') { headed = true; hy.push(y); }
        if (e.t === 'goal') goals++;
      }
      if (headed && g.owner) break;
    }
    if (headed) { heads++; }
    // ¿iba a portería? (el portero lo ha parado o ha entrado)
    if (headed && (g.stats.onTarget[0] > 0 || g.phase === 'goal')) onGoal++;
    if (!headed && g.owner === st) low++;
  }
  hy.sort((a, b) => a - b);
  console.log(`   centros ${crosses}/${+N}, remates ${heads}, a puerta ${onGoal}, goles ${goals}; altura del balón al rematar ${hy.length ? hy[0].toFixed(2) + '–' + hy[hy.length - 1].toFixed(2) : '-'} m; controlados abajo ${low}`);
  ok(crosses >= +N * 0.9, 'PASE desde la banda hacia el área es un centro');
  ok(heads >= crosses * 0.75, `el delantero remata de cabeza casi siempre (${heads} de ${crosses})`);
  ok(hy.every(y => y > 1.1 && y < 2.55), 'a la altura de la cabeza');
  ok(onGoal >= heads * 0.45 && goals >= 2 && goals <= heads * 0.75, `remates a puerta ${onGoal}, goles ${goals} (ni imposible ni seguro)`);
}

console.log('== Partidos IA contra IA: centros y cabezazos ==');
{
  const tot = { cross: 0, head: 0, headShot: 0, clear: 0, goals: 0, headGoals: 0, errors: 0 };
  for (let m = 0; m < 4; m++) {
    const g = new FutbolGame({ level: 'normal', duration: 3, autoplay: true, seed: 104729 * (m + 3) + 5, replays: false });
    g.start(); let lastHead = -9;
    try {
      for (let t = 0; t < 400 && g.phase !== 'end'; t += 1 / 20) {
        g.update(1 / 20);
        for (const e of g.drain()) {
          if (e.t === 'cross') tot.cross++;
          if (e.t === 'header') { tot.head++; if (e.kind === 'shot') { tot.headShot++; lastHead = g.time; } if (e.kind === 'clear') tot.clear++; }
          if (e.t === 'goal') { tot.goals++; if (g.time - lastHead < 2.5) tot.headGoals++; }
        }
      }
    } catch (err) { tot.errors++; console.log(err); }
  }
  console.log('  ', JSON.stringify(tot));
  ok(tot.errors === 0, 'sin errores');
  ok(tot.cross >= 4 && tot.head >= 4, `hay centros (${tot.cross}) y cabezazos (${tot.head}) en 4 partidos`);
  ok(tot.headGoals <= Math.max(2, tot.goals * 0.5), `los goles de cabeza no se comen el partido (${tot.headGoals} de ${tot.goals})`);
}
console.log('== Fútbol sala: centros y cabezazos sin errores ==');
{
  const tot = { cross: 0, head: 0, goals: 0, errors: 0 };
  for (let m = 0; m < 3; m++) {
    const g = new FutbolGame({ format: 'sala', surface: 'pista', level: 'normal', duration: 3, autoplay: true, seed: 104729 * (m + 11) + 3, replays: false });
    g.start();
    try { for (let t = 0; t < 400 && g.phase !== 'end'; t += 1 / 20) { g.update(1 / 20); for (const e of g.drain()) { if (e.t === 'cross') tot.cross++; if (e.t === 'header') tot.head++; if (e.t === 'goal') tot.goals++; } } }
    catch (err) { tot.errors++; console.log(err); }
  }
  console.log('  ', JSON.stringify(tot));
  ok(tot.errors === 0 && tot.goals > 0, 'sala: partidos sin errores y con goles');
}
console.log(fails ? `\n${fails} FALLOS` : '\nTodo OK');
process.exit(fails ? 1 : 0);
