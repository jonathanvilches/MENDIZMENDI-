// Lámina isométrica interactiva «Del monte al puente: el cantero» (skill Anatomy, 21 de noviembre de 2026; el autor:
// «explicaciones técnicas con Anatomy de oficios antiguos [...] todo esto quiero que poco a poco lo vayas aplicando y lo
// vayas metiendo en el juego y en las misiones»). El taller de un cantero junto a la obra de un puente, en maqueta: a la
// izquierda, la cantera en bancales, donde un bloque se arranca metiendo cuñas en una fila de agujeros; en medio, el banco
// con el sillar, que se desbasta a golpe de pico, se labra cara a cara con cincel y maza, se comprueba con la escuadra y se
// firma con la marca del cantero; delante, el tablero con las herramientas y los sillares ya hechos; y a la derecha, el arco
// del puente sobre su cimbra de madera, que se cierra dovela a dovela hasta que entra la clave. Al recorrerla, paso a paso,
// se ilumina lo que trabaja. Es la que se abre al acabar el taller del cantero (data/oficios.js) y en el material didáctico.
// Uso: node tools/anatomia/cantero.mjs [--light]  →  entrega/anatomia/cantero(-light).html (y public/anatomia, para el juego)
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';
import * as G from '../../.claude/skills/anatomy/kit/lathe.mjs';
import { kitScript } from '../../.claude/skills/anatomy/scripts/inline-kit.mjs';
import { COLORES, enJuego, MARCA_JUEGO, escribe } from './comun.mjs';

const theme = process.argv.includes('--light') ? 'light' : 'dark';
const WIDTH = 600, HEIGHT = 290;

// ---------- el modelo (unidades de la maqueta; x a lo ancho, y hacia delante, z arriba) ----------
const CANTERA = { x: -78, y: -56, w: 28, d: 34 };                          // la cantera: tres bancales de roca
const BLOQUE = { x: -73, y: -29, w: 12, d: 5.5, z: 4.5, h: 4 };              // el bloque que se arranca, en el primer bancal
const BANCO = { x: -36, y: -37, w: 22, d: 10, z: 6 };                       // el banco del cantero
const SILLAR = { x: -30.5, y: -35, w: 11, d: 6.4, h: 5.6 };                 // el sillar acabado, sobre el banco
const ARCO = { cx: 36, y0: -44, y1: -34, r0: 12, r1: 16, zs: 10, n: 11 };   // el arco: centro, grueso, radios, arranque, dovelas
const PILAS = [[ARCO.cx - ARCO.r1 - 6, ARCO.cx - ARCO.r0 + 0.2], [ARCO.cx + ARCO.r0 - 0.2, ARCO.cx + ARCO.r1 + 6]];
const PASOS = ['Arrancar', 'Desbastar', 'Labrar', 'Escuadrar', 'La marca', 'El arco'];
const PUESTOS = [[BLOQUE.x + 6, BLOQUE.y + 3, 10], [SILLAR.x + 4, SILLAR.y + 2, 12], [SILLAR.x + 6, SILLAR.y + 5, 9], [SILLAR.x + 1, SILLAR.y + 1, 12], [SILLAR.x + 5, SILLAR.y + SILLAR.d, 8], [ARCO.cx, ARCO.y1, ARCO.zs + ARCO.r1]];

