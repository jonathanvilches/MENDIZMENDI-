// El atlas de hojas de los árboles (world/arbol.js): cada celda, una ramilla de su especie con sus hojas una a una
// (forma y borde de cada especie, nervios, luz de un lado, envés, sombra sobre la de debajo), dibujada con código, sin
// fotos ni texturas de nadie. Se pinta al doble de tamaño y se reduce (bordes suaves), y lo transparente se rellena con
// el color de la hoja más cercana (sin halos blancos ni negros al alejarse). Lo usa tools/hojas-atlas.mjs.
//   pintaAtlas(S) → lienzo de S × S con las celdas de src/world/hojasCeldas.js (4 × 4)
//   pintaCortezaHaya(S) → lienzo de S × S, enlosable: la corteza lisa y gris de la haya, con líquenes y anillos
import { CELDAS } from '../src/world/hojasCeldas.js';

function azar(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const fr = (x) => x - Math.floor(x);

// La forma de cada hoja: semiancho a lo largo (t: 0 en el pecíolo, 1 en la punta) y el borde (dientes, ondas, lóbulos)
const FORMA = {
  haya: { w: t => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.82)), 0.8), b: t => 1 + 0.045 * Math.sin(t * Math.PI * 15), venas: 7, ang: 0.72, pec: 0.1 },
  roble: { w: t => 0.28 + 0.72 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.7)), 0.75), b: t => t < 0.06 ? 1.25 : 0.5 + 0.5 * Math.pow(Math.abs(Math.cos(t * Math.PI * 4.6 + 0.3)), 0.5), venas: 5, ang: 0.85, pec: 0.03 },
  castano: { w: t => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.92)), 1.1), b: t => 1 + 0.13 * Math.pow(1 - fr(t * 19), 2.5) * Math.min(1, t * 6), venas: 16, ang: 0.62, pec: 0.06 },
  chopo: { w: t => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.48)), 1.5) * (t < 0.12 ? 0.6 + t * 3.3 : 1), b: t => 1 + 0.035 * Math.sin(t * Math.PI * 34), venas: 5, ang: 0.9, pec: 0.38 },
  manzano: { w: t => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.7)), 0.85), b: t => 1 + 0.05 * Math.pow(1 - fr(t * 26), 2), venas: 7, ang: 0.7, pec: 0.22 },
  olivo: { w: t => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.9)), 0.7), b: () => 1, venas: 0, ang: 0.6, pec: 0.04 },
  boj: { w: t => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.85)), 0.6), b: () => 1, venas: 0, ang: 0.6, pec: 0.03 },
};

