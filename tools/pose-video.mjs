// Saca el esqueleto de los pelotaris de un vídeo de pelota de verdad, fotograma a fotograma, con el mismo detector de
// cuerpo que usa el juego para «pelota en casa» (MediaPipe, public/ar/pose_landmarker_lite.task). Para cada fotograma
// guarda las 33 marcas de cada persona: en la imagen (x, y de 0 a 1) y en metros (worldLandmarks, con la cadera de
// centro). Como en la vista de la tele los pelotaris salen pequeños, se busca en trozos de la imagen ampliados.
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
const res = [];
for (let i = 0; i < fotos.length; i++) {
  const b64 = readFileSync(`${fd}/${fotos[i]}`).toString('base64');
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
