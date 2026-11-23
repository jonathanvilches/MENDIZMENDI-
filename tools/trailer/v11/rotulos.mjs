// Los rótulos del tráiler v11, con la letra del juego (Barlow Condensed): los capítulos de la historia del explorador
// (llega a Navarra, los vecinos le piden ayuda, en cada pueblo una misión, el campo, las tradiciones) y el logo. Van sobre
// negro, entre un capítulo y el siguiente (v11/montaje.mjs), para no tapar la interfaz del juego, que es lo que se quiere
// enseñar. La palabra pequeña en oro encima y la grande en blanco, como en el v8. PNG con transparencia a 1920 × 1080.
// Uso: node tools/trailer/v11/rotulos.mjs <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const F = (n) => `data:font/woff2;base64,${readFileSync(new URL(`../../../node_modules/@fontsource/${n}`, import.meta.url)).toString('base64')}`;
const css = `
@font-face{font-family:BC;font-weight:800;font-style:italic;src:url(${F('barlow-condensed/files/barlow-condensed-latin-800-italic.woff2')})}
@font-face{font-family:BC;font-weight:700;font-style:normal;src:url(${F('barlow-condensed/files/barlow-condensed-latin-700-normal.woff2')})}
html,body{margin:0;width:1920px;height:1080px;background:transparent;overflow:hidden}
.v{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#fff;text-align:center}
.k{font:700 60px/1 BC;letter-spacing:.3em;margin-right:-.3em;color:#ffd66b;text-shadow:0 3px 0 rgba(20,6,40,.6),0 2px 18px rgba(10,2,30,.9)}
.g{font:800 italic 196px/.92 BC;letter-spacing:.01em;text-shadow:0 7px 0 rgba(20,6,40,.6),0 0 70px rgba(10,2,30,.8)}
.t{font:800 italic 200px/.9 BC;letter-spacing:.01em;text-shadow:0 6px 0 rgba(20,6,40,.55),0 0 50px rgba(10,2,30,.7)}`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const foto = async (nombre, velo, html) => {
  await p.setContent(`<style>${css} body{background:radial-gradient(ellipse 70% 52% at 50% 50%, rgba(10,4,24,${velo}) 0%, rgba(10,4,24,${velo * 0.6}) 55%, rgba(10,4,24,0) 100%)}</style><div class="v">${html}</div>`);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `${out}/${nombre}.png`, omitBackground: true });
};
await foto('c1', 0, `<div class="k">UN EXPLORADOR</div><div class="g">LLEGA A NAVARRA</div>`);
await foto('c2', 0, `<div class="k">LOS VECINOS</div><div class="g">TE PIDEN AYUDA</div>`);
await foto('c3', 0, `<div class="k">EN CADA PUEBLO</div><div class="g">UNA MISIÓN</div>`);
await foto('c4', 0, `<div class="k">TRABAJA</div><div class="g">EL CAMPO</div>`);
await foto('c5', 0, `<div class="k">VIVE</div><div class="g">SUS TRADICIONES</div>`);
await foto('logo', 0.6, `<div class="t">HERRIZHERRI</div><div class="k">NAVARRA, PUEBLO A PUEBLO</div>`);
await b.close();
console.log('rótulos hechos');
