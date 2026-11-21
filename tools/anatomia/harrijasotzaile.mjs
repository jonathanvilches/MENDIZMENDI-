// Lámina isométrica interactiva «Cómo se levanta una piedra: el harrijasotzaile» (skill Anatomy, 21 de noviembre de 2026;
// el autor: «explicaciones técnicas con Anatomy de oficios antiguos [...] todo esto quiero que poco a poco lo vayas
// aplicando y lo vayas metiendo en el juego y en las misiones»). Una exhibición de levantamiento de piedra en la plaza, en
// maqueta: a la izquierda, la romana colgada de su trípode, donde se pesa la piedra (el pilón corre por la barra hasta que
// queda recta y marca los kilos); en medio, el levantador con su faja sobre el saco, que sube la piedra cúbica del suelo a
// las rodillas, de ahí al pecho y al hombro, y la deja caer; a la derecha, las otras piedras (el cilindro, la bola y la
// rectangular) y la mesa del juez con el reloj y la cuenta de alzadas. Los kilos de la romana salen del mismo modelo que
// mueve la barra: la piedra por su brazo corto equilibra al pilón por el largo. Al recorrerla, paso a paso, se ilumina lo
// que trabaja. Es la que se abre al acabar el taller del levantador de piedras (data/oficios.js) y en el material didáctico.
// Uso: node tools/anatomia/harrijasotzaile.mjs [--light]  →  entrega/anatomia/harrijasotzaile(-light).html (y public/anatomia)
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';
import * as G from '../../.claude/skills/anatomy/kit/lathe.mjs';
import { kitScript } from '../../.claude/skills/anatomy/scripts/inline-kit.mjs';
import { COLORES, enJuego, MARCA_JUEGO, escribe } from './comun.mjs';

const theme = process.argv.includes('--light') ? 'light' : 'dark';
const WIDTH = 600, HEIGHT = 300;

// ---------- el modelo (unidades de la maqueta: una persona mide 20; una unidad, unos 9 cm) ----------
// la piedra cúbica: 100 kg de granito (2,7 t/m³) son 33 cm de lado: 3,7 unidades
const PIEDRA = { kg: 100, lado: 3.7 };
// la romana: el brazo corto (a) lleva la piedra y el largo lleva el pilón de 10 kg; en equilibrio, kg · a = pilón · b
const ROMANA = { x: -33, y: -37, apice: 31, fulcro: 26.5, a: 2, largo: 25, pilon: 10, paso: 10 };
const B_EQ = PIEDRA.kg * ROMANA.a / ROMANA.pilon;                  // dónde se para el pilón: 20 unidades del fulcro
const SACO = { x: -2, y: -29, w: 16, d: 11 };
const LEV = { x: 6, y: -36 };                                       // dónde está el levantador (mira hacia delante, +y)
const OTRAS = [{ tipo: 'cilindro', x: 25, y: -47 }, { tipo: 'bola', x: 33, y: -40 }, { tipo: 'laukia', x: 17, y: -44 }];
const MESA = { x: 21, y: -28, w: 15, d: 9, z: 6 };
const PASOS = ['Pesar', 'A las rodillas', 'Al pecho', 'Al hombro', 'Al saco'];
const PUESTOS = [[ROMANA.x + 10, ROMANA.y, ROMANA.fulcro], [LEV.x, LEV.y + 4, 6], [LEV.x, LEV.y + 2, 13], [LEV.x + 2, LEV.y, 19], [SACO.x + 8, SACO.y + 6, 2]];

