// La llegada al frontón, antes de la final de un campeonato: un vuelo de la cámara con el cartel del sitio (ui/vuelo.js)
// que acaba justo donde empieza el plano del panel del partido, sin saltos. Las presentaciones de lujo, solo en la final;
// en los demás partidos, directamente a la cancha (noviembre de 2026). (Las de los pueblos, desde lo alto, se quitaron:
// en el iPhone el pueblo entero visto desde arriba se pasaba de memoria y se perdía la imagen; octubre de 2026.) Sin vuelo
// en las pruebas automáticas, salvo que lo pidan (window.__vuelo), y en la partida que gana sola
import * as THREE from 'three';
import { vuelo, cartel } from '../ui/vuelo.js';
import { TEXT } from '../pelota/rules.js';
import { groundHeight } from '../world/heightfield.js';

const sinVuelo = () => !!window.__autoWin || (navigator.webdriver && !window.__vuelo);

/** La llegada a la cancha (G, el juego del pueblo; v, el frontón; m, el partido ya montado, con los pelotaris en su sitio
 *  y el público en la grada). En la final (m.o.focos), el vuelo: en el Labrit, a ras de la grada y subiendo hasta el plano
 *  del panel; en otro frontón, como una grúa. En los demás partidos, sin vuelo. */
export async function vueloFronton(G, v, m) {
  // (fuera el fondo de los campeonatos o el velo que tapaba la ida al frontón; se queda tapando un momento mientras se
  // dibujan las primeras imágenes del frontón, y luego se funde: antes asomaba un instante en negro)
  const veil = sinVuelo() ? null : document.querySelector('.sport-bg.on');
  veil?.classList.add('tapa'); G.sportBackdrop?.(false);
  let frames = 0; const destapa = () => { if (++frames === 3) veil?.classList.remove('tapa'); };
  if (sinVuelo() || G.disposed) { veil?.classList.remove('tapa'); return; }
  if (!m.o.focos) { const f = () => { destapa(); if (frames < 3) requestAnimationFrame(f); }; requestAnimationFrame(f); return; }
  const C = v.court, g = C.group; g.updateMatrixWorld(true);
  const V = (x, y, z) => g.localToWorld(new THREE.Vector3(x, y, z)), E = m.introPose(), t = m.txt;
  let tramos, onTramo = null;
  if (C.labrit) {
    // el Labrit lleno, por dentro: la cámara empieza en la contracancha, a la altura de los ojos y de cara a la grada, con
    // el público en pie aplaudiendo; avanza a ras de las butacas hacia el fondo y sube girando, por encima del rebote,
    // hasta el plano del panel, con toda la cancha y el frontis delante. (Antes bajaba por la avenida hasta la fachada y,
    // de un corte, entraba: no encajaba)
    tramos = [{ pts: [V(7.6, 1.8, 13), V(7.6, 2.0, 20), V(6.5, 3.2, 27), V(4, 6.5, 33), E.pos], looks: [V(16, 3.0, 15), V(16, 3.4, 21), V(11, 3.0, 18), V(3, 2.8, 14), E.look], dur: 7.6, fov: E.fov, ease: 'inOut' }];
    const sky = G.sky; onTramo = () => { if (sky) { sky.indoor = true; sky.floodCur = 1; } m.o.onEvent?.({ type: 'entrada' }); };   // (la luz del Labrit; y la grada, en pie)
  } else if (C.hall) {
    // dentro del pabellón, como una grúa: de junto a la pared izquierda, a media altura y mirando al frontis, sube y se
    // aleja por el centro de la cancha hasta el plano del panel (antes pasaba rozando la grada y se veía el público de cerca)
    tramos = [{ pts: [V(-3, 4.5, 10), V(-0.5, 7, 21), E.pos], looks: [V(0, 3, 0), V(0, 2.5, 4), E.look], dur: 4.4, fov: E.fov, ease: 'inOut' }];
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
