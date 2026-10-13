// Icono y pantallas de arranque de la app instalada (la web). El icono: Mendi, el protagonista (imagen del autor,
// src/assets/pelotaris/web/vs/azul/mendi.webp), delante de Isaba al atardecer (lámina del autor,
// src/assets/laminas/web/isaba-izaba.webp, desenfocada y con el morado del juego: Herrizherri, de pueblo en pueblo), con
// un halo rosa que lo separa del fondo. Se compone en una página y se captura a 1024 px:
//  · public/icon-180.png (iPhone y iPad), icon-192.png e icon-512.png, e icon-maskable-512.png (Android: Mendi más
//    pequeño, dentro de la zona que ningún recorte toca)
//  · el icono de la portada con la que arranca la página y el de la pestaña, dentro de index.html (#portada-app)
//  · public/girar.webp: el rótulo «Gira la pantalla · Biratu pantaila» de la pantalla de girar (#girar-app en
//    index.html), como imagen con la letra del juego: sale antes de que cargue la letra y es el mismo que el de la
//    pantalla de arranque
//  · public/splash/*.jpg: la pantalla de arranque del iPhone y del iPad de cada tamaño (src/web/splash.js). En horizontal,
//    la misma portada de index.html; en vertical, la pantalla de girar (la app se juega en horizontal). Así al abrir la
//    app no salta de una a otra
// Los iconos de antes se guardan en tools/app/antes/ y tools/app/antes-busto/ (no se borran). Uso: node tools/app-iconos.mjs
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DISPOSITIVOS } from '../src/web/splash.js';

const A = pathToFileURL(process.cwd() + '/src/assets/').href;
// k: tamaño de Mendi (1 en el icono; 0,8 en el de Android, para que quede dentro de la zona segura), escalado desde el centro
const iconPage = (k) => `<!doctype html><meta charset="utf-8"><style>
  html,body{margin:0;width:1024px;height:1024px;overflow:hidden;background:#12062e}
  .bg{position:absolute;inset:-20px;background:url(${A}laminas/web/isaba-izaba.webp) 18% 50%/auto 1064px no-repeat;filter:saturate(1.1) blur(2px)}
  .tint{position:absolute;inset:0;background:linear-gradient(180deg,rgba(120,60,255,.25) 0%,rgba(194,28,255,.15) 45%,rgba(30,10,68,.92) 100%);mix-blend-mode:multiply}
  .dark{position:absolute;inset:0;background:radial-gradient(70% 60% at 50% 42%,rgba(0,0,0,0) 40%,rgba(10,3,30,.55) 100%)}
  .glow{position:absolute;left:50%;top:46%;width:760px;height:760px;transform:translate(-50%,-50%);background:radial-gradient(closest-side,rgba(255,122,200,.55),rgba(255,43,214,0) 72%)}
  .m{position:absolute;width:${1460 * k}px;left:${512 - 772 * k}px;top:${512 - 402 * k}px;filter:drop-shadow(0 0 2px rgba(255,255,255,.9)) drop-shadow(0 0 16px rgba(255,122,200,.85)) drop-shadow(0 18px 30px rgba(10,3,30,.6))}
  </style><div class="bg"></div><div class="tint"></div><div class="dark"></div><div class="glow"></div><img class="m" src="${A}pelotaris/web/vs/azul/mendi.webp">`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const tmp = mkdtempSync(join(tmpdir(), 'icono-'));
async function icon(k) {
  const f = join(tmp, `icono-${k}.html`); writeFileSync(f, iconPage(k));
  const p = await (await b.newContext({ viewport: { width: 1024, height: 1024 } })).newPage();
  await p.goto(pathToFileURL(f).href); await p.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
  const png = await p.screenshot({ type: 'png' }); await p.context().close(); return png;
}

mkdirSync('tools/app/antes', { recursive: true }); mkdirSync('public/splash', { recursive: true });
for (const f of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) if (existsSync(`public/${f}`) && !existsSync(`tools/app/antes/${f}`)) copyFileSync(`public/${f}`, `tools/app/antes/${f}`);
// (los del busto de Mendi sobre morado, los del 2026-10-13, también se guardan)
mkdirSync('tools/app/antes-busto', { recursive: true });
for (const f of ['icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) if (existsSync(`public/${f}`) && !existsSync(`tools/app/antes-busto/${f}`)) copyFileSync(`public/${f}`, `tools/app/antes-busto/${f}`);
const big = await icon(1);
for (const n of [180, 192, 512]) await sharp(big).resize(n, n, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(`public/icon-${n}.png`);
await sharp(await icon(0.8)).resize(512, 512, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile('public/icon-maskable-512.png');
// la portada de index.html y la pestaña: el icono dentro de la página (también va en el archivo único)
const uri = async (n, q) => 'data:image/webp;base64,' + (await sharp(big).resize(n, n, { kernel: 'lanczos3' }).webp({ quality: q }).toBuffer()).toString('base64');
let html = readFileSync('index.html', 'utf8');
html = html.replace(/<div class="pa-ico">[\s\S]*?<\/div>/, `<div class="pa-ico"><img src="${await uri(384, 82)}" alt=""></div>`);
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
const css = html.match(/<style id="portada-app-css">([\s\S]*?)<\/style>/)[1], cover = html.match(/<div id="portada-app"[\s\S]*?<\/i><\/div>/)[0];
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
