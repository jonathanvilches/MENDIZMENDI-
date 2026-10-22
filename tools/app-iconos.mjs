// Icono y pantallas de arranque de la app instalada (la web). El icono dice de qué va el juego, explorar Navarra: el
// explorador, con su mochila, de rodillas sobre el mapa y señalando (lámina del autor, src/assets/cimas/1536/ezkaba.webp),
// y donde señala, Navarra como una pegatina con un marcador (el contorno de sus comarcas, src/data/comarcas.json, el
// mismo del mapa del juego). Se compone en una página y se captura a 1024 px:
//  · public/icon-180.png (iPhone y iPad), icon-192.png e icon-512.png, e icon-maskable-512.png (Android: con más
//    paisaje alrededor y la pegatina más adentro, dentro de la zona que ningún recorte toca)
//  · el icono de la portada con la que arranca la página y el de la pestaña, dentro de index.html (#portada-app)
//  · public/girar.webp: el rótulo «Gira la pantalla · Biratu pantaila» de la pantalla de girar (#girar-app en
//    index.html), como imagen con la letra del juego: sale antes de que cargue la letra y es el mismo que el de la
//    pantalla de arranque
//  · public/splash/*.jpg: la pantalla de arranque del iPhone y del iPad de cada tamaño (src/web/splash.js). En horizontal,
//    la misma portada de index.html; en vertical, la pantalla de girar (la app se juega en horizontal). Así al abrir la
//    app no salta de una a otra
// Los iconos de antes se guardan en tools/app/antes/, antes-busto/ y antes-isaba/ (no se borran). Uso: node tools/app-iconos.mjs
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DISPOSITIVOS } from '../src/web/splash.js';

const A = pathToFileURL(process.cwd() + '/src/assets/').href;
const COM = JSON.parse(readFileSync('src/data/comarcas.json', 'utf8')), PATHS = COM.map(c => c.path).join(' ');
// v: recorte cuadrado de la lámina (x, y, lado, sobre 1536 × 864) y sitio de la pegatina (nx, ny, ancho) en el icono de 1024
// (la pegatina va en el hueco de arriba a la derecha, sin pisar al explorador: con aire hasta el pelo y hasta la punta del
// dedo, y dentro de la esquina redondeada del icono del iPhone; en el de Android, dentro del círculo que ningún recorte toca)
const ICONO = { x: 100, y: 250, side: 480, nx: 715, ny: 34, nw: 280 };
const ANDROID = { x: 30, y: 160, side: 680, nx: 620, ny: 160, nw: 170 };
const nav = (v) => `<svg class="nav" viewBox="-20 -20 765 820" style="left:${v.nx}px;top:${v.ny}px;width:${v.nw}px">
  <defs><linearGradient id="gf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5ad0"/><stop offset=".55" stop-color="#c21cff"/><stop offset="1" stop-color="#6a2bf0"/></linearGradient>
  <filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#12062e" flood-opacity=".55"/></filter></defs>
  <g filter="url(#sh)"><path d="${PATHS}" fill="#fff" stroke="#fff" stroke-width="44" stroke-linejoin="round"/></g>
  <path d="${PATHS}" fill="url(#gf)" stroke="url(#gf)" stroke-width="2" stroke-linejoin="round"/>
  ${COM.map(c => `<path d="${c.path}" fill="none" stroke="rgba(255,255,255,.38)" stroke-width="3" stroke-linejoin="round"/>`).join('')}
  <g transform="translate(367 283) scale(1.8)"><ellipse cx="0" cy="4" rx="26" ry="9" fill="rgba(18,6,46,.45)"/>
    <path d="M0 0 C-14 -26 -46 -52 -46 -92 A46 46 0 1 1 46 -92 C46 -52 14 -26 0 0 Z" fill="#fff" stroke="#12062e" stroke-opacity=".18" stroke-width="3"/>
    <circle cx="0" cy="-92" r="22" fill="#ff2bd6"/></g>
</svg>`;
const iconPage = (v) => { const k = 1024 / v.side; return `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:1024px;height:1024px;overflow:hidden;background:#12062e}
  .bg{position:absolute;left:${-v.x * k}px;top:${-v.y * k}px;width:${1536 * k}px;height:${864 * k}px;background:url(${A}cimas/1536/ezkaba.webp) 0 0/100% 100%;filter:saturate(1.05) contrast(1.03)}
  .tint{position:absolute;inset:0;background:linear-gradient(200deg,rgba(120,60,255,.45) 0%,rgba(194,28,255,0) 45%,rgba(30,10,68,.55) 100%);mix-blend-mode:multiply}
  .vig{position:absolute;inset:0;background:radial-gradient(80% 80% at 45% 50%,rgba(0,0,0,0) 55%,rgba(18,6,46,.5) 100%)}
  .nav{position:absolute;overflow:visible}</style><div class="bg"></div><div class="tint"></div><div class="vig"></div>${nav(v)}`; };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const tmp = mkdtempSync(join(tmpdir(), 'icono-'));
async function icon(v) {
  const f = join(tmp, 'icono.html'); writeFileSync(f, iconPage(v));
  const p = await (await b.newContext({ viewport: { width: 1024, height: 1024 } })).newPage();
  await p.goto(pathToFileURL(f).href); await p.waitForTimeout(400);   // (la lámina va de fondo: se espera a que esté)
  const png = await p.screenshot({ type: 'png' }); await p.context().close(); return png;
}

