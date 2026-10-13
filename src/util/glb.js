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

// (y esas imágenes se descodifican al cargar el modelo, fuera del hilo principal: si no, se descodificaban de golpe al
// subirlas a la tarjeta gráfica o al copiarlas, y el juego se paraba al entrar en un pueblo o en un partido)
async function decodeAll(gltf) {
  if (!APPLE || !gltf?.scene) return gltf;
  const imgs = new Set();
  gltf.scene.traverse(o => { for (const m of [].concat(o.material || [])) for (const k in m) { const i = m[k]?.isTexture && m[k].image; if (i && typeof i.decode === 'function') imgs.add(i); } });
  await Promise.all([...imgs].map(i => i.decode().catch(() => {})));
  return gltf;
}

export async function loadGLB(loader, url) {
  imgTextures(loader);
  if (!String(url).startsWith('data:application/gzip')) return decodeAll(await loader.loadAsync(url));
  const gz = new Uint8Array(await (await fetch(url)).arrayBuffer());
  const raw = gunzipSync(gz);
  return decodeAll(await loader.parseAsync(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength), ''));
}
