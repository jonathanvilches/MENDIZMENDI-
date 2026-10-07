// Retratos de quien habla: abre el diálogo con varios vecinos del pueblo y comprueba que la cara sale (imagen cargada,
// con píxeles visibles) en vez de un hueco. Uso: node tools/dialogo-retrato.mjs [pueblo] [carpeta]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'lesaka', out = 'entrega/dialogo-retrato'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (/retrato/i.test(m.text())) errs.push(m.text()); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, seen: { heroBenat: true, dog: true } })); });
await p.goto(`${process.env.BASE || 'http://127.0.0.1:5173/'}?town=${town}&q=low&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.waitForTimeout(4000);
const looks = await p.evaluate(() => (window.__game.actors || []).filter(a => a.look || a.def?.look).slice(0, 6).map(a => ({ name: a.name, look: a.look || a.def.look })));
console.log('vecinos', looks.length);
let bad = 0;
for (const [i, L] of looks.entries()) {
  await p.evaluate((L) => { window.__game.ui.dialog([{ who: L.name, look: L.look, text: 'Hola' }]); }, L);
  await p.waitForTimeout(5000);
  const r = await p.evaluate(() => { const img = document.querySelector('#dialog .face img'); if (!img) return { img: false };
    const c = document.createElement('canvas'); c.width = 32; c.height = 32; const g = c.getContext('2d'); let vis = 0;
    try { g.drawImage(img, 0, 0, 32, 32); const d = g.getImageData(0, 0, 32, 32).data; for (let k = 3; k < d.length; k += 4) if (d[k] > 20) vis++; } catch (e) { return { img: true, err: e.message }; }
    return { img: true, w: img.naturalWidth, pend: img.hasAttribute('data-pk'), vis }; });
  if (!r.img || !r.vis || r.pend) bad++;
  console.log(L.name, JSON.stringify(r)); if (i === 0) await p.screenshot({ path: `${out}/dialogo.png` });
  await p.evaluate(() => { document.querySelector('#dialog')?.click(); window.__game.ui.closeDialog?.(); document.querySelector('#dialog')?.remove(); window.__game.ui.dialogOpen = false; });
  await p.waitForTimeout(500);
}
console.log(errs.length ? errs.slice(0, 4) : 'sin errores'); console.log(bad ? `${bad} sin cara` : 'Todo correcto'); await b.close();
