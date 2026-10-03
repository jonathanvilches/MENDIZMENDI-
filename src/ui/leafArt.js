// La hoja de cada planta, dibujada a mano en un lienzo con su forma real (es lo que mejor la identifica): el contorno
// (ovalada, lanceolada, acorazonada…), el borde (liso, aserrado, ondulado, espinoso), los lóbulos (roble, arce,
// espino), las hojas compuestas (fresno), la fronde del helecho, las agujas por parejas de los pinos, las agujas planas
// en dos filas (tejo, abeto), las escamas (tamariz) y las ramitas con hojitas opuestas de las matas.
//   leafImage('roble') → data URL (PNG, 256 px, fondo transparente); se guarda la primera vez
const PI = Math.PI;
const frac = (x) => x - Math.floor(x);

// ---------- hoja simple ----------
// L largo, W medio ancho máximo, a/b forma (ancho ∝ t^a (1-t)^b: a<b ovada, a>b obovada), lob lóbulos {n, d},
// teeth {n, d, dbl}, wavy, spiny {n, d}, cord (base acorazonada), notch (punta escotada), veins 'pin'|'par'|'pal'|'none'
function outline(o) {
  const N = 220, pts = [];
  let pmax = 0; for (let i = 1; i < 100; i++) { const t = i / 100; pmax = Math.max(pmax, Math.pow(t, o.a) * Math.pow(1 - t, o.b)); }
  const w = (t) => {
    let v = o.W * Math.pow(t, o.a) * Math.pow(1 - t, o.b) / pmax;
    if (o.cord) v += o.W * o.cord * Math.max(0, 1 - t / 0.2) ** 2;
    if (o.lob) { const s = Math.abs(Math.sin(PI * o.lob.n * Math.min(1, t * 1.05 + 0.02))); v *= 1 - o.lob.d * (1 - Math.pow(s, o.lob.p ?? 0.7)); }
    if (o.teeth) { const f = frac(t * o.teeth.n); v *= 1 + o.teeth.d * (1 - f) * (1 - f) * (t > 0.06 && t < 0.97 ? 1 : 0); if (o.teeth.dbl) v *= 1 + o.teeth.d * 0.5 * (1 - frac(t * o.teeth.n * 2)) ** 2; }
    if (o.spiny) { const f = frac(t * o.spiny.n); v *= 1 + o.spiny.d * Math.pow(Math.max(0, 1 - Math.abs(f - 0.5) * 2), 6) * (t > 0.08 && t < 0.95 ? 1 : 0) - o.spiny.d * 0.25 * Math.sin(PI * f); }
    if (o.wavy) v *= 1 + o.wavy * Math.sin(2 * PI * 6 * t);
    return v;
  };
  for (let i = 0; i <= N; i++) { const t = i / N; pts.push([w(t), -t * o.L]); }
  return { pts, w };
}
function simple(g, o, c) {
  const { pts, w } = outline(o), base = o.cord ? -o.L * 0.04 : 0, tipY = -o.L * (1 - (o.notch || 0));
  g.beginPath(); g.moveTo(0, base);
  for (const [x, y] of pts) g.lineTo(x, y);
  g.lineTo(0, tipY);
  for (let i = pts.length - 1; i >= 0; i--) g.lineTo(-pts[i][0], pts[i][1]);
  g.closePath();
  const gr = g.createLinearGradient(-o.W, 0, o.W, -o.L); gr.addColorStop(0, shade(c.c, 0.82)); gr.addColorStop(0.55, c.c); gr.addColorStop(1, shade(c.c, 1.12));
  g.fillStyle = gr; g.fill();
  if (c.under) {   // envés de otro color asomando por un lado (álamo, rododendro, olivo, sauce, romero)
    g.save(); g.clip(); g.fillStyle = c.under; g.globalAlpha = 0.85; g.fillRect(-o.W * 2, -o.L * 1.1, o.W * 2, o.L * 1.2); g.restore();
  }
  g.lineWidth = Math.max(1, o.W * 0.03); g.strokeStyle = shade(c.c, 0.55); g.stroke();
  // nervios
  g.strokeStyle = c.vein || shade(c.c, 1.35); g.lineCap = 'round';
  if (o.veins !== 'none') { g.lineWidth = Math.max(1.2, o.W * 0.05); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, tipY * 0.97); g.stroke(); }
  g.lineWidth = Math.max(0.8, o.W * 0.025);
  if (o.veins === 'pin' || !o.veins) {
    const n = o.nv || 7; for (let k = 1; k <= n; k++) { const t = k / (n + 1) * 0.92 + 0.03, t2 = Math.min(0.98, t + 0.1); for (const s of [1, -1]) { g.beginPath(); g.moveTo(0, -t * o.L); g.quadraticCurveTo(s * w(t2) * 0.45, -(t + 0.07) * o.L, s * w(t2) * 0.88, -t2 * o.L); g.stroke(); } }
  } else if (o.veins === 'par') {
    for (const k of [0.33, 0.62]) for (const s of [1, -1]) { g.beginPath(); g.moveTo(0, -o.L * 0.05); g.quadraticCurveTo(s * o.W * k * 1.3, -o.L * 0.5, 0, tipY * 0.97); g.stroke(); }
  } else if (o.veins === 'pal') {
    for (const s of [1, -1]) for (const a of [0.45, 0.95]) { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * o.W * a * 0.4, -o.L * 0.25, s * w(0.25 + a * 0.15) * 0.9, -(0.3 + a * 0.15) * o.L); g.stroke(); }
  }
  if (o.hairs) { g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 0.8; for (let i = 6; i < pts.length - 6; i += 5) for (const s of [1, -1]) { const [x, y] = pts[i]; g.beginPath(); g.moveTo(s * x, y); g.lineTo(s * (x + 3), y - 2); g.stroke(); } }
  if (o.spots) { g.fillStyle = o.spots; for (let i = 0; i < 14; i++) { const t = 0.15 + (i * 0.618 % 1) * 0.7, x = (frac(i * 0.37) - 0.5) * w(t) * 1.2; g.beginPath(); g.ellipse(x, -t * o.L, 3, 5, 0, 0, 2 * PI); g.fill(); } }
}
// rabillo
function stalk(g, len, c, wdt = 3) { g.strokeStyle = c; g.lineWidth = wdt; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, len); g.stroke(); }

