// El material, como en los frontones de verdad (Reglamento de Elecciones de Material de la LEP.M): antes de cada partido
// sale un lote de 10 pelotas, todas entre 102 y 107 g y entre 61,5 y 63 mm de diámetro; cada pelotari elige 2 (por
// parejas, 3 cada pareja) y esas van al cestaño, la caja de las pelotas del partido. Quien saca lo hace con una de las
// suyas y puede cambiarla en cada saque: la viva sale más del frontis y bota más, y el peloteo va más rápido; la pesada
// (la muerta) sale menos y bota menos, y hay que llegar antes. Las de en medio, entre una y otra.
import { mulberry32 } from '../util/math.js';

export const LIMITES = { peso: [102, 107], diam: [61.5, 63] };
export const POR_LADO = (pairs) => pairs ? 3 : 2;

/** El lote: 10 pelotas con su número, peso, diámetro y viveza (de 0, la más pesada y muerta, a 1, la más viva). Las
 *  ligeras suelen ser más vivas, pero no siempre: cada cuero y cada costura es distinto. */
export function lote(seed = 1, n = 10) {
  const r = mulberry32(seed >>> 0 || 1), out = [];
  for (let i = 0; i < n; i++) {
    const peso = Math.round((102.2 + r() * 4.6) * 10) / 10, diam = Math.round((61.6 + r() * 1.3) * 10) / 10;
    const viva = Math.max(0, Math.min(1, (107 - peso) / 5 * 0.6 + r() * 0.4));
    out.push({ n: i + 1, peso, diam, viva: Math.round(viva * 100) / 100 });
  }
  // (del lote se aparta a lo lejos una de cada punta: siempre hay alguna bien viva y alguna bien pesada para elegir)
  out.sort((a, b) => a.viva - b.viva); out[0].viva = Math.min(out[0].viva, 0.15); out[n - 1].viva = Math.max(out[n - 1].viva, 0.85);
  return out.sort((a, b) => a.n - b.n);
}
export const clase = (b) => !b ? 'media' : b.viva > 0.62 ? 'viva' : b.viva < 0.38 ? 'pesada' : 'media';
/** Lo que se nota en la física (para setFeel, por el frontón): cuánto sale del frontis, cuánto bota y cuánto corre. */
export const siente = (b) => { const v = b ? b.viva : 0.5; return { front: 0.91 + 0.17 * v, floor: 0.93 + 0.13 * v, run: 0.98 + 0.05 * v }; };

/** Cómo elige el rival por cómo juega: el que pega fuerte, vivas (le llegan al rebote y acaba los tantos); el de manos,
 *  pesadas (la pelota queda baja y la coloca donde quiere); el que corre mucho, una de cada. */
export function perfil(st = {}) {
  const f = st.fuerza || 3, a = st.agilidad || 3, v = st.velocidad || 3;
  return f >= a + 1 && f >= v ? 'pegador' : a >= f + 1 && a >= v ? 'manos' : 'mixto';
}
export function elige(lot, n, estilo = 'mixto', tomadas = new Set()) {
  const libres = lot.filter(b => !tomadas.has(b.n)).sort((a, b) => a.viva - b.viva);
  if (estilo === 'pegador') return libres.slice(-n);
  if (estilo === 'manos') return libres.slice(0, n);
  // (una de cada punta y, si son tres, la de en medio)
  const out = [libres[0], libres[libres.length - 1]]; if (n > 2) out.push(libres[Math.floor(libres.length / 2)]);
  return out.slice(0, n);
}
/** La pelota con la que saca el rival: perdiendo de tres o más, la más viva (a por los tantos); ganando de tres o más, la
 *  más pesada (a no fallar); si no, la que más le va. */
export function saqueRival(cesta, estilo, nos, ellos) {
  const s = [...cesta].sort((a, b) => a.viva - b.viva);
  if (ellos - nos >= 3) return s[s.length - 1];
  if (nos - ellos >= 3) return s[0];
  return estilo === 'manos' ? s[0] : estilo === 'pegador' ? s[s.length - 1] : s[Math.floor(s.length / 2)];
}
const coma = (x) => String(x).replace('.', ',');
export const pesoTxt = (b) => `${coma(b.peso.toFixed(1))} g`;
export const diamTxt = (b) => `${coma(b.diam.toFixed(1))} mm`;