// ---------- la cámara ----------
const PLATE = { x: -52, y: -58, w: 96, d: 52, r: 8 };
const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [ROMANA.x, ROMANA.y, ROMANA.apice + 2], [LEV.x, LEV.y, 24]], WIDTH, HEIGHT, { pad: 8, azimuth: 62, elevation: 30 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const dep = (p) => k.depthOf(p, P);
const linea = (pts) => 'M' + pts.map((p) => at(p).map((v) => v.toFixed(2)).join(' ')).join('L');
const poly = (pts) => linea(pts) + 'Z';
const porDepth = (lista, f) => [...lista].sort((a, b) => dep(f(a)) - dep(f(b)));
const R2x = (i) => (0.5 + i * 0.7548776662) % 1, R2y = (i) => (0.5 + i * 0.5698402910) % 1;
const FZ = (x, y, z = 0) => G.frameAlong([x, y, z], [0, 0, 1]);
const FX = (x, y, z) => G.frameAlong([x, y, z], [1, 0, 0]);
const caja = (x0, x1, y0, y1, z0, h, cls, bevel = 0.2, r = 0.2) => S(k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z0, h, P, 2, bevel), { tone: 'mid', className: cls });
const palo = (a, b, w, cls = 'madera') => { const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(...d); return S(G.prismOf(G.frameAlong(a, d), [[-w, -w], [w, -w], [w, w], [-w, w]], 0, l, P), { tone: 'mid', className: cls }); };

// ---------- el tablero: la plaza, sus losas y la placa ----------
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
  let lo = ''; for (let x = PLATE.x + 10; x < PLATE.x + PLATE.w - 6; x += 8) lo += linea([[x, PLATE.y + 6, 0], [x, PLATE.y + PLATE.d - 6, 0]]);
  for (let y = PLATE.y + 12; y < PLATE.y + PLATE.d - 6; y += 8) lo += linea([[PLATE.x + 6, y, 0], [PLATE.x + PLATE.w - 6, y, 0]]);
  out.push(`<path class="losa" d="${lo}"/>`);
  const regla = { x: -44, y: -14, w: 24, d: 5, r: 1 };
  out.push(S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo' }));
  const t = k.topTicks(regla.x + 3, regla.x + regla.w - 3, 2, 5, regla.y + 0.05, 0.6, [1.8, regla.d - 0.1], P);
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
  out.push(D([at([regla.x + 1.5, regla.y + 2.5, 0.6]), at([regla.x + regla.w - 1.5, regla.y + 2.5, 0.6])], { size: 0.45 }));
  const pl = { x: -12, y: -14, w: 46, d: 5.6, r: 1.2 };
  out.push(S(k.slabOf(pl, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(pl, 1.1), 0.8, P, 4), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([pl.x + 4.6, pl.y + 3.5], 0.8, P, 'x'), 'HARRIJASOTZAILEAK · LEITZA', { size: 2.3, tone: 'mid' }));
  out.push(D([at([pl.x + 2.2, pl.y + 2.8, 0.8]), at([pl.x + pl.w - 2.2, pl.y + 2.8, 0.8])], { size: 0.4 }));
  return out.join('');
}

// ---------- la romana: el trípode, la cadena del fulcro (la barra, el pilón y la piedra colgada, vivos) ----------
function tripode() {
  const R = ROMANA, ap = [R.x, R.y, R.apice], pies = [[R.x - 9, R.y - 7], [R.x + 8, R.y - 8], [R.x - 1, R.y + 9]];
  const out = [];
  const atras = pies.filter((p) => dep([p[0], p[1], 0]) < dep([R.x, R.y, 0])), delante = pies.filter((p) => dep([p[0], p[1], 0]) >= dep([R.x, R.y, 0]));
  for (const [x, y] of atras) out.push(palo([x, y, 0], ap, 0.4));
  out.push(`<g data-part="romana-viva"></g>`);
  for (const [x, y] of delante) out.push(palo([x, y, 0], ap, 0.4));
  out.push(S(k.cylinder(R.x, R.y, 0.9, R.apice - 0.6, 1.2, P, 16), { tone: 'mid', className: 'hierro' }));
  out.push(`<path class="cadena" d="${linea([[R.x, R.y, R.apice - 0.6], [R.x, R.y, R.fulcro + 0.4]])}"/>`);
  return `<g data-part="romana">${out.join('')}</g>`;
}

