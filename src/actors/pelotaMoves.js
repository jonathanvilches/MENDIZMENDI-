// Movimientos de pelota a mano para el pelotari de Meshy (esqueleto de Mixamo), hechos aquí a partir de poses clave: la
// postura de espera, el golpe de derecha y el de izquierda, la sotamano, el golpe de aire, el saque, el desplazamiento
// lateral, celebrar el tanto, lamentarlo, saludar y el reposo. Meshy solo traía correr, andar, un tajo y un puño en alto,
// y de ahí salían recortes que no parecían pelota (noviembre de 2026).
// Cada pose dice, en los ejes del personaje (mira a +Z, +X a su izquierda, +Y arriba; grados y metros):
//   c        cuánto se mueve la cadera
//   H S S1 S2 N Hd LS RS   giro de la cadera, la espalda en tres trozos, el cuello, la cabeza y los hombros, cada uno
//            respecto a su padre (orden YXZ: primero se inclina de lado, luego adelante y al final gira)
//   Lm Rm    dónde va cada mano (la muñeca), contada como si el pecho estuviera en reposo: el pecho la lleva consigo
//   Lc Rc    hacia dónde apunta el codo, igual
//   Lw Rw    cuánto se dobla la muñeca
//   Lt Rt    cuánto gira el antebrazo sobre sí mismo (la palma hacia dentro, hacia abajo…)
//   Lp Rp    cuánto se mueve cada tobillo desde su sitio en reposo, en el suelo
//   Lr Rr    giro de cada pie en el mundo (x: levanta el talón; y: punta afuera o adentro)
// Brazos y piernas se colocan con cinemática inversa de dos huesos: los pies se quedan donde se dice, sin resbalar ni
// meterse en el suelo, y las manos llegan a su sitio. Entre pose y pose, curva suave; se hornea a 30 fotogramas por
// segundo en pistas normales de three.js, sin pesar nada en la descarga: se hacen al cargar el modelo.
import * as THREE from 'three';

const G = Math.PI / 180, FPS = 30;
const HUESOS = { H: 'Hips', S: 'Spine', S1: 'Spine1', S2: 'Spine2', N: 'Neck', Hd: 'Head', LS: 'LeftShoulder', RS: 'RightShoulder', LA: 'LeftArm', RA: 'RightArm', LF: 'LeftForeArm', RF: 'RightForeArm', LH: 'LeftHand', RH: 'RightHand',
  LU: 'LeftUpLeg', RU: 'RightUpLeg', LL: 'LeftLeg', RL: 'RightLeg', LP: 'LeftFoot', RP: 'RightFoot', LT: 'LeftToeBase', RT: 'RightToeBase' };
const GIROS = ['H', 'S', 'S1', 'S2', 'N', 'Hd', 'LS', 'RS'];

// ---------- las poses ----------
// (las manos, en el pecho en reposo: el hombro izquierdo está en x 0,18, y 1,04; el brazo entero llega a unos 0,39 m)
const REPOSO = { c: [0, -0.008, 0], S: [2, 0, 0], N: [-1, 0, 0], Lm: [0.215, 0.70, 0.08], Lc: [0.3, -0.2, -1], Rm: [-0.215, 0.70, 0.08], Rc: [-0.3, -0.2, -1], Lr: [0, 6, 0], Rr: [0, -6, 0] };
// (de espera: rodillas dobladas, el cuerpo adelante, las manos delante de la tripa, los pies abiertos y la cabeza arriba,
// mirando al frontis)
const ESPERA = { c: [0, -0.11, -0.03], H: [8, 0, 0], S: [10, 0, 0], S1: [6, 0, 0], S2: [4, 0, 0], N: [-10, 0, 0], Hd: [-12, 0, 0],
  Lm: [0.16, 0.86, 0.28], Lc: [0.6, -0.6, -0.5], Rm: [-0.16, 0.86, 0.28], Rc: [-0.6, -0.6, -0.5], Lp: [0.07, 0, 0.05], Rp: [-0.07, 0, -0.05], Lr: [0, 10, 0], Rr: [0, -10, 0] };
const ESPERA_B = { ...ESPERA, c: [0.01, -0.125, -0.03], H: [10, 2, 0], S: [11, 2, 0] };
// (derecha: armado de lado, con el hombro izquierdo hacia el frontis, el brazo derecho atrás y bajo; golpe con el peso
// adelante y la mano abierta a la altura de la rodilla; y el brazo que sigue cruzando el cuerpo)
const ARMADO = { c: [-0.08, -0.14, -0.04], H: [8, -50, 0], S: [10, -20, 6], S1: [6, -12, 0], S2: [4, -8, 0], N: [-8, 36, 0], Hd: [-10, 30, 0],
  Rm: [-0.46, 0.80, -0.22], Rc: [0, -1, -0.4], Rw: 25, Rt: 0, Lm: [0.52, 1.0, 0.16], Lc: [0.2, -1, -0.4], Lp: [0.10, 0, 0.12], Rp: [-0.10, 0, -0.08], Lr: [0, 10, 0], Rr: [0, -35, 0] };
const PASO = { ...ARMADO, c: [-0.06, -0.10, -0.03], H: [8, -30, 0], S: [10, -12, 3], S1: [6, -6, 0], Rm: [-0.40, 0.82, -0.08], Lm: [0.40, 0.96, 0.24], Lp: [0.09, 0.07, 0.05], Lr: [-10, 5, 0] };
const IMPACTO = { c: [0, -0.16, 0.05], H: [10, 8, 0], S: [16, 6, -3], S1: [8, 5, 0], S2: [4, 5, 0], N: [-14, -10, 0], Hd: [-12, -8, 0],
  Rm: [-0.30, 0.74, 0.30], Rc: [-0.4, -1, 0], Rw: 0, Rt: 0, Lm: [0.44, 0.86, -0.18], Lc: [0.4, -1, 0.3], Lp: [0.10, 0, 0.22], Rp: [-0.10, 0.02, -0.08], Lr: [0, 10, 0], Rr: [10, -20, 0] };
const SIGUE = { c: [0.07, -0.10, 0.08], H: [6, 45, 0], S: [10, 18, -4], S1: [5, 12, 0], S2: [3, 8, 0], N: [-10, -30, 0], Hd: [-10, -24, 0],
  Rm: [0.12, 1.14, 0.22], Rc: [-1, -0.4, -0.2], Rt: -70, Lm: [0.40, 0.90, -0.15], Lc: [0.4, -1, 0], Lp: [0.10, 0, 0.22], Rp: [-0.07, 0.05, -0.01], Lr: [0, 10, 0], Rr: [32, 0, 0] };
// (sotamano: la pelota baja, casi en el suelo; muy agachado, de abajo arriba)
const ARMADO_B = { ...ARMADO, c: [-0.06, -0.21, -0.05], H: [14, -30, 0], S: [18, -10, 4], S1: [10, -6, 0], N: [-16, 20, 0], Hd: [-16, 18, 0], Rm: [-0.45, 0.80, -0.14], Rc: [0, -1, -0.3], Lm: [0.44, 0.92, 0.20],
  Lp: [0.10, 0, 0.18], Rp: [-0.12, 0, -0.10] };
const IMPACTO_B = { ...IMPACTO, c: [0, -0.24, 0.03], H: [18, -6, 0], S: [22, 0, -2], S1: [10, 0, 0], N: [-20, 0, 0], Hd: [-18, 0, 0], Rm: [-0.30, 0.70, 0.20], Rc: [-0.2, -1, -0.2], Lp: [0.10, 0, 0.20], Rp: [-0.12, 0, -0.10] };
const SIGUE_B = { ...SIGUE, c: [0.04, -0.13, 0.06], H: [8, 22, 0], S: [10, 10, -3], Rm: [-0.10, 1.25, 0.25], Rc: [-1, -0.5, -0.4] };
// (de aire: la pelota alta, por encima del hombro; el brazo arriba y de lado, el cuerpo inclinado a la izquierda)
const ARMADO_A = { ...ARMADO, c: [-0.05, -0.05, -0.03], H: [2, -35, 0], S: [2, -15, -8], S1: [2, -8, -4], N: [-10, 25, 6], Hd: [-14, 20, 0], Rm: [-0.36, 1.32, -0.12], Rc: [-0.6, -0.6, -0.8], Rw: 20,
  Lm: [0.48, 1.08, 0.18], Lc: [0.2, -1, -0.3] };
const IMPACTO_A = { ...IMPACTO, c: [0, -0.06, 0.04], H: [4, 6, 0], S: [6, 6, -8], S1: [3, 4, -4], N: [-16, -6, 4], Hd: [-16, -6, 0], Rm: [-0.30, 1.30, 0.26], Rc: [-1, -0.5, -0.2], Rw: 0 };
const SIGUE_A = { ...SIGUE, c: [0.05, -0.08, 0.06], Rm: [0.08, 1.02, 0.26], Rc: [-1, -0.2, 0] };
// (gancho: la pelota alta, por encima del hombro, y el brazo que viene de arriba y de fuera con el codo doblado, en gancho,
// para mandarla abajo y pegada a la pared; el cuerpo gira entero detrás del brazo y la mano acaba en la cadera contraria.
// La mano le pega por encima de la cabeza, con el brazo recto hacia arriba y algo abierto: la pide así el autor,
// noviembre de 2026. Tienen la cabeza grande y el brazo corto: con la mano hacia delante se tapaban la cara)
const IMPACTO_G = { ...IMPACTO, c: [0.02, -0.02, 0.05], H: [2, 8, 0], S: [-2, 5, -10], S1: [2, 3, -5], S2: [1, 2, 0], N: [-18, -16, 6], Hd: [-18, -12, 0],
  Rm: [-0.34, 1.39, -0.02], Rc: [-1, 0.3, -0.2], Rw: -10, Rt: -30, Lm: [0.40, 0.88, -0.10], Lc: [0.5, -1, 0.2] };
