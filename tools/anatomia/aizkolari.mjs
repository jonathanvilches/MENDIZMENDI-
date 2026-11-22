// Lámina isométrica interactiva «Cómo se corta un tronco: el aizkolari» (skill Anatomy, 21 de noviembre de 2026; el autor:
// «explicaciones técnicas con Anatomy de oficios antiguos [...] todo esto quiero que poco a poco lo vayas aplicando y lo
// vayas metiendo en el juego y en las misiones»). Una apuesta de aizkolaris en la plaza de Leitza, en maqueta: el tronco de
// haya tumbado sobre sus calzos, con el aizkolari de pie encima; abre a hachazos una cuña en V por delante, se da media
// vuelta y corta por detrás hasta que el tronco se parte en dos. Al lado, los troncos que esperan, el serrín y las astillas,
// y la mesa del juez con el reloj, que corre mientras se corta. Al recorrerla, paso a paso, se ilumina lo que trabaja. Es la
// que se abre al acabar el taller del aizkolari (data/oficios.js) y en el material didáctico.
// Uso: node tools/anatomia/aizkolari.mjs [--light]  →  entrega/anatomia/aizkolari(-light).html (y public/anatomia, para el juego)
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';
import * as G from '../../.claude/skills/anatomy/kit/lathe.mjs';
import { kitScript } from '../../.claude/skills/anatomy/scripts/inline-kit.mjs';
import { COLORES, enJuego, MARCA_JUEGO, escribe, PUENTE } from './comun.mjs';

const theme = process.argv.includes('--light') ? 'light' : 'dark';
const WIDTH = 600, HEIGHT = 300;

// ---------- el modelo (unidades de la maqueta; x a lo ancho, y hacia delante, z arriba) ----------
// el tronco: 30 de largo y 4,2 de radio, tumbado a lo largo de x sobre dos calzos; la V de cada lado llega hasta el eje
const TRONCO = { x0: -30, x1: 0, yc: -28, r: 4.2, zc: 2.6 + 4.2 };
const XC = (TRONCO.x0 + TRONCO.x1) / 2;                                    // donde se corta, en medio
const ESPERAN = [[-34, -49], [-4, -49]];                                     // los troncos que esperan, detrás (x del centro, y)
const MESA = { x: 10, y: -33, w: 16, d: 10, z: 6 };
const RELOJ = { x: 18, y: -28, r: 3.6 };
const PASOS = ['El tronco', 'Primer lado', 'Media vuelta', 'Segundo lado', 'Partido'];
const PUESTOS = [[XC - 10, TRONCO.yc, TRONCO.zc], [XC, TRONCO.yc + TRONCO.r, TRONCO.zc + 2], [XC, TRONCO.yc, TRONCO.zc + 20], [XC, TRONCO.yc - TRONCO.r, TRONCO.zc + 4], [RELOJ.x, RELOJ.y, MESA.z + 2]];

// ---------- la cámara ----------
const PLATE = { x: -54, y: -60, w: 92, d: 52, r: 8 };
const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [XC, TRONCO.yc, TRONCO.zc + TRONCO.r + 29]], WIDTH, HEIGHT, { pad: 8, azimuth: 62, elevation: 30 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const dep = (p) => k.depthOf(p, P);
const linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(2)).join(' ')).join('L');
const poly = (pts) => linea(pts) + 'Z';
const porDepth = (lista, f) => [...lista].sort((a, b) => dep(f(a)) - dep(f(b)));
const R2x = (i) => (0.5 + i * 0.7548776662) % 1, R2y = (i) => (0.5 + i * 0.5698402910) % 1;
const FX = (x, y, z) => G.frameAlong([x, y, z], [1, 0, 0]);
const caja = (x0, x1, y0, y1, z0, h, cls, bevel = 0.2, r = 0.2) => S(k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z0, h, P, 2, bevel), { tone: 'mid', className: cls });
const tronco = (x0, x1, y, zc, r, cls = 'corteza') => S(G.solidOf([[0, r], [x1 - x0, r]], FX(x0, y, zc), P), { tone: 'mid', className: cls });
const anillos = (x, y, zc, r) => { const F = FX(x, y, zc); return L(G.circleOf(F, 0, r * 0.62, P) + G.circleOf(F, 0, r * 0.3, P), { tone: 'lo' }) + D([at([x, y, zc])], { size: 0.3, tone: 'lo' }); };

