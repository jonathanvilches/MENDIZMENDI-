// Más yacimientos de Navarra: crómlech, menhires, cuevas de la Edad de Hielo, poblados, ciudades y villas romanas.
// Datos: Gobierno de Navarra, Museo de Navarra, Sociedad de Ciencias Aranzadi (Munibe), Trabajos de Arqueología Navarra,
// Universidad de Navarra (Cátedra de Patrimonio) y las guías de cada sitio, resumidos para niños y niñas. Las personas que
// los cuentan y sus diálogos son ficción del juego.
// Cada clase de yacimiento (TIPO) trae lo que es, dos hallazgos que se encuentran en todos, cómo se hacía, y el antes y el
// ahora; cada yacimiento pone su historia, su hallazgo propio y su pregunta, y lo que cambie de su clase.
// town: el pueblo o el bosque del juego donde está su misión (el más cercano al sitio de verdad) · lat, lon: su punto en el
// mapa, aproximado · landmark: el monumento que se levanta en el juego (src/world/monuments.js) · lm: lo que cambia en él
// (en Pamplona, su sitio: la plaza libre al sur de la catedral, donde están de verdad el foro y las termas)
const H = (name, look) => ({ name, look });
const ARQUEO = { shirt: '#c9a46a', vest: '#4a5a3a', pants: '#5a4a3a', hair: '#3b2418', ponytail: true, female: true, hat: 'straw', bag: '#7a5a3a' };
const ARQUEOLOGO = { shirt: '#8a9a6a', vest: '#5a4a3a', pants: '#4a4238', hair: '#2a1a12', beard: '#2a1a12', hat: 'straw', bag: '#7a5a3a' };
const GUIA = { shirt: '#3a6a8a', vest: '#2a3a4a', pants: '#3a3530', hair: '#6b3b1f', bun: true, female: true };
const MONTE = { shirt: '#d9532a', vest: '#2b3a4a', pants: '#3a3530', hair: '#4a3020', ponytail: true, female: true, staff: true };
const CUEVA = { shirt: '#e0b43a', vest: '#5a4a3a', pants: '#3a3a3a', hair: '#1f1712', ponytail: true, female: true, bag: '#6a5a3a' };
const PASTORA = { shirt: '#7a3a3a', vest: '#2d2b33', pants: '#3a3530', hair: '#3b2418', ponytail: true, female: true, staff: true };