// Una hoja: en (x, y), apuntando a «a» (radianes, 0 = hacia arriba), largo L y ancho W (semiancho máximo), con su color
// [h, s, l], escorzo «k» (0…1: lo ancha que se ve) y «enves» (se ve por debajo: más clara y gris)
function hoja(g, rnd, f, x, y, a, L, W, col, k = 1, enves = false) {
  const F = FORMA[f], N = 48, asim = [0.94 + rnd() * 0.12, 0.94 + rnd() * 0.12], fase = rnd() * 6;
  let [h, s, l] = col; if (enves) { s *= 0.6; l = Math.min(88, l + 14); h += 8; }
  g.save(); g.translate(x, y); g.rotate(a);
  // pecíolo
  const P = L * F.pec;
  g.strokeStyle = `hsl(${h - 30},${s * 0.6}%,${l * 0.62}%)`; g.lineWidth = Math.max(1, W * 0.09); g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -P); g.stroke();
  g.translate(0, -P);
  const path = new Path2D();
  path.moveTo(0, 0);
  for (let i = 1; i <= N; i++) { const t = i / N; path.lineTo(W * k * asim[0] * F.w(t) * F.b(t + fase * 0.01), -L * t); }
  for (let i = N - 1; i >= 1; i--) { const t = i / N; path.lineTo(-W * k * asim[1] * F.w(t) * F.b(t + fase * 0.013 + 0.03), -L * t); }
  path.closePath();
  g.save(); g.shadowColor = 'rgba(8,24,4,0.42)'; g.shadowBlur = W * 0.5; g.shadowOffsetX = W * 0.12; g.shadowOffsetY = W * 0.22;
  g.fillStyle = `hsl(${h},${s}%,${l}%)`; g.fill(path); g.restore();
  g.save(); g.clip(path);
  // pliegue en el nervio: una mitad más clara que la otra
  const gr = g.createLinearGradient(-W * k, 0, W * k, 0);
  gr.addColorStop(0, `hsla(${h + 6},${s}%,${Math.min(92, l + 13)}%,0.55)`); gr.addColorStop(0.5, `hsla(${h},${s}%,${l}%,0)`); gr.addColorStop(0.52, `hsla(${h},${s}%,${l * 0.7}%,0.25)`); gr.addColorStop(1, `hsla(${h - 4},${s}%,${l * 0.6}%,0.45)`);
  g.fillStyle = gr; g.fillRect(-W * 1.3, -L * 1.05, W * 2.6, L * 1.1);
  // la base, algo más amarilla y clara; la punta, más oscura
  const gl = g.createLinearGradient(0, 0, 0, -L);
  gl.addColorStop(0, `hsla(${h - 10},${s}%,${Math.min(90, l + 8)}%,0.35)`); gl.addColorStop(0.6, 'hsla(0,0%,0%,0)'); gl.addColorStop(1, `hsla(${h},${s}%,${l * 0.55}%,0.3)`);
  g.fillStyle = gl; g.fillRect(-W * 1.3, -L * 1.05, W * 2.6, L * 1.1);
  // nervios: el central y los laterales, hacia la punta
  if (f !== 'boj') {
    const vc = `hsla(${h - 8},${s * 0.7}%,${Math.min(94, l + 22)}%,`;
    g.strokeStyle = vc + '0.75)'; g.lineWidth = Math.max(0.8, W * 0.07);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(W * 0.04, -L * 0.5, 0, -L * 0.96); g.stroke();
    g.lineWidth = Math.max(0.6, W * 0.028); g.strokeStyle = vc + '0.42)';
    for (let v = 1; v <= F.venas; v++) {
      const t0 = v / (F.venas + 1) * 0.92, t1 = Math.min(0.99, t0 + F.ang * 0.16);
      for (const sd of [-1, 1]) { const ex = sd * W * k * F.w(t1) * 0.96; g.beginPath(); g.moveTo(0, -L * t0); g.quadraticCurveTo(ex * 0.5, -L * (t0 + (t1 - t0) * 0.35), ex, -L * t1); g.stroke(); }
    }
  }
  // motas y brillo (la cara de arriba brilla un poco)
  for (let i = 0; i < 6; i++) { g.fillStyle = `hsla(${h + (rnd() - 0.5) * 20},${s}%,${l * (0.7 + rnd() * 0.5)}%,0.18)`; g.beginPath(); g.ellipse((rnd() - 0.5) * W * k, -L * (0.15 + rnd() * 0.75), W * (0.1 + rnd() * 0.2), W * (0.08 + rnd() * 0.15), rnd() * 3, 0, 7); g.fill(); }
  if (!enves) { const sh = g.createRadialGradient(-W * k * 0.3, -L * 0.45, 0, -W * k * 0.3, -L * 0.45, L * 0.45); sh.addColorStop(0, 'hsla(70,40%,95%,0.16)'); sh.addColorStop(1, 'hsla(70,40%,95%,0)'); g.fillStyle = sh; g.fillRect(-W * 1.3, -L, W * 2.6, L); }
  g.restore();
  // borde: una línea fina algo más oscura
  g.strokeStyle = `hsla(${h},${s}%,${l * 0.5}%,0.5)`; g.lineWidth = Math.max(0.7, W * 0.035); g.stroke(path);
  g.restore();
}

