// Lámina isométrica interactiva de la ferrería del Bidasoa (skill Anatomy, 21 de noviembre de 2026; el autor: «la
// elaboración de diferentes alimentos y artesanía [...] todo lo que tenga que ver con Navarra»). Una ferrería de agua en
// maqueta, sobre su tablero: el depósito y el canal de madera que traen el agua; las dos ruedas hidráulicas, al otro lado
// del muro; el árbol de la primera, que con sus levas aprieta los barquines (los dos grandes fuelles) contra el fuego; el
// horno con el carbón vegetal y el mineral, y la chimenea; el árbol de la segunda, que con su corona de levas baja la cola
// del mazo y lo deja caer sobre el yunque, donde se golpea la zamarra al rojo; las barras de hierro que salen, la pila
// del agua, la escoria y los montones de carbón y de vena. Al recorrerla, paso a paso, se ilumina la pieza que trabaja.
// Es la que se abre en la misión del herrero de Lesaka («La ferrería del Bidasoa», data/oficios.js) y en el material
// didáctico.
// Uso: node tools/anatomia/ferreria.mjs [--light]  →  entrega/anatomia/ferreria(-light).html (y public/anatomia, para el juego)
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';
import * as G from '../../.claude/skills/anatomy/kit/lathe.mjs';
import { kitScript } from '../../.claude/skills/anatomy/scripts/inline-kit.mjs';
import { COLORES, enJuego, MARCA_JUEGO, escribe } from './comun.mjs';

const theme = process.argv.includes('--light') ? 'light' : 'dark';
const WIDTH = 600, HEIGHT = 270;

// ---------- el modelo (centímetros de la maqueta) ----------
const ZE = 14;                                                        // la altura de los dos árboles
const RA = { x: -92, y0: -44.5, y1: -40.5, r: 11, n: 16 };            // la rueda de los barquines
const RB = { x: -30, y0: -45, y1: -40, r: 12, n: 18 };                // la rueda del mazo
const MURO = { x: -114, y: -38, w: 104, d: 3, r: 0.4, h: 6 };
const DEP = { x: -139, y: -56, w: 12, d: 10, r: 0.6, h: 31 };         // el depósito, de piedra
const CANAL = { x0: -127, x1: -10, y: -51.5, ancho: 5, z: 29 };       // el canal de madera, sobre caballetes (el fondo a z)
const CAUCE = { x0: -114, x1: -10, y0: -47.5, y1: -38 };              // el cauce de abajo, que devuelve el agua al río
const FUELLES = [{ y0: -30, y1: -24 }, { y0: -22, y1: -16 }];          // los dos barquines (a lo largo de x, la boca a +x)
const FU = { xa: -96.2, xb: -75.4, z0: 1.5 };
const POSTE_A = { x: -94, y: -24.2, w: 4, d: 2.4 };                    // el poste entre los barquines, con su cojinete
const HORNO = { x: -70, y: -32, w: 20, d: 20, r: 0.6, h: 9 };
const FUEGO = { x: -60, y: -22, r: 5 };
const CHIM = { x: -66, y: -35.5, w: 12, d: 4.5, r: 0.4, h: 34 };
const MAZO = { px: -22, pz: 8.8, x0: -34, x1: 3, y0: -21.2, y1: -18.8, cola: -30 };
const CAB = { x0: -0.6, x1: 4, y0: -22, y1: -18, zb: 4.6, zt: 10.6 };  // la cabeza del mazo (en reposo)
const YUNQUE = { x: 1.7, y: -20, z: 4.6 };
const POSTE_B = { x: -32, y: -26, w: 4, d: 2.5 };
const CORONA = { y0: -21.5, y1: -18.5, r: 3 };                        // la corona de levas del mazo
const LEVA_A = [-27, -19];                                            // dónde aprieta cada leva su barquín
const BARRAS = { x0: 21, x1: 47, y0: -28, z0: 1.6 };
const PASOS = ['El agua', 'Carbón y vena', 'Los barquines', 'La zamarra', 'El mazo', 'Las barras'];

