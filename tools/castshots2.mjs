// Capturas de cada personaje (cuerpo y cara): node tools/castshots2.mjs <carpeta> [ids]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out, ids = 'leire,iker,maialen,unai,nerea,jon,irati,koldo,ainhoa,maite,itziar,kike,amaia,garazi,joxemari,inaki', base = 'http://127.0.0.1:5173/'] = process.argv;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 420, height: 560 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
for (const id of ids.split(',')) for (const view of ['body', 'face']) {
  await p.goto(`${base}lab/cast.html?id=${id}&view=${view}`, { timeout: 200000 });
  await p.waitForFunction(() => window.__ready, null, { timeout: 200000 });
  await p.screenshot({ path: `${out}/${id}-${view}.png` });
}
await b.close(); console.log('ok');
