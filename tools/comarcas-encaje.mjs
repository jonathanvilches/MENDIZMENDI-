// Los contornos de las comarcas para el mapa 3D del inicio, encajados: cada borde entre dos comarcas, una sola línea que
// comparten las dos, sin huecos ni montes de una sobre otra. Los de src/data/comarcas.json vienen trazados en escalones
// alrededor de cada comarca por separado, con una raya de 1 a 2 unidades entre vecinas; aquí se pintan en una rejilla
// fina, la raya se reparte entre las dos vecinas (cada punto, para la más cercana), se cortan los bordes en tramos entre
// los puntos donde se tocan tres (o donde acaba Navarra) y cada tramo se simplifica y se suaviza una sola vez: las dos
// comarcas usan el mismo. Escribe src/data/comarcas-encaje.json.
// Uso: node tools/comarcas-encaje.mjs
import { readFileSync, writeFileSync } from 'fs';

const C = JSON.parse(readFileSync('src/data/comarcas.json', 'utf8'));
const G = 0.5, CIERRA = 4, EPS = 1.1;   // (el lado de la rejilla; hasta dónde se rellena la raya entre vecinas; la simplificación)
const puntos = (path) => { const n = path.match(/-?\d+(\.\d+)?/g).map(Number), P = []; for (let i = 0; i + 1 < n.length; i += 2) P.push([n[i], n[i + 1]]); return P; };
const polis = C.map(c => puntos(c.path));
let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
for (const P of polis) for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
x0 -= 10; y0 -= 10; x1 += 10; y1 += 10;
const NX = Math.ceil((x1 - x0) / G), NY = Math.ceil((y1 - y0) / G), N = NX * NY;

// 1) cada comarca, pintada en la rejilla (por el centro de cada celda)
const lab = new Uint8Array(N);
polis.forEach((P, k) => {
  for (let j = 0; j < NY; j++) {
    const y = y0 + (j + 0.5) * G, cortes = [];
    for (let a = 0, b = P.length - 1; a < P.length; b = a++) { const pa = P[a], pb = P[b]; if ((pa[1] > y) !== (pb[1] > y)) cortes.push(pa[0] + (pb[0] - pa[0]) * (y - pa[1]) / (pb[1] - pa[1])); }
    cortes.sort((u, w) => u - w);
    for (let q = 0; q + 1 < cortes.length; q += 2) for (let i = Math.max(0, Math.ceil((cortes[q] - x0) / G - 0.5)); i < NX && x0 + (i + 0.5) * G < cortes[q + 1]; i++) lab[j * NX + i] = k + 1;
  }
});
// 2) Navarra entera sin rayas: lo pintado, engordado y vuelto a adelgazar (un cierre: tapa las rayas estrechas y deja
// el borde de fuera donde estaba). Distancias de chaflán 3-4, en celdas
function distancia(dentro) {
  const d = new Float32Array(N).fill(1e9);
  for (let n = 0; n < N; n++) if (dentro(n)) d[n] = 0;
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const n = j * NX + i; let v = d[n];
    if (i > 0) v = Math.min(v, d[n - 1] + 3); if (j > 0) { v = Math.min(v, d[n - NX] + 3); if (i > 0) v = Math.min(v, d[n - NX - 1] + 4); if (i < NX - 1) v = Math.min(v, d[n - NX + 1] + 4); } d[n] = v; }
  for (let j = NY - 1; j >= 0; j--) for (let i = NX - 1; i >= 0; i--) { const n = j * NX + i; let v = d[n];
    if (i < NX - 1) v = Math.min(v, d[n + 1] + 3); if (j < NY - 1) { v = Math.min(v, d[n + NX] + 3); if (i < NX - 1) v = Math.min(v, d[n + NX + 1] + 4); if (i > 0) v = Math.min(v, d[n + NX - 1] + 4); } d[n] = v; }
  return d;
}
const R = CIERRA / G * 3, dPinta = distancia(n => lab[n] > 0), gordo = (n) => dPinta[n] <= R, dFuera = distancia(n => !gordo(n));
const navarra = (n) => dFuera[n] > R;
// 3) la raya, para la comarca más cercana (por capas desde lo pintado, sin salir de Navarra)
let frente = []; for (let n = 0; n < N; n++) if (lab[n]) frente.push(n);
while (frente.length) {
  const sig = [];
  for (const n of frente) { const i = n % NX; for (const m of [i > 0 ? n - 1 : -1, i < NX - 1 ? n + 1 : -1, n - NX, n + NX]) if (m >= 0 && m < N && !lab[m] && navarra(m)) { lab[m] = lab[n]; sig.push(m); } }
  frente = sig;
}
// (las motas sueltas de una comarca dentro de otra, si las hay, para la de alrededor: solo cuenta el trozo grande de cada una)
{
  const vista = new Uint8Array(N);
  for (let k = 1; k <= C.length; k++) {
    const trozos = [];
    for (let n = 0; n < N; n++) if (lab[n] === k && !vista[n]) { const t = [n]; vista[n] = 1; for (let q = 0; q < t.length; q++) { const a = t[q], i = a % NX; for (const m of [i > 0 ? a - 1 : -1, i < NX - 1 ? a + 1 : -1, a - NX, a + NX]) if (m >= 0 && m < N && lab[m] === k && !vista[m]) { vista[m] = 1; t.push(m); } } trozos.push(t); }
    trozos.sort((a, b) => b.length - a.length);
    for (const t of trozos.slice(1)) { const fuera = t.flatMap(n => [n - 1, n + 1, n - NX, n + NX].map(m => lab[m])).find(v => v !== k) ?? 0; for (const n of t) lab[n] = fuera; console.log(`  ${C[k - 1].id}: un trozo suelto de ${t.length} celdas, para ${fuera ? C[fuera - 1].id : 'fuera'}`); }
  }
}