// ---------- hoja palmeada (arce, álamo blanco, malva, anémona) ----------
function palm(g, o, c) {
  const S = o.span ?? 1.65 * PI, N = 300, pts = [];
  for (let i = 0; i <= N; i++) {
    const th = -S / 2 + S * i / N, u = (th + S / 2) / S * o.n;
    let r = o.R * (o.rmin + (1 - o.rmin) * Math.pow(Math.abs(Math.sin(PI * u)), o.p ?? 0.6)) * (0.72 + 0.28 * Math.cos(th * 0.7));
    if (o.teeth) r *= 1 + o.teeth.d * (1 - frac(u * o.teeth.n)) ** 2;
    pts.push([Math.sin(th) * r, -Math.cos(th) * r]);
  }
  g.beginPath(); g.moveTo(0, o.R * 0.08); for (const [x, y] of pts) g.lineTo(x, y); g.closePath();
  const gr = g.createRadialGradient(0, -o.R * 0.3, o.R * 0.1, 0, -o.R * 0.3, o.R * 1.1); gr.addColorStop(0, shade(c.c, 1.12)); gr.addColorStop(1, shade(c.c, 0.8));
  g.fillStyle = gr; g.fill(); g.lineWidth = 2; g.strokeStyle = shade(c.c, 0.55); g.stroke();
  if (c.under) { g.save(); g.clip(); g.fillStyle = c.under; g.globalAlpha = 0.8; g.fillRect(o.R * 0.25, -o.R * 1.2, o.R, o.R * 1.4); g.restore(); }
  g.strokeStyle = c.vein || shade(c.c, 1.3); g.lineWidth = 2;
  for (let k = 0; k < o.n; k++) { const th = -S / 2 + S * (k + 0.5) / o.n, r = o.R * (0.72 + 0.28 * Math.cos(th * 0.7)) * 0.92; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.sin(th) * r, -Math.cos(th) * r); g.stroke(); }
}

