// Relieve real (src/data/relieve.js): lo que se ve desde cada mirador, término a término, y el horizonte de cada pueblo.
// Los datos vienen comprimidos; se abren una vez (unos milisegundos) antes de construir el pueblo. Si el navegador no
// sabe descomprimirlos, el juego sigue con sus montes de siempre.
import { RELIEVE, RELIEVE_DATA } from '../data/relieve.js';

let bytes = null, prom = null;
/** Abre los datos (una sola vez). Devuelve una promesa que no falla nunca. */
export function cargarRelieve() {
  if (prom) return prom;
  prom = (async () => {
    try {
      if (typeof DecompressionStream === 'undefined') return null;
      const bin = Uint8Array.from(atob(RELIEVE_DATA), c => c.charCodeAt(0));
      const st = new Blob([bin]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      bytes = new Uint8Array(await new Response(st).arrayBuffer());
    } catch (e) { console.warn('relieve', e); bytes = null; }
    return bytes;
  })();
  return prom;
}
// lector de los números: cada uno, lo que cambia respecto al anterior (con signo, en bytes de 7 bits)
function reader(o) {
  let p = o;
  return () => { let v = 0, s = 0, b; do { b = bytes[p++]; v += (b & 127) * 2 ** s; s += 7; } while (b & 128); return v % 2 ? -(v + 1) / 2 : v / 2; };
}
const cache = new Map();
/**
 * Lo que se ve desde el mirador de un pueblo, o null: { lat, lon, alt (m, a la altura de los ojos), edges (km),
 * M (grados; [término][rumbo de 0 a 359]: lo más alto que se ve hasta esa distancia), montes: { id: { n, st, k, j, prof } } }
 * (prof: la silueta fina del monte, 2n+1 rumbos cada st grados alrededor del suyo, que vale para el término k; su
 * cumbre está en el rumbo j·st)
 */
export function relieveMirador(id) {
  const T = RELIEVE.towns[id]; if (!T || !bytes) return null;
  if (cache.has(id)) return cache.get(id);
  const next = reader(T.o), E = RELIEVE.edges, M = E.map(() => new Float32Array(360));
  for (let k = 0; k < E.length; k++) { let v = 0; for (let i = 0; i < 360; i++) { v += next(); M[k][i] = v * RELIEVE.units[k]; } }
  for (let k = 1; k < E.length; k++) for (let i = 0; i < 360; i++) M[k][i] = Math.max(M[k][i], M[k - 1][i]);
  const montes = {};
  for (const m of T.m) { const prof = new Float32Array(2 * m.n + 1); let v = 0; for (let i = 0; i < prof.length; i++) { v += next(); prof[i] = v * RELIEVE.fu; } montes[m.id] = { ...m, prof }; }
  const R = { lat: T.lat, lon: T.lon, alt: T.alt, edges: E, M, montes };
  cache.set(id, R); return R;
}
/** Horizonte real de un pueblo: tangente del ángulo en 360 rumbos (grado a grado), o null. */
export function horizonteReal(id) {
  const o = RELIEVE.hor[id]; if (o == null || !bytes) return null;
  const next = reader(o), st = RELIEVE.hstep, n = Math.round(360 / st), a = new Float32Array(n);
  let v = 0; for (let i = 0; i < n; i++) { v += next(); a[i] = v * RELIEVE.hunit; }
  const out = new Float32Array(360);
  for (let b = 0; b < 360; b++) { const x = b / st, i = Math.floor(x), f = x - i; out[b] = Math.max(0.003, Math.tan((a[i % n] * (1 - f) + a[(i + 1) % n] * f) * Math.PI / 180)); }   // (no por debajo del pueblo)
  return out;
}

// ---------- Relieve de detalle de los miradores (tools/relieve/polar.py) ----------
// Las alturas reales alrededor del ojo del mirador en una malla polar: cada anillo (km) con sus alturas (m) rumbo a rumbo.
// Un archivo por mirador, que solo se abre en su pueblo (en la web, se descarga entonces).
const POLAR = import.meta.glob('../data/polar/*.js', { import: 'default' });
const polares = new Map();
/** Promesa con { alt, lat, lon, rs (km), rows (alturas de cada anillo, rumbo a rumbo desde el norte) } o null. */
export function relievePolar(id) {
  if (polares.has(id)) return polares.get(id);
  const load = POLAR[`../data/polar/${id}.js`];
  const p = !load || typeof DecompressionStream === 'undefined' ? Promise.resolve(null) : load().then(descifrarPolar).catch((e) => { console.warn('relieve de detalle', e); return null; });
  polares.set(id, p); return p;
}
async function descifrarPolar(D) {
  const bin = Uint8Array.from(atob(D.data), c => c.charCodeAt(0));
  const b = new Uint8Array(await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
  // (lo mismo que polar.py: anillos, rumbos de cada uno y precisión; y lo esperado, la mediana de las vecinas)
  const rs = []; for (let r = D.r0; r <= D.rmax; r += Math.max(D.step, r * (r < D.rsplit ? D.f1 : D.f2))) rs.push(r);
  const nbOf = (r) => r < D.near[0] ? Math.floor(D.nb / 4) : r < D.near[1] || r >= D.rsplit ? Math.floor(D.nb / 2) : D.nb;
  const qOf = (r) => Math.min(D.qmax, Math.max(D.qmin, r * D.qk));
  const up = (a, n) => { if (a.length === n) return a; const o = new Float64Array(n), la = a.length; for (let i = 0; i < n; i++) { const x = i * la / n, k = Math.floor(x), f = x - k; o[i] = a[k % la] * (1 - f) + a[(k + 1) % la] * f; } return o; };
  let p = 0; const next = () => { let v = 0, s = 0, c; do { c = b[p++]; v += (c & 127) * 2 ** s; s += 7; } while (c & 128); return v % 2 ? -(v + 1) / 2 : v / 2; };
  const rows = []; let prev = null;
  for (let j = 0; j < rs.length; j++) {
    const n = nbOf(rs[j]), q = qOf(rs[j]), r = new Float64Array(n), pv = j ? up(prev, n) : null; let last = 0;
    for (let i = 0; i < n; i++) {
      let pred;
      if (!j) pred = last;
      else if (!i) pred = pv[0];
      else { const a = last, bb = pv[i], c = pv[i - 1]; pred = c >= Math.max(a, bb) ? Math.min(a, bb) : c <= Math.min(a, bb) ? Math.max(a, bb) : a + bb - c; }
      r[i] = pred + next() * q; last = r[i];
    }
    rows.push(r); prev = r;
  }
  if (p !== b.length) throw new Error(`relieve de detalle: sobran ${b.length - p} bytes`);
  return { alt: D.alt, lat: D.lat, lon: D.lon, rs: Float64Array.from(rs), rows: rows.map(r => Float32Array.from(r)) };
}
