// Pelota jugada por un «humano» de prueba (sin gráficos): se mueve con el joystick, mantiene el golpe apuntando (a veces
// a dos paredes), suelta cuando la pelota está a su alcance y a veces golpea al aire. Busca fallos: partido atascado
// (ni golpe ni tanto en 15 s), estado de golpe que no se acaba, posiciones imposibles, excepciones, y cuenta cómo
// acaban los tantos. Uso: node tools/pelota-humano.mjs [partidos]
import { PelotaGame } from '../src/pelota/game.js';
const [,, NM = '6'] = process.argv;
let fails = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
const tot = { partidos: 0, tantos: 0, golpes: 0, aire: 0, dosparedes: 0, atasco: 0, swingAtascado: 0, nan: 0, errores: [], llamadas: {}, ganados: 0, lento: 0 };
for (let m = 0; m < +NM; m++) {
  const g = new PelotaGame({ seed: 77 + m * 13, level: ['facil', 'normal', 'dificil'][m % 3] }); g.start();
  let t = 0, sinTanto = 0, swingT = 0, holding = 0, aim = { x: 0, y: 0 }, lastPts = 0;
  try {
    while (g.phase !== 'end' && t < 900) {
      const you = g.players.you, inp = { mx: 0, mz: 0, hit: false, aimX: 0, aimY: 0, power: 0.6 };
      if (g.phase === 'serveWait' && g.server === 'you') inp.hit = g.phaseT > 0.6;
      const c = g.phase === 'rally' && g.rally?.turn === 'you' ? g.interceptFor('you', 6.2, 0.1) : null;
      if (c) { const dx = c.x - you.x, dz = c.z - you.z, d = Math.hypot(dx, dz); if (!holding && d > 0.3) { inp.mx = dx / d; inp.mz = dz / d; } }
      // mantener el golpe y apuntar cuando la pelota se acerca; soltar al tenerla a tiro (o al aire de vez en cuando)
      if ((g.phase === 'rally' && g.rally?.turn === 'you') || (g.phase === 'servePrep' && g.server === 'you')) {
        if (!holding && g.rnd() < 0.08) { holding = 0.01; const r = g.rnd(); aim = r < 0.25 ? { x: -1, y: -0.1 } : r < 0.5 ? { x: 0.9, y: 0 } : { x: (g.rnd() - 0.5) * 1.4, y: (g.rnd() - 0.5) * 1.4 }; }
        if (holding) { holding += 1 / 30; inp.aiming = true; inp.aimX = aim.x; inp.aimY = aim.y;
          if (g.hittable('you') || holding > 1.6) { inp.hit = true; inp.power = Math.min(1, 0.15 + holding); holding = 0; if (!g.hittable('you')) tot.aire++; } }
      } else holding = 0;
      const ev = g.update(1 / 30, inp); t += 1 / 30;
      for (const e of ev) {
        if (e.type === 'hit') sinTanto = 0;
        if (e.type === 'hit' && e.who === 'you') { tot.golpes++; if (e.shot === 'dosparedes') tot.dosparedes++; }
        if (e.type === 'call') { tot.tantos++; tot.llamadas[e.call] = (tot.llamadas[e.call] || 0) + 1; sinTanto = 0; }
      }
      sinTanto += 1 / 30; if (sinTanto > 15) { tot.atasco++; sinTanto = 0; tot.errores.push(['atasco', m, g.phase, +t.toFixed(1), g.rally?.hits, g.rally?.turn, g.rally?.bounces, g.rally?.front, [g.ball.p.x, g.ball.p.y, g.ball.p.z, g.ball.v.x, g.ball.v.y, g.ball.v.z].map(v => +v.toFixed(2))]); }
      if (you.act === 'swing') swingT += 1 / 30; else swingT = 0; if (swingT > 1) { tot.swingAtascado++; swingT = 0; }
      for (const p of [you, g.players.rival, g.ball.p]) if (![p.x, p.z].every(Number.isFinite)) tot.nan++;
    }
  } catch (e) { tot.errores.push(['excepción', m, String(e.message || e).slice(0, 120)]); }
  if (g.phase !== 'end') tot.lento++;
  tot.partidos++; if (g.score.you > g.score.rival) tot.ganados++;
}
console.log(JSON.stringify(tot));
ok(!tot.errores.some(e => e[0] === 'excepción'), 'sin excepciones');
ok(tot.atasco === 0, `nada se atasca: ni golpe ni tanto en 15 s (${tot.atasco} veces; ${tot.lento} partidos sin acabar en 15 min por peloteos largos)`);
ok(tot.swingAtascado === 0, 'el golpe siempre acaba (sin gesto que se repita)');
ok(tot.nan === 0, 'sin posiciones imposibles');
ok(tot.dosparedes > 0, `salen golpes a dos paredes (${tot.dosparedes} de ${tot.golpes})`);
console.log(fails ? fails + ' fallos' : 'Todo correcto');