mkdirSync('tools/app/antes', { recursive: true }); mkdirSync('public/splash', { recursive: true });
for (const f of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) if (existsSync(`public/${f}`) && !existsSync(`tools/app/antes/${f}`)) copyFileSync(`public/${f}`, `tools/app/antes/${f}`);
// (y los del 2026-10-13: el busto del protagonista sobre morado, que ya están en antes-busto/, y el protagonista en Isaba)
mkdirSync('tools/app/antes-isaba', { recursive: true });
for (const f of ['icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) if (existsSync(`public/${f}`) && !existsSync(`tools/app/antes-isaba/${f}`)) copyFileSync(`public/${f}`, `tools/app/antes-isaba/${f}`);
const big = await icon(ICONO);
for (const n of [180, 192, 512]) await sharp(big).resize(n, n, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(`public/icon-${n}.png`);
await sharp(await icon(ANDROID)).resize(512, 512, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile('public/icon-maskable-512.png');
// la portada de index.html y la pestaña: el icono dentro de la página (también va en el archivo único)
const uri = async (n, q) => 'data:image/webp;base64,' + (await sharp(big).resize(n, n, { kernel: 'lanczos3' }).webp({ quality: q }).toBuffer()).toString('base64');
let html = readFileSync('index.html', 'utf8');
// (a 320 px: en el iPhone se ve nítida y pesa poco, que va también en el archivo único)
html = html.replace(/<div class="pa-ico">[\s\S]*?<\/div>/, `<div class="pa-ico"><img src="${await uri(320, 72)}" alt=""></div>`);
html = html.replace(/<link rel="icon" href="[^"]*">/, `<link rel="icon" href="${await uri(64, 80)}">`);
let TXT = '';
// el rótulo de girar: la letra de los títulos del juego (Barlow Condensed, OFL), a 1080 px de ancho y con transparencia
const font = readFileSync('node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-800-italic.woff2').toString('base64');
{
  const ctx = await b.newContext({ viewport: { width: 360, height: 200 }, deviceScaleFactor: 3 }), p = await ctx.newPage();
  await p.setContent(`<!doctype html><meta charset="utf-8"><style>@font-face{font-family:MZD;src:url(data:font/woff2;base64,${font}) format('woff2')}
    html,body{margin:0;background:transparent}#t{width:360px;display:flex;flex-direction:column;align-items:center;gap:6px;padding:4px 0 8px;font-family:MZD;text-transform:uppercase;text-align:center;line-height:1}
    b{font-weight:400;font-size:44px;color:#fff;letter-spacing:.01em;text-shadow:0 3px 0 rgba(7,2,15,.6)}span{font-size:26px;color:#c9b2ff;letter-spacing:.04em}</style>
    <div id="t"><b>Gira la pantalla</b><span>Biratu pantaila</span></div>`);
  await p.evaluate(() => document.fonts.ready);
  const png = await p.locator('#t').screenshot({ omitBackground: true });
  // (en public/: solo lo pide la app instalada, el archivo único no la necesita y no pesa más)
  const webp = await sharp(png).webp({ quality: 90, alphaQuality: 90 }).toBuffer(); writeFileSync('public/girar.webp', webp);
  TXT = 'data:image/webp;base64,' + webp.toString('base64');
  await ctx.close();
}
writeFileSync('index.html', html);
// pantallas de arranque: en horizontal, la portada de index.html, quieta (la barrita a medio camino); en vertical, la
// pantalla de girar, quieta, con el icono de la portada
const css = html.match(/<style id="portada-app-css">([\s\S]*?)<\/style>/)[1], cover = html.match(/<div id="portada-app"[\s\S]*?<\/i><\/div>/)[0]
  // (las pantallas de arranque son archivos aparte: con el icono a toda resolución, nítido también en el iPad)
  .replace(/<div class="pa-ico"><img src="[^"]*"/, `<div class="pa-ico"><img src="data:image/png;base64,${big.toString('base64')}"`);
const gira = html.match(/<div id="girar-app"[\s\S]*?alt=""><\/div>/)[0].replace('<div class="pa-ico"></div>', cover.match(/<div class="pa-ico">[\s\S]*?<\/div>/)[0]).replace(/<img class="ga-txt"[^>]*>/, `<img class="ga-txt" src="${TXT}" alt="">`);
const page = (o) => `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#07020f}${css}#girar-app{display:grid}</style>` +
  (o === 'h' ? cover.replace('id="portada-app"', 'id="portada-app" class="quieto"') : gira.replace('id="girar-app"', 'id="girar-app" class="quieto"'));
let n = 0, bytes = 0;
for (const [id, w, h, d] of DISPOSITIVOS) for (const [o, W, H] of [['v', w, h], ['h', h, w]]) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: d }), p = await ctx.newPage();
  await p.setContent(page(o)); await p.evaluate(() => Promise.all([...document.images].map(i => i.decode().catch(() => {})))); await p.waitForTimeout(100);
  const buf = await p.screenshot({ type: 'jpeg', quality: 88 }); writeFileSync(`public/splash/${id}-${o}.jpg`, buf); n++; bytes += buf.length;
  await ctx.close();
}
await b.close(); rmSync(tmp, { recursive: true, force: true });
console.log(`iconos 180, 192, 512 y maskable · portada, rótulo de girar e icono de la pestaña en index.html · ${n} pantallas de arranque · ${(bytes / 1048576).toFixed(1)} MB`);
