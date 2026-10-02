// Calidad gráfica de la partida (alta, media o baja), para las piezas que se construyen fuera del motor (minijuegos).
export let QUALITY = 'high';
export const setQuality = (q) => { QUALITY = q || 'high'; };