const TIPO = {
  cromlech: {
    whatTitle: 'El crómlech', icon: 'cromlech', landmark: 'cromlech', where: 'en el círculo de piedras',
    what: 'Un crómlech es un círculo de piedras clavadas en el suelo. En euskera se llama harrespil o jentilbaratz, «el huerto de los gentiles». Los pastores de hace entre 2.000 y 3.000 años quemaban a sus muertos en una hoguera y guardaban un poco de las cenizas en el centro del círculo.',
    finds: [
      ['charcoal', 'Carboncillos', 'Trocitos de carbón de la hoguera. En el laboratorio se puede saber cuántos años tienen.'],
      ['shard', 'Trozo de vasija', 'A veces, junto a las cenizas, aparece un trozo de vasija de barro. Casi nunca hay más: el crómlech era una tumba sencilla.'],
      ['stone', 'Una piedra del círculo', 'Las piedras no están labradas: son lajas del propio monte, clavadas de pie una junto a otra. Casi todos los círculos son pequeños.'],
    ],
    stepsTitle: 'Así se hacía un crómlech',
    steps: ['Elegir un rellano en lo alto del monte, cerca de los pastos', 'Clavar piedras en el suelo formando un círculo', 'Quemar al difunto en una hoguera, en otro lugar', 'Guardar un poco de las cenizas en el centro', 'Tapar el hoyo con tierra y piedras'],
    nowTitle: 'Los pastores del monte',
    then: 'Hace miles de años, los pastores subían en verano con sus rebaños a los pastos altos, como ahora. Allí, en los collados y en las cimas, levantaban los crómlech, a menudo muchos juntos.',
    now: 'Muchos siguen en su sitio, entre la hierba y los helechos, y a veces cuesta verlos. Están protegidos: no se puede mover ninguna piedra. Hay crómlech en los montes del norte de Navarra, de Lesaka al Pirineo.',
    hostDone: '¡Qué buen trabajo! Ahora ya sabemos para qué servía el círculo. ¿Cómo crees que lo hacían?',
  },
  menhir: {
    whatTitle: 'El menhir', icon: 'monolith', landmark: 'menhir', where: 'alrededor del menhir',
    what: 'Un menhir es una piedra larga clavada de pie en el suelo. En euskera se llama zutarri, «piedra de pie». Son muy antiguos, de hace miles de años, y no son tumbas: quizá marcaban caminos, límites entre pastos o lugares importantes para la gente del monte.',
    finds: [
      ['wedge', 'Piedras de calzo', 'Piedras más pequeñas metidas alrededor de la base para que el menhir no se cayera.'],
      ['flint', 'Lasca de sílex', 'Un trocito de sílex que saltó al tallar una herramienta. Dice que por aquí pasaba gente.'],
    ],
    stepsTitle: 'Así se levantaba un menhir',
    steps: ['Elegir una piedra larga en el monte', 'Llevarla rodando sobre troncos', 'Cavar un hoyo donde iba a ir', 'Ponerla de pie con cuerdas y palancas', 'Calzarla con piedras para que no se cayera'],
    nowTitle: 'Piedras que marcan el camino',
    then: 'Los menhires están en collados y caminos del monte, por donde pasaban los pastores con sus rebaños. Para la gente que vino después eran piedras misteriosas, y por eso tienen leyendas de gentiles y de gigantes.',
    now: 'Algunos se han caído o los han dañado, y los arqueólogos los cuidan y los estudian. Están protegidos como los dólmenes: no se pueden mover.',
    hostDone: '¡Bien hecho! Ahora piensa: ¿cómo pondrías de pie una piedra tan grande sin máquinas?',
  },
  cueva: {
    whatTitle: 'Una cueva de cazadores', icon: 'cave', landmark: 'cueva', where: 'en la entrada de la cueva',
    what: 'Hace muchísimos años, en la Edad de Hielo, en Navarra hacía mucho más frío que ahora. Los cazadores del Paleolítico no tenían casas ni campos: seguían a los animales y se refugiaban en la entrada de las cuevas, junto al fuego. Allí dejaron sus herramientas, los huesos de lo que comían y, a veces, dibujos.',
    finds: [
      ['flint', 'Herramienta de sílex', 'Con lascas de sílex muy afiladas cortaban la carne, raspaban las pieles y tallaban el hueso.'],
      ['needle', 'Aguja de hueso', 'Con agujas de hueso cosían pieles para hacerse ropa de abrigo.'],
    ],
    stepsTitle: 'Así se excava una cueva',
    steps: ['Marcar el suelo con cuerdas en cuadrículas', 'Quitar la tierra capa a capa: cuanto más abajo, más antigua', 'Cribar la tierra para no perder nada', 'Iluminar las paredes buscando dibujos', 'Llevar las muestras al laboratorio para saber su edad'],
    nowTitle: 'Cazadores de la Edad de Hielo',
    then: 'Cazaban ciervos, caballos, bisontes y cabras montesas, y conocían muy bien el monte: dónde había agua, por dónde pasaban los animales y dónde refugiarse.',
    now: 'Las cuevas con restos tan antiguos son muy frágiles: solo entran los equipos de investigación, y lo que encuentran se estudia y se enseña en el Museo de Navarra.',
    hostDone: '¡Eres un gran equipo de excavación! ¿Recuerdas cómo se trabaja en una cueva?',
  },
  poblado: {
    whatTitle: 'Un poblado de la Edad del Hierro', icon: 'castro', landmark: 'castro', where: 'entre las casas del poblado',
    what: 'Hace unos 2.700 años la gente ya sabía trabajar el metal. Vivían en poblados en lo alto de un cerro, con las casas pegadas unas a otras y una muralla alrededor para defenderse. Cultivaban cereal, criaban ovejas y cabras y tejían la lana.',
    finds: [
      ['quern', 'Molino de mano', 'Dos piedras redondas: girando la de arriba se molía el grano para hacer harina. Cada casa tenía el suyo.'],
      ['loomweight', 'Pesa de telar', 'Una pieza de barro con un agujero. Colgaba de los hilos del telar para tensarlos mientras se tejía la lana.'],
    ],
    stepsTitle: 'Así se hacía una casa del poblado',
    steps: ['Hacer un zócalo de piedra en el suelo', 'Levantar las paredes con adobes: barro y paja secados al sol', 'Poner vigas de madera para el tejado', 'Cubrir el tejado con ramas, barro y paja', 'Hacer el hogar en el centro de la casa'],
    nowTitle: 'Un día en el poblado',
    then: 'Dentro de casa estaban el hogar para cocinar y calentarse, bancos de barro para sentarse y dormir, y silos y vasijas para guardar el grano.',
    now: 'De aquellas casas quedan los zócalos de piedra. En algunos yacimientos se ha reconstruido una casa, una torre o un trozo de muralla para ver cómo eran.',
    hostDone: '¡Muy bien! Con lo que has encontrado ya sabemos cómo vivían. ¿Me ayudas a levantar una casa?',
  },
  romana: {
    whatTitle: 'Una ciudad romana', icon: 'column', landmark: 'romana', where: 'entre las ruinas',
    what: 'Hace unos 2.000 años los romanos llegaron a Navarra y construyeron ciudades con calles rectas, un foro, que era la plaza principal con templos y tiendas, termas, que eran baños públicos, y traídas de agua. Los vascones siguieron viviendo en ellas y muchos aprendieron el latín, la lengua de Roma.',
    finds: [
      ['coin', 'Moneda romana', 'Lleva la cara del emperador. Las monedas ayudan a saber en qué años se usaba cada casa.'],
      ['sigillata', 'Terra sigillata', 'La vajilla fina de los romanos: platos y cuencos de barro rojo y brillante, a veces con dibujos y con el sello del alfarero.'],
    ],
    stepsTitle: 'Así se hacía una ciudad romana',
    steps: ['Trazar dos calles principales que se cruzan', 'Hacer el foro, la gran plaza, en el cruce', 'Traer el agua desde un río o un manantial', 'Construir las termas y las casas', 'Unir la ciudad con las demás por calzadas'],
    nowTitle: 'Las ciudades romanas de Navarra',
    then: 'Por las calzadas viajaban soldados, comerciantes y carros. En el foro se compraba, se votaba y se rezaba a los dioses de Roma.',
    now: 'De muchas ciudades quedan los cimientos de las casas, las columnas y los suelos. Andelos, Santa Criz y Cara se pueden visitar; de Pompaelo, debajo de Pamplona, se han encontrado calles, termas y el foro.',
    hostDone: '¡Estupendo! Ahora ya sabes cómo trabajamos. ¿Sabrías cómo se hacía una ciudad romana?',
  },
  villa: {
    whatTitle: 'Una villa romana', icon: 'mosaic', landmark: 'villa', where: 'en las habitaciones de la villa',
    what: 'Una villa romana era una gran casa en el campo, con sus tierras, sus bodegas y sus almacenes. Allí vivía una familia rica con la gente que trabajaba para ella. Las mejores habitaciones tenían suelos de mosaico: dibujos hechos con miles de piedrecitas de colores.',
    finds: [
      ['tesela', 'Teselas', 'Las piedrecitas de colores de los mosaicos. Se cortaban a mano, casi todas del mismo tamaño.'],
      ['lucerna', 'Lucerna', 'Una lamparilla de barro: se llenaba de aceite de oliva y se encendía una mecha por el agujero.'],
    ],
    stepsTitle: 'Así se hacía un mosaico',
    steps: ['Dibujar el diseño', 'Cortar las piedras en teselas pequeñas', 'Preparar una cama de mortero en el suelo', 'Colocar las teselas una a una siguiendo el dibujo', 'Rellenar las juntas y pulir el suelo'],
    nowTitle: 'La vida en la villa',
    then: 'En la villa se hacía vino y aceite, se guardaba el grano y se criaban animales. Los dueños recibían a sus invitados en salones con mosaicos.',
    now: 'Muchos mosaicos de Navarra se arrancaron con cuidado para protegerlos y hoy se ven en los museos, como el Museo de Navarra, en Pamplona.',
    hostDone: '¡Qué bien excavas! ¿Te atreves con un mosaico?',
  },
};

