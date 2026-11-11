// Las celdas del atlas de hojas de los árboles (src/assets/texturas/hojas.webp, 4 × 4): en cada una, una ramilla de su
// especie con sus hojas dibujadas una a una (tools/hojas-pinta.js la pinta y tools/hojas-atlas.mjs la guarda), o un
// racimo de varias para los árboles de lejos. [columna, fila], la fila 0 arriba. Las usan el pintor y world/arbol.js
export const CELDAS = {
  hayaA: [0, 0], hayaB: [1, 0], robleA: [2, 0], robleB: [3, 0],
  castano: [0, 1], chopo: [1, 1], manzano: [2, 1], olivo: [3, 1],
  abetoA: [0, 2], abetoB: [1, 2], pino: [2, 2], arbusto: [3, 2],
  racimoHaya: [0, 3], racimoRoble: [1, 3], racimoChopo: [2, 3], racimoOlivo: [3, 3],
};
