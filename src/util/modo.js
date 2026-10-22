// Modo didáctico: el menú enseña solo el material para aprender (sin el juego en 3D, los campeonatos, el avatar ni los
// sellos), todo desbloqueado. Se guarda en los ajustes del perfil (settings.didactic) y se marca en <html class="didactico">
// para que las fichas de cualquier parte lo sepan sin depender del menú.
/** ¿Está puesto el modo didáctico? */
export const isDidactico = () => document.documentElement.classList.contains('didactico');
/** Pone o quita la marca del modo didáctico en la página. */
export const markDidactico = (on) => document.documentElement.classList.toggle('didactico', !!on);