// [tipo, id, datos propios]
const SITIOS = [
  ['cromlech', 'agina', { town: 'lesaka', lat: 43.285, lon: -1.745, title: 'Los crómlech de Agiña', lugar: 'Monte Agiña, Lesaka',
    host: H('Garazi, guía de Agiña', GUIA),
    intro: ['¡Kaixo! Soy guía en el monte Agiña, en Lesaka.', 'Alrededor de la cima hay más de cien crómlech: círculos de piedras que levantaron los pastores hace entre 2.000 y 3.000 años. También hay dólmenes, túmulos y un menhir.', 'Junto a ellos, el escultor Jorge Oteiza hizo en 1959 una estela para recordar al músico Aita Donostia. ¿Me ayudas a estudiar uno de los círculos?'],
    q: { q: '¿Cómo se llama el crómlech en euskera?', options: ['Harrespil o jentilbaratz', 'Txistu', 'Txapela'], answer: 0, why: 'Jentilbaratz quiere decir «huerto de los gentiles»: la gente pensaba que eran obra de los gentiles, los gigantes de las leyendas.' } }],
  ['cromlech', 'azpegi', { town: 'aribe', lat: 43.03, lon: -1.23, title: 'Los crómlech de Azpegi', lugar: 'Collado de Azpegi, Orbaizeta',
    host: H('Iker, guarda de Aezkoa', { ...ARQUEOLOGO, shirt: '#5a6a3a' }),
    intro: ['¡Kaixo! Trabajo en los montes de Aezkoa, junto a la selva de Irati.', 'En el collado de Azpegi, cerca de la ermita de Aramuño, hay dólmenes y crómlech: tumbas de los pastores de hace miles de años, en los mismos pastos donde hoy suben las vacas y las yeguas.', 'Vamos a estudiar un crómlech. ¡Despacio, que las piedras apenas asoman entre la hierba!'],
    q: { q: '¿Por qué hay crómlech en los collados y en las cimas?', options: ['Porque allí estaban los pastos de verano de los pastores', 'Porque allí no llovía nunca', 'Porque eran torres para vigilar'], answer: 0, why: 'Los pastores subían en verano con sus rebaños a los pastos altos y levantaban los crómlech cerca de ellos.' } }],
  ['menhir', 'irunarri', { town: 'leitza', lat: 43.09, lon: -1.8, title: 'El menhir de Iruñarri', lugar: 'Alto de Ezkurra, entre Leitza y Doneztebe',
    host: H('Ane, montañera', MONTE),
    intro: ['Hola, soy montañera y me encantan las piedras con historia.', 'Cerca del alto de Ezkurra hay un menhir llamado Iruñarri. Dicen que su nombre viene de «Irudiarri», la piedra de la imagen, porque su sombra en el suelo parece la de una persona.', 'Lo dio a conocer J. M. Sansinenea en 1935 y lo estudió José Miguel de Barandiarán. ¿Buscamos alrededor de su base?'],
    find: ['shadow', 'La sombra de la piedra', 'Con el sol, la sombra del menhir dibuja en el suelo algo parecido a una figura humana. Por eso lo llaman la piedra de la imagen.'],
    q: { q: '¿Qué quiere decir zutarri, la palabra vasca para menhir?', options: ['Piedra de pie', 'Piedra de agua', 'Piedra de fuego'], answer: 0, why: 'Zut es «de pie» y harri, «piedra»: el menhir es una piedra clavada de pie.' } }],
  ['cueva', 'alkerdi', { town: 'zugarramurdi', lat: 43.26, lon: -1.51, title: 'Los bisontes de Alkerdi', lugar: 'Cueva de Alkerdi, Urdazubi/Urdax',
    host: H('Uxue, espeleóloga', CUEVA), lmName: 'Cueva de Alkerdi',
    intro: ['Hola, soy espeleóloga: exploro cuevas con casco y linterna.', 'A un paso de aquí, en Urdazubi, está la cueva de Alkerdi. Es la única de Navarra con grabados del Paleolítico: dibujos hechos en la roca hace más de 15.000 años.', 'En 2014 apareció una galería escondida con una veintena de grabados, casi todos bisontes. ¿Me ayudas a buscar en la entrada?'],
    find: ['bison', 'El grabado de un bisonte', 'En la roca, unas rayas finas dibujan la joroba y los cuernos de un bisonte. Se grabó con una punta de sílex, en la Edad de Hielo.'],
    q: { q: '¿Con qué grababan los dibujos en la roca?', options: ['Con una punta de sílex', 'Con un clavo de hierro', 'Con un pincel de pelo'], answer: 0, why: 'En el Paleolítico no había metales: rayaban la roca con puntas de sílex. Para pintar usaban ocre rojo y carbón.' } }],
  ['cueva', 'abauntz', { town: 'bosque-orgi', lat: 42.985, lon: -1.635, title: 'El mapa de Abauntz', lugar: 'Cueva de Abauntz, Arraitz-Orkin (Ultzama)',
    host: H('Amaia, arqueóloga', ARQUEO), lmName: 'Cueva de Abauntz',
    intro: ['¡Kaixo! Soy del equipo que excava en la cueva de Abauntz, aquí al lado, en Ultzama.', 'Durante unos 50.000 años mucha gente se refugió en ella: los neandertales, los cazadores de la Edad de Hielo, los pastores y hasta los romanos.', 'Aquí apareció una piedra con un mapa grabado hace unos 13.600 años: ¡uno de los mapas más antiguos de Europa! Y en 2026 se presentaron los primeros restos de un neandertal de Navarra: huesos de una mano de hace unos 46.000 años.', '¿Me ayudas a buscar en la entrada?'],
    find: ['mapstone', 'La piedra del mapa', 'Un bloque de piedra con rayas grabadas: son los montes, los ríos y las charcas del paisaje de alrededor. Hoy se guarda en el Museo de Navarra.'],
    q: { q: '¿Qué grabaron en la piedra de Abauntz hace unos 13.600 años?', options: ['El paisaje: montes, ríos y charcas', 'Un castillo', 'Un barco'], answer: 0, why: 'Es un mapa del paisaje de alrededor, hecho por cazadores de la Edad de Hielo. Quizá les servía para recordar y contar por dónde moverse.' } }],
  ['poblado', 'altocruz', { town: 'cortes', lat: 41.93, lon: -1.41, title: 'El poblado del Alto de la Cruz', lugar: 'Cerro de la Cruz, Cortes',
    host: H('Mikel, arqueólogo', ARQUEOLOGO),
    intro: ['Hola, soy arqueólogo. Estudio el poblado del Alto de la Cruz, en un cerro junto a Cortes.', 'Aquí vivió gente durante más de 700 años: desde el final de la Edad del Bronce, hacia el año 1100 antes de Cristo, hasta la Edad del Hierro.', 'Las casas eran de adobe sobre un zócalo de piedra y se rehicieron muchas veces, una encima de otra. ¿Me ayudas a excavar una?'],
    find: ['hearth', 'El hogar', 'Un círculo de barro endurecido por el fuego en el centro de la casa: aquí se cocinaba y se calentaba la familia.'],
    q: { q: '¿De qué eran las paredes de las casas del Alto de la Cruz?', options: ['De adobe: barro y paja secados al sol', 'De ladrillo y cemento', 'De troncos de pino'], answer: 0, why: 'El adobe se hacía con barro, paja y agua en moldes, y se secaba al sol. En la Ribera, con mucho barro, se construía así.' } }],
  ['poblado', 'eretas', { town: 'artajona', lat: 42.527, lon: -1.834, title: 'El poblado de Las Eretas', lugar: 'Las Eretas, Berbinzana',
    host: H('Leire, guía del museo', GUIA),
    intro: ['¡Hola! Soy guía del museo de Las Eretas, en Berbinzana, a orillas del Arga.', 'Este poblado se fundó hace unos 2.700 años y tenía una muralla con torres. Las casas eran rectangulares y daban a una calle con una pequeña plaza empedrada.', 'Se descubrió por casualidad en 1991, al preparar el terreno para unas instalaciones deportivas. ¿Excavamos?'],
    find: ['stone', 'Piedra de la muralla', 'La muralla se hizo con piedra y adobe. Hoy se han vuelto a levantar una torre, un trozo de muralla y una casa amueblada para ver cómo vivían.'],
    q: { q: '¿Cómo se descubrió el poblado de Las Eretas?', options: ['Por casualidad, al hacer unas obras', 'Lo vio un pastor desde un avión', 'Estaba en un mapa antiguo'], answer: 0, why: 'En 1991, al preparar el terreno para unas instalaciones deportivas, aparecieron los muros. Desde entonces se excava y se estudia.' } }],
  ['poblado', 'custodia', { town: 'viana', lat: 42.5, lon: -2.34, title: 'La Custodia, la ciudad de los berones', lugar: 'La Custodia, Viana',
    host: H('Unai, arqueólogo', ARQUEOLOGO),
    whatTitle: 'Una ciudad de los berones', card: 'La Custodia',
    what: 'Hace más de 2.100 años, en el cerro de La Custodia hubo una gran ciudad de los berones, un pueblo celtíbero. Hacía sus propias monedas, con el nombre de la ciudad: Uarakos. Es la ciudad anterior a los romanos más importante de Navarra.',
    intro: ['Hola, soy arqueólogo y excavo cada verano en La Custodia, junto a Viana.', 'En este cerro hubo una ciudad grande, con casas, calles y murallas, que comerciaba con todo el valle del Ebro.', 'Aquí han aparecido monedas, fíbulas para sujetar la ropa y nueve téseras de hospitalidad: ¡muchas más que en otros yacimientos! ¿Buscamos?'],
    finds: [
      ['coin', 'Moneda de Uarakos', 'Una moneda de bronce hecha aquí, con letras celtibéricas que dicen el nombre de la ciudad.'],
      ['tessera', 'Tésera de hospitalidad', 'Una pieza pequeña de bronce, a veces con forma de animal o de dos manos que se dan. Era como un contrato de amistad: quien la llevaba sería bien recibido en otra ciudad.'],
      ['sling', 'Proyectil de honda', 'Una bala de plomo o de piedra que se lanzaba con una honda. Habla de las guerras que acabaron con la ciudad.'],
    ],
    stepsTitle: 'Así se hacía una moneda',
    steps: ['Fundir el bronce en un crisol', 'Echarlo en moldes para hacer discos', 'Calentar el disco', 'Ponerlo entre dos cuños con los dibujos', 'Golpear fuerte con un martillo'],
    nowTitle: 'La Custodia hoy',
    then: 'Hacia el siglo I antes de Cristo la ciudad fue destruida, quizá en las guerras sertorianas, una guerra entre romanos, y sus vecinos se fueron a vivir a otros lugares.',
    now: 'Desde 2018 se excava cada año, y en 2023 el Gobierno de Navarra propuso declararla Bien de Interés Cultural para protegerla mejor.',
    q: { q: '¿Para qué servía una tésera de hospitalidad?', options: ['Para ser bien recibido como amigo en otra ciudad', 'Para pagar en el mercado', 'Para jugar a los dados'], answer: 0, why: 'Era la prueba de un pacto de amistad entre personas o ciudades: quien la llevaba tenía casa y ayuda allí donde la enseñara.' } }],
  ['romana', 'pompaelo', { town: 'pamplona', lat: 42.818, lon: -1.643, title: 'Pompaelo, la Pamplona romana', lugar: 'La Navarrería, Pamplona', lm: { x: 127, z: -160, cata: true },
    host: H('Nerea, arqueóloga de la ciudad', ARQUEO),
    intro: ['Hola, soy arqueóloga. Debajo de las calles de la Navarrería hay otra ciudad: Pompaelo.', 'La fundó el general romano Pompeyo hacia el año 75 antes de Cristo, junto a un poblado de los vascones, y le puso su nombre.', 'Junto a la catedral se han encontrado sus calles, sus termas y el foro. ¿Buscamos en esta cata?'],
    find: ['brick', 'Ladrillo de las termas', 'En las termas romanas el suelo se apoyaba en columnitas de ladrillo: por debajo pasaba el aire caliente de un horno que calentaba el agua y el suelo.'],
    q: { q: '¿De quién viene el nombre de Pamplona?', options: ['Del general romano Pompeyo', 'De un río llamado Pampa', 'De un rey de Navarra'], answer: 0, why: 'Pompaelo quiere decir «la ciudad de Pompeyo». Con los siglos el nombre cambió hasta Pamplona. En euskera se llama Iruña, «la ciudad».' } }],
  ['romana', 'andelos', { town: 'puente-la-reina', lat: 42.61, lon: -1.86, title: 'El agua de Andelos', lugar: 'Andelos, Mendigorría', lm: { agua: true },
    host: H('Jon, guía de Andelos', { ...ARQUEOLOGO, shirt: '#3a6a8a', beard: null }),
    intro: ['¡Kaixo! Trabajo en la ciudad romana de Andelos, en Mendigorría, muy cerca de aquí.', 'Lo más asombroso de Andelos es cómo traían el agua: una presa para guardarla, un canal, un gran depósito y un acueducto hasta la ciudad.', 'Plinio, un sabio romano, ya habló de la gente de Andelos. ¿Me ayudas a excavar?'],
    find: ['stone', 'Piedra del canal', 'El agua corría por canales de piedra cubiertos de un mortero muy fino, para que no se escapara ni una gota.'],
    stepsTitle: 'Así llegaba el agua a Andelos',
    steps: ['La presa guarda el agua del arroyo', 'Un canal la lleva hasta el depósito', 'El depósito la guarda y la suelta poco a poco', 'El acueducto la lleva por encima del valle', 'En la ciudad se reparte a fuentes, termas y casas'],
    q: { q: '¿Para qué hicieron los romanos la presa de Andelos?', options: ['Para guardar agua y llevarla a la ciudad', 'Para pescar truchas', 'Para mover un molino'], answer: 0, why: 'La presa guardaba el agua de un arroyo y, por el canal y el acueducto, llegaba a las fuentes, las termas y las casas de la ciudad.' } }],
  ['romana', 'santacriz', { town: 'sanguesa', lat: 42.56, lon: -1.46, title: 'Santa Criz de Eslava', lugar: 'Santa Criz, Eslava',
    host: H('Itziar, guía de Eslava', GUIA),
    intro: ['Hola, soy guía en Eslava, cerca de Sangüesa. Allí está la ciudad de Santa Criz.', 'Primero fue un poblado amurallado de los vascones. Con los romanos creció y tuvo foro, termas y casas con bodegas para el vino y el aceite.', 'La descubrió un cura, Juan Castrillo, en 1917. ¿Excavamos junto al foro?'],
    find: ['inscription', 'Piedra con letras', 'Aquí han aparecido muchas inscripciones en latín, en pedestales y en tumbas: son de las más numerosas de la tierra de los vascones.'],
    q: { q: '¿En qué lengua están escritas las inscripciones de Santa Criz?', options: ['En latín, la lengua de Roma', 'En euskera de hoy', 'En castellano'], answer: 0, why: 'Los romanos escribían en latín. En pedestales y tumbas se leen los nombres de la gente que vivía allí.' } }],
  ['villa', 'arellano', { town: 'estella', lat: 42.61, lon: -2.04, title: 'La villa de las Musas', lugar: 'Villa romana de Arellano',
    host: H('Maite, guía de Arellano', GUIA),
    intro: ['¡Hola! Te hablo de una villa romana que hay en Arellano, al sur de Estella.', 'En el siglo XIX apareció por casualidad un mosaico con las musas, las diosas de las artes. Por eso se llama la villa de las Musas.', 'Primero fue una gran bodega de vino. Tras un incendio, hacia el año 300, se levantó encima una casa de lujo con mosaicos. ¿Me ayudas?'],
    find: ['shard', 'Trozo de tinaja', 'En las bodegas romanas el vino se guardaba en grandes tinajas de barro. ¡Navarra ya era tierra de vino hace 2.000 años!'],
    q: { q: '¿Qué se hacía en la primera villa de Arellano?', options: ['Vino', 'Hierro', 'Papel'], answer: 0, why: 'Tenía todo lo necesario para pisar la uva, hacer el vino y guardarlo en su bodega.' } }],
  ['villa', 'liedena', { town: 'lumbier', lat: 42.625, lon: -1.27, title: 'La villa romana de Liédena', lugar: 'Liédena, frente a la Foz de Lumbier',
    host: H('Ander, guía de la Foz', { ...ARQUEOLOGO, shirt: '#5a6a3a' }),
    intro: ['Hola, soy guía de la Foz de Lumbier. Justo enfrente, en Liédena, están las ruinas de una gran villa romana.', 'Fue la primera villa romana de España que se excavó, se estudió y se publicó entera, entre 1942 y 1947.', 'Sus mosaicos se arrancaron con cuidado y hoy están en el Museo de Navarra. ¿Buscamos lo que queda?'],
    find: ['trigo', 'Granos de trigo', 'Un gran patio de la villa pudo ser un almacén de grano para dar de comer a los soldados de Roma, muy lejos, en la frontera del norte.'],
    q: { q: '¿Dónde se pueden ver hoy los mosaicos de Liédena?', options: ['En el Museo de Navarra, en Pamplona', 'Siguen al aire libre en la villa', 'En un museo de Roma'], answer: 0, why: 'Se arrancaron al excavar la villa para protegerlos y se llevaron al Museo de Navarra.' } }],
];

