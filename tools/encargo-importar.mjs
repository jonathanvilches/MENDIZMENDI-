// Mete en el juego las imágenes del encargo (entrega/encargo-imagenes-*.md) que entregue el autor: de una carpeta con
// <nombre>.png, con el nombre que pide el encargo, cada una a su sitio y a sus tamaños, en WebP:
//  · escudos de casa (pueblo-n): src/assets/escudos/casas/{1024,512,192,96}, encajados como los de tools/escudos-importar.mjs
//  · personajes de Navarra (ids de data/personajes.js): src/assets/personajes/{1536,320}
//  · tradiciones (pueblo-tipo, como lesaka-dance, y la danza de cada comarca, danza-<comarca>): src/assets/tradiciones/{1536,320}
//  · las ilustraciones del material didáctico (productos, iglesias, monumentos, castillo, campanas, encierro) y de los
//    carnavales: con las tradiciones, src/assets/tradiciones/{1536,320}
//  · cimas (ids de data/mountains.json): src/assets/cimas/{1536,1024,320}
//  · cuentos y leyendas (ids de data/cuentos.js): src/assets/leyendas/{1536,768,640}
//  · figuras de leyenda y carnaval (ids de data/figuras.js): con tools/figuras-ilus.mjs (src/assets/figuras/ilus)
//  · iconos: src/assets/icons3d/{512,256,128}, recortados a su dibujo y centrados con el lado mayor al 89 % del cuadro, como
//    la familia del autor; los instrumentos y los trofeos, también a 1024 (icons3d/1024, para su ficha y la de campeón)
// Las ilustraciones que llegan a 1672 px no se amplían: las carpetas de 2560 quedan para las que lleguen a ese tamaño.
// Las copias del archivo único (los escudos de 192 y 96, los personajes y las tradiciones de 320, las leyendas de 640 y las
// figuras de 640) solo con --unico: ese archivo está a pocos KB de su límite de 30 MB, y sin ellas sigue como estaba (el
// dibujo tallado de los escudos, la lámina prestada de los personajes, la del pueblo de las leyendas y el render de las
// figuras). Los iconos sí van siempre a 128, porque sustituyen a uno que ya estaba.
// Los archivos de entrada no se tocan.
// Uso: node tools/encargo-importar.mjs <carpeta> [--unico] [<archivo>=<nombre en el juego> …]
//      (lo segundo, para las variantes con otro nombre: «La lamia dorada de Xorroxin.png=lamias»)
import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const [,, src, ...resto] = process.argv, unico = resto.includes('--unico'), pares = resto.filter(x => x !== '--unico'); if (!src) { console.error('uso: node tools/encargo-importar.mjs <carpeta> [archivo=nombre …]'); process.exit(1); }
const A = 'src/assets';
const PERSONAJES = new Set([...readFileSync('src/data/personajes.js', 'utf8').matchAll(/^ {2}([a-z]+): \{/gm)].map(m => m[1]));
const CUENTOS = new Set([...readFileSync('src/data/cuentos.js', 'utf8').matchAll(/id: '([a-z0-9-]+)'/g)].map(m => m[1]));
const FIGURAS = ['lamia', 'basajaun', 'sorgina', 'tartalo', 'roldan', 'joaldun', 'momotxorro', 'cascabobo', 'zipotero', 'lagunero', 'irasko', 'paloki'];
const GRANDES = new Set([...readdirSync(`${A}/icons3d/1024`).map(f => f.replace('.webp', '')), 'txistu', 'txapela-campeon']);   // (instrumentos y trofeos)
// (las ilustraciones del material didáctico y de los carnavales: con las tradiciones, que se buscan por su nombre)
const ILUS = /^(prod|como|iglesia|portada|casa|romeria|comparsa)-|^(campanas|castillo-partes|ruinas|ermita|crucero|monolito|mirador|puerto-montana|horreo|estelas|mozorro|miel-otxin|zarratrako)$/;
const MONTES = new Set(JSON.parse(readFileSync('src/data/mountains.json', 'utf8')).map(m => m.id));
const clase = (n) => /^[a-z]+(-[a-z]+)*-\d+$/.test(n) ? 'escudo' : /^danza-|-(dance|feria|tradition)$/.test(n) || ILUS.test(n) ? 'tradicion' : MONTES.has(n) ? 'cima' : FIGURAS.includes(n) ? 'figura'
  : PERSONAJES.has(n) ? 'personaje' : CUENTOS.has(n) ? 'leyenda' : existsSync(`${A}/icons3d/512/${n}.webp`) || GRANDES.has(n) || ['mando', 'globo', 'periodico'].includes(n) ? 'icono' : '';

// de cada archivo de la carpeta, su nombre en el juego (el suyo, o el que se diga)
const nombres = new Map(pares.map(p => { const i = p.lastIndexOf('='); return [p.slice(0, i), p.slice(i + 1)]; }));
const lista = readdirSync(src).filter(f => /\.(png|jpe?g|webp)$/i.test(f)).map(f => [f, nombres.get(f) || f.replace(/\.[^.]+$/, '').toLowerCase()]).filter(([f]) => !nombres.size || nombres.has(f) || /^[a-z0-9-]+\.(png|jpe?g|webp)$/.test(f));
const dir = (d) => { mkdirSync(d, { recursive: true }); return d; };
const transp = { r: 0, g: 0, b: 0, alpha: 0 };
// (una ilustración apaisada a w × h, recortando lo que sobre de los lados, como las láminas)
const lamina = async (f, out, w, h, q) => writeFileSync(out, await sharp(f).resize(w, h, { fit: 'cover', kernel: 'lanczos3' }).webp({ quality: q, effort: 6, smartSubsample: true }).toBuffer());
// (un icono: su dibujo recortado por la transparencia y centrado, con el lado mayor al 89 % del cuadro)
async function icono(f, n) {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) throw new Error('icono vacío: ' + n);
  const recorte = await sharp(f).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }).png().toBuffer();
  for (const S of [...(GRANDES.has(n) ? [1024] : []), 512, 256, 128]) {
    const L = Math.round(S * 0.89), dentro = await sharp(recorte).resize(L, L, { fit: 'inside', kernel: 'lanczos3' }).png().toBuffer(), m = await sharp(dentro).metadata();
    const img = sharp({ create: { width: S, height: S, channels: 4, background: transp } }).composite([{ input: dentro, left: Math.round((S - m.width) / 2), top: Math.round((S - m.height) / 2) }]);
    // (el de 128, el del archivo único, algo más comprimido: ese archivo va justo de sitio y a ese tamaño no se nota)
    writeFileSync(join(dir(`${A}/icons3d/${S}`), `${n}.webp`), await img.webp({ quality: S >= 512 ? 88 : S > 128 ? 86 : 80, alphaQuality: S > 128 ? 90 : 85, effort: 6 }).toBuffer());
  }
}
const hechos = {}, figuras = [];
for (const [f, n] of lista) {
  const ruta = join(src, f), c = clase(n);
  if (!c) { console.log('se salta (no es del encargo):', f); continue; }
  if (c === 'escudo') {
    const out = (w) => join(dir(`${A}/escudos/casas/${w}`), `${n}.webp`);
    await sharp(ruta).resize(1024, 1024, { fit: 'contain', background: transp }).webp({ quality: 86, alphaQuality: 90 }).toFile(out(1024));
    await sharp(ruta).resize(512, 512, { fit: 'contain', background: transp }).webp({ quality: 88, alphaQuality: 90 }).toFile(out(512));
    if (unico) for (const w of [192, 96]) await sharp(out(512)).resize(w, w, { fit: 'contain', background: transp }).webp({ quality: 80, alphaQuality: 90 }).toFile(out(w));
  } else if (c === 'personaje' || c === 'tradicion') {
    const base = c === 'personaje' ? 'personajes' : 'tradiciones';
    await lamina(ruta, join(dir(`${A}/${base}/1536`), `${n}.webp`), 1536, 864, 82);
    if (unico) await lamina(ruta, join(dir(`${A}/${base}/320`), `${n}.webp`), 320, 180, 80);
  } else if (c === 'cima') {
    for (const [w, h, q] of [[1536, 864, 82], [1024, 576, 80], ...(unico ? [[320, 180, 80]] : [])]) await lamina(ruta, join(dir(`${A}/cimas/${w}`), `${n}.webp`), w, h, q);
  } else if (c === 'leyenda') {
    for (const [w, h, q] of [[1536, 864, 82], [768, 432, 82], ...(unico ? [[640, 360, 78]] : [])]) await lamina(ruta, join(dir(`${A}/leyendas/${w}`), `${n}.webp`), w, h, q);
  } else if (c === 'figura') figuras.push([ruta, n]);
  else if (c === 'icono') await icono(ruta, n);
  (hechos[c] ||= []).push(n);
}
// (las figuras, con su herramienta, desde una carpeta con su nombre de juego)
if (figuras.length) {
  const tmp = dir(join('node_modules/.cache/figuras-ilus', String(Date.now())));
  for (const [r, n] of figuras) writeFileSync(join(tmp, `${n}.png`), readFileSync(r));
  try { execFileSync('node', ['tools/figuras-ilus.mjs', tmp, ...(unico ? [] : ['--sin-unico'])], { stdio: 'inherit' }); } finally { rmSync(tmp, { recursive: true, force: true }); }
}
for (const [c, L] of Object.entries(hechos)) console.log(`${c} (${L.length}): ${L.join(' ')}`);
