// Lámina isométrica interactiva «Cómo se hace una barrica» (skill Anatomy, 21 de noviembre de 2026; el autor: «la
// elaboración de diferentes alimentos y artesanía [...] todo lo que tenga que ver con Navarra», metido en las misiones). El
// taller del tonelero, en maqueta, sobre su tablero: la pila de duelas de roble secándose al aire; en medio, una barrica de
// verdad que pasa de «rosa» abierta a cerrada (las duelas de pie dentro de un aro, el fuego de virutas que las calienta y las
// tuesta, el torno con la cuerda que las cierra por abajo, los aros que se bajan a golpe de mazo, la tapa que entra en el
// jable y la prueba con agua); el banco con la tapa, los aros de repuesto y la cama con dos barricas acabadas. Al
// recorrerla, paso a paso, se ilumina la pieza que trabaja. Es la que se abre al acabar el taller del tonelero (data/oficios.js)
// y en el material didáctico.
// Uso: node tools/anatomia/tonelero.mjs [--light]  →  entrega/anatomia/tonelero(-light).html (y public/anatomia, para el juego)
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';
import * as G from '../../.claude/skills/anatomy/kit/lathe.mjs';
import { kitScript } from '../../.claude/skills/anatomy/scripts/inline-kit.mjs';
import { COLORES, enJuego, MARCA_JUEGO, escribe, PUENTE } from './comun.mjs';

const theme = process.argv.includes('--light') ? 'light' : 'dark';
const WIDTH = 600, HEIGHT = 320;

// ---------- el modelo (centímetros de la maqueta) ----------
// la barrica: 15 de alto, 4,9 de radio en las cabezas y 6 en la panza; 20 duelas de 0,5 de grueso. Abierta («rosa»), las
// duelas cuelgan del aro de arriba y se abren por abajo hasta 8,6.
const BARRICA = { x: -24, y: -28, H: 15, rE: 4.9, rB: 6.0, rO: 8.6, N: 20, t: 0.5 };
const PILA = { x: -49, y: -37, largo: 13, capas: 7 };
const ARO_SUELO = { x: -50, y: -17 };
const TORNO = { x: -8, y: -28, z: 4.2, r: 1.1 };
const BANCO = { x: -4, y: -49, w: 16, d: 10, z: 4.5 };
const TAPA = { x: 4, y: -44, r: 4.5 };
const CAMA = { x0: 5, x1: 39, yA: -20, yB: -9, h: 1.4, barricas: [14, 29] };
const PASOS = ['Secar', 'Levantar', 'Tostar', 'Cerrar', 'Tapas', 'Probar'];
const PUESTOS = [[-49, -37, 3], [-24, -28, 15], [-24, -28, 2], [-8, -28, 4], [4, -44, 5], [21, -14, 7]];

// ---------- la cámara ----------
const PLATE = { x: -64, y: -56, w: 108, d: 56, r: 7 };
const B = BARRICA, rC = (z) => B.rE + (B.rB - B.rE) * (1 - (2 * z / B.H - 1) ** 2);
const zCama = CAMA.h + rC(2);
const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [B.x, B.y, B.H + 9], [CAMA.barricas[1], -14.5, zCama + B.rB + 1], [PILA.x, PILA.y, 5]], WIDTH, HEIGHT, { pad: 10, azimuth: 76, elevation: 30 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const dep = (p) => k.depthOf(p, P);
const linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(1)).join(' ')).join('L');
const FZ = (x, y, z = 0) => G.frameAlong([x, y, z], [0, 0, 1]);
const FX = (x, y, z) => G.frameAlong([x, y, z], [1, 0, 0]);
const FY = (x, y, z) => G.frameAlong([x, y, z], [0, 1, 0]);
const porDepth = (lista, f) => [...lista].sort((a, b) => dep(f(a)) - dep(f(b)));
const V = G.viewOf(P), LZ = G.lightOf(P);
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
  const regla = { x: -58, y: -9, w: 22, d: 5.5, r: 1 };
  out.push(S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo' }));
  const t = k.topTicks(regla.x + 3, regla.x + regla.w - 3, 2, 5, regla.y + 0.05, 0.6, [1.8, regla.d - 0.1], P);
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
  out.push(D([at([regla.x + 1.5, regla.y + 2.8, 0.6]), at([regla.x + regla.w - 1.5, regla.y + 2.8, 0.6])], { size: 0.45 }));
  const placa = { x: -32, y: -10, w: 34, d: 7.5, r: 1.2 };
  out.push(S(k.slabOf(placa, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(placa, 1.1), 0.8, P, 4), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([placa.x + 5.5, placa.y + 4.4], 0.8, P, 'x'), 'UPELA · UZTAIAK', { size: 2.4, tone: 'mid' }));
  out.push(D([at([placa.x + 2.2, placa.y + 3.75, 0.8]), at([placa.x + placa.w - 2.2, placa.y + 3.75, 0.8])], { size: 0.4 }));
  return out.join('');
}

