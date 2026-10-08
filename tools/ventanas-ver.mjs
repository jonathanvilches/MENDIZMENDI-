// Las ventanas de dentro del juego en el móvil tumbado: diálogo, cuaderno de misiones, pausa, mapa, menú de pelota,
// cuadro del torneo y panel de antes del partido. En cada una, qué tamaños de letra usa cada tipo de texto, si algún
// texto largo se ve entero sin «Ver más» y una captura.
// Uso: node tools/ventanas-ver.mjs [pueblo] [carpeta] [es|eu]   (servidor en 5173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const [,, town = 'elizondo', out = 'entrega/ventanas', lang = 'es'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript((lang) => { localStorage.setItem('mendimendiz-lang', lang); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', seen: { heroBenat: true, dog: true } })); }, lang);
await p.goto(`http://127.0.0.1:5173/?town=${town}&q=low&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 }); await p.waitForTimeout(3000);
let fails = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
const SCALE = [12, 14, 16, 20, 24, 32, 40, 48, 72];
// (las animaciones de entrada, acabadas: a una imagen por segundo van con retraso)
const measure = (root) => p.evaluate((root) => {
  document.getAnimations?.().forEach(a => { try { a.finish(); } catch (e) { } });
  const R = document.querySelector(root); if (!R) return null;
  const role = (e) => { const t = e.tagName; if (/^H[1-6]$/.test(t)) return 'título'; if (t === 'BUTTON' || e.closest('button')) return 'botón'; if (t === 'P' || t === 'LI' || t === 'DD') return 'párrafo'; if (t === 'SMALL') return 'nota'; return 'otro'; };
  const sizes = {}, largos = [];
  for (const e of R.querySelectorAll('*')) {
    const own = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim(); if (own.length < 2) continue;
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e); if (r.width < 2 || r.height < 2 || cs.visibility === 'hidden') continue;
    let hid = false; for (let a = e; a && a !== document.body; a = a.parentElement) { if (getComputedStyle(a).display === 'none') { hid = true; break; } if (a.tagName === 'DETAILS' && !a.open && !e.closest('summary')) { hid = true; break; } } if (hid) continue;
    const k = role(e), fs = Math.round(parseFloat(cs.fontSize) * 10) / 10; (sizes[k] ||= {})[fs] = ((sizes[k] ||= {})[fs] || 0) + 1;
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.35, lines = Math.round(e.clientHeight / lh);
    if (k === 'párrafo' && lines > 2 && !e.classList.contains('vm-clamp') && !e.closest('#dialog')) largos.push(`${lines} líneas · «${own.slice(0, 50)}»`);
  }
  return { sizes, largos };
}, root);
const report = async (tag, root) => {
  const m = await measure(root); await p.screenshot({ path: `${out}/${lang}-${tag}.png` });
  if (!m) { ok(false, `${tag}: no se ha abierto`); return; }
  const fuera = []; for (const [k, o] of Object.entries(m.sizes)) for (const fs of Object.keys(o)) if (!SCALE.includes(+fs)) fuera.push(`${k} ${fs}px`);
  console.log(`\n${tag}: ${Object.entries(m.sizes).map(([k, o]) => `${k} ${Object.keys(o).sort((a, b) => a - b).join('/')}px`).join(' · ')}`);
  for (const l of m.largos) console.log(`   largo sin plegar: ${l}`);
  ok(!fuera.length, `${tag}: todos los tamaños de la escala${fuera.length ? ' (fuera: ' + fuera.join(', ') + ')' : ''}`);
  ok(!m.largos.length, `${tag}: ningún párrafo de más de 2 líneas sin «Ver más»`);
};
const tap = () => p.evaluate(() => document.getElementById('dialog')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
const talkUntil = async (sel) => { for (let i = 0; i < 40; i++) { await p.waitForTimeout(900); if (await p.evaluate((s) => !!document.querySelector(s), sel)) return; if (await p.evaluate(() => window.__game.ui.dialogOpen)) await tap(); } };
// diálogo (el primer vecino con misión)
await p.evaluate(() => { const G = window.__game, a = G.missions[0]?.host; if (a) { G.player.place(a.pos.x + 1.5, a.pos.z + 1.5, 0); G.follow.snap(G.player); G.talk(a); } });
await p.waitForFunction(() => window.__game.ui.dialogOpen, null, { timeout: 60000 }); await p.waitForTimeout(1500);
await report('dialogo', '#dialog');
for (let i = 0; i < 15 && await p.evaluate(() => window.__game.ui.dialogOpen); i++) { await tap(); await p.waitForTimeout(700); }
await p.evaluate(() => window.__game.recover?.()); await p.waitForTimeout(1000);
// cuaderno, mapa y pausa
for (const [tag, fn] of [['cuaderno', 'openBook'], ['mapa', 'openMap'], ['pausa', 'openMenu']]) {
  await p.evaluate((fn) => { window.__game.ui.closeModal?.(); window.__game.ui[fn](); }, fn); await p.waitForTimeout(2500);
  await report(tag, '.paper, .screen, .mapscr, .menu');
}
await p.evaluate(() => window.__game.ui.closeModal?.()); await p.waitForTimeout(800);
// pelota: menú, cuadro del torneo y panel de antes del partido
await p.evaluate(() => { const G = window.__game, a = G.pelotari; G.player.place(a.pos.x + 1.5, a.pos.z + 1.5, 0); G.follow.snap(G.player); G.talk(a); });
await talkUntil('.lg-root [data-a="libre"]'); await p.waitForTimeout(800);
await report('menu-pelota', '.lg-root');
await p.evaluate(() => document.querySelector('.lg-root [data-a="torneo"]').click()); await p.waitForSelector('.lg-root [data-a="exit"]', { timeout: 60000 }); await p.waitForTimeout(800);
await report('torneo', '.lg-root');
const hasPlay = await p.evaluate(() => !!document.querySelector('.lg-root [data-a="play"]'));
if (hasPlay) {
  await p.evaluate(() => document.querySelector('.lg-root [data-a="play"]').click());
  await p.waitForSelector('.pel-panel [data-pel-go]', { timeout: 300000 }); await p.waitForTimeout(1200);
  await report('antes-del-partido', '.pel-panel');
  await p.evaluate(() => document.querySelector('.pel-panel [data-pel-x]').click()); await p.waitForTimeout(1500);
}
console.log(errs.length ? errs.slice(0, 3) : 'sin errores');
console.log(fails ? `\n${fails} FALLOS` : '\nTodo correcto');
await b.close();
