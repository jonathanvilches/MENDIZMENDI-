// El tráiler v14: el v13 con sentido y con la música del menú (el autor: «hay escenas que las tienes, luego el personaje
// sale corriendo y se choca con todo; tiene que tener un poco de sentido»; «si buscas otra música que encaje mejor, hazlo»).
// · La historia en orden, contada por sus voces: el explorador llega a Otsagabia cruzando el puente, Maite le da la
//   primera cinta («las otras siete las tienen vecinos del valle… y algún ser de leyenda»), el cuaderno con los encargos,
//   Joxemari y sus ovejas escapadas, el queso Roncal en Isaba de principio a fin, la tienda y la mochila, el campo, los
//   caminos (caballo, burro, bici, almadía) y las tradiciones, hasta el Bobo con «¡las ocho cintas!» y la danza.
// · Fuera lo que no tenía sentido: el plano de la plaza (el explorador dando vueltas a la fuente y la cámara dentro de
//   los árboles) y las vecinas de otros pueblos mirando a cámara.
// · La música del menú (musica-inicio, «Epic», a 132 pulsaciones): medio minuto de ritmo medio, medio minuto más fuerte,
//   un compás de respiro y el clímax, que acaba en el logo. Los tiempos van en tiempos de esa música: el 0 es su primer
//   compás (T0), el 128 el respiro, el 132 el clímax y el 196 el logo.
export const MUSICA = 'musica-inicio.mp3';
export const BEAT = 60 / 132, T0 = 1.799;
export const t = (b) => T0 + b * BEAT;
export const T_CLIMAX = t(132), T_LOGO = t(196), DURA = T_LOGO + 4.6;
// [tiempo, toma, primer fotograma (a 24 por segundo), velocidad, { flash, suave }]
export const PLANOS = [
  // UN EXPLORADOR LLEGA A NAVARRA
  [-T0 / BEAT, 'mapa', 26, 1, { suave: true }],         // se elige el Pirineo y la isla sube
  [8, 'vOts', 72, 1.3, { suave: true }],                // el vuelo baja hasta Otsagabia
  [16, 'correcalle', 0, 1],                             // llega corriendo por el puente hacia la plaza
  [24, 'maite', 36, 1, { suave: true }],                // «¡Kaixo! Soy Maite. ¡Ongi etorri a Otsagabia!»
  [32, 'maite', 318, 1],                                // la primera cinta, la roja
  // LOS VECINOS TE PIDEN AYUDA
  [40, 'cuaderno', 0, 1],                               // el cuaderno con los encargos de los vecinos
  [48, 'joxemari', 4, 1],                               // «Egun on, gazte. Soy Joxemari, el pastor.»
  [56, 'joxemari', 132, 1],                             // «¡Qué desastre! Seis de mis ovejas latxas se han escapado…»
  [60, 'pastoreo', 0, 1], [64, 'pastoreo', 44, 1, { flash: true }], [68, 'pastoreo', 88, 1],   // las lleva al redil
  [72, 'dIrati', 0, 1],                                 // sigue camino por el bosque
  [76, 'isla2', 60, 1],                                 // hasta el valle de Roncal
  // EN CADA PUEBLO, UNA MISIÓN: el queso Roncal en Isaba
  [80, 'isaba', 0, 0.84, { flash: true }],
  [84, 'arantxa', 4, 1],
  [88, 'roncal', 30, 1], [90, 'roncal', 150, 1],        // «Cómo se hace»
  [92, 'roncal', 192, 1], [96, 'roncal', 250, 1.2],     // la lámina
  [100, 'roncal', 436, 2],                              // ordenar los pasos
  [104, 'roncal', 566, 1],                              // ¡misión cumplida!
  [108, 'tienda', 0, 1], [110, 'tienda', 118, 1], [112, 'mochila', 0, 1], [114, 'mercQueso', 0, 1],
  // TRABAJA EL CAMPO
  [116, 'tractor', 0, 1, { flash: true }], [120, 'cosechadora', 0, 1],
  [124, 'tractor', 72, 1], [126, 'panadera', 0, 1],
  // RECORRE SUS VALLES (el respiro de la música y, en el clímax, a caballo, en burro, en bici y en almadía)
  [128, 'islaRibera', 46, 1, { suave: true }],
  [132, 'galope', 0, 1, { flash: true }], [136, 'burro', 2, 1], [140, 'bici', 2, 1], [144, 'almadia', 8, 1],
  [148, 'puente', 0, 0.84], [150, 'olite', 0, 1],
  // VIVE SUS TRADICIONES, hasta las ocho cintas y la danza
  [152, 'pelota', 0, 1, { flash: true }], [156, 'pelota', 75, 1],
  [160, 'encierro', 14, 1],
  [164, 'momo', 0, 1], [166, 'lamia', 0, 1], [168, 'basajaun', 10, 1],
  [172, 'bobo', 8, 1],                                  // «¡Las ocho cintas! ¡Los danzantes ya pueden ponerse sus trajes!»
  [180, 'danza', 0, 1.17],
  [188, 'encierro', 60, 1], [190, 'galope', 24, 1], [192, 'tractor', 98, 1], [194, 'danza', 180, 1],
  // el logo
  [196, 'final', 0, 0.75, { flash: true, suave: true }],
];
// [rótulo, tiempo en que entra, tiempos que dura]
export const ROTULOS = [['c1', 0, 7], ['c2', 44, 4], ['c3', 80, 4], ['c4', 116, 4], ['c6', 128, 4], ['c5', 152, 4]];
// [archivo, segundo, desde, hasta]
export const VOCES = [
  ['v3:salva-tierra.mp3', 0.5, 0, 99],                  // Hay una tierra donde cada pueblo guarda una historia
  ['ot:maite-00.mp3', t(24) + 0.1, 0, 3.6],             // ¡Kaixo! Soy Maite. ¡Ongi etorri a Otsagabia!
  ['ot:maite-06.mp3', t(32) + 0.15, 0, 99],             // Aquí tienes la primera cinta, la roja. Las otras siete…
  ['ot:joxemari-00.mp3', t(49) + 0.05, 0, 3.18],        // Egun on, gazte. Soy Joxemari, el pastor.
  ['ot:joxemari-01.mp3', t(56) + 0.3, 0, 99],           // ¡Qué desastre! Seis de mis ovejas latxas se han escapado…
  ['v3:salva-vecinos.mp3', t(80) + 0.2, 0, 3.76],       // Cada vecino te pide ayuda, y cada misión te enseña algo
  ['lam:queso-2.mp3', t(92) + 0.1, 0, 3.16],            // (el narrador de la lámina del queso)
  ['v3:salva-naturaleza.mp3', t(116) + 0.2, 0, 99],     // La naturaleza y la cultura, contadas jugando
  ['ot:bobo-02.mp3', t(172) + 0.2, 0, 99],              // ¡Las ocho cintas! ¡Los danzantes ya pueden ponerse sus trajes!
  ['v3:salva-herrizherri.mp3', T_LOGO + 0.4, 0, 99],
  ['v3:salva-navarra.mp3', T_LOGO + 1.8, 0, 99],        // Navarra, pueblo a pueblo
];
// [archivo, segundo, volumen, desde, cuánto]
export const EFECTOS = [
  ['ui-carta.mp3', t(32) + 0.2, 0.5], ['ui-abre.mp3', t(40), 0.4],
  ['cencerro-2.mp3', t(60), 0.25, 0, 3.6], ['ambiente-ovejas.mp3', t(66), 0.3, 0, 3.6],
  ['ui-carta.mp3', t(88) + 0.1, 0.4],
  ['ui-click.mp3', t(100) + 0.15, 0.45], ['ui-click.mp3', t(100) + 0.9, 0.45], ['ui-click.mp3', t(100) + 1.45, 0.45],
  ['ui-fanfarria.mp3', t(104) + 0.05, 0.5],
  ['ui-abre.mp3', t(108) + 0.3, 0.35], ['ui-moneda.mp3', t(110) + 0.4, 0.45], ['ui-abre.mp3', t(112), 0.35],
  ['publico-grada.mp3', t(152), 0.3, 3.0, 3.8],
];
