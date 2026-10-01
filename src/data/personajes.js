// Personajes de Navarra: gente que dejó huella en la música, el deporte, la ciencia, los viajes, el gobierno
// y el trabajo. Cada uno tiene un recuerdo en su pueblo (busto o estela de bronce, diseño propio sin parecido
// con la persona real), tres páginas de historia contadas para niños, una pregunta y «su huella hoy».
// attr: objeto que acompaña al recuerdo (violín, corona, bici, libro, cadena, barco, alpargata, balanza, partitura)

const GUIA = (name, look) => ({ name, look });
const GUIA_M = { shirt: '#f2c230', vest: '#3a8fd6', pants: '#2b3a6b', hair: '#3b2418', ponytail: true, female: true, strap: '#6b4a2e', bag: '#8a6a3a', face: 'happy' };
const GUIA_H = { shirt: '#e8e0cc', vest: '#7a2f3a', pants: '#2b3a6b', hair: '#2a1a12', glasses: '#3a2a1a', strap: '#6b4a2e', bag: '#8a6a3a' };

export const PERSONAJES = {
  sarasate: {
    name: 'Pablo Sarasate', years: '1844 – 1908', kicker: 'Personajes de Navarra · Música', icon: 'music', attr: 'violin', women: false,
    host: GUIA('Leire, violinista', { shirt: '#ffffff', vest: '#2b2630', skirt: '#2b2630', pants: '#2b2630', hair: '#2a1a12', bun: true, female: true }),
    hello: 'Cuando era pequeña oí una grabación de un violinista de Pamplona y decidí aprender a tocar. ¿Quieres conocer su historia?',
    pages: [
      'Pablo Sarasate nació en Pamplona en 1844. Con solo ocho años ya daba conciertos de violín y la gente no se creía que un niño tocara así.',
      'Estudió en el Conservatorio de París y viajó tocando por Europa y América. Compuso «Aires gitanos», una de las piezas más difíciles y famosas para violín.',
      'Aunque era famoso en todo el mundo, cada verano volvía a Pamplona por San Fermín y daba conciertos para su gente.',
    ],
    q: { q: '¿Qué instrumento tocaba Sarasate?', options: ['El violín', 'El txistu', 'El piano'], answer: 0, why: 'Sarasate fue uno de los mejores violinistas de su época.' },
    today: 'En Pamplona, el Paseo de Sarasate lleva su nombre, y el Conservatorio Pablo Sarasate enseña música a cientos de niñas y niños.',
  },
  indurain: {
    name: 'Miguel Induráin', years: 'nació en 1964', kicker: 'Personajes de Navarra · Deporte', icon: 'bike', attr: 'bike', women: false,
    host: GUIA('Iñigo, ciclista', { shirt: '#f2c230', pants: '#1d1d24', hair: '#2a1a12', bag: '#3a8fd6' }),
    hello: '¿Te gusta la bici? En Navarra tenemos a uno de los mejores ciclistas de la historia. Te cuento.',
    pages: [
      'Miguel Induráin nació en 1964 en Villava, pegado a Pamplona. De niño ayudaba a su familia en el campo y empezó a correr en bici con un club del pueblo.',
      'Era alto, fuerte y muy tranquilo. Ganó cinco Tours de Francia seguidos, de 1991 a 1995. ¡Nadie lo había hecho antes!',
      'En 1996 ganó también la medalla de oro en los Juegos Olímpicos de Atlanta. Y aun siendo un campeón, siempre fue sencillo y amable.',
    ],
    q: { q: '¿Cuántos Tours de Francia seguidos ganó Induráin?', options: ['Dos', 'Cinco', 'Diez'], answer: 1, why: 'Ganó cinco seguidos, de 1991 a 1995.' },
    today: 'Es un ejemplo de esfuerzo y humildad. Por las carreteras de Navarra en las que entrenaba hoy pedalean muchísimos ciclistas.',
  },
  gayarre: {
    name: 'Julián Gayarre', years: '1844 – 1890', kicker: 'Personajes de Navarra · Música', icon: 'music', attr: 'score', women: false,
    host: GUIA('Maite, del museo', GUIA_M),
    hello: 'En esta casa nació un niño del valle que acabó cantando en los teatros más famosos del mundo.',
    pages: [
      'Julián Gayarre nació en Roncal en 1844. De niño cuidaba el ganado y después trabajó de aprendiz en una herrería de Pamplona.',
      'Cantaba mientras trabajaba y alguien se fijó en su voz. Estudió música y llegó a ser uno de los mejores tenores del mundo: cantó en Milán, Londres, París y Madrid.',
      'Nunca olvidó su valle. Está enterrado en el cementerio de Roncal, en un mausoleo de mármol.',
    ],
    q: { q: '¿Qué hacía Gayarre?', options: ['Cantaba ópera', 'Jugaba a pelota', 'Hacía quesos'], answer: 0, why: 'Era tenor: cantaba ópera con una voz muy aguda y potente.' },
    today: 'Su casa natal en Roncal es hoy un museo con sus trajes de ópera y sus recuerdos.',
  },
  blanca: {
    name: 'Blanca I de Navarra', years: '1387 – 1441', kicker: 'Mujeres de Navarra · Gobierno', icon: 'castle', attr: 'crown', women: true,
    host: GUIA('Ane, guía del palacio', GUIA_M),
    hello: 'Este palacio lo levantó un rey… pero quien llegó a gobernar Navarra fue su hija. ¿La conoces?',
    pages: [
      'Blanca era hija del rey Carlos III el Noble, el que construyó el Palacio Real de Olite, con sus torres, jardines y fuentes.',
      'De joven se casó con el rey de Sicilia y llegó a gobernar aquella isla del Mediterráneo cuando hizo falta.',
      'En 1425 heredó la corona y fue reina de Navarra: una mujer al frente del reino hace casi seiscientos años.',
    ],
    q: { q: '¿Qué isla gobernó Blanca antes de ser reina de Navarra?', options: ['Sicilia', 'Mallorca', 'Irlanda'], answer: 0, why: 'Fue reina de Sicilia antes de heredar la corona de Navarra.' },
    today: 'El Palacio Real de Olite, donde creció, es hoy uno de los monumentos más visitados de Navarra.',
  },
  javier: {
    name: 'Francisco de Javier', years: '1506 – 1552', kicker: 'Personajes de Navarra · Viajes', icon: 'compass', attr: 'ship', women: false,
    host: GUIA('Koldo, guía', GUIA_H),
    hello: 'A pocos kilómetros de aquí hay un castillo. En él nació uno de los grandes viajeros de su tiempo.',
    pages: [
      'Francisco nació en 1506 en el castillo de Javier, muy cerca de Sangüesa.',
      'Estudió en París y allí, con Ignacio de Loyola y otros compañeros, fundó la Compañía de Jesús.',
      'Viajó en barco hasta la India y Japón. En aquella época el viaje duraba más de un año y era muy peligroso.',
    ],
    q: { q: '¿A qué país lejano llegó Francisco de Javier?', options: ['Japón', 'Australia', 'Islandia'], answer: 0, why: 'Llegó a Japón en 1549, después de pasar por la India.' },
    today: 'Es patrón de Navarra: el Día de Navarra es el 3 de diciembre, su fiesta. Y cada marzo miles de personas caminan hasta el castillo en la Javierada.',
  },
  sancho: {
    name: 'Sancho VII el Fuerte', years: 'hacia 1154 – 1234', kicker: 'Personajes de Navarra · Historia', icon: 'shield', attr: 'chain', women: false,
    host: GUIA('Patxi, peregrino', { shirt: '#8a6a3a', vest: '#3a4a3a', pants: '#3a3530', hair: '#4a3020', beard: '#4a3020', staff: true, bag: '#c9a27a' }),
    hello: 'Aquí, en la Colegiata, descansa un rey enorme… y de él viene una leyenda que está en todas las banderas de Navarra.',
    pages: [
      'Sancho VII fue rey de Navarra hace más de ochocientos años. Le llamaban el Fuerte porque era altísimo: dicen que pasaba de los dos metros.',
      'En 1212 luchó en la batalla de las Navas de Tolosa. Cuenta la tradición que rompió las cadenas que rodeaban la tienda del jefe enemigo.',
      'Según la leyenda, por eso el escudo de Navarra tiene cadenas de oro sobre fondo rojo.',
    ],
    q: { q: 'Según la leyenda, ¿qué puso Sancho en el escudo de Navarra?', options: ['Cadenas', 'Un león', 'Una estrella'], answer: 0, why: 'Las cadenas de oro sobre rojo recuerdan la leyenda de las Navas de Tolosa.' },
    today: 'Su sepulcro está en la Colegiata de Roncesvalles, en el Camino de Santiago. Y las cadenas siguen en la bandera de Navarra.',
  },
  azpilcueta: {
    name: 'Martín de Azpilcueta', years: '1492 – 1586', kicker: 'Personajes de Navarra · Ciencia', icon: 'book', attr: 'scales', women: false,
    host: GUIA('Nekane, maestra', { shirt: '#b5485d', skirt: '#2b2630', pants: '#2b2630', hair: '#6b3b1f', bun: true, female: true, glasses: '#3a2a1a' }),
    hello: '¿Sabes por qué las cosas cuestan más que antes? Un sabio de al lado de Tafalla se lo preguntó hace quinientos años.',
    pages: [
      'Martín de Azpilcueta nació en 1492 en Barásoain, muy cerca de Tafalla. En media Europa le conocían como el «Doctor Navarro».',
      'Fue profesor en las universidades de Salamanca y Coímbra, y estudió algo muy curioso: por qué las cosas valen más o menos dinero.',
      'Vio que cuando llegaba mucho oro y plata de América, los precios subían. ¡Fue uno de los primeros economistas!',
    ],
    q: { q: '¿Qué estudió el Doctor Navarro?', options: ['Por qué suben los precios', 'Las estrellas', 'Los volcanes'], answer: 0, why: 'Explicó que cuando hay mucho dinero, las cosas se vuelven más caras.' },
    today: 'Hoy se le considera uno de los padres de la economía. Si te preguntas por qué algo cuesta más que antes, estás pensando como él.',
  },
  benjamin: {
    name: 'Benjamín de Tudela', years: 'siglo XII', kicker: 'Personajes de Navarra · Viajes', icon: 'map', attr: 'book', women: false,
    host: GUIA('Yusuf, guía de la judería', GUIA_H),
    hello: 'Hace más de ochocientos cincuenta años salió de Tudela un viajero que lo apuntaba todo. Su libro aún se lee.',
    pages: [
      'Benjamín vivió en Tudela en el siglo XII, cuando en la ciudad convivían cristianos, judíos y musulmanes.',
      'Hacia 1165 salió de viaje y recorrió durante años Europa, Asia y África: Roma, Constantinopla, Jerusalén, Bagdad, Egipto…',
      'Escribió un libro contando cómo vivía la gente en cada lugar. Es uno de los primeros grandes viajeros de los que tenemos noticia.',
    ],
    q: { q: '¿Qué hizo Benjamín de Tudela?', options: ['Viajar y escribir un libro', 'Construir la catedral', 'Inventar la pelota'], answer: 0, why: 'Su «Libro de viajes» describe ciudades de tres continentes.' },
    today: 'Tudela recuerda sus tres culturas: la judería, la catedral levantada donde estuvo la mezquita y las calles del casco viejo cuentan esa historia.',
  },
  julia: {
    name: 'Julia Álvarez Resano', years: '1903 – 1948', kicker: 'Mujeres de Navarra · Derechos', icon: 'book', attr: 'book', women: true,
    host: GUIA('Itziar, abogada', { shirt: '#ffffff', vest: '#2b3a6b', skirt: '#2b3a6b', pants: '#2b3a6b', hair: '#1f1712', bun: true, female: true }),
    hello: 'Cerca de aquí, en Villafranca, nació una niña que abrió puertas que estaban cerradas para las mujeres.',
    pages: [
      'Julia nació en 1903 en Villafranca, en la Ribera. Fue maestra y quería que todas las niñas pudieran estudiar.',
      'Cuando casi ninguna mujer iba a la universidad, ella estudió Derecho y se hizo abogada. Defendía a la gente del campo.',
      'Fue diputada y la primera mujer gobernadora civil de España. Luchó por los derechos de las mujeres y de los trabajadores.',
    ],
    q: { q: '¿En qué trabajó Julia antes de ser abogada?', options: ['Era maestra', 'Era pastora', 'Era panadera'], answer: 0, why: 'Empezó como maestra de escuela.' },
    today: 'Gracias a pioneras como Julia, hoy las mujeres pueden ser juezas, alcaldesas, científicas o presidentas.',
  },
  golondrinas: {
    name: 'Las golondrinas', eu: 'Ainarak', years: 'hacia 1870 – 1930', kicker: 'Mujeres de Navarra · Trabajo', icon: 'espadrille', attr: 'espadrille', women: true, stele: true,
    host: GUIA('Amona Kontxi', { shirt: '#3d3350', skirt: '#2a2440', pants: '#2a2440', hair: '#dcd7cf', old: true, bun: true, female: true, apron: '#f4f1ea' }),
    hello: 'Mi abuela fue golondrina. ¿Sabes lo que era? Siéntate, que te lo cuento.',
    pages: [
      'Hace unos cien años, cada otoño, muchas chicas jóvenes de los valles de Roncal, Salazar y Aezkoa cruzaban los Pirineos a pie, a veces con nieve.',
      'Iban a Mauleón, al otro lado de la frontera, a coser alpargatas en los talleres durante todo el invierno. Las llamaban golondrinas (ainarak) porque se iban en otoño y volvían en primavera.',
      'Con lo que ganaban ayudaban a sus familias. Eran muy valientes: caminaban días por el monte y vivían lejos de casa siendo casi niñas.',
    ],
    q: { q: '¿Por qué las llamaban golondrinas?', options: ['Se iban en otoño y volvían en primavera', 'Cantaban muy bien', 'Viajaban en globo'], answer: 0, why: 'Como esos pájaros, se marchaban en otoño y regresaban en primavera.' },
    today: 'Su historia se recuerda en los valles y en Mauleón. Nos enseña el trabajo de tantas mujeres que sacaron adelante a sus familias.',
  },
};

// Dónde está cada personaje
export const FIGURE_TOWNS = {
  pamplona: ['sarasate', 'indurain'], 'erronkari-roncal': ['gayarre'], olite: ['blanca'], sanguesa: ['javier'],
  'orreaga-roncesvalles': ['sancho'], tafalla: ['azpilcueta'], tudela: ['benjamin'], peralta: ['julia'], 'isaba-izaba': ['golondrinas'],
};
