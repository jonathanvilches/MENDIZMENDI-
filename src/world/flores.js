// Las flores de las macetas, las jardineras y los balcones: tarjetas con flores pintadas en Higgsfield
// (src/assets/texturas/flores.webp, con transparencia; TEX.flores en textures.js, que la cambia cuando llega). Antes eran
// bolas de veinte caras de un color, y se veían de plástico. El atlas, 3 × 2 casillas: geranio rojo, geranio rosa y petunia
// blanca arriba; petunia lila, tagete y gitanilla abajo. Las matas van de pie con la base abajo; la gitanilla, colgando.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const CELDAS = { rojo: 0, rosa: 1, blanco: 2, lila: 3, naranja: 4, cuelga: 5 };
const _c = new THREE.Color(), _h = {};
/** La casilla del atlas para un color de flor de los de siempre (#ff2d55, #ffd23f…). */
export function celda(col) {
  _c.set(col).getHSL(_h); const h = _h.h * 360;
  if (_h.s < 0.2) return CELDAS.blanco;
  if (h >= 255 && h < 320) return CELDAS.lila;
  if (h >= 18 && h < 75) return CELDAS.naranja;
  if (h >= 320 || h < 18) return _h.l > 0.66 || (h >= 320 && h < 345) ? CELDAS.rosa : CELDAS.rojo;
  return CELDAS.rojo;
}
/** El rectángulo de una casilla en coordenadas de textura (u0, v0, u1, v1; v hacia arriba). */
export function uvCelda(i) { const c = i % 3, r = Math.floor(i / 3); return [c / 3, 1 - (r + 1) / 2, (c + 1) / 3, 1 - r / 2]; }

/** Una tarjeta de w × h de pie, mirando a +z, centrada a lo ancho, con la base en y = 0 (colgando: con lo de arriba en 0). */
export function tarjeta(w, h, i, cuelga = false) {
  const g = new THREE.PlaneGeometry(w, h); g.translate(0, cuelga ? -h / 2 : h / 2, 0);
  const [u0, v0, u1, v1] = uvCelda(i), uv = g.attributes.uv;
  for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) * (u1 - u0), v0 + uv.getY(k) * (v1 - v0));
  return g;
}
/** Una mata con volumen: dos tarjetas cruzadas (la de delante mirando a +z), para las macetas que se ven de lado. */
export function mata(w, h, i) {
  const a = tarjeta(w, h, i), b = tarjeta(w * 0.86, h * 0.94, i); b.rotateY(1.15);
  const g = mergeGeometries([a, b]); a.dispose(); b.dispose(); return g;
}

/** El atlas de sustitución, dibujado aquí, por si la pintada no llega (sin conexión la primera vez): matas de hojas verdes
 *  con flores redondas del color de cada casilla, en un lienzo del mismo tamaño que la pintada (W × H). */
export function floresLienzo(W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), C = W / 3;
  let s = 13; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const COL = ['#c8323e', '#e98aa6', '#f1ece2', '#9d7ccf', '#e6922e', '#e07fa0'];
  for (let i = 0; i < 6; i++) {
    const x0 = (i % 3) * C, y0 = Math.floor(i / 3) * C, cuelga = i === CELDAS.cuelga;
    for (let k = 0; k < 70; k++) {
      const x = x0 + C * (0.12 + rnd() * 0.76), y = y0 + C * (cuelga ? rnd() * 0.9 : 0.25 + rnd() * 0.7), r = C * (0.04 + rnd() * 0.05);
      g.fillStyle = `hsl(${95 + rnd() * 25},${30 + rnd() * 15}%,${26 + rnd() * 18}%)`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    for (let k = 0; k < 26; k++) {
      const x = x0 + C * (0.16 + rnd() * 0.68), y = y0 + C * (cuelga ? 0.1 + rnd() * 0.75 : 0.22 + rnd() * 0.45), r = C * (0.03 + rnd() * 0.03);
      g.fillStyle = COL[i]; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
  }
  return c;
}

/** Las flores silvestres de los prados (nature.js, FlowerField), 3 × 2: margarita, botón de oro, amapola | lavanda, aciano,
 *  margarita. Las de sustitución, por si la pintada no llega: tallos y cabezuelas redondas de cada color. */
export function silvestresLienzo(W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), C = W / 3;
  let s = 29; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const COL = ['#f3efe6', '#e8c440', '#c9402f', '#9a7cc0', '#5a76c8', '#f3efe6'];
  for (let i = 0; i < 6; i++) {
    const x0 = (i % 3) * C, y0 = Math.floor(i / 3) * C;
    for (let k = 0; k < 6; k++) {
      const bx = x0 + C * (0.3 + rnd() * 0.4), tx = x0 + C * (0.15 + rnd() * 0.7), ty = y0 + C * (0.12 + rnd() * 0.4);
      g.strokeStyle = '#5a7a3a'; g.lineWidth = C * 0.015; g.beginPath(); g.moveTo(bx, y0 + C); g.quadraticCurveTo((bx + tx) / 2, y0 + C * 0.6, tx, ty); g.stroke();
      g.fillStyle = COL[i]; g.beginPath(); g.arc(tx, ty, C * 0.05, 0, 7); g.fill();
    }
  }
  return c;
}
