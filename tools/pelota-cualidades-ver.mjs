// Pelota en el navegador: las cualidades del rival (fuerza, agilidad, velocidad) en la ficha del torneo y en la
// presentación del partido, con los consejos de cómo jugarle. Capturas y medidas (que el bloque quepa sin salirse).
// Uso: node tools/pelota-cualidades-ver.mjs [pueblo] [carpeta] [es|eu]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'pamplona', out = 'entrega/pelota-cualidades', lang = 'es'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript((lang) => { localStorage.setItem('mendimendiz-lang', lang); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', seen: { heroBenat: true, dog: true } })); }, lang);
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 600000 });
await p.waitForTimeout(2500);
const click = async (sel, ms = 120000) => { await p.waitForSelector(sel, { timeout: ms }); await p.evaluate((s) => document.querySelector(s).click(), sel); };
await p.evaluate(() => { const G = window.__game, a = G.pelotari; G.player.place(a.pos.x + 1.5, a.pos.z + 1.5, 0); G.follow.snap(G.player); window.__fp = G.talk(a); });
for (let i = 0; i < 12; i++) { await p.waitForTimeout(800); const d = await p.evaluate(() => window.__game.ui.dialogOpen); if (!d) break; await p.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }))); }
await click('[data-a="torneo"]'); await p.waitForTimeout(1500);
// ficha del torneo: las dos cartas, la tuya y la del rival
const box = (sel) => p.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
  const sc = e.closest('[class*="scroll"], .lg-body, .tq-body') || null;
  return { txt: e.innerText.replace(/\s+/g, ' ').slice(0, 220), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), dentro: r.x >= 0 && r.right <= vw + 1, desborda: e.scrollWidth > e.clientWidth + 1 }; }, sel);
const ficha = await box('.tq-duel');   // (las cartas de tu partido, con la media y las cualidades)
await p.screenshot({ path: `${out}/${lang}-torneo.png` });
await p.evaluate(() => document.querySelector('.tq-duel')?.scrollIntoView({ block: 'center' }));
await p.waitForTimeout(300);
await p.screenshot({ path: `${out}/${lang}-torneo-cualidades.png` });
await click('[data-a="play"]');
await p.waitForSelector('.pel-panel .pel-rv', { timeout: 240000 }).catch(() => {});
await p.waitForTimeout(800);
const intro = await box('.pel-panel .pel-rv');
const panel = await box('.pel-panel');
await p.screenshot({ path: `${out}/${lang}-presentacion.png` });
console.log(JSON.stringify({ ficha, intro, panel: panel && { h: panel.h, y: panel.y, dentro: panel.dentro } }), errs.length ? errs.slice(0, 3) : 'sin errores');
await b.close();
