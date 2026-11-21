// Lámina isométrica interactiva «Cómo vive una seta» (skill Anatomy, 21 de noviembre de 2026; el autor: «explicaciones
// técnicas con Anatomy [...] todo esto quiero que poco a poco lo vayas aplicando y lo vayas metiendo en el juego y en las
// misiones»). Un trozo de suelo de hayedo cortado como un bloque de maqueta, con sus capas a la vista (la hojarasca, el
// mantillo, la tierra y la roca): bajo tierra crece el micelio, la red de hilos del hongo, que se abraza a las raíces del
// haya y cambia con ella agua por azúcar; tras la lluvia, las setas empujan la hojarasca y salen; de las láminas de debajo
// del sombrero caen las esporas; y al final, la forma buena de cogerlas: con la navaja por el pie, las pequeñas se quedan,
// a la cesta de mimbre. Al recorrerla, paso a paso, se ilumina lo que trabaja. Es la que se abre en la misión de las setas
// (data/procesos.js) y en el material didáctico.
// Uso: node tools/anatomia/setas.mjs [--light]  →  entrega/anatomia/setas(-light).html (y public/anatomia, para el juego)
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';
import * as G from '../../.claude/skills/anatomy/kit/lathe.mjs';
import { kitScript } from '../../.claude/skills/anatomy/scripts/inline-kit.mjs';
import { COLORES, enJuego, MARCA_JUEGO, escribe } from './comun.mjs';

const theme = process.argv.includes('--light') ? 'light' : 'dark';
const WIDTH = 600, HEIGHT = 320;

// ---------- el modelo (unidades de la maqueta; x a lo ancho, y hacia delante, z arriba) ----------
// el bloque de suelo: la roca (0-4), la tierra (4-10), el mantillo (10-13) y la hojarasca (13-14); la cara de delante, cortada
const SUELO = { x0: -44, x1: 30, y0: -48, y1: -22 };
const CAPAS = [['roca', 0, 4], ['tierra', 4, 6], ['mantillo', 10, 3], ['hojarasca', 13, 1]];
const ZS = 14;                                                     // la superficie
const HAYA = { x: -24, y: -38 };
const SETAS = [{ x: 4, y: -26, s: 1.4 }, { x: 12, y: -27.5, s: 1.15 }, { x: -3, y: -29, s: 0.8 }, { x: 18, y: -33, s: 1.3 }, { x: 8, y: -36, s: 0.55 }];
const CESTA = { x: 24, y: -14 };
const PASOS = ['El micelio', 'Las raíces', 'Sale la seta', 'Las esporas', 'Cogerla bien'];
const PUESTOS = [[-6, SUELO.y1, 9], [HAYA.x, SUELO.y1, 8], [6, -27, ZS + 4], [10, -27, ZS + 7], [CESTA.x, CESTA.y, 4]];

// ---------- la cámara ----------
const PLATE = { x: -54, y: -58, w: 98, d: 54, r: 8 };
const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [HAYA.x, HAYA.y, ZS + 30], [SUELO.x1, SUELO.y0, ZS + 2]], WIDTH, HEIGHT, { pad: 8, azimuth: 62, elevation: 30 });
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
const YF = SUELO.y1 + 0.04;                                         // el plano de la cara cortada, donde se dibuja lo de dentro

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
  const regla = { x: -46, y: -14, w: 26, d: 5, r: 1 };
  out.push(S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo' }));
  const t = k.topTicks(regla.x + 3, regla.x + regla.w - 3, 2, 5, regla.y + 0.05, 0.6, [1.8, regla.d - 0.1], P);
  out.push(L(t.minor, { tone: 'lo' }), L(t.major, { tone: 'mid' }));
  out.push(D([at([regla.x + 1.5, regla.y + 2.5, 0.6]), at([regla.x + regla.w - 1.5, regla.y + 2.5, 0.6])], { size: 0.45 }));
  const pl = { x: -16, y: -14, w: 30, d: 5.6, r: 1.2 };
  out.push(S(k.slabOf(pl, 0, 0.8, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(pl, 1.1), 0.8, P, 4), { tone: 'faint' }));
  out.push(k.faceTextSvg(k.topMatrix([pl.x + 4.6, pl.y + 3.5], 0.8, P, 'x'), 'ONDDOAK · ULTZAMA', { size: 2.3, tone: 'mid' }));
  out.push(D([at([pl.x + 2.2, pl.y + 2.8, 0.8]), at([pl.x + pl.w - 2.2, pl.y + 2.8, 0.8])], { size: 0.4 }));
  return out.join('');
}

