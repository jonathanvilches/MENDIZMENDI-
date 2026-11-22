// Lámina isométrica interactiva «Cómo se hace una alpargata» (skill Anatomy, 21 de noviembre de 2026; el autor:
// «explicaciones técnicas con Anatomy de oficios antiguos, de procesos de elaboración de productos artesanales de Navarra»).
// El taller de la alpargatera, en maqueta: el poste donde se trenzan tres cabos de yute (con los manojos de fibra y el rollo
// de trenza en el suelo); el banco donde la trenza se enrolla en espiral con la forma del pie y se cose de lado a lado con la
// aguja grande y el cáñamo; la prensa de husillo que la deja plana y dura; el pie donde se cosen la puntera y el talón de
// lona, y por último las cintas. Una sola suela viaja de un puesto a otro. Delante, la caja con un par acabado. Al
// recorrerla, paso a paso, se ilumina lo que trabaja. Es la que se abre al acabar el taller de la alpargatera
// (data/oficios.js) y en el material didáctico.
// Uso: node tools/anatomia/alpargata.mjs [--light]  →  entrega/anatomia/alpargata(-light).html (y public/anatomia, para el juego)
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';
import * as G from '../../.claude/skills/anatomy/kit/lathe.mjs';
import { kitScript } from '../../.claude/skills/anatomy/scripts/inline-kit.mjs';
import { COLORES, enJuego, MARCA_JUEGO, escribe, PUENTE } from './comun.mjs';

const theme = process.argv.includes('--light') ? 'light' : 'dark';
const WIDTH = 600, HEIGHT = 320;

// ---------- el modelo (centímetros de la maqueta) ----------
// la suela: 12 de largo, de 1,6 a 2,2 de media anchura; la trenza, de 0,3 de ancho, da unas 4,6 vueltas de dentro afuera.
const SUELA = { L: 12, bw: 0.3, vueltas: 4.6, grueso: 0.9, prensada: 0.6, puntadas: 12 };
const POSTE = { x: -52, y: -47, h: 15 };
const ROLLO = { x: -43, y: -45 };
const BANCO = { x: -36, y: -52, w: 22, d: 9, z: 6, h: 0.9 };
const PRENSA = { x: -3, y: -45, cama: 5.2, cruz: 15.5 };
const PIE = { x: 9, y: -24, w: 14, d: 10, z: 5, h: 0.8 };
const CAJA = { x: -50, y: -28, w: 16, d: 13, h: 3.4 };
const PASOS = ['Trenzar', 'Enrollar', 'Coser', 'Prensar', 'Lona', 'Cintas'];
const PUESTOS = [[-52, -47, 8], [-25, -47.5, 7], [-19, -46, 7], [-3, -45, 12], [16, -19, 7], [19, -16, 6]];
const EN_BANCO = [BANCO.x + 9, BANCO.y + 4.5, BANCO.z + BANCO.h], EN_PRENSA = [PRENSA.x, PRENSA.y, PRENSA.cama], EN_PIE = [PIE.x + 7, PIE.y + 5, PIE.z + PIE.h];

// ---------- la cámara ----------
const PLATE = { x: -61, y: -55, w: 91, d: 51, r: 7 };
const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [PRENSA.x, PRENSA.y, 23], [POSTE.x, POSTE.y, POSTE.h + 1]], WIDTH, HEIGHT, { pad: 8, azimuth: 66, elevation: 30 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const dep = (p) => k.depthOf(p, P);
const linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(2)).join(' ')).join('L');
const poly = (pts) => linea(pts) + 'Z';
const FZ = (x, y, z = 0) => G.frameAlong([x, y, z], [0, 0, 1]);
const FX = (x, y, z) => G.frameAlong([x, y, z], [1, 0, 0]);
const porDepth = (lista, f) => [...lista].sort((a, b) => dep(f(a)) - dep(f(b)));
const V = G.viewOf(P), LZ = G.lightOf(P);
const caja = (x0, x1, y0, y1, z0, h, cls, bevel = 0.2) => S(k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: 0.2 }, z0, h, P, 2, bevel), { tone: 'mid', className: cls });
const pata = (x, y, z0, z1, r = 0.5, cls = 'madera') => S(k.cylinder(x, y, r, z0, z1 - z0, P, 12), { tone: 'mid', className: cls });

// ---------- el tablero de la maqueta ----------
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
  const regla = { x: 9, y: -11.5, w: 18, d: 5.5, r: 1 };
  out.push(S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo' }));
  const t = k.topTicks(regla.x + 3, regla.x + regla.w - 3, 2, 5, regla.y + 0.05, 0.6, [1.8, regla.d - 0.1], P);
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
  out.push(D([at([regla.x + 1.5, regla.y + 2.8, 0.6]), at([regla.x + regla.w - 1.5, regla.y + 2.8, 0.6])], { size: 0.45 }));
  const placa = { x: -28, y: -12.8, w: 34, d: 7.5, r: 1.2 };
  out.push(S(k.slabOf(placa, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(placa, 1.1), 0.8, P, 4), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([placa.x + 5.2, placa.y + 4.4], 0.8, P, 'x'), 'ESPARTINAK · MAULE', { size: 2.4, tone: 'mid' }));
  out.push(D([at([placa.x + 2.2, placa.y + 3.75, 0.8]), at([placa.x + placa.w - 2.2, placa.y + 3.75, 0.8])], { size: 0.4 }));
  return out.join('');
}