// ---------- la pila de duelas, secándose al aire (capas cruzadas) ----------
function pila() {
  const { x, y, largo, capas } = PILA, out = [], h2 = largo / 2;
  for (const yy of [y - 4.2, y + 4.2]) out.push(caja(x - h2, x + h2, yy - 0.7, yy + 0.7, 0, 0.9, 'madera'));
  for (let c = 0; c < capas; c++) {
    const z0 = 0.9 + c * 0.6, piezas = [];
    for (let j = 0; j < 4; j++) {
      const o = -4.8 + j * 3.2;
      piezas.push(c % 2 ? [x + o - 0.8, x + o + 0.8, y - h2, y + h2] : [x - h2, x + h2, y + o - 0.8, y + o + 0.8]);
    }
    for (const [a, b, cc, d] of porDepth(piezas, ([a, b, cc, d]) => [(a + b) / 2, (cc + d) / 2, z0])) out.push(caja(a, b, cc, d, z0, 0.55, 'roble', 0.12));
  }
  return `<g data-part="pila">${out.join('')}</g>`;
}

// ---------- los aros de repuesto, en el suelo ----------
function arosSuelo() {
  const out = [];
  // cada aro, un anillo con su agujero: el canto que se ve y la cara de arriba
  const VA = Math.atan2(V[1], V[0]), circ = (x, y, z, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, j) => { const a = a0 + j / n * (a1 - a0); return [x + Math.cos(a) * r, y + Math.sin(a) * r, z]; });
  [[0, 0, 6.1], [0.6, 0.4, 5.6], [1.1, 0.7, 5.1]].forEach(([dx, dy, r], i) => {
    const x = ARO_SUELO.x + dx, y = ARO_SUELO.y + dy, z = (i + 1) * 0.3, f0 = circ(x, y, z, r, VA - Math.PI / 2, VA + Math.PI / 2, 24);
    out.push(`<path class="aro" d="${linea(f0.concat(f0.map((p) => [p[0], p[1], p[2] - 0.3]).reverse()))}Z"/>`);
    out.push(`<path class="aro aro-sup" fill-rule="evenodd" d="${linea(circ(x, y, z, r, 0, Math.PI * 2, 40))}Z${linea(circ(x, y, z, r - 0.35, 0, Math.PI * 2, 40))}Z"/>`);
  });
  return `<g data-part="aros-suelo">${out.join('')}</g>`;
}

// ---------- el banco, con la azuela (la tapa, viva, se dibuja encima) ----------
function banco() {
  const b = BANCO, out = [];
  for (const [px, py] of porDepth([[b.x + 1, b.y + 1], [b.x + b.w - 1, b.y + 1], [b.x + 1, b.y + b.d - 1], [b.x + b.w - 1, b.y + b.d - 1]], ([q, r]) => [q, r, 0])) out.push(pata(px, py, 0, b.z, 0.55));
  out.push(caja(b.x, b.x + b.w, b.y, b.y + b.d, b.z, 0.9, 'madera'));
  const zt = b.z + 0.9;
  out.push(S(G.solidOf([[0, 0.3], [5.4, 0.3]], FX(b.x + 8.6, b.y + 7.6, zt + 0.3), P), { tone: 'mid', className: 'madera' }));
  out.push(caja(b.x + 13.6, b.x + 14.6, b.y + 6.6, b.y + 8.8, zt, 0.6, 'hierro', 0.1));
  return `<g data-part="banco">${out.join('')}</g><g data-part="tapa-banco"></g>`;
}

// ---------- la barrica de en medio (viva: duelas, aros, cuerda, fuego y tapa se dibujan en la página) ----------
function fogon() {
  const { x, y } = B, out = [];
  const pies = [0, 1, 2].map((i) => { const a = 0.4 + i * 2.094; return [x + Math.cos(a) * 1.7, y + Math.sin(a) * 1.7]; });
  for (const [px, py] of porDepth(pies, ([q, r]) => [q, r, 0])) out.push(pata(px, py, 0, 2.3, 0.18, 'hierro'));
  out.push(S(G.solidOf([[0, 1.1], [1.1, 2.3]], FZ(x, y, 2.2), P), { tone: 'mid', className: 'hierro' }));
  out.push(`<path class="hueco" d="${k.ring(x, y, 2.05, 3.3, P, 28)}"/>`);
  const brasas = []; for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 0.4 + (i % 3) * 0.55; brasas.push(at([x + Math.cos(a) * r, y + Math.sin(a) * r * 0.9, 3.35])); }
  out.push(`<g class="brasas">${brasas.map((q, i) => `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${(0.55 + (i % 2) * 0.25).toFixed(2)}"/>`).join('')}</g>`);
  out.push(L(k.ring(x, y, 2.3, 3.3, P, 28), { tone: 'mid' }));
  return `<g data-part="fogon">${out.join('')}</g>`;
}
function barrica() {
  return `<g data-part="barrica"><g data-part="b-atras"></g>${fogon()}<g data-part="b-dentro"></g><g data-part="b-delante"></g><g data-part="b-aros"></g><g data-part="b-canto"></g></g>`;
}

