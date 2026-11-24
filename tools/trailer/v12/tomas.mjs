// El tráiler v12: el v11 (v11/tomas.mjs) con un capítulo más, «Recorre sus valles», en la parte épica: el caballo al
// galope y el burro, ya con sus arreos (el autor: «el personaje tiene las manos puestas como si agarrara las riendas del
// caballo, pero no hay nada»), la bici y la almadía; y en las tradiciones, el encierro y el Basajaun. Todo lo nuevo, salvo
// el caballo y el burro (regrabados con las tomas del v8, v8/tomas.mjs), son tomas ya grabadas para el v9 y el v10.
// La épica dura ocho compases más (24 desde el golpe hasta el logo): el empalme pasa del compás 8 al 16 y sigue cayendo
// en su compás 24, así que su final sigue cayendo en el logo.
import * as V from '../v11/tomas.mjs';
export const { BEAT, BAR, DROP, T_GOLPE } = V;
export const TOMAS = V.TOMAS;
const C = 1.7;
export const BARRAS = 24;                          // (compases de la épica desde el golpe hasta el logo)
export const T_LOGO = T_GOLPE + BARRAS * BAR;
export const DURA = T_LOGO + 5.6;
// (las tomas a 24 por segundo: el dron y el logo del v10, y las de vehículos, encierro y leyendas del v8 al v10)
export const A24 = ['vOts', 'final', 'galope', 'burro', 'bici', 'almadia', 'encierro', 'basajaun'];
const S6 = T_GOLPE + 9.5;                          // «Recorre sus valles»
const S5 = S6 + C + 2.0 + 2.0 + 2.0 + 2.2;         // «Vive sus tradiciones»
export const CORTES = [
  ...V.CORTES.filter(([t]) => t < T_GOLPE + 9.5),
  [S6, '#c6'], [S6 + C, 'galope', 0], [S6 + C + 2.0, 'burro', 0], [S6 + C + 4.0, 'bici', 0], [S6 + C + 6.0, 'almadia', 0.4],
  [S5, '#c5'], [S5 + C, 'pelota', 0], [S5 + C + 5.0, 'encierro', 0.6], [S5 + C + 8.0, 'bobo', 0],
  [S5 + C + 12.2, 'basajaun', 0.4], [S5 + C + 14.6, 'danza', 0],
  [T_LOGO, 'final', 0],
];
export const ROTULOS = [...V.ROTULOS.filter(([n]) => n !== 'c5' && n !== 'logo'), ['c6', S6, S6 + C], ['c5', S5, S5 + C], ['logo', T_LOGO + 0.35, DURA]];
const MAS = T_LOGO - V.T_LOGO;
export const VOCES = V.VOCES.map(([f, t, a, z]) => f === 'ot:bobo-02.mp3' ? [f, S5 + C + 8.0 + 0.1, a, z] : t >= V.T_LOGO ? [f, t + MAS, a, z] : [f, t, a, z]);
export const EFECTOS = V.EFECTOS.map((e) => e[0] === 'publico-grada.mp3' ? [e[0], S5 + C, ...e.slice(2)] : e);
