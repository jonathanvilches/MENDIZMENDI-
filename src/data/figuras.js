// Las figuras de leyenda y de carnaval del juego: quién es cada una, cómo viste (el traje que lleva en el juego, hecho
// como el de verdad: src/actors/trajes.js), dónde sale en Navarra y en qué pueblo y misión se la encuentra. Salen en la
// pantalla Personajes del menú y en el inicio, con su imagen (src/assets/figuras, de tools/retratos.mjs) y su ficha.
// Las fuentes de cada traje están en las notas de trajes.js (Museo del Traje, Museo Etnológico de Navarra, programas de
// los carnavales). Las de leyenda son tradición oral: lo que se cuenta, no historia.
export const FIGURAS = [
  // ---- seres de leyenda (de noche, en las misiones de leyenda) ----
  { id: 'lamia', kind: 'leyenda', name: 'Lamia', eu: 'Lamia', where: 'Baztan · la cascada de Xorroxin', town: 'elizondo', mission: 'La lamia de Xorroxin',
    who: 'Las lamias son las mujeres de los ríos y las fuentes de la mitología vasca. Viven junto al agua y, al atardecer, se peinan la larga melena dorada con un peine de oro. Quien les devuelve el peine, dicen, recibe su ayuda; quien se lo roba, su enfado. En Baztan se cuentan en la cascada de Xorroxin, en Erratzu.',
    wear: 'Melena dorada hasta la cintura, blusa clara, corpiño y falda larga de color agua. Bajo la falda asoman sus pies de pato: es lo que la delata.',
    game: 'De noche, en Elizondo, en la misión «La lamia de Xorroxin». Es más alta que una persona.' },
  { id: 'basajaun', kind: 'leyenda', name: 'Basajaun', eu: 'Basajaun', where: 'Los bosques del Pirineo · Irati y Baztan', town: 'amaiur-maya-del-baztan', mission: 'El señor del bosque',
    who: 'El señor del bosque. Un gigante cubierto de pelo de los pies a la cabeza que vigila los rebaños cuando llega la tormenta o se acerca el lobo: los pastores dejaban un trozo de pan para darle las gracias. Según la leyenda, fue él quien enseñó a las personas a sembrar el trigo y a forjar el hierro.',
    wear: 'Pelo largo por todo el cuerpo, melena y barba, una zamarra de piel y un bastón hecho de una rama.',
    game: 'De noche, en Amaiur, en la misión «El señor del bosque». Mide más de tres metros.' },
  { id: 'sorgina', kind: 'leyenda', name: 'Sorgina', eu: 'Sorgina', where: 'Zugarramurdi · las cuevas', town: 'zugarramurdi', mission: 'La noche de San Juan',
    who: 'Las sorginak son las brujas de las leyendas vascas. Las de Zugarramurdi se reunían, dicen, en las cuevas del pueblo, en el akelarre, el prado del macho cabrío. En 1610 un tribunal de la Inquisición condenó en Logroño a vecinos de Zugarramurdi acusados de brujería: hoy el pueblo recuerda aquella injusticia en su museo y en la fiesta de las cuevas.',
    wear: 'Vestida de negro, con toca en la cabeza, un chal de lana por los hombros y la falda larga. El pelo blanco le asoma por detrás y lleva su escoba de brezo.',
    game: 'De noche, en Zugarramurdi, en la misión «La noche de San Juan».' },
  { id: 'tartalo', kind: 'leyenda', name: 'Tartalo', eu: 'Tartalo', where: 'Las cuevas del monte · Aralar', town: null, mission: 'Las criaturas de la noche',
    who: 'El gigante de un solo ojo en medio de la frente. Vive en las cuevas del monte con su rebaño y, en los cuentos, atrapa a los pastores que se refugian en su cueva. Siempre hay uno más listo que él que consigue escapar, como en la historia del cíclope de la Odisea.',
    wear: 'Cabeza enorme con un solo ojo, zamarra de piel de oveja, una soga por cinturón y un garrote.',
    game: 'Todavía no sale en ninguna misión: está preparado, con su traje, para las próximas leyendas de la montaña. Mide dos metros y medio.' },
  { id: 'roldan', kind: 'leyenda', name: 'Roldán', eu: 'Errolan', where: 'Orreaga / Roncesvalles · el paso de los Pirineos', town: 'orreaga-roncesvalles', mission: 'La batalla de Orreaga',
    who: 'El caballero de Carlomagno. En el año 778, en el paso de Roncesvalles, la retaguardia del ejército franco fue derrotada por los vascones. Roldán tocó su cuerno, el olifante, para pedir ayuda y murió allí. La Canción de Roldán, un poema francés de la Edad Media, lo convirtió en leyenda.',
    wear: 'Cota de malla, sobreveste con cenefa, capa, yelmo con nasal y la espada Durandal. En el juego es una sombra que vaga de noche por el paso.',
    game: 'De noche, en Orreaga / Roncesvalles, en la misión «La batalla de Orreaga».' },
  // ---- carnavales (en las misiones de carnaval de cada pueblo) ----
  { id: 'joaldun', kind: 'carnaval', name: 'Joaldun', eu: 'Joaldun', where: 'Ituren y Zubieta · Malerreka', town: 'ituren', mission: 'Los joaldunak',
    who: 'Los joaldunak, los que llevan los cencerros, son los personajes más conocidos del carnaval navarro. El último lunes y martes de enero, los de Ituren van a Zubieta y los de Zubieta a Ituren, y recorren los pueblos en fila, haciendo sonar los cencerros todos a la vez para despertar la tierra y espantar los malos espíritus.',
    wear: 'Pantalón azul marino, camisa de lino blanca, enaguas con dos volantes de puntilla, pieles de oveja a la cintura y en los hombros, pañuelo al cuello, el ttuntturro de medio metro con cintas de colores y plumas, el isipu de crin de caballo en la mano y, a la espalda, dos grandes cencerros de cobre, los joareak.',
    game: 'En Ituren, en la misión «Los joaldunak»: desfila con ellos al compás de los cencerros.' },
  { id: 'momotxorro', kind: 'carnaval', name: 'Momotxorro', eu: 'Momotxorro', where: 'Altsasu / Alsasua · Sakana', town: 'altsasu-alsasua', mission: 'Momotxorros',
    who: 'Los momotxorros salen el martes de carnaval en Altsasu. Son medio hombres, medio toros: bajan corriendo por las calles con el sarde en alto, gritando, y la gente huye de ellos entre risas. El carnaval de Altsasu se recuperó en 1983 después de décadas prohibido.',
    wear: 'Una cesta en la cabeza de la que salen cuernos de vaca; entre ellos, el frontil del que cuelgan crines que tapan la cara. Piel de oveja a la espalda con dos cencerros, una sábana manchada de sangre por delante, pantalón azul, camisa blanca y la horca, el sarde, en la mano.',
    game: 'En Altsasu, en la misión «Momotxorros».' },
  { id: 'cascabobo', kind: 'carnaval', name: 'Cascabobo', eu: 'Kaskabobo', where: 'Aoiz / Agoitz · Prepirineo', town: 'aoiz', mission: 'Cascabobos',
    who: 'Los cascabobos y las mascaritas son los personajes del carnaval de Aoiz. Van por las calles bailando y gastando bromas, y nadie puede saber quién va debajo: el antifaz y el gorro los esconden. Es un carnaval de la Navarra media, cerca de la foz de Lumbier.',
    wear: 'Calzones a rayas de colores, camisa blanca suelta, el ttuntturro con cintas y un antifaz para no ser reconocidos.',
    game: 'En Aoiz, en la misión «Cascabobos».' },
  { id: 'zipotero', kind: 'carnaval', name: 'Zipotero', eu: 'Zipotero', where: 'Vidángoz / Bidankoze · Roncal; y Tudela', town: 'tudela', mission: 'Los zipoteros',
    who: 'Los zipoteros recorren el pueblo de casa en casa pidiendo huevos y chistorra para la merienda del carnaval, con la cara tapada y ropa vieja para que nadie los reconozca. Es la tradición de Vidángoz, en el valle de Roncal; en Tudela, los zipoteros reparten caramelos por las calles en el carnaval de la ciudad.',
    wear: 'Ropa vieja, la cara tapada con un trozo de tela y, en las manos, el cesto para los huevos y el gerren, el asador para la carne, todo bajo un pañuelo de colores.',
    game: 'En Tudela, en la misión «Los zipoteros».' },
  { id: 'lagunero', kind: 'carnaval', name: 'Coronel Lagunero', eu: 'Lagunero koronela', where: 'Tafalla · Zona Media', town: 'tafalla', mission: 'El coronel Lagunero',
    who: 'El coronel Lagunero es el muñeco del carnaval de Tafalla. Se cuelga en la plaza el sábado y, el martes de carnaval, se le lee la sentencia por todo lo malo del año y se le quema: con él se van las penas y empieza la Cuaresma. Cuenta la tradición que recuerda a un militar que cobraba impuestos en la villa.',
    wear: 'Un cabezudo con bicornio y bigotes, casaca azul con faldones y charreteras, calzón blanco y faja roja.',
    game: 'En Tafalla, en la misión «El coronel Lagunero».' },
  { id: 'irasko', kind: 'carnaval', name: 'Irasko', eu: 'Irasko', where: 'Lumbier · Prepirineo', town: 'lumbier', mission: 'Oridos e iraskos',
    who: 'Los oridos y los iraskos son los personajes del carnaval de Lumbier. Se meten dentro de sacos de arpillera, cabeza incluida, y se ponen encima una cesta con cuernos. Con el cencerro a la cintura corren detrás de la gente por las calles del pueblo.',
    wear: 'Un saco de arpillera por todo el cuerpo, con dos agujeros para ver; encima, la cesta con cuernos; una soga de cinturón y el cencerro.',
    game: 'En Lumbier, en la misión «Oridos e iraskos».' },
  { id: 'paloki', kind: 'carnaval', name: 'Paloki', eu: 'Paloki', where: 'Estella-Lizarra · Tierra Estella', town: 'estella', mission: 'Los palokis',
    who: 'Los palokis del carnaval de Estella llevan un palo con un aro en lo alto, del que cuelga una tela hasta las rodillas: al levantarlo parecen gigantes que se mueven entre la gente. Van con la cara pintada y bailan por las calles del casco viejo.',
    wear: 'Un aro en lo alto de un palo, con la tela cayendo en pliegues hasta las rodillas, la cara pintada y el gorro de cintas.',
    game: 'En Estella-Lizarra, en la misión «Los palokis».' },
];
export const figuraById = (id) => FIGURAS.find(f => f.id === id) || null;
export const FIGURAS_LEYENDA = FIGURAS.filter(f => f.kind === 'leyenda');
export const FIGURAS_CARNAVAL = FIGURAS.filter(f => f.kind === 'carnaval');
