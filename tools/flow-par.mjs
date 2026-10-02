// Recorre todas las misiones de todos los pueblos, varios a la vez: node tools/flow-par.mjs <url base> [hilos] [pueblo,pueblo…]
import { chromium } from 'playwright-core';
import { readFileSync } from 'fs';
const [,, base = 'http://127.0.0.1:5181/', N = 3, only = ''] = process.argv;
const towns = only ? only.split(',') : [...readFileSync('src/data/levels.js', 'utf8').matchAll(/\{ id: '([a-z-]+)'/g)].map(m => m[1]).filter(t => t !== 'otsagabia-ochagavia');
const flow = readFileSync('lab/flow-town.js', 'utf8');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
async function run(t) {
  const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('error ' + m.text().slice(0, 200)); });
  let out;
  try {
    await page.goto(base + '?town=' + t, { timeout: 300000 });
    await page.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 300000 });
    await page.evaluate((code) => { window.__flDone = null; Promise.resolve(eval(code)).then(l => window.__flDone = l, e => window.__flDone = ['ERROR ' + e.message]); }, flow);
    await page.waitForFunction(() => window.__flDone, null, { timeout: 900000, polling: 2000 });
    out = await page.evaluate(() => window.__flDone);
  } catch (e) { out = ['TIMEOUT/ERROR ' + e.message.split('\n')[0], ...(await page.evaluate(() => window.__fl || []).catch(() => []))]; }
  await page.close();
  const bad = out.filter(l => /FALLO|ERROR|TIMEOUT|bloqueada/.test(l));
  console.log(`== ${t}: ${bad.length ? 'PROBLEMAS' : 'ok'} | ${out.slice(-1)[0]}`);
  for (const l of bad) console.log('   ' + l);
  for (const e of [...new Set(errs)].slice(0, 5)) console.log('   ' + e);
}
const q = towns.slice();
await Promise.all(Array.from({ length: +N }, async () => { while (q.length) await run(q.shift()); }));
console.log('FIN');
await browser.close();
