// Pelota a mano de MENDIMENDIZ: motor independiente del juego.
// Uso: const court = new PelotaCourt(THREE); escena.add(court.group); … const m = new PelotaMatch({ THREE, court, camera, you, rival, onEnd });
// y en cada fotograma m.update(dt) mientras devuelva true.
export { COURT, TEXT, LEVELS, kantari, euNum } from './rules.js';
export { PelotaGame } from './game.js';
export { PelotaCourt } from './court.js';
export { PelotaMatch } from './match.js';
export const VERSION = '1.0.0';
