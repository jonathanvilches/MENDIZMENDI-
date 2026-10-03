// Pruebas del torneo de mano de la comarca sin gráficos (node): cuadro, sedes distintas, rondas, txapela.
const mem = {}; globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); } };
globalThis.document = { getElementById: () => null };
const { torneo, yourMatch, playTorneoRound, youOut, txapelas } = await import('../src/game/torneo.js');
let fails = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
const ctx = { comarca: 'bidasoa', comarcaName: 'Baztan-Bidasoa', towns: [{ id: 'lesaka', name: 'Lesaka' }, { id: 'etxalar', name: 'Etxalar' }, { id: 'elizondo', name: 'Elizondo' }, { id: 'ituren', name: 'Ituren' }] };
let T = torneo({ name: 'Ane', town: 'Lesaka' }, ctx);
ok(T.players.length === 8 && T.matches.length === 4 && new Set(T.matches.flatMap(m => [m.a, m.b])).size === 8, 'cuadro de 8 pelotaris y 4 cuartos');
ok(T.players.slice(1).some(p => p.townId === 'etxalar' || p.townId === 'elizondo'), 'rivales de pueblos de la comarca');
const venues = [];
while (!T.done) { const m = yourMatch(T); if (m) { venues.push(m.venue.id); playTorneoRound(T, m.target, 1); } else playTorneoRound(T); }
ok(T.done && T.players[T.champion].you && T.txapelas === 1, 'ganando todo: txapela');
ok(new Set(venues).size === venues.length && venues.length === 3, `cada partido en un pueblo distinto (${venues.join(', ')})`);
ok(txapelas().bidasoa === 1, 'la txapela queda apuntada en la comarca');
T = torneo({ name: 'Ane', town: 'Lesaka' }, ctx); ok(T.done, 'el terminado se sigue viendo hasta pedir otro');
T = torneo({ name: 'Ane', town: 'Lesaka' }, ctx, true); ok(!T.done && T.edition === 2 && T.txapelas === 1, 'nueva edición conserva las txapelas');
// perdiendo en cuartos: el torneo sigue sin ti y termina
{ const m = yourMatch(T); playTorneoRound(T, 1, m.target); ok(youOut(T), 'eliminado en cuartos'); while (!T.done) playTorneoRound(T); ok(T.done && !T.players[T.champion].you, 'el torneo termina sin ti'); }
// comarca con un solo pueblo del juego: también cambia de sede
{ const T2 = torneo({ name: 'Ane', town: 'Aoiz' }, { comarca: 'prepirineo', comarcaName: 'Prepirineo', towns: [{ id: 'aoiz', name: 'Aoiz / Agoitz' }, { id: 'lumbier', name: 'Lumbier' }, { id: 'sanguesa', name: 'Sangüesa' }] }); const v = [];
  while (!T2.done) { const m = yourMatch(T2); if (m) { v.push(m.venue.id); playTorneoRound(T2, m.target, 0); } else playTorneoRound(T2); }
  ok(new Set(v).size === 3, `sedes distintas aunque la comarca tenga un pueblo (${v.join(', ')})`); }
console.log(fails ? `${fails} FALLOS` : 'Todo correcto'); process.exit(fails ? 1 : 0);
