// Lámina isométrica interactiva del aceite de oliva (skill Anatomy, 21 de noviembre de 2026; el autor: «la elaboración de
// diferentes alimentos [...] todo lo que tenga que ver con Navarra»). Una almazara en maqueta, sobre su tablero: el olivo
// con el manto debajo y la vara, el cajón de aceitunas; la tolva y la lavadora con su soplante; el empiedro (dos rulos de
// piedra que ruedan sobre la solera), la batidora con su termómetro (a menos de 27 °C: en frío), la centrífuga horizontal que
// separa el aceite del agua y del orujo, y la bodega: dos depósitos con su nivel y la botella. Al recorrerlo se ve paso a
// paso y se ilumina la pieza que trabaja. La misma secuencia que el producto del aceite (data/procesos.js, olive).
// Uso: node tools/anatomia/aceite.mjs [--light]  →  entrega/anatomia/aceite(-light).html (y public/anatomia, para el juego)
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';
import * as G from '../../.claude/skills/anatomy/kit/lathe.mjs';
import * as T from '../../.claude/skills/anatomy/kit/tube.mjs';
import { kitScript } from '../../.claude/skills/anatomy/scripts/inline-kit.mjs';
import { COLORES, enJuego, MARCA_JUEGO, escribe, PUENTE } from './comun.mjs';

const theme = process.argv.includes('--light') ? 'light' : 'dark';
const WIDTH = 600, HEIGHT = 235;

// ---------- el modelo (centímetros de la maqueta) ----------
const OLV = { x: -116, y: -26 };                                                  // el olivo
const MANTO = { x: -132, y: -44, w: 30, d: 34 };
const CAJA = { x: -100, y: -14, w: 12, d: 9, h: 6 };
const LAV = { x: -92, y: -40, w: 24, d: 16, h: 11 };                              // la lavadora
const TOL = { x: -97, y: -32, z0: 13, z1: 21, a: 5, b: 1.6 };                     // la tolva de recepción
const EMP = { x: -50, y: -26, r: 12, h: 5.5, rr: 3.6, rR: 4.8, r0: 2.4, r1: 10.4 };   // el empiedro: solera y rulos
const BAT = { x0: -28, x1: -4, y: -30, z: 13, R: 6 };                              // la batidora, un medio cilindro
const DEC = { x0: 8, y: -28, z: 12, L: 30, r: 6 };                                // la centrífuga (decánter)
const DEP = [[62, -36], [78, -30]], DR = 6, DH = 24;                              // los depósitos de la bodega
const BOT = { x: 96, y: -10 };
const PASOS = ['La recogida', 'El lavado', 'La molienda', 'El batido', 'La centrífuga', 'La bodega'];

// ---------- la cámara ----------
const PLATE = { x: -138, y: -52, w: 254, d: 60, r: 7 };
const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [OLV.x, OLV.y, 24], [DEP[0][0], DEP[0][1], DH + 2], [EMP.x, EMP.y, 27]], WIDTH, HEIGHT, { pad: 10, azimuth: 76, elevation: 30 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const dep = (p) => k.depthOf(p, P);
const linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L');
const poly = (pts) => linea(pts) + 'Z';
const FZ = (x, y, z = 0) => G.frameAlong([x, y, z], [0, 0, 1]);
const porDepth = (lista, f) => [...lista].sort((a, b) => dep(f(a)) - dep(f(b)));
const unit = (v) => { const l = Math.hypot(...v); return v.map((c) => c / l); };
const mas = (a, b, t = 1) => a.map((v, i) => v + b[i] * t);
const VIS = Math.atan2(dep([0, 1, 0]) - dep([0, 0, 0]), dep([1, 0, 0]) - dep([0, 0, 0]));
const arcoDelante = (x, y, r, z, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const t = VIS - Math.PI / 2 + i / n * Math.PI; return [x + Math.cos(t) * r, y + Math.sin(t) * r, z]; });
const banda = (x, y, r, z0, z1) => poly([...arcoDelante(x, y, r, z0), ...arcoDelante(x, y, r, z1).reverse()]);
const circulo = (pts) => pts.map((p) => { const q = at(p); return q; });
// (puntos repartidos sin hacer filas: la sucesión R2)
const R2x = (i) => (0.5 + i * 0.7548776662) % 1, R2y = (i) => (0.5 + i * 0.5698402910) % 1;
const oliva = (p, r = 0.75) => { const q = at(p); return `<circle class="oliva" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${r}"/>`; };

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
  const regla = { x: -94, y: -3, w: 92, d: 5.5, r: 1 };
  out.push(S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
  const t = k.topTicks(regla.x + 3, regla.x + regla.w - 3, 2, 5, regla.y + 0.6, 0.6, [1.6, 3], P);
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
  out.push(D([at([regla.x + 1.5, regla.y + 2.8, 0.6]), at([regla.x + regla.w - 1.5, regla.y + 2.8, 0.6])], { size: 0.45 }));
  const placa = { x: 8, y: -4, w: 70, d: 7.5, r: 1.2 };
  out.push(S(k.slabOf(placa, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(placa, 1.1), 0.8, P, 4), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([placa.x + 5, placa.y + 4.4], 0.8, P, 'x'), 'ACEITE DE NAVARRA', { size: 2.4, tone: 'mid' }));
  out.push(D([at([placa.x + 2.2, placa.y + 3.75, 0.8]), at([placa.x + placa.w - 2.2, placa.y + 3.75, 0.8])], { size: 0.4 }));
  return out.join('');
}

