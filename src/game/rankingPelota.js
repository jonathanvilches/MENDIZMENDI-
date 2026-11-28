// EL RANKING DE PELOTARIS de tus campeonatos, por puntos como el de la ATP (el autor, noviembre de 2026: «un ranking de
// pelotaris por competición… y de Mi pelotari, tipo ATP»; y el 28 nov: «recuerda el ranking de pelotaris»). Cada
// campeonato da puntos por la ronda a la que llega cada uno (la txapela, 2000; la final, 1200; las semifinales, 720; los
// cuartos, 360; los octavos, 180; quedarse en la liguilla, 90) y se suman; además, los ganados, los perdidos y los tantos.
// Uno con todos y otro por cada competición (Manomanista, 4½…), para elegir en Tu progreso (hub/progreso.js).
// Antes solo contaba la edición de cada campeonato que estaba guardada: al empezar una nueva (torneo.js torneo, «Nuevo
// torneo»), lo de los rivales en la anterior se perdía. Ahora cada edición, al acabar, se apunta aquí con lo que sacó
// cada uno ('herrizherri-ranking-v1') y el ranking suma todas: las acabadas y la que está en juego.
// Solo datos y cuentas, sin pantalla ni three.js: se lleva tal cual a otro motor (PORTAR.md).
const TORNEOS = 'herrizherri-torneo-v1', KEY = 'herrizherri-ranking-v1';
export const PTS = { 'Octavos de final': 180, 'Cuartos de final': 360, 'Semifinales': 720, 'Final': 1200 };
export const TXAPELA = 2000, LIGUILLA = 90;
export const COMP = { mano: 'Manomanista', parejas: 'Parejas', cuatro: 'Cuatro y Medio', trinquete: 'Trinquete', fiestas: 'Fiestas', valles: 'Valles', invierno: 'Invierno', promesas: 'Promesas', comarcas: 'Comarcas' };
const ORDEN = Object.keys(PTS);
const lee = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || {}; } catch (e) { return {}; } };
const claveDe = (T) => (T.kind === 'mano' || !T.kind ? T.comarca : `${T.comarca}:${T.kind}`);
const idDe = (T) => `${claveDe(T)}#${T.edition || 1}`;
const compDe = (T, clave = '') => (COMP[T.kind] ? T.kind : clave.split(':')[1] in COMP ? clave.split(':')[1] : 'mano');
const quien = (pl) => (pl.you ? '·tú' : `${pl.name}|${pl.town}`);

/** Lo que sacó cada uno en una edición: [{ id, name, town, you, g, p, tf, tc, pts }]. El que gana una ronda ya tiene los
 *  puntos de la siguiente, aunque aún no se haya jugado. */
export function filasDe(T) {
  const F = new Map();
  for (const P of T?.past || []) for (const m of P.matches || []) {
    if (!m?.s) continue;
    for (const [i, j, o] of [[m.a, 0, 1], [m.b, 1, 0]]) {
      const pl = T.players?.[i]; if (!pl) continue;
      const id = quien(pl); let r = F.get(id);
      if (!r) F.set(id, r = { id, name: pl.you ? null : pl.name, town: pl.town, you: !!pl.you, g: 0, p: 0, tf: 0, tc: 0, pts: 0 });
      const gana = m.s[j] > m.s[o]; r.tf += m.s[j]; r.tc += m.s[o]; gana ? r.g++ : r.p++;
      const ix = ORDEN.indexOf(P.name), pts = P.liga || ix < 0 ? LIGUILLA : !gana ? PTS[P.name] : P.name === 'Final' ? TXAPELA : PTS[ORDEN[ix + 1]];
      r.pts = Math.max(r.pts, pts);
    }
  }
  return [...F.values()];
}

/** Apunta una edición acabada (una vez: si ya está, no hace nada). Lo llaman torneo.js al acabar un campeonato y al
 *  empezar uno nuevo encima de uno acabado, y el ranking con los acabados de antes de que existiera esto. */
export function archivaEdicion(T) {
  if (!T?.done || !T.players?.length || !T.past?.length) return;
  try {
    const A = lee(KEY), id = idDe(T); if (A[id]) return;
    A[id] = { comp: compDe(T, claveDe(T)), clave: claveDe(T), edicion: T.edition || 1, tuya: !!T.players[T.champion]?.you, filas: filasDe(T) };
    localStorage.setItem(KEY, JSON.stringify(A));
  } catch (e) { /* sin guardado: cuenta solo la edición en juego */ }
}

/** El ranking: { lista, pos, comps: [{ k, name, lista, pos }], txapelas, campeonatos }. lista, ordenada por puntos, con
 *  tu fila (you) con tu nombre; pos, tu puesto (0 si no estás). */
export function rankingPelota(tuNombre = 'Tú') {
  const todos = new Map(), por = new Map(); let txapelas = 0, campeonatos = 0;
  const suma = (comp, filas) => {
    if (!por.has(comp)) por.set(comp, new Map());
    for (const f of filas) for (const M of [todos, por.get(comp)]) {
      let r = M.get(f.id); if (!r) M.set(f.id, r = { name: f.you ? tuNombre : f.name, town: f.town, you: f.you, g: 0, p: 0, tf: 0, tc: 0, pts: 0 });
      r.g += f.g; r.p += f.p; r.tf += f.tf; r.tc += f.tc; r.pts += f.pts;
    }
  };
  const vivos = lee(TORNEOS);
  for (const T of Object.values(vivos)) if (T?.done) archivaEdicion(T);   // (los acabados de antes de que hubiera archivo)
  const A = lee(KEY), tuyasArch = {};
  for (const E of Object.values(A)) { if (!E?.filas) continue; campeonatos++; suma(COMP[E.comp] ? E.comp : 'mano', E.filas); if (E.tuya) tuyasArch[E.clave] = (tuyasArch[E.clave] || 0) + 1; }
  for (const [clave, T] of Object.entries(vivos)) {
    if (!T?.players?.length) continue;
    txapelas += T.txapelas || 0;
    const comp = compDe(T, clave);
    if (!T.done && T.past?.length) { campeonatos++; suma(comp, filasDe(T)); }
    // (tus txapelas de ediciones que no están en el archivo, de antes de que lo hubiera: 2000 cada una)
    const antes = Math.max(0, (T.txapelas || 0) - (tuyasArch[clave] || 0)), yo = T.players.find((q) => q.you);
    if (antes && yo) suma(comp, [{ id: '·tú', name: null, town: yo.town, you: true, g: 0, p: 0, tf: 0, tc: 0, pts: antes * TXAPELA }]);
  }
  const orden = (M) => { const lista = [...M.values()].sort((a, b) => b.pts - a.pts || b.g - a.g || (b.tf - b.tc) - (a.tf - a.tc) || a.p - b.p); return { lista, pos: lista.findIndex((r) => r.you) + 1 }; };
  return { ...orden(todos), comps: [...por].map(([k, M]) => ({ k, name: COMP[k], ...orden(M) })), txapelas, campeonatos };
}
