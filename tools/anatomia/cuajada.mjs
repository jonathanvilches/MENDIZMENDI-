// Lámina isométrica interactiva de la cuajada (skill Anatomy, 21 de noviembre de 2026; el autor: «la elaboración de
// diferentes alimentos [...] todo lo que tenga que ver con Navarra»). La cuajada de siempre, en maqueta, sobre su tablero:
// la lechera con la leche de oveja y el colador; el fuego con las piedras de río que se ponen al rojo; el kaiku de madera
// donde se mete la piedra con las tenazas (la leche hierve y coge el sabor a tostado) y su termómetro; el cuajo; la bandeja
// de cuencos de barro donde cuaja sin moverla, y la fresquera. Al recorrerlo se ve paso a paso y se ilumina la pieza que
// trabaja. La misma secuencia que el producto de la cuajada (data/procesos.js, cuajada).
// Uso: node tools/anatomia/cuajada.mjs [--light]  →  entrega/anatomia/cuajada(-light).html (y public/anatomia, para el juego)
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';
import * as G from '../../.claude/skills/anatomy/kit/lathe.mjs';
import { kitScript } from '../../.claude/skills/anatomy/scripts/inline-kit.mjs';
import { COLORES, enJuego, MARCA_JUEGO, escribe } from './comun.mjs';

const theme = process.argv.includes('--light') ? 'light' : 'dark';
const WIDTH = 600, HEIGHT = 250;

// ---------- el modelo (centímetros de la maqueta) ----------
const LECH = { x: -122, y: -30 };                       // la lechera
const FUEGO = { x: -96, y: -36, r: 8 };                  // el fuego, con su corro de piedras
const KAIKU = { x: -70, y: -26, z0: 4 };                 // el kaiku, sobre un taburete
const CUAJO = { x: -50, y: -16 };
const BANDEJA = { x: -38, y: -40, w: 34, d: 22 };
const FRESQ = { x: 6, y: -44, w: 22, d: 12 };
const PASOS = ['La leche', 'El fuego', 'La piedra al rojo', 'El cuajo', 'En los cuencos', 'Reposar'];

// ---------- la cámara ----------
const PLATE = { x: -140, y: -52, w: 180, d: 54, r: 7 };
const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [LECH.x, LECH.y, 18], [KAIKU.x, KAIKU.y, KAIKU.z0 + 16], [FRESQ.x + 11, FRESQ.y + 6, 24]], WIDTH, HEIGHT, { pad: 10, azimuth: 76, elevation: 30 });
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
const arcoDelante = (x, y, r, z, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const t = VIS - Math.PI / 2 + i / n * Math.PI; return [x + Math.cos(t) * r, y + Math.sin(t) * r, z]; });
const seam = (x, y, r, z) => k.pathOf(arcoDelante(x, y, r, z).map(at));

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
  const regla = { x: -112, y: -6, w: 62, d: 5.5, r: 1 };
  out.push(S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
  const t = k.topTicks(regla.x + 3, regla.x + regla.w - 3, 2, 5, regla.y + 0.6, 0.6, [1.6, 3], P);
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
  out.push(D([at([regla.x + 1.5, regla.y + 2.8, 0.6]), at([regla.x + regla.w - 1.5, regla.y + 2.8, 0.6])], { size: 0.45 }));
  const placa = { x: -36, y: -8, w: 46, d: 7.5, r: 1.2 };
  out.push(S(k.slabOf(placa, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(placa, 1.1), 0.8, P, 4), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([placa.x + 5, placa.y + 4.4], 0.8, P, 'x'), 'GAZTANBERA', { size: 2.4, tone: 'mid' }));
  out.push(D([at([placa.x + 2.2, placa.y + 3.75, 0.8]), at([placa.x + placa.w - 2.2, placa.y + 3.75, 0.8])], { size: 0.4 }));
  return out.join('');
}