// ---------- el olivo, el manto y la vara ----------
const COPAS = [[-4.5, -2.5, 15.5, 4.6], [4, -3.5, 16.5, 4.4], [-1, 3.5, 15, 4.4], [1.5, -0.5, 20, 4.8], [-4.5, 2.5, 19, 3.8], [5, 2.6, 19.4, 3.8]];
function olivo() {
  const { x, y } = OLV, out = [], m = MANTO;
  // el manto, con su malla (de borde a borde), y las aceitunas ya caídas
  const esq = [[m.x, m.y, 0.25], [m.x + m.w, m.y, 0.25], [m.x + m.w, m.y + m.d, 0.25], [m.x, m.y + m.d, 0.25]];
  out.push(`<g data-part="manto"><path class="manto" d="${poly(esq)}"/>${L(poly(esq), { tone: 'mid' })}`);
  let malla = ''; for (let i = 1; i < 7; i++) { const xx = m.x + i * m.w / 7; malla += linea([[xx, m.y, 0.25], [xx, m.y + m.d, 0.25]]); } for (let i = 1; i < 8; i++) { const yy = m.y + i * m.d / 8; malla += linea([[m.x, yy, 0.25], [m.x + m.w, yy, 0.25]]); }
  out.push(L(malla, { tone: 'faint' }));
  const caidas = Array.from({ length: 22 }, (_, i) => [m.x + 2 + R2x(i) * (m.w - 4), m.y + 2 + R2y(i) * (m.d - 4), 0.6]);
  out.push(`<g data-part="caidas">${caidas.map((p, i) => `<g data-part="caida-${i}" style="display:none">${oliva(p)}</g>`).join('')}</g></g>`);
  // el tronco retorcido y las ramas que suben a la copa
  out.push(S(G.solidOf([[0, 2.9], [0.8, 2.4, true], [3.5, 1.9, true], [6.5, 2.2, true], [9, 1.7, true], [11, 1.4]], FZ(x, y), P), { tone: 'mid', className: 'tronco' }));
  let ramas = ''; for (const [dx, dy, z] of COPAS) ramas += linea([[x, y, 10.6], [x + dx * 0.6, y + dy * 0.6, z - 2]]);
  out.push(L(ramas, { tone: 'mid', className: 'rama' }));
  // la copa: matas de hoja gris verdosa con las aceitunas negras
  const piezas = COPAS.map(([dx, dy, z, r], i) => {
    const c = [x + dx, y + dy, z], ol = [];
    for (let j = 0; j < 7; j++) { const a = j * 2.4 + i, b = 0.3 + (j % 3) * 0.35; ol.push([c[0] + Math.cos(a) * r * 0.75 * Math.cos(b), c[1] + Math.sin(a) * r * 0.75 * Math.cos(b), c[2] + r * 0.6 * Math.sin(b) - 0.6]); }
    const vis = ol.filter((p) => dep(p) > dep(c));
    return [dep(c), S(G.sphereOf(c, r, P), { tone: 'mid', className: 'copa' }) + vis.map((p) => oliva(p, 0.65)).join('')];
  });
  out.push(piezas.sort((a, b) => a[0] - b[0]).map((p) => p[1]).join(''));
  out.push(`<g data-part="vara"><path data-part="vara-l" class="iso-line vara" data-tone="mid" d=""/><g class="iso-dots" data-tone="mid"><circle data-part="vara-a" r="0.7"/><circle data-part="vara-b" r="0.7"/></g></g><g data-part="caen-ol"></g>`);
  return `<g data-part="olivo">${out.join('')}</g>`;
}
function cajon() {
  const { x, y, w, d, h } = CAJA, out = [], e = 1;
  out.push(S(k.slabOf({ x, y, w, d, r: 0.3 }, 0, 0.8, P, 2), { tone: 'lo', className: 'madera' }));
  out.push(S(k.slabOf({ x, y, w, d: e, r: 0.2 }, 0.8, h - 0.8, P, 1), { tone: 'lo', className: 'madera' }), S(k.slabOf({ x, y, w: e, d, r: 0.2 }, 0.8, h - 0.8, P, 1), { tone: 'lo', className: 'madera' }));
  out.push(`<path class="aceitunas" d="${poly([[x + e, y + e, h - 1], [x + w - e, y + e, h - 1], [x + w - e, y + d - e, h - 1], [x + e, y + d - e, h - 1]])}"/>`);
  out.push(Array.from({ length: 16 }, (_, i) => [x + 1.8 + R2x(i) * (w - 3.6), y + 1.8 + R2y(i) * (d - 3.6), h - 0.8]).map((p) => oliva(p, 0.6)).join(''));
  out.push(S(k.slabOf({ x: x + w - e, y, w: e, d, r: 0.2 }, 0.8, h - 0.8, P, 1), { tone: 'mid', className: 'madera' }), S(k.slabOf({ x, y: y + d - e, w, d: e, r: 0.2 }, 0.8, h - 0.8, P, 1), { tone: 'mid', className: 'madera' }));
  out.push(L(k.sideSeam({ x, y, w, d, r: 0.3 }, h / 2 + 0.4, P, 2), { tone: 'lo' }));
  return `<g data-part="caja">${out.join('')}</g>`;
}

// ---------- la tolva y la lavadora con su soplante ----------
function lavadora() {
  const { x, y, w, d, h } = LAV, out = [];
  for (const [px, py] of porDepth([[x + 1, y + 1], [x + w - 3, y + 1], [x + 1, y + d - 3], [x + w - 3, y + d - 3]], ([a, b]) => [a, b, 0])) out.push(S(k.slabOf({ x: px, y: py, w: 2, d: 2, r: 0.3 }, 0, 4, P, 1), { tone: 'mid', className: 'acero' }));
  out.push(S(k.slabOf({ x, y, w, d, r: 0.6 }, 4, h - 4, P, 2, 0.3), { tone: 'mid', className: 'acero' }));
  out.push(L(k.sideSeam({ x, y, w, d, r: 0.6 }, 7.5, P, 2), { tone: 'lo' }));
  const agua = [[x + 1.2, y + 1.2, h - 0.8], [x + w - 1.2, y + 1.2, h - 0.8], [x + w - 1.2, y + d - 1.2, h - 0.8], [x + 1.2, y + d - 1.2, h - 0.8]];
  out.push(`<path class="agua" d="${poly(agua)}"/>${L(poly(agua), { tone: 'mid' })}<g data-part="flotan"></g>`);
  // el soplante, a un lado: la caja y su rejilla, y las hojas que echa (vivas)
  const s = { x: x + w + 0.6, y: y + 3, w: 5, d: 10, r: 0.4 };
  out.push(S(k.slabOf(s, 6, 9, P, 2, 0.3), { tone: 'mid', className: 'acero' }));
  let rej = ''; for (let i = 1; i < 6; i++) rej += linea([[s.x + s.w, s.y + 1, 6 + i * 1.5], [s.x + s.w, s.y + s.d - 1, 6 + i * 1.5]]);
  out.push(L(rej + poly([[s.x + s.w, s.y + 1, 7.2], [s.x + s.w, s.y + s.d - 1, 7.2], [s.x + s.w, s.y + s.d - 1, 13.8], [s.x + s.w, s.y + 1, 13.8]]), { tone: 'lo' }));
  out.push(`<g data-part="hojas-vuelan"></g>`);
  return `<g data-part="lavadora">${out.join('')}</g>`;
}
function tolva() {
  const out = [], { x, y, z0, z1, a, b } = TOL;
  for (const [px, py] of porDepth([[x - 4, y - 4], [x + 4, y - 4], [x - 4, y + 4], [x + 4, y + 4]], ([p, q]) => [p, q, 0])) out.push(S(k.cylinder(px, py, 0.6, 0, z0, P, 10), { tone: 'mid' }));
  const sup = [[-a, -a], [a, -a], [a, a], [-a, a]], inf = [[-b, -b], [b, -b], [b, b], [-b, b]], caras = [];
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; caras.push([[x + inf[i][0], y + inf[i][1], z0], [x + inf[j][0], y + inf[j][1], z0], [x + sup[j][0], y + sup[j][1], z1], [x + sup[i][0], y + sup[i][1], z1]]); }
  const orden = caras.map((c) => ({ c, d: dep(c.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4, s[2] + p[2] / 4], [0, 0, 0])) })).sort((m, n) => m.d - n.d);
  out.push(orden.slice(0, 2).map(({ c }) => `<path class="chapa dentro" d="${poly(c)}"/>` + L(poly(c), { tone: 'mid' })).join(''));
  out.push(`<path class="aceitunas" d="${poly(sup.map(([p, q]) => [x + p * 0.85, y + q * 0.85, z1 - 1.4]))}"/>`);
  out.push([[-2, -1.5], [1.6, -2.2], [0, 1.8], [2.4, 1.2], [-2.6, 1.6]].map(([p, q]) => oliva([x + p, y + q, z1 - 1.2], 0.6)).join(''));
  out.push(orden.slice(2).map(({ c }) => `<path class="chapa" d="${poly(c)}"/>` + L(poly(c), { tone: 'mid' })).join(''));
  return `<g data-part="tolva">${out.join('')}</g>`;
}

