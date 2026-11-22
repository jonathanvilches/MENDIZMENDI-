// Lámina isométrica interactiva «De la oveja al ovillo» (skill Anatomy, 21 de noviembre de 2026; el autor: «la
// elaboración de diferentes alimentos y artesanía [...] todo lo que tenga que ver con Navarra», metido en las misiones). El
// trabajo de la lana de una casa del Pirineo, en maqueta, sobre su tablero: la oveja con las tijeras de esquilar y el vellón
// en el suelo; la cuba donde se lava; el banco con las cardas; la rueca con la lana y el huso que gira colgado del hilo; la
// devanadera que pasa la madeja al ovillo, y el cesto con los ovillos, las agujas y el calcetín a medias. Al recorrerla,
// paso a paso, se ilumina la pieza que trabaja. Es la que se abre al acabar el taller de la hilandera («De la oveja al
// ovillo», data/oficios.js) y en el material didáctico.
// Uso: node tools/anatomia/hilandera.mjs [--light]  →  entrega/anatomia/hilandera(-light).html (y public/anatomia, para el juego)
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';
import * as G from '../../.claude/skills/anatomy/kit/lathe.mjs';
import { kitScript } from '../../.claude/skills/anatomy/scripts/inline-kit.mjs';
import { COLORES, enJuego, MARCA_JUEGO, escribe, PUENTE } from './comun.mjs';

const theme = process.argv.includes('--light') ? 'light' : 'dark';
const WIDTH = 600, HEIGHT = 340;

// ---------- el modelo (centímetros de la maqueta) ----------
// dos filas en tres columnas, en zigzag: oveja (detrás) y cuba (delante); banco (delante) y rueca (detrás); devanadera
// (detrás) y cesto (delante). Lo alto va detrás y lo bajo delante, para que nada tape nada.
const OVEJA = { x: -104, y: -50, z: 7, L: 11 };
const VELLON = { x: -86, y: -37 };
const CUBA = { x: -97, y: -22, r: 6, h: 4.4 };
const BANCO = { x: -80, y: -28, w: 18, d: 9, z: 5.5 };
const RUECA = { x: -70, y: -50, h: 17 };
const HUSO = { x: -63, y: -45, z0: 2.6, z1: 8.6 };
const DEVA = { x: -46, y: -50, z: 12, brazo: 7 };
const OVILLO = { x: -32, y: -42 };
const CESTO = { x: -46, y: -22, r: 6.5, h: 5 };
// dónde está cada paso, para que el ratón encienda la pieza que señala
const PUESTOS = [[-97, -50, 6], [-97, -22, 3], [-71, -24, 7], [-70, -48, 10], [-46, -48, 9], [-44, -20, 3]];
const PASOS = ['Esquilar', 'Lavar', 'Cardar', 'Hilar', 'Ovillar', 'Tejer'];

// ---------- la cámara ----------
const PLATE = { x: -112, y: -62, w: 92, d: 62, r: 7 };
const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [RUECA.x, RUECA.y, RUECA.h + 7], [DEVA.x, DEVA.y, DEVA.z + 4], [OVEJA.x, OVEJA.y, OVEJA.z + 6]], WIDTH, HEIGHT, { pad: 10, azimuth: 76, elevation: 30 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const dep = (p) => k.depthOf(p, P);
const linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L');
const poly = (pts) => linea(pts) + 'Z';
const FZ = (x, y, z = 0) => G.frameAlong([x, y, z], [0, 0, 1]);
const FX = (x, y, z) => G.frameAlong([x, y, z], [1, 0, 0]);
const FY = (x, y, z) => G.frameAlong([x, y, z], [0, 1, 0]);
const porDepth = (lista, f) => [...lista].sort((a, b) => dep(f(a)) - dep(f(b)));
const VIS = Math.atan2(dep([0, 1, 0]) - dep([0, 0, 0]), dep([1, 0, 0]) - dep([0, 0, 0]));
const arcoDelante = (x, y, r, z, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const t = VIS - Math.PI / 2 + i / n * Math.PI; return [x + Math.cos(t) * r, y + Math.sin(t) * r, z]; });
const seam = (x, y, r, z) => k.pathOf(arcoDelante(x, y, r, z).map(at));
const R2x = (i) => (0.5 + i * 0.7548776662) % 1, R2y = (i) => (0.5 + i * 0.5698402910) % 1;
const caja = (x0, x1, y0, y1, z0, h, cls, bevel = 0.2) => S(k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: 0.2 }, z0, h, P, 2, bevel), { tone: 'mid', className: cls });
const pata = (x, y, z0, z1, r = 0.5, cls = 'madera') => S(k.cylinder(x, y, r, z0, z1 - z0, P, 12), { tone: 'mid', className: cls });

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
  const regla = { x: -106, y: -8, w: 24, d: 5.5, r: 1 };
  out.push(S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo' }));
  const t = k.topTicks(regla.x + 3, regla.x + regla.w - 3, 2, 5, regla.y + 0.05, 0.6, [1.8, regla.d - 0.1], P); // las mayores, de canto a canto
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
  out.push(D([at([regla.x + 1.5, regla.y + 2.8, 0.6]), at([regla.x + regla.w - 1.5, regla.y + 2.8, 0.6])], { size: 0.45 }));
  const placa = { x: -78, y: -9, w: 34, d: 7.5, r: 1.2 };
  out.push(S(k.slabOf(placa, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(placa, 1.1), 0.8, P, 4), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([placa.x + 5, placa.y + 4.4], 0.8, P, 'x'), 'GORUA · ARDATZA', { size: 2.4, tone: 'mid' }));
  out.push(D([at([placa.x + 2.2, placa.y + 3.75, 0.8]), at([placa.x + placa.w - 2.2, placa.y + 3.75, 0.8])], { size: 0.4 }));
  return out.join('');
}

