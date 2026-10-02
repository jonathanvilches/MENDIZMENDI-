// Luz propia (relleno) de personajes, animales y plantas. De día les da un poco de su propio color para que no se vean
// siempre en sombra (la cámara va detrás y el sol suele darles de frente). Esa luz sigue a la del cielo: al atardecer
// baja y se vuelve anaranjada, de noche es tenue y azulada como la luna (manda la luz de verdad) y junto a una farola se
// calienta. Solo cuenta mientras se dibuja el pueblo: los menús, los retratos y las escenas propias (el fútbol, la
// pelota, el encierro, los minijuegos) lo ven neutro, como siempre.
import * as THREE from 'three';

/** Uniforme compartido por los sombreadores (personajes, animales, flora): color por el que se multiplica su relleno. */
export const CHAR_FILL = { value: new THREE.Color(1, 1, 1) };
const MATS = new Set(), WHITE = new THREE.Color(1, 1, 1), tmp = new THREE.Color();

/** Material que se rellena con su color emisivo (personajes de Meshy, ojos pintados): k = cuánto a pleno día. */
export function fillMaterial(m, k) { m.userData.fillK = k; MATS.add(m); m.emissive.copy(CHAR_FILL.value).multiplyScalar(k); }

/** Pone el relleno antes de dibujar el pueblo (con null, el neutro de siempre). */
export function applyCharFill(c) {
  CHAR_FILL.value.copy(c || WHITE);
  for (const m of MATS) m.emissive.copy(CHAR_FILL.value).multiplyScalar(m.userData.fillK);
}

// A mediodía el cielo más la mitad del sol (lo que llega de lado) suman unos 2,2: ahí el relleno vale 1
const DAY = 2.2;
/** Relleno según la luz del cielo (hemisferio y sol o luna); de noche, algo menos, para que se lean la luna y las
 *  sombras. Nunca más que a pleno día. */
export function skyFill(out, hemi, sun, night) {
  out.copy(hemi.color).multiplyScalar(hemi.intensity).add(tmp.copy(sun.color).multiplyScalar(sun.intensity * 0.5)).multiplyScalar((1 - 0.4 * night) / DAY);
  const m = Math.max(out.r, out.g, out.b); if (m > 1) out.multiplyScalar(1 / m);
  return out;
}
const LAMP = new THREE.Color('#ffb866');
/** Una farola cerca (k de 0 a 1): el relleno se calienta con su luz. */
export function lampFill(out, k) { if (k > 0.001) out.add(tmp.copy(LAMP).multiplyScalar(0.7 * k)); return out; }

/** Trozo de sombreador: declara el uniforme (va tras #include <common> del fragmento). */
export const FILL_DECL = '\nuniform vec3 uCharFill;';
/** Añade el uniforme a un sombreador en onBeforeCompile. */
export const useFill = (sh) => { sh.uniforms.uCharFill = CHAR_FILL; };