// ---------- el bloque de suelo, con sus capas y lo que hay en la cara cortada ----------
function suelo() {
  const s = SUELO, out = [];
  for (const [cls, z0, h] of CAPAS) out.push(S(k.slabOf({ x: s.x0, y: s.y0, w: s.x1 - s.x0, d: s.y1 - s.y0, r: 0.3 }, z0, h, P, 2, 0.15), { tone: 'mid', className: cls }));
  // las piedras de la roca y los granos de la tierra, en la cara cortada
  let pi = ''; for (let i = 0; i < 26; i++) { const x = s.x0 + 2 + R2x(i) * (s.x1 - s.x0 - 4), z = 0.6 + R2y(i) * 3, q = at([x, YF, z]); pi += `<ellipse class="china" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" rx="${(0.6 + R2x(i + 3) * 0.9).toFixed(2)}" ry="${(0.35 + R2y(i + 5) * 0.4).toFixed(2)}"/>`; }
  let gr = ''; for (let i = 0; i < 60; i++) { const x = s.x0 + 1 + R2x(i + 30) * (s.x1 - s.x0 - 2), z = 4.4 + R2y(i + 30) * 8.4, q = at([x, YF, z]); gr += `<circle class="grano" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${(0.18 + R2x(i) * 0.25).toFixed(2)}"/>`; }
  out.push(pi, gr);
  // las hojas secas por encima
  let ho = ''; for (let i = 0; i < 70; i++) { const x = s.x0 + 2 + R2x(i + 70) * (s.x1 - s.x0 - 4), y = s.y0 + 2 + R2y(i + 70) * (s.y1 - s.y0 - 3), q = at([x, y, ZS]); ho += `<ellipse class="hoja h${i % 3}" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" rx="${(0.8 + R2x(i) * 0.6).toFixed(2)}" ry="${(0.4 + R2y(i) * 0.3).toFixed(2)}" transform="rotate(${Math.round(R2x(i + 9) * 180)} ${q[0].toFixed(1)} ${q[1].toFixed(1)})"/>`; }
  out.push(ho);
  return `<g data-part="suelo">${out.join('')}</g>`;
}
// las raíces del haya, en la cara cortada (y una parte por arriba, que asoma)
const RAICES = [];
{ const base = [HAYA.x, YF, ZS - 0.5]; const ramas = [[-14, 6], [-6, 3], [5, 2.4], [12, 6.5], [-2, 8.5], [8, 9]];
  for (const [dx, dz] of ramas) { const pts = [base]; for (let i = 1; i <= 6; i++) { const t = i / 6; pts.push([HAYA.x + dx * t + Math.sin(t * 5 + dx) * 0.8, YF, ZS - 0.5 - dz * Math.pow(t, 0.8) - t * 1.4]); } RAICES.push(pts); } }
