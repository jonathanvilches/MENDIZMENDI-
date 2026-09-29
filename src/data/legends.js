// Leyendas que sólo se viven de noche. Cada una tiene quien la cuenta (de día, en el pueblo),
// un relato por partes, pistas que se encienden al anochecer y un encuentro final en su guarida.
// Los textos adaptan la mitología vasco-navarra para niños y niñas de 7 a 11 años.
export const LEGENDS = {
  basajaun: {
    creature: 'Basajaun', lair: 'forest', clueKind: 'footprint', color: '#b6ff9a',
    teller: { name: 'Aitona Patxi, pastor', look: { txapela: '#1d1d24', shirt: '#efe9dc', vest: '#2d2b33', pants: '#3a3530', staff: true, hair: '#d6d0c6', moustache: '#ece8e0', old: true } },
    story: [
      'Acércate, que esto no se cuenta a cualquiera… Hace muchos, muchos años, cuando el bosque de Baztan era tan espeso que no entraba la luz, allí vivía el Basajaun, el Señor del Bosque.',
      'Dicen que es alto como dos hombres, cubierto de pelo hasta los pies, con barba larga y un bastón de roble. Nunca hace daño a quien respeta el monte.',
      'Cuando se acerca una tormenta, grita desde las cumbres para que los pastores recojamos el rebaño. Por eso, si de noche oyes los cencerros sonar todos a la vez… es que él anda cerca.',
      'Pero sólo sale cuando cae la noche. De día se esconde entre las hayas, y ni el mejor cazador ha visto nunca su cueva.',
    ],
    wait: 'Esta noche los cencerros sonaban raro… Si esperas a que oscurezca, quizá encuentres sus huellas.',
    night: 'Mira hacia el bosque. ¿Ves esas huellas que brillan? Síguelas en silencio… y no tengas miedo: sólo quiere saber si eres de fiar.',
    clues: [
      { text: 'Una huella enorme en el barro. Tiene cinco dedos… y es tres veces más grande que tu pie.' },
      { text: 'En la corteza de un haya hay un mechón de pelo largo y oscuro. Huele a musgo y a lluvia.' },
      { text: 'Un cordero perdido duerme tranquilo junto a una piedra. Alguien lo ha tapado con helechos para que no pase frío.' },
      { text: 'Se oye un silbido largo entre los árboles… y todos los cencerros del valle suenan a la vez.' },
    ],
    meet: [
      'Hmmm… Llevo siglos cuidando este bosque y pocos se atreven a seguir mis huellas de noche.',
      'Los humanos aprendisteis de nosotros a sembrar el trigo y a hacer sierras mirando el borde de la hoja del castaño. Os lo enseñamos a cambio de una promesa: cuidar el monte.',
      'Tú has sido valiente y has tratado bien a mis corderos. Llévate esta historia y cuéntala: mientras alguien la recuerde, el bosque seguirá vivo.',
    ],
    card: 'Basajaun, el Señor del Bosque, protege los rebaños y avisa de las tormentas. Según la leyenda, enseñó a los humanos a sembrar el trigo.',
  },
  lamia: {
    creature: 'Lamia de Xorroxin', lair: 'river', clueKind: 'comb', color: '#9ff3ff',
    teller: { name: 'Maddi, lavandera', look: { shirt: '#c9d8e6', apron: '#ffffff', skirt: '#3a4a6a', pants: '#3a4a6a', hair: '#6b3b1f', bun: true, female: true, basket: true } },
    story: [
      '¿Sabes por qué nadie lava la ropa en el río cuando se pone el sol? Por las lamiak.',
      'Las lamiak viven en los ríos, en las fuentes y en la cascada de Xorroxin. Son como mujeres de pelo de oro… pero con pies de pato.',
      'Las noches de luna se sientan en las piedras y se peinan con peines de oro, cantando tan bonito que el agua se para a escuchar.',
      'Dice mi amona que esta semana la lamia perdió sus peines en la corriente. Si los encuentras, devuélveselos. Una lamia nunca olvida a quien es honrado… ni a quien se queda lo que no es suyo.',
    ],
    wait: 'Ahora el río sólo es río. Las lamiak salen cuando la luna se refleja en el agua. Espera a la noche.',
    night: 'La luna ya está en el agua. Escucha… ¿oyes esa canción? Busca los destellos dorados a lo largo del río.',
    clues: [
      { text: 'Un peine de oro entre los juncos, todavía mojado. Tiene grabadas unas olas pequeñitas.' },
      { text: 'Otro peine, sobre una piedra plana. A su lado, en el barro, hay huellas de pies de pato.' },
      { text: 'El tercer peine brilla bajo el agua. Al cogerlo, la canción suena más cerca… muy cerca.' },
    ],
    meet: [
      '¡Mis peines! Los buscaba desde la luna llena. Muchos los habrían guardado para ellos, porque son de oro…',
      'Pero tú me los has traído. Las lamiak ayudamos a quien es honrado: esta noche el río cuidará tus pasos y tus campos tendrán agua fresca.',
      'Ahora vete a casa antes de que cante el gallo. Cuando el gallo canta, las lamiak volvemos al agua… y nadie puede vernos hasta la próxima luna.',
    ],
    card: 'Las lamiak viven en ríos y fuentes, tienen pies de pato y se peinan con peines de oro. La leyenda premia a quien es honrado y devuelve lo que no es suyo.',
  },
  sorgina: {
    creature: 'La curandera de la cueva', lair: 'cave', clueKind: 'herb', color: '#ffd27a',
    teller: null,
    story: [
      'La noche de San Juan es la más corta del año. Esa noche, en Zugarramurdi, se encendían hogueras y se cogían hierbas que curan.',
      'Hace más de cuatrocientos años, en 1610, mucha gente de este pueblo fue acusada de ser sorginak, brujas. Eran vecinas y vecinos que sabían de hierbas, pastores, abuelas… gente inocente.',
      'Las sorginak de las leyendas no son como las de los cuentos de miedo: son las que conocían el monte y sus secretos.',
      'Dicen que en la noche de San Juan todavía se ve una luz en la cueva: la de una curandera que enseña las hierbas a quien se atreve a buscarlas. Pero sólo de noche.',
    ],
    wait: 'Las hierbas de San Juan se cogen de noche, con el rocío. Espera a que oscurezca.',
    night: 'Ya ha anochecido. Busca las hierbas que brillan camino de la cueva… y no te asustes si ves una luz dentro.',
    clues: [
      { text: 'Eguzkilore, la flor del sol. Se cuelga en la puerta de casa para que no entren los malos espíritus.' },
      { text: 'Hierba de San Juan, de flores amarillas. Con ella se hacían ungüentos para las heridas.' },
      { text: 'Un ramo de helecho y romero atado con un lazo rojo. Alguien lo ha dejado aquí para ti.' },
      { text: 'Junto a la entrada de la cueva, las brasas de una hoguera todavía calientes…' },
    ],
    meet: [
      'Pasa, pasa. No soy la bruja de los cuentos: soy una curandera. Sé qué hierba calma la tos y cuál cura una herida.',
      'En 1610 nos llamaron brujas por saber cosas que otros no entendían. Por eso esta cueva guarda una lección: nunca acuses a nadie sin conocerle.',
      'Guarda estas hierbas y esta historia. Y cuelga un eguzkilore en tu puerta: que la luz del sol te acompañe también de noche.',
    ],
    card: 'En 1610 muchas personas de Zugarramurdi fueron acusadas injustamente de brujería. Las sorginak de las leyendas conocían las hierbas y los secretos del monte.',
  },
  roldan: {
    creature: 'La sombra del caballero', lair: 'forest', clueKind: 'horn', color: '#c9d4ff',
    teller: null,
    story: [
      'Escucha la canción del juglar… En el año 778, el gran ejército de Carlomagno cruzó estos montes. Los vascones esperaban escondidos en el puerto de Ibañeta.',
      'La retaguardia, al mando del caballero Roldán, quedó atrapada entre las hayas. Roldán sopló su olifante, un cuerno de marfil, para pedir ayuda… pero nadie llegó a tiempo.',
      'Siglos después, la historia se hizo canción: el Cantar de Roldán. Y dicen los peregrinos que, en las noches de niebla, todavía se oye el cuerno sonar entre los árboles.',
      'El olifante se rompió en pedazos. Si los reúnes esta noche… quizá oigas su última nota.',
    ],
    wait: 'De día sólo se oyen los pájaros. La niebla y el cuerno llegan con la noche.',
    night: 'Ya cae la niebla sobre Ibañeta. Busca los pedazos del olifante que brillan en el bosque.',
    clues: [
      { text: 'Un trozo de marfil tallado con hojas de roble. Suena hueco al tocarlo.' },
      { text: 'La boquilla del cuerno. Al soplar, se oye un eco lejano que no es tuyo…' },
      { text: 'El último pedazo, junto a una piedra con una cruz grabada. La niebla se mueve sola.' },
    ],
    meet: [
      'Nadie había reunido mi olifante en mil años… Soplé con todas mis fuerzas en este bosque.',
      'Aquí aprendí que estas montañas tienen dueños: la gente que vive en ellas. Nadie cruza el Pirineo sin respetarla.',
      'Que el cuerno suene ahora para contar la historia, no para la guerra. Ve en paz, peregrino.',
    ],
    card: 'En el año 778 los vascones vencieron en Orreaga a la retaguardia de Carlomagno. La historia se convirtió en el Cantar de Roldán.',
  },
};
// Carnaval nocturno: los momotxorros de Altsasu salen al caer la tarde del martes de carnaval
export const NIGHT_CARNIVAL = {
  momotxorro: {
    story: [
      'El martes de carnaval, en Altsasu, cuando empieza a oscurecer, se oye un ruido que pone la piel de gallina: ¡cencerros!',
      'Son los momotxorros. Llevan cuernos de toro en la cabeza, una cesta a la espalda, pieles de oveja y una horca de madera en la mano. Su ropa blanca está manchada de rojo.',
      'Saltan, gritan y persiguen a la gente entre las casas. Nadie sabe bien de dónde viene esta costumbre: es tan antigua como el valle de Sakana.',
      'Pero sólo salen de noche. De día… ni rastro.',
    ],
    wait: 'Todavía es de día. Los momotxorros esperan a que oscurezca para salir. ¿Esperamos?',
    night: '¡Ya es de noche! Escucha los cencerros… Hay tres momotxorros escondidos por el pueblo.',
  },
};
