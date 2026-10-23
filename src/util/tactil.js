// Si se juega con el dedo: en el móvil y en la tableta, donde el dedo es la forma principal de señalar (pointer: coarse).
// Solo entonces salen los controles de pantalla (la palanca y los botones de jugar). En un ordenador, aunque su pantalla
// sea táctil, manda el ratón y no salen nunca; tampoco en una tele. Con el mando del móvil conectado se esconden en
// todas partes (<html class="con-mando">, mando/mando.js) y vuelven al desconectarlo.
export const TACTIL = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
if (typeof document !== 'undefined') document.documentElement.classList.toggle('tactil', TACTIL);
