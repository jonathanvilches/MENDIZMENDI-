// Carga de los modelos .glb. En el archivo único llegan comprimidos con gzip (data:application/gzip;base64,…, lo hace
// vite.config.js para que pese menos) y aquí se descomprimen antes de leerlos, con el fflate que trae three.js. En la
// web y en el servidor de pruebas llegan tal cual y se cargan como siempre.
import { gunzipSync } from 'three/examples/jsm/libs/fflate.module.js';

export async function loadGLB(loader, url) {
  if (!String(url).startsWith('data:application/gzip')) return loader.loadAsync(url);
  const gz = new Uint8Array(await (await fetch(url)).arrayBuffer());
  const raw = gunzipSync(gz);
  return loader.parseAsync(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength), '');
}
