// Los rótulos del tráiler v14 (los del v13, a los tiempos de la música del menú). Los del v13, animados y sin fondo propio (van encima de la imagen del juego, v13/montaje.py): la
// palabra grande entra de golpe (de más grande y desenfocada a su sitio), la pequeña en oro se desliza, una raya dorada
// se dibuja debajo y, al final del compás, todo sale hacia un lado. Detrás, un velo fino y suave para que se lea, nunca
// opaco. Cada rótulo es una carpeta de PNG con transparencia a 1920 × 1080, uno por fotograma (24 por segundo); el del
// logo solo tiene la entrada y luego se queda quieto.
// Uso: node tools/trailer/v14/rotulos.mjs <carpeta>
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { BEAT, ROTULOS } from './plan.mjs';
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const F = (n) => `data:font/woff2;base64,${readFileSync(new URL(`../../../node_modules/@fontsource/${n}`, import.meta.url)).toString('base64')}`;
const TXT = {
  c1: ['UN EXPLORADOR', 'LLEGA A NAVARRA'], c2: ['LOS VECINOS', 'TE PIDEN AYUDA'], c3: ['EN CADA PUEBLO', 'UNA MISIÓN'],
  c4: ['TRABAJA', 'EL CAMPO'], c6: ['RECORRE', 'SUS VALLES'], c5: ['VIVE', 'SUS TRADICIONES'],
};
const css = `
@font-face{font-family:BC;font-weight:800;font-style:italic;src:url(${F('barlow-condensed/files/barlow-condensed-latin-800-italic.woff2')})}
@font-face{font-family:BC;font-weight:700;font-style:normal;src:url(${F('barlow-condensed/files/barlow-condensed-latin-700-normal.woff2')})}
html,body{margin:0;width:1920px;height:1080px;background:transparent;overflow:hidden}
#velo{position:absolute;inset:0;background:radial-gradient(ellipse 62% 46% at 50% 50%,rgba(10,4,24,.5) 0%,rgba(10,4,24,.3) 55%,rgba(10,4,24,0) 100%)}
.v{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#fff;text-align:center}
#k{font:700 62px/1 BC;letter-spacing:.32em;margin-right:-.32em;color:#ffd66b;text-shadow:0 3px 0 rgba(20,6,40,.6),0 2px 18px rgba(10,2,30,.9)}
#g{font:800 italic 210px/.9 BC;letter-spacing:.01em;text-shadow:0 7px 0 rgba(20,6,40,.6),0 0 60px rgba(10,2,30,.7)}
#r{width:420px;height:7px;border-radius:4px;background:#ffd66b;box-shadow:0 0 18px rgba(255,214,107,.7);margin-top:38px}
.logo #g{font-size:230px}.logo #k{order:2;margin-top:14px}.logo #r{display:none}`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
// D: lo que dura el rótulo (ms); logo: solo entra y se queda
const hazlo = async (nombre, k, g, D, logo) => {
  await p.setContent(`<style>${css}</style><div id="velo"></div><div class="v ${logo ? 'logo' : ''}"><div id="k">${k}</div><div id="g">${g}</div><div id="r"></div></div>`);
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(({ D, logo }) => {
    const o = (ms) => Math.min(1, Math.max(0, ms / D)), S = D - 230;      // (S: cuándo empieza a salir)
    const anim = (sel, kf) => document.querySelector(sel).animate(kf, { duration: D, fill: 'both' });
    const fin = logo ? [] : null;
    window.__a = [
      anim('#velo', logo ? [{ opacity: 0, offset: 0 }, { opacity: 1.3, offset: o(500) }, { opacity: 1.3, offset: 1 }]
        : [{ opacity: 0, offset: 0 }, { opacity: 1, offset: o(180) }, { opacity: 1, offset: o(S) }, { opacity: 0, offset: 1 }]),
      anim('#g', [
        { transform: 'scale(1.42)', filter: 'blur(14px)', opacity: 0, offset: 0, easing: 'cubic-bezier(.16,.9,.24,1)' },
        { transform: 'scale(1)', filter: 'blur(0px)', opacity: 1, offset: o(300) },
        ...(logo ? [{ transform: 'scale(1)', filter: 'blur(0px)', opacity: 1, offset: 1 }]
          : [{ transform: 'scale(1.035)', filter: 'blur(0px)', opacity: 1, offset: o(S), easing: 'cubic-bezier(.6,0,.9,.4)' },
             { transform: 'translateX(170px) scale(1.04) skewX(-8deg)', filter: 'blur(6px)', opacity: 0, offset: 1 }]),
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
  }, { D, logo });
  const dir = `${out}/${nombre}`; rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const n = logo ? Math.round(1.4 * 24) : Math.round(D / 1000 * 24);
  for (let i = 0; i < n; i++) {
    await p.evaluate((t) => window.__a.forEach(a => { a.currentTime = t; }), i * 1000 / 24);
    await p.screenshot({ path: `${dir}/${String(i).padStart(4, '0')}.png`, omitBackground: true });
  }
  console.log(nombre, n, 'fotogramas');
};
for (const [nom, , tiempos] of ROTULOS) await hazlo(nom, ...TXT[nom], tiempos * BEAT * 1000, false);
await hazlo('logo', 'NAVARRA, PUEBLO A PUEBLO', 'HERRIZHERRI', 5600, true);
await b.close();
