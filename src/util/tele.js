// La pantalla grande: en una tele o en un monitor grande, la interfaz crece con la pantalla, como en las consolas, para
// que ocupe todo el ancho y se lea desde el sofá. Se diseña a 1440 × 810 y, por encima, todo se amplía en la misma
// proporción (a 1920 × 1080, un 33 %; en una tele 4K a tamaño real, 2,66 veces) con zoom en <html>. Lo que mide la
// ventana sigue igual: los vw y vh del CSS van divididos por --z, y las vistas 3D a pantalla entera, que se dimensionan
// con innerWidth, llevan la clase pantalla3d, que deshace el zoom. Los clics, los toques y getBoundingClientRect dan
// píxeles de la pantalla; para escribirlos en un estilo, se dividen por escala() (enCss()).
// Solo sin dedo (util/tactil.js: en el móvil y la tableta la pantalla ya es la suya) y con el zoom estándar del CSS
// (currentCSSZoom: Chrome 128, Firefox 126); si no, la escala se queda en 1.
import { TACTIL } from './tactil.js';

// (VENTANA: las ventanas medianas, otro tanto más en la tele: <html class="tele"> y su --z, --zt, el total; style.css)
const VENTANA = 1.2, W = 1440, H = 810, PUEDE = !TACTIL && typeof Element !== 'undefined' && 'currentCSSZoom' in Element.prototype;
let z = 1;
/** Cuánto se amplía la interfaz (1: nada). */
export const escala = () => z;
/** Píxeles de la pantalla (los de un clic o de getBoundingClientRect) en píxeles del CSS. */
export const enCss = (v) => v / z;
function mide() {
  const n = PUEDE ? Math.max(1, Math.floor(Math.min(innerWidth / W, innerHeight / H) * 100) / 100) : 1;
  if (n === z) return;
  z = n; const s = document.documentElement.style;
  if (z === 1) { s.removeProperty('zoom'); s.removeProperty('--z'); s.removeProperty('--zt'); } else { s.zoom = String(z); s.setProperty('--z', String(z)); s.setProperty('--zt', String(Math.round(z * VENTANA * 100) / 100)); }
  document.documentElement.classList.toggle('tele', z > 1);
}
// (las reglas @media miran la pantalla de verdad, no la ampliada: la única que cae entre 810 y 900 de alto, la de las
// pantallas bajas del final de capítulo, se repite con <html class="tele-bajo">: con la interfaz ampliada, menos de 900)
const bajo = () => document.documentElement.classList.toggle('tele-bajo', z > 1 && innerHeight / z < 900);
if (typeof window !== 'undefined') { mide(); bajo(); addEventListener('resize', () => { mide(); bajo(); }); }
