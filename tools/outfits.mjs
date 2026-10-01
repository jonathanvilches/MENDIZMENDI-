// Capturas de los personajes KayKit con cada traje navarro en la pantalla de personajes. Uso: node tools/outfits.mjs
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const out = process.argv[2] || 'entrega/trajes'; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1100, height: 680 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
p.on('console', m => { if (m.type() === 'warning' && /traje/.test(m.text())) console.log('WARN', m.text()); });
const ids = (process.argv[3] || 'ranger,knight,mage').split(',');
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', avatar: 'ranger', seen: { heroBenat: true, dog: true } })); });
await p.goto('http://127.0.0.1:5173/', { timeout: 300000 });
await p.waitForTimeout(4000);
await p.evaluate(() => { const b = document.querySelector('[data-s="avatars"]'); if (b) b.click(); });
await p.waitForSelector('#csOutfits', { timeout: 120000, state: 'attached' }); console.log('ropa', await p.evaluate(() => document.querySelector('#csOutfits').innerHTML.length));
for (const id of ids) {
  await p.evaluate((id) => document.querySelector(`[data-av="${id}"]`)?.click(), id);
  await p.waitForTimeout(2500);
  for (const o of ['original', 'sanfermin', 'dantzari', 'pastor', 'casero', 'osasuna']) {
    await p.evaluate((o) => document.querySelector(`[data-outfit="${o}"]`)?.click(), o);
    await p.waitForTimeout(3500);
    await p.screenshot({ path: `${out}/${id}-${o}.png`, timeout: 180000 }); console.log('foto', id, o);
  }
}
await b.close();