// ---------- la lechera y el colador ----------
function lechera() {
  const { x, y } = LECH, F = FZ(x, y), out = [];
  out.push(S(G.solidOf([[0, 4.4], [0.6, 4.8], [9, 4.8], [11.5, 3.2], [13.5, 2.4], [14.5, 2.6]], F, P), { tone: 'mid', className: 'lata' }));
  out.push(L(seam(x, y, 4.8, 2) + seam(x, y, 4.8, 7.5), { tone: 'lo' }));
  out.push(S(k.cylinder(x, y, 2.9, 14.5, 1.4, P, 24), { tone: 'mid', className: 'lata' }), S(k.cylinder(x, y, 0.8, 15.9, 1, P, 12), { tone: 'mid' }));
  // las asas, a los lados
  for (const a of [VIS - Math.PI / 2, VIS + Math.PI / 2]) { const p = [x + Math.cos(a) * 4.8, y + Math.sin(a) * 4.8], q = [x + Math.cos(a) * 6.2, y + Math.sin(a) * 6.2]; out.push(L(linea([[p[0], p[1], 10.6], [q[0], q[1], 10], [q[0], q[1], 8], [p[0], p[1], 7.6]]), { tone: 'mid', className: 'asa' }), D([at([p[0], p[1], 10.6]), at([p[0], p[1], 7.6])], { size: 0.5, tone: 'mid' })); }
  return `<g data-part="lechera">${out.join('')}</g>`;
}

// ---------- el fuego: el corro de piedras, los troncos, las brasas y las piedras de río que se calientan ----------
const PIEDRAS = [[-2.4, -1.6], [1.8, -2.4], [2.6, 1.6], [-1.6, 2.4]].map(([dx, dy]) => [FUEGO.x + dx, FUEGO.y + dy, 1.9]);
function fuego() {
  const { x, y, r } = FUEGO, out = [];
  out.push(`<path class="ceniza" d="${k.ring(x, y, r - 1, 0.2, P, 32)}"/>`);
  const corro = Array.from({ length: 11 }, (_, i) => { const a = i / 11 * Math.PI * 2; return [x + Math.cos(a) * r, y + Math.sin(a) * r * 0.95, 1.2]; });
  const atras = corro.filter((p) => dep(p) < dep([x, y, 1.2])), delante = corro.filter((p) => dep(p) >= dep([x, y, 1.2]));
  out.push(porDepth(atras, (p) => p).map((p) => S(G.sphereOf(p, 1.6, P), { tone: 'mid', className: 'canto' })).join(''));
  // los troncos cruzados y las brasas
  for (const [a, b] of [[[x - 5, y - 2, 0.9], [x + 4, y + 1.5, 1.2]], [[x - 1, y - 5, 1.6], [x + 1.5, y + 4.5, 1.1]]]) out.push(S(G.solidOf([[0, 0.9], [Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), 0.8]], G.frameAlong(a, [b[0] - a[0], b[1] - a[1], b[2] - a[2]]), P), { tone: 'mid', className: 'tronco' }));
  out.push(`<path class="brasa" d="${k.ring(x, y, 3.4, 0.6, P, 24)}"/>`);
  out.push(`<g data-part="piedras-fuego">${porDepth(PIEDRAS, (p) => p).map((p, i) => `<g data-part="piedra-${i}">${S(G.sphereOf(p, 1.3, P), { tone: 'mid', className: 'piedra' })}</g>`).join('')}</g>`);
  out.push(`<g data-part="llamas"></g>`);
  out.push(porDepth(delante, (p) => p).map((p) => S(G.sphereOf(p, 1.6, P), { tone: 'mid', className: 'canto' })).join(''));
  return `<g data-part="fuego">${out.join('')}</g>`;
}

