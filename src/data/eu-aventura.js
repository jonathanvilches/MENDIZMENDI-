// Euskera de lo nuevo de la aventura (la luz y sus ajustes, la exploración y el movimiento): frases exactas, como en
// data/eu.js. Se cargan con los demás diccionarios (i18n.js, loadEU) y no pisan una traducción que ya hubiera.
export const EU_AVENTURA = {
  'Efectos de imagen': 'Irudi-efektuak',
  // (accesibilidad: util/accesible.js)
  'Textos grandes': 'Testu handiak', 'Alto contraste': 'Kontraste handia',
  'Comentarios de los partidos': 'Partiden iruzkinak', 'Maite y Patxi': 'Maite eta Patxi', 'Unai y Garazi': 'Unai eta Garazi', 'Sin comentarios': 'Iruzkinik gabe',
  'En los partidos de pelota, una narradora o un narrador cuenta cada jugada y una ex pelotari o un ex pelotari la explica, en el idioma del juego.': 'Pilota partidetan, esatari batek jokaldi bakoitza kontatzen du eta pilotari ohi batek azaltzen du, jokoaren hizkuntzan.',
  'Letra más grande en los partidos de pelota y en las fichas de los pelotaris. Con alto contraste, el marcador, los avisos, los paneles y los botones van con fondo negro y bordes blancos.': 'Letra handiagoa pilota partidetan eta pilotarien fitxetan. Kontraste handiarekin, markagailua, abisuak, panelak eta botoiak hondo beltzarekin eta ertz zuriekin agertzen dira.',
  'Bruma en el valle, sombras de nubes, resplandor de las luces y color de cada hora. Solo con calidad Media o Alta; si el juego va justo, se apagan solos.': 'Lainoa haranean, hodeien itzalak, argien distira eta ordu bakoitzaren kolorea. Kalitate Ertain edo Altuarekin bakarrik; jokoa justu badabil, bere kabuz itzaltzen dira.',
  // la aventura de cada pueblo (game/townAventura.js)
  '¡Uf! Sin fuerzas para nadar. Has vuelto a la orilla.': 'Uf! Igeri egiteko indarrik gabe. Ertzera itzuli zara.',
  'Estás trepando. Mira el anillo: cuando se vacía, te sueltas. Arriba se descansa.': 'Eskalatzen ari zara. Begiratu eraztunari: husten denean, askatu egiten zara. Goian atseden hartzen da.',
  'Nadas mientras te quede anillo. Con lluvia o con frío se gasta antes.': 'Eraztuna duzun bitartean egiten duzu igeri. Euriarekin edo hotzarekin lehenago gastatzen da.',
  'Sin fuerzas: resbalas. Descansa un momento y prueba por otro lado.': 'Indarrik gabe: irrist egiten duzu. Hartu atseden pixka bat eta saiatu beste aldetik.',
  '¡Ay, qué golpe! Desde tan alto, salta y vuelve a pulsar saltar: abres la capa y planeas.': 'Ai, zer kolpea! Hain goitik, egin salto eta sakatu berriro salto: kapa ireki eta planeatu egiten duzu.',
  'Menudo susto. Un vecino te ha acompañado a la plaza: ya estás como nuevo.': 'A zer sustoa. Bizilagun batek plazara lagundu zaitu: berri-berri zaude.',
  'Has descansado: todos los corazones': 'Atseden hartu duzu: bihotz guztiak',
  'En el aire, pulsa saltar otra vez: abres la capa de pastor y bajas planeando.': 'Airean, sakatu berriro salto: artzain-kapa ireki eta planeatuz jaisten zara.',
  'Eso de la banderola es una atalaya. Sube: desde arriba se ve dónde hay cosas escondidas.': 'Banderatxoa duen hori talaia bat da. Igo: goitik ikusten da non dauden gauza ezkutuak.',
  'Montar el caballo': 'Zaldira igo', 'Bajar del caballo': 'Zalditik jaitsi',
  'Es un caballo de Burguete, Aurizko zaldia en euskera: la raza grande y mansa del Pirineo navarro.': 'Aurizko zaldia da: Nafarroako Pirinioetako arraza handi eta otzana.',
  'El burro, astoa en euskera, cargó durante siglos con la huerta y la leña de estos pueblos.': 'Astoak mendeetan garraiatu zituen herri hauetako baratzeko uzta eta egurra.', 'Montar el burro': 'Astora igo', 'Bajar del burro': 'Astotik jaitsi',
  'Subir a la atalaya': 'Talaiara igo', 'Marcar otra kutxa desde la atalaya': 'Beste kutxa bat markatu talaiatik', 'Abrir la kutxa': 'Kutxa ireki',
  'Se lleva como andando. Con la palanca a fondo o corriendo, trota y galopa.': 'Oinez bezala eramaten da. Palanka hondoraino eramanda edo korrika, trostan eta lauhazka doa.',
  '¡Un corazón más! Lo has ganado abriendo kutxas': 'Bihotz bat gehiago! Kutxak irekiz irabazi duzu',
  '¡Has abierto todas las kutxas de este pueblo!': 'Herri honetako kutxa guztiak ireki dituzu!',
  '¡Más resistencia! El anillo crece: lo has ganado subiendo atalayas': 'Erresistentzia gehiago! Eraztuna hazi da: talaietara igoz irabazi duzu',
  'Atalaya descubierta': 'Talaia aurkituta', 'Marca cambiada: mírala en el mapa': 'Marka aldatuta: begiratu mapan',
  'Atalaya': 'Talaia', 'Descubierta. Desde aquí se marcan las kutxas': 'Aurkituta. Hemendik markatzen dira kutxak', 'Sube y verás dónde hay cosas escondidas': 'Igo eta ikusiko duzu non dauden gauza ezkutuak',
  'Tu marca: una kutxa': 'Zure marka: kutxa bat', 'Kutxa': 'Kutxa', 'Un cofre escondido. Solo se ve de cerca': 'Kutxa ezkutu bat. Hurbiletik bakarrik ikusten da',
};
/** Plantillas con huecos (números), como EU_RX en data/eu.js. */
export const EU_RX_AVENTURA = [
  [/^¡Kutxa abierta! Quedan (\d+) en este pueblo$/, 'Kutxa irekita! $1 geratzen dira herri honetan'],
  [/^Atalaya descubierta\. En el mapa ya salen las (\d+) kutxas que quedan$/, 'Talaia aurkituta. Mapan agertzen dira geratzen diren $1 kutxak'],
  [/^Corazones: (\d+) de (\d+)$/, 'Bihotzak: $2tik $1'],
];
