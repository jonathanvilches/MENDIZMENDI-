import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage();
p.on('pageerror', e => console.log('PAGEERROR', e.message, e.stack?.split('\n')[1]));
p.on('console', m => { if (m.type() === 'error') console.log('ERR', m.text().slice(0, 300)); });
await p.goto(process.argv[2], { timeout: 60000 }).catch(e => console.log('goto', e.message));
await p.waitForTimeout(20000);
console.log('ready', await p.evaluate(() => window.__ready).catch(e => e.message));
await b.close();