// ---------- el kaiku sobre su taburete, con el mango, la leche, el termómetro y las tenazas ----------
const KP = [[0, 4.2], [0.6, 4.6], [3, 5.2], [7, 5.6], [9.4, 5.4], [10, 5.8]];   // el perfil del kaiku: tallado de una pieza
const ZK = KAIKU.z0 + 10, ZL = KAIKU.z0 + 8.4;                                    // el borde y la leche
function kaiku() {
  const { x, y, z0 } = KAIKU, out = [];
  // el taburete de tres patas
  for (const a of [VIS - 2.1, VIS + 2.1, VIS + Math.PI].sort((p, q) => dep([Math.cos(p), Math.sin(p), 0]) - dep([Math.cos(q), Math.sin(q), 0]))) out.push(S(k.cylinder(x + Math.cos(a) * 4.4, y + Math.sin(a) * 4.4, 0.6, 0, z0 - 0.9, P, 10), { tone: 'mid', className: 'madera' }));
  out.push(S(k.cylinder(x, y, 6.4, z0 - 1.1, 1.1, P, 32, 0.3), { tone: 'mid', className: 'madera' }));
  // el mango tallado, que sale del borde (detrás del cuerpo si apunta hacia atrás)
  const am = VIS + Math.PI * 0.62, m0 = [x + Math.cos(am) * 5.4, y + Math.sin(am) * 5.4], m1 = [x + Math.cos(am) * 10.5, y + Math.sin(am) * 10.5];
  const mango = poly([[m0[0], m0[1], ZK - 2.2], [m1[0], m1[1], ZK + 0.6], [m1[0], m1[1], ZK + 2.2], [m0[0], m0[1], ZK - 0.2]]);
  out.push(`<path class="madera-f" d="${mango}"/>`, L(mango, { tone: 'mid' }));
  out.push(S(G.solidOf(KP, FZ(x, y, z0), P), { tone: 'mid', className: 'kaiku' }));
  out.push(L(seam(x, y, 5.27, z0 + 3.2) + seam(x, y, 5.5, z0 + 6) + seam(x, y, 5.6, z0 + 7), { tone: 'lo' }));   // las rayas talladas
  out.push(`<path class="hueco" d="${k.ring(x, y, 5.2, ZK, P, 40)}"/>`, `<path data-part="leche-k" class="leche" d="${k.ring(x, y, 5.1, ZL, P, 40)}" style="opacity:.25"/>`, `<g data-part="burbujas"></g>`);
  out.push(L(k.ring(x, y, 5.2, ZK, P, 40), { tone: 'mid' }));
  out.push(`<g data-part="vapor"></g>`);
  // el termómetro de esfera, enganchado al borde
  const Ft = G.frameAlong([TER.x, TER.y - 0.6, TER.z], [0, 1, 0]);
  out.push(S(k.slabOf({ x: TER.x - 0.4, y: TER.y - 1.1, w: 0.8, d: 0.8, r: 0.1 }, ZK - 1, TER.z - TER.r - ZK + 1.4, P, 1), { tone: 'mid' }));
  out.push(S(G.disc(0, 1, TER.r, Ft, P), { tone: 'mid', className: 'esfera' }));
  const yc = TER.y + 0.42, pt = (t, rr) => [TER.x + Math.cos(t) * rr, yc, TER.z + Math.sin(t) * rr];
  let marcas = ''; for (let i = 0; i <= 10; i++) { const t = TER.a0 - i / 10 * TER.span; marcas += linea([pt(t, TER.r - 0.35), pt(t, TER.r - (i % 5 === 0 ? 1.3 : 0.85))]); }
  out.push(L(marcas, { tone: 'mid' }));
  const t37 = TER.a0 - 37 / 100 * TER.span;
  out.push(`<path class="iso-line limite" data-tone="mid" d="${linea([pt(t37, TER.r - 0.35), pt(t37, TER.r - 1.5)])}"/>`);
  out.push(`<path data-part="aguja" class="aguja" d=""/>`, D([at([TER.x, yc, TER.z])], { size: 0.45, tone: 'mid' }));
  return `<g data-part="kaiku">${out.join('')}</g>`;
}
const TER = { x: KAIKU.x + 3.4, y: KAIKU.y + 5.4, z: KAIKU.z0 + 13.6, r: 2.6, a0: Math.PI * 1.25, span: Math.PI * 1.5 };