// ---------- la cámara ----------
const PLATE = { x: -86, y: -62, w: 164, d: 60, r: 8 };
const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [ARCO.cx, ARCO.y0, ARCO.zs + ARCO.r1 + 2], [CANTERA.x, CANTERA.y, 20]], WIDTH, HEIGHT, { pad: 8, azimuth: 66, elevation: 30 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const dep = (p) => k.depthOf(p, P);
const linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(2)).join(' ')).join('L');
const poly = (pts) => linea(pts) + 'Z';
const porDepth = (lista, f) => [...lista].sort((a, b) => dep(f(a)) - dep(f(b)));
const R2x = (i) => (0.5 + i * 0.7548776662) % 1, R2y = (i) => (0.5 + i * 0.5698402910) % 1;
const caja = (x0, x1, y0, y1, z0, h, cls, bevel = 0.2, r = 0.2) => S(k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z0, h, P, 2, bevel), { tone: 'mid', className: cls });
const FY = (y) => G.frameOf([0, y, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);      // un prisma que corre a lo largo de y, con su perfil en (x, z)
const palo = (a, b, w, cls = 'madera') => { const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(...d); return S(G.prismOf(G.frameAlong(a, d), [[-w, -w], [w, -w], [w, w], [-w, w]], 0, l, P), { tone: 'mid', className: cls }); };

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
  // el polvo y las lascas de piedra del suelo del taller
  let h = ''; for (let i = 0; i < 80; i++) { const x = -48 + R2x(i) * 62, y = PLATE.y + 8 + R2y(i) * (PLATE.d - 14), q = at([x, y, 0]); h += `<circle class="lasca" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${(0.25 + R2x(i + 9) * 0.45).toFixed(2)}"/>`; }
  out.push(h);
  // el río bajo el puente
  const rio = [[ARCO.cx - 9, PLATE.y + 3, 0], [ARCO.cx + 9, PLATE.y + 3, 0], [ARCO.cx + 7, PLATE.y + PLATE.d - 3, 0], [ARCO.cx - 11, PLATE.y + PLATE.d - 3, 0]];
  out.push(`<path class="agua" d="${poly(rio)}"/>`);
  let ond = ''; for (let i = 0; i < 9; i++) { const y = PLATE.y + 8 + i * 5.6, x = ARCO.cx - 6 + (i % 3) * 3.2; ond += linea([[x, y, 0], [x + 2.4, y + 0.3, 0]]); }
  out.push(`<path class="onda" d="${ond}"/>`);
  // la regla y la placa
  const regla = { x: -54, y: -9.5, w: 34, d: 5, r: 1 };
  out.push(S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
  const t = k.topTicks(regla.x + 3, regla.x + regla.w - 3, 2, 5, regla.y + 0.6, 0.6, [1.5, 2.8], P);
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
  out.push(D([at([regla.x + 1.5, regla.y + 2.5, 0.6]), at([regla.x + regla.w - 1.5, regla.y + 2.5, 0.6])], { size: 0.45 }));
  const pl = { x: 46, y: -9.5, w: 26, d: 5.6, r: 1.2 };
  out.push(S(k.slabOf(pl, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(pl, 1.1), 0.8, P, 4), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([pl.x + 4.6, pl.y + 3.5], 0.8, P, 'x'), 'HARGINAK · GARES', { size: 2.3, tone: 'mid' }));
  out.push(D([at([pl.x + 2.2, pl.y + 2.8, 0.8]), at([pl.x + pl.w - 2.2, pl.y + 2.8, 0.8])], { size: 0.4 }));
  return out.join('');
}

// ---------- la cantera: tres bancales de roca con sus grietas, y el bloque que se arranca ----------
function cantera() {
  const c = CANTERA, out = [];
  const bancales = [[c.y, c.y + c.d, 0, 4.5], [c.y, c.y + c.d - 12, 4.5, 4], [c.y, c.y + c.d - 23, 8.5, 3.5]];
  for (const [y0, y1, z0, h] of bancales) {
    out.push(caja(c.x, c.x + c.w, y0, y1, z0, h, 'roca', 0.4, 1.2));
    // las vetas de la roca en la cara de delante
    let v = ''; for (let i = 1; i < 6; i++) { const x = c.x + i / 6 * c.w + (R2x(i + z0) - 0.5) * 3; v += linea([[x, y1, z0 + h * (0.1 + R2y(i) * 0.25)], [x + 1.2 + R2x(i * 3) * 1.5, y1, z0 + h * (0.55 + R2y(i + 4) * 0.35)]]); }
    out.push(L(v, { tone: 'lo' }));
  }
  // las marcas de los agujeros de cuñas de otros bloques ya sacados, en el borde del segundo bancal
  const ya = []; for (let i = 0; i < 7; i++) ya.push(at([c.x + 3 + i * 3.6, c.y + c.d - 12, 8.5]));
  out.push(D(ya, { size: 0.42, tone: 'lo' }));
  return `<g data-part="cantera">${out.join('')}</g><g data-part="bloque"></g>`;
}

// ---------- el banco del cantero y el sillar (el sillar, vivo) ----------
function banco() {
  const b = BANCO, out = [];
  // dos caballetes de patas abiertas
  for (const x of [b.x + 3, b.x + b.w - 3]) for (const [y, s] of [[b.y + 0.8, -1], [b.y + b.d - 0.8, 1]]) out.push(palo([x - 1.6, y + s * 0.6, 0], [x, y, b.z], 0.32), palo([x + 1.6, y + s * 0.6, 0], [x, y, b.z], 0.32));
  out.push(caja(b.x, b.x + b.w, b.y, b.y + b.d, b.z, 1.1, 'madera', 0.2));
  return `<g data-part="banco">${out.join('')}</g><g data-part="sillar"></g><g data-part="labra"></g>`;
}
// las herramientas en su tablero, delante del banco
function herramientas() {
  const out = [], t = { x: -40, y: -23, w: 24, d: 7 };
  out.push(caja(t.x, t.x + t.w, t.y, t.y + t.d, 0, 0.7, 'madera', 0.15));
  const z = 0.7;
  // el pico, la maza, dos cinceles, la escuadra y el compás, tumbados
  out.push(L(linea([[t.x + 2, t.y + 1.6, z + 0.3], [t.x + 9, t.y + 4.6, z + 0.3]]), { tone: 'mid', className: 'mango' }));
  out.push(`<path class="hierro" d="${poly([[t.x + 7.6, t.y + 2.2, z + 0.3], [t.x + 10.6, t.y + 5.8, z + 0.3], [t.x + 10.1, t.y + 6.3, z + 0.3], [t.x + 7.0, t.y + 3.0, z + 0.3]])}"/>`);
  out.push(L(linea([[t.x + 11, t.y + 1.4, z + 0.4], [t.x + 14.5, t.y + 3.4, z + 0.4]]), { tone: 'mid', className: 'mango' }));
  out.push(caja(t.x + 14, t.x + 16.4, t.y + 2.2, t.y + 4.8, z, 1.6, 'piedra-maza', 0.2, 0.4));
  for (const dx of [17.6, 19.2]) out.push(`<path class="iso-line cincel" data-tone="mid" d="${linea([[t.x + dx, t.y + 1.2, z + 0.25], [t.x + dx + 0.8, t.y + 5.4, z + 0.25]])}"/>`, D([at([t.x + dx + 0.8, t.y + 5.4, z + 0.25])], { size: 0.35, tone: 'mid' }));
  out.push(`<path class="iso-line escuadra" data-tone="mid" d="${linea([[t.x + 21, t.y + 1.2, z + 0.1], [t.x + 21, t.y + 5.6, z + 0.1], [t.x + 23.2, t.y + 5.6, z + 0.1]])}"/>`);
  return `<g data-part="herramientas">${out.join('')}</g>`;
}
// los sillares ya hechos, apilados
function pila() {
  const out = [], x = -10, y = -27;
  const piezas = [[0, 0, 0], [9.6, 0, 0], [0, 6, 0], [9.6, 6, 0], [4.8, 0, 4.6], [4.8, 6, 4.6]];
  for (const [dx, dy, dz] of porDepth(piezas, ([q, w, e]) => [x + q + 4.5, y + w + 2.7, e])) {
    out.push(caja(x + dx, x + dx + 9, y + dy, y + dy + 5.4, dz, 4.6, 'sillar', 0.3, 0.3));
    out.push(D([at([x + dx + 4.5, y + dy + 5.4, dz + 2.3])], { size: 0.32, tone: 'lo' }));
  }
  return `<g data-part="pila">${out.join('')}</g>`;
}

// ---------- el puente: las pilas, la cimbra de madera y el arco (las dovelas, vivas) ----------
function pilas() {
  const out = [], a = ARCO;
  for (const [x0, x1] of PILAS) for (let c = 0; c < 2; c++) {
    out.push(caja(x0, x1, a.y0 - 1, a.y1 + 1, c * 5, 5, 'sillar', 0.3, 0.3));
    const xm = (x0 + x1) / 2 + (c ? 2 : -2);
    out.push(L(linea([[xm, a.y1 + 1, c * 5], [xm, a.y1 + 1, c * 5 + 5]]), { tone: 'lo' }));
  }
  // los tajamares, de cara a la corriente
  for (const [x0, x1] of PILAS) { const xm = (x0 + x1) / 2; out.push(`<path class="tajamar" d="${poly([[x0, a.y0 - 1, 0], [xm, a.y0 - 5, 0], [x1, a.y0 - 1, 0], [x1, a.y0 - 1, 7], [xm, a.y0 - 5, 7], [x0, a.y0 - 1, 7]])}"/>`); }
  return `<g data-part="pilas">${out.join('')}</g>`;
}
function cimbra() {
  const a = ARCO, out = [], ym = (a.y0 + a.y1) / 2, rc = a.r0 - 0.5;
  // los dos pies derechos y la viga de abajo
  for (const x of [a.cx - rc + 1.5, a.cx + rc - 1.5]) out.push(palo([x, ym, 0], [x, ym, a.zs - 0.3], 0.45));
  out.push(palo([a.cx - rc, ym, a.zs - 0.3], [a.cx + rc, ym, a.zs - 0.3], 0.45));
  // el cerchón: la costilla curva y los tornapuntas que la sujetan
  const arco = Array.from({ length: 25 }, (_, i) => { const t = Math.PI - i / 24 * Math.PI; return [a.cx + Math.cos(t) * rc, ym, a.zs + Math.sin(t) * rc]; });
  let r = ''; for (const t of [0.35, 0.8, 1.2, Math.PI / 2, 1.95, 2.35, 2.8]) r += linea([[a.cx + Math.cos(t) * 2.2, ym, a.zs], [a.cx + Math.cos(t) * rc, ym, a.zs + Math.sin(t) * rc]]);
  out.push(`<path class="iso-line costilla" data-tone="mid" d="${r}"/>`, `<path class="iso-line cerchon" data-tone="mid" d="${linea(arco)}"/>`);
  out.push(D([at([a.cx, ym, a.zs])], { size: 0.5, tone: 'mid' }));
  return `<g data-part="cimbra">${out.join('')}</g>`;
}

function dovelas() {
  const a = ARCO, n = a.n, F = G.frameOf([0, a.y0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]), items = [];
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI - i / n * Math.PI, a1 = Math.PI - (i + 1) / n * Math.PI, am = (a0 + a1) / 2;
    const pol = [[Math.cos(a0) * a.r0, Math.sin(a0) * a.r0], [Math.cos(a0) * a.r1, Math.sin(a0) * a.r1], [Math.cos(a1) * a.r1, Math.sin(a1) * a.r1], [Math.cos(a1) * a.r0, Math.sin(a1) * a.r0]].map(([px, pz]) => [a.cx + px, a.zs + pz]);
    const cen = [a.cx + Math.cos(am) * (a.r0 + a.r1) / 2, (a.y0 + a.y1) / 2, a.zs + Math.sin(am) * (a.r0 + a.r1) / 2];
    const clave = i === (n - 1) / 2;
    items.push([dep(cen), `<g data-i="${i}">${S(G.prismOf(F, pol, 0, a.y1 - a.y0, P), { tone: 'mid', className: clave ? 'sillar-clave' : 'sillar' })}</g>`]);
  }
  return `<g data-part="arco">${items.sort((A, B) => A[0] - B[0]).map((it) => it[1]).join('')}</g>`;
}

