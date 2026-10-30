// La llegada al frontón, antes de cada partido de pelota: un vuelo de la cámara con el cartel del sitio (ui/vuelo.js) que
// acaba justo donde empieza el plano del panel del partido, sin saltos. (Las de los pueblos, desde lo alto, se quitaron:
// en el iPhone el pueblo entero visto desde arriba se pasaba de memoria y se perdía la imagen; octubre de 2026.) Sin vuelo en las pruebas automáticas, salvo que lo pidan
// (window.__vuelo), y en la partida que gana sola
import * as THREE from 'three';
import { vuelo, cartel } from '../ui/vuelo.js';
import { TEXT } from '../pelota/rules.js';
import { labritFront } from '../pelota/court.js';
import { groundHeight } from '../world/heightfield.js';

const sinVuelo = () => !!window.__autoWin || (navigator.webdriver && !window.__vuelo);

/** El vuelo hasta la cancha (G, el juego del pueblo; v, el frontón; m, el partido ya montado, con los pelotaris en su
 *  sitio y el público en la grada): de lo alto del pueblo, del pabellón o de la calle del Labrit al plano del panel. */
export async function vueloFronton(G, v, m) {
  // (fuera el fondo de los campeonatos o el velo que tapaba la ida al frontón; con vuelo, se queda tapando un momento
  // mientras se dibujan las primeras imágenes del frontón, y luego se funde: antes asomaba un instante en negro)
  const veil = sinVuelo() ? null : document.querySelector('.sport-bg.on');
  veil?.classList.add('tapa'); G.sportBackdrop?.(false);
  let frames = 0; const destapa = () => { if (++frames === 3) veil?.classList.remove('tapa'); };
  if (sinVuelo() || G.disposed) { veil?.classList.remove('tapa'); return; }
  const C = v.court, g = C.group; g.updateMatrixWorld(true);
  const V = (x, y, z) => g.localToWorld(new THREE.Vector3(x, y, z)), E = m.introPose(), t = m.txt;
  let tramos, onTramo = null;
  if (C.hall) {
    // dentro del pabellón, como una grúa: de junto a la pared izquierda, a media altura y mirando al frontis, sube y se
    // aleja por el centro de la cancha hasta el plano del panel (antes pasaba rozando la grada y se veía el público de cerca)
    tramos = [{ pts: [V(-3, 4.5, 10), V(-0.5, 7, 21), E.pos], looks: [V(0, 3, 0), V(0, 2.5, 4), E.look], dur: 4.4, fov: E.fov, ease: 'inOut' }];
  } else if (C.labrit) {
    // el Labrit: bajando por la avenida, entre las casas, hasta su fachada con los torreones y, de un corte, dentro, sobre
    // la grada
    // (acaba delante del rótulo «FRONTÓN LABRIT», de 10 m, a la distancia a la que cabe entero a lo ancho, también con la
    // pantalla en vertical; antes acababa a 11 m mirando arriba y el rótulo se quedaba fuera, por debajo)
    const F = labritFront(), cam = G.follow.cam, ancho = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * cam.aspect);
    const d = Math.min(40, Math.max(16, 6.6 / Math.tan(ancho / 2)));
    tramos = [{ pts: [V(F.x + 4, 34, F.z + d + 48), V(F.x + 3, 13, F.z + d + 14), V(F.x + 0.6, 5.4, F.z + d)], looks: [V(F.x, 8, F.z), V(F.x, 7, F.z), V(F.x, 6.2, F.z)], dur: 3.8, ease: 'inOut' },
      { pts: [V(15, 11.5, 4), V(9, 10.5, 24), E.pos], looks: [V(2, 0, 20), V(0, 1, 13), E.look], dur: 3.4, fov: E.fov }];
    const sky = G.sky; onTramo = (i) => { if (sky) { sky.indoor = i > 0; sky.floodCur = 1; } };   // (fuera, la luz de la calle; dentro, la del Labrit)
  } else {
    // el de la plaza: desde lo alto del pueblo, bajando en curva por detrás de la cancha
    tramos = [{ pts: [V(-24, 34, 66), V(16, 20, 50), E.pos], looks: [V(2, 0, 16), V(0, 1, 15), E.look], dur: 4.4, fov: E.fov }];
  }
  const venue = m.o.venue || (m.o.town ? (t.fronton || TEXT.es.fronton)(m.o.town) : '');
  const quien = m.labels().map(n => n.replace(/\s*\([^)]*\)/g, '')).join(' vs ');
  const card = cartel({ kicker: m.o.comp || t.friendly || TEXT.es.friendly, title: venue, sub: quien, tono: 'pelota' });
  m.flyAbort = () => card.close();   // (si el partido se deshace a medio vuelo, el cartel se va con él)
  // (al acabar, la cámara se suelta solo si sigue siendo la de este vuelo: si el pueblo se ha rehecho y hay otra llegada
  // en marcha, no se la quita)
  const fin = vuelo(G.follow, tramos, { suelo: C.hall || C.labrit ? null : groundHeight, alto: 6, onTramo, onT: (k) => { destapa(); if (k > 0.7) card.close(); } }), mio = G.follow.cinematic;
  try { await fin; } finally { card.close(); veil?.classList.remove('tapa'); if (!G.disposed && G.follow.cinematic === mio) G.follow.cinematic = null; }   // (de aquí en adelante, la cámara del partido)
}
