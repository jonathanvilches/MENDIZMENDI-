// genera una tira de fotogramas de la animación de paso (vista lateral)
import { chromium } from 'playwright-core';
const [,, out, i = 0, speed = 3.3, view = 'side'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 300, height: 400 } });
const shots = [];
for (let f = 0; f < 8; f++) {
  await page.goto(`http://127.0.0.1:5173/lab/minifigs.html?mode=close&i=${i}&speed=${speed}&t=${f * 3}&view=${view}`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
  shots.push(await page.screenshot());
}
await browser.close();
const fs = await import('fs'); shots.forEach((b, f) => fs.writeFileSync(`/tmp/strip_${f}.png`, b));