// Ramilla: un tallo que se adelgaza, en zigzag suave, de (x0, y0) hacia «a» con largo L; devuelve los nudos a lo largo
function tallo(g, rnd, x0, y0, a, L, r0, col = [28, 30, 32], zig = 0.08, n = 8) {
  const pts = [[x0, y0]]; let x = x0, y = y0, aa = a;
  for (let i = 1; i <= n; i++) { aa += (i % 2 ? 1 : -1) * zig + (rnd() - 0.5) * 0.06; x += Math.sin(aa) * L / n; y -= Math.cos(aa) * L / n; pts.push([x, y]); }
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = 1; i < pts.length; i++) {
    const t = i / pts.length, w = Math.max(0.8, r0 * (1 - t * 0.75));
    g.strokeStyle = `hsl(${col[0]},${col[1]}%,${col[2] * (0.85 + 0.3 * (1 - t))}%)`; g.lineWidth = w;
    g.beginPath(); g.moveTo(pts[i - 1][0], pts[i - 1][1]); g.lineTo(pts[i][0], pts[i][1]); g.stroke();
    // brillo a un lado del tallo
    g.strokeStyle = `hsla(${col[0] + 10},${col[1]}%,${col[2] * 1.7}%,0.35)`; g.lineWidth = w * 0.35;
    g.beginPath(); g.moveTo(pts[i - 1][0] - w * 0.2, pts[i - 1][1]); g.lineTo(pts[i][0] - w * 0.2, pts[i][1]); g.stroke();
  }
  return pts.map((p, i) => ({ x: p[0], y: p[1], t: i / n, a: i < n ? Math.atan2(pts[i + 1][0] - p[0], -(pts[i + 1][1] - p[1])) : aa }));
}

// Ramillas de hoja ancha: alternas a los dos lados del tallo, de menos a más y otra vez a menos hacia la punta; detrás las
// oscuras, delante las claras; alguna se ve por el envés
function ramillaAncha(g, rnd, C, f, col, o) {
  const x0 = C * 0.5, y0 = C * 0.98, Lt = C * o.largo;
  const hojas = [];
  const main = tallo(g, rnd, x0, y0, (rnd() - 0.5) * 0.25, Lt, C * 0.012, o.tallo, o.zig ?? 0.1, o.n);
  const pon = (nodos, n, esc, desde = 0.18) => {
    for (let i = 0; i < n; i++) {
      const t = desde + (1 - desde) * (i + 0.5) / n, nd = nodos[Math.min(nodos.length - 1, Math.round(t * (nodos.length - 1)))];
      const sd = i % 2 ? 1 : -1, tam = (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, t * 1.05))) * esc * (0.85 + rnd() * 0.3);
      hojas.push({ x: nd.x, y: nd.y, a: nd.a + sd * (o.abre + (rnd() - 0.5) * 0.35) + (t > 0.9 ? -sd * o.abre * 0.7 : 0), L: C * o.L * tam, W: C * o.W * tam, k: 0.6 + rnd() * 0.4, z: rnd(), enves: rnd() < (o.enves ?? 0.12) });
    }
    hojas.push({ x: nodos[nodos.length - 1].x, y: nodos[nodos.length - 1].y, a: nodos[nodos.length - 1].a + (rnd() - 0.5) * 0.2, L: C * o.L * esc * 0.85, W: C * o.W * esc * 0.85, k: 0.9, z: 0.9, enves: false });
  };
  pon(main, o.hojas, 1);
  // una o dos ramillas laterales
  for (let j = 0; j < (o.lat ?? 2); j++) {
    const nd = main[Math.round(Math.min(0.85, 0.3 + j * (0.55 / Math.max(1, (o.lat ?? 2) - 1))) * (main.length - 1))], sd = j % 2 ? 1 : -1;
    const lat = tallo(g, rnd, nd.x, nd.y, nd.a + sd * (0.7 + rnd() * 0.3), Lt * (0.42 - j * 0.08), C * 0.007, o.tallo, (o.zig ?? 0.1) * 0.8, 5);
    pon(lat, Math.max(3, Math.round(o.hojas * 0.45)), 0.85, 0.1);
  }
  hojas.sort((a, b) => a.z - b.z);
  for (const hj of hojas) { const c = [col[0] + (rnd() - 0.5) * 10, col[1] * (0.85 + rnd() * 0.3), col[2] * (0.72 + hj.z * 0.45)]; hoja(g, rnd, f, hj.x, hj.y, hj.a, hj.L, hj.W, c, hj.k, hj.enves); }
  if (o.fruto) for (let i = 0; i < o.fruto; i++) { const nd = main[Math.round((0.3 + i * 0.5 / o.fruto + rnd() * 0.08) * (main.length - 1))], r = C * o.frutoR * (0.85 + rnd() * 0.3); fruto(g, nd.x + (i % 2 ? 1 : -1) * C * (0.04 + rnd() * 0.03), nd.y + r * 1.4, r, o.frutoCol); }
}
function fruto(g, x, y, r, col) {
  g.strokeStyle = 'hsl(30,35%,28%)'; g.lineWidth = Math.max(1, r * 0.12); g.beginPath(); g.moveTo(x, y - r * 2); g.lineTo(x, y - r * 0.8); g.stroke();
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  gr.addColorStop(0, `hsl(${col[0] + 20},${col[1]}%,${Math.min(85, col[2] + 25)}%)`); gr.addColorStop(0.55, `hsl(${col[0]},${col[1]}%,${col[2]}%)`); gr.addColorStop(1, `hsl(${col[0] - 5},${col[1]}%,${col[2] * 0.55}%)`);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
}

