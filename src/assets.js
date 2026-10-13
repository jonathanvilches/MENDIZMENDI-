// Gráficos del juego: los sellos de comarca son los 12 del autor (src/assets/sellos, alias @sellos: 512 px en la web y
// 176 en el archivo único); si faltara alguno, se dibuja aquí mismo (src/ui/art.js). Las portadas son las láminas
// (src/ui/laminas.js)
import { stampURL } from './ui/art.js';
import { hdTable } from './web/hd.js';
const SELLOS = Object.fromEntries(Object.entries(import.meta.glob('@sellos/*.webp', { eager: true, query: '?url', import: 'default' })).map(([k, v]) => [k.split('/').pop().replace('.webp', ''), v]));
hdTable('sellos', SELLOS);   // (archivo único con conexión: los de la web, src/web/hd.js)
// (el del pueblo completado lleva el de su comarca: el nombre del pueblo va escrito debajo)
export const stampImg = (comarca, town, emblem) => SELLOS[comarca] || stampURL(comarca, town, emblem);
export { townImg } from './ui/laminas.js';
