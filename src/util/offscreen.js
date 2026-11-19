// Un único renderizador oculto para todas las imágenes generadas (iconos 3D, retratos y fotos
// de comarca). Cada contexto WebGL nuevo cuesta mucho al arrancar (y los móviles admiten pocos),
// y cambiar el tamaño del lienzo también: por eso el lienzo es fijo y cada imagen se dibuja en su
// esquina superior izquierda y luego se recorta.
//
// Con el renderizador del juego ya creado (modo anfitrión), las imágenes de hasta 512 px (retratos, fichas de flora,
// iconos y figuras del público) se dibujan con él en una textura fuera de pantalla: sin segundo contexto. Antes se creaba
// y se soltaba un contexto nuevo a cada retrato o ficha (más de veinte en una partida) y Safari, al pasar de su tope,
// quita el contexto más antiguo, que es el del juego: la pantalla se queda en negro. Además así los modelos que ya están
// en la gráfica del juego no se suben otra vez.
import * as THREE from 'three';

const W = 960, H = 720;
let R = null, cw = W, ch = H, gen = 0, idle = null;
let HOST = null, RT = null, last = null, rtIdle = null, noMSAA = false;
// ¿no hay nada dibujado? (alfa a cero en una muestra de píxeles)
const blank = (buf) => { for (let i = 3; i < buf.length; i += 4 * 97) if (buf[i] > 8) return false; return true; };
const HS = 512;   // tamaño de la textura fuera de pantalla del modo anfitrión
/** Número de renderizador: cambia cuando se libera y se vuelve a crear (lo que dependa de él hay que rehacerlo). */
export const offscreenGen = () => gen;
/** Libera el renderizador oculto (su contexto WebGL y todo lo que subió a la tarjeta). En móvil cada contexto pesa mucho. */
export function releaseOffscreen() {
  clearTimeout(rtIdle); RT?.dispose(); RT = null; last = null;   // (la textura del modo anfitrión y lo último leído)
  clearTimeout(idle); if (!R) return; try { R.dispose(); R.forceContextLoss(); } catch (e) { } R.domElement.width = R.domElement.height = 1; R = null;
}
/** Usa el renderizador del juego para las imágenes pequeñas (null: vuelve al renderizador oculto propio). */
export function setOffscreenHost(renderer) {
  HOST = renderer || null; gen++;
  releaseOffscreen();
}
// lo que ven los que piden el renderizador en modo anfitrión: el mismo uso de siempre (limpiar, dibujar y copiar)
const FACADE = {
  isFacade: true, tone: THREE.ACESFilmicToneMapping, clr: new THREE.Color(0), alpha: 0,
  get renderer() { return HOST; },
  get domElement() { return offscreenCanvas(); },   // (para quien copia directamente del lienzo: lo último dibujado)
  setClearColor(c, a = 1) { this.clr.set(c); this.alpha = a; },
  clear() { },
  render(scene, cam) {
    const r = HOST, w = cw, h = ch;
    if (!RT) {
      RT = new THREE.WebGLRenderTarget(HS, HS, { samples: noMSAA ? 0 : 4 });
      // (marcada como de realidad virtual para que three.js aplique el tono y el sRGB igual que al dibujar en la
      // pantalla; guardada en RGBA8 para que no se codifique dos veces)
      RT.texture.colorSpace = THREE.SRGBColorSpace; RT.texture.internalFormat = 'RGBA8'; RT.isXRRenderTarget = true;
    }
    // la textura (unos 9 MB de gráfica con el suavizado) se suelta si pasa un rato sin usarse
    clearTimeout(rtIdle); rtIdle = setTimeout(() => { RT?.dispose(); RT = null; }, 4000);
    const prev = r.getRenderTarget(), tone = r.toneMapping, exp = r.toneMappingExposure, auto = r.autoClear, a0 = r.getClearAlpha(), c0 = r.getClearColor(new THREE.Color());
    const shadows = r.shadowMap.needsUpdate;   // (el juego rehace sus sombras cuando quiere: aquí se piden y luego se deja como estaba)
    try {
      RT.viewport.set(0, 0, w, h); RT.scissor.set(0, 0, w, h); RT.scissorTest = true;
      r.setRenderTarget(RT); r.toneMapping = this.tone; r.toneMappingExposure = 1; r.autoClear = false;
      r.setClearColor(this.clr, this.alpha); r.clear(); r.shadowMap.needsUpdate = true; r.render(scene, cam);
      let buf = new Uint8Array(w * h * 4); r.readRenderTargetPixels(RT, 0, 0, w, h, buf);
      // en algunos iPhone la lectura de una textura con suavizado sale vacía (los retratos de los diálogos no aparecían):
      // si no hay nada dibujado, se repite sin suavizado y ya se queda así
      if (!noMSAA && this.alpha === 0 && blank(buf)) {
        noMSAA = true; RT.dispose(); RT = new THREE.WebGLRenderTarget(HS, HS, { samples: 0 });
        RT.texture.colorSpace = THREE.SRGBColorSpace; RT.texture.internalFormat = 'RGBA8'; RT.isXRRenderTarget = true;
        RT.viewport.set(0, 0, w, h); RT.scissor.set(0, 0, w, h); RT.scissorTest = true;
        r.setRenderTarget(RT); r.setClearColor(this.clr, this.alpha); r.clear(); r.render(scene, cam);
        buf = new Uint8Array(w * h * 4); r.readRenderTargetPixels(RT, 0, 0, w, h, buf);
      }
      last = { buf, w, h };
    } finally {
      r.setRenderTarget(prev); r.toneMapping = tone; r.toneMappingExposure = exp; r.autoClear = auto; r.setClearColor(c0, a0); r.shadowMap.needsUpdate = shadows;
    }
  },
};
export function offscreen(w, h, tone = THREE.ACESFilmicToneMapping) {
  if (HOST && w <= HS && h <= HS) { cw = w; ch = h; FACADE.tone = tone; last = null; return FACADE; }
  last = null;
  // si pasa un rato sin usarse, se libera solo (se vuelve a crear cuando haga falta)
  clearTimeout(idle); idle = setTimeout(releaseOffscreen, 4000);
  if (!R) {
    gen++;
    R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    R.debug.checkShaderErrors = false;
    R.setPixelRatio(1); R.setSize(W, H, false); R.outputColorSpace = THREE.SRGBColorSpace;
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    R.setScissorTest(true);
  }
  cw = Math.min(w, W); ch = Math.min(h, H);
  R.setViewport(0, H - ch, cw, ch); R.setScissor(0, H - ch, cw, ch);
  R.toneMapping = tone; R.toneMappingExposure = 1;
  return R;
}
// lienzo 2D con lo último que se ha dibujado (sólo la zona usada)
export function offscreenCanvas() {
  const c = document.createElement('canvas');
  if (last) {
    // modo anfitrión: los píxeles leídos de la textura (de abajo arriba y con el color multiplicado por la opacidad,
    // como en un lienzo WebGL) se pasan a un lienzo 2D normal
    const { buf, w, h } = last; c.width = w; c.height = h;
    const g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) {
      const s0 = (h - 1 - y) * w * 4, d0 = y * w * 4;
      for (let x = 0; x < w * 4; x += 4) {
        const a = buf[s0 + x + 3], k = a > 0 && a < 255 ? 255 / a : 1;
        d[d0 + x] = Math.min(255, buf[s0 + x] * k); d[d0 + x + 1] = Math.min(255, buf[s0 + x + 1] * k); d[d0 + x + 2] = Math.min(255, buf[s0 + x + 2] * k); d[d0 + x + 3] = a;
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  c.width = cw; c.height = ch;
  c.getContext('2d').drawImage(R.domElement, 0, 0, cw, ch, 0, 0, cw, ch);
  return c;
}
