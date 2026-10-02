// Datos del fútbol de MENDIMENDIZ (futbol-data): medidas reglamentarias del campo de fútbol 11 (Reglas de Juego de la
// IFAB, las de El Sadar: 105 × 68 m), física del balón, jugadores, niveles de la IA, sistema 4-4-2, equipos, campos,
// retos y textos. Todo lo demás se genera a partir de aquí.

// Campo: origen en el centro, X a lo largo (−52,5…52,5), Z a lo ancho (−34…34), Y hacia arriba; 1 unidad = 1 m
export const FIELD = {
  L: 105, W: 68, HL: 52.5, HW: 34,
  goalW: 7.32, goalH: 2.44, goalD: 2, postR: 0.06,   // portería de 7,32 × 2,44 m (por dentro), postes de 12 cm, red de 2 m de fondo
  line: 0.12,                                         // líneas de 12 cm
  area: 16.5, areaW: 40.32,                           // área de penalti: 16,5 m desde la línea de meta y 40,32 m de ancho
  box: 5.5, boxW: 18.32,                              // área de meta: 5,5 m y 18,32 m
  spot: 11, arc: 9.15, circle: 9.15, corner: 1,       // punto de penalti a 11 m, semicírculo y círculo central de 9,15 m, córner de 1 m
  wall: 9.15, margin: 5,                              // la barrera y los rivales a 9,15 m; vallas de publicidad a 5 m de las líneas
};

// Balón (talla 5): radio 0,11 m y 0,43 kg; se dibuja al 130 % para que se lea en el móvil
export const PHYS = {
  R: 0.11, mass: 0.43, g: 9.81, drag: 0.012, magnus: 0.0008, magnusMax: 6,
  rest: 0.55, tan: 0.85, roll: 1.5, postRest: 0.7, net: 0.85, board: 0.45, hz: 120, scale: 1.3,
  pass: [8, 27], shot: [16, 31], clear: [26, 34], throw: [7, 15],
};

// Jugadores: 6 m/s normal y 8 en sprint (la energía se agota en 5 s y se recupera en 7), aceleración 14 m/s²
export const PLAYER = {
  run: 6, sprint: 8, acc: 14, drain: 1 / 5, regain: 1 / 7, radius: 0.36,
  reach: 0.9, ctrlH: 1, keep: 1.3, touchSlow: 0.5, touchFast: 0.35,
  cone: 35 * Math.PI / 180, charge: 0.8, tackleWin: 0.25, trapMax: 12, loft: 0.3,
};

// Niveles de la IA: tiempo de reacción, error de pase, umbral de tiro (probabilidad de gol), portero y presión.
// La IA nunca hace trampas: corre como mucho igual que el jugador y ve lo mismo que él
export const LEVELS = {
  facil: { id: 'facil', name: 'Fácil', react: 0.45, passErr: 2, shootThr: 0.42, keeperReact: 0.34, keeperReach: 0.8, catchV: 14, press: 0.55, tackle: 0.42, speed: 0.9, sprint: 0.35, coord: false },
  normal: { id: 'normal', name: 'Normal', react: 0.3, passErr: 1, shootThr: 0.3, keeperReact: 0.24, keeperReach: 0.95, catchV: 16, press: 0.8, tackle: 0.58, speed: 0.96, sprint: 0.6, coord: false },
  dificil: { id: 'dificil', name: 'Difícil', react: 0.18, passErr: 0.4, shootThr: 0.22, keeperReact: 0.15, keeperReach: 1.1, catchV: 18, press: 1, tackle: 0.72, speed: 1, sprint: 0.85, coord: true },
};

// Sistema 4-4-2: portero, cuatro defensas (laterales y centrales), cuatro centrocampistas (bandas e interiores) y dos
// delanteros. Posición base [u, v] en ataque y en defensa: u a lo largo (−1 la propia portería, 1 la rival) y v a lo
// ancho (−1 la banda izquierda de cada equipo, 1 la derecha). Se desplazan con el balón como un bloque
export const ROLES = ['POR', 'LI', 'CTI', 'CTD', 'LD', 'MI', 'MCI', 'MCD', 'MD', 'DCI', 'DCD'];
export const ROLE_NAME = { POR: 'portero', LI: 'lateral izquierdo', CTI: 'central', CTD: 'central', LD: 'lateral derecho', MI: 'interior izquierdo',
  MCI: 'centrocampista', MCD: 'centrocampista', MD: 'interior derecho', DCI: 'delantero', DCD: 'delantero centro' };
