// Lámina isométrica interactiva del molino harinero de rodezno (skill Anatomy, 21 de noviembre de 2026; el autor:
// «explicaciones técnicas en 3D [...] todo lo que tenga que ver con Navarra»). Un molino hidráulico como los de los ríos
// navarros, sobre su tablero: el caz que trae el agua del río con su compuerta, el cubo donde el agua coge fuerza, el
// saetín que la dispara contra las cucharas del rodezno, en el cárcavo; el árbol que sube hasta las muelas (la volandera,
// que gira, sobre la solera, quieta), la tolva con su canaleja, el harinal, el cedazo que separa la harina del salvado, el
// celemín de la maquila y los sacos. Al recorrerlo se ve paso a paso, y en cada paso se ilumina la pieza que trabaja.
// La misma secuencia que la misión del molino (data/procesos.js, mill).
// Uso: node tools/anatomia/molino.mjs [--light]  →  entrega/anatomia/molino(-light).html (y public/anatomia, para el juego)
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';
import * as G from '../../.claude/skills/anatomy/kit/lathe.mjs';
import * as T from '../../.claude/skills/anatomy/kit/tube.mjs';
import { kitScript } from '../../.claude/skills/anatomy/scripts/inline-kit.mjs';
import { COLORES, enJuego, MARCA_JUEGO, escribe, PUENTE } from './comun.mjs';

const theme = process.argv.includes('--light') ? 'light' : 'dark';
const WIDTH = 600, HEIGHT = 340;

// ---------- el modelo (centímetros de la maqueta) ----------
const MOL = { x0: -62, x1: 30, y0: -42, y1: 0, piso: 30, losa: 3.5, muro: 12 };   // el cuerpo del molino: muros y piso
const ROD = { x: -16, y: -21, z0: 7, z1: 11, r: 13, rc: 4.2, n: 12 };          // el rodezno, en el cárcavo
const MUELA = { r: 14, z0: MOL.piso + MOL.losa, sol: 4, vol: 4.6 };             // solera y volandera
const CUBO = { x: -93, y: -21, r: 9, h: 40 };
const CAZ = { x0: -127, x1: -101, y: -21, z: 37, ancho: 8 };
const TOLVA = { z0: 52, z1: 64, arriba: 10, abajo: 2.2 };
const CEDAZO = { x: 50, y: -14, w: 30, d: 20, h: 14 };
const PASOS = ['El agua del caz', 'Gira el rodezno', 'Las muelas', 'La tolva', 'Harina y salvado', 'La maquila'];

