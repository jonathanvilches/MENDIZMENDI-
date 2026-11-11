// ¿Se llega andando hasta aquí desde la plaza? Lo usa townGame.repasaAccesos al montar el pueblo para mover a quien da
// una misión, cuenta un cuento o hay que coger, si quedó encerrado, a un sitio cercano al que sí se llega (noviembre de
// 2026: en algunos pueblos había una barrera invisible entre el jugador y la persona de la misión: casas o tapias
// alrededor, un corro de árboles, un alto al que no se sube, la otra orilla o el otro lado del límite del mundo).
// Busca un camino desde lo que queda a distancia de hablar o de coger hasta la plaza, por una rejilla de medio metro,
// con las reglas del personaje (actors/player.js): los choques (con algo de holgura, para no colarse entre dos árboles
// casi juntos), el agua de más de 95 cm fuera de los puentes, los escalones de más de 36 cm con cuesta de más de 1,25
// y el límite del mundo. Los escalones cuentan en los dos sentidos: un sitio al que se baja pero del que no se sube
// tampoco vale, que el jugador quedaría atrapado. Y tampoco un rodeo exagerado: el camino puede ser hasta 2,2 veces la
// distancia en línea recta más 120 m (cruzar el río por el puente, como en Aribe, o bajar a la foz de Lumbier, de unos
// 320 m en línea recta y 800 andando, valen). Busca hacia la plaza (un A* con algo de prisa,
// en ocho direcciones sin cortar esquinas), así en campo abierto llega en unos cientos de pasos; lo ya recorrido se
// recuerda: lo que llega, con lo que le falta hasta la plaza, y lo encerrado sirven para las preguntas siguientes.
// La comprobación de todo el pueblo de una vez, para las pruebas, es tools/accesos.mjs.
//   empiezaAccesos(x, z)   la plaza; alcanzable(x, z, rad) → true, false (encerrado o rodeo) o null (no se sabe)
//   sitiosBuenos(x, z, d)   sitios de los caminos ya encontrados, a menos de d m, desde los que se llega sin rodeo
//   acabaAccesos()          olvida lo calculado
import { nearby } from './colliders.js';
import { groundHeight, waterLevelAt, bridgeAt } from './heightfield.js';
import { BOUNDARY } from './layout.js';

const R = 0.45, S = 0.5, H = 480, NI = Math.round(2 * H / S) + 1, LLEGA = 18, W = 1.25, D2 = S * Math.SQRT2;
// (cuánto rodeo se acepta: el camino, como mucho, RODEO veces la línea recta más RODEO0 metros)
const RODEO = 2.2, RODEO0 = 120;
let M = null;
/** Lo que costó la última pregunta (para las pruebas) */
export const ultima = { pasos: 0 };
const BLOQ = -1e9;

export function empiezaAccesos(px, pz) { M = { px, pz, alt: new Map(), buenas: new Map(), malas: new Set() }; }
export function acabaAccesos() { M = null; }

const ci = (x) => Math.round((x + H) / S), cx = (i) => -H + i * S;
// la altura del suelo de la casilla, o BLOQ si no se puede estar en ella
function alt(k) {
  let h = M.alt.get(k); if (h !== undefined) return h;
  const i = k % NI, j = (k - i) / NI, x = cx(i), z = cx(j);
  h = BLOQ;
  if (Math.pow(x ** 4 + z ** 4, 0.25) <= (BOUNDARY || 462) && (bridgeAt(x, z) || waterLevelAt(x, z) - groundHeight(x, z) <= 0.95)) {
    let libre = true;
    for (const c of nearby(x, z, R + 2)) {
      if (c.ghost) continue;
      if (c.type === 'circle') { if (Math.hypot(x - c.x, z - c.z) < c.r + R) { libre = false; break; } continue; }
      const dx = x - c.x, dz = z - c.z, lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
      const qx = Math.max(-c.hw, Math.min(c.hw, lx)), qz = Math.max(-c.hd, Math.min(c.hd, lz));
      if (Math.hypot(lx - qx, lz - qz) < R) { libre = false; break; }
    }
    if (libre) h = groundHeight(x, z);
  }
  M.alt.set(k, h); return h;
}
// (la cola: un montón binario por la distancia a la plaza)
function Cola() { const k = [], p = []; return {
  get n() { return k.length; },
  mete(v, pr) { k.push(v); p.push(pr); let i = k.length - 1; while (i > 0) { const q = (i - 1) >> 1; if (p[q] <= p[i]) break; [k[q], k[i]] = [k[i], k[q]]; [p[q], p[i]] = [p[i], p[q]]; i = q; } },
  saca() { const v = k[0], lk = k.pop(), lp = p.pop(); if (k.length) { k[0] = lk; p[0] = lp; let i = 0; for (;;) { const a = 2 * i + 1, b = a + 1; let m = i; if (a < k.length && p[a] < p[m]) m = a; if (b < k.length && p[b] < p[m]) m = b; if (m === i) break; [k[m], k[i]] = [k[i], k[m]]; [p[m], p[i]] = [p[i], p[m]]; i = m; } } return v; },
}; }