// ---------- el tablero: la plaza con su suelo de losas, el serrín y las astillas ----------
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
  // las losas de la plaza
  let lo = ''; for (let x = PLATE.x + 10; x < PLATE.x + PLATE.w - 6; x += 8) lo += linea([[x, PLATE.y + 6, 0], [x, PLATE.y + PLATE.d - 6, 0]]);
  for (let y = PLATE.y + 12; y < PLATE.y + PLATE.d - 6; y += 8) lo += linea([[PLATE.x + 6, y, 0], [PLATE.x + PLATE.w - 6, y, 0]]);
  out.push(`<path class="losa" d="${lo}"/>`);
  // el serrín alrededor del tronco
  let se = ''; for (let i = 0; i < 90; i++) { const a = i * 2.39996, r = 3 + Math.sqrt(R2x(i)) * 13, x = XC + Math.cos(a) * r * 1.4, y = TRONCO.yc + Math.sin(a) * r * 0.8, q = at([x, y, 0]); se += `<circle class="serrin" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${(0.25 + R2y(i) * 0.4).toFixed(2)}"/>`; }
  out.push(se);
  // la regla y la placa
  const regla = { x: -44, y: -14, w: 26, d: 5, r: 1 };
  out.push(S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo' }));
  const t = k.topTicks(regla.x + 3, regla.x + regla.w - 3, 2, 5, regla.y + 0.05, 0.6, [1.8, regla.d - 0.1], P);
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
  out.push(D([at([regla.x + 1.5, regla.y + 2.5, 0.6]), at([regla.x + regla.w - 1.5, regla.y + 2.5, 0.6])], { size: 0.45 }));
  const pl = { x: -2, y: -14, w: 34, d: 5.6, r: 1.2 };
  out.push(S(k.slabOf(pl, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(pl, 1.1), 0.8, P, 4), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([pl.x + 4.6, pl.y + 3.5], 0.8, P, 'x'), 'AIZKOLARIAK · LEITZA', { size: 2.3, tone: 'mid' }));
  out.push(D([at([pl.x + 2.2, pl.y + 2.8, 0.8]), at([pl.x + pl.w - 2.2, pl.y + 2.8, 0.8])], { size: 0.4 }));
  return out.join('');
}

// ---------- los troncos que esperan, cada uno en sus calzos ----------
function calzos(x0, x1, y, r) {
  let o = ''; for (const x of [x0 + 3, x1 - 3]) o += caja(x - 1.4, x + 1.4, y - r * 0.9, y + r * 0.9, 0, 2.6, 'madera', 0.2, 0.3);
  return o;
}
function esperan() {
  const out = [];
  for (const [x, y] of porDepth(ESPERAN, ([q, w]) => [q, w, 0])) {
    const r = 3.6, x0 = x - 12, x1 = x + 12;
    out.push(calzos(x0, x1, y, r), tronco(x0, x1, y, 2.6 + r, r), anillos(x1, y, 2.6 + r, r));
  }
  return `<g data-part="esperan">${out.join('')}</g>`;
}

