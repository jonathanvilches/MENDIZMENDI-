// Pelota: la energía de cada pelotari. Cada golpe cansa; en un peloteo largo baja y entre tanto y tanto se recupera.
// Cansado se falla más. Por parejas, el cansado deja más pelotas a su compañero y puedes pedir la pelota («¡mía!»)
// manteniendo el golpe. Sin gráficos.
// Uso: node tools/pelota-energia.mjs
import { PelotaGame } from '../src/pelota/game.js';

let fails = 0;
const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
const seed = (k) => 104729 * (k + 5) + 13;

console.log('1. mano a mano: baja en el peloteo largo y se recupera entre tantos');
{
  let minEn = 1, longHits = 0, rec = [], errors = 0;
  for (let k = 0; k < 4; k++) {
    const g = new PelotaGame({ mode: 'match', target: 5, level: 'normal', autoplay: true, seed: seed(k) });
    g.start(); let t = 0, hits = 0, atPoint = null;
    try {
      while (g.phase !== 'end' && t < 900) {
        const ev = g.update(1 / 30, {}); t += 1 / 30;
        for (const e of ev) {
          if (e.type === 'hit') hits++;
          if (e.type === 'call') { if (hits > longHits) longHits = hits; hits = 0; atPoint = g.players.you.en; }
          if (e.type === 'serveReady' && atPoint != null) { rec.push(g.players.you.en - atPoint); atPoint = null; }
        }
        minEn = Math.min(minEn, g.players.you.en, g.players.rival.en);
      }
    } catch (e) { errors++; console.log(e); }
  }
  const r = rec.reduce((a, b) => a + b, 0) / rec.length;
  console.log(`   energía más baja ${minEn.toFixed(2)}, tanto más largo ${longHits} golpes, recuperación media entre tantos +${r.toFixed(2)}`);
  ok(errors === 0, 'sin errores');
  ok(minEn < 0.45, 'tras un peloteo largo, alguno acaba cansado (por debajo de la mitad)');
  ok(r > 0.15, 'entre tanto y tanto se recupera');
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
