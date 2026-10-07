// Pelota: la fuerza tiene sentido. Cortada y dejada con poca, media y toda la carga: altura a la que pegan en el frontis
// y dónde botan; golpe normal: velocidad y largura. Sin gráficos. Uso: node tools/pelota-potencia.mjs
import { PelotaGame, cutHeight } from '../src/pelota/game.js';
import { COURT } from '../src/pelota/rules.js';
let fails = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
function hit(kind, pow) {
  const res = [];
  for (let s = 1; s <= 12; s++) {
    const g = new PelotaGame({ seed: s, level: 'normal' }); g.start?.(); g.phase = 'rally'; g.rally = { striker: 'rival', turn: 'you', front: true, bounces: 1, hits: 1 };
    g.ball.p = { x: 0, y: 1, z: 20 }; g.ball.v = { x: 0, y: 0, z: 0 }; g.players.you.x = 0.3; g.players.you.z = 20.4;
    g.strike('you', 0.95, { x: 0, y: 0 }, kind, pow);
    let wallY = null, land = null;
    for (let t = 0; t < 4; t += 1 / 240) { const vy0 = g.ball.v.y; g.players.rival.cool = 99; g.players.rival.z = 60; g.update?.(1 / 240); const B = g.ball.p; if (wallY === null && g.rally.front) wallY = B.y; if (wallY !== null && land === null) for (const e of g.events) if (e.type === 'floor') land = e.z ?? B.z; if (land !== null) break; }
    res.push({ wallY, land });
  }
  const avg = (k) => res.filter(r => r[k] != null).reduce((a, r, _, A) => a + r[k] / A.length, 0);
  return { wallY: +avg('wallY').toFixed(2), land: +avg('land').toFixed(1) };
}
for (const kind of ['cortada', 'dejada', false]) {
  const r = [0.15, 0.55, 1].map(p => hit(kind, p));
  console.log(kind || 'golpe', JSON.stringify(r));
  if (kind) ok(r[0].wallY < r[1].wallY && r[1].wallY < r[2].wallY && r[0].wallY > COURT.CHAPA, `${kind}: más carga, más alta en el frontis (${r.map(x => x.wallY).join(' → ')} m; chapa ${COURT.CHAPA})`);
  else ok(r[0].land < r[2].land, `golpe: más carga, más largo (${r.map(x => x.land).join(' → ')} m)`);
}
ok(Math.abs(cutHeight(1) - COURT.FRONT_H * 0.47) < 0.05, `cortada a tope: a media altura del frontis (${cutHeight(1).toFixed(2)} m de ${COURT.FRONT_H})`);
console.log(fails ? fails + ' fallos' : 'Todo correcto');