const SIGUE_G = { ...SIGUE, c: [0.08, -0.13, 0.08], H: [8, 55, 0], S: [14, 24, -6], S1: [7, 14, 0], S2: [4, 8, 0], N: [-10, -36, 0], Hd: [-8, -26, 0], Rm: [0.10, 0.88, 0.26], Rc: [-0.8, -0.6, 0.1], Rt: -80 };
// (volea: antes del bote y alta, de la altura del hombro para arriba; no hay tiempo de armar, así que es un golpe corto y
// seco, con la mano por encima de la cabeza, el cuerpo erguido y poco recorrido después. Antes era a media altura; la
// pide así el autor, noviembre de 2026, y es como la cuenta el resumen del partido: la de debajo del hombro es «de aire»)
const ARMADO_V = { ...ARMADO, c: [-0.04, -0.04, -0.03], H: [2, -36, 0], S: [-2, -14, -8], S1: [-2, -8, -4], N: [-12, 26, 4], Hd: [-14, 20, 0], Rm: [-0.40, 1.30, -0.14], Rc: [-0.8, 0.1, -0.8], Rw: 15, Lm: [0.46, 1.06, 0.18] };
const IMPACTO_V = { ...IMPACTO, c: [0, -0.02, 0.03], H: [2, 6, 0], S: [-2, 4, -8], S1: [-2, 3, -4], S2: [0, 2, 0], N: [-14, -8, 4], Hd: [-16, -6, 0], Rm: [-0.30, 1.40, 0.04], Rc: [-1, 0.2, -0.3], Rw: 0, Lm: [0.42, 0.92, -0.12] };
const SIGUE_V = { ...SIGUE, c: [0.04, -0.07, 0.07], H: [6, 24, 0], S: [8, 10, -2], S1: [4, 7, 0], N: [-12, -18, 0], Hd: [-12, -14, 0], Rm: [-0.08, 1.12, 0.32], Rc: [-0.8, -0.8, -0.1], Rt: -30 };
// (dejada: un toque suave, sin fuerza, para que muera junto al frontis; la mano, a la altura de la cintura, el brazo
// apenas atrás, la muñeca blanda y casi sin recorrido después. Antes se veía como el golpe de la altura de la pelota)
const ARMADO_D = { ...ARMADO, c: [-0.05, -0.12, -0.03], H: [8, -30, 0], S: [12, -12, 3], S1: [6, -6, 0], S2: [3, -4, 0], N: [-10, 24, 0], Hd: [-12, 18, 0], Rm: [-0.40, 0.86, -0.06], Rc: [0, -1, -0.4], Rw: 20, Lm: [0.44, 0.96, 0.20] };
const IMPACTO_D = { ...IMPACTO, c: [0, -0.13, 0.04], H: [9, 4, 0], S: [13, 3, -2], S1: [6, 2, 0], N: [-12, -4, 0], Hd: [-12, -4, 0], Rm: [-0.24, 0.86, 0.30], Rc: [-0.4, -1, -0.1], Rw: -5, Lm: [0.42, 0.88, -0.12] };
const SIGUE_D = { ...IMPACTO_D, c: [0.02, -0.12, 0.05], H: [8, 12, 0], S: [12, 6, -2], Rm: [-0.15, 0.92, 0.36], Rc: [-0.6, -1, -0.1], Rw: -10 };
// (la dejada de abajo: arma como para una sotamano, agachado, y en el último momento solo la acaricia hacia arriba, para que
// muera encima de la chapa; el autor pasó las jugadas básicas, noviembre de 2026)
const IMPACTO_DB = { ...IMPACTO_B, Rm: [-0.26, 0.72, 0.26], Rc: [-0.3, -1, -0.2], Rw: -15 };
const SIGUE_DB = { ...IMPACTO_B, c: [0.01, -0.20, 0.04], H: [14, 2, 0], S: [18, 2, -2], Rm: [-0.20, 0.84, 0.32], Rc: [-0.5, -1, -0.1], Rw: -20 };
// (el bote pronto: le da nada más botar, muy agachado y con un golpe corto, casi parado, que no hay tiempo de más)
const ARMADO_BP = { ...ARMADO_B, c: [-0.04, -0.26, -0.03], H: [18, -24, 0], S: [24, -8, 3], S1: [12, -4, 0], N: [-20, 18, 0], Hd: [-20, 16, 0], Rm: [-0.42, 0.74, -0.06] };
const IMPACTO_BP = { ...IMPACTO_B, c: [0, -0.27, 0.05], H: [20, -4, 0], S: [26, 0, -2], S1: [12, 0, 0], N: [-22, 0, 0], Hd: [-20, 0, 0], Rm: [-0.28, 0.66, 0.28], Rc: [-0.2, -1, -0.2], Rw: 0 };
const SIGUE_BP = { ...IMPACTO_BP, c: [0.02, -0.22, 0.06], H: [16, 10, 0], S: [20, 6, -2], Rm: [-0.18, 0.86, 0.34], Rc: [-0.7, -1, -0.2] };
// (el besagain: de defensa, con la pelota alta y lejos del frontis; el brazo por encima del hombro y el cuerpo echado
// atrás, para devolverla como se pueda)
const ARMADO_BS = { ...ARMADO_A, c: [-0.05, -0.03, -0.06], H: [-4, -30, 0], S: [-8, -12, -6], S1: [-4, -6, -4], N: [-16, 22, 4], Hd: [-20, 16, 0], Rm: [-0.30, 1.38, -0.20], Rc: [-0.7, 0.3, -0.8], Rw: 25 };
const IMPACTO_BS = { ...IMPACTO_A, c: [0, -0.04, -0.02], H: [-2, 4, 0], S: [-6, 4, -6], S1: [-3, 3, -3], N: [-20, -6, 4], Hd: [-22, -4, 0], Rm: [-0.26, 1.40, 0.10], Rc: [-1, 0.3, -0.3], Rw: 0 };
const SIGUE_BS = { ...SIGUE_A, c: [0.03, -0.06, 0.04], H: [4, 20, 0], S: [2, 10, -4], Rm: [-0.06, 1.16, 0.30], Rc: [-0.9, -0.4, 0] };
// (el saque: con la pelota en la izquierda, da un paso, la bota en el suelo y le pega de derecha según sube)
const SAQUE_0 = { ...REPOSO, c: [0, -0.03, 0], S: [6, 0, 0], N: [-6, 0, 0], Lm: [0.10, 0.88, 0.30], Lc: [0.6, -1, -0.4], Rm: [-0.20, 0.76, 0.14] };
const SAQUE_BOTA = { ...PASO, c: [-0.03, -0.10, 0.06], H: [10, -20, 0], S: [16, -10, 0], Lm: [0.16, 0.70, 0.34], Lc: [0.6, -1, -0.2], Rm: [-0.46, 0.84, -0.04], Lp: [0.08, 0.05, 0.16], Lr: [-8, 6, 0] };
// (celebrar: puño arriba dos veces; lamentar: las manos a la cabeza y la cabeza abajo)
// (el puño arriba y abierto hacia fuera, en diagonal: recto hacia arriba, con la cabeza grande y el brazo corto, la mano
// quedaba delante de la cara o metida en el pelo; el autor, 20 de noviembre de 2026)
const PUNO_ARRIBA = { ...REPOSO, c: [0, 0, 0], S: [-6, 0, 2], N: [-10, 0, 0], Hd: [-12, 6, 0], Rm: [-0.40, 1.30, 0.0], Rc: [-1, 0.2, -0.3], Lm: [0.26, 0.80, 0.10] };
const PUNO_ABAJO = { ...REPOSO, c: [0, -0.07, 0.01], S: [12, 0, 0], S1: [4, 0, 0], N: [-6, 0, 0], Rm: [-0.20, 0.90, 0.20], Rc: [-0.4, -1, -0.4], Lm: [0.24, 0.80, 0.14], Lp: [0.04, 0, 0], Rp: [-0.04, 0, 0] };
const CABEZA = { ...REPOSO, c: [0, -0.02, 0], S: [8, 0, 0], N: [14, 0, 0], Hd: [16, 0, 0], Lm: [0.16, 1.30, 0.02], Lc: [1, 0, -0.3], Lw: -20, Rm: [-0.16, 1.30, 0.02], Rc: [-1, 0, -0.3], Rw: -20 };
// (más maneras de celebrar y de lamentar, y los gestos de entre tanto y tanto, para que no hagan siempre lo mismo)
// (los dos brazos arriba, con un salto; y el aplauso a la grada)
const AGACHA = { ...REPOSO, c: [0, -0.13, 0.01], H: [6, 0, 0], S: [10, 0, 0], N: [-8, 0, 0], Rm: [-0.22, 0.74, 0.16], Rc: [-0.6, -1, -0.3], Lm: [0.22, 0.74, 0.16], Lc: [0.6, -1, -0.3] };
// (los dos brazos arriba en V, como se celebra un tanto: abiertos hacia fuera y algo atrás, para que no tapen la cara ni se
// metan en el pelo)
const PUNOS_ARRIBA = { ...REPOSO, c: [0, 0, 0], S: [-8, 0, 0], N: [-10, 0, 0], Hd: [-14, 0, 0], Rm: [-0.42, 1.29, -0.02], Rc: [-1, 0.2, -0.3], Lm: [0.42, 1.29, -0.02], Lc: [1, 0.2, -0.3] };
const SALTO = { ...PUNOS_ARRIBA, c: [0, 0.1, 0], Lp: [0, 0.12, 0], Rp: [0, 0.12, 0], Lr: [18, 6, 0], Rr: [18, -6, 0] };
// (las palmas, delante del pecho: por encima de la cabeza no llegan, que la tienen grande, y se tapaban la cara)
const PALMAS = { ...REPOSO, c: [0, 0, 0], S: [-4, 0, 0], N: [-6, 0, 0], Hd: [-8, 0, 0], Rm: [-0.04, 0.99, 0.27], Rc: [-0.8, -1, 0], Rt: 0, Lm: [0.04, 0.99, 0.27], Lc: [0.8, -1, 0], Lt: 0 };
const PALMAS_ABRE = { ...PALMAS, Rm: [-0.17, 0.97, 0.25], Lm: [0.17, 0.97, 0.25] };
// (los brazos en jarra y la cabeza abajo, negando)
const JARRA = { ...REPOSO, c: [0, -0.01, 0], S: [7, 0, 0], N: [10, 0, 0], Hd: [16, 0, 0], Rm: [-0.19, 0.76, 0.0], Rc: [-1, 0, -0.5], Lm: [0.19, 0.76, 0.0], Lc: [1, 0, -0.5] };
// (soplarse la mano derecha, como hacen los pelotaris entre tanto y tanto; y soltar el brazo, sacudiéndolo a un lado)
const SOPLA = { ...REPOSO, c: [0, -0.01, 0], S: [5, 0, 0], N: [6, 0, 0], Hd: [10, 0, 0], Rm: [-0.03, 1.13, 0.2], Rc: [-1, -0.6, 0], Rt: 20 };
const SUELTA = { ...REPOSO, S: [2, 0, -5], RS: [0, 0, -6], Hd: [4, -14, 0], Rm: [-0.33, 0.68, 0.04], Rc: [-0.6, -0.2, -1] };
// (saludar: la mano arriba, de lado a lado)
const MANO_ARRIBA = { ...REPOSO, S: [-2, 0, 2], Rm: [-0.30, 1.38, 0.08], Rc: [-1, -0.6, 0.2], Hd: [-4, -10, 0] };

