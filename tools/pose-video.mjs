// Saca el esqueleto de los pelotaris de un vídeo de pelota de verdad, fotograma a fotograma, con el mismo detector de
// cuerpo que usa el juego para «pelota en casa» (MediaPipe, public/ar/pose_landmarker_lite.task). Para cada fotograma
// guarda las 33 marcas de cada persona: en la imagen (x, y de 0 a 1) y en metros (worldLandmarks, con la cadera de
// centro). Como en la vista de la tele los pelotaris salen pequeños, se busca en trozos de la imagen ampliados.
// Con SEGUIR=azul,rojo se sigue a cada pelotari por el color de su camiseta (la mancha de ese color con pantalón blanco
// debajo, cerca de donde estaba antes) y se busca su esqueleto en un recorte a su alrededor, ampliado: mucho más fiable
// que la imagen entera cuando salen pequeños, y sin confundirse con los carteles.
// Uso: node tools/pose-video.mjs <vídeo> <carpeta> [fps] [desde_s] [hasta_s]
import { chromium } from 'playwright-core';
import { mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const [,, video, out, fps = '15', desde = '0', hasta = '999'] = process.argv;
mkdirSync(out, { recursive: true }); const fd = `${out}/f`; rmSync(fd, { recursive: true, force: true }); mkdirSync(fd);
execFileSync('ffmpeg', ['-loglevel', 'error', '-ss', desde, '-to', hasta, '-i', video, '-vf', `fps=${fps}`, '-q:v', '3', `${fd}/%04d.jpg`]);
const fotos = readdirSync(fd).filter(f => f.endsWith('.jpg')).sort();
console.log(fotos.length, 'fotogramas');
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 800, height: 600 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://127.0.0.1:5173/src/pelota/rules.js', { timeout: 120000 });
await p.evaluate(async () => {
  const { motorVision, rutaAR } = await import('/src/ui/camaraAR.js');
  const { V, fs } = await motorVision();
  window.__pose = await V.PoseLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: rutaAR('pose_landmarker_lite.task'), delegate: 'CPU' }, runningMode: 'IMAGE', numPoses: 2, minPoseDetectionConfidence: 0.3, minPosePresenceConfidence: 0.3, minTrackingConfidence: 0.3 });
});
const SEGUIR = (process.env.SEGUIR || '').split(',').filter(Boolean);
const res = []; let antes = {};
for (let i = 0; i < fotos.length; i++) {
  const b64 = readFileSync(`${fd}/${fotos[i]}`).toString('base64');
  if (SEGUIR.length) {
    const r = await p.evaluate(async ([b64, quienes, antes]) => {
      const im = new Image(); im.src = 'data:image/jpeg;base64,' + b64; await im.decode();
      const W = im.naturalWidth, H = im.naturalHeight, w = Math.round(W / 2), h = Math.round(H / 2);
      const c0 = document.createElement('canvas'); c0.width = w; c0.height = h; const g0 = c0.getContext('2d', { willReadFrequently: true });
      g0.drawImage(im, 0, 0, w, h); const px = g0.getImageData(0, 0, w, h).data;
      const hsv = new Float32Array(w * h * 3);
      for (let k = 0; k < w * h; k++) {
        const r = px[k * 4] / 255, gg = px[k * 4 + 1] / 255, bb = px[k * 4 + 2] / 255, mx = Math.max(r, gg, bb), mn = Math.min(r, gg, bb), d = mx - mn + 1e-9;
        let hu = mx === r ? ((gg - bb) / d + 6) % 6 : mx === gg ? (bb - r) / d + 2 : (r - gg) / d + 4;
        hsv[k * 3] = hu * 60; hsv[k * 3 + 1] = d / (mx + 1e-9); hsv[k * 3 + 2] = mx;
      }
      const COL = { azul: (H_, S, V) => H_ > 195 && H_ < 235 && S > 0.5 && V > 0.45, rojo: (H_, S, V) => (H_ < 14 || H_ > 345) && S > 0.55 && V > 0.4 };
      const blanco = (k) => hsv[k * 3 + 1] < 0.18 && hsv[k * 3 + 2] > 0.72;
      const out = [], nuevo = {};
      for (const q of quienes) {
        const m = new Uint8Array(w * h);
        for (let k = 0; k < w * h; k++) if (COL[q](hsv[k * 3], hsv[k * 3 + 1], hsv[k * 3 + 2])) m[k] = 1;
        // manchas (8 vecinos), fuera la franja de arriba (el marcador de la tele)
        let mejor = null;
        for (let k = 0; k < w * h; k++) {
          if (m[k] !== 1) continue;
          const pila = [k]; m[k] = 2; let n = 0, x0 = w, x1 = 0, y0 = h, y1 = 0, sx = 0, sy = 0;
          while (pila.length) { const j = pila.pop(), x = j % w, y = (j / w) | 0; n++; sx += x; sy += y; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const jj = yy * w + xx; if (m[jj] === 1) { m[jj] = 2; pila.push(jj); } } }
          if (n < 20 || y0 < h * 0.15) continue;
          const bh = y1 - y0 + 1, bw = x1 - x0 + 1; if (bw > bh * 3.2) continue;  // (los carteles: tiras anchas)
          let blancos = 0, tot = 0;
          for (let y = y1 + 1; y < Math.min(h, y1 + 1 + Math.round(bh * 1.6) + 4); y++) for (let x = Math.max(0, x0 - 2); x <= Math.min(w - 1, x1 + 2); x++) { tot++; if (blanco(y * w + x)) blancos++; }
          const fb = tot ? blancos / tot : 0; if (fb < 0.06) continue;
          const cx = sx / n, cy = sy / n, A = antes[q];
          const dist = A ? Math.hypot(cx - A.cx, cy - A.cy) : 0; if (A && dist > 70) continue;
          const nota = n * (0.3 + fb) - dist * 1.5;
          if (!mejor || nota > mejor.nota) mejor = { nota, cx, cy, x0, x1, y0, y1, n };
        }
        if (!mejor) { nuevo[q] = null; continue; }  // (perdido, p. ej. por un cambio de plano: en el siguiente se busca en toda la imagen)
        nuevo[q] = { cx: mejor.cx, cy: mejor.cy };
        // el recorte, a tamaño real: la camiseta va del 20 al 50 % de la altura de la persona
        const hs = (mejor.y1 - mejor.y0 + 1) * 2, Hp = Math.max(hs * 4.2, 110), RH = Hp * 1.45, RW = RH * 0.8;
        const ccx = mejor.cx * 2, ccy = mejor.y0 * 2 + Hp * 0.3, rx = ccx - RW / 2, ry = ccy - RH / 2, k = 720 / RH;
        const c = document.createElement('canvas'); c.width = Math.round(RW * k); c.height = 720; const g = c.getContext('2d');
        g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
        const sx0 = Math.max(0, rx), sy0 = Math.max(0, ry), sx1 = Math.min(W, rx + RW), sy1 = Math.min(H, ry + RH);
        g.drawImage(im, sx0, sy0, sx1 - sx0, sy1 - sy0, (sx0 - rx) * k, (sy0 - ry) * k, (sx1 - sx0) * k, (sy1 - sy0) * k);
        const d = window.__pose.detect(c);
        let kk = -1, dm = 1e9;
        (d.landmarks || []).forEach((lm, j) => { const hx = (lm[23].x + lm[24].x) / 2, hy = (lm[23].y + lm[24].y) / 2, dd = Math.hypot(hx - 0.5, hy - 0.55); if (dd < dm) { dm = dd; kk = j; } });
        if (kk < 0 || dm > 0.3) continue;
        const pts = d.landmarks[kk].map(q2 => [+((rx + q2.x * RW) / W).toFixed(4), +((ry + q2.y * RH) / H).toFixed(4), +(q2.visibility ?? 0).toFixed(2)]);
        out.push({ quien: q, cx: (pts[23][0] + pts[24][0]) / 2, cy: (pts[23][1] + pts[24][1]) / 2, caja: [rx / W, ry / H, RW / W, RH / H].map(v => +v.toFixed(4)),
          img: pts, mundo: (d.worldLandmarks?.[kk] || []).map(q2 => [+q2.x.toFixed(3), +q2.y.toFixed(3), +q2.z.toFixed(3)]) });
      }
      return { out, nuevo };
    }, [b64, SEGUIR, antes]);
    antes = { ...antes, ...r.nuevo };
    res.push({ f: fotos[i], gente: r.out });
    if (i % 30 === 0) console.log(i, r.out.map(o => o.quien).join(' ') || 'nadie');
    continue;
  }
  const r = await p.evaluate(async (b64) => {
    const im = new Image(); im.src = 'data:image/jpeg;base64,' + b64; await im.decode();
    const W = im.naturalWidth, H = im.naturalHeight, out = [];
    // (trozos: la imagen entera y dos mitades de la parte de abajo, ampliadas al doble; se juntan las personas sin repetir)
    const trozos = [[0, 0, W, H], [0, H * 0.25, W * 0.6, H * 0.75], [W * 0.4, H * 0.25, W * 0.6, H * 0.75]];
    for (const [x0, y0, w, h] of trozos) {
      const c = document.createElement('canvas'); c.width = Math.round(w * 2); c.height = Math.round(h * 2);
      c.getContext('2d').drawImage(im, x0, y0, w, h, 0, 0, c.width, c.height);
      const d = window.__pose.detect(c);
      (d.landmarks || []).forEach((lm, k) => {
        const pts = lm.map(q => ({ x: (x0 + q.x * w) / W, y: (y0 + q.y * h) / H, v: +(q.visibility ?? 0).toFixed(2) }));
        const cx = (pts[23].x + pts[24].x) / 2, cy = (pts[23].y + pts[24].y) / 2;
        if (out.some(o => Math.hypot(o.cx - cx, (o.cy - cy) * H / W) < 0.035)) return;
        out.push({ cx, cy, img: pts.map(q => [+q.x.toFixed(4), +q.y.toFixed(4), q.v]), mundo: (d.worldLandmarks?.[k] || []).map(q => [+q.x.toFixed(3), +q.y.toFixed(3), +q.z.toFixed(3)]) });
      });
    }
    return out;
  }, b64);
  res.push({ f: fotos[i], gente: r });
  if (i % 30 === 0) console.log(i, r.length, 'personas');
}
writeFileSync(`${out}/pose.json`, JSON.stringify({ fps: +fps, desde: +desde, fotos: res }));
console.log('guardado', `${out}/pose.json`, errs.slice(0, 3)); await b.close();