function raices() {
  let d = ''; for (const r of RAICES) d += linea(r);
  // las raicillas finas al final de cada raíz, donde se abraza el hongo
  let f = ''; for (const r of RAICES) { const e = r[r.length - 1]; for (let j = 0; j < 4; j++) { const a = -1 + j * 0.7; f += linea([e, [e[0] + Math.cos(a) * 1.8, YF, e[2] - Math.abs(Math.sin(a)) * 1.6 - 0.4]]); } }
  return `<g data-part="raices"><path class="raiz" d="${d}"/><path class="raicilla" d="${f}"/></g>`;
}
// el haya, de pie sobre el bloque
function haya() {
  const { x, y } = HAYA, out = [S(G.solidOf([[0, 1.9], [0.8, 1.5, true], [16, 1.05]], FZ(x, y, ZS), P), { tone: 'mid', className: 'corteza' })];
  const bolas = [[x - 3.6, y + 0.8, ZS + 19, 5.6], [x + 3.4, y - 0.6, ZS + 20, 5.2], [x, y + 1.4, ZS + 24.4, 6], [x + 0.5, y - 1.4, ZS + 16.5, 4.2]];
  out.push(porDepth(bolas, (b) => b).map(([bx, by, bz, r]) => S(G.sphereOf([bx, by, bz], r, P), { tone: 'mid', className: 'copa' })).join(''));
  return `<g data-part="haya">${out.join('')}</g>`;
}
// las setas, en cuatro tamaños (0: el primordio que asoma; 3: la seta hecha), dibujadas aquí y elegidas en vivo
function seta({ x, y, s: sc }, f) {
  const h = (0.6 + f * 4.4) * sc, rs = (0.35 + f * 0.65) * sc, rc = (0.6 + f * 2.6) * sc;
  const pie = S(G.solidOf([[0, rs * 1.15], [0.4, rs * 1.25, true], [h * 0.6, rs, true], [h, rs * 0.9]], FZ(x, y, ZS), P), { tone: 'mid', className: 'pie-seta', crease: 'none' });
  const som = S(G.solidOf([[0, rc * 0.92], [rc * 0.12, rc, true], [rc * 0.5, rc * 0.82, true], [rc * 0.85, rc * 0.42, true], [rc * 0.98, 0.05]], FZ(x, y, ZS + h - rc * 0.08), P), { tone: 'mid', className: 'sombrero', crease: 'none' });
  // las láminas, vistas por debajo del ala (un anillo oscuro bajo el sombrero)
  const ala = L(G.circleOf(FZ(x, y, ZS + h - rc * 0.08), 0, rc * 0.62, P), { tone: 'lo' });
  return pie + som + ala;
}
function setas() {
  return SETAS.map((m, i) => ({ m, i })).sort((A, B) => dep([A.m.x, A.m.y, 0]) - dep([B.m.x, B.m.y, 0])).map(({ m, i }) =>
    `<g data-seta="${i}">${[0.08, 0.35, 0.7, 1].map((f, j) => `<g data-tam="${j}" style="display:none">${seta(m, f)}</g>`).join('')}</g>`).join('');
}
// la cesta de mimbre y la navaja, delante
function cesta() {
  const { x, y } = CESTA, out = [];
  const F = FZ(x, y, 0);
  out.push(S(G.solidOf([[0, 3.0], [0.4, 3.4, true], [4.6, 4.6, true], [5.0, 4.7]], F, P), { tone: 'mid', className: 'mimbre', crease: 'none' }));
  let tr = ''; for (let i = 1; i < 6; i++) tr += G.circleOf(F, i * 0.85, 3.2 + i * 0.27, P);
  out.push(L(tr, { tone: 'lo' }), L(G.circleOf(F, 5.0, 4.7, P), { tone: 'mid' }));
  // el asa
  const a = [[x - 4.6, y, 5], [x - 3.2, y, 9], [x, y, 10.8], [x + 3.2, y, 9], [x + 4.6, y, 5]];
  out.push(`<path class="asa" d="${linea(a)}"/>`);
  // la navaja, abierta en el suelo
  out.push(`<path class="hoja-navaja" d="${poly([[x - 9, y + 3, 0.2], [x - 5.6, y + 4.2, 0.2], [x - 5.8, y + 4.8, 0.2], [x - 9.2, y + 3.6, 0.2]])}"/>`, `<path class="mango-navaja" d="${linea([[x - 12.6, y + 2, 0.4], [x - 9.1, y + 3.3, 0.4]])}"/>`);
  return `<g data-part="cesta">${out.join('')}</g><g data-part="en-cesta"></g>`;
}

// ---------- la figura ----------
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: 'Maqueta de un trozo de suelo de hayedo cortado como un bloque, con sus capas a la vista: la hojarasca, el mantillo, la tierra y la roca; bajo tierra, el micelio del hongo, que se abraza a las raíces del haya; encima, las setas que salen tras la lluvia y sueltan sus esporas; delante, la cesta de mimbre y la navaja para cogerlas bien.',
  body: [tablero(), suelo(), raices(), '<g data-part="micelio"></g>', '<g data-part="cambio"></g>', haya(), `<g data-part="setas">${setas()}</g>`, '<g data-part="esporas"></g>', '<g data-part="lluvia"></g>', cesta()],
});

