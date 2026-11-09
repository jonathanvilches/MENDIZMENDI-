// Monta el tráiler: compone cada fotograma con montaje.js (en una página, lienzo 2D) y se lo pasa a ffmpeg con la música.
// Uso: node tools/trailer/montar.mjs <planos rodados> <fotos fijas> <música.wav> <salida.mp4>
//   CUADROS=24,250,…  en vez del vídeo, guarda esos fotogramas sueltos (en la carpeta de la salida) para revisarlos
//   DESDE=s HASTA=s   solo ese trozo (para probar)
import { chromium } from 'playwright-core';
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const AQUI = dirname(fileURLToPath(import.meta.url)), RAIZ = join(AQUI, '..', '..');
const [, , planos, fijas, musica, salida] = process.argv;
const CUADROS = process.env.CUADROS ? process.env.CUADROS.split(',').map(Number) : null;
const FPS = 24, N = 60 * FPS, i0 = Math.round((+process.env.DESDE || 0) * FPS), i1 = Math.min(N, Math.round((+process.env.HASTA || 60) * FPS));
const cuantos = {};
for (const d of readdirSync(planos, { withFileTypes: true })) if (d.isDirectory()) cuantos[d.name] = readdirSync(join(planos, d.name)).filter(f => f.endsWith('.jpg')).length;
const TIPO = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.js': 'text/javascript', '.html': 'text/html' };
const FUENTES = [join(RAIZ, 'node_modules/@fontsource/barlow-condensed/files'), join(RAIZ, 'node_modules/@fontsource/barlow/files')];
const archivo = (ruta) => {
  if (ruta === '/') return { body: '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#000"><script type="module">import * as M from "/montaje.js"; window.M = M;</script>', ct: 'text/html' };
  let f = null;
  if (ruta === '/montaje.js') f = join(AQUI, 'montaje.js');
  else if (ruta.startsWith('/p/')) f = join(planos, ruta.slice(3));
  else if (ruta.startsWith('/f/')) f = join(fijas, ruta.slice(3));
  else if (ruta.startsWith('/a/')) f = join(RAIZ, 'src/assets', ruta.slice(3));
  else if (ruta.startsWith('/font/')) f = FUENTES.map(d => join(d, ruta.slice(6))).find(existsSync);
  if (!f || !existsSync(f)) return null;
  return { body: readFileSync(f), ct: TIPO[extname(f)] || 'application/octet-stream' };
};
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 200))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
await p.route('http://hz.local/**', (r) => { const u = new URL(r.request().url()), a = archivo(decodeURIComponent(u.pathname)); a ? r.fulfill({ status: 200, contentType: a.ct, body: a.body }) : r.fulfill({ status: 404, body: 'no' }); });
await p.goto('http://hz.local/');
await p.waitForFunction(() => window.M, null, { timeout: 60000 });
console.log(await p.evaluate((c) => window.M.prepara(c), cuantos), cuantos);
const foto = async (i) => Buffer.from((await p.evaluate((i) => window.M.cuadro(i), i)).split(',')[1], 'base64');
const t0 = Date.now();
if (CUADROS) {
  const dir = dirname(salida); mkdirSync(dir, { recursive: true });
  for (const i of CUADROS) writeFileSync(join(dir, `cuadro-${String(i).padStart(4, '0')}.jpg`), await foto(i));
} else {
  // (ffmpeg: las imágenes por la tubería, la música a su sitio, un grano muy fino y H.264 para que se vea en todas partes)
  const ff = spawn('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-ss', String(i0 / FPS), '-t', String((i1 - i0) / FPS), '-i', musica,
    '-vf', 'noise=alls=4:allf=t,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-tune', 'film', '-profile:v', 'high', '-level', '4.1',
    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', '-shortest', salida], { stdio: ['pipe', 'inherit', 'inherit'] });
  const fin = new Promise((ok) => ff.on('close', ok));
  for (let i = i0; i < i1; i++) {
    const buf = await foto(i);
    if (!ff.stdin.write(buf)) await new Promise((ok) => ff.stdin.once('drain', ok));
    if (i % 120 === 0) console.log(`${(i / FPS).toFixed(0)} s`, `${Math.round((Date.now() - t0) / 1000)} s pasados`);
  }
  ff.stdin.end(); console.log('ffmpeg terminó', await fin);
}
console.log(`${Math.round((Date.now() - t0) / 1000)} s`, errs.length ? 'errores: ' + errs.slice(0, 4).join(' | ') : 'sin errores');
await b.close();
