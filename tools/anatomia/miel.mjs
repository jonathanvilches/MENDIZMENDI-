// Lámina isométrica interactiva de la miel (skill Anatomy, 21 de noviembre de 2026; el autor: «la elaboración de diferentes
// alimentos [...] todo lo que tenga que ver con Navarra»). Un colmenar y su sala de extracción en maqueta, sobre su tablero:
// las flores con las abejas que van y vienen; la colmena de cuadros móviles con el alza abierta por delante (el panal se
// llena de miel y se tapa con cera); el ahumador; el banco de desopercular con el peine que quita la tapa de cera; el
// extractor de manivela, que hace girar los cuadros y despide la miel contra las paredes; el colador, el madurador y los
// tarros. Al recorrerlo se ve paso a paso y se ilumina la pieza que trabaja. La misma secuencia que el producto de la miel
// (data/procesos.js, honey).
// Uso: node tools/anatomia/miel.mjs [--light]  →  entrega/anatomia/miel(-light).html (y public/anatomia, para el juego)
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';
import * as G from '../../.claude/skills/anatomy/kit/lathe.mjs';
import { kitScript } from '../../.claude/skills/anatomy/scripts/inline-kit.mjs';
import { COLORES, enJuego, MARCA_JUEGO, escribe, PUENTE } from './comun.mjs';

const theme = process.argv.includes('--light') ? 'light' : 'dark';
const WIDTH = 600, HEIGHT = 250;

// ---------- el modelo (centímetros de la maqueta) ----------
const FLOR = { x: -134, y: -44, w: 24, d: 30 };
const COL = { x: -100, y: -40, w: 22, d: 18, z0: 5, cria: 10, alza: 7, techo: 2.6 };   // la colmena (la piquera mira a +x)
const Z1 = COL.z0 + COL.cria, Z2 = Z1 + COL.alza;                                         // arriba de la cámara de cría y del alza
const CUADRO = { x0: COL.x + 1.6, x1: COL.x + COL.w - 1.6, y: COL.y + COL.d - 2.4, z0: Z1 + 0.6, z1: Z2 - 0.6 };   // el cuadro de delante
const AHU = { x: -66, y: -14 };
const BANCO = { x: -58, y: -42, w: 26, d: 18, z: 9 };
const EXT = { x: -10, y: -30, r: 9, h: 18, z0: 3 };
const MAD = { x: 18, y: -34, r: 5.4, h: 17, z0: 5 };
const TARRO = {};   // (debajo del grifo del madurador: se calcula con la cámara)
const PASOS = ['Las flores', 'La colmena', 'El ahumador', 'Desopercular', 'El extractor', 'Madurar y envasar'];

// ---------- la cámara ----------
const PLATE = { x: -140, y: -50, w: 196, d: 52, r: 7 };
const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [COL.x + 11, COL.y + 9, Z2 + COL.techo + 1], [EXT.x, EXT.y, EXT.z0 + EXT.h + 9], [MAD.x, MAD.y, MAD.z0 + MAD.h + 2]], WIDTH, HEIGHT, { pad: 10, azimuth: 76, elevation: 30 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const dep = (p) => k.depthOf(p, P);
const linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L');
const poly = (pts) => linea(pts) + 'Z';
const FZ = (x, y, z = 0) => G.frameAlong([x, y, z], [0, 0, 1]);
const porDepth = (lista, f) => [...lista].sort((a, b) => dep(f(a)) - dep(f(b)));
const VIS = Math.atan2(dep([0, 1, 0]) - dep([0, 0, 0]), dep([1, 0, 0]) - dep([0, 0, 0]));
TARRO.x = MAD.x + Math.cos(VIS) * (MAD.r + 2.9); TARRO.y = MAD.y + Math.sin(VIS) * (MAD.r + 2.9);
const arcoDelante = (x, y, r, z, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const t = VIS - Math.PI / 2 + i / n * Math.PI; return [x + Math.cos(t) * r, y + Math.sin(t) * r, z]; });
const banda = (x, y, r, z0, z1) => poly([...arcoDelante(x, y, r, z0), ...arcoDelante(x, y, r, z1).reverse()]);
const R2x = (i) => (0.5 + i * 0.7548776662) % 1, R2y = (i) => (0.5 + i * 0.5698402910) % 1;
const rectY = (x0, x1, y, z0, z1) => [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]];

