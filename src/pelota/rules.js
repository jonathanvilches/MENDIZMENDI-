// Pelota a mano · medidas del frontón, reglas y textos (castellano y euskera).
// Coordenadas del frontón: el frontis está en z = 0 y la cancha crece hacia +z; la pared izquierda
// está en x = −W/2 (a la izquierda de quien mira al frontis) y la derecha queda abierta (contracancha).

export const COURT = {
  W: 10,            // ancho de la cancha (m)
  L: 31.5,          // largo jugable: 9 cuadros de 3,5 m
  CUADRO: 3.5,
  FRONT_H: 10,      // altura del frontis
  FRONT_TOP: 9.4,   // raya superior del frontis: por encima es fuera
  CHAPA: 0.9,       // la chapa: la pelota tiene que dar por encima
  LEFT_H: 8.5,      // altura de la pared izquierda
  LEFT_LINE: 8,     // su raya roja: por encima es mala
  FALTA: 14,        // cuadro 4: el saque tiene que botar más allá…
  PASA: 24.5,       // …y antes del cuadro 7
  BALL_R: 0.1,      // radio visible de la pelota (algo mayor que la real para verla bien)
  REBOTE: 34.5,     // el rebote: la pared de atrás, a 3 m de la última raya
  REBOTE_H: 8.5,     // tan alto como la pared izquierda
};

// Física (en «tiempo de juego»; el partido va a cámara algo lenta según el nivel)
export const PHYS = {
  G: 9.8,
  FLOOR_E: 0.25,     // rebote vertical en el suelo (la pelota de cuero bota poco: medio metro tras un golpe normal)
  FLOOR_SOFT: 0.17,  // cuanto más despacio llega al suelo (dejada, segundo bote), más rebota en proporción: se ve botar
  FLOOR_F: 0.66,      // lo que conserva en horizontal al botar (se frena: el segundo bote cae dentro)
  FRONT_E: 0.47,     // rebote en el frontis (sale con bastante menos fuerza de la que llega: da tiempo a colocarse)
  FRONT_F: 0.9,
  FRONT_FX: 0.62,    // lo que conserva de lado al dar en el frontis (rozamiento: la pelota no sale cruzada)
  WALL_E: 0.74,      // rebote en la pared izquierda
  BACK_E: 0.55,      // y en el rebote (la pared de atrás)
  CUT_E: 0.62,       // cortada: sale del frontis con más fuerza que un golpe normal…
  CUT_FLOOR_E: 0.36, // …bota algo más bajo que un golpe, pero se ve botar (con 0,18 apenas se despegaba del suelo)…
  CUT_FLOOR_F: 0.8,  // …y corre más al botar
  DRAG: 0.065,
};

// Niveles: ritmo del partido (cámara lenta), ayuda al jugador y fuerza del rival
export const LEVELS = {
  facil: { tempo: 0.5, reach: 1.85, assist: 1.8, rival: { speed: 4.8, react: 0.36, error: 0.12, smart: 0.35, dash: 1.0 } },
  normal: { tempo: 0.58, reach: 1.65, assist: 1.0, rival: { speed: 5.5, react: 0.25, error: 0.065, smart: 0.6, dash: 1.05 } },
  dificil: { tempo: 0.68, reach: 1.4, assist: 0.35, rival: { speed: 6.2, react: 0.17, error: 0.03, smart: 0.85, dash: 1.15 } },
  // (los dos de los extremos: para empezar, más lento y con más ayuda que el fácil; para los que ya lo dominan, el rival
  // casi no falla y apenas hay ayuda)
  iniciacion: { tempo: 0.44, reach: 2.05, assist: 2.4, rival: { speed: 4.3, react: 0.44, error: 0.17, smart: 0.22, dash: 0.95 } },
  experto: { tempo: 0.74, reach: 1.3, assist: 0.15, rival: { speed: 6.6, react: 0.13, error: 0.02, smart: 0.95, dash: 1.2 } },
};
// los cinco niveles, de menos a más, y lo fuerte que es el rival en cada uno (de 1 a 4, para sus cualidades)
export const LEVEL_ORDER = ['iniciacion', 'facil', 'normal', 'dificil', 'experto'];
export const levelTier = (lv) => ({ iniciacion: 1, facil: 1, normal: 2, dificil: 3, experto: 4 })[lv] || 2;

// El frontón también juega: cómo es (a cubierto o al aire libre, con el frontis de piedra, con el suelo mojado por la
// lluvia, o el Labrit de las finales) cambia un poco la pelota. Devuelve lo que se nota en la física (front, floor, run:
// para setFeel de physics.js) y sus rasgos, cada uno con su nombre y lo que pasa, para contarlo antes del partido
const FEEL_TXT = {
  es: { hall: ['Frontón cubierto', 'Cerrado y con el rebote hasta el techo: la pelota no se sale. Luz de pabellón.'], covered: ['A cubierto', 'Sin viento ni lluvia: la pelota bota igual todo el partido.'], open: ['Al aire libre', 'Suelo seco: bote de siempre.'],
    stone: ['Frontis de piedra', 'La pelota sale más lenta del frontis: da más tiempo, pero para llegar atrás hay que pegar fuerte.'],
    wet: ['Suelo mojado', 'Llueve: la pelota bota menos y llega baja. Hay que agacharse antes.'],
    labrit: ['Labrit', 'El frontón de las finales: pelota viva, sale rápida del frontis y bota alegre.'] },
  eu: { hall: ['Frontoi estalia', 'Itxia eta errebotea sabairaino: pilota ez da ateratzen. Pabiloiko argia.'], covered: ['Estalita', 'Haizerik eta euririk gabe: pilotak berdin botatzen du partida osoan.'], open: ['Aire zabalean', 'Lur lehorra: betiko botea.'],
    stone: ['Harrizko frontisa', 'Pilota motelago ateratzen da frontisetik: denbora gehiago dago, baina atzera iristeko gogor jo behar da.'],
    wet: ['Lur bustia', 'Euria ari du: pilotak gutxiago botatzen du eta baxu iristen da. Lehenago makurtu behar da.'],
    labrit: ['Labrit', 'Finaletako frontoia: pilota bizia, frontisetik azkar ateratzen da eta alai botatzen du.'] },
};
// las pelotas que se pueden elegir: cuánto sale del frontis (front), cuánto bota (floor) y cuánto corre al botar (run)
export const BALLS = { normal: { front: 1, floor: 1, run: 1 }, viva: { front: 1.08, floor: 1.05, run: 1 }, muerta: { front: 0.9, floor: 0.94, run: 0.98 },
  botona: { front: 1, floor: 1.12, run: 0.97 }, rasa: { front: 1, floor: 0.86, run: 1.06 } };
