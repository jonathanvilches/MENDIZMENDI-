// Dibuja encima de cada fotograma el esqueleto que sacó tools/pose-video.mjs, para ver si acierta.
// Uso: node tools/pose-dibuja.mjs <carpeta de pose-video> [salida.mp4]
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const [,, dir, salida = `${dir}/esqueleto.mp4`] = process.argv;
const P = JSON.parse(readFileSync(`${dir}/pose.json`, 'utf8')); mkdirSync(`${dir}/d`, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const p = await b.newPage();
const HUESOS = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [27, 31], [28, 32], [15, 19], [16, 20]];
for (const F of P.fotos) {
  const b64 = readFileSync(`${dir}/f/${F.f}`).toString('base64');
  const url = await p.evaluate(async ([b64, gente, H]) => {
    const im = new Image(); im.src = 'data:image/jpeg;base64,' + b64; await im.decode();
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const cols = ['#ffd36a', '#39f0ff', '#ff5ad1'];
    gente.forEach((pe, k) => { g.strokeStyle = cols[k % 3]; g.lineWidth = 2.5; g.lineCap = 'round';
      for (const [a, z] of H) { const A = pe.img[a], Z = pe.img[z]; if (A[2] < 0.3 || Z[2] < 0.3) continue; g.beginPath(); g.moveTo(A[0] * c.width, A[1] * c.height); g.lineTo(Z[0] * c.width, Z[1] * c.height); g.stroke(); }
      g.fillStyle = cols[k % 3]; for (const q of [pe.img[15], pe.img[16]]) { g.beginPath(); g.arc(q[0] * c.width, q[1] * c.height, 4, 0, 7); g.fill(); } });
    return c.toDataURL('image/jpeg', 0.88);
  }, [b64, F.gente, HUESOS]);
  writeFileSync(`${dir}/d/${F.f}`, Buffer.from(url.split(',')[1], 'base64'));
}
await b.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(P.fps), '-i', `${dir}/d/%04d.jpg`, '-vf', 'format=yuv420p', '-c:v', 'libx264', '-crf', '20', salida]);
console.log('vídeo', salida);