// ---------- compuesta (fresno): raquis con foliolos ----------
function pinnate(g, o, c) {
  g.strokeStyle = shade(c.c, 0.6); g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -o.L); g.stroke();
  for (let k = 0; k < o.pairs; k++) {
    const y = -o.L * (0.18 + k * 0.78 / o.pairs);
    for (const s of [1, -1]) { g.save(); g.translate(0, y); g.rotate(s * (PI / 2 - 0.35)); simple(g, o.leaf, c); g.restore(); }
  }
  g.save(); g.translate(0, -o.L); simple(g, o.leaf, c); g.restore();
}

// ---------- fronde de helecho ----------
function frond(g, o, c) {
  g.strokeStyle = shade(c.c, 0.55); g.lineWidth = 3; g.beginPath(); g.moveTo(0, 30); g.quadraticCurveTo(6, -o.L * 0.5, 0, -o.L); g.stroke();
  const n = 15;
  for (let k = 0; k < n; k++) {
    const t = 0.1 + k / n * 0.88, y = -o.L * t, len = o.W * 1.12 * Math.pow(1 - t, 0.85) * Math.min(1, (t - 0.02) / 0.14);   // triangular: más ancha abajo
    for (const s of [1, -1]) {
      g.save(); g.translate(2, y); g.rotate(s * (PI / 2 - 0.45 - 0.35 * t));
      g.strokeStyle = shade(c.c, 0.7); g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -len); g.stroke();
      const m = Math.max(3, Math.round(len / 7));
      for (let j = 0; j < m; j++) { const yy = -len * (j + 0.6) / (m + 0.4), r = (len / m) * 0.7 * (1 - j / m * 0.5); for (const q of [1, -1]) { g.fillStyle = shade(c.c, 0.9 + 0.2 * (j % 2)); g.beginPath(); g.ellipse(q * r * 0.7, yy, r * 0.75, r * 0.45, q * 0.5, 0, 2 * PI); g.fill(); } }
      g.restore();
    }
  }
}