// ---------- el saco donde cae la piedra ----------
function saco() {
  const s = SACO, out = [];
  out.push(S(k.slabOf({ x: s.x, y: s.y, w: s.w, d: s.d, r: 2.4 }, 0, 1.6, P, 8, 0.8), { tone: 'mid', className: 'arpillera' }));
  let c = ''; for (let i = 1; i < 6; i++) c += linea([[s.x + i / 6 * s.w, s.y + 1, 1.6], [s.x + i / 6 * s.w, s.y + s.d - 1, 1.6]]);
  out.push(L(c, { tone: 'lo' }));
  return `<g data-part="saco">${out.join('')}</g>`;
}

// ---------- las otras piedras: el cilindro, la bola y la rectangular ----------
function otras() {
  const out = [];
  for (const o of porDepth(OTRAS, (q) => [q.x, q.y, 0])) {
    if (o.tipo === 'cilindro') out.push(S(G.solidOf([[0, 2.6], [0.3, 2.7, true], [4.9, 2.7, true], [5.2, 2.6]], FZ(o.x, o.y), P), { tone: 'mid', className: 'granito', crease: 'none' }), L(G.circleOf(FZ(o.x, o.y), 5.2, 1.4, P), { tone: 'lo' }));
    else if (o.tipo === 'bola') out.push(S(G.sphereOf([o.x, o.y, 2.8], 2.8, P), { tone: 'mid', className: 'granito' }));
    else out.push(caja(o.x - 3.4, o.x + 3.4, o.y - 1.8, o.y + 1.8, 0, 3.0, 'granito', 0.3, 0.3));
  }
  return `<g data-part="otras">${out.join('')}</g>`;
}

// ---------- la mesa del juez: el reloj y la cuenta de alzadas (viva) ----------
function mesa() {
  const m = MESA, out = [];
  for (const [x, y] of porDepth([[m.x + 1.2, m.y + 1.2], [m.x + m.w - 1.2, m.y + 1.2], [m.x + 1.2, m.y + m.d - 1.2], [m.x + m.w - 1.2, m.y + m.d - 1.2]], ([q, w]) => [q, w, 0])) out.push(S(k.cylinder(x, y, 0.45, 0, m.z, P, 10), { tone: 'mid', className: 'madera' }));
  out.push(caja(m.x, m.x + m.w, m.y, m.y + m.d, m.z, 0.8, 'madera', 0.2));
  const z = m.z + 0.8, rx = m.x + 10.5, ry = m.y + 4.5, rr = 3;
  out.push(S(k.cylinder(rx, ry, rr + 0.4, z, 0.9, P, 36), { tone: 'mid', className: 'laton' }));
  out.push(`<path class="esfera" d="${poly(Array.from({ length: 40 }, (_, i) => { const a = i / 40 * Math.PI * 2; return [rx + Math.cos(a) * rr, ry + Math.sin(a) * rr, z + 0.92]; }))}"/>`);
  let tM = ''; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; tM += linea([[rx + Math.cos(a) * rr * 0.72, ry + Math.sin(a) * rr * 0.72, z + 0.93], [rx + Math.cos(a) * rr * 0.92, ry + Math.sin(a) * rr * 0.92, z + 0.93]]); }
  out.push(L(tM, { tone: 'mid' }));
  out.push(caja(m.x + 1.2, m.x + 6.6, m.y + 1.2, m.y + m.d - 1.2, z, 0.5, 'pizarra', 0.1));
  return `<g data-part="mesa">${out.join('')}</g><g data-part="cuenta"></g>`;
}

// ---------- la figura ----------
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'Maqueta de una exhibición de levantamiento de piedra: la romana colgada de su trípode, con el pilón que corre por la barra hasta equilibrar la piedra y marca los kilos; el levantador con su faja sobre el saco, que sube la piedra cúbica a las rodillas, al pecho y al hombro y la deja caer; las otras piedras (el cilindro, la bola y la rectangular) y la mesa del juez con el reloj y la cuenta de alzadas.',
  body: [tablero(), tripode(), otras(), saco(), '<g data-part="levantador"></g>', mesa(), '<g data-part="polvo"></g>'],
});

