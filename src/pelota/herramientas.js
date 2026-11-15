// Las modalidades del trinquete con herramienta. En Navarra el trinquete se juega a mano, a pala corta, a paleta y a xare
// (el autor, el 15 de noviembre de 2026, «seguimos», tras proponérselo). Cada una cambia lo que se nota en el juego (el
// ritmo, tempo; cuánto sale la pelota del frontis, front, y cuánto bota, floor: se multiplican a los del frontón en
// match.js, applyFeel, y al tempo de la partida en game.js) y lo que lleva cada pelotari en la mano derecha. Es un
// juego, no un simulador: los golpes son los de siempre, solo que con la herramienta en la mano y la pelota más viva.
// - Pala corta: tabla de madera maciza y pelota de cuero dura; la más rápida y la que va más baja.
// - Paleta (de goma): una pala más fina y estrecha y pelota de goma, que bota mucho.
// - Xare: un aro de madera con la red floja, que recoge la pelota y la lanza; rápida y que sale mucho del frontis.
export const HERRAMIENTAS = {
  mano: { es: 'A mano', eu: 'Eskuz', tempo: 1, front: 1, floor: 1 },
  pala: { es: 'Pala corta', eu: 'Pala motza', tempo: 1.16, front: 1.06, floor: 0.96 },
  paleta: { es: 'Paleta', eu: 'Paleta', tempo: 1.1, front: 1.03, floor: 1.08 },
  xare: { es: 'Xare', eu: 'Xarea', tempo: 1.12, front: 1.07, floor: 1 },
};
export const HERR_ORDEN = ['mano', 'pala', 'paleta', 'xare'];
// (del puño al centro de la pala o del aro, en metros: en el golpe, la mano se queda eso antes de la pelota, para que lo
// que llega a ella sea la herramienta; match.js)
export const ALCANCE = { pala: 0.28, paleta: 0.27, xare: 0.29 };
export const herrValida = (k) => (HERRAMIENTAS[k] ? k : 'mano');

// (el giro de la herramienta en la mano, para los personajes sin puño (agarreDe): el mango cruzado y la pala hacia donde
// apuntan los dedos; el hueso de la mano derecha apunta con su eje Y hacia los dedos; DEV: window.__herrRot)
const GIRO = [0, 0, Math.PI / 2], DESPLAZA = [0, 0.06, 0.02];
// (dónde acaba el mango de cada una, en metros desde el arranque de la pala o del aro: ese extremo asoma un poco por el lado
// del meñique y el resto del mango queda dentro del puño)
const FIN_MANGO = { pala: -0.09, paleta: -0.10, xare: -0.12 };

/** La herramienta, en metros, con el puño en el origen y la pala hacia +Y. */
export function herramienta3D(T, k) {
  const g = new T.Group(); g.name = 'herramienta-' + k;
  const M = (o) => new T.MeshStandardMaterial({ roughness: 0.6, metalness: 0, ...o });
  const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  if (k === 'pala' || k === 'paleta') {
    const P = k === 'pala' ? { w: 0.13, l: 0.36, e: 0.022, mango: 0.14, col: '#c99a5f' } : { w: 0.105, l: 0.33, e: 0.014, mango: 0.15, col: '#b67a46' };
    const madera = M({ color: P.col, roughness: 0.55 }), cinta = M({ color: '#2a2a2e', roughness: 0.8 });
    mesh(new T.CylinderGeometry(0.017, 0.016, P.mango, 10), cinta, 0, -P.mango / 2 + 0.05, 0).name = 'mango';   // (el mango, encintado)
    // (la pala: ancha arriba, con la punta redondeada, y estrechándose hacia el mango)
    const s = new T.Shape(), w = P.w / 2, cuello = 0.022, y0 = 0.05, y1 = y0 + 0.07, y2 = y0 + P.l - w;
    s.moveTo(-cuello, y0); s.lineTo(-w, y1); s.lineTo(-w, y2); s.absarc(0, y2, w, Math.PI, 0, true); s.lineTo(w, y1); s.lineTo(cuello, y0); s.lineTo(-cuello, y0);
    const geo = new T.ExtrudeGeometry(s, { depth: P.e, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1, curveSegments: 10 }); geo.translate(0, 0, -P.e / 2);
    mesh(geo, madera);
  } else if (k === 'xare') {
    const madera = M({ color: '#a8743f', roughness: 0.55 });
    mesh(new T.CylinderGeometry(0.016, 0.015, 0.2, 10), M({ color: '#3a2a1e', roughness: 0.8 }), 0, -0.02, 0).name = 'mango';
    // (el aro, ovalado, y la red floja dentro: hilos claros, que se ven a través)
    const aro = mesh(new T.TorusGeometry(0.1, 0.008, 6, 28), madera, 0, 0.23, 0); aro.scale.set(1, 1.45, 1);
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
    c.strokeStyle = 'rgba(240,236,224,.95)'; c.lineWidth = 2; for (let i = 0; i <= 64; i += 9) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 64); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(64, i); c.stroke(); }
    const tx = new T.CanvasTexture(cv); tx.colorSpace = T.SRGBColorSpace;
    const red = mesh(new T.CircleGeometry(0.098, 20), M({ map: tx, transparent: true, alphaTest: 0.3, side: T.DoubleSide, roughness: 0.9 }), 0, 0.23, 0); red.scale.set(1, 1.45, 1);
    mesh(new T.CylinderGeometry(0.012, 0.016, 0.1, 8), madera, 0, 0.09, 0);   // (el cuello, del mango al aro)
  }
  return g;
}