// ---------- la mesa del juez con el reloj (la aguja, viva) y el marcador ----------
function mesa() {
  const m = MESA, out = [];
  for (const [x, y] of porDepth([[m.x + 1.2, m.y + 1.2], [m.x + m.w - 1.2, m.y + 1.2], [m.x + 1.2, m.y + m.d - 1.2], [m.x + m.w - 1.2, m.y + m.d - 1.2]], ([q, w]) => [q, w, 0])) out.push(S(k.cylinder(x, y, 0.45, 0, m.z, P, 10), { tone: 'mid', className: 'madera' }));
  out.push(caja(m.x, m.x + m.w, m.y, m.y + m.d, m.z, 0.8, 'madera', 0.2));
  // el reloj: caja, esfera con las marcas de los segundos y el botón
  const r = RELOJ, z = m.z + 0.8;
  out.push(S(k.cylinder(r.x, r.y, r.r + 0.5, z, 1.0, P, 40), { tone: 'mid', className: 'laton' }));
  out.push(`<path class="esfera" d="${poly(Array.from({ length: 48 }, (_, i) => { const a = i / 48 * Math.PI * 2; return [r.x + Math.cos(a) * r.r, r.y + Math.sin(a) * r.r, z + 1.02]; }))}"/>`);
  let ti = '', tM = ''; for (let i = 0; i < 60; i++) { const a = -Math.PI / 2 + i / 60 * Math.PI * 2, r0 = i % 5 ? r.r * 0.86 : r.r * 0.74; (i % 5 ? (ti += '') : 0); const seg = linea([[r.x + Math.cos(a) * r0, r.y + Math.sin(a) * r0, z + 1.03], [r.x + Math.cos(a) * r.r * 0.94, r.y + Math.sin(a) * r.r * 0.94, z + 1.03]]); if (i % 5) ti += seg; else tM += seg; }
  out.push(L(ti, { tone: 'lo' }), L(tM, { tone: 'mid' }));
  out.push(S(k.cylinder(r.x, r.y - r.r - 0.9, 0.5, z + 0.3, 1.2, P, 12), { tone: 'mid', className: 'laton' }));
  out.push(`<g data-part="aguja"></g>`);
  // el marcador de troncos: tres casillas
  const b = { x: m.x + 1.5, y: m.y + 1, w: 6, d: 4 };
  out.push(caja(b.x, b.x + b.w, b.y, b.y + b.d, z, 0.5, 'pizarra', 0.1));
  return `<g data-part="mesa">${out.join('')}</g><g data-part="marcas"></g>`;
}

// ---------- el tronco que se corta: sus calzos y su sitio (el tronco y el aizkolari, vivos) ----------
function base() {
  const t = TRONCO;
  return `<g data-part="calzos">${calzos(t.x0, t.x1, t.yc, t.r)}</g>`;
}

// ---------- la figura ----------
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'Maqueta de una apuesta de aizkolaris en la plaza de Leitza: el tronco de haya tumbado sobre sus calzos con el aizkolari de pie encima, que abre a hachazos una cuña en V por delante, se da media vuelta y corta por detrás hasta partirlo; los troncos que esperan, el serrín y las astillas, y la mesa del juez con el reloj y el marcador.',
  body: [tablero(), esperan(), base(), '<g data-part="atras"></g>', '<g data-part="tronco"></g>', '<g data-part="aizkolari"></g>', '<g data-part="astillas"></g>', mesa()],
});

