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
// (el saque: con la pelota en la izquierda, da un paso, la bota en el suelo y le pega de derecha según sube)
const SAQUE_0 = { ...REPOSO, c: [0, -0.03, 0], S: [6, 0, 0], N: [-6, 0, 0], Lm: [0.10, 0.88, 0.30], Lc: [0.6, -1, -0.4], Rm: [-0.20, 0.76, 0.14] };
const SAQUE_BOTA = { ...PASO, c: [-0.03, -0.10, 0.06], H: [10, -20, 0], S: [16, -10, 0], Lm: [0.16, 0.70, 0.34], Lc: [0.6, -1, -0.2], Rm: [-0.46, 0.84, -0.04], Lp: [0.08, 0.05, 0.16], Lr: [-8, 6, 0] };
// (celebrar: puño arriba dos veces; lamentar: las manos a la cabeza y la cabeza abajo)
const PUNO_ARRIBA = { ...REPOSO, c: [0, 0, 0], S: [-6, 0, 0], N: [-10, 0, 0], Hd: [-12, 0, 0], Rm: [-0.22, 1.42, 0.10], Rc: [-1, 0, 0], Lm: [0.26, 0.80, 0.10] };
const PUNO_ABAJO = { ...REPOSO, c: [0, -0.07, 0.01], S: [12, 0, 0], S1: [4, 0, 0], N: [-6, 0, 0], Rm: [-0.20, 0.90, 0.20], Rc: [-0.4, -1, -0.4], Lm: [0.24, 0.80, 0.14], Lp: [0.04, 0, 0], Rp: [-0.04, 0, 0] };
const CABEZA = { ...REPOSO, c: [0, -0.02, 0], S: [8, 0, 0], N: [14, 0, 0], Hd: [16, 0, 0], Lm: [0.16, 1.30, 0.02], Lc: [1, 0, -0.3], Lw: -20, Rm: [-0.16, 1.30, 0.02], Rc: [-1, 0, -0.3], Rw: -20 };
// (más maneras de celebrar y de lamentar, y los gestos de entre tanto y tanto, para que no hagan siempre lo mismo)
// (los dos brazos arriba, con un salto; y el aplauso a la grada)
const AGACHA = { ...REPOSO, c: [0, -0.13, 0.01], H: [6, 0, 0], S: [10, 0, 0], N: [-8, 0, 0], Rm: [-0.22, 0.74, 0.16], Rc: [-0.6, -1, -0.3], Lm: [0.22, 0.74, 0.16], Lc: [0.6, -1, -0.3] };
const PUNOS_ARRIBA = { ...REPOSO, c: [0, 0, 0], S: [-8, 0, 0], N: [-10, 0, 0], Hd: [-14, 0, 0], Rm: [-0.25, 1.42, 0.08], Rc: [-1, 0, 0], Lm: [0.25, 1.42, 0.08], Lc: [1, 0, 0] };
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
  ['Serve', 'Saque', false, [T(0, SAQUE_0), T(0.35, SAQUE_0), T(0.62, SAQUE_BOTA), T(0.86, ARMADO_B), T(0.95, IMPACTO_B), T(1.14, SIGUE), T(1.6, ESPERA)]],
  ['ShuffleR', 'Lateral a la derecha', true, [T(0, ESPERA), T(0.13, { ...ESPERA, c: [-0.05, -0.09, -0.03], Rp: [-0.19, 0.06, -0.05], Rr: [-6, -10, 0] }), T(0.26, { ...ESPERA, c: [-0.05, -0.13, -0.03], Rp: [-0.17, 0, -0.05], Lp: [0.02, 0, 0.05] }),
    T(0.39, { ...ESPERA, c: [0, -0.10, -0.03], Lp: [0.0, 0.06, 0.05], Lr: [-6, 10, 0] }), T(0.52, ESPERA)]],
  ['Celebrate', 'Celebra', false, [T(0, REPOSO), T(0.22, PUNO_ABAJO), T(0.45, PUNO_ARRIBA), T(0.68, PUNO_ABAJO), T(0.92, PUNO_ARRIBA), T(1.15, { ...PUNO_ARRIBA, Rm: [-0.24, 1.36, 0.12] }), T(1.6, REPOSO)]],
  ['Celebrate2', 'Celebra con salto', false, [T(0, REPOSO), T(0.2, AGACHA), T(0.4, SALTO), T(0.62, { ...PUNOS_ARRIBA, c: [0, -0.07, 0.01], S: [2, 0, 0] }), T(0.85, PUNOS_ARRIBA), T(1.05, { ...PUNOS_ARRIBA, Rm: [-0.27, 1.36, 0.1], Lm: [0.27, 1.36, 0.1] }), T(1.25, PUNOS_ARRIBA), T(1.7, REPOSO)]],
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
const ESPEJO = { HitFull: ['HitLFull', 'Izquierda'], LowFull: ['LowLFull', 'Sotamano de izquierda'], HighFull: ['HighLFull', 'Golpe de aire de izquierda'], ShuffleR: ['ShuffleL', 'Lateral a la izquierda'] };
// (los cortes del juego: desde el armado, que la postura ya puso mientras llegaba la pelota)
const CORTES = { Hit: ['HitFull', 0.32], HitL: ['HitLFull', 0.32], Low: ['LowFull', 0.32], LowL: ['LowLFull', 0.32], High: ['HighFull', 0.30], HighL: ['HighLFull', 0.30] };
// (y la postura de armado de cada golpe, para que el juego la mezcle mientras llega la pelota)
export const ARMADOS = { Hit: ARMADO, Low: ARMADO_B, High: ARMADO_A };

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
  const len = (a, z) => R[a].P.distanceTo(R[z].P);
  const L = { LA: [len('LA', 'LF'), len('LF', 'LH')], RA: [len('RA', 'RF'), len('RF', 'RH')], LU: [len('LU', 'LL'), len('LL', 'LP')], RU: [len('RU', 'RL'), len('RL', 'RP')] };
  return { B, R, L, inv, scene };
}

