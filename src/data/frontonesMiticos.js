// LOS FRONTONES MÍTICOS: réplicas de los frontones de verdad más importantes de Navarra, Euskadi, La Rioja y el Beti Jai de
// Madrid, para jugar en ellos y, más adelante, comprarlos (el autor, 28 nov 2026: «réplicas exactas de frontones importantes,
// con todos sus graderíos, con todos los rebotes, cristaleras, todo lo que tengan»; «todos los detalles al más mínimo
// detalle»). Solo datos: court.js los monta (opts.mitico = sala; miticoSala) y fronton.js realVenue los pone en el juego;
// se llevan tal cual a otro motor (PORTAR.md).
// Cada uno, como los de data/frontones.js (la ficha del menú «Frontones») y además:
//  · look: los colores de la cancha (frontis y pared izquierda, suelo de la cancha, contracancha, rayas, la chapa de abajo
//    y si es de metal, las butacas), sacados de sus fotos; parquet: la contracancha de tarima, de su color
//  · arq / arqX: la arquitectura de base del cubierto (court.js ARQ) y lo que cambia: el techo (claraboyas, tablas…), la
//    pared de detrás de la grada (bloques…), el fondo
//  · sala: el alto del techo; la grada (filas, fondo y subida de cada escalón, en metros); la banda de arriba del frontis y
//    de la pared izquierda (desde qué altura, cuánto mide, su color, sus rayas de abajo arriba y el letrero); las cortinas
//    (la del rebote desde qué altura y la de junto al frontis, desde dónde y de qué ancho); el marcador ('led', el negro de
//    cifras rojas; 'tv', la pantalla; 'tabla', la tablilla antigua); y los rótulos (rotulos): lo que lleva pintado o colgado
//    en sus paredes, con su tamaño en metros (el nombre del pueblo, el escudo, los carteles, el mural, la pantalla)
//  · escalon y precio: lo que cuesta en la tienda (txanponak); fuentes: de dónde salen las medidas y los colores
export const ESCALONES = { clasico: 1500, mitico: 3000, leyenda: 5000 };

