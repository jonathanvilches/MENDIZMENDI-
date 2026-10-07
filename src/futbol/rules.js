// Datos del fútbol de MENDIMENDIZ (futbol-data). Dos formatos con el mismo motor:
//   · fútbol 11 (Reglas de Juego de la IFAB, las de El Sadar: 105 × 68 m, sistema 4-4-2, fuera de juego, saque de banda
//     con las manos);
//   · fútbol sala 5 contra 5 en la pista del pueblo (reglamento de fútbol sala: 40 × 20 m, área de 6 m en forma de D,
//     balón de talla 4 de bote bajo, sistema 1-2-2, saque de banda con el pie, saque de portería con la mano, faltas
//     acumuladas y sin fuera de juego).
// Medidas, física del balón, jugadores, niveles de la IA, equipos, campos, retos y textos: todo lo demás se genera a
// partir de aquí. El formato activo se elige con useFormat() (lo hace el partido al crearse); los valores exportados
// (FIELD, PHYS, PLAYER, ROLES…) son siempre los del formato activo.

// Campo: origen en el centro, X a lo largo (−52,5…52,5), Z a lo ancho (−34…34), Y hacia arriba; 1 unidad = 1 m
const FIELD11 = {
  L: 105, W: 68, HL: 52.5, HW: 34,
  goalW: 7.32, goalH: 2.44, goalD: 2, postR: 0.06,   // portería de 7,32 × 2,44 m (por dentro), postes de 12 cm, red de 2 m de fondo
  line: 0.12,                                         // líneas de 12 cm
  area: 16.5, areaW: 40.32,                           // área de penalti: 16,5 m desde la línea de meta y 40,32 m de ancho
  box: 5.5, boxW: 18.32,                              // área de meta: 5,5 m y 18,32 m
  spot: 11, arc: 9.15, circle: 9.15, corner: 1,       // punto de penalti a 11 m, semicírculo y círculo central de 9,15 m, córner de 1 m
  wall: 9.15, margin: 5,                              // la barrera y los rivales a 9,15 m; vallas de publicidad a 5 m de las líneas
};

// Balón (talla 5): radio 0,11 m y 0,43 kg; se dibuja al 120 % (y de lejos un poco más) para que se lea en el móvil
const PHYS11 = {
  R: 0.11, mass: 0.43, g: 9.81, drag: 0.012, magnus: 0.0008, magnusMax: 6,
  rest: 0.55, tan: 0.85, roll: 1.5, postRest: 0.7, net: 0.85, board: 0.45, hz: 120, scale: 1.2,
  pass: [8, 27], shot: [16, 31], clear: [26, 34], throw: [7, 15],
};