// ---------- el empiedro: la solera y los dos rulos que ruedan (vivos) ----------
function empiedro() {
  const { x, y, r, h } = EMP, out = [];
  // (el zócalo y el cuerpo por separado: así la silueta del cuerpo es la suya y la junta acaba en ella)
  out.push(S(k.cylinder(x, y, r + 1.4, 0, 1.4, P, 48, 0.4), { tone: 'lo', className: 'piedra' }));
  out.push(S(G.solidOf([[1.4, r], [h, r]], FZ(x, y), P), { tone: 'mid', className: 'piedra' }));
  out.push(L(k.pathOf(arcoDelante(x, y, r, 3.4).map(at)), { tone: 'lo' }));
  out.push(`<path class="hueco" d="${k.ring(x, y, r - 1.2, h, P, 48)}"/>`, L(k.ring(x, y, r - 1.2, h, P, 48), { tone: 'mid' }));
  out.push(`<path data-part="pasta" class="pasta" d="${k.ring(x, y, r - 1.4, h - 0.4, P, 48)}" style="opacity:.15"/>`);
  // el puente de arriba: dos postes y el travesaño, con el cojinete del árbol
  out.push(poste(y - r - 3));   // (el de atrás, antes que los rulos; el de delante, después)
  return out.join('');
}
const poste = (py) => S(k.slabOf({ x: EMP.x - 1.2, y: py - 1.2, w: 2.4, d: 2.4, r: 0.3 }, 0, 24, P, 1), { tone: 'lo', className: 'madera' });
function empiedroArriba() {
  const { x, y, r } = EMP;
  return poste(y + r + 3) + S(k.slabOf({ x: x - 1.6, y: y - r - 4.2, w: 3.2, d: 2 * r + 8.4, r: 0.4 }, 24, 2.4, P, 1, 0.3), { tone: 'mid', className: 'madera' }) + S(k.cylinder(x, y, 1.6, 22.4, 1.6, P, 16), { tone: 'mid' });
}

// ---------- la batidora: el medio cilindro, la pasta, las palas (vivas) y el termómetro ----------
function batidora() {
  const { x0, x1, y, z, R } = BAT, out = [], L0 = x1 - x0;
  for (const [px, py] of porDepth([[x0 + 1, y - R + 1], [x1 - 3, y - R + 1], [x0 + 1, y + R - 3], [x1 - 3, y + R - 3]], ([a, b]) => [a, b, 0])) out.push(S(k.slabOf({ x: px, y: py, w: 2, d: 2, r: 0.3 }, 0, z - R + 1, P, 1), { tone: 'mid', className: 'acero' }));
  const F = G.frameOf([x0, y, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]), U = [];
  for (let i = 0; i <= 16; i++) { const t = Math.PI + i / 16 * Math.PI; U.push([Math.cos(t) * R, Math.sin(t) * R]); }
  for (let i = 16; i >= 0; i--) { const t = Math.PI + i / 16 * Math.PI; U.push([Math.cos(t) * (R - 0.8), Math.sin(t) * (R - 0.8)]); }
  out.push(S(G.prismOf(F, U, 0, L0, P), { tone: 'mid', className: 'acero' }));
  out.push(`<path class="pasta" d="${poly([[x0 + 0.4, y - R + 1.4, z - 1.6], [x1 - 0.4, y - R + 1.4, z - 1.6], [x1 - 0.4, y + R - 1.4, z - 1.6], [x0 + 0.4, y + R - 1.4, z - 1.6]])}"/>`);
  out.push(`<g data-part="palas"></g>`);
  // el motorreductor en un extremo y el eje que entra
  out.push(S(k.slabOf({ x: x1 + 0.4, y: y - 3, w: 5, d: 6, r: 0.5 }, z - 3.4, 6.8, P, 2, 0.3), { tone: 'lo', className: 'motor' }));
  // el termómetro, delante, en su soporte
  out.push(S(k.slabOf({ x: x0 + 9.2, y: y + R - 0.2, w: 1.2, d: 1.2, r: 0.2 }, z - 3, 6, P, 1), { tone: 'mid' }));
  const Ft = G.frameAlong([TER.x, TER.y - 0.8, TER.z], [0, 1, 0]);
  out.push(S(G.disc(0, 1.2, TER.r, Ft, P), { tone: 'mid', className: 'esfera' }));
  const yc = TER.y + 0.42, pt = (t, rr) => [TER.x + Math.cos(t) * rr, yc, TER.z + Math.sin(t) * rr];
  let marcas = ''; for (let i = 0; i <= 8; i++) { const t = TER.a0 - i / 8 * TER.span; marcas += linea([pt(t, TER.r - 0.4), pt(t, TER.r - (i % 2 === 0 ? 1.3 : 0.9))]); }
  out.push(L(marcas, { tone: 'mid' }));
  const t27 = TER.a0 - 27 / 40 * TER.span;
  out.push(`<path class="iso-line limite" data-tone="mid" d="${linea([pt(t27, TER.r - 0.4), pt(t27, TER.r - 1.5)])}"/>`);
  out.push(`<path data-part="aguja" class="aguja" d=""/>`, D([at([TER.x, yc, TER.z])], { size: 0.5, tone: 'mid' }));
  return `<g data-part="batidora">${out.join('')}</g>`;
}
const TER = { x: BAT.x0 + 9.8, y: BAT.y + BAT.R + 1.6, z: BAT.z + 5.2, r: 3, a0: Math.PI * 1.25, span: Math.PI * 1.5 };

