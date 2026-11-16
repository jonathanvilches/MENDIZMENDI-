// La orilla de una charca o una balsa, igual en Otsagabia y en los pueblos con charcas del bosque.
// Dentro, un cuenco por debajo del agua; en el borde, la tierra queda un poco por encima del agua. Por el lado alto de la
// ladera se rebaja hasta esa orilla, y por el lado bajo se levanta un dique de tierra que baja en talud hasta el suelo de
// siempre. Así el agua nunca se queda colgando sobre una ladera que baja: antes, en la balsa de Irati de Otsagabia, por el
// sur el suelo quedaba hasta 6 m por debajo del agua, el agua se veía como una lámina en el aire y la lamia, en su orilla,
// estaba en «agua honda» y no se podía llegar a ella.
import { lerp, smoothstep } from '../util/math.js';
import { fbm } from '../util/noise.js';

/** Hasta dónde llega el disco del agua, más allá del radio de la charca (ya bajo la tierra de la orilla). */
export const ORILLA = 1.2;

/** Altura del suelo en (x, z) con la charca pd = { x, z, r, level }; h es la del terreno sin la charca. */
export function orillaCharca(h, x, z, pd, fondo = 1.6) {
  const r = pd.r, lvl = pd.level;
  // (la orilla no es un círculo perfecto: un poco de ruido, sin pasar del disco del agua)
  const dp = Math.hypot(x - pd.x, z - pd.z) + 0.7 * fbm(x / 9 + 4.3, z / 9 - 2.1, 2);
  if (dp > r + 28) return h;
  const borde = lvl + 0.45;
  const S = dp < r + 1.5 ? lvl - fondo + (fondo + 0.45) * smoothstep(r - 4, r + 1.5, dp) : borde;
  if (h > S) return lerp(h, S, dp < r + 1.5 ? 1 : smoothstep(r + 14, r + 1.5, dp));   // lado alto: se rebaja
  // lado bajo: el dique, llano hasta r + 5 y luego en talud
  const T = dp < r + 1.5 ? S : borde - Math.max(0, dp - (r + 5)) * 0.35;
  const k = dp < r - 3 ? 0 : dp < r ? smoothstep(r - 3, r, dp) : dp < r + 1.5 ? 1 : smoothstep(r + 28, r + 10, dp);
  return Math.max(h, lerp(h, T, k));
}
