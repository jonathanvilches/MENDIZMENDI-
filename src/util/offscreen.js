// Un único renderizador oculto para todas las imágenes generadas (iconos 3D, retratos y fotos
// de comarca). Cada contexto WebGL nuevo cuesta mucho al arrancar (y los móviles admiten pocos),
// y cambiar el tamaño del lienzo también: por eso el lienzo es fijo y cada imagen se dibuja en su
// esquina superior izquierda y luego se recorta.
import * as THREE from 'three';

const W = 960, H = 720;
let R = null, cw = W, ch = H;
export function offscreen(w, h, tone = THREE.ACESFilmicToneMapping) {
  if (!R) {
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
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  c.getContext('2d').drawImage(R.domElement, 0, 0, cw, ch, 0, 0, cw, ch);
  return c;
}
