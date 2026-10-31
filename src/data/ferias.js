// Ferias de ganado: el gran mercado del campo. En otoño, cuando el ganado baja del monte, los pueblos se llenan
// de vacas, ovejas y caballos; se compra, se vende, se cierra el trato con un apretón de manos y se premia a los
// mejores animales. Textos para la misión «Feria de ganado».
export const FERIA = {
  intro: [
    'En otoño, cuando el ganado baja de los pastos del monte, en muchos pueblos de Navarra se celebra la feria de ganado.',
    'Vienen ganaderos de todo el valle con sus vacas, bueyes, caballos, burros, ovejas, cabras y cerdos. Se compra, se vende… ¡y se presume de animales!',
    'Recorre los corrales y conoce a cada animal. Luego, en la pista del concurso, serás juez por un día.',
  ],
  judge: { q: 'Para premiar a un animal, el jurado mira si está sano y fuerte. ¿Cuál de estas vacas elegirías?', options: ['Pelo brillante, ojos vivos, come con ganas y camina firme', 'Muy flaca, con los ojos tristes y cojeando', 'La más grande aunque esté cansada y no coma'], answer: 0, why: 'Un animal sano tiene el pelo brillante, los ojos vivos, buen apetito y camina sin cojear. Los ganaderos lo saben de un vistazo.' },
  deal: { q: 'En las ferias de antes, ¿cómo se cerraba un trato entre dos ganaderos?', options: ['Con un apretón de manos: la palabra valía más que un papel', 'Firmando en un ordenador', 'Echándolo a suertes con una moneda'], answer: 0, why: 'Se regateaba el precio y, al llegar a un acuerdo, se daban la mano delante de testigos. Romper ese trato era una gran vergüenza.' },
  then: 'El ganado llegaba andando desde los valles por los caminos y las cañadas. Los tratantes, con su blusa negra y su vara, compraban y vendían; los tratos se cerraban con un apretón de manos y se pagaba en mano. La feria era también fiesta: se comía, se bailaba y se veía a la familia de otros pueblos.',
  now: 'Hoy el ganado viaja en camión y muchas ventas se hacen en subastas y lonjas, con cada animal identificado con su crotal en la oreja. Pero las ferias siguen vivas: hay concursos de las razas del país —vaca pirenaica, oveja latxa, pottoka, caballo burguete— y el pueblo entero sale a verlas.',
  breeds: [
    ['Vaca pirenaica', 'Rubia y fuerte, aguanta el frío del monte. Es una raza del Pirineo.'],
    ['Oveja latxa', 'Cara oscura y lana larga. Con su leche se hacen los quesos Idiazabal y Roncal.'],
    ['Caballo burguete', 'Caballo de monte, robusto y tranquilo, de los valles del Pirineo navarro.'],
  ],
};
// Los corrales de la feria, uno por animal: [especie del juego, cuántos, ancho y fondo del corral (m), ficha de fauna o
// null, nombre en el cartel, icono, lo que cuenta el ganadero]. Los que no tienen ficha de fauna (bueyes y burro) se
// explican con una tarjeta. Pocos animales por corral: cada uno son varias llamadas de dibujo en el iPhone
export const CORRALES = [
  ['cow', 2, 10, 7, 'vaca', 'Vaca pirenaica', 'cow', ''],
  ['cabestro', 2, 10, 7, null, 'Bueyes', 'bull', 'Los bueyes son toros mansos, grandes y tranquilos. Antes, en pareja y con el yugo, tiraban del carro y del arado; hoy todavía se ven en las pruebas de arrastre de piedra, las idi probak.'],
  ['pottoka', 2, 8, 6, 'pottoka', 'Pottoka', 'horse', ''],
  ['burro', 1, 7, 6, null, 'Burro', 'horse', 'El burro es fuerte, paciente y sufrido: aguanta mucha carga y anda seguro por los caminos de piedra. Llevaba la leña, la hierba y los sacos del molino, y tiraba de la noria del huerto.'],
  ['sheep', 4, 8, 6, 'oveja', 'Oveja latxa', 'latxa', ''],
  ['goat', 2, 7, 6, 'cabra', 'Cabra', 'sheep', ''],
  ['pig', 2, 7, 6, 'cerdo', 'Euskal txerria', 'pig', ''],
];
// pueblos con feria de ganado y quién la presenta (fechas y datos: archivos de patrimonio inmaterial de Navarra y prensa)
export const FERIA_TOWNS = {
  estella: { title: 'La feria de San Andrés', note: 'En Estella, la feria de San Andrés, a finales de noviembre, es una de las más conocidas de Navarra.' },
  elizondo: { title: 'Feria de ganado del Baztan', note: 'En Elizondo se celebra el concurso nacional de vaca pirenaica, con cientos de animales, y en otoño, pasado San Lucas, la feria del valle.' },
  'altsasu-alsasua': { title: 'Feria de ganado de Sakana', note: 'Sakana es tierra de paso entre montañas: aquí se juntaban ganaderos de Urbasa, Andia y Aralar.' },
  lesaka: { alFinal: true, title: 'Las ferias de Lesaka', note: 'Las ferias de Lesaka son de las más antiguas de Navarra: se concedieron en 1499. Cada noviembre la plaza se llena de ganado y se premia a la mejor vaca pirenaica y a la mejor pottoka.' },
  lumbier: { alFinal: true, title: 'Las ferias de Lumbier', note: 'Lumbier tenía dos ferias al año: la grande, a finales de mayo, con vacas y caballerías, y la pequeña, a finales de noviembre, con ovejas y cerdos.' },
  lekunberri: { alFinal: true, title: 'La feria de Lekunberri', note: 'En Lekunberri, la feria de Nekazari Eguna, el día del campo, junta caballos y pottokas de Larraun. Empezó en los años ochenta y se recuperó en 2024.' },
};