// Abeto: brote principal y brotes laterales en un plano, con las acículas planas y cortas en peine a los dos lados; las
// puntas de los brotes, más claras (el crecimiento nuevo); alguna acícula enseña el envés plateado
function ramaAbeto(g, rnd, C, col, lados = 5) {
  const x0 = C * 0.5, y0 = C * 0.98;
  const eje = tallo(g, rnd, x0, y0, (rnd() - 0.5) * 0.12, C * 0.9, C * 0.014, [26, 35, 30], 0.03, 10);
  const brotes = [eje];
  for (let j = 0; j < lados; j++) {
    const t = 0.16 + j * (0.66 / lados), nd = eje[Math.round(t * (eje.length - 1))], sd = j % 2 ? 1 : -1;
    brotes.push(tallo(g, rnd, nd.x, nd.y, nd.a + sd * (0.75 + rnd() * 0.25), C * (0.42 - t * 0.28) * (0.9 + rnd() * 0.2), C * 0.008, [26, 35, 30], 0.03, 6));
  }
  for (const br of brotes) {
    for (let i = 0; i < br.length - 1; i++) {
      const p = br[i], q = br[i + 1], seg = 8;
      for (let s = 0; s < seg; s++) {
        const t = (i + s / seg) / (br.length - 1), x = p.x + (q.x - p.x) * s / seg, y = p.y + (q.y - p.y) * s / seg, L = C * 0.075 * (1 - t * 0.35) * (0.85 + rnd() * 0.3);
        for (const sd of [-1, 1]) {
          const a = p.a + sd * (1.25 + (rnd() - 0.5) * 0.3) - sd * t * 0.2, nuevo = Math.max(0, (t - 0.72) * 3.5), plata = rnd() < 0.12;
          const l = col[2] * (0.8 + rnd() * 0.35) + nuevo * 18 + (plata ? 22 : 0), h = col[0] + nuevo * 12 + (rnd() - 0.5) * 8, sat = col[1] * (plata ? 0.4 : 1);
          g.save(); g.translate(x, y); g.rotate(a);
          g.fillStyle = `hsl(${h},${sat}%,${l}%)`; g.beginPath(); g.moveTo(-C * 0.0055, 0); g.lineTo(-C * 0.0068, -L * 0.85); g.quadraticCurveTo(0, -L * 1.06, C * 0.0068, -L * 0.85); g.lineTo(C * 0.0055, 0); g.fill();
          g.fillStyle = `hsla(${h},${sat}%,${Math.min(92, l + 16)}%,0.5)`; g.fillRect(-C * 0.002, -L * 0.85, C * 0.0018, L * 0.8);
          g.restore();
        }
      }
    }
  }
}
// Pino: brotes con las acículas largas en mechones que salen hacia fuera y hacia arriba
function ramaPino(g, rnd, C, col) {
  const x0 = C * 0.5, y0 = C * 0.98;
  const eje = tallo(g, rnd, x0, y0, (rnd() - 0.5) * 0.15, C * 0.72, C * 0.02, [22, 40, 34], 0.05, 8);
  const brotes = [eje];
  for (const [t, sd] of [[0.35, -1], [0.55, 1], [0.7, -1]]) { const nd = eje[Math.round(t * (eje.length - 1))]; brotes.push(tallo(g, rnd, nd.x, nd.y, nd.a + sd * 0.6, C * 0.3, C * 0.011, [22, 40, 34], 0.05, 5)); }
  for (const br of brotes) for (let i = 1; i < br.length; i++) {
    const p = br[i], t = i / (br.length - 1), n = 34;
    for (let k = 0; k < n; k++) {
      const a = p.a + (rnd() - 0.5) * 2.6 * (0.5 + t * 0.5), L = C * (0.16 + rnd() * 0.06) * (0.7 + 0.3 * t), l = col[2] * (0.75 + rnd() * 0.45);
      g.strokeStyle = `hsl(${col[0] + (rnd() - 0.5) * 10},${col[1]}%,${l}%)`; g.lineWidth = C * (0.0055 + rnd() * 0.003); g.lineCap = 'round';
      g.beginPath(); g.moveTo(p.x, p.y); g.quadraticCurveTo(p.x + Math.sin(a) * L * 0.5, p.y - Math.cos(a) * L * 0.55, p.x + Math.sin(a) * L, p.y - Math.cos(a) * L * 0.95); g.stroke();
    }
  }
}

