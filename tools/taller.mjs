// Recorre un taller de oficio como un jugador (herramientas, pasos, elegir, ordenar, antes y ahora) y hace capturas.
// Uso: node tools/taller.mjs <pueblo> <carpeta> [ancho x alto]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'aribe', out = 'entrega/oficios', size = '1280x720'] = process.argv;
mkdirSync(out, { recursive: true });
const [w, h] = size.split('x').map(Number), mobile = w < 900;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(`http://127.0.0.1:5173/?town=${town}&quality=low`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
let k = 0;
const shot = async (n) => { await p.waitForTimeout(700); await p.screenshot({ path: `${out}/${town}-${size}-${String(k++).padStart(2, '0')}-${n}.png`, timeout: 180000 }); };
await p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.type === 'trade'); M.step = 1; G.player.place(M.bench.x + 1.5, M.bench.z + 1.5, 0); window.__done = false; G.doWorkshop(M).then(() => window.__done = true); });
// recorre las pantallas: tarjetas (botón), ordenar (en orden), elegir (respuesta), pulsar (muchas veces), golpe (con autoWin)
for (let i = 0; i < 30; i++) {
  await p.waitForTimeout(900);
  const kind = await p.evaluate(() => { const q = (c) => document.querySelector('.mg-overlay:not(.out)' + c); return q('.choice') ? 'choice' : q('.seq') ? 'order' : q('.mash') ? 'mash' : q('.timing') ? 'timing' : q(' button') ? 'card' : window.__done ? 'fin' : 'nada'; });
  if (kind === 'fin') break;
  if (kind === 'nada') continue;
  console.log('pantalla', kind);
  if (kind !== 'mash') await shot(kind);
  if (kind === 'card') await p.evaluate(() => document.querySelector('.mg-overlay:not(.out) button').click());
  else if (kind === 'order') { const n = await p.evaluate(() => document.querySelectorAll('.opt').length); for (let j = 0; j < n; j++) await p.evaluate((j) => document.querySelector(`.opt[data-i="${j}"]`).click(), j); await p.waitForTimeout(1500); }
  else if (kind === 'choice') { await p.evaluate(() => document.querySelectorAll('.opt')[1]?.click()); await p.waitForTimeout(500); await shot('choice-error'); await p.evaluate(() => { const bs = [...document.querySelectorAll('.opt')]; (bs.find(b => !b.disabled && !b.classList.contains('wrong')) || bs[0]).click(); }); await shot('choice-ok'); await p.evaluate(() => document.querySelector('.choice .next').click()); }
  else if (kind === 'mash') { await p.evaluate(() => { const b = document.querySelector('.mash button'); for (let j = 0; j < 40; j++) b?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }); await p.waitForTimeout(1500); }
  else if (kind === 'timing') { await p.evaluate(() => { window.__autoWin = true; }); await p.evaluate(() => document.querySelector('.timing')?.remove()); }
}
console.log('fin del taller:', await p.evaluate(() => window.__done));
await browser.close();
