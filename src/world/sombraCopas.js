// La sombra de las copas en el suelo: una textura de todo el mapa vista desde arriba (un píxel por metro, más o menos) con
// la mancha de cada árbol, con sus claros, que el propio suelo lee para oscurecerse (terrain.js). Antes era una malla de
// manchas sueltas pegada al terreno: nunca coincidía del todo con los triángulos del suelo y en las cuestas flotaba como
// una losa oscura al pie del árbol o se hundía y dejaba huecos claros (Irati, noviembre de 2026). Así sigue al suelo
// exactamente, sin triángulos de más.
//   COPAS.uCopas: xy, lo que se corre hacia donde cae la sombra según el sol (m); z, cuánto se ve (de noche y con el
//   cielo cubierto, menos). COPAS.uCopasCerca: hasta qué distancia de la cámara no se dibuja porque ya hay sombras de
//   verdad (m; 0, en ningún sitio: en el móvil, sin sombras, se ve en todas partes)
//   pintaCopas(lista [{ x, z, r, rot }], half, mancha) pinta la textura (otra vez, al quitar árboles)
import * as THREE from 'three';

export const COPAS = { tCopas: { value: null }, uCopas: { value: new THREE.Vector4(0, 0, 0, 0) }, uCopasCerca: { value: 0 } };
const RES = 1024;
let lienzo = null;

export function pintaCopas(lista, half, mancha) {
  const c = lienzo ||= Object.assign(document.createElement('canvas'), { width: RES, height: RES });
  const g = c.getContext('2d', { willReadFrequently: true });
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.fillStyle = '#000'; g.fillRect(0, 0, RES, RES);
  // (la mancha es blanca con su transparencia: encima del negro, donde se juntan dos copas la sombra se suma como antes,
  // 1 − (1 − a)(1 − b), sin pasarse)
  const k = RES / (2 * half);
  for (const t of lista) {
    const R = t.r * k; if (R < 0.5) continue;
    g.setTransform(1, 0, 0, 1, (t.x + half) * k, (t.z + half) * k); g.rotate(t.rot || 0);
    g.drawImage(mancha, -R, -R, 2 * R, 2 * R);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  const px = g.getImageData(0, 0, RES, RES).data;
  let tex = COPAS.tCopas.value;
  if (!tex) {
    tex = new THREE.DataTexture(new Uint8Array(RES * RES), RES, RES, THREE.RedFormat, THREE.UnsignedByteType);
    tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = true; tex.unpackAlignment = 1;
    COPAS.tCopas.value = tex;
  }
  const d = tex.image.data; for (let i = 0; i < d.length; i++) d[i] = px[i * 4];
  tex.needsUpdate = true;
}
