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
};

// Cualidades de cada pelotari (de 1 a 5): fuerza (lo largo y rápido que pega: los fuertes llegan al rebote), agilidad
// (reflejos y manos: lo pegado a la pared izquierda o lo muy bajo les cuesta menos) y velocidad (lo que corren: a uno lento
// le pillan las dejadas). Salen del nombre y del nivel (1 a 3): siempre las mismas para el mismo pelotari
export function pelotariStats(seed = '', lv = 2) {
  let h = 2166136261; for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const r = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const total = Math.max(5, Math.min(13, 5 + lv * 2 + Math.floor(r() * 2))), st = { fuerza: 1, agilidad: 1, velocidad: 1 }, k = Object.keys(st);
  // un punto fuerte y uno flojo bien marcados (así se nota con quién juegas)
  const si = Math.floor(r() * 3), strong = k[si], weak = k[(si + 1 + Math.floor(r() * 2)) % 3];
  st[strong] = Math.min(5, 3 + Math.floor(r() * 2));
  let left = total - st.fuerza - st.agilidad - st.velocidad;
  for (let n = 0; left > 0 && n < 200; n++) { const c = k[Math.floor(r() * 3)]; if (st[c] < (c === weak && lv < 3 ? 2 : 5)) { st[c]++; left--; } }
  return st;
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
      'El saque debe botar entre la raya del 4 (falta) y la del 7 (pasa).',
      'Cada golpe cansa, más si es fuerte. Con poca energía se falla más; entre tanto y tanto se descansa.',
      'Si bota dentro y llega a la pared de atrás (el rebote), vuelve y se puede jugar antes del segundo bote. Si da en el rebote sin botar, es fuera.',
    ],
    level: 'Nivel', rulesTitle: 'Reglas y controles',
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
    tips: { slow: 'Es lento: hazle dejadas cuando esté al fondo.', clumsy: 'Le cuesta lo pegado a la pared izquierda y lo muy bajo: ajústala a la pared.', strong: 'Pega muy fuerte: puede mandarla al rebote. No te adelantes.', fast: 'Es muy rápido: llega casi a todo. Busca la pared o las dos paredes.', weak: 'Le falta fuerza: juega largo, lejos del frontis.', agile: 'Tiene buenas manos: hasta lo pegado a la pared lo devuelve.' },
    rebote: '¡Al rebote!',
    ctrlTouch: 'Joystick: moverte · mantén GOLPE para cargar y apuntar: el pelotari va solo a la pelota y la línea marca el camino y el bote · suelta cuando brille · a la izquierda va a la izquierda y a la derecha, a la derecha; arriba larga, abajo corta · a tope y arriba: al rebote · izquierda del todo: dos paredes · CORTADA rasa y rápida · DEJADA, junto al frontis.',
    ctrlKeys: 'WASD o flechas para moverte · Espacio: golpe (mantén para cargar: cuanto más, más fuerte) · L: cortada (tan fuerte o más que el golpe, pero baja, cerca de la chapa) · Mayúsculas: dejada (suave, cae junto al frontis) · mientras mantienes el golpe, la dirección apunta y el pelotari va solo a la pelota (la línea enseña el camino): izquierda a la izquierda, derecha a la derecha, arriba larga, abajo corta; izquierda del todo, dos paredes; arriba-izquierda, pegada a la pared.',
    play: '¡A jugar!', later: 'Ahora no', again: 'Otra partida', cont: 'Volver al pueblo', exit: 'Salir', sure: '¿Seguro que quieres dejar el partido?', yes: 'Sí, salir', no: 'Seguir jugando',
    hit: 'GOLPE', drop: 'DEJADA', cut: 'CORTADA',
    tipServe: 'Te toca sacar: pulsa GOLPE para botar la pelota y otra vez cuando suba.',
    tipServe2: '¡Ahora! Golpea cuando la pelota brille.',
    tipMove: 'Ve al círculo verde: ahí llegará la pelota.',
    tipAim: 'Apunta con el joystick: izquierda del todo, dos paredes. Suelta para golpear.',
    tipHit: '¡Pulsa GOLPE!',
    tipRivalServe: 'Saca el rival. Espera a que bote y devuélvela.',
    tipWait: 'Buen golpe. Vuelve al centro.',
    energyTitle: 'Energía', tiredYou: 'Estás cansado: fallarás más. Entre tanto y tanto recuperas.',
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
    quality: { perfect: '¡Perfecto!', good: '¡Bien!', ok: 'Justo', late: 'Tarde', whiff: '¡Al aire!' },
    shots: { rebote: 'Al rebote', dejada: 'Dejada', cortada: 'Cortada', pared: 'A la pared', dosparedes: 'Dos paredes', dpCorta: 'Dos paredes corta', dpCruzada: 'Dos paredes cruzada', dpLarga: 'Dos paredes larga', dpPegada: 'Dos paredes pegada', cortDos: 'Cortada a dos paredes', ancho: 'Al ancho', largo: 'Largo', normal: '' },
    pointYou: 'Tanto para ti', pointRival: (n) => `Tanto para ${n}`,
    pairs: { label: 'Partido', single: 'Mano a mano', front: 'Parejas: delantero', back: 'Parejas: zaguero', frontName: 'delantero', backName: 'zaguero',
      how: (front) => front ? 'Juegas de delantero: tuyas las de delante, hasta el cuadro 5, y sacas tú. Tu compañero zaguero coge las de atrás.' : 'Juegas de zaguero: tuyas las de atrás, desde el cuadro 5. Tu compañero delantero coge las de delante y saca él.',
      rivals: (a, b) => `Así juegan ${a} y ${b}`, loading: 'Preparando…', mateServe: 'Saca tu compañero.', mateBall: 'Esa es de tu compañero.', rivalServe: 'Saca el rival: el resto lo coge tu zaguero.',
      energy: 'Cada golpe cansa: si te cansas, deja que tu compañero juegue más; si se cansa él, pide tú la pelota manteniendo GOLPE.',
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
      'Sakeak 4ko marraren (falta) eta 7koaren (pasa) artean egin behar du bote.',
      'Kolpe bakoitzak nekatzen du, gogorra bada gehiago. Energia gutxirekin gehiago huts egiten da; tanto batetik bestera atseden hartzen da.',
      'Barruan bote egin eta atzeko paretara (errebotera) iristen bada, itzuli egiten da eta bigarren botea baino lehen jo daiteke. Bote egin gabe errebotean jotzen badu, kanpo da.',
    ],
    level: 'Maila', rulesTitle: 'Arauak eta kontrolak',
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
    tips: { slow: 'Motela da: egin dejadak atzean dagoenean.', clumsy: 'Ezkerreko paretari itsatsitakoak eta oso baxuak kostatzen zaizkio: paretara estutu.', strong: 'Oso gogor jotzen du: errebotera bidal dezake. Ez aurreratu.', fast: 'Oso azkarra da: ia guztira iristen da. Bilatu pareta edo bi pareta.', weak: 'Indarra falta zaio: jokatu luze, frontisetik urrun.', agile: 'Esku onak ditu: paretari itsatsitakoak ere itzultzen ditu.' },
    rebote: 'Errebotera!',
    ctrlTouch: 'Joysticka: mugitu · eutsi JO kargatzeko eta zuzentzeko: pilotaria bera doa pilotara eta marrak bidea eta botea erakusten ditu · askatu distira egitean · ezkerrera ezkerrera doa eta eskuinera eskuinera; gora luzea, behera motza · ezkerrera erabat: bi pareta · CORTADA baxua eta azkarra · DEJADA, frontisaren ondoan.',
    ctrlKeys: 'WASD edo geziak mugitzeko · Zuriunea: jo (eutsi kargatzeko) · L: cortada (joa bezain indartsua edo gehiago, baina baxua, txapatik gertu) · Maiuskula: dejada (leuna, frontisaren ondoan erortzen da) · jokoari eusten diozun bitartean, norabideak zuzentzen du eta pilotaria bera doa pilotara (marrak bidea erakusten du): ezkerra ezkerrera, eskuina eskuinera, gora luzea, behera motza; ezkerra erabat, bi pareta; gora-ezkerra, paretari itsatsita.',
    play: 'Jolastera!', later: 'Orain ez', again: 'Beste partida bat', cont: 'Herrira itzuli', exit: 'Irten', sure: 'Ziur partida utzi nahi duzula?', yes: 'Bai, irten', no: 'Jolasten jarraitu',
    hit: 'JO', drop: 'DEJADA', cut: 'CORTADA',
    tipServe: 'Zuri dagokizu sakea: sakatu JO pilotari bote eragiteko, eta berriz igotzean.',
    tipServe2: 'Orain! Jo pilotak distira egiten duenean.',
    tipMove: 'Joan zirkulu berdera: hor iritsiko da pilota.',
    tipAim: 'Zuzendu joystickarekin: ezkerrera erabat, bi pareta. Askatu jotzeko.',
    tipHit: 'Sakatu JO!',
    tipRivalServe: 'Aurkariak ateratzen du. Itxaron boteari eta itzuli.',
    tipWait: 'Kolpe ona. Itzuli erdira.',
    energyTitle: 'Energia', tiredYou: 'Nekatuta zaude: gehiago huts egingo duzu. Tanto batetik bestera berreskuratzen duzu.',
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
    quality: { perfect: 'Primeran!', good: 'Ondo!', ok: 'Justu', late: 'Berandu', whiff: 'Airera!' },
    shots: { rebote: 'Errebotera', dejada: 'Dejada', cortada: 'Cortada', pared: 'Paretara', dosparedes: 'Bi pareta', dpCorta: 'Bi pareta motza', dpCruzada: 'Bi pareta zeharka', dpLarga: 'Bi pareta luzea', dpPegada: 'Bi pareta itsatsia', cortDos: 'Bi paretako cortada', ancho: 'Zabalera', largo: 'Luzea', normal: '' },
    pointYou: 'Tantoa zuretzat', pointRival: (n) => `Tantoa ${n}rentzat`,
    pairs: { label: 'Partida', single: 'Buruz buru', front: 'Binaka: aurrelari', back: 'Binaka: atzelari', frontName: 'aurrelaria', backName: 'atzelaria',
      how: (front) => front ? 'Aurrelari zara: aurrekoak zureak dira, 5. koadroraino, eta zuk ateratzen duzu. Zure atzelari lagunak atzekoak hartzen ditu.' : 'Atzelari zara: atzekoak zureak dira, 5. koadrotik aurrera. Zure aurrelari lagunak aurrekoak hartzen ditu eta berak ateratzen du.',
      rivals: (a, b) => `${a} eta ${b}: honela jokatzen dute`, loading: 'Prestatzen…', mateServe: 'Zure lagunak ateratzen du.', mateBall: 'Hori zure lagunarena da.', rivalServe: 'Aurkariak ateratzen du: zure atzelariak hartzen du.',
      energy: 'Kolpe bakoitzak nekatzen du: nekatzen bazara, utzi zure lagunari gehiago jokatzen; bera nekatzen bada, eskatu zuk pilota JO sakatuta mantenduz.',
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