// ---------- la oveja, el vellón y las tijeras (vivas) ----------
function oveja() {
  const { x, y, z, L: l } = OVEJA, out = [];
  const patas = [[x + 2.2, y - 2], [x + 8.4, y - 2], [x + 2.2, y + 2], [x + 8.4, y + 2]];
  out.push(...patas.slice(0, 2).map(([px, py]) => pata(px, py, 0, 3.6, 0.55, 'pata')));
  out.push(S(G.solidOf([[0, 1.4], [1.2, 3.6, true], [4.5, 4.4, true], [8, 4.2, true], [10, 2.9, true], [l, 1.2]], FX(x, y, z), P), { tone: 'mid', className: 'lana-v', crease: 'none' }));
  let ri = ''; for (let i = 0; i < 26; i++) { const s = 1.4 + R2x(i) * (l - 2.6), th = VIS - 1.25 + R2y(i) * 2.5, rr = Math.min(4.2, 1.4 + s * 1.4) * 0.97; const q = at([x + s, y + Math.cos(th) * rr, z + Math.sin(th) * rr * 0.6 + rr * 0.35 * (R2x(i + 3) - 0.3)]); ri += `<circle class="rizo" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${(0.45 + R2x(i + 9) * 0.35).toFixed(2)}"/>`; }
  out.push(ri);
  out.push(S(G.solidOf([[0, 1.5], [1.4, 1.8, true], [3.4, 0.8]], G.frameAlong([x + l - 0.6, y, z + 0.8], [1, 0, -0.35]), P), { tone: 'mid', className: 'cara' }));
  out.push(D([at([x + l + 1.4, y + 1.1, z + 0.9])], { size: 0.4, tone: 'hi' }));
  out.push(...patas.slice(2).map(([px, py]) => pata(px, py, 0, 3.4, 0.55, 'pata')));
  return `<g data-part="oveja">${out.join('')}</g>`;
}
function vellon() {
  const { x, y } = VELLON, pts = Array.from({ length: 18 }, (_, i) => { const a = i / 18 * Math.PI * 2, r = 6 + Math.sin(i * 2.3) * 1.1 + Math.cos(i * 1.7) * 0.8; return [x + Math.cos(a) * r, y + Math.sin(a) * r * 0.75, 0.6]; });
  let ri = ''; for (let i = 0; i < 14; i++) { const a = R2x(i) * Math.PI * 2, r = Math.sqrt(R2y(i)) * 4.8, q = at([x + Math.cos(a) * r, y + Math.sin(a) * r * 0.75, 0.7]); ri += `<circle class="rizo" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r=".5"/>`; }
  return `<g data-part="vellon"><path class="lana" d="${poly(pts)}"/>${ri}</g><g data-part="tijeras"></g>`;
}

