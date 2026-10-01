// Castillos de Navarra: misión «Las partes del castillo» (foso y puente, puerta, almenas y saeteras, torre del
// homenaje…) y el listado de castillos del reino. Textos para niños; datos de Turismo de Navarra, la Cátedra de
// Patrimonio de la Universidad de Navarra y CastillosNet.

// partes genéricas: f = hacia la puerta (+) o hacia el fondo (−), s = a un lado (en metros, escala de un castillo mediano)
export const PARTS = {
  foso: { name: 'El foso y el puente levadizo', icon: 'bridge', f: 1.25, s: 0, text: 'El foso era una zanja honda alrededor del castillo, a veces llena de agua. Para entrar había que cruzar el puente levadizo, que se subía con cadenas: ¡con el puente arriba nadie podía pasar!' },
  puerta: { name: 'La puerta y el rastrillo', icon: 'shield', f: 0.95, s: 0.35, text: 'La puerta era el punto más débil. Se protegía con una reja de hierro que bajaba de golpe, el rastrillo, y con matacanes: balcones de piedra con agujeros en el suelo para defender la entrada desde arriba.' },
  almenas: { name: 'Almenas y saeteras', icon: 'arrow', f: 0, s: 1.25, text: 'Las almenas son los «dientes» de piedra de lo alto de la muralla: los defensores se escondían detrás. Las saeteras son ranuras estrechas en el muro: desde dentro se disparaban flechas, pero desde fuera era casi imposible acertar.' },
  torre: { name: 'La torre del homenaje', icon: 'castle', f: -1.2, s: -0.35, text: 'La torre del homenaje es la más alta y fuerte. Allí vivía el señor del castillo y era el último refugio si el enemigo entraba. Desde arriba se vigilaba todo el valle.' },
  pozo: { name: 'Agua y comida para resistir', icon: 'water', f: -0.4, s: -1.25, text: 'Un castillo tenía que aguantar semanas cerrado. Por eso dentro había un pozo o un aljibe para guardar el agua de lluvia, almacenes de grano, cuadras y una cocina con su horno.' },
};

export const CASTLE_QUIZ = { q: '¿Para qué servían las saeteras, esas ranuras estrechas de la muralla?', options: ['Para disparar flechas desde dentro sin que te alcanzaran', 'Para que entrara el sol en la cocina', 'Para tirar el agua sucia'], answer: 0,
  why: 'Desde dentro se ve y se dispara bien; desde fuera, una ranura tan estrecha es un blanco casi imposible.' };

