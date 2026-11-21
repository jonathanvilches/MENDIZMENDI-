// Lámina isométrica interactiva «Cómo se hace una cesta» (skill Anatomy, 21 de noviembre de 2026; el autor: «explicaciones
// técnicas con Anatomy de oficios antiguos, de procesos de elaboración de productos artesanales de Navarra»). El taller del
// cestero de un caserío, en maqueta: el haz de varas de castaño con la podadera clavada en el tajo; el caldero en el fuego
// donde se cuecen para ablandarlas; el banco de rajar, que sujeta la tira con un pedal mientras la cuchilla la alisa; y en
// medio, sobre la tabla, una cesta que se arma (las costillas en cruz que se doblan hacia arriba), se teje vuelta a vuelta
// por encima y por debajo, y se remata con el borde y el asa. Delante, dos cestas acabadas, una con manzanas. Al recorrerla,
// paso a paso, se ilumina lo que trabaja. Es la que se abre al acabar el taller del cestero (data/oficios.js) y en el
// material didáctico.
// Uso: node tools/anatomia/cesta.mjs [--light]  →  entrega/anatomia/cesta(-light).html (y public/anatomia, para el juego)
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';
import * as G from '../../.claude/skills/anatomy/kit/lathe.mjs';
import { kitScript } from '../../.claude/skills/anatomy/scripts/inline-kit.mjs';
import { COLORES, enJuego, MARCA_JUEGO, escribe } from './comun.mjs';

const theme = process.argv.includes('--light') ? 'light' : 'dark';
const WIDTH = 600, HEIGHT = 320;

// ---------- el modelo (centímetros de la maqueta) ----------
// la cesta: 16 costillas; base de 3,6 de radio, boca de 5,2 a 6,5 de alto; 13 vueltas de tira de 0,5.
const CESTA = { x: -4, y: -27, rb: 3.6, rt: 5.2, H: 6.5, costillas: 16, vueltas: 13 };
const HAZ = { x: -57, y: -47, largo: 15 };
const TAJO = { x: -40, y: -42 };
const CALDERO = { x: -50, y: -30 };
const BANCO = { x: -32, y: -50, w: 20, d: 4, z: 4 };
const TABLA = { x: -12, y: -34, w: 16, d: 14 };
const PASOS = ['Cortar', 'Cocer', 'Rajar', 'Armar', 'Tejer', 'Rematar'];
const PUESTOS = [[-50, -46, 2], [-50, -30, 5], [-22, -48, 6], [-4, -27, 1], [-4, -27, 4], [-4, -27, 8]];
const ACABADAS = [{ x: -40, y: -20, s: 0.78, manzanas: true }, { x: 17, y: -38, s: 0.9, manzanas: false }];

// ---------- la cámara ----------
const PLATE = { x: -63, y: -55, w: 91, d: 51, r: 7 };
const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [CESTA.x, CESTA.y, CESTA.H + 7], [CALDERO.x, CALDERO.y, 12]], WIDTH, HEIGHT, { pad: 8, azimuth: 66, elevation: 30 });
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
  const regla = { x: 4, y: -11.5, w: 18, d: 5.5, r: 1 };
  out.push(S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo' }));
  const t = k.topTicks(regla.x + 3, regla.x + regla.w - 3, 2, 5, regla.y + 0.05, 0.6, [1.8, regla.d - 0.1], P);
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
  out.push(D([at([regla.x + 1.5, regla.y + 2.8, 0.6]), at([regla.x + regla.w - 1.5, regla.y + 2.8, 0.6])], { size: 0.45 }));
  const placa = { x: -33, y: -12.8, w: 34, d: 7.5, r: 1.2 };
  out.push(S(k.slabOf(placa, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(placa, 1.1), 0.8, P, 4), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([placa.x + 5.4, placa.y + 4.4], 0.8, P, 'x'), 'SASKIAK · ZUMITZAK', { size: 2.4, tone: 'mid' }));
  out.push(D([at([placa.x + 2.2, placa.y + 3.75, 0.8]), at([placa.x + placa.w - 2.2, placa.y + 3.75, 0.8])], { size: 0.4 }));
  return out.join('');
}

