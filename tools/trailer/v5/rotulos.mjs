// Los dos únicos rótulos del tráiler v5, con la letra del juego (Barlow Condensed): «Herrizherri · Navarra, pueblo a
// pueblo» cuando lo dice Salva, y «Ya puedes jugar» al final. PNG con transparencia, a 1920 × 1080, que el montaje pone
// encima del juego. Uso: node tools/trailer/v5/rotulos.mjs <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';
const out = process.argv[2]; mkdirSync(out, { recursive: true });
// (las fuentes van dentro, en base64: una página sin dirección no puede leer archivos del disco)
const F = (n) => `data:font/woff2;base64,${readFileSync(new URL(`../../../node_modules/@fontsource/${n}`, import.meta.url)).toString('base64')}`;
const css = `
@font-face{font-family:BC;font-weight:800;font-style:italic;src:url(${F('barlow-condensed/files/barlow-condensed-latin-800-italic.woff2')})}
@font-face{font-family:BC;font-weight:700;font-style:normal;src:url(${F('barlow-condensed/files/barlow-condensed-latin-700-normal.woff2')})}
@font-face{font-family:B;font-weight:600;src:url(${F('barlow/files/barlow-latin-600-normal.woff2')})}
html,body{margin:0;width:1920px;height:1080px;background:transparent;overflow:hidden}
.v{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;color:#fff;text-align:center}
.t{font:800 italic 190px/0.9 BC;letter-spacing:.01em;text-shadow:0 6px 0 rgba(20,6,40,.55),0 0 50px rgba(10,2,30,.7)}
.k{font:700 40px/1 BC;letter-spacing:.32em;color:#ffd66b;text-shadow:0 2px 12px rgba(10,2,30,.8)}
.s{font:700 30px/1 BC;letter-spacing:.2em;color:#e9defa;text-shadow:0 2px 12px rgba(10,2,30,.8)}
.u{font:600 30px/1 B;color:#e9defa;opacity:.9;text-shadow:0 2px 12px rgba(10,2,30,.8)}
.j{font:800 italic 96px/1 BC;text-shadow:0 5px 0 rgba(20,6,40,.55),0 0 40px rgba(10,2,30,.7)}`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const foto = async (nombre, velo, html) => {
  await p.setContent(`<style>${css} body{background:radial-gradient(ellipse at 50% 50%, rgba(10,4,24,${velo}) 0%, rgba(10,4,24,${velo * 0.75}) 60%, rgba(10,4,24,${velo * 0.45}) 100%)}</style><div class="v">${html}</div>`);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `${out}/${nombre}.png`, omitBackground: true });
};
await foto('titulo', 0.5, `<div class="t">HERRIZHERRI</div><div class="k">NAVARRA, PUEBLO A PUEBLO</div><div class="s">12 COMARCAS · 38 PUEBLOS</div>`);
await foto('jugar', 0.62, `<div class="t" style="font-size:150px">HERRIZHERRI</div><div class="j">YA PUEDES JUGAR</div><div class="u">jonathanvilches.github.io/MENDIZMENDI-</div>`);
await b.close();
console.log('rótulos hechos');