// ---------- el poste de trenzar: el gancho, la trenza que baja, los tres cabos y sus manojos de yute; el rollo de trenza ----------
const GANCHO = [POSTE.x + 1.1, POSTE.y + 0.6, POSTE.h - 0.6], NUDO = [POSTE.x + 5.2, POSTE.y + 7.4, 6.4];
const MANOJOS = [[POSTE.x + 1.5, POSTE.y + 11], [POSTE.x + 4.8, POSTE.y + 11.5], [POSTE.x + 8, POSTE.y + 10]];
function poste() {
  const { x, y, h } = POSTE, out = [];
  out.push(caja(x - 2.6, x + 2.6, y - 0.6, y + 0.6, 0, 0.8, 'madera'), caja(x - 0.6, x + 0.6, y - 2.6, y + 2.6, 0, 0.8, 'madera'));
  out.push(pata(x, y, 0.8, h, 0.6));
  out.push(S(G.solidOf([[0, 0.75], [0.4, 0.75], [0.6, 0.5]], FZ(x, y, h), P), { tone: 'mid', className: 'madera' }));
  out.push(`<path class="iso-line gancho" data-tone="hi" d="${linea([[x + 0.45, y + 0.25, h - 0.3], [x + 1.3, y + 0.7, h - 0.2], [x + 1.4, y + 0.75, h - 1.0], [x + 1.0, y + 0.55, h - 1.1]])}"/>`);
  out.push(D([at([x + 0.45, y + 0.25, h - 0.3]), at([x + 1.0, y + 0.55, h - 1.1])], { size: 0.35, tone: 'hi' }));
  return `<g data-part="poste">${out.join('')}</g>`;
}
function manojos() {
  const out = [];
  for (const [mx, my] of porDepth(MANOJOS, ([q, w]) => [q, w, 0])) {
    const F = FZ(mx, my, 0);
    out.push(S(G.solidOf([[0, 1.1], [0.6, 1.25, true], [1.6, 0.75, true], [2.0, 0.6], [2.4, 0.85, true], [3.0, 1.0]], F, P), { tone: 'mid', className: 'yute', crease: 'none' }));
    out.push(L(G.circleOf(F, 2.0, 0.62, P), { tone: 'mid' }));
  }
  return `<g data-part="manojos">${out.join('')}</g>`;
}
function rollo() {
  // la trenza ya hecha, enrollada en el suelo: una espiral plana
  const { x, y } = ROLLO, pts = [];
  for (let t = 0; t <= 5.2 * Math.PI * 2; t += 0.12) { const r = 0.5 + t / (Math.PI * 2) * 0.62; pts.push([x + Math.cos(t) * r, y + Math.sin(t) * r * 1, 0.35]); }
  const borde = Array.from({ length: 48 }, (_, i) => { const t = i / 48 * Math.PI * 2; return [x + Math.cos(t) * 3.95, y + Math.sin(t) * 3.95, 0]; });
  const tapa = borde.map((p) => [p[0], p[1], 0.6]);
  return `<g data-part="rollo"><path class="trenza-canto" d="${poly(borde)}"/><path class="trenza-base" d="${poly(tapa)}"/><path class="trenza" stroke-width="${(0.55 * Math.hypot(...k.iso([0, 0, 1], P).map((v, i) => v - k.iso([0, 0, 0], P)[i]))).toFixed(2)}" d="${linea(pts)}"/><path class="trenza-punto" d="${linea(pts)}"/></g>`;
}

// ---------- el banco, con la aguja, el cáñamo, la cera, el punzón y las tijeras (la suela, viva) ----------
function banco() {
  const b = BANCO, out = [];
  for (const [px, py] of porDepth([[b.x + 1.2, b.y + 1.2], [b.x + b.w - 1.2, b.y + 1.2], [b.x + 1.2, b.y + b.d - 1.2], [b.x + b.w - 1.2, b.y + b.d - 1.2]], ([q, r]) => [q, r, 0])) {
    out.push(pata(px, py, 0, b.z, 0.55));
    if (py > b.y + 2) out.push(caja(b.x + 1.8, b.x + b.w - 1.8, py - 0.35, py + 0.35, 1.6, 0.7, 'madera', 0.1));
  }
  out.push(caja(b.x, b.x + b.w, b.y, b.y + b.d, b.z, b.h, 'madera'));
  const zt = b.z + b.h;
  let vetas = ''; for (const yy of [b.y + 2.4, b.y + 7.6]) vetas += linea([[b.x + 0.12, yy, zt], [b.x + b.w - 0.12, yy, zt]]);
  out.push(L(vetas, { tone: 'faint' }));
  // el ovillo de cáñamo y la cera
  const FO = FZ(b.x + b.w - 3, b.y + 2.6, zt);
  out.push(S(G.solidOf([[0, 0.3], [0.25, 0.8, true], [0.85, 1.05, true], [1.45, 0.8, true], [1.75, 0.3]], FO, P), { tone: 'mid', className: 'canamo', crease: 'none' }));
  out.push(L(G.circleOf(FO, 0.85, 1.06, P), { tone: 'lo' }));
  out.push(caja(b.x + b.w - 6.4, b.x + b.w - 4.8, b.y + 1.8, b.y + 3.2, zt, 0.7, 'cera', 0.15));
  // el punzón y las tijeras, delante
  out.push(S(G.solidOf([[0, 0.3], [2.2, 0.35], [2.5, 0.2]], FX(b.x + 2, b.y + b.d - 1.4, zt + 0.35), P), { tone: 'mid', className: 'madera' }));
  out.push(`<path class="iso-line punzon" data-tone="hi" d="${linea([[b.x + 4.5, b.y + b.d - 1.4, zt + 0.35], [b.x + 6.6, b.y + b.d - 1.4, zt + 0.35]])}"/>`);
  out.push(D([at([b.x + 6.6, b.y + b.d - 1.4, zt + 0.35])], { size: 0.3, tone: 'hi' }));
  const tj = [b.x + b.w - 4.2, b.y + b.d - 2.2, zt + 0.05];
  out.push(`<path class="iso-line hoja-tijera" data-tone="hi" d="${linea([[tj[0] - 1.6, tj[1] - 0.5, tj[2]], [tj[0] + 1.8, tj[1] + 0.35, tj[2]]]) + linea([[tj[0] - 1.6, tj[1] + 0.5, tj[2]], [tj[0] + 1.8, tj[1] - 0.35, tj[2]]])}"/>`);
  out.push(L(k.ring(tj[0] - 2.3, tj[1] - 0.7, 0.55, tj[2], P, 14) + k.ring(tj[0] - 2.3, tj[1] + 0.7, 0.55, tj[2], P, 14), { tone: 'mid' }));
  out.push(D([at(tj), at([tj[0] + 1.8, tj[1] + 0.35, tj[2]]), at([tj[0] + 1.8, tj[1] - 0.35, tj[2]])], { size: 0.3, tone: 'hi' }));
  return `<g data-part="banco">${out.join('')}</g>`;
}