// Racimo para los árboles de lejos: varias ramillas de la celda «de», giradas alrededor del centro, con huecos
function racimo(g, rnd, C, src, sx, sy) {
  const cx = C * 0.5, cy = C * 0.5, items = [];
  // (un anillo de ramillas que salen del centro hacia fuera y, encima, otras más cortas en cualquier dirección que tapan el
  // centro; nada pasa del borde de la celda)
  for (let i = 0; i < 16; i++) items.push({ a: (i / 16) * Math.PI * 2 + (rnd() - 0.5) * 0.4, r: rnd() * C * 0.04, s: 0.36 + rnd() * 0.1, z: rnd() * 0.6 });
  for (let i = 0; i < 9; i++) items.push({ a: rnd() * Math.PI * 2, r: rnd() * C * 0.05, s: 0.22 + rnd() * 0.08, z: 0.5 + rnd() * 0.5 });
  items.sort((a, b) => a.z - b.z);
  for (const it of items) {
    g.save(); g.translate(cx + Math.cos(it.a) * it.r, cy + Math.sin(it.a) * it.r); g.rotate(it.a + Math.PI / 2);
    g.filter = `brightness(${0.62 + it.z * 0.5})`;
    g.drawImage(src, sx, sy, C, C, -C * it.s * 0.5, -C * it.s * 0.98, C * it.s, C * it.s);
    g.restore();
  }
  g.filter = 'none';
}