// ---------- el haz de varas, atado, y el tajo con la podadera ----------
function haz() {
  const { x, y, largo } = HAZ, out = [], r = 0.42, varas = [];
  for (let fila = 0; fila < 3; fila++) for (let j = 0; j < 4 - fila; j++) varas.push([y - 1.3 + fila * 0.42 + j * 0.86, r + fila * 0.74]);
  for (const [vy, vz] of porDepth(varas, ([q, w]) => [x + largo, q, w])) {
    const F = FX(x, vy, vz);
    out.push(S(G.solidOf([[0, r * 0.8], [largo, r]], F, P), { tone: 'mid', className: 'vara' }));
    out.push(D([at([x + largo, vy, vz])], { size: 0.22, tone: 'lo' }));
  }
  // las dos ataduras
  for (const xx of [x + 3.5, x + largo - 3.5]) { const F = FX(xx, y, 1.15); out.push(S(G.solidOf([[0, 1.85], [0.5, 1.85]], F, P), { tone: 'mid', className: 'atadura' })); }
  return `<g data-part="haz">${out.join('')}</g>`;
}
function tajo() {
  const { x, y } = TAJO, out = [], F = FZ(x, y, 0);
  out.push(S(G.solidOf([[0, 2.4], [0.4, 2.2], [2.8, 2.1], [3.2, 2.0]], F, P), { tone: 'mid', className: 'tronco', crease: 'none' }));
  out.push(L(G.circleOf(F, 3.2, 1.2, P) + G.circleOf(F, 3.2, 0.55, P), { tone: 'lo' }));
  // la podadera: hoja curva clavada y el mango
  const h0 = [x + 0.3, y + 0.2, 3.2], h1 = [x + 0.9, y + 0.5, 4.4], m1 = [x + 2.6, y + 1.3, 6.9];
  out.push(`<path class="hoja" d="${linea([[x - 0.3, y - 0.1, 3.15], [x - 0.6, y - 0.2, 4.1], [x - 0.1, y + 0.05, 4.9], h1, h0])}Z"/>`);
  out.push(`<path class="iso-line mango" data-tone="mid" d="${linea([h1, m1])}"/>`);
  out.push(D([at(m1), at(h1)], { size: 0.4, tone: 'mid' }));
  return `<g data-part="tajo">${out.join('')}</g>`;
}

// ---------- el caldero en el fuego (las varas, el agua, el vapor y las llamas, vivos) ----------
function caldero() {
  const { x, y } = CALDERO, out = [];
  // las piedras del fuego, en corro
  const piedras = Array.from({ length: 9 }, (_, i) => { const a = i / 9 * Math.PI * 2; return [x + Math.cos(a) * 4.2, y + Math.sin(a) * 4.2]; });
  for (const [px, py] of porDepth(piedras, ([q, w]) => [q, w, 0])) if (dep([px, py, 0]) < dep([x, y, 0]) + 0.5) out.push(S(G.solidOf([[0, 0.9], [0.5, 1.0, true], [1.1, 0.6, true], [1.3, 0.2]], FZ(px, py, 0), P), { tone: 'mid', className: 'piedra', crease: 'none' }));
  out.push(`<g data-part="fuego"></g>`);
  // las patas de la trébede
  const pies = [0, 1, 2].map((i) => { const a = 0.5 + i * 2.094; return [x + Math.cos(a) * 3.3, y + Math.sin(a) * 3.3]; });
  for (const [px, py] of porDepth(pies, ([q, w]) => [q, w, 0])) out.push(`<path class="iso-line pata-hierro" data-tone="mid" d="${linea([[px, py, 0], [x + (px - x) * 0.75, y + (py - y) * 0.75, 3.0]])}"/>`, D([at([px, py, 0])], { size: 0.32, tone: 'mid' }));
  const F = FZ(x, y, 3.0);
  out.push(S(G.solidOf([[0, 1.6], [0.5, 2.7, true], [2.6, 3.3, true], [4.0, 3.0], [4.3, 3.25]], F, P), { tone: 'mid', className: 'cobre', crease: 'none' }));
  out.push(`<path class="agua" d="${poly(Array.from({ length: 40 }, (_, i) => { const a = i / 40 * Math.PI * 2; return [x + Math.cos(a) * 2.9, y + Math.sin(a) * 2.9, 6.9]; }))}"/>`);
  out.push(L(G.circleOf(F, 4.3, 3.25, P), { tone: 'mid' }));
  out.push(`<g data-part="cociendo"></g>`);
  for (const [px, py] of porDepth(piedras, ([q, w]) => [q, w, 0])) if (dep([px, py, 0]) >= dep([x, y, 0]) + 0.5) out.push(S(G.solidOf([[0, 0.9], [0.5, 1.0, true], [1.1, 0.6, true], [1.3, 0.2]], FZ(px, py, 0), P), { tone: 'mid', className: 'piedra', crease: 'none' }));
  return `<g data-part="caldero">${out.join('')}</g><g data-part="vapor"></g>`;
}