// ---------- la prensa de husillo (el husillo, el volante y el plato, vivos) ----------
function prensa() {
  const { x, y, cama, cruz } = PRENSA, out = [];
  out.push(caja(x - 7, x + 7, y - 6, y + 6, 0, 4.4, 'madera', 0.4));
  out.push(caja(x - 6.2, x + 6.2, y - 5.2, y + 5.2, 4.4, cama - 4.4, 'hierro', 0.15));
  out.push(D([[x - 5.4, y - 4.4], [x + 5.4, y - 4.4], [x - 5.4, y + 4.4], [x + 5.4, y + 4.4]].map(([px, py]) => at([px, py, cama])), { size: 0.4, tone: 'mid' }));
  out.push(`<g data-part="columna-atras">${pata(x, y - 4.5, cama, cruz, 0.7, 'hierro')}</g>`);
  return `<g data-part="prensa">${out.join('')}</g>`;
}
function prensaDelante() {
  const { x, y, cama, cruz } = PRENSA, out = [];
  out.push(pata(x, y + 4.5, cama, cruz, 0.7, 'hierro'));
  out.push(caja(x - 1.3, x + 1.3, y - 5.6, y + 5.6, cruz, 1.7, 'hierro', 0.2));
  out.push(D([at([x, y - 4.5, cruz + 1.7]), at([x, y + 4.5, cruz + 1.7])], { size: 0.45, tone: 'mid' }));
  return `<g data-part="prensa-delante">${out.join('')}</g>`;
}

// ---------- el pie donde se cose la lona, y la caja con un par acabado ----------
function pie() {
  const p = PIE, out = [];
  for (const [px, py] of porDepth([[p.x + 1, p.y + 1], [p.x + p.w - 1, p.y + 1], [p.x + 1, p.y + p.d - 1], [p.x + p.w - 1, p.y + p.d - 1]], ([q, r]) => [q, r, 0])) out.push(pata(px, py, 0, p.z, 0.45));
  out.push(caja(p.x, p.x + p.w, p.y, p.y + p.d, p.z, p.h, 'madera'));
  return `<g data-part="pie">${out.join('')}</g>`;
}
function cajaPar() {
  const c = CAJA, out = [], ins = 0.5, zt = c.h, zf = 0.8;
  out.push(caja(c.x, c.x + c.w, c.y, c.y + c.d, 0, c.h, 'carton', 0.15));
  const x0 = c.x + ins, x1 = c.x + c.w - ins, y0 = c.y + ins, y1 = c.y + c.d - ins;
  const boca = [[x0, y0, zt], [x1, y0, zt], [x1, y1, zt], [x0, y1, zt]];
  out.push(`<clipPath id="alp-caja"><path d="${poly(boca)}"/></clipPath>`);
  out.push(`<path class="caja-suelo" d="${poly(boca)}"/>`);
  out.push(`<g clip-path="url(#alp-caja)"><path class="caja-dentro" d="${poly([[x0, y0, zt], [x1, y0, zt], [x1, y0, zf], [x0, y0, zf]])}"/><path class="caja-dentro2" d="${poly([[x0, y0, zt], [x0, y1, zt], [x0, y1, zf], [x0, y0, zf]])}"/><g data-part="par"></g></g>`);
  out.push(L(poly(boca), { tone: 'lo' }));
  // la tapa, apoyada detrás
  return `<g data-part="caja">${out.join('')}</g>`;
}

// ---------- la figura ----------
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'Maqueta del taller de la alpargatera: el poste donde se trenzan tres cabos de yute, con los manojos de fibra y el rollo de trenza; el banco donde la trenza se enrolla en espiral con la forma del pie y se cose de lado a lado; la prensa de husillo que aplasta la suela; el pie donde se cosen la puntera y el talón de lona y las cintas; y la caja con un par acabado.',
  body: [tablero(), poste(), '<g data-part="trenzando"></g>', manojos(), rollo(), banco(), prensa(), '<g data-part="suela-prensa"></g>', '<g data-part="husillo"></g>', prensaDelante(), '<g data-part="volante"></g>', cajaPar(), pie(), '<g data-part="suela"></g>', '<g data-part="aguja"></g>'],
});

