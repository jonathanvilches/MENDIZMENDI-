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
  CUT_E: 0.62,       // cortada: sale del frontis con más fuerza que un golpe normal…
  CUT_FLOOR_E: 0.36, // …bota algo más bajo que un golpe, pero se ve botar (con 0,18 apenas se despegaba del suelo)…
  CUT_FLOOR_F: 0.8,  // …y corre más al botar
  DRAG: 0.065,
};

// Niveles: ritmo del partido (cámara lenta), ayuda al jugador y fuerza del rival
export const LEVELS = {
  facil: { tempo: 0.5, reach: 1.85, assist: 1.8, rival: { speed: 4.8, react: 0.36, error: 0.12, smart: 0.35, dash: 0.8 } },
  normal: { tempo: 0.58, reach: 1.65, assist: 1.0, rival: { speed: 5.5, react: 0.25, error: 0.065, smart: 0.6, dash: 0.85 } },
  dificil: { tempo: 0.68, reach: 1.4, assist: 0.35, rival: { speed: 6.2, react: 0.17, error: 0.03, smart: 0.85, dash: 0.94 } },
};

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
    ],
    level: 'Nivel',
    ctrlTouch: 'Joystick: moverte · mantén GOLPE para cargar y apuntar: el pelotari va solo a la pelota y la línea marca el camino y el bote · suelta cuando brille · a la izquierda va a la izquierda y a la derecha, a la derecha; arriba larga, abajo corta · izquierda del todo: dos paredes · CORTADA rasa y rápida · DEJADA, junto al frontis.',
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
    shots: { dejada: 'Dejada', cortada: 'Cortada', pared: 'A la pared', dosparedes: 'Dos paredes', dpCorta: 'Dos paredes corta', dpCruzada: 'Dos paredes cruzada', dpLarga: 'Dos paredes larga', dpPegada: 'Dos paredes pegada', cortDos: 'Cortada a dos paredes', ancho: 'Al ancho', largo: 'Largo', normal: '' },
    pointYou: 'Tanto para ti', pointRival: (n) => `Tanto para ${n}`,
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
    ],
    level: 'Maila',
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
    shots: { dejada: 'Dejada', cortada: 'Cortada', pared: 'Paretara', dosparedes: 'Bi pareta', dpCorta: 'Bi pareta motza', dpCruzada: 'Bi pareta zeharka', dpLarga: 'Bi pareta luzea', dpPegada: 'Bi pareta itsatsia', cortDos: 'Bi paretako cortada', ancho: 'Zabalera', largo: 'Luzea', normal: '' },
    pointYou: 'Tantoa zuretzat', pointRival: (n) => `Tantoa ${n}rentzat`,
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