// ---------- el torno: la cuerda que cierra las duelas por abajo (la manivela, viva) ----------
function torno() {
  const { x, y, z, r } = TORNO, out = [];
  out.push(caja(x - 2.2, x + 2.2, y - 4.4, y + 4.4, 0, 0.8, 'madera'));
  out.push(caja(x - 0.5, x + 0.5, y - 3.8, y - 2.8, 0.8, z + 1.6, 'madera'));
  out.push(S(G.solidOf([[0, r], [0.4, r + 0.4], [0.8, r], [5.2, r], [5.6, r + 0.4], [6.0, r]], FY(x, y - 3.0, z), P), { tone: 'mid', className: 'madera' }));
  out.push(L(G.circleOf(FY(x, y - 3.0, z), 3.0, r + 0.02, P), { tone: 'lo' }));
  out.push(caja(x - 0.5, x + 0.5, y + 2.8, y + 3.8, 0.8, z + 1.6, 'madera'));
  out.push(D([at([x, y + 3.85, z])], { size: 0.5, tone: 'mid' }));
  return `<g data-part="torno">${out.join('')}</g><g data-part="manivela"></g><g data-part="cuerda"></g>`;
}

// ---------- la cama con dos barricas acabadas, tumbadas ----------
function barricaTumbada(x) {
  const y0 = CAMA.yA - 2, F = FY(x, y0, zCama), out = [], H = B.H;
  out.push(S(G.solidOf([[0, B.rE], [0.5, B.rE + 0.2, true], [H / 2, B.rB, true], [H - 0.5, B.rE + 0.2, true], [H, B.rE]], F, P), { tone: 'mid', className: 'roble', crease: 'none' }));
  // las juntas de las duelas, en la cara que se ve
  const rr = (s) => s < 0.5 ? B.rE + 0.4 * s : s > H - 0.5 ? B.rE + 0.4 * (H - s) : rC(s);
  let jun = '';
  for (let i = 0; i < B.N; i++) {
    const th = i * 2 * Math.PI / B.N + 0.1, n = [F.u[0] * Math.cos(th) + F.v[0] * Math.sin(th), F.u[1] * Math.cos(th) + F.v[1] * Math.sin(th), F.u[2] * Math.cos(th) + F.v[2] * Math.sin(th)];
    if (n[0] * V[0] + n[1] * V[1] + n[2] * V[2] < 0.18) continue;
    const pts = []; for (let j = 0; j <= 14; j++) { const s = 1.0 + j / 14 * (H - 2); const r = rr(s); pts.push([x + n[0] * r, y0 + s, zCama + n[2] * r]); }   // de aro a aro: los extremos quedan bajo los aros de las cabezas
    jun += linea(pts);
  }
  out.push(L(jun, { tone: 'lo' }));
  // los aros: solo la mitad que se ve (un anillo entero taparía la barrica con su silueta)
  const uv = F.u[0] * V[0] + F.u[1] * V[1] + F.u[2] * V[2], vv = F.v[0] * V[0] + F.v[1] * V[1] + F.v[2] * V[2], th0 = Math.atan2(vv, uv);
  const anillo = (s, r) => { const arc = (ss) => Array.from({ length: 25 }, (_, j) => { const th = th0 - Math.PI / 2 + j / 24 * Math.PI, c = Math.cos(th), sn = Math.sin(th); return [F.o[0] + F.a[0] * ss + (F.u[0] * c + F.v[0] * sn) * r, F.o[1] + F.a[1] * ss + (F.u[1] * c + F.v[1] * sn) * r, F.o[2] + F.a[2] * ss + (F.u[2] * c + F.v[2] * sn) * r]; }); return linea(arc(s + 0.42).concat(arc(s - 0.42).reverse())) + 'Z'; };
  out.push(`<path class="aro" d="${[1.0, 3.0, H - 3.0, H - 1.0].map((s) => anillo(s, rr(s) + 0.24)).join('')}"/>`);
  // la tapa de delante: el jable y las tablas
  const Rt = B.rE - 0.45, yt = y0 + H;
  out.push(L(G.circleOf(F, H, Rt, P), { tone: 'lo' }));
  out.push(L([-0.5, 0, 0.5].map((f) => { const d = f * Rt; const hh = Math.sqrt(Rt * Rt - d * d); return linea([[x + d, yt, zCama - hh], [x + d, yt, zCama + hh]]); }).join(''), { tone: 'lo' }));
  // el tapón, arriba en la panza
  out.push(S(k.cylinder(x, y0 + H / 2, 0.55, zCama + B.rB - 0.2, 0.8, P, 14), { tone: 'mid', className: 'madera' }));
  return out.join('');
}
function cama() {
  const c = CAMA, out = [];
  for (const yy of [c.yA, c.yB]) out.push(caja(c.x0, c.x1, yy - 0.8, yy + 0.8, 0, c.h, 'madera'));
  for (const x of c.barricas) { out.push(barricaTumbada(x)); for (const yy of [c.yA, c.yB]) out.push(caja(x - 4.2, x - 3, yy - 0.6, yy + 0.6, c.h, 0.9, 'madera', 0.1), caja(x + 3, x + 4.2, yy - 0.6, yy + 0.6, c.h, 0.9, 'madera', 0.1)); }
  return `<g data-part="cama">${out.join('')}</g>`;
}

