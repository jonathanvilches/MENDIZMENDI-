// Las texturas pintadas: el adoquín, la hierba, la tierra, la piedra, los revocos, la teja, la pizarra y la madera de los
// pueblos, pintadas en Higgsfield con el estilo de las láminas (src/assets/texturas/*.webp, 512 × 512 y enlosables:
// tools/textura-enlosable.cjs y, las de hileras, tools/textura-cruz.cjs), en lugar de las que se dibujan con código
// (textures.js). Se cambia solo el dibujo de cada textura: su tamaño, sus repeticiones, sus materiales y su color medio
// siguen igual (la pintada se lleva al color medio de la de siempre, canal a canal), así que los revocos de colores, la
// piedra y la madera oscuras y los tonos de cada comarca no cambian. Su relieve sale del brillo de la pintada. Si no llegan
// (sin conexión la primera vez, o en el archivo único si faltan), quedan las de siempre.
//   pintadas(TEX, S, normalDe) → promesa: cambia las de TEX que tengan pintada, a S × S; normalDe(alto, fuerza) da el relieve
import { byId } from '../util/glob.js';

const URLS = byId(import.meta.glob('../assets/texturas/*.webp', { eager: true, query: '?url', import: 'default' }));
// [clave en TEX, pintada, fuerza del relieve, suelta: la textura es TEX[clave] y su relieve TEX[clave + 'N']]
const LISTA = [
  ['cobble', 'adoquin', 3.2], ['dirt', 'tierra', 1.8], ['grass', 'hierba', 1.4, true],
  ['stoneWall', 'piedra', 3.2], ['stoneDark', 'piedra', 3.2],
  ['plasterWhite', 'revoco', 0.9], ['plasterCream', 'revoco', 0.9], ['plasterOcher', 'revoco', 0.9],
  ['plasterRose', 'revoco', 0.9], ['plasterBlue', 'revoco', 0.9],
  ['roofTile', 'teja', 3], ['roofSlate', 'pizarra', 3], ['wood', 'madera', 2], ['woodDark', 'madera', 2],
];

const carga = (url) => new Promise((ok, mal) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = mal; i.src = url; });
const lienzo = (S) => { const c = document.createElement('canvas'); c.width = c.height = S; return [c, c.getContext('2d', { willReadFrequently: true })]; };

// (el color medio de una imagen, en una copia de 32 × 32)
function media(img) {
  const [, g] = lienzo(32); g.drawImage(img, 0, 0, 32, 32);
  const d = g.getImageData(0, 0, 32, 32).data, m = [0, 0, 0];
  for (let i = 0; i < d.length; i += 4) { m[0] += d[i]; m[1] += d[i + 1]; m[2] += d[i + 2]; }
  return m.map(v => v / 1024);
}

// (el alto, del brillo: lo claro sobresale, como las piedras sobre las juntas oscuras)
function alto(c, S) {
  const [h, g] = lienzo(S); g.drawImage(c, 0, 0);
  const img = g.getImageData(0, 0, S, S), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const v = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; d[i] = d[i + 1] = d[i + 2] = v; }
  g.putImageData(img, 0, 0); return h;
}

export async function pintadas(TEX, S, normalDe) {
  const imgs = {};
  await Promise.all([...new Set(LISTA.map(l => l[1]))].filter(f => URLS[f]).map(async (f) => { try { imgs[f] = await carga(URLS[f]); } catch (e) { } }));
  for (const [k, f, fuerza, suelta] of LISTA) {
    const img = imgs[f], t = TEX[k]; if (!img || !t) continue;
    const map = suelta ? t : t.map, nmap = suelta ? TEX[k + 'N'] : t.normalMap; if (!map?.isTexture || !map.image) continue;
    const antes = media(map.image), [c, g] = lienzo(S); g.drawImage(img, 0, 0, S, S);
    const im = g.getImageData(0, 0, S, S), d = im.data, ahora = media(c), k3 = antes.map((v, i) => v / Math.max(1, ahora[i]));
    for (let i = 0; i < d.length; i += 4) { d[i] *= k3[0]; d[i + 1] *= k3[1]; d[i + 2] *= k3[2]; }
    g.putImageData(im, 0, 0);
    map.image = c; map.needsUpdate = true;
    if (nmap?.isTexture) { nmap.image = normalDe(alto(c, S), fuerza); nmap.needsUpdate = true; }
  }
  return true;
}
