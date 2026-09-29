import { chromium } from 'playwright-core';
const out = process.argv[2];
const looks = encodeURIComponent(JSON.stringify([{ hair: '#1a1a1a', longHair: true, skirt: '#2b3a6b', shirt: '#3a8fd6', face: 'happy' }, { hair: '#c9772f', longHair: true, shirt: '#e8743a', pants: '#3a4a6a', lashes: true }, { hair: '#5a3a22', bun: true, apron: '#f4f1ea', shirt: '#8a3a5a', skirt: '#2b2630' }, { hair: '#3b2418', moustache: '#3b2418', txapela: '#1d1d24', shirt: '#f4f1ea', vest: '#2b2630', pants: '#2b2630', old: true }]));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 420 } });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
for (const b of ['', '1']) {
  await page.goto(`http://127.0.0.1:5173/lab/minifigs.html?mode=npc&looks=${looks}&back=${b}`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
  await page.screenshot({ path: `${out}-${b || 0}.png` });
}
await browser.close();