// ---------- el banco de rajar: la tabla, la rampa, el brazo con el cabezal y el pedal (lo que se mueve, vivo) ----------
function banco() {
  const b = BANCO, out = [];
  for (const [px, py] of porDepth([[b.x + 1.2, b.y + 0.6], [b.x + b.w - 1.2, b.y + 0.6], [b.x + 1.2, b.y + b.d - 0.6], [b.x + b.w - 1.2, b.y + b.d - 0.6]], ([q, r]) => [q, r, 0])) out.push(pata(px, py, 0, b.z, 0.45));
  out.push(caja(b.x, b.x + b.w, b.y, b.y + b.d, b.z, 0.8, 'madera'));
  // la rampa donde se apoya la tira
  out.push(caja(b.x + 9, b.x + 14, b.y + 0.4, b.y + b.d - 0.4, b.z + 0.8, 1.1, 'madera', 0.15));
  return `<g data-part="rajando-atras"></g><g data-part="banco">${out.join('')}</g><g data-part="rajando"></g>`;
}
function tabla() {
  const t = TABLA;
  return `<g data-part="tabla">${caja(t.x, t.x + t.w, t.y, t.y + t.d, 0, 0.6, 'madera', 0.15)}</g>`;
}

// ---------- la figura ----------
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'Maqueta del taller del cestero: el haz de varas de castaño y el tajo con la podadera; el caldero en el fuego donde se cuecen; el banco de rajar con su pedal, su cabezal y la cuchilla; en medio, sobre la tabla, una cesta que se arma, se teje y se remata con el borde y el asa; y dos cestas acabadas, una con manzanas.',
  body: [tablero(), haz(), tajo(), caldero(), banco(), tabla(), '<g data-part="cesta"></g>', '<g data-part="acabadas"></g>'],
});

