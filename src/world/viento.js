// El viento, uno solo para todo el pueblo. Sopla siempre del mismo lado (el que llevan las nubes del cielo y sus
// sombras: sky.js y engine/post.js) y va a rachas: sube y afloja despacio, y con lluvia o nieve arrecia. De él cuelgan
// la hierba y los árboles (nature.js, que comparte uWind), el humo de las chimeneas (fx.js), los banderines de fiesta
// (fiestas.js) y la capa del planeador (game/planeo.js). Cada comarca tiene su aire: en la Ribera, el cierzo.
import * as THREE from 'three';

/** Uniformes compartidos por los sombreadores que se mueven con el viento. uWind: fuerza (1 = brisa normal). */
export const VIENTO = { uWind: { value: 1 }, uDir: { value: new THREE.Vector2(0.936, 0.351) }, uT: { value: 0 }, fuerza: 1, racha: 0 };
const BASE = { atlantica: 0.9, pirenaica: 1.05, media: 1, ribera: 1.3 };

/** Cada fotograma: la fuerza de ahora. aire: la familia de la comarca; cubierto: 0 a 1 (lluvia, nieve o niebla). */
export function sopla(elapsed, aire = 'media', cubierto = 0) {
  // dos ondas lentas que no casan: la racha llega cada medio minuto más o menos y nunca igual
  const r = Math.max(0, Math.sin(elapsed * 0.21) * 0.6 + Math.sin(elapsed * 0.083 + 1.7) * 0.5);
  VIENTO.racha = r;
  VIENTO.fuerza = VIENTO.uWind.value = (BASE[aire] || 1) * (0.7 + 0.75 * r) * (1 + 0.6 * cubierto);
  VIENTO.uT.value = elapsed;
  return VIENTO.fuerza;
}
