// Flujo: ¿se mueve el jugador con el teclado en el pueblo, antes y después de pasar por el menú de pelota? Mide las
// imágenes por segundo del navegador de pruebas (muy lento sin tarjeta gráfica) para saber cuánto hay que esperar.
// Uso: node tools/flujo-mover.mjs [pueblo]   (servidor en 5173)
import { chromium } from 'playwright-core';
const [,, town = 'elizondo'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', seen: { heroBenat: true, dog: true } })); });
console.log('cargando', town); await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&t=12`, { timeout: 300000 }); console.log('página cargada');
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 }); await p.waitForTimeout(3000);
const fps = async () => { const a = await p.evaluate(() => window.__rt.frameNo ?? 0); await p.waitForTimeout(4000); const c = await p.evaluate(() => window.__rt.frameNo ?? 0); return (c - a) / 4; };
// mantener W hasta que pasen 40 imágenes (o 60 s) y ver cuánto anda
const walk = async (key = 'w') => { const a = await p.evaluate(() => ({ ...window.__game.player.pos, f: window.__rt.frameNo })); await p.evaluate((k) => dispatchEvent(new KeyboardEvent('keydown', { key: k })), key);
  await p.waitForFunction((f0) => window.__rt.frameNo - f0 >= 40, a.f, { timeout: 60000 }).catch(() => {}); await p.evaluate((k) => dispatchEvent(new KeyboardEvent('keyup', { key: k })), key);
  const c = await p.evaluate(() => ({ ...window.__game.player.pos, f: window.__rt.frameNo })); return `${Math.hypot(c.x - a.x, c.z - a.z).toFixed(1)} m en ${c.f - a.f} imágenes`; };
const st = () => p.evaluate(() => { const G = window.__game; return `modo=${G.mode} congelado=${G.player.frozen} deporte=${!!G.sportBusy} menus=${document.querySelectorAll('.lg-root').length} ocupado=${G.ui.busy}`; });
console.log('imágenes por segundo:', await fps());
console.log('al llegar:', await walk('w'), await walk('s'), '·', await st());
await p.evaluate(() => { const G = window.__game, a = G.pelotari; G.player.place(a.pos.x + 1.5, a.pos.z + 1.5, 0); G.follow.snap(G.player); });
await p.waitForTimeout(1500);
console.log('junto al pelotari:', await walk('w'), await walk('s'), '·', await st());
await p.evaluate(() => window.__game.talk(window.__game.pelotari));
for (let i = 0; i < 10; i++) { await p.waitForTimeout(800); if (!(await p.evaluate(() => window.__game.ui.dialogOpen))) break; await p.evaluate(() => document.getElementById('dialog')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); }
await p.waitForSelector('.lg-root [data-a="exit"]', { timeout: 60000 });
console.log('con el menú:', await walk('w'), '·', await st());
await p.evaluate(() => document.querySelector('.lg-root [data-a="exit"]').click()); await p.waitForTimeout(1500);
console.log('tras Salir:', await walk('w'), await walk('s'), '·', await st());
// la pausa con Escape: esperar unas imágenes
const f0 = await p.evaluate(() => window.__rt.frameNo); await p.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))); await p.waitForTimeout(100); await p.evaluate(() => dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' })));
await p.waitForFunction(() => !!window.__game.ui.modal, null, { timeout: 60000 }).catch(() => {});
console.log('pausa con Escape:', await p.evaluate((f0) => `abierta=${!!window.__game.ui.modal} tras ${window.__rt.frameNo - f0} imágenes`, f0));
console.log(errs.length ? errs.slice(0, 3) : 'sin errores');
await b.close();
