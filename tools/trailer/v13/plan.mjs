// El tráiler v13: el del v12 rehecho para que tenga ritmo (el autor: «el principio está como repetido, hay errores en la
// imagen, no tiene ritmo; hay fondos en los rótulos que no salen; tiene que ser mucho más dinámico»). Todo con tomas ya
// grabadas (v9 a v12), sin rodar nada nuevo:
// · la épica del autor entera desde ocho compases antes de su golpe: la historia del explorador en la parte suave (el
//   mapa, el vuelo a Otsagabia —solo una vez, sin la subida repetida de la isla—, la carrera y Maite), el compás en
//   silencio con su «¡Kaixo!», y desde el golpe un plano cada uno o dos tiempos, todos cortados a compás;
// · fuera los trozos quietos de las tomas (las pantallas de la tienda, la mochila y las tarjetas solo un tiempo, con la
//   cámara empujando) y el primer plano de la plaza, que empezaba con la cámara dentro de una pared;
// · los rótulos ya no van sobre negro: entran animados encima del primer plano de cada capítulo, con un velo fino.
// Los tiempos van en tiempos de la música (BEAT); el tiempo 32 es el golpe y el 160, el logo (su compás 32).
export const BEAT = 0.4737, BAR = BEAT * 4, DROP = 22.98;
export const S0 = DROP - 8 * BAR;                       // (dónde empieza la canción: ocho compases antes del golpe)
export const T_DROP = 32 * BEAT, T_LOGO = 160 * BEAT, DURA = T_LOGO + 5.6;
// [tiempo, toma, primer fotograma (a 24 por segundo), velocidad, { flash, suave }]
// (cada plano dura hasta el siguiente; todos con un empujón de cámara al entrar, salvo los «suave» del principio)
export const PLANOS = [
  // UN EXPLORADOR LLEGA A NAVARRA (la parte suave)
  [0, 'mapa', 44, 1, { suave: true }],                  // se elige el Pirineo y la isla sube
  [8, 'vOts', 70, 1.3, { suave: true }],                // el vuelo baja hasta Otsagabia
  [16, 'dIrati', 0, 1],                                 // el explorador corre por el bosque
  [20, 'llega', 50, 1],                                 // llega a la plaza
  [24, 'maite', 36, 1, { suave: true }],                // Maite: «¡Kaixo! Soy Maite. ¡Ongi etorri a Otsagabia!»
  // LOS VECINOS TE PIDEN AYUDA (el golpe)
  [32, 'pastoreo', 0, 1, { flash: true }],
  [36, 'joxemari', 4, 1],                               // «Egun on, gazte. Soy Joxemari, el pastor.»
  [40, 'maite', 318, 1],                                // la tarjeta de la cinta roja
  [42, 'cuaderno', 0, 1],
  [44, 'pastoreo', 62, 1],
  [48, 'felisa', 4, 1], [50, 'nerea', 4, 1],
  [52, 'rBodeguera', 0, 0.84],
  // EN CADA PUEBLO, UNA MISIÓN: el queso Roncal de principio a fin, la tienda y la mochila
  [56, 'isaba', 0, 0.84, { flash: true }],
  [60, 'arantxa', 4, 1],
  [64, 'roncal', 30, 1], [66, 'roncal', 150, 1],        // «Cómo se hace»
  [68, 'roncal', 192, 1], [72, 'roncal', 250, 1.2],     // la lámina
  [76, 'roncal', 436, 2],                               // ordenar los pasos
  [80, 'roncal', 566, 1],                               // ¡misión cumplida!
  [84, 'tienda', 0, 1], [86, 'tienda', 118, 1], [88, 'mochila', 0, 1], [90, 'mercQueso', 0, 1],
  // TRABAJA EL CAMPO
  [92, 'tractor', 0, 1, { flash: true }],
  [96, 'cosechadora', 0, 1],
  [100, 'tractor', 72, 1], [102, 'panadera', 0, 1],
  [104, 'cosechadora', 58, 1],
  [108, 'mercMiel', 0, 1], [110, 'tractor', 96, 1],
  // RECORRE SUS VALLES: el caballo y el burro ya con riendas, la bici, la almadía
  [112, 'galope', 0, 1, { flash: true }],
  [116, 'burro', 2, 1], [120, 'bici', 2, 1], [124, 'almadia', 8, 1],
  [128, 'islaRibera', 46, 1.4], [132, 'puente', 0, 0.84],
  // VIVE SUS TRADICIONES
  [136, 'pelota', 0, 1, { flash: true }], [140, 'pelota', 75, 1],
  [144, 'encierro', 14, 1],
  [148, 'momo', 0, 1], [150, 'lamia', 0, 1], [152, 'basajaun', 10, 1], [154, 'bobo', 16, 1],
  [156, 'danza', 0, 1.6],
  // el logo
  [160, 'final', 0, 0.75, { flash: true, suave: true }],
];
// [rótulo, tiempo en que entra, tiempos que dura]
export const ROTULOS = [['c1', 1, 6], ['c2', 32, 4], ['c3', 56, 4], ['c4', 92, 4], ['c6', 112, 4], ['c5', 136, 4]];
// [archivo, segundo, desde, hasta]
export const VOCES = [
  ['v3:salva-tierra.mp3', 0.45, 0, 99],                 // Hay una tierra donde cada pueblo guarda una historia
  ['ot:maite-00.mp3', 24 * BEAT + 0.15, 0, 3.6],        // ¡Kaixo! Soy Maite. ¡Ongi etorri a Otsagabia!
  ['ot:joxemari-00.mp3', 36 * BEAT + 0.1, 0, 3.18],     // Egun on, gazte. Soy Joxemari, el pastor.
  ['v3:salva-vecinos.mp3', 56 * BEAT + 0.2, 0, 3.76],   // Cada vecino te pide ayuda, y cada misión te enseña algo
  ['lam:queso-2.mp3', 68 * BEAT + 0.1, 0, 3.16],        // (el narrador de la lámina del queso)
  ['v3:salva-naturaleza.mp3', 92 * BEAT + 0.2, 0, 99],  // La naturaleza y la cultura, contadas jugando
  ['ot:bobo-02.mp3', 152 * BEAT + 0.05, 0, 99],         // ¡Las ocho cintas! ¡Los danzantes ya pueden ponerse sus trajes!
  ['v3:salva-herrizherri.mp3', T_LOGO + 0.4, 0, 99],
  ['v3:salva-navarra.mp3', T_LOGO + 1.8, 0, 99],        // Navarra, pueblo a pueblo
];
// [archivo, segundo, volumen, desde, cuánto]
export const EFECTOS = [
  ['cencerro-2.mp3', 32 * BEAT, 0.25, 0, 1.9], ['ambiente-ovejas.mp3', 44 * BEAT, 0.3, 0, 1.9],
  ['ui-carta.mp3', 40 * BEAT + 0.12, 0.5], ['ui-abre.mp3', 42 * BEAT, 0.4],
  ['ui-carta.mp3', 64 * BEAT + 0.1, 0.4],
  ['ui-click.mp3', 76 * BEAT + 0.15, 0.45], ['ui-click.mp3', 76 * BEAT + 0.9, 0.45], ['ui-click.mp3', 76 * BEAT + 1.45, 0.45],
  ['ui-fanfarria.mp3', 80 * BEAT + 0.05, 0.5],
  ['ui-abre.mp3', 84 * BEAT + 0.3, 0.35], ['ui-moneda.mp3', 86 * BEAT + 0.4, 0.45], ['ui-abre.mp3', 88 * BEAT, 0.35],
  ['publico-grada.mp3', 136 * BEAT, 0.3, 3.0, 3.8],
];
