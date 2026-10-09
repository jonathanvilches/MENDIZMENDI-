// Auditoría de diseño dentro del pueblo, en el móvil tumbado: el HUD (objetivo, brújula, botones), el diálogo con un
// vecino, el libro de misiones, el mapa, la pausa, la tienda y la recompensa, medidos con tools/auditoria-medida.mjs
// (texto cortado o encima, texto que se sale de su botón, distancias de título, letra y color). Hace una captura de cada.
// Uso: node tools/auditoria-pueblo.mjs [carpeta] [pueblo]   (URL=http://127.0.0.1:5173 por defecto; TAM=844x390)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
import { auditar } from './auditoria-medida.mjs';
const [,, out = '/tmp/auditoria-pueblo', town = 'lesaka'] = process.argv; mkdirSync(out, { recursive: true });
const URL = process.env.URL || 'http://127.0.0.1:5173';
const [W, H] = (process.env.TAM || '844x390').split('x').map(Number);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: W, height: H }, isMobile: W < 1000, hasTouch: true }); const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', seen: { heroBenat: true, dog: true }, coins: 14, settings: { quality: 'low' } })); });
await p.goto(`${URL}/?town=${town}&q=low&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 }); await p.waitForTimeout(3000);
if (process.env.DETALLE) await p.evaluate(() => { window.__auditDetail = true; });
const TOT = {};
const audit = async (name, sel) => {
  await p.waitForTimeout(900); await p.evaluate(() => document.getAnimations?.().forEach(a => { try { if (a.effect?.getTiming?.().iterations !== Infinity) a.finish(); } catch (e) { } }));
  await p.screenshot({ path: `${out}/${name}.png` });
  const r = await p.evaluate(auditar, sel);
  console.log(`== ${name}: ${Object.entries(r).map(([k, v]) => `${k} ${v.length}`).join(' · ')}`);
  for (const [k, v] of Object.entries(r)) { TOT[k] = (TOT[k] || 0) + (v.length || 0); for (const x of (v.slice ? v.slice(0, 10) : [v])) console.log(`   ${k}: ${x}`); }
};
const ui = (code) => p.evaluate((code) => { const G = window.__game, U = G.ui; try { window.__pr = eval(code); } catch (e) { console.log('no se pudo: ' + code + ' ' + e.message); } }, code);
const close = () => p.evaluate(() => { const U = window.__game.ui; U.closeModal(); document.querySelector('#dialog')?.remove(); U.dialogOpen = false; document.body.classList.remove('talking'); });
await ui(`U.setPrompt('Hablar con Mikel'); U.toast('Has conseguido la carta de la iglesia de San Martín', 'card')`);
await audit('hud', 'body');
await ui(`U.dialog([{ who: 'Mikel, el pelotari', text: 'Kaixo! ¿Echamos un partido en el frontón de Lesaka? Juego a cuatro y medio y no perdono una dejada.', choices: ['¡Vamos al frontón!', 'Ahora no, gracias'] }])`);
await audit('dialogo', '#dialog'); await close();
// (el libro, pestaña a pestaña)
await ui(`U.openBook()`); const tabs = await p.evaluate(() => [...document.querySelectorAll('.screen .tabs button')].map(b => b.dataset.t));
for (const t of tabs.length ? tabs : ['']) { await p.evaluate((t) => document.querySelector(`.screen .tabs button[data-t="${t}"]`)?.click(), t); await audit('libro-' + (t || 'unico'), '.screen'); }
await close();
await ui(`U.openMap()`); await audit('mapa', '.screen');
// (la tarjeta de un sitio del mapa: una misión con sus dos botones, y un lugar sin misión)
await p.waitForTimeout(1200);
for (const [n, f] of [['mision', "h => h.it.act === 'track'"], ['lugar', "h => !h.it.act && (h.it.title || h.it.label)"]]) {
  const ok = await p.evaluate((f) => { const V = window.__game.ui.mapView, h = V?.hits.find(eval(f)); if (h) V.select(h.it); return !!h; }, f);
  if (ok) await audit('mapa-' + n, '.screen'); }
await close();
await ui(`G.mochila?.open()`); await audit('mochila', '.bagpanel'); await p.evaluate(() => { document.querySelector('.bagpanel [data-a=close]')?.click(); });
await ui(`U.openMenu()`); await audit('pausa', '.screen'); await close();
await ui(`G.tienda?.open()`); await audit('tienda', '.screen, .shop, .mg-overlay');
for (const i of [1, 2]) { await p.evaluate((i) => document.querySelectorAll('.shop-card nav button')[i]?.click(), i); await audit('tienda-' + i, '.shop, .mg-overlay'); }
await close(); await p.evaluate(() => document.querySelectorAll('.mg-overlay').forEach(o => o.remove()));
await p.evaluate(() => { const G = window.__game; G.player.frozen = false; G.mode = 'play'; });
await ui(`U.reward({ icon: 'church', title: 'Iglesia de San Martín', text: 'Has descubierto la iglesia gótica de Lesaka, con su torre y su pórtico.', stamp: null })`); await audit('recompensa', '#reward, .screen'); await close();
console.log('\nTOTAL', JSON.stringify(TOT)); console.log(errs.length ? 'errores: ' + errs.slice(0, 4).join(' | ') : 'sin errores');
await b.close();