// ---------- el cuajo, la bandeja de cuencos de barro y la fresquera ----------
function cuajo() {
  const { x, y } = CUAJO, out = [];
  out.push(S(G.solidOf([[0, 1.5], [3.2, 1.5], [4.2, 0.7], [5.2, 0.6]], FZ(x, y), P), { tone: 'mid', className: 'vidrio' }));
  out.push(S(k.cylinder(x, y, 0.75, 5.2, 1.2, P, 12), { tone: 'mid', className: 'corcho' }));
  out.push(`<path class="etiqueta" d="${poly([...arcoDelante(x, y, 1.52, 1), ...arcoDelante(x, y, 1.52, 2.4).reverse()])}"/>`, L(seam(x, y, 1.52, 1) + seam(x, y, 1.52, 2.4), { tone: 'mid' }));
  return `<g data-part="cuajo">${out.join('')}</g><g data-part="gotas"></g>`;
}
const CUENCOS = []; for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) CUENCOS.push([BANDEJA.x + 5 + i * 8, BANDEJA.y + 6 + j * 10]);
const CP = [[0, 1.8], [0.4, 2.2], [2.6, 3.3], [3.2, 3.5]];
function bandeja() {
  const b = BANDEJA, out = [];
  out.push(S(k.slabOf({ x: b.x, y: b.y, w: b.w, d: b.d, r: 0.8 }, 0, 1.2, P, 2, 0.3), { tone: 'mid', className: 'madera' }));
  out.push(L(k.planOutline(k.insetPlan({ x: b.x, y: b.y, w: b.w, d: b.d, r: 0.8 }, 1.2), 1.2, P), { tone: 'faint' }));
  out.push(porDepth(CUENCOS.map((c, i) => [c, i]), ([c]) => [c[0], c[1], 0]).map(([[x, y], i]) => S(G.solidOf(CP, FZ(x, y, 1.2), P), { tone: 'mid', className: 'barro' }) + `<path class="hueco" d="${k.ring(x, y, 3.2, 4.4, P, 28)}"/><path data-part="cuenco-${i}" class="leche" d="${k.ring(x, y, 3, 3.9, P, 28)}" style="opacity:0"/>` + L(k.ring(x, y, 3.2, 4.4, P, 28), { tone: 'mid' })).join(''));
  out.push(`<path data-part="chorro-c" class="leche" d=""/>`);
  return `<g data-part="bandeja">${out.join('')}</g>`;
}
function fresquera() {
  const f = FRESQ, out = [];
  for (const [px, py] of porDepth([[f.x, f.y], [f.x + f.w - 1.4, f.y], [f.x, f.y + f.d - 1.4], [f.x + f.w - 1.4, f.y + f.d - 1.4]], ([p, q]) => [p, q, 0])) out.push(S(k.slabOf({ x: px, y: py, w: 1.4, d: 1.4, r: 0.2 }, 0, 22, P, 1), { tone: 'mid', className: 'madera' }));
  for (const z of [7, 14]) out.push(S(k.slabOf({ x: f.x - 0.4, y: f.y - 0.4, w: f.w + 0.8, d: f.d + 0.8, r: 0.3 }, z, 0.9, P, 1), { tone: 'mid', className: 'madera' }));
  out.push(S(k.slabOf({ x: f.x - 0.6, y: f.y - 0.6, w: f.w + 1.2, d: f.d + 1.2, r: 0.3 }, 22, 1.1, P, 1, 0.2), { tone: 'mid', className: 'madera' }));
  // en las baldas: cuencos ya cuajados y el tarro de miel para acompañar
  for (const [x, y, z] of [[f.x + 5, f.y + 6, 7.9], [f.x + 12, f.y + 6, 7.9], [f.x + 5, f.y + 6, 14.9]]) out.push(S(G.solidOf(CP, FZ(x, y, z), P), { tone: 'mid', className: 'barro' }) + `<path class="cuajada" d="${k.ring(x, y, 3, z + 2.7, P, 28)}"/>` + L(k.ring(x, y, 3.2, z + 3.2, P, 28), { tone: 'mid' }));
  out.push(S(G.solidOf([[0, 2], [3.4, 2], [3.8, 1.6]], FZ(f.x + 15, f.y + 6, 14.9), P), { tone: 'mid', className: 'tarro' }), S(k.cylinder(f.x + 15, f.y + 6, 1.7, 18.7, 0.8, P, 20), { tone: 'mid', className: 'tapa' }));
  return `<g data-part="fresquera">${out.join('')}</g>`;
}

// ---------- la figura ----------
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'Maqueta de cómo se hace la cuajada: la lechera con la leche de oveja; el fuego con un corro de piedras y las piedras de río que se ponen al rojo; el kaiku de madera sobre su taburete, con el termómetro, donde se mete la piedra con las tenazas; el frasco de cuajo; la bandeja de cuencos de barro y la fresquera con cuajadas hechas y un tarro de miel.',
  body: [
    tablero(),
    lechera(), fuego(), kaiku(), `<g data-part="tenazas"><path data-part="ten-a" class="iso-line tenaza" data-tone="mid" d=""/><path data-part="ten-b" class="iso-line tenaza" data-tone="mid" d=""/><g class="iso-dots" data-tone="mid"><circle data-part="ten-eje" r="0.7"/><circle data-part="ten-pa" r="0.6"/><circle data-part="ten-pb" r="0.6"/><circle data-part="ten-ta" r="0.45"/><circle data-part="ten-tb" r="0.45"/></g></g><g data-part="piedra-vuela"></g><path data-part="chorro-l" class="leche" d=""/>`,
    cuajo(), bandeja(), fresquera(),
  ],
});

