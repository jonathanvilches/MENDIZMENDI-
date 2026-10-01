// El dolmen y los primeros pastores de Navarra (Neolítico y Edad del Bronce, hace unos 5.000 años).
export const DOLMEN_TOWNS = ['artajona', 'altsasu-alsasua', 'lekunberri'];
export const DOLMEN = {
  intro: [
    'Hola, soy arqueóloga: estudio cómo vivía la gente hace miles de años a partir de lo que dejó enterrado.',
    'Hace unos 5.000 años, aquí vivían los primeros pastores y agricultores. Cuidaban ovejas, cabras y vacas, cultivaban trigo y cebada y hacían vasijas de barro.',
    'Para enterrar a su gente levantaban dólmenes: grandes losas de piedra que formaban una cámara. ¿Me ayudas a excavar junto al dolmen? ¡Con mucho cuidado!',
  ],
  what: 'Un dolmen es una tumba colectiva: una cámara hecha con grandes losas de piedra puestas de pie y otra encima, como una mesa. Después se cubría con un montón de tierra y piedras, el túmulo. Allí se enterraba a muchas personas del poblado durante cientos de años.',
  finds: [
    ['shard', 'Trozo de vasija', 'Las primeras vasijas de barro se hacían a mano, sin torno, y se cocían en hogueras. Algunas llevan dibujos hechos con la uña o con un palito.'],
    ['arrow', 'Punta de flecha de sílex', 'El sílex es una piedra que, al golpearla con cuidado, se rompe en láminas muy afiladas. Con ella se hacían puntas de flecha, cuchillos y raspadores.'],
    ['beads', 'Cuentas de collar', 'Cuentas de piedra y de concha. ¡Algunas conchas venían del mar! Eso quiere decir que ya comerciaban con gente de lejos.'],
  ],
  steps: ['Buscar grandes losas de piedra en la sierra', 'Arrastrarlas sobre troncos con cuerdas, entre muchos', 'Levantar las losas de pie formando la cámara', 'Poner la losa grande de cubierta encima', 'Cubrirlo todo con tierra y piedras: el túmulo'],
  then: 'Sin metales ni máquinas: con cuerdas, troncos, palancas de madera y mucha gente trabajando juntos movían piedras de varias toneladas. Vivían en cabañas de madera y barro, y subían con el ganado a los pastos de la sierra en verano, como siguen haciendo los pastores de hoy.',
  now: 'Los dólmenes están protegidos: no se puede mover ni llevarse ninguna piedra. Los arqueólogos excavan con paletas y pinceles, apuntan dónde aparece cada cosa y estudian los huesos en el laboratorio. Muchos dólmenes de Urbasa, Aralar y Artajona se pueden visitar por senderos señalizados.',
};

// Irulegi: poblado de los vascones de la Edad del Hierro (destruido hacia el 70 a. C., en las guerras sertorianas)
// y la mano de bronce con la inscripción más antigua en lengua vascónica (hallada en 2021, Sociedad Aranzadi).
export const IRULEGI = {
  intro: [
    '¡Kaixo! Soy del equipo de arqueología que excava en el monte Irulegi.',
    'Aquí arriba hubo un poblado de los vascones hace más de 2.000 años: casas de piedra y barro pegadas unas a otras, con techos de madera, dentro de una muralla.',
    'Hacia el año 70 antes de Cristo, durante una guerra entre romanos, las guerras sertorianas, el poblado ardió y quedó abandonado. Lo que quedó bajo las cenizas nos cuenta cómo vivían. ¿Me ayudas?',
  ],
  whatTitle: 'La mano de Irulegi',
  what: 'En 2021 apareció aquí, junto a la puerta de una casa, una mano de bronce del tamaño de una mano de verdad. Tiene grabadas cuatro palabras en la lengua de los vascones. La primera, «sorioneku», se parece a la palabra vasca «zorioneko»: de buena suerte. Es el texto más antiguo que se conoce en esa lengua, la abuela del euskera.',
  finds: [
    ['shard', 'Trozo de vasija', 'Vasijas para guardar grano, agua o aceite. Algunas se hacían ya con torno y se decoraban con rayas y círculos.'],
    ['quern', 'Molino de mano', 'Dos piedras redondas: girando la de arriba se molía el grano para hacer harina. Cada casa tenía el suyo.'],
    ['hand', 'La mano de Irulegi', 'Una mano de bronce que colgaba en la puerta de casa, seguramente para proteger a la familia y atraer la buena suerte. ¡Su primera palabra, «sorioneku», quiere decir algo así como «de buena suerte»!'],
  ],
  stepsTitle: 'Así trabaja un equipo de arqueología',
  steps: ['Marcar la zona con cuerdas en cuadrículas', 'Quitar la tierra capa a capa con la paleta', 'Limpiar con un pincel lo que aparece', 'Dibujar y fotografiar dónde estaba cada pieza', 'Llevarlo al laboratorio para estudiarlo'],
  nowTitle: 'Los vascones de Irulegi',
  then: 'Los vascones vivían en poblados en lo alto de los montes. Cultivaban cereal, criaban animales, tejían lana y comerciaban con otros pueblos. Algunos ya sabían escribir, ¡como demuestra la mano!',
  now: 'La mano se estudió durante meses en el laboratorio antes de presentarla en 2022. Cada verano el equipo sigue excavando en Irulegi y aparecen cosas nuevas. Hoy la mano es un símbolo para el euskera.',
  card: 'La mano de Irulegi', icon: 'hand', landmark: 'dig', where: 'en la excavación', hostDone: '¡Buen trabajo! Ahora ya sabes cómo trabajamos. ¿Recuerdas los pasos?',
};
DOLMEN.whatTitle = 'El dolmen'; DOLMEN.stepsTitle = 'Así se levantaba un dolmen'; DOLMEN.nowTitle = 'Los primeros pastores';
DOLMEN.card = 'El dolmen'; DOLMEN.icon = 'dolmen'; DOLMEN.landmark = 'dolmen'; DOLMEN.where = 'alrededor del dolmen'; DOLMEN.hostDone = '¡Buen trabajo! Con lo que has encontrado sabemos cómo vivían. Ahora, ¿cómo crees que levantaban el dolmen?';
export const SITES = { dolmen: DOLMEN, irulegi: IRULEGI };