// los movimientos: [nombre en el juego, nombre en el archivo, bucle, poses con su tiempo]. Los del juego que empiezan
// en el golpe (la preparación la pone la postura de armado mientras llega la pelota) se recortan del entero
const T = (t, p) => [t, p];
const MOVS = [
  ['Idle', 'Reposo', true, [T(0, REPOSO), T(1.6, { ...REPOSO, c: [0.004, -0.012, 0], S2: [-1.5, 0, 0], LS: [0, 0, 1.2], RS: [0, 0, -1.2] }), T(3.2, REPOSO)]],
  ['Ready', 'Preparado', true, [T(0, ESPERA), T(0.4, ESPERA_B), T(0.8, ESPERA)]],
  ['HitFull', 'Derecha', false, [T(0, ESPERA), T(0.16, PASO), T(0.32, ARMADO), T(0.40, IMPACTO), T(0.58, SIGUE), T(1.0, ESPERA)]],
  ['LowFull', 'Sotamano', false, [T(0, ESPERA), T(0.16, PASO), T(0.32, ARMADO_B), T(0.41, IMPACTO_B), T(0.6, SIGUE_B), T(1.05, ESPERA)]],
  ['HighFull', 'Golpe de aire', false, [T(0, ESPERA), T(0.16, PASO), T(0.30, ARMADO_A), T(0.37, IMPACTO_A), T(0.55, SIGUE_A), T(0.95, ESPERA)]],
  ['GanchoFull', 'Gancho', false, [T(0, ESPERA), T(0.16, PASO), T(0.30, ARMADO_A), T(0.37, IMPACTO_G), T(0.56, SIGUE_G), T(1.0, ESPERA)]],
  ['VoleaFull', 'Volea', false, [T(0, ESPERA), T(0.12, PASO), T(0.24, ARMADO_V), T(0.32, IMPACTO_V), T(0.46, SIGUE_V), T(0.84, ESPERA)]],
  ['DejadaFull', 'Dejada', false, [T(0, ESPERA), T(0.14, PASO), T(0.28, ARMADO_D), T(0.36, IMPACTO_D), T(0.52, SIGUE_D), T(0.9, ESPERA)]],
  ['DejadaBajaFull', 'Dejada de abajo', false, [T(0, ESPERA), T(0.16, PASO), T(0.32, ARMADO_B), T(0.41, IMPACTO_DB), T(0.56, SIGUE_DB), T(0.95, ESPERA)]],
  ['BoteProntoFull', 'Bote pronto', false, [T(0, ESPERA), T(0.12, PASO), T(0.26, ARMADO_BP), T(0.34, IMPACTO_BP), T(0.48, SIGUE_BP), T(0.9, ESPERA)]],
  ['BesagainFull', 'Besagain', false, [T(0, ESPERA), T(0.16, PASO), T(0.30, ARMADO_BS), T(0.38, IMPACTO_BS), T(0.58, SIGUE_BS), T(1.0, ESPERA)]],
  ['Serve', 'Saque', false, [T(0, SAQUE_0), T(0.35, SAQUE_0), T(0.62, SAQUE_BOTA), T(0.86, ARMADO_B), T(0.95, IMPACTO_B), T(1.14, SIGUE), T(1.6, ESPERA)]],
  ['ShuffleR', 'Lateral a la derecha', true, [T(0, ESPERA), T(0.13, { ...ESPERA, c: [-0.05, -0.09, -0.03], Rp: [-0.19, 0.06, -0.05], Rr: [-6, -10, 0] }), T(0.26, { ...ESPERA, c: [-0.05, -0.13, -0.03], Rp: [-0.17, 0, -0.05], Lp: [0.02, 0, 0.05] }),
    T(0.39, { ...ESPERA, c: [0, -0.10, -0.03], Lp: [0.0, 0.06, 0.05], Lr: [-6, 10, 0] }), T(0.52, ESPERA)]],
  ['Celebrate', 'Celebra', false, [T(0, REPOSO), T(0.22, PUNO_ABAJO), T(0.45, PUNO_ARRIBA), T(0.68, PUNO_ABAJO), T(0.92, PUNO_ARRIBA), T(1.15, { ...PUNO_ARRIBA, Rm: [-0.38, 1.26, 0.04] }), T(1.6, REPOSO)]],
  ['Celebrate2', 'Celebra con salto', false, [T(0, REPOSO), T(0.2, AGACHA), T(0.4, SALTO), T(0.62, { ...PUNOS_ARRIBA, c: [0, -0.07, 0.01], S: [2, 0, 0] }), T(0.85, PUNOS_ARRIBA), T(1.05, { ...PUNOS_ARRIBA, Rm: [-0.40, 1.25, 0.02], Lm: [0.40, 1.25, 0.02] }), T(1.25, PUNOS_ARRIBA), T(1.7, REPOSO)]],
  ['Celebrate3', 'Aplaude a la grada', false, [T(0, REPOSO), T(0.3, PALMAS_ABRE), T(0.42, PALMAS), T(0.56, PALMAS_ABRE), T(0.68, PALMAS), T(0.82, PALMAS_ABRE), T(0.94, PALMAS), T(1.08, PALMAS_ABRE), T(1.2, PALMAS), T(1.34, PALMAS_ABRE), T(1.8, REPOSO)]],
  ['Sad2', 'Lamento en jarra', false, [T(0, REPOSO), T(0.4, JARRA), T(0.75, { ...JARRA, Hd: [16, -14, 0] }), T(1.1, { ...JARRA, Hd: [16, 14, 0] }), T(1.45, { ...JARRA, Hd: [16, -10, 0] }), T(1.75, JARRA), T(2.2, REPOSO)]],
  ['Sopla', 'Se sopla la mano', false, [T(0, REPOSO), T(0.35, SOPLA), T(0.6, { ...SOPLA, Rm: [-0.03, 1.12, 0.22], Hd: [12, 0, 0] }), T(0.85, SOPLA), T(1.1, { ...SOPLA, Rm: [-0.03, 1.12, 0.22], Hd: [12, 0, 0] }), T(1.3, SOPLA), T(1.7, REPOSO)]],
  ['Suelta', 'Suelta el brazo', false, [T(0, REPOSO), T(0.3, SUELTA), T(0.42, { ...SUELTA, Rm: [-0.36, 0.72, 0.1] }), T(0.54, { ...SUELTA, Rm: [-0.31, 0.66, -0.02] }), T(0.66, { ...SUELTA, Rm: [-0.36, 0.72, 0.1] }), T(0.78, { ...SUELTA, Rm: [-0.31, 0.66, -0.02] }), T(0.9, { ...SUELTA, Rm: [-0.36, 0.72, 0.1] }), T(1.02, SUELTA), T(1.45, REPOSO)]],
  ['Sad', 'Lamento', false, [T(0, REPOSO), T(0.35, CABEZA), T(0.7, { ...CABEZA, Hd: [16, -12, 0] }), T(1.0, { ...CABEZA, Hd: [16, 12, 0] }), T(1.3, CABEZA), T(1.8, REPOSO)]],
  ['Wave', 'Saluda', false, [T(0, REPOSO), T(0.3, MANO_ARRIBA), T(0.5, { ...MANO_ARRIBA, Rm: [-0.40, 1.34, 0.06] }), T(0.7, MANO_ARRIBA), T(0.9, { ...MANO_ARRIBA, Rm: [-0.40, 1.34, 0.06] }), T(1.1, MANO_ARRIBA), T(1.5, REPOSO)]],
  ['Talk', 'Habla', true, [T(0, REPOSO), T(0.6, { ...REPOSO, Rm: [-0.18, 0.86, 0.26], Rc: [-0.6, -1, -0.3], Hd: [0, -4, 0] }), T(1.2, { ...REPOSO, Lm: [0.18, 0.84, 0.24], Lc: [0.6, -1, -0.3], Hd: [0, 4, 0] }), T(1.8, REPOSO)]],
];
export const _movs = MOVS;
// (izquierda y lateral a la izquierda: los de la derecha, en espejo)
const ESPEJO = { DejadaBajaFull: ['DejadaBajaLFull', 'Dejada de abajo de izquierda'], BoteProntoFull: ['BoteProntoLFull', 'Bote pronto de izquierda'], BesagainFull: ['BesagainLFull', 'Besagain de izquierda'], GanchoFull: ['GanchoLFull', 'Gancho de izquierda'], VoleaFull: ['VoleaLFull', 'Volea de izquierda'], DejadaFull: ['DejadaLFull', 'Dejada de izquierda'], HitFull: ['HitLFull', 'Izquierda'], LowFull: ['LowLFull', 'Sotamano de izquierda'], HighFull: ['HighLFull', 'Golpe de aire de izquierda'], ShuffleR: ['ShuffleL', 'Lateral a la izquierda'] };
// (los cortes del juego: desde el armado, que la postura ya puso mientras llegaba la pelota)
// (desde el impacto: el armado ya lo puso la postura mientras llegaba la pelota, y el golpe se decide en el instante en que
// la pelota sale; si el clip empezaba en el armado, la mano llegaba a la pelota una décima después, cuando ya iba lejos)
const CORTES = { Hit: ['HitFull', 0.40], HitL: ['HitLFull', 0.40], Low: ['LowFull', 0.41], LowL: ['LowLFull', 0.41], High: ['HighFull', 0.37], HighL: ['HighLFull', 0.37],
  Gancho: ['GanchoFull', 0.37], GanchoL: ['GanchoLFull', 0.37], Volea: ['VoleaFull', 0.32], VoleaL: ['VoleaLFull', 0.32], Dejada: ['DejadaFull', 0.36], DejadaL: ['DejadaLFull', 0.36],
  DejadaBaja: ['DejadaBajaFull', 0.41], DejadaBajaL: ['DejadaBajaLFull', 0.41], BotePronto: ['BoteProntoFull', 0.34], BoteProntoL: ['BoteProntoLFull', 0.34], Besagain: ['BesagainFull', 0.38], BesagainL: ['BesagainLFull', 0.38] };
