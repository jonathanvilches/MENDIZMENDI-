// Lámina isométrica interactiva de la txistorra (skill Anatomy, 21 de noviembre de 2026; el autor: «la elaboración de
// diferentes alimentos [...] todo lo que tenga que ver con Navarra»). Un obrador en maqueta, sobre su tablero: la tabla con
// la carne de cerdo y el tocino; la picadora de manivela atornillada al banco; el barreño del adobo con el pimentón, el ajo
// y la sal; la embutidora de pistón que llena la tripa fina; el secadero donde se orea colgada, y el hornillo con la sartén.
// Al recorrerlo se ve paso a paso y se ilumina la pieza que trabaja. La misma secuencia que el producto de la txistorra
// (data/procesos.js, chistorra).
// Uso: node tools/anatomia/txistorra.mjs [--light]  →  entrega/anatomia/txistorra(-light).html (y public/anatomia, para el juego)
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';
import * as G from '../../.claude/skills/anatomy/kit/lathe.mjs';
import { kitScript } from '../../.claude/skills/anatomy/scripts/inline-kit.mjs';
import { COLORES, enJuego, MARCA_JUEGO, escribe, PUENTE } from './comun.mjs';

const theme = process.argv.includes('--light') ? 'light' : 'dark';
const WIDTH = 600, HEIGHT = 250;

// ---------- el modelo (centímetros de la maqueta) ----------
const TABLA = { x: -130, y: -40, w: 20, d: 14 };
const BANCO = { x: -104, y: -44, w: 26, d: 18, z: 8 };
const PIC = { x: -96, y: -36, z: BANCO.z + 1.2 + 5.2, r: 2.8, L: 12 };   // la picadora: el cuerpo a lo largo de x
const BARR = { x: -60, y: -30, r: 8, h: 6 };
const EMB = { x: -28, y: -38, r: 4.6, h: 16, z0: 4 };
const BAND = { x: -24, y: -28, w: 24, d: 18 };
const SECA = { x: 8, y: -46, w: 24, d: 10, h: 24 };
const SART = { x: 38, y: -20 };
const PASOS = ['La carne', 'Picar', 'Adobar', 'Embutir', 'Orear', 'A la sartén'];

// ---------- la cámara ----------
const PLATE = { x: -136, y: -52, w: 186, d: 54, r: 7 };
const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [EMB.x, EMB.y, EMB.z0 + EMB.h + 7], [SECA.x + 12, SECA.y + 5, SECA.h + 2], [PIC.x, PIC.y, PIC.z + 9]], WIDTH, HEIGHT, { pad: 10, azimuth: 76, elevation: 30 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const dep = (p) => k.depthOf(p, P);
const linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L');
const poly = (pts) => linea(pts) + 'Z';
const FZ = (x, y, z = 0) => G.frameAlong([x, y, z], [0, 0, 1]);
const FX = (x, y, z) => G.frameAlong([x, y, z], [1, 0, 0]);
const porDepth = (lista, f) => [...lista].sort((a, b) => dep(f(a)) - dep(f(b)));
const VIS = Math.atan2(dep([0, 1, 0]) - dep([0, 0, 0]), dep([1, 0, 0]) - dep([0, 0, 0]));
const arcoDelante = (x, y, r, z, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const t = VIS - Math.PI / 2 + i / n * Math.PI; return [x + Math.cos(t) * r, y + Math.sin(t) * r, z]; });
const seam = (x, y, r, z) => k.pathOf(arcoDelante(x, y, r, z).map(at));
const R2x = (i) => (0.5 + i * 0.7548776662) % 1, R2y = (i) => (0.5 + i * 0.5698402910) % 1;
// una txistorra: un trazo grueso rojo con su borde oscuro (no es una raya de la figura: es la tripa llena)
const KZ = Math.hypot(k.iso([0, 0, 1], P)[0] - k.iso([0, 0, 0], P)[0], k.iso([0, 0, 1], P)[1] - k.iso([0, 0, 0], P)[1]);   // (cuánto mide en pantalla un centímetro de alto)
const txis = (pts, w = 1.5) => { const d = linea(pts), g = w * KZ * 0.9; return `<path class="txis-borde" style="stroke-width:${(g + 0.8).toFixed(2)}" d="${d}"/><path class="txis" style="stroke-width:${g.toFixed(2)}" d="${d}"/>`; };

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
  const regla = { x: -110, y: -6, w: 64, d: 5.5, r: 1 };
  out.push(S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
  const t = k.topTicks(regla.x + 3, regla.x + regla.w - 3, 2, 5, regla.y + 0.6, 0.6, [1.6, 3], P);
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
  out.push(D([at([regla.x + 1.5, regla.y + 2.8, 0.6]), at([regla.x + regla.w - 1.5, regla.y + 2.8, 0.6])], { size: 0.45 }));
  const placa = { x: -34, y: -8, w: 46, d: 7.5, r: 1.2 };
  out.push(S(k.slabOf(placa, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(placa, 1.1), 0.8, P, 4), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([placa.x + 5, placa.y + 4.4], 0.8, P, 'x'), 'TXISTORRA', { size: 2.4, tone: 'mid' }));
  out.push(D([at([placa.x + 2.2, placa.y + 3.75, 0.8]), at([placa.x + placa.w - 2.2, placa.y + 3.75, 0.8])], { size: 0.4 }));
  return out.join('');
}

