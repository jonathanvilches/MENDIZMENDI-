// Lámina isométrica interactiva del viaje del salmón (skill Anatomy, 21 de noviembre de 2026; el autor: «todo lo que
// tenga que ver con Navarra», metido en las misiones). Un tramo del Bidasoa en maqueta, sobre su tablero: arriba, la grava
// donde el salmón pone los huevos; la presa del molino, con el agua cayendo; la escala de peces, una fila de pozas que
// suben poco a poco al lado de la presa; el tramo de abajo y la desembocadura en el mar, con la escollera; en la orilla,
// los alisos, la pasarela y la caseta del guarda. Al recorrerla se ve el ciclo entero: los huevos, los alevines, la bajada
// al mar, la vuelta, los saltos de poza en poza y el desove donde nacieron. La misma secuencia que el producto del salmón
// (data/procesos.js, salmon: la misión de Nerea, la guarda del río, en Lesaka).
// Uso: node tools/anatomia/salmon.mjs [--light]  →  entrega/anatomia/salmon(-light).html (y public/anatomia, para el juego)
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';
import * as G from '../../.claude/skills/anatomy/kit/lathe.mjs';
import { kitScript } from '../../.claude/skills/anatomy/scripts/inline-kit.mjs';
import { COLORES, enJuego, MARCA_JUEGO, escribe } from './comun.mjs';

const theme = process.argv.includes('--light') ? 'light' : 'dark';
const WIDTH = 600, HEIGHT = 250;

// ---------- el modelo (centímetros de la maqueta; el río baja hacia +x, hacia el mar) ----------
const RIO = { y0: -42, y1: -20 };
const ARRIBA = { x0: -138, x1: -57, lecho: 4.6, agua: 7.2 };          // el tramo de arriba, con la grava
const PRESA = { x0: -57, x1: -54, h: 7.8 };
const ABAJO = { x0: -54, x1: 24, lecho: 0.8, agua: 3.6 };              // el tramo de abajo
const MAR = { x0: 24, x1: 52, y0: -52, y1: -6, arena: 1.2, agua: 3.4 };
const ORILLA = { y0: -54, y1: -42, hArriba: 10, hAbajo: 6.4 };
const MURO_F = { y0: -20, y1: -18.8 };                                 // el muro de delante del río
const ESC = { y0: -18.8, y1: -14.8, n: 8, x1: -38, largo: 4 };         // la escala: pozas de 4, de x1 hacia -x
const POZA = Array.from({ length: ESC.n }, (_, i) => { const x1 = ESC.x1 - i * ESC.largo; return { x0: x1 - ESC.largo, x1, w: ABAJO.agua + i * (ARRIBA.agua - ABAJO.agua) / (ESC.n - 1) }; });
const FREZ = [-129, -121, -113, -105].map((x, i) => ({ x, y: -33 + (i % 2) * 4 }));   // los frezaderos, en la grava
const ALISOS = [[-131, -49, 'a'], [-104, -50, 'a'], [-80, -48, 'a'], [-40, -49, 'b'], [-8, -50, 'b'], [14, -48, 'b']];
const PASARELA = { x0: -95, x1: -89, y0: -47, y1: -12, z: 10.4 };
const CASETA = { x: -125, y: -15, w: 14, d: 9, h: 7 };
const PASOS = ['Los huevos', 'Los alevines', 'Al mar', 'La vuelta', 'La escala', 'El desove'];

// ---------- la cámara ----------
const PLATE = { x: -142, y: -58, w: 198, d: 58, r: 7 };
const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [-131, -49, 27], [14, -48, 23], [CASETA.x, CASETA.y + CASETA.d, CASETA.h + 5]], WIDTH, HEIGHT, { pad: 10, azimuth: 76, elevation: 30 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const dep = (p) => k.depthOf(p, P);
const linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L');
const poly = (pts) => linea(pts) + 'Z';
const FZ = (x, y, z = 0) => G.frameAlong([x, y, z], [0, 0, 1]);
const FXz = (x, y, z) => G.frameOf([x, y, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const porDepth = (lista, f) => [...lista].sort((a, b) => dep(f(a)) - dep(f(b)));
const R2x = (i) => (0.5 + i * 0.7548776662) % 1, R2y = (i) => (0.5 + i * 0.5698402910) % 1;
const sillares = (m, zs) => L(zs.map((z) => k.sideSeam(m, z, P, 2)).join(''), { tone: 'lo' });
const caja = (x0, x1, y0, y1, z0, h, cls, tone = 'mid', bevel = 0.3) => S(k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: 0.2 }, z0, h, P, 2, bevel), { tone, className: cls });
const rect = (x0, x1, y0, y1, z) => [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]];

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
  const regla = { x: -104, y: -7, w: 56, d: 5.5, r: 1 };
  out.push(S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
  const t = k.topTicks(regla.x + 3, regla.x + regla.w - 3, 2, 5, regla.y + 0.6, 0.6, [1.6, 3], P);
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
  out.push(D([at([regla.x + 1.5, regla.y + 2.8, 0.6]), at([regla.x + regla.w - 1.5, regla.y + 2.8, 0.6])], { size: 0.45 }));
  const placa = { x: -32, y: -8, w: 38, d: 7.5, r: 1.2 };
  out.push(S(k.slabOf(placa, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(placa, 1.1), 0.8, P, 4), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([placa.x + 5, placa.y + 4.4], 0.8, P, 'x'), 'RÍO BIDASOA', { size: 2.4, tone: 'mid' }));
  out.push(D([at([placa.x + 2.2, placa.y + 3.75, 0.8]), at([placa.x + placa.w - 2.2, placa.y + 3.75, 0.8])], { size: 0.4 }));
  return out.join('');
}