// 4) los bordes: aristas de la rejilla entre celdas de distinta comarca (o de fuera). Esquina (i, j) en x0 + i G, y0 + j G
const L = (i, j) => i < 0 || j < 0 || i >= NX || j >= NY ? 0 : lab[j * NX + i];
const W1 = NX + 1, ck = (i, j) => j * W1 + i;
// (las aristas de cada esquina: arriba, abajo, izquierda, derecha)
const aristas = (i, j) => {
  const out = [];
  if (L(i - 1, j - 1) !== L(i, j - 1)) out.push([i, j - 1]);
  if (L(i - 1, j) !== L(i, j)) out.push([i, j + 1]);
  if (L(i - 1, j - 1) !== L(i - 1, j)) out.push([i - 1, j]);
  if (L(i, j - 1) !== L(i, j)) out.push([i + 1, j]);
  return out;
};
const nudo = (i, j) => { const s = new Set([L(i - 1, j - 1), L(i, j - 1), L(i - 1, j), L(i, j)]); return s.size >= 3 || aristas(i, j).length === 4; };
const ak = (a, b) => { const p = ck(...a), q = ck(...b); return p < q ? p * 4e7 + q : q * 4e7 + p; };
const usada = new Set(), tramos = [];
// (de qué comarca es el lado izquierdo de una arista, según se recorre de a a b; el otro lado es el derecho)
const lados = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  return [L(Math.floor(mx - dy * 0.5), Math.floor(my + dx * 0.5)), L(Math.floor(mx + dy * 0.5), Math.floor(my - dx * 0.5))]; };
function sigue(a, b) {
  const t = [a, b]; usada.add(ak(a, b));
  while (!nudo(...t.at(-1))) {
    const c = t.at(-1), n = aristas(...c).find(e => !usada.has(ak(c, e)));
    if (!n) break;
    usada.add(ak(c, n)); t.push(n);
  }
  return t;
}
for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) if (nudo(i, j)) for (const e of aristas(i, j)) if (!usada.has(ak([i, j], e))) tramos.push({ P: sigue([i, j], e), cerrado: false });
// (y los bordes cerrados sin ningún nudo: una comarca rodeada por otra sola)
for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) for (const e of aristas(i, j)) if (!usada.has(ak([i, j], e))) { const P = sigue([i, j], e); P.pop(); tramos.push({ P, cerrado: true }); }