// ---------- la cámara ----------
const PLATE = { x: -130, y: -50, w: 260, d: 104, r: 7 };
const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [ROD.x, ROD.y, TOLVA.z1 + 4], [CUBO.x, CUBO.y, CUBO.h + 3]], WIDTH, HEIGHT, { pad: 10, azimuth: 64, elevation: 30 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const dep = (p) => k.depthOf(p, P);
const linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L');
const poly = (pts) => linea(pts) + 'Z';
const FZ = (x, y, z = 0) => G.frameAlong([x, y, z], [0, 0, 1]);
const porDepth = (lista, f) => [...lista].sort((a, b) => dep(f(a)) - dep(f(b)));

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
  const regla = { x: -116, y: 42, w: 130, d: 5.5, r: 1 };
  out.push(S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
  const t = k.topTicks(regla.x + 3, regla.x + regla.w - 3, 2, 5, regla.y + 0.6, 0.6, [1.6, 3], P);
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
  out.push(D([at([regla.x + 1.5, regla.y + 2.8, 0.6]), at([regla.x + regla.w - 1.5, regla.y + 2.8, 0.6])], { size: 0.45 }));
  const placa = { x: 56, y: 41, w: 64, d: 7.5, r: 1.2 };
  out.push(S(k.slabOf(placa, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(placa, 1.1), 0.8, P, 4), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([placa.x + 5, placa.y + 4.4], 0.8, P, 'x'), 'MOLINO DE RODEZNO', { size: 2.4, tone: 'mid' }));
  out.push(D([at([placa.x + 2.2, placa.y + 3.75, 0.8]), at([placa.x + placa.w - 2.2, placa.y + 3.75, 0.8])], { size: 0.4 }));
  return out.join('');
}

// ---------- el caz con su compuerta, y el cubo ----------
function caz() {
  const out = [], { x0, x1, y, z, ancho } = CAZ;
  for (const px of [x0 + 8, x1 - 6]) out.push(S(k.slabOf({ x: px - 2.5, y: y - 3, w: 5, d: 6, r: 0.4 }, 0, z - 4, P, 2, 0.3), { tone: 'lo', className: 'piedra' }));
  // el canal: el fondo y las dos paredes, de piedra
  const F = G.frameOf([x0, y, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]), w = ancho / 2;
  out.push(S(G.prismOf(F, [[-w - 1.4, z - 4], [w + 1.4, z - 4], [w + 1.4, z + 2], [w, z + 2], [w, z - 2.6], [-w, z - 2.6], [-w, z + 2], [-w - 1.4, z + 2]], 0, x1 - x0 + 4, P), { tone: 'mid', className: 'caz' }));
  out.push(`<path data-part="agua-caz" class="agua" d="${poly([[x0 + 1, y - w, z - 0.4], [x1 + 4, y - w, z - 0.4], [x1 + 4, y + w, z - 0.4], [x0 + 1, y + w, z - 0.4]])}"/>`);
  // la compuerta (viva: sube) en sus guías
  out.push(S(k.slabOf({ x: x0 + 2, y: y - w - 2.2, w: 2.2, d: 1.6, r: 0.2 }, z - 3, 12, P, 1), { tone: 'lo' }));
  out.push(S(k.slabOf({ x: x0 + 2, y: y + w + 0.6, w: 2.2, d: 1.6, r: 0.2 }, z - 3, 12, P, 1), { tone: 'lo' }));
  out.push(S(k.slabOf({ x: x0 + 2, y: y - w - 2.2, w: 2.2, d: ancho + 4.4, r: 0.2 }, z + 9, 1.4, P, 1), { tone: 'mid' }));
  out.push(`<g data-part="compuerta"><path data-part="tabla" class="tabla" d=""/><path data-part="tabla-l" class="iso-line" data-tone="mid" d=""/><path data-part="husillo" class="iso-line" data-tone="mid" style="stroke-width:1.2" d=""/><g class="iso-dots" data-tone="mid"><circle data-part="manija" r="1.2"/></g></g>`);
  return out.join('');
}
function cubo() {
  const F = FZ(CUBO.x, CUBO.y), out = [];
  // (el pie, el cuerpo y el remate por separado: así la silueta del cuerpo es la suya y las juntas acaban en ella)
  out.push(S(k.cylinder(CUBO.x, CUBO.y, CUBO.r + 1.2, 0, 2, P, 40), { tone: 'lo' }));
  out.push(S(G.solidOf([[2, CUBO.r], [CUBO.h, CUBO.r]], F, P), { tone: 'mid', className: 'cubo' }));
  out.push(S(k.cylinder(CUBO.x, CUBO.y, CUBO.r + 0.8, CUBO.h, 1.2, P, 40), { tone: 'mid' }));
  // (las juntas de las hiladas: la mitad que mira hacia quien mira, de borde a borde)
  const fi = Math.atan2(dep([0, 1, 0]) - dep([0, 0, 0]), dep([1, 0, 0]) - dep([0, 0, 0]));
  const junta = (z) => { const pts = []; for (let i = 0; i <= 32; i++) { const t = fi - Math.PI / 2 + i / 32 * Math.PI; pts.push([CUBO.x + Math.cos(t) * CUBO.r, CUBO.y + Math.sin(t) * CUBO.r, z]); } return linea(pts); };
  out.push(L([8, 16, 24, 32].map(junta).join(''), { tone: 'lo' }));
  out.push(`<path class="hueco" d="${k.ring(CUBO.x, CUBO.y, CUBO.r - 1.6, CUBO.h + 1.2, P, 32)}"/>`, L(k.ring(CUBO.x, CUBO.y, CUBO.r - 1.6, CUBO.h + 1.2, P, 32), { tone: 'mid' }));
  out.push(`<path data-part="agua-cubo" class="agua" d="${k.ring(CUBO.x, CUBO.y, CUBO.r - 1.7, CUBO.h + 0.4, P, 32)}"/>`);
  return `<g data-part="cubo">${out.join('')}</g>`;
}

// ---------- el cuerpo del molino: muros, cárcavo y piso ----------
const muroIzq = { x: MOL.x0, y: MOL.y0, w: MOL.muro, d: MOL.y1 - MOL.y0, r: 0.6 };
const muroDer = { x: MOL.x1 - MOL.muro, y: MOL.y0, w: MOL.muro, d: MOL.y1 - MOL.y0, r: 0.6 };
const muroFondo = { x: MOL.x0 + MOL.muro, y: MOL.y0, w: MOL.x1 - MOL.x0 - 2 * MOL.muro, d: 5, r: 0.3 };
const sillares = (m) => L([7.5, 15, 22.5].map((z) => k.sideSeam(m, z, P, 2)).join(''), { tone: 'lo' });
// el saetín: del pie del cubo, por el muro, hasta las cucharas
const SAET = [[CUBO.x + CUBO.r - 1, CUBO.y, 6], [MOL.x0 - 2, CUBO.y, 6], [MOL.x0 + MOL.muro + 4, CUBO.y + 2, 7.5], [ROD.x - ROD.r - 2.5, ROD.y + 4.5, 9]];
const tuboSaetin = (a, b) => T.tubePieces(G.fillet(SAET.slice(a, b), 3), 1.6, P, { maxLength: 400 }).map((pc) => T.tubeSvg(pc, { tone: 'mid', className: 'saetin' })).join('');
function cuerpoAtras() {
  const out = [];
  out.push(S(k.slabOf(muroFondo, 0, MOL.piso, P, 2, 0.4), { tone: 'lo', className: 'piedra' }));
  out.push(tuboSaetin(0, 2));
  out.push(S(k.slabOf(muroIzq, 0, MOL.piso, P, 2, 0.4), { tone: 'mid', className: 'piedra' }), sillares(muroIzq));
  // la boca del cárcavo en el muro de la izquierda (un arco oscuro en la cara de delante)
  return out.join('');
}
function cuerpoDelante() {
  const out = [];
  out.push(S(k.slabOf(muroDer, 0, MOL.piso, P, 2, 0.4), { tone: 'mid', className: 'piedra' }), sillares(muroDer));
  const losa = { x: MOL.x0 - 1, y: MOL.y0 - 1, w: MOL.x1 - MOL.x0 + 2, d: MOL.y1 - MOL.y0 + 2, r: 0.8 };
  out.push(S(k.slabOf(losa, MOL.piso, MOL.losa, P, 3, 0.5), { tone: 'mid', className: 'piso' }));
  // las tablas del piso
  let tablas = ''; for (let x = losa.x + 9; x < losa.x + losa.w - 2; x += 9) tablas += linea([[x, losa.y + 0.4, MOL.piso + MOL.losa], [x, losa.y + losa.d - 0.4, MOL.piso + MOL.losa]]);
  out.push(L(tablas, { tone: 'faint' }));
  return out.join('');
}
// la canal por la que sale el agua del cárcavo, de vuelta al río
function salida() {
  const c = { x: ROD.x - 9, y: MOL.y1, w: 18, d: 38, r: 0.4 }, out = [];
  out.push(S(k.slabOf({ x: c.x - 2, y: c.y, w: c.w + 4, d: c.d, r: 0.4 }, 0, 2.2, P, 2, 0.3), { tone: 'lo', className: 'piedra' }));
  const agua = [[c.x, c.y, 2.25], [c.x + c.w, c.y, 2.25], [c.x + c.w, c.y + c.d - 1, 2.25], [c.x, c.y + c.d - 1, 2.25]];
  out.push(`<path data-part="agua-salida" class="agua" d="${poly(agua)}"/>`, `<g data-part="ondas"></g>`, L(poly(agua), { tone: 'mid' }));
  return out.join('');
}

// ---------- el rodezno (vivo: gira), el árbol y la rangua ----------
const bujeSvg = S(k.cylinder(ROD.x, ROD.y, ROD.rc, ROD.z0 - 0.5, ROD.z1 - ROD.z0 + 1, P, 24), { tone: 'mid', className: 'buje' });
function rodezno() {
  const out = [];
  out.push(S(k.slabOf({ x: ROD.x - 4, y: ROD.y - 4, w: 8, d: 8, r: 0.4 }, 0, 3, P, 2), { tone: 'lo' }));   // la rangua, donde apoya el árbol
  out.push(S(k.cylinder(ROD.x, ROD.y, 1.4, 3, ROD.z0 - 3, P, 16), { tone: 'mid' }));
  out.push(`<path data-part="chorro" class="chorro" d=""/>`);
  out.push(`<g data-part="rodezno"></g>`);
  out.push(S(k.cylinder(ROD.x, ROD.y, 1.6, ROD.z1 + 0.5, MOL.piso - ROD.z1 - 0.5, P, 16), { tone: 'hi', className: 'arbol' }));
  out.push(L([16, 23].map((z) => k.ring(ROD.x, ROD.y, 1.62, z, P, 16)).join(''), { tone: 'lo' }));
  return out.join('');
}

// ---------- las muelas, la tolva y el harinal ----------
const ZS = MUELA.z0, ZV = MUELA.z0 + MUELA.sol + 0.4, ZT = ZV + MUELA.vol;
const patasT = [[-11, -11], [11, -11], [-11, 11], [11, 11]].map(([dx, dy]) => [ROD.x + dx, ROD.y + dy]);
function muelas() {
  const out = [];
  out.push(S(k.cylinder(ROD.x, ROD.y, MUELA.r, ZS, MUELA.sol, P, 48, 0.6), { tone: 'lo', className: 'solera' }));
  out.push(`<g data-part="volandera">${S(k.cylinder(ROD.x, ROD.y, MUELA.r - 0.3, ZV, MUELA.vol, P, 48, 0.6), { tone: 'hi', className: 'volandera' })}`);
  out.push(`<path class="hueco" d="${k.ring(ROD.x, ROD.y, 2.6, ZT, P, 20)}"/>` + L(k.ring(ROD.x, ROD.y, 2.6, ZT, P, 20), { tone: 'mid' }) + `<path data-part="rayas" class="iso-line" data-tone="lo" d=""/></g>`);
  return out.join('');
}
function tolvaAtras() {
  const out = [];
  for (const [x, y] of porDepth(patasT.slice(0, 2), ([x, y]) => [x, y, 0])) out.push(S(k.cylinder(x, y, 0.9, ZS, TOLVA.z0 - ZS, P, 12), { tone: 'mid' }));
  return out.join('');
}
function tolvaDelante() {
  const out = [];
  for (const [x, y] of porDepth(patasT.slice(2), ([x, y]) => [x, y, 0])) out.push(S(k.cylinder(x, y, 0.9, ZS, TOLVA.z0 - ZS, P, 12), { tone: 'mid' }));
  // el bastidor de arriba y la tolva: una pirámide del revés
  out.push(S(k.slabOf({ x: ROD.x - 12, y: ROD.y - 12, w: 24, d: 24, r: 0.4 }, TOLVA.z0, 1.2, P, 2), { tone: 'mid' }));
  const a = TOLVA.arriba, b = TOLVA.abajo, cx = ROD.x, cy = ROD.y;
  const F = G.frameOf([cx, cy, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const caras = [];
  const sup = [[-a, -a], [a, -a], [a, a], [-a, a]], inf = [[-b, -b], [b, -b], [b, b], [-b, b]];
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; caras.push([[cx + inf[i][0], cy + inf[i][1], TOLVA.z0 + 1.2], [cx + inf[j][0], cy + inf[j][1], TOLVA.z0 + 1.2], [cx + sup[j][0], cy + sup[j][1], TOLVA.z1], [cx + sup[i][0], cy + sup[i][1], TOLVA.z1]]); }
  const tolva = caras.map((c) => ({ c, d: dep(c.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4, s[2] + p[2] / 4], [0, 0, 0])) })).sort((m, n) => m.d - n.d);
  out.push(`<g data-part="tolva">${tolva.map(({ c }, i) => `<path class="madera${i < 2 ? ' dentro' : ''}" d="${poly(c)}"/>` + L(poly(c), { tone: 'mid' })).join('')}`);
  out.push(`<path class="grano" d="${poly(sup.map(([x, y]) => [cx + x * 0.86, cy + y * 0.86, TOLVA.z1 - 2.2]))}"/></g>`);
  void F;
  // la canaleja: de la boca de la tolva al ojo de la muela, y los granos que caen (vivos)
  const c0 = [cx + 1.2, cy + 1.2, TOLVA.z0 - 0.4], c1 = [cx + 0.4, cy + 0.4, ZT + 1.2];
  out.push(`<g data-part="canaleja">${L(linea([c0, c1]), { tone: 'mid' })}${D([at(c0), at(c1)], { size: 0.55, tone: 'mid' })}</g>`);
  out.push(`<g data-part="granos"></g>`);
  return out.join('');
}
function harinal() {
  const h = { x: ROD.x - 7, y: MOL.y1 - 5.5, w: 14, d: 5, r: 0.4 }, out = [];
  out.push(S(k.slabOf(h, ZS, 5, P, 2, 0.3), { tone: 'mid', className: 'madera-s' }));
  out.push(`<path data-part="harina" class="harina" d=""/>`);
  out.push(L(poly([[h.x + 0.8, h.y + 0.8, ZS + 5], [h.x + h.w - 0.8, h.y + 0.8, ZS + 5], [h.x + h.w - 0.8, h.y + h.d - 0.8, ZS + 5], [h.x + 0.8, h.y + h.d - 0.8, ZS + 5]]), { tone: 'mid' }));
  return `<g data-part="harinal">${out.join('')}</g>`;
}

