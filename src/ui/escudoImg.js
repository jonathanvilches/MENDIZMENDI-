// Escudos con el acabado del autor del proyecto (src/assets/escudos): los 65 del armorial, con los mismos ids que
// src/data/armas-navarra.js, y los emblemas propios de los 21 equipos de la liga, con los mismos ids que
// src/futbol/clubs.js (no son escudos de clubes de verdad). La heráldica, de 512 px; en la web, la de 1024 para la ficha;
// los emblemas, de 512 en la web y de 256 en el archivo único (alias @escudos, @escudos-big y @emblemas de vite.config.js).
import { drawOfficial, officialHeight } from '../world/armas.js';
import { hdTable, hdUrl } from '../web/hd.js';

const byId = (g) => Object.fromEntries(Object.entries(g).map(([k, v]) => [k.split('/').pop().replace('.webp', ''), v]));
// (Luzaide y Zugarramurdi tienen el mismo blasón y su imagen es la misma, byte a byte: se carga una vez)
const SAME = { 'luzaide-valcarlos': 'zugarramurdi' }, same = (o) => { for (const [a, b] of Object.entries(SAME)) if (o[b]) o[a] = o[b]; return o; };
const HER = same(byId(import.meta.glob(['@escudos/*.webp', '!@escudos/luzaide-valcarlos.webp'], { eager: true, query: '?url', import: 'default' })));
const BIG = same(byId(import.meta.glob(['@escudos-big/*.webp', '!@escudos-big/luzaide-valcarlos.webp'], { eager: true, query: '?url', import: 'default' })));
const CLUB = byId(import.meta.glob('@emblemas/*.webp', { eager: true, query: '?url', import: 'default' }));
hdTable('escudos', HER); hdTable('escudos', BIG); hdTable('emblemas', CLUB);   // (archivo único con conexión: src/web/hd.js)
// Los escudos de las casas (src/assets/escudos/casas: «pueblo-n» es houseArms(pueblo, n - 1) de src/data/blasones.js) y los
// de los oficios (src/assets/escudos/oficios, con los ids de src/data/oficios.js y de los jornales), de 512 y solo en la web
// (tools/escudos-importar.mjs): el archivo único, con conexión, los pide a la web (hdUrl) y, sin ella, enseña el dibujo de
// siempre. Las casas que aún no tienen imagen siguen con el dibujo.
const CASA = byId(import.meta.glob('@escudos-casas/*.webp', { eager: true, query: '?url', import: 'default' }));
const OFICIO = byId(import.meta.glob('@escudos-oficios/*.webp', { eager: true, query: '?url', import: 'default' }));
hdTable('escudos-casas', CASA); hdTable('escudos-oficios', OFICIO);
export const casaImg = (town, idx) => CASA[`${town}-${idx + 1}`] || hdUrl('escudos-casas', `${town}-${idx + 1}`);
export const oficioImg = (kind) => OFICIO[kind] || hdUrl('escudos-oficios', kind);

export const armsImg = (id) => HER[id] || null;
export const armsImgBig = (id) => BIG[id] || HER[id] || null;
export const clubImg = (id) => CLUB[id] || null;

// para pintarlo en un lienzo (la placa de la plaza, la pared del frontón): la imagen ya cargada y su caja opaca, para
// encajar el escudo justo donde iría el dibujo. Se carga antes de montar el pueblo (armsReady) y luego se pinta al momento
const READY = new Map();
// (key: con qué se guarda; u: la imagen. Si viene de la web desde el archivo único, se pide con permiso de origen cruzado:
// si no, el lienzo que la pinta quedaría «manchado» y no podría subir a una textura)
function ready(key, u) {
  if (!u) return Promise.resolve(null);
  if (!READY.has(key)) READY.set(key, new Promise(res => {
    const im = new Image(); im.decoding = 'async'; if (/^https?:/.test(u) && !u.startsWith(location.origin)) im.crossOrigin = 'anonymous';
    im.onload = () => { try {
      const c = document.createElement('canvas'), n = 128; c.width = c.height = n; const g = c.getContext('2d'); g.drawImage(im, 0, 0, n, n);
      const d = g.getImageData(0, 0, n, n).data; let x0 = n, y0 = n, x1 = -1, y1 = -1;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (d[(y * n + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      const k = im.naturalWidth / n, info = { im, bb: x1 < 0 ? [0, 0, im.naturalWidth, im.naturalHeight] : [x0 * k, y0 * k, (x1 - x0 + 1) * k, (y1 - y0 + 1) * k] };
      READY.set(key, info); res(info);
    } catch (e) { READY.delete(key); res(null); } };
    im.onerror = () => { READY.delete(key); res(null); };
    im.src = u;
  }));
  const r = READY.get(key); return r instanceof Promise ? r : Promise.resolve(r);
}
export const armsReady = (id) => ready(id, armsImg(id));
/** El escudo de una casa con el acabado del autor, cargado y con su caja opaca (null si no lo tiene o no se pudo traer). */
export const casaReady = (town, idx) => ready('casa:' + town + ':' + idx, casaImg(town, idx));
/** Pinta una imagen ya cargada (de armsReady o casaReady) encajada en una caja del lienzo, centrada y sin deformar. */
export function drawReady(g, L, x, y, w, h) {
  const [bx, by, bw, bh] = L.bb, k = Math.min(w / bw, h / bh), dw = bw * k, dh = bh * k;
  g.drawImage(L.im, bx, by, bw, bh, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}
const loaded = (id) => { const r = READY.get(id); return r && !(r instanceof Promise) ? r : null; };
/** El escudo oficial A con el acabado del autor si ya está cargado (si no, el dibujo de siempre): mismo sitio y tamaño. */
export function drawTownArms(g, cx, top, w, A) {
  const L = A && loaded(A.id); if (!L) return drawOfficial(g, cx, top, w, A);
  const H = officialHeight(w, A), [bx, by, bw, bh] = L.bb, k = Math.min(w * 1.12 / bw, H / bh), dw = bw * k, dh = bh * k;
  g.drawImage(L.im, bx, by, bw, bh, cx - dw / 2, top + (H - dh) / 2, dw, dh);
}
