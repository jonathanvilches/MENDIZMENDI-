// Rueda el tráiler v3: abre la página del montaje (montaje-v3.js) en el servidor de Vite del juego, la lleva a cada
// fotograma y le hace una foto; ffmpeg junta las fotos con el sonido (mezcla-v3.py).
// Uso: node tools/trailer/v3/rodar-v3.mjs <planos rodados> <sonido.wav|-> <salida.mp4>
//   CUADROS=s1,s2,…  en vez del vídeo, fotos sueltas en esos segundos (en la carpeta de la salida), para revisar
//   DESDE=s HASTA=s  solo ese trozo · URL=http://127.0.0.1:5173  el servidor de Vite
import { chromium } from 'playwright-core';
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
const [, , planos, sonido, salida] = process.argv;
const URL = process.env.URL || 'http://127.0.0.1:5173', FPS = 24;
const cuantos = {};
for (const d of readdirSync(planos, { withFileTypes: true })) if (d.isDirectory()) cuantos[d.name] = readdirSync(join(planos, d.name)).filter(f => f.endsWith('.jpg')).length;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }); const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 200))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
await p.route('**/tv3p/**', (r) => { const f = join(planos, decodeURIComponent(new globalThis.URL(r.request().url()).pathname).replace(/^.*\/tv3p\//, '')); existsSync(f) ? r.fulfill({ status: 200, contentType: 'image/jpeg', body: readFileSync(f) }) : r.fulfill({ status: 404, body: 'no' }); });
await p.goto(`${URL}/tools/trailer/v3/index.html`, { timeout: 120000 });
await p.waitForFunction(() => window.T3, null, { timeout: 120000 });
const info = await p.evaluate((c) => window.T3.prepara(c), cuantos); console.log(info);
const N = info.fotogramas, i0 = Math.round((+process.env.DESDE || 0) * FPS), i1 = Math.min(N, Math.round((+process.env.HASTA || N / FPS) * FPS));
const foto = async (t) => { await p.evaluate((t) => window.T3.cuadro(t), t); return p.screenshot({ type: 'jpeg', quality: 93 }); };
const t0 = Date.now();
if (process.env.CUADROS) {
  const dir = dirname(salida); mkdirSync(dir, { recursive: true });
  for (const s of process.env.CUADROS.split(',').map(Number)) writeFileSync(join(dir, `v3-${s.toFixed(2)}.jpg`), await foto(s));
} else {
  const conSonido = sonido && sonido !== '-';
  const ff = spawn('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    ...(conSonido ? ['-ss', String(i0 / FPS), '-t', String((i1 - i0) / FPS), '-i', sonido] : []),
    '-vf', 'noise=alls=3:allf=t,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-tune', 'film', '-profile:v', 'high', '-level', '4.1',
    ...(conSonido ? ['-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest'] : []), '-movflags', '+faststart', salida], { stdio: ['pipe', 'inherit', 'inherit'] });
  const fin = new Promise((ok) => ff.on('close', ok));
  for (let i = i0; i < i1; i++) {
    const buf = await foto(i / FPS);
    if (!ff.stdin.write(buf)) await new Promise((ok) => ff.stdin.once('drain', ok));
    if (i % 120 === 0) console.log(`${(i / FPS).toFixed(0)} s`, `${Math.round((Date.now() - t0) / 1000)} s pasados`);
  }
  ff.stdin.end(); console.log('ffmpeg terminó', await fin);
}
console.log(`${Math.round((Date.now() - t0) / 1000)} s`, errs.length ? 'errores: ' + [...new Set(errs)].slice(0, 6).join(' | ') : 'sin errores');
await b.close();