// ---------- lo que se mueve en la página ----------
const live = MARCA_JUEGO + `
const P = ${JSON.stringify(P)}, SU = ${JSON.stringify(SUELA)}, PRENSA = ${JSON.stringify(PRENSA)}, PUESTOS = ${JSON.stringify(PUESTOS)};
const EN_BANCO = ${JSON.stringify(EN_BANCO)}, EN_PRENSA = ${JSON.stringify(EN_PRENSA)}, EN_PIE = ${JSON.stringify(EN_PIE)}, CAJA = ${JSON.stringify(CAJA)};
const GANCHO = ${JSON.stringify(GANCHO)}, NUDO = ${JSON.stringify(NUDO)}, MANOJOS = ${JSON.stringify(MANOJOS)};
const V = ${JSON.stringify(V)}, LZ = ${JSON.stringify(LZ)};
const PASOS = ${JSON.stringify(PASOS)}, N = PASOS.length;
const at = (p) => iso(p, P), f1 = (v) => v.toFixed(1), f2 = (v) => v.toFixed(2), linea = (pts) => 'M' + pts.map((p) => { const q = at(p); return f2(q[0]) + ' ' + f2(q[1]); }).join('L'), poly = (pts) => linea(pts) + 'Z';
const K = Math.hypot(at([0, 0, 1])[0] - at([0, 0, 0])[0], at([0, 0, 1])[1] - at([0, 0, 0])[1]);
const stage = document.querySelector('.iso-stage'), svgEl = stage.querySelector('svg'), $ = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const el = {}; for (const n of ['poste', 'trenzando', 'manojos', 'rollo', 'banco', 'prensa', 'husillo', 'prensa-delante', 'volante', 'caja', 'par', 'pie', 'suela', 'suela-prensa', 'aguja']) el[n] = $(n);
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }, mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const ilumina = (lista, on) => { for (const n of [].concat(lista)) if (n && on !== n.hasAttribute('data-lit')) n.toggleAttribute('data-lit', on); };
let s = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, txt = '', reloj = 0;
const tourAt = (t) => { const T = 3 * N + 2, f = (t % T) / T * (N + 0.71); const i = Math.floor(f); return Math.min(N - 0.001, i + sm((f - i) / 0.6) * 0.999); };
// ---- la forma de la suela: media anchura a lo largo (u), con el talón, la cintura y la planta ----
const W = (u) => 1.62 + 0.6 * sm((u + 1.5) / 4.5) - 0.22 * Math.exp(-(((u + 1.4) / 1.3) ** 2));
const SH = (u, Ld) => Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, Math.abs(2 * u / Ld)), 3.2)), 1 / 3.2);
// un punto del contorno metido d hacia dentro, en t ∈ [0, 1) (del talón por un lado a la punta y vuelta por el otro)
function contorno(t, d) { const Ld = Math.max(0.01, SU.L - 2 * d), a = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5, u = (t < 0.5 ? -1 : 1) * Math.cos(Math.PI * a) * Ld / 2, v = Math.max(0, W(u) * SH(u, Ld) - d); return [u, t < 0.5 ? v : -v]; }
const lugar = (c, u, v, z) => [c[0] + u, c[1] + v, z];
const borde = (c, d, z, n = 96) => Array.from({ length: n }, (_, i) => { const [u, v] = contorno(i / n, d); return lugar(c, u, v, z); });
// ---- la alpargata entera, en el estado e: vueltas de trenza (0..1), puntadas de la suela, grueso, lona (0..1), puntadas de la lona (0..1), cintas (0..1) ----
function alpargata(c, e, lit) {
  let o = '';
  const top = c[2] + e.grueso, K2 = SU.vueltas * SU.bw;
  // lo enrollado: la espiral va de dentro afuera; el canto, por la vuelta de fuera
  const dFuera = Math.max(0, K2 - e.vueltas * K2);
  if (e.vueltas > 0.01) {
    const dc = Math.max(0, dFuera - SU.bw * 0.5);
    o += '<path class="suela-canto" d="' + poly(borde(c, dc, c[2])) + '"/><path class="suela-base" d="' + poly(borde(c, dc, top)) + '"/>';
    const pts = []; for (let tau = SU.vueltas; tau >= SU.vueltas * (1 - e.vueltas) - 1e-6; tau -= 1 / 90) { const t = ((tau % 1) + 1) % 1, [u, v] = contorno(t, tau * SU.bw); pts.push(lugar(c, u, v, top + 0.01)); }
    if (pts.length > 1) o += '<path class="trenza" stroke-width="' + f2(SU.bw * K * 0.92) + '" d="' + linea(pts) + '"/><path class="trenza-punto" d="' + linea(pts) + '"/>';
    o += '<path class="suela-borde' + (lit ? '' : '') + '" d="' + poly(borde(c, dc, top)) + '"/>';
  }
  // las puntadas de lado a lado, con cáñamo
  if (e.puntadas > 0) { let d = ''; for (let i = 0; i < Math.min(SU.puntadas, Math.floor(e.puntadas)); i++) { const u = -SU.L / 2 + 0.9 + i * (SU.L - 1.8) / (SU.puntadas - 1), hw = W(u) * SH(u, SU.L) - 0.12; d += linea([lugar(c, u, -hw, top + 0.02), lugar(c, u, hw, top + 0.02)]); } o += '<path class="puntada" d="' + d + '"/>'; }
  // la lona: el talón (una pared baja que rodea la parte de atrás) y la puntera (una cúpula baja por delante)
  if (e.lona > 0.01) {
    const hT = 1.1 * sm(e.lona / 0.5), tal = [];
    for (let i = 0; i <= 40; i++) { const t = -0.19 + i / 40 * 0.38, [u, v] = contorno((t + 1) % 1, 0); tal.push([u, v]); }
    const caras = [];
    for (let i = 0; i < tal.length - 1; i++) { const [ua, va] = tal[i], [ub, vb] = tal[i + 1], n = [-(vb - va), ub - ua], l = Math.hypot(...n) || 1, vis = (n[0] * V[0] + n[1] * V[1]) / l, luz = (n[0] * LZ[0] + n[1] * LZ[1]) / l;
      caras.push({ q: [lugar(c, ua, va, top), lugar(c, ub, vb, top), lugar(c, ub, vb, top + hT), lugar(c, ua, va, top + hT)], vis, luz, d: depthOf(lugar(c, (ua + ub) / 2, (va + vb) / 2, top), P) }); }
    caras.sort((A, B) => A.d - B.d);
    for (const f of caras) if (f.vis <= 0) o += '<path class="lona-dentro" d="' + poly(f.q) + '"/>';
    // la puntera: media cúpula baja sobre la parte de delante (u > 0,8), con su brillo del lado de la luz
    if (e.lona > 0.35) { const fp = sm((e.lona - 0.35) / 0.5), u0 = 0.8, Ld = SU.L, alto = 1.3 * fp, pts = [], brillo = [];
      for (let i = 0; i <= 16; i++) { const u = u0 + (Ld / 2 - u0) * i / 16, hw = W(u) * SH(u, Ld); for (let j = 0; j <= 12; j++) { const v = -hw + 2 * hw * j / 12, fu = Math.max(0, 1 - ((u - u0) / (Ld / 2 - u0)) ** 2.4), fv = Math.max(0, 1 - (v / Math.max(0.01, hw)) ** 2), z = alto * Math.sqrt(fv) * Math.sqrt(fu), q = at(lugar(c, u, v, top + z)); pts.push(q); if (v > -hw * 0.15 && v < hw * 0.75 && u < u0 + (Ld / 2 - u0) * 0.7 && z > alto * 0.55) brillo.push(q); } }
      const casco = (pp) => { pp = pp.slice().sort((A, B) => A[0] - B[0] || A[1] - B[1]); const cr = (O, A, B) => (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0]); const lo = [], up = []; for (const p of pp) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); } for (let i = pp.length - 1; i >= 0; i--) { const p = pp[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); } return lo.slice(0, -1).concat(up.slice(0, -1)); };
      const cam = (pp) => 'M' + casco(pp).map((q) => f2(q[0]) + ' ' + f2(q[1])).join('L') + 'Z';
      o += '<path class="lona" d="' + cam(pts) + '"/>' + (brillo.length > 2 ? '<path class="lona-brillo" d="' + cam(brillo) + '"/>' : '');
      // el ribete de la boca de la puntera
      const rib = [], hw0 = W(u0) * SH(u0, Ld); for (let j = 0; j <= 16; j++) { const v = -hw0 + 2 * hw0 * j / 16; rib.push(lugar(c, u0, v, top + alto * Math.sqrt(Math.max(0, 1 - (v / hw0) ** 2)))); }
      o += '<path class="ribete" d="' + linea(rib) + '"/>'; }
    for (const f of caras) if (f.vis > 0) { const n = f.luz > 0.3 ? 2 : f.luz > -0.3 ? 1 : 0; o += '<path class="lona-cara l' + n + '" d="' + poly(f.q) + '"/>'; }
    if (hT > 0.05) { o += '<path class="ribete" d="' + linea(tal.map(([u, v]) => lugar(c, u, v, top + hT))) + '"/>'; const a0 = tal[0], a1 = tal[tal.length - 1]; o += '<path class="ribete fino" d="' + linea([lugar(c, a0[0], a0[1], top), lugar(c, a0[0], a0[1], top + hT)]) + linea([lugar(c, a1[0], a1[1], top), lugar(c, a1[0], a1[1], top + hT)]) + '"/>'; }
  // las puntadas de la lona, a lo largo del canto que se ve
    if (e.cosido > 0.01) { let d = ''; const n = 34; for (let i = 0; i < n * e.cosido; i++) { const t = 0.02 + i / n * 0.5, [u, v] = contorno(t, 0.04); const q = at(lugar(c, u, v, top + 0.22)); d += '<circle cx="' + f2(q[0]) + '" cy="' + f2(q[1]) + '" r=".32"/>'; } o += '<g class="puntadas-lona">' + d + '</g>'; }
  }
  // las cintas: salen de los lados del talón, suben un poco y caen sobre la mesa en una curva suave
  if (e.cintas > 0.01) { let d = ''; const l = e.cintas, crm = (pp, n = 8) => { const out = []; for (let i = 0; i < pp.length - 1; i++) { const p0 = pp[Math.max(0, i - 1)], p1 = pp[i], p2 = pp[i + 1], p3 = pp[Math.min(pp.length - 1, i + 2)]; for (let j = 0; j < n; j++) { const t = j / n, t2 = t * t, t3 = t2 * t; out.push([0, 1, 2].map((k3) => 0.5 * (2 * p1[k3] + (-p0[k3] + p2[k3]) * t + (2 * p0[k3] - 5 * p1[k3] + 4 * p2[k3] - p3[k3]) * t2 + (-p0[k3] + 3 * p1[k3] - 3 * p2[k3] + p3[k3]) * t3))); } } out.push(pp[pp.length - 1]); return out; };
    for (const [k2, t] of [0.13, 0.87].entries()) { const [u, v] = contorno(t, 0), sg = v > 0 ? 1 : -1, z0 = top + 1.0;
      d += linea(crm([lugar(c, u, v, z0), lugar(c, u - 0.4, v + sg * 0.8, z0 + 0.6 * l), lugar(c, u - 0.7, v + sg * 1.9 * l, c[2] + 0.45), lugar(c, u - 0.2, v + sg * 3.0 * l, c[2] + 0.1), lugar(c, u + (1.4 + 0.5 * k2) * l, v + sg * 3.5 * l, c[2] + 0.1)])); }
    o += '<path class="cinta" stroke-width="' + f2(0.4 * K) + '" style="opacity:' + f2(Math.min(1, e.cintas * 3)) + '" d="' + d + '"/>'; }
  return o;
}
const ACABADA = { vueltas: 1, puntadas: SU.puntadas, grueso: SU.prensada, lona: 1, cosido: 1, cintas: 1 };
function draw(dt) {
  reloj += dt;
  const paso = Math.min(N - 1, Math.floor(s));
  // 1 · trenzar: la trenza baja del gancho al nudo; los tres cabos, del nudo a los manojos
  { const cruce = paso === 0 ? reloj * 3 : 0, tr = [], n = 18; let d = '';
    for (let i = 0; i <= n; i++) tr.push(mix(GANCHO, NUDO, i / n));
    const cabos = MANOJOS.map(([mx, my], j) => { const fin = [mx, my, 2.9], m = mix(NUDO, fin, 0.5); m[2] += 0.6 + j * 0.2; return [NUDO, m, fin]; });
    for (const c of cabos) d += '<path class="cabo" stroke-width="' + f2(0.34 * K) + '" d="' + linea(c) + '"/>';
    d += '<path class="trenza" stroke-width="' + f2(0.72 * K) + '" d="' + linea(tr) + '"/><path class="trenza-punto" style="stroke-dashoffset:' + f2(-cruce * 2) + '" d="' + linea(tr) + '"/>';
    const q = at(NUDO), g = at(GANCHO); d += '<g class="iso-dots" data-tone="hi"><circle r=".55" cx="' + f2(q[0]) + '" cy="' + f2(q[1]) + '"/><circle r=".45" cx="' + f2(g[0]) + '" cy="' + f2(g[1]) + '"/></g>';
    el.trenzando.innerHTML = d; }
  // la suela: dónde está y cómo va
  const aPrensa = sm((s - 3.0) / 0.12), aPie = sm((s - 4.0) / 0.12);
  let c = mix(EN_BANCO, EN_PRENSA, aPrensa); c[2] += Math.sin(aPrensa * Math.PI) * 4;
  if (aPie > 0) { c = mix(EN_PRENSA, EN_PIE, aPie); c[2] += Math.sin(aPie * Math.PI) * 5; }
  // la prensa: baja el plato girando el volante, aprieta, y sube
  const baja = sm((s - 3.15) / 0.4) * (1 - sm((s - 3.75) / 0.2)), grueso = SU.grueso - (SU.grueso - SU.prensada) * sm((s - 3.2) / 0.35);
  const platoAbajo = PRENSA.cama + grueso, platoArriba = PRENSA.cama + SU.grueso + 3.2, zPlato = platoArriba + (platoAbajo - platoArriba) * baja;
  const e = { vueltas: sm((s - 1.0) / 0.85), puntadas: (s - 2.05) / 0.8 * SU.puntadas, grueso, lona: sm((s - 4.15) / 0.75), cosido: sm((s - 4.3) / 0.65), cintas: sm((s - 5.05) / 0.6) };
  // en la prensa, la suela va debajo del plato y de la columna de delante; en los demás sitios, encima de todo
  const enPrensa = aPrensa > 0.5 && aPie < 0.5, html = alpargata(c, e, false);
  el['suela-prensa'].innerHTML = enPrensa ? html : ''; el.suela.innerHTML = enPrensa ? '' : html;
  // el husillo, el plato y el volante
  { const x = PRENSA.x, y = PRENSA.y, largo = 12, zTop = zPlato + 0.8 + largo, giro = (platoArriba - zPlato) * 1.9;
    let h = solidSvg(slabOf({ x: x - 5.6, y: y - 3.0, w: 11.2, d: 6.0, r: 0.3 }, zPlato, 0.8, P, 2, 0.15), { tone: 'mid', className: 'hierro' });
    h += solidSvg(cylinder(x, y, 0.55, zPlato + 0.8, largo, P, 14), { tone: 'mid', className: 'hierro' });
    // los hilos del husillo: rayas inclinadas de canto a canto
    const VA = Math.atan2(V[1], V[0]), la = [Math.cos(VA + Math.PI / 2) * 0.55, Math.sin(VA + Math.PI / 2) * 0.55], lb = [-la[0], -la[1]];
    let hil = ''; for (let z = zPlato + 1.6; z < zTop - 0.4; z += 0.42) hil += linea([[x + la[0], y + la[1], z], [x + lb[0], y + lb[1], z + 0.2]]);
    h += '<path class="iso-line" data-tone="lo" d="' + hil + '"/>';
    el.husillo.innerHTML = h;
    // el volante: una barra con dos bolas que gira sobre el husillo
    const a = giro, ex = [Math.cos(a) * 5, Math.sin(a) * 5];
    const p0 = [x - ex[0], y - ex[1], zTop + 0.3], p1 = [x + ex[0], y + ex[1], zTop + 0.3];
    let v = solidSvg(cylinder(x, y, 0.9, zTop - 0.1, 0.8, P, 16), { tone: 'mid', className: 'hierro' });
    v += '<path class="iso-line barra" data-tone="mid" d="' + linea([p0, p1]) + '"/>';
    const bolas = [p0, p1].sort((A, B) => depthOf(A, P) - depthOf(B, P));
    for (const b of bolas) { const q = at(b); v += '<circle class="bola" cx="' + f2(q[0]) + '" cy="' + f2(q[1]) + '" r="' + f2(0.95 * K) + '"/><circle class="bola-luz" cx="' + f2(q[0] - 0.3 * K) + '" cy="' + f2(q[1] - 0.35 * K) + '" r="' + f2(0.32 * K) + '"/>'; }
    el.volante.innerHTML = v; }
  // la aguja de coser la suela: cruza de lado a lado en cada puntada
  if (s > 2.0 && s < 2.9) { const i = Math.min(SU.puntadas - 1, Math.floor(e.puntadas)), f = e.puntadas - Math.floor(e.puntadas), u = -SU.L / 2 + 0.9 + i * (SU.L - 1.8) / (SU.puntadas - 1), hw = W(u) * SH(u, SU.L), top = c[2] + e.grueso + 0.25;
    const punta = lugar(c, u, -hw - 1 + f * (2 * hw + 2), top), ojo = lugar(c, u, -hw - 1 + f * (2 * hw + 2) - 5.2, top + 0.4);
    const hilo = [ojo, lugar(c, u - 0.3, -hw - 2.6, c[2] + 0.4), lugar(c, u - 1.2, -hw - 1.2, top)];
    el.aguja.innerHTML = '<path class="hilo" d="' + linea(hilo) + '"/><path class="iso-line aguja" data-tone="hi" d="' + linea([ojo, punta]) + '"/><g class="iso-dots" data-tone="hi"><circle r=".45" cx="' + f2(at(ojo)[0]) + '" cy="' + f2(at(ojo)[1]) + '"/><circle r=".3" cx="' + f2(at(punta)[0]) + '" cy="' + f2(at(punta)[1]) + '"/></g>'; }
  else el.aguja.innerHTML = '';
  // lo que trabaja en cada paso
  ilumina([el.poste, el.trenzando, el.manojos, el.rollo], paso === 0); ilumina([el.suela, el['suela-prensa']], paso === 1 || paso === 4); ilumina([el.aguja, el.banco], paso === 2); ilumina([el.prensa, el.husillo, el['prensa-delante'], el.volante], paso === 3); ilumina(el.pie, paso === 4); ilumina([el.caja, el.par], paso === 5);
  const vueltas = Math.round(e.vueltas * SU.vueltas * 10) / 10, punt = clamp(Math.floor(e.puntadas), 0, SU.puntadas);
  const extra = ['tres cabos de yute, una trenza', 'en espiral, de dentro afuera: ' + String(vueltas).replace('.', ',') + ' vueltas', 'de lado a lado con cáñamo: ' + punt + ' puntadas', 'la prensa la deja plana y dura', 'puntera y talón de lona, a mano', 'las cintas, para el tobillo'][paso];
  const text = (paso + 1) + ' · ' + PASOS[paso] + ' · ' + extra;
  if (text !== txt) { readout.textContent = text; stage.setAttribute('aria-valuetext', text); txt = text; }
}
// el par acabado de la caja: se dibuja una vez
el.par.innerHTML = alpargata([CAJA.x + 8.2, CAJA.y + 3.7, 0.8], { ...ACABADA, cintas: 0.55 }, false) + alpargata([CAJA.x + 7.6, CAJA.y + 9.2, 0.8], { ...ACABADA, cintas: 0.55 }, false);
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
const puesto = (e) => { const m = svgEl.getScreenCTM(); if (!m) return 0; const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()); let best = 0, bd = Infinity; PUESTOS.forEach((p, i) => { const a = at(p), d = Math.hypot(a[0] - q.x, a[1] - q.y); if (d < bd) { bd = d; best = i; } }); return best + 0.5; };
stage.addEventListener('pointermove', (e) => steer(puesto(e)));
stage.addEventListener('pointerdown', (e) => steer(puesto(e)));
stage.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); steer(Math.floor(target) + 1.6); } if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); steer(Math.floor(target) - 0.4); } });
window.__pasoAlp = (v) => { touring = false; target = s = v; draw(0); };
draw(0);
${PUENTE}`;