// ---------- la cámara ----------
const PLATE = { x: -142, y: -58, w: 198, d: 60, r: 7 };
const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [DEP.x, DEP.y, DEP.h + 1.5], [DEP.x + DEP.w, DEP.y, DEP.h + 1.5], [CHIM.x + CHIM.w, CHIM.y, CHIM.h + 2], [CANAL.x1, CANAL.y - 3, CANAL.z + 3]], WIDTH, HEIGHT, { pad: 10, azimuth: 76, elevation: 30 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const dep = (p) => k.depthOf(p, P);
const linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L');
const poly = (pts) => linea(pts) + 'Z';
const FZ = (x, y, z = 0) => G.frameAlong([x, y, z], [0, 0, 1]);
const FX = (x, y, z) => G.frameAlong([x, y, z], [1, 0, 0]);
const FY = (x, y, z) => G.frameOf([x, y, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);       // a lo largo de y: el polígono en (x, z)
const FXz = (x, y, z) => G.frameOf([x, y, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);      // a lo largo de x: el polígono en (y, z)
const porDepth = (lista, f) => [...lista].sort((a, b) => dep(f(a)) - dep(f(b)));
const VIS = Math.atan2(dep([0, 1, 0]) - dep([0, 0, 0]), dep([1, 0, 0]) - dep([0, 0, 0]));
const arcoDelante = (x, y, r, z, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const t = VIS - Math.PI / 2 + i / n * Math.PI; return [x + Math.cos(t) * r, y + Math.sin(t) * r, z]; });
const seam = (x, y, r, z) => k.pathOf(arcoDelante(x, y, r, z).map(at));
const R2x = (i) => (0.5 + i * 0.7548776662) % 1, R2y = (i) => (0.5 + i * 0.5698402910) % 1;
const sillares = (m, zs) => L(zs.map((z) => k.sideSeam(m, z, P, 2)).join(''), { tone: 'lo' });
// un tramo de árbol (eje de madera a lo largo de y), de y0 a y1
const arbol = (x, y0, y1, r, cls = 'madera') => S(G.solidOf([[0, r], [y1 - y0, r]], G.frameAlong([x, y0, ZE], [0, 1, 0]), P), { tone: 'mid', className: cls });
// un cojinete: un taco de madera con el árbol pasando por dentro
const cojinete = (x, y0, d, z0) => S(k.slabOf({ x: x - 2.5, y: y0, w: 5, d, r: 0.3 }, z0, ZE + 2.2 - z0, P, 2, 0.3), { tone: 'mid', className: 'madera' });

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
  const regla = { x: -112, y: -7, w: 62, d: 5.5, r: 1 };
  out.push(S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
  const t = k.topTicks(regla.x + 3, regla.x + regla.w - 3, 2, 5, regla.y + 0.6, 0.6, [1.6, 3], P);
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
  out.push(D([at([regla.x + 1.5, regla.y + 2.8, 0.6]), at([regla.x + regla.w - 1.5, regla.y + 2.8, 0.6])], { size: 0.45 }));
  const placa = { x: -42, y: -8, w: 44, d: 7.5, r: 1.2 };
  out.push(S(k.slabOf(placa, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(placa, 1.1), 0.8, P, 4), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([placa.x + 5, placa.y + 4.4], 0.8, P, 'x'), 'FERRERÍA DE AGUA', { size: 2.4, tone: 'mid' }));
  out.push(D([at([placa.x + 2.2, placa.y + 3.75, 0.8]), at([placa.x + placa.w - 2.2, placa.y + 3.75, 0.8])], { size: 0.4 }));
  return out.join('');
}

// ---------- el depósito, el canal de madera sobre sus caballetes ----------
function deposito() {
  const out = [];
  out.push(S(k.slabOf(DEP, 0, DEP.h, P, 2, 0.4), { tone: 'mid', className: 'piedra' }), sillares(DEP, [6, 12, 18, 24]));
  out.push(S(k.slabOf({ x: DEP.x - 0.8, y: DEP.y - 0.8, w: DEP.w + 1.6, d: DEP.d + 1.6, r: 0.6 }, DEP.h, 1.4, P, 2, 0.3), { tone: 'mid', className: 'piedra' }));
  const ins = { x: DEP.x + 1.2, y: DEP.y + 1.2, w: DEP.w - 2.4, d: DEP.d - 2.4 };
  const borde = [[ins.x, ins.y, DEP.h + 1.4], [ins.x + ins.w, ins.y, DEP.h + 1.4], [ins.x + ins.w, ins.y + ins.d, DEP.h + 1.4], [ins.x, ins.y + ins.d, DEP.h + 1.4]];
  out.push(`<path class="hueco" d="${poly(borde)}"/>`, `<path data-part="agua-dep" class="agua" d="${poly(borde.map(([x, y]) => [x, y, DEP.h + 0.9]))}"/>`, L(poly(borde), { tone: 'mid' }));
  return `<g data-part="deposito">${out.join('')}</g>`;
}
const POSTES = [-121, -108, -74, -54, -14];
function caballetes(fila) {
  const y = fila ? CANAL.y + CANAL.ancho / 2 + 0.6 : CANAL.y - CANAL.ancho / 2 - 1.8;
  return POSTES.map((x) => S(k.slabOf({ x: x - 0.6, y, w: 1.2, d: 1.2, r: 0.15 }, 0, CANAL.z - 1.2, P, 1), { tone: 'mid', className: 'madera' })).join('');
}
function canal() {
  const out = [], { x0, x1, y, z, ancho } = CANAL, w = ancho / 2;
  // los travesaños de los caballetes, debajo del canal
  out.push(POSTES.map((x) => S(k.slabOf({ x: x - 0.8, y: y - w - 2, w: 1.6, d: ancho + 4, r: 0.2 }, z - 1.2, 1.2, P, 1), { tone: 'mid', className: 'madera' })).join(''));
  const F = FXz(x0, y, 0);
  out.push(S(G.prismOf(F, [[-w - 0.9, z], [w + 0.9, z], [w + 0.9, z + 3.2], [w, z + 3.2], [w, z + 0.8], [-w, z + 0.8], [-w, z + 3.2], [-w - 0.9, z + 3.2]], 0, x1 - x0, P), { tone: 'mid', className: 'madera' }));
  out.push(S(k.slabOf({ x: x1 - 0.9, y: y - w - 0.9, w: 0.9, d: ancho + 1.8, r: 0.1 }, z, 3.2, P, 1), { tone: 'mid', className: 'madera' }));   // la tapa del final
  const agua = [[x0, y - w, z + 2.2], [x1 - 0.9, y - w, z + 2.2], [x1 - 0.9, y + w, z + 2.2], [x0, y + w, z + 2.2]];
  out.push(`<path data-part="agua-canal" class="agua" d="${poly(agua)}"/>`, `<g data-part="ondas-canal"></g>`);
  // las juntas de las tablas, en la cara de delante
  let j = ''; for (let x = x0 + 13; x < x1 - 4; x += 13) j += linea([[x, y + w + 0.9, z], [x, y + w + 0.9, z + 3.2]]);
  out.push(L(j, { tone: 'lo' }));
  return `<g data-part="canal">${out.join('')}</g>`;
}
// la canaleta que baja del canal sobre cada rueda, y el chorro (vivo)
function canaleta(R, id) {
  const out = [], y0 = CANAL.y + CANAL.ancho / 2 + 0.9, y1 = (R.y0 + R.y1) / 2 + 0.6, x = R.x + 2.4;
  const F = G.frameOf([x, y0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  out.push(S(G.prismOf(F, [[-1.8, CANAL.z + 0.4], [1.8, CANAL.z + 0.4], [1.8, CANAL.z + 2.2], [1.3, CANAL.z + 2.2], [1.3, CANAL.z + 0.9], [-1.3, CANAL.z + 0.9], [-1.3, CANAL.z + 2.2], [-1.8, CANAL.z + 2.2]], 0, y1 - y0, P), { tone: 'mid', className: 'madera' }));
  out.push(`<path data-part="chorro-${id}" class="chorro" d=""/>`);
  return `<g data-part="canaleta-${id}">${out.join('')}</g>`;
}
function cauce() {
  const out = [], c = CAUCE;
  out.push(S(k.slabOf({ x: c.x0, y: c.y0 - 1.4, w: c.x1 - c.x0, d: 1.4, r: 0.2 }, 0, 2.4, P, 2), { tone: 'lo', className: 'piedra' }));
  const agua = [[c.x0, c.y0, 1], [c.x1, c.y0, 1], [c.x1, c.y1, 1], [c.x0, c.y1, 1]];
  out.push(`<path data-part="agua-cauce" class="agua" d="${poly(agua)}"/>`, `<g data-part="ondas-cauce"></g>`);
  return out.join('');
}

// ---------- las ruedas: las llantas y el cubo son fijos; los radios y las palas, vivos ----------
function rueda(R, id) {
  const F = FY(R.x, R.y0, ZE), w = R.y1 - R.y0, out = [];
  out.push(S(G.ringBand(0, 0.8, R.r - 1.2, R.r, F, P), { tone: 'mid', className: 'madera' }));
  out.push(`<g data-part="rueda-${id}-tras"></g>`);
  out.push(S(G.solidOf([[-1.2, 2.4], [w + 1.2, 2.4]], G.frameAlong([R.x, R.y0, ZE], [0, 1, 0]), P), { tone: 'mid', className: 'madera' }));
  out.push(L(G.circleOf(G.frameAlong([R.x, R.y0, ZE], [0, 1, 0]), w + 1.2, 2.6, P), { tone: 'lo' }));
  out.push(S(G.ringBand(w - 0.8, w, R.r - 1.2, R.r, F, P), { tone: 'mid', className: 'madera' }));
  out.push(`<g data-part="rueda-${id}-del"></g>`);
  return `<g data-part="rueda-${id}">${out.join('')}</g>`;
}

// ---------- el muro de la ferrería, con los cojinetes de los dos árboles ----------
function muro() {
  const out = [];
  out.push(S(k.slabOf(MURO, 0, MURO.h, P, 2, 0.4), { tone: 'mid', className: 'piedra' }), sillares(MURO, [2, 4]));
  let j = ''; for (let x = MURO.x + 9; x < MURO.x + MURO.w - 4; x += 9) { const z0 = ((x - MURO.x) / 9) % 2 < 1 ? 0 : 2; j += linea([[x, MURO.y + MURO.d, z0], [x, MURO.y + MURO.d, z0 + 2]]); }
  out.push(L(j, { tone: 'lo' }));
  return out.join('');
}

// ---------- los barquines: el banco, las tablas de abajo, el cuero y la tapa (vivos), la cabeza y la tobera ----------
function banco() {
  return S(k.slabOf({ x: FU.xa - 1.2, y: FUELLES[0].y0 - 1, w: FU.xb - FU.xa + 3, d: FUELLES[1].y1 - FUELLES[0].y0 + 2, r: 0.4 }, 0, FU.z0, P, 2, 0.3), { tone: 'lo', className: 'madera' });
}
function fuelle(i) {
  const f = FUELLES[i], out = [], yc = (f.y0 + f.y1) / 2;
  out.push(S(k.slabOf({ x: FU.xa, y: f.y0, w: FU.xb - FU.xa, d: f.y1 - f.y0, r: 0.3 }, FU.z0, 0.8, P, 2, 0.2), { tone: 'mid', className: 'madera' }));
  out.push(`<g data-part="fuelle-${i}"></g>`);
  out.push(S(k.slabOf({ x: FU.xb - 1, y: f.y0, w: 2, d: f.y1 - f.y0, r: 0.3 }, FU.z0, 4.1, P, 2, 0.3), { tone: 'mid', className: 'madera' }));
  out.push(D([at([FU.xb + 1, f.y0 + 1, FU.z0 + 3.4]), at([FU.xb + 1, f.y1 - 1, FU.z0 + 3.4])], { size: 0.45, tone: 'mid' }));
  out.push(S(G.solidOf([[0, 1.2], [1.2, 1.1], [5.6, 0.6]], FX(FU.xb + 1, yc, 3.6), P), { tone: 'mid', className: 'hierro' }));
  return `<g data-part="barquin-${i}">${out.join('')}</g>`;
}

// ---------- el horno, la chimenea y el fuego (vivo) ----------
function chimenea() {
  const out = [];
  out.push(S(k.slabOf(CHIM, 0, CHIM.h, P, 2, 0.4), { tone: 'mid', className: 'piedra' }), sillares(CHIM, [12, 17, 22, 27]));
  out.push(S(k.slabOf({ x: CHIM.x - 0.8, y: CHIM.y - 0.8, w: CHIM.w + 1.6, d: CHIM.d + 1.6, r: 0.4 }, CHIM.h, 1.4, P, 2, 0.3), { tone: 'mid', className: 'piedra' }));
  const b = { x: CHIM.x + 2, y: CHIM.y + 1, w: CHIM.w - 4, d: CHIM.d - 2 };
  const boca = [[b.x, b.y, CHIM.h + 1.4], [b.x + b.w, b.y, CHIM.h + 1.4], [b.x + b.w, b.y + b.d, CHIM.h + 1.4], [b.x, b.y + b.d, CHIM.h + 1.4]];
  out.push(`<path class="hueco" d="${poly(boca)}"/>`, L(poly(boca), { tone: 'mid' }));
  return `<g data-part="chimenea">${out.join('')}</g>`;
}
function horno() {
  const out = [], { x, y, r } = FUEGO;
  out.push(S(k.slabOf(HORNO, 0, HORNO.h, P, 2, 0.4), { tone: 'mid', className: 'piedra' }), sillares(HORNO, [3, 6]));
  // la boca del horno, en la cara de delante: un arco oscuro con el resplandor (vivo)
  const ab = []; for (let i = 0; i <= 16; i++) { const t = Math.PI * i / 16; ab.push([x - Math.cos(t) * 3.4, HORNO.y + HORNO.d, 1 + Math.sin(t) * 3.6]); }
  out.push(`<path class="hueco" d="${poly(ab)}"/>`, `<path data-part="boca" class="resplandor" d="${poly(ab)}"/>`, L(poly(ab), { tone: 'mid' }));
  // la cuba de arriba: el carbón y la vena (vivos) y el resplandor
  out.push(S(k.cylinder(x, y, r + 1.2, HORNO.h, 1, P, 32), { tone: 'mid', className: 'piedra' }));
  out.push(`<path class="hueco" d="${k.ring(x, y, r, HORNO.h + 1, P, 32)}"/>`, `<path data-part="ascuas" class="resplandor" d="${k.ring(x, y, r - 0.6, HORNO.h + 0.8, P, 32)}"/>`, `<g data-part="carga"></g>`, `<g data-part="llamas"></g>`);
  out.push(L(k.ring(x, y, r, HORNO.h + 1, P, 32), { tone: 'mid' }));
  return `<g data-part="horno">${out.join('')}</g>`;
}

// ---------- el mazo: el castillete, el yunque; el mango y la cabeza, vivos ----------
const postes = (y) => S(k.slabOf({ x: MAZO.px - 1.2, y, w: 2.4, d: 2, r: 0.2 }, 0, MAZO.pz + 2.4, P, 1, 0.2), { tone: 'mid', className: 'madera' });
function yunque() {
  const out = [];
  out.push(S(G.solidOf([[0, 3.6], [3, 3.6]], FZ(YUNQUE.x, YUNQUE.y), P), { tone: 'mid', className: 'madera' }));
  out.push(L(seam(YUNQUE.x, YUNQUE.y, 3.6, 1.5), { tone: 'lo' }));
  out.push(S(k.slabOf({ x: YUNQUE.x - 2.7, y: YUNQUE.y - 2.6, w: 5.4, d: 5.2, r: 0.4 }, 3, YUNQUE.z - 3, P, 2, 0.3), { tone: 'mid', className: 'hierro' }));
  out.push(D([at([YUNQUE.x - 1.9, YUNQUE.y + 2.2, 3]), at([YUNQUE.x + 1.9, YUNQUE.y + 2.2, 3])], { size: 0.45, tone: 'mid' }));
  return `<g data-part="yunque">${out.join('')}</g>`;
}

// ---------- los montones de carbón y de vena, el cesto, la escoria, la pila y las barras ----------
function monton(x, y, r, h, cls, n, part) {
  const out = [S(G.solidOf([[0, r], [h * 0.45, r * 0.7, true], [h, 0.8, true]], FZ(x, y), P), { tone: 'mid', className: cls, crease: 'none' })];
  let tr = ''; for (let i = 0; i < n; i++) { const a = VIS - 1.2 + R2x(i) * 2.4, d = 0.15 + R2y(i) * 0.8, rr = r * d, z = h * Math.pow(1 - d, 1.25) * 0.98; const q = at([x + Math.cos(a) * rr, y + Math.sin(a) * rr, z]); tr += `<circle class="trozo-${cls}" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${(0.35 + R2x(i + 5) * 0.35).toFixed(2)}"/>`; }
  out.push(tr);
  return `<g data-part="${part}">${out.join('')}</g>`;
}
function cesto(x, y) {
  const out = [], r = 3.2, h = 4.5;
  out.push(S(k.cylinder(x, y, r, 0, h, P, 32), { tone: 'mid', className: 'mimbre' }));
  out.push(L([1.1, 2.2, 3.3].map((z) => seam(x, y, r, z)).join(''), { tone: 'lo' }));
  out.push(`<path class="hueco" d="${k.ring(x, y, r - 0.4, h, P, 28)}"/>`, `<path class="carbon-in" d="${k.ring(x, y, r - 0.6, h - 0.6, P, 28)}"/>`, L(k.ring(x, y, r - 0.4, h, P, 28), { tone: 'mid' }));
  return `<g data-part="cesto">${out.join('')}</g>`;
}
function pila() {
  const p = { x: 9, y: -13, w: 11, d: 7, r: 0.6 }, out = [];
  out.push(S(k.slabOf(p, 0, 3.4, P, 2, 0.3), { tone: 'mid', className: 'piedra' }));
  const ins = [[p.x + 1, p.y + 1, 3.4], [p.x + p.w - 1, p.y + 1, 3.4], [p.x + p.w - 1, p.y + p.d - 1, 3.4], [p.x + 1, p.y + p.d - 1, 3.4]];
  out.push(`<path class="hueco" d="${poly(ins)}"/>`, `<path class="agua" d="${poly(ins.map(([a, b]) => [a, b, 2.8]))}"/>`, L(poly(ins), { tone: 'mid' }));
  return `<g data-part="pila">${out.join('')}</g>`;
}
// las barras: dos durmientes y doce barras, que van apareciendo (vivas: se muestran según el paso)
const BARRA_POS = (() => { const l = []; for (let c = 0; c < 2; c++) for (let i = 0; i < 6; i++) l.push({ y: BARRAS.y0 + 1 + i * 2.4 + c * 1.2, z: BARRAS.z0 + c * 1.3, c }); return l; })();
function barras() {
  const out = [];
  for (const x of [BARRAS.x0 + 3, BARRAS.x1 - 5]) out.push(S(k.slabOf({ x, y: BARRAS.y0, w: 2.4, d: 16, r: 0.2 }, 0, BARRAS.z0, P, 1), { tone: 'mid', className: 'madera' }));
  BARRA_POS.forEach((b, i) => out.push(`<g data-part="barra-${i}">${S(k.slabOf({ x: BARRAS.x0, y: b.y, w: BARRAS.x1 - BARRAS.x0, d: 1.8, r: 0.2 }, b.z, 1.3, P, 1, 0.2), { tone: 'mid', className: 'hierro' })}</g>`));
  return `<g data-part="barras">${out.join('')}</g>`;
}

// ---------- la figura (de atrás adelante) ----------
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'Maqueta de una ferrería de agua: el depósito y el canal de madera sobre caballetes llevan el agua por dos canaletas a las ruedas hidráulicas, al otro lado del muro; el árbol de la primera rueda aprieta con sus levas los dos barquines, los grandes fuelles de cuero, que soplan por la tobera en el horno del carbón y el mineral, junto a la chimenea; el árbol de la segunda baja con su corona de levas la cola del mazo, que cae sobre el yunque donde se golpea la zamarra al rojo; delante, la pila del agua, la escoria, las barras de hierro, los montones de carbón y de vena y un cesto.',
  body: [
    tablero(),
    deposito(), caballetes(0), caballetes(1), canal(),
    cauce(),
    rueda(RA, 'a'), rueda(RB, 'b'),
    canaleta(RA, 'a'), canaleta(RB, 'b'),
    arbol(RA.x, RA.y1 + 1.2, MURO.y + 0.5, 1.4), arbol(RB.x, RB.y1 + 1.2, MURO.y + 0.5, 1.8),
    muro(),
    cojinete(RA.x, MURO.y - 0.5, MURO.d + 1, MURO.h), cojinete(RB.x, MURO.y - 0.5, MURO.d + 1, MURO.h),
    // los barquines y su árbol: el de atrás, el árbol hasta el poste (con la leva de atrás), el poste, el de delante y el resto del árbol
    banco(), fuelle(0),
    arbol(RA.x, MURO.y + MURO.d + 0.5, POSTE_A.y + 1.2, 1.4), S(G.solidOf([[0, 2.2], [1.6, 2.2]], G.frameAlong([RA.x, LEVA_A[0] - 0.8, ZE], [0, 1, 0]), P), { tone: 'mid', className: 'madera' }), `<g data-part="leva-a0"></g>`,
    S(k.slabOf({ x: POSTE_A.x + 1, y: POSTE_A.y + 0.2, w: 2, d: 2, r: 0.2 }, 0, ZE - 2.6, P, 1), { tone: 'mid', className: 'madera' }), cojinete(RA.x, POSTE_A.y, POSTE_A.d, ZE - 2.6),
    fuelle(1),
    arbol(RA.x, POSTE_A.y + POSTE_A.d - 1.2, -14, 1.4), S(G.solidOf([[0, 2.2], [1.6, 2.2]], G.frameAlong([RA.x, LEVA_A[1] - 0.8, ZE], [0, 1, 0]), P), { tone: 'mid', className: 'madera' }), `<g data-part="leva-a1"></g>`,
    D([at([RA.x, -14, ZE])], { size: 0.6, tone: 'mid' }),
    chimenea(), horno(),
    // el mazo
    yunque(), `<g data-part="zamarra-yunque"></g>`,
    arbol(RB.x, MURO.y + MURO.d + 0.5, POSTE_B.y + 1.2, 1.8), S(k.slabOf({ x: POSTE_B.x + 1, y: POSTE_B.y + 0.25, w: 2, d: 2, r: 0.2 }, 0, ZE - 3, P, 1), { tone: 'mid', className: 'madera' }), cojinete(RB.x, POSTE_B.y, POSTE_B.d, ZE - 3),
    postes(MAZO.y0 - 3.4),
    `<g data-part="mazo"></g>`,
    arbol(RB.x, POSTE_B.y + POSTE_B.d - 1.2, CORONA.y0, 1.8),
    S(G.solidOf([[0, CORONA.r], [CORONA.y1 - CORONA.y0, CORONA.r]], G.frameAlong([RB.x, CORONA.y0, ZE], [0, 1, 0]), P), { tone: 'mid', className: 'madera' }),
    `<g data-part="levas-b"></g>`,
    arbol(RB.x, CORONA.y1, -17.5, 1.8), D([at([RB.x, -17.5, ZE])], { size: 0.7, tone: 'mid' }),
    postes(MAZO.y1 + 1.4), S(G.disc(0, 0.5, 0.7, G.frameAlong([MAZO.px, MAZO.y1 + 3.4, MAZO.pz], [0, 1, 0]), P), { tone: 'mid', className: 'hierro' }),
    monton(12, -31, 4, 2.2, 'escoria', 10, 'escoria'),
    monton(-126, -21, 8, 5.5, 'carbon', 26, 'carbon'), monton(-106, -15, 6, 4, 'vena', 16, 'vena'), cesto(-124, -5),
    pila(), barras(),
    `<g data-part="zamarra-aire"></g><g data-part="tenazas"></g><g data-part="chispas"></g><g data-part="humo"></g>`,
  ],
});

// ---------- lo que se mueve en la página ----------
const live = MARCA_JUEGO + `
const P = ${JSON.stringify(P)}, ZE = ${ZE}, RA = ${JSON.stringify(RA)}, RB = ${JSON.stringify(RB)}, CANAL = ${JSON.stringify(CANAL)}, CAUCE = ${JSON.stringify(CAUCE)};
const FUELLES = ${JSON.stringify(FUELLES)}, FU = ${JSON.stringify(FU)}, LEVA_A = ${JSON.stringify(LEVA_A)}, FUEGO = ${JSON.stringify(FUEGO)}, HORNO = ${JSON.stringify(HORNO)}, CHIM = ${JSON.stringify(CHIM)};
const MAZO = ${JSON.stringify(MAZO)}, CAB = ${JSON.stringify(CAB)}, YUNQUE = ${JSON.stringify(YUNQUE)}, CORONA = ${JSON.stringify(CORONA)}, NB = ${BARRA_POS.length};
const V = ${JSON.stringify(G.viewOf(P))}, LZ = ${JSON.stringify(G.lightOf(P))};
const PASOS = ${JSON.stringify(PASOS)}, N = PASOS.length;
const at = (p) => iso(p, P), linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L'), poly = (pts) => linea(pts) + 'Z';
const dep = (p) => depthOf(p, P), K = Math.hypot(at([0, 0, 1])[0] - at([0, 0, 0])[0], at([0, 0, 1])[1] - at([0, 0, 0])[1]);
const stage = document.querySelector('.iso-stage'), svgEl = stage.querySelector('svg'), $ = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const el = {};
for (const n of ['agua-dep', 'agua-canal', 'agua-cauce', 'ondas-canal', 'ondas-cauce', 'chorro-a', 'chorro-b', 'rueda-a-tras', 'rueda-a-del', 'rueda-b-tras', 'rueda-b-del', 'fuelle-0', 'fuelle-1', 'leva-a0', 'leva-a1', 'boca', 'ascuas', 'carga', 'llamas',
  'zamarra-yunque', 'zamarra-aire', 'mazo', 'levas-b', 'tenazas', 'chispas', 'humo', 'deposito', 'canal', 'canaleta-a', 'canaleta-b', 'rueda-a', 'rueda-b', 'carbon', 'vena', 'cesto', 'horno', 'barquin-0', 'barquin-1', 'yunque', 'escoria', 'barras']) el[n] = $(n);
const barra = Array.from({ length: NB }, (_, i) => $('barra-' + i));
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const ilumina = (lista, on) => { for (const n of [].concat(lista)) if (n && on !== n.hasAttribute('data-lit')) n.toggleAttribute('data-lit', on); };
const R = (i) => (0.5 + i * 0.7548776662) % 1, Q = (i) => (0.5 + i * 0.5698402910) % 1;
const wrap = (a) => { a = (a + Math.PI) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return a - Math.PI; };
// un prisma (el mismo que prismOf del kit): un polígono en (u, v) estirado a lo largo de a, con sus tonos por la luz
const BANDS = [0, 0.2, 0.42, 0.62], band = (x) => { let t = 0; while (t < 4 && x >= BANDS[t]) t++; return t; };
const d3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], u3 = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
function prisma(F, pol, s0, s1, cls, tone) {
  const ring = oriented(pol), n = ring.length, p3 = (s, q) => [F.o[0] + F.a[0] * s + F.u[0] * q[0] + F.v[0] * q[1], F.o[1] + F.a[1] * s + F.u[1] * q[0] + F.v[1] * q[1], F.o[2] + F.a[2] * s + F.u[2] * q[0] + F.v[2] * q[1]];
  const lo = ring.map((q) => at(p3(s0, q))), hi = ring.map((q) => at(p3(s1, q))), b = [[], [], [], [], []], seen = [];
  for (let j = 0; j < n; j++) { const q0 = ring[j], q1 = ring[(j + 1) % n], nr = u3([F.u[0] * (q1[1] - q0[1]) - F.v[0] * (q1[0] - q0[0]), F.u[1] * (q1[1] - q0[1]) - F.v[1] * (q1[0] - q0[0]), F.u[2] * (q1[1] - q0[1]) - F.v[2] * (q1[0] - q0[0])]); const vis = d3(nr, V) > 1e-6; seen.push(vis); if (vis) b[band(d3(nr, LZ))].push(pathOf([lo[j], lo[(j + 1) % n], hi[(j + 1) % n], hi[j]], true)); }
  const caps = [[lo, [-F.a[0], -F.a[1], -F.a[2]]], [hi, F.a]], cs = caps.map(([, nr]) => d3(nr, V) > 1e-6);
  caps.forEach(([pts, nr], i) => { if (cs[i]) b[band(d3(nr, LZ))].push(pathOf(pts, true)); });
  const hull = pathOf(convexHull([...lo, ...hi]), true); let cr = '';
  for (let j = 0; j < n; j++) { const pv = (j - 1 + n) % n, a = [ring[j][0] - ring[pv][0], ring[j][1] - ring[pv][1]], c = [ring[(j + 1) % n][0] - ring[j][0], ring[(j + 1) % n][1] - ring[j][1]];
    if ((a[0] * c[0] + a[1] * c[1]) / (Math.hypot(a[0], a[1]) * Math.hypot(c[0], c[1]) || 1) < Math.cos(0.35) && seen[j] && seen[pv]) cr += pathOf([lo[j], hi[j]]);
    caps.forEach(([pts], i) => { if (cs[i] && seen[j]) cr += pathOf([pts[j], pts[(j + 1) % n]]); }); }
  let h = '<g class="iso-solid ' + cls + '"><path class="iso-fill" d="' + hull + '"/>';
  for (let t = 0; t < 4; t++) if (b[t].length) h += '<path class="iso-shade" data-shade="' + t + '" d="' + b[t].join('') + '"/>';
  if (b[4].length) h += '<path class="iso-top" d="' + b[4].join('') + '"/>';
  if (cr) h += '<path class="iso-line iso-crease" data-tone="faint" d="' + cr + '"/>';
  return h + '<path class="iso-line iso-edge" data-tone="' + (tone || 'mid') + '" d="' + hull + '"/></g>';
}
const FY = (x, y, z) => ({ o: [x, y, z], a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] });
const radial = (a, r0, r1, hw) => { const c = Math.cos(a), s = Math.sin(a), nx = -s * hw, nz = c * hw; return [[c * r0 + nx, s * r0 + nz], [c * r1 + nx, s * r1 + nz], [c * r1 - nx, s * r1 - nz], [c * r0 - nx, s * r0 - nz]]; };
const giraXZ = (pts, cx, cz, t) => pts.map(([x, z]) => [cx + (x - cx) * Math.cos(t) - (z - cz) * Math.sin(t), cz + (x - cx) * Math.sin(t) + (z - cz) * Math.cos(t)]);
// una rueda: los radios de atrás y las palas (detrás de la llanta de delante) y los radios de delante
function pintaRueda(Rd, fi, id) {
  const F = FY(Rd.x, Rd.y0, ZE), w = Rd.y1 - Rd.y0, palas = [];
  let tras = '';
  for (let i = 0; i < 6; i++) tras += prisma(F, radial(fi + i / 6 * Math.PI * 2, 2.3, Rd.r - 1.1, 0.42), 0, 0.8, 'madera');
  for (let i = 0; i < Rd.n; i++) { const a = fi + (i + 0.5) / Rd.n * Math.PI * 2; palas.push([dep([Rd.x + Math.cos(a) * Rd.r, Rd.y0 + w / 2, ZE + Math.sin(a) * Rd.r]), prisma(F, radial(a, Rd.r - 3, Rd.r + 0.8, 0.28), 0.8, w - 0.8, 'pala')]); }
  palas.sort((p, q) => p[0] - q[0]);
  el['rueda-' + id + '-tras'].innerHTML = tras + palas.map((p) => p[1]).join('');
  let del = ''; for (let i = 0; i < 6; i++) del += prisma(F, radial(fi + i / 6 * Math.PI * 2, 2.5, Rd.r - 1.1, 0.42), w - 0.8, w, 'madera');
  el['rueda-' + id + '-del'].innerHTML = del;
}
let s = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, txt = '', reloj = 0;
let fiA = 0, vA = 0, fiB = 0, vB = 0, hund = [0, 0], cola = 0, golpes = 0, arriba = false;
const chispas = [];
const tourAt = (t) => { const T = 3 * N + 2, f = (t % T) / T * (N + 0.71); const i = Math.floor(f); return Math.min(N - 0.001, i + sm((f - i) / 0.6) * 0.999); };
function draw(dt) {
  reloj += dt;
  const paso = Math.min(N - 1, Math.floor(s));
  // el agua: se llena el canal y caen los chorros sobre las ruedas (la del mazo, solo cuando trabaja el mazo)
  const agua = sm(s / 0.5), abreA = sm((s - 0.3) / 0.3), abreB = sm((s - 3.9) / 0.25) * (1 - sm((s - 5.15) / 0.25));
  el['agua-canal'].style.opacity = (0.25 + 0.75 * agua).toFixed(2); el['agua-dep'].style.opacity = (0.5 + 0.5 * agua).toFixed(2); el['agua-cauce'].style.opacity = (0.35 + 0.65 * abreA).toFixed(2);
  for (const [Rd, ab, id] of [[RA, abreA, 'a'], [RB, abreB, 'b']]) {
    const x = Rd.x + 2.4, yc = (Rd.y0 + Rd.y1) / 2, top = CANAL.z + 0.4, hit = ZE + (Rd.r + 0.6) * Math.sin(1.25), hx = Rd.x + (Rd.r + 0.6) * Math.cos(1.25);
    el['chorro-' + id].setAttribute('d', ab > 0.02 ? poly([[x - 1, yc - 1.1, top], [x + 0.6, yc - 1.1, top], [hx + 0.9, yc - 1.1, hit], [hx - 0.7, yc - 1.1, hit]]) : '');
    el['chorro-' + id].style.opacity = ab.toFixed(2);
  }
  let oc = ''; if (agua > 0.3) for (let i = 0; i < 5; i++) { const f = (reloj * 0.35 + i / 5) % 1, x = CANAL.x0 + 4 + f * (CANAL.x1 - CANAL.x0 - 8); oc += linea([[x, CANAL.y - 1.2, CANAL.z + 2.2], [x + 3, CANAL.y - 1.2, CANAL.z + 2.2]]); }
  el['ondas-canal'].innerHTML = oc ? '<path class="onda" d="' + oc + '"/>' : '';
  let ou = ''; if (abreA > 0.3) for (let i = 0; i < 6; i++) { const f = (reloj * 0.4 + i / 6) % 1, x = CAUCE.x0 + 3 + f * (CAUCE.x1 - CAUCE.x0 - 8), y = CAUCE.y0 + 2 + Q(i) * (CAUCE.y1 - CAUCE.y0 - 4); ou += linea([[x, y, 1], [x + 3.4, y, 1]]); }
  el['ondas-cauce'].innerHTML = ou ? '<path class="onda" d="' + ou + '"/>' : '';
  // las ruedas giran (hacia la derecha por arriba: el agua cae en las palas de ese lado)
  vA += (abreA * 1.5 - vA) * (1 - Math.exp(-dt / 0.9)); fiA -= vA * dt;
  vB += (abreB * 2.3 - vB) * (1 - Math.exp(-dt / 0.7)); fiB -= vB * dt;
  pintaRueda(RA, fiA, 'a'); pintaRueda(RB, fiB, 'b');
  // las levas del primer árbol aprietan la tapa de cada barquín; el contrapeso la vuelve a subir
  for (let i = 0; i < 2; i++) {
    const a = fiA + i * Math.PI, beta = wrap(-(a + Math.PI / 2)), quiere = beta > -0.91 && beta <= 0 ? Math.max(0, 8.5 * Math.cos(beta) - 5.2) : 0;
    hund[i] = quiere >= hund[i] ? quiere : hund[i] + (quiere - hund[i]) * (1 - Math.exp(-dt / 0.35));
    const f = FUELLES[i], hb = 8 - hund[i], Fu = FY(0, f.y0, 0);
    el['fuelle-' + i].innerHTML = prisma(Fu, [[FU.xa + 0.7, FU.z0 + 0.8], [FU.xb + 0.2, FU.z0 + 0.8], [FU.xb + 0.2, 4.4], [FU.xa + 0.7, hb]], 0.35, f.y1 - f.y0 - 0.35, 'cuero') +
      '<path class="iso-line" data-tone="lo" d="' + [0.25, 0.5, 0.75].map((t) => { const x = FU.xa + 0.7 + t * (FU.xb - FU.xa - 0.5), zt = hb + (4.4 - hb) * t; return linea([[x, f.y1 - 0.35, FU.z0 + 0.8], [x - 0.8, f.y1 - 0.35, (FU.z0 + 0.8 + zt) / 2], [x, f.y1 - 0.35, zt]]); }).join('') + '"/>' +
      prisma(Fu, [[FU.xa, hb], [FU.xb + 0.4, 4.4], [FU.xb + 0.4, 5.2], [FU.xa, hb + 0.8]], 0, f.y1 - f.y0, 'madera');
    el['leva-a' + i].innerHTML = prisma(FY(RA.x, LEVA_A[i] - 0.8, ZE), radial(a, 1.8, 8.5, 0.6), 0, 1.6, 'madera');
  }
  const sopla = (hund[0] + hund[1]) / 6.6;
  // el fuego: carbón y vena en la cuba; los barquines lo avivan
  const carga = sm((s - 1.1) / 0.6), fuego = clamp(0.18 + 0.6 * sm((s - 2.05) / 0.5) + 0.25 * sopla * sm((s - 1.9) / 0.4), 0, 1);
  let cg = ''; if (carga > 0.01) for (let i = 0; i < 22; i++) { const a = R(i) * Math.PI * 2, r = Math.sqrt(Q(i)) * (FUEGO.r - 1.2), q = at([FUEGO.x + Math.cos(a) * r, FUEGO.y + Math.sin(a) * r, HORNO.h + 1.05]); cg += '<circle class="' + (i % 4 === 0 ? 'trozo-vena' : 'brasa') + '" style="opacity:' + carga.toFixed(2) + '" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="' + (0.45 + R(i + 3) * 0.35).toFixed(2) + '"/>'; }
  el.carga.innerHTML = cg;
  el.carga.style.setProperty('--fuego', fuego.toFixed(2));
  el.ascuas.style.opacity = (fuego * 0.9).toFixed(2); el.boca.style.opacity = (0.2 + fuego * 0.8).toFixed(2);
  let ll = ''; if (fuego > 0.35) for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + 0.3, B = at([FUEGO.x + Math.cos(a) * 2.4, FUEGO.y + Math.sin(a) * 2.4, HORNO.h + 1.1]), h = ((fuego - 0.3) * (2.2 + 0.8 * Math.sin(reloj * 11 + i * 1.7))) * K, w = 0.55 * K; ll += '<path class="llama" d="M' + (B[0] - w).toFixed(1) + ' ' + B[1].toFixed(1) + 'Q' + B[0].toFixed(1) + ' ' + (B[1] - h * 1.5).toFixed(1) + ' ' + (B[0] + w).toFixed(1) + ' ' + B[1].toFixed(1) + 'Z"/>'; }
  el.llamas.innerHTML = ll;
  // el humo de la chimenea
  let hm = ''; for (let i = 0; i < 5; i++) { const f = (reloj * 0.22 + i / 5) % 1, q = at([CHIM.x + CHIM.w / 2 + f * 5 + Math.sin(reloj + i) * 0.8, CHIM.y + CHIM.d / 2 - f * 2, CHIM.h + 2 + f * 12]); hm += '<circle class="humo-b" style="opacity:' + ((1 - f) * (0.25 + 0.5 * fuego)).toFixed(2) + '" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="' + ((1.2 + f * 3.2) * K * 0.6).toFixed(2) + '"/>'; }
  el.humo.innerHTML = hm;
  // el mazo: las levas de la corona bajan la cola; al soltarla, la cabeza cae sobre el yunque
  let quiere = 0; for (let i = 0; i < 4; i++) { const beta = wrap(-(fiB + i * Math.PI / 2 + Math.PI / 2)); if (beta > -0.87 && beta <= 0) quiere = Math.max(quiere, 6.2 * Math.cos(beta) - 4); }
  if (quiere >= cola) cola = quiere; else cola += (quiere - cola) * (1 - Math.exp(-dt / 0.035));
  if (cola > 1.2) arriba = true;
  const enYunque = sm((s - 3.75) / 0.05), aplasta = sm((s - 4.05) / 0.9), sale = sm((s - 5.0) / 0.3);
  const lh = enYunque * (1 - sale) * (1.8 - 0.9 * aplasta);
  const th = Math.max(Math.asin(clamp(cola, 0, 7.9) / (MAZO.px - MAZO.cola + 0)), Math.asin(lh / (CAB.x0 / 2 + CAB.x1 / 2 - MAZO.px)));
  if (arriba && cola < 0.15) { arriba = false; golpes++; if (lh > 0.3) for (let i = 0; i < 12; i++) chispas.push({ p: [YUNQUE.x + (R(golpes * 7 + i) - 0.5) * 3, YUNQUE.y + (Q(golpes * 5 + i) - 0.5) * 3, YUNQUE.z + lh], v: [(R(golpes + i * 3) - 0.5) * 22, (Q(golpes * 3 + i) - 0.3) * 16, 6 + R(i + golpes) * 10], t: 0, T: 0.4 + R(i * 2 + golpes) * 0.4 }); }
  const fr = FY(0, MAZO.y0, 0), w = MAZO.y1 - MAZO.y0;
  const viga = giraXZ([[MAZO.x0, MAZO.pz - 1.2], [MAZO.x1, MAZO.pz - 1.2], [MAZO.x1, MAZO.pz + 1.2], [MAZO.x0, MAZO.pz + 1.2]], MAZO.px, MAZO.pz, th);
  const zuncho = (xc) => giraXZ([[xc - 0.3, MAZO.pz - 1.45], [xc + 0.3, MAZO.pz - 1.45], [xc + 0.3, MAZO.pz + 1.45], [xc - 0.3, MAZO.pz + 1.45]], MAZO.px, MAZO.pz, th);
  const chapa = giraXZ([[MAZO.cola - 2.2, MAZO.pz + 1.2], [MAZO.cola + 2.2, MAZO.pz + 1.2], [MAZO.cola + 2.2, MAZO.pz + 1.55], [MAZO.cola - 2.2, MAZO.pz + 1.55]], MAZO.px, MAZO.pz, th);
  const cab = giraXZ([[CAB.x0, CAB.zb], [CAB.x1, CAB.zb], [CAB.x1, CAB.zt], [CAB.x0, CAB.zt]], MAZO.px, MAZO.pz, th);
  el.mazo.innerHTML = prisma(fr, viga, 0, w, 'madera') + prisma(FY(0, MAZO.y0 - 0.25, 0), zuncho(-4.5), 0, w + 0.5, 'hierro') + prisma(FY(0, MAZO.y0 - 0.25, 0), zuncho(-15), 0, w + 0.5, 'hierro') +
    prisma(fr, chapa, 0, w, 'hierro') + prisma(FY(0, CAB.y0, 0), cab, 0, CAB.y1 - CAB.y0, 'hierro');
  let lv = ''; const dientes = [];
  for (let i = 0; i < 4; i++) { const a = fiB + i * Math.PI / 2; dientes.push([Math.sin(a), prisma(FY(RB.x, CORONA.y0 + 0.2, ZE), radial(a, CORONA.r - 0.2, 6.2, 0.75), 0, CORONA.y1 - CORONA.y0 - 0.4, 'madera')]); }
  el['levas-b'].innerHTML = dientes.map((d) => d[1]).join('');
  // la zamarra: se forma en el fuego, sale al rojo con las tenazas, va al yunque y el mazo la aplasta; luego es una barra
  const vuela = sm((s - 3.05) / 0.7), enFuego = sm((s - 2.4) / 0.5) * (1 - sm((s - 3.05) / 0.1));
  const A0 = [FUEGO.x, FUEGO.y, HORNO.h + 1.2], A1 = [YUNQUE.x, YUNQUE.y, YUNQUE.z];
  let zp = null, rx = 2.4, ry = 1.6;
  if (s >= 3.05 && s < 3.75) zp = [A0[0] + (A1[0] - A0[0]) * vuela, A0[1] + (A1[1] - A0[1]) * vuela, A0[2] + (A1[2] - A0[2]) * vuela + Math.sin(vuela * Math.PI) * 12];
  const frio = sm((s - 4.2) / 1.2);
  const blob = (p, rxx, ryy, op) => { const q = at(p); return '<ellipse class="zamarra" style="--frio:' + frio.toFixed(2) + ';opacity:' + op.toFixed(2) + '" cx="' + q[0].toFixed(1) + '" cy="' + (q[1] - ryy * K * 0.5).toFixed(1) + '" rx="' + (rxx * K * 0.75).toFixed(2) + '" ry="' + (ryy * K * 0.55).toFixed(2) + '"/>'; };
  el['zamarra-aire'].innerHTML = zp ? blob(zp, rx, ry, 1) : (enFuego > 0.02 ? blob([FUEGO.x, FUEGO.y, HORNO.h + 1.2], 1.6 + enFuego, 1.2, enFuego) : '');
  el['zamarra-yunque'].innerHTML = lh > 0.02 ? blob([YUNQUE.x, YUNQUE.y, YUNQUE.z], rx + 1.8 * aplasta, lh, 1 - sale) : '';
  // las tenazas, mientras se lleva y se golpea
  const tz = zp || (lh > 0.02 ? [YUNQUE.x, YUNQUE.y, YUNQUE.z + lh * 0.5] : null);
  if (tz && s >= 3.05 && s < 5.0) { const m = [tz[0] + 3, tz[1] + 8.5, tz[2] + 3.2], j1 = [tz[0] + 0.6, tz[1] + 1.4, tz[2] + 0.4], j2 = [tz[0] - 0.6, tz[1] + 1.4, tz[2] - 0.2];
    el.tenazas.innerHTML = '<path class="iso-line tenaza" data-tone="hi" d="' + linea([j1, m]) + linea([j2, m]) + '"/><g class="iso-dots" data-tone="hi"><circle r=".9" cx="' + at(m)[0].toFixed(1) + '" cy="' + at(m)[1].toFixed(1) + '"/><circle r=".45" cx="' + at(j1)[0].toFixed(1) + '" cy="' + at(j1)[1].toFixed(1) + '"/><circle r=".45" cx="' + at(j2)[0].toFixed(1) + '" cy="' + at(j2)[1].toFixed(1) + '"/></g>'; }
  else el.tenazas.innerHTML = '';
  // las chispas: del fuego cuando soplan los barquines, y del yunque en cada golpe
  if (fuego > 0.5 && Math.random() < dt * 14 * sopla) chispas.push({ p: [FUEGO.x + (Math.random() - 0.5) * 4, FUEGO.y + (Math.random() - 0.5) * 4, HORNO.h + 1.5], v: [(Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, 8 + Math.random() * 9], t: 0, T: 0.6 + Math.random() * 0.6 });
  let ch = ''; for (let i = chispas.length - 1; i >= 0; i--) { const c = chispas[i]; c.t += dt; if (c.t > c.T) { chispas.splice(i, 1); continue; } c.v[2] -= 30 * dt; c.p = [c.p[0] + c.v[0] * dt, c.p[1] + c.v[1] * dt, Math.max(0.2, c.p[2] + c.v[2] * dt)]; const q = at(c.p); ch += '<circle class="chispa" style="opacity:' + (1 - c.t / c.T).toFixed(2) + '" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r=".5"/>'; }
  el.chispas.innerHTML = ch;
  // las barras: las que había y las que salen
  const nb = 4 + Math.round(8 * sm((s - 5.05) / 0.85));
  barra.forEach((b, i) => { const on = i < nb; if (b.style.display !== (on ? '' : 'none')) b.style.display = on ? '' : 'none'; });
  // lo que trabaja en cada paso
  ilumina([el.deposito, el.canal, el['canaleta-a'], el['canaleta-b'], el['rueda-a'], el['rueda-b']], paso === 0);
  ilumina([el.carbon, el.vena, el.cesto], paso === 1); ilumina(el.horno, paso === 1 || paso === 3);
  ilumina([el['barquin-0'], el['barquin-1'], el['leva-a0'], el['leva-a1']], paso === 2);
  ilumina([el.mazo, el['levas-b'], el.yunque, el.escoria], paso === 4);
  ilumina(el.barras, paso === 5);
  const extra = ['el canal lleva el agua a las ruedas', 'carbón vegetal y mineral de hierro', 'soplan aire y el fuego se aviva', 'la masa de hierro sale al rojo', 'golpea la zamarra y le saca la escoria', 'el hierro, para los herreros'][paso];
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
  dark: { piedra: ['#2a2240', '#1a1430', '#201936', '#261e3e', '#2c2446', '#34294f'], madera: ['#3a2440', '#24142a', '#2c1a32', '#34203a', '#3c2642', '#442c4a'], pala: ['#3a2440', '#24142a', '#2c1a32', '#34203a', '#3c2642', '#442c4a'],
    hierro: ['#2a2a3a', '#16161f', '#1c1c28', '#232332', '#2a2a3c', '#343448'], cuero: ['#4a2a22', '#2a140f', '#341a14', '#3e2018', '#48261c', '#542e22'], carbon: ['#1a1620', '#0c0a10', '#121016', '#18141c', '#1e1a22', '#26202a'],
    vena: ['#5a2e24', '#341812', '#3e1e16', '#4a241a', '#552a1e', '#623226'], escoria: ['#2a2430', '#16121a', '#1c1820', '#221d28', '#28222e', '#302838'], mimbre: ['#6a5030', '#3e2e1a', '#4a3820', '#584226', '#664c2c', '#745834'] },
  light: { piedra: ['#e4dde8', '#bdb3c6', '#ccc3d4', '#d8d0de', '#e4dce8', '#f2ecf4'], madera: ['#e7d9cf', '#c2ae9f', '#d0beb0', '#dccbbe', '#e8d9cd', '#f4e8de'], pala: ['#e7d9cf', '#c2ae9f', '#d0beb0', '#dccbbe', '#e8d9cd', '#f4e8de'],
    hierro: ['#9a98aa', '#6e6c80', '#7c7a8e', '#8a889c', '#9896aa', '#aaa8bc'], cuero: ['#b07a5e', '#7e4e38', '#8e5c44', '#9e6a50', '#ae785c', '#c08a6e'], carbon: ['#4a4450', '#2a2630', '#34303a', '#3e3a44', '#48444e', '#56525c'],
    vena: ['#b8705a', '#86483a', '#985646', '#a86452', '#b8725e', '#c8846e'], escoria: ['#7a7282', '#544c5c', '#625a6a', '#6e6676', '#7a7282', '#8a8292'], mimbre: ['#d8b88a', '#a88a5e', '#b8986a', '#c8a876', '#d8b884', '#e8c896'] },
};
const colores = Object.entries(COLOR).map(([th, m]) => Object.entries(m).map(([cls, v]) => tonos(th === 'light' ? '.iso[data-theme="light"] ' : '', cls, v)).join('')).join('');
const CSS = COLORES + enJuego(WIDTH, HEIGHT) + `
.iso{--agua:#1f2a52;--onda:#9fb4ff;--hueco:#0d0718;--brasa:#ff8a3a;--brasa-fria:#5a2a1e;--llama:#ffb03a;--chispa:#ffd27a;--humo:#8c7aa8;--zamarra:#ffd27a;--zamarra-fria:#c8401a;--carbon-in:#141018;--trozo-carbon:#0a080e;--trozo-vena:#8a4030;--trozo-escoria:#3a3442}
.iso[data-theme="light"]{--agua:#cfe0f7;--onda:#4b6fd1;--hueco:#8c7a86;--brasa:#ff6a1a;--brasa-fria:#8a4a3a;--llama:#ff8a1a;--chispa:#ff9a1a;--humo:#a89cbc;--zamarra:#ffb02a;--zamarra-fria:#d0401a;--carbon-in:#4a4450;--trozo-carbon:#2a2630;--trozo-vena:#a85a44;--trozo-escoria:#5a5262}
.agua{fill:var(--agua)}.hueco{fill:var(--hueco)}.onda{fill:none;stroke:var(--onda);stroke-width:.5;stroke-linecap:round}.chorro{fill:var(--onda);opacity:.85}
.resplandor{fill:var(--brasa);opacity:0}.brasa{fill:color-mix(in srgb,var(--brasa) calc(var(--fuego,0)*100%),var(--brasa-fria))}.llama{fill:var(--llama);opacity:.85}
.chispa{fill:var(--chispa)}.humo-b{fill:var(--humo)}.carbon-in{fill:var(--carbon-in)}
.trozo-carbon{fill:var(--trozo-carbon)}.trozo-vena{fill:var(--trozo-vena)}.trozo-escoria{fill:var(--trozo-escoria)}
.zamarra{fill:color-mix(in srgb,var(--zamarra-fria) calc(var(--frio,0)*100%),var(--zamarra));stroke:var(--zamarra-fria);stroke-width:.5}
.tenaza{stroke-width:1;stroke-linecap:round}
[data-lit] .iso-edge,[data-lit].iso-line,[data-lit] .iso-line,[data-lit] .tb-edge{stroke:var(--anatomy-lit)}
[data-lit] .iso-top,[data-lit].iso-top{fill:var(--anatomy-lit-top)}
[data-lit] .iso-dots circle{fill:var(--anatomy-lit)}
` + colores;

const body = k.plateHtml({
  fig: 'Lámina 11',
  title: 'Cómo trabajaba una ferrería',
  hint: 'Pasa el ratón: paso a paso',
  readout: '1 · El agua',
  keys: [
    { mark: 'lit', label: 'La pieza que trabaja en cada paso: el agua y las ruedas, el carbón y la vena, los barquines, el horno, el mazo y las barras' },
    { mark: 'raised', label: 'Las levas del árbol aprietan los barquines y bajan la cola del mazo: al soltarla, la cabeza cae sobre el yunque' },
    { mark: 'flat', label: 'Todo lo mueve el agua del río' },
  ],
  caption: 'En las ferrerías se sacaba hierro del mineral con carbón vegetal y con la fuerza del agua. El canal llevaba el agua del río hasta las ruedas hidráulicas. El árbol de una rueda movía los barquines, dos grandes fuelles que soplaban aire al horno para avivar el fuego, y allí la vena se convertía en una masa de hierro al rojo, la zamarra. El árbol de la otra rueda levantaba con sus levas el mazo, que caía una y otra vez sobre el yunque para quitarle la escoria a la zamarra y estirarla en barras. En el Bidasoa hubo muchas ferrerías; su hierro iba a los herreros, que hacían herraduras, clavos, rejas de arado y herramientas.',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="La ferrería, paso a paso: las flechas pasan de un paso a otro" aria-valuemin="1" aria-valuemax="6">${svg}</div>`,
});

const html = k.pageHtml({ title: 'Cómo trabajaba una ferrería', theme, body, script: kitScript() + live }).replace('</style>', CSS + '</style>');
escribe('ferreria', html, theme);