// (el GlbChar que lleva dentro el objeto de un pelotari, y su hueso de la mano derecha)
function figuraDe(obj) { let ch = null; obj?.traverse?.((o) => { if (!ch && o.userData?.glbChar) ch = o.userData.glbChar; }); return ch; }
function manoDerecha(ch) { const B = ch?.bones || {}; return B.mixamorigRightHand || B.handr || B.hand_r || B.RightHand || null; }
/** Pone (o quita, con 'mano') la herramienta en la mano derecha del pelotari de obj. Devuelve la herramienta o null. */
export function ponHerramienta(T, obj, k) {
  if (!obj) return null;
  const ch = figuraDe(obj);
  const vieja = obj.userData.herramienta; if (vieja) { vieja.parent?.remove(vieja); vieja.traverse(o => { o.geometry?.dispose?.(); o.material?.map?.dispose?.(); o.material?.dispose?.(); }); obj.userData.herramienta = null; }
  if (!k || k === 'mano') { ch?.cierraMano?.(0); return null; }
  const h = manoDerecha(ch); if (!h) return null;
  const t = herramienta3D(T, k), G = ch.agarre, R = (import.meta.env?.DEV && globalThis.__herrRot) || (!G && { giro: GIRO, desplaza: DESPLAZA });
  h.add(t); h.updateMatrixWorld(true);
  const ws = h.getWorldScale(new T.Vector3()).x || 1;   // (los huesos van a su escala: la herramienta, en metros del mundo)
  t.scale.setScalar(1 / ws);
  if (R) { t.rotation.set(...R.giro); t.position.set(R.desplaza[0] / ws, R.desplaza[1] / ws, R.desplaza[2] / ws); }
  else {
    // (en el puño: el mango por el hueco de la mano cerrada y saliendo por el lado del pulgar; la cara de la pala o del aro,
    // paralela a la palma, como quien da la mano; el mango, no más grueso que el hueco)
    const Y = new T.Vector3().fromArray(G.eje), Z = new T.Vector3().fromArray(G.n), X = new T.Vector3();
    Z.addScaledVector(Y, -Z.dot(Y)).normalize(); X.crossVectors(Y, Z);
    t.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(X, Y, Z));
    const agarre = (FIN_MANGO[k] ?? -0.09) + Math.min(0.06, (G.ancho || 0) * ws / 2) - 0.006;   // (el punto del mango que va en el centro del puño)
    t.position.fromArray(G.centro).addScaledVector(Y, -agarre / ws);
    const m = t.getObjectByName('mango'), hueco = G.hueco * ws;
    if (m && hueco > 0.004) { const f = Math.min(1.3, hueco * 0.92 / 0.017); m.scale.set(f, 1, f); }
    ch.cierraMano(1);
  }
  obj.userData.herramienta = t; return t;
}