// ---------- lo que se mueve en la página ----------
// el micelio: hilos que salen de unos puntos del mantillo y se ramifican; se dibujan con la longitud que toque
const HILOS = [];
{ const semillas = [[-6, 11.5], [6, 11], [14, 10.5], [-16, 9], [22, 11.2], [-30, 10.6]]; let i = 0;
  for (const [x0, z0] of semillas) for (let r = 0; r < 4; r++) { const pts = [[x0, z0]]; let x = x0, z = z0, a = -0.4 + r * 1.1 + (R2x(i) - 0.5); for (let n = 0; n < 9; n++) { a += (R2y(i * 7 + n) - 0.5) * 1.1; x += Math.cos(a) * 1.9; z += Math.sin(a) * 0.7 - 0.12; z = Math.max(4.6, Math.min(12.8, z)); x = Math.max(SUELO.x0 + 1, Math.min(SUELO.x1 - 1, x)); pts.push([+x.toFixed(2), +z.toFixed(2)]); } HILOS.push(pts); i++; } }
const live = MARCA_JUEGO + `
const P = ${JSON.stringify(P)}, YF = ${YF}, ZS = ${ZS}, SETAS = ${JSON.stringify(SETAS)}, HILOS = ${JSON.stringify(HILOS)}, RAICES = ${JSON.stringify(RAICES)}, CESTA = ${JSON.stringify(CESTA)}, PUESTOS = ${JSON.stringify(PUESTOS)};
const PASOS = ${JSON.stringify(PASOS)}, N = PASOS.length;
const at = (p) => iso(p, P), f2 = (v) => v.toFixed(2), linea = (pts) => 'M' + pts.map((p) => { const q = at(p); return f2(q[0]) + ' ' + f2(q[1]); }).join('L'), poly = (pts) => linea(pts) + 'Z';
const K = Math.hypot(at([0, 0, 1])[0] - at([0, 0, 0])[0], at([0, 0, 1])[1] - at([0, 0, 0])[1]);
const stage = document.querySelector('.iso-stage'), svgEl = stage.querySelector('svg'), $ = (n) => svgEl.querySelector('[data-part="' + n + '"]');
const el = {}; for (const n of ['suelo', 'raices', 'micelio', 'cambio', 'haya', 'setas', 'esporas', 'lluvia', 'cesta', 'en-cesta']) el[n] = $(n);
const SG = [...el.setas.querySelectorAll('[data-seta]')].map((g) => ({ i: +g.dataset.seta, t: [...g.querySelectorAll('[data-tam]')] }));
const readout = document.querySelector('[data-readout]');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const ilumina = (lista, on) => { for (const n of [].concat(lista)) if (n && on !== n.hasAttribute('data-lit')) n.toggleAttribute('data-lit', on); };
let s = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, txt = '', reloj = 0;
const tourAt = (t) => { const T2 = 3.2 * N + 2, f = (t % T2) / T2 * (N + 0.71); const i = Math.floor(f); return Math.min(N - 0.001, i + sm((f - i) / 0.6) * 0.999); };
const a3 = (p) => [p[0], YF, p[1]];
// un trozo de polilínea: la fracción f de su longitud
const trozo = (pts, f) => { if (f <= 0) return []; const n = pts.length - 1, u = f * n, i = Math.floor(u), out = pts.slice(0, i + 1); if (i < n) { const a = pts[i], b = pts[i + 1], t = u - i; out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } return out; };
function draw(dt) {
  reloj += dt;
  const paso = Math.min(N - 1, Math.floor(s));
  // el micelio crece en el primer paso y se queda
  const crece = clamp(s / 0.9, 0, 1);
  let m = ''; HILOS.forEach((h, i) => { const f = clamp(crece * 1.4 - (i % 4) * 0.12, 0, 1), t = trozo(h, f); if (t.length > 1) m += linea(t.map(a3)); });
  // y en el segundo, se abraza a las raicillas (un manguito blanco en cada punta)
  const abraza = sm((s - 1.0) / 0.5);
  if (abraza > 0) for (const r of RAICES) { const e = r[r.length - 1]; m += linea([[e[0] - 1.6 * abraza, YF, e[2] - 0.6], [e[0] + 1.6 * abraza, YF, e[2] - 1.2]]); }
  el.micelio.innerHTML = '<path class="hilo" d="' + m + '"/>';
  // el intercambio: azúcar que baja por las raíces (dorado) y agua que sube (azul)
  let c = ''; if (s > 1.2 && s < 2.4) { const op = sm((s - 1.2) / 0.2) * (1 - sm((s - 2.1) / 0.3)); RAICES.forEach((r, j) => { for (const [cls, dir, off] of [['azucar', 1, 0], ['agua', -1, 0.5]]) { const f = ((reloj * 0.35 * dir + off + j * 0.17) % 1 + 1) % 1, n = r.length - 1, u = f * n, i = Math.floor(u), a = r[i], b = r[Math.min(n, i + 1)], t = u - i, q = at([a[0] + (b[0] - a[0]) * t, YF, a[2] + (b[2] - a[2]) * t]); c += '<circle class="' + cls + '" cx="' + f2(q[0]) + '" cy="' + f2(q[1]) + '" r="' + f2(0.55 * K) + '" style="opacity:' + f2(op) + '"/>'; } }); }
  el.cambio.innerHTML = c;
  // la lluvia, al empezar el tercer paso
  let ll = ''; if (s > 1.9 && s < 2.75) { const op = sm((s - 1.9) / 0.2) * (1 - sm((s - 2.55) / 0.2)); for (let i = 0; i < 40; i++) { const x = -40 + ((i * 37.3) % 68), y = -46 + ((i * 13.7) % 24), f = (reloj * 1.3 + i * 0.137) % 1, z = ZS + 26 - f * 26, q0 = at([x, y, z]), q1 = at([x, y, z - 1.6]); ll += 'M' + f2(q0[0]) + ' ' + f2(q0[1]) + 'L' + f2(q1[0]) + ' ' + f2(q1[1]); } el.lluvia.innerHTML = '<path class="gota" style="opacity:' + f2(op * 0.8) + '" d="' + ll + '"/>'; } else el.lluvia.innerHTML = '';
  // las setas: asoman y crecen (tercer paso); la grande se corta en el quinto y pasa a la cesta
  const sale = clamp((s - 2.15) / 0.75, 0, 1), cortada = s > 4.35;
  for (const g of SG) { const m2 = SETAS[g.i], pequena = m2.s < 0.9, f = clamp(sale * (pequena ? 0.85 : 1.25) - g.i * 0.06, 0, 1), tam = f <= 0 ? -1 : Math.min(3, Math.floor(f * 3.999)), oculta = cortada && !pequena && g.i < 2;
    g.t.forEach((t, j) => { const ver = !oculta && j === tam ? '' : 'none'; if (t.style.display !== ver) t.style.display = ver; }); }
  // en la cesta, las dos setas cortadas (sombreros que asoman)
  if (cortada) { let e = ''; for (const [dx, dy, r] of [[-1.2, 0.6, 2.2], [1.4, -0.4, 1.8]]) { const q = at([CESTA.x + dx, CESTA.y + dy, 4.8]); e += '<ellipse class="sombrero-cesta" cx="' + f2(q[0]) + '" cy="' + f2(q[1]) + '" rx="' + f2(r * K) + '" ry="' + f2(r * 0.55 * K) + '"/>'; } el['en-cesta'].innerHTML = e; } else el['en-cesta'].innerHTML = '';
  // las esporas: caen de debajo de los sombreros y se las lleva el aire
  let es = ''; if (s > 3.0) { const op = sm((s - 3.0) / 0.2) * (s > 3.95 ? 0.35 : 1); for (const m2 of SETAS) { if (m2.s < 0.9) continue; const h = (0.6 + 4.4) * m2.s; for (let i = 0; i < 9; i++) { const f = (reloj * 0.25 + i / 9) % 1, q = at([m2.x + f * 6 + Math.sin(i * 1.7 + reloj) * 0.6, m2.y + (i % 3 - 1) * 0.8, ZS + h - 0.6 - f * (h - 0.4)]); es += '<circle class="espora" cx="' + f2(q[0]) + '" cy="' + f2(q[1]) + '" r="' + f2(0.22 * K) + '" style="opacity:' + f2(op * (1 - f)) + '"/>'; } } }
  el.esporas.innerHTML = es;
  ilumina([el.micelio], paso === 0); ilumina([el.raices, el.haya], paso === 1); ilumina([el.setas], paso === 2 || paso === 3); ilumina([el.cesta], paso === 4);
  const extra = ['bajo tierra, la red de hilos del hongo: el micelio', 'el hongo se abraza a las raíces: agua para el árbol, azúcar para el hongo', 'tras la lluvia, la seta empuja la hojarasca y sale', 'de las láminas del sombrero caen las esporas', 'con la navaja por el pie; las pequeñas se quedan'][paso];
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
window.__pasoSetas = (v) => { touring = false; target = s = v; draw(0); };
draw(0);
`;

