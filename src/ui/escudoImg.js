// Escudos con el acabado del autor del proyecto (src/assets/escudos): los 65 del armorial, con los mismos ids que
// src/data/armas-navarra.js, y los emblemas propios de los 21 equipos de la liga, con los mismos ids que
// src/futbol/clubs.js (no son escudos de clubes de verdad). La heráldica, de 512 px; en la web, la de 1024 para la ficha;
// los emblemas, de 512 en la web y de 256 en el archivo único (alias @escudos, @escudos-big y @emblemas de vite.config.js).
import { drawOfficial, officialHeight } from '../world/armas.js';
import { hdTable } from '../web/hd.js';

const byId = (g) => Object.fromEntries(Object.entries(g).map(([k, v]) => [k.split('/').pop().replace('.webp', ''), v]));
// (Luzaide y Zugarramurdi tienen el mismo blasón y su imagen es la misma, byte a byte: se carga una vez)
const SAME = { 'luzaide-valcarlos': 'zugarramurdi' }, same = (o) => { for (const [a, b] of Object.entries(SAME)) if (o[b]) o[a] = o[b]; return o; };
const HER = same(byId(import.meta.glob(['@escudos/*.webp', '!@escudos/luzaide-valcarlos.webp'], { eager: true, query: '?url', import: 'default' })));
const BIG = same(byId(import.meta.glob(['@escudos-big/*.webp', '!@escudos-big/luzaide-valcarlos.webp'], { eager: true, query: '?url', import: 'default' })));
const CLUB = byId(import.meta.glob('@emblemas/*.webp', { eager: true, query: '?url', import: 'default' }));
hdTable('escudos', HER); hdTable('escudos', BIG); hdTable('emblemas', CLUB);   // (archivo único con conexión: src/web/hd.js)

export const armsImg = (id) => HER[id] || null;
export const armsImgBig = (id) => BIG[id] || HER[id] || null;
export const clubImg = (id) => CLUB[id] || null;

// para pintarlo en un lienzo (la placa de la plaza, la pared del frontón): la imagen ya cargada y su caja opaca, para
// encajar el escudo justo donde iría el dibujo. Se carga antes de montar el pueblo (armsReady) y luego se pinta al momento
const READY = new Map();
export function armsReady(id) {
  const u = armsImg(id); if (!u) return Promise.resolve(null);
  if (!READY.has(id)) READY.set(id, new Promise(res => {
    const im = new Image(); im.decoding = 'async';
    im.onload = () => { try {
      const c = document.createElement('canvas'), n = 128; c.width = c.height = n; const g = c.getContext('2d'); g.drawImage(im, 0, 0, n, n);
      const d = g.getImageData(0, 0, n, n).data; let x0 = n, y0 = n, x1 = -1, y1 = -1;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (d[(y * n + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      const k = im.naturalWidth / n, info = { im, bb: x1 < 0 ? [0, 0, im.naturalWidth, im.naturalHeight] : [x0 * k, y0 * k, (x1 - x0 + 1) * k, (y1 - y0 + 1) * k] };
      READY.set(id, info); res(info);
    } catch (e) { READY.delete(id); res(null); } };
    im.onerror = () => { READY.delete(id); res(null); };
    im.src = u;
  }));
  const r = READY.get(id); return r instanceof Promise ? r : Promise.resolve(r);
}
const loaded = (id) => { const r = READY.get(id); return r && !(r instanceof Promise) ? r : null; };
/** El escudo oficial A con el acabado del autor si ya está cargado (si no, el dibujo de siempre): mismo sitio y tamaño. */
export function drawTownArms(g, cx, top, w, A) {
  const L = A && loaded(A.id); if (!L) return drawOfficial(g, cx, top, w, A);
  const H = officialHeight(w, A), [bx, by, bw, bh] = L.bb, k = Math.min(w * 1.12 / bw, H / bh), dw = bw * k, dh = bh * k;
  g.drawImage(L.im, bx, by, bw, bh, cx - dw / 2, top + (H - dh) / 2, dw, dh);
}
