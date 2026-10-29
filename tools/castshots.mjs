import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 260, height: 340 } });
const D = '/tmp/claude-0/-home-user/c8a27af3-7392-5acb-ad8b-dba678c7438a/scratchpad/h/';
for (let i = 9; i < 18; i++) for (const v of ['front', 'back']) {
  await page.goto(`http://127.0.0.1:5173/lab/minifigs.html?mode=close&i=${i}&view=${v}`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
  await page.screenshot({ path: `${D}c-${v}${i}.png` });
}
await browser.close();