// ---------- el tablero ----------
function tablero() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -14, 12, P)}"/>`];
  for (const [x, y] of porDepth(k.corners(PLATE, 20), ([x, y]) => [x, y, 0])) {
    out.push(S(k.cylinder(x, y, 6.4, -14, 1.6, P, 28), { tone: 'lo' }));
    out.push(S(k.cylinder(x, y, 5, -12.4, 4.4, P, 28), { tone: 'mid' }));
  }
  out.push(S(k.slabOf(PLATE, -8, 8, P, 8, 1.6), { tone: 'mid' }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 4), 0, P), { tone: 'lo' }));
  const tornillos = k.corners(PLATE, 8.5);
  out.push(L(tornillos.map(([x, y]) => k.ring(x, y, 1.8, 0, P, 16)).join(''), { tone: 'lo' }));
  out.push(D(tornillos.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const regla = { x: -104, y: -5, w: 70, d: 5.5, r: 1 };
  out.push(S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
  const t = k.topTicks(regla.x + 3, regla.x + regla.w - 3, 2, 5, regla.y + 0.6, 0.6, [1.6, 3], P);
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
  out.push(D([at([regla.x + 1.5, regla.y + 2.8, 0.6]), at([regla.x + regla.w - 1.5, regla.y + 2.8, 0.6])], { size: 0.45 }));
  const placa = { x: -24, y: -6, w: 44, d: 7.5, r: 1.2 };
  out.push(S(k.slabOf(placa, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(placa, 1.1), 0.8, P, 4), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([placa.x + 5, placa.y + 4.4], 0.8, P, 'x'), 'MIEL DE AOIZ', { size: 2.4, tone: 'mid' }));
  out.push(D([at([placa.x + 2.2, placa.y + 3.75, 0.8]), at([placa.x + placa.w - 2.2, placa.y + 3.75, 0.8])], { size: 0.4 }));
  return out.join('');
}

// ---------- las flores: tallos, corolas y una mata en el pie de cada uno ----------
function flores() {
  const out = [], f = FLOR, flores = [];
  out.push(`<path class="prado" d="${poly([[f.x, f.y, 0.2], [f.x + f.w, f.y, 0.2], [f.x + f.w, f.y + f.d, 0.2], [f.x, f.y + f.d, 0.2]])}"/>`);
  for (let i = 0; i < 16; i++) flores.push([f.x + 2 + R2x(i) * (f.w - 4), f.y + 2 + R2y(i) * (f.d - 4), 4 + (i % 4) * 1.4, i % 3]);
  out.push(porDepth(flores, ([x, y]) => [x, y, 0]).map(([x, y, h, c]) => {
    const pie = [x, y, 0.2], cab = [x + 0.4, y - 0.3, h], q = at(cab);
    const mata = [[x - 1.3, y, 0.2], [x - 0.3, y - 0.3, 1.8], [x, y - 1, 0.2], [x + 0.4, y - 0.2, 2.1], [x + 1.3, y + 0.2, 0.2], [x, y + 0.9, 0.2]];
    return L(linea([pie, cab]), { tone: 'mid', className: 'tallo' }) + `<path class="hoja" d="${poly(mata)}"/>` + `<circle class="corola c${c}" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="1.25"/><circle class="boton" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r=".45"/>`;
  }).join(''));
  return `<g data-part="flores">${out.join('')}</g>`;
}

// ---------- la colmena de cuadros móviles: soporte, piquera, cámara de cría, alza abierta y techo ----------
function colmena() {
  const { x, y, w, d, z0 } = COL, out = [];
  for (const [px, py] of porDepth([[x + 1, y + 1], [x + w - 3, y + 1], [x + 1, y + d - 3], [x + w - 3, y + d - 3]], ([a, b]) => [a, b, 0])) out.push(S(k.slabOf({ x: px, y: py, w: 2, d: 2, r: 0.2 }, 0, z0 - 1.4, P, 1), { tone: 'lo', className: 'madera' }));
  out.push(S(k.slabOf({ x: x - 1, y: y - 0.6, w: w + 4, d: d + 1.2, r: 0.3 }, z0 - 1.4, 1.4, P, 1, 0.2), { tone: 'mid', className: 'madera' }));   // el fondo, con la piquera delante
  out.push(S(k.slabOf({ x, y, w, d, r: 0.4 }, z0, COL.cria, P, 1, 0.3), { tone: 'mid', className: 'caja' }));
  out.push(L(k.sideSeam({ x, y, w, d, r: 0.4 }, z0 + COL.cria / 2, P, 1), { tone: 'lo' }));
  // la piquera: la rendija de la tabla de vuelo, en la cara de +x
  out.push(`<path class="hueco" d="${poly([[x + w + 0.02, y + 4, z0 + 0.2], [x + w + 0.02, y + d - 4, z0 + 0.2], [x + w + 0.02, y + d - 4, z0 + 1.2], [x + w + 0.02, y + 4, z0 + 1.2]])}"/>`);
  out.push(L(poly([[x + w + 0.02, y + 4, z0 + 0.2], [x + w + 0.02, y + d - 4, z0 + 0.2], [x + w + 0.02, y + d - 4, z0 + 1.2], [x + w + 0.02, y + 4, z0 + 1.2]]), { tone: 'mid' }));
  // el alza, abierta por delante: el fondo y los dos costados, los cuadros de atrás y el de delante con su panal
  out.push(S(k.slabOf({ x, y, w, d: 1.2, r: 0.2 }, Z1, COL.alza, P, 1), { tone: 'lo', className: 'caja' }));
  out.push(S(k.slabOf({ x, y, w: 1.2, d, r: 0.2 }, Z1, COL.alza, P, 1), { tone: 'lo', className: 'caja' }));
  for (let i = 0; i < 6; i++) { const yy = y + 2.2 + i * 2.1; out.push(`<path class="panal-atras" d="${poly(rectY(CUADRO.x0, CUADRO.x1, yy, CUADRO.z0, CUADRO.z1))}"/>` + L(linea([[CUADRO.x0 - 0.6, yy, CUADRO.z1 + 0.3], [CUADRO.x1 + 0.6, yy, CUADRO.z1 + 0.3]]), { tone: 'mid', className: 'cabezal' })); }
  out.push(`<g data-part="cuadro-sube">${cuadroSvg(CUADRO.y, 'cuadro')}</g>`);
  out.push(S(k.slabOf({ x: x + w - 1.2, y, w: 1.2, d, r: 0.2 }, Z1, COL.alza, P, 1), { tone: 'mid', className: 'caja' }));
  out.push(S(k.slabOf({ x: x - 1.2, y: y - 1.2, w: w + 2.4, d: d + 2.4, r: 0.4 }, Z2, COL.techo, P, 1, 0.3), { tone: 'mid', className: 'techo' }));
  out.push(L(k.sideSeam({ x: x - 1.2, y: y - 1.2, w: w + 2.4, d: d + 2.4, r: 0.4 }, Z2 + 1, P, 1), { tone: 'lo' }));
  out.push(`<g data-part="abejas-col"></g>`);
  return `<g data-part="colmena">${out.join('')}</g>`;
}
// un cuadro: el marco de madera y el panal de cera, con la miel que lo llena desde arriba y los opérculos (vivos)
function cuadroSvg(y, id) {
  const c = CUADRO, m = 0.7, out = [];
  out.push(`<path class="cera" d="${poly(rectY(c.x0 + m, c.x1 - m, y, c.z0 + m, c.z1 - m))}"/>`);
  out.push(`<path data-part="${id}-miel" class="miel" d=""/><path data-part="${id}-tapa" class="opercul" d=""/>`);
  let celdas = ''; for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) { const q = at([c.x0 + m + 1 + i * (c.x1 - c.x0 - 2 * m - 2) / 8 + (j % 2) * 0.55, y + 0.02, c.z0 + m + 1 + j * 1.5]); celdas += `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r=".32"/>`; }
  out.push(`<g class="celdas">${celdas}</g>`);
  out.push(`<path class="madera-f" d="${poly(rectY(c.x0, c.x1, y, c.z0, c.z1))} ${poly(rectY(c.x0 + m, c.x1 - m, y, c.z0 + m, c.z1 - m))}" fill-rule="evenodd"/>`);
  out.push(L(poly(rectY(c.x0, c.x1, y, c.z0, c.z1)) + poly(rectY(c.x0 + m, c.x1 - m, y, c.z0 + m, c.z1 - m)), { tone: 'mid' }));
  out.push(L(linea([[c.x0 - 0.8, y, c.z1], [c.x1 + 0.8, y, c.z1]]), { tone: 'mid', className: 'cabezal' }));   // el cabezal, con sus orejas
  return out.join('');
}

// ---------- el ahumador: el bote, la tapa con su pico y el fuelle ----------
function ahumador() {
  const { x, y } = AHU, out = [];
  out.push(S(k.slabOf({ x: x + 3.2, y: y - 2.4, w: 1.2, d: 4.8, r: 0.3 }, 0.6, 7, P, 1), { tone: 'lo', className: 'madera' }));
  out.push(S(k.slabOf({ x: x + 5.2, y: y - 2.4, w: 1.2, d: 4.8, r: 0.3 }, 0.6, 7, P, 1), { tone: 'mid', className: 'madera' }));
  out.push(L(linea([[x + 4.4, y - 2.2, 1.2], [x + 5.2, y - 2.2, 4.4], [x + 4.4, y - 2.2, 7.4]]), { tone: 'mid', className: 'fuelle' }), D([at([x + 4.4, y - 2.2, 1.2]), at([x + 4.4, y - 2.2, 7.4])], { size: 0.5, tone: 'mid' }));
  out.push(S(G.solidOf([[0, 2.6], [8, 2.6]], FZ(x, y), P), { tone: 'mid', className: 'chapa' }));
  out.push(L(k.pathOf(arcoDelante(x, y, 2.6, 2).map(at)) + k.pathOf(arcoDelante(x, y, 2.6, 6.2).map(at)), { tone: 'lo' }));
  out.push(S(G.solidOf([[8, 2.7], [10.2, 1.4], [11, 0.8]], FZ(x, y), P), { tone: 'mid', className: 'chapa' }));
  out.push(S(G.solidOf([[0, 0.55], [2, 0.4]], G.frameAlong([x - 0.2, y + 0.2, 10.6], [-0.7, 0.3, 0.6]), P), { tone: 'mid' }));
  out.push(`<g data-part="humo"></g>`);
  return `<g data-part="ahumador">${out.join('')}</g>`;
}

// ---------- el banco de desopercular: la bandeja, el cuadro en su soporte y el peine (vivo) ----------
const CB = { x0: BANCO.x + 4, x1: BANCO.x + BANCO.w - 4, y: BANCO.y + 9, z0: BANCO.z + 3.2 };   // el cuadro que se desopercula
function banco() {
  const b = BANCO, out = [];
  for (const [px, py] of porDepth([[b.x + 1, b.y + 1], [b.x + b.w - 3, b.y + 1], [b.x + 1, b.y + b.d - 3], [b.x + b.w - 3, b.y + b.d - 3]], ([p, q]) => [p, q, 0])) out.push(S(k.slabOf({ x: px, y: py, w: 2, d: 2, r: 0.3 }, 0, b.z, P, 1), { tone: 'mid', className: 'acero' }));
  out.push(S(k.slabOf({ x: b.x, y: b.y, w: b.w, d: b.d, r: 0.6 }, b.z, 3, P, 2, 0.3), { tone: 'mid', className: 'acero' }));
  const fondo = [[b.x + 1, b.y + 1, b.z + 3], [b.x + b.w - 1, b.y + 1, b.z + 3], [b.x + b.w - 1, b.y + b.d - 1, b.z + 3], [b.x + 1, b.y + b.d - 1, b.z + 3]];
  out.push(`<path class="hueco" d="${poly(fondo)}"/>`, L(poly(fondo), { tone: 'mid' }), `<path data-part="opercul-monton" class="opercul" d=""/>`);
  // el soporte del cuadro: dos pies y el travesaño
  for (const px of [CB.x0 - 1.2, CB.x1 + 0.2]) out.push(S(k.slabOf({ x: px, y: CB.y - 0.5, w: 1, d: 1, r: 0.1 }, b.z + 3, CB.z0 - b.z - 3 + 0.2, P, 1), { tone: 'mid', className: 'acero' }));
  const c = { ...CUADRO, x0: CB.x0, x1: CB.x1, z0: CB.z0, z1: CB.z0 + (CUADRO.z1 - CUADRO.z0) }, m = 0.7;
  out.push(`<path class="cera" d="${poly(rectY(c.x0 + m, c.x1 - m, CB.y, c.z0 + m, c.z1 - m))}"/><path class="miel" d="${poly(rectY(c.x0 + m, c.x1 - m, CB.y, c.z0 + m, c.z1 - m))}"/>`);
  out.push(`<path data-part="banco-tapa" class="opercul" d=""/>`);
  out.push(`<path class="madera-f" d="${poly(rectY(c.x0, c.x1, CB.y, c.z0, c.z1))} ${poly(rectY(c.x0 + m, c.x1 - m, CB.y, c.z0 + m, c.z1 - m))}" fill-rule="evenodd"/>`);
  out.push(L(poly(rectY(c.x0, c.x1, CB.y, c.z0, c.z1)) + poly(rectY(c.x0 + m, c.x1 - m, CB.y, c.z0 + m, c.z1 - m)), { tone: 'mid' }));
  out.push(`<g data-part="peine"><path data-part="peine-l" class="iso-line peine" data-tone="mid" d=""/><path data-part="pua" class="iso-line" data-tone="mid" d=""/><g class="iso-dots" data-tone="mid"><circle data-part="peine-a" r="0.6"/><circle data-part="peine-b" r="1.1"/></g></g><g data-part="caen-cera"></g>`);
  return `<g data-part="banco">${out.join('')}</g>`;
}

// ---------- el extractor: el bidón, la cesta con tres cuadros que gira (viva), la manivela y el grifo ----------
function extractor() {
  const { x, y, r, h, z0 } = EXT, out = [], zt = z0 + h;
  for (const a of [VIS - 2.1, VIS + 2.1, VIS + Math.PI]) out.push(S(k.slabOf({ x: x + Math.cos(a) * (r - 1.2) - 0.8, y: y + Math.sin(a) * (r - 1.2) - 0.8, w: 1.6, d: 1.6, r: 0.2 }, 0, z0 + 1, P, 1), { tone: 'mid', className: 'acero' }));
  out.push(S(G.solidOf([[0, r - 1.4], [1.4, r], [h, r]], FZ(x, y, z0), P), { tone: 'mid', className: 'acero' }));
  out.push(L(k.pathOf(arcoDelante(x, y, r, z0 + 6).map(at)) + k.pathOf(arcoDelante(x, y, r, z0 + 12).map(at)), { tone: 'lo' }));
  out.push(`<path class="hueco" d="${k.ring(x, y, r - 0.6, zt, P, 48)}"/>`);
  // una ventana en el bidón, por delante, para ver la cesta que gira dentro
  const v0 = VIS - 0.75, v1 = VIS + 0.75, arco = (z) => Array.from({ length: 13 }, (_, i) => { const t = v0 + i / 12 * (v1 - v0); return [x + Math.cos(t) * (r + 0.02), y + Math.sin(t) * (r + 0.02), z]; });
  const ven = poly([...arco(z0 + 3.5), ...arco(zt - 2.6).reverse()]);
  out.push(`<path class="hueco" d="${ven}"/><clipPath id="ventana-ext"><path d="${ven}"/></clipPath><g clip-path="url(#ventana-ext)"><g data-part="cesta"></g></g>`, L(ven, { tone: 'mid' }));
  out.push(S(G.ringBand(0, 0.8, r - 0.5, r + 0.3, FZ(x, y, zt - 0.6), P), { tone: 'mid', className: 'acero' }));   // el borde enrollado (un anillo: deja ver la cesta)
  out.push(`<g data-part="cesta-arriba"></g>`);
  // el puente de arriba, la caja de engranajes y la manivela (viva)
  out.push(S(k.slabOf({ x: x - 1.2, y: y - r - 0.6, w: 2.4, d: 2 * r + 1.2, r: 0.3 }, zt + 0.2, 1.4, P, 1), { tone: 'mid', className: 'acero' }));
  out.push(S(k.slabOf({ x: x - 2.4, y: y - 2.4, w: 4.8, d: 4.8, r: 0.6 }, zt + 1.6, 3.2, P, 2, 0.3), { tone: 'mid', className: 'maquina' }));
  out.push(`<g data-part="manivela"><path data-part="brazo" class="iso-line manivela" data-tone="mid" d=""/><g class="iso-dots" data-tone="mid"><circle data-part="eje-man" r="0.8"/><circle data-part="pomo-man" r="1.2"/></g></g>`);
  // el grifo de abajo, el colador y el cubo
  const g = [x + Math.cos(VIS) * r, y + Math.sin(VIS) * r, z0 + 2];
  out.push(S(G.solidOf([[0, 0.7], [2.2, 0.7]], G.frameAlong(g, [Math.cos(VIS), Math.sin(VIS), 0]), P), { tone: 'mid' }));
  const cubo = [g[0] + Math.cos(VIS) * 3.4, g[1] + Math.sin(VIS) * 3.4];
  out.push(S(G.solidOf([[0, 2.4], [0.4, 2.6], [z0 - 0.4, 3]], FZ(cubo[0], cubo[1]), P), { tone: 'mid', className: 'chapa' }));
  out.push(`<path class="hueco" d="${k.ring(cubo[0], cubo[1], 2.7, z0 - 0.4, P, 28)}"/>`, `<path data-part="miel-cubo" class="miel" d="${k.ring(cubo[0], cubo[1], 2.4, z0 - 1.1, P, 28)}" style="opacity:.2"/>`);
  out.push(L(k.ring(cubo[0], cubo[1], 2.7, z0 - 0.4, P, 28), { tone: 'mid' }), `<path class="iso-line colador" data-tone="lo" d="${k.ring(cubo[0], cubo[1], 2.2, z0 - 0.2, P, 28)}"/>`);
  out.push(`<path data-part="chorro-ext" class="miel" d=""/>`);
  return `<g data-part="extractor">${out.join('')}</g>`;
}
const GRIFO = [EXT.x + Math.cos(VIS) * (EXT.r + 2.2), EXT.y + Math.sin(VIS) * (EXT.r + 2.2), EXT.z0 + 1.6];
const CUBO = [EXT.x + Math.cos(VIS) * (EXT.r + 3.4), EXT.y + Math.sin(VIS) * (EXT.r + 3.4)];

// ---------- el madurador, el grifo y el tarro que se llena; los tarros acabados ----------
function madurador() {
  const { x, y, r, h, z0 } = MAD, out = [];
  for (const a of [VIS - 2.1, VIS + 2.1, VIS + Math.PI]) out.push(S(k.cylinder(x + Math.cos(a) * (r - 1.4), y + Math.sin(a) * (r - 1.4), 0.6, 0, z0, P, 10), { tone: 'mid' }));
  out.push(S(G.solidOf([[0, r - 1.6], [1.2, r], [h, r]], FZ(x, y, z0), P), { tone: 'mid', className: 'acero' }));
  out.push(L(k.pathOf(arcoDelante(x, y, r, z0 + 6).map(at)) + k.pathOf(arcoDelante(x, y, r, z0 + 12).map(at)), { tone: 'lo' }));
  out.push(S(G.solidOf([[0, r + 0.3], [0.8, r + 0.3], [2.2, 1.6]], FZ(x, y, z0 + h), P), { tone: 'mid', className: 'acero' }));
  out.push(S(k.cylinder(x, y, 1, z0 + h + 2.2, 1, P, 14), { tone: 'mid' }));
  const n = [Math.cos(VIS), Math.sin(VIS), 0], g = [x + n[0] * r, y + n[1] * r, z0 + 1.6];
  out.push(S(G.solidOf([[0, 0.6], [2, 0.6]], G.frameAlong(g, n), P), { tone: 'mid' }), D([at([g[0] + n[0] * 1.4, g[1] + n[1] * 1.4, z0 + 2.7])], { size: 0.7, tone: 'mid' }));
  out.push(`<path data-part="chorro-mad" class="miel" d=""/>`);
  return `<g data-part="madurador">${out.join('')}</g>`;
}
const PERFIL_TARRO = [[0, 2.2], [0.3, 2.4], [4.4, 2.4], [5, 1.9], [5.6, 1.9]];
function tarro(x, y, lleno, id) {
  const F = FZ(x, y), out = [];
  out.push(S(G.solidOf(PERFIL_TARRO, F, P), { tone: 'mid', className: 'vidrio' }));
  if (id) out.push(`<clipPath id="${id}-clip"><path data-part="${id}-nivel" d=""/></clipPath><g clip-path="url(#${id}-clip)">${S(G.solidOf([[0.3, 2.15], [4.3, 2.15]], F, P), { tone: 'mid', crease: 'none', className: 'miel-s' })}</g>`);
  else if (lleno) out.push(S(G.solidOf([[0.3, 2.15], [4.3, 2.15]], F, P), { tone: 'mid', crease: 'none', className: 'miel-s' }));
  if (!id) out.push(`<path class="etiqueta" d="${banda(x, y, 2.45, 1.4, 3.4)}"/>`, L(k.pathOf(arcoDelante(x, y, 2.45, 1.4).map(at)) + k.pathOf(arcoDelante(x, y, 2.45, 3.4).map(at)), { tone: 'mid' }));
  out.push(S(k.cylinder(x, y, 2.05, 5.6, 1, P, 24), { tone: 'mid', className: 'tapa' }));
  return out.join('');
}

// ---------- la figura ----------
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'Maqueta de un colmenar y su sala de extracción: las flores con las abejas; la colmena de cuadros móviles con el alza abierta, donde el panal se llena de miel y se tapa con cera; el ahumador; el banco de desopercular con el peine; el extractor de manivela con su cesta de cuadros, el grifo y el colador; el madurador y los tarros.',
  body: [
    tablero(),
    flores(), colmena(), ahumador(),
    banco(),
    extractor(),
    madurador(),
    `<g data-part="tarros">${tarro(TARRO.x, TARRO.y, false, 'tarro')}${tarro(36, -26, true)}${tarro(42, -18, true)}</g>`,
    `<g data-part="abejas"></g>`,
  ],
});