// ---------- curvas entre poses ----------
const CERO = [0, 0, 0];
// (el giro del antebrazo de siempre: en reposo, el modelo tiene las palmas hacia delante; con 45°, hacia los muslos)
export let GIRO_T = 45;
export const _prueba = { set giro(v) { GIRO_T = v; } };
function valor(p, k, R) {
  if (p[k] != null) return p[k];
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
  for (const s of ['L', 'R']) {
    const A = R[s + 'A'], F = R[s + 'F'], Hh = R[s + 'H'], [L1, L2] = L[s + 'A'];
    const Sh = mundo(R, s + 'A', inv).P, T = new THREE.Vector3(...pose[s + 'm']).applyMatrix4(pecho), pole = new THREE.Vector3(...pose[s + 'c']).applyQuaternion(pq);
    const k = dosHuesos(Sh, T, pole, L1, L2);
    const upR = F.P.clone().sub(A.P).normalize(), loR = Hh.P.clone().sub(F.P).normalize();
    let bisR = new THREE.Vector3().crossVectors(upR, loR); if (bisR.lengthSq() < 1e-6) bisR.set(s === 'L' ? -1 : 1, 0, 0); bisR.normalize();
    const Ru = base(k.up, k.bis, new THREE.Matrix4()).multiply(base(upR, bisR, _m).transpose()), Rf = base(k.lo, k.bis, new THREE.Matrix4()).multiply(base(loR, bisR, _m).transpose());
    const Wu = new THREE.Quaternion().setFromRotationMatrix(Ru).multiply(A.W), Wf = new THREE.Quaternion().setFromRotationMatrix(Rf).multiply(F.W);
    const Wh = new THREE.Quaternion().setFromAxisAngle(k.bis, (pose[s + 'w'] || 0) * G).multiply(_q.setFromRotationMatrix(Rf)).multiply(Hh.W);
    // (el antebrazo y la mano giran sobre el antebrazo: la palma hacia dentro o hacia abajo)
    const tw = new THREE.Quaternion().setFromAxisAngle(k.lo, (pose[s + 't'] || 0) * G); Wf.premultiply(tw); Wh.premultiply(tw);
    const Wp = mundo(R, s + 'S', inv).W;
    A.b.quaternion.copy(_q.copy(Wp).invert().multiply(Wu)); F.b.quaternion.copy(_q.copy(Wu).invert().multiply(Wf)); Hh.b.quaternion.copy(_q.copy(Wf).invert().multiply(Wh));
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
