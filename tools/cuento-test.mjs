// Cuentos: entra en un pueblo, habla con el contador o la contadora, pasa las tarjetas, responde y comprueba que el
// cuento queda guardado; foto de una tarjeta y de la página del menú. Uso: node tools/cuento-test.mjs <pueblo> <carpeta> [es|eu]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'ujue', out = 'entrega/cuentos', lang = 'es'] = process.argv;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript((lang) => { try { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true } })); localStorage.setItem('mendimendiz-lang', lang); } catch (e) { } }, lang);
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&skipintro=1`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.waitForTimeout(3000);
const who = await p.evaluate(() => { const G = window.__game, a = G.actors.find(x => x.cuento); if (!a) return null; document.querySelectorAll('.mg-overlay').forEach(o => o.remove()); G.ui.busy = false; G.player.place(a.pos.x + 1.4, a.pos.z + 1.4, 0); G.talk(a); return a.name + ' · ' + a.cuento.title; });
console.log('contador', who);
let k = 0;
for (let i = 0; i < 30; i++) {
  await p.waitForTimeout(900);
  const st = await p.evaluate(() => { const o = document.querySelector('.mg-overlay:not(.out)'); if (o) return o.classList.contains('choice') ? 'choice' : 'card'; return window.__game.ui.dialogOpen ? 'dialog' : ''; });
  if (!st) { if (i > 3) break; continue; }
  if (st === 'card' || st === 'choice') { if (k < 2 || st === 'choice') await p.screenshot({ path: `${out}/${town}-${lang}-${String(k).padStart(2, '0')}.jpg`, quality: 70 }); k++; }
  if (st === 'dialog') { if (k === 0) await p.screenshot({ path: `${out}/${town}-${lang}-saludo.jpg`, quality: 70 }); await p.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }))); }
  else if (st === 'choice') { await p.evaluate(() => document.querySelector('.mg-overlay.choice .opt[data-i="0"]')?.click()); await p.waitForTimeout(500); await p.evaluate(() => document.querySelector('.mg-overlay.choice .next')?.click()); }
  else await p.evaluate(() => document.querySelector('.mg-overlay:not(.out) button')?.click());
}
console.log('tarjetas', k, 'guardado', await p.evaluate(() => JSON.parse(localStorage.getItem('mendimendiz-perfil-v1') || '{}').cards?.filter(c => c.startsWith('cuento:'))));
// la página del menú
await p.goto(`http://127.0.0.1:5173/`, { timeout: 300000 });
await p.waitForTimeout(6000);
await p.evaluate(() => { const b = document.querySelector('[data-s="cuentos"]') || document.querySelector('[data-go="cuentos"]'); b?.click(); });
await p.waitForTimeout(2500);
await p.screenshot({ path: `${out}/menu-${lang}.jpg`, quality: 70 });
console.log('errores', JSON.stringify(errs));
await b.close();