// ---------- la cuba de lavar (viva: la lana se mueve en el agua) ----------
function cuba() {
  const { x, y, r, h } = CUBA, out = [];
  out.push(S(G.solidOf([[0, r - 0.5], [0.3, r - 0.2], [h, r]], FZ(x, y), P), { tone: 'mid', className: 'madera' }));
  out.push(L(seam(x, y, r - 0.32, 1.1) + seam(x, y, r - 0.08, 3.4), { tone: 'lo' }));
  out.push(`<path class="hueco" d="${k.ring(x, y, r - 0.5, h, P, 32)}"/>`, `<path class="agua" d="${k.ring(x, y, r - 0.6, h - 0.6, P, 32)}"/>`, `<g data-part="lana-agua"></g>`, L(k.ring(x, y, r - 0.5, h, P, 32), { tone: 'mid' }));
  const a = [x + 2, y - 1, h - 0.8], m = [x + 7, y + 3, h + 7];
  out.push(L(linea([a, m]), { tone: 'mid', className: 'palo' }), D([at(m), at(a)], { size: 0.55, tone: 'mid' }));
  return `<g data-part="cuba">${out.join('')}</g>`;
}

// ---------- el banco con las cardas (la de arriba, viva: va y viene) ----------
function carda(x, y, z) {
  const out = [caja(x, x + 6.4, y, y + 4.6, z, 0.5, 'madera', 0.15)];
  const pu = []; for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) pu.push(at([x + 0.7 + i * 1, y + 0.7 + j * 1.05, z + 0.5]));
  out.push(D(pu, { size: 0.22, tone: 'lo' }));
  out.push(S(G.solidOf([[0, 0.45], [4, 0.45]], FX(x + 6.4, y + 2.3, z + 0.25), P), { tone: 'mid', className: 'madera' }));
  return out.join('');
}
function banco() {
  const b = BANCO, out = [];
  for (const [px, py] of porDepth([[b.x + 1, b.y + 1], [b.x + b.w - 1, b.y + 1], [b.x + 1, b.y + b.d - 1], [b.x + b.w - 1, b.y + b.d - 1]], ([q, r]) => [q, r, 0])) out.push(pata(px, py, 0, b.z, 0.55));
  out.push(caja(b.x, b.x + b.w, b.y, b.y + b.d, b.z, 1.1, 'madera'));
  const zt = b.z + 1.1;
  out.push(carda(b.x + 1.2, b.y + 2.2, zt));
  out.push(`<path class="lana" d="${poly([[b.x + 1.8, b.y + 2.8, zt + 0.55], [b.x + 7, b.y + 2.8, zt + 0.55], [b.x + 7, b.y + 6.2, zt + 0.55], [b.x + 1.8, b.y + 6.2, zt + 0.55]])}"/>`);
  out.push(`<g data-part="carda-arriba">${carda(b.x + 1.2, b.y + 2.2, zt + 1.1)}</g>`);
  // las mechas cardadas, en fila
  for (const [i, xx] of [[0, b.x + 13], [1, b.x + 15.2]]) out.push(S(G.solidOf([[0, 0.3], [0.8, 0.9, true], [5.2, 0.9, true], [6, 0.3]], FY(xx, b.y + 1.4, zt + 0.9), P), { tone: 'mid', className: 'lana-v', crease: 'none' }) + (i ? '' : ''));
  return `<g data-part="banco">${out.join('')}</g>`;
}

// ---------- la rueca con la lana y el huso colgado del hilo (vivo: gira) ----------
function rueca() {
  const { x, y, h } = RUECA, out = [];
  for (const a of porDepth([0.4, 0.4 + Math.PI / 2, 0.4 + Math.PI, 0.4 + 3 * Math.PI / 2], (a) => [x + Math.cos(a) * 3, y + Math.sin(a) * 3, 0])) out.push(caja(Math.min(x, x + Math.cos(a) * 4) - 0.4, Math.max(x, x + Math.cos(a) * 4) + 0.4, Math.min(y, y + Math.sin(a) * 4) - 0.4, Math.max(y, y + Math.sin(a) * 4) + 0.4, 0, 0.8, 'madera', 0.1));
  out.push(pata(x, y, 0.8, h, 0.4));
  out.push(S(G.solidOf([[0, 0.5], [1.6, 2.4, true], [4.6, 2.1, true], [6.4, 0.5]], FZ(x, y, h - 6.6), P), { tone: 'mid', className: 'lana-v', crease: 'none' }));
  out.push(L(seam(x, y, 2.3, h - 4.2), { tone: 'lo' }));
  out.push(D([at([x, y, h])], { size: 0.5, tone: 'mid' }));
  out.push(`<g data-part="hilo"></g>`);
  const { x: hx, y: hy, z0, z1 } = HUSO;
  out.push(S(G.solidOf([[0, 0.2], [z1 - z0, 0.2]], FZ(hx, hy, z0), P), { tone: 'mid', className: 'madera' }));
  out.push(S(G.solidOf([[0, 0.3], [0.8, 1.2, true], [3, 1.3, true], [4, 0.3]], FZ(hx, hy, z0 + 1.6), P), { tone: 'mid', className: 'lana-h', crease: 'none' }));
  out.push(S(G.disc(0, 0.6, 1.9, FZ(hx, hy, z0 + 0.5), P), { tone: 'mid', className: 'madera' }));
  out.push(`<g data-part="giro-huso"></g>`, D([at([hx, hy, z1])], { size: 0.4, tone: 'mid' }));
  return `<g data-part="rueca">${out.join('')}</g>`;
}

