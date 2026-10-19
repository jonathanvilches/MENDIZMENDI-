// ---------- La versión compacta (2) de tools/pueblo-real-juego.py, otra vez en la forma de siempre ----------
// (las líneas van como diferencias entre puntos en unidades de 1/q m; el relieve, como lo que se aparta del plano de sus
// tres vecinas; los ríos, solo con los puntos que hacen falta y se vuelven a partir cada 4 m; las casas, como listas)
const dec = (a, q) => { const o = []; let x = 0, z = 0; for (let i = 0; i + 1 < a.length; i += 2) { x += a[i]; z += a[i + 1]; o.push([x / q, z / q]); } return o; };
function unpred(h, n) {
  const o = new Array(h.length);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const k = j * n + i; o[k] = h[k] + (i && j ? o[k - 1] + o[k - n] - o[k - n - 1] : i ? o[k - 1] : j ? o[k - n] : 0); }
  return o;
}
function river(r) {
  const P = dec(r.p, 2), V = []; let v = 0; for (const d of r.lv) { v += d; V.push(v / 10); }
  const pts = [P[0]], lv = [V[0]];
  for (let i = 1; i < P.length; i++) {
    const [x0, z0] = P[i - 1], [x1, z1] = P[i], k = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 4));
    for (let s = 1; s <= k; s++) { const t = s / k; pts.push([x0 + (x1 - x0) * t, z0 + (z1 - z0) * t]); lv.push(V[i - 1] + (V[i] - V[i - 1]) * t); }
  }
  return { n: r.n, w: r.w, pts, lv };
}
export function expand(D) {
  if (!D || D.v !== 2) return D;
  const K = D.casasK;
  const casas = D.casas.map(([x, z, w, d, ry, h, k, a, n]) => ({ x: x / 10, z: z / 10, w: w / 10, d: d / 10, ry: ry / 100, h: h ? h / 10 : null, k: K[k], n: n || null, a }));
  const L = { ...D.lugares };
  for (const k of ['iglesia', 'ayuntamiento', 'fronton']) if (typeof L[k] === 'number') L[k] = casas[L[k]];
  L.fuentes = dec(L.fuentes || [], 2).map(([x, z]) => ({ x, z }));
  if (L.plaza) L.plaza = { ...L.plaza, pts: dec(L.plaza.p, 2) };
  L.plazas = (L.plazas || []).map(p => ({ n: p.n, pts: dec(p.p, 2) }));
  return {
    ...D, v: 1,
    dem: { ...D.dem, h: unpred(D.dem.h, D.dem.n) }, dem2: D.dem2 && { ...D.dem2, h: unpred(D.dem2.h, D.dem2.n) },
    rios: D.rios.map(river),
    balsas: (D.balsas || []).map(b => ({ n: b.n, pts: dec(b.p, 2) })),
    piscinas: (D.piscinas || []).map(b => ({ pts: dec(b.p, 5) })),
    calles: D.calles.map(c => ({ t: c.t, w: c.w, c: c.c, n: c.n, pts: dec(c.p, 2) })),
    puentes: (D.puentes || []).map(c => ({ n: c.n, w: c.w, pts: dec(c.p, 5) })),
    casas, lugares: L,
    usos: (D.usos || []).map(u => ({ k: u.k, n: u.n, pts: dec(u.p, 1) })),
  };
}