// Jugadores: 6 m/s normal y 8 en sprint (la energía se agota en 5 s y se recupera en 7), aceleración 14 m/s²
const PLAYER11 = {
  run: 6, sprint: 8, acc: 14, brake: 26, grip: 8.5, drain: 1 / 5, regain: 1 / 7, radius: 0.36,
  reach: 0.9, ctrlH: 1, keep: 1.3, touchSlow: 0.5, touchFast: 0.35,
  cone: 40 * Math.PI / 180, passHold: 0.22, charge: 0.8, tackleWin: 0.25, trapMax: 12, loft: 0.3,
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
const ROLES11 = ['POR', 'LI', 'CTI', 'CTD', 'LD', 'MI', 'MCI', 'MCD', 'MD', 'DCI', 'DCD'];
const ROLE_NAME11 = { POR: 'portero', LI: 'lateral izquierdo', CTI: 'central', CTD: 'central', LD: 'lateral derecho', MI: 'interior izquierdo',
  MCI: 'centrocampista', MCD: 'centrocampista', MD: 'interior derecho', DCI: 'delantero', DCD: 'delantero centro' };
const LINE11 = { POR: 0, LI: 1, CTI: 1, CTD: 1, LD: 1, MI: 2, MCI: 2, MCD: 2, MD: 2, DCI: 3, DCD: 3 };   // portería, defensa, medio, delantera
const FORM11 = {
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
const NUMBERS11 = { POR: 1, LD: 2, LI: 3, CTI: 4, CTD: 5, MCD: 6, MD: 7, MCI: 8, DCD: 9, DCI: 10, MI: 11 };
// quién tira los penaltis (en el partido y en la tanda) y quién saca de centro
const KICKERS11 = ['DCD', 'DCI', 'MCI', 'MD', 'MI', 'MCD', 'CTI', 'LD', 'CTD', 'LI'];
// ---------------------------------------------------------------- fútbol sala
// Pista de 40 × 20 m con líneas de 8 cm; área de penalti: cuartos de círculo de 6 m desde cada poste unidos por una
// recta paralela a la línea de gol; punto de penalti a 6 m y segundo punto a 10 m; círculo central de 3 m; porterías de
// 3 × 2 m con postes de 8 cm y red de 1 m de fondo; zona de seguridad de 2 m hasta el muro
const FIELD_SALA = {
  L: 40, W: 20, HL: 20, HW: 10,
  goalW: 3, goalH: 2, goalD: 1, postR: 0.04,
  line: 0.08,
  area: 6, areaW: 15, areaD: true,                    // (areaW: la anchura total de la D, 3 + 2 × 6)
  box: 0, boxW: 0,                                    // (sin área de meta)
  spot: 6, spot2: 10, arc: 0, circle: 3, corner: 0.25,
  wall: 5, margin: 2,                                 // rivales a 5 m en los balones parados; muro a 2 m de las líneas
};
// Balón de talla 4: radio 0,100 m y 0,41 kg (al 120 % en pantalla). Aire: ½·ρ·Cd·A·v² con Cd de 0,45 (a 5 m/s) a 0,25
// (desde 12 m/s); Magnus ½·ρ·CL·A·v² con CL = r·|ω|/|v| (como mucho 0,35) y 8 m/s² como máximo; el giro se pierde un
// 1,5 % cada 1/60 s. Bote bajo (restitución 0,55 y −12 % de velocidad horizontal), rodadura de 1,6 m/s² en pista lisa
// (2,8 en hierba)
const PHYS_SALA = {
  R: 0.1, mass: 0.41, g: 9.81, rho: 1.2, cd: [0.45, 0.25], cdV: [5, 12], cl: 0.35, magnusMax: 8, spinKeep: 0.985,
  rest: 0.55, tan: 0.88, roll: 1.6, rollGrass: 2.8, postRest: 0.7, net: 0.85, board: 0.45, hz: 120, scale: 1.2,
  pass: [8, 16], loftV: [10, 18], shot: [16, 30], clear: [18, 24], throw: [7, 15],
};
PHYS_SALA.dragK = 0.5 * PHYS_SALA.rho * Math.PI * PHYS_SALA.R * PHYS_SALA.R / PHYS_SALA.mass;   // aceleración = dragK·Cd·v²
PHYS_SALA.drag = PHYS_SALA.dragK * 0.25;   // (la aproximación de la IA para calcular pases y tiros)
// Jugadores: 5,5 m/s y 7,2 en sprint (la energía se agota en 4 s y se recupera en 6), aceleración 14 m/s², frenada
// 18 m/s², giro de 540 °/s (360 °/s con el balón); controla el balón a menos de 0,9 m y 0,8 m de altura
const PLAYER_SALA = {
  run: 5.5, sprint: 7.2, acc: 14, brake: 24, grip: 9.5, drain: 1 / 4, regain: 1 / 6, radius: 0.36, turn: 540 * Math.PI / 180, turnBall: 360 * Math.PI / 180,
  reach: 0.9, ctrlH: 0.8, keep: 1.3, touchSlow: 0.5, touchFast: 0.32,
  cone: 40 * Math.PI / 180, passHold: 0.22, charge: 0.8, tackleWin: 0.25, trapMax: 12, loft: 0.3,
};
// Sistema 1-2-2: portero, cierre, dos alas y pívot
const ROLES_SALA = ['POR', 'CIE', 'ALI', 'ALD', 'PIV'];
const ROLE_NAME_SALA = { POR: 'portero', CIE: 'cierre', ALI: 'ala izquierda', ALD: 'ala derecha', PIV: 'pívot' };
const LINE_SALA = { POR: 0, CIE: 1, ALI: 2, ALD: 2, PIV: 3 };
const FORM_SALA = {
  CIE: { atk: [-0.3, 0], def: [-0.66, 0] },
  ALI: { atk: [0.2, -0.72], def: [-0.42, -0.5] },
  ALD: { atk: [0.2, 0.72], def: [-0.42, 0.5] },
  PIV: { atk: [0.62, 0.05], def: [-0.12, 0] },
};
const NUMBERS_SALA = { POR: 1, CIE: 4, ALI: 7, ALD: 8, PIV: 10 };
const KICKERS_SALA = ['PIV', 'ALI', 'ALD', 'CIE'];

// Reglas de cada formato (period: minutos de cada parte que marca el reloj, como en la tele: 45 en fútbol 11 y 20 en
// sala; la parte dura en realidad los minutos elegidos en el menú): fuera de juego, saque de banda (con las manos o con el pie), saque de portería (con el pie
// desde el área de meta o con la mano del portero), límite de faltas acumuladas (desde la 6.ª, tiro libre directo sin
// barrera desde el segundo punto), los 4 s para sacar, los dos que sacan de centro, el que empieza con el jugador y el
// equipo arbitral (árbitro y asistentes, o dos árbitros de banda)
const FORMATS = {
  f11: { id: 'f11', name: 'Fútbol 11', FIELD: FIELD11, PHYS: PHYS11, PLAYER: PLAYER11, ROLES: ROLES11, ROLE_NAME: ROLE_NAME11, LINE: LINE11, FORM: FORM11, NUMBERS: NUMBERS11, KICKERS: KICKERS11,
    RULES: { offside: true, throwHands: true, goalkickHands: false, foulLimit: 0, fourSec: false, kick: ['DCD', 'DCI'], start: 'DCD', refs: 'f11', scale: 1, period: 45 } },
  sala: { id: 'sala', name: 'Fútbol sala', FIELD: FIELD_SALA, PHYS: PHYS_SALA, PLAYER: PLAYER_SALA, ROLES: ROLES_SALA, ROLE_NAME: ROLE_NAME_SALA, LINE: LINE_SALA, FORM: FORM_SALA, NUMBERS: NUMBERS_SALA, KICKERS: KICKERS_SALA,
    RULES: { offside: false, throwHands: false, goalkickHands: true, foulLimit: 5, fourSec: true, kick: ['PIV', 'ALI'], start: 'PIV', refs: 'sala', scale: 0.55, period: 20 } },
};
export let FIELD = FIELD11, PHYS = PHYS11, PLAYER = PLAYER11, ROLES = ROLES11, ROLE_NAME = ROLE_NAME11, LINE = LINE11, FORM = FORM11, NUMBERS = NUMBERS11, KICKERS = KICKERS11, RULES = FORMATS.f11.RULES, FORMAT = 'f11';
const hooks = [];
/** Cambia el formato activo ('f11' o 'sala') y la superficie ('hierba' o 'pista': la rodadura del balón). */
export function useFormat(id = 'f11', surface = null) {
  const f = FORMATS[id] || FORMATS.f11;
  ({ FIELD, PHYS, PLAYER, ROLES, ROLE_NAME, LINE, FORM, NUMBERS, KICKERS, RULES } = f); FORMAT = f.id;
  if (f.id === 'sala') PHYS.roll = surface === 'hierba' ? PHYS.rollGrass : 1.6;
  for (const fn of hooks) fn();
  return f;
}
/** Los módulos que guardan valores derivados del formato (radios, mitades…) los recalculan aquí. */
export function onFormat(fn) { hooks.push(fn); fn(); }

// el árbitro y los dos asistentes: camiseta negra; banderín amarillo y rojo
export const REFEREE = { shirt: '#17181c', flag: ['#ffd400', '#e0242c'] };

// Equipos: Iruña en El Sadar (el futbolista del jugador; sin nombre ni escudo de ningún club de verdad) y equipos de pueblo con equipaciones propias, sin marcas
export const TEAMS = {
  osasuna: { id: 'osasuna', name: 'Iruña', short: 'IRU', shirt: '#c41f2c', shorts: '#16224a', socks: '#c41f2c', text: '#ffffff', model: 'osasuna', keeper: '#1f9a4a' },
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
  // pista polideportiva del pueblo (fútbol sala): muro de piedra, árboles, casas y un graderío sencillo
  pista: { id: 'pista', name: 'Pista del pueblo', town: '', env: 'pueblo', format: 'sala', surface: 'pista', home: 'pueblo', away: 'vecinos', verified: false,
    note: 'Adaptación: pista exterior de 40 × 20 m como las de los polideportivos de los pueblos (no comprobada con ortofoto).',
    court: '#3f8a52', courtOut: '#b4583c', grass: ['#4a9440', '#40853a'], seat: '#8a6a4a', seatAlt: '#7a5a3a', roof: null, sky: ['#a8cdee', '#eef4f8'] },
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
  second: 'Segunda parte', kickin: 'Saque de banda', fourSec: '¡4 segundos!', fouls6: 'Sexta falta: tiro libre sin barrera', double: 'Tiro libre desde 10 m',
  yellow: 'Tarjeta amarilla', red: 'Tarjeta roja', second2: 'Segunda amarilla: roja', advantage: 'Falta… ¡ventaja! Sigue el juego',
};

export const CAREER_KEY = 'mendimendiz-futbol-v1';