// otros yacimientos de Navarra que salen en el mapa: [nombre, lugar, qué es, lat, lon, icono, pueblo de su misión]
export const MAS_YACIMIENTOS = [
  ['Dólmenes de Artajona', 'Artajona', 'El Portillo de Enériz y La Mina, de hace entre 4.000 y 5.000 años, con su túmulo de unos 20 metros.', 42.59, -1.77, 'dolmen', 'artajona'],
  ['Dólmenes de Aralar', 'Sierra de Aralar', 'En la parte navarra de la sierra hay unos 50 megalitos, sobre todo dólmenes.', 42.97, -1.98, 'dolmen', 'sierra-aralar'],
  ['Dólmenes de Urbasa', 'Sierra de Urbasa', 'En la sierra hay dólmenes, túmulos y menhires, como el dolmen del Puerto Viejo de Baquedano, excavado en 1921.', 42.83, -2.16, 'dolmen', 'sierra-urbasa'],
  ['Ciudad romana de Cara', 'Santacara', 'Ciudad romana con foro, casas y necrópolis. Cada año se celebra allí el Día de Cara.', 42.37, -1.55, 'column'],
  ['Torre de Urkulu', 'Orbaizeta', 'Una torre de piedra en lo alto del monte, en la frontera. Se cree que es un trofeo romano para celebrar una victoria.', 43.03, -1.26, 'ruin'],
];

