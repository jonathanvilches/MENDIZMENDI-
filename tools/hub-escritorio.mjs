// Capturas del menú en escritorio (o en el tamaño que se diga), pantalla por pantalla, para revisarlas a ojo.
// Uso: node tools/hub-escritorio.mjs <carpeta> [ancho] [alto] [densidad]   (servidor de pruebas en 5173)
import { chromium } from 'playwright-core';
const [,, out, W = '1920', H = '1080', DPR = '1'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: +DPR })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { window.__vs = true; localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', age: 'nino', avatar: 'pelotari', seen: { heroBenat: true, dog: true }, xp: 900, last: 'altsasu-alsasua', futbolClub: 'osasuna', towns: { lesaka: { done: { 0: true }, visits: 1, stamp: true } }, cards: ['armas:baztan'], settings: { quality: 'low' } })); });
await p.goto('http://127.0.0.1:5173/', { timeout: 300000 }); await p.waitForFunction(() => window.__hub, null, { timeout: 300000 }); await p.waitForTimeout(2500);
await p.screenshot({ path: `${out}/home.png` });
await p.evaluate(() => window.__hub.go('avatars')); await p.waitForTimeout(350); await p.screenshot({ path: `${out}/avatars-0.png` });
await p.waitForTimeout(6000); await p.screenshot({ path: `${out}/avatars-6.png` });
for (const s of ['profile', 'sports', 'towns', 'badges', 'passport', 'cuentos']) { await p.evaluate((s) => window.__hub.go(s), s); await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${s}.png` }); }
console.log('errores:', errs.join(' | ') || 'ninguno'); await b.close();