// ---------- la tubería de la pasta, la centrífuga y lo que sale ----------
const TUBO_PASTA = [[BAT.x1 - 2, BAT.y + BAT.R - 1, 4.5], [BAT.x1 + 4, BAT.y + BAT.R - 1, 4.5], [DEC.x0 - 4, DEC.y, 6], [DEC.x0 - 4, DEC.y, DEC.z], [DEC.x0 + 0.4, DEC.y, DEC.z]];
const FD = G.frameAlong([DEC.x0, DEC.y, DEC.z], [1, 0, 0]);
function decanter() {
  const { x0, y, z, L: L0, r } = DEC, out = [];
  // la bancada y los dos apoyos
  out.push(S(k.slabOf({ x: x0 - 1, y: y - 6, w: L0 + 8, d: 12, r: 0.8 }, 0, 2, P, 2, 0.4), { tone: 'lo', className: 'acero' }));
  for (const sx of [x0 + 4, x0 + L0 - 6]) out.push(S(k.slabOf({ x: sx - 1.4, y: y - 4.5, w: 2.8, d: 9, r: 0.3 }, 2, z - 2, P, 1), { tone: 'mid', className: 'acero' }));
  // la cuba del orujo, debajo de la boca de salida de los sólidos
  out.push(S(k.slabOf({ x: x0 + 1, y: y + 4, w: 7, d: 7, r: 0.5 }, 2, 4, P, 2, 0.3), { tone: 'mid', className: 'acero' }));
  out.push(`<path class="orujo" d="${poly([[x0 + 2, y + 5, 5.6], [x0 + 7, y + 5, 5.6], [x0 + 7, y + 10, 5.6], [x0 + 2, y + 10, 5.6]])}"/>`);
  out.push(T.tubePieces(G.fillet(TUBO_PASTA, 2.5), 0.9, P, { maxLength: 400 }).map((pc) => T.tubeSvg(pc, { tone: 'mid', className: 'tubo' })).join(''));
  out.push(S(G.solidOf([[0, 2.4], [2, r - 0.6], [3, r], [L0 - 7, r], [L0 - 2, r - 2], [L0, r - 2.2]], FD, P), { tone: 'mid', className: 'decanter' }));
  out.push(`<g data-part="giro-dec"></g>`);
  out.push(S(k.slabOf({ x: x0 + L0 + 0.4, y: y - 3.4, w: 6, d: 6.8, r: 0.5 }, 2, z + 2, P, 2, 0.3), { tone: 'lo', className: 'motor' }));
  out.push(L([4, 7.5, 11].map((zz) => k.sideSeam({ x: x0 + L0 + 0.4, y: y - 3.4, w: 6, d: 6.8, r: 0.5 }, zz, P, 2)).join(''), { tone: 'faint' }));
  // la vasija donde cae el aceite (vivo: el chorro)
  out.push(S(G.solidOf([[0, 2.4], [0.6, 2.9], [4.2, 3.4]], FZ(VAS.x, VAS.y, 2), P), { tone: 'mid', className: 'loza' }));
  out.push(`<path class="hueco" d="${k.ring(VAS.x, VAS.y, 3, 6.2, P, 28)}"/>`, L(k.ring(VAS.x, VAS.y, 3, 6.2, P, 28), { tone: 'mid' }));
  out.push(`<path data-part="aceite-vas" class="aceite" d="${k.ring(VAS.x, VAS.y, 2.6, 5.4, P, 28)}" style="opacity:0"/>`, `<path data-part="chorro" class="aceite" d=""/>`);
  return `<g data-part="decanter">${out.join('')}</g>`;
}
const VAS = { x: DEC.x0 + DEC.L - 3, y: DEC.y + 7.6 };

