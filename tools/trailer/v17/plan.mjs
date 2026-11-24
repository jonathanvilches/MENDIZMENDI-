// El tráiler v17 (24 nov 2026). El autor, del v16: «repites muchas escenas»; «escenas que les haces zoom, que no están
// bien encuadradas y no se ve la escena bien al completo»; «no dejas hablar bien a los vecinos»; «la locución tiene que
// seguir una historia, un storytelling».
// Así que la cuenta una historia, la de Otsagabia, con las voces ya grabadas del juego: Salva abre («Hay una tierra donde
// cada pueblo guarda una historia»), la narradora enseña Otsagabia, Maite saluda y cuenta el problema (mañana es la fiesta
// de Muskilda y las ocho cintas de los danzantes se han perdido por todo el valle; las tienen vecinos… y algún ser de
// leyenda), Joxemari el pastor, Salva (cada vecino te pide ayuda y cada misión te enseña algo), el Basajaun, Kike que te
// lleva a la pelota (campeonatos, «Elige tu pelotari», el cuadro y los partidos), el carnaval (momotxorros y joaldunak),
// el Bobo con las ocho cintas y la danza, y Salva cierra («La naturaleza y la cultura, contadas jugando»; Navarra, pueblo
// a pueblo). Cada vecino dice su frase entera y su plano dura lo que su frase (Maite y Kike, grabados de nuevo de frente).
// Cada toma sale una sola vez (fuera las carreras de espaldas repetidas: de dieciséis quedan seis), sin zoom (v17/montaje.py)
// ni láminas (recortadas parecían ampliadas; enteras, recuadro dentro de recuadro), y sin rótulos de capítulo: la historia
// la cuenta la voz; solo el nombre de Otsagabia y de Isaba y el logo.
export const MUSICA = 'musica-inicio.mp3';
export const BEAT = 60 / 132, T0 = 1.799;
export const t = (b) => T0 + b * BEAT;
const B = (s) => (s - T0) / BEAT;             // (un segundo del tráiler, en tiempos de la música)
export const T_CLIMAX = t(132), T_LOGO = t(196), DURA = T_LOGO + 4.6;
// [tiempo de la música en que entra, toma, primer fotograma, velocidad, opciones]; cada plano dura hasta el siguiente.
// (las velocidades por debajo de 1 alargan un poco una charla para que el vecino acabe su frase dentro de su plano)
export const PLANOS = [
  // «Hay una tierra donde cada pueblo guarda una historia»: el mapa y la isla del Pirineo que sube
  [B(0), 'mapa', 7, 1, { suave: true }],
  // «Desde aquí ves Otsagabia entera: casas de piedra a los dos lados del río Anduña»
  [B(6.2), 'rio', 0, 1, { suave: true }], [B(8.2), 'entra', 0, 1, { suave: true }], [B(10.8), 'dOts', 0, 1],
  // «¡Kaixo! Soy Maite. ¡Ongi etorri a Otsagabia!»
  [B(12.8), 'cMaite', 0, 1],
  // «Mañana es la fiesta de Muskilda y los danzantes necesitan ocho cintas de colores para sus trajes… ¡Pero se han perdido
  // por todo el valle!»: el Pirineo, Isaba nevada y el bosque de Irati
  [B(17.0), 'isla2', 20, 1], [B(21.4), 'cIsaba', 0, 1], [B(23.6), 'dIrati', 0, 1],
  // «Las otras siete las tienen vecinos del valle… y algún ser de leyenda»: la plaza de Viana con su gente y la lamia
  [B(25.6), 'paseoViana', 0, 0.94], [B(29.4), 'lamia', 0, 0.9],
  // «Egun on, gazte. Soy Joxemari, el pastor.» y sus ovejas
  [B(30.6), 'hJoxemari', 0, 0.85], [B(34.15), 'pastoreo', 40, 1],
  // «Cada vecino te pide ayuda, y cada misión te enseña algo: el pastoreo, el carnaval, las leyendas»: la quesera de Isaba,
  // la misión del queso cumplida, la cosechadora y la almadía
  [B(36.2), 'hArantxa', 10, 1], [B(38.5), 'mRoncal', 570, 1], [B(40.3), 'cosech10', 0, 1], [B(42.1), 'almadia', 8, 1],
  // «Soy el Basajaun, el señor del bosque.»
  [B(43.8), 'basajaun', 0, 0.91],
  // «¡Aupa! Soy Kike. ¿Juegas a pelota?»
  [B(47.1), 'cKike', 3, 0.97],
  // la pelota: el anillo de los campeonatos, «Elige tu pelotari», el cuadro con el VS, el partido del campeonato (solo el
  // tanto: después viene el podio con la txapela, y el autor: «sin txapela») y el del frontón de Lumbier con su público
  [B(51.1), 'pCamp', 0, 1], [B(52.8), 'pElige', 2, 1], [B(54.5), 'pElige', 84, 1], [B(56.4), 'pFinal', 78, 1], [B(57.6), 'pelota10', 0, 0.95],
  // el golpe de la música: el carnaval, los momotxorros de Altsasu (la manada y de cerca) y los joaldunak de Ituren
  [132, 'momo', 0, 1, { flash: true }], [B(64.5), 'momoCerca', 36, 1], [B(66.3), 'joaldun2', 0, 1], [B(68.5), 'joaldun1', 0, 1],
  // «¡Las ocho cintas! ¡Los danzantes ya pueden ponerse sus trajes!» y la danza
  [B(70.6), 'hBobo', 0, 0.82], [B(74.5), 'danza', 60, 1],
  // «La naturaleza y la cultura, contadas jugando»: el castillo de Olite, la Ribera, el encierro, a caballo, el puente de
  // Puente la Reina y, en burro, hasta el logo
  [B(78.0), 'oliteDron', 0, 1], [B(81.7), 'islaRibera', 50, 1], [B(84.0), 'encierro', 14, 1], [B(86.0), 'galope', 0, 1],
  [B(88.0), 'puente', 0, 1], [B(89.6), 'burro', 2, 1],
  // el logo: «Herrizherri. Navarra, pueblo a pueblo»
  [196, 'final', 0, 1, { flash: true, suave: true }],
];
export const ROTULOS = [['p1', B(10.8), 4], ['p3', B(21.4), 4]];
export const VOCES = [
  ['v3:salva-tierra.mp3', 0.3, 0, 99],                  // Hay una tierra donde cada pueblo guarda una historia.
  ['ot:narra-01.mp3', 7.3, 0, 5.62],                    // Desde aquí ves Otsagabia entera: casas de piedra a los dos lados del río Anduña.
  ['ot:maite-00.mp3', 13.2, 0, 3.6],                    // ¡Kaixo! Soy Maite. ¡Ongi etorri a Otsagabia!
  ['ot:maite-02.mp3', 17.2, 0, 8.31],                   // Mañana es la fiesta de Muskilda… ¡Pero se han perdido por todo el valle!
  ['ot:maite-06.mp3', 25.75, 2.62, 7.42],               // Las otras siete las tienen vecinos del valle… y algún ser de leyenda.
  ['ot:joxemari-00.mp3', 30.7, 0, 3.32],                // Egun on, gazte. Soy Joxemari, el pastor.
  ['v3:salva-vecinos.mp3', 36.3, 0, 7.47],              // Cada vecino te pide ayuda, y cada misión te enseña algo: el pastoreo, el carnaval, las leyendas.
  ['ot:basajaun-00.mp3', 44.0, 3.62, 6.64],             // Soy el Basajaun, el señor del bosque.
  ['ot:kike-00.mp3', 47.4, 0, 3.45],                    // ¡Aupa! Soy Kike. ¿Juegas a pelota?
  ['ot:bobo-02.mp3', 70.75, 0, 3.68],                   // ¡Las ocho cintas! ¡Los danzantes ya pueden ponerse sus trajes!
  ['v3:salva-naturaleza.mp3', 78.2, 0, 3.47],           // La naturaleza y la cultura, contadas jugando.
  ['v3:salva-herrizherri.mp3', T_LOGO + 0.4, 0, 99],
  ['v3:salva-navarra.mp3', T_LOGO + 1.8, 0, 99],        // Navarra, pueblo a pueblo
];
export const EFECTOS = [
  ['cencerro-2.mp3', 34.15, 0.25, 0, 1.8], ['ambiente-ovejas.mp3', 34.75, 0.3, 0, 1.4],
  ['ui-fanfarria.mp3', 38.5, 0.25],
  ['ui-click.mp3', 51.3, 0.4], ['ui-click.mp3', 53.05, 0.4], ['ui-click.mp3', 54.55, 0.45],
  ['publico-grada.mp3', 56.4, 0.3, 3.0, 1.8], ['publico-grada.mp3', 59.6, 0.32, 5.0, 1.8],
  ['cencerro-2.mp3', 66.3, 0.35, 0, 3.6], ['cencerro-2.mp3', 67.2, 0.3, 0, 3.6],
];
