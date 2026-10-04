// Capturas del centro de mando: node tools/hubshots.mjs <url> <prefijo> <ancho> <alto> [pantallas]
import { chromium } from 'playwright-core';
const [,, url, out, w = 390, h = 844, list = 'onb,home,home2,map,avatars,comarca,sheet,more,badges,towns,nature,passport,profile'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, hasTouch: true, isMobile: +w < 1000, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.addInitScript((k) => { try { if (!localStorage.getItem(k)) localStorage.setItem(k, 'es'); } catch (e) { } }, 'mendimendiz-lang');
const logs = [];
page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/CERT|favicon/.test(m.text())) logs.push('error: ' + m.text().slice(0, 200)); });
await page.goto(url, { timeout: 240000 });
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await page.waitForTimeout(2000);
const shot = async (n) => { await page.screenshot({ path: `${out}-${n}.png`, timeout: 180000 }); };
for (const s of list.split(',')) {
  if (s === 'onb') { await shot('onb'); await page.evaluate(() => { const i = document.querySelector('#oName'); if (!i) return; i.value = 'Ane'; document.querySelector('#oGo').click(); }); await page.waitForTimeout(1500); continue; }
  if (s === 'home2') { await page.evaluate(() => { const m = document.querySelector('#hMain'); m.style.scrollBehavior = 'auto'; m.scrollTop = m.clientHeight * 0.9; }); await page.waitForTimeout(700); await shot('home2'); continue; }
  if (s === 'comarca') await page.evaluate(() => window.__hub.go('comarca', 'bidasoa'));
  else if (s === 'sheet') await page.evaluate(() => window.__hub.townSheet('etxalar'));
  else if (s === 'more') await page.evaluate(() => { window.__hub.go('home'); window.__hub.more(); });
  else await page.evaluate((s) => window.__hub.go(s), s);
  await page.waitForTimeout(1300); await shot(s);
}
console.log(logs.join('\n'));
await browser.close();
