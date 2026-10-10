// Gráficos del juego: los sellos se dibujan aquí mismo; las portadas son las láminas (src/ui/laminas.js)
import { stampURL } from './ui/art.js';
export const stampImg = (comarca, town, emblem) => stampURL(comarca, town, emblem);
export { townImg } from './ui/laminas.js';