// ---------- el cedazo, el celemín de la maquila y los sacos ----------
function cedazo() {
  const { x, y, w, d, h } = CEDAZO, out = [];
  for (const [px, py] of porDepth([[x + 1, y + 1], [x + w - 3, y + 1], [x + 1, y + d - 3], [x + w - 3, y + d - 3]], ([a, b]) => [a, b, 0])) out.push(S(k.slabOf({ x: px, y: py, w: 2, d: 2, r: 0.2 }, 0, h, P, 1), { tone: 'mid' }));
  // las dos artesas de abajo: la harina (blanca) y el salvado (con motas)
  out.push(S(k.slabOf({ x: x + 2, y: y + 2, w: w / 2 - 3, d: d - 4, r: 0.4 }, 1.5, 3, P, 2), { tone: 'lo' }));
  out.push(S(k.slabOf({ x: x + w / 2 + 1, y: y + 2, w: w / 2 - 3, d: d - 4, r: 0.4 }, 1.5, 3, P, 2), { tone: 'lo' }));
  out.push(`<path class="harina" d="${poly([[x + 3, y + 3, 4.6], [x + w / 2 - 2, y + 3, 4.6], [x + w / 2 - 2, y + d - 3, 4.6], [x + 3, y + d - 3, 4.6]])}"/>`);
  const motas = []; for (let i = 0; i < 18; i++) { const u = (i * 0.618) % 1, v = (i * 0.37 + 0.1) % 1; motas.push(at([x + w / 2 + 2 + u * (w / 2 - 5), y + 3 + v * (d - 6), 4.6])); }
  out.push(`<path class="salvado" d="${poly([[x + w / 2 + 2, y + 3, 4.6], [x + w - 3, y + 3, 4.6], [x + w - 3, y + d - 3, 4.6], [x + w / 2 + 2, y + d - 3, 4.6]])}"/>`, D(motas, { size: 0.45, tone: 'mid' }));
  // el bastidor con la tela del tamiz (vivo: se sacude)
  const m = { x: x - 1, y: y - 1, w: w + 2, d: d + 2, r: 0.5 }, zt = h;
  let malla = '';
  for (let i = 1; i < 12; i++) { const xx = m.x + 1.2 + i * (m.w - 2.4) / 12; malla += linea([[xx, m.y + 1.2, zt + 1.6], [xx, m.y + m.d - 1.2, zt + 1.6]]); }
  for (let i = 1; i < 8; i++) { const yy = m.y + 1.2 + i * (m.d - 2.4) / 8; malla += linea([[m.x + 1.2, yy, zt + 1.6], [m.x + m.w - 1.2, yy, zt + 1.6]]); }
  const dentro = poly([[m.x + 1.2, m.y + 1.2, zt + 1.6], [m.x + m.w - 1.2, m.y + 1.2, zt + 1.6], [m.x + m.w - 1.2, m.y + m.d - 1.2, zt + 1.6], [m.x + 1.2, m.y + m.d - 1.2, zt + 1.6]]);
  out.push(`<g data-part="tamiz">${S(k.slabOf(m, zt, 1.8, P, 2, 0.3), { tone: 'mid', className: 'madera-s' })}<path class="tela" d="${dentro}"/>${L(malla, { tone: 'faint' })}${L(dentro, { tone: 'mid' })}</g>`);
  return `<g data-part="cedazo">${out.join('')}</g>`;
}
function celemin() {
  const c = { x: 62, y: 18, w: 12, d: 12, r: 0.5 }, out = [];
  out.push(S(k.slabOf(c, 0, 6, P, 2, 0.3), { tone: 'mid', className: 'madera-s' }));
  out.push(L(k.sideSeam(c, 3, P, 2), { tone: 'lo' }));
  out.push(S(G.sphereOf([c.x + 6, c.y + 6, 5.4], 4.6, P), { tone: 'hi', className: 'monton' }));
  return `<g data-part="celemin">${out.join('')}</g>`;
}
function saco(x, y, cls, rotulo) {
  const F = FZ(x, y), out = [];
  out.push(S(G.solidOf([[0, 6], [2.5, 7.4], [11, 7.1], [15, 5.2], [17.2, 2.4], [18.4, 2.8], [19.6, 1.6]], F, P), { tone: 'hi', className: cls }));
  out.push(L(G.arcOf(F, 17.6, 2.45, P), { tone: 'mid' }));
  if (rotulo) out.push(L(G.arcOf(F, 6, 7.35, P) + G.arcOf(F, 9, 7.25, P), { tone: 'lo' }));
  return out.join('');
}