// ---------- lo que se mueve en la página ----------
const live = MARCA_JUEGO + `
const P = ${JSON.stringify(P)}, FLOR = ${JSON.stringify(FLOR)}, COL = ${JSON.stringify(COL)}, CUADRO = ${JSON.stringify(CUADRO)}, Z1 = ${Z1}, Z2 = ${Z2}, AHU = ${JSON.stringify(AHU)};
const CB = ${JSON.stringify(CB)}, BANCO = ${JSON.stringify(BANCO)}, EXT = ${JSON.stringify(EXT)}, GRIFO = ${JSON.stringify(GRIFO)}, CUBO = ${JSON.stringify(CUBO)}, MAD = ${JSON.stringify(MAD)}, TARRO = ${JSON.stringify(TARRO)}, VIS = ${VIS};
const PASOS = ${JSON.stringify(PASOS)}, N = PASOS.length;
const at = (p) => iso(p, P), linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L'), poly = (pts) => linea(pts) + 'Z';
const dep = (p) => depthOf(p, P), K = Math.hypot(at([0, 0, 1])[0] - at([0, 0, 0])[0], at([0, 0, 1])[1] - at([0, 0, 0])[1]);
const stage = document.querySelector('.iso-stage'), svgEl = stage.querySelector('svg'), $ = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const el = { abejas: $('abejas'), abejasCol: $('abejas-col'), miel: $('cuadro-miel'), tapa: $('cuadro-tapa'), sube: $('cuadro-sube'), humo: $('humo'), bancoTapa: $('banco-tapa'), monton: $('opercul-monton'),
  peineL: $('peine-l'), pua: $('pua'), peineA: $('peine-a'), peineB: $('peine-b'), caenCera: $('caen-cera'), cesta: $('cesta'), brazo: $('brazo'), ejeMan: $('eje-man'), pomoMan: $('pomo-man'),
  chorroExt: $('chorro-ext'), mielCubo: $('miel-cubo'), chorroMad: $('chorro-mad'), nivelTarro: $('tarro-nivel'),
  flores: $('flores'), colmena: $('colmena'), ahumador: $('ahumador'), banco: $('banco'), extractor: $('extractor'), madurador: $('madurador'), tarros: $('tarros') };
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const ilumina = (lista, on) => { for (const n of [].concat(lista)) if (n && on !== n.hasAttribute('data-lit')) n.toggleAttribute('data-lit', on); };
const setDot = (c, p) => { const q = at(p); c.setAttribute('cx', q[0].toFixed(1)); c.setAttribute('cy', q[1].toFixed(1)); };
const rectY = (x0, x1, y, z0, z1) => [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]];
// una abeja: el cuerpo a rayas y las dos alas que baten
function abeja(p, t, ang) {
  const q = at(p), a = Math.sin(t * 60) * 0.5 + 0.5, c = Math.cos(ang), s = Math.sin(ang);
  return '<g transform="translate(' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ') rotate(' + (ang * 57.3).toFixed(0) + ')"><ellipse class="ala" cx="-0.2" cy="' + (-0.7 - a * 0.3).toFixed(2) + '" rx="0.75" ry="' + (0.35 + a * 0.2).toFixed(2) + '"/><ellipse class="abeja" rx="1" ry="0.6"/><path class="raya" d="M-0.2 -0.55V0.55M0.35 -0.5V0.5"/></g>';
}
let s = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, txt = '', reloj = 0, gX = 0, vX = 0;
const tourAt = (t) => { const T = 2.8 * N + 2, f = (t % T) / T * (N + 0.71); const i = Math.floor(f); return Math.min(N - 0.001, i + sm((f - i) / 0.6) * 0.999); };
const piquera = [COL.x + COL.w + 2, COL.y + COL.d / 2, COL.z0 + 0.8];
function draw(dt) {
  reloj += dt;
  const paso = Math.min(N - 1, Math.floor(s));
  // las abejas van de las flores a la piquera y vuelven (más en el primer paso)
  const vuelan = s < 2 ? 8 : 3; let ab = '';
  for (let i = 0; i < vuelan; i++) {
    const f = (reloj * 0.18 + i / vuelan) % 1, ida = f < 0.5, u = ida ? f * 2 : (1 - f) * 2;
    const flor = [FLOR.x + 3 + ((0.5 + i * 0.7548776662) % 1) * (FLOR.w - 6), FLOR.y + 3 + ((0.5 + i * 0.5698402910) % 1) * (FLOR.d - 6), 6];
    const p = [flor[0] + (piquera[0] - flor[0]) * u, flor[1] + (piquera[1] - flor[1]) * u + Math.sin(u * 6 + i) * 2, flor[2] + (piquera[2] - flor[2]) * u + Math.sin(u * Math.PI) * 9];
    const a0 = at(flor), a1 = at(piquera), ang = Math.atan2(a1[1] - a0[1], a1[0] - a0[0]) + (ida ? 0 : Math.PI);
    ab += abeja(p, reloj + i, ang);
  }
  el.abejas.innerHTML = ab;
  // la colmena: el panal se llena de miel desde arriba y, madura, se tapa con cera
  const llena = sm((s - 0.6) / 1.2), tapa = sm((s - 1.5) / 0.4), m = 0.7, zt = CUADRO.z1 - m, zb = CUADRO.z0 + m, zm = zt - (zt - zb) * llena;
  el.miel.setAttribute('d', llena > 0.01 ? poly(rectY(CUADRO.x0 + m, CUADRO.x1 - m, CUADRO.y + 0.01, zm, zt)) : '');
  el.tapa.setAttribute('d', tapa > 0.01 ? poly(rectY(CUADRO.x0 + m, CUADRO.x1 - m, CUADRO.y + 0.02, zt - (zt - zb) * 0.75 * tapa, zt)) : '');
  // el ahumador echa humo y el cuadro sube del alza
  let hu = ''; if (s > 1.8 && s < 3.2) for (let i = 0; i < 4; i++) { const f = (reloj * 0.6 + i / 4) % 1, c = at([AHU.x - 1.6 - f * 7, AHU.y + 0.8 - f * 6, 11 + f * 6]), r = (0.8 + f * 2.4) * K * 0.4; hu += '<ellipse class="humo" style="opacity:' + ((1 - f) * 0.6).toFixed(2) + '" cx="' + c[0].toFixed(1) + '" cy="' + c[1].toFixed(1) + '" rx="' + (r * 1.3).toFixed(1) + '" ry="' + r.toFixed(1) + '"/>'; }
  el.humo.innerHTML = hu;
  const sube = sm((s - 2.15) / 0.5) * (1 - sm((s - 3.05) / 0.3)), dz = at([0, 0, 9 * sube])[1] - at([0, 0, 0])[1];
  el.sube.setAttribute('transform', sube > 0.001 ? 'translate(0 ' + dz.toFixed(2) + ')' : '');
  // desopercular: el peine baja raspando la tapa de cera, que cae a la bandeja
  const raspa = sm((s - 3.05) / 0.8), c0 = CB.z0 + m, c1 = CB.z0 + (CUADRO.z1 - CUADRO.z0) - m, zr = c1 - (c1 - c0) * raspa;
  el.bancoTapa.setAttribute('d', raspa < 0.99 ? poly(rectY(CB.x0 + m, CB.x1 - m, CB.y + 0.02, c0, zr)) : '');
  const yp = CB.y + 0.6, xp = (CB.x0 + CB.x1) / 2 + Math.sin(reloj * 7) * (s > 3 && s < 4 ? 3 : 0);
  const pa = [xp - 3.4, yp, zr], pb = [xp + 3.4, yp, zr], mango = [xp + 3.4 + 4.2, yp + 1.6, zr + 2.2];
  el.peineL.setAttribute('d', linea([pa, pb, mango])); setDot(el.peineA, pa); setDot(el.peineB, mango);
  let puas = ''; for (let i = 0; i <= 6; i++) { const x = pa[0] + i * 6.8 / 6; puas += linea([[x, yp, zr], [x, yp - 0.5, zr - 0.8]]); } el.pua.setAttribute('d', puas);
  let ce = ''; if (s > 3.05 && s < 4) for (let i = 0; i < 5; i++) { const f = (reloj * 1.3 + i / 5) % 1, p = at([pa[0] + i * 1.6, yp + 0.4 + f * 3, zr - (zr - BANCO.z - 3.2) * f]); ce += '<circle class="opercul" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r=".55"/>'; }
  el.caenCera.innerHTML = ce;
  const mo = sm((s - 3.15) / 0.8), mx = BANCO.x + 6, my = BANCO.y + BANCO.d - 5, mr = 1 + mo * 2.6;
  el.monton.setAttribute('d', mo > 0.02 ? poly(Array.from({ length: 16 }, (_, i) => { const t = i / 16 * Math.PI * 2; return [mx + Math.cos(t) * mr * 1.4, my + Math.sin(t) * mr * 0.8, BANCO.z + 3.15]; })) : '');
  // el extractor: la manivela hace girar la cesta; la miel sale por el grifo al colador y al cubo
  vX += ((s > 4 && s < 5.1 ? 7 : 0) - vX) * (1 - Math.exp(-dt / 0.6)); gX += vX * dt;
  const ztop = EXT.z0 + EXT.h; let ce2 = '';
  const marcos = [0, 1, 2].map((i) => { const a = gX + i * Math.PI * 2 / 3, d = [Math.cos(a), Math.sin(a)], u = [-Math.sin(a), Math.cos(a)], cx = EXT.x + d[0] * 4.4, cy = EXT.y + d[1] * 4.4;
    const q = [[cx - u[0] * 3, cy - u[1] * 3, EXT.z0 + 3], [cx + u[0] * 3, cy + u[1] * 3, EXT.z0 + 3], [cx + u[0] * 3, cy + u[1] * 3, ztop - 1.5], [cx - u[0] * 3, cy - u[1] * 3, ztop - 1.5]];
    const vacia = sm((s - 4.3) / 0.7), zm = q[0][2] + (q[2][2] - q[0][2]) * (1 - vacia);   // (la miel sale del panal al girar)
    return [dep([cx, cy, ztop]), '<path class="cera" d="' + poly(q) + '"/>' + (vacia < 0.99 ? '<path class="miel" style="opacity:.8" d="' + poly([q[0], q[1], [q[1][0], q[1][1], zm], [q[0][0], q[0][1], zm]]) + '"/>' : '') + '<path class="iso-line" data-tone="mid" d="' + poly(q) + '"/>']; });
  marcos.sort((p, q) => p[0] - q[0]);
  // (el árbol de la cesta va detrás o delante de cada cuadro, según dónde esté el cuadro)
  const dE = dep([EXT.x, EXT.y, ztop]), eje = '<path class="iso-line eje-ext" data-tone="mid" d="' + linea([[EXT.x, EXT.y, EXT.z0 + 1], [EXT.x, EXT.y, ztop + 0.4]]) + '"/>';
  let sal = ''; if (vX > 1) for (let i = 0; i < 6; i++) { const a = gX * 0.7 + i * 1.05, f = (reloj * 2 + i / 6) % 1, rr = 4.4 + f * 3.8, p = at([EXT.x + Math.cos(a) * rr, EXT.y + Math.sin(a) * rr, ztop - 4 - i % 3 * 2]); sal += '<circle class="miel" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r=".5"/>'; }
  el.cesta.innerHTML = marcos.filter((q) => q[0] < dE).map((q) => q[1]).join('') + eje + marcos.filter((q) => q[0] >= dE).map((q) => q[1]).join('') + sal;
  const ej = [EXT.x, EXT.y + 2.4, ztop + 3.2], am = gX * 0.5, pm = [ej[0] + Math.cos(am) * 4, ej[1] + 0.4, ej[2] + Math.sin(am) * 4];
  el.brazo.setAttribute('d', linea([ej, pm])); setDot(el.ejeMan, ej); setDot(el.pomoMan, pm);
  const sale = sm((s - 4.25) / 0.25) * (1 - sm((s - 5.3) / 0.3));
  const A = at(GRIFO), B = at([CUBO[0], CUBO[1], EXT.z0 - 0.6]), w = 0.4 * K * sale;
  el.chorroExt.setAttribute('d', sale > 0.02 ? 'M' + (A[0] - w).toFixed(1) + ' ' + A[1].toFixed(1) + 'L' + (B[0] - w * 0.7).toFixed(1) + ' ' + B[1].toFixed(1) + 'L' + (B[0] + w * 0.7).toFixed(1) + ' ' + B[1].toFixed(1) + 'L' + (A[0] + w).toFixed(1) + ' ' + A[1].toFixed(1) + 'Z' : '');
  el.mielCubo.style.opacity = (0.2 + 0.8 * sm((s - 4.3) / 0.6)).toFixed(2);
  // el madurador: la miel reposa y se envasa en el tarro
  const env = sm((s - 5.1) / 0.6), n = [Math.cos(VIS), Math.sin(VIS)], gm = [MAD.x + n[0] * (MAD.r + 2), MAD.y + n[1] * (MAD.r + 2), MAD.z0 + 1.4];
  const A2 = at(gm), B2 = at([TARRO.x, TARRO.y, 0.6 + 4 * env]), w2 = 0.35 * K * (s > 5.05 && env < 0.98 ? 1 : 0);
  el.chorroMad.setAttribute('d', w2 > 0 ? 'M' + (A2[0] - w2).toFixed(1) + ' ' + A2[1].toFixed(1) + 'L' + (B2[0] - w2 * 0.7).toFixed(1) + ' ' + B2[1].toFixed(1) + 'L' + (B2[0] + w2 * 0.7).toFixed(1) + ' ' + B2[1].toFixed(1) + 'L' + (A2[0] + w2).toFixed(1) + ' ' + A2[1].toFixed(1) + 'Z' : '');
  const q0 = at([TARRO.x, TARRO.y, 0.3 + 4 * env]);
  el.nivelTarro.setAttribute('d', 'M' + (q0[0] - 30).toFixed(1) + ' ' + q0[1].toFixed(1) + 'L' + (q0[0] + 30).toFixed(1) + ' ' + q0[1].toFixed(1) + 'L' + (q0[0] + 30).toFixed(1) + ' ' + (q0[1] + 40).toFixed(1) + 'L' + (q0[0] - 30).toFixed(1) + ' ' + (q0[1] + 40).toFixed(1) + 'Z');
  // lo que trabaja en cada paso
  ilumina(el.flores, paso === 0); ilumina(el.colmena, paso === 1); ilumina(el.ahumador, paso === 2); ilumina(el.banco, paso === 3); ilumina(el.extractor, paso === 4); ilumina([el.madurador, el.tarros], paso === 5);
  const extra = ['las abejas liban el néctar', 'en las celdillas de cera', 'el humo calma a las abejas', 'fuera la tapa de cera', 'al girar, la miel sale despedida', 'reposa, se cuela y se envasa'][paso];
  const text = (paso + 1) + ' · ' + PASOS[paso] + ' · ' + extra;
  if (text !== txt) { readout.textContent = text; stage.setAttribute('aria-valuetext', text); txt = text; }
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
  if (touring) { clock += dt; target = tourAt(clock); }
  s = still.matches ? target : s + (target - s) * (1 - Math.exp(-dt / 0.3));
  if (Math.abs(target - s) < 0.002) s = target;
  draw(dt);
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (to) => { touring = false; target = clamp(to, 0, N - 0.001); clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 5000); run(); };
new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: '120px 0px' }).observe(stage);
stage.addEventListener('pointermove', (e) => { const b = svgEl.getBoundingClientRect(); steer(clamp((e.clientX - b.left) / b.width, 0, 1) * N); });
stage.addEventListener('pointerdown', (e) => { const b = svgEl.getBoundingClientRect(); steer(clamp((e.clientX - b.left) / b.width, 0, 1) * N); });
stage.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); steer(Math.floor(target) + 1.6); } if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); steer(Math.floor(target) - 0.4); } });
draw(0);
${PUENTE}
`;

