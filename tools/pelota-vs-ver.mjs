// Antes del partido de pelota, en el móvil tumbado: el panel (el frontón con lo que se nota en él, «Más opciones» plegado
// con lo elegido a la vista y los cinco niveles en una fila), la pantalla VS (azules contra colorados, el frontón, la
// frase del rival; se toca para empezar) y la colección de pelotaris (la carta del rival queda al jugar; los demás, en
// silueta con candado). Comprueba que todo cabe sin desplazar y sin solaparse, y hace capturas.
// Uso: node tools/pelota-vs-ver.mjs [pueblo] [carpeta] [clear|rain]   (URL=http://127.0.0.1:5173 por defecto)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
import { auditar } from './auditoria-medida.mjs';
const URL = process.env.URL || 'http://127.0.0.1:5173';
const [,, town = 'lesaka', out = 'entrega/pelota-vs', weather = 'clear'] = process.argv; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { window.__vs = true; window.__vsMs = 600000; localStorage.setItem('mendimendiz-lang', 'es'); localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ v: 1, name: 'Mendi', seen: { heroBenat: true, dog: true } })); });
await p.goto(`${URL}/?town=${town}&q=low&weather=${weather}&skipintro=1&t=12`, { timeout: 300000 });
await p.waitForFunction(() => window.__game && window.__game.mode === 'play', null, { timeout: 900000 }); await p.waitForTimeout(2500);
// (con lluvia: que esté lloviendo justo ahora; la lluvia va a ratos y, si no, el frontón sale seco)
if (weather === 'rain') await p.evaluate(() => { const W = window.__game.rt?.weather; if (W) { W.raining = true; W.k = 1; W.phaseT = 9999; } });
let fails = 0, n = 0; const ok = (c, m) => { console.log(`  ${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fails++; };
// (con AUD=1, cada captura pasa también la auditoría de diseño, tools/auditoria-medida.mjs, y se cuenta como fallo lo que
// encuentre, salvo los verdes y lo que se desplaza, que se revisan a mano)
const AUD = {}; const shot = async (tag) => { await p.screenshot({ path: `${out}/${weather}-${String(++n).padStart(2, '0')}-${tag}.png` });
  if (!process.env.AUD) return; const sel = await p.evaluate(() => ['.pel-panel', '.pvs', '.lg-root', '.pel-root'].find(s => document.querySelector(s)));
  const r = await p.evaluate(auditar, sel); for (const [k, v] of Object.entries(r)) if (v.length && !['verde', 'desplaza'].includes(k)) { AUD[k] = (AUD[k] || 0) + v.length; for (const x of v.slice(0, 6)) console.log(`   auditoría ${tag} ${k}: ${x}`); } };
const finish = () => p.evaluate(() => document.getAnimations?.().forEach(a => { try { if (a.effect?.getTiming?.().iterations !== Infinity) a.finish(); } catch (e) { } }));
const talk = async () => {
  // (el partido libre del pueblo, como al hablar con su pelotari: en algunos pueblos el de la misión no lo ofrece)
  await p.evaluate(() => { const G = window.__game, a = G.pelotari || G.missions.find(M => M.type === 'pelota')?.host; G.player.place(a.pos.x + 1.5, a.pos.z + 1.5, 0); G.follow.snap(G.player); G.freePelota(); });
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
    sum: q('.pel-more .pel-sum')?.innerText, open: !q('.pel-opts')?.hidden, feel: window.__game.pelotaMatch?.feel };
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
// «Más opciones»: otra vista del mismo panel, en pestañas (Partido, Reglas, Controles), sin desplazar; en Partido se
// elige la pelota y la cámara dinámica, y el resumen dice qué pelota
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-more]').click()); await p.waitForTimeout(400); await finish();
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-ball="viva"]').click()); await p.waitForTimeout(300);
await shot('opciones-partido');
const fitOf = () => p.evaluate(() => { const c = document.querySelector('.pel-card'), pane = [...document.querySelectorAll('.pel-opane')].find(x => !x.hidden), go = document.querySelector('[data-pel-go]').getBoundingClientRect();
  const hit = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
  return { card: c.scrollHeight - c.clientHeight, pane: pane ? pane.scrollHeight - pane.clientHeight : null, goIn: go.bottom <= innerHeight + 1, overGo: [...pane.querySelectorAll('button,p,li')].some(e => hit(e.getBoundingClientRect(), go)) }; });
const BA = await p.evaluate(() => ({ on: document.querySelector('.pel-panel [data-pel-ball][aria-pressed="true"]')?.dataset.pelBall, what: document.querySelector('.pel-panel .pel-ballwhat')?.innerText, sum: document.querySelector('.pel-panel .pel-sum')?.innerText,
  game: window.__game.pelotaMatch?.ballKind, front: window.__game.pelotaMatch?.feel?.front, saved: localStorage.getItem('mendimendiz-pelota-bola'), cam: document.querySelector('.pel-panel [data-pel-cam]')?.getAttribute('aria-checked'),
  vsHidden: getComputedStyle(document.querySelector('.pel-panel .pel-rv')).display === 'none',
  names: [...document.querySelectorAll('.pel-panel [data-pel-ball] span')].map(e => [e.innerText, e.scrollWidth <= e.clientWidth + 1 && e.getBoundingClientRect().height < 40]) }));
const F0 = await fitOf();
console.log('   pelota:', JSON.stringify(BA), 'cabe:', JSON.stringify(F0));
ok(BA.on === 'viva' && BA.game === 'viva' && BA.saved === 'viva' && /viva/i.test(BA.sum || '') && !!BA.what, 'se elige la pelota viva: se marca, se explica, sale en el resumen y se recuerda');
ok(BA.names.length === 5 && BA.names.every(([t, fit]) => t.length > 2 && fit), 'los cinco nombres de pelota, enteros, sin cortar');
ok(BA.cam === 'true' || BA.cam === 'false', 'el interruptor de la cámara dinámica está');
ok(BA.vsHidden && F0.card <= 0 && !F0.overGo && F0.goIn, `la pestaña Partido cabe sin desplazar y sin pisar los botones (${F0.card} px)`);
for (const [i, tag] of [[1, 'reglas'], [2, 'controles']]) {
  await p.evaluate((i) => document.querySelector(`.pel-panel [data-pel-tab="${i}"]`).click(), i); await p.waitForTimeout(300); await finish();
  const F = await fitOf(); await shot('opciones-' + tag);
  console.log(`   ${tag}:`, JSON.stringify(F));
  ok(F.card <= 0 && !F.overGo, `la pestaña ${tag} no alarga el panel${F.pane > 0 ? ` (su texto se desplaza ${F.pane} px por dentro)` : ' y su texto cabe entero'}`);
}
await p.evaluate(() => { document.querySelector('.pel-panel [data-pel-tab="0"]').click(); document.querySelector('.pel-panel [data-pel-ball="normal"]').click(); document.querySelector('.pel-panel [data-pel-back]').click(); }); await p.waitForTimeout(300);
ok(await p.evaluate(() => (c => c.scrollHeight - c.clientHeight)(document.querySelector('.pel-card')) <= 0 && document.querySelector('.pel-opts').hidden && getComputedStyle(document.querySelector('.pel-panel .pel-rv')).display !== 'none'), 'al volver, el panel de antes, sin desplazar');
// 2. la pantalla VS
console.log('2. la pantalla VS');
await p.evaluate(() => document.querySelector('.pel-panel [data-pel-go]').click());
await p.waitForSelector('.pvs', { timeout: 30000 }); await p.waitForTimeout(1500); await finish();
await shot('vs');
const V = await p.evaluate(async () => { const v = document.querySelector('.pvs'), R = (s) => v.querySelector(s)?.getBoundingClientRect();
  await Promise.all([...v.querySelectorAll('img')].map(i => i.decode?.().catch(() => {})));
  const inside = (r) => r && r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1, hit = (a, c) => a && c && !(a.right <= c.left || c.right <= a.left || a.bottom <= c.top || c.bottom <= a.top);
  // (los rótulos de cada uno, el del centro, el de arriba y la frase de abajo: ninguno pisa a otro)
  const nb = R('.pvs-plate.azul'), nr = R('.pvs-plate.rojo'), qu = R('.pvs-tick'), top = R('.pvs-top .pvs-bar'), x = R('.pvs-x'), mid = R('.pvs-mid');
  return { imgs: [...v.querySelectorAll('img')].map(i => i.naturalWidth), names: [...v.querySelectorAll('.pvs-who > b')].map(e => e.innerText), quote: v.querySelector('.pvs-tick .q')?.innerText, venue: v.querySelector('.pvs-venue')?.innerText, ovr: [...v.querySelectorAll('.pvs-ovr b')].map(e => +e.innerText),
    tags: v.querySelector('.pvs-tags')?.innerText, boxes: Object.fromEntries(Object.entries({ nb, nr, qu, top, x, mid }).map(([k, r]) => [k, r && [r.left, r.top, r.right, r.bottom].map(Math.round)])), inside: [nb, nr, qu, top, x, mid].every(inside), overlap: hit(nb, qu) || hit(nr, qu) || hit(nb, x) || hit(nr, x) || hit(top, x) || hit(nb, nr) || hit(mid, nb) || hit(mid, nr) || hit(mid, x), phase: window.__game.pelotaMatch.game.phase };
});
console.log(`   ${V.names.join(' VS ')} · ${V.venue} · «${V.quote}» · ${V.tags?.replace(/\n/g, ' | ')}`);
ok(V.imgs.length >= 2 && V.imgs.every(w => w > 0), 'las dos figuras (nuestros pelotaris azul y colorado)');
ok(V.names.length === 2 && !!V.quote && !!V.venue, 'los nombres, el frontón y la frase del rival');
ok(V.ovr.length === 2 && V.ovr.every(n => n >= 40 && n <= 99), `la media de cada uno, como en las cartas (${V.ovr.join(' y ')})`);
ok(V.inside && !V.overlap, 'todo dentro de la pantalla y sin solaparse');
ok(V.phase === 'intro', 'mientras se ve, el partido aún no ha empezado');
if (V.overlap || !V.inside) console.log('   cajas:', JSON.stringify(V.boxes));
await p.evaluate(() => document.querySelector('.pvs').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
await p.waitForFunction(() => !document.querySelector('.pvs'), null, { timeout: 10000 }).catch(() => {});
ok(await p.evaluate(() => !document.querySelector('.pvs') && window.__game.pelotaMatch?.game.phase !== 'intro'), 'al tocar, empieza el partido');
await p.evaluate(() => { const m = window.__game.pelotaMatch; for (let k = 0; k < 20; k++) m.update(1 / 30); });
// en el partido: el marcador sobre el frontis, FALTA y PASA en la pared, tu energía abajo y AUTO en el botón de golpe
await p.waitForTimeout(2500); await finish();
const IN = await p.evaluate(() => { const C = window.__game.pelotaMatch.court.group, my = document.querySelector('.pel-myen'), r = my?.getBoundingClientRect(), bt = document.querySelector('.pel-btns')?.getBoundingClientRect(), sr = document.querySelector('.pel-stick')?.getBoundingClientRect();
  // (el joystick aparece donde se pone el pulgar, abajo a la izquierda: su aro mide 120 px; la zona táctil invisible es más ancha y no cuenta)
  const st = sr && { left: sr.left, right: sr.left + 200, top: innerHeight - 200, bottom: innerHeight };
  const hit = (a, c) => a && c && !(a.right <= c.left || c.right <= a.left || a.bottom <= c.top || c.bottom <= a.top);
  return { big: !!C.getObjectByName('marcador-frontis'), falta: !!C.getObjectByName('raya-falta'), pasa: !!C.getObjectByName('raya-pasa'), myen: !!my && !my.hidden, overlap: hit(r, st) || hit(r, bt), hl: document.querySelector('.pel-hit .pel-hl')?.innerText, ring: !!document.querySelector('.pel-hit .pel-tring'), auto: !!window.__game.pelotaMatch.game.autoHit }; });
console.log('   en el partido:', JSON.stringify(IN));
ok(IN.big && IN.falta && IN.pasa, 'el marcador sobre el frontis y FALTA y PASA en la pared');
ok(IN.myen && !IN.overlap, 'tu energía abajo en el centro, sin tocar el joystick ni los botones');
ok(!IN.auto && IN.ring && /GOLPE/.test(IN.hl || ''), 'sin golpe automático: el botón dice GOLPE y lleva el aro del momento justo');
await shot('partido');
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
const C = await p.evaluate(() => { const c = document.querySelector('.pc-root .lg-card'); return { have: document.querySelectorAll('.pc-it .gx-card:not(.lock)').length, locked: document.querySelectorAll('.pc-it .gx-card.lock').length, tabs: document.querySelectorAll('.pc-tabs button').length, count: document.querySelector('.pc-count')?.innerText, scroll: c.scrollHeight - c.clientHeight }; });
console.log(`   ${C.count} · en esta comarca ${C.have} conocidos y ${C.locked} por descubrir · ${C.tabs} comarcas`);
ok(C.have >= 1 && C.locked >= 1, 'el conocido con su carta y los demás en silueta con candado');
ok(C.scroll <= 0, `cabe sin desplazar (${C.scroll} px)`);
await shot('coleccion');
await p.evaluate(() => document.querySelector('.pc-it button.gx-card').click()); await p.waitForSelector('.pfx', { timeout: 10000 }).catch(() => {}); await p.waitForTimeout(600); await finish();
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
if (process.env.AUD) console.log('auditoría de diseño:', JSON.stringify(AUD));
