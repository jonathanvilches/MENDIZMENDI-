// Tiendas de productos locales: el producto estrella de cada comarca (con la historia que cuenta quien atiende),
// lo que se vende y lo que se acepta a cambio (trueque) con lo que sale del campo y de la ganadería.
// Los precios van en txanponak (monedas) que se ganan en las misiones.

// productos del campo y de la ganadería que se consiguen ayudando en las tareas rurales y sirven para el trueque
export const GOODS = {
  leche: { name: 'Leche', eu: 'Esnea', icon: 'milk', v: 4, from: 'ordeñando con la ganadera' },
  lana: { name: 'Lana', eu: 'Artilea', icon: 'wool', v: 5, from: 'esquilando con el pastor' },
  huevos: { name: 'Huevos', eu: 'Arrautzak', icon: 'egg', v: 3, from: 'del gallinero del caserío' },
  trigo: { name: 'Trigo', eu: 'Garia', icon: 'wheat', v: 3, from: 'segando y trillando en la era' },
  patatas: { name: 'Patatas', eu: 'Patatak', icon: 'potato', v: 3, from: 'cavando en la huerta' },
  maiz: { name: 'Maíz', eu: 'Artoa', icon: 'corn', v: 3, from: 'deshojando mazorcas' },
};

// lo que se vende en todas las tiendas (precio en txanponak)
export const STOCK = { pan: 3, manzana: 2, queso: 6, miel: 5, txistorra: 6, avellanas: 3, cuajada: 4, almendras: 4 };

// producto estrella de cada comarca: lo que se trae de la tienda… y su historia
export const STAR = {
  bidasoa: { food: 'cuajada', name: 'Cuajada de los valles', eu: 'Mamia', text: 'La cuajada se hacía en el caserío con leche de oveja latxa recién ordeñada. Antes se calentaba metiendo piedras al rojo en el kaiku, el cuenco de madera: por eso a veces sabe un poco a quemado. Se toma con miel o con azúcar.' },
  'larraun-leitzaldea': { food: 'talo', name: 'Talo con txistorra', eu: 'Taloa', text: 'El talo es una torta de harina de maíz y agua que se cuece sobre una plancha de hierro. Era el pan de los caseríos cuando el trigo no se daba bien en estos valles húmedos. Hoy se come en ferias y fiestas, con txistorra o con queso.' },
  sakana: { food: 'queso', name: 'Queso de Urbasa y Andia', eu: 'Gazta', text: 'Los pastores suben con el rebaño de ovejas latxas a las sierras de Urbasa y Andia en primavera. Allí, en las txabolas, hacen el queso con la leche cruda; algunos lo ahúman un poco. Es de la familia del queso Idiazabal.' },
  pamplona: { food: 'txistorra', name: 'Txistorra', eu: 'Txistorra', text: 'La txistorra es un embutido fino y tierno, hecho con carne picada, pimentón y ajo, que se fríe en un momento. En San Fermín y en las ferias de invierno, un bocadillo de txistorra es el almuerzo de muchos pamploneses.' },
  pirineo: { food: 'queso', name: 'Queso del Roncal', eu: 'Erronkariko gazta', text: 'Fue el primer queso de España con denominación de origen, en 1981. Se hace solo en los siete pueblos del valle de Roncal, con leche cruda de oveja latxa o rasa. Los pastores pasaban el invierno en las Bardenas y volvían al valle en verano: la trashumancia.' },
  prepirineo: { food: 'miel', name: 'Miel del Prepirineo', eu: 'Eztia', text: 'En los montes del Prepirineo hay brezo, romero, tomillo y castaños. Las abejas hacen con sus flores una miel oscura y de mucho sabor. Antes las colmenas se hacían con troncos huecos o con cestos de mimbre tapados con barro.' },
  sanguesa: { food: 'pochas', name: 'Pochas', eu: 'Babarrun zuriak', text: 'Las pochas son alubias blancas que se recogen a finales del verano, antes de que se sequen. Se cocinan frescas, con verduras de la huerta, y se comen en otoño. En la Navarra media es un plato de cuadrilla y de fiesta.' },
  'tierra-estella': { food: 'pimientos', name: 'Pimiento del piquillo', eu: 'Piquillo piperra', text: 'El piquillo es un pimiento rojo pequeño, terminado en pico. Se cultiva en las vegas del Ebro, como en Lodosa, y se asa a la llama, se pela a mano sin agua y se embota. Así lo hacían las familias en otoño.' },
  'valdizarbe-novenera': { food: 'almendras', name: 'Almendras del valle', eu: 'Almendrak', text: 'Entre viñas y campos de cereal crecen los almendros, que florecen al final del invierno y llenan el valle de blanco. Las almendras se recogen a finales del verano, se secan al sol y se guardan todo el año.' },
  'zona-media': { food: 'uvas', name: 'Uvas de Olite', eu: 'Mahatsak', text: 'En la Zona Media hay viñas desde hace siglos: los reyes de Navarra tenían bodega en el palacio de Olite. En la vendimia, en septiembre, se recogen los racimos a mano. Del zumo de la uva, el mosto, se hace luego el vino.' },
  'ribera-alta': { food: 'esparragos', name: 'Espárrago de Navarra', eu: 'Zainzuriak', text: 'El espárrago blanco crece bajo tierra, en caballones de arena, y por eso no se pone verde. Se recoge de madrugada en primavera, con una gubia, antes de que la punta asome al sol. Tiene denominación de origen.' },
  ribera: { food: 'alcachofa', name: 'Alcachofa de Tudela', eu: 'Orburua', text: 'La alcachofa de Tudela se planta en verano y se recoge en invierno y primavera, cuando sus hojas están bien cerradas. Las huertas de la Ribera se riegan con el agua del Ebro por acequias que vienen de los tiempos de al-Ándalus.' },
};

// quien atiende la tienda, según la comarca
export const SHOPKEEPERS = ['Arantxa', 'Itziar', 'Josu', 'Maite', 'Patxi', 'Nekane', 'Koldo', 'Amaia'];