// ---------- agujas y escamas ----------
function twig(g, len, c = '#7a5236', w = 5, bend = 10) { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, len / 2); g.quadraticCurveTo(bend, 0, 0, -len / 2); g.stroke(); }
function needles(g, o, c) {   // pinos: haces de dos agujas desde una vaina
  twig(g, o.twig, o.bark || '#8a5a3a', 7, 8);
  const n = o.n ?? 12;
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1), y = o.twig / 2 - t * o.twig * 0.95, s = k % 2 ? 1 : -1;
    for (let j = 0; j < (o.per ?? 2); j++) {
      const a = s * (0.5 + 0.35 * j) + (o.twist ? Math.sin(k * 1.7 + j) * 0.25 : 0) - 0.35 * s * t, L = o.len * (0.85 + 0.15 * Math.sin(k * 2.3 + j));
      g.strokeStyle = shade(c.c, 0.85 + 0.25 * j); g.lineWidth = o.w ?? 2.2; g.beginPath(); g.moveTo(0, y);
      g.quadraticCurveTo(Math.sin(a) * L * 0.5 + (o.twist ? 6 * s : 0), y - Math.cos(a) * L * 0.5, Math.sin(a) * L, y - Math.cos(a) * L); g.stroke();
    }
    g.fillStyle = '#5a3a26'; g.fillRect(-2.5, y - 4, 5, 5);   // vaina
  }
}
function flat2(g, o, c) {      // agujas planas en dos filas (tejo, abeto), con las rayas blancas del envés en el abeto
  twig(g, o.twig, o.bark || '#6a4a2a', 5, 4);
  const n = o.n ?? 22;
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1), y = o.twig / 2 - 6 - t * (o.twig - 12);
    for (const s of [1, -1]) {
      g.save(); g.translate(0, y); g.rotate(s * (PI / 2 - 0.25 - t * 0.25));
      g.fillStyle = c.c; g.beginPath(); g.roundRect(-o.w / 2, -o.len, o.w, o.len, o.w / 2); g.fill();
      if (o.stripes) { g.fillStyle = 'rgba(235,245,240,.85)'; g.fillRect(-o.w * 0.32, -o.len * 0.9, o.w * 0.18, o.len * 0.8); g.fillRect(o.w * 0.14, -o.len * 0.9, o.w * 0.18, o.len * 0.8); }
      g.strokeStyle = shade(c.c, 0.6); g.lineWidth = 1; g.stroke();
      g.restore();
    }
  }
  if (o.berries) for (const [x, y] of [[14, 20], [-12, -40]]) { g.fillStyle = '#d42f3a'; g.beginPath(); g.arc(x, y, 7, 0, 2 * PI); g.fill(); g.fillStyle = '#3a2a1a'; g.beginPath(); g.arc(x, y - 1, 2.5, 0, 2 * PI); g.fill(); }
}
function whorl(g, o, c) {      // agujas en grupos (enebro de 3 en 3; brezo, muchas diminutas)
  twig(g, o.twig, o.bark || '#6a4a2a', o.thin ? 3 : 5, 6);
  const rows = o.rows ?? 8;
  for (let k = 0; k < rows; k++) {
    const y = o.twig / 2 - 8 - k / (rows - 1) * (o.twig - 20);
    for (let j = 0; j < o.per; j++) {
      const a = (j / o.per) * PI * 2 + k * 0.6, s = Math.cos(a) >= 0 ? 1 : -1, ang = s * (0.65 + 0.25 * Math.abs(Math.sin(a)));
      g.strokeStyle = shade(c.c, 0.8 + 0.4 * Math.abs(Math.sin(a))); g.lineWidth = o.w; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, y); g.lineTo(Math.sin(ang) * o.len * Math.abs(Math.cos(a) * 0.5 + 0.6), y - Math.cos(ang) * o.len); g.stroke();
      if (o.stripe) { g.strokeStyle = 'rgba(240,248,240,.75)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, y); g.lineTo(Math.sin(ang) * o.len * 0.6, y - Math.cos(ang) * o.len * 0.85); g.stroke(); }
    }
  }
  if (o.berries) for (const [x, y] of [[16, 10], [-14, -30], [10, -60]]) { g.fillStyle = o.berries; g.beginPath(); g.arc(x, y, 7, 0, 2 * PI); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(x - 2, y - 2, 2.5, 0, 2 * PI); g.fill(); }
  if (o.bells) for (let k = 0; k < 7; k++) { const y = -o.twig / 2 + k * 9, x = (k % 2 ? 1 : -1) * 9; g.fillStyle = o.bells; g.beginPath(); g.ellipse(x, y, 4, 5.5, 0, 0, 2 * PI); g.fill(); }
}
function scales(g, o, c) {     // tamariz: ramitas finas cubiertas de escamas diminutas
  for (const [x, a] of [[-30, -0.4], [0, 0], [30, 0.4]]) {
    g.save(); g.translate(x * 0.6, 20); g.rotate(a);
    g.strokeStyle = shade(c.c, 0.7); g.lineWidth = 3; g.beginPath(); g.moveTo(0, 60); g.lineTo(0, -150); g.stroke();
    for (let y = 50; y > -150; y -= 7) for (const s of [1, -1]) { g.fillStyle = shade(c.c, 0.95 + 0.15 * (y % 2)); g.beginPath(); g.ellipse(s * 3, y, 3, 5, s * 0.5, 0, 2 * PI); g.fill(); }
    g.restore();
  }
}
function spines(g, o, c) {     // tojo: tallo verde lleno de espinas
  twig(g, 220, shade(c.c, 0.8), 6, 6);
  for (let k = 0; k < 20; k++) { const y = 100 - k * 10.5, s = k % 2 ? 1 : -1, a = s * (0.5 + 0.3 * frac(k * 0.37)); g.strokeStyle = shade(c.c, 0.75 + 0.3 * frac(k * 0.61)); g.lineWidth = 3; g.beginPath(); g.moveTo(0, y); g.lineTo(Math.sin(a) * 38, y - Math.cos(a) * 38); g.stroke(); g.lineWidth = 2; g.beginPath(); g.moveTo(Math.sin(a) * 18, y - Math.cos(a) * 18); g.lineTo(Math.sin(a) * 18 + s * 12, y - Math.cos(a) * 18 - 16); g.stroke(); }
  if (o.flowers) for (const [x, y] of [[20, -40], [-18, 0], [16, 40]]) { g.fillStyle = o.flowers; g.beginPath(); g.ellipse(x, y, 9, 7, 0.4, 0, 2 * PI); g.fill(); }
}
// ramita con hojitas opuestas (boj, tomillo, romero, lavanda, siempreviva, lino, genciana…)
function opposite(g, o, c) {
  twig(g, o.twig, o.bark || shade(c.c, 0.7), o.tw ?? 4, 5);
  const n = o.pairs ?? 6;
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1 || 1), y = o.twig / 2 - 10 - t * (o.twig - 30);
    for (const s of o.alt ? [k % 2 ? 1 : -1] : [1, -1]) { g.save(); g.translate(0, y); g.rotate(s * (o.ang ?? 0.9) * (1 - t * 0.3)); simple(g, { ...o.leaf, L: o.leaf.L * (1 - t * (o.shrink ?? 0.2)) }, c); g.restore(); }
  }
  g.save(); g.translate(0, -o.twig / 2 + 14); simple(g, { ...o.leaf, L: o.leaf.L * 0.6 }, c); g.restore();
}
// hojas largas como cintas (narciso, lirio)
function strap(g, o, c) {
  for (const [a, k] of [[-0.25, 1], [0.05, 1.1], [0.3, 0.9], [-0.45, 0.8]]) {
    g.save(); g.translate(0, 110); g.rotate(a);
    g.beginPath(); g.moveTo(-o.w, 0); g.quadraticCurveTo(-o.w * 1.1 + a * 40, -o.L * k * 0.6, a * 60, -o.L * k); g.quadraticCurveTo(o.w * 1.1 + a * 40, -o.L * k * 0.6, o.w, 0); g.closePath();
    g.fillStyle = shade(c.c, 0.9 + k * 0.1); g.fill(); g.strokeStyle = shade(c.c, 0.6); g.lineWidth = 1.5; g.stroke();
    g.strokeStyle = shade(c.c, 1.25); g.lineWidth = 1; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(a * 30, -o.L * k * 0.6, a * 58, -o.L * k * 0.97); g.stroke();
    g.restore();
  }
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, gg = (n >> 8) & 255, b = n & 255, f = (v) => Math.max(0, Math.min(255, Math.round(k > 1 ? v + (255 - v) * (k - 1) : v * k)));
  return `rgb(${f(r)},${f(gg)},${f(b)})`;
}

