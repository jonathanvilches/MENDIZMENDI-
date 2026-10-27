// Icono y pantallas de arranque de la app instalada (la web). El icono es la ilustración del autor para la app
// (tools/app/icono-herrizherri.png, 1254 × 1254): el protagonista corriendo sobre un pequeño mundo de Navarra con el
// basajaun, los personajes del carnaval, el frontón, el puente y el cielo azul alrededor. De ella salen:
//  · public/icon-180.png (iPhone y iPad), icon-192.png e icon-512.png: la ilustración entera; e icon-maskable-512.png
//    (Android, que recorta el icono en círculo o en otras formas): la ilustración más pequeña, dentro de la zona que ningún
//    recorte toca, sobre su mismo cielo desenfocado, para que no se corte el pelo del protagonista
//  · el icono de la portada con la que arranca la página y el de la pestaña, dentro de index.html (#portada-app)
//  · public/girar.webp: el rótulo «Gira la pantalla · Biratu pantaila» de la pantalla de girar (#girar-app en
//    index.html), como imagen con la letra del juego: sale antes de que cargue la letra y es el mismo que el de la
//    pantalla de arranque
//  · public/splash/*.jpg: la pantalla de arranque del iPhone y del iPad de cada tamaño (src/web/splash.js). En horizontal,
//    la misma portada de index.html; en vertical, la pantalla de girar (la app se juega en horizontal). Así al abrir la
//    app no salta de una a otra
// Los iconos de antes se guardan en tools/app/antes/, antes-busto/, antes-isaba/ y antes-explorador/ (no se borran).
// Uso: node tools/app-iconos.mjs
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { DISPOSITIVOS } from '../src/web/splash.js';

const ORIGEN = 'tools/app/icono-herrizherri.png';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
// (para Android: la zona segura es el círculo central del 80 %; la ilustración, al 80 % y centrada, con el borde fundido en
// un círculo suave sobre un cielo del mismo azul que el suyo: sin ninguna raya donde se juntan)
async function maskable(n) {
  const fondo = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}"><defs><linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#078cfd"/><stop offset="1" stop-color="#3aaefd"/></linearGradient><radialGradient id="l" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="${n}" height="${n}" fill="url(#c)"/><rect width="${n}" height="${n}" fill="url(#l)"/></svg>`);
  const k = Math.round(n * 0.8), r = k / 2;
  const funde = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${k}" height="${k}"><defs><radialGradient id="g"><stop offset=".86" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle cx="${r}" cy="${r}" r="${r * 1.04}" fill="url(#g)"/></svg>`);
  const dentro = await sharp(ORIGEN).resize(k, k, { kernel: 'lanczos3' }).ensureAlpha().composite([{ input: funde, blend: 'dest-in' }]).png().toBuffer();
  return sharp(fondo).composite([{ input: dentro, left: (n - k) >> 1, top: (n - k) >> 1 }]).png({ compressionLevel: 9 }).toBuffer();
}

mkdirSync('tools/app/antes', { recursive: true }); mkdirSync('public/splash', { recursive: true });
for (const f of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) if (existsSync(`public/${f}`) && !existsSync(`tools/app/antes/${f}`)) copyFileSync(`public/${f}`, `tools/app/antes/${f}`);
// (y los del 2026-10-13: el busto del protagonista sobre morado, que ya están en antes-busto/, y el protagonista en Isaba)
mkdirSync('tools/app/antes-isaba', { recursive: true });
for (const f of ['icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) if (existsSync(`public/${f}`) && !existsSync(`tools/app/antes-isaba/${f}`)) copyFileSync(`public/${f}`, `tools/app/antes-isaba/${f}`);
mkdirSync('tools/app/antes-explorador', { recursive: true });
for (const f of ['icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) if (existsSync(`public/${f}`) && !existsSync(`tools/app/antes-explorador/${f}`)) copyFileSync(`public/${f}`, `tools/app/antes-explorador/${f}`);
const big = await sharp(ORIGEN).resize(1024, 1024, { kernel: 'lanczos3' }).png().toBuffer();
for (const n of [180, 192, 512]) await sharp(big).resize(n, n, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(`public/icon-${n}.png`);
writeFileSync('public/icon-maskable-512.png', await maskable(512));
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
await b.close();
console.log(`iconos 180, 192, 512 y maskable · portada, rótulo de girar e icono de la pestaña en index.html · ${n} pantallas de arranque · ${(bytes / 1048576).toFixed(1)} MB`);