// Rellena lo transparente con el color de lo opaco más cercano (varias pasadas de 1 píxel), dejando el alfa como está
function sangra(g, S, pasadas = 10) {
  const im = g.getImageData(0, 0, S, S), d = im.data, A = new Uint8Array(S * S);
  for (let i = 0; i < S * S; i++) A[i] = d[i * 4 + 3] > 8 ? 1 : 0;
  const rgb = new Float32Array(S * S * 3); for (let i = 0; i < S * S; i++) { rgb[i * 3] = d[i * 4]; rgb[i * 3 + 1] = d[i * 4 + 1]; rgb[i * 3 + 2] = d[i * 4 + 2]; }
  for (let p = 0; p < pasadas; p++) {
    const nA = A.slice(), add = [];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = y * S + x; if (A[i]) continue;
      let r = 0, gg = 0, b = 0, n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= S || Y >= S) continue; const j = Y * S + X; if (A[j]) { r += rgb[j * 3]; gg += rgb[j * 3 + 1]; b += rgb[j * 3 + 2]; n++; } }
      if (n) { add.push(i, r / n, gg / n, b / n); nA[i] = 1; }
    }
    for (let k = 0; k < add.length; k += 4) { const i = add[k]; rgb[i * 3] = add[k + 1]; rgb[i * 3 + 1] = add[k + 2]; rgb[i * 3 + 2] = add[k + 3]; }
    A.set(nA);
  }
  // y lo que queda lejos de todo, con el color medio
  let m = [0, 0, 0], n = 0; for (let i = 0; i < S * S; i++) if (d[i * 4 + 3] > 128) { m[0] += d[i * 4]; m[1] += d[i * 4 + 1]; m[2] += d[i * 4 + 2]; n++; }
  m = m.map(v => v / Math.max(1, n));
  for (let i = 0; i < S * S; i++) { if (d[i * 4 + 3] > 8) continue; if (A[i]) { d[i * 4] = rgb[i * 3]; d[i * 4 + 1] = rgb[i * 3 + 1]; d[i * 4 + 2] = rgb[i * 3 + 2]; } else { d[i * 4] = m[0]; d[i * 4 + 1] = m[1]; d[i * 4 + 2] = m[2]; } }
  g.putImageData(im, 0, 0);
}

export function pintaAtlas(S = 2048) {
  const K = 2, C = (S / 4) * K, big = document.createElement('canvas'); big.width = big.height = C * 4;
  const g = big.getContext('2d');
  const celda = (k, fn, seed) => { const [i, j] = CELDAS[k]; g.save(); g.translate(i * C, j * C); g.beginPath(); g.rect(0, 0, C, C); g.clip(); fn(azar(seed)); g.restore(); };
  // (colores: [tono, saturación, luz] de la cara de arriba)
  celda('hayaA', r => ramillaAncha(g, r, C, 'haya', [92, 48, 40], { largo: 0.86, n: 11, hojas: 11, L: 0.2, W: 0.07, abre: 1.1, zig: 0.13, tallo: [24, 28, 30], lat: 3 }), 11);
  celda('hayaB', r => ramillaAncha(g, r, C, 'haya', [88, 52, 37], { largo: 0.8, n: 10, hojas: 10, L: 0.21, W: 0.074, abre: 1.05, zig: 0.14, tallo: [24, 28, 30], lat: 2 }), 12);
  celda('robleA', r => ramillaAncha(g, r, C, 'roble', [96, 42, 32], { largo: 0.66, n: 8, hojas: 8, L: 0.27, W: 0.095, abre: 0.9, zig: 0.08, tallo: [28, 30, 30], lat: 3, enves: 0.1 }), 21);
  celda('robleB', r => ramillaAncha(g, r, C, 'roble', [100, 40, 30], { largo: 0.6, n: 7, hojas: 7, L: 0.29, W: 0.1, abre: 0.8, zig: 0.08, tallo: [28, 30, 30], lat: 2 }), 22);
  celda('castano', r => ramillaAncha(g, r, C, 'castano', [86, 50, 35], { largo: 0.7, n: 9, hojas: 9, L: 0.34, W: 0.07, abre: 1.0, zig: 0.08, tallo: [22, 35, 30], lat: 2 }), 31);
  celda('chopo', r => ramillaAncha(g, r, C, 'chopo', [78, 50, 42], { largo: 0.8, n: 11, hojas: 11, L: 0.16, W: 0.09, abre: 1.05, zig: 0.06, tallo: [40, 22, 50], lat: 3, enves: 0.22 }), 41);
  celda('manzano', r => ramillaAncha(g, r, C, 'manzano', [94, 44, 36], { largo: 0.7, n: 9, hojas: 10, L: 0.2, W: 0.075, abre: 0.95, zig: 0.08, tallo: [18, 30, 28], lat: 3, enves: 0.18, fruto: 3, frutoR: 0.04, frutoCol: [4, 72, 46] }), 51);
  celda('olivo', r => ramillaAncha(g, r, C, 'olivo', [80, 20, 38], { largo: 0.84, n: 13, hojas: 13, L: 0.2, W: 0.03, abre: 0.62, zig: 0.04, tallo: [40, 12, 45], lat: 3, enves: 0.4 }), 61);
  celda('abetoA', r => ramaAbeto(g, r, C, [122, 34, 24], 6), 71);
  celda('abetoB', r => ramaAbeto(g, r, C, [128, 30, 26], 5), 72);
  celda('pino', r => ramaPino(g, r, C, [100, 30, 32]), 81);
  celda('arbusto', r => ramillaAncha(g, r, C, 'boj', [100, 40, 30], { largo: 0.84, n: 12, hojas: 18, L: 0.085, W: 0.036, abre: 0.9, zig: 0.06, tallo: [30, 25, 32], lat: 4, enves: 0.15 }), 91);
  // racimos para los de lejos, hechos con las ramillas de arriba
  const fuente = (k) => { const [i, j] = CELDAS[k]; return [i * C, j * C]; };
  for (const [k, src, seed] of [['racimoHaya', 'hayaA', 101], ['racimoRoble', 'robleA', 102], ['racimoChopo', 'chopo', 103], ['racimoOlivo', 'olivo', 104]]) {
    const [i, j] = CELDAS[k], [sx, sy] = fuente(src); g.save(); g.translate(i * C, j * C); g.beginPath(); g.rect(0, 0, C, C); g.clip(); racimo(g, azar(seed), C, big, sx, sy); g.restore();
  }
  // a su tamaño, y el color sangrado por debajo de lo transparente
  const out = document.createElement('canvas'); out.width = out.height = S;
  const o = out.getContext('2d', { willReadFrequently: true }); o.imageSmoothingQuality = 'high'; o.drawImage(big, 0, 0, S, S);
  sangra(o, S, 12);
  return out;
}