// ---------- la orilla de atrás, con los alisos ----------
function aliso(x, y, z0) {
  const out = [S(G.solidOf([[0, 1.1], [0.6, 0.9, true], [8.5, 0.7]], FZ(x, y, z0), P), { tone: 'mid', className: 'tronco' })];
  const bolas = [[x - 2.2, y + 0.4, z0 + 10.5, 3.6], [x + 2, y - 0.6, z0 + 11.2, 3.4], [x + 0.2, y + 1.2, z0 + 13.8, 3.8], [x - 0.4, y - 1, z0 + 9.4, 2.8]];
  out.push(porDepth(bolas, (b) => b).map(([bx, by, bz, r]) => S(G.sphereOf([bx, by, bz], r, P), { tone: 'mid', className: 'copa' })).join(''));
  return out.join('');
}
function orilla() {
  const out = [];
  const oA = { x: ARRIBA.x0, y: ORILLA.y0, w: ARRIBA.x1 - ARRIBA.x0 + 1.5, d: ORILLA.y1 - ORILLA.y0, r: 0.4 }, oB = { x: PRESA.x0 + 1.5, y: ORILLA.y0, w: ABAJO.x1 - PRESA.x0 - 1.5, d: ORILLA.y1 - ORILLA.y0, r: 0.4 };
  out.push(S(k.slabOf(oA, 0, ORILLA.hArriba, P, 2, 0.4), { tone: 'mid', className: 'orilla' }), sillares(oA, [3.5, 7]));
  out.push(S(k.slabOf(oB, 0, ORILLA.hAbajo, P, 2, 0.4), { tone: 'mid', className: 'orilla' }), sillares(oB, [3.2]));
  let mata = ''; for (let i = 0; i < 26; i++) { const x = ARRIBA.x0 + 2 + R2x(i) * (ABAJO.x1 - ARRIBA.x0 - 4), y = ORILLA.y0 + 1.5 + R2y(i) * 9, z = x < PRESA.x0 + 1.5 ? ORILLA.hArriba : ORILLA.hAbajo; const q = at([x, y, z]); mata += `<circle class="hierba" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${(0.5 + R2x(i + 3) * 0.5).toFixed(2)}"/>`; }
  out.push(mata);
  out.push(porDepth(ALISOS, ([x, y]) => [x, y, 0]).map(([x, y, t]) => aliso(x, y, t === 'a' ? ORILLA.hArriba : ORILLA.hAbajo)).join(''));
  return `<g data-part="orilla">${out.join('')}</g>`;
}

// ---------- el mar: la arena, la escollera de atrás y el agua (viva: olas) ----------
function marAtras() {
  const out = [];
  out.push(caja(MAR.x0, MAR.x1, MAR.y0, MAR.y1, 0, MAR.arena, 'arena', 'mid', 0.4));
  const rocas = [[30, -51, 2.6], [36, -52, 2.2], [43, -51, 2.8], [49, -49, 2.4]];
  out.push(porDepth(rocas, ([x, y]) => [x, y, 0]).map(([x, y, r]) => S(G.sphereOf([x, y, MAR.arena + r * 0.5], r, P), { tone: 'mid', className: 'roca' })).join(''));
  return `<g data-part="mar">${out.join('')}</g>`;
}
function marDelante() {
  const rocas = [[50, -40, 2.2], [51, -30, 2.6], [50, -20, 2.3], [48, -11, 2.5], [40, -8, 2.1], [31, -8.5, 2.4]];
  return `<g data-part="escollera">${porDepth(rocas, ([x, y]) => [x, y, 0]).map(([x, y, r]) => S(G.sphereOf([x, y, MAR.arena + r * 0.45], r, P), { tone: 'mid', className: 'roca' })).join('')}</g>`;
}