// (y la postura de armado de cada golpe, para que el juego la mezcle mientras llega la pelota)
// (y, para el saque, el brazo derecho con la pelota en la mano mientras corre, y el gesto de botarla contra el suelo)
const LLEVA = { ...REPOSO, Rm: [-0.21, 0.84, 0.2], Rc: [-0.5, -1, -0.3] };
const BOTA = { ...REPOSO, Rm: [-0.27, 0.6, 0.3], Rc: [-0.4, -1, -0.2] };
// (y yendo al saque, al trote: la pelota delante del pecho, con la derecha debajo y la izquierda acompañándola, como en
// el vídeo de un saque en Sopelana que pasó el autor, 17 de noviembre de 2026)
const LLEVA_C = { ...REPOSO, Rm: [-0.07, 0.9, 0.27], Rc: [-0.6, -1, -0.2], Lm: [0.06, 0.92, 0.27], Lc: [0.6, -1, -0.2] };
// (el saque, ya botada la pelota y sin dejar de correr: el brazo derecho atrás y abajo, con la mano por detrás de la cadera,
// el pecho girado hacia ella y el brazo izquierdo recogido delante, para equilibrar. Con el armado de un golpe normal, que
// es de parado y de lado, corriendo solo se le abrían los brazos en cruz)
// (y muy agachado, con las piernas abiertas y la izquierda delante, esperando a que baje la pelota del bote: así se ve en
// el vídeo del saque en Sopelana; antes esperaba casi de pie)
const SAQUE_ARMA = { ...ARMADO_B, c: [-0.03, -0.2, 0], H: [12, -18, 0], S: [22, -22, 4], S1: [12, -14, 0], S2: [6, -8, 0], N: [-20, 26, 0], Hd: [-16, 20, 0], Lp: [0.10, 0, 0.20], Rp: [-0.12, 0, -0.10],
  Rm: [-0.30, 0.76, -0.20], Rc: [-0.3, -0.6, -1], Rw: 15, Lm: [0.12, 0.98, 0.26], Lc: [0.7, -1, -0.1] };
export const ARMADOS = { Hit: ARMADO, Low: ARMADO_B, High: ARMADO_A, Lleva: LLEVA, LlevaC: LLEVA_C, Bota: BOTA, Saque: SAQUE_ARMA };

function espejo(p) {
  const o = {};
  for (const [k, v] of Object.entries(p)) {
    const k2 = k[0] === 'L' && k !== 'L' ? 'R' + k.slice(1) : k[0] === 'R' ? 'L' + k.slice(1) : k;
    if (typeof v === 'number') o[k2] = k[1] === 't' ? -v : v;
    else if (GIROS.includes(k) || k === 'Lr' || k === 'Rr' || k === 'LS' || k === 'RS') o[k2] = [v[0], -v[1], -v[2]];
    else o[k2] = [-v[0], v[1], v[2]];
  }
  return o;
}

// ---------- el esqueleto ----------
function montaje(scene) {
  const B = {};
  scene.traverse(o => { if (o.isBone) { const n = o.name.replace(/^mixamorig:?/, ''); for (const [k, v] of Object.entries(HUESOS)) if (v === n) B[k] = o; } });
  if (Object.keys(HUESOS).some(k => !B[k])) return null;
  scene.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(scene.matrixWorld).invert();
  const R = {};
  for (const [k, b] of Object.entries(B)) {
    const m = new THREE.Matrix4().multiplyMatrices(inv, b.matrixWorld), pm = new THREE.Matrix4().multiplyMatrices(inv, b.parent.matrixWorld);
    const P = new THREE.Vector3(), W = new THREE.Quaternion(), s = new THREE.Vector3(), PW = new THREE.Quaternion(), ps = new THREE.Vector3();
    m.decompose(P, W, s); pm.decompose(new THREE.Vector3(), PW, ps);
    R[k] = { b, q0: b.quaternion.clone(), p0: b.position.clone(), P, W, PW, ps: ps.x, M: m };
  }
  // (los huesos de giro del antebrazo, si los tiene: tools/blender/huesos-extra.py; van de la mitad del antebrazo a la muñeca)
  for (const [k, n] of [['LFT', 'LeftForeArmTwist'], ['RFT', 'RightForeArmTwist']]) {
    let b = null; scene.traverse(o => { if (!b && o.isBone && o.name.replace(/^mixamorig:?/, '') === n) b = o; });
    if (b && b.parent === B[k[0] + 'F']) { const m = new THREE.Matrix4().multiplyMatrices(inv, b.matrixWorld), P = new THREE.Vector3(), W = new THREE.Quaternion(); m.decompose(P, W, new THREE.Vector3()); R[k] = { b, q0: b.quaternion.clone(), p0: b.position.clone(), P, W, M: m }; }
  }
  const len = (a, z) => R[a].P.distanceTo(R[z].P);
  const L = { LA: [len('LA', 'LF'), len('LF', 'LH')], RA: [len('RA', 'RF'), len('RF', 'RH')], LU: [len('LU', 'LL'), len('LL', 'LP')], RU: [len('RU', 'RL'), len('RL', 'RP')] };
  // (las poses se hicieron sobre el pelotari de siempre, con el hombro a 1,04 y el brazo de 0,39; en un esqueleto de otra
  // talla, como los pelotaris nuevos de 1,84, con el hombro a 1,35, las manos se cuentan desde su hombro y a la medida de
  // su brazo, y lo que baja la cadera y se mueven los pies, a la de sus piernas. Si no, la pelota del saque iba en la
  // cadera y los golpes se daban todos bajos)
  const brazo = (L.LA[0] + L.LA[1] + L.RA[0] + L.RA[1]) / 2, pierna = R.H.P.y;
  R[ESC] = { LA: R.LA.P, RA: R.RA.P, kB: brazo / REF.brazo, kP: pierna / REF.cadera };
  // EL CODO, COMO EL DE UNA PERSONA: solo se dobla hacia delante (hacia la cara de la palma con el brazo colgando). Antes
  // ese lado se sacaba de cómo viene doblado el codo en reposo; en algún modelo de Meshy el reposo viene recto o un poco
  // pasado hacia atrás (la pelotari de la melena, 23° hacia atrás en el brazo derecho) y ese brazo se doblaba al revés en
  // todos los golpes. Ahora, si el reposo no se dobla claramente hacia delante, el lado bueno es el de delante del cuerpo
  const anat = {};
  for (const s of ['L', 'R']) {
    const up = R[s + 'F'].P.clone().sub(R[s + 'A'].P).normalize(), lo = R[s + 'H'].P.clone().sub(R[s + 'F'].P).normalize();
    const delante = new THREE.Vector3(0, 0, 1).addScaledVector(up, -up.z).normalize(), loP = lo.clone().addScaledVector(up, -lo.dot(up));
    const a = loP.length() > 0.12 && loP.clone().normalize().dot(delante) > 0.3 ? loP.normalize() : delante;
    // (y la referencia para medir cuánto gira el húmero sobre sí mismo: el brazo abajo, adelante y afuera, con su cara de
    // delante llevada desde el reposo. Medido desde el reposo, con el brazo cruzando al otro lado en el seguimiento de un
    // golpe la medida daba saltos de 180° y el codo volcaba de un fotograma a otro; lo opuesto a esta referencia, el brazo
    // arriba, atrás y hacia el otro lado, es donde un hombro no llega)
    const ref = new THREE.Vector3(s === 'L' ? 0.5 : -0.5, -0.6, 0.6).normalize();
    const aRef = a.clone().applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, ref)); aRef.addScaledVector(ref, -aRef.dot(ref)).normalize();
    anat[s] = { upR: up, aR: a, bisR: new THREE.Vector3().crossVectors(up, a).normalize(), ref, aRef };
  }
  return { B, R, L, inv, scene, anat, cab: volumenCabeza(scene, B.Hd, inv) };
}

