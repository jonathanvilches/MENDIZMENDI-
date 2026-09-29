// Gráficos del juego: todos se generan aquí mismo (sellos propios y fotos 3D de cada comarca)
import { stampURL } from './ui/art.js';
import { dioramaShot } from './hub/diorama.js';
export const stampImg = (comarca, town, emblem) => stampURL(comarca, town, emblem);
export const landImg = (comarca, w = 1280, h = 720) => dioramaShot(comarca, w, h);