// ---------- lo que se mueve en la página ----------
const live = MARCA_JUEGO + `
const P = ${JSON.stringify(P)}, T = ${JSON.stringify(TRONCO)}, XC = ${XC}, RELOJ = ${JSON.stringify(RELOJ)}, MESA = ${JSON.stringify(MESA)}, PUESTOS = ${JSON.stringify(PUESTOS)};
const PASOS = ${JSON.stringify(PASOS)}, N = PASOS.length;
const at = (p) => iso(p, P), f2 = (v) => v.toFixed(2), linea = (pts) => 'M' + pts.map((p) => { const q = at(p); return f2(q[0]) + ' ' + f2(q[1]); }).join('L'), poly = (pts) => linea(pts) + 'Z';
const K = Math.hypot(at([0, 0, 1])[0] - at([0, 0, 0])[0], at([0, 0, 1])[1] - at([0, 0, 0])[1]);
const stage = document.querySelector('.iso-stage'), svgEl = stage.querySelector('svg'), $ = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const el = {}; for (const n of ['esperan', 'calzos', 'atras', 'tronco', 'aizkolari', 'astillas', 'mesa', 'aguja', 'marcas']) el[n] = $(n);
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }, mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const ilumina = (lista, on) => { for (const n of [].concat(lista)) if (n && on !== n.hasAttribute('data-lit')) n.toggleAttribute('data-lit', on); };
const caja = (x0, x1, y0, y1, z0, h, cls, bevel, r) => solidSvg(slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: r || 0.2 }, z0, h, P, 2, bevel || 0.2), { tone: 'mid', className: cls });
const cil = (x, y, r, z0, h, cls) => solidSvg(cylinder(x, y, r, z0, h, P, 12), { tone: 'mid', className: cls });
let s = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, txt = '', reloj = 0;
const tourAt = (t) => { const T2 = 3.2 * N + 2, f = (t % T2) / T2 * (N + 0.71); const i = Math.floor(f); return Math.min(N - 0.001, i + sm((f - i) / 0.6) * 0.999); };
// ---- el tronco visto de lado: un cilindro a lo largo de x, dibujado como cinta con sus dos tapas ----
const VA = Math.atan2(depthOf([0, 1, 0], P) - depthOf([0, 0, 0], P), depthOf([0, 0, 1], P) - depthOf([0, 0, 0], P));
function cinta(x0, x1, y, zc, r, cls, tapa) {
  // el contorno de un cilindro horizontal: la línea de arriba y la de abajo según la vista, y las tapas elípticas
  const n = 24, sil = (x) => { const pts = []; for (let i = 0; i <= n; i++) { const a = VA - Math.PI / 2 + i / n * Math.PI; pts.push([x, y + Math.sin(a) * r, zc + Math.cos(a) * r]); } return pts; };
  const a = sil(x0), b = sil(x1);
  let o = '<path class="' + cls + '" d="' + poly(a.concat(b.slice().reverse())) + '"/>';
  // las vetas de la corteza a lo largo
  let v = ''; for (let i = 2; i < n; i += 4) v += linea([[x0 + 0.4, a[i][1], a[i][2]], [x1 - 0.4, b[i][1], b[i][2]]]);
  o += '<path class="veta" d="' + v + '"/>';
  if (tapa) { const c = []; for (let i = 0; i < 40; i++) { const t = i / 40 * Math.PI * 2; c.push([tapa, y + Math.sin(t) * r, zc + Math.cos(t) * r]); } o += '<path class="tapa" d="' + poly(c) + '"/>'; }
  return o;
}
// ---- la V: por delante (lado 1) llega desde la corteza hasta y = muro1; por detrás (lado 2), igual hacia el otro lado ----
function cunaDelante(p) {
  const r = T.r, yc = T.yc, zc = T.zc, yW = yc + r * (1 - p), n = 10, izq = [], der = [], muro = [];
  for (let i = 0; i <= n; i++) { const t = i / n, z = zc + r - t * 2 * r, hw = r * (1 - t), yF = yc + Math.sqrt(Math.max(0, r * r - (z - zc) ** 2)), yw = Math.min(yF, yW);
    izq.push([[XC - hw, yF, z], [XC - hw, yw, z]]); der.push([[XC + hw, yF, z], [XC + hw, yw, z]]); muro.push([XC - hw, yw, z]); }
  // la cara del corte que mira hacia nosotros (la izquierda de la V) y el fondo, de madera clara
  const caraI = izq.map((q) => q[0]).concat(izq.map((q) => q[1]).reverse());
  const fondo = muro.concat(der.map((q) => q[1]).reverse());
  return '<path class="corte-sombra" d="' + poly(caraI) + '"/><path class="corte" d="' + poly(fondo) + '"/><path class="borde-v" d="' + linea(izq.map((q) => q[0])) + linea(der.map((q) => q[0])) + '"/>';
}
// ---- el aizkolari: de pie encima del tronco, con los pies abiertos; mira hacia delante o hacia atrás y golpea ----
function aizkolari(gira, golpe, lado) {
  const r = T.r, zp = T.zc + r, ca = Math.cos(gira * Math.PI), dir = ca >= 0 ? 1 : -1;
  const pie = (sx) => [XC + sx * 3.4, T.yc, zp];
  const cad = [XC, T.yc - 0.3 * ca, zp + 8.6], hom = [XC, T.yc - 0.2 * ca, zp + 14.6], cab = [XC, T.yc - 0.1 * ca, zp + 17.4];
  let o = '';
  // las piernas abiertas
  for (const sx of [-1, 1]) { const p = pie(sx), rod = [XC + sx * 2.4, T.yc + 0.7 * ca, zp + 4.4]; o += '<path class="pierna" stroke-width="' + f2(1.7 * K) + '" d="' + linea([p, rod, [XC + sx * 0.8, cad[1], cad[2]]]) + '"/>'; }
  // las alpargatas, la faja y el cuerpo
  for (const sx of [-1, 1]) { const p = pie(sx), q = at(p); o += '<ellipse class="pie" cx="' + f2(q[0]) + '" cy="' + f2(q[1]) + '" rx="' + f2(0.9 * K) + '" ry="' + f2(0.45 * K) + '"/>'; }
  o += '<path class="cuerpo" stroke-width="' + f2(3.6 * K) + '" d="' + linea([cad, hom]) + '"/><path class="faja" stroke-width="' + f2(3.7 * K) + '" d="' + linea([[cad[0], cad[1], cad[2] + 0.2], [cad[0], cad[1], cad[2] + 1.8]]) + '"/>';
  // los brazos y el hacha: de arriba (detrás de la cabeza) al golpe (en la V, del lado que toca)
  const yCorte = T.yc + dir * (r * 0.8), alto = [XC + lado * 0.8, T.yc - dir * 2.2, zp + 23], bajo = [XC + lado * 1.2, yCorte, T.zc + 1.2];
  const filo = mix(alto, bajo, golpe), manos = mix([XC, T.yc - dir * 0.8, zp + 17], [XC, T.yc + dir * 2.4, zp + 7.6], golpe);
  o += '<path class="brazo" stroke-width="' + f2(1.2 * K) + '" d="' + linea([[hom[0] - 0.9, hom[1], hom[2]], manos]) + linea([[hom[0] + 0.9, hom[1], hom[2]], manos]) + '"/>';
  o += '<path class="mango" stroke-width="' + f2(0.45 * K) + '" d="' + linea([manos, filo]) + '"/>';
  const qf = at(filo), qm = at(manos), ang = Math.atan2(qf[1] - qm[1], qf[0] - qm[0]), ux = Math.cos(ang), uy = Math.sin(ang), hx = -uy, hy = ux, w = 1.3 * K;
  o += '<path class="hacha" d="M' + f2(qf[0] - ux * 0.5 * K + hx * w) + ' ' + f2(qf[1] - uy * 0.5 * K + hy * w) + 'L' + f2(qf[0] + ux * 0.6 * K + hx * w * 1.2) + ' ' + f2(qf[1] + uy * 0.6 * K + hy * w * 1.2) + 'L' + f2(qf[0] + ux * 0.6 * K - hx * w * 1.2) + ' ' + f2(qf[1] + uy * 0.6 * K - hy * w * 1.2) + 'L' + f2(qf[0] - ux * 0.5 * K - hx * w) + ' ' + f2(qf[1] - uy * 0.5 * K - hy * w) + 'Z"/>';
  // la cabeza con la txapela
  const qc = at(cab); o += '<circle class="cara" cx="' + f2(qc[0]) + '" cy="' + f2(qc[1]) + '" r="' + f2(1.3 * K) + '"/><ellipse class="txapela" cx="' + f2(qc[0]) + '" cy="' + f2(qc[1] - 1.0 * K) + '" rx="' + f2(1.7 * K) + '" ry="' + f2(0.6 * K) + '"/>';
  return o;
}
const golpe = (f) => { f = f % 1; return f < 0.72 ? sm(f / 0.72) : 1 - sm((f - 0.72) / 0.28); };
function draw(dt) {
  reloj += dt;
  const paso = Math.min(N - 1, Math.floor(s));
  const p1 = clamp((s - 1.05) / 0.85, 0, 1), p2 = clamp((s - 3.05) / 0.85, 0, 1), parte = sm((s - 4.02) / 0.4), gira = sm((s - 2.1) / 0.75);
  const corta = (s > 1 && s < 1.95) || (s > 3 && s < 3.95), g = corta ? golpe(reloj * 1.7) : 0.05, lado = Math.floor(reloj * 1.7) % 2 ? 1 : -1;
  // el tronco: la mitad izquierda, la de en medio con la V, la derecha; al partirse, las dos mitades se apartan y caen
  const r = T.r, yc = T.yc, zc = T.zc, sep = parte * 1.2, baja = parte * 0.4, rot = parte;
  let o = '';
  if (parte < 0.02) {
    o += cinta(T.x0, XC - r, yc, zc, r, 'corteza', 0) + cinta(XC - r, XC + r, yc, zc, r, 'corteza', 0);
    if (p1 > 0) o += cunaDelante(p1);
    if (p2 > 0.6) { const q = at([XC, yc, zc - r]), q2 = at([XC, yc, zc - r + (p2 - 0.6) * 2.5 * r]); o += '<path class="grieta" d="M' + f2(q[0]) + ' ' + f2(q[1]) + 'L' + f2(q2[0]) + ' ' + f2(q2[1]) + '"/>'; }
    o += cinta(XC + r, T.x1, yc, zc, r, 'corteza', T.x1);
  } else {
    // las dos mitades, con su cara cortada en punta
    o += cinta(T.x0 - sep, XC - sep - r * 0.2, yc, zc - baja, r, 'corteza', 0);
    const punta = (sx) => { const x0 = XC - sx * (sep + r * 0.2), xp = XC - sx * sep; return '<path class="corte" d="' + poly([[x0, yc, zc - baja + r], [xp, yc, zc - baja], [x0, yc, zc - baja - r]]) + '"/>'; };
    o += punta(1) + punta(-1);
    o += cinta(XC + sep + r * 0.2, T.x1 + sep, yc, zc - baja, r, 'corteza', T.x1 + sep);
  }
  el.tronco.innerHTML = o;
  // el aizkolari: corta por delante, se da media vuelta, corta por detrás; al partirse, levanta el hacha
  el.aizkolari.innerHTML = parte < 0.5 ? aizkolari(gira, g, lado) : aizkolari(1, 0, 1);
  el.aizkolari.style.opacity = f2(1 - sm((s - 4.3) / 0.3) * 0.0);
  // las astillas que saltan con cada hachazo
  let as = ''; if (corta && g > 0.9) { const dir = s < 2 ? 1 : -1; for (let i = 0; i < 7; i++) { const f = (reloj * 2.2 + i / 7) % 1, a = i * 2.4, q = at([XC + Math.cos(a) * f * 4, yc + dir * (r + f * 4), zc + 1 + f * 4 - f * f * 7]); as += '<path class="astilla" d="M' + f2(q[0] - 0.6 * K) + ' ' + f2(q[1]) + 'l' + f2(1.2 * K) + ' ' + f2(-0.35 * K) + '" style="opacity:' + f2(1 - f) + '"/>'; } }
  el.astillas.innerHTML = as;
  // el reloj: la aguja corre mientras se corta (los dos lados y la media vuelta) y se para al partirse
  { const t = clamp((s - 1) / 3.02, 0, 1), a = -Math.PI / 2 + t * Math.PI * 2 * 0.92, z = MESA.z + 0.8 + 1.06;
    el.aguja.innerHTML = '<path class="aguja" d="' + linea([[RELOJ.x, RELOJ.y, z], [RELOJ.x + Math.cos(a) * RELOJ.r * 0.84, RELOJ.y + Math.sin(a) * RELOJ.r * 0.84, z]]) + '"/><g class="iso-dots" data-tone="hi"><circle r=".6" cx="' + f2(at([RELOJ.x, RELOJ.y, z])[0]) + '" cy="' + f2(at([RELOJ.x, RELOJ.y, z])[1]) + '"/></g>'; }
  // el marcador: una raya por tronco partido
  { const b = { x: MESA.x + 1.5, y: MESA.y + 1, z: MESA.z + 0.8 + 0.52 }; let m = ''; if (parte > 0.5) m += linea([[b.x + 1.2, b.y + 0.8, b.z], [b.x + 1.2, b.y + 3.2, b.z]]); el.marcas.innerHTML = '<path class="tiza" d="' + m + '"/>'; }
  ilumina([el.tronco, el.calzos], paso === 0 || paso === 4); ilumina([el.aizkolari], paso >= 1 && paso <= 3); ilumina([el.mesa], paso === 4);
  const extra = ['un tronco de haya, tumbado sobre sus calzos', 'hachazos en V, a un lado y a otro, hasta el centro', 'media vuelta encima del tronco, sin bajarse', 'la otra V, por detrás, hasta encontrar la primera', 'el tronco se parte en dos: el juez para el reloj'][paso];
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
window.__pasoAizkolari = (v) => { touring = false; target = s = v; draw(0); };
draw(0);
${PUENTE}`;