// EL VOLUMEN DE LA CABEZA, CON EL PELO, para que las manos y los brazos no la atraviesen. El autor, 20 de noviembre de 2026:
// «cuando celebren y levanten las manos no se atraviesen la cabeza, como si fueran personajes humanos de verdad». Tienen la
// cabeza grande y el brazo corto: con los puños arriba, las manos y los antebrazos se metían en el pelo, y en el lamento
// (las manos a la cabeza) entraban hasta media cabeza. Se mide una vez por modelo con los vértices de la cabeza y lo que
// cuelga de ella (pelo incluido), ya con la escala de la cabeza (CABEZA de glbChar), en los ejes del hueso de la cabeza:
// desde el centro de esos vértices, hasta dónde llega la cabeza en cada dirección (24 × 48 direcciones, el más lejano de
// cada una), como un mapa del contorno: sigue el pelo rizado, los moños y las coletas, donde una caja o un elipsoide se
// quedaban cortos o se pasaban. Sin malla (las pruebas sin navegador), null y nada cambia
const CAB_EL = 24, CAB_AZ = 48;
function volumenCabeza(scene, head, inv) {
  if (scene.userData._cab !== undefined) return scene.userData._cab;
  let cab = null;
  try {
    const hm = new THREE.Matrix4().multiplyMatrices(inv, head.matrixWorld), hmInv = hm.clone().invert();
    const pts = [], v = new THREE.Vector3(), w4 = new THREE.Vector4(), j4 = new THREE.Vector4();
    scene.traverse(o => {
      if (!o.isSkinnedMesh || !o.skeleton) return;
      const bones = o.skeleton.bones, deCab = bones.map(b => { for (let p = b; p; p = p.parent) if (p === head) return true; return false; });
      if (!deCab.some(Boolean)) return;
      const pos = o.geometry.attributes.position, si = o.geometry.attributes.skinIndex, sw = o.geometry.attributes.skinWeight; if (!si || !sw) return;
      const mw = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      for (let i = 0; i < pos.count; i++) {
        j4.fromBufferAttribute(si, i); w4.fromBufferAttribute(sw, i);
        let wc = 0; for (let c = 0; c < 4; c++) if (deCab[j4.getComponent(c)]) wc += w4.getComponent(c);
        if (wc < 0.6) continue;
        v.fromBufferAttribute(pos, i); o.applyBoneTransform(i, v); v.applyMatrix4(mw).applyMatrix4(hmInv); pts.push(v.x, v.y, v.z);
      }
    });
    const n = pts.length / 3;
    if (n > 50) {
      const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
      for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) { lo[j] = Math.min(lo[j], pts[i * 3 + j]); hi[j] = Math.max(hi[j], pts[i * 3 + j]); }
      const c = new THREE.Vector3((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2), R = new Float32Array(CAB_EL * CAB_AZ);
      for (let i = 0; i < n; i++) {
        const x = pts[i * 3] - c.x, y = pts[i * 3 + 1] - c.y, z = pts[i * 3 + 2] - c.z, d = Math.hypot(x, y, z); if (d < 1e-6) continue;
        const e = Math.min(CAB_EL - 1, Math.floor((Math.asin(Math.max(-1, Math.min(1, y / d))) / Math.PI + 0.5) * CAB_EL)), az = Math.floor(((Math.atan2(z, x) / (2 * Math.PI)) + 1) % 1 * CAB_AZ) % CAB_AZ;
        if (d > R[e * CAB_AZ + az]) R[e * CAB_AZ + az] = d;
      }
      const e3 = new THREE.Vector3(); hm.decompose(new THREE.Vector3(), new THREE.Quaternion(), e3);
      cab = { c, R, esc: (e3.x + e3.y + e3.z) / 3 };
    }
  } catch (e) { cab = null; }
  scene.userData._cab = cab;
  return cab;
}
// (hasta dónde llega la cabeza en una dirección: el mapa, entre sus cuatro casillas más cercanas)
function radioCabeza(cab, x, y, z, d) {
  const fe = (Math.asin(Math.max(-1, Math.min(1, y / d))) / Math.PI + 0.5) * CAB_EL - 0.5, fa = ((Math.atan2(z, x) / (2 * Math.PI)) + 1) % 1 * CAB_AZ - 0.5;
  const e0 = Math.max(0, Math.min(CAB_EL - 1, Math.floor(fe))), e1 = Math.min(CAB_EL - 1, e0 + 1), te = Math.max(0, Math.min(1, fe - e0));
  const a0 = ((Math.floor(fa) % CAB_AZ) + CAB_AZ) % CAB_AZ, a1 = (a0 + 1) % CAB_AZ, ta = fa - Math.floor(fa), R = cab.R;
  // (la casilla más grande de las cuatro pesa algo más: entre dos rizos no se cuela la mano)
  const r00 = R[e0 * CAB_AZ + a0], r01 = R[e0 * CAB_AZ + a1], r10 = R[e1 * CAB_AZ + a0], r11 = R[e1 * CAB_AZ + a1];
  const bil = (r00 * (1 - ta) + r01 * ta) * (1 - te) + (r10 * (1 - ta) + r11 * ta) * te;
  return Math.max(bil, 0.85 * Math.max(r00, r01, r10, r11));
}
// (lo que se ha apartado de la cabeza al hornear, para la prueba)
export const _cabeza = { apartados: 0, peor: 1 };
const _hl = new THREE.Vector3();
// cuánto se mete un punto en la cabeza (menos de 1: dentro) y, si se mete, el punto de la superficie hacia el que salir
function enCabeza(cab, hm, hmInv, p, margen, sale) {
  _hl.copy(p).applyMatrix4(hmInv).sub(cab.c);
  const d = _hl.length(); if (d < 1e-6) return 1;
  const r = radioCabeza(cab, _hl.x, _hl.y, _hl.z, d); if (r <= 0) return 1;
  const lim = r + margen / cab.esc, k = d / lim;
  if (k < 1 && sale) sale.copy(_hl).multiplyScalar(lim / d).add(cab.c).applyMatrix4(hm);
  return k;
}

// (el esqueleto sobre el que se hicieron las poses: hombros, brazo entero y altura de la cadera; montaje, valor)
const ESC = Symbol('escala'), REF = { LA: [0.18, 1.044, 0.002], RA: [-0.18, 1.044, 0.002], brazo: 0.388, cadera: 0.728 };
// ---------- curvas entre poses ----------
const CERO = [0, 0, 0];
// (el giro del antebrazo de siempre: en reposo, el modelo tiene las palmas hacia delante; con 45°, hacia los muslos)
export let GIRO_T = 45;
export const _prueba = { set giro(v) { GIRO_T = v; } };
function valor(p, k, R) {
  if (p[k] != null) {
    const e = R[ESC], v = p[k];
    if (!e || (Math.abs(e.kB - 1) < 0.03 && Math.abs(e.kP - 1) < 0.03)) return v;
    if (k === 'Lm' || k === 'Rm') { const h = k === 'Lm' ? e.LA : e.RA, h0 = k === 'Lm' ? REF.LA : REF.RA; return [0, 1, 2].map(j => h.getComponent(j) + (v[j] - h0[j]) * e.kB); }
    if (k === 'c' || k === 'Lp' || k === 'Rp') return v.map(x => x * e.kP);
    return v;
  }
  if (k === 'Lm') return R.LH.P.toArray(); if (k === 'Rm') return R.RH.P.toArray();
  if (k === 'Lc') return [0.3, -0.3, -1]; if (k === 'Rc') return [-0.3, -0.3, -1];
  if (k === 'Lw' || k === 'Rw') return 0;
  if (k === 'Lt') return GIRO_T; if (k === 'Rt') return -GIRO_T;
  return CERO;
}
const CANALES = ['c', ...GIROS, 'Lm', 'Rm', 'Lc', 'Rc', 'Lw', 'Rw', 'Lt', 'Rt', 'Lp', 'Rp', 'Lr', 'Rr'];
// (Hermite con tangentes de Catmull-Rom; en los extremos, quieto, o envuelto si es un bucle)
function curva(keys, t, k, R, loop) {
  const n = keys.length, D = keys[n - 1][0];
  let i = 0; while (i < n - 2 && t > keys[i + 1][0]) i++;
  const [t0, p0] = keys[i], [t1, p1] = keys[i + 1], h = Math.max(1e-6, t1 - t0), u = Math.min(1, Math.max(0, (t - t0) / h));
  const a = valor(p0, k, R), b = valor(p1, k, R);
  const ant = i > 0 ? keys[i - 1] : loop ? [keys[n - 2][0] - D, keys[n - 2][1]] : null, sig = i + 2 < n ? keys[i + 2] : loop ? [D + keys[1][0], keys[1][1]] : null;
  const tang = (prev, next, here) => (x, j) => { if (!prev || !next) return 0; const pv = [].concat(valor(prev[1], k, R))[j], nv = [].concat(valor(next[1], k, R))[j]; return (nv - pv) / (next[0] - prev[0]) * h; };
  const ma = tang(ant, [t1, p1], a), mb = tang([t0, p0], sig, b);
  const u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  const A = [].concat(a), Bv = [].concat(b), out = A.map((x, j) => h00 * x + h10 * ma(x, j) + h01 * Bv[j] + h11 * mb(Bv[j], j));
  return typeof a === 'number' ? out[0] : out;
}