// ---------- cada especie ----------
const S = (L, W, a, b, x = {}) => ({ L, W, a, b, ...x });
const LEAF = {
  haya: { k: 'simple', o: S(170, 55, 0.6, 0.85, { wavy: 0.035, hairs: true, nv: 8 }), c: { c: '#5f9a3a' }, st: 16 },
  roble: { k: 'simple', o: S(190, 62, 1.1, 0.55, { lob: { n: 4.5, d: 0.55, p: 0.55 }, cord: 0.25, nv: 5 }), c: { c: '#4d7f2c' }, st: 5 },
  castano: { k: 'simple', o: S(215, 42, 0.7, 0.9, { teeth: { n: 17, d: 0.16 }, nv: 14 }), c: { c: '#4f8a2e' }, st: 14 },
  fresno: { k: 'pinnate', o: { L: 200, pairs: 4, leaf: S(62, 15, 0.7, 1, { teeth: { n: 9, d: 0.1 }, nv: 5 }) }, c: { c: '#5a9636' } },
  avellano: { k: 'simple', o: S(165, 70, 0.45, 0.9, { teeth: { n: 15, d: 0.08, dbl: true }, cord: 0.35, nv: 6 }), c: { c: '#5c9338' }, st: 14 },
  tejo: { k: 'flat2', o: { twig: 210, len: 34, w: 6, berries: true }, c: { c: '#244a26' } },
  arce: { k: 'palm', o: { R: 105, n: 5, rmin: 0.38, p: 0.55, teeth: { n: 3, d: 0.06 } }, c: { c: '#5d9a38' }, st: 40 },
  quejigo: { k: 'simple', o: S(170, 48, 0.8, 0.8, { lob: { n: 6, d: 0.22, p: 0.9 }, teeth: { n: 12, d: 0.05 }, nv: 7 }), c: { c: '#6a8c45', under: '#c8cbb2' }, st: 10 },
  encina: { k: 'simple', o: S(120, 38, 0.65, 0.85, { spiny: { n: 6, d: 0.16 }, nv: 6 }), c: { c: '#3e5a2e', under: '#b9bba8' }, st: 8 },
  pino_negro: { k: 'needles', o: { twig: 200, len: 52, n: 14, w: 2.6 }, c: { c: '#244b2a' } },
  abeto: { k: 'flat2', o: { twig: 210, len: 32, w: 6, stripes: true, n: 24 }, c: { c: '#2e5a33' } },
  pino_silvestre: { k: 'needles', o: { twig: 200, len: 55, n: 13, twist: true, w: 2.4, bark: '#c46a3a' }, c: { c: '#4a7a6a' } },
  chopo: { k: 'simple', o: S(140, 75, 0.3, 1.0, { teeth: { n: 16, d: 0.05 }, nv: 5, cord: 0.15 }), c: { c: '#5f9d3c' }, st: 50 },
  alamo: { k: 'palm', o: { R: 95, n: 5, rmin: 0.6, p: 0.8, teeth: { n: 2, d: 0.06 } }, c: { c: '#5d8d3e', under: '#f2f1ea' }, st: 40 },
  sauce: { k: 'simple', o: S(220, 18, 0.8, 1.1, { teeth: { n: 30, d: 0.04 }, nv: 12 }), c: { c: '#6d9a58', under: '#d6dccf' }, st: 8 },
  olivo: { k: 'opposite', o: { twig: 210, pairs: 4, ang: 0.6, leaf: S(95, 11, 0.8, 1.0, { veins: 'none' }) }, c: { c: '#6e7f55', under: '#c5c9b8' } },
  pino_carrasco: { k: 'needles', o: { twig: 210, len: 90, n: 11, w: 1.6 }, c: { c: '#5c8f48' } },
  aliso: { k: 'simple', o: S(150, 62, 0.75, 0.45, { teeth: { n: 12, d: 0.07, dbl: true }, notch: 0.06, nv: 6 }), c: { c: '#3f6e2c' }, st: 16 },
  espino: { k: 'simple', o: S(120, 55, 0.8, 0.5, { lob: { n: 2.5, d: 0.75, p: 0.5 }, teeth: { n: 10, d: 0.06 }, veins: 'pal' }), c: { c: '#4f8a32' }, st: 18 },
  endrino: { k: 'opposite', o: { twig: 210, pairs: 4, alt: true, ang: 0.85, leaf: S(70, 20, 0.8, 0.7, { teeth: { n: 10, d: 0.08 }, nv: 5 }), bark: '#3a2a26', tw: 5 }, c: { c: '#4f8433' } },
  helecho: { k: 'frond', o: { L: 220, W: 85 }, c: { c: '#5f9a36' } },
  acebo: { k: 'simple', o: S(150, 48, 0.75, 0.8, { spiny: { n: 4.5, d: 0.35 }, wavy: 0.02, nv: 6 }), c: { c: '#1f4a24', vein: '#7aa06a' }, st: 8 },
  brezo: { k: 'whorl', o: { twig: 200, per: 4, rows: 16, len: 11, w: 2, thin: true, bells: '#c56aa8' }, c: { c: '#4d6e38' } },
  tojo: { k: 'spines', o: { flowers: '#f2c230' }, c: { c: '#3e6a2e' } },
  boj: { k: 'opposite', o: { twig: 210, pairs: 5, ang: 0.95, leaf: S(42, 15, 0.7, 0.7, { notch: 0.05, nv: 3 }) }, c: { c: '#2d5a26' } },
  enebro: { k: 'whorl', o: { twig: 210, per: 3, rows: 9, len: 32, w: 3.2, stripe: true, berries: '#3a4a7a' }, c: { c: '#4a6a4a' } },
  romero: { k: 'opposite', o: { twig: 210, pairs: 9, ang: 0.75, leaf: S(46, 4, 0.9, 1, { veins: 'none' }) }, c: { c: '#3e5c3a', under: '#e4e8e0' } },
  tomillo: { k: 'opposite', o: { twig: 200, pairs: 10, ang: 0.9, leaf: S(16, 5, 0.8, 0.9, { veins: 'none' }), bark: '#7a6a5a', tw: 3 }, c: { c: '#7a8a70' } },
  rododendro: { k: 'simple', o: S(150, 36, 0.9, 0.75, { nv: 8 }), c: { c: '#2f5626', under: '#a85a2a' }, st: 8 },
  arandano: { k: 'opposite', o: { twig: 200, pairs: 5, alt: true, ang: 0.8, leaf: S(40, 15, 0.7, 0.8, { teeth: { n: 8, d: 0.08 }, nv: 4 }), bark: '#4a7a3a' }, c: { c: '#4e8a3c' } },
  ontina: { k: 'opposite', o: { twig: 200, pairs: 6, ang: 0.9, leaf: S(40, 14, 0.8, 0.8, { lob: { n: 3, d: 0.7, p: 0.5 }, veins: 'none' }), bark: '#9a9a8a', tw: 3 }, c: { c: '#a8ab9a' } },
  tamariz: { k: 'scales', o: {}, c: { c: '#7a9a6a' } },
  eguzkilore: { k: 'simple', o: S(110, 30, 0.8, 0.8, { lob: { n: 6, d: 0.55, p: 0.5 }, spiny: { n: 12, d: 0.25 }, nv: 6 }), c: { c: '#5d6e48', vein: '#d8dccb' }, st: 6 },
  primula: { k: 'simple', o: S(120, 34, 1.0, 0.6, { wavy: 0.04, nv: 9 }), c: { c: '#6aa046' }, st: 6 },
  digital: { k: 'simple', o: S(170, 40, 0.8, 1.0, { teeth: { n: 14, d: 0.04 }, nv: 10, hairs: true }), c: { c: '#5e8a4a' }, st: 6 },
  anemona: { k: 'palm', o: { R: 100, n: 3, rmin: 0.12, p: 0.4, teeth: { n: 4, d: 0.18 }, span: 1.5 * PI }, c: { c: '#4e8a36' }, st: 40 },
  campanilla: { k: 'simple', o: S(100, 50, 0.4, 0.9, { cord: 0.5, teeth: { n: 8, d: 0.05 }, veins: 'pal' }), c: { c: '#5a9a42' }, st: 50 },
  narciso: { k: 'strap', o: { L: 210, w: 9 }, c: { c: '#5f8f5a' } },
  violeta: { k: 'simple', o: S(110, 55, 0.4, 0.9, { cord: 0.6, teeth: { n: 9, d: 0.06 }, veins: 'pal' }), c: { c: '#3f7a32' }, st: 55 },
  genciana: { k: 'opposite', o: { twig: 120, pairs: 2, ang: 1.2, leaf: S(80, 26, 0.7, 0.8, { veins: 'par' }) }, c: { c: '#4a8a40' } },
  amapola: { k: 'simple', o: S(170, 42, 0.8, 0.9, { lob: { n: 6, d: 0.7, p: 0.4 }, teeth: { n: 22, d: 0.06 }, hairs: true, nv: 6 }), c: { c: '#5c8f42' }, st: 6 },
  orquidea: { k: 'simple', o: S(150, 26, 0.7, 1.0, { veins: 'par', spots: 'rgba(60,30,40,.55)' }), c: { c: '#4f8a52' }, st: 6 },
  margarita: { k: 'simple', o: S(120, 26, 1.6, 0.5, { teeth: { n: 6, d: 0.14 }, nv: 4 }), c: { c: '#4f8a38' }, st: 6 },
  lino: { k: 'opposite', o: { twig: 220, pairs: 9, alt: true, ang: 0.5, leaf: S(30, 3, 0.8, 1, { veins: 'none' }), bark: '#6a8a5a', tw: 2 }, c: { c: '#6a9a62' } },
  edelweiss: { k: 'opposite', o: { twig: 180, pairs: 4, alt: true, ang: 0.6, leaf: S(70, 9, 0.8, 1, { veins: 'none', hairs: true }), bark: '#c8c8c0' }, c: { c: '#c9ccc0' } },
  lirio: { k: 'opposite', o: { twig: 220, pairs: 5, alt: true, ang: 0.55, leaf: S(110, 13, 0.7, 1.1, { veins: 'par' }), bark: '#5a8a4a' }, c: { c: '#5a8f4a' } },
  lavanda: { k: 'opposite', o: { twig: 210, pairs: 7, ang: 0.6, leaf: S(55, 5, 0.8, 1, { veins: 'none' }) }, c: { c: '#8a9a88' } },
  jara: { k: 'opposite', o: { twig: 180, pairs: 3, ang: 0.85, leaf: S(85, 26, 0.7, 0.8, { veins: 'par', hairs: true }) }, c: { c: '#9aa38e' } },
  cardo: { k: 'simple', o: S(210, 55, 0.7, 0.8, { lob: { n: 6, d: 0.6, p: 0.5 }, spiny: { n: 14, d: 0.35 }, nv: 6 }), c: { c: '#4f7a44', vein: '#eef2e6' }, st: 6 },
  malva: { k: 'palm', o: { R: 95, n: 7, rmin: 0.72, p: 0.9, teeth: { n: 4, d: 0.08 }, span: 1.75 * PI }, c: { c: '#548f3e' }, st: 55 },
  siempreviva: { k: 'opposite', o: { twig: 210, pairs: 8, alt: true, ang: 0.45, leaf: S(40, 3, 0.8, 1, { veins: 'none' }), bark: '#a8a898', tw: 2 }, c: { c: '#a2a690' } },
};

