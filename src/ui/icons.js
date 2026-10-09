import { icon3D, has3D, icon3DReady } from './icon3d.js';
import { enqueue } from '../util/store.js';
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
// Los iconos 3D se dibujan en segundo plano: mientras, un hueco transparente que se rellena al terminar
const waiting = new Map();
function want3D(k) {
  enqueue('i:' + k, () => { const u = icon3D(k); if (!u) return; for (const i of document.querySelectorAll(`img[data-i3d="${k}"]`)) { i.src = u; i.removeAttribute('data-i3d'); i.classList.remove('pend'); } const im = waiting.get(k); if (im) { im.src = u; waiting.delete(k); } });
}
// Iconos propios de MENDIMENDIZ (SVG dibujado a mano, sin emojis).
// Estilo «lineal a color»: contorno casi negro de grosor uniforme, colores planos y una franja de
// sombra en el borde inferior derecho de cada forma, con brillos blancos; 64×64.
const O = '#1f1a26';                       // contorno
const SW = 2.6;                            // grosor del contorno
const hex6 = (c) => { let h = c.slice(1).toLowerCase(); if (h.length === 3) h = h.split('').map(x => x + x).join(''); return h; };
const dk = (c, k = 0.2) => { const a = parseInt(hex6(c), 16), b = 0x2a1a3a; const ch = (sh) => Math.round(((a >> sh) & 255) * (1 - k) + ((b >> sh) & 255) * k); return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0'); };
let CP = 0;
// forma rellena con franja de sombra: base oscura + copia clara desplazada y recortada + contorno
function shaded(tag, attrs, fill, extra = '', stroke = true) {
  if (!fill || fill === 'none' || fill[0] !== '#') return `<${tag} ${attrs} fill="${fill || 'none'}" ${stroke ? `stroke="${O}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round"` : ''} ${extra}/>`;
  const id = 'cp' + (++CP);
  // la luz se desplaza con un translate; si la forma ya lleva transform (una elipse girada) se combina en el mismo
  // atributo: dos transform en una etiqueta invalidan el SVG cuando se usa como imagen (sellos) y sale roto en Safari
  const lit = /transform="/.test(`${attrs} ${extra}`) ? `${attrs} ${extra}`.replace(/transform="([^"]*)"/, 'transform="translate(-2.4 -1.8) $1"') : `${attrs} transform="translate(-2.4 -1.8)" ${extra}`;
  return `<clipPath id="${id}"><${tag} ${attrs}/></clipPath><${tag} ${attrs} fill="${dk(fill)}" ${extra}/><g clip-path="url(#${id})"><${tag} ${lit} fill="${fill}"/></g>` +
    (stroke ? `<${tag} ${attrs} fill="none" stroke="${O}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round"/>` : '');
}
const gf = (c) => c;
const s = (d, fill, extra = '') => shaded('path', `d="${d}"`, fill, extra);
const ln = (d, c = O, w = 3) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${c === O ? Math.min(w, SW + 0.6) : w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const c = (x, y, r, fill, st = true) => r < 3.5 || !st ? `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${st ? `stroke="${O}" stroke-width="${SW}"` : ''}/>` : shaded('circle', `cx="${x}" cy="${y}" r="${r}"`, fill);
const e = (x, y, rx, ry, fill, st = true, rot = 0) => { const a = `cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" ${rot ? `transform="rotate(${rot} ${x} ${y})"` : ''}`; return Math.min(rx, ry) < 3 || !st ? `<ellipse ${a} fill="${fill}" ${st ? `stroke="${O}" stroke-width="${SW}"` : ''}/>` : shaded('ellipse', a, fill); };
const r = (x, y, w, h, fill, rx = 3) => Math.min(w, h) < 5 ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${O}" stroke-width="${SW}"/>` : shaded('rect', `x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"`, fill);
const hl = (d) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2.6" stroke-linecap="round"/>`;

export const ICONS = {
  // ---- lugares y arquitectura ----
  church: s('M14 58V30l18-14 18 14v28z', '#e6d3b0') + s('M26 58V44a6 6 0 0112 0v14z', '#6b4a2e') + s('M27 16V6h10v10', '#d9c49e') + ln('M32 2v8M28 5h8') + c(32, 30, 4, '#8fc7e8') + hl('M18 32l14-11'),
  cathedral: s('M8 58V26l8-8 8 8v32z', '#e6d3b0') + s('M40 58V26l8-8 8 8v32z', '#e6d3b0') + s('M22 58V34l10-8 10 8v24z', '#d9c49e') + s('M28 58v-9a4 4 0 018 0v9z', '#6b4a2e') + c(32, 36, 3, '#8fc7e8') + ln('M16 10v8M48 10v8'),
  castle: s('M6 58V24h8v5h6v-5h8v5h8v-5h8v5h6v-5h8v34z', '#d9c49e') + s('M26 58V46a6 6 0 0112 0v12z', '#6b4a2e') + r(12, 34, 6, 7, '#3b2a1e', 1) + r(46, 34, 6, 7, '#3b2a1e', 1) + s('M28 14h8v10h-8z', '#e6d3b0') + ln('M32 4v10') + s('M32 4l9 3-9 3z', '#d42f2f'),
  bridge: s('M2 34h60v8H2z', '#c9b48e') + s('M6 42v14h8a18 18 0 0136 0h8V42z', '#d9c49e') + s('M2 56h60', '#4aa3d0') + e(32, 58, 26, 3, '#4aa3d0', false) + ln('M4 34V28M16 34v-6M28 34v-6M40 34v-6M52 34v-6M60 34v-6'),
  house: s('M10 30L32 12l22 18', '#c0563f') + s('M14 28v28h36V28', '#f1e6cf') + r(20, 38, 8, 8, '#6aa9d0', 1) + s('M34 56V40h10v16z', '#8a5a32') + hl('M16 30l16-13'),
  towerhouse: s('M18 58V14h28v44z', '#d0bf9c') + s('M14 14h36l-4-8H18z', '#c0563f') + r(24, 22, 6, 8, '#3b2a1e', 1) + r(34, 22, 6, 8, '#3b2a1e', 1) + s('M27 58V46a5 5 0 0110 0v12z', '#6b4a2e'),
  palace: s('M6 58V26h52v32z', '#e6d3b0') + s('M4 26L32 12l28 14z', '#c0563f') + c(32, 22, 4, '#e8c34a') + [12, 24, 36, 48].map(x => r(x, 32, 6, 9, '#6aa9d0', 1)).join('') + s('M28 58V48h8v10z', '#6b4a2e'),
  arch: s('M8 58V18h48v40H42V34a10 10 0 00-20 0v24z', '#d0bf9c') + ln('M8 18h48M14 18v-6h36v6') + hl('M12 24v28'),
  mill: s('M10 58V28h26v30z', '#d0bf9c') + s('M8 30L23 16l15 14', '#c0563f') + c(46, 40, 14, '#a57a45') + ln('M46 26v28M32 40h28M36 30l20 20M56 30L36 50') + c(46, 40, 4, '#6b4a2e') + s('M0 60h64', '#4aa3d0'),
  cave: s('M2 58c2-22 12-40 30-40s28 18 30 40z', '#8f877a') + s('M16 58c0-14 7-24 16-24s16 10 16 24z', '#2b2320') + hl('M10 44c3-10 9-18 16-21'),
  fountain: s('M10 50h44v8H10z', '#c9b48e') + s('M14 50c0-6 8-10 18-10s18 4 18 10', '#6ec0e6') + s('M28 40V20h8v20', '#d0bf9c') + ln('M32 18c-6-8-12-4-14 4M32 18c6-8 12-4 14 4', '#4aa3d0') + c(32, 16, 4, '#d0bf9c'),
  cross: s('M28 58V24H18v-8h10V6h8v10h10v8H36v34z', '#d0bf9c') + s('M20 58h24v-6H20z', '#b8a47e'),
  dolmen: s('M8 26l48-6 2 8-50 6z', '#9a948a') + s('M12 34v24h8V33z', '#8a847a') + s('M42 30v28h8V29z', '#8a847a') + ln('M4 58h56'),
  stelae: c(32, 24, 16, '#b8b0a2') + c(32, 24, 9, '#d0c9bb') + ln('M32 15v18M23 24h18') + s('M26 38h12v20H26z', '#b8b0a2'),
  monolith: s('M22 58l3-40c1-6 5-10 8-12 4 2 7 6 7 12l2 40z', '#b8b0a2') + e(30, 30, 3, 5, '#8fa86a', false) + e(36, 44, 4, 3, '#8fa86a', false) + hl('M27 20c1-5 3-8 6-10') + s('M6 58c6-4 10-4 14 0M42 58c6-4 12-4 16 0', '#6aa84f') + ln('M4 58h56'),
  kiosk: s('M32 6l2 4h-4z', '#e8c34a') + s('M6 28c6-12 16-18 26-18s20 6 26 18z', '#3d8a5a') + s('M6 28h52v5H6z', '#e6d3b0') + [12, 22, 32, 42, 52].map(x => r(x - 2, 33, 4, 17, '#f1e6cf', 1)).join('') + s('M4 50h56v8H4z', '#c9b48e') + e(32, 20, 8, 3, '#5aa870', false),
  horreo: s('M4 26L32 10l28 16z', '#c0563f') + ln('M12 22l20-11 20 11', '#e07a5f', 2) + s('M10 26h44v17H10z', '#b08650') + ln('M16 27v15M22 27v15M28 27v15M34 27v15M40 27v15M46 27v15', '#7a5530', 2) + [16, 32, 48].map(x => e(x, 45, 6, 2.5, '#9a948a') + r(x - 3, 47, 6, 10, '#b8b0a2', 1)).join(''),
  ruin: s('M6 58V28l6-4 4 6 4-8 4 4v32z', '#b8b0a2') + s('M30 58V34a8 8 0 0116 0v24h8V16l-6-6-4 6-4-2-4 8-4-2-4 6v38z', '#c9c1b2') + s('M38 58V36a4 4 0 018 0', 'none') + ln('M10 36h10M10 46h10M34 22h14', '#8f877a', 2) + s('M4 58c4-5 8-5 10 0M50 58c3-4 7-4 10 0', '#6aa84f'),
  tunnel: s('M4 58V24c8-12 48-12 56 0v34z', '#8f877a') + s('M16 58V38a16 12 0 0132 0v20z', '#2b2320') + ln('M22 58l4-14M42 58l-4-14', '#e8c34a'),
  lookout: s('M4 58L24 22l10 14 8-10 18 32z', '#6f9a58') + s('M36 12h10v10H36z', '#c9b48e') + ln('M41 22v10') + c(41, 8, 3, '#e8c34a'),
  townhall: s('M8 58V26h48v32z', '#e6d3b0') + s('M6 26h52l-4-8H10z', '#8a5a32') + c(32, 12, 6, '#f7f1e2') + ln('M32 9v3l2 2') + [14, 26, 38, 50].map(x => r(x - 2, 32, 6, 10, '#6aa9d0', 1)).join('') + ln('M8 46h48'),
  walls: s('M4 58V26h8v6h6v-6h8v6h6v-6h8v6h6v-6h8v6h6v-6h0v32z', '#d0bf9c') + r(24, 40, 16, 18, '#6b4a2e', 8),
  gorge: s('M2 58V8l14 10 4 40z', '#c9a27a') + s('M62 58V10L48 20l-4 38z', '#b8906a') + s('M20 58c4-6 8-6 12 0s8 6 12 0', '#4aa3d0') + ln('M8 24l6 4M54 26l-6 4', '#8a6a4a'),
  plaza: r(6, 18, 52, 40, '#e6d3b0', 4) + [14, 26, 38, 50].map(x => s(`M${x - 4} 18v-6h8v6`, '#c0563f')).join('') + c(32, 40, 8, '#6ec0e6') + ln('M6 30h52', '#b8a47e', 2),

  // ---- naturaleza ----
  mountain: s('M2 56L22 18l10 14 8-12 22 36z', '#7aa15a') + s('M22 18l-6 12 6-4 4 4z', '#fff') + s('M40 20l-5 8 5-2 4 4z', '#fff') + hl('M10 50l12-24'),
  peak: s('M4 58L32 8l28 50z', '#8a9aa6') + s('M32 8l-10 18 6-3 4 5 4-5 6 3z', '#fff') + s('M32 2v8', 'none') + ln('M32 2v8') + s('M32 2l8 3-8 3z', '#d42f2f'),
  tree: s('M28 58V40h8v18z', '#8a5a32') + s('M32 6C18 6 12 18 14 28c-6 4-4 16 6 16h24c10 0 12-12 6-16 2-10-4-22-18-22z', '#5fa04a') + hl('M22 16c3-4 6-5 10-5'),
  pine: s('M28 58V48h8v10z', '#8a5a32') + s('M32 4L14 28h8L10 48h44L42 28h8z', '#3d7a4a') + hl('M26 18l-6 8'),
  flower: [0, 72, 144, 216, 288].map(a => e(32 + 12 * Math.sin(a * Math.PI / 180), 28 - 12 * Math.cos(a * Math.PI / 180), 8, 11, '#f7f1e2', true, a)).join('') + c(32, 28, 7, '#e8c34a') + s('M32 40v18', 'none') + ln('M32 40v18', '#3d7a4a', 4),
  eguzkilore: [...Array(12)].map((_, i) => { const a = i * 30 * Math.PI / 180; return s(`M32 32L${32 + 28 * Math.sin(a - 0.12)} ${32 - 28 * Math.cos(a - 0.12)}L${32 + 28 * Math.sin(a + 0.12)} ${32 - 28 * Math.cos(a + 0.12)}z`, '#f0e6c8'); }).join('') + c(32, 32, 12, '#d9a53a') + c(32, 32, 6, '#b8862a', false),
  leaf: s('M10 54C10 26 26 10 54 10c0 28-16 44-44 44z', '#6aa84f') + ln('M10 54L42 22M24 40h10M32 32v-10'),
  river: s('M4 18c10-6 18 6 28 0s18-6 28 0v10c-10-6-18 6-28 0S14 22 4 28z', '#4aa3d0') + s('M4 38c10-6 18 6 28 0s18-6 28 0v10c-10-6-18 6-28 0S14 42 4 48z', '#6ec0e6'),
  sun: c(32, 32, 12, '#f5c542') + [...Array(8)].map((_, i) => { const a = i * Math.PI / 4; return ln(`M${32 + 18 * Math.cos(a)} ${32 + 18 * Math.sin(a)}L${32 + 26 * Math.cos(a)} ${32 + 26 * Math.sin(a)}`); }).join(''),
  moon: s('M40 6a26 26 0 1018 38A22 22 0 0140 6z', '#f0e6c8') + c(26, 30, 3, '#d9ccb0', false) + c(34, 44, 2, '#d9ccb0', false),
  cloud: s('M14 46a10 10 0 010-20 14 14 0 0126-6 11 11 0 0110 26z', '#f7f7f7'),
  snow: ln('M32 6v52M10 19l44 26M10 45l44-26', '#6ec0e6', 5) + ln('M32 6v52M10 19l44 26M10 45l44-26', '#fff', 2),
  herb: ln('M32 58V20', '#3d7a4a', 4) + e(22, 30, 10, 5, '#6aa84f', true, -30) + e(42, 24, 10, 5, '#6aa84f', true, 30) + e(22, 44, 9, 4, '#6aa84f', true, -20) + e(42, 40, 9, 4, '#6aa84f', true, 20) + c(32, 16, 5, '#e8c34a'),
  mushroom: s('M8 30C8 14 56 14 56 30z', '#d42f2f') + s('M24 30h16l2 24H22z', '#f7f1e2') + c(20, 24, 3, '#fff', false) + c(34, 20, 3, '#fff', false) + c(46, 26, 3, '#fff', false),

  // ---- fauna ----
  sheep: e(34, 34, 20, 14, '#f4efe6') + [18, 26, 34, 42, 50].map(x => c(x, 22, 5, '#f4efe6')).join('') + e(14, 32, 8, 7, '#3b3030') + c(12, 30, 1.5, '#fff', false) + ln('M24 46v10M44 46v10', O, 4) + e(16, 26, 4, 2, '#3b3030', true, -30),
  latxa: e(34, 34, 20, 14, '#f0e8d8') + [18, 26, 34, 42, 50].map(x => c(x, 22, 5, '#f0e8d8')).join('') + e(14, 32, 8, 7, '#3b3030') + s('M10 26c-6-6 2-12 6-6', '#c9b48e') + ln('M24 46v10M44 46v10', O, 4),
  cow: e(36, 34, 20, 13, '#c47a45') + e(14, 30, 10, 9, '#c47a45') + e(10, 36, 6, 4, '#e8b8a0') + s('M8 22l-4-6M20 22l4-6', 'none') + ln('M8 22l-4-6M20 22l4-6', '#efe4c6', 4) + c(12, 28, 1.5, O, false) + ln('M22 46v10M48 46v10', O, 4) + ln('M56 30c4 4 4 10 2 14'),
  horse: s('M16 40c0-10 8-16 22-16h10c6 0 10 4 10 10v6H16z', '#6b4a2e') + s('M16 40L8 22c-2-6 6-10 10-6l6 10', '#6b4a2e') + ln('M18 16c4 2 8 6 8 12', '#2a1a12', 5) + ln('M22 40v16M50 40v16', O, 4) + ln('M58 36c4 4 4 12 0 16', '#2a1a12', 4) + c(12, 22, 1.5, '#fff', false),
  pig: e(34, 34, 20, 15, '#f2b6b0') + e(12, 34, 7, 6, '#e89a94') + c(10, 33, 1.3, O, false) + c(14, 33, 1.3, O, false) + s('M20 22l-2-8 8 4z', '#f2b6b0') + ln('M24 48v8M44 48v8', O, 4) + ln('M54 30c6-2 6 6 2 6'),
  dog: e(34, 38, 18, 11, '#c9a27a') + c(16, 28, 10, '#c9a27a') + e(10, 26, 4, 9, '#8a6a4a', true, 20) + c(14, 26, 1.8, O, false) + c(8, 31, 2.2, O, false) + ln('M24 48v8M44 48v8', O, 4) + ln('M52 34l8-8'),
  fish: s('M6 32c10-14 30-14 42 0-12 14-32 14-42 0z', '#8ab7c7') + s('M46 32l14-10v20z', '#8ab7c7') + c(16, 30, 2.5, O, false) + ln('M26 26c2 4 2 8 0 12', '#5a8a9a', 2) + [22, 30, 36].map(x => c(x, 34, 1.5, '#d06a6a', false)).join(''),
  bird: s('M10 36c0-12 12-18 24-14l10-6 4 8-6 4c2 12-8 20-20 18z', '#6a8ab0') + s('M44 16l10 2-8 4z', '#e8a33a') + c(40, 20, 1.8, O, false) + s('M18 34c6 0 14 4 16 10', 'none') + ln('M18 34c6 0 14 4 16 10'),
  vulture: s('M4 30c10-8 18-8 28-2 10-6 18-6 28 2-8 0-14 4-18 8H22c-4-4-10-8-18-8z', '#6b5a48') + c(32, 22, 6, '#e8dcc0') + s('M36 22l6 2-6 2z', '#e8a33a') + c(33, 21, 1.4, O, false),
  deer: e(34, 36, 18, 11, '#b07a45') + s('M14 32c0-6 4-10 8-10l4 10-6 6z', '#b07a45') + ln('M18 22l-4-12M18 22l4-12M15 14l-5-2M21 14l5-2', '#8a5a32', 3) + ln('M24 46v10M46 46v10', O, 4) + c(18, 28, 1.5, O, false),
  boar: e(34, 36, 20, 13, '#5a4538') + s('M14 36L4 38l2-8 10-2z', '#5a4538') + ln('M8 34l-2-6', '#efe4c6', 3) + c(14, 30, 1.5, '#fff', false) + ln('M24 48v8M44 48v8', O, 4) + ln('M20 24l6 4M28 22l4 4M36 22l2 4', '#2a1a12', 2),
  squirrel: s('M44 50c14-4 16-26 4-34-8-6-16 2-10 10 4 6 12 4 8 16z', '#c46a2e') + e(28, 42, 10, 12, '#c46a2e') + c(24, 26, 8, '#c46a2e') + s('M20 18l2-6 4 6z', '#c46a2e') + c(21, 25, 1.5, O, false) + e(28, 44, 5, 7, '#f0d0a8', false),
  woodpecker: s('M20 58V10', 'none') + ln('M18 60V4', '#8a5a32', 8) + e(34, 34, 10, 16, '#2a2a2a') + c(34, 18, 8, '#f4f1ea') + s('M30 10h8v6h-8z', '#d42f2f') + s('M26 18l-8 2 8 2z', '#6b6b6b') + c(32, 17, 1.5, O, false) + e(34, 38, 5, 8, '#f4f1ea', false),
  butterfly: e(22, 24, 12, 10, '#f2a33a', true, -20) + e(42, 24, 12, 10, '#f2a33a', true, 20) + e(24, 42, 9, 8, '#e8c34a', true, 20) + e(40, 42, 9, 8, '#e8c34a', true, -20) + e(32, 32, 3, 16, '#2b1d12', false) + ln('M30 16l-4-8M34 16l4-8'),
  bull: e(36, 36, 20, 13, '#2a2320') + e(14, 32, 10, 9, '#2a2320') + ln('M8 24c-6-2-6-10 0-12M20 24c6-2 6-10 0-12', '#efe4c6', 4) + c(12, 30, 1.8, '#fff', false) + ln('M24 48v8M48 48v8', O, 4),
  bee: e(32, 36, 14, 10, '#f5c542') + ln('M26 28v16M34 27v18', O, 4) + e(26, 20, 8, 6, '#dff1ff', true, -20) + e(40, 20, 8, 6, '#dff1ff', true, 20) + c(18, 34, 5, '#2b1d12', false),
  trout: s('M4 32c10-12 32-12 44 0-12 12-34 12-44 0z', '#9aa87a') + s('M46 32l14-10v20z', '#9aa87a') + c(14, 30, 2.5, O, false) + [18, 24, 30, 36, 22, 30].map((x, i) => c(x, i > 3 ? 36 : 28, 1.6, '#c0392b', false)).join(''),

  fox: s('M10 40c0-10 10-18 24-18h8l8-12 2 14c4 2 6 8 4 14z', '#e07a2a') + s('M12 30L6 14l12 10z', '#e07a2a') + s('M4 34c-2 6 4 10 10 8l4-6z', '#f4efe6') + c(14, 32, 1.6, O, false) + ln('M24 46v10M46 46v10', O, 4) + s('M52 38c8 0 10 10 4 14-6 2-10-4-8-10z', '#e07a2a') + e(56, 48, 3, 2.5, '#f4efe6', false),
  frog: e(32, 40, 22, 14, '#6ab04a') + c(20, 24, 7, '#6ab04a') + c(44, 24, 7, '#6ab04a') + c(20, 23, 3, O, false) + c(44, 23, 3, O, false) + ln('M22 42c6 4 14 4 20 0') + ln('M10 50l-6 6M54 50l6 6', '#4a8a3a', 4),
  eagle: s('M2 26c12-6 22-2 30 6 8-8 18-12 30-6-10 2-16 8-20 16h-20C18 34 12 28 2 26z', '#6b4a2e') + c(32, 22, 7, '#8a6a4a') + s('M36 22l7 3-7 3z', '#e8a33a') + c(33, 20, 1.5, O, false) + s('M26 42h12l-6 12z', '#6b4a2e'),
  stork: s('M20 30c0-8 10-14 20-10l8-12 4 2-6 14c4 8-2 18-14 18-8 0-12-6-12-12z', '#f7f7f7') + s('M30 44c6 2 14 0 18-6-8 0-14 2-18 6z', '#2b2320') + s('M50 8l12-2-10 6z', '#e0532a') + ln('M28 48v12M36 48v12', '#e0532a', 3),
  rabbit: e(34, 42, 18, 12, '#c9a27a') + c(18, 34, 9, '#c9a27a') + e(14, 16, 4, 12, '#c9a27a', true, -10) + e(22, 16, 4, 12, '#c9a27a', true, 10) + c(15, 33, 1.5, O, false) + c(52, 40, 5, '#f4efe6'),
  chamois: e(36, 36, 18, 11, '#b07a45') + s('M16 32c0-6 4-10 8-10l4 10-6 6z', '#b07a45') + ln('M20 22c-2-6 0-10 2-12M24 22c0-6 2-10 4-12', '#2b1d12', 3) + ln('M18 30l6 4', '#f4efe6', 3) + ln('M24 46v10M48 46v10', O, 4),
  marmot: e(32, 40, 16, 18, '#a07a50') + c(32, 20, 11, '#a07a50') + e(32, 26, 6, 4, '#d9c0a0', false) + c(27, 18, 1.8, O, false) + c(37, 18, 1.8, O, false) + ln('M28 30h8', '#f4efe6', 3),
  robin: e(32, 36, 18, 16, '#8a6a4a') + e(28, 40, 11, 11, '#e0632a', false) + c(26, 26, 2, O, false) + s('M12 32l-8 2 8 2z', '#2b1d12') + s('M48 32l12-6-4 12z', '#8a6a4a') + ln('M28 52v8M36 52v8', O, 2),
  heron: s('M18 34c0-8 8-12 16-8l6-16 4 2-4 18c4 6 0 16-10 16-8 0-12-6-12-12z', '#9aa8b8') + s('M44 10l14 2-12 4z', '#e8a33a') + ln('M26 50v10M32 50v10', '#6b6f75', 3),
  bustard: e(34, 36, 20, 12, '#c9a27a') + c(16, 26, 8, '#9aa8b8') + s('M8 26l-6 2 6 2z', '#e8a33a') + c(15, 24, 1.5, O, false) + ln('M26 46v12M40 46v12', O, 3) + ln('M26 32l20 4', '#8a6a4a', 2),
  // ---- productos, oficios y cultura ----
  cheese: s('M6 40l30-22 22 10v18L28 58 6 50z', '#f2c94c') + s('M6 40l22 10 30-22', 'none') + ln('M28 50v8') + c(20, 42, 3, '#d9a53a', false) + c(40, 36, 3, '#d9a53a', false) + c(46, 46, 2.5, '#d9a53a', false),
  milk: s('M22 10h20v8l6 10v28a4 4 0 01-4 4H20a4 4 0 01-4-4V28l6-10z', '#f7f7f7') + s('M16 36h32v14H16z', '#6aa9d0') + ln('M22 18h20'),
  bread: s('M6 40c0-14 12-22 26-22s26 8 26 22c0 8-4 12-10 12H16C10 52 6 48 6 40z', '#d9a05a') + ln('M20 26l6 12M32 24l4 14M44 26l2 12', '#a0662a'),
  grapes: [[26, 24], [38, 24], [32, 34], [20, 34], [44, 34], [26, 44], [38, 44], [32, 54]].map(([x, y]) => c(x, y, 7, '#7a3a8a')).join('') + ln('M32 18V6') + e(40, 10, 8, 4, '#6aa84f', true, -20) + hl('M22 22l2-2'),
  wine: s('M20 6h24l-2 22a10 10 0 01-20 0z', '#f7f7f7') + s('M21 18h22l-1 10a10 10 0 01-20 0z', '#8a1f3a') + ln('M32 38v14M22 58h20'),
  olive: e(24, 36, 9, 12, '#5a7a2a', true, -20) + e(42, 32, 9, 12, '#3b4a1a', true, 20) + ln('M28 22c4-8 10-12 18-14') + e(44, 14, 8, 3, '#8aa860', true, -20),
  pepper: s('M20 16c6-2 10 2 14 2 12 0 24 10 22 26-2 12-14 16-22 10C22 46 10 30 20 16z', '#d42f2f') + s('M22 16c-2-6 2-10 8-10', 'none') + ln('M24 14c-2-6 0-10 6-10', '#3d7a4a', 4) + hl('M30 24c8 0 16 6 18 14'),
  asparagus: [18, 30, 42].map((x, i) => s(`M${x} 58V${14 + i * 4}c0-6 8-6 8 0v${44 - i * 4}z`, '#f0ead0')).join('') + ln('M14 48h36', '#d42f2f', 4),
  artichoke: s('M32 8c-14 6-20 20-18 32 2 10 10 16 18 16s16-6 18-16c2-12-4-26-18-32z', '#6a8a4a') + ln('M20 26c6 4 18 4 24 0M18 38c8 4 20 4 28 0M26 16c4 2 8 2 12 0', '#3d5a2a') + ln('M32 56v6', '#6a8a4a', 5),
  cardo: s('M22 58V20c0-8 20-8 20 0v38z', '#e0e8d0') + ln('M28 22v34M36 22v34', '#b0c0a0') + s('M22 20c-6-8-2-16 6-14M42 20c6-8 2-16-6-14', '#9ab07a'),
  tomato: c(32, 36, 20, '#d9412a') + s('M22 18l10 6 10-6-4 8 6 2-12 2-12-2 6-2z', '#3d7a4a') + hl('M20 32c2-6 6-9 10-10'),
  wheat: ln('M32 60V14', '#c9a24a', 4) + [18, 26, 34, 42].map(y => e(26, y, 6, 3.5, '#e2c46a', true, -35) + e(38, y, 6, 3.5, '#e2c46a', true, 35)).join('') + e(32, 10, 3.5, 6, '#e2c46a'),
  corn: s('M32 6c-10 8-12 32-4 50h8c8-18 6-42-4-50z', '#f2c94c') + ln('M26 20h12M24 30h16M24 40h16M26 50h12M32 8v48', '#d9a53a', 2) + s('M28 56c-10-4-16-16-14-30 6 8 10 18 14 30zM36 56c10-4 16-16 14-30-6 8-10 18-14 30z', '#7ab04a'),
  potato: e(32, 36, 22, 16, '#c9a06a', true, -12) + [22, 34, 44, 28].map((x, i) => c(x, 30 + (i % 2) * 10, 1.8, '#8a6a3a', false)).join(''),
  apple: s('M32 18c-10-6-24 0-22 16 2 16 12 24 22 20 10 4 20-4 22-20 2-16-12-22-22-16z', '#d9412a') + ln('M32 18c0-6 2-10 6-12') + e(42, 10, 7, 3, '#6aa84f', true, -25) + hl('M18 28c2-4 5-6 9-6'),
  almond: e(32, 34, 13, 20, '#c9935a', true, 20) + ln('M26 22c4 8 6 16 4 26', '#a06a3a', 2),
  beans: [[22, 26], [38, 24], [28, 40], [44, 38], [20, 50], [36, 52]].map(([x, y]) => e(x, y, 8, 5.5, '#f4efe0', true, 20)).join(''),
  honey: s('M18 22h28v30a6 6 0 01-6 6H24a6 6 0 01-6-6z', '#f2b134') + s('M16 14h32v8H16z', '#c9935a') + s('M28 22c0 6 8 6 8 0', '#f2b134') + hl('M24 30v18'),
  chistorra: s('M8 44c8-20 28-28 48-20', 'none') + ln('M8 44c8-20 28-28 48-20', O, 14) + ln('M8 44c8-20 28-28 48-20', '#c0452a', 9) + ln('M16 36l2 2M28 28l2 2M42 24l1 3', '#8a2a1a', 2),
  basket: s('M8 30h48l-6 26H14z', '#b08650') + ln('M12 38h40M14 46h36M20 30l-2 26M32 30v26M44 30l2 26', '#8a6a3a', 2) + s('M16 30c0-16 32-16 32 0', 'none') + ln('M16 30c0-16 32-16 32 0', '#8a6a3a', 4),
  axe: ln('M18 58L44 14', '#8a5a32', 6) + s('M38 6c10 0 18 8 18 18l-14-4-6 6z', '#b7bcc2') + hl('M44 10c4 1 7 4 8 8'),
  stone: s('M8 50c0-14 8-28 24-28s24 14 24 28c0 4-4 8-8 8H16c-4 0-8-4-8-8z', '#9a948a') + ln('M18 40c4-6 10-10 16-10', '#fff', 2) + ln('M40 34l6 8', '#6b665e', 2),
  hammer: ln('M20 58L42 24', '#8a5a32', 6) + s('M30 8l22 14-6 10-22-14z', '#5d6066') + s('M4 60h28v-4H4z', '#6b6b6b'),
  anvil: s('M6 22h40c6 0 12 4 12 10H44v6h-8v8h10v8H18v-8h10v-8h-8v-6c-8 0-14-4-14-10z', '#4a4d52') + hl('M12 26h30'),
  sickle: ln('M14 60l12-18', O, 10) + ln('M14 60l12-18', '#a0703a', 6) + s('M25 44C4 34 8 6 36 4c7 0 13 3 16 8C45 8 34 10 28 16 20 25 22 36 31 41z', '#c9ced4') + hl('M17 30c0-11 8-19 19-21'),
  net: ln('M4 8h56', '#8a5a32', 6) + s('M8 10C10 36 20 54 32 58 44 54 54 36 56 10z', '#e6d3b0', 'fill-opacity=".35"') + ln('M11 20Q32 32 53 20M14 32Q32 44 50 32M20 44Q32 52 44 44M20 10Q22 34 27 55M32 10v48M44 10Q42 34 37 55', '#6b4a2e', 2) + [14, 26, 38, 50].map(x => c(x, 9, 4, '#e8743a')).join(''),
  espadrille: s('M6 44c0-8 8-12 18-12h14c10 0 20 6 20 14H6z', '#f4efe0') + s('M4 46h56v6H4z', '#d9c79a') + ln('M20 32l8 12M36 32l-8 12', '#d42f2f', 3) + ln('M8 49h48', '#b8a47e', 1.5),
  raft: s('M2 50c8-4 14 4 22 0s14-4 22 0 12 4 18 0v8H2z', '#4aa3d0') + [20, 28, 36, 44].map(y => s(`M10 ${y}h40a4 4 0 010 8H10a4 4 0 010-8z`, '#b08650') + c(10, y + 4, 4, '#e6c89a')).join('') + ln('M46 44L58 4', O, 5) + ln('M46 44L58 4', '#8a5a32', 3),
  bell: s('M32 6c-12 0-16 10-16 24v10l-6 8h44l-6-8V30c0-14-4-24-16-24z', '#b8a060') + c(32, 52, 5, '#6b5a3a') + hl('M22 16c2-4 5-6 8-6'),
  mask: s('M8 20c8-8 40-8 48 0 2 20-8 36-24 36S6 40 8 20z', '#f1e7d6') + e(22, 28, 6, 4, '#2b1d12', false) + e(42, 28, 6, 4, '#2b1d12', false) + s('M24 42c4 4 12 4 16 0', 'none') + ln('M24 42c4 4 12 4 16 0') + s('M8 20c-2-8 4-14 8-10M56 20c2-8-4-14-8-10', '#d42f2f'),
  giant: s('M14 58c0-16 6-26 18-26s18 10 18 26z', '#b8232a') + ln('M18 50h28', '#e8c34a', 3) + s('M26 32h12l-2 26h-8z', '#e8c34a') + c(32, 20, 12, '#eab89a') + s('M20 12l3-8 5 5 4-7 4 7 5-5 3 8z', '#e8c34a') + c(32, 6, 2, '#d42f2f', false) + c(28, 20, 1.8, O, false) + c(36, 20, 1.8, O, false) + ln('M28 26c2 2 6 2 8 0') + e(24, 24, 2.5, 1.5, '#f09a8a', false) + e(40, 24, 2.5, 1.5, '#f09a8a', false),
  music: s('M22 44V16l30-8v30', 'none') + ln('M22 44V16l30-8v30', O, 5) + ln('M22 44V16l30-8v30', '#f2c94c', 2) + e(16, 45, 8, 6, '#d42f2f', true, -20) + e(46, 39, 8, 6, '#d42f2f', true, -20) + s('M22 16l30-8v7l-30 8z', '#f2c94c') + hl('M12 43c2-2 5-3 7-2'),
  dance: c(24, 12, 6, '#eac1a0') + s('M18 20h12l4 16-4 22h-6l2-18-8-4z', '#f4f1ea') + ln('M30 24l12-10M18 24l-8 6', O, 4) + s('M18 34h14v4H18z', '#d42f2f') + ln('M44 12c6 2 10 8 10 14', '#e03c3c', 3) + ln('M40 8c6 0 12 4 14 10', '#f2c230', 3),
  txistu: ln('M12 52L52 12', O, 8) + ln('M12 52L52 12', '#e8dcc0', 5) + [0, 1, 2].map(i => c(28 + i * 7, 36 - i * 7, 1.8, O, false)).join(''),
  angel: c(32, 18, 7, '#f1c7a5') + s('M24 28h16l6 26H18z', '#f7f7f7') + s('M24 30c-12-4-20 6-18 16 6-6 12-8 18-6zM40 30c12-4 20 6 18 16-6-6-12-8-18-6z', '#dff1ff') + e(32, 8, 8, 2.5, 'none') + ln('M26 8h12', '#e8c34a', 3) + ln('M32 2v8', O, 1.5),
  scroll: s('M14 10h36v44H14z', '#f2e6c4') + s('M10 10a4 4 0 018 0v44a4 4 0 01-8 0z', '#e2d2a8') + s('M46 10a4 4 0 018 0v44a4 4 0 01-8 0z', '#e2d2a8') + ln('M22 22h20M22 30h20M22 38h14', '#8a6a4a', 2),
  legend: s('M8 58c2-18 10-30 24-30s22 12 24 30z', '#3d3350') + c(32, 22, 12, '#c9b48e') + e(27, 21, 3, 4, '#f5c542', false) + e(37, 21, 3, 4, '#f5c542', false) + s('M20 14l-6-10 12 6zM44 14l6-10-12 6z', '#3d3350'),
  lamia: c(32, 18, 10, '#f1d7b8') + s('M20 16c0-14 24-14 24 0 6 12 4 30 8 42H12c4-12 2-30 8-42z', '#e8c34a') + s('M24 40c-8 8-8 16-4 20h24c4-4 4-12-4-20', '#6ab0a0') + c(28, 18, 1.5, O, false) + c(36, 18, 1.5, O, false) + s('M28 44h8v6h-8z', '#c9b48e'),
  basajaun: s('M12 58c0-24 8-40 20-40s20 16 20 40z', '#6b4a2e') + c(32, 20, 10, '#c49a78') + s('M22 24c4 14 16 14 20 0v10c-4 10-16 10-20 0z', '#5a3a22') + c(28, 18, 1.6, O, false) + c(36, 18, 1.6, O, false) + ln('M50 14v44', '#8a5a32', 4),
  sorgina: s('M18 30L32 2l14 28z', '#3d3350') + e(32, 30, 22, 5, '#3d3350') + c(32, 40, 10, '#f1d7b8') + c(28, 38, 1.5, O, false) + c(36, 38, 1.5, O, false) + s('M22 46h20l6 12H16z', '#3d3350'),
  bishop: s('M22 22L32 6l10 16z', '#f4efe0') + ln('M32 6v16', '#e8c34a', 3) + c(32, 30, 8, '#efc8a8') + s('M18 58l4-20h20l4 20z', '#b8232a') + ln('M32 38v20', '#e8c34a', 4) + ln('M50 58V20c0-6 8-6 8 0', '#e8c34a', 3),
  camino: s('M8 50C8 26 22 12 32 12s24 14 24 38z', '#f2c94c') + [14, 22, 30, 38, 46].map(x => ln(`M32 50L${x + 2} 16`, '#d9a53a', 2)).join('') + s('M24 50h16v8H24z', '#f2c94c'),
  arrow: s('M6 28h34V16l20 16-20 16V36H6z', '#f2c94c') + hl('M10 32h28'),
  bike: c(16, 44, 12, '#3a3d42') + c(16, 44, 8, '#e8e4dc', false) + c(48, 44, 12, '#3a3d42') + c(48, 44, 8, '#e8e4dc', false) + ln('M16 36v16M8 44h16M48 36v16M40 44h16', '#b8b4ac', 1.5) + ln('M16 44l10-18h18l4 18M26 26l10 18h12', O, 8) + ln('M16 44l10-18h18l4 18M26 26l10 18h12', '#d42f2f', 4) + s('M20 20h11l-2 5h-7z', '#3a2418') + ln('M44 26l-2-9h7', O, 4) + c(36, 44, 3, '#3a3d42'),
  running: c(38, 10, 6, '#eac1a0') + s('M28 18h12l2 16-8 4z', '#f4f1ea') + ln('M34 34l-8 12-10 2M34 34l10 10 2 12M30 22l-10 6M40 22l8 8', O, 4),
  // balón de fútbol: blanco con el pentágono central y los cinco de alrededor asomando
  balon: c(32, 32, 21, '#f6f6f2') + s('M32 22l9.5 6.9-3.6 11.2H26.1l-3.6-11.2z', '#23262e') + ln('M32 22V11M41.5 28.9l10.4-3.4M37.9 40.1l6.4 8.9M26.1 40.1l-6.4 8.9M22.5 28.9l-10.4-3.4') + s('M28 11.6l4-1.6 4 1.6-1 2.4h-6z', '#23262e') + hl('M20 20c3-3 6-5 10-5'),
  pelota: c(32, 32, 20, '#f4efe0') + ln('M16 20c10 6 10 18 0 24M48 20c-10 6-10 18 0 24', '#d42f2f', 3) + hl('M24 18c3-2 6-3 9-3'),
  txapela: e(32, 36, 26, 10, '#1d1d24') + e(32, 32, 22, 12, '#2a2a34') + ln('M32 20v-6', '#1d1d24', 3) + hl('M16 30c6-5 16-6 24-4'),
  pañuelo: s('M6 14h52L32 46z', '#d42f2f') + c(32, 44, 5, '#d42f2f') + s('M30 46l-6 14 6-2zM34 46l6 14-6-2z', '#d42f2f') + ln('M14 18h36', '#fff', 2),
  shield: s('M10 8h44v22c0 16-10 24-22 28C20 54 10 46 10 30z', '#d42f2f') + ln('M16 14l32 32M48 14L16 46M32 12v36M12 30h40', '#e8c34a', 3) + c(32, 30, 5, '#3d8a5a'),

  // ---- juego ----
  star: s('M32 4l8 18 20 2-15 13 5 20-18-10-18 10 5-20L4 24l20-2z', '#f5c542') + hl('M24 22l8-14'),
  xp: s('M32 4l6 20 20 8-20 8-6 20-6-20-20-8 20-8z', '#6ad0ff') + c(32, 32, 5, '#fff', false),
  trophy: s('M18 8h28v14c0 10-6 16-14 16s-14-6-14-16z', '#f5c542') + s('M18 12H8c0 10 4 14 10 14M46 12h10c0 10-4 14-10 14', 'none') + ln('M18 12H8c0 10 4 14 10 14M46 12h10c0 10-4 14-10 14') + s('M28 38h8v8h-8zM18 46h28v10H18z', '#c9935a') + hl('M24 14v10'),
  medal: s('M20 4h8l6 18h-8zM44 4h-8l-6 18h8z', '#3a8fd6') + c(32, 40, 16, '#f5c542') + s('M32 30l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z', '#e8a33a'),
  badge: s('M32 4l24 10v18c0 14-10 24-24 28C18 56 8 46 8 32V14z', '#6d3b5c') + s('M32 14l5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2z', '#f5c542'),
  stamp: c(32, 32, 26, '#f2e6c4') + c(32, 32, 20, 'none') + ln('M20 32l8 8 16-16', '#b8232a', 5) + `<circle cx="32" cy="32" r="22" fill="none" stroke="#b8232a" stroke-width="2" stroke-dasharray="4 3"/>`,
  ribbon: s('M20 6h24v40l-12-8-12 8z', '#d42f2f') + hl('M26 10v26'),
  book: s('M8 12c8-4 16-4 24 2 8-6 16-6 24-2v40c-8-4-16-4-24 2-8-6-16-6-24-2z', '#f2e6c4') + ln('M32 14v40') + ln('M14 22h12M14 30h12M38 22h12M38 30h12', '#8a6a4a', 2),
  map: s('M6 12l16-6 20 6 16-6v46l-16 6-20-6-16 6z', '#f2e6c4') + ln('M22 6v46M42 12v46', '#b8a47e', 2) + ln('M12 34c8-10 16 6 26-6s12-8 14-4', '#d42f2f', 3) + c(50, 22, 3, '#d42f2f', false),
  backpack: r(14, 14, 36, 44, '#c8642a', 10) + r(18, 34, 28, 18, '#a84f22', 5) + ln('M24 14c0-8 16-8 16 0') + r(28, 38, 8, 5, '#f2c230', 2) + hl('M20 20v10'),
  canteen: c(32, 38, 20, '#6b8a5a') + c(32, 38, 12, '#8aaa72', false) + r(27, 8, 10, 10, '#4a4d52', 2) + ln('M14 30c-4-16 40-16 36 0', '#7a5a3a', 3) + hl('M22 34c2-5 6-7 10-8'),
  stick: ln('M20 58L44 8', '#8a5a32', 7) + ln('M20 58L44 8', O, 1.2) + s('M40 6h10l-4 10h-8z', '#6b4a2e') + r(26, 38, 8, 7, '#d42f2f', 2),
  energy: s('M36 4L14 36h14l-4 24 26-36H34z', '#f5c542') + hl('M30 14l-8 14'),
  berries: c(22, 40, 9, '#3a1a4a') + c(36, 44, 9, '#4a1f5a') + c(30, 30, 9, '#3a1a4a') + s('M30 21c4-10 14-12 20-10-4 6-12 10-20 10z', '#4f8a3a') + hl('M19 37l2-2'),
  hazelnut: e(32, 38, 15, 16, '#b07a3a') + s('M18 30c4-14 24-14 28 0-8-4-20-4-28 0z', '#6b8a3a') + hl('M24 40c0-4 2-6 4-7'),
  compass: c(32, 32, 26, '#f2e6c4') + s('M32 10l6 22h-12z', '#d42f2f') + s('M32 54l-6-22h12z', '#4a4d52') + c(32, 32, 3, '#fff'),
  binoculars: c(18, 42, 12, '#4a4d52') + c(46, 42, 12, '#4a4d52') + s('M12 30l4-18h8l2 18M52 30l-4-18h-8l-2 18', '#6b6f75') + s('M26 36h12v8H26z', '#4a4d52') + c(18, 42, 6, '#8fc7e8', false) + c(46, 42, 6, '#8fc7e8', false),
  quiz: c(32, 32, 26, '#6d3b5c') + s('M24 24c0-6 4-10 8-10s8 4 8 9c0 6-8 7-8 13', 'none') + ln('M24 24c0-6 4-10 8-10s8 4 8 9c0 6-8 7-8 13', '#fff', 5) + c(32, 46, 3, '#fff', false),
  talk: s('M6 12h52v30H30l-12 12v-12H6z', '#f7f1e2') + ln('M16 22h32M16 32h20', '#8a6a4a', 3),
  check: c(32, 32, 26, '#c21cff') + ln('M18 32l10 10 18-20', '#fff', 6),   // (hecho y jugar, en la gama del juego: antes verdes)
  lock: s('M14 28h36v28H14z', '#c9935a') + s('M20 28V18a12 12 0 0124 0v10', 'none') + ln('M20 28V18a12 12 0 0124 0v10', O, 5) + c(32, 40, 4, O, false) + ln('M32 42v6', O, 3),
  home: s('M8 30L32 8l24 22', '#e03c3c') + s('M14 28v28h36V28', '#f7f1e2') + s('M27 56V40h10v16z', '#8a5a32'),
  gear: [...Array(8)].map((_, i) => { const a = i * Math.PI / 4; return `<rect x="28" y="2" width="8" height="12" rx="2" fill="#8a9aa6" stroke="${O}" stroke-width="3" transform="rotate(${a * 180 / Math.PI} 32 32)"/>`; }).join('') + c(32, 32, 20, '#8a9aa6') + c(32, 32, 8, '#f2e6c4'),
  person: c(32, 18, 12, '#eac1a0') + s('M10 58c0-16 10-24 22-24s22 8 22 24z', '#3a8fd6'),
  clock: c(32, 32, 26, '#f7f1e2') + ln('M32 16v16l10 8', O, 4),
  heart: s('M32 56S6 40 6 22c0-10 8-16 16-16 5 0 8 3 10 6 2-3 5-6 10-6 8 0 16 6 16 16 0 18-26 34-26 34z', '#e03c3c') + hl('M14 18c1-4 4-6 8-6'),
  fire: s('M32 4c4 14 18 18 18 34a18 18 0 01-36 0c0-10 6-14 8-22 4 6 4 10 6 12 4-8 4-16 4-24z', '#f2833a') + s('M32 30c2 8 10 10 10 18a10 10 0 01-20 0c0-6 4-8 6-12 2 4 2 6 4 6z', '#f5c542'),
  footprint: e(22, 40, 8, 12, '#b08650') + [15, 20, 25, 30].map((x, i) => c(x, 23 - (i === 0 ? 0 : 2), 3, '#b08650')).join('') + e(44, 26, 7, 11, '#b08650') + [38, 43, 48, 52].map(x => c(x, 10, 2.6, '#b08650')).join(''),
  hand: s('M20 58V28l-6-8c-2-4 4-8 8-4l4 6V8c0-4 6-4 6 0v14V6c0-4 6-4 6 0v16V8c0-4 6-4 6 0v18l2-6c2-4 8-2 6 2l-4 16c-2 10-6 20-18 20z', '#eac1a0'),
  target: c(32, 32, 26, '#f7f1e2') + c(32, 32, 17, '#d42f2f') + c(32, 32, 8, '#f7f1e2') + c(32, 32, 3, '#d42f2f', false),
  sparkle: s('M32 6l5 21 21 5-21 5-5 21-5-21-21-5 21-5z', '#fff3b0'),
  play: c(32, 32, 26, '#fff') + s('M26 20l18 12-18 12z', '#c21cff'),   // (blanco con el triángulo morado: se ve sobre el botón fucsia y sobre fondo oscuro)
  back: s('M40 10L18 32l22 22', 'none') + ln('M40 10L18 32l22 22', O, 8) + ln('M40 10L18 32l22 22', '#fff', 4),
  close: ln('M14 14l36 36M50 14L14 50', O, 8) + ln('M14 14l36 36M50 14L14 50', '#fff', 4),
  menu: ln('M10 16h44M10 32h44M10 48h44', O, 8) + ln('M10 16h44M10 32h44M10 48h44', '#fff', 4),
  jump: s('M32 6L12 30h12v24h16V30h12z', '#6ad0ff'),
  run: c(40, 10, 6, '#eac1a0') + s('M30 18h12l2 16-8 4z', '#f5c542') + ln('M36 34l-8 12-10 2M36 34l10 10 2 12M32 22l-10 6M42 22l8 8', O, 4) + ln('M4 22h10M2 32h10M6 42h8', '#6ad0ff', 3),
  pin: s('M32 60S12 36 12 24a20 20 0 0140 0c0 12-20 36-20 36z', '#e03c3c') + c(32, 24, 8, '#fff'),
  pen: s('M44 8l12 12-32 32-16 4 4-16z', '#f5c542') + s('M12 52l4-16 12 12z', '#f2e6c4') + ln('M40 12l12 12'),
  exclaim: c(32, 32, 26, '#f5c542') + ln('M32 16v20', O, 7) + c(32, 46, 4, O, false),
  lantern: s('M22 18h20l4 30H18z', '#f5c542') + s('M20 12h24v6H20zM16 48h32v6H16z', '#4a4d52') + ln('M32 12V4'),
  seed: e(32, 36, 13, 19, '#b08650', true, 25) + ln('M30 18c-4 8-4 20 3 30', '#6b4a2e', 2) + s('M36 16c4-8 12-10 16-8-2 6-8 10-16 8z', '#6aa84f') + hl('M24 30c1-5 4-9 8-11'),
  water: s('M32 6C22 22 14 30 14 42a18 18 0 0036 0c0-12-8-20-18-36z', '#4aa3d0') + hl('M22 42c0-6 3-10 6-13'),
  litter: s('M16 20h32l-4 38H20z', '#8a9aa6') + s('M12 14h40v6H12z', '#6b6f75') + ln('M26 28v22M38 28v22', '#5a5f65', 3),
  lamb: e(34, 36, 16, 11, '#fbf8f0') + [22, 30, 38, 46].map(x => c(x, 27, 4.5, '#fbf8f0')).join('') + e(16, 34, 7, 6, '#f1d7b8') + c(14, 32, 1.5, O, false) + ln('M26 46v10M42 46v10', O, 3),
  egg: e(32, 36, 16, 20, '#f7eedc') + hl('M24 26c2-4 4-6 7-7'),
  wool: c(32, 34, 20, '#f0e8d8') + ln('M16 26c10 4 22 4 32 0M14 36c12 4 24 4 36 0M18 46c8 3 20 3 28 0', '#c9b48e', 2) + ln('M50 44l8 10', '#c9b48e', 3),
  herbs: ln('M20 58V24M32 58V16M44 58V26', '#3d7a4a', 4) + e(20, 22, 6, 9, '#6aa84f') + e(32, 14, 6, 9, '#8ac06a') + e(44, 24, 6, 9, '#6aa84f'),
  flag: ln('M14 60V6', O, 4) + s('M14 8h36l-8 10 8 10H14z', '#d42f2f') + c(28, 18, 4, '#e8c34a', false),
  ring: c(32, 32, 24, 'none') + `<circle cx="32" cy="32" r="22" fill="none" stroke="#f5c542" stroke-width="8"/><circle cx="32" cy="32" r="22" fill="none" stroke="${O}" stroke-width="2"/>`,
};

// Alias por tipo de misión y otros conceptos
export const ALIAS = {
  visit: 'church', process: 'basket', harvest: 'basket', herd: 'sheep', dance: 'dance', carnival: 'mask', trade: 'hammer', legend: 'legend',
  race: 'running', observe: 'binoculars', tradition: 'music', quiz: 'quiz',
  romanesque: 'church', gothic: 'church', baroque: 'church', fortress: 'castle', cathedral: 'cathedral', pamplona: 'cathedral',
  aizkolari: 'axe', harrijasotzaile: 'stone', herrero: 'anvil', palomero: 'net', cantero: 'hammer', alpargatero: 'espadrille',
  camino: 'camino', almadia: 'raft', encierro: 'bull', romeria: 'footprint', bici: 'bike', song: 'music',
  sheep: 'sheep', cows: 'cow', pottoka: 'horse', horses: 'horse', pigs: 'pig', goats: 'sheep',
  uva: 'grapes', olivo: 'olive', piquillo: 'pepper', esparrago: 'asparagus', alcachofa: 'artichoke', cardo: 'cardo', tomate: 'tomato',
  trigo: 'wheat', patata: 'potato', manzana: 'apple', almendra: 'almond', pocha: 'beans', maiz: 'corn', corn: 'corn', milk: 'milk', herb: 'herb',
  buitre: 'vulture', trucha: 'trout', ciervo: 'deer', corzo: 'deer', jabali: 'boar', ardilla: 'squirrel', pajaro: 'bird', mariposa: 'butterfly', pez: 'fish',
  sorgina: 'sorgina', basajaun: 'basajaun', lamia: 'lamia',
};

// Icono para un nombre de especie o planta en castellano
export function speciesIcon(name = '') {
  const n = name.toLowerCase();
  const T = [['corzo', 'corzo'], ['ciervo', 'ciervo'], ['sarrio', 'goat'], ['zorro', 'zorro'], ['jabal', 'jabali'], ['vaca', 'cow'], ['oveja', 'sheep'], ['latxa', 'sheep'], ['rana', 'frog'], ['quebrantahuesos', 'quebrantahuesos'], ['buitre', 'buitre'], ['alimoche', 'buitre'],
    ['águila', 'aguila'], ['milano', 'milano'], ['cernícalo', 'eagle'], ['cigüeña', 'ciguena'], ['grulla', 'grulla'], ['garza', 'heron'], ['marmota', 'marmot'], ['conejo', 'rabbit'], ['sisón', 'bustard'], ['petirrojo', 'robin'], ['chova', 'bird'], ['trucha', 'trucha'], ['ardilla', 'ardilla'], ['pito', 'pito'], ['lechuza', 'lechuza'], ['pottoka', 'pottoka'],
    ['pino', 'pine'], ['abeto', 'pine'], ['tejo', 'pine'], ['enebro', 'pine'], ['olivo', 'olive'], ['helecho', 'leaf'], ['acebo', 'leaf'], ['boj', 'herbs'], ['brezo', 'herbs'], ['tojo', 'herbs'], ['romero', 'herbs'], ['tomillo', 'herbs'], ['lavanda', 'herbs'], ['arándano', 'grapes'], ['rododendro', 'flower'], ['cardo', 'eguzkilore'], ['ontina', 'herbs'], ['tamariz', 'herbs'], ['jara', 'flower']];
  for (const [k, v] of T) if (n.includes(k)) return v;
  return null;
}

// Cuerpo del icono (el estilo plano ya no necesita degradados ni sombra difusa)
export function withDefs(k) { return ICONS[k] || ICONS.star; }
// Cada SVG en línea lleva sus propios id de recorte: si se compartieran, un icono oculto
// (display:none) dejaría sin pintar a todos los que usan el mismo id.
let UID = 0;
const uniq = (svg) => { const u = (++UID).toString(36); return svg.replace(/(id="|url\(#)(cp\d+)/g, `$1$2_${u}`); };
const flats = new Map();
function flat(k) {
  if (!flats.has(k)) { const b = ICONS[k] || ICONS[ALIAS[k]]; flats.set(k, b ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128">${b}</svg>`) : ''); }
  return flats.get(k);
}
export function iconSVG(name, size = 32, cls = '') {
  const k = has3D(name) ? name : ICONS[name] ? name : ICONS[ALIAS[name]] ? ALIAS[name] : 'star';
  if (has3D(k)) {
    const u = icon3DReady(k); if (u) return `<img class="ico ico3d ${cls}" src="${u}" width="${size}" height="${size}" alt="" aria-hidden="true">`;
    // mientras se dibuja el 3D se ve su versión plana (si la hay)
    want3D(k); const f = flat(k);
    return `<img class="ico ico3d ${f ? '' : 'pend'} ${cls}" data-i3d="${k}" src="${f || BLANK}" width="${size}" height="${size}" alt="" aria-hidden="true">`;
  }
  (window.__svgIcons ||= new Set()).add(k);
  return `<svg class="ico ${cls}" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">${uniq(withDefs(k))}</svg>`;
}
// Imagen (para dibujar en canvas: mapas, minimapa)
const imgCache = new Map();
export function iconImage(name) {
  const k = ICONS[name] ? name : ALIAS[name] || 'star';
  if (!imgCache.has(k)) {
    const img = new Image();
    if (has3D(k)) { const u = icon3DReady(k); if (u) { img.src = u; imgCache.set(k, img); return img; } waiting.set(k, img); want3D(k); }
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128">${withDefs(ICONS[k] ? k : 'star')}</svg>`);
    imgCache.set(k, img);
  }
  return imgCache.get(k);
}
// (los iconos se generan cuando se necesitan; ya no se precargan todos al arrancar)