const tonos = (pre, cls, [f, s0, s1, s2, s3, t]) => `${pre}.${cls}>.iso-fill{fill:${f}}${pre}.${cls}>.iso-top{fill:${t}}${pre}.${cls}[data-seamless]>.iso-top{stroke:${t}}` +
  [s0, s1, s2, s3].map((c, i) => `${pre}.${cls}>.iso-shade[data-shade="${i}"]{fill:${c}}${pre}.${cls}[data-seamless]>.iso-shade[data-shade="${i}"]{stroke:${c}}`).join('');
const COLOR = {
  dark: { 'miel-s': ['#c88a1c', '#7a4e0c', '#9a6410', '#b47816', '#cc8c1e', '#e4a42a'], caja: ['#3e2a3a', '#24161f', '#2e1d29', '#382433', '#42303d', '#4e3a48'], techo: ['#3a3048', '#221c2c', '#2a2236', '#342a40', '#3e344c', '#4a3e58'] },
  light: { 'miel-s': ['#e0a030', '#b07418', '#c2861e', '#d29626', '#e2a632', '#f2ba44'], caja: ['#e8d8c8', '#c6b2a0', '#d2bea8', '#dcc8b4', '#e6d4c2', '#f0e2d2'], techo: ['#e2dcec', '#bcb4cc', '#cac2d8', '#d4cce2', '#ded8ea', '#ece8f4'] },
};
const colores = Object.entries(COLOR).map(([th, m]) => Object.entries(m).map(([cls, v]) => tonos(th === 'light' ? '.iso[data-theme="light"] ' : '', cls, v)).join('')).join('');
const CSS = COLORES + enJuego(WIDTH, HEIGHT) + `
.iso{--miel:#e0a020;--cera:#5a4a28;--opercul:#e8d9a8;--hueco:#0d0718;--madera:#3a2440;--madera-f:#5a3c2c;--prado:#1e3424;--hoja:#3f6b34;--chapa:#2a1d44;--humo:#cbbfe0;--abeja:#f0b82a;--ala:#e8e0ff;--etiqueta:#c08a1c;--vidrio:#22283a;--c0:#c47ad8;--c1:#f2d04a;--c2:#f2eef8}
.iso[data-theme="light"]{--miel:#e8a82a;--cera:#e8d6a0;--opercul:#fff4d0;--hueco:#8c7a86;--madera:#e7d9cf;--madera-f:#c49a74;--prado:#d6e8cc;--hoja:#6e9e52;--chapa:#f1edf7;--humo:#8a7aa8;--abeja:#e0a020;--ala:#ffffff;--etiqueta:#d89a2a;--vidrio:#eef2f8;--c0:#a64cc0;--c1:#e0b020;--c2:#ffffff}
.miel{fill:var(--miel)}.cera{fill:var(--cera)}.opercul{fill:var(--opercul)}.hueco{fill:var(--hueco)}.madera-f{fill:var(--madera-f)}.prado{fill:var(--prado)}.hoja{fill:var(--hoja)}.humo{fill:var(--humo)}
.panal-atras{fill:var(--cera);opacity:.75}.abeja{fill:var(--abeja)}.ala{fill:var(--ala);opacity:.7}.raya{stroke:#1a0f14;stroke-width:.35;fill:none}.etiqueta{fill:var(--etiqueta)}
.corola.c0{fill:var(--c0)}.corola.c1{fill:var(--c1)}.corola.c2{fill:var(--c2)}.boton{fill:var(--miel)}.celdas circle{fill:var(--anatomy-faint)}
.tallo{stroke-width:.8}.cabezal{stroke-width:1.2}.peine{stroke-width:1.1}.manivela{stroke-width:1.2}.eje-ext{stroke-width:1.2}.fuelle{stroke-width:.9}
.madera>.iso-fill,.madera>.iso-top{fill:var(--madera)}.vidrio>.iso-fill,.vidrio>.iso-top{fill:var(--vidrio)}.chapa>.iso-fill,.chapa>.iso-top{fill:var(--chapa)}
[data-lit] .iso-edge,[data-lit].iso-line,[data-lit] .iso-line,[data-lit] .tb-edge{stroke:var(--anatomy-lit)}
[data-lit] .iso-top,[data-lit].iso-top{fill:var(--anatomy-lit-top)}
[data-lit] .iso-dots circle{fill:var(--anatomy-lit)}
` + colores;

