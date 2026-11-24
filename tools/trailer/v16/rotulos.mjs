// Los rótulos del tráiler v16 (los del v15; el capítulo de la pelota: «COMPITE EN LOS CAMPEONATOS»), animados y sin fondo propio (van encima del juego, v16/montaje.py):
// · los capítulos que cuentan la historia del pequeño explorador, en el centro (como los del v13: la palabra grande entra de
//   golpe, la pequeña en oro se desliza, una raya dorada debajo y al final sale todo hacia un lado);
// · el nombre de cada pueblo mientras el explorador corre (el autor: «va poniendo Ochagavía, Puente la Reina, Isaba, Pamplona,
//   Tudela»), abajo a la izquierda para no tapar al explorador, con el nombre en euskera en pequeño, en oro, encima;
// · y el logo. Cada uno, una carpeta de PNG con transparencia a 1920 × 1080, una imagen por fotograma (24 por segundo).
// Uso: node tools/trailer/v16/rotulos.mjs <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { BEAT, ROTULOS } from './plan.mjs';
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const F = (n) => `data:font/woff2;base64,${readFileSync(new URL(`../../../node_modules/@fontsource/${n}`, import.meta.url)).toString('base64')}`;
export const TXT = {
  c1: ['UN PEQUEÑO EXPLORADOR', 'LLEGA A NAVARRA'], c2: ['AYUDA', 'A LOS VECINOS'], c3: ['COMPLETA', 'SUS MISIONES'],
  c4: ['DESCUBRE', 'SUS LEYENDAS'], c5: ['COMPITE', 'EN LOS CAMPEONATOS'], c6: ['RECORRE', 'TODAS LAS COMARCAS'],
  p1: ['OTSAGABIA', 'OCHAGAVÍA'], p2: ['GARES', 'PUENTE LA REINA'], p3: ['IZABA', 'ISABA'], p4: ['IRUÑA', 'PAMPLONA'], p5: ['TUTERA', 'TUDELA'],
};
const css = `
@font-face{font-family:BC;font-weight:800;font-style:italic;src:url(${F('barlow-condensed/files/barlow-condensed-latin-800-italic.woff2')})}
@font-face{font-family:BC;font-weight:700;font-style:normal;src:url(${F('barlow-condensed/files/barlow-condensed-latin-700-normal.woff2')})}
html,body{margin:0;width:1920px;height:1080px;background:transparent;overflow:hidden}
#velo{position:absolute;inset:0;background:radial-gradient(ellipse 62% 46% at 50% 50%,rgba(10,4,24,.5) 0%,rgba(10,4,24,.3) 55%,rgba(10,4,24,0) 100%)}
.v{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#fff;text-align:center}
#k{font:700 62px/1 BC;letter-spacing:.32em;margin-right:-.32em;color:#ffd66b;text-shadow:0 3px 0 rgba(20,6,40,.6),0 2px 18px rgba(10,2,30,.9)}
#g{font:800 italic 200px/.9 BC;letter-spacing:.01em;text-shadow:0 7px 0 rgba(20,6,40,.6),0 0 60px rgba(10,2,30,.7)}
#r{width:420px;height:7px;border-radius:4px;background:#ffd66b;box-shadow:0 0 18px rgba(255,214,107,.7);margin-top:38px}
.logo #g{font-size:230px}.logo #k{order:2;margin-top:14px}.logo #r{display:none}
/* el nombre del pueblo: abajo a la izquierda */
.lugar #velo{background:radial-gradient(ellipse 34% 30% at 14% 84%,rgba(10,4,24,.5) 0%,rgba(10,4,24,.26) 55%,rgba(10,4,24,0) 100%)}
.lugar .v{align-items:flex-start;justify-content:flex-end;padding:0 0 132px 120px;box-sizing:border-box;text-align:left;gap:2px}
.lugar #k{font-size:44px;letter-spacing:.28em;margin:0}
.lugar #g{font-size:132px;transform-origin:0 100%}
.lugar #r{width:260px;height:6px;margin-top:20px;transform-origin:0 50%}`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
// D: lo que dura (ms); tipo: 'centro', 'lugar' o 'logo' (el logo solo entra y se queda)
const hazlo = async (nombre, k, g, D, tipo) => {
  const logo = tipo === 'logo';
  await p.setContent(`<style>${css}</style><div class="${tipo}"><div id="velo"></div><div class="v"><div id="k">${k}</div><div id="g">${g}</div><div id="r"></div></div></div>`);
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(({ D, logo, lugar }) => {
    const o = (ms) => Math.min(1, Math.max(0, ms / D)), S = D - 230, dx = lugar ? -90 : 170;
    const anim = (sel, kf) => document.querySelector(sel).animate(kf, { duration: D, fill: 'both' });
    window.__a = [
      anim('#velo', logo ? [{ opacity: 0, offset: 0 }, { opacity: 1, offset: o(500) }, { opacity: 1, offset: 1 }]
        : [{ opacity: 0, offset: 0 }, { opacity: 1, offset: o(180) }, { opacity: 1, offset: o(S) }, { opacity: 0, offset: 1 }]),
      anim('#g', [
        { transform: lugar ? 'translateX(-60px)' : 'scale(1.42)', filter: 'blur(14px)', opacity: 0, offset: 0, easing: 'cubic-bezier(.16,.9,.24,1)' },
        { transform: lugar ? 'translateX(0)' : 'scale(1)', filter: 'blur(0px)', opacity: 1, offset: o(300) },
        ...(logo ? [{ transform: 'scale(1)', filter: 'blur(0px)', opacity: 1, offset: 1 }]
          : [{ transform: lugar ? 'translateX(8px)' : 'scale(1.035)', filter: 'blur(0px)', opacity: 1, offset: o(S), easing: 'cubic-bezier(.6,0,.9,.4)' },
             { transform: `translateX(${dx}px)${lugar ? '' : ' scale(1.04) skewX(-8deg)'}`, filter: 'blur(6px)', opacity: 0, offset: 1 }]),
      ]),
      anim('#k', [
        { transform: 'translateX(-70px)', opacity: 0, offset: 0 }, { transform: 'translateX(-70px)', opacity: 0, offset: o(logo ? 450 : 90), easing: 'cubic-bezier(.2,.9,.3,1)' },
        { transform: 'translateX(0)', opacity: 1, offset: o(logo ? 850 : 380) },
        ...(logo ? [{ transform: 'translateX(0)', opacity: 1, offset: 1 }]
          : [{ transform: 'translateX(0)', opacity: 1, offset: o(S), easing: 'cubic-bezier(.6,0,.9,.4)' }, { transform: 'translateX(-120px)', opacity: 0, offset: 1 }]),
      ]),
      anim('#r', [
        { transform: 'scaleX(0)', opacity: 1, offset: 0 }, { transform: 'scaleX(0)', opacity: 1, offset: o(160), easing: 'cubic-bezier(.2,.9,.3,1)' },
        { transform: 'scaleX(1)', opacity: 1, offset: o(520) }, { transform: 'scaleX(1)', opacity: 1, offset: o(S) },
        { transform: 'scaleX(0)', opacity: 0, offset: 1 },
      ]),
    ];
    window.__a.forEach(a => a.pause());
  }, { D, logo, lugar: tipo === 'lugar' });
  const dir = `${out}/${nombre}`; rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const n = logo ? Math.round(1.4 * 24) : Math.round(D / 1000 * 24);
  for (let i = 0; i < n; i++) {
    await p.evaluate((t) => window.__a.forEach(a => { a.currentTime = t; }), i * 1000 / 24);
    await p.screenshot({ path: `${dir}/${String(i).padStart(4, '0')}.png`, omitBackground: true });
  }
  console.log(nombre, n, 'fotogramas');
};
for (const [nom, , tiempos] of ROTULOS) await hazlo(nom, ...TXT[nom], tiempos * BEAT * 1000, nom.startsWith('p') ? 'lugar' : 'centro');
await hazlo('logo', 'NAVARRA, PUEBLO A PUEBLO', 'HERRIZHERRI', 5600, 'logo');
await b.close();