const VEC = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
/** ¿Se llega andando desde la plaza a menos de rad metros de (x, z), sin un rodeo enorme? true, false o null (se dejó
 *  de buscar: max pasos) */
export function alcanzable(x, z, rad = 2.6, max = 80000) {
  if (!M) return true;
  const i0 = ci(x), j0 = ci(z), r = Math.ceil(rad / S), cola = Cola(), de = new Map(), g = new Map();
  const lejos = (k) => { const i = k % NI, j = (k - i) / NI; return Math.hypot(cx(i) - M.px, cx(j) - M.pz); };
  const tope = RODEO * Math.hypot(x - M.px, z - M.pz) + RODEO0;
  let algo = false;
  for (let j = j0 - r; j <= j0 + r; j++) for (let i = i0 - r; i <= i0 + r; i++) {
    if (Math.hypot(cx(i) - x, cx(j) - z) > rad) continue;
    const k = j * NI + i; if (alt(k) === BLOQ || M.malas.has(k)) continue;
    if (M.buenas.has(k) && M.buenas.get(k) <= tope) return true;
    de.set(k, -1); g.set(k, 0); cola.mete(k, W * lejos(k)); algo = true;
  }
  if (!algo) return false;
  let pasos = 0, podado = false;
  while (cola.n) {
    const k = cola.saca(), gk = g.get(k), lk = lejos(k), bk = M.buenas.get(k);
    if (bk !== undefined || lk < LLEGA) {   // llega: lo que le falta a cada casilla del camino, también para las siguientes
      const total = gk + (bk ?? lk);
      if (total <= tope) {
        for (let q = k; q >= 0; q = de.get(q)) { const f = total - g.get(q), b = M.buenas.get(q); if (b === undefined || f < b) M.buenas.set(q, f); }
        ultima.pasos = pasos; return true;
      }
      podado = true; continue;   // (llega, pero dando demasiada vuelta: se sigue buscando otro camino)
    }
    if (gk + lk > tope) { podado = true; continue; }   // (por aquí ya no llega a tiempo)
    if (++pasos > max) { ultima.pasos = pasos; return null; }
    const i = k % NI, j = (k - i) / NI, h = alt(k);
    for (const [di, dj] of VEC) {
      const a = i + di, b = j + dj, n = b * NI + a, paso = di && dj ? D2 : S;
      if (M.malas.has(n)) continue;
      const hn = alt(n); if (hn === BLOQ) continue;
      if (di && dj && (alt(j * NI + a) === BLOQ || alt(b * NI + i) === BLOQ)) continue;   // (sin colarse por una esquina)
      const d = Math.abs(hn - h); if (d > 0.36 && d / paso > 1.25) continue;
      const gn = gk + paso, go = g.get(n); if (go !== undefined && go <= gn) continue;
      de.set(n, k); g.set(n, gn); cola.mete(n, gn + W * lejos(n));
    }
  }
  // (sin salida: encerrado, y todo lo recorrido también. Si se dejó algo por el rodeo, lo de alrededor puede llegar
  // por otro lado a otro sitio: no se apunta)
  if (!podado) for (const k of de.keys()) M.malas.add(k);
  ultima.pasos = pasos; return false;
}

/** Sitios de los caminos ya encontrados a menos de d metros de (x, z), del más cercano al más lejano (separados al
 *  menos 3 m), desde los que se llega a la plaza sin un rodeo enorme: a donde llevar lo que quedó encerrado sin volver
 *  a buscar caminos (antes, probar cada hueco con una búsqueda nueva costaba segundos en Lumbier) */
export function sitiosBuenos(x, z, d = 80, n = 12) {
  if (!M) return [];
  const L = [];
  for (const [k, f] of M.buenas) {
    const i = k % NI, j = (k - i) / NI, px = cx(i), pz = cx(j), dd = Math.hypot(px - x, pz - z);
    if (dd > d || f > RODEO * Math.hypot(px - M.px, pz - M.pz) + RODEO0 - 2) continue;
    L.push({ x: px, z: pz, d: dd });
  }
  L.sort((a, b) => a.d - b.d);
  const out = [];
  for (const p of L) { if (out.some(q => Math.hypot(q.x - p.x, q.z - p.z) < 3)) continue; out.push(p); if (out.length >= n) break; }
  return out;
}
