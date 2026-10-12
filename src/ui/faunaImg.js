// Las ilustraciones de los 31 animales de la fauna (del autor del proyecto: cuerpo entero, fondo transparente, lienzo
// cuadrado; nombres = identificadores de src/data/fauna.js). La grande, para la ficha: de 1280 px en la web (cada una se
// descarga al verla) y de 512 en el archivo único, para no pasar de su tamaño; la pequeña, para las tarjetas del
// cuaderno: de 512 en la web (la tarjeta pide unos 310 píxeles en el iPhone) y de 256 en el archivo único. Los alias @fauna-big y @fauna-small de vite.config.js eligen las carpetas de src/assets/fauna.
//   faunaImg('zorro') → { big, small } (o null si no la tiene: entonces se usa su icono, como antes)
const byId = (g) => Object.fromEntries(Object.entries(g).map(([k, v]) => [k.split('/').pop().replace('.webp', ''), v]));
const BIG = byId(import.meta.glob('@fauna-big/*.webp', { eager: true, query: '?url', import: 'default' }));
const SMALL = byId(import.meta.glob('@fauna-small/*.webp', { eager: true, query: '?url', import: 'default' }));

export const faunaImg = (id) => BIG[id] ? { big: BIG[id], small: SMALL[id] || BIG[id] } : null;