// ---------- lo que se mueve en la página ----------
const live = MARCA_JUEGO + `
const P = ${JSON.stringify(P)}, CE = ${JSON.stringify(CESTA)}, CALDERO = ${JSON.stringify(CALDERO)}, BANCO = ${JSON.stringify(BANCO)}, PUESTOS = ${JSON.stringify(PUESTOS)}, ACABADAS = ${JSON.stringify(ACABADAS)};
const V = ${JSON.stringify(V)}, LZ = ${JSON.stringify(LZ)};
const PASOS = ${JSON.stringify(PASOS)}, N = PASOS.length;
const at = (p) => iso(p, P), f2 = (v) => v.toFixed(2), linea = (pts) => 'M' + pts.map((p) => { const q = at(p); return f2(q[0]) + ' ' + f2(q[1]); }).join('L'), poly = (pts) => linea(pts) + 'Z';
const K = Math.hypot(at([0, 0, 1])[0] - at([0, 0, 0])[0], at([0, 0, 1])[1] - at([0, 0, 0])[1]);
const stage = document.querySelector('.iso-stage'), svgEl = stage.querySelector('svg'), $ = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const el = {}; for (const n of ['haz', 'tajo', 'caldero', 'fuego', 'cociendo', 'vapor', 'banco', 'rajando', 'rajando-atras', 'tabla', 'cesta', 'acabadas']) el[n] = $(n);
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }, mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const ilumina = (lista, on) => { for (const n of [].concat(lista)) if (n && on !== n.hasAttribute('data-lit')) n.toggleAttribute('data-lit', on); };
let s = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, txt = '', reloj = 0;
const tourAt = (t) => { const T = 3 * N + 2, f = (t % T) / T * (N + 0.71); const i = Math.floor(f); return Math.min(N - 0.001, i + sm((f - i) / 0.6) * 0.999); };
const VA = Math.atan2(V[1], V[0]);
// ---- la cesta en el estado e: costillas (0: tumbadas en cruz, 1: de pie), base tejida (0..1), vueltas tejidas, borde (0..1), asa (0..1) ----
function cesta(c, sc, e) {
  const rb = CE.rb * sc, rt = CE.rt * sc, H = CE.H * sc, n = CE.costillas, z0 = c[2];
  const rad = (z) => rb + (rt - rb) * (z / H);
  const pt = (a, z, dr = 0) => [c[0] + Math.cos(a) * (rad(z) + dr), c[1] + Math.sin(a) * (rad(z) + dr), z0 + z];
  const delante = (a) => Math.cos(a - VA) > 0;
  let o = '';
  const alturaTejida = Math.min(H, e.vueltas * H / CE.vueltas), filas = Math.floor(e.vueltas + 1e-6), hFila = H / CE.vueltas;
  // la costilla k: la parte de la base (del centro a rb) y la que sube; con e.costillas < 1 se van levantando
  const costilla = (k2) => { const a = k2 / n * Math.PI * 2 + 0.1, f = e.costillas, base = [c[0] + Math.cos(a) * rb, c[1] + Math.sin(a) * rb, z0 + 0.05];
    const fin = mix([c[0] + Math.cos(a) * (rb + H * 1.02), c[1] + Math.sin(a) * (rb + H * 1.02), z0 + 0.05], pt(a, H + 0.5 * sc), sm(f)); return { a, base, fin, med: mix(base, fin, 0.5) }; };
  const cs = Array.from({ length: n }, (_, k2) => costilla(k2));
  // la tira de una vuelta, entre dos costillas: por encima (ancha y clara) o por debajo (estrecha y oscura)
  const tramo = (j, k2, cara) => { const a0 = cs[k2].a, a1 = cs[(k2 + 1) % n].a + (k2 === n - 1 ? Math.PI * 2 : 0), z = j * hFila, encima = (j + k2) % 2 === 0, m = encima ? 0.04 : 0.12, pts0 = [], pts1 = [];
    for (let i = 0; i <= 4; i++) { const a = a0 + (a1 - a0) * i / 4; pts0.push(pt(a, z + hFila * m, encima ? 0.05 : -0.02)); pts1.push(pt(a, z + hFila * (1 - m), encima ? 0.05 : -0.02)); }
    return '<path class="tira ' + (cara === 'dentro' ? 'td' : encima ? 't1' : 't0') + '" d="' + poly(pts0.concat(pts1.reverse())) + '"/>'; };
  // 1 · la base tejida (anillos concéntricos), que se ve desde arriba
  if (e.base > 0.01) { const anillos = Math.round(e.base * 6); for (let i = anillos; i >= 1; i--) { const r = rb * i / 6, pts = Array.from({ length: 32 }, (_, q) => { const a = q / 32 * Math.PI * 2; return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, z0 + 0.04]; }); o += '<path class="base-anillo' + (i % 2 ? ' b1' : '') + '" d="' + poly(pts) + '"/>'; } }
  // 2 · las costillas y las vueltas de detrás (se ven por dentro)
  if (e.costillas >= 0.98 && filas > 0) for (let j = 0; j < filas; j++) for (let k2 = 0; k2 < n; k2++) { const am = (cs[k2].a + cs[(k2 + 1) % n].a + (k2 === n - 1 ? Math.PI * 2 : 0)) / 2; if (!delante(am)) o += tramo(j, k2, 'dentro'); }
  let cDetras = '', cDelante = '';
  for (const q of cs) { const d = linea([[c[0], c[1], z0 + 0.05], q.base, q.med, q.fin]); if (e.costillas < 0.98 || !delante(q.a)) cDetras += d; else cDelante += d; }
  o += '<path class="costilla" stroke-width="' + f2(0.32 * K * sc) + '" d="' + cDetras + '"/>';
  // 3 · lo de delante: costillas y vueltas por fuera
  if (cDelante) o += '<path class="costilla" stroke-width="' + f2(0.32 * K * sc) + '" d="' + cDelante + '"/>';
  if (e.costillas >= 0.98) for (let j = 0; j < filas; j++) for (let k2 = 0; k2 < n; k2++) { const am = (cs[k2].a + cs[(k2 + 1) % n].a + (k2 === n - 1 ? Math.PI * 2 : 0)) / 2; if (delante(am)) o += tramo(j, k2, 'fuera'); }
  // 4 · el borde: un aro grueso atado en espiral
  if (e.borde > 0.01) { const zb = H, r0 = rad(zb) - 0.35 * sc, r1 = rad(zb) + 0.4 * sc, ex = [], inn = [];
    for (let q = 0; q < 48; q++) { const a = q / 48 * Math.PI * 2; ex.push([c[0] + Math.cos(a) * r1, c[1] + Math.sin(a) * r1, z0 + zb + 0.15]); inn.push([c[0] + Math.cos(a) * r0, c[1] + Math.sin(a) * r0, z0 + zb + 0.15]); }
    const canto = []; for (let q = 0; q <= 24; q++) { const a = VA - Math.PI / 2 + q / 24 * Math.PI; canto.push([c[0] + Math.cos(a) * r1, c[1] + Math.sin(a) * r1, z0 + zb + 0.15]); }
    o += '<g style="opacity:' + f2(sm(e.borde * 2)) + '"><path class="borde-canto" d="' + poly(canto.concat(canto.map((p) => [p[0], p[1], p[2] - 0.55 * sc]).reverse())) + '"/><path class="borde" fill-rule="evenodd" d="' + poly(ex) + poly(inn) + '"/>';
    let at2 = ''; for (let q = 0; q < 30 * e.borde; q++) { const a = q / 30 * Math.PI * 2; at2 += linea([[c[0] + Math.cos(a) * r0, c[1] + Math.sin(a) * r0, z0 + zb + 0.15], [c[0] + Math.cos(a + 0.12) * r1, c[1] + Math.sin(a + 0.12) * r1, z0 + zb + 0.15]]); }
    o += '<path class="iso-line" data-tone="lo" d="' + at2 + '"/></g>'; }
  // 5 · las manzanas (en la cesta acabada que las lleva)
  if (e.manzanas) { const ms = []; for (let i = 0; i < 9; i++) { const a = i * 2.39, r = Math.sqrt(i / 9) * rt * 0.75; ms.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, z0 + H - 0.2 * sc + (i % 3) * 0.15]); }
    for (const m of ms.sort((A, B) => depthOf(A, P) - depthOf(B, P))) { const q = at(m); o += '<circle class="manzana" cx="' + f2(q[0]) + '" cy="' + f2(q[1]) + '" r="' + f2(0.95 * K * sc) + '"/><circle class="manzana-luz" cx="' + f2(q[0] - 0.3 * K * sc) + '" cy="' + f2(q[1] - 0.35 * K * sc) + '" r="' + f2(0.3 * K * sc) + '"/>'; } }
  // 6 · el asa: un arco de vara atado al borde por los dos lados
  if (e.asa > 0.01) { const a1 = VA + Math.PI / 2, a2 = VA - Math.PI / 2, rr = rad(H), pts = [];
    for (let q = 0; q <= 24; q++) { const t = q / 24, a = a1 + (a2 - a1 + 0) * 0, x = c[0] + Math.cos(a1) * rr * (1 - 2 * t), y = c[1] + Math.sin(a1) * rr * (1 - 2 * t), z = z0 + H + Math.sin(t * Math.PI) * 5.2 * sc * sm(e.asa); pts.push([x, y, z]); }
    o += '<path class="asa" stroke-width="' + f2(0.55 * K * sc) + '" d="' + linea(pts) + '"/><path class="asa-atado" d="' + linea(pts) + '"/>'; }
  return o;
}
function draw(dt) {
  reloj += dt;
  const paso = Math.min(N - 1, Math.floor(s));
  // el fuego y el agua del caldero; las varas que se cuecen
  const fuego = s > 0.9 && s < 2.4 ? sm((s - 0.9) / 0.25) * (1 - sm((s - 2.1) / 0.3)) : 0;
  let fu = ''; if (fuego > 0.02) for (let j = 0; j < 6; j++) { const a = j * 1.05 + 0.3, rr = j ? 1.6 : 0, q = at([CALDERO.x + Math.cos(a) * rr, CALDERO.y + Math.sin(a) * rr, 0.4]), h = (2.0 + 0.8 * Math.sin(reloj * 9 + j * 2.1)) * fuego * K * (j ? 0.8 : 1.2), w = (0.55 + 0.15 * (j % 2)) * K; fu += '<path class="llama" d="M' + f2(q[0] - w) + ' ' + f2(q[1]) + 'Q' + f2(q[0] - w) + ' ' + f2(q[1] - h * 0.55) + ' ' + f2(q[0]) + ' ' + f2(q[1] - h) + 'Q' + f2(q[0] + w) + ' ' + f2(q[1] - h * 0.55) + ' ' + f2(q[0] + w) + ' ' + f2(q[1]) + 'Z"/>'; }
  el.fuego.innerHTML = fu;
  const cuece = s > 0.85 && s < 2.5 ? sm((s - 0.85) / 0.2) * (1 - sm((s - 2.2) / 0.3)) : 0;
  let co = ''; if (cuece > 0.01) { for (let i = 0; i < 6; i++) { const a = -0.6 + i * 0.24, b0 = [CALDERO.x + Math.cos(a) * 0.9, CALDERO.y + Math.sin(a) * 0.9 - 0.4, 6.8], b1 = [CALDERO.x + Math.cos(a) * 3.6 + 1.2, CALDERO.y + Math.sin(a) * 3.0 - 0.8, 10.5 + i * 0.25]; co += linea([b0, mix(b0, b1, 0.5).map((v, k3) => k3 === 2 ? v + 0.6 : v), b1]); }
    el.cociendo.innerHTML = '<g style="opacity:' + f2(cuece) + '"><path class="vara-viva" stroke-width="' + f2(0.36 * K) + '" d="' + co + '"/></g>'; } else el.cociendo.innerHTML = '';
  let va = ''; if (fuego > 0.02) for (let k3 = 0; k3 < 6; k3++) { const f = (reloj * 0.3 + k3 / 6) % 1, q = at([CALDERO.x + Math.sin(reloj + k3) * 0.8 * f, CALDERO.y, 7.2 + f * 7]); va += '<ellipse class="vapor" cx="' + f2(q[0]) + '" cy="' + f2(q[1]) + '" rx="' + f2((0.9 + f * 1.6) * K) + '" ry="' + f2((0.6 + f * 1.1) * K) + '" style="opacity:' + f2(fuego * 0.5 * (1 - f)) + '"/>'; }
  el.vapor.innerHTML = va;
  // el banco de rajar: al pisar el pedal, el bastidor bascula y el cabezal pisa la tira; la cuchilla la alisa y salen virutas
  { const b = BANCO, raja = s > 2.0 && s < 2.95 ? 1 : 0, pisa = raja ? sm((s - 2.02) / 0.06) * (1 - sm((s - 2.88) / 0.06)) : 0, zt = b.z + 0.8, xr = b.x + 11.5, ym = b.y + b.d / 2;
    const zc = zt + 1.15 + 0.32 + (1 - pisa) * 1.5, yA = b.y - 0.55, yB = b.y + b.d + 0.55, xp = xr + 0.4 + pisa * 1.3;
    const montante = (y) => '<path class="iso-line montante" data-tone="mid" d="' + linea([[xp, y, 0.9], [xr - 0.1, y, zt], [xr - 0.3, y, zc + 0.45]]) + '"/><g class="iso-dots" data-tone="mid"><circle r=".45" cx="' + f2(at([xr - 0.1, y, zt])[0]) + '" cy="' + f2(at([xr - 0.1, y, zt])[1]) + '"/><circle r=".4" cx="' + f2(at([xr - 0.3, y, zc + 0.45])[0]) + '" cy="' + f2(at([xr - 0.3, y, zc + 0.45])[1]) + '"/></g>';
    el['rajando-atras'].innerHTML = montante(yA);
    let r = '';
    // la tira, apoyada en la rampa y saliendo hacia la cuchilla
    r += '<path class="tira-viva" stroke-width="' + f2(0.62 * K) + '" d="' + linea([[b.x + 6.5, ym, zt + 1.18], [b.x + 14.2, ym, zt + 1.18], [b.x + b.w + 1.6, ym, zt + 0.75]]) + '"/>';
    // el cabezal, el pedal y el montante de delante
    r += solidSvg(slabOf({ x: xr - 1.7, y: yA - 0.35, w: 3.0, d: yB - yA + 0.7, r: 0.2 }, zc, 0.9, P, 2, 0.15), { tone: 'mid', className: 'madera' });
    r += solidSvg(slabOf({ x: xp - 0.45, y: yA - 0.6, w: 0.9, d: yB - yA + 1.2, r: 0.15 }, 0.55, 0.6, P, 2, 0.1), { tone: 'mid', className: 'madera' });
    r += montante(yB);
    // la cuchilla de dos mangos, que va y viene por la tira
    const vaiv = raja ? 0.5 - 0.5 * Math.cos(reloj * 4) : 0, xc = b.x + 15 + vaiv * 5.5, zcu = zt + 1.05 - vaiv * 0.3 + (raja ? 0 : 0.6);
    const y0 = b.y - 0.9, y1 = b.y + b.d + 0.9, hoja = [[xc - 0.25, y0, zcu], [xc + 0.3, y0, zcu + 0.12], [xc + 0.3, y1, zcu + 0.12], [xc - 0.25, y1, zcu]];
    const m0 = [xc + 1.5, y0 - 1.4, zcu + 0.9], m1 = [xc + 1.5, y1 + 1.4, zcu + 0.9];
    r += '<path class="hoja" d="' + poly(hoja) + '"/><path class="iso-line mango" data-tone="mid" d="' + linea([[xc, y0, zcu + 0.06], m0]) + linea([[xc, y1, zcu + 0.06], m1]) + '"/><g class="iso-dots" data-tone="mid"><circle r=".6" cx="' + f2(at(m0)[0]) + '" cy="' + f2(at(m0)[1]) + '"/><circle r=".6" cx="' + f2(at(m1)[0]) + '" cy="' + f2(at(m1)[1]) + '"/></g>';
    if (raja) for (let i = 0; i < 6; i++) { const f = (reloj * 0.7 + i / 6) % 1, q = at([xc - 0.6 - i * 0.2, ym + Math.sin(i * 2.3) * 1.1, zcu + 0.2 - f * (zcu + 0.1)]); r += '<circle class="viruta" cx="' + f2(q[0]) + '" cy="' + f2(q[1]) + '" r="' + f2(0.32 * K) + '" style="opacity:' + f2(1 - f) + '"/>'; }
    el.rajando.innerHTML = r; }
  // la cesta de en medio
  const e = { costillas: sm((s - 3.15) / 0.6), base: sm((s - 3.0) / 0.4), vueltas: clamp((s - 4.05) / 0.85, 0, 1) * CE.vueltas, borde: sm((s - 5.05) / 0.4), asa: sm((s - 5.4) / 0.45), manzanas: false };
  el.cesta.innerHTML = s >= 3 ? cesta([CE.x, CE.y, 0.6], 1, e) : '';
  // lo que trabaja en cada paso
  ilumina([el.haz, el.tajo], paso === 0); ilumina([el.caldero, el.cociendo], paso === 1); ilumina([el.banco, el.rajando, el['rajando-atras']], paso === 2); ilumina([el.cesta, el.tabla], paso >= 3);
  const vueltas = Math.floor(e.vueltas + 1e-6);
  const extra = ['varas de castaño o avellano, en invierno', 'cocidas, la madera se ablanda', 'abiertas en tiras finas: las zumitzak', 'las costillas, en cruz, se doblan arriba', 'por encima y por debajo: ' + vueltas + ' vueltas', 'el borde y el asa, bien atados'][paso];
  const text = (paso + 1) + ' · ' + PASOS[paso] + ' · ' + extra;
  if (text !== txt) { readout.textContent = text; stage.setAttribute('aria-valuetext', text); txt = text; }
}
// las cestas acabadas: se dibujan una vez
el.acabadas.innerHTML = ACABADAS.slice().sort((A, B) => depthOf([A.x, A.y, 0], P) - depthOf([B.x, B.y, 0], P)).map((a) => cesta([a.x, a.y, 0], a.s, { costillas: 1, base: 1, vueltas: CE.vueltas, borde: 1, asa: 1, manzanas: a.manzanas })).join('');
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
window.__pasoCesta = (v) => { touring = false; target = s = v; draw(0); };
draw(0);
`;

