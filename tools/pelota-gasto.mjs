// Pelota: cuánto gasta tu pelotari con el joystick siempre a tope, como juega una persona (sin gráficos). Tres casos:
// pelotando normal, haciendo solo cortadas seguidas y con el rival haciéndote solo dejadas. Da tu energía al sacar, la
// más baja, lo que cuesta cada carrera a por una dejada y cada cortada, y en qué se va (golpes, carreras a por dejadas,
// moverse, parones). Uso: node tools/pelota-gasto.mjs [partidos por caso, 6]
import { PelotaGame } from '../src/pelota/game.js';
const DT = 1 / 30, N = +(process.argv[2] || 6);
function partido(seed, caso) {
  const g = new PelotaGame({ seed, target: 9, level: 'normal' });
  const base = g.aiShot.bind(g);
  if (caso === 'dejadas') g.aiShot = (who) => { if (g.phase === 'servePrep' || who !== 'rival') return base(who); const y = g.players.you; return { aim: { x: y.x > 0 ? -0.8 : 0.8, y: -0.7 }, drop: true }; };
  g.start(); let t = 0, holding = 0, min = 1, chase = null; const al = [], carreras = [], cortes = []; const B = { golpe: 0, caza: 0, mover: 0, parón: 0 };
  while (g.phase !== 'end' && t < 900) {
    const you = g.players.you, inp = { mx: 0, mz: 0, hit: false, aimX: 0, aimY: 0, power: 0.6 };
    if (g.phase === 'serveWait' && g.server === 'you') inp.hit = g.phaseT > 0.6;
    const c = g.phase === 'rally' && g.rally?.turn === 'you' ? g.interceptFor('you', 6.8, 0.1) : null;
    if (c) { const dx = c.x - you.x, dz = c.z - you.z, d = Math.hypot(dx, dz); if (d > 0.3) { inp.mx = dx / d; inp.mz = dz / d; } }
    else if (g.phase === 'rally') { const dx = 1 - you.x, dz = 20 - you.z, d = Math.hypot(dx, dz); if (d > 1) { inp.mx = dx / d * 0.6; inp.mz = dz / d * 0.6; } }
    if ((g.phase === 'rally' && g.rally?.turn === 'you') || (g.phase === 'servePrep' && g.server === 'you')) {
      holding += DT; inp.aiming = true; inp.aimX = 0; inp.aimY = 0.3;
      if (g.hittable('you')) { if (caso === 'cortadas' && g.phase === 'rally') inp.cut = true; else inp.hit = true; inp.power = 0.6; holding = 0; }
    } else holding = 0;
    const en0 = you.en;
    const ev = g.update(DT, inp); t += DT;
    const dejada = g.phase === 'rally' && g.rally?.turn === 'you' && g.rally?.kind === 'dejada';
    if (dejada && !chase) chase = { en: en0 };
    for (const e of ev) {
      if (e.type === 'serveReady') al.push(you.en);
      if (e.type === 'hit' && e.who === 'you') { if (chase) { carreras.push(chase.en - en0); chase = null; } if (e.shot === 'cortada') cortes.push(en0 - you.en); }
      if (e.type === 'call' && chase) { carreras.push(chase.en - you.en); chase = null; }
    }
    { const d = you.en - en0, k = ev.some(e => e.type === 'hit' && e.who === 'you') ? 'golpe' : (g.phase === 'rally' && g.rally?.turn === 'you' && g.rally?.kind === 'dejada') ? 'caza' : (g.phase === 'rally' || g.phase === 'servePrep') ? 'mover' : 'parón'; B[k] += d; }
    min = Math.min(min, you.en);
  }
  return { B, med: al.reduce((a, v) => a + v, 0) / Math.max(1, al.length), min, carreras, cortes, score: `${g.score.you}-${g.score.rival}` };
}
const pc = (v) => Math.round(v * 100), MED = {};
for (const caso of ['normal', 'cortadas', 'dejadas']) {
  const R = []; for (let i = 0; i < N; i++) R.push(partido(3000 + i * 7919, caso));
  const m = (k) => R.reduce((a, r) => a + r[k], 0) / R.length; MED[caso] = m('med'); const car = R.flatMap(r => r.carreras), cor = R.flatMap(r => r.cortes);
  const BB = {}; for (const r of R) for (const k in r.B) BB[k] = (BB[k] || 0) + r.B[k] / R.length;
  console.log('   por partido:', Object.entries(BB).map(([k, v]) => `${k} ${pc(v)}`).join('  '));
  console.log(`${caso.padEnd(9)} al sacar ${pc(m('med'))} %  mínima ${pc(m('min'))} %  carrera a una dejada ${car.length ? pc(car.reduce((a, v) => a + v, 0) / car.length) : '-'} % (${car.length})  cortada ${cor.length ? pc(cor.reduce((a, v) => a + v, 0) / cor.length) : '-'} %, las 4 primeras ${cor.slice(0, 4).map(pc).join(' ')}  ${R.map(r => r.score).join(' ')}`);
}
let bad = 0; const ok = (c, t) => { console.log(`  ${c ? 'OK ' : 'MAL'} ${t}`); if (!c) bad++; };
ok(MED.normal > 0.7, 'pelotando normal, al sacar te queda más del 70 %: moverse y colocarse casi no gasta');
ok(MED.cortadas < MED.normal - 0.3, 'con muchas cortadas seguidas, bastante menos');
ok(MED.dejadas < MED.normal - 0.3, 'si te hacen correr a por dejadas, bastante menos');
process.exit(bad ? 1 : 0);
