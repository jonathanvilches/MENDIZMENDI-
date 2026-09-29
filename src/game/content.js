// Contenido del juego: cintas, misiones, cartas del cuaderno, preguntas y textos
// Los datos culturales proceden de las fichas del proyecto (Junta del Valle de Salazar, Turismo de Navarra,
// IHAUTERIAPP, Reyno Gourmet...). Los personajes, diálogos y pruebas son ficción del juego.

export const RIBBONS = [
  { id: 'gorria', name: 'Cinta roja', eu: 'gorria', color: '#e03c3c', quest: 'bienvenida' },
  { id: 'horia', name: 'Cinta amarilla', eu: 'horia', color: '#f2c230', quest: 'escudos' },
  { id: 'zuria', name: 'Cinta blanca', eu: 'zuria', color: '#f4f1ea', quest: 'ovejas' },
  { id: 'berdea', name: 'Cinta verde', eu: 'berdea', color: '#3ca05a', quest: 'pelota' },
  { id: 'urdina', name: 'Cinta azul', eu: 'urdina', color: '#3a8fd6', quest: 'irati' },
  { id: 'laranja', name: 'Cinta naranja', eu: 'laranja', color: '#ff8c42', quest: 'basajaun' },
  { id: 'morea', name: 'Cinta morada', eu: 'morea', color: '#9b59d0', quest: 'lamia' },
  { id: 'arrosa', name: 'Cinta rosa', eu: 'arrosa', color: '#ff7eb6', quest: 'zarratrako' },
];

export const QUESTS = {
  bienvenida: { title: 'Ongi etorri a Otsagabia', giver: 'maite', icon: 'house', ribbon: 'gorria',
    steps: ['Habla con Maite junto al crucero', 'Cruza el puente medieval', 'Bebe agua en la fuente de la plaza', 'Sube a la iglesia y habla con Itziar', 'Vuelve con Maite'] },
  escudos: { title: 'Escudos de piedra', giver: 'itziar', icon: 'shield', ribbon: 'horia',
    steps: ['Encuentra los escudos de los tres palacios', 'Cuéntaselo a Itziar'] },
  ovejas: { title: 'El rebaño de Joxemari', giver: 'joxemari', icon: 'sheep', ribbon: 'zuria',
    steps: ['Ve a la borda de Joxemari', 'Lleva las 6 ovejas al redil', 'Habla con Joxemari'] },
  pelota: { title: 'Pelota en el frontón', giver: 'kike', icon: 'pelota', ribbon: 'berdea',
    steps: ['Habla con Kike en el frontón', 'Devuelve la pelota 6 veces seguidas'] },
  irati: { title: 'Guardianes de Irati', giver: 'inaki', icon: 'binoculars', ribbon: 'urdina',
    steps: ['Busca a Iñaki, el guarda de Irati', 'Observa 5 animales distintos con los prismáticos', 'Vuelve con Iñaki'] },
  basajaun: { title: 'El señor del bosque', giver: 'basajaun', icon: 'basajaun', ribbon: 'laranja',
    steps: ['Adéntrate en lo más profundo de Irati', 'Recoge 5 restos de basura del bosque', 'Vuelve con el Basajaun'] },
  lamia: { title: 'El peine de oro', giver: 'lamia', icon: 'lamia', ribbon: 'morea',
    steps: ['Visita la balsa de Irati', 'Encuentra el peine de oro en la orilla del río', 'Devuelve el peine a la Lamia'] },
  zarratrako: { title: '¿Dónde está el Zarratrako?', giver: 'amaia', icon: 'mask', ribbon: 'arrosa',
    steps: ['Habla con Amaia junto al río', 'Encuentra al Zarratrako (sigue sus cencerros)', 'Vuelve con Amaia'] },
  muskilda: { title: 'La fiesta de Muskilda', giver: 'bobo', icon: 'dance', final: true,
    steps: ['Consigue las 8 cintas', 'Sube al santuario de Muskilda', 'Baila con los danzantes'] },
};