const cache = new Map();
/** La hoja de una especie como imagen (data URL), o null si no está dibujada. */
export function leafImage(id) {
  if (cache.has(id)) return cache.get(id);
  const D = LEAF[id]; if (!D || typeof document === 'undefined') return null;
  const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d');
  g.translate(N / 2, N / 2); g.scale(0.82, 0.82);
  g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 8; g.shadowOffsetY = 3;
  if (D.k === 'simple') {   // la hoja llena la tarjeta (de la punta del rabillo a la punta de la hoja)
    const tot = D.o.L + (D.st || 0), k = Math.min(1.6, 225 / tot); g.rotate(-0.28); g.scale(k, k); g.translate(0, tot / 2 - (D.st || 0));
    if (D.st) stalk(g, D.st, shade(D.c.c, 0.6)); simple(g, D.o, D.c);
  }
  else if (D.k === 'palm') { const k = Math.min(1.4, 105 / D.o.R); g.rotate(-0.15); g.scale(k, k); g.translate(0, 30); if (D.st) stalk(g, D.st + 30, shade(D.c.c, 0.6), 4); palm(g, D.o, D.c); }
  else if (D.k === 'pinnate') { g.translate(0, 105); g.rotate(-0.25); pinnate(g, D.o, D.c); }
  else if (D.k === 'frond') { g.translate(0, 100); g.rotate(-0.15); frond(g, D.o, D.c); }
  else { g.rotate(-0.35); ({ needles, flat2, whorl, scales, spines, opposite, strap })[D.k](g, D.o, D.c); }
  const url = cv.toDataURL('image/png'); cache.set(id, url); return url;
}
export const hasLeaf = (id) => !!LEAF[id];