export const MITICOS = [
  {
    // (como está hoy, por la foto de dominio público de Zarateman, «Vitoria - Frontón Ogueta 06»: paredes verdes, los postes
    // y la raya de la falta amarillos, banda azul arriba con su raya amarilla, tarima rojiza y butacas granates con azules.
    // La de 2010, con la banda blanca y las rayas naranjas, es de antes de la reforma)
    id: 'ogueta', nombre: 'Frontón Ogueta', lugar: 'Vitoria-Gasteiz', territorio: 'alava', tipo: 'izquierda', cubierto: true, anio: 1979, aforo: 2155,
    medidas: 'Corto, 36 m', historia: 'Lleva el nombre del mejor pelotari alavés, Ogueta, dos veces campeón manomanista. El de la Blanca y de 14 finales del Cuatro y Medio.',
    escalon: 'mitico', cancha: 'fr-ogueta',
    look: { frontis: '#2e6b50', wall: '#2e6b50', floor: '#3f4743', contra: '#a04a28', parquet: '#a04a28', line: '#f4f2ec', mark: '#f2c230', numeros: '#f2c230', rayaFrontis: '#f2c230', chapa: '#2b2b30', chapaMetal: false, marco: '#f2c230', seat: '#b55a32', seat2: '#2f5fc4', stone: null },
    arq: 'pabellon', arqX: { techo: 'claraboyas', derecha: 'bloques', claro: '#bdb6aa', fondo: '#bdb6aa' },
    sala: {
      alto: 17, filas: 20, fondo: 0.82, subida: 0.55, marcador: 'led', columnas2: [[11.2, 12.4], [21.2, 22.4], [27.6, 28.6]],
      banda: { desde: 10, alto: 2.4, color: '#2a58b8', arriba: '#24489a', rayas: [] },
      cortina: { color: '#2a58b8', desde: 2.6, ancho: 3.2 },
      // (en la pared izquierda, encima del 5, el «Vitoria-Gasteiz» grande y blanco de la foto, con su «!»; por debajo de la chapa de arriba, que aquí la pared mide 8,5 m)
      rotulos: [{ en: 'izq', z: 17.5, y: 6.2, fuente: 'cond', peso: '800', al: 'left', color: '#f4f4f0', marca: '!',
        lineas: [{ t: 'VITORIA', alto: 0.95 }, { t: 'GASTEIZ', alto: 0.95 }, { t: 'green capital', alto: 0.45, peso: '700' }] }],
    },
    fuentes: ['https://es.wikipedia.org/wiki/Front%C3%B3n_Ogueta', 'https://commons.wikimedia.org/wiki/File:Vitoria_-_Front%C3%B3n_Ogueta_06.jpg', 'https://commons.wikimedia.org/wiki/File:Ogeta_pilotalekua_1.jpg', 'https://commons.wikimedia.org/wiki/File:Ogetapilotalekua.jpg'],
  },
  {
    id: 'astelena', nombre: 'Frontón Astelena', lugar: 'Éibar', territorio: 'gipuzkoa', tipo: 'izquierda', cubierto: true, anio: 1904, aforo: 1250,
    medidas: 'Corto, 41 × 11 m y 9 m de alto', historia: '«La catedral de la pelota a mano»: nueve finales del Manomanista. Se inauguró el día de San Juan de 1904.',
    escalon: 'leyenda', cancha: 'fr-astelena',
    look: { frontis: '#22806f', wall: '#22806f', floor: '#3e4a45', contra: '#b06a48', parquet: '#b46c48', line: '#f4f2ec', mark: '#e0482c', chapa: '#c9ccd0', chapaMetal: true, marco: '#eef1f6', seat: '#7a4a2c', seat2: '#5e3820', stone: null },
    arq: 'pabellon', arqX: { techo: 'tablas', derecha: 'claro', claro: '#efeeec', fondo: '#f1f0ee' },
    sala: {
      alto: 12.6, filas: 11, fondo: 0.8, subida: 0.44, marcador: 'tv',
      banda: { desde: 10, alto: 2.6, color: '#1f5fe0', arriba: '#1f5fe0', rayas: [{ y: 0, h: 0.1, c: '#f4f6fb' }] },
      cortina: { color: '#2b6fe8', desde: 1.2, ancho: 1.6 },
      // (como en la foto: en la pared izquierda, hacia el cuatro, el escudo de Eibar con «Eibarko Udala»; abajo a la derecha
      // del frontis, el cartel blanco «Eibarko Kirol Patronatua»; y en la pared blanca de encima de la grada, el pelotari pintado)
      rotulos: [
        { en: 'izq', z: 14, y: 6.6, escudo: { alto: 1.1 }, color: '#f3efe2', lineas: [{ t: 'EIBARKO UDALA', alto: 0.3, fuente: 'serif', peso: '700' }] },
        { en: 'frente', x: 7.1, y: 0.62, ancho: 3.4, alto: 0.6, fondo: '#f4f4f2', borde: '#d6402e', color: '#1d3f8f', lineas: [{ t: 'Eibarko Kirol Patronatua', alto: 0.26, peso: '700', fuente: 'cond' }] },
        { en: 'frente', tipo: 'mural', x: 10.4, y: 8.6, ancho: 2.2, alto: 3.0 },
      ],
    },
    fuentes: ['https://es.wikipedia.org/wiki/Front%C3%B3n_Astelena', 'https://commons.wikimedia.org/wiki/File:Astelena_pilotalekua.jpg'],
  },
  {
    // (por las tres fotos que pasó el autor el 28 nov 2026 y su ficha de Wikipedia: la pared izquierda lisa y clara, el frontis
    // gris, la grada en media elipse de cuatro plantas con columnas de hierro rojizas y barandillas blancas de forja, techos de
    // madera y la fachada de ladrillo rojo y estuco blanco junto al frontis; al aire libre. court.js betiJai)
    id: 'beti-jai', nombre: 'Frontón Beti Jai', lugar: 'Madrid', territorio: 'madrid', tipo: 'izquierda', cubierto: false, anio: 1894, aforo: 4000,
    medidas: 'Largo, al aire libre', historia: 'De Joaquín Rucoba, el de la plaza de toros de la Malagueta. Cerró en 1919, fue taller de Citroën y es Bien de Interés Cultural desde 2011.',
    escalon: 'leyenda', cancha: 'fr-beti-jai',
    look: { frontis: '#9c9d98', wall: '#c9ccca', floor: '#8a867f', contra: '#958f86', line: '#f6f3ec', mark: '#c8322c', chapa: '#6f706c', chapaMetal: false, marco: '#6f706c', cap: '#efe9dc', stone: null, roof: null, red: false },
    // (contracancha ancha, de 20 m con la cancha; marcador de tablilla, negro con letra blanca; alrededor, las casas de Chamberí)
    sala: { tipo: 'betijai', marcador: 'tabla' },
    fuentes: ['https://es.wikipedia.org/wiki/Front%C3%B3n_Beti_Jai'],
  },
];
export const miticoDe = (id) => MITICOS.find(m => m.id === id) || null;
