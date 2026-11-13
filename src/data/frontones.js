// Frontones de Navarra: el capítulo «Frontones de Navarra» del menú (hub/frontones.js) y las fotos de verdad de la
// elección de frontón de los Campeonatos (game/torneo.js).
//
// DESTACADOS: los frontones con historia o con foto. Cada uno: { id, nombre, lugar, comarca, town (el pueblo del juego,
// si lo hay), tipo (plaza, izquierda o trinquete), cubierto, anio (el de su construcción o inauguración, solo si una
// fuente lo dice), aforo, texto, foto (src/assets/frontones/<foto>.webp), cred: [autor, licencia, fichero de Commons] }.
// Los datos salen de la prensa y de los ayuntamientos (Noticias de Navarra, Diario de Navarra, Ayuntamiento de Pamplona,
// Ayuntamiento de Huarte, Turismo Vasco, Onda Vasca, Wikipedia) y de las descripciones de las fotos en Wikimedia Commons;
// donde las fuentes no coinciden (el día exacto, el aforo), va lo que dicen todas. Fotos: Wikimedia Commons, con su autor
// y su licencia (CC0, CC BY o CC BY-SA, aprobadas por el autor del proyecto el 13 de noviembre de 2026); lista completa en
// src/assets/frontones/LICENCIAS.md y en legal/registro-licencias.csv.
//
// TODOS (frontones-pueblos.json): los 653 frontones de Navarra del directorio frontons.net (noviembre de 2026), contados
// por pueblo: [pueblo, comarca, plazas libres, de pared izquierda, trinquetes]. El pueblo es el núcleo más cercano de
// settlements.json (a menos de 2,5 km). El Instituto Navarro de Deporte cuenta 656 frontones en toda Navarra.
import TODOS from './frontones-pueblos.json';
export { TODOS };

/** Los tres tipos de cancha. */
export const TIPOS = {
  plaza: { nombre: 'Plaza libre', eu: 'Plaza librea', icon: 'plaza',
    texto: 'Una sola pared, el frontis, en la plaza del pueblo y al aire libre. En muchos pueblos, el frontis de los primeros frontones era la pared de la iglesia.' },
  izquierda: { nombre: 'Pared izquierda', eu: 'Ezker pareta', icon: 'pelota',
    texto: 'Tiene frontis, pared izquierda y, en los grandes, rebote al fondo. Es la cancha de la pelota a mano, de la pala y del remonte. Los de las ciudades y muchos de los pueblos están cubiertos.' },
  trinquete: { nombre: 'Trinquete', eu: 'Trinketea', icon: 'house',
    texto: 'Una sala cerrada por las cuatro paredes, con un tejadillo a lo largo de un lado y el público detrás de una red. Allí se juega a mano, a pala corta, a xare y a pasaka.' },
};

/** Las medidas de los frontones de pared izquierda (manual del Instituto Navarro de Deporte y Juventud). */
export const MEDIDAS = 'Los frontones cortos miden 30 o 36 metros de cancha y los largos, 54. En el frontón corto se juega a mano y a pala; en el largo, a remonte, a cesta punta y a pala larga.';