const tonos = (pre, cls, [f, s0, s1, s2, s3, t]) => `${pre}.${cls}>.iso-fill{fill:${f}}${pre}.${cls}>.iso-top{fill:${t}}${pre}.${cls}[data-seamless]>.iso-top{stroke:${t}}` +
  [s0, s1, s2, s3].map((c, i) => `${pre}.${cls}>.iso-shade[data-shade="${i}"]{fill:${c}}${pre}.${cls}[data-seamless]>.iso-shade[data-shade="${i}"]{stroke:${c}}`).join('');
const COLOR = {
  dark: { madera: ['#4a3628', '#2a1d16', '#35261c', '#403022', '#4c3a2a', '#5a4632'], hierro: ['#3a3642', '#1c1a22', '#26232c', '#302d36', '#3a3742', '#4a4652'],
    yute: ['#8a7448', '#54462a', '#645434', '#74623c', '#846e46', '#9c8454'], canamo: ['#a89470', '#6a5c44', '#7a6a50', '#8a785c', '#9a8668', '#b8a47e'],
    cera: ['#c8a040', '#806428', '#90722e', '#a08034', '#b08e3a', '#d8b050'], carton: ['#7a6248', '#4a3a2a', '#584634', '#66523c', '#745e46', '#86705a'] },
  light: { madera: ['#8a6a50', '#5e4636', '#6c523e', '#7a5e48', '#886a52', '#9a7c62'], hierro: ['#7a7684', '#4e4a58', '#5c5866', '#6a6674', '#787482', '#8c8896'],
    yute: ['#d0b880', '#a08a58', '#b09864', '#c0a670', '#d0b47c', '#e0c890'], canamo: ['#e0cca4', '#b09c78', '#c0ac86', '#d0bc94', '#e0caa2', '#f0dcb4'],
    cera: ['#e8c060', '#b08a38', '#c09840', '#d0a848', '#e0b852', '#f0d070'], carton: ['#c8a880', '#987a58', '#a88864', '#b89670', '#c8a47c', '#d8b890'] },
};
const colores = Object.entries(COLOR).map(([th, m]) => Object.entries(m).map(([cls, v]) => tonos(th === 'light' ? '.iso[data-theme="light"] ' : '', cls, v)).join('')).join('');
const CSS = COLORES + enJuego(WIDTH, HEIGHT) + `
.iso{--yute:#9c8454;--yute-o:#6a5634;--yute-c:#5a4a2c;--canamo:#e0d0a8;--lona:#ece6dc;--lona1:#d8d0c4;--lona2:#f6f2ea;--lona-s:#bcb2a6;--lona-dentro:#9a9084;--cinta:#d8343c;--bola:#4a4652;--bola-luz:#8a86a0;--caja-suelo:#3a2c1e;--caja-dentro:#4a3828;--caja-dentro2:#58442e}
.iso[data-theme="light"]{--yute:#d6bc82;--yute-o:#a48a56;--yute-c:#b09460;--canamo:#8a7458;--lona:#ffffff;--lona1:#ece6dc;--lona2:#ffffff;--lona-s:#d8d0c4;--lona-dentro:#d0c8bc;--cinta:#d8343c;--bola:#6a6674;--bola-luz:#b4b0c0;--caja-suelo:#a8885e;--caja-dentro:#b8966a;--caja-dentro2:#c8a476}
.trenza{fill:none;stroke:var(--yute);stroke-linecap:round;stroke-linejoin:round}
.trenza-punto{fill:none;stroke:var(--yute-o);stroke-width:.55;stroke-dasharray:.9 1.1;stroke-linecap:round}
.trenza-canto,.suela-canto{fill:var(--yute-c);stroke:var(--anatomy-lo);stroke-width:.3}.trenza-base,.suela-base{fill:var(--yute-o)}
.suela-borde{fill:none;stroke:var(--anatomy-lo);stroke-width:.35}
.cabo{fill:none;stroke:var(--yute);stroke-linecap:round}
.puntada{fill:none;stroke:var(--canamo);stroke-width:.45;stroke-linecap:round}
.lona{fill:var(--lona1);stroke:var(--anatomy-mid);stroke-width:.3;stroke-linejoin:round}.lona-brillo{fill:var(--lona2)}.lona-cara{stroke-width:.25;stroke-linejoin:round}.l0{fill:var(--lona-s);stroke:var(--lona-s)}.l1{fill:var(--lona1);stroke:var(--lona1)}.l2{fill:var(--lona);stroke:var(--lona)}.lona-dentro{fill:var(--lona-dentro);stroke:var(--lona-dentro);stroke-width:.2}
.ribete{fill:none;stroke:var(--anatomy-mid);stroke-width:.5;stroke-linecap:round}.ribete.fino{stroke-width:.35}
.puntadas-lona circle{fill:var(--canamo)}
.cinta{fill:none;stroke:var(--cinta);stroke-linecap:round;stroke-linejoin:round}
.hilo{fill:none;stroke:var(--canamo);stroke-width:.4;stroke-linecap:round}
.aguja{stroke-width:.5;stroke-linecap:round}.barra{stroke-width:1;stroke-linecap:round}.gancho{fill:none;stroke-width:.5;stroke-linecap:round}.punzon{stroke-width:.45}.hoja-tijera{stroke-width:.5;stroke-linecap:round}
.bola{fill:var(--bola);stroke:var(--anatomy-mid);stroke-width:.35}.bola-luz{fill:var(--bola-luz)}
.caja-suelo{fill:var(--caja-suelo)}.caja-dentro{fill:var(--caja-dentro)}.caja-dentro2{fill:var(--caja-dentro2)}
[data-lit] .iso-edge,[data-lit].iso-line,[data-lit] .iso-line,[data-lit] .tb-edge,[data-lit] .suela-borde,[data-lit] .lona,[data-lit] .ribete,[data-lit] .bola{stroke:var(--anatomy-lit)}
[data-lit] .iso-top,[data-lit].iso-top{fill:var(--anatomy-lit-top)}
[data-lit] .iso-dots circle{fill:var(--anatomy-lit)}
` + colores;