// ---------- la bodega: los depósitos con su nivel, el grifo y la botella ----------
function deposito([x, y], i) {
  const F = FZ(x, y), out = [];
  for (const a of [0.6, 2.7, 4.8]) out.push(S(k.cylinder(x + Math.cos(a) * (DR - 1.2), y + Math.sin(a) * (DR - 1.2), 0.6, 0, 3, P, 10), { tone: 'mid' }));
  out.push(S(G.solidOf([[0, 4.4], [0.8, 5.4], [2, DR], [DH - 3, DR], [DH - 1, 4], [DH, 1.4]], FZ(x, y, 3), P), { tone: 'mid', className: 'deposito' }));
  out.push(L(G.arcOf(F, 9, DR, P) + G.arcOf(F, 17, DR, P), { tone: 'lo' }));
  out.push(S(k.cylinder(x, y, 1.6, DH + 3, 1, P, 16), { tone: 'mid' }));
  // el visor de nivel: un tubo de cristal delante, con el aceite dentro (vivo)
  const t = VIS, n = [Math.cos(t), Math.sin(t), 0], b = mas([x, y, 0], n, DR + 0.9);
  out.push(`<path data-part="nivel-${i}" class="aceite" d=""/>`, L(linea([[b[0], b[1], 7], [b[0], b[1], DH - 1]]), { tone: 'mid' }), D([at([b[0], b[1], 7]), at([b[0], b[1], DH - 1])], { size: 0.6, tone: 'mid' }));
  // el grifo
  const g = mas([x, y, 0], n, DR);
  out.push(S(G.solidOf([[0, 0.5], [2.2, 0.5]], G.frameAlong([g[0], g[1], 5.4], n), P), { tone: 'mid' }), D([at(mas([g[0], g[1], 6.4], n, 1.2))], { size: 0.7, tone: 'mid' }));
  return out.join('');
}
function botella() {
  const { x, y } = BOT, F = FZ(x, y), prof = [[0, 2.5], [0.4, 2.7], [7.6, 2.7], [9.6, 1.3], [11.4, 0.9], [12.6, 0.9]], out = [];
  out.push(S(G.solidOf(prof, F, P), { tone: 'mid', className: 'vidrio' }));
  out.push(`<clipPath id="nivel-botella"><path data-part="nivel-bot" d=""/></clipPath><g clip-path="url(#nivel-botella)">${S(G.solidOf(prof.slice(0, 4).map(([s, r]) => [s, r - 0.25]), F, P), { tone: 'mid', crease: 'none', className: 'aceite-s' })}</g>`);
  out.push(`<path class="etiqueta" d="${banda(x, y, 2.75, 2.2, 5.6)}"/>`, L(k.pathOf(arcoDelante(x, y, 2.75, 2.2).map(at)) + k.pathOf(arcoDelante(x, y, 2.75, 5.6).map(at)), { tone: 'mid' }));
  out.push(S(k.cylinder(x, y, 1.05, 12.6, 1.4, P, 16), { tone: 'mid', className: 'tapon' }));
  return `<g data-part="botella">${out.join('')}</g>`;
}
const TUBO_ACEITE = [[VAS.x + 2.6, VAS.y, 3.6], [VAS.x + 8, VAS.y, 3.6], [DEP[0][0] - DR - 4, DEP[0][1] + 6, 3.6], [DEP[0][0] - DR - 4, DEP[0][1], DH + 6], [DEP[0][0], DEP[0][1], DH + 6], [DEP[0][0], DEP[0][1], DH + 3.6]];

// ---------- la figura ----------
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'Maqueta de una almazara: el olivo con el manto debajo y la vara, el cajón de aceitunas, la tolva y la lavadora con su soplante, el empiedro con dos rulos de piedra que ruedan sobre la solera, la batidora con su termómetro, la centrífuga horizontal que separa el aceite del agua y del orujo, la vasija del aceite, y la bodega con dos depósitos y una botella.',
  body: [
    tablero(),
    olivo(), cajon(),
    tolva(), lavadora(),
    `<g data-part="empiedro">${empiedro()}<g data-part="rulos"></g>${empiedroArriba()}</g>`,
    batidora(),
    `<g data-part="bodega">${T.tubePieces(G.fillet(TUBO_ACEITE, 2.5), 0.8, P, { maxLength: 400 }).map((pc) => T.tubeSvg(pc, { tone: 'mid', className: 'tubo' })).join('')}${porDepth(DEP.map((p, i) => [p, i]), ([p]) => [p[0], p[1], 0]).map(([p, i]) => deposito(p, i)).join('')}</g>`,
    decanter(),
    botella(),
  ],
});

