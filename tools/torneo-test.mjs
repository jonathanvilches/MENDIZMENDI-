// Pruebas del torneo de mano de la comarca sin gráficos (node): cuadro, rondas, txapela y el torneo por parejas. (Los
// partidos se juegan en el frontón del pueblo elegido y la final en el Labrit: ya no cambian de sede ronda a ronda.)
const mem = {}; globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); } };
globalThis.document = { getElementById: () => null };
const { torneo, yourMatch, playTorneoRound, youOut, txapelas } = await import('../src/game/torneo.js');
let fails = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
const ctx = { comarca: 'bidasoa', comarcaName: 'Baztan-Bidasoa', towns: [{ id: 'lesaka', name: 'Lesaka' }, { id: 'etxalar', name: 'Etxalar' }, { id: 'elizondo', name: 'Elizondo' }, { id: 'ituren', name: 'Ituren' }] };
let T = torneo({ name: 'Ane', town: 'Lesaka' }, ctx);
ok(T.players.length === 8 && T.matches.length === 4 && new Set(T.matches.flatMap(m => [m.a, m.b])).size === 8, 'cuadro de 8 pelotaris y 4 cuartos');
ok(T.players.slice(1).some(p => p.townId === 'etxalar' || p.townId === 'elizondo'), 'rivales de pueblos de la comarca');
const rounds = [];
while (!T.done) { const m = yourMatch(T); if (m) { rounds.push(`${m.round} a ${m.target}`); playTorneoRound(T, m.target, 1); } else playTorneoRound(T); }
ok(T.done && T.players[T.champion].you && T.txapelas === 1, 'ganando todo: txapela');
ok(rounds.length === 3 && /7$/.test(rounds[2]) && /5$/.test(rounds[0]), `tres partidos: cuartos y semifinales a 5 y la final a 7 (${rounds.join(', ')})`);
ok(txapelas().bidasoa === 1, 'la txapela queda apuntada en la comarca');
T = torneo({ name: 'Ane', town: 'Lesaka' }, ctx); ok(T.done, 'el terminado se sigue viendo hasta pedir otro');
T = torneo({ name: 'Ane', town: 'Lesaka' }, ctx, true); ok(!T.done && T.edition === 2 && T.txapelas === 1, 'nueva edición conserva las txapelas');
// perdiendo en cuartos: el torneo sigue sin ti y termina
{ const m = yourMatch(T); playTorneoRound(T, 1, m.target); ok(youOut(T), 'eliminado en cuartos'); while (!T.done) playTorneoRound(T); ok(T.done && !T.players[T.champion].you, 'el torneo termina sin ti'); }
// por parejas: cuatro pelotaris por partido, cada uno con sus cualidades (también tu compañero)
{ const T3 = torneo({ name: 'Ane', town: 'Lesaka' }, ctx, true, 'parejas'), m = yourMatch(T3);
  ok(T3.kind === 'parejas' && T3.players.every(p => p.mates?.length === 2) && m.pairs && m.partner?.name && m.mate?.name && m.stats?.fuerza, 'por parejas: delantero y zaguero en cada pareja, con sus cualidades'); }
console.log(fails ? `${fails} FALLOS` : 'Todo correcto'); process.exit(fails ? 1 : 0);
