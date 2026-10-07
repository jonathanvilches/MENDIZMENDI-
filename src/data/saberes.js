// Lo más importante del juego: aprender Navarra jugando. Cada carta que se gana (al visitar, ayudar, observar, leer un
// escudo…) se cuenta en uno de estos saberes, y la portada, el cuaderno y los deportes los muestran.
export const SABERES = [
  { id: 'producto', name: 'Producto local', icon: 'cheese', text: 'Quesos, verduras, vino y dulces de cada comarca y cómo se hacen' },
  { id: 'agricultura', name: 'Agricultura', icon: 'wheat', text: 'Huertas, cereal, viña y olivo: qué se siembra y cuándo' },
  { id: 'ganaderia', name: 'Ganadería', icon: 'sheep', text: 'Ovejas latxas, vacas, pastores y ferias' },
  { id: 'oficios', name: 'Oficios', icon: 'anvil', text: 'Herreros, canteros, almadieros y otros oficios de antes' },
  { id: 'arquitectura', name: 'Arquitectura', icon: 'church', text: 'Iglesias, casas, puentes, palacios y castillos' },
  { id: 'escudos', name: 'Escudos', icon: 'shield', text: 'Lee los escudos de las fachadas: esmaltes, figuras y familias' },
  { id: 'historia', name: 'Historia', icon: 'castle', text: 'Reyes, castillos, dólmenes y personajes que dejaron huella' },
  { id: 'tradiciones', name: 'Tradiciones', icon: 'mask', text: 'Danzas, carnavales, leyendas, pelota y fiestas' },
  { id: 'fauna', name: 'Fauna', icon: 'binoculars', text: 'Aves, mamíferos y animales de la granja' },
  { id: 'flora', name: 'Flora', icon: 'leaf', text: 'Árboles y plantas de cada comarca' },
  { id: 'montes', name: 'Montes', icon: 'peak', text: 'Cimas, valles y paisajes desde los miradores' },
];
// misión → saber de su carta
export const CAT_BY_TYPE = { process: 'producto', harvest: 'agricultura', herd: 'ganaderia', feria: 'ganaderia', trade: 'oficios', visit: 'arquitectura', castle: 'historia', dolmen: 'historia', figure: 'historia', quiz: 'historia', dance: 'tradiciones', carnival: 'tradiciones', tradition: 'tradiciones', legend: 'tradiciones', race: 'tradiciones', pelota: 'tradiciones', summit: 'montes', mirador: 'montes', observe: 'fauna' };
const PREFIX = { campo: 'agricultura', fauna: 'fauna', flora: 'flora', monte: 'montes', granja: 'ganaderia', escudo: 'escudos', pueblo: 'tradiciones', castillo: 'historia', dolmen: 'historia', cave: 'historia' };
/** Saber de una carta: por su prefijo o por lo que se anotó al ganarla. */
export function catOf(id, p) { const pre = id.split(':')[0]; return PREFIX[pre] || p?.cardCat?.[id] || 'historia'; }
/** Cuántas cartas hay de cada saber. */
export function saberCounts(p) { const n = Object.fromEntries(SABERES.map(s => [s.id, 0])); for (const c of p.cards || []) { const k = catOf(c, p); if (k in n) n[k]++; } return n; }

// Datos de Navarra comprobados, para los deportes y las esperas (de las fuentes oficiales de calidad y de patrimonio)
export const DATOS = [
  'Navarra tiene quesos con Denominación de Origen Protegida: el Roncal, hecho solo con leche de oveja latxa y rasa del valle de Roncal, y el Idiazabal.',
  'El pimiento del piquillo de Lodosa tiene Denominación de Origen Protegida: se asa a la llama y se pela a mano.',
  'La alcachofa de Tudela y el espárrago de Navarra tienen Indicación Geográfica Protegida.',
  'La ternera de Navarra y el cordero de Navarra también tienen Indicación Geográfica Protegida.',
  'El pacharán navarro se hace macerando endrinas en anís. Tiene su propia indicación geográfica.',
  'El aceite de Navarra tiene Denominación de Origen Protegida: sale de olivos de la Ribera y de Tierra Estella.',
  'El escudo ajedrezado de plata y sable es el del valle de Baztán: sus vecinos tenían hidalguía colectiva y lo lucían en sus casas.',
  'Las armas de Navarra son unas cadenas de oro sobre fondo rojo (gules) con una esmeralda en el centro.',
  'Santa María de Eunate es una iglesia románica de planta octogonal, junto al Camino de Santiago.',
  'El románico navarro empieza en el monasterio de Leyre y se extiende siguiendo el Camino de Santiago.',
  'La portada de Santa María la Real de Sangüesa es una de las más ricas del románico: está llena de figuras talladas.',
  'En las casas del norte, el dintel de la puerta (atalburu) llevaba a veces grabados el año, los nombres de la pareja y símbolos de buena suerte.',
  'El eguzkilore, una flor de cardo seca, se colgaba en la puerta de las casas para protegerlas de los malos espíritus y las tormentas.',
  'En un escudo, la derecha es la izquierda de quien lo mira: se describe como si lo llevaras puesto.',
];
