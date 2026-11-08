// Lo común de los juegos con la cámara (la txalaparta, ui/txalapartaAR.js, y la pelota en casa, pelota/camaraCuerpo.js):
// si se puede jugar con la cámara aquí, dónde están los archivos de MediaPipe (public/ar) y su motor, cargado una vez.
// MediaPipe Tasks Vision, de Google, con licencia Apache 2.0; funciona en el propio aparato: la imagen de la cámara no
// sale de él.

/** ¿Se puede jugar con la cámara aquí? Solo en la web (los archivos del modelo van en public/ar; en los archivos únicos
 *  no caben) y con cámara. */
export const camaraDisponible = () => ((typeof __WEB__ !== 'undefined' && __WEB__) || import.meta.env.DEV) && !!navigator.mediaDevices?.getUserMedia;

/** La dirección de un archivo de public/ar. */
export const rutaAR = (f) => new URL((import.meta.env.BASE_URL || './') + 'ar/' + f, location.href).href;

let motor = null;
/** El motor de MediaPipe (el paquete y sus archivos wasm), una sola vez: { V, fs } */
export function motorVision() {
  return (motor ||= (async () => {
    const V = await import('@mediapipe/tasks-vision');
    return { V, fs: await V.FilesetResolver.forVisionTasks(rutaAR('wasm')) };
  })().catch((e) => { motor = null; throw e; }));
}
