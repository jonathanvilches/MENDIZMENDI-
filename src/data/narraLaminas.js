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
};
/** El texto que se lee y el que se le da a la voz */
export const narraTexto = (x) => (typeof x === 'string' ? { t: x, v: x } : { t: x.t, v: x.v || x.t });
