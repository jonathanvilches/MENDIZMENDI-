// Las texturas de los árboles (world/arbol.js): el atlas de ramillas con sus hojas (hojas.webp, 2048 px; en el móvil se
// usa a 1024) y las cortezas (corteza-*.webp, 512 px y enlosables), hechas con tools/hojas-atlas.mjs. Se cargan a la
// vez que las texturas pintadas (textures.js, buildTextures: el pueblo las espera con ellas, como mucho 4 s). Hasta que
// llegan, los materiales de los árboles no se dibujan (nature.js): sin el atlas, cada tarjeta de hojas sería un cuadrado.
//   cargaArboles(quality) → promesa · TEXA = { hojas, corteza: { haya, roble, pino, chopo }, tam, cargada, listo }
import * as THREE from 'three';
import { byId } from '../util/glob.js';

const URLS = byId(import.meta.glob('../assets/texturas/{hojas,corteza-*}.webp', { eager: true, query: '?url', import: 'default' }));
const nueva = (rep) => { const t = new THREE.Texture(); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
export const TEXA = { hojas: nueva(false), corteza: { haya: nueva(true), roble: nueva(true), pino: nueva(true), chopo: nueva(true) }, tam: 2048, cargada: false, listo: null };

const carga = (url) => new Promise((ok, mal) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = mal; i.src = url; });
// (a su tamaño, o reducida en un lienzo si es más grande de lo que toca)
function pon(t, img, max) {
  let src = img;
  if (max && img.width > max) { const c = document.createElement('canvas'); c.width = c.height = max; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, max, max); src = c; }
  t.image = src; t.needsUpdate = true;
}
export function cargaArboles(quality = 'high') {
  if (TEXA.listo) return TEXA.listo;
  const max = quality === 'high' ? 2048 : 1024; TEXA.tam = max;
  TEXA.listo = Promise.all([
    carga(URLS.hojas).then(i => pon(TEXA.hojas, i, max)),
    ...Object.keys(TEXA.corteza).map(k => carga(URLS['corteza-' + k]).then(i => pon(TEXA.corteza[k], i, quality === 'low' ? 256 : 512))),
  ]).then(() => { TEXA.cargada = true; return true; });
  return TEXA.listo;
}