export const LINE = { POR: 0, LI: 1, CTI: 1, CTD: 1, LD: 1, MI: 2, MCI: 2, MCD: 2, MD: 2, DCI: 3, DCD: 3 };   // portería, defensa, medio, delantera
export const FORM = {
  LI: { atk: [-0.2, -0.82], def: [-0.66, -0.6] },
  CTI: { atk: [-0.48, -0.28], def: [-0.74, -0.2] },
  CTD: { atk: [-0.48, 0.28], def: [-0.74, 0.2] },
  LD: { atk: [-0.2, 0.82], def: [-0.66, 0.6] },
  MI: { atk: [0.3, -0.74], def: [-0.36, -0.58] },
  MCI: { atk: [0.04, -0.2], def: [-0.42, -0.17] },
  MCD: { atk: [-0.04, 0.2], def: [-0.44, 0.17] },
  MD: { atk: [0.3, 0.74], def: [-0.36, 0.58] },
  DCI: { atk: [0.62, -0.2], def: [-0.1, -0.14] },
  DCD: { atk: [0.66, 0.16], def: [-0.06, 0.12] },
};
export const NUMBERS = { POR: 1, LD: 2, LI: 3, CTI: 4, CTD: 5, MCD: 6, MD: 7, MCI: 8, DCD: 9, DCI: 10, MI: 11 };
// quién tira los penaltis (en el partido y en la tanda) y quién saca de centro
export const KICKERS = ['DCD', 'DCI', 'MCI', 'MD', 'MI', 'MCD', 'CTI', 'LD', 'CTD', 'LI'];
// el árbitro y los dos asistentes: camiseta negra; banderín amarillo y rojo
export const REFEREE = { shirt: '#17181c', flag: ['#ffd400', '#e0242c'] };

// Equipos: Osasuna en El Sadar (el futbolista del jugador) y equipos de pueblo con equipaciones propias, sin marcas
export const TEAMS = {
  osasuna: { id: 'osasuna', name: 'Osasuna', short: 'OSA', shirt: '#c41f2c', shorts: '#16224a', socks: '#c41f2c', text: '#ffffff', model: 'osasuna', keeper: '#1f9a4a' },
  visitante: { id: 'visitante', name: 'Visitante', short: 'VIS', shirt: '#f4f4f2', shorts: '#16224a', socks: '#f4f4f2', text: '#16224a', model: 'osasuna_fuera', keeper: '#f2b01e' },
  // los de los pueblos, con el mismo futbolista (rojo) y, los vecinos, con la camiseta azul (recolor: se tiñe el rojo)
  pueblo: { id: 'pueblo', name: 'Pueblo', short: 'PUE', shirt: '#d8262e', shorts: '#ffffff', socks: '#d8262e', text: '#ffffff', model: 'osasuna', keeper: '#2a8a3a' },
  vecinos: { id: 'vecinos', name: 'Vecinos', short: 'VEC', shirt: '#2f6fd0', shorts: '#ffffff', socks: '#2f6fd0', text: '#ffffff', model: 'osasuna', recolor: true, keeper: '#f2b01e' },
};

// Campos: El Sadar (gradas rojas pegadas al césped y cubierta) y el campo genérico de un pueblo (muro de piedra,
// árboles, casas y un graderío sencillo). verified: comprobado con ortofoto; si no, es una adaptación
export const VENUES = {
  sadar: { id: 'sadar', name: 'El Sadar', town: 'Pamplona / Iruña', env: 'estadio', home: 'osasuna', away: 'visitante', verified: false,
    note: 'Campo de 105 × 68 m; gradas muy pendientes por los cuatro lados con las esquinas cerradas, cubierta continua y fachada de chapa roja (la reforma de 2021).',
    grass: ['#3f8f3a', '#37802f'], seat: '#b8222b', seatAlt: '#8e1a22', roof: '#2a2c33', sky: ['#9fc6ea', '#e8f1f8'] },
  pueblo: { id: 'pueblo', name: 'Campo del pueblo', town: '', env: 'pueblo', home: 'pueblo', away: 'vecinos', verified: false,
    note: 'Adaptación: campo de hierba de medidas reglamentarias con muro de piedra.', grass: ['#4a9440', '#40853a'], seat: '#8a6a4a', seatAlt: '#7a5a3a', roof: null, sky: ['#a8cdee', '#eef4f8'] },
};

// Retos de entrenamiento
export const RETOS = {
  conos: { id: 'conos', name: 'Regate entre conos', text: 'Lleva el balón entre los conos en zigzag y crúzalos todos lo más rápido que puedas. Cada cono que te saltes suma 2 segundos.', target: 20 },
  dianas: { id: 'dianas', name: 'Tiro a las escuadras', text: 'Ocho tiros desde la frontal del área: apunta con el joystick a las dianas de las escuadras y carga el tiro.', shots: 8, target: 3 },
  pases: { id: 'pases', name: 'Pases en movimiento', text: 'Tus compañeros se mueven sin parar: pásales el balón al hueco. Te lo devuelven. Haz ocho pases buenos en un minuto.', time: 60, target: 8 },
};

export const TEXT = {
  goal: '¡GOL!', half: 'Descanso', end: 'Final del partido', penalty: '¡Penalti!', out: 'Fuera', throwin: 'Saque de banda', offside: 'Fuera de juego',
  corner: 'Córner', goalkick: 'Saque de portería', foul: 'Falta', free: 'Tiro libre', kickoff: 'Saque de centro',
  post: '¡Al poste!', bar: '¡Al larguero!', save: '¡Paradón!', catch: '¡Blocada del portero!', steal: '¡Balón recuperado!',
  second: 'Segunda parte',
};

export const CAREER_KEY = 'mendimendiz-futbol-v1';
