// Hornea las texturas de los árboles (world/arbol.js, world/texturasArboles.js) en src/assets/texturas/:
//   hojas.webp (2048 × 2048, con transparencia): el atlas de ramillas de tools/hojas-pinta.js, pintado en Chromium
//   corteza-haya.webp (512, enlosable): la corteza lisa de la haya, también pintada con código
//   corteza-roble.webp, corteza-pino.webp y corteza-chopo.webp (512): de fotos de dominio público (CC0), si se pasa la
//   carpeta con ellas: oak_color_1k.jpg (Poly Haven, bark_brown_02), pine_color_1k.jpg (TextureCan) y
//   willow_color_1k.jpg (Poly Haven, bark_willow_02)
// Uso: node tools/hojas-atlas.mjs [carpeta de las cortezas CC0]
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const sharp = createRequire(import.meta.url)('sharp');
const RAIZ = path.dirname(path.dirname(new URL(import.meta.url).pathname)), OUT = path.join(RAIZ, 'src/assets/texturas');
const [, , cortezas] = process.argv;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const p = await b.newPage();
p.on('pageerror', e => console.log('ERROR', e.message));
await p.route('http://horno.local/**', rt => {
  const u = new URL(rt.request().url()).pathname;
  if (u === '/') return rt.fulfill({ body: '<!doctype html><body></body>', contentType: 'text/html' });
  return rt.fulfill({ body: fs.readFileSync(path.join(RAIZ, u)), contentType: 'text/javascript' });
});
await p.goto('http://horno.local/');
const [hojas, haya] = await p.evaluate(async () => { const M = await import('/tools/hojas-pinta.js'); return [M.pintaAtlas(2048).toDataURL('image/png'), M.pintaCortezaHaya(512).toDataURL('image/png')]; });
await b.close();
const png = (d) => Buffer.from(d.split(',')[1], 'base64');
await sharp(png(hojas)).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(path.join(OUT, 'hojas.webp'));
await sharp(png(haya)).webp({ quality: 86, effort: 6 }).toFile(path.join(OUT, 'corteza-haya.webp'));
if (cortezas) for (const [f, n] of [['oak_color_1k.jpg', 'roble'], ['pine_color_1k.jpg', 'pino'], ['willow_color_1k.jpg', 'chopo']]) {
  const src = path.join(cortezas, f); if (!fs.existsSync(src)) { console.log('falta', src); continue; }
  await sharp(src).resize(512, 512).webp({ quality: 84, effort: 6 }).toFile(path.join(OUT, `corteza-${n}.webp`));
}
for (const f of fs.readdirSync(OUT).filter(f => /^(hojas|corteza-)/.test(f))) console.log(f, Math.round(fs.statSync(path.join(OUT, f)).size / 1024), 'KB');