// ---------- la figura ----------
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'Maqueta del taller de un cantero junto a la obra de un puente: la cantera en bancales, donde un bloque se arranca con cuñas; el banco con el sillar que se desbasta con el pico, se labra con cincel y maza, se comprueba con la escuadra y se firma con la marca del cantero; el tablero de herramientas y la pila de sillares; y el arco del puente sobre su cimbra de madera, que se cierra dovela a dovela hasta la clave.',
  body: [tablero(), cantera(), pilas(), cimbra(), dovelas(), banco(), pila(), herramientas()],
});

// ---------- lo que se mueve en la página ----------
const live = MARCA_JUEGO + `
const P = ${JSON.stringify(P)}, BL = ${JSON.stringify(BLOQUE)}, SI = ${JSON.stringify(SILLAR)}, BA = ${JSON.stringify(BANCO)}, AR = ${JSON.stringify(ARCO)}, PUESTOS = ${JSON.stringify(PUESTOS)};
const PASOS = ${JSON.stringify(PASOS)}, N = PASOS.length;
const at = (p) => iso(p, P), f2 = (v) => v.toFixed(2), linea = (pts) => 'M' + pts.map((p) => { const q = at(p); return f2(q[0]) + ' ' + f2(q[1]); }).join('L'), poly = (pts) => linea(pts) + 'Z';
const K = Math.hypot(at([0, 0, 1])[0] - at([0, 0, 0])[0], at([0, 0, 1])[1] - at([0, 0, 0])[1]);
const stage = document.querySelector('.iso-stage'), svgEl = stage.querySelector('svg'), $ = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const el = {}; for (const n of ['cantera', 'bloque', 'banco', 'sillar', 'labra', 'herramientas', 'pila', 'pilas', 'cimbra', 'arco']) el[n] = $(n);
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }, mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const ilumina = (lista, on) => { for (const n of [].concat(lista)) if (n && on !== n.hasAttribute('data-lit')) n.toggleAttribute('data-lit', on); };
const caja = (x0, x1, y0, y1, z0, h, cls, bevel, r) => solidSvg(slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: r || 0.2 }, z0, h, P, 2, bevel || 0.2), { tone: 'mid', className: cls });
let s = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, txt = '', reloj = 0;
const tourAt = (t) => { const T = 3 * N + 2, f = (t % T) / T * (N + 0.71); const i = Math.floor(f); return Math.min(N - 0.001, i + sm((f - i) / 0.6) * 0.999); };
// ---- una herramienta que golpea: el mango de (a) a (b) y la cabeza en b ----
const golpe = (fase) => { const f = fase % 1; return f < 0.7 ? sm(f / 0.7) : 1 - sm((f - 0.7) / 0.3); };
// ---- las lascas que saltan de un punto ----
const lascas = (p, n, fase) => { let o = ''; for (let i = 0; i < n; i++) { const f = (fase + i / n) % 1, a = i * 2.4, q = at([p[0] + Math.cos(a) * f * 3, p[1] + Math.sin(a) * f * 2 + f * 1.5, p[2] + f * 3 - f * f * 5]); o += '<circle class="lasca-viva" cx="' + f2(q[0]) + '" cy="' + f2(q[1]) + '" r="' + f2((0.35 - f * 0.15) * K) + '" style="opacity:' + f2(1 - f) + '"/>'; } return o; };
// ---- el bloque de la cantera: las cuñas entran en la fila de agujeros y el bloque se abre ----
function bloque() {
  const cun = sm(s / 0.55), abre = sm((s - 0.5) / 0.35), dy = abre * 1.6, b = BL;
  let o = caja(b.x, b.x + b.w, b.y + dy, b.y + b.d + dy, b.z, b.h, 'roca', 0.3, 0.3);
  // la grieta que se abre detrás del bloque
  if (abre > 0.02) o += '<path class="grieta" d="' + poly([[b.x, b.y, b.z + b.h], [b.x + b.w, b.y, b.z + b.h], [b.x + b.w, b.y + dy, b.z + b.h], [b.x, b.y + dy, b.z + b.h]]) + '"/>';
  // las cuñas de hierro: asoman y entran
  for (let i = 0; i < 5; i++) { const x = b.x + 1.6 + i * 2.45, y = b.y + dy * 0.5, z = b.z + b.h + 1.2 * (1 - cun) + 0.05, w = 0.45;
    o += '<path class="cuna" d="' + poly([[x - w, y - 0.3, z + 1.1], [x + w, y - 0.3, z + 1.1], [x + 0.12, y, z - 0.3], [x - 0.12, y, z - 0.3]]) + '"/>'; }
  // la maza del que mete las cuñas
  if (s < 0.95) { const g = golpe(reloj * 1.6), cab = mix([b.x + 6, b.y - 1.2, b.z + b.h + 7], [b.x + 6.6, b.y, b.z + b.h + 2.4], g), mano = [b.x + 10, b.y - 3, b.z + b.h + 6];
    o += '<path class="iso-line mango" data-tone="mid" d="' + linea([mano, cab]) + '"/>' + caja(cab[0] - 1, cab[0] + 1, cab[1] - 0.8, cab[1] + 0.8, cab[2] - 0.8, 1.6, 'hierro-s', 0.15, 0.2); if (g > 0.95) o += lascas([b.x + 6.6, b.y, b.z + b.h], 5, reloj * 2); }
  return o;
}
// ---- el sillar: bruto con salientes (paso 2 los quita), luego las caras labradas, la escuadra y la marca ----
const SALIENTES = [[0.8, 1.2, 1, 3.2, 2.2, 1.6], [4.5, 0.6, 2.6, 3, 2.4, 1.4], [6.6, 3.2, 0.4, 2.6, 1.8, 2], [2.2, 3.4, 3.4, 3.4, 2.2, 1.3], [7.2, 0.4, 3, 2.1, 1.6, 1.2], [1.6, 4.6, 1.2, 2.4, 1.6, 1.4], [5.2, 4.4, 2.8, 3.2, 1.8, 1.1], [3.4, 1.8, 4.2, 2.8, 2.4, 1.2]];
function sillar() {
  const z0 = BA.z + 1.1, x = SI.x, y = SI.y, w = SI.w, d = SI.d, h = SI.h, quita = clamp((s - 1.05) / 0.85, 0, 1) * SALIENTES.length;
  let o = caja(x, x + w, y, y + d, z0, h, 'sillar', 0.12, 0.12);
  // los salientes que aún quedan (cada golpe de pico se lleva uno)
  const quedan = SALIENTES.slice(Math.floor(quita + 1e-6)).map(([sx, sy, sz, sw, sd, sh]) => [x + sx - 0.4, y + sy - 0.4, z0 + sz * 0.6 + (sz > 3 ? h - 3.3 : 0), sw, sd, sh]);
  for (const [qx, qy, qz, qw, qd, qh] of quedan.sort((A, B) => depthOf([A[0], A[1], A[2]], P) - depthOf([B[0], B[1], B[2]], P))) o += caja(qx, Math.min(x + w + 1, qx + qw), qy, Math.min(y + d + 1, qy + qd), Math.min(qz, z0 + h - qh * 0.4), qh, 'bruto', 0.3, 0.5);
  // las caras labradas: las estrías del cincel aparecen cara a cara (arriba, delante, al lado)
  const lab = clamp((s - 2.05) / 0.85, 0, 1);
  if (lab > 0) { let e = ''; const n = 14;
    const arriba = Math.min(1, lab * 3), frente = clamp(lab * 3 - 1, 0, 1), lado = clamp(lab * 3 - 2, 0, 1);
    for (let i = 1; i < n * arriba; i++) { const t = i / n; e += linea([[x + t * w, y + 0.3, z0 + h], [x + t * w + 0.35, y + d - 0.3, z0 + h]]); }
    for (let i = 1; i < n * frente; i++) { const t = i / n; e += linea([[x + t * w, y + d, z0 + 0.3], [x + t * w + 0.3, y + d, z0 + h - 0.3]]); }
    for (let i = 1; i < 8 * lado; i++) { const t = i / 8; e += linea([[x + w, y + t * d, z0 + 0.3], [x + w, y + t * d + 0.2, z0 + h - 0.3]]); }
    o += '<path class="estria" d="' + e + '"/>';
    // la orla: el filo labrado a cincel alrededor de cada cara
    if (lab > 0.3) o += '<path class="orla" d="' + poly([[x + 0.5, y + 0.5, z0 + h], [x + w - 0.5, y + 0.5, z0 + h], [x + w - 0.5, y + d - 0.5, z0 + h], [x + 0.5, y + d - 0.5, z0 + h]]) + '"/>'; }
  // la escuadra apoyada en la esquina
  const esc = sm((s - 3.05) / 0.3) * (1 - sm((s - 4.6) / 0.3));
  if (esc > 0.01) { const zz = z0 + h + 0.15 + (1 - esc) * 3; o += '<g style="opacity:' + f2(esc) + '"><path class="regla-esc" d="' + poly([[x - 0.2, y + d + 0.2, zz], [x + 6, y + d + 0.2, zz], [x + 6, y + d - 0.8, zz], [x + 0.8, y + d - 0.8, zz], [x + 0.8, y - 0.2 + 1.2, zz], [x - 0.2, y - 0.2 + 1.2, zz]]) + '"/>';
    let ti = ''; for (let i = 1; i < 6; i++) ti += linea([[x + i, y + d + 0.2, zz], [x + i, y + d - 0.3, zz]]);
    o += '<path class="iso-line" data-tone="lo" d="' + ti + '"/></g>'; }
  // la marca del cantero: una estrella grabada en la cara de delante, trazo a trazo
  const mar = clamp((s - 4.05) / 0.7, 0, 1);
  if (mar > 0) { const cx = x + w / 2, cz = z0 + h / 2, R = 1.5, pts = []; for (let i = 0; i < 6; i++) { const a = Math.PI / 2 + i * 4 * Math.PI / 5; pts.push([cx + Math.cos(a) * R, y + d + 0.03, cz + Math.sin(a) * R]); }
    const tramos = Math.ceil(mar * 5); o += '<path class="marca" stroke-width="' + f2(0.28 * K) + '" d="' + linea(pts.slice(0, tramos + 1)) + '"/>'; }
  return o;
}
// ---- lo que trabaja sobre el sillar: el pico, el cincel y la maza ----
function labra() {
  const z0 = BA.z + 1.1, x = SI.x, y = SI.y, h = SI.h; let o = '';
  if (s > 1.0 && s < 2.0) { const g = golpe(reloj * 1.8), p = [x + 3 + Math.sin(reloj * 0.9) * 2.5, y + 1.5, z0 + h + 0.3], cab = mix([p[0] - 1, p[1] - 3, p[2] + 7], p, g), mano = [p[0] + 3.5, p[1] - 5, p[2] + 6.5];
    o += '<path class="iso-line mango" data-tone="mid" d="' + linea([mano, cab]) + '"/><path class="hierro" d="' + poly([[cab[0] - 2.2, cab[1], cab[2] + 0.6], [cab[0] + 2.2, cab[1], cab[2] + 0.6], [cab[0] + 1.6, cab[1], cab[2] - 0.2], [cab[0] - 1.6, cab[1], cab[2] - 0.2]]) + '"/>';
    if (g > 0.9) o += lascas(p, 7, reloj * 2.2); }
  if (s > 2.0 && s < 3.0) { const lab = clamp((s - 2.05) / 0.85, 0, 1), g = golpe(reloj * 3), punta = lab < 0.34 ? [x + 1 + lab * 3 * (SI.w - 2), y + SI.d * 0.5, z0 + h] : lab < 0.67 ? [x + 1 + (lab - 0.34) * 3 * (SI.w - 2), y + SI.d, z0 + h * 0.5] : [x + SI.w, y + SI.d * 0.5, z0 + h * 0.5];
    const dir = lab < 0.34 ? [0.2, -0.6, 1] : lab < 0.67 ? [0.1, 1, 0.5] : [1, 0.2, 0.5], cab = [punta[0] + dir[0] * 4, punta[1] + dir[1] * 4, punta[2] + dir[2] * 4], maza = mix([cab[0] + 2, cab[1] - 2, cab[2] + 3.4], cab, g);
    o += '<path class="iso-line cincel" data-tone="hi" d="' + linea([punta, cab]) + '"/>' + caja(maza[0] - 1, maza[0] + 1, maza[1] - 0.9, maza[1] + 0.9, maza[2], 1.6, 'piedra-maza', 0.15, 0.3);
    if (g > 0.92) o += lascas(punta, 4, reloj * 3); }
  return o;
}
// ---- el arco: las dovelas entran por parejas desde los dos arranques; la clave, la última (bajan a su sitio desde arriba) ----
const DOV = [...el.arco.querySelectorAll('[data-i]')];
function arco() {
  const n = AR.n, mitad = (n - 1) / 2, puestas = clamp((s - 5.0) / 0.85, 0, 1), ver = 0.5 + puestas * 0.56;
  for (const g of DOV) { const i = +g.dataset.i, umbral = Math.min(i, n - 1 - i) / mitad, k2 = clamp((ver - umbral) / 0.06, 0, 1), op = k2 <= 0 ? 0 : sm(k2 * 1.5), dy = (1 - sm(k2)) * 6 * K;
    const st = 'opacity:' + f2(op), tr = 'translate(0 ' + f2(-dy) + ')'; if (g.getAttribute('style') !== st) g.setAttribute('style', st); if (g.getAttribute('transform') !== tr) g.setAttribute('transform', tr); }
}
function draw(dt) {
  reloj += dt;
  const paso = Math.min(N - 1, Math.floor(s));
  el.bloque.innerHTML = bloque();
  el.sillar.innerHTML = sillar();
  el.labra.innerHTML = labra();
  arco();
  ilumina([el.cantera, el.bloque], paso === 0); ilumina([el.sillar, el.labra], paso >= 1 && paso <= 4); ilumina([el.arco, el.cimbra], paso === 5);
  const quedan = Math.max(0, 8 - Math.floor(clamp((s - 1.05) / 0.85, 0, 1) * 8 + 1e-6));
  const extra = ['cuñas en una fila de agujeros: la piedra se abre por su veta', 'a golpe de pico: quedan ' + quedan + ' salientes', 'cincel y maza, cara a cara, hasta dejarla lisa', 'la escuadra comprueba que los ángulos son rectos', 'su firma: así le pagaban por cada piedra', 'dovela a dovela sobre la cimbra; la clave, la última'][paso];
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
const puesto = (ev) => { const m = svgEl.getScreenCTM(); if (!m) return 0; const q = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse()); let best = 0, bd = Infinity; PUESTOS.forEach((p, i) => { const a = at(p), d = Math.hypot(a[0] - q.x, a[1] - q.y); if (d < bd) { bd = d; best = i; } }); return best + 0.5; };
stage.addEventListener('pointermove', (ev) => steer(puesto(ev)));
stage.addEventListener('pointerdown', (ev) => steer(puesto(ev)));
stage.addEventListener('keydown', (ev) => { if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') { ev.preventDefault(); steer(Math.floor(target) + 1.6); } if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') { ev.preventDefault(); steer(Math.floor(target) - 0.4); } });
window.__pasoCantero = (v) => { touring = false; target = s = v; draw(0); };
draw(0);
`;