// ---------- lo que se mueve en la página ----------
const live = MARCA_JUEGO + `
const P = ${JSON.stringify(P)}, R = ${JSON.stringify(ROMANA)}, PI = ${JSON.stringify(PIEDRA)}, BEQ = ${B_EQ}, SACO = ${JSON.stringify(SACO)}, LEV = ${JSON.stringify(LEV)}, MESA = ${JSON.stringify(MESA)}, PUESTOS = ${JSON.stringify(PUESTOS)};
const PASOS = ${JSON.stringify(PASOS)}, N = PASOS.length;
const at = (p) => iso(p, P), f2 = (v) => v.toFixed(2), linea = (pts) => 'M' + pts.map((p) => { const q = at(p); return f2(q[0]) + ' ' + f2(q[1]); }).join('L'), poly = (pts) => linea(pts) + 'Z';
const K = Math.hypot(at([0, 0, 1])[0] - at([0, 0, 0])[0], at([0, 0, 1])[1] - at([0, 0, 0])[1]);
const stage = document.querySelector('.iso-stage'), svgEl = stage.querySelector('svg'), $ = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const el = {}; for (const n of ['romana', 'romana-viva', 'saco', 'levantador', 'mesa', 'cuenta', 'polvo', 'otras']) el[n] = $(n);
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }, mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const ilumina = (lista, on) => { for (const n of [].concat(lista)) if (n && on !== n.hasAttribute('data-lit')) n.toggleAttribute('data-lit', on); };
const caja = (x0, x1, y0, y1, z0, h, cls, bevel, r) => solidSvg(slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: r || 0.2 }, z0, h, P, 2, bevel || 0.2), { tone: 'mid', className: cls });
let s = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, txt = '', reloj = 0;
const tourAt = (t) => { const T2 = 3.2 * N + 2, f = (t % T2) / T2 * (N + 0.71); const i = Math.floor(f); return Math.min(N - 0.001, i + sm((f - i) / 0.6) * 0.999); };
const piedra = (c, l, cls) => caja(c[0] - l / 2, c[0] + l / 2, c[1] - l / 2, c[1] + l / 2, c[2] - l / 2, l, cls || 'granito-vivo', 0.35, 0.35);
// ---- la romana: el pilón va del fulcro hasta BEQ; la barra se inclina según lo que falte para el equilibrio ----
function romana() {
  const b = 2 + clamp((s - 0.1) / 0.8, 0, 1) * (BEQ - 2), cuelga = s < 1.55, par = cuelga ? (PI.kg * R.a - R.pilon * b) / (PI.kg * R.a) : -0.6, th = clamp(par, -1, 1) * 0.16;
  const F = [R.x, R.y, R.fulcro], punta = (d) => [R.x + d * Math.cos(th), R.y, R.fulcro - d * Math.sin(th)];
  const corto = punta(-R.a - 0.6), largo = punta(R.largo);
  let o = '<path class="barra" stroke-width="' + f2(0.75 * K) + '" d="' + linea([corto, largo]) + '"/>';
  // las marcas de los kilos, cada 10, por el brazo largo
  let mk = ''; for (let kg = 10; kg <= 120; kg += 10) { const d = kg * R.a / R.pilon, p = punta(d); mk += linea([[p[0], p[1], p[2] + 0.35], [p[0], p[1], p[2] - 0.35]]); }
  o += '<path class="marca-kg" d="' + mk + '"/>';
  o += '<g class="iso-dots" data-tone="hi"><circle r=".6" cx="' + f2(at(F)[0]) + '" cy="' + f2(at(F)[1]) + '"/></g>';
  // el pilón colgado de su anilla
  const pb = punta(b), pz = pb[2] - 3.2;
  o += '<path class="cadena" d="' + linea([pb, [pb[0], pb[1], pz + 1.6]]) + '"/>' + solidSvg(cylinder(pb[0], pb[1], 0.9, pz, 1.6, P, 16), { tone: 'mid', className: 'hierro' });
  // la piedra colgada del gancho del brazo corto, con su cadena en cruz (hasta que se baja al suelo)
  const g = punta(-R.a), baja = sm((s - 1.15) / 0.4), zc = g[2] - 4.6 - baja * (g[2] - 4.6 - PI.lado / 2);
  if (s < 1.55) { const c = [g[0], g[1], zc], l = PI.lado; o += '<path class="cadena" d="' + linea([g, [c[0] - l / 2, c[1] - l / 2, c[2] + l / 2]]) + linea([g, [c[0] + l / 2, c[1] + l / 2, c[2] + l / 2]]) + linea([g, [c[0] - l / 2, c[1] + l / 2, c[2] + l / 2]]) + linea([g, [c[0] + l / 2, c[1] - l / 2, c[2] + l / 2]]) + '"/>' + piedra(c, l); }
  return o;
}
// ---- el levantador: la postura va de agachado (0) a rodillas (1), pecho (2) y hombro (3); y la piedra con él ----
function postura(u) {
  const x = LEV.x, y = LEV.y;
  const P0 = { cad: [x, y + 1.6, 6.2], hom: [x, y + 3.6, 12.2], cab: [x, y + 4.4, 14.6], rod: 4.6, ry: y + 4.4 };
  const P1 = { cad: [x, y + 0.6, 7.6], hom: [x, y + 1.6, 14.0], cab: [x, y + 2.0, 16.6], rod: 4.6, ry: y + 3.0 };
  const P2 = { cad: [x, y + 0.2, 8.8], hom: [x, y + 0.5, 15.2], cab: [x, y + 0.6, 18.0], rod: 4.8, ry: y + 1.6 };
  const P3 = { cad: [x, y, 9.6], hom: [x, y, 15.9], cab: [x, y, 18.8], rod: 5.0, ry: y + 0.6 };
  const Q = [P0, P1, P2, P3], i = Math.min(2, Math.floor(u)), t = sm(u - i), A = Q[i], B = Q[i + 1];
  return { cad: mix(A.cad, B.cad, t), hom: mix(A.hom, B.hom, t), cab: mix(A.cab, B.cab, t), rod: A.rod + (B.rod - A.rod) * t, ry: A.ry + (B.ry - A.ry) * t };
}
const SITIO = (u) => { const x = LEV.x, y = LEV.y, l = PI.lado, Q = [[x, y + 5.0, l / 2 + 1.6], [x, y + 3.6, 8.6], [x, y + 2.6, 13.4], [x + 2.4, y + 0.2, 18.4]], i = Math.min(2, Math.floor(u)), t = sm(u - i); return mix(Q[i], Q[i + 1], t); };
function levantador() {
  // la postura según el paso: en el 1 espera de pie; en el 2 se agacha y la sube a las rodillas; 3 al pecho; 4 al hombro; 5 la suelta
  const u = s < 1.6 ? 3 - sm((s - 1.2) / 0.4) * 3 : s < 2 ? sm((s - 1.6) / 0.35) * 0 : s < 3 ? sm((s - 2.05) / 0.8) * 1 + 0 : s < 4 ? 1 + sm((s - 3.05) / 0.8) : 2 + sm((s - 4.0) / 0.25) * 1;
  const uu = s < 2.05 ? (s < 1.6 ? u : 0) : s < 3.05 ? sm((s - 2.05) / 0.8) : s < 4.0 ? 1 + sm((s - 3.05) / 0.8) : s < 4.3 ? 2 + sm((s - 4.0) / 0.25) : 3;
  const p = postura(uu), x = LEV.x, y = LEV.y, l = PI.lado;
  // dónde está la piedra: en el suelo, delante (traída de la romana), o con él; y al soltarla cae al saco
  let c, conEl = s >= 2.05 && s < 4.55;
  if (s < 1.55) c = null;
  else if (s < 2.05) { const t = sm((s - 1.55) / 0.45), g = [R.x - R.a, R.y, l / 2], dst = SITIO(0); c = mix(g, [dst[0], dst[1], l / 2], t); c[2] = l / 2 + Math.sin(t * Math.PI) * 1.2; }
  else if (s < 4.55) c = SITIO(uu);
  else { const t = clamp((s - 4.55) / 0.3, 0, 1), a = SITIO(3), b = [SACO.x + SACO.w / 2 + 1, SACO.y + SACO.d / 2 + 1, 1.6 + l / 2]; c = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t * t]; }
  let o = '';
  // las piernas y los pies (alpargatas)
  for (const sx of [-1, 1]) { const pie = [x + sx * 2.2, y, 0.2], rod = [x + sx * 2.0, p.ry, p.rod], cad = [x + sx * 0.9, p.cad[1], p.cad[2]]; o += '<path class="pierna" stroke-width="' + f2(1.8 * K) + '" d="' + linea([pie, rod, cad]) + '"/>'; const q = at(pie); o += '<ellipse class="pie" cx="' + f2(q[0]) + '" cy="' + f2(q[1]) + '" rx="' + f2(1.0 * K) + '" ry="' + f2(0.5 * K) + '"/>'; }
  // la piedra, si está detrás de los brazos (en el suelo o subiendo por delante), va antes del cuerpo cuando está detrás de él
  const piedraDetras = c && depthOf(c, P) < depthOf(p.hom, P) - 2;
  if (c && piedraDetras) o += piedra(c, l);
  o += '<path class="cuerpo" stroke-width="' + f2(3.8 * K) + '" d="' + linea([p.cad, p.hom]) + '"/><path class="faja" stroke-width="' + f2(4.0 * K) + '" d="' + linea([[p.cad[0], p.cad[1], p.cad[2] + 0.1], mix(p.cad, p.hom, 0.32)]) + '"/>';
  const qc = at(p.cab); o += '<circle class="cara" cx="' + f2(qc[0]) + '" cy="' + f2(qc[1]) + '" r="' + f2(1.35 * K) + '"/><path class="pelo" d="M' + f2(qc[0] - 1.3 * K) + ' ' + f2(qc[1] - 0.2 * K) + 'Q' + f2(qc[0]) + ' ' + f2(qc[1] - 2.0 * K) + ' ' + f2(qc[0] + 1.3 * K) + ' ' + f2(qc[1] - 0.2 * K) + 'Z"/>';
  if (c && !piedraDetras) o += piedra(c, l);
  // los brazos: abrazan la piedra si la lleva; si no, cuelgan
  const manos = conEl || (s > 1.9 && s < 2.05) ? [[c[0] - l / 2 - 0.3, c[1] + 0.4, c[2]], [c[0] + l / 2 + 0.3, c[1] + 0.4, c[2]]] : [[x - 2.4, y + 0.6, p.cad[2] - 1.5], [x + 2.4, y + 0.6, p.cad[2] - 1.5]];
  o += '<path class="brazo" stroke-width="' + f2(1.25 * K) + '" d="' + linea([[p.hom[0] - 1.6, p.hom[1], p.hom[2] - 0.3], manos[0]]) + linea([[p.hom[0] + 1.6, p.hom[1], p.hom[2] - 0.3], manos[1]]) + '"/>';
  return o;
}
function draw(dt) {
  reloj += dt;
  const paso = Math.min(N - 1, Math.floor(s));
  el['romana-viva'].innerHTML = romana();
  el.levantador.innerHTML = levantador();
  // el polvo del golpe en el saco
  const golpe = clamp((s - 4.82) / 0.4, 0, 1);
  let pv = ''; if (golpe > 0 && golpe < 1) for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r = 2 + golpe * 5, q = at([SACO.x + SACO.w / 2 + 1 + Math.cos(a) * r, SACO.y + SACO.d / 2 + 1 + Math.sin(a) * r * 0.7, 1.8 + golpe * 1.2]); pv += '<circle class="polvo" cx="' + f2(q[0]) + '" cy="' + f2(q[1]) + '" r="' + f2((0.8 + golpe * 1.4) * K) + '" style="opacity:' + f2((1 - golpe) * 0.6) + '"/>'; }
  el.polvo.innerHTML = pv;
  // la cuenta de alzadas: una raya más al caer en el saco
  { const n = 3 + (s > 4.85 ? 1 : 0), b = { x: MESA.x + 1.2, y: MESA.y + 1.2, z: MESA.z + 0.8 + 0.52 }; let m = ''; for (let i = 0; i < n; i++) m += linea([[b.x + 0.9 + i * 0.95, b.y + 1.2, b.z], [b.x + 0.9 + i * 0.95, b.y + 5.4, b.z]]); el.cuenta.innerHTML = '<path class="tiza" d="' + m + '"/>'; }
  ilumina([el.romana], paso === 0); ilumina([el.levantador], paso >= 1 && paso <= 3); ilumina([el.saco, el.mesa], paso === 4);
  const b = 2 + clamp((s - 0.1) / 0.8, 0, 1) * (BEQ - 2), kg = Math.round(R.pilon * b / R.a);
  const extra = ['el pilón corre por la barra hasta dejarla recta: ' + kg + ' kilos', 'agachado, con las piernas y la espalda recta', 'la piedra sube rodando por el cuerpo hasta el pecho', 'de pie, con la piedra quieta en el hombro', 'la deja caer en el saco: una alzada más'][paso];
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
window.__pasoPiedra = (v) => { touring = false; target = s = v; draw(0); };
draw(0);
`;