// ---------- los lechos: la grava de arriba, con los frezaderos y los huevos (vivos); la arena de abajo ----------
function lechos() {
  const out = [];
  out.push(caja(ARRIBA.x0, ARRIBA.x1, RIO.y0, RIO.y1, 0, ARRIBA.lecho, 'grava', 'lo', 0.2));
  let pi = ''; for (let i = 0; i < 70; i++) { const q = at([ARRIBA.x0 + 1 + R2x(i) * (ARRIBA.x1 - ARRIBA.x0 - 2), RIO.y0 + 1 + R2y(i) * (RIO.y1 - RIO.y0 - 2), ARRIBA.lecho]); pi += `<circle class="${i % 3 ? 'canto' : 'canto-b'}" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${(0.35 + R2x(i + 9) * 0.45).toFixed(2)}"/>`; }
  out.push(pi);
  // los frezaderos: un montón de grava removida con los huevos dentro (vivos: se ven, eclosionan y vuelven en el desove)
  const fz = FREZ.map(({ x, y }) => S(G.solidOf([[0, 4], [0.5, 3, true], [0.9, 1.2, true]], FZ(x, y, ARRIBA.lecho), P), { tone: 'mid', className: 'grava-r', crease: 'none' })).join('');
  let hu = ''; FREZ.forEach(({ x, y }, j) => { for (let i = 0; i < 9; i++) { const a = R2x(i + j * 9) * Math.PI * 2, r = Math.sqrt(R2y(i + j * 9)) * 2.4, q = at([x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, ARRIBA.lecho + 0.75 - r * 0.2]); hu += `<circle class="huevo" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r=".42"/>`; } });
  out.push(`<g data-part="frezaderos">${fz}<g data-part="huevos">${hu}</g></g>`, `<g data-part="alevines"></g>`);
  out.push(caja(ABAJO.x0 - 0.5, ABAJO.x1, RIO.y0, RIO.y1, 0, ABAJO.lecho, 'arena', 'lo', 0.2));
  return out.join('');
}
// cantos rodados grandes en el cauce (bajo el agua: el agua los tiñe)
const BOLOS = [[-84, -24, 1.9, 'a'], [-70, -38, 2.2, 'a'], [-136, -38, 1.8, 'a'], [-30, -38, 2.1, 'b'], [-14, -23, 1.8, 'b'], [4, -36, 2.3, 'b'], [16, -25, 1.7, 'b']];
function bolos() { return porDepth(BOLOS, ([x, y]) => [x, y, 0]).map(([x, y, r, t]) => S(G.sphereOf([x, y, (t === 'a' ? ARRIBA.lecho : ABAJO.lecho) + r * 0.55], r, P), { tone: 'mid', className: 'roca' })).join(''); }
function presa() {
  const m = { x: PRESA.x0, y: RIO.y0 - 1, w: PRESA.x1 - PRESA.x0, d: RIO.y1 - RIO.y0 + 1, r: 0.3 };
  return `<g data-part="presa">${S(k.slabOf(m, 0, PRESA.h, P, 2, 0.4), { tone: 'mid', className: 'piedra' })}${sillares(m, [2.6, 5.2])}</g>`;
}
function aguas() {
  const out = [];
  out.push(`<path data-part="agua-arriba" class="agua" d="${poly(rect(ARRIBA.x0, ARRIBA.x1, RIO.y0, RIO.y1, ARRIBA.agua))}"/>`);
  out.push(`<path data-part="agua-abajo" class="agua" d="${poly(rect(ABAJO.x0, ABAJO.x1 + 1, RIO.y0, RIO.y1, ABAJO.agua))}"/>`);
  out.push(`<path data-part="agua-mar" class="agua mar" d="${poly(rect(MAR.x0 + 0.6, MAR.x1 - 0.6, MAR.y0 + 0.6, MAR.y1 - 0.6, MAR.agua))}"/>`);
  out.push(`<path class="cortina" d="${poly([[PRESA.x1, RIO.y0 + 0.4, ARRIBA.agua + 0.1], [PRESA.x1, RIO.y1 - 0.4, ARRIBA.agua + 0.1], [PRESA.x1 + 1.8, RIO.y1 - 0.4, ABAJO.agua], [PRESA.x1 + 1.8, RIO.y0 + 0.4, ABAJO.agua]])}"/>`);
  out.push(`<g data-part="ondas"></g>`);
  return out.join('');
}

// ---------- la pasarela de madera sobre el tramo de arriba ----------
function pasarela() {
  const p = PASARELA, out = [];
  out.push(caja(p.x0 - 0.5, p.x1 + 0.5, p.y1 - 4, p.y1, 0, p.z, 'piedra', 'mid', 0.3));                       // el estribo de delante
  for (const x of [p.x0 + 0.6, p.x1 - 1.8]) out.push(caja(x, x + 1.2, p.y0, p.y1, p.z - 1.2, 1.2, 'madera', 'mid', 0.15));
  out.push(caja(p.x0, p.x1, p.y0, p.y1, p.z, 0.6, 'madera', 'mid', 0.15));
  let tb = ''; for (let y = p.y0 + 2.2; y < p.y1 - 1; y += 2.2) tb += linea([[p.x0, y, p.z + 0.6], [p.x1, y, p.z + 0.6]]);
  out.push(L(tb, { tone: 'lo' }));
  const postes = []; for (let y = p.y0 + 1; y <= p.y1 - 1; y += 8.5) for (const x of [p.x0 + 0.2, p.x1 - 0.9]) postes.push([x, y]);
  out.push(porDepth(postes, ([x, y]) => [x, y, 0]).map(([x, y]) => caja(x, x + 0.7, y, y + 0.7, p.z + 0.6, 4, 'madera', 'mid', 0.1)).join(''));
  for (const x of [p.x0 + 0.2, p.x1 - 0.9]) out.push(caja(x - 0.05, x + 0.75, p.y0 + 0.8, p.y1 - 0.8, p.z + 4.6, 0.5, 'madera', 'mid', 0.1));
  return `<g data-part="pasarela">${out.join('')}</g>`;
}

