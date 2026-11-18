// Cómo están hoy los frontones: la pantalla «Elige tu frontón», «Otro pueblo», el carrusel de Frontones del menú de pelota
// y dos partidos (la plaza del pueblo y el cubierto). En el ordenador (1280×720) y en el móvil tumbado (844×390).
// Capturas en OUT/fr-<tamaño>-<pantalla>.png.   Uso: node tools/frontones-estado.mjs   (servidor en 5173)
import { chromium } from 'playwright-core';
const URL = process.env.URL || 'http://127.0.0.1:5173', OUT = process.env.OUT || '/tmp/claude-0';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
const init = () => { localStorage.setItem('herrizherri-lang', 'es'); localStorage.setItem('herrizherri-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pelotari', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); };
for (const [w, h, tag] of [[1280, 720, 'pc'], [844, 390, 'movil']]) {
  if (process.env.TAM && process.env.TAM !== tag) continue;
  const p = await b.newPage({ viewport: { width: w, height: h } }); await p.addInitScript(init); p.on('pageerror', e => errs.push(tag + ': ' + e.message));
  const shot = (n) => p.screenshot({ path: `${OUT}/fr-${tag}-${n}.png` });
  const menu = async () => { await p.goto(URL + '/?screen=sports', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 }); await p.evaluate(() => document.querySelector('[data-sport="pelota"]').click()); await p.waitForFunction(() => document.querySelector('.lg-root [data-a="libre"]'), null, { timeout: 600000 }); await p.waitForTimeout(1200); };
  await menu();
  // «Elige tu frontón» y «Otro pueblo»
  await p.evaluate(() => document.querySelector('.tq-sede')?.click()); await p.waitForTimeout(1500); await shot('1-elige');
  console.log(tag, 'sedes:', await p.evaluate(() => [...document.querySelectorAll('.ef-it')].map(x => x.dataset.k + ':' + (x.querySelector('b')?.textContent || '')).join(' | ')));
  await p.evaluate(() => document.querySelector('.ef-it[data-k="otro"]')?.click()); await p.waitForTimeout(1500); await shot('2-otro-pueblo');
  // el carrusel de Frontones
  await menu(); await p.evaluate(() => document.querySelector('.lg-root [data-a="frontones"]').click()); await p.waitForTimeout(2500); await shot('3-frontones');
  console.log(tag, 'frontones del carrusel:', await p.evaluate(() => [...document.querySelectorAll('.c3-port[data-f]')].map(x => x.getAttribute('aria-label')).join(' | ')));
  for (let i = 0; i < 3; i++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(600); } await p.waitForTimeout(800); await shot('4-frontones-b');
  // dos partidos: en el frontón que viene elegido y en el cubierto
  for (const sede of ['', 'cubierto']) {
    await menu();
    if (sede) { await p.evaluate(() => document.querySelector('.tq-sede')?.click()); await p.waitForTimeout(1200); await p.evaluate((k) => { document.querySelector(`.ef-it[data-k="${k}"]`)?.click(); document.querySelector('.ef-card [data-a="ok"]')?.click(); }, sede); await p.waitForTimeout(1500); }
    await p.evaluate(() => document.querySelector('.lg-root [data-a="libre"]')?.click());
    await p.waitForFunction(() => document.querySelector('[data-pel-go]'), null, { timeout: 300000 }).catch(() => console.log(tag, 'sin presentación en', sede || 'plaza')); await p.waitForTimeout(1500);
    await p.evaluate(() => document.querySelector('[data-pel-go]')?.click());
    await p.waitForSelector('.pel-toss-go', { timeout: 120000 }).catch(() => {}); await p.waitForTimeout(1200);
    await p.evaluate(() => document.querySelector('.pel-toss-go')?.click()); await p.waitForTimeout(8000); await shot('5-partido-' + (sede || 'plaza'));
  }
  await p.close();
}
console.log(errs.length ? errs.join('\n') : 'sin errores'); await b.close();