const tonos = (pre, cls, [f, s0, s1, s2, s3, t]) => `${pre}.${cls}>.iso-fill{fill:${f}}${pre}.${cls}>.iso-top{fill:${t}}${pre}.${cls}[data-seamless]>.iso-top{stroke:${t}}` +
  [s0, s1, s2, s3].map((c, i) => `${pre}.${cls}>.iso-shade[data-shade="${i}"]{fill:${c}}${pre}.${cls}[data-seamless]>.iso-shade[data-shade="${i}"]{stroke:${c}}`).join('');
const COLOR = {
  dark: { madera: ['#4a3628', '#2a1d16', '#35261c', '#403022', '#4c3a2a', '#5a4632'], tronco: ['#5a4030', '#33241a', '#403024', '#4c3a2c', '#5a4636', '#8a6a4a'],
    vara: ['#6a5034', '#3e2c1c', '#4c3824', '#5a422a', '#684e32', '#a08060'], atadura: ['#8a7a56', '#544830', '#64563a', '#746444', '#84724e', '#9c8a64'],
    cobre: ['#8a4a2a', '#4e2614', '#5e301a', '#6e3a20', '#7e4426', '#a05a36'], piedra: ['#5a5266', '#2e2838', '#3a3346', '#463e54', '#524962', '#6a6078'] },
  light: { madera: ['#8a6a50', '#5e4636', '#6c523e', '#7a5e48', '#886a52', '#9a7c62'], tronco: ['#9a7656', '#6a4e38', '#7a5c42', '#8a6a4c', '#9a7856', '#d8b88e'],
    vara: ['#a88058', '#7a5838', '#8a6644', '#9a7450', '#aa825c', '#d8b48a'], atadura: ['#d0bc90', '#a08c64', '#b09c72', '#c0aa80', '#d0b88e', '#e4cea4'],
    cobre: ['#c87048', '#984a2c', '#a85834', '#b8643e', '#c87048', '#e08a5c'], piedra: ['#a49aae', '#766c82', '#857b91', '#948aa0', '#a399af', '#bcb2c6'] },
};
const colores = Object.entries(COLOR).map(([th, m]) => Object.entries(m).map(([cls, v]) => tonos(th === 'light' ? '.iso[data-theme="light"] ' : '', cls, v)).join('')).join('');
const CSS = COLORES + enJuego(WIDTH, HEIGHT) + `
.iso{--tira:#b8925c;--tira-o:#7a5c38;--tira-d:#5a4228;--costilla:#8a6a44;--base:#9c7a4c;--base2:#86663e;--borde:#a8845a;--borde-c:#6e5232;--asa:#8a6a44;--manzana:#c83a32;--manzana-luz:#f08a7a;--agua:#3a5cc8;--vapor:#cfc4d8;--llama:#ffb347;--llama2:#ff6a2a;--hoja:#8a8698;--viruta:#d8b888}
.iso[data-theme="light"]{--tira:#e0b878;--tira-o:#b08a5a;--tira-d:#9a7648;--costilla:#b08a5c;--base:#d4ae78;--base2:#c09a66;--borde:#dcb480;--borde-c:#a8845a;--asa:#b08a5c;--manzana:#d8443a;--manzana-luz:#ffa898;--agua:#7aa0e8;--vapor:#8a7aa8;--hoja:#a8a4b4;--viruta:#c09a66}
.tira{stroke-width:.2;stroke-linejoin:round}.t1{fill:var(--tira);stroke:var(--tira-o)}.t0{fill:var(--tira-o);stroke:var(--tira-o)}.td{fill:var(--tira-d);stroke:var(--tira-d)}
.costilla,.vara-viva,.tira-viva{fill:none;stroke:var(--costilla);stroke-linecap:round;stroke-linejoin:round}.tira-viva{stroke:var(--tira)}
.base-anillo{fill:var(--base);stroke:var(--tira-o);stroke-width:.25}.base-anillo.b1{fill:var(--base2)}
.borde{fill:var(--borde);stroke:var(--anatomy-lo);stroke-width:.3}.borde-canto{fill:var(--borde-c);stroke:var(--anatomy-lo);stroke-width:.3}
.asa{fill:none;stroke:var(--asa);stroke-linecap:round}.asa-atado{fill:none;stroke:var(--tira-d);stroke-width:.4;stroke-dasharray:.6 .8}
.manzana{fill:var(--manzana);stroke:var(--anatomy-lo);stroke-width:.3}.manzana-luz{fill:var(--manzana-luz)}
.agua{fill:var(--agua);stroke:var(--anatomy-lo);stroke-width:.3}.vapor{fill:var(--vapor)}.llama{fill:var(--llama);stroke:var(--llama2);stroke-width:.5;mix-blend-mode:screen}
.hoja{fill:var(--hoja);stroke:var(--anatomy-mid);stroke-width:.3}.viruta{fill:none;stroke:var(--viruta);stroke-width:.45}
.mango{stroke-width:1;stroke-linecap:round}.montante{fill:none;stroke-width:1.1;stroke-linecap:round;stroke-linejoin:round}.pata-hierro{stroke-width:.5;stroke-linecap:round}
[data-lit] .iso-edge,[data-lit].iso-line,[data-lit] .iso-line,[data-lit] .tb-edge,[data-lit] .borde,[data-lit] .borde-canto{stroke:var(--anatomy-lit)}
[data-lit] .iso-top,[data-lit].iso-top{fill:var(--anatomy-lit-top)}
[data-lit] .iso-dots circle{fill:var(--anatomy-lit)}
` + colores;

