// El plan de los puentes famosos (src/world/puentesFamosos.js los levanta): la ficha de cada uno y el reparto de su
// tablero y sus arcos según el suelo, el agua y las calles de cada orilla. Sin nada de three.js, para poder ensayarlo
// fuera del juego (tools/puentes-famosos.mjs).
import { clamp } from '../util/math.js';

// n: arcos; luz0: la luz del arco grande (m); ancho: el tablero entre pretiles; pila: el grueso de la pila frente a la luz del
// arco de al lado; pendMax: la cuesta más fuerte del tablero; redondeo: la curva de la clave (m); tajamar: forma aguas
// arriba y aguas abajo y lo que vuela; aliviaderos: ojos en las pilas; rampa: lo que puede alargarse por la orilla baja
// (en Burgui, la del sur queda a ras del agua y el puente sube a su lomo por una rampa, como el de verdad). Medidas de las fichas del patrimonio y de las fotos:
// el de Puente la Reina mide 110 m, con seis arcos románicos desiguales (s. XI) y pilas perforadas; el de Burgui, 55 m
// sobre el Esca, cuatro arcos de medio punto y el peralte de siempre.
export const FAMOSOS = {
  'puente-la-reina': { nombre: /rom[aá]nic/i, titulo: 'Puente de los Peregrinos', n: 6, luz0: 17, luzMax: 19.5, luzMin: 5.5,
    ancho: 4.0, pila: 0.25, pilaMin: 2.8, pilaMax: 5.4, pendMax: 0.17, redondeo: 8, piedra: 'sandstone', sillar: 'sandstone',
    tajamar: { arriba: 'tri', abajo: 'tri', vuelo: 0.8 }, aliviaderos: true },
  'burgui-burgi': { nombre: /burgiko zubia|burgui/i, titulo: 'Puente medieval de Burgui', n: 4, luz0: 13, luzMax: 15, luzMin: 6.5, rampa: 16,
    ancho: 3.3, pila: 0.27, pilaMin: 2.4, pilaMax: 3.8, pendMax: 0.22, redondeo: 5, piedra: 'stone', sillar: 'ashlar',
    tajamar: { arriba: 'tri', abajo: 'redondo', vuelo: 0.75 }, aliviaderos: false },
};

/** La ficha del puente famoso que es este tramo de calle-puente, o null. */
export function especFamoso(id, P) {
  const F = FAMOSOS[id]; if (!F) return null;
  return (P.n && F.nombre.test(P.n)) || (P.mision && !P.n) ? F : null;
}

export const RELLENO = 0.42;   // del trasdós de la clave al tablero (relleno y losas)
export const rosca = (sp) => clamp(0.05 * sp + 0.32, 0.45, 1.05);   // el grueso de las dovelas

/**
 * El tablero y los arcos. perfil: { S, G, GX, W, N, L, ya, yb } del puente (cada metro: s, el suelo más bajo y el más alto
 * de los dos costados y el eje, el agua o −∞; y la altura de la calle en cada punta). Devuelve { Dk, arcos, pilas, w0 } o null.
 */