// ---------- los muros de delante del río y la escala de peces ----------
function murosDelante() {
  const out = [];
  const mA = { x: ARRIBA.x0, y: MURO_F.y0, w: POZA[7].x0 - ARRIBA.x0, d: MURO_F.y1 - MURO_F.y0, r: 0.2 };
  const mB = { x: POZA[0].x1, y: MURO_F.y0, w: ABAJO.x1 - POZA[0].x1, d: MURO_F.y1 - MURO_F.y0, r: 0.2 };
  out.push(S(k.slabOf(mA, 0, ARRIBA.agua + 1.2, P, 2, 0.3), { tone: 'mid', className: 'piedra' }), sillares(mA, [3, 6]));
  out.push(S(k.slabOf(mB, 0, ABAJO.agua + 1, P, 2, 0.3), { tone: 'mid', className: 'piedra' }), sillares(mB, [2.3]));
  return out.join('');
}
function escala() {
  const out = [], yM = (ESC.y0 + ESC.y1) / 2;
  // de la poza de arriba (la más a -x) a la de abajo: cada una con su muro de atrás, el suelo, el tabique con su escotadura y el agua
  for (let i = ESC.n - 1; i >= 0; i--) {
    const pz = POZA[i], suelo = pz.w - 2.2;
    if (i > 0 && i < ESC.n - 1) out.push(caja(pz.x0, pz.x1, MURO_F.y0, MURO_F.y1, 0, (i >= 4 ? ARRIBA.agua : pz.w) + 1, 'piedra', 'mid', 0.2));
    out.push(caja(pz.x0, pz.x1, ESC.y0, ESC.y1, 0, suelo, 'piedra', 'mid', 0.2));
    if (i < ESC.n - 1) {
      const sup = POZA[i + 1], x = pz.x0;
      out.push(caja(x - 0.5, x + 0.5, ESC.y0, yM, sup.w - 2.2, sup.w + 0.6 - (sup.w - 2.2), 'piedra', 'mid', 0.1));
      out.push(caja(x - 0.5, x + 0.5, yM, ESC.y1, sup.w - 2.2, pz.w + 0.25 - (sup.w - 2.2), 'piedra', 'mid', 0.1));
      out.push(`<path class="cortina" d="${poly([[x + 0.5, yM + 0.2, sup.w], [x + 0.5, ESC.y1 - 0.2, sup.w], [x + 1.4, ESC.y1 - 0.2, pz.w], [x + 1.4, yM + 0.2, pz.w]])}"/>`);
    }
    out.push(`<path class="agua" d="${poly(rect(pz.x0 + (i < ESC.n - 1 ? 0.5 : 0), pz.x1 - (i > 0 ? 0.5 : 0), ESC.y0, ESC.y1, pz.w))}"/>`);
  }
  // el muro de delante de la escala, que baja escalón a escalón
  for (let i = ESC.n - 1; i >= 0; i--) { const pz = POZA[i]; out.push(caja(pz.x0, pz.x1, ESC.y1, ESC.y1 + 1, 0, pz.w + 0.9, 'piedra', 'mid', 0.2)); }
  return `<g data-part="escala">${out.join('')}</g>`;
}

// ---------- la caseta del guarda ----------
function caseta() {
  const c = CASETA, out = [];
  out.push(caja(c.x, c.x + c.w, c.y, c.y + c.d, 0, c.h, 'enlucido', 'mid', 0.3));
  const fy = c.y + c.d;
  const puerta = [[c.x + 9, fy, 0], [c.x + 12, fy, 0], [c.x + 12, fy, 5], [c.x + 9, fy, 5]], ven = [[c.x + 2.5, fy, 2.8], [c.x + 6, fy, 2.8], [c.x + 6, fy, 5.2], [c.x + 2.5, fy, 5.2]];
  out.push(`<path class="hueco" d="${poly(puerta)}"/>`, L(poly(puerta), { tone: 'mid' }), `<path class="ventana" d="${poly(ven)}"/>`, L(poly(ven) + linea([[c.x + 4.25, fy, 2.8], [c.x + 4.25, fy, 5.2]]), { tone: 'mid' }));
  out.push(S(G.prismOf(FXz(0, 0, 0), [[c.y - 1, c.h], [fy + 1, c.h], [c.y + c.d / 2, c.h + 4.2]], c.x - 1, c.x + c.w + 1, P), { tone: 'mid', className: 'teja' }));
  return `<g data-part="caseta">${out.join('')}</g>`;
}

// ---------- la figura (de atrás adelante) ----------
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'Maqueta de un tramo del río Bidasoa: arriba, la grava con los frezaderos donde el salmón entierra los huevos; la presa del molino, con el agua cayendo; al lado, la escala de peces, ocho pozas que suben poco a poco; el tramo de abajo y la desembocadura en el mar, con la escollera; en la orilla de atrás, los alisos; la pasarela de madera y la caseta del guarda.',
  body: [
    tablero(), orilla(), marAtras(), lechos(), bolos(), presa(),
    `<g data-part="peces-agua"></g>`,
    aguas(), murosDelante(), pasarela(), escala(), marDelante(), caseta(),
    `<g data-part="peces-aire"></g><g data-part="gotas"></g>`,
  ],
});

