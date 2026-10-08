// Flujo: ¿quién empieza un segundo partido detrás del menú de pelota? Campeonato desde el menú: partido libre, ganar,
// «Seguir», el diálogo y de vuelta al menú; se anota cada llamada a un partido (con su pila) y el estado cada momento.
// Uso: node tools/flujo-doble.mjs [carpeta]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, out = 'entrega/flujo-doble'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (/\[flujo\]/.test(m.text())) console.log(m.text().slice(0, 1600)); });
await p.addInitScript(() => { localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', seen: { heroBenat: true, dog: true } })); });
await p.goto('http://127.0.0.1:5173/?q=low&weather=clear', { timeout: 300000 });
await p.waitForFunction(() => window.__ready && window.__hub?.visible, null, { timeout: 300000 });
const click = async (sel) => { await p.waitForSelector(sel, { timeout: 300000 }); await p.evaluate((s) => [...document.querySelectorAll(s)].pop().click(), sel); await p.waitForTimeout(400); };
await click('#hNav [data-s="sports"]'); await click('[data-sport="pelota"]');
await p.waitForSelector('.lg-root [data-a="libre"]', { timeout: 600000 });
// cada partido que empiece y cada interacción del pueblo, con quién la llama
await p.evaluate(() => { const G = window.__game, F = G.fronton, play = F.play.bind(F), inter = G.interact.bind(G);
  F.play = (...a) => { console.log('[flujo] partido', new Error().stack.split('\n').slice(1, 7).join(' | ')); return play(...a); };
  G.interact = (it) => { console.log('[flujo] interacción', it.kind, it.label || '', new Error().stack.split('\n').slice(1, 5).join(' | ')); return inter(it); }; });
const st = () => p.evaluate(() => { const G = window.__game; return `modo=${G.mode} partido=${!!G.pelotaMatch} menus=${document.querySelectorAll('.lg-root').length} dlg=${G.ui.dialogOpen} dlgVisible=${(() => { const d = document.getElementById('dialog'); return !!d && d.getBoundingClientRect().height > 0; })()} hud=${G.ui.hud?.style.display !== 'none'}`; });
await click('[data-a="libre"]'); await p.waitForSelector('.pel-panel [data-pel-go]', { timeout: 300000 });
await click('.pel-panel [data-pel-go]');
await p.evaluate(() => { const m = window.__game.pelotaMatch, g = m.game; g.score.you = g.target - 1; g.point('you', 'chapa'); });
for (let i = 0; i < 12; i++) { await p.evaluate(() => { const m = window.__game.pelotaMatch; for (let k = 0; k < 30 && m?.active; k++) m.update(1 / 30); }); if (await p.evaluate(() => !!document.querySelector('[data-pel-cont]'))) break; }
console.log('final:', await st());
await click('[data-pel-cont]');
for (let i = 0; i < 6; i++) { await p.waitForTimeout(600); console.log(`tras Seguir ${i}:`, await st()); }
await p.screenshot({ path: `${out}/dialogo.png` });
// se pasa el diálogo tocando la pantalla, como en el iPhone
for (let i = 0; i < 4; i++) { if (!(await p.evaluate(() => window.__game.ui.dialogOpen))) break; await p.mouse.click(420, 200); await p.waitForTimeout(700); console.log(`toque ${i}:`, await st()); }
for (let i = 0; i < 6; i++) { await p.waitForTimeout(800); console.log(`después ${i}:`, await st()); }
await p.screenshot({ path: `${out}/despues.png` });
console.log(errs.length ? errs.slice(0, 4) : 'sin errores');
await b.close();