const tonos = (pre, cls, [f, s0, s1, s2, s3, t]) => `${pre}.${cls}>.iso-fill{fill:${f}}${pre}.${cls}>.iso-top{fill:${t}}${pre}.${cls}[data-seamless]>.iso-top{stroke:${t}}` +
  [s0, s1, s2, s3].map((c, i) => `${pre}.${cls}>.iso-shade[data-shade="${i}"]{fill:${c}}${pre}.${cls}[data-seamless]>.iso-shade[data-shade="${i}"]{stroke:${c}}`).join('');
const COLOR = {
  dark: { corteza: ['#5a5662', '#302e36', '#3a3842', '#46424e', '#524e5a', '#66626e'], madera: ['#4a3628', '#2a1d16', '#35261c', '#403022', '#4c3a2a', '#5a4632'],
    laton: ['#8a6a2a', '#4e3a14', '#5e461a', '#6e5220', '#7e5e26', '#b08a3a'], pizarra: ['#1e2a26', '#101814', '#141e1a', '#18241f', '#1c2824', '#26342e'] },
  light: { corteza: ['#b8b2c0', '#8a8494', '#9892a2', '#a6a0b0', '#b4aebe', '#c4bece'], madera: ['#8a6a50', '#5e4636', '#6c523e', '#7a5e48', '#886a52', '#9a7c62'],
    laton: ['#d8aa50', '#a87c2a', '#b88a36', '#c89842', '#d8a64e', '#f0c870'], pizarra: ['#3a4a44', '#26322e', '#2c3a34', '#32423c', '#384842', '#4a5c54'] },
};
const colores = Object.entries(COLOR).map(([th, m]) => Object.entries(m).map(([cls, v]) => tonos(th === 'light' ? '.iso[data-theme="light"] ' : '', cls, v)).join('')).join('');
const CSS = COLORES + enJuego(WIDTH, HEIGHT) + `
.iso{--losa:#2a1d44;--serrin:#c8a878;--corteza:#4e4a58;--corteza-o:#2e2a36;--veta:#3a3644;--tapa:#c8a070;--corte:#e0bc84;--corte-s:#a8844e;--grieta:#0d0718;--esfera:#ecdcff;--aguja:#ff7ac8;--tiza:#ecdcff;--piel:#e0b090;--camisa:#ecdcff;--faja:#d6338f;--pantalon:#2e2e56;--txapela:#14102a;--hacha:#a8a4b8;--mango:#c8a070;--astilla:#e0bc84}
.iso[data-theme="light"]{--losa:#e2dcee;--serrin:#c09a66;--corteza:#a8a2b2;--corteza-o:#7a7484;--veta:#8a8494;--tapa:#d8b080;--corte:#f0cc94;--corte-s:#c09a66;--grieta:#4a3a48;--esfera:#ffffff;--aguja:#d6338f;--tiza:#2a1d42;--piel:#c89070;--camisa:#ffffff;--faja:#d6338f;--pantalon:#46468a;--txapela:#1a1430;--hacha:#6e6c7c;--mango:#a88058;--astilla:#c09a66}
.losa{fill:none;stroke:var(--losa);stroke-width:.35}.serrin{fill:var(--serrin);opacity:.7}
.corteza{fill:var(--corteza);stroke:var(--corteza-o);stroke-width:.35;stroke-linejoin:round}.veta{fill:none;stroke:var(--veta);stroke-width:.3}.tapa{fill:var(--tapa);stroke:var(--corteza-o);stroke-width:.35}
.corte{fill:var(--corte);stroke:var(--corte-s);stroke-width:.3;stroke-linejoin:round}.corte-sombra{fill:var(--corte-s);stroke:var(--corte-s);stroke-width:.3;stroke-linejoin:round}.borde-v{fill:none;stroke:var(--corteza-o);stroke-width:.4}
.grieta{fill:none;stroke:var(--grieta);stroke-width:.8;stroke-linecap:round}
.esfera{fill:var(--esfera);stroke:var(--anatomy-lo);stroke-width:.3}.aguja{fill:none;stroke:var(--aguja);stroke-width:.7;stroke-linecap:round}.tiza{fill:none;stroke:var(--tiza);stroke-width:.6;stroke-linecap:round}
.pierna{fill:none;stroke:var(--pantalon);stroke-linecap:round;stroke-linejoin:round}.pie{fill:var(--camisa);stroke:var(--anatomy-lo);stroke-width:.3}
.cuerpo{fill:none;stroke:var(--camisa);stroke-linecap:round}.faja{fill:none;stroke:var(--faja)}.brazo{fill:none;stroke:var(--piel);stroke-linecap:round;stroke-linejoin:round}
.mango{fill:none;stroke:var(--mango);stroke-linecap:round}.hacha{fill:var(--hacha);stroke:var(--anatomy-lo);stroke-width:.3;stroke-linejoin:round}
.cara{fill:var(--piel);stroke:var(--anatomy-lo);stroke-width:.3}.txapela{fill:var(--txapela)}.astilla{fill:none;stroke:var(--astilla);stroke-width:.7;stroke-linecap:round}
[data-lit] .iso-edge,[data-lit].iso-line,[data-lit] .iso-line,[data-lit] .corteza,[data-lit] .borde-v{stroke:var(--anatomy-lit)}
[data-lit] .iso-top,[data-lit].iso-top{fill:var(--anatomy-lit-top)}
[data-lit] .iso-dots circle{fill:var(--anatomy-lit)}
[data-part="aizkolari"][data-lit] .hacha,[data-part="aizkolari"][data-lit] .pie{stroke:var(--anatomy-lit);stroke-width:.6}
` + colores;

