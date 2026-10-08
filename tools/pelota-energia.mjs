// Pelota: la energía de cada pelotari. Correr y los golpes caros (cortada, dos paredes, gancho) cansan; pelotear normal
// la devuelve y entre tanto y tanto se recupera.
// Cansado se falla más. Por parejas, el cansado deja más pelotas a su compañero y puedes pedir la pelota («¡mía!»)
// manteniendo el golpe. Sin gráficos.
// Uso: node tools/pelota-energia.mjs
import { PelotaGame } from '../src/pelota/game.js';

let fails = 0;
const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
const seed = (k) => 104729 * (k + 5) + 13;

console.log('1. mano a mano: los golpes caros y correr cansan; pelotear normal y el descanso entre tantos la devuelven');
{
  // (dos pelotaris con el piloto automático; en la segunda tanda, el rival juega sobre todo cortadas y dos paredes)
  const play = (style) => {
    let minYou = 1, minRival = 1, longHits = 0, rec = [], errors = 0;
    for (let k = 0; k < 4; k++) {
      const g = new PelotaGame({ mode: 'match', target: 5, level: 'normal', autoplay: true, seed: seed(k), rivalStats: style ? { fuerza: 3, agilidad: 3, velocidad: 3, style } : undefined });
      g.start(); let t = 0, hits = 0, atPoint = null;
      try {
        while (g.phase !== 'end' && t < 900) {
          const ev = g.update(1 / 30, {}); t += 1 / 30;
          for (const e of ev) {
            if (e.type === 'hit') hits++;
            // (el descanso entre tantos se mide desde cansado: si no, ya está casi llena y no se nota)
            if (e.type === 'call') { if (hits > longHits) longHits = hits; hits = 0; g.players.you.en = 0.3; atPoint = 0.3; }
            if (e.type === 'serveReady' && atPoint != null) { rec.push(g.players.you.en - atPoint); atPoint = null; }
          }
          if (atPoint == null) { minYou = Math.min(minYou, g.players.you.en); minRival = Math.min(minRival, g.players.rival.en); }
        }
      } catch (e) { errors++; console.log(e); }
    }
    return { minYou, minRival, longHits, rec: rec.reduce((a, b) => a + b, 0) / Math.max(1, rec.length), errors };
  };
  const N = play(null), C = play({ cortada: 3, dosparedes: 3, gancho: 0, dejada: 0, largo: 0 });
  console.log(`   peloteo normal: energía más baja ${Math.min(N.minYou, N.minRival).toFixed(2)}, tanto más largo ${N.longHits} golpes, recuperación entre tantos +${N.rec.toFixed(2)}`);
  console.log(`   rival de cortadas y dos paredes: su energía más baja ${C.minRival.toFixed(2)}`);
  ok(N.errors === 0 && C.errors === 0, 'sin errores');
  ok(C.minRival < 0.5, 'jugando cortadas y dos paredes, el rival acaba cansado (por debajo de la mitad)');
  ok(Math.min(N.minYou, N.minRival) > C.minRival + 0.15, 'peloteando normal se cansa bastante menos');
  ok(N.rec > 0.15, 'entre tanto y tanto se recupera');
}

console.log('2. cansado se falla más');
{
  const rate = (low) => {
    let lost = 0, hits = 0;
    for (let k = 0; k < 6; k++) {
      const g = new PelotaGame({ mode: 'match', target: 5, level: 'normal', autoplay: true, seed: seed(k + 20) });
      g.start(); let t = 0;
      while (g.phase !== 'end' && t < 900) {
        if (low) g.players.rival.en = 0.08;   // (el rival, siempre agotado)
        const ev = g.update(1 / 30, {}); t += 1 / 30;
        for (const e of ev) { if (e.type === 'hit' && e.who === 'rival') hits++; if (e.type === 'call' && e.winner === 'you') lost++; }
      }
    }
    return lost / Math.max(1, hits);
  };
  const a = rate(false), b = rate(true);
  console.log(`   tantos perdidos por golpe del rival: descansado ${a.toFixed(3)}, agotado ${b.toFixed(3)}`);
  ok(b > a * 1.5, 'agotado pierde bastantes más tantos');
}

console.log('3. parejas: el cansado deja más pelotas a su compañero');
{
  const share = (tiredId) => {
    const h = { you: 0, youMate: 0 };
    for (let k = 0; k < 5; k++) {
      const g = new PelotaGame({ mode: 'match', target: 5, level: 'normal', autoplay: true, pairs: true, youRole: 'zaguero', seed: seed(k + 40) });
      g.start(); let t = 0;
      while (g.phase !== 'end' && t < 900) {
        if (tiredId) g.players[tiredId].en = 0.1;
        const ev = g.update(1 / 30, {}); t += 1 / 30;
        for (const e of ev) if (e.type === 'hit' && e.side === 'you' && !g.rally?.serve) h[e.who]++;
      }
    }
    return h.you / Math.max(1, h.you + h.youMate);
  };
  const s0 = share(null), sY = share('you'), sM = share('youMate');
  console.log(`   golpes tuyos de tu pareja: normal ${(s0 * 100).toFixed(0)} %, tú cansado ${(sY * 100).toFixed(0)} %, tu compañero cansado ${(sM * 100).toFixed(0)} %`);
  ok(sY < s0 - 0.08, 'si estás cansado, tu compañero coge más');
  ok(sM > s0 + 0.08, 'si tu compañero está cansado, coges más tú');
}

console.log('4. parejas: «¡mía!» manteniendo el golpe');
{
  let claims = 0, mateAfter = 0, yours = 0;
  for (let k = 0; k < 4; k++) {
    const g = new PelotaGame({ mode: 'match', target: 5, level: 'facil', pairs: true, youRole: 'delantero', seed: seed(k + 60) });
    g.start(); let t = 0, claimed = false;
    while (g.phase !== 'end' && t < 300) {
      // mantienes el golpe siempre (y lo sueltas cuando llega a tu alcance)
      const inp = { aiming: true, hit: g.hittable('you'), power: 0.6 };
      const ev = g.update(1 / 30, inp); t += 1 / 30;
      for (const e of ev) {
        if (e.type === 'claim') { claims++; claimed = true; }
        if (e.type === 'hit') { if (claimed && e.who === 'youMate') mateAfter++; if (claimed && e.who === 'you') yours++; claimed = false; }
      }
    }
  }
  console.log(`   pedidas ${claims}, las golpeaste tú ${yours}, el compañero tras pedirla ${mateAfter}`);
  ok(claims > 3, 'manteniendo el golpe se piden las de tu compañero');
  ok(mateAfter === 0, 'y él se aparta: no golpea una pelota que has pedido');
}
console.log(fails ? `\n${fails} FALLOS` : '\nTodo correcto');
process.exit(fails ? 1 : 0);
