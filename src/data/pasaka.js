// La pasaka: el juego directo de pelota de los trinquetes y los claustros (dos parejas frente a frente, red por medio,
// guante corto y tanteo a quinces). Lo que se lee en el menú y lo que dice el canónigo del claustro de la catedral de
// Pamplona (game/townGame.js). El minijuego está en ui/pasaka.js.
// Fuentes: Reglamento de juego de la Federación Vasca de Pelota (2021) y de la Federación Navarra de Pelota Vasca;
// Napike, Asociación Cultural Navarra de Pelota Vasca (Encuentros Iglesia y Pelota, 2023-2026); Noticias de Navarra
// (23-10-2023, 22-6-2025, 15 y 17-10-2026); Ayuntamiento de Pamplona (Capitalidad Mundial de la Pelota 2026).
export const PASAKA = {
  id: 'pasaka', name: 'Pasaka', eu: 'Pasaka', icon: 'pelota',
  kicker: 'Juego directo de pelota', eukicker: 'Pilota-joko zuzena',
  lead: 'El juego de pelota más antiguo de los que se juegan en trinquete, y el único «directo»: dos parejas frente a frente con una red por medio. Se jugaba en los claustros y casi ha desaparecido. Aquí lo aprendes y lo juegas.',
  secs: [
    ['Qué es', 'Dos parejas se colocan una frente a otra, separadas por una red de 1,20 metros de altura que cruza la cancha por la mitad, y se pasan la pelota por encima de la red. Es pariente del jeu de paume francés y antecesora del tenis: de ahí viene el tanteo a 15, 30, 40 y juego.'],
    ['De dónde viene', 'Se jugaba ya en los siglos XIII y XIV en trinquetes, patios y claustros. En Pamplona la practicaban los canónigos en el claustro de la catedral, y hubo hasta procesos por «faltar al decoro» arremangándose la sotana para jugar mejor. Cuando llegó el frontón moderno y el juego indirecto contra la pared, la pasaka casi desapareció.'],
    ['Cómo se juega', 'Se golpea con un guante corto de cuero; el saque se da con la mano y tiene que pasar la red y llegar al frontis contrario. Después la pelota puede tocar cualquier pared del trinquete. Si bota dos veces en tu lado, o si la mandas a la red, quince para los otros. Se cuenta 15, 30, 40 y juego, y los partidos de verdad son a trece juegos.'],
    ['Dónde sigue viva', 'Hoy se juega en muy pocos trinquetes. En Gipuzkoa se intenta recuperar en Oiartzun, y en Navarra la asociación Napike la recrea en el sobreclaustro de la catedral de Pamplona en los Encuentros Iglesia y Pelota, con los pelotaris vestidos de canónigos.'],
    ['En la catedral', 'El 17 de octubre de 2026 el IV Encuentro Iglesia y Pelota llenó la catedral de Pamplona: una charla sobre la pelota en la catedral («Entre el coro y el trinquete»), una muestra de artesanos de la pelota y una exhibición de pasaka en el sobreclaustro, con red, líneas en el suelo y sotanas. Forma parte de Pamplona, Capital Mundial de la Pelota 2026.'],
    ['En el juego', 'Juegas una versión corta en el sobreclaustro: parejas, red a 1,20 m, saque con la mano, quinces y juegos, sin «rayas» y a tres juegos en vez de trece. Toca el suelo para moverte, y Golpe o Dejada para devolver la pelota. En Pamplona, el canónigo del claustro te invita a jugar de pareja con él.'],
  ],
  sources: 'Fuentes: Reglamento de juego de la Federación Vasca de Pelota (2021) y de la Federación Navarra de Pelota Vasca; Napike, Asociación Cultural Navarra de Pelota Vasca; Noticias de Navarra (23 de octubre de 2023, 22 de junio de 2025, 15 y 17 de octubre de 2026); Ayuntamiento de Pamplona, Capitalidad Mundial de la Pelota 2026.',
  // el canónigo del claustro (Pamplona)
  canonigo: { name: 'Don Martín', role: 'canónigo' },
  rivales: ['Don Pedro', 'Don Lope'],
  lines: {
    ask: ['Aquí, en este claustro, los canónigos jugábamos a la pelota hace quinientos años. Lo llamábamos pasaka: dos parejas, una red por medio y un guante de cuero.', 'Casi nadie lo recuerda ya. ¿Juegas de pareja conmigo contra don Pedro y don Lope? Se cuenta a quinces, como en el tenis de antes.'],
    win: ['¡Qué partido! Así se jugaba en los claustros antes de que hubiera frontones. Ya puedes contar que has jugado a la pasaka.'],
    lose: ['Don Pedro y don Lope llevan muchos años en esto. Cuando quieras volvemos a intentarlo: el truco está en moverse antes de que llegue la pelota.'],
  },
};
// la pista (en metros): un trinquete largo, con la red por la mitad y las líneas de saque
export const PISTA = { W: 9.3, L: 28.5, NETH: 1.2, CEIL: 5.6, SAQUE: 5, CHAPA: 0.8 };
