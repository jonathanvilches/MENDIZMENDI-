// La llegada al frontón: se quita el fondo de los campeonatos o el velo que tapaba la ida al frontón, después de dibujar
// las primeras imágenes del frontón (si no, asomaba un instante en negro), y el partido empieza en su plano. Sin vuelos de
// cámara: el de la final en el Labrit, la grúa del cubierto y la bajada a la plaza se quitaron a petición del autor
// (noviembre de 2026); la final tiene su propia entrada, la de «Gran final» (pelota/granFinal.js). (Las de los pueblos,
// desde lo alto, se quitaron antes: en el iPhone el pueblo entero visto desde arriba se pasaba de memoria; octubre de 2026.)

const sinVelo = () => !!window.__autoWin || !!navigator.webdriver;

/** La llegada a la cancha (G, el juego del pueblo; v, el frontón; m, el partido ya montado): fuera el velo, con tres
 *  imágenes del frontón ya dibujadas */
export async function llegaFronton(G, v, m) {
  const veil = sinVelo() ? null : document.querySelector('.sport-bg.on');
  veil?.classList.add('tapa'); G.sportBackdrop?.(false);
  if (!veil || G.disposed) { veil?.classList.remove('tapa'); return; }
  let frames = 0; const f = () => { if (++frames >= 3) veil.classList.remove('tapa'); else requestAnimationFrame(f); }; requestAnimationFrame(f);
}