// ---------- la devanadera (viva: gira) y el ovillo (vivo: crece) ----------
function devanadera() {
  const { x, y, z } = DEVA, out = [];
  out.push(S(k.cylinder(x, y, 3.6, 0, 1, P, 28), { tone: 'mid', className: 'madera' }));
  out.push(pata(x, y, 1, z, 0.5));
  out.push(S(k.cylinder(x, y, 1, z - 0.6, 1.2, P, 16), { tone: 'mid', className: 'madera' }));
  out.push(`<g data-part="aspas"></g>`);
  return `<g data-part="devanadera">${out.join('')}</g>`;
}
function ovillo() {
  const { x, y } = OVILLO;
  return `<g data-part="ovillo-g"><path data-part="hebra-ov" class="iso-line" data-tone="lo" d=""/><g data-part="ovillo"></g></g>`;
}

// ---------- el cesto con los ovillos, las agujas y el calcetín (vivo: crece) ----------
function cesto() {
  const { x, y, r, h } = CESTO, out = [];
  out.push(S(G.solidOf([[0, r - 1.2], [0.4, r - 0.8], [h, r]], FZ(x, y), P), { tone: 'mid', className: 'mimbre' }));
  out.push(L([1.4, 2.8, 4.1].map((z) => seam(x, y, r - 1.2 + z / h * 1.2 - 0.02, z)).join(''), { tone: 'lo' }));
  out.push(`<path class="hueco" d="${k.ring(x, y, r - 0.4, h, P, 32)}"/>`);
  const bolas = [[x - 2.2, y - 1.6, 'blanca'], [x + 2, y - 2, 'parda'], [x - 0.4, y + 1.8, 'negra'], [x + 2.6, y + 1.6, 'gris'], [x - 2.8, y + 1.2, 'crema']];
  out.push(porDepth(bolas, ([bx, by]) => [bx, by, h]).map(([bx, by, c]) => S(G.sphereOf([bx, by, h - 0.6], 2.1, P), { tone: 'mid', className: 'ov-' + c })).join(''));
  out.push(L(k.ring(x, y, r - 0.4, h, P, 32), { tone: 'mid' }));
  return `<g data-part="cesto">${out.join('')}</g><g data-part="punto"></g>`;
}

// ---------- la figura ----------
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'Maqueta del trabajo de la lana: la oveja con las tijeras de esquilar y el vellón en el suelo; la cuba donde se lava; el banco con las dos cardas y las mechas; la rueca con la lana y el huso que gira colgado del hilo; la devanadera que pasa la madeja al ovillo, y el cesto con los ovillos, las agujas y el calcetín a medias.',
  body: [tablero(), oveja(), vellon(), rueca(), devanadera(), ovillo(), cuba(), banco(), cesto()],
});

