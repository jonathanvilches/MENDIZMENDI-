// El cansancio y los descansos de la pelota (src/pelota/game.js), sin navegador: partidos enteros con los dos lados
// llevados por la máquina. Se mide la energía del rival y cuántos descansos pide, pelotando normal (tú, golpes al centro,
// sin dejadas ni cortadas) y jugando a cansarle (tú, solo dejadas y cortadas al lado contrario de donde está). Comprueba que:
//  1. el rival se cansa más si le haces correr con dejadas y cortadas que pelotando normal (su energía al empezar cada tanto)
//  2. el rival pide sus descansos cuando va muy cansado, y nunca más de los que le tocan
//  3. tus descansos: pedido entre tantos, se toma antes del saque, recupera energía y descuenta uno
// Uso: node tools/pelota-cansancio.mjs [partidos por caso, 6]
import { PelotaGame, descansosDe } from '../src/pelota/game.js';
const N = +(process.argv[2] || 6), DT = 1 / 60;
let bad = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'MAL'} ${m}`); if (!c) bad++; };
function partido(seed, cansar, target = 9) {
  const g = new PelotaGame({ seed, target, autoplay: true, level: 'normal' });
  // (tú: pelotando normal, golpes al centro y de media fuerza, sin dejadas ni cortadas; o a cansarle: dejada o cortada,
  // siempre lejos de donde está el rival)
  const base = g.aiShot.bind(g);
  g.aiShot = (who) => { if (who !== 'you' || g.phase === 'servePrep') return base(who); const r = g.players.rival;
    return cansar ? { aim: { x: r.x > 0 ? -0.8 : 0.8, y: -0.7 }, drop: g.rnd() < 0.5 ? true : 'cortada' } : { aim: { x: (g.rnd() - 0.5) * 0.6, y: 0.3 }, drop: false, pow: 0.55 }; };
  g.start(); let minR = 1, minY = 1, pide = 0, t = 0; const alSacar = [];
  while (g.phase !== 'end' && t < 900) {
    g.update(DT, {}); t += DT;
    for (const e of g.events) { if (e.type === 'descanso' && e.side === 'rival') pide++; if (e.type === 'serveReady') alSacar.push(g.players.rival.en); }
    g.events.length = 0;
    minR = Math.min(minR, g.players.rival.en); minY = Math.min(minY, g.players.you.en);
  }
  const med = alSacar.reduce((a, v) => a + v, 0) / Math.max(1, alSacar.length), bajo = alSacar.filter(v => v < 0.5).length / Math.max(1, alSacar.length);
  return { minR, minY, med, bajo, pide, quedan: g.descansos.rival, fin: g.phase === 'end', score: `${g.score.you}-${g.score.rival}` };
}
console.log(`descansos por lado: a 5 tantos ${descansosDe(5)}, a 7 ${descansosDe(7)}, a 9 ${descansosDe(9)}, a 22 ${descansosDe(22)}`);
ok(descansosDe(22) === 5 && descansosDe(5) === 1, 'como el reglamento navarro: cinco a 22 tantos; en proporción en los más cortos');
const caso = (cansar) => { const R = []; for (let i = 0; i < N; i++) R.push(partido(1000 + i * 7919, cansar)); return R; };
const normal = caso(false), cansado = caso(true), media = (R, k) => R.reduce((a, r) => a + r[k], 0) / R.length;
console.log('1. energía del rival al empezar cada tanto (media de los partidos) y tantos que empieza cansado (menos de la mitad)');
console.log(`  pelotando normal: ${Math.round(media(normal, 'med') * 100)} %, cansado en el ${Math.round(media(normal, 'bajo') * 100)} %  ·  a cansarle: ${Math.round(media(cansado, 'med') * 100)} %, cansado en el ${Math.round(media(cansado, 'bajo') * 100)} %`);
console.log(`  la más baja en algún momento: normal ${Math.round(media(normal, 'minR') * 100)} %  ·  a cansarle ${Math.round(media(cansado, 'minR') * 100)} %`);
console.log(`  resultados normal: ${normal.map(r => r.score).join(' ')}  ·  a cansarle: ${cansado.map(r => r.score).join(' ')}`);
ok(media(cansado, 'med') < media(normal, 'med') - 0.12 && media(cansado, 'bajo') > media(normal, 'bajo') + 0.15, 'haciéndole correr con dejadas y cortadas, el rival se cansa bastante más');
ok(media(normal, 'med') > 0.55, 'pelotando normal, el rival empieza los tantos con más de la mitad de energía');
ok(normal.concat(cansado).every(r => r.fin), 'todos los partidos acaban');
console.log('2. los descansos del rival');
console.log(`  pedidos: normal ${normal.map(r => r.pide).join(' ')}  ·  a cansarle ${cansado.map(r => r.pide).join(' ')}`);
ok(cansado.some(r => r.pide > 0), 'cansado de verdad, el rival pide descanso');
ok(normal.concat(cansado).every(r => r.pide <= descansosDe(9) && r.quedan >= 0), 'nunca más de los que le tocan');
console.log('3. tu descanso');
{
  const g = new PelotaGame({ seed: 42, target: 9, autoplay: true }); g.start();
  let t = 0; while (g.phase !== 'rally' && t < 20) { g.update(DT, {}); t += DT; }
  g.players.you.en = 0.2; const antes = g.descansos.you, pedido = g.pideDescanso('you');
  let vio = null, en0 = null; t = 0;
  while (t < 60 && !vio) { g.update(DT, {}); t += DT; for (const e of g.events) { if (e.type === 'descanso') { vio = e; en0 = g.players.you.en; } } g.events.length = 0; }
  t = 0; while (g.phase === 'descanso' && t < 20) { g.update(DT, {}); t += DT; }
  console.log(`  pedido: ${pedido} · se toma: ${!!vio} (lado ${vio?.side}) · energía ${Math.round((en0 ?? 0) * 100)} % → ${Math.round(g.players.you.en * 100)} % · quedan ${g.descansos.you} de ${antes} · luego: ${g.phase}`);
  ok(pedido && vio?.side === 'you', 'pedido durante el tanto, se toma en el parón, antes del saque');
  ok(g.players.you.en > (en0 ?? 1) + 0.3 && g.descansos.you === antes - 1, 'recupera energía y descuenta uno');
  ok(g.phase === 'serveWait' || g.phase === 'servePrep' || g.phase === 'rally', 'al acabar, se sigue jugando');
}
console.log(bad ? `MAL: ${bad}` : 'Todo correcto');
process.exit(bad ? 1 : 0);
