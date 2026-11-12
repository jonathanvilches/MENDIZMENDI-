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
const NUCLEO = new WeakMap();

// (la mancha, en números: su transparencia de 0 a 1, una vez por imagen; es pequeña, 128 × 128, y leerla no cuesta)
function nucleo(img) {
  let n = NUCLEO.get(img); if (n) return n;
  const w = img.width, h = img.height, c = Object.assign(document.createElement('canvas'), { width: w, height: h });
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const px = g.getImageData(0, 0, w, h).data, a = new Float32Array(w * h);
  for (let i = 0; i < a.length; i++) a[i] = px[i * 4 + 3] / 255;
  n = { a, w, h }; NUCLEO.set(img, n); return n;
}

// Pinta la textura escribiendo cada mancha directamente en sus números (con su giro y su tamaño, y la mancha leída con
// interpolación), sin lienzo. Antes se dibujaba cada copa en un lienzo de 1024 × 1024 y luego se leían de vuelta sus
// cuatro millones de valores: en el primer fotograma del pueblo, al repintarla porque el frontón o la pista habían
// quitado árboles, era el tirón de un segundo que se veía nada más cargar (noviembre de 2026, informes del iPhone).
// Donde se juntan dos copas la sombra se suma como antes, 1 − (1 − a)(1 − b), sin pasarse.
export function pintaCopas(lista, half, mancha) {
  let tex = COPAS.tCopas.value;
  if (!tex) {
    tex = new THREE.DataTexture(new Uint8Array(RES * RES), RES, RES, THREE.RedFormat, THREE.UnsignedByteType);
    tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = true; tex.unpackAlignment = 1;
    COPAS.tCopas.value = tex;
  }
  const out = new Float32Array(RES * RES), N = nucleo(mancha), A = N.a, W = N.w, H = N.h, k = RES / (2 * half);
  for (const t of lista) {
    const R = t.r * k; if (R < 0.5) continue;
    const cx = (t.x + half) * k, cz = (t.z + half) * k, co = Math.cos(t.rot || 0), si = Math.sin(t.rot || 0);
    const e = R * 1.4143, x0 = Math.max(0, Math.floor(cx - e)), x1 = Math.min(RES - 1, Math.ceil(cx + e)), z0 = Math.max(0, Math.floor(cz - e)), z1 = Math.min(RES - 1, Math.ceil(cz + e));
    const su = W / (2 * R), sv = H / (2 * R);
    for (let z = z0; z <= z1; z++) {
      const dz = z + 0.5 - cz, fila = z * RES;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        // (el punto en la mancha sin girar: el giro de antes, al revés)
        const u = (co * dx + si * dz + R) * su - 0.5, v = (-si * dx + co * dz + R) * sv - 0.5;
        if (u < 0 || v < 0 || u > W - 1 || v > H - 1) continue;
        const iu = u | 0, iv = v | 0, fu = u - iu, fv = v - iv, j = iv * W + iu, ju = iu < W - 1 ? 1 : 0, jv = iv < H - 1 ? W : 0;
        const a = (A[j] * (1 - fu) + A[j + ju] * fu) * (1 - fv) + (A[j + jv] * (1 - fu) + A[j + jv + ju] * fu) * fv;
        if (a <= 0) continue;
        const o = out[fila + x]; out[fila + x] = o + a * (1 - o);
      }
    }
  }
  const d = tex.image.data; for (let i = 0; i < d.length; i++) d[i] = out[i] * 255 + 0.5;
  tex.needsUpdate = true;
}
