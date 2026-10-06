// Campeonatos desde el menú: la pantalla, el fútbol sin pueblo (elegir club, menú, partido, salir) y la pelota en el
// frontón elegido (menú de pelota, partido, salir al inicio). Capturas en /tmp/claude-0/camp-*.png
// Uso: node tools/campeonatos.mjs   (servidor en 5173)
import { chromium } from 'playwright-core';
const URL = process.env.URL || 'http://127.0.0.1:5173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
const init = () => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'pelotari', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); localStorage.setItem('mendimendiz-futbol-v1', JSON.stringify({ v: 1, tutorial: true })); };
const shot = (p, n) => p.screenshot({ path: `/tmp/claude-0/camp-${n}.png` });
for (const [w, h, tag] of [[1280, 720, 'pc'], [844, 390, 'movil']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } }); await p.addInitScript(init);
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '/?screen=sports', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
  await p.waitForTimeout(1200); await shot(p, tag + '-pantalla');
  if (tag === 'movil') { await p.evaluate(() => document.querySelector('#hMain').scrollTo(0, 9999)); await p.waitForTimeout(300); await shot(p, tag + '-pantalla2'); }
  await p.close();
}
// fútbol sin pueblo
{ const p = await b.newPage({ viewport: { width: 844, height: 390 } }); await p.addInitScript(init); p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '/?screen=sports', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
  await p.evaluate(() => document.querySelector('[data-sport="futbol"]').click());
  await p.waitForFunction(() => document.querySelector('.lg-root .lg-rv'), null, { timeout: 120000 }); await shot(p, 'fut-club');
  await p.evaluate(() => document.querySelector('.lg-root .lg-rv').click());
  await p.waitForFunction(() => document.querySelector('.lg-root [data-a="amistoso"]'), null, { timeout: 60000 }); await shot(p, 'fut-menu');
  await p.evaluate(() => document.querySelector('.lg-root [data-a="sadar"]').click());
  await p.waitForFunction(() => window.__futbol && window.__futbol.game && document.body.classList.contains('futbol'), null, { timeout: 600000 }).catch(() => {});
  const st = await p.evaluate(() => ({ fut: !!window.__futbol, mode: window.__futbol?.o?.mode }));
  console.log('fútbol: partido', JSON.stringify(st));
  await p.evaluate(() => { const m = window.__futbol; if (!m) return; m.game.autoplay = true; for (let i = 0; i < 30 * 8; i++) m.update(1 / 30); });
  await p.waitForTimeout(2500); await shot(p, 'fut-partido');
  await p.evaluate(() => window.__futbol?.exit({ quit: true }));
  await p.waitForFunction(() => document.querySelector('.lg-root [data-a="exit"]'), null, { timeout: 60000 }); await shot(p, 'fut-vuelta');
  await p.evaluate(() => document.querySelector('.lg-root [data-a="exit"]').click());
  await p.waitForFunction(() => !document.querySelector('#hub.hidden'), null, { timeout: 30000 });
  console.log('fútbol: de vuelta al menú', await p.evaluate(() => window.__hub.screen)); await p.close(); }
// pelota en el frontón elegido
{ const p = await b.newPage({ viewport: { width: 844, height: 390 } }); await p.addInitScript(init); p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '/?screen=sports', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
  await p.evaluate(() => document.querySelector('[data-fronton="lumbier"]').click()); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('[data-sport="pelota"]').click());
  await p.waitForFunction(() => document.querySelector('.lg-root [data-a="torneo"]'), null, { timeout: 600000 }); await shot(p, 'pel-menu');
  await p.evaluate(() => document.querySelector('.lg-root [data-a="libre"]').click());
  await p.waitForFunction(() => document.querySelector('.pel-panel'), null, { timeout: 60000 }); await shot(p, 'pel-panel');
  await p.evaluate(() => document.querySelector('[data-pel-go]').click()); await p.waitForTimeout(4000); await shot(p, 'pel-partido');
  await p.evaluate(() => document.querySelector('.pel-exit').click()); await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelector('[data-pel-yes]').click());
  await p.waitForFunction(() => document.querySelector('.lg-root [data-a="exit"]'), null, { timeout: 60000 });
  await p.evaluate(() => document.querySelector('.lg-root [data-a="exit"]').click());
  await p.waitForFunction(() => !document.querySelector('#hub.hidden') && !window.__game, null, { timeout: 60000 });
  console.log('pelota: de vuelta al menú', await p.evaluate(() => window.__hub.screen)); await p.close(); }
console.log(errs.length ? errs.join('\n') : 'sin errores'); await b.close();
