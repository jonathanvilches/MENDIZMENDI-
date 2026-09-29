import { chromium } from 'playwright-core';
const [,, base, out] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => localStorage.setItem('mendimendiz-lang', 'eu'));
const page = await ctx.newPage();
await page.goto(base, { timeout: 240000 });
await page.waitForFunction(() => window.__ready, null, { timeout: 240000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${out}-onb.png`, timeout: 240000 });
await page.evaluate(() => { const i = document.querySelector('#oName'); if (i) { i.value = 'Ane'; document.querySelector('#oGo').click(); } });
for (const s of ['home', 'avatars', 'profile', 'badges']) { await page.evaluate((s) => window.__hub.go(s), s); await page.waitForTimeout(1500); await page.screenshot({ path: `${out}-${s}.png`, timeout: 240000 }); }
await browser.close();
