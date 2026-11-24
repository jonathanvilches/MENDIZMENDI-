// Las tomas del tráiler v15 que enseñan la interfaz del juego (las charlas con su cuadro y la misión del queso), con la
// flecha y el haz del objetivo (las ayudas del v11). Son las del v11, pero a 24 imágenes por segundo (eran de 12 y se
// trababan) y solo el trozo que entra en el montaje (usa).
import { TOMAS as T11, AYUDA } from '../v11/tomas.mjs';
export { AYUDA };
const D24 = (t, o = {}) => ({ ...t, fps: 24, antes: (t.antes ?? 24) * 2, ...o });
export const TOMAS = {
  hMaite: D24(T11.maite, { seg: 3.8, usa: [[1.4, 3.8]] }),          // «¡Kaixo! Soy Maite. ¡Ongi etorri a Otsagabia!»
  hJoxemari: D24(T11.joxemari, { seg: 3.0, usa: [[0.5, 3.0]] }),    // «Egun on, gazte. Soy Joxemari, el pastor.»
  hArantxa: D24(T11.arantxa, { seg: 2.8, usa: [[0.3, 2.8]] }),      // la quesera de Isaba
  hBobo: D24(T11.bobo, { seg: 3.2, usa: [[0.5, 3.2]] }),            // «¡Las ocho cintas!»
  mRoncal: D24(T11.roncal, { seg: 25.6, usa: [[18.2, 21.6], [23.7, 25.6]] }),   // ordenar los pasos y ¡misión cumplida!
};
