// Sistemas de fútbol 11: con cada uno, el equipo defiende y ataca con su forma. Mide cuántos hay en cada línea, a qué
// altura media se colocan (−1 tu portería, 1 la rival) y lo ancho que se abren, y juega un minuto en automático para
// ver que no se rompe nada. Sin gráficos. Uso: node tools/sistemas-sim.mjs
import { FutbolGame } from '../src/futbol/game.js';
import { SISTEMAS, FIELD } from '../src/futbol/rules.js';
let ok = true;
for (const id of Object.keys(SISTEMAS)) {
  const g = new FutbolGame({ format: 'f11', sistema: id, sistemaRival: '4-4-2', mode: 'match', duration: 2, autoplay: true, seed: 7 });
  const t = g.team(0).filter(p => p.role !== 'POR'), lines = [1, 2, 3].map(l => t.filter(p => p.line === l).length).join('-');
  const shape = (state) => { const S = t.map(p => g.spot(p, state)); const u = S.map(s => s.x * g.dir[0] / FIELD.HL); return { u: (u.reduce((a, b) => a + b, 0) / u.length).toFixed(2), ancho: (Math.max(...S.map(s => s.z)) - Math.min(...S.map(s => s.z))).toFixed(0) }; };
  const def = shape('def'), atk = shape('atk');   // (con el balón en el centro, antes de jugar)
  g.start?.(); let err = null; try { for (let i = 0; i < 60 * 30; i++) g.update(1 / 30); } catch (e) { err = e.message; }
  const want = id === '4-2-3-1' ? '4-5-1' : id, fine = lines === want && !err; ok &&= fine;
  console.log(`${fine ? 'OK ' : 'MAL'} ${id}: líneas ${lines} · defendiendo ${JSON.stringify(def)} · atacando ${JSON.stringify(atk)}${err ? ' · ERROR ' + err : ''}`);
}
console.log(ok ? 'Todo correcto' : 'HAY FALLOS');
