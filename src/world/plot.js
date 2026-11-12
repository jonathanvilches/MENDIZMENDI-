// Ayudantes para colocar casas y filas de edificios: medir y recorrer una calle (polilínea) y asentar una planta en
// la cuesta. Los usan el valle de Salazar (village.js), los pueblos generados (townBuilder.js) y Pamplona.
import * as THREE from 'three';
import { M, box } from './builder.js';
import { terrainHeight } from './heightfield.js';

/** Un punto (lx, lz) del sistema local de un edificio en (x, z) girado ry, en coordenadas del mundo. */
export const toW = (x, z, ry, lx, lz) => ({ x: x + lx * Math.cos(ry) + lz * Math.sin(ry), z: z - lx * Math.sin(ry) + lz * Math.cos(ry) });
/** Largo de una polilínea [[x, z], …]. */
export function polyLen(pts) { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return l; }
/** El punto a s metros del principio de la polilínea, con la dirección del tramo (tx, tz). */
export function polyAt(pts, s) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    if (s <= l || i === pts.length - 1) { const t = Math.max(0, Math.min(1, s / l)); return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, tx: (b[0] - a[0]) / l, tz: (b[1] - a[1]) / l }; }
    s -= l;
  }
}
/** El suelo más bajo y el más alto bajo la planta de una casa (esquinas, centro y mitad de la fachada). */
export function minGround(x, z, w, d, ry) {
  const c = Math.cos(ry), s = Math.sin(ry); let mn = Infinity, mx = -Infinity;
  for (const [a, b] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2], [0, 0], [0, d / 2]]) { const h = terrainHeight(x + a * c + b * s, z - a * s + b * c); mn = Math.min(mn, h); mx = Math.max(mx, h); }
  return { mn, mx };
}
/** En las cuestas la casa se apoya casi en lo alto de su planta (el lado de arriba no queda enterrado) y por debajo
 *  lleva un zócalo de piedra hasta el suelo por el lado de abajo. Devuelve la altura de la planta baja. */
export function slopeBase(B, x, z, w, d, ry, g) {
  const y = Math.max(g.mn - 0.1, g.mx - 0.35), drop = y - g.mn;
  // (la base de piedra de una casa en cuesta: 9 cm por fuera de la pared, más que el zócalo (6 cm), y con la piedra a la
  // escala de las paredes. Antes iba justo en el plano del zócalo y, en el iPhone, los dos se turnaban a trozos en cada
  // imagen, un parpadeo de piedras pequeñas y piedras gigantes; y su textura iba estirada a lo largo de toda la cara)
  if (drop > 0.15) {
    const H = drop + 0.6, gz = box(w + 0.18, H, d + 0.18, 2.6), k = taludZocalo(drop);
    // (el alto, en talud: más ancho abajo, como los muros de las casas en cuesta; con las caras a plomo de arriba abajo
    // parecía un pedestal)
    if (k > 0) {
      const p = gz.attributes.position, hw = (w + 0.18) / 2, hd = (d + 0.18) / 2;
      for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) { p.setX(i, p.getX(i) * (hw + k) / hw); p.setZ(i, p.getZ(i) * (hd + k) / hd); }
      gz.computeVertexNormals();
    }
    B.add('stone', gz, M(x, g.mn - 0.6 + H / 2, z, ry));
  }
  return y;
}
/** Lo que se ensancha por abajo el zócalo de una casa en cuesta (cada lado): 6 cm por metro de alto, 25 cm como mucho, y
 *  nada en los bajos de menos de 1,2 m. */
export const taludZocalo = (drop) => drop > 1.2 ? Math.min(0.25, 0.06 * drop) : 0;