// ---------- la tabla con la carne y el tocino ----------
function tabla() {
  const t = TABLA, out = [];
  out.push(S(k.slabOf({ x: t.x, y: t.y, w: t.w, d: t.d, r: 1 }, 0, 1.4, P, 2, 0.3), { tone: 'mid', className: 'madera' }));
  const trozos = Array.from({ length: 10 }, (_, i) => [t.x + 3 + R2x(i) * (t.w - 6), t.y + 3 + R2y(i) * (t.d - 6), i % 3 === 0]);
  out.push(porDepth(trozos, ([x, y]) => [x, y, 0]).map(([x, y, toc]) => S(k.slabOf({ x: x - 1.3, y: y - 1.1, w: 2.6, d: 2.2, r: 0.5 }, 1.4, toc ? 1.4 : 1.8, P, 2, 0.4), { tone: 'mid', className: toc ? 'tocino' : 'magro' })).join(''));
  // el cuchillo
  const a = [t.x + 2, t.y + t.d + 2, 0.4], c = [t.x + 10, t.y + t.d + 3.2, 0.4], m = [t.x + 15, t.y + t.d + 4, 0.4];
  out.push(L(linea([a, c]), { tone: 'mid', className: 'hoja-c' }), L(linea([c, m]), { tone: 'mid', className: 'mango' }), D([at(a), at(c), at(m)], { size: 0.5, tone: 'mid' }));
  return `<g data-part="tabla">${out.join('')}</g>`;
}

