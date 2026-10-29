// Pruebas de la Liga Navarra sin gráficos (node): para cada club, calendario de todos contra todos, jornadas simuladas,
// clasificación coherente y campeón; y que cada pueblo del juego tenga su club.
const mem = {}; globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
// (los módulos, por el cargador de Vite: los clubes llevan sus escudos con import.meta.glob, que node solo no entiende)
const { createServer } = await import('vite');
const vite = await createServer({ configFile: new URL('../vite.config.js', import.meta.url).pathname, logLevel: 'error', server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
const { CLUBS, TOWN_CLUB, teamOfClub, awayKit } = await vite.ssrLoadModule('/src/futbol/clubs.js');
const { season, nextMatch, playRound, table, newSeason } = await vite.ssrLoadModule('/src/futbol/liga.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('  FALLO', m); } };
const towns = 'lesaka etxalar zugarramurdi amaiur-maya-del-baztan ituren elizondo leitza lekunberri orreaga-roncesvalles aribe otsagabia-ochagavia isaba-izaba erronkari-roncal burgui-burgi altsasu-alsasua irurtzun aoiz lumbier irulegi sanguesa estella viana puente-la-reina artajona tafalla javier ujue olite marcilla tudela cortes'.split(' ');
for (const t of towns) ok(CLUBS[TOWN_CLUB[t]], `${t} sin club`);
for (const id of Object.keys(CLUBS)) {
  const T = teamOfClub(id); ok(T && /^#[0-9a-f]{6}$/i.test(T.shirt) && T.short.length === 3, `${id}: equipo`);
  const S = season(id);
  ok(S.teams.length === 8 && new Set(S.teams).size === 8 && S.teams[0] === id, `${id}: 8 equipos distintos`);
  // (a ida y vuelta: 14 jornadas, cada pareja dos veces, una en cada campo)
  ok(S.rounds.length === 14 && S.rounds.every(R => R.length === 4 && new Set(R.flatMap(m => [m.h, m.a])).size === 8), `${id}: 14 jornadas de 4 partidos, cada uno juega una vez`);
  const pairs = new Set(S.rounds.flat().map(m => [m.h, m.a].sort().join('-'))), idas = new Set(S.rounds.flat().map(m => m.h + '-' + m.a)); ok(pairs.size === 28 && idas.size === 56, `${id}: todos contra todos, ida y vuelta (${pairs.size}/28, ${idas.size}/56)`);
  const homes = S.rounds.filter(R => R.some(m => m.h === id)).length; ok(homes === 7, `${id}: en casa ${homes} de 14`);
  while (nextMatch(S)) { const m = nextMatch(S); ok(m.h === id || m.a === id, `${id}: su partido`); playRound(S, 2, 1); }
  const tb = table(S); ok(tb.every(r => r.pj === 14) && tb.reduce((a, r) => a + r.gf, 0) === tb.reduce((a, r) => a + r.gc, 0), `${id}: clasificación coherente`);
  ok(tb.find(r => r.id === id).pts === 42 && S.champion === id && S.titles === 1, `${id}: ganando todo, campeón (${tb.find(r => r.id === id).pts} pts)`);
  const S2 = newSeason(id); ok(S2.j === 0 && S2.titles === 1 && S2.year === 2, `${id}: nueva temporada guarda los títulos`);
}
// choques de color: el visitante cambia de camiseta si se parecen
const A = awayKit(teamOfClub('baztan'), teamOfClub('aoiz')); ok(A.second && A.shirt !== teamOfClub('aoiz').shirt, 'Baztan–Aoiz (los dos de rojo): el visitante, con la segunda');
const B = awayKit(teamOfClub('baztan'), teamOfClub('izarra')); ok(!B.second, 'Baztan–Izarra: cada uno con la suya');
// una liga simulada entera: resultados razonables
{ const S = newSeason('tudelano'); while (nextMatch(S)) playRound(S, null, null); const g = S.rounds.flat().reduce((a, m) => a + m.g[0] + m.g[1], 0) / S.rounds.flat().length;
  console.log(`  goles por partido simulado: ${g.toFixed(2)}; campeón ${CLUBS[S.champion].name}`); ok(g > 1.5 && g < 4.5, 'goles por partido razonables'); }
console.log(fails ? `${fails} FALLOS` : 'Todo correcto');
await vite.close(); process.exit(fails ? 1 : 0);
