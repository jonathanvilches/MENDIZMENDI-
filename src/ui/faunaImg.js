// Las ilustraciones de los 31 animales de la fauna (del autor del proyecto: cuerpo entero, fondo transparente, lienzo
// cuadrado; nombres = identificadores de src/data/fauna.js). La grande, para la ficha: de 1280 px en la web (cada una se
// descarga al verla) y de 512 en el archivo único, para no pasar de su tamaño; la pequeña, para las tarjetas del
// cuaderno: de 512 en todas partes (la tarjeta pide unos 310 píxeles en el iPhone; en el archivo único es la misma imagen que la
// grande, que ya va dentro: la copia de 256 solo añadía 590 KB a un archivo al borde de su límite). Los alias @fauna-big y
// @fauna-small de vite.config.js eligen las carpetas de src/assets/fauna.
//   faunaImg('zorro') → { big, small } (o null si no la tiene: entonces se usa su icono, como antes)
import { hdTable } from '../web/hd.js';
import { byId } from '../util/glob.js';
const BIG = byId(import.meta.glob('@fauna-big/*.webp', { eager: true, query: '?url', import: 'default' }));
hdTable('fauna', BIG);   // (en el archivo único, con conexión: los de la web, src/web/hd.js)
const SMALL = byId(import.meta.glob('@fauna-small/*.webp', { eager: true, query: '?url', import: 'default' }));
hdTable('fauna', SMALL);

export const faunaImg = (id) => BIG[id] ? { big: BIG[id], small: SMALL[id] || BIG[id] } : null;