// ---------- el banco y la picadora de manivela (viva: gira y sale la carne picada) ----------
function picadora() {
  const b = BANCO, p = PIC, out = [];
  for (const [px, py] of porDepth([[b.x + 1, b.y + 1], [b.x + b.w - 3, b.y + 1], [b.x + 1, b.y + b.d - 3], [b.x + b.w - 3, b.y + b.d - 3]], ([q, r]) => [q, r, 0])) out.push(S(k.slabOf({ x: px, y: py, w: 2, d: 2, r: 0.3 }, 0, b.z, P, 1), { tone: 'mid', className: 'madera' }));
  out.push(S(k.slabOf({ x: b.x, y: b.y, w: b.w, d: b.d, r: 0.6 }, b.z, 1.2, P, 2, 0.3), { tone: 'mid', className: 'madera' }));
  const zb = b.z + 1.2;
  // el pie de la picadora, atornillado al banco
  out.push(S(k.slabOf({ x: p.x + 1, y: p.y - 2, w: 6, d: 4, r: 0.6 }, zb, 0.8, P, 2), { tone: 'mid', className: 'hierro' }));
  out.push(S(k.slabOf({ x: p.x + 3, y: p.y - 1, w: 2, d: 2, r: 0.4 }, zb + 0.8, p.z - p.r - zb - 0.6, P, 1), { tone: 'mid', className: 'hierro' }));
  out.push(D([at([p.x + 1.8, p.y - 1.2, zb + 0.8]), at([p.x + 6.2, p.y + 1.2, zb + 0.8])], { size: 0.5, tone: 'mid' }));
  // el cuerpo, la boca de la tolva y la placa de agujeros
  out.push(S(G.solidOf([[0, p.r - 0.4], [0.6, p.r], [p.L - 1, p.r], [p.L, p.r + 0.5], [p.L + 1, p.r + 0.5]], FX(p.x, p.y, p.z), P), { tone: 'mid', className: 'hierro' }));
  out.push(S(G.solidOf([[0, 1.6], [2, 2.4], [4.6, 4.2]], FZ(p.x + 5, p.y, p.z + p.r - 0.6), P), { tone: 'mid', className: 'hierro' }));
  out.push(`<path class="hueco" d="${k.ring(p.x + 5, p.y, 3.9, p.z + p.r + 4, P, 28)}"/>`);
  out.push(Array.from({ length: 5 }, (_, i) => [p.x + 5 + (R2x(i) - 0.5) * 4, p.y + (R2y(i) - 0.5) * 4, p.z + p.r + 3.6]).map((q, i) => S(k.slabOf({ x: q[0] - 0.9, y: q[1] - 0.8, w: 1.8, d: 1.6, r: 0.4 }, q[2] - 0.6, 1.1, P, 1, 0.3), { tone: 'mid', className: i % 3 ? 'magro' : 'tocino' })).join(''));
  out.push(L(k.ring(p.x + 5, p.y, 3.9, p.z + p.r + 4, P, 28), { tone: 'mid' }));
  const Fd = FX(p.x + p.L + 1, p.y, p.z);
  out.push(L(G.circleOf(Fd, 0, p.r + 0.1, P), { tone: 'mid' }), D(Array.from({ length: 7 }, (_, i) => { const a = i / 7 * Math.PI * 2; return at([p.x + p.L + 1.02, p.y + Math.cos(a) * 1.6, p.z + Math.sin(a) * 1.6]); }).concat([at([p.x + p.L + 1.02, p.y, p.z])]), { size: 0.35, tone: 'lo' }));
  // el cuenco donde cae la carne picada
  out.push(S(G.solidOf([[0, 2.6], [0.4, 3], [2.6, 4]], FZ(p.x + p.L + 3, p.y, zb), P), { tone: 'mid', className: 'loza' }));
  out.push(`<path class="hueco" d="${k.ring(p.x + p.L + 3, p.y, 3.7, zb + 2.6, P, 28)}"/>`, `<path data-part="picado" class="picado" d="${k.ring(p.x + p.L + 3, p.y, 3.2, zb + 1.4, P, 28)}" style="opacity:.2"/>`, L(k.ring(p.x + p.L + 3, p.y, 3.7, zb + 2.6, P, 28), { tone: 'mid' }));
  out.push(`<g data-part="hebras"></g>`);
  out.push(`<g data-part="manivela"><path data-part="man-l" class="iso-line manivela" data-tone="mid" d=""/><g class="iso-dots" data-tone="mid"><circle data-part="man-eje" r="0.8"/><circle data-part="man-pomo" r="1.3"/></g></g>`);
  return `<g data-part="picadora">${out.join('')}</g>`;
}

// ---------- el barreño del adobo, con el pimentón, el ajo y la sal, y la pala (viva) ----------
function adobo() {
  const { x, y, r, h } = BARR, out = [];
  out.push(S(G.solidOf([[0, r - 2.4], [0.6, r - 1.8], [h, r]], FZ(x, y), P), { tone: 'mid', className: 'barro' }));
  out.push(L(seam(x, y, r - 0.6, h - 1.4), { tone: 'lo' }));
  out.push(`<path class="hueco" d="${k.ring(x, y, r - 0.5, h, P, 40)}"/>`, `<path data-part="masa" class="masa" d="${k.ring(x, y, r - 1, h - 1.6, P, 40)}"/>`, `<g data-part="motas"></g>`, `<g data-part="pala"></g>`);
  out.push(L(k.ring(x, y, r - 0.5, h, P, 40), { tone: 'mid' }));
  // los tres cuencos: pimentón, ajo y sal
  [['pimenton', x + 10, y + 12], ['ajo', x + 16, y + 9], ['sal', x + 13, y + 3]].forEach(([c, cx, cy]) => {
    out.push(S(G.solidOf([[0, 1.4], [0.3, 1.7], [1.6, 2.3]], FZ(cx, cy), P), { tone: 'mid', className: 'loza' }));
    out.push(`<path class="${c}" d="${k.ring(cx, cy, 1.9, 1.5, P, 20)}"/>`, L(k.ring(cx, cy, 2.1, 1.6, P, 20), { tone: 'mid' }));
  });
  return `<g data-part="adobo">${out.join('')}</g>`;
}