// ---------- lo que se mueve en la página ----------
const live = MARCA_JUEGO + `
const P = ${JSON.stringify(P)}, RIO = ${JSON.stringify(RIO)}, ARRIBA = ${JSON.stringify(ARRIBA)}, ABAJO = ${JSON.stringify(ABAJO)}, PRESA = ${JSON.stringify(PRESA)}, MAR = ${JSON.stringify(MAR)};
const ESC = ${JSON.stringify(ESC)}, POZA = ${JSON.stringify(POZA)}, FREZ = ${JSON.stringify(FREZ)};
const PASOS = ${JSON.stringify(PASOS)}, N = PASOS.length;
const at = (p) => iso(p, P), linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L');
const K = Math.hypot(at([0, 0, 1])[0] - at([0, 0, 0])[0], at([0, 0, 1])[1] - at([0, 0, 0])[1]);
const stage = document.querySelector('.iso-stage'), svgEl = stage.querySelector('svg'), $ = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const el = {}; for (const n of ['huevos', 'alevines', 'peces-agua', 'peces-aire', 'gotas', 'ondas', 'frezaderos', 'mar', 'escollera', 'presa', 'escala', 'orilla']) el[n] = $(n);
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const ilumina = (lista, on) => { for (const n of [].concat(lista)) if (n && on !== n.hasAttribute('data-lit')) n.toggleAttribute('data-lit', on); };
const R = (i) => (0.5 + i * 0.7548776662) % 1, Q = (i) => (0.5 + i * 0.5698402910) % 1;
const lerp = (a, b, t) => a + (b - a) * t;
// un pez: el cuerpo fusiforme y la cola, orientado según su rumbo (dir, en el mundo), de largo l
function pez(p, dir, l, cls, op) {
  const h = at([p[0] + dir[0] * l * 0.5, p[1] + dir[1] * l * 0.5, p[2] + dir[2] * l * 0.5]), t = at([p[0] - dir[0] * l * 0.5, p[1] - dir[1] * l * 0.5, p[2] - dir[2] * l * 0.5]);
  const dx = h[0] - t[0], dy = h[1] - t[1], ln = Math.hypot(dx, dy) || 1, nx = -dy / ln, ny = dx / ln, w = Math.max(0.35, l * K * 0.17);
  const m = [t[0] + dx * 0.6, t[1] + dy * 0.6], c = [t[0] + dx * 0.16, t[1] + dy * 0.16], f = (v) => v.toFixed(1);
  const cuerpo = 'M' + f(h[0]) + ' ' + f(h[1]) + 'Q' + f(m[0] + nx * w * 1.25) + ' ' + f(m[1] + ny * w * 1.25) + ' ' + f(c[0]) + ' ' + f(c[1]) + 'Q' + f(m[0] - nx * w * 1.25) + ' ' + f(m[1] - ny * w * 1.25) + ' ' + f(h[0]) + ' ' + f(h[1]) + 'Z';
  const cola = 'M' + f(c[0]) + ' ' + f(c[1]) + 'L' + f(t[0] + nx * w * 0.9) + ' ' + f(t[1] + ny * w * 0.9) + 'L' + f(t[0] - nx * w * 0.9) + ' ' + f(t[1] - ny * w * 0.9) + 'Z';
  return '<path class="' + cls + '" style="opacity:' + op.toFixed(2) + '" d="' + cuerpo + cola + '"/>';
}
const unit = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
let s = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, txt = '', reloj = 0;
const tourAt = (t) => { const T = 3 * N + 2, f = (t % T) / T * (N + 0.71); const i = Math.floor(f); return Math.min(N - 0.001, i + sm((f - i) / 0.6) * 0.999); };
// la ruta de un salmón adulto que vuelve: del mar a la entrada de la escala
const yE = (ESC.y0 + ESC.y1) / 2, cx = (i) => (POZA[i].x0 + POZA[i].x1) / 2;
function adulto(k) {
  // devuelve [posición, rumbo, ¿en el aire?]
  const zA = ABAJO.agua - 1.1, zU = ARRIBA.agua - 1.1;
  if (s < 3) { const a = reloj * 0.5 + k * 1.26, r = 7 + (k % 2) * 3; return [[38 + Math.cos(a) * r, -29 + Math.sin(a) * r * 0.9, MAR.agua - 1.1], unit([-Math.sin(a), Math.cos(a) * 0.9, 0]), false]; }
  const u = sm((s - 3.02 - k * 0.05) / 0.75);
  if (s < 3.95) { const pts = [[38, -29], [16, -28 - k], [-20, -27 + k * 0.8], [-36, -23], [cx(0), yE]]; const f = u * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), t = f - i, A = pts[i], B = pts[i + 1]; return [[lerp(A[0], B[0], t), lerp(A[1], B[1], t) + Math.sin(reloj * 3 + k) * 0.3, i < 3 ? zA : lerp(zA, POZA[0].w - 1, t)], unit([B[0] - A[0], B[1] - A[1], 0]), false]; }
  const v = clamp((s - 3.97 - k * 0.07) / 0.82, 0, 1) * (ESC.n - 1);
  if (v < ESC.n - 1) { const i = Math.floor(v), f = v - i, j = clamp((f - 0.5) / 0.5, 0, 1); if (j <= 0) return [[cx(i) + Math.sin(reloj * 4 + k) * 0.6, yE, POZA[i].w - 1], [-1, 0, 0], false]; const z0 = POZA[i].w, z1 = POZA[i + 1].w; return [[lerp(cx(i), cx(i + 1), j), yE, lerp(z0, z1, j) + Math.sin(j * Math.PI) * 3.4 - 0.4], unit([-4, 0, (z1 - z0) + Math.cos(j * Math.PI) * 10]), true]; }
  // arriba: suben hasta los frezaderos
  const w = sm((s - 4.95 - k * 0.04) / 0.5), fz = FREZ[k % FREZ.length], dest = [fz.x + 3 + (k > 3 ? 4 : 0), fz.y + (k % 2 ? 2.2 : -2.2)];
  const pos = [lerp(cx(ESC.n - 1), dest[0], w), lerp(yE - 4, dest[1], w), zU + 0.4];
  if (w >= 1) { const a = Math.sin(reloj * 6 + k * 2) * 0.5; return [[pos[0] + Math.sin(reloj * 1.3 + k) * 0.8, pos[1], pos[2]], unit([-Math.cos(a), Math.sin(a), 0]), false]; }
  return [pos, unit([dest[0] - cx(ESC.n - 1), dest[1] - yE + 4, 0]), false];
}
function draw(dt) {
  reloj += dt;
  const paso = Math.min(N - 1, Math.floor(s));
  // los huevos: en invierno, en la grava; eclosionan y vuelven en el desove
  const hv = Math.max(1 - sm((s - 1.0) / 0.4), sm((s - 5.3) / 0.6));
  el.huevos.style.opacity = hv.toFixed(2);
  // los alevines, entre la grava
  const av = sm((s - 0.95) / 0.3) * (1 - sm((s - 2.0) / 0.25));
  let al = ''; if (av > 0.02) for (let i = 0; i < 14; i++) { const fz = FREZ[i % 4], a = reloj * (0.6 + R(i) * 0.5) + i * 2.1, r = 2 + Q(i) * 3, p = [fz.x + Math.cos(a) * r, fz.y + Math.sin(a) * r * 0.8, ARRIBA.lecho + 1 + R(i + 4) * 0.6]; al += pez(p, unit([-Math.sin(a), Math.cos(a) * 0.8, 0]), 1.6, 'alevin', av); }
  el.alevines.innerHTML = al;
  // bajo el agua: los esguines que bajan al mar y los adultos que vuelven (los que saltan van por encima del agua)
  let bajo = '', aire = '';
  const eg = sm((s - 1.95) / 0.15) * (1 - sm((s - 3.0) / 0.2));
  if (eg > 0.02) for (let k2 = 0; k2 < 7; k2++) { const u = clamp((s - 2.02 - k2 * 0.05) / 0.82, 0, 1), x = lerp(-120, 44, u), cae = x > PRESA.x0 && x < PRESA.x1 + 4, z = x < PRESA.x1 ? ARRIBA.agua - 1 : (x < PRESA.x1 + 3 ? lerp(ARRIBA.agua - 1, ABAJO.agua - 0.9, (x - PRESA.x1) / 3) : (x < MAR.x0 ? ABAJO.agua - 0.9 : MAR.agua - 0.9)); const p = [x, -27 - (k2 % 4) * 2.4 + Math.sin(reloj * 3 + k2) * 0.4, z], h = pez(p, cae ? unit([1, 0, -1]) : [1, 0, 0], 3, 'esguin', eg); if (cae) aire += h; else bajo += h; }
  const ad = sm((s - 2.85) / 0.2);
  if (ad > 0.02) for (let k2 = 0; k2 < 5; k2++) { const [p, d, enAire] = adulto(k2), h = pez(p, d, 5.6, 'salmon', ad); if (enAire || (s >= 3.95 && s < 4.97)) aire += h; else bajo += h; }
  el['peces-agua'].innerHTML = bajo; el['peces-aire'].innerHTML = aire;
  el['peces-aire'].style.setProperty('--rojo', sm((s - 4.6) / 0.8).toFixed(2)); el['peces-agua'].style.setProperty('--rojo', sm((s - 4.6) / 0.8).toFixed(2));
  // el agua: corrientes que bajan, la cortina de la presa y las olas
  let on = '';
  for (let i = 0; i < 7; i++) { const f = (reloj * 0.3 + i / 7) % 1, x = ARRIBA.x0 + 4 + f * (ARRIBA.x1 - ARRIBA.x0 - 10), y = RIO.y0 + 3 + Q(i) * (RIO.y1 - RIO.y0 - 6); on += linea([[x, y, ARRIBA.agua], [x + 3.4, y, ARRIBA.agua]]); }
  for (let i = 0; i < 7; i++) { const f = (reloj * 0.38 + i / 7) % 1, x = ABAJO.x0 + 4 + f * (ABAJO.x1 - ABAJO.x0 - 8), y = RIO.y0 + 3 + Q(i + 3) * (RIO.y1 - RIO.y0 - 6); on += linea([[x, y, ABAJO.agua], [x + 3.6, y, ABAJO.agua]]); }
  for (let i = 0; i < 6; i++) { const f = (reloj * 0.9 + i / 6) % 1, y = RIO.y0 + 1.5 + (i + 0.5) / 6 * (RIO.y1 - RIO.y0 - 3); on += linea([[PRESA.x1 + f * 1.6, y, ARRIBA.agua - f * (ARRIBA.agua - ABAJO.agua)], [PRESA.x1 + Math.min(1.8, (f + 0.25) * 1.6), y, ARRIBA.agua - Math.min(1, f + 0.25) * (ARRIBA.agua - ABAJO.agua)]]); }
  let olas = ''; for (let i = 0; i < 5; i++) { const f = (reloj * 0.25 + i / 5) % 1, x = MAR.x1 - 4 - f * 20, pts = []; for (let j = 0; j <= 10; j++) { const y = MAR.y0 + 3 + j / 10 * (MAR.y1 - MAR.y0 - 6); pts.push([x + Math.sin(j * 1.3 + i) * 0.6, y, MAR.agua]); } olas += linea(pts); }
  el.ondas.innerHTML = '<path class="onda" d="' + on + '"/><path class="onda ola" d="' + olas + '"/>';
  let go = ''; for (let i = 0; i < 10; i++) { const f = (reloj * 1.2 + i / 10) % 1, y = RIO.y0 + 2 + R(i) * (RIO.y1 - RIO.y0 - 4), q = at([PRESA.x1 + 2 + f * 2.2, y, ABAJO.agua + Math.sin(f * Math.PI) * 1.6]); go += '<circle class="espuma" style="opacity:' + (1 - f).toFixed(2) + '" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r=".45"/>'; }
  el.gotas.innerHTML = go;
  // lo que se ilumina en cada paso
  ilumina(el.frezaderos, paso === 0 || paso === 1 || paso === 5); ilumina([el.mar, el.escollera], paso === 2); ilumina(el.presa, paso === 3); ilumina(el.escala, paso === 4);
  const extra = ['en la grava del río, en invierno', 'crecen en el río uno o dos años', 'bajan hasta el mar Cantábrico', 'años después vuelven a su río', 'saltan la presa de poza en poza', 'ponen los huevos donde nacieron'][paso];
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
`;