export const CARDS = [
  { id: 'crucero', icon: 'cross', title: 'El crucero', cat: 'Patrimonio', text: 'A la entrada de la villa, donde el Zatoya se une al Anduña, se levanta un crucero de piedra de la primera mitad del siglo XVI.' },
  { id: 'puente', icon: 'bridge', title: 'El puente medieval', cat: 'Patrimonio', text: 'Cruza el Anduña en la calle principal y es la imagen más conocida del pueblo. El río tiene otros puentes de piedra.' },
  { id: 'barrios', icon: 'house', title: 'Cuatro barrios', cat: 'Patrimonio', text: 'El pueblo se reparte a ambos lados del río en cuatro barrios: Urrutia, Irigoyen, Iribarren y Labaria. Sus casas son de piedra, con tejados muy inclinados para la nieve.' },
  { id: 'iglesia', icon: 'church', title: 'San Juan Evangelista', cat: 'Patrimonio', text: 'Está en la parte alta del pueblo, con una torre imponente. Guarda retablos renacentistas del escultor Miguel de Espinal.' },
  { id: 'palacios', icon: 'palace', title: 'Palacios y escudos', cat: 'Patrimonio', text: 'Destacan los palacios de Urrutia, Iriarte y Donamaría, junto a casas con escudo de los siglos XVIII y XIX.' },
  { id: 'muskilda', icon: 'church', title: 'Santuario de Muskilda', cat: 'Patrimonio', text: 'En una colina a unos cuatro kilómetros del pueblo está el santuario románico de Nuestra Señora de Muskilda, de finales del siglo XII.' },
  { id: 'danzas', icon: 'dance', title: 'Danzas de Muskilda', cat: 'Tradición', text: 'Ocho danzantes, acompañados por el Bobo, bailan danzas de palos, de pañuelos y una jota en la fiesta de Muskilda (8 de septiembre).' },
  { id: 'traje', icon: 'ribbon', title: 'Vestir para la danza', cat: 'Tradición', text: 'Los danzantes de Ochagavía visten prendas blancas, cintas de colores y katxutxa. Es ropa de danza, no de trabajo diario.' },
  { id: 'zarratrako', icon: 'mask', title: 'El Zarratrako', cat: 'Tradición', text: 'Personaje del carnaval del valle de Salazar. Hace sonar sus cencerros y pone alegría (¡y algún susto!) en las calles.' },
  { id: 'pelota', icon: 'pelota', title: 'La pelota vasca', cat: 'Tradición', text: 'En casi todos los pueblos hay un frontón. Se juega golpeando la pelota contra la pared, a mano o con pala.' },
  { id: 'trashumancia', icon: 'sheep', title: 'Pastos y trashumancia', cat: 'Oficios', text: 'La ganadería es una actividad tradicional del valle. Los rebaños suben a los pastos comunales en verano y bajan cuando llega el frío.' },
  { id: 'latxa', icon: 'cheese', title: 'Oveja latxa y queso', cat: 'Oficios', text: 'La oveja latxa, de lana larga y cara oscura, da la leche con la que se hacen los quesos del Pirineo.' },
  { id: 'mesa', icon: 'bread', title: 'La mesa del valle', cat: 'Oficios', text: 'Queso, carnes de oveja y vaca, trucha y migas de pastor forman parte de la cocina del valle de Salazar.' },
  { id: 'irati', icon: 'tree', title: 'Selva de Irati', cat: 'Naturaleza', text: 'Ochagavía es una de las puertas de Irati, uno de los hayedo-abetales mejor conservados de Europa.' },
  { id: 'haya', icon: 'leaf', title: 'Hayas y abetos', cat: 'Naturaleza', text: 'Hayas y abetos forman el bosque de Irati. En otoño las hayas se vuelven doradas y rojizas.' },
  { id: 'corzo', icon: 'deer', title: 'Corzo', cat: 'Animales', text: 'Pequeño ciervo de los bosques del valle. Es muy tímido: si te acercas despacio y en silencio podrás verlo.' },
  { id: 'ciervo', icon: 'deer', title: 'Ciervo', cat: 'Animales', text: 'El macho luce una gran cornamenta que cambia cada año. En otoño se oye su berrea en Irati.' },
  { id: 'ardilla', icon: 'squirrel', title: 'Ardilla roja', cat: 'Animales', text: 'Vive en los árboles y guarda semillas para el invierno. ¡Olvida muchas y así ayuda a plantar el bosque!' },
  { id: 'pito', icon: 'woodpecker', title: 'Pito negro', cat: 'Animales', text: 'El pájaro carpintero más grande de Europa. Negro con un gorro rojo, se le oye tamborilear en los troncos de haya de Irati.' },
  { id: 'buitre', icon: 'vulture', title: 'Buitre leonado', cat: 'Animales', text: 'Planea en círculos aprovechando el aire caliente. Limpia el monte y vive en los roquedos.' },
  { id: 'trucha', icon: 'trout', title: 'Trucha', cat: 'Animales', text: 'Nada en las aguas frías y limpias del Anduña y el Zatoya. A veces salta para atrapar insectos.' },
  { id: 'jabali', icon: 'boar', title: 'Jabalí', cat: 'Animales', text: 'Busca raíces y bellotas removiendo la tierra con el hocico. Es mejor verlo de lejos.' },
  { id: 'basajaun', icon: 'basajaun', title: 'Basajaun', cat: 'Leyendas', text: 'En las leyendas es el señor del bosque: un ser grande y peludo que protege los rebaños. Es tradición oral, no un animal real.' },
  { id: 'lamia', icon: 'lamia', title: 'Lamia', cat: 'Leyendas', text: 'Las lamias de las leyendas viven junto al agua y se peinan con peines de oro. Algunas historias dicen que tienen patas de pato.' },
  { id: 'eguzkilore', icon: 'eguzkilore', title: 'Eguzkilore', cat: 'Leyendas', text: '"Flor del sol". Es el cardo silvestre que se cuelga en las puertas: según la tradición, protege la casa de los malos espíritus.' },
  { id: 'pottoka', icon: 'horse', title: 'Pottoka', cat: 'Animales', text: 'Caballito de monte, pequeño y fuerte, que vive en libertad en las sierras del Pirineo occidental.' },
];

