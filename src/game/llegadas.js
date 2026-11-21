// La llegada al frontón: se quita el fondo de los campeonatos o el velo que tapaba la ida al frontón, después de dibujar
// las primeras imágenes del frontón (si no, asomaba un instante en negro), y el partido empieza en su plano. Sin vuelos de
// cámara: el de la final en el Labrit, la grúa del cubierto y la bajada a la plaza se quitaron a petición del autor
// (noviembre de 2026); la final tiene su propia entrada, la de «Gran final» (pelota/granFinal.js). (Las de los pueblos,
// desde lo alto, se quitaron antes: en el iPhone el pueblo entero visto desde arriba se pasaba de memoria; octubre de 2026.)
// El velo se quita cuando la cámara del partido ya está puesta (match.js, camPuesta): antes se quitaba a las tres imágenes,
// y en esas imágenes aún se veía la cámara del pueblo, fuera del frontón (grabación del autor del 20 de noviembre de 2026).
// En los campeonatos, antes, el vídeo de entrada (pelota/videoEntrada.js, G.videoEntrada): la llegada espera a que acabe y
// el vídeo se va con el velo.

const sinVelo = () => !!window.__autoWin || !!navigator.webdriver;

/** La llegada a la cancha (G, el juego del pueblo; v, el frontón; m, el partido ya montado): espera al vídeo de entrada,
 *  si lo hay; luego, fuera el velo y el vídeo, con la cámara del partido ya puesta y dos imágenes del frontón dibujadas */
export async function llegaFronton(G, v, m) {
  const vid = G.videoEntrada; G.videoEntrada = null;
  const veil = sinVelo() ? null : document.querySelector('.sport-bg.on');
  veil?.classList.add('tapa'); G.sportBackdrop?.(false);
  if (vid) await vid.listo;
  if ((!veil && !vid) || G.disposed) { veil?.classList.remove('tapa'); vid?.quitar(); return; }
  // (la cámara del partido: match.js la pone en cuanto empieza la salida de los pelotaris; como mucho, 4 s)
  const t0 = performance.now(); let frames = 0;
  const f = () => {
    if (G.disposed) { veil?.classList.remove('tapa'); vid?.quitar(); return; }
    if ((m?.camPuesta || 0) > 0 || performance.now() - t0 > 4000) frames++;
    if (frames >= 2) { veil?.classList.remove('tapa'); vid?.quitar(); } else requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
}
