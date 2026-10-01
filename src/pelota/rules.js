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
  FALTA: 14,        // cuadro 4: el saque tiene que botar más allá…
  PASA: 24.5,       // …y antes del cuadro 7
  BALL_R: 0.1,      // radio visible de la pelota (algo mayor que la real para verla bien)
};

// Física (en «tiempo de juego»; el partido va a cámara algo lenta según el nivel)
export const PHYS = {
  G: 9.8,
  FLOOR_E: 0.42,     // rebote vertical en el suelo (la pelota de cuero bota poco)
  FLOOR_F: 0.7,      // lo que conserva en horizontal al botar (se frena: el segundo bote cae dentro)
  FRONT_E: 0.66,     // rebote en el frontis
  FRONT_F: 0.94,
  WALL_E: 0.74,      // rebote en la pared izquierda
  DRAG: 0.05,
};

// Niveles: ritmo del partido (cámara lenta), ayuda al jugador y fuerza del rival
export const LEVELS = {
  facil: { tempo: 0.52, reach: 1.7, assist: 1.4, rival: { speed: 4.8, react: 0.36, error: 0.12, smart: 0.35 } },
  normal: { tempo: 0.6, reach: 1.45, assist: 0.6, rival: { speed: 5.5, react: 0.25, error: 0.065, smart: 0.6 } },
  dificil: { tempo: 0.7, reach: 1.25, assist: 0, rival: { speed: 6.2, react: 0.17, error: 0.03, smart: 0.85 } },
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
      'Golpea la pelota con la mano para que dé en el frontis, por encima de la chapa (la raya roja de abajo).',
      'Cuando vuelva, puedes darle de aire o después de un bote. Si bota dos veces, el tanto es para el otro.',
      'Si cae fuera de la raya de la derecha o más allá de la última raya del fondo, es fuera.',
      'En el saque tiene que botar entre la raya del 4 (falta) y la del 7 (pasa).',
    ],
    ctrlTouch: 'Muévete con el joystick. GOLPE cuando la pelota brille. Empuja el joystick al golpear para apuntar.',
    ctrlKeys: 'Muévete con WASD o las flechas. Espacio para golpear y Mayúsculas para la dejada. Apunta con la dirección al golpear.',
    play: '¡A jugar!', later: 'Ahora no', again: 'Otra partida', cont: 'Volver al pueblo', exit: 'Salir', sure: '¿Seguro que quieres dejar el partido?', yes: 'Sí, salir', no: 'Seguir jugando',
    hit: 'GOLPE', drop: 'DEJADA',
    tipServe: 'Te toca sacar: pulsa GOLPE para botar la pelota y otra vez cuando suba.',
    tipServe2: '¡Ahora! Golpea cuando la pelota brille.',
    tipMove: 'Ve al círculo verde: ahí llegará la pelota.',
    tipHit: '¡Pulsa GOLPE!',
    tipRivalServe: 'Saca el rival. Espera a que bote y devuélvela.',
    tipWait: 'Buen golpe. Vuelve al centro.',
    calls: {
      chapa: ['¡Chapa!', 'Ha dado en la chapa, por debajo de la raya roja.'],
      corta: ['¡Falta!', 'No ha llegado al frontis.'],
      alta: ['¡Fuera!', 'Ha dado por encima de la raya del frontis.'],
      fuera: ['¡Fuera!', 'Ha botado fuera de la cancha.'],
      largo: ['¡Fuera!', 'Ha botado más allá de la última raya.'],
      falta: ['¡Falta!', 'El saque ha botado antes de la raya del 4.'],
      pasa: ['¡Pasa!', 'El saque ha botado más allá de la raya del 7.'],
      bote: ['¡Dos botes!', 'Hay que devolverla antes del segundo bote.'],
      tanto: ['¡Tanto!', ''],
    },
    quality: { perfect: '¡Perfecto!', good: '¡Bien!', ok: 'Justo', late: 'Tarde', whiff: '¡Al aire!' },
    shots: { dejada: 'Dejada', pared: 'A la pared', ancho: 'Al ancho', largo: 'Largo', normal: '' },
    pointYou: 'Tanto para ti', pointRival: (n) => `Tanto para ${n}`,
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
      'La dejada es un golpe suave que muere cerca del frontis; sirve para sorprender al rival cuando está al fondo.',
    ],
  },
  eu: {
    title: 'Esku pilota', to: (n) => `${n} tantora`, rally: (n) => `Pilotakada: ${n} jarraian`,
    you: 'Zu', red: 'Gorriak', blue: 'Urdinak',
    rules: [
      'Jo pilota eskuarekin frontisera, txaparen gainetik (beheko marra gorria).',
      'Itzultzen denean, airean edo bote baten ondoren jo dezakezu. Bi bote ematen baditu, tantoa bestearentzat.',
      'Eskuineko marratik edo atzeko azken marratik kanpo erortzen bada, kanpo da.',
      'Sakean, 4ko marraren (falta) eta 7koaren (pasa) artean egin behar du bote.',
    ],
    ctrlTouch: 'Mugitu joystickarekin. JO pilotak distira egiten duenean. Jotzean, bultzatu joystick-a zuzentzeko.',
    ctrlKeys: 'Mugitu WASD edo geziekin. Zuriunea jotzeko eta Maiuskula dejadarako. Jotzean, norabideak zuzentzen du.',
    play: 'Jolastera!', later: 'Orain ez', again: 'Beste partida bat', cont: 'Herrira itzuli', exit: 'Irten', sure: 'Ziur partida utzi nahi duzula?', yes: 'Bai, irten', no: 'Jolasten jarraitu',
    hit: 'JO', drop: 'DEJADA',
    tipServe: 'Zuri dagokizu sakea: sakatu JO pilotari bote eragiteko, eta berriz igotzean.',
    tipServe2: 'Orain! Jo pilotak distira egiten duenean.',
    tipMove: 'Joan zirkulu berdera: hor iritsiko da pilota.',
    tipHit: 'Sakatu JO!',
    tipRivalServe: 'Aurkariak ateratzen du. Itxaron boteari eta itzuli.',
    tipWait: 'Kolpe ona. Itzuli erdira.',
    calls: {
      chapa: ['Txapa!', 'Txapan jo du, marra gorriaren azpian.'],
      corta: ['Falta!', 'Ez da frontisera iritsi.'],
      alta: ['Kanpo!', 'Frontiseko marraren gainetik jo du.'],
      fuera: ['Kanpo!', 'Kantxatik kanpo egin du bote.'],
      largo: ['Kanpo!', 'Azken marratik haratago egin du bote.'],
      falta: ['Falta!', 'Sakeak 4ko marra baino lehen egin du bote.'],
      pasa: ['Pasa!', 'Sakeak 7ko marratik haratago egin du bote.'],
      bote: ['Bi bote!', 'Bigarren botea baino lehen itzuli behar da.'],
      tanto: ['Tantoa!', ''],
    },
    quality: { perfect: 'Primeran!', good: 'Ondo!', ok: 'Justu', late: 'Berandu', whiff: 'Airera!' },
    shots: { dejada: 'Dejada', pared: 'Paretara', ancho: 'Zabalera', largo: 'Luzea', normal: '' },
    pointYou: 'Tantoa zuretzat', pointRival: (n) => `Tantoa ${n}rentzat`,
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
      'Dejada kolpe leuna da, frontisetik gertu hiltzen dena; aurkaria atzean dagoenean harritzeko balio du.',
    ],
  },
};