// ---------- lo que se mueve en la página ----------
const live = MARCA_JUEGO + `
const P = ${JSON.stringify(P)}, OVEJA = ${JSON.stringify(OVEJA)}, VELLON = ${JSON.stringify(VELLON)}, CUBA = ${JSON.stringify(CUBA)}, BANCO = ${JSON.stringify(BANCO)}, RUECA = ${JSON.stringify(RUECA)}, HUSO = ${JSON.stringify(HUSO)}, DEVA = ${JSON.stringify(DEVA)}, OVILLO = ${JSON.stringify(OVILLO)}, CESTO = ${JSON.stringify(CESTO)}, PUESTOS = ${JSON.stringify(PUESTOS)};
const PASOS = ${JSON.stringify(PASOS)}, N = PASOS.length;
const at = (p) => iso(p, P), linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L'), poly = (pts) => linea(pts) + 'Z';
const K = Math.hypot(at([0, 0, 1])[0] - at([0, 0, 0])[0], at([0, 0, 1])[1] - at([0, 0, 0])[1]);
const stage = document.querySelector('.iso-stage'), svgEl = stage.querySelector('svg'), $ = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const el = {}; for (const n of ['vellon', 'tijeras', 'lana-agua', 'carda-arriba', 'hilo', 'giro-huso', 'aspas', 'hebra-ov', 'ovillo', 'punto', 'oveja', 'cuba', 'banco', 'rueca', 'devanadera', 'ovillo-g', 'cesto']) el[n] = $(n);
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const ilumina = (lista, on) => { for (const n of [].concat(lista)) if (n && on !== n.hasAttribute('data-lit')) n.toggleAttribute('data-lit', on); };
const pt = (p) => { const q = at(p); return 'cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '"'; };
let s = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, txt = '', reloj = 0, giroH = 0, giroD = 0;
const tourAt = (t) => { const T = 3 * N + 2, f = (t % T) / T * (N + 0.71); const i = Math.floor(f); return Math.min(N - 0.001, i + sm((f - i) / 0.6) * 0.999); };
function draw(dt) {
  reloj += dt;
  const paso = Math.min(N - 1, Math.floor(s));
  // esquilar: las tijeras abren y cierran, y el vellón va saliendo
  el.vellon.style.opacity = (0.25 + 0.75 * sm(s / 0.8)).toFixed(2);
  const corta = s < 1.1 ? Math.abs(Math.sin(reloj * 7)) * 0.5 : 0.15, tc = [OVEJA.x + 6, OVEJA.y + 5.2, OVEJA.z - 1.6];
  const h1 = [tc[0] - 3.4, tc[1] + 1.2 + corta * 2, tc[2] - 0.6], h2 = [tc[0] - 3.4, tc[1] + 1.2 - corta * 2, tc[2] + 0.2], m1 = [tc[0] + 3, tc[1] + 2.4, tc[2] - 1.4], m2 = [tc[0] + 3, tc[1] + 0.6, tc[2] - 1];
  el.tijeras.innerHTML = '<path class="iso-line tijera" data-tone="mid" d="' + linea([h1, tc, m2]) + linea([h2, tc, m1]) + '"/><g class="iso-dots" data-tone="mid"><circle r=".5" ' + pt(tc) + '/><circle r=".4" ' + pt(h1) + '/><circle r=".4" ' + pt(h2) + '/><circle r=".7" ' + pt(m1) + '/><circle r=".7" ' + pt(m2) + '/></g>';
  // lavar: la lana se mueve en el agua
  let la = ''; for (let i = 0; i < 5; i++) { const a = reloj * (0.5 + i * 0.1) * (s > 0.9 && s < 2.2 ? 1 : 0.15) + i * 1.3, r = 1.4 + (i % 3) * 1.2, q = at([CUBA.x + Math.cos(a) * r, CUBA.y + Math.sin(a) * r, CUBA.h - 0.55]); la += '<ellipse class="lana" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" rx="' + (1.3 * K).toFixed(2) + '" ry="' + (0.6 * K).toFixed(2) + '"/>'; }
  el['lana-agua'].innerHTML = la;
  // cardar: la carda de arriba va y viene
  const va = s > 1.9 && s < 3.2 ? Math.sin(reloj * 6) * 1.6 : 0, o = at([va, 0, 0]), o0 = at([0, 0, 0]);
  el['carda-arriba'].setAttribute('transform', 'translate(' + (o[0] - o0[0]).toFixed(2) + ' ' + (o[1] - o0[1]).toFixed(2) + ')');
  // hilar: el huso gira y el hilo baja retorcido de la lana
  giroH += dt * (s > 2.9 && s < 4.2 ? 9 : 0.6);
  const top = [RUECA.x + 0.6, RUECA.y + 0.4, RUECA.h - 6.4], bot = [HUSO.x, HUSO.y, HUSO.z1];
  let tw = ''; for (let i = 0; i < 6; i++) { const f = ((i / 6) + giroH * 0.05) % 1, p = [top[0] + (bot[0] - top[0]) * f, top[1] + (bot[1] - top[1]) * f, top[2] + (bot[2] - top[2]) * f], q = at(p); tw += '<path class="torsion" d="M' + (q[0] - 0.5).toFixed(1) + ' ' + (q[1] - 0.4).toFixed(1) + 'L' + (q[0] + 0.5).toFixed(1) + ' ' + (q[1] + 0.4).toFixed(1) + '"/>'; }
  el.hilo.innerHTML = '<path class="iso-line hilo-l" data-tone="hi" d="' + linea([top, bot]) + '"/>' + tw;
  let mh = ''; for (let i = 0; i < 3; i++) { const a = giroH + i * Math.PI * 2 / 3, q0 = at([HUSO.x + Math.cos(a) * 0.5, HUSO.y + Math.sin(a) * 0.5, HUSO.z0 + 1.1]), q1 = at([HUSO.x + Math.cos(a) * 1.7, HUSO.y + Math.sin(a) * 1.7, HUSO.z0 + 1.1]); mh += 'M' + q0[0].toFixed(1) + ' ' + q0[1].toFixed(1) + 'L' + q1[0].toFixed(1) + ' ' + q1[1].toFixed(1); }
  el['giro-huso'].innerHTML = '<path class="marca" d="' + mh + '"/>';
  // ovillar: la devanadera gira y el ovillo crece
  giroD += dt * (s > 3.9 && s < 5.2 ? 2.2 : 0.15);
  const z = DEVA.z + 0.2, tips = [0, 1, 2, 3].map((i) => { const a = giroD + i * Math.PI / 2; return [DEVA.x + Math.cos(a) * DEVA.brazo, DEVA.y + Math.sin(a) * DEVA.brazo, z]; });
  const altos = tips.map((t) => [t[0], t[1], z + 2.4]), mid = tips.map((t) => [t[0], t[1], z + 1.2]);
  let as = '<path class="iso-line aspa" data-tone="mid" d="' + tips.map((t) => linea([[DEVA.x, DEVA.y, z], t])).join('') + tips.map((t, i) => linea([t, altos[i]])).join('') + '"/>';
  as += '<path class="iso-line madeja" data-tone="hi" d="' + poly(mid) + '"/>';
  as += '<g class="iso-dots" data-tone="mid"><circle r=".6" ' + pt([DEVA.x, DEVA.y, z]) + '/>' + tips.map((t) => '<circle r=".4" ' + pt(t) + '/>').join('') + altos.map((t) => '<circle r=".4" ' + pt(t) + '/>').join('') + '</g>';
  el.aspas.innerHTML = as;
  const crece = sm((s - 4.0) / 1.0), ro = 1 + crece * 1.6, oc = [OVILLO.x, OVILLO.y, ro];
  const near = mid.reduce((b, p) => (b === null || p[1] > b[1] ? p : b), null);
  el['hebra-ov'].setAttribute('d', linea([near, [oc[0], oc[1], oc[2] + ro * 0.6]]));
  const c = at(oc), R = ro * K * 1.05; let vu = ''; for (let i = 0; i < 4; i++) { const a = i * 0.8 + reloj * (s > 3.9 && s < 5.2 ? 1.5 : 0); vu += '<ellipse class="vuelta" cx="' + c[0].toFixed(1) + '" cy="' + c[1].toFixed(1) + '" rx="' + (R * 0.95).toFixed(2) + '" ry="' + (R * (0.25 + 0.2 * Math.abs(Math.sin(a)))).toFixed(2) + '" transform="rotate(' + (a * 57).toFixed(0) + ' ' + c[0].toFixed(1) + ' ' + c[1].toFixed(1) + ')"/>'; }
  el.ovillo.innerHTML = '<circle class="ov-blanca-p" cx="' + c[0].toFixed(1) + '" cy="' + c[1].toFixed(1) + '" r="' + R.toFixed(2) + '"/>' + vu;
  // tejer: las agujas y el calcetín que va creciendo
  const largo = 2 + 5 * sm((s - 5.0) / 0.9), bx = CESTO.x + 8, by = CESTO.y + 9, zz = 0.4, cl = Math.sin(reloj * 8) * (s > 5 ? 0.4 : 0);
  const calce = [[bx, by, zz], [bx + 3.2, by, zz], [bx + 3.2, by + largo, zz], [bx + 3.2 + 1.6, by + largo + 1.8, zz], [bx + 3.2 + 1.6, by + largo + 3.4, zz], [bx, by + largo + 2.2, zz]];
  const a1 = [bx - 1.5, by - 1 + cl, zz + 0.4], a2 = [bx + 4.8, by + 0.6 + cl, zz + 0.4], b1 = [bx - 1.2, by + 0.8 - cl, zz + 0.5], b2 = [bx + 5, by - 1.1 - cl, zz + 0.5];
  el.punto.innerHTML = '<path class="punto" d="' + poly(calce) + '"/><path class="iso-line" data-tone="mid" d="' + poly(calce) + '"/><path class="iso-line aguja" data-tone="hi" d="' + linea([a1, a2]) + linea([b1, b2]) + '"/><g class="iso-dots" data-tone="hi"><circle r=".45" ' + pt(a1) + '/><circle r=".3" ' + pt(a2) + '/><circle r=".45" ' + pt(b1) + '/><circle r=".3" ' + pt(b2) + '/></g>';
  // lo que trabaja en cada paso
  ilumina([el.oveja, el.vellon, el.tijeras], paso === 0); ilumina(el.cuba, paso === 1); ilumina(el.banco, paso === 2); ilumina(el.rueca, paso === 3); ilumina([el.devanadera, el['ovillo-g']], paso === 4); ilumina([el.cesto, el.punto], paso === 5);
  const extra = ['con tijeras, el vellón entero', 'en agua, para quitar la grasa y la tierra', 'las cardas la ahuecan y la peinan', 'la rueca sujeta la lana; el huso la retuerce', 'la madeja pasa al ovillo', 'calcetines, mantas y jerséis'][paso];
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
// el ratón enciende el puesto más cercano (están en dos filas, así que no basta con la x)
const puesto = (e) => { const m = svgEl.getScreenCTM(); if (!m) return 0; const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()); let best = 0, bd = Infinity; PUESTOS.forEach((p, i) => { const a = at(p), d = Math.hypot(a[0] - q.x, a[1] - q.y); if (d < bd) { bd = d; best = i; } }); return best + 0.5; };
stage.addEventListener('pointermove', (e) => steer(puesto(e)));
stage.addEventListener('pointerdown', (e) => steer(puesto(e)));
stage.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); steer(Math.floor(target) + 1.6); } if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); steer(Math.floor(target) - 0.4); } });
draw(0);
${PUENTE}`;

