// ¿Se puede hablar con los vecinos? Entra en un pueblo, se pone al lado del primer vecino con misión y del sabio, mira el
// aviso de abajo (Hablar), pulsa E y comprueba que se abre el diálogo con su retrato; luego lo cierra. Errores a la vista.
// Uso: node tools/hablar.mjs <carpeta> [pueblo] [avatar]   (servidor de pruebas en 5173, u otro con PUERTO=…)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const [,, out, town = 'lumbier', avatar = 'sanfermin'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1100, height: 620 } }); const errs = [];
p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/403|google|Failed to load|GPU stall|WebGL/.test(m.text())) errs.push(m.text().slice(0, 200)); });
await p.addInitScript((av) => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: av, seen: { heroBenat: true, dog: true }, dogOn: false, settings: { quality: 'low' } })); }, avatar);
await p.goto('http://127.0.0.1:' + (process.env.PUERTO || 5173) + `/?town=${town}&noflora&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 }); await p.waitForTimeout(1500);
const go = (sel) => p.evaluate((sel) => { const G = window.__game, a = sel === 'sabio' ? G.actors.find(x => x.sabio) : G.actors.find(x => x.mission && !x.sabio && !x.cuento); if (!a) return null;
  const ang = Math.random() * 6.28; G.player.pos.set(a.pos.x + Math.sin(ang) * 1.3, a.pos.y, a.pos.z + Math.cos(ang) * 1.3); G.player.heading = Math.atan2(a.pos.x - G.player.pos.x, a.pos.z - G.player.pos.z);
  return { name: a.name, mission: a.mission?.type || null, obj: !!a.obj, mallas: (() => { let n = 0; a.obj.traverse(o => { if (o.isMesh && o.visible) n++; }); return n; })() }; }, sel);
for (const sel of ['vecino', 'sabio']) {
  const a = await go(sel); if (!a) { console.log(sel, 'no hay'); continue; }
  await p.waitForTimeout(900);
  const prompt = await p.evaluate(() => ({ texto: document.querySelector('#prompt')?.textContent?.trim() || '', visible: !!document.querySelector('#prompt') && getComputedStyle(document.querySelector('#prompt')).display !== 'none', busy: !!window.__game.ui.busy, mode: window.__game.mode }));
  for (let i = 0; i < 3 && !(await p.evaluate(() => !!document.querySelector('#dialog'))); i++) { await p.keyboard.press('e'); await p.waitForTimeout(1200); }
  const dlg = await p.evaluate(() => { const d = document.querySelector('#dialog'); return d ? { who: d.querySelector('h3')?.textContent, text: (d.querySelector('p')?.textContent || '').slice(0, 60), cara: d.querySelector('.face img')?.getAttribute('src')?.slice(0, 30) || d.querySelector('.face')?.innerHTML.slice(0, 20) } : null; });
  await p.screenshot({ path: `${out}/${sel}.png` });
  console.log(sel, JSON.stringify({ a, prompt, dialogo: dlg }));
  // cerrar: E hasta que no haya diálogo
  for (let i = 0; i < 8 && await p.evaluate(() => !!document.querySelector('#dialog')); i++) { await p.keyboard.press('e'); await p.waitForTimeout(400); }
  await p.evaluate(() => { try { window.__game.recover(); } catch (e) { } }); await p.waitForTimeout(1500);
}
console.log('errores:', errs.length ? errs.slice(0, 8).join(' | ') : 'ninguno'); await b.close();