const C = (a, l, f) => [a, l, f];
/** Los frontones con historia o con foto. */
export const DESTACADOS = [
  // ---------- Con historia ----------
  { id: 'labrit', grupo: 'historia', nombre: 'Frontón Labrit', lugar: 'Iruña / Pamplona', comarca: 'pamplona', town: 'pamplona', tipo: 'izquierda', cubierto: true, anio: 1952,
    aforo: 'Unas 950 personas sentadas; hasta 1.200 en total',
    texto: 'Lo llaman «La Bombonera». Se inauguró en junio de 1952, junto al baluarte de Labrit, porque en aquellos años había muchísima afición a la pelota a mano y faltaba sitio para jugar. Se reformó en 1986 y en 2002, y fue sede del Campeonato del Mundo de Pelota Vasca en 1962 y en 2002.',
    foto: 'labrit', cred: C('Juanje 2712', 'CC BY-SA 3.0', 'Frontón Labrit - DSC 1955.JPG') },
  { id: 'navarra-arena', grupo: 'historia', nombre: 'Navarra Arena', lugar: 'Iruña / Pamplona', comarca: 'pamplona', town: 'pamplona', tipo: 'izquierda', cubierto: true, anio: 2018,
    aforo: 'Unas 3.000 personas en el frontón',
    texto: 'Se estrenó el 29 de septiembre de 2018 con la final del Cuatro y Medio, con el frontón lleno. Es un pabellón con una pista grande y un frontón propio, donde se juegan finales de los campeonatos de pelota profesional.',
    foto: 'navarra-arena', cred: C('Navarrarena', 'CC BY-SA 4.0', 'Navarra Arena (Pamplona, ESP) 2017.jpg') },
  { id: 'euskal-jai-berri', grupo: 'historia', nombre: 'Euskal Jai Berri', lugar: 'Uharte / Huarte', comarca: 'pamplona', tipo: 'izquierda', cubierto: true, anio: 1977,
    texto: 'Se abrió en 1977, cuando cerró el Euskal Jai de Pamplona, para que el remonte tuviera casa. Lo diseñó Fernando Gibert. Se preparó para los Mundiales de Pelota de 2002, con remonte y cesta punta, y es del Ayuntamiento de Huarte desde ese año.' },
  { id: 'euskal-jai', grupo: 'historia', nombre: 'Euskal Jai', sub: 'Ya no existe', lugar: 'Iruña / Pamplona', comarca: 'pamplona', town: 'pamplona', tipo: 'izquierda', cubierto: true, anio: '1909 a 2004',
    aforo: 'Unas 1.100 personas',
    texto: 'Se inauguró el 24 de enero de 1909 en la calle San Agustín, en el Casco Viejo. Lo hizo el arquitecto Serapio Esparza. Allí se formaron algunos de los mejores remontistas de la historia. El último partido de remonte se jugó el 14 de diciembre de 1977 y el edificio se derribó en 2004. Algunas de sus piedras son hoy bancos de un parque.' },
  { id: 'atarrabia', grupo: 'historia', nombre: 'Frontón Atarrabia', lugar: 'Atarrabia / Villava', comarca: 'pamplona', tipo: 'izquierda', cubierto: true, anio: 1931,
    texto: 'El partido de inauguración se jugó en septiembre de 1931. Lo construyó el ingeniero Martín Goñi, y las crónicas de entonces contaron con detalle el estilo de los pelotaris de aquel primer partido.' },
  { id: 'lopez', grupo: 'historia', nombre: 'Frontón López', lugar: 'Iturrama, Pamplona', comarca: 'pamplona', town: 'pamplona', tipo: 'izquierda', anio: 1935,
    texto: 'Se levantó en 1935 en Iturrama, junto al paseo Félix Huarte, el mismo año que el frontón cubierto de la Rochapea. Es uno de los frontones de barrio con más años de Pamplona.',
    foto: 'lopez', cred: C('JLVwiki', 'CC BY-SA 4.0', 'Forntón López 2.jpg') },
  { id: 'manueta', grupo: 'historia', nombre: 'Frontón de la Mañueta', lugar: 'Casco Viejo, Pamplona', comarca: 'pamplona', town: 'pamplona', tipo: 'izquierda', cubierto: true,
    texto: 'Está en la calle Mañueta, en el Casco Viejo de Iruña, en un sitio donde ya se jugaba a pelota antes. Es uno de los frontones con más historia de la ciudad.',
    foto: 'manueta', cred: C('Jialxv', 'CC BY-SA 4.0', 'Frontón de la Mañueta, Pamplona.jpg') },
  { id: 'jito-alai', grupo: 'historia', nombre: 'Frontón Jito Alai', lugar: 'Iruña / Pamplona', comarca: 'pamplona', town: 'pamplona', tipo: 'izquierda', anio: 1962,
    texto: 'Es de 1962 y está junto al baluarte de Labrit, muy cerca de «La Bombonera».' },
  { id: 'atxa', grupo: 'historia', nombre: 'Juanjo Atxa Mindegia Pilotalekua', lugar: 'Elizondo, Baztan', comarca: 'bidasoa', town: 'elizondo', tipo: 'izquierda',
    texto: 'Hasta julio de 2025 se llamaba Frontón Baztan. Ese verano tomó el nombre de Juanjo Atxa Mindegia, de Almandoz, que fundó la escuela de pelota de Baztan en 1977.' },
  { id: 'elizondo-trinquete', grupo: 'historia', nombre: 'Trinquete de Elizondo', lugar: 'Elizondo, Baztan', comarca: 'bidasoa', town: 'elizondo', tipo: 'trinquete', cubierto: true,
    texto: 'En Baztan y en Malerreka se sigue jugando en trinquete, y en estos valles todavía hay campeonatos de pasaka por parejas. El de Elizondo es uno de los seis trinquetes de Navarra.',
    foto: 'elizondo-trinquete', cred: C('JMSE', 'CC BY-SA 3.0', 'Elizondo trinquete.jpg') },
  { id: 'sanguesa', grupo: 'historia', nombre: 'El juego de pelota de Sangüesa', lugar: 'Zangoza / Sangüesa', comarca: 'sanguesa', town: 'sanguesa', tipo: 'trinquete', anio: 'Siglo XVI',
    texto: 'A mediados del siglo XVI ya había en Sangüesa un juego de pelota, un trinquete de un particular, en la Plaza del Castillo, en el sitio que llamaban La Galería. Es una de las noticias más antiguas de la pelota en Navarra.' },
  { id: 'muzqui', grupo: 'historia', nombre: 'Frontón de Muzqui', lugar: 'Muzqui, valle de Yerri', comarca: 'tierra-estella', tipo: 'plaza',
    texto: 'Es el único frontón de Navarra, y quizá del mundo, en el que una carretera cruza la cancha: cuando pasa un coche, se para el partido.' },
  { id: 'nagore', grupo: 'historia', nombre: 'Frontón de Nagore', lugar: 'Nagore, valle de Arce', comarca: 'prepirineo', tipo: 'izquierda', anio: 1997,
    texto: 'Se terminó en 1997, con 600 metros cuadrados construidos: mucho frontón para un pueblo pequeño del Prepirineo.' },
  { id: 'alloz', grupo: 'historia', nombre: 'Frontón de Alloz', lugar: 'Alloz, valle de Yerri', comarca: 'tierra-estella', tipo: 'izquierda', cubierto: true, anio: 2009,
    texto: 'Se construyó en 2009, con una cubierta de 750 metros cuadrados, junto al embalse de Alloz.' },

  // ---------- La Montaña: Baztan-Bidasoa, Larraun-Leitzaldea, el Pirineo y Sakana ----------
  { id: 'arraioz', grupo: 'montana', nombre: 'La plaza del laxoa', lugar: 'Arraioz, Baztan', comarca: 'bidasoa', tipo: 'plaza',
    texto: 'Detrás de la iglesia está la plaza para jugar al laxoa, uno de los juegos de pelota más antiguos, con guante y sin frontis: los dos equipos se lanzan la pelota de un lado a otro. El suelo es de hierba.',
    foto: 'arraioz', cred: C('Ksarasola', 'CC BY-SA 4.0', 'Arraioz Pilotalekua 20180818-2.jpg') },
  { id: 'almandoz', grupo: 'montana', nombre: 'Ederrena pilotalekua', lugar: 'Almandoz, Baztan', comarca: 'bidasoa', tipo: 'izquierda', cubierto: true,
    texto: 'El frontón cubierto de Almandoz, el pueblo de Juanjo Atxa, que fundó la escuela de pelota de Baztan.',
    foto: 'almandoz', cred: C('Euskaldunaa', 'CC BY-SA 4.0', 'Ederrena pilotalekua, Almadoz, Baztan. Nafarroa, Euskal Herria.jpg') },
  { id: 'irurita', grupo: 'montana', nombre: 'Frontón de Irurita', lugar: 'Irurita, Baztan', comarca: 'bidasoa', tipo: 'plaza',
    texto: 'Uno de los frontones de los quince pueblos del valle de Baztan, donde casi cada pueblo tiene el suyo.',
    foto: 'irurita', cred: C('Wikimaribarre', 'CC BY-SA 4.0', 'Irurita. Pilotalekua.jpg') },
  { id: 'igantzi', grupo: 'montana', nombre: 'Frontón de Igantzi', lugar: 'Igantzi, Bortziriak', comarca: 'bidasoa', tipo: 'izquierda', cubierto: true,
    texto: 'El frontón cubierto de Igantzi, una de las Cinco Villas de la Montaña, en el valle del Bidasoa.',
    foto: 'igantzi', cred: C('Luistxo', 'CC BY-SA 4.0', 'Igantzi Pilotalekua.jpg') },
  { id: 'urroz', grupo: 'montana', nombre: 'Frontón de Urroz', lugar: 'Urroz de Santesteban, Malerreka', comarca: 'bidasoa', tipo: 'plaza',
    texto: 'El frontón de Urroz, en Malerreka, uno de los valles donde la pelota sigue muy viva.',
    foto: 'urroz', cred: C('Basotxerri', 'CC BY-SA 4.0', 'Urroz de Santesteban - Frontón 01.jpg') },
  { id: 'leitza', grupo: 'montana', nombre: 'Leitzako pilotalekua', lugar: 'Leitza', comarca: 'larraun-leitzaldea', town: 'leitza', tipo: 'izquierda',
    texto: 'En Leitza la pelota es muy querida: en 2022 nació aquí Ados Pilota, un club de pelota a mano profesional de mujeres.',
    foto: 'leitza', cred: C('Luistxo', 'CC BY-SA 4.0', 'Pilotalekua Leitza a03.jpg') },
  { id: 'areso', grupo: 'montana', nombre: 'Frontón de Areso', lugar: 'Areso, Leitzaldea', comarca: 'larraun-leitzaldea', tipo: 'plaza',
    texto: 'El frontón de Areso, un pueblo pequeño de Leitzaldea, entre montes.',
    foto: 'areso', cred: C('Basotxerri', 'CC BY-SA 4.0', 'Areso - Frontón 01.jpg') },
  { id: 'lekunberri', grupo: 'montana', nombre: 'Trinquete de Lekunberri', lugar: 'Lekunberri, Larraun', comarca: 'larraun-leitzaldea', town: 'lekunberri', tipo: 'trinquete', cubierto: true,
    texto: 'Lekunberri tiene frontón y también trinquete, uno de los seis que hay en Navarra. En la fachada del trinquete hay pelotaris pintados.',
    foto: 'lekunberri', cred: C('csBulegotik (Tagzania)', 'CC BY-SA 4.0', 'Lekunberriko pilotalekua - Lekunberri - Tagzania - 1770570434815.jpg') },
  { id: 'isaba', grupo: 'montana', nombre: 'Frontón Erminea', lugar: 'Isaba / Izaba, Roncal', comarca: 'pirineo', town: 'isaba-izaba', tipo: 'izquierda', cubierto: true,
    texto: 'El frontón cubierto de Isaba, en lo alto del valle de Roncal, donde en invierno nieva mucho: con techo se juega todo el año.',
    foto: 'isaba', cred: C('Sabayao', 'CC BY-SA 3.0', 'Frontón de Isaba.jpg') },
  { id: 'roncal', grupo: 'montana', nombre: 'Frontón de Roncal', lugar: 'Erronkari / Roncal', comarca: 'pirineo', town: 'erronkari-roncal', tipo: 'plaza',
    texto: 'El frontón clásico de Roncal, en el pueblo que da nombre al valle.',
    foto: 'roncal', cred: C('Ardo Beltz', 'CC BY-SA 3.0', 'Roncal fronton.jpg') },
  { id: 'olazagutia', grupo: 'montana', nombre: 'Udal pilotalekua', lugar: 'Olazti / Olazagutía', comarca: 'sakana', tipo: 'izquierda',
    texto: 'El frontón municipal de Olazagutía, en Sakana, a los pies de la sierra de Urbasa.',
    foto: 'olazagutia', cred: C('Zarateman', 'CC0', 'Olazagutía - Udal Pilotalekua 1.jpg') },
  { id: 'lakuntza', grupo: 'montana', nombre: 'Frontón de Lakuntza', lugar: 'Lakuntza, Sakana', comarca: 'sakana', tipo: 'izquierda',
    texto: 'En una pared del frontón de Lakuntza hay un pelotari pintado, a punto de golpear la pelota. Lakuntza está en el corredor de Sakana, entre las sierras de Aralar y Urbasa.',
    foto: 'lakuntza', cred: C('Zarateman', 'CC0', 'Lakuntza - Frontón 4.jpg') },
  { id: 'iraneta', grupo: 'montana', nombre: 'Frontón de Irañeta', lugar: 'Irañeta, Sakana', comarca: 'sakana', tipo: 'izquierda', cubierto: true,
    texto: 'El frontón cubierto de Irañeta, uno de los pueblos pequeños de Sakana, con las paredes verdes y la cubierta de madera.',
    foto: 'iraneta', cred: C('Basotxerri', 'CC BY-SA 4.0', 'Irañeta - Frontón 01.jpg') },
  { id: 'ziordia', grupo: 'montana', nombre: 'Frontón de Ziordia', lugar: 'Ziordia, Sakana', comarca: 'sakana', tipo: 'izquierda', cubierto: true,
    texto: 'Ziordia es el último pueblo de Sakana por el oeste, ya en la raya con Álava.',
    foto: 'ziordia', cred: C('Basotxerri', 'CC BY-SA 4.0', 'Ziordia - Frontón 01.jpg') },

  // ---------- La Zona Media y Tierra Estella (con la Cuenca de Pamplona y el Prepirineo) ----------
  { id: 'berrioplano', grupo: 'media', nombre: 'Frontón de Berrioplano', lugar: 'Berrioplano / Berriobeiti', comarca: 'pamplona', tipo: 'izquierda', cubierto: true,
    texto: 'El frontón de Berrioplano, en la Cuenca de Pamplona, a pocos kilómetros de la ciudad.',
    foto: 'berrioplano', cred: C('Zarateman', 'CC0', 'Berrioplano - Frontón 2.jpg') },
  { id: 'bidaurreta', grupo: 'media', nombre: 'Frontón de Bidaurreta', lugar: 'Bidaurreta', comarca: 'pamplona', tipo: 'izquierda', cubierto: true,
    texto: 'El frontón de Bidaurreta, un pueblo pequeño al oeste de la Cuenca de Pamplona, tiene el tejado sobre pilares y los lados abiertos.',
    foto: 'bidaurreta', cred: C('Basotxerri', 'CC BY-SA 4.0', 'Bidaurreta - Frontón 01.jpg') },
  { id: 'igal', grupo: 'media', nombre: 'Frontón de Igal', lugar: 'Igal / Igari, valle de Salazar', comarca: 'pirineo', tipo: 'izquierda',
    texto: 'El frontón de Igal, en el sur del valle de Salazar.',
    foto: 'igal', cred: C('Jialxv', 'CC BY-SA 4.0', 'Igal - Frontón.jpg') },
  { id: 'izco', grupo: 'media', nombre: 'Frontón de Izco', lugar: 'Izco, Ibargoiti', comarca: 'prepirineo', tipo: 'plaza',
    texto: 'El frontón de Izco, en el valle de Ibargoiti, junto a la sierra de Izco.',
    foto: 'izco', cred: C('Jialxv', 'CC BY-SA 4.0', 'Izco (Ibargoiti)-Frontón.jpg') },
  { id: 'petilla', grupo: 'media', nombre: 'Frontón de Petilla de Aragón', lugar: 'Petilla de Aragón', comarca: 'sanguesa', tipo: 'izquierda',
    texto: 'Petilla de Aragón es un pedazo de Navarra rodeado de Aragón por todas partes, y también tiene su frontón.',
    foto: 'petilla', cred: C('Jialxv', 'CC BY-SA 4.0', 'Frontón de Petilla de Aragón.jpg') },
  { id: 'lana', grupo: 'media', nombre: 'Frontón de Galbarra', lugar: 'Galbarra, valle de Lana', comarca: 'tierra-estella', tipo: 'izquierda',
    texto: 'El frontón de Galbarra, en el valle de Lana, entre las sierras de Urbasa y Lokiz.',
    foto: 'lana', cred: C('Basotxerri', 'CC BY-SA 4.0', 'Lana - Galbarra - Frontón 01.jpg') },
  { id: 'nazar', grupo: 'media', nombre: 'Frontón de Nazar', lugar: 'Nazar, Berrueza', comarca: 'tierra-estella', tipo: 'plaza',
    texto: 'El frontón de Nazar, en el valle de la Berrueza, con la sierra al fondo entre las nubes.',
    foto: 'nazar', cred: C('Basotxerri', 'CC BY-SA 4.0', 'Nazar - Frontón 01.jpg') },
  { id: 'mendaza', grupo: 'media', nombre: 'Frontón de Mendaza', lugar: 'Mendaza, Berrueza', comarca: 'tierra-estella', tipo: 'plaza',
    texto: 'El frontón de Mendaza, en el valle de la Berrueza, en Tierra Estella.',
    foto: 'mendaza', cred: C('Mentxuwiki', 'CC BY-SA 4.0', 'Frontón de Mendaza.jpg') },
  { id: 'asarta', grupo: 'media', nombre: 'Frontón de Asarta', lugar: 'Asarta, Berrueza', comarca: 'tierra-estella', tipo: 'plaza',
    texto: 'Aquí el frontis es una pared de la iglesia de San Juan Bautista, como en los frontones más antiguos, y al lado hay una canasta de baloncesto.',
    foto: 'asarta', cred: C('Mentxuwiki', 'CC BY-SA 4.0', 'Frontón en Asarta.jpg') },
  { id: 'mirafuentes', grupo: 'media', nombre: 'Frontón de Mirafuentes', lugar: 'Mirafuentes, Berrueza', comarca: 'tierra-estella', tipo: 'plaza',
    texto: 'El frontón de Mirafuentes, en la Berrueza, al pie de la sierra de Codés.',
    foto: 'mirafuentes', cred: C('Basotxerri', 'CC BY-SA 4.0', 'Mirafuentes - Frontón 01.jpg') },
  { id: 'genevilla', grupo: 'media', nombre: 'Frontón de Genevilla', lugar: 'Genevilla, valle de Aguilar', comarca: 'tierra-estella', tipo: 'plaza',
    texto: 'El frontón de Genevilla, en el valle de Aguilar, en el extremo oeste de Tierra Estella.',
    foto: 'genevilla', cred: C('Mentxuwiki', 'CC BY-SA 4.0', 'Frontón, Genevilla.jpg') },
  { id: 'maranon', grupo: 'media', nombre: 'Frontón de Marañón', lugar: 'Marañón', comarca: 'tierra-estella', tipo: 'plaza',
    texto: 'Marañón es uno de los pueblos más al oeste de Navarra, en la raya con Álava.',
    foto: 'maranon', cred: C('Mentxuwiki', 'CC BY-SA 4.0', 'Frontón de Marañón.jpg') },
  { id: 'luquin', grupo: 'media', nombre: 'Frontón viejo de Luquin', lugar: 'Luquin', comarca: 'tierra-estella', tipo: 'plaza',
    texto: 'El frontón viejo de Luquin, el de antes, que se ha quedado en el pueblo cuando se hizo otro.',
    foto: 'luquin', cred: C('Basotxerri', 'CC BY-SA 4.0', 'Luquin - Frontón Viejo 01.jpg') },
  { id: 'allo', grupo: 'media', nombre: 'Frontón de Allo', lugar: 'Allo', comarca: 'tierra-estella', tipo: 'izquierda', cubierto: true,
    texto: 'El frontón cubierto de Allo, en la parte baja de Tierra Estella, entre viñas y olivos.',
    foto: 'allo', cred: C('Jialxv', 'CC BY-SA 4.0', 'Frontón de Allo (Navarra).jpg') },
  { id: 'sartaguda', grupo: 'media', nombre: 'Frontón de Sartaguda', lugar: 'Sartaguda', comarca: 'tierra-estella', tipo: 'izquierda',
    texto: 'El frontón de Sartaguda está en la Plaza de la Libertad, junto al río Ebro.',
    foto: 'sartaguda', cred: C('Ecelan', 'CC BY-SA 4.0', 'Sartaguda - Plaza de la libertad - Frontón.jpg') },

  // ---------- La Ribera ----------
  { id: 'peralta', grupo: 'ribera', nombre: 'Frontón Vicente Lacalle', lugar: 'Peralta / Azkoien', comarca: 'ribera-alta', tipo: 'izquierda', cubierto: true,
    texto: 'El frontón municipal de Peralta lleva el nombre de Vicente Lacalle, y en su fachada hay un pelotari pintado.',
    foto: 'peralta', cred: C('Zarateman', 'CC0', 'Peralta - Frontón Municipal Vicente Lacalle.jpg') },
  { id: 'cabanillas', grupo: 'ribera', nombre: 'Frontón de Cabanillas', lugar: 'Cabanillas', comarca: 'ribera', tipo: 'izquierda',
    texto: 'El frontón de Cabanillas, en la Ribera, junto al Ebro y cerca de Tudela.',
    foto: 'cabanillas', cred: C('Iñaki Queralt', 'CC BY 2.0', 'Frontón de Cabanillas.jpg') },
  { id: 'fontellas', grupo: 'ribera', nombre: 'Frontón de Fontellas', lugar: 'Fontellas', comarca: 'ribera', tipo: 'plaza',
    texto: 'El frontón de Fontellas, en la Ribera de Tudela, donde el sol aprieta y se juega al caer la tarde.',
    foto: 'fontellas', cred: C('Zarateman', 'CC0', 'Fontellas - Frontón 1.jpg') },
];

export const destacado = (id) => DESTACADOS.find(f => f.id === id);
/** El total y cuántos hay de cada tipo, contados en TODOS. */
export const CUENTA = TODOS.reduce((c, [, , p, i, t]) => { c.plaza += p; c.izquierda += i; c.trinquete += t; c.total += p + i + t; return c; }, { plaza: 0, izquierda: 0, trinquete: 0, total: 0 });
