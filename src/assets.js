// Gráficos del juego: todos se generan aquí mismo (sellos y paisajes propios), sin imágenes externas
import { stampURL, landscapeURL } from './ui/art.js';
export const stampImg = (comarca, town, emblem) => stampURL(comarca, town, emblem);
export const landImg = (comarca) => landscapeURL(comarca);