const body = k.plateHtml({
  fig: 'Lámina 21',
  title: 'Cómo se corta un tronco: el aizkolari',
  hint: 'Pasa el ratón por cada pieza',
  readout: '1 · El tronco · un tronco de haya, tumbado sobre sus calzos',
  keys: [
    { mark: 'lit', label: 'Lo que trabaja en cada paso: el tronco, el aizkolari y el reloj del juez' },
    { mark: 'raised', label: 'Dos cortes en V que se encuentran en el centro' },
    { mark: 'flat', label: 'El aizkolari corta subido al tronco, con los pies abiertos' },
  ],
  caption: 'En los montes de Navarra hay grandes hayedos, y cortar madera fue durante siglos un trabajo de cada día. De ahí nació el deporte de los aizkolaris, que en pueblos como Leitza tiene mucha afición. El aizkolari se sube encima del tronco, tumbado sobre unos calzos, y con los pies bien abiertos va dando hachazos a un lado y a otro, abriendo una cuña en forma de V que llega hasta el centro del tronco. Después se da media vuelta, sin bajarse, y abre la otra V por detrás hasta que se encuentra con la primera y el tronco se parte en dos. En las apuestas, el juez mide el tiempo con el reloj: gana quien corta antes sus troncos. Hace falta fuerza, pero sobre todo precisión: cada hachazo tiene que caer justo donde toca.',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Cómo se corta un tronco, paso a paso: las flechas pasan de un paso a otro" aria-valuemin="1" aria-valuemax="5">${svg}</div>`,
});

const html = k.pageHtml({ title: 'Cómo se corta un tronco: el aizkolari', theme, body, script: kitScript() + live }).replace('</style>', CSS + '</style>');
escribe('aizkolari', html, theme);
