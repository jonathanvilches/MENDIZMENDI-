// Las texturas pintadas: el adoquín, la hierba, la tierra, la piedra, los revocos, la teja, la pizarra y la madera de los
// pueblos, pintadas en Higgsfield con el estilo de las láminas (src/assets/texturas/*.webp, 512 × 512 y enlosables:
// tools/textura-enlosable.cjs y, las de hileras, tools/textura-cruz.cjs), en lugar de las que se dibujan con código
// (textures.js). Se cambia solo el dibujo de cada textura: su tamaño, sus repeticiones, sus materiales y su color medio
// siguen igual (la pintada se lleva al color medio de la de siempre, canal a canal), así que los revocos de colores, la
// piedra y la madera oscuras y los tonos de cada comarca no cambian. Su relieve sale del brillo de la pintada. Si no llegan
// (sin conexión la primera vez, o en el archivo único si faltan), quedan las de siempre.
// También el follaje de árboles, arbustos y trepadoras (follaje.webp, por zonas del atlas) y las flores de macetas y balcones
// (flores.webp, flores.js) y las flores silvestres de los prados (silvestres.webp, nature.js), pintados con transparencia
// (GPT Image en Higgsfield); y la roca de los montes (roca.webp, Nano Banana).
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
  ['rock', 'roca', 3, true],   // (la roca de las laderas empinadas y de los peñascos: terrain.js y nature.js)
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

// (el color medio de lo que se ve de un trozo de lienzo, pesado por su transparencia)
function mediaA(d) {
  const m = [0, 0, 0]; let n = 0;
  for (let i = 0; i < d.length; i += 4) { const a = d[i + 3] / 255; m[0] += d[i] * a; m[1] += d[i + 1] * a; m[2] += d[i + 2] * a; n += a; }
  return m.map(v => v / Math.max(1, n));
}
// El follaje: las zonas del atlas de siempre (textures.js, FOLIAGE: el racimo de hojas anchas, el de hojas menudas, la rama
// de abeto y la masa de las copas), cada una pintada encima de la suya y llevada a su mismo color medio, porque el verde de
// cada árbol lo pone el color de sus vértices. Lo demás del lienzo (la franja blanca de los troncos) se queda.
const ZONAS = [[0, 0.5, 0.5, 1], [0, 0, 0.5, 0.5], [0.5, 0.5, 1, 1], [0.505, 0.005, 0.855, 0.495]];
function follaje(tex, img) {
  // (en un lienzo de trabajo que se lee deprisa, y al final, de vuelta al de la textura, que es el que tiene subido)
  const c0 = tex.image, N = c0.width, [c, g] = lienzo(N); g.drawImage(c0, 0, 0);
  for (const [u0, v0, u1, v1] of ZONAS) {
    const x = Math.round(u0 * N), y = Math.round((1 - v1) * N), w = Math.round((u1 - u0) * N), h = Math.round((v1 - v0) * N);
    const antes = mediaA(g.getImageData(x, y, w, h).data);
    g.clearRect(x, y, w, h); g.drawImage(img, x / N * img.width, y / N * img.height, w / N * img.width, h / N * img.height, x, y, w, h);
    const im = g.getImageData(x, y, w, h), d = im.data, ahora = mediaA(d), k = antes.map((v, i) => v / Math.max(1, ahora[i]));
    for (let i = 0; i < d.length; i += 4) { d[i] = Math.min(255, d[i] * k[0]); d[i + 1] = Math.min(255, d[i + 1] * k[1]); d[i + 2] = Math.min(255, d[i + 2] * k[2]); }
    g.putImageData(im, x, y);
  }
  const g0 = c0.getContext('2d'); g0.clearRect(0, 0, N, N); g0.drawImage(c, 0, 0);
  tex.needsUpdate = true;
}
// Las flores de macetas y balcones (flores.js): la pintada, tal cual, en el lienzo de sustitución, que tiene su tamaño
function flores(tex, img) {
  const c = tex.image, g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); tex.needsUpdate = true;
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
  // (el follaje y las flores, de los lienzos de siempre, con su tamaño)
  for (const [k, f, fn] of [['foliage', 'follaje', follaje], ['flores', 'flores', flores], ['silvestres', 'silvestres', flores]]) {
    if (!TEX[k]?.image?.getContext || !URLS[f]) continue;
    try { fn(TEX[k], await carga(URLS[f])); } catch (e) { }
  }
  return true;
}