// ---------- la figura ----------
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'Maqueta del taller del tonelero: la pila de duelas de roble secándose; en medio, una barrica que se arma (las duelas de pie dentro de un aro, el fuego que las calienta, el torno con la cuerda que las cierra y los aros que las aprietan, la tapa y la prueba con agua); el banco con la tapa y la azuela, los aros de repuesto y la cama con dos barricas acabadas.',
  body: [tablero(), pila(), arosSuelo(), banco(), barrica(), torno(), cama(), '<g data-part="mazo"></g>'],
});

// ---------- lo que se mueve en la página ----------
const live = MARCA_JUEGO + `
const P = ${JSON.stringify(P)}, B = ${JSON.stringify(BARRICA)}, TORNO = ${JSON.stringify(TORNO)}, TAPA = ${JSON.stringify(TAPA)}, BANCO = ${JSON.stringify(BANCO)}, PUESTOS = ${JSON.stringify(PUESTOS)};
const V = ${JSON.stringify(V)}, LZ = ${JSON.stringify(LZ)};
const PASOS = ${JSON.stringify(PASOS)}, N = PASOS.length;
const at = (p) => iso(p, P), f1 = (v) => v.toFixed(1), linea = (pts) => 'M' + pts.map((p) => { const q = at(p); return f1(q[0]) + ' ' + f1(q[1]); }).join('L'), poly = (pts) => linea(pts) + 'Z';
const K = Math.hypot(at([0, 0, 1])[0] - at([0, 0, 0])[0], at([0, 0, 1])[1] - at([0, 0, 0])[1]);
const stage = document.querySelector('.iso-stage'), svgEl = stage.querySelector('svg'), $ = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const el = {}; for (const n of ['pila', 'barrica', 'b-atras', 'b-dentro', 'b-delante', 'b-aros', 'b-canto', 'fogon', 'torno', 'manivela', 'cuerda', 'banco', 'tapa-banco', 'cama', 'mazo']) el[n] = $(n);
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const ilumina = (lista, on) => { for (const n of [].concat(lista)) if (n && on !== n.hasAttribute('data-lit')) n.toggleAttribute('data-lit', on); };
let s = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, txt = '', reloj = 0, giro = 0;
const tourAt = (t) => { const T = 3 * N + 2, f = (t % T) / T * (N + 0.71); const i = Math.floor(f); return Math.min(N - 0.001, i + sm((f - i) / 0.6) * 0.999); };
// la forma de la barrica: cerrada, una panza; abierta (rosa), un cono que cuelga del aro de arriba
const rCe = (z) => B.rE + (B.rB - B.rE) * (1 - Math.pow(2 * z / B.H - 1, 2)), rAb = (z) => B.rE + (B.rO - B.rE) * (1 - z / B.H);
const rad = (z, c) => rAb(z) + (rCe(z) - rAb(z)) * c;
const ZS = []; for (let i = 0; i <= 10; i++) ZS.push(i / 10 * B.H);
const VA = Math.atan2(V[1], V[0]);
const tono = (th) => { const d = Math.cos(th) * LZ[0] + Math.sin(th) * LZ[1]; return d < -0.3 ? 0 : d < 0.05 ? 1 : d < 0.4 ? 2 : 3; };
function duela(th, c, dentro) {
  const izq = [], der = [];
  for (const z of ZS) { const r = rad(z, c) - (dentro ? B.t : 0), hw = Math.PI / B.N * rCe(z) / rad(z, c) * 0.94; izq.push([B.x + Math.cos(th - hw) * r, B.y + Math.sin(th - hw) * r, z]); der.push([B.x + Math.cos(th + hw) * r, B.y + Math.sin(th + hw) * r, z]); }
  return poly(izq.concat(der.reverse()));
}
function canto(th) {
  const hw = Math.PI / B.N * 0.94, fuera = [], dentro = [];
  for (let k = 0; k <= 3; k++) { const a = th - hw + k / 3 * 2 * hw; fuera.push([B.x + Math.cos(a) * B.rE, B.y + Math.sin(a) * B.rE, B.H]); dentro.push([B.x + Math.cos(a) * (B.rE - B.t), B.y + Math.sin(a) * (B.rE - B.t), B.H]); }
  return poly(fuera.concat(dentro.reverse()));
}
function aro(z, c) {
  const w = 0.42, arriba = [], abajo = [];
  for (let k = 0; k <= 24; k++) { const a = VA - Math.PI / 2 + k / 24 * Math.PI, r1 = rad(z + w, c) + 0.24, r0 = rad(z - w, c) + 0.24; arriba.push([B.x + Math.cos(a) * r1, B.y + Math.sin(a) * r1, z + w]); abajo.push([B.x + Math.cos(a) * r0, B.y + Math.sin(a) * r0, z - w]); }
  return '<path class="aro" d="' + poly(arriba.concat(abajo.reverse())) + '"/>';
}
function tapa(cx, cy, z, r) {
  const sup = [], lado = [];
  for (let k = 0; k < 36; k++) { const a = k / 36 * Math.PI * 2; sup.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]); }
  for (let k = 0; k <= 18; k++) { const a = VA - Math.PI / 2 + k / 18 * Math.PI; lado.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]); }
  const bajo = lado.map((p) => [p[0], p[1], z - 0.6]).reverse();
  let tablas = ''; for (const f of [-0.5, 0, 0.5]) { const d = f * r, hh = Math.sqrt(r * r - d * d); tablas += linea([[cx + d, cy - hh, z], [cx + d, cy + hh, z]]); }
  return '<g class="tapa"><path class="tapa-lado" d="' + poly(lado.concat(bajo)) + '"/><path class="tapa-sup" d="' + poly(sup) + '"/><path class="iso-line" data-tone="lo" d="' + tablas + '"/></g>';
}
function draw(dt) {
  reloj += dt;
  const paso = Math.min(N - 1, Math.floor(s));
  // la rosa se cierra en el paso de cerrar (y queda cerrada)
  const c = sm((s - 3.0) / 0.55);
  const fuego = s > 1.6 && s < 3.6 ? sm((s - 1.6) / 0.4) * (1 - sm((s - 3.2) / 0.4)) : 0;
  // duelas: las de atrás (se les ve la cara de dentro), luego el fogón, luego las de delante
  const duelas = []; for (let i = 0; i < B.N; i++) { const th = i * 2 * Math.PI / B.N + 0.13; duelas.push({ th, d: depthOf([B.x + Math.cos(th) * B.rB, B.y + Math.sin(th) * B.rB, B.H / 2], P), front: Math.cos(th) * V[0] + Math.sin(th) * V[1] > 0 }); }
  duelas.sort((a, b) => a.d - b.d);
  let atras = '', delante = '', cantos = '';
  for (const q of duelas) { if (q.front) delante += '<path class="duela dz' + tono(q.th) + '" d="' + duela(q.th, c, false) + '"/>'; else atras += '<path class="duela dzi" d="' + duela(q.th, c, true) + '"/>'; cantos += '<path class="canto" d="' + canto(q.th) + '"/>'; }
  el['b-atras'].innerHTML = atras; el['b-delante'].innerHTML = delante; el['b-canto'].innerHTML = cantos;
  el.barrica.style.setProperty('--tost', (Math.max(fuego, 0.35 * sm((s - 1.8) / 0.8))).toFixed(2));
  // dentro: las llamas del fogón (y la tapa, cuando ya ha entrado)
  let dentro = '';
  if (fuego > 0.02) for (let j = 0; j < 5; j++) { const a = j * 1.26 + 0.3, rr = j ? 0.9 : 0, q = at([B.x + Math.cos(a) * rr, B.y + Math.sin(a) * rr, 3.3]), h = (1.8 + 0.9 * Math.sin(reloj * 9 + j * 2.1)) * fuego * K * (j ? 0.75 : 1.15), w = (0.55 + 0.15 * (j % 2)) * K; dentro += '<path class="llama" d="M' + f1(q[0] - w) + ' ' + f1(q[1]) + 'Q' + f1(q[0] - w) + ' ' + f1(q[1] - h * 0.55) + ' ' + f1(q[0]) + ' ' + f1(q[1] - h) + 'Q' + f1(q[0] + w) + ' ' + f1(q[1] - h * 0.55) + ' ' + f1(q[0] + w) + ' ' + f1(q[1]) + 'Z"/>'; }
  // la tapa: en el banco; en el paso de las tapas sube, vuela sobre la barrica y baja al jable
  const tv = sm((s - 4.0) / 0.7), tb = [BANCO.x + 8, BANCO.y + 4.2, BANCO.z + 0.9 + 0.6];
  let tc, tz;
  if (tv < 0.5) { const f = tv / 0.5; tc = [tb[0] + (B.x - tb[0]) * f, tb[1] + (B.y - tb[1]) * f]; tz = tb[2] + Math.sin(f * Math.PI / 2) * (B.H + 5 - tb[2]); }
  else { const f = (tv - 0.5) / 0.5; tc = [B.x, B.y]; tz = B.H + 5 - f * 5.8; }
  const tapaSvg = tapa(tc[0], tc[1], tz, tv > 0.5 ? B.rE - 0.32 : TAPA.r);
  el['tapa-banco'].innerHTML = tv < 0.02 ? tapaSvg : '';
  if (tv >= 0.02 && tz < B.H - 0.05) dentro += tapaSvg;
  el['b-dentro'].innerHTML = dentro;
  // por fuera: los aros (el de arriba sujeta la rosa; los de abajo se bajan a golpe de mazo), la cuerda, el humo y la tapa en el aire
  const bajos = sm((s - 3.5) / 0.45);
  let aros = aro(B.H - 1.0, c) + aro(B.H - 3.3, c);
  if (bajos > 0.01) { aros += '<g style="opacity:' + bajos.toFixed(2) + '">' + aro(3.3 + (1 - bajos) * 2.4, c) + aro(1.0 + (1 - bajos) * 2.4, c) + '</g>'; }
  const cu = sm((s - 2.75) / 0.25) * (1 - sm((s - 3.75) / 0.25));
  let arriba = '';
  if (tv >= 0.02 && tz >= B.H - 0.05) arriba += tapaSvg;
  if (fuego > 0.02) for (let k = 0; k < 5; k++) { const f = (reloj * 0.35 + k / 5) % 1, q = at([B.x + Math.sin(reloj + k) * 0.8 * f, B.y, B.H + 1 + f * 8]); arriba += '<ellipse class="humo" cx="' + f1(q[0]) + '" cy="' + f1(q[1]) + '" rx="' + f1((1 + f * 1.6) * K) + '" ry="' + f1((0.7 + f * 1.1) * K) + '" style="opacity:' + (fuego * 0.55 * (1 - f)).toFixed(2) + '"/>'; }
  // la prueba: el embudo en la tapa, con agua
  const pr = sm((s - 5.0) / 0.4);
  if (pr > 0.02) { const top = [], bot = []; for (let k = 0; k <= 16; k++) { const a = VA - Math.PI / 2 + k / 16 * Math.PI; top.push([B.x + Math.cos(a) * 1.9, B.y + Math.sin(a) * 1.9, B.H + 2.6]); bot.push([B.x + Math.cos(a) * 0.45, B.y + Math.sin(a) * 0.45, B.H + 0.5]); }
    const boca = []; for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; boca.push([B.x + Math.cos(a) * 1.9, B.y + Math.sin(a) * 1.9, B.H + 2.6]); }
    const ag = []; const ra = 1.55 + Math.sin(reloj * 3) * 0.06; for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; ag.push([B.x + Math.cos(a) * ra, B.y + Math.sin(a) * ra, B.H + 2.3]); }
    arriba += '<g style="opacity:' + pr.toFixed(2) + '"><path class="embudo" d="' + poly(top.concat(bot.reverse())) + '"/><path class="embudo-boca" d="' + poly(boca) + '"/><path class="agua" d="' + poly(ag) + '"/></g>'; }
  el['b-aros'].innerHTML = aros;
  el['b-canto'].innerHTML += arriba;
  // la cuerda del torno: abraza las duelas por abajo y tira de ellas; la manivela gira mientras se cierra
  giro += dt * (s > 2.95 && s < 3.6 ? 5 : 0);
  if (cu > 0.01) { const zc = 1.2, rr = rad(zc, c) + 0.2, lazo = []; for (let k = 0; k <= 24; k++) { const a = VA - Math.PI / 2 + k / 24 * Math.PI; lazo.push([B.x + Math.cos(a) * rr, B.y + Math.sin(a) * rr, zc]); }
    const p1 = [B.x + Math.cos(0.35) * rr, B.y + Math.sin(0.35) * rr, zc], p2 = [B.x + Math.cos(-0.35) * rr, B.y + Math.sin(-0.35) * rr, zc], d1 = [TORNO.x, TORNO.y - 0.6, TORNO.z + TORNO.r], d2 = [TORNO.x, TORNO.y + 0.6, TORNO.z - TORNO.r];
    el.cuerda.innerHTML = '<g style="opacity:' + cu.toFixed(2) + '"><path class="cuerda" d="' + linea(lazo) + linea([p1, d1]) + linea([p2, d2]) + '"/></g>'; }
  else el.cuerda.innerHTML = '';
  const eje = [TORNO.x, TORNO.y + 3.85, TORNO.z], mano = [TORNO.x + Math.cos(giro) * 2.2, TORNO.y + 4.3, TORNO.z + Math.sin(giro) * 2.2], puño = [mano[0], mano[1] + 1.4, mano[2]];
  el.manivela.innerHTML = '<path class="iso-line palo" data-tone="mid" d="' + linea([eje, [eje[0], eje[1] + 0.45, eje[2]], mano, puño]) + '"/><g class="iso-dots" data-tone="mid"><circle r=".5" cx="' + f1(at(mano)[0]) + '" cy="' + f1(at(mano)[1]) + '"/><circle r=".6" cx="' + f1(at(puño)[0]) + '" cy="' + f1(at(puño)[1]) + '"/></g>';
  // el mazo y la tajadera: bajan los aros de abajo a golpes
  if (bajos > 0.01 && bajos < 0.995 || (s > 3.45 && s < 4.0)) { const a = VA + 0.55, zA = 3.3 + (1 - bajos) * 2.4, rA = rad(zA, c) + 0.5, base = [B.x + Math.cos(a) * rA, B.y + Math.sin(a) * rA, zA + 0.4], cab = [base[0] + Math.cos(a) * 0.6, base[1] + Math.sin(a) * 0.6, base[2] + 2.4];
    const golpe = Math.abs(Math.sin(reloj * 7)), m0 = [cab[0] + Math.cos(a) * 0.4, cab[1] + Math.sin(a) * 0.4, cab[2] + 0.6 + golpe * 2.4], m1 = [m0[0] + Math.cos(a + 1.2) * 4.2, m0[1] + Math.sin(a + 1.2) * 4.2, m0[2] + 1.2];
    el.mazo.innerHTML = '<path class="iso-line tajadera" data-tone="hi" d="' + linea([base, cab]) + '"/><path class="iso-line palo" data-tone="mid" d="' + linea([m0, m1]) + '"/><path class="iso-line maza" data-tone="hi" d="' + linea([[m0[0], m0[1], m0[2] - 0.7], [m0[0], m0[1], m0[2] + 0.7]]) + '"/><g class="iso-dots" data-tone="hi"><circle r=".45" cx="' + f1(at(base)[0]) + '" cy="' + f1(at(base)[1]) + '"/><circle r=".5" cx="' + f1(at(cab)[0]) + '" cy="' + f1(at(cab)[1]) + '"/><circle r=".45" cx="' + f1(at(m1)[0]) + '" cy="' + f1(at(m1)[1]) + '"/></g>'; }
  else el.mazo.innerHTML = '';
  // lo que trabaja en cada paso
  ilumina(el.pila, paso === 0); ilumina([el['b-delante'], el['b-canto']], paso === 1); ilumina(el.fogon, paso === 2); ilumina([el.torno, el.manivela, el.cuerda, el['b-aros'], el.mazo], paso === 3); ilumina([el['tapa-banco'], el['b-dentro']], paso === 4); ilumina(el.cama, paso === 5);
  const extra = ['el roble se seca al aire dos o tres años', 'las duelas, de pie dentro de un aro: la rosa', 'el fuego las ablanda para doblarlas, y las tuesta', 'el torno las cierra; los aros, a golpe de mazo', 'cada tapa entra en su ranura, el jable', 'llena de agua: ni una gota. Ya puede guardar vino'][paso];
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
// el ratón enciende el puesto más cercano
const puesto = (e) => { const m = svgEl.getScreenCTM(); if (!m) return 0; const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()); let best = 0, bd = Infinity; PUESTOS.forEach((p, i) => { const a = at(p), d = Math.hypot(a[0] - q.x, a[1] - q.y); if (d < bd) { bd = d; best = i; } }); return best + 0.5; };
stage.addEventListener('pointermove', (e) => steer(puesto(e)));
stage.addEventListener('pointerdown', (e) => steer(puesto(e)));
stage.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); steer(Math.floor(target) + 1.6); } if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); steer(Math.floor(target) - 0.4); } });
draw(0);
${PUENTE}`;

