import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [c, r] of [['izarra', 'cantolagua'], ['doneztebe', 'xota'], ['gares', 'tudelano']]) {
  const p = await b.newPage({ viewport: { width: 1100, height: 620 } }); p.on('pageerror', e => console.log('PE', e.message));
  await p.goto(`http://127.0.0.1:5173/lab/futbol-demo.html?go=club&club=${c}&rival=${r}&notuto&quality=low`, { timeout: 300000 });
  await p.waitForFunction(() => window.__futbol?.live, null, { timeout: 300000 });
  await p.waitForFunction(() => { const m = window.__futbol; return m.introLen - m.intro >= 3.4; }, null, { timeout: 300000 }); await p.screenshot({ path: `${process.argv[2]}/k-${c}-a.png` });
  await p.waitForFunction(() => { const m = window.__futbol; return m.introLen - m.intro >= 5.3; }, null, { timeout: 300000 }); await p.screenshot({ path: `${process.argv[2]}/k-${c}-b.png` });
  await p.close();
}
await b.close();
