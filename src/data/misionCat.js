// Las misiones por categorías, cada una con su color: así se distinguen de un vistazo y contrastan sobre la portada, igual
// en la ficha del mapa, en la ficha del pueblo, en las tarjetas y, dentro del pueblo, en el panel de sus misiones (la
// variable --mc). Siete tonos bien separados: patrimonio, amarillo; oficios y productos, rojo anaranjado; campo y
// naturaleza, verde; fiestas, rosa; leyendas, violeta; preguntas, azul; deporte y monte, turquesa.
export const CAT = { visit: 'pat', castle: 'pat', dolmen: 'pat', figure: 'pat', process: 'ofi', harvest: 'ofi', trade: 'ofi', herd: 'cam', feria: 'cam', observe: 'cam', mirador: 'cam',
  dance: 'fie', carnival: 'fie', tradition: 'fie', legend: 'ley', quiz: 'sab', race: 'dep', summit: 'dep', pelota: 'dep' };
export const CAT_COLOR = { pat: '#ffd23f', ofi: '#ff6b4a', cam: '#5cd65c', fie: '#ff5fb0', ley: '#a77bff', sab: '#4f9dff', dep: '#2fd6c6' };
// (las de la aventura del valle de Salazar, en Otsagabia, no tienen tipo: su categoría por la misión)
export const Q_CAT = { bienvenida: 'pat', escudos: 'pat', ovejas: 'cam', pelota: 'dep', irati: 'cam', basajaun: 'ley', lamia: 'ley', zarratrako: 'fie', muskilda: 'fie' };
/** El color de una misión por su tipo (o por su categoría, si se da). */
export const misionColor = (type, cat) => CAT_COLOR[cat || CAT[type]] || '#c9b8ff';