const body = k.plateHtml({
  fig: 'Lámina 18',
  title: 'Cómo se hace una cesta',
  hint: 'Pasa el ratón por cada pieza',
  readout: '1 · Cortar · varas de castaño o avellano, en invierno',
  keys: [
    { mark: 'lit', label: 'Lo que trabaja en cada paso: el haz y la podadera, el caldero, el banco de rajar y la cesta' },
    { mark: 'raised', label: 'Cocida, la madera se dobla sin romperse' },
    { mark: 'flat', label: 'Cada vuelta pasa por encima de una costilla y por debajo de la siguiente' },
  ],
  caption: 'En los caseríos hacían falta cestas para todo: manzanas, patatas, hierba o ropa. En invierno, cuando había menos trabajo en el campo, el cestero cortaba varas de castaño o de avellano y las cocía en un caldero para que la madera se ablandara. Después las abría en tiras finas y flexibles, las zumitzak, y las alisaba con la cuchilla en el banco de rajar, que sujeta la tira al pisar el pedal. Con unas costillas más gruesas armaba la base en cruz y las doblaba hacia arriba, y entre ellas iba tejiendo las tiras por encima y por debajo, vuelta a vuelta, apretando bien. Al final remataba el borde y le ponía el asa. Las xisteras de la pelota también se tejen a mano.',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Cómo se hace una cesta, paso a paso: las flechas pasan de un paso a otro" aria-valuemin="1" aria-valuemax="6">${svg}</div>`,
});

const html = k.pageHtml({ title: 'Cómo se hace una cesta', theme, body, script: kitScript() + live }).replace('</style>', CSS + '</style>');
escribe('cesta', html, theme);
