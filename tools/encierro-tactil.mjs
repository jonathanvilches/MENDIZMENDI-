// El encierro en el móvil: la palanca táctil (esquivar y correr), los botones, y la salida al terminar (fichas o la X) y
// después del pueblo por el menú. Con tiempo simulado (el navegador de pruebas dibuja muy despacio).
// Uso: node tools/encierro-tactil.mjs <carpeta>   (URL=http://127.0.0.1:5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const out = process.argv[2] || '/tmp/encierro-tactil'; mkdirSync(out, { recursive: true });
const URL = process.env.URL || 'http://127.0.0.1:5173', errs = [];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message.slice(0, 160))); p.on('console', m => { if (m.type() === 'error' && !/403|404/.test(m.text())) errs.push(m.text().slice(0, 160)); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Ane', avatar: 'sanfermin', seen: { heroBenat: true, dog: true, intro: true }, settings: { quality: 'low' } })); localStorage.setItem('mendimendiz-lang', 'es'); });
await p.goto(`${URL}/?town=pamplona&q=low&weather=clear&skipintro=1&noflora`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 }); await p.waitForTimeout(1500);
let k = 0; const shot = async (n) => { await p.screenshot({ path: `${out}/${String(k++).padStart(2, '0')}-${n}.png`, timeout: 120000 }); };
const arrancar = async () => {
  await p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.m.kind === 'encierro'); document.querySelectorAll('.mg-overlay').forEach(o => o.remove()); G.ui.busy = false; G.say = async () => {}; G.dialog(M, M.host); });
  await p.waitForFunction(() => window.__game.mode === 'encierro' && window.__game.encierro?.h, null, { timeout: 180000 }); await p.waitForTimeout(1200);
};
const adv = (secs) => p.evaluate((secs) => { const G = window.__game; for (let i = 0; i < secs * 30 && G.altUpdate; i++) G.altUpdate(1 / 30); }, secs);
const cerrarTodo = async () => { for (let i = 0, quiet = 0; i < 30 && quiet < 3; i++) { const any = await p.evaluate(() => { const b = document.querySelector('.mg-overlay.ix-ov:not(.out) button.btn'); if (b) { b.click(); return 'ficha'; } if (document.querySelector('#dialog')) return 'diálogo'; return null; }); if (any === 'diálogo') await p.keyboard.press('e'); quiet = any ? 0 : quiet + 1; await p.waitForTimeout(700); } };
const reiniciar = () => p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.m.kind === 'encierro'); M.step = 0; M.done = false; });
// 1) la X durante la carrera abandona y devuelve al pueblo

