// Oficios de antes: cómo se hacían las cosas. Cada oficio tiene quién lo hacía, las herramientas (castellano y
// euskera), los pasos del trabajo (cada paso se explica y luego se hace con una acción corta) y el «antes y ahora».
// Juegos de cada paso: timing (golpe en el momento justo), mash (pulsar deprisa) —los dos con un dibujo (art) del
// trabajo que avanza con cada golpe bueno—, order (ordenar), choice (elegir) y
// los que imitan la tarea de verdad: forge (fuelle y martillo en la fragua), stitch (coser la suela) y shear (esquilar).
// Textos para niños de 7 a 11 años, con datos generales y contrastados.

export const OFICIOS = {
  herrero: {
    name: 'Herrero', eu: 'Errementaria', icon: 'anvil', act: 'hammer', product: 'Una herradura',
    intro: 'En las ferrerías del Bidasoa se trabajaba el hierro con la fuerza del agua: el río movía los fuelles y un gran mazo. En cada pueblo, el herrero hacía herraduras, clavos, rejas de arado y herramientas.',
    tools: [['Fragua', 'Sutegia', 'el fuego de carbón donde se calienta el hierro'], ['Fuelle', 'Hauspoa', 'sopla aire para avivar el fuego'], ['Yunque', 'Ingudea', 'el bloque de hierro sobre el que se golpea'], ['Martillo', 'Mailua', 'para dar forma al hierro caliente'], ['Tenazas', 'Kurrikak', 'para sujetar el hierro sin quemarse']],
    steps: [
      { title: '¿Con qué lo sujetas?', text: 'El hierro sale de la fragua tan caliente que brilla.', game: 'choice', q: '¿Con qué sujeta el herrero el hierro al rojo?', options: ['Con las tenazas', 'Con la mano', 'Con un trapo'], answer: 0, why: 'Con las tenazas (kurrikak): el hierro caliente quema muchísimo.' },
      { title: 'Fuelle y yunque', text: 'Con el fuelle se sopla aire al carbón hasta que el hierro se pone naranja, al rojo vivo; entonces se golpea en el yunque para darle forma de herradura. Frío no se deja trabajar, y si se pone blanco se quema.', game: 'forge', verb: 'A la fragua' },
      { title: 'Al agua', art: 'quench', text: 'Al final se mete en agua fría: ¡ssshhh! Así el hierro se enfría y queda duro.', game: 'timing', verb: 'Al agua', rounds: 3, need: 2 },
    ],
    then: 'Antes, cada pueblo tenía su herrería. El herrero ponía herraduras a caballos, mulas y bueyes, y arreglaba las herramientas del campo.',
    now: 'Hoy casi todo se hace en fábricas, pero quedan herreros artesanos que forjan rejas, balcones y esculturas a mano.',
  },
  palomero: {
    name: 'Palomero', eu: 'Usozalea', icon: 'net', act: 'wave', product: 'Una jornada en las palomeras',
    intro: 'Cada otoño, grandes bandos de palomas cruzan los Pirineos hacia el sur. En los collados de Etxalar se cazan con redes desde hace siglos, con un sistema muy ingenioso.',
    tools: [['Atalaya', 'Dorrea', 'torre de madera en lo alto de los árboles para vigilar'], ['Paleta', 'Paleta', 'una tabla blanca que se lanza al aire'], ['Red', 'Sarea', 'redes altas colgadas entre los árboles del collado']],
    steps: [
      { title: '¿Cuándo pasan?', text: 'Los palomeros esperan la migración de las palomas torcaces.', game: 'choice', q: '¿En qué época del año pasan los bandos?', options: ['En otoño', 'En verano', 'En Navidad, con nieve'], answer: 0, why: 'En otoño, cuando las palomas viajan hacia el sur para pasar el invierno.' },
      { title: 'Lanza la paleta', art: 'dove', text: 'Desde la atalaya se lanza la paleta blanca cuando pasa el bando: las palomas creen que es un halcón y bajan en picado, casi a ras del suelo.', game: 'timing', verb: 'Lanzar' },
      { title: 'Baja la red', art: 'net', text: 'Los de abajo sueltan las redes justo cuando las palomas llegan al collado.', game: 'timing', verb: 'Soltar la red', rounds: 3, need: 2 },
    ],
    then: 'Era una forma de conseguir comida en otoño y trabajaban muchas personas juntas, cada una en su puesto.',
    now: 'En Etxalar se sigue haciendo cada otoño y es una tradición que viene gente a ver.',
  },
  cantero: {
    name: 'Cantero', eu: 'Hargina', icon: 'hammer', act: 'hammer', product: 'Un sillar con tu marca',
    intro: 'Los canteros sacaban la piedra de la cantera y la tallaban en bloques perfectos llamados sillares. Con ellos se levantaron puentes, iglesias y palacios, como el puente de Puente la Reina.',
    tools: [['Escuadra', 'Eskuaira', 'para que los ángulos queden rectos'], ['Cincel', 'Zizela', 'para tallar con precisión'], ['Maza', 'Mazoa', 'para golpear el cincel'], ['Pico', '', 'para quitar la piedra que sobra']],
    steps: [
      { title: 'Elige la piedra', text: 'No todas las piedras sirven: una grieta y el sillar se rompe.', game: 'choice', q: '¿Qué piedra elige el cantero?', options: ['Una sin grietas', 'La más bonita aunque esté rota', 'Una de río, redonda'], answer: 0, why: 'La que no tiene grietas: tiene que aguantar el peso de todo el edificio durante siglos.' },
      { title: 'Desbasta con el pico', art: 'stone', text: 'Primero se quita a golpes la piedra que sobra.', game: 'timing', verb: 'Picar' },
      { title: 'Talla con cincel y maza', art: 'ashlar', text: 'Después se alisan las caras con el cincel, comprobando con la escuadra que todo quede recto.', game: 'timing', verb: 'Tallar' },
      { title: 'Pon tu marca', text: 'Cada cantero grababa su marca en los sillares que hacía: así le pagaban por cada piedra.', game: 'choice', q: 'Elige tu marca de cantero', options: ['Una estrella', 'Una flecha', 'Una llave'], answer: -1, why: '¡Muy bien! Todavía hoy se ven marcas de cantero en muchos puentes e iglesias de Navarra. Búscalas.' },
    ],
    then: 'Los canteros viajaban de obra en obra. Un buen cantero tardaba horas en tallar un solo sillar.',
    now: 'Hoy la piedra se corta con máquinas, pero para restaurar los monumentos antiguos se sigue tallando a mano.',
  },
  aizkolari: {
    name: 'Aizkolari', eu: 'Aizkolaria', icon: 'axe', act: 'chop', product: 'Un tronco cortado',
    intro: 'Los leñadores cortaban árboles en los montes para sacar vigas, leña, carbón y troncos para las almadías. Hacían apuestas a ver quién cortaba más rápido: de ahí nació el deporte de los aizkolaris.',
    tools: [['Hacha', 'Aizkora', 'muy afilada, con mango largo'], ['Tronco', 'Enborra', 'normalmente de haya']],
    steps: [
      { title: '¿Qué madera?', text: 'En los montes de Navarra hay muchos bosques de hayas.', game: 'choice', q: '¿De qué árbol suelen ser los troncos de los aizkolaris?', options: ['De haya', 'De palmera', 'De bambú'], answer: 0, why: 'De haya (pagoa), el árbol de los grandes bosques como Irati.' },
      { title: 'Corta el primer lado', art: 'chop', text: 'El aizkolari se sube encima del tronco y corta haciendo una V, primero por un lado.', game: 'timing', verb: 'Hachazo' },
      { title: 'Da la vuelta', art: 'chop2', text: 'Luego se gira y corta por el otro lado hasta partir el tronco.', game: 'timing', verb: 'Hachazo' },
    ],
    then: 'Cortar leña era un trabajo duro y necesario: sin leña no había fuego para cocinar ni calentarse en invierno.',
    now: 'Hoy es un deporte rural: en las fiestas hay campeonatos de aizkolaris.',
  },
  harrijasotzaile: {
    name: 'Levantador de piedras', eu: 'Harrijasotzailea', icon: 'stone', act: 'lift', product: 'La piedra, al hombro',
    intro: 'En los caseríos se movían piedras muy pesadas. De las apuestas entre vecinos nació el deporte de levantar piedras. Iñaki Perurena, de Leitza, levantó piedras de más de 300 kilos.',
    tools: [['Piedra', 'Harria', 'con forma de cilindro, cubo o bola'], ['Faja', 'Gerrikoa', 'para proteger la espalda']],
    steps: [
      { title: 'Cómo se levanta', text: 'Lo más importante es no hacerse daño.', game: 'choice', q: '¿Con qué fuerza se levanta la piedra?', options: ['Con las piernas, la espalda recta', 'Solo con los brazos', 'Doblando la espalda'], answer: 0, why: 'Con las piernas y la espalda recta, como cuando levantas algo pesado en casa.' },
      { title: '¡Arriba!', art: 'lift', text: 'Se sube la piedra del suelo al pecho y de ahí al hombro.', game: 'mash', verb: '¡Arriba!' },
    ],
    then: 'Mover piedras, sacos y troncos era parte del trabajo diario en el campo.',
    now: 'Hoy es un deporte rural y se hacen exhibiciones en las fiestas de los pueblos.',
  },
  alpargatero: {
    name: 'Alpargatera', eu: 'Espartingilea', icon: 'espadrille', act: 'pick', product: 'Un par de alpargatas',
    intro: 'Las alpargatas eran el calzado de casi todo el mundo. Cada otoño, muchas chicas jóvenes del Roncal, de Salazar y de Aragón, las «golondrinas», cruzaban el Pirineo para trabajar en las fábricas de alpargatas de Mauleón, en Francia, y volvían en primavera.',
    tools: [['Yute o esparto', '', 'la cuerda para la suela'], ['Aguja', 'Orratza', 'grande y fuerte, para coser la suela'], ['Lona', 'Oihala', 'la tela de arriba']],
    steps: [
      { title: 'Ordena el trabajo', text: 'Una alpargata se hace por partes.', game: 'order', items: ['Trenzar la cuerda de yute', 'Enrollarla en espiral para hacer la suela', 'Coser la suela', 'Coser la lona encima', 'Poner las cintas'] },
      { title: 'Cose la suela', text: 'La suela se cose con puntadas fuertes, una tras otra por todo el borde, para que no se deshaga al andar.', game: 'stitch', verb: 'Coser' },
    ],
    then: 'Las golondrinas caminaban días por el monte para llegar a Mauleón. Con lo que ganaban ayudaban a su familia.',
    now: 'Hoy las alpargatas son un calzado de verano y fiesta. En San Fermín se llevan con cintas rojas.',
  },
  cestero: {
    name: 'Cestero', eu: 'Saskigilea', icon: 'basket', act: 'pick', product: 'Una cesta',
    intro: 'En los caseríos hacían falta cestas para todo: manzanas, patatas, hierba o ropa. El cestero las tejía con tiras de madera de castaño o de avellano. ¡Las cestas de la pelota, la xistera, también se tejen a mano!',
    tools: [['Cuchillo', 'Labana', 'para abrir las varas en tiras'], ['Tiras de madera', 'Zumitzak', 'finas y flexibles'], ['Mazo', 'Mailua', 'para apretar el tejido']],
    steps: [
      { title: 'Ordena el trabajo', text: 'La madera seca no se dobla: primero hay que prepararla.', game: 'order', items: ['Cortar varas de castaño o avellano', 'Cocerlas o ponerlas en agua para que se ablanden', 'Abrirlas en tiras finas', 'Tejer cruzando las tiras', 'Rematar el borde'] },
      { title: 'Teje la cesta', art: 'basket', text: 'Las tiras se pasan por encima y por debajo, una y otra vez, apretando bien.', game: 'timing', verb: 'Tejer' },
    ],
    then: 'En invierno, cuando había menos trabajo en el campo, se hacían y arreglaban las cestas de todo el año.',
    now: 'Hoy quedan pocos cesteros; sus cestas se usan en casa y para jugar a pelota con xistera.',
  },
  carbonero: {
    name: 'Carbonero', eu: 'Ikazkina', icon: 'fire', act: 'pick', product: 'Un saco de carbón vegetal',
    intro: 'En los bosques de haya, como los de Aezkoa e Irati, los carboneros convertían la leña en carbón en unos montones llamados carboneras (txondorra). El carbón se usaba en las ferrerías y en las cocinas.',
    tools: [['Carbonera', 'Txondorra', 'montón de leña cubierto de tierra'], ['Pala', 'Pala', 'para echar tierra'], ['Leña de haya', 'Pago egurra', 'la madera que se convierte en carbón']],
    steps: [
      { title: 'Ordena el trabajo', text: 'Hacer carbón necesita paciencia.', game: 'order', items: ['Apilar la leña alrededor de una chimenea', 'Cubrirla con hojas y tierra', 'Encender por arriba', 'Vigilar varios días y noches', 'Sacar el carbón ya frío'] },
      { title: '¿Por qué la tierra?', text: 'Si la leña arde con llama, se convierte en ceniza.', game: 'choice', q: '¿Para qué se tapa la leña con tierra?', options: ['Para que se queme despacio, casi sin aire', 'Para que no se moje', 'Para esconderla'], answer: 0, why: 'Sin casi aire la madera no arde del todo: se tuesta y se vuelve carbón.' },
      { title: 'Tapa las fugas', art: 'mound', text: 'Si sale llama por algún agujero, el carbonero lo tapa enseguida con tierra.', game: 'mash', verb: 'Tapar' },
    ],
    then: 'El carbonero dormía en una chabola junto a la carbonera y no la dejaba sola ni de noche.',
    now: 'Hoy el carbón vegetal se hace en hornos, y algunos pueblos recuerdan las carboneras en sus fiestas.',
  },
  hilandera: {
    name: 'Hilandera', eu: 'Irulea', icon: 'wool', act: 'pick', product: 'Un ovillo de lana',
    intro: 'En los valles del Pirineo cada casa tenía ovejas. Con su lana se hacían calcetines, mantas y ropa de abrigo. En las largas noches de invierno, junto al fuego, se hilaba la lana.',
    tools: [['Tijeras de esquilar', 'Artaziak', 'para cortar la lana de la oveja'], ['Cardas', 'Kardak', 'peines de púas para ahuecar la lana'], ['Rueca', 'Gorua', 'donde se sujeta la lana para hilar'], ['Huso', 'Ardatza', 'palo que gira y enrolla el hilo']],
    steps: [
      { title: 'Ordena el trabajo', text: 'De la oveja al ovillo hay muchos pasos.', game: 'order', items: ['Esquilar la oveja', 'Lavar la lana en el río', 'Cardarla para ahuecarla', 'Hilarla con la rueca y el huso', 'Tejer la prenda'] },
      { title: 'Esquila la oveja', text: 'Lo primero es la lana: con tijeras grandes se corta el vellón entero, como un abrigo, con cuidado de no acercarse a la cabeza.', game: 'shear', verb: 'Esquilar' },
      { title: 'Hila la lana', art: 'spin', text: 'Se estira un poco de lana y se hace girar el huso: el hilo se retuerce y se enrolla.', game: 'timing', verb: 'Girar el huso' },
    ],
    then: 'Los pastores del Roncal bajaban con sus rebaños a las Bardenas para pasar el invierno: es la trashumancia.',
    now: 'Hoy la ropa se hace en fábricas, pero se sigue hilando a mano en talleres y ferias.',
  },
  panadero: {
    name: 'Panadera', eu: 'Okina', icon: 'bread', act: 'pick', product: 'Una hogaza de pan',
    intro: 'Antes, cada familia amasaba su pan en casa una vez por semana y lo cocía en el horno de leña del pueblo. Para no confundirlos, cada casa marcaba sus panes con su propia señal.',
    tools: [['Artesa', 'Oramahaia', 'cajón de madera para amasar'], ['Levadura madre', 'Legamia', 'un trozo de masa guardado de la vez anterior'], ['Horno de leña', 'Labea', 'se calienta con leña o sarmientos'], ['Pala', 'Pala', 'para meter y sacar el pan']],
    steps: [
      { title: 'Amasa', art: 'knead', text: 'Harina, agua, sal y levadura madre: se amasa con fuerza.', game: 'mash', verb: 'Amasar' },
      { title: '¿Por qué crece?', text: 'Se deja la masa tapada unas horas.', game: 'choice', q: '¿Por qué se hincha la masa?', options: ['Por la levadura, que hace burbujas', 'Por el frío', 'Porque se le echa aire con el fuelle'], answer: 0, why: 'La levadura es un ser vivo diminuto que hace burbujas de gas: por eso el pan es esponjoso.' },
      { title: 'Al horno', art: 'oven', text: 'Con la pala se meten los panes en el horno caliente, sin quemarse.', game: 'timing', verb: 'Meter el pan' },
    ],
    then: 'El pan de una semana tenía que durar: por eso se hacían hogazas grandes.',
    now: 'Hoy compramos el pan cada día en la panadería, pero en muchos pueblos aún se enciende el horno de leña en fiestas.',
  },
  tonelero: {
    name: 'Tonelero', eu: 'Upelgilea', icon: 'wine', act: 'hammer', product: 'Una barrica de roble',
    intro: 'El vino de Navarra se guardaba en toneles y barricas de madera de roble. El tonelero las hacía sin clavos ni pegamento: solo madera doblada y aros de hierro.',
    tools: [['Duelas', 'Oholak', 'tablas de roble curvadas'], ['Aros de hierro', 'Burdinazko uztaiak', 'que aprietan las duelas'], ['Fuego', 'Sua', 'para doblar la madera']],
    steps: [
      { title: 'Ordena el trabajo', text: 'Una barrica se arma poco a poco.', game: 'order', items: ['Colocar las duelas de roble en círculo', 'Calentarlas con fuego por dentro', 'Doblarlas y ponerles los aros', 'Poner las tapas', 'Comprobar que no gotea'] },
      { title: 'Aprieta los aros', art: 'hoops', text: 'Los aros de hierro se bajan a golpes para que las duelas queden bien apretadas.', game: 'timing', verb: 'Golpear' },
    ],
    then: 'Cada bodega necesitaba toneles para guardar y llevar el vino en carros.',
    now: 'Hoy muchos vinos de Navarra reposan en barricas de roble hechas todavía por toneleros.',
  },
};
