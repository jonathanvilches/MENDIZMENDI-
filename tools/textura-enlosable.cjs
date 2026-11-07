// Una textura pintada (Higgsfield, 1024 × 1024) hecha enlosable y a la medida de las del juego (512 × 512, textures.js).
// 1) Busca, cerca del tamaño pedido (frac: qué parte del lado coge), el recorte cuyo borde derecho empalma con el izquierdo
//    y el de abajo con el de arriba: la columna justo después del recorte, igual que la primera (en las de hileras, un
//    número entero de hileras). Así las tejas, las piedras y los adoquines siguen enteros, sin fundidos.
// 2) Lo que aún no case lo funde con su copia desplazada media textura, solo en una franja estrecha junto a los bordes.
//    Con ejes=y (vetas o tablas verticales, como la madera) la copia se desplaza solo a lo alto y la franja va solo arriba
//    y abajo: las juntas de las tablas siguen en su sitio y no salen dobles. Con ejes=x, al revés.
// 3) La deja en 512 × 512 y en WebP.
// uso, desde la raíz: node tools/textura-enlosable.cjs <entrada.png> <salida.webp> [frac=1] [franja=0.06] [calidad=86] [ejes=xy]
const s = require(process.cwd() + '/node_modules/sharp');
const [inp, outp, fracA = '1', franjaA = '0.06', qA = '86', ejes = 'xy'] = process.argv.slice(2);
const frac = +fracA, franja = +franjaA, Q = +qA, N = 256;

(async () => {
  const meta = await s(inp).metadata(), F = meta.width / N;
  const { data: g } = await s(inp).removeAlpha().resize(N, N, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  const px = (x, y, c) => g[(y * N + x) * 3 + c];
  const col = (a, b, y0, h) => { let t = 0; for (let y = y0; y < y0 + h; y++) for (let c = 0; c < 3; c++) t += Math.abs(px(a, y, c) - px(b, y, c)); return t / (h * 3); };
  const row = (a, b, x0, w) => { let t = 0; for (let x = x0; x < x0 + w; x++) for (let c = 0; c < 3; c++) t += Math.abs(px(x, a, c) - px(x, b, c)); return t / (w * 3); };
  let refC = 0, refR = 0; for (let i = 1; i < 15; i++) { const k = Math.floor(i * N / 15); refC += col(k, k + 1, 0, N); refR += row(k, k + 1, 0, N); } refC /= 14; refR /= 14;
  const lo = Math.max(48, Math.round(N * frac * 0.85)), hi = Math.min(N - 1, Math.round(N * frac * 1.15));
  // (a lo ancho: el recorte [x0, x0 + w) y la columna x0 + w, que debe ser como la x0)
  let bx = [1e9, 0, Math.min(N, Math.round(N * frac))];
  for (let w = lo; w <= hi; w++) for (let x0 = 0; x0 + w < N; x0 += 2) { const v = col(x0, x0 + w, 0, N) / refC; if (v < bx[0]) bx = [v, x0, w]; }
  let by = [1e9, 0, Math.min(N, Math.round(N * frac))];
  for (let h = lo; h <= hi; h++) for (let y0 = 0; y0 + h < N; y0 += 2) { const v = row(y0, y0 + h, bx[1], bx[2]) / refR; if (v < by[0]) by = [v, y0, h]; }
  const left = Math.round(bx[1] * F), top = Math.round(by[1] * F), width = Math.round(bx[2] * F), height = Math.round(by[2] * F);
  console.log(inp.split('/').pop(), `recorte ${width}x${height}+${left}+${top}`, 'costura', bx[0].toFixed(2), by[0].toFixed(2));
  // (a 512, y la franja de fundido con su copia desplazada media textura)
  const S = 512, { data } = await s(inp).removeAlpha().extract({ left, top, width, height }).resize(S, S, { fit: 'fill', kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(S * S * 3), at = (x, y, c) => data[(y * S + x) * 3 + c];
  const w1 = (u) => { const d = Math.min(u, 1 - u); return franja <= 0 || d >= franja ? 1 : (t => t * t * (3 - 2 * t))(d / franja); };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const ex = ejes.includes('x'), ey = ejes.includes('y');
    const m = Math.min(ex ? w1((x + 0.5) / S) : 1, ey ? w1((y + 0.5) / S) : 1), xs = ex ? (x + S / 2) % S : x, ys = ey ? (y + S / 2) % S : y;
    for (let c = 0; c < 3; c++) out[(y * S + x) * 3 + c] = Math.round(at(x, y, c) * m + at(xs, ys, c) * (1 - m));
  }
  await s(out, { raw: { width: S, height: S, channels: 3 } }).webp({ quality: Q, effort: 6 }).toFile(outp);
})();