// ---------- lo que se mueve en la página ----------
const live = MARCA_JUEGO + `
const P = ${JSON.stringify(P)}, LECH = ${JSON.stringify(LECH)}, FUEGO = ${JSON.stringify(FUEGO)}, KAIKU = ${JSON.stringify(KAIKU)}, ZK = ${ZK}, ZL = ${ZL}, TER = ${JSON.stringify(TER)};
const PIEDRAS = ${JSON.stringify(PIEDRAS)}, CUAJO = ${JSON.stringify(CUAJO)}, CUENCOS = ${JSON.stringify(CUENCOS)}, VIS = ${VIS};
const PASOS = ${JSON.stringify(PASOS)}, N = PASOS.length;
const at = (p) => iso(p, P), linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L'), poly = (pts) => linea(pts) + 'Z';
const dep = (p) => depthOf(p, P), K = Math.hypot(at([0, 0, 1])[0] - at([0, 0, 0])[0], at([0, 0, 1])[1] - at([0, 0, 0])[1]);
const stage = document.querySelector('.iso-stage'), svgEl = stage.querySelector('svg'), $ = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const el = { llamas: $('llamas'), lecheK: $('leche-k'), burbujas: $('burbujas'), vapor: $('vapor'), aguja: $('aguja'), tenA: $('ten-a'), tenB: $('ten-b'), tenEje: $('ten-eje'), tenPa: $('ten-pa'), tenPb: $('ten-pb'), tenTa: $('ten-ta'), tenTb: $('ten-tb'),
  vuela: $('piedra-vuela'), chorroL: $('chorro-l'), gotas: $('gotas'), chorroC: $('chorro-c'),
  lechera: $('lechera'), fuego: $('fuego'), kaiku: $('kaiku'), tenazas: $('tenazas'), cuajo: $('cuajo'), bandeja: $('bandeja'), fresquera: $('fresquera') };
const piedras = [0, 1, 2, 3].map((i) => $('piedra-' + i)), cuencos = CUENCOS.map((_, i) => $('cuenco-' + i));
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const ilumina = (lista, on) => { for (const n of [].concat(lista)) if (n && on !== n.hasAttribute('data-lit')) n.toggleAttribute('data-lit', on); };
const setDot = (c, p) => { const q = at(p); c.setAttribute('cx', q[0].toFixed(1)); c.setAttribute('cy', q[1].toFixed(1)); };
const chorro = (a, b, w) => { const A = at(a), B = at(b); return 'M' + (A[0] - w).toFixed(1) + ' ' + A[1].toFixed(1) + 'Q' + (B[0] - w).toFixed(1) + ' ' + ((A[1] + B[1]) / 2 - 3).toFixed(1) + ' ' + (B[0] - w * 0.7).toFixed(1) + ' ' + B[1].toFixed(1) + 'L' + (B[0] + w * 0.7).toFixed(1) + ' ' + B[1].toFixed(1) + 'Q' + (B[0] + w).toFixed(1) + ' ' + ((A[1] + B[1]) / 2 - 3).toFixed(1) + ' ' + (A[0] + w).toFixed(1) + ' ' + A[1].toFixed(1) + 'Z'; };
let s = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, txt = '', reloj = 0;
const tourAt = (t) => { const T = 2.8 * N + 2, f = (t % T) / T * (N + 0.71); const i = Math.floor(f); return Math.min(N - 0.001, i + sm((f - i) / 0.6) * 0.999); };
function draw(dt) {
  reloj += dt;
  const paso = Math.min(N - 1, Math.floor(s));
  // la leche: de la lechera al kaiku
  const echa = s < 0.95 ? sm(s / 0.3) : 0, nivel = sm(s / 0.9);
  el.chorroL.setAttribute('d', echa > 0.05 ? chorro([LECH.x + 2.4, LECH.y + 1, 15.2], [KAIKU.x - 1, KAIKU.y, ZL + 0.2], 0.45 * K * echa) : '');
  el.lecheK.style.opacity = (0.25 + 0.75 * nivel).toFixed(2);
  // el fuego: llamas y piedras que se ponen al rojo
  const fuerte = s < 3 ? 1 : 0.45; let ll = '';
  for (let i = 0; i < 6; i++) { const a = i * 1.05, B = at([FUEGO.x + Math.cos(a) * 2.2, FUEGO.y + Math.sin(a) * 2.2, 1.2]), h = (3.2 + 1.6 * Math.sin(reloj * 9 + i * 2)) * fuerte * K, w = 0.9 * K, sx = Math.sin(reloj * 7 + i) * 0.6;
    ll += '<path class="llama" d="M' + (B[0] - w).toFixed(1) + ' ' + B[1].toFixed(1) + 'Q' + (B[0] - w).toFixed(1) + ' ' + (B[1] - h * 0.5).toFixed(1) + ' ' + (B[0] + sx).toFixed(1) + ' ' + (B[1] - h).toFixed(1) + 'Q' + (B[0] + w).toFixed(1) + ' ' + (B[1] - h * 0.5).toFixed(1) + ' ' + (B[0] + w).toFixed(1) + ' ' + B[1].toFixed(1) + 'Z"/>'; }
  el.llamas.innerHTML = ll;
  const rojo = sm((s - 1) / 0.7); piedras.forEach((p) => p.style.setProperty('--rojo', rojo.toFixed(2)));
  svgEl.style.setProperty('--rojo', rojo.toFixed(2));
  // la piedra al rojo: las tenazas la sacan del fuego y la meten en el kaiku; la leche hierve
  const viaje = sm((s - 2.05) / 0.5), dentro = s > 2.55;
  const p0 = PIEDRAS[1], p1 = [KAIKU.x, KAIKU.y, ZL - 1], pv = [p0[0] + (p1[0] - p0[0]) * viaje, p0[1] + (p1[1] - p0[1]) * viaje, p0[2] + (p1[2] - p0[2]) * viaje + Math.sin(viaje * Math.PI) * 10];
  piedras[1].style.display = s > 2.05 ? 'none' : '';
  const qv = at(pv), rv = 1.3 * K * 0.95;
  el.vuela.innerHTML = s > 2.05 && !dentro ? '<circle class="piedra-roja" cx="' + qv[0].toFixed(1) + '" cy="' + qv[1].toFixed(1) + '" r="' + rv.toFixed(1) + '"/>' : '';
  const pinza = s > 2.05 && !dentro ? pv : [FUEGO.x + 9, FUEGO.y + 7, 0.6], mango = [pinza[0] + 7, pinza[1] + 4, pinza[2] + 4];
  const eje = [pinza[0] + 3.6, pinza[1] + 2, pinza[2] + 2], abre = s > 2.05 && !dentro ? 0.9 : 0.35;
  el.tenA.setAttribute('d', linea([[pinza[0] - abre, pinza[1], pinza[2]], eje, [mango[0], mango[1] - 0.8, mango[2]]]));
  el.tenB.setAttribute('d', linea([[pinza[0] + abre, pinza[1], pinza[2]], eje, [mango[0], mango[1] + 0.8, mango[2]]]));
  setDot(el.tenTa, [pinza[0] - abre, pinza[1], pinza[2]]); setDot(el.tenTb, [pinza[0] + abre, pinza[1], pinza[2]]);
  setDot(el.tenEje, eje); setDot(el.tenPa, [mango[0], mango[1] - 0.8, mango[2]]); setDot(el.tenPb, [mango[0], mango[1] + 0.8, mango[2]]);
  const hierve = dentro ? Math.max(0, 1 - (s - 2.55) / 0.9) : 0;
  let bu = ''; if (hierve > 0.05) for (let i = 0; i < 7; i++) { const a = i * 0.9 + reloj * 2, r = 1 + (i % 3) * 1.2, q = at([KAIKU.x + Math.cos(a) * r, KAIKU.y + Math.sin(a) * r, ZL + 0.1]); bu += '<circle class="burbuja" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="' + (0.4 + 0.3 * Math.sin(reloj * 8 + i)).toFixed(2) + '"/>'; }
  el.burbujas.innerHTML = bu;
  let va = ''; const humea = dentro ? Math.max(0.15, hierve) : 0;
  if (humea > 0) for (let i = 0; i < 3; i++) { const f = (reloj * 0.5 + i / 3) % 1, c = at([KAIKU.x + Math.sin(reloj + i) * 1.4, KAIKU.y, ZK + 1 + f * 9]), r = (1 + f * 2.2) * K * 0.45; va += '<ellipse class="vapor" style="opacity:' + ((1 - f) * 0.55 * humea).toFixed(2) + '" cx="' + c[0].toFixed(1) + '" cy="' + c[1].toFixed(1) + '" rx="' + (r * 1.3).toFixed(1) + '" ry="' + r.toFixed(1) + '"/>'; }
  el.vapor.innerHTML = va;
  // el termómetro: sube con la piedra y baja hasta unos 37 °C antes del cuajo
  const temp = s < 2.55 ? 18 : s < 3 ? 18 + 72 * sm((s - 2.55) / 0.3) : 90 - 53 * sm((s - 3) / 0.5);
  const ta = TER.a0 - temp / 100 * TER.span, yc = TER.y + 0.45, tip = [TER.x + Math.cos(ta) * (TER.r - 0.45), yc, TER.z + Math.sin(ta) * (TER.r - 0.45)], la = [Math.cos(ta + Math.PI / 2) * 0.25, 0, Math.sin(ta + Math.PI / 2) * 0.25];
  el.aguja.setAttribute('d', poly([[TER.x + la[0], yc, TER.z + la[2]], tip, [TER.x - la[0], yc, TER.z - la[2]], [TER.x - Math.cos(ta) * 0.6, yc, TER.z - Math.sin(ta) * 0.6]]));
  // el cuajo: unas gotas en el kaiku templado
  let go = ''; if (s > 3.45 && s < 4) for (let i = 0; i < 3; i++) { const f = (reloj * 1.4 + i / 3) % 1, a = [CUAJO.x - 1, CUAJO.y - 2, 7], b = [KAIKU.x + 1.5, KAIKU.y + 1, ZL], p = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f + Math.sin(f * Math.PI) * 4], q = at(p); go += '<circle class="gota" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r=".5"/>'; }
  el.gotas.innerHTML = go;
  // a los cuencos, uno a uno; y quietos, cuajan (la leche brillante se vuelve cuajada mate)
  const llenos = clamp(Math.floor((s - 4.05) / 0.09), 0, CUENCOS.length), cuaja = sm((s - 4.9) / 0.9);
  cuencos.forEach((c, i) => { const on = i < llenos; c.style.opacity = on ? '1' : '0'; c.setAttribute('class', on && cuaja > 0.5 ? 'cuajada' : 'leche'); });
  const ic = Math.min(CUENCOS.length - 1, llenos), pc = CUENCOS[ic];
  el.chorroC.setAttribute('d', s > 4.05 && llenos < CUENCOS.length ? chorro([KAIKU.x + 5, KAIKU.y + 1, ZK], [pc[0], pc[1], 4.4], 0.35 * K) : '');
  // lo que trabaja en cada paso
  ilumina(el.lechera, paso === 0); ilumina(el.fuego, paso === 1); ilumina([el.kaiku, el.tenazas], paso === 2); ilumina(el.cuajo, paso === 3); ilumina(el.bandeja, paso === 4); ilumina(el.fresquera, paso === 5);
  const extra = ['leche de oveja, colada', 'piedras de río al rojo', 'hierve y sabe a tostado', 'a unos 37 °C, unas gotas', 'sin moverla, cuaja', 'fresca, con miel o azúcar'][paso];
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
  dark: { kaiku: ['#5a3a2a', '#2e1c14', '#3c2619', '#4a301f', '#583a26', '#6a4830'], barro: ['#8a4a30', '#4a2418', '#5e2e1e', '#723824', '#86432c', '#9a5236'], tronco: ['#4a3628', '#2a1d16', '#35261c', '#403022', '#4c3a2a', '#5a4632'] },
  light: { kaiku: ['#a8805e', '#76543c', '#86624a', '#967054', '#a67e60', '#ba9474'], barro: ['#c8784e', '#94502e', '#a85e38', '#ba6c42', '#cc7a4e', '#de8e60'], tronco: ['#8a6a50', '#5e4636', '#6c523e', '#7a5e48', '#886a52', '#9a7c62'] },
};
const colores = Object.entries(COLOR).map(([th, m]) => Object.entries(m).map(([cls, v]) => tonos(th === 'light' ? '.iso[data-theme="light"] ' : '', cls, v)).join('')).join('');
const CSS = COLORES + enJuego(WIDTH, HEIGHT) + `
.iso{--leche:#f4f0ea;--cuajada:#e8dcc0;--hueco:#0d0718;--madera:#3a2440;--madera-f:#5a3a2a;--ceniza:#2a2232;--brasa:#c2401c;--llama:#ff8a2a;--vapor:#d8cdea;--burbuja:#ffffff;--gota:#e8dcc0;--etiqueta:#7a3b8f;--vidrio:#22283a;--piedra-frio:#4a4258}
.iso[data-theme="light"]{--leche:#ffffff;--cuajada:#f2e6c8;--hueco:#8c7a86;--madera:#e7d9cf;--madera-f:#a8805e;--ceniza:#bcb2c4;--brasa:#e05a2a;--llama:#ff8a2a;--vapor:#8a7aa8;--burbuja:#ffffff;--gota:#d6c49a;--etiqueta:#a64cc0;--vidrio:#eef2f8;--piedra-frio:#9a92a8}
.leche{fill:var(--leche)}.cuajada{fill:var(--cuajada)}.hueco{fill:var(--hueco)}.madera-f{fill:var(--madera-f)}.ceniza{fill:var(--ceniza)}.brasa{fill:var(--brasa);opacity:.85}.llama{fill:var(--llama);opacity:.9}
.vapor{fill:var(--vapor)}.burbuja{fill:var(--burbuja);opacity:.85}.gota{fill:var(--gota)}.etiqueta{fill:var(--etiqueta)}.aguja{fill:var(--anatomy-lit)}.limite{stroke:var(--anatomy-lit)}
.piedra-roja{fill:#ff5a24}.asa{stroke-width:.9}.tenaza{stroke-width:1.1;stroke-linecap:round}
.piedra>.iso-fill,.piedra>.iso-top,.piedra>.iso-shade{fill:color-mix(in srgb,#ff5a24 calc(var(--rojo,0)*100%),var(--piedra-frio))!important}
.piedra>.iso-shade,.piedra>.iso-top{stroke:color-mix(in srgb,#ff5a24 calc(var(--rojo,0)*100%),var(--piedra-frio))!important;stroke-width:.4}
.madera>.iso-fill,.madera>.iso-top{fill:var(--madera)}.vidrio>.iso-fill,.vidrio>.iso-top{fill:var(--vidrio)}
[data-lit] .iso-edge,[data-lit].iso-line,[data-lit] .iso-line,[data-lit] .tb-edge{stroke:var(--anatomy-lit)}
[data-lit] .iso-top,[data-lit].iso-top{fill:var(--anatomy-lit-top)}
[data-lit] .iso-dots circle{fill:var(--anatomy-lit)}
` + colores;

const body = k.plateHtml({
  fig: 'Lámina 9',
  title: 'Cómo se hace la cuajada',
  hint: 'Pasa el ratón: paso a paso',
  readout: '1 · La leche',
  keys: [
    { mark: 'lit', label: 'La pieza que trabaja en cada paso: la lechera, el fuego, el kaiku, el cuajo, los cuencos y la fresquera' },
    { mark: 'raised', label: 'La piedra al rojo hace hervir la leche dentro del kaiku y le da el sabor a tostado' },
    { mark: 'flat', label: 'Una vez en los cuencos, la cuajada no se mueve hasta que cuaja' },
  ],
  caption: 'La cuajada se hace con leche de oveja. Antes se calentaba en el kaiku, un recipiente de madera tallado de una pieza: se ponían al rojo unas piedras de río en el fuego y se metían en la leche con unas tenazas; la leche hervía y cogía un sabor a tostado. Templada a unos 37 °C, se le echan unas gotas de cuajo, se reparte en cuencos de barro y se deja quieta hasta que cuaja. Se toma fresca, con miel o con azúcar. Hoy se hace sobre todo en obradores, pero en algunas casas se sigue haciendo con piedra.',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="La cuajada, paso a paso: las flechas pasan de un paso a otro" aria-valuemin="1" aria-valuemax="6">${svg}</div>`,
});

const html = k.pageHtml({ title: 'Cómo se hace la cuajada', theme, body, script: kitScript() + live }).replace('</style>', CSS + '</style>');
escribe('cuajada', html, theme);
