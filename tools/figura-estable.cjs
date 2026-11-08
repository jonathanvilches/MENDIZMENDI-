// La figura animada de un pelotari, estabilizada: los vídeos de Grok Video Lite se acercan poco a poco a la figura (crece
// un 16 % en dos segundos) y, recortada siempre en el mismo sitio, se le salían la cabeza y los pies. Aquí, en cada
// fotograma se mide la figura (su caja, sin el verde) y se escala y se mueve para que tenga el tamaño y el sitio del
// primero, que es la imagen fija de la que salió: así encaja igual que la figura fija en las cartas y en la pantalla VS.
// Además: el verde quitado a la resolución del vídeo, el borde suavizado (sin escalera), un poco más grande que el recorte del
// vídeo (remuestreado con cuidado, para que el navegador no la estire tanto) y de ida y vuelta, sin repetir los extremos.
// Con «azul», la camiseta roja pasa al azul de las figuras azules (como tools/figura-azul.cjs).
// La figura del vídeo: 512 × 768 en x = 128, y = 128 de un lienzo de 768 × 1024, sacado a 3:4 (en el de 480 × 640, el
// recorte de 320 × 480 en x = 80, y = 80).
// uso, desde la raíz del repositorio: node tools/figura-estable.cjs <vídeo> <salida .webp> [rojo|azul] [ancho 384] [fps 15] [calidad 74]
const sharp = require('sharp'), { execFileSync } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os');
const [, , IN, OUT, COLOR = 'rojo', OWs = '384', FPSs = '15', Qs = '74'] = process.argv;
const OW = +OWs, OH = Math.round(OW * 1.5), FPS = +FPSs, Q = +Qs;
if (!IN || !OUT) { console.error('uso: node tools/figura-estable.cjs <vídeo> <salida.webp> [rojo|azul] [ancho] [fps] [calidad]'); process.exit(1); }
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'festable-'));
  try {
    execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', IN, '-vf', `fps=${FPS},chromakey=0x00FF00:0.16:0.08,despill=type=green:mix=0.6:expand=0.1,format=rgba`, path.join(tmp, 'e%03d.png')]);
    const nombres = fs.readdirSync(tmp).filter(f => /^e\d+\.png$/.test(f)).sort();
    const F = [];
    for (const f of nombres) { const { data, info } = await sharp(path.join(tmp, f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); F.push({ d: data, W: info.width, H: info.height }); }
    const { W, H } = F[0], cx0 = W / 6, cy0 = H / 8, cw = W * 2 / 3, ch = H * 3 / 4;   // (el recorte de la figura en el vídeo)
    // (la caja de la figura en cada fotograma: filas y columnas con al menos tres puntos opacos, para no contar motas)
    const caja = (d) => { const rows = new Uint16Array(H), cols = new Uint16Array(W); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 128) { rows[y]++; cols[x]++; }
      let t = H, b = 0, l = W, r = 0; for (let y = 0; y < H; y++) if (rows[y] >= 3) { t = Math.min(t, y); b = Math.max(b, y); } for (let x = 0; x < W; x++) if (cols[x] >= 3) { l = Math.min(l, x); r = Math.max(r, x); }
      return { t, b, l, r }; };
    const C = F.map(f => caja(f.d));
    // (el borde del recorte, suavizado: el vídeo guarda el color a media resolución y el verde se quitaba a bloques de dos
    // píxeles, con el borde en escalera; un difuminado binomial de cinco puntos, en las dos direcciones, solo en la opacidad)
    const suaveA = (d) => { const a = new Float32Array(W * H), t = new Float32Array(W * H), k = [1, 4, 6, 4, 1];
      for (let i = 0; i < W * H; i++) a[i] = d[i * 4 + 3] / 255;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, n = 0; for (let j = -2; j <= 2; j++) { const xx = x + j; if (xx < 0 || xx >= W) continue; s += a[y * W + xx] * k[j + 2]; n += k[j + 2]; } t[y * W + x] = s / n; }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, n = 0; for (let j = -2; j <= 2; j++) { const yy = y + j; if (yy < 0 || yy >= H) continue; s += t[yy * W + x] * k[j + 2]; n += k[j + 2]; } a[y * W + x] = s / n; }
      return a; };
    // (alto, pie y centro, suavizados: mediana de cinco y media de cinco, para que la figura no tiemble)
    const suaviza = (v) => { const n = v.length, m = v.map((_, i) => { const w = []; for (let j = Math.max(0, i - 2); j <= Math.min(n - 1, i + 2); j++) w.push(v[j]); w.sort((a, b) => a - b); return w[w.length >> 1]; });
      return m.map((_, i) => { let s = 0, c = 0; for (let j = Math.max(0, i - 2); j <= Math.min(n - 1, i + 2); j++) { s += m[j]; c++; } return s / c; }); };
    const alto = suaviza(C.map(c => c.b - c.t)), pie = suaviza(C.map(c => c.b)), cen = suaviza(C.map(c => (c.l + c.r) / 2));
    const h0 = alto[0], p0x = cen[0], p0y = pie[0];
    const sal = [];
    for (let i = 0; i < F.length; i++) {
      const { d } = F[i], As = suaveA(d), k = h0 / alto[i], pix = cen[i], piy = pie[i], out = Buffer.alloc(OW * OH * 4);
      for (let oy = 0; oy < OH; oy++) for (let ox = 0; ox < OW; ox++) {
        // (del punto de la salida al del primer fotograma, y de ahí al de este, con la figura en su sitio)
        const X0 = cx0 + (ox + 0.5) * cw / OW, Y0 = cy0 + (oy + 0.5) * ch / OH, sx = pix + (X0 - p0x) / k - 0.5, sy = piy + (Y0 - p0y) / k - 0.5;
        const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0; let r = 0, g = 0, b = 0, a = 0, as = 0;
        for (const [dx, dy, w] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) {
          const x = Math.min(W - 1, Math.max(0, x0 + dx)), y = Math.min(H - 1, Math.max(0, y0 + dy)); if (!w) continue; const q = (y * W + x) * 4, al = d[q + 3] / 255 * w;
          r += d[q] * al; g += d[q + 1] * al; b += d[q + 2] * al; a += al; as += As[y * W + x] * w; }
        // (la opacidad, de la suavizada, con el borde algo más firme: lo casi transparente fuera y lo casi opaco entero)
        const u = Math.min(1, Math.max(0, (as - 0.18) / 0.64)), A = u * u * (3 - 2 * u); if (A <= 0.004) continue;
        if (a < 1e-4) { // (en el borde suavizado puede no haber color: el de alrededor)
          for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-2, 0], [2, 0], [0, -2], [0, 2]]) { const x = Math.min(W - 1, Math.max(0, Math.round(sx) + dx)), y = Math.min(H - 1, Math.max(0, Math.round(sy) + dy)), q = (y * W + x) * 4, al = d[q + 3] / 255; r += d[q] * al; g += d[q + 1] * al; b += d[q + 2] * al; a += al; }
          if (a < 1e-4) continue; }
        let R = r / a / 255, G = g / a / 255, Bc = b / a / 255;
        if (COLOR === 'azul') {   // (solo el rojo de la camiseta: G < R × 0,42 deja fuera el colorete de las mejillas y la piel)
          const mx = Math.max(R, G, Bc), mn = Math.min(R, G, Bc), v = mx, s = mx ? (mx - mn) / mx : 0;
          if (s >= 0.55 && v >= 0.22 && mx === R && G < R * 0.42) { let h = ((G - Bc) / (mx - mn)) * 60; if (h < 0) h += 360;
            if (h < 16 || h > 342) { const peso = Math.min(1, (s - 0.55) / 0.15) * Math.min(1, (16 - Math.min(h, 360 - h)) / 6), H2 = 228, S2 = Math.min(1, s * 1.02), V2 = Math.min(1, v * 1.08), c2 = V2 * S2, x2 = c2 * (1 - Math.abs(((H2 / 60) % 2) - 1)), m2 = V2 - c2;
              R = R * (1 - peso) + m2 * peso; G = G * (1 - peso) + (x2 + m2) * peso; Bc = Bc * (1 - peso) + (c2 + m2) * peso; } }
        }
        const o = (oy * OW + ox) * 4; out[o] = Math.round(R * 255); out[o + 1] = Math.round(G * 255); out[o + 2] = Math.round(Bc * 255); out[o + 3] = Math.round(A * 255);
      }
      sal.push(out);
    }
    // (de ida y vuelta: hacia delante y luego hacia atrás, sin repetir el último ni el primero)
    const orden = [...sal.keys(), ...[...sal.keys()].reverse().slice(1, -1)];
    for (let n = 0; n < orden.length; n++) await sharp(sal[orden[n]], { raw: { width: OW, height: OH, channels: 4 } }).png().toFile(path.join(tmp, `s${String(n).padStart(3, '0')}.png`));
    execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(tmp, 's%03d.png'), '-c:v', 'libwebp_anim', '-lossless', '0', '-q:v', String(Q), '-compression_level', '6', '-loop', '0', '-pix_fmt', 'yuva420p', OUT]);
    const crece = Math.max(...C.map(c => c.b - c.t)) / (C[0].b - C[0].t);
    console.log(path.basename(OUT), fs.statSync(OUT).size, `${F.length} fotogramas`, `la figura crecía ×${crece.toFixed(2)}`);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
})();
