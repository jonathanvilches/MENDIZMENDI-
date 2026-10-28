// Medidas y ayudas que comparten las partes del partido (game.js y sus temas: humano, balón, defensa, IA y árbitro).
// R, STEP, HW_G, N y SC cambian con el formato (fútbol 11 o sala): se exportan como variables vivas y onFormat las
// rehace cada vez que se elige otro.
import { FIELD as F, PHYS as K, ROLES, RULES as RU, onFormat } from './rules.js';
import { clamp } from '../util/math.js';

export let R, STEP, HW_G, N, SC;
// SC: escala de las distancias de la IA (1 en fútbol 11; en la pista de sala, todo más cerca)
onFormat(() => { R = K.R; STEP = 1 / K.hz; HW_G = F.goalW / 2; N = ROLES.length; SC = RU.scale; });
// debug: window.FUTBOL_DEBUG = true escribe los eventos del partido en la consola
export const DEBUG = () => typeof window !== 'undefined' && window.FUTBOL_DEBUG;
export const hyp = Math.hypot;
export const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
export const fwd = (p) => ({ x: Math.sin(p.h), z: Math.cos(p.h) });
export const foot = (p) => ({ x: p.x + Math.sin(p.h) * 0.32, z: p.z + Math.cos(p.h) * 0.32 });
// distancia de un punto al segmento a→b (y en qué parte del segmento cae)
export function segDist(px, pz, ax, az, bx, bz) {
  const ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez || 1e-9;
  const t = clamp(((px - ax) * ex + (pz - az) * ez) / l2, 0, 1);
  return { d: hyp(px - ax - ex * t, pz - az - ez * t), t };
}

// alcance del portero: velocidad máxima de la estirada (m/s, por su nivel), dónde van las manos respecto al cuerpo y el
// radio que cubre estirado, de pie y abierto ante un delantero. En sala, con una portería de 3 × 2 m, más corto: con el
// alcance de fútbol 11 lo paraba todo
export const gkReach = () => F.areaD
  ? { v: 3.6, hand: 0.35, dive: 0.6, stand: 0.9, spread: 0.95 }
  : { v: 6.2, hand: 0.45, dive: 0.7, stand: 0.6, spread: 1.05 };
export const TAP = 0.15;   // (un toque de PASE dura menos que esto; mantenido más, se carga la fuerza)
// forma (fit, de 1 a 0,2): el cansancio de todo el partido, que no se recupera. Lo que baja en un partido entero: algo por
// estar en el campo (base), mucho más por cada momento esprintando (sprint) y poco el portero. La energía del sprint no
// pasa de la forma y, cansado, el jugador corre menos
export const FIT = { base: 0.34, sprint: 1.3, gk: 0.06 };
// cuánto corre según su forma y si está lesionado (leve: cojea un poco; grave: cojea y no puede esprintar)
export const legs = (p) => (0.86 + 0.14 * p.fit) * (p.inj ? (p.inj.sev === 'grave' ? 0.6 : 0.86) : 1);
