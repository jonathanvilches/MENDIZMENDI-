// Ficha técnica de los pelotaris en el navegador: en el panel de antes del partido, una tarjeta por pelotari que abre su
// ficha (con una pestaña por cada uno); por parejas, cuatro; en la pausa del partido, el botón «Fichas» (el partido se para
// mientras se mira); y en el cuadro del torneo, la del próximo rival. Comprueba que todo cabe sin desplazar en el móvil
// tumbado, que la letra va en la escala y que al cerrar se vuelve a donde se estaba. Capturas.
// Uso: node tools/pelota-ficha-ver.mjs [pueblo] [carpeta] [es|eu]   (URL=http://127.0.0.1:5173 por defecto)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:5173';
const [,, town = 'lesaka', out = 'entrega/pelota-ficha', lang = 'es'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript((lang) => { localStorage.setItem('mendimendiz-lang', lang); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', seen: { heroBenat: true, dog: true } })); }, lang);
await p.goto(`${URL}/?town=${town}&q=low&weather=clear&skipintro=1&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 }); await p.waitForTimeout(2500);
let fails = 0, n = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
const shot = (tag) => p.screenshot({ path: `${out}/${lang}-${String(++n).padStart(2, '0')}-${tag}.png` });
const click = async (sel, ms = 240000) => { await p.waitForSelector(sel, { timeout: ms }); await p.evaluate((s) => document.querySelector(s).click(), sel); await p.waitForTimeout(500); };
// la ficha abierta: pestañas, filas de datos, barras, si cabe sin desplazar y tamaños de letra
const ficha = () => p.evaluate(() => {
  document.getAnimations?.().forEach(a => { try { a.finish(); } catch (e) { } });
  const o = document.querySelector('.pfx'); if (!o) return null; const c = o.querySelector('.pfx-card'), r = c.getBoundingClientRect();
  const fs = new Set([...o.querySelectorAll('*')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).map(e => Math.round(parseFloat(getComputedStyle(e).fontSize))));
  return { tabs: o.querySelectorAll('.pfx-tabs button').length, sel: o.querySelector('.pfx-tabs [aria-selected=true]')?.innerText || '', name: o.querySelector('.pfx-head h3')?.innerText, sub: o.querySelector('.pfx-head small')?.innerText, datos: [...o.querySelectorAll('.pfx-data div')].map(d => d.innerText.replace(/\s+/g, ' ')), barras: o.querySelectorAll('.pfx-bar').length,
    golpes: [...o.querySelectorAll('.pfx-shots li')].map(l => l.innerText.replace(/\s+/g, ' ')), cabe: c.scrollHeight <= c.clientHeight + 1, dentro: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, tam: [...fs].sort((a, b) => a - b) };
});
const SCALE = [12, 14, 16, 20, 24, 32];
const check = (f, tag, tabs) => {
  console.log(`   ${tag}: ${f?.name} · pestañas ${f?.tabs} · ${f?.datos.join(' | ')} · golpes ${f?.golpes.join(', ')} · letra ${f?.tam.join('/')}`);
  ok(!!f, `${tag}: la ficha se abre`); if (!f) return;
  ok(f.tabs === tabs || (tabs === 1 && f.tabs === 0), `${tag}: ${tabs} pestaña(s), una por pelotari`);
  ok(f.barras === 3, `${tag}: las tres cualidades en barras`);
  ok(f.cabe && f.dentro, `${tag}: cabe entera en el móvil tumbado, sin desplazar`);
  ok(f.tam.every(x => SCALE.includes(x)), `${tag}: letra en la escala`);
};
// 1. panel de antes del partido (mano a mano)
console.log('1. antes del partido, mano a mano');
await p.evaluate(() => { const G = window.__game, a = G.pelotari || G.missions.find(M => M.type === 'pelota')?.host; G.player.place(a.pos.x + 1.5, a.pos.z + 1.5, 0); G.follow.snap(G.player); G.talk(a); });
for (let i = 0; i < 14; i++) { await p.waitForTimeout(800); if (await p.evaluate(() => !!document.querySelector('[data-a="libre"]'))) break; if (await p.evaluate(() => window.__game.ui.dialogOpen)) await p.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }))); }
await click('[data-a="libre"]');
await p.waitForSelector('.pel-panel .pel-vs', { timeout: 300000 }); await p.waitForTimeout(800);
const chips = await p.evaluate(() => [...document.querySelectorAll('.pel-panel .pfx-pl')].map(e => e.innerText.replace(/\s+/g, ' ')));
console.log('   tarjetas:', JSON.stringify(chips));
ok(chips.length === 2, 'dos tarjetas: tú y el rival');
const panelFits = await p.evaluate(() => { const c = document.querySelector('.pel-card'); return c.scrollHeight - c.clientHeight; });
console.log(`   el panel pide desplazar ${panelFits}px`);
await shot('panel');
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-ficha="rival"]').click()); await p.waitForTimeout(800);
const f1 = await ficha(); check(f1, 'rival', 2); ok(f1?.datos.length === 9, 'la del rival: pueblo, edad, altura, peso, mano, debut, partidos, victorias y txapelas (el puesto, en la cabecera)');
await shot('ficha-rival');
await p.evaluate(() => document.querySelector('.pfx-tabs button[data-k="0"]').click()); await p.waitForTimeout(400);
const f2 = await ficha(); check(f2, 'la tuya', 2); ok(f2?.datos.length === 3, 'la tuya: sin datos inventados (pueblo, partidos ganados y txapelas)');
await shot('ficha-tuya');
await p.evaluate(() => document.querySelector('.pfx-x').click()); await p.waitForTimeout(500);
ok(await p.evaluate(() => !document.querySelector('.pfx') && !!document.querySelector('.pel-panel [data-pel-go]')), 'al cerrar, de vuelta al panel del partido');
// 2. por parejas: cuatro
console.log('2. por parejas');
await click('.pel-panel [data-pel-mod="delantero"]');
await p.waitForFunction(() => window.__game.pelotaMatch?.pairs && !window.__game.pelotaMatch.loadingMates && document.querySelectorAll('.pel-panel .pfx-pl').length === 4, null, { timeout: 300000 }); await p.waitForTimeout(800);
await shot('panel-parejas');
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-ficha="rivalMate"]').click()); await p.waitForTimeout(800);
const f3 = await ficha(); check(f3, 'zaguero rival', 4); ok(/zaguero|atzelari/i.test(f3?.sub || ''), 'el zaguero rival sale como zaguero');
await shot('ficha-parejas');
await p.evaluate(() => document.querySelector('.pfx-x').click()); await p.waitForTimeout(400);
// 3. en la pausa del partido
console.log('3. en la pausa');
await click('.pel-panel [data-pel-mod="mano"]'); await p.waitForTimeout(600);
await click('.pel-panel [data-pel-go]'); await p.evaluate(() => { const m = window.__game.pelotaMatch; for (let k = 0; k < 30; k++) m.update(1 / 30); });
await p.evaluate(() => document.querySelector('.pel-exit').click()); await p.waitForTimeout(600);
ok(await p.evaluate(() => !!document.querySelector('.pel-panel [data-pel-fichas]')), 'la pausa tiene el botón de las fichas');
await shot('pausa');
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-fichas]').click()); await p.waitForTimeout(800);
const f4 = await ficha(); check(f4, 'pausa', 2);
const t0 = await p.evaluate(() => { const m = window.__game.pelotaMatch, g = m.game, b0 = g.ball.p.z; for (let k = 0; k < 30; k++) m.update(1 / 30); return { paused: m.paused, moved: Math.abs(g.ball.p.z - b0) }; });
ok(t0.paused && t0.moved < 1e-6, 'con la ficha abierta el partido está parado');
await p.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))); await p.waitForTimeout(400);
ok(await p.evaluate(() => !document.querySelector('.pfx') && !!document.querySelector('.pel-panel [data-pel-no]')), 'Escape cierra la ficha y deja la pausa');
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-no]').click()); await p.waitForTimeout(400);
ok(await p.evaluate(() => window.__game.pelotaMatch && !window.__game.pelotaMatch.paused), 'al seguir jugando, el partido sigue');
await p.evaluate(() => window.__game.pelotaAbort?.()); await p.waitForTimeout(1500);
// 4. el cuadro del torneo
console.log('4. el cuadro del torneo');
await p.waitForFunction(() => window.__game.mode === 'play', null, { timeout: 60000 }).catch(() => {});
await p.evaluate(async () => { const TO = await import('/src/game/torneo.js'), g = window.__game; document.querySelectorAll('.lg-root').forEach(x => x.remove());
  const T = TO.torneo({ name: 'Mendi', town: 'Lesaka' }, { comarca: g.def.comarca, comarcaName: 'Bortziriak', towns: g.comarcaVenues() }); window.__tp = TO.torneoPanel(T, 'Lesaka'); });
await p.waitForSelector('.tq-chips .pfx-pl', { timeout: 60000 }); await p.waitForTimeout(600);
await shot('torneo');
await p.evaluate(() => document.querySelector('.tq-chips .pfx-pl').click()); await p.waitForTimeout(800);
const f5 = await ficha(); check(f5, 'torneo', 2);
await shot('ficha-torneo');
await p.evaluate(() => document.querySelector('.pfx').click()); await p.waitForTimeout(400);
ok(await p.evaluate(() => !document.querySelector('.pfx') && !!document.querySelector('.lg-root [data-a="play"]')), 'tocando fuera se cierra y el cuadro sigue ahí');
console.log(errs.length ? errs.slice(0, 3) : 'sin errores');
console.log(fails ? `\n${fails} FALLOS` : '\nTodo correcto');
await b.close();