const tonos = (pre, cls, [f, s0, s1, s2, s3, t]) => `${pre}.${cls}>.iso-fill{fill:${f}}${pre}.${cls}>.iso-top{fill:${t}}${pre}.${cls}[data-seamless]>.iso-top{stroke:${t}}` +
  [s0, s1, s2, s3].map((c, i) => `${pre}.${cls}>.iso-shade[data-shade="${i}"]{fill:${c}}${pre}.${cls}[data-seamless]>.iso-shade[data-shade="${i}"]{stroke:${c}}`).join('');
const COLOR = {
  dark: { granito: ['#6a6474', '#36323e', '#423e4c', '#4e4a5a', '#5a5666', '#7a7486'], 'granito-vivo': ['#7a7486', '#3e3a48', '#4a4656', '#565262', '#625e70', '#8a8498'],
    madera: ['#4a3628', '#2a1d16', '#35261c', '#403022', '#4c3a2a', '#5a4632'], hierro: ['#5c5a6a', '#2e2c38', '#3a3846', '#464454', '#525062', '#6e6c7e'],
    arpillera: ['#7a6440', '#463820', '#544428', '#625030', '#705c38', '#8a744c'], laton: ['#8a6a2a', '#4e3a14', '#5e461a', '#6e5220', '#7e5e26', '#b08a3a'], pizarra: ['#1e2a26', '#101814', '#141e1a', '#18241f', '#1c2824', '#26342e'] },
  light: { granito: ['#aaa4b4', '#7c7686', '#8a8494', '#9892a2', '#a6a0b0', '#c2bccc'], 'granito-vivo': ['#bab4c4', '#8a8494', '#9892a2', '#a6a0b0', '#b4aebe', '#d0cada'],
    madera: ['#8a6a50', '#5e4636', '#6c523e', '#7a5e48', '#886a52', '#9a7c62'], hierro: ['#9c9aaa', '#6e6c7c', '#7c7a8a', '#8a8898', '#9896a6', '#b2b0c0'],
    arpillera: ['#d8c090', '#a8906a', '#b89e76', '#c8ac82', '#d8ba8e', '#ecd4a8'], laton: ['#d8aa50', '#a87c2a', '#b88a36', '#c89842', '#d8a64e', '#f0c870'], pizarra: ['#3a4a44', '#26322e', '#2c3a34', '#32423c', '#384842', '#4a5c54'] },
};
const colores = Object.entries(COLOR).map(([th, m]) => Object.entries(m).map(([cls, v]) => tonos(th === 'light' ? '.iso[data-theme="light"] ' : '', cls, v)).join('')).join('');
const CSS = COLORES + enJuego(WIDTH, HEIGHT) + `
.iso{--losa:#2a1d44;--cadena:#8a8698;--barra:#8a6a44;--marca-kg:#ffd36a;--esfera:#ecdcff;--tiza:#ecdcff;--piel:#e0b090;--camisa:#ecdcff;--faja:#d6338f;--pantalon:#2e2e56;--pelo:#1a1022;--polvo:#c8b89a}
.iso[data-theme="light"]{--losa:#e2dcee;--cadena:#6e6c7c;--barra:#a88058;--marca-kg:#7a3b8f;--esfera:#ffffff;--tiza:#2a1d42;--piel:#c89070;--camisa:#ffffff;--faja:#d6338f;--pantalon:#46468a;--pelo:#2a1d30;--polvo:#a8906a}
.losa{fill:none;stroke:var(--losa);stroke-width:.35}.cadena{fill:none;stroke:var(--cadena);stroke-width:.4;stroke-dasharray:.5 .3}
.barra{fill:none;stroke:var(--barra);stroke-linecap:round}.marca-kg{fill:none;stroke:var(--marca-kg);stroke-width:.35}
.esfera{fill:var(--esfera);stroke:var(--anatomy-lo);stroke-width:.3}.tiza{fill:none;stroke:var(--tiza);stroke-width:.55;stroke-linecap:round}
.pierna{fill:none;stroke:var(--pantalon);stroke-linecap:round;stroke-linejoin:round}.pie{fill:var(--camisa);stroke:var(--anatomy-lo);stroke-width:.3}
.cuerpo{fill:none;stroke:var(--camisa);stroke-linecap:round}.faja{fill:none;stroke:var(--faja)}.brazo{fill:none;stroke:var(--piel);stroke-linecap:round;stroke-linejoin:round}
.cara{fill:var(--piel);stroke:var(--anatomy-lo);stroke-width:.3}.pelo{fill:var(--pelo)}.polvo{fill:var(--polvo)}
[data-lit] .iso-edge,[data-lit].iso-line,[data-lit] .iso-line{stroke:var(--anatomy-lit)}
[data-lit] .iso-top,[data-lit].iso-top{fill:var(--anatomy-lit-top)}
[data-lit] .iso-dots circle{fill:var(--anatomy-lit)}
[data-part="romana"][data-lit] .barra{stroke:var(--anatomy-lit)}
[data-part="levantador"][data-lit] .pie{stroke:var(--anatomy-lit);stroke-width:.6}
` + colores;