const body = k.plateHtml({
  fig: 'Lámina 17',
  title: 'Cómo se hace una alpargata',
  hint: 'Pasa el ratón por cada pieza',
  readout: '1 · Trenzar · tres cabos de yute, una trenza',
  keys: [
    { mark: 'lit', label: 'Lo que trabaja en cada paso: el poste de trenzar, la espiral, la aguja, la prensa, la lona y las cintas' },
    { mark: 'raised', label: 'Toda la suela es una sola trenza de yute enrollada en espiral' },
    { mark: 'flat', label: 'Las golondrinas del Roncal y de Salazar las cosían en las fábricas de Mauleón' },
  ],
  caption: 'Las alpargatas eran el calzado de casi todo el mundo. La suela se hace con yute, una fibra vegetal: con tres cabos se trenza una cuerda larga, que se enrolla en espiral, de dentro afuera, con la forma del pie. Para que no se deshaga, se cose de lado a lado con una aguja grande y cáñamo, y una prensa de husillo la aplasta y la deja plana y dura. Encima se cosen a mano la puntera y el talón de lona, y por último las cintas que se atan al tobillo: en San Fermín se llevan con cintas rojas. Cada otoño, muchas chicas jóvenes del Roncal, de Salazar y de Aragón, las golondrinas, cruzaban el Pirineo a pie para trabajar en las fábricas de alpargatas de Mauleón, en Francia, y volvían en primavera.',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Cómo se hace una alpargata, paso a paso: las flechas pasan de un paso a otro" aria-valuemin="1" aria-valuemax="6">${svg}</div>`,
});

const html = k.pageHtml({ title: 'Cómo se hace una alpargata', theme, body, script: kitScript() + live }).replace('</style>', CSS + '</style>');
escribe('alpargata', html, theme);
