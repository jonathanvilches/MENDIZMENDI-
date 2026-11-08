// La figura animada azul a partir de la colorada: en cada fotograma, el rojo fuerte de la camiseta pasa al azul de las
// figuras azules del autor (la piel, los labios y lo demás no llegan a ese rojo tan saturado). Las figuras del autor solo
// cambian de color en la camiseta. uso: node tools/figura-azul.cjs <roja.webp> <azul.webp> [fps] [calidad]
const sharp = require('sharp'), { execFileSync } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os');
const [, , IN, OUT, FPS = '12', Q = '70'] = process.argv;
(async () => {
  const meta = await sharp(IN, { animated: true }).metadata(), n = meta.pages || 1, W = meta.width, H = meta.pageHeight || meta.height;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fazul-'));
  for (let i = 0; i < n; i++) {
    const { data } = await sharp(IN, { page: i }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let k = 0; k < data.length; k += 4) {
      const r = data[k] / 255, g = data[k + 1] / 255, b = data[k + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), v = mx, s = mx ? (mx - mn) / mx : 0;
      if (data[k + 3] < 8 || s < 0.55 || v < 0.22 || mx !== r) continue;
      let h = ((g - b) / (mx - mn)) * 60; if (h < 0) h += 360;
      if (!(h < 16 || h > 342)) continue;
      // (cuánto es camiseta: del todo en el rojo pleno, a medias en el borde del tono y de la saturación)
      const peso = Math.min(1, (s - 0.55) / 0.15) * Math.min(1, (16 - Math.min(h, 360 - h)) / 6);
      // (el azul de las figuras azules: tono 228°, algo más vivo)
      const H2 = 228, S2 = Math.min(1, s * 1.02), V2 = Math.min(1, v * 1.08), c = V2 * S2, x = c * (1 - Math.abs(((H2 / 60) % 2) - 1)), m = V2 - c;
      const r2 = m, g2 = x + m, b2 = c + m;   // (de 180° a 240°: rojo 0, verde x, azul c, más m)
      data[k] = Math.round((r * (1 - peso) + r2 * peso) * 255); data[k + 1] = Math.round((g * (1 - peso) + g2 * peso) * 255); data[k + 2] = Math.round((b * (1 - peso) + b2 * peso) * 255);
    }
    await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(tmp, `f${String(i).padStart(3, '0')}.png`));
  }
  execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-framerate', FPS, '-i', path.join(tmp, 'f%03d.png'), '-c:v', 'libwebp_anim', '-lossless', '0', '-q:v', Q, '-compression_level', '6', '-loop', '0', '-pix_fmt', 'yuva420p', OUT]);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(OUT, fs.statSync(OUT).size);
})();