// ---------- colocar el esqueleto en una pose ----------
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4();
const giro = (r, out = new THREE.Quaternion()) => out.setFromEuler(_e.set(r[0] * G, r[1] * G, r[2] * G, 'YXZ'));
// (base ortonormal de un hueso: su dirección y su bisagra)
function base(dir, bis, out) {
  const x = dir.clone().normalize(), z = bis.clone().addScaledVector(x, -x.dot(bis)).normalize(), y = new THREE.Vector3().crossVectors(z, x);
  return out.makeBasis(x, y, z);
}
function mundo(R, k, inv) { const m = new THREE.Matrix4().multiplyMatrices(inv, R[k].b.matrixWorld), P = new THREE.Vector3(), W = new THREE.Quaternion(); m.decompose(P, W, _v); return { P, W, m }; }
// LOS LÍMITES DEL BRAZO HUMANO (grados): el húmero gira sobre sí mismo unos 70-80° hacia dentro y 90° hacia fuera (con
// el omóplato, algo más); el codo se dobla de 0 a 150° y nunca hacia atrás; el antebrazo prona y supina desde la palma
// adelante (supinación completa) hasta la palma atrás (unos 150°); la muñeca, ±70°. El autor, 17 de noviembre de 2026:
// «en ningún momento puedes doblar o girar partes del cuerpo que no sean lógicos u orgánicos»
export const ANATOMIA = { humeroDentro: 80, humeroFuera: 95, codoMax: 150, pronaMax: 150, supinaMax: 10, muneca: 70 };
// (lo que se ha corregido al hornear, para la prueba: tools/anatomia-pelotaris.mjs)
export const _anatomia = { brazos: 0, corregidos: 0, peor: 0, codo: 0, sinSolucion: 0, restoPeor: 0 };
const _sw = new THREE.Quaternion(), _a0 = new THREE.Vector3(), _aC = new THREE.Vector3(), _upC = new THREE.Vector3(), _u = new THREE.Vector3(), _pr = new THREE.Vector3();
// giro del húmero (positivo, hacia dentro) con el codo hacia u: el de ahora frente al de la referencia llevada por el camino
// más corto a la dirección de ahora (lo que el brazo tendría sin girar sobre sí mismo), en el pecho en reposo
function giroHumero(an, s, n, u, L1, L2, ln, pqInv) {
  const d = Math.min(L1 + L2 - 1e-4, Math.max(Math.abs(L1 - L2) + 1e-4, ln)), a = Math.min(L1, (L1 * L1 - L2 * L2 + d * d) / (2 * d));   // (como dosHuesos)
  _upC.copy(n).multiplyScalar(a).addScaledVector(u, Math.sqrt(Math.max(0, L1 * L1 - a * a))).normalize().applyQuaternion(pqInv);
  _aC.copy(u).negate().applyQuaternion(pqInv); _aC.addScaledVector(_upC, -_aC.dot(_upC)).normalize();
  _a0.copy(an.aRef).applyQuaternion(_sw.setFromUnitVectors(an.ref, _upC)); _a0.addScaledVector(_upC, -_a0.dot(_upC)).normalize();
  const t = Math.atan2(_pr.crossVectors(_a0, _aC).dot(_upC), _a0.dot(_aC)) / G;
  return s === 'L' ? t : -t;
}
// el polo del codo dentro de lo humano: si el de la pose obliga a girar el húmero más de lo que gira, se rota alrededor de
// la línea hombro-mano hasta el más cercano que sí se puede (el codo hacia donde lo pondría una persona)
// (la corrección del fotograma anterior de cada brazo: se sigue por el mismo lado, sin que el codo salte de un lado al
// otro entre dos fotogramas; hornea la pone a cero al empezar cada movimiento)
const _ant = { L: 0, R: 0 };
function poloHumano(an, s, S, T, pole, L1, L2, pqInv) {
  const n = T.clone().sub(S), ln = Math.max(1e-4, n.length()); n.normalize();
  const fuera = (phi) => { const p = pole.clone().applyAxisAngle(n, phi * G); _u.copy(p).addScaledVector(n, -n.dot(p)); if (_u.lengthSq() < 1e-8) return 1e9; _u.normalize();
    const t = giroHumero(an, s, n, _u, L1, L2, ln, pqInv); return Math.max(0, t - ANATOMIA.humeroDentro) + Math.max(0, -ANATOMIA.humeroFuera - t); };
  const v0 = fuera(0); _anatomia.brazos++; _anatomia.peor = Math.max(_anatomia.peor, v0);
  if (v0 === 0) { _ant[s] = 0; return pole; }
  // (de 5 en 5 grados desde el de la pose, primero por el lado del fotograma anterior; en el primero que vale, el borde
  // exacto entre el último que no valía y él: así el codo se mueve seguido, sin saltos)
  const lados = _ant[s] ? [Math.sign(_ant[s]), -Math.sign(_ant[s])] : [1, -1];
  let best = 0, bestV = v0;
  const busca = (lado) => { for (let i = 1; i <= 36; i++) { const phi = lado * i * 5, v = fuera(phi); if (v < bestV) { bestV = v; best = phi; }
    if (v === 0) { let a = phi - lado * 5, b = phi; for (let j = 0; j < 6; j++) { const m = (a + b) / 2; if (fuera(m) === 0) b = m; else a = m; } best = b; bestV = 0; return true; } } return false; };
  if (_ant[s]) { if (!busca(lados[0])) busca(lados[1]); }
  else { // (sin corrección antes: el lado más cercano)
    let bp = null; for (let i = 1; i <= 36 && bp == null; i++) for (const lado of lados) if (fuera(lado * i * 5) === 0) { bp = lado; break; }
    if (bp != null) busca(bp); else { busca(1); busca(-1); } }
  if (bestV > 0) { _anatomia.sinSolucion++; _anatomia.restoPeor = Math.max(_anatomia.restoPeor, bestV); }
  _anatomia.corregidos++; _ant[s] = best;
  return pole.clone().applyAxisAngle(n, best * G);
}
// dos huesos (brazo y antebrazo, muslo y pierna) hasta un sitio, con el codo o la rodilla hacia el polo
function dosHuesos(S, T, pole, L1, L2) {
  const d = T.clone().sub(S), ln = Math.min(L1 + L2 - 1e-4, Math.max(Math.abs(L1 - L2) + 1e-4, d.length())), n = d.normalize();
  const a = (L1 * L1 - L2 * L2 + ln * ln) / (2 * ln), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const u = pole.clone().addScaledVector(n, -n.dot(pole)); if (u.lengthSq() < 1e-8) u.set(0, 0, 1).addScaledVector(n, -n.z); u.normalize();
  const E = S.clone().addScaledVector(n, a).addScaledVector(u, h), Tc = S.clone().addScaledVector(n, ln);
  return { E, T: Tc, up: E.clone().sub(S).normalize(), lo: Tc.clone().sub(E).normalize(), bis: new THREE.Vector3().crossVectors(u, n).normalize() };
}
function posa(M, pose) {
  const { R, L, inv, scene } = M;
  for (const r of Object.values(R)) { r.b.quaternion.copy(r.q0); r.b.position.copy(r.p0); }
  // cadera: sitio y giro; espalda, cuello, cabeza y hombros: giro respecto al padre en reposo
  const c = pose.c; R.H.b.position.copy(R.H.p0).add(_v.set(c[0], c[1], c[2]).applyQuaternion(_q.copy(R.H.PW).invert()).divideScalar(R.H.ps || 1));
  for (const k of GIROS) { const r = R[k]; r.b.quaternion.copy(_q.copy(r.PW).invert().multiply(giro(pose[k], _q2)).multiply(r.PW).multiply(r.q0)); }
  scene.updateMatrixWorld(true);
  // brazos: la mano, contada en el pecho en reposo, pasa al pecho de ahora
  const pecho = mundo(R, 'S2', inv).m.multiply(_m.copy(R.S2.M).invert());
  const pq = new THREE.Quaternion().setFromRotationMatrix(_m2.extractRotation(pecho));
  const pqInv = pq.clone().invert();
  const cabM = M.cab ? mundo(R, 'Hd', inv).m : null, cabInv = cabM ? cabM.clone().invert() : null;
  for (const s of ['L', 'R']) {
    const A = R[s + 'A'], F = R[s + 'F'], Hh = R[s + 'H'], [L1, L2] = L[s + 'A'], an = M.anat[s];
    const Sh = mundo(R, s + 'A', inv).P, T = new THREE.Vector3(...pose[s + 'm']).applyMatrix4(pecho);
    // (el codo no se cierra más de 150°: si la mano pide estar más cerca del hombro, se queda a esa distancia)
    const dMin = Math.sqrt(L1 * L1 + L2 * L2 - 2 * L1 * L2 * Math.cos((180 - ANATOMIA.codoMax) * G)), dST = T.distanceTo(Sh);
    if (dST < dMin) { T.sub(Sh).multiplyScalar(dMin / Math.max(1e-5, dST)).add(Sh); _anatomia.codo++; }
    const pole = poloHumano(an, s, Sh, T, new THREE.Vector3(...pose[s + 'c']).applyQuaternion(pq), L1, L2, pqInv);
    let k = dosHuesos(Sh, T, pole, L1, L2);
    // (sin meterse en la cabeza: el codo, el antebrazo, la muñeca y la mano, con su grosor, fuera de su volumen; si algo
    // entra, la mano sale hacia la superficie más cercana y el brazo se vuelve a colocar, hasta que nada entre)
    if (cabM) for (let it = 0; it < 12; it++) {
      const kB = M.R[ESC]?.kB || 1, mano = k.T.clone().addScaledVector(k.lo, 0.05 * kB), dedos = k.T.clone().addScaledVector(k.lo, 0.1 * kB);
      const pts = [[Sh.clone().lerp(k.E, 0.7), 0.045], [k.E, 0.045], [k.E.clone().lerp(k.T, 0.5), 0.04], [k.T, 0.04], [mano, 0.04], [dedos, 0.03]];
      let peor = 1, dl = null;
      for (const [q, mg] of pts) { const sale = new THREE.Vector3(), kk = enCabeza(M.cab, cabM, cabInv, q, mg, sale); if (kk < peor) { peor = kk; dl = sale.sub(q); } }
      if (!dl) break;
      if (it === 0) { _cabeza.apartados++; _cabeza.peor = Math.min(_cabeza.peor, peor); }
      T.add(dl.multiplyScalar(1.15)); k = dosHuesos(Sh, T, pole, L1, L2);
    }
    const upR = F.P.clone().sub(A.P).normalize(), loR = Hh.P.clone().sub(F.P).normalize();
    // (el lado hacia el que se dobla, el anatómico: montaje)
    const bisR = an.bisR.clone();
    const Ru = base(k.up, k.bis, new THREE.Matrix4()).multiply(base(upR, bisR, _m).transpose()), Rf = base(k.lo, k.bis, new THREE.Matrix4()).multiply(base(loR, bisR, _m).transpose());
    const Wu = new THREE.Quaternion().setFromRotationMatrix(Ru).multiply(A.W), Wf = new THREE.Quaternion().setFromRotationMatrix(Rf).multiply(F.W);
    const w = Math.max(-ANATOMIA.muneca, Math.min(ANATOMIA.muneca, pose[s + 'w'] || 0));
    const Wh = new THREE.Quaternion().setFromAxisAngle(k.bis, w * G).multiply(_q.setFromRotationMatrix(Rf)).multiply(Hh.W);
    // (el antebrazo gira sobre sí mismo como el de una persona: la pronación y la supinación las hace el radio rodando sobre
    // el cúbito, desde la muñeca; el codo no gira. Con hueso de giro, el antebrazo solo se dobla, el hueso de giro lleva
    // la mitad del giro y la mano el giro entero; sin él, como antes, el antebrazo entero. Y dentro de su recorrido:
    // de la palma adelante, 10° más como mucho, a la palma atrás, 150°)
    const t0 = pose[s + 't'] || 0, prona = s === 'L' ? t0 : -t0, pr = Math.max(-ANATOMIA.supinaMax, Math.min(ANATOMIA.pronaMax, prona)), t = s === 'L' ? pr : -pr;
    const tw = new THREE.Quaternion().setFromAxisAngle(k.lo, t * G); Wh.premultiply(tw);
    const FT = R[s + 'FT']; if (!FT) Wf.premultiply(tw);
    const Wp = mundo(R, s + 'S', inv).W;
    A.b.quaternion.copy(_q.copy(Wp).invert().multiply(Wu)); F.b.quaternion.copy(_q.copy(Wu).invert().multiply(Wf)); Hh.b.quaternion.copy(_q.copy(Wf).invert().multiply(Wh));
    if (FT) FT.b.quaternion.copy(FT.q0).multiply(_q.setFromAxisAngle(_v.set(0, 1, 0), t * G * 0.5));
  }
  // piernas: el tobillo donde dice la pose, la rodilla hacia delante (entre la cadera y la punta del pie)
  const cad = mundo(R, 'H', inv), fwdH = new THREE.Vector3(0, 0, 1).applyQuaternion(cad.W.clone().multiply(_q.copy(R.H.W).invert())); fwdH.y = 0;
  for (const s of ['L', 'R']) {
    const U = R[s + 'U'], Lg = R[s + 'L'], P = R[s + 'P'], To = R[s + 'T'], [L1, L2] = L[s + 'U'], rp = pose[s + 'r'];
    const Hp = mundo(R, s + 'U', inv).P, T = P.P.clone().add(new THREE.Vector3(...pose[s + 'p']));
    const yawPie = giro([0, rp[1], 0]), pole = fwdH.clone().normalize().add(new THREE.Vector3(0, 0, 1).applyQuaternion(yawPie)).add(new THREE.Vector3(s === 'L' ? 0.12 : -0.12, 0, 0));
    const k = dosHuesos(Hp, T, pole, L1, L2);
    const upR = Lg.P.clone().sub(U.P).normalize(), loR = P.P.clone().sub(Lg.P).normalize(), nR = P.P.clone().sub(U.P).normalize();
    const bisR = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 0, 1), nR).normalize();
    const Ru = base(k.up, k.bis, new THREE.Matrix4()).multiply(base(upR, bisR, _m).transpose()), Rl = base(k.lo, k.bis, new THREE.Matrix4()).multiply(base(loR, bisR, _m).transpose());
    const Wu = new THREE.Quaternion().setFromRotationMatrix(Ru).multiply(U.W), Wl = new THREE.Quaternion().setFromRotationMatrix(Rl).multiply(Lg.W);
    const Wf = giro(rp).multiply(P.W), Wt = yawPie.clone().multiply(To.W);
    U.b.quaternion.copy(_q.copy(cad.W).invert().multiply(Wu)); Lg.b.quaternion.copy(_q.copy(Wu).invert().multiply(Wl));
    P.b.quaternion.copy(_q.copy(Wl).invert().multiply(Wf)); To.b.quaternion.copy(_q.copy(Wf).invert().multiply(Wt));
  }
}

