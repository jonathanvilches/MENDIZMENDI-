// Datos del fútbol de MENDIMENDIZ (futbol-data): medidas del campo de fútbol sala, física del balón, jugadores,
// niveles de la IA, sistema 1-2-2, equipos, campos, retos y textos. Todo lo demás se genera a partir de aquí.

// Campo: origen en el centro, X a lo largo (−20…20), Z a lo ancho (−10…10), Y hacia arriba; 1 unidad = 1 m
export const FIELD = {
  L: 40, W: 20, HL: 20, HW: 10,
  goalW: 3, goalH: 2, goalD: 1, postR: 0.04,     // portería de 3 × 2 m, postes y larguero de 8 cm de diámetro, red de 1 m de fondo
  line: 0.08, area: 6, spot: 6, spot2: 10, circle: 3, margin: 2,   // área de 6 m, puntos de penalti a 6 y 10 m, círculo de 3 m, valla a 2 m
};

// Balón: radio 0,10 m y 0,42 kg; se dibuja al 120 % para que se lea en el móvil
export const PHYS = {
  R: 0.1, mass: 0.42, g: 9.81, drag: 0.012, magnus: 0.0008, magnusMax: 6,
  rest: 0.55, tan: 0.85, roll: 1.8, postRest: 0.7, net: 0.85, board: 0.45, hz: 120, scale: 1.2,
  pass: [8, 18], shot: [15, 30], clear: [18, 24],
};

// Jugadores: 5,5 m/s normal y 7 en sprint (la energía se agota en 4 s y se recupera en 6), aceleración 14 m/s²
export const PLAYER = {
  run: 5.5, sprint: 7, acc: 14, drain: 1 / 4, regain: 1 / 6, radius: 0.36,
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

// Sistema 1-2-2: portero, cierre, dos alas y pívot. Posición base [u, v] en ataque y en defensa: u a lo largo (−1 la
// propia portería, 1 la rival) y v a lo ancho (−1…1). Se desplazan con el balón
export const ROLES = ['POR', 'CIE', 'ALI', 'ALD', 'PIV'];
export const ROLE_NAME = { POR: 'portero', CIE: 'cierre', ALI: 'ala izquierda', ALD: 'ala derecha', PIV: 'pívot' };
export const FORM = {
  CIE: { atk: [-0.28, 0], def: [-0.74, 0] },
  ALI: { atk: [0.18, -0.64], def: [-0.46, -0.44] },
  ALD: { atk: [0.18, 0.64], def: [-0.46, 0.44] },
  PIV: { atk: [0.66, 0.04], def: [-0.08, 0] },
};
export const NUMBERS = { POR: 1, CIE: 4, ALI: 7, ALD: 11, PIV: 9 };

// Equipos: Osasuna en El Sadar (el futbolista del jugador) y equipos de pueblo con equipaciones propias, sin marcas
export const TEAMS = {
  osasuna: { id: 'osasuna', name: 'Osasuna', short: 'OSA', shirt: '#c41f2c', shorts: '#16224a', socks: '#c41f2c', text: '#ffffff', model: 'osasuna', keeper: '#1f9a4a' },
  visitante: { id: 'visitante', name: 'Visitante', short: 'VIS', shirt: '#f4f4f2', shorts: '#16224a', socks: '#f4f4f2', text: '#16224a', model: 'osasuna_fuera', keeper: '#f2b01e' },
  pueblo: { id: 'pueblo', name: 'Pueblo', short: 'PUE', shirt: '#d8262e', shorts: '#ffffff', socks: '#d8262e', text: '#ffffff', model: null, keeper: '#2a8a3a' },
  vecinos: { id: 'vecinos', name: 'Vecinos', short: 'VEC', shirt: '#2f6fd0', shorts: '#ffffff', socks: '#2f6fd0', text: '#ffffff', model: null, keeper: '#f2b01e' },
};

// Campos: El Sadar (gradas rojas pegadas al césped y cubierta) y el campo genérico de un pueblo (muro de piedra,
// árboles, casas y un graderío sencillo). verified: comprobado con ortofoto; si no, es una adaptación
export const VENUES = {
  sadar: { id: 'sadar', name: 'El Sadar', town: 'Pamplona / Iruña', env: 'estadio', home: 'osasuna', away: 'visitante', verified: false,
    note: 'Adaptación: un campo de fútbol sala de 40 × 20 m dentro de unas gradas como las de El Sadar.',
    grass: ['#3f8f3a', '#37802f'], seat: '#b8222b', seatAlt: '#8e1a22', roof: '#2a2c33', sky: ['#9fc6ea', '#e8f1f8'] },
  pueblo: { id: 'pueblo', name: 'Campo del pueblo', town: '', env: 'pueblo', home: 'pueblo', away: 'vecinos', verified: false,
    note: 'Adaptación: campo de fútbol sala con muro de piedra.', grass: ['#4a9440', '#40853a'], seat: '#8a6a4a', seatAlt: '#7a5a3a', roof: null, sky: ['#a8cdee', '#eef4f8'] },
};

// Retos de entrenamiento
export const RETOS = {
  conos: { id: 'conos', name: 'Regate entre conos', text: 'Lleva el balón entre los conos en zigzag y crúzalos todos lo más rápido que puedas. Cada cono que te saltes suma 2 segundos.', target: 20 },
  dianas: { id: 'dianas', name: 'Tiro a las escuadras', text: 'Ocho tiros desde fuera del área: apunta con el joystick a las dianas de las escuadras y carga el tiro.', shots: 8, target: 3 },
  pases: { id: 'pases', name: 'Pases en movimiento', text: 'Tus compañeros se mueven sin parar: pásales el balón al hueco. Te lo devuelven. Haz ocho pases buenos en un minuto.', time: 60, target: 8 },
};

export const TEXT = {
  goal: '¡GOL!', half: 'Descanso', end: 'Final del partido', penalty: '¡Penalti!', out: 'Fuera', kickin: 'Saque de banda',
  corner: 'Córner', goalkick: 'Saque de portería', foul: 'Falta', free: 'Tiro libre', kickoff: 'Saque de centro',
  post: '¡Al poste!', bar: '¡Al larguero!', save: '¡Paradón!', catch: '¡Blocada del portero!', steal: '¡Balón recuperado!',
  second: 'Segunda parte',
};

export const CAREER_KEY = 'mendimendiz-futbol-v1';
