// El tráiler v18 (24 nov 2026). El autor, del v17: «que el narrador vaya narrando durante todo el tráiler… que no
// explique: cuenta una historia»; «no te centres en las 8 cintas de Muskilda, ni en una misión en concreto»; «reta al
// usuario: ¿podrás lograr todas las misiones y conseguir las insignias de todas las comarcas?»; fuera lo de Anatomy y el
// burro, y el caballo al galope en su lugar; menos carreras de espaldas y más escenas normales del juego; nada acelerado
// (todo a su velocidad, sin cambios de ritmo); y fuera las imágenes en las que el pueblo aún se está cargando (las vistas
// aéreas de Otsagabia del principio, con las casas sin detalle que cambian al bajar la cámara).
// La historia del explorador, de principio a fin: llega a Navarra, los vecinos le piden ayuda, cuida del rebaño, cosecha y
// baja el río, encuentra leyendas, compite en la pelota, vive el carnaval, y el reto: doce comarcas, sus misiones y sus
// insignias. El narrador (Salva) la cuenta por encima de todo (v18/guion.json: las frases nuevas, por grabar); los vecinos
// solo saludan.
export const MUSICA = 'musica-inicio.mp3';
export const BEAT = 60 / 132, T0 = 1.799;
export const t = (b) => T0 + b * BEAT;
const B = (s) => (s - T0) / BEAT;             // (un segundo del tráiler, en tiempos de la música)
export const T_CLIMAX = t(132), T_LOGO = t(196), DURA = T_LOGO + 4.6;
// los planos, por tramos: [toma, primer fotograma, segundos]; cada tramo empieza donde dice y sus planos van seguidos,
// siempre a velocidad 1 (cada imagen de la toma, una vez)
const TRAMOS = [
  // llega a Navarra: el mapa y el Pirineo que sube, la isla del Pirineo, por Otsagabia y por Isaba nevada
  [0, [['mapa', 7, 6.2, { suave: true }], ['isla2', 60, 3.0, { suave: true }], ['dOts', 0, 2.0], ['cIsaba', 0, 2.2]]],
  // los vecinos y la vida del pueblo: Maite, la plaza de Viana, el mercado, la panadera, en bici, Joxemari el pastor
  [13.4, [['cMaite', 0, 4.2], ['paseoViana', 0, 3.6], ['mercQueso', 2, 1.0], ['panadera', 0, 2.2], ['bici', 2, 1.9], ['hJoxemari', 0, 3.0]]],
  // las misiones: el rebaño, la cosecha y el río
  [29.3, [['pastoreo', 34, 3.6], ['cosech10', 0, 2.2], ['almadia', 8, 2.7]]],
  // las leyendas: la lamia y el Basajaun
  [37.8, [['lamia', 0, 1.08], ['basajaun', 0, 3.0]]],
  // la pelota: Kike, los campeonatos, «Elige tu pelotari», el cuadro, el tanto del campeonato (sin el podio: «sin
  // txapela»), Lumbier con su público; y el encierro de Pamplona, que lleva al golpe de la música
  [41.88, [['cKike', 3, 3.85], ['pCamp', 0, 3.0], ['pElige', 2, 2.8], ['pElige', 84, 2.4], ['pFinal', 78, 1.15], ['pelota10', 0, 4.0], ['encierro', 14, 2.72]]],
  // el golpe: el carnaval, los momotxorros de Altsasu y los joaldunak de Ituren
  [61.8, [['momo', 0, 2.7, { flash: true }], ['momoCerca', 36, 1.8], ['joaldun2', 0, 3.0], ['joaldun1', 0, 2.08]]],
  // el reto: las comarcas (Olite, la Ribera que sube), el campo, la quesera, el mercado, el puente y, al galope, hasta el logo
  // (un solo tractor: dos rojos seguidos parecían el mismo plano)
  [71.38, [['oliteDron', 0, 3.58], ['islaRibera', 0, 5.5], ['piquillo', 0, 2.2], ['hArantxa', 8, 2.46], ['mercMiel', 0, 1.08], ['mercHuerta', 0, 1.08], ['puente', 0, 1.58], ['galope', 0, 2.03]]],
];
export const PLANOS = [];
for (const [s0, ps] of TRAMOS) {
  let s = s0;
  for (const [nom, desde, seg, o] of ps) { PLANOS.push([B(s), nom, desde, 1, o || {}]); s += seg; }
}
PLANOS.push([196, 'final', 0, 1, { flash: true, suave: true }]);   // el logo
export const ROTULOS = [];
// las voces: [archivo, segundo, desde, hasta]. El narrador (Salva): las frases que ya había y las tres nuevas que cupieron
// en los créditos que quedaban (v18/voz; el autor: «graba lo que dé»); el resto del guion (v18/guion.json), cuando haya.
export const VOCES = [
  ['v3:salva-tierra.mp3', 0.3, 0, 99],                  // Hay una tierra donde cada pueblo guarda una historia.
  ['v18:salva-llega.mp3', 7.5, 0, 99],                  // Un pequeño explorador llegó a sus montañas, sin saber lo que le esperaba.
  ['ot:maite-00.mp3', 13.8, 0, 3.6],                    // ¡Kaixo! Soy Maite. ¡Ongi etorri a Otsagabia!
  ['v3:salva-vecinos.mp3', 18.0, 0, 1.62],              // Cada vecino te pide ayuda…
  ['ot:joxemari-00.mp3', 26.4, 0, 3.32],                // Egun on, gazte. Soy Joxemari, el pastor.
  ['v18:salva-camino.mp3', 30.2, 0, 99],                // Cuidó rebaños, encontró leyendas y descubrió el frontón.
  ['ot:basajaun-00.mp3', 38.95, 3.62, 6.64],            // Soy el Basajaun, el señor del bosque.
  ['ot:kike-00.mp3', 42.15, 0, 3.45],                   // ¡Aupa! Soy Kike. ¿Juegas a pelota?
  ['v18:salva-reto.mp3', 84.3, 0, 99],                  // ¿Podrás completar todas las misiones y ganar las insignias de todas las comarcas?
  ['v3:salva-herrizherri.mp3', T_LOGO + 0.4, 0, 99],
  ['v3:salva-navarra.mp3', T_LOGO + 1.8, 0, 99],        // Navarra, pueblo a pueblo
];
export const EFECTOS = [
  ['cencerro-2.mp3', 29.3, 0.25, 0, 1.8], ['ambiente-ovejas.mp3', 29.9, 0.3, 0, 1.4],
  ['ui-click.mp3', 45.93, 0.4], ['ui-click.mp3', 48.98, 0.4], ['ui-click.mp3', 51.58, 0.45],
  ['publico-grada.mp3', 53.93, 0.3, 3.0, 1.8], ['publico-grada.mp3', 55.6, 0.32, 5.0, 1.8],
  ['cencerro-2.mp3', 66.3, 0.35, 0, 3.6], ['cencerro-2.mp3', 67.2, 0.3, 0, 3.6],
];
