// El tráiler v16 (24 nov 2026). El autor, del v15: «estás duplicando muchas escenas teniendo un montón de información»;
// «imágenes limpias ya con todo el entorno creado»; «paseos por las calles, con los vecinos andando, las plazas del pueblo»;
// «que se vean más los momotxorros, los joaldunak»; «la lámina de la cuajada»; «que el explorador no se choque con nada»;
// «toda la identidad visual de los partidos de pelota… no está expresado en el tráiler».
// Así que: ninguna toma se repite (fuera el repaso del final y los planos que salían dos veces); fuera el vuelo del mapa
// hasta Otsagabia (el relieve se iba formando según bajaba el dron) y la lámina del queso (recuadro dentro de recuadro y la
// cuajada que se salía del dibujo: el queso se cuenta una vez, con su misión); fuera las vecinas quietas mirando a cámara;
// entran las calles y las plazas con su gente, los joaldunak de Ituren, los momotxorros de cerca, el castillo de Olite y,
// entera, la pelota: los campeonatos, «Elige tu pelotari», el cuadro con el VS y los partidos (sin la txapela: el autor, «sin txapela»).
// Las tomas que salen dos veces son dos momentos distintos de la misma escena, nunca la misma imagen: la misión del queso
// (ordenar los pasos y luego «¡misión cumplida!»), la pelota (las cartas y luego el cuadro)
// y los momotxorros (entre la manada y luego desde arriba).
export const MUSICA = 'musica-inicio.mp3';
export const BEAT = 60 / 132, T0 = 1.799;
export const t = (b) => T0 + b * BEAT;
export const T_CLIMAX = t(132), T_LOGO = t(196), DURA = T_LOGO + 4.6;
// [tiempo de la música en que entra, toma, primer fotograma, velocidad, opciones]; cada plano dura hasta el siguiente.
// recorte: [x0, y0, x1, y1] de la imagen de la toma que se ve (las láminas, sin su marco ni el «pasa el ratón»)
const LAM = { recorte: [52, 68, 1228, 652] }, LAMP = { recorte: [37, 126, 1243, 594] };   // (deportes rurales; el piquillo, más ancho)
export const PLANOS = [
  // UN PEQUEÑO EXPLORADOR LLEGA A NAVARRA: el mapa y la isla del Pirineo que sube; Otsagabia desde el aire y el dron que
  // baja hasta la espalda del explorador
  [-T0 / BEAT, 'mapa', 26, 1, { suave: true }],
  [8, 'rio', 2, 1, { suave: true }],
  [12, 'entra', 16, 1, { suave: true }],
  // corre, y detrás van cambiando los pueblos (con su nombre) y las estaciones
  [16, 'dOts', 4, 1], [20, 'cPuente', 6, 1], [24, 'cIsaba', 6, 1], [28, 'cPamplona', 6, 1], [32, 'cTudela', 6, 1],
  // AYUDA A LOS VECINOS: por la calle de Viana entre la gente, Maite, Joxemari y sus ovejas, los puestos del mercado y la
  // quesera de Isaba
  [36, 'paseoViana', 40, 1], [40, 'hMaite', 36, 1], [44, 'hJoxemari', 14, 1], [48, 'pastoreo', 0, 1],
  [52, 'mercQueso', 2, 1], [54, 'mercHuerta', 2, 1], [56, 'hArantxa', 10, 1], [60, 'mercMiel', 2, 1], [62, 'mercTxistorra', 2, 1],
  // COMPLETA SUS MISIONES: la cosecha, el queso Roncal (ordenar los pasos y misión cumplida), el pimiento del piquillo y
  // su lámina, a caballo, en bici y en almadía
  // (el rótulo, sobre la cosechadora: encima del panel de los pasos del queso lo tapaba)
  [64, 'cosech10', 0, 1, { flash: true }], [68, 'mRoncal', 452, 1], [72, 'mRoncal', 570, 1], [76, 'piquillo', 6, 1],
  [80, 'lPiquillo', 8, 1, LAMP], [84, 'galope', 0, 1], [88, 'bici', 2, 1], [92, 'almadia', 8, 1],
  // COMPITE EN LOS CAMPEONATOS: los campeonatos, «Elige tu pelotari», el cuadro del campeonato y dos partidos (el del
  // campeonato, con su marcador, y el del frontón de Lumbier con su público); y los deportes rurales y el encierro
  [96, 'pCamp', 0, 1, { flash: true }], [100, 'pElige', 2, 1], [104, 'pElige', 84, 1], [108, 'pFinal', 78, 1], [110, 'pelota10', 30, 1],
  [116, 'lAizkolari', 8, 1, LAM], [120, 'lHarri', 8, 1, LAM], [124, 'encierro', 14, 1],
  // DESCUBRE SUS LEYENDAS (el respiro de la música): la lamia y el Basajaun; y en el clímax, los momotxorros de Altsasu
  // (entre la manada, de cerca y desde arriba), los joaldunak de Ituren, el Bobo con las ocho cintas y la danza
  [128, 'lamia', 0, 1, { suave: true }], [130, 'basajaun', 0, 1, { suave: true }],
  [132, 'momo', 0, 1, { flash: true }], [136, 'momoCerca', 36, 1], [140, 'momo', 50, 1],
  [144, 'joaldun1', 0, 1], [148, 'joaldun2', 0, 1], [152, 'hBobo', 14, 1], [156, 'danza', 0, 1],
  // RECORRE TODAS LAS COMARCAS: el castillo de Olite, las islas del Pirineo y la Ribera, el bosque de Irati y, corriendo, las
  // Bardenas, Elizondo, Lesaka, Estella, Artajona y Lekunberri; el puente de Puente la Reina y, en burro, hasta el logo
  [160, 'oliteDron', 0, 1], [164, 'isla2', 56, 1], [168, 'islaRibera', 50, 1], [172, 'dIrati', 0, 1],
  [176, 'dBardenas', 2, 1], [178, 'dElizondo', 2, 1], [180, 'dLesaka', 0, 1], [182, 'dEstella', 2, 1], [184, 'dArtajona', 2, 1], [186, 'dLekunberri', 0, 1],
  [188, 'puente', 0, 1], [192, 'burro', 2, 1],
  // el logo
  [196, 'final', 0, 1, { flash: true, suave: true }],
];
export const ROTULOS = [
  ['c1', 0, 7],
  ['p1', 16, 4], ['p2', 20, 4], ['p3', 24, 4], ['p4', 28, 4], ['p5', 32, 4],
  ['c2', 36, 4], ['c3', 64, 4], ['c5', 96, 4], ['c4', 128, 4], ['c6', 164, 4],
];
export const VOCES = [
  ['v3:salva-tierra.mp3', 0.5, 0, 99],                  // Hay una tierra donde cada pueblo guarda una historia
  ['ot:maite-00.mp3', t(40) + 0.15, 0, 1.5],            // ¡Kaixo! Soy Maite.
  ['ot:joxemari-00.mp3', t(44) + 0.1, 0, 2.38],         // Egun on, gazte. Soy Joxemari, el pastor.
  ['v3:salva-vecinos.mp3', t(52) + 0.1, 0, 3.76],       // Cada vecino te pide ayuda, y cada misión te enseña algo
  ['lam:piquillo-1.mp3', t(80) + 0.1, 0, 3.6],          // (el narrador de la lámina del piquillo)
  ['ot:bobo-02.mp3', t(152) + 0.1, 0, 99],              // ¡Las ocho cintas! ¡Los danzantes ya pueden ponerse sus trajes!
  ['v3:salva-herrizherri.mp3', T_LOGO + 0.4, 0, 99],
  ['v3:salva-navarra.mp3', T_LOGO + 1.8, 0, 99],        // Navarra, pueblo a pueblo
];
export const EFECTOS = [
  ['cencerro-2.mp3', t(48), 0.25, 0, 1.8], ['ambiente-ovejas.mp3', t(48) + 0.6, 0.3, 0, 1.4],
  ['ui-click.mp3', t(68) + 0.37, 0.45], ['ui-click.mp3', t(68) + 0.96, 0.45], ['ui-click.mp3', t(68) + 1.58, 0.45],
  ['ui-fanfarria.mp3', t(72), 0.5],
  ['ui-click.mp3', t(96) + 0.2, 0.4], ['ui-click.mp3', t(100) + 0.25, 0.4], ['ui-click.mp3', t(104) + 0.05, 0.45],
  ['publico-grada.mp3', t(108), 0.3, 3.0, 1.8], ['publico-grada.mp3', t(112), 0.32, 5.0, 1.8],
  ['cencerro-2.mp3', t(144), 0.35, 0, 3.6], ['cencerro-2.mp3', t(146), 0.3, 0, 3.6],
];