await arrancar(); await shot('salida'); await adv(2);
await p.evaluate(() => document.querySelector('.enc-quit').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 3, pointerType: 'touch', bubbles: true })));
await p.waitForFunction(() => !window.__game.encierro, null, { timeout: 60000 }).catch(() => console.log('la X no devolvió al pueblo'));
await p.waitForTimeout(800); await cerrarTodo();
console.log('X en carrera', JSON.stringify(await p.evaluate(() => ({ modo: window.__game.mode, frozen: window.__game.player.frozen, encHud: !!document.querySelector('.enc-hud') }))));
// 2) la palanca, los botones y, al llegar, la X en la espera de la plaza: sin fichas, de vuelta ya
await reiniciar(); await arrancar(); await shot('carrera');
console.log('hud', JSON.stringify(await p.evaluate(() => { const q = s => document.querySelector(s), r = s => { const e = q(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; }; return { palanca: r('.enc-stick'), pista: r('.enc-stickhint'), saltar: r('.enc-jump'), periodico: r('.enc-paper'), camara: r('.enc-cam'), x: r('.enc-quit'), ayuda: q('.enc-help')?.textContent, fuente: getComputedStyle(q('.enc-jump')).fontFamily.slice(0, 20) }; })));
// la palanca: un dedo que se apoya y se desliza a la derecha y arriba; el corredor debe irse a la derecha y correr más
await adv(3.5);   // (pasado el cohete)
const mover = (x, y) => p.evaluate(([x, y]) => { const z = document.querySelector('.enc-stick'), r = z.getBoundingClientRect(), cx = r.left + 120, cy = r.bottom - 110;
  const ev = (t, dx, dy) => z.dispatchEvent(new PointerEvent(t, { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: cx + dx, clientY: cy + dy, bubbles: true }));
  ev('pointerdown', 0, 0); ev('pointermove', x, y); const E = window.__game.encierro; return { stick: [+E.stick.x.toFixed(2), +E.stick.y.toFixed(2)], knob: getComputedStyle(document.querySelector('.enc-knob')).display, pista: !!document.querySelector('.enc-stickhint') }; }, [x, y]);
const soltar = () => p.evaluate(() => { const z = document.querySelector('.enc-stick'); z.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, pointerType: 'touch', bubbles: true })); const E = window.__game.encierro; return { stick: [E.stick.x, E.stick.y], knob: getComputedStyle(document.querySelector('.enc-knob')).display }; });
const x0 = await p.evaluate(() => +window.__game.encierro.me.x.toFixed(2));
console.log('palanca derecha+arriba', JSON.stringify(await mover(60, -60)));
await adv(1); const s1 = await p.evaluate(() => { const E = window.__game.encierro; return { x: +E.me.x.toFixed(2), v: +E.me.speed.toFixed(1) }; });
await shot('palanca'); console.log('tras 1 s', 'x0', x0, JSON.stringify(s1), 'suelta', JSON.stringify(await soltar()));
console.log('palanca izquierda', JSON.stringify(await mover(-60, 0))); await adv(1); console.log('x', await p.evaluate(() => +window.__game.encierro.me.x.toFixed(2)), JSON.stringify(await soltar()));
// el teclado sigue valiendo (la A: a la izquierda)
await p.keyboard.down('a'); const kb = await p.evaluate(async () => { for (let i = 0; i < 3; i++) await new Promise(r => requestAnimationFrame(r)); const G = window.__game; return { move: G.input.move.x, mode: G.mode }; }); await p.keyboard.up('a'); console.log('teclado A', JSON.stringify(kb));
// SALTAR por el botón y la llegada a la plaza
await p.evaluate(() => { document.querySelector('.enc-jump').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, pointerType: 'touch', bubbles: true })); }); await adv(0.3);
console.log('salto', await p.evaluate(() => (window.__game.encierro.me.y || 0) > 0.05 || window.__game.encierro.me.jump > 0));
await p.evaluate(() => { const E = window.__game.encierro; E.me.x = 2.4; E.me.z = E.plaza.cz + 16; }); await adv(1.5);
await p.waitForFunction(() => window.__game.encierro?.done, null, { timeout: 60000 }).catch(() => console.log('no llegó a done'));
console.log('final', JSON.stringify(await p.evaluate(() => { const E = window.__game.encierro; return { won: E.won, msg: document.querySelector('.enc-msg')?.textContent }; })));
await shot('plaza');
await p.evaluate(() => document.querySelector('.enc-quit').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 4, pointerType: 'touch', bubbles: true })));
const t0 = Date.now(); await p.waitForFunction(() => !window.__game.encierro, null, { timeout: 30000 }).catch(() => console.log('la X al final no devolvió al pueblo'));
console.log('X al final', ((Date.now() - t0) / 1000).toFixed(1), 's; fichas del encierro', await p.evaluate(() => [...document.querySelectorAll('.ix-kicker')].filter(k => k.textContent === 'San Fermín').length));
await p.waitForTimeout(800); await cerrarTodo(); console.log('tras la X al final', JSON.stringify(await p.evaluate(() => ({ modo: window.__game.mode, frozen: window.__game.player.frozen, busy: !!window.__game.ui.busy }))));
// 3) la carrera entera: la llegada, las cinco fichas, la vuelta al pueblo y la salida por el menú
await reiniciar(); await arrancar(); await adv(3.5); await p.evaluate(() => { const E = window.__game.encierro; E.me.x = 2.4; E.me.z = E.plaza.cz + 16; }); await adv(1.5);
await p.waitForFunction(() => window.__game.encierro?.done, null, { timeout: 60000 }).catch(() => console.log('no llegó a done'));

await p.waitForFunction(() => document.querySelector('.mg-overlay.ix-ov button.btn'), null, { timeout: 30000 }).catch(() => console.log('sin ficha'));
await shot('ficha'); console.log('ficha', JSON.stringify(await p.evaluate(() => ({ titulo: document.querySelector('.ix-title')?.textContent, boton: document.querySelector('.mg-overlay.ix-ov button.btn')?.textContent, hudOculto: document.querySelector('.enc-hud')?.style.display }))));
for (let i = 0; i < 8; i++) { const c = await p.evaluate(() => { const b = document.querySelector('.mg-overlay.ix-ov:not(.out) button.btn'); if (b) { b.click(); return b.textContent; } return null; }); if (!c) break; await p.waitForTimeout(700); }
await p.waitForFunction(() => !window.__game.encierro, null, { timeout: 60000 }).catch(() => console.log('no volvió al pueblo'));
await p.waitForTimeout(1000); await cerrarTodo();
await shot('vuelta');
console.log('vuelta', JSON.stringify(await p.evaluate(() => { const G = window.__game, M = G.missions.find(M => M.m.kind === 'encierro'); return { modo: G.mode, frozen: G.player.frozen, hud: document.querySelector('#hud')?.style.display ?? 'sin #hud', encHud: !!document.querySelector('.enc-hud'), mision: M.done, paso: M.step, busy: !!G.ui.busy }; })));
// salir del pueblo por el menú
await p.tap('#bMenu').catch(e => console.log('sin botón de menú:', e.message.slice(0, 80))); await p.waitForTimeout(600); await shot('menu');
await p.tap('#mExit').catch(e => console.log('sin Salir:', e.message.slice(0, 80))); await p.waitForTimeout(3000);
console.log('fuera', JSON.stringify(await p.evaluate(() => ({ game: !!window.__game, hub: !!window.__hub?.visible, pantalla: window.__hub?.screen }))));
await shot('hub');
console.log('errores:', errs.length ? [...new Set(errs)].slice(0, 6).join(' | ') : 'ninguno'); await b.close();
