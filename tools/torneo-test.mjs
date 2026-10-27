// Pruebas de los campeonatos de pelota sin jugar los partidos: el cuadro de cada uno (Manomanista y Cuatro y Medio, de
// dieciséis; Parejas, de ocho en liguilla), las rondas con sus tantos, la liguilla y sus cruces, la txapela y que el
// torneo sigue sin ti. En el navegador, con los módulos del servidor de desarrollo (la plantilla de pelotaris sale de
// las imágenes, que solo sabe leer Vite). Uso: node tools/torneo-test.mjs   (servidor en 5173)
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://127.0.0.1:5173/src/game/torneo.js', { timeout: 120000 });
const res = await p.evaluate(async () => {
  // (lo que Vite define en la página del juego; aquí no hay página)
  Object.assign(window, { __WEB__: false, __AF__: false, __HDMAP__: null });
  localStorage.removeItem('herrizherri-torneo-v1');
  const { torneo, yourMatch, playTorneoRound, youOut, txapelas, clasificacion, planOf, sedeDe } = await import('/src/game/torneo.js');
  const out = []; const ok = (c, m) => out.push([!!c, m]);
  const ctx = { comarca: 'bidasoa', comarcaName: 'Baztan-Bidasoa', towns: [{ id: 'lesaka', name: 'Lesaka' }, { id: 'etxalar', name: 'Etxalar' }, { id: 'elizondo', name: 'Elizondo' }, { id: 'ituren', name: 'Ituren' }] };
  const you = { name: 'Ane', town: 'Lesaka' };
  // juega todo el torneo: ganando (o perdiendo en la ronda «pierde») tus partidos; devuelve las rondas que jugaste
  const juega = (T, pierde = -1) => { const rs = []; while (!T.done) { const m = yourMatch(T); if (m) { rs.push(`${m.round} a ${m.target}`); playTorneoRound(T, rs.length - 1 === pierde ? 1 : m.target, rs.length - 1 === pierde ? m.target : 1); } else playTorneoRound(T); } return rs; };
  const unicos = (T) => new Set(T.players.map(q => q.name)).size === T.players.length;
  // Manomanista: dieciséis, octavos a 5, cuartos a 6, semifinales a 7 y final a 9
  let T = torneo(you, ctx);
  ok(T.fmt === 'ko16' && T.players.length === 16 && T.matches.length === 8 && new Set(T.matches.flatMap(m => [m.a, m.b])).size === 16, 'Manomanista: 16 pelotaris y 8 partidos de octavos');
  ok(unicos(T) && !T.players.slice(1).some(q => q.name === 'Ane'), 'sin nombres repetidos ni el tuyo');
  ok(T.players.slice(1).some(q => q.townId === 'etxalar' || q.townId === 'elizondo'), 'rivales de pueblos de la comarca');
  { const m0 = T.matches.find(m => m.a === 0 || m.b === 0), rv = T.players[m0.a === 0 ? m0.b : m0.a], f = (q) => q.lv; ok(T.players.slice(1).every(q => f(q) >= f(rv)), 'en octavos, contra el más flojo'); }
  let rs = juega(T);
  ok(T.done && T.players[T.champion].you && T.txapelas === 1, 'ganando todo: txapela');
  ok(rs.join(', ') === 'Octavos de final a 5, Cuartos de final a 6, Semifinales a 7, Final a 9', `cuatro partidos: ${rs.join(', ')}`);
  ok(txapelas().bidasoa === 1, 'la txapela queda apuntada en la comarca');
  T = torneo(you, ctx); ok(T.done, 'el terminado se sigue viendo hasta pedir otro');
  T = torneo(you, ctx, true); ok(!T.done && T.edition === 2 && T.txapelas === 1 && T.fmt === 'ko16', 'nueva edición conserva las txapelas');
  rs = juega(T, 1); ok(rs.length === 2 && T.done && !T.players[T.champion].you, `eliminado en cuartos, el torneo termina sin ti (${rs.length} partidos)`);
  // Cuatro y Medio: liguilla de cuatro grupos de cuatro (3 jornadas), cuartos, semifinales y final
  T = torneo(you, ctx, false, 'cuatro');
  ok(T.fmt === 'grupos16' && T.groups.length === 4 && T.groups.every(g => g.length === 4) && T.groups[0][0] === 0 && T.matches.length === 8, 'Cuatro y Medio: 4 grupos de 4, tú en el A');
  ok(new Set(T.groups.flat()).size === 16, 'cada pelotari en un solo grupo');
  { const vs = new Map(); for (const j of T.sched) for (const [a, c] of j) { const k = [a, c].sort().join('-'); vs.set(k, (vs.get(k) || 0) + 1); } ok(T.sched.length === 3 && vs.size === 24 && [...vs.values()].every(n => n === 1), 'en el grupo, todos contra todos una vez (3 jornadas)'); }
  rs = juega(T);
  ok(rs.length === 6 && rs.slice(0, 3).every(x => /^Liguilla · jornada \d a 5$/.test(x)) && rs.slice(3).join(', ') === 'Cuartos de final a 6, Semifinales a 7, Final a 9', `seis partidos: ${rs.join(', ')}`);
  { const P = T.past[3], st = T.groups.map((_, g) => clasificacion(T, g).map(x => x.p)), pasan = new Set(st.flatMap(s => s.slice(0, 2)));
    ok(P.matches.length === 4 && P.matches.every(m => pasan.has(m.a) && pasan.has(m.b)), 'a cuartos, los dos primeros de cada grupo');
    ok(P.matches.every(m => !T.groups.some(g => g.includes(m.a) && g.includes(m.b))), 'en cuartos, nadie contra uno de su grupo');
    ok(clasificacion(T, 0).every(x => x.j === 3) && clasificacion(T, 0)[0].p === 0 && clasificacion(T, 0)[0].g === 3, 'clasificación: 3 jugados y tú, primero con 3 ganados'); }
  ok(T.done && T.players[T.champion].you, 'Cuatro y Medio: txapela');
  // perdiendo los tres de la liguilla: fuera, y el torneo sigue
  T = torneo(you, ctx, true, 'cuatro'); for (let j = 0; j < 3; j++) { const m = yourMatch(T); playTorneoRound(T, 0, m.target); }
  ok(youOut(T) && T.round === 3, 'perdiendo la liguilla, fuera de cuartos'); while (!T.done) playTorneoRound(T); ok(T.done, 'y el torneo termina');
  // Parejas: ocho parejas en liguilla (7 jornadas), semifinales y final
  T = torneo(you, ctx, false, 'parejas');
  ok(T.fmt === 'liga8' && T.players.length === 8 && T.players.every(q => q.mates?.length === 2) && T.groups.length === 1 && T.matches.length === 4, 'Parejas: 8 parejas en un grupo');
  { const ns = T.players.flatMap(q => q.mates); ok(new Set(ns).size === ns.length, 'parejas sin nombres repetidos'); const m = yourMatch(T); ok(m.pairs && m.partner?.name && m.mate?.name && m.stats?.fuerza, 'delantero y zaguero con sus cualidades'); }
  rs = juega(T);
  ok(rs.length === 9 && rs.slice(0, 7).every(x => /^Liguilla · jornada \d a 5$/.test(x)) && rs.slice(7).join(', ') === 'Semifinales a 7, Final a 9', `nueve partidos: ${rs.join(', ')}`);
  { const st = clasificacion(T).map(x => x.p), S = T.past[7].matches; ok(S[0].a === st[0] && S[0].b === st[3] && S[1].a === st[1] && S[1].b === st[2], 'semifinales: 1.º contra 4.º y 2.º contra 3.º'); }
  // el frontón elegido vale solo para su jornada (todas se llaman «Liguilla»)
  T = torneo(you, ctx, true, 'parejas'); { const m = yourMatch(T); T.sede = { ri: T.round, round: m.round, edition: T.edition, kind: 'cubierto' }; ok(sedeDe(T, m) === 'cubierto', 'frontón elegido para la jornada'); playTorneoRound(T, m.target, 0); const m2 = yourMatch(T); ok(sedeDe(T, m2) === 'plaza', 'la jornada siguiente, en el del pueblo'); }
  ok(planOf(T).at(-1).name === 'Final', 'la final, la última');
  // un torneo de antes (de ocho) a medias se acaba con su cuadro; uno sin empezar se rehace
  { const all = JSON.parse(localStorage.getItem('herrizherri-torneo-v1')); const viejo = { kind: 'mano', comarca: 'zona', comarcaName: 'Zona', venues: [], edition: 3, txapelas: 2, players: Array.from({ length: 8 }, (_, i) => ({ id: i ? 'p' + i : 'you', name: i ? 'R' + i : 'Ane', town: 'X', lv: 2, you: !i })), round: 1, matches: [{ a: 0, b: 2, s: null }, { a: 4, b: 6, s: null }], past: [{ name: 'Cuartos de final', matches: [] }], done: false, champion: null };
    all.zona = viejo; all['zona:cuatro'] = { ...viejo, kind: 'cuatro', round: 0, past: [], matches: [{ a: 0, b: 1, s: null }] }; localStorage.setItem('herrizherri-torneo-v1', JSON.stringify(all));
    const c2 = { comarca: 'zona', comarcaName: 'Zona', towns: [] };
    const V = torneo(you, c2); ok(!V.fmt && yourMatch(V).round === 'Semifinales' && yourMatch(V).target === 5, 'el de antes sigue con sus semifinales a 5'); juega(V); ok(V.done && V.txapelas === 3, 'y se acaba con su final');
    const W = torneo(you, c2, false, 'cuatro'); ok(W.fmt === 'grupos16' && W.edition === 3 && W.txapelas === 2, 'el de antes sin empezar, con el formato nuevo y su edición'); }
  // la liga de fútbol, a ida y vuelta: catorce jornadas, cada partido dos veces con el campo cambiado
  { const L = await import('/src/futbol/liga.js'); localStorage.removeItem('herrizherri-liga-v1');
    const S = L.season('baztan'), vs = new Map();
    for (const R of S.rounds) for (const m of R) { const k = [m.h, m.a].sort().join('-'); vs.set(k, [...(vs.get(k) || []), m.h]); }
    ok(S.rounds.length === 14 && S.rounds.every(R => R.length === 4) && vs.size === 28 && [...vs.values()].every(h => h.length === 2 && h[0] !== h[1]), 'liga: 14 jornadas, cada partido en casa y fuera');
    ok(S.rounds.every(R => R.some(m => m.h === 'baztan' || m.a === 'baztan')), 'tu club juega todas las jornadas');
    const all = JSON.parse(localStorage.getItem('herrizherri-liga-v1')); all.baztan.rounds = all.baztan.rounds.slice(0, 7); all.baztan.titles = 2; all.baztan.year = 4; localStorage.setItem('herrizherri-liga-v1', JSON.stringify(all));
    const S2 = L.season('baztan'); ok(S2.rounds.length === 14 && S2.titles === 2 && S2.year === 4, 'la de antes sin empezar se rehace a ida y vuelta, con sus títulos');
    const a2 = JSON.parse(localStorage.getItem('herrizherri-liga-v1')); a2.baztan.rounds = a2.baztan.rounds.slice(0, 7); a2.baztan.j = 3; localStorage.setItem('herrizherri-liga-v1', JSON.stringify(a2));
    ok(L.season('baztan').rounds.length === 7, 'la de antes a medias sigue a una vuelta'); }
  return out;
});
let fails = 0; for (const [c, m] of res) { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; }
if (errs.length) { console.log('errores:', errs.slice(0, 3)); fails++; }
console.log(fails ? `${fails} FALLOS` : 'Todo correcto'); await b.close(); process.exit(fails ? 1 : 0);