function hornea(M, nombre, keys, loop) {
  _ant.L = _ant.R = 0;
  const { R } = M, D = keys[keys.length - 1][0], n = Math.max(2, Math.round(D * FPS) + 1), ks = Object.keys(R);
  const times = new Float32Array(n), Q = Object.fromEntries(ks.map(k => [k, new Float32Array(n * 4)])), Pp = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * D; times[i] = t;
    const pose = {}; for (const k of CANALES) pose[k] = curva(keys, t, k, R, loop);
    posa(M, pose);
    for (const k of ks) { const q = R[k].b.quaternion, a = Q[k]; if (i && a[i * 4 - 4] * q.x + a[i * 4 - 3] * q.y + a[i * 4 - 2] * q.z + a[i * 4 - 1] * q.w < 0) q.set(-q.x, -q.y, -q.z, -q.w); a.set([q.x, q.y, q.z, q.w], i * 4); }
    Pp.set(R.H.b.position.toArray(), i * 3);
  }
  for (const r of Object.values(R)) { r.b.quaternion.copy(r.q0); r.b.position.copy(r.p0); }
  const tracks = ks.map(k => new THREE.QuaternionKeyframeTrack(`${R[k].b.name}.quaternion`, times, Q[k]));
  tracks.push(new THREE.VectorKeyframeTrack(`${R.H.b.name}.position`, times, Pp));
  return new THREE.AnimationClip(nombre, D, tracks);
}
function recorta(clip, nombre, t0) {
  const tracks = clip.tracks.map(tr => { const vs = tr.getValueSize(), i0 = tr.times.findIndex(t => t >= t0 - 1e-4); return new tr.constructor(tr.name, tr.times.slice(i0).map(t => t - tr.times[i0]), tr.values.slice(i0 * vs)); });
  return new THREE.AnimationClip(nombre, clip.duration - t0, tracks);
}

/**
 * Los movimientos de pelota del pelotari, hechos sobre su esqueleto (la escena del GLB recién cargado, en reposo).
 * @param {THREE.Object3D} scene
 * @param {{ archivo?: boolean }} [o] con archivo, los nombres en castellano y los golpes enteros, para el GLB que se entrega
 * @returns {THREE.AnimationClip[]} vacío si el esqueleto no es el de Mixamo
 */
export function pelotaMoves(scene, { archivo = false } = {}) {
  const M = montaje(scene); if (!M) return [];
  const lista = [];
  for (const [id, es, loop, keys] of MOVS) {
    lista.push([id, es, loop, keys]);
    if (ESPEJO[id]) lista.push([ESPEJO[id][0], ESPEJO[id][1], loop, keys.map(([t, p]) => [t, espejo(p)])]);
  }
  const por = {};
  for (const [id, es, loop, keys] of lista) { const c = hornea(M, archivo ? es : id, keys, loop); c.userData = { loop, id }; por[id] = c; }
  if (archivo) return Object.values(por);
  const out = Object.values(por).filter(c => !/Full$/.test(c.userData.id));
  for (const [id, [de, t0]] of Object.entries(CORTES)) { const c = recorta(por[de], id, t0); c.userData = { loop: false, id }; out.push(c); }
  return out;
}

/** La pose de armado de un golpe, como cuaterniones de cada hueso, para mezclarla encima de la animación mientras llega la pelota. */
export function poseArmado(scene, cual = 'Hit', izq = false) {
  const M = montaje(scene); if (!M) return null;
  const p0 = ARMADOS[cual] || ARMADO, p = izq ? espejo(p0) : p0, pose = {};
  for (const k of CANALES) pose[k] = valor(p, k, M.R);
  posa(M, pose);
  const out = { q: {}, pos: M.R.H.b.position.clone() };
  for (const [k, r] of Object.entries(M.R)) out.q[r.b.name] = r.b.quaternion.clone();
  for (const r of Object.values(M.R)) { r.b.quaternion.copy(r.q0); r.b.position.copy(r.p0); }
  return out;
}

