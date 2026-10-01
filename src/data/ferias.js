// Ferias de ganado: el gran mercado del campo. En otoño, cuando el ganado baja del monte, los pueblos se llenan
// de vacas, ovejas y caballos; se compra, se vende, se cierra el trato con un apretón de manos y se premia a los
// mejores animales. Textos para la misión «Feria de ganado».
export const FERIA = {
  intro: [
    'En otoño, cuando el ganado baja de los pastos del monte, en muchos pueblos de Navarra se celebra la feria de ganado.',
    'Vienen ganaderos de todo el valle con sus vacas, ovejas y caballos. Se compra, se vende… ¡y se presume de animales!',
    'Hoy serás juez por un día: ve a los corrales y fíjate bien en los animales.',
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
// pueblos con feria de ganado y quién la presenta
export const FERIA_TOWNS = {
  estella: { title: 'La feria de San Andrés', note: 'En Estella, la feria de San Andrés, a finales de noviembre, es una de las más conocidas de Navarra.' },
  elizondo: { title: 'Feria de ganado del Baztan', note: 'En el Baztan, valle de caseríos y prados, las vacas y las pottokas son las protagonistas.' },
  'altsasu-alsasua': { title: 'Feria de ganado de Sakana', note: 'Sakana es tierra de paso entre montañas: aquí se juntaban ganaderos de Urbasa, Andia y Aralar.' },
};