// 5) cada tramo, simplificado y suavizado una sola vez (los extremos, quietos: son los de los tramos de al lado)
const enMapa = ([i, j]) => [x0 + i * G, y0 + j * G];
function simplifica(P, eps) {
  if (P.length < 3) return P;
  const d = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], Ln = Math.hypot(dx, dy) || 1e-9; return Math.abs(dx * (a[1] - p[1]) - (a[0] - p[0]) * dy) / Ln; };
  const out = []; const rec = (a, b) => { let m = 0, k = -1; for (let i = a + 1; i < b; i++) { const v = d(P[i], P[a], P[b]); if (v > m) { m = v; k = i; } } if (m > eps) { rec(a, k); rec(k, b); } else out.push(P[a]); };
  rec(0, P.length - 1); out.push(P.at(-1)); return out;
}
const chaikinAbierto = (P) => P.length < 3 ? P : [P[0], ...P.slice(0, -1).flatMap((p, i) => { const q = P[i + 1]; return [[p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]]; }).slice(1, -1), P.at(-1)];
const chaikinCerrado = (P) => P.flatMap((p, i) => { const q = P[(i + 1) % P.length]; return [[p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]]; });
const r2 = (v) => Math.round(v * 100) / 100;
for (const t of tramos) {
  [t.izq, t.der] = lados(t.P[0], t.P[1]);
  const P = t.P.map(enMapa);
  t.Q = (t.cerrado ? chaikinCerrado(chaikinCerrado(simplifica([...P, P[0]], EPS).slice(0, -1))) : chaikinAbierto(chaikinAbierto(simplifica(P, EPS)))).map(([x, y]) => [r2(x), r2(y)]);
}

// 6) cada comarca: sus tramos, con ella a la izquierda, empalmados por los nudos
const out = {};
C.forEach((c, k0) => {
  const k = k0 + 1, mios = [];
  for (const t of tramos) {
    if (t.izq === k) mios.push({ a: ck(...t.P[0]), b: ck(...t.P.at(-1)), Q: t.Q, cerrado: t.cerrado });
    else if (t.der === k) mios.push({ a: ck(...t.P.at(-1)), b: ck(...t.P[0]), Q: [...t.Q].reverse(), cerrado: t.cerrado });
  }
  const anillos = [], libres = new Set(mios);
  for (const m of mios) {
    if (!libres.has(m)) continue;
    libres.delete(m);
    if (m.cerrado) { anillos.push(m.Q); continue; }
    const A = [...m.Q]; let fin = m.b;
    while (fin !== m.a) {
      const n = [...libres].find(x => x.a === fin);
      if (!n) { console.log(`  ${c.id}: un anillo sin cerrar`); break; }
      libres.delete(n); A.push(...n.Q.slice(1)); fin = n.b;
    }
    if (fin === m.a) A.pop();
    anillos.push(A);
  }
  const area = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  anillos.sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
  if (anillos.length > 1) console.log(`  ${c.id}: ${anillos.length} anillos, se queda el grande (${anillos.slice(1).map(a => Math.abs(area(a)).toFixed(1)).join(', ')})`);
  out[c.id] = anillos[0].flat();
  console.log(`${c.id}: ${anillos[0].length} puntos`);
});
writeFileSync('src/data/comarcas-encaje.json', JSON.stringify(out));
console.log(`src/data/comarcas-encaje.json: ${tramos.length} tramos, ${(JSON.stringify(out).length / 1024).toFixed(1)} KB`);
