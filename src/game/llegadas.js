// Las llegadas: al frontón, antes de cada partido de pelota, y al pueblo, al empezar la aventura. Un vuelo de la cámara
// desde lo alto con el cartel del sitio (ui/vuelo.js); acaban justo donde empieza lo siguiente (el plano del panel del
// partido o la cámara detrás del jugador), sin saltos. Sin vuelo en las pruebas automáticas, salvo que lo pidan
// (window.__vuelo), y en la partida que gana sola
import * as THREE from 'three';
import COMARCAS from '../data/comarcas.json';
import { vuelo, cartel } from '../ui/vuelo.js';
import { TEXT } from '../pelota/rules.js';
import { labritFront } from '../pelota/court.js';
import { groundHeight } from '../world/heightfield.js';
import { townLatLon } from '../data/miradores.js';
import { mapaXY } from '../util/geo.js';

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
    // dentro del pabellón, como una grúa: de lo alto junto al frontis, mirando a la grada llena, baja por la cancha a lo
    // largo del público y gira al fondo hacia el frontis
    tramos = [{ pts: [V(-3, 9.5, 5), V(3, 7, 17), V(1.5, 8.2, 28), E.pos], looks: [V(10, 2, 18), V(11, 2, 21), V(0, 3, 11), E.look], dur: 5, fov: E.fov }];
  } else if (C.labrit) {
    // el Labrit: bajando por la avenida, entre las casas, hasta su fachada con los torreones y, de un corte, dentro, sobre
    // la grada
    const F = labritFront();
    tramos = [{ pts: [V(F.x + 4, 34, F.z + 64), V(F.x + 3, 15, F.z + 26), V(F.x + 1, 7.5, F.z + 11)], looks: [V(F.x, 8, F.z), V(F.x, 9, F.z), V(F.x, 10, F.z)], dur: 3.4, ease: 'inOut' },
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

/** La llegada al pueblo: de lejos y en lo alto, una vuelta por encima de las casas y de la iglesia que acaba detrás del
 *  jugador, con el nombre del pueblo, el de su comarca y Navarra con la comarca encendida. o: { follow, player, ui, def,
 *  centro, iglesia } (def, el pueblo de levels.js). */
export async function vueloPueblo({ follow, player, ui, def, centro, iglesia }) {
  if (sinVuelo()) return;
  const cam = follow.cam, E = { pos: cam.position.clone(), look: new THREE.Vector3(player.pos.x, player.pos.y + 1.5, player.pos.z) };
  const c = new THREE.Vector3(centro.x, groundHeight(centro.x, centro.z), centro.z), R = Math.max(70, (def.size || 50) * 1.5);
  // (la vuelta acaba por detrás del jugador: empieza al otro lado del pueblo, a 150 grados)
  const aE = Math.atan2(E.pos.x - c.x, E.pos.z - c.z), at = (a, r, h) => new THREE.Vector3(c.x + Math.sin(a) * r, c.y + h, c.z + Math.cos(a) * r);
  const back = E.pos.clone().sub(E.look).setY(0).normalize();
  const ig = iglesia ? new THREE.Vector3(iglesia.x, groundHeight(iglesia.x, iglesia.z) + 8, iglesia.z) : c.clone().setY(c.y + 6);
  const pts = [at(aE + 2.6, R * 1.7, R * 0.8), at(aE + 1.4, R * 1.05, R * 0.45), E.pos.clone().addScaledVector(back, 5).setY(E.pos.y + 15), E.pos];
  const looks = [c.clone().setY(c.y + 4), ig, E.look.clone().setY(E.look.y - 0.5), E.look];
  const card = cartelPueblo(def);
  ui.hudVisible?.(false); ui.setCinematic?.(true, def.intro || '');
  const fin = vuelo(follow, [{ pts, looks, dur: 7, ease: 'inOut' }], { suelo: groundHeight, alto: 12, onT: (k) => { if (k > 0.8) card.close(); } }), mio = follow.cinematic;
  try { await fin; } finally { card.close(); if (follow.cinematic === mio) { follow.cinematic = null; ui.setCinematic?.(false); } }
}

/** El cartel del pueblo: su comarca, su nombre (y el otro, si lo tiene) y el mapa de Navarra con la comarca encendida y
 *  el punto del pueblo. */
export function cartelPueblo(def) {
  const name = def.name.split(' /'), com = COMARCAS.find(k => k.id === def.comarca), ll = townLatLon(def);
  return cartel({ kicker: com?.full || com?.name || '', title: name[0].trim(), sub: (name[1] || '').trim(),
    mapa: com ? { paths: COMARCAS.map(k => ({ d: k.path, on: k.id === com.id, color: '#ff2bd6' })), pin: ll ? mapaXY(ll.lat, ll.lon) : null } : null });
}