// La corteza de la haya: lisa y gris plata, con manchas más claras y más oscuras, líquenes verdosos y las marcas
// horizontales de las ramas que cayeron. Enlosable: cada mancha se dibuja también al otro lado del borde
export function pintaCortezaHaya(S = 512) {
  const c = document.createElement('canvas'); c.width = c.height = S; const q = c.getContext('2d'), rnd = azar(7);
  q.fillStyle = '#9b988f'; q.fillRect(0, 0, S, S);
  const mancha = (x, y, rx, ry, col) => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { q.fillStyle = col; q.beginPath(); q.ellipse(x + dx, y + dy, rx, ry, 0, 0, 7); q.fill(); } };
  for (let i = 0; i < 1100; i++) mancha(rnd() * S, rnd() * S, S * (0.008 + rnd() * 0.05), S * (0.004 + rnd() * 0.014), `hsla(${40 + rnd() * 40},7%,${44 + rnd() * 30}%,0.16)`);
  for (let i = 0; i < 90; i++) mancha(rnd() * S, rnd() * S, S * (0.012 + rnd() * 0.04), S * (0.008 + rnd() * 0.026), `hsla(${70 + rnd() * 30},18%,${66 + rnd() * 14}%,0.38)`);
  for (let i = 0; i < 30; i++) { const y = rnd() * S, x = rnd() * S, L = S * (0.04 + rnd() * 0.12); for (const dx of [-S, 0, S]) { q.strokeStyle = 'hsla(30,10%,30%,0.32)'; q.lineWidth = 1 + rnd() * 2; q.beginPath(); q.moveTo(x + dx, y); q.quadraticCurveTo(x + dx + L / 2, y + (rnd() - 0.5) * 5, x + dx + L, y + (rnd() - 0.5) * 4); q.stroke(); } }
  // (los «ojos» de las ramas caídas: una curva oscura con su ceja)
  for (let i = 0; i < 5; i++) { const x = rnd() * S, y = rnd() * S, r = S * (0.02 + rnd() * 0.02); for (const dx of [-S, 0, S]) { q.strokeStyle = 'hsla(30,12%,24%,0.5)'; q.lineWidth = 2; q.beginPath(); q.ellipse(x + dx, y, r * 1.6, r, 0, Math.PI * 1.05, Math.PI * 1.95); q.stroke(); } }
  return c;
}
