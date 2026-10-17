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
await p.goto('http://127.0.0.1:' + (process.env.PUERTO || 5173) + `/?town=${town}&q=low&noflora&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 400000 }); await p.waitForTimeout(1500);
const go = (sel) => p.evaluate((sel) => { const G = window.__game, a = sel === 'sabio' ? G.actors.find(x => x.sabio) : G.actors.find(x => x.mission && !x.sabio && !x.cuento); if (!a) return null;
  // (se pone a 1 m del vecino, por el lado más alejado de los demás vecinos: el guía suele estar a su lado y sería el más cercano)
  const otros = G.actors.filter(x => x !== a && Math.hypot(x.pos.x - a.pos.x, x.pos.z - a.pos.z) < 6);
  let ang = 0, mejor = -1; for (let k = 0; k < 16; k++) { const t = k / 16 * 6.283, px = a.pos.x + Math.sin(t), pz = a.pos.z + Math.cos(t); const d = Math.min(9, ...otros.map(o => Math.hypot(o.pos.x - px, o.pos.z - pz))); if (d > mejor) { mejor = d; ang = t; } }
  G.player.pos.set(a.pos.x + Math.sin(ang) * 1.0, a.pos.y, a.pos.z + Math.cos(ang) * 1.0); G.player.heading = Math.atan2(a.pos.x - G.player.pos.x, a.pos.z - G.player.pos.z);
  return { name: a.name, mission: a.mission?.type || null, obj: !!a.obj, mallas: (() => { let n = 0; a.obj.traverse(o => { if (o.isMesh && o.visible) n++; }); return n; })() }; }, sel);
// (se espera por fotogramas, no por milisegundos: en el navegador de pruebas, sin gráfica, un fotograma puede tardar más de un segundo)
const frames = (n) => p.evaluate(async (n) => { for (let i = 0; i < n; i++) await new Promise(r => requestAnimationFrame(r)); }, n);
for (const sel of ['vecino', 'sabio']) {
  const a = await go(sel); if (!a) { console.log(sel, 'no hay'); continue; }
  await frames(3);
  const prompt = await p.evaluate(async () => ({ estado: await (async () => { const G = window.__game, e0 = G.elapsed, r0 = G.rt?.elapsed; await new Promise(r => setTimeout(r, 400)); const P = G.player.pos; return { avanza: G.elapsed > e0, rt: { activo: !!G.rt?.active, avanza: G.rt ? G.rt.elapsed > r0 : null, alt: !!G.altScene, girado: !!window.__girado, ctx: !!G.rt?.contextLost }, dlg: !!G.ui.dialogOpen, modal: !!G.ui.modal, errs: (window.__errors || []).slice(-3), modo: G.mode, busy: !!G.ui.busy, sport: !!G.sportBusy, frozen: !!G.player.frozen, cine: !!G.follow?.cinematic, inter: G.interactables(P).map(it => [it.label, +Math.hypot(it.x - P.x, it.z - P.z).toFixed(1), it.r]).filter(x => x[1] < 4).sort((a, b) => a[1] - b[1]) }; })(), cerca: (() => { const G = window.__game, P = G.player.pos; return G.actors.map(x => [x.name, +Math.hypot(x.pos.x - P.x, x.pos.z - P.z).toFixed(1)]).filter(x => x[1] < 4).sort((a, b) => a[1] - b[1]); })(), texto: document.querySelector('#prompt')?.textContent?.trim() || '', visible: !!document.querySelector('#prompt') && getComputedStyle(document.querySelector('#prompt')).display !== 'none', busy: !!window.__game.ui.busy, mode: window.__game.mode }));
  for (let i = 0; i < 3 && !(await p.evaluate(() => !!document.querySelector('#dialog'))); i++) { await p.keyboard.press('e'); await frames(2); await p.waitForTimeout(300); }
  const dlg = await p.evaluate(() => { const d = document.querySelector('#dialog'); return d ? { who: d.querySelector('h3')?.textContent, text: (d.querySelector('p')?.textContent || '').slice(0, 60), cara: d.querySelector('.face img')?.getAttribute('src')?.slice(0, 30) || d.querySelector('.face')?.innerHTML.slice(0, 20) } : null; });
  await p.screenshot({ path: `${out}/${sel}.png` });
  console.log(sel, JSON.stringify(dlg ? { a: a.name, prompt: prompt.texto, dialogo: dlg } : { a, prompt, dialogo: dlg }));
  // cerrar como quien juega: la primera opción si las hay, y si no E, hasta que no haya diálogo
  for (let i = 0; i < 8 && await p.evaluate(() => !!document.querySelector('#dialog')); i++) { const c = await p.$('#dialog .choices button'); if (c) await c.click(); else await p.keyboard.press('e'); await p.waitForTimeout(500); }
  // (lo que sigue al diálogo, como la ficha de la visita, se cierra con su botón, como quien juega; si queda algo, recover)
  for (let i = 0; i < 4 && await p.evaluate(() => !!window.__game.ui.modal || !!document.querySelector('.screen, #reward')); i++) { const bt = await p.$('.screen .btn.primary, .screen button.primary, #reward button, .screen footer button, .screen button'); if (bt) await bt.click(); else await p.keyboard.press('e'); await frames(2); await p.waitForTimeout(400); }
  await p.evaluate(() => { const G = window.__game; if (G.ui.modal || G.ui.dialogOpen) { try { G.ui.closeModal(); } catch (e) { } G.recover(); } }); await frames(3);
}
console.log('errores:', errs.length ? errs.slice(0, 8).join(' | ') : 'ninguno'); await b.close();