// ---------- la embutidora de pistón y la bandeja donde sale la txistorra (viva) ----------
const BOQ = { x0: EMB.x + EMB.r, x1: EMB.x + EMB.r + 7, y: EMB.y + 2, z: EMB.z0 + 2 };   // la boquilla, hacia +x
function embutidora() {
  const { x, y, r, h, z0 } = EMB, out = [];
  for (const a of [VIS - 2.1, VIS + 2.1, VIS + Math.PI].sort((p, q) => dep([Math.cos(p), Math.sin(p), 0]) - dep([Math.cos(q), Math.sin(q), 0]))) out.push(S(k.cylinder(x + Math.cos(a) * (r - 0.8), y + Math.sin(a) * (r - 0.8), 0.6, 0, z0, P, 10), { tone: 'mid', className: 'hierro' }));
  out.push(S(G.solidOf([[0, r - 1], [0.8, r], [h, r]], FZ(x, y, z0), P), { tone: 'mid', className: 'acero' }));
  out.push(L(seam(x, y, r, z0 + 5) + seam(x, y, r, z0 + 11), { tone: 'lo' }));
  // la boquilla, que sale por abajo; la tripa se mete en ella
  out.push(S(G.solidOf([[0, 1.2], [3, 1], [7, 0.55]], FX(BOQ.x0, BOQ.y, BOQ.z), P), { tone: 'mid', className: 'acero' }));
  // la tapa, la caja de engranajes y la cremallera (viva) con la manivela
  out.push(S(k.cylinder(x, y, r + 0.4, z0 + h, 1, P, 32, 0.3), { tone: 'mid', className: 'acero' }));
  out.push(S(k.slabOf({ x: x - 2.2, y: y - 2.2, w: 4.4, d: 4.4, r: 0.5 }, z0 + h + 1, 3, P, 2, 0.3), { tone: 'mid', className: 'hierro' }));
  out.push(`<path data-part="cremallera" class="iso-line cremallera" data-tone="mid" d=""/><g data-part="man-emb"><path data-part="me-l" class="iso-line manivela" data-tone="mid" d=""/><g class="iso-dots" data-tone="mid"><circle data-part="crem-tope" r="1"/><circle data-part="me-eje" r="0.8"/><circle data-part="me-pomo" r="1.3"/></g></g>`);
  return `<g data-part="embutidora">${out.join('')}</g>`;
}
function bandeja() {
  const b = BAND, out = [];
  out.push(S(k.slabOf({ x: b.x, y: b.y, w: b.w, d: b.d, r: 0.8 }, 0, 1.2, P, 2, 0.3), { tone: 'mid', className: 'acero' }));
  out.push(`<path class="hueco" d="${poly([[b.x + 1, b.y + 1, 1.2], [b.x + b.w - 1, b.y + 1, 1.2], [b.x + b.w - 1, b.y + b.d - 1, 1.2], [b.x + 1, b.y + b.d - 1, 1.2]])}"/>`);
  out.push(L(poly([[b.x + 1, b.y + 1, 1.2], [b.x + b.w - 1, b.y + 1, 1.2], [b.x + b.w - 1, b.y + b.d - 1, 1.2], [b.x + 1, b.y + b.d - 1, 1.2]]), { tone: 'mid' }));
  out.push(`<g data-part="ristra"></g>`);
  return `<g data-part="bandeja">${out.join('')}</g>`;
}
// la espiral de la ristra en la bandeja (la misma que se va llenando en la página)
const ESPIRAL = (() => { const c = [BAND.x + BAND.w / 2 + 1, BAND.y + BAND.d / 2], pts = [[BOQ.x1, BOQ.y, BOQ.z], [BOQ.x1 + 2, BOQ.y + 3, 1.9]]; for (let i = 0; i <= 90; i++) { const t = i / 90, a = Math.PI * 0.9 - t * Math.PI * 2 * 2.3, r = 7.6 - t * 6.4; pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r * 0.9, 1.9]); } return pts; })();

// ---------- el secadero: dos postes, las varas y las ristras colgadas ----------
function secadero() {
  const s = SECA, out = [];
  for (const [px, py] of porDepth([[s.x, s.y], [s.x + s.w - 1.4, s.y], [s.x, s.y + s.d - 1.4], [s.x + s.w - 1.4, s.y + s.d - 1.4]], ([q, r]) => [q, r, 0])) out.push(S(k.slabOf({ x: px, y: py, w: 1.4, d: 1.4, r: 0.2 }, 0, s.h, P, 1), { tone: 'mid', className: 'madera' }));
  const colgadas = [];
  for (const yy of [s.y + 2.6, s.y + s.d - 2.6]) {
    for (let i = 0; i < 5; i++) { const x = s.x + 3 + i * 4.4, top = s.h - 1.4, baja = 9 + (i % 2) * 2.5; colgadas.push([dep([x, yy, top]), txis([[x - 1.2, yy, top], [x - 1.4, yy, top - baja * 0.6], [x - 0.6, yy, top - baja], [x + 0.6, yy, top - baja], [x + 1.4, yy, top - baja * 0.6], [x + 1.2, yy, top]], 1.2)]); }
    colgadas.push([dep([s.x, yy, s.h]) + 0.01, S(G.solidOf([[0, 0.55], [s.w + 2, 0.55]], FX(s.x - 1, yy, s.h - 1.2), P), { tone: 'mid', className: 'madera' })]);
  }
  out.push(`<g data-part="colgadas">${colgadas.sort((a, b) => a[0] - b[0]).map((c) => c[1]).join('')}</g>`);
  return `<g data-part="secadero">${out.join('')}</g>`;
}

