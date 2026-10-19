// Prepara la edición del juego para publicarla como artefacto de Claude, a partir de la compilación
// ARTEFACTO=1 npx vite build (dist-artefacto/, ver vite.config.js).
//  · dist-artefacto/herrizherri.html: la página sin <!doctype>, <html>, <head> ni <body> (el visor la mete en su propio
//    esqueleto, que ya los trae)
//  · dist-artefacto/tandas.json: los archivos de assets/ en tandas de como mucho 250 archivos y 60 MB (un artefacto
//    admite 255 archivos y 64 MB por publicación, 511 archivos y 256 MB en total)
// Uso: node tools/artefacto.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';

const D = 'dist-artefacto';
let html = readFileSync(`${D}/index.html`, 'utf8');
html = html.replace(/^\s*<!doctype html>\s*/i, '').replace(/<html[^>]*>\s*/i, '').replace(/<\/html>\s*$/i, '')
  .replace(/<head>\s*/i, '').replace(/<\/head>\s*/i, '').replace(/<body[^>]*>\s*/i, '').replace(/<\/body>\s*/i, '');
// (el título, arriba del todo: el visor solo lo busca en los primeros 8 KB)
const t = html.match(/<title>[^<]*<\/title>\s*/i);
if (t) html = t[0] + html.replace(t[0], '');
writeFileSync(`${D}/herrizherri.html`, html);

const files = readdirSync(`${D}/assets`).map(f => ({ f: `assets/${f}`, s: statSync(`${D}/assets/${f}`).size })).sort((a, b) => b.s - a.s);
const total = files.reduce((a, x) => a + x.s, 0);
if (files.length + 1 > 511 || total > 250e6) throw new Error(`no cabe en un artefacto: ${files.length + 1} archivos, ${(total / 1e6).toFixed(1)} MB`);
// (de mayor a menor, cada archivo en la primera tanda donde quepa)
const tandas = [];
for (const x of files) {
  if (x.s > 15e6) throw new Error(`${x.f} pasa de 15 MB`);
  let t = tandas.find(t => t.n < 250 && t.s + x.s <= 60e6);
  if (!t) tandas.push(t = { n: 0, s: 0, files: [] });
  t.files.push(x.f); t.n++; t.s += x.s;
}
writeFileSync(`${D}/tandas.json`, JSON.stringify(tandas.map(t => t.files)));
console.log(`página: ${(html.length / 1e6).toFixed(2)} MB · ${files.length} archivos, ${(total / 1e6).toFixed(1)} MB en ${tandas.length} tandas: ${tandas.map(t => `${t.n} (${(t.s / 1e6).toFixed(1)} MB)`).join(', ')}`);
