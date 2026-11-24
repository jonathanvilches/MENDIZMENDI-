// El tráiler v15: el guion del autor (24 nov 2026): «empezar por un plano del mapa de Navarra, se eleva la isla flotante de
// Pirineos, va a Ochagavía, el vuelo del dron sigue con la maqueta de Ochagavía y entra al pueblo. Vemos al personaje
// corriendo y van cambiando los pueblos de atrás, y va poniendo Ochagavía, Puente la Reina, Isaba, Pamplona, Tudela. Vemos
// cómo habla con los vecinos. Imágenes de las misiones, de las explicaciones, de la obtención del queso, el pimiento, todo
// planos muy limpios; también de los deportes rurales, de las leyendas, personajes [y los momotxorros]. Y todo cuenta una
// historia: nuestro pequeño explorador debe completar todas las comarcas, todas las misiones, ayudar a los vecinos,
// descubrir las leyendas, la cultura». Y «hay muchas imágenes que tienen errores, que se traban»: todo a 24 imágenes por
// segundo de verdad (las de 12 del v11, regrabadas en v15/tomas.mjs y v15/tomas-ui.mjs), sin velocidades que repitan o
// salten imágenes, y las pocas imágenes repetidas sueltas que tiene alguna toma, cambiadas por la mezcla de sus vecinas
// (v15/montaje.py).
// La música del menú (musica-inicio, «Epic», 132 pulsaciones): el 0 es su primer compás, el 64 su segundo tramo, el 128 el
// respiro, el 132 el clímax y el 196 el logo.
export const MUSICA = 'musica-inicio.mp3';
export const BEAT = 60 / 132, T0 = 1.799;
export const t = (b) => T0 + b * BEAT;
export const T_CLIMAX = t(132), T_LOGO = t(196), DURA = T_LOGO + 4.6;
// [tiempo, toma, primer fotograma, velocidad (1 siempre: a 24 por segundo, imagen a imagen), { flash, suave }]
export const PLANOS = [
  // UN PEQUEÑO EXPLORADOR LLEGA A NAVARRA: el mapa, la isla del Pirineo que sube, el vuelo hasta Otsagabia y su maqueta,
  // el dron que baja al pueblo hasta la espalda del explorador
  [-T0 / BEAT, 'mapa', 26, 1, { suave: true }],
  [8, 'vOts', 72, 1, { suave: true }],
  [16, 'entra', 16, 1, { suave: true }],
  // corre, y detrás van cambiando los pueblos (con su nombre)
  [20, 'dOts', 0, 1], [24, 'cPuente', 6, 1], [28, 'cIsaba', 6, 1], [32, 'cPamplona', 6, 1], [36, 'cTudela', 6, 1],
  // AYUDA A LOS VECINOS: Maite, Joxemari y sus ovejas, la quesera de Isaba, vecinas de otros pueblos
  [40, 'rio', 2, 1, { suave: true }],
  [44, 'hMaite', 36, 1], [48, 'hJoxemari', 14, 1], [52, 'pastoreo', 0, 1], [56, 'hArantxa', 10, 1],
  [60, 'felisa', 4, 1], [62, 'nerea', 4, 1],
  // COMPLETA SUS MISIONES: la cosecha, el queso (cómo se hace, ordenar los pasos, misión cumplida), el pimiento del piquillo
  // (la cosecha y cómo se hace), el tractor y el horno de pan
  [64, 'cosech10', 0, 1, { flash: true }],
  [68, 'lQueso', 8, 1], [72, 'mRoncal', 452, 1], [76, 'mRoncal', 570, 1],
  [80, 'piquillo', 6, 1], [84, 'lPiquillo', 8, 1], [88, 'tractor10', 0, 1], [92, 'panadera', 0, 1],
  // VIVE SU CULTURA: la pelota, los deportes rurales (aizkolari y harrijasotzaile), el encierro, sus personajes, a caballo
  [96, 'pelota10', 0, 1, { flash: true }], [100, 'lAizkolari', 8, 1], [104, 'lHarri', 8, 1], [108, 'pelota10', 50, 1],
  [112, 'encierro', 14, 1], [116, 'rMaite', 0, 1], [118, 'rBodeguera', 0, 1], [120, 'galope', 0, 1], [124, 'burro', 2, 1],
  // DESCUBRE SUS LEYENDAS (el respiro de la música): la lamia y el Basajaun; y en el clímax, los momotxorros de Altsasu,
  // el Bobo con las ocho cintas y la danza de Muskilda
  [128, 'lamia', 0, 1, { suave: true }], [130, 'basajaun', 0, 1, { suave: true }],
  [132, 'basajaun', 22, 1, { flash: true }], [136, 'momo', 0, 1], [140, 'momo', 50, 1],
  [144, 'hBobo', 14, 1], [148, 'danza', 0, 1],
  // RECORRE TODAS LAS COMARCAS: en bici, en almadía, las islas del Pirineo y la Ribera, el bosque de Irati
  [156, 'bici', 2, 1], [160, 'almadia', 8, 1], [164, 'isla2', 56, 1], [168, 'islaRibera', 50, 1], [172, 'dIrati', 0, 1],
  // y el repaso final, un tiempo de cada uno: los cinco pueblos, los momotxorros, la danza, el encierro, el caballo, la pelota
  [176, 'dOts', 20, 1], [178, 'cPuente', 26, 1], [180, 'cIsaba', 26, 1], [182, 'cPamplona', 26, 1], [184, 'cTudela', 26, 1],
  [186, 'momo', 20, 1], [188, 'danza', 120, 1], [190, 'encierro', 60, 1], [192, 'galope', 24, 1], [194, 'pelota10', 10, 1],
  // el logo
  [196, 'final', 0, 1, { flash: true, suave: true }],
];
// [rótulo, tiempo en que entra, tiempos que dura] (c: capítulos de la historia; p: el nombre del pueblo)
export const ROTULOS = [
  ['c1', 0, 7],
  ['p1', 20, 4], ['p2', 24, 4], ['p3', 28, 4], ['p4', 32, 4], ['p5', 36, 4],
  ['c2', 40, 4], ['c3', 64, 4], ['c5', 96, 4], ['c4', 128, 4], ['c6', 164, 4],
];
// [archivo, segundo, desde, hasta]
export const VOCES = [
  ['v3:salva-tierra.mp3', 0.5, 0, 99],                  // Hay una tierra donde cada pueblo guarda una historia
  ['ot:maite-00.mp3', t(44) + 0.15, 0, 1.5],            // ¡Kaixo! Soy Maite.
  ['ot:joxemari-00.mp3', t(48) + 0.1, 0, 2.38],         // Egun on, gazte. Soy Joxemari, el pastor.
  ['v3:salva-vecinos.mp3', t(56) + 0.1, 0, 3.76],       // Cada vecino te pide ayuda, y cada misión te enseña algo
  ['lam:queso-2.mp3', t(68) + 0.1, 0, 3.16],            // (el narrador de la lámina del queso)
  ['lam:piquillo-1.mp3', t(84) + 0.1, 0, 99],           // (el narrador de la lámina del piquillo)
  ['v3:salva-naturaleza.mp3', t(96) + 0.2, 0, 99],      // La naturaleza y la cultura, contadas jugando
  ['ot:bobo-02.mp3', t(144) + 0.1, 0, 99],              // ¡Las ocho cintas! ¡Los danzantes ya pueden ponerse sus trajes!
  ['v3:salva-herrizherri.mp3', T_LOGO + 0.4, 0, 99],
  ['v3:salva-navarra.mp3', T_LOGO + 1.8, 0, 99],        // Navarra, pueblo a pueblo
];
// [archivo, segundo, volumen, desde, cuánto]
export const EFECTOS = [
  ['cencerro-2.mp3', t(52), 0.25, 0, 1.8], ['ambiente-ovejas.mp3', t(52) + 0.6, 0.3, 0, 1.4],
  ['ui-click.mp3', t(72) + 0.37, 0.45], ['ui-click.mp3', t(72) + 0.96, 0.45], ['ui-click.mp3', t(72) + 1.58, 0.45],
  ['ui-fanfarria.mp3', t(76), 0.5],
  ['publico-grada.mp3', t(96), 0.3, 3.0, 1.8], ['publico-grada.mp3', t(108), 0.3, 5.0, 1.8],
];