// ---------- el hornillo con la sartén y el bocadillo ----------
function sarten() {
  const { x, y } = SART, out = [];
  out.push(S(k.slabOf({ x: x - 5, y: y - 5, w: 10, d: 10, r: 1 }, 0, 3, P, 2, 0.4), { tone: 'mid', className: 'hierro' }));
  out.push(L(k.ring(x, y, 2.6, 3, P, 24), { tone: 'mid' }), `<g data-part="llamas"></g>`);
  for (const a of [0.4, 2.5, 4.6]) out.push(S(k.slabOf({ x: x + Math.cos(a) * 3.6 - 0.4, y: y + Math.sin(a) * 3.6 - 0.4, w: 0.8, d: 0.8, r: 0.1 }, 3, 1.2, P, 1), { tone: 'mid', className: 'hierro' }));
  // la sartén, el mango y las txistorras friéndose (vivas: chisporrotean)
  const am = VIS - Math.PI * 0.55, m0 = [x + Math.cos(am) * 5.6, y + Math.sin(am) * 5.6], m1 = [x + Math.cos(am) * 12, y + Math.sin(am) * 12];
  out.push(L(linea([[m0[0], m0[1], 5], [m1[0], m1[1], 5.6]]), { tone: 'mid', className: 'mango' }), D([at([m1[0], m1[1], 5.6])], { size: 0.8, tone: 'mid' }));
  out.push(S(G.solidOf([[0, 4], [0.3, 4.6], [1.6, 5.8]], FZ(x, y, 4.2), P), { tone: 'mid', className: 'hierro' }));
  out.push(`<path class="aceite" d="${k.ring(x, y, 5, 4.9, P, 32)}"/>`);
  out.push([[x - 2, y - 1.4, -0.4], [x + 1.6, y - 1.8, 0.5], [x - 0.4, y + 1.8, 0.2]].map(([px, py, a]) => txis([[px - Math.cos(a) * 1.6, py - Math.sin(a) * 1.6, 5.1], [px, py + 0.4, 5.15], [px + Math.cos(a) * 1.6, py + Math.sin(a) * 1.6, 5.1]], 1.3)).join(''));
  out.push(L(k.ring(x, y, 5.8, 5.8, P, 32), { tone: 'mid' }), `<g data-part="chisporroteo"></g>`);
  // el bocadillo
  const pan = [x + 8, y + 8, 1.4];
  out.push(S(G.solidOf([[0, 0.6], [1.2, 1.4], [8, 1.5], [9.4, 0.7]], G.frameAlong([pan[0] - 4.7, pan[1] - 1, pan[2]], [1, 0.2, 0]), P), { tone: 'mid', className: 'pan' }));
  out.push(txis([[pan[0] - 3.6, pan[1] - 0.6, pan[2] + 1.2], [pan[0] + 3.6, pan[1] + 0.8, pan[2] + 1.2]], 1.1));
  return `<g data-part="sarten">${out.join('')}</g>`;
}

// ---------- la figura ----------
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'Maqueta de un obrador de txistorra: la tabla con la carne de cerdo y el tocino; la picadora de manivela atornillada al banco, con su tolva y la placa de agujeros; el barreño del adobo con el pimentón, el ajo y la sal; la embutidora de pistón con su manivela y la boquilla, y la bandeja donde sale la ristra; el secadero con las txistorras colgadas, y el hornillo con la sartén y un bocadillo.',
  body: [
    tablero(),
    tabla(), picadora(), adobo(), embutidora(), bandeja(), secadero(), sarten(),
  ],
});

