// El carrusel de campeonatos de pelota, en el ordenador (1280×720) y en el móvil tumbado (844×390): de frente, a medio
// giro y tras varios pasos. Capturas en OUT/carr-*.png.   Uso: node tools/carrusel-campeonatos.mjs   (servidor en 5173)
import { chromium } from 'playwright-core';
const URL = process.env.URL || 'http://127.0.0.1:5173', OUT = process.env.OUT || '/tmp/claude-0', TAG = process.env.TAG || '';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
const init = () => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pelotari', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); };
for (const [w, h, tag] of [[1280, 720, 'pc'], [844, 390, 'movil'], [390, 844, 'pie'], [1920, 1080, 'grande']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } }); await p.addInitScript(init);
  p.on('pageerror', e => errs.push(tag + ': ' + e.message));
  await p.goto(URL + '/?screen=sports', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
  await p.evaluate(() => document.querySelector('[data-sport="pelota"]').click());
  await p.waitForFunction(() => document.querySelector('.lg-root [data-a="torneo"]'), null, { timeout: 600000 });
  await p.waitForTimeout(1500); await p.screenshot({ path: `${OUT}/carr${TAG}-${tag}-1.png` });
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(140); await p.screenshot({ path: `${OUT}/carr${TAG}-${tag}-2giro.png` });
  await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/carr${TAG}-${tag}-3.png` });
  for (let i = 0; i < 4; i++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500); }
  await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/carr${TAG}-${tag}-4.png` });
  await p.close();
}
console.log(errs.length ? errs.join('\n') : 'sin errores'); await b.close();