export const BALL_ORDER = ['normal', 'viva', 'muerta', 'botona', 'rasa'];
export function courtFeel({ covered = false, stone = false, wet = false, labrit = false, hall = false } = {}, lang = 'es') {
  const T = FEEL_TXT[lang] || FEEL_TXT.es, f = { front: 1, floor: 1, run: 1 }, tags = [];
  // (cerrado por todas partes: el rebote llega al techo y la pelota no se sale por detrás)
  if (hall) { f.backH = 30; f.leftH = 30; }
  const tag = (k) => tags.push({ k, name: T[k][0], what: T[k][1] });
  if (labrit) { f.front *= 1.05; f.floor *= 1.05; tag('labrit'); }
  else if (hall) tag('hall');
  else if (covered) tag('covered');
  else if (wet) { f.floor *= 0.86; f.run *= 1.06; tag('wet'); }   // (al aire libre y lloviendo: el suelo, mojado)
  else tag('open');
  if (stone && !labrit) { f.front *= 0.95; tag('stone'); }
  return { ...f, tags };
}

// Cualidades de cada pelotari (de 1 a 5): fuerza (lo largo y rápido que pega: los fuertes llegan al rebote), agilidad
// (reflejos y manos: lo pegado a la pared izquierda o lo muy bajo les cuesta menos) y velocidad (lo que corren: a uno lento
// le pillan las dejadas). Salen del nombre y del nivel (1 a 3): siempre las mismas para el mismo pelotari
// la carta de un pelotari, como en los juegos de fútbol: cada cualidad (de 1 a 5) en la escala de 0 a 99, con un pequeño
// ajuste que sale del nombre (siempre el mismo para el mismo pelotari) para que no salgan todas iguales, y la media
const fnv = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
/** Una cualidad de 1 a 5 en la escala de 0 a 99 (k distingue cada cualidad del mismo jugador). */
export const rate99 = (v, seed = '', k = 0) => Math.max(40, Math.min(99, Math.round(38 + (v || 3) * 11 + ((fnv(seed + k) % 7) - 3))));
/** { vel, pot, man, ovr } de un pelotari; bonus: lo que sube la media (la tuya, con cada txapela; la del rival, con su nivel). */
export function pelotariRating(st = {}, seed = '', bonus = 0) {
  const vel = rate99(st.velocidad, seed, 1), pot = rate99(st.fuerza, seed, 2), man = rate99(st.agilidad, seed, 3);
  return { vel, pot, man, ovr: Math.max(45, Math.min(99, Math.round((vel + pot + man) / 3 + bonus))) };
}
export function pelotariStats(seed = '', lv = 2) {
  let h = 2166136261; for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const r = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const total = Math.max(5, Math.min(13, 5 + lv * 2 + Math.floor(r() * 2))), st = { fuerza: 1, agilidad: 1, velocidad: 1 }, k = Object.keys(st);
  // un punto fuerte y uno flojo bien marcados (así se nota con quién juegas)
  const si = Math.floor(r() * 3), strong = k[si], weak = k[(si + 1 + Math.floor(r() * 2)) % 3];
  st[strong] = Math.min(5, 3 + Math.floor(r() * 2));
  let left = total - st.fuerza - st.agilidad - st.velocidad;
  for (let n = 0; left > 0 && n < 200; n++) { const c = k[Math.floor(r() * 3)]; if (st[c] < (c === weak && lv < 3 ? 2 : 5)) { st[c]++; left--; } }
  st.style = pelotariStyle(seed, st);
  return st;
}
// Golpes preferidos (de 0 a 3 estrellas): cortada, dos paredes, gancho (a la pared izquierda), dejada y largo (al fondo,
// al rebote). Uno que le gusta mucho y otro bastante; van con sus cualidades: el fuerte suele ir a la cortada o al
// largo, el ágil a las dos paredes o al gancho y el rápido a la dejada. La IA los busca (juega como dice su ficha)
export const SHOTS = ['cortada', 'dosparedes', 'gancho', 'dejada', 'largo'];
export function pelotariStyle(seed = '', st = { fuerza: 3, agilidad: 3, velocidad: 3 }) {
  let h = 2166136261; for (const ch of 'golpes ' + String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const r = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const base = { cortada: st.fuerza, largo: st.fuerza, dosparedes: st.agilidad, gancho: st.agilidad, dejada: (st.velocidad + st.agilidad) / 2 };
  const pick = (skip) => { const ks = SHOTS.filter(k => !skip.includes(k)), w = ks.map(k => base[k] ** 2), t = w.reduce((a, b) => a + b, 0); let x = r() * t; for (let i = 0; i < ks.length; i++) { x -= w[i]; if (x <= 0) return ks[i]; } return ks[ks.length - 1]; };
  const fav = pick([]), sec = pick([fav]), sty = {};
  for (const k of SHOTS) sty[k] = k === fav ? 3 : k === sec ? 2 : r() < 0.3 ? 1 : 0;
  return sty;
}
// una frase del rival para la pantalla VS: lo que más se le nota (su golpe preferido o, si no tiene, su cualidad fuerte)
const QUOTES = {
  es: { cortada: 'Su cortada sale rasa, pegada a la chapa: no te deja respirar.', dosparedes: 'Busca la pared izquierda para cruzarte la pelota a dos paredes.',
    gancho: 'Te arrincona contra la pared izquierda, tanto tras tanto.', dejada: 'Cuando menos lo esperas, te la deja muerta junto al frontis.',
    largo: 'Te manda al fondo, al rebote, hasta que te canses.', fuerza: 'Pega tan fuerte que la pelota llega al rebote.',
    agilidad: 'Saca pelotas imposibles con unas manos de seda.', velocidad: 'Llega a todas: no des ninguna por ganada.' },
  eu: { cortada: 'Bere kortada txaparen ondotik doa: ez dizu arnasarik hartzen uzten.', dosparedes: 'Ezkerreko horma bilatzen du pilota bi hormatara gurutzatzeko.',
    gancho: 'Ezkerreko hormaren kontra estutzen zaitu, tantoz tanto.', dejada: 'Gutxien uste duzunean, frontisaren ondoan hilda uzten dizu.',
    largo: 'Atzera bidaltzen zaitu, errebotera, nekatu arte.', fuerza: 'Hain gogor jotzen du, pilota errebotera iristen dela.',
    agilidad: 'Ezinezko pilotak ateratzen ditu, esku leunekin.', velocidad: 'Denetara iristen da: ez eman ezer irabazitzat.' },
};
export function rivalQuote(st = {}, lang = 'es') {
  const Q = QUOTES[lang] || QUOTES.es, fav = SHOTS.find(k => st.style?.[k] === 3);
  if (fav) return Q[fav];
  const k = ['fuerza', 'agilidad', 'velocidad'].sort((a, b) => (st[b] || 0) - (st[a] || 0))[0];
  return Q[k];
}
// la ficha del rival: cómo corre, cuánto pega, sus manos, sus golpes preferidos y de qué tener cuidado
const word = (v, w) => v <= 2 ? w[0] : v >= 4 ? w[2] : w[1];
// (compact: por parejas, dos fichas juntas: solo los golpes de dos o tres estrellas y el aviso)
export function profileHtml(name, st, lang = 'es', role = '', compact = !!role) {
  const T = TEXT[lang] || TEXT.es, P = T.profile || TEXT.es.profile, sty = st.style || {}, esc = (x) => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dots = (v) => '●'.repeat(v) + '<u>' + '●'.repeat(5 - v) + '</u>', stars = (n) => '★'.repeat(n);
  const fav = SHOTS.filter(k => sty[k] > (compact ? 1 : 0)).sort((a, b) => sty[b] - sty[a]), top = fav[0];
  const kind = [top && sty[top] >= 3 ? P.arch[top] : '', st.velocidad >= 4 ? P.fast : st.velocidad <= 2 ? P.slow : '', st.fuerza >= 4 ? P.strong : ''].filter(Boolean).join(', ');
  const rows = [[P.run, st.velocidad, P.runW], [P.power, st.fuerza, P.powerW], [P.hands, st.agilidad, P.handsW]].map(([k, v, w]) => `<span class="st">${k} <i>${dots(v)}</i> ${word(v, w)}</span>`).join('');
  const shots = fav.length ? `<span class="pf-sh">${P.shots}: ${fav.map(k => `<em>${P.names[k]} <i>${stars(sty[k])}</i></em>`).join(' ')}</span>` : '';
  const warn = top && sty[top] >= 3 ? P.warn[top] : '', tip = compact && warn ? '' : statsTips(st, lang)[0] || '';
  return `<b>${esc(P.title(name, role))}${kind ? ` · <span class="pf-k">${kind}</span>` : ''}</b>${rows}${shots}${warn || tip ? `<p>${warn ? `<strong>${warn}</strong> ` : ''}${tip}</p>` : ''}`;
}
/** Consejos para jugar contra un pelotari según sus cualidades (los dos que más se notan). */
export function statsTips(st, lang = 'es') {
  const T = TEXT[lang]?.tips || TEXT.es.tips, out = [];
  if (st.velocidad <= 2) out.push(T.slow);
  if (st.agilidad <= 2) out.push(T.clumsy);
  if (st.fuerza >= 4) out.push(T.strong);
  if (st.velocidad >= 4) out.push(T.fast);
  if (st.fuerza <= 2) out.push(T.weak);
  if (st.agilidad >= 4) out.push(T.agile);
  return out.slice(0, 2);
}
const EU_NUM = ['hutsa', 'bat', 'bi', 'hiru', 'lau', 'bost', 'sei', 'zazpi', 'zortzi', 'bederatzi', 'hamar', 'hamaika', 'hamabi', 'hamahiru', 'hamalau', 'hamabost', 'hamasei', 'hamazazpi', 'hamazortzi', 'hemeretzi', 'hogei', 'hogeita bat', 'hogeita bi'];
export const euNum = (n) => EU_NUM[n] || String(n);

// Tanteo cantado por el kantari: primero el que va ganando y su color; «berdin» si van empatados
export function kantari(red, blue) {
  if (red === blue) return red === 0 ? '' : `${cap(euNum(red))} berdin!`;
  const hi = Math.max(red, blue), lo = Math.min(red, blue);
  return `${cap(euNum(hi))} eta ${euNum(lo)}, ${red > blue ? 'gorriak' : 'urdinak'}!`;
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const TEXT = {
  es: {
    title: 'Pelota a mano', to: (n) => `a ${n} tantos`, rally: (n) => `Peloteo: ${n} seguidas`,
    you: 'Tú', red: 'Gorriak', blue: 'Urdinak',
    rules: [
      'Golpea con la mano: la pelota tiene que dar en el frontis por encima de la chapa (la raya roja).',
      'Devuélvela de aire o tras un bote. Al segundo bote, tanto para el otro.',
      'Es fuera si bota más allá de la raya derecha o de la última raya del fondo, si da en el frontis por encima de su raya o fuera de la raya de la derecha, y si da en la pared izquierda por encima de la raya roja.',
      'Al sacar se sale corriendo del 7 y se bota la pelota poco antes del 4. El saque debe botar entre la raya del 4 (falta) y la del 7 (pasa).',
      'El golpe lo das tú: suelta el botón cuando la pelota llegue a ti (el aro se cierra sobre el botón). Pronto, se va a la izquierda; tarde, a la derecha y más baja. Antes del bote es volea; alta, por encima del hombro, gancho.',
      'Correr a tope, la cortada, las dos paredes y el gancho gastan energía. Peloteando normal la recuperas. Cansado, corres menos, llegas peor y fallas más.',
      'Si bota dentro y llega a la pared de atrás (el rebote), vuelve y se puede jugar antes del segundo bote. Si da en el rebote sin botar, es fuera.',
    ],
    level: 'Nivel', rulesTitle: 'Reglas y controles', moreTitle: 'Más opciones', optTabs: ['Partido', 'Reglas', 'Controles'], optBack: 'Volver', energy: 'Energía', camDyn: ['Cámara dinámica', 'La cámara sigue la pelota y se mueve con los golpes fuertes.'], vsTap: 'Toca para empezar', fronton: (t) => `Frontón de ${t}`, card: ['Vel', 'Pot', 'Man'], ovr: 'Media', friendly: 'Partido amistoso',
    levels: { iniciacion: 'Iniciación', facil: 'Fácil', normal: 'Normal', dificil: 'Difícil', experto: 'Experto' },
    // las partes del frontón, una a una con la cámara (cada zona tiene su nombre, y hay que saberlo para seguir el juego)
    tour: { btn: 'Partes del frontón', next: 'Siguiente', prev: 'Anterior', end: 'Volver', parts: [
      ['Frontis', 'La pared de delante. Toda pelota tiene que dar en ella, por debajo de la raya de arriba.'],
      ['Chapa', 'La franja de abajo del frontis, con su raya roja. Si la pelota da ahí, el tanto se pierde.'],
      ['Pared izquierda', 'Con los números de los cuadros. Se puede jugar a ella, pero por debajo de su raya roja.'],
      ['Cancha', 'El suelo de juego, en cuadros de 3,5 metros. La pelota tiene que botar dentro.'],
      ['Falta', 'La raya del cuadro 4. El saque tiene que botar más allá; si bota antes, es falta.'],
      ['Pasa', 'La raya del cuadro 7. Si el saque bota más allá, es pasa y se pierde el tanto.'],
      ['Contracancha', 'La franja de la derecha, fuera de la cancha. Si la pelota bota ahí, es fuera.'],
      ['Rebote', 'La pared del fondo. Si la pelota llega tras botar dentro, vuelve y se sigue jugando; si da sin botar, es fuera.'],
    ] },
    stats: { fuerza: 'Fuerza', agilidad: 'Agilidad', velocidad: 'Velocidad', rival: (n) => `Así juega ${n}` },
    profile: { title: (n, r) => r ? `${n} · ${r}` : `Así juega ${n}`, run: 'Corre', power: 'Potencia', hands: 'Manos', runW: ['poco', 'normal', 'mucho'], powerW: ['poca', 'normal', 'mucha'], handsW: ['torpes', 'normales', 'finas'],
      shots: 'Sus golpes', names: { cortada: 'Cortada', dosparedes: 'Dos paredes', gancho: 'Gancho a la izquierda', dejada: 'Dejada', largo: 'Largo, al rebote' },
      arch: { cortada: 'cortador', dosparedes: 'de dos paredes', gancho: 'de ganchos a la izquierda', dejada: 'dejador', largo: 'pegador de fondo' },
      fast: 'muy rápido', slow: 'lento', strong: 'pega muy fuerte',
      warn: { cortada: '¡Cuidado con su cortada: rasa y rápida!', dosparedes: '¡Cuidado con sus dos paredes: cúbrete a la derecha!', gancho: '¡Cuidado con sus ganchos a la izquierda: no te despegues de la pared!', dejada: '¡Cuidado con sus dejadas: no te quedes atrás!', largo: '¡Cuidado: pega largo, al rebote! No te adelantes.' } },
    tips: { slow: 'Es lento: hazle dejadas cuando esté al fondo.', clumsy: 'Le cuesta lo pegado a la pared izquierda y lo muy bajo: ajústala a la pared.', strong: 'Pega muy fuerte: puede mandarla al rebote. No te adelantes.', fast: 'Es muy rápido: llega casi a todo. Busca la pared o las dos paredes.', weak: 'Le falta fuerza: juega largo, lejos del frontis.', agile: 'Tiene buenas manos: hasta lo pegado a la pared lo devuelve.' },
    rebote: '¡Al rebote!',
    ctrlTouch: 'Joystick: moverte · mantén GOLPE para cargar y apuntar: el pelotari va solo a la pelota y la línea marca el camino y el bote · suelta cuando el aro se cierre sobre el botón: ese es el momento justo · a la izquierda va a la izquierda y a la derecha, a la derecha; arriba larga, abajo corta · a tope y arriba: al rebote · izquierda del todo: dos paredes · CORTADA rasa y rápida · DEJADA, junto al frontis.',
    ctrlKeys: 'WASD o flechas para moverte · Espacio: golpe (mantén para cargar: cuanto más, más fuerte; suéltalo cuando el aro se cierre sobre el botón) · L: cortada (tan fuerte o más que el golpe, pero baja, cerca de la chapa) · Mayúsculas: dejada (suave, cae junto al frontis) · mientras mantienes el golpe, la dirección apunta y el pelotari va solo a la pelota (la línea enseña el camino): izquierda a la izquierda, derecha a la derecha, arriba larga, abajo corta; izquierda del todo, dos paredes; arriba-izquierda, pegada a la pared.',
    play: '¡A jugar!', later: 'Ahora no', again: 'Otra partida', cont: 'Volver al pueblo', contMenu: 'Volver al menú', contTorneo: 'Seguir con el torneo', exit: 'Salir', sure: '¿Seguro que quieres dejar el partido?', yes: 'Sí, salir', no: 'Seguir jugando', ficha: 'Ficha', fichas: 'Fichas de los pelotaris', vsYou: 'Tú', vsEven: 'Equilibrado',
    hit: 'GOLPE', drop: 'DEJADA', cut: 'CORTADA', hitVolley: 'VOLEA', hitGancho: 'GANCHO',
    tipServe: 'Te toca sacar: pulsa GOLPE para salir corriendo del 7 hacia el 4.',
    tipServeRun: 'Poco antes del 4 botas la pelota: pulsa GOLPE cuando suba.',
    tipServe2: '¡Ahora! Golpea cuando la pelota brille.',
    tipMove: 'Ve al círculo verde: ahí llegará la pelota.',
    tipAim: 'Apunta con el joystick: izquierda del todo, dos paredes. Suelta para golpear.',
    tipHit: '¡Ahora! Suelta cuando el aro se cierre.',
    tipRivalServe: 'Saca el rival. Espera junto a la pared, en el 7, a que bote y devuélvela.',
    tipWait: 'Buen golpe. Vuelve al centro.',
    energyTitle: 'Energía', tiredYou: 'Estás cansado: corres menos y fallarás más. Pelotea normal, sin cortadas, para recuperar.',
    calls: {
      chapa: ['¡Chapa!', 'Ha dado en la chapa, por debajo de la raya roja.'],
      corta: ['¡Falta!', 'No ha llegado al frontis.'],
      alta: ['¡Fuera!', 'Ha dado por encima de la raya del frontis.'],
      pared: ['¡Fuera!', 'Ha dado en la pared izquierda por encima de la raya roja.'],
      lado: ['¡Fuera!', 'Ha dado en el frontis fuera de la raya de la derecha.'],
      fuera: ['¡Fuera!', 'Ha botado fuera de la cancha.'],
      largo: ['¡Fuera!', 'Ha botado más allá de la última raya.'],
      falta: ['¡Falta!', 'El saque ha botado antes de la raya del 4.'],
      pasa: ['¡Pasa!', 'El saque ha botado más allá de la raya del 7.'],
      bote: ['¡Dos botes!', 'Hay que devolverla antes del segundo bote.'],
      tanto: ['¡Tanto!', ''],
    },
    quality: { perfect: '¡Perfecto!', good: '¡Bien!', ok: 'Justo', late: 'Tarde', early: 'Pronto', whiff: '¡Al aire!' },
    force: 'fuerza', volea: 'De volea', costs: 'gasta energía', gains: 'recuperas energía',
    // la pelota se elige: cuánto sale del frontis y cuánto bota cambian el juego (el rival juega con la misma)
    ball: { label: 'Pelota', kinds: {
      normal: ['Normal', 'La de siempre: sale del frontis y bota lo justo.'],
      viva: ['Viva', 'Sale más del frontis y bota algo más: el peloteo va más rápido.'],
      muerta: ['Muerta', 'Sale menos del frontis y bota menos: hay que llegar antes.'],
      botona: ['De mucho bote', 'Bota más alto: da más tiempo, pero cuesta pegarla abajo.'],
      rasa: ['De poco bote', 'Bota bajo y corre por el suelo: las cortadas hacen más daño.'],
    } },
    shots: { rebote: 'Al rebote', dejada: 'Dejada', cortada: 'Cortada', pared: 'A la pared', dosparedes: 'Dos paredes', dpCorta: 'Dos paredes corta', dpCruzada: 'Dos paredes cruzada', dpLarga: 'Dos paredes larga', dpPegada: 'Dos paredes pegada', cortDos: 'Cortada a dos paredes', ancho: 'Al ancho', largo: 'Largo', gancho: 'Gancho', ganchoCruzado: 'Gancho cruzado', normal: '' },
    pointYou: 'Tanto para ti', pointRival: (n) => `Tanto para ${n}`,
    pairs: { label: 'Partido', single: 'Mano a mano', front: 'Parejas: delantero', back: 'Parejas: zaguero', frontName: 'delantero', backName: 'zaguero',
      how: (front) => front ? 'Juegas de delantero: tuyas las de delante, hasta el cuadro 5, y sacas tú. Tu compañero zaguero coge las de atrás.' : 'Juegas de zaguero: tuyas las de atrás, desde el cuadro 5. Tu compañero delantero coge las de delante y saca él.',
      rivals: (a, b) => `Así juegan ${a} y ${b}`, loading: 'Preparando…', mateServe: 'Saca tu compañero.', mateBall: 'Esa es de tu compañero.', rivalServe: 'Saca el rival: el resto lo coge tu zaguero.',
      energy: 'Correr y las cortadas cansan: si te cansas, deja que tu compañero juegue más; si se cansa él, pide tú la pelota manteniendo GOLPE.',
      claim: '¡Mía!', rest: 'Descansa: esta la coge tu compañero.', mateTired: (hit) => `Tu compañero está cansado: pide tú la pelota manteniendo ${hit}.`,
      pointUs: 'Tanto para vosotros', pointThem: (a, b) => `Tanto para ${a} y ${b}` },
    finalCall: '¡Tanto y partido!', finalSub: 'Todo el frontón en pie aplaude.', matchPoint: 'Tanto de partido', matchPointSub: 'El que gane este tanto, gana el partido.',
    serveYou: 'Sacas tú', serveRival: (n) => `Saca ${n}`,
    streak: (n, g) => `${n} de ${g} seguidas`,
    win: '¡Has ganado!', lose: '¡Casi! Otra vez será', rallyWin: '¡Lo has conseguido!',
    result: (a, b) => `${a} – ${b}`,
    factsTitle: '¿Sabías que…?',
    facts: [
      'En la pelota a mano se juega con la mano desnuda. Los pelotaris se protegen los dedos con tacos y esparadrapo.',
      'La chapa es una banda de metal en la parte baja del frontis. Si la pelota da ahí, suena distinto y el tanto se pierde.',
      'La cancha está dividida en cuadros de 3,5 metros. Sus números no se pintan en el suelo, sino en la pared izquierda: una raya blanca con el número en un círculo.',
      'En los partidos, el kantari canta el tanteo en euskera, por ejemplo: «Bost eta lau, gorriak!» (cinco a cuatro, los rojos).',
      'Casi todos los pueblos de Navarra tienen frontón, muchas veces en la plaza, junto a la iglesia o el ayuntamiento.',
      'La dejada es un golpe suave que muere cerca del frontis: un toque la deja justo encima de la chapa; si la cargas, pega más alta y bota algo más lejos. Sirve para sorprender al rival cuando está al fondo.',
      'El golpe a dos paredes va primero a la pared izquierda, luego al frontis y sale cruzado hacia la cancha: muy difícil de devolver.',
      'La cortada es un golpe fuerte que da en el frontis cerca de la chapa: cuanto menos la cargas, más rasa (vuelve baja y rápida, pero arriesgas a la chapa); cargada del todo pega a media altura del frontis. Mientras cargas, una marca amarilla en el frontis enseña dónde dará.',
    ],
  },
  eu: {
    title: 'Esku pilota', to: (n) => `${n} tantora`, rally: (n) => `Pilotakada: ${n} jarraian`,
    you: 'Zu', red: 'Gorriak', blue: 'Urdinak',
    rules: [
      'Jo eskuarekin: pilotak frontisean jo behar du, txaparen gainetik (marra gorria).',
      'Itzuli airean edo bote baten ondoren. Bigarren botean, tantoa bestearentzat.',
      'Kanpo da eskuineko marratik edo atzeko azken marratik haratago bote egiten badu, frontisean bere marraren gainetik edo eskuineko marratik kanpo jotzen badu, eta ezkerreko paretan marra gorriaren gainetik jotzen badu.',
      'Ateratzeko, 7tik korrika irten eta 4a baino pixka bat lehenago pilotari bote eragiten zaio. Sakeak 4ko marraren (falta) eta 7koaren (pasa) artean egin behar du bote.',
      'Kolpea zuk ematen duzu: askatu botoia pilota zuregana iristen denean (eraztuna botoiaren gainean ixten da). Goiz, ezkerrera doa; berandu, eskuinera eta baxuago. Botearen aurretik, boleia da; goian, sorbaldaren gainetik, ganchoa.',
      'Bizkor korrika egiteak, cortadak, bi paretek eta ganchoak energia gastatzen dute. Ohiko pilotakadekin berreskuratzen duzu. Nekatuta, gutxiago korrika egiten duzu, okerrago iristen zara eta gehiago huts egiten duzu.',
      'Barruan bote egin eta atzeko paretara (errebotera) iristen bada, itzuli egiten da eta bigarren botea baino lehen jo daiteke. Bote egin gabe errebotean jotzen badu, kanpo da.',
    ],
    level: 'Maila', rulesTitle: 'Arauak eta kontrolak', moreTitle: 'Aukera gehiago', optTabs: ['Partida', 'Arauak', 'Kontrolak'], optBack: 'Itzuli', energy: 'Energia', camDyn: ['Kamera dinamikoa', 'Kamerak pilotari jarraitzen dio eta kolpe indartsuekin mugitzen da.'], vsTap: 'Ukitu hasteko', fronton: (t) => `Frontoia · ${t}`, card: ['Abi', 'Ind', 'Esk'], ovr: 'Batez', friendly: 'Lagunarteko partida',
    levels: { iniciacion: 'Hasiera', facil: 'Erraza', normal: 'Normala', dificil: 'Zaila', experto: 'Aditua' },
    tour: { btn: 'Frontoiaren atalak', next: 'Hurrengoa', prev: 'Aurrekoa', end: 'Itzuli', parts: [
      ['Frontisa', 'Aurreko horma. Pilota orok bertan jo behar du, goiko marraren azpitik.'],
      ['Txapa', 'Frontisaren beheko zerrenda, bere marra gorriarekin. Pilotak bertan jotzen badu, tantoa galtzen da.'],
      ['Ezker horma', 'Koadroen zenbakiekin. Bertara jo daiteke, baina bere marra gorriaren azpitik.'],
      ['Kantxa', 'Jokoaren lurra, 3,5 metroko koadroetan. Pilotak barruan egin behar du bote.'],
      ['Falta', '4. koadroko marra. Sakeak haratago egin behar du bote; lehenago egiten badu, falta da.'],
      ['Pasa', '7. koadroko marra. Sakeak haratago egiten badu bote, pasa da eta tantoa galtzen da.'],
      ['Kontrakantxa', 'Eskuineko zerrenda, kantxatik kanpo. Pilotak bertan bote egiten badu, kanpo da.'],
      ['Errebotea', 'Atzeko horma. Pilota barruan bote egin ondoren iristen bada, itzuli egiten da eta jokoak jarraitzen du; bote egin gabe jotzen badu, kanpo da.'],
    ] },
    stats: { fuerza: 'Indarra', agilidad: 'Arintasuna', velocidad: 'Abiadura', rival: (n) => `${n}: honela jokatzen du` },
    profile: { title: (n, r) => r ? `${n} · ${r}` : `${n}: honela jokatzen du`, run: 'Korrika', power: 'Indarra', hands: 'Eskuak', runW: ['gutxi', 'normal', 'asko'], powerW: ['gutxi', 'normala', 'handia'], handsW: ['traketsak', 'normalak', 'finak'],
      shots: 'Bere kolpeak', names: { cortada: 'Cortada', dosparedes: 'Bi pareta', gancho: 'Ezkerrerako ganchoa', dejada: 'Dejada', largo: 'Luzea, errebotera' },
      arch: { cortada: 'cortadazalea', dosparedes: 'bi paretakoa', gancho: 'ezkerreko ganchoetakoa', dejada: 'dejadazalea', largo: 'atzeko jotzailea' },
      fast: 'oso azkarra', slow: 'motela', strong: 'oso gogor jotzen du',
      warn: { cortada: 'Kontuz bere cortadarekin: baxua eta azkarra!', dosparedes: 'Kontuz bere bi paretekin: babestu eskuinaldea!', gancho: 'Kontuz bere ezkerrerako ganchoekin: ez urrundu paretatik!', dejada: 'Kontuz bere dejadekin: ez geratu atzean!', largo: 'Kontuz: luze jotzen du, errebotera! Ez aurreratu.' } },
    tips: { slow: 'Motela da: egin dejadak atzean dagoenean.', clumsy: 'Ezkerreko paretari itsatsitakoak eta oso baxuak kostatzen zaizkio: paretara estutu.', strong: 'Oso gogor jotzen du: errebotera bidal dezake. Ez aurreratu.', fast: 'Oso azkarra da: ia guztira iristen da. Bilatu pareta edo bi pareta.', weak: 'Indarra falta zaio: jokatu luze, frontisetik urrun.', agile: 'Esku onak ditu: paretari itsatsitakoak ere itzultzen ditu.' },
    rebote: 'Errebotera!',
    ctrlTouch: 'Joysticka: mugitu · eutsi JO kargatzeko eta zuzentzeko: pilotaria bera doa pilotara eta marrak bidea eta botea erakusten ditu · askatu eraztuna botoiaren gainean ixten denean: hori da une zuzena · ezkerrera ezkerrera doa eta eskuinera eskuinera; gora luzea, behera motza · ezkerrera erabat: bi pareta · CORTADA baxua eta azkarra · DEJADA, frontisaren ondoan.',
    ctrlKeys: 'WASD edo geziak mugitzeko · Zuriunea: jo (eutsi kargatzeko; askatu eraztuna botoiaren gainean ixten denean) · L: cortada (joa bezain indartsua edo gehiago, baina baxua, txapatik gertu) · Maiuskula: dejada (leuna, frontisaren ondoan erortzen da) · jokoari eusten diozun bitartean, norabideak zuzentzen du eta pilotaria bera doa pilotara (marrak bidea erakusten du): ezkerra ezkerrera, eskuina eskuinera, gora luzea, behera motza; ezkerra erabat, bi pareta; gora-ezkerra, paretari itsatsita.',
    play: 'Jolastera!', later: 'Orain ez', again: 'Beste partida bat', cont: 'Herrira itzuli', contMenu: 'Menura itzuli', contTorneo: 'Txapelketarekin jarraitu', exit: 'Irten', sure: 'Ziur partida utzi nahi duzula?', yes: 'Bai, irten', no: 'Jolasten jarraitu', ficha: 'Fitxa', fichas: 'Pilotarien fitxak', vsYou: 'Zu', vsEven: 'Orekatua',
    hit: 'JO', drop: 'DEJADA', cut: 'CORTADA', hitVolley: 'BOLEIA', hitGancho: 'GANCHOA',
    tipServe: 'Zuri dagokizu sakea: sakatu JO 7tik 4rantz korrika irteteko.',
    tipServeRun: '4a baino lehentxeago pilotari bote eragingo diozu: sakatu JO igotzean.',
    tipServe2: 'Orain! Jo pilotak distira egiten duenean.',
    tipMove: 'Joan zirkulu berdera: hor iritsiko da pilota.',
    tipAim: 'Zuzendu joystickarekin: ezkerrera erabat, bi pareta. Askatu jotzeko.',
    tipHit: 'Orain! Askatu eraztuna ixten denean.',
    tipRivalServe: 'Aurkariak ateratzen du. Itxaron hormaren ondoan, 7an, boteari eta itzuli.',
    tipWait: 'Kolpe ona. Itzuli erdira.',
    energyTitle: 'Energia', tiredYou: 'Nekatuta zaude: gutxiago korrika egingo duzu eta gehiago huts egingo duzu. Jokatu arrunt, cortadarik gabe, berreskuratzeko.',
    calls: {
      chapa: ['Txapa!', 'Txapan jo du, marra gorriaren azpian.'],
      corta: ['Falta!', 'Ez da frontisera iritsi.'],
      alta: ['Kanpo!', 'Frontiseko marraren gainetik jo du.'],
      pared: ['Kanpo!', 'Ezkerreko paretan marra gorriaren gainetik jo du.'],
      lado: ['Kanpo!', 'Frontisean eskuineko marratik kanpo jo du.'],
      fuera: ['Kanpo!', 'Kantxatik kanpo egin du bote.'],
      largo: ['Kanpo!', 'Azken marratik haratago egin du bote.'],
      falta: ['Falta!', 'Sakeak 4ko marra baino lehen egin du bote.'],
      pasa: ['Pasa!', 'Sakeak 7ko marratik haratago egin du bote.'],
      bote: ['Bi bote!', 'Bigarren botea baino lehen itzuli behar da.'],
      tanto: ['Tantoa!', ''],
    },
    quality: { perfect: 'Primeran!', good: 'Ondo!', ok: 'Justu', late: 'Berandu', early: 'Goiz', whiff: 'Airera!' },
    force: 'indarra', volea: 'Boleaz', costs: 'energia gastatzen du', gains: 'energia berreskuratzen duzu',
    ball: { label: 'Pilota', kinds: {
      normal: ['Arrunta', 'Betikoa: frontisetik eta lurretik behar bezala ateratzen da.'],
      viva: ['Bizia', 'Frontisetik gehiago ateratzen da eta gehiago egiten du bote: pilotakada azkarragoa da.'],
      muerta: ['Hila', 'Frontisetik gutxiago ateratzen da eta gutxiago egiten du bote: lehenago iritsi behar da.'],
      botona: ['Bote handikoa', 'Gorago egiten du bote: denbora gehiago ematen du, baina behetik jotzea kostatzen da.'],
      rasa: ['Bote txikikoa', 'Baxu egiten du bote eta lurrean korrika doa: cortadek kalte handiagoa egiten dute.'],
    } },
    shots: { rebote: 'Errebotera', dejada: 'Dejada', cortada: 'Cortada', pared: 'Paretara', dosparedes: 'Bi pareta', dpCorta: 'Bi pareta motza', dpCruzada: 'Bi pareta zeharka', dpLarga: 'Bi pareta luzea', dpPegada: 'Bi pareta itsatsia', cortDos: 'Bi paretako cortada', gancho: 'Ganchoa', ganchoCruzado: 'Gancho zeharkakoa', ancho: 'Zabalera', largo: 'Luzea', normal: '' },
    pointYou: 'Tantoa zuretzat', pointRival: (n) => `Tantoa ${n}rentzat`,
    pairs: { label: 'Partida', single: 'Buruz buru', front: 'Binaka: aurrelari', back: 'Binaka: atzelari', frontName: 'aurrelaria', backName: 'atzelaria',
      how: (front) => front ? 'Aurrelari zara: aurrekoak zureak dira, 5. koadroraino, eta zuk ateratzen duzu. Zure atzelari lagunak atzekoak hartzen ditu.' : 'Atzelari zara: atzekoak zureak dira, 5. koadrotik aurrera. Zure aurrelari lagunak aurrekoak hartzen ditu eta berak ateratzen du.',
      rivals: (a, b) => `${a} eta ${b}: honela jokatzen dute`, loading: 'Prestatzen…', mateServe: 'Zure lagunak ateratzen du.', mateBall: 'Hori zure lagunarena da.', rivalServe: 'Aurkariak ateratzen du: zure atzelariak hartzen du.',
      energy: 'Korrika egiteak eta cortadek nekatzen dute: nekatzen bazara, utzi zure lagunari gehiago jokatzen; bera nekatzen bada, eskatu zuk pilota JO sakatuta mantenduz.',
      claim: 'Nirea!', rest: 'Atseden hartu: hau zure lagunak hartzen du.', mateTired: (hit) => `Zure laguna nekatuta dago: eskatu zuk pilota ${hit} sakatuta mantenduz.`,
      pointUs: 'Tantoa zuentzat', pointThem: (a, b) => `Tantoa ${a} eta ${b}rentzat` },
    finalCall: 'Tantoa eta partida!', finalSub: 'Pilotaleku osoa zutik, txaloka.', matchPoint: 'Partidarako tantoa', matchPointSub: 'Tanto hau irabazten duenak partida irabazten du.',
    serveYou: 'Zuk ateratzen duzu', serveRival: (n) => `${n}k ateratzen du`,
    streak: (n, g) => `${n}/${g} jarraian`,
    win: 'Irabazi duzu!', lose: 'Ia-ia! Hurrengoan', rallyWin: 'Lortu duzu!',
    result: (a, b) => `${a} – ${b}`,
    factsTitle: 'Ba al zenekien…?',
    facts: [
      'Esku pilotan esku hutsez jokatzen da. Pilotariek atzamarrak tako eta esparatrapuz babesten dituzte.',
      'Txapa frontisaren beheko metalezko banda da. Pilota hor jotzen badu, beste soinu bat ateratzen du eta tantoa galtzen da.',
      'Kantxa 3,5 metroko koadroetan banatuta dago. Zenbakiak ez dira zoruan margotzen, ezkerreko paretan baizik: marra zuri bat eta zenbakia biribil baten barruan.',
      'Partidetan, kantariak euskaraz kantatzen du tanteoa, adibidez: «Bost eta lau, gorriak!».',
      'Nafarroako herri ia guztiek dute frontoia, askotan plazan, elizaren edo udaletxearen ondoan.',
      'Dejada kolpe leuna da, frontisetik gertu hiltzen dena: ukitu batek txaparen gainean uzten du; kargatzen baduzu, gorago jotzen du eta urrunago egiten du bote. Aurkaria atzean dagoenean harritzeko balio du.',
      'Bi paretako kolpea lehenik ezkerreko paretara doa, gero frontisera eta zeharka irteten da kantxara: oso zaila da itzultzea.',
      'Cortada kolpe indartsua da, frontisean txapatik gertu jotzen duena: zenbat eta gutxiago kargatu, orduan eta baxuago (azkar itzultzen da, baina txapa arriskatzen duzu); guztiz kargatuta frontisaren erdian jotzen du. Kargatzen ari zaren bitartean, marka hori batek frontisean non joko duen erakusten du.',
    ],
  },
};