export const SPECIES_OBS = {
  corzo: 'Corzo', ciervo: 'Ciervo', ardilla: 'Ardilla roja', pito: 'Pito negro', buitre: 'Buitre leonado', trucha: 'Trucha', jabali: 'Jabalí',
};

// Preguntas (algunas adaptadas de los capítulos rurales del proyecto)
export const QUIZ = [
  { q: '¿Por qué los tejados de Ochagavía son tan inclinados?', a: ['Para que resbale la nieve', 'Para que suban los gatos', 'Porque es más bonito'], ok: 0, why: 'La nieve pesa mucho: con tanta inclinación resbala y no hunde el tejado.' },
  { q: '¿Qué dos ríos se juntan en Ochagavía?', a: ['Ebro y Arga', 'Anduña y Zatoya', 'Irati y Bidasoa'], ok: 1, why: 'El Anduña y el Zatoya se unen en el pueblo y forman el río Salazar.' },
  { q: '¿Qué oficio ayuda a conocer el Artzai Eguna (día del pastor)?', a: ['La alfarería', 'El pastoreo', 'La carpintería'], ok: 1, why: 'Es la fiesta del pastoreo: el perro ayuda al pastor a conducir el rebaño.' },
  { q: 'Quieres conocer un producto de cercanía. ¿Qué preguntas?', a: ['¿Quién lo hace y dónde?', '¿Cuál tiene el envase más grande?', '¿Cuál sale primero en el escaparate?'], ok: 0, why: 'Conocer a quien produce y dónde te ayuda a elegir y a descubrir su oficio.' },
  { q: '¿De qué animal es la leche del queso del Pirineo navarro?', a: ['De cabra', 'De oveja', 'De vaca'], ok: 1, why: 'Los quesos de Roncal o Idiazabal se hacen con leche de oveja.' },
  { q: '¿Qué árboles forman la Selva de Irati?', a: ['Palmeras y olivos', 'Hayas y abetos', 'Pinos y cactus'], ok: 1, why: 'Irati es un gran hayedo-abetal, de los mejor conservados de Europa.' },
  { q: '¿Qué significa "Egun on"?', a: ['Buenas noches', 'Buenos días', 'Hasta luego'], ok: 1, why: '"Egun on" es "buenos días" en euskera.' },
  { q: 'Si ves un corzo en el bosque, ¿qué haces?', a: ['Corro hacia él', 'Lo observo despacio y en silencio', 'Le grito para que me mire'], ok: 1, why: 'Respetar su espacio es lo más importante: así no se asusta.' },
  { q: '¿Qué se cuelga en las puertas para proteger la casa?', a: ['Una herradura de oro', 'Un eguzkilore', 'Una campana'], ok: 1, why: 'El eguzkilore, la "flor del sol", es un cardo silvestre protector.' },
  { q: '¿Cuántos danzantes bailan en Muskilda con el Bobo?', a: ['Cuatro', 'Ocho', 'Veinte'], ok: 1, why: 'Son ocho danzantes, acompañados por el Bobo.' },
];

// Ubicaciones de los eguzkilores escondidos (x, z)
export const EGUZKILORES = [
  [-92, -60], [58, 22], [-30, 70], [120, -90], [165, 20], [-190, -40], [-260, 70], [-150, -150],
  [40, -230], [-90, -300], [150, -300], [-20, -440],
];
