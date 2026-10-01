// Equipo del explorador: lo que se lleva al monte, para qué sirve y cómo se consigue.
// Y la comida que se va guardando en la mochila (cuánta energía da y un dato de dónde sale).
export const GEAR = {
  mochila: { name: 'Mochila', icon: 'backpack', use: 'Para llevar el agua, la comida y lo que encuentres. Con las correas bien ajustadas, el peso va pegado a la espalda.', how: 'La tienes desde el principio.' },
  cantimplora: { name: 'Cantimplora', icon: 'canteen', use: 'Al monte siempre con agua: el cuerpo la necesita para no cansarse. Llénala en las fuentes de los pueblos.', how: 'Bebe en la fuente de una plaza.' },
  prismaticos: { name: 'Prismáticos', icon: 'binoculars', use: 'Para ver aves y animales de lejos sin molestarlos. Ahora puedes usarlos en cualquier sitio (botón de los prismáticos o tecla F).', how: 'Haz una misión de naturaleza (observar aves y animales).' },
  cuaderno: { name: 'Cuaderno de campo', icon: 'book', use: 'Aquí apuntan los naturalistas lo que ven: qué animal, dónde y cuándo. Tus fichas se guardan en él.', how: 'Descubre tu primer animal del monte.' },
  baston: { name: 'Makila (bastón de monte)', icon: 'stick', use: 'Ayuda a no resbalar en las bajadas y a repartir el esfuerzo: subiendo con bastón te cansas bastante menos.', how: 'Llega a tu primera cima.' },
  brujula: { name: 'Brújula', icon: 'compass', use: 'La aguja roja siempre señala el norte. Con ella y un mapa no te pierdes aunque haya niebla.', how: 'Completa cinco misiones.' },
  farol: { name: 'Farol', icon: 'lantern', use: 'De noche alumbra el camino. Antes se usaban faroles de aceite o de carburo; ahora, linternas de pilas.', how: 'Vive tu primera noche de leyenda.' },
};
export const GEAR_ORDER = ['mochila', 'cantimplora', 'prismaticos', 'cuaderno', 'baston', 'brujula', 'farol'];

export const FOOD = {
  pan: { name: 'Pan', icon: 'bread', e: 25, fact: 'Pan del horno del pueblo. Los pastores llevaban pan y queso en el zurrón para todo el día.' },
  moras: { name: 'Moras', icon: 'berries', e: 12, fact: 'Las zarzamoras maduran a final del verano en los bordes de los caminos. Coge solo frutos que conozcas bien.' },
  avellanas: { name: 'Avellanas', icon: 'hazelnut', e: 18, fact: 'El avellano crece en el borde del bosque y da avellanas en otoño. Tienen mucha energía.' },
  manzana: { name: 'Manzana', icon: 'apple', e: 18, fact: 'De los manzanos de la huerta. En los caseríos, con las manzanas también se hace sidra.' },
  queso: { name: 'Queso', icon: 'cheese', e: 35, fact: 'Queso de oveja hecho con leche del rebaño. Alimenta mucho y aguanta días en la mochila.' },
  cuajada: { name: 'Cuajada', icon: 'milk', e: 25, fact: 'Leche de oveja cuajada, a veces con miel o azúcar.' },
  miel: { name: 'Miel', icon: 'honey', e: 25, fact: 'La hacen las abejas con el néctar de las flores. Da energía muy rápido.' },
  txistorra: { name: 'Txistorra', icon: 'chistorra', e: 35, fact: 'Embutido fino de Navarra. Un bocadillo de txistorra es el almuerzo de muchas fiestas.' },
  pimientos: { name: 'Pimientos asados', icon: 'pepper', e: 15, fact: 'Pimientos del piquillo asados y pelados a mano.' },
  uvas: { name: 'Uvas', icon: 'grapes', e: 15, fact: 'Racimo de uvas de la viña. Las mismas uvas que se pisaban para hacer el mosto.' },
  tomate: { name: 'Tomate', icon: 'tomato', e: 10, fact: 'Tomate de la huerta de la Ribera, regada por el agua del río.' },
  almendras: { name: 'Almendras', icon: 'almond', e: 20, fact: 'Los almendros florecen a final del invierno: son los primeros árboles en ponerse blancos.' },
};
// producto de una misión → comida que se guarda en la mochila
export function foodFrom(text = '') {
  const t = text.toLowerCase();
  return /queso/.test(t) ? 'queso' : /cuajada/.test(t) ? 'cuajada' : /miel/.test(t) ? 'miel' : /txistorra|chistorra/.test(t) ? 'txistorra'
    : /pimiento|piquillo/.test(t) ? 'pimientos' : /harina|pan|molino/.test(t) ? 'pan' : /uva|vino/.test(t) ? 'uvas' : /manzana/.test(t) ? 'manzana'
    : /tomate/.test(t) ? 'tomate' : /almendra/.test(t) ? 'almendras' : null;
}
