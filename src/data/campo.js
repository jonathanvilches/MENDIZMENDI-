// Gente del campo que explica su trabajo: el pastor con su rebaño y la ganadera con sus vacas.
// Cada uno cuenta qué hace, por qué, y cómo era antes y cómo es ahora.
export const PASTOR_INFO = (fam) => ({
  icon: 'sheep', title: 'El pastor y su rebaño',
  lines: fam === 'ribera' || fam === 'central'
    ? ['¡Kaixo! Soy pastor. Estas son ovejas rasas navarras: aguantan bien el calor y la sequía de esta tierra.',
      'Cada mañana saco el rebaño a pastar por los rastrojos y las cunetas, y por la tarde lo traigo a la paridera.',
      'Mi perro me ayuda a juntarlas. Le doy órdenes con silbidos: uno para ir a la derecha, otro para la izquierda, otro para parar.',
      'Los pastores del Roncal bajan cada otoño con sus ovejas hasta las Bardenas por la Cañada Real. ¡Son más de cien kilómetros andando! Eso es la trashumancia.']
    : ['¡Kaixo! Soy pastor. Estas son ovejas latxas, las de la cara negra y la lana larga.',
      'En verano subimos el rebaño a los pastos altos del monte, donde la hierba está fresca. En otoño bajamos al valle.',
      'Mi perro me ayuda a juntarlas. Le doy órdenes con silbidos: uno para ir a la derecha, otro para la izquierda, otro para parar.',
      'Con la leche de las latxas se hace el queso Idiazabal. Cada oveja da poca leche, ¡por eso el queso es tan valioso!'],
  then: 'El pastor pasaba meses en el monte durmiendo en la borda o la txabola. Ordeñaba a mano, oveja por oveja, y hacía el queso allí mismo.',
  now: 'Hay máquinas de ordeño, y algunos rebaños llevan collares con GPS para encontrarlos en el monte. Pero el perro y el silbido siguen siendo lo más útil.',
});

export const VAQUERA_INFO = {
  icon: 'cow', title: 'La ganadera y sus vacas',
  lines: ['¡Egun on! Estas son vacas pirenaicas: rubias, fuertes y tranquilas. Aguantan el frío del monte.',
    'En primavera y verano pastan libres en el monte comunal. Cada vaca lleva un cencerro: por el sonido sé dónde está.',
    'En invierno están en la cuadra y comen la hierba seca de las pacas que hicimos en verano.'],
  then: 'Las parejas de bueyes tiraban del carro y del arado. Las vacas daban leche, que se ordeñaba a mano en la cuadra de la casa.',
  now: 'Ya no trabajan en el campo: se crían para carne y leche, con ordeñadoras y comederos. Pero siguen subiendo al monte en verano, como siempre.',
};
