// Icono y pantallas de arranque de la app instalada (la web), con el busto de Mendi, el protagonista, de la imagen del
// autor (src/assets/pelotaris/web/vs/azul/mendi.webp), sobre el fondo morado del juego:
//  · public/icon-180.png (iPhone y iPad), icon-192.png e icon-512.png, e icon-maskable-512.png (Android: el busto más
//    pequeño, dentro de la zona que ningún recorte toca)
//  · el icono de la portada con la que arranca la página y el de la pestaña, dentro de index.html (#portada-app)
//  · public/splash/*.jpg: la pantalla de arranque del iPhone y del iPad de cada tamaño (src/web/splash.js), en
//    vertical y en horizontal. Se dibuja con la misma portada de index.html, así al abrir la app no salta de una a otra
// Los iconos de antes se guardan en tools/app/antes/ (no se borran). Uso: node tools/app-iconos.mjs
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { DISPOSITIVOS } from '../src/web/splash.js';

const SRC = 'src/assets/pelotaris/web/vs/azul/mendi.webp';
// el busto: cabeza y hombros (un cuadrado de 560 px de la imagen de 1024 × 1536)
const BUST = { left: 255, top: 40, width: 560, height: 560 };
const BG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><defs><radialGradient id="b" cx="50%" cy="38%" r="78%"><stop offset="0" stop-color="#6a35e8"/><stop offset=".5" stop-color="#2e1080"/><stop offset="1" stop-color="#12062e"/></radialGradient><radialGradient id="g" cx="50%" cy="42%" r="42%"><stop offset="0" stop-color="#ff7ac8" stop-opacity=".55"/><stop offset="1" stop-color="#ff2bd6" stop-opacity="0"/></radialGradient></defs><rect width="1024" height="1024" fill="url(#b)"/><circle cx="512" cy="440" r="430" fill="url(#g)"/></svg>`;
// el icono de 1024: el busto a 900 px, con los hombros contra el borde de abajo; y el de Android, a 720 y centrado
const icon = async (size, top) => {
  const bust = await sharp(SRC).extract(BUST).resize(size, size, { kernel: 'lanczos3' }).png().toBuffer();
  return sharp(Buffer.from(BG)).composite([{ input: bust, left: Math.round((1024 - size) / 2), top }]).png().toBuffer();
};

mkdirSync('tools/app/antes', { recursive: true }); mkdirSync('public/splash', { recursive: true });
for (const f of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) if (existsSync(`public/${f}`) && !existsSync(`tools/app/antes/${f}`)) copyFileSync(`public/${f}`, `tools/app/antes/${f}`);
const big = await icon(900, 124);
for (const n of [180, 192, 512]) await sharp(big).resize(n, n, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(`public/icon-${n}.png`);
await sharp(await icon(720, 224)).resize(512, 512, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile('public/icon-maskable-512.png');
// la portada de index.html y la pestaña: el icono dentro de la página (también va en el archivo único)
const uri = async (n, q) => 'data:image/webp;base64,' + (await sharp(big).resize(n, n, { kernel: 'lanczos3' }).webp({ quality: q }).toBuffer()).toString('base64');
let html = readFileSync('index.html', 'utf8');
html = html.replace(/<div class="pa-ico">[\s\S]*?<\/div>/, `<div class="pa-ico"><img src="${await uri(384, 82)}" alt=""></div>`);
html = html.replace(/<link rel="icon" href="[^"]*">/, `<link rel="icon" href="${await uri(64, 80)}">`);
writeFileSync('index.html', html);
// pantallas de arranque: la portada de index.html, quieta (la barrita a medio camino)
const css = html.match(/<style id="portada-app-css">([\s\S]*?)<\/style>/)[1], cover = html.match(/<div id="portada-app"[\s\S]*?<\/i><\/div>/)[0];
const page = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#07020f}${css}</style>${cover.replace('id="portada-app"', 'id="portada-app" class="quieto"')}`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let n = 0, bytes = 0;
for (const [id, w, h, d] of DISPOSITIVOS) for (const [o, W, H] of [['v', w, h], ['h', h, w]]) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: d }), p = await ctx.newPage();
  await p.setContent(page); await p.evaluate(() => Promise.all([...document.images].map(i => i.decode().catch(() => {})))); await p.waitForTimeout(100);
  const buf = await p.screenshot({ type: 'jpeg', quality: 88 }); writeFileSync(`public/splash/${id}-${o}.jpg`, buf); n++; bytes += buf.length;
  await ctx.close();
}
await b.close();
console.log(`iconos 180, 192, 512 y maskable · portada e icono de la pestaña en index.html · ${n} pantallas de arranque · ${(bytes / 1048576).toFixed(1)} MB`);