const tonos = (pre, cls, [f, s0, s1, s2, s3, t]) => `${pre}.${cls}>.iso-fill{fill:${f}}${pre}.${cls}>.iso-top{fill:${t}}${pre}.${cls}[data-seamless]>.iso-top{stroke:${t}}` +
  [s0, s1, s2, s3].map((c, i) => `${pre}.${cls}>.iso-shade[data-shade="${i}"]{fill:${c}}${pre}.${cls}[data-seamless]>.iso-shade[data-shade="${i}"]{stroke:${c}}`).join('');
const COLOR = {
  dark: { 'lana-v': ['#c8bcd0', '#8a7e94', '#9c90a6', '#aea2b8', '#c0b4ca', '#d4cade'], 'lana-h': ['#e0d4c0', '#a49884', '#b6aa96', '#c8bca8', '#dacebe', '#ece2d2'], cara: ['#3a3040', '#1e1824', '#26202c', '#2e2834', '#36303c', '#423a4a'], pata: ['#3a3040', '#1e1824', '#26202c', '#2e2834', '#36303c', '#423a4a'],
    madera: ['#4a3628', '#2a1d16', '#35261c', '#403022', '#4c3a2a', '#5a4632'], mimbre: ['#6a5030', '#3e2e1a', '#4a3820', '#584226', '#664c2c', '#745834'],
    'ov-blanca': ['#e8e2f0', '#aaa2b6', '#bcb4c8', '#cec6da', '#e0d8ec', '#f4eefc'], 'ov-parda': ['#8a6a4a', '#4e3a26', '#5e4630', '#6e543a', '#7e6244', '#90744e'], 'ov-negra': ['#2e2834', '#16121a', '#1c1820', '#221e28', '#2a2430', '#363040'], 'ov-gris': ['#8a8494', '#56505e', '#64606c', '#72707c', '#807e8a', '#94909e'], 'ov-crema': ['#e0d0a8', '#a8986e', '#b8a87e', '#c8b88e', '#d8c89e', '#ecdcb4'] },
  light: { 'lana-v': ['#f4f0f8', '#c8c0d2', '#d6cee0', '#e4dcec', '#f0eaf6', '#fdfaff'], 'lana-h': ['#f4ead8', '#ccbea6', '#dacab4', '#e8d8c2', '#f2e4ce', '#fdf2e2'], cara: ['#6a5e74', '#463c50', '#524860', '#5e546c', '#6a6078', '#7a7088'], pata: ['#6a5e74', '#463c50', '#524860', '#5e546c', '#6a6078', '#7a7088'],
    madera: ['#8a6a50', '#5e4636', '#6c523e', '#7a5e48', '#886a52', '#9a7c62'], mimbre: ['#d8b88a', '#a88a5e', '#b8986a', '#c8a876', '#d8b884', '#e8c896'],
    'ov-blanca': ['#ffffff', '#d0c8da', '#ded6e8', '#ece6f4', '#f8f4fc', '#ffffff'], 'ov-parda': ['#b08a64', '#7e5e40', '#8e6c4c', '#9e7a58', '#ae8864', '#c09a74'], 'ov-negra': ['#4a4450', '#2a2630', '#34303a', '#3e3a44', '#48444e', '#56525c'], 'ov-gris': ['#b0aab8', '#868090', '#948e9e', '#a29cac', '#b0aaba', '#c2bccc'], 'ov-crema': ['#f4e4bc', '#ccbc90', '#dacaa0', '#e8d8ae', '#f4e4bc', '#fff2cc'] },
};
const colores = Object.entries(COLOR).map(([th, m]) => Object.entries(m).map(([cls, v]) => tonos(th === 'light' ? '.iso[data-theme="light"] ' : '', cls, v)).join('')).join('');
const CSS = COLORES + enJuego(WIDTH, HEIGHT) + `
.iso{--lana:#cfc4d8;--rizo:#e8e0f0;--agua:#1f2a52;--hueco:#0d0718;--punto:#c8503a;--hebra:#e8e0f0;--ovillo:#e8e2f0}
.iso[data-theme="light"]{--lana:#f4f0f8;--rizo:#ffffff;--agua:#cfe0f7;--hueco:#8c7a86;--punto:#d8604a;--hebra:#8a7aa8;--ovillo:#ffffff}
.lana{fill:var(--lana)}.rizo{fill:var(--rizo)}.agua{fill:var(--agua)}.hueco{fill:var(--hueco)}.punto{fill:var(--punto)}
.torsion{stroke:var(--hebra);stroke-width:.5}.marca{stroke:var(--anatomy-lo);stroke-width:.5}.vuelta{fill:none;stroke:var(--anatomy-lo);stroke-width:.35}.ov-blanca-p{fill:var(--ovillo);stroke:var(--anatomy-mid);stroke-width:.5}
.tijera{stroke-width:.9;stroke-linecap:round}.palo{stroke-width:1.1;stroke-linecap:round}.hilo-l{stroke-width:.45}.aspa{stroke-width:.9}.madeja{stroke-width:1.1}.aguja{stroke-width:.8;stroke-linecap:round}
[data-lit] .iso-edge,[data-lit].iso-line,[data-lit] .iso-line,[data-lit] .tb-edge{stroke:var(--anatomy-lit)}
[data-lit] .iso-top,[data-lit].iso-top{fill:var(--anatomy-lit-top)}
[data-lit] .iso-dots circle{fill:var(--anatomy-lit)}
` + colores;