const tonos = (pre, cls, [f, s0, s1, s2, s3, t]) => `${pre}.${cls}>.iso-fill{fill:${f}}${pre}.${cls}>.iso-top{fill:${t}}${pre}.${cls}[data-seamless]>.iso-top{stroke:${t}}` +
  [s0, s1, s2, s3].map((c, i) => `${pre}.${cls}>.iso-shade[data-shade="${i}"]{fill:${c}}${pre}.${cls}[data-seamless]>.iso-shade[data-shade="${i}"]{stroke:${c}}`).join('');
const COLOR = {
  dark: { piedra: ['#2a2240', '#1a1430', '#201936', '#261e3e', '#2c2446', '#34294f'], orilla: ['#24302a', '#141c18', '#19231d', '#1e2a23', '#232f28', '#2b3a30'], grava: ['#3a3040', '#221c28', '#2a2230', '#322838', '#3a3040', '#463a4c'], 'grava-r': ['#4a3c4c', '#2c2430', '#352c3a', '#3e3444', '#483c4e', '#56485c'],
    arena: ['#4a4030', '#2c261c', '#353024', '#3e382a', '#484030', '#564c3a'], roca: ['#3a3446', '#22202c', '#2a2634', '#322e3e', '#3a3646', '#464054'], copa: ['#3c5a3e', '#203222', '#2a402c', '#334c35', '#3c583e', '#4a6a4c'], tronco: ['#4a3628', '#2a1d16', '#35261c', '#403022', '#4c3a2a', '#5a4632'],
    madera: ['#3a2440', '#24142a', '#2c1a32', '#34203a', '#3c2642', '#442c4a'], enlucido: ['#3a3048', '#221c2e', '#2a2238', '#322a42', '#3a324a', '#463c56'], teja: ['#5a2a2a', '#341616', '#3e1c1c', '#4a2222', '#562828', '#643030'] },
  light: { piedra: ['#e4dde8', '#bdb3c6', '#ccc3d4', '#d8d0de', '#e4dce8', '#f2ecf4'], orilla: ['#cfe0c8', '#a6bc9c', '#b4c8aa', '#c2d4b8', '#d0e0c6', '#e0ecd6'], grava: ['#d8d0d8', '#aea4ae', '#bcb2bc', '#cac0ca', '#d8ced8', '#e6dee6'], 'grava-r': ['#e8dce4', '#bcaeb8', '#cabcc6', '#d8cad4', '#e6d8e2', '#f4e8f0'],
    arena: ['#ecdcbc', '#c4b08c', '#d2be9a', '#e0cca8', '#ecdab6', '#f8e8c8'], roca: ['#c8c0d0', '#9a92a6', '#a8a0b4', '#b6aec2', '#c4bcd0', '#d4cce0'], copa: ['#8ab27e', '#5e8656', '#6c9462', '#7aa26e', '#88b07c', '#9cc48e'], tronco: ['#8a6a50', '#5e4636', '#6c523e', '#7a5e48', '#886a52', '#9a7c62'],
    madera: ['#e7d9cf', '#c2ae9f', '#d0beb0', '#dccbbe', '#e8d9cd', '#f4e8de'], enlucido: ['#f4f0f6', '#cfc6d6', '#ddd6e2', '#e8e2ec', '#f2eef4', '#fcfaff'], teja: ['#d08a7a', '#a05a4c', '#b06a5a', '#c07868', '#d08676', '#e09a8a'] },
};
const colores = Object.entries(COLOR).map(([th, m]) => Object.entries(m).map(([cls, v]) => tonos(th === 'light' ? '.iso[data-theme="light"] ' : '', cls, v)).join('')).join('');
const CSS = COLORES + enJuego(WIDTH, HEIGHT) + `
.iso{--agua:#2a3e7a;--onda:#9fb4ff;--hueco:#0d0718;--huevo:#ff8a4a;--salmon:#c9c2dc;--salmon-r:#c8503a;--salmon-b:#3a3050;--esguin:#e6e2f6;--alevin:#8a7a6a;--espuma:#dfe6ff;--hierba:#3a5a3a;--canto:#5a4c62;--canto-b:#6a5c72;--ventana:#ffd36a}
.iso[data-theme="light"]{--agua:#9ec2ee;--onda:#3a64c8;--hueco:#8c7a86;--huevo:#ff6a1a;--salmon:#8a86a2;--salmon-r:#c8402a;--salmon-b:#4a4060;--esguin:#a8a4c4;--alevin:#7a6a5a;--espuma:#ffffff;--hierba:#7aa86a;--canto:#b8aab8;--canto-b:#a89aa8;--ventana:#ffd36a}
.agua{fill:var(--agua);opacity:.62}.agua.mar{opacity:.72}.cortina{fill:var(--onda);opacity:.5}.hueco{fill:var(--hueco)}.ventana{fill:var(--ventana);opacity:.8}
.onda{fill:none;stroke:var(--onda);stroke-width:.5;stroke-linecap:round;opacity:.8}.ola{stroke-width:.6}
.huevo{fill:var(--huevo)}.espuma{fill:var(--espuma)}.hierba{fill:var(--hierba)}.canto{fill:var(--canto)}.canto-b{fill:var(--canto-b)}
.salmon{fill:color-mix(in srgb,var(--salmon-r) calc(var(--rojo,0)*70%),var(--salmon));stroke:var(--salmon-b);stroke-width:.4;stroke-linejoin:round}
.esguin{fill:var(--esguin);stroke:var(--salmon-b);stroke-width:.3}.alevin{fill:var(--alevin);stroke:var(--salmon-b);stroke-width:.2}
[data-lit] .iso-edge,[data-lit].iso-line,[data-lit] .iso-line,[data-lit] .tb-edge{stroke:var(--anatomy-lit)}
[data-lit] .iso-top,[data-lit].iso-top{fill:var(--anatomy-lit-top)}
[data-lit] .iso-dots circle{fill:var(--anatomy-lit)}
` + colores;