const tonos = (pre, cls, [f, s0, s1, s2, s3, t]) => `${pre}.${cls}>.iso-fill{fill:${f}}${pre}.${cls}>.iso-top{fill:${t}}${pre}.${cls}[data-seamless]>.iso-top{stroke:${t}}` +
  [s0, s1, s2, s3].map((c, i) => `${pre}.${cls}>.iso-shade[data-shade="${i}"]{fill:${c}}${pre}.${cls}[data-seamless]>.iso-shade[data-shade="${i}"]{stroke:${c}}`).join('');
const COLOR = {
  dark: { madera: ['#4a3628', '#2a1d16', '#35261c', '#403022', '#4c3a2a', '#5a4632'], roble: ['#7a5a3a', '#4a3420', '#5a4028', '#6a4c30', '#7a5838', '#8c6a46'],
    hierro: ['#3a3642', '#1c1a22', '#26232c', '#302d36', '#3a3742', '#4a4652'] },
  light: { madera: ['#8a6a50', '#5e4636', '#6c523e', '#7a5e48', '#886a52', '#9a7c62'], roble: ['#c8a070', '#987048', '#a87e54', '#b88c60', '#c89a6c', '#dcb080'],
    hierro: ['#7a7684', '#4e4a58', '#5c5866', '#6a6674', '#787482', '#8c8896'] },
};
const colores = Object.entries(COLOR).map(([th, m]) => Object.entries(m).map(([cls, v]) => tonos(th === 'light' ? '.iso[data-theme="light"] ' : '', cls, v)).join('')).join('');
const CSS = COLORES + enJuego(WIDTH, HEIGHT) + `
.iso{--d0:#4a3420;--d1:#5a4028;--d2:#6e5032;--d3:#86643e;--di:#3a2818;--canto:#9a7850;--aro:#2c2a34;--aro-sup:#3e3a48;--fuego:#e8622a;--llama:#ffb347;--llama2:#ff6a2a;--humo:#cfc4d8;--brasa:#ff7a3a;--hueco:#0d0718;--agua:#3a5cc8;--cuerda:#c8b48a;--tapa:#8c6a46;--tapa-l:#5a4028}
.iso[data-theme="light"]{--d0:#987048;--d1:#a87e54;--d2:#bc9264;--d3:#d4ac7c;--di:#7a5838;--canto:#e4c08e;--aro:#4e4a58;--aro-sup:#6a6674;--fuego:#e8622a;--llama:#ffb347;--llama2:#ff6a2a;--humo:#8a7aa8;--brasa:#e8622a;--hueco:#8c7a86;--agua:#7aa0e8;--cuerda:#8a7458;--tapa:#dcb080;--tapa-l:#a87e54}
.duela{stroke:var(--anatomy-lo);stroke-width:.35;stroke-linejoin:round}.dz0{fill:var(--d0)}.dz1{fill:var(--d1)}.dz2{fill:var(--d2)}.dz3{fill:var(--d3)}
.dzi{fill:color-mix(in srgb,var(--fuego) calc(var(--tost,0) * 55%),var(--di))}
.canto{fill:var(--canto);stroke:var(--anatomy-lo);stroke-width:.3}
.aro{fill:var(--aro);stroke:var(--anatomy-mid);stroke-width:.4;stroke-linejoin:round}.aro-sup{fill:var(--aro-sup)}
.llama{fill:var(--llama);stroke:var(--llama2);stroke-width:.5;mix-blend-mode:screen}.humo{fill:var(--humo)}.brasas circle{fill:var(--brasa)}.hueco{fill:var(--hueco)}
.cuerda{fill:none;stroke:var(--cuerda);stroke-width:.9;stroke-linecap:round;stroke-linejoin:round}
.tapa-sup{fill:var(--tapa);stroke:var(--anatomy-mid);stroke-width:.4}.tapa-lado{fill:var(--tapa-l);stroke:var(--anatomy-mid);stroke-width:.4}
.embudo{fill:var(--aro);stroke:var(--anatomy-mid);stroke-width:.4}.embudo-boca{fill:var(--hueco);stroke:var(--anatomy-mid);stroke-width:.4}.agua{fill:var(--agua);stroke:var(--anatomy-lo);stroke-width:.3}
.palo{stroke-width:1.1;stroke-linecap:round}.tajadera{stroke-width:1.3;stroke-linecap:round}.maza{stroke-width:2.6;stroke-linecap:round}
[data-lit] .iso-edge,[data-lit].iso-line,[data-lit] .iso-line,[data-lit] .tb-edge,[data-lit] .duela,[data-lit] .canto,[data-lit] .aro,[data-lit] .tapa-sup,[data-lit] .tapa-lado{stroke:var(--anatomy-lit)}
[data-lit] .iso-top,[data-lit].iso-top{fill:var(--anatomy-lit-top)}
[data-lit] .iso-dots circle{fill:var(--anatomy-lit)}
` + colores;

