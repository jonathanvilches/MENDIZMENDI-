// Iconos de línea blanca para ajustes y selección (de juego, de modo): la misma familia que los botones redondos de la
// pausa (ui/pausa.js), 24×24, trazo redondeado del color del texto. Lo demás (sellos, cartas, misiones, comarcas…) sigue
// en 3D (ui/icons.js). El autor, 26 nov 2026: «Para selección de ajustes y demás me gustan planos, para lo demás 3D».

// rueda dentada de 8 dientes, calculada (centro 12,12)
const rueda = (() => {
  const p = [];
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    for (const [da, r] of [[-0.36, 7], [-0.2, 9.6], [0.2, 9.6], [0.36, 7]]) p.push(`${(12 + Math.cos(a + da) * r).toFixed(2)} ${(12 + Math.sin(a + da) * r).toFixed(2)}`);
  }
  return `<path d="M${p.join('L')}z"/><circle cx="12" cy="12" r="3"/>`;
})();

const D = {
  ajustes: rueda,
  sonido: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.2 6.5a8 8 0 0 1 0 11"/>',
  pelota: '<circle cx="12" cy="12" r="8.5"/><path d="M7.2 5c2.4 3.8 2.4 10.2 0 14M16.8 5c-2.4 3.8-2.4 10.2 0 14"/>',
  imagen: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 17l5-5 4 4 2.5-2.5 5 5"/><circle cx="15.5" cy="9.5" r="1.4"/>',
  jugar: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5.5 3.5-5.5 3.5z"/>',
  borrar: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>',
  personaje: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.8-3.8 3.6-6 7-6s6.2 2.2 7 6"/>',
  parejas: '<circle cx="8.5" cy="8.5" r="3"/><circle cx="16" cy="9.5" r="2.6"/><path d="M2.5 19.5c.6-3.3 3-5.3 6-5.3s5.4 2 6 5.3M15 14.5c2.8-.3 5.4 1.4 6.2 4.6"/>',
  mando: '<path d="M8 7.5h8a5 5 0 0 1 5 5v.3a3.4 3.4 0 0 1-6 2.2L14 14h-4l-1 1a3.4 3.4 0 0 1-6-2.2v-.3a5 5 0 0 1 5-5z"/><path d="M8 10v3.5M6.25 11.75h3.5M15.5 11h.01M17.5 13h.01"/>',
  descargar: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>',
  partida: '<path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/>',
  copiar: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  traer: '<path d="M12 4v9.5M8 9.5l4 4 4-4M4.5 14.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3"/>',
  privacidad: '<path d="M12 3.2 19 6v5.2c0 4.6-3 8-7 9.6-4-1.6-7-5-7-9.6V6z"/><path d="M9 12l2.2 2.2L15.2 10"/>',
  diagnostico: '<path d="M3 12h4l2.5-6 4.5 12 2.5-6H21"/>',
  liga: '<path d="M8 4.5h8V9a4 4 0 0 1-8 0zM8 6.5H5.2A3 3 0 0 0 8 10.8M16 6.5h2.8A3 3 0 0 1 16 10.8M12 13v3.5M9 19.5h6M10 16.5h4"/>',
  balon: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8.2l3.2 2.3-1.2 3.8h-4l-1.2-3.8zM12 8.2V3.5M15.2 10.5l4.4-1.5M14 14.3l2.7 3.8M10 14.3l-2.7 3.8M8.8 10.5 4.4 9"/>',
  estadio: '<path d="M12 21s6.5-5.6 6.5-10.5a6.5 6.5 0 0 0-13 0C5.5 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.4"/>',
};

/** Icono de línea: L('ajustes', 22). Lleva la clase «ico» para que le sirvan los tamaños de los iconos de siempre. */
export const L = (k, size = 24, cls = '') => `<svg class="ico ico-l il-${k}${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${D[k] || D.ajustes}</svg>`;
export const hayLinea = (k) => k in D;
