// Los rótulos del tráiler v6, con la letra del juego (Barlow Condensed): las tres frases cortas («Explora 38 pueblos»,
// «Descubre sus leyendas», «Vive sus tradiciones») y el logo con «Navarra, pueblo a pueblo». Sin cajas: la palabra
// pequeña en oro encima y la grande en blanco, con una sombra y un velo oscuro muy suave detrás para leerse sobre
// cualquier plano. PNG con transparencia a 1920 × 1080, que el montaje pone encima (v6/montaje.mjs).
// Uso: node tools/trailer/v6/rotulos.mjs <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const F = (n) => `data:font/woff2;base64,${readFileSync(new URL(`../../../node_modules/@fontsource/${n}`, import.meta.url)).toString('base64')}`;
const css = `
@font-face{font-family:BC;font-weight:800;font-style:italic;src:url(${F('barlow-condensed/files/barlow-condensed-latin-800-italic.woff2')})}
@font-face{font-family:BC;font-weight:700;font-style:normal;src:url(${F('barlow-condensed/files/barlow-condensed-latin-700-normal.woff2')})}
html,body{margin:0;width:1920px;height:1080px;background:transparent;overflow:hidden}
.v{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#fff;text-align:center}
.k{font:700 46px/1 BC;letter-spacing:.34em;margin-right:-.34em;color:#ffd66b;text-shadow:0 2px 14px rgba(10,2,30,.85)}
.g{font:800 italic 168px/.92 BC;letter-spacing:.01em;text-shadow:0 6px 0 rgba(20,6,40,.5),0 0 60px rgba(10,2,30,.65)}
.t{font:800 italic 200px/.9 BC;letter-spacing:.01em;text-shadow:0 6px 0 rgba(20,6,40,.55),0 0 50px rgba(10,2,30,.7)}`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const foto = async (nombre, velo, html) => {
  await p.setContent(`<style>${css} body{background:radial-gradient(ellipse 60% 45% at 50% 50%, rgba(10,4,24,${velo}) 0%, rgba(10,4,24,${velo * 0.55}) 55%, rgba(10,4,24,0) 100%)}</style><div class="v">${html}</div>`);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `${out}/${nombre}.png`, omitBackground: true });
};
await foto('explora', 0.38, `<div class="k">EXPLORA</div><div class="g">38 PUEBLOS</div>`);
await foto('descubre', 0.38, `<div class="k">DESCUBRE</div><div class="g">SUS LEYENDAS</div>`);
await foto('vive', 0.38, `<div class="k">VIVE</div><div class="g">SUS TRADICIONES</div>`);
await foto('logo', 0.5, `<div class="t">HERRIZHERRI</div><div class="k">NAVARRA, PUEBLO A PUEBLO</div>`);
await b.close();
console.log('rótulos hechos');