const body = k.plateHtml({
  fig: 'Lámina 15',
  title: 'Cómo se hace una barrica',
  hint: 'Pasa el ratón por cada pieza',
  readout: '1 · Secar',
  keys: [
    { mark: 'lit', label: 'Lo que trabaja en cada paso: la pila de duelas, la rosa, el fuego, el torno y los aros, la tapa y la prueba con agua' },
    { mark: 'raised', label: 'Sin clavos ni cola: solo madera doblada y aros de hierro que la aprietan' },
    { mark: 'flat', label: 'El fuego dobla la madera y la tuesta: el tostado da sabor y aroma al vino' },
  ],
  caption: 'El vino de Navarra reposa en barricas de roble. El roble se corta en tablas curvas, las duelas, y se deja secar al aire dos o tres años. El tonelero las pone de pie en círculo dentro de un aro de hierro: abiertas por abajo parecen una flor, y por eso se llama la rosa. Dentro enciende un fuego de virutas: el calor ablanda la madera para poder doblarla y, de paso, la tuesta, y ese tostado da sabor y aroma al vino. Con un torno y una cuerda cierra las duelas por abajo, y a golpe de mazo les baja los aros que las aprietan. En una ranura de cada extremo, el jable, encajan las tapas. Por último se llena de agua: si no gotea, ya puede guardar vino. No lleva ni un clavo ni pegamento.',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Cómo se hace una barrica, paso a paso: las flechas pasan de un paso a otro" aria-valuemin="1" aria-valuemax="6">${svg}</div>`,
});

const html = k.pageHtml({ title: 'Cómo se hace una barrica', theme, body, script: kitScript() + live }).replace('</style>', CSS + '</style>');
escribe('tonelero', html, theme);