const tonos = (pre, cls, [f, s0, s1, s2, s3, t]) => `${pre}.${cls}>.iso-fill{fill:${f}}${pre}.${cls}>.iso-top{fill:${t}}${pre}.${cls}[data-seamless]>.iso-top{stroke:${t}}` +
  [s0, s1, s2, s3].map((c, i) => `${pre}.${cls}>.iso-shade[data-shade="${i}"]{fill:${c}}${pre}.${cls}[data-seamless]>.iso-shade[data-shade="${i}"]{stroke:${c}}`).join('');
const COLOR = {
  dark: { roca: ['#5a4e5e', '#2e2632', '#3a303e', '#463a4a', '#524656', '#6a5c6e'], sillar: ['#8a7658', '#4e4230', '#5e503a', '#6e5e44', '#7e6c4e', '#a08a66'],
    'sillar-clave': ['#a88a5a', '#5e4c30', '#70593a', '#826844', '#94784e', '#c4a46e'], bruto: ['#7a6a52', '#443a2c', '#524636', '#605240', '#6e5e4a', '#8c7a60'],
    madera: ['#4a3628', '#2a1d16', '#35261c', '#403022', '#4c3a2a', '#5a4632'], 'piedra-maza': ['#5c5a6a', '#2e2c38', '#3a3846', '#464454', '#525062', '#6e6c7e'],
    'hierro-s': ['#5c5a6a', '#2e2c38', '#3a3846', '#464454', '#525062', '#6e6c7e'] },
  light: { roca: ['#a89aa8', '#7a6c7c', '#887a8a', '#968898', '#a496a6', '#c0b2c2'], sillar: ['#d8c098', '#a8906a', '#b89e76', '#c8ac84', '#d8bc92', '#ecd4ac'],
    'sillar-clave': ['#e8c88e', '#b89660', '#c8a46c', '#d8b47a', '#e8c288', '#f8dca4'], bruto: ['#c4ae88', '#968060', '#a48c6a', '#b29a76', '#c0a882', '#d8c29c'],
    madera: ['#8a6a50', '#5e4636', '#6c523e', '#7a5e48', '#886a52', '#9a7c62'], 'piedra-maza': ['#9c9aaa', '#6e6c7c', '#7c7a8a', '#8a8898', '#9896a6', '#b2b0c0'],
    'hierro-s': ['#9c9aaa', '#6e6c7c', '#7c7a8a', '#8a8898', '#9896a6', '#b2b0c0'] },
};
const colores = Object.entries(COLOR).map(([th, m]) => Object.entries(m).map(([cls, v]) => tonos(th === 'light' ? '.iso[data-theme="light"] ' : '', cls, v)).join('')).join('');
const CSS = COLORES + enJuego(WIDTH, HEIGHT) + `
.iso{--lasca:#6a5a4a;--agua:#2a3c7a;--onda:#5a74c8;--grieta:#0d0718;--cuna:#8a8698;--hierro:#8a8698;--estria:#5e503a;--orla:#c4a876;--regla-esc:#c8b080;--marca:#ffd36a;--tajamar:#6e5e44}
.iso[data-theme="light"]{--lasca:#c0a888;--agua:#9ab8ec;--onda:#5a7ac8;--grieta:#4a3a48;--cuna:#6e6c7c;--hierro:#6e6c7c;--estria:#a8906a;--orla:#8a6e44;--regla-esc:#8a6a40;--marca:#d6338f;--tajamar:#b89e76}
.lasca{fill:var(--lasca)}.lasca-viva{fill:var(--orla)}.agua{fill:var(--agua);stroke:var(--anatomy-lo);stroke-width:.3}.onda{fill:none;stroke:var(--onda);stroke-width:.5;stroke-linecap:round}
.grieta{fill:var(--grieta)}.cuna{fill:var(--cuna);stroke:var(--anatomy-lo);stroke-width:.25}.hierro{fill:var(--hierro);stroke:var(--anatomy-lo);stroke-width:.25}
.estria{fill:none;stroke:var(--estria);stroke-width:.3;stroke-linecap:round}.orla{fill:none;stroke:var(--orla);stroke-width:.4}
.regla-esc{fill:var(--regla-esc);stroke:var(--anatomy-lo);stroke-width:.25}.marca{fill:none;stroke:var(--marca);stroke-linecap:round;stroke-linejoin:round}
.tajamar{fill:var(--tajamar);stroke:var(--anatomy-lo);stroke-width:.3;stroke-linejoin:round}
.mango{stroke-width:.9;stroke-linecap:round}.cincel{stroke-width:.6;stroke-linecap:round}.escuadra{fill:none;stroke-width:.6}.costilla{stroke-width:.55;stroke-linecap:round}.cerchon{fill:none;stroke-width:1.1;stroke-linecap:round}
[data-lit] .iso-edge,[data-lit].iso-line,[data-lit] .iso-line,[data-lit] .tajamar{stroke:var(--anatomy-lit)}
[data-lit] .iso-top,[data-lit].iso-top{fill:var(--anatomy-lit-top)}
[data-lit] .iso-dots circle{fill:var(--anatomy-lit)}
` + colores;