const body = k.plateHtml({
  fig: 'Lámina 12',
  title: 'El viaje del salmón',
  hint: 'Pasa el ratón: paso a paso',
  readout: '1 · Los huevos',
  keys: [
    { mark: 'lit', label: 'Lo que importa en cada paso: la grava donde nacen, el mar, la presa, la escala y otra vez la grava' },
    { mark: 'raised', label: 'La escala de peces: ocho pozas, cada una un poco más alta, para saltar la presa de una en una' },
    { mark: 'flat', label: 'Sin agua limpia y fría, y sin grava, el salmón no puede volver' },
  ],
  caption: 'El salmón atlántico nace en ríos como el Bidasoa. Los huevos pasan el invierno enterrados en la grava; los alevines crecen en el río uno o dos años y después bajan al mar Cantábrico. En el océano crecen durante años y luego vuelven a su río para poner los huevos donde nacieron. Las presas de los molinos les cortaban el paso: hoy tienen escalas de peces, una fila de pozas que suben poco a poco y que el salmón salta una a una. Para que pueda volver, el río necesita agua limpia y fría, grava y paso libre en las presas.',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="El viaje del salmón, paso a paso: las flechas pasan de un paso a otro" aria-valuemin="1" aria-valuemax="6">${svg}</div>`,
});

const html = k.pageHtml({ title: 'El viaje del salmón', theme, body, script: kitScript() + live }).replace('</style>', CSS + '</style>');
escribe('salmon', html, theme);
