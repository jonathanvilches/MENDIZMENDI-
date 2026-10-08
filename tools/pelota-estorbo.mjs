// Pelota: que los pelotaris no se estorben. En cada golpe se mira si otro pelotari estaba encima del que golpea (a menos
// de 1,3 m) o le cortaba el camino hacia la pelota en el último medio segundo; por parejas y en el mano a mano.
// Uso: node tools/pelota-estorbo.mjs [partidos] [umbral]   (umbral: % de golpes con estorbo que se admite)
import { PelotaGame } from '../src/pelota/game.js';

const [,, N = '6', MAX = '2'] = process.argv;
let fails = 0;
const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
function run(pairs) {
  let hits = 0, near = 0, cut = 0, minD = 9, errors = 0;
  for (let k = 0; k < +N; k++) {
    const g = new PelotaGame({ mode: 'match', target: 5, level: 'normal', autoplay: true, pairs, youRole: k % 2 ? 'zaguero' : 'delantero', seed: 104729 * (k + 31) + 17 });
    g.start(); let t = 0; const trail = {};
    try {
      while (g.phase !== 'end' && t < 900) {
        // (dónde estaba cada uno hace medio segundo: para ver si alguien se cruzó en su carrera)
        for (const id of g.ids) { (trail[id] ||= []).push({ x: g.players[id].x, z: g.players[id].z }); if (trail[id].length > 16) trail[id].shift(); }
        const ev = g.update(1 / 30, {}); t += 1 / 30;
        for (const e of ev) {
          if (e.type !== 'hit' || g.rally?.serve) continue;
          hits++;
          const P = g.players[e.who], from = trail[e.who][0];
          let d = 9, c = false;
          for (const id of g.ids) {
            if (id === e.who) continue;
            const q = g.players[id]; d = Math.min(d, Math.hypot(q.x - P.x, q.z - P.z));
            // cortaba el camino: cerca del segmento de su carrera (sin contar los últimos 30 cm)
            const ax = from.x, az = from.z, bx = P.x, bz = P.z, l2 = (bx - ax) ** 2 + (bz - az) ** 2;
            if (l2 > 1) { const u = Math.max(0, Math.min(1, ((q.x - ax) * (bx - ax) + (q.z - az) * (bz - az)) / l2)); if (u < 0.85 && Math.hypot(ax + (bx - ax) * u - q.x, az + (bz - az) * u - q.z) < 0.8) c = true; }
          }
          minD = Math.min(minD, d); if (d < 1.3) near++; if (c) cut++;
        }
      }
    } catch (e) { errors++; console.log(e); }
  }
  return { hits, near: near / Math.max(1, hits) * 100, cut: cut / Math.max(1, hits) * 100, minD, errors };
}
for (const pairs of [false, true]) {
  const r = run(pairs);
  console.log(`${pairs ? 'parejas' : 'mano a mano'}: ${r.hits} golpes, con otro encima ${r.near.toFixed(1)} %, cortándole el camino ${r.cut.toFixed(1)} %, distancia mínima ${r.minD.toFixed(2)} m`);
  ok(r.errors === 0, 'sin errores');
  ok(r.near <= +MAX, `casi nunca hay otro pelotari encima del que golpea (${r.near.toFixed(1)} %)`);
  ok(r.cut <= +MAX, `casi nunca le cortan el camino (${r.cut.toFixed(1)} %)`);
}
console.log(fails ? `\n${fails} FALLOS` : '\nTodo correcto');
process.exit(fails ? 1 : 0);