/** Los yacimientos nuevos, listos para SITES (data/dolmen.js); el dolmen de Arrako es un dolmen más, con su historia. */
export function yacimientos(DOLMEN) {
  const out = {};
  for (const [t, id, own] of SITIOS) {
    const T = TIPO[t], finds = own.finds || (own.find ? [...T.finds, own.find] : T.finds);
    out[id] = { ...T, ...own, tipo: t, finds, card: own.card || own.title };
  }
  out.arrako = { ...DOLMEN, tipo: 'dolmen', town: 'isaba-izaba', lat: 42.91, lon: -0.87, title: 'El dolmen de Arrako', lugar: 'Belagua, Isaba',
    host: H('Miren, pastora de Belagua', PASTORA), lmName: 'Dolmen de Arrako', card: 'El dolmen de Arrako',
    intro: ['¡Kaixo! Soy pastora del valle de Belagua, en Isaba.', 'Junto a la ermita de Arrako hay un dolmen: una tumba de piedra de los primeros pastores del valle, de hace miles de años.', 'La ermita se levantó a su lado mucho después, y cada 26 de julio se sube de romería. ¿Me ayudas a excavar alrededor del dolmen?'],
    q: { q: '¿Para qué levantaban los dólmenes?', options: ['Para enterrar a la gente del poblado', 'Para guardar el grano', 'Para vigilar el valle'], answer: 0, why: 'Eran tumbas colectivas: allí se enterraba a muchas personas durante cientos de años.' } };
  return out;
}