// ---------- lo que se mueve en la página ----------
const live = MARCA_JUEGO + `
const P = ${JSON.stringify(P)}, OLV = ${JSON.stringify(OLV)}, COPAS = ${JSON.stringify(COPAS)}, MANTO = ${JSON.stringify(MANTO)}, LAV = ${JSON.stringify(LAV)};
const EMP = ${JSON.stringify(EMP)}, BAT = ${JSON.stringify(BAT)}, TER = ${JSON.stringify(TER)}, DEC = ${JSON.stringify(DEC)}, VAS = ${JSON.stringify(VAS)}, DEP = ${JSON.stringify(DEP)}, DR = ${DR}, DH = ${DH}, BOT = ${JSON.stringify(BOT)}, VIS = ${VIS};
const PASOS = ${JSON.stringify(PASOS)}, N = PASOS.length;
const at = (p) => iso(p, P), linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L'), poly = (pts) => linea(pts) + 'Z';
const dep = (p) => depthOf(p, P), K = Math.hypot(at([0, 0, 1])[0] - at([0, 0, 0])[0], at([0, 0, 1])[1] - at([0, 0, 0])[1]);
const stage = document.querySelector('.iso-stage'), svgEl = stage.querySelector('svg'), $ = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const el = { varaL: $('vara-l'), varaA: $('vara-a'), varaB: $('vara-b'), caenOl: $('caen-ol'), flotan: $('flotan'), hojas: $('hojas-vuelan'), pasta: $('pasta'), rulos: $('rulos'), palas: $('palas'), aguja: $('aguja'),
  giroDec: $('giro-dec'), chorro: $('chorro'), aceiteVas: $('aceite-vas'), nivel0: $('nivel-0'), nivel1: $('nivel-1'), nivelBot: $('nivel-bot'),
  olivo: $('olivo'), caja: $('caja'), tolva: $('tolva'), lavadora: $('lavadora'), empiedro: $('empiedro'), batidora: $('batidora'), decanter: $('decanter'), bodega: $('bodega'), botella: $('botella') };
const caidas = Array.from({ length: 22 }, (_, i) => $('caida-' + i));
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const ilumina = (lista, on) => { for (const n of [].concat(lista)) if (n && on !== n.hasAttribute('data-lit')) n.toggleAttribute('data-lit', on); };
const muestra = (n, on) => { const v = on ? '' : 'none'; if (n && n.style.display !== v) n.style.display = v; };
const mas = (a, b, t = 1) => a.map((v, i) => v + b[i] * t);
const pdot = (p, r, cls) => { const q = at(p); return '<circle class="' + cls + '" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="' + r + '"/>'; };
const setDot = (c, p) => { const q = at(p); c.setAttribute('cx', q[0].toFixed(1)); c.setAttribute('cy', q[1].toFixed(1)); };
// la envolvente de unos puntos de pantalla (para dibujar cada rulo, un tronco de cono, desde sus dos círculos)
function envolvente(pts) {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = []; for (const p of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (hi.length > 1 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
const dPath = (pts) => 'M' + pts.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L') + 'Z';
let s = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, txt = '', reloj = 0, gE = 0, vE = 0, gB = 0, vB = 0, gD = 0, vD = 0;
const tourAt = (t) => { const T = 2.8 * N + 2, f = (t % T) / T * (N + 0.71); const i = Math.floor(f); return Math.min(N - 0.001, i + sm((f - i) / 0.6) * 0.999); };
function draw(dt) {
  reloj += dt;
  const paso = Math.min(N - 1, Math.floor(s));
  // la recogida: la vara sacude la copa y las aceitunas caen al manto
  const vareo = s < 1 ? 1 : 0, golpe = vareo ? Math.sin(reloj * 5.5) : 0;
  const pie = [OLV.x + 10, OLV.y + 14, 0.4], punta = [OLV.x + 2 + golpe * 2.2, OLV.y + 1.5 - golpe * 1.2, 21 + golpe * 1.5];
  el.varaL.setAttribute('d', linea([pie, punta])); setDot(el.varaA, pie); setDot(el.varaB, punta);
  let caen = '';
  if (vareo) for (let i = 0; i < 6; i++) { const f = (reloj * 0.9 + i / 6) % 1, c = COPAS[i % COPAS.length], p = [OLV.x + c[0] + Math.cos(i * 2.2) * 2.4, OLV.y + c[1] + Math.sin(i * 2.2) * 2.4, (c[2] - 2) * (1 - f * f) + 0.6]; caen += pdot(p, 0.7, 'oliva'); }
  el.caenOl.innerHTML = caen;
  caidas.forEach((g, i) => muestra(g, s > 0.12 + i * 0.035));
  // el lavado: el agua se mueve, las aceitunas cabecean y el soplante echa las hojas
  const lava = sm((s - 1) / 0.25) * (1 - sm((s - 2.05) / 0.2));
  let fl = ''; for (let i = 0; i < 14; i++) { const u = ((0.5 + i * 0.7548776662 + reloj * 0.06 * (lava > 0.1 ? 1 : 0)) % 1), v = (0.5 + i * 0.5698402910) % 1, p = [LAV.x + 2 + u * (LAV.w - 4), LAV.y + 2 + v * (LAV.d - 4), LAV.h - 0.5 + Math.sin(reloj * 3 + i) * 0.25 * lava]; fl += pdot(p, 0.75, 'oliva'); }
  el.flotan.innerHTML = fl;
  let hv = ''; if (lava > 0.2) for (let i = 0; i < 4; i++) { const f = (reloj * 0.7 + i / 4) % 1, p = at([LAV.x + LAV.w + 6 + f * 12, LAV.y + 4 + i * 2, 9 + f * 3 + Math.sin(reloj * 6 + i) * 0.8]), a = reloj * 4 + i; const c = Math.cos(a) * 1.4 * K * 0.35, sn = Math.sin(a) * 0.6 * K * 0.35; hv += '<path class="hoja" style="opacity:' + (1 - f).toFixed(2) + '" d="M' + (p[0] - c).toFixed(1) + ' ' + (p[1] - sn).toFixed(1) + 'Q' + (p[0]).toFixed(1) + ' ' + (p[1] - 1.2).toFixed(1) + ' ' + (p[0] + c).toFixed(1) + ' ' + (p[1] + sn).toFixed(1) + 'Q' + p[0].toFixed(1) + ' ' + (p[1] + 1.2).toFixed(1) + ' ' + (p[0] - c).toFixed(1) + ' ' + (p[1] - sn).toFixed(1) + 'Z"/>'; }
  el.hojas.innerHTML = hv;
  // la molienda: los rulos ruedan sobre la solera alrededor del árbol, y la pasta se hace
  vE += ((s > 2 && s < 3.2 ? 0.9 : 0) - vE) * (1 - Math.exp(-dt / 0.8)); gE += vE * dt;
  el.pasta.style.opacity = (0.15 + 0.85 * sm((s - 2.1) / 0.8)).toFixed(2);
  const zr = EMP.h + EMP.rR - 0.4, arbol = [EMP.x, EMP.y, 0];
  const rulos = [0, Math.PI].map((ph) => {
    const a = gE + ph, d = [Math.cos(a), Math.sin(a), 0], u = [-Math.sin(a), Math.cos(a), 0], w = [0, 0, 1];
    const circ = (rad, rr) => Array.from({ length: 20 }, (_, i) => { const t = i / 20 * Math.PI * 2; return at([EMP.x + d[0] * rad + (u[0] * Math.cos(t)) * rr, EMP.y + d[1] * rad + (u[1] * Math.cos(t)) * rr, EMP.h + EMP.rR + Math.sin(t) * rr - 0.2]); });
    const cin = circ(EMP.r0, EMP.rr), cout = circ(EMP.r1, EMP.rR), hull = envolvente(cin.concat(cout));
    const fuera = [EMP.x + d[0] * EMP.r1, EMP.y + d[1] * EMP.r1, zr], facing = dep(fuera) > dep([EMP.x + d[0] * EMP.r0, EMP.y + d[1] * EMP.r0, zr]);
    let html = '<path class="rulo" d="' + dPath(hull) + '"/><path class="iso-line" data-tone="mid" d="' + dPath(hull) + '"/>';
    if (facing) { const rot = -gE * EMP.r1 / EMP.rR * 1.2; let ray = ''; for (let j = 0; j < 4; j++) { const t = rot + j * Math.PI / 2, q = at([fuera[0] + u[0] * Math.cos(t) * (EMP.rR - 0.2), fuera[1] + u[1] * Math.cos(t) * (EMP.rR - 0.2), EMP.h + EMP.rR - 0.2 + Math.sin(t) * (EMP.rR - 0.2)]), c0 = at([fuera[0], fuera[1], EMP.h + EMP.rR - 0.2]); ray += 'M' + c0[0].toFixed(1) + ' ' + c0[1].toFixed(1) + 'L' + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }
      html += '<path class="rulo-cara" d="' + dPath(cout) + '"/><path class="iso-line" data-tone="mid" d="' + dPath(cout) + '"/><path class="iso-line" data-tone="lo" d="' + ray + '"/>' + (function () { const c0 = at([fuera[0], fuera[1], EMP.h + EMP.rR - 0.2]); return '<g class="iso-dots" data-tone="mid"><circle cx="' + c0[0].toFixed(1) + '" cy="' + c0[1].toFixed(1) + '" r="0.8"/></g>'; })(); }
    // el mayal: del árbol al centro del rulo
    const m0 = at([EMP.x, EMP.y, zr]), m1 = at([EMP.x + d[0] * (EMP.r0 - 0.6), EMP.y + d[1] * (EMP.r0 - 0.6), zr]);
    return [dep([EMP.x + d[0] * 6, EMP.y + d[1] * 6, zr]), html];
  });
  const ejeA = at([EMP.x, EMP.y, EMP.h - 0.4]), ejeB = at([EMP.x, EMP.y, 22.6]);
  const eje = '<path class="iso-line arbol-emp" data-tone="mid" d="M' + ejeA[0].toFixed(1) + ' ' + ejeA[1].toFixed(1) + 'L' + ejeB[0].toFixed(1) + ' ' + ejeB[1].toFixed(1) + '"/><g class="iso-dots" data-tone="mid"><circle cx="' + ejeA[0].toFixed(1) + '" cy="' + ejeA[1].toFixed(1) + '" r="1.1"/></g>';   // (la rangua, donde apoya el árbol)
  rulos.sort((p, q) => p[0] - q[0]);
  const dEje = dep([EMP.x, EMP.y, zr]);
  el.rulos.innerHTML = rulos.filter((r) => r[0] < dEje).map((r) => r[1]).join('') + eje + rulos.filter((r) => r[0] >= dEje).map((r) => r[1]).join('');
  // el batido: las palas giran despacio dentro de la pasta; el termómetro marca por debajo de 27 °C
  vB += ((s > 3 && s < 4.2 ? 0.8 : 0) - vB) * (1 - Math.exp(-dt / 0.8)); gB += vB * dt;
  let pal = '';
  const zs = BAT.z - 0.6, ejeP = linea([[BAT.x0 - 0.8, BAT.y, zs], [BAT.x1 + 0.4, BAT.y, zs]]);
  for (let i = 0; i < 6; i++) { const sx = BAT.x0 + 2 + i * (BAT.x1 - BAT.x0 - 4) / 5, a = gB + i * 1.05; if (Math.sin(a) < -0.15) continue; const tip = [sx, BAT.y + Math.cos(a) * (BAT.R - 1.8), zs + Math.sin(a) * (BAT.R - 1.8)]; if (tip[2] < BAT.z - 1.6) continue; pal += '<path class="iso-line pala" data-tone="mid" d="' + linea([[sx, BAT.y, zs], tip]) + '"/>' + pdot(tip, 0.55, 'remache'); }
  el.palas.innerHTML = '<path class="iso-line eje-bat" data-tone="mid" d="' + ejeP + '"/>' + pdot([BAT.x0 - 0.8, BAT.y, zs], 0.9, 'remache') + pal;   // (el cojinete del extremo)
  const temp = 18 + 8 * sm((s - 3.05) / 0.6), ta = TER.a0 - temp / 40 * TER.span, yc = TER.y + 0.45;
  const pu = [TER.x + Math.cos(ta) * (TER.r - 0.5), yc, TER.z + Math.sin(ta) * (TER.r - 0.5)], la = [Math.cos(ta + Math.PI / 2) * 0.28, 0, Math.sin(ta + Math.PI / 2) * 0.28];
  el.aguja.setAttribute('d', poly([mas([TER.x, yc, TER.z], la), pu, mas([TER.x, yc, TER.z], la, -1), [TER.x - Math.cos(ta) * 0.7, yc, TER.z - Math.sin(ta) * 0.7]]));
  // la centrífuga: el tambor gira (las rayas corren) y cae el chorro de aceite en la vasija
  vD += ((s > 4 && s < 5.3 ? 6 : 0) - vD) * (1 - Math.exp(-dt / 0.6)); gD += vD * dt;
  let rd = ''; for (let i = 0; i < 8; i++) { const a = gD + i / 8 * Math.PI * 2, n = [0, Math.cos(a), Math.sin(a)]; if (dep(mas([0, 0, 0], n)) - dep([0, 0, 0]) < 0.15 * K) continue; rd += '<path class="iso-line" data-tone="lo" data-free="" d="' + linea([[DEC.x0 + 4, DEC.y + n[1] * (DEC.r + 0.05), DEC.z + n[2] * (DEC.r + 0.05)], [DEC.x0 + DEC.L - 8, DEC.y + n[1] * (DEC.r + 0.05), DEC.z + n[2] * (DEC.r + 0.05)]]) + '"/>'; }
  el.giroDec.innerHTML = rd;
  const flu = sm((s - 4.15) / 0.25) * (1 - sm((s - 5.25) / 0.3));
  const bo = [VAS.x, DEC.y + 2.2, DEC.z - 3.2], A = at(bo), B = at([VAS.x, VAS.y - 0.6, 5.6]), w = 0.45 * K * flu;
  el.chorro.setAttribute('d', flu > 0.02 ? 'M' + (A[0] - w).toFixed(1) + ' ' + A[1].toFixed(1) + 'Q' + (B[0] - w).toFixed(1) + ' ' + ((A[1] + B[1]) / 2 - 2).toFixed(1) + ' ' + (B[0] - w * 0.6).toFixed(1) + ' ' + B[1].toFixed(1) + 'L' + (B[0] + w * 0.6).toFixed(1) + ' ' + B[1].toFixed(1) + 'Q' + (B[0] + w).toFixed(1) + ' ' + ((A[1] + B[1]) / 2 - 2).toFixed(1) + ' ' + (A[0] + w).toFixed(1) + ' ' + A[1].toFixed(1) + 'Z' : '');
  el.aceiteVas.style.opacity = sm((s - 4.2) / 0.4).toFixed(2);
  // la bodega: los depósitos se llenan y la botella también
  const llena = sm((s - 4.6) / 1.1);
  [el.nivel0, el.nivel1].forEach((n, i) => { const [x, y] = DEP[i], b = [x + Math.cos(VIS) * (DR + 0.9), y + Math.sin(VIS) * (DR + 0.9)], h = 7 + (DH - 8) * (0.25 + 0.6 * llena * (i ? 0.8 : 1)); const p0 = at([b[0], b[1], 7]), p1 = at([b[0], b[1], h]); n.setAttribute('d', 'M' + (p0[0] - 0.7).toFixed(1) + ' ' + p0[1].toFixed(1) + 'L' + (p1[0] - 0.7).toFixed(1) + ' ' + p1[1].toFixed(1) + 'L' + (p1[0] + 0.7).toFixed(1) + ' ' + p1[1].toFixed(1) + 'L' + (p0[0] + 0.7).toFixed(1) + ' ' + p0[1].toFixed(1) + 'Z'); });
  const nb = 0.4 + 9 * sm((s - 5.1) / 0.6), q0 = at([BOT.x, BOT.y, nb]);
  el.nivelBot.setAttribute('d', 'M' + (q0[0] - 40).toFixed(1) + ' ' + q0[1].toFixed(1) + 'L' + (q0[0] + 40).toFixed(1) + ' ' + q0[1].toFixed(1) + 'L' + (q0[0] + 40).toFixed(1) + ' ' + (q0[1] + 60).toFixed(1) + 'L' + (q0[0] - 40).toFixed(1) + ' ' + (q0[1] + 60).toFixed(1) + 'Z');
  // lo que trabaja en cada paso
  ilumina([el.olivo, el.caja], paso === 0); ilumina([el.tolva, el.lavadora], paso === 1); ilumina(el.empiedro, paso === 2);
  ilumina(el.batidora, paso === 3); ilumina(el.decanter, paso === 4); ilumina([el.bodega, el.botella], paso === 5);
  const extra = ['en invierno, vareando sobre el manto', 'fuera hojas, tierra y piedras', 'enteras, con hueso, hasta la pasta', 'a menos de 27 °C: en frío', 'aceite por un lado; agua y orujo por otro', 'de 4 a 6 kilos por litro'][paso];
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
  dark: { copa: ['#4f6440', '#2c3a24', '#38482d', '#445636', '#516640', '#62784c'], tronco: ['#4a3628', '#2a1d16', '#35261c', '#403022', '#4c3a2a', '#5a4632'],
    'aceite-s': ['#b89a2a', '#6e5a14', '#8a721a', '#a68a22', '#c2a22c', '#dcbc3c'] },
  light: { copa: ['#7d9a62', '#56704a', '#64804f', '#728e58', '#80a062', '#94b472'], tronco: ['#8a6a50', '#5e4636', '#6c523e', '#7a5e48', '#886a52', '#9a7c62'],
    'aceite-s': ['#d4b23a', '#a08424', '#b4962a', '#c6a632', '#d8b83c', '#ecce52'] },
};
const colores = Object.entries(COLOR).map(([th, m]) => Object.entries(m).map(([cls, v]) => tonos(th === 'light' ? '.iso[data-theme="light"] ' : '', cls, v)).join('')).join('');
const CSS = COLORES + enJuego(WIDTH, HEIGHT) + `
.iso{--oliva:#2a1830;--aceite:#d8b23a;--agua:#1f2a52;--hueco:#0d0718;--madera:#3a2440;--chapa:#2a1d44;--chapa-in:#1c1330;--manto:#1e3a2a;--pasta:#5a4a2a;--orujo:#4a3424;--hoja:#5e7a48;--rulo:#2c2346;--rulo-cara:#241c3a;--etiqueta:#3f6b34;--vidrio:#1c2a24}
.iso[data-theme="light"]{--oliva:#3a2440;--aceite:#e0b83a;--agua:#cfe0f7;--hueco:#8c7a86;--madera:#e7d9cf;--chapa:#f1edf7;--chapa-in:#ddd6ea;--manto:#cfe3c8;--pasta:#a89060;--orujo:#8a6a50;--hoja:#7d9a62;--rulo:#f1edf7;--rulo-cara:#e4dcef;--etiqueta:#6e9e52;--vidrio:#e8f0e8}
.oliva{fill:var(--oliva)}.aceite{fill:var(--aceite)}.agua{fill:var(--agua)}.hueco{fill:var(--hueco)}.chapa{fill:var(--chapa)}.chapa.dentro{fill:var(--chapa-in)}
.manto{fill:var(--manto)}.pasta{fill:var(--pasta)}.orujo{fill:var(--orujo)}.hoja{fill:var(--hoja)}.aceitunas{fill:var(--oliva)}.rulo{fill:var(--rulo)}.rulo-cara{fill:var(--rulo-cara)}.etiqueta{fill:var(--etiqueta)}.aguja{fill:var(--anatomy-lit)}.remache{fill:var(--anatomy-mid)}
.vara{stroke-width:1.1;stroke-linecap:round}.rama{stroke-width:1.2}.pala{stroke-width:1}.eje-bat,.arbol-emp{stroke-width:1.4}.limite{stroke:var(--anatomy-lit)}
.madera>.iso-fill,.madera>.iso-top{fill:var(--madera)}.vidrio>.iso-fill,.vidrio>.iso-top{fill:var(--vidrio)}
[data-lit] .iso-edge,[data-lit].iso-line,[data-lit] .iso-line,[data-lit] .tb-edge{stroke:var(--anatomy-lit)}
[data-lit] .iso-top,[data-lit].iso-top{fill:var(--anatomy-lit-top)}
[data-lit] .iso-dots circle{fill:var(--anatomy-lit)}
` + colores;

const body = k.plateHtml({
  fig: 'Lámina 7',
  title: 'Cómo se hace el aceite',
  hint: 'Pasa el ratón: paso a paso',
  readout: '1 · La recogida',
  keys: [
    { mark: 'lit', label: 'La pieza que trabaja en cada paso: el olivo, la lavadora, el empiedro, la batidora, la centrífuga y la bodega' },
    { mark: 'raised', label: 'Los rulos de piedra ruedan sobre la solera y aplastan la aceituna entera, con su hueso' },
    { mark: 'flat', label: 'La batidora no pasa de 27 °C: por eso se dice extracción en frío' },
  ],
  caption: 'En la Ribera y la Zona Media de Navarra hay olivos de muchos siglos y una variedad propia, la arróniz. Las aceitunas se recogen en invierno, vareando las ramas sobre un manto, y en la almazara se limpian y se lavan. Se muelen enteras, con hueso, hasta hacer una pasta: antes, con rulos de piedra; hoy, sobre todo con molinos de martillos. La pasta se bate despacio a menos de 27 °C, por eso se dice extracción en frío, y una centrífuga separa el aceite del agua y del orujo. Para un litro de aceite hacen falta entre cuatro y seis kilos de aceitunas.',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="El aceite, paso a paso: las flechas pasan de un paso a otro" aria-valuemin="1" aria-valuemax="6">${svg}</div>`,
});

const html = k.pageHtml({ title: 'Cómo se hace el aceite', theme, body, script: kitScript() + live }).replace('</style>', CSS + '</style>');
escribe('aceite', html, theme);
