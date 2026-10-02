// Los personajes elegibles (sanferminero, pastor, futbolista de Osasuna y pelotari): el selector (quien llevaba uno de
// los antiguos pasa al sanferminero) y cada uno en un pueblo, quieto y andando. Uso: node tools/elegibles.mjs [pueblo] [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lesaka', out = '/tmp/claude-0/elegibles'] = process.argv; mkdirSync(out, { recursive: true });
const URL = process.env.URL || 'http://127.0.0.1:5173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
const page = async (avatar) => { const p = await b.newPage({ viewport: { width: 1100, height: 620 } }); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript((a) => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: a, seen: { heroBenat: true, dog: true } })); }, avatar); return p; };
let p = await page('ranger');
await p.goto(`${URL}/?screen=avatars`, { timeout: 300000 });
await p.waitForFunction(() => window.__ready, null, { timeout: 300000 }); await p.waitForTimeout(6000);
await p.screenshot({ path: `${out}/selector.png` });
console.log('avatar tras migrar', await p.evaluate(async () => (await import('/src/game/profile.js')).profile().avatar),
  'elegibles', await p.evaluate(async () => (await import('/src/data/cast.js')).CAST.map(c => c.id).join(',')));
await p.close();
for (const av of ['sanfermin', 'pastor', 'osasuna', 'pelotari']) {
  p = await page(av);
  await p.goto(`${URL}/?town=${town}&q=mid&weather=clear&skipintro=1`, { timeout: 300000 });
  await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 500000 });
  await p.addStyleTag({ content: '#ui > * { display: none !important; }' });
  await p.waitForTimeout(2000); await p.screenshot({ path: `${out}/${av}-quieto.png` });
  await p.evaluate(() => window.__game.input.keys.add('w')); await p.waitForTimeout(1800); await p.screenshot({ path: `${out}/${av}-andando.png` });
  console.log(av, JSON.stringify(await p.evaluate(() => { const r = window.__rt.player.rig; let pack = false; r.obj.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && o.geometry.type === 'BoxGeometry') pack = true; }); return { rig: r.id, clip: r.char?.currentName, mochila: pack }; })));
  await p.close();
}
console.log('errores', JSON.stringify(errs.slice(0, 5)));
await b.close();
