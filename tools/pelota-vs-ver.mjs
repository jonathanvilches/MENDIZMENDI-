// Antes del partido de pelota, en el móvil tumbado: el panel (el frontón con lo que se nota en él, «Más opciones» plegado
// con lo elegido a la vista y los cinco niveles en una fila), la pantalla VS (azules contra colorados, el frontón, la
// frase del rival; se toca para empezar) y la colección de pelotaris (la carta del rival queda al jugar; los demás, en
// silueta con candado). Comprueba que todo cabe sin desplazar y sin solaparse, y hace capturas.
// Uso: node tools/pelota-vs-ver.mjs [pueblo] [carpeta] [clear|rain]   (URL=http://127.0.0.1:5173 por defecto)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:5173';
const [,, town = 'lesaka', out = 'entrega/pelota-vs', weather = 'clear'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { window.__vs = true; localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', seen: { heroBenat: true, dog: true } })); });
await p.goto(`${URL}/?town=${town}&q=low&weather=${weather}&skipintro=1&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 }); await p.waitForTimeout(2500);
let fails = 0, n = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
const shot = (tag) => p.screenshot({ path: `${out}/${weather}-${String(++n).padStart(2, '0')}-${tag}.png` });
const finish = () => p.evaluate(() => document.getAnimations?.().forEach(a => { try { if (a.effect?.getTiming?.().iterations !== Infinity) a.finish(); } catch (e) { } }));
const talk = async () => {
  await p.evaluate(() => { const G = window.__game, a = G.pelotari || G.missions.find(M => M.type === 'pelota')?.host; G.player.place(a.pos.x + 1.5, a.pos.z + 1.5, 0); G.follow.snap(G.player); G.talk(a); });
  for (let i = 0; i < 14; i++) { await p.waitForTimeout(800); if (await p.evaluate(() => !!document.querySelector('[data-a="libre"]'))) return true; if (await p.evaluate(() => window.__game.ui.dialogOpen)) await p.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }))); }
  return false;
};
// 1. el panel
console.log('1. el panel del partido');
ok(await talk(), 'el menú de pelota se abre');
await p.evaluate(() => document.querySelector('[data-a="libre"]').click());
await p.waitForSelector('.pel-panel .pel-court', { timeout: 300000 }); await p.waitForTimeout(800); await finish();
const P1 = await p.evaluate(() => { const c = document.querySelector('.pel-card'), q = (s) => document.querySelector('.pel-panel ' + s);
  return { scroll: c.scrollHeight - c.clientHeight, levels: [...document.querySelectorAll('.pel-panel [data-pel-lv]')].map(x => x.innerText), court: q('.pel-court-t b')?.innerText, tags: [...document.querySelectorAll('.pel-court-t i')].map(x => x.innerText),
    sum: q('.pel-more .pel-sum')?.innerText, open: q('.pel-more')?.open, feel: window.__game.pelotaMatch?.feel };
});
console.log(`   frontón: ${P1.court} · ${P1.tags.join(' + ')} · niveles: ${P1.levels.join(' / ')} · más opciones: ${P1.sum} · física ${JSON.stringify({ front: P1.feel?.front, floor: P1.feel?.floor, run: P1.feel?.run })}`);
ok(P1.levels.length === 5, 'cinco niveles');
ok(!!P1.court && P1.tags.length >= 1, 'el frontón, con lo que se nota al jugar en él');
ok(!!P1.sum && P1.open === false, '«Más opciones» plegado, con lo elegido a la vista');
ok(P1.scroll <= 0, `el panel cabe sin desplazar (${P1.scroll} px)`);
if (weather === 'rain') ok(P1.tags.some(t => /mojado|cubierto|Labrit/i.test(t)), 'con lluvia: suelo mojado (o a cubierto, si tiene cubierta)');
await shot('panel');
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-court]').click()); await p.waitForTimeout(300);
ok(await p.evaluate(() => !document.querySelector('.pel-court-what').hidden && /\./.test(document.querySelector('.pel-court-what').innerText)), 'al tocar el frontón se explica qué pasa con cada cosa');
await shot('panel-fronton');
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-court]').click());
// 2. la pantalla VS
console.log('2. la pantalla VS');
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-go]').click());
await p.waitForSelector('.pvs', { timeout: 30000 }); await p.waitForTimeout(1500); await finish();
const V = await p.evaluate(async () => { const v = document.querySelector('.pvs'), R = (s) => v.querySelector(s)?.getBoundingClientRect();
  await Promise.all([...v.querySelectorAll('img')].map(i => i.decode?.().catch(() => {})));
  const inside = (r) => r && r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1, hit = (a, c) => a && c && !(a.right <= c.left || c.right <= a.left || a.bottom <= c.top || c.bottom <= a.top);
  const nb = R('.pvs-name.blue'), nr = R('.pvs-name.red'), qu = R('.pvs-quote'), top = R('.pvs-top'), x = R('.pvs-x');
  return { imgs: [...v.querySelectorAll('img')].map(i => i.naturalWidth), names: [...v.querySelectorAll('.pvs-name b')].map(e => e.innerText), quote: v.querySelector('.pvs-quote')?.innerText, venue: v.querySelector('.pvs-venue')?.innerText,
    tags: v.querySelector('.pvs-tags')?.innerText, inside: [nb, nr, qu, top, x].every(inside), overlap: hit(nb, qu) || hit(nr, qu) || hit(nb, x) || hit(nr, x) || hit(top, x) || hit(nb, nr), phase: window.__game.pelotaMatch.game.phase };
});
console.log(`   ${V.names.join(' VS ')} · ${V.venue} · «${V.quote}» · ${V.tags?.replace(/\n/g, ' | ')}`);
ok(V.imgs.length >= 2 && V.imgs.every(w => w > 0), 'las dos figuras (nuestros pelotaris azul y colorado)');
ok(V.names.length === 2 && !!V.quote && !!V.venue, 'los nombres, el frontón y la frase del rival');
ok(V.inside && !V.overlap, 'todo dentro de la pantalla y sin solaparse');
ok(V.phase === 'intro', 'mientras se ve, el partido aún no ha empezado');
await shot('vs');
await p.evaluate(() => document.querySelector('.pvs').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
await p.waitForFunction(() => !document.querySelector('.pvs'), null, { timeout: 10000 }).catch(() => {});
ok(await p.evaluate(() => !document.querySelector('.pvs') && window.__game.pelotaMatch?.game.phase !== 'intro'), 'al tocar, empieza el partido');
await p.evaluate(() => { const m = window.__game.pelotaMatch; for (let k = 0; k < 20; k++) m.update(1 / 30); });
// salir del partido: el rival ya queda en la colección
await p.evaluate(() => document.querySelector('.pel-exit').click()); await p.waitForTimeout(500);
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-yes]').click());
await p.waitForFunction(() => window.__game.mode === 'play', null, { timeout: 60000 }).catch(() => {}); await p.waitForTimeout(1500);
const col = await p.evaluate((t) => JSON.parse(localStorage.getItem('mendimendiz-perfil-v1') || '{}').pelotaris || {}, town);
console.log('   colección:', JSON.stringify(col));
ok(!!col[town], 'el rival queda en la colección, en su pueblo');
// 3. la colección
console.log('3. la colección');
ok(await talk(), 'el menú de pelota se abre otra vez');
await p.evaluate(() => document.querySelector('[data-a="pelotaris"]').click());
await p.waitForSelector('.pc-root .pc-grid', { timeout: 30000 }); await p.waitForTimeout(600); await finish();
const C = await p.evaluate(() => { const c = document.querySelector('.pc-root .lg-card'); return { have: document.querySelectorAll('.pc-card:not(.locked)').length, locked: document.querySelectorAll('.pc-card.locked').length, tabs: document.querySelectorAll('.pc-tabs button').length, count: document.querySelector('.pc-count')?.innerText, scroll: c.scrollHeight - c.clientHeight }; });
console.log(`   ${C.count} · en esta comarca ${C.have} conocidos y ${C.locked} por descubrir · ${C.tabs} comarcas`);
ok(C.have >= 1 && C.locked >= 1, 'el conocido con su carta y los demás en silueta con candado');
ok(C.scroll <= 0, `cabe sin desplazar (${C.scroll} px)`);
await shot('coleccion');
await p.evaluate(() => document.querySelector('.pc-card:not(.locked)').click()); await p.waitForSelector('.pfx', { timeout: 10000 }).catch(() => {}); await p.waitForTimeout(600); await finish();
ok(await p.evaluate(() => !!document.querySelector('.pfx')), 'al tocar la carta, su ficha');
await shot('coleccion-ficha');
await p.evaluate(() => document.querySelector('.pfx-x')?.click()); await p.waitForTimeout(400);
await p.evaluate(() => document.querySelectorAll('.pc-tabs button')[3]?.click()); await p.waitForTimeout(300);
await shot('coleccion-otra');
await p.evaluate(() => document.querySelector('.pc-root [data-a="close"]').click()); await p.waitForTimeout(300);
ok(await p.evaluate(() => !document.querySelector('.pc-root') && !!document.querySelector('[data-a="libre"]')), 'al cerrar, de vuelta al menú de pelota');
console.log(errs.length ? errs.slice(0, 3) : 'sin errores'); ok(!errs.length, 'sin errores');
console.log(fails ? `\n${fails} FALLOS` : '\nTodo correcto');
await b.close();