const tonos = (pre, cls, [f, s0, s1, s2, s3, t]) => `${pre}.${cls}>.iso-fill{fill:${f}}${pre}.${cls}>.iso-top{fill:${t}}${pre}.${cls}[data-seamless]>.iso-top{stroke:${t}}` +
  [s0, s1, s2, s3].map((c, i) => `${pre}.${cls}>.iso-shade[data-shade="${i}"]{fill:${c}}${pre}.${cls}[data-seamless]>.iso-shade[data-shade="${i}"]{stroke:${c}}`).join('');
const COLOR = {
  dark: { roca: ['#4a4456', '#26222e', '#2e2a38', '#383244', '#423c50', '#5a5268'], tierra: ['#4a3426', '#271a12', '#301f16', '#3a271c', '#443022', '#5a402e'],
    mantillo: ['#33241c', '#1a120e', '#201610', '#281c14', '#302218', '#3e2e22'], hojarasca: ['#6a4024', '#3a2010', '#462814', '#523018', '#5e381e', '#8a5430'],
    corteza: ['#5a5662', '#302e36', '#3a3842', '#46424e', '#524e5a', '#66626e'], copa: ['#3c5a3e', '#203222', '#2a402c', '#334c35', '#3c583e', '#4a6a4c'],
    'pie-seta': ['#d8cdb8', '#8a8070', '#a09682', '#b4aa94', '#c8bea8', '#ece2cc'], sombrero: ['#7a4a26', '#3e2412', '#4c2c16', '#5a361c', '#683e22', '#98602e'],
    mimbre: ['#8a6a3c', '#4e3a1e', '#5e4626', '#6e522e', '#7e5e36', '#a8844c'] },
  light: { roca: ['#a49aae', '#766c82', '#857b91', '#948aa0', '#a399af', '#bcb2c6'], tierra: ['#a88464', '#7a5a40', '#88684c', '#987658', '#a68464', '#c4a080'],
    mantillo: ['#7a5a44', '#4e3626', '#5c422e', '#6a4e38', '#785a42', '#94765c'], hojarasca: ['#d8945a', '#a8642e', '#b8723a', '#c88046', '#d88e52', '#f0ac72'],
    corteza: ['#b8b2c0', '#8a8494', '#9892a2', '#a6a0b0', '#b4aebe', '#c4bece'], copa: ['#8ab27e', '#5e8656', '#6c9462', '#7aa26e', '#88b07c', '#9cc48e'],
    'pie-seta': ['#f4ecdc', '#c4baa4', '#d4cab4', '#e4dac4', '#f2e8d4', '#fffaf0'], sombrero: ['#b8743e', '#88501e', '#985c28', '#a86832', '#b8743c', '#d8945a'],
    mimbre: ['#d8b07a', '#a8844c', '#b89058', '#c89e66', '#d8ac72', '#ecc68e'] },
};
const colores = Object.entries(COLOR).map(([th, m]) => Object.entries(m).map(([cls, v]) => tonos(th === 'light' ? '.iso[data-theme="light"] ' : '', cls, v)).join('')).join('');
const CSS = COLORES + enJuego(WIDTH, HEIGHT) + `
.iso{--china:#5e5670;--grano:#6a4e3a;--hoja0:#8a5430;--hoja1:#a86a34;--hoja2:#6e3e22;--raiz:#a07a52;--hilo:#f0ecf8;--azucar:#ffd36a;--agua:#7aa8ff;--gota:#9ab8ff;--espora:#e8dcc8;--asa:#8a6a3c;--hoja-navaja:#a8a4b8;--mango-navaja:#6a4a2a;--sombrero-cesta:#98602e}
.iso[data-theme="light"]{--china:#8a8098;--grano:#7a5a40;--hoja0:#c8844a;--hoja1:#e0a058;--hoja2:#a8642e;--raiz:#8a6440;--hilo:#ffffff;--azucar:#d69a10;--agua:#3a6ad8;--gota:#5a7ac8;--espora:#8a7a62;--asa:#a88058;--hoja-navaja:#6e6c7c;--mango-navaja:#8a6440;--sombrero-cesta:#b8743e}
.china{fill:var(--china)}.grano{fill:var(--grano)}.hoja{stroke:none}.h0{fill:var(--hoja0)}.h1{fill:var(--hoja1)}.h2{fill:var(--hoja2)}
.raiz{fill:none;stroke:var(--raiz);stroke-width:1.1;stroke-linecap:round;stroke-linejoin:round}.raicilla{fill:none;stroke:var(--raiz);stroke-width:.4;stroke-linecap:round}
.hilo{fill:none;stroke:var(--hilo);stroke-width:.35;stroke-linecap:round;stroke-linejoin:round;opacity:.9}
.azucar{fill:var(--azucar)}.agua{fill:var(--agua)}.gota{fill:none;stroke:var(--gota);stroke-width:.4;stroke-linecap:round}.espora{fill:var(--espora)}
.asa{fill:none;stroke:var(--asa);stroke-width:1.1;stroke-linecap:round}.hoja-navaja{fill:var(--hoja-navaja);stroke:var(--anatomy-lo);stroke-width:.25}.mango-navaja{fill:none;stroke:var(--mango-navaja);stroke-width:1.1;stroke-linecap:round}
.sombrero-cesta{fill:var(--sombrero-cesta);stroke:var(--anatomy-lo);stroke-width:.3}
[data-lit] .iso-edge,[data-lit].iso-line,[data-lit] .iso-line{stroke:var(--anatomy-lit)}
[data-lit] .iso-top,[data-lit].iso-top{fill:var(--anatomy-lit-top)}
[data-lit] .iso-dots circle{fill:var(--anatomy-lit)}
[data-part="micelio"][data-lit] .hilo{stroke:var(--anatomy-lit);opacity:1}
[data-part="raices"][data-lit] .raiz,[data-part="raices"][data-lit] .raicilla{stroke:var(--anatomy-lit)}
` + colores;

