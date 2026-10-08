// El frontón también juega: a cubierto, al aire libre, con el frontis de piedra, con el suelo mojado o en el Labrit, la
// pelota sale y bota distinto (courtFeel en rules.js, setFeel en physics.js). Se mide un mismo golpe en cada frontón
// (cuánto sube tras el bote, dónde vuelve a botar, si llega al rebote) y se juegan partidos enteros solo con la IA para
// ver que en todos se puede jugar: los partidos acaban, hay peloteos y nadie se queda sin poder devolver. Sin gráficos.
// Uso: node tools/pelota-frontones-juego.mjs
import { PelotaGame } from '../src/pelota/game.js';
import { courtFeel } from '../src/pelota/rules.js';
import { setFeel, FEEL, predict } from '../src/pelota/physics.js';

let fails = 0;
const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
const CASES = { 'al aire libre': {}, 'a cubierto': { covered: true }, 'frontis de piedra': { stone: true }, 'suelo mojado': { wet: true }, Labrit: { labrit: true, covered: true } };

// 1. el mismo golpe en cada frontón
function shot(power, seed) {
  const g = new PelotaGame({ seed, youStats: { fuerza: 3, agilidad: 3, velocidad: 3 } }); g.phase = 'rally'; g.rally = { striker: 'rival', turn: 'you', front: true, bounces: 1, hits: 2 };
  g.ball.p = { x: 0, y: 1, z: 18 }; g.ball.v = { x: 0, y: 0, z: 0 }; Object.assign(g.players.rival, { x: 0, z: 40, cool: 1 }); g.driveAI = () => {};
  g.strike('you', power, { x: 0, y: power > 0.8 ? 1 : 0 }, false, 1);
  // (desde que sale de la mano: la física sola, sin que nadie la toque)
  const { samples, events } = predict(g.ball, 6), f1 = events.find(e => e.type === 'floor' && e.n === 1), f2 = events.find(e => e.type === 'floor' && e.n === 2);
  const peak = f1 ? Math.max(0, ...samples.filter(q => q.t > f1.t && (!f2 || q.t < f2.t)).map(q => q.y)) : 0;
  const fr = events.find(e => e.type === 'front'), after = fr && samples.find(q => q.t > fr.t + 0.02);
  return { first: f1?.z ?? 0, second: f2?.z ?? (f1?.z ?? 0), peak, back: events.some(e => e.type === 'back'), spd: after?.sp ?? 0 };
}
console.log('1. el mismo golpe, frontón a frontón');
const M = {};
for (const [name, c] of Object.entries(CASES)) {
  const f = courtFeel(c); setFeel(f);
  const r = [104729, 209459, 314189].map(s => shot(0.6, s)), hard = [104729, 209459, 314189].map(s => shot(1, s));
  const avg = (k, a = r) => a.reduce((x, y) => x + (y[k] ?? 0), 0) / a.length;
  M[name] = { first: avg('first'), run: avg('second') - avg('first'), peak: avg('peak'), spd: avg('spd'), back: hard.filter(x => x.back).length / hard.length };
  console.log(`   ${name.padEnd(18)} ${f.tags.map(t => t.name).join(' + ').padEnd(30)} sale del frontis a ${M[name].spd.toFixed(1)} m/s · primer bote ${M[name].first.toFixed(1)} m · sube ${M[name].peak.toFixed(2)} m · corre ${M[name].run.toFixed(1)} m hasta el 2.º bote · a tope llega al rebote ${Math.round(M[name].back * 100)} %`);
}
setFeel(null);
const A = M['al aire libre'];
ok(M['a cubierto'].first === A.first && M['a cubierto'].peak === A.peak, 'a cubierto y al aire libre con el suelo seco botan igual (lo que cambia es que no llueve)');
ok(M['suelo mojado'].peak < A.peak * 0.92, `con el suelo mojado la pelota sube menos tras el bote (${M['suelo mojado'].peak.toFixed(2)} m frente a ${A.peak.toFixed(2)} m)`);
ok(M['suelo mojado'].run > A.run * 0.85, 'y entre bote y bote corre casi lo mismo: llega baja, pero no se muere');
ok(M['frontis de piedra'].spd < A.spd * 0.97, `con el frontis de piedra la pelota sale más lenta del frontis (${M['frontis de piedra'].spd.toFixed(1)} m/s frente a ${A.spd.toFixed(1)} m/s; el golpe, apuntado, cae donde se quería)`);
ok(M.Labrit.spd > A.spd * 1.02 && M.Labrit.peak > A.peak, 'en el Labrit, pelota viva: sale más rápida del frontis y bota más');
ok(M['frontis de piedra'].back > 0, 'con el frontis de piedra, pegando a tope se sigue llegando al rebote');
ok(FEEL.front === 1 && FEEL.floor === 1 && FEEL.run === 1, 'al acabar, la física vuelve a la de siempre');

// 2. partidos enteros solo con la IA en cada frontón
console.log('2. se juega bien en todos');
let base = null;
for (const [name, c] of Object.entries(CASES)) {
  setFeel(courtFeel(c));
  let ended = 0, pts = 0, hits = 0, rallies = 0, maxT = 0;
  for (let k = 0; k < 6; k++) {
    const g = new PelotaGame({ mode: 'match', target: 5, level: 'normal', autoplay: true, seed: 104729 * (k + 61) + 7 });
    g.start(); let t = 0;
    while (g.phase !== 'end' && t < 900) { for (const e of g.update(1 / 30, {})) { if (e.type === 'hit') hits++; if (e.type === 'call') rallies++; } t += 1 / 30; }
    if (g.phase === 'end') ended++; pts += g.score.you + g.score.rival; maxT = Math.max(maxT, t);
  }
  const per = hits / Math.max(1, rallies);
  console.log(`   ${name.padEnd(18)} ${ended}/6 partidos acabados · ${pts} tantos · ${per.toFixed(1)} golpes por tanto · el más largo ${Math.round(maxT)} s`);
  ok(ended === 6, `${name}: todos los partidos acaban`);
  base ??= per; ok(per >= 2.2 && per > base * 0.6 && per < base * 1.6, `${name}: hay peloteos, como en un frontón normal (ni se falla todo ni no acaba nunca)`);
}
setFeel(null);
console.log(fails ? `\n${fails} FALLOS` : '\nTodo correcto');
process.exit(fails ? 1 : 0);
