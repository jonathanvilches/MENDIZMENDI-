// Lo que cuenta el narrador en las láminas de los oficios (el visor de ui/anatomia.js), con la voz de Salva, la del
// tráiler. El autor, 22 nov 2026: «que una voz en off vaya explicando y cuente la historia de ese oficio con una voz
// narrativa. Que cada proceso del oficio lo cuente un narrador [...] Puedes utilizar la misma voz que has utilizado para
// el tráiler para explicar todos los procesos».
// h: la historia del oficio (suena al abrir la lámina, con la maqueta entera); p: un texto por paso de la lámina (los
// mismos pasos que tools/anatomia/<lámina>.mjs, PASOS). Cada texto es { t: lo que se lee, v: cómo se le dice a la voz
// (si se escribe distinto para que lo pronuncie bien) } o solo el texto. Los audios: public/anatomia/voz/<lámina>-h.mp3 y
// <lámina>-<paso>.mp3 (tools/anatomia/narra-voz.mjs los lista para grabarlos).
export const NARRA_VOZ = 'Salva';
export const NARRA = {
  ferreria: {
    h: 'En los valles del Bidasoa, el hierro se sacaba en las ferrerías. El río daba la fuerza: movía los fuelles y un mazo enorme que golpeaba día y noche.',
    p: [
      'Primero, el agua. Un canal la lleva desde el río hasta las ruedas, y las hace girar.',
      'En el horno se cargan carbón vegetal y vena, el mineral de hierro.',
      'Las levas aprietan los barquines, dos grandes fuelles. El aire aviva el fuego.',
      'Con el calor, el mineral se convierte en una masa de hierro al rojo: la zamarra.',
      'El mazo cae sobre la zamarra una y otra vez, y le saca la escoria.',
      'Al final salen las barras de hierro, listas para los herreros de cada pueblo.',
    ],
  },
  palomeras: {
    h: { t: 'Cada otoño, miles de palomas torcaces cruzan los Pirineos hacia el sur. En los collados de Etxalar se cazan con redes desde hace siglos.', v: 'Cada otoño, miles de palomas torcaces cruzan los Pirineos hacia el sur. En los collados de Echalar se cazan con redes desde hace siglos.' },
    p: [
      'Desde la atalaya, un vigía ve llegar el bando de palomas.',
      'Lanzan al aire una paleta blanca. Las palomas creen que es un halcón.',
      'Para escapar, el bando baja en picado, a ras del collado.',
      'Desde la chabola tiran de la cuerda, y las redes caen.',
      'Las palomas quedan enredadas, y se recogen una a una.',
    ],
  },
  cantero: {
    h: 'Los canteros sacaban la piedra del monte y la tallaban en sillares perfectos. Con ellos se levantaron puentes, iglesias y palacios, como el puente de Puente la Reina.',
    p: [
      'Se abre una fila de agujeros y se meten cuñas. La piedra se parte por su veta.',
      'A golpe de pico, se le quitan los salientes más gruesos.',
      'Con cincel y maza, cara a cara, la piedra queda lisa.',
      'La escuadra comprueba que todos los ángulos son rectos.',
      'Cada cantero grababa su marca: así le pagaban por cada piedra.',
      'Las dovelas se colocan sobre la cimbra. La última, la clave, cierra el arco.',
    ],
  },
  aizkolari: {
    h: 'Los leñadores cortaban árboles para sacar vigas, leña y carbón. De sus apuestas, a ver quién cortaba más rápido, nació el deporte de los aizkolaris.',
    p: [
      'Un tronco de haya, tumbado y bien sujeto sobre sus calzos.',
      'Hachazo a hachazo, el aizkolari abre una uve hasta el centro del tronco.',
      'Sin bajarse, da media vuelta encima del tronco.',
      'Por detrás, abre la otra uve, hasta encontrar la primera.',
      'El tronco se parte en dos, y el juez para el reloj.',
    ],
  },
  harrijasotzaile: {
    h: 'En los caseríos había que mover piedras muy pesadas. De las apuestas entre vecinos nació el deporte de levantarlas. Iñaki Perurena, de Leitza, alzó piedras de más de trescientos kilos.',
    p: [
      'Primero se pesa la piedra en la romana.',
      'Agachado, con las piernas y la espalda recta, la sube a las rodillas.',
      'La piedra rueda por el cuerpo hasta el pecho.',
      'De pie, la sujeta quieta sobre el hombro.',
      'La deja caer en el saco. Una alzada más.',
    ],
  },
  alpargata: {
    h: 'Las alpargatas eran el calzado de casi todo el mundo. Cada otoño, las golondrinas, chicas del Roncal y de Salazar, cruzaban el Pirineo para hacerlas en Mauleón.',
    p: [
      'Tres cabos de yute se trenzan en una sola trenza.',
      'La trenza se enrolla en espiral, de dentro afuera, y forma la suela.',
      'Se cose de lado a lado con hilo de cáñamo.',
      'La prensa la deja plana y dura.',
      'A mano, se cosen la puntera y el talón de lona.',
      'Por último, las cintas, que se atan al tobillo.',
    ],
  },
  cesta: {
    h: 'En los caseríos hacían falta cestas para todo: manzanas, patatas o hierba. El cestero las tejía en invierno, con tiras de castaño o de avellano.',
    p: [
      'En invierno se cortan varas de castaño o de avellano.',
      'Se cuecen, y la madera se ablanda.',
      'Se abren en tiras finas y flexibles.',
      'Las costillas se cruzan en el fondo y se doblan hacia arriba.',
      'La tira pasa por encima y por debajo, vuelta a vuelta.',
      'Se remata el borde, y se ata bien el asa.',
    ],
  },
  carbonera: {
    h: 'En los hayedos de Aezkoa y de Irati, los carboneros convertían la leña en carbón para las ferrerías y las cocinas. No dejaban la carbonera sola ni de noche.',
    p: [
      'Se cortan troncos de haya y se apilan.',
      'La leña se coloca de pie, alrededor de un hueco: la chimenea.',
      'Se cubre con hojas y tierra, para que no entre el aire.',
      'El fuego se enciende por arriba, por la chimenea.',
      'Días y noches vigilando. El color del humo dice cómo va.',
      'Sale el carbón: negro, ligero y frío, listo para los sacos.',
    ],
  },
  hilandera: {
    h: 'En los valles del Pirineo, cada casa tenía ovejas. En las largas noches de invierno, junto al fuego, se hilaba su lana para hacer ropa de abrigo.',
    p: [
      'Con tijeras, se esquila el vellón entero.',
      'La lana se lava en agua, para quitarle la grasa y la tierra.',
      'Las cardas la ahuecan y la peinan.',
      'La rueca sujeta la lana, y el huso la retuerce hasta hacer hilo.',
      'La madeja pasa al ovillo.',
      'Y con el ovillo se tejen calcetines, mantas y jerséis.',
    ],
  },
  pan: {
    h: 'Antes, cada familia amasaba su pan una vez por semana y lo cocía en el horno de leña del pueblo. Cada casa marcaba sus panes con su propia señal.',
    p: [
      'Harina, agua, sal y masa madre. Se amasa bien.',
      'Tapada, la masa reposa y crece hasta el doble.',
      'Se calienta el horno, hasta que la bóveda se pone blanca.',
      'Se sacan las brasas y se limpia la solera.',
      'Cada pan, con su señal, entra en el horno sobre la pala.',
      'Con la puerta cerrada, se cuece durante una hora.',
    ],
  },
  tonelero: {
    h: 'El vino de Navarra se guardaba en barricas de roble. El tonelero las hacía sin un solo clavo ni pegamento: solo madera doblada y aros de hierro.',
    p: [
      'El roble se deja secar al aire, dos o tres años.',
      'Las duelas se levantan de pie dentro de un aro. Es la rosa.',
      'El fuego las ablanda para poder doblarlas, y las tuesta.',
      'El torno las cierra, y los aros entran a golpe de mazo.',
      'Cada tapa encaja en su ranura, el jable.',
      'Se llena de agua: si no sale ni una gota, ya puede guardar vino.',
    ],
  },
  // ---- las demás láminas (22 nov, tarde; el autor: «Quiero las láminas»; la almadía no tiene pasos y se queda sin
  // narrador). Las que aún no tienen sus audios van en SIN_VOZ
  queso: {
    h: { t: 'Los pastores de Navarra hacen queso con la leche de sus ovejas. Los más famosos son el Idiazabal y el Roncal, el primer queso de España con denominación de origen.', v: 'Los pastores de Navarra hacen queso con la leche de sus ovejas. Los más famosos son el Idiazábal y el Roncal, el primer queso de España con denominación de origen.' },
    p: [
      'La leche de oveja se templa hasta unos treinta grados.',
      'Se añade el cuajo, y en media hora la leche se vuelve sólida.',
      'Con la lira, la cuajada se corta en granos pequeños, como de arroz.',
      'Los granos sueltan el suero, el líquido que sobra.',
      'La masa entra en los moldes y se prensa unas horas.',
      'Se sala uno o dos días, y así hace corteza.',
      { t: 'Y a curar: el Idiazabal, al menos dos meses; el Roncal, cuatro.', v: 'Y a curar: el Idiazábal, al menos dos meses; el Roncal, cuatro.' },
    ],
  },
  vino: {
    h: 'Navarra es tierra de rosado. Se hace con uva garnacha, y su color no sale de mezclar vino blanco y tinto, sino de la piel de la uva.',
    p: [
      'En septiembre y octubre se vendimia la garnacha.',
      'La máquina quita el raspón y rompe los granos.',
      'El mosto pasa unas horas con las pieles, que le dan su color.',
      'Se sangra el depósito: el mosto rosado sale solo, sin prensar.',
      'Fermenta a unos dieciséis grados, durante unas dos semanas.',
      'Y se embotella: rosado de Navarra.',
    ],
  },
  esparrago: {
    h: 'El espárrago blanco de Navarra crece en la Ribera, junto al Ebro. Es blanco porque crece bajo tierra, sin ver nunca el sol.',
    p: [
      'La tierra se amontona en caballones, y el espárrago crece dentro, a oscuras.',
      'Al amanecer, la punta agrieta la tierra: es la señal.',
      'Con la gubia se corta a unos veintidós centímetros, sin tocar la garra.',
      'Se tapa el hoyo, para que el siguiente también salga blanco.',
      'Ese mismo día se enfría en agua fría.',
      'Se pela, se separa por grosores y se envasa.',
    ],
  },
  piquillo: {
    h: 'El pimiento del piquillo se cultiva en Lodosa y otros pueblos de la Ribera. Es pequeño, rojo y acaba en punta, como un pico.',
    p: [
      'Se recoge a mano, de septiembre a noviembre.',
      'Se asa a la llama, que tuesta la piel.',
      'Se pela a mano, sin agua, para que no pierda sabor.',
      'Se le quitan el rabo y las pepitas.',
      'Entero, uno a uno, entra en la lata.',
      'Se esteriliza, y cada lata lleva su contraetiqueta numerada.',
    ],
  },
  aceite: {
    h: 'En el sur de Navarra hay olivos desde hace siglos. Su variedad propia es la arróniz, que da un aceite verde y afrutado.',
    p: [
      'En invierno se varean los olivos, y las olivas caen sobre el manto.',
      'Se lavan, y se quitan las hojas, la tierra y las piedras.',
      'Se muelen enteras, con hueso, hasta hacer una pasta.',
      'La pasta se bate despacio y en frío, a menos de veintisiete grados.',
      'La centrífuga separa el aceite del agua y del orujo.',
      'Se guarda en la bodega. Para un litro hacen falta de cuatro a seis kilos de olivas.',
    ],
  },
  miel: {
    h: 'En los montes de Navarra, las abejas hacen miel de brezo, de tomillo o de castaño, según las flores que tienen cerca.',
    p: [
      'Las abejas liban el néctar de las flores.',
      'En la colmena lo guardan en celdillas de cera, y se vuelve miel.',
      'El apicultor usa el ahumador: el humo calma a las abejas.',
      'Con un cuchillo, quita la tapa de cera de las celdillas.',
      'En el extractor, los cuadros giran y la miel sale despedida.',
      'Reposa, se cuela y se envasa.',
    ],
  },
  cuajada: {
    h: 'La cuajada es el postre de los pastores del norte de Navarra. Antes se hacía en un kaiku de madera, calentando la leche con piedras al rojo.',
    p: [
      'Se cuela la leche de oveja recién ordeñada.',
      'En el fuego se calientan piedras de río hasta ponerlas al rojo.',
      'Las piedras entran en la leche: hierve y coge sabor a tostado.',
      'Cuando baja a unos treinta y siete grados, unas gotas de cuajo.',
      'Se reparte en cuencos y, sin moverla, cuaja.',
      'Se come fresca, con miel o con azúcar.',
    ],
  },
  txistorra: {
    h: { t: 'La txistorra es el embutido de las fiestas y las ferias de Navarra. Es fina, roja y se come recién hecha, frita en la sartén.', v: 'La chistorra es el embutido de las fiestas y las ferias de Navarra. Es fina, roja y se come recién hecha, frita en la sartén.' },
    p: [
      'Se elige magro y tocino de cerdo.',
      'La carne se pica por la placa de agujeros.',
      'Se adoba con sal, ajo y pimentón.',
      'Se embute en una tripa fina.',
      'Se cuelga unos días para que se oree.',
      'Y a la sartén: frita, o en bocadillo.',
    ],
  },
  sidra: {
    h: 'En el norte de Navarra se hace sidra desde hace siglos, con las manzanas ácidas y dulces de los caseríos.',
    p: [
      'En otoño se recogen las manzanas.',
      'Se trituran hasta hacerlas pulpa.',
      'La pulpa se prensa en el dolare: de cien kilos de manzana salen unos sesenta y cinco litros de mosto.',
      'Todo el invierno fermenta en la kupela, y el azúcar se vuelve alcohol.',
      'De enero a abril se abre la kupela: la sidra sale en un chorro fino, para que se airee.',
      'Y se embotella: sidra natural.',
    ],
  },
  molino: {
    h: 'Casi cada pueblo tenía su molino junto al río. Allí llevaban los vecinos su trigo y su maíz para hacer harina.',
    p: [
      'Un canal, el caz, desvía el agua del río hasta el cubo.',
      'El chorro empuja las cucharas del rodezno y lo hace girar.',
      'Arriba, la muela volandera gira sobre la solera, que está quieta.',
      'Desde la tolva, el grano cae al ojo de la muela.',
      'El cedazo separa la harina del salvado.',
      'El molinero cobraba en harina: era la maquila.',
    ],
  },
  angel: {
    h: 'Cada Domingo de Resurrección, en la plaza de los Fueros de Tudela, un niño vestido de ángel baja por una maroma para anunciar la Resurrección.',
    p: [
      'La maroma cruza la plaza de lado a lado, del balcón al mástil.',
      'El ángel baja colgado de una polea, mientras desde el balcón sueltan la cuerda.',
      'Al llegar, le quita a la Virgen el velo negro de luto.',
      'Dice sus versos. Suenan las campanas y vuelan las palomas.',
      'Tiran de la cuerda, y el ángel vuelve al balcón.',
    ],
  },
  salmon: {
    h: 'El salmón nace en ríos como el Bidasoa, viaja hasta el mar y, años después, vuelve al mismo río donde nació.',
    p: [
      'En invierno, los huevos esperan en la grava del río.',
      'Los alevines crecen en el río uno o dos años.',
      'Después bajan hasta el mar Cantábrico.',
      'Años más tarde, vuelven a su río.',
      'Saltan la presa por la escala, de poza en poza.',
      'Y ponen sus huevos en la grava donde nacieron.',
    ],
  },
  setas: {
    h: 'En otoño, los bosques de Navarra se llenan de setas. Pero la seta es solo el fruto: el hongo vive escondido bajo tierra todo el año.',
    p: [
      'Bajo tierra, el hongo es una red de hilos finísimos: el micelio.',
      'El micelio se abraza a las raíces: le da agua al árbol, y el árbol le da azúcar.',
      'Tras la lluvia, la seta empuja la hojarasca y sale.',
      'De las láminas del sombrero caen las esporas, que harán nuevos hongos.',
      'Se corta por el pie, con navaja, y las pequeñas se quedan en el monte.',
    ],
  },
};
/** Las que tienen guion pero aún no sus audios: el visor pone el subtítulo y pasa solo, sin pedir la voz ni enseñar
 *  el botón del narrador. Cuando se graban, se quitan de aquí */
export const SIN_VOZ = new Set(['aceite', 'miel', 'cuajada', 'txistorra', 'sidra', 'molino', 'angel', 'salmon', 'setas']);
/** El texto que se lee y el que se le da a la voz */
export const narraTexto = (x) => (typeof x === 'string' ? { t: x, v: x } : { t: x.t, v: x.v || x.t });