const body = k.plateHtml({
  fig: 'Lámina 23',
  title: 'Cómo vive una seta',
  hint: 'Pasa el ratón por cada pieza',
  readout: '1 · El micelio · bajo tierra, la red de hilos del hongo: el micelio',
  keys: [
    { mark: 'lit', label: 'Lo que trabaja en cada paso: el micelio, las raíces, las setas y la cesta' },
    { mark: 'raised', label: 'La seta es solo el fruto: el hongo vive bajo tierra' },
    { mark: 'flat', label: 'El hongo y el árbol se ayudan: agua por azúcar' },
  ],
  caption: 'Una seta es solo el fruto de un hongo. El hongo de verdad vive escondido bajo tierra: es el micelio, una red de hilos finísimos que se extiende por el mantillo y se abraza a las raíces de los árboles. Los dos se ayudan: el hongo le pasa al haya agua y sales de la tierra, y el árbol le da al hongo el azúcar que fabrica con la luz del sol. En otoño, después de las lluvias, el micelio empuja hacia arriba y salen las setas, que sueltan por debajo del sombrero millones de esporas, como semillas diminutas que se lleva el aire. Por eso se cogen con cuidado: se cortan por el pie con una navaja, sin arrancar el hongo de debajo; las pequeñas se dejan para que crezcan, y se llevan en una cesta de mimbre, que no las aplasta y deja caer las esporas por el camino. En el valle de Ultzama hay un parque micológico donde hace falta permiso para cogerlas, y antes de comer una seta siempre la tiene que ver alguien que sepa mucho de setas.',
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Cómo vive una seta, paso a paso: las flechas pasan de un paso a otro" aria-valuemin="1" aria-valuemax="5">${svg}</div>`,
});

const html = k.pageHtml({ title: 'Cómo vive una seta', theme, body, script: kitScript() + live }).replace('</style>', CSS + '</style>');
escribe('setas', html, theme);