// cada castillo: quién presenta la visita, sus partes (con textos propios cuando los hay) y el antes y ahora
export const CASTLE_TOWNS = {
  javier: {
    title: 'El castillo de Javier', size: 0.8,
    intro: ['¡Ongi etorri al castillo de Javier! Aquí nació en 1506 Francisco de Jasso y Azpilicueta: San Francisco Javier, que viajó hasta la India y Japón.',
      'El castillo vigilaba la frontera entre Navarra y Aragón. Vamos a recorrerlo: busca las banderas y descubre para qué servía cada parte.'],
    parts: ['foso', 'puerta', 'almenas', 'torre', 'capilla'],
    own: {
      torre: { name: 'La torre de San Miguel', text: 'Es la torre más antigua y alta del castillo de Javier. Desde arriba se vigilaba la frontera con Aragón y se veía llegar a cualquiera desde muy lejos.' },
      capilla: { name: 'El Cristo que sonríe', icon: 'cross', f: -0.6, s: 1.2, text: 'En la capilla del Santo Cristo hay un crucifijo de nogal que sonríe: el «Cristo sonriente». En sus paredes hay pinturas del siglo XV con esqueletos que bailan, la Danza de la Muerte: es la única que se conoce en España.' },
    },
    then: 'En 1516, tras la conquista de Navarra, el cardenal Cisneros mandó desmochar el castillo: derribar las murallas de fuera, rebajar las torres, rellenar el foso con piedras y destruir los puentes, para que nunca más pudiera defenderse.',
    now: 'En el siglo XX se restauró y hoy se puede visitar. Cada año, a principios de marzo, miles de personas caminan hasta aquí desde toda Navarra en la Javierada.',
    host: { name: 'Garazi, guía del castillo', look: { shirt: '#f2ece0', vest: '#7a2a3a', skirt: '#3a3530', hair: '#4a3020', ponytail: true, female: true } },
  },
  olite: {
    title: 'El palacio real de Olite', size: 1.35,
    intro: ['El palacio real de Olite parece de cuento. Lo mandó construir sobre todo el rey Carlos III el Noble, hace más de 600 años.',
      'Tenía jardines colgantes, una leonera con leones de verdad y muchas torres con nombre propio, como la de las Tres Coronas o la de los Cuatro Vientos. ¡Recorre sus partes!'],
    parts: ['foso', 'puerta', 'almenas', 'torre', 'pozo'],
    own: { pozo: { name: 'Jardines y leonera', text: 'Dentro del palacio había jardines en lo alto de las galerías, con naranjos y parras, y una leonera: los reyes tenían leones y otros animales traídos de lejos.' } },
    then: 'Fue la corte de los reyes de Navarra: fiestas, músicos y trovadores. Después de la conquista se fue abandonando y en 1813 un incendio lo dejó en ruinas.',
    now: 'En el siglo XX se reconstruyó y hoy es uno de los castillos más visitados de España. Cada verano se celebra allí un festival de teatro clásico.',
    host: { name: 'Íñigo, guía del palacio', look: { shirt: '#efe9dc', vest: '#7a5a2a', pants: '#3a3530', hair: '#2e2018' } },
  },
  cortes: {
    title: 'El castillo de Cortes', size: 1,
    intro: ['El castillo de Cortes guardaba el sur del reino, junto a la frontera con Aragón. Con los años se convirtió en un castillo-palacio.', '¡Busca las banderas y descubre sus partes!'],
    parts: ['foso', 'puerta', 'almenas', 'torre', 'pozo'], own: {},
    then: 'Era una fortaleza de frontera: desde sus torres se vigilaba el valle del Ebro y los caminos que llegaban de Aragón.',
    now: 'Hoy está restaurado y se usa para actos y visitas. Muy cerca pasa el Canal Imperial de Aragón.',
    host: { name: 'Pilar, guía del castillo', look: { shirt: '#f2ece0', vest: '#3a5a8a', skirt: '#3a3530', hair: '#2a1a12', bun: true, female: true } },
  },
  marcilla: {
    title: 'El castillo que salvó una mujer', size: 1,
    intro: ['Este es el castillo de Marcilla, del siglo XV, con su foso alrededor. Tiene una historia increíble.',
      'En 1516 llegaron soldados con la orden del cardenal Cisneros de derribarlo. Pero la marquesa de Falces, Ana de Velasco, se quedó al mando y se negó a entregarlo… ¡y los soldados se tuvieron que ir!',
      'Fue el único castillo que se libró de las órdenes de derribo. Recorre sus partes y verás por qué era tan difícil de tomar.'],
    parts: ['foso', 'puerta', 'almenas', 'torre', 'pozo'],
    own: { torre: { name: 'La torre de la marquesa', text: 'Desde lo alto de las torres se veía llegar a cualquiera por la llanura. Ana de Velasco mandó guardar comida y preparar la defensa: un castillo bien abastecido podía resistir mucho tiempo.' } },
    then: 'Tras la conquista de Navarra (1512), muchos castillos se derribaron para que no pudieran usarse contra el nuevo rey. El de Marcilla se salvó gracias a Ana de Velasco.',
    now: 'Hoy es del Ayuntamiento de Marcilla, está restaurado y se usa para exposiciones, conciertos y visitas.',
    host: { name: 'Ana, guía del castillo', look: { shirt: '#f2ece0', vest: '#8a2a2a', skirt: '#2b2630', hair: '#6b3b1f', bun: true, female: true } },
  },
};

// todos los castillos del reino (se muestran al terminar cada visita)
export const CASTILLOS = [
  ['Palacio real de Olite', 'En pie y reconstruido. Corte de Carlos III el Noble.'],
  ['Castillo de Javier', 'En pie y restaurado. Cuna de San Francisco Javier.'],
  ['Castillo de Marcilla', 'En pie. Lo salvó Ana de Velasco en 1516.'],
  ['Castillo de Cortes', 'En pie. Castillo-palacio de la frontera del Ebro.'],
  ['Castillo de Amaiur', 'Ruinas. Último refugio de los defensores de Navarra en 1522.'],
  ['Castillo de Irulegi', 'Ruinas en lo alto del monte, junto a Pamplona.'],
  ['Castillo de Tiebas', 'Ruinas de un castillo-palacio de los reyes de Navarra del siglo XIII.'],
  ['Castillo de Monjardín', 'Ruinas en la cima, sobre Villamayor de Monjardín.'],
  ['Castillo de Peralta', 'Ruinas en la peña, sobre la villa.'],
];
