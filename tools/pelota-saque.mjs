// Pelota: el saque como en el frontón de verdad. El que saca empieza en el cuadro 7, corre hasta poco antes del 4, bota
// la pelota y saca; el que resta espera junto a la pared izquierda, sobre el 7. Se mira en el mano a mano y por parejas
// (con la IA), cuántos saques son tanto directo o falta, y que tú también puedas sacar así. Sin gráficos.
// Uso: node tools/pelota-saque.mjs [partidos]
import { PelotaGame } from '../src/pelota/game.js';
import { COURT } from '../src/pelota/rules.js';

const [,, N = '6'] = process.argv;
let fails = 0;
const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
const C7 = COURT.CUADRO * 7, C4 = COURT.FALTA, WALL = -COURT.W / 2;
const f1 = (v) => v.toFixed(1);

function run(pairs) {
  const r = { serves: 0, start: [], recv: [], drop: [], strike: [], runT: [], vmax: 0, aces: 0, faults: 0, errors: 0, clash: 0 };
  for (let k = 0; k < +N; k++) {
    const g = new PelotaGame({ mode: 'match', target: 5, level: 'normal', autoplay: true, pairs, youRole: k % 2 ? 'zaguero' : 'delantero', seed: 104729 * (k + 41) + 7, firstServe: k % 2 ? 'rival' : 'you' });
    let t = 0, readyT = 0, sv = null, vmax = 0;
    try {
      g.start();
      while (g.phase !== 'end' && t < 900) {
        const before = g.phase;
        const ev = g.update(1 / 30, {}); t += 1 / 30;
        if (before === 'serveWait' && sv) {
          vmax = Math.max(vmax, Math.hypot(sv.p.vx, sv.p.vz));
          // nadie en el camino del que saca mientras corre
          for (const id of g.ids) if (id !== sv.id) { const q = g.players[id]; if (Math.hypot(q.x - sv.p.x, q.z - sv.p.z) < 1.2) r.clash++; }
        }
        for (const e of ev) {
          if (e.type === 'serveReady') {
            const id = g.serverP(), p = g.players[id]; sv = { id, p }; readyT = t; vmax = 0; r.serves++;
            r.start.push({ x: p.x, z: p.z });
            // el que resta: en el mano a mano, el otro; por parejas, el zaguero del otro lado
            const rid = pairs ? g.team(g.other(g.server)).find(i => g.role[i] === 'zaguero') : g.other(g.server), q = g.players[rid];
            r.recv.push({ x: q.x, z: q.z });
          }
          if (e.type === 'drop' && sv) { r.drop.push(sv.p.z); r.runT.push(t - readyT); r.vmax = Math.max(r.vmax, vmax); }
          if (e.type === 'hit' && g.rally?.serve && g.rally.hits === 1) r.strike.push(e.z);
          if (e.type === 'call' && g.rally?.serve) {
            if (e.call === 'falta' || e.call === 'pasa') r.faults++;
            else if (e.winner === g.rally.striker) r.aces++;
          }
        }
      }
    } catch (e) { r.errors++; console.log(e); }
  }
  return r;
}
const avg = (a) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
const rng = (a, f = (v) => v) => a.length ? `${f1(Math.min(...a.map(f)))} a ${f1(Math.max(...a.map(f)))}` : '—';

for (const pairs of [false, true]) {
  const r = run(pairs);
  console.log(`${pairs ? 'parejas' : 'mano a mano'}: ${r.serves} saques`);
  console.log(`   sale de z ${rng(r.start, p => p.z)} (cuadro 7 = ${C7}), x ${rng(r.start, p => p.x)}`);
  console.log(`   el que resta en x ${rng(r.recv, p => p.x)} (pared en ${WALL}), z ${rng(r.recv, p => p.z)}`);
  console.log(`   bota en z ${rng(r.drop)} y golpea en z ${rng(r.strike)} (cuadro 4 = ${C4}); carrera ${f1(avg(r.runT))} s, punta ${f1(r.vmax)} m/s`);
  console.log(`   tanto directo de saque ${(r.aces / r.serves * 100).toFixed(1)} %, falta o pasa ${(r.faults / r.serves * 100).toFixed(1)} %`);
  ok(r.errors === 0, 'sin errores');
  ok(r.start.every(p => Math.abs(p.z - C7) < 0.6 && Math.abs(p.x) < 1.5), 'el que saca empieza en el cuadro 7');
  ok(r.recv.every(p => p.x < WALL + 1.6 && Math.abs(p.z - C7) < 1.2), 'el que resta espera junto a la pared, sobre el 7');
  ok(r.drop.length > 0 && r.drop.every(z => z > C4 && z < C4 + 1.6), 'corre hasta poco antes del 4 y ahí bota la pelota');
  ok(r.strike.length > 0 && r.strike.every(z => z > C4 - 0.7 && z < C4 + 1.6), 'y saca desde ahí');
  ok(r.vmax > 4, 'se le ve correr');
  ok(avg(r.runT) < 3.4, 'sin hacerse largo');
  ok(r.clash === 0, 'nadie se cruza en su carrera');
  ok(r.aces / r.serves < 0.25 && r.faults / r.serves < 0.15, 'el saque no decide casi nunca el tanto');
}

console.log('tú sacas: GOLPE para salir corriendo y GOLPE cuando suba la pelota');
{
  let served = 0, runs = 0, tries = 0, fromZ = [];
  for (let k = 0; k < 6; k++) {
    const g = new PelotaGame({ mode: 'match', target: 5, level: 'normal', seed: 104729 * (k + 81) + 3, firstServe: 'you' });
    g.start(); tries++;
    let t = 0, pressed = false;
    while (t < 8) {
      const s = g.players.you;
      // pulsar una vez al principio; después, cuando la pelota sube a la mano
      const hit = (!pressed && t > 0.6) || (g.phase === 'servePrep' && g.hittable('you') && g.ball.v.y < 0.4);
      if (!pressed && t > 0.6) pressed = true;
      const ev = g.update(1 / 30, { hit, power: 0.5 }); t += 1 / 30;
      if (ev.some(e => e.type === 'serveRun')) runs++;
      if (ev.some(e => e.type === 'hit' && e.who === 'you')) { served++; fromZ.push(s.z); break; }
    }
  }
  console.log(`   ${runs} carreras y ${served} saques de ${tries}, desde z ${rng(fromZ)}`);
  ok(runs === tries && served === tries, 'sale corriendo al pulsar y saca al volver a pulsar');
}
console.log(fails ? `\n${fails} FALLOS` : '\nTodo correcto');
process.exit(fails ? 1 : 0);
