// Golpeo manual: el golpe lo das tú, siempre. Se juegan partidos sin gráficos con un jugador que se mueve hacia donde
// llegará la pelota y suelta el botón con un desfase fijo respecto al momento justo, y se mira que:
//   · sin pulsar nada no se devuelve ninguna (no hay golpe automático);
//   · a tiempo salen golpes perfectos; pronto, el aviso dice «pronto» (o sale de volea); tarde, «tarde»;
//   · de volea (antes del bote) y de gancho (por encima de la cabeza) se puede golpear;
//   · la cortada gasta energía y pelotear normal la devuelve;
//   · cada pelota cambia el bote y la salida del frontis.
// Uso: node tools/pelota-golpe-manual.mjs
import { PelotaGame } from '../src/pelota/game.js';
import { BALLS, courtFeel } from '../src/pelota/rules.js';

let fails = 0;
const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
// off: segundos respecto al momento justo (negativo, antes); press: false = no pulsa nunca
function run({ off = 0, press = true, req = null, n = 3000, level = 'normal', seed = 7 } = {}) {
  const g = new PelotaGame({ mode: 'match', target: 30, level, seed }); g.start();
  const labels = {}, shots = {}; let whiffs = 0, minEn = 1, hits = 0, voleas = 0, pressed = false;
  for (let i = 0; i < n; i++) {
    const inp = {}, h = g.hints(), you = g.players.you;
    if (h?.spot) { const dx = h.spot.x - you.x, dz = h.spot.z - you.z, d = Math.hypot(dx, dz); if (d > 0.3) { inp.mx = dx / d; inp.mz = dz / d; } }
    if (press) {
      if (g.phase === 'serveWait' && g.serverP() === 'you' && !g.runUp) inp.hit = true;
      if (g.phase === 'servePrep' && g.serverP() === 'you' && g.hittable('you') && g.ball.v.y < 0.5) { inp.hit = true; inp.power = 0.5; }
      if (h?.yourTurn && h.toIdeal != null && !pressed && h.toIdeal <= 0.03 - off + 1e-4 && h.toIdeal > -0.5) {
        inp[req === 'cortada' ? 'cut' : 'hit'] = true; inp.power = 0.5; pressed = true; }
    }
    if (!h?.yourTurn) pressed = false;
    for (const e of g.update(1 / 60, inp)) {
      if (e.type === 'hit' && e.who === 'you' && e.shot !== 'saque') { labels[e.label] = (labels[e.label] || 0) + 1; shots[e.shot] = (shots[e.shot] || 0) + 1; hits++; if (e.volea) voleas++; }
      if (e.type === 'whiff') whiffs++;
    }
    minEn = Math.min(minEn, g.players.you.en);
  }
  return { hits, labels, shots, whiffs, voleas, enMin: +minEn.toFixed(2), en: +g.players.you.en.toFixed(2), score: g.score, phase: g.phase };
}
const show = (t, r) => console.log(`   ${t}: ${JSON.stringify(r)}`);

console.log('1. sin golpe automático');
{ const r = run({ press: false, n: 3600 }); show('sin pulsar', r); ok(r.hits === 0, 'sin pulsar no se devuelve ninguna pelota'); }

console.log('2. el momento del golpe');
const A = run({ off: 0 }), E = run({ off: -0.12 }), L = run({ off: 0.12 });
show('a tiempo', A); show('0,12 s pronto', E); show('0,12 s tarde', L);
ok(A.hits >= 5 && (A.labels.perfect || 0) >= A.hits * 0.6, 'a tiempo, casi todo perfecto');
ok((E.labels.perfect || 0) < (A.labels.perfect || 0) && (E.voleas > 0 || (E.labels.early || 0) > 0), 'pronto: menos perfectos, y sale de volea o «pronto»');
ok((L.labels.perfect || 0) < (A.labels.perfect || 0) && ((L.labels.late || 0) > 0 || L.whiffs > 0), 'tarde: menos perfectos y avisa «tarde»');

console.log('3. volea y gancho');
{ // volea: la pelota viene del frontis sin botar, a la altura de la cintura
  const g = new PelotaGame({ mode: 'match', target: 5, level: 'normal', seed: 3 }); g.driveAI = () => { };
  g.phase = 'rally'; g.rally = { striker: 'rival', turn: 'you', front: true, bounces: 0, hits: 2 };
  g.ball.set({ x: 0.2, y: 1.0, z: 15.4 }, { x: 0, y: 0, z: 9 }); Object.assign(g.players.you, { x: 0.6, z: 16.2, cool: 0, en: 1 });
  let ev = null; g.update(1 / 60, { hit: true, power: 0.5 });
  for (let i = 0; i < 30 && !ev; i++) for (const e of g.update(1 / 60, {})) if (e.type === 'hit' && e.who === 'you') ev = e;
  for (const e of g.events || []) if (!ev && e.type === 'hit' && e.who === 'you') ev = e;
  console.log('   volea:', ev && { shot: ev.shot, volea: ev.volea, label: ev.label }); ok(ev?.volea === true, 'antes del bote, el golpe es de volea');
}
{ // gancho: la pelota alta, por encima de la cabeza
  const g = new PelotaGame({ mode: 'match', target: 5, level: 'normal', seed: 5 }); g.driveAI = () => { };
  g.phase = 'rally'; g.rally = { striker: 'rival', turn: 'you', front: true, bounces: 1, hits: 2 };
  g.ball.set({ x: -1.5, y: 1.9, z: 15.4 }, { x: 0, y: -0.5, z: 8 }); Object.assign(g.players.you, { x: -1.1, z: 16.2, cool: 0, en: 1 });
  let ev = null; for (const e of g.update(1 / 60, { hit: true, power: 0.5 })) if (e.type === 'hit') ev = e;
  for (let i = 0; i < 30 && !ev; i++) for (const e of g.update(1 / 60, {})) if (e.type === 'hit' && e.who === 'you') ev = e;
  console.log('   gancho:', ev && { shot: ev.shot, sub: ev.sub, label: ev.label }); ok(ev?.shot === 'gancho', 'por encima de la cabeza, el golpe es un gancho');
}

console.log('4. energía');
{ const C = run({ off: 0, req: 'cortada', n: 4000 }); show('solo cortadas', C);
  ok(C.enMin < 0.75, 'las cortadas seguidas gastan energía');
  ok(A.en >= 0.9, 'peloteando normal la energía se mantiene o se recupera'); }

console.log('5. las pelotas');
{ const base = courtFeel({}), out = {};
  for (const k of Object.keys(BALLS)) { const M = BALLS[k]; out[k] = { front: +(base.front * M.front).toFixed(3), floor: +(base.floor * M.floor).toFixed(3) }; }
  console.log('  ', JSON.stringify(out));
  ok(out.viva.front > out.normal.front && out.muerta.front < out.normal.front, 'la viva sale más del frontis y la muerta menos');
  ok(out.botona.floor > out.normal.floor && out.rasa.floor < out.normal.floor, 'la botona bota más y la rasa menos'); }

console.log(fails ? `\n${fails} FALLOS` : '\nTodo correcto');
process.exit(fails ? 1 : 0);