export function planFamoso(F, { S, G, GX, W, N, L, ya, yb }) {
  const at = (A, s) => { const f = clamp(s / L, 0, 1) * (N - 1), k = Math.min(N - 2, Math.floor(f)); return A[k] + (A[k + 1] - A[k]) * (f - k); };
  const mojados = []; for (let k = 0; k < N; k++) if (W[k] > -1e8) mojados.push(k);
  if (!mojados.length || L < 12) return null;
  const w0 = Math.max(...mojados.map(k => W[k])), sR = (S[mojados[0]] + S[mojados[mojados.length - 1]]) / 2;
  // (el arranque de cada arco: sobre el agua, medio metro por encima; en seco, a ras del suelo más bajo de sus dos pilas)
  const arranque = (a, b) => {
    for (let k = 0; k < N; k++) if (S[k] >= a - 0.3 && S[k] <= b + 0.3 && W[k] > -1e8) return w0 + 0.45;
    return Math.min(at(G, a), at(G, b)) - 0.25;
  };
  // (el lomo: dos rampas rectas desde la calle de cada orilla hasta la clave, en sP, redondeadas arriba)
  const perfil = (H, sP) => {
    const kA = (H - ya) / Math.max(1, sP), kB = (H - yb) / Math.max(1, L - sP);
    let D = S.map(s => Math.min(ya + kA * s, yb + kB * (L - s)));
    const r = Math.max(1, Math.round(F.redondeo * (N - 1) / L));
    // (la ventana, igual a los dos lados y cada vez más corta hacia las puntas: con la de siempre, el primer metro subía de golpe)
    for (let p = 0; p < 2; p++) { const E = D.slice(); for (let k = 1; k < N - 1; k++) { const rk = Math.min(r, k, N - 1 - k); let a = 0; for (let j = k - rk; j <= k + rk; j++) a += E[j]; D[k] = a / (2 * rk + 1); } }
    return D.map((v, k) => Math.max(v, GX[k] + 0.05 - Math.max(0, 2.5 - Math.min(S[k], L - S[k]))));
  };
  // (un arco que empieza —o acaba— en a0: la luz que le cabe bajo el tablero, por tanteo)
  // (tope: hacia las orillas, ninguno más grande que el de dentro)
  const arcoEn = (D, a0, dir, sp, tope = F.luzMax) => {
    for (let it = 0; it < 14; it++) {
      const a = dir > 0 ? a0 : dir < 0 ? a0 - sp : a0 - sp / 2, b = a + sp, alza = at(D, (a + b) / 2) - RELLENO - rosca(sp) - arranque(a, b);
      sp = 0.5 * sp + 0.5 * clamp(2 * alza, 0, tope);
    }
    const a = dir > 0 ? a0 : dir < 0 ? a0 - sp : a0 - sp / 2; return { a, b: a + sp, c: a + sp / 2, sp, ys: arranque(a, a + sp) };
  };
  const encaja = (D) => {
    const M0 = arcoEn(D, sR, 0, 10); M0.grande = true;
    if (M0.sp < F.luzMin || M0.a < 1 || M0.b > L - 1) return [];
    const out = [M0];
    for (const dir of [1, -1]) {
      let u = M0;
      for (let i = 0; i < 16; i++) {
        const p = clamp(F.pila * u.sp, F.pilaMin, F.pilaMax), A = arcoEn(D, dir > 0 ? u.b + p : u.a - p, dir, u.sp * 0.8, Math.min(F.luzMax, u.sp * 0.94));
        if (A.sp < F.luzMin || A.a < 1.2 || A.b > L - 1.2) break;
        out.push(A); u = A;
      }
    }
    return out.sort((x, y) => x.a - y.a);
  };
  // (la clave, sobre el río o algo hacia la orilla alta, si una orilla queda mucho más alta que la otra, como en Burgui)
  let best = null;
  const H0 = Math.max(ya, yb, w0 + 1.5);
  for (let sP = Math.max(L * 0.2, sR - 10); sP <= Math.min(L * 0.8, sR + 30); sP += 2) {
    for (let H = H0 + 0.5; H <= H0 + 22; H += 0.25) {
      if ((H - ya) / Math.max(1, sP) > F.pendMax || (H - yb) / Math.max(1, L - sP) > F.pendMax) break;
      const D = perfil(H, sP), A = encaja(D); if (!A.length) continue;
      const sc = Math.abs(A.length - F.n) * 100 + Math.abs(A.find(a => a.grande).sp - F.luz0) * 6 + (H - H0) * 0.2 + Math.abs(sP - sR) * 0.3;
      if (!best || sc < best.sc) best = { sc, D, A };
    }
  }
  if (!best) return null;
  const pilas = [];
  for (let i = 0; i < best.A.length - 1; i++) { const a = best.A[i], b = best.A[i + 1]; pilas.push({ a: a.b, b: b.a, s: (a.b + b.a) / 2, p: b.a - a.b, ys: Math.min(a.ys, b.ys), alza: Math.min(a.sp, b.sp) / 2 }); }
  return { Dk: best.D, arcos: best.A, pilas, w0 };
}

