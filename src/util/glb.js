// Carga de los modelos .glb. En el archivo único llegan comprimidos con gzip (data:application/gzip;base64,…, lo hace
// vite.config.js para que pese menos) y aquí se descomprimen antes de leerlos, con el fflate que trae three.js. En la
// web y en el servidor de pruebas llegan tal cual y se cargan como siempre.
import { TextureLoader } from 'three';
import { gunzipSync } from 'three/examples/jsm/libs/fflate.module.js';

// En el iPhone y el iPad (y en Safari), las texturas de los modelos se leen como una imagen normal y no como ImageBitmap.
// Con ImageBitmap, Safari en iOS a veces sube la textura en negro cuando va justo de memoria: los pelotaris y algún
// espectador salían como siluetas negras. GLTFLoader ya evita ImageBitmap en Safari anterior al 17, pero lo reconoce por
// el nombre del navegador y la app instalada en la pantalla de inicio no lo lleva, así que allí lo usaba siempre
const UA = typeof navigator !== 'undefined' ? navigator.userAgent : '';
const APPLE = /iP(hone|ad|od)/.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1) || (/AppleWebKit/.test(UA) && !/Chrome|Chromium|Android|Edg/.test(UA));
function imgTextures(loader) {
  if (!APPLE || loader.userData?.imgTextures) return;
  (loader.userData ||= {}).imgTextures = true;
  loader.register((parser) => {
    const t = new TextureLoader(parser.options.manager); t.setCrossOrigin(parser.options.crossOrigin); t.setRequestHeader(parser.options.requestHeader);
    parser.textureLoader = t;
    return { name: 'mendimendiz_img_textures' };
  });
}

export async function loadGLB(loader, url) {
  imgTextures(loader);
  if (!String(url).startsWith('data:application/gzip')) return loader.loadAsync(url);
  const gz = new Uint8Array(await (await fetch(url)).arrayBuffer());
  const raw = gunzipSync(gz);
  return loader.parseAsync(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength), '');
}