const body = k.plateHtml({
  fig: 'Lámina 20',
  title: 'Del monte al puente: el cantero',
  hint: 'Pasa el ratón por cada pieza',
  readout: '1 · Arrancar · cuñas en una fila de agujeros: la piedra se abre por su veta',
  keys: [
    { mark: 'lit', label: 'Lo que trabaja en cada paso: la cantera, el sillar y el arco' },
    { mark: 'raised', label: 'Cada cantero firmaba sus sillares con su marca' },
    { mark: 'flat', label: 'La cimbra de madera sostiene el arco hasta que entra la clave' },
  ],
  caption: 'Con piedra se levantaron los puentes, las iglesias y los palacios de Navarra, como el puente de Puente la Reina. El cantero empezaba en la cantera: hacía una fila de agujeros en la roca, metía cuñas de hierro y las golpeaba hasta que la piedra se abría por su veta. Después, en el banco, desbastaba el bloque a golpe de pico, quitando lo que sobraba, y labraba cada cara con el cincel y la maza hasta dejarla lisa y recta, comprobándolo con la escuadra. Al acabar grababa su marca, una estrella, una flecha o una llave: así le pagaban por cada sillar, y todavía hoy se ven en muchos muros. Para hacer un arco, los sillares en forma de cuña, las dovelas, se colocaban sobre una cimbra de madera, desde los dos lados hacia el centro, y la última en entrar era la clave. Entonces el arco se sujetaba solo y la cimbra se podía quitar.',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Del monte al puente: el cantero, paso a paso: las flechas pasan de un paso a otro" aria-valuemin="1" aria-valuemax="6">${svg}</div>`,
});

const html = k.pageHtml({ title: 'Del monte al puente: el cantero', theme, body, script: kitScript() + live }).replace('</style>', CSS + '</style>');
escribe('cantero', html, theme);