/**
 * LA CARRERA, CON LOS PIES POR DEBAJO DEL CUERPO. El autor, 20 de noviembre de 2026: «que a la hora de correr no corran
 * con las piernas en V, que el movimiento de correr sea más natural, más orgánico». La carrera que trae Meshy pisa con los
 * pies a 30 cm uno del otro, más abiertos que la cadera (22 cm entre las dos articulaciones), y de frente las piernas
 * hacían una V. Corriendo, una persona pisa casi en una línea, debajo del centro del cuerpo. Aquí, en cada fotograma del
 * clip, cada tobillo se lleva hacia el centro (lo que se separa del centro de la cadera, por `k`) sin cambiar ni su altura
 * ni lo que avanza o retrasa, la pierna se vuelve a colocar con dos huesos, con la rodilla hacia delante (lo que se
 * abría de lado, por `rodilla`), y el pie conserva el giro que traía. Se hace una vez al cargar el modelo.
 * @returns {THREE.AnimationClip} el clip nuevo (o el mismo si el esqueleto no es el de Mixamo)
 */
// (y desde la noche del 20, más orgánica. El autor: «el modo de correr ha mejorado algo, pero aún así no me gusta cómo
// corren. Creo que no es orgánico». La carrera de Meshy da pasos muy cortos (unos 0,54 m) y el juego la aceleraba hasta
// ×2,8 para llegar a la velocidad del partido: siete u ocho pasitos por segundo, como frenéticos. Ahora la zancada es
// `zancada` veces más larga (los pies van más adelante y más atrás de la cadera) y el ritmo se divide por lo mismo
// (clip.userData.zancada, glbChar.js): menos pasos y más largos. Y el cuerpo, `inclina` grados hacia delante, como quien
// corre de verdad: la carrera de Meshy iba con el tronco tieso)
export function carreraNatural(scene, clip, { k = 0.45, rodilla = 0.3, brazo = 0.35, zancada = 1.45, inclina = 7, mano = 0.9 } = {}) {
  const M = clip && montaje(scene); if (!M) return clip;
  const { R, L, inv } = M, nom = (s) => `${R[s].b.name}.quaternion`;
  const trU = clip.tracks.find(t => t.name === nom('LU')); if (!trU) return clip;
  const mixer = new THREE.AnimationMixer(scene), act = mixer.clipAction(clip); act.play();
  const W = (o) => { const q = new THREE.Quaternion(); new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld).decompose(_v.clone(), q, _v.clone()); return q; };
  const times = trU.times, n = times.length, ks = ['S', 'LU', 'LL', 'LP', 'RU', 'RL', 'RP', 'LA', 'LF', 'LH', 'RA', 'RF', 'RH', ...['LFT', 'RFT'].filter(s => R[s])], Q = Object.fromEntries(ks.map(s => [s, new Float32Array(n * 4)]));
  const qInc = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), inclina * Math.PI / 180);   // (el tronco hacia delante, que mira a +z)
  for (let i = 0; i < n; i++) {
    mixer.setTime(times[i]); scene.updateMatrixWorld(true);
    { const wS = qInc.clone().multiply(W(R.S.b)); R.S.b.quaternion.copy(W(R.S.b.parent).invert().multiply(wS)); scene.updateMatrixWorld(true);
      const q = R.S.b.quaternion, a = Q.S; if (i && a[i * 4 - 4] * q.x + a[i * 4 - 3] * q.y + a[i * 4 - 2] * q.z + a[i * 4 - 1] * q.w < 0) q.set(-q.x, -q.y, -q.z, -q.w); q.toArray(a, i * 4); }
    const Hc = mundo(R, 'H', inv).P;
    for (const s of ['L', 'R']) {
      const U = mundo(R, s + 'U', inv), Kn = mundo(R, s + 'L', inv), F = mundo(R, s + 'P', inv), [L1, L2] = L[s + 'U'];
      const Ft = F.P.clone(); Ft.x = Hc.x + (F.P.x - Hc.x) * k; Ft.z = Hc.z + (F.P.z - Hc.z) * zancada;   // (los pies bajo el cuerpo y más adelante y atrás)
      const eje = F.P.clone().sub(U.P).normalize(), pol = Kn.P.clone().sub(U.P); pol.addScaledVector(eje, -pol.dot(eje)); pol.x *= rodilla; if (pol.lengthSq() < 1e-8) pol.set(0, 0, 1);
      const sol = dosHuesos(U.P, Ft, pol, L1, L2);
      const wU = new THREE.Quaternion().setFromUnitVectors(Kn.P.clone().sub(U.P).normalize(), sol.up).multiply(U.W);
      R[s + 'U'].b.quaternion.copy(W(R[s + 'U'].b.parent).invert().multiply(wU)); scene.updateMatrixWorld(true);
      const K2 = mundo(R, s + 'L', inv), F2 = mundo(R, s + 'P', inv);
      const wL = new THREE.Quaternion().setFromUnitVectors(F2.P.clone().sub(K2.P).normalize(), sol.lo).multiply(K2.W);
      R[s + 'L'].b.quaternion.copy(wU.clone().invert().multiply(wL));
      R[s + 'P'].b.quaternion.copy(wL.clone().invert().multiply(F.W)); scene.updateMatrixWorld(true);
      // (y los brazos, recogidos junto al cuerpo: en la carrera de Meshy las manos iban 9 cm por fuera de los hombros, con los
      // codos abiertos, como si llevase una bandeja; corriendo, el brazo va y viene pegado al costado. La mano se acerca a
      // la línea del hombro, por `brazo`, sin cambiar su altura ni lo que avanza, el codo apunta atrás y la mano conserva su giro)
      const A = mundo(R, s + 'A', inv), E = mundo(R, s + 'F', inv), Hm = mundo(R, s + 'H', inv), [A1, A2] = L[s + 'A'];
      const Ht = Hm.P.clone(); Ht.x = A.P.x + (Hm.P.x - A.P.x) * brazo;
      const ejeA = Hm.P.clone().sub(A.P).normalize(), polA = E.P.clone().sub(A.P); polA.addScaledVector(ejeA, -polA.dot(ejeA)); polA.x *= 0.4; if (polA.lengthSq() < 1e-8) polA.set(0, 0, -1);
      const solA = dosHuesos(A.P, Ht, polA, A1, A2);
      const wA = new THREE.Quaternion().setFromUnitVectors(E.P.clone().sub(A.P).normalize(), solA.up).multiply(A.W);
      R[s + 'A'].b.quaternion.copy(W(R[s + 'A'].b.parent).invert().multiply(wA)); scene.updateMatrixWorld(true);
      const E2 = mundo(R, s + 'F', inv), H2 = mundo(R, s + 'H', inv);
      const wF = new THREE.Quaternion().setFromUnitVectors(H2.P.clone().sub(E2.P).normalize(), solA.lo).multiply(E2.W);
      // (y la palma hacia dentro, hacia el muslo, con el pulgar arriba: en la carrera de Meshy, con la mano abierta, la palma
      // iba hacia arriba con el brazo delante y hacia delante con el brazo atrás, como quien pide algo. Los pelotaris están
      // en reposo con la palma hacia delante (medido en la malla de la mano de varios: el plano de la mano mira a +z, con el
      // pulgar hacia fuera). Se gira el antebrazo con la mano sobre su eje, como la pronación de una persona; con hueso de
      // giro, el antebrazo queda y ese hueso lleva la mitad)
      const fa = H2.P.clone().sub(E2.P).normalize(), palma = new THREE.Vector3(0, 0, 1).applyQuaternion(Hm.W.clone().multiply(R[s + 'H'].W.clone().invert()));
      const tgt = new THREE.Vector3(s === 'L' ? -1 : 1, -0.15, 0.2); palma.addScaledVector(fa, -palma.dot(fa)); tgt.addScaledVector(fa, -tgt.dot(fa));
      let ang = 0; if (palma.lengthSq() > 1e-6 && tgt.lengthSq() > 1e-6) { palma.normalize(); tgt.normalize(); ang = Math.atan2(new THREE.Vector3().crossVectors(palma, tgt).dot(fa), palma.dot(tgt)); }
      ang = Math.max(-1.75, Math.min(1.75, ang)) * mano;
      const tw = new THREE.Quaternion().setFromAxisAngle(fa, ang), FT = R[s + 'FT'], wF2 = FT ? wF : tw.clone().multiply(wF);
      R[s + 'F'].b.quaternion.copy(wA.clone().invert().multiply(wF2));
      R[s + 'H'].b.quaternion.copy(wF2.clone().invert().multiply(tw.multiply(Hm.W)));
      if (FT) FT.b.quaternion.copy(FT.q0).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang * 0.5));
      scene.updateMatrixWorld(true);
      for (const b of [s + 'U', s + 'L', s + 'P', s + 'A', s + 'F', s + 'H', ...(R[s + 'FT'] ? [s + 'FT'] : [])]) { const q = R[b].b.quaternion, a = Q[b]; if (i && a[i * 4 - 4] * q.x + a[i * 4 - 3] * q.y + a[i * 4 - 2] * q.z + a[i * 4 - 1] * q.w < 0) q.set(-q.x, -q.y, -q.z, -q.w); a.set([q.x, q.y, q.z, q.w], i * 4); }
    }
  }
  act.stop(); mixer.uncacheRoot(scene);
  for (const r of Object.values(R)) { r.b.quaternion.copy(r.q0); r.b.position.copy(r.p0); }
  scene.updateMatrixWorld(true);
  const quita = new Set(ks.map(nom)), tracks = clip.tracks.filter(t => !quita.has(t.name)).map(t => t.clone());
  for (const s of ks) tracks.push(new THREE.QuaternionKeyframeTrack(nom(s), times.slice(), Q[s]));
  const c = new THREE.AnimationClip(clip.name, clip.duration, tracks); c.userData = { ...(clip.userData || {}), zancada };
  return c;
}