const body = k.plateHtml({
  fig: 'Lámina 8',
  title: 'Cómo se hace la miel',
  hint: 'Pasa el ratón: paso a paso',
  readout: '1 · Las flores',
  keys: [
    { mark: 'lit', label: 'La pieza que trabaja en cada paso: las flores, la colmena, el ahumador, el banco, el extractor y el madurador' },
    { mark: 'raised', label: 'En el extractor los cuadros giran deprisa y la miel sale despedida contra las paredes' },
    { mark: 'flat', label: 'Los cuadros vacíos vuelven a la colmena: las abejas no pierden su casa' },
  ],
  caption: 'Las abejas liban el néctar de las flores y lo guardan en las celdillas de cera del panal, donde se convierte en miel; cuando está madura, la tapan con una capa de cera, el opérculo. El apicultor calma a las abejas con el humo del ahumador, saca los cuadros de la colmena y les quita esa tapa con un peine. En el extractor, los cuadros giran deprisa y la miel sale despedida contra las paredes; después se cuela, reposa en el madurador para que suban las burbujas y los restos de cera, y se envasa. Los cuadros vacíos vuelven a la colmena.',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="La miel, paso a paso: las flechas pasan de un paso a otro" aria-valuemin="1" aria-valuemax="6">${svg}</div>`,
});

const html = k.pageHtml({ title: 'Cómo se hace la miel', theme, body, script: kitScript() + live }).replace('</style>', CSS + '</style>');
escribe('miel', html, theme);
