// Pelota por parejas (dos delanteros y dos zagueros) sin gráficos: partidos enteros con la IA, quién saca, quién
// coge cada pelota según su zona, que tu compañero no te quite las tuyas y que el mano a mano siga igual.
// Uso: node tools/pelota-parejas.mjs [partidos]
import { PelotaGame } from '../src/pelota/game.js';

const [,, N = '6'] = process.argv;
let fails = 0;
const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
const run = (g, maxT = 900, onEv = () => {}) => {
  g.start(); let t = 0;
  while (g.phase !== 'end' && t < maxT) { const ev = g.update(1 / 30, {}); for (const e of ev) onEv(e, g); t += 1 / 30; }
  return t;
};

console.log('1. partidos por parejas con la IA');
{
  const hits = { you: 0, youMate: 0, rival: 0, rivalMate: 0 }, zone = { ok: 0, mal: 0 }, servers = new Set(), score = [0, 0]; let badServe = 0;
  let errors = 0, ended = 0, nan = 0;
  for (let k = 0; k < +N; k++) {
    const g = new PelotaGame({ mode: 'match', target: 5, level: 'normal', autoplay: true, pairs: true, youRole: k % 2 ? 'zaguero' : 'delantero', seed: 104729 * (k + 3) + 11 });
    try {
      run(g, 900, (e, g) => {
        if (e.type === 'hit') {
          hits[e.who]++;
          // (los golpes del peloteo, no el saque: el delantero, delante del cuadro 5; el zaguero, detrás)
          if (!g.rally.serve && g.rally.hits > 1) { const del = g.role[e.who] === 'delantero'; if ((e.z < 17.5) === del || Math.abs(e.z - 17.5) < 2.5) zone.ok++; else zone.mal++; }
        }
        if (e.type === 'drop') { servers.add(e.who); if (g.role[e.who] !== 'delantero') badServe++; }
      });
      if (g.phase === 'end') ended++;
      score[0] += g.score.you; score[1] += g.score.rival;
      for (const id of g.ids) { const p = g.players[id]; if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) nan++; }
    } catch (e) { errors++; console.log(e); }
  }
  console.log('   golpes', JSON.stringify(hits), 'zonas', JSON.stringify(zone), 'sacan', [...servers].join(','), 'tantos', score.join('-'));
  ok(errors === 0 && nan === 0, 'sin errores ni posiciones imposibles');
  ok(ended === +N, `los ${N} partidos terminan`);
  ok(Object.values(hits).every(n => n > 10), 'los cuatro pelotaris golpean');
  ok(zone.ok > zone.mal * 3, `cada uno coge sobre todo las de su zona (${zone.ok} en su zona, ${zone.mal} fuera)`);
  ok(badServe === 0 && servers.has('rival') && !servers.has('rivalMate'), 'saca siempre el delantero de cada pareja');
  ok(score[0] > 0 && score[1] > 0, 'tantos para las dos parejas');
}

console.log('2. tu compañero no te quita las tuyas');
{
  // juegas de zaguero sin moverte: las pelotas de atrás son tuyas y tu compañero (delantero) no va a por ellas
  let mateBack = 0, mateHits = 0, lostMine = 0, yourTurns = 0;
  for (let k = 0; k < 4; k++) {
    const g = new PelotaGame({ mode: 'match', target: 5, level: 'normal', pairs: true, youRole: 'zaguero', seed: 104729 * (k + 21) + 5 });
    g.start(); let t = 0;
    while (g.phase !== 'end' && t < 400) {
      // (el saque, si te toca, lo hace tu compañero: eres zaguero)
      const ev = g.update(1 / 30, {}); t += 1 / 30;
      if (g.phase === 'rally' && g.rally.turn === 'you' && g.takerOf('you') === 'you') yourTurns++;
      for (const e of ev) {
        if (e.type === 'hit' && e.who === 'youMate') { mateHits++; if (e.z > 20) mateBack++; }
        if (e.type === 'call' && e.winner === 'rival' && g.rally?.turn === 'you' && g.rally.taker === 'you') lostMine++;
      }
    }
  }
  console.log(`   golpes del compañero ${mateHits} (atrás ${mateBack}); tantos perdidos en pelotas tuyas ${lostMine}`);
  ok(mateHits > 0, 'tu compañero juega las suyas');
  ok(mateBack <= Math.max(2, mateHits * 0.15), 'y casi nunca se va atrás a por las tuyas');
  ok(lostMine > 0 && yourTurns > 0, 'si no vas a por las tuyas, se pierde el tanto (te toca a ti)');
}

console.log('3. el mano a mano sigue igual');
{
  const g = new PelotaGame({ mode: 'match', target: 5, level: 'normal', autoplay: true, seed: 104729 * 7 + 3 });
  let err = 0; try { run(g); } catch (e) { err++; console.log(e); }
  ok(err === 0 && g.phase === 'end' && !g.pairs && g.ids.length === 2, `partido de dos que termina (${g.score.you}-${g.score.rival})`);
  const r = new PelotaGame({ mode: 'rally', pairs: true });
  ok(!r.pairs, 'el peloteo de práctica no es por parejas');
}
console.log(fails ? `\n${fails} FALLOS` : '\nTodo correcto');
process.exit(fails ? 1 : 0);