const body = k.plateHtml({
  fig: 'Lámina 14',
  title: 'De la oveja al ovillo',
  hint: 'Pasa el ratón por cada pieza',
  readout: '1 · Esquilar',
  keys: [
    { mark: 'lit', label: 'Lo que trabaja en cada paso: las tijeras, la cuba, las cardas, la rueca y el huso, la devanadera y las agujas' },
    { mark: 'raised', label: 'El huso gira colgado del hilo: lo retuerce y lo va enrollando' },
    { mark: 'flat', label: 'Cada casa del Pirineo tenía ovejas, y en invierno se hilaba junto al fuego' },
  ],
  caption: 'En los valles del Pirineo cada casa tenía ovejas, y con su lana se hacían calcetines, mantas y ropa de abrigo. Primero se esquila la oveja: con tijeras grandes se corta el vellón entero, como un abrigo. La lana se lava para quitarle la grasa y la tierra, y se carda: entre dos cardas de púas se ahueca y se peina. Después se hila: la rueca sujeta la lana y el huso, al girar, la retuerce en un hilo y lo va enrollando. Con la devanadera la madeja pasa al ovillo, y con las agujas se teje. En las largas noches de invierno, junto al fuego, se hilaba la lana.',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="De la oveja al ovillo, paso a paso: las flechas pasan de un paso a otro" aria-valuemin="1" aria-valuemax="6">${svg}</div>`,
});

const html = k.pageHtml({ title: 'De la oveja al ovillo', theme, body, script: kitScript() + live }).replace('</style>', CSS + '</style>');
escribe('hilandera', html, theme);
