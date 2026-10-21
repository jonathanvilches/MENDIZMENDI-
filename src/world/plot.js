// Ayudantes para colocar casas y filas de edificios: medir y recorrer una calle (polilínea) y asentar una planta en
// la cuesta. Los usan el valle de Salazar (village.js), los pueblos generados (townBuilder.js) y Pamplona.
import * as THREE from 'three';
import { M } from './builder.js';
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
  if (drop > 0.15) B.add('stone', new THREE.BoxGeometry(w + 0.12, drop + 0.6, d + 0.12), M(x, g.mn - 0.6 + (drop + 0.6) / 2, z, ry));
  return y;
}
