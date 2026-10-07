import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const logs = []; p.on('pageerror', e => logs.push('ERR ' + e.message)); p.on('console', m => { if (m.type() !== 'log' || /warn|error|shader|webgl/i.test(m.text())) logs.push(m.type() + ' ' + m.text().slice(0, 300)); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', age: 'nino', avatar: 'sanfermin', seen: { heroBenat: true, dog: true }, settings: { quality: 'low' } })); });
await p.goto('http://127.0.0.1:5173/', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 });
await p.evaluate(() => window.__hub.go('avatars', undefined, true));
for (const t of [3000, 8000]) { await p.waitForTimeout(t); await p.screenshot({ path: process.argv[2] + '-' + t + '.png' }); }
console.log(logs.slice(0, 20).join('\n')); await b.close();