// ---------- la figura ----------
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'Maqueta de un molino harinero de rodezno: el caz con su compuerta trae el agua al cubo; por el saetín, el chorro empuja las cucharas del rodezno, en el cárcavo, y el árbol hace girar la volandera sobre la solera; el grano baja de la tolva por la canaleja al ojo de la muela y sale como harina al harinal; el cedazo separa la harina del salvado y el celemín mide la maquila del molinero.',
  body: [
    tablero(),
    `<g data-part="caz">${caz()}</g>`,
    cubo(),
    cuerpoAtras(),
    rodezno(),
    tuboSaetin(2, 4),
    cuerpoDelante(),
    salida(),
    tolvaAtras(), muelas(), tolvaDelante(), harinal(),
    cedazo(), celemin(),
    `<g data-part="sacos">${saco(96, -28, 'saco', true)}${saco(108, -12, 'saco', false)}${saco(102, 16, 'saco-harina', true)}</g>`,
  ],
});

// ---------- lo que se mueve en la página ----------
const live = MARCA_JUEGO + `
const P = ${JSON.stringify(P)}, ROD = ${JSON.stringify(ROD)}, CAZ = ${JSON.stringify(CAZ)}, SAET = ${JSON.stringify(SAET)}, MOL = ${JSON.stringify(MOL)};
const ZT = ${ZT}, ZS = ${ZS}, TOLVA = ${JSON.stringify(TOLVA)}, BUJE = ${JSON.stringify(bujeSvg)}, CED = ${JSON.stringify(CEDAZO)};
const PASOS = ${JSON.stringify(PASOS)}, N = PASOS.length;
const at = (p) => iso(p, P), linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L'), poly = (pts) => linea(pts) + 'Z';
const dep = (p) => depthOf(p, P);
const stage = document.querySelector('.iso-stage'), svgEl = stage.querySelector('svg'), $ = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const el = { tabla: $('tabla'), tablaL: $('tabla-l'), husillo: $('husillo'), manija: $('manija'), aguaCaz: $('agua-caz'), aguaCubo: $('agua-cubo'), aguaSal: $('agua-salida'), ondas: $('ondas'),
  chorro: $('chorro'), rodezno: $('rodezno'), rayas: $('rayas'), granos: $('granos'), harina: $('harina'), tamiz: $('tamiz'),
  compuerta: $('compuerta'), caz: $('caz'), cubo: $('cubo'), volandera: $('volandera'), tolva: $('tolva'), canaleja: $('canaleja'), harinal: $('harinal'), cedazo: $('cedazo'), celemin: $('celemin'), sacos: $('sacos') };
const arbol = svgEl.querySelector('.arbol') && svgEl.querySelector('.arbol').closest('g');
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const ilumina = (lista, on) => { for (const n of [].concat(lista)) if (n && on !== n.hasAttribute('data-lit')) n.toggleAttribute('data-lit', on); };
let s = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, txt = '', reloj = 0, giro = 0, vel = 0;
const tourAt = (t) => { const T = 2.8 * N + 2, f = (t % T) / T * (N + 0.71); const i = Math.floor(f); return Math.min(N - 0.001, i + sm((f - i) / 0.6) * 0.999); };
function draw(dt) {
  reloj += dt;
  const paso = Math.min(N - 1, Math.floor(s));
  // la compuerta sube y el agua corre por el caz, llena el cubo y sale por el saetín
  const abre = sm(s / 0.7), w = CAZ.ancho / 2, x = CAZ.x0 + 3.1, z0 = CAZ.z - 2.6 + abre * 8;
  const tabla = [[x, CAZ.y - w - 0.6, z0], [x, CAZ.y + w + 0.6, z0], [x, CAZ.y + w + 0.6, z0 + 9], [x, CAZ.y - w - 0.6, z0 + 9]];
  el.tabla.setAttribute('d', poly(tabla)); el.tablaL.setAttribute('d', poly(tabla));
  const tz = z0 + 9, top = CAZ.z + 10.4 + 6; el.husillo.setAttribute('d', linea([[x, CAZ.y, tz], [x, CAZ.y, top]]));
  const pm = at([x, CAZ.y, top]); el.manija.setAttribute('cx', pm[0].toFixed(1)); el.manija.setAttribute('cy', pm[1].toFixed(1));
  const agua = sm((s - 0.25) / 0.6);
  el.aguaCaz.style.opacity = (0.25 + 0.75 * agua).toFixed(2); el.aguaCubo.style.opacity = agua.toFixed(2); el.aguaSal.style.opacity = (0.3 + 0.7 * agua).toFixed(2);
  // el chorro del saetín contra las cucharas
  const m = SAET[SAET.length - 1], a0 = Math.atan2(m[1] - ROD.y, m[0] - ROD.x), hit = [ROD.x + Math.cos(a0 + 0.5) * (ROD.r - 1), ROD.y + Math.sin(a0 + 0.5) * (ROD.r - 1), ROD.z0 + 2];
  const ux = hit[0] - m[0], uy = hit[1] - m[1], ul = Math.hypot(ux, uy), nx = -uy / ul * 0.9, ny = ux / ul * 0.9;
  el.chorro.setAttribute('d', agua > 0.02 ? poly([[m[0] + nx, m[1] + ny, m[2]], [hit[0] + nx * 1.6, hit[1] + ny * 1.6, hit[2]], [hit[0] - nx * 1.6, hit[1] - ny * 1.6, hit[2]], [m[0] - nx, m[1] - ny, m[2]]]) : '');
  el.chorro.style.opacity = agua.toFixed(2);
  // el rodezno y la volandera giran juntos (el mismo árbol)
  vel += ((agua > 0.5 ? 2.4 : 0) - vel) * (1 - Math.exp(-dt / 0.8)); giro += vel * dt;
  const back = [], front = [];
  for (let i = 0; i < ROD.n; i++) {
    const a = giro + i / ROD.n * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), c2 = Math.cos(a + 0.22), s2 = Math.sin(a + 0.22);
    const q = [[ROD.x + c * ROD.rc, ROD.y + sn * ROD.rc, ROD.z0], [ROD.x + c2 * ROD.r, ROD.y + s2 * ROD.r, ROD.z0 + 0.6], [ROD.x + c2 * ROD.r, ROD.y + s2 * ROD.r, ROD.z1 - 0.6], [ROD.x + c * ROD.rc, ROD.y + sn * ROD.rc, ROD.z1]];
    const d = poly(q), html = '<path class="alabe" d="' + d + '"/><path class="iso-line" data-tone="mid" d="' + d + '"/>';
    (dep([ROD.x + c * 8, ROD.y + sn * 8, ROD.z0]) < dep([ROD.x, ROD.y, ROD.z0]) ? back : front).push([dep(q[1]), html]);
  }
  back.sort((p, q) => p[0] - q[0]); front.sort((p, q) => p[0] - q[0]);
  el.rodezno.innerHTML = back.map((b) => b[1]).join('') + BUJE + front.map((f) => f[1]).join('');
  let rayas = ''; for (let i = 0; i < 6; i++) { const a = giro + i / 6 * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), c2 = Math.cos(a + 0.35), s2 = Math.sin(a + 0.35); rayas += linea([[ROD.x + c * 2.6, ROD.y + sn * 2.6, ZT], [ROD.x + c2 * 13.4, ROD.y + s2 * 13.4, ZT]]); }
  el.rayas.setAttribute('d', rayas);
  // los granos bajan por la canaleja al ojo de la muela
  let gr = '';
  if (s > 3 && s < 5.6) for (let i = 0; i < 6; i++) { const f = (reloj * 1.4 + i / 6) % 1, p = at([ROD.x + 1.2 - 0.8 * f, ROD.y + 1.2 - 0.8 * f, TOLVA.z0 - 0.4 - (TOLVA.z0 - 0.4 - ZT - 1.2) * f]); gr += '<circle class="granito" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r=".7"/>'; }
  el.granos.innerHTML = gr;
  // la harina se junta en el harinal
  const hl = sm((s - 3.1) / 1.4), hx = ROD.x - 6.2, hy = MOL.y1 - 4.7, hw = 12.4, hd = 3.4, hz = ZS + 1 + hl * 3.4;
  el.harina.setAttribute('d', hl > 0.02 ? poly([[hx, hy, hz], [hx + hw, hy, hz], [hx + hw, hy + hd, hz], [hx, hy + hd, hz]]) : '');
  // el tamiz se sacude
  const sac = paso === 4 ? Math.sin(reloj * 26) * 0.8 : 0; el.tamiz.setAttribute('transform', 'translate(' + sac.toFixed(2) + ' 0)');
  // las ondas del agua que vuelve al río
  let on = '';
  if (agua > 0.5) for (let i = 0; i < 3; i++) { const f = (reloj * 0.5 + i / 3) % 1, cx = ROD.x, cy = MOL.y1 + 8 + f * 24, r = 2 + f * 5, pts = []; for (let j = 0; j < 20; j++) { const t = j / 20 * Math.PI * 2; pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r * 0.6, 2.3]); } on += '<path class="onda" style="opacity:' + (1 - f).toFixed(2) + '" d="' + poly(pts) + '"/>'; }
  el.ondas.innerHTML = on;
  // lo que trabaja en cada paso
  ilumina([el.caz, el.cubo], paso === 0); ilumina([el.rodezno, el.chorro, arbol], paso === 1); ilumina(el.volandera, paso === 2);
  ilumina([el.tolva, el.canaleja], paso === 3); ilumina([el.cedazo, el.harinal], paso === 4); ilumina([el.celemin, el.sacos], paso === 5);
  const extra = ['el río, desviado hasta el cubo', 'el chorro empuja las cucharas', 'la volandera gira; la solera, quieta', 'el grano cae al ojo de la muela', 'el cedazo separa el salvado', 'el pago del molinero, en harina'][paso];
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

const CSS = COLORES + enJuego(WIDTH, HEIGHT) + `
.iso{--agua:#1f2a52;--onda:#9fb4ff;--hueco:#0d0718;--madera:#3a2440;--madera-in:#2a1a30;--harina:#efe6f6;--harina-s:#c9bcd9;--salvado:#6b4a3e;--grano:#b08a3a;--tela:#2c1f40}
.iso[data-theme="light"]{--agua:#cfe0f7;--onda:#4b6fd1;--hueco:#8c7a86;--madera:#e7d9cf;--madera-in:#d3c1b6;--harina:#ffffff;--harina-s:#e4dcef;--salvado:#b98f74;--grano:#c99a3a;--tela:#efe9f7}
.agua{fill:var(--agua)}.hueco{fill:var(--hueco)}.harina{fill:var(--harina)}.salvado{fill:var(--salvado)}.tela{fill:var(--tela)}
.madera{fill:var(--madera)}.madera.dentro{fill:var(--madera-in)}.grano{fill:var(--grano)}.granito{fill:var(--grano)}
.chorro{fill:var(--onda);opacity:.8}.alabe{fill:var(--anatomy-face)}.tabla{fill:var(--madera)}
.onda{fill:none;stroke:var(--onda);stroke-width:.5}
.saco .iso-top,.saco .iso-fill{fill:var(--madera)}
.saco-harina .iso-top,.saco-harina .iso-fill,.monton .iso-top,.monton .iso-fill{fill:var(--harina);stroke:var(--harina)}
.saco-harina .iso-shade,.monton .iso-shade{fill:var(--harina-s);stroke:var(--harina-s)}
.saco .iso-shade{fill:var(--madera-in);stroke:var(--madera-in)}
[data-lit] .iso-edge,[data-lit].iso-line,[data-lit] .iso-line,[data-lit] .tb-edge{stroke:var(--anatomy-lit)}
[data-lit] .iso-top,[data-lit].iso-top{fill:var(--anatomy-lit-top)}
[data-lit] .iso-dots circle{fill:var(--anatomy-lit)}
`;

const body = k.plateHtml({
  fig: 'Lámina 5',
  title: 'Cómo funciona el molino',
  hint: 'Pasa el ratón: paso a paso',
  readout: '1 · El agua del caz',
  keys: [
    { mark: 'lit', label: 'La pieza que trabaja en cada paso: caz y cubo, rodezno, muelas, tolva, cedazo y maquila' },
    { mark: 'raised', label: 'El árbol: un solo eje une el rodezno, abajo, con la volandera, arriba' },
    { mark: 'flat', label: 'El agua no toca la harina: mueve el rodezno en el cárcavo y vuelve al río' },
  ],
  caption: 'En los ríos de Navarra había molinos de rodezno. El caz desvía el agua del río hasta el cubo, donde coge fuerza, y el saetín la dispara contra las cucharas del rodezno, una rueda tumbada en el cárcavo. Su eje, el árbol, sube hasta las muelas y hace girar la volandera sobre la solera, que está quieta. El grano baja de la tolva por la canaleja al ojo de la muela y sale molido al harinal; el cedazo separa la harina del salvado. El molinero cobraba con una parte de la harina: la maquila.',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="El molino, paso a paso: las flechas pasan de un paso a otro" aria-valuemin="1" aria-valuemax="6">${svg}</div>`,
});

const html = k.pageHtml({ title: 'Cómo funciona el molino', theme, body, script: kitScript() + live }).replace('</style>', CSS + '</style>');
escribe('molino', html, theme);