const body = k.plateHtml({
  fig: 'Lámina 22',
  title: 'Cómo se levanta una piedra',
  hint: 'Pasa el ratón por cada pieza',
  readout: '1 · Pesar · el pilón corre por la barra hasta dejarla recta: 20 kilos',
  keys: [
    { mark: 'lit', label: 'Lo que trabaja en cada paso: la romana, el levantador y el saco' },
    { mark: 'raised', label: 'La romana: la piedra en el brazo corto, el pilón en el largo' },
    { mark: 'flat', label: 'Se levanta con las piernas, con la espalda recta y la faja bien apretada' },
  ],
  caption: 'En los caseríos se movían a mano piedras, sacos y troncos muy pesados, y de las apuestas entre vecinos nació el deporte de levantar piedras. Antes de empezar, la piedra se pesa en la romana: cuelga del brazo corto de la barra y el pilón, mucho más ligero, corre por el brazo largo hasta que la barra queda recta; la marca donde se para dice los kilos. El harrijasotzaile se aprieta la faja para proteger la espalda, se agacha con la espalda recta y sube la piedra con la fuerza de las piernas: primero a las rodillas, después la hace rodar por el cuerpo hasta el pecho y, de un empujón, al hombro. Cuando está de pie con la piedra quieta, la deja caer en el saco y el juez cuenta una alzada más. Hay piedras cúbicas, cilíndricas, rectangulares y en forma de bola, y en Leitza, Iñaki Perurena levantó piedras de más de 300 kilos.',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Cómo se levanta una piedra, paso a paso: las flechas pasan de un paso a otro" aria-valuemin="1" aria-valuemax="5">${svg}</div>`,
});

const html = k.pageHtml({ title: 'Cómo se levanta una piedra', theme, body, script: kitScript() + live }).replace('</style>', CSS + '</style>');
escribe('harrijasotzaile', html, theme);