// ---------- lo que se mueve en la página ----------
const live = MARCA_JUEGO + `
const P = ${JSON.stringify(P)}, PIC = ${JSON.stringify(PIC)}, BANCO = ${JSON.stringify(BANCO)}, BARR = ${JSON.stringify(BARR)}, EMB = ${JSON.stringify(EMB)}, BOQ = ${JSON.stringify(BOQ)}, ESPIRAL = ${JSON.stringify(ESPIRAL)}, SART = ${JSON.stringify(SART)};
const PASOS = ${JSON.stringify(PASOS)}, N = PASOS.length;
const at = (p) => iso(p, P), linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L'), poly = (pts) => linea(pts) + 'Z';
const dep = (p) => depthOf(p, P), K = Math.hypot(at([0, 0, 1])[0] - at([0, 0, 0])[0], at([0, 0, 1])[1] - at([0, 0, 0])[1]);
const stage = document.querySelector('.iso-stage'), svgEl = stage.querySelector('svg'), $ = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const el = { picado: $('picado'), hebras: $('hebras'), manL: $('man-l'), manEje: $('man-eje'), manPomo: $('man-pomo'), masa: $('masa'), motas: $('motas'), pala: $('pala'), crem: $('cremallera'), cremTope: $('crem-tope'), meL: $('me-l'), meEje: $('me-eje'), mePomo: $('me-pomo'),
  ristra: $('ristra'), colgadas: $('colgadas'), llamas: $('llamas'), chis: $('chisporroteo'),
  tabla: $('tabla'), picadora: $('picadora'), adobo: $('adobo'), embutidora: $('embutidora'), bandeja: $('bandeja'), secadero: $('secadero'), sarten: $('sarten') };
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const ilumina = (lista, on) => { for (const n of [].concat(lista)) if (n && on !== n.hasAttribute('data-lit')) n.toggleAttribute('data-lit', on); };
const setDot = (c, p) => { const q = at(p); c.setAttribute('cx', q[0].toFixed(1)); c.setAttribute('cy', q[1].toFixed(1)); };
const txis = (pts, w) => { const d = linea(pts), g = w * K * 0.9; return '<path class="txis-borde" style="stroke-width:' + (g + 0.8).toFixed(2) + '" d="' + d + '"/><path class="txis" style="stroke-width:' + g.toFixed(2) + '" d="' + d + '"/>'; };
let s = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, txt = '', reloj = 0, gP = 0, vP = 0, gE = 0, vE = 0, gA = 0;
const tourAt = (t) => { const T = 2.8 * N + 2, f = (t % T) / T * (N + 0.71); const i = Math.floor(f); return Math.min(N - 0.001, i + sm((f - i) / 0.6) * 0.999); };
function draw(dt) {
  reloj += dt;
  const paso = Math.min(N - 1, Math.floor(s));
  // picar: la manivela gira, sale la carne picada en hebras por la placa y se junta en el cuenco
  vP += ((s > 1 && s < 2.2 ? 4 : 0) - vP) * (1 - Math.exp(-dt / 0.5)); gP += vP * dt;
  const ce = [PIC.x - 0.6, PIC.y, PIC.z], pm = [ce[0] - 0.4, ce[1] + Math.cos(gP) * 5, ce[2] + Math.sin(gP) * 5];
  el.manL.setAttribute('d', linea([ce, pm])); setDot(el.manEje, ce); setDot(el.manPomo, pm);
  let hb = ''; if (vP > 1) for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, o = [PIC.x + PIC.L + 1.1, PIC.y + Math.cos(a) * 1.4, PIC.z + Math.sin(a) * 1.4], f = (reloj * 1.5 + i / 6) % 1; hb += '<path class="hebra" d="' + linea([o, [o[0] + 1 + f * 1.2, o[1], o[2] - 0.4 - f * 2.6]]) + '"/>'; }
  el.hebras.innerHTML = hb;
  el.picado.style.opacity = (0.2 + 0.8 * sm((s - 1.1) / 0.8)).toFixed(2);
  // adobar: la pala remueve y la masa pasa del rosa al rojo del pimentón
  if (s > 2 && s < 3.1) gA += dt * 2.4;
  const rojo = sm((s - 2.1) / 0.8); el.masa.style.setProperty('--rojo', rojo.toFixed(2));
  let mo = ''; for (let i = 0; i < 18; i++) { const a = R(i) * Math.PI * 2 + gA * (0.4 + R(i + 7) * 0.4), r = 1 + R(i + 3) * (BARR.r - 2.6), q = at([BARR.x + Math.cos(a) * r, BARR.y + Math.sin(a) * r, BARR.h - 1.55]); mo += '<circle class="' + (i % 3 ? 'pimenton' : 'ajo') + '" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r=".42" style="opacity:' + (i % 3 ? (0.4 + 0.6 * (1 - rojo)).toFixed(2) : '0.9') + '"/>'; }
  el.motas.innerHTML = mo;
  const ap = [BARR.x + Math.cos(gA) * 3, BARR.y + Math.sin(gA) * 3, BARR.h - 1.4], mp = [BARR.x + Math.cos(gA) * 5 + 2, BARR.y + Math.sin(gA) * 5 + 3, BARR.h + 9];
  el.pala.innerHTML = '<path class="iso-line pala" data-tone="mid" d="' + linea([ap, mp]) + '"/><g class="iso-dots" data-tone="mid"><circle cx="' + at(mp)[0].toFixed(1) + '" cy="' + at(mp)[1].toFixed(1) + '" r="1"/><circle cx="' + at(ap)[0].toFixed(1) + '" cy="' + at(ap)[1].toFixed(1) + '" r=".7"/></g>';
  // embutir: la manivela baja el pistón por la cremallera y la tripa se llena, en espiral, en la bandeja
  vE += ((s > 3 && s < 4.2 ? 3 : 0) - vE) * (1 - Math.exp(-dt / 0.5)); gE += vE * dt;
  const llena = sm((s - 3.05) / 0.9), zt = EMB.z0 + EMB.h + 4, zc = zt + 8 - llena * 7;
  el.crem.setAttribute('d', linea([[EMB.x, EMB.y, zt - 0.2], [EMB.x, EMB.y, zc]])); setDot(el.cremTope, [EMB.x, EMB.y, zc]);
  const me = [EMB.x + 2.2, EMB.y, EMB.z0 + EMB.h + 2.5], mq = [me[0] + 0.3, me[1] + Math.cos(gE) * 4, me[2] + Math.sin(gE) * 4];
  el.meL.setAttribute('d', linea([me, mq])); setDot(el.meEje, me); setDot(el.mePomo, mq);
  const n = Math.max(2, Math.round(ESPIRAL.length * llena));
  el.ristra.innerHTML = llena > 0.01 ? txis(ESPIRAL.slice(0, n), 1.4) : '';
  // orear: las colgadas se oscurecen un poco
  el.colgadas.style.setProperty('--oreo', sm((s - 4.1) / 0.8).toFixed(2));
  // a la sartén: fuego y chisporroteo
  const fr = sm((s - 5) / 0.3); let ll = '';
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, B = at([SART.x + Math.cos(a) * 2.6, SART.y + Math.sin(a) * 2.6, 3.05]), h = (0.6 + fr * (1.4 + 0.5 * Math.sin(reloj * 12 + i))) * K, w = 0.45 * K; ll += '<path class="llama" d="M' + (B[0] - w).toFixed(1) + ' ' + B[1].toFixed(1) + 'Q' + B[0].toFixed(1) + ' ' + (B[1] - h * 1.4).toFixed(1) + ' ' + (B[0] + w).toFixed(1) + ' ' + B[1].toFixed(1) + 'Z"/>'; }
  el.llamas.innerHTML = ll;
  let ch = ''; if (fr > 0.2) for (let i = 0; i < 7; i++) { const f = (reloj * 1.8 + i / 7) % 1, a = i * 2.3, q = at([SART.x + Math.cos(a) * 3, SART.y + Math.sin(a) * 3, 5.2 + f * 3]); ch += '<circle class="gota-aceite" style="opacity:' + (1 - f).toFixed(2) + '" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r=".35"/>'; }
  el.chis.innerHTML = ch;
  // lo que trabaja en cada paso
  ilumina(el.tabla, paso === 0); ilumina(el.picadora, paso === 1); ilumina(el.adobo, paso === 2); ilumina([el.embutidora, el.bandeja], paso === 3); ilumina(el.secadero, paso === 4); ilumina(el.sarten, paso === 5);
  const extra = ['magro y tocino de cerdo', 'por la placa de agujeros', 'sal, ajo y pimentón', 'en una tripa fina', 'unos días, colgada', 'frita o en bocadillo'][paso];
  const text = (paso + 1) + ' · ' + PASOS[paso] + ' · ' + extra;
  if (text !== txt) { readout.textContent = text; stage.setAttribute('aria-valuetext', text); txt = text; }
}
function R(i) { return (0.5 + i * 0.7548776662) % 1; }
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
  dark: { magro: ['#c8505a', '#7a2a34', '#96343e', '#ae3e48', '#c44a52', '#dc6068'], tocino: ['#e8d8d0', '#9a8a86', '#b4a49e', '#ccbcb6', '#e0d0ca', '#f4e8e2'], barro: ['#8a4a30', '#4a2418', '#5e2e1e', '#723824', '#86432c', '#9a5236'], pan: ['#c89a5a', '#7a5a2e', '#946e3a', '#ac8246', '#c49652', '#dcae66'] },
  light: { magro: ['#e06a72', '#a83c46', '#be4a54', '#d05860', '#e2666e', '#f27a80'], tocino: ['#f6ece6', '#cabcb6', '#d8cac4', '#e6d8d2', '#f2e6e0', '#fff8f4'], barro: ['#c8784e', '#94502e', '#a85e38', '#ba6c42', '#cc7a4e', '#de8e60'], pan: ['#e2b474', '#b0844a', '#c29456', '#d2a462', '#e2b470', '#f2c886'] },
};
const colores = Object.entries(COLOR).map(([th, m]) => Object.entries(m).map(([cls, v]) => tonos(th === 'light' ? '.iso[data-theme="light"] ' : '', cls, v)).join('')).join('');
const CSS = COLORES + enJuego(WIDTH, HEIGHT) + `
.iso{--txis:#b8282f;--txis-b:#4a1014;--picado:#c8606a;--masa-rosa:#c8707a;--masa-roja:#a8282c;--pimenton:#c8301e;--ajo:#f0e8d0;--sal:#f4f4f8;--hueco:#0d0718;--madera:#3a2440;--llama:#4a8aff;--aceite:#c89a2a;--gota:#ffe08a}
.iso[data-theme="light"]{--txis:#c8323a;--txis-b:#7a1e24;--picado:#e07a82;--masa-rosa:#e8909a;--masa-roja:#c03030;--pimenton:#d83a24;--ajo:#fff8e8;--sal:#ffffff;--hueco:#8c7a86;--madera:#e7d9cf;--llama:#4a8aff;--aceite:#e0b23a;--gota:#e0a020}
.txis{fill:none;stroke:color-mix(in srgb,#5a1a14 calc(var(--oreo,0)*35%),var(--txis));stroke-linecap:round;stroke-linejoin:round}.txis-borde{fill:none;stroke:var(--txis-b);stroke-linecap:round;stroke-linejoin:round}
.picado{fill:var(--picado)}.masa{fill:color-mix(in srgb,var(--masa-roja) calc(var(--rojo,0)*100%),var(--masa-rosa))}.pimenton{fill:var(--pimenton)}.ajo{fill:var(--ajo)}.sal{fill:var(--sal)}
.hueco{fill:var(--hueco)}.llama{fill:var(--llama);opacity:.85}.aceite{fill:var(--aceite);opacity:.8}.gota-aceite{fill:var(--gota)}
.hebra{fill:none;stroke:var(--picado);stroke-width:.7;stroke-linecap:round}
.manivela{stroke-width:1.2}.cremallera{stroke-width:1.4}.pala{stroke-width:1.1;stroke-linecap:round}.mango{stroke-width:2.2;stroke-linecap:round}.hoja-c{stroke-width:1.1;stroke-linecap:round}
.madera>.iso-fill,.madera>.iso-top{fill:var(--madera)}
[data-lit] .iso-edge,[data-lit].iso-line,[data-lit] .iso-line,[data-lit] .tb-edge{stroke:var(--anatomy-lit)}
[data-lit] .iso-top,[data-lit].iso-top{fill:var(--anatomy-lit-top)}
[data-lit] .iso-dots circle{fill:var(--anatomy-lit)}
` + colores;

const body = k.plateHtml({
  fig: 'Lámina 10',
  title: 'Cómo se hace la txistorra',
  hint: 'Pasa el ratón: paso a paso',
  readout: '1 · La carne',
  keys: [
    { mark: 'lit', label: 'La pieza que trabaja en cada paso: la tabla, la picadora, el adobo, la embutidora, el secadero y la sartén' },
    { mark: 'raised', label: 'La manivela hace bajar el pistón, que empuja la masa por la boquilla y llena la tripa' },
    { mark: 'flat', label: 'El pimentón le da el color rojo' },
  ],
  caption: 'La txistorra es un embutido fino y largo de carne de cerdo. Se pica la carne magra con el tocino, se adoba con sal, ajo y pimentón, que le da el color rojo, y se embute en una tripa fina con la embutidora. Después se deja orear unos días, colgada. Se come fresca: frita en la sartén o en bocadillo, es el almuerzo de muchas fiestas. Antes se hacía en casa el día de la matanza, en invierno, con la ayuda de la familia y los vecinos.',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="La txistorra, paso a paso: las flechas pasan de un paso a otro" aria-valuemin="1" aria-valuemax="6">${svg}</div>`,
});

const html = k.pageHtml({ title: 'Cómo se hace la txistorra', theme, body, script: kitScript() + live }).replace('</style>', CSS + '</style>');
escribe('txistorra', html, theme);
