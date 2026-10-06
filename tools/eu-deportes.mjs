// Euskera en el fútbol y la pelota: abre los dos en euskera (con ?eufaltan), pasa por menú, partido y ayuda, y
// apunta los textos que se quedan sin traducir en /tmp/eu-deportes.json. Uso: node tools/eu-deportes.mjs
import { chromium } from 'playwright-core';
import { writeFileSync } from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:5173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const init = () => { localStorage.setItem('mendimendiz-lang', 'eu'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true } })); localStorage.setItem('mendimendiz-futbol-v1', JSON.stringify({ v: 1, tutorial: true })); };
const all = new Set(), errs = [];
const grab = async (p) => { for (const s of await p.evaluate(() => [...(window.__euMiss || [])])) all.add(s); };
const sl = (p, ms) => p.waitForTimeout(ms);
// pelota
{ const p = await b.newPage({ viewport: { width: 844, height: 390 } }); await p.addInitScript(init); p.on('pageerror', e => errs.push(e.message));
  await p.goto(`${URL}/?town=lumbier&q=low&skipintro=1&eufaltan`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 });
  await p.evaluate(() => { const G = window.__game; G.fronton.play(G, G.pelotari); });
  await p.waitForFunction(() => document.querySelector('.pel-panel'), null, { timeout: 60000 });
  for (const sel of ['[data-pel-help]', '[data-pel-rules]', '.pel-tab']) await p.evaluate((s) => document.querySelectorAll(s).forEach(e => e.click()), sel);
  await sl(p, 500); await grab(p);
  await p.evaluate(() => document.querySelector('[data-pel-go]')?.click()); await sl(p, 9000); await grab(p);
  await p.screenshot({ path: '/tmp/claude-0/eu-pelota.png' }); await p.close(); console.log('pelota', all.size); writeFileSync('/tmp/eu-deportes.json', JSON.stringify([...all], null, 1)); }
// fútbol (desde el menú de campeonatos: elegir club, el menú del club, un partido en El Sadar)
{ const p = await b.newPage({ viewport: { width: 1100, height: 620 } }); await p.addInitScript(init); p.on('pageerror', e => errs.push(e.message));
  await p.goto(`${URL}/?screen=sports&eufaltan`, { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
  await sl(p, 800); await grab(p);
  await p.evaluate(() => { window.__futbolSport(); });
  await p.waitForFunction(() => document.querySelector('.lg-root .lg-rv'), null, { timeout: 120000 }); await grab(p);
  await p.evaluate(() => document.querySelector('.lg-root .lg-rv').click());
  await p.waitForFunction(() => document.querySelector('.lg-root [data-a="liga"]'), null, { timeout: 60000 }); await grab(p);
  await p.evaluate(() => document.querySelector('.lg-root [data-a="liga"]').click());
  await p.waitForFunction(() => document.querySelector('.lg-root [data-a="exit"]'), null, { timeout: 60000 }); await sl(p, 400); await grab(p);
  await p.evaluate(() => document.querySelector('.lg-root [data-a="exit"]').click());
  await p.waitForFunction(() => document.querySelector('.lg-root [data-a="amistoso"]'), null, { timeout: 60000 });
  await p.evaluate(() => document.querySelector('.lg-root [data-a="amistoso"]').click());
  await p.waitForFunction(() => document.querySelector('.lg-root .lg-rv'), null, { timeout: 60000 }); await grab(p);
  await p.evaluate(() => document.querySelector('.lg-root .lg-rv').click());
  await p.waitForFunction(() => window.__futbol && window.__futbol.game && document.body.classList.contains('futbol'), null, { timeout: 600000 });
  await p.evaluate(() => { const m = window.__futbol; m.game.autoplay = true; for (let i = 0; i < 30 * 40; i++) m.update(1 / 30); }); await sl(p, 2500); await grab(p);
  await p.evaluate(() => document.querySelector('.fb-root [class*="pause"], .fb-pause, [data-fb-pause]')?.click()); await sl(p, 800); await grab(p);
  await p.screenshot({ path: '/tmp/claude-0/eu-futbol.png' }); await p.close(); console.log('fútbol', all.size); }
writeFileSync('/tmp/eu-deportes.json', JSON.stringify([...all], null, 1));
console.log(errs.length ? errs.slice(0, 5).join('\n') : 'sin errores'); await b.close();
