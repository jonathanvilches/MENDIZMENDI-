// Gráficos del juego: todos se generan aquí mismo (sellos propios y fotos 3D de cada comarca)
import { stampURL } from './ui/art.js';
import { dioramaShot, townCover } from './hub/diorama.js';
export const stampImg = (comarca, town, emblem) => stampURL(comarca, town, emblem);
export const landImg = (comarca, w = 1280, h = 720, front = false) => dioramaShot(comarca, w, h, { front });
// portada de un pueblo: la suya si la tiene y, si no, la de su comarca
export const townImg = (l) => (l && townCover(l.id)) || landImg(l?.comarca, 1280, 720, true);
