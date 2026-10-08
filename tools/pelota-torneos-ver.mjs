// Pelota en el navegador: el menú del frontón con el torneo individual y el de parejas, el cuadro del torneo por parejas
// con la ficha de los dos rivales, y su partido (ya por parejas: solo se elige delantero o zaguero). Capturas y medidas.
// Uso: node tools/pelota-torneos-ver.mjs [pueblo] [carpeta] [es|eu]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'elizondo', out = 'entrega/pelota-torneos', lang = 'es'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript((lang) => { localStorage.setItem('mendimendiz-lang', lang); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', seen: { heroBenat: true, dog: true } })); }, lang);
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.waitForTimeout(2000);
const click = async (sel, ms = 120000) => { await p.waitForSelector(sel, { timeout: ms }); await p.evaluate((s) => document.querySelector(s).click(), sel); };
const fits = (sel) => p.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { h: Math.round(r.height), dentro: r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1, desplaza: e.scrollHeight > e.clientHeight + 2 }; }, sel);
await p.evaluate(() => { const G = window.__game, a = G.pelotari; G.player.place(a.pos.x + 1.5, a.pos.z + 1.5, 0); window.__fp = G.talk(a); });
for (let i = 0; i < 12; i++) { await p.waitForTimeout(800); const d = await p.evaluate(() => window.__game.ui.dialogOpen); if (!d) break; await p.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }))); }
await p.waitForSelector('[data-a="torneoParejas"]', { timeout: 120000 }); await p.waitForTimeout(1500);
const menu = await p.evaluate(() => [...document.querySelectorAll('.lg-root [data-a]')].map(b => b.innerText.replace(/\s+/g, ' ')));
await p.screenshot({ path: `${out}/${lang}-menu.png` });
await click('[data-a="torneoParejas"]'); await p.waitForTimeout(2500);
const panel = await p.evaluate(() => ({ cab: document.querySelector('.lg-head small')?.innerText, fichas: [...document.querySelectorAll('.tq-st .pf')].map(e => e.innerText.replace(/\s+/g, ' ').slice(0, 160)) }));
await p.screenshot({ path: `${out}/${lang}-torneo-parejas.png` });
await p.evaluate(() => document.querySelector('.tq-st')?.scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
await p.screenshot({ path: `${out}/${lang}-torneo-parejas-fichas.png` });
await click('[data-a="play"]');
await p.waitForFunction(() => window.__game.pelotaMatch?.pairs && !window.__game.pelotaMatch.loadingMates && document.querySelector('.pel-panel .pel-rv2'), null, { timeout: 300000 });
await p.waitForTimeout(800);
const intro = await p.evaluate(() => ({ botones: [...document.querySelectorAll('[data-pel-mod]')].map(b => b.innerText), card: (() => { const c = document.querySelector('.pel-card'); return { alto: c.scrollHeight, visible: c.clientHeight }; })() }));
await p.screenshot({ path: `${out}/${lang}-partido-parejas.png` });
await click('.pel-panel [data-pel-go]');
const juego = await p.evaluate(() => { const m = window.__game.pelotaMatch, g = m.game; g.autoplay = true; for (let k = 0; k < 240; k++) m.update(1 / 30); return { pairs: g.pairs, fase: g.phase, marcador: [...document.querySelectorAll('.pel-side span')].map(e => e.textContent) }; });
await p.screenshot({ path: `${out}/${lang}-jugando.png` });
await p.evaluate(() => window.__game.pelotaAbort?.()); await p.waitForTimeout(1200);
console.log(JSON.stringify({ menu, panel, intro, juego }, null, 1), errs.length ? errs.slice(0, 3) : 'sin errores');
await b.close();
