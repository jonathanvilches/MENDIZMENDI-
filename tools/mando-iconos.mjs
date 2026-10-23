// Los iconos de la app «Mando» (public/mando/: la página del móvil como mando, instalable): la palanca del autor
// (src/assets/icons3d/512/control.webp) sobre el morado de la propia página, para que en la pantalla de inicio no se
// confunda con el icono del juego. 192 y 512 normales, 512 «maskable» (el dibujo dentro del 80 % central, que Android
// recorta en círculo o en gota) y 180 para el iPhone, sin transparencia.
// Uso: node tools/mando-iconos.mjs
import sharp from 'sharp';

const PALANCA = 'src/assets/icons3d/512/control.webp', OUT = 'public/mando';
const fondo = (S) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><defs><radialGradient id="g" cx="50%" cy="34%" r="74%"><stop offset="0" stop-color="#5a24b0"/><stop offset=".55" stop-color="#2c0f63"/><stop offset="1" stop-color="#12052a"/></radialGradient></defs><rect width="${S}" height="${S}" fill="url(#g)"/></svg>`);
async function icono(S, parte, nombre) {
  const L = Math.round(S * parte), p = await sharp(PALANCA).resize(L, L, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' }).png().toBuffer();
  const o = Math.round((S - L) / 2);
  await sharp(fondo(S)).composite([{ input: p, left: o, top: Math.round(o * 1.06) }]).flatten({ background: '#12052a' }).png({ compressionLevel: 9 }).toFile(`${OUT}/${nombre}`);
  console.log(nombre);
}
await icono(192, 0.74, 'icon-192.png');
await icono(512, 0.74, 'icon-512.png');
await icono(512, 0.58, 'icon-maskable-512.png');
await icono(180, 0.74, 'icon-180.png');
